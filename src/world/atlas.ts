// ---------------------------------------------------------------------------
// THE ATLAS FABRIC — the world map as SHOWN ground, and MAP FEATURES as data
// that the zones minted on them INHERIT.
//
// Two halves, one seed:
//   THE CHART (the pure shading law here; the painter in ui/atlasPaint.ts) —
//   the foreordained terrain fields (continents → climate/elevation → biome →
//   rivers) painted as a RELIEF MAP: hillshade lit from the north-west,
//   contour bands, a snowline, sea shelves, living rivers, lake basins and
//   biome dressing. Everything drawn is a pure function of the seed — the
//   same truth every mint samples — so the map can never show ground the
//   world would not grow.
//   THE FEATURES (the registry below) — notable places computed WHOLE at
//   first touch from the same fields (the foreordained tenet, applied to
//   places): SUMMITS (local maxima of the elevation axis on a lattice),
//   LODES (strewn, elevation-gated ore country), LAKE BASINS (where a traced
//   river dies inland). Each KIND is one data row (data/atlasFeatures.ts):
//   how it is FOUND, how far it REACHES, what a zone minted within reach
//   INHERITS (landmark rolls, recipe knobs, a harvest bounty, a relief
//   lift) and what the zone pane READS. worldgen folds the hits at the ONE
//   mint chokepoint (placeZoneAt) into ZoneDef.geo — `features` (ids) +
//   `relief` — and every downstream reader (levelgen's elevation field, the
//   harvest boot, the pane) reads the DEF, never the registry at gen time:
//   the def carries the truth, exactly like geo.climate.
//
// THE LAWS:
//   DRAWN == INHERITED — the chart's marks and the mint's hits come from ONE
//     finder (featuresInRect / featuresAt share the per-cell memo).
//   THE SEED IS THE PLAN — no rng anywhere; features exist before anyone
//     looks (a probe names every summit in a rect on a fresh process).
//   THE FRONTIER LAW — only RANDOM-FRONTIER surface mints inherit (the
//     course fabric's discipline): directed mints (quests, events, realms)
//     and every zone off every feature stay byte-identical.
//   THE INSTALLED TRUTH — setAtlasSeed at sim boot beside setReliefSeed; no
//     seed installed = no features (a headless rig that never installs it
//     sees the old world exactly).
//   THE VEIL — the chart paints only near VISIBLE nodes (the wash's envelope
//     law), and terrain is seed truth, never node positions, so a veiled
//     forechart mint is never betrayed by the ground it stands on.
//
// Pure leaf of the world layer: coords, biomes/continents/climate/relief
// (sibling leaves), the zero-import hash, the zone-info registry. No engine,
// no DOM — every finder and the shading law run under node for the probe.
// ---------------------------------------------------------------------------

import type { MapCoord } from './coords';
import type { CompositionRoll, LandmarkRoll } from '../data/zones';
import { BIOMES } from './biomes';
import { continentAt, continentSeedFrom } from './continents';
import { CLIMATE_BANDS, climateAt, climateAxisAt } from './climate';
import { presenceMul } from '../engine/presence';
import { RELIEF_CFG, elevationAt, riverPathsInRect } from './relief';
import { hash01 } from '../engine/hash';
import { registerZoneInfoSource } from './zoneInfo';

