import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  registerTravelerCertificateRoutes
} from './certificate-routes.js';

const token = 'a'.repeat(64);

function makeRow(overrides = {}) {
  return {
    document_number: 'SLK-TC-TEST001',
    document_status: 'issued',
    issued_at: '2026-10-09T00:00:00Z',
    full_name: 'Peserta Pengujian',
    departure_status: 'departed',
    departure_verified_at: '2026-10-01T00:00:00Z',
    booking_status: 'confirmed',
    trip_status: 'departed',
    title: 'Perjalanan Umrah',
    destination: 'Makkah dan Madinah',
    departure_date: '2026-10-01',
    travel_name: 'Travel Pengujian',
    travel_status: 'active',
    ...overrides
  };
}

async function setup(row) {
  const app = Fastify({ logger: false });

  const pool = {
    query: async () => ({
      rows: row ? [row] : []
    }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release() {}
    })
  };

  await registerTravelerCertificateRoutes(app, pool);
  await app.ready();

  return app;
}

test('sertifikat valid menghasilkan PDF asli', async () => {
  const previous = process.env.PUBLIC_CERTIFICATE_BASE_URL;
  process.env.PUBLIC_CERTIFICATE_BASE_URL =
    'https://certificates.segaloka.com';

  const app = await setup(makeRow());

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/certificates/${token}/pdf`
    });

    assert.equal(response.statusCode, 200);
    assert.match(
      response.headers['content-type'],
      /application\/pdf/
    );
    assert.match(
      response.headers['content-disposition'],
      /attachment/
    );
    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(
      response.rawPayload.subarray(0, 5).toString(),
      '%PDF-'
    );
    assert.ok(response.rawPayload.length > 1000);
  } finally {
    await app.close();

    if (previous === undefined) {
      delete process.env.PUBLIC_CERTIFICATE_BASE_URL;
    } else {
      process.env.PUBLIC_CERTIFICATE_BASE_URL = previous;
    }
  }
});

test('sertifikat dicabut tidak dapat diunduh', async () => {
  const previous = process.env.PUBLIC_CERTIFICATE_BASE_URL;
  process.env.PUBLIC_CERTIFICATE_BASE_URL =
    'https://certificates.segaloka.com';

  const app = await setup(makeRow({
    document_status: 'void'
  }));

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/certificates/${token}/pdf`
    });

    assert.equal(response.statusCode, 409);
    assert.equal(
      response.json().code,
      'CERTIFICATE_NOT_CURRENTLY_VALID'
    );
  } finally {
    await app.close();

    if (previous === undefined) {
      delete process.env.PUBLIC_CERTIFICATE_BASE_URL;
    } else {
      process.env.PUBLIC_CERTIFICATE_BASE_URL = previous;
    }
  }
});

test('peserta belum berangkat tidak memperoleh PDF', async () => {
  const previous = process.env.PUBLIC_CERTIFICATE_BASE_URL;
  process.env.PUBLIC_CERTIFICATE_BASE_URL =
    'https://certificates.segaloka.com';

  const app = await setup(makeRow({
    departure_status: 'not_verified'
  }));

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/certificates/${token}/pdf`
    });

    assert.equal(response.statusCode, 409);
  } finally {
    await app.close();

    if (previous === undefined) {
      delete process.env.PUBLIC_CERTIFICATE_BASE_URL;
    } else {
      process.env.PUBLIC_CERTIFICATE_BASE_URL = previous;
    }
  }
});

test('verifikasi publik tidak mengembalikan data sensitif', async () => {
  const app = await setup(makeRow());

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/certificates/verify/${token}`
    });

    assert.equal(response.statusCode, 200);

    const data = response.json();

    assert.equal(data.valid, true);
    assert.equal(data.participantName, 'Peserta Pengujian');
    assert.equal(data.poweredBy, 'Segaloka');

    for (const field of [
      'passportNumber',
      'dateOfBirth',
      'paymentAmount',
      'email',
      'phone'
    ]) {
      assert.equal(
        Object.hasOwn(data, field),
        false,
        `${field} tidak boleh dipublikasikan`
      );
    }
  } finally {
    await app.close();
  }
});

test('sertifikat tidak ditemukan ditolak', async () => {
  const app = await setup(null);

  try {
    const response = await app.inject({
      method: 'GET',
      url: `/certificates/verify/${token}`
    });

    assert.equal(response.statusCode, 404);
  } finally {
    await app.close();
  }
});