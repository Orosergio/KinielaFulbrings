# Kiniela Mundial 2026

> **Archived project.** The tournament is over and the production application
> was retired on August 17, 2026. The public deployment remains available as a
> read-only, anonymized portfolio demo.

[Open the portfolio demo](https://kiniela-mundial-2026.netlify.app)

Kiniela is a bilingual, multi-user football prediction app built for private
groups during the 2026 World Cup. It includes match picks, transparent group
scoring, live-result synchronization, knockout advancement predictions, and a
complete bracket with penalty shootout results.

## Highlights

- Responsive React interface in Spanish and English.
- Private pools, member standings, and visible group picks.
- Score predictions plus a separate knockout advancement pick.
- Penalty shootouts shown in the bracket without changing the regulation-time
  score used by the quiniela.
- Database-enforced kickoff deadlines and server-side scoring.
- Provider glitch protection for premature live and finished states.
- Health checks, backups, and an OpenClaw production guardian used during the
  live tournament.

## Scoring

| Result | Points |
| --- | ---: |
| Exact score | 7 |
| Correct outcome and one exact team score | 4 |
| Correct outcome | 3 |
| One exact team score | 1 |
| Correct knockout team to advance | +2 |

Shootout goals are not added to the match score. In knockout matches, the app
scores the regulation/extra-time result and the team-to-advance pick separately.

## Stack

- React 19, TypeScript, Vite
- Netlify and Netlify Functions
- Netlify Identity
- PostgreSQL, initially on Neon and later self-hosted on a VPS
- Vitest and GitHub Actions

## Portfolio mode

The deployed build uses `VITE_DEMO_MODE=true`. It reads the final 104 public
match results from `data/worldcup-2026-results.json` and generates fictional
members and picks locally. It does not authenticate, query PostgreSQL, or expose
real participant data.

```powershell
$env:VITE_DEMO_MODE="true"
npm install
npm run dev
```

Production synchronization and monitoring schedules have been removed. The
backend and migrations remain in the repository as implementation reference for
a future tournament.

## Verification

```bash
npm run check
npm test
npm run build
```

See [ARCHIVE.md](./docs/ARCHIVE.md) for the retirement record and reactivation
checklist.
