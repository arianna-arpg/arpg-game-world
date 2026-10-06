import type { Vec2 } from '../core/math';
import type { MassAddress } from './address';
import { address,localOffset,moveAddress } from './address';
import type { MassRun,MassSpec } from './contracts';
import { MassGenerator } from './generator';
import type { MassGeography } from './hierarchy';
import type { MassHoldContext,NativeMassHoldSource } from './objectives';
import { MASS_ACCESS_POLICY,planGeographicAccess,validateGeographicAccess,type MassAccessProof } from './geographicAccessCore';
import { canonical,freezeData,massDigest,massRandom } from './random';

// Same finite native trail capsule distance used by journey reservations.
const segmentDistance=(p:Vec2,a:Vec2,b:Vec2):number=>{
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
export const GEOGRAPHIC_PLAN_COMPILER='geographic-plan-v1';
export interface GeographicReservations {
  circles:{x:number;y:number;radius:number}[];
  trails:{a:Vec2;b:Vec2;radius:number}[];
  /** Owner-relative native settlement rectangle with its original verge. */
  town?:{minX:number;minY:number;maxX:number;maxY:number;padding:number};
}
export interface GeographicPlanInput {
  compiler:typeof GEOGRAPHIC_PLAN_COMPILER;policy:typeof MASS_ACCESS_POLICY;run:MassRun;terrain:MassSpec;owner:Readonly<MassGeography>;
  context:Readonly<MassHoldContext>;selection:NativeMassHoldSource[];
  fixtureCount:number;chestWanted:boolean;fixtureRadius:number;
  regions:Record<string,{walkable:boolean;dry:boolean}>;reservations:GeographicReservations;
}
export interface GeographicPlan {
  owner:Readonly<MassGeography>;context:Readonly<MassHoldContext>;positions:MassAddress[];
  chestPosition?:MassAddress;access:Readonly<MassAccessProof>;
}
export interface GeographicPlanMetrics {placeMs:number;standMs:number;routeMs:number;expanded:number;samples:number}
export interface GeographicPreparation {
  compiler:typeof GEOGRAPHIC_PLAN_COMPILER;inputHash:string;sourceHash:string;planHash:string;
  plan:Readonly<GeographicPlan>|null;metrics:GeographicPlanMetrics;compileMs:number;bytes:number;
}
export interface GeographicPlanJob {protocol:1;token:number;input:Readonly<GeographicPlanInput>;inputHash:string;sourceHash:string;maxBytes:number}
export interface GeographicPlanReply {protocol:1;token:number;preparation?:GeographicPreparation;error?:string}
export function geographicPlanIdentity(input:Readonly<GeographicPlanInput>):{compiler:typeof GEOGRAPHIC_PLAN_COMPILER;inputHash:string;sourceHash:string}{return {compiler:GEOGRAPHIC_PLAN_COMPILER,
  inputHash:massDigest(input),sourceHash:massDigest({context:input.context,selection:input.selection,terrain:input.run.manifest,regions:input.regions,policy:input.policy,fixtureCount:input.fixtureCount,chestWanted:input.chestWanted,fixtureRadius:input.fixtureRadius})};}

export function validateGeographicPlanInput(input:Readonly<GeographicPlanInput>):void{
  canonical(input);
  const span=input.terrain.addressSpan,owner=input.owner,kind=input.context.zone.objective.kind;
  if(input.compiler!==GEOGRAPHIC_PLAN_COMPILER||canonical(input.policy)!==canonical(MASS_ACCESS_POLICY)||owner.kind!=='zone'||owner.run!==input.run.runId||input.run.addressSpan!==span
    ||input.context.zone.id!==owner.id||!['pyres','rifts','unearth'].includes(kind)||!input.context.recipe
    ||!Number.isSafeInteger(input.fixtureCount)||input.fixtureCount<1||input.fixtureCount>32||typeof input.chestWanted!=='boolean'
    ||!Number.isFinite(input.fixtureRadius)||input.fixtureRadius<=0||input.fixtureRadius>36
    ||!Array.isArray(input.selection)||!input.selection.length||input.selection.length>128
    ||input.selection.some(r=>!r.id||r.source!=='data/tilesets'||r.tileset!==owner.native?.zone.tileset||!Number.isFinite(r.weight)||r.weight<=0
      ||!Number.isFinite(r.totalWeight)||r.totalWeight<r.weight)
    ||canonical(address(owner.center.dimension,owner.center.cx,owner.center.cy,owner.center.x,owner.center.y,span))!==canonical(owner.center)
    ||!Number.isSafeInteger(owner.span)||owner.span<960||owner.span>1e6)throw Error('Invalid geographic plan source input');
  const reserved=input.reservations,finite=(p:Vec2)=>Number.isFinite(p.x)&&Number.isFinite(p.y);
  if(!Array.isArray(reserved.circles)||reserved.circles.length>4096||!Array.isArray(reserved.trails)||reserved.trails.length>4096
    ||reserved.circles.some(c=>!finite(c)||!Number.isFinite(c.radius)||c.radius<=0)
    ||reserved.trails.some(t=>!finite(t.a)||!finite(t.b)||!Number.isFinite(t.radius)||t.radius<0)
    ||reserved.town&&(!Object.values(reserved.town).every(Number.isFinite)||reserved.town.minX>reserved.town.maxX||reserved.town.minY>reserved.town.maxY||reserved.town.padding<0))
    throw Error('Invalid frozen geographic reservations');
  const regions=[...input.terrain.surfaces.map(s=>s.region),...input.terrain.places.flatMap(p=>p.surface?[p.surface.region]:[])];
  if(regions.some(id=>!input.regions[id]||typeof input.regions[id].walkable!=='boolean'||typeof input.regions[id].dry!=='boolean'))throw Error('Incomplete geographic terrain policy');
  const rng=massRandom(input.run.seed,[owner.id,'native-objective']);
  if(!rng.chance(input.selection.reduce((n,r)=>n+r.weight,0)/input.selection[0].totalWeight)
    ||canonical(rng.weighted(input.selection))!==canonical(input.context.recipe))throw Error('Geographic plan source lottery changed');
}

type GeographicBody={x:number;y:number;radius:number};
function geographicReservations(input:Readonly<GeographicPlanInput>,bodies:readonly GeographicBody[],halfSpan:number){
  const span=input.terrain.addressSpan,reservations=[...bodies,...input.reservations.circles]
    .filter(b=>Math.abs(b.x)<=halfSpan+150+b.radius&&Math.abs(b.y)<=halfSpan+150+b.radius);
  return(at:MassAddress,r:number):boolean=>{
    const q=localOffset(at,input.owner.center,span,16),town=input.reservations.town;
    if(town&&Math.hypot(Math.max(0,town.minX-q.x,q.x-town.maxX),Math.max(0,town.minY-q.y,q.y-town.maxY))<town.padding+r)return true;
    return reservations.some(b=>(q.x-b.x)**2+(q.y-b.y)**2<(r+b.radius)**2)||input.reservations.trails.some(t=>segmentDistance(q,t.a,t.b)<t.radius+r);
  };
}

/** Same pure kernel for authoritative cold queries and the background worker.
 * Every region rule, native source and finite reservation is explicit input.
 * No World, live actors, browser storage or ambient runtime RNG is consulted. */
export function compileGeographicPlan(input:Readonly<GeographicPlanInput>,generator?:MassGenerator):{plan:Readonly<GeographicPlan>|null;metrics:GeographicPlanMetrics}{
  validateGeographicPlanInput(input);
  const gen=generator??new MassGenerator(input.run,input.terrain);
  if(canonical(gen.run)!==canonical(input.run)||massDigest(gen.spec)!==input.run.manifest)throw Error('Geographic generator source mismatch');
  const {owner,context}=input,span=input.terrain.addressSpan,metrics={placeMs:0,standMs:0,routeMs:0,expanded:0,samples:0};
  const end=(plan:GeographicPlan|null)=>({plan:plan?freezeData(plan):null,metrics});
  const rng=massRandom(input.run.seed,[owner.id,'native-objective']);rng.chance(input.selection.reduce((n,r)=>n+r.weight,0)/input.selection[0].totalWeight);rng.weighted(input.selection);
  const count=input.fixtureCount+(input.chestWanted?1:0),positions:MassAddress[]=[],halfSpan=Math.floor(Math.min(MASS_ACCESS_POLICY.halfSpan,owner.span/2-180)/30)*30,radius=Math.min(960,halfSpan-180);
  const started=performance.now(),bodies=new Map<string,{x:number;y:number;radius:number}>();
  const lo=moveAddress(owner.center,{x:-halfSpan-150,y:-halfSpan-150},span),hi=moveAddress(owner.center,{x:halfSpan+150,y:halfSpan+150},span);
  if((BigInt(hi.cx)-BigInt(lo.cx)+1n)*(BigInt(hi.cy)-BigInt(lo.cy)+1n)>64n)return end(null);
  for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++)
    for(const place of gen.placesInCell({dimension:owner.dimension,cx:x.toString(),cy:y.toString()}))bodies.set(place.id,{...localOffset(place.center,owner.center,span,64),radius:place.radius});
  if(bodies.size>4096)return end(null);metrics.placeMs=performance.now()-started;
  const standStarted=performance.now(),reserved=geographicReservations(input,[...bodies.values()],halfSpan);
  for(let attempt=0;attempt<96&&positions.length<count;attempt++){
    const angle=rng.range(0,Math.PI*2),reach=Math.sqrt(rng.next())*radius;
    const at=moveAddress(owner.center,{x:Math.round(Math.cos(angle)*reach/30)*30,y:Math.round(Math.sin(angle)*reach/30)*30},span);
    if(reserved(at,150)||positions.some(q=>{const d=localOffset(q,at,span);return Math.hypot(d.x,d.y)<300;}))continue;
    const region=gen.terrainAt(at).region;
    if(!input.regions[region]?.walkable||['water','lava','chasm','bog','swamp'].includes(region))continue;
    let clear=true;
    for(let i=0;i<12;i++)if(!input.regions[gen.terrainAt(moveAddress(at,{x:Math.cos(i*Math.PI/6)*80,y:Math.sin(i*Math.PI/6)*80},span)).region]?.dry){clear=false;break;}
    if(clear)positions.push(at);
  }
  metrics.standMs=performance.now()-standStarted;if(positions.length!==count)return end(null);
  const routeStarted=performance.now(),access=planGeographicAccess(owner.center,positions.map((at,i)=>({at,radius:i<input.fixtureCount?input.fixtureRadius:24})),span,
    {terrainCell:input.terrain.terrainCell,regionAt:at=>gen.terrainAt(at).region,isDry:id=>!!input.regions[id]?.dry,reserved},halfSpan);
  metrics.routeMs=performance.now()-routeStarted;metrics.expanded=access.expanded;metrics.samples=access.samples;
  if(!access.ok)return end(null);
  return end({owner,context,positions:positions.slice(0,input.fixtureCount),...(positions[input.fixtureCount]?{chestPosition:positions[input.fixtureCount]}:{}),access:access.proof});
}

