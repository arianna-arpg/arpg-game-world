# Play the seamless world

Updated 2026-10-19. This is `arianna-arpg/arpg-game-world`.

**Double-click `Play World.cmd` in this folder.** The desktop title says **Hollow Wake - Seamless World** and includes the revision. The menu says **Seamless exploration · The Unbroken Wilds**.

- **Begin** appears only while the account still needs The Last Mile, using the same rule as `main`. Completing the tutorial takes you directly into Mu and records completion on the account. An interrupted tutorial remains due.
- **New Run** replaces Begin once the tutorial is complete. It enters Mu directly. Drift to an awake vessel, stand beside it, and choose Wake. Your new life begins in Lastlight, embedded in the continuous countryside. The old class-card grid is bypassed.
- **Continue Run** returns to your saved life at its saved position, as on `main`. Visiting Mu alone does not replace that saved life; choosing Wake starts the new one.

Use **WASD** to move, the mouse buttons and numbered skill bar to fight, **M** for the map, **I** for inventory and **Escape** for the menu. Walk toward the waking-house door to push it open. Visit Mireille at the inn for The Western Watch, then leave through the western opening and follow the road to Cinderwatch Camp. The other roads lead to more places; surface travel does not load a new zone. Use **Save & Exit**, then **Continue Run** to return to your saved ground.

## Campaign roads

Fresh worlds now include eighteen additional physical campaign locations, with the original quest gates, enemies, cargo and rewards. Talk to the giver and read the journal directions; accepted work marks its destination on the map.

These currently use generic site templates; they do not preserve each campaign zone's original terrain layout. The generation goal is a varied mix of optional sites, events, quests, objectives, locations and retained bounded areas—not one mandatory pattern for every place. That broader composition and the retained-layout option remain unfinished; see [the current generation direction](docs/ai/gameplay-decisions-20261019.md#retained-zones-inside-continuous-terrain).

| Work | Where to begin | Physical destination |
| --- | --- | --- |
| The Western Watch / Northern Watch | Mireille, level 1 / level 3 after the first contract | Western camp / northern Stoneward |
| Rising undead | Aldric, level 5 | Graveyard beyond the southern ruin |
| Brandt's hammer / later iron fang | Brandt, his Magic Wares unlock and level 9 readiness | Cold Cinder Forge beyond the eastern stones |
| Revenge and captive Oracle | Aldric; the tutorial faction selects your chain | That legion's old road (level 10), then command camp (level 14 boss) |
| A Place for the Unremembered | Rescued Oracle, level 8 | Unremembered Chapel south of the graveyard |
| Guarded depths | Aldric, after recovering the relic | Reliquary beyond the chapel |
| A later life's commander Memory | Oracle, after the account has rescued him | The same faction's command camp |

The seven faction roads occupy different directions; follow the journal's bearing. An early revenge lead is not a claim that a level-2 character is ready for its army. Defeating the specific commander frees the Oracle, who becomes available in Lastlight without reloading the surface. Brandt's real quest item drops at the forge and must be returned. Native reward choices and once-only payouts remain in use.

Existing saved worlds retain their pinned geography. To see the added campaign destinations, use **New Run → Mu → Wake** for a fresh life (a new account completes its tutorial first).

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
| Saving | Disk-backed Continue Run preserves position, world identity, native campaign deeds and carried quest items. The tutorial's completion persists on the account. New worlds derive unchanged road tiles from their saved world descriptor, while player terrain edits remain saved. |
| Local shard | Serves the continuous surface; host startup/client delivery and actual wire-entry courses pass. Large-player capacity is unproven. |
| Campaign integration | Eighteen new locations bind 26 original campaign contracts, alongside the two frontier contracts. Their givers, bosses, cargo, Oracle rescue and rewards operate on the continuous surface. The zone-based campaign remains available with `?retained` for inspection. |

## Still unfinished

The complete Odyssey progression, vocation chains and the Unmade's authored arena are still outside this integration. The Reliquary currently uses its chapel variant. Campaign sites reuse native scenery and the original enemies; they are not yet complete reproductions of every authored campaign setpiece. The current surface still uses the existing World adapter; worker-scale hosting is unfinished.

Performance changes move geographic validation into its worker, bound ordinary terrain work, direct path searches toward their destination, skip unnecessary dependency scans, and stop saving unchanged campaign roads. Smooth 60 FPS across all locations is not established. The acceptance route covers opening travel, combat and saving; it is not evidence of complete campaign balance or large-player capacity.

## Difference from main

The [gameplay decision register](docs/ai/gameplay-alignment-20261019.md) compares the current published main content with seamless, separating mechanics, presentation, content gaps and runtime refactoring. It replaces the earlier comparison against stale local main. The root checkout's unfinished generation, adventure-region and bounty-passage work remains separate and preserved.

| Area | `main` | This integration |
| --- | --- | --- |
| New account / new life | One tutorial, then Mu; later New Run goes directly to Mu | Same account gate and scene handoff; Wake selects the continuous world |
| Saved life | Continue Run restores the saved run | Same action, with a save reader that also restores continuous worlds |
| Surface | Connected campaign zones | Continuous terrain, embedded town, roads and physical campaign destinations |
| Campaign coverage | Existing zone campaign | Partial spatial integration: the listed quests work here; the omissions above still matter |
| Runtime | Existing World and zone systems | World plus the continuous adapter; a second retained-area path remains for inspection, not seamless travel |
| Combat and presentation | Shared skill/content baseline; 44 × 5 cast bars | Cast bars restored to 44 × 5. Other input, AI and presentation differences are individually listed for keep/revert decisions in the register. Live-aim support is opt-in and no authored skill currently enables it. |

Solar Brand targeting, targeted echoes, Maddening Miasma's standing-ground ledger, Mu Reliquary suppression, orb recovery pacing, the harmless-critter minion fix and Charge's wake are already shared main content. The previous guide incorrectly described orb pacing as seamless-only.

Main is the shared-content authority. The approved [integration workflow](docs/ai/branch-integration.md) merges future main changes into seamless, checks the integrated game and publishes only after success. Conflicts or failed checks stop publication. Historical verification archives remain outside normal release gates; the current decision register and playable route are the working references.

## Files and verification

The integration source is `.claude/ownership.playable-foundation/` on `codex/seamless-world-foundation`. Solo saves are under its `saves/seamless-playtest/` and desktop profile under `saves/seamless-playtest-profile/`. The host saves under `saves/hosted-seamless-playtest/`. Earlier saves remain preserved in their existing folders.

`npm run probe` runs eight focused current-behavior courses. `npm run build` then `npm run smoke:world` exercises the real tutorial's direct Mu handoff, vessel approach, inn exit, countryside walk, combat, completed-account New Run and disk Continue Run. Its report/screenshots live in `balance/reports/seamless-playthrough/` inside the integration checkout. `WORLD_GPU=1` uses hardware rendering for a representative local timing run; the default software renderer is for repeatable CI. The broad historical roster remains explicitly available through `npm run probe:history`.

The [recovery record](docs/ai/project-recovery-20261019.md) explains the mistaken launch path, the probe census and the scope of this correction.
