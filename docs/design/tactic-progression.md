# Enemy tactics and progression

Use familiar enemy families with progressively learned tactics. Add new enemy
types when the weapon, silhouette, tell or counterplay changes enough to need
a new identity. The existing bestiary already has skill grants, spawn presence
envelopes and doctrine boons; another large batch of near-duplicate enemies is
not needed to introduce difficulty bands.

## First progression ladder

The thresholds below read the **acting body's level**, not player level, account
progress, elapsed time or current area level. A veteran entering an early area
does not upgrade its residents. Summons use their own minted body level.

| Body level | New tactical depth |
|---|---|
| 1–5 | Familiar attacks and roles, recoveries and finite repositioning. The Grove Singer rallies actual allies and holds ground to support them. |
| 6 | Hex Weavers deliberately sequence Despair into Spark. Cutthroats react to committed casts with bounded flanks. Thorn Sprites begin predicting movement. |
| 8 | Matchlock Marksmen choose committed crossfire positions. Frost Witches answer long casts with planted volleys. Sprites evade telegraphs; Singers lead their ice. |
| 10 | Marksmen lead moving targets. Singers react to telegraphs. Sprites steer their existing level-10 supported bolts. |

These are initial authored thresholds, not a universal intelligence stat. A
zombie remains a zombie at level 30. Existing attack warnings, reloads, recovery,
travel deadlines, anti-circling stops and summoned-harasser restrictions stay
in force as tactics unlock. Later tiers never grant a blanket speed, reaction
or damage multiplier.

## Authoring

`AICondition.minLevel` is inclusive and composes with all other conditions.
It works through the existing rule, skill-reserve and phase-condition language:

```ts
rules: [{
  when: { minLevel: 8, targetCasting: 0.5, distOver: 140, sinceEngaged: 2 },
  every: [7, 10], hold: [1.4, 1.8],
  use: { move: { style: 'hold' } },
}]
```

An unconditional `minLevel` rule supplies sustained tuning. A situational rule
adds a bounded maneuver. Keep the novice's ordinary conduct in the base brain;
put only the earned additions in the rule. Later rules merge over earlier rules
with the existing per-axis behavior. Body tuning supplied by events still wins.
No new per-spawn rolls, saved progression counter or second AI resolver is needed.

Level conditions participate in the existing rule lifecycle: an already
triggered hold completes, and a fired `once` rule stays latched. They are not a
mid-action cancellation mechanism. Body levels ordinarily stay fixed between
mint and removal; use ordinary state conditions for temporary combat states.

## Numerical balance investigation

The broad reference sweep uses the real engine, the same pilots and ten shared
seeds across Warrior, Magician and Summoner at levels 1, 3, 5, 6, 8, 10 and 12:

```
npm run sim -- sweep progression --classes warrior,magician,summoner --levels 1,3,5,6,8,10,12 --geared --seeds 10
npx tsx balance/audit_tacticprogression.ts --seeds 10
```

The first command covers 780 episodes: dummy output and the standard physical
pack, bare and in the nine-slot reference wardrobe (level 1 is bare only).
The second adds two stale level-3 common pieces, mixed ranged/bandit/sylvan
groups, and paired runs with the new level gates disabled versus enabled.
Reports retain individual outcomes, warnings, distributions and incomplete
clears; survivor-only clear times cannot establish an encounter is fair.

The engine gives monsters +10% increased damage per level after the first,
and another skill rank at body levels 5, 9, 13, etc. Most skills default to
+8% increased damage per additional rank; custom leveling can differ. These
are additive increased modifiers in the same damage calculation, not two
universal multiplicative damage curves. Automatic player life grows by four
points per level, before attributes, passives, gear and other modifiers.

The level-5 transition therefore adds both the ordinary damage increment and
the first skill-rank increment. It is a plausible contributor to the reported
pressure, not proof that the global coefficient alone is wrong.

Measured before numerical tuning, deaths in the six-enemy physical parity pack:

| Magician equipment | Level 3 | Level 5 | Level 8 | Level 10 |
|---|---:|---:|---:|---:|
| Bare reference | 0/10 | 0/10 | 7/10 | 8/10 |
| Common level-3 chest and boots | 0/10 | 0/10 | 3/10 | 4/10 |
| Full reference wardrobe | 0/10 | 0/10 | 0/10 | 0/10 |

The bare Magician's average minimum life fell from 43.49% at level 3 to
21.23% at level 5. Partial equipment raises the level-5 floor to 39.69%.
The full wardrobe takes no damage in those Magician rows. These are synthetic
pilots, a physical pack and a fixed gear seed; nine filled slots must not be
assumed to describe a typical early character. Every measured row has zero
episode warnings. Smaller differences within the sample variation remain
diagnostic, not established balance improvements.

The mixed-group audit adds 480 episodes. At level 10, disabling the new gates
and enabling them produces the same behavior/outcomes: the full repertoire is
available in either case. At level 5, removing tactics does **not** monotonically
reduce damage: an enemy spending less time maneuvering may attack more. This
is why the ladder is an introduction of complexity, not a claim to have solved
the entire damage curve. The Marksman/two-Cutthroat group remains particularly
lethal to the partial-equipment pilots.

A separate 480-episode experiment added 0.35–0.55 seconds of completed-cast
recovery to Cutthroats and Sprites, with 30 seeds per configuration. Bandit
survival did not improve consistently (level-5 Warrior deaths 29/30 to 30/30;
Magician 28/30 in both cases). Ranged survival improved in some rows but remained
poor. That candidate was **not adopted** as a proven solution.

No global damage, life, gear, skill-rank or spawn curve is changed in this pass.
The next numerical pass should reproduce a concrete class/area/gear snapshot,
separate physical from elemental pressure, and examine the debut and overlap
of high-damage specialists. A blanket reduction based on unequipped pilots
would also reduce already-trivial fully equipped physical encounters.

## Expansion policy

Introduce one readable lesson at a time. Retain a novice version of each
family's core role; teach the full maneuver in a small encounter before mixing
it with other specialists. Design lateral difficulty around tradeoffs:

- Archers relocate to a firing position, then expose themselves while shooting.
- Shield allies cover a caster's preparation, creating a reason to flank or
  interrupt the protector instead of merely adding armor.
- Supporters choose rally, healing or retreat from the actual state of allies.
- Casters set up a curse or terrain effect, then commit to its follow-up.
- Pack animals alternate pressure and recovery, while replenishable summons
  remain approachable and cannot restart an escape loop indefinitely.

Use a distinct entity variant for a materially different weapon, formation
role or visible mechanic. Use existing presence envelopes to debut that variant
in an appropriate area. A boss or elite should gain a recognizable mechanic
with a tell and a recovery, not inherit every ordinary tactic simultaneously.

## Verification

`balance/probe_tacticprogression.ts` exercises live movement dispatch immediately
below and at every new boundary. Veterans and novices share the same brain
definition; a level-100 player and area cannot leak veteran tuning into the
novice. It also checks targetless conditions and wild/summoned composition.
The existing tactical probe now exercises earned maneuvers at their debut
levels. Pursuit and harassment checks continue covering the earliest bodies.

The objective fail-arm fixture now resolves its standing package against bare
ground before loading, matching the existing death-arm fixture. A random
Barrow Watch lair correctly took precedence after the AI decision stream
changed, so that rig was testing a lair rather than its intended fracture.
The resolver, live loading, trigger, failure and survival assertions remain;
the separate resident-precedence rig remains unchanged.
