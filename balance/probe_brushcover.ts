import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {serializeSnapshot,applySnapshot} from '../src/net/snapshot';
import {senseReach} from '../src/engine/watch';
import type {World} from '../src/engine/world';
import type {Doodad} from '../src/engine/levelgen';
const restore=seedGlobalRandom(5531);
const terrain=(w:World)=>(w as unknown as {updateTerrainEffects(dt:number):void}).updateTerrainEffects(1/60);
try {
 for(const seamless of [false,true]) {
  const w=makeSimWorld('warrior',42);if(seamless)w.startWorldMass(42);
  const p=w.player, e=w.createMonster('zombie',1,'enemy');
  const at=seamless?{...p.pos}:{x:500,y:500};p.pos={...at};e.pos={x:at.x+100,y:at.y};e.skills=[];
  w.actors=[p,e];
  for(const kind of ['brush','reeds','berry_bush'] as const) {
   const d:Doodad={kind,pos:{...at},radius:55};w.doodads=[d];w.markDoodadsChanged();w.rebuildClientTerrain();
   p.pos={...at};p.updateTimers(2);const open=senseReach(200,p.sheet.get('detectability'),false,false,true,.3);
   terrain(w);assert.ok(p.statuses.some(s=>s.id==='concealed'));assert.equal(p.sheet.get('detectability'),.5);
   assert.ok(senseReach(200,p.sheet.get('detectability'),false,false,true,.3)<open,'native detection reach shrinks');
   const mirror=makeSimWorld('warrior',71);applySnapshot(mirror,serializeSnapshot(w,1));
   assert.equal(mirror.player.sheet.get('detectability'),p.sheet.get('detectability'),'network copy carries effect');
   e.pos={...at};terrain(w);assert.equal(e.sheet.get('detectability'),.5,'enemies receive the same cover');
   p.pos={x:at.x+90,y:at.y};
   for(let i=0;i<60;i++){p.updateTimers(1/60);terrain(w);}
   assert.equal(p.sheet.get('detectability'),1,'short native linger expires outside brush');
   p.pos={...at};d.felled={at:w.time,wake:w.time+100};w.markDoodadsChanged();terrain(w);
   assert.equal(p.sheet.get('detectability'),1,'felled brush grants no cover');
   delete d.felled;w.markDoodadsChanged();p.tier=1;terrain(w);assert.equal(p.sheet.get('detectability'),1,'cover stays on its own story');p.tier=0;
  }
 }
 console.log('PASS bushes, reeds and berry bushes hide both sides in classic/seamless, replicate the effect, and respect exit linger, felling and stories');
}finally{restore();}
