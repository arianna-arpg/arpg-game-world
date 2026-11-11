# Website presentation

The GitHub Pages entrypoint is `site/index.html`. It introduces the playable
main game; it must not imply the separate seamless-world experiment is the
ordinary browser/download build. Play and release URLs retain their existing
destinations and relative paths work under `/arpg-game-world/`.
The browser tab and social title are simply "Hollow Wake".

## Page owners

- `assets/home.css`: landing-page composition, responsive layouts, the
  Eigengrau/brass palette, and scoped restyling of the existing collection.
- `assets/home-theme.js`: chooses a palette before first paint: Eigengrau
  `#16161d` for 75% of arrivals, original charcoal `#090d10` for 25%. The
  selected palette stays fixed for that document; nothing is persisted.
  `--bg-rgb` drives the page, navigation, CSS fades and the memory shader's
  readability wash. Browser theme color follows the same selection. Without
  JavaScript the stylesheet defaults to Eigengrau.
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
  from the cinema's own domain-warped smoke. Five reusable canvases cover the
  hero, frontier, active class, legacy and optional Vocation art. Each canvas extends 20% of the
  image height beyond each edge, without changing the source image's crop.
  The same flow feeds sparse outer filaments and fades completely before the
  expanded canvas ends. Class readability shading is multiplied by the image
  alpha inside the shader; a separate CSS wash must never leave a rectangle
  beyond it. The full-width hero clips only at its page-sized container.
  Rendering pauses offscreen and
  in background tabs, caps at 20 fps and one million pixels per canvas, and
  holds still for reduced motion or data saving. Source-coordinate masks add
  very small tree sway and river ripples to the opening painting, excluding
  the traveler and architecture. Class and Vocation art animate only colored
  illumination, preserving faces, limbs and grips. `data-living-art` selects
  the profile; neither technique is skeletal character animation. CSS feathers remain if WebGL
  is unavailable or its context is lost. Captions and controls remain sharp.
- `assets/home-atmosphere.js`: the Observer/eye/twitch, mote field,
  pointer repulsion, click ripples, and reveal behavior extracted from the
  former inline script. The latest shared logo assets remain authoritative;
  the separate Observer emerges on scroll. Its etched `observer-sigil.svg`
  preserves the three-point insignia; `observer-art.js` mounts a layered iris
  that fills the entire central aperture (radius 4.37 in the 32-unit insignia).
  The selected manifestation is **The Violet Rupture** (`rift`). The Starless,
  Chorus and Rift options remain in `observer-study.html` for comparison. The outer
  manifestation shares the eye's opening amount and disappears when it closes.
  The decoration lives directly under the body, behind
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
crop positions for companions. New classes without authored art use the
spectral hand (`assets/art/hand.webp`) until their painting is added. The same
image catches failed class downloads without an endless retry loop. The
coverage test flags missing portraits.
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

## Optional Vocation gallery

"A deeper calling" sits below the class showcase as a closed native disclosure.
The gallery module and catalogue load only after opening it; only the chosen
painting loads. `vocation-scenes.js` covers all 31 current Vocations, including
eight secret paths, across 28 of the 39 base classes. Only the selected class's
paths appear; `home.js` passes both initial selection and every subsequent
click, keyboard choice or new deal to the gallery's `setClass(id,name)`.
A single path has no redundant tab strip; multiple paths use accessible tabs.
Classes without a current Vocation get an explicit empty message, never an
unrelated Vocation. Secret names, copy and images stay absent until a separate
"Reveal an undiscovered calling" action. This preserves intentional exploration
without publishing quest locations. Eligibility uses exact `classIds`, following the
game's `classId` and `offeredClasses`; the Spellblade Vocation belongs to the
Magician, not the separate base class also named Spellblade. Ranger already
has Wildstalker plus secret Greenwarden. Class filtering precedes both spoiler
and account filtering, so neither can expose another class's path.

Artwork depicts the same person as the selected base class. The approved
Necromancer/Gravebinder painting is retained; `artworkByClass` gives Summoner
its own Gravebinder variant. Other paintings preserve their base character's
skin tone, face, age and hair. New entries own their class eligibility, image,
alt text, copy, secret flag and stable game ID. Generation prompts and identity
references live beside the 32 paintings (31 paths plus the Summoner variant)
in `assets/art/vocations/`. The 25-image completion pass uses each base-class
painting as its identity reference; `roster-prompts.json` records the prompts.
The roster check compares every entry, secret flag and class mapping with
`src/data/vocations.ts`, so future additions cannot silently miss the gallery.

The owner's Phase 1 copy brief is applied verbatim to the landing page,
three world scenes and six original Vocation previews. Static world copy matches
the interactive scenes. Authored featured-class descriptions survive reshuffling;
other classes retain their database descriptions. The 25 additional Vocation
descriptions summarize their current game mechanics in the same direct register.

