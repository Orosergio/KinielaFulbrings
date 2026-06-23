# VPS Postgres Fallback

Temporary Postgres target for Kiniela if Neon compute is suspended.

This folder intentionally has no secrets. Create `.env` only on the VPS:

```sh
POSTGRES_DB=kiniela
POSTGRES_USER=kiniela_app
POSTGRES_PASSWORD=<strong random password>
```

Required before starting:

```sh
mkdir -p data certs
openssl req -new -x509 -days 120 -nodes \
  -subj "/CN=kiniela-vps-postgres" \
  -out certs/server.crt \
  -keyout certs/server.key
chmod 600 certs/server.key
sudo chown 999:999 certs/server.key certs/server.crt
docker compose up -d
```

Ubuntu 24.04 package names:

```sh
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker opsadmin
```

Then log out and back in so the `docker` group is active.

Start the fallback database from this folder:

```sh
./start-postgres.sh
```

Netlify environment for the fallback:

```sh
DATABASE_DRIVER=postgres
DATABASE_SSL=require
DATABASE_MAX_CONNECTIONS=1
DATABASE_URL=postgres://kiniela_app:<password>@<vps-host>:5432/kiniela?sslmode=require
```

Return to Neon by restoring the old Neon `DATABASE_URL` and removing or setting
`DATABASE_DRIVER=neon-http`.

If `pg_dump` is blocked by client/server version mismatch, use the JSON fallback:

```sh
# Export from Neon:
DATABASE_URL='<neon-url>' node ops/vps-postgres/export-neon-json.mjs

# Restore into VPS Postgres after migrations:
DATABASE_URL='<vps-url>' node scripts/migrate-db.mjs
DATABASE_URL='<vps-url>' KINIELA_BACKUP_FILE='<backup-json>' \
  node ops/vps-postgres/restore-json-to-postgres.mjs
```
