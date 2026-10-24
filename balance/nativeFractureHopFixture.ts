import assert from 'node:assert/strict';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
export function actualFractureHop<T>(action:(context:ReturnType<typeof prepare>)=>T):T{return withSeededRandom(20731,()=>{const setup=nativeCampaignFixture(20731);setup.writer.player.level=15;return refuseWorldCombat([setup.writer],calls=>action(prepare(setup,calls)));});}
function prepare(setup:ReturnType<typeof nativeCampaignFixture>,calls:string[]){
 const w=setup.writer,ff=w.sim.fractureField!;assert(ff);const n=birthActualNativeArea(setup);let ignition=0;while(!ff.peek()&&ignition++<20000)ff.update(.5,w.devOverlayView());assert(ff.peek(),'natural event');
 const travel=(to:string)=>{const from=n.coordinator.published;n.coordinator.runFrom(from,()=>n.coordinator.loadZone(to,w.zone.id));};travel(ff.peek()!.zoneId);
 const area=n.coordinator.published,birth=area.combat.input.assembly.input.registry.input.birth,state=birth.input.state;
 const frame=(dt:number)=>n.coordinator.runFrom(area,()=>area.combat.framePreActors(dt));frame(0);const run=state.fractureRun;assert(run);w.player.pos={...run.origin};area.combat.campaignFrame.tick(.01);assert.equal(run.phase,'fissure');
 const payout=()=>({chasms:w.ledger.fracture_chasms_cleared??0,sealed:w.ledger.fractures_sealed??0,rifts:w.ledger.fracture_rifts_opened??0,level:w.player.level,xp:w.localSeat.meta.xp,drops:area.assembly.input.physical.input.state.drops.length,texts:w['texts'].length});
 const step=(kill=true)=>{w.player.pos={...(state.fractureRun?.head??run.head)};w.time+=.2;ff.update(.2,w.devOverlayView());frame(.2);if(kill)for(const body of [...area.combat.scene.actors].filter(a=>!a.dead&&a.tag==='fracture_foe'))area.combat.kill(body,false,w.player);};
 const finish=()=>{let steps=0;while(state.fractureRun&&ff.fractureIn(area.combat.scene.zone.id)&&steps++<2600)step();assert(steps<2600);return steps;};
 return{setup,w,ff,n,area,birth,state,run,travel,frame,step,finish,payout,calls,ignition};
}
