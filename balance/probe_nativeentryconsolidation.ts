import assert from 'node:assert/strict';
import {withSeededRandom} from '../src/core/rng';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {NativeAreaSceneBirthAdmission} from '../src/worldmass/nativeAreaSceneBirthAdmission';
import {refuseWorldCombat,writeCombatProof} from './probe_nativecombatcycle';
const results=withSeededRandom(77391,()=>['ordinary','first-getter','second-getter','empty-final-parent','pending-final-parent','ordinary-parent','forged-selection','partial-insertion'].map(mode=>{
 const setup=nativeCampaignFixture(1773);return refuseWorldCombat([setup.writer],world=>{const all=birthActualNativeArea(setup),a=all.ongoing,{scene,population}=a.assembly.input,authority=all.authority,hero=scene.player,birth=new NativeAreaSceneBirthAdmission({authority,scene,population});
 let reads=0,nativeCalls=0,publishGets=0,publishCalls=0;const writer=setup.writer,slot=Object.getOwnPropertyDescriptor(writer,'seats')!,get=hero.sheet.get,selected=authority.selectActors([hero]);
 if(['ordinary','first-getter','second-getter'].includes(mode)){
  const rogue=mode==='first-getter'?population.createMonster('goblin_skirmisher',1,'enemy'):undefined;
  Object.defineProperty(writer,'seats',{configurable:true,get(){reads++;if(mode==='first-getter'&&reads===1)scene.actors.push(rogue!);if(mode==='second-getter'&&reads===2)scene.actors.splice(scene.actors.indexOf(hero),1);return slot.value;}});
  hero.sheet.get=function(...args){nativeCalls++;return Reflect.apply(get,this,args);};
  try{if(mode==='ordinary'){a.combat.actorTurnRate(hero);assert.equal(reads,2);assert.equal(nativeCalls,1);}else{assert.throws(()=>a.combat.actorTurnRate(hero),/unowned|physical|authority|selection/i);assert.equal(reads,mode==='first-getter'?1:2);assert.equal(nativeCalls,0);if(rogue){assert(scene.actors.includes(rogue));scene.actors.splice(scene.actors.indexOf(rogue),1);}else{assert(!scene.actors.includes(hero));scene.actors.push(hero);}}}finally{Object.defineProperty(writer,'seats',slot);hero.sheet.get=get;}
 }else if(mode==='empty-final-parent')birth.runFinal(()=>{assert.equal(birth.canCombineFinalEntry(),true);a.combat.actorTurnRate(hero);});
 else if(mode==='pending-final-parent')birth.runFinal(()=>{const pending=birth.createMonster('goblin_skirmisher',1,'enemy');assert.equal(birth.canCombineFinalEntry(),false);const includes=scene.actors.includes;Object.defineProperty(scene.actors,'includes',{configurable:true,get(){publishGets++;return function(this:typeof scene.actors,...args:Parameters<typeof includes>){assert.equal(this,scene.actors);publishCalls++;return Reflect.apply(includes,this,args);};}});try{a.combat.actorTurnRate(hero);assert.equal(publishGets,1);assert.equal(publishCalls,1);assert(!scene.actors.some(x=>x===pending));}finally{Reflect.deleteProperty(scene.actors,'includes');}});
 else if(mode==='ordinary-parent')birth.run(()=>{assert.equal(birth.canCombineFinalEntry(),false);a.combat.actorTurnRate(hero);});
 else if(mode==='forged-selection'){assert.throws(()=>birth.runFinalSelected([{...selected[0]}],()=>nativeCalls++),/Foreign native actor selection/);assert.equal(nativeCalls,0);}
 else if(mode==='partial-insertion'){let actual:typeof hero|undefined;assert.throws(()=>birth.runFinalSelected(selected,()=>{actual=birth.createMonster('goblin_skirmisher',1,'enemy');scene.actors.push(actual);throw Error('completed native insertion');}),/completed native insertion/);assert(actual);assert.equal(authority.require(actual).scene,scene);assert(scene.actors.includes(actual));}
 assert.deepEqual(world,[]);return{mode,reads,nativeCalls,publishGets,publishCalls,worldDrivers:world.length};});}));
writeCombatProof('native-entry-consolidation.json',{scope:'Actual retained entry: original two campaign reads/refusal order, private pending/non-final fallback, nominal selections and completed native insertion.',results});console.log(JSON.stringify(results));
