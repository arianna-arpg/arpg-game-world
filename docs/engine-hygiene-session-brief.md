# Engine Hygiene / De-hardcoding — Session Brief

> **IMPLEMENTATION OUTCOME (2026-07-07)** — the recommended "low-risk sweep" shipped as five
> commits, one per item, each gated on `tsc --noEmit` + `sim baseline check --suite smoke`
> (no gated metric moved) and live-verified in the browser (boot console clean, class-select
> panel, town NPC scans/nameplates via teleport probes, a fog front spawned + minimap-painted):
>
> - **Item 6** `2e927c7` — ten identical escapers → one `esc` in new `src/ui/dom.ts`.
> - **Item 4b** `9e834fb` — all 34 `startsWith('cave_')` sites → `caveDepth != null` (count
>   verified; the five exit-id sites fold into their `byId` lookups). `caveDepth`'s doc now names
>   it THE discriminator. Left by design: `cave_descent_` (a *different*, narrower fact) and the
>   string-only churn-id classifiers (corpse records, save strips).
> - **Item 3** `5988ef7` — open `WeatherKind` + `registerWeather()`; `color`/`skyWeight` folded
>   onto `WeatherDef` (WEATHER_COLORS/KIND_WEIGHTS retired); `validateWeather` wired into
>   `validateContent`. The picker scans the registry **stable-sorted by descending weight**,
>   which reproduces the old per-phase arrays exactly — proven pick-equivalent across 20k
>   seeded draws per phase, draw count unchanged.
> - **Item 4a** `9c9f627` — open `MonsterDef.npcRole` ('vendor'/'innkeep'/'caravanner'/
>   'questgiver'); all behavior + nameplate sites scan roles via `World.hasNpcRole` /
>   `MONSTERS[defId]?.npcRole`. `getQuestGiver()`'s no-arg default is a role scan now; the
>   restock toast reads the vendor's actual name (tiny copy change). Spawn-by-id data stays.
> - **Item 7** `0ac275e` — optional `WorldOverlay.activityAt?(zid)`; the eight contributors own
>   their weights beside their predicates; `WorldSim.activityAt` sums; `World.eventActivityAt`
>   keeps only the two engine-local current-zone tail terms. Per-zid totals identical.
>
> **Item 1 (marquee) SHIPPED `732e740`** — `kill()`'s 21-row ladder became three surfaces:
> `src/engine/killHandlers.ts` (KillRule registry — tag fast-path + `when` predicate — plus the
> KillCtx facade: credit/zone/sim + grantXp/dropGemAt/text/bumpLedger/flash/spawnHostileAt/simView;
> id-keyed re-register = HMR-safe), nine package rows in their own def files, and SEVEN rows that
> close over World run-state (descentRun, huntBeast, the four realm contexts, amalgamSite) kept as
> `World.worldKillRules` — the rouseRules pattern — since module rows must stay stateless across
> every World the process boots. Warlord kept its TWO rows; ledger keys byte-identical; bodies
> verbatim. Live-verified (crowned / cultist / warlord ledger bumps, inert-package + corrupted
> no-ops); sim baseline unchanged. A new package's kill-bounty is now one registerKillHandler call.
>
> **Still open: Items 2 (chooseEvent registry + PackageEvent wiring) and 5 (renderer
> feature-overlay painters)** — scoped below, unchanged and current.

> The `quality-pass-jul2026` DEFERRED cleanup list, scoped for hand-off. Every item converts a bespoke
> branch-chain / closed union / duplicated helper into a **registry or data field**, in service of the
> standing directive (`avoid-hardcoding`): *"add a feature = one def file + one registry line."*
> Grounded against live code at `HEAD 65caa9f` (2026-07-07). Uncommitted working doc — relocate/commit/
> delete freely. `world.ts` is ~21k lines and the memory note's refs were ~7k lines stale; all `file:line`
> below were **re-derived** at this commit — still re-confirm by symbol before editing.

## The one shape (all seven items share it)

Each is *a closed union or a literal-id / id-prefix test standing in for a data field, where the resolver
should iterate a registry.* The exemplars to mirror already live in this repo — every item lands on one:

