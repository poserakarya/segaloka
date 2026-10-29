import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerTravelerCertificateRoutes } from './certificate-routes.js';

process.env.CERTIFICATE_ENCRYPTION_KEY ??= 'a'.repeat(64);

const participantId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const organizationId = '33333333-3333-4333-8333-333333333333';
const documentId = '44444444-4444-4444-8444-444444444444';
const certificateId = '55555555-5555-4555-8555-555555555555';
const typeId = '66666666-6666-4666-8666-666666666666';
const sessionToken = 'a'.repeat(64);

function makePool({
  allowed = true,
  departed = true,
  existing = false,
  failAudit = false
} = {}) {
  const statements = [];

  const participant = {
    id: participantId,
    full_name: 'Peserta Pengujian',
    departure_status: departed ? 'departed' : 'not_verified',
    departure_verified_at: departed ? new Date() : null,
    booking_status: 'confirmed',
    trip_status: 'departed',
    title: 'Perjalanan Umrah',
    destination: 'Makkah dan Madinah',
    departure_date: '2026-10-01',
    travel_organization_id: organizationId,
    travel_name: 'Travel Pengujian'
  };

  const query = async (sql) => {
    statements.push(sql);

    if (sql.includes('information_schema.columns')) {
      return { rows: [{ available: false }] };
    }

    if (sql.includes('SELECT is_test_data')) {
      return { rows: [{ is_test_data: false }] };
    }

    if (sql.includes('is_test_data') && sql.includes('public.organizations')) {
      return { rows: [{ is_test_data: false }] };
    }

    if (sql.includes('FROM public.travel_booking_participants p')) {
      return { rows: [participant] };
    }

    if (sql.includes('FROM public.memberships m')) {
      return { rows: allowed ? [{ '?column?': 1 }] : [] };
    }

    if (sql.includes('FROM public.traveler_travel_certificates')) {
      return { rows: existing ? [{ id: certificateId }] : [] };
    }

    if (sql.includes('FROM public.document_types')) {
      return { rows: [{ id: typeId }] };
    }

    if (sql.includes('INSERT INTO public.documents')) {
      return {
        rows: [{
          id: documentId,
          document_number: 'SLK-TC-TEST',
          status: 'issued',
          issued_at: new Date()
        }]
      };
    }

    if (sql.includes('INSERT INTO public.traveler_travel_certificates')) {
      return {
        rows: [{
          id: certificateId,
          document_id: documentId,
          created_at: new Date()
        }]
      };
    }

    if (sql.includes('INSERT INTO public.audit_logs') && failAudit) {
      throw new Error('SIMULATED_AUDIT_FAILURE');
    }

    return { rows: [] };
  };

  return {
    statements,
    async query(sql) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: [{
            session_id: '77777777-7777-4777-8777-777777777777',
            user_id: userId,
            expires_at: new Date(Date.now() + 60000)
          }]
        };
      }

      return { rows: [] };
    },
    async connect() {
      return {
        query,
        release() {}
      };
    }
  };
}

async function runScenario(options) {
  const pool = makePool(options);
  const app = Fastify({ logger: false });

  await registerTravelerCertificateRoutes(app, pool);
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: `/travel/participants/${participantId}/certificate`,
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });

    return { response, statements: pool.statements };
  } finally {
    await app.close();
  }
}

test('penerbitan berhasil menyimpan seluruh komponen', async () => {
  const { response, statements } = await runScenario();

  assert.equal(response.statusCode, 201);
  assert.match(response.json().verificationToken, /^[a-f0-9]{64}$/);

  for (const fragment of [
    'INSERT INTO public.documents',
    'INSERT INTO public.document_revisions',
    'INSERT INTO public.traveler_travel_certificates',
    'INSERT INTO public.document_events',
    'INSERT INTO public.audit_logs',
    'COMMIT'
  ]) {
    assert.ok(
      statements.some(sql => sql.includes(fragment)),
      `${fragment} harus dijalankan`
    );
  }

  assert.equal(statements.at(-1), 'COMMIT');
});

test('petugas tanpa izin ditolak', async () => {
  const { response, statements } = await runScenario({
    allowed: false
  });

  assert.equal(response.statusCode, 403);
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});

test('peserta belum berangkat ditolak', async () => {
  const { response, statements } = await runScenario({
    departed: false
  });

  assert.equal(response.statusCode, 409);
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});

test('penerbitan sertifikat ganda ditolak', async () => {
  const { response, statements } = await runScenario({
    existing: true
  });

  assert.equal(response.statusCode, 409);
  assert.equal(
    response.json().code,
    'CERTIFICATE_ALREADY_ISSUED'
  );
  assert.ok(statements.includes('ROLLBACK'));
});

test('kegagalan audit membatalkan transaksi', async () => {
  const { response, statements } = await runScenario({
    failAudit: true
  });

  assert.equal(response.statusCode, 500);
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});
