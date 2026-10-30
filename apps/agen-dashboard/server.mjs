import { createPortalEntryServer } from '../shared/runtime/v7-portal-entry.mjs';

// Entry Agen: login V7 di /, dashboard V7 asli di /bff/ui (lewat BFF
// pada port 4231). Port entry tidak berubah.
const role = 'agen';
const port = 4216;

createPortalEntryServer({ role, port, bffPort: 4231 }).listen(port, '127.0.0.1', () => {
  console.log(`Segaloka ${role} entry: http://127.0.0.1:${port}`);
});
