# M1 THE SIM UNITS: the implementation plan

Planner pass, read-only, worktree `D:/Games/Claude/arpg-shard` (branch `shard-world` @ `4b2ee251`).
Every anchor is `file:line` on that tree; line numbers drift, symbols do not. **CONFIRMED** = read in
the code this pass. **PLAUSIBLE** = inferred, needs a builder's check. Every number is unblessed.

Inputs read: `docs/design/shard-world.md` (3.3, 3.4, 3.12, 4 M1, 6.5, cards 15 B / 23 / 25, 7d gap 5),
`docs/engine/shard.md` (whole), `server/{shardHost,shardTransport,vessel,corpses,party,wildsSave,shard}.ts`,
`src/net/{snapshot,seatView,wildsClient,intent}.ts`, `src/main.ts` client zone lanes, and the
`World` regions named below. Two read-only research agents swept `update()` (keeper vs unit) and the
hand-off carry set; their findings were spot-checked before use.

---

## 0. The shape in one page

One `World` per live zone. **THE KEEPER** (the World that exists today) stays the canonical owner of
the chart, the `WorldSim`, the clock, the account and the world sweeps; its zone is the hearth (on a
`--worldmass` shard: the whole surface plus the hearth). Every other **UNIT** is a fresh `World` booted
into one zone, with the keeper's world-level fields **PINNED** onto it, its own parked **UNIT WARDEN** as
`p0`, and the shard's timeflow policies. A seat moves between units by **HAND-OFF** (the same `Actor`
objects leave one `actors` array and join another). A road no longer calls `loadZone` on a shard: its
decision point emits a **TICKET** for the acting seat, and the host executes every ticket after all
units ticked (**THE HAND-OFF QUEUE**). The keeper alone runs the world sweeps; the sweeps that drain a
world queue and then act on one zone (**SPLIT**) dispatch to the unit hosting that zone. Each unit
serializes its own snapshot to its own seats.

Five decisions carry the plan (each argued in its section):

| # | Decision | Rejected alternatives | Why |
|---|---|---|---|
| D1 | **THE PIN**: world-level fields are copied keeper to unit at every unit entry and copied back at exit (counters both ways, clocks in only) | (a) one-time reference alias; (b) `Object.defineProperty` accessors on the unit | (a) breaks on the runtime reassignments the census found (bounty slate 21886/22100/22147/22158/22286/22312/22334, `townPortals` 15299/15343/15347/15370, `questImbues` 25664, `nextGenId` ++ in ~20 mint sites). (b) reconfigures data properties to accessors on a ~663-property object, a likely V8 slow-mode deopt for every `this.x` in the unit's hot loop (PLAUSIBLE, unmeasured). The pin is ~40 reference copies per unit per tick and exact under the shard's single thread. |
| D2 | **THE UNIT WARDEN**: every unit World stands its own `Seat.keeper`-tagged p0, and it **shadows its unit's focus seat** | a unit without a p0 | A World cannot stand without `localSeat` (charter 3.2); THE MERCY (`updateDownedSeats` 5770), the all-down terminator guard (`concludeWipe` 5935), `stampAudiences` (`seatView.ts:50`), `noticeAudience` (53616) and the quest/gem gates (25056, 25625, 43592) all read `localSeat.keeper`. Shadowing makes the 467 `this.player` reads on this tree (the charter counted 378) (spawn placement, proximity triggers, level reads) center on a real player of that unit, as THE SHADOW already does on the wilds keeper (`shardHost.ts:626`). |
| D3 | **THE TICKET + THE HAND-OFF QUEUE** | intercepting `loadZone`; replaying the road in a proxy World | `loadZone` is the seamless lane's (charter 6.3) and the roads mutate source state before it (`caveReturn`, `caveStack`, realm contexts, `massAway`). A proxy replay would capture an empty memory row over the live source zone and pay escape XP into an empty world. |
| D4 | **THE ONE CLOCK**: each unit enters its tick at the keeper's tick-start `time` and `inputClock` | sync after the fact | `this.time += dt` runs per World (44478) and the track/soulriver poses are pure functions of `time` (agent A); a pinned start makes every unit land where the keeper landed. |
| D5 | **THE LIFT**: the three inline road scans in `update()` (mouths `onMouth` 46045, realm `gates` 46223, exits `onExit` 46386; the block opens at 46040) become named methods that the solo block and the per-seat shard scanner both call | a parallel re-implementation in a shard file | one implementation keeps drawn == dwelt; the solo block keeps its bytes, pinned by a committed road-walk digest (section 7 B). |

What M1 does NOT do (owed elsewhere, unchanged by this plan): per-seat accounts (M2), owned tenants and
a per-owner `simView` (M3), THE MANY SHADOWS inside the mass runtime (seamless lane, charter 6.6),
station lingers for remote seats (the counters wave, gap 4), the chart on the wire (charter 3.4, sketched
in 5.10), and a surface region partition (M6).

---

## 1. THE ALIAS CENSUS

`World` declares **663 instance properties** (TypeScript AST census of `class World`, this pass). Seven
classes cover them. The first five need a row in the shard table, SEAT rows carry the `seat-keyed` reason and move with the hand-off, and everything else is UNIT by default.

| Class | Rule | Mechanism |
|---|---|---|
| **ALIAS** | world-level state, one truth for the shard | THE PIN: keeper value copied onto the unit at entry, the unit's value copied back at exit when it changed |
| **COUNTER** | a shared monotonic scalar | pinned both ways (one counter, never collides) |
| **CLOCK** | the keeper owns it; units read it | pinned in at the keeper's tick-start reading, never copied back |
| **KEEPER** | private state of a keeper-only sweep | units carry an inert copy (the sweep never runs there) |
| **HOST** | published by the host into every World it runs | assigned at wake and on change |
| **SEAT** | keyed by a seat id, a `Seat` or an actor, needed by a travelling seat | moved by the hand-off (section 3.3) |
| **UNIT** | per zone (the default) | nothing; it dies with the unit |

### 1.1 ALIAS (CONFIRMED world-level)

The derivation that keeps this list honest (THE SAVE LAW): `serializeWorldState` (15555) and
`adoptWorldState` (15785) read and write exactly these fields (AST field-access census of both bodies,
this pass), plus the character-save fields that are world-level in function (`meta/character.ts:291-304`,
`:521-554`), plus the per-run once-latches a second copy would double-count.

