# Skills & Combat — Session Brief

> Working backlog for the **Skills & Combat** slice, scoped for hand-off to an implementation session.
> Grounded against live code at `HEAD 65caa9f` (2026-07-07). Uncommitted working doc — relocate,
> commit, or delete freely. All `file:line` refs are from that commit; `world.ts` is ~21k lines and
> drifts fast, so re-confirm by symbol before editing.

## How to use this

- **Part 1** and **Part 2** are the two you asked to feed into a session — each is self-contained and
  independently shippable (one session, or one each).
- **Side notes A–C** are lighter: context + the exact seam, so a future session can pick them up cold.
- **Convergence callout:** Part 2 (the validator) and the skill-spec-2 "silent no-op combos" audit are
  the *same seam*. The no-op detection is the validator's flagship rule — I've merged them into Part 2.
  What's left of skill-spec-2 after that (the `reapers_sweep` circular-reap rework) is Side Note C.

Every part ends with the same gates: `npx tsc --noEmit` clean, then `npm run sim -- run --suite smoke`.

---

## Part 1 — Full minion-support pass  ⟶ PRIMARY

**Goal:** let a player's SUPPORT gems apply to the skills their MINIONS cast — e.g. a *Splitting* gem
that makes a Skeleton Archer's arrows split, not just tune the summon skill. Today it does nothing to
the arrows.

### Current state (grounded)
- Skills carry their supports as a per-instance `sockets` array — `SkillInstance = { def, level, sockets }`
  (`src/engine/skills.ts:2766`). There is no separate link table; the sockets ARE the association.
- A support takes effect through one path: `instanceMods(inst)` (`src/engine/skills.ts:2873`) flattens
  every socket's `mods` into the `extra` arg of every `sheet.get(stat, tags, extra)` query in
  `executeSkill` (`src/engine/world.ts:10585`). Tag grants (`grantedTags`, `skills.ts:2833`) and typed
  grafts (`instanceAim`, `instanceCascade`, …) ride the same sockets.
- **The enabling primitive already works.** `MonsterGrant.support` (`src/data/monsters.ts:92`) writes
  `target.sockets[slot] = { def: SUPPORTS[id], level }` in the grant loop
  (`src/engine/world.ts:9885–9890`); its own comment says these "flow through the SAME cast pipeline
  (instanceMods)." So sockets on a monster/minion skill instance are honored end-to-end **today** — it's
  just authored on the monster def, never driven by the summoner.
- **Where the gap is:** `spawnMinion` (`world.ts:13172`) mints the minion via `createMonster` — whose
  skills come from `def.skills.map(id => makeSkillInstance(...))` with **empty (null) sockets**
  (`world.ts:9875`, `skills.ts:2814`). The owner's summon-skill gems are read only to compute `ownerMods`
  (`minionDamage/minionLife/minionHaste/minionApply_<status>`, `world.ts:13227–13249`) applied as a sheet
  source. **The owner's gems never reach the minion's own skill sockets.** Minions then cast socketless
  through `ai.pickSkill`/`useOn` → `world.useSkill` (`src/engine/ai.ts:812,882`).

