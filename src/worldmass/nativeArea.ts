import type { Vec2 } from '../core/math';
import { insideBounds } from '../world/shape';
import { restoreNativeGeographySource } from '../world/geographySource';
import { massDigest } from './random';
import type { ZoneDef, ZoneExitDef } from '../data/zones';
import type { DoodadRule, GeneratedLayout } from '../engine/levelgen';
import type { SidezoneDef } from '../data/sidezones';
import type { NativeGenerationSidechannels } from './nativeGeneration';
import type { NativeEffectSources } from './nativeEffectSources';
import type { NativeBrittleSources } from './nativeBrittleSources';
import type { NativeAreaSeamPort } from './nativeAreaSeams';
import { MassNativeGeography, type MassNativeGeographySpec, type MassNativeResolvedOwnerContext } from './nativeGeography';
import { copyNativeAreaData, serializeNativeAreaData, restoreNativeAreaData, createNativeAreaGeometry,
  type NativeAreaGeometrySource, type NativeAreaLayoutData } from './nativeAreaGeometry';

/** Caller attestation, NOT a complete captured compiler dependency closure.
 * No production issuer exists yet. Even a valid descriptor cannot publish. */
export interface NativeAreaCompilerCertificate {
  schema: 1; policy: 'caller-attested-same-build-and-source-v1';
  buildIdentity: string; installedSourceIdentity: string;
}
export interface NativeAreaExitInput {
  definition: ZoneExitDef;
  /** Exact native finite-generation point. Never inferred from the mouth. */
  generationPoint: Vec2;
  /** Physical crossing point; a seam binds this to its unchanged true edge. */
  physicalPoint: Vec2;
}
export interface NativeAreaBoundaryInput {
  schema: 1; policy: 'explicit-native-boundary-context-v1'; sourceIdentity: string;
  /** Every field is present, including explicit undefined. Arrays, when
   * present, preserve complete exit-index order and native absence rows. */
  exitBoundaries: ZoneDef['exitBoundaries'];
  exitRoads: ZoneDef['exitRoads'];
  exitMelds: ZoneDef['exitMelds'];
}
export interface NativeAreaSeamInput { exitIndex: number; port: NativeAreaSeamPort }
export interface NativeAreaEntrance {
  id: string; doodadIndex: number; kind: string; sourcePosition: Vec2; tier: number;
  /** Native caveSeeds zip or the native position hash, before span binding. */
  seed: number; seedKind: 'cave-ordinal' | 'native-position';
  definition: Omit<SidezoneDef,'mint'>;
  /** Native collision-adjusted dwell seat, roof and shared-span association
   * are live host operations. The source mouth is not moved here. */
  finalization: 'requires-native-mouth-owner';
}
export interface NativeAreaDescriptor {
  schema: 1; compiler: 'native-area-v1'; publication: 'runtime-unbound';
  id: string; certificate: NativeAreaCompilerCertificate;
  geography: MassNativeGeographySpec; context: MassNativeResolvedOwnerContext;
  sourceZone: ZoneDef; zone: ZoneDef;
  entry: Vec2; exits: NativeAreaExitInput[]; seams: NativeAreaSeamInput[]; boundary: NativeAreaBoundaryInput;
  extraFixtures: { structure: string; x: number; y: number }[];
  geometry: NativeAreaGeometrySource;
  sidechannels: Readonly<NativeGenerationSidechannels>;
  effectSources: Readonly<NativeEffectSources>; brittleSources: Readonly<NativeBrittleSources>;
  doodadRules: [string,DoodadRule][];
  sidezoneDefinitions: [string,Omit<SidezoneDef,'mint'>][];
  entrances: NativeAreaEntrance[];
  requirements: string[];
  /** Continue owns the complete generated output; these next draws prove the
   * native geometry stream endpoint without assuming downstream body ownership. */
  generationNext: number[];
}
const same=(a:unknown,b:unknown)=>serializeNativeAreaData(a)===serializeNativeAreaData(b);
const owns=(v:unknown,...keys:string[])=>v!==null&&typeof v==='object'&&keys.every(k=>Object.hasOwn(v,k));
const point=(p:Vec2)=>owns(p,'x','y')&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{16}$/.test(v);
const uint32=(v:number)=>Number.isInteger(v)&&v>=0&&v<=0xffffffff;
const rect=(r:{x:number;y:number;w:number;h:number})=>point(r)&&owns(r,'w','h')&&Number.isFinite(r.w)&&Number.isFinite(r.h)&&r.w>0&&r.h>0;
/** Structural checks protect saved mechanisms. They do not authenticate a
 * generator's output or replace the mandatory compiler/source issuer. */
