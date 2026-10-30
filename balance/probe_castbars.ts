import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { DAMAGE_TYPES } from '../src/engine/stats';
import { castingDamageTags } from '../src/engine/castingCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance } from '../src/engine/skills';
import { CastBarOverlay, castBarPriority, prepareCastBar, type CastBar } from '../src/render/vis/castBars';
import { castBarOutline, CastBarContrast } from '../src/render/vis/castBarContrast';
import { type CombatRect } from '../src/render/vis/combatFocus';
import { VIS_CFG } from '../src/render/vis/visConfig';
import type { Actor, CastingState } from '../src/engine/actor';

seedGlobalRandom(0xca57);
const w = makeSimWorld('warrior', 0xca57), p = w.player;
const inst = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0, useTime: 1 }, 1, 3);
inst.sockets = ['perfect_draw', 'wandering_mark', 'overcharge'].map(id => ({ def: SUPPORTS[id], level: 1 }));
assert.ok(w.useSkill(p, inst, { x: p.pos.x+100, y: p.pos.y }, true));
const cs = p.casting!; cs.elapsed = cs.total*.4; cs.indicatorAt = .8; cs.stage = 2;
const fills: { x: number; y: number; w: number; h: number; ink: unknown }[] = [];
let at = { x: 0, y: 0 }, stack: typeof at[] = [];
let leaders = 0, outlines = 0;
const ctx = new Proxy({
  save: () => stack.push({ ...at }), restore: () => { at = stack.pop()!; },
  translate: (x: number, y: number) => { at.x += x; at.y += y; },
  fillRect(x: number, y: number, width: number, height: number) { fills.push({x:x+at.x,y:y+at.y,w:width,h:height,ink:this.fillStyle}); },
  lineTo: () => { leaders++; }, strokeRect: () => { outlines++; },
  fillStyle: '', measureText: (text: string) => ({ width: text.length*6 }),
}, { get: (target, key) => key in target ? Reflect.get(target,key) : () => {} }) as unknown as CanvasRenderingContext2D;
const before = JSON.stringify(cs);
for (const mode of ['cast', 'perfect', 'timed', 'channel', 'guard', 'charge', 'concentration', 'multitude', 'overcharge'] as CastingState['mode'][]) {
  p.casting = { ...cs, mode, shield: 25, maxShield: 100, pulseTimer: cs.total*.25 };
  fills.length = 0; const state = JSON.stringify(p.casting);
  prepareCastBar(p,w)!.paint(ctx);
  const fraction = mode === 'channel' ? .75 : mode === 'guard' ? .25 : .4;
  assert.ok(fills.some(f => f.ink === VIS_CFG.castReadout.tagColors.palette.fire && f.h === 5 && Math.abs(f.w-44*fraction)<1e-7), mode+' native clock');
  if (['perfect','timed','overcharge'].includes(mode)) {
    assert.ok(fills.some(f => f.w === 2 && f.h === 9 && f.ink === '#ffffff'), 'marker');
    assert.ok(fills.some(f => Math.abs(f.w-12.32)<1e-7 && f.h === 5), 'gold window');
  }
  assert.equal(JSON.stringify(p.casting), state, 'painting is read-only');
}
p.casting = cs; assert.equal(JSON.stringify(cs), before);
console.log('PASS every native cast mode retains its clock and both timing decorations without mutation');

const palette = VIS_CFG.castReadout.tagColors;
for (const type of DAMAGE_TYPES) {
  p.casting = { ...cs, inst: { ...inst, def: { ...inst.def, tags: ['spell',type], color: '#123456' } } };
  assert.deepEqual(prepareCastBar(p,w)!.colors,[palette.palette[type]],'damage tags override decorative artwork');
}
const lich=makeSkillInstance(SKILLS.summon_skeleton_mage,1,0);
lich.treeNodes=['lich_ascendant'];
assert.ok(castingDamageTags({...cs,inst:lich}).includes('fire'),'invested tree tags reach the cast bar');
p.casting = { ...cs, mode: 'cast', inst: { ...inst, def: { ...inst.def, tags: ['cold','spell','fire','cold'] },
  sockets: [{ def: { ...SUPPORTS.perfect_draw, grantsTags: ['lightning'] }, level: 1 }] } };
