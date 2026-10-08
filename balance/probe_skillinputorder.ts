import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {SKILLS} from '../src/data/skills';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILL_INPUT_CFG,SkillInputOrder} from '../src/engine/skillInputOrder';

function play(priority:'slot'|'recent-held', secondary=1, release=Infinity){
 SKILL_INPUT_CFG.priority=priority;
 const w=makeSimWorld('warrior',901),p=w.player;w.actors=[p];
 let previous:unknown,first:unknown;const casts:{id:string;frame:number}[]=[];
 for(let frame=0;frame<150;frame++){
  const held=[true,false,false],edge=[frame===0,false,false];
  held[secondary]=frame>=5&&frame<release;edge[secondary]=frame===5;
  w.applyInputs(new Map([[w.localSeat.id,{dx:0,dy:0,aim:{x:p.pos.x+100,y:p.pos.y},held,edge}]]),1/60);
  if(frame===0)first=p.casting;
  if(frame===5)assert.equal(p.casting,first,'a new held choice cannot cancel the committed primary cast');
  if(p.casting&&p.casting!==previous)casts.push({id:p.casting.inst.def.id,frame});
  previous=p.casting;w.update(1/60);
 }
 return {w,p,casts};
}
const original=SKILL_INPUT_CFG.priority;
try{
 const legacy=play('slot'),fresh=play('recent-held');
 assert.ok(legacy.casts.length>=3&&legacy.casts.every(c=>c.id==='cleave'),'prior slot order reproduces shield starvation');
 assert.deepEqual(fresh.casts.map(c=>c.id),['cleave','shield_up']);
 assert.equal(fresh.casts[1].frame,legacy.casts[1].frame,'guard waits for the same native cast/recovery opportunity');
 console.log('PASS held shield replaces the next Cleave repeat, without cancelling or accelerating the first cast');
 const released=play('recent-held',1,100);
 assert.ok(released.casts.slice(2).some(c=>c.id==='cleave'),'releasing the guard restores the still-held primary');
 const tapped=play('recent-held',1,6);
 assert.ok(tapped.casts.every(c=>c.id==='cleave'),'a released mid-cast tap is not queued for later');
 const cry=play('recent-held',2);
 assert.ok(cry.casts.some(c=>c.id==='war_cry'),'new held utility uses the ordinary native skill');
 assert.ok(cry.casts.slice(2).some(c=>c.id==='cleave'),'cooldown refusal falls back to the other held action');
 console.log('PASS native guard release, short-tap commitment and utility cooldown fallback retain their gates');

 SKILL_INPUT_CFG.priority='recent-held';
 const order=new SkillInputOrder(),a={},b={};
 assert.deepEqual(order.slots(a,4,[true],[true]),[0,1,2,3]);
 assert.deepEqual(order.slots(a,4,[true,false,true],[false,false,true]),[2,0,1,3]);
 assert.deepEqual(order.slots(a,4,[true,false,true],[]),[2,0,1,3]);
 assert.deepEqual(order.slots(b,4,[true,false,true],[]),[0,1,2,3],'seat histories are independent');
 assert.deepEqual(order.slots(a,4,[true,false,false],[]),[0,1,2,3],'release removes priority');
 assert.deepEqual(order.slots(a,4,[true,false,true],[]),[0,1,2,3],'a legacy hold without an edge invents no newer press');
 assert.deepEqual(order.slots(a,4,[true,false,true],[],[false,false,true]),[2,0,1,3],'meta press owns the new choice');
 assert.deepEqual(order.slots(a,4,[true,false,false,false],[false,true,false,true]),[1,3,0,2],'same-frame edges keep deterministic slot order');
 assert.deepEqual(order.slots(a,1,[true],[]),[0],'changed bars cannot retain missing slots');
 assert.deepEqual(order.slots(a,0,[],[]),[]);
 console.log('PASS per-seat order, release, legacy intents, meta edges, same-frame ties and changed bars');
}finally{SKILL_INPUT_CFG.priority=original;}

