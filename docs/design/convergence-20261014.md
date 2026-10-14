# Convergence (2026-10-14): one world, one branch, two threads

Her word tonight: converge, work in tandem, no opposing plans. This page is
the shared plan both sessions read: the end state in one paragraph, what each
lane is building toward it, the branch plan, and the decisions still hers.
Codex's statement of the end state (her question of 2026-10-14) is adopted
here verbatim in substance; the shard lane's charter
(`docs/design/shard-world.md`) and the performance lane's charter
(`docs/design/performance-lane.md`) now read under it.

## 1. The end state

Main's zone-based spatial layout is replaced by a continuous world. Geography
and physical places determine the world, not the connected-zone graph; travel,
combat and consequences run continuously across internal streaming
boundaries; main's quests, factions, encounters, progression and saves operate
in that spatial world; towns, ruins, regions and deliberately separate
interiors keep their identities and authored content without forcing the old
tiled layout or resetting the simulation at bookkeeping boundaries. "Parity
with main" means preserving main's gameplay and content, never its spatial
architecture. Two layers exist today and both are transitional:

- the terrain prototype's single oversized zone `worldmass_expedition`, "The
  Unbroken Wilds", `boundless: true`, `special: true`
  (`src/worldmass/runtime.ts:440`): the giant-zone adapter;
- the retained-area foundation (persistent actors, objectives, simulation and
  ownership per area), which still depends on campaign zone definitions and
  maps (`src/worldmass/nativeClientRuntime.ts:64`).

The recorded sequence (`docs/worldgen/generated-quest-side-zones.md:13`) puts
native gameplay, persistence and multiplayer ownership before the final
continuous-terrain integration. The giant zone and the old zone machinery are
retired once their replacements stand. Nothing has changed the goal; the risk
is the intermediate architecture becoming permanent through parity work, and
this page exists so that it does not.

Her vision beside it: an offline game that is the core and never needs a
server (THE SOLO INVARIANT holds today by construction), and an online shard
setting beside it, with many shards in a distant future.

## 2. How the shard lane is affected (the performance lane's reading)

Everything the shard hosts was built on the giant-zone adapter: the keeper's
World holds the whole surface (THE WILDS LAW), pockets wake as sim units, the
neighborhood groups are the runtime's foci, and the M6 plan's ISLANDS were
drawn as surface Worlds split where no player can see across. Under the end
state the shard's unit of hosting becomes the retained area: an area with its
own persistent actors, objectives, simulation and ownership IS an island.
The two plans converge if:

- the retained-area contract (export, adopt, the identity-preserving native
  record, the claims and patches that cross) is the contract the shard's W2
  THE GLASS UNIT and W3 THE THREAD HOST are written against, not THE PIN over
  one giant World;
- the one clock (card 35, lockstep) and the travelling body (card 37, exact
  capture) are stated on areas, so a hand-off between areas is the same act
  offline (a walk) and hosted (a unit crossing);
- the performance lane's measured wins stay per World and carry over: THE
  THINKING EDGE and THE OBSTACLE MEMO are per-World mechanisms, THE
  GOVERNOR's budget seam is per runtime, THE PHASE METER and THE DISTANCE
  CENSUS read any World. They are not an investment in the giant zone.

What the shard lane stops doing until the contract is written: building more
hosting that assumes one surface World (W2's PIN replacement, the island
scheduler). What it keeps doing: the measured diet of the one-thread cost,
which every area-World pays the same.

## 3. The branch plan (for her word)

Today: `codex/seamless-world-foundation` is canonical (Codex's consolidation
of 2026-10-14 merged main's baseline in and retired its backups);
`shard-world` holds the shard lane and the performance lane, 36 commits ahead
of the foundation and 104 behind, with 18 conflict paths in a dry merge up
(`CLAUDE.md`, the probe roster, and probes and fixtures that both sides
touched: `probe_nativeinstalledsources`, `probe_nativescenehistory`,
`probe_nativescenetitans`, `probe_worldmass_processioncontinuity`,
`probe_skillflights`, `probe_loadingpreparation` deleted on one side and
changed on the other, four add/add fixtures). The old `codex/*` topic
branches are merged into main; `mobile-touch` and `seamless-world` are
parked history.

Recommended: ONE branch, the foundation, with the two threads (content parity
with main; the hosted world) as commit streams on it, each landing through the
existing gates (`npm run check`, the probe roster, the smoke identity for
engine edits, concurrent pairs for performance). Steps: (1) land Codex's
Firefox loading follow-up on the foundation and bring its CI green; (2) merge
`shard-world` into the foundation ONCE, deliberately, with a per-path ledger
of the 18 dispositions the way Codex's consolidation recorded its 25, the
foundation's owner resolving its probe and fixture files and the shard lane
its own; (3) retire `shard-world` and `perf-lane` as branches (history kept
in the merge); (4) the foundation becomes `main` when main's content works in
the continuous world, and the zone-layout machinery is removed in that same
cutover, never before its replacement stands. Until step 2 lands, the shard
lane keeps merging the foundation down daily (charter §7c) and lands nothing
new up.

## 4. The decisions that are hers

1. The branch plan above: one branch now, with the merge-up done once and
   deliberately (recommended), or the feature-branch policy kept until the
   spatial cutover.
2. Who resolves the 18 conflict paths: the foundation's owner for its probe
   and fixture files with the shard lane beside it (recommended), or one
   session alone.
3. The cutover requirements as a checklist with owners, written into
   `docs/design/seamless-world-foundation.md` before more parity work lands
   (Codex's own proposal; recommended).
4. The shard's unit: the retained area as the island (recommended), stated
   in the M6 plan's W2/W3 before either is built.

## 5. Where each lane stands tonight

- The foundation (Codex): the Firefox loading follow-up is uncommitted in its
  worktree with its own ten standalone checks and a cooperative-Firefox
  harness; its document leaves acceptance to be recorded; its CI fix
  (`fetch-depth: 0`) answers the `git show` probe failures; three worldmass
  probes fail in CI for older reasons (`courtcontinuity`,
  `nativeareacompiler`, `terrainvariation`). The Firefox crash leads from
  the performance lane's audit are in
  `docs/engine/firefox-crash-leads-20261014.md`: canvas memory the seamless
  world alone allocates, led by floor pages dropped without freeing their
  pixels.
- The shard and performance lanes: landed and pushed on `shard-world` at
  d11b3c75: THE PHASE METER and THE DISTANCE CENSUS, THE THINKING EDGE, the
  foundation's reconciliation, THE GOVERNOR (shipping off, pending her word
  on its floor and signal), THE OBSTACLE MEMO; the receipts in
  `performance-lane.md` §7 and §8; the asks F9 to F14 in the charter's §7g.