assert.deepEqual(castingDamageTags(p.casting),['fire','cold','lightning'],'canonical tag order and real support grants');
fills.length=0;prepareCastBar(p,w)!.paint(ctx);
for (const type of ['fire','cold','lightning'] as const) {
  assert.ok(fills.some(f=>f.ink===palette.palette[type]&&f.h>0&&Math.abs(f.w-44*.4)<1e-7),'every band carries the same clock');
  assert.ok(fills.some(f=>f.ink===palette.palette[type]&&f.w===44),'dim base shows all tags before progress');
}
const snap=serializeSnapshot(w,1), remote=makeSimWorld('warrior',0xca58);
const wire=snap.actors.find(a=>a.id===p.id)!;
assert.deepEqual(wire.cast!.damageTags,['fire','cold','lightning']);
applySnapshot(remote,JSON.parse(JSON.stringify(snap)));
const mirror=remote.actors[snap.actors.findIndex(a=>a.id===p.id)];
assert.deepEqual(prepareCastBar(mirror,remote)!.colors,prepareCastBar(p,w)!.colors,'host and render shell share resolved tag bands');
mirror.casting!.damageTags!.pop();
assert.deepEqual(wire.cast!.damageTags,['fire','cold','lightning'],'wire and client own their arrays');
assert.deepEqual(castingDamageTags(p.casting),['fire','cold','lightning'],'render shell cannot mutate host tags');
delete wire.cast!.damageTags;applySnapshot(remote,snap);
assert.deepEqual(prepareCastBar(remote.actors[snap.actors.findIndex(a=>a.id===p.id)],remote)!.colors,[palette.neutral],'old hosts have a safe untyped bar');
p.casting = { ...cs, inst: { ...inst, sockets: [], def: { ...inst.def, tags: ['spell'] } } };
assert.deepEqual(prepareCastBar(p,w)!.colors,[palette.neutral],'untagged skills do not masquerade as physical');
(palette as {enabled:boolean}).enabled=false;assert.equal(prepareCastBar(p,w)!.color,inst.def.color);(palette as {enabled:boolean}).enabled=true;
p.casting=cs;
console.log('PASS tag palette, mixed bands, support grants, neutral/legacy fallback and co-op ownership');

const enemy = w.createMonster('zombie',1,'enemy'), ally = w.createMonster('zombie',1,'player');
const guest = w.addSeat('bar-guest',w.localSeat.meta.classDef,w.localSeat.input); guest.couch = { pad: 1, side: 'right' };
for (const a of [p,guest.actor,enemy,ally]) { a.pos = {x:200,y:200}; a.casting = { ...cs }; }
assert.ok(castBarPriority(w,p)>castBarPriority(w,guest.actor));
assert.ok(castBarPriority(w,guest.actor)>castBarPriority(w,enemy));
assert.ok(castBarPriority(w,enemy)>castBarPriority(w,ally));
const overlay = new CastBarOverlay(), viewport = { x:0,y:0,w:600,h:400 };
let painted: { actor: Actor; rect: CombatRect }[] = [];
const bar = (actor: Actor, rect = { x:175,y:140,w:50,h:18 }): CastBar => ({ actor, key:actor.casting!, rect, meter: rect, color: '#43d9f1', colors: ['#43d9f1'],
  paint: () => painted.push({actor,rect:{...rect,x:rect.x+at.x,y:rect.y+at.y}}) });
