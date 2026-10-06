import type { World } from '../engine/world';
import { regionKind } from '../world/regions';
import type { ZoneDef } from '../data/zones';
import { segmentDistance } from './journey';
import { PYRE_CFG } from '../data/pyres';
import { localOffset, moveAddress, type MassAddress } from './address';
import { discTerrainClear, GeographicAccessIndex, MASS_ACCESS_POLICY, planGeographicAccess, validateGeographicAccess, type MassAccessProof } from './geographicAccess';
import { MassHierarchy, massAddressBounds, nativeHierarchySources, type MassGeography, type MassHierarchyPolicy, type MassHierarchySave } from './hierarchy';
import { MassObjectiveBodies } from './objectiveBodies';
import { RIFT_CFG } from '../data/rifts';
import { DIG_CFG } from '../data/digsites';
import { MassObjectives, resolveMassHoldContext, isNativeMassHoldKind, type MassObjectiveHost, type MassHoldContext, type NativeMassHoldSource, type NativeMassPyreSource } from './objectives';
import { canonical, freezeData, massRandom } from './random';
import type { WorldMassRuntime } from './runtime';

export interface MassGeographicSpec { policy: MassHierarchyPolicy; pyres: NativeMassPyreSource[]; holds?: NativeMassHoldSource[]; maxObjectives: number; weather?: import('./weather').MassWeatherPolicy; snow?: import('./snow').MassSnowPolicy; storms?: boolean }
interface Planned { owner: Readonly<MassGeography>; context: Readonly<MassHoldContext>; positions: MassAddress[]; chestPosition?: MassAddress; access?:Readonly<MassAccessProof>; legacyAccess?:'legacy-unverified-access' }
/** Geographic ownership persists independently from renderer pages. Native
 * objectives mount only their own real fixtures, preserving neighboring work. */
