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

Require `0 <= rest < taut <= 1`, positive finite length and return speed.
The boot validator and binding API reject invalid mechanics. Attack reach is
independent: a melee attack extends past the head, and a projectile may travel
beyond the cord. The three debuts use melee skills to make their territory legible.

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

They join faction encounter tables with low weights and small pack sizes. New
visits can roll them naturally; already remembered zones keep their population.
All definitions live in `data/tetheredMonsters.ts`; no enemy IDs occur in the runtime.

## Verification

`npm run probe -- movementtether` exercises real movement, impulses at 20/60/120 Hz,
hard bounds, recoil, blocking terrain, moving/destroyed anchors, actual zone revisits
and durable reloads, co-op state removal, content reachability and each enemy's
ordinary combat pipeline. Also run `npm run check` and `npm run sim -- run --suite smoke`.
After a build, `npx electron balance/movement-tethers-ui.cjs` captures the three
variants in an isolated hidden client to `balance/reports/movement-tethers.png`.
