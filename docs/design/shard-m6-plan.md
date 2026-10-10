# M6 THE SCALE ACROSS CORES: the implementation plan

Planner pass, read-only, worktree `D:/Games/Claude/arpg-shard` (branch `shard-world` @ `5a83cf84`, clean;
`npx tsc --noEmit -p tsconfig.shard.json` exits 0 on it). Anchors are `file:line` on that tree; line numbers
drift, symbols do not. **CONFIRMED** = read in the code or in a committed receipt this pass. **PLAUSIBLE** =
inferred, needs a builder's check or a measurement. Every number is unblessed (her standing word).

Inputs read: `docs/design/shard-world.md` (§1, §2, §3 THE SHAPE, 3.3, 3.10, 3.12, §4 M5/M6, §6.6 asks 1 to 4,
§7 cards, §7d), `docs/design/shard-m1-plan.md` (D1 THE PIN, D2 THE UNIT WARDEN, D3 THE TICKET, D4 THE ONE CLOCK,
§1 the alias census, §3 the hand-off, §9 risks), `docs/engine/shard.md` (THE SIM UNITS W1 to W3, THE ROADS PER
PLAYER, THE OWN ENTRY, THE SOAK), `docs/engine/shard-runtime-foundation.md` (neighborhoods, the Node compiler,
compact checkpoints, every measured course), and the code: `src/engine/shardUnits.ts`, `server/simUnits.ts`,
`server/shardHost.ts`, `server/shardTransport.ts`, `server/massWorkers.ts` + `massCompiler.ts` +
`massWorkerBootstrap.mjs`, `src/worldmass/{compilePort,foci,runtime,dormancy,checkpoint,state}.ts`,
`src/engine/world.ts` (`update()` 43939 to about 45845, the per-actor loop from 44470), `src/engine/ai.ts`,
`src/net/snapshot.ts`, `src/render/camera.ts`. Measurements: the committed foundation receipts and the lane's two
soak logs in the session scratchpad (`soak_foci.log`, `soak_foci2.log`, 2026-10-10, tree 18a1b437, i9-10900K,
Windows, Node 24.9). In flight beside this plan and owed coordination: W6 THE WIRE DIET (branch `shard-w6-diet`:
per-audience frames, quantization, doodad deltas) and M1-W4 (branch `shard-m1-muster`: instance keys on
`server/simUnits.ts`, the realm roads in `world.ts`, the `mu` row).

---

## 0. The answer in one page

**The problem, restated with what the receipts add.**

- (CONFIRMED) On the Unbroken Wilds every surface player stands in ONE World, the keeper's. THE WILDS LAW hosts
  the whole surface in the keeper and wakes units only for pockets (`server/simUnits.ts:176-183`, the
  `k.massRuntime ? zoneId === MASS_ZONE || zoneId === START_ZONE || !!k.zoneMap[zoneId]` branch). The spread
  soak's ~345 live actors are one roster on one thread; no unit is awake in that course.
- (CONFIRMED) The foundation gives every neighborhood group the full budget: `populationLimit` is
  `config.maxPopulation * groups` (`src/worldmass/runtime.ts:760-767`; `maxPopulation: 96`,
  `src/worldmass/preset.ts:254`).
- (PLAUSIBLE, from the receipts) The cost is NOT linear in actors. Inside one constant-group course (3 bots
  spread, 3 groups throughout) the tick p50 fell from 45 ms at 211 actors to 19 ms at 147 as bots killed natives
  (`soak_foci2.log`): an exponent of about 2.2 to 2.5. Extrapolated from that course, 345 actors predicts about
  136 ms; the lane's own 6-bot course measured p50 101 ms (60 Hz) and 141 ms (30 Hz), the foundation's run of the
  same course 67.6 ms. "0.2 ms per actor" is an average over a curve: about 0.13 ms at 150 actors and 0.3 to 0.4
  at 345. Two readings fit and only the profile decides between them:
  (i) WHOLE-ROSTER SCANS: many per-actor scans walk the World's entire roster (CONFIRMED to exist, §1.2 rows 2-3),
  so on the keeper every native pays for every other neighborhood's natives; a local roster removes that on ONE
  thread. (ii) WITHIN-NEIGHBORHOOD density work, which only parallelism removes. The 6-bot versus 3-bot
  comparison leans to (i) in the lane's run and sits between the two in the foundation's.

**The recommendation: shape (c), the hybrid, with its surface half on THE ISLAND grain** (shape (b)'s
neighborhoods, sized so that no player can see across a seam, which removes ghost bodies entirely), built in an
order that pays first where the cost is:

| Wave | Name | Owner | What it buys |
|---|---|---|---|
| W0 | THE ONE-THREAD DIET | shard (lane A), engine (lane B, gated by the profile), wire (lane C, after W6) | the profile and THE PHASE METER; idle bodies think on the wire's beat; local rosters for the whole-roster walks; the receipts that size everything after |
| W1 | THE GOVERNOR | shard controller + one foundation seam | a shard-wide birth budget and three cost dials driven by the measured tick: a spread party meets a living world the thread can carry |
| W2 | THE GLASS UNIT | shard (engine lane + host lane, one contract file first) | pocket units that speak to the keeper ONLY through messages, still on one thread: THE PIN becomes a wake payload, replicas and a write log; THE TRAVELLING BODY; THE ID LANES; every closure seam a named verb; proven equal to the pinned mode by a digest |
| W3 | THE THREAD HOST | shard | glass units on `worker_threads` behind a lockstep barrier; frames encoded in the worker, written by main; the pocket wake stall leaves the main thread |
| M6+ | THE ISLANDS | foundation-led, shard-hosted | far neighborhoods as surface Worlds on workers: the measured case, on as many cores as islands |

Why this order, honestly: only W0 and W1 move the measured case soon. W2 and W3 do NOT touch it (pockets are not
the surface), but they are the machinery islands need, they live in the shard's own files, and they can be built
while the foundation builds the island runtime, so neither lane waits. If W0's profile shows that the diet and
the governor carry the player counts she expects, pausing after W1 is a legitimate choice (card 1, §6).

---

## 1. THE COST ANATOMY

### 1.1 The receipts (CONFIRMED)

| Course (60 s, seed 0x00ddba11, roving off) | Tree | Live actors | Tick p50 / p95 ms | Dropped | Living least / mean | Source |
|---|---|---|---|---|---|---|
| 6 bots around the hearth | integration | not printed | 6.74 / 28.98 (max 188.9) | 0.64% | 14 / 21.6 | shard-runtime-foundation.md, combined checkpoint |
| 6 bots spread 3,500 px | integration | about 345 | 67.63 / 181.84 (max 1,847) | 80.4% | 23 / 35.6 | same |
| 6 bots spread 3,500 px | 18a1b437 | 335 to 352 | 101.5 / 260.2 (max 1,529) | 86.6% | 24 / 38.4 | soak_foci.log |
| 6 bots spread, `--tick-hz 30` | 18a1b437 | 270 to 365 | 141.4 / 374.3 | 80.7% | 21 / 34.5 | soak_foci2.log |
| 3 bots spread | 18a1b437 | 211 falling to 147 | 45 falling to 19 (course 27.5 / 97.4) | 56.7% | 21 / 28.7 | soak_foci2.log |
| 6 bots spread, ONE focus (before the neighborhoods) | pre c1bfe588 | about 63 | p95 47 | 8% | 0 / 3.2 | charter §6.6, §7d |
| an awake pocket unit; a unit wake | 18a1b437 | | about 5 ms a tick; a wake stalls about 75 ms | | | the brief (not re-measured here) |

