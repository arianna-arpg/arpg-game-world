# THE POSSESSION SEAM — one seat-to-body indirection

`src/engine/possess.ts` (policy, specs, CFG) + the World wiring
(`seatEmbody` / `seatEject` / `possessSeize` / `shapeshiftPress` /
`updatePossessions` in `src/engine/world.ts`). Probe:
`balance/probe_possession.ts`. Debut content: the `possession` +
`form_of_the_dire_wolf` gems, the Iron Trance / Long Communion supports,
THE VACANT kin, and the `vacant_yard` set-piece.

## The insight

The game already isolates CONTROL from BODY: a `Seat` drives whatever actor
it points at (`World.applyInputs`), the camera and HUD read the pointer
(`world.player` = `localSeat.actor`), `updateAI` skips any seated body, and
the sim's pilots prove the seat can't tell who is driving. **Possessing a
unit IS what shapeshifting does mechanically** — so the engine grew ONE
re-pointable indirection, and both are data consumers of it:

- `Seat.actor` — always the CONTROLLED body (the pointer everything follows).
- `Seat.home` — set while the seat is away: the HERO body, the build/save/
  XP truth (`World.seatHero`).
- `Actor.possession` (`PossessRide`) — on the borrowed body: the
  restoration ledger (prev team/kind), the guise, the clock, the husk
  terms, the guest slot.
- `Actor.vacated` (`VacantMark`) — on the husk: seat-driven or
  nobody-driven, never brain-driven (`updateAI` skips it outright; without
  that line the brainless hero body would fall through to the
  DEFAULT_BRAIN approach-and-attack bundle).

## What follows the pointer vs what stays home

FOLLOWS FREE (they always read `seat.actor`): camera, every HUD orb/slot
(the borrowed kit is ordinary `SkillInstance[]` — `slotFaceOf`,
`skillUsable`, cooldowns, sockets all just work), `applyInputs`, the AI
seat-skip, dwells, survival meters, grudge stamps, the zone carry filter.

STAYS HOME (they read `seatHero`): `recalcSeat` (a build belongs to the
flesh that earned it), `grantSeatXp` (levels land on the hero; the monster
body's level never moves — attribution flows to the SEAT), `bindSkill`,
`serializeCharacter` + `serializeSeatMeta` + the roster card (a
mid-possession save is the hero's truth; embodiment itself is
combat-transient, the castRing law — never saved, a resumed save wakes
home).

## The two consumers

**POSSESSION** (`{ type: 'possess', spec? }` on any skill in the one
pipeline): a landed hit on a WEAKENED enemy moves the seat in.
Eligibility = life fraction (`PossessSpec.lifeFrac` ??
`POSSESS_CFG.lifeFrac`) × the rarity policy ladder
(`POSSESS_CFG.policy` — the GRAB_CFG idiom; 0 refuses: uniques keep their
seats) under `MonsterDef.possessable` (true = an open door at ANY life —
the Vacant Shell, or a deliberately capturable boss; false = the will
refuses) and STRUCTURAL refusals (constructs, doors, composites/worms,
the driven, companions, another's minions — these beat everything except
the explicit boss allow). Refusals are quiet on monsters, a `failNote` on
the local hero. The husk STANDS entranced (`entranced` status re-stamped
by the sweep, `huskGuard`-warded) — the risk valve.

**SHAPESHIFT** (`{ type: 'shapeshift', shift: { form } }`): mints the form
kind at the caster's level through the ordinary `createMonster` path
(team 'player', `noBounty`) and moves in. The husk is CARRIED — withdrawn
from `world.actors` whole, shadowing the form's position for honest eject
spots. The form is a projection: it disperses at eject and never joins
the corpse/loot economy.

## The guest slot + the convert law

`seatEmbody` APPENDS the pressing gem to the borrowed bar; its
`ConvertSpec { when: 'seatAway' }` presents the ending verb (Possession →
Relinquish, a form gem → Return to Flesh) — the button that began the
ride ends it (the chargesEmpty→reload idiom). Both returns are `noDrop`
utilities firing `{ type: 'possessEnd' }`.

## The eject ladder (every ending funnels through `seatEject`)

| reason | what happened | consequences (POSSESS_CFG.eject) |
|---|---|---|
| `press` | the Relinquish/Return press | body staggers `bodyStun`; gem cooldown |
| `duration` | the ride clock (× `possessDuration` stat) | same |
| `bodyDied` | the borrowed body killed under you | seat home FIRST, then an honest monster death (killer credit intact, no party wipe for flesh you merely wore); you wear `selfStun` backlash |
| `huskDying` | your flesh took a lethal blow | seat home FIRST, then the ordinary seat death seam runs — permadeath byte-honest |
| `huskPain` | husk lost `huskLostFrac` of max life | the pain calls you home |
| `huskSeized` | a REAL hold landed on the husk | torn back (the sweep rides right behind `updateGrabs`, so a fresh hold is seen its own frame) |
| `travel` | zone transit unwinds every embodiment | the body stays with its zone, staggered |
| `released` | system (end run, dev lever, self-heal) | quiet |

The kill() hook is the death law: `actor.possession` → eject rider, keep
dying as a monster; `actor.vacated` → snap the seat home, then the normal
`seatOf(actor)` branch runs `onPlayerDown` honestly.

## The guise

While `PossessSpec.guise` (default on) holds, `hostileTo(kin, riddenBody)`
returns false ONE-DIRECTIONALLY for team-enemy bodies of the ride's
faction — their targeting, swings, threat and stray zones pass you by;
your own targeting asks the other direction and stays live. THE BETRAYAL:
the first harm the ridden body authors (`resolveHit`) tears it for good.
Walk the pack as one of them until you draw blood.

## Attribution, combos, timeflow, grabs (the pinned edges)

- Kill credit: the borrowed body is team 'player' — kills credit the
  player side through the ordinary `credit` law; XP banks on SEATS.
- The combo grammar: the ring lives on the ACTOR — the borrowed body drums
  its own rhythm (your socketed combo gems stay with your hands). A
  documented policy, not an accident.
- Timeflow: a held seat's intent is inert exactly as before (the possessed
  body is the seat); chrono exemptions key off the body's current
  team/owner — a swap changes which side of a Time Stop you stand on.
