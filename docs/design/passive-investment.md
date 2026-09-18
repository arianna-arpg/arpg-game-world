# Native passive powers and small-node investment

The passive tree grants native character powers instead of supports that must
be bound to a skill. Players reach major payoffs through useful small passives,
with a physical fork between delivery and sustain investments.

This supersedes the reward tiers and opening menus in `passive-routes.md` and
`passive-crossroads.md`. Their earlier design and balance results remain history.

## Current tree

- All 115 direct tree graft grants were replaced or converted into training
  passives. All 54 school graft options became distinct native powers. The
  three Devotion Hunt aspects also gained native benefits instead of grafts.
- 315 new small nodes support 102 notable/mastery clusters: 100 in the main
  Star and two in the existing Devotion scaffolding.
- The main Star has 1,546 nodes: 1,045 small passives, 271 notables, 32 choice
  nodes, and 198 starts, attributes and keystones. Vocations are separate.
- The 163 repeated bridge rewards now provide thematic training. Existing
  pursuit, technique and school effects remain available as physical nodes.
- 27 opening menus became ordinary thematic passives. Nine optional school
  mastery menus remain, with 12 native options each, behind their own clusters.
- All main nodes remain connected. With optional menus either included or
  excluded, no adjacent pair of degree-two travel nodes remains: a fresh walk
  meets a fork or terminal within two allocations. Existing allocations can
  naturally consume branches; this is a topology rule, not an infinite promise
  of unspent alternatives.

Each investment cluster preserves the old travel connections at a small entry:

```text
                     delivery small
                   /                \
travel -- entry small                notable
                   \                /
                     sustain small
```

The two feeders also connect, preserving route flexibility. Menu clusters use
an additional small junction so removing optional menus from a route audit does
not leave a forced corridor. The capstone has exactly two neighbours, both
feeders: entering from any travel direction costs entry + feeder + payoff,
three points. Taking the other feeder is optional and useful independently.
Legacy notables outside this refinement retain their existing layout.

## Native mechanics

`src/data/passiveNotables.ts` holds 54 power templates, 18 event registrations
and 27 small-passive templates. The nine schools cover different investment
directions:

| School | Examples |
|---|---|
| Impact | Melee pulls, shield recovery on poise breaks, weight-derived damage, grabbed-target leech |
| Tempo | Repeated-skill Frenzy, varied-skill mana recovery, critical recovery with a damage tradeoff |
| Arcana | Critical-spell shield recovery, ailment cleansing on shield break, mobile channels |
| Host | Healing at fallen summons, summon-cast mana recovery, tougher but weaker summons |
| Guile | Ward on evade, mana from poisoning, extra chaos ailment stacks with a damage cost |
| Devices | Construct-cast Fury and healing, extra construct capacity with a damage cost |
| Bastion | Ward at a poise threshold, thorns after blocking, armor-derived regeneration |
| Chorus | Mana from Verse, delayed song healing, ally-scaled regeneration, Verse-derived shield |
| Entropy | Poise from chilled targets, movement cooldown recovery at low life, self-ailment armor |

These are ordinary modifier, gauge, stat-link and event payloads. There is no
node-id combat branch or separate allocation system. Event powers use the shared
95% trigger cap, internal cooldowns and recursion guard; descriptions state
their chance and cooldown. Duplicate grants of the same proc share its cap and
clock. Ordinary modifiers retain the engine's normal stacking rules.

Small investments use each school's vocabulary: melee/poise, speed/crit/mana,
spell/cast/shield, summon damage/life/cost, attack/accuracy/evasion, construct
damage/duration/cost, armor/guard/poise, healing/song/regen, and ailment
magnitude/chance/duration. They have immediate benefits, rather than empty
prerequisite flags. Their descriptions identify the notable they lead toward.

## Authoring and persistence

The final positions, connections and payloads are explicit rows in
`src/data/passives.ts`. The visual editor remains authoritative for subsequent
layout edits; saving preserves all 730 route, crossroads and investment rows.
Rows are type-checked individually through `nodes.push(...)`, avoiding a giant
inferred array union as the tree grows. The editor emits the same format.

`scripts/refine-passive-clusters.ts` records the one-shot transformation from
the previous tree. It refuses an already-refined tree and does not run at boot.
Historical support keys in that script and stable node ids are provenance,
not active support dependencies. Runtime graft machinery and Vocation grants
remain intact for their other callers.

Run compatibility advances from 2 to 3 because old allocations can bypass the
new investment structure and old choices no longer describe their nodes.
Existing characters/worlds reset under the central compatibility policy;
account progression remains at version 1. There is no special migration layer.

## Verification and balance

- `npm run check` checks game, launcher and simulation types.
- `npm run build` produces the playable client.
- `npm run probe -- passiveinvestment`: 401 checks covering absence of tree graft grants,
  supporting-node benefits, every capstone entrance, both feeder paths in the
  main Star, native event gates/effects/cooldowns/removal, real poison and charge
  events, geometry and compatibility.
- `npm run probe -- passivecrossroads`: 349 checks covering the remaining
  masteries, all 108 school options, search, uniqueness, save/co-op and cleanup.
- `npm run probe -- passiveroutes`: 168 checks including 115 ordinary two-point
  walks, every class opening, native payload coverage, prior event powers,
  healing/death/movement/conduits and save/co-op behavior.
- `npm run probe`: all 254 default green probes pass. Seven slow and three
  excluded probes are outside this default run.
- Hidden `balance/passive-routes-ui.cjs` checks actual clicks, a locked notable,
  the three-point investment, native mastery filtering and selection at
  1400x1000 and 1000x720. All 730 changed editor rows and links round-trip.
  `passive-crossroads-ui.cjs` runs the same consolidated harness.
- The 25-episode smoke suite completes without target-band flags or deaths.
  Level-five Magician output is 45.89 mean DPS with an 18.29% mean life floor;
  this improves the prior five-seed smoke outcome but is not broad balance
  certification. No reference build or target band was relaxed.

The main remaining tuning work is comparative build coverage, especially late
stacking and different combat pilots. Mechanical breadth does not establish
that all combinations are equally viable.
