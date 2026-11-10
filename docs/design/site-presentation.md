# Website presentation

The GitHub Pages entrypoint is `site/index.html`. It introduces the playable
main game; it must not imply the separate seamless-world experiment is the
ordinary browser/download build. Play and release URLs retain their existing
destinations and relative paths work under `/arpg-game-world/`.
The browser tab and social title are simply "Hollow Wake".

## Page owners

- `assets/home.css`: landing-page composition, responsive layouts, the
  charcoal/brass palette, and scoped restyling of the existing collection.
- `assets/home.js` and `class-deck.js`: keyboard-accessible class tabs, three
  random classes per visit from the entire exported roster, and a "Discover
  other lives" deal. Every class is drawn before the pool recycles; a deal
  never contains duplicates, even across a cycle boundary. Names, primary
  attributes, descriptions and database links travel together. The authored
  three-class introduction remains usable if the export cannot load.
  This module also binds version metadata.
- `assets/world-scenes.js`: the frontier catalogue. Each entry owns its stable
  ID, title, description, image, alt text, caption and crop position. Add or swap
  entries here; `world-stories.js` creates the matching controls. Keep the first
  scene and no-script descriptions in the HTML in step with catalogue changes.
  Hover, keyboard focus and tap select a scene; arrows/Home/End move between
  stories. There is no slideshow. Images load on demand, the last interaction
  wins during rapid changes, and a failed request retains the last painting.
  A short dissolve reuses the existing memory canvas, with instant changes for
  reduced motion. `assets/art/world/` records artwork provenance and prompts.
- `assets/memory-art.js`: transparent, slowly drifting image rims adapted
  from the cinema's own domain-warped smoke. Four reusable canvases cover the
  hero, frontier, active class and legacy art. Rendering pauses offscreen and
  in background tabs, caps at 20 fps and one million pixels per canvas, and
  holds still for reduced motion or data saving. CSS feathers remain if WebGL
  is unavailable or its context is lost. Captions and controls remain sharp.
- `assets/home-atmosphere.js`: the Observer/eye/twitch, mote field,
  pointer repulsion, click ripples, and reveal behavior extracted from the
  former inline script. The latest shared logo assets remain authoritative;
  the separate Observer emerges on scroll. Its etched `observer-sigil.svg`
  preserves the three-point insignia; a layered inline iris moves within an
  almond-shaped aperture. The decoration lives directly under the body, behind
  content until its rare glance. While the eye is open it rises above paintings,
  and the main content recedes in opacity without losing focus or pointer input.
  Opening, glance and closing take roughly two seconds, with no flash or sound.
  The existing 75-second minimum and rare random roll remain. Reduced motion
  suppresses the Observer; preference changes, page exit and hidden tabs clear
  any dimming and cancel pending motion. The still star field remains.
- `assets/nav.js`: shared desktop navigation and a mobile menu. Escape closes
  the menu and returns focus; navigating, moving focus outside, or changing
  breakpoints closes it. The homepage provides chapter links; tools keep
  their page navigation.
- `assets/showcase.js`: existing data-driven skills/supports/uniques and
  effect tooltips. The collection shows a bounded selection of uniques,
  shuffled from the complete pool. Tabs use arrows/Home/End and roving focus;
  tooltips attach descriptions to the focused item and dismiss on Escape,
  outside click, scrolling, or resizing.

The original `cinema.js`, `cinema-theater.js`, `abyss.js`, `decks.js`, and
`sectionnav.js` retain their responsibilities. The field guide uses the
existing biome/event decks inside a native disclosure. The trailer continues
to open on first/weekly arrival and from the interactive logo. There is no
separate trailer call-to-action; clicking the logo rewards exploration.

## Artwork and content

The nine paintings in `site/assets/art/` are existing project trailer key art.
Berserker retains its original; the 38 paintings in `site/assets/art/classes/`
give every other class its own scene, including matching replacement portraits
for Necromancer and Sorcerer. All are
illustrative key art, not gameplay screenshots. Each folder records provenance;
`docs/design/class-art-prompts.json` preserves the initial generation prompts,
and `docs/design/class-art-revisions.json` records anatomy edits, replacement
caster portraits, and owner-selected fresh pose variations. The Necromancer
uses her first generated replacement, preserving its original hand perspective.
Revised image URLs include a cache version.
`assets/class-art.js` maps class IDs to paintings, alternative text and optional
crop positions for companions. New classes without authored art use a frontier
scene until their painting is added. The coverage test flags missing portraits.
Only the active class image loads; the full roster is never preloaded. The
single class canvas keeps the existing smoke effect and rendering limits.
Its narrower feather keeps faces and companions readable. At desktop widths
of at least 1000 px, the class panel is at least 600 px tall and the painting
is capped at 960 px wide, close to its native 3:2 proportions. This shows more
of the character's stance instead of enlarging a shallow upper-body crop.
Only the hero image is eager-loaded; other paintings load lazily. No runtime
dependency, remote image service, or video download was introduced.

The landing page is organized as introduction → frontier → classes → build
collection → legacy → play/download. Detailed biome/event facts remain
available in the field guide, while the database, passive planner, and
Systems page retain their full tools. Class text and version come from the
CI-generated JSON; do not hand-edit or commit those generated exports.
Chapter headings, class tabs and build steps omit decorative numbering.
Scene captions remain, but no image carries a "Hollow Wake / Key art" label.

## Verification

Run `npm run check`,
`node --test scripts/test-site-presentation.mjs scripts/test-site-class-art.mjs`,
`npm run export-web-data`, and the existing
`balance/site-cinema-ui.cjs` walkthrough (40 checks). Preview `site/` with a
local static server. `npx electron scripts/check-site-world.cjs` verifies
frontier selection, loading races and failures, keyboard/pointer handoff,
Observer visibility and lifecycle, and reduced motion (18 checks). An optional
`--out <folder>` saves its eye preview; default runs leave no captures. Verify
desktop and narrow mobile layouts, class and
collection tab selection, keyboard navigation, tooltips, field-guide
disclosure, and shared navigation on the Database/Tree/Systems pages.
Use a disposable profile with `scripts/temp-dir.cjs` for Electron checks and
remove generated captures when finished. There is no homepage build step.

Publish only the website-owned files on the current main baseline, preserving
unrelated working changes. Follow current `docs/ai/main-health.md` and
`docs/ai/test-cadence.md`: the commit check gates landing; the full gate owns
the coordinated Pages deployment. Do not bypass either gate for a site edit.
