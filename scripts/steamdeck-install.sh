#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# HOLLOW WAKE — Steam Deck installer. Run this in Desktop Mode's Konsole:
#
#   curl -fsSL https://raw.githubusercontent.com/arianna-arpg/arpg-game-world/main/scripts/steamdeck-install.sh | bash
#
# It downloads the newest AppImage from GitHub Releases into ~/Applications,
# makes it executable, drops a Desktop-Mode menu entry, and (on SteamOS)
# registers it with Steam so it appears in Game Mode as a non-Steam game.
# Re-running updates in place — your saves live in ~/.config/Hollow Wake/
# and are never touched.
#
# Overrides: HOLLOW_WAKE_REPO=owner/name  HOLLOW_WAKE_DIR=/install/path
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="${HOLLOW_WAKE_REPO:-arianna-arpg/arpg-game-world}"
DIR="${HOLLOW_WAKE_DIR:-$HOME/Applications}"
OUT="$DIR/HollowWake.AppImage"

echo "Looking up the latest release of $REPO…"
URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep -o '"browser_download_url": *"[^"]*\.AppImage"' \
  | head -1 | sed 's/.*"\(https[^"]*\)"$/\1/')

if [ -z "$URL" ]; then
  echo "No AppImage found on the latest release of $REPO."
  echo "Either no release has been published yet, or it carries no Linux build."
  echo "Ask for a release, or build one: npm run dist:linux (on a Linux machine / CI)."
  exit 1
fi

echo "Downloading $URL"
mkdir -p "$DIR"
curl -fL --progress-bar -o "$OUT" "$URL"
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