| Mirror this | Where | Good for |
|---|---|---|
| `rouseRules` — tag-keyed record of `this`-closures, `null` when the package is absent | `world.ts:14717` (+ dispatch `:14751`) | Item 1 (kill handlers) |
| `registerStructureGen(id, fn)` — module-level `Record` + register fn, core rows self-seeded | `structureGen.ts:19` | Items 1, 2 |
| `WEATHER_FX` — `Partial<Record<kind, def>>`, guard-on-missing; **already an open registry** | `weatherFx.ts:37` | Item 3 |
| `StampKind = KnownStampKind \| (string & {})` + `validateStamps` boot check | `zones.ts:99` | Item 3 |
| `QUEST_GIVER_IDS` — role set **derived** from `QUESTS`, not hand-listed | `quests/defs.ts:127` | Item 4a |
| `zonePolicy.eventAllowed` — one biome allow/deny resolver the overlays already call | `world/zonePolicy.ts` | Item 4b |
| doodad painter map — `DOODAD_VISUALS` data → `PAINTERS` → `drawDoodads` dispatch (order + fallback) | `doodadVisuals.ts` / `painters.ts` / `renderer.ts:1134` | Item 5 |

## Items at a glance

| # | Item | Effort | Risk | Unblocks |
|---|---|---|---|---|
| 1 | `kill()` bounty block → handler registry | **M–L** (1–2 d) | Med | Any package's kill-bounties without engine edits (marquee) |
| 2 | zone-event `chooseEvent` chain → registry | **S–M** (½–2 d) | Low | Package-defined zone events (a stub already awaits) |
| 7 | `eventActivityAt` weights → data | **Low** (½ d) | Low | New overlays feeding Mycelia activity automatically |
| 3 | `WeatherKind` union → open registry | **Low–M** (½ d) | Low | Package-added weather kinds as data |
| 4a | NPC role by defId → `npcRole` field | **Low** (2–3 h) | Low | Package town-NPCs (vendor/inn/caravan) |
| 4b | zone-kind by id-prefix → `caveDepth`/`kind` | **Low→M** (2 h→1 d) | Low | Kills 34 `startsWith('cave_')` id-sniffs |
| 5 | renderer per-feature blocks → painter registry | **Med** (½ d) | Low | Feature overlays without renderer edits |
| 6 | panels `esc()` ×10 → one helper | **Trivial** (15 m) | None | — |

Every item's gates: `npx tsc --noEmit` clean, then `npm run sim -- run --suite smoke`. Several also want a
boot-console read (the validator/warn paths) and, for the renderer, a `preview` screenshot.

---

## Item 1 — `kill()` per-tag bounty block → handler registry  ⟶ MARQUEE

**Goal:** the per-monster-tag bounty logic in `kill()` is *the biggest remaining bespoke block*. A new
content package can't award its own kill-bounties/ledger progress without editing core `world.ts`. Make it
a registry a package contributes one row to.

### Current state (re-derived)
- `kill(actor, silent, killer?)` — `src/engine/world.ts:16216` (spans ~`16216–16774`). The bounty block is
  inside `if (!silent && actor.team === 'enemy')` (`:16472`), credit computed at `:16318`
  (`!killer || killer.team === 'player'`).
- **21 sequential `if` blocks across 19 tag values.** Each follows the skeleton *resolve a package field →
  mul/bool → `bumpLedger` → `grantXp(scaled)` → `dropGemAt × N` → `text(toast)`*. Examples:
  `hunt_beast` (`:16531`), `balor_epicenter` (`:16544`), `crusade_camp` (`:16572`), `patient_zero`
  (`:16639`), `eldritch_observer` (`:16687`, bumps `eldritch_repelled`), `amalgam_boss` (`:16737`).
- Tags are stamped imperatively at spawn (`beast.tag='hunt_beast'` `:3104`, `obs.tag='eldritch_observer'`
  `:6081`, …) — a clean runtime join key each package's spawn method already sets.
- An observe-only death chokepoint already exists (`SIM_TAP.current?.onDeath` `:16352`) — proves the seam,
  but it's observe-only by contract, so it can't host these mutations.

