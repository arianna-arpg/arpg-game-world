import { HUB_ZONE, START_ZONE, objectiveSeals, type ZoneDef } from '../data/zones';
import { coordDist } from './coords';
export { HUB_ZONE } from '../data/zones';

/** A small connected opening, assessed after geographic placement and road repair.
 * The remaining branches retain the ordinary field's danger. */
export const OPENING_PROGRESSION = {
  approaches: 2,
  levels: [1, 1, 2, 2, 3, 3, 4, 4, 4],
  radius: 650,
};

export function openingGround(z: ZoneDef): boolean {
  return z.id !== START_ZONE && !z.id.startsWith('quest_') && !z.dimension && z.caveDepth == null && !z.special
    && !z.eventOwned && !z.floating && !z.concealed && !z.port && !z.pocket
    && !z.kind && !objectiveSeals(z.objective) && z.objective.kind !== 'safe';
}

/** Only actual, reciprocal, unlocked land roads count; never count an unconnected
 * low node, a quest arena, a sealed boss, or a purchase as opening territory. */
export function openingRoads(z: ZoneDef, zones: Record<string, ZoneDef>,
  canWalk: (a: ZoneDef, b: ZoneDef) => boolean): ZoneDef[] {
  return z.exits.flatMap(e => {
    const n = zones[e.to];
    return !e.lock && !e.crossDim && n && openingGround(n)
      && n.exits.some(back => back.to === z.id && !back.lock && !back.crossDim)
      && canWalk(z, n) ? [n] : [];
  });
}

/** Birth-only tuning: caller excludes visited/saved ground. BFS selects connected
 * branches before extending their ends; a child's cap never precedes its parent.
 * Returns the selected ids for diagnosis. No roads, map knowledge or RNG change. */
export function tuneOpeningProgression(zones: Record<string, ZoneDef>,
  canWalk: (a: ZoneDef, b: ZoneDef) => boolean): string[] {
  const hub = zones[HUB_ZONE];
  if (!hub) return [];
  const seen = new Set([hub.id]), queue = [hub], selected: string[] = [];
  for (let i = 0; i < queue.length && selected.length < OPENING_PROGRESSION.levels.length; i++) {
    const neighbors = openingRoads(queue[i], zones, canWalk)
      .sort((a, b) => a.level - b.level || coordDist(a.map, hub.map) - coordDist(b.map, hub.map) || a.id.localeCompare(b.id));
    for (const z of neighbors) {
      if (seen.has(z.id) || coordDist(z.map, hub.map) > OPENING_PROGRESSION.radius) continue;
      seen.add(z.id); queue.push(z);
      const cap = OPENING_PROGRESSION.levels[selected.length];
      z.level = Math.min(z.level, cap);
      selected.push(z.id);
      if (selected.length === OPENING_PROGRESSION.levels.length) break;
    }
  }
  return selected;
}
