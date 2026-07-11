import { timingSafeEqual } from "node:crypto";
import type { Config } from "@netlify/functions";
import { z } from "zod";
import { db } from "./_shared/db";
import { json } from "./_shared/http";
import {
  publicApiMinute,
  publicApiStatus,
  publicApiTiebreakerState,
  scoreValue,
  statusNeedsScores,
  type PublicApiMatch,
} from "./_shared/sync-football";
import { MIN_FINISH_AFTER_KICKOFF_MS } from "../../src/lib/game";

const MIGRATIONS = [
  {
    name: "003_live_score_updates.sql",
    sql: `
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
`,
  },
  {
    name: "004_knockout_tiebreakers.sql",
    sql: `
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS home_penalty_score integer,
ADD COLUMN IF NOT EXISTS away_penalty_score integer,
ADD COLUMN IF NOT EXISTS winner_side varchar(8);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_home_penalty_score_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_home_penalty_score_valid
CHECK (home_penalty_score IS NULL OR home_penalty_score BETWEEN 0 AND 30);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_away_penalty_score_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_away_penalty_score_valid
CHECK (away_penalty_score IS NULL OR away_penalty_score BETWEEN 0 AND 30);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_penalty_scores_pair_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_penalty_scores_pair_valid
CHECK (
  (
    home_penalty_score IS NULL
    AND away_penalty_score IS NULL
  )
  OR
  (
    status = 'FINISHED'
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL
    AND home_score = away_score
    AND home_penalty_score IS NOT NULL
    AND away_penalty_score IS NOT NULL
    AND home_penalty_score <> away_penalty_score
  )
);

ALTER TABLE matches
DROP CONSTRAINT IF EXISTS matches_winner_side_valid;

ALTER TABLE matches
ADD CONSTRAINT matches_winner_side_valid
CHECK (
  winner_side IS NULL
  OR
  (
    status = 'FINISHED'
    AND winner_side IN ('home', 'away')
    AND home_score IS NOT NULL
    AND away_score IS NOT NULL
    AND (
      (
        home_score > away_score
        AND winner_side = 'home'
      )
      OR
      (
        away_score > home_score
        AND winner_side = 'away'
      )
      OR
      (
        home_score = away_score
        AND (
          (
            home_penalty_score IS NULL
            AND away_penalty_score IS NULL
          )
          OR
          (
            home_penalty_score > away_penalty_score
            AND winner_side = 'home'
          )
          OR
          (
            away_penalty_score > home_penalty_score
            AND winner_side = 'away'
          )
        )
      )
    )
  )
);
`,
  },
] as const;

const bodySchema = z
  .object({
    action: z.enum(["migrate", "repair-match"]).default("migrate"),
    matchId: z.number().int().positive().optional(),
  })
  .refine(
    (body) => body.action !== "repair-match" || body.matchId !== undefined,
    { message: "matchId is required for repair-match" },
  );

type Sql = ReturnType<typeof db>;

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

async function ensureMigrations(sql: Sql) {
  const appliedNow: string[] = [];
  const alreadyApplied: string[] = [];

  for (const migration of MIGRATIONS) {
    const applied = (await sql`
      SELECT name FROM schema_migrations WHERE name = ${migration.name}
    `) as { name: string }[];
    if (applied.length) {
      alreadyApplied.push(migration.name);
      continue;
    }

    await sql.query(migration.sql);
    await sql`
      INSERT INTO schema_migrations (name)
      VALUES (${migration.name})
      ON CONFLICT (name) DO NOTHING
    `;
    appliedNow.push(migration.name);
  }

  return { alreadyApplied, appliedNow };
}

