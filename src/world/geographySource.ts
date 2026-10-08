/** Complete immutable native base geography at native numeric coordinates.
 * No worldmass mapping, saved-country activation or layout compiler admission. */
import type { MapCoord } from './coords';
import type { BiomeInfo, BiomeSeedDef, BiomeFieldBand, BiomeFloorDef } from './biomes';
import type { DimensionDef } from './dimensions';
import type { TilesetDef } from '../data/tilesets';
import type { Rng } from '../core/rng';
import { createNativeContinentReader, type ContinentCfg } from './continentCore';
import { NativeClimate, hydrateNativeClimateSource, type NativeClimateSource } from './climateCore';
import type { ClimateSpec } from './climate';
import { NativeFieldChoice } from './fieldChoice';
import { regionGeometry } from './regionGeometry';
import { nativeDimensionSite, nativeDimensionDepth } from './dimensionGeometry';
import { nativeTilesetChoice } from './tilesetChoice';

export interface NativeGeographyGeometry {
  cellSpan: number; jitter: number; renderCell: number; deepThreshold: number;
  regionScale: { default: readonly [number, number]; min: number; max: number; search: number };
  hillshade: { gain: number; peakFrom: number; peakGain: number; max: number };
  warpFadePerSec: number;
}
/** Rows preserve actual registry keys, insertion order and complete definitions.
 * Arrays preserve order and duplicates. This source contains no live closures. */
export interface NativeGeographySource {
  schema: 1;
  algorithm: 'native-geography-v1';
  seed: number;
  continent: ContinentCfg;
  climate: NativeClimateSource;
  biomes: [key: string, definition: BiomeInfo][];
  field: {
    table: BiomeSeedDef[]; bands: BiomeFieldBand[]; floors: BiomeFloorDef[];
    geometry: NativeGeographyGeometry;
    oceanBiome: string;
    marineMint: { deepBiome: string; openShallowBiome: string };
    portMint: { fallbackBiome: string };
  };
  dimensions: [key: string, definition: DimensionDef][];
  tilesets: [key: string, definition: TilesetDef][];
  pools: {
    shared: [biome: string, tilesets: string[]][];
    realms: [realm: string, pools: [biome: string, tilesets: string[]][]][];
  };
}
export type NativeGeographyReadonly<T> = T extends object
  ? { readonly [K in keyof T]: NativeGeographyReadonly<T[K]> } : T;

function fail(path: string, reason: string): never { throw Error(`Invalid native geography source at ${path}: ${reason}`); }
const RESERVED_LOOKUP_KEYS = new Set(['__proto__','constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','toLocaleString']);
function lookupKey(value: string, path: string): string {
  if (RESERVED_LOOKUP_KEYS.has(value)) fail(path,'prototype lookup aliases are unsupported');
  return value;
}
/** Copy descriptors before reading their values. JSON must not get a chance to
 * invoke getters/toJSON or silently erase undefined, holes, symbols or -0.
 * Shared acyclic objects may be copied twice; object identity is not source data. */
