# THE STOREY FABRIC — stacked rooms on the tier fabric

**Landed 2026-09-05/06 on her ruling: the inn's rooms above are the SAME map
one story up — never a pocket zone.** The fabric is a thin composite over
THE TIER FABRIC (`docs/engine/tiers.md`, the in-zone layer system: buttes,
ramps, culvert ducts) that lets a hand-authored plan structure raise a floor
ABOVE its ground plan, cell for cell, inside the zone it stands in. Every
number is a DIAL; the probe is `balance/probe_storey.ts`.

> Naming, so future asks land on the right system: **tiers/stories** = extra
> walkable LAYERS inside one zone (`Actor.tier`, `RegionKind.tier`,
> `ZoneDef.tiers`) — the buttes, the switchback summits, the sewer DUCTS
> under the district streets, and now a building's storey. **Sidezones** =
> separate POCKET zones entered by dwelling (the cellar hatch, the sewer
> GRATE's deep sewerworks, the rootways' span mouths, the manor's floors).
> **Strata** = cave-depth NAMING across zones. The inn used a sidezone for
> one commit; it uses a storey now.

## The rows (`world/regions.ts`)
One cell holds ONE region row (the tier fabric's law), so a storey plan is
FOLDED into the ground plan at placement into five rows:

| row | walkable (tier 0) | `tier` | what it is |
|---|---|---|---|
| `storey_floor` | yes | 1 | one cell, two floors — the room beneath and the room above (the bridge deck's law worn by a house) |
| `storey_wall` | yes | — | **THE HANGING WALL** — `hangingFrom: 1`: open floor to the room beneath, a wall to the story it stands on |
| `storey_stair` | yes | 1, `tierLink` | the flight — the crossing (both floors, span [0,1]) |
| `storey_landing` | no | 1 | the flight's head — the story's own floor, a **closet under the stairs** downstairs (wall, shot-stop, sight-stop) |
| `storey_deck` | no | 1 | the story's floor over a ground-floor wall (a balcony over a porch) |

`RegionKind.hangingFrom` is the one new field: **THE ELEVATION LAW** reads it
at the ray's own height (`engine/los.ts castRay`: a sight or shot ray whose
lerped story reaches `hangingFrom` stops; the flat legacy read never meets
one), the sight veil marks it solid to a story-1 eye (`sightBlockOf.hf`),
the projectile sweep stops story-≥1 flights at it, and the mover needs no
new read at all — a row without `tier` is already no floor to story k.

## The plan (`data/structures.ts`)
```ts
inn: {
  plan: [ ... '#....c.t.c.^^#', '#.t...r...#AA#', '#c.c..r.t.#AA#', '#p..b.i.J....#', ... ],   // the ground floor
  storeys: [{ plan: [ ... '#....r.......#', '##D##D###D#..#', '#i.j#.i#j.#AA#', ... '#Zr.#rZ#Zr####', ... ] }],  // the floor above
  npcs: [ ..., { id: 'townsfolk_lodger', x: 91, y: -39, tier: 1, line: '…' } ],
}
```
- `StructureDef.storeys[k-1]` is a char grid of the ground plan's exact
  dimensions, read over it cell for cell (legend chars mean what they mean
  on any plan; a storey may carry its own local `legend`).
- **The composite** (`levelgen.ts placeStructurePlan`, after the ground
  regions paint): storey FLOOR (`.`, furniture, `D`) over ground floor →
  `storey_floor`; over a ground wall → `storey_deck`. Storey WALL (`#`) over
  ground floor → `storey_wall`; over the ground's own wall or door row → the
  ground's wall stands. Doodads on the storey plan are pushed with
  `tier: k`; `npc` cells and `npcs[].tier` rows seat bodies on the story
  (`World.loadZone` stamps `Actor.tier`, seats them through
  `findFreeSpot(pos, r, tier)`).
- **The stair lives on the GROUND plan**: `A` = `storey_stair` cells (chain
  them — the inn's flight is 2×2), `^` = `storey_landing` at the flight's
  head. The storey plan above both reads floor. THE FLIGHT'S LAW: its flanks
  must be walls on BOTH floors (the inn walls the stairwell's west side on
  both plans) so the only ways onto it are its foot (ground-only floor —
  the storey plan hangs a wall over the foot cell) and its head (the
  landing, story-only floor). Then the tier fabric's own crossing laws
  carry a walker honestly: the ladder toggle flips on entry, and THE EXIT
  RULE corrects it at either end — step off the head onto the landing and
  you are upstairs; back out at the foot and you never were.
  THE INN'S FLIGHT (re-ruled 2026-09-06): the foot is at the SOUTH end by
  the door, the landing at the NORTH end opens straight into the hall
  along the north wall, and the rooms line the south — the first cut's
  south landing opened into a furnished corridor and made the climb a
  chore. A landing must open onto circulation, never onto a room's inside
  (it would bypass the archway) nor onto furniture.
- `D` on a storey plan is an **ARCHWAY**: the story's floor plus a
  `PlacedDoor` record (`mode: 'sealed', open: true`, its cells) — never a
  slab (a door slab repaints the grid, which would repaint the ground
  floor). The story's room ledger reads it as a door, so a guest room
  stays a sealed room the veil confines.
- **THE STOREY LEDGER** (`PlacedStructure.storeys[]: PlacedStorey`): the
  story's floor rects, its hanging-wall rects, its archways, and its own
  `PlacedRoom[]` flood (rim = a storey wall (hung or the ground's), the
  plan's edge, or an archway; the flight and the landing are floor).
- **ONE STAIRWAY FACE per flight**: the composite drops one walk-over
  `stairway` doodad on each connected run of `A` cells, sized to the run
  and turned (`rot`) toward the landing it meets — the drawn flight
  (`vis/paintersInn.ts stairway`: stringers, treads with worn nosings,
  newels, banisters), no label. Show, never tell.
- **THE INTERIOR STACK**: `generateLayout` stamps `def.tiers = { kind:
  'over', exposure: 'open', levels, packSplit: 0, interior: true }` when a
  plan raised a storey and no recipe stamped its own country. `interior`
  keeps the world map's stack tell and tint silent (a town with an inn is
  not a tiered zone to the map), seats no ambient pack upstairs, and makes
  the stack ENCLOSED by derivation (THE ENCLOSURE LAW, `docs/engine/tiers.md`
  — `tierEnclosure`): a building has walls, so a shove, a leap or a blink
  clamps at the hanging wall / the outer wall exactly as feet do, tier kept —
  the rim fall that drops a butte-stander never fires under a roof (a
  knockback into a partition used to land the lodger in the common room).
- **THE SAME-STORY LAW** (2026-09-06, THE INTERACTION SWEEP): nothing crosses
  a story but the flight. The inn's door swings for no one upstairs
  (`dwellReachable`'s story pair — every station, counter, board and
  resident prompt reads it), a drop lying in the hall above is no pickup in
  the common room beneath (THE SPOILS STORY: `GemDrop.tier`, stamped by the
  shedder or settled from the floor — a storey floor cell is the GROUND's
  unless stamped), a corpse upstairs is no fuel from below, and a summon or
  recall seats on its caster's story.
- The ground ledger's `isMember` leaves a non-walkable region cell (the
  landing's closet) out of the common room.

## The draw (`render/renderer.ts`, `render/vis/roomVeil.ts`)
- **THE STOREY CULL**: inside a stacked building's footprint
  (`World.storeyedStructureAt`), a doodad or body on another story than the
  hero's is behind a ceiling or under the floor — not drawn (its nameplate
  and bubble with it). A piece or body on the crossing's cells shows to
  both floors. Open ground and storeyless roofs draw as ever.
- **THE STOREY LAYER** (`drawStoreyLayer`, the tier-veil slot, under the
  doodad pass): while the hero stands a story inside a stack, the story's
  floor is painted LIVE in the structure's own floor style
  (`vis/floors.ts paintFloorRect` — one brush, both floors; a storey cannot
  bake, the chunks hold the room beneath) and its hanging walls as standing
  timber over the ground bake; the story's furniture then draws on top.
  Standing the ground floor it paints **THE UNDERSTAIR** — each landing's
  closet — so a wall the mover honors is a cupboard the eye sees.
- **The room veil** confines by the hero's STORY: `RoomView.player.tier`
  picks the storey's own ledger + archways over the ground floor's.
- The roof fades as it always did (`roofedStructureAt` is position-only —
  the same roof covers both floors), the sight veil keys its occluders on
  the hero's story (hanging walls solid to a story-1 eye), and the HUD
  banner says nothing — the stair shows where it goes by being a stair.

## The laws, pinned (`balance/probe_storey.ts`)
A the rows · B the composite read back cell for cell against both plans,
the story's furniture stamped, one stairway face turned south, the ledger's
three sealed rooms + hall with archways, the lodger on the story, the stack
found by position · C the crossing walked by the mover (up to the landing,
along the hall, the flank refused, back down; a story-1 walker held by a
hanging wall while the ground walker passes under it) · D the elevation law
at a hanging wall for eyes and shots, the outer wall for both · E layer
sovereignty (a story-1 dresser is no solid to the room beneath) · F the
silent map · G the draw pins · H THE ENCLOSURE LAW + THE SPOILS STORY (a
shove into the hanging wall / the outer wall keeps tier 1 inside the
footprint; a drop upstairs is nobody's pickup beneath and the reverse; an
unstamped drop on a both-floor cell is the ground's). `probe_towngrowth`
rig J pins the inn wearing it and rig H the door that never swings from
upstairs (nor the board); `probe_tiers` RIG S pins the open rim beside the
enclosed roots.

## Limits + the seam this opens
- ONE elevated floor per cell (the tier fabric's `tier` is a single number
  per row): a second storey over the first would need composite rows
  (`floor_1_wall_2`…) — deliberate future work, named here.
- Storey doors are archways only (slabs repaint the grid). A per-story
  door state is a future lever.
- Storey windows (`W` on a storey plan) read as walls today.
- Save/co-op: the placed records ride the layout like every structure;
  bodies wear `tier` (zone memory + the `tr` wire); nothing new persists.
