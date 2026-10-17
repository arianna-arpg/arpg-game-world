import { Rng } from '../core/rng';
import { BEACON_CFG } from '../data/beacons';
import type { ZoneDef } from '../data/zones';
import { MAP_DIR } from '../world/coords';
import { address, localOffset, moveAddress, type MassAddress } from './address';
import { MassHierarchy, type MassGeography } from './hierarchy';
import type { GeographicPlan } from './geographicPlan';
import { canonical, freezeData, massDigest, streamSeed } from './random';

export interface PhysicalIntelTarget {
  id: string; region: string; kind: 'pyres' | 'rifts' | 'unearth'; center: MassAddress; approach: MassAddress;
  name: string; level: number; source: string; definitionHash: string; accessHash: string;
}
export interface PhysicalRevealPolicy {
  version: 1; source: string; nodeRadius: number; count: number; seed: number; salt: number;
  zoneSpan: number; nodeX: number; nodeY: number;
}
interface IntelState { knownAt: number | null; visitedAt: number | null }
interface SurveyState { revealed: string[] | null; at: number | null }
export interface PhysicalIntelManifest { policy: PhysicalRevealPolicy; candidates: PhysicalIntelTarget[] }
const TARGET='physical-intel', SURVEY='beacon-survey';
const clone=<T>(v:T):T=>JSON.parse(canonical(v)) as T;

/** Knowledge names real frozen objectives. It never claims terrain, boots,
 * quests or native population. Its only storage root is geographic ownership. */
