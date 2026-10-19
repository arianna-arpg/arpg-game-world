import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKILL_MOVEMENTS, MOVEMENT_VISUAL_STYLE as C, skillMovementVoice, type MovementProfile } from '../src/data/skillMovementVisuals';
import { drawMovementMoment, drawMovementTrail } from '../src/render/vis/skillMovementVoice';
import { extendMovementTrail, type MovementTrail } from '../src/engine/skillMovementVisual';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { equipCosmetic } from '../src/meta/cosmetics';

let checks = 0;
const check = (label: string, value: unknown) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
const census = Object.values(SKILLS).filter(s => ['dash', 'leap', 'blink', 'carom'].includes(s.delivery.type));
assert.deepEqual(Object.keys(SKILL_MOVEMENTS).sort(), census.map(s => s.id).sort());
check('45 movement skills have authored identities', census.length === 45);
check('all movement compositions differ; unknown keys retain fallback', new Set(Object.values(SKILL_MOVEMENTS).map(p => JSON.stringify(p))).size === 45 && !skillMovementVoice('constructor', 'arrive'));
function trace(draw: (ctx: CanvasRenderingContext2D) => void) {
  let depth = 0; const calls: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1, lineWidth: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), String(k));
      if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  draw(ctx); assert.equal(depth, 0); assert(calls.length < 4500, 'bounded canvas work'); return JSON.stringify(calls);
}
for (const [id, profile] of Object.entries(SKILL_MOVEMENTS)) {
  for (const phase of ['depart', 'arrive', 'impact', 'wait', 'bank'] as const) {
    assert(effectVoiceOf(skillMovementVoice(id, phase)!));
    for (const radius of [1, 40, 4000]) for (const life of [.95, .5, .05]) {
      const draw = (color: string) => trace(ctx => drawMovementMoment(ctx,
        { pos: { x: 20, y: 30 }, radius, color, life, maxLife: 1, facing: .7, shape: 2 }, life, profile, phase));
      assert.equal(draw('#abcdef'), draw('#887766'));
    }
  }
}
check('all phases remain finite, bounded and color independent', true);
function rig() {
  const w = makeSimWorld('warrior', 43781), p = w.player;
  w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.actors = [p]; w.flashes = []; w.zones = []; w.projectiles = [];
  p.pos = { x: 500, y: 600 }; p.facing = 0; p.skills = []; p.buffs.clear(); p.statuses = []; p.casting = null; p.useLock = 0;
  p.sheet.setSource('qa', [mod('life', 'override', 10000), mod('mana', 'override', 10000), mod('critChance', 'override', 0)]); p.fillResources();
  const targets = [720, 790, 870].map(x => {
    const a = w.createMonster('zombie', 1, 'enemy'); a.pos = { x, y: 610 }; a.brain = undefined; a.anchored = true; a.spawnedAt = -1;
    a.sheet.setSource('qa', [mod('life', 'override', 100000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  });
  w.corpses = [{ pos: { x: 750, y: 600 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
  return { w, p, targets };
}
type Frame = { pos: { x: number; y: number }; leap: number | null; flashes: ReturnType<typeof serializeSnapshot>['flashes'] };
const recordings: { id: string; name: string; family: string; color: string; duration: number; frames: Frame[] }[] = [];
function run(id: string, control = false, shape = 0) {
  const { w, p, targets } = rig(), def = SKILLS[id];
  p.sheet.setSource('shape', [mod('aoeShape', 'override', shape)]);
  // Preserve source IDs: Decoy's existing collision/costume laws resolve them.
  // Remove only its paint profile for the comparison, restoring it afterwards.
  const profiles = SKILL_MOVEMENTS as Record<string, MovementProfile>, profile = profiles[id];
  if (control) delete profiles[id];
  const inst = makeSkillInstance(def), d = def.delivery;
  const seconds = (d.type === 'dash' ? d.distance / d.speed : d.type === 'leap' ? d.airTime : d.type === 'blink' ? d.delay ?? 0 : d.type === 'carom' ? d.duration : 0) + .55;
  const restore = seedGlobalRandom(913);
  assert(w.executeSkill(p, inst, { x: 750, y: 600 }), id);
  const frames: Frame[] = [], path: number[][] = []; const phases = new Set<string>();
  let travelled = false;
  const record = () => {
    const flashes = serializeSnapshot(w, 1).flashes.filter(f => (f.movement || f.fx?.startsWith('skillMove:')) && f.life > 0);
    for (const f of flashes) if (f.fx) phases.add(f.fx.split(':')[1]);
    if (flashes.some(f => f.movement)) travelled = true;
    frames.push({ pos: { ...p.pos }, leap: p.leap ? 1 - p.leap.timer / p.leap.total : null, flashes });
  };
  record();
  for (let i = 0; i < Math.ceil(seconds * 60); i++) {
    w.update(1 / 60); path.push([p.pos.x, p.pos.y, p.untargetable ? 1 : 0]);
    if (i % 2 === 0) record();
  }
  const nextRandom = Math.random(); restore();
  if (control) profiles[id] = profile;
  const facts = { path, victims: targets.map(a => [a.life, a.statuses.map(s => [s.id, s.stacks, s.dps, s.remaining])]), mana: p.mana, nextRandom };
  return { w, p, frames, facts, seconds, phases, travelled };
}
for (const def of census) {
  const actual = run(def.id), control = run(def.id, true);
  assert.deepEqual(actual.facts, control.facts, def.id + ': behavior changed');
  check(def.id + ': real relocation, damage, invulnerability and RNG match unpainted control', true);
  check(def.id + ': actual departure and arrival/impact keep source identity', actual.phases.has('depart') && actual.phases.has(def.delivery.type === 'leap' ? 'impact' : 'arrive'));
  check(def.id + ': travel follows its movement family', actual.travelled === (def.delivery.type !== 'blink'));
  if (def.delivery.type === 'carom') check('Caged Comet records real bank moments', actual.phases.has('bank'));
  recordings.push({ id: def.id, name: def.name, family: def.delivery.type, color: def.color, duration: actual.seconds, frames: actual.frames });
}
for (const shape of [1, 2]) assert.deepEqual(run('crushing_leap', false, shape).facts, run('crushing_leap', true, shape).facts);
check('modified leap landing shapes preserve actual hits', true);
for (const id of ['dash', 'crushing_leap', 'teleport', 'warp']) {
  const { w, p } = rig(); w.actors = [p];
  w.doodads.push({ pos: { x: 610, y: 600 }, radius: 42, kind: 'rock' } as typeof w.doodads[number]); w.markDoodadsChanged();
  w.executeSkill(p, makeSkillInstance(SKILLS[id]), { x: 800, y: 600 }); let max = p.pos.x;
  for (let i = 0; i < 110; i++) {
    w.update(1 / 60); max = Math.max(max, p.pos.x);
    for (const f of w.flashes) if (f.movement) assert(f.movement.points.every(v => v.x <= 570));
  }
  check(id + ': blocked travel never paints through the wall', max < 570);
}
{
  const { w, p } = rig(), inst = makeSkillInstance(SKILLS.warp);
  w.executeSkill(p, inst, { x: 750, y: 600 });
  check('Warp waits at the real destination without early departure', w.flashes.some(f => f.fx === skillMovementVoice('warp', 'wait')) && !w.flashes.some(f => f.fx === skillMovementVoice('warp', 'depart')));
  p.dead = true; w.update(.02);
  check('death cancels Warp warning without a false arrival', !w.flashes.some(f => f.life > 0 && f.fx?.startsWith('skillMove:')));
}
{
  const { w, p } = rig(), inst = makeSkillInstance(SKILLS.warp);
  w.executeSkill(p, inst, { x: 750, y: 600 });
  (w as unknown as { clearTreeFields(a: typeof p, s: typeof inst): void }).clearTreeFields(p, inst);
  check('respec retires the delayed marker with its movement', !w.pendingBlinks.length && !w.flashes.some(f => f.life > 0 && f.fx === skillMovementVoice('warp', 'wait')));
}
for (const id of ['surge', 'crushing_leap', 'teleport', 'warp']) {
  const { w, p } = rig(); equipCosmetic(w.account, 'skillRecolor', 'moon_tint');
  w.executeSkill(p, makeSkillInstance(SKILLS[id]), { x: 750, y: 600 }); let seen = 0;
  for (let i = 0; i < 65; i++) {
    for (const f of w.flashes) if (f.movement || f.fx?.startsWith('skillMove:')) { assert.equal(f.color, '#91d6ef'); seen++; }
    w.update(1 / 60);
  }
  check(id + ': departure, travel and arrival obey wardrobe color', seen > 0);
}
{
  const { w, p } = rig(); w.executeSkill(p, makeSkillInstance(SKILLS.dash), { x: 750, y: 600 }); w.update(.05);
  const f = w.flashes.find(f => f.movement)!; assert(f);
  const snap = serializeSnapshot(w, 1), peer = rig().w; applySnapshot(peer, snap);
  assert.deepEqual(peer.flashes.find(f => f.movement)?.movement, f.movement);
  snap.flashes.find(f => f.movement)!.movement!.points[0].x = -100;
  check('co-op copies travel independently of both host and packet', f.movement!.points[0].x !== -100 && peer.flashes.find(f => f.movement)!.movement!.points[0].x !== -100);
  for (const f of snap.flashes) delete f.movement; applySnapshot(peer, snap);
  check('older host packets clear motion history', !peer.flashes.some(f => f.movement));
  p.dash = null; w.update(.4); check('interruption fades the trail', !w.flashes.some(f => f.movement));
  w.loadZone(w.zone.id); check('zone transition retires all movement cues', !w.flashes.some(f => f.movement || f.fx?.startsWith('skillMove:')));
}
{
  const { w, p } = rig(), inst = makeSkillInstance(SKILLS.crushing_leap);
  inst.sockets[0] = { def: SUPPORTS.buried_charge, level: 1 };
  w.executeSkill(p, inst, { x: 750, y: 600 });
  for (let i = 0; i < 35; i++) w.update(.02);
  check('leap aftermath inherits its impact identity', w.zones.some(z => z.fx === skillMovementVoice('crushing_leap', 'impact')));
}
{
  const t: MovementTrail = { skillId: 'dash', clock: 0, progress: .5, points: [] };
  for (let i = 0; i < 1000; i++) extendMovementTrail(t, { x: i, y: 0 }, { x: i + 1, y: 0 }, i / 1000, .5);
  assert(t.points.length <= C.maxPoints);
  const draw = (color: string) => trace(ctx => drawMovementTrail(ctx, { radius: 15, color, movement: t }, .7));
  assert.equal(draw('#abc'), draw('#543')); check('high-rate histories stay bounded and palette independent', true);
}
{
  const charge = run('charge'), leap = run('crushing_leap');
  check('Charge stays grounded through its measured journey', charge.frames.every(f => f.leap === null));
  check('leaps retain their airborne body arc', leap.frames.some(f => f.leap !== null));
  const trail: MovementTrail = { skillId: 'charge', clock: .1, progress: .2,
    points: [{ x: 0, y: 0, at: .08 }, { x: 7, y: 0, at: .1 }] };
  const draw = (skillId: string) => trace(ctx => drawMovementTrail(ctx, { radius: 16, color: '#d89858', movement: { ...trail, skillId } }, 1));
  check('Charge has a distinct low wake even on a seven-pixel travel beat', draw('charge') !== draw('crushing_leap') && draw('charge') !== draw('dash'));
}
mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/movement.json', JSON.stringify({ checks, rows: recordings }));
console.log(`PASS ${checks} movement visual checks`);
