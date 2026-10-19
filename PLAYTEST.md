# Play the seamless world

Updated 2026-10-19. This is `arianna-arpg/arpg-game-world`.

**Double-click `Play World.cmd` in this folder.** The desktop title says **Hollow Wake - Seamless World** and includes the revision. The menu says **Seamless exploration · The Unbroken Wilds**. Choose **Begin**, then a class. You wake in Lastlight, which is embedded in the continuous countryside.

Use **WASD** to move, the mouse buttons and numbered skill bar to fight, **M** for the map, **I** for inventory and **Escape** for the menu. Walk toward the waking-house door to push it open. Leave through the western opening and follow the road to the camp. The other roads lead to more places; surface travel does not load a new zone. Use **Save & Exit**, then **Continue Run** to return to your saved ground.

The first launch after changes rebuilds the client; later launches reuse it. Keep the preparation window open. `Play World.cmd` selects the canonical integration checkout explicitly, even when started from the original root folder.

## Host the same world

**Double-click `Host World.cmd`.** It opens the local game page at `http://127.0.0.1:8791/`; choose **Enter the world**. A second browser profile can join that address. Keep the server console open; **Ctrl+C** saves and closes it. This is local hosting on this PC. `Host World.cmd --open` unlocks the host account for content inspection.

The host uses the continuous Unbroken Wilds surface too. Run Play once first if no client build exists yet.

## What you can test

| Component | Current state |
| --- | --- |
| Continuous exploration | Generated terrain, climates, roads, landmarks, camps and embedded Lastlight. A real walk from the inn to the western camp crossed three streaming pages without a zone load or character replacement. |
| Core ARPG | Existing movement, combat, skills, gear, progression and character systems run on that surface. This is an integrated playtest, not certification of every main-branch system. |
| Physical content | Country bounties, shrines, native place adapters and separate interiors have implementations and focused behavioral checks. |
| Saving | Normal Begin and disk-backed Continue enter the continuous runtime. The tested saved countryside position and world identity survive reopening. |
| Local shard | Serves the continuous surface; host startup/client delivery and actual wire-entry courses pass. Large-player capacity is unproven. |
| Retained campaign migration | Substantial controller/persistence work exists, but it still uses campaign-zone geography. It remains available explicitly with `?retained` for inspection; it is not the seamless playtest. |

## Still unfinished

Full integration of the retained campaign's quests/events and ownership into continuous geography remains open. The current surface uses the existing World adapter, not the completed area/worker architecture. Smooth 60 FPS is not established: the hidden software-rendered route showed frame spikes. The opening route is playable; that does not prove every generated place, distant region or multiplayer capacity target.

The next development priority is the experience on this continuous route: fix reproducible play failures and frame stalls, then integrate missing content into physical places. Additional source archives and probe counts are not delivery milestones.

## Files and verification

The integration source is `.claude/ownership.playable-foundation/` on `codex/seamless-world-foundation`. Solo saves are under its `saves/seamless-playtest/` and desktop profile under `saves/seamless-playtest-profile/`. The host saves under `saves/hosted-seamless-playtest/`. Earlier saves remain preserved in their existing folders.

`npm run probe` now runs eight focused current-behavior courses. `npm run build` then `npm run smoke:world` exercises the real entry buttons, inn exit, countryside walk, combat and disk Continue. Its report/screenshots live in `balance/reports/seamless-playthrough/` inside the integration checkout. The broad historical roster is available explicitly through `npm run probe:history`.

The [recovery record](docs/ai/project-recovery-20261019.md) explains the mistaken launch path, the probe census and the scope of this correction.
