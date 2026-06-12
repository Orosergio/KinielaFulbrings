import { db } from "./db";
import {
  safeProviderState,
  scoreStateChanged,
} from "../../../src/lib/game";

const EXPECTED_MATCH_COUNT = 104;
const FETCH_TIMEOUT_MS = 10_000;

type ProviderMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number;
  homeTeam: { tla?: string | null };
  awayTeam: { tla?: string | null };
  score: {
    fullTime?: { home?: number | null; away?: number | null };
    halfTime?: { home?: number | null; away?: number | null };
  };
};

type LocalMatch = {
  id: number;
  providerMatchId: number | null;
  kickoffAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeCode: string | null;
  awayCode: string | null;
};

function normalizeStatus(status: string) {
  switch (status) {
    case "IN_PLAY":
      return "LIVE";
    case "PAUSED":
      return "PAUSED";
    case "FINISHED":
    case "AWARDED":
      return "FINISHED";
    case "POSTPONED":
      return "POSTPONED";
    case "CANCELLED":
    case "SUSPENDED":
      return "CANCELLED";
    default:
      return "SCHEDULED";
  }
}

function sameFixture(provider: ProviderMatch, local: LocalMatch) {
  if (local.providerMatchId === provider.id) return true;
  if (!provider.homeTeam.tla || !provider.awayTeam.tla) return false;

  const timeDifference = Math.abs(
    new Date(provider.utcDate).getTime() - new Date(local.kickoffAt).getTime(),
  );
  if (
    timeDifference <= 12 * 60 * 60 * 1000 &&
    provider.homeTeam.tla === local.homeCode &&
    provider.awayTeam.tla === local.awayCode
  ) {
    return true;
  }

  return (
    local.homeCode === null &&
    local.awayCode === null &&
    timeDifference <= 2 * 60 * 60 * 1000
  );
}

function scoreValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 && score <= 30 ? score : null;
}

function statusNeedsScores(status: string) {
  return status === "LIVE" || status === "PAUSED" || status === "FINISHED";
}

function requireScores(
  matchId: number,
  status: string,
  homeScore: number | null,
  awayScore: number | null,
) {
  if (
    statusNeedsScores(status) &&
    (homeScore === null || awayScore === null)
  ) {
    throw new Error(`INVALID_SCORE_PAYLOAD:${matchId}`);
  }
}

type Sql = ReturnType<typeof db>;

async function startSyncRun(sql: Sql, provider: string) {
  await sql`
    UPDATE sync_runs
    SET
      status = 'FAILED',
      detail = COALESCE(detail, 'Recovered abandoned synchronization.'),
      finished_at = COALESCE(finished_at, now())
    WHERE status = 'RUNNING'
      AND started_at < now() - interval '45 seconds'
  `;

  const [run] = await sql`
    INSERT INTO sync_runs (provider, status)
    VALUES (${provider}, 'RUNNING')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;
  return run as { id: number } | undefined;
}

async function verifySyncIntegrity(
  sql: Sql,
  seen: number,
  matched: number,
) {
  if (seen < EXPECTED_MATCH_COUNT || matched < EXPECTED_MATCH_COUNT) {
    throw new Error(
      `INCOMPLETE_PROVIDER_DATA:${seen}/${matched}/${EXPECTED_MATCH_COUNT}`,
    );
  }

  const [integrity] = await sql`
    SELECT
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

  const failures = Object.entries(integrity ?? {}).filter(
    ([, value]) => Number(value) !== 0,
  );
  if (failures.length) {
    throw new Error(
      `SYNC_INTEGRITY_FAILED:${failures
        .map(([key, value]) => `${key}=${value}`)
        .join(",")}`,
    );
  }
}

