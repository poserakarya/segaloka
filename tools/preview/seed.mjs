// Data pratinjau berlabel [DATA UJI] untuk database pratinjau yang baru dan
// kosong. Data bisnis dibuat lewat API Fastify asli; hanya akun, organisasi,
// langganan uji, relasi, keberangkatan, dan pendaftaran Vendor yang disisipkan
// langsung (belum ada endpoint pembuatnya). Menolak database tanpa akhiran
// _test atau host selain localhost.
//
//   PREVIEW_DB_HOST/PORT/NAME/USER, PREVIEW_API_ORIGIN, PREVIEW_INGRESS_SECRET,
//   PREVIEW_ACCOUNT_PASSWORD (>= 12 karakter), PREVIEW_ACCOUNTS_FILE (keluaran)
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { createRealtimeHarness } from '../../tests/support/realtime-harness.mjs';
import { hashPassword } from '../../services/api/src/auth/password.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { Pool } = createRequire(`${root}services/api/package.json`)('pg');
const env = process.env;
const db = { host: env.PREVIEW_DB_HOST, port: Number(env.PREVIEW_DB_PORT), name: env.PREVIEW_DB_NAME, user: env.PREVIEW_DB_USER };
if (!['127.0.0.1', 'localhost'].includes(db.host) || !/_test$/.test(db.name || '')) {
  throw new Error('PREVIEW_DATABASE_MUST_BE_LOCAL_TEST');
}
const password = env.PREVIEW_ACCOUNT_PASSWORD || '';
if (password.length < 12) throw new Error('PREVIEW_ACCOUNT_PASSWORD_REQUIRED');

const pool = new Pool({ host: db.host, port: db.port, database: db.name, user: db.user, password: 'trust-auth-unused', ssl: false });
const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
const h = createRealtimeHarness({ apiOrigin: env.PREVIEW_API_ORIGIN, ingressSecret: env.PREVIEW_INGRESS_SECRET });

