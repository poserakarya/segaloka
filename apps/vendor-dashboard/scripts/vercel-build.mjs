// Build Vercel Dashboard Vendor: tidak membangun SPA. Output statis sengaja
// kosong agar tidak ada berkas repo (source, original-v7, index.html lama)
// yang tersaji langsung; semua path ditangani api/index.mjs.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';

const out = new URL('../vercel-static/', import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
if (readdirSync(out).length !== 0) throw new Error('VERCEL_STATIC_NOT_EMPTY');
console.log('vercel-static: kosong (semua route lewat api/index.mjs)');
