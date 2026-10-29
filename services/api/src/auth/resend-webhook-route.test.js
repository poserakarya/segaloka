import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  verifyResendWebhookSignature,
  RESEND_WEBHOOK_EVENT_TYPES,
  registerResendWebhookRoute
} from './resend-webhook-route.js';

const secret = Buffer.from('local-test-resend-signing-secret').toString('base64');
const body = Buffer.from(JSON.stringify({
  type: 'email.delivered',
  data: { email_id: 'email-local-1' }
}));
const id = 'msg_local_1';
const timestamp = 1700000000;

function signature() {
  return 'v1,' + createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${id}.${timestamp}.${body.toString('utf8')}`)
    .digest('base64');
}

test('valid Svix signature is accepted', () => {
  assert.equal(verifyResendWebhookSignature({
    rawBody: body, webhookId: id, webhookTimestamp: String(timestamp),
    webhookSignature: signature(), secret, nowSeconds: timestamp
  }), true);
});

test('invalid signature is rejected', () => {
  assert.equal(verifyResendWebhookSignature({
    rawBody: body, webhookId: id, webhookTimestamp: String(timestamp),
    webhookSignature: 'v1,invalid', secret, nowSeconds: timestamp
  }), false);
});

test('expired timestamp is rejected', () => {
  assert.equal(verifyResendWebhookSignature({
    rawBody: body, webhookId: id, webhookTimestamp: String(timestamp),
    webhookSignature: signature(), secret, nowSeconds: timestamp + 301
  }), false);
});

test('supported event types are complete', () => {
  assert.deepEqual(new Set(RESEND_WEBHOOK_EVENT_TYPES), new Set([
    'email.sent', 'email.delivered', 'email.delivery_delayed',
    'email.bounced', 'email.failed', 'email.complained'
  ]));
});

test('route durably accepts each supported type and acknowledges duplicates', async () => {
  const previousSecret = process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  process.env.RESEND_WEBHOOK_SIGNING_SECRET = `whsec_${secret}`;
  let handler;
  await registerResendWebhookRoute({
    post(_path, options, fn) { handler = { options, fn }; }
  }, {
    connect: async () => ({
      async query(sql) {
        if (sql.includes('INSERT INTO public.resend_webhook_events')) {
          return { rowCount: this.duplicate ? 0 : 1, rows: [] };
        }
        return { rowCount: 1, rows: [] };
      },
      async release() {}
    })
  });

  for (const type of RESEND_WEBHOOK_EVENT_TYPES) {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const eventBody = Buffer.from(JSON.stringify({
      type, created_at: new Date(currentTimestamp * 1000).toISOString(),
      data: { email_id: `email-${type}` }
    }));
    const eventSignature = 'v1,' + createHmac('sha256', Buffer.from(secret, 'base64'))
      .update(`${id}.${currentTimestamp}.${eventBody.toString('utf8')}`).digest('base64');
    const request = {
      resendRawBody: eventBody,
      headers: { 'svix-id': id, 'svix-timestamp': String(currentTimestamp), 'svix-signature': eventSignature },
      log: { info() {}, error() {} }
    };
    let response;
    const reply = { code(status) { response = { status }; return this; }, send(body) { response.body = body; return this; } };
    const result = await handler.fn(request, reply);
    assert.equal(response.status, 200);
    assert.equal(result, reply);
  }
  if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SIGNING_SECRET;
  else process.env.RESEND_WEBHOOK_SIGNING_SECRET = previousSecret;
});
