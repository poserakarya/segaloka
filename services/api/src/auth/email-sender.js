import https from 'node:https';
import { createHash } from 'node:crypto';

const DEFAULT_FROM = 'Segaloka <no-reply@segaloka.com>';
const DEFAULT_VERIFY_URL = 'https://segaloka.com/verifikasi-email';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createVerificationEmail({
  email,
  token,
  fullName = 'Pengguna Segaloka',
  verifyUrl = DEFAULT_VERIFY_URL
}) {
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new TypeError('INVALID_RECIPIENT');
  }

  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    throw new TypeError('INVALID_VERIFICATION_TOKEN');
  }

  const url = new URL(verifyUrl);

  if (url.protocol !== 'https:') {
    throw new Error('VERIFY_URL_MUST_USE_HTTPS');
  }

  url.searchParams.set('token', token);

  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(url.toString());

  return {
    to: email,
    subject: 'Konfirmasi Email Akun Segaloka',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Verifikasi Email Segaloka</h2>
        <p>Halo, ${safeName}.</p>
        <p>Terima kasih telah mendaftar di Segaloka.</p>
        <p>Silakan konfirmasi alamat email Anda:</p>
        <p style="margin:28px 0">
          <a href="${safeUrl}"
             style="background:#1769aa;color:white;padding:14px 24px;
                    text-decoration:none;border-radius:8px">
            Verifikasi Email
          </a>
        </p>
        <p>Tautan ini berlaku selama 15 menit.</p>
        <p>Jika Anda tidak mendaftar, abaikan email ini.</p>
        <hr>
        <p style="color:#777;font-size:12px">
          Email otomatis dari Segaloka.
        </p>
      </div>
    `,
    text: [
      `Halo, ${fullName}.`,
      'Silakan verifikasi email Segaloka Anda:',
      url.toString(),
      'Tautan berlaku selama 15 menit.',
      'Jika Anda tidak mendaftar, abaikan email ini.'
    ].join('\n\n')
  };
}

export async function sendVerificationEmail({
  email,
  token,
  fullName,
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
  verifyUrl = process.env.EMAIL_VERIFY_URL || DEFAULT_VERIFY_URL
}) {
  if (
    typeof apiKey !== 'string' ||
    !apiKey.startsWith('re_')
  ) {
    throw new Error('RESEND_NOT_CONFIGURED');
  }

  const message = createVerificationEmail({
    email,
    token,
    fullName,
    verifyUrl
  });

  const idempotencyKey = 'segaloka-email-' +
    createHash('sha256').update(token).digest('hex');

  const payload = JSON.stringify({
    from,
    ...message
  });

  const messageId = await new Promise((resolve, reject) => {
    const request = https.request(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        family: 4,
        timeout: 12000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Idempotency-Key': idempotencyKey
        }
      },
      response => {
        let responseBody = '';

        response.setEncoding('utf8');

        response.on('data', chunk => {
          responseBody += chunk;

          if (responseBody.length > 65536) {
            request.destroy(
              new Error('EMAIL_RESPONSE_TOO_LARGE')
            );
          }
        });

        response.on('end', () => {
          let parsed;

          try {
            parsed = JSON.parse(responseBody);
          } catch {
            reject(new Error('EMAIL_INVALID_RESPONSE'));
            return;
          }

          if (
            response.statusCode >= 200 &&
            response.statusCode < 300 &&
            typeof parsed.id === 'string' &&
            parsed.id.length > 0
          ) {
            resolve(parsed.id);
          } else {
            reject(new Error('EMAIL_DELIVERY_FAILED'));
          }
        });

        response.on('error', reject);
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('EMAIL_SEND_TIMEOUT'));
    });

    request.on('error', reject);
    request.end(payload);
  });
  return {
    accepted: true,
    messageId
  };
}