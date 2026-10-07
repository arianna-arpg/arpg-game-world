import type { MapCoord } from './coords';
import type { ClimateAxisDef, ClimateLayer, ClimateSpec, DimensionAxisOverride } from './climate';
import type { ContinentCell } from './continents';
import { presenceMul, type LevelEnvelope } from '../engine/presence';

/** Mutable references are deliberate for the ONE classic adapter. A frozen
 * reader constructs its own deeply frozen records from its ordered source. */
export interface NativeClimatePolicy {
  readonly axes: Readonly<Record<string, ClimateAxisDef>>;
  readonly bands: Readonly<Record<string, Readonly<Record<string, LevelEnvelope>>>>;
  readonly dimensions: Readonly<Record<string, Readonly<Record<string, DimensionAxisOverride>>>>;
  readonly climate: { readonly origin: MapCoord; readonly anchors: Readonly<Record<string, MapCoord | null | undefined>> };
  readonly continentCellAt: (coord: MapCoord, continentSeed: number) => ContinentCell;
  readonly continentSeedFrom: (fieldSeed: number) => number;
  readonly warn?: (message: string) => void;
}
export type NativeClimateAffinity = readonly (readonly [axis: string, spec: ClimateSpec])[];
export type NativeClimateAnchor = { state: 'point'; point: MapCoord } | { state: 'null' } | { state: 'undefined' };
/** Registry lookup key is retained separately from axis.id: the old axisAt
 * lookup and full at iteration use those two identities differently. */
export interface NativeClimateSource {
  readonly schema: 1;
  readonly algorithm: 'native-climate-v1';
  readonly axes: readonly (readonly [key: string, definition: ClimateAxisDef])[];
  readonly bands: readonly (readonly [axis: string, bands: readonly (readonly [name: string, envelope: LevelEnvelope])[]])[];
  readonly dimensions: readonly (readonly [dimension: string, overrides: readonly (readonly [axis: string, override: DimensionAxisOverride])[]])[];
  readonly origin: MapCoord;
  /** No tuple = absent; tagged null/undefined remain distinct own entries. */
  readonly anchors: readonly (readonly [name: string, value: NativeClimateAnchor])[];
}

/** Integer hash (Rng's family) → deterministic across host / client / reload. */
function hashCell(a: number, b: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (b | 0), 0xc2b2ae35) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}

const hash01 = (x: number, y: number, seed: number): number => hashCell(x, y, seed) / 0x100000000;

