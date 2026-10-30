#!/usr/bin/env bash
# Menjalankan lingkungan pratinjau tujuh dashboard di satu mesin terisolasi
# (mis. Vercel Sandbox): PostgreSQL lokal baru (segaloka_preview_test), API
# Fastify, BFF + entry server tiap dashboard, dan gerbang akses Basic Auth.
# Semua secret dibuat acak saat start dan hanya ditulis ke $PREVIEW_HOME
# (chmod 600). Tidak ada koneksi ke database production.
#
# Prasyarat: Node.js 24, dependensi terpasang (pnpm install), biner
# PostgreSQL di PATH atau PG_BIN. Jalankan sebagai pengguna non-root.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PREVIEW_HOME="${PREVIEW_HOME:-$HOME/segaloka-preview}"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl)")}"
PG_PORT=55432
DB_NAME=segaloka_preview_test
DB_USER=segaloka_test
API_PORT=4990
mkdir -p "$PREVIEW_HOME/logs" "$PREVIEW_HOME/storage"
for dir in services/api apps/travel-dashboard; do
  if [ ! -d "$REPO/$dir/node_modules" ]; then
    (cd "$REPO/$dir" && npx --yes pnpm@10.28.0 install --frozen-lockfile >"$PREVIEW_HOME/logs/install-${dir//\//-}.log" 2>&1)
  fi
done
# argon2 memakai biner native; pnpm 10 tidak menjalankan skrip build secara default.
(cd "$REPO/services/api" && npx --yes pnpm@10.28.0 rebuild argon2 >>"$PREVIEW_HOME/logs/install-services-api.log" 2>&1)
chmod 700 "$PREVIEW_HOME"
secret() { node -e "process.stdout.write(require('crypto').randomBytes($1).toString('$2'))"; }

INGRESS_SECRET="$(secret 32 hex)"
GATE_USER="${PREVIEW_GATE_USER:-segaloka}"
GATE_PASSWORD="${PREVIEW_GATE_PASSWORD:-$(secret 18 base64url)}"
ACCOUNT_PASSWORD="${PREVIEW_ACCOUNT_PASSWORD:-$(secret 15 base64url)}"

# ---------- PostgreSQL lokal (hanya 127.0.0.1) ----------
if [ ! -d "$PREVIEW_HOME/pgdata" ]; then
  "$PG_BIN/initdb" -D "$PREVIEW_HOME/pgdata" -U "$DB_USER" --auth=trust >/dev/null
fi
"$PG_BIN/pg_ctl" -D "$PREVIEW_HOME/pgdata" -l "$PREVIEW_HOME/logs/postgres.log" \
  -o "-p $PG_PORT -k $PREVIEW_HOME -c listen_addresses=127.0.0.1" start >/dev/null </dev/null
