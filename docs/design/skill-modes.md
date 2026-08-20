# THE SKILL-MODE TREES — design charter v2 (the settled shape)

**Status: DESIGN SETTLED — nothing is built.** v1 (2026-08-15, an options
draft with seven decision cards) was walked to rulings the same day, waves
1–3; this v2 records the settled shape and retires the options prose. Her
rulings are dated inline; anything marked **DIAL** is a build-time lever,
not a ruling — tune freely at the named seat. The ruling log and session
repo-facts live in the `skillmodes-design-pass` memory. Build movements are
in §9; each awaits her go.

The seed, her frame: *"a miniature skill tree for skills themselves"* —
wild_strike leveling up picks a WIDER arc (area) or a NARROWER dead-ahead
arc (single-target sustain), *"as long as we could truly come up with
mutually-exclusive ideas."* The batch-54 wildstrike A/B endpoints are the
measured proof the trade is real (§4).

---

## 1. The settled shape at a glance

| axis | the ruling (2026-08-15) |
|---|---|
| Skill level cap | 10 → **20 SOFT cap**; effective level stays **uncapped** — no numeric clamp, "+Skill level" investment is a first-class endgame axis |
| Gem drops | **Always level 1** (the `GEM_DROP_CFG.preLevel` deep-zone roll retires; supports already drop `{level: 1}`) |
| Leveling currency | **Ability Essence I–IV** — a DEDICATED wallet-counter family (never bag items), zone-floored world drops + vendor-sold |
| The bands | **`SKILL_LEVEL_BANDS = [5, 10, 15, 20]`** — Shape B locked: tier N feeds levels inside band N; ONE array, everything derives |
| Ability points | **One per band completion** (levels 5/10/15/20) = 4 at cap |
| The trees | **2 branches × 3 rungs + 1 neutral; P = D + N exact cover; HARD BRANCH LOCK** (first point seals the rival branch; neutrals exempt) |
| Respec | **A Sacrificial Font ritual** — full-tree reset of one skill, band-priced |
| The Font | Repurposed as the **merge / convert / reset station** (Lastlight + Ports); its old gems→points lane dies with points |
| Skill points | **Retired from skill leveling**; character level-up keeps granting the Passive point only |
| Supports | **Cap stays 5** (`MAX_SUPPORT_LEVEL`); the essence currency falls through; parity deliberately deferred |
| UI home | The inventory drawer currently labeled **"Build" renames to exactly "Skills"** |
| Migration | **None owed** — save-incompatibility / new-game acceptable (her word; the saves-disposable doctrine) |

---

## 2. The leveling economy

### The cap

`MAX_SKILL_LEVEL` 10 → 20. The effective cap is **structurally absent** —
effective level (points + gem `levelBonus` + gear `bonusLevels`) is already
unbounded in the engine (`perLevel` compounds, over-cap thresholds fire),
and no clamp is introduced: a clamp is a number somebody would eventually
tune around. Display ceilings, if any, are presentation.

Consequences owned by **M-ECON** (§9), all rescale-lane by the v1 boundary
law: the per-level growth curve re-authored for 20+deep-effective reach
(+12%/level × unbounded effective is a different game than × cap-10);
the **threshold re-seat audit** (rows authored at 11 as "over-cap" become
mid-band; over-cap authoring moves past 20 — a new teasing lane); the sim's
band definitions (the L1/5/10/20 powercurve tables are the before-picture).

### Ability Essence I–IV

A **dedicated currency family** — her dopamine ruling, verbatim-near: a
unified currency risks *"less of a spike… 'okay, time to convert and
maximize'"* where the wanted moment is *"oh yeah, awesome!"* A dedicated
drop is an EVENT: it has a name, a color, a floater, and a floor — deep
zones advertise themselves by what falls there.

- **Wallet counters, never bag items** (ruled — bag tiles would be
  "annoying rather than fun"). The Descent's essence-packet pickups are the
  drop-form precedent; no tetris pressure, no stacking question.
