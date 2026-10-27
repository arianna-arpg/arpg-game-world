import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SKILL_SELFS, selfProfile, skillSelfVoice, type SelfProfile } from '../src/data/skillSelfVisuals';
import { skillRiteVoice } from '../src/data/skillTargetVisuals';
import { drawSelfMoment } from '../src/render/vis/skillSelfVoice';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { castingCueOf, castingCompletion } from '../src/engine/castingCues';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { selfBankCuesOf } from '../src/engine/skillSelfVisual';
import { equipCosmetic } from '../src/meta/cosmetics';

let checks = 0;
const check = (label: string, value: unknown) => { assert.ok(value, label); checks++; };
const census = Object.values(SKILLS).filter(s => ['self', 'mark', 'detonate', 'detonateProjectile'].includes(s.delivery.type));
assert.deepEqual(Object.keys(SKILL_SELFS).sort(), census.map(s => s.id).sort());
check('110 authored profiles cover the complete native census', census.length === 110);
check('each composition is distinct; unknown profiles keep fallback', new Set(Object.values(SKILL_SELFS).map(p => JSON.stringify(p))).size === 110 && !selfProfile('constructor'));
function trace(id: string, phase: 'release' | 'prepare' | 'burst', life: number, color: string, radius = 42) {
  let depth = 0; const calls: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1, lineWidth: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), String(k));
      if (k === 'save') depth++; if (k === 'restore') depth--; calls.push([k, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawSelfMoment(ctx, { pos: { x: 0, y: 0 }, radius, color, life, maxLife: 1 }, life, SKILL_SELFS[id], phase);
  assert.equal(depth, 0); assert(calls.length < 1600); return JSON.stringify(calls);
}
for (const id of Object.keys(SKILL_SELFS)) {
  for (const phase of ['release', 'prepare', 'burst'] as const) {
    assert(effectVoiceOf(skillSelfVoice(id, phase)!));
    for (const life of [.95, .5, .05]) for (const radius of [1, 42, 4000])
      assert.equal(trace(id, phase, life, '#abc', radius), trace(id, phase, life, '#987', radius));
    assert.notEqual(trace(id, phase, .9, '#abc'), trace(id, phase, .3, '#abc'));
  }
}
check('all silhouettes animate with finite, bounded and color-independent geometry', true);
function rig() {
  const w = makeSimWorld('necromancer', 84190), p = w.player;
  w.actors = [p]; w.walk = null; w.doodads = []; w.markDoodadsChanged(); w.flashes = []; w.zones = []; w.projectiles = [];
  p.pos = { x: 700, y: 700 }; p.skills = []; p.buffs.clear(); p.statuses = []; p.casting = null; p.useLock = 0;
  p.sheet.setSource('qa', [mod('life', 'override', 10000), mod('mana', 'override', 10000), mod('critChance', 'override', 0)]); p.fillResources();
  p.life = 3000; p.mana = 3000;
  const spawn = (ally = false, x = 800) => {
    const a = w.createMonster('skeleton_warrior', 1, ally ? 'player' : 'enemy', ally ? p : undefined);
    a.pos = { x, y: 700 }; a.brain = undefined; a.spawnedAt = -1;
    a.sheet.setSource('qa', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]); a.fillResources(); w.actors.push(a); return a;
  };
  const skill = (id: string) => makeSkillInstance({ ...SKILLS[id], requirements: undefined });
  return { w, p, spawn, skill };
}
const results: { id: string; release: string[]; used: boolean }[] = [];
function execute(id: string, control = false) {
  const { w, p, spawn, skill } = rig(), inst = skill(id); p.skills = [inst];
  const e = spawn(); spawn(true, 760);
  w.corpses = [{ pos: { x: 800, y: 700 }, defId: 'zombie', maxLife: 100, level: 1, remaining: 60, tier: 0 }];
  if (inst.def.pool) p.pools.set(inst.def.pool.id, 150);
  const profiles = SKILL_SELFS as Record<string, SelfProfile>, profile = profiles[id];
  if (control) delete profiles[id];
  const restore = seedGlobalRandom(7113);
  let used = false;
  try {
    used = w.executeSkill(p, inst, e.pos);
    const facts = { used, actors: w.actors.map(a => ({ life: a.life, mana: a.mana, dead: a.dead, pos: a.pos,
      buffs: [...a.buffs].map(([k, b]) => [k, b.remaining, b.stacks]), statuses: a.statuses.map(s => [s.id, s.remaining, s.stacks]) })),
      corpses: w.corpses.length, zones: w.zones.length, projectiles: w.projectiles.length, pools: [...p.pools], next: Math.random() };
    return { facts, used, release: w.flashes.flatMap(f => f.fx?.startsWith('skillSelf:') || f.fx?.startsWith('skillRite:') ? [f.fx] : []) };
  } finally { restore(); if (control) profiles[id] = profile; }
}
for (const def of census) {
  const actual = execute(def.id), control = execute(def.id, true);
  assert.deepEqual(actual.facts, control.facts, def.id + ': gameplay or RNG changed');
  check(def.id + ': authored presentation leaves execution unchanged', true);
  results.push({ id: def.id, release: actual.release, used: actual.used });
}
for (const id of ['war_cry', 'stone_skin', 'life_flask', 'surgewind', 'iron_ward', 'cold_snap', 'detonation', 'mark'])
  check(id + ': release comes from a real execution', results.find(r => r.id === id)!.release.includes(skillSelfVoice(id, ['cold_snap', 'detonation'].includes(id) ? 'burst' : 'release')!));
