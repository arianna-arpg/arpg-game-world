import { captureNativeGeneration, nativeGenerationRequirements, type NativeGenerationSidechannels } from './nativeGeneration';
import { discTerrainClear } from './geographicAccess';
import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import { TILESETS, pickTilesetVariant } from '../data/tilesets';
import { STRUCTURES } from '../data/structures';
import { sidezoneOf } from '../data/sidezones';
import type { ZoneDef } from '../data/zones';
import { BIOMES } from '../world/biomes';
import { GridWalkField, type PackedWalk } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { generateLayout, compositionDefs, blocksMovement, doodadRuleOf, hitSurfaceOf,
  structureMaxFootprint, type GeneratedLayout, type Doodad } from '../engine/levelgen';
import { massKindIds, massKindOf } from '../engine/massif';
import { shapeContains, shapeBoundR } from '../engine/shapes';
import { canonical, freezeData, massDigest, massHash } from './random';
import { captureNativeEffectSources, nativeEffectRegistryHash, nativeEffectRequirements,
  nativeHavenEffectSupported, validateNativeEffectSources, type NativeEffectSources } from './nativeEffectSources';

export type NativeFeatureKind = 'massif' | 'structure' | 'composition';
export interface NativeFeatureSource {
  kind: NativeFeatureKind; id: string; tileset: string; variant?: string;
  /** Native massif primitive, distinct from the full tileset layout package. */
  scope?: 'landform'; poolIndex?:number;
}
export interface NativeFeatureRequest {
  /** A physical place identity, never a page/cache key. */
  id: string; seed: number; source: NativeFeatureSource;
  level?: number; size?: { w: number; h: number }; geo?: ZoneDef['geo'];
  layoutParams?: Record<string, unknown>;
  /** Use the native cave stamp, then seat that real mouth against native rock.
   * This is explicit source policy, never an automatic extra side area. */
  rockEntrance?: boolean;
}
export interface NativeFeatureEntrance {
  id: string; doodadIndex: number; kind: string; seed: number;
  pos: Vec2; tier: number; rockBacked: boolean;
}
type NativeLayoutData = Omit<GeneratedLayout, 'walk'>;
export interface NativeFeatureDescriptor {
  schema: 1; compiler: 'native-feature-v1'; id: string; seed: number;
  source: NativeFeatureSource;
  /** Primitives compose into the containing region; a full native tileset
   * owns its original environmental mechanics. Source theme is retained below. */
  environment:{owner:'source'|'containing-region';sourceMechanics:string[]};
  /** Original registry parameters for provenance, not live generation reads. */
  authored: { tileset: unknown; biome: unknown; feature?: unknown };
  /** Native generation may append fitted puzzles/tiers to the resolved zone. */
  sourceZone?:ZoneDef;
  zone: ZoneDef;
  geometry: { grid?: PackedWalk; layout: NativeLayoutData; support: number[] };
  /** Full generation side registries; absent only on grandfathered checkpoints. */
  sidechannels?:Readonly<NativeGenerationSidechannels>;
  /** Rule effects are resolved after native generation and frozen before birth.
   * Absent only on historical descriptors which cannot acquire new effects. */
  effectSources?:Readonly<NativeEffectSources>;
  entrances: NativeFeatureEntrance[];
  approach: Vec2;
  requirements: string[];
  unsupported: string[];
  hash: string;
}
export interface NativeFeatureBlueprint {
  descriptor: Readonly<NativeFeatureDescriptor>;
  /** Independent native mutable instances for this admission. Door opening may
   * repaint grid; later compilation must still reproduce the saved foundation. */
  layout: GeneratedLayout; grid?: GridWalkField; supportMask: Uint8Array;
  entrances: NativeFeatureEntrance[]; approach: Vec2;
  requirements: readonly string[]; unsupported: readonly string[];
  /** Undefined is transparent. Never project finite native arena bounds. */
  regionAt(x: number, y: number): string | undefined;
}
export const NATIVE_FEATURE_LIMITS = Object.freeze({
  minSize: 480, maxSize: 6000, maxCells: 40000, maxDoodads: 9000,
  maxEntrances: 64, bodyRadius: 12, perimeter: 60,
});
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Source catalogue, not a promise that every output has a live consumer.
 * The native bootstrap must run first, as it does for generateLayout itself. */