export function copyNativeGeographyData<T>(input: T): T {
  const visiting = new Set<object>();
  const copy = (value: unknown, path: string): unknown => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Object.is(value, -0)) fail(path, 'number must be finite and not negative zero');
      return value;
    }
    if (!value || typeof value !== 'object') fail(path, 'unsupported non-JSON value');
    if (visiting.has(value)) fail(path, 'cycle');
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (array ? proto !== Array.prototype : proto !== Object.prototype) fail(path, 'non-plain prototype');
    // Even Object.prototype can acquire inherited enumerable state. It must not
    // influence native for-in affinity multiplication outside the source bytes.
    for (const key in value) if (!Object.hasOwn(value, key)) fail(path, 'inherited enumerable field');
    const keys = Reflect.ownKeys(value);
    if (keys.some(k => typeof k !== 'string')) fail(path, 'symbol field');
    visiting.add(value);
    try {
      if (array) {
        if (keys.length !== value.length + 1 || !keys.includes('length')) fail(path, 'sparse array or non-index array property');
        const out: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          const d = Object.getOwnPropertyDescriptor(value, String(i));
          if (!d || !d.enumerable || !('value' in d)) fail(`${path}[${i}]`, 'array slots must be own enumerable data');
          out.push(copy(d.value, `${path}[${i}]`));
        }
        return out;
      }
      const entries: [string, unknown][] = [];
      for (const key of keys as string[]) {
        lookupKey(key,path);
        const d = Object.getOwnPropertyDescriptor(value, key)!;
        if (!d.enumerable || !('value' in d)) fail(`${path}.${key}`, 'fields must be own enumerable data');
        entries.push([key, copy(d.value, `${path}.${key}`)]);
      }
      return Object.fromEntries(entries);
    } finally { visiting.delete(value); }
  };
  return copy(input, '$') as T;
}
function freezeData<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freezeData(child); Object.freeze(value); }
  return value;
}
function record(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected record');
}
function array(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(path, 'expected array');
}
function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string') fail(path, 'expected string');
}
function number(value: unknown, path: string): asserts value is number {
  if (typeof value !== 'number') fail(path, 'expected number');
}
function fields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {
  for (const key of required) if (!Object.hasOwn(value, key)) fail(path, `missing ${key}`);
  for (const key of Object.keys(value)) if (!required.includes(key) && !optional.includes(key)) fail(path, `unsupported ${key}`);
}
function numericFields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {
  fields(value, required, optional, path);
  for (const key of Object.keys(value)) number(value[key], `${path}.${key}`);
}
function envelope(value: unknown, path: string): void {
  record(value, path); fields(value, [], ['from','to','fadeIn','fadeOut','stops','mul'], path);
  for (const key of ['from','to','fadeIn','fadeOut','mul']) if (Object.hasOwn(value,key)) number(value[key], `${path}.${key}`);
  if (Object.hasOwn(value,'stops')) {
    array(value.stops, `${path}.stops`);
    for (const [i,stop] of value.stops.entries()) { array(stop, `${path}.stops[${i}]`); if (stop.length !== 2) fail(path, 'invalid envelope stop'); stop.forEach(v=>number(v,path)); }
  }
}
function affinity(value: unknown, path: string): void {
  record(value, path);
  for (const [axis,spec] of Object.entries(value)) {
    lookupKey(axis,path); if (typeof spec === 'string') lookupKey(spec,path); else envelope(spec, `${path}.${axis}`);
  }
}
function palette(value: unknown, path: string, empty: boolean): void {
  array(value,path); if (!empty && !value.length) fail(path,'empty native candidate table');
  for (const [i,row] of value.entries()) {
    record(row,`${path}[${i}]`); fields(row,['biome'],['weight'],`${path}[${i}]`); string(row.biome,path); lookupKey(row.biome,path);
    if (Object.hasOwn(row,'weight')) number(row.weight,path);
  }
}
/** Tuple maps describe native own-key enumeration, never arbitrary Map order.
 * Ordinary records intentionally keep their native Object.prototype lookup
 * behavior for unknown caller keys; complete definitions remain own entries. */
