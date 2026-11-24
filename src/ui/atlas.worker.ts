/// <reference lib="webworker" />
// ---------------------------------------------------------------------------
// Dedicated OffscreenCanvas Web Worker for World Map / Atlas rasterization.
// Keeps 100% of terrain sampling, hillshading, river/glyph drawing, and image
// encoding off the main UI thread.
// ---------------------------------------------------------------------------

import { featuresInRect, registerMapFeature, setAtlasSeed, type MapFeature, type MapFeatureKindDef } from '../world/atlas';
import { OCEAN_BIOME, biomeAt, fieldNoise, type BiomeFieldModifier } from '../world/biomes';
import { setClimateAnchor, setClimateOrigin } from '../world/climate';
import { continentCellAt, continentSeedFrom } from '../world/continents';
import { coordDist, type MapCoord } from '../world/coords';
import { COURSE_FIELD_SALT, courseBiomeAt, strewnInstancesNear } from '../world/courses';
import { dimensionBiomeAt, dimensionDef } from '../world/dimensions';
import { elevationAt, riverPathsInRect, setReliefSeed } from '../world/relief';
import { paintAtlasSync, type AtlasLabel, type AtlasWorkerSpec, type TerrainKind } from './atlasPaintCore';

export interface AtlasWorkerInitMsg {
  type: 'init';
  featureKinds: MapFeatureKindDef[];
}

export interface AtlasWorkerPaintMsg {
  type: 'paint';
  id: number;
  key: string;
  maxPx?: number;
  box: { minX: number; minY: number; maxX: number; maxY: number };
  reveal: MapCoord[];
  noVeil?: boolean;
  layers: { relief: boolean; rivers: boolean; features: boolean; glyphs: boolean };
  spec: AtlasWorkerSpec;
}

export interface AtlasWorkerReply {
  id: number;
  key: string;
  blob?: Blob;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  labels?: AtlasLabel[];
  ms?: number;
  px?: number;
  error?: string;
}

let activeSeed: number | null = null;
let activeOriginSig = '';
let activeAnchorsSig = '';
const knownAnchorKeys = new Set<string>();

// Reuse rivers & features when `preview` and `base` query the identical world box.
let boxGeoMemo: {
  key: string;
  rivers: MapCoord[][];
  features: MapFeature[];
} | null = null;

let sharedCanvas: OffscreenCanvas | null = null;

function syncWorldSeeds(spec: AtlasWorkerSpec): void {
  const originSig = `${spec.origin.x},${spec.origin.y}`;
  if (originSig !== activeOriginSig) {
    activeOriginSig = originSig;
    setClimateOrigin(spec.origin);
  }
  const anchorEntries = Object.entries(spec.anchors).sort(([a], [b]) => a.localeCompare(b));
  const anchorsSig = anchorEntries.map(([k, v]) => `${k}:${v ? `${v.x},${v.y}` : 'null'}`).join('|');
  if (anchorsSig !== activeAnchorsSig) {
    activeAnchorsSig = anchorsSig;
    const nextKeys = new Set<string>();
    for (const [k, v] of anchorEntries) {
      nextKeys.add(k);
      knownAnchorKeys.add(k);
      setClimateAnchor(k, v);
    }
    for (const oldKey of knownAnchorKeys) {
      if (!nextKeys.has(oldKey)) setClimateAnchor(oldKey, null);
    }
  }
  if (activeSeed !== spec.seed) {
    activeSeed = spec.seed;
    setReliefSeed(spec.seed);
    setAtlasSeed(spec.seed);
    boxGeoMemo = null;
  }
}

function makeSurfaceBiomeSampler(seed: number, warps: readonly BiomeFieldModifier[]): (c: MapCoord) => string {
  if (!warps.length) return (c) => biomeAt(c, seed);
  return (coord) => {
    let b = biomeAt(coord, seed);
    if (b === OCEAN_BIOME) return b;
    for (let i = 0; i < warps.length; i++) {
      const m = warps[i];
      if (m.strength <= 0 || coordDist(coord, m.center) > m.radius) continue;
      if (m.strength >= 1 || fieldNoise(coord.x, coord.y, seed) < m.strength) {
        b = m.biome;
      }
    }
    return b;
  };
}

