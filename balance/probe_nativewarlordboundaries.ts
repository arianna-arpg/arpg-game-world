import '../src/engine/world';
import assert from 'node:assert/strict';
import {clientSetup} from './nativeClientRuntimeFixture';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
import {nativeWarlordCurrent,breakNativeWarlord,bindNativeWarlordIdentity,bindNativeWarlordKillContext} from '../src/engine/nativeWarlordIdentity';
import {killRules,type KillCtx} from '../src/engine/killHandlers';
const result=withSeededRandom(66021,()=>{
 const setup=clientSetup(45927),w=setup.writer,A=setup.definition,B=setup.destination;
 return refuseWorldCombat([w],worldDrivers=>{
  const r=new NativeClientRuntime({writer:w,definition:A,geography:setup.geography.spec});r.install();const c=r.current.combat.input.coordinator,travel=(to:string)=>c.runFrom(r.current,()=>c.loadZone(to));const target=r.current,geometry=target.assembly.input.geometry;
  travel(B.id);for(const [z,power]of [[A,100],[B,90]]as const){const snap=w.sim.faction.snapshot() as {field:Record<string,Record<string,number>>};for(const f of Object.keys(snap.field[z.id]??{}))w.sim.faction.bleed(z.id,f,100);w.sim.faction.reinforce(z.id,'goblin',power);}const field=w.sim.warlord;field.update(0,w.devOverlayView());const lord=field.lords.get('goblin')!,crown=field.crownOf(lord);assert(crown);
  assert.throws(()=>target.combat.warlordArrival.arrive(),/selected genuine revisit/);assert.throws(()=>bindNativeWarlordIdentity({}),/private one-use/);assert.throws(()=>bindNativeWarlordKillContext({}),/actual private kill event/);
  const census=target.combat.scene.actors,far=geometry.farPoint;let pushCalls=0;const selectedMeta=w.localSeat.meta;
  geometry.farPoint=function(...args){const value=far.apply(this,args);Object.defineProperty(census,'push',{configurable:true,get(){w.localSeat.meta={...selectedMeta};return function(this:typeof census,...bodies:typeof census){pushCalls++;return Array.prototype.push.apply(this,bodies);};}});return value;};
  assert.throws(()=>travel(A.id),/actual hand or ground|selection changed|changed/);assert.equal(pushCalls,0,'stale returned array method must not execute');assert.equal(census.filter(a=>a.tag==='warlord').length,0);Reflect.deleteProperty(census,'push');geometry.farPoint=far;w.localSeat.meta=selectedMeta;travel(B.id);
  let draws=0;geometry.farPoint=function(...args){const value=far.apply(this,args);draws++;throw Error('crown geometry partial');return value;};
  assert.throws(()=>travel(A.id),/crown geometry partial/);assert.equal(draws,1);assert.equal(target.combat.scene.actors,census);assert.equal(census.filter(a=>a.tag==='warlord').length,0);geometry.farPoint=far;
  travel(B.id);let reentries=0;geometry.farPoint=function(...args){assert.throws(()=>target.combat.warlordArrival.arrive(),/cannot reenter/);reentries++;return far.apply(this,args);};
  const text=geometry.text;let wroteText=0;geometry.text=function(...args){const value=text.apply(this,args);if(String(args[1]).includes('warlord rules')){wroteText++;throw Error('crown text partial');}return value;};
  assert.throws(()=>travel(A.id),/crown text partial/);geometry.farPoint=far;geometry.text=text;assert.equal(wroteText,1);assert.equal(reentries,1);const boss=census.find(a=>a.tag==='warlord')!;assert(boss);assert.equal(target.authority.require(boss).combat,target.combat);
  travel(B.id);travel(A.id);assert.deepEqual(census.filter(a=>a.tag==='warlord'),[boss]);assert.equal(field.crownOf(lord),crown);
  // A genuine admitted ordinary body with a public tag still has no crown receipt.
  const ordinary=census.find(a=>a!==boss&&a.team==='enemy'&&!a.dead&&!a.invulnerable&&!a.untargetable&&!a.owner&&!a.doorId)!;assert(ordinary);ordinary.tag='warlord';ordinary.faction='goblin';const ledger=w.ledger.warlords_killed??0;target.combat.kill(ordinary,false,w.player);assert.equal(w.ledger.warlords_killed??0,ledger);assert.equal(field.crownOf(lord),crown);
  let held:KillCtx|undefined;target.combat.scene.actors.includes(boss);target.combat.campaignOwner.worldKillRules.push({id:'test_crown_capture',tag:'warlord',run:ctx=>{held=ctx;}});target.combat.kill(boss,false,w.player);assert.equal(w.ledger.warlords_killed,ledger+1);assert(held);assert.equal(nativeWarlordCurrent(held),false);assert.equal(breakNativeWarlord(held),false);killRules().find(rule=>rule.id==='warlord_break')!.run(held);assert.equal(w.ledger.warlords_killed,ledger+1);
  // The selected provider itself replaces the reign before forwarding to its
  // native method. That final native boundary must refuse the old crown.
  for(const [z,power]of [[A,100],[B,90]]as const)w.sim.faction.reinforce(z.id,'goblin',power);
  field.update(0,{...w.devOverlayView(),time:lord.suppressUntil+.01});travel(B.id);travel(A.id);const obsolete=census.find(a=>a.tag==='warlord'&&!a.dead&&a.faction==='goblin')!;assert(obsolete);
  const originalBreak=field.onWarlordKilled,oldCrown=field.crownOf(field.lords.get('goblin')!);let replacement:object|undefined;
  field.onWarlordKilled=function(...args){for(const id of Object.keys((w.sim.faction.snapshot() as {field:Record<string,unknown>}).field))w.sim.faction.bleed(id,'goblin',100);this.update(0,{...w.devOverlayView(),time:lord.suppressUntil+.02});assert(!this.lords.has('goblin'));w.sim.faction.reinforce(A.id,'goblin',100);w.sim.faction.reinforce(B.id,'goblin',90);this.update(0,{...w.devOverlayView(),time:lord.suppressUntil+.03});replacement=this.crownOf(this.lords.get('goblin')!);assert(replacement);assert.notEqual(replacement,oldCrown);return originalBreak.apply(this,args);};
  target.combat.kill(obsolete,false,w.player);field.onWarlordKilled=originalBreak;assert.equal(w.ledger.warlords_killed,ledger+1);assert.equal(field.crownOf(field.lords.get('goblin')!),replacement);assert.equal(field.lords.get('goblin')!.alive,true);
  r.retire();assert.equal(nativeWarlordCurrent(held),false);assert.equal(breakNativeWarlord(held),false);return{stalePushGetterRefusedBeforeCall:true,factoryThenGeometryFailure:true,partialNativeTextKept:true,reentryRefused:true,repeatDoesNotDuplicate:true,tagOnlyDoesNotSuppress:true,terminalKillBinding:true,retiredBindingDoesNotFallback:true,providerReplacementCannotKillSuccessor:true,worldDrivers};
 });
});
function retirementCourse(mode:'selection'|'returned-index'){return withSeededRandom(66024,()=>{
 const setup=clientSetup(45927),w=setup.writer,A=setup.definition,B=setup.destination;
 return refuseWorldCombat([w],worldDrivers=>{
  const r=new NativeClientRuntime({writer:w,definition:A,geography:setup.geography.spec});r.install();const c=r.current.combat.input.coordinator,travel=(to:string)=>c.runFrom(r.current,()=>c.loadZone(to));travel(B.id);
  const fortify=(id:string,power:number)=>{for(const f of Object.keys((w.sim.faction.snapshot() as {field:Record<string,Record<string,number>>}).field[id]??{}))w.sim.faction.bleed(id,f,100);w.sim.faction.reinforce(id,'goblin',power);};
  fortify(A.id,100);fortify(B.id,90);const field=w.sim.warlord;field.update(0,w.devOverlayView());travel(A.id);const old=r.current,census=old.combat.scene.actors,boss=census.find(a=>a.tag==='warlord'&&a.faction==='goblin')!;assert(boss);const ledger=w.ledger.warlords_killed??0;
  fortify(A.id,80);fortify(B.id,100);field.update(0,w.devOverlayView());assert.equal(field.lords.get('goblin')!.capitalId,B.id);
  const lordAt=field.lordAt,selectedMeta=w.localSeat.meta;let installed=false,selections=0,calls=0;
  field.lordAt=function(id){const value=lordAt.call(this,id);if(id===B.id&&!installed){installed=true;if(mode==='selection')Object.defineProperty(census,'splice',{configurable:true,get(){selections++;w.localSeat.meta={...selectedMeta};return function(this:typeof census,start:number,count:number){calls++;return Array.prototype.splice.call(this,start,count);};}});else Object.defineProperty(census,'indexOf',{configurable:true,get(){selections++;return function(body:typeof boss){calls++;assert.equal(body,boss);return -1;};}});}return value;};
  assert.throws(()=>travel(B.id),mode==='selection'?/actual hand or ground|selection changed|changed/:/retirement left its physical body/);assert.equal(selections,1);assert.equal(calls,mode==='selection'?0:1,'selected refusal prevents call; returned native effect is preserved');assert(census.includes(boss));assert.equal(boss.dead,false);assert.equal(w.ledger.warlords_killed??0,ledger);
  Reflect.deleteProperty(census,'splice');Reflect.deleteProperty(census,'indexOf');field.lordAt=lordAt;w.localSeat.meta=selectedMeta;
  // The same reign returns to its original capital after the pre-removal
  // refusal. Its original, still admitted body must remain a real fight.
  fortify(A.id,100);fortify(B.id,80);field.update(0,w.devOverlayView());travel(A.id);assert.equal(r.current,old);assert(census.includes(boss));old.combat.kill(boss,false,w.player);assert.equal(w.ledger.warlords_killed,ledger+1);const lord=field.lords.get('goblin')!;assert.equal(lord.alive,false);
  fortify(A.id,100);fortify(B.id,90);field.update(0,{...w.devOverlayView(),time:lord.suppressUntil+.01});travel(B.id);travel(A.id);const retry=census.find(a=>a.tag==='warlord'&&a.faction==='goblin'&&!a.dead)!;assert(retry);fortify(A.id,80);fortify(B.id,100);field.update(0,{...w.devOverlayView(),time:lord.suppressUntil+.02});travel(B.id);assert(!census.includes(retry));assert.equal(retry.dead,false);assert.equal(w.ledger.warlords_killed,ledger+1);assert.equal(r.current.combat.scene.actors.filter(a=>a.tag==='warlord'&&a.faction==='goblin'&&!a.dead).length,1);
  r.retire();return{mode,selectedRetirementMethodRefusedBeforeCall:mode==='selection',nativeReturnedMethodWithoutRemovalRefused:mode==='returned-index',returnedCapitalSameBodyKillCreditsCurrentCrown:true,retryUsesActualNativeRetirement:true,worldDrivers};
 });
});}
const retirement=[retirementCourse('selection'),retirementCourse('returned-index')];const report={scope:'Actual selected retained arrivals with explicit geometry and text callback failures; native pre-failure work remains. Forged public tag is on a genuinely admitted ordinary enemy, and held kill context comes from the actual World-rule callback. No actor/operation/crown receipt is forged into admission.',result,retirement,receipt:combatHash(JSON.stringify({result,retirement}))};writeCombatProof('native-warlord-boundaries.json',report);console.log(JSON.stringify(report));
