import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { makeSimWorld } from '../src/sim/arena';

const seed = 78211;
export function arena() {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  w.walk = null; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
  p.pos = { x: 700, y: 700 };
  p.sheet.setSource('visual-course', [mod('mana', 'override', 100000), mod('life', 'override', 100000)]);
  p.fillResources();
  const enemy = w.createMonster('zombie', 1, 'enemy');
  enemy.pos = { x: 738, y: 700 }; enemy.brain = undefined; enemy.spawnedAt = -100;
  enemy.sheet.setSource('visual-course', [mod('life', 'override', 100000)]); enemy.fillResources();
  const ally = w.createMonster('skeleton_warrior', 1, 'player', p);
  ally.pos = { x: 734, y: 700 }; ally.brain = undefined; ally.life /= 2;
  w.actors.push(enemy, ally);
  w.corpses = [{ pos: { ...enemy.pos }, maxLife: 100, tier: 0, defId: 'zombie', remaining: 60, level: 1 }];
  w.zones = []; w.projectiles = []; w.flashes = [];
  return { w, p, enemy, ally };
}

export function prepareSkill(def: SkillDef) {
  const { w, p, enemy, ally } = arena(), inst = makeSkillInstance(def), d = def.delivery;
  const target = def.targeting?.target === 'minion' || def.targeting?.target === 'ally' ? ally : enemy;
  const needs = def.targeting?.requiresStatus;
  for (const status of typeof needs === 'string' ? [needs] : needs ?? []) target.applyStatus(status, 1, 3, 'visual-course');
  p.skills = [inst]; w.meta.knownSkills.set(def.id, inst);
  if (def.pool) p.pools.set(def.pool.id, def.pool.cap);
  if (def.invokes) p.runes = ['rime', 'rime'];
  if (d.type === 'detonate' || def.effects.some(fx => fx.type === 'shatterConstructs')) {
    w.executeSkill(p, makeSkillInstance(SKILLS[d.type === 'detonate' ? 'fire_mine' : 'flame_totem']), target.pos);
  }
  if (d.type === 'detonateProjectile') w.executeSkill(p, makeSkillInstance(SKILLS.frostbolt), target.pos);
  w.flashes.length = 0;
  return { w, p, enemy, ally, target, inst, d };
}
