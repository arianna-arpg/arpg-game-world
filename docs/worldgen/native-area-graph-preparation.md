# Native campaign graph preparation

Checkpoint: 2026-10-09, following the complete native birth composition.

NativeAreaSceneGraph owns the real campaign graph preparation required before
an area can receive its layout. It shares all 22 original World methods through
engine/nativeSceneGraph.ts. World retains thin delegates and its hidden cached
view; its other members and generation policies are unchanged.

This includes frontier resolution and horizon charting, road budgets and
occupancy, native field extents, complete atlas child zones, underground links,
holdfast pockets, dimensional sampling, course hints and the River of Souls with
its actual ports. Native IDs, graph insertion order, allocator advances, event
notifications, map knowledge and partial failure effects remain native.

## Owner binding and execution

Construct the graph with the same campaign object used by NativeAreaSceneCoast.
The campaign carries its actual zoneMap, caveMap, sim, manifest, visited,
nextGenId and mintVeil, alongside the existing coast campaign fields. Construction
does not chart, reset or publish anything. Coast retains the concrete local
census, geometry and carried transition.

NativeAreaSceneBoundaries uses that graph and coast binding for the complete
original pre-layout operation: holdfast preparation, eager neighbors, the mint
horizon, opening rules, knowledge changes, legacy edge repairs, exit placement,
road/boundary/meld annotations and portal separation. It refuses another zone
object or a contradictory cave transition before any mutation. The caller keeps
World.loadZone's first-visit calculation and visit-marking order.

Use graph.withGenerationPolicies for the complete synchronous preparation
tranche, continuing through NativeAreaSceneGeneration, geometry adoption and
composed native birth with the returned memory and the SAME random stream.
Individual local graph methods and boundary preparation also scope themselves.
The road guard uses the original footprint-and-land predicate over the actual
campaign. WorldSim.withGeographyPolicies and worldgen.withRouteGuard restore
previous owners in finally, including nested calls and exceptions. These scopes
must finish synchronously; they cannot span an await or parallel campaign work.
They restore policies, not already-published native graph mutations.

## Evidence

probe_nativescenegraph.ts independently archives ef76cb1e's 22 graph methods,
seed helper, connection constant and post-boundary arrival sequence. It checks
the original executable bodies/defaults and every other World class member.
The sky probe's remaining-member pin is narrowed using that same untouched
checkpoint; the graph archive now owns the moved members. Older unrelated result
pins are not changed.

Fourteen courses compare independent cold archived, current World and local
owner processes with the complete registered manifest. The two fixed native
source requests retain seed 991, ratio 20:1, source IDs native-source-course/0
and /1, and native anchors (-55,160) and (-35,1280). Their derived seeds remain
4066113691 and 903434714. A third request uses the first actual atlas complex
found inside the declared native bounds; it does not replace its child programs.

The courses include fresh and remembered births, genuine held-city fixtures,
actual holdfast pockets, native fields, underground links, sea ports, full
complex entry/return, real river-port creation and reuse, and two failures after
real graph publication. The original arrival tail performs census filtering,
player/minion resets and landing between boundaries and birth. No second layout
is generated. Local graph methods and scene roots on the donor World are poisoned.
Graph/source aliases, overlay state, allocator, all random draws and continuation,
full geometry, controllers and actor properties participate in comparison.
Only theater host capability-name order is canonicalized; every port and alias
remains compared, and native data/map/set/array order remains untouched.
The 14-course receipt SHA-256 is
f40c0b897890f8389170557248c7fb1671c45ced4ad1aff41ca6743fe5a1bd59.

Nested real campaign scopes also prove policy restoration after normal return
and both inner and outer failures. Mixed campaign/zone/cave bindings are refused
before mutation. The existing 52-course complete-birth proof remains unchanged:
3,781 bodies, six partial failures and SHA-256
102b01995883096dd983871401042bff4cb4c3c310442434272b89f5c3e71a9d.

All three type checks, adjacent native boundary/layout/coast/sky proofs, generation
QA (869 cases across three seeds, zero failures, four existing warnings), and
25-episode simulation smoke pass. The isolated built client passes real movement,
cave entry, same-hero save/Continue, return and native structure frames. This
client check covers the current playable path; it does not demonstrate newly
activated whole-area streaming.

## Remaining integration

This supplies authentic graph-to-birth preparation, not source issuance or
runtime activation. The test fixture and arrival facade are test-only transfers.
The next source session must issue from the actual campaign, reserve complete
native geometry and terrain, retain memory/RNG and all child identities, and
publish the complete owner assembly with explicit authority. The old isolated
issuer draft with empty graphs, disabled holdfast and omitted complexes is not
an acceptable substitute.

Ongoing event controllers, damage/reward ownership and whole-owner persistence
still precede complete event/content parity. Preserve each original event's
mechanics rather than introducing unrelated gameplay. After activation/paging,
map world mass to actual biome regions and native zones; chunks remain streaming
units. Connect revealed terrain, zones/events and regions through map zoom over
those same saved identities. Square MassHierarchy cells do not complete that work.
Placement continues in its separate chat.
