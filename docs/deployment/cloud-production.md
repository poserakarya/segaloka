# Segaloka cloud production preparation

This package is a deployment template only. It does not deploy anything and does not change the local Compose stack.

## Files

> Diperbarui: konfigurasi lengkap (API, ketujuh Dashboard V7, secret berkas, runner migrasi) dijelaskan di `deploy/cloud/README.md`. Bagian di bawah tetap berlaku untuk backup, restore, rollback, dan keamanan host.

- `deploy/cloud/compose.production.yaml`: isolated production services (postgres, api, dashboards, nginx, migrate profile).
- `deploy/cloud/Dockerfile.api`: production API image using the existing API source.
- `deploy/cloud/Dockerfile.dashboards` + `dashboards-supervisor.mjs`: the seven existing V7 dashboards (entry + BFF).
- `deploy/cloud/Dockerfile.migrate` + `database/migrate.mjs`: explicit, idempotent, non-destructive migration runner.
- `deploy/cloud/nginx/segaloka.conf.template`: HTTPS reverse proxy for the API host and the seven dashboard hosts.
- `deploy/cloud/production.env.example`: non-secret variables only; secrets are files under `deploy/cloud/secrets/`.
- `deploy/cloud/backup-postgres.sh` and `restore-postgres.sh`: operator-run backup/restore procedures.

## VPS requirements

- Linux VPS with Docker Engine and Compose v2.
- DNS record `api.segaloka.com` pointing to the VPS.
- Firewall exposing only TCP 80/443; PostgreSQL must remain private.
- Persistent disk for the Docker PostgreSQL volume and a separate backup destination.
- TLS certificate and key mounted as `deploy/cloud/tls/fullchain.pem` and `privkey.pem`.

## First deployment checklist

1. Copy `production.env.example` to `production.env` outside version control.
2. Set strong unique secrets using the VPS secret-management process.
3. Provision TLS files; never commit them.
4. Review the Compose image tags and resource limits.
5. Run `docker compose -f deploy/cloud/compose.production.yaml config`.
6. Start only after firewall, DNS, backup destination, and restore rehearsal are approved.
7. Apply database migrations explicitly with `database/migrate.mjs` (see `deploy/cloud/README.md`); services never run migrations on start.
8. Check `https://api.segaloka.com/health` and service logs.

## Backup and restore

Run the backup script from a protected operator host with `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_CONTAINER` set. Copy dumps to storage separate from the VPS and encrypt them at rest. Test restore into an isolated PostgreSQL instance before relying on a backup.

Restore is destructive to the target database. Require an approved maintenance window, take a final backup, and verify the dump checksum before running `restore-postgres.sh`.

## Rollback

Keep the previous API image tag available, stop traffic at the reverse proxy, restore the previous image, run health checks, then re-enable traffic. Do not roll back migrations automatically; use a reviewed database recovery plan.

## Security checklist

- Real secrets are outside the repository.
- PostgreSQL is on an internal Docker network with no published port.
- API is reachable only through Nginx in production.
- Nginx terminates TLS and forwards HTTPS identity headers.
- API and PostgreSQL use restart policies and healthchecks.
- Run the API as the non-root `node` user.
- Configure host firewall, unattended security updates, log rotation, monitoring, and backup alerting before go-live.
- Do not enable bidirectional synchronization between local and cloud databases.
