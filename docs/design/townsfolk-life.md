# THE LIVING TOWN — townsfolk with lives (charter v1)

**Status: DESIGN + a debut.** Commissioned 2026-09-05 off her inn walk:
*"AI granted to something like the patrons and lodgers so that they
actually walk around; or further, perhaps even genuine AI packages … to
give them schedules and genuinely have them come to life; and additionally,
randomization of the patrons and lodgers so that they change and the inn
truly feels inhabited."* Two of the three asks are BUILT (§1); the third —
SCHEDULES / AI PACKAGES — is chartered below for her word (§3). Every
number is a DIAL; the probe for what stands is `probe_towngrowth` rig J.

> **THE LEAD FINDINGS.**
> 1. **The brain had no idle verb.** `BehaviorSpec` carried `seek` (drift
>    at prey/loot) and `flock`; every other idle motion was the hard-coded
>    wander at `ai.ts` (1.5–4.5 s rerolls, 35 % dead stops, 0.35 pace) —
>    tunable by nothing, bounded only by a duty post's slack.
> 2. **Passive scenery could not move by construction** — two locks: the
>    brain gate (`if (actor.passive) return`) and `movementLocked`. Making
>    townsfolk combatants (the crofter recipe: `passive:false`, a
>    `post{hold:false}`) would have put them on enemy target lists, in
>    counts, under shoves. The town wanted scenery WITH LEGS, not soldiers.
> 3. **The one scheduled routine that exists is the theater fabric's
>    `watch_change`** (`data/theater.ts`): a RadianceCond-gated row that
>    restamps duty posts round-robin and reverts them byte-for-byte on its
>    closing tick. That is the shape a schedule already has in this engine.
> 4. **Rostering had every part but a roller:** per-beat seeds
>    (`withSeededRandom`, `restockOrdinal`), name pools (mercenaries), the
>    apparition def factory (Mu), six npc looks × any colour.

---

## 1. WHAT STANDS (built 2026-09-06)

### 1.1 THE HAUNT — `BehaviorSpec.haunt` (engine/brain.ts, engine/ai.ts)
Idle conduct as data: `{ kinds, reach, linger, pace, restChance }`. With
no foe in sight the body picks a piece of FURNITURE of a named kind within
`reach` of its post (or first-tick anchor), walks the flow field to a stand
beside it (a solid piece) or onto it (a walk-over one: a chair, a rug),
lingers `linger` seconds FACING it, then picks another — or rests at home
for a while. Same story only (the tier fabric); THE STORY LAW: a stand the
story's field cannot reach is dropped, never elected across a stair (the
hunter's stair election is not the guest's); THE NAV SNAP keeps every
stand on fieldable ground. Combat-capable bodies reach it through the idle
ladder (it outranks the wander); **THE STROLLING SCENERY**: a `passive`
body wearing a haunt runs ONLY the haunt — untargeted, uncounted,
unshoved, invulnerable exactly as before, and alive between its seats
(`movementLocked` lifts for it alone). Dials: `HAUNT_CFG`.

### 1.2 THE FOLK ROSTER — `data/innfolk.ts`, `StructureDef.folk`
A POOL is a registry entry of ROWS (a drover, a tinker, a pilgrim, a
courier, an off-duty warden, a gambler; upstairs a scholar, a merchant, a
midwife, a veteran): each row = names × colours × lines × a haunt, and
mints ONE def (`folk_<pool>_<row>`) on registration (the Mu apparition
idiom). A plan declares FOLK SEATS (`folk: [{ pool, x, y, tier?, chance? }]`)
that the placer records and `World.loadZone` ROLLS on a seed of (zone,
seat, DAY) — `withSeededRandom` over `DAY_LENGTH`; the ZONE's seed, never
the world's, so the day's head-count is a pure function of the zone and the
actor ids after it stay hermetic (pitfall 4) — so the same
company keeps its chairs through a day and the next dawn deals new faces;
a seat's `chance` may leave it empty. The body wears the rolled name,
colour (`Actor.color`) and line (THE SPOKEN SEAT). Debut: the inn — three
chairs in the common room, two beds above; Mireille, the stair-speaking
patron and the corner-room lodger stay fixed.