### Target refactor
Mirror **`rouseRules`** (`:14717`): same `actor.tag` key, same close-over-`this`, same `null`-when-absent.
Two stages:
- **(A) Start:** a `private readonly killHandlers: Record<string, (a, killer, credit) => void>` on `World`;
  the 21-branch ladder collapses to `if (actor.tag) this.killHandlers[actor.tag]?.(actor, killer, credit)`
  plus a tiny matcher list for the non-tag cases. Lowest friction, keeps private-method access.
- **(B) Promote to the north-star:** `registerKillHandler(tag, fn)` in a new `src/engine/killHandlers.ts`,
  `fn: (ctx: KillCtx) => void`, each package registering its row in its own def file (mirroring how `HUNT`
  already owns its overlay). **Designing `KillCtx` is the load-bearing work** — a facade exposing the
  private bits the bodies need: `grantXp`, `dropGemAt`, `text`, `ledger`, `sim`, `zone`, `credit`.

### Files to touch
- `src/engine/world.ts` — replace the ladder with the dispatch; move bodies into the record (A) or into
  package files (B).
- (B) new `src/engine/killHandlers.ts` (the `registerKillHandler` surface + `KillCtx` type); one
  `registerKillHandler(...)` per package under `src/packages/**`.

### Gotchas
- **Not tag-pure.** Three matchers key off *not* `tag`: `rarity==='crowned'` (`:16519`),
  `faction==='depthkin'` (+`descentRun`+`credit`, `:16524`), `corrupted || tag==='eldritch_spawn'`
  (`:16698`). A plain `Record<tag, fn>` can't express these — add a small predicate/matcher escape hatch,
  or stamp those spawns with a tag too.
- **Credit is per-row, not global** — most fire for whoever lands the blow; a few are credit-gated. Pass
  `credit` into the handler.
- **Warlord has TWO handlers for one tag** — a credited bounty (`:16490`) *and* an always-fires
  power-break (`:16510`). Don't collapse to one row.
- **Ledger key strings are a cross-file contract.** Unlock predicates read them verbatim
  (`conclave.ts:101` → `eldritch_repelled`; `hunt.ts:32,36,39`; Warbands → `crowned_killed`). **Renaming a
  key silently breaks unlocks — keep them byte-identical.**
- **Handlers do more than count** — spawn follow-ups (blood demon `:16714`), themed loot
  (`dropAmalgamPart` `:16745`), consume realm contexts (`fractureRealmContext`/`realmContext`/…), despawn
  actors (Bonewright `:16748`). The value must be a full closure, not a data-only `{ledgerKey, reward}` row
  — though ~8 rows already carry a `surge().reward = {xpBase, xpPerLevel, gems}` shape and *could* be data.
- **Reward-shape mismatch:** the block uses `xpBase + level*xpPerLevel (+mul)`; `RewardSpec`
  (`packages/types.ts:134`) uses `xpMul`. Unifying payouts means reconciling these.
- **Co-op/save:** host-authoritative (`net/snapshot.ts`), so no wire/determinism change; `ledger` already
  merges to account on death. Keep side effects host-side (they already are).

### Effort: **Medium–large (~1–2 days).** Dispatch swap is trivial; the work is the `KillCtx` facade, ~19
extractions, and the non-tag/credit/double-warlord edge cases.

---

## Item 2 — zone-event `chooseEvent` chain → registry

**Goal:** adding a zone event today means editing a closed union + four bespoke sites. Make it one row.
**There is already a pre-built home for this that nothing consumes yet** — wire it, don't fork it.

### Current state (re-derived)
- `chooseEvent(ctx, roll)` — `src/engine/events.ts:48`, **pure** (no `World` import; reads an
  `EventContext` snapshot `:15`). Selection is a **3-branch ordered early-return** chain (siege → caravan →
  patrol, `:50/:56/:63`), each hardcoding an eligibility predicate, a night/day threshold vs the shared
  `roll`, and a `{primary, secondary}` mapping.
