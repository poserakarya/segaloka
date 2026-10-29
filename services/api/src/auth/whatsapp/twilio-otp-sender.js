function validatePhone(phone) {
  if (
    typeof phone !== 'string' ||
    !/^\+[1-9][0-9]{7,14}$/.test(phone)
  ) {
    throw new Error('TWILIO_PHONE_INVALID');
  }

  return `whatsapp:${phone}`;
}

export function getTwilioConfig(env = process.env) {
  if (env.SEGALOKA_WA_PROVIDER !== 'twilio') {
    throw new Error('TWILIO_NOT_ENABLED');
  }

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_WHATSAPP_FROM;
  const contentSid = env.TWILIO_CONTENT_SID;

  if (
    !/^AC[a-f0-9]{32}$/i.test(accountSid || '') ||
    !authToken ||
    !/^whatsapp:\+[1-9][0-9]{7,14}$/.test(from || '') ||
    !/^HX[a-f0-9]{32}$/i.test(contentSid || '')
  ) {
    throw new Error('TWILIO_CONFIG_INCOMPLETE');
  }

  return {
    accountSid,
    authToken,
    from,
    contentSid
  };
}

export async function sendTwilioWhatsAppOtp({
  phone,
  code,
  config = getTwilioConfig()
}) {
  if (
    typeof code !== 'string' ||
    !/^[0-9]{6}$/.test(code)
  ) {
    throw new Error('TWILIO_OTP_INVALID');
  }

  const to = validatePhone(phone);

  const body = new URLSearchParams({
    To: to,
    From: config.from,
    ContentSid: config.contentSid,
    ContentVariables: JSON.stringify({
      '1': code
    })
  });

  const credentials = Buffer.from(
    `${config.accountSid}:${config.authToken}`
  ).toString('base64');

  const url =
    'https://api.twilio.com/2010-04-01/Accounts/' +
    `${config.accountSid}/Messages.json`;

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    const error = new Error('TWILIO_DELIVERY_UNKNOWN');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('TWILIO_SEND_REJECTED');
    error.deliveryStatus = 'failed';
    throw error;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error('TWILIO_RESPONSE_INVALID');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (
    typeof data?.sid !== 'string' ||
    !/^SM[a-f0-9]{32}$/i.test(data.sid)
  ) {
    const error = new Error('TWILIO_MESSAGE_SID_INVALID');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  return {
    accepted: true,
    provider: 'twilio',
    messageId: data.sid,
    deliveryStatus: 'accepted'
  };
}