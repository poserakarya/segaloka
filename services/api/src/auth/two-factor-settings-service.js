/**
 * Legacy direct 2FA activation is disabled.
 *
 * Security settings must use the challenge-based flow:
 * 1. Verify password and authenticated session.
 * 2. Issue a fresh six-digit OTP to a verified channel.
 * 3. Verify the OTP against the bound challenge.
 * 4. Atomically update 2FA state and revoke sessions.
 *
 * Do not enable 2FA directly from this service.
 */
export async function enableTwoFactor() {
  return {
    enabled: false,
    code: 'SECURITY_OTP_REQUIRED'
  };
}
