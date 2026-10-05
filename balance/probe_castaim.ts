import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { updateCastAim } from '../src/engine/castAim';
import { meleeReachCueOf } from '../src/engine/meleeReach';
import { bodyActionPoseOf } from '../src/engine/bodyAction';
import { castMovementHeld } from '../src/render/vis/castReadout';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

function fixture(prior=false){
 const w=makeSimWorld('warrior',451),p=w.player;
 w.actors=[p];p.pos={x:600,y:600};p.sheet.setSource('probe:quiet',[mod('manaRegen','override',0),mod('manaRegenPct','override',0)]);
 const inst=makeSkillInstance(prior?{...SKILLS.cleave,castMove:0,castAim:'press'}:SKILLS.cleave);
 p.skills[0]=inst;
 return {w,p,inst};
}
for(const hz of [30,60,120]){
 const outcomes=[];
 for(const prior of [true,false]){
  const restore=seedGlobalRandom(1845);
  try{
   const {w,p}=fixture(prior),a=w.createMonster('zombie',1,'enemy');
   a.pos={x:632,y:600};w.actors.push(a);
   const trace:unknown[]=[];
   setSimTap({onCast(b,s){if(b===p)trace.push(['cast',w.time,s.def.id,p.mana]);},
    onHit(b,v,result){if(b===p&&v===a)trace.push(['hit',w.time,result]);}});
   for(let f=0;f<hz*2&&!a.dead;f++){
    w.applyInputs(new Map([[w.localSeat.id,{dx:0,dy:0,aim:{x:800,y:600},held:[true],edge:[]}]]),1/hz);
    w.update(1/hz);
   }
   outcomes.push({trace,time:w.time,life:a.life,mana:p.mana,pos:p.pos,cooldowns:[...p.cooldowns]});
  }finally{setSimTap(null);restore();}
 }
 assert.deepEqual(outcomes[1],outcomes[0],'fixed-aim stationary execution clocks, costs and hits remain exact');
 console.log('PASS '+hz+' Hz exact stationary Cleave before/after');
}

for(const prior of [true,false]){
 const {w,p,inst}=fixture(prior),right={x:800,y:600},left={x:400,y:600};
 assert.ok(w.useSkill(p,inst,right,true));const cs=p.casting!,paid=p.mana,total=cs.total;
 w.applyInputs(new Map([[w.localSeat.id,{dx:0,dy:0,aim:left,held:[],edge:[]}]]),1/60);
 w.update(1/60);
 assert.equal(p.casting,cs);assert.equal(cs.total,total);assert.equal(p.mana,paid);
 assert.deepEqual(cs.aim,prior?right:left,'releasing the button does not cancel or prevent steering a committed swing');
 assert.equal(w.useSkill(p,p.skills[2]!,left,true),false,'another action still waits for completion');
 const cue=meleeReachCueOf(p)!;assert.ok(Math.abs(cue.facing-(prior?0:Math.PI))<1e-8);
 assert.ok(Math.abs(bodyActionPoseOf(p,w.time)!.facing-cue.facing)<1e-8);
 const client=makeSimWorld('warrior',452);applySnapshot(client,serializeSnapshot(w,1));
 assert.deepEqual(meleeReachCueOf(client.player),cue);
 const pos={...p.pos};w.moveActor(p,1,0,.05);
 if(prior){assert.deepEqual(p.pos,pos);assert.equal(castMovementHeld(w,p),true);}
 else {assert.ok(p.pos.x>pos.x);assert.equal(castMovementHeld(w,p),false);}
}
for(const prior of [true,false]){
 const {w,p,inst}=fixture(prior),left=w.createMonster('zombie',1,'enemy'),right=w.createMonster('zombie',1,'enemy');
 left.pos={x:560,y:600};right.pos={x:640,y:600};w.actors.push(left,right);
 const victims:number[]=[];setSimTap({onHit(b,v){if(b===p)victims.push(v.id);}});
 try{
  assert.ok(w.useSkill(p,inst,right.pos));
  w.applyInputs(new Map([[w.localSeat.id,{dx:0,dy:0,aim:{...left.pos},held:[],edge:[]}]]),1/60);
  for(let i=0;i<120&&p.casting;i++)w.update(1/60);
  assert.deepEqual(victims,[prior?right.id:left.id],'the native damage footprint follows the displayed aim');
 }finally{setSimTap(null);}
}
console.log('PASS native cursor steering, actual hit direction, commitment, cost, body/footprint alignment and host-resolved mirror');

