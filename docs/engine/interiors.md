# Interiors: rooms, the veil, shelter, lesson doors & waking

The interior fabric is four small levers on the structures every zone can
already raise (`data/structures.ts` plans → `PlacedStructure`), plus the one
render pass that makes a room feel like a room. Everything here is data-first:
a new house, a new teaching door, a new spawn point are plan characters and
def fields — no engine edits.

## The room as a vision volume (`confineVision`)

`StructureDef.confineVision` (stamped onto `PlacedStructure`) marks a
structure whose interior CONFINES the local hero's rendered vision: while
`World.roofedStructureAt(hero)` resolves to it, everything beyond the room
veils dark. Two grains:

- **`true`** — the whole roofed footprint is one volume (the windowless
  one-room home; the Waking House keeps this exact treatment).
- **`'rooms'`** — PER-ROOM: `placeStructurePlan` derives a ROOM LEDGER
  (`PlacedRoom`: 4-connected interior components, merged rects, the doors on
  each rim, see-through apertures, and an ENCLOSED verdict — one walkable
  boundary gap unseals a room), and only the enclosed room the hero stands
  in confines. An open-fronted lean-to (the blacksmith's forge) never
  wraps — the sight veil's wall shadows (`render/vis/sightVeil.ts`,
  `docs/engine/los-pathing.md`) carry that partial case — while a manor or
  castle keep confines hall by hall, exactly the way the roof reveal already
  walks. WINDOW/PARAPET cells on an enclosed rim stay sealed but SPILL a
  disc of sight through themselves (`VIS_CFG.roomVeil.windowSpill` — the
  street, glimpsed through the slit). `confineAlpha` softens one
  structure's dark (a lantern-lit undercroft at 0.6, the cottage at full).

The cottages, inn, chapel, longhouse, metro houses, manors, dungeon blocks
and the castle generators all run `'rooms'`; the ledger derives for every
plan structure regardless, so future consumers (AI room-holds, sound) read
the same truth. The pass is `render/vis/roomVeil.ts` (tunables in
`VIS_CFG.roomVeil`):

- A downscaled screen buffer fills with "unseen" and punches the room clear —
  the padded roof rects, every doorway's cells (the door must stay seen,
  latched or not), and a spill disc past each OPEN aperture. The light layer's
  `destination-out` idiom; `featherPx` blurs the punched edges.
- It draws after the world layer, under the light layer: night still darkens
  the room, a hearth still punches the night — the veil is *unseen*, not
  *unlit*.
- Labels gate through `RoomVeil.veiledAt(pos)` inside `labelRevealAt` —
  nameplates beyond the room hide with the ground they stand on.
- The atmosphere pass damps its weather wash, particles and wind streaks by
  `RoomVeil.frac() × dampAtmosphere` — a roof owns its sky in the *feel* too.
- **Render-only by doctrine.** Gameplay LoS (`engine/los.ts`) keeps its own
  honest occlusion — rampart cells and closed door slabs already block sight
  and shots. The veil is the drawn horizon of attention.
- **Extensible by shape**: the pass draws `VisionVolume`s (rects + spill
  discs). Sources today: the confining roofed room (whole-structure) and the
  enclosed PlacedRoom ('rooms' mode); a cave throat, a curse's closing
  walls, a dream pocket can feed the same volume and inherit the whole
  treatment — add a source, never a pass.
- **The open-world sibling** is THE SIGHT VEIL (`render/vis/sightVeil.ts`):
  positional occlusion shadows behind every sight-blocking wall cell and
  solid body, from the hero's eye — the same "world ends at the wall"
  feeling, propagated to structures seen from OUTSIDE, forests (trunks),
  and warrens. The room veil supersedes it while confinement wraps (the
  sight veil scales itself by `1 − frac()`), so the two darks never fight
  over one doorway.

## Local shelter (the roof owns its sky)

Sky exposure gates weather per ZONE (`skyOf`/`World.skyFront`); the roof gates
it per POSITION:

- **Wind** already honors it: `windAt` returns null under any roof
  (`underRoofAt`), courtyards stay open.