try {
  if ((await q('SELECT count(*)::int AS n FROM public.users'))[0].n > 0) {
    throw new Error('PREVIEW_DATABASE_NOT_EMPTY');
  }
  const passwordHash = await hashPassword(password);
  const users = {};
  async function user(key, name, role, org = null) {
    const email = `${key}.preview@example.invalid`;
    const [row] = await q(
      `INSERT INTO public.users (email, full_name, email_verified_at, two_factor_enabled)
       VALUES ($1, $2, now(), false) RETURNING id`, [email, name]);
    await q('INSERT INTO public.user_credentials (user_id, password_hash) VALUES ($1, $2)', [row.id, passwordHash]);
    await q(`INSERT INTO public.memberships (user_id, organization_id, role_id) SELECT $1, $2, id FROM public.roles WHERE code = $3`,
      [row.id, org, role]);
    users[key] = { id: row.id, email, name, role };
  }
  const org = async (name, type) => (await q(
    `INSERT INTO public.organizations (name, organization_type, status, is_test_data)
     VALUES ($1, $2, 'active', false) RETURNING id`, [name, type]))[0].id;

  const [plan] = await q(`INSERT INTO public.subscription_plans (code, name, billing_interval) VALUES ('preview-uji', 'Paket Uji [DATA UJI]', 'monthly') RETURNING id`);
  await q(`INSERT INTO public.plan_entitlements (plan_id, entitlement_id, enabled) SELECT $1, id, true FROM public.entitlements WHERE code = 'bookings.manage'`, [plan.id]);
  const travelA = await org('Travel Uji Al-Barakah [DATA UJI]', 'travel');
  const travelB = await org('Travel Uji Nur Madinah [DATA UJI]', 'travel');
  const vendorOrg = await org('Vendor Uji Katering Makkah [DATA UJI]', 'vendor');
  for (const id of [travelA, travelB]) {
    await q(`INSERT INTO public.organization_subscriptions (organization_id, plan_id, status, current_period_start, current_period_end)
             VALUES ($1, $2, 'active', now() - interval '3 days', now() + interval '27 days')`, [id, plan.id]);
  }
  await user('admin', 'Admin Pusat (uji)', 'super_admin');
  await user('travel', 'Staf Travel Al-Barakah (uji)', 'travel', travelA);
  await user('travelb', 'Staf Travel Nur Madinah (uji)', 'travel', travelB);
  await user('vendor', 'Pengelola Vendor (uji)', 'vendor', vendorOrg);
  await user('affiliate', 'Affiliate Uji Rahmat', 'affiliate');
  await user('agen', 'Agen Uji Fajar', 'agen');
  await user('mitra', 'Mitra Uji Hasanah', 'mitra');
  await user('traveler', 'Jamaah Uji Siti Aminah', 'traveler');
  for (const [key, type] of [['agen', 'agent'], ['mitra', 'partner']]) {
    await q(`INSERT INTO public.travel_partner_relationships (travel_organization_id, partner_user_id, relationship_type, status, approved_by, approved_at)
             VALUES ($1, $2, $3, 'approved', $4, now())`, [travelA, users[key].id, type, users.travel.id]);
  }
  await q(`INSERT INTO public.partner_registration_applications (application_type, user_id, payload, status, organization_id, submitted_at)
           VALUES ('vendor', $1, '{"label":"[DATA UJI]"}'::jsonb, 'approved', $2, now() - interval '5 days')`, [users.vendor.id, vendorOrg]);
  const departure = async (orgId, title, destination, days) => (await q(
    `INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date)
     VALUES ($1, $2, $3, current_date + $4::int) RETURNING id`, [orgId, title, destination, days]))[0].id;
  const depA1 = await departure(travelA, 'Umrah Reguler 12 Hari [DATA UJI]', 'Makkah', 38);
  const depA2 = await departure(travelA, 'Umrah Plus Turki [DATA UJI]', 'Madinah · Istanbul', 74);
  const depB = await departure(travelB, 'Umrah Ramadhan [DATA UJI]', 'Makkah', 120);

  const tokens = {};
  for (const key of Object.keys(users)) {
    const login = await h.api('POST', '/auth/login', { body: { email: users[key].email, password } });
    if (login.status !== 200) throw new Error(`login ${key}: ${login.status}`);
    tokens[key] = login.data.session.accessToken;
  }
  const must = async (label, promise) => {
    const r = await promise;
    if (![200, 201].includes(r.status)) throw new Error(`${label}: ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  };
  const b1 = (await must('booking 1', h.api('POST', '/travel/bookings', { body: { departureId: depA1 }, token: tokens.agen }))).booking;
  const b2 = (await must('booking 2', h.api('POST', '/travel/bookings', { body: { departureId: depA2 }, token: tokens.agen }))).booking;
  const b3 = (await must('booking 3', h.api('POST', '/travel/bookings', { body: { departureId: depA1 }, token: tokens.mitra }))).booking;
  await must('booking B', h.api('POST', '/travel/bookings', { body: { departureId: depB }, token: tokens.travelb }));
  for (const [booking, fullName, userId] of [
    [b1, 'Jamaah Uji Siti Aminah', users.traveler.id], [b1, 'Jamaah Uji Ahmad Fauzi'],
    [b2, 'Jamaah Uji Nurul Huda'], [b3, 'Jamaah Uji Rina Maharani']
  ]) {
    await must(`peserta ${fullName}`, h.api('POST', `/travel/bookings/${booking.id}/participants`,
      { body: { fullName, ...(userId ? { userId } : {}) }, token: tokens.travel }));
  }
  await must('konfirmasi', h.api('POST', `/travel/bookings/${b1.id}/confirm`, { token: tokens.travel }));
  await must('referral A', h.api('POST', '/affiliate/referral-links', { body: { travelOrganizationId: travelA }, token: tokens.affiliate }));
  const linkB = (await must('referral B', h.api('POST', '/affiliate/referral-links', { body: { travelOrganizationId: travelB }, token: tokens.affiliate }))).link;
  await must('pause referral B', h.api('PATCH', `/affiliate/referral-links/${linkB.id}`, { body: { status: 'paused' }, token: tokens.affiliate }));
  await must('cabang', h.api('POST', `/control-center/travels/${travelA}/branches`,
    { body: { branchCode: 'BDG-UJI', branchName: 'Cabang Uji Bandung [DATA UJI]', status: 'active' }, token: tokens.admin }));
  // Sesi API seed tidak dipakai lagi.
  await q('UPDATE public.auth_sessions SET revoked_at = now() WHERE revoked_at IS NULL');

  if (env.PREVIEW_ACCOUNTS_FILE) {
    writeFileSync(env.PREVIEW_ACCOUNTS_FILE, JSON.stringify(
      Object.fromEntries(Object.entries(users).map(([key, u]) => [key, { email: u.email, role: u.role, name: u.name }])), null, 2));
  }
  console.log('seed selesai:', Object.keys(users).length, 'akun,', 4, 'booking');
} finally {
  h.shutdown();
  await pool.end();
}
