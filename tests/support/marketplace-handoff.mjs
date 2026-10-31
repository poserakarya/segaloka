// Login dashboard non-admin untuk E2E lewat jalur Marketplace yang sama
// dengan production, tanpa browser: login API bertanda ingress (seperti
// route website), tiket handoff untuk challenge dari BFF, lalu form POST
// callback dengan Origin Marketplace. Mengembalikan cookie sesi BFF.
import { signIngressRequest } from '../../services/api/src/security/ingress-identity-v3.js';

export const TEST_MARKETPLACE_ORIGIN = 'https://www.segaloka.com';

async function signed(apiOrigin, ingressSecret, method, target, body, token) {
  const raw = Buffer.from(JSON.stringify(body));
  const response = await fetch(apiOrigin + target, {
    method,
    headers: {
      ...signIngressRequest(ingressSecret, { ip: '127.0.0.1', method, target, body: raw }),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: raw
  });
  return { status: response.status, data: await response.json().catch(() => ({})) };
}

// accessToken: sesi Marketplace yang sudah ada (mis. setelah verifikasi 2FA);
// bila kosong, login email + password dilakukan lebih dulu.
export async function marketplaceHandoffLogin({
  apiOrigin,
  ingressSecret,
  dashboardOrigin,
  dashboard,
  email,
  password,
  accessToken = null,
  organizationId = null,
  marketplaceOrigin = TEST_MARKETPLACE_ORIGIN
}) {
  let token = accessToken;
  if (!token) {
    const login = await signed(apiOrigin, ingressSecret, 'POST', '/auth/login', { email, password });
    token = login.data?.session?.accessToken;
    if (login.status !== 200 || !token) throw new Error(`Marketplace login ${email}: ${login.status} ${login.data?.code || ''}`);
  }

  const start = await fetch(`${dashboardOrigin}/bff/auth/handoff/start`, { redirect: 'manual' });
  const location = start.headers.get('location') || '';
  const verifierCookie = (start.headers.get('set-cookie') || '').split(';')[0];
  const challenge = location ? new URL(location).searchParams.get('challenge') : null;
  if (start.status !== 302 || !challenge || !verifierCookie) throw new Error(`handoff start ${dashboard}: ${start.status}`);

  const issued = await signed(apiOrigin, ingressSecret, 'POST', '/auth/dashboard-handoff/tickets', {
    dashboard, challenge, ...(organizationId ? { organizationId } : {})
  }, token);
  if (issued.status !== 201) {
    const error = new Error(`handoff ticket ${dashboard}: ${issued.status} ${issued.data?.code || ''}`);
    error.status = issued.status;
    error.code = issued.data?.code;
    throw error;
  }

  const callback = await fetch(`${dashboardOrigin}/bff/auth/handoff/callback`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: marketplaceOrigin, Cookie: verifierCookie, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `ticket=${issued.data.ticket}`
  });
  const session = (callback.headers.getSetCookie?.() || [])
    .map(cookie => cookie.split(';')[0])
    .find(cookie => /_session=[^;]+$/.test(cookie) && !cookie.endsWith('='));
  if (callback.status !== 303 || !session) throw new Error(`handoff callback ${dashboard}: ${callback.status}`);
  return session;
}
