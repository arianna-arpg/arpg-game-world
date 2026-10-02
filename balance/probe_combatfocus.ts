import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { ESSENCES, abilityEssenceOfTier, LEDGER_ESSENCE_TOUCHED } from '../src/data/essences';
import { CombatTextLayout, combatBodyRect, combatRectsOverlap, type CombatRect } from '../src/render/vis/combatFocus';
import { VIS_CFG } from '../src/render/vis/visConfig';
const cfg=VIS_CFG.combatFocus.numbers, layout=new CombatTextLayout();
const bodies=[combatBodyRect({x:0,y:0},14),combatBodyRect({x:22,y:-30},18),combatBodyRect({x:-15,y:-24},14)];
const source=Array.from({length:14},(_,i)=>({pos:{x:(i%3)*8-8,y:-20-Math.floor(i/3)*5},value:String(i+1),life:.7}));
const before=JSON.stringify(source),rects:ReturnType<typeof combatBodyRect>[]=[];
layout.begin(bodies);
const placed=source.map(t=>{
  const p=layout.place(t,t.pos,22,13);
  const r={x:p.x-11-cfg.gap,y:p.y-13-cfg.gap,w:22+cfg.gap*2,h:13+cfg.gap*2};
  assert.ok(!bodies.some(b=>combatRectsOverlap(b,r)),'numbers leave actual bodies and overhead space clear');
  assert.ok(!rects.some(b=>combatRectsOverlap(b,r)),'numbers remain separately readable');
  rects.push(r);return p;
});
assert.equal(JSON.stringify(source),before,'presentation cannot rewrite simulation text');
console.log('PASS crowded damage layout clears bodies, bars and other values without rewriting host text');
layout.begin(bodies);
assert.deepEqual(source.map(t=>layout.place(t,t.pos,22,13)),placed,'paused/redrawn frame is stable');
layout.begin([]);
assert.deepEqual(source.map(t=>layout.place(t,t.pos,22,13)),placed,'cleared bodies do not snap a still-live number back');
console.log('PASS repeated frames and departing bodies retain stable live offsets');
const key={}, at={x:500,y:500};
layout.begin([]);assert.deepEqual(layout.place(key,at,20,13),at);
const mutable=cfg as {enabled:boolean},old=cfg.enabled;
try{mutable.enabled=false;layout.begin(bodies);assert.deepEqual(layout.place({},source[0].pos,22,13),source[0].pos);}
finally{mutable.enabled=old;}
const edge={x:8,y:50},bounds={x:0,y:0,w:180,h:130};
layout.begin([combatBodyRect(edge,14)],bounds);
const shifted=layout.place({},edge,22,13);
assert.ok(shifted.x-11-cfg.gap>=0 && shifted.x+11+cfg.gap<=bounds.w
  && shifted.y-13-cfg.gap>=0 && shifted.y+cfg.gap<=bounds.h,'displacement must remain on screen');
console.log('PASS quiet/disabled text preserves native placement and edge displacement stays inside the viewport');

