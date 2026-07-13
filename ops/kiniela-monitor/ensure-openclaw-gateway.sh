#!/bin/sh
set -eu

if timeout 25s openclaw health --json >/dev/null 2>&1; then
  exit 0
fi

echo "OpenClaw gateway is unhealthy; restarting the user service" >&2
systemctl --user restart openclaw-gateway.service
sleep 10
timeout 30s openclaw health --json >/dev/null
