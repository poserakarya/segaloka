import { getWhatsAppProviderConfig } from './provider-config.js';
import { sendMetaWhatsAppOtp } from './meta-otp-sender.js';
import { sendTwilioWhatsAppOtp, getTwilioConfig } from './twilio-otp-sender.js';

const senders = Object.freeze({
  meta: sendMetaWhatsAppOtp,
  twilio: sendTwilioWhatsAppOtp
});

export function getWhatsAppOtpAvailability(
  env = process.env
) {
  const selected = env.SEGALOKA_WA_PROVIDER || 'disabled';

  if (selected === 'disabled') {
    return {
      available: false,
      provider: 'disabled',
      reason: 'WHATSAPP_DISABLED'
    };
  }

  if (selected === 'twilio') {
    const configured =
      /^AC[a-f0-9]{32}$/i.test(env.TWILIO_ACCOUNT_SID || '') &&
      Boolean(env.TWILIO_AUTH_TOKEN) &&
      /^whatsapp:\+[1-9][0-9]{7,14}$/.test(
        env.TWILIO_WHATSAPP_FROM || ''
      ) &&
      /^HX[a-f0-9]{32}$/i.test(env.TWILIO_CONTENT_SID || '');

    return {
      available: configured,
      provider: 'twilio',
      reason: configured ? null : 'TWILIO_CONFIG_INCOMPLETE'
    };
  }

  if (selected === 'meta') {
    const config = getWhatsAppProviderConfig(env);

    return {
      available: config.enabled === true,
      provider: 'meta',
      reason: config.enabled ? null : 'META_CONFIG_INCOMPLETE'
    };
  }

  return {
    available: false,
    provider: selected,
    reason: 'WHATSAPP_PROVIDER_UNSUPPORTED'
  };
}

export async function sendWhatsAppLoginOtp({
  phone,
  code,
  env = process.env
}) {
  const availability = getWhatsAppOtpAvailability(env);

  if (!availability.available) {
    const error = new Error(
      availability.reason || 'WHATSAPP_UNAVAILABLE'
    );
    error.deliveryStatus = 'failed';
    throw error;
  }

  const provider = availability.provider;
  const sender = senders[provider];

  if (!sender) {
    throw new Error('WHATSAPP_PROVIDER_UNSUPPORTED');
  }

  // Exactly one provider. No automatic fallback.
  if (provider === 'meta') {
    return sender({
      phone,
      code,
      config: getWhatsAppProviderConfig(env)
    });
  }

  // Twilio sender reads its own environment config.
  // Do not pass credentials to clients or log them.
  return sender({ phone, code, config: getTwilioConfig(env) });
}