| Field | Line | Reassigned at runtime? (why ALIAS is a pin, not a one-time reference) |
|---|---|---|
| `zoneMap` | 3027 | boot only (`adoptWorldState` 15800) |
| `caveMap` | 3033 | never |
| `visited` / `surveyed` / `discoveredWaypoints` | 4199 / 4203 / 4197 | boot only (15821-15823) |
| `zoneMemory` | 3571 | never (cleared in place) |
| `sim` (`WorldSim`) | 3143 | ctor only; `readonly` is compile-time, the pin writes through an index cast. Shareable: "nothing here reaches back into World" (`world/sim.ts:8`) |
| `activeQuests` / `completedQuests` | 4294 / 4297 | boot only |
| `questImbues` | 3752 | **yes**: `claimQuestImbue` 25664 |
| `questRewardItems` | 3751 | never (Map) |
| `completedObjectives` | 4228 | boot (`scrubStaleObjectives` 15995, `character.ts:522`) |
| `mercSheets` / `vendorHolds` | 4452 / 4573 | boot only |
| `bountyOffers` | 3661 | **yes**: `armBountyBoard` 21886, 22100; `reconcileBounties` 22147 |
| `bountyHands` | 3668 | **yes**: 22158; `abandonBounty` 22286; `turnInBounty` 22312, 22334 |
| `bountyBoardState` / `chartsBought` | 3675 / 8995 | boot only |
| `townPortals` | 3572 | **yes**: `openTownPortal` 15299; `updateTownPortals` 15343, 15347; `refreshZones` 15370 |
| `townPortalDestination` | 3573 | boot only |
| `ledger` (the run ledger) | 3204 | boot (`character.ts:521`); the class sweep reads it through `ledgerView()` |
| `throngClaimed` / `annexFound` | 4233 / 3844 | boot (`character.ts:551-554`) |
| `discoveredDimensions` / `seasSeen` / `manifestedThisRun` / `descentSpent` | 3784 / 3644 / 4475 / 3629 | never; per-run once-latches (unit copies would recount `seas_found` and re-manifest a grudge per unit) |
| `soundings` / `omenWhisperedAt` / `omenWhisperN` / `omenRevealed` | 8793 / 8984 / 8988 / 8989 | never |
| `notices` (THE NOTICE FEED) / `pickupFeed` | 2939 / 2943 | boot (`worldmass/runtime.ts:456`) |
| `accountSource` (THE KEEPER'S GATE until M2) | 4554 | ctor; `publishResumeAccount` 4673 (client resume only) |
| `massSideareaRoots` / `massCaveIds` | 3885 / 3886 | boot (`restoreMassSideareas` 3940); keeper-meaningful |
| `descentStocks` / `descentDeepest` | 3468 / 3472 | never (the Descent stays sealed in M1) |
| `theaterVisitSeq` | 3805 | never. PLAUSIBLE world-level: the per-zone visit ordinal salts the theater's keyed draws; a unit copy restarts at 1 on every wake |

`manifest` (3201) is the same frozen object by construction.

### 1.2 COUNTER and CLOCK

- **COUNTER `nextGenId`** (3028): `++` in ~20 mint sites, several reachable from a unit
  (`chartFrontier` 8090-8100 behind a `?` exit, `enterDimension` 8337, `mintCaravanRoute` 24142/24153,
  `questLocalAnchor` 25309, `acceptOdysseyCompatibleQuest` 25375, the soulriver mints 9141/9226, the
  holdfast pocket 8391, the coast stream `nativeSceneCoast.ts:177`). The charter's "sync the scalars
  each tick" lets two units mint the same `gen_<n>` in one tick; pinned both ways it is one counter.
  CONFIRMED.
- **CLOCK `time`** (4484) and **`inputClock`** (3006): `this.time += dt` runs per World (44478, after
  the timeflow gate); `inputClock += dt` per World (`applyInputs` 5406, `passInputTime` 5633) and THE
  TIME BUDGET refills from it (`walkFrames` 5608). The host records the keeper's two readings at tick
  start; each unit enters at them, so its own step lands where the keeper's did. Between ticks every
  World reads the same clocks, so `Seat.lastActedAt`/`lastMovedAt` and every absolute world-time stamp on
  a travelling body stay valid, and the pure track/soulriver poses agree. CONFIRMED.

### 1.3 KEEPER (sweep-private state; units hold inert copies)

`forechartNextAt` 8789, `mintVeil` 8788 (set and cleared only inside `updateForechart`), `omenNextAt`
8980, `webSettleNextAt` / `webSettleSeenSeq` 8756 / 8760, `classClaimNextAt` 5905, `warpSweepAcc` 9517,
`holdSweepAt` 23137, `bountyWatchAccum` 22544, `quickenSweepAcc` 3280, `deepwinterWarped` 3384 and `longNightWarped` 3392 (warp bookkeeping inside `reconcileDeepwinter`, 17063-17076, and the Long Night's warp reconcile, 18445-18458), `gloamPrevPhase` 14191 (the
`gloaming_survived` edge at 14377-14379 would bump the aliased ledger once per live unit), the four save
memos (`zonesSaveMemo` 15395, `zonesRowMemo` 15409, `memorySaveMemo` 15455, `memoryRowMemo` 15456), and
`odyssey` (4295): a `this`-bound runtime whose update never runs in a unit, so no unit mints a fresh
campaign through `this.state ??= newOdyssey` (`engine/odyssey.ts:59`).

### 1.4 HOST (published into every World the shard runs)

`shardWorld` (NEW: the link and the gate), `partyMates` 19659 and `partyRows` / `partyRev` 19661-19662
(set on the keeper alone today: `partyMates` at `shardHost.ts:308`, the rows at 705-710), `timeflow.allowHold` and
`timeflow.chronoScope` (keeper alone today, `shardHost.ts:337-338`), and the warden's flags.
`COOP_SCALING.shareRadius` is already process-global (`shardHost.ts:276`).

### 1.5 UNIT, and the false positives the shape detector raises

A shape detector (Map/Set/Record keyed by string, section 7 A) flags **104** World fields. About 60 are
UNIT and carry a row with a reason from a closed vocabulary, so the census stays readable:

- `per-visit` (reset by the zone-runtime registry on every load, `nativeSceneRuntimeRegistry.ts:126-400`):
  the ~30 `materialized*` sets, `wbWalls`, `stationArmed`.
- `zone-local`: `openedHollows`, `annexOpen`, `lures`, `theaterPour`, `vendorArmedBeat` 4563 (the
  foreordained shelf re-deals the same stock per unit), `holdMissingWarned`, `crossDimWarned`,
  `brittleWarnAt`, `engageTokens`.
- `memo`: `soulriverLaneMemo`, `grantedPocketCache`, `pathProfiles`, `terrainDrainScratch`, `liteKindIdxMap`.
- `seat-keyed`: the SEAT rows (section 3.3), moved or dropped by the hand-off.
- `warden-only` (reads `localSeat`, inert on a warden): `stashedCompanions` 3726, `kills` 4479 (the
  objective latch's delta 57198 and the local run summary `main.ts:2231`).

UNSURE, named for the builder: `questRewardItems` (ALIAS is safe; the reward menu is the counters
wave's), `theaterVisitSeq` (ALIAS above), `hiredMercs` 4463 (no shard can hire until M2, gap 14; a merc
seat that stands should travel with its patron).

### 1.6 The sweeps: keeper only, per unit, and SPLIT (`update()` opens at 44428)

The charter's six (`sim.update` 44587, `updateForechart` 44592, `updateWebSettle` 44596, `updateOmens`
44598, `updateDeedRecovery` 44600, `sweepClassClaims` 44601) are necessary but not sufficient.
CONFIRMED by a full classification of every call in `update()` (agent A, spot-checked here):

**THE PRIMARY GATE (W1, `shardWorld?.role === 'unit'` skips):**
- Block A, 44585-44604: `feedMyceliaActivity`, `sim.update`, `odyssey.update`, `updateForechart`,
  `updateWebSettle`, `updateOmens`, `updateDeedRecovery` (reads `this.player.life` 5901, inert on any
  warden; its honest home is per seat, owed), `sweepClassClaims`, `drainMyceliaLedger`,
  `reconcileDeepwinter`. Keep per unit: `questRescues.update` 44589 and `updateContagionInfection` 44603.
- Block B, 44634-44893: the `collectBulletins` drain, the deadwake `consumedZones` bridge (44646), the
  swarming predation and roost warps (44664), the demon mint drains (44698, `placeZoneAt` +
  `nextGenId++`), the conclave ignition (44761), the incursion mint drains (44770), the warp sweep
  (44803), the floating-zone connect (44876). Keep per unit: `updateWarbandMarches` 44687,
  `syncZoneExits` 44895, `materializeLiveZoneEvents` 44900.

Safe in W1 even before the SPLIT fixes: the keeper ticks first, so it drains every queue before a unit
looks; a unit only misses effects that belong to its zone (the next item). Two exceptions belong in W1, not W3: `updateHarborholds` (44539, in the station block) joins THE PRIMARY GATE, because a per-unit sweep on its own `holdSweepAt` could fell a hold whose muster runs in another World (its "muster paused" belt, 23604, reads only its own `holdDefense`; W3 then points the belt at the hosting unit); and until W3 the `gloaming_survived` edge may bump once per awake unit (a double count, never a crash).

**THE SPLIT DISPATCH (W3).** A new one-line idiom, `this.atZone(zoneId, w => ...)`: solo and co-op it is
`if (zoneId === this.zone.id) fn(this)`, byte-identical to the conditionals it replaces; on a shard the
registry runs `fn` on the unit hosting `zoneId` (under its pin) or drops it when none is awake.

| Sweep | Line | Keeper does | Dispatched per zone |
|---|---|---|---|
| warband arrivals | 44683 | drain `sim.invasion.arrivals` once | `spawnWarband(host)` where `zone.id === host.targetZoneId` |
| `watchBountyHands` | 22545 | the 2 s reconcile (reassigns the slate world-wide) | nothing; units skip it (else N reconciles and N notices) |
| `updateHarborholds` | 23568 | the lifecycle sweep over `zoneMap` | dress, services, gate reseal, the overrun text; the "muster paused" belt (23604) must ask the hosting unit's `holdDefense` |
| `updateDeadwakeStream` | 17121 | `drainEbbed()` (17127) | the ebb notice to every unit within `surge().radius` |
| `updateHauntStream` | 17167 | `drainDissipated()` (17173) | `dissipateHauntSpawns` in `gone.zoneId` |
| `updateWorldBosses` | 18912 | `pendingMints()` drain (18916) | walls, passing, fight sync stay per unit |
| `updateLongNight` | 18335 | the blood-moon sky feed `markBloodmoon` (18339-18349; it sets an idempotent flag, `packages/overlays/longNight.ts:288-291`, so a per-unit repeat is harmless) and `consumeAnnouncements` | `groundOn(zone.id)`, the coach, the pour |
| `updateQuickening` | 17885 | the 0.5 s reconcile (writes `z.level`, `z.quickened`, `zoneMemory.delete`) | materialize, pulse, echo |
| `updateGloaming` | 14347 | the `gloaming_survived` edge (14377) | everything else |
| `feedMyceliaActivity` | 17006 | builds the activity map and calls `setEventActivity` once | each unit adds its zone's `theaterRuns + encounters` term |
| `collectBulletins` | 44635 | drains once | routes each line to seats (hellWar reads `zone.dimension`, faction lines read `visited`) |

**THE OCCUPIED LAW (W3, multi-presence `simView`).** `nativeSimView` (`engine/nativePopulationResolution.ts:36-58`)
reports one `currentZoneId`, one `census`, one `charLevel` (the keeper's). Add `presentZoneIds` and
`censusByZone` (every awake unit) beside them, keep `currentZoneId` the keeper's for the ~49 owner-centric
reads (hunt.ts alone reads it 22 times; those are M3's), and re-aim only the readers whose job is "never
act on ground a player stands in": `world/invasion.ts:106` (warband pump throttle), `packages/overlays/deadwake.ts:770`
(never consume the player's zone), `world/faction.ts:268-318` (live-census diffusion),
`packages/overlays/contagion.ts:824` (patient zero), `packages/overlays/conclave.ts:277` (targeting).
Many origins for the keeper sweeps that read "where the player is": the forechart halo (`origin = this.zone.map`,
8854) round-robins over occupied zones, `updateOmens` (`here`, 9003), the floating-zone proximity (44882), the
conclave ignite level (`max(this.zone.level, this.player.level)`, 44763).

---

## 2. THE UNIT REGISTRY (host side)

New file `server/simUnits.ts` (Node side, owned whole by W1). Engine-side helpers live in a new
`src/engine/shardUnits.ts` (browser-safe, no node imports, so the table is shared by the probe and
the census).

```ts
export const UNIT_CFG = {
  unitLinger: 30,      // world s a seatless unit stays awake (card 10 named it, never valued)
  maxUnits: 32,        // soft cap: past it the longest-seatless unit sleeps at once, never a refusal
  arrivalGraceSec: 3,  // THE SPAWN GRACE at a hand-off arrival (the join keeps spawnGraceSec 20)
};
type UnitKey = string;  // 'keeper' | zoneId | `${zoneId}#${instance}` (instance = party id, card 25 B)
interface SimUnit {
  key: UnitKey; world: World; role: 'keeper' | 'unit'; instance?: string;
  emptySince: number | null;                               // THE LINGER's clock (world time)
  lastSentZone: string; lastSentDoodadRev: number; dressTimer: number;   // moved off ShardHost
  focusId: string | null;                                  // THE UNIT SHADOW's hysteresis
}
class UnitRegistry {
  readonly keeper: SimUnit;
  worldOf(seatId): World | undefined;  unitOf(seatId): SimUnit | undefined;
  allSeats(): Seat[];                  // every non-warden seat, every unit (the desks read this)
  each(): SimUnit[];                   // keeper first, then by key: a deterministic tick order
  run<T>(u, fn: (w: World) => T): T;   // THE PIN around every entry into a unit
  unitFor(zoneId, instance?): SimUnit | undefined;   // THE HEARTH ALIAS + THE WILDS LAW
  enqueue(t: RoadTicket): void;  drain(): void;      // THE HAND-OFF QUEUE
  wake(t: RoadTicket): SimUnit;  sleep(u): void;  sweep(now: number): void;
}
```

**THE SEAT LEDGER.** `seatUnit: Map<seatId, UnitKey>` is the one answer to "where is this seat"; a join
lands in the keeper (THE HEARTH WAKE, `shardHost.ts:395-416`), a hand-off moves the row, a leave
deletes it. `worldOf` replaces every `this.world.seats.find(...)` in the host and the desks.

**THE HEARTH ALIAS and THE WILDS LAW** (`unitFor`). Classic: the keeper hosts whatever zone it stands
in (the hearth, `START_ZONE`; a probe that calls `w.loadZone(FLOOR)` on the keeper,
`balance/probe_shardinput.ts:147`, moves the keeper unit, as M0 does). Wilds (`keeper.world.massRuntime`):
`MASS_ZONE`, `START_ZONE` and every `zoneMap` id resolve to the keeper (the surface), and only
`caveMap` ids wake units. CONFIRMED necessity: `zoneMap[MASS_ZONE]` exists (`worldmass/runtime.ts:381`)
and a pocket World's `loadZone(MASS_ZONE)` has no runtime, so it would classic-generate the boundless
surface; the climb-out (`travelThrough` 47902-47919) and the town portal (`updateTownPortals` 15353)
must therefore land in the keeper, never in a unit.

**THE WAKE** (a ticket whose destination has no unit):
1. `World.staged(makeAccount(), keeper.manifest)` (4662): staged restores the keeper as the global
   policy owner (bag board, container boards, route guard, `World.policyOwner`, 4635-4660; the WorldSim
   geography owner re-binds the same seeds, `world/sim.ts:323-347`). The **throwaway account** keeps the
   constructor's reliquary rebuild (4609) and relic migration (4610) off the shard account. PLAUSIBLE
   cost: one throwaway `WorldSim` per wake (4612); a later ctor option `{ sim }` can skip it once measured.
2. `w.createPlayer(wardenClass, { name, startingCompanions: false, startingFlasks: false, load: false })`.
   NEW one-line seam at 4776 (`if (opts?.load !== false) this.loadZone(START_ZONE)`): the warden stands
   without generating Lastlight in a pocket World. Under the throwaway account, `restoreAccountRelics`
   (43059) binds an empty board; under the shard's it would seat the shard's relic objects in a second seat.
3. Warden flags (host, re-worn every tick by THE WARDEN STANDS, `shardHost.ts:537`): `keeper`,
   untargetable, passive, invulnerable, **levitates** (NEW host-side: keeps it out of
   `groundFallEligible` 47463 and the pit confine, so `routeSkyFalls` 47494 and `routePitFall` 47748,
   which travel only `this.player`, never fire off a warden), `lastActedAt = time` (THE SEALED ROADS).
4. HOST publishes: `timeflow.allowHold = () => false`, `timeflow.chronoScope`, `partyMates`, `partyRows`,
   `shardWorld = { role: 'unit', key, registry hooks }`.
5. THE PIN in, at the keeper's current clocks.
6. THE WAKE CONTEXT through the shard host view: `adoptedZonePending = true` (CONFIRMED necessity:
   `captureZoneMemory` 15227 would otherwise snapshot the placeholder town into the shared
   `zoneMemory`, because `rememberSafeZones` is true, `engine/zonecontents.ts:13`, and `visited` holds the
   hearth), then the ticket's ladder (`caveReturn` / `caveStack`), realm context and `entryFrom`.
7. `w.loadZone(ticket.dest, ticket.from)`, then `ticket.onFirstWake?.(w)` (realm bosses, W4), THE PIN out.

**THE SLEEP** (`emptySince + unitLinger` passed; never the keeper; never while a dormant or downed seat
stands in it): under the pin, NEW `sleepZone()` runs the departure's leave verbs in loadZone's order
(`scanNemesisSurvivors` then `captureZoneMemory`, 6294-6297: the zone memory row, the conclave incubate,
the grudge scan), the pin copies out, the unit drops. An instanced unit skips the capture (THE INSTANCE
FORGETS, section 4.7). Nothing else is owed: the constructor registers nothing global beyond the policies `staged` hands back (4606-4632), and a World runs no timers of its own (PLAUSIBLE beyond the constructor).

**THE UNIT SHADOW.** A unit's warden stands on its unit's focus seat each tick (`focusSeat`'s rule,
`shardHost.ts:731-744`, per unit, offset 0): the `this.player` reads that are not roads (spawn
"far from the player", proximity triggers, the `text(this.player.pos)` floats, `enemiesOf(this.player)`)
center on a real player of that unit. The keeper keeps today's law (parked at the classic hearth; THE
SHADOW on the wilds). THE WARDEN STANDS also mirrors levels: the keeper takes the highest standing level
**shard-wide** (`simView.charLevel` gates the packages, `nativePopulationResolution.ts:43`), a unit the
highest **in that unit** (its mints, `mintSidezone`'s `playerLevel` 47328, its spawns).

**THE TICK ORDER** (replaces `ShardHost.tick`, `shardHost.ts:552-621`):

```
tick(dt):
  if resuming: return                                   // THE RESUME LAW, unchanged
  T0, IC0 = keeper.time, keeper.inputClock              // THE ONE CLOCK's reading
  inputs = net.drainInputs(); endGraces(inputs)         // one drain; a World reads only its own seats' rows (5407-5409)
  for u in registry.each():                             // the keeper first: it drains every world queue first
    registry.run(u, w => {                              // THE PIN in (clocks at T0/IC0) ... out in a finally
      wardenStand(u)                                    // per unit; the keeper mirrors the shard-wide max level
      u.role == 'keeper' && worldmass ? shadowFocus() : unitShadow(u)
      w.applyInputs(inputs, dt); drainMetaActions(u)    // only the actions whose seat lives here
      for a in w.actors: updateAI(a, w, dt)
      w.update(dt)                                      // units skip THE PRIMARY GATE's blocks
      w.settleNearScale()
    })                                                  // a throw here faults this unit alone (THE UNIT BREAKER)
  registry.drain()                                      // THE HAND-OFF QUEUE: roads, intents, the muster
  parties.sweep(); publishParties() into every unit
  vessels.tick(dt); corpses.tick(dt); sweepDormancy()   // the desks read worldOf / allSeats
  for u in registry.each(): wire(u)                     // 5.1-5.3: zone and dress per unit, one snapTick a beat
  persist beat (THE PERSIST CAPTURE first); registry.sweep(keeper.time)   // THE LINGER
```

`passInputTime` (the pump's stall credit, `shardHost.ts:760`) credits the keeper alone; every unit
inherits it through IC0. The charter's `SimUnit` surface (`world`, `zoneId`, `seats`, `lastSeatAt`,
`tick(dt)`, `snapshotFor(seat)`) maps as: `zoneId` = the live `world.zone.id`, `seats` = the non-warden
seats, `lastSeatAt` = `emptySince`, `tick` = one pass of the loop above, `snapshotFor(seat)` = the unit's
snapshot through THE OWN ENTRY's per-socket view (`ownEntryView`, `snapshot.ts:1338`). That is also the
one interface the shard owes the seamless lane (charter 6.5: wake, sleep, attach, detach, snapshot).

---

## 3. THE HAND-OFF

### 3.1 The ticket and the queue

```ts
interface RoadTicket {
  seatId: string;
  dest: string;                       // a zoneMap or caveMap id (unitFor resolves the unit)
  from?: string;                      // the arrival edge: loadZone's back-portal rule (6452-6457)
  instance?: string;                  // card 25 B (section 4.7)
  ladder?: { caveReturn: CaveRung | null; caveStack: CaveRung[] };   // pockets: the way home
  context?: RealmContext;             // realm arenas (W4)
  landing?: { at: Vec2; spread?: number; band?: [number, number]; tier?: number } | 'entry';
  grace?: 'caveExit';                 // the per-seat re-descent grace (travelThrough 47935)
  onFirstWake?: (w: World) => void;   // the realm boss, wards, crowd (enterRealmArena 16564-16577)
  muster?: { party: string; at: Vec2 };   // THE MUSTER RING (section 4.6)
}
```

Roads, intents and the muster **enqueue**; the host **drains after every unit ticked** (THE HAND-OFF
QUEUE). In the single World a road returns out of `update()` because "everything else this frame belongs
to the old zone" (46110, 46302, 46423); a unit must finish its frame for the seats that stay, and no World
may be mutated from inside another World's `update`.

### 3.2 THE CARRY SET

Today (`loadZone` 6441-6443, mirrored by `landPartyAt`, `nativeSceneHarbor.ts:360-364`): every seat body
plus every actor whose **direct** owner is a seat body, alive and not a construct, after
`seatEject(s, 'travel')` (6287) and after the controllers' `clearAll()` (6272-6280). One hop only, while
credit walks the whole chain (`seatOfRoot` 19651) and commands walk 8 hops (`Actor.ownedBy`,
`actor.ts:2259`). On the wilds keeper `loadZone` returns at 6258-6262 before the filter, so the filter is
the classic lane's reference. CONFIRMED.

**M1 rule:** the ejected hero, plus every `a.ownedBy(hero) && !a.dead && !a.construct`, plus (once M2 can
hire) the merc seats whose patron is this seat (merc ids `m${mi}` are minted per World, 24498-24501, and
would collide in B: re-key on attach). Everything else whose chain roots at the hero is **culled in the
source** (constructs, second-hop leftovers): in the single World they vanished with the zone; in a unit
they would keep living with an owner in another World. CONFIRMED kinds (agent B): companions travel
(`owner = keeper`, 27078); actor-tier throng travels (`character.ts:331`); **lite-tier throng is
re-spawned, never moved** (pool rows hold owner ids; `bootLite` re-seats them,
`nativeSceneEcology.ts:148-153, 222-236`); a held body never builds a dwell (`isQuiescent` under THE DWELL LAW, 5099-5102) and the portal refuses it (15268); mounts travel only when
both bodies are owned; satellites, auroras, guardians, creepers rebuild from the sheet. Actor ids are one
process counter (`actor.ts:515, 532`), so every id-keyed row moves verbatim.

### 3.3 THE SEAT PACKET (agent B's census, spot-checked)

| Verdict | Rows (World line) |
|---|---|
| **MOVE** (out of A, deleted in A) | `lastInputSeq` 2997 (the ack, `snapshot.ts:1510`); `spentPresses` 5546 (else a press a gate spent in A fires a cast in B); `seatKillTally` 53623 (the fall's reckoning, `vessel.ts:565`); `CompanionBonds.states` (`companionBonds.ts:53`; re-adopting in B would capture the already-modified `native` skills and `baseRadius`, 65-69); `companionGrants` 52867 (without its row B mints a duplicate follower); `replenishment` 52878; `strikeReleaseBodies` 52824; `wornThrongInsts` 27986; `treeBuffSources` 52879; the seat's `townPortals` row and `townPortalArrival` 3576; `traceRests` 21638; `pendingTreePips` 3702; `chillTimers` / `douseTimers` / `gazeTimers` 49398 / 49148 / 49485 |
| **DROP** (purge the seat's rows in A) | `metaDirty` 2990 (then `markMetaDirty` in B); `moveBudget` 3003 (a fresh row at `graceSec` costs nothing; a hand-off follows an idle dwell); `seatHud` / `seatNoteAt` 53583-53584; `speechFocus` 21166; `pingClocks` 19691 (a ping is a point in A's zone: pings stay unit-local); harvest and trace sessions; `dotAccum`; `comboCursors`; the lite maps; `engageTokens`, `ringClaims`, `losMemo` (prune the leaver's ids); `skillInputOrder`; `pendingRespawns` rows of carried casters (loadZone drops them too, 6392: parity) |
| **REBUILD** | `seatByActor` (`indexSeats` in both); `Party.members` and `rescaleEnemies` through `party/leave` and `party/join` (4625-4626), then `settleNearScale(true)` in both; `relocationHosts` and `hivecallHooks` heal themselves |

### 3.4 `detachSeat(A, seatId)`, in this order (in A, under A's pin)

1. Refuse a held seat, or one mid-harvest or mid-trace (the road's dwell already refused a downed or
   pushed body). `seatEject(seat, 'travel')` when `seat.home` (a carried husk is re-pushed, 5197-5200).
2. **Teardown on absence, now.** CONFIRMED hazard: these controllers clean up when an actor goes missing
   from A's `actors`, by mutating the departed actor, which by then lives in B. `CompanionBonds.refresh`
   (`companionBonds.ts:171-176`) is avoided by MOVING the bond state out first (a new
   `exportBond`/`importBond` pair on `CompanionBonds`); `Assaults`, `Challenges`, `AttackSequences` and
   `GuardArts` clear the hero's chain now (their sheet keys come from per-World counters,
   `guardArts:${inst.def.id}:${nextSource++}`, `guardArts.ts:46`, so A's late clear could delete B's live
   layer under the same key); satellites, auroras, guardians, creepers retire.
3. Compute the carry set; cull the rest of the chain (`releaseContract(a, false)` then `kill(a, true)`).
4. Purge every projectile, zone (through `expireZone` 55664: it refunds a toggled field's reservation and
   strips `domainAffected`), tether and `pending*` row whose caster or owner is carried.
5. Strip the cross-World leaks: domain sources (`domain:${this.domainSeq++}`, 32598, a per-World counter),
   aura sources (`aura:<skill>:<bearerId>`, stripped only by the bearer's own sweep, 48503-48506), altar
   sources; release grabs; clear `aiTargetId`/`aiTargetRef` on A's actors aimed at a carried id (the fast
   path, `ai.ts:1761-1765`, never checks membership); the leaver's id out of A seats' `reviveDwellBy`.
6. Extract the MOVE rows into the packet; free the lite rows into `{ defId, plies }` respawn rows.
7. Splice the seat and the carry set out of `seats` and `actors`, `indexSeats`, emit `party/leave`,
   `settleNearScale(true)`. Never `removeSeat` (4815): it culls the whole court.

### 3.5 `attachSeat(B, packet, landing)`, in this order (in B, under B's pin)

1. The clocks already agree (THE ONE CLOCK); nothing to rebase.
2. loadZone's per-actor door reset on every carried body (the cue arrays 6379-6382, THE BLINK LAW
   6476-6511: `dash`, `casting`, `push`, `endCarom`, `frameLockRect`, `tier`, `onTierLink`,
   `aiTierGoal`), `markPos` on the seat's `knownSkills` **and** `grantedInsts` (loadZone clears only the
   local meta's, 6447-6449), and the retinue's AI refs and `aiCommand`.
3. Re-bind `statusRelay = B.relayStatus` on every carried actor (minions carry A's closure,
   `nativeMonsterFactory.ts:96`; the hero is rebound by `recalcSeat`, 19268).
4. Push the seat and actors, `indexSeats`, then land them through **THE FILTERED HOST**: NEW public
   `World.landSeatAt(seat, carry, at, opts)` calls `harborLandPartyAt` (`nativeSceneHarbor.ts:324`) with the
   cached harbor view (10186) overridden to `player = hero, seats = [seat], actors = carry`, so the one
   landing law (the story-aware clamp, the trail break, the tier seat, `landMovementTether`) lands one seat
   and its court, and the seamless lane's file stays untouched. `landing: 'entry'` applies loadZone's
   back-portal rule (6452-6457) to B's live `exits`.
5. Install the MOVE rows, then `recalcSeat(seat)` (grants re-derive, `guardArts.sync`, 19638); sync the
   retinue; re-spawn the lite rows with B's `liteKindOf`.
6. `markMetaDirty(seat)`, emit `party/join`, `settleNearScale(true)`, then **THE SPAWN GRACE**:
   untargetable until the first willed input or `arrivalGraceSec`, on the host's existing `graces` map
   (`shardHost.ts:237, 713-725`). Never the gift paths (`grantStartingCompanions`, `dealVeteranFlasks`),
   never `fillResources`: a hand-off is the same body walking on.
7. The host moves THE SEAT LEDGER row and sends `sendZoneTo(seat, serializeZone(B))` at once. The client
   needs nothing new: the zone message is its standing lane (`main.ts:2419`; a wilds shell drops or
   re-attaches its runtime by the pocket law, `net/wildsClient.ts:68-79`), its prediction history resets on
   the new zone id (`main.ts:2385`), and from the next beat it hears B's snapshots alone (section 5).

### 3.6 The desks per unit (the host keeps one desk each; every `this.world` read becomes `worldOf(seat)`)

| Desk | CONFIRMED single-World reads | M1 |
|---|---|---|
| **VesselDesk** (`server/vessel.ts`) | `serialize` 368: `w.actors` companions + `throngRowsOf(w, hero)` + `serializeCouchGuest(w, ...)` read the keeper, so a vessel in a pocket would mirror home **without its companions**; `placeOf` 462 reads `this.world.zone.id` (it fills `rec.places`, the reckoning's zone count, 565); `fall` 561 records `w.zone`, `w.inCave`, `w.seatKills`; `endFall` 618 calls `w.removeSeat`; `couldKneel` 519 compares hero positions across seats | constructor takes `{ worldOf, allSeats }`; places, the fall (zone, map coordinate, `inCave`: no corpse in a pocket, the corpse run's own law), the kill tally (moved with the seat, 3.3) and `endFall` all read the seat's unit; THE GROUP LAW's kneel needs a mate **in the same unit** within the near radius (positions in two Worlds are not comparable) |
| **ShardCorpses** (`server/corpses.ts`) | `stand` 310 reads `w.zone` and `w.clampPos`; `tick` 325 says "M0: every seat stands in the one live zone"; `dwell` 343 reads `w.seatIdle`, `w.dwellReachable`, `w.storyPair`; `reclaim` 360 writes `w.flashes`, `w.dropGearAt`, `w.pickupFeed` | each seat's bodies stand in the seat's unit and re-stand on a hand-off (the `sb.zoneId !== zone.id` test already re-stands on a zone change); `liesIn` 300 keeps reading the aliased `zoneMap` |
| **PartyDesk** (`server/party.ts`) | the `seated` predicate reads `this.world.seats` (`shardHost.ts:307`) | reads `allSeats()`; `partyRows` published into every unit on a rev change and at wake |
| **THE DORMANT SEAT** (`shardHost.ts:426-460`) | `onDormant`/`sweepDormancy` read `this.world.seats`; `onResume` ships `serializeZone(this.world)` | a dormant body is a seat, so its unit never sleeps under it; resume ships the seat's unit's zone; release runs `removeSeat` in the seat's unit |
| **THE DEATH COVENANT across units** | THE MERCY revives by the warden's clock (`updateDownedSeats` 5770-5783) | per unit by construction (every unit has a keeper-tagged warden); the covenant (`VesselDesk.tick` 474) iterates `allSeats()` and judges each seat in its own unit |
| **cosmetics, rejoin, drainMetaActions** (`shardHost.ts:463-516`) | `this.world.seats.find` | `worldOf(from)`; an action applies inside its seat's unit under the pin; a `rejoin` still re-seats at the hearth |

---

## 4. THE ROADS PER PLAYER

### 4.1 Why every road is shut today, and THE LIFT

The road block of `update()` opens at 46040 (`if (!this.player.dead && !this.player.downed &&
!this.traversal)`) and reads only `this.player`: the mouth test `onMouth` (46045-46066) and its dwell
(46090: `this.playerIdle() && !this.player.push`), the realm gates (46287-46303), the ward seals
(46311-46324), the holdfast ring (46333-46349) and the exits (46386-46426). `playerIdle()` is
`seatIdle(this.localSeat)` (20665), and THE WARDEN STANDS stamps the keeper's `lastActedAt` every tick
(`shardHost.ts:544`), so on a shard no road ever builds (THE SEALED ROADS). CONFIRMED.

THE LIFT (W2): the three inline scans become private methods, called by the solo block with
`this.player` (same order, same draws, same bytes) and by the shard scanner with each seat's body:
`mouthUnder(a)` (46045-46081), `realmGates()` (46223-46286) plus `gateUnder(a, gates)` (46287-46293),
`exitUnder(a, from)` (46386-46396), `wardSealUnder(a)` and `holdfastNear(a)`. The solo block keeps its
fields (`exitDwellIdx`, `caveDwellIdx`, `realmDwellKey`, ...) and its views (`dwellRingsView` 46642).

THE SHARD SCANNER (NEW `src/engine/shardRoads.ts`, one gated call at the end of the road block): for each
standing non-keeper seat, one dwell at a time in a per-seat map `{ key, kind, pos, start }`, built only
while `!dead && !downed && !push && seatIdle(seat)`, reset when the seat steps off or acts; the per-seat
**caveExit grace** (a set of seat ids, set by `ticket.grace` at arrival, cleared when the seat stands on
no mouth); the refusal reads (the conditioned door and the sealed mouth, 46074-46088; the locked exit's
hint, 46396-46414) become the seat's own note row (`failNote` 53647 into `SeatW.fn`, THE ACTING SEAT),
never a world float. A completed dwell builds a ticket (4.2) and enqueues it. One more gate: a unit's warden stands on its focus seat (THE UNIT SHADOW), so the solo block's two world-text refusals (46074-46088, 46396-46414) would float for it; W2 turns them off on a shard (the scanner speaks them per seat instead).

### 4.2 The road catalog

| Road | Decision point | Source half (the ticket maker) | Destination and landing | Wave |
|---|---|---|---|---|
| Exit to a charted zone | `onExit` 46386 then `travelThrough` 47895 then `loadZone(dest, this.zone.id)` 47980 | THE RETREAT LAW (4.3); the escape credit (47977-47991) judged with the seat's own door and paid to the seat's party in the source | `unitFor(dest)`, `landing: 'entry'`, `from` = the source zone | W2 |
| Exit to a `?` frontier | 47963-47974 | `chartFrontier` runs in the source (the pin carries the `zoneMap` write and `nextGenId`), `def.to = gen.id` | as above | W2 |
| Cave climb-out | 47902-47936 (`caveReturn` popped off the ladder) | dest `ret.zoneId`, `from` `ret.entryFrom`, ladder `{ caveReturn: caveStack.pop() ?? null, caveStack }`, landing at the mouth by the indoor and sunken rules (47927-47934), `grace: 'caveExit'` | the parent unit (awake: attach; asleep: wake with the ladder) | W2 |
| Span far mouth | 47946-47960 | dest `e.to`; the landing is the far zone's own span mouth, resolved in the destination after its load (`caveEntrances.find(underSpan)`) | the far surface unit | W2 |
| Wilds pocket climb-out | 47896-47898 (`resumeMassSurface`) | dest `MASS_ZONE`, landing at the mouth (`caveStack[0] ?? caveReturn`, the 3964-3966 rule), grace | the keeper (THE WILDS LAW) | W2 |
| Cave mouth, classic | `onMouth` 46090-46110 then `enterSidezone` 47336 | `mintSidezone` (47305) in the source; a `levelWith: 'character'` pocket takes the **traveller's** level, not the warden's (47354); `applySidezoneFurnish` 47351; `ledgerOnEnter` 47357; ladder push (47361-47363) | the pocket unit (`tenancy`, 4.7), `landing: 'entry'` | W2 |
| Cave mouth, wilds native | the keeper's `caveEntrances` (`setMassEntrances` 3887) | `mintMassSidearea` (3896) in the keeper (it needs the mass walk and `massSideareaRoots`); ladder `{ zoneId: MASS_ZONE, pos: mouth }` | the pocket unit | W2 |
| Traversal mouths (geyser, chasm arch) | 46099-46108, 46241-46247 | the cinematic owns `this.player` (`updateTraversal` 47388), so on a shard the road takes the instant step | as the plain mouth | W2 |
| Town portal, out | the HUD's `townPortal` intent (sealed today, `shardHost.ts:510`) then `castTownPortal` 15282, `openTownPortal` 15290, the per-seat dwell in `updateTownPortals` 15322-15337 (already seat-scoped) then `loadZone(p.destination)` 15353 | a shard branch at 15340-15359 enqueues instead of loading and does **not** return true (the unit's other seats keep their frame). `openTownPortal` reads `serializeWorldState().player` (15292) for one spot: on the wilds keeper that is 150-200 ms (charter 6.6); a `spotOf(seat)` seam is cheap | THE HEARTH ALIAS, landing `findFreeSpot(waypointPos + arrivalOffset)` computed in the destination (15354-15356) | W2 |
| Town portal, back | 15340-15351 (`resumeSpawn('exact', p.origin)`) | dest `origin.cave?.zoneId ?? origin.zoneId`, the ladder from `origin.cave.rungs` (the `restoreMassSideareas` precedent, 3946-3949); the faded check (15342: `zoneMemory.get(source)?.seed !== p.sourceSeed`) must read the **live unit's** seed while the source is awake (its stored row is stale or absent until it sleeps) | the source unit at the portal spot, `tier: p.originTier` | W2 |
| Caravan | `caravanTo` intent (sealed, `shardHost.ts:510`) then `startCaravan` 24165 then `loadZone(destId, this.zone.id)` 24172 | `mintCaravanRoute` (24142-24158) in the source | `unitFor(destId)` (band 0 = the hearth), `landing: 'entry'` | W2 plumbing; reachable once the caravanner answers remote seats (`updateCaravan` reads `localHumanSeats()`, 24093, 5033: the counters wave) |
| Waypoint | the map panel calls `travelToWaypoint` directly (`ui/panels.ts:9279`, no client gate; `travelToWaypoint` 47229 then `loadZone` 47262) | NEW `MetaAction { t: 'waypoint', zoneId }` (`net/intent.ts` + its validator) and a client lane in `travelToWaypoint`; the host judges the attuned set and the "hunted" check (47257-47261) per seat | the waypoint's unit, landing at the waypoint with the `WAYPOINT_CLEAR` bubble (47263-47285) | W2 plumbing; reachable once the chart rides the wire (a shard client's map is its own, charter 3.4) |
| Realm gates (demon rift, crusade sanctum, necropolis, fracture rift, court door, dimension arch, breach) | `realmGates()` 46223-46286, `onGate.enter()` 46301 | per-gate prep in the source: the overlay binds (`bindNecropolisZone` 19139, `markSanctumMinted` 19186), consuming the source's portal list (19141), the realm context, the arena mint into `caveMap` (16543-16561), the dimension gate mint (8315-8357); `onFirstWake` runs the boss, wards and crowd (16564-16577) in the realm unit once | the realm unit (shared; instanced by the arena's tenancy flag), `landing: 'entry'` | W4 |
| Ward seal, holdfast toll | 46307-46349 | not travel: per-seat dwells (`wardSealUnder`, `holdfastNear`) acting in the same unit | none | W2 (same lift) |
| Sail, the voyage, the Wraithsail, the Descent | the dock dwell `updateSail` 23030; `enterSailing` 23755; `beginWraithsailBoarding` 23906; the shaft `updateDelver` 13747 then `descend` 13674 | **SEALED on a shard in M1**: each owns a per-World singleton run (`voyage` 3766, `descentRun` 3463, `wraithsailSeaStash` 3771) and a streamed single-player zone. The scanner answers a seat idle at the dock or the shaft with its note row, once per approach (4.8) | none | W2 (the words) |
| Skyfall, pit fall | `routeSkyFalls` 47488, `routePitFall` 47746 | only `this.player` falls through to a zone below; every seat scrambles to standing ground (47497-47501, 47765-47770); the warden levitates. Unchanged in M1 | none | none |
| Mode fall and respawn | `beginModeFall` 6043, `performModeRespawn` 6144 | a shard's deaths belong to the covenant and the mercy; `concludeWipe` returns for a keeper (5935) | none | none |

### 4.3 THE RETREAT LAW, per seat (CONFIRMED gap)

`isExitLocked` (47186) ends `objectiveSeals(this.zone.objective) && e.to !== this.entryFrom` (47222):
the one free road out of a sealing zone is the unit's single `entryFrom`, the first arriver's. A second
seat that came in by another exit would stand sealed until the objective falls. W2: `isExitLocked(e,
from = this.entryFrom)`; the scanner passes **THE SEAT'S DOOR** (a per-unit `Map<seatId, string | null>`
written at attach from `ticket.from`, deleted at detach). The escape credit
(`escapeExitAllowed(this.zone.objective, this.entryFrom, dest)`, 47977) reads the same door, and its XP
(`grantXp(bonus)` 47984) pays the traveller's party within reach (`grantXp(amount, at, to)`, THE KILLER'S
DUE) in the source unit before the hand-off. `completedObjectives.add` stays world-level, as today.

### 4.4 The intents re-opened (`shardHost.ts:510`)

`townPortal`: `castTownPortal(seat)` in the seat's unit; the dwell's shard branch enqueues (4.2).
`caravanTo`: `startCaravan`'s shard branch (24165) mints in the source and enqueues; the keeper checks
at 24167 (`this.player.dead ...`) read the warden and stay harmless. Both intents stay host-judged inside
the seat's unit under its pin.

### 4.5 THE HEARTH ALIAS in road terms

Every ticket whose destination is the hearth (a town portal, caravan band 0, `START_ZONE`) lands in the
keeper; on the wilds every surface destination does (section 2). The town portal's landing reads the
keeper's `waypointPos` (classic) or `hearthSeat()` (`shardHost.ts:674`, the wilds settlement's spawn).

### 4.6 THE MUSTER RING (card 15 B: a party's road waits for the party; independents travel alone)

- **Raised** when the leader's road completes while at least one other party mate stands, undowned, in
  the **same unit** (card 23: "a leader only for kicks and the muster"). A non-leader's road takes that
  seat alone (free movement, card 8 A). Card to confirm: `who: 'leader' | 'any'`.
- **The ring** stands at the road's own position (the exit, the mouth, the gate) for `waitSec`. It fires
  the moment every same-unit standing mate stands inside it (at once if they already do), or at the timer
  with whoever stands inside it; mates elsewhere stay where they are, downed mates never block, mates in
  other units are not waited for. It lapses when its raiser steps out and nobody stands in it.
- **The fire**: one ticket per member (same destination, the landing spread per member, one instance key
  = the party id), drained the same tick, so the party arrives together.
- **Show, don't tell**: a ground ring whose fill is the gathered share and whose rim closes with the time
  left, gold for the party, faint for a stranger; no caption (section 5.6, the `mu` row).
- **Where**: NEW `server/muster.ts` (`MusterDesk`, the party desk's sibling; the party is the host's
  data) holds the rings and judges them each tick from the unit's seat positions; the engine only carries
  the drawn rows (`World.musterRings`, HOST class).
- Dials, unblessed: `MUSTER_CFG = { radius: 110, waitSec: 12, who: 'leader' }`.

### 4.7 TENANCY (card 25, unruled: Rec A shared by default, B by a data flag)

Build the plumbing, ship no rows until her word: `SidezoneDef.tenancy?: 'shared' | 'party'`
(`data/sidezones.ts`; the arena bosses' courts register there, `data/arenaBossHabitats.ts:30-41`) and
`ArenaSpec.tenancy` (`data/arenas.ts`, the realm seals). A `'party'` destination keys its unit
`${zoneId}#${partyId}` (an ungrouped seat is `seat:<id>`). **THE INSTANCE FORGETS**: an instanced unit
never writes `zoneMemory` (the shared row is keyed by zone id, so two instances would overwrite each
other) and wakes fresh. Open for the card: should a party's clear of an instanced dungeon land in the
world's `completedObjectives` (today's key is the zone id: one party's clear would open the next
party's fresh instance at wake, `this.objectiveDone = this.completedObjectives.has(zoneId)`, 6356)?
Rec: an instance ignores it at wake and still records it for quests.

### 4.8 The sealed roads' words (gap 5, and 7d item 18 "refusal words are silent")

After W2 four roads stay sealed on a shard: the dock (sailing), the voyage, the Wraithsail boarding and
the Descent's shaft. Each answers a seat idle within its own dwell reach with the seat's note row
(`failNote(seat.actor, 'road:<kind>', word)`, THE ACTING SEAT), once per approach. The words are hers;
placeholders only (no em dashes, the site voice): "the boats are moored for a shared world", "the shaft
takes one delver at a time". Nothing else on a shard stays silently shut.

---

### 4.9 W2 as built (2026-10-09, branch shard-m1-roads): where the build moved off this plan

The catalog stands as written in 4.2 with these corrections, each found while building it
(the contract is docs/engine/shard.md "The roads per player"):

- **The ticket's edge can be NONE.** `RoadTicket.from` is `string | null`: the waypoint, the
  town portal out and the far span mouth arrive by no edge (loadZone's own `from`-less load,
  `entryFrom` null), which "absent = the source zone" could not say.
- **Landings resolve in the destination.** `RoadLanding` gained a function form, run under
  the destination's pin after its wake (the far span mouth, the portal's waypoint plus
  offset, the waypoint's stone), and the ticket an `after(w, seat, woke)` hook (the escape's
  word over the arrival; the waypoint's clear bubble, centred on the arriving hero through
  a filtered geometry view, since a unit's own `farPoint` measures from its warden).
- **Per-seat road state is never a World field.** THE SEAT'S DOOR, THE SEAT'S LADDER, THE
  EXIT GRACE, the dwell, the holdfast parley and the words heard live in a WeakMap keyed by
  the unit's World (`engine/shardRoads.ts`), installed by the executor at arrival and lifted
  at departure, so THE PIN and the census never see them. A seat with no ladder row reads
  its unit's own (THE DIRECT ROAD's arrivals).
- **The exit grace is "clear of every mouth".** Stepping from one mouth straight onto another
  keeps it, exactly as the solo `caveExitGrace` does; the slow rig steps clear first.
- **A frontier's live exit lags its def.** An awake unit keeps its live `ZoneExit` after a
  seat charts it, so the twin reads the def's `to` first (another seat may have charted it)
  and writes the charted id onto the live exit; its label on clients stays the frontier's
  until the zone is next re-sent (the dress beat keys on doodads).
- **The town portal's dwell clear is per seat** on a hosted world (`clear()` would reset every
  other seat's dwell), and its arrival latch is set in the source and rides the hand-off.
- **The wilds' return passage.** A portal's destination is the hearth's id, and on the
  Unbroken Wilds the keeper's zone is the surface's, so `townPortalViews` never showed the
  return passage there (in solo too: the seamless lane's to settle). A hosted world's
  landing writes the surface's id onto the portal.
- **The sealed words, mapped.** Four words for the dock (the cast-off), the voyage (the harbor
  board's passage: `sailTo` and `chartCourse` are host-only UI calls), the Wraithsail (the
  dock while she lies alongside; at sea she is never met on a shard) and the shaft. A fifth,
  placeholder, answers a realm gate whose `RealmGateRow.road` W4 has not filled, so nothing
  stays silently shut; W4 fills the slot per gate (the prep in the source, `onFirstWake`).
- **One road per seat per drain**, so two roads decided in one tick never move a seat twice.
- **Not built (named):** a dormant seat idle on a road still walks it (the World cannot see
  dormancy); the soak's pocket scenario (5.9); the waypoint is reachable only once the chart
  rides the wire (5.10).

### 4.10 W4 as built (2026-10-10, branch shard-m1-muster): where the build moved off this plan

Card 15 B's detail and card 25 were RULED on 2026-10-10 exactly as built (the contract is
docs/engine/shard.md "THE MUSTER RING, THE REALM ROADS, TENANCY"):

- **The muster's dials are hers.** Any member raises the ring (`MUSTER_CFG.raise` 'any', the
  'leader' kept as a value), its radius is 400 px and its wait 20 s (4.6's 110 / 12 / 'leader'
  were unblessed). The ring lapses when its raiser walks off it, falls or leaves the unit, or
  when its party dissolves or its raiser leaves the party.
- **One ring per party per unit, and a ring binds the party there.** While it stands the
  party's members in that unit take no road of their own (the scanner builds them no travel
  dwell): standing on it is joining it, so a member who presses the road joins it instead of
  travelling alone. Members in another unit muster there on their own.
- **The road makes every member's ticket.** A scanner travel road carries `make(seat)`; at the
  fire each member on the ring gets the ticket the road makes for that member inside the unit
  (its own door and ladder, its own escape credit), all drained in the same tick, the raiser
  first, each later member landing `landSpreadPx` out along a golden-angle spiral from the
  road's own landing (a function landing, resolved in the destination). Downed and dormant
  members never block a ring.
- **The intents stay each seat's own act** (the town portal, the caravan, the waypoint): W2
  made each the asking seat's alone, and W4 leaves them so (a card if she wants them mustered).
- **THE INSTANCE FORGETS needs no fresh-mint flag.** An instance pins neither the shared memory
  map nor the world's clears (`INSTANCE_OWN_FIELDS`): its own empty copies stand in, so the
  wake's untouched loadZone finds no shared row and mints fresh, its sleep and THE PERSIST
  CAPTURE write nothing the world keeps, and a clear inside it stays its own (quests still
  progress through the shared quest rows). Whether such a clear should also count for the
  world is card 25's open row.
- **Tenancy resolves in the registry from the pocket's own word** (`ZoneDef.tenancy`, stamped
  at the mint from the sidezone or the arena), so every road into a party pocket (its mouth,
  the town portal's way back, a climb-out from a deeper pocket) finds the party's instance,
  and `liveSeed(zoneId, seatId)` answers per party. An instance hears no world sweep's zone
  half (dispatch reaches the shared World standing there); THE OCCUPIED LAW counts it occupied.
- **The realm context rides the first wake.** Solo writes it before loadZone because its one
  World becomes the realm; on a hosted world the source stays awake for its other seats, and a
  context there would shut its own gates (`maybeOpenDemonPortal` and the sanctum's twin refuse
  while one stands), so the realm unit's World takes it at its first wake.
- **The gate stays standing for the next seat.** 4.2 had the prep consume the source's
  Necropolis gate, as solo does; a hosted source stays awake and `updateNecropolis` would raise
  a new gate the next frame, so the hosted prep leaves it (solo keeps its consume).
- **A dimension's crossing stays sealed on the Unbroken Wilds** (THE WILDS LAW: its gate zone is
  graph ground, the keeper's surface until M6), keeping the realm word; on a classic shard the
  gate zone wakes a unit, and the crossing's first wake is the tear's word, once per wake.
- **The act's stamps count per crossing seat.** A co-op party crossed as one (one
  'demon_portals_opened', one 'fracture_rifts_entered'); a hosted party crosses seat by seat,
  each member's crossing its own act. Named for her, unruled.
