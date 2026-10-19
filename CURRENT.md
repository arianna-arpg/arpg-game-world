# Hollow Wake: current direction

Owner's direction, updated 19 October 2026. This page is the current project entrypoint for `arianna-arpg/arpg-game-world`. The separate MMOARPG repository is outside this project. It supersedes older roadmaps where scope or priorities conflict; the [gameplay decisions](docs/ai/gameplay-decisions-20261019.md) retain the individual keep/revert choices.

## What we are building now

A coherent, content-rich, effectively infinitely generating **offline seamless world**. Exploration should reveal varied terrain, places, authored discoveries, generated activities and changing circumstances. Combat, travel and consequences continue across streaming boundaries. The world must remain playable, persistent and responsive as exploration expands.

Zone work supplies reusable content and a precedent for quality. It does **not** prescribe generation laws. Generation may select and combine sites, objectives, points of interest, bounded areas with their objectives, events, locations, quests, unbounded objectives and other possibilities. This is an open vocabulary, not a required sequence or a closed list. A location can exist without a task; an objective can extend beyond one location. The aim is coherent variety and uncertainty for the player.

The intended **world map → regions → zones → chunks** hierarchy organizes geography and navigation. It does not imply one event per tile, one activity per zone, or a reset at chunk edges. Spatially located events can affect places on the world map and change the player's circumstances, gameplay flow and wider landscape.

## References, not templates

These are the owner's intended inspirations, not claims that we must reproduce each game's systems:

| Reference | What it contributes to the vision |
| --- | --- |
| Minecraft | A continuous, expanding generated world that supports exploration. |
| RimWorld's world map | A spatial view of the world, with locations where events can occur. |
| Hytale / Cube World | Possibilities for generated objectives, dungeons, discoveries and some aspects of quests. These examples are expressly non-prescriptive. |
| Skyrim | Substantial authored content placed within the larger generated world as less-random discoveries. |
| RimWorld's event system | Events that alter the situation, pacing and landscape, rather than merely decorating a static world. |

These references do not by themselves authorize voxel building, a particular art style, mandatory quest forms, universal sealed areas or a specific event-director algorithm.

## Active and deferred work

**Active:** offline generation, authored and generated content, world events, seamless traversal, persistence, playability and frame performance. Combat and dialogue development continue alongside that work.

**Deferred:** new shard/MMORPG features, distributed hosting and scale-out architecture. Existing hosting code is retained as implementation/reference material; it is not the milestone that controls this phase. Do not dismantle working systems merely to demonstrate a change of priority.

Prepare sensibly for later multiplayer through stable identities, persistent state, clear simulation ownership and separation of simulation from presentation. Keep those boundaries useful to the offline game. This is not permission to start another speculative networking framework.

The user accepts substantial redesign or replacement of generation, events and content when warranted. Assess what to retain, adapt or replace from actual source and playable results. Neither sunk effort nor historical test volume makes an implementation mandatory. Preserve the user's saves and unfinished work during replacement.

## Where the branches stand

| Location | Role |
| --- | --- |
| `main` | Shared combat, character systems and content baseline; its current zone game remains playable. |
| `codex/seamless-world-foundation` | Canonical playable continuous-world integration; incorporates main through real, verified merges. |
| Other topic branches/worktrees | Work in progress or reference material. They are not competing delivery versions. |
| Archived `seamless-world` | Source to assess for reusable layout/placement work; its old cell-partition policy is not the current design. |
| Shard/performance roadmaps | Deferred reference unless a specific piece directly helps the current offline result. Their old handoff sequences are not current marching orders. |

[Automatic main → seamless integration](https://github.com/arianna-arpg/arpg-game-world/actions/workflows/sync-main.yml) checks new published main changes before incorporating them. Conflicts and failed checks stop publication. Main being included does not mean both branches have identical geography or that unfinished local edits have shipped. The [integration policy](docs/ai/branch-integration.md) and [gameplay decisions](docs/ai/gameplay-decisions-20261019.md) distinguish intentional differences from accidental drift. Check current refs and workflow results rather than maintaining static commit counts here.

## What is playable, and what remains unfinished

The continuous build has the account tutorial → Mu → physical vessel → world entry, exploration, combat and Save/Continue. The current campaign adapters reuse quest rules and actors in generic sites. They do not yet preserve each original quest zone's terrain layout, and they do not establish the full generation/event vision above.

In the existing Windows workspace, double-click **Play World.cmd**. It selects the canonical seamless checkout. In a checkout of that branch, `npm run play` launches it. See its [playtest guide](https://github.com/arianna-arpg/arpg-game-world/blob/codex/seamless-world-foundation/PLAYTEST.md). The README's ordinary browser/release links are the main game, not proof that the seamless vision is complete.

The next work is to assess and redesign generation/content composition, then deliver visibly different playable journeys with authored discoveries and consequential events. Judge progress by what can actually be encountered and played, supported by targeted verification. A terrain prototype, a growing recipe catalogue or a large probe count is insufficient evidence on its own.

## Working without losing the thread

- Start here for scope, [CLAUDE.md](CLAUDE.md) for repository commands/ownership, and the current gameplay decisions for approved behavior.
- Preserve the root checkout's unfinished adventure-region, locale, grammar and bounty work. It is material to assess, not automatically completed seamless functionality.
- Use isolated checkouts when another chat owns the working tree or index. Keep the playable branch available while replacements are developed.
- Label older plans as reference when they disagree with current direction. Do not delete unreviewed branches, saves, recovery snapshots or unique work merely to make the repository look smaller.
- Relevant existing checks and actual client play should serve the delivered behavior. Do not expand the historical probe framework as a substitute for implementation.