- The *kind* is bespoke in **four sites**: selection (`events.ts:48`), `EVENT_REWARD` map (`events.ts:33`),
  `ActiveZoneEvent.spawn()` (`zoneEvent.ts:42+`, switches on kind), `tick()` (`zoneEvent.ts:98+`). Union
  `ZoneEventKind = 'patrol'|'caravan'|'siege'` at `events.ts:13`. Call site + ctx assembly
  `world.ts:2919–2937`.
- **Pre-built stub:** `PackageEvent { id; kind; weight; reward }` (`packages/types.ts:156`) + `events?:` on
  `ContentPackage` (`:225`) exist but **no consumer reads `.events`** — a declared-but-unwired seam. The
  registry should become its consumer, folding `EVENT_REWARD` into `RewardSpec`.

### Target refactor
Mirror **`registerStructureGen`**; keep selection pure in `events.ts`:
```ts
interface ZoneEventDef {
  id: string; priority: number;          // preserves siege > caravan > patrol
  eligible(ctx): boolean; chance(ctx): number;   // threshold vs the shared roll
  reward: EventReward; pick(ctx): EventChoice;
}
export function registerZoneEvent(d: ZoneEventDef) { ZONE_EVENTS.push(d); }
export function chooseEvent(ctx, roll) {
  for (const d of ordered(ZONE_EVENTS)) if (d.eligible(ctx) && roll < d.chance(ctx)) return d.pick(ctx);
  return null;
}
```
Core events self-register in `events.ts`. The behavior half (`spawn`/`tick`) either moves onto the def or
into a parallel id-keyed behavior registry so `ActiveZoneEvent` dispatches `def.spawn(...)` instead of
`switch(kind)`.

### Gotchas
- **Preserve priority** (ordered early-return, not an unordered weight map) and **the single shared roll**
  — all candidates compare the *same* draw, so probabilities are conditional. `chooseEvent` already takes
  `roll` as a param; keep single-draw semantics.
- **Keep `events.ts` pure** — `eligible/chance/pick` stay `(ctx) => …`; the impure, stateful half
  (`spawn`/`tick`, holding `World` + `cart`/`goal`) stays in `zoneEvent.ts`. Moving that is the bigger part.
- **Open the union** (`ZoneEventKind` → open string alias like `PackageId`) or adding an event still edits
  four sites.
- **Don't absorb the Mycelia suppressor** (`suppressionAt`, `world.ts:2932`) — it's a global gate on
  whether the roll happens, not per-event eligibility.
- **Transient/host-only** — `ActiveZoneEvent` is never serialized, re-rolled per zone entry; no save/wire
  change. Don't silently "fix" the unseeded `Math.random()` — it'd change zone-entry outcomes.

### Effort: **Small–medium.** Selection-only registry (~½ day). Full "one row" — open the union across all
four sites + move `spawn`/`tick` onto the def + wire `PackageEvent` — ~1–2 days.

---

## Item 7 — `eventActivityAt` per-overlay weights → data

**Goal:** the bloom-activity sum is a literal table of per-overlay weights; a new overlay contributes
nothing without editing the method.

### Current state (re-derived)
- `eventActivityAt(zid)` — `world.ts:6672–6688`; sole caller `feedMyceliaActivity` (`:6661`). A hardcoded
  table: demon `+2`, crusade `+2`, conclave/fracture/contagion/deadwake/holdfast/invasion `+1`, plus a
  current-zone ambient `+1` and `encounters.length`. Each reads an **ad-hoc predicate**
  (`invasionOn`/`crusadeOn`/`ritualIn`/…) on the `WorldSim` typed caches (`sim.ts:76–126`).

### Target refactor
- Add `activityAt?(zid: string): number` to `WorldOverlay` (`overlay.ts:79`) — returns the
  severity-weighted contribution (0 when inactive). Each field implements it via its existing predicate.
- Put the **weight on the data def** (`activityWeight` on the overlay, seeded from the package, or a
  `ContentPackage`/`WorldHooks` field threaded via `OverlayBuildCtx`).
