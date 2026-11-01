#!/usr/bin/env bash
# Overlay the night's record on the balance-farm-data branch and push it.
# Plain fast-forward commits with a retry: another writer can only be a re-run of
# this same workflow. The branch history is the durable trend, kept small on purpose
# (raw shard outputs stay in Actions artifacts).
set -euo pipefail

BRANCH="${DATA_BRANCH:-balance-farm-data}"
TREE="${1:-farm-report/tree}"
TREE="$(cd "$TREE" && pwd)"
WORK="$(mktemp -d)"
REMOTE="https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

git_data() { git -C "$WORK" "$@"; }

git -C "$WORK" init -q
git_data remote add origin "$REMOTE"
git_data config user.name "balance-farm[bot]"
git_data config user.email "balance-farm@users.noreply.github.com"

for attempt in 1 2 3 4 5; do
  if git_data fetch -q --depth 1 origin "$BRANCH" 2>/dev/null; then
    git_data checkout -q -B "$BRANCH" FETCH_HEAD
  else
    git_data checkout -q --orphan "$BRANCH"
    git_data rm -rfq . 2>/dev/null || true
  fi
  cp -R "$TREE"/. "$WORK"/
  git_data add -A
  if git_data diff --cached --quiet; then
    echo "Nothing new to publish."
    exit 0
  fi
  git_data commit -q -m "Balance farm: night of $(node -p "JSON.parse(require('fs').readFileSync('$TREE/latest/summary.json','utf8')).night")"
  if git_data push -q origin "HEAD:refs/heads/$BRANCH"; then
    echo "Published to $BRANCH."
    exit 0
  fi
  echo "Push attempt $attempt lost a race; retrying."
  sleep $((attempt * 5))
done
echo "Could not publish to $BRANCH after 5 attempts." >&2
exit 1
