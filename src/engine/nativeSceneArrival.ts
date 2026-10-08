/** Native arrival safety and campaign lookups shared by classic and local area birth. */
import type {World} from './world';
import type {ObjectiveSpec} from '../data/zones';
import {MONSTERS} from '../data/monsters';
import {dist,rand,vec} from '../core/math';
export interface NativeSceneArrivalHost {
actors:World["actors"];
zoneEntry:World["zoneEntry"];
clampPos:World["clampPos"];
findFreeSpot:World["findFreeSpot"];
farthestStand:World["farthestStand"];
structures:World["structures"];
walk:World["walk"];
account:World["account"];
completedObjectives:World["completedObjectives"];
zoneMap:World["zoneMap"];
}
/** Pass the real original POCKET_CFG; no rewritten radius/default policy. */
export type NativeSceneArrivalPolicy={readonly arrivalGrace:number};
export function enforceNativeArrivalGrace(host:Pick<NativeSceneArrivalHost,"actors"|"zoneEntry"|"clampPos"|"findFreeSpot"|"farthestStand"|"structures"|"walk">, policy:NativeSceneArrivalPolicy): void {
    // SOVEREIGNTY: seat — arrival seating (findFreeSpot carries the story) (the derived census, probe_tiers RIG T).
    const grace = policy.arrivalGrace;
    for (const a of host.actors) {
      if (a.team !== 'enemy' || a.dead || a.confine || a.untargetable) continue;
      const md = a.defId ? MONSTERS[a.defId] : undefined;
      if (md?.passive || md?.npcRole) continue;
      const d = dist(a.pos, host.zoneEntry);
      if (d >= grace) continue;
      const ang = d > 1
        ? Math.atan2(a.pos.y - host.zoneEntry.y, a.pos.x - host.zoneEntry.x)
        : rand(0, Math.PI * 2);
      const out = vec(host.zoneEntry.x + Math.cos(ang) * (grace + 40),
        host.zoneEntry.y + Math.sin(ang) * (grace + 40));
      let to = host.clampPos(host.findFreeSpot(out, a.radius) ?? out, a.radius);
      if (dist(to, host.zoneEntry) < grace) {
        const far = host.farthestStand(a.radius, host.structures.length > 0);
        if (far) {
          const jittered = host.clampPos(vec(far.x + rand(-60, 60), far.y + rand(-60, 60)), a.radius);
          // Scatter must not undo the safe stand we just found. In a narrow
          // carve clamping the jitter can pull a body back onto the portal.
          to = dist(jittered, host.zoneEntry) >= grace
            && (!host.structures.length || !host.walk?.reachable
              || host.walk.reachable(host.zoneEntry, jittered)) ? jittered : far;
        }
      }
      a.pos = vec(to.x, to.y);
    }
  }
export function nativeUberDefeated(host:Pick<NativeSceneArrivalHost,"account"|"completedObjectives">, o: ObjectiveSpec, zoneId: string): boolean {
    if (o.kind !== 'boss' || !o.uber) return false;
    if (o.uber.scope === 'account') {
      return (host.account.ledger[o.uber.key ?? `uber:${o.id}`] ?? 0) >= 1;
    }
    return host.completedObjectives.has(zoneId);
  }
export function nativeNearestZoneOf(host:Pick<NativeSceneArrivalHost,"zoneMap">, dimId: string, at: { x: number; y: number }, excludeId?: string): string | null {
    let best: string | null = null, bd = Infinity;
    for (const z of Object.values(host.zoneMap)) {
      if ((z.dimension ?? 'surface') !== dimId || z.special || z.id === excludeId) continue;
      const d = (z.map.x - at.x) ** 2 + (z.map.y - at.y) ** 2;
      if (d < bd) { bd = d; best = z.id; }
    }
    return best;
  }
