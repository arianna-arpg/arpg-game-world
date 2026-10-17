import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {MassDormancy, captureNativeActorState, validateNativeActorState} from '../src/worldmass/dormancy';
import {stageNativeCohort, validateNativeCohortPage} from '../src/worldmass/nativePaging';

const world=makeSimWorld('warrior',713);
world.time=100; world.player.pos={x:20000,y:0};
const actor=world.createMonster('gnoll_prowler',3,'enemy');
actor.pos={x:0,y:40};actor.aiAnchor={...actor.pos};actor.fromZoneGen=true;
// Native ring coordination keeps a previous target ID after combat. That body
// can have died/left this owner before the enemy qualifies for quiet dormancy.
actor.aiRingTarget=999999;actor.aiRingAt=0;
world.actors.push(actor);
const owned=new Map([['body/0',actor]]);
const dormancy=new MassDormancy({source:'checkpoint-regression',wakeRadius:512,sleepRadius:1024,quietSeconds:5});
dormancy.update(world,owned);
assert.equal(dormancy.isSleeping(actor),true);
const frame={dimension:'surface',cx:'0',cy:'0'};
const describe=(id:string,a:typeof actor)=>({id,monster:a.defId!,level:a.level,provenance:{seed:713}});
const stage=()=>stageNativeCohort('run','page',frame,960,world,owned,[...owned.keys()],dormancy,describe);
if(process.argv.includes('--baseline')) {
  const lease=stage();const page=JSON.parse(lease.body);
  assert.throws(()=>validateNativeCohortPage(page,{run:'run',page:'page',revision:'1',key:'page',digest:'',bytes:lease.body.length},frame,960),/Invalid native actor checkpoint/);
  console.log('REPRODUCED: staging accepts a quiet native checkpoint that its own reader rejects.');
} else {
  const before=captureNativeActorState(actor);
  assert.throws(stage,/Invalid native actor checkpoint.*aiRingTarget/);
  assert.deepEqual(captureNativeActorState(actor),before);
  assert.equal(owned.get('body/0'),actor);assert.equal(dormancy.isSleeping(actor),true);
  const state=captureNativeActorState(actor)!;
  assert.throws(()=>validateNativeActorState(state,{monster:actor.defId!,team:'enemy',actors:new Set([actor.id,world.player.id]),squads:new Set()}),/aiRingTarget.*999999/);
  // Complete state is admitted unchanged when the referenced body is present.
  actor.aiRingTarget=world.player.id;
  const valid=stage();
  assert.doesNotThrow(()=>validateNativeCohortPage(JSON.parse(valid.body),{run:'run',page:'page',revision:'1',key:'page',digest:'',bytes:valid.body.length},frame,960));
  console.log('PASS invalid pages refuse before persistence/release; exact bodies remain; valid references still pass.');
}