export function nativeFeatureCatalogue(biome?: string) {
  return Object.values(TILESETS).filter(t => !biome || t.biome === biome).map(t => {
    const b = BIOMES[t.biome ?? ''];
    const params = { ...b?.layoutParams, ...t.layoutParams };
    const mix = params.massifMasses as { kind: string }[] | undefined;
    const massSources=[...(mix??[]).map((m,poolIndex)=>({kind:m.kind,poolIndex} as {kind:string;variant?:string;poolIndex:number})),
      ...(t.variants??[]).flatMap(v=>((v.layoutParams?.massifMasses??mix??[]) as {kind:string}[]).map((m,poolIndex)=>({kind:m.kind,variant:v.name,poolIndex})))];
    return freezeData({
      tileset: t.id, biome: t.biome ?? '', variants: (t.variants ?? []).map(v => v.name),
      massif: t.forceLayout === 'massif' || !!mix || !!b?.allowedLayouts?.massif,
      massKinds: [...new Set(massSources.map(m=>m.kind))].filter(id => massKindIds().includes(id)),
      massSources:massSources.filter(m=>massKindIds().includes(m.kind)),
      rockMassKinds:[...new Set(massSources.map(m=>m.kind))].filter(id=>massKindIds().includes(id)&&['crag','sandstone','slagcrag','cliff_face'].includes(massKindOf(id).region)),
      structures: [...new Set([...(b?.structures ?? []), ...(t.structures ?? [])].map(r => r.structure))],
      compositions: [...new Set([...(b?.compositions ?? []), ...(t.compositions ?? [])].map(r => r.composition))],
      layouts: t.forceLayout ? [t.forceLayout] : Object.keys(b?.allowedLayouts ?? { plains: 1 }),
      surfaceCautions: [t.sky === 'sheltered' ? 'sheltered-context' : '', t.caveFace ? 'cave-context' : '',
        t.annexes ? 'annex-mint' : '', t.blend ? 'blend-mint' : ''].filter(Boolean),
    });
  }).sort((a, b) => a.tileset.localeCompare(b.tileset));
}
function sourceZone(request: NativeFeatureRequest): { zone: ZoneDef; authored: NativeFeatureDescriptor['authored'] } {
  const source = request.source, ts = TILESETS[source.tileset];
  if (!ts || !request.id || !Number.isInteger(request.seed) || request.seed < 0 || request.seed > 0xffffffff)
    throw Error('Native feature requires a registered source and stable uint32 identity');
  const biome = BIOMES[ts.biome ?? ''];
  const rng = new Rng(request.seed);
  const variant = source.variant === undefined ? (source.scope==='landform'?undefined:ts.variants?.length ? pickTilesetVariant(rng, ts.variants) : undefined)
    : ts.variants?.find(v => v.name === source.variant);
  if (source.variant !== undefined && !variant) throw Error('Unknown native feature variant');
  const footprint = source.kind === 'structure' ? structureMaxFootprint(source.id) : null;
  const size = request.size ?? { w: Math.ceil(Math.max(1800, (footprint?.w ?? 0) + 600) / 30) * 30,
    h: Math.ceil(Math.max(1800, (footprint?.h ?? 0) + 600) / 30) * 30 };
  if (![size.w, size.h].every(n => Number.isInteger(n) && n >= NATIVE_FEATURE_LIMITS.minSize
    && n <= NATIVE_FEATURE_LIMITS.maxSize && n % 30 === 0)
    || size.w / 30 * (size.h / 30) > NATIVE_FEATURE_LIMITS.maxCells)
    throw Error('Native feature exceeds its physical compilation bounds');
  const params = { ...biome?.layoutParams, ...ts.layoutParams, ...variant?.layoutParams, ...request.layoutParams };
  const zone: ZoneDef = {
    id: request.id, name: source.kind==='massif'
      ?[ts.nameFirst[request.seed%ts.nameFirst.length],ts.nameSecond[(request.seed>>>8)%ts.nameSecond.length]].filter(Boolean).join(' ')
      :source.id.replaceAll('_',' ').replace(/^./,s=>s.toUpperCase()), seed: request.seed, level: request.level ?? 1,
    size: { ...size }, shape: 'rect', biome: ts.biome, tileset: ts.id,
    theme: { ...ts.theme, ...variant?.theme }, layout: [], objective: { kind: 'none' },
    exits: [], map: { x: 0, y: 0 }, layoutParams: params,
    ...(request.geo ? { geo: copy(request.geo) } : {}),
    ...(ts.sky ? { sky: ts.sky } : {}),
    ...(variant ? { variantName: variant.name } : {}),
  };
  if (!Number.isInteger(zone.level) || zone.level < 1 || zone.level > 1000) throw Error('Invalid native feature level');
  let feature: unknown;
  if (source.kind === 'massif') {
    if (source.id !== source.tileset && !massKindIds().includes(source.id))
      throw Error('Unknown native massif source');
    feature = source.id === source.tileset ? undefined : massKindOf(source.id);
    zone.layoutType = 'massif';
    // A feature owns interior bodies, never the enclosing arena. The native
    // inset dial keeps ordinary texture bodies away from a clipping boundary.
    zone.layoutParams = { ...params, massifInsetMin: Math.max(360, Number(params.massifInsetMin) || 0) };
    if (source.id !== source.tileset) {
      const pool=params.massifMasses as {kind:string;weight:number}[]|undefined;
      const nativeRow=source.poolIndex===undefined?pool?.find(r=>r.kind===source.id):pool?.[source.poolIndex];
      if(source.poolIndex!==undefined&&(!Number.isInteger(source.poolIndex)||nativeRow?.kind!==source.id))throw Error('Native landform pool identity changed');
      if(source.scope==='landform'&&!nativeRow)throw Error('Native landform must belong to its source massif pool');
      zone.layoutParams.massifMasses = [{...(nativeRow??{kind:source.id}),weight:1}];
    }
    if(source.scope==='landform'){
      if(source.id===source.tileset)throw Error('Native landform needs an explicit registered massif kind');
      // This source IS the native mass kind/pool, including its dress, tenants,
      // bores and post-generators. Unrelated tileset stamps are not its source.
      // Every output of the native generator still survives admission intact.
      zone.layout=[];
    }else {
    zone.layout = [...(ts.common ?? []), ...(variant?.layout ?? ts.layout)];
    zone.structures = [...(biome?.structures ?? []), ...(ts.structures ?? [])];
    zone.landmarks = [...(biome?.landmarks ?? []), ...(ts.landmarks ?? [])];
    zone.compositions = [...(biome?.compositions ?? []), ...(ts.compositions ?? [])];
    if (ts.hollows) zone.hollows = ts.hollows;
    if (ts.puzzles) zone.puzzles = ts.puzzles;
    if (ts.scenery) zone.scenery = ts.scenery;
    }
    if (request.rockEntrance) zone.layout.push({ kind: 'cave', count: [1, 1] });
  } else if (source.kind === 'structure') {
    feature = STRUCTURES[source.id];
    if (!feature || !footprint) throw Error('Unknown native structure source');
    zone.layoutType = 'plains';
    zone.fixtures = [{ structure: source.id, x: size.w / 2, y: size.h / 2 }];
  } else if (source.kind === 'composition') {
    feature = compositionDefs().find(c => c.id === source.id);
    if (!feature) throw Error('Unknown native composition source');
    zone.layoutType = 'plains';
    zone.compositions = [{ composition: source.id, chance: 1 }];
  } else throw Error('Unsupported native feature source kind');
  return { zone: copy(zone), authored: copy({ tileset: ts, biome: biome ?? null, ...(feature ? { feature } : {}) }) };
}
/** Cheap authored-source identity for preparation across worker realms. This
 * resolves the same seeded variant and parameters without generating geometry. */
