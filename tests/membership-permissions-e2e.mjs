// E2E izin per membership Travel (migrasi 0041) pada PostgreSQL _test:
// database sementara dibuat dengan runner migrasi asli, lalu route API asli
// (sertifikat + izin membership) diuji lewat Fastify dengan sesi nyata di
// database. Database sementara dihapus di akhir.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';

import { migrationFiles, run as migrate } from '../database/migrate.mjs';

const require = createRequire(new URL('../services/api/package.json', import.meta.url));
const db = {
  host: process.env.SEGALOKA_E2E_DB_HOST,
  port: process.env.SEGALOKA_E2E_DB_PORT,
  name: process.env.SEGALOKA_E2E_DB_NAME,
  user: process.env.SEGALOKA_E2E_DB_USER
};
const configured = ['127.0.0.1', 'localhost'].includes(db.host) && /_test$/.test(db.name || '') && db.port && db.user;
const nodeMajor = Number(process.versions.node.split('.')[0]);
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');

test('membership permissions: grant/revoke by Super Admin, tenant-bound certificate access, audit, idempotency', {
  skip: nodeMajor < 24 ? 'butuh Node >= 24' : configured ? false : 'database tes (_test, localhost) belum dikonfigurasi',
  timeout: 180000
}, async t => {
  const { Client, Pool } = require('pg');
  const Fastify = require('fastify');
  const name = `seg_rbac_${randomBytes(3).toString('hex')}_test`;
  const admin = new Client({ host: db.host, port: Number(db.port), database: db.name, user: db.user, password: 'x' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  const env = { DB_HOST: db.host, DB_PORT: db.port, DB_NAME: name, DB_USER: db.user, DB_PASSWORD: 'x', DB_SSL: 'false' };
  const previous = { key: process.env.CERTIFICATE_ENCRYPTION_KEY, base: process.env.PUBLIC_CERTIFICATE_BASE_URL };
  process.env.CERTIFICATE_ENCRYPTION_KEY = token();
  process.env.PUBLIC_CERTIFICATE_BASE_URL = 'http://127.0.0.1:4999';
  let pool;
  let app;

  try {
    // ---------- Migrasi (runner asli) ----------
    const first = await migrate(['apply', '--confirm-database', name], { env, log: () => {} });
    assert.equal(first.applied.length, migrationFiles().length);
    assert.ok(first.applied.includes('0041_membership_permissions'));
    const second = await migrate(['apply', '--confirm-database', name], { env, log: () => {} });
    assert.deepEqual(second.applied, [], 'apply kedua tidak menjalankan apa pun');

    pool = new Pool({ host: db.host, port: Number(db.port), database: name, user: db.user, password: 'x', max: 5 });
    const q = async (sql, params = []) => (await pool.query(sql, params)).rows;
    assert.equal((await q('SELECT count(*)::int AS n FROM public.membership_permissions'))[0].n, 0);

    // ---------- Data uji (database sementara) ----------
    const user = async (label, twoFactor = false) => (await q(
      `INSERT INTO public.users (email, full_name, status, email_verified_at, two_factor_enabled)
       VALUES ($1, $2, 'active', now(), $3) RETURNING id`, [`${label}.rbac@example.invalid`, `Uji ${label}`, twoFactor]))[0].id;
    const org = async (label, type = 'travel') => (await q(
      `INSERT INTO public.organizations (name, organization_type, status) VALUES ($1, $2, 'active') RETURNING id`, [`RBAC ${label}`, type]))[0].id;
    const member = async (userId, role, orgId = null) => (await q(
      `INSERT INTO public.memberships (user_id, organization_id, role_id) SELECT $1, $2, id FROM public.roles WHERE code = $3 RETURNING id`,
      [userId, orgId, role]))[0].id;
    async function session(userId, mfa = false) {
      const bearer = token();
      const [s] = await q(
        `INSERT INTO public.auth_sessions (user_id, refresh_token_hash, expires_at, mfa_verified_at, mfa_method)
         VALUES ($1, $2, now() + interval '1 hour', $3, $4) RETURNING id`,
        [userId, hash(token()), mfa ? new Date() : null, mfa ? 'authenticator' : null]);
      await q(`INSERT INTO public.auth_access_tokens (session_id, token_hash, expires_at) VALUES ($1, $2, now() + interval '1 hour')`, [s.id, hash(bearer)]);
      return { authorization: `Bearer ${bearer}` };
    }
    async function participant(orgId, travelerId, verifierId) {
      const [d] = await q(`INSERT INTO public.travel_departures (travel_organization_id, title, destination, departure_date, status)
                           VALUES ($1, 'Perjalanan RBAC', 'Madinah', CURRENT_DATE - 7, 'departed') RETURNING id`, [orgId]);
      const [b] = await q(`INSERT INTO public.travel_bookings (departure_id, booking_user_id, booking_number, status)
                           VALUES ($1, $2, $3, 'confirmed') RETURNING id`, [d.id, travelerId, `RBAC-${token().slice(0, 12)}`]);
      return (await q(`INSERT INTO public.travel_booking_participants (booking_id, user_id, full_name, departure_status, departure_verified_by, departure_verified_at)
                       VALUES ($1, $2, 'Peserta RBAC', 'departed', $3, now()) RETURNING id`, [b.id, travelerId, verifierId]))[0].id;
    }

    const orgA = await org('A');
    const orgB = await org('B');
    const vendorOrg = await org('Vendor', 'vendor');
    const superAdmin = await user('superadmin', true);
    const superAdminNoMfa = await user('superadmin-nomfa');
    const staffA1 = await user('staff-a1');
    const staffA2 = await user('staff-a2');
    const staffB = await user('staff-b');
    const staffAB = await user('staff-ab');
    const vendorUser = await user('vendor');
    const traveler = await user('traveler');
    await member(superAdmin, 'super_admin');
    await member(superAdminNoMfa, 'super_admin');
    const adminTravelA = await member(superAdmin, 'travel', orgA); // juga anggota Travel A
    const mA1 = await member(staffA1, 'travel', orgA);
    const mA2 = await member(staffA2, 'travel', orgA);
    const mB = await member(staffB, 'travel', orgB);
    const mABa = await member(staffAB, 'travel', orgA);
    await member(staffAB, 'travel', orgB);
    const mVendor = await member(vendorUser, 'vendor', vendorOrg);
    await member(traveler, 'traveler');
    const pA1 = await participant(orgA, traveler, staffA1);
    const pA2 = await participant(orgA, traveler, staffA1);
    const pB = await participant(orgB, traveler, staffB);

    const auth = {
      admin: await session(superAdmin, true),
      adminNoMfa: await session(superAdminNoMfa),
      staffA1: await session(staffA1),
      staffA2: await session(staffA2),
      staffB: await session(staffB),
      staffAB: await session(staffAB),
      vendor: await session(vendorUser)
    };

    app = Fastify({ logger: false });
    const { registerTravelerCertificateRoutes } = await import('../services/api/src/travel/certificate-routes.js');
    const { registerMembershipPermissionRoutes } = await import('../services/api/src/control-center/membership-permission-routes.js');
    await registerTravelerCertificateRoutes(app, pool);
    await registerMembershipPermissionRoutes(app, pool);
    await app.ready();

    const grantUrl = (orgId, membershipId, code) => `/control-center/travels/${orgId}/members/${membershipId}/permissions/${code}`;
    const call = (method, url, headers) => app.inject({ method, url, headers });
    const issue = (participantId, headers) => call('POST', `/travel/participants/${participantId}/certificate`, headers);
    const audits = async () => q(`SELECT action, actor_user_id, organization_id, entity_id FROM public.audit_logs
                                  WHERE entity_type = 'membership_permission' ORDER BY created_at, id`);
    const events = async () => q(`SELECT event_type, organization_id, entity_id, payload FROM public.sync_outbox
                                  WHERE entity_type = 'travel_membership_permission' ORDER BY id`);

    await t.test('tanpa izin: staf Travel tidak bisa menerbitkan sertifikat', async () => {
      const response = await issue(pA1, auth.staffA1);
      assert.equal(response.statusCode, 403);
      assert.equal(response.json().code, 'TRAVEL_ACCESS_DENIED');
    });

    await t.test('hanya Super Admin ber-MFA yang boleh memberi izin; tanpa self-grant/eskalasi', async () => {
      for (const who of ['staffA1', 'staffA2', 'staffB', 'vendor']) {
        const response = await call('PUT', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth[who]);
        assert.equal(response.statusCode, 403, who);
        assert.equal(response.json().code, 'SUPER_ADMIN_ACCESS_REQUIRED', who);
      }
      // Staf tidak bisa memberi izin ke membership-nya sendiri.
      assert.equal((await call('PUT', grantUrl(orgA, mA2, 'travel.certificates.issue'), auth.staffA2)).statusCode, 403);
      const noMfa = await call('PUT', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth.adminNoMfa);
      assert.equal(noMfa.statusCode, 403);
      assert.equal(noMfa.json().code, 'MFA_REQUIRED_FOR_PERMISSION_CHANGE');
      const self = await call('PUT', grantUrl(orgA, adminTravelA, 'travel.certificates.issue'), auth.admin);
      assert.equal(self.statusCode, 403);
      assert.equal(self.json().code, 'SELF_GRANT_FORBIDDEN');
      // Membership organisasi lain pada path organisasi A, membership Vendor, kode tidak sah.
      assert.equal((await call('PUT', grantUrl(orgA, mB, 'travel.certificates.issue'), auth.admin)).statusCode, 404);
      assert.equal((await call('PUT', grantUrl(vendorOrg, mVendor, 'travel.certificates.issue'), auth.admin)).statusCode, 404);
      assert.equal((await call('PUT', grantUrl(orgA, mA1, 'affiliate.referral_links.read'), auth.admin)).statusCode, 400);
      assert.equal((await call('PUT', `/control-center/travels/${orgA}/members/bukan-uuid/permissions/travel.certificates.issue`, auth.admin)).statusCode, 400);
      // Self-grant langsung ke database juga ditolak trigger.
      await assert.rejects(
        q(`INSERT INTO public.membership_permissions (membership_id, permission_id, granted_by)
           SELECT $1, id, $2 FROM public.permissions WHERE code = 'travel.certificates.issue'`, [mA1, staffA1]),
        /MEMBERSHIP_PERMISSION_SELF_GRANT/
      );
      assert.equal((await q('SELECT count(*)::int AS n FROM public.membership_permissions'))[0].n, 0);
      assert.deepEqual(await audits(), []);
    });

    await t.test('grant sah: audit log + event realtime transaksional, idempotent', async () => {
      const granted = await call('PUT', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth.admin);
      assert.equal(granted.statusCode, 201, granted.body);
      const again = await call('PUT', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth.admin);
      assert.equal(again.statusCode, 200);
      assert.equal(again.json().idempotent, true);
      const rows = await q(`SELECT id, granted_by FROM public.membership_permissions WHERE membership_id = $1 AND revoked_at IS NULL`, [mA1]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].granted_by, superAdmin);
      assert.deepEqual(await audits(), [{ action: 'travel.membership_permission.granted', actor_user_id: superAdmin, organization_id: orgA, entity_id: rows[0].id }]);
      const [event] = await events();
      assert.equal(event.event_type, 'travel.membership_permission.granted');
      assert.equal(event.organization_id, orgA);
      assert.equal(event.entity_id, rows[0].id);
      assert.deepEqual({ m: event.payload.membershipId, p: event.payload.permission }, { m: mA1, p: 'travel.certificates.issue' });
    });

    let certificateId;
    await t.test('akses sah dan izin berdiri sendiri (issue tanpa revoke)', async () => {
      const issued = await issue(pA1, auth.staffA1);
      assert.equal(issued.statusCode, 201, issued.body);
      certificateId = issued.json().certificate.id;
      const revoke = await call('POST', `/travel/certificates/${certificateId}/revoke`, auth.staffA1);
      assert.equal(revoke.statusCode, 403);
      // Staf lain di organisasi yang sama tetap tanpa izin.
      assert.equal((await issue(pA2, auth.staffA2)).statusCode, 403);
    });

    await t.test('lintas tenant: izin di A tidak berlaku di B', async () => {
      assert.equal((await call('PUT', grantUrl(orgA, mABa, 'travel.certificates.issue'), auth.admin)).statusCode, 201);
      assert.equal((await issue(pB, auth.staffAB)).statusCode, 403, 'anggota A+B dengan izin hanya di A');
      assert.equal((await issue(pB, auth.staffA1)).statusCode, 403, 'staf A ke peserta B');
      assert.equal((await issue(pA2, auth.staffB)).statusCode, 403, 'staf B ke peserta A');
    });

    await t.test('pencabutan langsung berlaku pada sesi yang masih aktif', async () => {
      const revoked = await call('DELETE', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth.admin);
      assert.equal(revoked.statusCode, 200, revoked.body);
      assert.equal(revoked.json().active, false);
      const denied = await issue(pA2, auth.staffA1);
      assert.equal(denied.statusCode, 403, 'sesi yang sama ditolak setelah pencabutan');
      const history = await q(`SELECT revoked_at IS NOT NULL AS revoked, revoked_by FROM public.membership_permissions WHERE membership_id = $1`, [mA1]);
      assert.deepEqual(history, [{ revoked: true, revoked_by: superAdmin }], 'riwayat tetap ada');
      const repeat = await call('DELETE', grantUrl(orgA, mA1, 'travel.certificates.issue'), auth.admin);
      assert.equal(repeat.json().idempotent, true);
      const actions = (await audits()).map(row => row.action);
      assert.equal(actions.filter(a => a === 'travel.membership_permission.revoked').length, 1);
      assert.equal((await events()).at(-1).event_type, 'travel.membership_permission.revoked');
    });

    await t.test('revoke berdiri sendiri: pencabut sertifikat tanpa izin terbit', async () => {
      assert.equal((await call('PUT', grantUrl(orgA, mA2, 'travel.certificates.revoke'), auth.admin)).statusCode, 201);
      assert.equal((await issue(pA2, auth.staffA2)).statusCode, 403);
      const revoke = await app.inject({
        method: 'POST', url: `/travel/certificates/${certificateId}/revoke`, headers: { ...auth.staffA2, 'content-type': 'application/json' },
        payload: JSON.stringify({ reason: 'Uji pencabutan RBAC' })
      });
      assert.ok([200, 204].includes(revoke.statusCode), revoke.body);
    });

    await t.test('daftar anggota menampilkan izin aktif per membership organisasi itu saja', async () => {
      const list = await call('GET', `/control-center/travels/${orgA}/members`, auth.admin);
      assert.equal(list.statusCode, 200);
      const items = list.json().items;
      const codes = Object.fromEntries(items.map(item => [item.membershipId, item.permissions.map(p => p.code)]));
      assert.deepEqual(codes[mA1], []);
      assert.deepEqual(codes[mA2], ['travel.certificates.revoke']);
      assert.deepEqual(codes[mABa], ['travel.certificates.issue']);
      assert.equal(codes[mB], undefined, 'anggota B tidak tampil di A');
      assert.equal((await call('GET', `/control-center/travels/${orgA}/members`, auth.staffA1)).statusCode, 403);
    });

    await t.test('kegagalan audit/outbox membatalkan perubahan izin', async () => {
      const before = await q('SELECT count(*)::int AS n FROM public.membership_permissions');
      const auditsBefore = (await audits()).length;
      await q(`ALTER TABLE public.sync_outbox ADD CONSTRAINT rbac_block CHECK (entity_type <> 'travel_membership_permission') NOT VALID`);
      try {
        const failed = await call('PUT', grantUrl(orgA, mA1, 'travel.partners.read'), auth.admin);
        assert.equal(failed.statusCode, 500);
      } finally {
        await q('ALTER TABLE public.sync_outbox DROP CONSTRAINT rbac_block');
      }
      assert.deepEqual(await q('SELECT count(*)::int AS n FROM public.membership_permissions'), before);
      assert.equal((await audits()).length, auditsBefore, 'audit log ikut dibatalkan');
    });

    await t.test('hak akses database: riwayat izin tidak bisa dihapus', async () => {
      await assert.rejects(q('DELETE FROM public.membership_permissions'), /permission denied|APPEND_ONLY/);
      await assert.rejects(q('TRUNCATE public.membership_permissions'), /permission denied|APPEND_ONLY/);
      const publicGrant = await q(`SELECT has_table_privilege('public', 'public.membership_permissions', 'SELECT') AS allowed`);
      assert.equal(publicGrant[0].allowed, false);
    });
  } finally {
    if (app) await app.close();
    if (pool) await pool.end();
    if (previous.key === undefined) delete process.env.CERTIFICATE_ENCRYPTION_KEY; else process.env.CERTIFICATE_ENCRYPTION_KEY = previous.key;
    if (previous.base === undefined) delete process.env.PUBLIC_CERTIFICATE_BASE_URL; else process.env.PUBLIC_CERTIFICATE_BASE_URL = previous.base;
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.end();
  }
});
