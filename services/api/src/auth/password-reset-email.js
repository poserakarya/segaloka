import { Resend } from 'resend';

const DEFAULT_URL = 'https://segaloka.com/reset-kata-sandi';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function createPasswordResetEmail({
  email,
  token,
  fullName = 'Pengguna Segaloka',
  resetUrl = DEFAULT_URL
}) {
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new TypeError('INVALID_EMAIL');
  }

  if (
    typeof token !== 'string' ||
    !/^[0-9a-f]{64}$/.test(token)
  ) {
    throw new TypeError('INVALID_RESET_TOKEN');
  }

  const url = new URL(resetUrl);

  if (url.protocol !== 'https:') {
    throw new TypeError('HTTPS_REQUIRED');
  }

  url.searchParams.set('token', token);

  const safeName = escapeHtml(fullName);
  const safeUrl = escapeHtml(url.toString());

  return {
    to: email,
    subject: 'Reset Kata Sandi Segaloka',
    text: [
      `Halo ${fullName},`,
      '',
      'Kami menerima permintaan reset kata sandi Segaloka.',
      'Gunakan tautan berikut untuk membuat kata sandi baru:',
      url.toString(),
      '',
      'Tautan berlaku selama 15 menit dan hanya dapat digunakan sekali.',
      'Jika Anda tidak meminta reset, abaikan email ini.'
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <h2>Reset Kata Sandi Segaloka</h2>
        <p>Halo ${safeName},</p>
        <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.</p>
        <p>
          <a href="${safeUrl}"
             style="display:inline-block;padding:12px 20px;
                    background:#163b73;color:#ffffff;
                    text-decoration:none;border-radius:8px">
            Buat Kata Sandi Baru
          </a>
        </p>
        <p>Tautan berlaku selama 15 menit dan hanya dapat digunakan sekali.</p>
        <p>Jika Anda tidak meminta reset, abaikan email ini.</p>
      </div>
    `
  };
}

export async function sendPasswordResetEmail({
  email,
  token,
  fullName,
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM_EMAIL ||
    'Segaloka <no-reply@segaloka.com>',
  resetUrl = process.env.PASSWORD_RESET_URL || DEFAULT_URL
}) {
  if (!apiKey?.startsWith('re_')) {
    throw new Error('RESEND_NOT_CONFIGURED');
  }

  const message = createPasswordResetEmail({
    email,
    token,
    fullName,
    resetUrl
  });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    ...message
  });

  if (error || !data?.id) {
    throw new Error('PASSWORD_RESET_EMAIL_FAILED');
  }

  return {
    accepted: true,
    messageId: data.id
  };
}