/** Read-only semantic view: inherited defaults cannot alter a saved census.
 * The original ordinary records, own-key order and codec bytes stay untouched. */
function nativeAreaReadView<T>(value:T):T {
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value))return value.map(v=>nativeAreaReadView(v)) as T;
  const out:Record<string,unknown>=Object.create(null);
  for(const key of Object.keys(value))out[key]=nativeAreaReadView((value as Record<string,unknown>)[key]);
  return out as T;
}
function validateLayoutRows(l:NativeAreaLayoutData):void {
  l=nativeAreaReadView(l);
  for(const key of ['doodads','pois','camps','breakables','npcs','garrisons','caveSeeds'] as const)if(!Object.hasOwn(l,key)||!Array.isArray(l[key]))throw Error('Native area lost mandatory layout collection: '+key);
  if(l.pois.some(p=>!point(p))||l.camps.some(p=>!point(p))||l.caveSeeds.some(s=>!uint32(s)))throw Error('Invalid native layout point or cave seed');
  for(const rows of [l.breakables,l.npcs,l.landmarkSpawns??[]])for(const r of rows)if(!owns(r,'id','pos')||!text(r.id)||!point(r.pos))throw Error('Invalid native entity seat');
  for(const r of l.npcs)if(r.tier!==undefined&&(!Number.isSafeInteger(r.tier)||r.tier<0))throw Error('Invalid native NPC tier');
  for(const r of l.garrisons)if(!owns(r,'pos','faction','size')||!point(r.pos)||!text(r.faction)||!Array.isArray(r.size)||r.size.length!==2||r.size.some(n=>!Number.isSafeInteger(n)||n<0)||r.size[1]<r.size[0])throw Error('Invalid native garrison seat');
  for(const r of l.folk??[])if(!owns(r,'pool','key','pos')||!text(r.pool)||!text(r.key)||!point(r.pos)||r.chance!==undefined&&(!Number.isFinite(r.chance)||r.chance<0||r.chance>1))throw Error('Invalid native folk seat');
  for(const rows of [l.airPockets??[],l.pockets??[]])for(const r of rows)if(!owns(r,'r')||!point(r)||!Number.isFinite(r.r)||r.r<=0)throw Error('Invalid native pocket');
  for(const p of [l.spawnAt,l.bossSeat])if(p!==undefined&&!point(p))throw Error('Invalid native arrival seat');
  for(const r of l.hollows??[])if(!owns(r,'id','kind','rect','seams','seed')||!text(r.id)||!text(r.kind)||!rect(r.rect)||!Array.isArray(r.seams)||!r.seams.length||r.seams.some(p=>!point(p))||!uint32(r.seed))throw Error('Invalid native hollow');
  for(const r of l.annexes??[])if(!owns(r,'piece','kind','face','rect')||!text(r.piece)||!text(r.kind)||!point(r.face)||!rect(r.rect)||(r.carve??[]).some(v=>!rect(v)))throw Error('Invalid native annex');
  for(const r of l.structures??[])if(!owns(r,'id','defId','rect','cellSize','roofs','floors','courtyards','doors','slots')||!text(r.id)||!text(r.defId)||!rect(r.rect)||!Number.isFinite(r.cellSize)||r.cellSize<=0||!Array.isArray(r.roofs)||!Array.isArray(r.floors)||!Array.isArray(r.courtyards)||[...r.roofs,...r.floors,...r.courtyards].some(v=>!rect(v))||!Array.isArray(r.doors)||!Array.isArray(r.slots))throw Error('Invalid native structure');
  for(const r of l.tracks??[])if(!owns(r,'path','speed','riders')||!Array.isArray(r.path)||r.path.length<2||r.path.some(p=>!point(p))||!Number.isFinite(r.speed)||r.speed<=0||!Array.isArray(r.riders)||r.riders.some(v=>!text(v.kind)))throw Error('Invalid native track');
  for(const r of l.trapworks??[])if(!r.trigger||!text(r.trigger.kind)||!Array.isArray(r.effects))throw Error('Invalid native trapwork');
  for(const r of l.authoredVents??[])if(!owns(r,'pos','cls')||!point(r.pos)||!text(r.cls))throw Error('Invalid native vent');
}
function validateChannels(c:Readonly<NativeGenerationSidechannels>):void {
  c=nativeAreaReadView(c);
  if(!c||!Array.isArray(c.occurrences)||!Array.isArray(c.puzzles))throw Error('Invalid native generation side channels');
  for(const r of c.occurrences)if(!r.site||!r.definition||!text(r.site.id)||r.site.id!==r.definition.id||!point(r.site)||!Number.isFinite(r.site.floorR)||r.site.floorR<0||!text(r.definition.trigger?.kind)||!r.definition.spring)throw Error('Invalid native occurrence side channel');
  const ids=new Set<string>();for(const r of c.puzzles){if(!text(r.id)||ids.has(r.id)||!text(r.spec?.kind)||'mintCtx' in r.spec)throw Error('Invalid native puzzle side channel');ids.add(r.id);}
}

