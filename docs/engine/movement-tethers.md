# Physical movement tethers

`MonsterDef.movementTether` is a movement restraint, independent of the AI's
walk-home leash (`TargetSpec.leash`) and damaging pack links (`MonsterDef.tether`).
The actor remains an ordinary combatant: health, targeting, skills, damage credit,
loot and faction allegiance all use their existing systems. The cord deals no damage.

## Authoring

The shared spec lives in `engine/movementTether.ts`. Add it to any monster or use
`bindMovementTether(actor, spec, pointOrActor)` for an encounter, trap or summon.
Omitting the anchor binds to the actor's current position. Innate monster bindings
initialize after placement, never at `createMonster`'s temporary position.

| Field | Meaning | Default |
| --- | --- | --- |
| `length` | Maximum centre-to-anchor distance in world units | Required |
| `taut` | Fraction of length that starts recoil | 0.98 |
| `rest` | Fraction reached before another outward approach | 0.3 |
| `returnSpeed` | Mechanical recoil speed, world units/second | 220 |
| `onAnchorLost` | Entity dies, disappears or leaves the story: `hold` its last point or `release` | `hold` |
| `style` | `vine`, `chain`, or `spirit` drawing | Plain cord |
| `color`, `width`, `anchorSize` | Cord and ground-marker appearance | Shared config |
| `anchorDoodad` | Registered `DOODAD_VISUALS` key; uses the actual scenery painter and bake cache | Style's simple marker |
| `opacity` | Cord alpha, 0–1 | 1 |
| `glow` | Halo `{width, opacity, pulse?}`; pulse is radians/second, 0 holds still | None |

Require `0 <= rest < taut <= 1`, positive finite length and return speed.
The boot validator and binding API reject invalid mechanics. Attack reach is
independent: a melee attack extends past the head, and a projectile may travel
beyond the cord. Ranged rooted plants deliberately threaten beyond their stem's reach.

The Shade uses `tombstone`, the very same arched grave painter used in world
scenery. Its spirit cord is continuous, translucent and softly glowing (layered
strokes, no per-frame canvas blur). Snapper and rooted Rootwild plants use the
existing `vine_coil` jungle doodad painter and sway cache. Anchor art is paint-only:
it does not add a collider beneath the creature or a separately targetable object.
Changing a scenery definition changes every tether referencing it too.

## Runtime rules

The ordinary displacement clamp projects requested destinations onto the cord's
disc before terrain collision. Terrain sliding may not move the body outside it:
that step keeps the last legal point instead. The late world sweep catches direct
position writes, separation, carries and other movers. Recoil temporarily stops
new AI decisions and voluntary movement, without healing, clearing threat or
transferring ownership. It follows the body's timeflow and remains mechanical
under stun. A blocked reel returns combat control instead of permanently silencing
the monster. A terrain-obstructed moving anchor that leaves no reachable point
within its disc breaks its cord, rather than pulling a body through a wall.

Bindings stay on their original story. Entity bindings track their live anchor;
self-anchoring is refused. A released binding stays released until explicitly
rebound. Automatic minion recall yields to a live binding.
Engine-owned party landings re-root native cords at arrival and release temporary
encounter bindings; old zone coordinates cannot drag companions across the new map.

Zone memory and durable world saves preserve the original point, settings and
recoil/release state independently of the body's current position. Entity IDs are
visit-local: saving an entity binding applies its lost-anchor policy on restore
(freeze the last point or release). Encounters requiring durable entity links must
rebind after reconstructing their entities. This first content batch uses point
anchors; its rendered roots, grave markers and stakes are cosmetic, not destructible
objects. The entity-binding API is covered separately by the regression probe.

Co-op ships the host's binding state and clears it when released. Rendering uses
those exact endpoints through the actor's visibility gates. Cord sag tightens at
maximum reach and the cord brightens during recoil.

## First inhabitants

| Enemy | Faction / debut level | Reach / recoil / rest | Combat |
| --- | --- | --- | --- |
| Rootlash Snapper | Sylvan / 4 | 190 / 265 / 22% | Fast plant head; ordinary Claw; burns readily |
| Gravebound Shade | Undead / 6 | 270 / 135 / 45% | Wider Shadow Slash; long reach and slower return |
| Stakebound Hound | Demon / 8 | 235 / 320 / 18% | Fast approach, Cinder Bite, sharp chain recoil |

Snapper and Shade join faction encounter tables with low weights and small pack
sizes. Hounds now appear with their keeper in the Ashen Kennels rather than in
unaccompanied faction packs. New visits can roll these encounters; already
remembered zones keep their population. Definitions live in
`data/tetheredMonsters.ts`; no enemy IDs occur in the movement runtime.

## Rootwild and kennels

Five Rootwild species use the same restraint:

| Species | Reach | Role |
| --- | --- | --- |
| Coilmaw | 200 | Fast lunging jaw; short, sharp recoil |
| Dragbloom | 310 | Long-stemmed pulling bloom with a close bite |
| Sporependulum | 250 | Ranged pitcher; ground warnings extend beyond its stem |
| Hookvine | 290 | Existing hooking predator now rooted |
| Hingejaw | 165 | Existing ambusher now guards a small feeding patch |

The three new bodies have composable plant looks, ordinary paid skills, level
presence envelopes and small pack sizes. They inhabit jungle and rootway tables,
Rootwild faction packs and the Seedbed Hollow. Coilmaw also joins feeding patches.

`data/tetheredHabitats.ts` registers the Ashen Kennels using the existing authored
map, lair and sidezone systems. Level-8+ steppes and volcanic surfaces can roll its
entrance. Every fresh kennel has exactly one Ashen Houndmaster and three hounds
at fixed posts, plus the usual pocket spoils. The keeper uses Hellfire Lash and
Rallying Howl; hounds within 520 units gain +20% increased damage and +15%
increased attack speed through `MonsterDef.bond`. Killing the keeper or leaving
his range removes that bond; a previously cast rally expires normally. This is
proximity leadership, not a new command/target-selection subsystem. Hounds remain
physically attached to their posts even after their keeper falls.

Exact spawn seats and existing zone memory keep the group coherent without
recreating hounds on entry. Saved pockets re-mint from their entrance kind/seed;
their remembered deaths, head positions and tether points are then restored.

## Verification

`npm run probe -- movementtether` exercises real movement, impulses at 20/60/120 Hz,
hard bounds, recoil, blocking terrain, moving/destroyed anchors, actual zone revisits
and durable reloads, co-op state removal, content reachability and each enemy's
ordinary combat pipeline. Also run `npm run check` and `npm run sim -- run --suite smoke`.
`npm run probe -- tetherecology` checks shared-art references, the actual kennel
entrance/load, bonds and their removal, live AI reach, revisit and durable reload.
`npm run probe -- rootwild` covers all plant casts and habitat playability.
Run `npm run genqa` for the habitat/map changes.
After a build, `npx electron balance/movement-tethers-ui.cjs` captures six tether
variants and the kennel in an isolated hidden client to
`balance/reports/movement-tethers.png` and `balance/reports/ashen-kennels.png`.
