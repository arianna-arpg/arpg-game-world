import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SKILL_PRESENCES, presenceProfile, skillPresenceVoice, type PresenceProfile, type PresencePhase } from '../src/data/skillPresenceVisuals';
import { drawPresenceMoment } from '../src/render/vis/skillPresenceVoice';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { skillFieldVisual } from '../src/engine/skillFieldVisual';
import { equipCosmetic } from '../src/meta/cosmetics';
import { SUPPORTS } from '../src/data/supports';

let checks = 0;
const check = (label: string, value: unknown) => { assert.ok(value, label); checks++; };
const census = Object.values(SKILLS).filter(s => ['storm', 'summon', 'construct'].includes(s.delivery.type));
assert.deepEqual(Object.keys(SKILL_PRESENCES).sort(), census.map(s => s.id).sort());
check('139 native sources covered without fallback collisions', census.length === 139 && !presenceProfile('constructor'));
function trace(id: string, phase: PresencePhase, life: number, color: string, radius = 42) {
  let depth = 0; const calls: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1, lineWidth: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), String(k));
      if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawPresenceMoment(ctx, { pos: { x: 0, y: 0 }, radius, color, life, maxLife: 1 }, life, SKILL_PRESENCES[id], phase);
  assert.equal(depth, 0); assert(calls.length < 1200); return JSON.stringify(calls);
}
for (const phase of ['arrive', 'pulse', 'expire', 'break'] as const) {
  const silhouettes = new Set<string>();
  for (const def of census) {
    assert(effectVoiceOf(skillPresenceVoice(def.id, phase)!));
    for (const life of [.95, .5, .05]) for (const radius of [1, 42, 4000])
      assert.equal(trace(def.id, phase, life, '#abc', radius), trace(def.id, phase, life, '#987', radius));
    assert.notEqual(trace(def.id, phase, .9, '#abc'), trace(def.id, phase, .3, '#abc'));
    const key = trace(def.id, phase, .55, '#abc'); assert(!silhouettes.has(key), 'duplicate geometry: ' + def.id + '/' + phase); silhouettes.add(key);
  }
  check(phase + ': finite, distinct, animated geometry independent of tint', true);
}
function rig() {
  const w = makeSimWorld('necromancer', 84190), p = w.player;
  w.actors = [p]; w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.flashes = []; w.zones = []; w.projectiles = [];
  p.pos = { x: 700, y: 700 }; p.skills = []; p.buffs.clear(); p.statuses = []; p.casting = null; p.useLock = 0;
  p.sheet.setSource('qa', [mod('life', 'override', 10000), mod('mana', 'override', 10000), mod('critChance', 'override', 0)]); p.fillResources();
  const spawn = () => {
    const a = w.createMonster('skeleton_warrior', 1, 'enemy'); a.pos = { x: 800, y: 700 }; a.brain = undefined; a.spawnedAt = -1;
    a.sheet.setSource('qa', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  };
  const skill = (id: string) => makeSkillInstance({ ...SKILLS[id], requirements: undefined });
  const api = w as unknown as { updateZones(dt: number): void; updateConstructs(dt: number): void; expireZone(z: typeof w.zones[number]): void };
  return { w, p, spawn, skill, api };
}
const results: { id: string; arrivals: number; strikes: number; used: boolean }[] = [];
function execute(id: string, control = false) {
  const { w, p, spawn, skill, api } = rig(), inst = skill(id); p.skills = [inst]; const e = spawn();
  w.corpses = [{ pos: { x: 800, y: 700 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
  if (inst.def.pool) p.pools.set(inst.def.pool.id, 150);
  const profiles = SKILL_PRESENCES as Record<string, PresenceProfile>, profile = profiles[id];
  if (control) delete profiles[id];
  const restore = seedGlobalRandom(7113);
  try {
    const used = w.executeSkill(p, inst, e.pos);
    // Real field impacts (including lifespans/pulses) must consume identical RNG.
    for (let i = 0; i < 40; i++) { w.time += .1; api.updateZones(.1); }
    const facts = { used, actors: w.actors.map(a => ({ source: a.sourceSkillId, life: a.life, mana: a.mana, dead: a.dead, pos: a.pos,
      lifespan: a.lifespan, reserved: a.reservedMana, construct: a.construct?.kind,
      buffs: [...a.buffs].map(([k, b]) => [k, b.remaining, b.stacks]), statuses: a.statuses.map(s => [s.id, s.remaining, s.stacks]) })),
      corpses: w.corpses.length, zones: w.zones.map(z => ({ pos: z.pos, delay: z.delay, radius: z.radius, exploded: z.exploded, linger: z.linger, left: z.pulse?.left })),
      projectiles: w.projectiles.map(pr => ({ pos: pr.pos, dir: pr.dir, radius: pr.radius })), pools: [...p.pools], next: Math.random() };
    return { facts, used, arrivals: w.flashes.filter(f => f.fx === skillPresenceVoice(id, 'arrive')).length,
      strikes: w.flashes.filter(f => f.fx === skillPresenceVoice(id, 'pulse')).length };
  } finally { restore(); if (control) profiles[id] = profile; }
}
for (const def of census) {
  const actual = execute(def.id), control = execute(def.id, true);
  assert.deepEqual(actual.facts, control.facts, def.id + ': gameplay or RNG changed');
  check(def.id + ': unpainted control preserves execution and strike outcomes', true);
  results.push({ id: def.id, used: actual.used, arrivals: actual.arrivals, strikes: actual.strikes });
}
for (const id of ['meteor_storm', 'arrowfall', 'stormcall_strike', 'cistern_boil'])
  check(id + ': actual impacts retain their source voice', results.find(r => r.id === id)!.strikes > 0);
for (const id of ['summon_skeleton', 'summon_stone_golem', 'flame_totem', 'bone_prison', 'lay_brood_egg'])
  check(id + ': actual births have arrival art', results.find(r => r.id === id)!.arrivals > 0);
{
  const { w, p, skill, api } = rig(), inst = skill('flame_totem'); p.skills = [inst]; w.executeSkill(p, inst, { x: 850, y: 700 });
  const a = w.actors.find(a => a.presenceBadge?.skillId === inst.def.id)!; assert(a);
  w.flashes = []; api.updateConstructs(.1);
  check('idle totem has no invented attack pulse', !w.flashes.some(f => f.fx?.includes(':pulse:')));
  w.executeSkill(a, skill('frostbolt'), { x: 900, y: 700 });
  check('real autonomous payload accents source while retaining projectile identity', w.flashes.some(f => f.fx === skillPresenceVoice(inst.def.id, 'pulse')) && w.projectiles.length > 0);
  const snap = serializeSnapshot(w, 1), peer = rig().w; applySnapshot(peer, snap);
  const mirror = peer.actors[snap.actors.findIndex(b => b.id === a.id)]; assert.deepEqual(mirror.presenceBadge, a.presenceBadge);
  snap.actors.find(b => b.id === a.id)!.presenceBadge!.color = '#000';
  check('peer source badge is a copied paint receipt', mirror.presenceBadge!.color !== '#000' && !mirror.summonInst);
  w.flashes = []; a.lifespan = .01; a.brain = undefined; w.update(.02);
  check('natural expiration emits once after actual deadline and death', a.dead && a.lifespan <= 0 && w.flashes.filter(f => f.fx === skillPresenceVoice(inst.def.id, 'expire')).length === 1);
  w.kill(a, true); check('already dead body cannot emit a second expiration', w.flashes.filter(f => f.fx === skillPresenceVoice(inst.def.id, 'expire')).length === 1);
  delete snap.actors.find(b => b.id === a.id)!.presenceBadge; applySnapshot(peer, snap);
  check('old wire cannot leave a stale source badge', !mirror.presenceBadge);
}
{
  const { w, p, skill } = rig(); w.executeSkill(p, skill('summon_skeleton'), p.pos);
  const a = w.actors.find(a => a.presenceBadge)!; assert(a); w.flashes = [];
  a.undyingTime = 2; w.kill(a, false);
  check('undying intervention emits no false departure', !a.dead && !w.flashes.some(f => f.fx?.startsWith('skillPresence:')));
  a.undyingTime = 0; w.kill(a, false);
  check('combat death breaks instead of quietly expiring', a.dead && w.flashes.some(f => f.fx === skillPresenceVoice('summon_skeleton', 'break')) && !w.flashes.some(f => f.fx === skillPresenceVoice('summon_skeleton', 'expire')));
}
{
  const { w, p, skill, api } = rig(); const inst = skill('sparklattice');
  p.casting = { mode: 'channel', inst, aim: { x: 820, y: 700 }, remaining: 1, total: 1, held: true, elapsed: 0, baseMult: 1 } as NonNullable<typeof p.casting>;
  w.executeSkill(p, inst, { x: 820, y: 700 }); const z = w.zones[0]; assert(z.armed);
  const visual = skillFieldVisual(z, w.time); check('release-armed storm holds without pretending to count down', visual.armed && z.delay > 9000);
  const peer = rig().w; applySnapshot(peer, serializeSnapshot(w, 1)); assert.deepEqual(peer.remoteSkillFields?.[0], visual);
  p.casting = null; api.updateZones(.01); check('released storm warning adopts its real per-strike clock', !z.armed && z.delay0 === .05 && z.delay < .05);
  api.updateZones(.1); check('released storm fires at that deadline', w.flashes.some(f => f.fx === skillPresenceVoice('sparklattice', 'pulse')));
}
{
  const { w, p, skill, api } = rig(); w.executeSkill(p, skill('meteor_storm'), { x: 820, y: 700 });
  const z = w.zones[0]; w.flashes = []; api.expireZone(z); api.expireZone(z);
  check('retired warning dissolves once without a hit cue', w.flashes.length === 1 && w.flashes[0].fx === skillPresenceVoice('meteor_storm', 'expire'));
}
for (const id of ['meteor_storm', 'summon_skeleton', 'flame_totem', 'cistern_boil']) {
  const { w, p, skill, api } = rig(); equipCosmetic(w.account, 'skillRecolor', 'moon_tint');
  w.executeSkill(p, skill(id), { x: 850, y: 700 });
  if (SKILLS[id].delivery.type === 'storm') for (let i = 0; i < 40; i++) { w.time += .1; api.updateZones(.1); }
  const fs = w.flashes.filter(f => f.fx?.startsWith('skillPresence:'));
  check(id + ': wardrobe changes tint without identity', fs.length && fs.every(f => f.color === '#91d6ef'));
  if (id === 'cistern_boil') {
    const peer = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(peer, snap);
    const ground = peer.flashes.find(f => f.onGround)!; assert(ground);
    check('wet-only footprint survives co-op', ground.onGround!.includes('cistern_water'));
    snap.flashes.find(f => f.onGround)!.onGround!.push('qa'); check('ground filters are not shared with wire arrays', !ground.onGround!.includes('qa'));
  }
}
{
  const { w, p, skill } = rig(); p.sheet.setSource('qa-mana-empty', [mod('mana', 'override', 0)]);
  w.executeSkill(p, skill('summon_stone_golem'), p.pos);
  check('unaffordable reservation cannot show a successful arrival', w.actors.length === 1 && !w.flashes.some(f => f.fx?.startsWith('skillPresence:arrive:')));
}
{
  const { w, p, skill } = rig(), inst = skill('flame_totem');
  for (const x of [760, 800, 840]) w.executeSkill(p, inst, { x, y: 700 });
  check('cap replacement quietly dismantles only the retired construct', w.actors.filter(a => !a.dead && a.presenceBadge).length === 2
    && w.flashes.filter(f => f.fx === skillPresenceVoice(inst.def.id, 'arrive')).length === 3
    && w.flashes.filter(f => f.fx === skillPresenceVoice(inst.def.id, 'expire')).length === 1);
}
{
  const { w, p, skill } = rig(), inst = skill('lay_brood_egg'); p.skills = [inst]; w.executeSkill(p, inst, p.pos);
  const pod = w.actors.find(a => a.construct?.hatch)!; assert(pod); w.flashes = []; pod.lifespan = .01; w.update(.02);
  check('maturing pod yields its own expiration and the offspring source arrival', pod.dead
    && w.flashes.some(f => f.fx === skillPresenceVoice('lay_brood_egg', 'expire'))
    && w.flashes.some(f => f.fx === skillPresenceVoice('egg_hatch_spiders', 'arrive')));
}
{
  const { w, p, skill, api } = rig(), inst = skill('meteor_storm'); inst.sockets = [{ def: SUPPORTS.buried_charge, level: 1 }];
  w.executeSkill(p, inst, { x: 820, y: 700 });
  const zones = w.zones.length;
  for (let i = 0; i < 100; i++) { w.time += .1; api.updateZones(.1); }
  check('delayed storm pulses inherit identity and retire their real afterlife', w.flashes.filter(f => f.fx === skillPresenceVoice(inst.def.id, 'pulse')).length > zones
    && w.flashes.some(f => f.fx === skillPresenceVoice(inst.def.id, 'expire')) && !w.zones.length);
}
mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/presence.json', JSON.stringify({ checks, results,
  rows: census.map(s => ({ id: s.id, name: s.name, color: s.color, ...SKILL_PRESENCES[s.id], description: s.description })) }, null, 2));
console.log(`PASS ${checks} storm/summon/construct visual checks`);