const originalMovement=SKILL_INPUT_CFG.movement;
try{
 SKILL_INPUT_CFG.priority='recent-held';
 const walkOrder=new SkillInputOrder(),seat={},other={};
 assert.deepEqual(walkOrder.slots(seat,3,[true],[true],[],false),[0,1,2]);
 assert.deepEqual(walkOrder.slots(seat,3,[true],[],[],true),[],'a new walk supersedes an older repeat');
 assert.deepEqual(walkOrder.slots(seat,3,[true],[],[],true),[],'walking keeps ownership without repeated edges');
 assert.deepEqual(walkOrder.slots(other,3,[true],[],[],false),[0,1,2],'another seat keeps its independent intent');
 assert.deepEqual(walkOrder.slots(seat,3,[true,false,true],[false,false,true],[],true),[2],'a new skill wins above the walk');
 assert.deepEqual(walkOrder.slots(seat,3,[true,false,false],[],[],true),[],'releasing that skill restores the walk');
 assert.deepEqual(walkOrder.slots(seat,3,[true],[],[],false),[0,1,2],'ending the walk restores the held primary');
 assert.deepEqual(walkOrder.slots(seat,3,[true],[true],[],true),[0],'same-frame walk/skill press favors the skill');
 assert.deepEqual(walkOrder.slots(seat,0,[],[],[],true),[],'a changed bar cannot expose the walk sentinel');
 const legacyHand={};
 assert.deepEqual(walkOrder.slots(legacyHand,3,[true],[],[],true),[0],'a first simultaneous legacy hold/walk can still start');
 assert.deepEqual(walkOrder.slots(legacyHand,3,[true],[],[],true),[0],'the new legacy hold keeps its priority');
 assert.deepEqual(walkOrder.slots(legacyHand,3,[],[],[],true),[]);
 assert.deepEqual(walkOrder.slots(legacyHand,3,[true],[],[],true),[0],'a new observed hold during walking remains usable without edge bits');
 console.log('PASS fresh walk, fresh skill, releases, same-frame tie, legacy holds, empty bar and independent seats');

 function walking(movement:'recent-walk'|'ignore', release=Infinity, repress=Infinity, mobileCleave=false){
  SKILL_INPUT_CFG.movement=movement;
  const w=makeSimWorld('warrior',902),p=w.player;w.actors=[p];
  // Keep the historical rooted reference: this probe measures intent order.
  p.skills[0]=makeSkillInstance(mobileCleave?{...SKILLS.cleave,castMove:.35,castAim:'live'}:SKILLS.cleave);
  const origin={...p.pos},casts:{id:string;frame:number}[]=[];
  let previous:unknown,committed:unknown,firstMove=-1;
  for(let frame=0;frame<150;frame++){
   w.applyInputs(new Map([[w.localSeat.id,{dx:frame>=5&&frame<release?1:0,dy:0,
    aim:{x:origin.x+100,y:origin.y},held:[true],edge:[frame===0||frame===repress]}]]),1/60);
   if(frame===0)committed=p.casting;
   if(frame===5)assert.equal(p.casting,committed,'walking cannot cancel the original committed swing');
   if(p.casting&&p.casting!==previous)casts.push({id:p.casting.inst.def.id,frame});
   if(firstMove<0&&p.pos.x>origin.x+.01)firstMove=frame;
   previous=p.casting;w.update(1/60);
  }
  return {casts,firstMove,dx:p.pos.x-origin.x};
 }
 const blocked=walking('ignore'),retreat=walking('recent-walk');
 console.log(JSON.stringify({blocked,retreat}));
 assert.ok(blocked.casts.length>=3&&blocked.dx<retreat.dx/3,'legacy cast repeats leave much less room to walk');
 assert.equal(retreat.casts.length,1,'a new walk suppresses further auto-repeats');
 assert.equal(retreat.firstMove,blocked.firstMove,'both obey the same original native movement lock');
 assert.ok(retreat.dx>150,'the player actually walks after the committed cast');
 const mobile=walking('recent-walk',Infinity,Infinity,true);
 assert.equal(mobile.firstMove,5,'explicit mobile fixture walks during the same committed swing');
 assert.equal(mobile.casts.length,1,'a fresh walk still suppresses its older repeat');
 const resumed=walking('recent-walk',100);
 assert.ok(resumed.casts.some(c=>c.frame>=100),'ending movement resumes the still-held primary');
 const chosen=walking('recent-walk',Infinity,100);
 assert.ok(chosen.casts.some(c=>c.frame===100),'an explicit new attack press can commit while walking');
 console.log('PASS native movement after committed cast, older-repeat suppression, release resumption and explicit attack precedence');

 SKILL_INPUT_CFG.movement='recent-walk';
 const guardWorld=makeSimWorld('warrior',903),guardHero=guardWorld.player;
 guardWorld.actors=[guardHero];let guard:unknown;
 for(let frame=0;frame<50;frame++){
  guardWorld.applyInputs(new Map([[guardWorld.localSeat.id,{dx:frame>=5?1:0,dy:0,
   aim:{x:guardHero.pos.x+100,y:guardHero.pos.y},held:[false,true],edge:[false,frame===0]}]]),1/60);
  if(frame===0)guard=guardHero.casting;
  assert.equal(guardHero.casting,guard,'a walk never releases or replaces the already-held guard');
  guardWorld.update(1/60);
 }
 assert.equal(guardHero.casting?.mode,'guard');assert.equal(guardHero.casting?.held,true);
 console.log('PASS native held guard remains fed during a later walk');
 const cw=makeSimWorld('magician',904),cp=cw.player;cw.actors=[cp];
 cp.skills[0]=makeSkillInstance(SKILLS.surgewind,1);cw.devIgnoreSkillAttributes=true;
 let channel:unknown;
 for(let frame=0;frame<30;frame++){
  cw.applyInputs(new Map([[cw.localSeat.id,{dx:frame>=5?1:0,dy:0,
   aim:{x:cp.pos.x+100,y:cp.pos.y},held:[true],edge:[frame===0]}]]),1/60);
  if(frame===0)channel=cp.casting;
  assert.ok(channel);assert.equal(cp.casting,channel,'a walk never releases a held channel');
  cw.update(1/60);
 }
 assert.equal(cp.casting?.mode,'channel');assert.equal(cp.casting?.held,true);
 cw.applyInputs(new Map([[cw.localSeat.id,{dx:1,dy:0,aim:{...cp.pos},held:[],edge:[]}]]),1/60);
 cw.update(1/60);assert.equal(cp.casting,null,'the actual button release still ends the native channel');
 console.log('PASS native channel remains held during walking and releases only with its button');
}finally{SKILL_INPUT_CFG.movement=originalMovement;SKILL_INPUT_CFG.priority=original;}
