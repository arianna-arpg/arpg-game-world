# The Creep Fabric — living ground membrane

`src/engine/creep.ts` (sim) · `src/data/creeps.ts` (kinds) · `src/render/vis/creepLayer.ts` (draw)

Creep is an organism's SKIN laid over the zone floor: anchored membrane
patches that grow outward from a heart, breathe on the warren's shared
lub-dub, and RECOIL when their heart dies. It is the fourth theme fabric
(beside fog / collapse / flux) and the first one content can plant at
runtime anywhere: a biome grows it ambiently, a package spreads it as an
event footprint, a monster carries it as its own ground. The drawn skin IS
the hit surface — an actor standing on live creep (cover ≥ the honesty
floor) wears the kind's granted statuses, refreshed while on it, lingering
briefly after stepping off (the fog fabric's exact contract, grounded).

## The data surface

**`CreepDef`** (`CREEPS` registry, `registerCreep`) — one row per creep KIND:

| Field | What it says |
| --- | --- |
| `color` / `rim` / `vein` / `glow` / `alpha` | the whole palette: membrane body, rim welt, filament, freckle+pulse tint, peak opacity |
| `reach` | patch radius roll (heart to mean rim) |
| `lobing` | rim waviness 0..1 — three integer-frequency harmonics make the ameboid skirt (validator caps 0.6: past it rims self-cross) |
| `spread` / `recede` | front advance speed growing / recoil speed dying (default recede = spread × 1.6 — skin recoils faster than it crawls) |
| `pulse` | heartbeat rate multiplier (1 = the warren's own clock) |
| `veins`, `nodes` | render density: filament count roll, freckle density (keep freckles SPARSE — the unease is in the noticing) |
| `hitFloor` | min cover that still counts as "on creep" (edge honesty) |
| `grants` | `CreepGrant[]`: status + optional `teams` / `factions` / `notFactions` filters — the idiomatic pair is one grant FOR the organism's faction, one against everyone else |

**`ZoneCreepSpec`** (`ZoneTheme.creep`) — what a zone grows ambiently:
`{ pockets: [lo,hi], kinds: [{ id, weight? }] }`. Pockets place by
best-candidate spread (each favors the anchor farthest from the placed),
born full. Variants inherit the base theme unless they override `creep`.

**`MonsterDef.creepSource`** — `{ kind, reach?, bornFrac? }`: the body is a
CREEP HEART. Planted on its first update tick (the composite-parts
lazy-attach idiom, so every spawn path works), bound to the actor's life —
kill the heart and the skin visibly recoils. Any monster may carry one.

Core kinds shipped in `data/creeps.ts`: `caulflesh` (the Caul's near-black
bruise-violet skin — feeds the `caulborn`, mires everyone else) and
`blightgrowth` (the Eldritch incursion's sickly-green footprint).

## Contracts

- **Seed discipline** — ambient pockets roll on `zoneSeed ^ CREEP_CFG.salt`
  with a dedicated Rng; the fabric never advances layout/spawn rng. Adding
  creep to a tileset cannot move a doodad or a baseline metric.
- **Transience** — rebuilt each `loadZone`; nothing serializes. Durable
  overlays that spread creep re-plant on zone enter (their own snapshot
  carries the WHERE; the fabric only ever holds the live skin). Boundless
  zones never build a field.
- **Statuses, not regions** — grants apply via the ordinary
  `applyStatus(id, 0, 1, 'the creep')` refresh/linger idiom. No walkability
  or LoS changes, by design: the membrane is skin over the world's bones,
  and it composes over ANY ground — roads, flux pads, even collapse rims.
- **Honest edges** — `coverAt` and the render bake share ONE rim function
  (`creepRimMul` × the live front) and one cover profile (`bodyFrac`
  plateau, smoothstep skirt). The rim LIP marks the boundary; grants stop
  just inside it (`hitFloor`).
- **Saturation, not flood** — `CREEP_CFG.maxSources` caps a field;
  `addSource` past it returns null. A runaway spreader saturates politely.

## Runtime shape

`World.creep: CreepField | null`, built at the loadZone ambient-reset block
from `theme.creep`; **`World.creepEnsure()`** lazily builds an empty field
anywhere (the package/monster seam) — creep is a fabric any content can
plant, not a biome privilege. Ticked by `World.updateCreep` beside fog.
Hearts plant in `World.updateCreepHearts` (first-tick latch
`Actor.creepPlanted`).

Open predicates for AI drives and packages: `coverAt(x,y)`, `onCreep(x,y)`,
`nearestSource(x,y)`, `cleanseAt(x,y,r)` (payoffs force-recede hearts),
`addSource(def,x,y,{reach,bornFrac,boundTo,ambient})`.

Renderer: one view-culled pass between the flux layer and the doodad pass
(`vis/creepLayer.ts`) — per-source baked skin sprite (rim, veins, freckles,
lip) scaled by the live front, breathing on `heartbeat()` (exported from
painters — one organism, one pulse), plus a live pulse front riding
heart→rim. Ablate pass name `'creep'`; knobs in `VIS_CFG.creep`.

## Extension seams

- A new creep anywhere = one `registerCreep` row + a `creep:` line on a
  theme (or a `creepSource` on a monster, or an `addSource` in a package).
- `CreepGrant` is pure statuses today; a dps lane would follow the fog
  fabric's noted resolver seam if a kind ever needs to burn boots directly
  (prefer statuses — StatusDefs already carry dots/slows/auras).
- Monster creep-seeking: `nearestSource` is the steering query — an
  `x_seek_creep` AI action can ride it (registerAIAction), no engine edits.
- The Eldritch incursion plants `blightgrowth` at its in-zone event sites
  (the corruption's spatial footprint) and `cleanseAt` rides its collapse
  payoff — see `src/packages/overlays/incursion.ts`.