for (const id of ['corpse_feast', 'gorge_carrion', 'oblation_of_life', 'oblation_of_mana']) {
  const r = results.find(r => r.id === id)!;
  check(id + ': existing rites own their receipt without duplicate self art', r.release.includes(skillRiteVoice(id)!) && !r.release.some(f => f.startsWith('skillSelf:')));
}
for (const id of ['war_cry', 'surgewind', 'shield_up', 'spiked_bulwark', 'cold_snap']) {
  const { w, p, skill } = rig(), inst = skill(id); p.skills = [inst];
  assert(w.useSkill(p, inst, { x: 820, y: 700 }), id);
  for (let i = 0; i < 8; i++) w.update(1 / 60);
  const cue = castingCueOf(p);
  if (id === 'war_cry') check('ordinary nonspell War Cry keeps its body animation without spell preparation', !cue);
  else check(id + ': native spell/guard signature', cue?.skillId === id);
  if (id === 'surgewind') assert.equal(cue!.fill, castingCompletion(p));
  const peer = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(peer, snap);
  const mirror = peer.actors[snap.actors.findIndex(a => a.id === p.id)];
  assert.deepEqual(castingCueOf(mirror), cue); check(id + ': co-op uses the host-resolved preparation', true);
  p.poise = 0; p.applyStatus('stun', 0, 1, 'qa'); check(id + ': stun suppresses cue immediately', !castingCueOf(p));
  w.update(.02); applySnapshot(peer, serializeSnapshot(w, 2)); check(id + ': interruption clears peer preparation', !castingCueOf(mirror));
}
{
  const { w, p, skill } = rig(), inst = skill('surgewind'); p.skills = [inst]; assert(w.useSkill(p, inst, p.pos)); w.update(.016);
  p.casting!.held = false; w.update(.016);
  check('underfilled Surgewind fizzles with no successful release', !w.flashes.some(f => f.fx === skillSelfVoice('surgewind')) && w.flashes.some(f => f.combatCue?.style === 'cast_fizzle'));
}
{
  const { w, p, skill } = rig(), inst = skill('mark'); p.skills = [inst];
  assert(w.useSkill(p, inst, { x: 850, y: 700 }));
  check('instant Mark does not invent a charging state', !castingCueOf(p) && !!inst.state?.markPos);
  const mark = { ...inst.state!.markPos! };
  const peer = rig().w; applySnapshot(peer, serializeSnapshot(w, 1));
  check('persistent mark reaches peer', peer.actors[0].companionCues!.marks[0].x === mark.x);
  w.flashes = []; w.executeSkill(p, inst, p.pos);
  check('recall clears mark and paints actual endpoints', !inst.state!.markPos && p.pos.x === mark.x && w.flashes.some(f => f.fx === skillSelfVoice('mark', 'depart')) && w.flashes.some(f => f.fx === skillSelfVoice('mark', 'recall') && f.pos.x === p.pos.x));
  applySnapshot(peer, serializeSnapshot(w, 2)); check('recall removes remote waiting rune', !peer.actors[0].companionCues!.marks.length);
}
{
  const { w, p, spawn, skill } = rig(), inst = skill('detonate_mines');
  w.executeSkill(p, inst, p.pos); check('empty mine command has no release', !w.flashes.some(f => f.fx?.startsWith('skillSelf:')));
  const mines = [750, 790, 830].map(x => { const m = spawn(true, x); m.construct = { kind: 'mine', castInst: skill('frostbolt') } as NonNullable<typeof m.construct>; return m; });
  w.executeSkill(p, inst, p.pos); const cues = w.pendingDetonations.map(p => p.visual!);
  check('mine preparation uses actual stagger clocks', cues.length === 3 && cues.every((f, i) => f.maxLife === .05 + i * .08));
  mines[2].dead = true;
  const api = w as unknown as { updateDetonations(dt: number): void }; api.updateDetonations(.06);
  check('dead mine cancels preparation and fired mine clears it', cues[0].life === 0 && cues[2].life === 0 && mines[0].dead && !mines[1].dead);
  api.updateDetonations(.08); check('second mine preserves its true firing beat', mines[1].dead && cues[1].life === 0);
}
for (const id of ['last_rite', 'command_detonate', 'shatter_totem']) {
  const { w, p, skill } = rig(); w.executeSkill(p, skill(id), p.pos);
  check(id + ': empty destructive order has no release', !w.flashes.some(f => f.fx?.startsWith('skillSelf:')));
}
{
  const { w, p, spawn, skill } = rig(); const e = spawn(); w.executeSkill(p, skill('frostbolt'), e.pos);
  const pr = w.projectiles[0]; assert(pr); pr.pos = { x: 815, y: 700 };
  w.executeSkill(p, skill('cold_snap'), pr.pos);
  check('Cold Snap consumes the real projectile at its actual position', !w.projectiles.includes(pr) && w.flashes.some(f => f.fx === skillSelfVoice('cold_snap', 'burst') && f.pos.x === 815));
  const peer = rig().w; applySnapshot(peer, serializeSnapshot(w, 1));
  check('detonation identity and footprint survive co-op', peer.flashes.some(f => f.fx === skillSelfVoice('cold_snap', 'burst') && f.pos.x === 815 && f.radius === 120));
}
mkdirSync('balance/reports/skill-visuals', { recursive: true });
{
  const { w, p, skill, spawn } = rig(); p.skills = [skill('iron_ward'), skill('detonation')]; spawn();
  w.executeSkill(p, p.skills[0]!, p.pos);
  check('empty Iron Ward has no invented stored charge', !selfBankCuesOf(p, w.time).length);
  p.ironWard!.stored = 150; p.pools.set('pyre', 250);
  const rows = selfBankCuesOf(p, w.time); check('Iron Ward and pyre use real stored fractions', rows.length === 2 && rows.every(r => r.fill === .5));
  const snap = serializeSnapshot(w, 1), peer = rig().w; applySnapshot(peer, snap);
  assert.deepEqual(selfBankCuesOf(peer.actors[0], w.time), rows);
  snap.actors[0].selfBankCues![0].fill = 0;
  check('bank wire rows copy rather than alias', selfBankCuesOf(peer.actors[0], w.time)[0].fill === .5 && !peer.actors[0].ironWard);
  w.executeSkill(p, p.skills[1]!, p.pos); check('spent pool loses its bank read', selfBankCuesOf(p, w.time).length === 1);
  p.ironWard!.until = w.time + .01; w.update(.02);
  check('Iron Ward only bursts at its actual expiry and clears its bank', !p.ironWard && !selfBankCuesOf(p, w.time).length && w.flashes.some(f => f.fx === skillSelfVoice('iron_ward', 'burst')));
  applySnapshot(peer, serializeSnapshot(w, 2)); check('expired banks disappear on peers', !selfBankCuesOf(peer.actors[0], w.time).length);
}
for (const id of ['war_cry', 'life_flask', 'mark', 'cold_snap', 'detonation']) {
  const { w, p, skill } = rig(); equipCosmetic(w.account, 'skillRecolor', 'moon_tint');
  const inst = skill(id); if (inst.def.pool) p.pools.set(inst.def.pool.id, 150);
  w.executeSkill(p, inst, { x: 850, y: 700 }); const marks = w.flashes.filter(f => f.fx?.startsWith('skillSelf:'));
  check(id + ': wardrobe tint leaves authored identity intact', marks.length > 0 && marks.every(f => f.color === '#91d6ef'));
}
writeFileSync('balance/reports/skill-visuals/self.json', JSON.stringify({ checks, results, rows: census.map(s => ({ id: s.id, name: s.name, color: s.color,
  form: SKILL_SELFS[s.id].form, mode: s.castMode ?? 'cast', useTime: s.useTime,
  prepares: s.castMode === 'channel' ? !!(s.channel?.brim || s.channel?.maxHold) : s.useTime > 0,
  rite: !!skillRiteVoice(s.id), description: s.description })) }, null, 2));
console.log(`PASS ${checks} self/mark/detonation checks`);
