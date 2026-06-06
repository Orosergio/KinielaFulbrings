import fs from "node:fs/promises";
import process from "node:process";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const dataset = JSON.parse(
  await fs.readFile(new URL("../data/worldcup-2026.json", import.meta.url), "utf8"),
);
const sql = postgres(connectionString, { max: 1, ssl: "require" });

const normalizeStatus = (status) => {
  const value = String(status ?? "").toLowerCase();
  if (value.includes("finish")) return "FINISHED";
  if (value.includes("play") || value.includes("live")) return "LIVE";
  if (value.includes("pause")) return "PAUSED";
  if (value.includes("postpone")) return "POSTPONED";
  if (value.includes("cancel")) return "CANCELLED";
  return "SCHEDULED";
};

try {
  await sql.begin(async (transaction) => {
    for (const team of dataset.teams) {
      await transaction`
        INSERT INTO teams (
          id, fifa_code, iso2, group_name, name_en, name_es, flag_url, scouting
        ) VALUES (
          ${Number(team.id)},
          ${team.fifaCode},
          ${team.iso2},
          ${team.group},
          ${team.name.en},
          ${team.name.es},
          ${team.flag},
          ${transaction.json(team.scouting)}
        )
        ON CONFLICT (id) DO UPDATE SET
          fifa_code = EXCLUDED.fifa_code,
          iso2 = EXCLUDED.iso2,
          group_name = EXCLUDED.group_name,
          name_en = EXCLUDED.name_en,
          name_es = EXCLUDED.name_es,
          flag_url = EXCLUDED.flag_url,
          scouting = EXCLUDED.scouting,
          updated_at = now()
      `;
    }

    for (const stadium of dataset.stadiums) {
      await transaction`
        INSERT INTO stadiums (
          id, name, fifa_name, city, country_en, country_es, capacity, timezone
        ) VALUES (
          ${Number(stadium.id)},
          ${stadium.name},
          ${stadium.fifaName},
          ${stadium.city},
          ${stadium.country.en},
          ${stadium.country.es},
          ${stadium.capacity},
          ${stadium.timeZone}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          fifa_name = EXCLUDED.fifa_name,
          city = EXCLUDED.city,
          country_en = EXCLUDED.country_en,
          country_es = EXCLUDED.country_es,
          capacity = EXCLUDED.capacity,
          timezone = EXCLUDED.timezone
      `;
    }

    for (const match of dataset.matches) {
      const finished = normalizeStatus(match.status) === "FINISHED";
      await transaction`
        INSERT INTO matches (
          id, stage, group_name, matchday, kickoff_at,
          home_team_id, away_team_id, home_label, away_label,
          stadium_id, status, home_score, away_score
        ) VALUES (
          ${Number(match.id)},
          ${match.type},
          ${match.group},
          ${Number(match.matchday)},
          ${match.kickoffUtc},
          ${match.homeTeamId ? Number(match.homeTeamId) : null},
          ${match.awayTeamId ? Number(match.awayTeamId) : null},
          ${match.homeLabel},
          ${match.awayLabel},
          ${match.stadiumId ? Number(match.stadiumId) : null},
          ${normalizeStatus(match.status)},
          ${finished ? Number(match.homeScore) : null},
          ${finished ? Number(match.awayScore) : null}
        )
        ON CONFLICT (id) DO UPDATE SET
          stage = EXCLUDED.stage,
          group_name = EXCLUDED.group_name,
          matchday = EXCLUDED.matchday,
          kickoff_at = EXCLUDED.kickoff_at,
          home_team_id = COALESCE(EXCLUDED.home_team_id, matches.home_team_id),
          away_team_id = COALESCE(EXCLUDED.away_team_id, matches.away_team_id),
          home_label = EXCLUDED.home_label,
          away_label = EXCLUDED.away_label,
          stadium_id = EXCLUDED.stadium_id,
          updated_at = now()
      `;
    }
  });

  console.log(`seeded ${dataset.teams.length} teams and ${dataset.matches.length} matches`);
} finally {
  await sql.end();
}
