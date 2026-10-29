import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BFF_LOGIN_PATHS,
  classifyLoginResponse,
  createBffLoginContract
} from './bff-login-contract.mjs';

const TICKET = 'a'.repeat(64);
const CHALLENGE = '33333333-3333-4333-8333-333333333333';
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'uji@example.invalid' };
const SESSION = { accessToken: 'access-token', refreshToken: 'refresh-token' };

function harness(routes, options = {}) {
  const calls = [];
  const created = [];
  let clock = 1_000_000;
  const contract = createBffLoginContract({
    apiRequest: async (method, target, data, token) => {
      calls.push({ method, target, data, token });
      const route = routes[`${method} ${target}`];
      if (!route) throw new Error(`unexpected ${method} ${target}`);
      return typeof route === 'function' ? route(data) : route;
    },
    sessions: { create: async (...args) => created.push(args) },
    hasDashboardAccess: me => me.memberships?.some(m => m.role === 'agen'),
    sessionCookie: id => `segaloka_agen_session=${id}; HttpOnly`,
    accessDeniedCode: 'AGEN_ACCESS_REQUIRED',
    accessDeniedMessage: 'Akun tidak memiliki akses Dashboard agen.',
    now: () => clock,
    ...options
  });

  return {
    calls,
    created,
    advance: ms => { clock += ms; },
    post: (path, body) => contract.handle(path, Buffer.from(JSON.stringify(body))),
    contract
  };
}

const ME_OK = { status: 200, data: { user: USER, memberships: [{ role: 'agen', organizationId: null }] } };
const twoFactor = methods => ({
  status: 200,
  data: {
    authenticated: false,
    code: 'OTP_CHANNEL_REQUIRED',
    preAuthTicket: TICKET,
    availableMethods: methods,
    expiresIn: 300
  }
});

test('exposes the four login paths', () => {
  assert.deepEqual(BFF_LOGIN_PATHS, [
    '/bff/login',
    '/bff/login/select-channel',
    '/bff/login/verify-otp',
    '/bff/login/verify-authenticator'
  ]);
});

test('password-only account (2FA off) gets a session immediately', async () => {
  const h = harness({
    'POST /auth/login': { status: 200, data: { authenticated: true, session: SESSION } },
    'GET /auth/me': ME_OK
  });

  const result = await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });

  assert.equal(result.status, 200);
  assert.equal(result.body.authenticated, true);
  assert.match(result.headers['Set-Cookie'], /^segaloka_agen_session=[0-9a-f]{64}; HttpOnly$/);
  assert.equal(h.created.length, 1);
  assert.equal(h.created[0][1], USER.id);
});

test('2FA account receives only the methods offered by the API and no session', async () => {
  const h = harness({ 'POST /auth/login': twoFactor(['authenticator', 'email', 'sms', 'email']) });

  const result = await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, {
    authenticated: false,
    code: 'OTP_CHANNEL_REQUIRED',
    preAuthTicket: TICKET,
    availableMethods: ['authenticator', 'email'],
    expiresIn: 300
  });
  assert.equal(result.headers['Set-Cookie'], undefined);
  assert.equal(h.created.length, 0);
});

test('TOTP: session is created only after the API verifies the code', async () => {
  const h = harness({
    'POST /auth/login': twoFactor(['authenticator']),
    'POST /auth/login/verify-authenticator': { status: 200, data: { authenticated: true, session: SESSION } },
    'GET /auth/me': ME_OK
  });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  assert.equal(h.created.length, 0);

  const result = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '123456' });

  assert.equal(result.status, 200);
  assert.equal(h.created.length, 1);
  assert.deepEqual(
    h.calls.find(c => c.target === '/auth/login/verify-authenticator').data,
    { preAuthTicket: TICKET, code: '123456' }
  );
  assert.equal(h.contract.pendingTicketCount(), 0);
});

test('TOTP: a wrong code is rejected without a session and may be retried', async () => {
  let attempts = 0;
  const h = harness({
    'POST /auth/login': twoFactor(['authenticator']),
    'POST /auth/login/verify-authenticator': () => (++attempts === 1
      ? { status: 401, data: { authenticated: false, code: 'INVALID_OR_EXPIRED_AUTHENTICATOR' } }
      : { status: 200, data: { authenticated: true, session: SESSION } }),
    'GET /auth/me': ME_OK
  });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  const wrong = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '000000' });

  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.code, 'INVALID_OR_EXPIRED_AUTHENTICATOR');
  assert.equal(h.created.length, 0);

  const right = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '123456' });
  assert.equal(right.status, 200);
  assert.equal(h.created.length, 1);
});

