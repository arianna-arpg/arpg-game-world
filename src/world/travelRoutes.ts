import { objectiveSeals, type ZoneDef, type ZoneExitDef } from '../data/zones';
import { coordDist } from './coords';

export interface TravelRoute {
  path: string[];
  peak: number;
  distance: number;
}
export interface TravelPolicy {
  maxLevel: number;
  maxSteps: number;
  maxDistance: number;
}

/** Read-only bounded approach search. Keeps nondominated distance/step labels:
 * a shorter road with more crossings must not hide a usable direct approach.
 * Sealed objectives may be destinations, never compulsory transit fights.
 * The caller supplies live locks and terrain; unknown terrain is never revealed. */
export function travelRoutes(zones: Record<string, ZoneDef>, start: string, policy: TravelPolicy,
  open: (a: ZoneDef, e: ZoneExitDef, b: ZoneDef) => boolean,
  done: (id: string) => boolean): Map<string, TravelRoute> {
  const out = new Map<string, TravelRoute>();
  if (!zones[start]) return out;
  const peak = zones[start].objective.kind === 'safe' ? 0 : zones[start].level;
  if (peak > policy.maxLevel) return out;
  const first = { path: [start], peak, distance: 0 };
  const labels = new Map<string, TravelRoute[]>([[start, [first]]]);
  const queue: TravelRoute[] = [first];
  for (let i = 0; i < queue.length; i++) {
    const r = queue[i], id = r.path[r.path.length - 1], a = zones[id];
    if (!labels.get(id)?.includes(r)) continue;
    const best = out.get(id);
    if (!best || r.distance < best.distance || (r.distance === best.distance && r.path.length < best.path.length)) out.set(id, r);
    if (r.path.length > policy.maxSteps || (objectiveSeals(a.objective) && !done(id))) continue;
    for (const e of a.exits) {
      const b = zones[e.to];
      if (!b || r.path.includes(b.id) || !open(a, e, b)) continue;
      const peak = Math.max(r.peak, b.objective.kind === 'safe' ? 0 : b.level);
      const distance = r.distance + coordDist(a.map, b.map);
      if (peak > policy.maxLevel || distance > policy.maxDistance) continue;
      const next = { path: [...r.path, b.id], peak, distance };
      const old = labels.get(b.id) ?? [];
      if (old.some(x => x.distance <= distance && x.path.length <= next.path.length)) continue;
      labels.set(b.id, [...old.filter(x => x.distance < distance || x.path.length < next.path.length), next]);
      queue.push(next);
    }
  }
  return out;
}
