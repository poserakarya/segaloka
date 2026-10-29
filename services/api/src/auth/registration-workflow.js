import { registerPublicUser } from './registration-service.js';
import { sendVerificationEmail } from './email-sender.js';

export async function registerAndSendVerification(
  pool,
  input,
  {
    register = registerPublicUser,
    send = sendVerificationEmail
  } = {}
) {
  const registered = await register(pool, input);

  let delivery;

  try {
    delivery = await send({
      email: registered.email,
      token: registered.verificationToken,
      fullName: input.fullName
    });
  } catch {
    return {
      registered: true,
      emailVerificationRequired: true,
      emailDelivery: 'failed'
    };
  }

  if (!delivery?.accepted) {
    return {
      registered: true,
      emailVerificationRequired: true,
      emailDelivery: 'failed'
    };
  }

  return {
    registered: true,
    emailVerificationRequired: true,
    emailDelivery: 'accepted'
  };
}