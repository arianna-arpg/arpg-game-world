# The Mass & Authority Fabric

Who moves whom — and what it costs to be moved. The fabric turns the existing
weight basis into a full physics identity: **the heavy both resist shoves and
shove harder**, arrested momentum wounds, and a launched body is a weapon
against everything in its path. Player direction, verbatim: *"large enemies
are going to shove the player more readily and easily than the other way
around UNLESS the player has actually built towards poise/mass."*

Module: `src/engine/mass.ts` (`MASS_CFG`) · Probe: `balance/probe_mass.ts`
(`npx tsx balance/probe_mass.ts`).

## The weight basis (pre-existing, not duplicated)

- `weight` stat (engine/stats.ts, base 1) — knockback and crowd separation
  divide by it. Gear (`of Ballast/Millstone` body rolls), Fortitude
  (0.2%/pt — attributes SCALE, never seed) and passives raise it; curses can
  shed it (floor `DEFENSE_CFG.weight.min`).
- Monsters default it at spawn: `(radius / refRadius) ^ radiusPow ×
  material density × def.heft` unless `def.base.weight` pins an absolute
  value (ghosts author 0.2 and keep it). Scale variance folds in first —
  a big adult aurochs is honestly heavier than its calf.
- **POISE IS MASS**: `Actor.effectiveWeight()` multiplies by current
  unbroken poise (`DEFENSE_CFG.weight.perPoise`). A poised colossus is an
  anchor; break the bar and it moves. This is THE one weight read.

## The density column (`MATERIAL_NATURE.density`, data/monsters.ts)

How much BODY per unit of silhouette — the material ontology's third verdict
beside `remains` and `breathes`. Organics rest at 1 (bone stays 1 on
purpose: a skeleton is mostly air — volume, not substance); stone 1.6,
metal 1.85, crystal 1.5, ice 1.3, wood 1.15; ethereal 0.35, void 0.55,
ember 0.6, cloth 0.85, slime 0.9. `defDensity(def)` is the one read. A wisp
flies from a slap; a same-size golem plants. Escape hatches, in order:
`def.heft` (a multiplier that keeps composing — the lode thrall's 2.2, the
scree skitter's 0.45) then `def.base.weight` (absolute pin).

## Shove authority (the asymmetry)

`World.pushActor` has always divided by the TARGET's effective weight. The
fabric folds in the PUSHER's:

```
impulse = strength × clamp(casterEffWeight^pow, min, max) × (1 + shoveAuthority) / targetEffWeight
```

- Normalized to EXACTLY 1 at effective weight 1: a fresh hero's knockback,
  casterless wind/traps/track payloads, and every tuned strength in the data
  keep their reach to the pixel. The asymmetry only opens where mass diverges.
- Sublinear (`pow` 0.55) and clamped on the BODY term only —
  `shoveAuthority` (a stat, tag-filtered through the live skill instance)
  scales beyond the clamp on purpose: buildcraft may exceed anatomy.
- `opts.noAuthority` marks an impulse whose authority is ALREADY SPENT
  (plow-through momentum hand-offs) so it is never folded twice.
- Everything routes through `pushActor` — hit knockback, displaceForce,
  pulls, procs, bumpers, tracks, wind — so the fold is universal by
  construction. Spares unchanged: construct / anchored / leaping / dormant
  bodies refuse, latched riders scrape loose first.

## Impact (momentum made damage)

At the push-integration site, a body arrested by a **wall** above
`MASS_CFG.impact.minSpeed` takes physical =
`clamp(baseFrac × speed × ownEffWeight / refMomentum, 0, maxFrac)` of its
own max life, × the shover's `impactDamage` stat, through `mitigateTyped`
(armor and the defender stack apply; never evasion/block — you dodge a wall
with your feet). Impulse conservation makes `speed × weight` track the shove
that launched it, authority included: damage follows the SHOVE, and heavy
victims aren't safer against walls than light ones.

- **Hostile-authored only.** No caster (wind, geysers) or a non-hostile
  caster (friendly repositioning pulls) → zero damage. Weather is not an
  attack.
- Kill credit goes to the shover (`kill(victim, false, caster)`) — the
  pitfall lane's law extended to masonry. Void lips stay the pitfall
  fabric's own resolution (never double-punished).
- Per-body ICD (`impact.icdSec`) — a corner's double clamp is one wound.
- The `crushing_impact` support's collision proc is the separate,
  SKILL-damage lane riding the same detection seam (unchanged).

## The bowling lane (body-vs-body)

A pushed body at ≥ `slam.minSpeed` sweeps bodies in its path
(`World.sweepBodySlam`):

- **Arrest** (`blockerW ≥ moverW × arrestRatio`): the blocker is a wall —
  the mover takes the wall wound, the caster's collision procs roll ("a
  wall of meat is still a wall"), the blocker feels a token lean
  (`arrestNudge`), the flight ends.
- **Plow-through** (lighter): the struck body takes `struckFrac` of the
  mover's impact fraction and inherits `transfer × speed` as a
  `noAuthority` shove (chain credit pays the original shover); the mover
  keeps `plowDamping` per body. Shove the ogre into the goblin pack and the
  pack scatters; shove the goblin into the ogre and the goblin learns why not.
- Spares: dormant (planted), phasing (no rim to strike), untargetable /
  invulnerable / downed, cross-altitude (aloft vs grounded pass by), and the
  original caster. Struck-body damage is hostile-gated like wall impact;
  the momentum hand-off itself is physics and applies to any legal body.
- Shared per-body ICD with wall impact — lingering overlaps can't slingshot.

## Player levers

- Stats: `weight`, `shoveAuthority`, `impactDamage` (seated + blurbed in
  data/sheet.ts — probe_sheet holds the wall).
- Support: **Battering Ram** (melee) — knockback + authority + impact on the
  linked skill; sister to Crushing Impact, different lane.
- Passives: the mass cluster off Shockwave — **Ballast** / **Follow-Through**
  smalls, **The Millstone** notable.

## Readability

- Bestiary detail (hide tier) prints **Heft** as a tier word
  (`heftTierOf`: Featherweight → Light → Solid → Heavy → Immense →
  Monumental) from the def's resolved resting weight — "can I shove this?"
  answered before the first attempt.
- The stonekin WEIGHT LESSON roster (karst_reach): `sarsen_ram` (the
  charging avalanche — aurochs charge kernel, gore knockback 240, stone ×
  heft 1.15), `lode_thrall` (the density exception — knee-high, metal ×
  heft 2.2 ≈ weight 2.5, read instantly by the anchor it wears; it CONDUCTS
  where stone never did), and the retrofit `scree_skitter` heft 0.45 (the
  shambler's spilled chaff = the bowling pins).
- Terrain: `sarsen_bumper` (data/tracks.ts rule + bumperDome painter params)
  — the rime bumper's contact grammar in old stone; mass does the
  arithmetic on every fling.

## Tuning notes

- All dials in `MASS_CFG`; the weight basis dials stay in
  `DEFENSE_CFG.weight`. No literals at call sites.
- Baseline discipline: authority's identity at weight 1 + organic densities
  at 1 keep the sim smoke suite byte-stable; the asymmetry is real
  everywhere masses actually diverge.
- Open dials deliberately NOT taken in v1: impact poise damage, casterless
  environmental impact (a config flag away), grab/throw (the GRAB FABRIC
  consumes this module's mass — land ordering honored).
