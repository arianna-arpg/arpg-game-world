# The Workshop & the Forges

Dev-authored content as data — the creator/tweaker family in the
passive-tree-editor lineage. The **store** is `src/meta/workshop.ts`
(entities + drawn parts + drawn doodad kinds, one hybrid-persisted file);
the **editors** are `src/dev/entityForge.ts` (+ `src/dev/forgeSchema.ts`,
the inspector-as-data registry) and `src/dev/glyphForge.ts` (the drawing
editor for kit-parts and doodads), with an in-game seat at
`src/dev/tabs/entity.ts`. Gate: `config.ts DEV.entityForge`.

## The doctrine

**Registration is the whole trick.** The engine resolves defs by id re-lookup
(`MONSTERS[defId]`, `LOOKS[id]`) at use time, so a workshop entity grafted
into the live registries is a first-class citizen of every fabric — the
factory, the elite ladder, the mitigation ladder, kill credit, the bestiary,
portraits, spawn tables that name it — with **zero engine special-casing**.
Nothing anywhere knows the word "workshop" except the store itself.

**The namespace law.** Every workshop id starts with `custom_`.

- A graft may create or replace **only** prefixed ids — no authoring session
  can shadow shipped content (`graftWorkshopEntity` refuses; the
  registerFactions collision stance, sharpened to replace-by-id inside the
  namespace).
- Shipped content never claims the prefix — pinned by `probe_workshop`
  (`findPrefixSquatters`).
- `ungraftWorkshopId` is prefix-guarded: deleting workshop rows can never
  touch the authored roster. A stale character save referencing a deleted
  custom id simply skips that spawn (`createMonster` guards).

**Defs are JSON by construction.** `MonsterDef` and `LookDef` carry only
literal data (Modifier rows included), so the store round-trips losslessly
and the whole-def JSON pane in the forge is a truthful view.

## Persistence — the account pattern, plus named slots

Hybrid like the account: a synchronous **localStorage mirror**
(`arpg_workshop_v1`) plus the **disk lane's named `workshop` slot** →
`saves/save_workshop.json`. Boot order (`main.ts`):

1. `loadWorkshopSync()` — mirror → registries, **before** `validateContent()`,
   so workshop defs answer to the same one boot lint as shipped content.
2. `reconcileWorkshopFromDisk()` in the async disk block — the file is the
   cross-session authority; when it changes anything, `validateContent()`
   re-runs so adopted defs get linted too.

**Named save slots** are new vocabulary on the existing endpoints: both
implementations (`vite.config.ts` + `launcher/server.cjs` — keep in lockstep)
accept `/__save/(\d+|[a-z][a-z0-9_-]{0,31})`. The charset **is** the
path-safety guarantee (no dots, no separators — a slot cannot leave
`saves/`). Numeric slots stay the account family; names are tool stores, and
future tools (the queued stamp builder) get one for free.
`persistence.ts diskGet/diskPut/diskBeacon` take `number | string`.

## The forge surfaces

- **Start menu** — a `🛠 Entity Forge (Dev)` button injected through
  `UI.onStartMenuRender` (the `onTreeRender` idiom: the menu rebuilds its
  innerHTML per render, so entries re-inject). No run needed; author from the
  title screen.
- **Dev panel → Forge tab** — pick any def (workshop rows first), spawn it
  beside the hero at a chosen rarity (`devGrabSpawn` + `promoteMonster` — the
  real seams), or jump into the editor.
- **The full-screen editor** — roster (authored defs open **read-only** with a
  Clone-to-Workshop banner: the tweaker flow) · preview · inspector.

### The preview is honest

- **Compose view** paints the working look **directly** through
  `paintLook`/`paintLiveParts` — no bake in the loop at all. Drag a part to
  move it (`PartSpec.x/y` in body radii), wheel = scale, Ctrl+wheel / `[` `]`
  = rotate, `m` = mirror, arrows nudge, Del removes, Ctrl+Z undoes; drag
  empty canvas to orbit facing. The adornment-offset fabric this rides
  (`x/y/rot/scale/alpha/mirror` per part row, applied by `place()` around
  every painter) has existed since the part grammar — the forge is its
  editor, not a new layer.
- **Portrait view** is `drawPortraitInto` — the exact bestiary compositor
  (worm bodies and composite parts included). Because body bakes key on the
  **look id**, the working look registers under a **versioned scratch id**
  (`__forge_v<n>`, bumped per edit) so a stale sprite can never serve;
  `upsertWorkshopEntity` flushes bakes (`clearBakes`) on save for the same
  reason. Scratch ids are session-only and cleaned on close.

### The inspector is data

`forgeSchema.ts`: `FORGE_FIELDS` rows (dot-path, editor kind, option thunks
over the **live** registries — materials, factions, loot tables, presence
bands grow into the pickers with zero forge edits) + `ADVANCED_KEYS` JSON
panes for the long tail + the whole-def JSON escape hatch. Four rich panes
are bespoke: the look composer, the base-stat map (STAT_DEFS datalist,
unknown-stat warning), kit & grants (each skill row shows its `SkillDef.ai`
affordability hint — a kit that can never cast warns inline; grants are the
level-gated acquisition fabric), and brain (archetype quick-set over
`ARCHETYPES` + full BrainDef JSON). `setPath` prunes emptied parents so a def
never carries husk objects the engine would misread as opted-in.

### Validate / Spawn / Export

- **Save + Validate** re-runs the REAL `validateContent()` and shows the
  lines naming this entity — the same net shipped content answers to.
