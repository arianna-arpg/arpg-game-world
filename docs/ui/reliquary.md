# Reliquary presentation

The Inventory's Reliquary page presents active state, account Empowerment,
player XP cost and occupied cells before the equipped grid. The ribbon counts
equipped items; the summary counts their full footprints. Sealed cells name their
unlock on hover. A framed board and a separate return-to-pack target retain the
native item geometry and gestures. Death protection stays visible; detailed rules
are expandable. The first-charm lesson retains its direct seating action.

The equipped board reads as an ancient warded case through its etched bindings,
seal geometry and inset grid. Its entire palette comes from the shared interface
tokens, including the case, hinges, item faces, inscription and wards. The four wards light only when
the Reliquary is enabled and contains an equipped Relic. Empty/disabled cases
stay quiet. This is a presentation of existing state, not a corruption meter or
new danger mechanic. The cost remains explicitly labeled **Player XP**.

Plain text is reserved for identity, state, values, instructions and actions.
There is no decorative tagline or inner-case heading. A small crest replaces
the latter. The lower inscription uses `data/runescript.ts::encipher` and the
existing `.runescript` font stack; it is decorative and hidden from assistive
technology. Keep the source phrase in the copy registry and encode it once,
instead of maintaining a second alphabet or a hand-transcribed rune string.

The cabinet scales around the board's real dimensions. Its etching sits behind
native cells and cannot intercept input. Original vector faces distinguish the
charm, talisman, idol and effigy families across equipment, pack, storage, vendor
and drag previews. Rarity borders and locks retain their meanings.

## Runic backdrop

Two counter-rotating rune bands sit beneath the native item tray. A recessed
light well and two drifting edge inscriptions give the case depth without
crossing its controls or descriptive text. The visual references are Mu's
depth well (`render/vis/ambientFx.ts`), the carved travel bands
(`render/vis/runeRing.ts`) and the website's restrained ether drift
(`site/assets/home-atmosphere.js`). These are original Hollow Wake vectors;
the glyphs come exclusively from `data/runescript.ts`, and all light inherits
the live Wardrobe palette. There is no new lore message or gameplay state.

`RELIC_ART.ambience` owns enablement, band counts, glyph sampling, radius,
size, direction, timing, phase and intensity. The case composition has five
CSS animations: two whole-band transforms, one shared breathing opacity, and
two column drifts. Its band glyphs never animate independently. Only transform
and opacity change; the small glow is painted with the glyphs. No filters,
downloaded textures, timers, per-frame JavaScript or game-loop work are added.
Paint containment clips rotated SVG bounds, keeping scroll geometry stable.

The surrounding pane has its own ephemeral rune field, inspired by the website's
scattered lights. Two flexible content regions place the field behind the
summary and instructions, excluding the case by layout instead of coordinates.
The title stays clear. Lesson/rule expansion and UI scale preserve that boundary.
At the default Lively activity, 28 upper and 21 lower glyphs have varied
sizes, paths, phases and lifetimes. Each fades completely before a fresh glyph,
position, path and lifetime are sampled. Consecutive births in one slot use
different letters. They are faint backdrop marks,
not sentences or indicators of Relic power, and remain atmospheric while the
case is empty or disabled.

`RELIC_ART.paneField` owns enablement, region population caps,
quiet lifetime, size, opacity and travel ranges. `render/runeField.ts` owns the
shared activity law and default. The scale runs from 0 (Off) through 15 (Quiet)
and 50 (Lively, the default) to 100 (Matrix). **Wardrobe → Interface** previews
the draft with the same upper field. **Save interface style** applies it to both
regions and stores it with the device’s interface preferences.
Activity raises both population and birth rate; it does not change opacity.
The two regions cap at 64 and 48 glyphs, respectively. At maximum activity their
lifetimes are about 0.87–1.51 seconds; at Quiet they remain 15–26 seconds.
The source alpha range stays 0.09–0.19 throughout.

`ui/runeField.ts` owns the bounded live pool. Each mounted field seeds its own
visual `Rng` from `crypto.getRandomValues`, independent of gameplay randomness.
Fresh births sample the shared alphabet and reuse the existing node,
`KeyframeEffect` and `Animation`; only transform and opacity interpolate.
Finished-animation events drive renewal after the old glyph becomes invisible.
There are no timers, frame callbacks or growing particle collections. The cached
host markup and live pool survive unchanged UI refreshes. Setting activity
preserves existing glyphs and lifetime fractions while adding/removing only
the required slots; retirement cancels animations. Both preview and game mount
this same controller, rather than maintaining a separate preview simulation.

