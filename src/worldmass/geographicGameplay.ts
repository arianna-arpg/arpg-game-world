import type { World, Chest } from '../engine/world';
import { MassProcessionGameplay } from './processionGameplay';
import type { NativeMassProcessionSource } from './processionTypes';
import { chooseNativeGeographicObjective, type NativeGeographicObjectiveSource } from './geographicObjectiveChoice';
import { regionKind } from '../world/regions';
import type { ZoneDef } from '../data/zones';
import { MassPhysicalIntel, type PhysicalIntelTarget, type PhysicalRevealPolicy } from './physicalIntel';
import { localOffset, moveAddress, type MassAddress } from './address';
import { discTerrainClear, GeographicAccessIndex, MASS_ACCESS_POLICY, validateGeographicAccess, type MassAccessProof } from './geographicAccess';
import { MassHierarchy, massAddressBounds, nativeHierarchySources, type MassGeography, type MassHierarchyPolicy, type MassHierarchySave } from './hierarchy';
import { MassObjectiveBodies } from './objectiveBodies';
import { MassObjectives, resolveMassHoldContext, isNativeMassHoldKind, type MassObjectiveHost, type MassHoldContext, type NativeMassHoldSource, type NativeMassPyreSource } from './objectives';
import { compileGeographicPlan, GEOGRAPHIC_PLAN_COMPILER, validateGeographicPreparation, validateGeographicPreparationSteps, type GeographicPlan, type GeographicPlanInput, type GeographicPreparation, type GeographicReservations, type GeographicPlanMetrics } from './geographicPlan';
import { createGeographicPlanWarmQueue, type GeographicPlanWarmQueue } from './geographicWarm';
import { canonical, freezeData, massRandom } from './random';
import type { WorldMassRuntime } from './runtime';

export interface MassGeographicSpec { policy: MassHierarchyPolicy; pyres: NativeMassPyreSource[]; holds?: NativeMassHoldSource[]; processions?: readonly NativeMassProcessionSource[]; maxObjectives: number; weather?: import('./weather').MassWeatherPolicy; snow?: import('./snow').MassSnowPolicy; storms?: boolean }
interface Planned { owner: Readonly<MassGeography>; context: Readonly<MassHoldContext>; positions: MassAddress[]; chestPosition?: MassAddress; access?:Readonly<MassAccessProof>; legacyAccess?:'legacy-unverified-access' }
/** Geographic ownership persists independently from renderer pages. Native
 * objectives mount only their own real fixtures, preserving neighboring work. */
