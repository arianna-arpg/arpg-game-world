// ---------------------------------------------------------------------------
// PERF SLABS — zero-overhead opt-in sub-frame forensics for sim & renderer.
//
// In ordinary play and standard sim runs, `PERF_SLABS.active` is `false`:
// every hook is a single predicted boolean branch with zero allocations,
// zero `performance.now()` calls, and zero impact on RNG or game state.
//
// When armed by `balance/combat-perf.ts` or `window.__game.combatStress`,
// fixed-capacity Float64Array rings record per-tick simulation slabs,
// per-frame render slabs, and hot-path forensic counters (StatSheet cache
// hit/miss ratio, context-tag Set allocations, raycasts, hit resolutions,
// and live entity populations).
// ---------------------------------------------------------------------------

export const SIM_SLAB_NAMES = [
  'input',
  'ai',
  'worldSweeps',
  'lite',
  'actorTick',
  'projectiles',
  'zones',
  'separation',
] as const;

export type SimSlabId = (typeof SIM_SLAB_NAMES)[number];

export const SIM_SLAB_IDX: Record<SimSlabId, number> = {
  input: 0,
  ai: 1,
  worldSweeps: 2,
  lite: 3,
  actorTick: 4,
  projectiles: 5,
  zones: 6,
  separation: 7,
};

export const REN_SLAB_NAMES = [
  'cullLightsVeil',
  'groundDoodads',
  'fieldsCorpsesDrops',
  'actors',
  'projectiles',
  'veilsCanopy',
  'lightsAtmos',
  'wordsHud',
] as const;

export type RenSlabId = (typeof REN_SLAB_NAMES)[number];

export const REN_SLAB_IDX: Record<RenSlabId, number> = {
  cullLightsVeil: 0,
  groundDoodads: 1,
  fieldsCorpsesDrops: 2,
  actors: 3,
  projectiles: 4,
  veilsCanopy: 5,
  lightsAtmos: 6,
  wordsHud: 7,
};

const SIM_SLAB_COUNT = SIM_SLAB_NAMES.length;
const REN_SLAB_COUNT = REN_SLAB_NAMES.length;
const DEFAULT_RING_CAP = 4096;

export interface SlabStats {
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  total: number;
}

export interface PerfSlabsSummary {
  simTicks: number;
  renFrames: number;
  simTotal: SlabStats;
  renTotal: SlabStats;
  simSlabs: Record<SimSlabId, SlabStats>;
  renSlabs: Record<RenSlabId, SlabStats>;
  counters: {
    statGets: number;
    statCacheHits: number;
    statUncachedWalks: number;
    statHitRatePct: number;
    contextTagAllocs: number;
    hitsResolved: number;
    raysCast: number;
    gridRaysCast: number;
  };
  entities: {
    actorsMean: number;
    actorsMax: number;
    projectilesMean: number;
    projectilesMax: number;
    zonesMean: number;
    zonesMax: number;
    textsMean: number;
    textsMax: number;
    flashesMean: number;
    flashesMax: number;
    liteMean: number;
    liteMax: number;
  };
}

class PerfSlabsState {
  active = false;
  cap = DEFAULT_RING_CAP;

  simRing = new Float64Array(DEFAULT_RING_CAP * SIM_SLAB_COUNT);
  simTotals = new Float64Array(DEFAULT_RING_CAP);
  simScratch = new Float64Array(SIM_SLAB_COUNT);
  simIdx = 0;
  simCount = 0;

  renRing = new Float64Array(DEFAULT_RING_CAP * REN_SLAB_COUNT);
  renTotals = new Float64Array(DEFAULT_RING_CAP);
  renScratch = new Float64Array(REN_SLAB_COUNT);
  renIdx = 0;
  renCount = 0;

  // Hot-path forensic counters across the active measurement window
  statGets = 0;
  statCacheHits = 0;
  statUncachedWalks = 0;
  contextTagAllocs = 0;
  hitsResolved = 0;
  raysCast = 0;
  gridRaysCast = 0;

  // Entity census accumulators across recorded sim ticks
  entitySamples = 0;
  actorsSum = 0;
  actorsMax = 0;
  projectilesSum = 0;
  projectilesMax = 0;
  zonesSum = 0;
  zonesMax = 0;
  textsSum = 0;
  textsMax = 0;
  flashesSum = 0;
  flashesMax = 0;
  liteSum = 0;
  liteMax = 0;
}

export const PERF_SLABS = new PerfSlabsState();

