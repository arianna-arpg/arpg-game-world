# World playtest recovery, 2026-10-19

## Finding

The owner expected visible progress on generation, seamless play and shards. The project had accumulated separate source lines and detailed migration proofs without a reliable local entry point or a short, current completion ledger. The user-facing failure was real even though substantial gameplay and migration code exists.

This recovery uses the existing `codex/seamless-world-foundation` branch at `5bf91b86`, not a new development branch. Its previously recorded `C:/Users/John/.codex/worktrees/seamless-world/ARPG Game - World` directory was absent. The branch and its commits remained available locally and at the recorded remote-tracking tip. It was restored into the ignored `.claude/ownership.playable-foundation` directory inside the original checkout.

## Repository map

| Source | Evidence and disposition |
| --- | --- |
| Original checkout, `main` at `118b510f` | Existing modified and untracked generation/adventure work was present before recovery. It is preserved and is not claimed integrated. The root playtest shortcuts point at the recovered candidate. |
| `codex/seamless-world-foundation`, `5bf91b86` | Canonical original-game integration. Both recorded `origin/main` at `a2fa4291` and `shard-world` at `ee680532` are ancestors. The earlier integration merge is `dd1e95a5`. No new shard merge is needed for those tips. |
| `shard-world` / `perf-lane` | Their inspected tip is already contained in the canonical candidate. Their old checkout launchers are historical alternatives, not the current playtest entry. Existing worktrees and evidence remain preserved. |
| `seamless-world`, `75333fd2` | Old August terrain experiment. Its name makes it easy to mistake for the newer integration. It is not the canonical candidate. |
| `D:/Games/MMOARPG`, `main` at `ae3e66a7` | Separate C#/Godot/browser MMO. Its existing `PLAYTEST.md` records combat integration and deferred population work; its `Play.cmd` is a separate launch path. No MMO source or rollout policy was changed here. |

These are inspected local references, not a fresh remote-branch inventory. No remote branch was deleted or moved. Preserved work is not represented as newly merged. Cleanup in this pass establishes one entry point and an explicit map; it does not indiscriminately remove old working directories or their ignored evidence.

## Concrete launch defect and repair

The integration's normal desktop launcher resolves `repo.branch`, whose committed default is `main`, to its local checkout. Starting that launcher from an experimental checkout can therefore redirect to main. This is implemented by `configureMainCheckout` in `launcher/main.cjs`; it is not evidence that the experimental code was being played.

`Play World.cmd` and `scripts/play-world.cjs` explicitly select the canonical branch, isolate the desktop profile and disk saves, disable update checks for this local playtest, show the revision in the window title and reuse the existing launcher's build freshness and game boot. They refuse a missing or unexpected checkout. `Host World.cmd` and `scripts/host-world.cjs` start the existing retained host locally, serve the built client and open the browser only after the listener is ready. Ctrl+C uses the host's existing save/shutdown path.

The source runtime was not replaced, merged again or rebalanced. Existing unfinished root changes were left intact. These shortcuts do not claim the final seamless terrain architecture is complete.

## Verification on the restored source

- `npm run check`: all four TypeScript configurations passed.
- Production Vite build: passed, with the existing large-bundle warning. The playable build is unscoped so disk saves remain enabled.
- Actual direct desktop entry: `node node_modules/electron/cli.js scripts/play-world.cjs --smoke-test=game` passed and printed the restored checkout's dist path, `__game=object`, start menu present and the isolated save endpoint response.
- `balance/native-browser-entry-ui.cjs`: passed. Real Begin/prologue, Mu approach and Wake, keyboard and pilot input, single campaign clock, field travel, exact reload/Continue, terminal menu cleanup and a second local keyboard player. Report contains no renderer errors and six captures.
- `npm run probe -- nativeclientcontinue --jobs 1`: 6/6 passed, including cold disk restoration, mercenaries, throngs, cancellation and unchanged source-proof assertions.
- `npm run genqa`: 869 cases times 3 seeds, zero failures and five warnings (four terrain spacing warnings and one slow metropolis case).
- `balance/native-shard-cli.cjs`: passed actual retained CLI startup and HTTP status with no faults.
- `balance/probe_nativeshardhost.ts`: passed two real socket clients, shared nearby state, party joining, per-area input/actions, independent travel and return, remote reconnection and one campaign clock; zero host or transport faults.
- `node scripts/host-world.cjs --check`: passed the actual local HTTP status and served client, then closed the ephemeral host. This uses Node HTTP because the simulation replaces global fetch with its headless browser shim.

The first hidden Electron attempt failed to start its graphics process in the restricted shell; the same test passed outside that restriction. A direct invocation of the GUI executable also produced broken-console-pipe logging, so the delivered command uses Electron's Node console wrapper instead.

The **stock launcher-page smoke with the experimental branch override failed** its Main-default picker/fallback expectations. The new player route bypasses that page; its actual direct boot passes. That stock test is not reported green, and the branch-picker UI remains separate repair work. The full historical probe roster, performance soak, Firefox responsiveness, broad content parity and real-time combat feel were not re-certified in this recovery.

## Honest remaining scope

The canonical cutover checklist still marks geographic area identity, private instances, native export/adopt, continuous surface placement, generated entrances, threaded hosting/recovery, broad content acceptance and sustained performance open. The retained campaign preserves area state but still relies on native zone identities. The giant-zone Wilds prototype is a different transitional path. Neither is the finished geographic replacement.

The next engineering milestone is a visible continuous route tested offline and hosted, with pursuit, projectiles, rewards, ownership and save/reload preserved. Implementation reports must name the reachable player action and its evidence, and keep engine support, player access and accepted performance separate. Claude's temporary absence does not block fixes within the owner's authorized scope; deferred MMO population work stays in that separate project's recorded queue.
