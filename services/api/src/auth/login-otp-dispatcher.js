import { sendLoginOtpEmail } from './login-otp-email.js';

import {
  sendWhatsAppLoginOtp
} from './whatsapp/otp-provider-dispatcher.js';

import {
  sendTwilioSmsOtp,
  getTwilioSmsConfig
} from './sms/twilio-sms-otp-sender.js';

import {
  getLoginChannelAvailability
} from './login-channel-availability.js';

export async function dispatchLoginOtp({
  channel,
  destination,
  code,
  fullName = '',
  language = 'ID',
  env = process.env
}) {
  if (!['email', 'whatsapp', 'sms'].includes(channel)) {
    const error = new Error('OTP_CHANNEL_INVALID');
    error.deliveryStatus = 'failed';
    throw error;
  }

  const availability = getLoginChannelAvailability(env);

  if (availability[channel] !== true) {
    const error = new Error('OTP_CHANNEL_UNAVAILABLE');
    error.deliveryStatus = 'failed';
    throw error;
  }

  if (channel === 'email') {
    return sendLoginOtpEmail({
      email: destination,
      code,
      fullName,
      language,
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL ||
        'Segaloka <no-reply@segaloka.com>'
    });
  }

  if (channel === 'whatsapp') {
    return sendWhatsAppLoginOtp({
      phone: destination,
      code,
      env
    });
  }

  return sendTwilioSmsOtp({
    phone: destination,
    code,
    config: getTwilioSmsConfig(env)
  });
}