async function migrationReport(sql: Sql) {
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
           away_score AS "awayScore",
           home_penalty_score AS "homePenaltyScore",
           away_penalty_score AS "awayPenaltyScore",
           winner_side AS "winnerSide",
           kickoff_at AS "kickoffAt",
           updated_at AS "updatedAt"
    FROM matches
    WHERE status IN ('LIVE', 'PAUSED')
       OR updated_at > now() - interval '3 hours'
    ORDER BY kickoff_at
    LIMIT 12
  `;
  return { migrations, scoringFunction: scoringFunction?.def ?? null, runs, recentMatches };
}

// Writes the provider's current truth for one match, deliberately bypassing
// the sticky-FINISHED rule, so a glitched final can be rolled back. The
// score_match_predictions trigger recomputes or clears points.
async function repairMatch(sql: Sql, matchId: number) {
  const response = await fetch("https://worldcup26.ir/get/games", {
    signal: AbortSignal.timeout(22_000),
  });
  if (!response.ok) {
    return json(
      { error: `Provider returned ${response.status}`, code: "PROVIDER_ERROR" },
      502,
    );
  }
  const payload = (await response.json()) as { games?: PublicApiMatch[] };
  const game = (payload.games ?? []).find(
    (item) => Number(item.id) === matchId,
  );
  if (!game) {
    return json(
      { error: "Match not present in provider feed.", code: "MATCH_NOT_FOUND" },
      404,
    );
  }

  const status = publicApiStatus(game);
  const homeScore = statusNeedsScores(status) ? scoreValue(game.home_score) : null;
  const awayScore = statusNeedsScores(status) ? scoreValue(game.away_score) : null;
  if (statusNeedsScores(status) && (homeScore === null || awayScore === null)) {
    return json(
      { error: "Provider feed has inconsistent scores.", code: "INVALID_PROVIDER_STATE" },
      422,
    );
  }
  const minute = publicApiMinute(game.time_elapsed);
  const [existing] = await sql`
    SELECT kickoff_at AS "kickoffAt",
           home_team_id AS "homeTeamId",
           away_team_id AS "awayTeamId"
    FROM matches
    WHERE id = ${matchId}
  `;
  if (!existing) {
    return json(
      { error: "Match does not exist locally.", code: "MATCH_NOT_FOUND" },
      404,
    );
  }
  const providerHomeTeamId = Number(game.home_team_id) || null;
  const providerAwayTeamId = Number(game.away_team_id) || null;
  const homeTeamId = providerHomeTeamId ?? (Number(existing.homeTeamId) || null);
  const awayTeamId = providerAwayTeamId ?? (Number(existing.awayTeamId) || null);
  const tiebreaker = publicApiTiebreakerState(
    game,
    status,
    homeScore,
    awayScore,
    homeTeamId,
    awayTeamId,
  );

  const kickoff = new Date(existing.kickoffAt as string).getTime();
  if (
    (status === "LIVE" || status === "PAUSED") &&
    Number.isFinite(kickoff) &&
    Date.now() < kickoff
  ) {
    return json(
      {
        error:
          "Provider reports an active match before kickoff; refusing to lock predictions early.",
        code: "PREMATURE_ACTIVE",
      },
      422,
    );
  }

  // repair-match deliberately bypasses the sticky-FINISHED rule so a glitched
  // final can be rolled back, but it must never go the other way and lock in a
  // final that is physically impossible (before a match could have ended). That
  // is always a provider glitch, never something an operator wants to persist.
  if (status === "FINISHED") {
    if (
      Number.isFinite(kickoff) &&
      Date.now() < kickoff + MIN_FINISH_AFTER_KICKOFF_MS
    ) {
      return json(
        {
          error:
            "Provider reports an impossible early FINISHED; refusing to lock a glitched final.",
          code: "PREMATURE_FINISH",
        },
        422,
      );
    }
  }

  const [match] = await sql`
    UPDATE matches
    SET
      status = ${status},
      home_score = ${homeScore},
      away_score = ${awayScore},
      home_penalty_score = ${tiebreaker.homePenaltyScore},
      away_penalty_score = ${tiebreaker.awayPenaltyScore},
      winner_side = ${tiebreaker.winnerSide},
      minute = ${minute},
      source_updated_at = now(),
      updated_at = now()
    WHERE id = ${matchId}
    RETURNING id, status, minute,
              home_score AS "homeScore", away_score AS "awayScore",
              home_penalty_score AS "homePenaltyScore",
              away_penalty_score AS "awayPenaltyScore",
              winner_side AS "winnerSide",
              kickoff_at AS "kickoffAt", updated_at AS "updatedAt"
  `;
  if (!match) {
    return json(
      { error: "Match does not exist locally.", code: "MATCH_NOT_FOUND" },
      404,
    );
  }

  const [predictions] = await sql`
    SELECT COUNT(*)::int AS total, COUNT(points)::int AS scored
    FROM predictions
    WHERE match_id = ${matchId}
  `;

  return json({
    action: "repair-match",
    provider: {
      id: game.id,
      finished: game.finished,
      timeElapsed: game.time_elapsed,
      homeScore: game.home_score,
      awayScore: game.away_score,
      homePenaltyScore: game.home_penalty_score ?? game.home_penalty,
      awayPenaltyScore: game.away_penalty_score ?? game.away_penalty,
      winner: game.winner_side ?? game.winner ?? game.winner_team_id,
    },
    match,
    predictions,
  });
}

export default async (request: Request) => {
  if (!authorized(request)) {
    return new Response("Not found", { status: 404 });
  }

  const rawBody = await request.text();
  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Body must be JSON.", code: "INVALID_BODY" }, 400);
    }
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.message, code: "INVALID_BODY" }, 400);
  }

  const sql = db();
  const migration = await ensureMigrations(sql);

  if (parsed.data.action === "repair-match") {
    const result = await repairMatch(sql, parsed.data.matchId as number);
    return result;
  }

  return json({
    ...migration,
    ...(await migrationReport(sql)),
  });
};

export const config: Config = {
  path: "/api/admin/migrate",
  method: "POST",
};
