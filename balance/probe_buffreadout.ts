import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SHRINES } from '../src/data/shrines';
import { buffReadoutLines } from '../src/render/vis/buffReadout';
import { mod } from '../src/engine/stats';
const restore=seedGlobalRandom(80042);
try {
  const w=makeSimWorld('warrior',80042),p=w.player;
  for(const def of SHRINES){
    w.shrines=[{pos:{...p.pos},def,used:false}];
    (w as unknown as {updateShrines():void}).updateShrines();
    const buff=p.buffs.get('shrine_'+def.id)!;assert.ok(buff);
    assert.equal(buff.def.label,def.name);
    const before=JSON.stringify(buff),lines=buffReadoutLines(buff.def.id,buff);
    assert.equal(lines[0],def.name+' · '+def.duration+'s');assert.equal(lines.length,2+def.mods.length);
    assert.equal(JSON.stringify(buff),before);
    if(def.id==='barrage')assert.deepEqual(lines.slice(2),['+1 Additional Projectiles','25% increased Projectile Speed']);
    if(def.id==='stoneskin')assert.deepEqual(lines.slice(2),['+70 Armor','20% less Damage Taken']);
    p.updateTimers(2.25);assert.match(buffReadoutLines(buff.def.id,buff)[0],new RegExp(Math.ceil(def.duration-2.25)+'s$'));
    p.updateTimers(def.duration);assert.equal(p.buffs.has(buff.def.id),false);
  }
  console.log('PASS native touch names all five blessings, live payload quantities, exact clocks, read-only description and actual expiry');
  p.addBuff({type:'buff',id:'scoped_test',duration:10,maxStacks:3,stackTimers:'independent',
    mods:[mod('damage','increased',.2,['spell'],'moving')]});
  p.updateTimers(2);p.addBuff(p.buffs.get('scoped_test')!.def);
  const lines=buffReadoutLines('scoped_test',p.buffs.get('scoped_test')!);
  assert.equal(lines[0],'scoped test ×2 · 10s');assert.equal(lines[1],'Modifiers per stack');
  assert.match(lines[2],/20% increased Damage with spell skills/);assert.match(lines[2],/moving/i);
  console.log('PASS generic stack count, actual independent clock, per-stack units and modifier scope retain their native meaning');
} finally {restore();}
