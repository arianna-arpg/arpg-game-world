# The Worn Graft (slot grafts) — supports granted by position

Gear that grants a support gem to a **bar seat**, not to a skill: *"the skill
in Skill Slot 3 is granted Level 1 Multistrike."* The player aims the grant
with their own binding hand — re-bar the build and the same glove empowers a
different skill. New affix avenue, new chase economy, and a build lever that
changes texture run to run.

## The one truth: a stat family

`slotgraft_<slot>_<gemId>` (engine/skills.ts `slotGraftStat` /
`parseSlotGraftStat`; slot is **1-based** — the player's own "Skill Slot N"
vocabulary; the ordinal leads because gem ids carry underscores). The stat's
folded value **is the granted gem's level**: multiple grantors SUM through the
ordinary stat engine, the injection floors and clamps to `MAX_SUPPORT_LEVEL`,
and a value below 1 grants nothing.

Because the truth is a stat, **any modifier source can grant a slot graft**:
rolled affixes, unique lines, vestige words, passive nodes, class innates —
zero further engine work per new grantor. Every id is registered in
`STAT_DEFS` (data/supports.ts tail — the orbs.ts loop pattern) so lines
validate, label (`"Multistrike Graft (Skill Slot 3)"`) and clamp like any
other stat; the char-sheet blurb rides `SHEET_FAMILY_SEATS` (data/sheet.ts).

## The injection (World.recalcSeat)

Candidates come from a prefix scan of the recalc-time mod arrays already in
hand (class innate, tree grants, worn gear including vestige lines) — zero
cost when the family is absent — then each id folds through `sheet.get`.
The granted `SupportInstance` pushes into `inst.grafts`, the SAME derived
lane passive grafts ride, so `hostSockets` and every payload reader see it
with no edits, minion forwarding included. Laws, mirroring real socketing:

- **The full socket-time gate** (`supportFitsInstOrCrew`) runs at injection.
  A misfit sits honestly dormant and **self-lifts**: socket an enabler that
  grants the missing mechanism and the next recalc wakes the worn copy
  (socket/unsocket call `recalcSeat` for exactly this reason).
- **The yield law** (the forward lane's no-second-copy rule): a gem already
  socketed — or grafted by an earlier source (passives run first) — wins;
  the worn copy goes dormant rather than double-folding.
- **Aimed by the hand**: `bindSkill` re-derives and re-syncs the touched
  hosts (`rebindWornGrafts` — bindGraft's law). An empty seat waits.
- **Derived, never saved**: gear + bar are already persisted; grafts rebuild
  every recalc, on clients too (snapshot apply → recalcSeat — the projection
  answers identically both sides). `unlearnSkill` strips them from the
  departing instance so an inventory card never shows a stale power.

**The ledger** (`Seat.wornGrafts`, `WornGraftRow`): the injection records its
own verdicts — `live` / `duplicate` / `unfit` / `empty` — and the panels
speak dormancy from those rows verbatim (the Worn strip in the skill book +
greyed per-skill chips with reasons). One derivation, one spelling.

## The catalog (data/itemaffixes.ts `SLOTGRAFT_CFG`)

One suffix per (wild gem × bar seat), GENERATED from `SUPPORT_LIST` ×
`BAR_SLOTS` — "of the *Nth* Finger". Dials, never literals:

- **The budget law**: `familyWeight` is the TOTAL pick mass of the whole
  catalog; each row weighs `familyWeight × gemDropShare ÷ BAR_SLOTS`. Adding
  gems never inflates the family's presence, and rarer gems mint rarer
  grafts — the shelf's own odds, no parallel valuation.
- **The ladder**: CLASS_SKILL_AFFIXES' exact integer shape — T1 = Level 1,
  EXQUISITE = Level 2, blue-only. Uniques may author up to
  `MAX_SUPPORT_LEVEL`.
- **Drop restriction is structural**: a gem with drop weight 0 never enters
  the rolled catalog, but unique/vestige lines may still write its stat —
  **item-exclusive supports** ride the same family by construction (mint a
  weight-0 gem and hang it on one legend: the whole run changes texture).
- Eligible bases ride `baseTags` (gloves/ring/amulet at debut).

## The debut legend

**The Rote Hand** (gloves — data/uniques.ts): Multistrike → Skill Slot 1,
Splitting → Skill Slot 3, at pinned whole levels with spoken lines ("The
skill in Skill Slot 1 is granted Level 1 Multistrike"). On most builds one
line runs and one sits dormant — the item that teaches the fabric's honesty
by being worn. *"Every finger remembers."*

## Boundaries

- Conditional (`when:`) slotgraft lines are legal but resolve at RECALC
  time, not per-frame — author them unconditional.
- Status-granted slotgraft stats don't re-derive on status change (recalc
  runs on loadout mutations); statuses are not a supported grantor today.
- While possessed, the borrowed kit derives nothing — the bar, the gear and
  the recalc all stay HOME (the possession seam's standing law).
- Gear swaps re-derive grafts instantly, but forwarded copies on a STANDING
  court refresh on the next resummon/resync (bar/socket mutations resync
  eagerly; the wardrobe lane accepts the standing-court lag — the
  chandlerStock class of named gap).

Probe: `balance/probe_slotgraft.ts` (catalog shape + budget, gate honesty,
yield law, hand-aiming, level fold + clamp, The Rote Hand teaching pair,
save-fidelity, unlearn strip). Census hygiene: bare sim instances carry no
gear, so the support no-op matrix never sees a graft.
