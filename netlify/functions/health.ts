import type { Config } from "@netlify/functions";
import { db } from "./_shared/db";
import { json } from "./_shared/http";

const EXPECTED_MATCH_COUNT = 104;
const STALE_AFTER_SECONDS = 8 * 60;

export default async () => {
  try {
    const sql = db();
    const [health] = await sql`
      WITH latest_sync AS (
        SELECT
          provider,
          status,
          started_at,
          EXTRACT(
            EPOCH FROM now() - COALESCE(finished_at, started_at)
          )::int AS run_age_seconds
        FROM sync_runs
        ORDER BY started_at DESC
        LIMIT 1
      ),
      latest_success AS (
        SELECT
          provider,
          matches_seen,
          matches_updated,
          EXTRACT(EPOCH FROM now() - finished_at)::int AS success_age_seconds
        FROM sync_runs
        WHERE status = 'SUCCESS'
        ORDER BY finished_at DESC
        LIMIT 1
      )
      SELECT
        now() AS "checkedAt",
        (SELECT COUNT(*)::int FROM matches) AS "matchCount",
        COALESCE(
          (SELECT provider FROM latest_sync),
          (SELECT provider FROM latest_success),
          ''
        ) AS provider,
        COALESCE((SELECT status FROM latest_sync), 'MISSING') AS "syncStatus",
        COALESCE((SELECT run_age_seconds FROM latest_sync), 2147483647)::int
          AS "runAgeSeconds",
        COALESCE((SELECT matches_seen FROM latest_success), 0)::int
          AS "matchesSeen",
        COALESCE((SELECT matches_updated FROM latest_success), 0)::int
          AS "matchesUpdated",
        COALESCE((SELECT success_age_seconds FROM latest_success), 2147483647)::int
          AS "syncAgeSeconds",
        (
          SELECT COUNT(*)::int
          FROM predictions p
          JOIN matches m ON m.id = p.match_id
          WHERE m.status = 'FINISHED'
            AND (
              m.home_score IS NULL OR
              m.away_score IS NULL OR
              p.points IS DISTINCT FROM prediction_points(
                p.home_score,
                p.away_score,
                m.home_score,
                m.away_score
              )
            )
        ) AS "pointMismatches",
        (
          SELECT COUNT(*)::int
          FROM predictions p
          JOIN matches m ON m.id = p.match_id
          WHERE m.status <> 'FINISHED' AND p.points IS NOT NULL
        ) AS "unfinishedWithPoints",
        (
          SELECT COUNT(*)::int
          FROM matches
          WHERE status = 'FINISHED'
            AND (home_score IS NULL OR away_score IS NULL)
        ) AS "finishedWithoutScores",
        (
          SELECT COUNT(*)::int
          FROM matches
          WHERE status = 'SCHEDULED'
            AND kickoff_at < now() - interval '4 hours'
        ) AS "pastScheduled"
    `;

    const runHealthy =
      health?.syncStatus === "SUCCESS" ||
      (health?.syncStatus === "RUNNING" &&
        Number(health.runAgeSeconds) <= 60) ||
      // A transient provider failure should not flip monitoring while a
      // recent success keeps the data fresh; staleness below still catches
      // sustained outages.
      (health?.syncStatus === "FAILED" &&
        Number(health.syncAgeSeconds) <= STALE_AFTER_SECONDS);
    const syncHealthy =
      runHealthy &&
      Number(health.syncAgeSeconds) <= STALE_AFTER_SECONDS &&
      Number(health.matchesSeen) >= EXPECTED_MATCH_COUNT &&
      Number(health.matchesUpdated) >= EXPECTED_MATCH_COUNT;
    const integrityHealthy =
      Number(health?.matchCount) === EXPECTED_MATCH_COUNT &&
      Number(health?.pointMismatches) === 0 &&
      Number(health?.unfinishedWithPoints) === 0 &&
      Number(health?.finishedWithoutScores) === 0 &&
      Number(health?.pastScheduled) === 0;
    const healthy = syncHealthy && integrityHealthy;

    return json(
      {
        healthy,
        ...health,
      },
      healthy ? 200 : 503,
    );
  } catch (error) {
    console.error(
      "Health check failed:",
      error instanceof Error ? error.message : String(error),
    );
    return json(
      {
        healthy: false,
        error: "HEALTH_CHECK_FAILED",
        checkedAt: new Date().toISOString(),
      },
      503,
    );
  }
};

export const config: Config = {
  path: "/api/health",
  method: "GET",
};
