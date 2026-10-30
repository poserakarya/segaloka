import { createPortalEntryServer, entryBindHost } from '../shared/runtime/v7-portal-entry.mjs';

// Entry Mitra: login V7 di /, dashboard V7 asli di /bff/ui (lewat BFF
// pada port 4241). Port entry tidak berubah.
const role = 'mitra';
const port = 4214;

createPortalEntryServer({ role, port, bffPort: 4241 }).listen(port, entryBindHost(), () => {
  console.log(`Segaloka ${role} entry: http://${entryBindHost()}:${port}`);
});
