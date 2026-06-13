// Read-only production diagnostics. Prints query results only — never credentials.
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = neon(url);

const section = (title) => console.log(`\n=== ${title} ===`);

section("sync_runs (last 30)");
const runs = await sql`
  SELECT id, provider, status, matches_seen, matches_updated,
         LEFT(COALESCE(detail, ''), 160) AS detail,
         started_at, finished_at
  FROM sync_runs
  ORDER BY started_at DESC
  LIMIT 30
`;
console.table(runs);

section("sync_runs status counts (last 24h)");
console.table(await sql`
  SELECT provider, status, COUNT(*)::int AS count
  FROM sync_runs
  WHERE started_at > now() - interval '24 hours'
  GROUP BY provider, status
  ORDER BY provider, status
`);

section("match status counts");
console.table(await sql`
  SELECT status, COUNT(*)::int AS count FROM matches GROUP BY status ORDER BY status
`);

section("matches June 11-14 (window of played + upcoming)");
console.table(await sql`
  SELECT m.id, m.provider_match_id AS pid, m.stage, m.group_name AS grp,
         m.kickoff_at, m.status, m.minute,
         m.home_team_id AS h_id, home.fifa_code AS h, m.home_score AS hs,
         m.away_team_id AS a_id, away.fifa_code AS a, m.away_score AS as_,
         m.home_label, m.away_label, m.source_updated_at
  FROM matches m
  LEFT JOIN teams home ON home.id = m.home_team_id
  LEFT JOIN teams away ON away.id = m.away_team_id
  WHERE m.kickoff_at BETWEEN '2026-06-10T00:00:00Z' AND '2026-06-15T00:00:00Z'
  ORDER BY m.kickoff_at, m.id
`);

section("anomaly: started in past but still SCHEDULED");
console.table(await sql`
  SELECT id, kickoff_at, status FROM matches
  WHERE status = 'SCHEDULED' AND kickoff_at < now()
  ORDER BY kickoff_at
`);

section("anomaly: matches updated recently (last 3h)");
console.table(await sql`
  SELECT id, status, minute, home_score, away_score, updated_at
  FROM matches
  WHERE updated_at > now() - interval '3 hours'
  ORDER BY updated_at DESC
  LIMIT 20
`);

section("teams sample (id mapping check)");
console.table(await sql`
  SELECT id, fifa_code, group_name, name_en FROM teams ORDER BY id LIMIT 12
`);

section("app usage");
console.table(await sql`
  SELECT
    (SELECT COUNT(*)::int FROM profiles) AS profiles,
    (SELECT COUNT(*)::int FROM pools) AS pools,
    (SELECT COUNT(*)::int FROM pool_members) AS members,
    (SELECT COUNT(*)::int FROM predictions) AS predictions,
    (SELECT COUNT(*)::int FROM predictions WHERE points IS NOT NULL) AS scored
`);

section("predictions on finished matches (points distribution)");
console.table(await sql`
  SELECT m.id AS match, m.home_score, m.away_score, COUNT(p.*)::int AS preds,
         COUNT(p.*) FILTER (WHERE p.points IS NULL)::int AS unscored
  FROM matches m
  LEFT JOIN predictions p ON p.match_id = m.id
  WHERE m.status = 'FINISHED'
  GROUP BY m.id
  ORDER BY m.id
`);
