import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { makeSkillInstance } from '../src/engine/skills';
import { CastBarOverlay, castBarPriority, prepareCastBar, type CastBar } from '../src/render/vis/castBars';
import { CombatMeterLayout } from '../src/render/vis/combatMeters';
import { combatRectsOverlap, type CombatRect } from '../src/render/vis/combatFocus';
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
const ctx = new Proxy({
  save: () => stack.push({ ...at }), restore: () => { at = stack.pop()!; },
  translate: (x: number, y: number) => { at.x += x; at.y += y; },
  fillRect(x: number, y: number, width: number, height: number) { fills.push({x:x+at.x,y:y+at.y,w:width,h:height,ink:this.fillStyle}); },
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
const bar = (actor: Actor, rect = { x:175,y:140,w:50,h:18 }): CastBar => ({ actor, key:actor.casting!, rect,
  paint: () => painted.push({actor,rect:{...rect,x:rect.x+at.x,y:rect.y+at.y}}) });
const add = (actors: Actor[]) => { overlay.begin(); painted=[]; for (const a of actors) overlay.add(bar(a),{x:0,y:0}); };
add([p,enemy,guest.actor,ally]); overlay.paint(ctx,w,viewport,()=>true);
const first = painted.map(row => ({id:row.actor.id,rect:row.rect}));
assert.equal(painted.at(-1)!.actor,p);
assert.deepEqual(painted.at(-1)!.rect,bar(p).rect);
for (let i=0;i<painted.length;i++) for (let j=i+1;j<painted.length;j++) assert.ok(!combatRectsOverlap(painted[i].rect,painted[j].rect));
add([ally,guest.actor,enemy,p]); overlay.paint(ctx,w,viewport,()=>true);
assert.deepEqual(painted.map(row=>({id:row.actor.id,rect:row.rect})),first,'stable across actor-array order');
console.log('PASS competing bars separate with stable ownership, player priority and actor-order independence');

add([p,guest.actor,enemy]); overlay.paint(ctx,w,viewport,()=>false);
assert.deepEqual(painted.map(row=>row.actor),[guest.actor,p],'local mechanics survive cover; hidden enemies do not leak');
const tuning = VIS_CFG.castReadout.overlay as { avoidOverlap: boolean };
tuning.avoidOverlap = false;
add([p,enemy]); overlay.paint(ctx,w,viewport,()=>true);
assert.ok(combatRectsOverlap(painted[0].rect,painted[1].rect)); assert.equal(painted.at(-1)!.actor,p);
tuning.avoidOverlap = true;
overlay.begin(); painted=[]; overlay.add(bar(p,{x:-30,y:-20,w:50,h:18}),{x:0,y:0});overlay.paint(ctx,w,viewport,()=>true);
assert.ok(painted[0].rect.x>=0&&painted[0].rect.y>=0);
add([enemy]); enemy.casting=null;overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);
add([p]);p.dead=true;overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);p.dead=false;
overlay.begin();overlay.paint(ctx,w,viewport,()=>true);assert.equal(painted.length,0);
console.log('PASS cover admission, configurable crowded fallback, screen-edge clamping and stale/dead cast retirement');

const meters = new CombatMeterLayout(); let offset: {x:number;y:number}|undefined;
meters.begin(1,true);meters.body(p,p.pos,p.radius);
meters.add(p,{x:190,y:190,w:30,h:20},o=>{offset=o;});
assert.equal(offset,undefined,'grouped callback waits for layout');meters.paint(ctx);assert.ok(offset);
assert.notDeepEqual(offset,{x:0,y:0},'deferred overlay receives the actual relocation');
meters.begin(2,false);offset=undefined;meters.add(p,bar(p).rect,o=>{offset=o;});assert.deepEqual(offset,{x:0,y:0});
meters.begin(3,false);meters.conceal(enemy);offset=undefined;meters.add(enemy,bar(p).rect,o=>{offset=o;});assert.equal(offset,undefined);
console.log('PASS grouped-meter offsets and concealment survive deferred painting');