export function validateNativeAreaCertificate(c:NativeAreaCompilerCertificate):void {
  c=copyNativeAreaData(c);
  if(!c||c.schema!==1||c.policy!=='caller-attested-same-build-and-source-v1'
    ||typeof c.buildIdentity!=='string'||!c.buildIdentity||c.buildIdentity.length>4096
    ||typeof c.installedSourceIdentity!=='string'||!c.installedSourceIdentity||c.installedSourceIdentity.length>4096
    ||Object.keys(c).length!==4)throw Error('Explicit native compiler/source attestation required');
}
/** Pure requirement census over frozen source facts; restore reads no registries. */
export function nativeAreaRequirements(zone:ZoneDef,layout:NativeAreaLayoutData,rules:readonly [string,DoodadRule][],
  entrances:readonly NativeAreaEntrance[],channels:Readonly<NativeGenerationSidechannels>,effects:Readonly<NativeEffectSources>,brittles:Readonly<NativeBrittleSources>):string[] {
  ({zone,layout,rules,entrances,channels,effects,brittles}=nativeAreaReadView(copyNativeAreaData({zone,layout,rules,entrances,channels,effects,brittles})));
  const result=new Set<string>(['terrain','scenery','state','native-area-runtime','native-area-source-issuer',
    'native-area-zone-context','native-area-load-finalizers','native-area-boundary-owner','native-area-population-lifecycle',
    'native-area-reward-context','native-area-persistence','native-area-local-presentation','objective:'+zone.objective.kind]);
  const collections:[keyof NativeAreaLayoutData,string][]=[['pois','pois'],['camps','camps'],['breakables','breakables'],['npcs','npcs'],['folk','folk'],['garrisons','garrisons'],['structures','structures'],['landmarkSpawns','landmark-spawns'],['hollows','hollows'],['annexes','annexes'],['tracks','tracks'],['trapworks','trapworks'],['authoredVents','geysers'],['airPockets','air-pockets'],['pockets','traversal-pockets']];
  for(const [key,cap]of collections)if((layout[key] as unknown[]|undefined)?.length)result.add(cap);
  if(layout.spawnAt)result.add('native-area-spawn-seat');if(layout.bossSeat)result.add('native-area-boss-seat');
  if(layout.localeReport)result.add('native-area-locale');
  if(zone.packs)result.add('native-area-ambient-packs');if(zone.fauna?.length)result.add('native-area-fauna');
  if(zone.scenery?.length)result.add('scenery-actors');if(zone.factionWar)result.add('native-area-faction-war');
  if(zone.waypoint)result.add('native-area-waypoint');if(zone.port)result.add('native-area-port');
  if(zone.aquatic)result.add('native-area-aquatic');if(zone.journey)result.add('native-area-journey');
  if(zone.destination)result.add('native-area-atlas-destination');if(zone.underways?.length)result.add('native-area-shared-underways');
  if(zone.annexes?.length)result.add('annexes');if(zone.tiers||layout.doodads.some(d=>(d.tier??0)>0))result.add('tiers');
  if(zone.puzzles?.length)result.add('puzzles');
  // The complete theme remains saved. This names present native environmental
  // consumers; the mandatory zone-context owner covers every other theme field.
  for(const key of ['fog','creep','lite','collapse','flux','pitfall','spans','tracks','geysers','regrowth','heat','swelter','windchill','gaze'] as const){const value=zone.theme[key];if(value!==undefined&&(!Array.isArray(value)||value.length))result.add('context:'+key);}
  const byKind=new Map(rules);if(byKind.size!==rules.length)throw Error('Duplicate native doodad source');
  for(const s of layout.structures??[]){if(s.storeys?.length)result.add('storeys');for(const slot of s.slots)result.add('slot:'+slot.kind);}
  for(const d of layout.doodads){const rule=byKind.get(d.kind);if(!rule)throw Error('Missing native doodad source');
    result.add('doodad:'+d.kind);if(d.door){result.add('doors');result.add('door:'+d.door.mode);if(d.door.lesson)result.add('door-lessons');}
    if(d.anchor)result.add('station-anchors');if(d.well)result.add('wells');if(rule.contact)result.add('doodad-contact');
    if(rule.fall||d.fall||d.kind==='chasm')result.add('pitfalls');if(rule.spans)result.add('spans');if(rule.brittle)result.add('native-brittle:'+d.kind);
    if(rule.veil)result.add('native-area-veil');if(rule.warms)result.add('native-area-warmth');if(rule.shelter)result.add('native-area-shelter');
  }
  for(const e of entrances){result.add('sidezones');result.add('native-area-mouth-finalization');result.add('sidezone:'+e.kind);if(e.definition.indoorsOnly)result.add('native-area-mouth-roof');if(e.definition.spanMouth)result.add('native-area-shared-underways');if(e.definition.traversal)result.add('traversal:'+e.definition.traversal);if(e.definition.when)result.add('native-area-mouth-condition');if(e.definition.sealedBy)result.add('native-area-mouth-seal');}
  for(const row of channels.occurrences){result.add('occurrences');result.add('occurrence:'+row.site.id);result.add('occurrence-trigger:'+row.definition.trigger.kind);if(row.definition.aftermath)result.add('occurrence-aftermath:'+row.definition.aftermath.kind);}
  for(const row of channels.puzzles){result.add('puzzles');result.add('puzzle:'+row.spec.kind);const shrine=(row.spec as unknown as {shrine?:{kind:string}}).shrine;if(shrine)result.add('puzzle:'+shrine.kind);}
  for(const row of effects.rows){result.add('native-effects');result.add('native-effect:'+row.effect.id+':'+(row.effect.statusId??'-'));}
  if(brittles.rows.length){result.add('native-brittles');result.add('native-brittle:burial_urn');}
  return [...result].sort();
}
export function validateNativeAreaInputs(d:Pick<NativeAreaDescriptor,'id'|'geography'|'context'|'sourceZone'|'entry'|'exits'|'seams'|'boundary'>):void {
  d=copyNativeAreaData(d);
  const size=d.sourceZone?.size;
  if(!size||![size.w,size.h].every(n=>Number.isFinite(n)&&n>=60&&n<=16384)||!['rect','ellipse'].includes(d.sourceZone.shape??'')||Math.ceil(size.w/30)*Math.ceil(size.h/30)>1048576)throw Error('Native area input exceeds supported generation bounds');
  const geography=new MassNativeGeography(d.geography);geography.assertCompatible(d.geography);geography.restoreResolvedOwnerContext(d.context);
  if(d.id!==d.context.resolvedOwnerId||d.sourceZone.id!==d.context.nativeId||d.sourceZone.seed!==d.context.resolvedSeed
    ||(d.sourceZone.dimension??'surface')!==d.context.nativeDimension||!d.sourceZone.tileset||!d.sourceZone.shape)
    throw Error('Native area source owner differs from canonical mint context');
  const captured=restoreNativeGeographySource(d.geography.sourceJson);
  if(!captured.tilesets.some(([id])=>id===d.sourceZone.tileset))throw Error('Native area face is absent from recorded source');
  const context=geography.pointAt(d.context.physicalAnchor);
  const climate=Object.fromEntries(Object.entries(context.climate).map(([k,v])=>[k,Math.round(v*100)/100]));
  if(!same(context.native,d.context.resolvedTarget)||d.sourceZone.geo?.biomeDepth!==Math.max(0,Math.min(1,context.depth))||!same(d.sourceZone.geo?.climate,climate))throw Error('Native area geo differs from authoritative resolved field context');
  if(!point(d.entry)||!insideBounds(d.entry,0,{...d.sourceZone.size,shape:d.sourceZone.shape!})||!Array.isArray(d.exits)||d.exits.length!==d.sourceZone.exits.length)throw Error('Native area requires every ordered source exit');
  for(let i=0;i<d.exits.length;i++)if(!point(d.exits[i].generationPoint)||!point(d.exits[i].physicalPoint)||!same(d.exits[i].definition,d.sourceZone.exits[i]))throw Error('Native area ordered exit identity differs from mint');
  if(!d.boundary||d.boundary.schema!==1||d.boundary.policy!=='explicit-native-boundary-context-v1'||typeof d.boundary.sourceIdentity!=='string'||!d.boundary.sourceIdentity||d.boundary.sourceIdentity.length>4096||Object.keys(d.boundary).length!==6)throw Error('Complete native boundary source context required');
  for(const key of ['exitBoundaries','exitRoads','exitMelds'] as const){if(!Object.hasOwn(d.boundary,key))throw Error('Native boundary context needs explicit absence');const rows=d.boundary[key];if(rows!==undefined&&(!Array.isArray(rows)||rows.length!==d.exits.length))throw Error('Native boundary context lost ordered exits');}

  for(const key of ['exitBoundaries','exitMelds'] as const)if(d.boundary[key]?.some(v=>v!==undefined&&!text(v)))throw Error('Invalid native boundary annotation');
  for(const road of d.boundary.exitRoads??[])if(road!==undefined&&(!road||typeof road!=='object'||road.from!==undefined&&!['entry','nearest','farthest'].includes(road.from)||road.kind!==undefined&&!text(road.kind)||road.radius!==undefined&&(!Array.isArray(road.radius)||road.radius.length!==2||road.radius.some(v=>!Number.isFinite(v)||v<=0)||road.radius[1]<road.radius[0])||[road.step,road.wobble,road.bowFrac,road.overgrowth].some(v=>v!==undefined&&!Number.isFinite(v))))throw Error('Invalid native road annotation');
  const used=new Set<number>();for(const seam of d.seams){const e=d.exits[seam.exitIndex];if(!Number.isSafeInteger(seam.exitIndex)||!e||used.has(seam.exitIndex)||seam.port.owner!==d.id||seam.port.side!==e.definition.side||!same(seam.port.point,e.physicalPoint)||!point(seam.port.approach))throw Error('Native area seam does not match its complete exit input');used.add(seam.exitIndex);}
}
export function validateNativeAreaDescriptor(d:NativeAreaDescriptor):void {
  d=copyNativeAreaData(d);
  if(!d||d.schema!==1||d.compiler!=='native-area-v1'||d.publication!=='runtime-unbound')throw Error('Unsupported native area descriptor');
  validateNativeAreaCertificate(d.certificate);validateNativeAreaInputs(d);
  if(d.zone.id!==d.sourceZone.id||d.zone.seed!==d.sourceZone.seed||!same(d.zone.exits,d.sourceZone.exits)||!same(d.zone.size,d.sourceZone.size)||d.zone.shape!==d.sourceZone.shape)throw Error('Native generation changed area identity');
  for(const key of ['exitBoundaries','exitRoads','exitMelds'] as const)if(!same(d.zone[key],d.boundary[key]))throw Error('Native prepared boundary context changed');
  const geometry=createNativeAreaGeometry(d.geometry);const layout=geometry.source.layout;
  validateLayoutRows(layout);validateChannels(d.sidechannels);
  if(d.geometry.sourceIdentity!==serializeNativeAreaData({certificate:d.certificate,geography:d.geography,context:d.context,sourceZone:d.sourceZone,entry:d.entry,exits:d.exits,seams:d.seams,boundary:d.boundary,extraFixtures:d.extraFixtures}))throw Error('Native area geometry source identity mismatch');
  const expectedBounds={w:d.sourceZone.size.w,h:d.sourceZone.size.h,shape:d.sourceZone.shape,boundless:!!d.sourceZone.boundless,...(d.sourceZone.annexes?.length?{pieces:d.sourceZone.annexes.map(r=>({...r,active:false}))}:{})};
  if(!same(d.geometry.bounds,expectedBounds))throw Error('Native area original bounds changed');
  if(!same(d.requirements,nativeAreaRequirements(d.zone,layout,d.doodadRules,d.entrances,d.sidechannels,d.effectSources,d.brittleSources)))throw Error('Native area lost a required native owner');
  const rules=new Map(d.doodadRules),kinds=[...new Set(layout.doodads.map(d=>d.kind))];
  if(rules.size!==kinds.length||kinds.some(k=>!rules.has(k)))throw Error('Native area lost complete doodad rules');
  const sidezones=new Map(d.sidezoneDefinitions);if(sidezones.size!==d.sidezoneDefinitions.length||d.sidezoneDefinitions.some(([k,v])=>k!==v.kind||!kinds.includes(k)))throw Error('Native area sidezone source mismatch');
  const effectIndices=layout.doodads.flatMap((d,i)=>(d.effect??rules.get(d.kind)?.effect)?[i]:[]);
  if(d.effectSources.schema!==1||!digest(d.effectSources.registryHash)||!Array.isArray(d.effectSources.rows)||effectIndices.length!==d.effectSources.rows.length||d.effectSources.rows.some((r,i)=>r.index!==effectIndices[i]||r.kind!==layout.doodads[r.index]?.kind||!same(r.effect,layout.doodads[r.index].effect??rules.get(r.kind)?.effect)))throw Error('Native area effect source lost mechanism');
  for(const row of d.effectSources.rows){const e=row.effect;if(!['explicit','rule'].includes(row.origin)||row.origin!==(layout.doodads[row.index].effect?'explicit':'rule')||!text(e.id)||e.cd!==undefined&&(!Number.isFinite(e.cd)||e.cd<0)||![e.interval,e.radius,e.chance,e.power].every(Number.isFinite)||e.interval<=0||e.radius<0||e.chance<0||e.chance>1||e.statusId&&(!row.status||row.status.id!==e.statusId||!row.status.definition||!text(row.status.definition.label)||!text(row.status.definition.color)||!Number.isFinite(row.status.definition.duration)))throw Error('Native area effect/status source invalid');}
  const brittleIndices=layout.doodads.flatMap((d,i)=>d.kind==='burial_urn'?[i]:[]);
  if(d.brittleSources.schema!==1||!digest(d.brittleSources.registryHash)||!Array.isArray(d.brittleSources.definitions)||d.brittleSources.definitions.length>1||!!brittleIndices.length!==!!d.brittleSources.definitions.length||!Array.isArray(d.brittleSources.rows)||brittleIndices.length!==d.brittleSources.rows.length||d.brittleSources.rows.some((r,i)=>r.index!==brittleIndices[i]||r.kind!=='burial_urn'||!d.brittleSources.definitions.some(def=>def.hash===r.definitionHash)))throw Error('Native area brittle source lost mechanism');
  for(const definition of d.brittleSources.definitions){const {hash,...body}=definition;const w=definition.wake;
    if(!digest(hash)||massDigest(body)!==hash||massDigest(definition)!==d.brittleSources.registryHash||definition.protocol!=='native-burial-urn-v1'||definition.kind!=='burial_urn'||!definition.rule?.brittle
      ||(definition.dissolve?.debris?!definition.debris||definition.debris.kind!==definition.dissolve.debris||!definition.debris.rule:definition.debris!==null)
      ||!w||w.id!=='skeleton_warrior'||w.definition?.id!==w.id||!Array.isArray(w.tells)||!Number.isFinite(w.tellSweepSec)||w.tellSweepSec<=0
      ||!Array.isArray(w.definition.skills)||!Array.isArray(w.skills)||w.skills.length!==w.definition.skills.length||w.skills.some((v,i)=>v.id!==w.definition.skills[i]||v.definition?.id!==v.id)
      ||!w.nature||typeof w.nature.breathes!=='boolean'||typeof w.nature.remains!=='boolean'||!Number.isFinite(w.nature.density)||w.nature.density<=0)throw Error('Native area brittle definition changed');}

  const mouthOrder=[...layout.doodads.flatMap((v,i)=>v.kind==='cave_entrance'?[i]:[]),...layout.doodads.flatMap((v,i)=>v.kind!=='cave_entrance'&&sidezones.has(v.kind)?[i]:[])];
  if(!same(d.entrances.map(e=>e.doodadIndex),mouthOrder))throw Error('Native mouth enumeration changed');
  let ordinal=0;const indices=new Set<number>();for(const e of d.entrances){if(!uint32(e.seed))throw Error('Invalid native mouth seed');const doodad=layout.doodads[e.doodadIndex];if(e.id!==d.id+'/entrance/'+e.doodadIndex||!doodad||indices.has(e.doodadIndex)||!same(e.definition,sidezones.get(e.kind))||doodad.kind!==e.kind||!same(doodad.pos,e.sourcePosition)||e.tier!==(doodad.tier??0)||e.definition.kind!==e.kind||e.finalization!=='requires-native-mouth-owner')throw Error('Native area entrance source mismatch');indices.add(e.doodadIndex);if(e.kind==='cave_entrance'){if(e.seedKind!=='cave-ordinal'||e.seed!==layout.caveSeeds[ordinal++])throw Error('Native cave seed zip changed');}else if(e.seedKind!=='native-position'||e.seed!==nativeAreaMouthSeed(d.zone.id,e.kind,e.sourcePosition))throw Error('Native position seed changed');}
  if(ordinal!==layout.caveSeeds.length||layout.doodads.some((d,i)=>(d.kind==='cave_entrance'||sidezones.has(d.kind))&&!indices.has(i)))throw Error('Native cave seed zip incomplete');
  if(d.generationNext.length!==4||d.generationNext.some(n=>!Number.isFinite(n)||n<0||n>=1))throw Error('Native generation stream receipt missing');
}
/** Exact World hashStr at its registered-mouth boundary; no worldmass hash salt. */
export function nativeAreaMouthSeed(zoneId:string,kind:string,p:Vec2):number {let h=0x811c9dc5;const text=`${zoneId}:${kind}:${Math.round(p.x)},${Math.round(p.y)}`;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,0x01000193);}return h>>>0;}
export function serializeNativeArea(d:NativeAreaDescriptor):string {validateNativeAreaDescriptor(d);return serializeNativeAreaData(d);}
/** No native generator, source registry or blueprint reroll is consulted. */
export function restoreNativeArea(bytes:string,expected:{certificate:NativeAreaCompilerCertificate;geography:MassNativeGeographySpec}):Readonly<NativeAreaDescriptor> {
  const d=restoreNativeAreaData<NativeAreaDescriptor>(bytes);validateNativeAreaCertificate(expected.certificate);
  if(!same(d.certificate,expected.certificate)||!same(d.geography,expected.geography))throw Error('Native area requires its exact recorded compiler/source and geography');
  validateNativeAreaDescriptor(d);return copyNativeAreaData(d);
}
export function assessNativeArea(d:NativeAreaDescriptor,capabilities:ReadonlySet<string>):{ok:false;missing:string[]} {
  d=copyNativeAreaData(d);validateNativeAreaDescriptor(d);return {ok:false,missing:[...new Set(['native-area-runtime-unbound','native-area-bootstrap-source-issuer-unbound',...d.requirements.filter(r=>!capabilities.has(r))])].sort()};
}
export type NativeAreaGeneratedLayout = GeneratedLayout;