export function prepareGeographicPlan(job:GeographicPlanJob,generator?:MassGenerator):GeographicPlanReply{
  if(job.protocol!==1||!Number.isSafeInteger(job.token)||job.token<1||!Number.isSafeInteger(job.maxBytes)||job.maxBytes<1024||job.maxBytes>1024*1024)throw Error('Invalid geographic worker job');
  const started=performance.now();
  try{
    const identity=geographicPlanIdentity(job.input);if(identity.inputHash!==job.inputHash||identity.sourceHash!==job.sourceHash)throw Error('Geographic input identity mismatch');
    const {plan,metrics}=compileGeographicPlan(job.input,generator),bytes=JSON.stringify(plan).length*2;
    if(bytes>job.maxBytes)throw Error('Geographic plan exceeds transfer budget');
    return {protocol:1,token:job.token,preparation:{...identity,plan,metrics,compileMs:performance.now()-started,bytes,planHash:massDigest(plan)}};
  }catch(error){return {protocol:1,token:job.token,error:String(error instanceof Error?error.message:error)};}
}
function validateGeographicEnvelope(input:Readonly<GeographicPlanInput>,p:GeographicPreparation):Readonly<GeographicPlan>|null{
  validateGeographicPlanInput(input);const identity=geographicPlanIdentity(input);
  if(!p||p.compiler!==identity.compiler||p.inputHash!==identity.inputHash||p.sourceHash!==identity.sourceHash||p.planHash!==massDigest(p.plan)
    ||!Number.isFinite(p.compileMs)||p.compileMs<0||!Number.isSafeInteger(p.bytes)||p.bytes!==JSON.stringify(p.plan).length*2
    ||!p.metrics||Object.values(p.metrics).some(n=>!Number.isFinite(n)||n<0)||p.metrics.expanded>MASS_ACCESS_POLICY.maxExpanded)throw Error('Invalid prepared geographic identity');
  if(!p.plan)return null;
  const plan=p.plan,targets=plan.chestPosition?[...plan.positions,plan.chestPosition]:plan.positions;
  validateGeographicAccess(plan.access,input.terrain.addressSpan);
  if(canonical(plan.owner)!==canonical(input.owner)||canonical(plan.context)!==canonical(input.context)||plan.positions.length!==input.fixtureCount
    ||!!plan.chestPosition!==input.chestWanted||canonical(targets)!==canonical(plan.access.targets.map(t=>t.at))
    ||canonical(plan.access.center)!==canonical(input.owner.center)||plan.access.targets.some((t,i)=>t.radius!==(i<input.fixtureCount?input.fixtureRadius:24)))throw Error('Prepared geographic plan changed its frozen source or stands');
  return freezeData(JSON.parse(canonical(plan)) as GeographicPlan);
}