export class MassPhysicalIntel {
  private targets=new Map<string,Readonly<PhysicalIntelTarget>>();
  private surveys=new Map<string,Readonly<PhysicalIntelManifest>>();
  constructor(readonly hierarchy:MassHierarchy){
    for(const row of hierarchy.controllers()){
      const t=row.controllers.find(c=>c.id===TARGET);
      if(t){const target=t.definition as PhysicalIntelTarget,state=t.state as IntelState;
        this.validateTarget(row.owner,target);
        if(t.source!=='worldmass/physical-intel-v1'||!state||![state.knownAt,state.visitedAt].every(n=>n===null||Number.isFinite(n)&&n>=0&&n<=t.updatedAt)
          ||state.visitedAt!==null&&(state.knownAt===null||state.visitedAt<state.knownAt)
          ||!['waiting','active'].includes(t.phase)||(t.phase==='waiting')!==(state.knownAt===null))throw Error('Invalid physical discovery checkpoint');
        this.targets.set(row.owner.id,freezeData(clone(target)));
      }
    }
    for(const row of hierarchy.controllers()){
      const s=row.controllers.find(c=>c.id===SURVEY);if(!s)continue;
      const m=s.definition as PhysicalIntelManifest,state=s.state as SurveyState;this.validateManifest(row.owner,m);
      if(s.source!=='data/beacons/physical-survey-v1'||!state||!(state.revealed===null||Array.isArray(state.revealed))
        ||state.at!==null&&(!Number.isFinite(state.at)||state.at<0||state.at>s.updatedAt)
        ||(state.at===null)!==(state.revealed===null)||state.revealed!==null&&(state.revealed.length>m.policy.count
          ||new Set(state.revealed).size!==state.revealed.length||state.revealed.some(id=>!m.candidates.some(t=>t.id===id)||!this.known(id)
            ||(this.hierarchy.controller(id,TARGET)!.state as IntelState).knownAt!==state.at))
        ||!['waiting','complete'].includes(s.phase)||(s.phase==='complete')!==(state.revealed!==null))throw Error('Invalid beacon discovery receipt');
      this.surveys.set(row.owner.id,freezeData(clone(m)));
    }
  }
  policy(owner:MassGeography,zone:Readonly<ZoneDef>):Readonly<PhysicalRevealPolicy>{
    if(zone.objective.kind!=='beacon')throw Error('Only native survey stones reveal country');
    const p:PhysicalRevealPolicy={version:1,source:'data/beacons',nodeRadius:zone.objective.revealRadius??BEACON_CFG.revealRadius,
      count:zone.objective.revealCount??BEACON_CFG.revealCount,seed:zone.seed??streamSeed(this.hierarchy.seed,[owner.id,'native-beacon/reveal']),
      salt:BEACON_CFG.revealSalt,zoneSpan:owner.span,nodeX:Math.abs(MAP_DIR.e.x),nodeY:Math.abs(MAP_DIR.s.y)};
    this.validatePolicy(p);return freezeData(p);
  }
  private validatePolicy(p:PhysicalRevealPolicy):void{
    if(!p||p.version!==1||p.source!=='data/beacons'||!Number.isFinite(p.nodeRadius)||p.nodeRadius<0||p.nodeRadius>400
      ||!Number.isSafeInteger(p.count)||p.count<0||p.count>128||!Number.isSafeInteger(p.seed)||!Number.isSafeInteger(p.salt)
      ||!Number.isSafeInteger(p.zoneSpan)||p.zoneSpan!==this.hierarchy.span('zone')||p.nodeX!==86||p.nodeY!==78)
      throw Error('Unsupported physical beacon reveal policy');
  }
  /** Native node-space disc projected explicitly onto seamless zone spacing. */
  candidates(owner:MassGeography,policy:PhysicalRevealPolicy):readonly Readonly<MassGeography>[]{
    this.validatePolicy(policy);const rows:Readonly<MassGeography>[]=[];
    for(let y=-Math.ceil(policy.nodeRadius/policy.nodeY);y<=Math.ceil(policy.nodeRadius/policy.nodeY);y++)
      for(let x=-Math.ceil(policy.nodeRadius/policy.nodeX);x<=Math.ceil(policy.nodeRadius/policy.nodeX);x++){
        if(!x&&!y||Math.hypot(x*policy.nodeX,y*policy.nodeY)>policy.nodeRadius)continue;
        rows.push(this.hierarchy.at(moveAddress(owner.center,{x:x*owner.span,y:y*owner.span},this.hierarchy.addressSpan)).zone);
      }
    if(rows.length>128)throw Error('Physical survey candidate budget exceeded');
    return Object.freeze(rows.sort((a,b)=>a.id.localeCompare(b.id)));
  }
  target(plan:Readonly<GeographicPlan>):Readonly<PhysicalIntelTarget>{
    const kind=plan.context.zone.objective.kind;if(kind!=='pyres'&&kind!=='rifts'&&kind!=='unearth')throw Error('Unsupported physical intel target');
    const {owner:_owner,...definition}=plan,half=plan.access.halfSpan,side=half/30*2+1,index=plan.access.anchors[0];
    const target:PhysicalIntelTarget={id:plan.owner.id,region:plan.owner.parent,kind,center:clone(plan.positions[0]),
      approach:moveAddress(plan.owner.center,{x:index%side*30-half,y:Math.floor(index/side)*30-half},this.hierarchy.addressSpan),
      name:plan.context.zone.name,level:plan.context.zone.level,source:plan.context.source,definitionHash:massDigest(definition),accessHash:plan.access.hash};
    return freezeData(target);
  }
  private validateTarget(owner:MassGeography,t:PhysicalIntelTarget):void{
    const access=this.hierarchy.controller(owner.id,'objective-access'),d=access?.definition as Omit<GeographicPlan,'owner'>|undefined;
    if(!t||t.id!==owner.id||t.region!==owner.parent||!['pyres','rifts','unearth'].includes(t.kind)||!d
      ||access!.definitionHash!==t.definitionHash||d.access.hash!==t.accessHash||d.context.source!==t.source
      ||d.context.zone.name!==t.name||d.context.zone.level!==t.level||d.context.zone.objective.kind!==t.kind
      ||canonical(d.positions[0])!==canonical(t.center)||canonical(address(t.approach.dimension,t.approach.cx,t.approach.cy,t.approach.x,t.approach.y,this.hierarchy.addressSpan))!==canonical(t.approach))
      throw Error('Physical intel lost its frozen target');
    const half=d.access.halfSpan,side=half/30*2+1,i=d.access.anchors[0];
    if(canonical(moveAddress(owner.center,{x:i%side*30-half,y:Math.floor(i/side)*30-half},this.hierarchy.addressSpan))!==canonical(t.approach))throw Error('Physical intel approach changed');
  }
  private validateManifest(owner:MassGeography,m:PhysicalIntelManifest):void{
    if(!m||!Array.isArray(m.candidates)||m.candidates.length>128||new Set(m.candidates.map(t=>t.id)).size!==m.candidates.length)throw Error('Invalid physical survey manifest');
    this.validatePolicy(m.policy);
    const source=this.hierarchy.controller(owner.id,'objective-access')?.definition as Omit<GeographicPlan,'owner'>|undefined;
    if(source?.context.zone.objective.kind!=='beacon')throw Error('Physical survey lost its native beacon source');
    const born=this.hierarchy.controller(owner.id,'objective:beacon')?.definition as {beacon?:{revealCount:number;revealRadius:number;revealSalt:number}}|undefined;
    const expected={...this.policy(owner,source.context.zone),...(born?.beacon?{count:born.beacon.revealCount,nodeRadius:born.beacon.revealRadius,salt:born.beacon.revealSalt}:{})};
    if(canonical(expected)!==canonical(m.policy))throw Error('Physical survey changed its frozen native reveal policy');

    for(const t of m.candidates){const target=this.targets.get(t.id),place=this.hierarchy.owner(t.id);
      if(!target||!place||t.id===owner.id||canonical(target)!==canonical(t))throw Error('Unknown physical survey target');
      const p=localOffset(place.center,owner.center,this.hierarchy.addressSpan,128);
      if(place.dimension!==owner.dimension||Math.hypot(p.x/m.policy.zoneSpan*m.policy.nodeX,p.y/m.policy.zoneSpan*m.policy.nodeY)>m.policy.nodeRadius+.00001)throw Error('Physical survey target outside native horizon');
    }
  }
  reserve(plan:Readonly<GeographicPlan>,now:number):Readonly<PhysicalIntelTarget>{
    const {owner,...definition}=plan;
    this.hierarchy.enroll(owner,'objective-access','worldmass/geographic-access-v1',definition,null,now);
    const target=this.target(plan);this.validateTarget(owner,target);
    this.hierarchy.enroll(owner,TARGET,'worldmass/physical-intel-v1',target,{knownAt:null,visitedAt:null},now);
    this.targets.set(owner.id,target);return target;
  }
  finish(owner:MassGeography,policy:PhysicalRevealPolicy,targets:readonly PhysicalIntelTarget[],now:number):void{
    const m={policy:clone(policy),candidates:clone([...targets])};this.validateManifest(owner,m);
    this.hierarchy.enroll(owner,SURVEY,'data/beacons/physical-survey-v1',m,{revealed:null,at:null},now);
    this.surveys.set(owner.id,freezeData(m));
  }
  manifest(owner:string):Readonly<PhysicalIntelManifest>|undefined{return this.surveys.get(owner);}
  reserved(id:string):boolean{return this.targets.has(id);}
  known(id:string):boolean{return (this.hierarchy.controller(id,TARGET)?.state as IntelState|undefined)?.knownAt!=null;}
  visited(id:string):boolean{return (this.hierarchy.controller(id,TARGET)?.state as IntelState|undefined)?.visitedAt!=null;}
  knownTargets():readonly Readonly<PhysicalIntelTarget>[] {return [...this.targets.values()].filter(t=>this.known(t.id));}
  private learn(id:string,now:number,visit:boolean):void{
    const c=this.hierarchy.controller(id,TARGET);if(!c)throw Error('Unreserved physical discovery');
    const s=c.state as IntelState;if(s.knownAt!==null&&(!visit||s.visitedAt!==null))return;
    if(!this.hierarchy.update(id,TARGET,c.revision,now,{knownAt:s.knownAt??now,visitedAt:s.visitedAt??(visit?now:null)},'active'))throw Error('Concurrent physical discovery');
  }
  observe(id:string,now:number):void {this.learn(id,now,true);}
  reveal(owner:string,now:number):readonly string[]{
    const manifest=this.surveys.get(owner),c=this.hierarchy.controller(owner,SURVEY);
    if(!manifest||!c)throw Error('Beacon survey was not prepared');
    const old=c.state as SurveyState;if(old.revealed!==null)return [];
    const candidates=manifest.candidates.filter(t=>!this.known(t.id)&&!this.visited(t.id)),rng=new Rng((manifest.policy.seed^manifest.policy.salt)>>>0),picked:string[]=[];
    while(picked.length<manifest.policy.count&&candidates.length)picked.push(candidates.splice(rng.int(0,candidates.length-1),1)[0].id);
    // No yields or external callbacks inside this validated knowledge transaction.
    for(const id of picked)this.learn(id,now,false);
    if(!this.hierarchy.update(owner,SURVEY,c.revision,now,{revealed:picked,at:now},'active'))throw Error('Concurrent beacon survey');
    const active=this.hierarchy.status(owner,SURVEY)!;
    if(!this.hierarchy.update(owner,SURVEY,active.revision,now,{revealed:picked,at:now},'complete'))throw Error('Concurrent beacon discovery completion');
    return picked;
  }
}
