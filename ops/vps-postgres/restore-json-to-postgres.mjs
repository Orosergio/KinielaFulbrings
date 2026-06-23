#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
const backupFile = process.env.KINIELA_BACKUP_FILE ?? process.argv[2];

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}
if (!backupFile) {
  throw new Error("Pass backup JSON path as argv[2] or KINIELA_BACKUP_FILE.");
}

const sslMode = (
  process.env.DATABASE_SSL ??
  new URL(databaseUrl).searchParams.get("sslmode") ??
  "require"
).toLowerCase();
const ssl = ["0", "false", "disable", "disabled", "off"].includes(sslMode)
  ? false
  : "require";

const backup = JSON.parse(await readFile(backupFile, "utf8"));
const tables = backup.tables ?? {};
const sql = postgres(databaseUrl, { max: 1, ssl });

const columns = {
  schema_migrations: ["name", "applied_at"],
  profiles: [
    "id",
    "email",
    "display_name",
    "avatar_url",
    "locale",
    "created_at",
    "updated_at",
  ],
  teams: [
    "id",
    "fifa_code",
    "iso2",
    "group_name",
    "name_en",
    "name_es",
    "flag_url",
    "scouting",
    "updated_at",
  ],
  stadiums: [
    "id",
    "name",
    "fifa_name",
    "city",
    "country_en",
    "country_es",
    "capacity",
    "timezone",
  ],
  matches: [
    "id",
    "provider_match_id",
    "stage",
    "group_name",
    "matchday",
    "kickoff_at",
    "home_team_id",
    "away_team_id",
    "home_label",
    "away_label",
    "stadium_id",
    "status",
    "minute",
    "home_score",
    "away_score",
    "source_updated_at",
    "updated_at",
  ],
  pools: ["id", "name", "code", "owner_user_id", "created_at"],
  pool_members: ["pool_id", "user_id", "role", "joined_at"],
  predictions: [
    "pool_id",
    "user_id",
    "match_id",
    "home_score",
    "away_score",
    "points",
    "created_at",
    "updated_at",
  ],
  sync_runs: [
    "id",
    "provider",
    "status",
    "matches_seen",
    "matches_updated",
    "detail",
    "started_at",
    "finished_at",
  ],
};

function rowsFor(table) {
  return Array.isArray(tables[table]) ? tables[table] : [];
}

async function insertRows(transaction, table) {
  const rows = rowsFor(table);
  if (!rows.length) return 0;
  await transaction`
    INSERT INTO ${transaction(table)}
    ${transaction(rows, columns[table])}
  `;
  return rows.length;
}

try {
  await sql.begin(async (transaction) => {
    await transaction`
      TRUNCATE
        sync_runs,
        predictions,
        pool_members,
        pools,
        matches,
        stadiums,
        teams,
        profiles,
        schema_migrations
      RESTART IDENTITY CASCADE
    `;

    await transaction`
      ALTER TABLE predictions DISABLE TRIGGER predictions_deadline_guard
    `;
    await transaction`
      ALTER TABLE pools DISABLE TRIGGER pools_add_owner
    `;

    const counts = {};
    for (const table of [
      "schema_migrations",
      "profiles",
      "teams",
      "stadiums",
      "matches",
      "pools",
      "pool_members",
      "predictions",
      "sync_runs",
    ]) {
      counts[table] = await insertRows(transaction, table);
    }

    await transaction`
      ALTER TABLE pools ENABLE TRIGGER pools_add_owner
    `;
    await transaction`
      ALTER TABLE predictions ENABLE TRIGGER predictions_deadline_guard
    `;
    await transaction`
      SELECT setval(
        pg_get_serial_sequence('sync_runs', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM sync_runs), 1), 1),
        true
      )
    `;

    console.table(counts);
  });
} finally {
  await sql.end();
}
