/**
 * Password-only login is permanently disabled.
 * Every password login must complete a verified OTP challenge.
 */
export async function completePasswordLogin(_pool, _userId) {
  return {
    authenticated: false,
    code: 'OTP_REQUIRED'
  };
}