Reading them:
- The per-tick cost, not the tick rate, is the problem: at 30 Hz the tick still costs 141 ms (CONFIRMED).
- The two 6-bot spread runs on one tree differ by 1.5x in p50 (67.6 versus 101.5): co-session load on the
  machine (the soak doc records co-sessions holding about 45-50% of the CPU). Every gate below must be read over
  repeated runs on a quiet machine, and once on the real host (the foundation's own caveat). The codespace has two
  cores (charter §6.6); no thread work can be judged there.
- In the 6-bot spread run the shard stepped about one tick in seven and a hero's input reached 20% of server ticks
  ("fed", `soak_foci.log`): that is the rubber-banding players feel.
- The slowest tick (1,529 ms) carried 12 ms of GC (`soak_foci.log`): GC is not the sustained cost.

### 1.2 Where a tick goes on the keeper (structure CONFIRMED, weights PLAUSIBLE until the profile)

| # | Cost center | The structure (CONFIRMED anchor) | Scales with | Weight (PLAUSIBLE) | Fix |
|---|---|---|---|---|---|
| 1 | The AI brain, every actor, every tick | the shard's own loop calls `updateAI` for every actor every tick (`server/shardHost.ts:695`). `ai.ts` has no distance or idleness rate: its only cadences are the target rescan (`BEHAVIOR_CFG.retarget` 0.25 s, `src/engine/brain.ts:476`, read at `ai.ts:1756`) and authored brain cadences (`ai.ts:1396-1410`). Each call resolves the brain (`normalizeBrain`, `resolveMachines`, `mergeTuning`, `ai.ts:673-675`) and allocates | N | large: the foundation's final profile names "live AI/pathfinding" first | THE THINKING EDGE (W0 lane A) |
| 2 | Whole-roster walks inside the AI | IDLE squad members walk the whole roster every tick for their leader and formation post (`ai.ts:2912`, `3016`, `2880`); engaged squads for focus fire and muster (`1170`, `1194`); morale (`1423`, `1487`, `1527`), pack wards (`1554`), the alert shout (`1942`), the most wounded ally (`2362`), crossfire, interpose and hover kernels (`3312`, `3526`, `3562`); `world.enemiesOf` allocates a filtered array per call (`483`, `1433`); the target rescan walks `world.actors` (`ai.ts:1805`) every 0.25 s per actor | N x N, where N is EVERY neighborhood's roster | the prime suspect for the superlinear curve | THE LOCAL ROSTER (W0 lane B) |
| 3 | Roster walks per object in `World.update` | every live projectile walks every actor for "the mallet in flight" (`world.ts:54515`); field exposure and healing ground walk the roster (`world.ts:55415`, `55436`); brood, bond, brand-zap and lash-out scans in the per-actor loop (`44668`, `44752`, `44909`, `44941`; these fire only on rare statuses) | projectiles x N | moderate in heavy combat | an index of the rare targets (W0 lane B, optional) |
| 4 | The per-actor update loop and the sweeps | `world.ts:44470` onward (timeflow bend, decay, bloom, lifespans, ledgers, `updateCasting` near 44978), then about 80 sweeps (`world.ts:45376-45482`) | N, linear | substantial, linear | none cheap from the shard (engine-owned); islands parallelize it |
| 5 | Collision | `separateActors` already pairs through the actor grid (`world.ts:56622`, `actorsNear` at `57529`) | N x local density | small | none |
| 6 | The mass runtime, per neighborhood | `WorldMassRuntime.update` (`runtime.ts:807-930`): pages over the union of foci, `geography.prepare` per focus, the native country per focus cell, ecology `sync` over every page cell of every focus plus every awake native's cell, survey line of sight per focus, discovery, and every 0.5 s the dormancy sweep (`dormancy.ts:432-466`: an observer index, exact `captureNativeActorState` captures for up to 16 candidates, a foreign-dependency scan over every owned native) | groups, and natives | the foundation's profile names geographic weather, scenery admission and dependency scanning | the foundation's (its perf pass); islands parallelize it |
| 7 | The lite pool | batched struct-of-arrays (`engine/lite.ts`), only where a zone pours it | lite bodies | small on the soak's ground | none |
| 8 | Rendering-only work | `World.massRenderPages = false` on a dedicated shard (`server/shardHost.ts:334`, field `world.ts:3716`): terrain visual pages are not built. The rest of the server's presentational output (flashes, texts, tells, cue arrays, cosmetics) is wire content clients draw | | small | row 9 |
| 9 | The snapshot | one `serializeSnapshot` per unit per beat (`shardHost.ts:764`) builds an `ActorW` row for EVERY actor in the World (`snapshot.ts:1123-1124`) and builds and stringifies the `memoryAccess` view every beat only to compare it (`snapshot.ts:1110-1115`; about 43.7 kB on an open account, charter §1). Encoding is already once per audience: `ownEntryJson` stringifies once with markers and splices per seat (`snapshot.ts:1414-1454`), and the transport writes one shared frame where no own row differs (`shardTransport.ts:568-586`). The spread snapshot's p95 is about 140 kB (`soak_foci.log`) | N per beat | about 1 to 3 ms a beat, 1 to 2% of today's spread tick | W6 for bytes; a memo for the memoryAccess key (W0 lane C) |
| 10 | Persist | the compact checkpoint costs about 58 ms every `worldSaveSec` 60 (foundation receipt) | world state | a three or four tick hitch a minute | not M6's |
| 11 | Cold preparation and publication | max ticks of 189 to 1,847 ms remain; "cold authoritative queries and publication also remain synchronous" (foundation doc) | travel into cold ground | the hitches, not the sustained load | the foundation's; islands confine each hitch to its island |

Two latent findings, named for the builders:

- **THE 1e6 CEILING** (CONFIRMED mechanism, PLAUSIBLE timescale). `losCached` keys a pair as
  `a.id * 1_000_000 + b.id` (`world.ts:48797`), and `detachSeat` decodes that encoding (`shardUnits.ts`, the
  `losMemo` prune). Actor ids are one process counter that a live world never resets (`actor.ts:515`, `532`; the
  reset is sim-only). Once ids pass 1,000,000, two different pairs share a key and a sight verdict can be served
  for the wrong pair until its TTL ends. A shard that mints natives continuously crosses it in days (set by the
  birth rate); any id-lane scheme for threads crosses it sooner. Fix in W2.
- **DICTIONARY-MODE NATIVES** (PLAUSIBLE). `restoreNativeActorState` deletes every own property of the actor before
  re-assigning (`dormancy.ts:297`). Deleting properties moves a V8 object to dictionary mode, so natives restored
  from a save or a page may pay slower property access at every hot site for life. A scratch rig with
  `--allow-natives-syntax` counting `%HasFastProperties` over natives after a resume settles it; the fix (assign
  onto a fresh factory body without deletes) is the foundation's.

### 1.3 The measurement plan (the profile recipe)

1. **The courses**, sequential on a quiet machine, the foundation's course exactly: seed `0x00ddba11`, roving off,
   reconnect on, `npm run soak:shard -- --bots 6 --seconds 60 --spread 0 --rove 0` and `--spread 3500 --rove 0`,
   plus `--bots 3 --spread 3500` for the curve. Three runs each; report medians with the machine line.
2. **A CPU profile with no code change**: `node --cpu-prof --cpu-prof-dir <scratch>/prof --cpu-prof-interval 250
   --import tsx balance/soak_shard.ts --bots 6 --seconds 30 --spread 3500 --rove 0 --no-drop`. The fleet is
   `fork`ed with the parent's `execArgv`, so it writes its own `.cpuprofile`; take the host's by pid. Load it in
   Chrome DevTools (Performance, Load profile) or speedscope, bottom-up by self time, grouped as: `updateAI` and
   its kernels; `World.update`'s children (`WorldMassRuntime.update` and its `sync` calls, the per-actor loop,
   `updateProjectiles`, `updateZones`, `separateActors`, `updateAuras`, `updateWatch`); `serializeSnapshot` and
   `JSON.stringify`; GC. (PLAUSIBLE: `--import tsx` runs on Node 24 with the repo's tsx; the warm-up lands in this
   profile too, so item 3's window-only profile is the clean read.)
3. **THE PHASE METER** (W0 lane A, shard-owned, no engine edit): `performance.now()` marks inside `ShardHost.tick`
   per unit around input, `applyInputs`, the AI loop, `update`, `settleNearScale`, the drain, the desks, the wire
   (serialize, encode) and persist; plus two instance wraps the host installs, `world.massRuntime.update` and
   `world.serializeWorldState` (an own-property override of the method on the instance: no source edit), so the
   runtime's share of `update` reads apart. p50/p95 per phase on the status page and as soak columns. A soak flag
   `--profile <path>` runs a `node:inspector` `Profiler` session over the measured window only.
4. **THE DISTANCE CENSUS** (soak): per sample, awake actors by state (seat, seat-owned, aggroed, alerted, idle,
   passive, squad) and by distance to the nearest seat in their World (0-600, 600-1,000, 1,000-1,300,
   1,300-1,600, beyond). It sizes THE THINKING EDGE before it is built.
5. **THE CURVE**: `--bots 1` to `6` at `--spread 3500`, and `--bots 6 --spread 0`. Fit
   `tick = c0 + c1 N + c2 N^2` with the group count as a covariate. If the quadratic term does not fall when the
   same N is split into more groups, the cross-neighborhood walks dominate: THE LOCAL ROSTER first. If a
   per-group term dominates: the runtime's per-neighborhood work, which is the foundation's and the islands'.
6. **THE IDLE UNIT**: one bot parked in a pocket, the rest at the hearth. The pocket's own meter row splits its
   about 5 ms into fixed `World.update` overhead and its population. The islands' fixed cost per World rides on it:
   six surface Worlds that each carry a 5 ms floor cost 30 ms on one core.
7. **On the real host once** before any thread gate is called.

### 1.4 The cheap wins that need no threads

| Win | Owner | Seam | What it saves (PLAUSIBLE) | Risk |
|---|---|---|---|---|
| THE THINKING EDGE | shard | `server/shardHost.ts:695` | idle bodies' brains at 20 Hz instead of 60: about two thirds of their brain cost and of the idle formation walks | an idle body's reaction quantized to 50 ms |
| THE LOCAL ROSTER | engine (ownership-gated) | the `ai.ts` walks in §1.2 row 2; a squad index on World | the N x N term, if the profile confirms it | byte identity of picks; `ai.ts` is shared with every lane |
| THE TICK DIAL | shard | `SHARD_CFG.tickHz`, read by `pump()` each wake (`shardHost.ts:918`) | a third fewer ticks a second at 40 Hz, the wire still 20 Hz | coarser server steps (dt 0.025, inside the 0.05 envelope) |
| THE WARM UNIT | shard | `server/simUnits.ts:325` wake steps 1 to 3 | the constructor's share of the about 75 ms wake moves off the traveller's tick | one idle World's memory |
| the memoryAccess memo | wire, after W6 lands | `snapshot.ts:1110-1115` | one 43.7 kB build and stringify per unit per beat | a stale view if the key misses a change |
| `massRenderPages` | done | `shardHost.ts:334` | already off (CONFIRMED) | |
| dormancy tighter than the population radius | NOT the shard's (§3.2) | `dormancy.ts:16-21`, the config digest | | births that sleep at once |
| serialize once per audience | mostly done (CONFIRMED, row 9); W6 extends it to interest sets | | | |

**THE THINKING EDGE in detail** (the brief's "per-actor AI cadence by distance", refined to idleness first). The
shard calls `updateAI` itself (`shardHost.ts:695`); the other two callers are `main.ts:1988` and
`sim/runner.ts:198`, so solo, co-op and the balance harness are untouched by construction (THE SOLO INVARIANT,
CONFIRMED). A body is EDGED when it is idle: not a seat body and not owned by one; not aggroed and holding no
target; not casting; not alerted (`time < alertUntil`); not struck or fighting for `idleSec` (`aiHitAt`,
`lastCombatAt`); not tethered, latched, gripped, held, mounted or a part; no fuse; no engaged member in its squad;
and farther than `nearPx` from every seat in its World (a close-quarters guard; idleness is the real gate). An
edged body thinks only on the wire's beat ticks, the ticks whose state ships (`shardHost.ts:731`), with
`dt * ticksPerBeat` (0.05 s at 60 Hz, which is the co-op host's own dt ceiling: charter §1 "min(0.05, frame)").
Clients only ever receive beat-tick states, so an idle body's shipped path changes only by its decisions being
quantized to 50 ms (PLAUSIBLE: a wander curve or an obstacle slide may differ by a few px between one 0.05 step
and three 0.0167 steps). The brain's own clocks read absolute `world.time` and integrate `dt` (the fuse
`ai.ts:630`, threat decay `ai.ts:680`), so nothing a skipped tick held is lost (CONFIRMED for those two;
PLAUSIBLE for every kernel, which the probe checks by distance walked per second). The edge is the governor's
first dial (§3).

**THE LOCAL ROSTER in detail.** A per-tick squad index on World (`squadMembers(id)`, rebuilt when
`actorGridRev` moves) answers the leader finds and formation scans; radius-bounded scans go through
`actorsNear` padded by one tick of travel (the grid is built before the AI phase moves bodies), filtered with
the exact current distance and iterated in `gridSeq` order, which is the roster order, the `separateActors`
idiom (`world.ts:56635-56643`), so ties and "first match" picks stay byte-identical. Unbounded scans (a
`relentless` detect is `Infinity`) keep the full walk. Gate: `npm run sim -- baseline check --suite smoke`
byte-identical plus an equivalence probe.

**THE TICK DIAL arithmetic** (CONFIRMED on `shardHost.ts:731`): the beat is
`ticks % round(tickHz / stateHz) === 0`, so 40 Hz keeps a 20 Hz wire (2 ticks a beat) while 30 Hz drops it to
15 Hz (`round(1.5)` is 2). The dial steps 60 to 40, never to 30. `pump()` reads `SHARD_CFG.tickHz` every wake
(`shardHost.ts:918`), so it needs no restart, and THE HONEST INPUT replays a 60 fps client's moves under the
time budget (charter §7d W1 row), so the hero still walks honestly (PLAUSIBLE that nothing else assumes 60).

---

## 2. THREE SHAPES, judged against THE PIN

### 2.0 What THE PIN is, in full (CONFIRMED)

- **The copies.** 45 fields (43 alias + 2 counters: `PINNED_FIELDS`, `shardUnits.ts:263`) are copied keeper to
  unit by reference at every entry and back when reassigned (`pinIn`/`pinOut`, `shardUnits.ts:285-307`), plus the
  2 clocks in only. Census totals in `SHARD_UNIT_FIELDS`: alias 43, counter 2, clock 2, keeper 33, host 6, seat 31,
  unit 57.
- **The shared mutation beneath them.** `pinOut` writes back only a reassigned reference
  (`if (v !== entry.at[i]) k[f] = v`). Every IN-PLACE change a unit makes (`zoneMemory.set` at the capture, a run
  ledger bump, a quest's progress, a notice pushed, a set grown) reaches the keeper only because the unit holds the
  keeper's very objects. Off the keeper's thread there are no shared objects: every such write must become a
  message. The census says which fields are world-level; it does not yet say how each one is written.
- **The closure seams** (a function that runs in another World): `ShardWorldLink.dispatch` behind `World.atZone`,
  seven call sites (`world.ts:8419`, `16338`, `16496`, `22970`, `23017`, `23053`, `44201`; `22970`, `23017` and
  `23053` use the answer); `worlds()` behind `presentWorlds()`, ten reads (among them `world.ts:8213`, `8367`,
  `20984`, `21990`, `44285`, `44400`, `53377`); the roads' landing and after-word closures (`world.ts:14653`,
  `46908-46909`, `47725`, `47764`) and `RoadTicket.landing`/`onFirstWake`/`after` (`shardUnits.ts:76-101`); the
  desks' `within`/`worldOf` (`server/vessel.ts:387`, `482`, `568`, `583`, `629`, `645`; `server/corpses.ts:329`,
  `339`, `356`; `server/shardHost.ts:380`); the host's published closures (`partyMates`, `seatCorpseMarks`, the
  link itself: `shardHost.ts:632-651`).
