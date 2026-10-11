# Area-owned rewards and objective completion

This checkpoint follows 3528e0d7 (retained native puzzles). It shares fifteen
original World loot mutations and six objective/XP/text mutations with concrete
retained area owners. World delegates to the same bodies through cached live
views; its ordinary call sites, frame order and input routing are unchanged.
This is an ongoing ownership step toward complete native areas in one seamless
world. It does not activate complete retained areas in the playable client.

## Reward ownership

NativeAreaSceneLoot uses the area's existing physical drop store, geometry,
settlement rolls, authored level and regional gem floor. It follows the physical
owner's current drop array even when memory restoration replaces that array.
Currencies, gear, gems, memory drops, vestiges and native orb creation keep their
original policies and random consumption. The campaign supplies real account,
seat, quest and allocation policy; the area owns spoilStory, orbs and flashes.
Explicit reward-zone/level/source overrides retain native precedence.

The assembly now binds puzzle rewards, opening rewards and theater gem drops to
this sink. Opening, geometry and history text goes to the retained objective
owner's text array. Puzzle combat casts remain a required separate capability.
Orbs are created locally, but their ongoing movement/pickup service is not supplied
here. Physical drop serialization already belongs to the existing physical owner;
this change is not a complete area save/publication protocol.

## Completion and progression

NativeAreaSceneObjectiveCompletion shares completeObjective, objectivePlaces,
grantXp, grantSeatXp, questOnZone and text. It retains the area's objective latch,
objective geometry, last counted fall location, texts and flashes while using
live campaign seats, experience, account, ledger and completed-objective history.
The genuine native XP body changes experience, levels, resources, points,
milestones and durable account state. Repeated completion retains the original
one-payment latch semantics, including original partial-effect ordering.

Reward placement remains native: spires/rifts/pyres/digs, matching boss bodies,
then the zone-tagged last counted fall where applicable. Puzzle nodes and chests
are not silently invented as XP locations. An empty location list preserves
native keeper/acting-seat behavior; this work adds no new proximity rule.

Two authorities remain explicit required providers. recalcSeat can alter statuses,
companions, summons and ongoing combat; resyncMercenary needs the correct area and
hero. onQuestZoneFieldCleared reaches cargo/rescue/choice and the full quest payout
chain. Borrowing active World methods for a neighbor would misroute those effects.
The retained controller therefore requires area-aware progression and quest
providers. The complete assembly test fixture throws at these unavailable
boundaries. Recorded providers in the parity probe are test instruments only.

The full objective watcher and kill-driven fall-location recording are still to
be integrated. Completion is callable and locally owned; no new watcher is
scheduled here. The assembly's existing test campaign adapter still copies some
scalar fields and is not a production live campaign adapter.

## Independent evidence

Both archives pin exact method bodies and moved constants to Git 3528e0d7.
Normalization accepts only the asserted delegates and new host views before
restoring the original whole-World source. Existing historical guards and hashes
are not repinned. nativeSceneBootstrap stays the first World import.

- Loot: 79 archived World/current World/shared core/retained owner courses.
  Receipt: 472baaf9e43695d27456219c92468130042da009d45c7dbf5ef997466bc5ba46.
  Includes real native settlement rolls, memory capture/restore, regional floors,
  sealed/owed/discard behavior, quest/allocation scope, inherited live receivers,
  ten injected partial failures and separate missing-capability/identity refusals.
- Objective completion: 47 courses comparing the same four implementations.
  Receipt: 065fa4c7f151e5875a98293713d3a9009a7ee007ad434cee321ce237c736926d.
  Includes real XP/meta/level/resource/milestone/save changes, local effects,
  repeat completion, party/keeper/place/possession/downed/blessing/relic behavior
  and five partial failures. The unresolved progression and quest boundaries use
  explicitly labeled recording providers.
- A separate architecture critic found no blocking ownership defect. It checked
  live physical storage, campaign accountDirty, nullable receiver bindings,
  distinct questSeat/questHand, bootstrap ordering and required service boundaries.
- All four type-check targets pass.
- Complete source preparation: 14 courses with unchanged receipt
  ebbcc706a6302a68e595f3e16a7c25ce8f9f482240fa712dec32d6527e067534.
  Its integration adjunct births two actual native areas with pinned ember rows.
  Solving one mints real local physical drops without altering its neighbor or
  the original World. Actual completion pays XP and records campaign history,
  without changing neighboring latches, flashes or messages. A repeat does not
  pay again. This course stays below a level threshold, so it does not imply the
  missing area progression rebuild exists. Pinned rows do not prove natural
  puzzle frequency or browser gameplay activation.
- Complete birth: 52 courses, 3,781 bodies, six partial errors and unchanged
  receipt 4e69d53160861b422b0a85b4f6ead4c5038760cd7019ac09b3e275f5632724f3.