`vocation-gallery.js` owns selection, loading races, retries, accessible tabs
and a single reusable canvas. Changing classes immediately clears the previous
painting, invalidates pending loads and resets the class's spoiler reveal.
Closed galleries do not fetch replacement paintings. A failed first painting
uses the neutral spectral hand with a retry button. It accepts `unlockedVocationIds` for a future
account adapter; explicit empty access exposes nothing. Catalogue unlock keys
match `vocation_unlocked_<id>` in the game. This is a presentation seam, not
authentication or access control. A future Vault integration must authorize
on its server and return only permitted data. No account UI or save reading
exists in this pass.

## Gothic ornament and illustrated discoveries

`home-gothic.css` replaces the homepage's straight structural rules with original
bronze tracery, tapered hairlines and pointed corners from `assets/brand/`.
These are decorative and do not intercept input. The existing typography,
Observer, ambient interactions, random class deck and class-linked Vocations remain.

The field guide maps exported biome tags to atmospheric landscape families.
`event-art.js` gives every registered event its own painting by stable package ID:
36 new scenes in `assets/art/events/` and three fitting paintings retained from
the original field guide. `field-art.js` resolves both catalogues; unknown IDs use
a neutral field journal. Shuffling deals a randomized spread with different painting
families first, while every original entry remains eligible. Native lazy images
remain unloaded inside the closed disclosure. Failed images use the journal,
then disappear if that also fails; the content and tooltip still work.

The collection pairs each selected tab with its own illustration and introduction,
beside a responsive grid of named items. `collection-art.js` owns the category
paintings and small material emblems. Individual painted skill icons are a separate
review study and are not installed by this presentation pass. The widgets still
read the game's exported skills, supports, uniques, biomes and events; names and
stats are not copied into an independent catalogue. Existing database links remain.

Both widgets retain keyboard, pointer and touch inspection. Escape, scrolling,
resizing, closing the guide and outside taps dismiss field tooltips, with accessible
description relationships cleared too. Hidden tooltips reset their positions so
resizing cannot leave invisible content widening the page. Shared subpage widgets
keep their compact presentation when homepage art registries are absent.

Artwork is 960 × 640 WebP (under 200 KB each), loaded on demand. Collection
breathing and card zoom respect reduced motion. Exact generation prompts and
original PNG provenance live beside the paintings in `assets/art/field-guide/`
and `assets/art/collection/`, plus `assets/art/events/` for the individual events.

The chapter strip and both disclosures own their upper and lower ornaments,
with equal space around the compact content. Their following sections omit their
own upper rule, keeping one shared boundary. Disclosure borders follow the natural
panel height through the unfolding animation. Major section gaps share one responsive
spacing value. The build flow and collection form one group without an internal rule.
Divider opacity remains unchanged; the softer treatment is a separate local study.
The field guide and Vocation summaries
share the same centered, translucent expand control. `disclosure-motion.js`
enhances native details with a brief vertical unfold and a restrained fade. It
retargets when lazy Vocation content grows, reverses repeated clicks, and releases
clipping after opening so the surrounding memory effect remains visible. Closing
content is temporarily inert. Reduced motion and missing animation support retain
the immediate native disclosure; no JavaScript is required to open the field guide.

## Verification

Run `npm run check`,
`node --test scripts/test-site-gothic.mjs` and
`npx electron scripts/check-site-disclosures.cjs` for animated opening/closing,
rapid reversals, delayed content, centered controls and reduced motion, plus
`npx electron scripts/check-site-gothic.cjs` for illustrated card loading,
fallbacks, collection selection, touch/keyboard inspection, shared-widget
compatibility, reduced motion and layouts from 320 to 1440 pixels,
`node --test scripts/test-site-presentation.mjs scripts/test-site-class-art.mjs`,
plus `scripts/test-site-theme.mjs` and `scripts/test-site-vocations.mjs`,
`npm run export-web-data`, and the existing
`balance/site-cinema-ui.cjs` walkthrough (40 checks). Preview `site/` with a
local static server. `npx electron scripts/check-site-world.cjs` verifies
frontier selection, loading races and failures, keyboard/pointer handoff,
Observer visibility and lifecycle, and reduced motion (19 checks). An optional
`--out <folder>` saves its eye preview; default runs leave no captures. Run
`npx electron scripts/check-site-memory.cjs` for real framebuffer transparency,
outward flow, the pixel budget, responsive overflow, reduced motion and graphics
context loss/restoration (15 checks).
`npx electron scripts/check-site-vocations.cjs` verifies first-paint/shader
palette agreement, disclosure and secret loading, image races/failures/retry,
keyboard selection, the class fallback, mobile overflow, and motion pauses.
Visually verify desktop and narrow mobile layouts, class and
collection tab selection, keyboard navigation, tooltips, field-guide
disclosure, and shared navigation on the Database/Tree/Systems pages.
Use a disposable profile with `scripts/temp-dir.cjs` for Electron checks and
remove generated captures when finished. There is no homepage build step.

Publish only the website-owned files on the current main baseline, preserving
unrelated working changes. Follow current `docs/ai/main-health.md` and
`docs/ai/test-cadence.md`: the commit check gates landing; the full gate owns
the coordinated Pages deployment. Do not bypass either gate for a site edit.