/** Smooth (smoothstep-bilinear) value noise, 0..1 — the level field's idiom. */
function valueNoise(x: number, y: number, cell: number, seed: number): number {
  const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
  const fx = x / cell - gx, fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash01(gx, gy, seed), b = hash01(gx + 1, gy, seed);
  const c = hash01(gx, gy + 1, seed), d = hash01(gx + 1, gy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

/** Stable per-axis salt so axes decorrelate on the shared world seed. */
function axisSalt(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
  return h >>> 0;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

interface ContinentProbe {
  cell: { gx: number; gy: number; kind: 'land' | 'ocean' | 'bridge' } | null;
  coastal: Map<number, number> | null;
}

export class NativeClimate {
  private homeCellMemo: { seed: number; gx: number; gy: number } | null = null;
  private readonly warnedBands = new Set<string>();
  private readonly warn: (message: string) => void;
  constructor(readonly policy: NativeClimatePolicy) { this.warn = policy.warn ?? (message => console.warn(message)); }
  resetHome(): void { this.homeCellMemo = null; }
  private homeCellFor(contSeed: number): { gx: number; gy: number } {
    if (!this.homeCellMemo || this.homeCellMemo.seed !== contSeed) {
      const c = this.policy.continentCellAt(this.policy.climate.origin, contSeed);
      this.homeCellMemo = { seed: contSeed, gx: c.gx, gy: c.gy };
    }
    return this.homeCellMemo;
  }

  private layerValue(
    layer: ClimateLayer, coord: MapCoord, seed: number, salt: number, probe: ContinentProbe,
  ): number {
    switch (layer.kind) {
      case 'noise':
        return (valueNoise(coord.x, coord.y, layer.cell, (seed ^ salt ^ (layer.salt ?? 0)) >>> 0) - 0.5) * 2 * layer.amp;
      case 'ridge': {
        const n = valueNoise(coord.x, coord.y, layer.cell, (seed ^ salt ^ (layer.salt ?? 0)) >>> 0);
        const crest = 1 - Math.abs(2 * n - 1);
        return crest * crest * layer.amp;
      }
      case 'radial': {
        const at = layer.anchor !== undefined ? this.policy.climate.anchors[layer.anchor] : this.policy.climate.origin;
        if (!at) return layer.amp; // uninstalled anchor reads FAR — full contribution
        const dx = coord.x - at.x, dy = coord.y - at.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        return clamp01((d - layer.innerRadius) / layer.span) * layer.amp;
      }
      case 'basin': {
        const at = this.policy.climate.anchors[layer.anchor];
        if (!at) return 0; // no anchor installed — the basin doesn't exist
        const dx = coord.x - at.x, dy = coord.y - at.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        return -(1 - clamp01((d - (layer.innerRadius ?? 0)) / layer.span)) * layer.amp;
      }
      case 'coastal': {
        const cache = (probe.coastal ??= new Map<number, number>());
        let v = cache.get(layer.probe);
        if (v === undefined) {
          const center = (probe.cell ??= this.policy.continentCellAt(coord, seed));
          if (center.kind !== 'land') v = 1;
          else {
            let sea = 0;
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2;
              const c = this.policy.continentCellAt(
                { x: coord.x + Math.cos(a) * layer.probe, y: coord.y + Math.sin(a) * layer.probe }, seed,
              );
              if (c.kind !== 'land') sea++;
            }
            v = clamp01((sea / 4) * 1.6);
          }
          cache.set(layer.probe, v);
        }
        return v * layer.amp;
      }
      case 'landmass': {
        const cell = (probe.cell ??= this.policy.continentCellAt(coord, seed));
        // The HOME landmass — whichever macro cell actually WINS at the climate
        // origin under this seed's jitter (never assumed to be cell (0,0): the
        // town sits near a macro-cell corner, so any of the four neighbours can
        // win) — is the unbiased baseline.
        const home = this.homeCellFor(seed);
        if (cell.gx === home.gx && cell.gy === home.gy) return 0;
        return (hash01(cell.gx, cell.gy, (seed ^ salt ^ 0x1a4d) >>> 0) - 0.5) * 2 * layer.spread;
      }
      case 'const':
        return layer.value;
    }
  }

  private axisValueAt(
    axis: ClimateAxisDef, ov: DimensionAxisOverride | undefined,
    coord: MapCoord, fieldSeed: number, contSeed: number, probe: ContinentProbe,
  ): number {
    let v = ov?.base ?? axis.base;
    const salt = axisSalt(axis.id);
    for (const layer of ov?.layers ?? axis.layers) {
      v += this.layerValue(
        layer, coord,
        layer.kind === 'coastal' || layer.kind === 'landmass' ? contSeed : fieldSeed,
        salt, probe,
      );
    }
    return clamp01(v);
  }

  at(
    coord: MapCoord, fieldSeed: number, dimension = 'surface',
  ): Record<string, number> {
    const out: Record<string, number> = {};
    const overrides = this.policy.dimensions[dimension];
    const contSeed = this.policy.continentSeedFrom(fieldSeed);
    const probe: ContinentProbe = { cell: null, coastal: null };
    for (const axis of Object.values(this.policy.axes)) {
      out[axis.id] = this.axisValueAt(axis, overrides?.[axis.id], coord, fieldSeed, contSeed, probe);
    }
    return out;
  }

  axisAt(
    coord: MapCoord, fieldSeed: number, axisId: string, dimension = 'surface',
  ): number {
    const axis = this.policy.axes[axisId];
    if (!axis) return 0;
    const probe: ContinentProbe = { cell: null, coastal: null };
    return this.axisValueAt(
      axis, this.policy.dimensions[dimension]?.[axisId], coord, fieldSeed, this.policy.continentSeedFrom(fieldSeed), probe,
    );
  }

  envelope(axis: string, spec: ClimateSpec): LevelEnvelope {
    if (typeof spec !== 'string') return spec;
    const env = this.policy.bands[axis]?.[spec];
    if (env) return env;
    const key = `${axis}:${spec}`;
    if (!this.warnedBands.has(key)) {
      this.warnedBands.add(key);
      this.warn(`[climate] unknown band '${spec}' on axis '${axis}' — treating as always-on`);
    }
    return {};
  }

  affinity(
    spec: Record<string, ClimateSpec> | undefined, climate: Record<string, number>,
  ): number {
    if (!spec) return 1;
    let m = 1;
    for (const axis in spec) {
      const v = climate[axis];
      if (v === undefined) continue;
      m *= presenceMul(this.envelope(axis, spec[axis]), v);
      if (m <= 0) return 0;
    }
    return m;
  }

  affinityEntries(spec: NativeClimateAffinity | undefined, climate: Record<string, number>): number {
    if (!spec) return 1;
    let m = 1;
    for (const [axis, value] of spec) {
      const v = climate[axis]; if (v === undefined) continue;
      m *= presenceMul(this.envelope(axis, value), v);
      if (m <= 0) return 0;
    }
    return m;
  }
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === 'object') { for (const x of Object.values(value)) freezeDeep(x); Object.freeze(value); }
  return value;
}
/** JSON publication must preserve the captured values exactly. Refuse signed
 * zero, nonstandard prototypes, sparse arrays and hidden/dynamic properties instead of letting JSON
 * erase them. Anchor undefined alone has an explicit tagged representation. */
function ownDataEntries(value: object): [string, unknown][] {
  if (Object.getPrototypeOf(value) !== Object.prototype)
    throw Error('Native climate source requires plain records');
  return Reflect.ownKeys(value).map(key => {
    const desc = Object.getOwnPropertyDescriptor(value, key)!;
    if (typeof key !== 'string' || !desc.enumerable || !('value' in desc))
      throw Error('Native climate source requires enumerable own data properties');
    return [key, desc.value];
  });
}
function copyData<T>(value: T, active = new Set<object>()): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (!value || typeof value !== 'object') throw Error('Native climate source requires lossless finite plain data');
  if (active.has(value)) throw Error('Native climate source cannot contain cycles');
  active.add(value);
  try {
    if (Array.isArray(value)) {
      const keys = Reflect.ownKeys(value).filter(key => key !== 'length');
      if (Object.getPrototypeOf(value) !== Array.prototype || keys.length !== value.length ||
          keys.some((key, index) => key !== String(index)))
        throw Error('Native climate source requires dense plain arrays');
      return keys.map(key => {
        const desc = Object.getOwnPropertyDescriptor(value, key)!;
        if (!desc.enumerable || !('value' in desc)) throw Error('Native climate source requires array data slots');
        return copyData(desc.value, active);
      }) as T;
    }
    return Object.fromEntries(ownDataEntries(value).map(([key, item]) => [key, copyData(item, active)])) as T;
  } finally { active.delete(value); }
}
export function captureClimateSourceData(policy: Pick<NativeClimatePolicy, 'axes' | 'bands' | 'dimensions' | 'climate'>): NativeClimateSource {
  // Validate complete registries before enumeration can discard symbols or
  // evaluate getters, including the owner's private dimension registry.
  const axes = copyData(policy.axes), bands = copyData(policy.bands), dimensions = copyData(policy.dimensions);
  const climate = Object.fromEntries(ownDataEntries(policy.climate));
  return freezeDeep({ schema: 1, algorithm: 'native-climate-v1',
    axes: Object.entries(axes),
    bands: Object.entries(bands).map(([axis, entries]) => [axis, Object.entries(entries)] as const),
    dimensions: Object.entries(dimensions).map(([dim, entries]) => [dim, Object.entries(entries)] as const),
    origin: copyData(climate.origin),
    anchors: ownDataEntries(climate.anchors as object).map(([name, at]) => [name, at === undefined ? {state:'undefined'} : at === null ? {state:'null'} : {state:'point',point:copyData(at)}] as const),
  } as NativeClimateSource);
}
/** For-in is intentional: preserve exactly the native affinity enumeration,
 * including inherited enumerable authored keys if a caller supplies them. */
