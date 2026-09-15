# Bond starting skill trees

The Tamer, Beguiler and Falconer now have complete native opening bars in
`src/data/bondStarterTrees.ts`. Each of the nine skills has the established
15-node binary anatomy: two mutually exclusive identities, two mixable forks
under each identity, two mixable leaves under each fork, and a four-rank neutral
investment. Raw skill levels 5, 10, 15 and 20 award one point each. A full
terminal path costs three points; its sibling leaf or the neutral node can take
the fourth. No mastery, alternate opening, selection or rekindling rules change.

| Class | Skill | First identity | Second identity | Neutral per rank |
| --- | --- | --- | --- | --- |
| Tamer | Goad | Barbed Challenge: full-damage bleed, resets, impales and inherited splinters | Goading Effigy: ground-placed taunting devices, thorns, wound fields, aftershocks and pursuers | 15% increased damage |
| Tamer | Tame Beast | Sovereign Bond: guaranteed ordinary claims and powerful individual beasts | Growing Litter: two companions, passive revival and cooperative attacks | 15% increased companion life and damage |
| Tamer | Stalk | Sheltered Stalk: mitigation and regeneration during the native hush | Hunter's Opening: next landed attack preparation alongside the hush | 12% increased cooldown recovery |
| Beguiler | Decoy | Patient Double: 70% more mirage duration, 20% less cooldown recovery | Sheltered Departure: temporary mitigation alongside the native dash and mirage | 12% increased cooldown recovery |
| Beguiler | Shadow Clone | Weighty Shadow: 60% more echo power, 25% less replay rate | Eager Shadow: 70% more replay rate, 20% less echo power | 15% increased mirage damage |
| Beguiler | Beguile | Certain Confusion: certain befuddlement attempts, 20% less hit damage | Spreading Rumor: pierce two extra enemies, 20% less hit damage | 12% increased effect duration |
| Falconer | Cast the Falcon | Paired Hunt: two birds, 25% less damage per bird, 18 total reserved mana | Watchful Hunt: one tougher, faster bird, 20% less damage | 15% increased falcon life |
| Falconer | Expose Weakness | Crippling Mark: add chill, 20% less hit damage | Hunter's Signal: temporary damage blessing for the caster's minions | 12% increased effect duration |
| Falconer | Cloudstep | Cloud Shelter: temporary mitigation after the native glide | Cloud Ambush: prepare the next projectile attack, preserving preparation through the glide | 12% increased cooldown recovery |

## Native contracts and working investment

Unallocated definitions retain their original effects, delivery, targeting,
costs, concentrations, conversions and thresholds. Neutral ranks add only their
listed scalar investment. The probe compares actual unallocated casts against
tree-less definitions and exercises native casts with all four neutral ranks.

Goad's overhaul lives in `src/data/goadTree.ts` and is documented in
[Goad](goad.md). Barbed stones retain native taunt and doubled threat while
adding resets, wounds and inherited projectiles. Goading Effigy replaces the
throw's direct hit with a destructible ground device, periodic taunts, thorns
and optional fields or burrowing pursuers. Field wounds end on aura exit;
ordinary bleeds remain independent.

Tame Beast's overhaul lives in `src/data/tameBeastTree.ts` and is documented
in [Tame Beast](tame-beast.md). Its ordinary held claim remains intact; invested
routes add boss capture, innate stacking sympathy, family arts, cooperative
combat and larger litters. Tamed bodies now receive their host skill's minion
life/damage investment through an independently rebuilt companion stat source.

Stalk preserves its native detectability, threat and movement modifiers.
Buff patches append shelter or prepare a separately named attack blessing.
Decoy and Cloudstep keep their native movement geometry and killable taunting
images. Their duration investment changes the image's actual lifespan.
Cloudstep still phases; its projectile-attack preparation survives the glide,
then strengthens and is consumed by the next matching landed attack.

Shadow Clone stays a killable mimic, including the native level-eight extra
shadow threshold and substitution movement. It does nothing while its owner
does nothing. The ordinary replay queue selects one ready clone for each
eligible owner use; each clone has its own readiness clock. The identities
change `mirageDamage` and `constructCastRate`, while duration and `minionLife`
reach the real clone body. They do not grant ordinary minion-damage nodes or
replace its kit with an autonomous summon.

Beguile applies madness and befuddlement; it does **not** charm or convert a
victim. Madness lashes at nearby bodies while retaining the victim's enemy
team. Native lash damage uses zone-level baseline damage and ignores
`statusMagnitude`; this batch does not promise to scale it. The Violent nodes
instead add Reeling, whose real effect stops Insight regeneration. Longer
madness windows and piercing suggestions reach existing duration/projectile
consumers. Befuddlement chance investment keeps resistance in the pipeline.

The falcon remains the native hunting bird with Talon Rake, latching,
vulnerability, a 9-mana reservation per body, toggle-off and five-second
respawn. Paired Hunt changes both count and maximum to two. Watchful Hunt keeps
one and invests survival/mobility. Life, damage, action speed, movement,
regeneration, mitigation and additive crew armor/accuracy reach the actual
bird. The probe runs live AI through approach, latch and vulnerability, then
checks death/respawn, toggle-off and respec cancellation.

Expose Weakness preserves its health-bar window: 18% size, 4% gap and 40%
bonus. Status magnitude does not widen the window. Hit-added chill also does
not consume magnitude in the current stat-application lane, so Heavy Mark
adds actual vulnerability instead. Hunter's Signal uses the existing
owner-scoped minion buff recipient path; it excludes enemy and foreign-owned
bodies. Its blessing duration and the native exposed duration both receive
duration investment.

## Persistence, cleanup and verification

Only node ids/ranks persist. Save rebuild and seat-network application
reconstruct modifiers, effects and support grafts through the normal recalc.
Graft payloads are never serialized as owned gems. Allocation order cannot
change composed buffs, modifiers, deliveries or the resolved claim terms.

Existing source-scoped cleanup retires invested projectiles, decoys, clones,
clone replay queues and falcon births on respec. Falcon reservations and
pending returns are released. Temporary tree blessings disappear from their
recipients without stripping another owner's source. Resetting a tame tree
removes tree-granted mechanics and preserves claimed bonds (excess slots become dormant);
unlearning and release retain their existing separate behavior. Applied enemy
statuses remain ordinary timed statuses.

One shared cleanup addition in `World.clearTreeConstructs` enumerates the
retiring body's captured projectile, field, fuse and repeat instances through
`capturedTreePayloads`. Mimic replays borrow the owner's attack instance, so
clearing only the clone's summoning instance left old airborne replay damage
alive after respec. Each captured instance now passes through `clearTreeFields`
with the clone as caster. Queued and airborne clone shots disappear immediately;
the owner's own shot and another owner's actors remain intact.

`balance/probe_bondstartertrees.ts` enrolls in the fast probe roster. It covers
all 72 terminal routes through real casts, raw milestone budgets, exclusion
and prerequisite locks, mixed forks and leaves, neutral transparency, save
and network rebuild, native claims/Whistle/downing, sympathy transfers,
madness betrayal, projectile piercing, actual preparation hits, minion
blessings, clone replay and body scaling, falcon AI and lifecycle cleanup.

Validation: `npm run check`, the focused bond probe, the established starting
tree probes, `probe_sympathy`, `probe_throng`, `probe_clingbalance`, simulation
smoke and the staged ownership gate. Parent integration owns the full
regression/build/hidden-UI sweep and central roadmap update.