const add = (actors: Actor[]) => { overlay.begin(); painted=[]; for (const a of actors) overlay.add(bar(a)); };
leaders=0;outlines=0;
add([p,enemy,guest.actor,ally]); overlay.paint(ctx,w,viewport,()=>true);
assert.equal(leaders,0,'no ownership connector lines');assert.equal(outlines,0,'no new panel border when contrast is sufficient');
const first = painted.map(row => ({id:row.actor.id,rect:row.rect}));
assert.equal(painted.at(-1)!.actor,p);
assert.deepEqual(painted.at(-1)!.rect,bar(p).rect);
for (let i=0;i<painted.length;i++) for (let j=i+1;j<painted.length;j++) assert.deepEqual(painted[i].rect,painted[j].rect,'overlapping bars never relocate');
add([ally,guest.actor,enemy,p]); overlay.paint(ctx,w,viewport,()=>true);
assert.deepEqual(painted.map(row=>({id:row.actor.id,rect:row.rect})),first,'stable across actor-array order');
console.log('PASS native anchors never move; player paint priority is independent of actor order');

add([p,guest.actor,enemy]); overlay.paint(ctx,w,viewport,()=>false);
assert.deepEqual(painted.map(row=>row.actor),[guest.actor,p],'local mechanics survive cover; hidden enemies do not leak');
overlay.begin(); painted=[]; overlay.add(bar(p,{x:-30,y:-10,w:50,h:18}));overlay.paint(ctx,w,viewport,()=>true);
assert.deepEqual(painted[0].rect,{x:-30,y:-10,w:50,h:18},'viewport edges never re-seat the bar');
add([enemy]); enemy.casting=null;overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);
add([p]);p.dead=true;overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);p.dead=false;
overlay.begin();overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);
console.log('PASS concealment, original edge clipping and stale/dead cast retirement');