function rows(value: unknown, path: string, check: (v: unknown, path: string)=>void): void {
  array(value,path); const seen = new Set<string>(), entries: [string,unknown][] = [];
  for (const [i,row] of value.entries()) {
    array(row,`${path}[${i}]`); if (row.length !== 2) fail(path,'expected key/definition tuple'); string(row[0],path); lookupKey(row[0],path);
    if (seen.has(row[0])) fail(path,'duplicate registry key'); seen.add(row[0]); check(row[1],`${path}.${row[0]}`); entries.push([row[0],row[1]]);
  }
  if (Object.keys(Object.fromEntries(entries)).some((key,i)=>key !== entries[i][0])) fail(path,'tuple order cannot represent native own-key order');
}
function geometry(value: unknown, path: string): void {
  record(value,path); fields(value,['cellSpan','jitter','renderCell','deepThreshold','regionScale','hillshade','warpFadePerSec'],[],path);
  for (const key of ['cellSpan','jitter','renderCell','deepThreshold','warpFadePerSec']) number(value[key],`${path}.${key}`);
  if ((value.cellSpan as number) <= 0 || (value.renderCell as number) <= 0) fail(path,'cell spans must be positive');
  record(value.regionScale,path); fields(value.regionScale,['default','min','max','search'],[],path);
  const scale = value.regionScale; for (const key of ['min','max','search']) number(scale[key],path);
  array(scale.default,path); if (scale.default.length !== 2) fail(path,'region default needs two values'); scale.default.forEach(v=>number(v,path));
  if ((scale.min as number) <= 0 || (scale.max as number) < (scale.min as number) || !Number.isSafeInteger(scale.search) || (scale.search as number) < 0) fail(path,'invalid region search/scale');
  record(value.hillshade,path); numericFields(value.hillshade,['gain','peakFrom','peakGain','max'],[],path);
}
function validateSource(value: unknown): asserts value is NativeGeographySource {
  record(value,'$'); fields(value,['schema','algorithm','seed','continent','climate','biomes','field','dimensions','tilesets','pools'],[],'$');
  if (value.schema !== 1 || value.algorithm !== 'native-geography-v1') fail('$','unsupported schema/algorithm');
  if (!Number.isInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff) fail('$.seed','expected uint32');
  record(value.continent,'$.continent'); numericFields(value.continent,['cellSpan','jitter','oceanFrac','bridgeChance'],[],'$.continent');
  if ((value.continent.cellSpan as number) <= 0) fail('$.continent','cell span must be positive');
  // Existing climate hydration validates the exact native layers, envelopes and
  // tagged anchors. The strict outer copy has already checked every descriptor.
  const climate = hydrateNativeClimateSource(value.climate as NativeClimateSource);
  const validLayers = (layers: readonly import('./climate').ClimateLayer[], path: string) => {
    for (const layer of layers) {
      if ('anchor' in layer && layer.anchor !== undefined) lookupKey(layer.anchor,path);
      if ((layer.kind === 'noise' || layer.kind === 'ridge') && layer.cell <= 0) fail(path,'noise/ridge cell must be positive');
      if ((layer.kind === 'radial' || layer.kind === 'basin') && layer.span <= 0) fail(path,'radial/basin span must be positive');
    }
  };
  for (const [axis,def] of climate.source.axes) { lookupKey(axis,'$.climate.axes'); lookupKey(def.id,'$.climate.axes.id'); validLayers(def.layers,'$.climate.axes.'+axis); }
  for (const [axis,bands] of climate.source.bands) { lookupKey(axis,'$.climate.bands'); for (const [name] of bands) lookupKey(name,'$.climate.bands'); }
  for (const [anchor] of climate.source.anchors) lookupKey(anchor,'$.climate.anchors');
  for (const [dim,overrides] of climate.source.dimensions) {
    lookupKey(dim,'$.climate.dimensions'); for (const [axis,def] of overrides) { lookupKey(axis,'$.climate.dimensions');
      if (def.layers) validLayers(def.layers,'$.climate.dimensions.'+dim+'.'+axis);
    }
  }
  rows(value.biomes,'$.biomes',(def,path)=>{
    record(def,path); for (const key of ['patronFaction','mapColor','label']) string(def[key],`${path}.${key}`);
    if (Object.hasOwn(def,'climate')) affinity(def.climate,`${path}.climate`);
    if (Object.hasOwn(def,'regionScale')) { array(def.regionScale,path); if (def.regionScale.length !== 2) fail(path,'region scale pair required'); def.regionScale.forEach(v=>number(v,path)); }
  });
  record(value.field,'$.field'); const field = value.field;
  fields(field,['table','bands','floors','geometry','oceanBiome','marineMint','portMint'],[],'$.field');
  palette(field.table,'$.field.table',false); geometry(field.geometry,'$.field.geometry'); string(field.oceanBiome,'$.field.oceanBiome');
  array(field.bands,'$.field.bands');
  for (const [i,band] of field.bands.entries()) {
    const path = `$.field.bands[${i}]`; record(band,path); fields(band,['id','when','table'],['mode'],path); string(band.id,path);
    if (Object.hasOwn(band,'mode') && band.mode !== 'replace' && band.mode !== 'tilt') fail(path,'unknown band mode');
    record(band.when,path); fields(band.when,['axis','env'],[],path); string(band.when.axis,path); lookupKey(band.when.axis,path); envelope(band.when.env,path); palette(band.table,path,band.mode === 'tilt');
  }
  array(field.floors,'$.field.floors');
  for (const [i,floor] of field.floors.entries()) {
    const path = `$.field.floors[${i}]`; record(floor,path); fields(floor,['biome','discs'],[],path); string(floor.biome,path); lookupKey(floor.biome,path); array(floor.discs,path);
    for (const disc of floor.discs) { record(disc,path); fields(disc,['anchor','r'],[],path); string(disc.anchor,path); lookupKey(disc.anchor,path); number(disc.r,path); if (disc.r < 0) fail(path,'negative floor radius'); }
  }
  record(field.marineMint,'$.field.marineMint'); fields(field.marineMint,['deepBiome','openShallowBiome'],[],'$.field.marineMint');
  string(field.marineMint.deepBiome,'$.field.marineMint'); string(field.marineMint.openShallowBiome,'$.field.marineMint');
  record(field.portMint,'$.field.portMint'); fields(field.portMint,['fallbackBiome'],[],'$.field.portMint'); string(field.portMint.fallbackBiome,'$.field.portMint');
  rows(value.dimensions,'$.dimensions',(def,path)=>{
    record(def,path); for (const key of ['id','label','color']) string(def[key],`${path}.${key}`);
    if (Object.hasOwn(def,'biomes')) palette(def.biomes,`${path}.biomes`,true);
  });
  if (!(value.dimensions as [string,unknown][]).some(([key])=>key === 'surface')) fail('$.dimensions','surface fallback definition required');
  rows(value.tilesets,'$.tilesets',(def,path)=>{
    record(def,path);
    // Retain the complete native definition and require its mandatory payload
    // shape. This is source completeness, not layout compiler validation.
    string(def.id,path); string(def.spawnerId,path); record(def.theme,path); record(def.packs,path);
    for (const key of ['nameFirst','nameSecond']) { array(def[key],path); def[key].forEach(v=>string(v,path)); }
    for (const key of ['sizeW','sizeH']) { array(def[key],path); if (def[key].length !== 2) fail(path,'tileset size pair required'); def[key].forEach(v=>number(v,path)); }
    array(def.layout,path); array(def.objectives,path);
    if (Object.hasOwn(def,'depthAffinity')) envelope(def.depthAffinity,`${path}.depthAffinity`);
    if (Object.hasOwn(def,'geoAffinity')) affinity(def.geoAffinity,`${path}.geoAffinity`);
  });
  record(value.pools,'$.pools'); fields(value.pools,['shared','realms'],[],'$.pools');
  const faceIds = new Set((value.tilesets as [string,unknown][]).map(([key])=>key));
  const pool = (v: unknown,path:string) => {
    array(v,path); for (const id of v) { string(id,path); lookupKey(id,path); if (!faceIds.has(id)) fail(path,'pool references an absent tileset source'); }
  };
  rows(value.pools.shared,'$.pools.shared',pool);
  rows(value.pools.realms,'$.pools.realms',(v,path)=>rows(v,path,pool));
}
/** Supported work envelope for native-geography-v1. Refuse outside it; never
 * clamp native configuration or truncate a floor/region/landfall search. */
