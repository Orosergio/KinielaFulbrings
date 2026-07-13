#!/bin/sh
set -eu

JOB_NAME="kiniela-production-guardian"
MESSAGE="Execute the Kiniela daily production review now. Read /home/opsadmin/.openclaw/kiniela-ops/AGENTS.md first and follow it completely. Use the current Asia/Taipei date. If healthy, make no changes. If a real failure exists, create the incident plan and begin the safest allowed repair. End with a concise Spanish report."

# Extract by name without depending on jq being installed on the VPS.
job_id="$(openclaw cron list --json | node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const data = JSON.parse(input);
  const job = data.jobs.find((item) => item.name === "kiniela-production-guardian");
  if (job) process.stdout.write(job.id);
});
')"

if [ -z "$job_id" ]; then
  created="$(openclaw cron add \
    --name "$JOB_NAME" \
    --description "Daily Kiniela production audit, incident plan, and bounded repair" \
    --agent kiniela-ops \
    --cron "0 23 * * *" \
    --tz Asia/Taipei \
    --exact \
    --session isolated \
    --message "$MESSAGE" \
    --model codex/gpt-5.5 \
    --thinking high \
    --timeout-seconds 1800 \
    --light-context \
    --announce \
    --channel telegram \
    --to 2138765064 \
    --best-effort-deliver \
    --json)"
  job_id="$(printf '%s' "$created" | node -e '
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const data = JSON.parse(input);
  process.stdout.write(data.id);
});
')"
fi

openclaw cron edit "$job_id" \
  --name "$JOB_NAME" \
  --description "Daily Kiniela production audit, incident plan, and bounded repair" \
  --agent kiniela-ops \
  --cron "0 23 * * *" \
  --tz Asia/Taipei \
  --exact \
  --session isolated \
  --message "$MESSAGE" \
  --model codex/gpt-5.5 \
  --thinking high \
  --timeout-seconds 1800 \
  --light-context \
  --announce \
  --channel telegram \
  --to 2138765064 \
  --best-effort-deliver \
  --failure-alert \
  --failure-alert-after 1 \
  --failure-alert-channel telegram \
  --failure-alert-to 2138765064 \
  --failure-alert-cooldown 6h \
  --failure-alert-exclude-skipped

printf 'Configured OpenClaw cron job %s (%s)\n' "$JOB_NAME" "$job_id"
