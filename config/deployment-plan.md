# Segaloka hybrid deployment plan

Preparation only. This does not enable public access, change DNS, open firewalls, or deploy.

## Runtime ports (as implemented in source)

Port values below are read from the current source. Entry ports are unchanged; each dashboard has one origin.

| Dashboard | Entry (public origin) | BFF (127.0.0.1 only) | Login | Dashboard | Origin accepted by BFF |
|---|---:|---:|---|---|---|
| Control Center | 4202 | 4203 | `/login` | `/dashboard` | 4203 (rewritten by the 4202 proxy) |
| Travel | 4200 (Vite) | 4201 | `/` | `/bff/dashboard` | 4200 (`FRONTEND_ORIGIN`) |
| Vendor | 4204 | 4211 | `/` | `/bff/ui` | 4204 |
| Affiliate | 4212 | 4221 | `/` | `/bff/ui` | 4212 |
| Mitra | 4214 | 4241 | `/` | `/bff/ui` | 4214 |
| Agen | 4216 | 4231 | `/` | `/bff/ui` | 4216 |
| Traveler | 4210 | 4251 | `/` | `/bff/ui` | 4210 |

- Vendor, Affiliate, Mitra, Agen, and Traveler entry servers (`apps/shared/runtime/v7-portal-entry.mjs`) serve the V7 login page at `/` and forward `/bff/*` to their own BFF. Login, session cookie (`Path=/bff`), and dashboard therefore share one origin.
- Non-GET requests through an entry must carry that entry's Origin, or an origin listed in `SEGALOKA_PUBLIC_ORIGIN` (comma-separated, e.g. the staging hostname). The entry forwards them to the BFF as `http://127.0.0.1:<entry port>`, which is the only Origin the BFF accepts. Control Center `server.mjs` supports the same `SEGALOKA_PUBLIC_ORIGIN`. Travel BFF uses `FRONTEND_ORIGIN`.
- Every BFF serves the self-hosted fonts at `/bff/fonts/*` (`apps/shared/assets/fonts`, SIL OFL 1.1).
- `tests/port-origin-audit.test.mjs` checks that nginx upstreams, entry servers, BFF ports, BFF origins, and `config/dashboard-v7-separation.json` agree.
- Travel's 4200 is the Vite dev server (`start.mjs`). A production build/serve for Travel on 4200 is still needed before staging.

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