export const NATIVE_GEOGRAPHY_LIMITS = Object.freeze({
  maxRegionSearch:16, maxFloorCandidateScans:262144, maxLandfallSteps:4096,
});
function safeInteger(value:number,path:string):void {
  if (!Number.isSafeInteger(value) || value+1 === value || value-1 === value) fail(path,'lattice index cannot progress exactly');
}
function finite(value:number,path:string):void { if (!Number.isFinite(value)) fail(path,'nonfinite derived arithmetic'); }
function pointData(at:MapCoord,path:string):MapCoord {
  if (!at || typeof at !== 'object') fail(path,'expected coordinate data');
  const x=Object.getOwnPropertyDescriptor(at,'x'),y=Object.getOwnPropertyDescriptor(at,'y');
  if (!x || !y || !('value' in x) || !('value' in y) || typeof x.value !== 'number' || typeof y.value !== 'number') fail(path,'coordinates require own numeric data fields');
  finite(x.value,path);finite(y.value,path);return {x:x.value,y:y.value};
}
function latticeRange(at:MapCoord,span:number,jitter:number,search:number,path:string):void {
  for (const coordinate of [at.x,at.y]) {
    const cell=Math.floor(coordinate/span);safeInteger(cell-search-1,path);safeInteger(cell+search+1,path);
    for (const edge of [cell-search+.5-Math.abs(jitter)/2,cell+search+.5+Math.abs(jitter)/2]) {
      const site=edge*span;finite(site,path);finite(2*((site-coordinate)**2),path);
    }
  }
}
function climateLayers(source:NativeGeographySource):import('./climate').ClimateLayer[] {
  return [...source.climate.axes.flatMap(([,def])=>def.layers),
    ...source.climate.dimensions.flatMap(([,axes])=>axes.flatMap(([,def])=>def.layers??[]))];
}
function anchorAt(source:NativeGeographySource,name:string|undefined):MapCoord|undefined {
  if (name === undefined || name === 'origin') return source.climate.origin;
  const value=source.climate.anchors.find(([key])=>key === name)?.[1];
  return value?.state === 'point' ? value.point : undefined;
}
function checkPoint(source:NativeGeographySource,at:MapCoord,path:string):void {
  const {geometry}=source.field;
  latticeRange(at,geometry.cellSpan,geometry.jitter,geometry.regionScale.search,path+'.field');
  latticeRange(at,source.continent.cellSpan,source.continent.jitter,1,path+'.continent');
  for (const layer of climateLayers(source)) {
    if (layer.kind === 'noise' || layer.kind === 'ridge') latticeRange(at,layer.cell,0,1,path+'.noise');
    if (layer.kind === 'radial' || layer.kind === 'basin') {
      // Unlike floor discs, an explicitly named climate anchor 'origin' is a
      // registry lookup; only an omitted radial anchor means climate.origin.
      const anchor=layer.anchor === undefined ? source.climate.origin
        : source.climate.anchors.find(([key])=>key === layer.anchor)?.[1];
      const p=anchor && 'state' in anchor ? (anchor.state === 'point' ? anchor.point : undefined) : anchor as MapCoord|undefined;
      if (p) { const distance=Math.sqrt((at.x-p.x)**2+(at.y-p.y)**2);finite(distance,path+'.radial');finite((distance-(layer.innerRadius??0))/layer.span,path+'.radial'); }
    }
    if (layer.kind === 'coastal') for (let i=0;i<4;i++) {
      const a=i/4*Math.PI*2,probe={x:at.x+Math.cos(a)*layer.probe,y:at.y+Math.sin(a)*layer.probe};
      finite(probe.x,path+'.coastal');finite(probe.y,path+'.coastal');latticeRange(probe,source.continent.cellSpan,source.continent.jitter,1,path+'.coastal');
    }
  }
}
function validateExecutionDomain(source:NativeGeographySource):void {
  if (source.field.geometry.regionScale.search > NATIVE_GEOGRAPHY_LIMITS.maxRegionSearch) fail('$.field.geometry.regionScale.search','unsupported region work budget');
  checkPoint(source,pointData(source.climate.origin,'$.climate.origin'),'$.climate.origin');
  for (const [name,anchor] of source.climate.anchors) if (anchor.state === 'point') checkPoint(source,pointData(anchor.point,'$.climate.anchors.'+name),'$.climate.anchors.'+name);
  let scans=0;const {cellSpan:span,jitter}=source.field.geometry;
  for (const floor of source.field.floors) for (const disc of floor.discs) {
    const at=anchorAt(source,disc.anchor);if (!at) continue;
    const x0=Math.floor((at.x-disc.r)/span)-1,x1=Math.floor((at.x+disc.r)/span)+1;
    const y0=Math.floor((at.y-disc.r)/span)-1,y1=Math.floor((at.y+disc.r)/span)+1;
    for (const n of [x0,x1,y0,y1]) safeInteger(n,'$.field.floors');
    const cells=(x1-x0+1)*(y1-y0+1);scans+=cells;
    if (!Number.isSafeInteger(cells) || !Number.isSafeInteger(scans) || scans>NATIVE_GEOGRAPHY_LIMITS.maxFloorCandidateScans) fail('$.field.floors','unsupported aggregate candidate scan budget');
    // A site's full possible jitter extent must remain in the numeric domain
    // of every continent/climate operation used by the native floor scan.
    for (const gx of [x0+.5-Math.abs(jitter)/2,x1+.5+Math.abs(jitter)/2])
      for (const gy of [y0+.5-Math.abs(jitter)/2,y1+.5+Math.abs(jitter)/2])
        checkPoint(source,{x:gx*span,y:gy*span},'$.field.floors.site');
  }
}

