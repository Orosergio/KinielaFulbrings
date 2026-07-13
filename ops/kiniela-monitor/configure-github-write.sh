#!/bin/sh
set -eu

KEY_PATH="/home/opsadmin/.ssh/kiniela_github_ed25519"
REPO_DIR="/home/opsadmin/.openclaw/kiniela-ops/repo"

mkdir -p "$(dirname "$KEY_PATH")"
chmod 700 "$(dirname "$KEY_PATH")"

if [ ! -f "$KEY_PATH" ]; then
  umask 077
  ssh-keygen -q -t ed25519 -N '' \
    -C 'kiniela-ops@openclaw-sin-1' -f "$KEY_PATH"
elif [ ! -f "$KEY_PATH.pub" ]; then
  ssh-keygen -y -f "$KEY_PATH" >"$KEY_PATH.pub"
fi

chmod 600 "$KEY_PATH"
chmod 644 "$KEY_PATH.pub"
ssh-keygen -lf "$KEY_PATH.pub"

if [ "${1:-}" = "--activate" ]; then
  git -C "$REPO_DIR" config core.sshCommand \
    "ssh -i $KEY_PATH -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  git -C "$REPO_DIR" remote set-url origin \
    git@github.com:Orosergio/KinielaFulbrings.git
  echo "Kiniela GitHub write key activated for $REPO_DIR"
fi