export class MassGeographicGameplay {
  readonly hierarchy: MassHierarchy;
  readonly objectives: MassObjectives;
  readonly intel: MassPhysicalIntel;
  readonly caravans: MassProcessionGameplay;
  readonly warm:GeographicPlanWarmQueue|null;
  private intelWork=new Map<string,{plan:Readonly<GeographicPlan>;policy:Readonly<PhysicalRevealPolicy>;owners:readonly Readonly<MassGeography>[];cursor:number;targets:PhysicalIntelTarget[];check?:Generator<void,boolean>;target?:Readonly<GeographicPlan>}>();
  private intelMetrics={checks:0,maxSliceMs:0,prepared:0};
  private snapshotHost: MassObjectiveHost | null = null;
  private bodies: MassObjectiveBodies | null = null;
  private plans = new Map<string, Planned | null>();
  private contexts = new Map<string, Readonly<ZoneDef>>();
  private planning={coldQueries:0,accepted:0,rejected:0,totalMs:0,maxMs:0,maxExpanded:0,maxTerrainSamples:0,maxPlaceMs:0,maxStandMs:0,maxRouteMs:0};
  private preparedOwners=new Set<string>();
  private preparing={adopted:0,accepted:0,refused:0,late:0,stale:0,used:0,synchronous:0,sourceNegatives:0,validationSteps:0,maxValidationSliceMs:0,lastAdopted:[] as string[],lastUsed:[] as string[]};
  private nextPrepare=0;private prepareFrom:MassAddress|undefined;private disposed=false;
  private validation:{input:Readonly<GeographicPlanInput>;preparation:GeographicPreparation;steps:Generator<void,Readonly<GeographicPlan>|null>}|null=null;
  private accessIndices=new Map<string,GeographicAccessIndex>();
  constructor(readonly mass: WorldMassRuntime, readonly spec: MassGeographicSpec, saved?: MassHierarchySave, warm?:GeographicPlanWarmQueue|null) {
    if (!mass.nativeCountry || !Number.isSafeInteger(spec.maxObjectives) || spec.maxObjectives < 1 || spec.maxObjectives > 32
      || !Array.isArray(spec.pyres) || spec.pyres.some(p => !p.id || !p.source || !p.tileset || !Number.isFinite(p.weight)
        || p.weight <= 0 || !Number.isFinite(p.totalWeight) || p.totalWeight < p.weight || p.objective.kind !== 'pyres')
      || spec.holds!==undefined&&(!Array.isArray(spec.holds)||spec.holds.some(p=>!p.id||!p.source||!p.tileset||!Number.isFinite(p.weight)
        ||p.weight<=0||!Number.isFinite(p.totalWeight)||p.totalWeight<p.weight||!isNativeMassHoldKind(p.objective.kind))))
      throw Error('Invalid geographic gameplay policy');
    const zoneSpan = spec.policy.chunkSpan * spec.policy.chunksPerZone;
    if (zoneSpan !== mass.nativeCountry.spec.spacing || zoneSpan * spec.policy.zonesPerRegion !== mass.nativeCountry.spec.regionSpan)
      throw Error('Native country and geographic ownership disagree');
    this.hierarchy = new MassHierarchy(mass.generator.run.runId, mass.generator.run.seed, mass.config.terrain.addressSpan,
      spec.policy, nativeHierarchySources(mass.nativeCountry.spec, zoneSpan), saved,
      owner => mass.nativeCountry!.nativeContextAt(owner.center).tileset);
    this.objectives = new MassObjectives(this.hierarchy, spec.maxObjectives);
    for(const row of this.hierarchy.controllers()){
      const access=row.controllers.find(c=>c.id==='objective-access');
      const born=row.controllers.find(c=>['pyres','rifts','unearth','beacon'].some(k=>c.id==='objective:'+k));
      if(born&&!access){
        const legacy=this.legacyPlan(row.owner,born.definition);
        this.hierarchy.enroll(row.owner,'objective-access-legacy','worldmass/legacy-unverified-access',
          {status:'legacy-unverified-access',objective:born.id,definitionHash:born.definitionHash},null,born.updatedAt);
        this.plans.set(row.owner.id,legacy);
        if(this.plans.size>256)this.plans.delete(this.plans.keys().next().value!);
      }
      if(access)this.savedPlan(row.owner,access.definition);
    }
    this.intel=new MassPhysicalIntel(this.hierarchy);
    for(const row of this.hierarchy.controllers()){
      const beacon=row.controllers.find(c=>c.id==='objective:beacon');
      if(beacon&&(!this.intel.manifest(row.owner.id)||beacon.phase==='complete'&&this.hierarchy.status(row.owner.id,'beacon-survey')?.phase!=='complete'))
        throw Error('Native beacon lost its physical discovery manifest');
    }
    // No worker exists until every saved owner/source has passed validation.
    // An explicitly supplied queue stays caller-owned if construction refuses.
    this.caravans=new MassProcessionGameplay(mass,this.hierarchy,spec.processions??[],owner=>this.selection(owner));
    try{this.warm=warm===undefined?createGeographicPlanWarmQueue():warm;}
    catch(error){this.caravans.dispose();throw error;}
  }
  private nearby(at:MassAddress):{x:number;y:number}|undefined{
    const dx=BigInt(at.cx)-BigInt(this.mass.origin.cx),dy=BigInt(at.cy)-BigInt(this.mass.origin.cy);
    if(at.dimension!==this.mass.origin.dimension||dx < -4096n||dx>4096n||dy < -4096n||dy>4096n)return;
    return this.local(at);
  }
  private savedPlan(owner:Readonly<MassGeography>,raw:unknown):Planned{
    const data=raw as Omit<Planned,'owner'>;
    if(!data?.context?.source||data.context.zone.id!==owner.id||!isNativeMassHoldKind(data.context.zone.objective.kind)
      ||!Array.isArray(data.positions)||!data.access||canonical(data.access.center)!==canonical(owner.center))throw Error('Invalid saved geographic access owner');
    validateGeographicAccess(data.access,this.mass.config.terrain.addressSpan);
    const stands=data.chestPosition?[...data.positions,data.chestPosition]:data.positions;
    if(data.positions.length!==this.objectives.count(owner,data.context)
      ||!!data.chestPosition!==this.objectives.chestWanted(owner,data.context)
      ||canonical(stands)!==canonical(data.access.targets.map(t=>t.at)))throw Error('Saved geographic access lost an objective stand');
    const kind=data.context.zone.objective.kind,fixtureRadius=this.objectives.fixtureRadius(owner,data.context);
    if(data.access.targets.some((t,i)=>t.radius!==(i<data.positions.length?fixtureRadius:24)))throw Error('Saved geographic access changed fixture clearance');
    const born=this.hierarchy.controller(owner.id,'objective:'+kind);
    if(born){const historical=this.legacyPlan(owner,born.definition);
      if(canonical(historical.context)!==canonical(data.context)||canonical(historical.positions)!==canonical(data.positions)
        ||canonical(historical.chestPosition??null)!==canonical(data.chestPosition??null))throw Error('Saved access differs from frozen native objective');}
    return{owner,...data};
  }
  private legacyPlan(owner:Readonly<MassGeography>,raw:unknown):Planned{
    // MassObjectives already validates the exact native definition/state. Do not
    // reroll historical stands, chest lottery, level or authored source.
    const data=raw as {source:string;zone:ZoneDef;recipe?:NativeMassHoldSource;positions:MassAddress[];reward?:{position:MassAddress|null}};
    return {owner,context:freezeData({source:data.source,zone:data.zone,...(data.recipe?{recipe:data.recipe}:{})}),
      positions:data.positions,...(data.reward?.position?{chestPosition:data.reward.position}:{}),legacyAccess:'legacy-unverified-access'};
  }
  get accessStats(){return {...this.planning,cachedPlans:this.plans.size,legacyUnverified:this.hierarchy.controllers().filter(r=>r.controllers.some(c=>c.id==='objective-access-legacy')).length};}
  private local(at: MassAddress): {x:number;y:number} { return localOffset(at, {...this.mass.origin,x:0,y:0}, this.mass.config.terrain.addressSpan); }
  contextAt(at: MassAddress): Readonly<ZoneDef> | undefined {
    const owner=this.hierarchy.at(at).zone, cached=this.contexts.get(owner.id);
    if(cached)return cached;
    const zone=owner.native?.zone;if(!zone)return;
    const climate=this.mass.nativeCountry!.nativeContextAt(owner.center).climate;
    const context=freezeData({...zone,...(climate?{geo:{...zone.geo,climate}}:{})});
    this.contexts.set(owner.id,context);
    if(this.contexts.size>256)this.contexts.delete(this.contexts.keys().next().value!);
    return context;
  }
  private cachePlan(owner:Readonly<MassGeography>,value:Planned|null):Planned|null{
    this.plans.set(owner.id,value);
    if(value?.access)this.accessIndices.set(owner.id,new GeographicAccessIndex(value.access,this.mass.config.terrain.addressSpan));
    if(this.plans.size>256){const first=this.plans.keys().next().value!;this.plans.delete(first);this.accessIndices.delete(first);this.preparedOwners.delete(first);}
    return value;
  }
  private metrics(m:GeographicPlanMetrics):void{
    this.planning.maxPlaceMs=Math.max(this.planning.maxPlaceMs,m.placeMs);this.planning.maxStandMs=Math.max(this.planning.maxStandMs,m.standMs);
    this.planning.maxRouteMs=Math.max(this.planning.maxRouteMs,m.routeMs);this.planning.maxExpanded=Math.max(this.planning.maxExpanded,m.expanded);this.planning.maxTerrainSamples=Math.max(this.planning.maxTerrainSamples,m.samples);
  }
  /** Saved runs without the new family retain their former ordering/draws. */
  private selection(owner:Readonly<MassGeography>):readonly NativeGeographicObjectiveSource[]{
    const tileset=owner.native?.zone?.tileset;
    const holds=(this.spec.holds??this.spec.pyres).filter(p=>p.source==='data/tilesets'&&p.tileset===tileset);
    if(this.spec.processions===undefined)return holds;
    return [...holds,...this.spec.processions.filter(p=>p.source==='data/tilesets'&&p.tileset===tileset)].sort((a,b)=>a.id.localeCompare(b.id));
  }
  /** Cheap input capture only: never reads generated place pages or terrain. */
  private request(owner:Readonly<MassGeography>):Readonly<GeographicPlanInput>|null{
    const zone=owner.native?.zone;if(!zone)return null;
    if(this.hierarchy.controller(owner.id,'procession-access')||this.caravans?.processions.has(owner.id))return null;
    const rows=this.selection(owner),source=chooseNativeGeographicObjective(this.mass.generator.run.seed,owner.id,rows);
    if(!source||source.objective.kind==='procession')return null;
    const center=this.nearby(owner.center),context=resolveMassHoldContext({...zone,id:owner.id},source as NativeMassHoldSource,center?this.mass.levelAt(center):this.mass.config.progression?.maxLevel??zone.level,massRandom(this.mass.generator.run.seed,[owner.id,'native-beacon/resolve']));
    const reservations:GeographicReservations={circles:[],trails:[]},halfSpan=Math.floor(Math.min(MASS_ACCESS_POLICY.halfSpan,owner.span/2-180)/30)*30;
    if(center){
      const town=this.mass.settlement;if(town)reservations.town={minX:-center.x,minY:-center.y,maxX:town.zone.size.w-center.x,maxY:town.zone.size.h-center.y,padding:town.spec.apron+town.spec.blend};
      for(const place of this.mass.journey?.places??[]){const q=this.mass.journey!.local(place);reservations.circles.push({x:q.x-center.x,y:q.y-center.y,radius:place.radius+60});}
      for(const place of this.mass.roadside?.places??[]){const q=this.mass.roadside!.local(place);reservations.circles.push({x:q.x-center.x,y:q.y-center.y,radius:place.radius});}
      for(const trail of this.mass.journey?.trails??[])for(let i=1;i<trail.points.length;i++){
        const a={x:trail.points[i-1].x-center.x,y:trail.points[i-1].y-center.y},b={x:trail.points[i].x-center.x,y:trail.points[i].y-center.y};
        const radius=this.mass.journey!.spec.width/2+30,pad=halfSpan+150+radius;
        if(Math.min(a.x,b.x)>pad||Math.max(a.x,b.x)<-pad||Math.min(a.y,b.y)>pad||Math.max(a.y,b.y)<-pad)continue;
        reservations.trails.push({a,b,radius});
      }
    }
    reservations.circles=reservations.circles.filter(b=>Math.abs(b.x)<=halfSpan+150+b.radius&&Math.abs(b.y)<=halfSpan+150+b.radius);
    const terrain=this.mass.generator.spec,regions:GeographicPlanInput['regions']={};
    for(const id of new Set([...terrain.surfaces.map(s=>s.region),...terrain.places.flatMap(p=>p.surface?[p.surface.region]:[])])){
      const r=regionKind(id);regions[id]={walkable:!!r?.walkable,dry:!!r?.walkable&&!r.standStatusDeep&&!['water','lava','chasm','bog','swamp'].includes(id)};
    }
    const input:GeographicPlanInput={compiler:GEOGRAPHIC_PLAN_COMPILER,policy:MASS_ACCESS_POLICY,run:this.mass.generator.run,terrain,owner,context,selection:rows,
      fixtureCount:this.objectives.count(owner,context),chestWanted:this.objectives.chestWanted(owner,context),
      fixtureRadius:this.objectives.fixtureRadius(owner,context),regions,reservations};
    return freezeData(JSON.parse(canonical(input)) as GeographicPlanInput);
  }
  preparationInput(at:MassAddress):Readonly<GeographicPlanInput>|null{return this.request(this.hierarchy.at(at).zone);}
  /** Always compare against the current owner's expected frozen source input,
   * never a digest supplied by the worker itself. Born work wins every race. */
  private preparedStatus(input:Readonly<GeographicPlanInput>,checkSource=true):'existing'|'stale'|'disposed'|undefined{
    if(this.disposed)return 'disposed';
    const owner=this.hierarchy.at(input.owner.center).zone;
    if(this.plans.has(owner.id)||this.hierarchy.controller(owner.id,'objective-access')||this.objectives.has(owner.id)){this.preparing.late++;return 'existing';}
    if(checkSource){const expected=this.request(owner);if(!expected||canonical(expected)!==canonical(input)){this.preparing.stale++;return 'stale';}}
  }
  private publishPrepared(input:Readonly<GeographicPlanInput>,plan:Readonly<GeographicPlan>|null):void{
    this.cachePlan(input.owner,plan);this.preparedOwners.add(input.owner.id);
    this.preparing.adopted++;this.preparing[plan?'accepted':'refused']++;this.preparing.lastAdopted.push(input.owner.id);if(this.preparing.lastAdopted.length>16)this.preparing.lastAdopted.shift();
  }
  adoptPrepared(input:Readonly<GeographicPlanInput>,preparation:GeographicPreparation):'adopted'|'existing'|'stale'|'disposed'{
    const status=this.preparedStatus(input);if(status)return status;
    const plan=validateGeographicPreparation(input,preparation,this.mass.generator);this.publishPrepared(input,plan);return 'adopted';
  }
  /** At most one proof is being checked, and at most 64 bounded samples are
   * advanced per tick. The time limit is soft by one place page/sample; record
   * the actual maximum rather than promising that page generation is free. */
  private advancePreparation():void{
    if(!this.warm)return;
    const start=performance.now();
    try{
      if(!this.validation){const ready=this.warm.takeReady();if(ready&&!this.preparedStatus(ready.input))this.validation={...ready,steps:validateGeographicPreparationSteps(ready.input,ready.preparation,this.mass.generator)};}
      const pending=this.validation;if(!pending)return;
      if(this.preparedStatus(pending.input,false)){this.validation=null;return;}
      for(let i=0;i<64;i++){
        const next=pending.steps.next();this.preparing.validationSteps++;
        if(next.done){if(!this.preparedStatus(pending.input))this.publishPrepared(pending.input,next.value);this.validation=null;break;}
        if(performance.now()-start>=2)break;
      }
    }catch(error){this.validation=null;this.warm.fail(String(error instanceof Error?error.message:error));}
    finally{this.preparing.maxValidationSliceMs=Math.max(this.preparing.maxValidationSliceMs,performance.now()-start);}
  }
  /** Call BEFORE nativeCountry.near. Hierarchy queries do not invoke country
   * placement/reservations, so this can get ahead without forcing cold plans. */
  prepare(at:MassAddress,now:number):void{
    if(this.disposed)return;
    this.caravans.prepare(at,now);
    if(!this.warm||this.warm.stats.disposed)return;
    if(!Number.isFinite(now)||now<0)throw Error('Invalid geographic preparation clock');
    this.advancePreparation();if(this.warm.stats.disposed)return;
    if(now<this.nextPrepare)return;this.nextPrepare=now+.5;
    let dx=0,dy=0;const old=this.prepareFrom;this.prepareFrom={...at};
    if(old&&old.dimension===at.dimension&&BigInt(at.cx)-BigInt(old.cx)>-64n&&BigInt(at.cx)-BigInt(old.cx)<64n&&BigInt(at.cy)-BigInt(old.cy)>-64n&&BigInt(at.cy)-BigInt(old.cy)<64n){const d=localOffset(at,old,this.mass.config.terrain.addressSpan,64);dx=d.x;dy=d.y;}
    const distance=Math.hypot(dx,dy),span=this.mass.config.terrain.addressSpan,zoneSpan=this.hierarchy.span('zone');
    const ahead=moveAddress(at,{x:distance>1?dx/distance*zoneSpan:0,y:distance>1?dy/distance*zoneSpan:0},span),middle=this.hierarchy.at(ahead).zone;
    const lower=moveAddress(middle.origin,{x:-zoneSpan*2,y:-zoneSpan*2},span);
    const owners=[...this.hierarchy.intersections('zone',massAddressBounds(lower,zoneSpan*5,zoneSpan*5,span))];
    owners.sort((a,b)=>{const aa=localOffset(a.center,ahead,span,64),bb=localOffset(b.center,ahead,span,64);return aa.x*aa.x+aa.y*aa.y-bb.x*bb.x-bb.y*bb.y||a.id.localeCompare(b.id);});
    const requests:Readonly<GeographicPlanInput>[]=[];
    for(const owner of owners){
      if(this.validation?.input.owner.id===owner.id||this.plans.has(owner.id)||this.hierarchy.controller(owner.id,'objective-access')||this.objectives.has(owner.id))continue;
      const request=this.request(owner);
      if(request)requests.push(request);else{this.cachePlan(owner,null);this.preparing.sourceNegatives++;}
    }
    // Survey work is prepared before its physical spire publishes. The same
    // worker and validator serve its real future destinations; no final-flare mint.
    const intelRequests:Readonly<GeographicPlanInput>[]=[];
    for(const work of this.intelWork.values())for(const owner of work.owners.slice(work.cursor)){
      if(intelRequests.length>=32)break;
      if(this.plans.has(owner.id)||this.hierarchy.controller(owner.id,'objective-access')||this.validation?.input.owner.id===owner.id)continue;
      const input=this.request(owner);if(input)intelRequests.push(input);else this.cachePlan(owner,null);
    }
    this.warm.offer([...intelRequests,...requests].slice(0,64));
  }
  dispose():void{if(this.disposed)return;this.disposed=true;this.validation=null;this.warm?.dispose();this.caravans.dispose();}
  get warmStats(){return {...this.preparing,queue:this.warm?.stats??null,validating:this.validation?.input.owner.id??null,disposed:this.disposed};}
  /** Cold/teleport queries use the identical kernel synchronously. No pending
   * result can temporarily clear a route or shift an existing born owner. */
  private plan(owner:Readonly<MassGeography>):Planned|null{
    const old=this.plans.get(owner.id);
    if(old!==undefined){if(this.preparedOwners.delete(owner.id)){this.preparing.used++;this.preparing.lastUsed.push(owner.id);if(this.preparing.lastUsed.length>16)this.preparing.lastUsed.shift();}return old;}
    const start=performance.now();
    const remember=(value:Planned|null)=>{const elapsed=performance.now()-start;this.planning.coldQueries++;this.planning.totalMs+=elapsed;this.planning.maxMs=Math.max(this.planning.maxMs,elapsed);this.planning[value?'accepted':'rejected']++;return this.cachePlan(owner,value);};
    const saved=this.hierarchy.controller(owner.id,'objective-access');if(saved)return remember(this.savedPlan(owner,saved.definition));
    for(const kind of ['pyres','rifts','unearth','beacon']){const born=this.hierarchy.controller(owner.id,'objective:'+kind);if(born)return remember(this.legacyPlan(owner,born.definition));}
    const input=this.request(owner);if(!input)return remember(null);
    this.preparing.synchronous++;const result=compileGeographicPlan(input,this.mass.generator);this.metrics(result.metrics);return remember(result.plan);
  }
  reserves(at: MassAddress, radius: number): boolean {
    if(at.dimension!==this.mass.origin.dimension)return false;
    if(this.caravans?.reserves(at,radius))return true;
    const span=this.mass.config.terrain.addressSpan, pad=Math.ceil(radius+150);
    const lower=moveAddress(at,{x:-pad,y:-pad},span);
    for(const owner of this.hierarchy.intersections('zone',massAddressBounds(lower,pad*2+1,pad*2+1,span))){
      const plan=this.plan(owner); if(!plan)continue;
      if(this.stands(plan).some(p=>{const d=localOffset(p,at,span);return Math.hypot(d.x,d.y)<=radius+100;})
        ||this.accessIndices.get(owner.id)?.intersects(at,radius))return true;
    }
    return false;
  }
  private stands(plan:Planned):MassAddress[]{return plan.chestPosition?[...plan.positions,plan.chestPosition]:plan.positions;}
  get population():number{return (this.bodies?.population??0)+(this.caravans?.population??0);}
  reservedPopulation(except?:string):number{return this.caravans?.reservedPopulation(except)??0;}
  restoreProcessions(world:World):void{this.caravans.sync(world);}
  /** Saved bodies and funded controllers precede optional feature admissions.
   * This calls the native managers' existing-owner restore paths only. */
  restoreResidentOwners(world:World):void {
    this.restoreProcessions(world);
    const at=this.mass.walk.at(world.player.pos.x,world.player.pos.y),span=this.mass.config.terrain.addressSpan;
    const lower=moveAddress(at,{x:-2400,y:-2400},span);
    this.objectives.sync(this.hierarchy.intersections('zone',massAddressBounds(lower,4800,4800,span)),this.host(world),p=>this.local(p));
  }
  chestReady(chest:Chest):boolean{return this.caravans.processions.chestContext(chest)!==undefined?this.caravans.processions.chestReady(chest):this.objectives.chestReady(chest);}
  chestContext(chest:Chest):Readonly<ZoneDef>|undefined{return this.caravans.processions.chestContext(chest)??this.objectives.chestContext(chest);}
  chestOpened(chest:Chest,now:number):void{if(this.caravans.processions.chestContext(chest))this.caravans.processions.chestOpened(chest,now);else this.objectives.chestOpened(chest,now);}
  private host(world:World):MassObjectiveHost {
    this.bodies??=new MassObjectiveBodies(world,this.mass.generator.run.seed,{population:()=>this.mass.population,
      maxPopulation:()=>this.mass.population+this.mass.availablePopulation(),retainRadius:2400,quietSeconds:12});
    return this.snapshotHost={get now(){return world.time;},hold:world.massHoldHost(false),
      installPyres:(owner,fixtures)=>world.installMassPyres(owner,fixtures),
      installHolds:(owner,kind,fixtures)=>world.installMassHolds(owner,kind,fixtures),
      installEffects:(owner,zone,fixtures,saved)=>this.bodies!.install(owner,zone,fixtures,saved),
      installChest:(owner,chest)=>world.installMassObjectiveChest(owner,chest),canRetire:(fixtures,owned)=>world.canRetireMassPyres(fixtures,owned),
      complete:(owner,zone,label)=>world.completeMassObjective(owner,zone,label),reveal:(owner,_zone,now)=>{this.intel.reveal(owner,now);}};
  }
  sync(world:World):void {
    const mass=this.mass,at=mass.walk.at(world.player.pos.x,world.player.pos.y),span=mass.config.terrain.addressSpan;
    const radius=2400,lower=moveAddress(at,{x:-radius,y:-radius},span);
    const owners=this.hierarchy.intersections('zone',massAddressBounds(lower,radius*2,radius*2,span));
    const host=this.host(world);this.objectives.sync(owners,host,p=>this.local(p));
    for(const owner of owners){
      const plan=this.plan(owner);if(!plan?.access)continue;
      if(this.hierarchy.controller(owner.id,'objective:'+plan.context.zone.objective.kind))continue;
      if(this.intelWork.has(owner.id)&&!this.intel.manifest(owner.id))continue;
      // Reaching any original fixture activates the whole operation. Render
      // page residency is not physics authority: cold native queries validate
      // every stand, chest and connecting path before atomic publication.
      if(!plan.positions.some(p=>{const q=this.nearby(p);return !!q&&Math.hypot(q.x-world.player.pos.x,q.y-world.player.pos.y)<=mass.config.pageRadius*span-160;}))continue;
      const check=this.checkIntelAccess(plan as GeographicPlan,world);
      let verified=check.next();while(!verified.done)verified=check.next();
      if(!verified.value)continue;
      const {owner:_owner,...definition}=plan;
      this.hierarchy.enroll(owner,'objective-access','worldmass/geographic-access-v1',definition,null,world.time);
      if(plan.context.zone.objective.kind==='beacon'&&!this.intel.manifest(owner.id)){
        if(!this.intelWork.has(owner.id)&&this.intelWork.size<2){
          const policy=this.intel.policy(owner,plan.context.zone);
          this.intelWork.set(owner.id,{plan:plan as GeographicPlan,policy,owners:this.intel.candidates(owner,policy),cursor:0,targets:[]});
          this.nextPrepare=0;
        }
        continue;
      }
      this.objectives.admit(owner,plan.positions,host,p=>this.local(p),plan.context,plan.chestPosition);
    }
  }
  /** Verify a complete operation against exact native terrain/scenery without
   * installing fixtures, actors or knowledge. Each yield bounds one route sample. */
  private *checkIntelAccess(plan:Readonly<GeographicPlan>,world:World):Generator<void,boolean>{
    const span=this.mass.config.terrain.addressSpan,fixtureRadius=this.objectives.fixtureRadius(plan.owner,plan.context),kind=plan.context.zone.objective.kind;
    if(!isNativeMassHoldKind(kind))return false;
    for(const [i,at] of this.stands(plan).entries()){
      const p=this.nearby(at);if(!p||!this.mass.walk.isWalkable(p.x,p.y)||world.pointInSolid(p.x,p.y,(i<plan.positions.length?fixtureRadius:24)+12))return false;
      if(i<plan.positions.length&&(!world.massObjectiveStandClear(p,kind)||this.mass.nativeFeatures?.intersects(at,world.massObjectivePortalClear(kind))))return false;
      yield;
    }
    const half=plan.access.halfSpan,side=half/30*2+1,point=(i:number)=>({x:i%side*30-half,y:Math.floor(i/side)*30-half});
    for(const path of plan.access.paths)for(let n=0;n<path.length;n++){
      const a=point(path[Math.max(0,n-1)]),b=point(path[n]);
      for(const t of [.25,.5,.75,1]){
        const q=this.local(moveAddress(plan.owner.center,{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},span));
        if(!discTerrainClear(q,MASS_ACCESS_POLICY.bodyRadius,this.mass.walk.cellSize,p=>{
          const id=this.mass.walk.regionAt(p.x,p.y),kind=regionKind(id);
          return !!kind?.walkable&&!kind.standStatusDeep&&!['water','lava','chasm','bog','swamp'].includes(id);
        })||world.pointInSolid(q.x,q.y,MASS_ACCESS_POLICY.bodyRadius))return false;
        yield;
      }
    }
    return true;
  }
  private advanceIntel(world:World):void{
    const work=this.intelWork.values().next().value;if(!work)return;
    const started=performance.now();
    for(let steps=0;steps<64;steps++){
      if(work.check){
        const result=work.check.next();this.intelMetrics.checks++;
        if(result.done){if(result.value)work.targets.push(this.intel.reserve(work.target!,world.time));work.check=undefined;work.target=undefined;work.cursor++;}
      }else if(work.cursor>=work.owners.length){
        this.intel.finish(work.plan.owner,work.policy,work.targets,world.time);this.intelWork.delete(work.plan.owner.id);this.intelMetrics.prepared++;break;
      }else{
        const owner=work.owners[work.cursor];
        // Unrequested distant owners stay cold until their background result.
        if(!this.plans.has(owner.id)&&!this.hierarchy.controller(owner.id,'objective-access')&&this.warm&&!this.warm.stats.disposed)break;
        const plan=this.plan(owner);
        if(!plan?.access||plan.context.zone.objective.kind==='beacon'){work.cursor++;}
        else{work.target=plan as GeographicPlan;work.check=this.checkIntelAccess(work.target,world);}
      }
      if(performance.now()-started>=2)break;
    }
    this.intelMetrics.maxSliceMs=Math.max(this.intelMetrics.maxSliceMs,performance.now()-started);
  }
  get intelPreparationStats(){return {...this.intelMetrics,pending:this.intelWork.size,cursor:this.intelWork.values().next().value?.cursor??0};}
  update(world:World,dt:number):void {
    this.advanceIntel(world);this.objectives.update(dt,this.host(world));this.caravans.update(world,dt);
    if(world.player.dead||world.player.tier!==0)return;
    // Footsteps require a mounted destination in real sight, never a map reveal.
    for(const view of this.objectives.views(world.player.pos)){
      if(this.intel.visited(view.owner)||Math.hypot(view.pos.x-world.player.pos.x,view.pos.y-world.player.pos.y)>180)continue;
      if(view.kind==='beacon'||!world.lineOfSight(world.player.pos,view.pos,0))continue;
      if(!this.intel.reserved(view.owner)){
        const owner=this.hierarchy.owner(view.owner),access=this.hierarchy.controller(view.owner,'objective-access');
        // Old unverified-access owners are never catalogue candidates. Current
        // physical arrivals retain boots even before any beacon surveys them.
        if(!owner||!access)continue;
        this.intel.reserve(this.savedPlan(owner,access.definition) as GeographicPlan,world.time);
      }
      this.intel.observe(view.owner,world.time);
    }
  }
  snapshot():MassHierarchySave{this.caravans.capture();if(this.snapshotHost)this.objectives.captureEffects(this.snapshotHost);return this.hierarchy.snapshot();}
  /** Pure generated targets for diagnostics and physical planning. */
  plannedAt(at:MassAddress):Readonly<Planned>|null{return this.plan(this.hierarchy.at(at).zone);}
  processionPlannedAt(at:MassAddress){return this.caravans.plannedAt(at);}
}
