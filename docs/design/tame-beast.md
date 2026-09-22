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
The native nearby-ally revival remains available as well. Both revivals are
visible (2026-09-16): a downed beast wears the dwell tell, a base ring while
the keeper stands in reach that fills as the idle tending builds beside a
`Linger to revive` line, and a litter beast also wears an outer ring counting
its passive revival down. See THE REVIVE RINGS in `docs/engine/vendors.md`.

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
missing or duplicate assignments. New families (for example bears or a distinct
boar family) should receive their own authored art rather than relying on the
safety net. At runtime, `beastFamilyOf` always returns a family: an unlisted
species receives **Worrying Strike**, a modest physical hit with a two-second
Winded slow and a 12-second cooldown. Ancestral Art therefore never grants an
empty family slot even if content coverage is missed.

The companion retains native attacks, gains
an ordinary claw if its peaceful wild kit lacked damage, and accepts combat
orders instead of retaining a wild hunger/flee script. Family arts and taunts
use the existing AI selection and cast pipeline. Removing their nodes removes
the granted skills and cancels their in-flight payloads.

`CompanionBonds` owns per-beast transient mechanics. Its stat source rebuilds
from owner/host minion modifiers, including existing skill-level scaling.
Rare captures retain their exact rarity sources, stacked rarity, name and
size through character saving, unlearning and relearning. Additional save
fields are optional, so existing companion saves remain readable.

### Shared minion inheritance (2026-09-18)

`engine/minionInheritance.ts` is the shared owner-investment resolver for
summons, throng bodies and companion bonds. A companion is an owned minion;
its bond now inherits the same life, damage, damage taken, movement/attack/cast
speed, detection, flat/percentage regeneration, regeneration rate, threat,
area avoidance, size, defensive guard and on-hit status investment. Minion
plies and life-to-ply trades/echoes use the same discrete armor fold. Skill-local
damage bonuses and penalties also reach the beast's own attack/spell context.

Queries retain the host's tags and the recipient body's family/species context.
Tame Beast has `minion` and `companion` tags, not `summon`: summon-only bonuses
remain scoped to summons. Attribute bequests use this same context, including
host-local grants. Personal regeneration is not inherited unless explicitly
shared through the relevant minion stat or bequest.

The bond refreshes investment live. Its `companionBond` source owns inherited
stats and tree beast modifiers; `minionCombat` owns survival/threat modifiers,
and `bequest` owns explicit attribute shares. No duplicate mint-time `owner`
source survives claiming. Refreshes preserve life fraction, retain spent armor,
and derive size from claimed size rather than multiplying the last result.
Saves retain the claimed rarity size before keeper scaling, avoiding enlargement
on every reload. Dormancy removes these grants; returning capacity restores
them without reviving the beast. Downed beasts never regenerate themselves up.

No baseline durability was changed in this pass. The level-one hound still has
45 life and 0.6 life regeneration per second. A level-one Vital Bond now adds
its advertised 3 life plus 0.8% maximum life per second: 3.96/s total for that
hound. Regeneration-rate investment scales both its native and inherited lanes.

Respec preserves the animals: bonds beyond reduced capacity become dormant,
downed and unrevivable until capacity returns. It clears owned preparations,
frenzy, pulses, fields and learned copies without deleting unrelated attacks.
Family skills and stats rebuild rather than being serialized as permanent
grants. Transient copy ownership is pruned once its payload finishes.

## Starting hound

Fresh Tamers begin with one ordinary level-one Shepherd's Hound, bound to
Tame Beast. It counts toward companion capacity, exposes Whistle while that
capacity is full, uses normal combat AI, and follows the same downing,
revival, release and saving rules as a captured beast. Fresh co-op Tamers
receive their own hound. Resume shells do not grant gifts, and loading a
saved character replaces its roster rather than duplicating the hound or
replacing an intentionally empty roster. Class definitions author these
fresh-character gifts through `startingCompanions`.

## The growing bond (2026-09-16)

A bonded body's level follows its keeper. `COMPANION_CFG.level` in
`src/engine/companionSpec.ts` is the dial: `follow: 'keeper'` (the default)
reads a bond's level as the greater of the level it was claimed at and the
keeper's level plus `offset`; `follow: 'claimed'` is the previous reading,
where a body stayed the level it was claimed at forever. The level-one
Shepherd's Hound is therefore a level-twelve hound beside a level-twelve
Tamer, while a beast claimed above its keeper keeps its wild level until the
keeper catches up.

