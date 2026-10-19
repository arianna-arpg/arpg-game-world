# Playtest the original Hollow Wake world

Updated 2026-10-19. This is the TypeScript original and its world/shard migration. The newer C#/Godot/browser MMO in `D:\Games\MMOARPG` is a separate game build.

## Start here

**Double-click `Play World.cmd` in this folder.** It opens the current world integration in a desktop window. The title includes **World Playtest** and the source revision. It explicitly selects `codex/seamless-world-foundation`; it does not open the old main build or download a different branch.

Choose **Begin**. A fresh account starts with the prologue; the normal Mu/vessel flow follows. Use the game's controls shown on the skill bar and in Options. Walk out of Lastlight, fight, collect rewards, try services and companions, then use the game's **Save & Exit** and **Continue**. This is a development playtest of migrated gameplay. It still has zone-based travel and is not the completed continuous-world replacement.

The first start after source changes rebuilds the game and can take several minutes. Later starts reuse that build. Keep the preparation window open. The normal `Launch Game.bat` and `Play Game.bat` in the original checkout still run the original game.

## Test the local shard

**Double-click `Host World.cmd`.** It starts the retained-area server on this PC and opens its game page at `http://127.0.0.1:8791/`. Keep that console open. Press **Ctrl+C** there to save and stop. If the browser does not open, enter that address manually. A second browser profile can join the same address to test a second player.

This hosts the migrated retained campaign, not the older giant-zone Wilds adapter. It listens only on this PC. It is not an internet deployment or a demonstrated MMO-capacity server. `Host World.cmd --open` optionally unlocks the host account for system inspection; normal progression is the default.

## What exists today

| Area | Current position |
| --- | --- |
| Original combat and content | A substantial playable ARPG exists. The integration carries the recorded main baseline and many retained-runtime adaptations; complete content parity is not certified. |
| Local migrated gameplay | Character entry, combat owners, area travel, companions, objectives, rewards and saved continuation have implementations. Entry, movement, travel and Continue were exercised in the real client during recovery. |
| Generation | Terrain, biome/landmark generation, towns and native place adapters exist. Generation QA passes. The final geographic placement and continuous surface cutover remain open. |
| Hosted play | A dedicated retained host, real socket clients, targeted area state, parties, independent travel and reconnection exist. Two-client host tests pass. |
| Seamless replacement | Unfinished. Both the old giant-zone terrain prototype and the retained campaign's zone identities are transitional. Walking/fighting continuously through the final geographic world is still a delivery gate. |
| MMO scale | Unfinished. Private instance namespaces, area export/adoption across workers, worker barriers/recovery and sustained capacity acceptance remain open. |
| New MMO repository | Separately consolidated at `D:\Games\MMOARPG`; its `Play.cmd` runs that project. Its content is not silently part of this build. |

## Saves and source

The restored integration checkout is `.claude/ownership.playable-foundation/`. Solo files are under its `saves/world-playtest/`; its desktop profile is `saves/world-playtest-profile/`. Hosted world files are under `saves/hosted-world-playtest/`, and the hosted browser keeps its character/account mirror in that browser profile. Existing original-game and MMO saves are untouched.

The two playtest scripts also work when run directly from the canonical integration checkout. They refuse an unexpected branch instead of silently opening another build. The local checkout configuration is ignored by Git.

## Next delivery

Keep one integration candidate and fix reproducible playtest failures there. Then deliver one visible continuous route, preserving pursuit, attacks, rewards and saved state across the boundary. Extend the migration only after that route is playable offline and hosted. Do not describe architecture scaffolding, a merged branch or a source-proof test as completion of that route.

The [recovery record](docs/ai/project-recovery-20261019.md) gives the branch evidence, verification results and remaining limits. The longer cutover checklist is `docs/design/seamless-world-foundation.md` inside the integration checkout.