- **THE REALM-WALK DIGEST** (probe_shardunits B, the realm half): a seeded solo hero crosses
  every realm gate and climbs out of each arena; committed before the split, it holds after it.

## 5. THE WIRE PER UNIT

**5.1 Snapshots.** Each unit serializes its own (`serializeSnapshot(unit.world, tick)`, `net/snapshot.ts:1015`)
and ships it to its own seats. ONE `snapTick` per wire beat (`shardHost.ts:611`) stamps every unit's
snapshot that beat, so a client's tick stays monotonic across a hand-off and the beats keyed on it
(`memoryAccessBeat`, `vendorBeat`) keep their cadence. `stampAudiences(unit.world, snap)` per unit: it
gates on `world.localSeat.keeper` (`net/seatView.ts:50`), which the unit warden carries. Transport: NEW
`sendStateTo(snap, seatIds)`, the body of `sendState` (`shardTransport.ts:511-527`) iterating only those
seats' connections (THE OWN ENTRY and the audience split are per snapshot already); `metaDirty.clear()`
per unit after its send (today once, `shardHost.ts:614`).

**5.2 The zone message.** `lastSentZone`, `lastSentDoodadRev`, `dressTimer` (`shardHost.ts:252-254`) move
onto `SimUnit`; NEW `sendZoneToMany(z, seatIds)` replaces the broadcast `sendZone` (529); the hand-off
uses `sendZoneTo` (531); THE DRESS BEAT (590-602) runs per unit. **5.3** The meta heartbeat (603-607) marks
every seat dirty in every unit.

