# Tame Beast: sovereign companion or growing litter

The 15-node tree is authored in `src/data/tameBeastTree.ts`. Existing node ids
remain stable while display names and mechanics change. The two trunks remain
exclusive; either fork and its sibling leaves can be mixed within a trunk.
The ordinary held claim, costs, native full-strength flask/orb sharing and
Tracker release remain available without tree investment.

## Sovereign Bond

| Former name | Display name | Behavior |
| --- | --- | --- |
| Gentle Claim | Sovereign Bond | Ordinary beasts are certain at full life; rare/elite beasts are certain at 50%. Above the rare threshold, the native chance curve applies. |
| Focused Claim | Guardian Beast | 100% more beast threat; Defiant Roar taunts enemies within 220 units on an 18-second cooldown. |
| Frugal Claim | Bend the Apex | Allows boss beasts at 10% life or below. Bosses refuse above that threshold. |
| Returning Claim | Ancestral Art | Grants the current species' family special attack to its actual AI bar. |
| Gentle Pour | Abundant Bond | Adds 100% flask/orb sympathy potency; damaging attacks have a 15% life-orb chance, limited to one per two seconds. |
| Gentle Instinct | Shared Instinct | Shares native Fury, Rage and Frenzy in both directions. Damaging beast attacks have a 20% Frenzy chance, limited to one per second. |
| Gentle Return | Living Lifeline | 5% beast life leech; 50% of actual leech healing and other direct mending/restore effects return to the keeper. |

Abundant Bond adds to the existing 100% baseline, resulting in 200% flask/orb
potency before supports. This is an ordinary stat grant, not a synthesized
support socket. Alpha's Bond can add its potency again. Living Lifeline grants
1.25 potency to the native 40% reciprocal link, producing 50%; a real Reciprocal
Bond stacks with it. Leech emits only the portion actually healed, excluding
overheal and life-on-hit. Depth-limited sympathy prevents infinite return loops.
Shared Instinct uses the game's existing charges rather than adding new meters.

Successful captures dispatch encounter victory handlers before surrendering
the hostile identity, so boss, hunt and cull progress can complete. They do
not run death bursts, create corpses, or roll ordinary kill loot. Named event
handlers retain their own victory rewards. A companion falling later never
repeats that victory dispatch.

## Growing Litter

| Former name | Display name | Behavior |
| --- | --- | --- |
| Swift Claim | Growing Litter | Adds a second bond. Downed beasts revive at full life after 20 seconds while the keeper is alive and the skill is seated. |
| Swift Instinct | Hunting Partners | Beast damaging attacks prepare the owner; owner damaging attacks prepare every living beast. Each stack adds 10% increased attack damage, up to three stacks for eight seconds. A landed attack consumes all its preparation. |
| Swift Return | Pack Crescendo | Raises preparation cap to five. Consuming the full cap gives the other side 35% increased attack speed for five seconds. Beasts also gain Pursuit during that frenzy. |
| Swift Pour | Learned Blows | Each beast copies a completed ordinary owner melee attack once per six seconds, at 60% damage, from its own position. |
| Repeat Claim | Dread Pack | Each beast pulses four base chaos damage within 110 units every second. Consecutive exposure adds 25% per tick, capped at five stacks. Leaving that beast's radius resets exposure. |
| Light Claim | Third of the Litter | Adds one further bond, raising this trunk's cap to three before supports. |
| Steady Claim | Rallying Whistle | At capacity, the converted call revives, heals and recalls the whole litter, commands it toward the aim, and grants five seconds of physical pulses from each beast. |
| Practiced Claim | Practiced Keeping | Neutral, four ranks: each adds 15% increased companion life and damage. |

Capacity counts held bonds, including downed beasts. The first pet of a litter
therefore leaves Tame Beast available; only filling capacity converts the slot
to Whistle. Passive revival prevents a downed first pet from depending on an
unavailable Whistle. Revival countdowns survive saving without offline advance.
The native nearby-ally revival remains available as well.

Learned Blows snapshots the owner's invested skill and executes through the
normal damage pipeline using the beast's stats. It accepts ordinary attack
skills with melee/cone/nova delivery and supported hit payloads. It excludes
held casts, guards, resource spenders, combo chains and summons. Copies cannot
produce more copies or trigger Hunting Partners. Pulse damage likewise does
not feed the preparation loop. Preparation ids include keeper and host skill,
so one player's attacks or respec cannot consume another player's bond buffs.

## Families and durable companions

`src/data/beastFamilies.ts` explicitly assigns every beast species to one of
18 families. `src/data/companionSkills.ts` supplies free, cooldown-limited arts:

| Family | Art |
| --- | --- |
| Hounds | Hamstring: reeling and bleeding bite |
| Stalking Cats | Rending Pounce: leaping bleed |
| Horned Beasts | Goring Sweep: wide knockback |
| Great Beasts | Quaking Fist: area stun |
| Raptors | Blinding Stoop: blinding leap |
| Winged Beasts | Wingstorm: cone knockback and reeling |
| Weavers | Binding Silk: rooting projectile |
| Serpents | Venom Fang: poisoning bite |
| Amphibians | Mire Spit: cold splash and chill |
| Armored Crawlers | Shellbreaker: heavy vulnerable strike |
| Molluscs | Caustic Trailburst: poisoning area burst |
| Water Beasts | Tidal Snap: chilling cone |
| Stinging Swarms | Piercing Sting: piercing poison projectile |
| Small Mammals | Distracting Bite: befuddlement |
| Luminous Beasts | Wispflare: shocking burst |
| Spore Beasts | Dreadbloom: area madness |
| Clinging Beasts | Draining Bite: leeching strike |
| Longlimbs | Lashing Reach: long vulnerable strike |

New species must declare family membership; the coverage probe fails on
missing or duplicate assignments. The companion retains native attacks, gains
an ordinary claw if its peaceful wild kit lacked damage, and accepts combat
orders instead of retaining a wild hunger/flee script. Family arts and taunts
use the existing AI selection and cast pipeline. Removing their nodes removes
the granted skills and cancels their in-flight payloads.

`CompanionBonds` owns per-beast transient mechanics. Its stat source rebuilds
from owner/host minion modifiers, including existing skill-level scaling.
Rare captures retain their exact rarity sources, stacked rarity, name and
size through character saving, unlearning and relearning. Additional save
fields are optional, so existing companion saves remain readable.

Respec preserves the animals: bonds beyond reduced capacity become dormant,
downed and unrevivable until capacity returns. It clears owned preparations,
frenzy, pulses, fields and learned copies without deleting unrelated attacks.
Family skills and stats rebuild rather than being serialized as permanent
grants. Transient copy ownership is pruned once its payload finishes.

## Verification

`balance/probe_tamebeast.ts` covers certainty boundaries, boss eligibility,
two/three-pet conversion, revival and countdown persistence, zero-socket innate
sympathy, socket stacking, actual leech healing, cooperative hits, copied melee
damage, dread ramps/reset, command pulses, rare preservation, respec and owner
isolation. Every family is exercised through real companion AI. The existing
bond-tree probe continues to exercise all 72 opening-tree terminal routes.
The probe roster, type checks and simulation smoke are the regression gates.
