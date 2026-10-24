import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
function course(retained:boolean){return withSeededRandom(19931,()=>{
 const s=nativeCampaignFixture(19931),w=s.writer;w.player.level=15;w.player.invulnerable=true;
 const other=mintAdditionalNativeArea(s,{x:455,y:160}),a=s.definition.id,b=other.id;
 const run=(worldDrivers:string[])=>{
  const n=retained?birthActualNativeArea(s):null;if(!n)w.loadZone(a);
  const vf=w.sim.vendettaField;assert(vf);
  const travel=(id:string)=>{if(n){const area=n.coordinator.published;n.coordinator.runFrom(area,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  const tick=()=>{if(n)n.coordinator.published.combat.campaignFrame.tick(1/60);else w.update(1/60);};
  const kill=(body:typeof w.player)=>{if(n)n.coordinator.published.combat.kill(body,false,w.player);else w.kill(body,false,w.player);};
  const naturalWrit=(faction:string)=>{const bodies=w.actors.filter(x=>x.team==='enemy'&&!x.dead&&x.faction===faction).slice(0,24);assert.equal(bodies.length,24,`actual generated ${faction} population`);for(const body of bodies)kill(body);const afterKills=w.sim.drives.get('grudge',faction);assert(afterKills>=vf.surge().grudgeThreshold);let steps=0;while(!vf.writsView().some(x=>x.faction===faction)&&steps++<100)w.sim.update(.5,w.devOverlayView());const writ=vf.writsView().find(x=>x.faction===faction);assert(writ,`natural ${faction} writ ignition`);return{writ,steps,afterKills,killed:bodies.map(x=>({id:x.id,def:x.defId,fromZoneGen:x.fromZoneGen}))};};
  const first=naturalWrit('beast');let firstFrames=0;while(!w.actors.some(x=>!x.dead&&x.tag==='vendetta_warrant'&&x.eventKey===first.writ.id)&&firstFrames++<100)tick();
  const warrant=w.actors.find(x=>!x.dead&&x.tag==='vendetta_warrant'&&x.eventKey===first.writ.id);assert(warrant,'actual first warrant-holder');
  const squad=w.actors.filter(x=>!x.dead&&x.eventKey===first.writ.id&&(x.tag==='vendetta_warrant'||x.tag==='vendetta_hunter'));
  const before={xp:w.localSeat.meta.xp,settled:w.ledger.writs_settled??0,drops:w.drops.length};kill(warrant);assert(!vf.writsView().some(x=>x.id===first.writ.id));assert.equal(w.ledger.writs_settled,before.settled+1);for(const body of squad)if(!body.dead)kill(body);
  const after={xp:w.localSeat.meta.xp,settled:w.ledger.writs_settled??0,drops:w.drops.length};w.sim.update(0,w.devOverlayView());
  const source=n?.coordinator.published;
  travel(b);const second=naturalWrit('beastkin');assert.notEqual(first.writ.id,second.writ.id);
  travel(a);const sameArea=n?source===n.coordinator.published:null;for(let i=0;i<100;i++)tick();
  const secondSquad=w.actors.filter(x=>!x.dead&&x.eventKey===second.writ.id&&(x.tag==='vendetta_warrant'||x.tag==='vendetta_hunter'));
  const secondWarrant=secondSquad.find(x=>x.tag==='vendetta_warrant');const beforeSecond=w.ledger.writs_settled??0;if(secondWarrant)kill(secondWarrant);
  return{retained,seed:19931,a,b,first,firstFrames,firstSquad:squad.length,before,after,second,returnedSecondSquad:secondSquad.map(x=>({id:x.id,def:x.defId,tag:x.tag,eventKey:x.eventKey})),secondSettledDelta:(w.ledger.writs_settled??0)-beforeSecond,remainingWrits:vf.writsView(),sameArea,worldDrivers};
 };return retained?refuseWorldCombat([w],run):run([]);
});}
const result={scope:'Actual generated population culls feed native grudge; unchanged installed overlay naturally ignites two distinct writs, actual first warrant kill, genuine A-B-A native travel and second settlement. No dev event staging, fake event rows, guards or registry changes. Player level15/invulnerability staged; direct kill/travel dispatch, not input/UI. No timing/capacity claim.',ordinary:course(false),retained:course(true)};
fs.writeFileSync(new URL('../../VENDETTA-RETURN.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
assert(result.ordinary.returnedSecondSquad.length>0);assert.equal(result.ordinary.secondSettledDelta,1);assert.equal(result.retained.returnedSecondSquad.length,result.ordinary.returnedSecondSquad.length);assert.equal(result.retained.secondSettledDelta,1);assert.equal(result.retained.sameArea,true);assert.deepEqual(result.retained.worldDrivers,[]);
