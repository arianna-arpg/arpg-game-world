# Consumed proc and rider cues (GT-023)

Implemented 2026-09-26; crowded encounter recognition and feel remain playtest acceptance.

Consumable buffs wear material-shaped charges below the body: blades, flame
tips, frost shards, lightning strokes or droplets. Filled pieces track the
actual stack bank. Large modded banks use proportional fill within a shared
piece budget. The player has matching marks beside the existing buff/rune
readouts; optional buff hover references and functional counts remain.

Spending a stack releases its material. Natural expiry, removal and unmatched
trigger gates produce no invented release. Next-hit riders carry the same
material to the struck body, with their original status/damage/proc payloads.
Invocation runes retain their ordered HUD diamonds, now also appear on the
body, and fold inward when their actual sequence is consumed into its spell.

Proc, rider, invocation and terminal-sequel names no longer generate combat
captions. Existing payloads own their presentation: outward sparks, area
blasts, warning footprints, summoned bodies, lightwells and vents. Self-side
recovery gestures require a real resource/charge/ward gain, cooldown reduction
or cleanse. Buff application/refresh visibly dresses the actual stored buff.

Hemorrhage and future `StatusDef.pop` wounds release at `popAcc` payout in
`Actor.updateTimers`, not before an attempted application. Immune applications,
empty banks and repeated reads cannot manufacture a pop. This visual signals
the consumed wound bank; downstream mitigation and shield absorption remain
the ordinary DoT pipeline's responsibility.
The world-space tear outlives a lethal payout and follows the existing flash
snapshot path, so killing the victim does not erase the pop's afterimage.

## Authoring and tuning

- `data/procCues.ts`: material geometry, color, lifetime, spacing, opacity and
  body/HUD budgets. Add registry entries without editing the resolver.
- `BuffEffect.storedCue`: override material/color, opt another buff into a
  persistent read, or use `false` to omit it. Consumable and next-hit buffs
  otherwise infer material from their status, typed damage and modifier tags.
- `ProcDef.procCue`: self-side gain material/color or `false`. The legacy
  `announceName: false` also suppresses supplementary proc gestures, preserving
  the combo family’s own visual ownership. Explicit buff profiles still apply.
- `StatusDef.pop.procCue`: payout material/color or `false`.
- `InvocationRule.releaseCue`: consumed rune gesture or `false`.
- Proc riders and sequels use their existing catalog skill's configurable
  delivery/rendering. Adding a reference name never opts into a caption.

`engine/procCues.ts` reads banks without mutating them, coalesces repeated
releases, and bounds concurrent gestures. Zone transit clears afterimages while
preserving the underlying unspent buffs. Snapshot rows carry resolved state
for players, enemies and companions; empty snapshots clear stale client rows.
World cues retain the actor renderer's visibility, tier and opacity gates.
No combat probability, proc power, stack cost, depth, attribution, damage,
target selection or invocation conversion is changed by presentation.

## Verification

- `npm run check`
- `npm run probe -- proccues`: 55 consumed-state and rejection checks, payload
  preservation, invocation, all-actor snapshots, fallback/opt-out and bounded
  caption-free Canvas geometry. Exports the catalog used by the UI harness.
- Existing `talents`, `scaldkit` and `combocues` probes; simulation smoke suite.
- Build then hidden `balance/proc-cues-ui.cjs`: disposable saves, actual
  renderer, simultaneous materials, player HUD, pop/invocation, cleanup and
  bright/dark terrain at full and compact viewport sizes, plus the HUD on a
  co-op mirror with no reconstructed buff definitions.

Generated captures and logs live under ignored `balance/reports/`. Adjust the
shared profiles after in-game feedback; automated checks do not establish
crowded-combat recognition or replace that playtest.
