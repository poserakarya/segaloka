#!/usr/bin/env sh
set -eu

: "${POSTGRES_CONTAINER:=segaloka-production-postgres}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

test -f "$BACKUP_FILE"
docker exec -i "$POSTGRES_CONTAINER" pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" < "$BACKUP_FILE"