assert.equal(castBarOutline('#ffffff',[.01,.02,.03]),null,'clear ink needs no outline');
assert.ok(castBarOutline('#666666',[.39,.4,.41])!.alpha>.7,'matching terrain enables contrast');
assert.equal(castBarOutline('#eeeeee',[.92,.94,.95])!.color,VIS_CFG.castReadout.contrast.dark);
assert.equal(castBarOutline('#222222',[.12,.13,.14])!.color,VIS_CFG.castReadout.contrast.light);
assert.ok(castBarOutline('#777777',[0,.25,.5,.75,1]),'busy scene enables outline');
assert.ok(castBarOutline('#777777',[]),'unavailable readback has a safe fallback');
assert.ok(castBarOutline(['#ffffff','#111111'],[.06])!.alpha>.7,'each tag band participates in contrast');
// Exercise asynchronous lifecycle with controllable worker/bitmap completion.
const globals = ['Worker','createImageBitmap'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
const workers: MockWorker[] = [], bitmaps: { closed: number; close(): void }[] = [];
let rejectBitmap = false, rejectPost = false, rejectWorker = false, deferBitmap = false;
const releases: (() => void)[] = [];
class MockWorker {
  onmessage?: (event: { data: unknown }) => void; onerror?: () => void; onmessageerror?: () => void;
  sent: { id: number; width: number; height: number }[] = []; terminated = false;
  constructor() { if (rejectWorker) throw Error('Worker unavailable'); workers.push(this); }
  terminate() { this.terminated = true; }
  postMessage(value: { id: number; width: number; height: number }) { if (rejectPost) throw Error('Transfer refused'); this.sent.push(value); }
  reply(index = this.sent.length-1) {
    const row=this.sent[index];this.onmessage?.({data:{...row,pixels:new Uint8ClampedArray(row.width*row.height*4).fill(102)}});
  }
}
Object.defineProperty(globalThis,'Worker',{configurable:true,value:MockWorker});
Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:() => {
  if (rejectBitmap) { rejectBitmap=false;return Promise.reject(Error('Snapshot refused')); }
  const bitmap={closed:0,close(){this.closed++;}};bitmaps.push(bitmap);
  return deferBitmap ? new Promise(resolve=>releases.push(()=>resolve(bitmap))) : Promise.resolve(bitmap);
}});
const flush = async () => { for(let i=0;i<5;i++) await Promise.resolve(); };
const rect={x:.4,y:.4,w:.05,h:.01},world={width:1500,height:1000} as HTMLCanvasElement;
try {
  const field=new CastBarContrast();let now=performance.now();
  field.capture(world,world,now);field.capture(world,world,now+100);await flush();
  const first=workers.at(-1)!;assert.equal(first.sent.length,1);assert.equal(bitmaps.length,2,'one bitmap pair; no refresh queue');
  assert.deepEqual(field.outline(rect,'#666666'),castBarOutline('#666666',[]),'quiet initial fallback');
  first.reply();assert.ok(field.outline(rect,'#666666')!.alpha>.7);
  field.capture(world,world,now+1);await flush();assert.equal(first.sent.length,1,'normal interval');
  field.capture(world,undefined,now+2);await flush();assert.equal(first.sent.length,2,'crest change invalidates immediately');first.reply();

  now+=200;field.capture(world,undefined,now);await flush();const oldIndex=first.sent.length-1;
  world.width=1200;field.capture(world,undefined,now+1);first.reply(oldIndex);
  assert.deepEqual(field.outline(rect,'#666666'),castBarOutline('#666666',[]),'resized old result refused');
  field.capture(world,undefined,now+2);await flush();first.reply();assert.ok(field.outline(rect,'#666666')!.alpha>.7);
  console.log('PASS bounded bitmap pair, native contrast, cadence and resize/crest stale-result rejection');

  field.reset();assert.ok(first.terminated);deferBitmap=true;const before=bitmaps.length;
  field.capture(world,world,now+3);field.invalidate();releases.splice(0).forEach(f=>f());await flush();
  assert.ok(bitmaps.slice(before).every(b=>b.closed===1),'invalidated snapshots closed before transfer');
  deferBitmap=false;field.capture(world,undefined,now+4);await flush();const second=workers.at(-1)!;
  field.reset();field.capture(world,undefined,now+5);await flush();const third=workers.at(-1)!;
  second.reply();assert.equal(field.count(),1,'late prior-worker reply cannot complete the new request');third.reply();
  assert.ok(field.outline(rect,'#666666')!.alpha>.7);
  console.log('PASS invalidation closes private bitmaps; reset terminates workers and rejects late replies');
  field.reset();deferBitmap=true;const splitStart=bitmaps.length;field.capture(world,world,now+6);
  const split=releases.splice(0);split[0]();await flush();assert.equal(bitmaps[splitStart].closed,0);
  field.reset();assert.equal(bitmaps[splitStart].closed,1,'reset immediately releases fulfilled snapshot while sibling is unresolved');
  split[1]();await flush();assert.equal(bitmaps[splitStart+1].closed,1,'late sibling closes independently');deferBitmap=false;
  console.log('PASS partial snapshot completion cannot retain a bitmap across reset');

  field.reset();rejectBitmap=true;let mark=bitmaps.length;field.capture(world,world,now+6);await flush();
  assert.ok(bitmaps.slice(mark).every(b=>b.closed===1),'partial rejection closes fulfilled sibling');assert.equal(field.count(),0);
  let count=workers.length;field.capture(world,world,now+500);await flush();assert.equal(workers.length,count,'failed worker is not retried every frame');
  field.reset();rejectPost=true;mark=bitmaps.length;field.capture(world,world,now+7);await flush();rejectPost=false;
  assert.ok(bitmaps.slice(mark).every(b=>b.closed===1),'failed transfer closes both snapshots');
  field.reset();rejectWorker=true;field.capture(world,undefined,now+8);await flush();rejectWorker=false;assert.equal(field.count(),0);
  field.reset();field.capture(world,undefined,now+9);await flush();const hung=workers.at(-1)!;
  field.capture(world,undefined,now+2010);assert.ok(hung.terminated);assert.equal(field.count(),0);
  field.reset();field.capture(world,undefined,now+2011);await flush();workers.at(-1)!.reply();
  assert.ok(field.outline(rect,'#666666')!.alpha>.7,'new run can retry after failure');field.reset();
  console.log('PASS snapshot/transfer/worker failure, bounded timeout, quiet fallback and run recovery');
} finally {
  for(const [key,descriptor] of globals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
}
