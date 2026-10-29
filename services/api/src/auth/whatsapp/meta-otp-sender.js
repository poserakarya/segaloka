import { getWhatsAppProviderConfig } from './provider-config.js';

function normalizePhone(phone) {
  if (
    typeof phone !== 'string' ||
    !/^\+[1-9][0-9]{7,14}$/.test(phone)
  ) {
    throw new Error('WA_PHONE_INVALID');
  }

  return phone.slice(1);
}

export async function sendMetaWhatsAppOtp({
  phone,
  code,
  config = getWhatsAppProviderConfig()
}) {
  if (!config.enabled || config.provider !== 'meta') {
    throw new Error('META_WA_NOT_ENABLED');
  }

  if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
    throw new Error('WA_OTP_INVALID');
  }

  const recipient = normalizePhone(phone);

  const url =
    `https://graph.facebook.com/${config.graphVersion}/` +
    `${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'template',
    template: {
      name: config.templateName,
      language: {
        code: config.templateLanguage
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: code
            }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: code
            }
          ]
        }
      ]
    }
  };

  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    const error = new Error('META_WA_DELIVERY_UNKNOWN');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  if (!response.ok) {
    const error = new Error('META_WA_SEND_REJECTED');
    error.deliveryStatus = 'failed';
    throw error;
  }

  let data;

  try {
    data = await response.json();
  } catch {
    const error = new Error('META_WA_RESPONSE_INVALID');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  const messageId = data?.messages?.[0]?.id;

  if (
    typeof messageId !== 'string' ||
    !messageId.startsWith('wamid.')
  ) {
    const error = new Error('META_WA_MESSAGE_ID_MISSING');
    error.deliveryStatus = 'unknown';
    throw error;
  }

  return {
    accepted: true,
    provider: 'meta',
    messageId,
    deliveryStatus: 'accepted'
  };
}