- **The hand-off packet is live objects.** `SeatPacket` carries the `Seat`, the hero and its court as the same
  `Actor` objects, opaque values from `companionGrants.lift`/`replenishment.lift`, exported bonds and
  `BuffEffect`-keyed rows (`shardUnits.ts:338-357`). It is NOT JSON-safe, and `probe_shardunits` D pins "the same
  Actor objects and ids" (`balance/probe_shardunits.ts:736`).
- **The counters are per isolate or per World.** `nextActorId` (`actor.ts:515`) and item `uidCounter`
  (`itemgen.ts:44`) are module globals, one per isolate; `squadSeq` is per World (`world.ts:10304`), as are the
  domain and guard-art source counters the detach already strips.

### 2.1 Shape (a): a unit per worker thread, THE PIN replaced by message-passed deltas

**What must cross, and how often** (the 45 pinned fields classified by how a pocket touches them; PLAUSIBLE until
W2's census column pins each one):

| Crossing | Fields | When |
|---|---|---|
| boot (identical in every isolate) | `manifest` | never |
| wake payload | the unit's own `zoneMap`/`caveMap` rows and its exits' targets, its `zoneMemory` row, its slice of `massSideareaRoots`/`massCaveIds`, `theaterVisitSeq` (the keeper allocates the visit ordinal) | once per wake |
| replica, keeper to unit | `accountSource` (THE KEEPER'S GATE: the shard account; its memoryAccess view alone is 43.7 kB), `activeQuests`, `completedQuests`, `questImbues`, `questRewardItems`, `bountyOffers`, `bountyHands`, `bountyBoardState`, `completedObjectives`, the run `ledger`, the seat's `townPortals` row, `visited`, `surveyed`, `discoveredWaypoints`, `mercSheets`, `vendorHolds`, and `sim` as a per-zone view (pockets are sheltered: no weather; faction relations and the clock) | on change; the bounty watch alone reconciles every 2 s (M1 plan §1.6) |
| write log, unit to keeper | `notices`, `pickupFeed`, `newsLog`, `slainLog` (append); `ledger`, `accountDirty` (add, or); `completedObjectives`, `throngClaimed`, `annexFound`, `manifestedThisRun`, `materializedSwarmings`, `seasSeen`, `discoveredDimensions` (union); quest progress and bounty credit (named verbs); `zoneMemory` (the row, at sleep and at THE PERSIST CAPTURE) | at the barrier, every tick, usually empty |
| keeper-executed | `nextGenId` and every mint (`chartFrontier`; `shardMouthRoad`'s deeper pocket) as a ticket the keeper runs at the drain | per road |
| clocks | `time`, `inputClock` | in the tick message |

Per tick that is a few hundred bytes (clocks, inputs, actions, a usually empty log) plus the unit's frames as
transferred buffers; per change, a replica; per wake, a payload of tens to a few hundred kB, dominated by the
account (PLAUSIBLE).

- **The clock**: THE ONE CLOCK survives exactly under a lockstep barrier (§2.4).
- **The hand-off packet**: NOT JSON-safe (CONFIRMED, §2.0). It needs THE TRAVELLING BODY (W2). Tickets are not
  JSON-safe either (closures); five landing/after closures become named verbs.
- **What it buys**: the pockets' cost (about 5 ms each) and the wake stall (about 75 ms) leave the keeper's thread.
- **What it does not buy**: anything on the surface. Under lockstep a cave-diver still ticks at the surface's pace.
- **Verdict**: necessary machinery, insufficient alone.

### 2.2 Shape (b): neighborhoods as the thread grain on the surface

- **The cost of the split.** The surface is one World and one `WorldMassRuntime` whose state is a web of live-actor
  maps and per-place reservations (`runtime.ts:128-215`: natives, births, paging, dormancy, native occurrences,
  courts and brittles, geography objectives, caravans and processions, weather, snow and storms, shrines, puzzles,
  sites, ecology, settlement, journey). Splitting it across isolates means several surface Worlds over one seed,
  each with a region-scoped runtime: the foundation's code (charter §6.3, the shard never edits
  `src/worldmass/**`; §4 M6, "region partition with the seamless lane").
- **Ghosts are avoidable** (PLAUSIBLE, and the key finding of this pass). The runtime's groups already merge at
  `2 * populationRadius` = 2,600 px (`foci.ts:57`), while THE NEAR LAW's radius is 1,600 (`SHARD_CFG.nearRadius`):
  two players in different groups can never share XP, a party scale, a kneel or a group hold (CONFIRMED
  arithmetic). Set the THREAD grain, an ISLAND, where no player can SEE across: separation S of at least the awake
  radius (`sleepRadius` 1,600, `preset.ts:166`) plus the view (PLAUSIBLE 1,000 to 1,350 world units:
  `CAMERA_CFG.zoom` base 1.3, minimum 0.85, `render/camera.ts:73`, on 1080p to 1440p screens) plus a margin,
  about 3,200 px. Then no body of one island is ever visible or touchable from another, seams fall in empty
  ground, and the "hand-off band" becomes merge and split hysteresis. No cross-thread combat, no ghost bodies.
- **What crosses**: the world alias set for every island World (as in (a)); the runtime's shared state (claims and
  terrain patches in `MassState`, `state.ts:12-60`: claims are grow-only and merge as unions, patches are keyed by
  cell); bodies at merges and splits. A native record format already exists: `captureNativeActorState` and
  `restoreNativeActorState` (`dormancy.ts`) remap actor references and squad ids through maps (CONFIRMED: the
  `{actor}` and `{squad}` values), but they restore onto a fresh factory body and exclude `id`
  (`rootExcluded`, `dormancy.ts:76`), so a migrated native gets a new id and would pop on clients unless the format
  keeps ids under THE ID LANES.
- **Boot.** A new island needs a surface World with a runtime: the wilds constructor runs about 1 s synchronously
  and a resume stands up in 3 to 4.5 s (charter §8, CONFIRMED). Splits therefore need WARM ISLANDS: pre-booted idle
  surface Worlds per worker (a runtime with no foci returns early, `runtime.ts:816`, CONFIRMED).
- **Churn.** Real players roam. The soak's bots roam about 1,500 px around anchors 3,500 apart, so islands would
  merge and split during the course (PLAUSIBLE); each is a migration.
- **What it buys**: the measured case directly, one neighborhood of 58 to 96 natives per core.
- **Verdict**: the right grain for the surface; not the shard's to build, and not before the profile says
  per-island work is the cost.

### 2.3 Shape (c): the hybrid

- **The keeper thread** keeps the chart, the WorldSim, the clock, the world sweeps, the transport, the desks, the
  party, persistence, and THE HEARTH ISLAND (the settlement and any neighborhood touching it).
- **Workers** host pocket units and far islands, several per worker, placed by measured cost (the per-unit phase
  meter).
- **The wire per unit** is serialized and encoded in the owning worker (`serializeSnapshot`, the own-entry split,
  `encodeText`), its frame buffers transferred zero-copy, and written by main. A socket cannot move into a worker
  thread (Node's transfer list takes ArrayBuffers, MessagePorts and file handles, not sockets: CONFIRMED Node API),
  so "sent from the worker" means encoded there.
- **One protocol for both halves**: THE GLASS UNIT's messages (W2).

### 2.4 The recommendation, and the laws it bends

**Recommend (c), its surface half on islands, after W0 and W1.** Why:
1. It is the only shape that reaches the measured case (the surface) and the pockets with one machine.
2. Islands remove ghosts by sizing the grain to the view; neither pure (a) nor a static grid of regions can (a
   static grid puts fights on its seams and needs cross-thread hits).
3. The keeper stays the one canonical owner of world state; workers are replicas with write logs. THE PIN's
   canonical copy keeps its home.
4. The shard builds the protocol and the host (W2, W3) in its own files while the foundation builds the island
   runtime: neither lane waits.

Honest costs: the island runtime is the foundation's largest M6 item; W2 is the riskiest shard wave (a missed
in-place write or closure is a silent divergence, mitigated by running glass and pinned modes side by side on one
thread and comparing digests); lockstep means the slowest thread sets the shard's tick; M6 needs a host with cores.

**The barrier** (PLAUSIBLE design on CONFIRMED Node APIs): main posts each worker its tick message (tick number,
T0 and IC0, dt, the inputs and actions of its seats, queued dispatch verbs, replica deltas, desk requests), steps
the keeper, then waits per worker on a `SharedArrayBuffer` flag with `Atomics.wait` (allowed on Node's main
thread) and reads the reply synchronously with `receiveMessageOnPort`. The pump keeps its synchronous shape
(`shardHost.ts:914`). Wall time per tick becomes the slowest thread's, not the sum.

| Law | Today, one thread (CONFIRMED) | Under (c) | Bent? | Pinned today by |
|---|---|---|---|---|
| THE ONE CLOCK | every unit enters its step at the keeper's tick-start `time`/`inputClock` (`shardHost.ts:671`, `simUnits.ts:226`, `pinIn`) | the tick message carries T0/IC0; lockstep keeps every World on tick N together. A keeper sweep's dispatch into a worker unit lands with the NEXT tick message, before that unit's next step (today: the same tick); answers the sweeps need (`atZone` at `world.ts:22970`, `23053`) come from the unit's last published summary | steps exact; split sweeps one tick later | `probe_shardunits` A (`:502`, the clock rows) and C (`:610`, both units step on it), J; `probe_shardinput` D (THE TIME BUDGET) |
| THE KILLER'S DUE | `grantXp` iterates the unit's own seats; `partyMates` is a host closure (`shardHost.ts:635`) | unchanged per unit; `partyMates` reads a replicated party table. Islands: two islands are more than 1,600 px apart, so the due never spans them | kept | `probe_shardparty` C (`:114-130`), `probe_shardunits` I |
| Parties across threads | PartyDesk rows published into every World on a rev change (`shardHost.ts:866-871`) | rows posted on rev change; invites, accepts and kicks stay on main | kept, rows one tick late | `probe_shardparty` |
| THE GROUP LAW kneel and hold | a mate must stand in the same unit (`together()`) | the same | kept | `probe_shardseat` F (`:271`), `probe_shardunits` I |
| The vessel desk's mirror | `within(seatId, serializeIn)` synchronous (`vessel.ts:387`) | a request in the tick message, the parcel in the reply; THE FAREWELL waits for the next barrier before the close | bent: up to one tick | `probe_shardslow` M |
| The corpse desk | stand, dwell and reclaim read the seat's World synchronously (`corpses.ts:329-356`) | records replicated to the unit hosting the seat; reclaim is two-phase (the worker hands the gear over, main clears the record), idempotent by record id | bent: two-phase | `probe_shardslow` O |
| THE DEATH COVENANT | `VesselDesk.tick` judges each seat in its unit the tick the down lands | downs ride the reply; main judges (party holds, the stage); the fall is ordered back with the next tick message, inside `deathBeatSec` 1.5 s | one tick later, unseen | `probe_shardseat`, `probe_shardslow` N, `probe_shardunits` I |
| The notice audience | one `notices` feed (pinned); `stampAudiences` per unit; the acting seat's party gathered over every unit (`world.ts:53377`) | each unit's feed rides the write log; main forwards lines whose audience stands in another unit into that unit's next tick message | bent: a forwarded line lands a tick later | `probe_shardseat` J (`:440-453`), `probe_shardwire` |
| THE PERSIST CAPTURE | `captureAll` under each pin before the keeper serializes (`simUnits.ts:389`) | the capture request rides tick N; the rows ride the reply; main serializes after the barrier: a consistent cut at N | kept | `probe_shardunits` E |
| THE UNIT BREAKER | a faulting unit's seats are rescued as live objects (`simUnits.ts:395-424`) | a faulting unit as today; a DEAD worker loses its live units, and their seats wake at the hearth from their last mirror (up to `persistSec` 20 s of progress) or a seat checkpoint beat | bent (card 4) | `probe_shardunits` E (`:815`, the breaker check) |
| THE HAND-OFF's identity | the same Actor objects (`probe_shardunits.ts:736`) | the same ids and the same live state (THE TRAVELLING BODY) | objects bent, ids kept | `probe_shardunits` D |
| Id uniqueness | one counter per process | THE ID LANES: disjoint ranges per isolate, lane 0 = today's range | kept | new `probe_shardthreads` |
| THE SOLO INVARIANT | no `shardWorld`, nothing runs | workers exist only on a shard; lane 0 is today's id range | kept | `probe_shardunits` B (the digests) |
| THE NEAR LAW (islands) | positions are comparable only inside one World | islands are farther apart than the near radius | kept by construction | `probe_shardseat` |

---

## 3. THE NEIGHBORHOOD GOVERNOR (the interim)

### 3.1 What the shard can do alone, today, without touching `src/worldmass`

It can make each actor cheaper and slow the world's clock; it cannot change how many natives exist.

- **Dial 1, THE THINKING EDGE** (§1.4): off or on the beat. Invisible to observers; the first dial to move.
- **Dial 2, THE TICK DIAL**: 60 to 40 Hz under sustained overload, the wire still 20 Hz (§1.4).
- **Dial 3, THE DOOR** (last resort, her call): hold new joins at the lobby with a refusal word while p95 has been
  over the gate for N seconds. Never a default.
- **The instrument**: THE PHASE METER and a governor row on the status page.

### 3.2 What it cannot do

- **Lower births or the live count.** `populationLimit` multiplies `config.maxPopulation` by the group count
  (`runtime.ts:760-767`). The config is frozen in the runtime's constructor
  (`freezeData(JSON.parse(canonical(config)))`), hashed into THE LAND DIGEST the welcome ships
  (`shardHost.ts:354`, `massDigest(config)`) and verified by the compact checkpoint
  (`worldmass/checkpoint.ts:30` refuses a checkpoint whose config digest differs). A shard-side config change is a
  different land: clients would refuse it and saves would not stand (CONFIRMED).
- **Pass foci.** `World.update` calls `this.massRuntime?.update(this)` with no foci (`world.ts:43998`), and the
  runtime derives them from every live non-keeper seat (`foci.ts:27-32`). Explicit foci would need a `world.ts`
  seam and could only drop or coalesce players' neighborhoods, which the foundation's contract forbids ("the host
  must not revert to keeper hopping or suppress other players' surroundings").
- **Shrink the awake disc.** `validateMassDormancy` refuses `wakeRadius < populationRadius`
  (`dormancy.ts:16-21`); the radii are config.
- **Shed load quickly, even with a budget.** A lowered budget only slows births ("a merger never deletes existing
  bodies"), and dormancy needs 12 quiet seconds beyond the sleep radius (`preset.ts:166`), so any population dial
  acts over tens of seconds (PLAUSIBLE: the 3-bot course shed 64 actors in about 30 s through kills alone).

### 3.3 The exact seam to ask of the foundation (ask 4, refined)

```ts
// src/worldmass/runtime.ts (foundation). HOST STATE, like focus membership:
// never in the config, the land digest, the checkpoint or any save.
export interface MassPopulationBudget {
  /** Live natives every neighborhood group may hold together. */
  total: number;
  /** No group's limit falls below this: the living-radius premise. */
  floor: number;
}
setPopulationBudget(budget: MassPopulationBudget | null): void; // null = today's law, byte-identical
populationStats(): { total: number; groups: { members: readonly string[]; live: number; limit: number }[] };
```

Semantics: a group's limit is `clamp(floor, config.maxPopulation, floor(total / groups))` (or shared by member
count, her call), replacing `config.maxPopulation` in both branches of `populationLimit`; reservations, merges and
dormancy unchanged; lowering never kills; `null` restores today exactly (pinned in `probe_worldmass_foci`).

A second dial, only if the budget thins neighborhoods too far (ask 4b): `setResidencyRadius(r | null)`, births
only within `r <= populationRadius` of a focus, with the dormancy wake and sleep radii following as host state
(`wake = r`, `sleep = r + 300`) so that births never land in the sleep band (no birth-then-sleep pump). A smaller
disc that still covers the screen may read better than a thinner one (PLAUSIBLE; her call).

Seam placement: a setter on the runtime instance means no `world.ts` edit at all; the shard calls
`world.massRuntime?.setPopulationBudget(...)` from the host once a second, after detecting the method (so the
shard's governor runs cost-only against an older foundation).

### 3.4 The controller (`server/governor.ts`, shard-owned)

- **Signal**: an EWMA of tick ms (alpha 0.1) and the rolling p95 over 2 s, read from the pump's own ring
  (`ShardHost.tickMs`).
- **The ladder, cheapest player impact first**: (1) the thinking edge on once the EWMA passes 50% of the budget;
  (2) the population budget down 10% a second while p95 is above 90% of the gate, to `floor * groups`, and up 8 a
  second while p95 stays under 60% for 5 s, to `maxPopulation * groups`; (3) 40 Hz after 10 s at the floor still
  over the gate, back to 60 after 30 s under 50%; (4) THE DOOR only if she rules it.
- **Hysteresis**: every dial holds at least 5 s.
- **The receipt**: the spread course, the dials printed per sample, `living` least at or above the floor, and a
  new `seen` column (foes within the view radius) because a dial acting beyond the view is invisible by design and
  the 1,300 px metric would under-read it.

---

## 4. THE WAVES

Every wave: its own worktree off the shard tip, the ownership gate from a session-local declaration (tokens per
wave below), `npm run check`, the shard probes plus the wave's own, each new probe's roster row in the same
commit, a `git merge-tree` dry run against the foundation tip (charter §7c), and the spread course as the receipt:
**the living radius must stay while tick p95 returns under the gate.** Sequencing: W0 and W1 after W6 and M1-W4
merge (W0 lane A and W1 share `server/shardHost.ts` and `balance/soak_shard.ts` with them).

### W0 THE ONE-THREAD DIET

| | |
|---|---|
| Builds | Lane A (shard): THE PHASE METER (`server/phaseMeter.ts`, NEW: marks and the two instance wraps), THE THINKING EDGE (`server/thinkingEdge.ts`, NEW: the idle predicate and the beat rule; the call at `shardHost.ts:695`), the soak's `--profile`, phase columns, distance census and a `--think` on/off flag (`balance/soak_shard.ts`), `balance/probe_shardthink.ts` (NEW), a row in `docs/engine/shard.md`. Lane B (engine, run only if the profile points at the walks): THE LOCAL ROSTER (a squad index on World; the walks of §1.2 row 2 through it or through padded `actorsNear` in `gridSeq` order; the projectile bell walk at `world.ts:54515` through an index of `castOnStruck` constructs), `balance/probe_localroster.ts` (NEW: equal picks to the full walk over seeded crowds). Lane C (wire, after W6): the memoryAccess key memo, and a cull before row-building if W6 culls after |
| Owns | A: `server/phaseMeter.ts`, `server/thinkingEdge.ts`, `balance/probe_shardthink.ts` whole; hunks in `server/shardHost.ts`, `balance/soak_shard.ts`, `balance/proberoster.ts`. B: hunks in `src/engine/ai.ts`, `src/engine/world.ts`; `balance/probe_localroster.ts` whole. C: hunks in `src/net/snapshot.ts`. Tokens `phaseMeter`, `thinkingEdge`, `localRoster`, `squadMembers` |
| Size | A about 450 lines with its probe; B about 350 with its probe; C about 40 |
| Risks | A: idle reactions up to 50 ms later; an eligibility hole (a struck body stays edged until its next beat: at most 33 ms). B: `ai.ts` is shared by every lane; byte identity of picks and the smoke baseline; B may be unneeded if the profile clears the walks |
| Gate | the spread course (three runs): p50 and p95 fall (target p50 halved, PLAUSIBLE) with living least and mean unchanged within run noise; the clustered course no worse; `probe_shardthink` (an edged native walks the same distance per second within 1 px/s as an unedged one in a scripted wander; an aggroed, alerted, struck or casting one is never edged; solo, co-op and the sim never edge: their loops are not the shard's); lane B: `npm run sim -- baseline check --suite smoke` byte-identical and the AI probes green |

### W1 THE GOVERNOR

| | |
|---|---|
| Builds | Shard: `server/governor.ts` (NEW: the controller of §3.4), the once-a-second call and the tick dial in `server/shardHost.ts`, a status row, the dial columns and the `seen` column in `balance/soak_shard.ts`, `balance/probe_shardgovernor.ts` (NEW: synthetic tick costs walk the ladder up and back with hysteresis; without the foundation seam the governor runs cost-only; with it, the runtime's per-group limits follow the budget; no dial ever despawns a body). Foundation (§3.3): `setPopulationBudget`, `populationStats` in `src/worldmass/runtime.ts`, rows in `probe_worldmass_foci` |
| Owns | Shard: `server/governor.ts`, `balance/probe_shardgovernor.ts` whole; hunks in `server/shardHost.ts`, `balance/soak_shard.ts`, `docs/engine/shard.md`. Foundation: its own files. Tokens `governor`, `tickDial`, `populationBudget` |
| Size | Shard about 350 plus the probe about 250; foundation about 100 plus probe rows |
| Risks | oscillation (hysteresis; the budget acts slowly because lowering never kills); the 40 Hz dial's feel; a floor set too high leaves the gate breached, and the receipt must say so rather than lower the floor silently |
| Gate | the spread course: tick p95 at or under 20 ms, dropped at or under 5%, living least at or above the floor; the clustered course: the governor moves no dial |

### W2 THE GLASS UNIT (pockets that speak only in messages, still one thread)

Two lanes against one contract file landed first (the M1-W1 pattern).

| | |
|---|---|
| Contract | `src/engine/shardUnits.ts`: a `wire` column on every `SHARD_UNIT_FIELDS` row (`boot`, `wake`, `replica`, `log:append`, `log:add`, `log:union`, `log:set`, `keeper`); the `UnitPort` message types (tick, reply, wake, sleep, capture, mirror, fall, verbs); `SeatParcel` |
| Engine lane | `src/engine/shardTravel.ts` (NEW, THE TRAVELLING BODY: `packSeat`/`unpackSeat`, the couch-guest build of `meta/character.ts:1087` plus a live overlay: life, mana, charges and gauges, each slot's cooldown and state, statuses and buffs by def key, the MOVE rows as JSON, and the court through an id-preserving extension of the native record format with defs by id); THE ID LANES (`actor.ts`, `itemgen.ts`: disjoint id ranges per isolate, lane 0 is today's range so solo is untouched; the item uid floor lane-aware, so a restored foreign-lane uid never moves this lane's floor); the pair key without the 1e6 cap (`world.ts:48797` and the detach prune); the five landing and after-word closures as named verbs; `atZone` and `presentWorlds` answering from published summaries when the unit is remote; `src/engine/shardLog.ts` (NEW, THE WRITE LOG: a census-driven recorder over alias objects in a glass unit, replayed at the barrier by each field's merge policy: deltas for counters, last-writer for stamps, unions for sets, appends for feeds) |
| Host lane | `server/simUnits.ts` (`SimUnit.host`, pinned or glass, a glass unit driven only by `UnitPort` messages over an in-process channel); `server/vessel.ts`, `server/corpses.ts` (mirror requests, covenant events and orders, the corpse stand and the two-phase reclaim); `server/shardHost.ts` (`UNIT_CFG.host`); `balance/probe_shardglass.ts` (NEW: THE GLASS DIGEST, one scripted course run pinned and run glass, the keeper's alias digest equal at the end; every census field crosses by its column; an unknown write fails loudly) and `probe_shardunits` C to J re-run in glass mode, D re-specified as the same ids, life, cooldowns, statuses and companions |
| Owns | the new files whole; hunks in `src/engine/shardUnits.ts`, `src/engine/actor.ts`, `src/engine/itemgen.ts`, `src/engine/world.ts` (the verbs, the pair key), `server/simUnits.ts`, `server/vessel.ts`, `server/corpses.ts`, `server/shardHost.ts`. Tokens `glassUnit`, `shardTravel`, `shardLog`, `idLane`, `unitPort` |
| Size | contract about 150; engine about 900; host about 650; probes about 500 |
| Risks | the highest correctness risk of M6: a missed in-place write or closure is a silent divergence (THE GLASS DIGEST exists for it); the court's exact capture (card 7); numeric merge policies |
| Gate | `probe_shardunits` A to J green in both modes; THE GLASS DIGEST equal; the classic soak with bots taking pockets within 10% of the pinned p95 |

### W3 THE THREAD HOST

| | |
|---|---|
| Builds | `server/unitWorkers.ts` (NEW: the pool, pre-spawned before `listen` so THE RESUME LAW grows THE POOL STANDS; placement by measured cost; THE BARRIER of §2.4; frames as transferred buffers; a deadline that marks a late worker; THE UNIT BREAKER for a dead one), `server/unitWorker.ts` (NEW entry: `bootShardEngine` and the arena registrations, its ID LANE, glass units stepped on tick messages, frames encoded), `server/unitWorkerBootstrap.mjs` (NEW, the `tsImport` idiom of `server/massWorkerBootstrap.mjs`), `host: 'worker'` in `server/simUnits.ts`, the tick in `server/shardHost.ts` (post, step the keeper, wait, apply, drain, desks, write bytes), `--unit-host` in `balance/soak_shard.ts`, `balance/probe_shardthreads.ts` (NEW) |
| Owns | the new files whole; hunks in `server/simUnits.ts`, `server/shardHost.ts`, `balance/soak_shard.ts`. Tokens `unitWorkers`, `threadHost`, `poolStands` |
| Size | about 800 plus the probe about 350 |
| Risks | a worker's death (card 4); memory per isolate (PLAUSIBLE 150 to 400 MB with the content loaded); a two-core host gains nothing (card 3); lockstep couples every thread to the slowest |
| Gate | `probe_shardthreads`: a worker unit's `time` equals the keeper's every tick; ids never collide under concurrent mints; a cross-thread hand-off keeps ids and state; frames equal to glass mode's; a killed worker's seats wake at the hearth. The pocket soak: the keeper's tick no longer pays for awake pockets, and no wake stalls it |

### M6+ THE ISLANDS (the joint program that follows)

- **Shard**: `server/islands.ts` (NEW: the island scheduler over the runtime's groups with the view-sized
  separation and hysteresis, WARM ISLANDS per worker, merge and split through THE TRAVELLING BODY and the island
  records).
- **The foundation's island runtime** (the asks): region-scoped births over its own foci; a claims port merged by
  the keeper (unions) with terrain patches by cell; `exportRegion` and `adoptRegion` with id-preserving native
  records; an owner for geography, processions and weather (pure of seed and time, or keeper-broadcast scales);
  the hearth's settlement on the keeper; island state for the world save at a barrier-consistent tick.
- **Gate**: the spread course at the FULL per-group budget (the governor's floor lifted) on a host with at least
  islands + 2 cores: p95 at or under 20 ms, dropped at or under 5%, living least at or above 21 (today's delivered
  least), merge and split hitches confined to their own islands.

---

## 5. What a player would notice

- **W0.** Spread across the wilds, the world stops rubber-banding as hard: today the shard steps about one tick in
  seven and a hero's inputs land in a fifth of server ticks; every millisecond W0 cuts goes back to everyone.
  Idle creatures far from everyone decide on the wire's own beat; on screen nothing changes, because clients only
  see the beat (a wanderer's path may differ by a few pixels; a creature turning toward a newcomer at the edge of
  its disc may do so up to 50 ms later). First hitch: none.
- **W1.** When many players spread out, each neighborhood grows a little thinner than when one player walks alone:
  fewer fresh births, nothing ever vanishing. As players regroup or leave, births resume. Under the heaviest load
  the server may step 40 times a second while the picture still arrives 20 times a second. No caption explains any
  of it (SHOW, DON'T TELL). First hitch: a burst of births when the budget rises, paced by the runtime's 0.5 s
  population beat (PLAUSIBLE).
- **W2.** Nothing visible: the same caves, the same bodies; a cave entry costs the server a few milliseconds more
  (the body packed and unpacked, PLAUSIBLE). First hitch: none.
- **W3.** Entering or leaving a cave no longer freezes everyone else for the wake (about 75 ms today on the one
  thread); the traveller's own arrival takes the wake plus a tick or two, inside the zone change it already sees.
  While the surface still runs on the keeper, a cave-diver's world ticks at the surface's pace (one clock). A
  worker that dies sends its cave-divers to the hearth with up to their mirror's age of progress lost (card 4).
  First hitch: the pool boots before the shard opens its door (a slower start, never a player-facing pause); a
  worker spawned later makes one traveller wait.
- **M6+.** Every spread player meets a full neighborhood at a steady tick. Two players walking toward each other
  merge their islands well before either could see the other's creatures; the merging creatures may hold still
  for a beat or two (up to about 100 ms) for those two players only, and nobody else notices. A teleport into
  another player's neighborhood is a hand-off like a road. First hitch: the first split lands on a warm island;
  without one it would boot for seconds.
- **Latency.** Lockstep adds no input latency (inputs land in the same tick); the barrier costs the main thread a
  fraction of a millisecond a tick (PLAUSIBLE).

---

## 6. Cards for her word (every number unblessed)

1. **THE ORDER.** A: W0 and W1 now, W2 and W3 when the foundation commits to the island runtime (recommended).
   B: all four now. C: W0 and W1, then decide from the profile and the player counts she expects.
2. **THE GOVERNOR.** The per-group floor (recommended 24, today's delivered least); whether the tick may drop to
   40 Hz; whether THE DOOR exists at all.
3. **THE HARDWARE.** Threads need cores; the codespace has two. Recommended: a 4 to 8 core host before W3 lands.
4. **A WORKER'S DEATH.** Its players wake at the hearth from their last mirror (up to `persistSec` 20 s of
   progress lost), or a seat checkpoint beat (2 s, a few kB a seat). Recommended: the checkpoint beat.
5. **ONE CLOCK.** Lockstep, so the slowest thread sets the shard's tick (recommended), or a clock per thread with
   a rebase law at every hand-off.
6. **THE ISLAND SEPARATION.** Islands split where no player can see across (about 3,200 px) with hysteresis; a
   merge costs a short hold for the merging players only.
7. **THE TRAVELLING COURT.** Exact capture for every carried body (recommended), or timed summons re-minted at their
   life fraction on a cross-thread hand-off.

---

## Appendix: CONFIRMED versus PLAUSIBLE, in one place

**CONFIRMED (read this pass):** the whole surface is the keeper's World and only pockets wake units; the
per-group budget is `maxPopulation * groups`; the config is frozen, digested into the welcome and verified by the
checkpoint; `World.update` passes no foci; the dormancy validation refuses a wake radius under the population
radius; `updateAI` runs for every actor every tick from the shard's own loop, with no distance or idleness rate in
`ai.ts`; the whole-roster walks and their lines; the projectile and field roster walks; `separateActors` already
uses the grid; `massRenderPages` is off on the shard; the snapshot builds every actor's row and stringifies the
memoryAccess view each beat, and encoding is already once per audience; THE PIN's 45 fields, its write-back of
reassigned references only, and the census totals; the closure seams and their counts; the `SeatPacket` and
`RoadTicket` are not JSON-safe; the per-isolate and per-World counters; the 1e6 pair key; the native record
format's reference remapping and its id exclusion; the beat formula and `pump()` reading `tickHz` each wake; the
three `updateAI` callers; the near radius against the group merge distance; the receipts in §1.1; the type check
on 5a83cf84 exits 0.

**PLAUSIBLE (a builder's check or a measurement first):** the superlinear exponent and its cause (the profile
decides between whole-roster walks and neighborhood density); every weight in §1.2; THE THINKING EDGE's savings
and its losslessness to observers; THE LOCAL ROSTER's byte identity with padding; the 40 Hz dial's feel; the view
radius and the island separation; dictionary-mode natives; the 1e6 ceiling's timescale; the crossing table of
§2.1 (W2's census column makes it CONFIRMED); worker memory and barrier costs; island churn; the about 5 ms per
pocket and 75 ms per wake (from the brief, not re-measured).
