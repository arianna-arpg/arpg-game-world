# Odyssey: journey and surviving factions

## Agreed direction

Odyssey is the main journey within a world. Four deterministically selected
faction leaders overlap; players choose their defeat order. Freeze the roster
for that world. Until the account first defeats its tutorial faction's Odyssey
leader, every new world includes that faction, including after unsuccessful
runs. Its commander is a separate personal reckoning around levels 12–15.
Commander victory does not release the account's tutorial obligation.
After the tutorial leader's first defeat, new worlds no longer enroll or offer
the introductory revenge chain. An existing world's opportunities remain intact.

Leader victories advance acts, with expected culminations around 23, 45, 60,
and 75. These are readiness targets, not character-level gates. Final preparation
becomes actionable after four victories; the final undertaking begins around
80 and victory comes later. The mystery, final undertaking, and victory condition
are undecided. Endgame follows victory.

Each campaign has an operation in the world, discoverable leads, an approachable
target, optional useful preparation, and consequences. Exploration and local
work both provide routes. Campaigns never require the tutorial commander.
Preparations persist when switching campaigns and crossing acts. Surviving
factions change the world through their own mechanics, primarily at act changes;
ambient inhabitants do not receive retroactive global stat increases.

Goblin pressure must interrupt expeditions: warn of attacks on Lastlight and
give the player a reason to return and defend it. Bandit messengers must see the
player, visibly flee along real pathing to a real exit, and succeed before any
response occurs. Interception must prevent that response. Tuning belongs in data.

Leader rewards include immediately useful spoils and character Vocation points,
once per leader per world, even before acquiring a Vocation. Account discovery
expands Vocation options. Account milestones and world progression have distinct
scopes. Essential mystery evidence cannot depend on selecting a particular faction.

## First implementation choices (tunable, not further design decisions)

Eight candidate campaigns cover the seven tutorial factions and Bandits. Each
uses an existing faction combat kit under a distinct named Odyssey leader, a
supply operation, and a persistent clue. These are playable prototype campaigns,
not eight finished storylines or bespoke boss designs. All four operations exist
before accepting local work. The journey journal records opportunities and their
map targets automatically; the quartermaster's early vendetta is personal guidance.
Clearing local faction packs also reveals the route. The supply operation is
optional: destroying it removes the leader's extra escort and weakens that
faction's pressure. Completing it never advances an act.

Each surviving campaign's next confrontation is prepared for the current act's
readiness band, with a fresh escort. This affects only Odyssey leader grounds,
not the ambient level field or ordinary faction inhabitants. Completed supply
operations stay completed. The journal states the current readiness target.

Bandits surviving one victory send scouts increasingly often through their
territory and reinforce claims around their dispatch operation through the
existing territory simulator. An escaped report sends a bounded hunting party into the reported
zone after a warning delay. The report and remaining hunters persist while the
player is elsewhere. Hunters march to the last sighting through the command and
pathing systems, then acquire targets normally. Destination entrenchment is a future alternative, not a
second punishment silently applied to the same report.

Goblins surviving two victories periodically threaten Lastlight. A warning leads
to a timed defense of real waves at town's approaches. Unanswered or unfinished
assaults raid supplies: town trade closes until the remaining raiders are defeated.
Town travel remains available so expeditions can be interrupted and the recovery
is always reachable. Successful defense grants supplies and a respite. Destroying
the Goblin operation reduces waves and lengthens the interval. Killing the Goblin
leader ends this pressure. Clocks use active world time, not offline time.

Vocation payout ownership moves to Odyssey: two points per leader (eight per
world); Vocation quests retain discovery, acquisition, and their other rewards
but default to zero points per step. Explicit per-step payouts are audited.
The existing level-30 entry and repeat-run claiming rules remain unchanged.
Points already earned on a saved character are retained; there is no clawback.
The former ordinary three-step chains paid six points; this first pass makes
eight available through the four leaders. Swordsaint's explicit 3+3 exception
also moves to this common income. Existing mode rules still govern account
progression: a mode that seals account gains cannot earn the tutorial release.

Every selected leader yields one independent fragment of the same unresolved
signal. Four fragments unlock an actionable survey preparation, not victory.
Faction-specific interpretations foreshadow the shared problem without deciding
its ultimate explanation. No final boss or endgame completion is claimed here.

## Undead nights and scenery risings

When Undead are among the selected leaders and Nhal survives, open expedition
ground can raise small groups from nearby tombstones, bone piles/cairns, burial
urns, dead trees, stumps and rubble at night. The existing world day/night clock
owns this gate; darkness in a sheltered cave does not count as night exposure.
Towns, sheltered ground, side caves, special/boundless zones, quest grounds and
scripted scenes are excluded. No terrain is generated for this mechanic.

The first opportunity has an eight-second entry/nightfall grace. Subsequent
warnings are 32/24/16/10 seconds apart after 0/1/2/3 leader victories. A surviving
Undead campaign therefore becomes more active as other leaders fall. Silencing
the mustering crypt doubles those intervals, including the remaining portion of
an existing cooldown. Defeating Nhal stops new risings. Existing bodies remain
ordinary enemies; dawn prevents further births without erasing a fight.

