# Segaloka hybrid deployment plan

Preparation only. This does not enable public access, change DNS, open firewalls, or deploy.

## Runtime ports (as implemented in source)

Port values below are read from the current source. This document does not change any runtime port.

| Dashboard | Entry runtime | BFF | Origin accepted by BFF for POST | Source |
|---|---:|---:|---:|---|
| Travel | 4200 (Vite) | 4201 | 4200 | `apps/travel-dashboard/vite.config.ts`, `server/bff.mjs` (`BFF_PORT`, `FRONTEND_ORIGIN`) |
| Control Center | 4202 | 4203 | 4203 (via 4202 proxy) | `apps/control-center/start.mjs`, `server.mjs`, `bff.mjs` (`SEGALOKA_BFF_PORT`) |
| Vendor | 4204 | 4211 | 4210 | `apps/vendor-dashboard/v7-runtime.json`, `server-v7.mjs`, `server/bff.mjs` |
| Affiliate | 4212 | 4221 | 4220 | `apps/affiliate-dashboard/server.mjs`, `server/bff.mjs` |
| Mitra | 4214 | 4241 | 4240 | `apps/mitra-dashboard/server.mjs`, `server/bff.mjs` |
| Agen | 4216 | 4231 | 4230 | `apps/agen-dashboard/server.mjs`, `server/bff.mjs` |
| Traveler | 4210 | 4251 | 4250 | `apps/traveler-portal/server.mjs`, `server/bff.mjs` |

Vendor, Affiliate, Mitra, Agen, and Traveler entry runtimes only redirect `/` to `http://127.0.0.1:<BFF>/bff/ui`. The BFF serves the original V7 source (`apps/travel-dashboard/original-v7/travel-existing.html`) after verifying the session and role. The `dist-v7` shells are not served.

Known inconsistencies, left unchanged on purpose because this document does not change ports:

- The Vendor BFF accepts POST requests only from Origin `4210`, and `4210` is also the Traveler entry runtime port. The Affiliate, Mitra, Agen, and Traveler BFFs likewise accept Origins (`4220`, `4240`, `4230`, `4250`) that differ from their entry runtime ports.
- `config/dashboard-v7-separation.json` lists ports that do not match the BFF ports in this table.

## API and ingress

| Service | Port | Source |
|---|---:|---|
| Segaloka API (Fastify) | `API_PORT`; defaults to 4190 when unset | `services/api/src/server.js` |
| Port expected by all BFFs | 4192 (`API_ORIGIN` default `http://127.0.0.1:4192`) | `apps/*/server/bff.mjs`, `apps/control-center/bff.mjs` |
| Staging and production API | 4192 (`API_PORT=4192`) | `config/environments/*.env.example`, `deploy/cloud/compose.production.yaml`, `config/nginx/segaloka-staging.example.conf` |
| Ingress | `INGRESS_PORT`, default 4191; target `INGRESS_TARGET`, default `http://127.0.0.1:4190` | `services/ingress/src/server.mjs` |

On 4190 versus 4192: the API code defaults to 4190, but every BFF calls 4192, and staging and production set `API_PORT=4192`. To run the API locally behind the BFFs, either set `API_PORT=4192` or point the BFFs at 4190 with `API_ORIGIN`. Older local scripts and integration tests that call 4190 directly (`scripts/start-backend-api.ps1`, `services/api/src/auth/*-http.integration.js`) assume the code default.

## Database and rollback

Use separate PostgreSQL instances and credentials for local, staging, and production. Run migrations only after backup and approval. Keep the exact tested artifact for rollback. Use the last tested version as the rollback point; a placeholder shell is never a fallback.

## Staging names

Suggested staging names, pending DNS ownership confirmation: `staging-control.segaloka.com`, `staging-travel.segaloka.com`, `staging-vendor.segaloka.com`, `staging-affiliate.segaloka.com`, `staging-agen.segaloka.com`, `staging-mitra.segaloka.com`, and `staging-traveler.segaloka.com`.

Website and mobile source integration remains pending until implementations are present in this workspace.
