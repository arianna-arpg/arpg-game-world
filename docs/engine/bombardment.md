# THE BOMBARDMENT FABRIC — off-screen artillery presence as data

One thesis: a standing gun is a BODY with a CLOCK, and the shot is a SKILL.
The fabric (`src/engine/bombard.ts` + `World.updateBombardment`) is
orchestration only — cadence and target choice; everything else (scatter,
warning, damage, the falling-shot look, the crater it leaves) is the skill's
own delivery data, executed through the ONE pipeline (`World.useSkill`).

## The data

- **`MonsterDef.bombard: BombardSpec`** — `{ skillId, cadence: [min,max],
  opening?, assistRadius? }`. `skillId` MUST be in the wearer's own `skills`
  (content-linted in `data/validate.ts`): the fabric casts the wearer's real
  instance, so cooldowns arbitrate between the fabric's far shot and the
  brain's own aimed close-defense.
- **`BOMBARD_CFG`** (engine/bombard.ts) — the shared dials: default opening
  window, refusal retry, owner-assist reach, and the impact-dress budget.
- **`StormDelivery.sky: true`** — the shot is WEATHER, not a duel: every
  strike lands `hitAll` (the caster's own ranks included), `spareDormant`
  (un-roused neutrals sleep through the war), `spareRoofed` (the thatch takes
  it). Opted in per skill — the fireStrikeAt posture as skill data.
- **`StormDelivery.lob: { arc? }`** — render-only: each strike draws an
  arcing comet from the CASTER to its landing ring across its own telegraph
  countdown (`Zone.lobFrom`/`lobArc`/`delay0`; drawZones). You watch the
  shot leave the engine that threw it; the telegraph disc stays the tested
  truth.
- **`ImpactDressSpec`** (`impactDress` on storm + ground deliveries) — the
  detonation plants a runtime doodad handed to `Doodad.evap` after a dwell
  (`World.plantImpactDress`): the battlefield pocks while the fight lasts,
  then breathes back (the transience doctrine — never persisted, never in
  layouts). Capped per zone (`dressCap`); past the budget the oldest
  standing pock starts drying immediately.

## The laws (probe: `balance/probe_warfront.ts`, sections L1–L7)

1. **ONE CLOCK PER GUN.** Each wearer rolls its own jittered next-shot time
   (`Actor.bombardAt`). Killing a gun removes exactly its share of the rain —
   the barrage thins emergently; there is no rate table anywhere.
2. **THE RAIN FOLLOWS YOU** (the Diablo-2 catapult law). An enemy-team gun
   shells a random living player SEAT, zone-wide, perception-free. A
   player-owned gun serves its keeper instead: it shells hostiles pressing
   the OWNER (within `assistRadius`) and holds fire when nothing does.
3. **REFUSAL IS A RETRY.** useSkill said no (mid-cast, cooldown, silenced,
   held) → re-roll a short retry and ask again. Never a crash, never a skip.
4. **THE SILENCE LAW.** A part-break that `breakDisables` the bombard skill
   leaves a crippled hulk: the clock keeps asking, the pipeline keeps
   refusing, the rain from that gun is OVER — and the hulk still counts for
   the `spawners` objective (silencing is not demolishing).
5. **SANCTUARY IS QUIET.** Safe ground takes no shellfire; dormant
   emplacements keep their powder (the sentry fabric's own gate).

## Who wears it

- `hell_trebuchet` — the Warfront's Bale Trebuchet (the debut): spawner
  structure, `hellshot_volley` (sky + lob + shell_crater dress), arm part
  with `breakDisables` — snipe the arm to stop the rain, then demolish.
- `hellbore_engine` — the player's planted gun (`hellbore_mortar` summon):
  the SAME fabric serving the other army (`hellbore_lob`, keeper-scoped, no
  `sky` — a player's own engine never friendly-fires).
- The spec is faction-agnostic by construction: a dwarf-hold mortar line, a
  sieging warband, a ship's broadside are each one def + one skill away.

## The slayer lane's fifth axis

`siegebreaker` (stats.ts / damage.ts mitigateTyped, beside limbreaver):
MORE damage vs ROOTED bodies — `Actor.stationary`, stamped at mint from
`def.base.moveSpeed === 0` (engines, spawner objects, idols, planted
totems). A structural stamp, never a CC read. Gem in `data/supports.ts`;
`sustained_barrage` (+storm strikes) is its doctrine twin on the offense
side.
