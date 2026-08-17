# Project archive

## Final state

- Archived on: 2026-08-17
- Final release: `world-cup-2026-final`
- Public site: static, anonymized portfolio demo
- Public dataset: 104 completed matches, including penalty shootouts
- Production database: final private PostgreSQL dump retained on the VPS
- Personal profiles, emails, memberships, and real predictions: not committed

## Retired automation

- Netlify match synchronization schedule
- GitHub production health schedule
- VPS daily Kiniela health timer
- VPS hourly Kiniela PostgreSQL backup timer
- OpenClaw `kiniela-production-guardian` cron job
- Kiniela GitHub deploy key used by the VPS agent

The rest of the VPS and unrelated OpenClaw agents are outside this archive and
remain unchanged.

## Reactivation checklist

1. Unarchive the GitHub repository and create a new working branch.
2. Provision PostgreSQL or restore the private final dump to a temporary
   database for reference.
3. Rotate database and provider credentials before configuring a new host.
4. Set `VITE_DEMO_MODE=false` only after authentication and `/api/health` pass.
5. Update teams, tournament format, kickoff times, and provider mappings.
6. Run migrations, type checks, tests, and a production build.
7. Reintroduce sync and monitoring schedules only after a manual end-to-end
   check of locking, scoring, penalties, time zones, and bracket progression.

Do not reuse the old production credentials or turn the historical schedules
back on blindly.