`ui/ambientMotion.ts::observeAmbientMotion` is the reusable visibility gate.
One observer and document listener cover the case and both fields. It observes
each region's actual intersection, including scroll clipping, and
document visibility. The binding is released before a content replacement;
unchanged renders retain the DOM and animation clocks. Closed or clipped pages
pause, empty/disabled cases stay still and dim, and reduced motion cancels field
animations and keeps faint static inscriptions. Reduced motion and pause stop
renewals as well as movement. Rebuilding or disposing a field releases its
animations, observer and listeners. The gate does not own page navigation or
eligibility rules.

The Oracle's **Relic storage** uses the same vocabulary and interface material.
Page buttons show search matches without moving items; leading/trailing search
spaces are ignored. **Stored Relics** expands to item names, optional stat lines,
**To pack** and **Release…**. **Store** deposits pack items; it is reversible.
Release still requires a second press and cannot destroy a locked Relic.
Unplaced recovery items remain visible, as does the pack's death risk.

## Owners

- `src/ui/reliquaryPresentation.ts` owns shared player-facing language.
- `src/ui/reliquary.ts` presents the equipment summary, rules and Oracle storage.
  Values come from the existing account power, XP and item-footprint reads;
  capacity and storage recovery come from the existing board/stash definitions.
- `src/ui/reliquary.css`, imported by `interfaceStyle.css`, owns content layout.
  It consumes the shared `--inv-*` tokens so Wardrobe choices apply immediately.
  Both outer frame and inner case follow Wardrobe; no private color palette or
  overrides of the shared cell/item materials are allowed here.
- `src/render/relicArt.ts` owns the original, attributed vector artwork, family
  registry, layout tokens, seal geometry and configurable ambience. Family selection uses item tags;
  unknown families receive a neutral ward. `itemIcons.ts::itemFaceHtml` is the
  shared HTML face; text-only glyph consumers keep their existing contract.
- `containerPane.ts` and `panels.ts` retain their existing action routing. Details
  and scrolling survive content refreshes; the equipment toggle keeps focus.
  Unchanged board markup is retained during live refreshes.
- `data/containers.ts` owns expansion-card wording; `data/npcDialogues.ts` owns
  the Oracle's dialogue. Her shortened lines retain the journal reward, seating,
  storage and Empowerment instructions without changing dialogue selection.

Panel placement, resizing and page selection remain with
[Inventory pages](inventory-pages.md) and the existing service workspace.
Ownership, death protection, combat restrictions, storage transactions and
investment remain defined by [account Reliquary](../design/account-reliquary.md).
Presentation must not add its own eligibility or progression rules.

## Verification

Run `npm run check`, `npm run sim -- run --suite smoke`, then the `reliquary`,
`relicflow` and `interfacestyle` probe filters separately. Run
`npx electron balance/reliquary-presentation-ui.cjs` for the hidden UI course.
It builds an isolated client, uses isolated saves/profile, and removes scratch
data after Electron exits, including failure. Small screenshots and its report
remain in `balance/reports/reliquary-presentation` for review.

The course covers the first cell, mixed footprints and XP cost, active/inactive
state, combat refusal, focus/details retention, three viewport/style/scale
combinations, reachable drop targets, stable idle controls, escaped names,
search, storage, withdrawal and confirmed/locked release. It also checks the four
family faces, fallback, native cell/tile hit testing, state-dependent wards,
bounded transform/opacity motion, retained clocks, reduced motion, hidden-page
suspension, document-visibility events and scroll clipping. Pane ghosts are
checked for complete fade-in/out, fresh glyphs/positions, animation reuse,
canonical glyphs, bounded density, native
control hits and case exclusion across all tested sizes.
The same course verifies the shared Runescript, absence of decorative English,
and live palette adoption across all four Wardrobe frames without rebuilding
the equipped item controls. Theme detail captures are retained with the report.

For the art-pass comparison, the approved screenshots and source snapshot are
retained locally in `balance/reports/reliquary-comparison/before`; the preceding
bronze art pass is retained in its `ancient` folder, and the approved static
Wardrobe pass in `wardrobe`, followed by the approved animated case in
`living-seal`. After a passing
UI run, `npx electron balance/reliquary-comparison.cjs` generates a standalone
before/after HTML viewer and PNG there, preferring `living-seal`, `wardrobe`, then `ancient`,
then `before` as its baseline. A live pane preview uses the captured markup
and production stylesheets. These review artifacts are not game
state, a second implementation or a player-facing style setting.

The live preview includes an accessible 0–100 **Rune activity** slider,
Quiet/Lively/Matrix presets, population and estimated birth-rate readouts, and a
pause control. Like a fresh game, it starts at Lively. The standalone preview
keeps its adjustments within the viewer. Its small runtime bundle is built directly from
the production controller using the existing esbuild toolchain. The preview
check exercises natural renewals at maximum activity, bounded pool reuse,
unchanged brightness, off/pause/disposal, keyboard input, reduced motion and
narrow layouts.
