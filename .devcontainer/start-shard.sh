#!/usr/bin/env bash
# THE HOSTED SHARD ON CODESPACES — started by devcontainer.json's
# postStartCommand at every codespace (re)start, from the workspace root.
# Idempotent: a shard already running keeps running. The world is written to
# saves/ on the codespace disk every SHARD_CFG.persistSec and on a clean stop.
# Flags ride SHARD_ARGS (set a Codespaces secret or export it in the terminal);
# the default stands the Unbroken Wilds with the open account on port 8787;
# a restart with no --seed brings the newest saved world back.
set -u
ARGS="${SHARD_ARGS:---port 8787 --open --worldmass}"
if pgrep -f 'server/shard.ts' >/dev/null 2>&1; then
  echo "[shard] already running"
  exit 0
fi
mkdir -p saves
# shellcheck disable=SC2086
nohup npm run shard -- $ARGS > shard.log 2>&1 &
echo "[shard] started: npm run shard -- $ARGS (log: shard.log)"
