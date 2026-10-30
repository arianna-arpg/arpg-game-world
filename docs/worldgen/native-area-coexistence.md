# Native area coexistence and navigable places

NativeAreaCoexistence follows installed source bootstrap on the combined seamless,
shard and loading-screen foundation (starting at 7799af63). It closes two
preparation-time ownership hazards. It does not publish complete areas into the
client or supply the remaining ongoing controllers.

## Preparation ownership

A fresh NativeAreaSceneAssembly borrows its initial campaign party. Those bodies
may include the player, other seats and minions. Constructing a neighboring area
must not replace their authoritative statusRelay callback. The population owner
snapshots that borrowed set and excludes it from explicit local relay transfers.
New and restored local residents still receive the real native relay against
that area's census. Standalone population owners retain their explicit detached
handoff contract when no shared actors are supplied.

This preserves an existing campaign route; it is not the final spatial dispatcher.
Publication still needs authoritative membership and routing for party members
that enter, leave or are created after assembly. Adding a body to an array does
not itself authorize an area to acquire that body's callbacks.

Each assembly now owns its traceRuns array. Environment and occurrence owners
share one NativeAreaTimeflow scope over the actual campaign clock. Logical trace
and harvest holds get per-instance handles, so cleanup in one area cannot release
another area's hold or an existing World hold. Repeated holds refresh only that
owner. Native surface definitions, campaign clock aging and explicit live
multiplayer policy checks stay native; the scope does not create a private clock
or grant permission to pause a shared game. Provider methods retain their receiver.
Handles are recorded before hold invocation so native cleanup can release a hold
if a provider throws after applying it.

The handles are process-local, including when two assemblies name the same area.
Future persistence must retain actual activity state and re-establish authorized
holds on attach. Serializing these temporary handles, dropping an owner with an
unfinished activity, or using global release-by-kind as local cleanup is invalid.
This change does not implement that attach/detach lifecycle.

## Place design and integration order

The user's 2026-10-11 direction is continuous geography with meaningful native
places: areas and points of interest with terrain, identity and objectives,
including both bounded and open layouts. Walls, barricades, cliffs, mountains
and valleys should require navigation where their geography calls for it.
Holding one direction should not bypass the meaning of an enclosed place.
Open country should still have room to roam; enclosing every area is not implied.

The older seamless-world branch is useful precedent. Its design preserves native
ZoneDef identities/content and maps graph connections to physical places. Later
changes add per-tileset enclosure and openings, then constrain connective tissue
to ways and mouth aprons. Relevant references are docs/design/seamless-world.md
and src/world/seamless.ts on that branch, including 75333fd2, 40625a40 and f6620af8.
Its fitted cells also resize authored grounds to a partition; that is not a safe
replacement for today's complete native-sized areas and children. Do not carry
forward World field swaps, arrival resets, lossy ZoneMemory, a second gameplay
mode, or an assumed universal tile/unit scale.

Continue in this order:

1. Finish retained local ongoing controllers, damage/reward services, render/query
   readers and campaign party routing. Use live campaign views. The source test
   fixture's copied scalar state and throwing services are not runtime adapters.
2. Admit complete native terrain and child identities, publish once and preserve
   complete owners through paging, return and cold Continue, including unfinished
   events, objectives and random state. Prove two genuinely live neighbors.
3. Build the bounded/open layout pass over those actual places. Preserve authored
   native footprints, required encounters and meaningful objective locations.
   Express enclosure with colliding terrain/structures and intentional traversable
   openings. Connect actual approach routes, with alternate paths or chokepoints
   where appropriate. Keep open places open by explicit layout intent.
4. Present genuine biome regions and native places through map hierarchy and zoom
   over that same world. A streaming cell is not a content region or a visible
   gameplay border.

Admission work in step 2 must already respect any source's existing walls,
openings and terrain. Step 3 expands layout variety; it is not permission to
flatten current places first. Coordinate that physical work with the placement
and exploration lane. NativeAreaSceneAssembly placement hints are not permission
to carve or publish terrain. The existing finite seam planner refuses unsupported
shapes; do not silently crop ellipses, annexes or boundless native sources to fit.

The later layout proof must cover full-body collision and swept movement,
reachable objectives and approach/return routes, protection against unintended
exterior shortcuts, relevant co-op approaches, and unchanged terrain/objective
state after departure and cold Continue. Visual cues must agree with physical
collision. A drawn wall or a route through a blocked opening does not satisfy it.

## Evidence and limits

probe_nativeareaisolation exercises two real fresh owners sharing a player,
second seat and minion; immutable shared-party capture; actual native grounding
through Actor.applyStatus selecting only the local census; independent trace and
harvest cleanup on the real clock; surviving global holds; live policy receivers;
malformed bindings; and cleanup after a provider throws following a real hold.

The complete existing source and birth courses pass on the combined baseline:

- Fourteen cold World/fresh-owner source courses, plus genuine complex roots and
  siblings: ebbcc706a6302a68e595f3e16a7c25ce8f9f482240fa712dec32d6527e067534.
- Fifty-two original/current/local birth courses, 3,781 bodies and six partial
  faults: 4e69d53160861b422b0a85b4f6ead4c5038760cd7019ac09b3e275f5632724f3.

These are current combined-baseline receipts, not the older checkpoint's hashes.
The source-session regression now explicitly requires that local trace cleanup
preserve the campaign's existing trace array and hold. No native generation,
combat or objective method was replaced to obtain that result.

All four type-check targets pass. Population, occurrences, environment, status
relay and installed-source probes pass. Generation QA passes 869 cases at three
seeds (2,607 total), with zero failures, four existing spacing warnings and one
metropolis timing warning (486 ms/seed during concurrent QA). Simulation smoke
passes all 25 episodes. The isolated staged browser build passes, with the
existing bundle-size warning.

The isolated actual-client wilderness course passes with zero client errors:
1,100 normal-input frames follow a complete generated route to its native cache;
eight distant stops exercise real native updates and dormancy; cold Continue
retains all 135 original identities/vitals and admits 18 nearby bodies; return
restores the saved mockthrush at 45 life. Nearby counts are 33/63/38/11/8/0/5/4
(mean 20.25); the empty stop remains visible. This run did not encounter a
pending-page wait on return. The destination frame was visually inspected.

The current shard-runtime foundation document tracks existing whole-world source
guard, worldmass regression and performance failures. They are separate work and
are not silently repinned here. Client regression evidence concerns the currently
playable path, not activation of this complete area assembly.
