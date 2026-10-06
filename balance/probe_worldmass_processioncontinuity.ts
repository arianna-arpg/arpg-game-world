import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { PROCESSION_CFG } from '../src/data/processions';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { massDormancyPins, nativeActorQuietRefusal, nativeDormancyRefusal } from '../src/worldmass/dormancy';
import { Rng } from '../src/core/rng';
import type { Vec2 } from '../src/core/math';
import { layTraveledWay, type Doodad } from '../src/engine/levelgen';
import { TILESETS } from '../src/data/tilesets';
import type { ZoneDef } from '../src/data/zones';
import { MassHierarchy, MASS_HIERARCHY_DEFAULT, type MassHierarchySave } from '../src/worldmass/hierarchy';
import { MassProcessions, type MassProcessionHost, type MassProcessionPopulationSave, type MassProcessionProgress } from '../src/worldmass/processions';
import { address, localOffset, type MassAddress } from '../src/worldmass/address';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { nativeGeographicSelectionReceipt } from '../src/worldmass/geographicObjectiveChoice';
import { compileProcessionPlan, PROCESSION_PLAN_COMPILER, PROCESSION_ROUTE_POLICY, type ProcessionPlanInput } from '../src/worldmass/processionPlan';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure, MASS_ZONE, type MassAdventure } from '../src/worldmass/preset';
import type { World, ZoneExit } from '../src/engine/world';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { canonical } from '../src/worldmass/random';

/** Independent native prerequisite, not an adapter implementation mock. The
 * real target scanner must release untargetable cargo itself; its threat
 * ledger and foreign leases must remain until their native owners release. */
const undo = seedGlobalRandom(901751);
try {
  const w = makeSimWorld('warrior', 901751);
  w.time = 100;
  w.player.pos = { x: -10000, y: -10000 };
  const cart = w.createMonster(PROCESSION_CFG.cartId, 7, 'player');
  const robber = w.createMonster('bandit_cutthroat', 7, 'enemy');
  cart.pos = { x: 800, y: 700 }; robber.pos = { x: 880, y: 700 };
  cart.tag = 'procession_cart'; cart.eventKey = 'native-target-loss';
  robber.tag = 'procession_robber'; robber.eventKey = cart.eventKey;
  robber.aiTuning = { target: { prefer: 'highestThreat', relentless: true,
    stickiness: PROCESSION_CFG.fixation.stickiness,
    threat: { damage: 1, decay: PROCESSION_CFG.fixation.decay } } };
  robber.aiTargetId = cart.id; robber.aiTargetRef = cart;
  robber.aggroed = true; robber.aiAwakened = true;
  robber.threat.set(cart.id, PROCESSION_CFG.fixation.seedThreat);
  w.actors.push(cart, robber); w.actorGridRev++;
  const wound = cart.life = cart.maxLife() * .71;
  cart.untargetable = true; cart.invulnerable = true;
  w.time += .1; updateAI(robber, w, .1);
  assert.equal(robber.aiTargetId, w.player.id, 'native relentless scan may acquire the distant hero; absence cannot force quiet');
  assert.notEqual(robber.aiTargetRef, cart);
  // Exclude the remaining prey only to isolate the native loss bookkeeping.
  // This is a prerequisite rig, not a claim far departure grants concealment.
  w.player.untargetable = true;
  w.time += .1; updateAI(robber, w, .1);
  assert.equal(robber.aiTargetId, undefined);
  assert.equal(robber.aiTargetRef, undefined);
  assert.equal(robber.aggroed, false);
  assert.ok(robber.threat.get(cart.id)! > 0, 'native loss must not erase its live grudge ledger');
  assert.ok(robber.threat.get(cart.id)! < PROCESSION_CFG.fixation.seedThreat);
  assert.equal(cart.life, wound);
  assert.ok(w.actors.includes(cart) && w.actors.includes(robber));
  // This actor is explicitly outside the convoy. Numeric Map keys are real
  // inbound native dependencies even after its direct prey lock goes away.
  const cartOnly = new Map([['cart', cart]]);
  assert.ok(massDormancyPins(w, cartOnly).has(cart));
  for (let frame = 0; frame < 1800 && robber.threat.size; frame++) {
    w.time += .1; updateAI(robber, w, .1);
  }
  assert.equal(robber.threat.has(cart.id), false, 'only the native threat decay closes this lease');
  assert.ok(w.time > 180, 'quiet retirement is not an immediate permission to discard pressure');
  assert.equal(cart.life, wound);
  console.log('PASS real native untargetable loss drops held target through AI, preserves wounds and foreign threat until native decay');
  // The shared proof grants no factory/team eligibility. It is exactly the
  // original quiet-state tail and is usable only after caller-owned admission.
  cart.fromZoneGen = true;
  assert.equal(nativeDormancyRefusal(cart, w, 15), 'not a living native enemy');
  assert.equal(nativeDormancyRefusal(w.player, w, 15), 'not a living native enemy');
  assert.equal(nativeActorQuietRefusal(cart, w, 15), null);
  cart.threat.set(robber.id, 1);
  assert.equal(nativeActorQuietRefusal(cart, w, 15), 'engaged or returning');
  cart.threat.delete(robber.id);
  cart.useLock = 1;
  assert.equal(nativeActorQuietRefusal(cart, w, 15), 'committed movement or action');
  cart.useLock = 0;
  cart.lifespan = 1;
  assert.equal(nativeActorQuietRefusal(cart, w, 15), 'live native timer');
  cart.lifespan = 0;
  cart.cooldowns.set('firebolt', 3);
  assert.equal(nativeActorQuietRefusal(cart, w, 15), 'live native skill');
  cart.cooldowns.delete('firebolt');
  assert.equal(nativeActorQuietRefusal(cart, w, 15), null);
  console.log('PASS shared quiet proof retains native threats/actions/timers/cooldowns while ordinary non-enemies stay excluded');
} finally { undo(); }

