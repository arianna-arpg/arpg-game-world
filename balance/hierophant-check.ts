import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PROCESSION as spec, carriedFieldStat } from '../src/data/carriedFields';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { PROCS } from '../src/data/procs';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import type { World } from '../src/engine/world';
import { rebuildSavedMeta, serializeCharacter } from '../src/meta/character';
import { serializeSnapshot } from '../src/net/snapshot';

const restore = seedGlobalRandom(412830);
const prefix = 'voc_hierophant_';
const close = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
function rig() {
  const w = makeSimWorld('cleric', 412830), p = w.player;
  p.pos = { x: 700, y: 700 }; w.actors = [p]; w.walk = null; w.doodads = []; w.markDoodadsChanged();
  assert(w.grantVocation('hierophant')); w.meta.vocationPoints = 20;
  const take = (id: string) => assert(w.allocateNode(prefix + id));
  const field = () => { const z = w.zones.find(z => z.caster === p && z.carriedFieldBeats); assert(z); return z; };
  const crew = () => w.actors.filter(a => !a.dead && a.owner === p && a.defId === spec.escort.skill);
  const art = (id: string) => { const s = w.meta.knownSkills.get(id); assert(s, id); return s; };
  const drop = (id: string) => {
    w.fonts.push({ pos: { ...p.pos }, tier: p.tier }); assert(w.refundPassiveNode(prefix + id));
  };
  return { w, p, take, drop, field, crew, art };
}
function body(w: World, x: number, team: 'player' | 'enemy') {
  const a = w.createMonster('zombie', 1, team);
  a.pos = { x: w.player.pos.x + x, y: w.player.pos.y }; a.tier = w.player.tier;
  a.skills = []; a.brain = undefined;
  a.sheet.setSource('probe', [mod('life', 'flat', 2000), mod('lifeRegen', 'override', 0),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('energyShield', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
}
function step(w: World, secs: number) { for (let i = 0; i < Math.ceil(secs * 60); i++) w.update(1 / 60); }
function paid(w: World, inst: SkillInstance, at: { x: number; y: number }) {
  w.player.casting = null; w.player.useLock = 0; w.player.cooldowns.clear(); w.player.fillResources();
  assert(w.useSkill(w.player, inst, at, true));
  for (let i = 0; i < 160 && w.player.casting; i++) step(w, 1 / 60);
}
let tests = 0;
function check(name: string, fn: () => void) { fn(); tests++; console.log('PASS ' + name); }
try {
  check('placed and carried fields resolve separately, with two extra beats and an unchanged natural clock', () => {
    const { w, p, take, field, art } = rig();
    assert(!w.allocateNode(prefix + 's2')); assert(!w.allocateNode(prefix + 's3'));
    take('s1');
    const z = field(), ally = body(w, 12, 'player'), foe = body(w, 55, 'enemy');
    p.sheet.setSource('fixed', [mod('critChance', 'override', 0), mod('accuracy', 'override', 1e6)]);
    const at = { x: p.pos.x + 255, y: p.pos.y }, life = ally.maxLife() / 2;
    ally.life = life; z.tickTimer = 10;
    paid(w, art('consecration'), at);
    const floor = w.zones.find(x => x.inst.def.id === spec.skill && !x.carriedFieldBeats)!;
    assert(floor && floor !== z && Math.abs(floor.pos.x - at.x) < 2);
    const before = foe.life; step(w, 0.35);
    const pulseHeal = (1.5 + 0.004 * ally.maxLife()) * p.sheet.get('healPower') * spec.pulsePower;
    close(ally.life - life, 2 * pulseHeal);
    assert(foe.life < before && z.tickTimer > 8);
    p.pos.x -= 70; step(w, 0.05);
    close(z.pos.x, p.pos.x); close(floor.pos.x, at.x);
    assert(serializeSnapshot(w, 1).skillFields?.some(f => f.skillId === spec.skill && f.radius === z.radius));
    const oldLife = ally.life; z.tickTimer = 0; step(w, 0.02);
    close(ally.life - oldLife, pulseHeal);
  });
  check('an actual Sanctified Strike mend answers once for several allies, while misses, full life and repeats earn nothing', () => {
    const { w, p, take, field, crew, art } = rig(); take('s1'); take('s3');
    const a = body(w, 28, 'player'), b = body(w, 38, 'player'), strike = art('sanctified_strike');
    const z = field(); z.tickTimer = 50;
    assert.equal(crew().length, 1);
    assert(w.executeSkill(p, strike, a.pos)); assert.equal(z.carriedFieldBeats!.length, 0);
    a.life /= 2; b.life /= 2;
    assert(w.executeSkill(p, strike, a.pos, { noRepeat: true, noCooldown: true }));
    assert.equal(crew().length, 1);
    assert(w.executeSkill(p, strike, a.pos));
    assert(a.life > a.maxLife() / 2 && b.life > b.maxLife() / 2);
    assert.equal(z.carriedFieldBeats!.length, 2); assert.equal(crew().length, 2);
    assert(w.executeSkill(p, strike, { x: p.pos.x - 100, y: p.pos.y }));
    assert.equal(crew().length, 2);
  });
  check('Radiant Reprisal can supply the qualifying heal after contact and shares the swing’s one answer', () => {
    const { w, p, take, field, crew, art } = rig(); take('s1'); take('s3'); take('n2');
    const target = body(w, 45, 'enemy'), ally = body(w, 120, 'player');
    const z = field(); z.tickTimer = 100; ally.life /= 2;
    p.sheet.setSource('probe', [mod('accuracy', 'override', 1e6)]);
    const random = Math.random; Math.random = () => 0.1;
    try {
      assert(w.executeSkill(p, art('sanctified_strike'), target.pos));
      assert.equal(crew().length, 1); step(w, 0.6);
      assert(ally.life > ally.maxLife() / 2); assert.equal(crew().length, 2);
      ally.pos = { ...target.pos }; ally.life /= 2;
      assert(w.executeSkill(p, art('sanctified_strike'), target.pos)); assert.equal(crew().length, 3);
      step(w, 0.6); assert.equal(crew().length, 3);
    } finally { Math.random = random; }
  });
  check('a traveling Sanctified Strike and healing over time retain one receipt per real use', () => {
    const { w, p, take, field, art } = rig(); take('s1');
    const strike = art('sanctified_strike'), z = field();
    strike.level = 20; w.pickTreeNode('sanctified_strike', 'pilgrim_arc');
    assert(strike.treeNodes?.includes('pilgrim_arc'));
    const a = body(w, 120, 'player'), b = body(w, 155, 'player');
    a.life /= 2; b.life /= 2; z.tickTimer = 100;
    strike.sockets[0] = { def: SUPPORTS.mending_echoes, level: 1 };
    assert(w.executeSkill(p, strike, b.pos)); assert.equal(z.carriedFieldBeats!.length, 0);
    let beats = 0; const seen = new Set<object>();
    for (let i = 0; i < 450; i++) {
      w.update(1 / 60);
      for (const f of w.flashes) if (f.color === z.color && f.edgeFrac === 0.9 && f.radius === z.radius && !seen.has(f)) {
        seen.add(f); beats++;
      }
    }
    assert(a.life > a.maxLife() / 2 && b.life > b.maxLife() / 2);
    assert.equal(beats, 2);
  });
  check('radius and retinue coexist, cap independently, travel with their owner and retire cleanly', () => {
    const { w, p, take, drop, field, crew, art } = rig(); take('s1'); take('s2'); take('s3');
    const z = field(), radius = z.radius, cast = () => assert(w.executeSkill(p, art('consecration'), p.pos));
    for (let i = 0; i < 6; i++) { cast(); w.time++; }
    close(z.radius, radius * (1 + spec.growth.perStack * spec.growth.max));
    assert.equal(crew().length, 1 + spec.escort.maxGuests);
    const permanent = crew().find(a => a.lifespan <= 0)!; assert(permanent);
    p.pos.x += 480; p.tier++; w.carriedFields.contain();
    for (const a of crew()) {
      assert.equal(a.tier, p.tier); assert(Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y) + a.radius <= z.radius + 1e-6);
    }
    w.time += spec.growth.duration - 2.5; w.carriedFields.update();
    close(z.radius, radius * (1 + 2 * spec.growth.perStack));
    w.time += 3; w.carriedFields.update(); close(z.radius, radius);
    w.kill(permanent, false); w.carriedFields.update(); assert.equal(crew().length, spec.escort.maxGuests);
    const longest = Math.max(...crew().map(a => a.lifespan));
    assert(longest >= spec.escort.duration && longest < 2 * spec.escort.duration, `unexpected lifespan ${longest}`);
    step(w, longest + 0.5);
    assert.equal(crew().length, 1); assert(crew()[0] !== permanent && crew()[0].lifespan <= 0);
    drop('s3'); assert.equal(crew().length, 0); drop('s2'); drop('s1');
    assert(!w.zones.some(z => z.carriedFieldBeats)); assert.equal(w.meta.vocationPoints, 20);
  });
  check('Sacred Bulwark answers a blocked blow with a local nova and respects its cooldown', () => {
    const { w, p, take } = rig(), life = p.maxLife(); take('n1'); close(p.maxLife(), life);
    const striker = body(w, 45, 'enemy'), distant = body(w, 240, 'enemy');
    p.sheet.setSource('block rig', [mod('blockChance', 'override', 1), mod('evasion', 'override', 0)]);
    striker.sheet.setSource('sure aim', [mod('accuracy', 'override', 1e6)]);
    const attack = makeSkillInstance(SKILLS.heavy_strike), before = striker.life;
    const random = Math.random; Math.random = () => 0.05;
    try {
      w['resolveHit'](striker, attack, p, 1, 0);
      assert(striker.life < before); close(distant.life, distant.maxLife());
      const after = striker.life;
      w['resolveHit'](striker, attack, p, 1, 0);
      close(striker.life, after);
    } finally { Math.random = random; }
  });
  check('spell blessing, attack Weaken, actual recovery and fire each use their own recipient and trigger', () => {
    const { w, p, take, art } = rig(); take('n4');
    const a = body(w, 20, 'player'), b = body(w, 40, 'player'), upstairs = body(w, 5, 'player'); upstairs.tier++;
    const target = body(w, 70, 'enemy'), nearer = body(w, 32, 'enemy');
    const fixed = Math.random; Math.random = () => 0.01;
    try {
      const spell = art('consecration'), attack = art('sanctified_strike');
      assert(w.executeSkill(p, spell, { x: p.pos.x + 250, y: p.pos.y }));
      assert(a.buffs.has('votive_zeal') && !b.buffs.has('votive_zeal') && !p.buffs.has('votive_zeal') && !upstairs.buffs.size);
      a.life /= 2; b.life /= 2; const hurt = a.life, before = nearer.life;
      const fire = () => w['executeProc'](PROCS.litany_woe, p, attack, target);
      target.applyStatus('weaken', 0, 1, 'another source');
      target.sheet.setSource('immunity', [mod('debuffImmunity', 'flat', 1)]);
      fire(); close(a.life, hurt); close(nearer.life, before);
      target.sheet.removeSource('immunity'); fire();
      assert(a.life > hurt && b.life === b.maxLife() / 2); assert(nearer.life < before);
      assert.equal(target.life, target.maxLife());
      a.fillResources(); b.fillResources(); const after = nearer.life; fire(); close(nearer.life, after);
      // Resolve a genuine physical attack through the hit/proc pipeline.
      target.statuses = []; assert(w.executeSkill(p, makeSkillInstance(SKILLS.heavy_strike), target.pos));
      assert([nearer, target].some(e => e.statuses.some(s => s.id === 'weaken' && s.casterId === p.id)));
    } finally { Math.random = fixed; }
  });
  check('non-player grants are owner-local and a zone change removes stale beats and temporary bodies', () => {
    const { w, p, take, art, crew } = rig(); take('s1'); take('s3');
    const other = body(w, 190, 'enemy'); other.sheet.setSource('gear', [
      mod(carriedFieldStat(spec.id), 'flat', 1), mod(spec.escort.stat, 'flat', 1)]);
    w.carriedFields.update();
    const stand = w.zones.find(z => z.caster === other && z.carriedFieldBeats)!; assert(stand);
    assert(w.executeSkill(p, art('consecration'), p.pos));
    assert.equal(crew().length, 2); assert.equal(stand.carriedFieldBeats!.length, 0);
    assert.equal(w.actors.filter(a => a.owner === other && !a.dead).length, 1);
    w.kill(other, true); step(w, 0.02); assert(!w.zones.includes(stand));
    assert(!w.actors.some(a => a.owner === other && !a.dead));
    const before = [...crew()], oldZone = w.zones.find(z => z.carriedFieldBeats)!;
    w.loadZone(w.zone.id); step(w, 0.04);
    assert(!w.zones.includes(oldZone) && before.every(a => !crew().includes(a)));
    assert.equal(crew().length, 1);
  });
  check('older allocations keep valid branches and recover exactly one point per detached node', () => {
    const { w, take } = rig(); take('n4');
    const save = serializeCharacter(w);
    save.allocated.push(prefix + 's2', prefix + 's3', prefix + 'n3');
    const built = rebuildSavedMeta(save)!.meta;
    assert(built.allocated.has(prefix + 'n4')); assert(!built.allocated.has(prefix + 's2'));
    assert(!built.allocated.has(prefix + 'n3')); assert.equal(built.vocationPoints, save.vocationPoints! + 3);
    save.allocated.push(prefix + 's1');
    const connected = rebuildSavedMeta(save)!.meta;
    assert(connected.allocated.has(prefix + 'n3')); assert.equal(connected.vocationPoints, save.vocationPoints);
  });
  console.log(`Hierophant: ${tests} scenarios passed`);
} finally { restore(); }
