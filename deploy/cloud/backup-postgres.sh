#!/usr/bin/env sh
set -eu

: "${POSTGRES_CONTAINER:=segaloka-production-postgres}"
: "${BACKUP_DIR:=/var/backups/segaloka}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"

umask 077
mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_DIR/${POSTGRES_DB}-${stamp}.dump"

docker exec "$POSTGRES_CONTAINER" pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --username "$POSTGRES_USER" \
  "$POSTGRES_DB" > "$target"

printf '%s\n' "$target"