test('email OTP: select channel, then verify, then session', async () => {
  const h = harness({
    'POST /auth/login': twoFactor(['email', 'whatsapp']),
    'POST /auth/login/select-channel': {
      status: 200,
      data: { authenticated: false, code: 'OTP_REQUIRED', challengeId: CHALLENGE, channel: 'email', expiresIn: 300 }
    },
    'POST /auth/login/verify-otp': { status: 200, data: { authenticated: true, session: SESSION } },
    'GET /auth/me': ME_OK
  });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  const selected = await h.post('/bff/login/select-channel', { preAuthTicket: TICKET, channel: 'email' });

  assert.equal(selected.status, 200);
  assert.equal(selected.body.challengeId, CHALLENGE);
  assert.equal(h.created.length, 0);

  const verified = await h.post('/bff/login/verify-otp', { challengeId: CHALLENGE, code: '654321' });
  assert.equal(verified.status, 200);
  assert.equal(h.created.length, 1);
});

test('WhatsApp OTP provider failure rejects the login with no bypass', async () => {
  const h = harness({
    'POST /auth/login': twoFactor(['whatsapp']),
    'POST /auth/login/select-channel': {
      status: 503,
      data: { authenticated: false, code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Pengiriman kode verifikasi belum tersedia.' }
    }
  });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  const result = await h.post('/bff/login/select-channel', { preAuthTicket: TICKET, channel: 'whatsapp' });

  assert.equal(result.status, 503);
  assert.equal(result.body.code, 'OTP_DELIVERY_UNAVAILABLE');
  assert.equal(h.created.length, 0);

  // Tiket tidak bisa dipakai ulang untuk metode lain setelah gagal.
  const retry = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '123456' });
  assert.equal(retry.status, 401);
  assert.equal(h.calls.filter(c => c.target === '/auth/login/verify-authenticator').length, 0);
});

test('rejects a method that the API did not offer for the account', async () => {
  const h = harness({ 'POST /auth/login': twoFactor(['email']) });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });

  const totp = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '123456' });
  const wa = await h.post('/bff/login/select-channel', { preAuthTicket: TICKET, channel: 'whatsapp' });

  assert.equal(totp.status, 403);
  assert.equal(totp.body.code, 'VERIFICATION_METHOD_NOT_ALLOWED');
  assert.equal(wa.status, 403);
  assert.equal(h.calls.length, 1);
});

test('only one method may be chosen per pre-auth ticket', async () => {
  const h = harness({
    'POST /auth/login': twoFactor(['authenticator', 'email']),
    'POST /auth/login/verify-authenticator': { status: 401, data: { code: 'INVALID_OR_EXPIRED_AUTHENTICATOR' } }
  });

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '000000' });
  const switched = await h.post('/bff/login/select-channel', { preAuthTicket: TICKET, channel: 'email' });

  assert.equal(switched.status, 403);
  assert.equal(switched.body.code, 'VERIFICATION_METHOD_NOT_ALLOWED');
});

test('unknown or expired tickets are rejected before calling the API', async () => {
  const h = harness({ 'POST /auth/login': twoFactor(['authenticator']) });

  const unknown = await h.post('/bff/login/verify-authenticator', { preAuthTicket: 'b'.repeat(64), code: '123456' });
  assert.equal(unknown.status, 401);

  await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });
  h.advance(301_000);
  const expired = await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '123456' });
  assert.equal(expired.status, 401);
  assert.equal(expired.body.code, 'INVALID_OR_EXPIRED_PRE_AUTH');
  assert.equal(h.calls.length, 1);
});

test('verified user without dashboard role is logged out and gets 403', async () => {
  const h = harness({
    'POST /auth/login': { status: 200, data: { authenticated: true, session: SESSION } },
    'GET /auth/me': { status: 200, data: { user: USER, memberships: [{ role: 'traveler' }] } },
    'POST /auth/logout': { status: 200, data: {} }
  });

  const result = await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' });

  assert.equal(result.status, 403);
  assert.equal(result.body.code, 'AGEN_ACCESS_REQUIRED');
  assert.equal(h.created.length, 0);
  assert.deepEqual(h.calls.at(-1), {
    method: 'POST', target: '/auth/logout', data: { refreshToken: 'refresh-token' }, token: undefined
  });
});

test('validates request bodies and API responses', async () => {
  const h = harness({
    'POST /auth/login': { status: 200, data: { authenticated: true, session: { accessToken: 'x' } } }
  });

  assert.equal((await h.post('/bff/login', { email: 1 })).status, 400);
  assert.equal((await h.post('/bff/login/verify-otp', { challengeId: 'x', code: '123456' })).status, 400);
  assert.equal((await h.post('/bff/login/verify-authenticator', { preAuthTicket: TICKET, code: '12a456' })).status, 400);
  assert.equal((await h.post('/bff/login/select-channel', { preAuthTicket: TICKET, channel: 'sms' })).status, 400);
  assert.equal((await h.post('/bff/login', { email: 'a@b.invalid', password: 'x' })).status, 502);
  await assert.rejects(() => h.contract.handle('/bff/login', Buffer.from('{')), SyntaxError);
});

test('classifyLoginResponse rejects incomplete sessions and empty method lists', () => {
  assert.equal(classifyLoginResponse({ authenticated: true, session: {} }).type, 'invalid');
  assert.equal(classifyLoginResponse(twoFactor(['sms']).data).type, 'invalid');
  assert.equal(classifyLoginResponse(null).type, 'invalid');
});