- Grabs: a hold on the BORROWED body is yours to struggle out of
  (possession does not bypass the grab law); a hold on the HUSK snaps you
  home (`endOn.huskSeized`).
- Flasks/reflex: the hero's flasks stay home with the hero's hands — the
  body you ride has its own kit and nothing else. Deliberate v1 policy.

## The stats + supports lane

`possessDuration`, `possessPower` (adds to the ride's damage factor —
mimic's powerFactor law, worn as a body-side sheet source so the borrowed
instances scale), `huskGuard` (LESS damage to the vacated husk) — all read
off the pressing gem at embark (supports socketed there count: Iron
Trance, Long Communion). The `possession` SkillTag scopes them.

## Obtainability (the counted-ledger law)

`gem_skills_possession` surfaces on ONE Vacant Shell put down
(`reqLedgerCounts` on `bestiaryKey('vacant_shell')`); the wolf form chains
off it + twenty studied dire wolves (knowledge gets teeth); `sup_possession`
chains off the discipline. Future forms are one unlock row each — a new
`bestiaryKey`, a new payload; the seam never changes.

## Kin + ground (the at-a-glance law)

THE VACANT: family tell is EMPTINESS — `vacant_shell` (walking cuirass,
rags, ONE dim socket where living armor-kin burn two bright eyes; the
open door, `possessable: true`, low `bestiaryKills` — the tutor) and
`seatless_usher` (a pale robe THREE eyes deep, a lantern for finding
empty chairs; `possessable: false` — the counterexample, and its lull is
the seam's own feel taught from the other side). They walk the downs +
mournstead; the `vacant_yard` composition (cold `still_effigy` = the
wicker painter UNLIT, `slumped_shell` = the scarecrow painter in dead
violet) is their court. Faction 'vacant': neutral to every war, kin to
each other — so a possessed shell walks the yard unbothered.

## Future riders (the seam is ready, the consumers are not built)

The Body Thief hard-mode fantasy (permanent theft = an eject policy that
never fires), mounts (a ride whose guest slot is a whole second bar),
capturable bosses (`possessable: true` on an authored pinnacle),
enemy-side possession of YOUR minions (the same ride record, a brain for
a seat). Co-op client HUD parity for a possessed seat is queued behind
the features-over-co-op standing.