/** Exact serialized bytes are the source identity at this boundary. Nested
 * property order is retained; no canonical sorting or partial sampling hash. */
export function hydrateNativeGeographySource(input: unknown) {
  const source = copyNativeGeographyData(input); validateSource(source); validateExecutionDomain(source);
  const identity = JSON.stringify(source);
  freezeData(source);
  return Object.freeze({ source, identity });
}
export function restoreNativeGeographySource(bytes: string): Readonly<NativeGeographySource> {
  if (typeof bytes !== 'string') fail('$','source bytes must be a string');
  const hydrated = hydrateNativeGeographySource(JSON.parse(bytes) as unknown);
  if (hydrated.identity !== bytes) fail('$','source bytes must be the exact native serialization');
  return hydrated.source;
}
/** Private execution views have own-only lookup, insulating native operations
 * from later Object.prototype data changes. Source bytes remain ordinary JSON.
 * Reserved prototype aliases are outside this new schema/API; classic wrappers
 * are unchanged. This does not defend against arbitrary intrinsic monkeypatches. */
function ownData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(v=>ownData(v)) as T;
  if (value && typeof value === 'object') {
    const out = Object.create(null) as Record<string,unknown>;
    for (const [key,child] of Object.entries(value)) out[key] = ownData(child);
    return out as T;
  }
  return value;
}
/** Every native reader and memo belongs to this complete immutable instance. */
export function createNativeGeographyReader(input: unknown) {
  const {source,identity} = hydrateNativeGeographySource(input), seed = source.seed;
  const runtime = freezeData(ownData(source));
  const continent = createNativeContinentReader(runtime.continent), continentSeed = continent.continentSeedFrom(seed);
  const hydratedClimate = hydrateNativeClimateSource(source.climate);
  const climateData = freezeData(ownData(hydratedClimate));
  const climate = new NativeClimate({...climateData,
    continentCellAt:continent.continentCellAt,continentSeedFrom:continent.continentSeedFrom});
  // Native unknown-band fallback is an ordinary empty object. Convert that
  // result too, before presenceMul can see inherited envelope properties.
  const nativeEnvelope=climate.envelope.bind(climate);
  climate.envelope=(axis,spec)=>ownData(nativeEnvelope(axis,spec));
  const biomes = freezeData(ownData(Object.fromEntries(runtime.biomes)));
  const dimensions = freezeData(ownData(Object.fromEntries(runtime.dimensions)));
  const dimensionSource = Object.assign(Object.create(null) as Record<string,DimensionDef>,Object.fromEntries(source.dimensions));
  const tilesets = freezeData(ownData(Object.fromEntries(runtime.tilesets)));
  const shared = freezeData(ownData(Object.fromEntries(runtime.pools.shared)));
  const realms = freezeData(ownData(Object.fromEntries(runtime.pools.realms.map(([realm,pools])=>[realm,Object.fromEntries(pools)]))));
  const {field} = runtime;
  const point=(at:MapCoord)=>{const clean=pointData(at,'coordinate');checkPoint(runtime,clean,'coordinate');return clean;};
  const cell=(gx:number,gy:number)=>{
    safeInteger(gx-1,'cell');safeInteger(gx+1,'cell');safeInteger(gy-1,'cell');safeInteger(gy+1,'cell');
    if (!Number.isSafeInteger(gx) || !Number.isSafeInteger(gy)) fail('cell','integer cell address required');
    const site=continent.cellSite(gx,gy,continentSeed);point(site);
  };
  // Geometry selects jittered sites before field choice samples climate. Guard
  // those actual sites too; validating only the caller's point is insufficient.
  const climateValues = (at:MapCoord,fieldSeed:number,dimension='surface') => ownData(climate.at(point(at),fieldSeed,dimension));
  const affinityAt = (spec:Record<string,ClimateSpec>|undefined,values:Record<string,number>) => climate.affinity(spec,ownData(values));
  const choice = new NativeFieldChoice({ table:field.table,bands:field.bands,floors:field.floors,biomes,
    geometry:field.geometry,climate:climateData.climate,climateAt:climateValues,climateAffinity:affinityAt,
    continentAt:continent.continentAt,continentSeedFrom:continent.continentSeedFrom });
  const regionWinner = (at:MapCoord) => regionGeometry(point(at),seed,{
    cellSpan:field.geometry.cellSpan,jitter:field.geometry.jitter,regionScale:field.geometry.regionScale,
    biomeAtCell:(gx,gy,site,fieldSeed)=>choice.pick(field.table,gx,gy,site,fieldSeed),
    scaleForBiome:biome=>biomes[biome]?.regionScale });
  const dimensionDef = (id:string|undefined) => dimensions[lookupKey(id ?? 'surface','dimension')] ?? dimensions.surface;
  const inputClimate = (values:Record<string,number>) => {
    const clean = copyNativeGeographyData(values); record(clean,'climate');
    for (const value of Object.values(clean)) number(value,'climate');
    return ownData(clean);
  };
  const inputAffinity = (spec:Record<string,ClimateSpec>|undefined) => {
    if (spec === undefined) return undefined;
    const clean = copyNativeGeographyData(spec); affinity(clean,'affinity'); return ownData(clean);
  };
  return Object.freeze({
    source:source as NativeGeographyReadonly<NativeGeographySource>, identity, continentSeed,
    cellKind:(gx:number,gy:number)=>{cell(gx,gy);return continent.cellKind(gx,gy,continentSeed);},
    cellSite:(gx:number,gy:number)=>{cell(gx,gy);return continent.cellSite(gx,gy,continentSeed);},
    continentCellAt:(at:MapCoord)=>continent.continentCellAt(point(at),continentSeed),
    continentAt:(at:MapCoord)=>continent.continentAt(point(at),continentSeed),
    landfallFrom:(from:MapCoord,angle:number,maxSteps=30)=>{
      if (!Number.isSafeInteger(maxSteps) || maxSteps<0 || maxSteps>NATIVE_GEOGRAPHY_LIMITS.maxLandfallSteps) fail('landfall','unsupported step budget');
      finite(angle,'landfall angle');const start=point(from),distance=runtime.continent.cellSpan*.45*(maxSteps+.5);
      point({x:start.x+Math.cos(angle)*distance,y:start.y+Math.sin(angle)*distance});
      return continent.landfallFrom(start,angle,continentSeed,maxSteps);
    },
    climateAt:(at:MapCoord,dimension='surface')=>climate.at(point(at),seed,lookupKey(dimension,'dimension')),
    climateAxisAt:(at:MapCoord,axis:string,dimension='surface')=>climate.axisAt(point(at),seed,lookupKey(axis,'axis'),lookupKey(dimension,'dimension')),
    climateEnvelope:(axis:string,spec:ClimateSpec)=>{
      lookupKey(axis,'axis'); const clean = copyNativeGeographyData(spec);
      if (typeof clean === 'string') lookupKey(clean,'band'); else envelope(clean,'envelope');
      // Return a frozen ordinary data object, never a private runtime view.
      return freezeData(JSON.parse(JSON.stringify(climate.envelope(axis,clean))) as import('../engine/presence').LevelEnvelope);
    },
    climateAffinity:(spec:Record<string,ClimateSpec>|undefined,values:Record<string,number>)=>climate.affinity(inputAffinity(spec),inputClimate(values)),
    regionWinner,
    biomeAt:(at:MapCoord)=>{const p=point(at);return continent.continentAt(p,continentSeed).kind === 'ocean' ? field.oceanBiome : regionWinner(p).biome;},
    biomeDepth:(at:MapCoord)=>regionWinner(at).depth,
    dimensionDef:(id?:string)=>(dimensionSource[lookupKey(id ?? 'surface','dimension')] ?? dimensionSource.surface) as NativeGeographyReadonly<DimensionDef>,
    dimensionBiomeAt:(dimension:string,at:MapCoord)=>{
      const p=point(at),table = dimensionDef(dimension).biomes;
      if (!table?.length) return 'grove';
      const site = nativeDimensionSite(p,seed,field.geometry);
      return choice.pick(table,site.gx,site.gy,site.site,seed,dimension);
    },
    dimensionBiomeDepth:(dimension:string,at:MapCoord)=>{
      const p=point(at);if (!dimensionDef(dimension).biomes?.length) return 0;
      return nativeDimensionDepth(p,seed,field.geometry);
    },
    floorSeats:()=>choice.seats(seed),
    pickTilesetForBiome:(biome:string,rng:Pick<Rng,'pick'|'range'>,depth?:number,realm?:string,atClimate?:Record<string,number>)=> {
      lookupKey(biome,'biome'); if (realm !== undefined) lookupKey(realm,'realm');
      const values = atClimate === undefined ? undefined : inputClimate(atClimate);
      return nativeTilesetChoice({shared,realms,definitions:tilesets,climateAffinity:affinityAt},biome,rng,depth,realm,values);
    },
  });
}
export type NativeGeographyReader = ReturnType<typeof createNativeGeographyReader>;
