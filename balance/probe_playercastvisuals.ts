import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SKILL_BURSTS } from '../src/data/skillVisuals';
import { SKILL_FLIGHTS, SKILL_FIELDS, SKILL_BEAMS } from '../src/data/skillFlightVisuals';
import { SKILL_PRESENCES } from '../src/data/skillPresenceVisuals';
import { SKILL_SELFS } from '../src/data/skillSelfVisuals';
import { SKILL_STRIKES } from '../src/data/skillStrikeVisuals';
import { SKILL_TARGETS, SKILL_RITES } from '../src/data/skillTargetVisuals';
import { SKILL_MOVEMENTS } from '../src/data/skillMovementVisuals';
import { CAST_STYLES, CAST_OVERRIDES, skillCastProfile } from '../src/data/skillCastVisuals';
import { castingCueOf, castingCompletion } from '../src/engine/castingCues';
import { playerCastPreparation } from '../src/engine/playerCastVisual';
import { drawCastPreparation } from '../src/render/vis/skillCastPreparation';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { companionCueState } from '../src/engine/companionCues';
import { makeAccount, serializeAccount, deserializeAccount } from '../src/meta/account';
import { sanitizeCosmeticLoadout } from '../src/meta/cosmetics';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

const registries = { burst: SKILL_BURSTS, flight: SKILL_FLIGHTS, field: SKILL_FIELDS, beam: SKILL_BEAMS,
  presence: SKILL_PRESENCES, self: SKILL_SELFS, strike: SKILL_STRIKES, target: SKILL_TARGETS, rite: SKILL_RITES, movement: SKILL_MOVEMENTS };
const rows = Object.values(SKILLS).map(s => ({ id: s.id, name: s.name, delivery: s.delivery.type, noDrop: !!s.noDrop,
  tags: s.tags, decision: skillCastProfile(s) ? 'covered' : s.castingCue === false ? 'disabled' : 'nonspell',
  useTime: s.useTime, mode: s.castMode ?? 'cast', cast: skillCastProfile(s),
  voices: Object.entries(registries).filter(([, r]) => Object.hasOwn(r, s.id)).map(([k]) => k) }));
mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/seamless-census.json', JSON.stringify(rows, null, 2));
const missed = rows.filter(r => !r.voices.length);
console.log('Catalogue: ' + rows.length + ', no authored delivery profile: ' + JSON.stringify(missed.map(r => ({ id: r.id, type: r.delivery }))));
function rig() {
  seedGlobalRandom(91821);
  const w = makeSimWorld('necromancer', 91821), p = w.player;
  w.actors = [p]; w.walk = null; w.doodads = []; w.markDoodadsChanged();
  p.pos = { x: 700, y: 700 };
  p.sheet.setSource('cast-qa', [mod('mana', 'override', 100000), mod('life', 'override', 100000)]);
  p.fillResources();
  return { w, p };
}
{
  const { w, p } = rig();
  const inst = makeSkillInstance({ ...SKILLS.summon_skeleton, requirements: undefined });
  p.skills = [inst]; w.meta.knownSkills.set(inst.def.id, inst);
  assert(w.useSkill(p, inst, { x: 810, y: 700 }, true)); assert(p.casting);
  w['updateCasting'](p, p.casting.total * .4);
  // Body-facing is authoritative even when a self cast has coincident aim,
  // or a locked target remains elsewhere while the body changes direction.
  const savedAim = { ...p.casting.aim };
  p.facing = Math.PI / 2; p.casting.aim = { ...p.pos };
  assert.equal(playerCastPreparation(p)?.facing, p.facing);
  p.casting.aim = savedAim;
  assert.equal(playerCastPreparation(p)?.facing, p.facing);
  assert.equal(playerCastPreparation(p)?.radius, p.radius);
  const cue = playerCastPreparation(p)!; assert.equal(cue.profile.family, 'summon');
  assert(Math.abs(cue.fill! - .4) < 1e-8); assert(!w.actors.some(a => a.owner === p));
  const client = rig().w; client.clientSeatId = w.localSeat.id;
  client.meta.knownSkills.set(inst.def.id, makeSkillInstance(inst.def));
  applySnapshot(client, serializeSnapshot(w, 1));
  assert.equal(playerCastPreparation(client.player)?.profile.family, 'summon');
  assert.equal(playerCastPreparation(client.player)?.fill, cue.fill);
  assert.equal(playerCastPreparation(client.player)?.facing, client.player.facing);
  // Main's optional cast identity binds after the same packet's build metadata.
  client.meta.knownSkills.delete(inst.def.id); w.metaDirty.add(w.localSeat.id);
  const packet = serializeSnapshot(w, 2); assert(packet.seatMeta?.[w.localSeat.id]);
  applySnapshot(client, packet);
  assert.equal(client.player.casting?.inst, client.meta.knownSkills.get(inst.def.id));
  assert.equal(playerCastPreparation(client.player)?.profile.family, 'summon');
  for (const missing of [undefined, 'unknown_future_skill']) {
    const oldPacket = structuredClone(packet);
    oldPacket.actors.find(a => a.id === p.id)!.cast!.sk = missing;
    applySnapshot(client, oldPacket); assert(client.player.casting);
    assert.equal(playerCastPreparation(client.player), undefined);
  }
  applySnapshot(client, packet);
  assert.equal(playerCastPreparation(client.player)?.profile.family, 'summon');
  p.applyStatus('stun', 0, 1, 'qa'); assert.equal(playerCastPreparation(p), undefined);
  w['updateCasting'](p, .01); assert(!p.casting); assert(!w.actors.some(a => a.owner === p));
  p.statuses = []; p.useLock = 0; p.cooldowns.clear();
  assert(w.useSkill(p, inst, { x: 810, y: 700 }, true));
  w['updateCasting'](p, inst.def.useTime + 1);
  assert.equal(playerCastPreparation(p), undefined);
  const minion = w.actors.find(a => a.owner === p)!; assert(minion);
  assert(!companionCueState(minion, w).links.length);
  // Return intent comes from real AI, disappears at heel, and never alters the return.
  minion.pos = { x: p.pos.x + 320, y: p.pos.y }; minion.emergeUntil = undefined;
  updateAI(minion, w, .05); assert(companionCueState(minion, w).links.some(l => l.to.id === p.id));
  assert(minion.pos.x < p.pos.x + 320);
  minion.pos = { x: p.pos.x + 50, y: p.pos.y }; updateAI(minion, w, .05);
  assert(!companionCueState(minion, w).links.length);
  const enemy = w.createMonster('zombie', 1, 'enemy'); enemy.pos = { x: p.pos.x + 70, y: p.pos.y }; w.actors.push(enemy);
  updateAI(minion, w, .05); assert(!companionCueState(minion, w).links.length);
}
{
  const { w, p } = rig();
  const inst = makeSkillInstance({ ...SKILLS.firebolt, requirements: undefined, castMode: 'channel',
    channel: { interval: .5, move: 'immobile' }, manaCost: 0, cooldown: 0 });
  p.skills = [inst]; assert(w.useSkill(p, inst, { x: 900, y: 700 }, true));
  assert.equal(playerCastPreparation(p)?.fill, undefined);
  const before = JSON.stringify([p.life, p.mana, p.casting, w.projectiles.length]);
  playerCastPreparation(p); assert.equal(JSON.stringify([p.life, p.mana, p.casting, w.projectiles.length]), before);
  inst.def = { ...inst.def, castingCue: false }; assert.equal(playerCastPreparation(p), undefined);
}
{
  const a = makeAccount(); assert.notEqual(a.cosmetics.loadout.castingEffects, false);
  a.cosmetics.loadout.castingEffects = false;
  assert.equal(deserializeAccount(serializeAccount(a))!.cosmetics.loadout.castingEffects, false);
  assert.equal(sanitizeCosmeticLoadout({ castingEffects: 'false' }).castingEffects, undefined);
}
// Production paths remain finite, balanced and deterministic in a single color.
function trace(id: string, fill: number, color: string) {
  let depth = 0; const calls: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), id + ':' + String(k));
      if (k === 'save') depth++; if (k === 'restore') depth--;
      calls.push([k, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawCastPreparation(ctx, { profile: skillCastProfile(SKILLS[id])!, fill, age: 1, facing: .2, radius: 14 }, color);
  assert.equal(depth, 0); assert(calls.length < 800); return JSON.stringify(calls);
}
for (const r of rows.filter(r => r.cast)) for (const fill of [0, .5, 1])
  assert.equal(trace(r.id, fill, '#888888'), trace(r.id, fill, '#ef1234'));
assert.notEqual(trace('lightning_bolt', .5, '#888888'), trace('chain_lightning', .5, '#888888'));
const families = new Map(rows.filter(r => r.cast && !r.cast.legacyMantle).map(r => [r.cast!.style, r.id]));
assert.equal(families.size, Object.keys(CAST_STYLES).length);
assert.equal(new Set([...families.values()].map(id => trace(id, .5, '#888888'))).size, families.size);
console.log('PASS native summon preparation/interruption/birth, own co-op cast, return-only links, endless channel, saved toggle and palette-independent geometry for ' + rows.filter(r => r.cast).length + ' skills in ' + families.size + ' casting families');

// Catalogue-wide contract: no registry entry or finished-effect profile required.
for (const def of Object.values(SKILLS)) {
  const exception = Object.hasOwn(CAST_OVERRIDES, def.id) ? CAST_OVERRIDES[def.id] : undefined;
  const expected = def.castingCue !== false && exception !== false
    && (!!exception?.allowNonSpell || (def.tags.includes('spell') && !def.tags.includes('attack')));
  assert.equal(!!skillCastProfile(def), expected, def.id);
}
for (const id of Object.keys(CAST_OVERRIDES)) assert(SKILLS[id], 'stale override: ' + id);
const future = { ...SKILLS.firebolt, id: 'unregistered_future_spell', tags: ['spell'] as const };
const fresh = { ...future, tags: [...future.tags], baseDamage: undefined };
assert.equal(skillCastProfile(fresh)?.style, 'arcane');
assert.equal(skillCastProfile({ ...fresh, id: '__proto__' })?.style, 'arcane');
for (const school of ['fire', 'cold', 'lightning', 'chaos', 'physical'] as const) {
  for (const delivery of [SKILLS.firebolt.delivery, SKILLS.frost_nova.delivery, SKILLS.meteor_storm.delivery]) {
    assert.equal(skillCastProfile({ ...fresh, tags: ['spell', school], delivery })?.style, school);
  }
  assert.equal(skillCastProfile({ ...fresh, baseDamage: { [school]: [1, 2] } })?.style, school);
}
assert.equal(skillCastProfile({ ...fresh, tags: ['spell', 'cold', 'fire'] })?.style, 'arcane');
assert.equal(skillCastProfile({ ...fresh, tags: ['fire', 'spell', 'cold'] })?.style, 'arcane');
assert.equal(skillCastProfile({ ...fresh, tags: ['attack', 'spell', 'fire'] }), undefined);
assert.equal(skillCastProfile({ ...fresh, castingCue: false }), undefined);
assert.equal(skillCastProfile({ ...fresh, tags: ['spell', 'heal'] })?.style, 'life');
for (const [id, style] of Object.entries({ summon_skeleton: 'summon-undead', summon_skeleton_mage: 'summon-undead',
  summon_fire_golem: 'summon-golem', summon_sporeling: 'summon-nature', summon_flame_sprite: 'summon-elemental',
  summon_cherub: 'summon', raise_dead: 'summon-undead', chain_lightning: 'lightning', siphon_blood: 'blood' }))
  assert.equal(skillCastProfile(SKILLS[id])?.style, style, id);
for (const pool of [[{ id: 'future_creature', weight: 1 }],
  [{ id: 'skeleton_warrior', weight: 1 }, { id: 'fungal_sporeling', weight: 1 }]]) {
  assert.equal(skillCastProfile({ ...fresh, delivery: { type: 'summon', pool, count: 1, maxActive: 1 } })?.style, 'summon');
}
// Nonspells lose decoration only: charged attacks retain their actual readiness.
for (const id of ['cleave', 'heavy_strike', 'stone_skin', 'quickstep']) {
  const { w, p } = rig(), inst = makeSkillInstance({ ...SKILLS[id], requirements: undefined });
  assert(w.useSkill(p, inst, { x: 810, y: 700 }, true)); assert(p.casting);
  w['updateCasting'](p, p.casting.total * .5);
  assert.equal(!!playerCastPreparation(p), id === 'quickstep');
  assert.equal(!!castingCueOf(p), id === 'quickstep');
  p.casting!.mode = 'charge'; p.casting!.total = 1; p.casting!.elapsed = .5;
  assert.equal(castingCompletion(p), .5); assert.equal(castingCueOf(p)?.fill, .5);
}
const counts = Object.fromEntries(Object.keys(CAST_STYLES).map(style => [style, rows.filter(r => r.cast?.style === style).length]));
console.log('PASS complete spell/attack split, Quickstep exception, future spells, mixed schools/pools, opt-out and native readiness: ' + JSON.stringify(counts));
// Other players/enemies use bare wire stubs, not the local seat's real instance.
// Missing decorative identity must never crash their cast or invent spell art.
for (const id of ['firebolt', 'cleave', 'stone_skin']) {
  const { w, p } = rig(), inst = makeSkillInstance({ ...SKILLS[id], requirements: undefined });
  assert(w.useSkill(p, inst, { x: 810, y: 700 }, true)); assert(p.casting);
  const peer = rig().w; peer.clientSeatId = 'other-seat';
  const snap = serializeSnapshot(w, 1); applySnapshot(peer, snap);
  const remote = peer.actors[snap.actors.findIndex(a => a.id === p.id)]; assert(remote.casting);
  assert.equal(remote.casting.inst.def.tags, undefined);
  assert.equal(castingCueOf(remote), undefined);
  assert.equal(playerCastPreparation(remote), undefined);
}
console.log('PASS bare remote casting stubs remain render-safe');
