import assert from 'node:assert/strict';
import { RewardLabelLayout } from '../src/render/vis/rewardLabels';
import { combatRectsOverlap } from '../src/render/vis/combatFocus';
import { makeSimWorld } from '../src/sim/arena';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import type { ItemInstance } from '../src/engine/items';

const bounds={x:-300,y:-300,w:600,h:600}, hero={x:-20,y:-20,w:40,h:40};
const layout=new RewardLabelLayout(), ids=[1,2,3,4,5,6], source={x:0,y:-50};
layout.begin(ids,[hero],bounds);
const boxes=ids.map(id=>layout.place(id,source,100,id===3?28:14));
assert.ok(boxes.every(Boolean),'cluster names all fit');
for (let i=0;i<boxes.length;i++) {
  assert.ok(!combatRectsOverlap(boxes[i]!,hero),'hero body stays clear');
  for(let j=0;j<i;j++)assert.ok(!combatRectsOverlap(boxes[i]!,boxes[j]!),'persistent names never overlap');
}
layout.begin(ids,[hero],bounds);
assert.deepEqual(ids.map(id=>layout.place(id,source,100,id===3?28:14)),boxes,'same frame is stable');
layout.begin(ids,[],bounds);
assert.deepEqual(ids.map(id=>layout.place(id,source,100,id===3?28:14)),boxes,'departing body does not snap surviving names');
assert.deepEqual(source,{x:0,y:-50});
console.log('PASS clustered one/two-line rewards avoid each other and bodies, retain stable offsets and leave source untouched');

layout.begin([7],[],{x:0,y:0,w:100,h:100});
const edge=layout.place(7,{x:1,y:1},70,28)!;assert.ok(edge&&edge.x>=0&&edge.y>=0&&edge.x+edge.w<=100&&edge.y+edge.h<=100);
layout.begin([7],[bounds],bounds);assert.equal(layout.place(7,source,100,14),null,'crowded names wait instead of covering bodies');
layout.begin([7],[],bounds);assert.equal(layout.place(7,source,100,14,()=>false),null,'visibility cannot be bypassed');
assert.equal(layout.place(7,{x:NaN,y:0},100,14),null);
const capped=new RewardLabelLayout(()=>({enabled:true,gap:3,step:16,rings:12,maxLabels:1}));
capped.begin([1,2],[],bounds);assert.ok(capped.place(1,source,80,14));assert.equal(capped.place(2,source,80,14),null);
const disabled=new RewardLabelLayout(()=>({enabled:false,gap:3,step:16,rings:12,maxLabels:1}));
disabled.begin([1],[hero],bounds);assert.deepEqual(disabled.place(1,source,80,14),{x:-40,y:-50,w:80,h:14});
assert.equal(disabled.place(2,source,80,14,()=>false),null,'opting out does not bypass the supplied native reveal');
layout.begin([],[],bounds);assert.equal((layout as any).offsets.size,0,'retired identities cannot accumulate');
console.log('PASS bounds, saturation, visibility, invalid input, per-frame cap, opt-out and bounded identity retention');

const w=makeSimWorld('warrior',79);
w.drops=[];w.texts=[];
const item=(uid:number):ItemInstance=>({uid,baseId:'legs_evasion_es',name:'Windtrews',ilvl:1,tier:1,rarity:'common',baseRoll:0,implicitRolls:[],affixes:[]});
w.dropGearAt(w.player.pos,item(79001));w.dropGearAt(w.player.pos,item(79002));
assert.equal(w.drops.length,2);assert.deepEqual(w.texts.map(t=>t.dropUid),[79001,79002]);
w.text(w.player.pos,'Windtrews!','#ddd',14,'drop');
assert.equal(w.texts.at(-1)!.dropUid,undefined,'unattributed or same-named announcements remain independent');
const snap=serializeSnapshot(w,1), client=makeSimWorld('warrior',80);
applySnapshot(client,snap);
assert.deepEqual(client.texts.map(t=>t.dropUid),[79001,79002,undefined]);
assert.deepEqual(client.drops.map(d=>d.item.kind==='gear'?d.item.item.uid:null),[79001,79002]);
for(const t of snap.texts)delete t.dropUid;for(const d of snap.drops)delete d.dropUid;
applySnapshot(client,snap);
assert.ok(client.texts.every(t=>t.dropUid===undefined));
assert.ok(client.drops.every(d=>d.item.kind!=='gear'||d.item.item.uid===undefined));
const legacyKeys=client.drops.slice();layout.begin(legacyKeys,[],bounds);
assert.ok(layout.place(legacyKeys[0],source,100,14));assert.ok(layout.place(legacyKeys[1],source,100,14));
assert.equal(layout.footprints.length,2,'legacy shells do not share an undefined identity');
console.log('PASS actual native loot attribution, duplicate-name identity, snapshot roundtrip and legacy render shells');
