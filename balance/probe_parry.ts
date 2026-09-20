import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { DEFENSE_CFG } from '../src/engine/defense';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { setSimTap } from '../src/engine/tap';

let passed = 0, failed = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  ok ? passed++ : failed++;
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const internals = (w: World) => w as unknown as {
  updateProjectiles(dt: number): void;
  tryGuardBlock(victim: Actor, attacker: Actor, threat: { x: number; y: number }, raw: number): boolean;
};
function dress(a: Actor) {
  a.sheet.setSource('parry-rig', [
    ...['lifeRegen', 'armor', 'evasion', 'blockChance', 'poise', 'insight', 'energyShield', 'endurance', 'critChance', 'addedFire', 'addedPhysical'].map(s => mod(s, 'override', 0)),
    mod('life', 'override', 10000), mod('mana', 'override', 10000),
    mod('damage', 'override', 1), mod('damageTaken', 'override', 1),
    mod('fireRes', 'override', 0), mod('accuracy', 'override', 100000),
    mod('projectileSpeed', 'override', 1), mod('projectileSize', 'override', 1),
  ]);
  a.fillResources(); a.skills = []; a.casting = null;
}
function setup() {
  const w = makeSimWorld('warrior', 0xface), p = w.player;
  w.actors = [p]; p.pos = { x: 500, y: 500 }; dress(p);
  const e = w.createMonster('zombie', 1, 'enemy'); dress(e);
  e.pos = { x: 700, y: 500 }; e.tier = p.tier; w.actors.push(e);
  return { w, p, e };
}
function guard(w: World, a: Actor, target: Actor, end = false, power = 1) {
  const inst = makeSkillInstance({ ...SKILLS.shield_up, requirements: undefined,
    manaCost: 0, cooldown: 1,
    guard: { ...SKILLS.shield_up.guard!, parry: { window: 1, counterMult: power }, endOnParry: end },
  });
  a.casting = null; a.useLock = 0; a.cooldowns.clear();
  w.useSkill(a, inst, target.pos, true);
  if (!a.casting) throw new Error('rig guard failed to raise');
  return inst;
}
function shot(explode = false): SkillInstance {
  return makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0,
    baseDamage: { fire: [40, 40] }, innateMods: [mod('critChance', 'override', 0)],
    effects: [{ type: 'damage' }],
    delivery: { type: 'projectile', speed: 200, range: 600, radius: 5,
      ...(explode ? { explode: { radius: 65, damageScale: 0.5 } } : {}) },
  });
}
function step(w: World, seconds: number, dt = 1 / 60) {
  for (let left = seconds; left > 1e-8; left -= dt) {
    const d = Math.min(dt, left); w.time += d; internals(w).updateProjectiles(d);
  }
}
function launch(w: World, caster: Actor, target: Actor, inst = shot()) {
  w.spawnProjectile(caster, inst, { ...caster.pos }, Math.atan2(target.pos.y - caster.pos.y, target.pos.x - caster.pos.x));
  return w.projectiles[w.projectiles.length - 1];
}
const restore = seedGlobalRandom(0xface);
try {
  {
    const { w, p, e } = setup(); guard(w, e, p);
    const shield = e.casting!.shield, life = p.life;
    const pack = [e];
    for (let i = 0; i < 5; i++) {
      const m = w.createMonster('zombie', 1, 'enemy'); dress(m); m.pos = { ...e.pos };
      w.actors.push(m); guard(w, m, p); pack.push(m);
    }
    for (const m of pack) internals(w).tryGuardBlock(m, p, p.pos, 40);
    check('six simultaneous parries pay exactly one counter', near(life - p.life, 40));
    check('all six parries preserve shield and life', pack.every(m => m.casting!.shield === shield && m.life === m.maxLife()));
    for (let i = 0; i < 24; i++) {
      w.time += 0.01; internals(w).tryGuardBlock(e, p, p.pos, 40);
    }
    check('machine-gun counters do not extend the window or stack', near(life - p.life, 40));
    w.time = DEFENSE_CFG.parry.damageCooldown;
    internals(w).tryGuardBlock(e, p, p.pos, 40);
    check('the exact cooldown boundary admits another wound', near(life - p.life, 80));
    p.sheet.setSource('no-parry-window', [mod('parryDamageCooldown', 'override', 0)]);
    w.time += 1;
    internals(w).tryGuardBlock(e, p, p.pos, 40); internals(w).tryGuardBlock(e, p, p.pos, 40);
    check('a per-entity zero cooldown opts out', near(life - p.life, 160));
  }
  for (const dt of [1 / 30, 1 / 60, 1 / 120]) {
    const { w, p, e } = setup(); guard(w, e, p, true);
    const flight = launch(w, p, e), color = flight.color, shape = flight.shape;
    step(w, 1, dt);
    check(`reflection at ${1 / dt} Hz keeps the same visible projectile`, w.projectiles.includes(flight) && flight.caster === e && flight.color === color && flight.shape === shape);
    check(`reflection at ${1 / dt} Hz causes no instant caster damage`, p.life === p.maxLife() && e.life === e.maxLife());
    check(`endOnParry still releases and stamps cooldown at ${1 / dt} Hz`, !e.casting && e.cooldowns.has('shield_up'));
    step(w, 1, dt);
    check(`the returned projectile really wounds its former caster at ${1 / dt} Hz`, p.life < p.maxLife() && e.life === e.maxLife());
  }
  {
    const { w, p, e } = setup(); guard(w, e, p); const flight = launch(w, p, e);
    step(w, 1); p.pos.y += 100; step(w, 3);
    check('a reflected projectile can be dodged and expires normally', p.life === p.maxLife() && !w.projectiles.includes(flight));
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    for (let i = 0; i < 8; i++) launch(w, p, e);
    step(w, 1);
    check('every projectile in a volley reflects defensively', w.projectiles.length === 8 && w.projectiles.every(f => f.caster === e));
    step(w, 1);
    check('simultaneous returned projectiles share one victim window', near(p.maxLife() - p.life, 40));
  }
  {
    const { w, p, e } = setup(); guard(w, e, p); const flight = launch(w, p, e);
    step(w, 1); guard(w, p, e, true, 2); step(w, 0.9);
    check('the player can re-parry a returned shot', flight.caster === p && flight.parryDamage?.reflections === 2 && p.life === p.maxLife());
    e.casting = null; step(w, 1);
    check('re-parry replaces counter power without compounding', near(e.maxLife() - e.life, 80));
  }
  {
    const { w, p, e } = setup(); guard(w, e, p); p.sheet.setSource('resist', [mod('fireRes', 'override', 0.5)]);
    launch(w, p, e); step(w, 2);
    check('reflected fire uses the recipient\'s fire resistance', near(p.maxLife() - p.life, 20));
  }
  {
    const { w, p, e } = setup(); guard(w, p, e);
    let credited = false;
    setSimTap({ onDeath: (victim, killer) => { if (victim === e && killer === p) credited = true; } });
    e.life = 1; launch(w, e, p); step(w, 2); setSimTap(null);
    check('monster-fired shots reflect symmetrically and credit the player kill', e.dead && credited);
  }
  {
    const { w, p, e } = setup(); guard(w, e, p); const ally = w.createMonster('zombie', 1, 'player', p);
    dress(ally); ally.pos = { x: p.pos.x, y: p.pos.y + 45 }; ally.tier = p.tier; w.actors.push(ally);
    launch(w, p, e, shot(true)); step(w, 2);
    check('reflected explosions preserve typed splash and separate recipient windows', near(p.maxLife() - p.life, 40) && near(ally.maxLife() - ally.life, 20));
  }
  {
    const { w, p, e } = setup(); guard(w, p, e);
    const other = w.createMonster('zombie', 1, 'enemy'); dress(other); other.pos = { ...e.pos };
    internals(w).tryGuardBlock(p, e, e.pos, 40);
    internals(w).tryGuardBlock(p, other, other.pos, 40);
    internals(w).tryGuardBlock(p, e, e.pos, 40);
    check('enemy recipients have independent cooldowns too', near(e.maxLife() - e.life, 40) && near(other.maxLife() - other.life, 40));
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    launch(w, p, e); step(w, 1.5);
    internals(w).tryGuardBlock(e, p, p.pos, 10); step(w, 0.3);
    check('melee retaliation and returning shots share the same window', near(p.maxLife() - p.life, 10));
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    p.sheet.setSource('shield', [mod('energyShield', 'override', 100)]); p.fillResources();
    for (let i = 0; i < 8; i++) launch(w, p, e);
    step(w, 2);
    check('a volley cannot drain shield pools while bypassing the life window', near(p.es, 60) && p.life === p.maxLife());
  }
  {
    const { w, p, e } = setup(); guard(w, e, p); e.casting!.channelTime = 2;
    const shield = e.casting!.shield!; launch(w, p, e); step(w, 1);
    check('a late ordinary guard spends shield and stops the shot without countering', e.casting!.shield! < shield && p.life === p.maxLife() && w.projectiles.length === 0);
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    p.invulnerable = true; const flight = launch(w, p, e); step(w, 1);
    check('a dead or invulnerable original caster does not disable projectile parry', flight.caster === e && e.life === e.maxLife());
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    const flight = launch(w, p, e); step(w, 1);
    flight.parryDamage!.reflections = DEFENSE_CFG.parry.maxReflections;
    guard(w, p, e); step(w, 1);
    check('the configurable rally limit dissolves safely without damage', !w.projectiles.includes(flight) && p.life === p.maxLife() && e.life === e.maxLife());
  }
  {
    const { w, p, e } = setup(); guard(w, e, p);
    const flight = launch(w, p, e); step(w, 1);
    const dome = w.createMonster('zombie', 1, 'player', p); dress(dome);
    dome.pos = { x: 560, y: 500 }; dome.tier = p.tier;
    dome.construct = { kind: 'dome', domeRadius: 50 } as NonNullable<Actor['construct']>;
    w.actors.push(dome); step(w, 1);
    check('protection domes still intercept returned projectiles', flight.dissolved === true && p.life === p.maxLife());
  }
} finally { restore(); setSimTap(null); }
console.log(`Parry: ${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
