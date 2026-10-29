import { randomBytes } from 'node:crypto';
import { createPasswordResetOtp } from './password-reset-otp-service.js';
import { sendPasswordResetOtpEmail } from './password-reset-otp-email.js';

export async function requestPasswordResetAndSend(
  pool,
  email,
  {
    request = createPasswordResetOtp,
    send = sendPasswordResetOtpEmail
  } = {}
) {
  const resetData = await request(pool, email);

  // Challenge palsu menjaga bentuk respons tetap sama
  // untuk email tidak terdaftar atau yang terkena pembatasan.
  let challengeId = randomBytes(16).toString('hex');

  if (resetData) {
    try {
      await send({
        email: resetData.email,
        fullName: resetData.fullName,
        code: resetData.code
      });

      challengeId = resetData.challengeId;
    } catch {
      // Jangan ungkap keberadaan akun atau detail pengiriman.
    }
  }

  return {
    accepted: true,
    challengeId,
    expiresInMinutes: 5,
    message: 'Jika akun memenuhi syarat, kode verifikasi akan dikirim.'
  };
}