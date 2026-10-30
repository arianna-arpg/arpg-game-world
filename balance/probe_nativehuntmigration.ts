import assert from 'node:assert/strict';

import {nativeCampaignFixture,birthActualNativeArea,mintAdditionalNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
import {MONSTERS} from '../src/data/monsters';
import {updateAI} from '../src/engine/ai';
function course(retained:boolean){return withSeededRandom(16731,()=>{
 const s=nativeCampaignFixture(16731),w=s.writer;w.player.level=8;
 for(const p of [{x:240,y:160},{x:240,y:440},{x:-55,y:440}])mintAdditionalNativeArea(s,p);
 const hf=w.sim.huntField;assert(hf);
 let ignitionSteps=0;while(!hf.peek()&&ignitionSteps++<15000)hf.update(.5,w.devOverlayView());
 assert(hf.peek(),'real HuntField ignition with installed gate/data');const initial=hf.peek();
 const execute=(worldDrivers:string[])=>{
  const n=retained?birthActualNativeArea(s):null;
  const travel=(id:string)=>{if(n){const p=n.coordinator.published;n.coordinator.runFrom(p,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  const tick=(dt:number)=>{if(n)n.coordinator.published.combat.campaignFrame.tick(dt);else w.update(dt);};
  const birth=()=>n?.coordinator.published.combat.input.assembly.input.registry.input.birth;
  const tracks:any[]=[];
  for(let i=0;!hf.peek()!.revealed&&i<5;i++){
   travel(hf.peek()!.currentZoneId);tick(1/60);
   const foot=n?birth()!.input.state.huntFootprint:w['huntFootprint'];assert(foot,'actual native track placed');
   w.player.pos={...foot.pos};const before=hf.peek();tick(hf.surge().dwellSeconds+.01);tracks.push({before,after:hf.peek()});
  }
  assert(hf.peek()!.revealed,'actual native dwell locates quarry');
  const a=hf.peek()!.currentZoneId;travel(a);tick(1/60);
  const first=w.actors.find(x=>x.tag==='hunt_beast'&&!x.dead);assert(first,'first actual quarry');
  const phases=MONSTERS[first.defId!]!.brain!.phases!;assert(phases.filter(x=>x.flee).length>=2);
  const departures:any[]=[];
  for(let leg=0;leg<2;leg++){
   const body=w.actors.find(x=>x.tag==='hunt_beast'&&!x.dead);assert(body,'actual migrating quarry leg '+leg);
   const exits=w['exits'];const exit=leg===0?exits.find(e=>e.to==='?'||(w.zoneMap[e.to]&&w.zoneMap[e.to].objective.kind!=='safe'&&e.to!==w.zone.id)):exits.find(e=>e.to===a);
   assert(exit,'real outgoing/back exit '+leg);body.pos={...exit.pos};body.life=body.maxLife()*(leg===0?.6:.3);
   if(n)n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.published.combat.ai.updateActor(body,0));else updateAI(body,w,0);
   const phase=body.aiPhaseIdx;assert(phase>=leg,'actual authored AI phase entered');
   const from=w.zone.id;let accepted:boolean;
   if(!w.actors.includes(body))accepted=true;else if(n)accepted=n.coordinator.runFrom(n.coordinator.published,()=>n.coordinator.published.combat.ai.onBeastEscape(body));else accepted=w['onBeastEscape'](body);
   assert(accepted);const after=hf.peek();assert(after&&after.currentZoneId!==from);assert(!w.actors.includes(body));
   departures.push({from,to:after.currentZoneId,phase,life:after.lifeFrac,removed:!w.actors.includes(body),remembered:n?[...birth()!.input.state.materializedHunts]:[...w['materializedHunts']]});
   travel(after.currentZoneId);tick(1/60);
  }
  const final=hf.peek(),bodies=w.actors.filter(x=>x.tag==='hunt_beast'&&!x.dead).map(x=>({id:x.id,defId:x.defId,lifeFrac:x.life/x.maxLife(),phase:x.aiPhaseIdx}));
  const quarry=w.actors.find(x=>x.tag==='hunt_beast'&&!x.dead);assert(quarry,'returned quarry can finish its actual Hunt');
  const ledger=w.ledger.hunt_beasts_slain??0,xp=w.localSeat.meta.xp,drops=w.drops.length;
  const finish=()=>{if(n)n.coordinator.published.combat.kill(quarry,false,w.player);else w.kill(quarry,false,w.player);};
  withSeededRandom(168991,finish);assert(quarry.dead);assert.equal(hf.peek(),null);assert.equal(w.ledger.hunt_beasts_slain,ledger+1);
  const paid={xp:w.localSeat.meta.xp,drops:w.drops.length,ledger:w.ledger.hunt_beasts_slain};finish();assert.deepEqual({xp:w.localSeat.meta.xp,drops:w.drops.length,ledger:w.ledger.hunt_beasts_slain},paid);
  tick(1/60);assert(!w.actors.some(x=>x.tag==='hunt_beast'&&!x.dead));
  return{retained,ignitionSteps,initial,tracks,a,departures,final,bodies,completion:{ledgerDelta:paid.ledger-ledger,xpDelta:paid.xp-xp,dropDelta:paid.drops-drops,repeatPaid:false},worldDrivers};
 };return retained?refuseWorldCombat([w],execute):execute([]);
});}
const result={scope:'Actual generated areas and HuntField ignition/trail dwell/AI phases/native departure; body positions and wounds selected at real exits for a deterministic A-B-A return. Direct zone dispatch, not TCP or UI movement.',ordinary:course(false),retained:course(true)};
console.log(JSON.stringify(result));
assert.equal(result.ordinary.bodies.length,1);assert.equal(result.retained.bodies.length,1);assert.equal(result.retained.final!.currentZoneId,result.retained.a);assert.deepEqual(result.retained.worldDrivers,[]);




for(const r of [result.ordinary,result.retained]){assert.equal(r.bodies[0].phase,1);assert(Math.abs(r.bodies[0].lifeFrac-.3)<.01);assert.equal(r.final!.id,r.initial!.id);assert.equal(r.final!.currentZoneId,r.a);}
for(const leg of result.retained.departures)assert(!leg.remembered.includes(result.retained.initial!.id),'only actual completed departure releases its marker');
console.log('native Hunt migration: actual A-B-A return preserves wounded final quarry');
