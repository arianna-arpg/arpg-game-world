import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
const seed=Number(process.argv.find(s=>s.startsWith('--seed='))?.split('=')[1]??23032),lane=process.argv.includes('--world')?'world':'native';
const tape:any[]=[],record=(row:any)=>tape.push(structuredClone(row));
try{withSeededRandom(seed,()=>{
 const setup=nativeCampaignFixture(seed),w=setup.writer;w.player.level=15;w.player.invulnerable=true;
 mintAdditionalNativeArea(setup);mintAdditionalNativeArea(setup,{x:455,y:660});
 const course=(drivers:string[])=>{
  const n=lane==='native'?birthActualNativeArea(setup):null;if(!n)w.loadZone(setup.definition.id);
  const af=w.sim.amalgamationField!;assert(af);
  const area=()=>n!.coordinator.published;
  const state=()=>n?area().assembly.input.registry.input.birth.input.state:{amalgamSite:w['amalgamSite'],materializedAmalgamMobs:w['materializedAmalgamMobs']};
  const actors=()=>n?area().combat.scene.actors:w.actors;
  const travel=(to:string)=>{if(n){const from=area();n.coordinator.runFrom(from,()=>n.coordinator.loadZone(to,w.zone.id));}else w.loadZone(to,w.zone.id);record({travel:to,site:state()['amalgamSite'],field:af.peek()});};
  const frame=(dt:number)=>{w.time+=dt;if(n)area().combat.campaignFrame.tick(dt);else w['updateAmalgamation'](dt);};
  const kill=(body:(typeof w.actors)[number])=>{if(n)area().combat.kill(body,false,w.player);else w.kill(body,false,w.player);};
  assert(af.devOpen(w.devOverlayView(),setup.definition.id));
  if(n)area().combat.crusadeLifetime.materializeLiveZoneEvents();else w['materializeLiveZoneEvents']();
  assert(state()['amalgamSite'],'actual Bonewright site');
  for(let stage=0;stage<5;stage++){
   const site=state()['amalgamSite']!;assert(site);const necro=actors().find(a=>a.id===site.necroId);assert(necro);w.player.pos={...necro.pos};frame(2.1);
   const target=af.minibossTarget();record({stage,accepted:af.peek(),target});assert(target,'real Bonewright dwell accepts hunt');travel(target);frame(0);
   const mobs=actors().filter(a=>!a.dead&&a.tag==='amalgam_miniboss');record({stage,mobs:mobs.map(a=>({id:a.id,def:a.defId,life:a.life})),markers:[...state()['materializedAmalgamMobs']]});assert.equal(mobs.length,1,'one actual quarry for stage '+stage);
   if(n&&process.argv.includes('--wounds')){const body=mobs[0];body.life*=.37;const life=body.life;travel(setup.definition.id);travel(target);frame(0);for(let i=0;i<3;i++)area().combat.crusadeLifetime.materializeLiveZoneEvents();const repeated=actors().filter(a=>!a.dead&&a.tag==='amalgam_miniboss');assert.deepEqual(repeated,[body],'same issued quarry survives re-entry without duplication');assert.equal(body.life,life,'same quarry wounds survive retained return');record({woundedReturn:true,stage,id:body.id,life});}
   kill(mobs[0]);assert.equal(af.peek()?.quest,'choose','native death advances real quest');travel(setup.definition.id);
   const spots=n?area().combat.queryView('amalgamPickView'):w.amalgamPickView();assert(spots.length,'real part choices');w.player.pos={...spots[0].pos};frame(2.1);record({stage,afterPick:af.peek()});assert.equal(af.peek()?.stage,stage+1,'real part dwell advances build');
   if(af.peek()?.quest==='boss'){const bosses=actors().filter(a=>!a.dead&&a.tag==='amalgam_boss');assert.equal(bosses.length,1);kill(bosses[0]);assert.equal(af.peek(),null);assert.equal(w.ledger.amalgamations_completed,1);assert.equal(drivers.length,0);record({complete:true,ledger:w.ledger.amalgamations_completed,drivers});return;}
  }
  throw Error('No completion within part bound');
 };
 return lane==='native'?refuseWorldCombat([w],course):course([]);
});console.log('PASS '+JSON.stringify({seed,lane,tape}));}catch(error){console.log('FAIL '+JSON.stringify({seed,lane,tape,error:String(error),stack:(error as Error).stack}));process.exitCode=1;}
