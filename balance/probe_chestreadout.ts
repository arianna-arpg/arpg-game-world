import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import type { Chest } from '../src/engine/world';
import { chestInReach, CHEST_INTERACTION_CFG } from '../src/engine/chestInteraction';
import { chestReadout, drawChestReadout } from '../src/render/vis/chestReadout';
import { VIS_CFG } from '../src/render/vis/visConfig';

const w=makeSimWorld('warrior',195),p=w.player;w.actors=[p];
const c:Chest={pos:{...p.pos},kind:'timed',mimic:false,opened:false,lockTime:4,maxLock:4};
w.chests=[c];
const tick=(dt:number)=>(w as unknown as {updateChests(dt:number):void}).updateChests(dt);
const state=()=>JSON.stringify([w.time,p.pos,p.life,c,w.drops.length,w.actors.length]);
const before=state();assert.equal(chestReadout(w,c.pos)?.text,VIS_CFG.chestReadout.searching);
assert.equal(state(),before);
p.pos.x=c.pos.x+p.radius+CHEST_INTERACTION_CFG.reach;
assert.ok(chestInReach(c,p));tick(.2);assert.ok(Math.abs(c.lockTime-3.8)<1e-8);
p.pos.x+=.001;assert.equal(chestInReach(c,p),false);
assert.equal(chestReadout(w,null)?.text,VIS_CFG.chestReadout.approach);
tick(.1);assert.ok(Math.abs(c.lockTime-3.86)<1e-8);
console.log('PASS one native reach boundary governs progress, recovery and read-only search/approach cues');

c.lockTime=c.maxLock;assert.equal(chestReadout(w,null),null);
assert.equal(chestReadout(w,c.pos)?.text,VIS_CFG.chestReadout.approach);
c.mimic=true;assert.equal(chestReadout(w,c.pos)?.text,VIS_CFG.chestReadout.approach);c.mimic=false;
p.pos.x+=1000;assert.equal(chestReadout(w,c.pos),null);
p.pos={...c.pos};w.clientActionHook=()=>{};assert.equal(chestReadout(w,c.pos),null);delete w.clientActionHook;
p.dead=true;assert.equal(chestReadout(w,c.pos),null);p.dead=false;
c.opened=true;assert.equal(chestReadout(w,c.pos),null);c.opened=false;
c.kind='objective';assert.equal(chestReadout(w,c.pos),null);c.kind='timed';
const other:Chest={...c,pos:{x:c.pos.x+30,y:c.pos.y}};w.chests.push(other);
assert.equal(chestReadout(w,other.pos)?.chest,c,'only the closest active search is named');
console.log('PASS hover discovery, untouched far caches, one cue, no mimic disclosure and dead/open/objective/mirror exclusions');

w.chests=[c];p.pos={x:c.pos.x-150,y:c.pos.y};
w.doodads.push({kind:'rock',pos:{x:c.pos.x-75,y:c.pos.y},radius:40,rot:0});w.markDoodadsChanged();
assert.equal(w.lineOfSight(p.pos,c.pos,p.tier),false);
assert.equal(chestReadout(w,c.pos),null,'hover cannot identify a chest through native solid scenery');
w.doodads=[];w.markDoodadsChanged();
assert.equal(chestReadout(w,c.pos)?.chest,c);
const texts:string[]=[];const ctx={save(){},restore(){},measureText(s:string){return {width:Array.from(s).length*6};},
 strokeText(){},fillText(s:string){texts.push(s);}} as unknown as CanvasRenderingContext2D;
const pure=state();drawChestReadout(ctx,'Move closer '+ '🧭'.repeat(90),c.pos);
assert.equal(state(),pure);assert.ok(Array.from(texts[0]).length*6<=VIS_CFG.chestReadout.width);
assert.ok(texts[0].endsWith('…'));
p.pos={...c.pos};tick(5);assert.ok(c.opened);const paid=w.drops.length;tick(5);assert.equal(w.drops.length,paid);
assert.equal(chestReadout(w,c.pos),null);
console.log('PASS native wall concealment, bounded Unicode presentation, unchanged simulation and one native payout');