export async function syncFootballData() {
  const token = Netlify.env.get("FOOTBALL_DATA_API_TOKEN");
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_TOKEN is not configured");
  }

  const sql = db();
  const run = await startSyncRun(sql, "football-data.org");
  if (!run) {
    return {
      provider: "football-data.org",
      skipped: true,
      reason: "Another synchronization is already running.",
    };
  }

  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      {
        headers: { "X-Auth-Token": token },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      throw new Error(`football-data.org returned ${response.status}`);
    }

    const payload = (await response.json()) as { matches?: ProviderMatch[] };
    const providerMatches = payload.matches ?? [];
    const localMatches = (await sql`
      SELECT
        m.id,
        m.provider_match_id AS "providerMatchId",
        m.kickoff_at AS "kickoffAt",
        m.status,
        m.home_score AS "homeScore",
        m.away_score AS "awayScore",
        m.minute,
        m.home_team_id AS "homeTeamId",
        m.away_team_id AS "awayTeamId",
        home.fifa_code AS "homeCode",
        away.fifa_code AS "awayCode"
      FROM matches m
      LEFT JOIN teams home ON home.id = m.home_team_id
      LEFT JOIN teams away ON away.id = m.away_team_id
    `) as LocalMatch[];

    const providerIds = new Set<number>();
    const matchedLocalIds = new Set<number>();
    let changed = 0;
    for (const provider of providerMatches) {
      if (providerIds.has(provider.id)) {
        throw new Error(`DUPLICATE_PROVIDER_MATCH:${provider.id}`);
      }
      providerIds.add(provider.id);
      const local = localMatches.find(
        (candidate) =>
          !matchedLocalIds.has(candidate.id) && sameFixture(provider, candidate),
      );
      if (!local) continue;
      matchedLocalIds.add(local.id);

      const reportedStatus = normalizeStatus(provider.status);
      const reportedHomeScore = statusNeedsScores(reportedStatus)
        ? scoreValue(
            provider.score.fullTime?.home ?? provider.score.halfTime?.home,
          )
        : null;
      const reportedAwayScore = statusNeedsScores(reportedStatus)
        ? scoreValue(
            provider.score.fullTime?.away ?? provider.score.halfTime?.away,
          )
        : null;
      requireScores(
        provider.id,
        reportedStatus,
        reportedHomeScore,
        reportedAwayScore,
      );
      const nextState = safeProviderState(local, {
        status: reportedStatus,
        homeScore: reportedHomeScore,
        awayScore: reportedAwayScore,
      });
      const minute = provider.minute ?? null;
      const metadataChanged =
        local.providerMatchId !== provider.id ||
        new Date(local.kickoffAt).getTime() !==
          new Date(provider.utcDate).getTime() ||
        local.minute !== minute ||
        (!!provider.homeTeam.tla && provider.homeTeam.tla !== local.homeCode) ||
        (!!provider.awayTeam.tla && provider.awayTeam.tla !== local.awayCode);
      const stateChanged = scoreStateChanged(local, nextState);

      if (!stateChanged && !metadataChanged) continue;

      if (!stateChanged) {
        await sql`
          UPDATE matches
          SET
            provider_match_id = ${provider.id},
            kickoff_at = ${provider.utcDate},
            home_team_id = COALESCE(
              (SELECT id FROM teams WHERE fifa_code = ${provider.homeTeam.tla ?? ""}),
              home_team_id
            ),
            away_team_id = COALESCE(
              (SELECT id FROM teams WHERE fifa_code = ${provider.awayTeam.tla ?? ""}),
              away_team_id
            ),
            minute = ${minute},
            source_updated_at = now(),
            updated_at = now()
          WHERE id = ${local.id}
        `;
        changed += 1;
        continue;
      }

      await sql`
        UPDATE matches
        SET
          provider_match_id = ${provider.id},
          kickoff_at = ${provider.utcDate},
          home_team_id = COALESCE(
            (SELECT id FROM teams WHERE fifa_code = ${provider.homeTeam.tla ?? ""}),
            home_team_id
          ),
          away_team_id = COALESCE(
            (SELECT id FROM teams WHERE fifa_code = ${provider.awayTeam.tla ?? ""}),
            away_team_id
          ),
          status = ${nextState.status},
          minute = ${minute},
          home_score = ${nextState.homeScore},
          away_score = ${nextState.awayScore},
          source_updated_at = now(),
          updated_at = now()
        WHERE id = ${local.id}
      `;
      changed += 1;
    }

    const updated = matchedLocalIds.size;
    await verifySyncIntegrity(sql, providerIds.size, updated);
    await sql`
      UPDATE sync_runs
      SET
        status = 'SUCCESS',
        matches_seen = ${providerIds.size},
        matches_updated = ${updated},
        detail = ${JSON.stringify({
          expectedMatches: EXPECTED_MATCH_COUNT,
          complete: providerIds.size >= EXPECTED_MATCH_COUNT && updated >= EXPECTED_MATCH_COUNT,
          changed,
        })},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    return {
      provider: "football-data.org",
      skipped: false,
      seen: providerIds.size,
      updated,
      changed,
      expected: EXPECTED_MATCH_COUNT,
      complete: providerIds.size >= EXPECTED_MATCH_COUNT && updated >= EXPECTED_MATCH_COUNT,
    };
  } catch (error) {
    await sql`
      UPDATE sync_runs
      SET
        status = 'FAILED',
        detail = ${error instanceof Error ? error.message : String(error)},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    throw error;
  }
}

