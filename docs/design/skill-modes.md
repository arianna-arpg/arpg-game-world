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
| Leveling currency | **Memory Essence I–IV** (renamed from Ability Essence at skill-items M2, card 10 — ids/save keys unchanged) — a DEDICATED wallet-counter family (never bag items), zone-floored world drops + vendor-sold |
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

### Memory Essence I–IV (né Ability Essence — the skill-items card-10 rename; labels only)

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
  the world breaks into), **Memory Essences** (I–IV — the refined form,
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

### THE GRAPH GRAMMAR (built 2026-09-04 — her ask: genuine branches with choices, not linear upgrades after the first pick)

The 2×3+1 shape above is now the **sugar form** of a general grammar. A
tree is a GRAPH (`SkillTreeSpec.nodes`; `src/engine/skilltree.ts` is THE
ONE RESOLVER every read folds through): each node names its prerequisites
(`links`, any-of — the passive tree's adjacency law; none = it hangs off
the root and opens at the milestone), its rivals (`excludes` — the hard
lock at NODE grain, symmetric by construction: spending one seals the
other and everything only reachable through it), its `ranks` (a node that
takes several points, each re-applying the payload — a rank persists as a
repeated id in `treeNodes`, so saves/wire/sim carry it unchanged), an
optional drawn `kind` (minor/major/keystone) and optional layout pins
(`x`/`y`; absent = the derived radial layout — fork limbs fan the upper
arc by subtree weight, lock-free nodes hang below, chains run as rays,
sub-forks fan inside their limb's wedge).

- **REACHABILITY IS THE LOCK.** Sealed = excluded by a spent node, or
  reachable from the root only through one. Derived from spent ids, never
  stored — the orphan-drop law survives untouched.
- **THE LIMB.** A root child that forks names a limb; everything under it
  belongs to that identity. Limbs are the tooltip's "· The Duelist", the
  bar pip's commitment, the `skill@limb` census hosts (sugar trees keep
  their branch ids, so the ledger's rows stand), and the NAME in refusal
  words — "The Duelist's path is sealed" at every rung under a sealed
  fork; a sub-fork seals by its own name ("Alpha Two's path is sealed").
- **THE COVER LAW** replaces exact cover: walking any limb to its end plus
  the lock-free ground must absorb every cap point (boot validation warns
  when a tree strands points). A tree with MORE nodes than points is the
  intent — that is the choice.
- **The sugar fold is byte-identical** to the M1 fabric (rung chains off
  the root, rung-1 forks, a lock-free neutral; refusal words and loader
  verdicts pinned by probe_skillmodes N). The six authored trees stay in
  the sugar form; new trees may use either, or both (the fold appends).

Authoring template (a fork with a sub-fork, a cross-link, a ranked utility):

    tree: { level: 5, nodes: [
      { id: 'a',  name: 'The Alpha', excludes: ['b'], over: { … } },      // fork limb A (b's exclusion folds back)
      { id: 'b',  name: 'The Beta',  over: { … } },                        // fork limb B
      { id: 'u',  name: 'Economy',   ranks: 2, mods: [ … ] },              // lock-free, two ranks
      { id: 'a1', name: 'Alpha One', links: ['a'], excludes: ['a2'], mods: [ … ] },
      { id: 'a2', name: 'Alpha Two', links: ['a'], mods: [ … ] },
      { id: 'a3', name: 'Alpha Cap', links: ['a1', 'a2'], kind: 'keystone', mods: [ … ] },
      { id: 'b1', name: 'Beta One',  links: ['b'], mods: [ … ] },
    ] }

**RULED (2026-09-04, her word): the point budget stays THIN by design.**
Four points at cap against a growing graph is the intent — the old World
of Warcraft talent-row shape: as the skill levels, more options open than
the points can buy, and specializing is the whole point of customizing.
`SKILL_LEVEL_BANDS` remains the one array should the ladder ever move,
and THE COVER LAW re-derives with it — but the thinness is not a defect to
tune away.

**THE PANE COHERES (built 2026-09-04, her ask):** the skill-tree pane and
the passive tree are FOLIO leaves (ui/folio.ts — the tabbed-book fabric
the station dialogs use): both up at once bind into one book with a tab
strip, each arriving IN FRONT (a key, a handle — explicit asks), the key
of a shelved tree brings it forward, Esc closes the front leaf. THE REACH
(`TREE_REACH_PX`, ui/panels.ts): on BOTH trees a hover anchors its card
to the nearest node within reach, the anchored node rings up (the pad's
synthetic hover included), and a click on empty ground within reach
allocates that node — the card and the click always agree.

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
- **CONVERT:** Memory Essence tier up/down (wallet math): down pays out
  generously (IV → 3× I — **DIAL**), up costs per-rung (3:1 — **DIAL**).
  Deliberately lossy end-to-end (the PoE map-vendor valve): conversion
  never beats farming at depth — an inequality the economy audit can pin.
- **RESET:** the tree respec ritual (§3).

**The division-of-labor law:** vendors convert BETWEEN economies (tints →
Memory Essences, §6); the Font converts WITHIN them (tiers, rarities,
choices). Co-op attribution follows the standing personal-economy station
laws (per-seat dwell).

**Future-pass seed (her word, wave 3 — recorded, not in these movements):**
the Font as the **passive-point respec altar** too — planned-passes #25.

---

## 6. Vendors — the sell lane (ruled, wave 3)

Brandt and kin **SELL Memory Essences priced in tints** — the direct
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
- **THE PULL-OUT (built 2026-09-04):** the tree leaves the drawer row for
  its own pane (`#skill-tree`, `openSkillTree` / `refreshSkillTree` in
  ui/panels.ts), drawn the passive tree's way — SVG nodes and edges over
  the graph's derived layout, zoom/pan through the shared gesture helper,
  node cards through the shared tooltip (the payload in words, THE ONE
  SPEND PREDICATE's words, what a node seals, after-any-of for
  cross-links), a click on a lit node = the ordinary `pickTreeNode`
  intent. Drawn == tested: spent nodes wear the skill's color, spendable
  nodes a lit ring, sealed nodes the lock's grey with dashed edges and a
  lock glyph, ranked nodes print have/ranks. The drawer row keeps a STRIP
  (level bar with band ticks, points, the committed limb, a waiting pip
  that lights the `⟡ Tree` handle gold, the Font's reset chip beside a
  font); the milestone popup grew an "Open the tree" door. The pane is
  owned by its opener's seat (the couch lens) and clears with the
  ordinary panels on Esc.
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
  **AS BUILT (M1, 2026-08-20 — the tree fabric):** the full grammar
  (`SkillTreeSpec.neutral`, node `mods` folded in `instanceInnateMods` —
  every stat read covered free — and node `graft` rebuilt at recalcSeat,
  derived never saved); the whitelist grew ONE audited lane —
  `over.channel.{ramp,rampMove}` behind the new `instanceChannel` view
  (useSkill's channel start, the pulse loop, the AI hold, movementLocked/
  moveActor's stride law, the renderer's channel bar — the gather
  conversion still wins whole); `castMode` deliberately NOT adopted (the
  heavy_strike wave's road; exemption comments at the read sites, the
  full audit table lives at the whitelist in engine/skills.ts). Spending:
  `pickTreeNode` = spend-one-point against `bandPointsAt` under
  `treeNodeRefusal` (THE ONE SPEND PREDICATE — level seal, THE HARD LOCK
  with the sealed path's own name, the rung chain, the budget; panels
  speak the same words), append-only — un-choosing is `fontResetTree`
  alone; `validTreeNodes` grew structure (rival-branch + rung-chain
  drops) and an optional level-budget trim (character saves + the co-op
  wire pass level; sim builds deliberately don't — the hypothesis
  lever). THE M0 FOLD probe-pinned costless. The M0 audit finds landed:
  the enemy telegraph reads `instanceDelivery` (a MonsterDef pin draws
  true) and `MonsterDef.skillTrees` is the pin CAPABILITY (validated at
  boot + kit mint; nobody wears it — nettle_dervish stays hers);
  unlearn/relearn retention probe-pinned. Co-op: `SkillInstW.tn` ships
  picks, rehydrated through the one seam. wild_strike = the full
  exemplar (rungs 2–3 + neutral, every payload A/B-measured at the rig
  grain incl. the stride lane; ⚠ all numbers unblessed). QA: the census
  branch axis landed (`skill@branch` terminals — the debut reconcile
  banked +10 open cost_only twins / −14 blind-drift retirements),
  `sweep skills --modes`, the smoke rows re-pinned at gem-20 terminals
  (baseline untouched — the transparency law holds at macro grain),
  probe_skillmodes grown to 66 checks (A–L). The milestone popup is a
  DIAL-gated layer (`TREE_POPUP_ENABLED`, panels.ts) fed by the world's
  disciplined-calm sweep; the Font SCREEN (§7's tabs) stands as its own
  dwell-opened station panel.
  **AS BUILT (THE GRAPH GRAMMAR + THE PANE, 2026-09-04):** `SkillTreeNode`
  grew `links`/`excludes`/`ranks`/`x`/`y`/`kind`, `SkillTreeSpec` grew
  `nodes` (the graph form) with `branches`/`neutral` optional (the sugar
  form); `src/engine/skilltree.ts` is THE ONE RESOLVER (`treeGraph`
  memoized per spec — the sugar fold, symmetric exclusion, BFS order,
  limbs, the derived layout, `treeSealedSet`/`treeSealName`/
  `treePrereqMissing`/`treeLimbs`/`treeNodeRanks`/`treeSpentCount`), and
  every standing read rides it: `treeNodeOf`/`treeBranchOfNode`/
  `treeSpentBranch` (the limb view), `treeNodeRefusal` (level seal → the
  derived lock in the limb's name → the root-most missing prerequisite →
  the budget; the M1 words byte-identical), `validTreeNodes` (orphans,
  the rank cap, the lock transitively, the prerequisite chain, the budget
  trim; a `quiet` option for the census), `pickTreeNode` (walked-to-full-
  rank is the silent no-op), the census (`hostTreeNodes` walks a limb +
  the lock-free ground + remaining ranks through the seam — sugar hosts
  unchanged, the ledger stands), boot validation (the graph laws + THE
  COVER LAW + derived-layout collisions). THE PANE per §7. Six authored
  trees untouched in the sugar form; no catalog content authored — M2's
  waves author the richer graphs.
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

- **M0 — the spike: BUILT + LANDED @ 25fb7a4 (2026-08-19/20, chip
  task_55133192).** wild_strike's fork at level 5
  (ws_sprinkler 30/130 vs ws_duelist 16/24, numbers unblessed), the
  resolved view bound ONCE in executeSkill, the panel pick row behind the
  standing refusal words, both endpoints re-measured on the landed base
  (§4's pair-1 note), `probe_skillmodes.ts` 35/35 + its roster row. Gates
  all green; THE TRANSPARENCY LAW proven at byte grain (authored-but-
  unpicked ≡ tree-field-deleted, same-seed fingerprints identical) and at
  macro grain (baseline unmoved). Landing detail + traps in the
  `skillmodes-design-pass` memory.
- **M-ECON — the economy: BUILT + LANDED @ dc6e2cf (2026-08-20, chip
  task_ff8f3465; ran WITH the rescale #12's gates as charted).** As built:
  `SKILL_LEVEL_BANDS [5,10,15,20]` derives cap, tiers (half-open) and
  points; Memory Essence I–IV wallet family (floors, the forked-trickle
  kill roll on its own Rng, vendor sell lane by wares rung); preLevel
  retired; THE POINT LANE DEAD with a costless probe-pinned grandfather;
  the Font's merge/convert/reset recipes live with the keeper's-mark
  refusal, socket auto-return and highest-level-kept from the first
  commit; the drawer reads "Skills" with a wallet-glyph readout;
  `skillLevelEssenceCost` retired into `skillLevelAbilityCost` /
  `supportLevelAbilityCost` (supports keep cap 5). Growth trimmed
  0.12→0.08 (L20 sweep ×0.879 uniform, monsters ride the same curve,
  baseline unmoved); the threshold re-seat audit KEPT all 51 seats —
  over-cap authoring now means past 20, a lane that opens empty. **Every
  dial unblessed — the blessing pass owns the numbers.** The dedicated
  Font SCREEN (§7's tabs) is deliberate M1 UI debt: M-ECON ships the
  recipes as affordances in the standing panels.
- **M1 — the tree fabric: BUILT (2026-08-20, chip task_64536b8c).** The
  full grammar + point spending under the hard lock (the M0 fold costless,
  probe-pinned), the resolved-view audit (channel lane adopted; the audit
  table at the whitelist), the Font screen + milestone popup, the drawer
  tree panels + bar pip + tooltip line, the census/matrix branch axis with
  its debut reconcile, the monster-pin capability, the full wild_strike
  exemplar with per-rung A/B tables (§8's M1 as-built block carries the
  detail; ⚠ every number unblessed — the blessing pass owns them).
- **THE GRAPH GRAMMAR + THE PANE — BUILT 2026-09-04** (her ask, the
  same day: the tree as its own pull-out pane drawn like the passive
  tree, over a grammar that can hold genuine branches). §3's graph
  grammar + §7's pane + §8's as-built block; probe_skillmodes grew
  section N (the sugar fold byte-identical, the graph form on a fixture,
  the layout, the census walk). Content untouched: the six trees stay
  2×3+1 in the sugar form — M2's waves author the graphs.
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