export const ATLAS_CFG = {
  /** The raster: pixel budget per side, the sampling lattice (px between
   *  field samples — pixels between are bilinear), the per-tick build
   *  budget (ms; the painter is PROGRESSIVE — the old chart stands while
   *  the new one builds), the image opacity over the panel ground, and the
   *  px-per-node-unit clamps (a tiny early map never over-samples; a huge
   *  late one coarsens instead of growing without bound). */
  raster: { maxPx: 720, lattice: 2, budgetMs: 22, opacity: 0.94, minPxPerUnit: 0.05, maxPxPerUnit: 0.6,
    /** THE ZOOM WINDOW: zoomed past `zoomWindowFrom`, the painter renders the
     *  VIEW (× `zoomWindowPad` margin) at full resolution instead of the whole
     *  charted country, so a close look stays crisp however far the chart
     *  has grown; the window snaps coarsely so small pans re-use the raster. */
    zoomWindowFrom: 1.6, zoomWindowPad: 1.5,
    /** Finished rasters kept (LRU): the base chart + a few zoom windows. */
    cacheEntries: 8 },
  /** THE VEIL: ground within `radius` of a KNOWN node paints in full, fades
   *  over `feather`, and is void beyond — THE KNOWLEDGE LAW's soft edge (the
   *  same discs clip every overlay wash). `cell` is the mask lattice. */
  reveal: { radius: 240, feather: 240, cell: 40 },
  /** HILLSHADE: the light vector (from the north-west, above), the slope →
   *  normal gain (elevation is ~0.3 across a 1000-unit ridge, so slopes are
   *  ~1e-3 per unit — the gain lifts them to a visible tilt), the ambient
   *  floor, and the brightest a lit face may go. Flat ground reads 1.0. */
  shade: { light: [-0.62, -0.55, 0.55] as [number, number, number], gain: 1300, ambient: 0.48, maxLift: 1.34 },
  /** HYPSOMETRIC LIFT: the land pales with height beyond the hillshade (a map
   *  convention — highlands read high at any zoom); exactly 1.0 at 0.5. */
  hypso: { gain: 0.3 },
  /** THE SEAMS: a smooth domain warp (amplitude in node units, noise cell)
   *  on the biome/terrain SAMPLE alone, so Voronoi seams and coastlines
   *  wander organically instead of ruling straight — presentation only; the
   *  wobble is below node grain and every mint samples the true field. */
  seams: { warp: 34, cell: 210 },
  /** SNOWLINE + ALPINE ROCK: above `from` the land pales toward the tone,
   *  saturating at `to` (mix = how far it goes). */
  snow: { from: 0.8, to: 0.93, color: '#eef2f6', mix: 0.85 },
  alpine: { from: 0.66, to: 0.82, color: '#8f8a7e', mix: 0.5 },
  /** THE SEA: shelf width (node units of shallows off every shore), the
   *  shallow → deep gradient, and the foam fringe at the coast. */
  sea: { shelf: 240, shallow: '#2d6a92', deep: '#0b1a2e', foam: '#7fb0cc', foamReach: 0.11 },
  /** CONTOUR BANDS: elevation interval per band and the line's darkening. */
  contour: { interval: 0.07, alpha: 0.14 },
  /** Paper grain: ± luminance jitter per pixel (a painted, not a plotted, chart). */
  grain: 0.035,
  /** RIVERS: stroke width in px from spring to mouth, colours, and the
   *  reveal a segment needs to draw (fog hides the far run). */
  rivers: { width: [1.3, 4.2] as [number, number], color: '#5fa6d9', edge: '#163651', minReveal: 0.2 },
  /** Feature name labels (SVG text over the raster): reveal floor + font px. */
  labels: { minReveal: 0.5, font: 9 },
  /** Biome DRESSING glyphs: reveal floor, the px below which a glyph is not
   *  drawn, and the px floor between glyph sites (a late, coarse chart
   *  thins its dressing instead of speckling). */
  glyphs: { minReveal: 0.35, minPx: 2.8, minSpacingPx: 11 },
  /** Feature MARKS on the raster: reveal floor + px size clamps. */
  features: { minReveal: 0.35, minPx: 6, maxPx: 42 },
} as const;

// --- the registry -----------------------------------------------------------

/** A plain band gate over a climate axis (a strewn feature's country). */
export interface FeatureGate { axis: string; min?: number; max?: number }

/** How a kind's instances are FOUND — pure per (seed). */
export type FeatureFinder =
  /** A jittered lattice deal (the springs idiom): a cell rolls present with
   *  `chance`, stands on LAND only, and must pass every gate at its site. */
  | { kind: 'strewn'; span: number; chance: number; salt: number; jitter?: number; gates?: FeatureGate[] }
  /** LOCAL MAXIMA of the elevation axis on a jittered lattice: a site is a
   *  summit when it stands at or above `minElevation` and higher than all
   *  eight neighbouring sites. */
  | { kind: 'peaks'; span: number; minElevation: number; salt: number; jitter?: number }
  /** LAKE BASINS: a traced river (world/relief.ts) that ended INLAND — not at
   *  the sea, not at the reach bound — dies in a basin; the basin is the
   *  feature, sized by the run that fed it (`radius` over runs from
   *  `minRun` points up to the reach bound). */
  | { kind: 'lakes'; minRun: number; radius: [number, number] };

