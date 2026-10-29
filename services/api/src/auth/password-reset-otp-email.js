import { Resend } from 'resend';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function createPasswordResetOtpEmail({
  fullName = 'Pengguna Segaloka',
  code
}) {
  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
    throw new TypeError('INVALID_OTP_CODE');
  }

  const name = escapeHtml(fullName || 'Pengguna Segaloka');

  const subject = 'Kode Verifikasi Reset Kata Sandi Segaloka';

  const html = `
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden">
    <div style="background:#123c70;padding:24px;text-align:center">
      <div style="color:#fff;font-size:26px;font-weight:700">Segaloka</div>
    </div>
    <div style="padding:32px 28px">
      <h1 style="font-size:22px;margin:0 0 18px">Verifikasi Reset Kata Sandi</h1>
      <p>Halo ${name},</p>
      <p>Gunakan kode berikut untuk melanjutkan proses penggantian kata sandi akun Segaloka Anda.</p>
      <div style="margin:28px 0;padding:20px;background:#f0f5fb;border-radius:12px;text-align:center">
        <span style="font-size:36px;letter-spacing:9px;font-weight:700;color:#123c70">${code}</span>
      </div>
      <p><strong>Kode berlaku selama 5 menit.</strong></p>
      <p>Jangan bagikan kode ini kepada siapa pun, termasuk pihak yang mengaku sebagai petugas Segaloka.</p>
      <p>Jika Anda tidak meminta reset kata sandi, abaikan email ini.</p>
    </div>
    <div style="padding:20px;text-align:center;background:#f8fafc;color:#64748b;font-size:12px">
      © Segaloka · Email keamanan akun otomatis
    </div>
  </div>
</body>
</html>`;

  const text = [
    'Segaloka - Verifikasi Reset Kata Sandi',
    '',
    `Halo ${fullName || 'Pengguna Segaloka'},`,
    '',
    `Kode OTP Anda: ${code}`,
    'Berlaku selama 5 menit.',
    '',
    'Jangan bagikan kode ini kepada siapa pun.',
    'Jika tidak meminta reset kata sandi, abaikan email ini.'
  ].join('\n');

  return { subject, html, text };
}

export async function sendPasswordResetOtpEmail({
  email,
  fullName,
  code
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !apiKey.startsWith('re_') || !from) {
    throw new Error('RESEND_NOT_CONFIGURED');
  }

  const content = createPasswordResetOtpEmail({ fullName, code });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [email],
    subject: content.subject,
    html: content.html,
    text: content.text
  });

  if (error || !data?.id) {
    throw new Error('OTP_EMAIL_SEND_FAILED');
  }

  return { accepted: true, messageId: data.id };
}