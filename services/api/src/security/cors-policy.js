// Kebijakan CORS API. Tidak ada endpoint yang memberi izin CORS
// ber-credential: browser memakai BFF same-origin, dan exchange Google OAuth
// khusus server-ke-server (request ber-Origin ditolak oleh route-nya).
export const ALLOWED_CORS_ORIGINS = Object.freeze(new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4178',
  'http://localhost:4178',
  'https://segaloka.com',
  'https://www.segaloka.com',
  'https://dashboard.segaloka.com',
  'https://dev.segaloka.com',
  'https://dev.dashboard.segaloka.com'
]));

export function corsDelegator(request, callback) {
  const origin = request.headers.origin;
  const allowedOrigin = typeof origin === 'string' && ALLOWED_CORS_ORIGINS.has(origin);

  callback(null, {
    origin: allowedOrigin ? origin : false,
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600
  });
}