sleep 2
PSQL=("$PG_BIN/psql" -h 127.0.0.1 -p "$PG_PORT" -U "$DB_USER" -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME" -c "CREATE DATABASE $DB_NAME"
for f in $(ls "$REPO"/database/migrations/*.sql | grep -v -e rollback -e draft) "$REPO"/database/postgres/migrations/*.sql; do
  "${PSQL[@]}" -d "$DB_NAME" -f "$f" >/dev/null 2>>"$PREVIEW_HOME/logs/migrations.log"
done

# ---------- Konfigurasi proses (hanya di mesin pratinjau) ----------
umask 077
cat > "$REPO/services/api/.env" <<EOF
INGRESS_IDENTITY_SECRET=$INGRESS_SECRET
DB_HOST=127.0.0.1
DB_PORT=$PG_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=trust-auth-unused
DB_SSL=false
EOF
for app in vendor-dashboard affiliate-dashboard agen-dashboard mitra-dashboard traveler-portal; do
  echo "BFF_SESSION_ENCRYPTION_KEY=$(secret 32 base64)" > "$REPO/apps/$app/server/.env"
done

start() {
  local name="$1"; shift
  (cd "$REPO" && nohup "$@" > "$PREVIEW_HOME/logs/$name.log" 2>&1 </dev/null &)
}
wait_http() {
  for _ in $(seq 1 300); do
    curl -s -o /dev/null "$1" && return 0
    sleep 0.2
  done
  echo "tidak siap: $1" >&2; exit 1
}

DB_ENV=(DB_HOST=127.0.0.1 DB_PORT=$PG_PORT DB_NAME=$DB_NAME DB_USER=$DB_USER DB_PASSWORD=trust-auth-unused DB_SSL=false)
start api env API_HOST=127.0.0.1 API_PORT=$API_PORT INGRESS_IDENTITY_SECRET="$INGRESS_SECRET" "${DB_ENV[@]}" \
  AUTH_IP_HASH_SECRET="$(secret 32 hex)" SEGALOKA_PRIVATE_STORAGE_ROOT="$PREVIEW_HOME/storage" \
  bash -c 'cd services/api && exec node src/server.js'
wait_http "http://127.0.0.1:$API_PORT/health"

BASE_ENV=(API_ORIGIN="http://127.0.0.1:$API_PORT" NODE_ENV=test)
for spec in "vendor-dashboard server-v7.mjs 4211 4204" "affiliate-dashboard server.mjs 4221 4212" \
            "agen-dashboard server.mjs 4231 4216" "mitra-dashboard server.mjs 4241 4214" \
            "traveler-portal server.mjs 4251 4210"; do
  set -- $spec
  start "$1-bff" env "${BASE_ENV[@]}" node "apps/$1/server/bff.mjs"
  wait_http "http://127.0.0.1:$3/bff/health"
  start "$1-entry" env "${BASE_ENV[@]}" node "apps/$1/$2"
  wait_http "http://127.0.0.1:$4/health"
done

start travel-bff env "${BASE_ENV[@]}" SEGALOKA_TEST_DATABASE=true BFF_PORT=4901 FRONTEND_ORIGIN=http://127.0.0.1:4900 \
  INGRESS_IDENTITY_SECRET="$INGRESS_SECRET" "${DB_ENV[@]}" BFF_SESSION_ENCRYPTION_KEY="$(secret 32 base64)" \
  node apps/travel-dashboard/server/bff.mjs
wait_http "http://127.0.0.1:4901/bff/health"
start travel-vite env "${BASE_ENV[@]}" TRAVEL_BFF_ORIGIN=http://127.0.0.1:4901 \
  bash -c 'cd apps/travel-dashboard && exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4900 --strictPort'
wait_http "http://127.0.0.1:4900/"

start control-bff env "${BASE_ENV[@]}" SEGALOKA_CONTROL_TEST=1 SEGALOKA_BFF_PORT=4903 \
  CONTROL_TEST_INGRESS_IDENTITY_SECRET="$INGRESS_SECRET" CONTROL_TEST_DB_HOST=127.0.0.1 CONTROL_TEST_DB_PORT=$PG_PORT \
  CONTROL_TEST_DB_NAME=$DB_NAME CONTROL_TEST_DB_USER=$DB_USER CONTROL_TEST_DB_PASSWORD=trust-auth-unused \
  CONTROL_TEST_BFF_SESSION_ENCRYPTION_KEY="$(secret 32 base64)" node apps/control-center/bff.mjs
wait_http "http://127.0.0.1:4903/bff/health"
start control-server env "${BASE_ENV[@]}" SEGALOKA_CONTROL_CENTER_PORT=4902 SEGALOKA_CONTROL_CENTER_BFF_PORT=4903 \
  node apps/control-center/server.mjs
wait_http "http://127.0.0.1:4902/health"

# ---------- Data uji berlabel ----------
(cd "$REPO" && PREVIEW_DB_HOST=127.0.0.1 PREVIEW_DB_PORT=$PG_PORT PREVIEW_DB_NAME=$DB_NAME PREVIEW_DB_USER=$DB_USER \
  PREVIEW_API_ORIGIN="http://127.0.0.1:$API_PORT" PREVIEW_INGRESS_SECRET="$INGRESS_SECRET" \
  PREVIEW_ACCOUNT_PASSWORD="$ACCOUNT_PASSWORD" PREVIEW_ACCOUNTS_FILE="$PREVIEW_HOME/accounts.json" \
  node tools/preview/seed.mjs)

# ---------- Gerbang akses (satu port publik per dashboard) ----------
# 8101 Control Center, 8102 Travel, 8103 Vendor, 8104 Affiliate,
# 8105 Agen, 8106 Mitra, 8107 Traveler
start gate env PREVIEW_GATE_USER="$GATE_USER" PREVIEW_GATE_PASSWORD="$GATE_PASSWORD" \
  PREVIEW_GATE_ROUTES="8101=4902,8102=4900,8103=4204,8104=4212,8105=4216,8106=4214,8107=4210" \
  node tools/preview/gate.mjs
sleep 1

cat > "$PREVIEW_HOME/credentials.txt" <<EOF
gate_user=$GATE_USER
gate_password=$GATE_PASSWORD
account_password=$ACCOUNT_PASSWORD
EOF
chmod 600 "$PREVIEW_HOME/credentials.txt"
echo "PREVIEW_READY $PREVIEW_HOME"
