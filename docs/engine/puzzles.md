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

## The knock, the spill, the hum (strike routing — 2026-07-22)

A node is judged from `resolveHit` through THREE routing laws, each a data
dial resolved spec → kind → `PUZZLE_CFG`, so every build's delivery answers
honestly:

- **THE KNOCK LAW** (`knock: 'landed' | 'wounding'`, default `'landed'`):
  a node answers the KNOCK, never the wound — any LANDED damaging blow
  rings it, however mitigated. A full septic forgo (`hitToAffliction` 1.0,
  the pure-carrier hit), a shield's soak-to-zero, even an invulnerable
  fixture's `immune` all still knock; evades and blocks stay refusals
  (those never connected), and DoT ticks never knock (the ache is not a
  blow — a wrong-node bleed must not falter the song every tick). The
  ATTUNEMENT route shares the law: `struckTone` reads the packet
  **pre-forgo** — the bargain rebates magnitude, never color — so a
  full-septic firebolt still paints a chord crystal red. `'wounding'`
  restores the moved-life-bar demand for kinds that want it.
- **THE SPILL LAW** (`spill: 'aim' | 'all'`, default `'aim'`): one blow
  rings ONE bell. When a single blow (same striker, same instant) knocks
  several of a run's nodes — a reach-scaled cleave arc, melee reverb, a
  nova across the ring — only the node best aligned with the striker's
  FACING is judged (tie: nearest, then arrival order; `pickKnockNode`,
  pure). Without it, arc resolution order (ring index, not aim) picks the
  note — the "my cleave faltered the song" misfire. `'all'` keeps the
  fan-out for kinds that want every bell (a future gong-storm).
- **THE HUM** (`hum` seconds, default `PUZZLE_CFG.hum`): a just-judged
  node swallows repeat knocks — echo-family re-strikes and multistrike
  double-taps read as ONE knock — until a DIFFERENT node rings (which
  clears the hum) or it fades. Structurally safe: the refrain never asks
  the same note twice in a row, so a repeat inside the hum can never be
  the intended next answer — and the cross-ring clear makes a fast A,B,A
  answer legal at any speed. Saves the lattice from echo self-cancel
  (toggle + toggle = no-op) too.

Implementation: `World.puzzleStruck` ENQUEUES (`puzzleKnocks`, with a
`wounding` note riding along) and `drainPuzzleKnocks` judges once per frame
ahead of kind ticks — a whole blow is visible before any note sounds. The
WHO gate and the knock dial refuse at the drain; kinds stay pure. The
chord's `tuned` lane bypasses all three on purpose: tone sets are
idempotent and multi-node washes are that riddle's play. Probe:
`balance/probe_attunement.ts` section 4.

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
