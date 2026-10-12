import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { SKILL_FLIGHTS, SKILL_FIELDS, SKILL_BEAMS, skillBeamVoice } from '../src/data/skillFlightVisuals';
import { drawSkillFlightWake, drawSkillFlightHead, drawSkillField, drawSkillBeam, fieldProfile } from '../src/render/vis/skillFlightVoice';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { skillFieldVisual, type SkillFieldVisual } from '../src/engine/skillFieldVisual';

const all = Object.values(SKILLS);
const flights = all.filter(s => s.delivery.type === 'projectile');
const fields = all.filter(s => s.delivery.type === 'ground' || s.delivery.type === 'aura');
const beams = all.filter(s => s.delivery.type === 'cone' && s.delivery.beamFx);
for (const [catalogue, census] of [[SKILL_FLIGHTS, flights], [SKILL_FIELDS, fields], [SKILL_BEAMS, beams]] as const) {
  assert.deepEqual(Object.keys(catalogue).sort(), census.map(s => s.id).sort());
  const signatures = new Map<string, string>();
  for (const s of census) {
    const v = catalogue[s.id as keyof typeof catalogue], signature = JSON.stringify(v);
    assert(!signatures.has(signature), `${s.id} duplicates ${signatures.get(signature)}`);
    signatures.set(signature, s.id);
  }
}
assert.equal(fieldProfile('constructor'), undefined);
assert.equal(skillBeamVoice('constructor'), undefined);
console.log(`PASS authored census: ${flights.length} flights, ${beams.length} beams, ${fields.length} fields/auras; distinct compositions`);

