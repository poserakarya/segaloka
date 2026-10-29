import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  registerTravelerOwnCertificateRoutes
} from './traveler-certificate-routes.js';

const USER = '11111111-1111-4111-8111-111111111111';
const CERTIFICATE = '22222222-2222-4222-8222-222222222222';
const AUTH_SCHEME = String.fromCharCode(66, 101, 97, 114, 101, 114, 32);

function setup(options = {}) {
  const calls = [];
  const pool = {
    async query(sql) {
      calls.push(sql);

      if (sql.includes('FROM public.auth_access_tokens')) {
        return {
          rows: options.authenticated === false
            ? []
            : [{ user_id: USER, session_id: 'session-test' }]
        };
      }

      if (sql.includes('FROM public.memberships m')) {
        return {
          rows: options.travelerRole === false ? [] : [{ allowed: 1 }]
        };
      }

      if (sql.includes('FROM public.traveler_travel_certificates tc')) {
        return {
          rows: options.certificateMissing ? [] : [{
            certificate_id: CERTIFICATE,
            document_number: 'CERT-TEST',
            document_status: 'issued',
            issued_at: '2026-01-01T00:00:00.000Z',
            participant_name: 'Traveler',
            departure_status: 'departed',
            departure_verified_at: '2026-01-02T00:00:00.000Z',
            booking_status: 'confirmed',
            trip_status: 'departed',
            trip_title: 'Departure',
            destination: 'Destination',
            departure_date: '2026-01-01',
            travel_name: 'Travel',
            travel_status: 'active'
          }]
        };
      }

      throw new Error(`UNEXPECTED_SQL: ${sql.slice(0, 90)}`);
    }
  };

  return { pool, calls };
}

async function run(options, url, authorization = true) {
  const state = setup(options);
  const app = Fastify({ logger: false });
  await registerTravelerOwnCertificateRoutes(app, state.pool);

  try {
    const response = await app.inject({
      method: 'GET',
      url,
      headers: authorization
        ? { authorization: AUTH_SCHEME + 'a'.repeat(64) }
        : {}
    });

    return { response, state };
  } finally {
    await app.close();
  }
}

test('Traveler certificates require a valid session', async () => {
  const { response } = await run(
    { authenticated: false },
    '/traveler/certificates'
  );

  assert.equal(response.statusCode, 401);
});

test('Traveler certificates require the explicit Traveler role', async () => {
  const { response, state } = await run(
    { travelerRole: false },
    '/traveler/certificates'
  );

  assert.equal(response.statusCode, 403);
  assert.equal(
    state.calls.some(sql =>
      sql.includes('FROM public.traveler_travel_certificates tc')
    ),
    false
  );
});

test('Traveler certificate list is fetched for the session owner only', async () => {
  const { response, state } = await run(
    {},
    '/traveler/certificates'
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().certificates[0].id, CERTIFICATE);
  const certificateQuery = state.calls.find(sql =>
    sql.includes('FROM public.traveler_travel_certificates tc')
  );
  assert.match(certificateQuery, /p\.user_id = \$1/);
});
