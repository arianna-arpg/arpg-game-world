/** Dedicated shared-world host over the actual retained campaign and area owners. */
import {readdirSync, statSync} from 'node:fs';
import {basename, join} from 'node:path';
import {NativeShardRuntime} from './nativeShardRuntime';
import {NativeShardFrames, type NativeShardTick} from './nativeShardFrames';
import {NativeShardStore} from './nativeShardSave';
import {NativeShardSeats} from './nativeShardSeats';
import {NativeShardMuster} from './nativeShardMuster';
import {ShardTransport, type ShardJoin} from './shardTransport';
import {VesselDesk} from './vessel';
import {ShardCorpses} from './corpses';
import {PartyDesk, PARTY_CFG} from './party';
import {SHARD_CFG, openAccount} from './shardHost';
import {NativeAreaHostedPresentation} from '../src/worldmass/nativeAreaHostedPresentation';
import type {NativeAreaSceneOngoing} from '../src/worldmass/nativeAreaSceneOngoing';
import type {NativeAreaSceneTransitionCoordinator} from '../src/worldmass/nativeAreaSceneTransitionCoordinator';
import {makeAccount, type Account} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {COOP_SCALING} from '../src/data/coop';
import {rollSeed} from '../src/core/rng';
import {sanitizeCosmeticLoadout} from '../src/meta/cosmetics';
import {shardHeroName} from '../src/net/shardDoor';
import {SHARD_LEAVE_WORD} from '../src/net/shardBuild';
import type {World, Seat} from '../src/engine/world';
import type {PeerInfo, SessionMsg} from '../src/net/transport';
import type {PlayerInput} from '../src/net/intent';
import type {DropRule} from '../src/net/spoils';
import type {ShardStand} from '../src/net/vesselWire';
import {UNIT_CFG} from '../src/engine/shardUnits';
import {ladderOfSpot, type SeatLadder} from '../src/engine/shardRoads';

export interface NativeShardOptions {
 seed?:number; keeperClass?:string; open?:boolean; saveDir?:string|null;
 name?:string; log?:(line:string)=>void;
}
export type NativeReturnPlan = {kind:'hearth';why:string} | {
 kind:'area';dest:string;at:{x:number;y:number};tier:number;from:string|null;
 mouth:boolean;why:string;ladder?:SeatLadder;
};
function newestSeed(dir:string):number|undefined {
 try {return readdirSync(dir).flatMap(file=>{const match=/^shard_([0-9a-f]{8})_native\.json$/i.exec(file);return match?[{seed:parseInt(match[1],16),at:statSync(join(dir,file)).mtimeMs}]:[];}).sort((a,b)=>b.at-a.at)[0]?.seed;}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return;throw error;}
}
/** The near policy is process-global in the original engine. Always restore it
 * after each synchronous host operation, including failed joins and frames. */
function nearPolicy<T>(fn:()=>T):T {const prior=COOP_SCALING.shareRadius;COOP_SCALING.shareRadius=SHARD_CFG.nearRadius;try{return fn();}finally{COOP_SCALING.shareRadius=prior;}}

export class NativeShardHost {
 readonly runtime:NativeShardRuntime; readonly world:World; readonly account:Account;
 readonly seed:number; readonly savePath:string|null; readonly worldmass=false;
 readonly net:ShardTransport; readonly seats:NativeShardSeats; readonly parties:PartyDesk;
 readonly corpses:ShardCorpses; readonly vessels:VesselDesk; readonly musters:NativeShardMuster;
 readonly frames:NativeShardFrames; readonly presentation:NativeAreaHostedPresentation;
 readonly coordinator:NativeAreaSceneTransitionCoordinator;
 readonly #authority:NativeAreaSceneOngoing['authority'];
 readonly #store:NativeShardStore|undefined; readonly #log:(line:string)=>void;
 readonly #hearth:{zone:string;x:number;y:number;tier:number};
 readonly #graces=new Map<string,number>(); readonly #dormancy=new Map<string,number>();
 readonly #unloadGraces=new Set<string>(); readonly #disposers:(()=>void)[]=[];
 readonly #bootAt=Date.now(); readonly #tickMs:number[]=[];
 #timer:NodeJS.Timeout|null=null; #lastWall=0; #accum=0; #partyRev=-1;
 #persistTimer=SHARD_CFG.worldSaveSec; #busy=false; #closing=false; #closed=false;
 readonly #hostFaults:{phase:string;error:unknown}[]=[];
 #opening:Promise<number>|undefined; #bound=false; #breakerNotified=false;
 #stopping:Promise<void>|undefined; #lastFaultLog=0; #faultsSinceLog=0; #consecutiveFaults=0;
 ticks=0; faults=0; droppedTicks=0; broken=false; onBroken?:()=>void;

