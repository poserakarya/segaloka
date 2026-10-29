import { randomBytes, createHash } from 'node:crypto';
import {
  encryptOAuthSecret,
  decryptOAuthSecret
} from './oauth-config-crypto.js';

const TTL_SECONDS = 60;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function validSecret(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{64}$/.test(value);
}

export async function createDashboardHandoff(client, {
  session,
  user,
  binding,
  dashboard = 'travel'
}) {
  if (
    dashboard !== 'travel' ||
    typeof session?.sessionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.sessionId) ||
    !validSecret(session.accessToken) ||
    !validSecret(session.refreshToken) ||
    !validSecret(binding) ||
    !user?.id
  ) {
    throw new Error('INVALID_DASHBOARD_HANDOFF_SESSION');
  }

  const ticket = randomBytes(32).toString('hex');

  const encrypted = encryptOAuthSecret(JSON.stringify({
    authenticated: true,
    dashboard,
    user,
    session
  }));

  await client.query(
    `INSERT INTO public.auth_dashboard_handoffs (
       dashboard,
       ticket_hash,
       binding_hash,
       session_id,
       user_id,
       session_payload_encrypted,
       expires_at
     )
     VALUES ('travel', $1, $2, $3, $4, $5,
       now() + interval '60 seconds')`,
    [
      sha256(ticket),
      sha256(binding),
      session.sessionId,
      user.id,
      encrypted
    ]
  );

  return { ticket, expiresIn: TTL_SECONDS };
}

export async function consumeDashboardHandoff(pool, {
  ticket,
  binding
}) {
  if (!validSecret(ticket) || !validSecret(binding)) {
    return null;
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `DELETE FROM public.auth_dashboard_handoffs h
       USING public.auth_sessions s, public.users u
       WHERE h.ticket_hash = $1
         AND h.binding_hash = $2
         AND h.dashboard = 'travel'
         AND h.expires_at > now()
         AND h.consumed_at IS NULL
         AND s.id = h.session_id
         AND s.user_id = h.user_id
         AND u.id = h.user_id
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND u.status = 'active'
         AND (
           u.two_factor_enabled = false
           OR s.mfa_verified_at IS NOT NULL
         )
         AND EXISTS (
           SELECT 1
           FROM public.memberships m
           JOIN public.roles r ON r.id = m.role_id
           JOIN public.organizations o ON o.id = m.organization_id
           WHERE m.user_id = h.user_id
             AND r.code = 'travel'
             AND o.organization_type = 'travel'
             AND o.status IN ('pending', 'active')
         )
       RETURNING h.session_payload_encrypted`,
      [sha256(ticket), sha256(binding)]
    );

    if (result.rowCount !== 1) {
      await client.query('ROLLBACK');
      return null;
    }

    const payload = JSON.parse(
      decryptOAuthSecret(
        result.rows[0].session_payload_encrypted
      )
    );

    if (
      payload.authenticated !== true ||
      payload.dashboard !== 'travel' ||
      !validSecret(payload.session?.accessToken) ||
      !validSecret(payload.session?.refreshToken)
    ) {
      throw new Error('INVALID_DASHBOARD_HANDOFF_PAYLOAD');
    }

    await client.query('COMMIT');
    return payload;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}