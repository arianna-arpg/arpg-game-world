# Unique Relic pool

The first expansion brings the droppable pool from six to eighteen identities.
Relics offer account-wide ways to build; higher item levels discover mechanics
without increasing their numeric tier. The original six keep their numeric
budgets. All eighteen default to one equipped copy per identity.

## First expansion

Values below are baseline values before Vault empowerment and board placement.
Counts and proc chances are structural; investment grows only explicitly opted-in
positive numeric bonuses. These are initial content budgets, not a claim of
measured endgame parity between every build.

| Relic | Find level | Shape | Signature and intended play style |
| --- | --- | --- | --- |
| The Last Drop | 6 | Charm, 1×1 | Bank one additional paid Flask pour at full resources, released on Life damage; preparation and resource timing |
| The Wayfarer's Knot | 8 | Charm, 1×1 | 70–85% chance after a Movement skill to gain 2% of maximum Life as Ward, once per 6 seconds; mobile builds |
| The Cracked Censer | 10 | Idol, 1×2 | 70–85% chance on Block to restore 6% of maximum Poise, once per 5 seconds; guard endurance |
| The Wellspring Seal | 10 | Talisman, 2×1 | 5–8% of excess healing from healing skills and Life restoration streams becomes a temporary absorb shield; healing and support |
| The Thorn Testament | 12 | Talisman, 2×1 | Add 10–15% of flat Thorns to Melee hits as Physical damage, plus 2–3 Thorns; retaliation feeding attacks |
| The Widow's Wick | 12 | Charm, 1×1 | 70–85% chance on owned minion death to restore 2% maximum Mana, shared 3-second cooldown; expendable summons |
| The Needle Eye | 12 | Talisman, 2×1 | Projectiles pierce one extra target while not hit recently; careful ranged play |
| The Pilgrim Spindle | 14 | Talisman, 2×1 | Add 8–12 percentage points of normal movement speed while Channeling; mobile channels |
| The Venom Ledger | 14 | Charm, 1×1 | One additional Chaos ailment stack, with 2–3% increased Chaos ailment magnitude; sustained ailments |
| The Architect's Keystone | 16 | Effigy, 2×2 | Permanently rolls Totem, Trap or Mine: +1 active capacity for that construction; placement builds |
| The Idol of Many Names | 18 | Idol, 1×2 | Permanently rolls a summon family: +1 capacity for matching skills; varied summon rosters |
| The Hollow Choir | 24 | Effigy, 2×2 | +1 Duration Aura slot, with 2.4–4% increased Aura duration; temporary auras such as Fleeting Devotion |

Each proc also carries 4–6% increased power for its own effect at baseline.
Its initial restoration/ward amount is therefore slightly above the trigger's
listed base amount. Shared cooldowns prevent simultaneous deaths or rapid casts
from multiplying a proc's frequency. Ordinary engine limits still apply, including
the overmend shield's six-second duration and 50% maximum-Life ceiling.

Debut level gates finding an item, not equipping it on a later level-1 character.
The board must still fit its footprint. Existing earlier uniques remain in the
pool; weighted selection at level 80 gives relics 483 of 3,393 total unique
weight in this catalog snapshot (about 14.2%), not a 14.2% chance per gear drop.

## Family choices and summon contracts

`data/uniques/relicPaths.ts` derives the Idol's choices from
`data/minionFamilies.ts`: Swarm, Golem, Rubblekin, Earthborn, Skeleton and
Skeletal Mage. Membership and overlaps come from that registry, not a second
list of skill ids. A mixed summon pool receives a family tag only when every
possible body belongs to it. Mutated skills use their current summon bodies.

The existing `uniqueChoices` save stores the family and its rolls once. Neither
re-equipping nor beginning a new life rerolls it. The extra slot never grants
a skill, bypasses summon costs, changes type exclusivity or multiplies through
Vault/board empowerment. Reserved summons pay for extra slots and fill them
through their normal summon/reformation timing. Throng skills use the same
family-scoped capacity stat. Summon count per cast remains its own mechanic.

## Equipped identity limits

`UniqueDef.maxPerContainer` is an optional reusable limit. The Relic catalog
defaults it from `RELIQUARY_CFG.uniqueEquipLimit` (1); an individual definition
can override it. Omission on other unique types, or an explicit `Infinity`,
means unlimited. Finite values are floored and clamped to zero.

`engine/itemLimits.ts` checks stable `uniqueId`, independent of instance names,
quality and choice rolls. Two different Idol families, or two Sunderstone
elements, still share their unique identity's limit. Inventory and Oracle
first-fit actions, exact placements and drag previews use the same check.
Moving the seated copy is legal. A replacement excludes the departing item;
swapping two items already on the board does not exclude either from the count.
The tooltip shows the configured equipped-copy limit. Storage has no identity
limit; its ordinary capacity rules still apply.

`containerMisfits` also enforces limits for stat folds and save adoption. Older
boards keep their first valid copy and return surplus account Relics to Oracle
storage (or its existing recovery queue if full). Item identities, quality,
choices and locks survive. No save reset, deletion or reroll is required.

## Extending and checking the pool

Add data using shared modifier scopes, choice groups, procs and effect schemas.
Do not add item-id combat branches. Add eligible numeric stats deliberately to
`RELIC_SCALABLE`; leave capacities, proc chances, grants and tradeoffs structural.
New procs register through the ordinary catalog and attribute their power via
`procPower_<id>`. Keep a defining mechanic that ordinary relic affixes cannot roll.

Later passes should consider warcries, ammo/javelin preparation, possession/forms,
corpse handling and additional summon families. This pass broadens coverage;
it does not claim every play style is represented yet.

`probe_relicuniques.ts` invokes `relicExpansionChecks.ts`: all identities and
debut gates, persistent choices, structural scaling, every family against the
summon/throng catalog, paid golem lifecycle, proc cooldown/removal, prepared
flasks, overmend, Thorns damage, real channel movement, Chaos scope and aura
replacement. It also checks first-fit/exact duplicate refusals, identity across
different rolls, replacement, overrides, repair, account/character save and wire.
Run the account/reliquary probes, legends, smoke suite, type checks, and the hidden
Oracle UI harness after a build for surrounding integration.