export function nativeFeatureSourceIdentity(request:NativeFeatureRequest){
  const {zone,authored}=sourceZone(request);
  return {compiler:'native-feature-v1' as const,requestHash:massDigest(request),sourceHash:massDigest({zone,authored,effectRegistryHash:nativeEffectRegistryHash()})};
}
function bodyClear(grid: GridWalkField, doodads: Doodad[], p: Vec2, radius = NATIVE_FEATURE_LIMITS.bodyRadius): boolean {
  for (const [dx, dy] of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]])
    if (!grid.isWalkable(p.x + dx, p.y + dy)) return false;
  return !doodads.some(d => (d.tier ?? 0) === 0 && blocksMovement(d)
    && shapeContains(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, p.x, p.y, radius));
}
function backedByRock(grid: GridWalkField, p: Vec2): boolean {
  for (const [dx, dy] of [[60,0],[-60,0],[0,60],[0,-60]]) {
    const k = regionKind(grid.regionAt(p.x + dx, p.y + dy));
    if (k?.blocks && !k.walkable && ['crag', 'sandstone', 'slagcrag', 'cliff_face'].includes(k.id)) return true;
  }
  return false;
}
/** Reachability is over native collision, including rectangular slabs/trunks.
 * Parents still verify the external approach against surrounding geography. */