- **Sky strikes** now honor it too: zones pushed by `fireStrikeAt` (weather
  bolts, storm altars) and `fireMeteor` (demon storms) carry
  `Zone.spareRoofed`, checked beside `spareDormant` in the explode loop — a
  bolt may telegraph onto the thatch; the thatch takes it. The data lever is
  `WeatherStrike.throughRoofs` (`world/weather.ts`): a future kind whose wrath
  falls indoors sets one field, never a code branch. Combat placements leave
  `spareRoofed` unset — a mage's nova was never weather.

## Lesson doors (`CellSpec.door.lesson`)

A door may name an ACCOUNT ledger key. The first dwell-open stamps it
(`account.ledger[lesson] = 1`, `accountDirty`) — and at `loadZone`, any
still-closed door carrying a key the account already owns mints open,
silently. Tutorial-by-doing with the flask-lesson graduation shape: the push
IS the dwelling tutorial, and nobody is taught to open a door twice. Within a
run, ordinary zone-memory `doorState` persistence still applies.

## Spawn cells (`CellSpec.spawn`, legend `S`)

A plan cell may declare WAKE HERE: `placeStructurePlan` exports its center as
`PlacedStructure.spawn` → `GeneratedLayout.spawnAt`. `loadZone` places the
party there when arriving WITHOUT a back-portal (a fresh run, a respawn) —
`zoneEntry` itself deliberately stays the geometric entry, so ambient-spawn
reachability (`spawnPoint`), hazard clears, and the perf walk keep measuring
from the zone's own ground rather than from inside a sealed teaching room.

## The Waking House

The shipped composition of all four levers (`data/structures.ts
waking_house`, a Lastlight fixture at the town's quiet north-west): every run
opens its eyes at the bedside (`S` beside the bed), inside a confined room lit
by its own hearth, weather held off by the roof, and one latched door whose
deliberate 1.0s dwell teaches dwelling itself (`lesson:
'waking_door_unlatched'`). Veterans wake to the door already open and are in
the square four steps later.

The furniture is the HOME KIT — `bed`, `hearth`, `stool`, `shelf`, `rug`
(union + `DOODAD_RULES` + `DOODAD_VISUALS` + `render/vis/paintersHome.ts`),
blueprint-placeable via legend chars `Z h s k r`. All collide as drawn
(`surface`, `orient: 'fixed'`); the rug is a walkable ground decal; the hearth
carries a brazier-style `LightSpec` and stays a live painter (its flame reads
the sim clock). Any plan anywhere can now furnish a home with five characters.

## The Inn (the inn wave, 2026-09-05)

THE INN KIT grows the home kit into a public house's furniture — the same
four-part law per piece (union + `DOODAD_RULES` + `DOODAD_VISUALS` +
`render/vis/paintersInn.ts`) and a global legend char each: `t`
tavern_table, `c` chair, `a` bar_counter (chain cells for a run), `K` keg,
`j` dresser, `x` linen_chest, `i` candle_stand (a small light), `J`
coat_rack, `u` planter, `y` rail_fence; `washstand` takes a local char. All
bake static; waist-high pieces (`blocksShot: false`) stop feet, never the
eye or the arrow. Lastlight's inn (`structures.ts inn`) is the debut: the
counter run with Mireille behind it, kegs and shelves, tables, the hearth,
windows either side of the door, and a stair cell (`inn_stair`) in the
corner.

**Floors as pockets.** A hand-authored building climbs the way the manor
does: the stair cell is a sidezone mouth (`data/sidezones.ts 'inn_stair'`,
`indoorsOnly`) whose mint furnishes ONE plan structure (`inn_upper`: three
guest rooms + a linen closet off a landing, each behind its own door) in a
fixed-seed pocket — `safe`, sheltered by `caveDepth`, `noDeeper` (one
storey above), the south doors onto the way down, `S` at the head of the
stair for respawns. `confineVision: 'rooms'` confines the landing and each
room in turn.

**THE SPOKEN SEAT.** `StructureDef.npcs[].line` — a plan-seated body may
carry a line; it threads `GenCtx.npcs` → `loadZone`, which keys it onto
the body in the residents' line map (cleared per zone BEFORE the plan's
npcs spawn), so `World.residentPrompt` speaks it for any npcRole
`resident` body. The inn's patron speaks the stair; the lodger upstairs
speaks the house. Probe: `balance/probe_towngrowth.ts` rig J.
