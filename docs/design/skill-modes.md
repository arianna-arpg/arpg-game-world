# THE SKILL-MODE TREES — a design charter

**Status: DRAFT for ruling — nothing is built.** Batch 55 design chip
(2026-08-15, HEAD 3caadeb). Every section closes with the open rulings it
needs; recommendations are marked as recommendations and decide nothing.
Companion decision cards live in the session memory
(`skillmodes-design-pass`); this document carries the full argument.

Sources: the batch-54 wildstrike sustain pass (the measured WIDE/NARROW
endpoints), the 2026-08-15 swashbuckler ruling (positioning identity), the
2026-08-12 powercurve sitting (docs/balance/README.md), and a fresh survey
of `src/engine/skills.ts` + `src/data/skills.ts` (754 defs, 576
player-droppable).

---

## 0. Her frame, and what this is

> "a miniature skill tree for skills themselves" — e.g. wild_strike leveling
> up lets the player pick a WIDER angle (more area damage) or a NARROWER
> angle (sustained single-target dead-ahead). "Incredibly fun but would
> require quite a bit of lift... as long as we could truly come up with
> mutually-exclusive ideas."

The proposal: at authored level milestones, a skill offers a FORK — two (or
three) named MODES, mutually exclusive by construction, each reshaping what
the skill IS rather than how big its numbers are. The player picks one; the
pick is the build decision, and the catalog of forks is the "miniature tree."

The seed exemplar is already measured (batch 54, wildstrike-sustain, solo
bare L20 / pack-of-5, equal restored cadence):

| endpoint | geometry | solo dps | pack dps | victims touched |
|---|---|---|---|---|
| WIDE ("the sprinkler") | arc 30° / spread 130° | 28.3 | 144.0 | 5/5 |
| NARROW ("the duelist") | arc 16° / spread 24° | 80.0 | 83.3 | 1 |
| landed base (between) | arc 30° / spread 90° | ~52 | ~180 vs undying dummies | 5/5 |

The pair frames the whole thesis: at equal investment and equal cadence, the
branch trade is PACK COVERAGE vs SOLO CEILING — a real identity choice with
no strictly-better answer. NARROW's 80 sits ABOVE rooted blademaster's 64.6:
a picked mode buys real headroom on its own axis, honestly paid for on the
other.

---

## 1. THE BOUNDARY LAW — modes vs the rescale (planned pass #12)

She flagged the overlap with the queued NUMBERS-CRUNCH RESCALE herself. The
line, drawn explicitly:

**Modes are identity choices at level milestones — they redistribute a
skill's budget across opposed shapes. The rescale is the numbers underneath —
it moves the budget itself** (class bases, monster damage/life, affix
magnitudes, regen, and the sim baselines, swept TOGETHER). Neither may
silently become the other:

1. **A mode is never a buff.** A mode whose payload is net throughput ("more
   damage") is a rescale change wearing a mode's face. The working rule: a
   pair's two options hold the skill's sim-measured throughput roughly level
   *each on its own terms* — WIDE's pack dps ≈ NARROW's solo dps at equal
   investment (the 144-vs-80 table is the honest spread; exact tolerance is
   a rescale-lane number to bless per pair).
2. **The rescale never resolves tuning by adding a mode.** The wildstrike
   sustain fix (cost 3→1, arc 12→30, dmg [8,13]) was rescale-class work and
   correctly landed in the BASE row. Modes stand ON a tuned base; they are
   not the instrument for fixing one.
3. **Base-row edits made to seat modes are rescale-lane work.** If a skill's
   base must be re-centered so two modes can flank it (wild_strike's landed
   row already sits between its endpoints — the lucky case), that edit runs
   under the rescale's gates (baseline check, the powercurve tables as the
   before-picture), not under the mode chip's.
4. **Sequencing consequence** (detailed in §7): the mode FABRIC (M0/M1) is
   rescale-independent by this law — it moves shape, not budget. The
   CATALOG's numbers (M2) want the rescale's stable ground under them.

**OPEN FOR RULING:** ratify the boundary as stated; bless or adjust the
"roughly level on its own terms" working rule (and whether the tolerance is
authored per pair or one global band).

---

## 2. THE EXCLUSIVITY PRINCIPLE