function reachableCells(grid: GridWalkField, doodads: Doodad[], approach: Vec2): { reached: Set<number>; parent: Map<number, number> } {
  const index = (p: Vec2) => Math.floor(p.y / grid.cell) * grid.cols + Math.floor(p.x / grid.cell);
  const start = index(approach), reached = new Set<number>(), parent = new Map<number,number>(), queue: number[] = [];
  if (bodyClear(grid, doodads, approach)) { queue.push(start); reached.add(start); }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % grid.cols, y = Math.floor(i / grid.cols);
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
      const n = ny * grid.cols + nx;
      if (reached.has(n)) continue;
      const a = { x:(x+.5)*grid.cell, y:(y+.5)*grid.cell }, b = { x:(nx+.5)*grid.cell, y:(ny+.5)*grid.cell };
      if (![.25,.5,.75,1].every(t => bodyClear(grid,doodads,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))) continue;
      reached.add(n); parent.set(n,i); queue.push(n);
    }
  }
  return { reached, parent };
}
export const NATIVE_ENVIRONMENT_MECHANICS=['fog','creep','lite','collapse','flux','pitfall','spans','tracks','geysers','regrowth','heat','swelter','windchill','gaze'] as const;
export function nativeLayoutRequirements(layout: GeneratedLayout, zone: ZoneDef, entrances: NativeFeatureEntrance[], ownsEnvironment:boolean, sidechannels?:Readonly<NativeGenerationSidechannels>, effectSources?:Readonly<NativeEffectSources>): string[] {
  const result = new Set<string>(['terrain','scenery','state']);
  const collections: [keyof GeneratedLayout,string][] = [
    ['breakables','breakables'],['npcs','npcs'],['folk','folk'],['garrisons','garrisons'],
    ['structures','structures'],['landmarkSpawns','landmark-spawns'],['hollows','hollows'],
    ['annexes','annexes'],['tracks','tracks'],['trapworks','trapworks'],
    ['authoredVents','geysers'],['airPockets','air-pockets'],['pockets','traversal-pockets'],
  ];
  for (const [key,cap] of collections) if ((layout[key] as unknown[] | undefined)?.length) result.add(cap);
  if (entrances.length) result.add('sidezones');
  if (layout.camps.length) result.add('camps');
  for(const s of layout.structures??[])for(const slot of s.slots)result.add('slot:'+slot.kind);
  if (zone.tiers || layout.doodads.some(d => (d.tier ?? 0) > 0)) result.add('tiers');
  if (layout.structures?.some(s => s.storeys?.length)) result.add('storeys');
  if (zone.puzzles?.length) result.add('puzzles');
  if (zone.scenery?.length) result.add('scenery-actors');
  for(const key of NATIVE_ENVIRONMENT_MECHANICS){
    const value=zone.theme[key];
    if(ownsEnvironment&&value!==undefined&&(!Array.isArray(value)||value.length))result.add('context:'+key);
  }
  // A primitive cannot borrow an eye's artwork while dropping its native gaze.
  // The source theme remains provenance; this mechanic needs a local owner.
  if(zone.theme.gaze&&layout.doodads.some(d=>zone.theme.gaze!.kinds.includes(d.kind)))result.add('context:gaze');
  for (const d of layout.doodads) {
    const rule = doodadRuleOf(d.kind);
    if (d.door) { result.add('doors'); result.add('door:'+d.door.mode); if(d.door.lesson)result.add('door-lessons'); }
    if (d.effect && !effectSources) result.add('doodad-effects');
    if (d.anchor) result.add('station-anchors');
    if (d.well) result.add('wells');
    if (rule.contact) result.add('doodad-contact');
    if (rule.fall || d.fall || d.kind==='chasm') result.add('pitfalls');
    if (rule.spans) result.add('spans');
    // Kind-specific mechanisms must explicitly bind their native consumer.
    // This prevents a registered painted prop from being mistaken for parity.
    result.add('doodad:' + d.kind);
  }
  if(sidechannels)for(const requirement of nativeGenerationRequirements(sidechannels))result.add(requirement);
  if(effectSources)for(const requirement of nativeEffectRequirements(effectSources))result.add(requirement);
  return [...result].sort();
}
export function resolveNativeFeature(request: NativeFeatureRequest): Readonly<NativeFeatureDescriptor> {
  const { zone, authored } = sourceZone(request);
  const authoredZone=copy(zone);
  const approach = { x: Math.floor(zone.size.w / 60) * 30 + 15, y: 105 };
  const {value:layout,sidechannels}=captureNativeGeneration(zone,()=>generateLayout(zone, zone.size, new Rng(request.seed), approach, []));
  if (layout.doodads.length > NATIVE_FEATURE_LIMITS.maxDoodads) throw Error('Native feature scenery budget exceeded');
  if (layout.walk && !(layout.walk instanceof GridWalkField)) throw Error('Native feature needs a serializable native region grid');
  const grid = layout.walk instanceof GridWalkField ? layout.walk : new GridWalkField(zone.size.w, zone.size.h);
  if (!layout.walk) grid.fillRect(0,0,zone.size.w,zone.size.h,true);
  layout.walk = grid;
  const unsupported: string[] = [];
  if(request.source.scope==='landform'&&!Array.from(grid.kind).some((_,i)=>!regionKind(grid.regionAt((i%grid.cols+.5)*grid.cell,(Math.floor(i/grid.cols)+.5)*grid.cell))?.walkable))
    unsupported.push('native-landform-produced-no-body');
  if (grid.cols * grid.rows > NATIVE_FEATURE_LIMITS.maxCells) throw Error('Expanded native grid exceeds feature budget');
  if (request.source.kind === 'massif' && request.source.scope!=='landform' && (TILESETS[request.source.tileset].blend || TILESETS[request.source.tileset].annexes))
    unsupported.push('native-source-requires-blend-or-annex-mint');
  let flood = reachableCells(grid,layout.doodads,approach);
  if (!flood.reached.size) unsupported.push('blocked-external-approach');
  if (request.rockEntrance) {
    const mouths = layout.doodads.filter(d => d.kind === 'cave_entrance');
    const seated: Vec2[] = [];
    if (!mouths.length) unsupported.push('native-cave-stamp-did-not-land');
    for (const mouth of mouths) {
      const candidates = [...flood.reached].map(i => ({x:(i%grid.cols+.5)*grid.cell,y:(Math.floor(i/grid.cols)+.5)*grid.cell}))
        .filter(p => p.x > 120 && p.y > 120 && p.x < zone.size.w-120 && p.y < zone.size.h-120 && backedByRock(grid,p) && seated.every(q => Math.hypot(p.x-q.x,p.y-q.y) >= 120));
      candidates.sort((a,b) => Math.hypot(a.x-mouth.pos.x,a.y-mouth.pos.y)-Math.hypot(b.x-mouth.pos.x,b.y-mouth.pos.y));
      if (!candidates.length) unsupported.push('no-reachable-rock-backed-mouth');
      else { mouth.pos = candidates[0]; seated.push(mouth.pos); }
    }
  }
  const entrances: NativeFeatureEntrance[] = [];
  let caveOrdinal = 0;
  for (const [i,d] of layout.doodads.entries()) {
    const sidezone = sidezoneOf(d.kind);
    if (!sidezone) continue;
    const seed = d.kind === 'cave_entrance' ? layout.caveSeeds[caveOrdinal++]
      : massHash(canonical([request.id,d.kind,i,d.pos.x,d.pos.y]),request.seed);
    if (!Number.isSafeInteger(seed)) throw Error('Native cave seed zip was lost');
    const key = Math.floor(d.pos.y/grid.cell)*grid.cols+Math.floor(d.pos.x/grid.cell);
    if ((d.tier ?? 0) === 0 && !sidezone.indoorsOnly && !flood.reached.has(key)) unsupported.push('unreachable-entrance:' + i);
    if (sidezone.spanMouth) unsupported.push('shared-under-span-needs-physical-owner:' + i);
    entrances.push({ id: request.id+'/entrance/'+i,doodadIndex:i,kind:d.kind,seed,pos:{...d.pos},
      tier:d.tier??0,rockBacked:backedByRock(grid,d.pos) });
  }
  if (caveOrdinal !== layout.caveSeeds.length) throw Error('Native cave seed zip has surplus seeds');
  if (entrances.length > NATIVE_FEATURE_LIMITS.maxEntrances) throw Error('Native feature entrance budget exceeded');
  const support = new Uint8Array(grid.cols*grid.rows);
  const mark = (x:number,y:number) => {
    if(x>=0&&y>=0&&x<grid.cols&&y<grid.rows)support[y*grid.cols+x]=1;
  };
  const disc = (p:Vec2,r:number) => {
    for(let y=Math.floor((p.y-r)/grid.cell);y<=Math.floor((p.y+r)/grid.cell);y++)
      for(let x=Math.floor((p.x-r)/grid.cell);x<=Math.floor((p.x+r)/grid.cell);x++)
        if(Math.hypot((x+.5)*grid.cell-p.x,(y+.5)*grid.cell-p.y)<=r)mark(x,y);
  };
  for(let y=0;y<grid.rows;y++)for(let x=0;x<grid.cols;x++){
    if(grid.regionAt((x+.5)*grid.cell,(y+.5)*grid.cell)==='ground')continue;
    mark(x,y);
    if(x<2||y<2||x>=grid.cols-2||y>=grid.rows-2)unsupported.push('native-terrain-reaches-compiler-boundary');
  }
  for(const s of layout.structures??[])for(let y=Math.floor((s.rect.y-60)/grid.cell);y<Math.ceil((s.rect.y+s.rect.h+60)/grid.cell);y++)
    for(let x=Math.floor((s.rect.x-60)/grid.cell);x<Math.ceil((s.rect.x+s.rect.w+60)/grid.cell);x++)mark(x,y);
  for(const d of layout.doodads){
    const bound=Math.max(d.radius,shapeBoundR(hitSurfaceOf(d,'move')),shapeBoundR(hitSurfaceOf(d,'sight')));
    disc(d.pos,bound+60);
    if(d.pos.x-bound<0||d.pos.y-bound<0||d.pos.x+bound>zone.size.w||d.pos.y+bound>zone.size.h)
      unsupported.push('native-scenery-exceeds-compiler-boundary');
  }
  for(const p of [...layout.pois,...layout.camps,...layout.garrisons.map(g=>g.pos)])disc(p,120);
  // Preserve actual native floor along the collision-verified ingress path.
  // Remaining ground cells are transparent to the continental terrain.
  const ingressTargets = [...entrances.filter(e=>e.tier===0).map(e=>e.pos), ...layout.pois, ...layout.camps,
    ...(layout.structures??[]).flatMap(s=>s.doors.map(d=>({x:d.pos.x+d.normal.x*(s.cellSize+30),y:d.pos.y+d.normal.y*(s.cellSize+30)})))];
  disc(approach,60);
  for(const target of ingressTargets){
    let i=Math.floor(target.y/grid.cell)*grid.cols+Math.floor(target.x/grid.cell);
    if(!flood.reached.has(i))continue;
    for(let n=0;n<support.length;n++){
      disc({x:(i%grid.cols+.5)*grid.cell,y:(Math.floor(i/grid.cols)+.5)*grid.cell},60);
      const next=flood.parent.get(i); if(next===undefined)break; i=next;
    }
  }
  const {walk: _walk,...data}=layout;
  const effectSources=captureNativeEffectSources(layout.doodads);
  const ownsEnvironment=request.source.kind==='massif'&&request.source.scope!=='landform';
  const environment:NativeFeatureDescriptor['environment']={owner:ownsEnvironment?'source':'containing-region',
    sourceMechanics:NATIVE_ENVIRONMENT_MECHANICS.filter(k=>zone.theme[k]!==undefined&&(!Array.isArray(zone.theme[k])||(zone.theme[k] as unknown[]).length>0))};
  const body = {
    schema:1 as const,compiler:'native-feature-v1' as const,id:request.id,seed:request.seed,source:{...copy(request.source), ...(zone.variantName ? {variant:zone.variantName} : {})},
    authored,environment,sourceZone:authoredZone,zone:copy(zone),geometry:{grid:grid.pack(),layout:copy(data),support:Array.from(support)},
    sidechannels,effectSources,entrances,approach,requirements:nativeLayoutRequirements(layout,zone,entrances,ownsEnvironment,sidechannels,effectSources),unsupported:[...new Set(unsupported)].sort(),
  };
  return freezeData({...body,hash:massDigest(body)});
}
export function compileNativeFeature(raw: Readonly<NativeFeatureDescriptor>): NativeFeatureBlueprint {
  const descriptor=copy(raw),{hash,...body}=descriptor;
  if(descriptor.schema!==1||descriptor.compiler!=='native-feature-v1'||hash!==massDigest(body)
    ||!descriptor.environment||!['source','containing-region'].includes(descriptor.environment.owner)||!Array.isArray(descriptor.environment.sourceMechanics))
    throw Error('Native feature checkpoint identity mismatch');
  if(descriptor.sidechannels){
    const channels=descriptor.sidechannels;
    if(!Array.isArray(channels.occurrences)||!Array.isArray(channels.puzzles)||channels.occurrences.length>1024||channels.puzzles.length>1024
      ||channels.occurrences.some(r=>!r.site?.id||r.definition?.id!==r.site.id||![r.site.x,r.site.y,r.site.floorR].every(Number.isFinite)||r.site.floorR<=0)
      ||channels.puzzles.some(r=>!r.id||!r.spec))throw Error('Invalid native sidechannel checkpoint');
    if(nativeGenerationRequirements(channels).some(r=>!descriptor.requirements.includes(r)))throw Error('Native checkpoint lost sidechannel ownership');
  }
  if(descriptor.effectSources){
    validateNativeEffectSources(descriptor.effectSources,descriptor.geometry.layout.doodads);
    if(nativeEffectRequirements(descriptor.effectSources).some(r=>!descriptor.requirements.includes(r)))
      throw Error('Native checkpoint lost effect ownership');
  }
  const packed=descriptor.geometry.grid;
  if(!packed||![packed.cols,packed.rows,packed.cell].every(n=>Number.isInteger(n)&&n>0)||packed.cell!==30
    ||packed.cols*packed.rows>NATIVE_FEATURE_LIMITS.maxCells||atob(packed.kbits).length!==packed.cols*packed.rows
    ||packed.kinds.some(k=>!regionKind(k))
    ||descriptor.geometry.support.length!==packed.cols*packed.rows
    ||descriptor.geometry.support.some(n=>n!==0&&n!==1)||descriptor.geometry.layout.doodads.length>NATIVE_FEATURE_LIMITS.maxDoodads)
    throw Error('Invalid native feature checkpoint bounds');
  const grid=GridWalkField.unpack(packed),supportMask=Uint8Array.from(descriptor.geometry.support);
  const layout:GeneratedLayout={...copy(descriptor.geometry.layout),walk:grid};
  const frozen=freezeData(descriptor);
  return {descriptor:frozen,layout,grid,supportMask,entrances:copy(descriptor.entrances),approach:{...descriptor.approach},
    requirements:frozen.requirements,unsupported:frozen.unsupported,
    regionAt(x,y){
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=grid.cols*grid.cell||y>=grid.rows*grid.cell)return undefined;
      const i=Math.floor(y/grid.cell)*grid.cols+Math.floor(x/grid.cell);
      return supportMask[i]?grid.regionAt(x,y):undefined;
    }};
}
export function nativeFeatureAdmission(feature: NativeFeatureBlueprint, capabilities: ReadonlySet<string>): {ok:boolean;missing:string[];unsupported:readonly string[]} {
  const missing=feature.requirements.filter(c=>!capabilities.has(c));
  let unsupported=!feature.descriptor.effectSources&&feature.layout.doodads.some(d=>d.effect||doodadRuleOf(d.kind).effect)
    ?[...feature.unsupported,'native-effect-source-contract']:feature.unsupported;
  if(feature.descriptor.effectSources?.rows.some(row=>row.effect.id==='status_wash'&&row.effect.statusId==='cloudhaven'&&!nativeHavenEffectSupported(row)))
    unsupported=[...unsupported,'native-effect-source-incompatible'];
  return {ok:missing.length===0&&unsupported.length===0,missing,unsupported};
}












