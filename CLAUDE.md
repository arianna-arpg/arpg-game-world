Bone Golem native adapters preserve supported healing, reconstruction, command binding and cleanup through nativeSceneRestoration, nativeSceneProgression and nativeSceneCastingPreparation. The current behavior gate includes bonegolem.

Bone Golem frame abilities, the four-point routes, support routing and lifecycle checks are documented in [bone-golem](docs/design/bone-golem.md). Verify bonegolem, nestednecromancer, supportfabric, all types and sim smoke; build before the hidden bone-golem-ui course.
Skeleton Warrior infantry, spectral heirs, Spellsword choices and the shared Mage/Warrior node picker are documented in [skeleton-warrior](docs/design/skeleton-warrior.md). Verify skeletonwarrior, skeletonmage, skeletonarcher, necromancercourts, nestednecromancer, supportfabric, all types and sim smoke; build before the hidden skeleton-mage-ui and skeleton-warrior-ui courses.

**Current scope:** [CURRENT.md](CURRENT.md) is the project direction and active/deferred work entrypoint. Deliver the offline seamless generation/content/event vision; new shard/MMORPG work is deferred. Prepare useful future boundaries without letting hosting dictate this phase. Existing zone content and the owner's game references are examples and reusable material, not generation laws. This priority supersedes conflicting older roadmaps and hosting handoffs.

Generation must select and combine varied possibilities: sites, objectives, points of interest, events, locations, quests, unbounded objectives, and retained bounded zones with their authored objectives are examples, not mandatory templates or a closed list. The hierarchy **world map → regions → zones → chunks** organizes geography; it does not prescribe each place's gameplay. Read [the current generation decisions](docs/ai/gameplay-decisions-20261019.md#retained-zones-inside-continuous-terrain) before world/content work. Game-camera zoom follows main's fixed scale; map navigation is separate. Live cast aiming is an unused authoring opt-in, not a change to existing skills.

# Hollow Wake: current working guide

Main is the shared-content baseline. Incorporate its changes into seamless with real merges, not copied commits. Follow [the branch integration policy](docs/ai/branch-integration.md); every published main change is verified and merged by the sync-main workflow. Preserve unfinished work in other checkouts.

The [current gameplay decisions](docs/ai/gameplay-decisions-20261019.md) are authoritative for approved features, reversions, defaults and pending choices. They supersede the earlier main/seamless comparison. This is `arianna-arpg/arpg-game-world`; the separate MMOARPG project is outside this work. Verify the behavior being changed with the relevant existing checks; historical probe counts and branch paths in older notes are not current delivery requirements. Main keeps its zone loop while seamless owns continuous geography and hosting.

The playable Mu loading-screen foundation is documented in docs/ui/loading-screen.md.
LoadingScreen provides token-owned status, cancellation, retry and input isolation;
SpiritRun is a rewardless pastime with soul-flames, branching rune gates and currents.
Main's withLoadingScreen wraps its existing class-entry and Continue flows without
importing seamless world or save machinery. The seamless branch additionally owns
native-page readiness. Reuse the lease for future disruptive preparations; never
delay readiness or grant gameplay rewards. Verify spiritrun, all types, boot smoke
and balance/loading-screen-ui.cjs after an isolated build.

This repository is `arianna-arpg/arpg-game-world`, the original TypeScript/Canvas/Electron ARPG. This is the current working entrypoint: shared content starts on main; continuous-world integration belongs on `codex/seamless-world-foundation`. Use an isolated topic checkout when another session owns the affected files. The user's 2026-10-19 direction is to deliver a playable continuous world and stop expanding historical probe scaffolding. This guide supersedes the accumulated handoff instructions preserved in [the reference archive](docs/ai/reference-before-playable-recovery.md). Historical documents and project-memory session notes describe their recorded revisions; their branch paths, frozen-source mandates and handoff checklists are not current instructions. Read [branch integration](docs/ai/branch-integration.md) for delivery policy and the [cleanup audit](docs/ai/context-runtime-cleanup-20261019.md) for deferred migration work.

Tutorial scenes cannot feed account nemeses. See `docs/engine/tutorial-isolation.md`;
verify tutorialisolation, scenes, mu, Odyssey checks and all types when changing
scene departure or nemesis formation/manifestation.

Skeleton Mage's configurable rites, reconstruction, spell echoes and Conclave
schools are documented in [the Mage design](docs/design/skeleton-mage.md).
Saved school choices use nativeProgressionMeta; crew support and field cleanup
retain the native progression adapter. Verify skeletonmage, skeletonarcher,
Firebolt, current gameplay courses, all types and hidden Mage/Archer UI courses.

