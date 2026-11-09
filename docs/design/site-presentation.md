# Website presentation

The GitHub Pages entrypoint is `site/index.html`. It introduces the playable
main game; it must not imply the separate seamless-world experiment is the
ordinary browser/download build. Play and release URLs retain their existing
destinations and relative paths work under `/arpg-game-world/`.

## Page owners

- `assets/home.css`: landing-page composition, responsive layouts, the
  charcoal/brass palette, and scoped restyling of the existing collection.
- `assets/home.js` and `class-deck.js`: keyboard-accessible class tabs, three
  random classes per visit from the entire exported roster, and a "Discover
  other lives" deal. Every class is drawn before the pool recycles; a deal
  never contains duplicates, even across a cycle boundary. Names, primary
  attributes, descriptions and database links travel together. The authored
  three-class introduction remains usable if the export cannot load.
  This module also binds version metadata and the visible trailer button.
- `assets/memory-art.js`: transparent, slowly drifting image rims adapted
  from the cinema's own domain-warped smoke. Four reusable canvases cover the
  hero, frontier, active class and legacy art. Rendering pauses offscreen and
  in background tabs, caps at 20 fps and one million pixels per canvas, and
  holds still for reduced motion or data saving. CSS feathers remain if WebGL
  is unavailable or its context is lost. Captions and controls remain sharp.
- `assets/home-atmosphere.js`: the original Observer/eye/twitch, mote field,
  pointer repulsion, click ripples, and reveal behavior extracted from the
  former inline script. The latest shared logo assets remain authoritative;
  the separate Observer emerges on scroll, following main's branding update.
  Reduced motion retains a still field and anchored mark.
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
to open on first/weekly arrival and from either the logo or explicit button.

## Artwork and content

The nine compressed paintings in `site/assets/art/` are existing project
trailer key art, clearly labeled as such on the page. They are not gameplay
screenshots. Their provenance is in that folder's README. Only the hero image
is eager-loaded; other paintings load lazily. Berserker, Sorcerer and
Necromancer retain their specific paintings. Other classes use contextual
world art chosen by their primary attribute, without inventing class portraits.
No additional dependency,
framework, remote image service, or video download was introduced.

The landing page is organized as introduction → frontier → classes → build
collection → legacy → play/download. Detailed biome/event facts remain
available in the field guide, while the database, passive planner, and
Systems page retain their full tools. Class text and version come from the
CI-generated JSON; do not hand-edit or commit those generated exports.

## Verification

Run `npm run check`, `node --test scripts/test-site-presentation.mjs`,
`npm run export-web-data`, and the existing
`balance/site-cinema-ui.cjs` walkthrough (40 checks). Preview `site/` with a
local static server, verify desktop and narrow mobile layouts, class and
collection tab selection, keyboard navigation, tooltips, field-guide
disclosure, and shared navigation on the Database/Tree/Systems pages.
Use a disposable profile with `scripts/temp-dir.cjs` for Electron checks and
remove generated captures when finished. There is no homepage build step.

Publish only the website-owned files on the current main baseline, preserving
unrelated working changes. Follow current `docs/ai/main-health.md` and
`docs/ai/test-cadence.md`: the commit check gates landing; the full gate owns
the coordinated Pages deployment. Do not bypass either gate for a site edit.
