const E164 = /^\+[1-9][0-9]{7,14}$/;
const ACCOUNT_SID = /^AC[a-f0-9]{32}$/i;
const SERVICE_SID = /^MG[a-f0-9]{32}$/i;
const MESSAGE_SID = /^SM[a-f0-9]{32}$/i;

export function getTwilioSmsConfig(env = process.env) {
  if (env.SEGALOKA_SMS_PROVIDER !== 'twilio') {
    throw new Error('SMS_PROVIDER_DISABLED');
  }

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_SMS_FROM;
  const messagingServiceSid =
    env.TWILIO_SMS_MESSAGING_SERVICE_SID;

  const hasService = Boolean(messagingServiceSid);
  const hasFrom = Boolean(from);

  if (
    !ACCOUNT_SID.test(accountSid || '') ||
    typeof authToken !== 'string' ||
    !authToken.trim() ||
    hasService === hasFrom ||
    (hasService && !SERVICE_SID.test(messagingServiceSid)) ||
    (hasFrom && !E164.test(from))
  ) {
    throw new Error('TWILIO_SMS_CONFIG_INVALID');
  }

  return {
    accountSid,
    authToken,
    ...(hasService ? { messagingServiceSid } : { from })
  };
}

export async function sendTwilioSmsOtp({
  phone,
  code,
  config = getTwilioSmsConfig()
}) {
  if (typeof phone !== 'string' || !E164.test(phone)) {
    throw new Error('SMS_PHONE_INVALID');
  }

  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
    throw new Error('SMS_OTP_INVALID');
  }

  const params = new URLSearchParams({
    To: phone,
    Body: `Kode verifikasi Segaloka: ${code}. Jangan bagikan kode ini kepada siapa pun.`
  });

  if (config.messagingServiceSid) {
    params.set('MessagingServiceSid', config.messagingServiceSid);
  } else {
    params.set('From', config.from);
  }

  const credentials = Buffer.from(
    `${config.accountSid}:${config.authToken}`
  ).toString('base64');

  const url =
    `https://api.twilio.com/2010-04-01/Accounts/` +
    `${config.accountSid}/Messages.json`;

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    const error = new Error('SMS_DELIVERY_UNKNOWN');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('SMS_SEND_REJECTED');
    error.deliveryStatus = 'failed';
    throw error;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error('SMS_RESPONSE_INVALID');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (!MESSAGE_SID.test(data?.sid || '')) {
    const error = new Error('SMS_MESSAGE_SID_INVALID');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (['failed', 'undelivered', 'canceled'].includes(data.status)) {
    const error = new Error('SMS_PROVIDER_REPORTED_FAILURE');
    error.deliveryStatus = 'failed';
    throw error;
  }

  return {
    accepted: true,
    provider: 'twilio',
    channel: 'sms',
    messageId: data.sid,
    deliveryStatus: 'accepted'
  };
}