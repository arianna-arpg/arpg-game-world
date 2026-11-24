# Reading casts and triggered mechanics in combat

Triune Tempest reacts to the dominant element of the triggering hit. Fire releases a frost nova, cold releases lightning, and lightning releases flame. Three rotating marks carry the outgoing element. Smaller marks retain the material and color of the incoming hit. Their circle fits the actual damage radius. The effect appears only when the shared cooldown permits a discharge.

Tractor Tethers shows a pair of conductive strands on each selected enemy. Teeth travel toward the caster to show the direction of pull. The strands follow both bodies through the pulse. The host supplies the affected targets and their identities, including in co-op. Scenery, floor and actor visibility apply to both endpoints.

## Catalog audit

| What the check enumerates | What it checks |
| --- | --- |
| 1,036 native skill definitions | Each has exactly one authored delivery in the strike, movement, flight, field, beam, target, presence, self or burst registries. |
| 52 native skill payload types | Every engine payload type has an identified presentation surface. Follow-up casts resolve through their own skill. Stat changes, cooldowns, resource transfers and spawned bodies retain their native surfaces. |
| 4,197 passive nodes and 242 selectable options | The audit follows 245 proc grants and 132 status grants into the registered content. The buff audit separately compiles active gates from actual allocations and choices. |
| 1,988 skill-tree nodes | The audit resolves secondary buffs, triggers, support grafts, charge and conduit changes, and follow-up skills. It checks attack sequences, projectile and guard arts, companion bonds, swarm evolution and challenge devices against the resolved skill. It checks 223 buff patches and 48 distinct added buff IDs for independent artwork and node attribution. |
| 240 registered procs | All independent impact procs (36) resolve to a registered painter. Nested casts and statuses resolve to their own definitions. Recovery, resource and cooldown receipts can identify the triggering effect above the hotbar. |

A modified attack still uses its own delivery and resolved geometry. An additional blast, delayed payout, status, connected target or timed bank can have its own visible identity. A permanent flat bonus has no moment of activation.

## Adding a mechanic

* Add a composition to `MECHANIC_BURSTS` in `src/data/mechanicVisuals.ts`. Choose the material, motion, mark count and optional secondary material or color. Emit its stable key at the point where the combat outcome resolves, with the actual position, radius and floor. A proc can supply its own registered painter through `ProcDef.impactFx`.
* Use `mechanicLink` in the loop that actually affects the target. Profiles configure material, accent, motion and pulse duration. Carry actor identities so a moving target keeps its connection. World positions and lifetimes for persistent objects come from `World.mechanicFields()`. The same rows reach remote clients. Ground object profiles specify their own silhouette and footprint material.
* Store a victim-side mark in `MECHANIC_MARKS` only when the mechanic lives outside the status registry. Read its real stack count and remaining duration. The actor uses a small material mark and the player's danger tray gives the full list.
* Put beneficial player states above the hotbar. A `TreeBuffPatch` accepts `buffLook`, `buffHud` and `label`. The resolved buff retains its contributing node names. `GRANTED_BUFF_LOOKS` supplies native secondary faces, and passive banks read the character's combat counters. A transient proc receipt may provide a `subject` via `ProcCueSpec`.
* Wicker Decoys, Volatile Effigies, Squall Clouds, Harvest Globes, Dawn Consecration, Spring Bloom, lava puddles and Power Blobs draw throughout their actual lifetime. The footprint uses the gameplay radius when the object affects an area. Pickup, destruction, expiration and travel retire the corresponding image.

## Verification

`npm run probe -- mechanicvisuals` checks the catalogs, three real elemental transitions, cooldowns, Tractor Tethers' three-target cap and pull, skill-tree buff attribution, mark stacks, pickup collection, all eight field types across co-op and travel, and refund cleanup. `npm run probe -- passiveexpansion` exercises the underlying expansion mechanics. The family-specific visual probes cover the native deliveries.

`node balance/debuff-coverage.cjs --mechanics` boots the game renderer. It casts Pyre Nova, Frost Nova and Thunderclap through the ordinary skill input. It compares frames with and without the resulting Triune or Tractor event, samples pixels between the bodies on each tether, and exercises every registered mechanic impact, link, field and mark on the browser canvas. Its four combat captures are saved in `balance/reports/mechanic-coverage.png`. The separate `--buffs` inspection checks ammunition, hovers, and player-body readability. The catalog audit measures authored coverage. The captures sample actual combat, and crowded combinations still benefit from playtesting.