**5.4 World-wide versus unit-local.** World-wide: the roster (welcome, `pjoin`, `pleave`), the session
words, the party rows (published into every unit; `snapshot.ts:1056` ships them on every hosted
snapshot). Unit-local: actors, drops, texts, flashes, THE WIRE'S EYES zone rows (`zonesOf`, reach is per
seated body), the vendor shelf, and **pings** (a mark is a point in one zone; `placePing` 19695 purges the
clocks of seats absent from `this.seats`, 19702). An arriving client keeps its last `memoryAccess` and
vendor rows until the new unit's beat (per-World ledgers `lastShippedMemoryAccess`, `lastShippedVendor`;
at most 1.5 s, harmless: the client keeps the last it saw).

**5.5 THE NEAR LAW per unit**, by construction: `grantXp` (19727-19735), the party scale
(`partyScaleCount` 5643 into `scenePartyScaleCount`) and `settleNearScale` (5661) iterate the unit's
own seats, where positions are comparable. THE KILLER'S DUE and THE GROUP LAW read the party desk
world-wide, but only a mate in the same unit can be within reach (3.6).

**5.6 Two NEW rows, each absent in its common case** (a quiet snapshot keeps its shape key for key):
- `SeatW.rd?: [x, y, frac, kind]`, THE OWN ENTRY (`SEAT_OWN_ROWS`, `snapshot.ts:1313`, gains `'rd'`): the
  seat's road dwell. CONFIRMED gap: the renderer's one ring feed (`renderer.ts:4670` reading
  `World.dwellRingsView` 46642) reads the shell's own dwell fields, which a shell never updates, so
  without this row a remote player's road dwell is invisible. `applyOwnSeatRows` (`seatView.ts:115`) stores
  it on the shell (`World.netRoadDwell`), and `dwellRingsView` adds it on a client. W2.
