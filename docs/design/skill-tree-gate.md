# THE MYSTIC'S DOOR — gating the skill trees behind progress (charter v1)

**Status: DESIGN — nothing is built.** Written 2026-09-11 against HEAD
181cfb9d from her ask (near-verbatim below). Four DECISION CARDS (§4) await
her word; everything marked **DIAL** is a build-time lever. The survey
receipts (what the repo already carries) are in §1 so the cards argue from
facts, not from memory. Build movements are in §6.

Her frame: *"lock our skill's skill trees behind some sense of progress …
something like a Vault unlock that moves a Mystic into Lastlight
(potentially unlocking as an investment opportunity in the Vault after some
segment of Odyssey); once the Mystic has been unlocked as a default feature
(of which we can tie further progress into that I have ideas for), it opens
up the actual skill's skill tree."* Then three shapes for the per-skill
half: (1) the Mystic simply opens every tree; (2) a tree opens once the
account has obtained a LEGENDARY copy of that skill; (3) the legendary makes
the tree an INVESTMENT OPTION in the Vault, bought once, investable forever.

The thesis this charter keeps: the gate is DATA over the fabrics that
already exist (the gatework's avenues, the town's station ladder, the drop
index's ledger doctrine, the trees' one spend predicate) — one new station,
one new ledger contract, one new predicate, zero bespoke switches.

---

## 1. Lead findings (the repo as it stands, 2026-09-11)

1. **The trees already have ONE spend predicate and it is account-blind.**
   `treeNodeRefusal(inst, nodeId)` (engine/skills.ts) speaks the level seal,
   THE HARD LOCK, the prerequisite chain and the point budget; `World.
   pickTreeNode` composes it with the field discipline (`swapRefusal`).
   The pane, the drawer strip, the bar pip, the milestone sweep and the
   renderer's awakening bloom all read `def.tree` + `inst.level ≥ tree.level`
   (`treePickOpen`). The gate therefore lands as ONE more predicate composed
   in front of the standing one — never a second spelling anywhere.
2. **Ability points are DERIVED, never stored.** `bandPointsAt(level)` mints
   one per completed band ([5, 10, 15, 20]); nothing is banked. A sealed tree
   loses nothing: the day its road opens, every point the levels earned is
   spendable at once (THE BANK LAW, §3.4) — by construction, no migration.
