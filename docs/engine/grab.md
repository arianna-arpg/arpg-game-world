# THE GRAB FABRIC — sustained bodily control

`src/engine/grab.ts` (specs, config, pure math) + the marked GRAB block in
`src/engine/world.ts` (sweep / seize / release / throw executors and the
mover, push, cast and hit chokepoints). Probe: `npx tsx balance/probe_grab.ts`.
Dev levers: the **Grab** dev tab.

The inversion the latch was shaped for: where a LATCH (`engine/cling.ts`) is
a rider hanging off a body that keeps its own feet, a GRAB is a HOLDER that
owns another body's position outright until the hold BREAKS. Carry, drag,
pin, swallow — and throw as the spend. **One state pair serves every verb**:

```
Actor.gripping : GripHold   the holder's side — owns the live record
Actor.heldBy   : number     the victim's side — the holder's actor id
```

The pair is 1:1 by law (one hold per holder, one holder per victim, no
grab-chains) and the victim's position is a pure function of the holder's
(`grabSeatPos` — one resolver for the sweep, the renderer and the probe, so
drawn == held). A fresh catch REELS to its seat at `GRAB_CFG.reelSpeed` — a
gaff hooks at range and the body is hauled across the ground, never
teleported.

## The vocabulary law

- the **LATCH** rides (a body ON a body that keeps its feet),
- the **TETHER** links, the **PULL** yanks once, the **COMMAND** orders —
- the **GRAB holds**: movement replaced, casts refused, position owned.

Combo kinship: grab skills wear the `'grab'` tag and throws `'throw'` —
the combo grammar (`engine/sequence.ts`) reads seize-then-heave measures
(`grapplers_rhythm` — "Takedown") with **no matcher edits**, and supports
scope to exactly their half of the art (`iron_grip` / `trebuchet_arm`).

## The verbs (presets over the same axes, never separate systems)

| verb | seat | holder | the read |
|---|---|---|---|
| `carry` | high in front | walks slowed (0.78) | hoisted luggage — Heave is coming |
| `drag` | trailing behind | walks (0.85) | hauled out of your line, away from the rescue |
| `pin` | pressed under | ROOTED | held for the hammering |
| `swallow` | dead center, CONCEALED + untargetable | ROOTED | the gulletsack works; digestion ticks |

`GrabSpec` rides a `grabSeize` skill effect — any skill in the one pipeline
can seize; player grapples and monster maws are the same row. Axes:
`holdSec`, `breakMult`, `severFrac`, `ratio`, `pad`, `rideStatus`, `dot` +
`leech` + `burstHurt` (swallow), `throw` (`impulse`, `spitAt: 'foe'|'away'`),
`haul` (AI hint), `holderMove`.

## The mass law (engine/mass.ts is the basis — never duplicated)

Eligibility: `holderEffW × (1 + gripPower) ≥ victimEffW × ratio`, clamped at
`maxRatio` (anatomy has a ceiling; buildcraft moves it). `gripPower` and
`wriggle` are ordinary tag-filtered stats (STAT_DEFS, seated + blurbed in
the sheet). THE THROW is `pushActor` with the holder as author — shove
authority, wall-impact wounds, the bowling lane and pit swallows all pay
out from the mass fabric **with kill credit intact**. A `grabThrow` effect
re-rolls the carrying skill against the thrown body first (`damageMult`),
then launches; `gate: { holding: true }` refuses empty-handed presses (the
thirst-gate idiom).

## Counterplay — a ladder of levers, no scripts

1. **STRUGGLE** — the victim's refused inputs feed the break meter through
   the real chokepoints: movement intent at `moveActor`, mashed presses at
   `useSkill` (reflexes pierce — flasks are never locked out), eaten shoves
   at `pushActor`. Passive rate `∝ (victimW/holderW)^pow × wriggle ÷ grip`.
