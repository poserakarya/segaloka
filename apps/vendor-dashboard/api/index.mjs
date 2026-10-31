// Vercel Function Dashboard Vendor: entry dan BFF dalam satu handler.
// vercel.json mengarahkan semua path ke sini. Environment divalidasi sebelum
// BFF dimuat; konfigurasi yang tidak aman membuat function gagal tertutup.
import { validatePortalRuntimeEnv } from '../../shared/runtime/portal-runtime-env.mjs';
import { createPortalRequestHandler } from '../../shared/runtime/v7-portal-entry.mjs';

validatePortalRuntimeEnv();

const { handleRequest } = await import('../server/bff.mjs');

export default createPortalRequestHandler({ role: 'vendor', handleBff: handleRequest });