Skeleton Archer's independent wound timers, firing squads, mortars and elemental
mage arts follow main's contracts in `docs/design/skeleton-archer.md`. The
seamless adapter keeps cleanse timer updates in `nativeSceneRestoration.ts`
and retires held formations before its delegated tree-field cleanup. Verify
skeletonarcher, the current gameplay courses, all types and the client walkthrough.

Trap/mine mechanics and reusable deviceVisuals are documented in
`docs/engine/ground-devices.md`: walkable contact devices, configurable arming,
resolved crossings and autonomous mine meta commands. Verify presencevisuals,
selfvisuals, trapworks, tacticalai, controlstartertrees, movementvisuals,
cosmetics, all types and sim smoke; then the hidden device-visuals-ui and
construct-bodies-ui harnesses sequentially after an isolated build.

The persistent construct body silhouettes are composed in `data/constructLooks.ts`
and `data/constructGlyphs.ts`, selected through each delivery's ordinary `look`.
See `docs/render/constructs.md`; verify presencevisuals, cosmetics, all types,
sim smoke and hidden `balance/construct-bodies-ui.cjs` after an isolated build.

Storm, summon and construct identities use `data/skillPresenceVisuals.ts`
and `render/vis/skillPresenceVoice.ts`: 139 explicit source profiles.
Births, completed actions, real aura/construct pulses and actual retirement
own their cues. `ActorW.presenceBadge` copies source identity; ground-qualified
`FlashW.onGround` clips impacts to the warning's terrain and floor gates.
See `docs/design/presence-skill-visuals.md`. Verify presencevisuals, skillflights,
selfvisuals, effectvoice, cosmetics, payloadcues, companioncues,
companioninheritance, summonfill, clutch, cistern, scaldkit, supportfabric,
all types and sim smoke; after build, run hidden `balance/presence-visuals-ui.cjs`.

## The delivery target

Geography and physical places replace the connected-zone surface. Walking, combat, pursuit and consequences continue across streaming boundaries. Offline play is the core; a hosted shard serves the same world. Separate interiors can remain separate. Retain the existing combat, character and content systems wherever possible.

The current playable route is `src/main.ts` -> `World.startWorldMass` -> `WorldMassRuntime`. The default build selects it; `?retained` explicitly selects the retained campaign for inspection. The retained-area ownership migration is substantial but still uses the campaign graph. Do not present its zone travel as seamless exploration or silently route the playable build back into it. The continuous runtime is still an interim adapter; full retained-content integration and worker-scale hosting are unfinished.

Preserve main's entry loop: Begin only while the account's tutorial is due; the tutorial hands directly into Mu and stamps the existing completion ledger. Afterwards New Run goes to Mu, whose physical vessel selection starts the seamless world. Continue Run resumes the saved life. Do not add a permanent Begin/replay lane or return to the menu between tutorial completion and Mu.

## Play and verify

NPC conversation and services now use a separate Folio group from Inventory's
Skills, Passives, Reliquary and Character ribbons. Brandt's Shop opens his existing
vendor UI and becomes the return default; native quest offers keep their engine
acceptance path. See `docs/ui/service-workspace.md`. Verify the dialogue/services
and inventory-pages client courses after an isolated build; small windows may
overlap but never merge player and NPC books or resize Inventory on arrival.

- `Play World.cmd` / `npm run play`: build as needed and open the seamless desktop playtest.
- `Host World.cmd` / `npm run host`: serve the continuous world locally, with separate host saves.
- `npm run dev`: browser development, default continuous world.
- `npm run check`: all four TypeScript projects, including the balance tools.
- `npm run probe`: eight current behavioral courses: terrain, combat continuity, progression, bounties, interiors, saves and hosted entry.
- `npm run build` then `npm run smoke:world`: real Begin tutorial directly into Mu, physical vessel selection, walking/combat across pages, completed-account New Run directly into Mu and disk Continue Run in an isolated client. `WORLD_GPU=1` enables hardware rendering for local performance measurement. Screenshots/report: `balance/reports/seamless-playthrough/`.
- `npm run smoke:host`: start the continuous host and check its served client and status.
- `npm run sim -- run --suite smoke`: shared combat simulation; required for data changes.
- `npm run genqa`: generation checks; required for generation changes.
- `npm run smoke` / `npm run smoke:launcher`: stock desktop/launcher checks when those surfaces change.
- `node --test scripts/test-world-checkout.mjs`: shared Play/Host checkout selection, including wrong-branch and incomplete-checkout refusals.
- `npm run review:context`: change summary and suggested relevant checks.

Tests must exercise current behavior and fail when that behavior is broken. Add a regression for a concrete bug when existing coverage is insufficient. Do not copy predecessor runtime source into new fixtures, add archives to preserve stale source-string assertions, or treat probe counts as delivered gameplay. Keep fixtures small and use ordinary APIs. A visual acceptance test must enter through the player's buttons; a debug-start bypass cannot establish launch acceptance.

