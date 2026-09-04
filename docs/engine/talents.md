# The Talent Fabric

WoW-talent and Ascension Random-Enchant mechanics as plain data on the
surfaces this game already has: a passive node, a support gem, a gear affix,
a unique line, a vestige, a buff. This document is the catalogue of mechanism
SHAPES those systems use, the lever each maps to here, and the laws of the
five levers this pass added. Probe: `balance/probe_talents.ts`.

The doctrine did not change: an effect is a registered stat, every surface
is a different way of attaching a `Modifier` to it, and a modifier has four
expressive axes — `kind` (flat / increased / more / override / link),
`tags` (what the action IS), `when` (the actor's own state) and `gauge`
(a live integer quantity). The pass grew those axes rather than adding a
parallel "talent" system: tags learned to say who a hit is AGAINST, `when`
learned time, `gauge` learned quantities the actor does not bank and learned
to gate as well as scale, and the proc registry learned the events talents
actually key on.

## The five levers

### 1. The victim scope — `vs:` tags (`engine/victim.ts`)

A modifier's tags describe the action (`melee`, `fire`); a `vs:<condition>`
tag describes the struck body. `World.resolveHit` folds the victim's live
state into the roll's context — every registered victim condition that
holds plus one `vs:<statusId>` per status the victim carries — so any
attacker stat read through that context (damage, added damage, crit chance,
crit multiplier, ailment chance, the `apply_` family, proc chances) scopes
to the victim with an ordinary tag filter:

```ts
mod('damage', 'more', 0.3, ['vs:lowLife'])       // Execute
mod('critChance', 'flat', 0.25, ['vs:frozen'])   // Shatter
mod('damage', 'more', 0.4, ['vs:behind'])        // Backstab
mod('statusChance', 'flat', 0.3, ['vs:hardCC'])  // the opportunist
```

Registered conditions (`registerVictimCondition`): `lowLife` (the victim's
own low-life line), `fullLife`, `hardCC`, `afflicted` (any damaging
ailment), `fleeing`, `wet`, `elite` (the regicide rarities or a boss),
`boss`, `minion`, `poised`, `poiseBroken`, `stationary`, `moving`,
`casting`, `behind` (the backstab geometry), `unaware` (the ambush read),
`higherLevel`, `lowerLevel`, `grabbed`, `airborne`, `guarding`. Any status
id works unregistered (`vs:chill`, `vs:bleed`, `vs:taunted`).

Laws:
- **Never authored on a skill.** A vs: tag is context, not identity; the
  validator refuses one in `SkillDef.tags`.
- **Null-cost until named.** The fold runs only when the attacker's sheet
  (`StatSheet.hasVsMods`, derived once per source generation) or the
  striking instance carries a vs: tag (`victimScopeArmed`).
- **One read, drawn == tested.** Each condition reads the field the engine
  itself acts on — the low-life line the vignette draws, the `hardCC` flag
  the AI honors, the plant clock the stance reads.
- **The packet carries it.** `DamagePacket.tags` is the victim-scoped set,
  so everything downstream of the roll that queries with it (the ailment
  sweep, hit procs, on-kill sustain) stays victim-scoped by construction.
- The boss read is a bestiary fact; the world installs `VICTIM_HOOKS.isBoss`
  at load so the engine module never imports data.

### 2. The recency ledger — `recently*` conditions (`engine/recency.ts`)

"If you have killed recently", "if you have not been hit for a while" —
as `ConditionId`s. The actor keeps a seconds-since counter per event kind
(`Actor.since`, ticked in `updateTimers`, zeroed by `Actor.noteRecent` at
the engine's own seams) and the condition mask reads each against
`RECENT_CFG.windowSec` (4 s; per-kind overrides in `RECENT_CFG.window`).

| condition | stamped at |
|---|---|
| `recentlyHit` / `recentlyCrit` | a landed hit / critical hit you dealt |
| `recentlyKilled` | a kill credited to your landed hit |
| `recentlyHurt` / `notHurtRecently` | a landed hit you TOOK (DoT ticks never) |
| `recentlyBlocked` / `recentlyEvaded` | a block / evade you made |
| `recentlyMoved` | a movement-tagged skill you completed |
| `recentlyHealed` | any heal that landed on you |

Laws: hits are hits (a burn is not a blow); the window is data; the inverse
holds from the first frame; **the edge is an event** — a condition that
flips ON is queued on `Actor.condRose` and swept into `'condition'` procs.
`CONDITION_IDS` (stats.ts) is the one ordered list the actor's bit mask,
the validator and the tooltips share; a new condition is one union member
plus one row there, never a hand-numbered bit.

### 3. Derived gauges + the gauge gate (`engine/gauges.ts`, `Modifier.gaugeAt`)

`gaugeMod` already scaled a modifier by any live integer the actor
publishes (status stacks, charges, brim pips, reserve pips). The registry
adds quantities the world must DERIVE, sampled at `GAUGE_CFG.cadence`
(0.25 s) and published only for actors that READ them
(`Actor.gaugeReferenced` — the sheet's `usesGauge` plus the slotted
skills' innate/socketed mods):

`life:missing`, `mana:missing`, `es:missing` (tenths missing, 0–10) ·
`foes:near`, `allies:near` (within `GAUGE_CFG.nearRadius`, capped) ·
`minions` (living summons) · `afflictions` (damaging ailments on you) ·
`buffs`.

```ts
gaugeMod('damage', 'increased', 0.03, 'life:missing')   // per 10% missing
gaugeMod('damage', 'increased', 0.02, 'foes:near')      // per nearby enemy
gaugeGateMod('critMulti', 'flat', 0.4, 'charge:fury', 5) // AT 5 charges
```

`gaugeAt` is the threshold twin: the full value at or above the line,
nothing below. The gauge golden rule stands: bounded integers on a cadence,
never per-frame floats, never a stat query.

### 4. Proc triggers, gates and effects (`data/procs.ts`)

New triggers: `hurt` (you take a landed hit — sheet-only, the striker is
the target), `miss` / `foiled` (your hit was evaded / blocked), `cast` (a
completed real use, with the cast's context), `condition` (a ConditionId
flips on — `ProcDef.condition`), `pulse` (every `every` seconds while the
chance stands), `minionDeath`, `heal`, `lastGasp`.

New gates on any proc: `when` / `unless` (owner conditions), `requireBuff`
/ `requireStatus` (worn), `noCrit`, `vs` (victim conditions on the event's
other body), `tags` (the def-level tag lock).

New effects: `cooldown` grew `fraction` / `reset` / `skills` / `tags` /
`exceptSelf`; `removeBuff`; `ward`; `cleanse` (statuses / every hard CC /
every damaging ailment).

**The sheet-lane doctrine** (the 'surface' rule, generalized): `hurt`,
`condition`, `pulse`, `minionDeath`, `heal` and `lastGasp` roll with NO
skill context — grant their chance from passives / affixes / buffs
UNTAGGED; a socketed gem's grant never reaches them. `cast`, `miss` and
`foiled` carry the skill's context and take gems and tag-scoped grants like
any hit proc.

**Registry order is law for grammars.** The hot-streak trio
(`hot_streak` declared before `heating_up`) is how "two crits in a row"
reads: the first crit heats, the second streaks while the heat is still
worn at roll time, and that crit SPENDS the heat at the end of its own
resolution (a consumable buff), so the third starts afresh; a non-crit
while heated loses it (`heat_lost`, the `noCrit` gate).

### 5. Consumable buffs + the last gasp

`BuffEffect.consumeOn` generalizes `consumeOnUse` (which now reads as
`{ on: 'use' }`): each matching event — `use` / `hit` / `crit` / `kill` /
`hurt` / `block` / `evade`, tag-gated (ANY-match) and skill-gated — spends
one stack; the last stack ends the buff. The spend happens AFTER the event
resolved, so the buff's own mods always reach the blow that consumes it:
"your next two melee hits deal 50% more", "the next spell you cast is
free", "after being struck, your next attacks strike twice".

The last gasp (`damage.ts landLifeDamage`): a blow that would empty the
life pool leaves the bearer at `lastGaspLife` of maximum at `lastGasp`
chance, once per `lastGaspCooldown` seconds. Three ordinary stats (a
keystone guarantees it, an affix rolls a chance, anything can shorten the
clock); the gasp raises the `lastGasp` trigger so what answers it is data.
Only life-pool wounds through the two damage seams (hits, DoT ticks) can
gasp; costs, sacrifices and scripted falls never do.

## The catalogue — mechanism shapes → levers

| talent / enchant shape (examples) | lever |
|---|---|
| +X% stat, +X% damage with Y, cost/cooldown/duration/radius of Y | `mod` with tags (already) |
| per-skill "Improved X" | the skill-mode trees (`SkillDef.tree`), supports (skill-local); no skill-id scope on sheet mods by design |
| while on low/full life/mana/ES, while poised, while guarding | `when` (already) |
| Execute / Kill Shot / Merciless Combat (vs low-life) | `vs:lowLife` |
| Shatter / Frostbite / Winter's Chill (vs chilled/frozen) | `vs:chill`, `vs:frozen` |
| vs stunned/rooted/held; Sucker Punch | `vs:hardCC` |
| Backstab / Ambush / positional | `vs:behind`, `vs:unaware` |
| vs bleeding/poisoned/burning/cursed targets | `vs:<statusId>`, `vs:afflicted` |
| vs elites/bosses, vs summons, vs casting, vs fleeing | `vs:elite`, `vs:boss`, `vs:minion`, `vs:casting`, `vs:fleeing` |
| after a kill / crit / block / dodge / movement / heal (X for N s) | `when: 'recentlyKilled'` etc. |
| while not hit for N s (regen, stealth-like) | `when: 'notHurtRecently'` |
| per stack / per charge; at max stacks | `gaugeMod` (already) / `gaugeGateMod` |
| per 10% missing life (Warbringer-style), per missing mana | `gaugeMod` over `life:missing` / `mana:missing` |
| per nearby enemy / ally; per living pet | `foes:near`, `allies:near`, `minions` |
| chance on hit / crit / kill (extra hit, DoT, buff, summon, burst, charge) | proc `hit`/`kill` (already) |
| when you take damage: rage, thorns, absorb, retaliate | proc `hurt` (+ `crit` for "when critically hit") |
| Overpower / Revenge (after they dodge / block you) | proc `miss` / `foiled` |
| Clearcasting, Hot Streak, Bloodsurge, Lock and Load, Art of War | procs + consumable buffs (`consumeOn`) |
| Heating Up → Hot Streak (two crits in a row) | ordered procs + `requireBuff` + `noCrit` |
| when your pet dies / your pet crits | proc `minionDeath` / `minionCarry` (already) |
| when healed / when you overheal | proc `heal`; `overheal` stat (already) |
| every N seconds gain X | proc `pulse` |
| when you drop below X% life: shield/heal/speed (Second Wind, Last Stand) | proc `condition: 'lowLife'` |
| Cheat Death / Guardian Spirit / Cauterize / Ardent Defender | `lastGasp` stats + proc `lastGasp` |
| cooldown reset on crit/kill/proc (targeted) | proc effect `cooldown` with `skills`/`tags`/`reset` |
| absorb shield on event (Divine Aegis, PW:Shield procs) | proc effect `ward` |
| Every Man for Himself / break free of CC on event | proc effect `cleanse` |
| spell/attack empowerment consumed by the next cast | `consumeOn: { on: 'use' }` |
| damage taken from AoE / DoT / element | `damageTaken` with tags (already) |
| resource on crit (Master of Elements, Illumination) | proc `hit` + `crit` + `restore` (already) |
| auras / party buffs | aura skills + the sympathy fabric (already) |

## Authoring recipes

- **A passive that only bites the wounded:** `mod('damage','more',0.2,['vs:lowLife'])`.
- **A gem that wants a victim:** wear `requiresMechanisms: ['strikes']`
  beside the vs: mods (a never-hitting host has no victim).
- **A gear line that fires on being struck:** an UNTAGGED
  `proc_<hurtProc>` line (`fam({ stat: 'proc_reprisal', ... })`).
- **A movement-scoped cast proc on boots:** `stat: 'proc_adrenaline',
  tags: ['movement']` — the cast trigger carries the cast's tags.
- **"At five charges…":** `gaugeGateMod(stat, kind, value, 'charge:<id>', 5)`.
- **A new victim condition:** `registerVictimCondition(id, { label, test })`
  — the validator accepts it everywhere the moment it registers.
- **A new derived gauge:** `registerDerivedGauge(id, { label, sample })`
  — bounded integer, no stat reads.
- **A new recency kind:** a `RECENT_KINDS` entry, a `noteRecent` stamp at
  its seam, and (optionally) a `RECENT_CONDITIONS` row + union member.

## Dials

`RECENT_CFG` (window 4 s, per-kind overrides) · `GAUGE_CFG` (cadence
0.25 s, nearRadius 220, nearCap 10, minionCap 20) · the `lastGasp` /
`lastGaspLife` (0.3) / `lastGaspCooldown` (60 s) stat bases · every debut
number in `data/procs.ts`, `data/supports.ts`, `data/itemaffixes.ts` and
THE OPPORTUNIST'S ROW in `data/passives.ts`.

## Deliberately not built

- A skill-id scope on sheet modifiers ("+20% Fireball damage" from a
  ring). The per-skill lane is the skill-mode tree and the socket; a
  classless catalog of hundreds of arts would make item-borne per-skill
  lines noise. Tags + trees + gems cover the shape.
- Equipment conditions ("while wielding a shield / two-hander / dual"):
  the weapon and off-hand slots ship disabled (`EQUIP_SLOTS`); the
  condition family should arrive with them, as `wield:<category>`.
- Proximity victim conditions (`isolated` / `crowded`) — a per-hit spatial
  scan; `foes:near` on the attacker covers the common case for now.
