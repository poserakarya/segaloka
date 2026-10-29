import { Resend } from 'resend';

const TRANSLATIONS = {
  ID: {
    enable: 'Aktivasi Verifikasi Dua Faktor',
    disable: 'Nonaktifkan Verifikasi Dua Faktor',
    greeting: 'Halo',
    instruction: 'Gunakan kode berikut untuk mengonfirmasi perubahan keamanan akun Segaloka Anda.',
    expiry: 'Kode berlaku selama 5 menit.',
    warning: 'Jangan bagikan kode ini kepada siapa pun.',
    ignore: 'Jika Anda tidak meminta perubahan ini, abaikan email dan segera periksa keamanan akun Anda.'
  },
  EN: {
    enable: 'Enable Two-Factor Authentication',
    disable: 'Disable Two-Factor Authentication',
    greeting: 'Hello',
    instruction: 'Use this code to confirm a security settings change to your Segaloka account.',
    expiry: 'This code expires in 5 minutes.',
    warning: 'Never share this code with anyone.',
    ignore: 'If you did not request this change, ignore this email and review your account security.'
  },
  AR: {
    enable: 'تفعيل المصادقة الثنائية',
    disable: 'تعطيل المصادقة الثنائية',
    greeting: 'مرحبًا',
    instruction: 'استخدم هذا الرمز لتأكيد تغيير إعدادات الأمان في حساب سيجالوكا.',
    expiry: 'الرمز صالح لمدة 5 دقائق.',
    warning: 'لا تشارك هذا الرمز مع أي شخص.',
    ignore: 'إذا لم تطلب هذا التغيير، فتجاهل الرسالة وراجع أمان حسابك.'
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createSecurityOtpEmail({
  code,
  purpose,
  fullName = '',
  language = 'ID'
}) {
  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
    throw new TypeError('INVALID_OTP_CODE');
  }

  if (!['enable_2fa', 'disable_2fa'].includes(purpose)) {
    throw new TypeError('INVALID_SECURITY_PURPOSE');
  }

  const locale = TRANSLATIONS[language] ? language : 'ID';
  const t = TRANSLATIONS[locale];
  const rtl = locale === 'AR';
  const title = purpose === 'enable_2fa' ? t.enable : t.disable;
  const name = escapeHtml(fullName);

  const html = `
<!doctype html>
<html lang="${locale.toLowerCase()}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;background:#f3f6fb;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background:#fff;border-radius:16px">
        <tr><td style="padding:28px;color:#0755d9;font-size:26px;font-weight:bold">
          Segaloka
        </td></tr>
        <tr><td style="padding:12px 28px 32px;color:#172b4d">
          <h1 style="font-size:23px">${title}</h1>
          <p>${t.greeting}${name ? `, ${name}` : ''}.</p>
          <p>${t.instruction}</p>
          <p><strong>${title}</strong></p>
          <div dir="ltr" style="background:#eef5ff;border-radius:12px;
            padding:24px;text-align:center;font-size:36px;
            font-weight:bold;letter-spacing:6px;color:#0755d9">
            ${code}
          </div>
          <p>${t.expiry}</p>
          <p>${t.warning}</p>
          <p>${t.ignore}</p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;
          background:#f8fafd;color:#69788f;font-size:12px">
          Segaloka — Account Security
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    title,
    `${t.greeting}${fullName ? `, ${fullName}` : ''}.`,
    t.instruction,
    `${title}: ${code}`,
    t.expiry,
    t.warning,
    t.ignore
  ].join('\n\n');

  return {
    subject: `${title} - Segaloka`,
    html,
    text
  };
}

export async function sendSecurityOtpEmail({
  email,
  code,
  purpose,
  fullName,
  language = 'ID'
}) {
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new TypeError('INVALID_RECIPIENT');
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ||
    'Segaloka <no-reply@segaloka.com>';

  if (!apiKey || !apiKey.startsWith('re_')) {
    throw new Error('RESEND_NOT_CONFIGURED');
  }

  const message = createSecurityOtpEmail({
    code,
    purpose,
    fullName,
    language
  });

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    to: [email],
    ...message
  });

  if (error || !data?.id) {
    throw new Error('SECURITY_OTP_DELIVERY_FAILED');
  }

  return {
    accepted: true,
    messageId: data.id
  };
}