## Effects that earn a second event

| Event | Combat and presentation contract |
| --- | --- |
| An ailment lands | Skill and stat applications test the recipient. Immunity cannot plant Rupture Seed or emit an application reward. A live seed can detonate on its threshold or its host's combat death. |
| Impale ends | Ordinary lodged steel clears on death or expiry. A definition can opt into either terminal trigger. Spear Recall or cleanse can consume the wound first. |
| An affliction moves | Draw Corruption heals per accepted affliction. Transfusion spends only wounds it delivered. Wildcard transfers leave blessings and field-bound wounds behind. An explicit ID list can include a portable blessing. A successful transfer carries a stacked bank once and retains its applier unless an authored relay takes credit. Spores, wisps and blood drops follow the relevant donor and recipient. |
| A body leaves | Quiet removal and immortal resets award no kill resources or deathrattle summons. Killing a Viscous Ooze still divides it. A construct with a declared break payload can discharge on dismissal, once, on its own floor. |
| A monster detonates | The monster's death-burst configuration selects the material, element and footprint. An orb forms before its damaging release. Co-op receives the floor and art of the host's warning. |
| A projectile interacts | Absorption draws shields inward, parries turn them outward, and refraction splits into shards. A damaging burst uses the resolved footprint and a material for the projectile's base damage. The optional `explode.impactFx` selects an authored painter. |

Run `npm run probe -- effectinterplay` for the positive and negative gameplay cases, the status catalog and the explosive bestiary. Run `node balance/debuff-coverage.cjs --interplay` for six combat captures including a warning, three discharges and two transfers.

## Native flash coverage

The 198 previously plain emissions are accounted for. 196 now select artwork at the event that earned it. The burrow eruption already had a damaging footprint, so its second, oversized ring was removed. Environmental status washes rely on the receiving actor's actual status presentation. A refused wash stays quiet.

The census covers 410 native flash arguments across `src`. Of those, 341 select a painter, three select dedicated drawing fields, and 66 delegate to helpers or compose their presentation. Zero emit plain flashes. `npm run check` runs the census across the whole source tree. `node scripts/audit-combat-flashes.mjs --all` lists each file, line, owning function and drawing path. The scanner follows local constant literals, conditional arms and object spreads. Registry-backed helpers and dynamic mod callbacks also need runtime checks.

| Visual job | What the player sees |
| --- | --- |
| Identify a moment | A source-local silhouette distinguishes the event, including a summoning rune, a spent lantern, a reclaimable soul, and a broken puzzle note. A brief mark can identify an arriving summon. Beneficial state and stack tracking stay on the existing HUD. |
| Show contact | Plies shed slivers, burrowers kick up soil, rocks shed chips, and a lashing vine draws from its root to the struck body. Fulgurweb arcs connect the actual affected allies on the marked body's floor. |
| Warn about space | Ticks sit on the tested boundary. Burrow exposes its full danger radius throughout its warning. A scatter storm uses its base element or an authored `StormDelivery.telegraphFx`. The centre stays clear through the fuse. |
| Show an outcome | A real eruption fills its footprint. Refrain answers and mistakes have separate silhouettes. Harvest families select the material of both the main break and loose fragments. Beacon, pyre, dig and rift objectives identify which fixture is charging or completing. |

`WORLD_MOMENTS` in `src/data/worldMoments.ts` defines the source symbols, materials, motion, trails and boundaries. The renderer uses the emitted position, radius, bearing, color and lifetime. Puzzle flashes, kill handlers, trap mechanisms and occurrences accept a registered painter from the caller. AI heal and summon actions accept `fx`. Targeted doodad effects accept `impactFx`. Two outcomes can intentionally reuse art when they communicate the same event.

`node balance/debuff-coverage.cjs --world` samples every world profile twice in the game canvas, checks warning edges and clear centres, and captures eight events from native gameplay paths. It also checks the co-op warning, the single damaging burrow eruption, a heal at full life, and Fulgurweb's receipts across overlapping floors. Its comparison is saved to `balance/reports/world-moments.png`.
