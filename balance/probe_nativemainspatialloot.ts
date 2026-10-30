import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {ORB_DEFS,orbAmount} from '../src/data/orbs';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {withSeededRandom} from '../src/core/rng';
import type {World} from '../src/engine/world';
const checks:string[]=[];
function check(name:string,run:()=>void){run();checks.push(name);console.log('PASS '+name);}
withSeededRandom(411907,()=>{
 const world=makeSimWorld('warrior',411907);world.startWorldMass(411907);
 const mass=world.massRuntime;assert(mass?.config.progression,'actual geographic progression enabled');
 const points=[{x:900,y:900},{x:1000000,y:900}],levels=points.map(at=>world.levelAt(at));
 assert.notEqual(levels[0],levels[1],'actual geographic levels differ');const sharedZone=world.zone,zoneLevel=world.zone.level;
 const emit=(at:{x:number;y:number},amount?:number)=>{const count=world.orbs.length;world.shedOrb('life',at,{scatter:0,clamp:false,flowFromTier:3,...(amount===undefined?{}:{amount})});assert.equal(world.orbs.length,count+1);return world.orbs.at(-1)!;};
 check('actual seamless geographic levels determine orb value at each drop position',()=>{
  world.orbs=[];for(let i=0;i<points.length;i++){const orb=emit(points[i]);assert.equal(orb.amount,orbAmount(ORB_DEFS.life,levels[i]));assert.deepEqual(orb.pos,points[i]);assert.equal(orb.flowFromTier,3);assert.equal(world.zone,sharedZone);assert.equal(world.zone.level,zoneLevel);}
  assert.notEqual(world.orbs[0].amount,world.orbs[1].amount);
 });
 const reward=<T>(level:number,action:()=>T):T=>Reflect.apply(Reflect.get(world,'withMassReward'),world,[level,action]);
 check('nested native reward attribution restores its parent and spatial policy after throws',()=>{
  const at=points[0],outer=levels[1],inner=outer+3,exact=Error('nested native reward');
  reward(outer,()=>{assert.equal(emit(at).amount,orbAmount(ORB_DEFS.life,outer));assert.throws(()=>reward(inner,()=>{assert.equal(emit(at).amount,orbAmount(ORB_DEFS.life,inner));throw exact;}),e=>e===exact);assert.equal(emit(at).amount,orbAmount(ORB_DEFS.life,outer));});
  assert.equal(emit(at).amount,orbAmount(ORB_DEFS.life,levels[0]));
 });
 check('explicit orb amounts skip level selection and native failed policy keeps earlier effects only',()=>{
  const original=Reflect.get(world,'lootLevelAt'),exact=Error('selected level'),at=points[0];let calls=0;
  Object.defineProperty(world,'lootLevelAt',{configurable:true,value:function(this:World,p:typeof at){assert.equal(this,world);assert.equal(p,at);calls++;throw exact;}});
  assert.equal(emit(at,7).amount,7);assert.equal(calls,0);const count=world.orbs.length;
  assert.throws(()=>emit(at),e=>e===exact);assert.equal(calls,1);assert.equal(world.orbs.length,count);
  Object.defineProperty(world,'lootLevelAt',{configurable:true,value:original});
 });
 check('retained loot adapter selects the live owner policy and original position',()=>{
  // This is explicit adapter instrumentation, separate from the real spatial
  // runtime above. The retained owner's default authored-area policy is constant.
  const source=makeSimWorld('warrior',411908),area=new NativeAreaSceneAssembly(freshAssemblyInput(source,source.zone)),owner=area.lootController;
  const at={x:120,y:150},other={x:900,y:150};let calls=0;
  owner.lootLevelAt=function(p){assert.equal(this,owner);assert(p===at||p===other);calls++;return p===at?4:19;};
  owner.shedOrb('life',at,{clamp:false,scatter:0});owner.shedOrb('life',other,{clamp:false,scatter:0});
  assert.deepEqual(owner.input.state.orbs.map(o=>o.amount),[orbAmount(ORB_DEFS.life,4),orbAmount(ORB_DEFS.life,19)]);assert.equal(calls,2);
  owner.lootLevelAt=function(p){assert.equal(this,owner);assert.equal(p,at);calls++;return 23;};
  owner.shedOrb('life',at,{clamp:false,scatter:0});assert.equal(owner.input.state.orbs.at(-1)!.amount,orbAmount(ORB_DEFS.life,23));
  owner.shedOrb('life',at,{clamp:false,amount:11});assert.equal(calls,3);assert.equal(owner.input.state.orbs.at(-1)!.amount,11);assert.equal(source.orbs.length,0);
 });
 mass.dispose();console.log(JSON.stringify({groups:checks.length,levels,sharedZoneLevel:zoneLevel,checks,scope:'Actual WorldMass geographic reward policy plus separately labeled retained adapter instrumentation; no retained-area scheduler activation.'}));
});
