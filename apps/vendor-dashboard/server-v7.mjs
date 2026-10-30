import { readFileSync } from 'node:fs';

import { createPortalEntryServer } from '../shared/runtime/v7-portal-entry.mjs';

const config = JSON.parse(
  readFileSync(new URL('./v7-runtime.json', import.meta.url), 'utf8').replace(/^\uFEFF/, '')
);

if (config.role !== 'vendor') {
  throw new Error('Invalid Vendor V7 role');
}

// Entry Vendor: login V7 di /, dashboard V7 asli di /bff/ui (lewat BFF
// pada port 4211). Port entry tetap dari v7-runtime.json (4204).
const role = 'vendor';
const port = Number(config.port);

createPortalEntryServer({ role, port, bffPort: 4211 }).listen(port, '127.0.0.1', () => {
  console.log(`Segaloka ${role} entry: http://127.0.0.1:${port}`);
});
