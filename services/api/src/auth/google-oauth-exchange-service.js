import {
  randomBytes,
  createHash
} from 'node:crypto';

import {
  encryptOAuthSecret,
  decryptOAuthSecret
} from './oauth-config-crypto.js';

const TTL_SECONDS = 60;

function sha256(value) {
  return createHash('sha256')
    .update(value)
    .digest('hex');
}

function validSecret(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{64}$/.test(value)
  );
}

export async function createGoogleOAuthExchange(
  client,
  {
    session,
    user
  }
) {
  if (
    !session ||
    !session.sessionId ||
    !validSecret(session.refreshToken) ||
    !validSecret(session.accessToken) ||
    !user ||
    !user.id
  ) {
    throw new Error('INVALID_GOOGLE_EXCHANGE_SESSION');
  }

  const code = randomBytes(32).toString('hex');
  const browserBinding =
    randomBytes(32).toString('hex');

  const payload = encryptOAuthSecret(
    JSON.stringify({
      authenticated: true,
      user,
      session
    })
  );

  await client.query(
    `INSERT INTO public.auth_oauth_exchanges (
       provider,
       exchange_code_hash,
       browser_binding_hash,
       session_id,
       session_payload_encrypted,
       expires_at
     )
     VALUES (
       'google',
       $1,
       $2,
       $3,
       $4,
       now() + interval '60 seconds'
     )`,
    [
      sha256(code),
      sha256(browserBinding),
      session.sessionId,
      payload
    ]
  );

  return {
    code,
    browserBinding,
    expiresIn: TTL_SECONDS
  };
}

export async function consumeGoogleOAuthExchange(
  pool,
  {
    code,
    browserBinding
  }
) {
  if (
    !validSecret(code) ||
    !validSecret(browserBinding)
  ) {
    return null;
  }

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query('BEGIN');
    transactionOpen = true;

    const result = await client.query(
      `DELETE FROM public.auth_oauth_exchanges e
       USING public.auth_sessions s,
             public.users u
       WHERE e.exchange_code_hash = $1
         AND e.browser_binding_hash = $2
         AND e.provider = 'google'
         AND e.consumed_at IS NULL
         AND e.expires_at > now()
         AND s.id = e.session_id
         AND s.user_id = u.id
         AND s.revoked_at IS NULL
         AND s.expires_at > now()
         AND s.mfa_verified_at IS NOT NULL
         AND s.mfa_method = 'google'
         AND u.status = 'active'
       RETURNING e.session_payload_encrypted`,
      [
        sha256(code),
        sha256(browserBinding)
      ]
    );

    if (result.rowCount !== 1) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return null;
    }

    const decrypted = decryptOAuthSecret(
      result.rows[0].session_payload_encrypted
    );

    const payload = JSON.parse(decrypted);

    if (
      payload?.authenticated !== true ||
      !payload.session?.accessToken ||
      !payload.session?.refreshToken
    ) {
      throw new Error('INVALID_EXCHANGE_PAYLOAD');
    }

    await client.query('COMMIT');
    transactionOpen = false;

    return payload;
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch {}
    }

    throw error;
  } finally {
    client.release();
  }
}