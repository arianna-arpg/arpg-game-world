import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {NativeAreaSceneAssembly} from '../src/worldmass/nativeAreaSceneAssembly';
import {NativeAreaScenePreparation} from '../src/worldmass/nativeAreaScenePreparation';
import {voyageSetup,actualVoyage} from './nativeVoyageFixture';
import {stageRealm,enterRealm} from './nativeRealmEntryFixture';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';

type Stop='none'|'notice'|'abandon'|'layout'|'changed';
const results:unknown[]=[];
function run(native:boolean,fresh:boolean,stop:Stop){return withSeededRandom(46115,()=>{
 const setup=voyageSetup(),w=setup.writer,view=w.devOverlayView(),realmDefinition=Object.values(w.zoneMap).find(z=>z.id==='gen_1790293825');assert(realmDefinition);
 const action=(drivers:string[])=>{
  const retained=native?undefined:actualVoyage(setup),hero=w.player;
  if(native){w.loadZone(setup.definition.id);const dock=w.doodads.find(d=>d.kind==='dock');assert(dock);hero.pos={...dock.pos};w['enterSailing']();for(let i=0;i<12;i++)w.update(1/60);}
  const sea=retained?.coordinator.published,run=sea?.assembly.transition.voyage??w['voyage'];assert(run);
  hero.level=60;w.sim.gatesFor(60);const field=w.sim.wraithsailField;assert(field);assert(field.devSummon(retained?.coordinator.simView()??view,setup.definition.id));
  const ship=field.shipInfo();assert(ship);hero.pos=sea?sea.assembly.input.coast.seaFromNode({x:ship.x,y:ship.y}):w['seaFromNode']({x:ship.x,y:ship.y});
  if(sea)sea.combat.campaignFrame.beginWraithsailBoarding();else w['beginWraithsailBoarding']();
  const deck=retained?.coordinator.published,deckId=w.zone.id;assert.match(deckId,/_deck$/);
  if(deck)deck.combat.campaignFrame.updateSailing(1/60);else w['updateSailing'](1/60);
  const stash=deck?.assembly.input.state.wraithsailSeaStash??w['wraithsailSeaStash'];assert(stash&&stash.run===run);
  // Stage the genuine overlay event on the real boarding area's gate, enter it,
  // kill its actual boss, and leave back onto the actual Wraithsail deck.
  const staged=stageRealm({...setup,definition:realmDefinition,overlayView:view},'necropolis',deck);enterRealm(deck?.combat.campaignFrame??w,staged);
  const realm=retained?.coordinator.published,boss=w.actors.find(a=>a.tag===staged.tag);assert(boss);
  if(realm)realm.combat.kill(boss,false,hero);else w.kill(boss,false,hero);
  const deadwake=w.sim.deadwakeField;assert(deadwake?.necropolisInfo()?.defeated);
  const exit=w.exits.find(e=>e.to===deckId);assert(exit);if(realm)realm.combat.campaignFrame.travelThrough(exit);else w['travelThrough'](exit);
  assert.equal(w.zone.id,deckId);assert(deadwake.necropolisInfo()?.defeated);
  const source=retained?.coordinator.published;assert.equal(source?.assembly.input.state.wraithsailSeaStash??w['wraithsailSeaStash'],stash);
  const dest=fresh?Object.values(w.zoneMap).find(z=>z.port&&z.id!==setup.definition.id):setup.definition;assert(dest);if(fresh)assert(!retained?.coordinator.residentAreas().some(a=>a.combat.scene.zone.id===dest.id));
  const events:string[]=[],marker=Error('combined surface '+stop),oldLeft=field.onBoardingLeft,oldCull=deadwake.cullNecropolis,oldNotice=w.notice,oldPrepare=NativeAreaSceneAssembly.prototype.prepare,oldDestination=NativeAreaScenePreparation.prototype.prepareDestination;
  let prepareCalls=0,layoutCalls=0,fail=stop!=='none';const arrived=()=>retained?retained.coordinator.published===source:w.zone.id===dest.id;
  field.onBoardingLeft=function(){assert.equal(this,field);events.push('abandon');const result=Reflect.apply(oldLeft,this,[]);assert.equal(source?.assembly.input.state.wraithsailSeaStash??w['wraithsailSeaStash'],null);if(stop==='abandon'&&fail){fail=false;throw marker;}return result;};
  deadwake.cullNecropolis=function(){assert.equal(this,deadwake);events.push('cull');return Reflect.apply(oldCull,this,[]);};
  w.notice=function(...args){const result=Reflect.apply(oldNotice,this,args);if(String(args[0]).startsWith('The Necropolis crumbles')){events.push('notice');assert(arrived());if(stop==='notice'&&fail){fail=false;throw marker;}}return result;};
  NativeAreaScenePreparation.prototype.prepareDestination=function(...args){prepareCalls++;if(stop==='layout'&&fail){fail=false;throw marker;}if(stop==='changed'&&fail){fail=false;assert(source);source.assembly.input.state.wraithsailSeaStash=stash;}return Reflect.apply(oldDestination,this,args);};
  NativeAreaSceneAssembly.prototype.prepare=function(...args){if(this.input.scene.zone.id===dest.id)layoutCalls++;return Reflect.apply(oldPrepare,this,args);};
  const travel=()=>retained?retained.coordinator.runFrom(source!,()=>retained.coordinator.loadZone(dest.id)):w.loadZone(dest.id);
  try{
   if(stop!=='none'){
    assert.throws(travel,stop==='changed'?/changed after surface abandonment/:e=>e===marker);
    assert.equal(retained?.coordinator.published,source);if(retained)retained.authority.assertAdmitted(source!.combat.scene);
    assert.equal(events.filter(x=>x==='abandon').length,1);
    if(stop==='abandon'){assert.deepEqual(events,['abandon']);assert(deadwake.necropolisInfo()?.defeated);}else{assert.deepEqual(events,['abandon','cull','notice']);assert.equal(deadwake.necropolisInfo(),null);}
    if(stop==='notice'||stop==='abandon'){assert.equal(prepareCalls,0);assert.equal(layoutCalls,0);assert.equal(source?.assembly.input.state.wraithsailSeaStash??w['wraithsailSeaStash'],null);if(fresh&&!native)assert(!w.visited.has(dest.id));}
    if(stop==='changed'){
     assert.equal(source!.assembly.input.state.wraithsailSeaStash,stash,'callback mutation survives refusal');
     assert.deepEqual(drivers,[]);return {native,fresh,stop,events,prepareCalls,layoutCalls,changedSourcePreserved:true,worldDrivers:drivers};
    }
    travel();
   }else travel();
   assert.deepEqual(events,['abandon','cull','notice']);assert.equal(w.zone.id,dest.id);assert.equal(w['wraithsailSeaStash'],null);assert(!field.boardable());
   if(retained){retained.coordinator.assertIdleFrame();assert(!retained.coordinator.residentAreas().includes(sea!));assert.throws(()=>retained.authority.bindingFor(sea!.combat.scene),/Unregistered/);retained.authority.assertAdmitted(retained.coordinator.published.combat.scene);assert.deepEqual(drivers,[]);}
   return{native,fresh,stop,events,prepareCalls,layoutCalls,retried:stop!=='none',seaRetired:!native,worldDrivers:drivers};
  }finally{field.onBoardingLeft=oldLeft;deadwake.cullNecropolis=oldCull;w.notice=oldNotice;NativeAreaSceneAssembly.prototype.prepare=oldPrepare;NativeAreaScenePreparation.prototype.prepareDestination=oldDestination;}
 };
 return native?action([]):refuseWorldCombat([w],action);
});}
for(const native of [true,false])for(const fresh of [false,true])for(const stop of ['none','notice','abandon'] as const){const label={native,fresh,stop};console.log('BEGIN',label);results.push(run(native,fresh,stop));console.log('PASS',label);}
for(const stop of ['layout','changed'] as const){console.log('BEGIN',stop);results.push(run(false,true,stop));console.log('PASS',stop);}
const report={scope:'Actual generated free voyage/Wraithsail boarding, genuine Necropolis boss completion, combined surface consequences; retained phase is before preparation, original relative order and partial effects preserved.',courses:results.length,results,receipt:combatHash(JSON.stringify(results))};writeCombatProof('native-surface-arrival-order.json',report);console.log(JSON.stringify(report));
