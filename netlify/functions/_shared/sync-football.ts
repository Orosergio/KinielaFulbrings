import { db } from "./db";
import {
  resolveProviderState,
  scoreStateChanged,
} from "../../../src/lib/game";
import type { MatchWinnerSide } from "../../../src/types";

const EXPECTED_MATCH_COUNT = 104;
const PRIMARY_FETCH_TIMEOUT_MS = 10_000;
const PUBLIC_FETCH_TIMEOUT_MS = 22_000;
const PUBLIC_FETCH_TOTAL_BUDGET_MS = 26_000;
const PUBLIC_FETCH_RETRY_DELAY_MS = 400;
const PUBLIC_PROVIDER_URL = "https://worldcup26.ir/get/games";

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
    penalties?: { home?: number | null; away?: number | null };
    penaltyShootout?: { home?: number | null; away?: number | null };
    winner?: unknown;
  };
};

type LocalMatch = {
  id: number;
  providerMatchId: number | string | null;
  kickoffAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerSide: MatchWinnerSide | null;
  minute: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeCode: string | null;
  awayCode: string | null;
};

function sameProviderMatchId(
  localProviderMatchId: number | string | null,
  providerMatchId: number,
) {
  return (
    localProviderMatchId !== null &&
    Number(localProviderMatchId) === providerMatchId
  );
}

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
  if (sameProviderMatchId(local.providerMatchId, provider.id)) return true;
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

export function scoreValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 && score <= 30 ? score : null;
}

function firstScoreValue(values: unknown[]) {
  for (const value of values) {
    const score = scoreValue(value);
    if (score !== null) return score;
  }
  return null;
}

export function providerWinnerSide(value: unknown): MatchWinnerSide | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (
    normalized === "home" ||
    normalized === "home_team" ||
    normalized === "home_team_winner"
  ) {
    return "home";
  }
  if (
    normalized === "away" ||
    normalized === "away_team" ||
    normalized === "away_team_winner"
  ) {
    return "away";
  }
  return null;
}

function scoreWinnerSide(
  homeScore: number | null,
  awayScore: number | null,
): MatchWinnerSide | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return null;
}

export function matchTiebreakerState(
  status: string,
  homeScore: number | null,
  awayScore: number | null,
  homePenaltyScore: number | null,
  awayPenaltyScore: number | null,
  winnerSide: MatchWinnerSide | null,
): {
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winnerSide: MatchWinnerSide | null;
} {
  const scoreWinner = scoreWinnerSide(homeScore, awayScore);
  if (status !== "FINISHED" || homeScore === null || awayScore === null) {
    return {
      homePenaltyScore: null,
      awayPenaltyScore: null,
      winnerSide: null,
    };
  }
  if (scoreWinner) {
    return {
      homePenaltyScore: null,
      awayPenaltyScore: null,
      winnerSide: scoreWinner,
    };
  }
  if (
    homePenaltyScore !== null &&
    awayPenaltyScore !== null &&
    homePenaltyScore !== awayPenaltyScore
  ) {
    return {
      homePenaltyScore,
      awayPenaltyScore,
      winnerSide: homePenaltyScore > awayPenaltyScore ? "home" : "away",
    };
  }
  return {
    homePenaltyScore: null,
    awayPenaltyScore: null,
    winnerSide,
  };
}

export function statusNeedsScores(status: string) {
  return status === "LIVE" || status === "PAUSED" || status === "FINISHED";
}

// football-data.org sends `minute` as a raw integer; the public provider sends
// strings parsed by publicApiMinute. Both must satisfy matches_minute_valid
// (NULL or 0..180) or the write aborts the whole sync run, so clamp anything
// out of range or non-integer to null.
export function clampMinute(value: number | null | undefined) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 180
    ? value
    : null;
}

type PublicFetchOptions = {
  attemptTimeoutMs?: number;
  totalBudgetMs?: number;
  retryDelayMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
};

function retryableProviderStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function fetchPublicProvider(
  fetcher: typeof fetch = fetch,
  options: PublicFetchOptions = {},
) {
  const attemptTimeoutMs =
    options.attemptTimeoutMs ?? PUBLIC_FETCH_TIMEOUT_MS;
  const totalBudgetMs =
    options.totalBudgetMs ?? PUBLIC_FETCH_TOTAL_BUDGET_MS;
  const retryDelayMs =
    options.retryDelayMs ?? PUBLIC_FETCH_RETRY_DELAY_MS;
  const now = options.now ?? Date.now;
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const startedAt = now();
  let lastError: unknown = new Error("Public provider fetch failed");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = totalBudgetMs - (now() - startedAt);
    if (remainingMs <= 0) break;

    let response: Response | null = null;
    try {
      response = await fetcher(PUBLIC_PROVIDER_URL, {
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(attemptTimeoutMs, remainingMs)),
        ),
      });
    } catch (error) {
      lastError = error;
    }
    if (response?.ok) return response;
    if (response) {
      lastError = new Error(`worldcup26.ir returned ${response.status}`);
      if (!retryableProviderStatus(response.status)) throw lastError;
    }

    if (attempt === 1) break;
    const retryBudgetMs = totalBudgetMs - (now() - startedAt);
    if (retryBudgetMs <= retryDelayMs) break;
    if (retryDelayMs > 0) await sleep(retryDelayMs);
  }

  throw lastError;
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
            p.score_points IS DISTINCT FROM prediction_points(
              p.home_score,
              p.away_score,
              m.home_score,
              m.away_score
            ) OR
            p.advancement_points IS DISTINCT FROM prediction_advancement_points(
              p.advancing_side,
              m.winner_side,
              m.stage
            ) OR
            p.points IS DISTINCT FROM prediction_total_points(
              p.home_score,
              p.away_score,
              p.advancing_side,
              m.home_score,
              m.away_score,
              m.winner_side,
              m.stage
            )
          )
      ) AS "pointMismatches",
      (
        SELECT COUNT(*)::int
        FROM predictions p
        JOIN matches m ON m.id = p.match_id
        WHERE m.status <> 'FINISHED'
          AND (
            p.points IS NOT NULL OR
            p.score_points IS NOT NULL OR
            p.advancement_points IS NOT NULL
          )
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
      ) AS "pastScheduled",
      (
        SELECT COUNT(*)::int
        FROM matches
        WHERE status IN ('LIVE', 'PAUSED')
          AND kickoff_at > now()
      ) AS "futureActive"
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
        signal: AbortSignal.timeout(PRIMARY_FETCH_TIMEOUT_MS),
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
        m.home_penalty_score AS "homePenaltyScore",
        m.away_penalty_score AS "awayPenaltyScore",
        m.winner_side AS "winnerSide",
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
      const tiebreaker = matchTiebreakerState(
        reportedStatus,
        reportedHomeScore,
        reportedAwayScore,
        firstScoreValue([
          provider.score.penalties?.home,
          provider.score.penaltyShootout?.home,
        ]),
        firstScoreValue([
          provider.score.penalties?.away,
          provider.score.penaltyShootout?.away,
        ]),
        providerWinnerSide(provider.score.winner),
      );
      const nextState = resolveProviderState(local, {
        status: reportedStatus,
        homeScore: reportedHomeScore,
        awayScore: reportedAwayScore,
        ...tiebreaker,
      });
      const minute = clampMinute(provider.minute);
      const metadataChanged =
        !sameProviderMatchId(local.providerMatchId, provider.id) ||
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
          home_penalty_score = ${nextState.homePenaltyScore},
          away_penalty_score = ${nextState.awayPenaltyScore},
          winner_side = ${nextState.winnerSide},
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

export type PublicApiMatch = {
  id: string;
  home_team_id?: string;
  away_team_id?: string;
  home_score?: string;
  away_score?: string;
  home_penalty_score?: string;
  away_penalty_score?: string;
  home_penalty?: string;
  away_penalty?: string;
  home_penalties?: string;
  away_penalties?: string;
  penalty_home?: string;
  penalty_away?: string;
  penalties_home?: string;
  penalties_away?: string;
  winner?: string;
  winner_side?: string;
  winner_team_id?: string;
  finished?: string;
  time_elapsed?: string;
};

export function publicApiStatus(match: PublicApiMatch) {
  if (String(match.finished ?? "").toUpperCase() === "TRUE") return "FINISHED";
  const elapsed = String(match.time_elapsed ?? "").toLowerCase();
  if (elapsed === "notstarted" || elapsed === "") return "SCHEDULED";
  if (elapsed.includes("postpone")) return "POSTPONED";
  if (elapsed.includes("cancel")) return "CANCELLED";
  if (elapsed.includes("half") || elapsed.includes("pause")) return "PAUSED";
  return "LIVE";
}

export function publicApiMinute(value?: string) {
  // "45+2" must read as 45, never 452: matches_minute_valid caps minute at 180
  // and a violation aborts the whole sync run.
  const leadingDigits = /^\s*(\d{1,3})/.exec(String(value ?? ""));
  if (!leadingDigits) return null;
  return clampMinute(Number.parseInt(leadingDigits[1], 10));
}

export function publicApiTiebreakerState(
  match: PublicApiMatch,
  status: string,
  homeScore: number | null,
  awayScore: number | null,
  homeTeamId: number | null,
  awayTeamId: number | null,
) {
  const winnerTeamId = Number(match.winner_team_id) || null;
  const winnerSideFromTeam =
    winnerTeamId !== null && winnerTeamId === homeTeamId
      ? "home"
      : winnerTeamId !== null && winnerTeamId === awayTeamId
        ? "away"
        : null;
  return matchTiebreakerState(
    status,
    homeScore,
    awayScore,
    firstScoreValue([
      match.home_penalty_score,
      match.home_penalty,
      match.home_penalties,
      match.penalty_home,
      match.penalties_home,
    ]),
    firstScoreValue([
      match.away_penalty_score,
      match.away_penalty,
      match.away_penalties,
      match.penalty_away,
      match.penalties_away,
    ]),
    providerWinnerSide(match.winner_side ?? match.winner) ?? winnerSideFromTeam,
  );
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
    const response = await fetchPublicProvider();
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
        home_penalty_score AS "homePenaltyScore",
        away_penalty_score AS "awayPenaltyScore",
        winner_side AS "winnerSide",
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
      const homeTeamId = Number(game.home_team_id) || null;
      const awayTeamId = Number(game.away_team_id) || null;
      const tiebreaker = publicApiTiebreakerState(
        game,
        reportedStatus,
        reportedHomeScore,
        reportedAwayScore,
        homeTeamId,
        awayTeamId,
      );
      const nextState = resolveProviderState(local, {
        status: reportedStatus,
        homeScore: reportedHomeScore,
        awayScore: reportedAwayScore,
        ...tiebreaker,
      });
      const minute = publicApiMinute(game.time_elapsed);
      const metadataChanged =
        !sameProviderMatchId(local.providerMatchId, matchId) ||
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
          home_penalty_score = ${nextState.homePenaltyScore},
          away_penalty_score = ${nextState.awayPenaltyScore},
          winner_side = ${nextState.winnerSide},
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