/** A birth-time dry route from native ingress to the surrounding continuous
 * country. This proof reserves access; it never paints or changes any terrain. */
export interface NativeFeatureIngressProof { version:1; halo:number; reservePadding?:number; route:number[]; hash:string }
export interface NativeFeatureIngressOptions {
  halo?:number; maxCells?:number; cellSize?:number;
  /** Provider reserved circumscribed geometry disc plus this padding. The
   * complete42px protected route corridor must fit inside that same disc. */
  reservePadding?:number;
}
export const NATIVE_INGRESS_DEFAULTS=Object.freeze({halo:240,maxCells:12000,cellSize:30,reserveRadius:42});
const DRY_INGRESS_EXCLUSIONS=new Set(['water','lava','chasm','bog','swamp']);
function ingressDimensions(feature:NativeFeatureBlueprint,halo:number){
  const grid=feature.grid!;
  if(!Number.isInteger(halo)||halo<60||halo>480||halo%grid.cell)throw Error('Invalid native ingress halo');
  const pad=halo/grid.cell,cols=grid.cols+2*pad,rows=grid.rows+2*pad;
  return{grid,pad,cols,rows};
}
export function nativeIngressPoints(feature:NativeFeatureBlueprint,proof:NativeFeatureIngressProof):Vec2[]{
  const {cols,grid}=ingressDimensions(feature,proof.halo);
  return proof.route.map(i=>({x:(i%cols+.5)*grid.cell-proof.halo,y:(Math.floor(i/cols)+.5)*grid.cell-proof.halo}));
}
export function validateNativeIngress(feature:NativeFeatureBlueprint,proof:NativeFeatureIngressProof):void{
  const {grid,pad,cols,rows}=ingressDimensions(feature,proof.halo),route=proof.route;
  if(proof.version!==1||!Array.isArray(route)||!route.length||route.length>cols*rows||cols*rows>65536
    ||route.some(i=>!Number.isInteger(i)||i<0||i>=cols*rows)||new Set(route).size!==route.length
    ||proof.reservePadding!==undefined&&(!Number.isFinite(proof.reservePadding)||proof.reservePadding<0)
    ||proof.hash!==massDigest({descriptor:feature.descriptor.hash,version:proof.version,halo:proof.halo,
      ...(proof.reservePadding!==undefined?{reservePadding:proof.reservePadding}:{}),route}))throw Error('Invalid native ingress checkpoint');
  const first=(Math.floor(feature.approach.y/grid.cell)+pad)*cols+Math.floor(feature.approach.x/grid.cell)+pad,last=route.at(-1)!;
  if(proof.reservePadding!==undefined){
    const cx=grid.cols*grid.cell/2,cy=grid.rows*grid.cell/2,limit=Math.hypot(cx,cy)+proof.reservePadding-NATIVE_INGRESS_DEFAULTS.reserveRadius;
    if(nativeIngressPoints(feature,proof).some(p=>Math.hypot(p.x-cx,p.y-cy)>limit))throw Error('Native ingress checkpoint exceeds provider reservation');
  }
  if(route[0]!==first||!(last%cols===0||last%cols===cols-1||Math.floor(last/cols)===0||Math.floor(last/cols)===rows-1)
    ||route.some((n,i)=>i>0&&Math.abs(n%cols-route[i-1]%cols)+Math.abs(Math.floor(n/cols)-Math.floor(route[i-1]/cols))!==1))throw Error('Disconnected native ingress checkpoint');
}
/** Callback is unoverlaid physical terrain, not stream.sample (which would
 * recursively admit this feature). Base cells must be on the same origin. */
