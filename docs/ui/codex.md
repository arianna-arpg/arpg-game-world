# Player Codex

The Codex is an account reference accessible from the main menu, the in-game
Menu tray and the pause menu. The Vault's Owned tab and flat owned-card tail
move into **Codex → Account Unlocks → Owned**. A Vault footer link opens that
page and returns to the same purchase/reckoning visit, preserving investment,
scroll and unassigned essence. Class discovery/activation and purchases remain
in the Vault.

## Sources and extension

- `src/data/codex.ts`: section/page registry and reading dials (list geometry, overscan, autoplay,
  refresh cadence, encounter cadence and optional non-dropping player skills).
- `src/meta/codex.ts`: read-only providers, discovery projection, filtering,
  compatibility and the conversion example. A new page adds a provider and a
  section/page row; the reader has no hardcoded list of sections.
- `src/ui/codex.ts`: shared reader, icon tiles, portraits, filters, continuous browsing,
  detail, demonstrations and cleanup. `UI.codexView` mounts it into existing
  menu surfaces and owns its lifetime.
- `src/engine/codexSightings.ts`: account-owned encounter observations through
  the existing senses, visibility and floor gates. `World.update` advances its
  throttled observer. It never grants kill credit, study, rewards or unlocks.

Skills derive from the droppable skill registry plus class openings/mastery
kits and optional configured inclusions. Monster-only/internal payload arts
are excluded. Supports derive from the positive-weight support catalog.
Descriptions, requirements, native damage, timings, modifiers and level limits
come from those definitions. Actual skill icons and monster/class portraits
reuse the existing painters. No static copied catalog or recorded media is
introduced.

The Classes page preserves discovery versus activation: an earned pending
class is named but points back to the Vault for activation. Undiscovered
classes use the existing rumor reveal, only after its structural prerequisites
open. The reader never settles or acknowledges a class on the player's behalf.
Owned reads the existing permanent unlock receipts, including deeds and
investment ladders; pending classes are excluded just as on the former shelf.

## Discovery and research

A public entry model removes source identifiers, tags, art and media from
locked entries. Ability titles use the shared runescript; class titles keep
the existing generic shroud. DOM buttons address opaque indices. Search and
tag filters operate only on known entries, so typing a secret name or tag
cannot identify its locked tile. Locked-only browsing remains available when
there is no text/tag filter.

Eligible enemies perceived by the local hero record `codex:sighted:<defId>` in
the account ledger. Invisible, occluded, distant, other-floor, no-bounty and
ineligible bodies do not count. Clients, scripted scenes/tutorials and modes
that cannot feed account progression do not write sightings. These keys use
the existing save serialization; no schema reset or migration is needed.

An encounter reveals only identity, portrait and allegiance before Tracker
recruitment. The Tracker opens the existing kill-based reveal tiers for vitals,
arts, defenses and mastery. **Existing hunt knowledge is retained**, including
kills banked before recruitment; a sighting by itself grants no study. Legacy
kill records also prove an encounter. The reference labels monster numbers as
base values, since level, rarity and other modifiers change living specimens.

The station's operational Bestiary remains at the Tracker: Spectre attunement
and companion release still use their existing proximity and authority gates.
The Codex has no station actions. Magic-pack counterplay, elite affixes and
rarity multipliers are separate browsable pages sourced from their registries.
They are public reference material, independent of individual creature study.

## Mechanics and demonstrations

Attributes show `perPoint` modifiers through the shared modifier formatter;
statistics show current registered defaults/limits and shared sheet blurbs.
Conversions enumerate `DAMAGE_TYPES`, `conversionStat` and `extraAsStat`. The
interactive example calls the same `applyConversion` used by combat, with an
isolated stat sheet. Its argument now expresses the existing sheet-only
dependency; combat arithmetic is unchanged. Registry values update without a
second manual copy; explanatory prose remains owned by the shared definitions.

Selecting a discovered skill automatically starts its live showcase when the
preview becomes visible. It uses the existing isolated engine and a fresh
level-one baseline vessel, including the skill's native equipment/setup needs.
It never copies the current character's build. Autoplay can be disabled for
the UI session; Play/Stop, Restart, and clicking the preview remain available. Support pages offer only discovered base skills accepted by
the real
instance socket gate, and identify that modified builds can admit further
combinations. Explicit showcase skips do not offer a broken player. Only one
selected demonstration is mounted; switching pages, stopping or leaving
removes it. The existing showcase shield still prevents account/save access.

The reader remembers filters, scroll anchor and selection per leaf for the
UI session. A changed account refreshes the current page at the configured cadence, without
rebuilding idle input controls. Back/Escape returns to the opening surface.
In-game access uses the existing menu hold and input blocking; shared worlds
and timed harvests retain their pause policy. Parent close, run start, death
and other global navigation dispose timers, keyboard handlers and media.