`CompanionBonds.refreshBeast` compares each refresh and re-levels through
`World.relevelActor`, which re-stamps the same three sources `createMonster`
minted (`stampMonsterLevel`: the baseline growth source of 22% life, 10%
damage and 6% accuracy/evasion per level, the def's opt-in per-stat scaling,
hit-counted plies, and the boss poise pool). Life and plies are kept as
fractions, so growing never heals or wounds. The native kit climbs the monster
ladder (one skill level per four body levels); granted family arts, Defiant
Roar and Pursuit re-mint at body level. Saves store the current level; because
the fold is a maximum, a restored bond reads the same level it left with.

Claiming now removes the mint-time `owner` stat source: a body minted with an
owner (the starting hound, a restored bond) previously carried the keeper's
untagged minion life/damage twice beside the bond's own `companionBond`
source, while a wild claim carried it once. The bond's fold is the only fold,
so a loaded companion and a fresh claim have the same life.

## Stances (2026-09-16)

`src/data/companionStances.ts` defines the pack's conduct between orders as
data rows (`id`, `label`, `glyph`, `color`, cycle `order`, `conduct`,
`lunges`). Three ship:

| Stance | Conduct |
| --- | --- |
| Aggressive | The beast hunts on its own: nearest foe in sight, heel when none. This is the pre-stance behavior. |
| Defensive | The beast heels and answers only the keeper's fights: whatever wounded the keeper, whatever the keeper wounded, or whatever bit the beast itself, nearest first, within a 520-unit leash of the keeper, read inside a four-second engage window. A quarry is held until it dies or leaves the leash. The default (`COMPANION_STANCE_CFG.default`, her ruling 2026-09-16). |
| Passive | The beast heels and never strikes of its own accord. |

`src/engine/companionStances.ts` registers each stance as a command kind
(`stance:<id>`) whose conduct handler comes from the open `STANCE_CONDUCTS`
registry. The bond stamps the keeper's choice onto each beast as
`Actor.standingOrder`, the order beneath every issued one: `updateAI` reads it
through the same kind registry as `aiCommand`, but only while no issued order
stands. An Assault, a Recall, a Rallying Whistle charge or a Pack Crescendo
lunge outranks the stance for its moment, and the stance resumes the instant
the order lapses. `lunges` decides whether bond-driven charges (the crescendo,
the rally's charge toward the aim) fire under a stance; explicit keeper orders
always do. Passive beasts still take the rally's revival, healing and pulses.

The defensive answer reads two ledgers. The existing victim-side
`aiHitById`/`aiHitAt` says who last wounded the keeper (or the beast); the new
caster-side `lastFoeId`/`lastFoeAt`, stamped in `resolveHit` on every landed
hostile blow, says whom the keeper last wounded. Friendly-fire seams never
stamp the foe ledger.

The keeper's choice lives per bond skill on `PlayerMeta.stances`, saved as
`CharacterSave.stances`, shipped as `SeatMetaW.st`, and sanitized against the
registry on every load (an unknown id drops to the default). The shift has
three doors, all landing on `World.cycleCompanionStance`:

- Tame Beast's meta is now `companion_stance`, an honest instant cast scoped by
  `hostSkillId`, so cast procs and the meta chain both see it. Whistle and
  Rallying Whistle remain the converted base press. A meta press spends its
  slot for the button's whole hold (the spent-press law in
  `docs/engine/input.md`), so shifting the stance on a full bond never drinks
  the Whistle on the frame after the shift; a slot that is feeding a running
  held cast (a guard firing its own meta with the modifier alone) is exempt.
- The meta mini-button is clickable: the renderer publishes `hudMetaRects`
  and a plain click there is that slot's meta press (every meta, not only the
  shift). The button wears the current stance in its ink through the
  `registerMetaFace` registry.
- The rebindable `companionStance` action (keyboard `x`, pad unbound) cycles
  every bond on the bar through the host-authoritative `companionStance`
  intent, which also accepts a named stance.

