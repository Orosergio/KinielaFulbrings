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

Netlify environment for the fallback:

```sh
DATABASE_DRIVER=postgres
DATABASE_SSL=require
DATABASE_MAX_CONNECTIONS=1
DATABASE_URL=postgres://kiniela_app:<password>@<vps-host>:5432/kiniela?sslmode=require
```

Return to Neon by restoring the old Neon `DATABASE_URL` and removing or setting
`DATABASE_DRIVER=neon-http`.