Her condition — "as long as we could truly come up with mutually-exclusive
ideas" — becomes the admission rule for any proposed pair:

**Two modes qualify when they spend the SAME budget on OPPOSED geometry,
tempo, or count — such that the engine structurally cannot hold both on one
instance.** Three concrete tests, any one of which admits a pair:

- **THE ONE-FIELD TEST** — both payloads write the same spec field with
  opposed values. `delivery.arcDeg` cannot be 16 and 30; `GuardSpec.arcDeg`
  cannot be 90 and 300; a `ChannelSpec.ramp` curve cannot be growing and
  flat; `castMode` is one word.
- **THE ONE-SLOT TEST** — the engine already arbitrates the axis first-wins,
  as standing law: `instanceUseCharges` ("one economy per slot"),
  `instanceCascadePlan`/`instancePulsePlan` (the kindred rule's native-lane
  slot), `instanceFuse` ("one clock per use"), selfStack ("a socketed graft
  WINS"). A mode pick re-authors what stands in the slot; the arbitration
  law is already written.
- **THE QUANTA TEST** — the count law cannot fraction. Minion plies are
  never fractioned, owner investment folds at 1/batch
  (`bakeMinionOwnerStats`): a contract is one-giant or the-swarm, never a
  blend.

**The anti-test:** a pair that could ship as two support gems socketed
together WITHOUT contradiction fails the principle — supports own the
composable axis; modes own the opposed one. (This is also the vocabulary
law that keeps the two systems from bleeding into each other: a gem deepens,
a mode chooses.)

### The proposed pairs (12, spanning the families)

Each line names the opposed axis and why one instance cannot carry both.
Only pair 1 is measured; every other pair owes an A/B measurement pass at
the wildstrike scratch-rig grain before its numbers are anything but
placeholder shape (see §7 M2).

| # | skill (family) | mode A | mode B | the opposed axis — why the engine can't compose them |
|---|---|---|---|---|
| 1 | **wild_strike** (melee channel) — THE SEED, measured | **The Sprinkler**: arc 30° / spread 130° — 5/5 bodies, pack 144 | **The Duelist**: arc 16° / spread 24° — solo 80, above blademaster | One sector geometry (`aim.random.spreadDeg` + `delivery.arcDeg`): a sliver fan cannot be both a wide wander and a dead-ahead line. |
| 2 | **piercing_arrow** (projectile) | **The Line**: pierce N — the shaft survives contact and drills a corridor | **The Tree**: forks on impact — the shaft dies birthing children | The first-contact ledger spends once: THROUGH (flight survives) or INTO (flight dies splitting). `pierce` postpones the very death `forks` triggers on. |
| 3 | **fireball** (projectile) | **The Bloom**: one heavy orb, `explode` radius/scale up | **The Fusillade**: `fire: 'salvo'` stream of small bolts, no blast | `ProjectileDelivery.fire` is ONE firing style per cast; one payload is either a single big death or many small ones. |
| 4 | **arcane_missiles** (channel projectile) | **The Crescendo**: `ramp` growth per held second — the hold IS the payoff; feet rooted | **The Staccato**: flat full power from beat one, tap-friendly, mobile | One ramp curve per channel: a beat cannot be both flat and growing; the reward structure (hold vs tap) inverts wholesale. |
| 5 | **whirlwind** (melee nova channel) | **The Gathering Storm**: `ramp` up + `rampMove` negative — roots into power | **The Juggernaut Roll**: flat damage + `rampMove` positive — frees the stride | One `rampMove` per channel and its SIGN is the identity: the hold either anchors into a peak or runs free at par. |
| 6 | **sunder** (ground) | **The March**: the native cascade walks far — shocks travel, each softer | **The Epicenter**: the native lane becomes a pulse — the quake stays home and beats in place | THE KINDRED SLOT verbatim: the native lane is ONE of march/pulse (`instanceCascadePlan`/`instancePulsePlan`); a resolution point cannot both leave and stay. Socketed cascade/pulse gems keep deepening whichever lane the pick seats — the inheritance law already governs it. |
| 7 | **summon_skeleton** (summon) | **The Legion**: count up, small bodies, ply-cheap | **The Champion**: count 1, one great body, the batch consolidated | THE QUANTA LAW: plies never fraction, owner folds bake at 1/batch — a contract's batch is one shape. (`SummonDelivery.count`/`maxActive`/`monsterId` move together.) |
| 8 | **flame_totem** (construct) | **The Bastion**: one engine, full power, long stand | **The Battery**: `maxActive` 3, each a fraction, short stands | The construct echo of #7 — one reservation budget across `maxActive` × power; the count is one number. |
| 9 | **shield_up** (guard) | **The Tower**: narrow `GuardSpec.arcDeg`, huge `shieldLife` — a wall dead ahead | **The Ring**: arc ~300°, thin shield — cover everywhere, strong nowhere | One stance budget over arc × life: a shield cannot be narrow-thick and wide-thin at once. |
| 10 | **dash_strike** (movement) | **The Passage**: `phase` — through the crowd, corridor pays on everyone | **The Tackle**: the grab-fabric CHARGE CARRY — seize the FIRST contact, drag it the run's remainder | One collision policy per run: the first corridor body is passed THROUGH or SEIZED; both fields exist and contradict on the same contact. |
| 11 | **teleport** (movement) | **The Long Stride**: one deep blink, full range, one cooldown | **The Flicker**: a `useCharges` bank of short steps on a trickle | "One economy per slot" (`instanceUseCharges` first-wins) + one displacement budget: range × cadence spends deep-and-rare or shallow-and-often. (Riftstep already lives at the flicker pole — the pick brings the axis to the plain blink.) |
| 12 | **heavy_strike** (melee) | **The Mountain**: `castMode: 'cast'`, long bar, one huge stagger blow | **The Flurry**: `castMode: 'multitude'` — one hit per press across the bar | `castMode` is one word per def; a bar cannot resolve once and per-press. |

A 13th held in reserve if any row above falls: **meteor_storm** — **The
Focus** (tight `areaRadius`, strikes concentrated on the promise-disc) vs
**The Tempest** (wide scatter, more `count`, smaller `hitRadius`): one storm
footprint budget. And a flavor variant on the same delivery: `atEnemies`
(the hunt) vs the telegraphed fixed disc (the promise) — one flag, two
targeting philosophies.

**The buckler_strike guardrail:** the swashbuckler ruling (2026-08-15) made
its ±75° flank figure POSITIONING IDENTITY — untouchable geometry. It is
deliberately NOT in this table, and the charter proposes it stay out of the
debut wave entirely: its identity is already a stance, and a mode that
"fixes" the flank angle would be the ruling re-litigated through a new door.
If it ever forks, the fork must be along some OTHER axis than the flank
cuts. (wild_strike is the swashbuckler's sanctioned mode canvas.)

**The kindred-metric coda (QA honesty):** the support no-op matrix detects
BYTE-IDENTICAL inertness; it is structurally blind to *design* no-ops — two
modes that technically differ but play the same. (CLAUDE.md records the same
gap for the kindred lane: "the coming interaction sweep needs its own
kindred metric.") The design-distinctness gate for modes is therefore the
MEASUREMENT pass, not the matrix: every shipped pair carries an A/B table in
the wildstrike rig's shape, and a pair whose two columns read alike is not
done.

**OPEN FOR RULING:** (a) ratify the principle + the three tests + the
anti-test; (b) mark up the table — which pairs advance, which die, which
she'd replace (the reserve row and the families not yet covered — aura,
curse, corpse — are open canvases); (c) confirm buckler_strike stays out of
wave one.

---

## 3. THE LEVELING ECONOMY

Facts on the ground (verified this pass):

- Skill levels run 1..10 (`MAX_SKILL_LEVEL`), one skill point per level
  (`World.levelUpSkill`), or essence via `skillLevelEssenceCost`
  (`essenceLevels` tracked separately and excluded from refunds).
- EFFECTIVE level = `inst.level` + socketed `levelBonus` gems + gear/passive
  `bonusLevels` (`effectiveSkillLevel`). Thresholds (`SkillDef.thresholds`)
  key on effective level — over-cap thresholds (fireball's "Twinned blooms"
  at 11) are reachable only through +level investment, by design.
- Unlearn refunds invested points (essence levels excluded); the font
  refunds likewise; granted rescue gems refund nothing.
- Loadout surgery is a camp habit: THE FIELD DISCIPLINE
  (`SWAP_DISCIPLINE_CFG` — blades cold `calmSec` 5, no live hostiles in
  `foeRadius` 480, unlearn also wants the skill's own clock quiet;
  sanctuary waives all) speaks through ONE predicate, `World.swapRefusal`,
  so engine gates and panel buttons say the same words.

### When picks unlock — three options

- **Option A — authored milestones (recommended).** The def declares its
  fork(s) at fixed skill levels — e.g. one fork at level 5 for the debut
  wave; a second at 8 where a skill earns depth. The pick itself is FREE:
  leveling INTO the milestone is the price already paid. Precedent:
  thresholds are exactly this shape, minus the asking.
- **Option B — pick-points (a separate currency).** Recommend against: the
  game already runs points + essence; a third grain is bookkeeping without
  identity, and the boundary law forbids picks carrying net power anyway —
  so there is nothing for a currency to price.
- **Option C — one flat law (every moded skill forks at 5).** Cheapest to
  read and teach; flattens the "tree" to one choice per skill. Fine as the
  M0/M1 *posture* — but the schema should carry `level` per group so the
  flat law is a convention, not a constraint.

**The reach question (needs her word either way):** does a fork open at
`inst.level` (points + essence purchases — investment the build OWNS) or at
effective level (gem/gear bonuses count)? Recommendation: **inst.level
only.** A fork is a commitment, not a loan: a pick opened by borrowed +2
levels that later lapse (gear swap, gem unsocket) would leave a chosen mode
above its own ground — and while the thresholds fabric already knows how to
fall silent, a CHOICE going dormant reads far worse than a bonus doing so.
Counter-argument for symmetry: over-cap thresholds deliberately ride
effective level, and a mode-at-11 "only reachable through +level investment"
is a genuinely interesting endgame shape. If she wants that shape, the
dormancy rule must be authored explicitly (pick stands, payload sleeps,
panel says why — the misfit-gem ⤳✕ idiom).

### Supports and the socket-time gate

Mode payloads change the live instance, and `supportFitsInst` reads the live
instance — so the interaction is automatic, for better and worse:

- A mode that adds a mechanism (The Flicker stands up a `useCharges` bank)
  OPENS sockets that were refused (Deep Reserves' whole family) — the
  self-lifting refusal law behaves correctly with zero new code.
- A mode that removes a tag or mechanism would DORMANT a socketed gem
  (misfits-dormant already renders that state). Legal, but it makes a pick
  read as punishment.
- **Recommended M0/M1 posture:** mode payloads may ADD mechanisms but may
  not remove tags or mechanisms the base row carries — geometry, counts,
  curves and additions only. Revisit at M2 with the census consequences
  priced (§4). This also keeps census fits mode-invariant in wave one — a
  real QA scope saver.
- Grafts, slot grafts and forwarded crews all rebuild at `recalcSeat`; the
  pick must run through the same recalc seam as socketing so every derived
  layer sees it at once.

### Re-picks (respec policy)

- **Recommended: free re-pick under the field discipline** — the same
  cold-blades/no-foes/sanctuary gate as socket surgery, the same
  `swapRefusal` words on the panel button. Exclusivity is *one mode at a
  time on one instance*, not *one choice per character-life*: the tree
  invites trying both arms, and the discipline gate already prevents
  mid-fight stance-flipping.
- Alternatives if she wants picks to carry weight: (i) priced re-picks in
  essence (the lane exists and is save-honest); (ii) unlearn-grade — only a
  full unlearn/relearn resets the fork (punitive; pushes players to carry
  duplicate gems, which the drop economy would feel).
- Whichever policy: the pick rides the INSTANCE (see §4), so permadeath,
  the couch lanes, and gem trade/salvage all inherit sane behavior for
  free — a sold or salvaged gem carries or loses its pick with the object.

**OPEN FOR RULING:** unlock option (A recommended); fork levels for the
debut wave (one at 5? any skill earning a second at 8?); the reach question
(inst.level recommended); the M0/M1 no-tag-removal posture; re-pick policy
(free-under-discipline recommended).

---

## 4. SCHEMA OPTIONS

All three options are data-only in the thesis sense — no engine forks, one
shared pipeline. They differ in where the mode LIVES and what the QA line
must grow to see it.

### Option 1 — `SkillDef.modes` rows + an instance pick (recommended)

```ts
/** One pickable shape inside a fork. */
interface SkillModeOption {
  id: string;                 // persisted — renaming orphans picks (they
  name: string;               //   drop with a console note on load, the
  description: string;        //   PassiveChoiceOption law)
  mods?: Modifier[];          // ordinary skill-local modifiers
  over?: ModeOverrides;       // TYPED, WHITELISTED spec overrides —
                              //   delivery fields, channel ramps, aim,
                              //   castMode, useCharges. Narrow by design;
                              //   never a deep arbitrary merge.
  graft?: GraftSpec;          // optional support payload (the passive-
}                             //   choice precedent) for powers the gem
                              //   vocabulary already owns

interface SkillModeGroup {
  id: string;
  level: number;              // the milestone (see §3)
  label: string;              // "Lv 5 — Choose the arc"
  options: SkillModeOption[]; // 2–3; exclusivity by construction
}
// SkillDef.modes?: SkillModeGroup[]
```

- **Pick persistence:** `SkillInstance.modes?: Record<groupId, optionId>` —
  serialized sparse exactly like `attunedForm` (the standing per-instance
  persisted-pick precedent: validated on load, silently dropped when the id
  is gone). Instance-grain is the right grain: two copies of a gem may hold
  two shapes, and trade/salvage/permadeath inherit correct behavior free.
- **Resolution:** ONE resolver seam — `instanceModes(inst)` feeding (a) the
  ordinary `instanceMods` fold for `mods`, and (b) a resolved-spec view
  (`instanceDelivery(inst)` and siblings) for `over`. The def stays frozen.
  **The honest cost, named:** the cast path reads `def.delivery` (and
  channel/aim/castMode) at MANY sites today; every read that should see the
  mode must go through the resolved view, and any site missed is a mode
  that half-applies — invisible to the byte-identical matrix (a design
  no-op, the near-copy-overwrite lesson). The M1 audit of those reads is
  the fabric's long pole, priced in §7.
- **Monster kits ride it free:** a `MonsterDef` kit entry can pin a mode
  (the cadenced-kin law — monsters drum the same rules players earn).
  nettle_dervish, wild_strike's monster bearer, could pin The Sprinkler
  the day modes exist — a natural companion to the batch-54 deferred
  dervish call, and *her* call, separately.

### Option 2 — modes as hidden auto-grafted support gems

The pick injects a synthetic `SupportInstance` into `inst.grafts` (rebuilt
at recalc, never saved — the slot-graft idiom).

- For: zero new payload vocabulary; the socket fixpoint, tag admission and
  forwarding all arrive free.
- Against, decisive: supports cannot override delivery FIELDS (no gem moves
  `arcDeg`/`spreadDeg`/`castMode` today — grafting that power onto the gem
  lane to serve modes would hand it to every future gem, colliding with the
  kindred rule's hard-won "graft-wins is DEAD"); the no-op matrix would
  read mode-grafts as gems and the vocabulary law (supports compose, modes
  oppose) dissolves. **Recommend against as the shape — but keep its best
  part as Option 1's `graft` field.**

### Option 3 — sibling defs (the pick swaps the def id)

Each mode is a full `SkillDef`; picking re-points the instance.

- For: maximal visibility — census, matrix, probes, bestiary and AI hints
  see first-class skills with zero new resolution law.
- Against, decisive: catalog explosion (12 pairs = 24+ defs) and a NEW
  identity-fold law everywhere skills are minted, dropped, sold, learned,
  counted and saved ("these three ids are one skill" touches loot, vendors,
  the standing order's gem index, the book, class bars, saves). The cure
  is broader than the disease. **Recommend against; it is the fallback if
  M1's resolved-view audit proves untenable.**

### What the QA line needs (whichever shape wins)

Named in full — a mode the QA line cannot see is a mode that will rot:

- **The support no-op matrix** enumerates bare level-1 instances today
  (`compatCensus` → `makeSkillInstance(def, 1, 3)`); an instance-level pick
  is INVISIBLE to it until the enumeration grows a mode axis. Needed:
  moded skills enumerate per (skill × mode × support) — host ids in the
  ledger gain a `skill@mode` convention; `matrix explain` takes the same
  suffix; the committed defect ledger re-reconciles once (`--reconcile`,
  adjudicated, the custodian recipe updated). Scale: with the M0/M1
  no-tag-removal posture, fits are mode-invariant and only the A/B lane
  needs the axis; even fully enumerated, 12 moded skills × 1–2 extra
  options × ~150 supports ≈ +2–4k pairs on the ~85k space — shardable
  noise.
- **The baselines:** reference builds pin picks EXPLICITLY (a build row
  gains a `modes` field; unset = default mode so every existing baseline
  is byte-stable through M0/M1 by construction). Two wild_strike scenario
  rows (wide/pack, narrow/solo) join the smoke suite as M0's regression
  net, seeded from the measured table.
- **`sweep skills`** grows a `--modes` axis: each mode ranks as its own row
  (the wildstrike A/B table is literally this shape already).
- **The probe:** `balance/probe_skillmodes.ts` + its roster row in the SAME
  commit (the flush law) — pick/save round-trip incl. orphan-drop, the
  resolved view reaching the cast path (cone arc actually narrows, the
  salvo actually streams), exclusivity (one option per group, re-pick
  swaps whole), discipline refusals, census/ledger sync, monster-pin
  resolution. The boot validator learns mode ids (the
  `validatePassiveChoices` warn-degrade idiom).
- **genqa:** untouched — modes have no generation surface.
- **Co-op:** picks are meta state riding instance serialization; the
  snapshot already carries knownSkills — verify client tooltip/pip parity,
  no new wire field expected.
- **The kindred-metric honesty clause** (§2): the matrix proves a mode
  ISN'T inert; only the measurement pass proves two modes are DIFFERENT.
  Both gates stand.

**OPEN FOR RULING:** Option 1 as the shape (with the graft hybrid); the M0
override whitelist (proposed: `arcDeg`, `spreadDeg`/aim sector, ramp rows,
`fire` style, `pierce`/`forks`, `explode`, summon `count`/`maxActive`/
`monsterId`, guard `arcDeg`/`shieldLife`, dash `phase`/grab, `useCharges`,
`castMode`); the ledger `skill@mode` convention.

---

## 5. UI SURFACE

Where the pick lives — three candidates, composable:

- **A — the skill panel fork row (recommended now).** The skills panel
  already renders per-gem threshold state (`nextThresh` / `reached`); a
  mode group renders beside them as a small fork row — 2–3 named chips,
  sealed until the milestone, the picked chip lit, the others one press
  away behind the discipline gate (`swapRefusal` words on the disabled
  state — the refusals-speak-the-same-words law). Cheapest surface that is
  fully honest.
- **B — the milestone popup (the Calling precedent).** Reaching the fork
  pops the `PassiveChoiceGroup`-style chooser ("Choose: The Sprinkler /
  The Duelist"). The ceremonial moment her frame deserves — but it must
  QUEUE to the next disciplined calm (never interrupt combat, never
  dead-click in the field). Compose with A: popup asks first, panel row
  owns re-picks.
- **C — the book page.** A codex spread drawing each skill's tree as a
  tree — the most "miniature skill tree" in feel, the biggest lift, pure
  presentation over the same data. Defer until the catalog earns it
  (several skills carrying 2+ groups).
- **At-a-glance state:** the bar icon wears a tiny mode pip/glyph (the
  beatPips look-part precedent) and the tooltip's first line names the
  picked mode — the pick should read without opening a panel.

**OPEN FOR RULING:** A+B composition for M1 (A alone for M0); whether C is
wanted at all; pip vs glyph on the bar icon.

---

## 6. UNLOCK PROVENANCE

Who OWNS the right to fork — four options:

- **A — level milestones alone (recommended for M0/M1).** Reaching the
  authored level IS the unlock. Pure, legible, zero new systems, and the
  boundary law keeps it honest (no power is being gated, only shape).
- **B — the gatework lane.** Fork access as `GateRow` avenues (ledger keys,
  quest sugars, vocation gates) with the Vault TEASING sealed forks. The
  machinery exists and composes; but it prices mode access like account
  progression, which cuts against "the pick is the build decision." Defer
  unless she wants account-scale mode chases.
- **C — her Lastlight-NPC per-run musing.** The attention-policy card
  (batch 55's neighbor) floats a Lastlight NPC granting per-run unlocks.
  That musing is CARDED, unsettled, and owed her settling first — so this
  charter recommends modes stay INDEPENDENT of it, with the seam left
  open: the fabric asks "is this fork open for this seat?" through ONE
  predicate, so a future NPC / gate / quest lane can own the answer
  without reshaping anything. Nothing couples now.
- **D — found-in-the-world (mode manuals as drops).** D2-runeword flavor;
  collides with the boundary law (a dropped mode is power provenance — the
  economy audits' territory) and the spoils law would need a stance. Park
  as a possible future texture, not wave one.

**OPEN FOR RULING:** A now with the one-predicate seam (recommended);
whether B/C/D stay parked, and in what order she'd ever want them.

---

## 7. BUILD MOVEMENTS

- **M0 — the spike (wild_strike, one fork).** `SkillDef.modes` on one
  skill; the two MEASURED endpoints as options at level 5; instance pick +
  save round-trip; the resolved view covering exactly TWO override fields
  (cone `arcDeg`, aim `spreadDeg`); panel fork row wired to `swapRefusal`;
  two smoke scenarios pinned near the measured table (re-measured on the
  landed base row first — the endpoints were taken pre-landing at equal
  cadence); `probe_skillmodes.ts` sections A–D + roster row same commit.
  **Effort: S–M.** Structural risk ≈ none — the numbers are already
  measured and the seams (thresholds, attunedForm, swapRefusal, panel
  threshold rows) all exist.
- **M1 — the fabric.** The full schema (groups, multiple milestones, the
  graft hybrid, boot validation, orphan-drop law); the resolved-view
  chokepoint adopted across the cast path (**the long pole: an audit of
  every `def.delivery`/channel/aim/castMode read in the engine**, each
  moved behind the view or exempted with a written reason); census/matrix
  mode axis + ledger convention + one adjudicated `--reconcile` + the
  matrix-custodian recipe update; re-pick policy landed; co-op parity
  verified; monster kit pins resolving. **Effort: L** — mostly the audit
  and the QA line, deliberately; the fabric itself is small.
- **M2 — catalog coverage, in waves.** The debut wave = whichever of the
  12 pairs survive her markup, each earning its own scratch-rig A/B table
  before numbers bless (the wildstrike pattern: measure, then land). 576
  droppable skills means coverage is CURATED forever — propose ~12 in the
  debut, then family waves as they're wanted. **Effort: M per wave**, and
  it is measurement-shaped, not code-shaped (the fabric is amortized).
- **Sequencing vs the rescale (#12):** by the boundary law, M0/M1 are
  rescale-independent (shape, not budget) and may land before it; M2's
  NUMBERS want the rescale's stable ground, so debut-wave measurement
  should interleave after rescale waves touch the same families — or the
  A/B tables get re-taken. Her call on the order; the charter only asks
  that the boundary law travel with whichever sequence she picks.

**OPEN FOR RULING:** the movement cut (M0 alone first? M0+M1 as one
landing?); sequencing against the rescale; the debut-wave roster (from §2's
markup).

---

## 8. The rulings asked — an index

1. **The boundary law** (§1): ratify; bless the "level on its own terms"
   working rule.
2. **The exclusivity principle + the pair table** (§2): tests + anti-test;
   mark up the 12; buckler_strike stays out of wave one.
3. **The leveling economy** (§3): milestones (A), fork levels, the reach
   question (inst.level rec.), the no-tag-removal posture, re-pick policy.
4. **The schema** (§4): Option 1 + graft hybrid; the M0 override
   whitelist; the `skill@mode` ledger convention.
5. **The UI** (§5): panel row now, popup at M1, book later; the bar pip.
6. **Provenance** (§6): level-gated + the one-predicate seam; Lastlight
   coupling stays open, uncoupled.
7. **The movements** (§7): the cut, the rescale sequencing, the debut
   roster.

Nothing here is built, and nothing in `src/` moved for this charter.
