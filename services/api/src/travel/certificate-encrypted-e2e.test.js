import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import Fastify from 'fastify';
import pg from 'pg';
import { TEST_DATABASE_SKIP, testDatabaseConfig } from '../../test/support/test-database.js';

import {
  registerTravelerCertificateRoutes
} from './certificate-routes.js';

import {
  decryptCertificateToken,
  hashCertificateToken
} from './certificate-token-crypto.js';

const hash = value =>
  createHash('sha256').update(value).digest('hex');

const token = () => randomBytes(32).toString('hex');

const database = testDatabaseConfig();

test('sertifikat terenkripsi: PostgreSQL HTTP E2E', {
  skip: database ? false : TEST_DATABASE_SKIP
}, async () => {
  const client = new pg.Client(database);

  const previousUrl = process.env.PUBLIC_CERTIFICATE_BASE_URL;
  // Kunci enkripsi sementara khusus tes bila tidak disediakan lingkungan
  // (dahulu dibaca dari .env lewat dotenv).
  const previousKey = process.env.CERTIFICATE_ENCRYPTION_KEY;
  if (!/^[0-9a-f]{64}$/i.test(previousKey || '')) {
    process.env.CERTIFICATE_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  }

  process.env.PUBLIC_CERTIFICATE_BASE_URL =
    'http://localhost:4190';

  let app;
  let outerTransaction = false;

  try {
    await client.connect();
    await client.query('BEGIN');
    outerTransaction = true;

    const database = {
      query: (sql, params) => client.query(sql, params),

      connect: async () => ({
        query: async (sql, params) => {
          const command = sql.trim().toUpperCase();

          if (command === 'BEGIN') {
            await client.query('SAVEPOINT certificate_e2e');
            return;
          }

          if (command === 'COMMIT') {
            await client.query(
              'RELEASE SAVEPOINT certificate_e2e'
            );
            return;
          }

          if (command === 'ROLLBACK') {
            await client.query(
              'ROLLBACK TO SAVEPOINT certificate_e2e'
            );
            await client.query(
              'RELEASE SAVEPOINT certificate_e2e'
            );
            return;
          }

          return client.query(sql, params);
        },

        release() {}
      })
    };

    const role = await client.query(
      `SELECT id FROM public.roles
       WHERE code = 'travel' LIMIT 1`
    );

    assert.equal(role.rows.length, 1);

    const operator = await client.query(
      `INSERT INTO public.users
         (email, full_name, status, email_verified_at)
       VALUES ($1, 'Segaloka E2E Operator', 'active', now())
       RETURNING id`,
      [`e2e-operator-${token()}@example.invalid`]
    );

    const traveler = await client.query(
      `INSERT INTO public.users
         (email, full_name, status, email_verified_at)
       VALUES ($1, 'Segaloka E2E Traveler', 'active', now())
       RETURNING id`,
      [`e2e-traveler-${token()}@example.invalid`]
    );

    const stranger = await client.query(
      `INSERT INTO public.users
         (email, full_name, status, email_verified_at)
       VALUES ($1, 'Segaloka E2E Stranger', 'active', now())
       RETURNING id`,
      [`e2e-stranger-${token()}@example.invalid`]
    );

    const operatorId = operator.rows[0].id;
    const travelerId = traveler.rows[0].id;
    const strangerId = stranger.rows[0].id;

    const organization = await client.query(
      `INSERT INTO public.organizations
         (name, organization_type, status)
       VALUES ('SEGALOKA CERTIFICATE E2E', 'travel', 'active')
       RETURNING id`
    );

    const organizationId = organization.rows[0].id;

    const operatorMembership = await client.query(
      `INSERT INTO public.memberships
         (user_id, organization_id, role_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [operatorId, organizationId, role.rows[0].id]
    );

    // Model RBAC: izin terbit melekat pada membership Travel ini dan diberikan
    // oleh Super Admin (bukan role-level, bukan self-grant).
    const grantor = await client.query(
      `INSERT INTO public.users
         (email, full_name, status, email_verified_at)
       VALUES ($1, 'Segaloka E2E Super Admin', 'active', now())
       RETURNING id`,
      [`e2e-admin-${token()}@example.invalid`]
    );

    await client.query(
      `INSERT INTO public.membership_permissions
         (membership_id, permission_id, granted_by)
       SELECT $1, id, $2 FROM public.permissions
       WHERE code IN ('travel.certificates.issue', 'travel.certificates.revoke')`,
      [operatorMembership.rows[0].id, grantor.rows[0].id]
    );

    // Akun Traveler memiliki role global 'traveler' (seperti hasil pendaftaran).
    await client.query(
      `INSERT INTO public.memberships (user_id, organization_id, role_id)
       SELECT u.id, NULL, r.id
       FROM unnest($1::uuid[]) AS u(id)
       JOIN public.roles r ON r.code = 'traveler'`,
      [[travelerId, strangerId]]
    );

    const departure = await client.query(
      `INSERT INTO public.travel_departures
         (travel_organization_id, title, destination,
          departure_date, status)
       VALUES ($1, 'Perjalanan E2E', 'Madinah',
               CURRENT_DATE - 7, 'departed')
       RETURNING id`,
      [organizationId]
    );

    const booking = await client.query(
      `INSERT INTO public.travel_bookings
         (departure_id, booking_user_id,
          booking_number, status)
       VALUES ($1, $2, $3, 'confirmed')
       RETURNING id`,
      [
        departure.rows[0].id,
        travelerId,
        `E2E-${token()}`
      ]
    );

    const participant = await client.query(
      `INSERT INTO public.travel_booking_participants
         (booking_id, user_id, full_name,
          departure_status, departure_verified_by,
          departure_verified_at)
       VALUES ($1, $2, 'Segaloka E2E Traveler',
               'departed', $3, now())
       RETURNING id`,
      [
        booking.rows[0].id,
        travelerId,
        operatorId
      ]
    );

    async function session(userId) {
      const bearer = token();

      const result = await client.query(
        `INSERT INTO public.auth_sessions
           (user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')
         RETURNING id`,
        [userId, hash(token())]
      );

      await client.query(
        `INSERT INTO public.auth_access_tokens
           (session_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '1 hour')`,
        [result.rows[0].id, hash(bearer)]
      );

      return {
        authorization: `Bearer ${bearer}`
      };
    }

    const operatorAuth = await session(operatorId);
    const travelerAuth = await session(travelerId);
    const strangerAuth = await session(strangerId);

    app = Fastify({ logger: false });

    await registerTravelerCertificateRoutes(app, database);
    await app.ready();

    const issued = await app.inject({
      method: 'POST',
      url:
        `/travel/participants/${participant.rows[0].id}` +
        '/certificate',
      headers: operatorAuth
    });

    assert.equal(
      issued.statusCode,
      201,
      `Penerbitan gagal: ${issued.statusCode} ${issued.body}`
    );

    const issuance = issued.json();
    const certificateId = issuance.certificate.id;
    const verificationToken = issuance.verificationToken;

    console.log('PASS: Sertifikat diterbitkan.');

    const stored = await client.query(
      `SELECT
         tc.encrypted_verification_token,
         doc.verification_token_hash
       FROM public.traveler_travel_certificates tc
       JOIN public.documents doc
         ON doc.id = tc.document_id
       WHERE tc.id = $1`,
      [certificateId]
    );

    assert.equal(stored.rows.length, 1);

    const encrypted =
      stored.rows[0].encrypted_verification_token;

    assert.match(
      encrypted,
      /^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]{128}$/
    );

    assert.equal(
      stored.rows[0].verification_token_hash,
      hashCertificateToken(verificationToken)
    );

    assert.equal(
      decryptCertificateToken(
        encrypted,
        stored.rows[0].verification_token_hash
      ),
      verificationToken
    );

    console.log('PASS: Ciphertext dan hash PostgreSQL valid.');

    const verified = await app.inject({
      method: 'GET',
      url: `/certificates/verify/${verificationToken}`
    });

    assert.equal(verified.statusCode, 200);
    assert.equal(verified.json().valid, true);

    console.log('PASS: Verifikasi publik berhasil.');

    const ownedPdf = await app.inject({
      method: 'GET',
      url: `/traveler/certificates/${certificateId}/pdf`,
      headers: travelerAuth
    });

    assert.equal(
      ownedPdf.statusCode,
      200,
      `PDF pemilik gagal: ${ownedPdf.statusCode} ${ownedPdf.body.slice(0, 500)}`
    );

    assert.match(
      ownedPdf.headers['content-type'],
      /application\/pdf/
    );

    assert.equal(
      ownedPdf.rawPayload.subarray(0, 4).toString(),
      '%PDF'
    );

    console.log('PASS: Traveler mengunduh PDF asli.');

    const foreignPdf = await app.inject({
      method: 'GET',
      url: `/traveler/certificates/${certificateId}/pdf`,
      headers: strangerAuth
    });

    assert.equal(foreignPdf.statusCode, 404);

    console.log('PASS: Pengguna lain tidak dapat mengunduh.');

    const revoked = await app.inject({
      method: 'POST',
      url: `/travel/certificates/${certificateId}/revoke`,
      headers: operatorAuth
    });

    assert.equal(
      revoked.statusCode,
      200,
      `Pencabutan gagal: ${revoked.statusCode} ${revoked.body}`
    );

    console.log('PASS: Sertifikat berhasil dicabut.');

    const invalid = await app.inject({
      method: 'GET',
      url: `/certificates/verify/${verificationToken}`
    });

    assert.equal(invalid.statusCode, 200);
    assert.equal(invalid.json().valid, false);

    const revokedPdf = await app.inject({
      method: 'GET',
      url: `/traveler/certificates/${certificateId}/pdf`,
      headers: travelerAuth
    });

    assert.equal(revokedPdf.statusCode, 409);

    console.log('PASS: Sertifikat dicabut tidak valid.');
    console.log('PASS: PDF sertifikat dicabut ditolak.');
  } finally {
    if (app) {
      await app.close();
    }

    if (outerTransaction) {
      await client.query('ROLLBACK');
    }

    await client.end();

    if (previousUrl === undefined) {
      delete process.env.PUBLIC_CERTIFICATE_BASE_URL;
    } else {
      process.env.PUBLIC_CERTIFICATE_BASE_URL = previousUrl;
    }

    if (previousKey === undefined) {
      delete process.env.CERTIFICATE_ENCRYPTION_KEY;
    } else {
      process.env.CERTIFICATE_ENCRYPTION_KEY = previousKey;
    }
  }
});