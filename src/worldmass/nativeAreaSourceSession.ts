/** Campaign-owned content sources for native area assembly. Tickets prove local
 * provenance only; they do not reserve terrain or authorize runtime publication. */
import type {ZoneDef} from '../data/zones';
import {captureNativeGeographySource} from '../world/captureGeography';
import {landmarkComplex} from '../world/landmarkComplexes';
import type {MapCoord} from '../world/coords';
import type {MassAddress} from './address';
import {MassNativeGeography} from './nativeGeography';
import {NativeAreaSceneGraph} from './nativeAreaSceneGraph';

declare const sourceBrand:unique symbol;
/** Session-local capability. Persist the native graph, not this process handle. */
export interface NativeAreaSource {readonly id:string;readonly [sourceBrand]:true}
export interface NativeAreaSourceView {
 readonly definition:ZoneDef;
 /** Complete complex family in actual campaign insertion order; otherwise one member. */
 readonly members:readonly ZoneDef[];
 /** Current graph positions. These are candidates, never physical reservations. */
 readonly positions:readonly {readonly id:string;readonly native:Readonly<MapCoord>;readonly physical:Readonly<MassAddress>}[];
}
interface SourceBinding {definition:ZoneDef;members:readonly ZoneDef[]}

export class NativeAreaSourceSession {
 readonly graph:NativeAreaSceneGraph;
 readonly geography:MassNativeGeography;
 readonly #campaign;
 readonly #zoneMap;
 readonly #caveMap;
 readonly #sim;
 readonly #manifest;
 readonly #tickets=new WeakMap<NativeAreaSource,SourceBinding>();
 constructor(graph:NativeAreaSceneGraph,geography:MassNativeGeography){
  if(!(graph instanceof NativeAreaSceneGraph)||!(geography instanceof MassNativeGeography))throw Error('Native source session needs concrete graph and geography owners');
  this.graph=graph;this.geography=geography;
  this.#campaign=graph.input.campaign;
  this.#zoneMap=this.#campaign.zoneMap;this.#caveMap=this.#campaign.caveMap;
  this.#sim=this.#campaign.sim;this.#manifest=this.#campaign.manifest;
  graph.withGenerationPolicies(()=>this.assertCampaign());
  Object.freeze(this);
 }
 private assertCampaign():void {
  const c=this.graph.input.campaign;
  if(c.manifest!==c.sim.manifest)throw Error('Native source needs identical campaign manifest');
  if(c!==this.#campaign||this.graph.input.coast.input.campaign!==c||c.zoneMap!==this.#zoneMap||c.caveMap!==this.#caveMap||c.sim!==this.#sim||c.manifest!==this.#manifest)throw Error('Native source campaign binding changed');
  if(this.geography.seed!==c.sim.biomeField.fieldSeed)throw Error('Native source campaign seed differs from geography');
  if(JSON.stringify(captureNativeGeographySource(this.geography.seed))!==this.geography.spec.sourceJson)throw Error('Native source installed geography differs from recorded source');
 }
 private definition(id:string):ZoneDef {
  if(typeof id!=='string'||!id||id==='?')throw Error('Native source needs a resolved campaign identity');
  const z=Object.hasOwn(this.#zoneMap,id)?this.#zoneMap[id]:undefined;
  const cave=Object.hasOwn(this.#caveMap,id)?this.#caveMap[id]:undefined;
  if(z&&cave&&z!==cave)throw Error('Native source identity is ambiguous across campaign graphs');
  const def=z??cave;
  if(!def||def.id!==id)throw Error('Native source is absent from the campaign: '+id);
  if((def.dimension??'surface')!==this.geography.spec.mapping.nativeDimension)throw Error('Native source needs its own dimension mapping');
  return def;
 }
 private family(def:ZoneDef):readonly ZoneDef[] {
  if(!def.complex)return Object.freeze([def]);
  const membership=def.complex,root=this.definition(membership.root),program=landmarkComplex(membership.kind);
  if(!program||program.version!==membership.version||root.complex?.root!==root.id||root.complex.kind!==membership.kind||root.complex.stage!==program.entrance)throw Error('Native source complex needs its complete recorded program');
  const members=Object.values(this.#zoneMap).filter(z=>z.complex?.root===root.id);
  if(members.length!==program.stages.length||!members.includes(def))throw Error('Native source complex is incomplete');
  const stages=new Map<string,ZoneDef>();
  for(const member of members){
   const m=member.complex!;
   if(this.definition(member.id)!==member||m.kind!==membership.kind||m.version!==program.version||stages.has(m.stage)||!program.stages.some(s=>s.id===m.stage))throw Error('Native source complex has conflicting members');
   if(member.id!==(m.stage===program.entrance?root.id:root.id+'__'+m.stage))throw Error('Native source complex member identity changed');
   stages.set(m.stage,member);
  }
  for(const link of program.links){const a=stages.get(link.from)!,b=stages.get(link.to)!;
   if(!a.exits.some(e=>e.to===b.id)||!b.exits.some(e=>e.to===a.id))throw Error('Native source complex lost an internal connection');
  }
  return Object.freeze(members);
 }
 private bound(source:NativeAreaSource):SourceBinding {
  const binding=source&&this.#tickets.get(source);
  if(!binding)throw Error('Native source ticket belongs to another session or was not issued');
  const def=this.definition(source.id),members=this.family(def);
  if(def!==binding.definition||members.length!==binding.members.length||members.some((z,i)=>z!==binding.members[i]))throw Error('Native source graph objects changed; issue from the restored campaign');
  return binding;
 }
 private view(binding:SourceBinding):NativeAreaSourceView {
  const positions=binding.members.map(z=>Object.freeze({id:z.id,native:Object.freeze({...z.map}),physical:this.geography.physicalAnchor(z.map)}));
  return Object.freeze({definition:binding.definition,members:binding.members,positions:Object.freeze(positions)});
 }
 /** Takes only a campaign ID: no caller-supplied face, seed, mint or certificate. */
 issue(id:string):NativeAreaSource {
  return this.graph.withGenerationPolicies(()=>{
   this.assertCampaign();const definition=this.definition(id),binding={definition,members:this.family(definition)};
   this.view(binding);
   const ticket=Object.freeze({id}) as NativeAreaSource;this.#tickets.set(ticket,binding);return ticket;
  });
 }
 read(source:NativeAreaSource):NativeAreaSourceView {
  return this.graph.withGenerationPolicies(()=>{this.assertCampaign();return this.view(this.bound(source));});
 }
 /** Complete native frontier pass including budget, consolidation and child
  * publication. Partial effects survive exceptions; never automatically retry. */
 chartNeighbors(source:NativeAreaSource):NativeAreaSourceView {
  return this.graph.withGenerationPolicies(()=>{
   this.assertCampaign();const binding=this.bound(source);this.view(binding);
   if(this.#zoneMap[source.id]!==binding.definition)throw Error('Native source cave content does not own surface frontiers');
   this.graph.chartNeighborsOf(binding.definition);
   this.assertCampaign();return this.view(this.bound(source));
  });
 }
}