`npm run probe -- <name>` still runs a specific existing rig. Default and named runs validate the selected files; `npm run probe:history` (optionally `-- --slow`) validates the entire old roster and its source receipts. `--all` and `--slow` also request historical sweeps. `.github/workflows/historical-audit.yml` is a manually dispatched forensic audit; historical source matches are not a release gate. The old source expectations may need explicit retirement after legitimate refactors; do not manufacture predecessor adapters to make them appear current. The normal CI gates the current behavior courses and actual client playthrough.

Coordinated releases: `docs/engine/coordinated-releases.md` documents the single
Pages catalog/deployment for browser and desktop games. The release planner pins
fully verified source; one build supplies both clients and their visible revision.
`scripts/browser-previews.json` configures isolated branches beside `/play/`.
Verify the coordinated-release, release-policy and browser-preview tests; the
publisher also boots both clients before upload.

## Project map

- `src/main.ts`: application entry, input/frame dispatch, Continue and network connection.
- `src/engine/`: shared combat, actors, inventory, structures and World adapter.
- `src/data/`, `src/quests/`, `src/packages/`: authored content and progression.
- `src/worldmass/`: continuous geography, streaming, physical places, map, native content adapters and checkpoints. `preset.ts` supplies the current world descriptor; `runtime.ts` owns the continuous run.
- `src/worldmass/campaign.ts`: physical destinations for the undead, Brandt, Reliquary and faction revenge/Oracle chains. Original quest definitions still own gates and rewards. New locations require a fresh world; saved geography stays pinned.
- `src/worldmass/nativeClientRuntime.ts` and `nativeClientStart.ts`: retained campaign inspection/migration; not the continuous surface's player entry.
- `src/meta/resumeWorld.ts`: continuous/ordinary save restoration. `nativeClientContinue.ts`: recorded retained-campaign restoration. Select by save envelope; never silently convert one map into another.
- `src/net/`, `server/shardHost.ts`: continuous hosted world and transport. `server/nativeShardHost.ts`: retained campaign host.
- `src/ui/`, `src/render/`: player UI and Canvas renderer.
- `launcher/`, `scripts/play-world.cjs`, `scripts/host-world.cjs`: desktop and local hosting. Both wrappers use `scripts/world-checkout.cjs` to select and validate the canonical checkout; their save/profile ownership remains separate.
- `balance/`: simulation and verification tools; reports are generated, not source.
- `docs/design/convergence-20261014.md`: agreed end state. `docs/design/seamless-world-foundation.md`: detailed implementation history and remaining cutover work.
- `PLAYTEST.md`: concise player entry and current limits. Update it when the actual playable path changes.
- `docs/ai/gameplay-decisions-20261019.md`: current approved, reverted, pending and seamless-only behavior decisions. The older alignment comparison and file inventory are historical snapshots, not current differences or an approved backlog.

## Development rules

Use the existing data-driven systems; keep one gameplay implementation where possible. Preserve seeded generation, saved world identity, once-only rewards, partial effects and account ownership. Validate at real boundaries without building layers of source provenance machinery around every function.

Convey mechanics and danger through visible behavior, animation, effects and sound. Do not replace readable gameplay with explanatory combat captions or prose tutorials. Consult the relevant system's contract under `docs/` when changing it, rather than running every historical system course for unrelated edits.

Accounts/runs are prototype data. For incompatible changes use the central `src/meta/saveCompatibility.ts` policy and a clear player-facing reason. Never delete someone's saves without authorization. Playtest profiles remain separate from existing saves.

Preserve the PolyForm Noncommercial license verbatim. Do not add third-party runtime code/assets or runtime dependencies without the author's authorization; development tooling under permissive licenses is allowed. Keep generated assets attributable.

`README.md` is the short durable product overview. Current commands, system maps and status belong here and in `PLAYTEST.md`, not in an ever-growing README inventory.

## Changes and commits

Inspect the branch and dirty files before editing. The user's existing root-checkout changes must remain intact. `.claude/ownership.playable-foundation` is the canonical playable checkout; isolated cleanup or content checkouts must not redirect the player's launcher or overwrite concurrent work there. Do not merge unrelated projects.

Run `npm run check` and the checks relevant to the actual change before committing. Use a clear imperative commit message; push only when requested. Never commit `node_modules/`, `dist/`, `saves/`, `release/`, generated reports or machine-local settings.

Declare your owned files/hunks in an ignored `.claude/ownership.*.txt` file. Stage only those changes and run `node scripts/ownership-gate.mjs --allow <declaration>` before every commit. No `git add .` or `git commit -a` in a shared checkout. A failed ownership check requires fixing the staging, not bypassing the gate. Cross-model reviews, when requested, follow `docs/ai/CROSS_MODEL_REVIEW.md`.
