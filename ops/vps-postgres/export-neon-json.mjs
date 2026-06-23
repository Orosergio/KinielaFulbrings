#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const backupDir =
  process.env.KINIELA_BACKUP_DIR ??
  path.resolve(".tmp", "kiniela-postgres-backups");
await mkdir(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile =
  process.env.KINIELA_BACKUP_FILE ??
  path.join(backupDir, `kiniela-neon-${stamp}.json`);

const sql = neon(databaseUrl);

const data = {
  exportedAt: new Date().toISOString(),
  source: "neon",
  tables: {
    schema_migrations: await sql`
      SELECT * FROM public.schema_migrations ORDER BY name
    `,
    profiles: await sql`
      SELECT * FROM public.profiles ORDER BY created_at, id
    `,
    teams: await sql`
      SELECT * FROM public.teams ORDER BY id
    `,
    stadiums: await sql`
      SELECT * FROM public.stadiums ORDER BY id
    `,
    matches: await sql`
      SELECT * FROM public.matches ORDER BY id
    `,
    pools: await sql`
      SELECT * FROM public.pools ORDER BY created_at, id
    `,
    pool_members: await sql`
      SELECT * FROM public.pool_members ORDER BY joined_at, pool_id, user_id
    `,
    predictions: await sql`
      SELECT * FROM public.predictions ORDER BY pool_id, user_id, match_id
    `,
    sync_runs: await sql`
      SELECT * FROM public.sync_runs ORDER BY id DESC LIMIT 500
    `,
  },
};

await writeFile(backupFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(backupFile);
