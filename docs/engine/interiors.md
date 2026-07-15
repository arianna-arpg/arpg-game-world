# Interiors: rooms, the veil, shelter, lesson doors & waking

The interior fabric is four small levers on the structures every zone can
already raise (`data/structures.ts` plans → `PlacedStructure`), plus the one
render pass that makes a room feel like a room. Everything here is data-first:
a new house, a new teaching door, a new spawn point are plan characters and
def fields — no engine edits.

## The room as a vision volume (`confineVision`)

`StructureDef.confineVision: true` (stamped onto `PlacedStructure`) marks a
structure whose interior CONFINES the local hero's rendered vision: while
`World.roofedStructureAt(hero)` resolves to it, everything beyond the room
veils dark. The pass is `render/vis/roomVeil.ts` (tunables in
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
  discs). Today's one source is the confining roofed room; a cave throat, a
  curse's closing walls, a dream pocket can feed the same volume and inherit
  the whole treatment — add a source, never a pass.

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