export function perfSlabsReset(capacity = DEFAULT_RING_CAP): void {
  const want = Math.max(256, Math.min(1 << 16, Math.ceil(capacity)));
  if (want !== PERF_SLABS.cap) {
    PERF_SLABS.cap = want;
    PERF_SLABS.simRing = new Float64Array(want * SIM_SLAB_COUNT);
    PERF_SLABS.simTotals = new Float64Array(want);
    PERF_SLABS.renRing = new Float64Array(want * REN_SLAB_COUNT);
    PERF_SLABS.renTotals = new Float64Array(want);
  }
  PERF_SLABS.simScratch.fill(0);
  PERF_SLABS.renScratch.fill(0);
  PERF_SLABS.simIdx = 0;
  PERF_SLABS.simCount = 0;
  PERF_SLABS.renIdx = 0;
  PERF_SLABS.renCount = 0;

  PERF_SLABS.statGets = 0;
  PERF_SLABS.statCacheHits = 0;
  PERF_SLABS.statUncachedWalks = 0;
  PERF_SLABS.contextTagAllocs = 0;
  PERF_SLABS.hitsResolved = 0;
  PERF_SLABS.raysCast = 0;
  PERF_SLABS.gridRaysCast = 0;

  PERF_SLABS.entitySamples = 0;
  PERF_SLABS.actorsSum = 0;
  PERF_SLABS.actorsMax = 0;
  PERF_SLABS.projectilesSum = 0;
  PERF_SLABS.projectilesMax = 0;
  PERF_SLABS.zonesSum = 0;
  PERF_SLABS.zonesMax = 0;
  PERF_SLABS.textsSum = 0;
  PERF_SLABS.textsMax = 0;
  PERF_SLABS.flashesSum = 0;
  PERF_SLABS.flashesMax = 0;
  PERF_SLABS.liteSum = 0;
  PERF_SLABS.liteMax = 0;
}

export function perfSlabsAddSim(idx: number, dtMs: number): void {
  PERF_SLABS.simScratch[idx] += dtMs;
}

export function perfSlabsSampleEntities(
  actors: number, projectiles: number, zones: number,
  texts: number, flashes: number, lite: number,
): void {
  PERF_SLABS.entitySamples++;
  PERF_SLABS.actorsSum += actors;
  if (actors > PERF_SLABS.actorsMax) PERF_SLABS.actorsMax = actors;
  PERF_SLABS.projectilesSum += projectiles;
  if (projectiles > PERF_SLABS.projectilesMax) PERF_SLABS.projectilesMax = projectiles;
  PERF_SLABS.zonesSum += zones;
  if (zones > PERF_SLABS.zonesMax) PERF_SLABS.zonesMax = zones;
  PERF_SLABS.textsSum += texts;
  if (texts > PERF_SLABS.textsMax) PERF_SLABS.textsMax = texts;
  PERF_SLABS.flashesSum += flashes;
  if (flashes > PERF_SLABS.flashesMax) PERF_SLABS.flashesMax = flashes;
  PERF_SLABS.liteSum += lite;
  if (lite > PERF_SLABS.liteMax) PERF_SLABS.liteMax = lite;
}

export function perfSlabsCommitSim(explicitTotalMs?: number): void {
  const base = PERF_SLABS.simIdx * SIM_SLAB_COUNT;
  let sum = 0;
  for (let i = 0; i < SIM_SLAB_COUNT; i++) {
    const v = PERF_SLABS.simScratch[i];
    PERF_SLABS.simRing[base + i] = v;
    PERF_SLABS.simScratch[i] = 0;
    sum += v;
  }
  PERF_SLABS.simTotals[PERF_SLABS.simIdx] = explicitTotalMs ?? sum;
  PERF_SLABS.simIdx = (PERF_SLABS.simIdx + 1) % PERF_SLABS.cap;
  if (PERF_SLABS.simCount < PERF_SLABS.cap) PERF_SLABS.simCount++;
}

export function perfSlabsAddRen(idx: number, dtMs: number): void {
  PERF_SLABS.renScratch[idx] += dtMs;
}

