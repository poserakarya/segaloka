import { createPortalEntryServer } from '../shared/runtime/v7-portal-entry.mjs';

// Entry Traveler: login V7 di /, dashboard V7 asli di /bff/ui (lewat BFF
// pada port 4251). Port entry tidak berubah.
const role = 'traveler';
const port = 4210;

createPortalEntryServer({ role, port, bffPort: 4251 }).listen(port, '127.0.0.1', () => {
  console.log(`Segaloka ${role} entry: http://127.0.0.1:${port}`);
});