function trace(draw: (ctx: CanvasRenderingContext2D) => void): unknown[] {
  const calls: unknown[] = [], state: Record<string, unknown> = { globalAlpha: 1 };
  const ctx = new Proxy(state, {
    get: (o, key) => key in o ? o[String(key)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), `invalid ${String(key)}`);
      calls.push([key, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  draw(ctx); assert(calls.length < 1100, `detail budget ${calls.length}`); return calls;
}
const view = (id: string, color = '#abcdef'): SkillFieldVisual => ({ skillId: id, color,
  pos: { x: 120, y: 100 }, radius: 75, facing: .4, shape: 0, delay: 0, exploded: true,
  linger: 3, tier: 0, telegraph: 0 });
for (const s of flights) for (const age of [0, .13, .7, 4]) {
  const render = (color: string) => trace(ctx => {
    const p = { skillVisualId: s.id, pos: { x: 0, y: 0 }, color, dir: .7, radius: 9, age, shape: 'circle' };
    assert(drawSkillFlightWake(ctx, p)); assert(drawSkillFlightHead(ctx, p));
  });
  assert.deepEqual(render('#abcded'), render('#aaaaaa'));
}
for (const s of fields) for (const age of [0, .7, 3, 7]) {
  const render = (color: string) => trace(ctx => { assert(drawSkillField(ctx, view(s.id, color), age)); });
  assert.deepEqual(render('#abcded'), render('#aaaaaa'));
}
for (const [id, kind] of Object.entries(SKILL_BEAMS)) for (const t of [1, .6, .1]) {
  const render = (color: string) => trace(ctx => drawSkillBeam(ctx, {
    pos: { x: 0, y: 0 }, radius: 330, color, life: .22 * t, maxLife: .22, facing: .3, arc: { facing: .3, arcRad: .15 },
  }, t, kind));
  assert.deepEqual(render('#abcdee'), render('#aaaaaa'), id);
}
console.log('PASS deterministic geometry, whole-life finite bounded work, identical geometry under recoloring');

const host = makeSimWorld('warrior', 68124); host.actors = [host.player];
for (const id of ['firebolt','ice_spear','chain_lightning','vine_lash','fireball','frozen_orb']) {
  host.projectiles = []; host.executeSkill(host.player, makeSkillInstance(SKILLS[id]), { x: host.player.pos.x + 220, y: host.player.pos.y });
  assert(host.projectiles.length, id);
  const p = host.projectiles[0], before = JSON.stringify(p.pos);
  const shape = p.shape, radius = p.radius;
  trace(ctx => { assert(drawSkillFlightWake(ctx, p)); drawSkillFlightHead(ctx, p); });
  assert.equal(p.shape, shape); assert.equal(p.radius, radius); assert.equal(JSON.stringify(p.pos), before);
}
for (const s of beams) {
  host.flashes = []; host.executeSkill(host.player, makeSkillInstance(s), { x: host.player.pos.x + 200, y: host.player.pos.y });
  const f = host.flashes.find(f => f.fx === skillBeamVoice(s.id));
  assert(f?.beam && f.arc && f.radius > 0, `${s.id}: real beam footprint`);
  const sigiled = makeSkillInstance(s);
  host.player.sheet.setSource('skillflights-sigil', [{ stat: 'aoeShape', kind: 'override', value: 1 }]);
  host.flashes = []; host.executeSkill(host.player, sigiled, { x: host.player.pos.x + 200, y: host.player.pos.y });
  assert(host.flashes.some(f => f.shape === 1 && !f.beam), s.id + ': a sigil uses its actual area instead of a phantom ray');
  host.player.sheet.removeSource('skillflights-sigil');
}
for (const id of ['toxic_cloud','pillar_of_flame','entangle','consecration']) {
  host.zones = []; host.executeSkill(host.player, makeSkillInstance(SKILLS[id]), host.player.pos);
  assert(host.zones.length, id); assert.equal(skillFieldVisual(host.zones[0], host.time).skillId, id);
}
console.log('PASS real casts use source identities and preserve flight geometry');

host.executeSkill(host.player, makeSkillInstance(SKILLS.righteous_fire), host.player.pos);
assert(host.player.activeAuras.size);
Object.assign(host.zones[0], { shape: 3, arcRad: 2.8, facing: .7, edgeFrac: .4, edge: .2,
  seg: { ax: 760, ay: 580, bx: 850, by: 620 }, lobFrom: { x: 700, y: 500 }, lobArc: .4 });
const snap = serializeSnapshot(host, 1), client = makeSimWorld('warrior', 7123);
applySnapshot(client, JSON.parse(JSON.stringify(snap)));
assert.equal(client.projectiles[0].skillVisualId, host.projectiles[0].inst.def.id);
assert.equal(snap.skillFields, undefined, 'only the canonical filtered wire rows are emitted');
assert.equal(client.remoteSkillFields!.length, snap.zones!.length);
const row = snap.zones![0], paint = client.remoteSkillFields![0], stub = client.zones[0];
assert.equal(paint.skillId, row.sk ?? row.vi);
assert.deepEqual(paint.pos, {x: row.p[0], y: row.p[1]});
assert.equal(paint.radius, row.r); assert.equal(paint.shape, row.sh ?? 0);
assert.equal(paint.facing, row.f ?? 0); assert.equal(paint.arcRad, row.arc);
assert.equal(paint.tier, row.tier ?? 0); assert.equal(paint.delay, 1 - (row.ex ? 1 : row.fill ?? 0));
assert.equal(paint.telegraph, 1); assert.equal(paint.edgeFrac, row.ef); assert.equal(paint.edge, row.ed);
assert.deepEqual(paint.seg, row.seg ? {ax:row.seg[0],ay:row.seg[1],bx:row.seg[2],by:row.seg[3]} : undefined);
assert.deepEqual(paint.lobFrom, row.lf ? {x:row.lf[0],y:row.lf[1]} : undefined);
assert.equal(paint.lobArc, row.la);
assert(!('caster' in paint) && !('inst' in paint), 'paint exposes no actor or skill instance');
assert.equal(stub.inst.def.id, row.sk ?? '', 'retained hotbar stub keeps own-field identity');
assert(!('damage' in stub) && !('hit' in stub), 'hotbar stub has no damage payload');
const replica = client.actors.find(a => a.activeAuras.size)!;
assert.equal([...replica.activeAuras.values()][0].inst.def.id, 'righteous_fire');
assert.notEqual(client.remoteSkillFields![0].pos, host.zones[0].pos);
assert.notEqual(client.remoteSkillFields![0].seg, host.zones[0].seg);
delete snap.skillFields; delete snap.zones; delete snap.projectiles[0].skillId;
applySnapshot(client, snap);
assert.deepEqual(client.remoteSkillFields, []);
assert.equal(client.projectiles[0].skillVisualId, undefined);
console.log('PASS co-op source IDs, aura identity, render-only fields, deep copying and old-host clearing');

mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/flights.json', JSON.stringify([...flights, ...beams, ...fields].map(s => ({
  id: s.id, name: s.name, color: s.color, delivery: s.delivery,
  family: s.delivery.type === 'projectile' ? 'projectile' : s.delivery.type === 'cone' ? 'beam' : s.delivery.type === 'aura' ? 'aura' : 'field',
})), null, 2));
