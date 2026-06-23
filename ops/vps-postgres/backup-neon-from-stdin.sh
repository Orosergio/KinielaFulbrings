#!/usr/bin/env bash
set -euo pipefail

db_url="$(python3 -c 'import sys; print(sys.stdin.read().strip())')"
if [[ -z "$db_url" ]]; then
  echo "DATABASE_URL was not provided on stdin" >&2
  exit 1
fi

backup_dir="${KINIELA_BACKUP_DIR:-$HOME/.openclaw/kiniela-postgres/backups}"
mkdir -p "$backup_dir"

backup_file="$backup_dir/kiniela-neon-$(date -u +%Y%m%d-%H%M%S).dump"
PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-20}" pg_dump \
  --no-owner \
  --no-acl \
  --format=custom \
  --file "$backup_file" \
  "$db_url"

chmod 600 "$backup_file"
printf '%s\n' "$backup_file" > "$backup_dir/latest-backup-path"
ls -lh "$backup_file"
