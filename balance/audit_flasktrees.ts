/** Seeded flask-only combat: no seeded charge bank, no manual charge refills,
 * real cooldowns, and a fixed 12-physical-damage incoming hit every 2 seconds.
 * The pressure source has no drops; target packs likewise yield no kill fuel. */
import { makeSimWorld } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { seedGlobalRandom } from '../src/sim/rng';
import { writeFileSync, mkdirSync } from 'node:fs';
const roots: Record<string, string[]> = {
  life_flask: ['red_bloom', 'red_bloodguard', 'red_reclaim'],
  mana_flask: ['blue_lance', 'blue_shock', 'blue_feedback'],
  catalyst_flask: ['gold_retort', 'gold_battery', 'gold_slag'],
  quicksilver_flask: ['silver_wake', 'silver_tracks', 'silver_lap'],
  stoneskin_flask: ['stone_fault', 'stone_pressure', 'stone_anchor'],
  antidote_flask: ['green_garden', 'green_prune', 'green_antigen'],
};
const rows: unknown[] = [];
let failed = 0;
for (const [id, nodes] of Object.entries(roots)) for (const count of [1, 4]) {
  const unseed = seedGlobalRandom(0xc011ec7);
  const w = makeSimWorld('warrior', 0xc011ec7), p = w.player;
  p.skills.fill(null); w.meta.knownSkills.clear();
  function seat(sid: string, picks: string[], slot: number) {
    const inst = makeSkillInstance(SKILLS[sid], 15, 3);
    w.meta.knownSkills.set(sid, inst); p.skills[slot] = inst;
    // Level 15 funds these three purchases; no points are borrowed.
    for (const pick of picks) w.pickTreeNode(sid, pick);
    return inst;
  }
  const main = seat(id, nodes, 0);
  const support = id === 'life_flask' ? undefined : seat('life_flask', ['red_cellar', 'red_overflow', 'red_ferment'], 1);
  p.sheet.setSource('audit', [mod('critChance', 'override', 0), mod('lifeRegen', 'override', 0), mod('manaRegen', 'override', 0)]);
  p.fillResources(); p.charges.clear();
  const foes = Array.from({ length: count }, (_, i) => {
    const a = w.createMonster('plains_wolf', 10, 'enemy'); a.skills = [];
    a.pos = { x: p.pos.x + 55 + 15 * i, y: p.pos.y }; a.tier = p.tier;
    a.sheet.setSource('dummy', [mod('life', 'flat', 100000), mod('moveSpeed', 'override', 0), mod('lifeRegen', 'override', 0), mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
    a.fillResources(); w.actors.push(a); return a;
  });
  const pressure = makeSkillInstance({ id: 'flask_audit_pressure', name: 'Measured Pressure', description: 'Fixed incoming pressure.', color: '#aaa', tags: ['attack', 'physical'], manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [12, 12] }, delivery: { type: 'self' }, effects: [{ type: 'damage' }], leveling: { perLevel: [] } }, 1);
  foes[0].sheet.setSource('pressure', [mod('accuracy', 'flat', 100000), mod('critChance', 'override', 0)]);
  const lives = foes.map(a => a.life), times: number[] = []; let supportDrinks = 0, minLife = p.life;
  const origin = { ...p.pos };
  for (let frame = 0; frame < 60 * 60 && !p.dead; frame++) {
    const time = frame / 60;
    // Quicksilver's movement build circles within reach of its own wake.
    if (id === 'quicksilver_flask') {
      const goal = { x: origin.x + Math.cos(time * 2) * 55, y: origin.y + Math.sin(time * 2) * 55 };
      w.moveActor(p, goal.x - p.pos.x, goal.y - p.pos.y, 1 / 60);
    }
    if (w.useSkill(p, main, foes[0].pos)) times.push(time);
    if (support && p.life < p.maxLife() * 0.8 && w.useSkill(p, support, p.pos)) supportDrinks++;
    if (frame > 0 && frame % 120 === 0) (w as any).resolveHit(foes[0], pressure, p);
    w.update(1 / 60); minLife = Math.min(minLife, p.life);
  }
  const damage = foes.reduce((sum, a, i) => sum + lives[i] - a.life, 0);
  const row = { id, targets: count, firstDrink: times[0], drinks: times.length, supportDrinks, damage: +damage.toFixed(2), dps: +(damage / 60).toFixed(2), minLife: +minLife.toFixed(2), finalLife: +p.life.toFixed(2), maxLife: p.maxLife(), dead: p.dead, charges: Object.fromEntries(p.charges), orbs: w.orbs.length };
  rows.push(row); console.log(JSON.stringify(row));
  if (p.dead || !(damage > 100) || times.length < 5) failed++;
  unseed();
}
mkdirSync('balance/reports', { recursive: true });
writeFileSync('balance/reports/flask-combat.json', JSON.stringify(rows, null, 2));
console.log(`FLASK COMBAT ${failed ? 'FAIL' : 'PASS'} (${failed} failed routes)`);
process.exitCode = failed ? 1 : 0;
