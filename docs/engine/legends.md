# The Legend Fabric — uniques that enable builds

A unique item is a **build**, never a stat pool. Rolled affixes already
cover "more of a number"; a legend earns its orange by carrying at least one
line no affix can produce — a skill, a trigger, a state the world has to
keep, a law bent on purpose. This document is the grammar those lines are
written in, the engine seams that back it, and the laws each seam keeps.
Data: `src/data/uniques.ts`. Probe: `balance/probe_legends.ts`.

The doctrine did not change: an effect is a registered stat, a unique line
is a full `Modifier` shape with a range (`RangedLineDef`), and every
surface the engine already has — tags, `when` conditions, gauges, links,
local scope, the generated families — is a legend's surface. This pass grew
the vocabulary rather than adding a parallel "unique" system: the stat
engine learned to grant **skills**, the proc registry learned an **open
door**, a **power dial**, an **own-copy** cast and a **blow-type gate**,
the condition mask learned **the stride**, the gauge registry learned
**stillness**, the minion lane learned **the bloom**, and conversion
learned **the extra lane**.

## 1. The granted skill — `skillgrant_<skillId>` (engine/skills.ts)

`skillGrantStat(id)`; the folded value **is the granted skill's level**
(grantors SUM through the ordinary stat engine, floored, clamped to the
skill's own max at the fold; below 1 grants nothing). One registered stat
per catalog skill (`data/skills.ts` tail — the slot-graft pattern), so a
line validates, prints ("Grants Level 2 Firebolt" — `formatModLine` speaks
the family) and folds like any other. Any modifier source may write one:
a unique line, a rolled affix, a vestige word, a passive node.

`World.recalcSeat` derives the grant (the same prefix scan the worn graft
runs — zero cost when the family is absent) into ONE identity-stable
`SkillInstance` per granted id on **`Seat.grantedInsts`** — never the
learned book. The laws:

- **Worn, not owned.** No `unlearnSkill` (there is no gem to mint back),
  no essence leveling (the roll is the level), no learn gate (the item's
  own level requirement is the gate; `castReqRefusal` already exempts
  anything outside `knownSkills`). Every refusal speaks.
- **THE RESIDENCE ON THE ITEM.** A granted instance carries
  `GRANT_CFG.sockets` sockets and accepts supports and skill-tree picks
  like any learned skill (`socketSupport` / `unsocketSupport` /
  `pickTreeNode` resolve the granted lane). Its sockets + picks are written
  back every recalc onto the FIRST worn piece carrying the stat
  (`ItemInstance.grantState[skillId]`, packed in the gem wrapper's own
  socket-row shape — engine/gemitems.ts `packGrantState` /
  `restoreGrantState`), so unequip → re-equip, a save, and the co-op wire
  all mint the same stones back. Level is never stored.
- **THE SEATING.** A fresh grant takes the first empty bar seat
  (`GRANT_CFG.autoSeat` — the rack law: unseated is unusable). A full bar
  leaves it waiting in the Granted strip, where its chip is a drag source
  onto an EMPTY seat only: a grant never evicts a learned sitter. A grant
  that leaves comes off the bar, its auras and summon toggles shut, its
  instance dropped.
- **THE ONE LOOKUP.** `World.seatSkillById(seat, id)` answers "the skill
  this seat holds under this id" — the book, then the granted lane, minting
  a worn grant on demand off the gear when the bar is restored BEFORE the
  first recalc (load, the wire). `bindSkill` binds by it, so a saved bar
  seats a granted skill exactly where it stood, on the client too.
- **Every derivation reaches it.** Class-skill bonus levels, tree grafts
  and worn slot grafts iterate the wielded set (learned + granted); a
  granted Firebolt in Skill Slot 1 wears The Rote Hand's Multistrike.
- **Derived, never saved.** `Seat.grantedSkills` (`GrantedSkillRow`: def,
  level, instance, source, host item, bar seat) is the panels' one read
  path — the Granted strip, the rack tile's ◆, the book row's "granted by".

## 2. Triggers — the proc registry's open door (data/procs.ts)

`registerProc(def)` registers a proc from OUTSIDE the registry file — a
legend's trigger authored beside the item that wears it
(`data/uniques.ts LEGEND_PROCS`) — joining `PROCS`, the live `PROC_LIST`
(the world's by-trigger index re-derives on its length) and both stat rows.
Same rate disciplines, depth law, chance cap and luck multiplier as every
row declared inside. Only the legend's line grants the chance, so a build
without the piece never rolls it (the armed guard).

Three new levers on any proc:

- **THE PROC POWER** — `procPower_<id>` (base 1), the magnitude dial beside
  the chance. Folded once at execution (`scaleProcEffect`) onto the
  effect's damage scales, burst bases, status magnitudes, pours, restores,
  wards, shove force and cast multipliers; count/duration shapes (buff,
  summon, birth, cooldown, cleanse, kindle, vent, fortify, gainCharge) are
  structural and stay as authored. A legend rolls "how often" and "how
  hard" as two ordinary lines (Stormcall, Bloodletter's Girdle).
- **THE OWN-COPY LAW** — `ProcCastSpec.own`: the payload plays the caster's
  HELD instance of the skill (bar, learned book, granted lane — level,
  sockets, grafts, tree picks) instead of a plain synthetic. "Trigger Ember
  Fusillade on casting a spell" fires the fusillade you built. Opt-in, so
  standing riders keep their authored pacing byte-identical.
- **THE BLOW'S TYPE GATE** — `ProcDef.hitType`: a hit/kill proc rolls only
  when the landed packet's DOMINANT rolled type is the named one
  (conversions honored — `dominantTypeOf`, the attunement fabric's own
  read of what actually struck).

And the 'cast' trigger now carries the cast's **aim**: a payload with no
struck body lands where the spell was pointed (a projectile leaves the
caster's hand along that bearing; sprays off a struck body keep flying
outward, hit-locked, as ever).

## 3. Accumulators as plain state

Rolled numbers on a triggered effect want a STATE the world keeps and a
STAT the item rolls; the roll never lives inside a proc def.

- **THE STRIDE** (Wanderer's Wake) — `strideReach` (world units, 0 = off)
  + the `'strided'` ConditionId. `moveActor` banks the distance a willed
  step ACTUALLY covered (post-clamp) on `Actor.strideDist` while the sheet
  arms a reach (one cached read; an unarmed walker never accrues);
  `refreshConditions` folds `strideDist >= strideReach` into the mask, so
  ordinary `when: 'strided'` lines read it. A real landed blow (depth 0,
  `dealt > 0`) marks the walk spent; the reset lands at the actor's next
  timer tick, so every contact of one frame's swing sees the same stride.
  Echoes and procs at depth never spend it.
- **THE ROOTED RAMP** (The Unmoved) — the `'still'` derived gauge: whole
  seconds of `idleFor`, capped at `GAUGE_CFG.stillCap`. A per-second gauge
  mod is bounded by construction ("5% more damage per second standing
  still, up to five").
- **THE BLOOM** (Gravebloom) — `minionBloom` (seconds) + `minionBloomPower`
  (a fraction of the minion's max life). `spawnMinion` stamps
  `Actor.bloomIn` from the owner's sheet and wears the `blooming` marker
  status for exactly those seconds (the honest countdown); the lifespan
  sweep detonates the ripened body through `explodeActor`'s mitigated
  owner-team burst (`BLOOM_CFG.type`, chaos) and ends it as an EXPIRY —
  contracts released, the expiry-is-death lever deciding the rites, so a
  bloom never double-fires a death explosion. Life investment IS the bomb.
- **THE EXTRA LANE** — `extraAs_<type>`: a fraction of ALL damage dealt
  gained as extra damage of that type, ADDITIVE beside conversion (no
  source loses anything), folded once at `applyConversion` off the
  post-conversion total so several extras never compound. Null-cost until
  a sheet names one (the armed-family derivation).

## 4. The spoken line

`RangedLineDef.text` speaks an authored sentence: `{v}` prints the raw
rolled value, `{v%}` a percentage, `{v0}` a whole number
(`speakLineText`). A gauge line reads its registered gauge label ("per
second standing still"); a gauge-gate line reads a threshold ("at 5 fury
charges"); a `skillgrant_` line reads "Grants Level N Skill".

## 5. THE DEFINING LAW (probe census)

Every legend must carry at least one SIGNATURE line — a (stat, kind,
condition, gauge, tags, link, local) shape that no affix family in
`ITEM_AFFIX_LIST` can roll. The probe derives the affix shape set and
refuses a unique whose every line an affix could have produced, so the
roster can never quietly regress into stat pools. Every `skillgrant_`
names a real skill, every `proc_` / `procPower_` a registered proc, every
stat a known one.

## The roster's signatures (data/uniques.ts)

| legend | signature |
|---|---|
| Wanderer's Wake | THE STRIDE: walk the reach, the next blow strides (increased + flat physical) |
| The Emberbrand | Grants Firebolt (level deepens with tier); burns loose YOUR Firebolt at the victim |
| Gravebloom | THE BLOOM: minions burst in chaos for a share of their max life, then die |
| Stormcall | lightning blows call a bolt down (chance + power rolled) |
| The Unmoved | full evasion→armor renunciation + THE ROOTED RAMP |
| Bloodletter's Girdle | bleeding kills burst (power rolled) |
| The Hollow Sovereign | less damage taken while the shield holds, beside the pact |
| Fleetfeather Treads | THE SECOND REFUSAL: an evade becomes flight |
| The Miser's Loop | THE WHISPER: running dry halves every waiting cooldown |
| Titan's Grasp | melee MORE, hands slower — the heavy trade |
| Halo of the Ninth Choir | lightning damage per enemy near you (the count) |
| The Cindervigil | the flagship: two granted skills, a spell-cast trigger firing the granted copy, the extra lane |
| the build-around wave | slot grafts, combos, conversions, sympathy, the low-life line, reflex, throng finds, the din — unchanged |

## Boundaries

- A granted skill's sockets ride the FIRST granting item; a grant carried
  only by passives keeps its stones for the session (nothing persists them).
- `GRANT_CFG.sockets` is one count for every grant; a per-legend socket
  count is a data field away.
- Possession: the borrowed kit derives nothing — grants stay HOME with the
  bar and the gear (the possession seam's standing law).
- The bloom's type and tint are one config (`BLOOM_CFG`), not yet a
  per-legend dial.
