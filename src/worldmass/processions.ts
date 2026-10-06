import type { Actor } from '../engine/actor';
import type { World, Chest } from '../engine/world';
import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { objectiveEarnsChest, objectiveSeals } from '../data/zones';
import { MONSTERS } from '../data/monsters';
import { sameStory } from '../engine/tiers';
import { driveNativeProcession, validateNativeProcessionConfig, pauseNativeProcession, rerallyNativeProcession,
  type NativeProcessionHost, type NativeProcessionState } from '../engine/processionObjectives';
import { address, localOffset, type MassAddress } from './address';
import { MassHierarchy, massBoundsContains, type MassGeography, type MassControllerSave } from './hierarchy';
import { canonical, freezeData, massDigest, massRandom, streamSeed } from './random';
import { captureNativeActorState, restoreNativeActorState, massDormancyPins, nativeDormancyRefusal,
  nativeActorQuietRefusal, type NativeActorState } from './dormancy';
import { validateProcessionRoute, type MassProcessionRoute } from './processionPlan';
import type { MassProcessionContext, MassProcessionRoadRow, MassProcessionCartBirth, MassProcessionAmbushBirth } from './processionTypes';
export type { MassProcessionContext, NativeMassProcessionSource, MassProcessionCartBirth, MassProcessionAmbushBirth, MassProcessionRoadRow } from './processionTypes';
export { resolveMassProcessionContext } from './processionSources';

const ID='objective:procession', POP=ID+':population', CHEST=ID+':chest';
const clone=<T>(v:T):T=>JSON.parse(canonical(v)) as T;
export interface MassProcessionPolicy {maxResident:number;departRadius:number;returnRadius:number;quietSeconds:number}
export const MASS_PROCESSION_POLICY:Readonly<MassProcessionPolicy>=Object.freeze({maxResident:4,departRadius:2400,returnRadius:1300,quietSeconds:12});
export interface MassProcessionHost {
  world:World;readonly now:number;
  local(at:MassAddress):Vec2;
  address(at:Vec2):MassAddress;
  /** Free actual seats after other funded owners' missing-seat reservations. */
  availablePopulation(owner?:string):number;
  createCart(request:MassProcessionCartBirth):Actor;
  createAmbush(request:MassProcessionAmbushBirth):readonly Actor[];
  reachable:NativeProcessionHost['reachable'];
  /** Uses the native path field toward this certified adjacent waypoint. */
  steering(cart:Actor,target:Vec2):Vec2;
  installRoad(owner:string,rows:readonly MassProcessionRoadRow[]):()=>void;
  installChest(owner:string,chest:Chest):()=>void;
  complete(owner:string,zone:Readonly<ZoneDef>):void;
  wreck(owner:string,zone:Readonly<ZoneDef>,at:Vec2,seed:number,rewardSource:string):void;
}
export interface MassProcessionDefinition {
  kind:'procession';context:MassProcessionContext;route:MassProcessionRoute;road:MassProcessionRoadRow[];
  reward:{chance:number;source:string;position:MassAddress|null};
}
export interface MassProcessionProgress {
  started:boolean;rolling:boolean;away:boolean;done:boolean;lost:boolean;
  cartAt:MassAddress;startAt:MassAddress;waypoint:number;heading:number;
  enteredAt:number;dwellElapsed:number;puffRemaining:number|null;
}
export interface MassProcessionBodyRow {
  key:string;actorId:number;monster:string;dead:boolean;at:MassAddress;life:number;
  /** Quiet exact native graph. Active Continue is deliberately baseline+wounds. */
  state?:NativeActorState;
  /** Map keys need explicit identity semantics; never infer them by spelling. */
  threat?:[number,number][];
}
export interface MassProcessionBirthReceipt {
  kind:'cart'|'ambush';sequence:number;seed:number;at:MassAddress;heading:number;count:number;bodies:MassProcessionBodyRow[];
}
export interface MassProcessionPopulationSave {
  schema:1;owner:string;clock:number;frame:MassAddress;playerId:number;draws:number;sequence:number;
  births:MassProcessionBirthReceipt[];transient:string[];
}
export interface MassProcessionView {
  owner:string;pos:Vec2;frac:number;started:boolean;rolling:boolean;done:boolean;lost:boolean;lifeFrac:number;
  rallyFrac:number;away:boolean;name:string;cartId:number|null;start:Vec2;destination:Vec2;
}
interface Slot {key:string;actor?:Actor;row?:MassProcessionBodyRow}
interface Birth {receipt:Omit<MassProcessionBirthReceipt,'bodies'>;slots:Slot[]}
interface Run {
  owner:MassGeography;definition:Readonly<MassProcessionDefinition>;state:NativeProcessionState;
  cartAt:MassAddress;startAt:MassAddress;away:boolean;waypoint:number;draws:number;sequence:number;
  births:Birth[];cart:Actor|null;detachRoad:()=>void;chest?:Chest;detachChest?:()=>void;clock:number;retireAt:number;lureUntil:number;
}

/** Real native carts and ambushes owned by geographic zones, independent of
 * render chunks. Save authority is the hierarchy inside CharacterSave. */
