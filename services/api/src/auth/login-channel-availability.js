import {
  getWhatsAppOtpAvailability
} from './whatsapp/otp-provider-dispatcher.js';

import {
  getTwilioSmsConfig
} from './sms/twilio-sms-otp-sender.js';

export function getLoginChannelAvailability(env = process.env) {
  let whatsapp = false;
  let sms = false;

  try {
    whatsapp = getWhatsAppOtpAvailability(env).available === true;
  } catch {
    whatsapp = false;
  }

  try {
    getTwilioSmsConfig(env);
    sms = true;
  } catch {
    sms = false;
  }

  const email =
    typeof env.RESEND_API_KEY === 'string' &&
    env.RESEND_API_KEY.startsWith('re_');

  return {
    authenticator: true,
    email,
    whatsapp,
    sms
  };
}

export function filterAvailableLoginChannels(
  verifiedMethods,
  availability
) {
  const allowed = ['authenticator', 'email', 'whatsapp', 'sms'];

  return allowed.filter(channel =>
    Array.isArray(verifiedMethods) &&
    verifiedMethods.includes(channel) &&
    availability?.[channel] === true
  );
}