3. **The legendary deed is already a ledger contract.**
   `LEDGER_LEGENDARY_SKILL_DROP` ('legendary_skill_dropped', meta/account.ts)
   is a flag stamped at THE ONE mint chokepoint (`World.noteGemDrop` —
   dropGemAt + the Bonewright's spoils hand their rarity in), metaProgression
   -gated (Immortal runs never feed), and it already gates a town station
   (the Training Dummy: *"that legendary Memory deserves better than
   guesswork"*). A PER-SKILL twin is one prefix key beside it.
4. **The legendary has a deterministic road.** `SKILL_RARITIES` weights
   common/magic/rare/legendary 54/30/14/2 (a crown-tier find is ~1-in-50,
   *"never a schedule"*); the Sacrificial Font's MERGE (`FONT_CFG.merge`
   3 commons → magic, 4 magics → rare, 5 rares → legendary) reforges 60
   commons of ONE skill into its legendary; THE STANDING ORDER commissions
   any gem the drop index has seen 3 times (`VENDOR_CFG.commission.need`);
   the bestiary + `MonsterDef.gemBias` say which kin drop what. A per-skill
   legendary key is therefore FARMABLE by four standing systems and needs no
   pity machinery of its own.
5. **The town station recipe is a closed grammar.** A station = one
   `FEATURE` flag + one `UNLOCK_CATALOG` feature row (the Town shelf) + one
   `TOWN_SITES` row (a seat per rung, THE QUARTER / APRON / ROAD laws
   probe-pinned generically — `probe_towngrowth` iterates the table) + one
   `TOWN_ADDITIONS` row + a `STRUCTURES` def with an `anchor` prop + the
   World's `near<Station>` / `update<Station>` dwell pair + a fixture NPC
   (`FIXTURE_IDS.townsfolk_*`) + a panel + one `registerMenuEntry` row.
   Weslan the Tracker (bestiary) and the Oracle Stone are the exact
   templates. The Mystic is that recipe once more.
6. **The gatework already speaks "after some segment of Odyssey".**
   `GateRow` avenues compose any-of; a rung *"may open along several
   independent roads, in the player's own order."* The Odyssey is unbuilt
   (memory: design in flight, no rulings) and THE MILESTONE DERIVATION's
   lesson forbids a stamper-less avenue (a dead gate). So the Mystic's door
   authors a LIVE road today, and the Odyssey's avenue is ONE appended
   `GateRow` the day its stamper exists — the same stance world.ts takes
   for `LEDGER_HERO_RENOWNED` (*"THE ODYSSEY'S FIRST ARM is the stamper-
   to-be"*).
7. **The opening bars ARE trees today.** Thirty-nine authored trees:
   the fresh-account starters (Warrior/Magician/Rogue ×3, data/
   starterSkillTrees.ts), the frontier starters (Hivecaller/Ranger/
   Guardian ×3), the Necromancer's rites/sacraments/summons (~14),
   wild_strike, and the five D4-roster ultimates (Master grants). Their
   charters call them *"the complete opening bars"* — a fresh account spends
   its first point at skill level 5 on its own class's arts. Locking THOSE
   behind the Mystic removes the fabric's day-one teaching; leaving them
   open makes the Mystic the door to everything BEYOND the kit (card 2).
8. **The precedent for "earned, never bought" is one week old.** Her
   2026-09-05 ruling made classes EARNED (the objective web) and moved the
   essence to MASTERY rungs; her 2026-08-15 dopamine ruling wanted the drop
   to be the event (*"oh yeah, awesome!"* over *"okay, time to convert"*).
   Both bear on card 1.
9. **Co-op has one account.** `World.account` is the keeper's (THE KEEPER'S
   GATE — vendors, stations, the class pool all read it); seats carry a
   class (`seat.meta.classDef`) but no account. The door and the keys are
   therefore keeper-wide by construction; the kit law reads each seat's own
   class.
10. **The sim is a throwaway account that "may probe anything."**
    `src/sim/arena.ts` mints a fresh account and unlocks every class so
    rigs can test any build. The gate must be waived there the same way
    (THE WORKSHOP ACCOUNT, §3.5) or every tree probe, the `skill@branch`
    census terminals and `sweep skills --modes` would read sealed.

---

## 2. The proposed shape at a glance

| layer | what it gates | who holds it | the recommendation |
|---|---|---|---|
| **THE KIT LAW** | nothing — a hero's OWN class openings (`classOpeningSkills`: bar + owned mastery alternates + Master grants) keep their trees open from the first run | per seat (its class) | keep (card 2) |
| **THE MYSTIC'S DOOR** | the fabric beyond the kit: no non-kit tree spends until the Mystic stands in Lastlight | the account (a Vault Town feature) | a station with a LADDER for her further rungs (card 3 picks today's road) |
| **THE KEY** | one skill's tree: opens once a LEGENDARY copy of THAT skill has come into the account's hands | the account (one presence key per skill) | earned, never bought (card 1), with an optional PAID road at the Mystic's table as an any-of alternate |
| **THE SPEND** | unchanged — points per instance, the hard lock, the Font's reset | per instance | untouched |

Everything below the door and the key is the trees as built. A sealed tree
is drawn sealed with its roads printed (§3.4) — the Vault's sealed-card
idiom carried to the pane.

---

## 3. The three layers

### 3.1 THE KIT LAW (day one stays day one)