- `StateSnapshot.mu?: { x, y, r, party, have, need, left }[]`: THE MUSTER RING (4.6), unit-wide; the
  painter draws it gold for the viewer's party and faint for a stranger. W4.

**5.7 THE SHADOW** stays the keeper's on the wilds; units' wardens shadow their own focus. No warden ever
rides the wire (the keeper skips at `snapshot.ts:1029, 1036, 1074` hold for every keeper-tagged seat).

**5.8 The status page** (`shardHost.ts:790`) lists units (key, zone, seats, awake since, empty since) and
each seat's unit. **5.9 The soak** (`balance/soak_shard.ts`) meters `sendState`, `sendZone` and
`sendZoneTo` on the instance; re-aim it to the new names, and add a pocket scenario (bots that take a
mouth) once W2 lands.

**5.10 The chart on the wire** (charter 3.4, on M1's build list) is not needed for any road to open: the
shell patches its own `world.zone` node from the zone message (`applyZone`, `snapshot.ts:2340-2384`) and
draws what it was sent. It is needed for the map, the waypoint road's reachability and a corpse's map
mark. Recommend its own pass after W2 (M1.5): per-seat knowledge (`visited`/`surveyed` beside the
world's), ZoneDef rows as `session chart` deltas from the keeper, adopted through `adoptWorldState`'s
tolerant rebuild.

---

## 6. THE SHARD SAVE

**What the keeper writes today.** `persist()` (`shardHost.ts:829-847`) wraps `serializeWorldState()`
(15555): every stored `zoneMemory` row except the keeper's own zone (15650), `cave_*` rows kept even
off the graph (15651), plus ONE live capture, the keeper's own zone (`zoneMemorySnapshot()` 15663). A zone
awake in a unit has no current row (its row is written when it sleeps), so a crash or a restart would
lose every awake unit's survivors, doors, objective riders and ground loot. CONFIRMED.

**THE PERSIST CAPTURE (W1).** Before the keeper serializes, every awake, non-instanced unit writes its
live row into the shared map: under its pin, NEW `captureLiveMemory()` =
`const m = this.zoneMemorySnapshot(); if (m) this.zoneMemory.set(this.zone.id, m)`. That is the PURE
capture, documented as safe mid-play ("no side effects ... it must never nudge overlays or ledgers",
15130-15134), never the leave verbs (`captureZoneMemory` 15227 also incubates a conclave ritual and bumps a
ledger). The keeper's serializer then carries each awake zone through its own stored-row lane
(`memoRowOf` 15616, the stored-row loop 15645-15661), and every pocket rides the `cave_` filter (every pocket id is `cave_*`:
`data/sidezones.ts:27-30`, `worldmass/sideareas.ts:28-31`, the realm arenas `cave_realm_`, `cave_crusade_`,
`cave_necropolis_`). Cost: one zone's memory per awake unit per world-save beat (`worldSaveSec` 60). The
only reader of an awake zone's stored row is the town portal's faded check, which W2 points at the live
seed (4.2).

**THE SLEEP** writes the departure's row with the leave verbs (section 2), exactly as `loadZone` does when
a seat leaves a zone today (6294-6297). THE INSTANCE FORGETS: instanced units write neither row.

**`persist()` changes:** the capture loop first (and in `stop()`, 819, which persists); `this.world` stays
the keeper; nothing else. **The wilds save** is unchanged: the keeper is the surface
(`serializeWorldState` embeds the mass half, 15702-15703; the pockets ride `massSideareas`, 3914-3933, from
the keeper's roots), and awake pockets add their rows through the capture. **At resume** nothing is a
unit: THE RESUME LAW stands the keeper at the hearth (`restore` 850, `wildsSave.resumeWilds`), seats rejoin
there (THE HEARTH WAKE), and units wake from memory on demand. **The vessel mirror and the corpse
records** are unchanged except that `serialize` and `fall` read the seat's unit (3.6).

**OWED, pre-existing, not M1's (named for her):** a shard never persists the keeper's character half.
`ShardSave` carries only `world` (`shardHost.ts:159-164`), while `completedObjectives`, the run `ledger`,
`throngClaimed` and `annexFound` ride the character save (`meta/character.ts:291-304`, restored at
521-554). A restarted shard forgets which zones were cleared and which deeds were ledgered. A cheap
optional row for W1: `ShardSave.run = { completedObjectives, ledger, throngClaimed, annexFound }`,
restored after `adoptWorldState`, tolerant when absent (no schema bump needed).

---

## 7. THE PROBES

### 7.1 NEW `balance/probe_shardunits.ts` (fast tier; a classic shard, open account, ephemeral; the
in-process `ShardHost` + `WsTransport` harness of `probe_shardseat.ts`). Its roster row lands in the same
commit (the probe gate's census refuses an unenrolled probe).

| Section | Wave | Pins |
|---|---|---|
| **A THE DERIVED CENSUS** (static, no boot) | W1 | parse `src/engine/world.ts` with the TypeScript compiler API, the RIG T idiom (`probe_tiers`). Three detectors: **shape** (a property whose type or initializer is a string-keyed `Map`/`Set`/`Record`, a `WorldSim`, a `Ledger`, an `Account`: 104 hits today), **THE SAVE LAW** (every field `serializeWorldState`/`adoptWorldState` touch), **THE SWEEP LAW** (every field the gated blocks' bodies write, one call deep). Each hit needs a row in `SHARD_UNIT_FIELDS`; a field the save touches can never be UNIT; a UNIT row carries a reason from the closed vocabulary (`per-visit`, `zone-local`, `memo`, `seat-keyed`, `warden-only`, `dev`); a row naming a missing field fails. A field added next month is aliased, marked or named unit-local the day it is written. |
| **B THE SOLO INVARIANT** | W1, re-run W2 | no sim or co-op World ever sets `shardWorld`; **THE ROAD-WALK DIGEST**: a seeded solo world walks a scripted hero through an exit, a cave mouth, the climb-out and a town portal round trip, and the digest of (zone ids in order, rounded final positions, actor count, a `Math.random` draw counter) equals a constant W1 commits **before** the W2 lift, so the lift must reproduce it; the road probes stay green (`probe_townportal`, `probe_worldmass_sideareas`, `probe_dimensions`, `probe_pitfall`, `probe_couch`), and `npm run sim -- baseline check --suite smoke` holds |
| **C TWO SEATS, TWO ZONES** | W1 (the registry's direct `travel`), W2 (a real exit dwell) | p1 stays at the hearth, p2 goes to the Crossroads; 300 frames tick both; the keeper never moves; p1's client hears only hearth actors and p2's only the Crossroads'; p2's zone message lands before its first Crossroads snapshot; a `?` frontier minted from the unit appears in the keeper's `zoneMap`, and two units minting in one tick never share a `gen_` id |
| **D THE HAND-OFF KEEPS IDENTITY** | W1 | the same Actor objects and ids for the hero, a minion, a companion, an actor-tier throng body; a construct is culled in the source; the party desk still lists both seats; the ack continues (`SeatW.seq`); the kill tally reaches a fall's reckoning; domain and aura sources are stripped from the hero in the source; a toggled field the hero cast expires (its reservation refunded); no projectile of the hero remains in A; A's monsters drop their target ref; THE SPAWN GRACE holds until the first willed input |
| **E SLEEP AND WAKE** | W1 | p2 leaves a half-fought zone; after `unitLinger` it sleeps and its row carries the seed and the survivors with their wounds; re-entry meets the same ground and survivors; a persist while it is awake writes the live row; the hearth never sleeps; no empty `lastlight` row ever appears (the wake's `adoptedZonePending`) |
| **F THE ROADS PER PLAYER** | W2 | p2's exit dwell moves p2 alone; p1 idle on the same exit moves only on its own dwell; a second arriver from another side has its retreat road (4.3); the cave mouth and the climb-out land at the mouth with the per-seat grace; the town portal out and back; the caravan and portal intents are no longer sealed; the `rd` row rides only the dwelling seat's socket. The wilds pocket round trip (the keeper's mouth, a pocket unit, back at the mouth on the surface) goes to the **slow** rig (a wilds boot, card 21's split) |
| **G THE MUSTER RING** | W4 | the leader's road raises a ring; it fires when the mate steps on; the timer fires for whoever stands on it; an independent's road takes it alone; the `mu` row draws; a party lands in one instance of a `'party'` pocket |
| **H A SEALED ROAD'S WORD** | W2 | p2 idle at the dock (and the shaft) hears its note row once per approach; nothing moves; p1 hears nothing |
| **I THE DESKS PER UNIT** | W1 | a mortal vessel falls in a unit: its body records the unit's zone and spot; a vessel in a pocket mirrors home with its companion; a dormant seat keeps its unit awake past `unitLinger` and resumes with that unit's zone message; a grouped downed seat whose only mate stands in another unit falls (no kneel across Worlds); THE MERCY raises a fresh hero inside a unit |
| **J THE WORLD SWEEP** | W3 | a warband arrival spawns in the unit holding its target; `gloaming_survived` bumps once with two units awake; a haunt dissipation reaches its unit; `sim.update` runs once a tick; the deadwake never consumes a zone a unit stands in |

### 7.2 Existing rigs to re-aim

| Rig | What moves |
|---|---|
| `probe_shard.ts` | B/C hold as written (the keeper boots at the hearth, `probe_shard.ts:182-184`; the zone lands first, 216); J (persist and resume) adds one awake unit so THE PERSIST CAPTURE is pinned |
| `probe_shardslow.ts` | Q calls the keeper's `enterSidezone` directly (`probe_shardslow.ts:238`): that stays the M0 engine lane (a direct call moves the keeper unit whole); comment it so. N/O (the fall at the hearth) hold; the pocket fall joins `probe_shardunits` I |
| `probe_shardinput.ts` | `w.loadZone(FLOOR)` on the keeper (147) moves the keeper unit: `unitFor` must read the keeper's live zone, never a stored key |
| `probe_shardwire.ts` | `sendState` becomes `sendStateTo` (per unit); the shape-key assertions (121) are unchanged because every new row is absent in its common case |
| `probe_shardseat.ts` | K pins the harborhold's muster horn (`HARBORHOLD_CFG.muster`, 23206-23216), a different thing from THE MUSTER RING; keep the names apart (`MUSTER_CFG` lives in `server/muster.ts`) |
| `probe_tiers.ts` RIG T (2178) | new World methods that iterate bodies (the scanner's seat loop, `landSeatAt`) need the gate or a `// SOVEREIGNTY: seat` marker |
| `balance/soak_shard.ts` | meters `net.sendState`/`sendZone`/`sendZoneTo` (282-284) and reads `host.world.seats` (292, 339, 392, 410, 455): re-aim to the new sends and `host.units.allSeats()` |
| `balance/proberoster.ts` | the new row, fast tier, in the same commit as the probe |

---

## 8. THE WAVES

Order: **W1, then W2 and W3 in parallel, then W4.** Every wave: the ownership gate from a
session-local declaration (tokens `shardWorld`, `shardUnits`, `simUnit`, `shardRoads`, `roadMuster`),
`npm run check`, `npm run probe` (the shard rigs, the road rigs of 7.1 B), the probe roster in the same
commit, and a merge-tree dry run against the foundation tip (charter 7c).

| Wave | Builds | Owns (files and regions) | Size | Gate |
|---|---|---|---|---|
| **W1 THE UNIT FABRIC** (two lanes against one contract: the `SeatPacket`, `RoadTicket`, `ShardWorldLink` and `SHARD_UNIT_FIELDS` types land first, in `src/engine/shardUnits.ts`) | W1a engine: the alias table and THE PIN, `detachSeat`/`attachSeat`, THE FILTERED HOST, THE PRIMARY GATE, the wake/sleep/capture seams, `atZone` (solo branch only). W1b host: the registry, THE SEAT LEDGER, the tick order, THE ONE CLOCK, THE UNIT WARDEN and THE UNIT SHADOW, the wire per unit, THE PERSIST CAPTURE, the desks per unit, the direct `travel` API for probes, the status page | W1a: `src/engine/shardUnits.ts` (NEW, whole); `world.ts` seams only: the `shardWorld` field, the two gated blocks (44585-44604, 44634-44893), the `createPlayer` `load` option (4776), a `shardUnitHost()` view beside the native host views, `landSeatAt`, `captureLiveMemory`, `sleepZone`, `atZone`; `engine/companionBonds.ts` (`exportBond`/`importBond`). W1b: `server/simUnits.ts` (NEW, whole), `server/shardHost.ts`, `server/shardTransport.ts`, `server/vessel.ts`, `server/corpses.ts`, `server/party.ts`, `balance/probe_shardunits.ts` (NEW: A, B, C, D, E, I), `balance/proberoster.ts`, `docs/engine/shard.md`, charter receipts | W1a ~550 lines; W1b ~900 with the probe | 7.1 A-E and I green; every shard probe green; the classic soak's p95 within 10% of today's (THE PIN must not cost) |
| **W2 THE ROADS PER PLAYER** | THE LIFT, the shard scanner and its per-seat dwells and grace, the tickets of 4.2 (exits, frontier, climb-out, far mouth, the wilds pocket both ways, cave mouths, town portal both ways, caravan, waypoint plumbing), THE RETREAT LAW, the intents re-opened, the sealed words, the `rd` row | `world.ts`: the road block 46040-46430, `isExitLocked` 47186, `travelToWaypoint` 47229, `travelThrough` 47895 (shard branch only), `updateTownPortals` 15322, `startCaravan` 24165, `dwellRingsView` 46642; `src/engine/shardRoads.ts` (NEW); `net/intent.ts` (`waypoint`); `net/snapshot.ts` + `net/seatView.ts` (`rd`); `server/simUnits.ts` (the ticket executor's landings); `shardHost.ts:510` (the seal) | ~800 | 7.1 F and H; B's digest unchanged; the road rigs green |
| **W3 THE WORLD SWEEP** | the SPLIT dispatch (1.6), `atZone`'s shard branch, THE OCCUPIED LAW (`presentZoneIds`, `censusByZone`), many origins for the forechart, the omens, the floating zones and the conclave level | `world.ts`: the gated blocks' interiors and the SPLIT methods (14347, 17006, 17121, 17167, 17885, 18335, 18912, 22545, 23568); `world/overlay.ts`, `engine/nativePopulationResolution.ts`, `world/invasion.ts`, `world/faction.ts`, `packages/overlays/{deadwake,contagion,conclave}.ts`; a `dispatch` method on `server/simUnits.ts` that W1 declares as a stub | ~450 | 7.1 J; the overlay probes and `npm run eventqa` |
| **W4 THE MUSTER RING, THE REALM ROADS, TENANCY** (BUILT 2026-10-10, branch shard-m1-muster; 4.10) | `MusterDesk`, the `mu` row and its painter, the realm gates' prep and first wake, the tenancy flag and instance keys, THE INSTANCE FORGETS | `server/muster.ts` (NEW), `server/simUnits.ts` (instance keys), `world.ts` realm functions (`enterDemonRealm` 16484, `enterRealmArena` 16527, `enterNecropolis` 19133, `enterCrusadeSanctum` 19176, `enterFractureRift` 12842, `enterCourtDomain` 6912, `enterDimension` 8306) split into a prep and a first wake; `data/sidezones.ts`, `data/arenas.ts` (the flag's type); `net/snapshot.ts` (`mu`); `render/renderer.ts` (the painter beside the ring pass, 4670) | ~700 | 7.1 G and the realm sections; the realm and arena rigs green |

W2 and W3 never share a `world.ts` region (the road block and its road functions versus the world
block and its sweep methods); their only shared file is `server/simUnits.ts`, where W2 owns the ticket
executor and W3 fills a `dispatch` stub W1 already declared.

---

## 9. Risks (the five named, and what else the read turned up)

1. **THE DERIVED CENSUS false positives.** 104 shape hits, about 60 of them UNIT (the `materialized*`
   guards, memos, per-visit latches). Answer: the closed reason vocabulary, THE SAVE LAW making the
   world-level half derived rather than remembered, one review of the table in W1. The opposite risk is
   worse and the census exists for it: a world-level field that is not shaped like a container
   (`nextGenId`, `ledger`, `notices`) is caught by THE SAVE LAW or THE SWEEP LAW, not by shape.
2. **The keeper's `this.player` inside a pocket unit.** A unit's p0 is its own warden, never the keeper.
   Its reads split three ways: roads and stations (now per seat: W2 for roads, the counters wave for
   stations, `localHumanSeats` 5033); position and level reads (centered on a real player by THE UNIT
   SHADOW and THE WARDEN STANDS per unit); and deed/ledger belts that read the warden (`updateDeedRecovery`
   5899, inert on an invulnerable body; the Mireille graduation belt 20898-20912, idempotent on the shared
   ledger). The falls that travel only `this.player` (skyfall 47494, the pit 47762) never fire because the
   warden levitates.
3. **Time scalars.** THE ONE CLOCK (1.2). Residual: a unit-local timeflow hold or scale would bend that
   unit's `dt`; every unit carries the shard's `allowHold = () => false` and the scoped freeze, and the
   clock is re-pinned every tick, so a drift cannot outlive one tick.
4. **Event overlays that iterate `zoneMap`.** They run only in the keeper's `sim.update` (THE PRIMARY
   GATE). Their in-zone halves read `xOn(this.zone.id)` per unit (agent A). The SPLIT drains are consumed
   by the keeper first because it ticks first; until W3 a unit only misses effects that belong to its zone,
   never doubles them. THE OCCUPIED LAW (W3) keeps the fields off ground a unit player stands in.
5. **The forechart writing `zoneMap` from a pocket.** `updateForechart` (8829) is keeper-only. A unit's
   own mints are the standing arrival law (`chartWithin`, `nativeAreaBoundaries.ts:43-45`, surface loads
   only, never a cave) and travel's `chartFrontier`; both write through THE PIN with one counter. A wilds
   pocket never charts (`isCave`) and never loads a surface (THE WILDS LAW).
6. **Cross-World leaks.** Teardown on absence (`CompanionBonds.refresh` 171, Assaults, Challenges,
   AttackSequences, GuardArts), per-World key counters (`guardArts.ts:46`, `domainSeq` 32598), aura sources
   stripped only by their own World's sweep (48503-48506), `statusRelay` closures (`nativeMonsterFactory.ts:96`),
   AI target refs (`ai.ts:1761-1765`). Answer: detach's order (3.4); probe D pins the four sharpest.
7. **THE PIN and faults.** The copy-back runs in a `finally`, so a unit that throws mid-tick never strands
   a reassigned reference; each unit's simulate phase is guarded separately, so one faulting unit never
   stops the others. **THE UNIT BREAKER** (W1): a unit (never the keeper) faulting `faultBreakerTicks` in a
   row hands its seats to the hearth and drops without a capture (its state is suspect).
8. **The process-global policies** (`World.policyOwner`, the bag and container boards, the route guard,
   4635-4660). CONFIRMED equivalent from any pinned World for the two boards (their closures read the
   pinned `account`); PLAUSIBLY equivalent for the route guard (its coast host reads the pinned `zoneMap`
   and `sim`). `run()` wraps `withGlobalPolicies` (4656) anyway; the geography re-bind is a no-op for a
   shared `sim` (`world/sim.ts:323-324`).
9. **Cost.** Every awake unit is a whole World, plus a throwaway `WorldSim` at its wake (PLAUSIBLE: a few
   ms). `maxUnits` caps them; measure the wake in W1 and, if it passes the tick budget, wake on the next
   tick while the traveller's ring stays full. The soak gate (W1) must show THE PIN costs nothing.
10. **The seamless lane's churn.** `loadZone` is untouched; `nativeSceneHarbor.ts` is untouched (THE
    FILTERED HOST); the world.ts edits sit in the road block, the world block, the road and realm
    functions and new methods; the daily merge (charter 7c) and the ownership gate per wave.
11. **The wilds' one focus is untouched.** A seat far from the keeper's focus still meets cold ground and
    finds no native mouths: the runtime seats mouths around its focus (`setMassEntrances` 3887). THE MANY
    SHADOWS (charter 6.6) is the seamless lane's.

## 10. Open for her word (cards to raise; every number unblessed)

- Card 15 B detail: THE MUSTER RING raised by the leader alone, or by any member; `MUSTER_CFG` radius and wait.
- Card 25: which pockets carry `tenancy: 'party'`, and whether an instanced clear lands in the world's
  `completedObjectives`.
- The sealed roads' words (4.8), and whether a per-seat voyage or Descent is ever wanted (each is its own pass).
- `unitLinger` 30, `maxUnits` 32, `arrivalGraceSec` 3.
- The optional `ShardSave.run` row (section 6).
- The chart on the wire as its own pass (M1.5, 5.10).

## Appendix: CONFIRMED versus PLAUSIBLE, in one place

CONFIRMED (read this pass): every anchor in sections 1 to 6; the 663-property census and its 104 shape hits;
the reassignment sites; the sealed roads' mechanism; the carry filter; `loadZone`'s early return on the
wilds; the empty `lastlight` row hazard; the `zoneMap[MASS_ZONE]` hazard; the retreat-law gap; the invisible
remote dwell ring; the five readers that need the occupied law; the teardown-on-absence and
per-World key-counter hazards; `WorldSim` holds no World reference; actor ids are process-unique.

PLAUSIBLE (a builder's check first): V8 slow mode from accessors (the reason THE PIN was chosen; unmeasured);
the wake's cost; `theaterVisitSeq` as world-level; the route guard's equivalence; the escape credit's
party payout as the right reading of "the traveller"; that the forechart's round-robin origin is enough
for players far from the hearth (it may want one halo per occupied zone).
