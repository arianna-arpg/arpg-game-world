import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { SKILL_TARGETS, SKILL_RITES, SKILL_TETHERS, skillTargetVoice, skillRiteVoice } from '../src/data/skillTargetVisuals';
import { drawSkillTarget, drawSkillTether } from '../src/render/vis/skillTargetVoice';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { skillTetherVisual } from '../src/engine/skillTetherVisual';
import { makeSkillInstance, type TetherSpec, type SkillInstance } from '../src/engine/skills';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

let checks = 0;
function check(label: string, ok: unknown) { assert.ok(ok, label); checks++; console.log('PASS ' + label); }
const targets = Object.values(SKILLS).filter(s => s.delivery.type === 'target');
assert.deepEqual(Object.keys(SKILL_TARGETS).sort(), targets.map(s => s.id).sort());
check('every native target delivery has an authored identity', targets.length === 38);
check('target compositions are unique', new Set(Object.values(SKILL_TARGETS).map(p => JSON.stringify(p))).size === targets.length);
check('unknown/prototype IDs retain the generic fallback', !skillTargetVoice('constructor') && !skillRiteVoice('constructor'));
const supports = Object.values(SUPPORTS).filter(s => s.tether);
check('all six tether supports select authored geometry', supports.length === 6 && supports.every(s => s.tether?.visual && SKILL_TETHERS[s.tether.visual]));
function trace(draw: (ctx: CanvasRenderingContext2D) => void) {
  let depth = 0; const calls: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1, lineWidth: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...a: unknown[]) => {
      assert(a.every(v => typeof v !== 'number' || Number.isFinite(v)), String(k));
      if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...a]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  draw(ctx); assert.equal(depth, 0); assert(calls.length < 1800); return JSON.stringify(calls);
}
for (const [id, p] of Object.entries({ ...SKILL_TARGETS, ...SKILL_RITES })) {
  const voice = skillTargetVoice(id) ?? skillRiteVoice(id); assert(voice && effectVoiceOf(voice));
  const draw = (color: string, t: number) => trace(ctx => drawSkillTarget(ctx, { pos: { x: 30, y: 40 }, radius: 34, color, life: t, maxLife: 1 }, t, p));
  assert.equal(draw('#ff0000', .4), draw('#999999', .4), id + ' recolor changed shape');
  assert.notEqual(draw('#999999', .2), draw('#999999', .7), id + ' lacks motion');
}
check('all target and rite painters animate with palette-independent bounded geometry', true);
for (const id of Object.keys(SKILL_TETHERS)) {
  const draw = (color: string, time: number, width = 12, length = 300) => trace(ctx => drawSkillTether(ctx,
    { ax: 0, ay: 0, bx: length, by: 0, width, color, voice: id, age: .3, fade: .8 }, time));
  assert.equal(draw('#f00', .4), draw('#999', .4)); assert.notEqual(draw('#999', .2), draw('#999', .7));
  draw('#999', 1, .1, 100000); draw('#999', 1, 0, 0);
}
check('every tether voice animates without palette coupling or distance-scaled work', true);
function rig() {
  const w = makeSimWorld('necromancer', 25102), p = w.player;
  w.actors = [p]; w.walk = null; w.corpses = []; w.flashes = []; w.projectiles = []; w.tethers = [];
  p.pos = { x: 700, y: 700 }; p.skills = []; p.buffs.clear(); p.statuses = []; p.casting = null; p.useLock = 0;
  p.sheet.setSource('qa', [mod('life', 'override', 1000), mod('mana', 'override', 1000), mod('critChance', 'override', 0)]); p.fillResources();
  const spawn = (ally = false, x = 800, id = 'skeleton_warrior') => {
    const a = w.createMonster(id, 1, ally ? 'player' : 'enemy', ally ? p : undefined);
    a.pos = { x, y: 700 }; a.brain = undefined; a.anchored = true; a.spawnedAt = -1;
    a.sheet.setSource('qa-life', [mod('life', 'override', 10000), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  };
  const skill = (id: string) => makeSkillInstance({ ...SKILLS[id], requirements: undefined, useTime: 0, castMode: 'cast' });
  const api = w as unknown as { addTether(a: Actor, b: Actor, spec: TetherSpec, inst: SkillInstance, owner: Actor): void;
    updateTethers(dt: number): void; executeSkill(a: Actor, inst: SkillInstance, aim: { x: number; y: number }): boolean };
  return { w, p, spawn, skill, api };
}
for (const def of targets) {
  const { w, p, spawn, skill } = rig(); const inst = skill(def.id); p.skills = [inst];
  const ally = def.targeting?.target === 'ally', target = spawn(ally, 780, def.id === 'tame_beast' ? 'plains_wolf' : 'skeleton_warrior'); target.life *= .3;
  const needs = def.targeting?.requiresStatus;
  for (const id of typeof needs === 'string' ? [needs] : needs ?? []) target.applyStatus(id, 1, 3, 'qa');
  if (def.targeting?.target === 'corpse') w.corpses = [{ pos: { ...target.pos }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
  const used = w.useSkill(p, inst, target.pos);
  for (let i = 0; i < 360 && p.casting; i++) { p.casting.held = true; p.aimPos = { ...target.pos }; w.update(1 / 60); }
  check(def.id + ': native resolved cast produces its signature', used
    && w.flashes.some(f => f.fx === skillTargetVoice(def.id) || f.fx === 'skillTargetSplash:' + def.id || f.fx === skillRiteVoice(def.id)));
}
{
  const { w, p, spawn, skill } = rig(); const e = spawn(), extra = spawn(false, 825); const inst = skill('ignite'); p.skills = [inst];
  p.sheet.setSource('fork', [mod('multiTarget', 'override', 1)]); assert(w.useSkill(p, inst, e.pos));
  check('Forked Focus paints each actual victim, not only the first', [e, extra].every(a => w.flashes.some(f => f.fx === skillTargetVoice('ignite') && f.pos.x === a.pos.x)));
}
for (const s of supports) {
  const { w, p, spawn, skill, api } = rig(), endpoint = spawn(true, 900), victim = spawn(false, 800), inst = skill('ignite');
  p.life = 400; api.addTether(p, endpoint, s.tether!, inst, p); const t = w.tethers[0], life = victim.life;
  api.updateTethers(.4);
  check(s.id + ': identity follows real band while damage/healing stays active', t.visual === s.id && t.visualAge === .4
    && (s.tether!.dps ? victim.life < life : p.life > 400));
  api.addTether(p, endpoint, s.tether!, inst, p); check(s.id + ': refresh still replaces the old band', w.tethers.length === 1 && w.tethers[0].visualAge === 0);
  const snap = serializeSnapshot(w, 1), peer = rig().w; applySnapshot(peer, snap);
  assert.deepEqual(peer.remoteSkillTethers, snap.tethers.map(v => ({ ax: v.ax, ay: v.ay, bx: v.bx, by: v.by, width: v.w, color: v.c,
    voice: v.voice, skillId: v.skillId, age: v.age, fade: v.fade, fromTier: v.fromTier, toTier: v.toTier })));
  assert.equal(peer.tethers.length, 0); assert.notEqual(peer.remoteSkillTethers![0], snap.tethers[0]);
  endpoint.dead = true; api.updateTethers(.01); check(s.id + ': endpoint death removes the real band immediately', !w.tethers.length);
  applySnapshot(peer, serializeSnapshot(w, 2)); assert.deepEqual(peer.remoteSkillTethers, []);
}
{
  const { w, p, spawn, skill, api } = rig(); api.addTether(p, spawn(true), SUPPORTS.lifeline.tether!, skill('mend'), p);
  const snap = serializeSnapshot(w, 1), v = snap.tethers[0]; delete v.voice; delete v.skillId; delete v.age; delete v.fade; delete v.fromTier; delete v.toTier;
  const peer = rig().w; applySnapshot(peer, snap); check('legacy packets keep a visible fallback without simulated links', peer.remoteSkillTethers?.[0].fade === 1 && !peer.tethers.length);
  assert.equal(skillTetherVisual(w.tethers[0]).fade, 1);
  w.loadZone(w.zone.id); check('zone transit clears old band presentation', w.remoteSkillTethers === undefined && !w.tethers.length);
}
for (const id of ['bone_offering', 'oblation_of_flesh', 'corpse_feast', 'gorge_carrion']) {
  const { w, p, spawn, skill } = rig(); const minion = spawn(true), inst = skill(id); p.skills = [inst]; p.life = 400;
  const corpse = { pos: { x: 760, y: 700 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }; w.corpses = [corpse];
  assert(w.useSkill(p, inst, corpse.pos));
  check(id + ': offering cue is anchored at fuel actually consumed', !w.corpses.includes(corpse) && w.flashes.some(f => f.fx === skillRiteVoice(id) && f.pos.x === corpse.pos.x));
  if (id === 'bone_offering') check('Bone Offering dresses the actual blessed minion', minion.buffs.has('bone_offering') && w.flashes.some(f => f.fx === skillRiteVoice(id) && f.pos.x === minion.pos.x));
  p.cooldowns.clear(); p.useLock = 0; w.flashes = []; check(id + ': missing fuel invents no rite', !w.useSkill(p, inst, corpse.pos) && !w.flashes.length);
}
for (const id of ['oblation_of_life', 'oblation_of_mana']) {
  const { w, p, skill } = rig(), inst = skill(id); p.skills = [inst];
  const before = [p.life, p.mana]; assert(w.useSkill(p, inst, p.pos));
  check(id + ': paid resource and caster signature agree', (p.life < before[0] || p.mana < before[1]) && w.flashes.some(f => f.fx === skillRiteVoice(id)));
}
for (const cue of [false, { profile: 'ritual', color: '#abcdef' }] as const) {
  const { w, p, skill } = rig(), inst = skill('corpse_feast');
  inst.def = { ...inst.def, feedingCue: cue }; p.skills = [inst]; p.life = 400; p.mana = 400;
  w.corpses = [{ pos: { x: 760, y: 700 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
  assert(w.useSkill(p, inst, w.corpses[0].pos)); assert(p.life > 400);
  check('Corpse Feast honors ' + (cue === false ? 'silent consumption' : 'one custom recovery material'), cue === false
    ? !p.restoreGains.length && !w.flashes.some(f => f.feedingCue || f.fx?.startsWith('skillRite:'))
    : p.restoreGains.length > 0 && p.restoreGains.every(g => g.profile === cue.profile && g.color === cue.color));
}
for (const silent of [false, true]) {
  const { w, p, spawn, skill } = rig(), minion = spawn(true, 730), enemy = spawn(false, 850), inst = skill('ignite');
  inst.sockets[0] = { def: SUPPORTS.blood_toll, level: 1 };
  if (silent) inst.def = { ...inst.def, feedingCue: false };
  p.skills = [inst]; assert(w.useSkill(p, inst, enemy.pos));
  check('Blood Toll paints only actual sacrifice' + (silent ? ' and honors opt-out' : ''), minion.dead
    && w.flashes.some(f => f.fx === skillRiteVoice('sacrifice')) === !silent);
}
{
  const { p, w, spawn, skill } = rig(); const e = spawn(); const restore = seedGlobalRandom(15); const before = Math.random();
  const api = w as unknown as { showSkillArrival(a: Actor, inst: SkillInstance, at: Actor['pos'], radius: number, tier: number): void };
  api.showSkillArrival(p, skill('ignite'), e.pos, 26, e.tier); const after = Math.random(); restore();
  const reset = seedGlobalRandom(15); assert.equal(Math.random(), before); assert.equal(Math.random(), after); reset();
  check('signature creation spends no combat randomness', true);
}
mkdirSync('balance/reports/skill-visuals', { recursive: true });
const linkNames: Record<string, string> = { healing_chain: 'Healing Chain', embed: 'Embedded Shards', pack: 'Pack Bond', fallback: 'Unmarked Link' };
writeFileSync('balance/reports/skill-visuals/targets.json', JSON.stringify({ targets: targets.map(s => ({ id: s.id, name: s.name, color: s.color, delivery: s.delivery })),
  rites: Object.keys(SKILL_RITES).map(id => ({ id, name: SKILLS[id]?.name ?? 'Sacrifice', color: SKILLS[id]?.color ?? '#c6a0db' })),
  tethers: Object.keys(SKILL_TETHERS).map(id => ({ id, name: SUPPORTS[id]?.name ?? SKILLS[id]?.name ?? linkNames[id] ?? id,
    color: SUPPORTS[id]?.color ?? SKILLS[id]?.color ?? (id === 'healing_chain' ? '#83dbbb' : '#c5b3dc') })), checks }, null, 2));
console.log(`PASS ${checks} targeted/tether/offering visual checks`);
