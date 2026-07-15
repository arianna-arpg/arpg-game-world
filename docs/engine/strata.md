# The Strata & Hollows fabrics — the world's vertical ladder, and what the walls are hiding

Two sibling fabrics give the underground its identity. **STRATA** makes depth
mean something: the world is a stack — surface, the Galleries, the Depths, the
Underworld — and every cave knows which rung it stands on and what country it
hangs beneath. **HOLLOWS** makes the walls mean something: sealed secrets
carved inside the wall mass, invisible until a seam gives.

Everything here is open data. No system hardcodes the ladder's shape, the
faces' distribution, or the secrets' contents.

---

## STRATA — depth as data (`src/world/strata.ts`)

A **stratum** is a band of cave depths (`ZoneDef.caveDepth`: 1 = a surface
cave, each cave-within-a-cave one deeper) carrying everything that makes a
rung feel like a rung:

| field | what it drives |
|---|---|
| `name` | the zone banner's underground read (`renderer` appends `· the Depths`) |
| `levelStep[]` | zone-level climb per rung (indexed within the band, last repeats) |
| `deeperChance` | how eagerly the band's caves conceal a still-deeper mouth |
| `darkFloor` | minimum `theme.ambientDark` — the dark deepens whatever face rolled |
| `delverMul` | multiplier on the Descent Delver's mint chance (the shaft-keepers haunt the deep) |
| `namePrefix` / `prefixFrom` | cave naming ("Deep …", "Sunless …") |

Registered bands must **tile** the ladder from depth 1 (validate.ts asserts);
only the deepest band is open-ended. The default stack:

- **the Galleries** (1–2) — the near-dark; the classic level curve (+0, +1),
  `Deep` prefix from depth 2.
- **the Depths** (3–4) — the sunless band; +1 level per rung, deeperChance 0.5
  (the deep invites deeper), Delver ×1.7, `Sunless` prefix. This is the same
  country the Descent's boundless abyss belongs to — reached the slow way.
- **the Brink** (5+) — the floor of the world. A SURFACE ladder this deep
  mints a **breach**: the crossing into whatever dimension declares a
  `cave_breach` entry (`world/dimensions.ts` — the Underworld's `minDepth: 5`).
  The breach depth is dimension-owned, never a strata field.

So the stack reads, top to bottom: **surface → caverns → the Depths → the
Underworld** — and the zone-level ladder climbs with it (anchor, +0, +1, +2,
+3, +4 at the breach; the Underworld's own `levelBonus` takes over below).

### Cave faces — provenance × depth (`TilesetDef.caveFace`)

An **unforced** cave mint (the classic `cave_entrance`) picks its tileset from
the CAVE-FACE pool: every tileset carrying `caveFace` weights itself by

```
presenceMul(caveFace.strata, caveDepth) × caveFace.biomes[anchor] (?? '*' ?? 1)
```

The **anchor** is the surface biome the whole ladder hangs beneath
(`ZoneDef.anchor`, stamped by `mintCave` from `parent.anchor ?? parent.biome`
and inherited rung to rung). Both axes answer *"why is this cave THIS?"* — a
magma gallery under volcanic country is the neighbourhood; the same gallery
under a meadow means you have delved deep enough for the world's own heat.

Faces today: `cavern` (the generalist — dominant in the Galleries, gone by the
Depths), `depths` (the band's own face — Depthkin country), `magma_gallery`,
`rime_gallery`, `fungal_hollow`. A face may also carry `variantChance`: a
face-rolled mint wears one of the tileset's variants that often (the base
mixed crawl stays common; a dressed gallery is a find).

Authored gates (`ruin_gate`, `vault_gate`, the Descent, realm mints) pass an
explicit tileset and never consult the pool. Face + face-variant rolls ride an
**identity sub-stream** (`entranceSeed ^ CAVE_FACE_SALT`) so the main stream's
draw order per resolved tileset keeps the classic contract.

Probe: `npx tsx balance/probe_strata.ts`.

---

## HOLLOWS — intelligent secrets (`engine/levelgen stampHollows` + `World.openHollow` + `data/hollows.ts`)

A **hollow** is a sealed void the layout knows about and the walls don't show:

- a **pocket** — a small room swallowed whole by wall mass, ringed by more
  solid on every side but its doorway;
- a **passage** — a through-wall corridor pierced between two open floors,
  sealed at both ends (either seam opens the whole run).

The pocket's cells **keep their native wall kind** — identity is the disguise,
pixel-for-pixel and physics-for-physics, whatever the zone builds its walls
from (`wall`, `fungal_wall`, `sunkstone_wall`…). The only tell is a
**hollow seam** doodad flush with the face: cracked stone that *rings hollow*
when neared (BrittleSpec warn) and gives to a blow or a lingering press.

**The reveal** (`World.openHollow`): carve the recorded rect (plus a doorway
cell at every seam) to ground — chunk re-bake, LoS, and pathing all ride the
grid's own dirty/version machinery — splice the seams, then run the hollow's
`HollowDef.reveal` from the hollow's **own seed**, so a remembered reveal
re-furnishes identically.

**The registry** (`data/hollows.ts`, open): `cache_hollow`, `ambush_hollow`
(wakes the zone's own pack table), `vein_hollow`, `hermit_hollow`,
`passage_hollow`, and **`crevice_hollow`** — the wall was the lid on a whole
further cave: the revealed `crevice_shaft` is a registered sidezone descending
**one stratum deeper**, face-rolled fresh, with a position-hash seed — the
reopened hollow descends into the *same* deeper cave every visit.

**Budgets** are data: `TilesetDef.hollows { count, table }` rides onto minted
defs (`ZoneDef.hollows`); grid layouts only (a convex cave's walls are its
arena border — the classic `secret_wall` keeps that beat). The carver runs
LAST in `generateLayout`, after every reachability/navigability rescue.

**Persistence:** opened ids ride `ZoneMemory.hollows` (capture/apply beside
`doorState`); revive mode furnishes STRUCTURE but never re-pays loot or
re-wakes ambushes (survivors ride zone memory like any resident). **Co-op:**
`ZoneMsg.hollows` ships the specs; `StateSnapshot.hollows` converges opened
ids per frame through the same idempotent gate (bare mode: carve + seams; the
contents ride the host's own streams).

**QA:** genqa asserts every recorded hollow is sealed (rect fully
non-walkable), seam-zipped (a pocket one, a passage two, ids matching), and
registry-resolved — plus a forced case group per budgeted tileset.
Probe: `npx tsx balance/probe_hollows.ts`.

### Adding content

- A new secret kind = one `registerHollow` (+ weight rows on the tilesets
  that should hide it).
- A new cave face = one tileset with `caveFace` (+ optional `hollows` budget,
  `caveLayouts`, variants).
- A new rung meaning = `registerStratum` (packages may re-tune bands).
- A deeper world = a dimension with a `cave_breach` entry; the ladder bottoms
  out wherever a dimension says it does.
