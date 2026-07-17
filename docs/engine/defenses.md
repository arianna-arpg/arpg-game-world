# Defense Textures — the signature-pool doctrine

How the four defensive pools (poise, insight, energy shield, endurance)
stay DISTINCT, opt-in, and counterplay-rich — engine rules in
`engine/defense.ts` + `engine/stats.ts`, identities authored in
`data/monsters.ts`, boot-guarded in `data/validate.ts`, pinned by
`balance/probe_defenses.ts`.

## The pools ship EMPTY

All four signature pools have STAT_DEFS base 0. Nothing in the world is
born with poise or insight anymore — a pool exists only where a base is
**authored** (a monster's `base.poise`, a boss's DEFENSE_CFG seed) or
**bought** (gear defense lanes — itemaffixes `DEFENSE_KINDS` rolls poise
on belt/torso, insight on head/feet, ES on caster armor; flat passives
like `for_p1`/`cha_p0`/`wil_p0`; stance grants like Wellspring Stance's
`+30 poise while held` selfMod).

**Attributes SCALE, never seed**: fortitude/charisma/willpower grant `1%
increased` poise/insight/energy shield per point (no flats). With no base,
1% of zero is honestly zero — the pool is the investment, the attribute is
the multiplier. Every zero-max path is inert by construction: no DR, no CC
shrug, no break fanfare, no weight anchor, no bar drawn.

## One signature per body

The enemy-feel doctrine: monsters differ by HOW they defend, so no single
player answer dominates. Each family carries at most ONE of the trio
(bosses may stack — the rare apex showpiece; boot warns on rank-and-file
stacks, on passive objects authoring pools, and on `poiseDR` without a
bar):

- **Poise bruisers** — the braced, armored, massive (juggernauts, knights,
  wardens, marshals; bands ~30-60 rank-and-file, 60-110 walls; bosses
  auto-seed `DEFENSE_CFG.poise.bossBase`). Sub-texture: **burst-window
  walls** author `base.poiseDR` 0.4-0.5 (bone_colossus, siege_hulk,
  pyre_titan, deadwake_bonelord, elder_treant, ruin_sentinel, vor_maw,
  marshal_morgrath) — commit through the bar under heavy reduction, then
  the break drops the DR **and** lands Sundered's damageTaken amp: the
  burst window is the whole fight plan.
- **Insight skirmishers** — the duelists, stalkers and readers (ronin,
  swordsaints, prowlers, reapers, lash maidens; bands ~25-45). Mobile by
  nature: their own movement feeds the momentum that powers the slip.
- **ES glass** — liches, deathless nobles, wisps, the ethereal courts
  (ES ≈ 0.6-1.5× life with life trimmed). Ethereal bodies favor ES over
  poise by ontology — ghost-stuff doesn't brace.
- **Evasion / armor / shell** — the pre-existing poles, unchanged here.
- **Prey, beasts, vermin, swarms, objects** — NONE of the trio. Their
  honesty is life, speed, numbers… and breath (below).

## Counterplay, per pool

- **Poise**: attacker `poiseDamage` investment breaks it; broken =
  Sundered + zero DR + shovable (poise-is-mass lets go) — **burst**.
- **Energy shield**: recharge is delay-gated and interruptible —
  **sustained pressure** holds it down; `esShred` strips it faster;
  DoT seeps via `esDotBypass`; burst deletes between recharges.
- **Insight**: the `insightSap` stat (0..1) multiplies the FINAL momentum
  blend — spend **and** refill. Worn as ordinary status mods: chill 0.4,
  frozen/stunned/petrified 1. **Cold is the answer to the duelist you
  cannot pin.** `insightPen` (attacker) beats the read directly; the pool
  also simply drains. Any status/ground/curse can carry sap — it's a stat.
- **Endurance**: unchanged — the break-less wall that spends what it
  prevents.

## Breath — the default kite budget

`MATERIAL_NATURE.breathes` (+ `MonsterDef.breathes` override) marks the
bodies that TIRE: flesh, fur, scale, chitin. Every breathing body with no
authored TempoSpec wears `BEHAVIOR_CFG.defaultKite` (3.2s of accrued
backpedal → a 0.9-1.5s winded pause), so perpetually-kiting live enemies
are a chase rhythm, not an exercise in futility. Authored
`TempoSpec.kite` always wins (`kite: Infinity` = the deliberate tireless
runner); `tempo: null` — preserved through `mergeTuning` for exactly this
read — still means "never pauses, never winds" (the wave frenzy's
pledge). Bone, stone, ember and ghost-stuff never tire unless opted in.

## Verification

`npx tsx balance/probe_defenses.ts` (42 pins): empty-base doctrine,
attribute scaling shape, material-nature coverage, object inertness +
corpse gating (see docs/engine/corpses.md), zero-max CC honesty, the
burst window armed-vs-broken, the sap ladder (1 / 0.6 / 0 momentum with
mitigation 60/70/110 on one def), refill stall, default-kite stamping,
and the ES soak/recharge/interrupt loop. `sim run --suite smoke` +
`audit textures` grade the fleet-level result.
