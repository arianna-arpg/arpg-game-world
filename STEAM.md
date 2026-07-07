# Hollow Wake on Steam & Steam Deck

The desktop shell packages into real executables — a Windows installer and a
Linux **AppImage** — that you add to Steam as a **non-Steam game**. Full
controller support is built into the engine (not a Steam Input shim), so the
game plays natively on a Steam Deck.

## Build the executables

```
npm run dist          # Windows: release/HollowWake-Setup-<ver>.exe (+ release/win-unpacked/)
npm run dist:linux    # Linux:   release/HollowWake-<ver>-x86_64.AppImage  ← the Steam Deck artifact
npm run dist:all      # both
```

Everything about packaging lives in `electron-builder.yml`. The packaged app
is the same launcher + loopback server + `dist/` trio as a checkout, with the
environment seam in `launcher/main.cjs` flipping three things:

| | checkout (dev) | packaged install |
|---|---|---|
| game files / config | repo root | `resources/` beside the exe |
| saves | `<repo>/saves/` | `%AppData%\Hollow Wake\saves` · `~/.config/Hollow Wake/saves` |
| updates | `git pull` + rebuild | GitHub-Releases version probe → download link |

Machine-local overrides still work when packaged: drop a
`launcher.config.local.json` **next to the exe** or into the **userData**
folder above (userData wins). `paths.saves` accepts `${data}`, `${exe}`,
`${home}`, `${repo}` templates if you want saves somewhere else.

## Publish a release (what the Deck installs from)

1. Bump `version` in `package.json`, commit.
2. Tag it and push: `git tag v0.2.0 && git push origin v0.2.0`.
3. The `release` GitHub Action builds Windows + Linux and attaches both to
   that release. (Manual dry run: Actions → release → Run workflow.)

## Add to Steam — Windows

1. Run the installer from `release/` (SmartScreen will warn — the build is
   unsigned; "More info → Run anyway"). Or skip installing and use
   `release/win-unpacked/Hollow Wake.exe` directly.
2. Steam → **Games → Add a Non-Steam Game to My Library → Browse** → pick
   `Hollow Wake.exe`.
3. Launching from Steam gives you the overlay + controller routing as usual.

## Add to Steam — Steam Deck

One-liner (Desktop Mode → Konsole):

```
curl -fsSL https://raw.githubusercontent.com/arianna-arpg/arpg-game-world/main/scripts/steamdeck-install.sh | bash
```

That downloads the latest release AppImage to `~/Applications`, makes it
executable, adds a Desktop-Mode menu entry, and registers it with Steam
(`steamos-add-to-steam`). Return to Game Mode and play.

Manual path, if you prefer: download the `.AppImage` from the GitHub Releases
page in Desktop Mode, `chmod +x` it, then Steam → **Add a Non-Steam Game** →
Browse → the AppImage. Re-running the script updates in place; saves are in
`~/.config/Hollow Wake/` and survive updates.

**Controller template:** keep Steam Input on the default **Gamepad** template
— the Deck then shows up as a standard pad and the game's native support does
the rest. (Don't use a mouse/keyboard template; the game wants the real
sticks.)

**Display:** the game window auto-fullscreens under gamescope
(`window.fullscreen: "auto"` in `launcher.config.json`; `--fullscreen` forces
it anywhere, F11 toggles in-game).

## Controller support (any platform)

Plug in any standard pad (Xbox/DualSense/Deck) — it works in the browser dev
build too, not just the desktop app.

Default layout (rebind everything in **Escape → Customize Keybinds →
Controller**; bindings persist in settings like keybinds):

| input | action |
|---|---|
| Left stick | move (analog — half-tilt stalks) |
| Right stick | aim; tilt sets reach, release keeps the reticle (sticky) |
| RT / LT | skill slots 1–2 (the mouse-button slots) |
| Ⓐ Ⓑ Ⓧ Ⓨ | skill slots 3–6 |
| RB / LB | skill slots 7–8 |
| VIEW (back) hold | meta-skill modifier (Detonate / Enrage / …) |
| R3 | pick up item |
| D-pad | panels: char ↑ · inventory ↓ · map ← · tree → |
| START | pause / close-cascade (hardwired, like Esc) |

**Menus:** whenever a panel, dialog, or the start menu is up and the pad was
the last device used, a gold pointer appears — left stick moves it, Ⓐ clicks,
Ⓑ backs out, right stick scrolls. Every DOM panel works with it, no per-panel
controller code. (Known seam: the native drag-and-drop gesture for vestige
inlaying needs the touchscreen/trackpad for now — bag items already use
click-to-lift.)

Feel tunables — deadzone, aim reach, pointer speed, southpaw stick swap — are
sliders in the same Controller section (persisted per player). Engine-side
defaults and the internals (stick response curve, trigger threshold, pointer
buttons) live in `PAD_CFG` in `src/core/gamepad.ts`, data like everything
else.

**Testing without hardware:** the pad layer reads `window.__fakePad` before
real devices — `__game.fakePad({ axes: [0,0,1,0], buttons: [] })` in the
console drives aim from a script; `__game.pad()` inspects live state.