const w=makeSimWorld('warrior',73);
w.texts=[];w.notices=[];w.pickupFeed=[];delete w.ledger[LEDGER_ESSENCE_TOUCHED];
const wallet=w.meta.essences.coarse, essence=abilityEssenceOfTier(1), ability=w.meta.abilityEssences[essence.id]??0;
w.grantEssence(w.localSeat,{essence:'coarse',count:2});
w.grantEssence(w.localSeat,{essence:'coarse',count:1});
w.grantAbilityEssence(w.localSeat,1,3);
w.text(w.player.pos,'+7 Life','#00ff00',12,'gains');
assert.equal(w.meta.essences.coarse,wallet+3);
assert.equal(w.meta.abilityEssences[essence.id],ability+3);
assert.equal(w.ledger[LEDGER_ESSENCE_TOUCHED],3);
assert.equal(w.notices.filter(n=>n.text.includes('strange residue')&&n.channel==='civic').length,1);
assert.equal(w.texts.filter(t=>t.yieldToCombat).length,3);
assert.ok(!w.texts.some(t=>t.text.includes('strange residue')));
assert.ok(!w.texts.find(t=>t.text==='+7 Life')!.yieldToCombat);
assert.equal(w.pickupFeed.find(p=>p.label===ESSENCES.coarse.label)!.count,3);
assert.equal(w.pickupFeed.find(p=>p.label===essence.label)!.count,3);
const snapshot=serializeSnapshot(w,1), client=makeSimWorld('warrior',74);
applySnapshot(client,snapshot);
assert.deepEqual(client.texts.map(({pos,...t})=>t),w.texts.map(({pos,...t})=>t),'remote clients receive the same presentation policy; native wire position quantization is unchanged');
for(const t of snapshot.texts)delete t.yieldToCombat;
applySnapshot(client,snapshot);
assert.ok(client.texts.every(t=>!t.yieldToCombat),'legacy wire packets retain their former presentation');
delete w.ledger[LEDGER_ESSENCE_TOUCHED];
const restoreRandom=seedGlobalRandom(438);
try{
  Math.random();Math.random();const nativeNext=Math.random();
  seedGlobalRandom(438);
  w.grantEssence(w.localSeat,{essence:'coarse',count:1});
  assert.equal(Math.random(),nativeNext,'moving the discovery note cannot shift native reward/simulation randomness');
}finally{restoreRandom();}
console.log('PASS resource feedback yields independently of healing; wallets, discovery ledger, pickup feed and old/new network text roundtrips are preserved');