type PublicApiMatch = {
  id: string;
  home_team_id?: string;
  away_team_id?: string;
  home_score?: string;
  away_score?: string;
  finished?: string;
  time_elapsed?: string;
};

function publicApiStatus(match: PublicApiMatch) {
  if (String(match.finished ?? "").toUpperCase() === "TRUE") return "FINISHED";
  const elapsed = String(match.time_elapsed ?? "").toLowerCase();
  if (elapsed === "notstarted" || elapsed === "") return "SCHEDULED";
  if (elapsed.includes("postpone")) return "POSTPONED";
  if (elapsed.includes("cancel")) return "CANCELLED";
  if (elapsed.includes("half") || elapsed.includes("pause")) return "PAUSED";
  return "LIVE";
}

function publicApiMinute(value?: string) {
  const minute = Number.parseInt(String(value ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(minute) ? minute : null;
}

export async function syncPublicWorldCup() {
  const sql = db();
  const run = await startSyncRun(sql, "worldcup26.ir");
  if (!run) {
    return {
      provider: "worldcup26.ir",
      skipped: true,
      reason: "Another synchronization is already running.",
    };
  }

  try {
    const response = await fetch("https://worldcup26.ir/get/games", {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`worldcup26.ir returned ${response.status}`);
    }
    const payload = (await response.json()) as { games?: PublicApiMatch[] };
    const games = payload.games ?? [];
    const localMatches = (await sql`
      SELECT
        id,
        provider_match_id AS "providerMatchId",
        kickoff_at AS "kickoffAt",
        status,
        home_score AS "homeScore",
        away_score AS "awayScore",
        minute,
        home_team_id AS "homeTeamId",
        away_team_id AS "awayTeamId",
        NULL::text AS "homeCode",
        NULL::text AS "awayCode"
      FROM matches
    `) as LocalMatch[];
    const localMatchesById = new Map(
      localMatches.map((match) => [match.id, match]),
    );
    const providerIds = new Set<number>();
    const matchedLocalIds = new Set<number>();
    let changed = 0;

    for (const game of games) {
      const matchId = Number(game.id);
      if (!Number.isInteger(matchId) || matchId <= 0) continue;
      if (providerIds.has(matchId)) {
        throw new Error(`DUPLICATE_PROVIDER_MATCH:${matchId}`);
      }
      providerIds.add(matchId);
      const local = localMatchesById.get(matchId);
      if (!local) continue;
      matchedLocalIds.add(local.id);
      const reportedStatus = publicApiStatus(game);
      const reportedHomeScore = statusNeedsScores(reportedStatus)
        ? scoreValue(game.home_score)
        : null;
      const reportedAwayScore = statusNeedsScores(reportedStatus)
        ? scoreValue(game.away_score)
        : null;
      requireScores(
        matchId,
        reportedStatus,
        reportedHomeScore,
        reportedAwayScore,
      );
      const nextState = safeProviderState(local, {
        status: reportedStatus,
        homeScore: reportedHomeScore,
        awayScore: reportedAwayScore,
      });
      const minute = publicApiMinute(game.time_elapsed);
      const homeTeamId = Number(game.home_team_id) || null;
      const awayTeamId = Number(game.away_team_id) || null;
      const metadataChanged =
        local.providerMatchId !== matchId ||
        local.minute !== minute ||
        (homeTeamId !== null && local.homeTeamId !== homeTeamId) ||
        (awayTeamId !== null && local.awayTeamId !== awayTeamId);
      const stateChanged = scoreStateChanged(local, nextState);

      if (!stateChanged && !metadataChanged) continue;

      if (!stateChanged) {
        const result = await sql`
          UPDATE matches
          SET
            provider_match_id = ${matchId},
            home_team_id = COALESCE(
              ${homeTeamId}::integer,
              home_team_id
            ),
            away_team_id = COALESCE(
              ${awayTeamId}::integer,
              away_team_id
            ),
            minute = ${minute},
            source_updated_at = now(),
            updated_at = now()
          WHERE id = ${matchId}
          RETURNING id
        `;
        if (result.length) changed += 1;
        continue;
      }

      const result = await sql`
        UPDATE matches
        SET
          provider_match_id = ${matchId},
          home_team_id = COALESCE(
            ${homeTeamId}::integer,
            home_team_id
          ),
          away_team_id = COALESCE(
            ${awayTeamId}::integer,
            away_team_id
          ),
          status = ${nextState.status},
          minute = ${minute},
          home_score = ${nextState.homeScore},
          away_score = ${nextState.awayScore},
          source_updated_at = now(),
          updated_at = now()
        WHERE id = ${matchId}
        RETURNING id
      `;
      if (result.length) changed += 1;
    }

    const updated = matchedLocalIds.size;
    await verifySyncIntegrity(sql, providerIds.size, updated);
    await sql`
      UPDATE sync_runs
      SET
        status = 'SUCCESS',
        matches_seen = ${providerIds.size},
        matches_updated = ${updated},
        detail = ${JSON.stringify({
          expectedMatches: EXPECTED_MATCH_COUNT,
          complete: providerIds.size >= EXPECTED_MATCH_COUNT && updated >= EXPECTED_MATCH_COUNT,
          changed,
        })},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    return {
      provider: "worldcup26.ir",
      seen: providerIds.size,
      updated,
      changed,
      expected: EXPECTED_MATCH_COUNT,
      complete: providerIds.size >= EXPECTED_MATCH_COUNT && updated >= EXPECTED_MATCH_COUNT,
    };
  } catch (error) {
    await sql`
      UPDATE sync_runs
      SET
        status = 'FAILED',
        detail = ${error instanceof Error ? error.message : String(error)},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    throw error;
  }
}

export async function syncMatchData() {
  const sql = db();
  const [recent] = await sql`
    SELECT finished_at AS "finishedAt"
    FROM sync_runs
    WHERE status = 'SUCCESS'
      AND finished_at >= now() - interval '60 seconds'
    ORDER BY finished_at DESC
    LIMIT 1
  `;
  if (recent) {
    return {
      provider: "recent-success",
      skipped: true,
      reason: "A successful synchronization finished less than 60 seconds ago.",
      finishedAt: recent.finishedAt,
    };
  }

  if (!Netlify.env.get("FOOTBALL_DATA_API_TOKEN")) {
    return syncPublicWorldCup();
  }

  try {
    return await syncFootballData();
  } catch (error) {
    console.error("Primary football provider failed, using fallback:", error);
    const fallback = await syncPublicWorldCup();
    return {
      ...fallback,
      fallbackFrom: "football-data.org",
    };
  }
}
