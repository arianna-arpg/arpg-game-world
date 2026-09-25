import type { World } from '../engine/world';
import type { Actor } from '../engine/actor';
import { MONSTERS } from '../data/monsters';
import { RARITY_DEFS, type MonsterRarity } from '../engine/rarity';

/** Developer-only limits/placement. Rarity effects still belong to RARITY_DEFS. */
export const DEV_MONSTER_SPAWN = { minLevel: 1, maxLevel: 100, maxCount: 25, distance: [150, 230], attempts: 24, gap: 8 };
export interface DevMonsterSpawn {
  id: string;
  level: number;
  rarity: MonsterRarity;
  count: number;
}

/** Both the roster spawner and Entity Forge use the normal mint and promotion
 * pipeline. Promote before placement so the final body size fits its floor. */
export function spawnDevMonsters(w: World, options: DevMonsterSpawn): { actors: Actor[]; message: string } {
  const fail = (message: string) => ({ actors: [], message });
  if (!w.seats.length || w.gameOver || w.player.dead || w.player.downed || w.scene) return fail('Start a living run outside a story scene first.');
  if (w.clientActionHook) return fail('Monster spawning requires the host or single-player.');
  const c = DEV_MONSTER_SPAWN, { id, level, rarity, count } = options;
  if (!Object.hasOwn(MONSTERS, id) || !Object.hasOwn(RARITY_DEFS, rarity)) return fail('Select a registered monster and rarity.');
  if (!Number.isInteger(level) || level < c.minLevel || level > c.maxLevel
    || !Number.isInteger(count) || count < 1 || count > c.maxCount) return fail(`Use level ${c.minLevel}–${c.maxLevel} and quantity 1–${c.maxCount}.`);
  const actors: Actor[] = [], p = w.player, floor = w.pathField(p.tier);
  for (let i = 0; i < count; i++) {
    const actor = w.createMonster(id, level, 'enemy');
    if (rarity !== 'normal') w.promoteMonster(actor, rarity);
    actor.tier = p.tier;
    let placed = false;
    const phase = Math.random() * Math.PI * 2;
    for (let k = 0; k < c.attempts; k++) {
      const angle = phase + k * Math.PI * 2 / c.attempts;
      const distance = c.distance[0] + Math.random() * (c.distance[1] - c.distance[0]) + actor.radius;
      const pos = w.findFreeSpot({ x: p.pos.x + Math.cos(angle) * distance, y: p.pos.y + Math.sin(angle) * distance }, actor.radius, actor.tier);
      if ((floor && !floor.isWalkable(pos.x, pos.y)) || w.pointInSolid(pos.x, pos.y, actor.radius, actor.tier)
        || w.actors.some(a => !a.dead && a.tier === actor.tier && Math.hypot(a.pos.x - pos.x, a.pos.y - pos.y) < a.radius + actor.radius + c.gap)) continue;
      actor.pos = pos; placed = true; break;
    }
    if (!placed) break;
    w.actors.push(actor); actors.push(actor);
  }
  return { actors, message: actors.length
    ? `Spawned ${actors.length}/${count} × ${MONSTERS[id].name} · level ${level} · ${RARITY_DEFS[rarity].label || 'Normal'}${actors.length < count ? ' (no room for the rest)' : ''}.`
    : 'No clear space nearby for that monster.' };
}
