# Skill artwork

Every registered skill has an authored illustration in
`src/render/skillIconCatalog.ts`. This includes learnable skills, companion
orders, transformed buttons, flask payloads, reloads, captured enemy arts and
ultimate follow-ups. The catalogue at this revision covers 948 definitions,
including 604 droppable/learnable skills and every class's opening bar.

## Visual contract

Each recipe combines a subject, an action composition and, when needed, a
second subject that represents real equipment or a payload. The shapes are
original 24-unit vectors in `skillIconArt.ts`. Axes, spears, scythes and blunt
weapons have different silhouettes. Creatures retain their anatomy and gear;
all six flasks have different vessels. Motion and boundaries distinguish a
projectile, fan, pulse, ring, field, channel, dash, blink, summon or return.
Element colors reinforce identity; they never provide the sole distinction.
There are no initials, random ID marks, fonts or external art in artwork mode.

`skillIconKey` resolves explicit alternate artwork first, then the registered
skill ID, then the existing semantic fallback for unknown future content.
The original twelve starter/flask family keys are recognized as legacy
defaults and upgraded to their registered identities. An explicit `recall`
override always wins; converted skills retain the identity returned by
`World.slotFaceOf`. Renaming a display name cannot change the artwork.
Missing, false or unknown old icon keys cannot turn a registered skill into
a generic category icon. The global text preference is independent of them.

The Canvas hotbar, SVG rack, vendor, preparation panel and Memory chips use the
same paths, transforms, palette and paint order. The caller retains its labels,
tooltips, input targets, cooldowns, charge banks, gauges and affordability rules.
No costs, skills, status effects, saves or simulation behavior change.

## Rendering and preference

`SKILL_ICON_VIEW` owns ink, background, outline, tint and cache limits. Canvas
faces bake at their actual transformed pixel footprint (12–192 pixels), then
the caller's alpha composites the complete face once. The 128-entry LRU bounds
raster memory. Canvas drawing preserves the caller's state and consumes no
randomness. SVG follows the same layer transforms and escapes dynamic colors.

Options → Visuals → Skill Faces defaults to ARTWORK. Missing legacy settings
also choose artwork. Explicit saved `skillArtwork:false` remains ACRONYMS, and
either preference changes all surfaces immediately. classicSkillMarkup and
skillAcronym retain main's original fallback: native tile colors/fonts, small dark
hotbar initials, three-letter abbreviation cap, and REC for Recall. Debuff-name preferences
remain independent. There is no account or character reset.

## Extending and verifying

Add a recipe for every new skill ID. Choose shapes from the actual mechanics,
and add a subject or action drawing when the vocabulary does not express them.
Do not distinguish two skills only by tint or an arbitrary marker. The typed
catalogue validates component names; `probe_skillicons.ts` checks exact registry
coverage, stale IDs, duplicate geometry, stable identity, explicit overrides,
escaped SVG, registry purity and both live preference modes.

Run `npm run check`, `npm run probe -- skillicons` and
`npm run probe -- statusreadout`. Run
`node_modules/.bin/electron balance/skill-icon-atlas.cjs` to render every entry
and all opening bars. On Windows use `electron.cmd`. Reports go under the
ignored `balance/reports/skill-icon-atlas/`: twelve labelled atlas sheets,
class bars in color and monochrome, alpha examples and `report.json`.
The atlas checks nonempty output and distinct monochrome pixels at 12/32px,
SVG/Canvas parity at 48px, unchanged registry/paint state and no RNG access.
Pixel uniqueness guards accidental collisions; visual inspection still decides
whether a new recipe is a good illustration of the skill.

For the hidden native UI harnesses, build an isolated Seamless preview with
its scoped storage (PowerShell):

```powershell
$env:HOLLOW_WAKE_WORLDMASS = '1'
$env:HOLLOW_WAKE_STORAGE_SCOPE = 'preview:seamless-world'
node_modules/.bin/vite.cmd build --outDir balance/reports/distinct-skills-dist
$env:HOLLOW_WAKE_QA_DIST = 'balance/reports/distinct-skills-dist'
node_modules/.bin/electron.cmd balance/skill-icons-ui.cjs
node_modules/.bin/electron.cmd balance/debuff-icons-ui.cjs
```

They exercise native bar/rack art, unlearning into a Memory, recall, cooldowns,
empty mana, actual Options switching, narrow scaled HUD and Save/Continue.
These are controlled render/integration checks, not a claim of gameplay review.