/** Semantic checking visits only returned geometry, never repeats A*. Each yield
 * bounds work to one generated page or terrain/route sample. Publication belongs
 * to the caller and must wait until the iterator is completely finished. */
export function* validateGeographicPreparationSteps(input:Readonly<GeographicPlanInput>,p:GeographicPreparation,generator?:MassGenerator):Generator<void,Readonly<GeographicPlan>|null>{
  const plan=validateGeographicEnvelope(input,p);yield;
  if(!plan)return null;
  const gen=generator??new MassGenerator(input.run,input.terrain),span=input.terrain.addressSpan,center=input.owner.center;
  if(canonical(gen.run)!==canonical(input.run)||massDigest(gen.spec)!==input.run.manifest)throw Error('Geographic validation generator source mismatch');
  const halfSpan=Math.floor(Math.min(input.policy.halfSpan,input.owner.span/2-180)/30)*30;
  if(plan.access.halfSpan!==halfSpan)throw Error('Prepared geographic access changed its extent');
  const bodies=new Map<string,GeographicBody>(),lo=moveAddress(center,{x:-halfSpan-150,y:-halfSpan-150},span),hi=moveAddress(center,{x:halfSpan+150,y:halfSpan+150},span);
  if((BigInt(hi.cx)-BigInt(lo.cx)+1n)*(BigInt(hi.cy)-BigInt(lo.cy)+1n)>64n)throw Error('Prepared geographic place extent exceeds budget');
  for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++){
    for(const place of gen.placesInCell({dimension:center.dimension,cx:x.toString(),cy:y.toString()}))bodies.set(place.id,{...localOffset(place.center,center,span,64),radius:place.radius});
    if(bodies.size>4096)throw Error('Prepared geographic place count exceeds budget');yield;
  }
  const reserved=geographicReservations(input,[...bodies.values()],halfSpan),targets=plan.access.targets.map(t=>({...localOffset(t.at,center,span,16),radius:t.radius}));
  for(let i=0;i<targets.length;i++){
    const t=targets[i];const at:MassAddress=plan.access.targets[i].at;
    if(t.x%30||t.y%30||Math.hypot(t.x,t.y)>Math.min(960,halfSpan-180)+22||reserved(at,150)
      ||targets.slice(0,i).some(q=>Math.hypot(q.x-t.x,q.y-t.y)<300))throw Error('Prepared geographic stand violates frozen reservations');
    const id=gen.terrainAt(at).region;yield;
    if(!input.regions[id]?.walkable||['water','lava','chasm','bog','swamp'].includes(id))throw Error('Prepared geographic stand has invalid terrain');
    for(let n=0;n<12;n++){
      const dry=input.regions[gen.terrainAt(moveAddress(at,{x:Math.cos(n*Math.PI/6)*80,y:Math.sin(n*Math.PI/6)*80},span)).region]?.dry;yield;
      if(!dry)throw Error('Prepared geographic stand ring is not dry');
    }
  }
  const cell=input.terrain.terrainCell,terrain=new Map<string,boolean>(),checked=new Set<string>(),side=halfSpan/30*2+1;
  const point=(i:number)=>({x:i%side*30-halfSpan,y:Math.floor(i/side)*30-halfSpan});
  for(const path of plan.access.paths)for(let n=0;n<path.length;n++){
    const a=point(path[n? n-1:0]),b=point(path[n]);
    for(const fraction of [.25,.5,.75,1]){
      const q={x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction},key=q.x+','+q.y;
      if(checked.has(key))continue;checked.add(key);
      if(targets.some(t=>Math.hypot(q.x-t.x,q.y-t.y)<t.radius+input.policy.bodyRadius)
        ||reserved(moveAddress(center,q,span),input.policy.corridorRadius))throw Error('Prepared geographic route crosses a frozen body or reservation');
      const p={x:q.x+center.x%cell,y:q.y+center.y%cell},r=input.policy.bodyRadius;
      for(let y=Math.floor((p.y-r)/cell);y<=Math.floor((p.y+r)/cell);y++)for(let x=Math.floor((p.x-r)/cell);x<=Math.floor((p.x+r)/cell);x++){
        const dx=Math.max(x*cell-p.x,0,p.x-(x+1)*cell),dy=Math.max(y*cell-p.y,0,p.y-(y+1)*cell);
        if(dx*dx+dy*dy>=r*r)continue;
        const k=x+','+y;let dry=terrain.get(k);
        if(dry===undefined){dry=!!input.regions[gen.terrainAt(moveAddress(center,{x:(x+.5)*cell-center.x%cell,y:(y+.5)*cell-center.y%cell},span)).region]?.dry;terrain.set(k,dry);yield;}
        if(!dry)throw Error('Prepared geographic route crosses non-dry terrain');
      }
      yield;
    }
  }
  return plan;
}
export function validateGeographicPreparation(input:Readonly<GeographicPlanInput>,p:GeographicPreparation,generator?:MassGenerator):Readonly<GeographicPlan>|null{
  const check=validateGeographicPreparationSteps(input,p,generator);
  for(;;){const next=check.next();if(next.done)return next.value;}
}