{
 const {w,p,inst}=fixture();assert.ok(w.useSkill(p,inst,{x:800,y:600}));
 const cs=p.casting!,aim={...cs.aim};p.aimPos={x:400,y:600};
 for(const mode of ['channel','charge','guard','overcharge','concentration','perfect','timed','multitude'] as const){
  cs.mode=mode;updateCastAim(p);assert.deepEqual(cs.aim,aim,mode+' retains native aim rules');
 }
 cs.mode='cast';
 for(const field of ['targetInfo','lockedAim','plantTotem','plantChannel'] as const){
  (cs as any)[field]=field==='lockedAim'?{x:200,y:200}:true;
  updateCastAim(p);assert.deepEqual(cs.aim,aim,field);delete (cs as any)[field];
 }
 for(const value of [undefined,'press'] as const){
  inst.def={...inst.def,castAim:value};updateCastAim(p);assert.deepEqual(cs.aim,aim);
 }
 inst.def=SKILLS.cleave;
 for(const value of [null,{x:NaN,y:0},{x:0,y:Infinity}]){
  p.aimPos=value;updateCastAim(p);assert.deepEqual(cs.aim,aim);
 }
 p.aimPos={x:400,y:600};p.dead=true;updateCastAim(p);assert.deepEqual(cs.aim,aim);p.dead=false;
 p.downed=true;updateCastAim(p);assert.deepEqual(cs.aim,aim);p.downed=false;
 updateCastAim(p);assert.deepEqual(cs.aim,p.aimPos);assert.notEqual(cs.aim,p.aimPos);
 const before={...p.pos};p.anchored=true;w.moveActor(p,1,0,.1);assert.deepEqual(p.pos,before);
 p.anchored=false;p.poise=0;p.applyStatus('stun',0,1,'probe:castAim');
 const frozen={...cs.aim};p.aimPos={x:100,y:100};updateCastAim(p);assert.deepEqual(cs.aim,frozen);
 w.update(1/60);assert.equal(p.casting,null,'native stun cancels a mobile windup');
}
console.log('PASS held/timing modes, targeted/planted/locked uses, legacy defaults, invalid aim and life gates');

{
 const {w,p,inst}=fixture();const start={...p.pos};
 w.moveActor(p,1,0,.05);const full=p.pos.x-start.x;p.pos={...start};
 assert.ok(w.useSkill(p,inst,{x:800,y:600}));w.moveActor(p,1,0,.05);
 assert.ok(Math.abs(p.pos.x-start.x-full*SKILLS.cleave.castMove!)<1e-7);
 p.pos={...start};p.sheet.setSource('probe:mobility',[mod('castMobility','flat',.25)]);
 w.moveActor(p,1,0,.05);assert.ok(Math.abs(p.pos.x-start.x-full*.6)<1e-7);
 p.pos={...start};p.sheet.setSource('probe:mobility',[mod('castMobility','flat',1)]);
 w.moveActor(p,1,0,.05);assert.ok(Math.abs(p.pos.x-start.x-full)<1e-7);
 // No player-only aim exception: an enemy can supply its own live cursor too.
 const enemy=w.createMonster('skeleton_warrior',1,'enemy');enemy.pos={x:900,y:600};w.actors.push(enemy);
 const skill=makeSkillInstance(SKILLS.cleave);enemy.skills=[skill];
 assert.ok(w.useSkill(enemy,skill,{x:700,y:600}));enemy.aimPos={x:1100,y:600};w.update(1/60);
 assert.deepEqual(enemy.casting!.aim,enemy.aimPos);
}
console.log('PASS authored stride, additive mobility and cap; enemy supplied aim uses the same law');

function pursuit(prior:boolean,hz:number,trigger:number,seed:number){
 const restore=seedGlobalRandom(seed);
 try{
  const w=makeSimWorld('warrior',seed),p=w.player,a=w.createMonster('karst_slinger',1,'enemy');
  w.actors=[p,a];p.pos={x:600,y:600};a.pos={x:780,y:600};a.aiAnchor={...a.pos};a.facing=Math.PI;
  p.skills[0]=makeSkillInstance(prior?{...SKILLS.cleave,castMove:0,castAim:'press'}:SKILLS.cleave);
  let casts=0,hits=0,answers=0;
  setSimTap({onCast(b,s){if(b===p&&s.def.id==='cleave')casts++;if(b===a)answers++;},
   onHit(b,v,result){if(b===p&&v===a&&result.total>0)hits++;}});
  for(let f=0;f<hz*15&&!p.dead&&!a.dead;f++){
   const dx=a.pos.x-p.pos.x,dy=a.pos.y-p.pos.y,d=Math.hypot(dx,dy),go=d>30;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?dx/d:0,dy:go?dy/d:0,aim:{...a.pos},held:[d<trigger],edge:[]}]]),1/hz);
   updateAI(a,w,1/hz);w.update(1/hz);
  }
  assert.ok(a.dead&&!p.dead&&hits>0&&answers>0,'real enemy fights back and dies to native attacks');
  return {time:w.time,casts,hits,answers};
 }finally{setSimTap(null);restore();}
}
for(const hz of [30,60,120])for(const trigger of [38,60]){
 const pairs=[451,452,453].map(seed=>({old:pursuit(true,hz,trigger,seed),now:pursuit(false,hz,trigger,seed)}));
 const sum=(key:'old'|'now',field:'time'|'casts')=>pairs.reduce((n,p)=>n+p[key][field],0);
 assert.ok(sum('now','time')<sum('old','time')&&sum('now','casts')<sum('old','casts'));
 console.log('PASS '+hz+' Hz pursuit at '+trigger+' units: fewer swings and less time across three seeded native exchanges',JSON.stringify(pairs));
}