export function verifyNativeIngress(feature:NativeFeatureBlueprint,baseRegionAt:(p:Vec2)=>string,
  options:NativeFeatureIngressOptions={}):{ok:true;proof:NativeFeatureIngressProof}|{ok:false;reason:string}{
  const halo=options.halo??NATIVE_INGRESS_DEFAULTS.halo,maxCells=options.maxCells??NATIVE_INGRESS_DEFAULTS.maxCells;
  const {grid,pad,cols,rows}=ingressDimensions(feature,halo),baseCell=options.cellSize??grid.cell;
  if(!Number.isSafeInteger(maxCells)||maxCells<1024||maxCells>65536||!Number.isInteger(baseCell)||baseCell<1||grid.cell%baseCell
    ||options.reservePadding!==undefined&&(!Number.isFinite(options.reservePadding)||options.reservePadding<0))throw Error('Invalid native ingress budget/lattice');
  if(cols*rows>maxCells)return{ok:false,reason:'native-ingress-exceeds-cell-budget'};
  const base=new Map<string,string>(),radius=NATIVE_FEATURE_LIMITS.bodyRadius;
  const regionAt=(p:Vec2):string=>{
    const native=feature.regionAt(p.x,p.y);if(native!==undefined)return native;
    const x=Math.floor(p.x/baseCell),y=Math.floor(p.y/baseCell),key=x+','+y,hit=base.get(key);if(hit!==undefined)return hit;
    const kind=baseRegionAt({x:(x+.5)*baseCell,y:(y+.5)*baseCell});base.set(key,kind);return kind;
  };
  // Native move shapes share a local broad phase, so validating access never
  // turns a 9,000-piece native source into a cells-times-all-pieces scan.
  const grain=120,bins=new Map<string,Doodad[]>();let references=0;
  for(const d of feature.layout.doodads){
    if(d.gone||(d.tier??0)!==0||!blocksMovement(d))continue;
    const bound=shapeBoundR(hitSurfaceOf(d,'move'))+radius;
    for(let y=Math.floor((d.pos.y-bound)/grain);y<=Math.floor((d.pos.y+bound)/grain);y++)for(let x=Math.floor((d.pos.x-bound)/grain);x<=Math.floor((d.pos.x+bound)/grain);x++){
      if(++references>100000)return{ok:false,reason:'native-ingress-exceeds-shape-budget'};
      const key=x+','+y,list=bins.get(key);if(list)list.push(d);else bins.set(key,[d]);
    }
  }
  const center={x:grid.cols*grid.cell/2,y:grid.rows*grid.cell/2};
  const reservedLimit=options.reservePadding===undefined?Infinity:Math.hypot(center.x,center.y)+options.reservePadding-NATIVE_INGRESS_DEFAULTS.reserveRadius;
  const clear=(p:Vec2):boolean=>{
    if(Math.hypot(p.x-center.x,p.y-center.y)>reservedLimit)return false;
    if(!discTerrainClear(p,radius,baseCell,q=>{
      const id=regionAt(q),kind=regionKind(id);
      return !!kind?.walkable&&!kind.standStatusDeep&&!DRY_INGRESS_EXCLUSIONS.has(id);
    }))return false;
    return !(bins.get(Math.floor(p.x/grain)+','+Math.floor(p.y/grain))??[])
      .some(d=>shapeContains(hitSurfaceOf(d,'move'),d.pos.x,d.pos.y,p.x,p.y,radius));
  };
  const point=(i:number):Vec2=>({x:(i%cols+.5)*grid.cell-halo,y:(Math.floor(i/cols)+.5)*grid.cell-halo});
  const start=(Math.floor(feature.approach.y/grid.cell)+pad)*cols+Math.floor(feature.approach.x/grid.cell)+pad;
  if(!clear(point(start)))return{ok:false,reason:'native-ingress-approach-is-not-dry'};
  const parent=new Int32Array(cols*rows);parent.fill(-2);parent[start]=-1;
  const queue=[start];let goal=-1;
  for(let head=0;head<queue.length;head++){
    const i=queue[head],x=i%cols,y=Math.floor(i/cols),a=point(i);
    if(x===0||y===0||x===cols-1||y===rows-1){goal=i;break;}
    for(const[dx,dy]of [[0,-1],[-1,0],[1,0],[0,1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;
      const n=ny*cols+nx;if(parent[n]!==-2)continue;const b=point(n);
      if(![.25,.5,.75,1].every(t=>clear({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})))continue;
      parent[n]=i;queue.push(n);
    }
  }
  if(goal<0)return{ok:false,reason:'native-ingress-isolated-from-dry-country'};
  const route:number[]=[];for(let n=goal;n!==-1;n=parent[n])route.push(n);route.reverse();
  const reservation=options.reservePadding!==undefined?{reservePadding:options.reservePadding}:{};
  const proof:NativeFeatureIngressProof={version:1,halo,...reservation,route,hash:massDigest({descriptor:feature.descriptor.hash,version:1,halo,...reservation,route})};
  return{ok:true,proof:freezeData(proof)};
}
