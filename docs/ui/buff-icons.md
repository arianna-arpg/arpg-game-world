# Buff icons

Buffs above the hotbar use compact versions of the skill artwork that caused
them. Existing hover names, modifiers, stack counts and expiry text remain
unchanged. The shared skill-artwork preference also applies to these icons.

During the final five seconds the icon loses color from top to bottom: full
color at five seconds, half gray at 2.5, fully gray at expiry. The actor's
native timer owns the display. Refreshing restores the corresponding color;
consumption or expiry removes the icon with the buff. Independent stacks use
the longest remaining stack, matching the existing hover text. Indefinite or
unknown clocks do not invent an expiry warning.

## Attribution and extension

`engine/buffSource.ts` provides `buffWithSource(effect, instance)`. It copies
the granting skill's id, name, icon, color and tags into `BuffEffect.sourceSkill`
without mutating the authored effect. Secondary payloads resolve through their
existing parent-instance links. No buff-name lookup table or hotbar search is
needed, and runtime-authored skill faces work without a registry entry.

The ordinary effect-grant path uses this helper for self, allied, minion,
targeted and delayed buffs. Proc buffs, cast-cycle rewards, empowerment, guard,
attack-sequence, challenge, companion and assault grants use it too. Sympathy
replays carry the copied identity in the existing buff-gain event. Shared-clock
refreshes adopt the latest grant's identity along with its native definition;
independent stacks retain the native representative definition.

For a new skill-driven direct `addBuff` call, wrap the definition with
`buffWithSource`. Effects without a skill source, such as shrines or pickups,
keep their existing proc symbol when available or receive a generic buff icon.
This change does not add buff replication: existing stripped-down co-op mirror
actors continue to display the host's proc symbols through their current DTOs.

## Presentation controls

`VIS_CFG.buffIcons` owns size (22), gap (3), warning seconds (5), hotbar
clearance, auxiliary clearance and colors. A nonpositive warning window
disables the wipe. `render/vis/buffIcons.ts` reads these values and draws through
the same cached `drawSkillIcon` function as the hotbar. Colored and gray areas
use disjoint clips so translucent proc glyphs do not retain color beneath the
gray portion. Stack text and borders stay legible above both areas.

Icons preserve insertion order and wrap upward within each seat's hotbar
width. Combo, invocation, progress, proc and possession indicators move above
the occupied rows. Hover targeting uses the same rectangles as drawing, and
the hover card paints above those auxiliary indicators.

## Verification

- `npm run check`
- `npx tsx balance/buff-icons-check.ts`: real casts, attribution, allied grants,
  gain-event replay, shared refreshes, custom artwork, unchanged hover payload,
  real expiry, independent-stack clocks and wrapped layout.
- `npm run probe -- proccues`, `sympathy`, `shieldup`, and
  `devotedstartertrees` cover existing grant and cleanup behavior.
- `npx vite build --outDir balance/reports/buff-icons-dist`, then
  `npx electron balance/buff-icons-ui.cjs`: hidden disposable client, real
  hotbar art, pixel assertions for the five-second threshold and wipe
  direction, actual hover, native refresh/expiry, scaling and narrow layout.
  Captures and report go to `balance/reports/buff-icons/`.
