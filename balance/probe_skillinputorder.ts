import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
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
