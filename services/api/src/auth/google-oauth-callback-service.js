import { timingSafeEqual } from 'node:crypto';

import {
  consumeGoogleOAuthState
} from './google-oauth-state-service.js';

import {
  verifyGoogleIdToken
} from './google-id-token-verifier.js';

import {
  decryptOAuthSecret
} from './oauth-config-crypto.js';

const CALLBACK =
  'https://api.segaloka.com/auth/google/callback';

const GOOGLE_TOKEN_ENDPOINT =
  'https://oauth2.googleapis.com/token';

function safeEqual(a, b) {
  if (
    typeof a !== 'string' ||
    typeof b !== 'string'
  ) {
    return false;
  }

  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return (
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export function validateGoogleCallbackInput({
  code,
  state,
  cookieState
}) {
  if (
    typeof code !== 'string' ||
    code.length < 1 ||
    code.length > 4096 ||
    typeof state !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(state) ||
    !safeEqual(state, cookieState)
  ) {
    return false;
  }

  return true;
}

export async function resolveGoogleCallbackIdentity(
  pool,
  {
    code,
    state,
    cookieState
  },
  {
    fetchImpl = fetch,
    verifyIdToken = verifyGoogleIdToken
  } = {}
) {
  if (!validateGoogleCallbackInput({
    code,
    state,
    cookieState
  })) {
    return {
      ok: false,
      code: 'INVALID_GOOGLE_CALLBACK'
    };
  }

  const configResult = await pool.query(
    `SELECT
       enabled,
       client_id,
       client_secret_encrypted,
       redirect_uri
     FROM public.oauth_provider_configs
     WHERE provider = 'google'
     LIMIT 1`
  );

  const config = configResult.rows[0];

  if (
    !config ||
    config.enabled !== true ||
    !config.client_id ||
    !config.client_secret_encrypted ||
    config.redirect_uri !== CALLBACK
  ) {
    return {
      ok: false,
      code: 'GOOGLE_LOGIN_UNAVAILABLE'
    };
  }

  const oauthState = await consumeGoogleOAuthState(
    pool,
    state
  );

  if (
    !oauthState ||
    oauthState.redirectUri !== CALLBACK
  ) {
    return {
      ok: false,
      code: 'INVALID_OR_EXPIRED_GOOGLE_STATE'
    };
  }

  const clientSecret = decryptOAuthSecret(
    config.client_secret_encrypted
  );

  const body = new URLSearchParams({
    code,
    client_id: config.client_id,
    client_secret: clientSecret,
    redirect_uri: CALLBACK,
    grant_type: 'authorization_code',
    code_verifier: oauthState.codeVerifier
  });

  const response = await fetchImpl(
    GOOGLE_TOKEN_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded'
      },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    }
  );

  if (!response.ok) {
    return {
      ok: false,
      code: 'GOOGLE_TOKEN_EXCHANGE_FAILED'
    };
  }

  const contentLength = Number(
    response.headers.get('content-length') || 0
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 32768
  ) {
    return {
      ok: false,
      code: 'INVALID_GOOGLE_TOKEN_RESPONSE'
    };
  }

  const raw = await response.text();

  if (Buffer.byteLength(raw, 'utf8') > 32768) {
    return {
      ok: false,
      code: 'INVALID_GOOGLE_TOKEN_RESPONSE'
    };
  }

  let tokenResponse;

  try {
    tokenResponse = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      code: 'INVALID_GOOGLE_TOKEN_RESPONSE'
    };
  }

  if (
    !tokenResponse ||
    typeof tokenResponse.id_token !== 'string'
  ) {
    return {
      ok: false,
      code: 'MISSING_GOOGLE_ID_TOKEN'
    };
  }

  const identity = await verifyIdToken(
    tokenResponse.id_token,
    {
      clientId: config.client_id,
      nonceHash: oauthState.nonceHash
    }
  );

  return {
    ok: true,
    identity
  };
}