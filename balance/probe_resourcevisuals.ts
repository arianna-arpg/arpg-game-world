import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { applyHit } from '../src/engine/damage';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import type { Actor } from '../src/engine/actor';
import { SKILLS } from '../src/data/skills';
import { ORB_DEFS } from '../src/data/orbs';
import { RESOURCE_FLOW, RESOURCE_VISUALS, type ResourceMaterial } from '../src/data/resourceVisuals';
import { noteResourceFlow, tickRestoreGains, feedingCueState } from '../src/engine/feedingCues';
import { drawResourceFlow, drawResourcePickup } from '../src/render/vis/resourceFlowLayer';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

let checks = 0;
function check(label: string, condition: unknown) { assert.ok(condition, label); checks++; console.log('PASS ' + label); }
function rig() {
  const w = makeSimWorld('necromancer', 25101), p = w.player;
  w.actors = [p]; w.orbs = []; w.flashes = []; w.projectiles = []; w.zones = []; w.walk = null;
  p.pos = { x: 700, y: 700 }; p.skills = []; p.buffs.clear(); p.statuses = [];
  p.sheet.setSource('resource-rig', [mod('life', 'override', 1000), mod('mana', 'override', 1000), mod('energyShield', 'override', 200),
    mod('lifeRegen', 'override', 0), mod('manaRegen', 'override', 0), mod('critChance', 'override', 0),
    mod('healTaken', 'override', 1), mod('lifeOnHit', 'override', 0), mod('lifeLeech', 'override', 0)]);
  p.fillResources(); p.esDelay = 99;
  const victim = () => {
    const e = w.createMonster('skeleton_warrior', 1, 'enemy');
    e.pos = { x: 780, y: 700 }; e.brain = undefined; e.anchored = true;
    e.sheet.setSource('target', [mod('life', 'override', 10000), mod('energyShield', 'override', 0), mod('blockChance', 'override', 0)]);
    e.fillResources(); w.actors.push(e); return e;
  };
  const e = victim();
  const api = w as unknown as { resolveHit(a: Actor, s: SkillInstance, b: Actor, mult?: number, depth?: number): void;
    updateOrbs(dt: number): void; updateAuras(dt: number): void };
  const skill = (id: string) => makeSkillInstance({ ...SKILLS[id], requirements: undefined, useTime: 0 });
  return { w, p, e, api, skill, victim };
}
const all = Object.values(SKILLS);
const siphons = all.filter(s => s.siphon);
const orbSkills = all.filter(s => s.effects.some(f => f.type === 'siphonOrb'));
const auraSkills = all.filter(s => s.delivery.type === 'aura' && s.delivery.aura.siphonFraction);
for (const def of siphons) {
  const { p, e, api, skill } = rig(); p.life = 400;
  api.resolveHit(p, skill(def.id), e);
  check(def.id + ': real native hit records victim-to-caster recovery', p.life > 400 && p.resourceFlows.some(f => f.source === e.id && f.resource === 'life'));
  p.fillResources(); p.resourceFlows = []; p.restoreGains = []; api.resolveHit(p, skill(def.id), e);
  check(def.id + ': full life stays quiet', !p.resourceFlows.length && !p.restoreGains.length);
}
for (const def of orbSkills) {
  const { w, p, e, api, skill } = rig(); p.life = 400; p.mana = 400;
  api.resolveHit(p, skill(def.id), e);
  check(def.id + ': native siphon still sheds a traveling pickup', w.orbs.length === 1 && w.orbs[0].homeTo === p);
  check(def.id + ': airborne story follows its struck body', w.orbs[0].flowFromTier === e.tier);
  check(def.id + ': flight does not predict a payout', p.life === 400 && p.mana === 400 && !p.restoreGains.length);
  const orb = w.orbs[0], resource = ORB_DEFS[orb.kind].restore!;
  api.updateOrbs(0.01); check(def.id + ': travel retains its delay', w.orbs.length === 1 && p[resource] === 400);
  orb.pos = { ...p.pos }; api.updateOrbs(0.01);
  check(def.id + ': one arrival, one payout, matching gain cue', !w.orbs.length && p[resource] === 400 + orb.amount
    && p.gainEvents.filter(g => g.kind === 'orb').length === 1 && p.restoreGains.some(g => g.resource === resource));
}
for (const def of auraSkills) {
  const { w, p, e, api, skill } = rig(); p.life = 400; const inst = skill(def.id); p.skills = [inst];
  assert(w.useSkill(p, inst, p.pos)); api.updateAuras(0.1);
  check(def.id + ': real aura tick pulls from its damaged victim', p.life > 400 && p.resourceFlows.some(f => f.source === e.id));
}
{
  const { w, p, e } = rig(); p.life = 400;
  e.applyStatus('bleed', 5, 3, 'probe'); const s = e.statuses.find(s => s.id === 'bleed')!;
  s.casterId = p.id; s.leechAcc = 7; w.update(0.01);
  check('banked status leech uses the same measured blood return', p.life >= 407 && p.resourceFlows.some(f => f.source === e.id));
}
{
  const { p, e } = rig(); p.life = 400; p.mana = 400; p.es = 0;
  p.sheet.setSource('leech', [mod('lifeLeech', 'override', 0.5), mod('manaLeech', 'override', 0.5), mod('esLeech', 'override', 0.5)]);
  const hit = () => applyHit(p, e, { amounts: { chaos: 40 }, tags: new Set(['spell', 'chaos']), crit: false, sourceName: 'probe' });
  hit(); check('damage pipeline records life, mana and shield from actual capped gains', new Set(p.resourceFlows.map(f => f.resource)).size === 3);
  tickRestoreGains(p, 0.1); const age = p.resourceFlows[0].age; hit();
  check('continuous leech coalesces without restarting its animation', p.resourceFlows.length === 3 && p.resourceFlows[0].age === age);
  p.fillResources(); p.restoreGains = []; p.resourceFlows = []; hit();
  check('full resource pools produce no false flow', !p.resourceFlows.length && !p.restoreGains.length);
  p.life = 400; p.sheet.setSource('blocked', [mod('healTaken', 'override', 0)]); hit();
  check('blocked healing stays quiet', !p.resourceFlows.length);
}
{
  const { w, p, e, victim, api } = rig();
  for (let i = 0; i < 40; i++) noteResourceFlow(p, victim(), 'life', 10);
  check('crowd recovery has a hard per-actor bound', p.resourceFlows.length === RESOURCE_FLOW.rows);
  p.resourceFlows = []; noteResourceFlow(p, e, 'life', 10);
  w.shedOrb('life', e.pos, { homeTo: p, amount: 9, clamp: false, tier: 1, flowFromTier: 2 });
  const snap = serializeSnapshot(w, 1), client = rig().w; applySnapshot(client, snap);
  check('co-op mirrors flow endpoints and homing direction without live actor ownership', feedingCueState(client.player).flows?.length === 1
    && client.orbs[0].flowTo?.x === p.pos.x && client.orbs[0].homeTo === undefined && client.orbs[0].tier === 1 && client.orbs[0].flowFromTier === 2);
  snap.actors.find(a => a.id === p.id)!.feedingCues!.flows![0].from.x = -10;
  snap.orbs[0].flowTo![0] = -10;
  check('snapshot endpoints are deeply copied', p.resourceFlows[0].from.x === e.pos.x && feedingCueState(client.player).flows![0].from.x === e.pos.x && client.orbs[0].flowTo!.x === p.pos.x);
  const old = serializeSnapshot(w, 2); for (const a of old.actors) delete a.feedingCues;
  for (const o of old.orbs) { delete o.flowTo; delete o.flowTier; }
  applySnapshot(client, old);
  check('old-host packets clear presentation safely', !feedingCueState(client.player).flows?.length && !client.orbs[0].flowTo);
  p.dead = true; api.updateOrbs(0.01); tickRestoreGains(p, 0.01);
  check('owner death drops a real pickup and stops recovery traces', !w.orbs[0].homeTo && !p.resourceFlows.length && !serializeSnapshot(w, 3).orbs[0].flowTo);
  p.dead = false; noteResourceFlow(p, e, 'life', 10); w.loadZone(w.zone.id);
  check('zone transit clears transfer endpoints', !p.resourceFlows.length);
}
{
  const { p, e } = rig(); const restore = seedGlobalRandom(71); const first = Math.random();
  noteResourceFlow(p, e, 'life', 10); const after = Math.random(); restore();
  const reset = seedGlobalRandom(71); assert.equal(Math.random(), first); assert.equal(Math.random(), after); reset();
  check('presentation spends no combat randomness', true);
  p.resourceFlows = []; noteResourceFlow(p, e, 'life', 10, false); check('explicit cue opt-out stays silent', !p.resourceFlows.length);
  noteResourceFlow(p, e, 'life', 10); tickRestoreGains(p, 1);
  check('finished drain has no lingering tether', !p.resourceFlows.length);
}
function trace(material: ResourceMaterial, color: string, pickup = false) {
  let depth = 0; const paths: unknown[] = [];
  const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
    get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
      assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)));
      if (k === 'save') depth++; if (k === 'restore') depth--;
      paths.push([k, ...args]);
    }, set: (o, k, v) => { o[String(k)] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  if (pickup) drawResourcePickup(ctx, { pos: { x: 40, y: 40 }, bob: 0.5, life: 5, material, color, size: 5 });
  else if (material !== 'flame') drawResourceFlow(ctx, { from: { x: 10, y: 10 }, to: { x: 150, y: 50 }, fromTier: 0, toTier: 0,
    source: 0, resource: material, color, age: 0.2, left: 0.4, strength: 1 });
  assert.equal(depth, 0); return JSON.stringify(paths);
}
for (const kind of Object.keys(RESOURCE_VISUALS) as ResourceMaterial[]) {
  check(kind + ': palette-independent finite geometry and balanced canvas state', trace(kind, '#f00', true) === trace(kind, '#999', true));
}
check('all four pickup families differ in one shared color', new Set(['life', 'mana', 'es', 'flame'].map(k => trace(k as ResourceMaterial, '#bbb', true))).size === 4);
check('blood, mana and shield returns have distinct silhouettes', new Set(['life', 'mana', 'es'].map(k => trace(k as ResourceMaterial, '#bbb'))).size === 3);
const deliveryCounts: Record<string, number> = {};
for (const s of all) deliveryCounts[s.delivery.type] = (deliveryCounts[s.delivery.type] ?? 0) + 1;
mkdirSync('balance/reports/skill-visuals', { recursive: true });
writeFileSync('balance/reports/skill-visuals/resource-audit.json', JSON.stringify({ deliveryCounts,
  siphons: siphons.map(s => s.id), homing: orbSkills.map(s => s.id), auras: auraSkills.map(s => s.id), pickups: Object.keys(ORB_DEFS), checks }, null, 2));
console.log(`PASS ${checks} resource visual checks`);
