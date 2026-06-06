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
    return { skipped: true, reason: "FOOTBALL_DATA_API_TOKEN is not configured" };
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