/** What a zone minted within a kind's reach INHERITS at the mint. */
export interface FeatureInherit {
  /** Landmark rolls appended after the zone's own (a summit's crag, a basin's mere). */
  landmarks?: LandmarkRoll[];
  /** Composition rolls appended after the zone's own. */
  compositions?: CompositionRoll[];
  /** Recipe knobs merged between the course's and the mint spec's. */
  layoutParams?: Record<string, unknown>;
  /** THE HARVEST BOUNTY (World.bootHarvest): extra node count rolled after
   *  the zone's own draw, and whether nodes ALWAYS stand (no stand roll). */
  harvest?: { bonus?: [number, number]; always?: boolean };
  /** THE RELIEF LIFT (levelgen's 'elevation' gen field): raise the zone's own
   *  height field and dome it toward its heart — high country grows what its
   *  high-ground stamps ask for. */
  relief?: { lift?: number; dome?: number };
}

export interface MapFeatureKindDef {
  id: string;
  /** Pane / label word ('summit'). */
  label: string;
  /** Chart glyph painter id (ui/atlasPaint.ts registry) for the mark. */
  glyph: string;
  /** Pane icon (one glyph char). */
  icon: string;
  color: string;
  find: FeatureFinder;
  /** Node-space reach: a zone minted within this of the seat inherits it. */
  reach: number;
  /** Visual size on the chart (node units) — lakes size themselves. */
  size?: number;
  /** "the {first} {second}" — absent = the label. */
  names?: { first: string[]; second: string[] };
  /** The pane's second line ('high ground — the summit stands in this country'). */
  read: string;
  inherit?: FeatureInherit;
}

export interface MapFeature {
  /** `${kind}:${a}_${b}` — the finder's cell (lattice kinds) or the rounded
   *  seat (lakes); stable per seed, so a def's `geo.features` ids re-resolve. */
  id: string;
  kind: string;
  seat: MapCoord;
  name: string;
  /** Visual size (node units). */
  size: number;
  /** Finder scalar — a summit's elevation, a lake's radius, a lode's elevation. */
  value: number;
}

export interface MapFeatureHit { feature: MapFeature; dist: number; def: MapFeatureKindDef }

const KINDS: Record<string, MapFeatureKindDef> = {};
const ORDER: string[] = [];

export function registerMapFeature(def: MapFeatureKindDef, overwrite = false): void {
  if (!overwrite && KINDS[def.id]) return;
  if (!KINDS[def.id]) ORDER.push(def.id);
  KINDS[def.id] = def;
}
export function mapFeatureKind(id: string): MapFeatureKindDef | undefined { return KINDS[id]; }
export function mapFeatureKinds(): MapFeatureKindDef[] { return ORDER.map(id => KINDS[id]); }

// --- the installed truth -------------------------------------------------------

let atlasSeed: number | null = null;
const memo = new Map<string, MapFeature | null>();
const MEMO_CAP = 24000;

/** Install the world's field seed (sim boot, beside setReliefSeed) — the ONE
 *  seed every finder and the mint fold read. null = no world: no features. */
export function setAtlasSeed(fieldSeed: number | null): void {
  atlasSeed = fieldSeed === null ? null : fieldSeed >>> 0;
  memo.clear();
}
export function atlasSeedInstalled(): number | null { return atlasSeed; }

// --- finders ------------------------------------------------------------------------

