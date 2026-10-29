import { readFile } from 'node:fs/promises';
import { Resend } from 'resend';

const DEFAULT_FROM = 'Segaloka <no-reply@segaloka.com>';
const LOGO_CID = 'segaloka-logo@segaloka.com';
const LOGO_PATH = new URL('../../../../assets/segaloka-logo.png', import.meta.url);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const OTP_TRANSLATIONS = {
  ID: {
    title: 'Kode OTP Login Anda',
    greeting: 'Halo',
    instruction: 'Gunakan kode berikut untuk melanjutkan login ke akun Segaloka Anda.',
    expires: 'Berlaku selama 5 menit',
    copy: 'Salin keenam angka di atas dan tempelkan pada kolom OTP di halaman login.',
    security: 'Jangan bagikan kode ini kepada siapa pun. Tim Segaloka tidak akan meminta kode OTP Anda.',
    ignore: 'Jika Anda tidak mencoba login, abaikan email ini.',
    footer: 'Email otomatis dari Segaloka. Mohon jangan membalas email ini.'
  },
  EN: {
    title: 'Your Login Verification Code',
    greeting: 'Hello',
    instruction: 'Use this code to continue signing in to your Segaloka account.',
    expires: 'Valid for 5 minutes',
    copy: 'Copy the six digits above and paste them into the verification field.',
    security: 'Never share this code. Segaloka will never ask for your verification code.',
    ignore: 'If you did not attempt to sign in, ignore this email.',
    footer: 'Automated Segaloka email. Please do not reply.'
  },
  AR: {
    title: 'رمز التحقق لتسجيل الدخول',
    greeting: 'مرحبًا',
    instruction: 'استخدم هذا الرمز لمتابعة تسجيل الدخول إلى حسابك في سيجالوكا.',
    expires: 'صالح لمدة 5 دقائق',
    copy: 'انسخ الأرقام الستة وألصقها في حقل التحقق.',
    security: 'لا تشارك هذا الرمز مع أي شخص. لن يطلب فريق سيجالوكا رمز التحقق منك.',
    ignore: 'إذا لم تحاول تسجيل الدخول، فتجاهل هذه الرسالة.',
    footer: 'هذه رسالة آلية من سيجالوكا. يرجى عدم الرد عليها.'
  }
};

export function createLoginOtpEmail({
  email,
  code,
  fullName,
  language = 'ID'
}) {
  if (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new TypeError('INVALID_RECIPIENT');
  }

  if (
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    throw new TypeError('INVALID_LOGIN_OTP');
  }

  const locale = ['ID', 'EN', 'AR'].includes(language)
    ? language
    : 'ID';

  const t = OTP_TRANSLATIONS[locale];
  const rtl = locale === 'AR';

  const name = typeof fullName === 'string'
    ? fullName.trim()
    : '';

  const greetingHtml = name
    ? `${t.greeting}, ${escapeHtml(name)}.`
    : `${t.greeting},`;

  const greetingText = name
    ? `${t.greeting}, ${name}.`
    : `${t.greeting},`;

  return {
    to: email,
    subject: `${t.title} - Segaloka`,
    html: `
<!doctype html>
<html lang="${locale.toLowerCase()}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t.title}</title>
</head>
<body style="margin:0;padding:0;background:#f2f6fc;">
  <table role="presentation" cellpadding="0" cellspacing="0"
    width="100%" style="background:#f2f6fc;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0"
          width="100%" style="max-width:560px;background:#ffffff;
          border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:#ffffff;padding:24px 32px;">
              <img src="cid:segaloka-logo@segaloka.com"
                alt="Segaloka"
                width="180"
                style="display:block;max-width:100%;
                height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:Arial,sans-serif;
              color:#172b4d;text-align:${rtl ? 'right' : 'left'};">
              <h1 style="font-size:24px;line-height:1.3;
                margin:0 0 20px;">
                ${t.title}
              </h1>
              <p style="font-size:15px;line-height:1.7;">
                ${greetingHtml}
              </p>
              <p style="font-size:15px;line-height:1.7;">
                ${t.instruction}
              </p>
              <div style="background:#eef5ff;
                border:1px solid #cbdffc;
                border-radius:12px;
                padding:24px 12px;
                text-align:center;margin:24px 0;">
                <div dir="ltr" style="font-size:36px;
                  font-weight:700;letter-spacing:3px;
                  color:#0755d9;font-family:Arial,sans-serif;
                  user-select:text;">
                  ${code}
                </div>
                <div style="font-size:13px;color:#52647e;
                  margin-top:12px;">
                  ${t.expires}
                </div>
              </div>
              <p style="font-size:14px;line-height:1.7;">
                ${t.copy}
              </p>
              <p style="font-size:14px;line-height:1.7;">
                ${t.security}
              </p>
              <p style="font-size:14px;line-height:1.7;">
                ${t.ignore}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafd;padding:24px 32px;
              text-align:center;font-family:Arial,sans-serif;
              font-size:12px;line-height:1.7;color:#69788f;">
              ${t.footer}
              <div style="margin-top:8px;">
                &copy; Segaloka.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: [
      greetingText,
      t.instruction,
      `${t.title}: ${code}`,
      t.expires,
      t.copy,
      t.security,
      t.ignore,
      t.footer
    ].join('\n\n')
  };
}
export async function sendLoginOtpEmail({
  email,
  code,
  fullName,
  language = 'ID',
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM
}) {
  if (
    typeof apiKey !== 'string' ||
    !apiKey.startsWith('re_')
  ) {
    throw new Error('RESEND_NOT_CONFIGURED');
  }

  const message = createLoginOtpEmail({
    email,
    code,
    fullName,
    language
  });

  const logo = await readFile(LOGO_PATH);
  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from,
    ...message,
    attachments: [{
      filename: 'segaloka-logo.png',
      content: logo.toString('base64'),
      contentId: LOGO_CID,
      contentType: 'image/png',
      disposition: 'inline'
    }]
  });

  if (error) {
    const deliveryError = new Error('OTP_EMAIL_DELIVERY_FAILED');
    deliveryError.deliveryStatus = 'failed';
    throw deliveryError;
  }

  if (!data?.id) {
    const deliveryError = new Error('OTP_EMAIL_DELIVERY_UNKNOWN');
    deliveryError.deliveryStatus = 'unknown';
    throw deliveryError;
  }

  return {
    accepted: true,
    messageId: data.id
  };
}