import { CombatMeterLayout } from '../src/render/vis/combatMeters';
const meterLayout=new CombatMeterLayout(), keys=Array.from({length:4},()=>({}));
const positions=[{x:0,y:0},{x:23,y:-20},{x:-23,y:-20},{x:0,y:-43}];
let shift={x:0,y:0};const stack:typeof shift[]=[];
let linkStart={x:0,y:0};const links:{start:typeof shift;end:typeof shift}[]=[];
const meterCtx={
 save:()=>stack.push({...shift}),restore:()=>{shift=stack.pop()!;},
 translate:(x:number,y:number)=>{shift.x+=x;shift.y+=y;},
 beginPath:()=>{},moveTo:(x:number,y:number)=>{linkStart={x,y};},
 lineTo:(x:number,y:number)=>{links.push({start:linkStart,end:{x,y}});},stroke:()=>{},
} as unknown as CanvasRenderingContext2D;
const frame=(time:number, crowded=true)=>{
  const drawn:CombatRect[]=[];
  meterLayout.begin(time);
  keys.forEach((key,i)=>meterLayout.body(key,crowded?positions[i]:{x:i*200,y:200},12));
  keys.forEach((key,i)=>{
    const p=crowded?positions[i]:{x:i*200,y:200};
    const rect={x:p.x-16,y:p.y-33,w:32,h:16};
    meterLayout.add(key,rect,()=>drawn.push({...rect,x:rect.x+shift.x,y:rect.y+shift.y}));
  });
  meterLayout.paint(meterCtx);
  return drawn;
};
const meterBefore=JSON.stringify(positions), displaced=frame(0),mc=VIS_CFG.combatFocus.meters;
const bodyBoxes=positions.map(p=>({x:p.x-12,y:p.y-12,w:24,h:24}));
assert.ok(links.length>0,'crowded meters identify their displaced owner');
for(const {start,end} of links){
 const owner=positions.findIndex(p=>Math.abs(Math.hypot(start.x-p.x,start.y-p.y)-(12+mc.linkGap))<.00001);
 assert.ok(owner>=0,'leader starts outside its real owner');
 for(const [i,p] of positions.entries())if(i!==owner){
  const dx=end.x-start.x,dy=end.y-start.y;
  const t=Math.max(0,Math.min(1,((p.x-start.x)*dx+(p.y-start.y)*dy)/(dx*dx+dy*dy)));
  assert.ok(Math.hypot(start.x+dx*t-p.x,start.y+dy*t-p.y)>=12+mc.linkGap-.00001,'leader cannot pass through a different body');
 }
}
for(const [i,r] of displaced.entries()){
 assert.ok(!bodyBoxes.some(b=>combatRectsOverlap(r,b)),'meters leave visible bodies clear');
 assert.ok(!displaced.slice(0,i).some(b=>combatRectsOverlap(r,b)),'separate actors retain separate meter groups');
}
assert.deepEqual(frame(0),displaced,'paused redraw cannot move an anchored meter');
assert.equal(JSON.stringify(positions),meterBefore,'meter layout cannot move native actors');
frame(.1,false);const returned=frame(1,false);
returned.forEach((r,i)=>assert.equal(r.x,i*200-16,'quiet separated bodies return to their native anchors'));
assert.equal(returned[0].y,167);
meterLayout.begin(2);
meterLayout.body(keys[0],{x:0,y:0},12);
let hiddenCalls=0;
meterLayout.add(keys[1],{x:-16,y:-33,w:32,h:20},()=>hiddenCalls++);
meterLayout.add(keys[0],{x:-16,y:-33,w:32,h:8},()=>{});
meterLayout.paint(meterCtx);
assert.equal(hiddenCalls,1,'unregistered but unconcealed meters retain their original pass');
assert.deepEqual(meterLayout.footprints,[{x:-16,y:-33,w:32,h:8}],'hidden meters cannot displace visible meters');
const enabled=mc.enabled;
for(const useLayout of [true,false]){
 (mc as {enabled:boolean}).enabled=useLayout;
 meterLayout.begin(2.5);meterLayout.conceal(keys[1]);
 let concealedCalls=0;
 meterLayout.add(keys[1],{x:-16,y:-33,w:32,h:20},()=>concealedCalls++);
 meterLayout.paint(meterCtx);
 assert.equal(concealedCalls,0,'concealed meters cannot leak under translucent fog, even with layout disabled');
 assert.equal(meterLayout.footprints.length,0);
 meterLayout.begin(2.6);
 meterLayout.add(keys[1],{x:-16,y:-33,w:32,h:20},()=>concealedCalls++);
 assert.equal(concealedCalls,1,'next-frame reveal restores the native readout');
}
(mc as {enabled:boolean}).enabled=enabled;
try{
 (mc as {enabled:boolean}).enabled=false;
 const disabled=frame(3);
 disabled.forEach((r,i)=>assert.deepEqual(r,{x:positions[i].x-16,y:positions[i].y-33,w:32,h:16}));
}finally{(mc as {enabled:boolean}).enabled=enabled;}
console.log('PASS combat meter groups clear visible bodies, stay stable, return home and ignore hidden competitors without changing actors');


const nameTune={...VIS_CFG.combatFocus.names,enabled:true as boolean},names=new CombatTextLayout(()=>nameTune);
const nameBodies=[{x:470,y:440,w:60,h:95},{x:525,y:420,w:40,h:80},{x:490,y:388,w:46,h:12}];
const nameKey={},nameAt={x:500,y:448},nameBounds={x:0,y:0,w:1280,h:850};
names.begin(nameBodies,nameBounds);
const namePos=names.place(nameKey,nameAt,188,26);
const nameBox={x:namePos.x-94-nameTune.gap,y:namePos.y-26-nameTune.gap,w:188+nameTune.gap*2,h:26+nameTune.gap*2};
assert.ok(!nameBodies.some(r=>combatRectsOverlap(nameBox,r)),'whole two-line name clears bodies and meters');
names.begin(nameBodies,nameBounds);
assert.deepEqual(names.place(nameKey,nameAt,188,26),namePos,'a stationary hover name remains stable');
names.forget(nameKey);names.begin([],nameBounds);
assert.deepEqual(names.place(nameKey,nameAt,188,26),nameAt,'a new hover session can use the now-clear native anchor');
nameTune.enabled=false;names.begin(nameBodies,nameBounds);
assert.deepEqual(names.place(nameKey,nameAt,188,26),nameAt,'name layout has an independent opt-out');
console.log('PASS grouped hover-name placement clears bodies/meters and remains stable with its own configuration');