The Command gem now fits companion skills (`requiresTags: ['summon',
'companion']`), so socketing it chains an Assault one beat after the shift:
the pack charges the mark, then keeps the stance it was set to. The support
matrix slice for the gem stays clean. `CompanionBondSpec.stanceArt` is the
tree's hook on a behavioral change: every living beast of the bond casts the
named art at its feet when the stance shifts. No shipped node uses it yet.

## Recovery and Whistle protection (2026-09-21)

Every companion revival and both Whistle variants call `World.recoverCompanion`.
Recovery consumes all harmful statuses and their stat sources without triggering
expiry ruptures; blessings remain. Whistle gives living beasts the same cleanse
and protection as downed ones, alongside its existing full heal and recall.
Queued harmful expiry payloads from a lethal frame are discarded on recovery.

`COMPANION_CFG.recovery` configures cleansing, the protection status and the
duration budget. By default, three seconds are divided by the keeper's active
bonded **body count**: one beast gets 3s, two get 1.5s each, three get 1s each.
Count includes downed beasts and all bond skills belonging to that keeper,
excludes dead/dormant beasts, and ignores bond-group consolidation. Individual
revivals use the same divisor. Duration is sampled at recovery; repeated calls
replace the window rather than adding time or retaining a longer old window.
Generic effect-duration investment does not multiply this budget.

The beneficial `companion_recovery` status supplies reusable `damageImmunity`
and `debuffImmunity` stats. Damage immunity joins the existing invulnerability
read without overwriting intrinsic invulnerability, and protects hit, DoT,
direct typed-hazard and life-damage paths. Debuff immunity refuses harmful
status applications while allowing blessings. The ordinary status clock removes
both grants at expiry; deliberate life costs and scripted kills remain separate.
This temporary state uses ordinary status lifetime/persistence rules.

Its mint glow and bright rim are authored through `StatusDef.bodyFx` and follow
actual status presence, including on co-op clients. Whistle descriptions explain
the shared duration; no new combat captions or text countdowns are introduced.

`balance/probe_companionrecovery.ts` verifies cleanse/source cleanup, actual hit,
DoT and area immunity, debuff refusal, expiry, living/downed Whistle parity,
nonstacking pack budgets, owner isolation, dormant bodies, automatic and nearby
revivals, Rallying Whistle, intrinsic immunity and co-op status presentation.

The hidden `balance/companion-recovery-ui.cjs` harness verifies and captures the
protected/expired states in the real renderer after a production build.

## Verification

`balance/probe_companioninheritance.ts` exercises actual healing, summon/bond
stat parity, scope filters, owner isolation, socket damage penalties, attribute
bequests, life-to-armor trades, repeated refreshes, growth, rarity persistence,
downing/revival, dormancy and release cleanup through the real engine.

`balance/probe_companionstance.ts` covers keeper-level growth, the life
fraction, the wild-level floor, the `follow: 'claimed'` reading, kit and art
re-leveling, load parity without the owner source, every stance's conduct
under live AI, the leash and engage window, the sticky quarry, the friendly
fire exemption, the meta press and face, the action intent, save and wire
round trips, explicit orders outranking a passive beast and the stance
resuming, the Command gem chain, `lunges`, the stance-art hook through a
probe-local tree copy, dormant, released and respec cleanup, and the meta
press law through the real input artery: a shift on a full bond never fires
the converted Whistle on the following frames, a release and a plain hold
still whistle, and Shield Up stays raised through its own Phalanx meta press.
The Tame Beast and Goad rigs that exercise a beast hunting on its own pin the
aggressive conduct explicitly, since the default is defensive.

`balance/probe_tamebeast.ts` covers certainty boundaries, boss eligibility,
two/three-pet conversion, revival and countdown persistence, zero-socket innate
sympathy, socket stacking, actual leech healing, cooperative hits, copied melee
damage, dread ramps/reset, command pulses, rare preservation, respec and owner
isolation. Every family is exercised through real companion AI. The existing
bond-tree probe continues to exercise all 72 opening-tree terminal routes.
The probe roster, type checks and simulation smoke are the regression gates.
`balance/probe_goad.ts` additionally verifies fallback-art AI, fresh solo and
co-op gifts, Whistle, downing, saving and empty-roster loading.