export class MassProcessions {
  readonly policy:Readonly<MassProcessionPolicy>;
  private live=new Map<string,Run>();
  private definitions=new Map<string,Readonly<MassProcessionDefinition>>();
  constructor(readonly hierarchy:MassHierarchy,policy:MassProcessionPolicy=MASS_PROCESSION_POLICY){
    if(!Number.isInteger(policy.maxResident)||policy.maxResident<1||policy.maxResident>32
      ||!Number.isFinite(policy.returnRadius)||policy.returnRadius<256||!Number.isFinite(policy.departRadius)
      ||policy.departRadius<policy.returnRadius+256||policy.departRadius>16384||!Number.isFinite(policy.quietSeconds)||policy.quietSeconds<5)
      throw Error('Invalid native procession residency policy');
    this.policy=freezeData(clone(policy));
    for(const row of hierarchy.controllers()){
      const c=row.controllers.find(c=>c.id===ID);if(!c)continue;
      if(row.controllers.some(c=>c.id.startsWith('objective:')&&!c.id.startsWith(ID)))throw Error('Multiple objectives share a procession zone');
      const d=this.read(row.owner,c);this.definitions.set(row.owner.id,d);
      const pop=hierarchy.controller(row.owner.id,POP);if(!pop)throw Error('Missing native procession population');
      if(pop.source!=='engine/world/native-procession-bodies'||canonical(pop.definition)!==canonical({source:d.context.source})
        ||!['waiting','active','dormant'].includes(pop.phase)||pop.state===null&&pop.phase!=='waiting'||pop.state!==null&&pop.phase==='waiting')throw Error('Invalid native procession population owner');
      const save=this.validatePopulation(row.owner.id,d,pop.state);this.validateCrossState(c,save);
      this.readChest(row.owner.id,d);
    }
  }
  get residentCount():number{return this.live.size;}
  get population():number{let n=0;for(const r of this.live.values())for(const a of this.owned(r).values())if(!a.dead)n++;return n;}
  reservedPopulation(exceptOwner?:string):number{
    let n=0;for(const [id,r]of this.live)if(id!==exceptOwner&&!r.state.done&&!r.state.lost)
      n+=Math.max(0,1+r.definition.context.config.puffCap-[...this.owned(r).values()].filter(a=>!a.dead).length);
    return n;
  }
  has(owner:string):boolean{return this.definitions.has(owner);}
  done(owner:string):boolean{return this.hierarchy.status(owner,ID)?.phase==='complete';}
  actors(owner:string):ReadonlyMap<string,Actor>{const r=this.live.get(owner);return r?this.owned(r):new Map();}
  definition(owner:string):Readonly<MassProcessionDefinition>|undefined{return this.definitions.get(owner);}
  chestWanted(owner:MassGeography,context:MassProcessionContext):boolean{
    const old=this.definitions.get(owner.id);if(old)return !!old.reward.position;
    return !context.zone.special&&objectiveEarnsChest(context.zone.objective)
      &&massRandom(this.hierarchy.seed,[owner.id,ID,'native-chest']).chance(.75);
  }
  admit(owner:MassGeography,context:MassProcessionContext,route:MassProcessionRoute,host:MassProcessionHost,
    chestPosition?:MassAddress,road:readonly MassProcessionRoadRow[]=[]):boolean{
    const old=this.hierarchy.controller(owner.id,ID);if(old)return this.mount(owner,this.definitions.get(owner.id)!,old,host);
    if(['pyres','rifts','unearth','beacon'].some(kind=>this.hierarchy.status(owner.id,'objective:'+kind)))throw Error('Multiple objectives share a procession zone');
    if(this.hierarchy.status(owner.id,POP)||this.hierarchy.status(owner.id,CHEST))throw Error('Orphan native procession child controller');
    if(this.live.size>=this.policy.maxResident||host.availablePopulation(owner.id)<1+context.config.puffCap)return false;
    const wanted=this.chestWanted(owner,context);
    // Reserve one additional record for the facade's frozen physical ACCESS
    // proof; the native controller must never strand a partial record group.
    if(this.hierarchy.controllerCount(owner.id)+3+Number(wanted)>128)return false;
    if(wanted!==!!chestPosition)throw Error('Native procession chest requires its rolled legal stand');
    const d:MassProcessionDefinition={kind:'procession',context:clone(context),route:clone(route),road:clone([...road]),
      reward:{chance:.75,source:canonical([owner.id,ID,'chest']),position:chestPosition?clone(chestPosition):null}};
    this.validateDefinition(owner,d);
    const state:MassProcessionProgress={started:false,rolling:false,away:false,done:false,lost:false,cartAt:clone(route.entry),
      startAt:clone(route.entry),waypoint:1,heading:0,enteredAt:host.now,dwellElapsed:0,puffRemaining:null};
    // This draft is not save authority. Native factory/scene preparation may
    // fail, so persist only after all external mount callbacks have succeeded.
    const c:MassControllerSave={id:ID,source:context.source,definition:d,definitionHash:massDigest(d),phase:'waiting',clock:0,updatedAt:host.now,revision:0,state,receipts:[]};
    return this.mount(owner,freezeData(d),c,host,true);
  }
  /** Restore saved controllers before optional new site births. Cart proximity
   * also matters after the cart has moved away from its source zone center. */
  sync(wanted:readonly MassGeography[],host:MassProcessionHost):void{
    for(const r of [...this.live.values()]){
      this.settleLoss(r,host);this.absence(r,host);this.checkpoint(r,host);
      if(r.away&&host.now>=r.retireAt){r.retireAt=host.now+1;if(this.canRetire(r,host))this.detach(r,host);}
    }
    const want=new Set(wanted.map(o=>o.id));
    for(const [id,d]of [...this.definitions].sort(([a],[b])=>Number(want.has(b))-Number(want.has(a))||a.localeCompare(b))){
      if(this.live.has(id))continue;const c=this.hierarchy.controller(id,ID)!,s=c.state as MassProcessionProgress;
      let near=false;try{const q=host.local(s.cartAt);near=Math.hypot(q.x-host.world.player.pos.x,q.y-host.world.player.pos.y)<=this.policy.returnRadius;}catch{/* outside local frame */}
      // A large geographic zone may still be wanted after the player truly
      // left this cart. Zone membership alone must not remount it immediately
      // after retirement; the saved physical cart is the return anchor.
      if(near)this.mount(this.hierarchy.owner(id)!,d,c,host);
    }
  }
  update(dt:number,host:MassProcessionHost):void{
    if(!Number.isFinite(dt)||dt<0)throw Error('Invalid procession step');
    for(const r of this.live.values()){
      this.settleLoss(r,host);this.absence(r,host);
      if(!r.away&&!r.state.done&&!r.state.lost)driveNativeProcession(dt,r.state,r.definition.context.config,this.driverHost(r,host));
      if(r.cart)r.cartAt=host.address(r.cart.pos);
      this.checkpoint(r,host);
    }
  }
  /** Death first: a save immediately after World.kill must contain its terminal
   * wreck receipt, never a life-clamped resurrected cargo on Continue. */
  capture(host:MassProcessionHost):void{
    for(const r of this.live.values()){this.settleLoss(r,host);this.absence(r,host);this.checkpoint(r,host);this.captureBodies(r,host);this.captureChest(r,host);}
  }
  views(near?:Vec2):readonly MassProcessionView[]{
    const rows=[...this.live.values()].map(r=>{const a=r.cart,p=a?.pos??r.state.dest,total=Math.max(1,Math.hypot(r.state.startPos.x-r.state.dest.x,r.state.startPos.y-r.state.dest.y));
      return{owner:r.owner.id,name:r.definition.context.zone.name,pos:{...p},frac:r.state.done?1:Math.max(0,Math.min(1,1-Math.hypot(p.x-r.state.dest.x,p.y-r.state.dest.y)/total)),
        started:r.state.started,rolling:r.state.rolling&&!r.state.done&&!r.state.lost,done:r.state.done,lost:r.state.lost,lifeFrac:a&&!a.dead?a.life/Math.max(1,a.maxLife()):0,
        rallyFrac:!r.away&&!r.state.rolling&&r.state.dwellStart?Math.min(1,(r.clock-r.state.dwellStart)/r.definition.context.config.rallyDwell):0,
        away:r.away,cartId:r.state.cartId,start:{...r.state.startPos},destination:{...r.state.dest}};});
    if(near)rows.sort((a,b)=>Math.hypot(a.pos.x-near.x,a.pos.y-near.y)-Math.hypot(b.pos.x-near.x,b.pos.y-near.y));return rows;
  }
  private chestRun(chest:Chest):Run|undefined{
    const r=chest.massObjectiveOwner?this.live.get(chest.massObjectiveOwner):undefined;return r?.chest===chest?r:undefined;
  }
  chestReady(chest:Chest):boolean{const r=this.chestRun(chest);return !!r&&this.done(r.owner.id);}
  chestContext(chest:Chest):Readonly<ZoneDef>|undefined{return this.chestRun(chest)?.definition.context.zone;}
  chestOpened(chest:Chest,now:number):void{
    const r=this.chestRun(chest);if(!r||!this.chestReady(chest)||!chest.opened||!Number.isFinite(now))throw Error('Foreign or locked procession chest');
    this.captureChest(r,{now:Math.max(this.hierarchy.status(r.owner.id,CHEST)!.updatedAt,now)});
  }
  private owned(r:Run):Map<string,Actor>{return new Map(r.births.flatMap(b=>b.slots.flatMap(s=>s.actor?[[s.key,s.actor] as const]:[])));}
  private driverHost(r:Run,h:MassProcessionHost):NativeProcessionHost{
    const w=h.world,id=r.owner.id,cfg=r.definition.context.config,zone=r.definition.context.zone;
    const random={range:(lo:number,hi:number)=>massRandom(this.hierarchy.seed,[id,'native-procession/draw',r.draws++]).range(lo,hi),
      int:(lo:number,hi:number)=>massRandom(this.hierarchy.seed,[id,'native-procession/draw',r.draws++]).int(lo,hi)};
    return{now:h.now,player:w.player,random,actorById:n=>r.cart?.id===n?r.cart:null,reachable:h.reachable,enemiesOf:a=>w.enemiesOf(a),
      steering:(cart)=>{const points=r.definition.route.points;
        while(r.waypoint<points.length-1&&Math.hypot(cart.pos.x-h.local(points[r.waypoint]).x,cart.pos.y-h.local(points[r.waypoint]).y)<30)r.waypoint++;
        return h.steering(cart,h.local(points[r.waypoint]));},
      move:(a,dx,dy,dt)=>w.moveActor(a,dx,dy,dt),
      lure:cart=>{r.lureUntil=h.now+cfg.lureLinger;w.setLure(this.lureId(id),cart.pos,cfg.lureRadius,cfg.lurePace,cfg.lureStandoff,cfg.lureLinger,cart.tier);},
      flash:(pos,radius,color,life)=>w.flashes.push({pos,radius,color,life,maxLife:life}),
      robbersAlive:()=>this.robberCensus(id),
      spawnAmbush:(cart,heading,count)=>this.spawn(r,h,cart,heading,count),
      lose:()=>{this.checkpoint(r,h);this.receipt(r,h,'native-procession-loss','objective-failed');},
      wreck:cart=>{if(this.receipt(r,h,'native-procession-wreck','wreck-gem'))h.wreck(id,zone,cart.pos,
        streamSeed(this.hierarchy.seed,[id,'native-procession/wreck']),canonical([id,'native-procession/wreck']));},
      win:state=>{state.done=true;this.checkpoint(r,h);if(this.receipt(r,h,'native-objective-payout','objective-complete')){
        h.complete(id,zone);random.range(-10,10); // Former completion text, in this owner's saved stream.
      }},
    };
  }
  private lureId(id:string):string{return canonical([id,'native-procession/lure']);}
  private robberCensus(owner:string):number{
    const run=this.live.get(owner);if(run)return [...this.owned(run).values()].filter(a=>!a.dead&&a.tag==='procession_robber').length;
    const saved=this.hierarchy.controller(owner,POP)?.state as MassProcessionPopulationSave|null;
    return saved?.births.filter(b=>b.kind==='ambush').reduce((n,b)=>n+b.bodies.filter(a=>!a.dead).length,0)??0;
  }
  private spawn(r:Run,h:MassProcessionHost,cart:Actor,heading:number,count:number):number{
    if(r.away||r.state.done||r.state.lost||count>h.availablePopulation(r.owner.id))throw Error('Native procession reservation unavailable');
    const sequence=r.sequence,seed=streamSeed(this.hierarchy.seed,[r.owner.id,'native-procession/ambush',sequence]),at=h.address(cart.pos);
    const actors=h.createAmbush({owner:r.owner.id,sequence,seed,zone:r.definition.context.zone,config:r.definition.context.config,cart,at:{...cart.pos},heading,count});
    if(actors.length!==count||new Set(actors).size!==count||actors.some(a=>a.dead||a.team!=='enemy'||h.world.actors.includes(a)))throw Error('Native procession factory violated reserved wave');
    for(const a of actors)this.validateBodyOwner(r.owner.id,r.definition,'ambush',a);
    const slots=actors.map((actor,i)=>({key:canonical([r.owner.id,'ambush',sequence,i]),actor}));
    r.births.push({receipt:{kind:'ambush',sequence,seed,at,heading,count},slots});r.sequence++;
    h.world.actors.push(...actors);h.world.actorGridRev++;
    const f=r.definition.context.config.ambushFlare;
    for(const a of actors)h.world.flashes.push({pos:{...a.pos},radius:f.radius,color:r.definition.context.config.smoke,life:f.life,maxLife:f.life});
    return actors.length;
  }
  private settleLoss(r:Run,h:MassProcessionHost):void{
    if(!r.state.done&&!r.state.lost&&r.state.cartId!==null&&(!r.cart||r.cart.dead||r.cart.life<=0)){
      if(r.cart&&r.cart.life<=0)r.cart.dead=true;
      driveNativeProcession(0,r.state,r.definition.context.config,this.driverHost(r,h));
    }
  }
  private absence(r:Run,h:MassProcessionHost):void{
    const p=r.cart?.pos??h.local(r.cartAt),distance=Math.hypot(p.x-h.world.player.pos.x,p.y-h.world.player.pos.y);
    if(distance>this.policy.departRadius&&!r.away){
      r.away=true;if(r.cart&&!r.cart.dead&&!r.state.done&&!r.state.lost)pauseNativeProcession(r.state,r.cart);
      // Do not remove the lease immediately: ordinary native linger expires.
    }else if(distance<=this.policy.returnRadius&&r.away){
      r.away=false;if(r.cart&&!r.cart.dead&&!r.state.done&&!r.state.lost)rerallyNativeProcession(r.state,r.cart,h.now);
    }
  }
  private checkpoint(r:Run,h:MassProcessionHost):void{
    r.clock=h.now;
    const c=this.hierarchy.status(r.owner.id,ID)!;if(c.phase==='complete'||c.phase==='failed')return;
    if(r.cart)r.cartAt=h.address(r.cart.pos);
    const terminal=r.state.done||r.state.lost;
    const s:MassProcessionProgress={started:r.state.started,rolling:r.state.rolling&&!terminal,away:r.away,done:r.state.done,lost:r.state.lost,
      cartAt:clone(r.cartAt),startAt:clone(r.startAt),waypoint:r.waypoint,heading:r.state.heading,enteredAt:r.state.enteredAt,
      dwellElapsed:!terminal&&r.state.dwellStart?Math.max(0,h.now-r.state.dwellStart):0,puffRemaining:!terminal&&r.state.puffAt?Math.max(0,r.state.puffAt-h.now):null};
    const phase=r.state.done?'complete':r.state.lost?'failed':r.away?'dormant':'active';
    if(c.phase==='waiting'&&phase==='dormant'){
      if(!this.hierarchy.update(r.owner.id,ID,c.revision,h.now,s,'active'))throw Error('Concurrent procession activation');
      return this.checkpoint(r,h);
    }
    if(!this.hierarchy.update(r.owner.id,ID,c.revision,h.now,s,phase))throw Error('Concurrent native procession checkpoint');
  }
  private receipt(r:Run,_h:MassProcessionHost,id:string,kind:string):boolean{
    const c=this.hierarchy.controller(r.owner.id,ID)!;if(c.receipts.some(x=>x.id===id))return false;
    if(!this.hierarchy.receipt(r.owner.id,ID,c.revision,{id,kind,source:r.definition.context.source,subject:r.owner.id,at:c.updatedAt}))throw Error('Concurrent procession receipt');return true;
  }
  private bodyQuiet(r:Run,a:Actor,h:MassProcessionHost,state:NativeActorState|null):boolean{
    if(a===r.cart){
      if(a.defId!==r.definition.context.config.cartId||a.team!=='player'||!a.driven||a.companion||a.downed||a.tag!=='procession_cart'||a.eventKey!==`procession:${r.owner.id}`)return false;
      return !nativeActorQuietRefusal(a,h.world,this.policy.quietSeconds,state);
    }
    return !nativeDormancyRefusal(a,h.world,this.policy.quietSeconds,state);
  }
  private closed(state:NativeActorState,known:Set<number>):boolean{
    if(state?.version!==1||!Array.isArray(state.nodes))return false;
    return !state.nodes.some(n=>!n||!Array.isArray(n.entries)||n.entries.some(pair=>!Array.isArray(pair)||pair.length!==2||pair.some(v=>
      v!==null&&typeof v==='object'&&('actor'in v&&!known.has(v.actor)||'squad'in v
        ||'entity'in v&&!known.has(v.entity)&&pair[0]!=='aiHitById'&&pair[0]!=='lastFoeId'))));
  }
  private canRetire(r:Run,h:MassProcessionHost):boolean{
    if(h.now<r.lureUntil)return false;
    const bodies=this.owned(r),known=new Set([h.world.player.id,...[...bodies.values()].map(a=>a.id)]);
    if(massDormancyPins(h.world,bodies).size)return false;
    const ours=new Set(bodies.values());
    if(h.world.actors.some(a=>!a.dead&&!ours.has(a)&&(a.team==='player'||a.companion)&&[...bodies.values()].some(b=>!b.dead&&sameStory(a,b)&&Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)<this.policy.returnRadius)))return false;
    for(const a of bodies.values())if(!a.dead){const state=captureNativeActorState(a);if(!state||!this.bodyQuiet(r,a,h,state)||a.threat.size||!this.closed(state,known))return false;}
    return true;
  }
  private captureBodies(r:Run,h:MassProcessionHost):void{
    const bodies=this.owned(r),pins=massDormancyPins(h.world,bodies),known=new Set([h.world.player.id,...[...bodies.values()].map(a=>a.id)]),transient:string[]=[];
    const births=r.births.map(b=>({...clone(b.receipt),bodies:b.slots.map(slot=>{
      const a=slot.actor;if(!a)return clone(slot.row!);
      let state=a.dead?null:captureNativeActorState(a);
      if(state&&(pins.has(a)||!this.bodyQuiet(r,a,h,state)||a.threat.size||!this.closed(state,known)))state=null;
      if(!a.dead&&!state)transient.push(slot.key);
      const row:MassProcessionBodyRow={key:slot.key,actorId:a.id,monster:a.defId!,dead:a.dead,at:h.address(a.pos),life:Math.max(0,a.life),...(state?{state,threat:[]}: {})};
      if(a.dead&&a!==r.cart){slot.row=clone(row);slot.actor=undefined;}
      return row;
    })}));
    const save:MassProcessionPopulationSave={schema:1,owner:r.owner.id,clock:h.now,frame:h.address({x:0,y:0}),playerId:h.world.player.id,draws:r.draws,sequence:r.sequence,births,transient};
    const c=this.hierarchy.status(r.owner.id,POP)!;
    if(c.phase==='waiting'&&r.away){if(!this.hierarchy.update(r.owner.id,POP,c.revision,h.now,save,'active'))throw Error('Concurrent procession body activation');return this.captureBodies(r,h);}
    if(!this.hierarchy.update(r.owner.id,POP,c.revision,h.now,save,r.away?'dormant':'active'))throw Error('Concurrent procession body checkpoint');
  }
  private detach(r:Run,h:MassProcessionHost):void{
    if(!this.canRetire(r,h))return;this.captureBodies(r,h);this.captureChest(r,h);const ours=new Set(this.owned(r).values());
    h.world.actors=h.world.actors.filter(a=>!ours.has(a));h.world.actorGridRev++;
    h.world.removeMassLure(this.lureId(r.owner.id));r.detachChest?.();r.detachRoad();this.live.delete(r.owner.id);
  }
  private mount(owner:MassGeography,d:Readonly<MassProcessionDefinition>,c:Readonly<MassControllerSave>,h:MassProcessionHost,fresh=false):boolean{
    if(this.live.has(owner.id))return true;if(this.live.size>=this.policy.maxResident)return false;
    const progress=clone(c.state as MassProcessionProgress),saved=fresh?undefined:this.validatePopulation(owner.id,d,this.hierarchy.controller(owner.id,POP)!.state);this.validateCrossState(c,saved);
    if(saved&&saved.births.some(b=>b.bodies.some(a=>a.state))&&canonical(saved.frame)!==canonical(h.address({x:0,y:0})))throw Error('Exact native procession actor frame changed');
    const terminal=progress.done||progress.lost,living=saved?.births.reduce((n,b)=>n+b.bodies.filter(a=>!a.dead).length,0)??1;
    if(h.availablePopulation(owner.id)<(terminal?living:Math.max(1+d.context.config.puffCap,living)))return false;
    const r:Run={owner,definition:d,state:{cartId:null,rolling:false,started:progress.started,startPos:h.local(progress.startAt),dest:h.local(d.route.destination),destIdx:null,
      dwellStart:0,puffAt:0,heading:progress.heading,enteredAt:h.now,done:progress.done,lost:progress.lost},cartAt:progress.cartAt,startAt:progress.startAt,
      away:!!saved,waypoint:progress.waypoint,draws:saved?.draws??0,sequence:saved?.sequence??0,births:[],cart:null,detachRoad:()=>{},clock:h.now,retireAt:h.now,lureUntil:0};
    const ids=new Map<number,Actor>();if(saved)ids.set(saved.playerId,h.world.player);
    const rows=saved?.births??[{kind:'cart' as const,sequence:0,seed:streamSeed(this.hierarchy.seed,[owner.id,'native-procession/cart']),at:d.route.entry,heading:0,count:1,bodies:[]}];
    for(const birth of rows){
      if(birth.kind==='ambush'&&!birth.bodies.some(a=>!a.dead)){r.births.push({receipt:this.birthHeader(birth),slots:birth.bodies.map(row=>({key:row.key,row:clone(row)}))});continue;}
      const request={owner:owner.id,seed:birth.seed,zone:d.context.zone,config:d.context.config,at:h.local(birth.at)};
      const actors=birth.kind==='cart'?[h.createCart(request)]:h.createAmbush({...request,sequence:birth.sequence,cart:r.cart!,heading:birth.heading,count:birth.count});
      if(actors.length!==birth.count||actors.some(a=>h.world.actors.includes(a)||a.dead))throw Error('Invalid detached procession restore');
      if(birth.kind==='cart')r.cart=actors[0];
      const slots=actors.map((actor,i)=>{const row=birth.bodies[i],key=row?.key??canonical([owner.id,'cart']);if(row){if(actor.defId!==row.monster)throw Error('Native procession species changed');ids.set(row.actorId,actor);}return{key,actor};});
      r.births.push({receipt:this.birthHeader(birth),slots});
    }
    for(const [bi,birth]of rows.entries())for(const [i,row]of birth.bodies.entries()){
      const a=r.births[bi].slots[i].actor;if(!a)continue;
      if(row.dead){a.dead=true;a.life=0;continue;}
      if(row.state){
        if(!this.closed(row.state,new Set(ids.keys())))throw Error('Foreign live procession checkpoint dependency');
        restoreNativeActorState(a,row.state,ids);
        if(a.threat.size)throw Error('Nonquiet exact procession threat checkpoint');
        a.threat=new Map((row.threat??[]).map(([old,value])=>{const target=ids.get(old);if(!target)throw Error('Foreign procession threat reference');return[target.id,value];}));
        if(!this.bodyQuiet(r,a,h,row.state))throw Error('Nonquiet exact procession checkpoint');
      }
      a.pos=h.local(row.at);a.life=row.life;
      if(a.life<=0||a.life>a.maxLife())throw Error('Invalid procession wounds');
    }
    for(const b of r.births)for(const s of b.slots)if(s.actor)this.validateBodyOwner(owner.id,d,b.receipt.kind,s.actor);
    if(r.cart&&!terminal){r.state.cartId=r.cart.id;rerallyNativeProcession(r.state,r.cart,h.now);}
    if(!saved&&r.cart){r.cartAt=h.address(r.cart.pos);r.startAt=clone(r.cartAt);r.state.startPos={...r.cart.pos};}
    const ours=[...this.owned(r).values()].filter(a=>!a.dead);
    if(new Set(ours).size!==ours.length||ours.some(a=>h.world.actors.includes(a)))throw Error('Duplicate procession actor enrollment');
    let detachRoad:(()=>void)|undefined,detachChest:(()=>void)|undefined;
    try{
      detachRoad=h.installRoad(owner.id,d.road);
      if(d.reward.position){const cs: {opened:boolean;openedAt?:number}=fresh?{opened:false}:this.readChest(owner.id,d)!;r.chest={pos:h.local(d.reward.position),kind:'objective',mimic:false,lockTime:0,maxLock:0,
        massObjectiveOwner:owner.id,rewardSource:d.reward.source,rewardLevel:d.context.zone.level,opened:cs.opened,...(cs.openedAt===undefined?{}:{openedAt:cs.openedAt})};detachChest=h.installChest(owner.id,r.chest);}
      // No callbacks or asynchronous work lie between these validated records
      // and publication. Failed native installs above leave no orphan owner.
      if(fresh){
        if(this.hierarchy.controllerCount(owner.id)+3+Number(!!d.reward.position)>128){detachChest?.();detachRoad();return false;}
        if([ID,POP,CHEST].some(id=>this.hierarchy.status(owner.id,id)))throw Error('Native procession enrollment changed during preparation');
        this.hierarchy.enroll(owner,ID,d.context.source,d,progress,h.now);
        this.hierarchy.enroll(owner,POP,'engine/world/native-procession-bodies',{source:d.context.source},null,h.now);
        if(d.reward.position)this.hierarchy.enroll(owner,CHEST,'engine/world/objective-chest',d.reward,{opened:false},h.now);
        this.definitions.set(owner.id,d);
      }
      r.detachRoad=detachRoad;r.detachChest=detachChest;h.world.actors.push(...ours);h.world.actorGridRev++;this.live.set(owner.id,r);
    }catch(error){detachChest?.();detachRoad?.();throw error;}
    this.absence(r,h);this.settleLoss(r,h);this.checkpoint(r,h);this.captureBodies(r,h);return true;
  }
  private birthHeader(b:MassProcessionBirthReceipt):Omit<MassProcessionBirthReceipt,'bodies'>{return{kind:b.kind,sequence:b.sequence,seed:b.seed,at:clone(b.at),heading:b.heading,count:b.count};}
  private validateBodyOwner(owner:string,d:Readonly<MassProcessionDefinition>,kind:'cart'|'ambush',a:Actor):void{
    if(a.eventKey!==`procession:${owner}`||a.companion||a.downed||(kind==='cart'
      ?a.defId!==d.context.config.cartId||a.team!=='player'||!a.driven||!!a.fromZoneGen||a.tag!=='procession_cart'
      :a.team!=='enemy'||a.tag!=='procession_robber'||!a.fromZoneGen||!d.context.config.robbers.some(row=>row.id===a.defId)))
      throw Error('Foreign native procession body ownership');
  }
  private captureChest(r:Run,h:Pick<MassProcessionHost,'now'>):void{
    if(!r.chest)return;const c=this.hierarchy.status(r.owner.id,CHEST)!;if(c.phase==='complete')return;
    if(r.chest.opened&&!this.done(r.owner.id))throw Error('Opened unearned procession chest');
    const state={opened:r.chest.opened,...(r.chest.opened?{openedAt:Math.max(0,Math.min(h.now,r.chest.openedAt??h.now))}:{})};
    if(c.phase==='waiting'&&r.chest.opened){if(!this.hierarchy.update(r.owner.id,CHEST,c.revision,h.now,{opened:false},'active'))throw Error('Concurrent procession chest unlock');return this.captureChest(r,h);}
    if(!this.hierarchy.update(r.owner.id,CHEST,c.revision,h.now,state,r.chest.opened?'complete':this.done(r.owner.id)?'active':'waiting'))throw Error('Concurrent procession chest checkpoint');
  }
  private readChest(owner:string,d:Readonly<MassProcessionDefinition>):{opened:boolean;openedAt?:number}|undefined{
    const c=this.hierarchy.controller(owner,CHEST);if(!d.reward.position){if(c)throw Error('Orphan procession chest');return;}
    const s=c?.state as {opened:boolean;openedAt?:number};
    if(!c||c.source!=='engine/world/objective-chest'||canonical(c.definition)!==canonical(d.reward)||!s||typeof s.opened!=='boolean'
      ||s.opened!==(c.phase==='complete')||s.opened&&(!this.done(owner)||!Number.isFinite(s.openedAt)||s.openedAt!<0||s.openedAt!>c.updatedAt)
      ||!s.opened&&s.openedAt!==undefined)throw Error('Invalid procession chest checkpoint');return s;
  }
  private read(owner:MassGeography,c:Readonly<MassControllerSave>):Readonly<MassProcessionDefinition>{
    const d=c.definition as MassProcessionDefinition;this.validateDefinition(owner,d);const s=c.state as MassProcessionProgress;
    if(c.source!==d.context.source||!s||[s.started,s.rolling,s.away,s.done,s.lost].some(v=>typeof v!=='boolean')||s.done&&s.lost
      ||!Number.isInteger(s.waypoint)||s.waypoint<1||s.waypoint>=d.route.points.length||![s.heading,s.enteredAt,s.dwellElapsed].every(Number.isFinite)
      ||s.enteredAt<0||s.dwellElapsed<0||s.puffRemaining!==null&&(!Number.isFinite(s.puffRemaining)||s.puffRemaining<0)
      ||s.done!==(c.phase==='complete')||s.lost!==(c.phase==='failed')||s.done&&!s.started||s.rolling&&(!s.started||s.away||s.done||s.lost)
      ||s.done&&!this.hasReceipt(c,owner.id,d,'native-objective-payout','objective-complete')
      ||s.lost&&!this.hasReceipt(c,owner.id,d,'native-procession-loss','objective-failed'))throw Error('Invalid procession progress checkpoint');
    this.validAddress(s.cartAt);this.validAddress(s.startAt);return freezeData(clone(d));
  }
  private validAddress(at:MassAddress):void{if(canonical(address(at.dimension,at.cx,at.cy,at.x,at.y,this.hierarchy.addressSpan))!==canonical(at))throw Error('Invalid procession address');}
  private validateDefinition(owner:MassGeography,d:MassProcessionDefinition|Readonly<MassProcessionDefinition>):void{
    const z=d?.context?.zone,c=d?.context?.config,r=d?.route;
    if(owner.kind!=='zone'||d.kind!=='procession'||!z||z.id!==owner.id||z.aquatic||z.boundless||z.objective.kind!=='procession'||objectiveSeals(z.objective)||z.special||z.spoils==='none'
      ||!d.context.source||!Number.isSafeInteger(z.level)||z.level<1||!c||c.cartId!=='caravan_cart'||!MONSTERS[c.cartId]
      ||!Array.isArray(c.robbers)||!c.robbers.length||c.robbers.some(e=>!MONSTERS[e.id])||!Number.isInteger(c.puffCap)||c.puffCap<1||c.puffCap>64
      ||!r||r.version!==1||r.owner!==owner.id||r.run!==this.hierarchy.run||canonical(r.center)!==canonical(owner.center)||r.bodyRadius<18||!Array.isArray(r.points)||r.points.length<2
      ||!r.proofHash||!Array.isArray(d.road)||!d.road.length||d.road.length>4096||d.road.some(row=>row.doodad.kind!=='road'||!Number.isFinite(row.doodad.radius)||row.doodad.radius<=0)
      ||d.reward.chance!==.75||d.reward.source!==canonical([owner.id,ID,'chest'])||d.reward.position&&!massBoundsContains(owner.bounds,d.reward.position,this.hierarchy.addressSpan))throw Error('Unsupported native procession definition');
    validateNativeProcessionConfig(c);
    const expected=this.hierarchy.at(owner.center).zone;
    if(expected.id!==owner.id||canonical(expected.bounds)!==canonical(owner.bounds))throw Error('Foreign native procession owner geography');
    validateProcessionRoute(r,this.hierarchy.addressSpan);
    for(const at of [...r.points,...d.road.map(x=>x.at),r.entry,r.destination])this.validAddress(at);
    if(canonical(r.points[0])!==canonical(r.entry)||canonical(r.points.at(-1))!==canonical(r.destination))throw Error('Disconnected procession route');
    for(let i=1;i<r.points.length;i++){const v=localOffset(r.points[i],r.points[i-1],this.hierarchy.addressSpan);if(Math.hypot(v.x,v.y)>450.001)throw Error('Unbounded native procession steering');}
    // Full source/geometry proof validation is also performed by the pure
    // compiler and live native admission before this owner is offered.
  }
  private validatePopulation(owner:string,d:Readonly<MassProcessionDefinition>,raw:unknown):MassProcessionPopulationSave|undefined{
    if(raw===null)return;const s=raw as MassProcessionPopulationSave;
    if(!s||s.schema!==1||s.owner!==owner||!Number.isFinite(s.clock)||s.clock<0||!Number.isSafeInteger(s.playerId)||s.playerId<1||!Number.isSafeInteger(s.draws)||s.draws<0
      ||!Number.isSafeInteger(s.sequence)||s.sequence<0||!Array.isArray(s.births)||s.births.length<1||s.births[0].kind!=='cart'||!Array.isArray(s.transient))throw Error('Invalid procession population checkpoint');
    this.validAddress(s.frame);const keys=new Set<string>(),ids=new Set<number>(),transient=new Set<string>();let sequence=0;
    for(const b of s.births){this.validAddress(b.at);
      const seed=streamSeed(this.hierarchy.seed,[owner,b.kind==='cart'?'native-procession/cart':'native-procession/ambush',...(b.kind==='cart'?[]:[b.sequence])]);
      if(!['cart','ambush'].includes(b.kind)||b.seed!==seed||!Number.isInteger(b.count)||b.count<1||b.count>d.context.config.puffCap
        ||!Number.isFinite(b.heading)||b.kind==='cart'&&(b!==s.births[0]||b.count!==1||b.sequence!==0)||b.kind==='ambush'&&b.sequence!==sequence++
        ||!Array.isArray(b.bodies)||b.bodies.length!==b.count)throw Error('Invalid procession birth receipt');
      for(const [i,a]of b.bodies.entries()){
        const key=b.kind==='cart'?canonical([owner,'cart']):canonical([owner,'ambush',b.sequence,i]);this.validAddress(a.at);
        if(a.key!==key||keys.has(key)||!Number.isSafeInteger(a.actorId)||a.actorId<1||ids.has(a.actorId)||a.actorId===s.playerId||typeof a.dead!=='boolean'||!MONSTERS[a.monster]
          ||b.kind==='cart'&&a.monster!==d.context.config.cartId||b.kind==='ambush'&&!d.context.config.robbers.some(r=>r.id===a.monster)
          ||!Number.isFinite(a.life)||a.life<0||!a.dead&&a.life<=0||a.dead&&(a.state!==undefined||a.threat!==undefined)
          ||!a.dead&&!a.state&&!s.transient.includes(a.key)||a.state&&(!Array.isArray(a.threat)||a.threat.length!==0))throw Error('Invalid procession body state');keys.add(key);ids.add(a.actorId);if(!a.dead&&!a.state)transient.add(key);
      }
    }
    if(sequence!==s.sequence||new Set(s.transient).size!==s.transient.length||s.transient.length!==transient.size||s.transient.some(k=>!transient.has(k)))throw Error('Invalid procession birth sequence');
    return s;
  }
  private hasReceipt(c:Readonly<MassControllerSave>,owner:string,d:Readonly<MassProcessionDefinition>,id:string,kind:string):boolean{
    return c.receipts.some(r=>r.id===id&&r.kind===kind&&r.source===d.context.source&&r.subject===owner&&r.at===c.updatedAt);
  }
  private validateCrossState(c:Readonly<MassControllerSave>,s:MassProcessionPopulationSave|undefined):void{
    const p=c.state as MassProcessionProgress;
    if(!s){if(c.phase!=='waiting'||p.started||p.done||p.lost)throw Error('Missing active procession population');return;}
    const cart=s.births[0].bodies[0];
    if(cart.dead!==(p.done||p.lost)||!cart.dead&&cart.life<=0)throw Error('Contradictory procession terminal body');
  }
}