### 1.3 What this already composes
- Any structure anywhere seats folk with one row; any body haunts any
  furniture with one spec (a scholar the shelves, a smith the anvil).
- The theater fabric can restamp `aiPost` under a RadianceCond exactly as
  `watch_change` does — a haunt's `home` follows the post.

---

## 2. THE DECISION CARDS (her word wanted — none of these are built)

1. **AI PACKAGES vs ROUTINE ROWS.** Her phrase "genuine AI packages" could
   mean (a) a new PACKAGE fabric (`src/packages/` overlays) that grants
   schedules to bodies as a world event, or (b) ROUTINE ROWS as data on the
   def/roster (`routine: [{ when: RadianceCond, post?, haunt?, hidden? }]`)
   applied by one engine tick — the `watch_change` grammar generalized.
   Recommended: (b). A routine is a property of the folk, not an event of
   the world; the theater fabric stays the EVENT lane (a wake, a wedding, a
   market day) and can still restamp posts on top.
2. **THE CLOCK.** Routines gate on `RadianceCond` phases (dawn/day/dusk/
   night — the standing time vocabulary) vs. hours of a finer clock.
   Recommended: phases (the inn fills at dusk, lodgers sleep at night, the
   common room empties at dawn); `DAY_LENGTH` 240 s is the existing dial.
3. **SLEEP.** A `sleep` conduct: at night a lodger walks to its bed and
   lies on it (a prone pose = `StatusDef`-style ghost/lean render lever, or
   the body simply parks on the bed's rug and faces it). Recommended for
   v1: park + a `resting` worn status the tell fabric can read.
4. **WHERE THE FOLK GO BY DAY.** Off-shift patrons could walk the SQUARE
   (a `haunt` on the plaza's benches and the board — reach across the
   town) or vanish (`hidden` until dusk). Recommended: the square — the
   town reads inhabited from the road; `chance` dials the crowd.
5. **THE ROSTER'S TURN.** Per day (built) vs per visit vs per BEAT (the
   vendor's 300 s). A day is the honest one — the same face at the bar
   after a short errand.
6. **TALK.** Multiple lines per body rotated on each approach; NPC-to-NPC
   chatter (two guests facing each other with bubbles) — the speech fabric
   already draws any body's bubble; a `talkTo` pairing is one idle rung.
7. **THE WARD'S FAMILIES.** The residents (`TOWN_RESIDENTS`) could wear the
   same lever (a haunt on their doorstep flowers and the green's benches).
8. **MIREILLE.** The innkeep behind her counter could haunt the counter's
   run (drifting along it) — her `roof` reach + counter dwell would need
   the moving body's position honored (they read the body, so they would).

## 3. BUILD MOVEMENTS (after her word)
- **L0 — landed:** the haunt + the roster (this document's §1).
- **L1 — THE ROUTINE ROWS:** `FolkRow.routine` / `MonsterDef.routine` +
  the phase clock + the sleep conduct + the square by day (cards 1–4).
- **L2 — THE TALK:** rotated lines, pairings (card 6); the ward wears it.
- **L3 — THE TOWN'S DAY:** market morning, the watch change (already in
  the theater), a festival row — event-lane compositions over L1.

## 4. THE PITFALL LEDGER
1. A haunt stand computed a body's width off a table can sit in a nav cell
   the table half-covers; `moveToward` then reads the goal as "not this
   story's floor" and ELECTS A STAIR — the midwife walked downstairs. THE
   NAV SNAP + THE STORY LAW closed it (probe rig J's story-law check).
2. The anchor stamp (`aiAnchor ??=`) sits BELOW the passive gate; strolling
   scenery stamps its own on the way past.
3. THE HAUNT'S OWN DIE: the first haunt rolled on `Math.random` and shifted
   every seeded rig's staging downstream of the town (probe_lairs' den seed
   pinned to a global-stream position); it rolls a per-body mulberry now
   (`Actor.hauntRng`) — THE OFF-STREAM LAW worn per body.
4. A folk roll seeded off the WORLD dealt a different head-count per run and
   every actor id after the inn with it (probe_pack's same-seed print broke);
   the roll rides the zone's seed + the day.
5. The sim's `World.update` does not run the AI — the runner drives it
   (`for (const a of world.actors) updateAI(a, world, dt)`); every probe
   that wants a stroll drives it the same way.
