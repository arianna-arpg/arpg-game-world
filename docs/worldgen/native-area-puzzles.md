# Retained native puzzle lifecycle

Continuation: [native-area-rewards.md](native-area-rewards.md) supplies the real
area loot sink and native objective completion/XP owner. Its two-area integration
proof replaces recording reward providers with actual local physical drops.
The evidence and remaining-effect descriptions below record the earlier checkpoint.

NativeScenePuzzles follows the preparation isolation checkpoint c35ee8ab.
It shares the original five World puzzle mutation methods with a concrete
NativeAreaScenePuzzles owner: updatePuzzles, puzzleStruck, drainPuzzleKnocks,
puzzleTuned and completePuzzle. World delegates through a cached live host;
its existing update/input call sites and order remain unchanged.

## Local behavior and authority

The controller reads the retained environment's actual puzzle runs and knock
queue, its scene's census and zone, its geometry's flashes and clamp, and live
campaign time. A resonance caster is owned by each controller. Assembly now
binds environment completion directly to that controller before native birth.
The native boot enrolls a run before invoking its kind, so even a completion
inside boot has its proper local owner.

Native puzzle IDs repeat between areas (for example ember_ring#0). Area entry
methods therefore require the actual enrolled node or run identity. A foreign
node cannot queue a blow, tune a matching-ID puzzle or complete its neighbor.
The controller also validates the entire pending queue before draining it;
a foreign entry cannot partially consume otherwise valid queued work.
Non-enrolled ambient bodies and hearts keep their native no-op behavior.

The native core bodies preserve the original knock, spill, hum and who rules,
queue-before-tick ordering, tuning, done latch, reward arguments and random
consumption. Completion still latches before reward delivery; native partial
failure is not silently rolled back or paid twice. World keeps its original
single-scene entry behavior. The stricter identity guard belongs to the retained
area boundary, where IDs alone cease to identify an owner.

Puzzle completion is not the separate area objective watcher. The ordinary
update order remains objective update, puzzle update, then occurrences after
the scaled-time gate. This extraction neither advances puzzles on the raw clock
nor prematurely pays the objective chest/experience/unseal lane.

## Effects and remaining runtime work

The three deferred effects are explicit: dropGemAt, mintLootResult and
executeSkill. Providers remain live, including inherited methods and original
receivers. Optional rewardZone, rewardLevel and rewardSource semantics are
preserved; the controller does not invent a replacement reward context.
The original spoils read uses the owning scene's definition.

Those effects need actual area loot/combat owners. Binding the active World's
methods would still read its geometry, drops, census and pending combat state.
The test assembly fixture continues to throw for unavailable effects. Recording
providers in verification are test instruments, not runtime adapters.
The controller's caster must eventually share the appropriate retained hazard
lifecycle with other area hazards; full scheduling, combat dispatch, whole-area
publication, persistence and client activation are not supplied here.

This closes another ongoing-ownership gap in the integration sequence recorded
in native-area-coexistence.md. Complete local services and persistent whole areas
still precede the expanded bounded/open layout pass and genuine map hierarchy.

## Independent evidence

The archive records the original five methods, exact World delegate/host
expectations, original spoils read and whole-class receipt from c35ee8ab.
The normalization fixture restores only explicitly asserted changes for older
source guards. Existing whole-World hashes are not repinned.

The independent critics checked the ownership boundary and original-source
fidelity. A review caught the new module initially preceding nativeSceneBootstrap;
the import now follows that root, preserving the installed registration order.
The independent executable proof checks the archive against Git c35ee8ab and
compares archived World, current World, shared core and retained owner across
53 courses. It covers all nine registered kinds (15 authored presets with two
seeds, plus four shrine rebindings), exact state/status/effect arguments, random
consumption, relative item allocation, routing gates, reentry, reward overrides,
sealing, live receiver changes, foreign identities and seven partial failures.
Receipt: 2b0ec9cd2facef900bf7048c50a426ef4119551d45e20d001e02f191f5f72457.
Its compact geometry and effect recordings are explicitly test boundaries.

The complete source-session probe additionally births two genuine areas with
explicit native ember puzzle rows. Their IDs match, but their runs and nodes
remain distinct. One solves through its assigned completion callback while the
other retains its progress, hums, visuals and unpaid rewards. This uses real
layout/birth/kind behavior and recording reward providers; it establishes local
controller integration, not completed production effect services.

Verification:

- All four type-check targets pass (game, launcher, simulation and shard).
- Installed-source receipt remains c078829c532be168f89fe7ca7a048d9ed868eb9fee05c2529ee9ee020c84c5af.
- Complete source preparation: 14 courses, unchanged combined-baseline receipt
  ebbcc706a6302a68e595f3e16a7c25ce8f9f482240fa712dec32d6527e067534.
- Complete birth: 52 courses, 3,781 bodies and six partial errors, unchanged
  receipt 4e69d53160861b422b0a85b4f6ead4c5038760cd7019ac09b3e275f5632724f3.
- puzzles, attunement, puzzlecalm, worldmass_puzzlerewards and nativeareaisolation
  pass, including actual native reward and attunement behavior.
- Generation: 869 cases across three seeds (2,607), no failures and four known
  spacing warnings. Simulation smoke: five scenarios across five seeds pass.
- Isolated seamless production build passes. Its source snapshot includes the
  concurrent Mu integration checkpoint 5f709be9; no Mu code was changed here.

Previously documented sky-guard, three worldmass and shard performance failures
remain outside this change. They were neither repinned nor rerun here; this is
not an all-suite or release-ready claim. See docs/engine/shard-runtime-foundation.md.

The unchanged native-courts-ui.cjs browser course fails at the first natural
accord arrival with "Natural court inner changed", before any puzzle input.
The exact unchanged 5f709be9 baseline, separately built with a fresh profile,
reproduces the same failure. Geometry discovery succeeds, but expected live
court enrollment does not. The specific cause is unconfirmed; readiness and
population admission are investigation leads, not established diagnoses.
No harness assertion or production admission rule was weakened. This course
therefore supplies no browser-level puzzle/reward/Continue acceptance claim.
The executable native puzzle and real-world reward probes above do pass.

The unchanged wilderness-ui.cjs course passes in the same isolated build with
an isolated save profile and zero console errors. Actual movement follows the
complete native-cache path (1100 frames, 3213 units), then eight
600-frame distant-area stops exercise normal update, encounter admission and
dormancy. Mean nearby population is 23.375, including one empty stop. Cold
Continue preserves all 163 original saved identities, species, health and births;
21 additional enemies are admitted afterward. The saved path survives. Returning
to a saved fang_priest preserves 239.4 health after 1 native-page readiness wait.
The destination frame was visually inspected. This validates existing client
traversal/persistence behavior, not new full-area runtime activation.

Local artifacts: .claude/native-puzzles-phase26.local.work/snapshot (isolated
staged source tree 296a7b882e7f0f315553e36fef062d4ee9900c43), build.local.log,
client.local.log and wilderness-client.local.log in its parent; report JSON and
images under the snapshot's balance/reports. Code, fixtures and probes match the
staged snapshot; final documentation was added afterward. The baseline court
reproduction is under .claude/native-puzzles-phase26-baseline.local.work.

## Next concrete ownership slice

Start with a real area loot sink: dropEssenceAt, dropAbilityEssenceAt,
dropVestigeAt, dropGearAt, lootDropCue, spoilClamp and ownSpoils, retaining local
drops/flashes/spoilStory and actual geometry with live campaign policy. Then
complete dropGemAt/mintGemAt/dropPinnedGem/dropMemoryUnit, noteGemDrop,
noteContainerFind and mintLootResult. Reuse the existing settlement owner
rollSkillGem, rollSupportDropGated and carriedGemIds; preserve native random
consumption and explicit reward context.

Objective completion follows those concrete effects: completeObjective,
objectivePlaces and objectiveFallAt need local state and correctly scoped quest
credit. World onQuestZoneFieldCleared otherwise falls back to World objective
locations; grantXp also emits World flashes and can resynchronize its mercenaries.
Neither is a safe borrowed neighboring-area service. The full objective watcher
comes after those dependencies. Puzzle executeSkill remains a separate combat
slice over actual pending attacks, projectiles, zones and resolveHit.
