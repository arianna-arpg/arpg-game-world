import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {statusIcons,layoutStatusIcons,statusIconDetails,STATUS_ICON_VIEW} from '../src/render/vis/statusIcons';
import {serializeSnapshot,applySnapshot} from '../src/net/snapshot';
const restore=seedGlobalRandom(98172);
try {
 const w=makeSimWorld('warrior',98172),p=w.player;p.statuses=[];
 const icon=(id='poison')=>statusIcons(p.statuses,{}).find(i=>i.id===id)!;
 p.applyStatus('poison',2,2,'Adder');assert.equal(icon().remaining,12);assert.equal(icon().fraction,1);
 p.updateTimers(3);assert.equal(icon().fraction,.75);
 const before=JSON.stringify([p.statuses,p.sheet]);statusIcons(p.statuses,{poison:1});assert.equal(JSON.stringify([p.statuses,p.sheet]),before);
 // A shorter refreshed stack has a NEW full span, without changing dpsCurve.
 const total=p.statuses[0].total;p.applyStatus('poison',2,.5,'Adder');assert.equal(icon().remaining,3);assert.equal(icon().fraction,1);assert.equal(p.statuses[0].total,total);
 p.updateTimers(1.5);assert.equal(icon().fraction,.5);p.endStatus('poison');assert.equal(statusIcons(p.statuses,{}).length,0);
 p.applyStatus('burn',2,1,'Brand');p.updateTimers(1);const prior=icon('burn');
 p.applyStatus('burn',1,2,'Weak brand');assert.deepEqual(icon('burn'),prior,'weaker strongest-wins burn cannot reset the indicator');
 p.applyStatus('burn',3,2,'Strong brand');assert.equal(icon('burn').fraction,1);p.updateTimers(4);assert.equal(icon('burn').fraction,.5);
 p.statuses=[];p.applyStatus('poison',2,1,'Fuse',{rupture:5});p.updateTimers(2);const fuse=icon();
 p.applyStatus('poison',2,2,'Fuse',{rupture:3});assert.equal(icon().fraction,fuse.fraction);assert.equal(icon().remaining,fuse.remaining);
 p.updateTimers(5);assert.equal(statusIcons(p.statuses,{}).length,0);
 console.log('PASS native decay, shorter refresh, rejected/stronger burn, fixed fuse, expiry, cleanse and read-only clock derivation');
 p.statuses=[];p.applyStatus('chill',0,1,'Ice');p.applyStatus('poison',3,1,'Adder');p.updateTimers(1);
 assert.ok(statusIconDetails(icon('chill')).some(s=>/reduced/.test(s)));assert.ok(statusIconDetails(icon()).includes('Damage over time'));
 const order=statusIcons(p.statuses,{}).map(r=>r.id);assert.deepEqual(statusIcons(p.statuses,{poison:1}).map(r=>r.id),order);
 const client=makeSimWorld('warrior',98173),snapshot=serializeSnapshot(w,1);applySnapshot(client,snapshot);
 assert.deepEqual(statusIcons(client.player.statuses,{}),statusIcons(p.statuses,{}));
 for(const a of snapshot.actors)for(const s of a.st??[])delete s.statusDuration;
 applySnapshot(client,snapshot);assert.ok(statusIcons(client.player.statuses,{}).every(s=>s.fraction===undefined&&s.remaining!==undefined));
 for(const a of snapshot.actors)for(const s of a.st??[])delete s.rem;
 applySnapshot(client,snapshot);assert.ok(statusIcons(client.player.statuses,{}).every(s=>s.fraction===undefined&&s.remaining===undefined));
 assert.deepEqual(statusIcons(p.statuses,{},true),[]);
 console.log('PASS accurate co-op spans, legacy unknown clocks, inactive clearing and meaningful definition-derived hover details');
 const rows=statusIcons(p.statuses,{});for(const width of [400,600,1280])for(const side of ['solo','left','right']){
  const left=side==='right'?width/2:0,right=side==='left'?width/2:width;
  const rects=layoutStatusIcons([...rows,...rows,...rows,...rows],{x:left+60,y:280,radius:46},left,right);
  for(const r of rects){assert.ok(r.x>=left&&r.x+r.w<=right&&r.y>0&&r.y+r.h<=234);assert.equal(r.w,STATUS_ICON_VIEW.size);}
 }
 console.log('PASS compact Life-adjacent bounds across narrow and couch viewports');
}finally{restore();}
