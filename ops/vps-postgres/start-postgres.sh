#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. On Ubuntu 24.04 run:" >&2
  echo "  sudo apt update" >&2
  echo "  sudo apt install -y docker.io docker-compose-v2" >&2
  echo "  sudo systemctl enable --now docker" >&2
  echo "  sudo usermod -aG docker opsadmin" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but this user cannot access it yet." >&2
  echo "Log out and back in after: sudo usermod -aG docker opsadmin" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env with POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD" >&2
  exit 1
fi

mkdir -p data certs

if [[ ! -f certs/server.crt || ! -f certs/server.key ]]; then
  docker run --rm \
    --user root \
    -v "$PWD/certs:/certs" \
    postgres:16 \
    bash -lc '
      set -euo pipefail
      openssl req -new -x509 -days 120 -nodes \
        -subj "/CN=kiniela-vps-postgres" \
        -out /certs/server.crt \
        -keyout /certs/server.key
      chown 999:999 /certs/server.crt /certs/server.key
      chmod 644 /certs/server.crt
      chmod 600 /certs/server.key
    '
fi

docker compose up -d
docker compose ps