## Verification

`npm run check`, `npm run probe -- codex`, the menu/unlock/Memory/class-mastery
and sheet probes, and `npm run sim -- run --suite smoke` cover the model and
integration. Build, then run `npx electron balance/codex-ui.cjs` for the actual
menu/reader/media/scale/reckoning walkthrough with temporary saves. Run
`npx electron balance/vault-discovery-ui.cjs` for class discovery and activation
through the new Owned location, and `npm run smoke` for boot. Screenshots are
written to the ignored `balance/reports/codex/` folder.

## Shared menu presentation

The optional `CodexOptions.shell` contract applies the configurable profile in
`ui/sideScreenConfig.ts`. Tab changes refresh regions inside the existing shell
without replaying its entrance animation. It preserves keyboard
focus and keeps Back in a fixed footer. Menu and Vault entries use the entrance
atmosphere; the escape-menu host uses the world context with its existing
pause and input policy. See [front-screen](front-screen.md) for configuration
and the additional shared-shell acceptance course. Vault returns retain the
original render closure, tab, scroll, investments and unassigned essence.

## Reading and navigation

Search accepts multiple words across the public name, tags, description and
current reference facts. Every word must match; punctuation, case and accents
are normalized. Exact names rank first, then name prefixes, then other name
matches, then descriptive matches. New queries select the top result. Locked
rows never enter the search index, including rune and punctuation-only queries.
Tag chips combine with AND and can be removed individually. Clear search keeps
other filters; Clear filters resets the leaf's filters and scroll position.

Each leaf remembers its filters, selected entry and keyed scroll anchor for
the UI session. Arrow keys navigate section/page ribbons and the result grid;
Home/End reach their ends and Page Up/Down move by the visible grid height.
`/` or Ctrl/Cmd+F focuses search. Down moves from search to its result; Enter opens that entry.
Previous/next entry controls traverse all filtered results without losing
the reader.
Escape clears a focused query first, then returns a compact reader to results,
then returns to the opening surface.

On narrow panes, opening an entry gives it the full reading area. Results and
Escape restore the list position and selected card; the search shortcut reopens
the browse controls. Back stays in the fixed footer. Short panes reserve space
for the scrolling cards and omit the redundant list caption. Layout
uses the shared palette and UI scale, with reduced-motion and forced-color
fallbacks. `codexShell.css` is loaded by the browser entry point, never a
headless model/reader import.

`ui/windowedGrid.ts` supplies a reusable continuous fixed-row grid. It mounts
only visible rows plus `CODEX_CFG.list.overscanRows` above and below, reuses
overlapping cards, and paints portraits only for fresh nodes. Scroll and resize
work is coalesced into animation frames; no remote loading or catalog growth is
required. Keyed anchors survive tab returns, resizing and account refreshes.
An offscreen focused card is retained until focus moves; Home/End can jump
across the full catalog without rendering intervening entries. List dimensions
are configurable; multi-line tile names are clamped while the reader shows
the full title. Filtering always searches the complete public entry model.

`ui/codexPreview.ts` owns the selected entry's demonstration controls. Visible
selection autoplay, Play, Stop and Restart reuse the shared showcase engine;
readiness, unavailable
and delayed messages use its public signals and `CODEX_CFG.previewWaitMs`.
Retry replaces only the player. A late frame can still recover a delayed
preview. Compatible support hosts are sorted by name and remembered per leaf;
Include support switches the same base skill between supported and unsupported
play. Changing filters or refreshing account facts keeps a still-selected
player and its controls, while newly discovered hosts update the existing
selector. A visibility observer defers autoplay until the reader is visible;
the shared host pauses hidden previews and retains one isolated engine.
Stopping does not restart merely because the stage comes back into view.
The Autoplay checkbox is remembered across entries during the UI session,
independently of the Vault Memory preference. Leaving the entry removes
observers, wait timers and media.

After a build, `npx electron balance/codex-polish-ui.cjs` checks the actual
keyboard routes, normalized search, retained playback, base/support comparison,
restart/retry, live edits, compact reading and scroll restoration at several
viewport/UI-scale combinations. Its screenshots are in the ignored
`balance/reports/codex-polish/` directory. Also run the shared shell acceptance
(`balance/front-screen-ui.cjs`) when changing the Codex's shell decoration.

`npx electron balance/codex-scroll-ui.cjs` uses real Chromium pointer/wheel/key
events with no desktop preload. It checks actual moving frames and skill casts
without pressing Play, direct preview controls, autoplay preferences, bounded
card counts across the full catalog, keyboard jumps, retained anchors and
compact visibility/cleanup. Reports use disposable profiles and saves, with
screenshots in ignored `balance/reports/codex-scroll/`.
