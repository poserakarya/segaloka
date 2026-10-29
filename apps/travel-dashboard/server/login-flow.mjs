export function classifyLoginResponse(response) {
  if (!response || typeof response !== 'object') {
    return { type: 'invalid' };
  }

  if (response.authenticated === true) {
    const session = response.session;

    if (
      typeof session?.accessToken !== 'string' ||
      !session.accessToken ||
      typeof session?.refreshToken !== 'string' ||
      !session.refreshToken
    ) {
      return { type: 'invalid' };
    }

    return {
      type: 'authenticated',
      session
    };
  }

  if (
    response.authenticated === false &&
    response.code === 'OTP_CHANNEL_REQUIRED' &&
    typeof response.preAuthTicket === 'string' &&
    /^[a-f0-9]{64}$/.test(response.preAuthTicket) &&
    Array.isArray(response.availableMethods)
  ) {
    const allowed = [
      'authenticator',
      'email',
      'whatsapp'
    ];

    const methods = [
      ...new Set(response.availableMethods)
    ].filter(method => allowed.includes(method));

    if (methods.length === 0) {
      return { type: 'invalid' };
    }

    return {
      type: 'verification_required',
      preAuthTicket: response.preAuthTicket,
      availableMethods: methods,
      expiresIn: response.expiresIn
    };
  }

  return { type: 'invalid' };
}