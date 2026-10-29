# Segaloka hybrid deployment plan

Preparation only. This does not enable public access, change DNS, open firewalls, or deploy.

| Dashboard | Frontend | BFF |
|---|---:|---:|
| Travel | 4200 | 4201 |
| Control Center | 4202 | 4203 |
| Vendor | 4210 | 4211 |
| Affiliate | 4220 | 4221 |
| Agen | 4230 | 4231 |
| Mitra | 4240 | 4241 |
| Traveler | 4250 | 4251 |

Use separate PostgreSQL instances and credentials for local, staging, and production. Run migrations only after backup and approval. Keep the exact tested artifact for rollback.

Suggested staging names, pending DNS ownership confirmation: `staging-control.segaloka.com`, `staging-travel.segaloka.com`, `staging-vendor.segaloka.com`, `staging-affiliate.segaloka.com`, `staging-agen.segaloka.com`, `staging-mitra.segaloka.com`, and `staging-traveler.segaloka.com`.

Website and mobile source integration remains pending until implementations are present in this workspace.