2. **SEVER** — allies wound the HOLDER: `severFrac` of its max life torn
   off in hits rips the hold open (co-op's rescue verb; fed in resolveHit).
3. **CC** — hard CC on the holder releases (`release.onHardCC`; stasis
   counts — the timeflow fabric's freeze is a rescue).
4. **SHOVE** — a push ≥ `release.shove` on the holder tears the pair.
5. **PATIENCE** — every hold rolls finite `holdSec`. A monster's expiry
   releases at its own choosing: `spec.throw` spits (the gulper aims YOU at
   your allies via `spitAt: 'foe'`), else a plain drop.

Breaking OUT of a swallow wounds the holder (`burstHurt` of its max life,
victim-credited). Every release stamps `grabProofUntil` (anti-chain grace).

## Policy is data

`GRAB_CFG.policy` scales struggle by rarity (rares scramble ×1.75,
champions ×2.5; the CROWNED are tier 0 = refuse — a warband apex is not
luggage). `MonsterDef.grabbable` (true/false/number) overrides per body. Dormant sentries are never seized;
phasing bodies have no rim; cross-altitude reaches refuse; anchored victims
refuse (`'rooted fast'`) while anchored HOLDERS hold fine (the maw bloom).

## Reads (drawn == held)

- The victim slaves to `grabSeatPos` every tick after the latch sweep.
- Marker statuses `seized` / `swallowed` re-stamp on a short beat
  (cleanse-proof by refresh, harmless to cleanse); `swallowed` wears
  `StatusDef.conceals` — the renderer's one skip (reusable by any future
  burrow/submerge state). Both ship on the ordinary status wire.
- THE STRUGGLE METER draws over every held body (victim, holder and
  rescuers read the same bar); the local hero's adds "— struggle!". Host
  reads the live pair; co-op ships `ActorW.gb` = `[verb label, struggle]`
  (the boss-bar idiom) into `Actor.grabHud`.
- THE GRIP KIN's kit-parts are the at-a-glance tell (`render/vis/parts.ts`):
  **grapnel** = drag, **yoke** = pin, **gulletSac** = swallow (a live part —
  the sac visibly WORKS while something is inside).

## Content shipped

- Player lane: **Seize** (carry) + **Heave** (holding-gated throw) — the
  monk's other argument, droppable gems on the unarmed floor's doorstep.
  Supports `iron_grip` / `trebuchet_arm`; the GRIP CLUSTER passives grown
  off the mass cluster (Wrestler's Hands / Eelskin / **Seizing Style**,
  which grants the Takedown grammar).
- THE GRIP KIN (factionless tutors, mire + jungle): `gaff_wrangler`
  (drag — the haul emerges from kit keepDistance alone: standoff-seeking
  with a slaved catch IS the drag), `yoke_mauler` (pin; drums Takedown
  monster-side with clinch → toss — the cadenced-kin teaching pattern),
  `gorge_gulper` (swallow; reel reuses the caulborn `tongue_reel` row),
  `maw_bloom` (the planted swallower — same `gulp` row, zero new skills;
  it eats what it HATES, through the ordinary hostility fabric — its
  pane-proved ambush meal is the player's side. Hurling enemy bodies into
  hazards rides the faction-BLIND payoffs: stakes, walls, pits).
- Terrain: **gore_stakes** (`data/tracks.ts`) — the contact grammar's new
  `TrackPayload.minSpeed` gate: careful feet pick through free; any body
  ARRIVING at push-speed (a Heave, a toss, a plow, a bumper fling) is
  shredded and left bleeding. The impaler painter reused verbatim.

## Boundaries & lifecycle

- Seizing a latched rider peels it first (`clingRelease`); a latched rider
  cannot itself seize (`'riding'`). Holder death, victim death, zone edges
  and vanished ids all release through the one sweep; digestion kills pay
  the holder via `kill(v, false, holder)`.
- Pairs are transient combat state — never serialized (the push idiom).
- New dice roll ONLY inside a successful seize (hold length, bearing) —
  feature-less scenarios stay byte-identical; the sim baseline holds.

## The shaped open seams

- **GRAPPLE-AS-TRAVERSAL** (hookshot to walls/anchors) — the reel is
  already verb-agnostic; a terrain-anchored `heldBy` is the noted rider.
- **Misdirection-by-carry** (hauling drops/objects) — carry over a
  non-actor payload; noted on the latch's seam list first.
- **Throw-at-ally** (the wrestling tag-in / tossing the goblin to your
  minions) — `spitAt` already aims; a friendly-catch rule is data away.