export class MassGeographicGameplay {
  readonly hierarchy: MassHierarchy;
  readonly objectives: MassObjectives;
  private snapshotHost: MassObjectiveHost | null = null;
  private bodies: MassObjectiveBodies | null = null;
  private plans = new Map<string, Planned | null>();
  private contexts = new Map<string, Readonly<ZoneDef>>();
  private planning={coldQueries:0,accepted:0,rejected:0,totalMs:0,maxMs:0,maxExpanded:0,maxTerrainSamples:0,maxPlaceMs:0,maxStandMs:0,maxRouteMs:0};
  private accessIndices=new Map<string,GeographicAccessIndex>();
  constructor(readonly mass: WorldMassRuntime, readonly spec: MassGeographicSpec, saved?: MassHierarchySave) {
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
      const born=row.controllers.find(c=>['pyres','rifts','unearth'].some(k=>c.id==='objective:'+k));
      if(born&&!access){
        const legacy=this.legacyPlan(row.owner,born.definition);
        this.hierarchy.enroll(row.owner,'objective-access-legacy','worldmass/legacy-unverified-access',
          {status:'legacy-unverified-access',objective:born.id,definitionHash:born.definitionHash},null,born.updatedAt);
        this.plans.set(row.owner.id,legacy);
        if(this.plans.size>256)this.plans.delete(this.plans.keys().next().value!);
      }
      if(access)this.savedPlan(row.owner,access.definition);
    }
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
    const kind=data.context.zone.objective.kind,fixtureRadius=kind==='rifts'?RIFT_CFG.radius:kind==='unearth'?DIG_CFG.radius:PYRE_CFG.radius;
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
  /** The same saved weighted row main uses: unsupported objective rolls do not
   * silently become pyres. Authored quest/campaign objectives never enter here. */
  private plan(owner: Readonly<MassGeography>): Planned | null {
    const old = this.plans.get(owner.id); if (old !== undefined) return old;
    const started=performance.now();
    const remember = (value: Planned | null) => {
      const elapsed=performance.now()-started;this.planning.coldQueries++;this.planning.totalMs+=elapsed;this.planning.maxMs=Math.max(this.planning.maxMs,elapsed);this.planning[value?'accepted':'rejected']++;
      this.plans.set(owner.id,value);
      if(value?.access)this.accessIndices.set(owner.id,new GeographicAccessIndex(value.access,this.mass.config.terrain.addressSpan));
      if(this.plans.size>256){const first=this.plans.keys().next().value!;this.plans.delete(first);this.accessIndices.delete(first);}return value;
    };
    const saved=this.hierarchy.controller(owner.id,'objective-access');if(saved)return remember(this.savedPlan(owner,saved.definition));
    for(const kind of ['pyres','rifts','unearth']){const born=this.hierarchy.controller(owner.id,'objective:'+kind);if(born)return remember(this.legacyPlan(owner,born.definition));}
    const zone = owner.native?.zone; if (!zone) return remember(null);
    const rows = (this.spec.holds??this.spec.pyres).filter(p => p.source === 'data/tilesets' && p.tileset === zone.tileset);
    const rng = massRandom(this.mass.generator.run.seed, [owner.id, 'native-objective']);
    if (!rows.length || !rng.chance(rows.reduce((n,p)=>n+p.weight,0)/rows[0].totalWeight)) return remember(null);
    const source = rng.weighted(rows), center = this.nearby(owner.center);
    const context = resolveMassHoldContext({...zone,id:owner.id}, source, center?this.mass.levelAt(center):this.mass.config.progression?.maxLevel??zone.level);
    const pyreCount = this.objectives.count(owner, context), count=pyreCount+(this.objectives.chestWanted(owner,context)?1:0), positions:MassAddress[] = [];
    const halfSpan=Math.floor(Math.min(MASS_ACCESS_POLICY.halfSpan,owner.span/2-180)/30)*30;
    const radius=Math.min(960,halfSpan-180),span=this.mass.config.terrain.addressSpan;
    // Reserve against immutable planned country sites, including footprints
    // straddling address-cell boundaries. Native country cannot be queried here.
    const placeStarted=performance.now();
    const placeBodies=new Map<string,{x:number;y:number;radius:number}>();
    const lo=moveAddress(owner.center,{x:-halfSpan-150,y:-halfSpan-150},span),hi=moveAddress(owner.center,{x:halfSpan+150,y:halfSpan+150},span);
    if((BigInt(hi.cx)-BigInt(lo.cx)+1n)*(BigInt(hi.cy)-BigInt(lo.cy)+1n)>64n)return remember(null);
    for(let y=BigInt(lo.cy);y<=BigInt(hi.cy);y++)for(let x=BigInt(lo.cx);x<=BigInt(hi.cx);x++)
      for(const place of this.mass.generator.placesInCell({dimension:owner.dimension,cx:x.toString(),cy:y.toString()})){
        const q=localOffset(place.center,owner.center,span,64);placeBodies.set(place.id,{...q,radius:place.radius});
      }
    if(placeBodies.size>4096)return remember(null);
    this.planning.maxPlaceMs=Math.max(this.planning.maxPlaceMs,performance.now()-placeStarted);
    const standStarted=performance.now();
    const reservations=[...placeBodies.values()];
    // Freeze the finite town/trail/roadside shapes into the owner's small local
    // frame once. A* must not convert every remote place address on every edge.
    const trails:{a:{x:number;y:number};b:{x:number;y:number};radius:number}[]=[];
    if(center){
      for(const place of this.mass.journey?.places??[]){const q=this.mass.journey!.local(place);reservations.push({x:q.x-center.x,y:q.y-center.y,radius:place.radius+60});}
      for(const place of this.mass.roadside?.places??[]){const q=this.mass.roadside!.local(place);reservations.push({x:q.x-center.x,y:q.y-center.y,radius:place.radius});}
      for(const trail of this.mass.journey?.trails??[])for(let i=1;i<trail.points.length;i++){
        const a={x:trail.points[i-1].x-center.x,y:trail.points[i-1].y-center.y},b={x:trail.points[i].x-center.x,y:trail.points[i].y-center.y};
        const r=this.mass.journey!.spec.width/2+30,pad=halfSpan+150+r;
        if(Math.min(a.x,b.x)>pad||Math.max(a.x,b.x)<-pad||Math.min(a.y,b.y)>pad||Math.max(a.y,b.y)<-pad)continue;
        trails.push({a,b,radius:r});
      }
    }
    const nearBodies=reservations.filter(b=>Math.abs(b.x)<=halfSpan+150+b.radius&&Math.abs(b.y)<=halfSpan+150+b.radius);
    const independentReserve=(at:MassAddress,r:number):boolean=>{
      const q=localOffset(at,owner.center,span,16);
      if(center&&this.mass.settlement?.reserves(center.x+q.x,center.y+q.y,r))return true;
      return nearBodies.some(b=>(q.x-b.x)**2+(q.y-b.y)**2<(r+b.radius)**2)||trails.some(t=>segmentDistance(q,t.a,t.b)<t.radius+r);
    };
    // Pure planned stands reserve their own clearances before native structures
    // or ecology are born. No actor position or arrival order participates.
    for (let attempt=0; attempt<96 && positions.length<count; attempt++) {
      const angle=rng.range(0,Math.PI*2), reach=Math.sqrt(rng.next())*radius;
      const at=moveAddress(owner.center,{x:Math.round(Math.cos(angle)*reach/30)*30,y:Math.round(Math.sin(angle)*reach/30)*30},this.mass.config.terrain.addressSpan);
      if(independentReserve(at,150))continue;
      if(positions.some(q=>{const d=localOffset(q,at,this.mass.config.terrain.addressSpan);return Math.hypot(d.x,d.y)<300;}))continue;
      const terrain=this.mass.generator.terrainAt(at),rule=regionKind(terrain.region);
      if(!rule?.walkable||['water','lava','chasm','bog','swamp'].includes(terrain.region))continue;
      let clear=true;
      for(let i=0;i<12;i++){
        const q=moveAddress(at,{x:Math.cos(i*Math.PI/6)*80,y:Math.sin(i*Math.PI/6)*80},this.mass.config.terrain.addressSpan);
        const kind=this.mass.generator.terrainAt(q).region;
        if(!regionKind(kind)?.walkable||regionKind(kind)?.standStatusDeep||['water','lava','chasm','bog','swamp'].includes(kind)){clear=false;break;}
      }
      if(!clear)continue;
      positions.push(at);
    }
    this.planning.maxStandMs=Math.max(this.planning.maxStandMs,performance.now()-standStarted);
    if(positions.length!==count)return remember(null);
    const fixtureRadius=context.zone.objective.kind==='rifts'?RIFT_CFG.radius:context.zone.objective.kind==='unearth'?DIG_CFG.radius:PYRE_CFG.radius;
    const routeStarted=performance.now();
    const access=planGeographicAccess(owner.center,positions.map((at,i)=>({at,radius:i<pyreCount?fixtureRadius:24})),span,
      {terrainCell:this.mass.config.terrain.terrainCell,regionAt:at=>this.mass.generator.terrainAt(at).region,reserved:independentReserve},halfSpan);
    this.planning.maxRouteMs=Math.max(this.planning.maxRouteMs,performance.now()-routeStarted);
    this.planning.maxExpanded=Math.max(this.planning.maxExpanded,access.expanded);this.planning.maxTerrainSamples=Math.max(this.planning.maxTerrainSamples,access.samples);
    if(!access.ok)return remember(null);
    return remember({owner,context,positions:positions.slice(0,pyreCount),...(positions[pyreCount]?{chestPosition:positions[pyreCount]}:{}),access:access.proof});
  }
  reserves(at: MassAddress, radius: number): boolean {
    if(at.dimension!==this.mass.origin.dimension)return false;
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
  get population():number{return this.bodies?.population??0;}
  private host(world:World):MassObjectiveHost {
    this.bodies??=new MassObjectiveBodies(world,this.mass.generator.run.seed,{population:()=>this.mass.population,
      maxPopulation:()=>this.mass.config.maxPopulation,retainRadius:2400,quietSeconds:12});
    return this.snapshotHost={get now(){return world.time;},hold:world.massHoldHost(false),
      installPyres:(owner,fixtures)=>world.installMassPyres(owner,fixtures),
      installHolds:(owner,kind,fixtures)=>world.installMassHolds(owner,kind,fixtures),
      installEffects:(owner,zone,fixtures,saved)=>this.bodies!.install(owner,zone,fixtures,saved),
      installChest:(owner,chest)=>world.installMassObjectiveChest(owner,chest),canRetire:(fixtures,owned)=>world.canRetireMassPyres(fixtures,owned),
      complete:(owner,zone,label)=>world.completeMassObjective(owner,zone,label)};
  }
  sync(world:World):void {
    const mass=this.mass,at=mass.walk.at(world.player.pos.x,world.player.pos.y),span=mass.config.terrain.addressSpan;
    const radius=2400,lower=moveAddress(at,{x:-radius,y:-radius},span);
    const owners=this.hierarchy.intersections('zone',massAddressBounds(lower,radius*2,radius*2,span));
    const host=this.host(world);this.objectives.sync(owners,host,p=>this.local(p));
    for(const owner of owners){
      const plan=this.plan(owner);if(!plan?.access)continue;
      if(this.hierarchy.controller(owner.id,'objective:'+plan.context.zone.objective.kind))continue;
      // Wait until all required terrain/scenery is resident. Do not seat only
      // part of an operation, and never carve a path through native blockers.
      if(this.stands(plan).some(p=>{const q=this.local(p);return Math.hypot(q.x-world.player.pos.x,q.y-world.player.pos.y)>mass.config.pageRadius*span-160;}))continue;
      if(this.stands(plan).some(p=>{const q=this.local(p);return !mass.walk.isWalkable(q.x,q.y)||!!world.pointInSolid(q.x,q.y,(plan.context.zone.objective.kind==='rifts'?RIFT_CFG.radius:plan.context.zone.objective.kind==='unearth'?DIG_CFG.radius:PYRE_CFG.radius)+12);}))continue;
      const route=this.accessIndices.get(owner.id)!;
      if(route.points.some(p=>{const q=this.local(moveAddress(owner.center,p,span));return Math.hypot(q.x-world.player.pos.x,q.y-world.player.pos.y)>mass.config.pageRadius*span-160;}))continue;
      // Last admission sweep sees exact live terrain and native hit shapes,
      // including cold native blockers. Later player edits can legitimately
      // obstruct a saved route; they never reroll an existing objective.
      const clear=(p:{x:number;y:number})=>{
        const q=this.local(moveAddress(owner.center,p,span));
        if(!discTerrainClear(q,MASS_ACCESS_POLICY.bodyRadius,mass.walk.cellSize,p=>{
          const id=mass.walk.regionAt(p.x,p.y),kind=regionKind(id);
          return !!kind?.walkable&&!kind.standStatusDeep&&!['water','lava','chasm','bog','swamp'].includes(id);
        }))return false;
        return !world.pointInSolid(q.x,q.y,MASS_ACCESS_POLICY.bodyRadius);
      };
      const half=plan.access.halfSpan,side=half/30*2+1,point=(i:number)=>({x:i%side*30-half,y:Math.floor(i/side)*30-half});
      if(plan.access.paths.some(path=>path.some((i,n)=>{
        const a=point(n?path[n-1]:i),b=point(i);
        return ![.25,.5,.75,1].every(t=>clear({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}));
      })))continue;
      const {owner:_owner,...definition}=plan;
      this.hierarchy.enroll(owner,'objective-access','worldmass/geographic-access-v1',definition,null,world.time);
      this.objectives.admit(owner,plan.positions,host,p=>this.local(p),plan.context,plan.chestPosition);
    }
  }
  update(world:World,dt:number):void {this.objectives.update(dt,this.host(world));}
  snapshot():MassHierarchySave{if(this.snapshotHost)this.objectives.captureEffects(this.snapshotHost);return this.hierarchy.snapshot();}
  /** Pure generated targets for diagnostics and physical planning. */
  plannedAt(at:MassAddress):Readonly<Planned>|null{return this.plan(this.hierarchy.at(at).zone);}
}
