# Passive crossroads

The subsequent [physical-route expansion](passive-routes.md) adds ordinary
paths and enforces forks within two allocations. This document describes the
optional selection deals, which are retained alongside those paths.

The opening of the Star now teaches a build direction with its first two
earned passive points. Classes still choose a starting position and opening
skills; none of these choices is class-locked. Existing point income and
permanent allocation rules are unchanged.

## What ships

- **36 nodes**, four beside each of the nine starting positions.
- **138 distinct options** in eleven registered choice pools: 12 pursuits,
  18 techniques, and nine schools with 12 options apiece.
- **54 skill grafts** among the school options. Each grants an existing level-one
  support to one compatible learned skill, explicitly bound through Skills.
  They use the existing compatibility, duplicate-support and inheritance rules;
  they consume no socket. The support's own restrictions and prices still apply.
- Conditional and victim-scoped modifiers, derived gauges, stat links, proc
  grammars, and worn resource conduits all use the shared engine. No node-id
  checks, class exceptions, additional save format, or parallel combat pipeline.

Every opening has this shape:

```text
Free class start ── Pursuit (point 1)
                     ├── Technique (point 2)
                     └── School Practice (point 2)
                              └── School Mastery (point 3)
                                       └── existing travel node
```

Taking both Technique and both school nodes costs four points. Practice and
Mastery share a school pool: each buys one DIFFERENT option. Neither completing
the school nor taking the technique is required to continue the original tree.
All nodes remain available to off-class travelers through normal adjacency.

Each start offers **216 legal pursuit/technique pairs** in two points
(12 × 18), or **144 pursuit/school pairs** (12 × 12). Taking a pursuit,
technique and two school options yields **14,256 distinct selection sets**
(12 × 18 × C(12,2)), before considering active skills, skill trees, supports,
equipment, or further travel. These are selection counts, not a claim that
every combination is equally effective or ready for every opening skill bar.

| Starting attribute | School | Existing route after Mastery |
|---|---|---|
| Strength | Impact: displacement, grappling, broken poise | Broad Back |
| Prowess | Tempo: critical rhythms, answering blows | Hunter's Lunge |
| Intelligence | Arcana: spell engines, resource weaving | Arcane Insight |
| Wisdom | The Host: companions, swarms, sacrifice | Grave Whisper |
| Finesse | Guile: evasion, selective targets | Softstep |
| Dexterity | Devices: projectiles, traps, prepared ground | Dexterity |
| Fortitude | Bastion: guards, retaliation, resource exchange | Increased Poise |
| Charisma | Chorus: restoration, songs, shared strength | Rallying Word |
| Willpower | Entropy: ailments, dangerous reserves, altered time | Willpower |

Examples of deliberate interactions:

- **Mend and Return + Mending Leaves a Mark**: actual healing both empowers
  the bearer and leaves a ward. Passive regeneration is not a heal event.
- **Dance Between Blows + Carry Momentum**: a completed movement skill opens
  a shared window for damage, casting and attack tempo. Ordinary walking does
  not trigger that window.
- **Feed Your Footing + Feed the Wall**: mana can replenish poise, which can
  replenish a raised guard. Both choices grant a small poise pool so a character
  without native poise can start investing. Each conduit independently respects
  its reserve floor, destination capacity and exchange rate.
- **Funeral Tempo + a summon graft**: investing in mortal summon turnover can
  feed Necrotic Feast while the graft changes a chosen summon skill.
- **Change the Rhythm / Perfect One Motion**: recent varied and repeated
  skill sequences support different rotations through the existing combo grammar.

## Authoring and persistence

`src/data/passiveCrossroads.ts` contains the pools and their numbers. Its small
`option`, `graft`, and `school` helpers return ordinary `PassiveChoiceOption`
and `PassiveChoiceGroup` data. The UI appends each graft's actual support name
and description from the support catalog, preventing a second mechanical
description from drifting. The pool module only needs stable support ids.

The node positions and links remain explicit rows in `src/data/passives.ts`,
editable in the existing visual editor. Both that file and the editor's output
template import the pool module. There is no procedural layout that overwrites
an editor change on the next boot. The editor round-trip check compiles and loads
its actual serialized output and checks all 36 nodes and their continuation edges.

Stable node and option ids are save keys. All eleven pools are character-unique:
reaching another copy allows a DIFFERENT option, never another copy of the same
benefit. The normal save and co-op sanitizer now reuses `choiceLockReason`,
retaining the first valid character-unique pick and discarding later duplicates.
Identical option ids in different groups remain independent. This fixes a
pre-existing gap where loading could bypass a rule enforced when spending points.
No save-compatibility reset is needed for these additive nodes.

The tree search includes the text inside choice pools. Choice popups have their
own search, an empty-result message, and a reminder that spending is permanent.
Search does not alter the allocation gate or point cost.

To add a school or mechanic:

1. Add options through the existing payload vocabulary. If a new mechanic truly
   needs an engine primitive, implement it on the shared modifier/proc/support
   surface so other content can use it too.
2. Add explicit choice nodes with stable ids and group references. Link them to
   the Star and validate their geometry. Class ids never belong in an allocation
   or combat special case.
3. Keep the character-unique pool large enough for every node that deals it.
   Include prerequisites in descriptions; a graft needs a compatible skill,
   and an efficiency modifier needs a conduit to improve.
4. Extend the opening probe with actual allocation and gameplay witnesses.

## Verification and balance limits

`npm run probe -- passivecrossroads` exercises all **1,944** universal opening
pairs across the nine starts, every shipped class's real initial allocation,
point limits, unique school picks, all 138 grants, all 54 graft admissions and
bindings, movement/heal/conduit behavior, save and co-op reconstruction, cleanup,
search text, geometry and continuation edges.

The automatic reference-build walker now skips choice nodes: it returns only
node ids and cannot make a deal. Before this fix it spent points on unchosen
nodes and could walk through them, silently weakening the smoke builds. Explicit
builds with `BuildSpec.choices` still exercise chosen options normally; the
opening probe checks actual option spending through the game API.
After that fix, all five smoke scenarios (25 seeded episodes) matched the
pre-expansion reference results, with no provisional target-band flags.

`npm run build`, then
`npx electron balance/passive-crossroads-ui.cjs` checks the actual menus at
1400×1000 and 1000×720, filtering, spending, nested tree search, empty results,
graft wording and the editor serialization round trip. It uses a hidden window,
disposable profiles and saves in `balance/reports`, and never edits user saves.

Also run `npm run check`, the full default `npm run probe` gate and
`npm run sim -- run --suite smoke`. The initial pass passed the 250-probe default
gate; seven slow probes and three excluded probes were outside that gate.

This is an opening-access and build-expression expansion, not an exhaustive
balance certification of every possible build. Shared proc strengths and graft
prices are inherited; their earlier availability is deliberate. Comparative
combat sweeps and player feedback should guide tuning of strong combinations.
