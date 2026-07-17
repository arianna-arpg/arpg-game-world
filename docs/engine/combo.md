# THE COMBO GRAMMAR — one sequence matcher, cast-cadence as data

`src/engine/sequence.ts` (the matcher + the ring + the rule schema) ·
`src/data/combos.ts` (the rule registry) · probe: `balance/probe_combo.ts`

The game speaks several cadence vocabularies; each keeps its own verb, and
exactly **one matcher** serves them all:

| fabric | verb | where |
|---|---|---|
| `SkillDef.comboChain` | **EXECUTES** a sequence (one key walks Unisect → Bisect → Trisect) | world.ts chain redirect |
| `SkillDef.castCycle` | **COUNTS** one skill's own uses (every Nth press imbues) | skill-local |
| `SkillDef.invokes` | **BANKS** a resource (elemental casts mint runes; the invoke burns them) | `data/invocations.ts` |
| `requiresStatus` / `consumesStatus` | consume marks on the **TARGET** | world.ts gates |
| **THE COMBO GRAMMAR** | **READS** the caster's own recent-cast history | this fabric |

## The one matcher

`matchSeqRule(symbols, rule, fit, keyOf)` in `engine/sequence.ts` is the
single sequence matcher in the game. A rule carries exactly **one** pattern
kind, checked in fixed order (this order IS the historical invocation
contract — a rule's `seq` never falls through to its own `counts`):

- `seq` — the sequence must **end** with symbols fitting these, in order.
- `counts` — a tail holds at least these counts, any order (matched span =
  the minimal satisfying tail; each symbol pays at most one row).
- `vary: { n }` — the last n symbols pairwise-**distinct** under `keyOf`.
- `repeat: { n }` — the last n symbols **identical** under `keyOf`.
- `minLen` — fallback: any sequence at least this long (span = everything).
- `gate` — vary/repeat/minLen only: every symbol of the span must also fit.

`resolveSeqRules` adds ranked first-match-wins over an ordered rule list.
`resolveInvocation` (data/invocations.ts) is now a thin delegate — its rule
table is unchanged and `balance/probe_combo.ts` pins ported-vs-frozen parity
over an 800-sequence fuzz. **Do not write a second tail-walker**; new
grammars (grab-verb beats, beat-clock readers) bring their own symbol
alphabet to these functions.

## The recent-cast ring (null-cost discipline)

Every completed REAL use (the rune-banking gate: no repeats, no channel
pulses, no construct casts) may append `{sid, tags, at, seq}` to
`Actor.castRing` — but recording only happens while `Actor.comboWatch`
holds:

- an equipped grammar: any `combo_<id>` stat compiled > 0, or
- a live `when: 'comboVaried' | 'comboRepeated'` modifier on the sheet
  (`StatSheet.usesCondition`) or — players/mercenaries — on a bar
  instance's compiled mods (socketed gems).

The watch is re-evaluated at most once per `COMBO_CFG.watchRefresh` at the
record site (`World.recordCast`). Unwatched actors keep a **null ring**, an
unchurned condition mask, and byte-identical sim baselines (the baseline
gate holds; the probe asserts all three). When the watch lapses, the ring
is released — combat-transient, never a leak, never serialized.

## ComboRuleDef (data/combos.ts)

Patterns read the **authored tags** of recent casts (`ComboStep`: `tags`
all-of, `anyTags` any-of, `notTags` none-of, `skillId` exact). `vary`/
`repeat` name casts by a `ComboKeyBy`: `'skill'` (id), `'element'` (first
elemental tag in canonical order — tags, never rolled numbers: the grammar
must be readable at the bar), `'lane'` (attack/spell/move/other). Timing:
`within` seconds over the matched span, scaled live by the owner's
**comboWindow** stat (base 1 — "windows stay open 50% longer" is one
modifier); `icd` paces re-fires; completing a pattern **consumes its span**
(per-rule seq bookkeeping — the shared ring never mutates) so the pattern
must re-form, unless `overlap: true` opts into rolling matches.

**Payoffs ride THE proc pipeline** (`World.executeProc`): a rule's `effect`
is one owner-scoped `ProcEffect` (buff / restore / heal / gainCharge /
burst / fortify / cooldown / delayedBurst) — floating text, flash, gain
gates, even authored proc riders (host `'combo:<id>'`) come free. The
validator refuses target-shaped effects: a grammar completes on a CAST,
not a hit. No second payoff executor exists.

## Granting (the proc_<id> idiom)

`combo_<id>` is an ordinary stat (base 0, auto-registered per rule with the
rule's blurb): any passive node, vocation node, `equipMods` skill, affix —
or `MonsterDef.mods` — equips the grammar with one modifier. Combos are a
build axis, never ambience. Shipped consumers:

- **Spellblade vocation** (magician): grants `spellblade_weave`
  (Blade-and-Vein — vary by lane, n 2), rides `comboVaried` notables,
  bends `comboWindow` (keystone).
- **Tree notables**: Battle Cadence → `drumbeat` (repeat 3, stacking
  surge); Prismatic Cycle → `elemental_round` (vary by element, 3).
- **Support gems**: Polyphony (`when: comboVaried`) / Ostinato
  (`when: comboRepeated`) — conditional MORE damage plus an always-on cost
  line. Socketing one wakes the ring by itself.
- **The cadenced kin** (deepwood/highland): `cadence_fencer` drums
  Drumbeat, `cadence_cantor` rounds the elements, `cadence_maestro` weaves
  Blade-and-Vein — the SAME registry rules, so the payoff text over a duel
  names a grammar the player can earn. Their `beatPips` look part (live,
  kindling in sequence) is the at-a-glance grammar-tell.

## The starter conditions

`comboVaried` / `comboRepeated` are ordinary `ConditionId`s: the last
`COMBO_CFG.conditionRun` casts all-different / all-same skills, fresh
within `conditionWindow`. Stamped at record time onto
`Actor.comboCondBits`, decayed by `comboCondLeft` in `updateTimers`, read
by `refreshConditions` only while `comboWatch` — the mask can never churn
on cast history for unwatched actors.

## HUD + co-op

The bar draws one pip row per equipped grammar above its LEFT edge (the
runes keep the right; circles vs diamonds): pips fill with live progress
(`comboProgress` — presentational; firing truth is `matchComboRule`), and
a completed measure flashes the rule's name for `COMBO_CFG.hudGlow`.
Co-op clients get host-computed rows (`ActorW.cb`, the boss-bar idiom) and
banked runes (`ActorW.rn`) on the wire; the mirror's `Actor.comboHud` takes
precedence in the renderer. Dev tab **Combo**: grant/clear grammars, live
ring/condition/progress readout.

## Gates

`npx tsx balance/probe_combo.ts` (matcher laws, invocation parity fuzz,
null-cost, fire/consume/stack, windows + comboWindow, condition wake/decay,
the enemy fencer drumming with zero bespoke code, the registry weave) ·
`probe_sheet` (stat seating) · sim smoke + `baseline check` (byte-identity
for non-combo builds) · `sweep supports --support polyphony|ostinato`
(Ostinato goes live broadly under the mono-skill pilot — the repeat
condition earns itself; Polyphony's variety waits for multi-skill
rotations by construction).