 constructor(opts:NativeShardOptions={}) {
  this.#log=opts.log??console.log;
  const dir=opts.saveDir===null?null:opts.saveDir??SHARD_CFG.saveDir;
  this.seed=(opts.seed??(dir!==null?newestSeed(dir):undefined)??rollSeed())>>>0;
  const account=makeAccount();if(opts.open)openAccount(account);
  const fresh={account,seed:this.seed,keeperClass:CLASSES.find(c=>c.id===(opts.keeperClass??SHARD_CFG.keeper.classId))??CLASSES[0]};
  this.savePath=dir!==null?join(dir,`shard_${this.seed.toString(16).padStart(8,'0')}_native.json`):null;
  this.#store=this.savePath?new NativeShardStore(this.savePath):undefined;
  this.runtime=nearPolicy(()=>{if(this.#store)return this.#store.start(fresh,undefined,{openAccount:opts.open===true});const runtime=new NativeShardRuntime(fresh);runtime.install();return runtime;});
  const cleanup:(()=>void)[]=[];
  try {
  this.world=this.runtime.writer;this.account=this.world.account;
  const initial=this.runtime.current;this.coordinator=initial.combat.input.coordinator;this.#authority=initial.authority;
  const keeper=this.runtime.keeper;
  this.#hearth={zone:initial.combat.scene.zone.id,x:keeper.actor.pos.x,y:keeper.actor.pos.y,tier:keeper.actor.tier};
  this.net=new ShardTransport();this.net.log=this.#log;
  this.net.worldmass=false;this.net.worldName=(opts.name?.trim()||'Hollow Wake').slice(0,64);
  this.net.features=[...this.account.features];this.net.land=null;
  this.net.nameJoin=(name,classId,accountId,taken)=>shardHeroName(name,(CLASSES.find(c=>c.id===classId)??CLASSES[0]).name,accountId??classId,taken);
  this.net.setSeedSource(()=>this.seed);this.net.statusSource=()=>this.status();
  this.seats=new NativeShardSeats(this.runtime);
  this.parties=new PartyDesk(id=>!!this.seats.seatOf(id));
  const send=(msg:SessionMsg,id:string)=>this.net.sendSession(msg,id);
  const records=dir!==null?join(dir,`shard_${this.seed.toString(16).padStart(8,'0')}_native.records.json`):null;
  this.corpses=new ShardCorpses(this.seats,send,records,this.seed,this.#log);
  this.vessels=new VesselDesk(this.seats,send,this.corpses,{
   beatSec:SHARD_CFG.persistSec,log:this.#log,party:id=>this.parties.membersOf(id),
   onSeatGone:(id,name)=>{this.parties.seatFell(id,this.world.time,name);this.#graces.delete(id);this.#settleAll(true);},
   wake:seat=>this.#wakeAtHearth(seat),connected:id=>!this.net.isDormant(id),
  });
  this.presentation=new NativeAreaHostedPresentation(this.coordinator,seat=>this.corpses.forSeat(this.vessels.accountOf(seat.id),seat).map(c=>({zoneId:c.zoneId,...(c.map?{map:{...c.map}}:{}),name:c.name,classId:c.classId,level:c.level})));
  cleanup.push(()=>this.presentation.retire());
  this.frames=new NativeShardFrames(this.runtime,this.net,{
   deferRoadDrain:true,
   beforeSimulation:inputs=>{this.#phase('input grace',()=>this.#endGraces(inputs));this.runtime.maintainKeeper();},
   afterSimulation:(dt,frame,faults)=>{
    let simulationFailed=faults.some(f=>f.phase==='simulation'||f.phase==='before simulation');
    if(frame)try{this.#settleAll();}catch(error){simulationFailed=true;this.#fault('party scale',error);}
    this.#consecutiveFaults=simulationFailed?this.#consecutiveFaults+1:0;
    if(this.#consecutiveFaults>=SHARD_CFG.faultBreakerTicks)this.broken=true;
    this.#phase('muster',()=>this.musters.judge(this.world.time));
    this.#phase('roads',()=>this.#drainRoads());
    this.#phase('party',()=>{this.parties.sweep(this.world.time);this.#publishParties();});
    this.#phase('vessels',()=>this.vessels.tick(dt));
    this.#phase('corpses',()=>this.corpses.tick(dt));
    this.#phase('dormancy',()=>this.#sweepDormancy());
   },
   afterPublication:dt=>{this.#persistTimer-=dt;if(this.#store&&this.#persistTimer<=0){this.#persistTimer=SHARD_CFG.worldSaveSec;this.persist();}},
  });
  cleanup.push(()=>this.frames.retire());
  this.musters=new NativeShardMuster(this.runtime,this.parties,this.presentation,{standing:seat=>!seat.actor.dead&&!seat.actor.downed&&!this.net.isDormant(seat.id),log:this.#log});
  cleanup.push(()=>this.musters.retire());
  this.coordinator.installHostedRoadHooks({
   muster:(seat,road)=>this.musters.offer(seat,road),mustering:id=>this.musters.mustering(id),
   afterArrival:(seat,to,from)=>{
    seat.actor.untargetable=true;this.#graces.set(seat.id,Math.max(this.#graces.get(seat.id)??0,this.world.time+UNIT_CFG.arrivalGraceSec));
    from.combat.settleNearScale(true);to.combat.settleNearScale(true);
    this.world.metaDirty.add(seat.id);this.world.journalDirty.add(seat.id);
   },
  });
  this.world.partyMates=id=>this.parties.membersOf(id);
  this.world.dropRuleOf=id=>this.#dropRuleOf(id);
  this.world.partyDowns={release:id=>this.vessels.release(id),waitEnded:id=>this.vessels.waitEnded(id),view:id=>this.vessels.downView(id)};
  // THE OFFLINE HERO'S GROUND (W12, server/vessel.ts): the startup record's held ground stands back up in the desk, and the
  // keeper writer's checkpoint claims every hero's quest ground through the one serializeWorldState hook (capture reads it
  // live: the desk's reads ride NativeShardSeats, never the runtime's own door, so the busy capture is never re-entered).
  this.vessels.adoptGround(this.runtime.startupQuestGround);this.world.heldQuestGround=()=>this.vessels.groundLedger();
  this.net.reclaim=(account,char)=>this.vessels.dormantSeatOf(account,char,id=>this.net.isDormant(id));
  this.net.identitySeat=(account,char)=>this.vessels.seatOfIdentity(account,char);
  this.net.leaveHolds=id=>this.vessels.inCombat(id);
  this.#disposers.push(this.net.onPeerJoin((peer,upload)=>nearPolicy(()=>this.#onJoin(peer,upload))));
  this.#disposers.push(this.net.onPeerLeave(id=>nearPolicy(()=>this.#onLeave(id))));
  this.#disposers.push(this.net.onPeerDormant((id,worded,unload)=>nearPolicy(()=>this.#onDormant(id,worded,unload))));
  this.#disposers.push(this.net.onPeerResume(id=>nearPolicy(()=>this.#onResume(id))));
  this.#disposers.push(this.net.onPeerUnload(id=>nearPolicy(()=>this.#onUnload(id))));
  this.#disposers.push(this.net.onSession((msg,id)=>nearPolicy(()=>this.#onSession(msg,id))));  } catch(error) {
   for(const dispose of this.#disposers)try{dispose();}catch{}
   for(const dispose of cleanup.reverse())try{dispose();}catch{}
   try{if(this.#store)this.#store.close();else this.runtime.retire();}catch{}
   throw error;
  }
 }
 get keeper():Seat{return this.runtime.keeper;}
 async ready():Promise<void>{if(this.#closed||this.#closing||!this.runtime.ready)throw Error('Native shard host is not ready');}
 listen(port:number,host='0.0.0.0'):Promise<number> {
  if(this.#opening||this.#bound||this.#closing||this.#closed)return Promise.reject(Error('Native shard listener is already opening, open or closing'));
  const opening=(async()=>{await this.ready();if(this.#closing||this.#closed)throw Error('Native shard listener was cancelled before opening');
   const bound=await this.net.listen(port,host);
   try{if(this.#closing||this.#closed||!this.runtime.ready)throw Error('Native shard listener was cancelled during opening');this.#bound=true;return bound;}
   catch(error){await this.net.close();throw error;}
  })();
  this.#opening=opening;void opening.then(()=>{if(this.#opening===opening)this.#opening=undefined;},()=>{if(this.#opening===opening)this.#opening=undefined;});return opening;
 }
 areaOf(seat:Seat):NativeAreaSceneOngoing {
  const owner=this.#authority.require(seat.actor),area=this.coordinator.areaFor(owner.combat);
  this.#authority.assertFinalPhysical(area.binding,[seat.actor]);return area;
 }
 #settleAll(every=false):void {for(const area of this.coordinator.residentAreas())area.combat.settleNearScale(every);}
 #drainRoads():void {for(const row of this.runtime.current.combat.campaignFrame.drainShardRoads())if(row.outcome==='failed')this.#fault('road '+row.seatId,row.error);}
 #onJoin(peer:PeerInfo,upload?:ShardJoin):void {
  if(this.#closing||this.#closed)throw Error('Native shard is closing');if(this.seats.seatOf(peer.id))return;
  const seat=this.vessels.seat(peer,upload?.vessel);if(!seat)return;
  const vessel=this.vessels.vesselOf(peer.id);
  seat.actor.cosmeticLoadout=sanitizeCosmeticLoadout(peer.cosmeticLoadout);
  seat.actor.name=peer.name||(vessel?seat.meta.name:'')||seat.actor.name;
  this.#wakeAtHearth(seat);if(vessel)this.#returnTo(seat);
  this.parties.seatJoined(seat.id,this.vessels.accountOf(seat.id),this.world.time);
  this.world.metaDirty.add(seat.id);this.world.journalDirty.add(seat.id);this.#publishParties();
  this.#log(`[shard] ${seat.id} joined ${this.net.worldName} as ${seat.meta.classDef.id}`);
 }
 #onLeave(id:string):void {
  this.#dormancy.delete(id);this.#unloadGraces.delete(id);this.vessels.leave(id);this.#graces.delete(id);
  const seat=this.seats.seatOf(id),area=seat&&this.areaOf(seat);
  this.seats.within(id,w=>w.removeSeat(id));if(area)area.combat.settleNearScale(true);
  this.parties.dropSeat(id);this.#publishParties();
 }
 #wakeAtHearth(seat:Seat):void {
  const h=this.#hearth,area=this.areaOf(seat);
  if(area.combat.scene.zone.id!==h.zone){this.coordinator.roadsFor(area.combat).shardWorld!.enqueue({seatId:seat.id,dest:h.zone,landing:{at:{x:h.x,y:h.y},tier:h.tier}});this.#drainRoads();}
  else this.coordinator.landHostedSeat(seat,{x:h.x,y:h.y},{tier:h.tier});
  seat.actor.untargetable=true;this.#graces.set(seat.id,this.world.time+SHARD_CFG.spawnGraceSec);this.areaOf(seat).combat.settleNearScale(true);
 }
 returnLanding(stand:ShardStand):NativeReturnPlan {
  const spot=stand.spot;if(stand.seed!==(this.seed>>>0))return {kind:'hearth',why:'another world'};
  let mouth=false;
  if(stand.pocket){const p=stand.pocket,resident=this.coordinator.residentAreas().find(a=>a.combat.scene.zone.id===p.zoneId);
   if(resident&&this.world.caveMap[p.zoneId])return {kind:'area',dest:p.zoneId,at:{x:p.x,y:p.y},tier:p.tier,from:null,mouth:false,why:`in ${p.zoneId}`,...(spot.cave?{ladder:ladderOfSpot(spot)}:{})};mouth=true;
  }
  if(!this.world.zoneMap[spot.zoneId])return {kind:'hearth',why:'ground is no longer on the chart'};
  return {kind:'area',dest:spot.zoneId,at:{x:spot.x,y:spot.y+(mouth&&stand.tier<1?40:0)},tier:stand.tier,from:spot.entryFrom??null,mouth,why:mouth?'at its former pocket entrance':`in ${spot.zoneId}`};
 }
 #returnTo(seat:Seat):void {
  const read=this.vessels.standFor(seat.id);if('none' in read)return;
  const plan=this.returnLanding(read.stand);if(plan.kind==='hearth')return;
  const area=this.areaOf(seat),roads=this.coordinator.roadsFor(area.combat);
  if(area.combat.scene.zone.id===plan.dest){this.coordinator.landHostedSeat(seat,plan.at,{tier:plan.tier});if(plan.mouth)roads.arrive(seat,{seatId:seat.id,dest:plan.dest,grace:'caveExit'},plan.from);area.combat.settleNearScale(true);}
  else {roads.shardWorld!.enqueue({seatId:seat.id,dest:plan.dest,from:plan.from,landing:{at:plan.at,tier:plan.tier},...(plan.ladder?{ladder:plan.ladder}:{}),...(plan.mouth?{grace:'caveExit' as const}:{})});this.#drainRoads();}
 }
 #onDormant(id:string,_worded=false,unload=false):void {
  const seat=this.seats.seatOf(id);if(!seat||this.#graces.has(id)){this.net.release(id);return;}
  if(unload){seat.actor.untargetable=true;this.#unloadGraces.add(id);}
  this.#dormancy.set(id,this.world.time+(unload?SHARD_CFG.unloadGraceSec:SHARD_CFG.dormantSec));this.corpses.sleep(id);
 }
 #onUnload(id:string):void {
  const seat=this.seats.seatOf(id),until=this.#dormancy.get(id);if(!seat||until===undefined||this.#unloadGraces.has(id)||this.vessels.inCombat(id))return;
  seat.actor.untargetable=true;this.#unloadGraces.add(id);this.#dormancy.set(id,Math.min(until,this.world.time+SHARD_CFG.unloadGraceSec));
 }
 #onResume(id:string):void {
  this.#dormancy.delete(id);if(this.#unloadGraces.delete(id))this.#graces.set(id,this.world.time+SHARD_CFG.spawnGraceSec);
  if(!this.seats.seatOf(id))return;this.world.metaDirty.add(id);this.world.journalDirty.add(id);this.corpses.wake(id);this.vessels.resumed(id);
 }
 #sweepDormancy():void {for(const [id,until]of [...this.#dormancy])if(this.world.time>=until||!this.seats.seatOf(id)){this.#dormancy.delete(id);this.net.release(id);}}
 #endGraces(inputs:Map<string,PlayerInput>):void {
  for(const [id,until]of this.#graces){const input=inputs.get(id),willed=!!input&&(input.dx!==0||input.dy!==0||input.held.some(Boolean)||input.edge.some(Boolean)||(input.metaEdge?.some(Boolean)??false)||(input.moves?.some(m=>m[0]!==0||m[1]!==0)??false));if(!willed&&this.world.time<until)continue;this.#graces.delete(id);const seat=this.seats.seatOf(id);if(seat)seat.actor.untargetable=false;}
 }
 #onSession(msg:SessionMsg,from:string):void {
  if(this.#closing||this.#closed)return;
  if(msg.t==='cosmetics'){const loadout=sanitizeCosmeticLoadout(msg.loadout),peer=this.net.peers().find(p=>p.id===from);if(peer)peer.cosmeticLoadout=loadout;const seat=this.seats.seatOf(from);if(seat)(seat.home??seat.actor).cosmeticLoadout=loadout;}
  else if(msg.t==='rejoin'){if(this.seats.seatOf(from))return;const peer=this.net.peers().find(p=>p.id===from);this.net.sendSession({t:'newRun',seat:from,seed:this.seed},from);this.#onJoin({id:from,name:peer?.name??'Joiner',classId:msg.classId,isHost:false,cosmeticLoadout:peer?.cosmeticLoadout,accountId:this.vessels.accountOf(from)});}
  else if(msg.t==='leaving'){if(msg.unload===true)return;if(!this.vessels.inCombat(from))this.vessels.requestMirror(from);else {const seat=this.seats.seatOf(from);if(seat)this.areaOf(seat).quests.failNote(seat.actor,'leave:held',`${SHARD_LEAVE_WORD.held} for ${SHARD_CFG.dormantSec} s`);}}
  else if(msg.t==='party')this.#onParty(msg,from);
 }
 #onParty(msg:Extract<SessionMsg,{t:'party'}>,from:string):void {
  const now=this.world.time,id=typeof msg.seat==='string'?msg.seat:'';let word:string|null=null;
  switch(msg.op){
   case 'invite':{word=this.parties.invite(from,id,now);const invite=word?null:this.parties.inviteFor(id);if(invite)this.net.sendSession({t:'partyInvite',from,name:this.seats.seatOf(from)?.actor.name??from,until:invite.until,...(invite.party?{party:invite.party}:{})},id);break;}
   case 'accept':word=this.parties.accept(from,now);break;
   case 'decline':word=this.parties.decline(from);break;
   case 'leave':word=this.parties.leave(from);break;
   case 'kick':word=this.parties.kick(from,id);break;
   case 'rule':word=this.parties.setRule(from,msg.rule,msg.allocation);break;
   default:word='no such word';
  }
  if(word)this.net.sendSession({t:'partyWord',word},from);this.#publishParties();
 }
 #dropRuleOf(id:string):DropRule|null {if(!this.seats.seatOf(id))return null;const party=this.parties.ruleOf(id),base=party??SHARD_CFG.spoils;return {rule:base.rule,allocation:base.allocation,freeAfterSec:PARTY_CFG.freeAfterSec,...(party&&base.allocation==='rotate'?{deal:(inReach:readonly string[])=>this.parties.deal(id,inReach)}:{})};}
 #publishParties():void {if(this.#partyRev===this.parties.rev)return;this.#partyRev=this.parties.rev;this.world.partyRows=this.parties.rows();this.world.partyRev++;}
 #phase(name:string,fn:()=>void):void {try{fn();}catch(error){this.#fault(name,error);}}
 #fault(name:string,error:unknown,record=true):void {if(record&&this.#busy)this.#hostFaults.push({phase:name,error});this.faults++;this.#faultsSinceLog++;const now=Date.now();if(now-this.#lastFaultLog>=SHARD_CFG.faultLogSec*1000){this.#lastFaultLog=now;this.#log(`[shard] ${name}: ${this.#faultsSinceLog} faults; ${error instanceof Error?error.stack??error.message:String(error)}`);this.#faultsSinceLog=0;}}
 tick(dt:number,wallSeconds=dt):NativeShardTick {
  if(this.#busy||this.#closed||this.#closing||this.broken)throw Error('Native shard host cannot tick in its current state');this.#busy=true;this.#hostFaults.length=0;const start=performance.now();
  try {const result=nearPolicy(()=>this.frames.tick(dt,wallSeconds));this.ticks=result.tick;for(const fault of result.faults)this.#fault(fault.phase,fault.error,false);
   return this.#hostFaults.length?Object.freeze({...result,faults:Object.freeze([...result.faults,...this.#hostFaults])}):result;
  }finally {this.#busy=false;this.#tickMs.push(performance.now()-start);if(this.#tickMs.length>SHARD_CFG.telemetryTicks)this.#tickMs.shift();if(this.broken&&!this.#breakerNotified){this.#breakerNotified=true;this.onBroken?.();}}
 }
 persist():void {if(this.#closed)throw Error('Native shard host is closed');if(this.#store&&!this.broken)nearPolicy(()=>this.#store!.persist());}
 start():void {if(this.#closed||this.#closing||this.broken)throw Error('Native shard host is not running');if(this.#timer)return;this.#lastWall=performance.now();this.#accum=0;this.#timer=setInterval(()=>this.#pump(),1000/SHARD_CFG.tickHz);}
 #pump():void {
  if(this.broken||this.#closing)return;const now=performance.now();this.#accum+=(now-this.#lastWall)/1000;this.#lastWall=now;const dt=1/SHARD_CFG.tickHz,dropping=this.#accum-SHARD_CFG.maxCatchUpTicks*dt;let n=0;
  while(this.#accum>=dt&&n<SHARD_CFG.maxCatchUpTicks&&!this.broken&&!this.#closing){try{this.tick(dt,dt+(n===0&&dropping>=dt?dropping:0));}catch(error){this.#fault('pump',error);}this.#accum-=dt;n++;}
  if(n>=SHARD_CFG.maxCatchUpTicks&&this.#accum>=dt){this.droppedTicks+=Math.floor(this.#accum/dt);this.#accum=0;}
 }
 status():Record<string,unknown> {
  const ms=[...this.#tickMs].sort((a,b)=>a-b),q=(p:number)=>ms.length?+ms[Math.min(ms.length-1,Math.floor(p*ms.length))].toFixed(2):0;
  return {world:'retained native',zone:this.runtime.current.combat.scene.zone.id,seed:'0x'+this.seed.toString(16).padStart(8,'0'),clock:+this.world.time.toFixed(1),uptimeSec:Math.round((Date.now()-this.#bootAt)/1000),parties:this.parties.rows(),
   seats:this.seats.allSeats().map(seat=>({id:seat.id,name:seat.actor.name,level:seat.actor.level,alive:!seat.actor.dead&&!seat.actor.downed,unit:this.areaOf(seat).combat.scene.zone.id,...(this.#dormancy.has(seat.id)?{dormant:true,dormantLeftSec:Math.max(0,this.#dormancy.get(seat.id)!-this.world.time)}:{})})),
   units:this.coordinator.residentAreas().map(area=>({zone:area.combat.scene.zone.id,actors:area.combat.scene.actors.length})),musters:this.musters.status(this.world.time),connections:this.net.connectionCount(),ticks:this.ticks,tickMsP50:q(.5),tickMsP95:q(.95),droppedTicks:this.droppedTicks,faults:this.faults+this.net.faults,saving:this.savePath?basename(this.savePath):'ephemeral',broken:this.broken};
 }
 stop(opts:{persist?:boolean}={}):Promise<void> {
  if(this.#stopping)return this.#stopping;if(this.#busy)return Promise.reject(Error('Native shard cannot stop inside a frame'));this.#closing=true;if(this.#timer){clearInterval(this.#timer);this.#timer=null;}
  return this.#stopping=(async()=>{let failed=false,first:unknown;const run=(fn:()=>void)=>{try{nearPolicy(fn);}catch(error){if(!failed){failed=true;first=error;}}};
   if(opts.persist!==false)run(()=>this.persist());run(()=>{this.vessels.mirrorAll();});
   const opening=this.#opening;if(opening)try{await opening;}catch{}
   try{await this.net.close();}catch(error){if(!failed){failed=true;first=error;}}
   for(const dispose of this.#disposers)run(dispose);run(()=>this.frames.retire());run(()=>this.musters.retire());run(()=>this.presentation.retire());
   run(()=>{if(this.#store)this.#store.close();else this.runtime.retire();this.#closed=true;});if(failed)throw first;
  })();
 }
}
