# Firebolt disciplines

Firebolt keeps its ordinary damage, cost and delivery without allocations.
The fifteen saved node IDs and graph connections are unchanged; the visible
names and mechanics now describe the satellite and ignition branches.
`src/data/fireboltTree.ts` owns tuning. `ProjectileArtsSpec` composes independent
contracts in a deterministic order, and `ProjectileArts` owns live cast state.
No skill or node ID selects an engine behavior.

## Satellite branch

| Saved node | Display name | Initial tuning |
| --- | --- | --- |
| ember_satellites | Ember Satellites | Two orbs, 6 seconds, 0.65 radians/second, 64 units beyond the body, unlimited pierce, 0.65-second per-victim contact clock; 20% less damage |
| dense_constellation | Dense Constellation | One additional orb per equipped satellite-granting item |
| passing_embers | Kindled Attendants | Satellite count/radius/speed investment; each orb emits a 28%-damage, 4.5-radius Firebolt every 1.1 seconds at a visible enemy within 280 units |
| broad_embers | Gathering Inferno | Orbit speed compounds by 18% per second; expiry explodes at 65% damage in 72 radius |
| searing_orbit | Searing Orbit | Independent staggered novas every 1.6 seconds, 35% damage, 70 radius |
| clinging_cinders | Parting Cinders | Expiry launches an ordinary Firebolt radially away from the caster |
| wildfire_sparks | Wildfire Sparks | Target-seeking erratic movement within 110 units of the moving orbital home |

Dense Constellation counts worn equipment and active container/relic pieces
after their own modifier fold, once per piece. More than one satellite family
or quantity on one item still counts once. Generic additional-satellite count
does not grant a family and therefore does not make an item eligible by itself.
The derived sheet source is attributable as `satelliteEquipment` and is rebuilt
on ordinary equipment recalculation. Preview and real casts use one count resolver.

All orbs retain projectile, spell, fire and satellite investment. Kindled
Attendants additionally opts into the shared satellite count, orbit radius and
speed axes. Orbs remain untargetable effects. Contacts sweep the actual curved
path using the satellite fabric's spacing/step limits. Teleports do not sweep
the space between departure and arrival. Contact, emission and bursts respect
hostility, story and firing-line checks. An occluded orb cannot attack through
a wall. Home geometry remains attached while its visual circles the caster.

The shared satellite carrying limit (currently eight) bounds live Kindled
Attendant orbs per caster/instance; the other orbital route has a configurable
48-orb cap. These are cast-effect pools, separate from the equipment-satellite
pool. Recasting quietly retires the oldest excess orbs. Quiet retirement, death,
team/story changes, zone changes and respec never trigger natural-expiry rewards.
Angular velocity caps at the generic 18-radian/second safety limit. Duration
scaling extends the orbit; compound angular integration is frame-rate independent.

Secondary bolts keep the caster, original skill host, level, sockets, tree
investment and ordinary projectile supports. Their payload role suppresses
native art recursion, so a satellite cannot emit another satellite by accident.
Nova and expiry damage use the common hit pipeline. Supported chain/fork effects
may modify emitted bolts; contact cannot detach the parent orb from its home.

## Ignition branch

| Saved node | Display name | Initial tuning |
| --- | --- | --- |
| cinder_lance | Cinder Lance | Pierce two additional victims; each real cast adds 15 percentage points to the next cast's ignite chance, capped at certainty; accepted ignite resets the bonus |
| white_heat | White Heat | White ignite treats positive fire resistance as zero before reductions and penetration; projectile damage remains normally resisted |
| focused_flame | Pyreheart | Strongest struck target attracts nearby ignites every 0.4 seconds for 4 seconds, 180 radius, up to 48 gathered wounds |
| incandescent_point | Incandescent Pillar | Hitting an already ignited target plants a 3-second, 48-radius pillar ticking every 0.5 seconds for 35% damage; 5-second cooldown shared by that caster/instance |
| slow_combustion | Cinder Rupture | Spend 25% of remaining ignite tick damage as a 60-radius burst; remaining wounds continue |
| lasting_cinders | Forking Cinders | Each projectile contact emits two onward bolts at 55% damage, 32-degree total spread; three descendant generations and 96 descendants per cast |
| far_flight | Unbound Comet | 40% initial speed, 45% acceleration/second, unlimited pierce, 5-second duration; view-edge rebounds add 8% multiplicative damage |

Flame Studies remains four ranks of 15% increased fire damage.

Ignite chance and pillar cooldown belong to caster plus original skill instance.
Repeated deliveries and descendants share the cast's snapshot and child budget.
They do not count as additional paid casts. An accepted stronger/new ignite
resets the ramp; a weaker application rejected by strongest-wins does not.

White Heat changes only the resistance contribution to the landed wound used
to bake ignite damage. It preserves block, shield absorption, hit caps and other
landed-hit adjustments. The resulting DoT follows the normal already-mitigated
tick path, so resistance is not charged twice. A stronger ordinary replacement
clears the white appearance. The appearance travels in co-op status snapshots.

Pyreheart defines strongest as maximum life, with actor ID breaking ties. A
weaker later contact cannot steal an active focus. Transfer moves each wound,
preserving remaining time, DPS, stacks, original caster credit and leech data;
it neither copies damage nor rebakes against the new target's resistance.
Gathered wounds do not circulate between attractors. Focus marks are source-owned;
respec removes this source's mark but leaves already-applied wounds to finish.

Pillar and rupture test the victim before the new hit applies an ignite. Pillars
stay at the hit location and have their own visible ground footprint. Rupture
reduces the remaining tick bank and pays through typed DoT damage, retaining
defensive pools and indirect-damage credit. It cannot trigger another native
rupture. The hit caster receives the burst's kill credit; transferred ongoing
ignites retain their original applier.

Forked children inherit their ancestors' struck-body ledger, preventing an
immediate hit on the body that created them. Their descendants and all native
contacts share a finite cast budget. Frame rebounds rearm the ordinary projectile
ledger. Unbound Comet's acceleration and rebound behavior reuse existing flight
mechanics; a rebound never restarts its duration. Terrain remains an obstacle.

## Verification

- `npm run check`
- `npx tsx balance/probe_firebolt.ts`
- Existing `startertrees`, `satellites`, `fourthwall`, `skillflights`,
  `skillpreview`, `supportfabric`, `defenses`, `scaldkit` and `statusvoice` probes
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/firebolt-ui.cjs`

The hidden UI harness uses disposable saves/profile directories and captures
the tree at two window sizes plus satellite, white-ignite/pillar and comet scenes
under `balance/reports/`. These outputs are not committed. This is initial tuning;
the checks establish behavior and bounded interactions, not final balance.
