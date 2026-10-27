# Ground devices: traps and remote mines

Ground-device behavior is shared by skill constructs and authored monster devices.
The `groundDevices.ts` contract supplies arming defaults, contact eligibility and
resolved movement histories; `World.updateConstructs` owns actual triggering.
There are no actor-ID or skill-ID branches in the implementation.

## Authoring

A trap/mine `ConstructDelivery` may set `deviceTrigger`:

- `armTime`: seconds before activation; defaults to 0.5 for traps, 0 for mines.
- `radius`: contact radius override; defaults to the construct delivery's range.
- `groundOnly`: defaults to true; false permits airborne contact too.

A `MonsterDef.groundDevice` adds `kind: 'trap' | 'mine'` and `skillId` to the
same contract. It uses the monster's leveled skill instance, normal ownership,
stats and destructibility. The shared construct dispatcher replaces ordinary
brain attacks. Other creature behaviors should not be used to simulate a device.
Content validation checks payload references and finite, nonnegative tuning.

The Gnoll Trapper's existing Jaw Snare now uses this contract. It is visible,
destructible and walkable, arms for half a second, then executes Snap Shut once.
Its previous ambush-creature behavior could obstruct bodies and depended on a
cast completing. AI summon actions assign ground devices to their creator, so
trap damage attribution and remote mine command ownership share the usual path. Snap Shut's damage and root remain the existing payload.

## Contact and activation

Traps and mines are flat in the existing actor separation pass. Armed traps
check hostile, living, targetable, non-downed actors on their own story;
other constructs cannot press them. Ground-only devices exclude flight, leaps
and levitation. An actor's collision radius counts toward proximity.

Walking, ground dashes, sliding and knockback record resolved movement, so a
fast step crossing the whole trigger radius is not missed. Records are consumed
once per construct update, retained only while a trap exists, and cannot predate
that device's creation. A trap that finishes arming this update checks present
occupancy, not earlier movement from its unarmed interval. Teleports do not
invent traversed paths; landing atop an armed plate does count.

The payload executes synchronously before the trap is retired. Its ordinary
delivery still determines actual hits: triggering a fast crossing does not
teleport a fleeing victim back into an explosion. Walls still clamp movement;
void recovery teleports are excluded from recorded travel.

Mines never explode from proximity. Detonate Mines queues ready mines belonging
to its caster, with the shared 0.05-second lead and 0.08-second stagger.
Repeated commands cannot queue the same mine twice; a destroyed mine's pending
payload is canceled. Player detonation remains manual.

## Autonomous commands

`SkillDef.ai.autonomousMeta` opts a command granted by a carried skill's meta
slot into the ordinary AI picker. Explicit bar copies win; duplicate hosts
produce one candidate. Host bans and reservations suppress derived commands.
Command bans, costs, cooldowns, casting permissions and normal AI selection
policies still apply. Cached meta instances retain their normal state and level.

`ai.deployed` configures `kind`, optional `radius`, `minCount` and `minTargets`.
It evaluates ready, unqueued devices belonging to that actor, then distinct
hostile targets in their effective payload areas on the same story with a clear
line of fire. The default radius comes from nova/ground payloads, or their AI
range; an explicit radius supports other delivery families. Area scaling uses
the device's sheet and payload modifiers. This is an AI usefulness estimate;
the payload's actual hit rules remain authoritative.

Detonate Mines opts into both fields. An AI carrying Fire Mine can therefore
lay mines and select its granted detonation command when targets are in reach
of the mines. Current shipped monster definitions do not directly equip Fire
Mine; this pass verifies the loop with real mine-equipped actors without adding
a new enemy kit or changing encounter composition.

## Reusable visual parts and peer state

`data/deviceVisuals.ts` composes a shared jaw/pressure-plate frame for traps and
a canister/fuse-crown frame for mines. Payload accents distinguish Frost Trap,
Cinderwhirl Trap and Aftershock Snare; the default trap and mine looks and Jaw
Snare use the same vocabulary. War Banner, Soul Cistern and Aegis Crystal now
have distinct assemblies instead of borrowing generic totem/pylon bodies.

`DEVICE_STATE_VISUALS` configures small pressure-plate/fuse fittings, colors and
placements. `drawDeviceState` reads actual arming and queued detonation state.
No extra area rings, captions or speculative countdowns are introduced.
Optional construct clocks in snapshots preserve these cues on peers; older
packets default to the ready appearance. These are render fields, not peer
authority to trigger a device. Original vector parts remain recolorable and
usable in other looks; collision radii stay unchanged.

## Verification

`npm run check` and `npm run sim -- run --suite smoke` are required. The existing
presencevisuals probe now includes `balance/groundDeviceChecks.ts`: real
placement/payload execution, walkability, arming, eligible contacts, fast and
blocked movement, knockback, teleport endpoints, creation ordering, mine
stagger/deduplication/cancellation, configured thresholds, AI mine loops at
30/60 Hz, the shipped Gnoll Trapper's real deployment/contact loop, and peer state. Also run selfvisuals, trapworks, cosmetics, tacticalai,
controlstartertrees and movementvisuals.

Build with
`npx vite build --outDir balance/reports/construct-visuals/dist --emptyOutDir`.
Run `npx electron balance/construct-bodies-ui.cjs` and then
`npx electron balance/device-visuals-ui.cjs` sequentially. The hidden clients
use disposable saves/profiles, check native-size silhouettes and real state
pixels, and capture dark/bright studies plus a world frame. Inspect the PNGs
under ignored `balance/reports/device-visuals/`; pixel uniqueness alone does
not establish readability in crowded combat.