Each opportunity selects suitable scenery 180–520 units from the player and
reserves up to two reachable emergence spots. Across four seconds, loose dust
thickens, soil cracks and skeletal hands reach and grasp from those exact spots.
The Undead emerge where the hands were shown. There can be at most ten living night-risen enemies
in the active zone. The source must still exist on the same story and at the
warned position; leaving it beyond 650 units cancels the rising. Births require
reachable, unoccupied ground clear of solid scenery, player feet and exits.
Placement is checked both before showing a disturbance and before emergence.
A newly blocked spot is cancelled, never moved to an unmarked fallback spot.
Avoided or interrupted risings lose their hands and leave a brief settling dust.
Removing suitable scenery and moving through open ground provide local relief.

Bodies use native assault orders toward the warned sighting for twelve seconds,
then ordinary perception/combat. They carry an `odyssey_rising:<row id>` tag for
attribution and keep their ordinary species names. Their normal bounties, wounds,
species, casualties and tags ride the existing zone-memory/save paths, with the
same expiry and refresh rules as other inhabitants. This pressure adds no second
body save. Cadence alone persists in optional validated Odyssey `risings` rows;
old saves need no reset. Travel, reload, player incapacitation and scenes cancel
unfinished warnings and restore an entry grace. Offline time produces no births.

`src/data/odysseyRisings.ts` owns the open `ODYSSEY_RISINGS` rows: faction gate,
phase list, onset act, intervals, preparation multiplier, scenery, roster, cap,
placement and presentation. `src/engine/odysseyRisings.ts` conducts any such row;
adding another scenery-born faction pressure needs data rather than another
faction branch. `src/world/odysseyRisings.ts` validates its saved clocks.
The `cue` row selects registered visual effects, tint, size and settling duration.
`src/render/vis/groundRising.ts` owns the reusable earth/hand painters and their
visual tuning. Existing flash snapshots carry the same positions and animation
progress to co-op clients. Scatter is stable at the wire's position precision.

**Show, don't tell is the gameplay-signaling law.** Undead risings add no floating
captions, notices, HUD instructions, textual countdowns or journal tutorial of
their cadence/counterplay. Disturbed ground, growing motion and actual emergence
carry the mechanic. The existing zone objective stays visible. This pass replaces
the Undead signaling; older Bandit/Goblin text remains a future conversion task.

`npm run probe -- odysseynights` verifies gates, warned real AI bodies, collision
and reachability, caps, save/travel survivors and casualties, live cadence changes,
the absence of instruction text, committed-site cancellation, co-op cues, and
the actual crypt/leader objective paths. After a build, run
`node_modules/.bin/electron.cmd balance/odyssey-nights-ui.cjs` on Windows (or
`npx electron balance/odyssey-nights-ui.cjs`) for isolated hidden real-client
early/middle/late visual and birth assertions and screenshots in `balance/reports/`.
These checks establish mechanics;
the 32/24/16/10 cadence remains initial tuning for human playthroughs.

## Verification and extension

### Playing the foundation

Start or continue a character and open the Quest Journal in Lastlight. Worlds
without Odyssey state receive their roster on the first active world update;
resuming a world with Odyssey state retains its existing roster and progress.
The Quartermaster reveals campaign leads. Faction kills and visiting an operation
also reveal routes. The introductory commander is ready around level 14; it does
not count as one of the four leaders. Leader readiness advances through 23, 45,
60 and 75 as leaders fall, with two Vocation points per victory.

To encounter Bandit pressure, Bandits must be selected and survive at least one
leader victory. Explore their territory and watch for the messenger warning.
To encounter Goblin sieges, Goblins must be selected and survive two victories.
The first siege then takes about twelve minutes of active world time to muster,
followed by a ninety-second warning and a four-minute defense window. Completing
the Goblin operation weakens attacks; defeating their leader ends them.

For the first playthrough, note whether the next objective is clear, how long
travel and preparation take relative to leveling, whether scouts can be noticed
and intercepted fairly, and whether siege interruptions leave enough expedition
time. Record character level, selected factions, defeated order and any completed
operations with feedback. These conditions explain the pressure being tested.

### Automated coverage

The Odyssey probe exercises deterministic frozen selection, account release,
run-only acts, real objective payouts, banked points, preparation persistence,
save/reload, scout sight/escape/interception, report response, and town defense.
Use `npm run check`, the smoke simulation, generation QA, and boot smoke alongside
that probe. Shared world integration uses narrow Odyssey hooks; definitions,
saved state, and live pressure are separate modules. Future content can replace
the prototype operations and add other faction pressures through those seams.

The first pass follows the existing host-owned quest reward model. Networked
co-op journal/point distribution has not been expanded or playtested here. The
prototype leader kits and encounter levels need human balance playthroughs;
the automated kill probes establish milestone correctness, not fight balance.

Validated in this implementation: `npm run check`; `npm run probe -- odyssey`;
the tutorial (`mu`, including Mu offers and murmuration) and persistence probes;
25 smoke simulation episodes; generation QA (864 cases × 3 seeds, zero failures,
eight warnings); production build; and desktop game smoke with an isolated profile.
The Windows sandbox required Vite's `--configLoader runner` and an unsandboxed
Electron smoke process; these are verification environment choices, not game changes.

Integration also checks that settled accounts do not restart the vendetta and
that surviving Bandit hunters retain their combat kits and wounds after casualties
and zone re-entry. Quest directions and discovered leads now grant bearings without
surveying destinations or approaches; [quest geography](quest-geography.md) defines
local placement, exploration framing, and the explicit cartography exception.
The current main branch's seeded quest alternatives, Reliquary
reward flow, and completed starting skill trees remain integrated.
