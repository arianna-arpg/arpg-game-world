import { CLASSES } from '../src/data/classes';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { mod } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import type { World } from '../src/engine/world';

let failed = 0;
function check(name: string, ok: boolean) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
seedGlobalRandom(0x0be);
for (const c of CLASSES) {
  const w = makeSimWorld(c.id, 0x0be), p = w.player;
  check(`${c.name}: every base opener meets its starting attributes and individual resource cost`, p.skills.every(s => !s || (
    Object.entries(s.def.requirements ?? {}).every(([a, n]) => p.attributeValues![a as keyof NonNullable<typeof p.attributeValues>] >= n)
    && p.skillCost(s).mana <= p.maxMana() && p.skillCost(s).life < p.maxLife())));
}
for (const id of ['guardian', 'breaker', 'warlord', 'tamer']) {
  const w = makeSimWorld(id, 0x0be), p = w.player;
  const bar = p.skills.filter(s => s !== null);
  const cost = bar.reduce((n, s) => n + p.skillCost(s).mana, 0);
  const followup = id === 'guardian' || id === 'breaker' ? p.skillCost(bar[0]).mana : 0;
  check(`${id}: the complete opening fits one starting mana pool${followup ? ' with another primary attack in reserve' : ''}`,
    cost + followup <= p.maxMana());
}
const step = (w: World, seconds: number) => { for (let t = 0; t < seconds; t += 1 / 60) w.update(1 / 60); };
{
  const w = makeSimWorld('warlord', 0x0be), p = w.player;
  p.sheet.setSource('opening-probe', [mod('blockChance', 'override', 0), mod('evasion', 'override', 0)]);
  const e = w.createMonster('plains_wolf', 1, 'enemy');
  e.aiCooldown = 9999; e.pos = { x: p.pos.x + 60, y: p.pos.y }; w.actors.push(e);
  const standard = p.skills.find(s => s?.def.id === 'battle_standard')!;
  check('Warlord can plant the standard from the fresh opening', w.useSkill(p, standard, p.pos));
  step(w, 1.2);
  check('the planted standard grants the keeper a real retaliation source', p.sheet.get('thorns') > 0);
  const hp = e.life;
  (w as any).resolveHit(e, makeSkillInstance({ ...SKILLS.firebolt, tags: ['spell', 'physical'], baseDamage: { physical: [1, 1] } }, 1), p);
  check('a solo Warlord can hurt an attacker with its base kit', e.life < hp);
  const banner = w.actors.find(a => a.owner === p && a.construct);
  check('the standard is a destructible physical source', !!banner && !banner.invulnerable);
  if (banner) w.kill(banner, true);
  step(w, 0.7);
  check('destroying the standard removes its retaliation benefit', p.sheet.get('thorns') === 0);
}
{
  const w = makeSimWorld('guardian', 0x0be), p = w.player;
  const get = (id: string) => p.skills.find(s => s?.def.id === id)!;
  check('Guardian opens with its ward', w.useSkill(p, get('aegis_ward'), p.pos)); step(w, 0.8);
  check('the base ward grants a live shield', p.absorb > 0);
  check('Guardian can rally after warding', w.useSkill(p, get('rallying_howl'), p.pos)); step(w, 0.7);
  check('Guardian can attack after the two protective casts', w.useSkill(p, get('hammer_of_judgment'), { x: p.pos.x + 60, y: p.pos.y })); step(w, 1);
  check('the base hammer launches its visible projectile', w.projectiles.some(pr => pr.caster === p));
}
console.log(`\nClass openers: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