- `WorldSim.eventActivityAt(zid)` sums `this.overlays`; `World.eventActivityAt` delegates and appends only
  the two engine-local tail terms (current-zone `event` + `encounters.length`, which aren't overlays).

### Gotchas
- Two non-overlay contributors: `invasion` *is* in `overlays` (give it an `activityAt`); the current-zone
  terms stay an explicit tail. **Default every migrated weight to its current literal** (demon/crusade 2,
  else 1) so bloom pacing is unchanged. No rng, no save/co-op state. `activityAt?` optional → overlays that
  shouldn't feed the bloom just omit it.

### Effort: **Low (~½ day).** Behavior-preserving; the literals become the defaults.

---

## Item 3 — `WeatherKind` closed union → open registry

**Goal:** let a package add a weather kind as pure data. **Good news from the probe: nothing branches on a
specific kind** — every consumer is a `WEATHER_DEFS[kind].<field>` lookup, so the blockers are parallel
*edit sites*, not switch logic.

### Current state (re-derived)
- Union `WeatherKind` (`world/weather.ts:22`, 6 kinds, `clear` = no front). `WEATHER_DEFS` (`:66`, the
  registry of record — already holds `countMul/factionMul/strike/rampFrac/wind`). Satellites:
  `WEATHER_COLORS` (`palette.ts:57`, a *second mandatory* map), `KIND_WEIGHTS` (`weather.ts:82`, per-phase
  selection), `WEATHER_FX` (`weatherFx.ts:37`, **already `Partial`/optional — a real registry**).
- Consumers are all lookups: spawn bias `weather.ts:154`, strikes `world.ts:6239`, wind `world.ts:19083`,
  ramp `weather.ts:117`, map color/label `weather.ts:164`, renderer FX/crossfade `renderer.ts:1083`.

### Target refactor
- Open the union: `WeatherKind = KnownWeatherKind | (string & {})` — mirror `StampKind` (`zones.ts:99`).
- Fold `color` onto `WeatherDef` (retire the separate `WEATHER_COLORS`); fold `skyWeight?:
  Partial<Record<DayPhase, number>>` onto `WeatherDef` and rewrite `maybeSpawn` (`weather.ts:173–192`) to
  build its weighted pick by scanning `WEATHER_DEFS` — so a package weather row spawns automatically.
- **`WEATHER_FX` stays as-is** (already the "one FX row keyed by kind" registry — `docs/render/README.md`);
  just widen its key type. The `if (!def) return` guard (`weatherFx.ts:50`) already handles a kind with no
  FX. The renderer FX does **not** need to become a registry — it is one.
- Add a boot validator (mirror `validateStamps`) so the exhaustiveness the closed union gave you becomes a
  runtime check.

### Gotchas
- **Type-narrowing loss** when the union opens — mitigate by folding `color` into the def (can't desync)
  + the validator.
- **No serialization/save cost:** weather isn't in the snapshot or saves; fronts re-simulate
  deterministically from `manifest.seed` per client. But a package kind must be in every client's package
  set — guard unknown kind → `clear`/no-FX.
- **`clear` is the sentinel** (no front) — keep it special; don't require a `skyWeight`.

### Effort: **Low–moderate (~½ day).** Purely mechanical; no call-site branching to untangle.

---

## Item 4 — NPC-role-by-defId + zone-kind-by-id-prefix

### 4a — NPC role by literal def ids
**Current:** town NPCs are ordinary `MonsterDef`s (`townsfolk_smith:2486`, `_innkeep:2497`,
`_questgiver:2507`, `_caravanner:2520`); `MonsterDef` has **no role field**. Behavior is decided by
`defId === 'townsfolk_smith'` literals — vendor (`world.ts:7573,17195`), inn (`:7617`, `renderer.ts:2242`),
caravan (`:7805,8371`, `renderer.ts:2271`), town-build smith (`:2645`), and a nameplate via
`defId.startsWith('townsfolk')` (`renderer.ts:2234`). **Quest-givers already do it right** —
`QUEST_GIVER_IDS` is *derived* from `QUESTS` (`quests/defs.ts:127`); mirror that.
**Target:** add open `MonsterDef.npcRole?: string`; replace literal predicates with role scans (nearest live
actor whose def's `npcRole === 'vendor'`, etc.); replace the `startsWith` nameplate test with a def flag.
Fully-open endpoint = a small `NPC_ROLE_HANDLERS` (role id → interaction hook).
**Gotchas:** the *behavior* (vendor stock, Mireille's account-feature gates `world.ts:7625–7629`, caravan
mint) is still bound to the concrete NPC — a `role` field decouples *which body* fills a role; a brand-new
role still needs its handler. Don't overload the existing AI `tag`. No save/co-op change.
**Effort: Low (~2–3 h).**

### 4b — Zone categorization by id string-prefix
**Current:** `ZoneDef` has **no `kind` field**; category is sniffed from `z.id`. `id.startsWith('cave_')`
alone appears **34× across 13 files** (worldgen, world, and every overlay squat-guard). **Load-bearing
finding:** `mintCave` (`worldgen.ts:606`) *always* stamps `caveDepth` (`:649`), and every synthetic
off-graph zone (`cave_realm_`, `cave_necropolis_`, …) routes through it — so **`z.caveDepth != null` is an
exact equivalent of `startsWith('cave_')`.** The prefix is also overloaded: synthetic realms/necropolises
aren't caves thematically; they borrow the prefix to inherit *off-graph + cave-return travel*.
**Target:**
- *Immediate, near-zero-risk:* replace `id.startsWith('cave_')` with `z.caveDepth != null` at all 34 sites.
- *Proper:* add explicit `ZoneDef.kind?` and/or `offGraph?`, set at **mint time** in `mintCave`; fold the
  scattered `cave_`/`isle_`/`crusade_`/`demon_` guards into `zonePolicy` (extend `PolicyZone` with
  `kind`/`offGraph`) — the overlays already call `eventAllowed`, so they'd stop re-implementing the check.
**Gotchas:** `mintCave`'s layout branch runs **before** the rng roll — "the seeded draw order is a
compatibility contract" (`worldgen.ts:616`); pure read-substitution is safe, don't reorder draws. Caves
aren't persisted (no migration); authored surface zones *are* save-referenced by id, so a new `kind` is
additive/back-compat. Audit each of the 34 sites for which fact it wants (off-graph vs literally-a-cave).
Leave the `inCave` getter (`world.ts:1347`) — it's travel state, not identity.
**Effort: Low for the `caveDepth` substitution (~2–3 h + a cave-gen determinism regression pass); moderate
(~1 day) for the full `kind` + `zonePolicy` fold.**

---

## Item 5 — renderer per-feature draw blocks → feature-overlay painter registry

**Goal:** portals, dwell-rings, and world prompts are hand-coded per feature across four renderer methods;
a new world feature means new bespoke draw code. Mirror the doodad painter registry.

### Current state (re-derived, `src/render/renderer.ts`)
- **Portal family** — four near-clone loops in `drawEncounters` (`:485–553`): demon rifts, crusade gates,
  necropolis gates, fracture rifts; each names its own `world.xxxView()` and inlines geometry/colors/glyph.
- **Dwell-ring family** — six byte-identical arc-progress blocks in `drawExits` (`:1499–1576`) varying in
  *only* radius + stroke color; the same idiom recurs at the lockpick ring (`:1322`) and Bonewright pick
  (`:353`).
- **Prompt family** — "text above a world point," copy-pasted 6+ times: toll/voyage prompts in `drawExits`,
  four NPC prompts in `drawActor` (`:2259–2309`), the sail prompt in the `dock` painter
  (`painters.ts:939`), the fracture label (`:549`). (`drawCampfireHint` `:1417` is *already* array-collapsed
  — the proof this wants to be a registry.)

### Target refactor (mirror `DOODAD_VISUALS` → `PAINTERS` → `drawDoodads`)
Key difference from doodads: each feature has a *different* `world.xxxView()` accessor, so the def owns a
`source(world)` selector.
```ts
interface FeatureOverlayDef {
  painter: string;                       // key into OVERLAY_PAINTERS
  pass: 'underActor' | 'overActor';      // z-layer (portals/rings under; prompts over)
  params?: Record<string, unknown>;
  source: (w: World) => readonly { pos: Vec2 }[];
}
// OVERLAY_PAINTERS = { portalGate, progressRing, worldLabel, fallback }
private drawFeatureOverlays(world, pass) {
  const env = { ctx: this.ctx, theme: world.zone.theme, time: world.time, world };
  for (const key in FEATURE_OVERLAYS) { const d = FEATURE_OVERLAYS[key];
    if (d.pass !== pass) continue;
    const paint = OVERLAY_PAINTERS[d.painter] ?? OVERLAY_PAINTERS.fallback;
    for (const item of d.source(world)) paint(env, item, d); } }
```
Call `'underActor'` where the portal/dwell tail is today (~`:147`) and `'overActor'` after the actor loop
(replacing the NPC-prompt blocks). Adding a feature = one data row + (rarely) one painter — no `renderer.ts`
edit. ~250–300 lines of near-dup collapse into ~2 files (`src/data/featureOverlays.ts` +
`src/render/vis/overlayPainters.ts`).

### Gotchas
- **Z-layering is the real constraint** — the registry must carry `pass`/`order` (mirroring doodad `order`
  + the separate canopy pass), or prompts flatten under actors. Everything still lands under
  `drawCanopies`/`drawRoofs` (`:162–163`).
- **`performance.now()` vs `world.time`** — `drawExits` animates off wall-clock (`:1450`) while portals and
  doodad painters use deterministic `world.time`. Folding onto `PaintEnv.time` standardizes on sim-time (a
  subtle, harmless timing change — and better for replay/co-op determinism); call it out.
- **Keep painters stateless** — any fade/smoothing state stays on the renderer instance keyed by feature
  identity, the way `canopyFade` (WeakMap `:1196`) / `roofFade` (`:1223`) already do. Never stash mutable
  state on the registry.
- **Co-op safe** — every source is a `world.xxxView()` over replicated state; a client renders from its
  synced `World`. Give overlays the doodads' warn-once fallback for a typo'd painter.

### Effort: **Medium (~½ day).** Mechanical but spans four methods; care on the pass-order split and the
wall-clock→sim-time switch.

---

## Item 6 — panels `esc()` ×10 → one shared helper

**Current:** the memory "5×" is stale — there are **10 identical inline definitions** in `src/ui/panels.ts`
(nine `esc` at `375,1967,2002,2052,2129,2178,2365,2451,2497` + one `escAttr` at `520`), every body
character-for-character identical. No shared HTML-escape helper exists anywhere (grep for
`escapeHtml`/`htmlEscape` = 0). Other UI files also build `innerHTML` (lobby ×3, tooltip ×2, minigames ×1),
so a shared escaper has real reuse.
**Target:** a tiny new `src/ui/dom.ts` exporting one `esc`; import it, delete the 10 locals, rename the
single `escAttr` call site to `esc` (it escapes the same set — no behavior change). (Minimum alternative:
hoist one `esc` to `panels.ts` module scope.)
**Gotchas:** none of substance — pure lexical hoist; just grep `escAttr`'s call sites when removing it.
**Effort: Trivial (~15 min).**

---

## Suggested sequencing

Two natural session shapes:

- **A "low-risk sweep" session** (bundle, ~1 day): Item 6 (15 min) → Item 4b `caveDepth` substitution (kills
  34 id-sniffs, near-zero risk) → Item 3 `WeatherKind` → Item 4a `npcRole` → Item 7 `eventActivityAt`. All
  behavior-preserving, all land on an existing exemplar, all shippable in one commit each with the smoke gate.
- **The two marquee registries as their own sessions:** Item 1 (`kill()` handlers — highest value, budget
  for the `KillCtx` facade + non-tag edge cases) and Item 2 (`chooseEvent` — smaller, and it has a pre-built
  `PackageEvent` home to wire rather than fork). Item 5 (renderer painters) fits either as a focused ½-day.

Recommended first: **the low-risk sweep** — it clears five of seven items, proves the registry pattern
against the smoke gate, and leaves the two heavy refactors cleanly scoped. Note the natural pairing: **Item 2
and Item 7 are both event-system** and share the `RewardSpec`/package-def reconciliation, so doing them in
one sitting avoids touching `packages/types.ts` twice.
