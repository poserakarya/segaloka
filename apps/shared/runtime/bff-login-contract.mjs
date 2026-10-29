import { createHash, randomBytes } from 'node:crypto';

// Kontrak login BFF yang sama untuk dashboard Segaloka.
//
// - Password-only bila 2FA akun tidak aktif (diputuskan API).
// - Bila 2FA aktif, API mengembalikan preAuthTicket dan daftar metode yang
//   sudah diverifikasi untuk akun tersebut. Pengguna memilih tepat satu
//   metode: authenticator (TOTP), email, atau whatsapp.
// - Sesi BFF hanya dibuat setelah API menyatakan authenticated: true.
// - Kegagalan provider OTP diteruskan sebagai penolakan; tidak ada bypass.

export const BFF_LOGIN_PATHS = Object.freeze([
  '/bff/login',
  '/bff/login/select-channel',
  '/bff/login/verify-otp',
  '/bff/login/verify-authenticator'
]);

export const TWO_FACTOR_METHODS = Object.freeze([
  'authenticator',
  'email',
  'whatsapp'
]);

const OTP_CHANNELS = ['email', 'whatsapp'];
const TICKET = /^[0-9a-f]{64}$/;
const CHALLENGE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[0-9]{6}$/;
const MAX_TICKET_SECONDS = 600;

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

    return { type: 'authenticated', session };
  }

  if (
    response.authenticated === false &&
    response.code === 'OTP_CHANNEL_REQUIRED' &&
    typeof response.preAuthTicket === 'string' &&
    TICKET.test(response.preAuthTicket) &&
    Array.isArray(response.availableMethods)
  ) {
    const methods = [...new Set(response.availableMethods)]
      .filter(method => TWO_FACTOR_METHODS.includes(method));

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

const reply = (status, body, headers = {}) => ({ status, body, headers });

function ticketKey(ticket) {
  return createHash('sha256').update(ticket).digest('hex');
}

export function createBffLoginContract(options) {
  const {
    apiRequest,
    sessions,
    hasDashboardAccess,
    sessionCookie,
    accessDeniedCode,
    accessDeniedMessage,
    now = () => Date.now(),
    maxPendingTickets = 5000
  } = options;

  if (
    typeof apiRequest !== 'function' ||
    typeof sessions?.create !== 'function' ||
    typeof hasDashboardAccess !== 'function' ||
    typeof sessionCookie !== 'function' ||
    typeof accessDeniedCode !== 'string'
  ) {
    throw new Error('INVALID_BFF_LOGIN_CONTRACT');
  }

  // Metode yang ditawarkan API per tiket pre-auth (disimpan sebagai hash).
  const pending = new Map();

  function prune() {
    const current = now();
    for (const [key, entry] of pending) {
      if (entry.expiresAt <= current) pending.delete(key);
    }
    while (pending.size >= maxPendingTickets) {
      pending.delete(pending.keys().next().value);
    }
  }

  function rememberTicket(ticket, methods, expiresIn) {
    prune();
    const seconds = Number.isInteger(expiresIn) && expiresIn > 0
      ? Math.min(expiresIn, MAX_TICKET_SECONDS)
      : MAX_TICKET_SECONDS;

    pending.set(ticketKey(ticket), {
      methods,
      chosen: null,
      expiresAt: now() + seconds * 1000
    });
  }

  // Satu tiket hanya boleh dipakai untuk satu metode yang ditawarkan API.
  function chooseMethod(ticket, method) {
    const key = ticketKey(ticket);
    const entry = pending.get(key);

    if (!entry || entry.expiresAt <= now()) {
      pending.delete(key);
      return 'expired';
    }

    if (!entry.methods.includes(method)) return 'not_offered';
    if (entry.chosen !== null && entry.chosen !== method) return 'already_chosen';

    entry.chosen = method;
    return 'ok';
  }

  async function finishLogin(session) {
    const accessToken = session.accessToken;
    const refreshToken = session.refreshToken;
    const me = await apiRequest('GET', '/auth/me', undefined, accessToken);

    if (
      me.status !== 200 ||
      typeof me.data?.user?.id !== 'string' ||
      !hasDashboardAccess(me.data)
    ) {
      await apiRequest('POST', '/auth/logout', { refreshToken });

      return reply(403, {
        authenticated: false,
        code: accessDeniedCode,
        message: accessDeniedMessage
      });
    }

    const sessionId = randomBytes(32).toString('hex');

    await sessions.create(sessionId, me.data.user.id, {
      accessToken,
      refreshToken,
      user: me.data.user,
      memberships: me.data.memberships
    });

    return reply(200, {
      authenticated: true,
      user: me.data.user,
      memberships: me.data.memberships
    }, {
      'Set-Cookie': sessionCookie(sessionId)
    });
  }

  function rejected(result, fallbackCode, fallbackMessage) {
    const status = Number.isInteger(result.status) && result.status >= 400
      ? result.status
      : 502;

    return reply(status, {
      authenticated: false,
      code: result.data?.code || fallbackCode,
      message: result.data?.message || fallbackMessage
    });
  }

  async function login(body) {
    if (typeof body?.email !== 'string' || typeof body?.password !== 'string') {
      return reply(400, { authenticated: false, code: 'INVALID_LOGIN_REQUEST' });
    }

    const result = await apiRequest('POST', '/auth/login', {
      email: body.email,
      password: body.password
    });

    if (result.status !== 200) {
      return rejected(result, 'LOGIN_FAILED', 'Login gagal.');
    }

    const flow = classifyLoginResponse(result.data);

    if (flow.type === 'verification_required') {
      rememberTicket(flow.preAuthTicket, flow.availableMethods, flow.expiresIn);

      return reply(200, {
        authenticated: false,
        code: 'OTP_CHANNEL_REQUIRED',
        preAuthTicket: flow.preAuthTicket,
        availableMethods: flow.availableMethods,
        expiresIn: flow.expiresIn
      });
    }

    if (flow.type !== 'authenticated') {
      return reply(502, { authenticated: false, code: 'INVALID_SESSION_RESPONSE' });
    }

    return finishLogin(flow.session);
  }

  function methodRejected(state) {
    return state === 'expired'
      ? reply(401, {
          authenticated: false,
          code: 'INVALID_OR_EXPIRED_PRE_AUTH',
          message: 'Sesi verifikasi tidak valid atau kedaluwarsa.'
        })
      : reply(403, {
          authenticated: false,
          code: 'VERIFICATION_METHOD_NOT_ALLOWED',
          message: 'Metode verifikasi tidak tersedia untuk akun ini.'
        });
  }

  async function selectChannel(body) {
    if (
      typeof body?.preAuthTicket !== 'string' ||
      !TICKET.test(body.preAuthTicket) ||
      !OTP_CHANNELS.includes(body.channel)
    ) {
      return reply(400, { authenticated: false, code: 'INVALID_VERIFICATION_REQUEST' });
    }

    const state = chooseMethod(body.preAuthTicket, body.channel);
    if (state !== 'ok') return methodRejected(state);

    const language = ['ID', 'EN', 'AR'].includes(body.language)
      ? body.language
      : 'ID';
    const result = await apiRequest('POST', '/auth/login/select-channel', {
      preAuthTicket: body.preAuthTicket,
      channel: body.channel,
      language
    });

    // API sudah memakai tiket ini; pengguna harus login ulang bila gagal.
    pending.delete(ticketKey(body.preAuthTicket));

    if (result.status !== 200) {
      return rejected(result, 'OTP_CHANNEL_FAILED', 'Pengiriman kode verifikasi gagal.');
    }

    if (
      result.data?.authenticated !== false ||
      result.data?.code !== 'OTP_REQUIRED' ||
      typeof result.data?.challengeId !== 'string' ||
      !CHALLENGE.test(result.data.challengeId) ||
      result.data.channel !== body.channel
    ) {
      return reply(502, { authenticated: false, code: 'INVALID_OTP_RESPONSE' });
    }

    return reply(200, {
      authenticated: false,
      code: 'OTP_REQUIRED',
      challengeId: result.data.challengeId,
      channel: result.data.channel,
      expiresIn: result.data.expiresIn
    });
  }

  async function completeVerification(result) {
    if (result.status !== 200) {
      return rejected(result, 'VERIFICATION_FAILED', 'Kode verifikasi tidak valid.');
    }

    const flow = classifyLoginResponse(result.data);

    if (flow.type !== 'authenticated') {
      return reply(502, { authenticated: false, code: 'INVALID_VERIFICATION_RESPONSE' });
    }

    return finishLogin(flow.session);
  }

  async function verifyOtp(body) {
    if (
      typeof body?.challengeId !== 'string' ||
      !CHALLENGE.test(body.challengeId) ||
      typeof body?.code !== 'string' ||
      !CODE.test(body.code)
    ) {
      return reply(400, { authenticated: false, code: 'INVALID_VERIFICATION_REQUEST' });
    }

    return completeVerification(await apiRequest('POST', '/auth/login/verify-otp', {
      challengeId: body.challengeId,
      code: body.code
    }));
  }

  async function verifyAuthenticator(body) {
    if (
      typeof body?.preAuthTicket !== 'string' ||
      !TICKET.test(body.preAuthTicket) ||
      typeof body?.code !== 'string' ||
      !CODE.test(body.code)
    ) {
      return reply(400, { authenticated: false, code: 'INVALID_VERIFICATION_REQUEST' });
    }

    const state = chooseMethod(body.preAuthTicket, 'authenticator');
    if (state !== 'ok') return methodRejected(state);

    const result = await apiRequest('POST', '/auth/login/verify-authenticator', {
      preAuthTicket: body.preAuthTicket,
      code: body.code
    });

    // Kode salah boleh dicoba ulang; API membatasi percobaan per tiket.
    if (result.status === 200) {
      pending.delete(ticketKey(body.preAuthTicket));
    }

    return completeVerification(result);
  }

  const handlers = {
    '/bff/login': login,
    '/bff/login/select-channel': selectChannel,
    '/bff/login/verify-otp': verifyOtp,
    '/bff/login/verify-authenticator': verifyAuthenticator
  };

  return {
    handles: path => Object.hasOwn(handlers, path),
    // rawBody: Buffer berisi JSON. SyntaxError diteruskan ke pemanggil (400).
    async handle(path, rawBody) {
      const handler = handlers[path];
      if (!handler) throw new Error('UNKNOWN_LOGIN_PATH');
      const body = JSON.parse(Buffer.from(rawBody).toString('utf8'));
      return handler(body);
    },
    pendingTicketCount: () => pending.size
  };
}
