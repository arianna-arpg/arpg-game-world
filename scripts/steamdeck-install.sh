#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# HOLLOW WAKE — Steam Deck installer. Run this in Desktop Mode's Konsole.
#
# PUBLIC repo:
#   curl -fsSL https://raw.githubusercontent.com/arianna-arpg/arpg-game-world/main/scripts/steamdeck-install.sh | bash
#
# PRIVATE repo — pass a GitHub token (fine-grained PAT with read access to
# the repo's Contents) both to fetch this script and into it:
#   TOKEN=github_pat_XXXX
#   curl -fsSL -H "Authorization: Bearer $TOKEN" \
#     https://raw.githubusercontent.com/arianna-arpg/arpg-game-world/main/scripts/steamdeck-install.sh \
#     | GITHUB_TOKEN=$TOKEN bash
#
# It downloads the newest AppImage from GitHub Releases into ~/Applications,
# makes it executable, drops a Desktop-Mode menu entry, and (on SteamOS)
# registers it with Steam so it appears in Game Mode as a non-Steam game.
# Re-running updates in place — your saves live in ~/.config/Hollow Wake/
# and are never touched.
#
# Overrides: HOLLOW_WAKE_REPO=owner/name  HOLLOW_WAKE_DIR=/install/path
#            GITHUB_TOKEN=…               (required for private repos)
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${HOLLOW_WAKE_REPO:-arianna-arpg/arpg-game-world}"
DIR="${HOLLOW_WAKE_DIR:-$HOME/Applications}"
OUT="$DIR/HollowWake.AppImage"
API="https://api.github.com/repos/$REPO"

AUTH=()
[ -n "${GITHUB_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")

echo "Looking up the latest release of $REPO…"
JSON=$(curl -fsSL "${AUTH[@]}" -H "Accept: application/vnd.github+json" "$API/releases/latest") || {
  echo "Could not read the latest release (HTTP error)."
  echo "  • No release published yet? Push a v* tag and let the release workflow finish."
  echo "  • Private repo? Re-run with GITHUB_TOKEN=<fine-grained PAT> (see header)."
  exit 1
}

# Prefer python3 (ships on SteamOS) for real JSON parsing; fall back to a
# grep for the public browser_download_url if python3 is somehow absent.
ASSET_ID=""; ASSET_NAME=""
if command -v python3 >/dev/null 2>&1; then
  read -r ASSET_ID ASSET_NAME < <(printf '%s' "$JSON" | python3 -c '
import json, sys
rel = json.load(sys.stdin)
for a in rel.get("assets", []):
    if a.get("name", "").endswith(".AppImage"):
        print(a["id"], a["name"]); break
') || true
fi

if [ -n "$ASSET_ID" ]; then
  echo "Downloading $ASSET_NAME (release $(printf '%s' "$JSON" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tag_name","?"))'))"
  mkdir -p "$DIR"
  # The assets endpoint works for BOTH public and private repos; the plain
  # browser_download_url only works unauthenticated on public ones.
  curl -fL --progress-bar "${AUTH[@]}" -H "Accept: application/octet-stream" \
    -o "$OUT" "$API/releases/assets/$ASSET_ID"
else
  URL=$(printf '%s' "$JSON" \
    | grep -o '"browser_download_url": *"[^"]*\.AppImage"' \
    | head -1 | sed 's/.*"\(https[^"]*\)"$/\1/')
  if [ -z "$URL" ]; then
    echo "The latest release of $REPO carries no AppImage."
    echo "Build one via the release workflow (push a v* tag) or npm run dist:linux."
    exit 1
  fi
  echo "Downloading $URL"
  mkdir -p "$DIR"
  curl -fL --progress-bar "${AUTH[@]}" -o "$OUT" "$URL"
fi

chmod +x "$OUT"
echo "Installed to $OUT"

# Desktop-Mode application menu entry.
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/hollow-wake.desktop" <<EOF
[Desktop Entry]
Name=Hollow Wake
Comment=A data-driven top-down action RPG
Exec=$OUT
Type=Application
Categories=Game;
Terminal=false
EOF

# Game Mode: SteamOS ships a helper that registers a non-Steam game.
if command -v steamos-add-to-steam >/dev/null 2>&1; then
  steamos-add-to-steam "$OUT" >/dev/null 2>&1 || true
  echo "Registered with Steam — it appears in your library as Hollow Wake"
  echo "(restart Steam / return to Game Mode if it doesn't show yet)."
else
  echo "To put it in your Steam library: Steam → Games → Add a Non-Steam Game"
  echo "→ Browse → $OUT"
fi
echo "Done. In Game Mode, use the default Gamepad controller template."