// Controlled native component rig. It uses the real cart/ambush factories,
// native road emitter and compiled dry route; production lottery/CharacterSave
// and actual country collisions are verified separately below/in the browser.
const componentUndo = seedGlobalRandom(713741);
try {
 const seed=81,base=massAdventure(),config:MassAdventure={terrain:{id:'procession-continuity-flat',version:1,addressSpan:960,terrainCell:24,
  fields:[],places:[],surfaces:[{id:'ground',priority:0,when:[],region:'ground',color:'#445533',biome:'field'}]},
  theme:base.theme,content:[],startRadius:0,populationRadius:600,maxPopulation:24,pageRadius:1,samplesPerTick:256};
 const source=nativeMassProcessionSources().find(r=>r.tileset==='grassland')!;assert.ok(source);
 const clone=<T>(v:T):T=>JSON.parse(canonical(v)) as T;
 function rig(saved?:MassHierarchySave,at?:Vec2){
  const w=makeSimWorld('warrior',713741),runtime=new WorldMassRuntime(seed,'procession-continuity',config);runtime.attach(w);w.time=100;
  const hierarchy=new MassHierarchy(runtime.generator.run.runId,seed,960,MASS_HIERARCHY_DEFAULT,[],saved),manager=new MassProcessions(hierarchy);
  const frame={...runtime.origin,x:0,y:0},local=(a:MassAddress)=>localOffset(a,frame,960),state={limit:24,payments:0,wrecks:0};
  if(at)w.player.pos={...at};
  const host:MassProcessionHost={world:w,get now(){return w.time;},local,address:p=>runtime.walk.at(p.x,p.y),
   availablePopulation:owner=>{const own=new Set(manager.views().flatMap(v=>[...manager.actors(v.owner).values()]));
    return state.limit-manager.population-manager.reservedPopulation(owner)-w.actors.filter(a=>a!==w.player&&!a.dead&&!own.has(a)).length;},
   createCart:r=>w.createMassProcessionCart(r),createAmbush:r=>w.createMassProcessionAmbush(r),
   reachable:(p,c,r)=>w.massProcessionReachable(p,c,r),steering:(_c,to)=>to,
   installRoad:(_owner,rows)=>{const placed=rows.map(({at,doodad})=>({...clone(doodad),pos:local(at)}));w.doodads.push(...placed);w.markDoodadsChanged();return()=>{const own=new Set(placed);w.doodads=w.doodads.filter(d=>!own.has(d));w.markDoodadsChanged();};},
   installChest:(owner,chest)=>w.installMassObjectiveChest(owner,chest),
   complete:(owner,zone)=>{state.payments++;w.completeMassObjective(owner,zone,'');},
   wreck:(_owner,zone,pos,seed,source)=>{state.wrecks++;w.spillMassObjectiveGem(zone,pos,seed,source);}};
  const progress=(id:string)=>{manager.capture(host);return hierarchy.controller(id,'objective:procession')!.state as MassProcessionProgress;};
  const population=(id:string)=>{manager.capture(host);return hierarchy.controller(id,'objective:procession:population')!.state as MassProcessionPopulationSave;};
  return{w,runtime,hierarchy,manager,local,host,state,progress,population};
 }
 const r=rig(),candidates:ProcessionPlanInput[]=[];
 for(let x=0;x<100&&candidates.length<2;x++){
  const owner=r.hierarchy.at(address('surface','0','0',x*5400+2700,2700,960)).zone,selection=[clone(source)],receipt=nativeGeographicSelectionReceipt(seed,owner.id,selection);if(!receipt.selected)continue;
  const ts=TILESETS[source.tileset!],zone:ZoneDef={id:owner.id,name:'Native continuity caravan',level:7,size:{w:5400,h:5400},theme:clone(ts.theme),
   objective:{kind:'procession'},tileset:ts.id,biome:ts.biome,map:{x,y:0},exits:[],layout:[],packs:clone(ts.packs)};
  candidates.push({compiler:PROCESSION_PLAN_COMPILER,policy:PROCESSION_ROUTE_POLICY,run:r.runtime.generator.run,terrain:config.terrain,owner,
   context:resolveMassProcessionContext(zone,source,7),selection,selectionReceipt:receipt,regions:{ground:{walkable:true,dry:true}},patches:[],reservations:{revision:'controlled-empty',circles:[],boxes:[],capsules:[]}});
 }
 assert.equal(candidates.length,2,'actual source lottery supplies two controlled owners');
 const plans=candidates.map(input=>{const prepared=compileProcessionPlan(input,r.runtime.generator);assert.ok(prepared.plan,prepared.refusal??'route');
  const ctx={rng:new Rng(4131),walk:r.runtime.walk,doodads:[] as Doodad[],reserved:[] as {pos:Vec2;radius:number}[],overgrowth:0};
  const roads=layTraveledWay(ctx,prepared.plan.points.map(r.local),{overgrowth:input.context.config.road.overgrowth});
  return{input,route:prepared.plan,roads:roads.map(({pos,...doodad})=>({at:r.host.address(pos),doodad}))};});
 const admit=(q:typeof plans[number])=>{r.w.player.pos=r.local(q.route.entry);return r.manager.admit(q.input.owner,q.input.context,q.route,r.host,
  r.manager.chestWanted(q.input.owner,q.input.context)?q.route.destination:undefined,q.roads);};
 // Fail actual installation seams after detached native factories have run.
 // No failed new owner may poison the authoritative hierarchy before retry.
 const chestPlan=plans.find(q=>r.manager.chestWanted(q.input.owner,q.input.context));assert.ok(chestPlan,'native lottery supplies a chest-bearing owner for rollback proof');
 for(const seam of ['road','chest'] as const){
  const q:typeof plans[number]=chestPlan;const fail=rig(),bodies=[...fail.w.actors],decor=[...fail.w.doodads];fail.w.player.pos=fail.local(q.route.entry);
  const road=fail.host.installRoad,chest=fail.host.installChest;if(seam==='road')fail.host.installRoad=()=>{throw Error('injected native road failure');};else fail.host.installChest=()=>{throw Error('injected native chest failure');};
  assert.throws(()=>fail.manager.admit(q.input.owner,q.input.context,q.route,fail.host,q.route.destination,q.roads),/injected native/);
  assert.deepEqual(fail.w.actors,bodies);assert.deepEqual(fail.w.doodads,decor);assert.equal(fail.manager.population,0);assert.equal(fail.manager.has(q.input.owner.id),false);
  for(const suffix of ['',':population',':chest'])assert.equal(fail.hierarchy.controller(q.input.owner.id,'objective:procession'+suffix),undefined,'failed installation cannot publish a save owner');
  fail.host.installRoad=road;fail.host.installChest=chest;assert.ok(fail.manager.admit(q.input.owner,q.input.context,q.route,fail.host,q.route.destination,q.roads));assert.equal(fail.manager.population,1);
 }
 console.log('PASS actual native road/chest installation failure leaves no actor/scenery/controller authority and retries once');
 for(const count of [127,128,124]){
  const q:typeof plans[number]=chestPlan;const full=rig();full.w.player.pos=full.local(q.route.entry);let callbacks=0;const create=full.host.createCart,road=full.host.installRoad;
  full.host.createCart=request=>{callbacks++;return create(request);};full.host.installRoad=(owner,rows)=>{callbacks++;return road(owner,rows);};
  for(let i=0;i<count;i++)full.hierarchy.enroll(q.input.owner,'capacity-fixture:'+i,'continuity-capacity',{},null,full.w.time);
  const accepted=full.manager.admit(q.input.owner,q.input.context,q.route,full.host,q.route.destination,q.roads);
  if(count>=127){assert.equal(accepted,false);assert.equal(callbacks,0);assert.equal(full.hierarchy.controllerCount(q.input.owner.id),count);assert.equal(full.manager.population,0);}
  else{assert.equal(accepted,true);assert.equal(full.hierarchy.controllerCount(q.input.owner.id),127);full.hierarchy.enroll(q.input.owner,'procession-access','continuity-capacity',{},null,full.w.time);assert.equal(full.hierarchy.controllerCount(q.input.owner.id),128);assert.equal(full.manager.population,1);}
 }
 console.log('PASS full owner controller budget refuses before native callbacks; exact remaining capacity includes the facade access record');
 r.state.limit=9;assert.equal(admit(plans[0]),false);assert.equal(r.manager.population,0);assert.equal(r.hierarchy.controller(plans[0].input.owner.id,'objective:procession'),undefined);
 r.state.limit=20;assert.ok(admit(plans[0]));assert.ok(admit(plans[1]));assert.equal(r.manager.population,2);assert.equal(r.manager.reservedPopulation(),18);assert.equal(r.host.availablePopulation(),0);
 const first=plans[0],id=first.input.owner.id,cart=[...r.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!;assert.ok(cart);assert.equal(cart.team,'player');
 r.w.player.pos={...cart.pos};cart.life*=.63;cart.evadeEntropy=.37;cart.essenceSpilled=4;cart.spillBank=.23;
 const quiet=r.population(id),quietCart=quiet.births[0].bodies[0];assert.ok(quietCart.state);assert.equal(quiet.transient.includes(quietCart.key),false);
 const save=r.hierarchy.snapshot(),resumed=rig(save,cart.pos);resumed.w.time=r.w.time;
 for(let i=0;i<31;i++)resumed.w.createMonster('zombie',1,'enemy');
 resumed.manager.sync([first.input.owner],resumed.host);const restored=[...resumed.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!;
 assert.ok(restored&&restored!==cart&&restored.id!==cart.id);assert.equal(restored.life,cart.life);assert.equal(restored.evadeEntropy,.37);assert.equal(restored.essenceSpilled,4);assert.equal(restored.spillBank,.23);
 assert.deepEqual(restored.sheet,cart.sheet);assert.equal(resumed.manager.reservedPopulation(),9);
 console.log('PASS two source-owned native carts share funded capacity; exact quiet cart sheet/resources/wounds survive remapped reconstruction');
 // The mutable population state must never turn an exact body into a foreign
 // controller or admit a terminal contradiction under a coherent owner header.
 const bad=clone(save),row=bad.owners.find(x=>x.owner.id===id)!,pop=row.controllers.find(x=>x.id==='objective:procession:population')!.state as MassProcessionPopulationSave;
 const root=pop.births[0].bodies[0].state!,node=root.nodes[0],event=node.entries.find(([k])=>k==='eventKey')!;assert.ok(event);event[1]='procession:foreign';
 const broken=rig(bad,cart.pos);const before=broken.w.actors.length;assert.throws(()=>broken.manager.sync([first.input.owner],broken.host),/procession|ownership|body/i);assert.equal(broken.w.actors.length,before);
 console.log('PASS exact saved cart ownership tampering refuses before actor publication');
 const advance=(q:ReturnType<typeof rig>,dt:number,move=0)=>{q.w.time+=dt;q.manager.update(move,q.host);};
 const rally=(q:ReturnType<typeof rig>,id:string)=>{const a=[...q.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!;q.w.player.pos={...a.pos};
  advance(q,PROCESSION_CFG.entryGraceSec+.001);assert.equal(q.progress(id).rolling,false);advance(q,1);assert.equal(q.progress(id).rolling,true);return a;};
 rally(resumed,id);const waiting=resumed.progress(id),smokeBefore=resumed.w.flashes.filter(f=>f.radius===42).length;
 advance(resumed,waiting.puffRemaining!+.001);const wave=resumed.population(id),robbers=[...resumed.manager.actors(id).values()].filter(a=>a.tag==='procession_robber');
 assert.ok(robbers.length>=2&&robbers.length<=3);assert.equal(resumed.w.flashes.filter(f=>f.radius===42).length-smokeBefore,robbers.length);
 assert.equal(resumed.manager.population+resumed.manager.reservedPopulation(),10);assert.ok(robbers.every(a=>a.aiTargetId===restored.id&&a.threat.has(restored.id)));
 robbers[0].life*=.61;const hurt=robbers[0].life,activeSave=(()=>{resumed.manager.capture(resumed.host);return resumed.hierarchy.snapshot();})();
 assert.ok(wave.transient.length>=robbers.length,'active native bodies explicitly use the native baseline lane');
 const active=rig(activeSave,restored.pos);active.w.time=resumed.w.time;for(let i=0;i<61;i++)active.w.createMonster('zombie',1,'enemy');active.manager.sync([first.input.owner],active.host);
 const activeCart=[...active.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!,activeRobbers=[...active.manager.actors(id).values()].filter(a=>a.tag==='procession_robber');
 assert.notEqual(activeCart.id,restored.id);assert.equal(activeCart.life,restored.life);assert.equal(activeRobbers[0].life,hurt);
 assert.deepEqual(activeRobbers.map(a=>a.defId),robbers.map(a=>a.defId));assert.ok(activeRobbers.every(a=>a.aiTargetId===activeCart.id&&a.threat.has(activeCart.id)&&!a.threat.has(restored.id)));
 assert.equal(active.progress(id).rolling,false);assert.equal(active.w.flashes.filter(f=>f.radius===42).length,0,'Continue never replays smoke births');
 console.log('PASS reserved complete native ambush, one smoke per actual birth and wounded active Continue with new-cart target/threat IDs');
 const flyer=activeRobbers[0],flightBefore=active.w.projectiles.length;active.w.executeSkill(flyer,makeSkillInstance(SKILLS.firebolt,1),{x:flyer.pos.x+900,y:flyer.pos.y});
 assert.ok(active.w.projectiles.length>flightBefore,'real native skill emits its ordinary projectile');assert.ok(massDormancyPins(active.w,active.manager.actors(id)).has(flyer),'live native projectile keeps its owned caster graph resident');
 active.w.player.pos={x:activeCart.pos.x+10000,y:activeCart.pos.y};active.manager.sync([],active.host);assert.ok(active.w.actors.includes(flyer));assert.ok(active.w.projectiles.length>flightBefore,'departure cannot erase the native flight');
 console.log('PASS real native projectile pins its owned robber caster across far departure without deleting the flight');
 // A foreign owner keeps the SAME quiet body resident across departure. The
 // return grace must still restart on real return, independent of unloading.
 const held=rig(save,cart.pos);held.w.time=200;held.manager.sync([first.input.owner],held.host);const heldCart=[...held.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!;
 const lease={caster:heldCart};Reflect.set(held.w,'processionContinuityForeignLease',lease);
 rally(held,id);const leaveClock=held.w.time;held.w.player.pos={x:heldCart.pos.x+10000,y:heldCart.pos.y};held.manager.sync([],held.host);
 assert.ok(held.manager.actors(id).get(quietCart.key)===heldCart);assert.equal(held.progress(id).away,true);assert.equal(held.progress(id).rolling,false);assert.ok(heldCart.invulnerable&&heldCart.untargetable);
 advance(held,20);held.manager.sync([],held.host);assert.ok(held.w.actors.includes(heldCart));assert.equal(held.progress(id).enteredAt,leaveClock-PROCESSION_CFG.entryGraceSec-1.001,'departure does not repeatedly reset native entered clock');
 held.w.player.pos={...heldCart.pos};held.manager.update(0,held.host);const returnedAt=held.w.time;assert.equal(held.progress(id).enteredAt,returnedAt);assert.equal(held.progress(id).away,false);
 advance(held,2.4);assert.equal(held.progress(id).rolling,false);advance(held,.11);assert.equal(held.progress(id).rolling,false);advance(held,.91);assert.equal(held.progress(id).rolling,true);
 assert.equal(held.manager.actors(id).get(quietCart.key),heldCart);assert.equal(heldCart.life,cart.life);Reflect.deleteProperty(held.w,'processionContinuityForeignLease');
 console.log('PASS actual foreign lease retains identical cart; true return restarts grace even when retirement never occurred');
 // Native kill -> immediate capture, with no controller update in between.
 const loss=rig(save,cart.pos);loss.w.time=300;loss.manager.sync([first.input.owner],loss.host);const lostCart=[...loss.manager.actors(id).values()].find(a=>a.tag==='procession_cart')!;
 const xp=loss.w.meta.xp;loss.w.kill(lostCart,false,loss.w.player);loss.manager.capture(loss.host);assert.equal(loss.progress(id).lost,true);assert.equal(loss.progress(id).done,false);
 assert.equal(loss.state.wrecks,1);assert.equal(loss.state.payments,0);assert.equal(loss.w.meta.xp,xp);const lossSave=loss.hierarchy.snapshot();
 loss.manager.capture(loss.host);loss.manager.update(10,loss.host);assert.equal(loss.state.wrecks,1);
 const afterLoss=rig(lossSave,cart.pos);afterLoss.w.time=loss.w.time;afterLoss.manager.sync([first.input.owner],afterLoss.host);afterLoss.manager.update(0,afterLoss.host);
 assert.equal(afterLoss.progress(id).lost,true);assert.equal(afterLoss.state.wrecks,0);assert.equal(afterLoss.state.payments,0);assert.equal([...afterLoss.manager.actors(id).values()].filter(a=>!a.dead&&a.tag==='procession_cart').length,0);
 const contradiction=clone(lossSave),terminal=contradiction.owners.find(x=>x.owner.id===id)!,terminalPop=terminal.controllers.find(x=>x.id==='objective:procession:population')!.state as MassProcessionPopulationSave;
 terminalPop.births[0].bodies[0].dead=false;terminalPop.births[0].bodies[0].life=cart.life;delete terminalPop.births[0].bodies[0].state;terminalPop.transient.push(terminalPop.births[0].bodies[0].key);
 assert.throws(()=>rig(contradiction,cart.pos),/terminal|contradictory|checkpoint/i);
 console.log('PASS native cart death immediately before capture produces one wreck, no victory and durable loss without resurrection');
 const linger=rig(save,cart.pos);linger.w.time=400;linger.manager.sync([first.input.owner],linger.host);const lingerCart=rally(linger,id);
 linger.manager.update(0,linger.host);const scout=linger.w.createMonster('zombie',1,'enemy');scout.pos={...lingerCart.pos};assert.ok(linger.w.lureFor(scout));
 linger.w.player.pos={x:lingerCart.pos.x+10000,y:lingerCart.pos.y};linger.manager.sync([],linger.host);assert.ok(linger.w.actors.includes(lingerCart));assert.ok(linger.w.lureFor(scout),'native lure remains until its actual deadline');
 advance(linger,.61);assert.equal(linger.w.lureFor(scout),null);advance(linger,.4);linger.manager.sync([],linger.host);
 assert.equal(linger.manager.actors(id).size,0);assert.equal(linger.w.actors.includes(lingerCart),false);assert.equal(linger.manager.reservedPopulation(),0);
 linger.w.player.pos=linger.local(first.route.destination);assert.ok(Math.hypot(linger.w.player.pos.x-lingerCart.pos.x,linger.w.player.pos.y-lingerCart.pos.y)>linger.manager.policy.departRadius);linger.manager.sync([first.input.owner],linger.host);assert.equal(linger.manager.actors(id).size,0,"same geographic owner cannot immediately remount a truly far cart");
 linger.w.player.pos={...lingerCart.pos};linger.manager.sync([first.input.owner],linger.host);assert.equal(linger.progress(id).rolling,false);assert.equal(linger.progress(id).enteredAt,linger.w.time);
 console.log('PASS native owned lure lasts through departure, naturally expires before exact retirement, and cold return restarts native grace');
 // Controller-only terminal seam: place the real cart at its certified end.
 // The browser separately proves native walking across the complete road.
 const win=rig(save,cart.pos);win.w.time=500;win.manager.sync([first.input.owner],win.host);const winningCart=rally(win,id),winXp=win.w.meta.xp,winKills=win.w.kills;
 winningCart.pos=win.local(first.route.destination);win.w.player.pos={...winningCart.pos};win.manager.update(0,win.host);assert.equal(win.progress(id).done,true);assert.equal(win.progress(id).lost,false);
 assert.equal(win.state.payments,1);assert.equal(win.state.wrecks,0);assert.ok(win.w.meta.xp>winXp);assert.equal(win.w.kills,winKills,'successful cargo disappearance never uses kill');
 win.manager.capture(win.host);const won=win.hierarchy.snapshot();const afterWin=rig(won,winningCart.pos);afterWin.w.time=win.w.time;afterWin.manager.sync([first.input.owner],afterWin.host);afterWin.manager.update(0,afterWin.host);
 assert.equal(afterWin.progress(id).done,true);assert.equal(afterWin.state.payments,0);assert.equal(afterWin.state.wrecks,0);assert.equal([...afterWin.manager.actors(id).values()].filter(a=>a.tag==='procession_cart'&&!a.dead).length,0);
 console.log('PASS source reward at terminal arrival once, no cargo kill/wreck, and completed owner cannot republish or repay on restore');


} finally { componentUndo(); }

// Full authority boundary: real production lottery, source, terrain, scene
// proof and native factories. Only initial arrival/cave travel and timing are
// controlled here; the browser proves the physical multi-chunk escort.
const countryUndo=seedGlobalRandom(713);
try{
 const fresh=(seed:number)=>makeSimWorld('warrior',seed); // native default settlement includes its cellar house
 let w=fresh(713);w.startWorldMass(713);let m=w.massRuntime!,g=m.geography!,binding=g.caravans;
 const location=address('surface','0','0',4*5400+2700,-2*5400+2700,960),candidate=g.processionPlannedAt(location);assert.ok(candidate);
 const local=(at:MassAddress)=>localOffset(at,{...m.origin,x:0,y:0},960),entry=local(candidate.entry);w.landPartyAt({x:entry.x-300,y:entry.y});m.update(w,true);
 for(let n=0;n<5000&&!binding.processions.actors(candidate.owner.id).size;n++){w.time+=.02;m.update(w);binding.update(w,0);if(n%100===0){const pending=g.processionPlannedAt(location);if(pending){const p=local(pending.entry);if(Math.hypot(p.x-w.player.pos.x,p.y-w.player.pos.y)>1300)w.landPartyAt({x:p.x-300,y:p.y});}}}
 const id=candidate.owner.id;assert.ok(binding.processions.actors(id).size,'real natural cart must pass current whole route admission '+JSON.stringify(binding.warmStats));
 const definition=canonical(binding.processions.definition(id)),cart=[...binding.processions.actors(id).values()].find(a=>a.tag==='procession_cart')!;assert.ok(cart);
 const step=(dt:number)=>{w.time+=dt;binding.update(w,0);};
 w.player.pos={...cart.pos};step(PROCESSION_CFG.entryGraceSec+.001);step(1);assert.ok(binding.processions.views().find(v=>v.owner===id)!.rolling);
 g.snapshot();const c=g.hierarchy.controller(id,'objective:procession')!.state as MassProcessionProgress;step(c.puffRemaining!+.001);
 const wave=[...binding.processions.actors(id).values()].filter(a=>a.tag==='procession_robber');assert.ok(wave.length>=2);assert.ok(wave.every(a=>a.fromZoneGen&&a.aiTargetId===cart.id&&a.threat.has(cart.id)));
 cart.life*=.67;wave[0].life*=.73;const cartLife=cart.life,robberLife=wave[0].life,cartPosition={...cart.pos};
 const population=(world:World)=>{const geo=world.massRuntime!.geography!;geo.snapshot();return geo.hierarchy.controller(id,'objective:procession:population')!.state as MassProcessionPopulationSave;};
 const signature=(p:MassProcessionPopulationSave)=>p.births.map(b=>({kind:b.kind,sequence:b.sequence,seed:b.seed,bodies:b.bodies.map(a=>({key:a.key,monster:a.monster,dead:a.dead,at:a.at,life:a.life}))}));
 const before=signature(population(w)),save=serializeCharacter(w);assert.ok(save.world!.memory!.every(row=>row.zoneId!==MASS_ZONE));
 const resumed=fresh(714);assert.ok(applySavedCharacter(resumed,save));assert.ok(resumed.adoptWorldState(save.world));resumed.startWorldMass(713,save.world!.worldmass);w=resumed;m=w.massRuntime!;g=m.geography!;binding=g.caravans;
 assert.equal(canonical(binding.processions.definition(id)),definition);assert.deepEqual(signature(population(w)),before);
 const nextCart=[...binding.processions.actors(id).values()].find(a=>a.tag==='procession_cart')!,nextWave=[...binding.processions.actors(id).values()].filter(a=>a.tag==='procession_robber');
 assert.equal(nextCart.life,cartLife);assert.equal(nextWave[0].life,robberLife);assert.notEqual(nextCart.id,cart.id);assert.ok(nextWave.every(a=>a.aiTargetId===nextCart.id&&a.threat.has(nextCart.id)&&!a.threat.has(cart.id)));assert.equal(binding.processions.views().find(v=>v.owner===id)!.rolling,false);
 type Mouth={pos:Vec2;kind:string;seed:number;mouthTier?:number};type CaveAccess={caveEntrances:Mouth[];enterSidezone(cm:Mouth):void;travelThrough(e:ZoneExit):void};const caves=(world:World)=>world as unknown as CaveAccess;
 const hatch=caves(w).caveEntrances.find(e=>e.kind==='cellar_hatch');assert.ok(hatch,'real native settlement hatch');w.landPartyAt(hatch.pos);m.update(w,true);caves(w).enterSidezone(hatch);assert.ok(w.inCave);assert.equal(w.massRuntime,null);
 const caveSave=serializeCharacter(w);assert.ok(caveSave.world!.massSideareas?.active);assert.ok(caveSave.world!.memory!.every(row=>row.zoneId!==MASS_ZONE));
 assert.ok(caveSave.world!.memory!.flatMap(row=>row.enemies).every(a=>a.tag!=='procession_robber'),'boundless native ambushes must not duplicate into finite ZoneMemory');
 const fromCave=fresh(715);assert.ok(applySavedCharacter(fromCave,caveSave));assert.ok(fromCave.adoptWorldState(caveSave.world));fromCave.startWorldMass(713,caveSave.world!.worldmass);assert.ok(fromCave.restoreMassSideareas(caveSave.world!.massSideareas));assert.ok(fromCave.inCave);assert.equal(fromCave.massRuntime,null);
 const exit=fromCave.exits.find(e=>e.to===MASS_ZONE);assert.ok(exit);caves(fromCave).travelThrough(exit);assert.ok(fromCave.massRuntime);w=fromCave;m=w.massRuntime!;g=m.geography!;binding=g.caravans;
 w.landPartyAt(cartPosition);m.update(w,true);w.time+=.51;binding.sync(w);binding.update(w,0);
 assert.deepEqual(signature(population(w)),before);assert.equal(canonical(binding.processions.definition(id)),definition);
 const owners=[...binding.processions.actors(id).values()],liveCart=owners.find(a=>a.tag==='procession_cart')!,liveWave=owners.filter(a=>a.tag==='procession_robber');assert.equal(liveCart.life,cartLife);assert.equal(liveWave[0].life,robberLife);
 assert.equal(w.actors.filter(a=>!a.dead&&a.eventKey==='procession:'+id).length,1+wave.length);assert.equal(new Set(owners.map(a=>a.id)).size,owners.length);assert.ok(liveWave.every(a=>a.aiTargetId===liveCart.id&&a.threat.has(liveCart.id)));
 assert.equal(binding.processions.views().find(v=>v.owner===id)!.rolling,false);assert.ok(liveCart.invulnerable&&liveCart.untargetable);
 m.dispose();resumed.massRuntime?.dispose();
 console.log('PASS production source and road, living wounded ambush CharacterSave, real cellar Continue/return, one authoritative cohort and remapped cart fixation');
}finally{countryUndo();}





// A second natural owner rolls the native objective chest. Completion position
// is controlled here only to isolate loot authority; the browser walks the road.
const chestUndo=seedGlobalRandom(713);
try{
 const w=makeSimWorld('warrior',713);w.startWorldMass(713);const m=w.massRuntime!,g=m.geography!,b=g.caravans;
 const at=address('surface','0','0',-6*5400+2700,5400+2700,960),candidate=g.processionPlannedAt(at);assert.ok(candidate);assert.ok(candidate.chestPosition);
 const local=(a:MassAddress)=>localOffset(a,{...m.origin,x:0,y:0},960),entry=local(candidate.entry);w.landPartyAt({x:entry.x-300,y:entry.y});m.update(w,true);
 for(let n=0;n<5000&&!b.processions.actors(candidate.owner.id).size;n++){w.time+=.02;m.update(w);b.update(w,0);if(n%100===0){const next=g.processionPlannedAt(at);if(next){const p=local(next.entry);if(Math.hypot(p.x-w.player.pos.x,p.y-w.player.pos.y)>1300)w.landPartyAt({x:p.x-300,y:p.y});}}}
 const id=candidate.owner.id;assert.ok(b.processions.actors(id).size,'chest-bearing natural owner must admit '+JSON.stringify(b.warmStats));const definition=b.processions.definition(id)!;
 const chest=w.chests.find(c=>c.massObjectiveOwner===id)!;assert.ok(chest);assert.equal(w.chestObjectiveDone(chest),false);const privateWorld=(world:World)=>world as unknown as{updateChests(dt:number):void};
 const dropsBefore=w.drops.length;w.landPartyAt(chest.pos);privateWorld(w).updateChests(1);assert.equal(chest.opened,false);assert.equal(w.drops.length,dropsBefore,'locked native chest cannot pay');
 const cart=[...b.processions.actors(id).values()].find(a=>a.tag==='procession_cart')!;w.landPartyAt(cart.pos);w.time+=PROCESSION_CFG.entryGraceSec+.001;b.update(w,0);w.time+=1;b.update(w,0);assert.ok(b.processions.views().find(v=>v.owner===id)!.rolling);
 cart.pos=local(definition.route.destination);w.landPartyAt(cart.pos);b.update(w,0);assert.ok(b.processions.done(id));assert.equal(w.chestObjectiveDone(chest),true);assert.equal(g.chestContext(chest)!.level,definition.context.zone.level);assert.equal(chest.rewardLevel,definition.context.zone.level);
 w.landPartyAt(chest.pos);privateWorld(w).updateChests(1);assert.ok(chest.opened);assert.equal(chest.openedAt,w.time);assert.ok(w.drops.length>dropsBefore,'real native container loot minted');
 const saved=serializeCharacter(w),contents=saved.world!.worldmass!.contents,paid=canonical(g.hierarchy.controller(id,'objective:procession')),chestPaid=canonical(g.hierarchy.controller(id,'objective:procession:chest'));
 const n=makeSimWorld('warrior',718);assert.ok(applySavedCharacter(n,saved));assert.ok(n.adoptWorldState(saved.world));n.startWorldMass(713,saved.world!.worldmass);
 const restored=n.chests.filter(c=>c.massObjectiveOwner===id);assert.equal(restored.length,1);assert.ok(restored[0].opened);assert.equal(restored[0].openedAt,chest.openedAt);assert.equal(n.meta.xp,w.meta.xp);
 privateWorld(n).updateChests(2);assert.deepEqual(n.massRuntime!.snapshot(n).contents.drops,contents.drops,'opened procession Continue cannot refill native loot');
 assert.equal(canonical(n.massRuntime!.geography!.hierarchy.controller(id,'objective:procession')),paid);assert.equal(canonical(n.massRuntime!.geography!.hierarchy.controller(id,'objective:procession:chest')),chestPaid);
 m.dispose();n.massRuntime!.dispose();console.log('PASS natural locked procession chest, source-level native reward, actual World opening and CharacterSave Continue with one lid and no refill');
}finally{chestUndo();}
