#!/usr/bin/env bash
# THE HOSTED SHARD ON CODESPACES — run by devcontainer.json's postStartCommand
# and postAttachCommand from the workspace root. A lifecycle hook runs under a
# pty whose hangup reaches every process left in the hook's session, and Node
# resets nohup's ignored SIGHUP at boot, so the supervisor takes its own
# session (setsid) with HUP ignored from the first fork. One lock makes it
# idempotent. A clean exit (0) stays down; THE BREAKER (2), a close fault (3)
# or a crash restarts it after five seconds from the newest saved world.
# Flags ride SHARD_ARGS (a Codespaces secret, or export it in a terminal); the
# default stands the Unbroken Wilds with the open account on port 8787. Every
# player arrives from the forwarder's one address, so the per-address cap is off.
set -u
trap '' HUP
cd "$(dirname "$0")/.." || exit 1
mkdir -p saves
LOG="$PWD/shard.log"
read -r -a ARGV <<< "${SHARD_ARGS:---port 8787 --open --worldmass}"
ARGV=(--per-ip 0 "${ARGV[@]}")   # a later --per-ip in SHARD_ARGS wins

exec 9>/tmp/hollow-wake-shard.lock
flock -n 9 || { echo "[shard] already running (log: shard.log)"; exit 0; }

if [ ! -x node_modules/.bin/tsx ]; then
  echo "[shard] dependencies missing: npm ci"
  npm ci >>"$LOG" 2>&1 || { echo "[shard] npm ci failed (see shard.log)"; exit 1; }
fi
if [ ! -f site/play/index.html ]; then
  echo "[shard] building the served client: npm run build:web"
  npm run build:web >>"$LOG" 2>&1 || echo "[shard] build:web failed (see shard.log) — the status page answers '/' instead"
fi

# shellcheck disable=SC2016
setsid -f bash -c '
  while :; do
    echo "[shard] $(date -u +%FT%TZ) start: $*"
    node_modules/.bin/tsx server/shard.ts "$@"; code=$?
    echo "[shard] $(date -u +%FT%TZ) exit $code"
    [ "$code" -eq 0 ] && exit 0
    sleep 5
  done' shard-supervisor "${ARGV[@]}" </dev/null >>"$LOG" 2>&1

# Publish the port once the shard answers (gh from the github-cli feature; public
# visibility can revert on a restart, so every start re-publishes).
if command -v gh >/dev/null 2>&1 && [ -n "${CODESPACE_NAME:-}" ]; then
  setsid -f bash -c 'for _ in $(seq 90); do curl -fsS -o /dev/null http://127.0.0.1:8787/status && break; sleep 2; done
    gh codespace ports visibility 8787:public -c "$CODESPACE_NAME"' </dev/null >>"$LOG" 2>&1
fi

sleep 1   # let setsid() land before this hook's session leader exits
echo "[shard] supervisor up (log: shard.log); address: https://${CODESPACE_NAME:-NAME}-8787.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}/"
