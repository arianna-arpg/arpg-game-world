/** Whole native layout compilation. This is a preparation boundary only: no
 * bodies, terrain or controllers are published into a running world here. */
import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { sidezoneOf } from '../data/sidezones';
import { generateLayout, doodadRuleOf } from '../engine/levelgen';
import { captureNativeGeneration } from './nativeGeneration';
import { captureNativeEffectSources } from './nativeEffectSources';
import { captureNativeBrittleSources } from './nativeBrittleSources';
import { captureNativeAreaGeometry } from './nativeAreaGeometryCapture';
import { copyNativeAreaData, serializeNativeAreaData } from './nativeAreaGeometry';
import type { MassNativeGeographySpec, MassNativeResolvedOwnerContext } from './nativeGeography';
import { nativeAreaRequirements, nativeAreaMouthSeed, validateNativeAreaInputs, validateNativeAreaCertificate,
  validateNativeAreaDescriptor, type NativeAreaCompilerCertificate, type NativeAreaDescriptor,
  type NativeAreaExitInput, type NativeAreaSeamInput, type NativeAreaEntrance, type NativeAreaBoundaryInput } from './nativeArea';

/** Mandatory caller-provided trust boundary. buildIdentity must identify the
 * complete compiler code, installedSourceIdentity its complete installed native
 * sources. The callback must also verify the entire detached native mint and
 * boundary input provenance; shape checks alone are not a mint certificate.
 * This module does not issue or authenticate these identities. A real
 * bootstrap issuer remains required before runtime area activation. */
export interface NativeAreaCompilerLease {
  certificate: NativeAreaCompilerCertificate;
  readRevision(): string;
  assertCurrent(certificate: Readonly<NativeAreaCompilerCertificate>, input: Readonly<NativeAreaCompileInput>): boolean;
}
export interface NativeAreaCompileInput {
  id: string; geography: MassNativeGeographySpec; context: MassNativeResolvedOwnerContext;
  mintedZone: ZoneDef; entry: Vec2; exits: NativeAreaExitInput[]; seams: NativeAreaSeamInput[]; boundary: NativeAreaBoundaryInput;
  extraFixtures?: { structure: string; x: number; y: number }[];
}
function leaseMethods(lease:NativeAreaCompilerLease) {
  const read=Object.getOwnPropertyDescriptor(lease,'readRevision'),check=Object.getOwnPropertyDescriptor(lease,'assertCurrent');
  if(!read||!check||!('value'in read)||!('value'in check)||typeof read.value!=='function'||typeof check.value!=='function')throw Error('Native compiler lease needs explicit synchronous callbacks');
  return {read:()=>read.value.call(lease) as string,check:(certificate:Readonly<NativeAreaCompilerCertificate>,input:Readonly<NativeAreaCompileInput>)=>check.value.call(lease,certificate,input) as unknown};
}
/** Frozen inputs precede every callback. The revision is read after the check
 * too, so a callback cannot silently mutate installed sources while certifying. */