function saltOf(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function pick<T>(arr: readonly T[], h: number): T { return arr[Math.min(arr.length - 1, Math.floor(h * arr.length))]; }

/** "the {first} {second}" off the feature's cell hashes — stable per seed. */
export function featureNameFor(def: MapFeatureKindDef, a: number, b: number, seed: number): string {
  if (!def.names) return def.label;
  const s = saltOf(def.id);
  const h1 = hash01(a, b, (seed ^ s ^ 0x77a1) >>> 0);
  const h2 = hash01(b, a, (seed ^ s ^ 0x3b9d) >>> 0);
  return `the ${pick(def.names.first, h1)} ${pick(def.names.second, h2)}`;
}

type LatticeFinder = Extract<FeatureFinder, { kind: 'strewn' | 'peaks' }>;

function siteOf(f: LatticeFinder, gx: number, gy: number, seed: number): MapCoord {
  const jit = f.jitter ?? 0.5;
  const h1 = hash01(gx, gy, (seed ^ f.salt) >>> 0);
  const h2 = hash01(gy, gx, (seed ^ f.salt ^ 0x51f3) >>> 0);
  return { x: (gx + 0.5 + (h1 - 0.5) * jit) * f.span, y: (gy + 0.5 + (h2 - 0.5) * jit) * f.span };
}

function gatesPass(gates: FeatureGate[] | undefined, site: MapCoord, seed: number): boolean {
  for (const g of gates ?? []) {
    const v = climateAxisAt(site, seed, g.axis);
    if (g.min !== undefined && v < g.min) return false;
    if (g.max !== undefined && v > g.max) return false;
  }
  return true;
}

function mk(def: MapFeatureKindDef, a: number, b: number, seat: MapCoord, value: number, seed: number): MapFeature {
  return { id: `${def.id}:${a}_${b}`, kind: def.id, seat, name: featureNameFor(def, a, b, seed), size: def.size ?? 60, value };
}

/** One lattice cell's feature (memoized) — THE finder both halves share. */
function cellFeature(def: MapFeatureKindDef, gx: number, gy: number, seed: number): MapFeature | null {
  const f = def.find;
  if (f.kind === 'lakes') return null;
  const key = `${def.id}|${seed}|${gx}|${gy}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let out: MapFeature | null = null;
  const site = siteOf(f, gx, gy, seed);
  if (continentAt(site, continentSeedFrom(seed)).kind === 'land') {
    if (f.kind === 'strewn') {
      if (hash01(gx, gy, (seed ^ f.salt ^ 0xa11ce) >>> 0) < f.chance && gatesPass(f.gates, site, seed)) {
        out = mk(def, gx, gy, site, elevationAt(site, seed), seed);
      }
    } else {
      const e = elevationAt(site, seed);
      if (e >= f.minElevation) {
        let top = true;
        for (let dx = -1; dx <= 1 && top; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (!dx && !dy) continue;
            if (elevationAt(siteOf(f, gx + dx, gy + dy, seed), seed) >= e) { top = false; break; }
          }
        }
        if (top) out = mk(def, gx, gy, site, e, seed);
      }
    }
  }
  if (memo.size >= MEMO_CAP) memo.clear();
  memo.set(key, out);
  return out;
}

function lakesInRect(def: MapFeatureKindDef, min: MapCoord, max: MapCoord, seed: number): MapFeature[] {
  const f = def.find;
  if (f.kind !== 'lakes') return [];
  const out: MapFeature[] = [];
  const contSeed = continentSeedFrom(seed);
  const maxPts = RELIEF_CFG.trace.maxSteps + 1; // a run this long hit the reach bound, not a basin
  for (const pts of riverPathsInRect(min, max, seed)) {
    if (pts.length < f.minRun || pts.length >= maxPts) continue;
    const last = pts[pts.length - 1];
    if (continentAt(last, contSeed).kind !== 'land') continue; // a mouth (sea) or a bridge end
    if (last.x < min.x - def.reach || last.x > max.x + def.reach || last.y < min.y - def.reach || last.y > max.y + def.reach) continue;
    const t = clamp01((pts.length - f.minRun) / Math.max(1, maxPts - 1 - f.minRun));
    const radius = f.radius[0] + (f.radius[1] - f.radius[0]) * t;
    const a = Math.round(last.x), b = Math.round(last.y);
    out.push({ id: `${def.id}:${a}_${b}`, kind: def.id, seat: { x: last.x, y: last.y }, name: featureNameFor(def, a, b, seed), size: radius, value: radius });
  }
  return out;
}

/** Every feature whose seat could matter to a rect (padded by each kind's
 *  reach) — the chart's draw query. Pure; [] without an installed seed. */
export function featuresInRect(min: MapCoord, max: MapCoord, seed: number | null = atlasSeed): MapFeature[] {
  if (seed === null) return [];
  const out: MapFeature[] = [];
  for (const id of ORDER) {
    const def = KINDS[id];
    const f = def.find;
    if (f.kind === 'lakes') { out.push(...lakesInRect(def, min, max, seed)); continue; }
    const pad = def.reach + f.span;
    const c0x = Math.floor((min.x - pad) / f.span), c1x = Math.floor((max.x + pad) / f.span);
    const c0y = Math.floor((min.y - pad) / f.span), c1y = Math.floor((max.y + pad) / f.span);
    for (let gx = c0x; gx <= c1x; gx++) {
      for (let gy = c0y; gy <= c1y; gy++) {
        const feat = cellFeature(def, gx, gy, seed);
        if (feat && feat.seat.x >= min.x - def.reach && feat.seat.x <= max.x + def.reach
          && feat.seat.y >= min.y - def.reach && feat.seat.y <= max.y + def.reach) out.push(feat);
      }
    }
  }
  return out;
}

/** Every feature whose reach covers a coordinate — THE MINT QUERY (worldgen
 *  placeZoneAt) and the cursor read. Nearest first. */
export function featuresAt(coord: MapCoord, seed: number | null = atlasSeed): MapFeatureHit[] {
  if (seed === null) return [];
  const hits: MapFeatureHit[] = [];
  for (const id of ORDER) {
    const def = KINDS[id];
    const f = def.find;
    const r = def.reach;
    const cands: MapFeature[] = [];
    if (f.kind === 'lakes') {
      cands.push(...lakesInRect(def, { x: coord.x - r, y: coord.y - r }, { x: coord.x + r, y: coord.y + r }, seed));
    } else {
      const c0x = Math.floor((coord.x - r - f.span) / f.span), c1x = Math.floor((coord.x + r + f.span) / f.span);
      const c0y = Math.floor((coord.y - r - f.span) / f.span), c1y = Math.floor((coord.y + r + f.span) / f.span);
      for (let gx = c0x; gx <= c1x; gx++) for (let gy = c0y; gy <= c1y; gy++) {
        const feat = cellFeature(def, gx, gy, seed);
        if (feat) cands.push(feat);
      }
    }
    for (const feat of cands) {
      const dist = Math.hypot(feat.seat.x - coord.x, feat.seat.y - coord.y);
      if (dist <= r) hits.push({ feature: feat, dist, def });
    }
  }
  hits.sort((a, b) => a.dist - b.dist);
  return hits;
}

/** The kind a baked feature id belongs to (`peak:3_-2` → the 'peak' row). */
export function featureKindOfId(id: string): MapFeatureKindDef | undefined {
  return KINDS[id.split(':')[0]];
}

/** Re-derive a baked id's name (the pane reads the def's ids, never the finder). */
export function featureNameOf(id: string, seed: number | null = atlasSeed): string | null {
  const def = featureKindOfId(id);
  if (!def || seed === null) return null;
  const rest = id.slice(def.id.length + 1);
  const m = /^(-?\d+)_(-?\d+)$/.exec(rest);
  if (!m) return def.label;
  return featureNameFor(def, Number(m[1]), Number(m[2]), seed);
}

// --- the mint fold ---------------------------------------------------------------------

export interface FeatureFold {
  ids: string[];
  landmarks: LandmarkRoll[];
  compositions: CompositionRoll[];
  layoutParams: Record<string, unknown>;
  relief?: { lift: number; dome: number };
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Fold every hit's inheritance into the shapes the mint appends (pure). */
export function foldFeatureHits(hits: MapFeatureHit[]): FeatureFold {
  const fold: FeatureFold = { ids: [], landmarks: [], compositions: [], layoutParams: {} };
  let lift = 0, dome = 0, relief = false;
  for (const h of hits) {
    fold.ids.push(h.feature.id);
    const inh = h.def.inherit;
    if (!inh) continue;
    for (const r of inh.landmarks ?? []) fold.landmarks.push({ ...r });
    for (const r of inh.compositions ?? []) fold.compositions.push({ ...r });
    if (inh.layoutParams) Object.assign(fold.layoutParams, inh.layoutParams);
    if (inh.relief) { relief = true; lift += inh.relief.lift ?? 0; dome += inh.relief.dome ?? 0; }
  }
  if (relief) fold.relief = { lift: round2(lift), dome: round2(dome) };
  return fold;
}

/** THE HARVEST BOUNTY a def's baked features grant (World.bootHarvest reads
 *  the def's ids — the registry's kind rows carry the numbers). */
export function featureHarvestOf(ids: readonly string[] | undefined): { bonus: [number, number]; always: boolean } | null {
  if (!ids?.length) return null;
  let lo = 0, hi = 0, always = false, any = false;
  for (const id of ids) {
    const h = featureKindOfId(id)?.inherit?.harvest;
    if (!h) continue;
    any = true;
    if (h.bonus) { lo += h.bonus[0]; hi += h.bonus[1]; }
    if (h.always) always = true;
  }
  return any ? { bonus: [lo, hi], always } : null;
}

// --- the shading law -------------------------------------------------------------------

export type RGB = [number, number, number];

const rgbMemo = new Map<string, RGB>();
export function hexRgb(hex: string): RGB {
  let v = rgbMemo.get(hex);
  if (!v) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbMemo.set(hex, v);
  }
  return v;
}

const smooth = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / Math.max(1e-6, b - a));
  return t * t * (3 - 2 * t);
};

export interface AtlasShadeIn {
  biome: string;
  /** Elevation axis 0..1 (any value for the sea — the shelf reads `shore`). */
  elev: number;
  kind: 'land' | 'ocean' | 'bridge';
  /** Elevation gradient per node unit (east, south). */
  sx: number;
  sy: number;
  /** Distance to the coast in node units (a land cell's to water, a water
   *  cell's to land). Infinity when unknown. */
  shore: number;
  /** Hillshade/snow/alpine on (the Relief layer chip). */
  relief: boolean;
}

/** THE PIXEL LAW — one cell of sampled truth → its painted colour. Pure and
 *  probe-pinned: a face turned to the light lifts, a face turned away sinks,
 *  flat ground keeps its biome's exact tint, high ground pales to rock then
 *  snow, and the sea deepens off its shelf. */
export function atlasShade(i: AtlasShadeIn, out: RGB): RGB {
  const C = ATLAS_CFG;
  if (i.kind === 'ocean') {
    const t = smooth(0, 1, Number.isFinite(i.shore) ? i.shore / C.sea.shelf : 1);
    const a = hexRgb(C.sea.shallow), b = hexRgb(C.sea.deep);
    out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
    const foam = Number.isFinite(i.shore) ? clamp01(1 - (i.shore / C.sea.shelf) / C.sea.foamReach) : 0;
    if (foam > 0) {
      const f = hexRgb(C.sea.foam), k = foam * 0.45;
      out[0] += (f[0] - out[0]) * k; out[1] += (f[1] - out[1]) * k; out[2] += (f[2] - out[2]) * k;
    }
    return out;
  }
  const base = hexRgb(BIOMES[i.biome]?.mapColor ?? '#3a3a44');
  out[0] = base[0]; out[1] = base[1]; out[2] = base[2];
  if (!i.relief) return out;
  const ta = smooth(C.alpine.from, C.alpine.to, i.elev) * C.alpine.mix;
  if (ta > 0) { const r = hexRgb(C.alpine.color); out[0] += (r[0] - out[0]) * ta; out[1] += (r[1] - out[1]) * ta; out[2] += (r[2] - out[2]) * ta; }
  const ts = smooth(C.snow.from, C.snow.to, i.elev) * C.snow.mix;
  if (ts > 0) { const s = hexRgb(C.snow.color); out[0] += (s[0] - out[0]) * ts; out[1] += (s[1] - out[1]) * ts; out[2] += (s[2] - out[2]) * ts; }
  // Hillshade: the normal from the gained slope, lit by the fixed sun; flat
  // ground is exactly 1.0 (the biome's own tint), faces to the light lift.
  const nx = -i.sx * C.shade.gain, ny = -i.sy * C.shade.gain;
  const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
  const [lx, ly, lz] = C.shade.light;
  const ll = 1 / Math.sqrt(lx * lx + ly * ly + lz * lz);
  const diffuse = Math.max(0, (nx * lx + ny * ly + lz) * inv * ll);
  const flat = lz * ll;
  let f = Math.min(C.shade.maxLift, C.shade.ambient + (1 - C.shade.ambient) * (diffuse / flat));
  f *= 1 - C.hypso.gain / 2 + C.hypso.gain * i.elev;
  out[0] = Math.min(255, out[0] * f); out[1] = Math.min(255, out[1] * f); out[2] = Math.min(255, out[2] * f);
  return out;
}

/** Which contour band an elevation sits in (a boundary between neighbours
 *  draws the line). */
export function contourBand(elev: number, interval: number = ATLAS_CFG.contour.interval): number {
  return Math.floor(elev / interval);
}

/** The climate bands' OWN words for a sampled climate (the cursor read): per
 *  axis, the registered band that claims the value hardest — 'cold', 'wet',
 *  'deepwild' — so the map speaks the vocabulary the biomes are authored in. */
export function climateWords(cl: Record<string, number>, axes: readonly string[] = ['temperature', 'moisture']): string[] {
  const out: string[] = [];
  for (const axis of axes) {
    const bands = CLIMATE_BANDS[axis];
    const v = cl[axis];
    if (!bands || v === undefined) continue;
    // The band that claims the value hardest; a tie goes to the NARROWEST
    // band (the most specific word — 'drowned' over 'damp' at 0.9).
    let best = '', bw = 0, bwidth = Infinity;
    for (const [name, env] of Object.entries(bands)) {
      const w = presenceMul(env, v);
      const width = (env.to ?? 1) - (env.from ?? 0);
      if (w > bw + 1e-9 || (Math.abs(w - bw) <= 1e-9 && w > 0 && width < bwidth)) { bw = w; bwidth = width; best = name; }
    }
    if (best) out.push(best);
  }
  return out;
}

// --- the pane -----------------------------------------------------------------------------

// A charted (or scouted) zone names the features it stands on: the same ids
// the mint baked, re-named through the finder's own hash — the pane reads the
// def, never re-runs the world.
registerZoneInfoSource((world, zoneId) => {
  const z = world.zoneMap[zoneId];
  if (!z) return [];
  if (!world.visited.has(zoneId) && !world.surveyed.has(zoneId)) return [];
  const seed = world.sim.biomeField.fieldSeed;
  const rows: { kind: 'condition'; icon: string; color?: string; label: string; detail?: string; z?: number }[] = [];
  // THE GROUND ROW: the lay of the land from the def's own baked climate —
  // elevation and the climate bands' words (no live sampling, nothing to
  // flicker: the side box is the honest chart's one ground read).
  // Authored ground (the town, the crossroads) bakes no climate — sample the
  // field once here, the same read a mint would have baked.
  const cl = z.geo?.climate ?? ((z.dimension ?? 'surface') === 'surface' ? climateAt(z.map, seed) : undefined);
  if (cl && cl.elevation !== undefined) {
    rows.push({
      kind: 'condition', icon: '⛰', color: '#b8b4a8',
      label: `elevation ${cl.elevation.toFixed(2)} · ${climateWords(cl).join(' · ')}`,
      detail: 'the lay of the land', z: 6,
    });
  }
  const ids = z.geo?.features ?? [];
  for (const id of ids) {
    const def = featureKindOfId(id);
    if (!def) continue;
    const name = featureNameOf(id, seed) ?? def.label;
    rows.push({
      kind: 'condition' as const, icon: def.icon, color: def.color,
      label: name.charAt(0).toUpperCase() + name.slice(1) + ` (${def.label})`,
      detail: def.read, z: 5,
    });
  }
  return rows;
});
