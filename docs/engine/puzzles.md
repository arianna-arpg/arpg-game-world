# THE PUZZLE FABRIC — activity riddles as data

`src/engine/puzzles.ts` (kinds + specs + host contract) ·
`src/data/puzzles.ts` (PUZZLES presets + panel/chevron registrations) ·
placer/runtime in `src/engine/world.ts` (`bootPuzzles` et al.) ·
probe `balance/probe_attunement.ts`

## The shape

A puzzle is a small machine of **STRUCK FIXTURES**: crystal bodies that are
ordinary passive monster defs — they reach `resolveHit` like anything else,
so **every delivery in the game can play them** (arcs, arrows, novas,
minions, the zone's own blasts) — wired to a **PuzzleRun** that a registered
**KIND** drives through the narrow `PuzzleHost` (kinds never import World;
a stub host unit-probes them).

Three kinds ship; `registerPuzzleKind` is open (packages add kinds):

| kind | riddle | who counts |
| --- | --- | --- |
| `lattice` | lights-out: a strike toggles a cell + orthogonal neighbors; kindle the board. Scrambled by SIMULATED strikes from solved ⇒ always solvable | `player` side |
| `refrain` | the ring PLAYS a chime sequence (only with a hero in earshot), then listens; answer in order; wrong notes falter it back | `player` side |
| `chord` | a locked HEART holds a rolled tone; strike the ring with matching damage (the attunement fabric IS the input) until every voice joins. Heartless variant (`heart: false, tones: ['physical']`) boots MISTUNED and asks for silence — the shatter riddle | `any` (the zone may help or grief — a discord siren re-tunes mid-fight) |

State DRESSES as it moves: lattice/chord tones ride the same
`attuned_<tone>` lane real attunement uses; refrain playback/answers blink
`kindled`. Co-op, nameplates and fx follow for free.

## Authoring

**Presets** (`PUZZLES` in data/puzzles.ts): pure data — kind, board/ring
dials (`grid`, `count`, `rounds`, `beat`, `window`, `scramble`, `tones`,
`spacing`), fixture overrides (`node`/`heart`), `who`, `label`, and
`reward` (`gems`, `washFor` — a generous parting wash of the finishing
tone; `cast` — free-cast any catalog skill at the site).

**Zones offer presets** via `TilesetDef.puzzles` chance rows (folded onto
minted ZoneDefs, caves included; authored zones list rows directly). Rolled
at **LOAD on a salted stream** (`PUZZLE_CFG.salt`) — never a generation
concern, zero genqa surface, capped by `PUZZLE_CFG.maxPerZone`.

**As the ask**: objective kind `'puzzle'` (zones.ts — seals nothing, banks
the chest). A row in `TilesetDef.objectives` draws its preset from the same
puzzles rows (`ObjectiveSpec.puzzle` pins one). `updateObjective` only
watches `run.done`; `objectiveText` reads the kind's own `status()` line.

**Presentation** rides the beacons idiom (data/puzzles.ts):
`registerZoneInfoSource` lists live riddles + state on the zone panel;
`registerAttentionSource` chevrons ONLY the objective riddle — side riddles
stay discoveries.

## Persistence

Solved runs latch into Zone Memory (`puzzlesDone` — serialized in
SavedZoneMemory); re-entry re-boots them through `kind.solved` dressing
(proof, not homework). The puzzle OBJECTIVE's done-ness lives in
`completedObjectives` like every kind — never gate progression on the
memory rider.

## Siblings

`ZoneDef.scenery` rows (`World.bootScenery`, its own salt) plant ambient
passive object-actors the same way — the crystal country's freestanding
resonant voices. Same discipline, no riddle attached.
