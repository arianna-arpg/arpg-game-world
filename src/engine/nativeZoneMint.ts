/** Exact native recipe mint, independent of graph ownership and registry globals.
 * Definitions/callbacks are explicit. The classic adapter supplies live native
 * sources; another owner must supply captured sources or a verified compiler
 * source certificate. Topology hooks run at their original RNG positions. */
import { clamp } from '../core/math';
import { Rng } from '../core/rng';
import type { ZoneDef, ZoneExitDef, ObjectiveSpec } from '../data/zones';
import type { TilesetDef } from '../data/tilesets';
import type { BiomeInfo } from '../world/biomes';
import type { MapCoord } from '../world/coords';
import type { AtlasDestination, LocalePlan } from '../world/locales';
import type { CourseMintHints } from '../world/courses';
import type { ZoneSpec } from './worldgen';

export interface NativeZoneMintInput {
  target: MapCoord; source: ZoneDef | null; genIndex: number; spec: ZoneSpec;
  geographyEligible: boolean | undefined;
  destinationSeed: number | null;
  destination?: AtlasDestination;
  locale?: LocalePlan;
  scarp?: ReturnType<typeof import('../world/escarpments').escarpmentAt>;
}
export interface NativeZoneMintProviders {
  TILESETS: Readonly<Record<string, TilesetDef>>;
  BIOMES: Readonly<Record<string, BiomeInfo>>;
  BIOME_FIELD_CFG: Pick<typeof import('../world/biomes').BIOME_FIELD_CFG, 'deepThreshold'>;
  MARINE_MINT: typeof import('../world/biomes').MARINE_MINT;
  PORT_MINT: typeof import('../world/biomes').PORT_MINT;
  WAR_PAIRS: typeof import('../data/monsters').WAR_PAIRS;
  ESCARPMENT_CFG: typeof import('../world/escarpments').ESCARPMENT_CFG;
  SPECIAL_ARENA_THEME: ZoneDef['theme'];
  PORT_COAST: string; SPECLESS_H_STRETCH: number; LOCALE_LAYOUT: string;
  pickDockTileset: typeof import('../data/tilesets').pickDockTileset;
  pickTilesetForBiome: typeof import('../data/tilesets').pickTilesetForBiome;
  pickTilesetVariant: typeof import('../data/tilesets').pickTilesetVariant;
  biomeSpacing: typeof import('../world/biomes').biomeSpacing;
  isAquaticBiome: typeof import('../world/biomes').isAquaticBiome;
  dimensionDef: typeof import('../world/dimensions').dimensionDef;
  hasLayout: typeof import('./levelgen').hasLayout;
  expandExplorationSize: typeof import('../world/zoneVariety').expandExplorationSize;
  pickExplorationLocale: typeof import('../world/zoneVariety').pickExplorationLocale;
  localeProgram: typeof import('../world/locales').localeProgram;
  compileLocale: typeof import('../world/locales').compileLocale;
  localeSeed: typeof import('../world/locales').localeSeed;
  atlasSeedInstalled: typeof import('../world/atlas').atlasSeedInstalled;
  featuresAt: typeof import('../world/atlas').featuresAt;
  foldFeatureHits: typeof import('../world/atlas').foldFeatureHits;
  bakeAtlasContext: typeof import('../world/atlas').bakeAtlasContext;
  lairLandmarkRolls: typeof import('./lairs').lairLandmarkRolls;
  rollObjective(rng: Rng, weights: TilesetDef['objectives'], spawnerId: string): ObjectiveSpec;
  pickLayout(biome: string | undefined, target: MapCoord, rng: Rng, biomeFor?: (at: MapCoord) => string): string;
  applyBlend(def: ZoneDef, tileset: TilesetDef, variantName: string | undefined, override: ZoneSpec['blend'], mergePacks: boolean): void;
  applyAnnexes(def: ZoneDef, tileset: TilesetDef): void;
  rollSeed(): number;
  warn(message: string): void;
}
export interface NativeZoneTopologyBase { map: MapCoord; exits: ZoneExitDef[] }
export interface NativeZoneTopologyPrepare {
  rng: Rng; id: string; tileset: TilesetDef; zoneBiome: string | undefined;
  nodeSep: number; onCourse: CourseMintHints | null;
}
export interface NativeZoneTopologyContinuation<T extends NativeZoneTopologyBase> {
  rng: Rng; size: ZoneDef['size']; tileset: TilesetDef;
  onCourse: CourseMintHints | null; topology: T;
}
export interface NativeZoneMintTopology<T extends NativeZoneTopologyBase> {
  /** Read at the original name-roll boundary. */
  names(): readonly string[];
  /** Original map/frontier draws, after variant/objective/biome/course reads. */
  prepare(input: NativeZoneTopologyPrepare): T;
  /** Original course continuation draws, after native footprint/locale rolls. */
  continueCourse(input: NativeZoneTopologyContinuation<T>): void;
  waypointBlocked(id: string, target: MapCoord): boolean;
}
export function mintNativeZone<T extends NativeZoneTopologyBase>(
  input: NativeZoneMintInput, providers: NativeZoneMintProviders, topology: NativeZoneMintTopology<T>,
): { zone: ZoneDef; rng: Rng; identityRng: Rng; topology: T } {
  const { target, source: src, genIndex, spec, geographyEligible, destinationSeed, destination, scarp } = input;
  let { locale } = input;
  const { TILESETS, BIOMES, BIOME_FIELD_CFG, MARINE_MINT, PORT_MINT, WAR_PAIRS, ESCARPMENT_CFG, SPECIAL_ARENA_THEME,
    PORT_COAST, SPECLESS_H_STRETCH, LOCALE_LAYOUT, pickDockTileset, pickTilesetForBiome, pickTilesetVariant,
    biomeSpacing, isAquaticBiome, dimensionDef, hasLayout, expandExplorationSize, pickExplorationLocale,
    localeProgram, compileLocale, localeSeed, atlasSeedInstalled, featuresAt, foldFeatureHits, bakeAtlasContext,
    lairLandmarkRolls, rollObjective, pickLayout, applyBlend, applyAnnexes, rollSeed, warn } = providers;
  const rng = new Rng(spec.seed ?? rollSeed());
  // THE IDENTITY SUB-STREAM: an EXPLICITLY seeded mint resolves the zone's
  // IDENTITY rolls (variant, objective, footprint, layout, war roll) on a
  // stream of their own. The shared `rng` also feeds name-dedupe retries and
  // frontier/exit picks — draws whose COUNT depends on what already exists
  // in this world — so identical seeds minted into two different worlds
  // diverged by the time the layout picked (the perf gate's pinned zones
  // re-rolled layouts per run). Seedless mints keep every draw on the one
  // shared stream, byte-identical to every zone ever rolled.
  const genRng = spec.seed !== undefined ? new Rng((spec.seed ^ 0x51ed2ab9) >>> 0) : rng;
  // HEAT-MAP AUTHORITATIVE (random frontier only): re-select the WHOLE tileset from
  // the biome field at this coord, so theme/packs/layout/decoration/biome all match
  // the region you explored INTO — not the inherited corridor tileset. Authored
  // quest/demon/crusade/incursion mints leave fieldBiome unset → spec.tileset wins,
  // byte-identical. Seeded by the zone rng, so revisits/co-op stay deterministic.
  let tilesetId = spec.tileset ?? 'deepwood';
  // A directed mint with NO tileset and NO field resolution is an authoring
  // slip — the deepwood fallback still applies, but loudly.
  if (!spec.tileset && !(spec.fieldBiome && spec.biomeFor)) {
    warn(`[worldgen] mint '${spec.id ?? `gen_${genIndex}`}' from '${src?.id ?? '?'}' declares no tileset — falling back to 'deepwood'`);
  }
  if (spec.port) {
    // A PORT is a shore — but WHICH shore is face-level data: the local
    // biome's DOCK-WEIGHTED faces host it (TilesetDef.docks × depthAffinity,
    // pickDockTileset — harbors grow on landward faces, never on brine pans
    // or half-drowned ground), and a biome fielding no dockable face cedes
    // the harbor to the classic coast (PORT_MINT.fallbackBiome).
    const fb = spec.fieldBiome && spec.biomeFor ? spec.biomeFor(target) : undefined;
    tilesetId = (fb ? pickDockTileset(fb, rng, spec.biomeDepthFor?.(target)) : undefined)
      ?? pickDockTileset(PORT_MINT.fallbackBiome, rng)
      ?? tilesetId;
  } else if (spec.fieldBiome && spec.biomeFor) {
    const fb = spec.biomeFor(target);
    let picked: string | undefined;
    // MARINE DEPTH: the edge of a marine region is shallow (isle/coast); its HEART is
    // the true DEEP SEA — so how DEEP into the region the coord sits decides the tileset
    // ("migrate deep into the marine biome → the deep-sea zone spawns").
    if (BIOMES[fb]?.marine) {
      const depth = spec.biomeDepthFor?.(target) ?? 0;
      picked = depth >= BIOME_FIELD_CFG.deepThreshold
        ? pickTilesetForBiome(MARINE_MINT.deepBiome, rng)
        : pickTilesetForBiome(BIOMES[fb]?.marine === 'coast' ? fb : MARINE_MINT.openShallowBiome, rng);
    }
    // SUB-BIOME STAGING: land biomes with depth-affine faces (the desert's
    // waste/erg/glasspan) weigh the pick by how deep into the region this
    // mint sits — same lever the marine split reads, generalized as data.
    // GEO-LOCKED faces (TilesetDef.geoAffinity) fold the coord's baked
    // climate the same way — the mountain country's per-range snow lock.
    // A dimensioned mint widens the pool with its realm's own tilesets
    // (TilesetDef.realm) — surface mints pass no realm, byte-identical.
    picked = picked ?? pickTilesetForBiome(fb, rng, spec.biomeDepthFor?.(target), spec.dimension,
      spec.climateFor?.(target, spec.dimension));
    if (picked) tilesetId = picked;
  }
  // Same guard mintCave carries: a directed mint naming an unregistered
  // tileset must degrade loudly to a real one, never crash the mint chain.
  let tileset = TILESETS[tilesetId];
  if (!tileset) {
    warn(`[worldgen] mint '${spec.id ?? `gen_${genIndex}`}' names unregistered tileset '${tilesetId}' — falling back to 'deepwood'`);
    tilesetId = 'deepwood';
    tileset = TILESETS[tilesetId];
  }
  const id = spec.id ?? `gen_${genIndex}`;
  // LEVEL priority: explicit spec.level (authored/quest/event mints) → the DIFFICULTY
  // FIELD at this coordinate (random frontiers: radial danger geography) → the legacy
  // source.level + 1 fallback. The field reads `target` — the SAME projected coord the
  // portal label samples (placeExit) — so the "Uncharted · Lv N" preview is exact.
  const level = spec.level ?? spec.levelFor?.(target) ?? (src ? src.level + 1 : 1);

  // Sub-biome variant: rolled once, folded into BOTH the name and the layout.
  // The tileset's COMMON rows then ride every roll — a variant re-authors the
  // dressing that CHANGES; common carries what the biome always is.
  let layout = tileset.layout;
  let variantName: string | undefined;
  let variantTheme: Partial<ZoneDef['theme']> | undefined;
  let variantLayoutParams: Record<string, unknown> | undefined;
  if (tileset.variants && tileset.variants.length) {
    // A NAMED face (spec.variant — perf-gate pins, dev mints) skips the roll;
    // the spec-less stream stays byte-identical. Unknown names warn and roll.
    // The roll itself is pickTilesetVariant — TilesetVariant.weight honored,
    // all-weights-absent byte-identical to the old uniform pick.
    const forced = spec.variant ? tileset.variants.find(x => x.name === spec.variant) : undefined;
    if (spec.variant && !forced) {
      warn(`[worldgen] mint '${spec.id ?? `gen_${genIndex}`}': tileset '${tileset.id}' has no variant '${spec.variant}' — rolling`);
    }
    const v = forced ?? pickTilesetVariant(genRng, tileset.variants);
    variantName = v.name;
    layout = v.layout;
    variantTheme = v.theme; // a face may RECOLOR itself (merged over base below)
    variantLayoutParams = v.layoutParams; // …and retune its recipe knobs (merged below)
  }
  if (tileset.common && tileset.common.length) layout = [...tileset.common, ...layout];

  // A name nobody on the map is wearing yet (or an explicit override — the Caravan
  // pre-derives its destination name so the menu label matches the minted zone).
  const taken = new Set(topology.names());
  let name = spec.name ?? '';
  if (!name) {
    // THE BARE-NAME LAW: the rolled face is DATA (ZoneDef.variantName, set
    // below), never baked into the walking name — portals, banners and event
    // lines stay clutter-free, and the MAP pane supplies the sub-biome
    // typing deliberately (the zone box's biome chip).
    for (let tries = 0; tries < 12; tries++) {
      name = `${rng.pick(tileset.nameFirst)} ${rng.pick(tileset.nameSecond)}`;
      if (!taken.has(name)) break;
    }
    if (taken.has(name)) name += ' II';
  }

  // An objectivePool spec (a pocket form) filters the tileset's weights before
  // the roll — same single draw, so only the spec'd mint's stream shifts. An
  // emptied pool degrades to 'clear' without drawing (nothing to weigh).
  const objWeights = spec.objectivePool
    ? tileset.objectives.filter(o => spec.objectivePool!.includes(o.kind))
    : tileset.objectives;
  const objective = spec.objective
    ?? (objWeights.length ? rollObjective(genRng, objWeights, tileset.spawnerId) : { kind: 'clear' as const });

  // The zone's biome (authored tileset tag, else the heat-map field) — drives BOTH
  // the layout generator (below) AND the map SPACING (the per-biome density lever:
  // grove tight, desert spacious). Computed once here so placement can read it.
  const zoneBiome = tileset.biome ?? spec.biomeFor?.(target);
  const nodeSep = biomeSpacing(zoneBiome);

  // COURSE hints — does this mint ride a declared throughline? Gated on
  // fieldBiome (the winding-bend discipline) and CROSS-CHECKED against the
  // sampled biome: a feather-band coord whose dither fell OFF the course gets
  // no artery dressing, so hints and heat map never disagree. A NON-painting
  // course (rivers) crosses whatever country it crosses — it never touched
  // the heat map, so there is nothing to disagree with.
  const courseHints = spec.fieldBiome ? spec.courseFor?.(target) ?? null : null;
  const onCourse = courseHints
    && (courseHints.spec.paints === false || courseHints.spec.biome === zoneBiome)
    ? courseHints : null;

  const topologyResult = topology.prepare({ rng, id, tileset, zoneBiome, nodeSep, onCourse });
  const { map, exits } = topologyResult;

  // Roll a varied footprint: an independent width and an ASPECT class. A
  // sizeBand spec (a pocket form's deliberate hollow) swaps the bands under
  // the SAME two draws — spec-less mints keep every stream byte-identical.
  const rolledShape = genRng.chance(tileset.ellipseChance ?? 0) ? 'ellipse' as const : 'rect' as const;
  let shape = spec.shape ?? rolledShape;
  const aspect = genRng.pick([1, 1, 0.64, 1.55, 0.78, 1.32]);
  const bandW = spec.sizeBand?.w ?? tileset.sizeW;
  const bandH = spec.sizeBand?.h ?? tileset.sizeH;
  const baseW = genRng.range(bandW[0], bandW[1]);
  const size = {
    w: Math.round(baseW),
    h: Math.round(clamp(baseW * aspect, bandH[0], bandH[1] * (spec.sizeBand ? 1 : SPECLESS_H_STRETCH))),
  };
  const ordinary = geographyEligible && !locale && !spec.sizeBand && !spec.shape && !spec.noWeave
    && !spec.objective && !onCourse && !tileset.forceLayout && !tileset.boundless && !isAquaticBiome(zoneBiome);
  if (ordinary) {
    Object.assign(size, expandExplorationSize(size, 'surface'));
    const varietySeed = spec.seed ?? localeSeed(`${destinationSeed}/${id}/${target.x}/${target.y}`);
    const selected = pickExplorationLocale(zoneBiome, varietySeed);
    const program = selected ? localeProgram(selected) : undefined;
    if (program) {
      locale = compileLocale(program, varietySeed);
      Object.assign(size, locale.size ?? program.size);
      shape = 'rect';
    }
  }
  topology.continueCourse({ rng, size, tileset, onCourse, topology: topologyResult });

  // Biome (computed above as zoneBiome): the authored tileset tag wins; else the
  // heat-map FIELD fills it. The biome then dictates which LAYOUT GENERATOR shapes the
  // zone (default 'plains'), stored on the def so revisits replay the topology.
  const biome = zoneBiome;
  // An authored set-piece arena forces its layout; a COURSE may force its
  // recipe on the zones riding it (the river's riverland carve in whatever
  // local dress the tileset wears); a tileset FACE may pin its own (the
  // chasm-maze reach vs the stone-forest weald); otherwise the biome rolls
  // from allowedLayouts. Pins branch BEFORE the roll, so the rng stream
  // shifts only for pinned mints — every existing mint's draw order is
  // untouched (the cave-mint forceLayout contract, mirrored).
  const rolledLayout = spec.layoutType ?? onCourse?.forceLayout ?? onCourse?.spec.forceLayout ?? tileset.forceLayout
    ?? pickLayout(biome, target, genRng, spec.biomeFor);
  const layoutType = locale ? LOCALE_LAYOUT : rolledLayout;
  // generateLayout degrades an unregistered layout id to 'plains' silently —
  // say so at mint, where the authoring slip (a quest def's layoutType typo)
  // is one hop away. Biome allowedLayouts are boot-validated; this covers the
  // directed spec path those validators can't see.
  if (layoutType !== 'plains' && !hasLayout(layoutType)) {
    warn(`[worldgen] mint '${id}' names unregistered layout '${layoutType}' — generateLayout will fall back to 'plains'`);
  }
  // GEO context — how deep inside its biome blob the zone sits (0 = edge, 1 =
  // interior), from the EXISTING biome-depth sampler (sim.biomeField.sampleDepth,
  // already threaded for the marine shallow-isles/deep-sea split), plus the
  // CLIMATE axes at the coordinate (rounded for tidy serialization). Pure field
  // reads, NO rng — directed mints without samplers simply carry no geo.
  // Computed BEFORE the roll merges (a pure hoist, stream-invisible): the
  // lair fold reads it, so deep-country natives can claim the heart of a
  // biome and refuse its border (the roost law).
  const climate = spec.climateFor?.(target, spec.dimension);
  const geo0 = (spec.biomeDepthFor || climate || scarp)
    ? {
      ...(scarp ? { escarpment: scarp } : {}),
      ...(spec.biomeDepthFor ? { biomeDepth: Math.max(0, Math.min(1, spec.biomeDepthFor(target))) } : {}),
      ...(climate ? {
        climate: Object.fromEntries(Object.entries(climate).map(([k, v]) => [k, Math.round(v * 100) / 100])),
      } : {}),
    }
    : undefined;
  // THE ATLAS FEATURES (world/atlas.ts): a RANDOM-FRONTIER surface mint that
  // stands within reach of a summit / lode / lake basin INHERITS it — the ids
  // and a relief lift baked onto geo (the def carries the truth, like
  // climate), its landmark + composition rolls appended AFTER the zone's
  // own (tail draws: every feature-less mint's stream is untouched), its
  // recipe knobs merged below the mint spec's. Directed mints and other
  // dimensions never look (the frontier law); no installed seed = no hits.
  const atlasSeed = atlasSeedInstalled();
  const featureHits = spec.fieldBiome && (spec.dimension ?? 'surface') === 'surface'
    ? featuresAt(target) : [];
  const featureFold = featureHits.length ? foldFeatureHits(featureHits) : null;
  const atlasContext = featureFold && atlasSeed !== null
    ? bakeAtlasContext(target, atlasSeed, featureHits) : undefined;
  const geo = featureFold?.ids.length
    ? { ...(geo0 ?? {}), features: featureFold.ids, atlas: atlasContext,
      ...(featureFold.relief ? { relief: featureFold.relief } : {}) }
    : geo0;
  // STRUCTURE ROLLS: merge the tileset's chances with the biome's (both pure
  // data). Baked onto the def so revisits/co-op replay the same rolls, and so
  // the bastion layout resolves its candidate pool from the zone itself. Special
  // arenas skip them (a boss arena owns its own furniture).
  const structureRolls = spec.special || locale ? [] : [
    ...(tileset.structures ?? []),
    ...(biome ? BIOMES[biome]?.structures ?? [] : []),
  ];
  const landmarkRolls = spec.special || locale ? [] : [
    ...(tileset.landmarks ?? []),
    ...(biome ? BIOMES[biome]?.landmarks ?? [] : []),
    // A port ALWAYS gets its shoreline (the harbor's reason to exist).
    ...(spec.port ? [{ landmark: PORT_COAST, chance: 1 }] : []),
    ...(onCourse?.landmarks ?? []),
    ...(featureFold?.landmarks ?? []),
    // THE LAIR FABRIC (engine/lairs.ts): natives that claim this biome at
    // this level seat their lair rolls beside the authored ones — pure
    // predicate here; the chance draws in generateLayout's landmark loop
    // like any other row (unclaimed ground burns no rng). Course mints
    // carry their course id, so a native may claim the rivers themselves.
    ...lairLandmarkRolls({
      place: 'surface', biome, level, tileset: tileset.id, port: spec.port,
      course: onCourse?.spec.id,
      biomeDepth: geo?.biomeDepth, climate: geo?.climate,
    }),
  ];
  // COMPOSITION ROLLS: the whole-zone coordinated bundles, same merge + bake
  // discipline as structures/landmarks (special arenas skip them too).
  const compositionRolls = spec.special || locale ? [] : [
    ...(tileset.compositions ?? []),
    ...(biome ? BIOMES[biome]?.compositions ?? [] : []),
    // A course TERMINUS bakes its reward rolls onto the def like any other
    // roll source (revisits/co-op replay them — the same discipline).
    ...(onCourse?.compositions ?? []),
    ...(featureFold?.compositions ?? []),
  ];
  // (GEO hoisted above the roll merges — the lair fold reads it there.)
  // Layout knobs, spec ▷ atlas ▷ course/stage ▷ variant ▷ tileset ▷ biome (most-specific
  // wins) — baked so revisits/co-op replay the same recipe tweaks. A course
  // slots UNDER the spec (a directed mint may still override the artery's
  // orientation); the rolled FACE slots between its tileset and the course
  // (the theme-merge precedence, mirrored onto recipe knobs).
  const layoutParams = {
    ...(biome ? BIOMES[biome]?.layoutParams : undefined),
    ...tileset.layoutParams,
    ...variantLayoutParams,
    ...onCourse?.layoutParams,
    ...featureFold?.layoutParams,
    ...spec.layoutParams,
  };
  // WAYPOINT VETO: no waypoint may spawn within an existing exclusion zone's radius
  // (the anti-teleport gate around a boss arena). Excludes the zone being minted from
  // its own radius. Measured in Euclidean node-space (the same convention everywhere).
  // A WAYPOINTLESS DIMENSION (DimensionDef.waypoints: false — the Aetherial)
  // vetoes outright, AFTER the ??-chain so the seeded draw order is untouched.
  // A 'leyline' roll FORCES the stone (the besieged waypoint IS the ask) —
  // OR-ed after the chance draw so the seeded stream is byte-identical for
  // every other mint; ground the vetoes still refuse degrades the objective
  // back to 'clear' below (a leyline zone without a waypoint is incoherent).
  const wpCand = ((spec.forceWaypoint ?? rng.chance(0.3)) || objective.kind === 'leyline')
    && dimensionDef(spec.dimension).waypoints !== false;
  const wpBlocked = topology.waypointBlocked(id, target);
  const objectiveFinal: ObjectiveSpec =
    objective.kind === 'leyline' && (wpBlocked || !wpCand) ? { kind: 'clear' } : objective;
  // SKY EXPOSURE bake (spec ▷ tileset, most-specific wins): a sheltered
  // interior carries its roof on the def, so skyOf() answers from pure
  // zone data everywhere (engine, sim, renderer, both co-op sides).
  const sky = spec.sky ?? tileset.sky;
  // CAMERA PIN bake (the sky law, same precedence): the biome's claim on its
  // frame rides the def so the renderer's existing chain (render/camera.ts:
  // ZoneDef.camera ▷ Settings ▷ CAMERA_CFG.default) picks it up unchanged.
  // Absent everywhere = no key, byte-identical — no draw burns either way.
  const camera = spec.camera ?? tileset.camera;
  const def: ZoneDef = {
    id, name, level,
    ...(locale ? { locale, destination } : {}),
    size,
    shape, biome,
    // MINT PROVENANCE (the face-voice seam): the resolved face this ground
    // wears — post-fallback, post-field-repick, so it is always the truth.
    tileset: tilesetId,
    // AQUATIC (the coherence fabric): open-seabed biomes stamp the flag so
    // habitat-bearing flora places freely and the default gravel exit-road
    // stands down — durable on the def, one classifier (isAquaticBiome).
    ...(isAquaticBiome(biome) ? { aquatic: true } : {}),
    theme: spec.special ? SPECIAL_ARENA_THEME
      : variantTheme ? { ...tileset.theme, ...variantTheme } : tileset.theme,
    layout: locale ? [] : layout,
    ...(layoutType !== 'plains' ? { layoutType } : {}),
    objective: objectiveFinal,
    // The biome's puzzle repertoire + ambient scenery-actors ride the def
    // (rolled at LOAD on salted streams — never a generation concern).
    ...(tileset.puzzles ? { puzzles: tileset.puzzles } : {}),
    ...(tileset.scenery ? { scenery: tileset.scenery } : {}),
    // SECRET HOLLOWS (the hollows fabric): the tileset's budget rides onto
    // SURFACE mints too — mintCave carried it from day one, but this literal
    // never did, so every authored surface budget (the downs' tor caches,
    // the warrens' squats + stairwells) was silently inert. stampHollows
    // runs LAST in generateLayout, so the bake shifts no earlier draw.
    ...(!locale && tileset.hollows ? { hollows: tileset.hollows } : {}),
    packs: spec.packsOverride ?? tileset.packs,
    exits,
    map,
    waypoint: wpBlocked ? false : wpCand,
    // THE KNOWLEDGE LAW: born veiled (ZoneSpec.veiled above); World.visible
    // and the knowledge acts lift it.
    ...(spec.veiled === false ? {} : { veiled: true }),
    ...(spec.wpExclusionRadius ? { wpExclusionRadius: spec.wpExclusionRadius } : {}),
    // A SPECIAL arena ignores the biome and locks out overlay events (eventOwned).
    ...(spec.special ? { special: true, eventOwned: true } : {}),
    factionWar: spec.noFactionWar ? undefined : (genRng.chance(0.18) ? genRng.pick(WAR_PAIRS) : undefined),
    seed: spec.seed ?? rollSeed(), // fixed: this zone keeps its layout across revisits
    ...(variantName ? { variantName } : {}),
    ...(spec.floating ? { floating: true } : {}),
    ...(spec.concealed ? { concealed: true } : {}),
    ...(structureRolls.length ? { structures: structureRolls } : {}),
    ...(landmarkRolls.length ? { landmarks: landmarkRolls } : {}),
    ...(compositionRolls.length ? { compositions: compositionRolls } : {}),
    ...(geo ? { geo } : {}),
    ...(onCourse?.journey ? { journey: onCourse.journey } : {}),
    // AQUATIC (the coherence fabric): open-seabed biomes stamp the flag so
    // habitat-bearing flora places freely and the default gravel exit-road
    // stands down — durable on the def, one classifier (isAquaticBiome).
    ...(isAquaticBiome(biome) ? { aquatic: true } : {}),
    ...(Object.keys(layoutParams).length ? { layoutParams } : {}),
    ...(spec.kind ? { kind: spec.kind } : {}),
    ...(spec.port ? { port: true } : {}),
    ...(spec.dimension ? { dimension: spec.dimension } : {}),
    ...(spec.pocket ? { pocket: true } : {}),
    ...(sky ? { sky } : {}),
    ...(camera ? { camera } : {}),
  };
  if (scarp?.blockedSide) {
    // No frontier may promise a crossing through the impassable face.
    def.exits = def.exits.filter(e => e.side !== scarp.blockedSide);
  }
  // Existing river geography remains material inside a cliff locale.
  if (scarp && locale && onCourse && !locale.river) locale.river = {
    ...ESCARPMENT_CFG.river,
  };
  // THE BLEND (engine/blend.ts): resolve a declared partner onto the def —
  // layout rows tagged, pack tables merged — off the def seed's dedicated
  // sub-stream (blendless mints keep every draw byte-identical).
  if (!locale) applyBlend(def, tileset, variantName, spec.blend, !spec.packsOverride);
  // THE ANNEX ROLL (the growing zone): dormant secret chains onto the def,
  // whole from its seed on their own salted stream — annex-less tilesets
  // burn zero draws (the blend law).
  if (!locale) applyAnnexes(def, tileset);
  return { zone: def, rng, identityRng: genRng, topology: topologyResult };
}