### Recommended approach — option (c): an explicit `minionSupports` payload
Chosen over "inherit a filtered subset of the summon skill's sockets" (blurs summon-scaling gems like
`legion_doctrine` with minion-skill gems, and 1–4 sockets can't express intent) and over "author on the
monster def" (not player-driven). Option (c) is the cleanest fit for *data + one pipeline*:

1. Add `minionSupports?: string[]` to `SupportDef` (`skills.ts:2481`) — a list of existing support ids.
2. In `spawnMinion`, right after `createMonster` (`world.ts:13210`), gather
   `inst.sockets.flatMap(s => s?.def.minionSupports ?? [])`. For each id → `SUPPORTS[id]`, for each
   `minion.skills` instance where `supportFitsInst(sup, skillInst)` holds and a null slot exists, write
   the socket — **reusing the exact null-slot search + write from the `MonsterGrant` loop**
   (`world.ts:9888`).
3. Because minions already cast via `useSkill → instanceMods`, `projectileCount+1` etc. take effect
   **with zero new engine math**. `supportFitsInst` auto-scopes `projectile` supports to the archer and
   skips the melee zombie — exactly "only the arrows split."
4. (Optional) mirror the same injection onto the conducted-cast order instance (`minionCast`,
   `world.ts:12152`) so owner-driven casts inherit too.

### Files to touch
- `src/engine/skills.ts` — one schema field on `SupportDef`.
- `src/engine/world.ts` — one injection block in `spawnMinion` (~`:13210`); optional second at `:12152`.
- `src/data/supports.ts` — author 1–2 shipping examples (a "Conjurer's <X>" gem carrying `minionSupports`).

### Scope boundary — WHITELIST what may ride a minion (important)
Restrict `minionSupports` to plain mod / tag / projectile-style supports. **Exclude** structured grafts
that assume a player seat / hotbar / mana reservation: `trigger` (needs `seatPress`, `useSkill:10157`),
`overcharge`, `curseOnHit`, `meta`, aura/guard/movement supports — nonsensical or exploitable on a minion.
Either skip any `SupportDef` carrying those fields, or validate the list against an allow-set (good first
customer for Part 2's validator).

### Gotchas
- **Don't double-count.** Summon-scaling gems (`legion_doctrine`, `fresh_ranks`, minion count) belong on
  the summon skill and already work via `ownerMods` — the explicit `minionSupports` list keeps the lanes
  separate.
- **Injection level.** `effectiveSkillLevel` reads `levelBonus` and is uncapped (`skills.ts:2859`). Pick
  the socket `level` deliberately — mirror `MonsterGrant`'s `1 + floor(lv/5)` (`world.ts:9880`) or the
  summon gem's own level. `bonusLevels` ("+1 to Minion Skills" gear) is NOT propagated to minions today.
- **Proc attribution.** Proc-bearing supports would fire with the MINION as caster (proc paths key off
  `actor.owner`/`actor.summonInst`, `world.ts:16191,18285`) — fine for damage/projectile supports, another
  reason to exclude trigger/meta.
- **Capacity.** Minion skills have 3 null slots by default but `MonsterGrant` may pre-fill some — reuse the
  null-slot search and skip gracefully when full.
- **Determinism / co-op.** The injection is pure given stable socket order (no new RNG). But whatever
  replicates minion spawns (`src/net/*`) must replicate the injected loadout too; the sim writes sockets
  directly (`src/sim/builds.ts:65`) so a geared minion sim build can exercise it.

### Verification
- Live: `__game` — summon, confirm the minion's projectile skill gains `projectileCount` with the gem vs
  without. Add a scenario or a geared sim build (`src/sim/data/builds.ts`) that sockets `minionSupports`
  and asserts minion DPS/hit-count moves.
- Gates: `tsc --noEmit`, `sim -- run --suite smoke`.

### Effort: **Medium** — mostly schema + one injection block + the whitelist; the mechanical payoff is free.

---

## Part 2 — Skill-def data validator (flagship rule: support×delivery no-op audit)  ⟶ PRIMARY

> **Correction to memory:** `src/data/validate.ts` **already exists** — the "no data validator file
> exists" note is stale. This is an *extension*, not a greenfield build.

**Goal:** catch nonsensical / contradictory / silently-inert skill data at load time — chiefly the
support gems that socket cleanly but do **nothing** because their graft is read at a delivery site the
host skill never reaches.

### Current state (grounded)
- `validateContent()` (`src/data/validate.ts:41`) — **WARNS, never throws** (`warn = console.warn('[content] '…)`,
  `:42`; "the game still runs"). Invoked at boot (`src/main.ts:338`) and in the sim harness
  (`src/sim/arena.ts:77`).
- Today it checks existence/coherence for passives, zones, structures, biomes, vocations, monsters
  (incl. skill mana-affordability + level-gated grants, `:229–255`), packs, unlocks, mercs, names, modes.
  **No skill×support×delivery check exists.** The monster-grant block (`:247–254`) is the precedent to
  extend — it already reasons about supports-on-skills, just for existence, not applicability.

### The no-op mechanism
`SkillTag` (socket currency) and `delivery.type` (execution branch) are **independent axes**. A support's
only socket gate is `requiresTags`/`excludeTags` (`skills.ts:2487,2489`), enforced by pure tag-set
intersection in `supportFits`/`supportFitsInst` (`skills.ts:2826,2846`) — **zero delivery awareness.** The
tag gate passes, but the grafted stat/spec is only *read* at a delivery-specific site the host's delivery
never hits. Tag ≠ read-site → the graft sits unread. (`Delivery` is a 17-kind union at `skills.ts:1529`.)

### Confirmed LIVE no-ops (re-verified against current read-sites)
| Support (id) | Grafts | Read only at | Silently no-ops on |
|---|---|---|---|
| `square_sigil` / `triangle_sigil` (`supports.ts:1251/1260`) | `aoeShape` | nova/ground/storm/aura sites | **cone** (triangle's `+15% more` still applies — *partial*) |
| `aftershocks` (`supports.ts:1219`) | `aoeScatter` | `spawnAftershocks`/nova/zone-explosion (`world.ts:14070`) | **cone / melee** |
| `spell_cascade` / `scattered_cascade` / `seismic_march` (`supports.ts:1837/1846/1855`) | `cascade` | `instanceCascade`, `case 'ground'` only (`world.ts:11592`) | **non-ground** (nova/cone/melee/…) |
| `fire_walker` (`supports.ts:858`) | `moveTrail` | `case 'dash'` only (`world.ts:11881`) | **every blink skill** — `warp`,`teleport`,`shadow_step`,`death_step`,`frost_blink` (hard no-op) |

### The parked prior audit — reuse with care
A sibling session already performed this exact audit: `…/scratchpad/map/bug_meteoric.md` (a *different*
session's scratchpad, not in the repo). Root cause verbatim: *"The support-applicability gate is tag-only;
the stat it grafts is only read at event sites the skill's delivery never reaches."* It lists ~9 no-op
combos and proposes the same two fixes below. **Two caveats:** (1) its line numbers are badly stale
(`fire_walker` cited at `supports.ts:97-99`, now `858`); (2) some symptoms were since patched piecemeal —
e.g. the `lingerField`-on-cone case is fixed (`fieldAt` now set in 13 delivery branches incl. cone at
`world.ts:11349`), but `aoeShape`/`aoeScatter`/`cascade`/`moveTrail` read-sites were NOT broadened, so the
table above is still live. **Re-derive every read-site from current code before flagging — do not trust the
parked note's combo list wholesale.**

### Proposed rules (all `warn`-level to start — no gameplay change, low risk)
1. **Support×delivery no-op.** Build a `graft/stat → delivery-types-that-read-it` map, then loop
   `SUPPORTS × SKILLS`: for any support that *fits* a skill by tags but whose graft's read-deliveries
   exclude that skill's `delivery.type`, warn. Seed the map from the instance-readers that already encode
   this — `instanceCascade`/`instancePulse` fall back to `delivery.type==='ground'` (`skills.ts:318,354`);
   `instanceTrail`/`instanceFissureTrail` key off `'projectile'` (`skills.ts:287,756`).
2. **`decay` + `persistent` mutual exclusion.** Both live on `SummonDelivery` (`skills.ts:1001` persistent,
   `:1010` decay; the comment states they're exclusive). Read in independent `if` blocks with no guard
   (`world.ts:13201` vs `13262`) → a minion silently gets a decay death-clock AND a respawn contract.
   Trivial rule: iterate `SKILLS`, warn when `delivery.type==='summon' && delivery.decay && delivery.persistent`.

### Two implementation levels (pick per rule)
- **Warn-only (recommended first):** extend `validateContent` in the existing style. Ships value with zero
  gameplay risk; run it and read the `[content]` console warnings.
- **Enforce at socket time (optional, later):** add `SupportDef.requiresDelivery?: DeliveryType[]`
  (`skills.ts:2481`) and honor it in `supportFits`/`supportFitsInst` (`skills.ts:2826,2846`) to *hide/refuse*
  no-op sockets. Bigger blast radius — do it only after the warn pass proves the map is accurate.

### Gotchas
- **Tag ≠ delivery.** `'aoe'` spans 8 delivery kinds — key off `delivery.type` + the specific graft, never
  tags alone.
- **`grantsTags` laundering.** `dive_bomb` grants `'aoe'` to a `dash` so cascade-type gems can socket; a
  dash granting `'aoe'` still won't read `aoeShape`. Delivery checks must survive granted-tag merging
  (`supportFitsInst`, `skills.ts:2847`).
- **Partial no-ops are per-field.** `triangle_sigil` applies its `more` damage where its `aoeShape` dies —
  flag per-graft, not per-gem.
- **No-`requiresTags` supports fit everything** (e.g. `malpractice`, `virulence`) and no-op on any skill
  lacking the relevant event — pure tag logic can't catch these; the delivery/read-site map can.

### Verification
- Boot the game or `sim -- run --suite smoke`, read `[content]` warnings; confirm the four table rows fire
  and known-good combos (e.g. `splitting` on a projectile) stay silent (no false positives).
- Gates: `tsc --noEmit`, `sim -- run --suite smoke`.

### Effort: **Medium** — the `decay/persistent` rule is trivial; the value (and the care) is in deriving an
accurate graft→delivery read-site map from live code.

---

## Side Note A — Inverse-whirlwind channel family
*Nova-ring walker, decaying-speed channels. You wanted a fresh session with random-mechanics tie-ins.*

The three seams exist and compose: **`AimSpec`** (`skills.ts:157`; `sequence` plays an evenly-stepped
figure baked at cast, `random` scatters) — the ring shape; **`RampSpec`** (`skills.ts:1645`, evaluator
`rampValue`; **negative `per` = a decaying/converging term**) applied by `ChannelSpec` to damage/area
(`rampAoe`)/arc (`rampArc`)/cost — the "inverse/decay" dial; **`channelMobility`** (`stats.ts:604`,
`world.ts:22563`) — the "walk while channeling" dial. Already ~80% there: `pestilent_nova`
(`skills.ts:2617`) is a channeled `move:'slowed'` nova-walker; `whirling_reap` (`skills.ts:3886`) is the
even 360° ring figure. **The one real gap:** there is no `rampMove`/pulse-interval RampSpec on
`ChannelSpec` (ramp fields are damage/area/arc/cost only) — so "decaying *movement speed* as you hold" needs
a new `rampMove` field feeding `channelFactor` at `world.ts:22577`. The curve machinery to power it
(negative-`per` RampSpec) already exists; everything except decaying move-speed composes from the seams as-is.

## Side Note B — Rupture/rot supports on DoT (stat-path) applications
*Currently skill-path only; stat-applied ailments bank no rupture.*

Two tiers. **The cheap, high-value one:** the stat-path `apply_<sid>` sweep at `world.ts:15488–15530` —
the caster AND the socketed gem mods ARE in scope here (same `tags`/`extra` vars the skill path uses). The
only reason a stat-applied bleed/poison with `Malpractice` (`supports.ts:2225`, grants `dotRupture`) banks
no rupture is that the arming logic (`dotRupture`/`curseRupture` → bake `rupture`/`ruptureType`) lives
*only* inside the skill branch (`world.ts:15334–15352`) and was never factored into a shared helper. **Fix
= mirror those ~18 lines after the dps compute at `15499–15502`** (doom's `cullsAtLethal` is already
mirrored there, `15508–15513` — the precedent). **The genuinely hard tier** (defer): truly caster-less
DoTs — zone/ground auras (`world.ts:17564,17605`), zone-enter (`19126`), proc-status (`15953`) — apply via
`baselineStatusDps` with **no socketed instance in scope**, so arming them needs threading an owner+inst.
Do the cheap tier; leave the caster-less tier noted.

## Side Note C — skill-spec-2 remaining loose end
The "silent no-op support × delivery combos" audit you flagged here is **absorbed into Part 2** (it's the
same seam — the validator's flagship rule). What remains distinct in skill-spec-2 is the **`reapers_sweep`
circular-reap rework** (the report wanted the reap re-worked into a proper circular sweep). Small, isolated,
pick up whenever — no shared seam with the above.

---

### Suggested sequence
1. **Part 2 first, warn-only** — it's low-risk, and it immediately becomes the guardrail that validates
   Part 1's `minionSupports` whitelist and surfaces the four live no-ops for a follow-up data pass.
2. **Part 1** — the marquee feature; lands with real engine leverage for near-zero new math.
3. Side notes B (cheap tier) → A (needs the new `rampMove` field) → C (isolated) as appetite allows.

---

## Session outcome — 2026-07-07 (implementation session)

Shipped, in the suggested order, each gated on `tsc --noEmit` + `sim baseline check --suite smoke`:

- **Part 2 → `3f4016d`.** GRAFT_READ_SITES map + catalog sweep + pair-precise MonsterGrant audit +
  summon decay/persistent rule, all warn-only. Two corrections earned during re-derivation: (1) the
  brief's table missed `buried_charge` (its `pulse` graft is ground-only, same family as cascade);
  (2) construct skills with `castSkillId` genuinely READ **stat** payloads through the deployed
  object's `parentSkill` sheet source — the map hops one level for stat rows, while instance-read
  grafts (trail/cascade/…) correctly stay flagged (sub-instances are minted with null sockets).
  11 no-op families surface at boot for a future data pass.
- **Part 1 → `f271975`.** `SupportDef.minionSupports` exactly as specified (option c), with the
  whitelist shipped as an ALLOW-set (`MINION_SAFE_SUPPORT_FIELDS` + `supportRidesMinions` in
  engine/skills.ts) so new structured grafts default to unsafe. Injection at `spawnMinion` AND the
  conducted-cast order path (each minion's own `summonInst`). Payload rides at the carrying gem's
  level. Ships `conjurers_splitting` / `conjurers_arcing`; validator rules cover existence, safety,
  and summon-reachability. Probe pair `minion_probe_summoner_{archers,conjurer}_l10`:
  dps_minions 6.18 → 10.68, hits_out 10.8 → 24.6. (Probe gotcha: dummies are `passive` and minion
  AI ignores scenery — minion probes need waves that fight back.)
- **Side note B, cheap tier → `aae9be9`.** dotRupture/igniteToBomb/curseRupture arming mirrored into
  the stat-path sweep beside the doom precedent; live-checked (stat-path bleed banks rupture beside
  skill-path poison). Caster-less tier stays deferred, as scoped.

Still open: the socket-time enforcement level (`SupportDef.requiresDelivery`), Side note A
(`rampMove`), Side note C (`reapers_sweep` rework), and the no-op data pass the new warnings feed.

---

## Session outcome — 2026-07-08 (minion-support OVERHAUL: forwarding replaces the wrapper lane)

Part 1's `minionSupports` design (option c) is **retired**. The wrapper-gem indirection (Conjurer's
Splitting carrying a `['splitting']` payload list) demanded a parallel gem per forwardable support —
clutter, player confusion, and an ALLOW-set that defaulted every new axis to minion-unsafe. The overhaul
inverts all three:

- **The socket IS the payload** (`world.forwardSummonSockets`): every gem socketed into a summon skill
  is copied (at the carrier's level, `SupportInstance.forwarded`) into the minted minions' own skill
  instances wherever it fits — appended past the MonsterGrant kit slots, deduped by id, evaluated in
  SLOT ORDER so `grantsTags` compose aboard (Faultfinder hands Cleave the `fissure` tag; Tectonic
  Echoes follows it on). Both call sites kept (spawnMinion + conducted `minionCast` orders). BOTH LANES
  stay live: the same gem keeps feeding the summon's own instanceMods (minion damage/life/count,
  contracts, devour), and the crew lane reads everything else — disjoint stats in practice.
- **Rides-by-default** (`MINION_SEAT_BOUND_SUPPORT_FIELDS`): the ALLOW-set flipped to an exclusion set —
  only payloads that genuinely demand the player's seat refuse to forward (trigger/triggerPermit,
  overcharge, meta, strikeTiming, curseOnHit/curseField, auraDuration/reserveLife, gate/chargeCost).
  Everything else — the whole fissure family, cascade/pulse, followUp, zoneFollow/exposure/zoneGrow/
  pendulum, echo, tether, brood, zoneEmit, even nested `summon` grafts — boards minions. The partition
  is COMPILE-CHECKED (`_SupportFieldPartitionCheck`): a new SupportDef field fails tsc until classified.
- **Crew-aware socket gate** (`supportFitsInstOrCrew` + `World.summonCrewSkills` over the pure
  `summonCrewOf`): a gem may socket into a summon skill when the minted crew casts something it fits —
  monsterId/pool crews resolve statically (base skills + level-gated grants), corpse crews
  (`fromCorpse`, Raise Spectre/Revive) are 'unknowable' (any riding gem boards; fit resolves per-body
  at spawn against what was actually raised). Splitting therefore REFUSES a warrior/zombie crew and
  boards the archer's bow — "only socketable where it can matter", with zero per-support data.
- **Live resync** (`World.resyncMinionSupports`): socket/unsocket/gem-level-up strip and re-mint the
  `forwarded` entries on living minions of that exact instance (constructs excluded — spawn parity;
  kit gems untouched; instance identity, so co-op seats never cross-contaminate).
- **Audit follows the pipes**: the no-op sweep gained the CREW HOP (a graft is read when a crew
  member's tag-fitting skill reads it) and now also sweeps crew-fit pairs, so aoe-stat gems boarding a
  melee crew get flagged crew-inert. Sim injector legality mirrors the real gate (instance fit incl.
  composed grants, or crew fit).

Verification: probes `minion_probe_summoner_{archers,conjurer}_l10` (id kept, now REAL splitting)
6.2 → 11.43 dps_minions; NEW `minion_probe_summoner_{warriors,faultfinder}_l10` 13.31 → 30.32 (the
warriors' Cleave tears fissures they detonate by chasing — zero player input). Live-checked: archer
trio (splitting+volley+firing_line all board bone_arrow), Faultfinder→TE composition aboard Cleave,
Raise Spectre per-body fit (archer corpse takes splitting on its bow, warrior corpse takes nothing),
live gem-swap resync, real socketSupport gate accept/refuse, `⤳ boards the crew` chips in the book.
`npm run check` + `sim baseline check --suite smoke` green; suite `minions` bundles the A/B pairs.

Still open (inherited): `SupportDef.requiresDelivery` socket-time enforcement, Side note A (`rampMove`),
Side note C (`reapers_sweep`), and the no-op data pass — now with crew-inert rows in its feed.

### Addendum — 2026-07-08 (THE LANE ROUTER: a gem serves exactly the lanes it fits)

User-reported bleed from the overhaul: crew-admitted gems sat in the summon's sockets, and every
host-side payload reader picked them up — Alternating Strikes on Summon Skeleton Warrior alternated the
warriors' cleaves (intended, glorious) AND the summoning cast itself (accidental: the tag gate used to
guarantee everything socketed fit the host; the crew gate broke that invariant). Legion Call's cast-
shaping identity was suddenly competing with any melee gem.

Fix — `hostSockets(inst)` in engine/skills.ts, the LANE ROUTER: every payload reader (all instanceX
readers, socketSpec, grantedTags, effectiveSkillLevel, instanceMods, the world.ts inline scans, actor
conditional-mod cues) filters to sockets whose tag gate passes against the def's tags plus the grants of
other HOST-SERVING gems, computed to fixpoint (arrangement-independent, monotone — matches the gate).
Crew-only gems are invisible to the host cast, including its cost (socket scarcity is the price of a
crew gem). Hybrid defs opt into both lanes BY TAGGING — pure data, no flags. `crewSkillsServed` is the
crew-side mirror (composes riding gems per crew skill: Tectonic Echoes rides Faultfinder's granted
'fissure' aboard Cleave), now the one truth behind the socket gate, the ⤳ markers/tooltips, and the sim
injector's legality check. forwardSummonSockets gained the same fixpoint (out-of-order socket
arrangements forward fine). Validator: MonsterGrant pairs that don't tag-fit their target now warn
(current data is clean); the sim injector notes that force-socketed misfits are genuinely inert.

FORGEBOUND became the hybrid showcase: proc-conscripted minions (`effect.type: 'summon'`) now bind
`summonInst` to the striking instance and receive forwarded gems — a melee skill carrying the proc acts
as melee AND summon at once: Alternating Strikes swings the player's ±70° figure and the forged blade
wraiths' own strikes alternate the same way (live-verified: 3 wraiths, whirling_reap + claw both
carrying the forwarded gem). Live-verified end-to-end: summon cast steady while warriors alternate,
Legion Call alone on the host lane (its +1 body per cast and mana price intact beside the crew gem).
Probes: archer/conjurer pairs unchanged (6.2 / 11.43); faultfinder pair 31.15 (was 30.32) with zero
warnings; smoke baseline green.

Aim-transform QA gotcha for the record: Alternating Strikes is a bearing SEQUENCE (steps [-70, +70],
pause 0.2) — the swings are SCHEDULED, so synchronous eval reads see zero damage; step the world (and
give the figure flanking targets — a dead-center dummy sits outside both ±70° arcs of a 130° cleave).
