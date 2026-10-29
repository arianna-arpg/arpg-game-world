import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
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
  assert.ok(fills.some(f => f.ink === inst.def.color && f.h === 5 && Math.abs(f.w-44*fraction)<1e-7), mode+' native clock');
  if (['perfect','timed','overcharge'].includes(mode)) {
    assert.ok(fills.some(f => f.w === 2 && f.h === 9 && f.ink === '#ffffff'), 'marker');
    assert.ok(fills.some(f => Math.abs(f.w-12.32)<1e-7 && f.h === 5), 'gold window');
  }
  assert.equal(JSON.stringify(p.casting), state, 'painting is read-only');
}
p.casting = cs; assert.equal(JSON.stringify(cs), before);
console.log('PASS every native cast mode retains its clock and both timing decorations without mutation');

const enemy = w.createMonster('zombie',1,'enemy'), ally = w.createMonster('zombie',1,'player');
const guest = w.addSeat('bar-guest',w.localSeat.meta.classDef,w.localSeat.input); guest.couch = { pad: 1, side: 'right' };
for (const a of [p,guest.actor,enemy,ally]) { a.pos = {x:200,y:200}; a.casting = { ...cs }; }
assert.ok(castBarPriority(w,p)>castBarPriority(w,guest.actor));
assert.ok(castBarPriority(w,guest.actor)>castBarPriority(w,enemy));
assert.ok(castBarPriority(w,enemy)>castBarPriority(w,ally));
const overlay = new CastBarOverlay(), viewport = { x:0,y:0,w:600,h:400 };
let painted: { actor: Actor; rect: CombatRect }[] = [];
const bar = (actor: Actor, rect = { x:175,y:140,w:50,h:18 }): CastBar => ({ actor, key:actor.casting!, rect, meter: rect, color: '#43d9f1',
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
// A tiny real sampling fixture tests compositing, throttle and normalized projection.
let reads=0,draws=0;const rgba=new Uint8ClampedArray(192*128*4).fill(102);
const sampleCtx={fillRect(){},drawImage(){draws++;},getImageData(){reads++;return {data:rgba};}};
const oldDocument=globalThis.document;
Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>sampleCtx})}});
try {
  const field=new CastBarContrast(),world={width:1500,height:1000} as HTMLCanvasElement;
  field.capture(world,world,0);field.capture(world,world,1);assert.equal(reads,1);assert.equal(draws,2);
  assert.ok(field.outline({x:.4,y:.4,w:.05,h:.01},'#666666'));
  field.capture(world,undefined,100);assert.equal(reads,2);assert.equal(draws,3);
} finally { Object.defineProperty(globalThis,'document',{configurable:true,value:oldDocument}); }
console.log('PASS adaptive contrast, composite sampling and bounded readback cadence');
