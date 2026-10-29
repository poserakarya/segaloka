import { createHmac, timingSafeEqual } from 'node:crypto';
import { Readable } from 'node:stream';

const EVENT_TYPES = new Set([
  'email.sent', 'email.delivered', 'email.delivery_delayed',
  'email.bounced', 'email.failed', 'email.complained'
]);
const MAX_TIMESTAMP_AGE_SECONDS = 300;
const MAX_BODY_BYTES = 1024 * 1024;

function signingSecret() {
  const value = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  return typeof value === 'string' && value.startsWith('whsec_')
    ? value.slice(6) : null;
}

function header(request, name) {
  const value = request.headers[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function verifyResendWebhookSignature({
  rawBody, webhookId, webhookTimestamp, webhookSignature,
  secret = signingSecret(), nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = MAX_TIMESTAMP_AGE_SECONDS
}) {
  if (!Buffer.isBuffer(rawBody) || !secret || !webhookId ||
      !webhookTimestamp || !webhookSignature) return false;
  const timestamp = Number(webhookTimestamp);
  if (!Number.isInteger(timestamp) ||
      Math.abs(nowSeconds - timestamp) > maxAgeSeconds) return false;
  const signed = `${webhookId}.${webhookTimestamp}.` + rawBody.toString('utf8');
  const expected = createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(signed).digest('base64');
  return webhookSignature.split(' ').some(value => {
    const candidate = value.startsWith('v1,') ? value.slice(3) : '';
    const a = Buffer.from(candidate); const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

async function readRawBody(payload) {
  const chunks = []; let total = 0;
  for await (const chunk of payload) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('WEBHOOK_BODY_TOO_LARGE');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function safeMetadata(data) {
  return {
    from: typeof data?.from === 'string' ? data.from.slice(0, 320) : null,
    toCount: Array.isArray(data?.to) ? data.to.length : null,
    subjectPresent: typeof data?.subject === 'string',
    tags: Array.isArray(data?.tags) ? data.tags.slice(0, 20) : null
  };
}

export async function registerResendWebhookRoute(app, pool) {
  app.post('/webhooks/resend', {
    bodyLimit: MAX_BODY_BYTES,
    preParsing: async (request, reply, payload) => {
      try {
        const rawBody = await readRawBody(payload);
        request.resendRawBody = rawBody;
        const stream = Readable.from([rawBody]);
        stream.receivedEncodedLength = rawBody.length;
        return stream;
      } catch (error) {
        reply.code(error.message === 'WEBHOOK_BODY_TOO_LARGE' ? 413 : 400)
          .send({ code: error.message });
      }
    }
  }, async (request, reply) => {
    const rawBody = request.resendRawBody;
    if (!verifyResendWebhookSignature({
      rawBody, webhookId: header(request, 'svix-id'),
      webhookTimestamp: header(request, 'svix-timestamp'),
      webhookSignature: header(request, 'svix-signature')
    })) return reply.code(400).send({ code: 'INVALID_WEBHOOK_SIGNATURE' });

    let event;
    try { event = JSON.parse(rawBody.toString('utf8')); }
    catch { return reply.code(400).send({ code: 'INVALID_WEBHOOK_JSON' }); }
    const eventId = header(request, 'svix-id');
    const eventType = event?.type;
    if (!EVENT_TYPES.has(eventType)) {
      return reply.code(400).send({ code: 'UNSUPPORTED_WEBHOOK_EVENT' });
    }
    const emailId = typeof event?.data?.email_id === 'string'
      ? event.data.email_id.slice(0, 256) : null;
    const eventCreatedAt = typeof event?.created_at === 'string'
      ? event.created_at : null;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO public.resend_webhook_events
           (event_id, email_id, event_type, event_created_at, processed_at, metadata)
         VALUES ($1, $2, $3, $4, now(), $5::jsonb)
         ON CONFLICT (event_id) DO NOTHING RETURNING id`,
        [eventId, emailId, eventType, eventCreatedAt,
          JSON.stringify(safeMetadata(event.data))]
      );
      if (inserted.rowCount === 1 && emailId) {
        await client.query(
          `INSERT INTO public.resend_email_statuses
             (email_id, status, event_created_at, last_event_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email_id) DO UPDATE SET
             status = EXCLUDED.status,
             event_created_at = EXCLUDED.event_created_at,
             last_event_id = EXCLUDED.last_event_id,
             updated_at = now()
           WHERE public.resend_email_statuses.event_created_at IS NULL
              OR EXCLUDED.event_created_at IS NULL
              OR EXCLUDED.event_created_at >= public.resend_email_statuses.event_created_at`,
          [emailId, eventType, eventCreatedAt, eventId]
        );
      }
      await client.query('COMMIT');
      request.log.info({ eventId, eventType,
        emailIdPresent: Boolean(emailId), duplicate: inserted.rowCount === 0 },
        'Resend webhook accepted');
      return reply.code(200).send({ received: true,
        duplicate: inserted.rowCount === 0 });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      request.log.error({ err: error, eventId, eventType },
        'Resend webhook persistence failed');
      return reply.code(503).send({ code: 'WEBHOOK_PERSISTENCE_UNAVAILABLE' });
    } finally { client.release(); }
  });
}

export const RESEND_WEBHOOK_EVENT_TYPES = [...EVENT_TYPES];
