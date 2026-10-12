# Targeted skills, tethers and offerings

This presentation pass stays on `codex/skill-visual-identity`, alongside the
nova, flight, field and resource passes. Main and seamless content remain
independent. Revalidate against seamless's current head before transferring it.

## Authored identities

`src/data/skillTargetVisuals.ts` owns explicit compositions for all 38 current
target deliveries, twelve tether voices (including the fallback), and seven
rites. No name parsing, ID hashing or color selects a shape. The centre seal
identifies the action; surrounding material and closing, opening, rising,
orbiting or reversing motion distinguish related casts. Wardrobe paint changes
color without changing that composition. Dark underpainting preserves marks
on pale terrain.

Examples: Mend stitches shut, Lay on Hands closes two palms, Renew grows a
sprout, Ignite lifts a three-flame brand, Living Bomb contracts around a cage,
Transfixing Gaze closes around an eye, and Turnwise Hex reverses a spiral.
Siphon Blood opens a wound while Sanguine Leech closes fangs. The existing
resource-flow layer still shows blood returning only when recovery really lands.

| Tether | Shape and motion |
| --- | --- |
| Tripwire | Straight wire with traveling barbs |
| Tripwire Web | Crossed double strands with web anchors |
| Transient Inferno | Flame tongues over an undulating strand |
| Lifeline | Opposed living braids with restorative material |
| Witchfire Leash | Returning chain links and cage anchors |
| Charged Span | Dense alternating lightning |
| Healing Chain | Mending pulses between the real hops |
| Static Strike | Wider-spaced electrical turns |
| Tempest Gathering | Rapid opposing storm braids |
| Embedded shards | Cross-braced rails and crown anchors |
| Pack bond | Linked knots with fang anchors |
| Unknown/legacy | Quiet barbed link and knot anchors |

A tether belonging to an authored target skill also inherits that skill's
endpoint seal. Its support's strand stays identifiable. The painter clips all
detail to the real straight capsule; quiet parallel edges disclose the tested
band independently of the internal motion. Width, duration, distance break,
damage ticks, healing, attribution and endpoint ownership are unchanged.
Finite expiry softens the last 0.12 seconds of the existing lifetime; removal
on death or break is immediate. No damaging-looking ghost band survives it.

## Resolved casts and actual transactions

`World.showSkillArrival` freezes a short mark at the actual recipient. It is a
cast signature, not proof that a status stuck or healing succeeded. The shared
target lane covers friendly casts, hostile casts, additional selected victims
and healing-chain arrivals. Taming paints its success signature only after
ownership changes. Only an actual splash retains an outer area boundary; a
single-target mark does not imply radial damage.

The offering review covers Bone Offering, Oblation of Flesh, Oblation of Life,
Oblation of Mana, Corpse Feast, Gorge Carrion and Blood Toll's sacrifice.
Consumed corpses receive marks only after removal; living sacrifices only after
death. Self-payments use the resolved self cast. Bone Offering and shared rite
buffs dress actual recipients through `grantTreeBuff`, including delayed buff
grants. Multiple buffs at the same place/instant coalesce to one mark.

Bone Offering uses crossed bones and shield fragments. Flesh lifts a chalice,
life opens a blood crown, and mana closes rune spokes. Corpse Feast closes
fangs; Gorge Carrion closes a toothed maw with spores. Sacrifice lifts souls
through an hourglass. These compose with measured feeding transfers rather
than inventing another payout or projectile. Amalgam's existing accumulated
ritual mass and other corpse skills' flight/field/summon art stay responsible
for their own behavior. This is not a completion claim for every self or summon
delivery.

`feedingCue: false` silences rite/consumption presentation. Corpse Feast passes
its material through `applyRestore` once, preventing duplicate default/custom
gain cues and retaining the opt-out without changing the amount restored.

## Shared rendering and co-op

`render/vis/skillTargetVoice.ts` registers the target, splash and rite effect
voices and draws tether patterns. Marks are bounded to eight material accents;
bands to 48 line segments and twelve moving accents, independent of distance.
The painter consumes no combat randomness. Profiles use existing Canvas marks
and introduce no assets or dependencies.

`engine/skillTetherVisual.ts` projects host links into copied paint values:
coordinates, width, color, identity, age, fade and both endpoint tiers. Snapshot
peers store them in `remoteSkillTethers`, never reconstructed simulation links.
Old packets retain a visible fallback; empty packets and zone transitions clear
stale bands. Target/rite flashes use the existing flash snapshot and tier field.
Covered floors hide links if either endpoint is hidden; the sight veil remains
above the effects.

## Verification and review

- `npm run check`, `npm run build`, `npm run sim -- run --suite smoke`.
- `npx tsx balance/probe_targetvisuals.ts`: exact catalogue coverage, native
  casts, extra targets, real tether damage/healing/refresh/death, co-op fallback,
  consumption/payment/recipient hooks, Blood Toll and recovery opt-outs.
- Run existing corpse, devotedstartertrees, supportfabric, feedingcues,
  resourcevisuals, effectvoice, cosmetics and projectilecull probes individually.
- After the target probe and build, run hidden
  `npx electron balance/target-visuals-ui.cjs`. It uses disposable profiles/saves,
  production painter pixel checks, real casts, co-op, and the study controls.
  It checks shared-tint identity collisions and actual capsule clipping across
  thin/wide bands and multiple angles.

Generated reports, screenshots and the 57-entry animated `target-study.html`
live under ignored `balance/reports/skill-visuals/`. The study includes one
shared color, hidden names, pause and bright terrain controls. These checks
support review; recognition during crowded encounters still benefits from
playtesting and feedback.
