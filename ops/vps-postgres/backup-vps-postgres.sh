#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ ! -f .env ]]; then
  echo "Missing .env with POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

backup_dir="${KINIELA_VPS_BACKUP_DIR:-$HOME/.openclaw/kiniela-postgres/vps-backups}"
mkdir -p "$backup_dir"

backup_file="$backup_dir/kiniela-vps-$(date -u +%Y%m%d-%H%M%S).dump"
PGHOST="${PGHOST:-127.0.0.1}" \
PGPORT="${PGPORT:-5432}" \
PGDATABASE="$POSTGRES_DB" \
PGUSER="$POSTGRES_USER" \
PGPASSWORD="$POSTGRES_PASSWORD" \
PGSSLMODE="${PGSSLMODE:-require}" \
pg_dump --no-owner --no-acl --format=custom --file "$backup_file"

chmod 600 "$backup_file"
printf '%s\n' "$backup_file" > "$backup_dir/latest-vps-backup-path"

find "$backup_dir" -type f -name 'kiniela-vps-*.dump' \
  -printf '%T@ %p\n' |
  sort -rn |
  awk 'NR > 48 { print $2 }' |
  xargs -r rm -f

ls -lh "$backup_file"
