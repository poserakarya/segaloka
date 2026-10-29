import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { registerCertificateRevokeRoutes } from './certificate-revoke-routes.js';

const certificateId = '11111111-1111-4111-8111-111111111111';
const documentId = '22222222-2222-4222-8222-222222222222';
const organizationId = '33333333-3333-4333-8333-333333333333';
const userId = '44444444-4444-4444-8444-444444444444';
const sessionToken = 'a'.repeat(64);

function makePool({
  allowed = true,
  status = 'issued',
  found = true,
  failAudit = false
} = {}) {
  const statements = [];

  const client = {
    async query(sql) {
      statements.push(sql);

      if (sql.includes('FROM public.traveler_travel_certificates tc')) {
        return {
          rows: found ? [{
            certificate_id: certificateId,
            document_id: documentId,
            organization_id: organizationId,
            document_status: status
          }] : []
        };
      }

      if (sql.includes('FROM public.memberships m')) {
        return {
          rows: allowed ? [{ allowed: 1 }] : []
        };
      }

      if (sql.includes('INSERT INTO public.audit_logs') && failAudit) {
        throw new Error('SIMULATED_AUDIT_FAILURE');
      }

      return { rows: [] };
    },
    release() {}
  };

  return {
    statements,
    async query(sql) {
      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: [{
            session_id: '55555555-5555-4555-8555-555555555555',
            user_id: userId,
            expires_at: new Date(Date.now() + 60000)
          }]
        };
      }

      return { rows: [] };
    },
    async connect() {
      return client;
    }
  };
}

async function runScenario(options) {
  const pool = makePool(options);
  const app = Fastify({ logger: false });

  await registerCertificateRevokeRoutes(app, pool);
  await app.ready();

  try {
    const response = await app.inject({
      method: 'POST',
      url: `/travel/certificates/${certificateId}/revoke`,
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });

    return {
      response,
      statements: pool.statements
    };
  } finally {
    await app.close();
  }
}

test('pencabutan berhasil mengubah dokumen dan mencatat audit', async () => {
  const { response, statements } = await runScenario();

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().revoked, true);
  assert.equal(response.json().documentStatus, 'void');

  for (const fragment of [
    "SET status = 'void'",
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

test('petugas tanpa permission pencabutan ditolak', async () => {
  const { response, statements } = await runScenario({
    allowed: false
  });

  assert.equal(response.statusCode, 403);
  assert.equal(
    response.json().code,
    'CERTIFICATE_REVOKE_ACCESS_DENIED'
  );
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});

test('sertifikat sudah dicabut tidak dapat dicabut ulang', async () => {
  const { response, statements } = await runScenario({
    status: 'void'
  });

  assert.equal(response.statusCode, 409);
  assert.equal(
    response.json().code,
    'CERTIFICATE_ALREADY_REVOKED'
  );
  assert.ok(statements.includes('ROLLBACK'));
});

test('sertifikat tidak ditemukan menghasilkan 404', async () => {
  const { response, statements } = await runScenario({
    found: false
  });

  assert.equal(response.statusCode, 404);
  assert.ok(statements.includes('ROLLBACK'));
});

test('kegagalan audit membatalkan pencabutan', async () => {
  const { response, statements } = await runScenario({
    failAudit: true
  });

  assert.equal(response.statusCode, 500);
  assert.ok(statements.includes('ROLLBACK'));
  assert.ok(!statements.includes('COMMIT'));
});