- **Spawn to Test** saves first (the graft is what spawning reads), then
  `devGrabSpawn` + optional `promoteMonster` at the preview rarity.
- **Export TS** (`serializeEntityTS`) emits def + look as source literals in
  the data files' house style (constructor-shaped mod rows print as `mod()`
  calls). Promotion into `src/data` is a deliberate hand act — the workshop
  is the sketchbook, the source tree stays the authored roster. The passive
  editor's whole-file rewrite lane was deliberately **not** reused:
  monsters.ts is 11k hand-authored lines, not an editor-owned file.

## The Glyph Fabric — painters as data

Shipped part kinds are hand-written painter functions; **glyphs are the data
tier under them** (`render/vis/parts.ts`): a `GlyphDef` is a vector op-list
in body space (unit = R, +X = facing) executed by ONE interpreter through
the same `place()` wrapper every painter opens with — so a hand-drawn part
inherits row transforms, palette-role ramps, materials, baking and live
animation exactly like shipped kinds. The op vocabulary is the measured 80%
of the painter corpus: smoothed/straight `poly`/`path`, `disc`, `ring`
(arc), per-op ±y `mirror` (the fangs/ears side-loop), `role`/`color` +
`shade` + `alpha` tones, px or R-relative stroke widths with the 1px floor,
the `outlined()` edge, and a `sway` sine drift that animates wherever a
clock flows. The long tail (volume() gradients, expression loops) stays
hand-written code, on purpose.

- `registerGlyphPart(kind, glyph)` — runtime registration under the same
  `custom_` namespace law (shipped painters unshadowable/untouchable);
  every dispatch site already guards unknown kinds, so deletion degrades to
  the silent skip.
- Note for tweakers: several shipped painters already carry variant params —
  e.g. **`snout` has `params: { ears: false }`** (the "muzzle + ear pair"
  painter with the ear block gated) — check the painter before redrawing.
- Promotion home: `src/data/glyphParts.ts` (`GLYPH_PARTS` +
  `registerShippedGlyph`, collision-refusing) — Export TS emits its rows.

## The Part Forge & the Doodad Forge (`dev/glyphForge.ts`)

One drawing surface, two modes (start-menu "Part & Doodad Forge" button —
the `onStartMenuRender` hook CHAINS, entity forge first):

- **PART mode**: draw ops (poly/path click-to-place with Enter/dbl-click
  commit, disc/ring center+rim, select-drag to move), per-op inspector
  (role/color/shade/alpha, fill/stroke/outline/mirror/smooth/closed, widths,
  sway), **STENCIL TRACE** (any `PART_PAINTERS` kind rendered faintly under
  your strokes — the "candid snout" flow), a multi-radius preview strip, and
  Save → `upsertWorkshopGlyphPart` → the kind appears live in the Entity
  Forge's add-part list ("✎ draw new…" cross-links back).
- **DOODAD mode**: the same drawing plus look dials (color with
  `'theme:key|#fallback'` biome dressing, material, order/shadow/longShadow,
  light spec) and the **WHOLE `DoodadRule`** (overlap class, blocking flags,
  spacing, bodyScale + a full-rule JSON pane for brittle/contact/clearway/
  habitat/…). **AUTO-COLLISION**: `deriveGlyphSurface` reads the drawn
  extents — round drawings become a tightened disc (`rule.bodyScale`),
  oblong ones the rect `rule.surface` (spun with the seeded rot) — the two
  data lanes `hitSurfaceOf` resolves, so movement, shots, sight and nav all
  test what was drawn; the derived shape is overlaid dashed and overridable.
  Graft writes `DOODAD_VISUALS[kind]` (painter `'glyph'` —
  `render/vis/glyphDoodad.ts`, registered under the paintersGloam contract)
  + `registerDoodadRule` (with the new quiet `unregisterDoodadRule` for
  warn-free re-grafts). Place-at-hero / sprinkle push instances into the
  live zone — the doodad index and nav self-heal by construction. Export TS
  emits the visuals row + rule registration + a scatter `StampSpec` hint.

Schema note: the workshop file is v2 (`entities` + `glyphParts` +
`doodads`); v1 files are adopted whole — additive arrays default empty, an
upgrade never wipes. Structures are deliberately NOT doodads and stay a
separate future pass (grid-plan machinery: rooms/doors/roofs).

## Boundaries (by design)

- **Co-op**: snapshots ship look ids; a joining client without the same
  workshop file draws fallback bodies. Dev tool, host-authoritative —
  documented, not wired.
- **World-boss/package rosters** (`WorldBossSurge.defs`, faction tables) are
  package data; the forge authors the *def* side (incl. `parts` composites
  and `worm` bodies via Advanced). Wiring a custom into an overlay roster is
  a source edit after promotion.
- The `__forge_v*` scratch ids are filtered from every roster list.

## Dials & gates

`FORGE_CFG` (entityForge.ts) — canvas size, grab radius, nudge/rot/scale
steps, undo cap. Store constants (`WORKSHOP_PREFIX`, `WORKSHOP_SLOT`, schema
version) in workshop.ts.

Probe: `npx tsx balance/probe_workshop.ts` — the namespace law both
directions, graft/ungraft weave + def↔look invariant, the save-shape gate,
first-class combat citizenship through the real factory/ladders (spawn,
promote, wound, die-with-credit), the validator same-net rule, the TS
emitter, and the dot-path laws. Baseline: inert for normal play (no workshop
rows = byte-identical registries; `sim baseline check` green).
