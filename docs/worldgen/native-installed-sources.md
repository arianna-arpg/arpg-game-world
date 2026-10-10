# Installed native sources and standalone registration

Checkpoint: 2026-10-09, after [native campaign sources and fresh area assembly](native-area-source-session.md).

## Production source boundary

`installedNativeAreaSources` now builds the complete source bundle consumed by
`NativeAreaSceneAssembly` from installed native registries. It accepts only the
campaign simulation and notice capabilities needed by ambient population. It
neither reads a World scene nor promotes the test campaign/service adapter into
production. Simulation replacement and method receivers remain live.

Eleven complete native provider objects are shared with World through
`nativeSceneSources`. Population rules, nineteen tunables, the original selection
helpers, and six top-level registrations have independent production homes.
World retains its original source caching, non-enumerability and freezing. The
area bundle retains lazy registry/configuration reads and generation-scoped random
functions. In particular, pocket arrival grace stays the native 300 pixels; it
is not the reduced value formerly used by the test adapter.

`nativeSceneBootstrap` loads the exact ordered, deduplicated runtime dependency
roots of the original World module. Its 380 imports exclude only the two roots
that capture World through save restoration: `meta/character` and
`worldmass/runtime`. There are no runtime statements in this bootstrap other
than imports. Some registrations arrive transitively through controller modules;
this broad dependency list is intentional and is pinned, but it creates a
maintenance obligation when native imports change. It is not a curated subset
of content and is not a retained-area runtime.

A bundled dependency-graph assertion rejects any transitive World, simulation
arena or main-client import from `nativeAreaInstalledSources`. Importing these
sources constructs no World, transfers no campaign/scene owner, and performs no
persistence operation. The existing `nativeBootstrap` remains unchanged.

## Independent evidence

`probe_nativeinstalledsources` checks the original provider objects, native
helpers, tunables, registrations, ambient/group source fields and exact World
member changes against an embedded archive from 901c5a84. Every other World class
member is pinned to that original snapshot. This is a narrow source extraction;
no unrelated native gameplay method changed.

Two cold processes boot either the current World registration root or the
standalone installed-source root. Inventories are captured before the validator
can import additional content. They include actual geography, factions, all
1,186 monster definitions, packages, theater kinds, generation pins, conversion
rules, doodad families, NPC sympathy registration, fourteen lightwells, 190 speech
templates, nineteen haunt kinds, fourteen track riders, 587 doodad kinds and 48
layout IDs. Inventory insertion order and subsequent validation warnings agree.
An independently verified pre-change snapshot produces the same receipt:

`c078829c532be168f89fe7ca7a048d9ed868eb9fee05c2529ee9ee020c84c5af`

The probe permanently pins that original receipt and original import-root list.
It also verifies live campaign callbacks/receivers, simulation replacement,
configuration changes, registry identity and Math.random replacement. A read-only
critic separately checked the import list against emitted original JavaScript,
the no-World dependency graph, and a bare cold import without headless shims:
zero random draws. The review found no blocker in this extraction scope.

The fresh assembly fixture now uses the production source/config factory. Its
campaign adapter and unavailable post-birth services remain explicitly test-only.
The existing complete source and birth courses still match unchanged receipts:

- Fourteen cold World/fresh-owner source courses:
  `85ab30738b5521b9b9f56b2bc0faefcf1d87d292b413ebe78c35cecd3a821338`.
- Fifty-two original/current/local birth courses, 3,781 bodies and six partial
  faults: `102b01995883096dd983871401042bff4cb4c3c310442434272b89f5c3e71a9d`.

All three type checks pass. Population resolution, monster factory/promotion,
ambient population, environment, layout, boundaries and resident probes pass.
Generation checks pass 869 cases at three seeds with zero failures, four existing
spacing warnings and one metropolis timing warning (482 ms under concurrent QA).
All 25 simulation smoke episodes pass.

The older whole-World guard in `nativescenegraph` still reports its pre-existing
source-pin mismatch. Its expected hash is
`1bd7b07b86067cb17529de8a43a427bbfdc5f2974cb1e3154f6cdec8518fc4dd`;
after restoring only explicitly asserted extraction members, the current hash is
`11a71a2d5d3acdc4e0f8957e5e914d9a82673910442b6b0009e3619324f1bf7e`.
The restored full member list matches the untouched 901c5a84 snapshot exactly.
The guard remains intact and is not silently repinned. Its dynamic courses do
not run past that assertion; the separate full source and birth proofs do pass.

The older `nativescenesky` whole-World guard also fails identically in the
untouched pre-change snapshot and current normalized source: actual
`ad004059488d689ad4b8fd7d1b710ab246a4f99104a699de2b660df0fa56c9b5`,
expected `668c4df21d9f4a4dc7b322914ef4804f70fc0712d42f868b1ea85f99fb6f6a0d`.
That guard is likewise preserved; its dynamic courses are not claimed as passing.
The isolated staged build passes the actual client course: native country
movement, cave entry, same-hero durable Continue, exact surface return and native
structure frames. The continued cave and structure images were inspected. The
real desktop game smoke entry also passes, using the same build and a disposable
profile. These checks contain only this checkpoint's staged changes; concurrent
placement/population edits are excluded. This is regression evidence for the
currently playable path, not activation of the complete new area assembly.
## Next runtime boundary

Installed sources are now concrete. Full-area activation, ongoing gameplay and
persistence still need their own implementation and proof. The source factory
has no active client call site that publishes a complete assembled area.

Before neighboring owners can be activated:

1. Give shared actors authoritative area relay routing. The current population
   constructor transfers relays for every supplied actor; assembling a neighbor
   with the shared player can overwrite that player's statusRelay before the
   neighbor is published.
2. Own occurrence trace state per area and scope shared Timeflow holds. Binding
   a World traceRuns array lets neighbor birth clear another area's trace and
   release its `trace` hold. Audit harvest holds under the same ownership rule.
3. Bind complete ongoing controllers, damage, rewards and render/query readers
   to retained local owners. World-bound completePuzzle, dropGemAt, plantDressAt,
   slipAway and resolveHit read the active scene and are not valid generic
   neighboring-area services. The birth registry does not supply all ongoing
   updates. Use live campaign views and retained identities, not the test
   adapter's copied scalar fields.
4. Reserve complete native terrain and child identities, publish once, and
   persist/stream entire owners including unfinished events and random state.
   Prove two live neighbors, leave/return and cold Continue without rebirth.
5. Bind genuine biome regions/native areas and map zoom over that same continuous
   world. Streaming cells are not the requested content/map hierarchy.

Seamless remains the sole intended final architecture. Main supplies the native
content reference; old border teleports, arrival resets and visible zones are
not the target. Placement and exploration continue in their separate chat.
