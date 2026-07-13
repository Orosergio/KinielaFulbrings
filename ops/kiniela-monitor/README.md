# Kiniela Production Monitor

Small operational monitor for the production Kiniela site. It checks the
public app, `/api/health`, scoring integrity fields, sync freshness, and the
basic unauthenticated API guards. A systemd preflight runs at 22:55 and the
dedicated OpenClaw agent runs at 23:00, both in `Asia/Taipei`. It writes:

- `~/.openclaw/kiniela-monitor/latest.json`
- `~/.openclaw/kiniela-monitor/runs.jsonl`
- `~/.openclaw/alerts.jsonl` only when a check fails

Install on the VPS as `opsadmin`:

```sh
mkdir -p ~/.openclaw/kiniela-monitor ~/.config/systemd/user
cp kiniela_daily_check.mjs ~/.openclaw/kiniela-monitor/
cp ensure-openclaw-gateway.sh ~/.openclaw/kiniela-monitor/
cp openclaw-kiniela-daily-check.service ~/.config/systemd/user/
cp openclaw-kiniela-daily-check.timer ~/.config/systemd/user/
chmod +x ~/.openclaw/kiniela-monitor/kiniela_daily_check.mjs
systemctl --user daemon-reload
systemctl --user enable --now openclaw-kiniela-daily-check.timer
systemctl --user start openclaw-kiniela-daily-check.service
```

The systemd preflight also checks the OpenClaw gateway and restarts only that
user service if its health command times out. The agent workspace uses
`KINIELA_AGENT.md` as its `AGENTS.md`. Its native
OpenClaw cron job is named `kiniela-production-guardian`. The agent may create
and test a local repair branch, but production data changes, migrations,
deployments, and merges always require human approval.

First-time agent bootstrap:

```sh
openclaw agents add kiniela-ops --non-interactive \
  --workspace ~/.openclaw/kiniela-ops --model codex/gpt-5.5
cp KINIELA_AGENT.md ~/.openclaw/kiniela-ops/AGENTS.md
git clone --branch main --single-branch \
  https://github.com/Orosergio/KinielaFulbrings.git \
  ~/.openclaw/kiniela-ops/repo
cp install-openclaw-agent-cron.sh ~/.openclaw/kiniela-ops/
sh ~/.openclaw/kiniela-ops/install-openclaw-agent-cron.sh
```

The public repository can be cloned without credentials. GitHub write
credentials are optional: without them, a repair remains as a tested local
branch and commit for Sergio to review.

To grant repository-scoped GitHub write access, generate the dedicated key,
add `~/.ssh/kiniela_github_ed25519.pub` as a write-enabled deploy key in
`Orosergio/KinielaFulbrings`, and then activate the SSH remote:

```sh
sh configure-github-write.sh
sh configure-github-write.sh --activate
```

Useful checks:

```sh
systemctl --user status openclaw-kiniela-daily-check.timer
systemctl --user status openclaw-kiniela-daily-check.service
journalctl --user -u openclaw-kiniela-daily-check.service -n 80 --no-pager
cat ~/.openclaw/kiniela-monitor/latest.json
openclaw cron list --json
```
