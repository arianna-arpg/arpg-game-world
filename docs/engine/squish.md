# THE SQUISH FABRIC — death underfoot

`src/engine/squish.ts` (spec + config + the one predicate) · World's
`updateSquish` sweep + the `separateActors` shoulder exemption ·
probe `balance/probe_squish.ts`

The D2 desert law: some lives are small enough that a boot is the whole
fight. Diablo 2's Act 2 scorpions died under your run — not to a swing, to a
STEP — and the crunch was worth more texture than their whole combat table.
This fabric makes that a data lever any body can wear: a `MonsterDef.squish`
body dies to TREAD — any sufficiently heavier grounded body walking over it
kills it outright, through the ordinary credited kill path.

## The opt-in

```ts
// data/monsters.ts
squish: true                              // all defaults
squish: { ratio: 1.6, text: 'crunch!' }   // tuned (the sand scorpion)
```

`MonsterDef.squish` (`true | SquishSpec`). Spec dials:

| field   | default | meaning |
| ------- | ------- | ------- |
| `ratio` | `SQUISH_CFG.ratio` (6) | weight gate: treader effectiveWeight ≥ victim's × ratio |
| `text`  | none    | line floated at the crunch |
| `color` | def's body color | flash/line tint |
| `quiet` | `false` | suppress the flash/line (a silent pop) |

Global dials in `SQUISH_CFG`: `ratio` (the default gate), `treadFrac` (the
tread is the treader's footprint — body radius × 0.85, so a rim graze is a
near miss, not a step), `fx`, `textSize`.

Wearers today: the **ant trail** (default ratio — at true ant scale, radius
3, a nine-strong worm file; `squish!`) and the **sand scorpion** (`ratio:
1.6` — a hero's boot covers every variance roll, and so does any man-weight
horror marching over it; `crunch!`).

## The laws

**MASS DECIDES, NOT ALLEGIANCE.** The gate is one read —
`treader.effectiveWeight() ≥ victim.effectiveWeight() × ratio` — so radius,
material density, heft, poise-as-mass and every weight stat all speak for
free (the mass fabric's one fold). There is no faction test, no team test
and no player special case: heroes squish because heroes are HEAVY, not
because they are heroes. The ogre chasing you tramples the same ant file you
sidestepped; your golem tramples it for you; the horde erases the desert's
bugs as it advances. A squirrel (≈0.31 weight) can never crush the file
(asks ≈0.70); a hero (≥1) always can.

**THE BOOT GOES OVER, NOT INTO.** Crowd separation would shoulder a walker
off a tiny body before the overlap ever happened — so a squish pair (either
direction, decided by the SAME predicate) is exempt from `separateActors`,
the flat-construct precedent extended to prey. The overlap survives to the
tread sweep, which runs immediately after separation: drawn overlap == the
crunch, same frame. Same-size kin fail the mass gate and part normally.

**THE WHOLE ANIMAL IS TENDER.** Worm-bodied ambience is trodden at the head
AND every trailing segment through the one `segR` radius law (drawn ==
trodden): stepping on the middle of the file is stepping on the creature.
The rampage plow inverted — there the moving body crushes the standing
world; here the moving world crushes the small body.

**AN ORDINARY DEATH.** The crunch is `World.kill(victim, false, treader)`:
XP (seat-credited when a hero treads), kill-path handlers, the spoils law,
possession's death hooks and co-op replication all arrive from standing
law. No second death lane, no new wire traffic.

**THE SLEEPER IS SPARED.** Dormancy (the sentry fabric) outranks physics
exactly as it does for wind and environmental strikes: a planted, un-roused
body is scenery, not prey (`isDormant` guards the sweep).

**Posture guards** (the one predicate): the dead and the downed tread
nothing; an airborne leaper has nothing underfoot; a carried body
(`heldBy`) is luggage, not a walker; the altitude split (separation's own
law) keeps a flier from crushing the ground it passes over — until it
lands, when the same overlap becomes a tread.

## Cost

Free while nothing squishable stands: one field read per actor per frame
(the spec is normalized ONCE at spawn onto `Actor.squish` — hot loops never
walk the registry). A standing victim costs one `actorsNear` query sized to
its whole animal (head + worm span + treader pad).

## Deferred seams (documented, not stubbed)

- A per-segment tread that TEARS the trodden coil instead of ending the
  animal (the segment fabric's wound lane already holds per-segment pools).
- A `squishesInto` ground-stain dress row (the weatherDress/`evap` idiom) —
  the smear that dries.
- A treader-side `softStep` stat that waives the crunch for a careful build
  (druids walk softly).
