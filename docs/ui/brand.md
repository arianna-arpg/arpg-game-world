# Hollow Wake visual identity

The display identity is one original vector lockup: the established hollow
ring and its teal, violet and ember points behind a two-line HOLLOW WAKE
wordmark. Use the artwork for product titles; ordinary references to the
game in sentences and diagnostic text remain text.

## Sources and configuration

- `branding/identity.mjs`: canonical insignia geometry, palette, optical
  layout and original letter outlines. The ring/spokes/points preserve the
  website and desktop icon design. Letter outlines were authored in this
  repository for this identity; no external font or image is embedded.
- `src/config.ts`: `GAME_TITLE` supplies the accessible name when generating
  artwork. A rename requires authoring any missing glyphs and regenerating.
- `src/ui/brand.ts`: `hollowWakeBrand(size)` and `BRAND_PRESENTATION` select
  the shared artwork and configurable hero, compact, panel and story sizes.
  `brand.css` owns sizing/accessibility adaptations, not different drawings.
- `SceneCardSpec.brandPresentation` opts a story card into this treatment.
  The tutorial opening uses it; narration titles remain authored text.
- `scripts/make-icon.mjs` imports the same insignia geometry and palette,
  preserving the existing size-specific desktop/favicon cuts.

Run `npm run brand` after changing the visual source. This deterministically
writes the Vite source asset and byte-identical static copies in
`site/assets/brand/` and `launcher/assets/brand/`. The website uses relative
paths so repository-subpath hosting works. Electron packages the copies
inside its existing launcher resource tree. `npm run check` refuses stale
copies. If the insignia itself changes, also run `npm run icon`.

The lockup is pure SVG paths with a transparent background. It remains crisp
at different DPI/UI scales and does not wait for a font service. Each title
has one accessible name; decorative images inside named links use empty alt.
The static lockup is unchanged by reduced motion. Website atmospheric and
Observer effects remain separate, using the generated ambient insignia.

## Verification

Run `npm run check`, `npm run build`, `npm run smoke`,
`npm run smoke:launcher`, and the hidden Electron courses
`balance/front-screen-ui.cjs` and `balance/brand-ui.cjs`.
The latter verifies all four website pages at desktop/mobile widths with
remote fonts blocked, plus the real launcher preload/status refresh.
Story-card changes also use the scenes probe and sim smoke.
Screenshots and disposable saves are under ignored `balance/reports/`.

## In-game navigation

`hollowWakeMenuHeader(size)` adds the shared identity above a menu's own
heading. The pause menu and browser-close fallback use the configurable
`menu` width; Options, Wardrobe and the HUD Menu tray use `compact`. The
in-game Codex already gets its identity from the shared side-screen shell.
Headers are emitted on each view render, so Options tabs, Wardrobe filters
and live pause-menu refreshes keep exactly one visible logo. Gameplay
panels (Inventory, Skills, map and station dialogs) keep their own headings.
The header adds no input handlers or time holds; existing menu navigation,
co-op pause policy and controller input remain with their current owners.

After a build, run `npx electron balance/in-game-brand-ui.cjs` for branding
and pause/return checks, and `npx electron balance/menu-tray-ui.cjs` for
tray placement across anchors and UI scales.
