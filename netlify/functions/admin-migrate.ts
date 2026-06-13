import { timingSafeEqual } from "node:crypto";
import type { Config } from "@netlify/functions";
import { db } from "./_shared/db";
import { json } from "./_shared/http";

const MIGRATION_NAME = "003_live_score_updates.sql";

// Must stay byte-identical to db/migrations/003_live_score_updates.sql so the
// schema_migrations record matches what scripts/migrate-db.mjs would apply.
const MIGRATION_SQL = `
CREATE OR REPLACE FUNCTION score_match_predictions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'FINISHED'
    AND NEW.home_score IS NOT NULL
    AND NEW.away_score IS NOT NULL
  THEN
    UPDATE predictions
    SET
      points = prediction_points(
        home_score,
        away_score,
        NEW.home_score,
        NEW.away_score
      ),
      updated_at = now()
    WHERE match_id = NEW.id
      AND points IS DISTINCT FROM prediction_points(
        home_score,
        away_score,
        NEW.home_score,
        NEW.away_score
      );
  ELSIF OLD.status = 'FINISHED' AND NEW.status <> 'FINISHED' THEN
    UPDATE predictions
    SET points = NULL, updated_at = now()
    WHERE match_id = NEW.id
      AND points IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;
`;

function authorized(request: Request) {
  const secret = Netlify.env.get("MIGRATE_SECRET");
  const supplied = request.headers.get("x-kiniela-migrate-secret");
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export default async (request: Request) => {
  if (!authorized(request)) {
    return new Response("Not found", { status: 404 });
  }

  const sql = db();
  const before = (await sql`
    SELECT name FROM schema_migrations ORDER BY name
  `) as { name: string }[];
  const alreadyApplied = before.some((row) => row.name === MIGRATION_NAME);

  if (!alreadyApplied) {
    await sql.query(MIGRATION_SQL);
    await sql`
      INSERT INTO schema_migrations (name)
      VALUES (${MIGRATION_NAME})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  const migrations = await sql`
    SELECT name, applied_at AS "appliedAt"
    FROM schema_migrations
    ORDER BY name
  `;
  const [scoringFunction] = await sql`
    SELECT pg_get_functiondef(
      to_regprocedure('score_match_predictions()')
    ) AS def
  `;
  const runs = await sql`
    SELECT id, provider, status, matches_seen AS "matchesSeen",
           matches_updated AS "matchesUpdated",
           LEFT(COALESCE(detail, ''), 200) AS detail,
           started_at AS "startedAt", finished_at AS "finishedAt"
    FROM sync_runs
    ORDER BY started_at DESC
    LIMIT 12
  `;
  const recentMatches = await sql`
    SELECT id, status, minute, home_score AS "homeScore",
           away_score AS "awayScore", kickoff_at AS "kickoffAt",
           updated_at AS "updatedAt"
    FROM matches
    WHERE status IN ('LIVE', 'PAUSED')
       OR updated_at > now() - interval '3 hours'
    ORDER BY kickoff_at
    LIMIT 12
  `;

  return json({
    alreadyApplied,
    appliedNow: !alreadyApplied,
    migrations,
    scoringFunction: scoringFunction?.def ?? null,
    runs,
    recentMatches,
  });
};

export const config: Config = {
  path: "/api/admin/migrate",
  method: "POST",
};
