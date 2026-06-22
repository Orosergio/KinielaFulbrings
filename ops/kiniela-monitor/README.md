# Kiniela Production Monitor

Small operational monitor for the production Kiniela site. It checks the
public app, `/api/health`, scoring integrity fields, sync freshness, and the
basic unauthenticated API guards. It writes:

- `~/.openclaw/kiniela-monitor/latest.json`
- `~/.openclaw/kiniela-monitor/runs.jsonl`
- `~/.openclaw/alerts.jsonl` only when a check fails

Install on the VPS as `opsadmin`:

```sh
mkdir -p ~/.openclaw/kiniela-monitor ~/.config/systemd/user
cp kiniela_daily_check.mjs ~/.openclaw/kiniela-monitor/
cp openclaw-kiniela-daily-check.service ~/.config/systemd/user/
cp openclaw-kiniela-daily-check.timer ~/.config/systemd/user/
chmod +x ~/.openclaw/kiniela-monitor/kiniela_daily_check.mjs
systemctl --user daemon-reload
systemctl --user enable --now openclaw-kiniela-daily-check.timer
systemctl --user start openclaw-kiniela-daily-check.service
```

Useful checks:

```sh
systemctl --user status openclaw-kiniela-daily-check.timer
systemctl --user status openclaw-kiniela-daily-check.service
journalctl --user -u openclaw-kiniela-daily-check.service -n 80 --no-pager
cat ~/.openclaw/kiniela-monitor/latest.json
```