export function compileNativeArea(raw:NativeAreaCompileInput,lease:NativeAreaCompilerLease):Readonly<NativeAreaDescriptor> {
  const input=copyNativeAreaData(raw),cd=Object.getOwnPropertyDescriptor(lease,'certificate');
  if(!cd||!('value'in cd))throw Error('Native compiler certificate must be detached data');
  const certificate=copyNativeAreaData(cd.value) as NativeAreaCompilerCertificate;
  validateNativeAreaCertificate(certificate);const methods=leaseMethods(lease);
  const sourceZone=input.mintedZone;
  validateNativeAreaInputs({...input,sourceZone});
  if(sourceZone.boundless)throw Error('Boundless native area needs a streaming layout compiler');
  if(!Number.isInteger(sourceZone.seed)||sourceZone.seed!<0||sourceZone.seed!>0xffffffff)throw Error('Native area needs its resolved uint32 seed');
  const stableCheck=(expected?:string)=>{
    const before=methods.read();if(typeof before!=='string'||!before||before.length>4096)throw Error('Invalid native compiler source revision');
    if(methods.check(certificate,input)!==true)throw Error('Native compiler/source attestation refused');
    const after=methods.read();if(after!==before||(expected!==undefined&&after!==expected))throw Error('Native compiler sources changed during preparation');return after;
  };
  const size=serializeNativeAreaData({mintedZone:sourceZone,boundary:input.boundary,extraFixtures:input.extraFixtures??[]}).length;
  if(size>8*1024*1024)throw Error('Native area input exceeds supported source transfer budget');
  const revision=stableCheck();
  // The generator owns mutable working copies. Every requested field survives;
  // no face/layout/objective substitution or implicit fixture policy is added.
  const zone=structuredClone(sourceZone),entry=structuredClone(input.entry),exitPoints=input.exits.map(e=>structuredClone(e.generationPoint));
  zone.exitBoundaries=structuredClone(input.boundary.exitBoundaries);
  zone.exitRoads=structuredClone(input.boundary.exitRoads);
  zone.exitMelds=structuredClone(input.boundary.exitMelds);
  const extraFixtures=structuredClone(input.extraFixtures??[]);
  const bounds={w:zone.size.w,h:zone.size.h,shape:zone.shape!,boundless:!!zone.boundless,
    ...(zone.annexes?.length?{pieces:zone.annexes.map(r=>({...r,active:false}))}:{})};
  const rng=new Rng(zone.seed!);
  const {value:layout,sidechannels}=captureNativeGeneration(zone,()=>generateLayout(zone,bounds,rng,entry,exitPoints,extraFixtures));
  const generationNext=Array.from({length:4},()=>rng.next());
  const effectSources=captureNativeEffectSources(layout.doodads),brittleSources=captureNativeBrittleSources(layout.doodads);
  const doodadRules=[...new Set(layout.doodads.map(d=>d.kind))].map(kind=>[kind,copyNativeAreaData(doodadRuleOf(kind))] as [string,ReturnType<typeof doodadRuleOf>]);
  const entrances:NativeAreaEntrance[]=[];const sidezoneDefinitions:NativeAreaDescriptor['sidezoneDefinitions']=[];let ordinal=0;
  const indexed=[...layout.doodads.entries()];
  // World enumerates cave mouths first, then other registered mouths.
  const ordered=[...indexed.filter(([,d])=>d.kind==='cave_entrance'),...indexed.filter(([,d])=>d.kind!=='cave_entrance')];
  for(const [index,d]of ordered){
    const definition=sidezoneOf(d.kind);if(!definition){if(d.kind==='cave_entrance')throw Error('Native cave mouth lost its sidezone definition');continue;}
    const {mint:_mint,...data}=definition;
    if(!sidezoneDefinitions.some(([kind])=>kind===d.kind))sidezoneDefinitions.push([d.kind,copyNativeAreaData(data)]);
    const seed=d.kind==='cave_entrance'?layout.caveSeeds[ordinal++]:nativeAreaMouthSeed(zone.id,d.kind,d.pos);
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Native area cave seed zip invalid');
    entrances.push({id:input.id+'/entrance/'+index,doodadIndex:index,kind:d.kind,sourcePosition:{...d.pos},tier:d.tier??0,seed,
      seedKind:d.kind==='cave_entrance'?'cave-ordinal':'native-position',definition:copyNativeAreaData(data),finalization:'requires-native-mouth-owner'});
  }
  if(ordinal!==layout.caveSeeds.length)throw Error('Native area cave seed zip has surplus seeds');
  const sourceIdentity=serializeNativeAreaData({certificate,geography:input.geography,context:input.context,sourceZone,
    entry:input.entry,exits:input.exits,seams:input.seams,boundary:input.boundary,extraFixtures});
  const geometry=captureNativeAreaGeometry({sourceIdentity,bounds,layout});
  const descriptor:NativeAreaDescriptor={schema:1,compiler:'native-area-v1',publication:'runtime-unbound',id:input.id,
    certificate,geography:input.geography,context:input.context,sourceZone,zone,entry:input.entry,exits:input.exits,seams:input.seams,boundary:input.boundary,
    extraFixtures,geometry,sidechannels,effectSources,brittleSources,doodadRules,sidezoneDefinitions,entrances,
    requirements:nativeAreaRequirements(zone,geometry.layout,doodadRules,entrances,sidechannels,effectSources,brittleSources),generationNext};
  const frozen=copyNativeAreaData(descriptor);validateNativeAreaDescriptor(frozen);
  stableCheck(revision);return frozen;
}
