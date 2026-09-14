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
and zone re-entry. The current main branch's seeded quest alternatives, Reliquary
reward flow, and completed starting skill trees remain integrated.
