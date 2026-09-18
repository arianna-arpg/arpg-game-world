# Physical routes through the passive Star

Historical expansion record. The subsequent [native-power and investment
pass](passive-investment.md) replaces every tree graft, changes reward tiers
and inserts small-node clusters. Counts and test results below describe the
earlier pass; the current contract is in that linked document.

This pass interprets a choice as a fork in the walking graph. A player can
choose a direction by clicking a visible passive, without selecting an option
inside a popup. The optional selection deals from
[passive-crossroads.md](passive-crossroads.md) remain available.

## Shipped scope

- **379 new ordinary nodes:** 24 in each of nine starting neighborhoods (216),
  plus 163 connecting nodes through existing geography.
- The main Star grows from **858 to 1,237 nodes**. All previous nodes, grants,
  links and selection deals remain intact. Existing runs need no reset.
- Each start gains three immediate physical entrances. The three lanes connect
  sideways and outward, and their far ends rejoin existing paths.
- All **138 original crossroads effects** also appear as literal nodes.
  The 54 different support grafts retain their compatibility, costs and binding
  requirements. There are repeated placements so these effects can serve
  different travel routes; repeated placements are not new mechanics.
- **54 new effects:** 18 event powers and 36 complementary conditional,
  gauge-scaled or linked-stat investments. No class or node id enters combat
  execution. The total vocabulary added across both passes is 192 effects.

The first-point avenues are deliberately readable:

| Start | Three new entrances |
|---|---|
| Strength | Movement follow-ups, blocking counters, wounded prey |
| Prowess | Varied skills, repeated skills, damaging ailments |
| Intelligence | Distance, varied spells, repeated spells |
| Wisdom | Fight beside summons, healing, construct preparation |
| Finesse | Wounded prey, ailments, movement follow-ups |
| Dexterity | Constructs, control, distance |
| Fortitude | Blocking counters, missing-life risk, healing |
| Willpower | Ailments, missing-life risk, control |
| Charisma | Healing, varied skills, fighting beside summons |

These are positions, not class gates. Every class can travel to every school.

## The two-point contract

`passiveTopology.ts` builds an undirected graph of unique neighbors. It excludes
other realms and vocation trees, which have separate progression. The primary
audit also excludes selection nodes: an exclusive or spent deal cannot be the
only reason an ordinary route counts as a fork. A second audit includes deals.

Both graphs must be connected from one start (therefore from every start).
Neither may contain two adjacent degree-two nodes. Consequently, when leaving
a fork, another fork or a terminal reward lies within two allocated nodes.
This catches reverse travel, rings and side corridors as well as opening paths.
The ordinary graph contains **1,178 nodes and 640 forks**.

Terminal rewards are intentional. This is a structural travel guarantee, not
a promise that an already-explored loop always has two *unspent* exits. A player
can exhaust a neighborhood. Duplicate links and self-links cannot fake forks.
The boot layout validator warns if later edits violate the contract.

## New event powers

| School | New event interactions |
|---|---|
| Impact | Break enemy poise to prepare a spell hit; terrain collisions restore mana |
| Tempo | Evade to recover movement cooldowns; varied casts grant ward |
| Arcana | Full energy shield prepares a spell hit; low-mana spells restore poise |
| Host | Summon deaths recover summon cooldowns; summon casts grant ward |
| Guile | Back hits restore mana; movement prepares a critical projectile hit |
| Devices | Construct casts recover movement cooldowns; evading discounts the next construct |
| Bastion | Blocks recover movement cooldowns; re-arming broken poise grants ward |
| Chorus | Healing recovers movement cooldowns; blocks restore mana |
| Entropy | Hitting held enemies recovers movement cooldowns; broken shield restores poise |

Every event has an internal cooldown and the ordinary proc-depth restriction.
The shared proc system caps trigger chance at 95%; these new nodes disclose it.
Prepared bonuses expire and are spent only by the matching action. Repeated
placements grant the same registered proc, rather than multiplying executions.
Pool restorations need the destination pool; descriptions say so. Minion stat
bonuses state when new summons inherit them.

The other 36 effects connect these events to investment in guard strength,
healing, ward gain, missing resources, minion counts, skill sequences, movement,
critical hits, crowd size and constructs. Their values and conditions are data.

## Authoring and persistence

`passives.ts` remains the authority for node positions, names, modifiers, grants
and links. No layout generator runs in the game. The one-shot
`scripts/author-passive-routes.ts` produced explicit rows and refuses to run on
an already-expanded tree, protecting subsequent visual edits. Its neighborhood
templates are authoring defaults; edit shipped node grants in `passives.ts` or
the visual editor. `passiveRoutes.ts` registers the reusable event definitions
and contains the authoring templates for the 54 new effects. Event execution
values live in that registry; node chance grants remain editable on the tree.

`PassiveNode.conduit` extends the existing resource-conversion payload to ordinary
nodes. Recalculation collects it beside choice-option conduits; the editor
preserves it and content validation checks its endpoints and numbers. Character
saves and co-op carry the existing allocated node ids, then derive these pumps.
Grafts retain granting-node attribution and use the existing binding system.
Modifiers remain attributed to the shared `passives` sheet source.

Tree search and hover descriptions resolve ordinary grafts' live support text,
just as selection menus already did. New node discs are separated from one
another and from existing connection strokes; new connections avoid node discs.
Crossing connection strokes do not imply additional adjacency.

## Verification and balance limits

- `npm run check` and `npm run build`.
- `npm run probe -- passiveroutes`: 168 checks, 95 ordinary two-point walks,
  every class opening, all ordinary nodes allocated through the actual game
  gates, every new graft bound/unbound, all 18 event powers and their gates,
  cooldowns, preparation consumption, removal and depth limits. Includes real
  healing, summon death, movement, conduit flow, save and co-op checks.
- `npm run probe`: 253 standard probes passed; seven slow probes and three
  excluded probes are outside the default run.
- Hidden `balance/passive-routes-ui.cjs`: actual direct allocations at 1400×1000
  and 1000×720, initial entrance visibility, support discovery, and all 379 node
  payloads and adjacency lists round-tripped through the actual visual editor.
- `npm run sim -- run --suite smoke`: all 25 episodes executed. The level-five
  Magician reference build had one death in five episodes, a provisional band
  flag. Its automatic breadth-first picker now spends its fourth point on a
  new pursuit instead of Arcane Insight; reference selection and target bands
  were deliberately left unchanged.

`npx tsx balance/audit_passiveroutes.ts` compares legal four-point Magician paths
with the same level, skills, pilot and 30 seeds. The preserved original path
had 7 deaths; the repeated-skill path 13, distance 12, and varied-skill path 14.
Damage output was similar (43.83 / 44.95 / 45.65 / 44.98). These are small,
pilot-specific samples, not proof that all builds using an effect are weak.
They do show that early survival needs further tuning and that added choice
does not establish balanced choice. The old route remains fully available.
No baseline or target band was relaxed to hide the result.

This pass establishes working paths and composable mechanics. It does not claim
that every combination is viable, that late-game stacking is fully balanced,
or that the number of viable builds has been measured.
