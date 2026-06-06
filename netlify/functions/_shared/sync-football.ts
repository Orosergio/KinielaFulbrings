import { db } from "./db";

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

export async function syncFootballData() {
  const token = Netlify.env.get("FOOTBALL_DATA_API_TOKEN");
  if (!token) {
    throw new Error("FOOTBALL_DATA_API_TOKEN is not configured");
  }

  const sql = db();
  const [run] = await sql`
    INSERT INTO sync_runs (provider, status)
    VALUES ('football-data.org', 'RUNNING')
    RETURNING id
  `;

  try {
    const response = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
      { headers: { "X-Auth-Token": token } },
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
        home.fifa_code AS "homeCode",
        away.fifa_code AS "awayCode"
      FROM matches m
      LEFT JOIN teams home ON home.id = m.home_team_id
      LEFT JOIN teams away ON away.id = m.away_team_id
    `) as LocalMatch[];

    let updated = 0;
    for (const provider of providerMatches) {
      const local = localMatches.find((candidate) => sameFixture(provider, candidate));
      if (!local) continue;

      const status = normalizeStatus(provider.status);
      const homeScore = provider.score.fullTime?.home ?? provider.score.halfTime?.home ?? null;
      const awayScore = provider.score.fullTime?.away ?? provider.score.halfTime?.away ?? null;

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
          status = ${status},
          minute = ${provider.minute ?? null},
          home_score = ${homeScore},
          away_score = ${awayScore},
          source_updated_at = now(),
          updated_at = now()
        WHERE id = ${local.id}
      `;
      updated += 1;
    }

    await sql`
      UPDATE sync_runs
      SET
        status = 'SUCCESS',
        matches_seen = ${providerMatches.length},
        matches_updated = ${updated},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    return { skipped: false, seen: providerMatches.length, updated };
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
  if (match.finished === "TRUE") return "FINISHED";
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
  const [run] = await sql`
    INSERT INTO sync_runs (provider, status)
    VALUES ('worldcup26.ir', 'RUNNING')
    RETURNING id
  `;

  try {
    const response = await fetch("https://worldcup26.ir/get/games");
    if (!response.ok) {
      throw new Error(`worldcup26.ir returned ${response.status}`);
    }
    const payload = (await response.json()) as { games?: PublicApiMatch[] };
    const games = payload.games ?? [];
    let updated = 0;

    for (const game of games) {
      const matchId = Number(game.id);
      if (!Number.isInteger(matchId)) continue;
      const status = publicApiStatus(game);
      const homeScore = Number(game.home_score ?? 0);
      const awayScore = Number(game.away_score ?? 0);

      const result = await sql`
        UPDATE matches
        SET
          home_team_id = COALESCE(${Number(game.home_team_id) || null}, home_team_id),
          away_team_id = COALESCE(${Number(game.away_team_id) || null}, away_team_id),
          status = ${status},
          minute = ${publicApiMinute(game.time_elapsed)},
          home_score = CASE WHEN ${status} = 'SCHEDULED' THEN NULL ELSE ${homeScore} END,
          away_score = CASE WHEN ${status} = 'SCHEDULED' THEN NULL ELSE ${awayScore} END,
          source_updated_at = now(),
          updated_at = now()
        WHERE id = ${matchId}
        RETURNING id
      `;
      if (result.length) updated += 1;
    }

    await sql`
      UPDATE sync_runs
      SET
        status = 'SUCCESS',
        matches_seen = ${games.length},
        matches_updated = ${updated},
        finished_at = now()
      WHERE id = ${run.id}
    `;
    return { provider: "worldcup26.ir", seen: games.length, updated };
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
  return Netlify.env.get("FOOTBALL_DATA_API_TOKEN")
    ? syncFootballData()
    : syncPublicWorldCup();
}
