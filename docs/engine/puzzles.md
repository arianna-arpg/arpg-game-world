# THE PUZZLE FABRIC — activity riddles as data

`src/engine/puzzles.ts` (kinds + specs + host contract) ·
`src/data/puzzles.ts` (PUZZLES presets + panel/chevron registrations) ·
placer/runtime in `src/engine/world.ts` (`bootPuzzles` et al.) ·
probes `balance/probe_puzzles.ts` (the repertoire + the grain + the
blow-grain hum) and `balance/probe_attunement.ts` (tones + the original
routing rigs)

## The shape

A puzzle is a small machine of **STRUCK FIXTURES**: crystal bodies that are
ordinary passive monster defs — they reach `resolveHit` like anything else,
so **every delivery in the game can play them** (arcs, arrows, novas,
minions, the zone's own blasts) — wired to a **PuzzleRun** that a registered
**KIND** drives through the narrow `PuzzleHost` (kinds never import World;
a stub host unit-probes them).

Six kinds ship; `registerPuzzleKind` is open (packages add kinds):

| kind | riddle | who counts |
| --- | --- | --- |
| `lattice` | lights-out: a strike toggles a cell + orthogonal neighbors; kindle the board. Scrambled by SIMULATED strikes from solved ⇒ always solvable | `player` side |
| `refrain` | the ring PLAYS a chime sequence (only with a hero in earshot), then listens; answer in order; wrong notes falter it back | `player` side |
| `chord` | a locked HEART holds a rolled tone; strike the ring with matching damage (the attunement fabric IS the input) until every voice joins. Heartless variant (`heart: false, tones: ['physical']`) boots MISTUNED and asks for silence — the shatter riddle | `any` (the zone may help or grief — a discord siren re-tunes mid-fight) |
| `tempo` | the rising measure, READ never memorized: every voice pulses on its own period (rank r pulses `period − r×step` apart) from ONE synced opening bar — strike slowest first, fastest last. A wrong voice breaks the measure and RE-SYNCS the bar (a fresh read, not a punishment); settled voices hold steady light; out of earshot the bar HOLDS in place | `player` side |
| `accord` | the twin voices: partners sit OPPOSITE (idx, idx+pairs) and SHARE a pool color; ring both halves inside the `linger` window (the worn kindle IS the window — drawn == tested) and the pair binds FOR GOOD. Kind-level `spill: 'all'` — one wide blow through the ring binds a pair whole; walking between partners solves it just as truly | `player` side |
| `ember` | the tended ring: a struck coal stays alight for its `gutter` window (worn as kindle on the same clock); have EVERY coal alight at once. No falter — patience circles forever, breadth (`spill: 'all'`) lights half the ring in a swing; re-taps refresh | `player` side |

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
- **THE HUM** (`hum` seconds, default `PUZZLE_CFG.hum`), at **BLOW
  grain** (2026-07-26): a just-judged node swallows repeat knocks —
  echo-family re-strikes and multistrike double-taps read as ONE knock —
  until a bell of a LATER blow rings fresh (which claims the ledger for
  that blow) or the hum fades. One blow claims the ledger WHOLE: under
  `spill: 'all'` every bell it rang hums together, so a fan-out's echo
  (the same fan one frame later) is swallowed whole — before this, only
  the LAST-rung bell of a fan held a hum, and an echoed fan re-judged
  the rest. Structurally safe as ever: the refrain never asks the same
  note twice in a row, a legitimate return always rings something else
  in between (clearing the ledger), and the aim grain is byte-identical
  to the old law (one rung bell = one hum). Saves the lattice from echo
  self-cancel (toggle + toggle = no-op) too.

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
`spacing`, and the kind-scoped timing dials `period`/`step` (tempo),
`linger` (accord), `gutter` (ember) — every one validated > 0), fixture
overrides (`node`/`heart`), `who`, `label`, and `reward` (`gems`,
`washFor` — a generous parting wash of the finishing tone; `cast` —
free-cast any catalog skill at the site). The `tones` pool doubles as
the accord's pair palette (validate warns when a preset could roll more
pairs than pool colors — two partnerships must never share a dress).

**THE GRAIN** (`PuzzleKindDef.quantize`, default 1): ring kinds built of
pairs/triads declare their multiple and the placer rounds the rolled
count DOWN to it (floor one grain) — the accord (`quantize: 2`) can
never mint an orphan voice, and any future triad kind gets the same law
for one field.

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
