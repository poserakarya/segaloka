// Handoff login Marketplace untuk BFF dashboard non-admin (Travel, Vendor,
// Affiliate, Agen, Mitra, Traveler). Dashboard tidak memiliki form login.
//
// GET  /bff/auth/handoff/start
//   Bila sesi BFF masih sah -> langsung ke dashboard. Selain itu membuat
//   verifier acak (cookie HttpOnly host dashboard, Path=/bff/auth/handoff,
//   5 menit) dan mengarahkan browser ke Marketplace dengan
//   challenge = sha256(verifier). Tidak ada state di memori proses.
// POST /bff/auth/handoff/callback   (form POST dari Marketplace)
//   Origin wajib Marketplace. Tiket (body) + verifier (cookie) ditukar ke API
//   (ingress bertanda). Sesi BFF dibuat lewat completeSession (memeriksa
//   /auth/me dan akses dashboard), verifier dihapus, lalu 303 ke dashboard.
// Tiket dan token tidak pernah ada di URL maupun log.
import { createHash, randomBytes } from 'node:crypto';

const HEX64 = /^[0-9a-f]{64}$/;
const MARKETPLACE_HOSTS = new Set(['segaloka.com', 'www.segaloka.com']);
export const HANDOFF_START_PATH = '/bff/auth/handoff/start';
export const HANDOFF_CALLBACK_PATH = '/bff/auth/handoff/callback';
const VERIFIER_MAX_AGE = 300;

// Origin Marketplace. Production: https://segaloka.com atau
// https://www.segaloka.com. Di luar production boleh http://127.0.0.1:<port>
// (uji lokal terisolasi).
export function marketplaceOrigin(env = process.env) {
  const value = env.SEGALOKA_MARKETPLACE_ORIGIN || 'https://www.segaloka.com';
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('INVALID_SEGALOKA_MARKETPLACE_ORIGIN');
  }
  const production = env.NODE_ENV === 'production';
  const secure = url.protocol === 'https:' && MARKETPLACE_HOSTS.has(url.hostname);
  const localTest = !production && url.protocol === 'http:' && url.hostname === '127.0.0.1';
  if ((!secure && !localTest) || url.username || url.password || url.pathname !== '/') {
    throw new Error('INVALID_SEGALOKA_MARKETPLACE_ORIGIN');
  }
  return url.origin;
}

function readCookie(header, name) {
  const matches = String(header || '').split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}

export function createMarketplaceHandoff({
  dashboard,
  apiRequest,
  completeSession,
  hasValidSession,
  successPath,
  env = process.env
}) {
  if (typeof apiRequest !== 'function' || typeof completeSession !== 'function' || typeof hasValidSession !== 'function') {
    throw new Error('INVALID_MARKETPLACE_HANDOFF_OPTIONS');
  }
  const origin = marketplaceOrigin(env);
  const cookieName = `segaloka_${dashboard}_handoff`;
  const secure = env.NODE_ENV === 'production' ? '; Secure' : '';
  const verifierCookie = (value, maxAge) =>
    `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/bff/auth/handoff; Max-Age=${maxAge}${secure}`;
  const redirect = (location, headers = {}) => ({
    status: location === successPath ? 303 : 302,
    headers: { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...headers },
    body: null
  });
  const failure = (status, code) => ({ status, headers: { 'Cache-Control': 'no-store' }, body: { authenticated: false, code } });

  async function start(req) {
    if (await hasValidSession(req)) return redirect(successPath);
    const verifier = randomBytes(32).toString('hex');
    const challenge = createHash('sha256').update(verifier).digest('hex');
    const target = new URL('/api/auth/dashboard-handoff', origin);
    target.searchParams.set('dashboard', dashboard);
    target.searchParams.set('challenge', challenge);
    return redirect(target.toString(), { 'Set-Cookie': verifierCookie(verifier, VERIFIER_MAX_AGE) });
  }

  async function callback(req, rawBody) {
    if (req.headers.origin !== origin) return failure(403, 'HANDOFF_ORIGIN_NOT_ALLOWED');
    const contentType = String(req.headers['content-type'] || '').split(';')[0].trim();
    if (contentType !== 'application/x-www-form-urlencoded') return failure(415, 'HANDOFF_FORM_REQUIRED');
    const ticket = new URLSearchParams(Buffer.from(rawBody).toString('utf8')).get('ticket') || '';
    const verifier = readCookie(req.headers.cookie, cookieName) || '';
    const clear = verifierCookie('', 0);
    if (!HEX64.test(ticket) || !HEX64.test(verifier)) {
      return { ...failure(401, 'INVALID_OR_EXPIRED_HANDOFF'), headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clear } };
    }
    const consumed = await apiRequest('POST', '/auth/dashboard-handoff/consume', { dashboard, ticket, verifier });
    if (consumed.status !== 200 || consumed.data?.authenticated !== true || !consumed.data.session) {
      return { ...failure(401, 'INVALID_OR_EXPIRED_HANDOFF'), headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clear } };
    }
    const organizationId = typeof consumed.data.organizationId === 'string' ? consumed.data.organizationId : null;
    const result = await completeSession(consumed.data.session, { organizationId });
    if (result.status !== 200) {
      return { ...failure(result.status, result.body?.code || 'DASHBOARD_ACCESS_DENIED'), headers: { 'Cache-Control': 'no-store', 'Set-Cookie': clear } };
    }
    const cookies = [result.headers['Set-Cookie'], clear].filter(Boolean);
    return redirect(successPath, { 'Set-Cookie': cookies });
  }

  return {
    origin,
    handles: (method, path) =>
      (method === 'GET' && path === HANDOFF_START_PATH) || (method === 'POST' && path === HANDOFF_CALLBACK_PATH),
    async handle(req, path, readBody) {
      return path === HANDOFF_START_PATH ? start(req) : callback(req, await readBody());
    }
  };
}

export function sendHandoffResult(res, result) {
  if (result.body === null) {
    res.writeHead(result.status, result.headers);
    return res.end();
  }
  res.writeHead(result.status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...result.headers
  });
  return res.end(JSON.stringify(result.body));
}