export function captureNativeClimateAffinity(spec: Record<string, ClimateSpec> | undefined): NativeClimateAffinity | undefined {
  if (!spec) return undefined;
  const entries: [string,ClimateSpec][] = [];
  for (const key in spec) entries.push([key,copyData(spec[key])]);
  return freezeDeep(entries);
}
export function restoreNativeClimateAffinity(spec: NativeClimateAffinity): Record<string, ClimateSpec> {
  const entries=copyData(spec), record=Object.fromEntries(entries), keys=Object.keys(record);
  // A native for-in can put an inherited numeric key after own string keys.
  // A flat record would reorder that key; use affinityEntries for that case.
  if (keys.length!==entries.length || keys.some((key,i)=>key!==entries[i][0]))
    throw Error('Native climate affinity order requires the ordered-entry reader');
  return freezeDeep(record);
}
/** Structural hydration accepts the captured native algebra without retuning
 * numeric ranges or sorting semantic order. It rejects ambiguous tuple maps,
 * unknown schema/layer/anchor variants and nonfinite/non-plain data explicitly. */
export function hydrateNativeClimateSource(input: NativeClimateSource) {
  const source = freezeDeep(copyData(input));
  const fail = (): never => { throw Error('Invalid native climate source'); };
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const point = (v: unknown) => { if (!record(v) || typeof v.x !== 'number' || typeof v.y !== 'number') fail(); };
  const rows = (v: unknown, value: (v: any) => void) => {
    if (!Array.isArray(v)) fail(); const seen = new Set<string>();
    for (const row of v as any[]) {
      if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string' || seen.has(row[0])) fail();
      seen.add(row[0]); value(row[1]);
    }
    // Native registry capture uses Object.entries own-key order. Numeric keys
    // cannot be authored after strings (or descending) in that record fabric.
    // Refuse such external tuples rather than silently reorder during hydration.
    const keys=Object.keys(Object.fromEntries(v as [string,unknown][]));
    if (keys.some((key,i)=>key!==(v as [string,unknown][])[i][0])) fail();
  };
  const layers = (v: unknown) => {
    if (!Array.isArray(v)) fail();
    const fields: Record<string,string[]> = {noise:['cell','amp'],ridge:['cell','amp'],radial:['innerRadius','span','amp'],basin:['span','amp'],coastal:['probe','amp'],landmass:['spread'],const:['value']};
    for (const layer of v as any[]) {
      if (!record(layer) || typeof layer.kind !== 'string' || !Object.hasOwn(fields,layer.kind)) fail();
      for (const key of fields[layer.kind as string]) if (typeof layer[key] !== 'number') fail();
      for (const key of ['salt','innerRadius']) if (key in layer && typeof layer[key] !== 'number') fail();
      if ('anchor' in layer && typeof layer.anchor !== 'string') fail();
      if (layer.kind === 'basin' && typeof layer.anchor !== 'string') fail();
    }
  };
  const envelope = (v: unknown) => {
    if (!record(v)) fail();
    for (const key of ['from','to','fadeIn','fadeOut','mul']) if (key in (v as object) && typeof (v as any)[key] !== 'number') fail();
    if ('stops' in (v as object) && (!Array.isArray((v as any).stops) || (v as any).stops.some((s:any)=>!Array.isArray(s)||s.length!==2||s.some((n:unknown)=>typeof n!=='number')))) fail();
  };
  if (source.schema !== 1 || source.algorithm !== 'native-climate-v1') throw Error('Unsupported native climate source');
  rows(source.axes,v=>{if(!record(v)||typeof v.id!=='string'||typeof v.label!=='string'||typeof v.base!=='number')fail();layers(v.layers);});
  rows(source.bands,v=>rows(v,envelope));
  rows(source.dimensions,v=>rows(v,ov=>{if(!record(ov))fail();if('base' in ov&&typeof ov.base!=='number')fail();if('layers' in ov)layers(ov.layers);}));
  point(source.origin);
  rows(source.anchors,v=>{if(!record(v)||!['point','null','undefined'].includes(v.state as string))fail();if(v.state==='point')point(v.point);});
  const climate = freezeDeep({ origin: source.origin,
    anchors: Object.fromEntries(source.anchors.map(([name,at]) => [name,at.state === 'point' ? at.point : at.state === 'null' ? null : undefined])) });
  return freezeDeep({ source, axes: Object.fromEntries(source.axes),
    bands: Object.fromEntries(source.bands.map(([axis,entries])=>[axis,Object.fromEntries(entries)])),
    dimensions: Object.fromEntries(source.dimensions.map(([dim,entries])=>[dim,Object.fromEntries(entries)])),climate });
}
/** Owns immutable climate records and private memo/warning state. Numeric
 * immutability also requires source-owned continent callbacks: an aggregate
 * factory must construct those from its captured continent configuration,
 * never pass the classic live continent reader into a frozen geography source. */
export function createNativeClimateReader(input: NativeClimateSource,
  continent: Pick<NativeClimatePolicy,'continentCellAt' | 'continentSeedFrom'>,
  options: { warn?: (message: string) => void } = {}) {
  const hydrated=hydrateNativeClimateSource(input),{source,climate}=hydrated;
  const core = new NativeClimate({ ...hydrated,
    continentCellAt: continent.continentCellAt, continentSeedFrom: continent.continentSeedFrom,
    ...(options.warn ? { warn: options.warn } : {}) });
  return Object.freeze({ source, climate,
    climateAt: (coord: MapCoord, seed: number, dimension = 'surface') => core.at(coord,seed,dimension),
    climateAxisAt: (coord: MapCoord, seed: number, axis: string, dimension = 'surface') => core.axisAt(coord,seed,axis,dimension),
    climateEnvelope: (axis: string, spec: ClimateSpec) => core.envelope(axis,spec),
    climateAffinity: (spec: Record<string,ClimateSpec> | undefined, values: Record<string,number>) => core.affinity(spec,values),
    climateAffinityEntries: (spec: NativeClimateAffinity | undefined, values: Record<string,number>) => core.affinityEntries(spec,values),
  });
}
