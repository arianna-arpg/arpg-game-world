import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { evalCondition } from '../src/engine/brain';
import { MONSTERS } from '../src/data/monsters';
import { setSimTap } from '../src/engine/tap';
const brain=MONSTERS.gnoll_bonepicker.brain!;
const exercise=(hz:number,prior:boolean)=>{
 const restore=seedGlobalRandom(113042);
 const rules=brain.rules!.map(r=>{const ext={...r.when.ext};delete ext.nerveAbove;return {...r,when:{...r.when,ext}};});
 // Previous authored rule, on its own definition identity so normalization
 // cannot reuse the current definition's cached tuning.
 MONSTERS.gnoll_bonepicker.brain=prior?{...brain,rules}:brain;
 try{
  const w=makeSimWorld('magician',42),a=w.createMonster('gnoll_bonepicker',1,'enemy');
  a.pos={x:w.player.pos.x+250,y:w.player.pos.y};a.aiAnchor={...a.pos};a.facing=Math.PI;
  a.life*=.25;w.actors.push(a);w.player.invulnerable=true;
  const casts:{at:number;id:string}[]=[],early:{x:number;y:number;nerve:number;remaining:number}[]=[];
  setSimTap({onCast(b,s){if(b===a)casts.push({at:w.time,id:s.def.id});}});
  for(let f=0;f<hz*8;f++){
   const dx=a.pos.x-w.player.pos.x,dy=a.pos.y-w.player.pos.y,d=Math.hypot(dx,dy),go=d>220;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?dx/d:0,dy:go?dy/d:0,aim:a.pos,held:[],edge:[]}]]),1/hz);
   updateAI(a,w,1/hz);w.update(1/hz);
   if(f<hz*3)early.push({...a.pos,nerve:a.aiNerve,remaining:a.aiMoraleUntil-w.time});
  }
  assert.ok(a.aiMoraleBroke&&a.aiMoraleUntil<=w.time&&a.aiNerve===0);
  assert.ok(w.lineOfSight(a.pos,w.player.pos),'actual perceived target remains available after the rout');
  return {w,a,casts,early};
 }finally{setSimTap(null);MONSTERS.gnoll_bonepicker.brain=brain;restore();}
};
for(const hz of [30,60,120]){
 const prior=exercise(hz,true),current=exercise(hz,false);
 assert.deepEqual(current.early,prior.early,'first three seconds of native panic remain exact');
 assert.equal(prior.casts.length,0,'previous wounded rule never resumes attacking');
 assert.ok(current.casts.length>=2&&current.casts.every(c=>c.id==='hurl_debris'&&c.at>=3.5));
 assert.ok(current.casts[0].at<5,'the cornered survivor returns to its native weapon promptly after rallying');
 const {w,a}=current;
 a.life=a.maxLife()*.95;updateAI(a,w,1/hz);w.update(1/hz);
 assert.equal(a.aiMoraleBroke,false,'healing still rearms the native wound response');
 a.life=a.maxLife()*.25;updateAI(a,w,1/hz);
 assert.ok(a.aiMoraleBroke&&a.aiMoraleUntil>w.time,'a later real threshold crossing can rout again');
 console.log('PASS '+hz+' Hz: exact initial panic; prior zero casts, current '+current.casts.length
  +' native throws after rally; healing rearms the wound response');
}
const w=makeSimWorld('magician',51),a=w.createMonster('gnoll_bonepicker',1,'enemy');
const ctx={time:w.time,actors:w.actors,lineOfSight:w.lineOfSight.bind(w),factionDrive:()=>0};
const rule=brain.rules![0].when;
for(const [nerve,on] of [[0,false],[.2,true],[.45,false],[1,false]] as const){
 a.aiNerve=nerve;assert.equal(evalCondition(rule,a,w.player,ctx),on);
}
a.aiNerve=.2;
for(const value of [undefined,null,'0',NaN,Infinity,-Infinity]){
 assert.equal(evalCondition({ext:{nerveAbove:value}},a,w.player,ctx),false,'invalid new predicate arguments fail closed');
}
assert.equal(evalCondition({ext:{unknownNervePredicate:0}},a,w.player,ctx),false);
a.aiNerve=0;assert.equal(evalCondition({ext:{nerveBelow:.45}},a,w.player,ctx),true,'existing predicate retains its old semantics');
console.log('PASS strict courage-band boundaries, native rule composition, invalid/unknown refusal and unchanged existing predicate');