- **The name keeps "Essence" deliberately** — the game's identity register,
  three voices of one metaphysic: raw tints (Coarse→Pristine — the material
  the world breaks into), **Ability Essences** (I–IV — the refined form,
  skill food), Mortal Essence (the reckoning's fold). The vendor sell lane
  IS the refinement fiction. Tier colors mirror the four-step ladder the
  game already speaks everywhere (rarities and tints share it). **DIAL:**
  I–IV numerals are the working names; adjective names in the tints' voice
  remain open for a naming pass.
- **Zone-level drop floors per tier** (**DIAL:** the floor table; shape =
  `minDropLevel`/Descent depth-lock precedent). Drop rates gradient by tier
  (**DIAL**).
- **Costs:** +1 level per use, gated to the tier's band; count-per-step is
  the curve (**DIAL** — `skillLevelEssenceCost`'s existing shape carries
  over re-targeted: it is ALREADY banded ≤5/≤10/≤15/16+, written before
  this design existed).

### The one array

```
SKILL_LEVEL_BANDS = [5, 10, 15, 20]
```

Everything derives: essence tier count = array length; tier N feeds levels
inside band N (half-open — tier I usable at levels 1–4 stepping into 2–5,
tier II at 5–9 into 6–10, …); an Ability point mints at each band
COMPLETION; the soft cap is the last entry; P (points at cap) = array
length. Flip the array and the whole economy re-derives — Shape A
(`[4,8,12,16,20]`, 5 tiers, 5 points) remains one edit away.

**The coupling law (named in wave 2, still the one real constraint):** tree
budgets are authored per skill against P. The array is cheap to move before
M2 authors trees at scale, expensive after. P = 4 is blessed now (§3);
re-blessing it after the catalog wave means re-authoring trees.

### What retires with it

- The skill-point grant at character level-up
  (`PROGRESSION.skillPointsPerLevel`, world.ts:20471) retires; **the
  level-up beat keeps the Passive point** (ruled: "obscenely useful" — the
  moment is carried). An essence-purse-per-level-up stays a back-of-mind
  option, not built.
- `levelUpSkill`'s point lane, the unlearn point-refund, and the font's
  gems→points sacrifice all retire together (the font's new life: §5).
  `essenceLevels`' no-arbitrage bookkeeping dissolves — all levels are
  currency-fed.
- **Supports:** cap stays 5; levels 2–5 price in low-tier essences through
  the existing `supportMul` idiom (supports already price as magic ×2 in
  the current curve). No points anywhere. Parity (supports at 20 with their
  own bands) is deliberately deferred, thought through later.
- **Migration: none owed.** Her ruling: easiest path wins — save
  incompatibility / delete saves / require new game are all acceptable
  (the standing saves-are-disposable doctrine). If a grandfather falls out
  trivially (keep levels, zero the wallets), take it; build no conversion
  machinery.

---

## 3. The trees

### The grammar

Per moded skill: **two branches of three rungs each, plus one neutral
node.** Points at cap = 4 = one full branch + the neutral — **the exact-
cover law (P = D + N)**. Under the hard lock (below), scarcity no longer
enforces identity, so the budget's job changes: at cap you *complete* your
chosen identity. "I finished my build" is a real moment; the en-route
texture is rung order and when the neutral is taken.

Rung anatomy:

- **Rung 1 — the identity commitment.** The big geometry swap (the §4 pair
  payload: the Duelist's arc-16, the Sprinkler's spread-130). It lands at
  level 5 with the first point, and **placing it IS the lock**.
- **Rungs 2–3 — deepenings.** The identity intensifies in its own
  character; rung 3 is the capstone. Each rung is a measurable A/B row
  (the wildstrike rig pattern applies per rung, not just per endpoint).
- **The neutral — one identity-free utility rung** (cost, range, a quality
  knob). Pickable any time, exempt from the lock (ruled).

### The hard lock (ruled, wave 2)

Selecting into one branch **seals the other entirely** — not
budget-starved, refused. The first point spent in a branch stamps it; the
rival branch greys with refusal words in the standing idiom ("The
Sprinkler's path is sealed"). Branch state is **derived from spent nodes**,
never stored beside them — the orphan-drop law then handles authored
renames for free. The lock gives every pair a second enforcement layer:
structural opposition where the engine cannot compose (§4's tests), and
allocation refusal even where it theoretically could.

### Respec — the Font ritual (ruled, wave 3)

Un-choosing is a **Sacrificial Font recipe**, not a panel button: a
full-tree reset of one skill (never node-wise — partial refunds create
prerequisite paradoxes), priced in the skill's current band (**DIAL** —
e.g. one Essence III to reset a level-14 skill: a consideration, never a
wall). Her word: the ritual *"serves the name of Sacrificial Font very
well."* Levels are monotonic (nothing de-levels), so spent points can never
orphan outside the reset.

### Names are data

Node and branch names/descriptions are plain strings on the rows — renames
are one-line edits forever (ruled: "The Sprinkler" stands today and may
want to *"sound slightly more intimidating later"*; the mechanics beneath
are the settled part).

---

## 4. The exclusivity principle + the ratified pair table

**Ratified as direction, wave 3:** *"really are hitting the exact sort of
theme… the implementation and the actual mechanics are perfectly sound and
precisely what we'd want."* Names provisional (above); pairs remain
markable/extensible — the admission tests are the standing law, the table
is the living roster.

A pair qualifies when both options spend the SAME budget on OPPOSED
geometry, tempo, or count — one of three tests admits it:

- **ONE-FIELD** — both write the same spec field with opposed values
  (`arcDeg` cannot be 16 and 30; `castMode` is one word; a ramp curve
  cannot be flat and growing).
- **ONE-SLOT** — the engine already arbitrates the axis first-wins
  (`instanceUseCharges` "one economy per slot", the kindred
  cascade/pulse slot, `instanceFuse` "one clock per use").
- **QUANTA** — the count law cannot fraction (minion plies; the 1/batch
  owner fold).

**The anti-test:** anything shippable as two support gems socketed together
without contradiction is support territory — supports compose, modes
oppose. **The buckler_strike exclusion stands** (the 08-15 positioning-
identity ruling): its flank figure forks along no axis in wave one.

The twelve (rung-1 payloads; only pair 1 measured — every other pair owes
its A/B table at the wildstrike rig grain before numbers bless):

| # | skill (family) | branch A | branch B | the opposed axis |
|---|---|---|---|---|
| 1 | **wild_strike** (melee channel) — MEASURED, BUILT (M0) | **The Sprinkler**: arc 30 / spread 130 — pack 171.3, 5/5 victims | **The Duelist**: arc 16 / spread 24 — solo 108.7, 1 victim | One sector geometry (`aim.random.spreadDeg` + `arcDeg`) |
| 2 | **piercing_arrow** (projectile) | **The Line**: pierce — the shaft survives contact | **The Tree**: forks — the shaft dies birthing children | The first-contact ledger spends once; `pierce` postpones the death `forks` triggers on |
| 3 | **fireball** (projectile) | **The Bloom**: one heavy orb, `explode` up | **The Fusillade**: `fire:'salvo'` stream, no blast | `fire` is ONE style per cast |
| 4 | **arcane_missiles** (channel) | **The Crescendo**: `ramp` — the hold is the payoff | **The Staccato**: flat from beat one, mobile | One ramp curve per channel |
| 5 | **whirlwind** (melee channel) | **The Gathering Storm**: ramp up, `rampMove` roots | **The Juggernaut Roll**: flat, `rampMove` frees | One `rampMove`, sign opposed |
| 6 | **sunder** (ground) | **The March**: the native cascade walks | **The Epicenter**: the native lane becomes a pulse | THE KINDRED SLOT verbatim (`instanceCascadePlan`/`instancePulsePlan`) |
| 7 | **summon_skeleton** (summon) | **The Legion**: count up, small | **The Champion**: one great body | THE QUANTA LAW — a batch is one shape |
| 8 | **flame_totem** (construct) | **The Bastion**: one engine, full | **The Battery**: `maxActive` 3, fractions | The construct echo of 7 |
| 9 | **shield_up** (guard) | **The Tower**: narrow arc, huge life | **The Ring**: ~300°, thin | One stance budget over arc × life |
| 10 | **dash_strike** (movement) | **The Passage**: `phase` through | **The Tackle**: grab-carry seizes first contact | One collision policy per run |
| 11 | **teleport** (movement) | **The Long Stride**: deep, one cooldown | **The Flicker**: a charge bank of short steps | One economy per slot + one displacement budget |
| 12 | **heavy_strike** (melee) | **The Mountain**: long bar, one blow | **The Flurry**: `castMode:'multitude'` | `castMode` is one word |

Reserve: **meteor_storm** Focus-vs-Tempest (one storm footprint), plus the
`atEnemies` hunt-vs-promise targeting fork on the same delivery.

**Pair 1's numbers as of M0 (2026-08-19/20, re-measured on the landed base
row — supersedes the batch-54 pre-landing endpoints; L20 bare, front-ring,
3 seeds):** base (30/90) solo 54.4 / pack 193.9 · Sprinkler solo 32.2 /
pack 171.3 (5/5) · Duelist solo 108.7 / pack 108.7 (exactly its solo — 1
victim by deterministic geometry, the clean pin shape for future pair
rigs). Two flags FOR THE BLESSING PASS (numbers are DIALs, unblessed by
design): the Duelist's solo ceiling reads high (~2× base), and the
Sprinkler's 130° spread OVERSHOOTS a clustered 100° front (pack 171 <
base 194 there — its win case is surrounds and wide rings; a live-pilot
surround scenario reads it differently again, both expectations recorded
in the smoke rows). Rung-2/3 payloads and the blessing pass own the
re-tune; the identity trade itself is proven.

**The kindred-metric clause (unchanged, now per rung):** the support no-op
matrix proves a rung isn't byte-inert; only the measurement pass proves two
branches (and now two rungs) play *differently*. Both gates stand; a pair
whose columns read alike is not done.

---

## 5. The Sacrificial Font (repurposed — ruled "nailed it", wave 2)

**Station grammar** (dwell → panel → deterministic recipes; the
salvage-station shape, no restock clock — recipes, not stock), seated in
**Lastlight + Ports**. Its old job (gems → skill points) dies with points;
its new life earns the name three ways — gems merged, essences broken,
choices unmade:

- **MERGE:** 3× same skill, same rarity → 1 at +1 rarity (rarity = sockets:
  1/2/3/4). Per-rung ratios are one config row (**DIAL** — "3 whites→blue,
  5 blues→yellow" was the sketch). Laws, all first-commit: the merged gem
  keeps the **highest input level** (investment never silently vaporizes);
  socketed supports **auto-return to the bag** before inputs are consumed;
  **the keeper's mark refuses font recipes** exactly as it refuses salvage
  (`locked` extends — the accidental-merge horror story is closed
  structurally); **strict same-skill** (576-skill catalog makes triples a
  real chase; the gemdrop-ledger/commission lane is the aimed supply).
- **CONVERT:** Ability Essence tier up/down (wallet math): down pays out
  generously (IV → 3× I — **DIAL**), up costs per-rung (3:1 — **DIAL**).
  Deliberately lossy end-to-end (the PoE map-vendor valve): conversion
  never beats farming at depth — an inequality the economy audit can pin.
- **RESET:** the tree respec ritual (§3).

**The division-of-labor law:** vendors convert BETWEEN economies (tints →
Ability Essences, §6); the Font converts WITHIN them (tiers, rarities,
choices). Co-op attribution follows the standing personal-economy station
laws (per-seat dwell).

**Future-pass seed (her word, wave 3 — recorded, not in these movements):**
the Font as the **passive-point respec altar** too — planned-passes #25.

---

## 6. Vendors — the sell lane (ruled, wave 3)

Brandt and kin **SELL Ability Essences priced in tints** — the direct
conversion seam, and the refinement fiction made literal. **Sell-direction
only** (no buy-back, or the loop becomes a free exchange rate).

**Tier availability rides the broader-wares ladder, echoing the drop
floors** (ruled: "hits the same sort of tier-structure that I thoroughly
enjoy") — I–II at the base counter, III behind a wares rung, IV deep
territory (chandler/delver/port-tier — **DIAL** per rung). The trade gate
(Salvage Station unlock) already fronts all purchasing; nothing new.

Drop-at-1 simplifies the shelves: `preLevel` retires, `gemBracket`'s level
half moots (its pool half stands), Mireille's authored mints and the
standing order are untouched (the drop INDEX counts mints, not levels).

---

## 7. UI

- **THE SKILLS DRAWER:** the inventory drawer currently labeled **"Build"
  renames to exactly "Skills"** (ruled, wave 3 — to the player it is where
  their skills live, not "the build"). Player-facing strings only; code
  identifiers stay `skill*`/`build*` as they are. The handle today reads
  `📖 Build — N pts` (panels.ts:2701) — the pts counter retires with the
  point economy; its replacement readout is a **DIAL** (unspent tree
  points, or the essence wallet's glyphs). Fitting closure: this drawer
  replaced the old Skill Book (panels.ts:4451) — "Skills" completes the
  circle.
- **Per-skill rows** in the drawer: a level bar with band tick-marks, a
  feed control lit when the wallet holds the current band's essence, the
  point counter, and the miniature tree — two branches fanning from a
  root, the sealed branch greyed with its refusal words. The tree is
  hidden until the first point exists (level 5); a quiet **waiting-pip**
  marks an unspent point. The pip is the milestone moment; a Calling-style
  popup (queued to the next disciplined calm, never mid-combat) remains an
  optional layer (**DIAL**).
- **At a glance:** the bar icon wears a tiny branch pip (the beatPips look
  idiom); the tooltip's first line names the picked branch.
- **The Font screen:** recipe tabs (Merge / Convert / Reset), drop-zones,
  deterministic preview lines ("3× Firebolt (Magic) → 1× Firebolt (Rare),
  level 7 kept"), keeper's-mark refusals in its standing words.

---

## 8. Schema + the QA line (direction held from v1, updated for trees)

- **`SkillDef.tree`**: branches (id/name/description + 3 rung rows) + the
  neutral row; every node payload = `mods` + TYPED WHITELISTED `over` spec
  overrides + optional `graft` (the passive-choice hybrid). Names are
  presentation data (§3). **DIAL:** the M1 override whitelist (v1's
  proposal stands: arc/spread, ramps, `fire`, pierce/forks, explode, summon
  count/`maxActive`/`monsterId`, guard arc/life, dash phase/grab,
  `useCharges`, `castMode`).
  **AS BUILT (M0, 2026-08-19/20):** `SkillTreeSpec`/`SkillTreeBranch`/
  `SkillTreeNode` in engine/skills.ts with the M0 whitelist = `arcDeg` +
  `spreadDeg` exactly; `SkillInstance.treeNodes` (sparse), `validTreeNodes`
  the ONE load-validation seam (character saves + sim builds alike), the
  `pickTreeNode` mutator (level seal on RAW `inst.level`; replace-whole =
  exclusivity by construction; re-picks behind `swapRefusal('socket')`
  verbatim). **THE RE-PIN LAW (authoring rule for every M2 pair, from
  M0's wild_strike rows):** a branch's `over` re-pins EVERY field of its
  identity — including values that happen to equal today's base — so the
  branch survives a rescale moving the base row out from under it.
- **`SkillInstance` state:** spent-node ids, sparse-serialized (the
  `attunedForm` idiom: validated on load, orphaned picks drop with a
  console note). Branch = derived. Wallet counters ride the account/run
  wallets like the tints do.
- **Resolution:** ONE resolved view (`instanceDelivery(inst)` and
  siblings); the def stays frozen. **The honest cost stands from v1:** the
  M1 audit of every `def.delivery`/channel/aim/castMode read in the cast
  path — a missed site half-applies a branch invisibly (a design no-op the
  byte-matrix cannot see). **The M1 audit list opens with M0's finds:**
  the enemy-telegraph wedge (renderer.ts ~5194 reads `def.delivery` raw —
  safe while monsters carry no picks, but a `MonsterDef` mode pin (the
  carded nettle_dervish idea) needs it on the view or the telegraph lies);
  an unlearn/relearn pick-retention assertion (holds by the attunedForm
  idiom, probe-untested at M0); and the M0 FOLD-VERIFICATION ORACLE kept
  as a per-pair M2 gate — pick vs def-mutation must be byte-exact per
  seed, the cheap "no missed read site" proof the byte-matrix cannot give.
- **QA:** the matrix enumerates **branch terminal allocations** — exact
  cover makes them deterministic, exactly two extra rows per moded skill
  (`skill@branch` ledger convention, one adjudicated `--reconcile`,
  custodian recipe updated). Baselines pin allocations explicitly (unset =
  unmoded → byte-stable until M2 touches a build). `sweep skills` grows the
  branch axis; `balance/probe_skillmodes.ts` + roster row land in the SAME
  commit (the flush law) covering: band/point derivation from the array,
  essence feed + refusals, the hard lock + reset ritual, save round-trip +
  orphan drop, resolved-view reach, font recipe determinism, census sync.
  genqa untouched. Co-op: meta sync only; verify tooltip/pip parity.

---

## 9. Build movements

- **M0 — the spike: BUILT (2026-08-19/20, chip task_55133192 —
  uncommitted, awaiting the coordinator).** wild_strike's fork at level 5
  (ws_sprinkler 30/130 vs ws_duelist 16/24, numbers unblessed), the
  resolved view bound ONCE in executeSkill, the panel pick row behind the
  standing refusal words, both endpoints re-measured on the landed base
  (§4's pair-1 note), `probe_skillmodes.ts` 35/35 + its roster row. Gates
  all green; THE TRANSPARENCY LAW proven at byte grain (authored-but-
  unpicked ≡ tree-field-deleted, same-seed fingerprints identical) and at
  macro grain (baseline unmoved). Landing detail + traps in the
  `skillmodes-design-pass` memory.
- **M-ECON — the economy (WITH the rescale #12's gates).** Cap 20 + the
  bands array + Ability Essence I–IV (drops, floors, wallet, pickups) +
  point retirement + the Font repurpose + the vendor sell lane + the
  Skills-drawer rename. Includes the growth-curve re-author, the threshold
  re-seat audit, sim band redefinition — rescale-lane work by the boundary
  law, so it opens the rescale or lands beside it. Migration: clean break
  acceptable (ruled). Effort: L.
- **M1 — the tree fabric.** The schema, the resolved-view audit (the long
  pole), the hard lock + Font reset, the matrix/census branch axis, the
  drawer's tree panels. Effort: L.
- **M2 — the catalog, in waves.** The twelve pairs become trees; every
  rung earns its A/B row before numbers bless; coverage is curated forever
  (576 droppable skills). Effort: M per wave, measurement-shaped.

**Order: M0 → M-ECON → M1 → M2.** Trees before the cap restructure would
author point-milestones twice; M2's numbers want the rescale's stable
ground under them.

---

## 10. Open dials (build-time levers — no rulings pending)

Per-step essence counts per band · tier drop floors/rates · Font ratio
ladder (merge + convert rungs) · reset price row · vendor tier-per-rung
table · the drawer handle's replacement readout · tier naming (I–IV
working; adjectives open for a naming pass) · the M1 override whitelist ·
popup layer on/off.

## Appendix — the ruling log (2026-08-15, one day, waves 1–3)

Wave 1: the v1 charter (seven cards). Wave 2: cap-20-soft/uncapped ·
drop-at-1 · banded currency · points at intervals · trees in the Build
section · Font repurpose · hard branch lock · "nailed the font" · keep
"Skills" naming · supports stay 5 · level-up keeps the passive point ·
dedicated currency + vendor sell lane (the dopamine ruling) · wallet
counters. Wave 3: **Shape B locked** ([5,10,15,20], I–IV, 4 points) ·
**Font reset ritual ratified** (+ the passive-respec future seed,
planned-passes #25) · **vendor tiers by wares-rung ratified** · **no
migration owed** · **pair table ratified as direction, names as data** ·
**the drawer label is exactly "Skills"**.
