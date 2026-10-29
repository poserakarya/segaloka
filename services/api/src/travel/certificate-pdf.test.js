import test from 'node:test';
import assert from 'node:assert/strict';
import { createCertificatePdf } from './certificate-pdf.js';

const certificate = {
  participantName: 'Peserta Pengujian Segaloka',
  travelName: 'Travel Pengujian Segaloka',
  tripTitle: 'Perjalanan Umrah',
  destination: 'Makkah dan Madinah',
  departureDate: '2026-10-01',
  certificateNumber: 'SLK-TC-TEST001'
};

test('PDF sertifikat berhasil dibuat', async () => {
  const pdf = await createCertificatePdf(
    certificate,
    'https://example.com/certificates/verify/' + 'a'.repeat(64)
  );

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 1000);
});

test('PDF sertifikat berbeda jika peserta berbeda', async () => {
  const url =
    'https://example.com/certificates/verify/' + 'b'.repeat(64);

  const first = await createCertificatePdf(certificate, url);

  const second = await createCertificatePdf({
    ...certificate,
    participantName: 'Peserta Lain'
  }, url);

  assert.notDeepEqual(first, second);
});

test('PDF menolak URL QR yang tidak valid', async () => {
  await assert.rejects(
    createCertificatePdf(certificate, ''),
    /.+/
  );
});