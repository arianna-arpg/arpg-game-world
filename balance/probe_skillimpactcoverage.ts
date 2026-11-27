import assert from 'node:assert/strict';
import { PROCS, type ProcDef } from '../src/data/procs';
import { procImpactVoice, mechanicBurst } from '../src/data/mechanicVisuals';
import { SKILLS } from '../src/data/skills';
import { fieldProfile, skillFieldImpactVoice } from '../src/data/skillAreaVisuals';
import { skillSelfVoice } from '../src/data/skillSelfVisuals';
import { makeSkillInstance, type SkillDef, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { makeSimWorld } from '../src/sim/arena';
import { arena, prepareSkill } from './skillVisualFixture';
import { runAIActions } from '../src/engine/aiActions';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import '../src/render/renderer'; // Same painter registrations as a booted client.
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { flightProfile } from '../src/render/vis/skillFlightVoice';

const all = Object.values(SKILLS);
type Sim = ReturnType<typeof makeSimWorld>;
type Flash = Sim['flashes'][number];
type Actor = Sim['player'];
interface Clocks {
  executeProc(proc: ProcDef, caster: Actor, skill: SkillInstance, target: Actor): void;
  updatePendingBursts(): void;
  updateCasting(actor: Actor, dt: number): void;
  updateDetonations(dt: number): void;
  updateRepeats(dt: number): void;
  updateProjectiles(dt: number): void;
  updateLeaps(dt: number): void;
  updateZones(dt: number): void;
  updateAuras(dt: number): void;
  updateConstructs(dt: number): void;
}
const clocks = (w: Sim) => w as unknown as Clocks;

function hasPainter(f: Flash) {
  return f.fx ? !!effectVoiceOf(f.fx) : !!(f.bolt || f.meteor || f.lightning || f.companionCue ||
    f.feedingCue || f.movement || f.cosmeticMotif || f.beam || f.mechanicLink || f.haze);
}
const observed = { flashes: 0, fields: 0, flights: 0 };
function course(def: SkillDef) {
  const { w, p, target, inst, d } = prepareSkill(def);
  const startBodies = w.actors.length, collected: Flash[] = [];
  const appendFlash = w.flashes.push.bind(w.flashes);
  w.flashes.push = (...rows) => {
    for (const flash of rows) {
      assert(hasPainter(flash), def.id + ' emitted an unresolved flash ' + (flash.fx ?? '(generic)'));
      collected.push(flash); observed.flashes++;
    }
    return appendFlash(...rows);
  };
  const appendZone = w.zones.push.bind(w.zones);
  w.zones.push = (...rows) => {
    for (const z of rows) {
      const id = z.skillVisualId ?? z.inst.def.id;
      assert(fieldProfile(id), def.id + ' left an unpainted field from ' + id);
      if (z.fx) assert(effectVoiceOf(z.fx), def.id + ' placed an unknown impact ' + z.fx);
      observed.fields++;
    }
    return appendZone(...rows);
  };
  const appendShot = w.projectiles.push.bind(w.projectiles);
  w.projectiles.push = (...rows) => {
    for (const shot of rows) {
      assert(flightProfile(shot) || shot.orbPaint, def.id + ' emitted an unpainted projectile');
      observed.flights++;
    }
    return appendShot(...rows);
  };
  const presses = d.type === 'projectile' && d.caroms ? d.caroms.anchors + Number(!!d.caroms.hang) : 1;
  for (let i = 0; i < presses; i++) assert(w.executeSkill(p, inst, { x: target.pos.x + i * 18, y: target.pos.y }), def.id);
  const visible = w.zones.length || w.projectiles.length || w.actors.length !== startBodies ||
    p.activeAuras.size || w.tethers.length || p.leap || p.dash;
  const api = clocks(w);
  for (let i = 0; i < 40; i++) {
    w.time += .1;
    api.updateDetonations(.1); api.updateRepeats(.1); api.updateProjectiles(.1);
    api.updateLeaps(.1); api.updateZones(.1); api.updateAuras(.1); api.updateConstructs(.1);
  }
  assert(visible || collected.length, def.id + ' completed without visible feedback');
  if (process.argv.includes('--list'))
    console.log(def.id, d.type, [...new Set(collected.map(f => f.fx ?? 'native geometry'))].join(', '));
}

for (const def of all) {
  // A scripted placement may carry any payload, including a projectile or beam.
  assert(effectVoiceOf(skillFieldImpactVoice(def.id)!), def.id);
  course(def);
}
assert.equal(Object.keys(SKILLS).length, all.length, 'Boot-time registration changed during the sweep');
console.log('PASS real releases for', all.length, 'skills across', new Set(all.map(s => s.delivery.type)).size,
  'deliveries and', new Set(all.flatMap(s => s.effects.map(e => e.type))).size, 'payload families', observed);

// Trigger independently granted effects through their combat executor. Recovery,
// statuses and buffs have their own HUD/body surfaces; only an actual impact
// must produce a world-space impact. A chain needs a second enemy to jump to.
let procImpacts = 0;
for (const proc of Object.values(PROCS)) {
  const { w, p, enemy } = arena(), inst = makeSkillInstance(SKILLS.cleave);
  const next = w.createMonster('zombie', 1, 'enemy');
  next.pos = { x: enemy.pos.x + 12, y: enemy.pos.y }; next.brain = undefined; next.spawnedAt = -100;
  w.actors.push(next); p.life -= 200; p.mana -= 100; p.skills = [inst];
  clocks(w).executeProc(proc, p, inst, enemy);
  if (proc.effect.type === 'delayedBurst') {
    w.flashes = []; w.time += proc.effect.delay + .01; clocks(w).updatePendingBursts();
  }
  if (['extraHit','explosion','arc','collisionDamage','displace','burst','delayedBurst'].includes(proc.effect.type)) {
    assert(w.flashes.some(f => f.fx === procImpactVoice(proc)), proc.id + ' lost its own impact');
    procImpacts++;
  }
  assert(w.flashes.every(hasPainter), proc.id + ' emitted a generic flash');
}
console.log('PASS', Object.keys(PROCS).length, 'triggered effects, including', procImpacts, 'independent impact effects');

// The disappearing-zone case: only the actual impact can still be seen next frame.
// Hold the native channel through full ramp, then compare the host and a co-op seat.
{
  const { w, p, enemy } = arena(), inst = makeSkillInstance({ ...SKILLS.frost_storm, requirements: undefined });
  p.skills = [inst]; p.aimPos = { ...enemy.pos };
  assert(w.useSkill(p, inst, p.aimPos, true)); assert(p.casting);
  const api = clocks(w), pulses: Flash[] = [];
  for (let tick = 0; tick < 360; tick++) {
    w.flashes = []; w.time += 1 / 60;
    assert(p.casting); p.casting.held = true;
    api.updateCasting(p, 1 / 60); api.updateZones(1 / 60);
    pulses.push(...w.flashes.filter(f => f.fx === skillFieldImpactVoice(inst.def.id)));
  }
  assert(pulses.length >= 10); assert(pulses[0].fieldImpact!.strength! < .2);
  assert.equal(pulses.at(-1)!.fieldImpact!.strength, 1);
  assert(pulses.every((f, i) => !i || f.fieldImpact!.strength! >= pulses[i - 1].fieldImpact!.strength!));
  assert(pulses.every(f => f.pos.x === enemy.pos.x && f.pos.y === enemy.pos.y));
  assert.equal(w.zones.length, 0);
  p.casting.held = false; w.flashes = []; api.updateCasting(p, .1); api.updateZones(.1);
  assert(!w.flashes.some(f => f.fx === skillFieldImpactVoice(inst.def.id)));
  w.flashes = [pulses.at(-1)!];
  const peer = arena().w, snapshot = serializeSnapshot(w, 1);
  applySnapshot(peer, snapshot);
  assert.equal(peer.flashes[0].fx, w.flashes[0].fx);
  assert.deepEqual(peer.flashes[0].fieldImpact, w.flashes[0].fieldImpact);
  delete snapshot.flashes[0].fieldImpact; applySnapshot(peer, snapshot);
  assert.equal(peer.flashes[0].fieldImpact, undefined);
  console.log('PASS Frost Storm locked aim, paid pulses, full ramp, release and peer playback');
}

// Native area ownership survives an immediate hit, a delayed repeat, and a custom override.
{
  const { w, p, enemy } = arena(), def = SKILLS.earthquake;
  assert(def.delivery.type === 'ground');
  for (const fx of [undefined, 'shatter']) {
    const inst = makeSkillInstance({ ...def, delivery: { ...def.delivery, fx, delay: .3,
      pulse: { count: 1, delay: .4, radiusMult: 1.25 } } });
    w.zones = []; w.flashes = []; w.executeSkill(p, inst, enemy.pos);
    const z = w.zones[0], expected = fx ?? skillFieldImpactVoice(def.id);
    assert(z && z.pulse);
    const api = clocks(w);
    api.updateZones(.1); assert(!w.flashes.some(f => f.fx === expected));
    api.updateZones(.21); assert(w.flashes.some(f => f.fx === expected && f.radius === z.radius));
    w.time += .41; w.flashes = []; api.updateZones(.01);
    assert(w.flashes.some(f => f.fx === expected && f.radius === z.radius * 1.25));
  }
}
// AI choreography can use a projectile as a stationary blast. A support's
// actual secondary hit keeps its own art, even when both use the same weapon.
{
  const { w, p, enemy } = arena();
  runAIActions(w, enemy, [{ do: 'attackPattern', skill: 'magma_glob', at: 'self',
    pattern: { radius: 45, delay: .2, points: [{ x: 0, y: 0 }, { x: 70, y: 0 }, { x: 0, y: 70 }] } }], p);
  assert.equal(w.zones.length, 3);
  clocks(w).updateZones(.21);
  assert.equal(w.flashes.filter(f => f.fx === skillFieldImpactVoice('magma_glob')).length, 3);
  runAIActions(w, enemy, [{ do: 'ring', skill: 'magma_glob', radius: 45, count: 3, delay: .2, at: 'self' }], p);
  clocks(w).updateZones(.21);
  assert.equal(w.flashes.filter(f => f.meteor && !f.fx).length, 3, 'scripted meteor volleys retain the falling strike');
  const inst = makeSkillInstance(SKILLS.frost_storm), api = clocks(w);
  w.flashes = []; w.executeSkill(p, inst, enemy.pos); api.updateZones(.01);
  assert(!w.zones.length && !w.flashes.some(f => f.fx === mechanicBurst('scatteredAftershock')));
  p.sheet.setSource('scatter', [mod('aoeScatter', 'flat', 1)]);
  w.flashes = []; w.executeSkill(p, inst, enemy.pos); api.updateZones(.01);
  assert(w.flashes.some(f => f.fx === skillFieldImpactVoice('frost_storm')));
  assert(!w.flashes.some(f => f.fx === mechanicBurst('scatteredAftershock')));
  api.updateZones(.31);
  assert(w.flashes.some(f => f.fx === mechanicBurst('scatteredAftershock')));
}
assert.equal(skillFieldImpactVoice('constructor'), undefined);
{
  const {w,p,enemy}=arena(), def=SKILLS.skeletal_bombardment;
  assert(def.delivery.type==='storm');
  for (const spread of [0,96]) {
    w.flashes=[]; w.zones=[];
    w.executeSkill(p,makeSkillInstance({...def,delivery:{...def.delivery,areaRadius:spread}}),enemy.pos);
    assert(w.zones.some(z=>z.radius>0 && z.delay>0),'Mortar lost its landing warning');
    assert.equal(w.flashes.some(f=>f.fx==='world:storm_physical'),spread>0,'Scatter warning requires a scatter area');
  }
}
assert.equal(effectVoiceOf('constructor'), undefined);
assert(effectVoiceOf(skillSelfVoice('convocation', 'recall')!));
console.log('PASS delayed impacts and repeat footprints retain source and override');
