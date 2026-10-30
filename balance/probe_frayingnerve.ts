import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';
import { setSimTap } from '../src/engine/tap';
const brain=MONSTERS.gnoll_bonepicker.brain!;
// Freeze the preceding positive-nerve rule, independent of future tuning.
const priorBrain={...brain,rules:[{
 when:{ext:{nerveAbove:0,nerveBelow:.45}},
 use:{move:{style:'retreat' as const},tempo:{pauseFor:[.4,.9] as [number,number]}},
}]};

function arena(prior:boolean,hz:number,fraction:number,leader=false){
 const restore=seedGlobalRandom(116042);
 MONSTERS.gnoll_bonepicker.brain=prior?priorBrain:brain;
 try{
  const w=makeSimWorld('magician',42),p=w.player,a=w.createMonster('gnoll_bonepicker',1,'enemy');
  a.pos={x:p.pos.x+250,y:p.pos.y};a.aiAnchor={...a.pos};a.facing=Math.PI;
  a.life*=fraction;w.actors.push(a);p.invulnerable=true;
  if(leader){
   const l=w.createMonster('gnoll_prowler',1,'enemy');
   l.pos={...a.pos};l.squadId=a.squadId=116;l.squadLeader=true;w.actors.push(l);
  }
  const casts:{at:number;nerve:number;id:string}[]=[],trace:unknown[]=[];
  setSimTap({onCast(b,s){if(b===a)casts.push({at:w.time,nerve:a.aiNerve,id:s.def.id});}});
  for(let f=0;f<hz*6;f++){
   const dx=a.pos.x-p.pos.x,dy=a.pos.y-p.pos.y,d=Math.hypot(dx,dy),go=d>220;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?dx/d:0,dy:go?dy/d:0,aim:{...a.pos},held:[],edge:[]}]]),1/hz);
   updateAI(a,w,1/hz);w.update(1/hz);
   trace.push({pos:{...a.pos},life:a.life,nerve:a.aiNerve,phase:a.aiPhase,rout:a.aiMoraleUntil});
  }
  return {casts,trace,broke:a.aiMoraleBroke};
 }finally{setSimTap(null);MONSTERS.gnoll_bonepicker.brain=brain;restore();}
}
for(const hz of [30,60,120]){
 const old=arena(true,hz,.72),now=arena(false,hz,.72);
 // The first AI evaluation uses the prior nerve stamp, so both may begin
 // one identical throw before the newly wounded condition takes effect.
 assert.equal(old.casts.filter(c=>c.nerve>0&&c.nerve<.45).length,1);
 assert.deepEqual(now.casts[0],old.casts[0]);
 const answers=now.casts.filter(c=>c.nerve>0&&c.nerve<.45);
 assert.ok(answers.length>=2&&answers[1].at<3.2&&answers.every(c=>c.id==='hurl_debris'),
  'fraying scavenger repeats its native weapon before another hit or wound recovery');
 assert.equal(now.broke,false,'a modest wound is not a fabricated panic');
 for(const [fraction,leader] of [[1,false],[.25,false],[.72,true]] as const){
  assert.deepEqual(arena(false,hz,fraction,leader),arena(true,hz,fraction,leader),
   'healthy, routed and captain-supported conduct stay exact');
 }
 console.log('PASS '+hz+' Hz: fraying native throws; exact healthy, routed and captain-supported conduct');
}

// Generated geography and native Warrior Cleave: the chase must resolve by
// actual attacks, not teleportation, forced death, invulnerability or rewards.
function country(prior:boolean){
 const restore=seedGlobalRandom(451);MONSTERS.gnoll_bonepicker.brain=prior?priorBrain:brain;
 try{
  const w=makeSimWorld('warrior',451);w.startWorldMass(451);const m=w.massRuntime!;
  const place=m.journey!.places.find(p=>p.content==='cinderwatch')!,q=m.journey!.local(place);
  w.landPartyAt(q);m.update(w,true);
  const p=w.player,a=w.actors.find(a=>a.encounterGroup?.recipe==='gnoll_road_foragers'&&a.defId==='gnoll_bonepicker')!;
  assert.ok(a);for(const b of w.actors)if(b.team==='enemy'&&b!==a&&!b.passive){b.dead=true;b.life=0;}
  a.pos=w.findFreeSpot({x:q.x,y:q.y+520},a.radius);a.aiAnchor={...a.pos};a.facing=Math.PI/2;
  w.landPartyAt(w.findFreeSpot({x:a.pos.x,y:a.pos.y+250},p.radius));m.update(w,true);
  assert.ok(w.lineOfSight(a.pos,p.pos));a.life*=.72;
  const initialLife=p.life;let swings=0,throws=0,hits=0;
  setSimTap({onCast(b){if(b===p)swings++;if(b===a)throws++;},onHit(b,v){if(b===p&&v===a)hits++;}});
  for(let f=0;f<1200&&!p.dead&&!a.dead;f++){
   const dx=a.pos.x-p.pos.x,dy=a.pos.y-p.pos.y,d=Math.hypot(dx,dy),go=d>27;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?dx/d:0,dy:go?dy/d:0,aim:{...a.pos},held:[d<38],edge:[]}]]),1/60);
   updateAI(a,w,1/60);w.update(1/60);
  }
  return {time:w.time,initialLife,life:p.life,heroDead:p.dead,enemyDead:a.dead,swings,throws,hits};
 }finally{setSimTap(null);MONSTERS.gnoll_bonepicker.brain=brain;restore();}
}
const old=country(true),now=country(false);
assert.ok(old.enemyDead&&now.enemyDead&&!now.heroDead);
assert.ok(now.time<old.time&&now.swings<old.swings&&now.hits>0);
assert.ok(now.throws>0&&now.life<now.initialLife,'the opening is earned while the enemy fights back');
console.log('PASS generated-country Warrior exchange: actual retaliation and fewer pursuit swings',JSON.stringify({old,now}));
