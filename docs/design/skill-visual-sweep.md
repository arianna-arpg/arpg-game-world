# Skill visual sweep

Working branch: `codex/skill-visual-identity`. This is a presentation pass on the
main-based visual branch, kept separate from seamless content integration.

## Recovery pass

Life uses tapered blood drops and curved, accelerating strands. Mana uses split
needles and straight filaments. Energy shield uses open plates and a second
chevron. Wakeflames use a flickering flame crest. Geometry does not depend on
paint, so a wardrobe tint cannot turn one resource into another.

| Path | Coverage | Timing |
| --- | --- | --- |
| Homing resource pickups | Siphon Strike, Siphon Blood, Devouring Maw; future `siphonOrb` effects | Short wake behind the actual pickup; gain cue only on arrival |
| Immediate native drains | Lifedrain, Soul Volley, Sanguine Leech; future `SkillDef.siphon` | Victim-to-recipient trace after actual healing |
| Persistent draining aura | Vampiric Presence; future `siphonFraction` auras | Coalesced return while real ticks heal |
| Hit sustain | `lifeOnHit`, `lifeLeech`, `manaLeech`, `esOnHit`, `esLeech`, including skill-local grafts | Actual clamped gain from the shared damage pipeline |
| Status leech | Every status using `leechAcc` and `casterId` | Source is the affected body, recipient is the living applier |
| Transferred leech | `vampiricShare` | Damaged victim to each actually healed ally |
| Digestion | Grab/swallow `leech` | Actual mitigated digestion recovery |
| Flesh consumption | Corpse Feast, devour/sacrifice paths with flesh/life feeding material | Existing closing jaws remain; fragments become blood strands |
| Instant resource restores and pickups | Shared `applyRestore`, all life/mana/ES orbs | Matching body/HUD marks only after a positive gain |
| Restore streams | Existing measured restore cues | Same new material shapes, original timing and opt-outs |

`data/resourceVisuals.ts` owns the material grammar and density. The painter
`render/vis/resourceFlowLayer.ts` shares these marks across the pickup, return,
body and HUD layers. `engine/feedingCues.ts` stores only bounded presentation
receipts: six per actor, at most 32 painted per frame, viewed seat first. Repeated
ticks refresh endpoints/lifetime without restarting the animation. Stop, death,
downing and zone transit clear the traces. No extra combat random draws occur.

Instant recovery is already paid when its brief trace appears; it creates no
projectile or delayed payout. Traveling siphons retain their pickup ownership,
speed, expiry, death-to-ground fallback, proc/refund behavior and arrival heal.
Co-op carries copied endpoints and presentation-only pickup destinations, never
simulated actor ownership. Missing old-host fields clear safely. Both ends obey
the existing covered-floor visibility check; the sight veil composites above.

## Deliberately different effects

- Carrion chewing and ritual mass remain distinct from liquid life extraction.
- Magic-pack **siphon** transfers speed between pack members; it is not blood.
- Waypoint/leyline siphons drain world power, not life.
- Ward leech creates the existing defensive shell. It is not an ES pickup.
- Ordinary regeneration is not a source-to-recipient transfer.
- Life Bond and friendly healing are restorative links, not victim extraction.

## Next visual passes

The tether/target/offering pass now covers all 38 native target deliveries,
all six tether supports, shared healing/discharge/embedded/pack links, and seven
offering or sacrifice identities. See [target skill visuals](target-skill-visuals.md)
for coverage, actual-consumption hooks, co-op and the single-color study.

The melee/cone pass covers all 99 native melee deliveries and 32 non-beam cones,
plus measured trails for Lightning, Chain Lightning and their two skeletal
counterparts. See [strike skill visuals](strike-skill-visuals.md) for action
silhouettes, safe openings, delayed repeats and recorded chain-turn previews.

The movement pass covers all 21 dashes, 14 leaps, nine blinks and Caged Comet.
Departure, measured travel, landing, delayed warp and actual bank moments retain
their source identity. See [movement skill visuals](movement-skill-visuals.md).

The self/mark/detonation pass covers 106 self profiles plus Mark/Recall,
Detonate Mines and Cold Snap. Charge silhouettes follow actual completion;
banked-power reads remain separate, and detonations speak at consumed bodies
or real expiry. Existing offering receipts are retained. See
[self skill visuals](self-skill-visuals.md).

The generated census in `balance/reports/skill-visuals/resource-audit.json`
enumerates native recovery users and delivery counts from the live catalogue.
These counts describe delivery families, not a claim that every member lacks art.

| Priority | Area | Remaining opportunity |
| --- | --- | --- |
| 1 | Storm (33), summon (61), construct (45) | Arrival, cadence and lifetime cues, coordinated with existing anatomy/companion art |

Already authored on this branch: 109 novas, 172 projectiles, six native beams,
163 ground skills and 42 auras. Continue reviewing their scale, busy-scene density
and low-contrast surfaces even though they have catalogue identities. This sweep
does not declare encounter acceptance or the remaining families complete.

## Verification

- `npm run check`, `npm run build`, sim smoke.
- Run `npm run probe -- <name>` separately for resourcevisuals, feedingcues,
  defenses, grab, cosmetics and skillflights (the filter accepts one name).
- Hidden `balance/resource-visuals-ui.cjs` after build: production painter, shared
  tint, old/new pickup comparison, motion, hidden floors, bounded crowd drawing,
  real siphon/drain/aura cases and co-op. Writes an animated resource study beside
  the previous full skill catalogue.
- Existing hidden `balance/feeding-cues-ui.cjs` after its probe and build.

Before transferring to seamless, re-run integration checks against its current
head. Do not merge the entire content-divergent branch to carry these visuals.
