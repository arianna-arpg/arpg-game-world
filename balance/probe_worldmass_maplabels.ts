import assert from 'node:assert/strict';
import { MASS_MAP_LABELS, placeMassMapLabels, type MapBox, type MassMapLabel } from '../src/worldmass/mapLabels';
const measure=(s:string)=>s.length*6, bounds={x:6,y:28,w:628,h:366};
const labels: MassMapLabel[]=[
 {id:'home',name:'Lastlight',x:320,y:345,priority:2},
 {id:'camp',name:'Cinderwatch Camp',x:230,y:345,priority:1},
 {id:'gate',name:'The Broken Gate',x:320,y:245,priority:1},
 {id:'caravan',name:'The Silent Caravan',x:205,y:258,priority:1},
];
const markers=labels.map(l=>({x:l.x-8,y:l.y-8,w:16,h:16}));
const input=JSON.stringify([labels,markers]);
const overlap=(a:MapBox,b:MapBox)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function safe(rows:ReturnType<typeof placeMassMapLabels>, box=bounds, marks=markers){
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 for(const r of rows){
  assert.ok(r.x>=box.x&&r.y>=box.y&&r.x+r.w<=box.x+box.w&&r.y+r.h<=box.y+box.h);
  assert.ok(measure(r.text)<=r.w-MASS_MAP_LABELS.inset*2+.001);
  assert.ok(!marks.some(m=>overlap(r,m)));
  assert.ok(!rows.some(other=>other!==r&&overlap(r,other)));
 }
}
const placed=placeMassMapLabels(labels,markers,bounds,measure);
assert.equal(placed.length,4);safe(placed);
assert.deepEqual(placeMassMapLabels([...labels].reverse(),markers,bounds,measure),placed);
assert.equal(JSON.stringify([labels,markers]),input);
console.log('PASS overlapping expedition/home anchors retain four readable labels without moving markers');

const crowded=Array.from({length:100},(_,i)=>({id:String(i).padStart(3,'0'),name:'Long discovered place '.repeat(8),x:320,y:190,priority:1}));
const dense=placeMassMapLabels(crowded,[],bounds,measure);safe(dense,bounds,[]);
assert.ok(dense.length>0&&dense.length<MASS_MAP_LABELS.maxLabels);
assert.ok(dense.every(r=>r.text.endsWith('…')));
assert.deepEqual(placeMassMapLabels(crowded,[],{x:0,y:0,w:5,h:5},measure),[]);
for(const [x,y] of [[6,28],[634,28],[6,394],[634,394]]){
 const corner=placeMassMapLabels([{id:'edge',name:'Edge place',x,y,priority:1}],[],bounds,measure);
 assert.equal(corner.length,1);safe(corner,bounds,[]);
}
const old=MASS_MAP_LABELS.enabled;MASS_MAP_LABELS.enabled=false;
assert.deepEqual(placeMassMapLabels(labels,markers,bounds,measure),[]);MASS_MAP_LABELS.enabled=old;
console.log('PASS bounded dense overflow, long names, all chart corners and explicit disablement');
