import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const migrationsDir = path.resolve("db/migrations");
const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const sql = postgres(connectionString, { max: 1, ssl: "require" });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const file of files) {
    const [existing] = await sql`
      SELECT name FROM schema_migrations WHERE name = ${file}
    `;
    if (existing) {
      console.log(`skip ${file}`);
      continue;
    }

    const migration = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        INSERT INTO schema_migrations (name) VALUES (${file})
        ON CONFLICT (name) DO NOTHING
      `;
    });
    console.log(`applied ${file}`);
  }
} finally {
  await sql.end();
}
