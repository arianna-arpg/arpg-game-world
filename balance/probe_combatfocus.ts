import assert from 'node:assert/strict';
import { CombatTextLayout, combatBodyRect, combatRectsOverlap } from '../src/render/vis/combatFocus';
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
