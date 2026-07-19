# THE MIMICRY FABRIC — bestiary-gated capture of enemy arts (the blue mage)

`src/engine/mimic.ts` · probe `balance/probe_mimic.ts` · slot gem + teaching
arts in `src/data/skills.ts` · supports in `src/data/supports.ts` · the
Mummers in `src/data/monsters.ts` + `looks.ts` · camp in
`data/formations.ts`/`compositions.ts` · pool rows in `src/meta/unlocks.ts`

Every monster skill is already an ordinary catalog `SkillDef` fired through
the ONE `useSkill` pipeline — so stolen casts needed no second pipeline.
The fabric is a CAPTURE BANK, a SLOT, and POLICY, all data.

## Capture

An enemy art that **lands on** a watching seat (`World.resolveHit`, after
evade/block/immune — you learn what you survive) enters `Actor.mimicBank`,
distinct by skill id, capped (`MIMIC_CFG.bankSize` + the `mimicBank` stat),
oldest-out — eviction spares the held selection. Each entry keeps the
SOURCE kind (`src`) so every UI chip wears the teacher's face.

**The knowledge gate:** capture requires the source kind studied to
`MIMIC_CFG.studyGroup` (default `'arts'` — the bestiary tier that reveals a
monster's moveset: the gate and the reveal are the same fact). The dev
Account tab's "Study all to arts" button stamps exactly this tier.

**The witness lever:** the `mimicWitness` stat (> 0) opens capture on arts
merely **seen** cast within `value × MIMIC_CFG.witnessRadius`, sight-refereed
via `World.lineOfSight` (hooked at the completed-real-use site in
`executeSkill`). Read off the mimic slot itself, so Keen Study socketed
there — or any passive/gear mod — grants it.

**Null-cost law:** both hooks gate on `Actor.mimicWatch`, a throttled cached
boolean (the comboWatch idiom, `MIMIC_CFG.watchRefresh`). Builds without the
slot pay one boolean per landed hit. Baseline-checked: no gated metric moved.

**Ramp law:** the bank is combat-transient exactly like the castRing — null
until first capture, cold on a fresh session, released when the slot leaves
the bar. Never saved; mirrored to co-op clients via `ActorW.mk`/`ms`
(render-only).

## The slot

`SkillDef.mimic` marks a slot (the `mimicry` gem). Pressing it **is** the
selected captured art — minted per host at the host's effective level via
the convert/meta idiom (`mintMetaInstance`): `hostSkillId` stamped, the
slot's socket array SHARED (tag admission decides per face what fits), and
`MIMIC_CFG.powerFactor` (or `mimic.powerFactor`) stamped as instance-local
`extraMods` (`damage more factor−1`). The minted cast then runs the whole
ordinary pipeline:

- `slotFaceOf`/`pressUsable` present and judge the captured face (HUD free);
- the art pays its own costs and runs its own cooldown (keyed by ITS id);
- `recordCast` sees the art's REAL id/tags — **combo grammars hear stolen
  casts for free** (probe-pinned);
- an empty bank is a dead button with a "no art captured" fail note.

Selection: newest capture self-selects; the slot's innate meta press
(`mimic_attune`, the `mimicSelect` SkillEffect) cycles; build-flap chips
(`data-mimicsel`, portrait-fabric faces) jump via the `mimicSelect`
MetaAction — host-authoritative like every meta mutation.

## Policy

Per-skill `SkillDef.mimicable` is the explicit allow/deny lane; unset falls
to `MIMIC_CFG.denyTags/denyDeliveries/denyEffects` (summons and
minion-command shapes refused by default — the power factor scales damage,
never bodies). STRUCTURAL refusals (mimic slots, `invokes`, `throng`,
grimoire summons) beat even an explicit allow. `validateContent` nets: a
mimic slot may not also convert/comboChain; `mimicable: true` on an art no
monster kit teaches is a dead allow.

## The Mummers (the teaching troupe)

Low `bestiaryKills` kin (studied FAST — the first pages a blue mage fills)
walking the settled country (downs + meadow tables), `gemBias: ['mimic']`.
Each SILHOUETTE is its art's tell, parts all from the existing look grammar:
mockthrush (wings/spots — Mocking Refrain), glasskin_aper (crystal coat —
Shard Waltz), masque_haunt (one bright held mask — Borrowed Visage),
the_understudy (cape + worn mask + daggers — Showstopper, plus the
Matador's own Cape Feint: catalog reuse, and therefore stealable). Teaching
arts are `noDrop`: capture is the only way to cast them — that is the point.
The `mummers_camp` composition (cart, fire, benches, `masque_banner`,
brittle `mirrorglass_shard`) marks their ground; existing painters only.

## Obtainability

`gem_skills_mimicry` unlock row, gated `reqLedgerCounts: {bestiaryKey('mimic'): 1}`
— kill ONE chest that pretended, and the discipline surfaces (the counted
ledger lever). `sup_mimicry` (Keen Study, Understudy) chains off it. The
POOL-ORPHAN validator net added with this pass guards the whole class of
"defined but never pooled" gems (see `sup_counterpoint` — the fixed
Polyphony/Ostinato orphans).

## Deliberate deferrals

- A mimic-scoped support that boosts only mimic casts on the minted face
  (needs `grantsTags` on the slot or a face-side tag graft — decide with
  the next supports pass).
- Boss-tier capturables with per-slot `powerFactor` overrides.
- A sim build slice pre-seeding the bank for `sweep skills` ranking of the
  stolen pool at factor (the pool's members already rank in the sweep at
  1.0; the factor scales uniformly).
- Witness-lane FX (a brief eye-glint on the watching seat).