export function perfSlabsCommitRen(explicitTotalMs?: number): void {
  const base = PERF_SLABS.renIdx * REN_SLAB_COUNT;
  let sum = 0;
  for (let i = 0; i < REN_SLAB_COUNT; i++) {
    const v = PERF_SLABS.renScratch[i];
    PERF_SLABS.renRing[base + i] = v;
    PERF_SLABS.renScratch[i] = 0;
    sum += v;
  }
  PERF_SLABS.renTotals[PERF_SLABS.renIdx] = explicitTotalMs ?? sum;
  PERF_SLABS.renIdx = (PERF_SLABS.renIdx + 1) % PERF_SLABS.cap;
  if (PERF_SLABS.renCount < PERF_SLABS.cap) PERF_SLABS.renCount++;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function statsOf(values: number[]): SlabStats {
  const n = values.length;
  if (n === 0) return { mean: 0, p50: 0, p95: 0, p99: 0, max: 0, total: 0 };
  const sorted = values.slice().sort((a, b) => a - b);
  let total = 0;
  for (let i = 0; i < n; i++) total += sorted[i];
  const pick = (q: number): number => sorted[Math.min(n - 1, Math.floor((n - 1) * q))];
  return {
    mean: round3(total / n),
    p50: round3(pick(0.50)),
    p95: round3(pick(0.95)),
    p99: round3(pick(0.99)),
    max: round3(sorted[n - 1]),
    total: round3(total),
  };
}

export function summarizePerfSlabs(): PerfSlabsSummary {
  const simN = PERF_SLABS.simCount;
  const simStart = (PERF_SLABS.simIdx - simN + PERF_SLABS.cap) % PERF_SLABS.cap;
  const simTotArr = new Array<number>(simN);
  for (let i = 0; i < simN; i++) {
    simTotArr[i] = PERF_SLABS.simTotals[(simStart + i) % PERF_SLABS.cap];
  }
  const simSlabs = {} as Record<SimSlabId, SlabStats>;
  for (let s = 0; s < SIM_SLAB_COUNT; s++) {
    const col = new Array<number>(simN);
    for (let i = 0; i < simN; i++) {
      const k = (simStart + i) % PERF_SLABS.cap;
      col[i] = PERF_SLABS.simRing[k * SIM_SLAB_COUNT + s];
    }
    simSlabs[SIM_SLAB_NAMES[s]] = statsOf(col);
  }

  const renN = PERF_SLABS.renCount;
  const renStart = (PERF_SLABS.renIdx - renN + PERF_SLABS.cap) % PERF_SLABS.cap;
  const renTotArr = new Array<number>(renN);
  for (let i = 0; i < renN; i++) {
    renTotArr[i] = PERF_SLABS.renTotals[(renStart + i) % PERF_SLABS.cap];
  }
  const renSlabs = {} as Record<RenSlabId, SlabStats>;
  for (let s = 0; s < REN_SLAB_COUNT; s++) {
    const col = new Array<number>(renN);
    for (let i = 0; i < renN; i++) {
      const k = (renStart + i) % PERF_SLABS.cap;
      col[i] = PERF_SLABS.renRing[k * REN_SLAB_COUNT + s];
    }
    renSlabs[REN_SLAB_NAMES[s]] = statsOf(col);
  }

  const es = Math.max(1, PERF_SLABS.entitySamples);
  const gets = PERF_SLABS.statGets;
  const hits = PERF_SLABS.statCacheHits;

  return {
    simTicks: simN,
    renFrames: renN,
    simTotal: statsOf(simTotArr),
    renTotal: statsOf(renTotArr),
    simSlabs,
    renSlabs,
    counters: {
      statGets: gets,
      statCacheHits: hits,
      statUncachedWalks: PERF_SLABS.statUncachedWalks,
      statHitRatePct: gets > 0 ? Math.round((hits / gets) * 10000) / 100 : 0,
      contextTagAllocs: PERF_SLABS.contextTagAllocs,
      hitsResolved: PERF_SLABS.hitsResolved,
      raysCast: PERF_SLABS.raysCast,
      gridRaysCast: PERF_SLABS.gridRaysCast,
    },
    entities: {
      actorsMean: Math.round((PERF_SLABS.actorsSum / es) * 10) / 10,
      actorsMax: PERF_SLABS.actorsMax,
      projectilesMean: Math.round((PERF_SLABS.projectilesSum / es) * 10) / 10,
      projectilesMax: PERF_SLABS.projectilesMax,
      zonesMean: Math.round((PERF_SLABS.zonesSum / es) * 10) / 10,
      zonesMax: PERF_SLABS.zonesMax,
      textsMean: Math.round((PERF_SLABS.textsSum / es) * 10) / 10,
      textsMax: PERF_SLABS.textsMax,
      flashesMean: Math.round((PERF_SLABS.flashesSum / es) * 10) / 10,
      flashesMax: PERF_SLABS.flashesMax,
      liteMean: Math.round((PERF_SLABS.liteSum / es) * 10) / 10,
      liteMax: PERF_SLABS.liteMax,
    },
  };
}