function makeDimensionBiomeSampler(dimId: string, fieldSeed: number, gateAnchor?: MapCoord): (c: MapCoord) => string {
  const seed = (fieldSeed ^ COURSE_FIELD_SALT) >>> 0;
  const specs = dimensionDef(dimId).courses ?? [];
  const live = specs.filter(s => s.anchor === 'strewn' || (s.anchor === 'gate' && !!gateAnchor));
  if (!live.length) return (c) => dimensionBiomeAt(dimId, c, seed);
  return (c) => {
    for (let i = 0; i < live.length; i++) {
      const spec = live[i];
      if (spec.anchor === 'strewn') {
        const near = strewnInstancesNear(spec, c, seed);
        for (let j = 0; j < near.length; j++) {
          const inst = near[j];
          const b = courseBiomeAt([spec], inst.anchor, c, inst.iseed);
          if (b) return b;
        }
      } else if (gateAnchor) {
        const b = courseBiomeAt([spec], gateAnchor, c, seed);
        if (b) return b;
      }
    }
    return dimensionBiomeAt(dimId, c, seed);
  };
}

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (event: MessageEvent<AtlasWorkerInitMsg | AtlasWorkerPaintMsg>) => {
  const msg = event.data;
  if (!msg) return;
  if (msg.type === 'init') {
    for (const def of msg.featureKinds) registerMapFeature(def, true);
    boxGeoMemo = null;
    return;
  }
  if (msg.type !== 'paint') return;

  try {
    const { spec, box, layers } = msg;
    syncWorldSeeds(spec);
    const surface = spec.dim === 'surface';
    const contSeed = continentSeedFrom(spec.seed);

    let rivers: MapCoord[][] = [];
    let features: MapFeature[] = [];
    if (surface && (layers.rivers || layers.features)) {
      const geoKey = `${spec.seed}|${box.minX},${box.minY},${box.maxX},${box.maxY}|${+layers.rivers}|${+layers.features}`;
      if (boxGeoMemo && boxGeoMemo.key === geoKey) {
        rivers = boxGeoMemo.rivers;
        features = boxGeoMemo.features;
      } else {
        const min = { x: box.minX, y: box.minY }, max = { x: box.maxX, y: box.maxY };
        rivers = layers.rivers ? riverPathsInRect(min, max, spec.seed) : [];
        features = layers.features ? featuresInRect(min, max, spec.seed) : [];
        boxGeoMemo = { key: geoKey, rivers, features };
      }
    }

    const kindAt = surface
      ? (c: MapCoord): TerrainKind => continentCellAt(c, contSeed).kind
      : (): TerrainKind => 'land';
    const biomeSampler = surface
      ? makeSurfaceBiomeSampler(spec.seed, spec.warps)
      : makeDimensionBiomeSampler(spec.dim, spec.seed, spec.gateAnchor);
    const elevSampler = surface ? (c: MapCoord): number => elevationAt(c, spec.seed) : null;

    const painted = paintAtlasSync(
      {
        key: msg.key,
        maxPx: msg.maxPx,
        box,
        biomeAt: biomeSampler,
        elevAt: elevSampler,
        kindAt,
        reveal: msg.reveal,
        noVeil: msg.noVeil,
        rivers,
        features,
        layers,
        seed: spec.seed,
      },
      (W, H) => {
        if (!sharedCanvas) sharedCanvas = new OffscreenCanvas(W, H);
        else { sharedCanvas.width = W; sharedCanvas.height = H; }
        const ctx = sharedCanvas.getContext('2d');
        if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable');
        return ctx;
      },
    );

    let blob: Blob;
    try {
      blob = await sharedCanvas!.convertToBlob({ type: 'image/webp', quality: 0.92 });
    } catch {
      blob = await sharedCanvas!.convertToBlob({ type: 'image/png' });
    }

    const reply: AtlasWorkerReply = {
      id: msg.id,
      key: msg.key,
      blob,
      x: box.minX,
      y: box.minY,
      w: painted.W / painted.ppu,
      h: painted.H / painted.ppu,
      labels: painted.labels,
      ms: painted.ms,
      px: Math.max(painted.W, painted.H),
    };
    scope.postMessage(reply);
  } catch (err) {
    scope.postMessage({
      id: msg.id,
      key: msg.key,
      error: String(err),
    } satisfies AtlasWorkerReply);
  }
};
