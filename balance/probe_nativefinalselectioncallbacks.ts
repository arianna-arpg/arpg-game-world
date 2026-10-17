import assert from 'node:assert/strict';
import {Actor} from '../src/engine/actor';
import type {NativeSceneCensus} from '../src/worldmass/nativeAreaScenePopulation';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
const results=[];
for(const mode of ['getter-throw','body-throw','two-rows','restore-remove','restore-unclaimed','foreign-first','foreign-second','retired-owner']){
 const a=new Actor('first','player',{x:12,y:12}),b=new Actor('second','enemy',{x:12,y:12}),scene={actors:[a,b],player:a} as NativeSceneCensus,authority=new NativeAreaActorAuthority({seats:[]}),binding=authority.register(scene,{});authority.claim(binding,[a,b]);const rows=authority.selectActors([a,b]),original=authority.assertFinalPhysical,marker=Error('selected physical marker');let gets=0,calls=0,applyReads=0,error:unknown;
 const selected=function(this:typeof authority,...args:Parameters<typeof original>){assert.equal(this,authority);calls++;if(mode==='body-throw')throw marker;Reflect.apply(original,this,args);if(mode.startsWith('restore-')){Reflect.deleteProperty(authority,'assertFinalPhysical');if(mode==='restore-remove')assert.equal(scene.actors.pop(),b);else scene.actors.push(new Actor('unclaimed','enemy',{x:12,y:12}));}};Object.defineProperty(selected,'apply',{get(){applyReads++;throw Error('own apply read');}});
 Object.defineProperty(authority,'assertFinalPhysical',{configurable:true,get(){gets++;if(mode==='getter-throw')throw marker;return selected;}});
 if(mode==='retired-owner'){authority.release(binding,[a,b]);authority.unregister(binding);}
 const input=mode==='foreign-first'?[{...rows[0]},rows[1]]:mode==='foreign-second'?[rows[0],{...rows[1]}]:rows;
 try{authority.assertFinalSelections(input);}catch(e){error=e;}
 if(mode==='getter-throw'){assert.equal(error,marker);assert.equal(gets,1);assert.equal(calls,0);}else if(mode==='body-throw'){assert.equal(error,marker);assert.equal(gets,1);assert.equal(calls,1);}else if(mode==='two-rows'){assert.equal(error,undefined);assert.equal(gets,2);assert.equal(calls,2);}else if(mode==='restore-remove'){assert.match(String(error),/Stale native final physical actor/);assert.equal(gets,1);assert.equal(calls,1);assert(!scene.actors.includes(b));}else if(mode==='restore-unclaimed'){assert.match(String(error),/unowned or borrowed/);assert.equal(gets,1);assert.equal(calls,1);assert.equal(scene.actors.length,3);}else if(mode.startsWith('foreign-')){assert.match(String(error),/Foreign native actor selection/);assert.equal(gets,mode==='foreign-first'?0:1);assert.equal(calls,gets);}else{assert.match(String(error),/Foreign or retired/);assert.equal(gets,0);assert.equal(calls,0);}
 assert.equal(applyReads,0);results.push({mode,gets,calls,applyReads,error:error instanceof Error?error.message:null,remaining:scene.actors.length});
}
console.log('PASS selected physical validation '+JSON.stringify(results));

// A genuine retained native stat read must also preserve the selected callback.
const {nativeCampaignFixture,birthActualNativeArea}=await import('./nativeCombatRetainedFixture');
const {refuseWorldCombat}=await import('./probe_nativecombatcycle');
const actual=[];
for(const mode of ['getter','body','delegate']){
 const setup=nativeCampaignFixture(12958);actual.push(refuseWorldCombat([setup.writer],world=>{
  const all=birthActualNativeArea(setup),area=all.ongoing,hero=area.assembly.input.scene.player,authority=all.authority,original=authority.assertFinalPhysical,get=hero.sheet.get,marker=Error('actual selected physical');let gets=0,calls=0,stats=0,error:unknown;
  hero.sheet.get=function(...args){stats++;return Reflect.apply(get,this,args);};
  Object.defineProperty(authority,'assertFinalPhysical',{configurable:true,get(){gets++;if(mode==='getter')throw marker;return function(this:typeof authority,...args:Parameters<typeof original>){assert.equal(this,authority);calls++;if(mode==='body')throw marker;return Reflect.apply(original,this,args);};}});
  try{area.combat.actorTurnRate(hero);}catch(e){error=e;}finally{Reflect.deleteProperty(authority,'assertFinalPhysical');hero.sheet.get=get;}
  if(mode==='delegate'){assert.equal(error,undefined);assert.equal(gets,2);assert.equal(calls,2);assert.equal(stats,1);}else{assert.equal(error,marker);assert.equal(gets,1);assert.equal(calls,mode==='getter'?0:1);assert.equal(stats,0);}
  assert.deepEqual(world,[]);area.combat.actorTurnRate(hero);return {mode,gets,calls,stats,exactError:error===marker,worldDrivers:world.length};
 }));
}
console.log('PASS actual selected physical validation '+JSON.stringify(actual));
