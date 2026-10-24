import assert from 'node:assert/strict';
import {World} from '../src/engine/world';
import {makeSimWorld} from '../src/sim/arena';
import {withSeededRandom} from '../src/core/rng';
import {SKILL_INPUT_CFG} from '../src/engine/skillInputOrder';
import type {Actor} from '../src/engine/actor';

import type {PlayerInput} from '../src/net/intent';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat,writeCombatProof,combatHash} from './probe_nativecombatcycle';
function course(hero:Actor,id:string,apply:(inputs:Map<string,PlayerInput>,dt:number)=>void,tick:(dt:number)=>void){let prior:typeof hero.casting|undefined,first:typeof hero.casting|undefined;const casts:{skill:string;frame:number}[]=[];for(let frame=0;frame<150;frame++){const held=[true,frame>=5,false],edge=[frame===0,frame===5,false];apply(new Map([[id,{dx:0,dy:0,aim:{x:hero.pos.x+100,y:hero.pos.y},held,edge}]]),1/60);if(frame===0)first=hero.casting;if(frame===5)assert.equal(hero.casting,first,'new held guard preserves original running cast');if(hero.casting&&hero.casting!==prior)casts.push({skill:hero.casting.inst.def.id,frame});prior=hero.casting;tick(1/60);assert.equal(hero.dead,false,'fixture hero remains alive throughout native input course');}return casts;}
const old=SKILL_INPUT_CFG.priority;SKILL_INPUT_CFG.priority='recent-held';try{
const oracle=withSeededRandom(45121,()=>{const writer=makeSimWorld('warrior',901);return course(writer.player,writer.localSeat.id,writer.applyInputs.bind(writer),writer.update.bind(writer));});
const result=withSeededRandom(45121,()=>{const setup=nativeCampaignFixture();const saved=new Map<string,PropertyDescriptor>(),inputDrivers:string[]=[];for(const name of ['applyInputs','passInputTime','unspentHeld','spendPresses','spendPress','walkFrames','improvisedFor','harvestFeed','traceFeed','traceSettle','useMetaSkill']){const d=Object.getOwnPropertyDescriptor(World.prototype,name)!;saved.set(name,d);Object.defineProperty(World.prototype,name,{...d,value(){inputDrivers.push(name);throw Error('World input fallback: '+name);}});}try{return refuseWorldCombat([setup.writer],worldDrivers=>{const {ongoing,writer,coordinator}=birthActualNativeArea(setup),combat=ongoing.combat;const casts=course(writer.player,writer.localSeat.id,combat.applyInputs.bind(combat),dt=>coordinator.published.combat.campaignFrame.tick(dt));assert.deepEqual(casts,oracle,'actual retained input plus full frame matches original held-skill opportunities');assert.deepEqual(worldDrivers,[]);assert.deepEqual(inputDrivers,[]);return{casts,worldDrivers,inputDrivers};});}finally{for(const[name,d]of saved)Object.defineProperty(World.prototype,name,d);}});
const report={scope:'150 actual input and full campaign frames; original native held-Cleave then held-shield oracle, with unchanged cast commitment and opportunity frames. Geometry and campaign content differ between fixtures; this asserts only the exact input/cast timeline.',oracle,result,receipt:combatHash(JSON.stringify(result))};writeCombatProof('native-input-cast-cycle.json',report);console.log(JSON.stringify(report));
}finally{SKILL_INPUT_CFG.priority=old;}