Focused regressions pass: nativesceneloot, nativesceneobjectivecompletion,
nativeinstalledsources, nativescenepuzzles, spoils, memories, containerloot,
puzzles, worldmass_puzzlerewards, classmastery, relicflow, shardparty,
worldmass_localcues, brandtquest, persistence, resurrection and unlocks.
Generation checks cover 869 cases across three seeds (2,607), with zero failures,
four known spacing warnings and one metropolis timing warning (487 ms/seed).
Simulation smoke passes all five scenarios across five seeds.

The first shardcounters run failed only "D board: B's writ pays B" (wallet score
32 stayed 32); the remaining seat, quest, journal and objective-place checks
passed. An independent critic's unmodified reruns passed on both 3528e0d7 and
current code. Three further logging-only diagnostic runs per version also passed:
B received ten Glimmering Essence, its hand was removed, and the receipt reported
success. No failure mechanism or unchanged-baseline reproduction is established.
This remains an intermittent assertion to investigate, not a claimed fix or
confirmed pre-existing defect. Neither production nor probe assertions were
changed in response. Evidence is retained under
.claude/native-loot-shardcounters-baseline.local.work and the current-named logs
beside it.

Previously documented sky-guard, three worldmass and shard performance failures
remain outside this change. They were not repinned or rerun; see
docs/engine/shard-runtime-foundation.md. The natural-court arrival browser failure
recorded in native-area-puzzles.md also remains unresolved and was not rerun here.
This checkpoint is not an all-suite or release-ready claim.

The isolated seamless build passes (24.63 seconds). Its staged source tree is
e4c5acab6de88c847297cb91829b19d72b83dcf0, under
.claude/native-rewards-phase27.local.work/snapshot. All sixteen changed
source/fixture/probe files match that snapshot; documentation is finalized later.
The storage scope is seamless-native-rewards-phase27-qa and each client harness
uses a separate disposable profile. Build artifacts are not committed.

The unchanged reward-labels-ui.cjs stops before client startup because it requires
exact renderer source from 651d7e05. The current drop painter already includes
multiplayer ownership opacity (dropAlpha). The entire current renderer and its
built source match unchanged 3528e0d7 exactly, hash
25b23e6e9ec6f9af92d23478e5fac2d4e97084bdedba1387399c05ebdc8596d3.
No renderer or existing assertion was changed. That failed historical guard is
not reward-delivery acceptance evidence; a separate controlled current-client
course will be recorded below.

The unchanged wilderness-ui.cjs passes with zero console errors. Actual input
walks the complete native-cache path (1,100 frames, 3,213 units). Eight distant
stops each run 600 normal frames and exercise encounter admission and dormancy;
mean nearby population is 18.625, including one empty stop. Cold Continue retains
all 129 saved identities/species/health/births, admits 20 further enemies, and
preserves the path. Returning to the saved fang_priest retains 239.4 health after
one page-readiness wait. The destination image was visually inspected. This
checks existing playable traversal/persistence, not full retained-area activation.
The log is wilderness-client.local.log beside the snapshot; report and images
are under its balance/reports directory.

A separate ignored current-client course also passes. It supplies a valid owed
gear item through the compiled World's native dropGearAt, verifies its physical
cue and two identical label draws, then uses native pickup to put that same item
in the real pack. Two renders leave the selected gameplay state unchanged.
Direct completion pays the native 70 XP (level 1 to 2, 25 XP left); the completion
latch and a subsequent campaign re-clear both prevent another payment. A native
106-XP grant crosses the next threshold: real progression rebuilding raises
maximum life from 158 to 162 and mana from 36 to 40, refills both, grants the
passive point and emits one physical level burst. Actual Save/Continue restores
the item identity, XP, points, ledger and claimed-objective set exactly, without
console errors or a crash.

This course uses development entry, supplied gear and direct completion/XP calls.
It tests the compiled World's shared methods with real progression services;
it does not establish earned gameplay completion, a retained area's missing
progression/quest authority, watcher scheduling or complete area persistence.
The ignored harness is native-rewards-client.local.cjs beside the snapshot;
its report and screenshots are native-rewards-phase27-client* under the
snapshot's balance/reports. Existing committed browser harnesses remain unchanged.

## Next integration work

Complete area-aware progression/companion and quest-payout authority, objective
watching and counted-fall routing, then the remaining combat/effect lifecycles.
Keep physical admission, scheduling, complete publication and persistence coherent
across neighboring areas. Only then activate full retained native areas and add
the expanded bounded/open layout pass: real routes around walls, barricades,
mountains and valleys, recognizable points of interest and larger objectives.
Native area identity remains useful internal ownership, not a return to border
teleports or a second player-facing world mode. Hierarchy and map zoom follow
that shared world, as recorded in native-area-coexistence.md.
