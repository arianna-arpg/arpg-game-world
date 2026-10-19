import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { setSimTap } from '../src/engine/tap';

// Ordinary Bonepickers must keep fighting while wounded or outnumbered.
for (const fraction of [1, .72, .25]) {
 const restore=seedGlobalRandom(113042);
 try {
  const w=makeSimWorld('magician',42),p=w.player,a=w.createMonster('gnoll_bonepicker',1,'enemy');
  a.pos={x:p.pos.x+250,y:p.pos.y};a.aiAnchor={...a.pos};a.facing=Math.PI;a.life*=fraction;
  const allies=Array.from({length:3},()=>w.createMonster('zombie',1,'player'));
  for(const ally of allies){ally.skills=[];ally.brain=undefined;ally.invulnerable=true;ally.untargetable=true;}
  w.actors=[p,a,...allies];p.invulnerable=true;
  const casts:number[]=[];
  setSimTap({onCast(b){if(b===a)casts.push(w.time);}});
  for(let frame=0;frame<600;frame++){
   const dx=a.pos.x-p.pos.x,dy=a.pos.y-p.pos.y,d=Math.hypot(dx,dy),go=d>220;
   w.applyInputs(new Map([[w.localSeat.id,{dx:go?dx/d:0,dy:go?dy/d:0,aim:a.pos,held:[],edge:[]}]]),1/60);
   for(let i=0;i<allies.length;i++)allies[i].pos={x:a.pos.x+100+i*20,y:a.pos.y+100};
   updateAI(a,w,1/60);w.update(1/60);
  }
  assert.ok(casts.length>=2,'the outnumbered Bonepicker resumes and repeats its weapon');
  if(fraction<.6){
   assert.ok(a.aiMoraleBroke&&a.aiMoraleUntil<=3.6,'one wound crossing owns one bounded rout');
   assert.ok(casts.every(at=>at>=3.5)&&casts[0]<5,'weapon resumes promptly after rally');
  } else assert.ok(a.aiMoraleUntil<=0,'frayed nerve and numerical odds do not create flight');
  console.log('PASS Bonepicker fights at life fraction '+fraction+' despite nearby opposing bodies');
 } finally {setSimTap(null);restore();}
}