A skill in the hero's own class openings wears its tree OPEN — no door, no
key. "Openings" is `classOpeningSkills(classDef)` verbatim: the bar's three,
every owned mastery alternate, the Master's grant. Two consequences worth
naming: the class-skill lane already reads this list ("+N to <Class>
Skills"), so the exemption and the class's power share one definition; and
buying a Mastery rung (Mortal Essence) opens the alternate's tree along with
the alternate — the vertical buys the horizontal here too.

The law is PER SEAT: a Rogue who finds a Cleave gem meets the door and the
key like any other skill; a Warrior's Cleave never does. **DIAL**
`MYSTIC_CFG.kitOpen` (true; false = everything meets the door — card 2).

### 3.2 THE MYSTIC'S DOOR (the station)

**The Vault row.** `feat_mystic` — kind 'feature', the Town shelf, flag
`FEATURE.MYSTIC`, `reqAnyOf: MYSTIC_CFG.door.roads` (gatework any-of),
`tease: true` behind a structural prereq she picks (the Tracker's own
idiom — Mireille's mana rung — so the card HANGS SEALED early with its roads
printed, and opens by the deed). Cost **DIAL** (`MYSTIC_CFG.door.cost`,
150 — between the Tracker's 90 and the recruiter's 120 and Twin Anvils' 400).

**The roads today (card 3).** Recommended: `{ ledger: LEDGER_LEGENDARY_
SKILL_DROP, label: 'hold a Legendary Memory' }` any-of `{ level: 20 }`. The
first crown-tier find is the moment the game already says "there is more in
a skill than its level" (the Dummy rides the same deed); the level road
keeps a player who never saw a crown from being walled. **The Odyssey
avenue** joins as ONE appended row the day its stamper exists — and if she
then wants the Odyssey to be THE road, the interim rows are deleted (data).
Never a stamper-less row (the reached_level_15 lesson).

**The body.** A `TOWN_SITES` row `mystic` (a seat per rung; her walk picks
the quarter — the north row beside the Font is the natural seat: the Font
UNMAKES tree choices, the Mystic OPENS them, THE MAGICAL PAIR grows into a
row; the probe's apron/road/quarter laws decide what fits), a
`TOWN_ADDITIONS` row raising `mystic_pavilion` (STRUCTURES def: an awning,
a low table, an attunement crystal as the `anchor` prop — the attunement
fabric's own object, `attuned_*` is the crystal that takes a blow's color),
and the fixture NPC `townsfolk_mystic` seated at the anchor with a
`speechRoles` row so the speech grammar deals her lines.

**The dwell → THE CONSULTATION.** `nearMystic` / `updateMystic` (the
Oracle's exact pair: `stationAnchor('mystic')` + `dwellReachable` +
`SALVAGE_CFG.stationRadius/stationDwell`) opens the Mystic's panel: every
tree-wearing skill the seat carries, listed OPEN or SEALED with its roads
and met-marks (the ONE fold of §3.4 — the panel never spells a road the
pane wouldn't), a door to each open skill's pane, and — if configured — THE
STUDY button (§3.3). Folio leaf `mystic`; menu row `mystic` (group 'town',
gate `{ feature: FEATURE.MYSTIC }`, `usable: nearMystic` — THE EXISTENCE +
REACH laws verbatim).

**THE LADDER (her further rungs).** `MYSTIC_CFG.ladder: MysticRungRow[]`
→ derived feature rows `feat_mystic_<i>` chained in sequence off the door
(the wares-ladder idiom: *"nothing here counts to three"*). Rung 1 IS the
door. Her ideas land as rows — the charter reserves the seat, proposes no
content.

### 3.3 THE KEY (one skill's tree)

**The contract.** `LEDGER_LEGENDARY_PREFIX = 'legendary:'`,
`legendaryKey(skillId)` — a PRESENCE flag per skill id ("a Legendary copy
of this skill has come into the account's hands"), account-direct +
metaProgression-gated like the drop index, idempotent by shape (a flag
cannot double-count, so several stamp seams are safe).

**The seams (card 4).** Recommended THE HELD LAW — three creation/
acquisition seams, one helper `noteLegendaryHeld(inst)`:
- `noteGemDrop` — the mint (it already receives `skillRarity` + the gem
  id; one line beside the existing first-legendary flag);
- `fontMergeSkill` — the reforge (5 rares → the legendary; the DESIGNED
  road, which the drop index deliberately does not count);
- `vendorBought` — a counter purchase (Brandt / the chandler / a
  commission fulfilled reserves on the shelf and is bought through the
  same seam).
Discards, corpse reclaims, looter spills and the Skill Graft (a common
cut) never mint a legendary and never route here. Mint-only (the drop
index's letter) is the alternative on the card.

**The road.** `MYSTIC_CFG.key(skillId): GateRow[]` — default
`[{ ledger: legendaryKey(id), label: 'a Legendary <name>' }]`. A tree spec
may APPEND roads of its own (`SkillTreeSpec.roads?: GateRow[]` — an
ultimate's tree opening by its own deed, a lair skill by its lair's
ledger) so a future author never edits the engine.

**THE STUDY (optional, card 1's rider).** `MYSTIC_CFG.study: null | {
essence: 'mortal' | 'ability4', cost }` — a PAID road at the Mystic's
table: pay to open one carried skill's tree without its legendary. Any-of
with the key, never a second gate. `null` = earned only (the recommended
first cut). This is where her option-3 essence sink lives if she wants
one — as an ALTERNATE road, so the legendary keeps its moment.

### 3.4 THE SEALED FACE, THE BANK LAW, THE ONE PREDICATE

**THE ONE PREDICATE.** `World.treeSealReason(seat, inst): string | null`
— the kit law → the door → the key, in that order; the words are
`gateRowLabel` of the first unmet road (one spelling, every surface).
Composed BEFORE `treeNodeRefusal` in `pickTreeNode`, in the pane's
`stateOf`, the drawer strip, the milestone sweep (`updateTreePips` skips
sealed trees), the awakening stamp in `levelUpSkill`, the renderer's pip
and the menu button's point roll-up. `treeNodeRefusal` stays pure
(account-blind) — the census walks it unchanged.
`World.treeSealRoads(seat, inst): { row, met }[]` is the same fold with the
met-marks, for the faces that print roads.

**THE SEALED FACE.** The pane draws the whole graph greyed under a seal
ribbon printing the roads with met-marks (the Vault's `sealedGateLines`
idiom: *"Opens by ANY of: …"*); the drawer strip prints `— sealed` with
the first unmet road in place of the `⟡ Tree` handle; the bar pip does not
draw and the awakening does NOT bloom for a sealed tree (THE TELL IS TRUE
— a pip that cannot be spent is a lie); the popup sweep never offers it.
**DIAL** (her walk): the sealed pane's node NAMES in the runescript until
the roads are met (the class-card shroud, `encipher`) — the flourish that
makes a sealed tree a puzzle rather than a wall.

**THE BANK LAW.** Points are derived; a sealed tree accrues its bands
silently and spends them all the day it opens. **THE UNSEALING IS AN
AWAKENING:** a sweep (`MYSTIC_CFG.sweepSec`, the class-claim idiom) notices
a carried skill's seal lifting mid-run — the door bought, a key stamped —
and stamps `treeAwokeAt` so the slot blooms and the hero flashes exactly as
a band completion does (the co-session's 2026-09-11 tell, reused, no new
painter). Spent picks are never touched by a seal: a tree sealed AFTER it
was spent (a traded kit gem, a legacy account) keeps its identity — owned
is owned; only new spends refuse. The Font's RESET stays available on a
sealed tree (un-choosing is never gated).

### 3.5 Laws

- **THE KEEPER'S GATE.** Co-op reads the keeper's door and keys
  (`World.account`); THE KIT LAW reads each seat's own class. Couch seats
  the same.
- **IMMORTAL SILENCE.** An Immortal run holds legendaries but never stamps
  keys (`metaProgressionActive()` — the drop index's and the bestiary's
  standing guard); its kit trees stay open by the kit law.
- **THE WORKSHOP ACCOUNT.** `src/sim/arena.ts` grants the throwaway
  account the door and every skill's key at boot (beside "unlock the full
  roster"), so every existing rig, the smoke suite, the census and the
  matrix are BYTE-IDENTICAL; the gate's own probe boots a fresh account.
- **THE TRANSPARENCY LAW holds.** An open tree with no picks is still
  byte-identical to no tree; a sealed tree is a refusal at the spend, never
  a change to the resolved views.
- **SAVE COMPATIBILITY: additive** (a flag, a ledger prefix, no schema
  move) — `SAVE_COMPATIBILITY` unchanged. Existing accounts meet the door on
  their non-kit trees at once; their spent picks stand (above).
- **THE DEFINING LAW of stations holds:** the Mystic has a verb (the
  consultation, the study, the ladder) — never an NPC who only exists.

---

## 4. Decision cards

### Card 1 — THE COMPONENT (her three, plus the rider)

| option | shape | what it costs |
|---|---|---|
| **A. The door opens all** | Mystic owned → every tree spendable | one gate; no per-skill chase; a legendary is still just four sockets |
| **B. THE KEY — earned (recommended)** | Mystic owned AND a Legendary copy of the skill ever held → that tree, forever, account-wide; mid-run, from the next spend | one ledger prefix + three stamps; every legendary drop gains a second meaning; the Font merge / drop index / Standing Order / bestiary become the tree's supply chain with zero new machinery |
| **C. THE KEY → a Vault row → bought** | as B, then a derived `skilltree` Vault row per keyed skill, priced in Mortal Essence, owned = investable forever | a second gate on the same deed; the drop's moment deflates into "go pay" (the 08-15 dopamine ruling); Mortal Essence is the run's END fold, so a key won mid-run waits a death; a per-skill kind on the Memories shelf (derived rows only where a key stands, the classtier idiom — feasible, ~tens of rows over an account's life) |

Recommendation: **B**, with the rider **THE STUDY** (a paid ANY-OF road
at the Mystic's table, `MYSTIC_CFG.study`, shipped `null`) as the place an
essence sink lives if she wants one — an alternate road keeps the legendary
the event; a second gate makes it the errand. Her 09-05 EARNED LAW for
classes is the precedent: the deed claims, the essence buys mastery.

### Card 2 — THE KIT LAW

**Exempt the hero's own class openings (recommended)** — the opening bars
were authored as the fabric's day-one teaching (the starter charters
describe "complete trees for all three skills on their starting bars" and
"nine opening skills"; CLAUDE.md calls their probe "the complete opening
bars"), the class-skill lane already defines the set,
and a Mastery purchase opens its alternate's tree for free. **Lock
everything** — purist: the Mystic is the first tree anyone spends; four
points per starter accrue silently until then (the bank law makes it
lossless), and the awakening tell must stay silent on every fresh run's bar
until the door — the first band completion at skill level 5 becomes a
non-event. The dial is one boolean; the card is which default ships.

### Card 3 — THE DOOR'S ROAD TODAY (pre-Odyssey)

Any-of, in her order: **the first Legendary Memory (`LEDGER_LEGENDARY_
SKILL_DROP`, already stamped) any-of reach level 20 (recommended)** · the
first legendary alone · a level milestone alone · any vocation / a quest ·
a counted deed (three legendaries — needs a counter beside the flag). And
the card's second half: when the Odyssey's first arm exists, does its
avenue **join** the any-of (recommended — "whichever road first") or
**replace** today's roads (the Odyssey becomes THE door; a data edit
either way). Structural prereq for the tease: Mireille's mana rung (the
Tracker's idiom) or none (visible sealed from the first Vault).

### Card 4 — WHAT COUNTS AS "OBTAINED" (the key's seams)

**THE HELD LAW (recommended):** mint + Font reforge + counter purchase —
every road that CREATES a legendary copy in the account's hands; the merge
is the designed road and must count. **Mint only:** the drop index's letter
(abuse-proof at one chokepoint) — the Font's reforge would then open no
tree, and the deterministic road dies. **Held in hand:** stamp at the
residence's entry (pickup / merge / purchase / grant) — the same three
creations plus the reclaim of a legendary that dropped and was lost before
pickup; more seams for one edge case.

---

## 5. Schema + the QA line

- **data/mystic.ts (new):** `MYSTIC_CFG` { door: { cost, roads:
  GateRow[], teaseAfter?: feature }, kitOpen, key(skillId): GateRow[],
  study: null | {…}, sweepSec, ladder: MysticRungRow[] }; the fixture id +
  speech roles; the door + ladder rows DERIVE into `UNLOCK_CATALOG` (the
  wares-ladder idiom).
- **meta/account.ts:** `FEATURE.MYSTIC`; `LEDGER_LEGENDARY_PREFIX` +
  `legendaryKey`. **engine/world.ts:** `noteLegendaryHeld` at the three
  seams; `treeSealReason` / `treeSealRoads`; the sweep; `nearMystic` /
  `updateMystic` / `mysticHint`; the pickTreeNode / updateTreePips /
  levelUpSkill compositions (the levelUpSkill hunk is the co-session's
  live awakening edit — land AFTER theirs). **engine/skills.ts:**
  `SkillTreeSpec.roads?`. **data/townBuild.ts:** the `mystic` site +
  addition rows. **data/structures.ts:** `mystic_pavilion`. **data/
  monsters.ts:** `townsfolk_mystic` + `FIXTURE_IDS`. **data/menu.ts:** the
  row. **ui/panels.ts:** the sealed pane face, the drawer strip, the
  consultation panel (folio leaf). **render/renderer.ts:** the pip/bloom
  read (one predicate). **sim/arena.ts:** THE WORKSHOP ACCOUNT. **dev/
  tabs/account.ts:** own the door / stamp keys for carried skills / forget.
- **Probe `balance/probe_treegate.ts` + its roster row (same commit):**
  A. the kit law (own class open, another class's gem sealed, a mastery
  alternate open once owned); B. the door (fresh account sealed, the flag
  opens, the teased Vault card prints the roads with met-marks); C. the
  key (the three stamps each open exactly their skill; idempotent; Immortal
  silence; a support gem never stamps); D. THE BANK LAW (bands accrue
  sealed, all spend after; spent picks survive a seal; reset allowed);
  E. THE ONE PREDICATE's words at every surface (pane / strip / pip / sweep
  / popup — byte-equal); F. THE UNSEALING awakening; G. THE WORKSHOP
  ACCOUNT (probe_skillmodes + `sweep skills --modes` fingerprints unmoved);
  H. the town seat (probe_towngrowth's generic laws cover the new row —
  assert it is in the table + the dwell/hint agree); I. the menu row's
  existence + reach; J. `SkillTreeSpec.roads` append on a fixture.
- Docs: this charter's as-built block; `docs/meta/gatework.md` gains the
  key's contract line; CLAUDE.md layout entry.

---

## 6. Build movements

- **M0 — THE GATE:** the contract, the three stamps, the one predicate,
  the sealed face, the bank/unsealing sweep, the kit law, the workshop
  account, the Vault door row, the probe. Ships with the door as a Vault
  feature whose body is M1 — the two land as one pair so the door has a
  body the day it opens.
- **M1 — THE STATION:** the site (her walk picks the seat), the pavilion,
  the Mystic, the consultation panel, the menu row, the speech roles, the
  ladder scaffold (rung 1 = the door; no further content).
- **M2 — HER RUNGS:** her further ideas as ladder rows, each its own card.
- **Later, one row each:** the Odyssey avenue on the door; `study` if she
  wants the paid road; `SkillTreeSpec.roads` on any tree that earns its
  own way.

Order: M0+M1 together → M2 at her word.

---

## 7. Open dials (build-time levers)

Door cost · door roads + the tease's structural prereq · `kitOpen` ·
`study` · `sweepSec` · the site's quarter/seats (her walk) · the pavilion's
dressing + the Mystic's look and lines · the sealed face (runes or plain) ·
the strip's sealed wording · the ladder's rung shape.
