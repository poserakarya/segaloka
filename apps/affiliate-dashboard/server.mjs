import { createPortalEntryServer } from '../shared/runtime/v7-portal-entry.mjs';

// Entry Affiliate: login V7 di /, dashboard V7 asli di /bff/ui (lewat BFF
// pada port 4221). Port entry tidak berubah.
const role = 'affiliate';
const port = 4212;

createPortalEntryServer({ role, port, bffPort: 4221 }).listen(port, '127.0.0.1', () => {
  console.log(`Segaloka ${role} entry: http://127.0.0.1:${port}`);
});
