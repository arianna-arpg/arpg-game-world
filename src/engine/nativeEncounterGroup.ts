import { dist, vec, type Vec2 } from '../core/math';
import type { Actor } from './actor';
import type { Doodad } from './levelgen';
import type { ZoneDef } from '../data/zones';
import type { WalkField } from '../world/walk';
import type { EncounterGroupDef, EncounterGroupSpawnOptions, encounterGroupContext,
  planEncounterGroup, applyEncounterGroup } from './encounterGroups';

/** Complete local dependencies for the native group materializer. Planning,
 * factories, placement and publication retain their original order; callbacks
 * own their complete native sources and RNG. This is not runtime admission. */
export interface NativeEncounterGroupHost {
  readonly zone: ZoneDef;
  readonly player: { readonly pos: Vec2 };
  readonly tierViews: readonly (WalkField | undefined)[] | null;
  readonly actors: Actor[];
  readonly config: { readonly radius: number; readonly placementAttempts: number;
    readonly placementJitter: number; readonly bodyClearance: number };
  group(id: string): EncounterGroupDef | undefined;
  encounterGroupContext: typeof encounterGroupContext;
  planEncounterGroup: typeof planEncounterGroup;
  applyEncounterGroup: typeof applyEncounterGroup;
  rand(lo: number, hi: number): number;
  pathField(tier: number): WalkField | null;
  createMonster(id: string, level: number, team: 'enemy'): Actor;
  findFreeSpot(at: Vec2, radius: number, tier: number): Vec2;
  placeInHabitat(actor: Actor): boolean;
  pointInSolid(x: number, y: number, margin: number, tier: number): Doodad | null;
  nextSquadId(): number;
}

/** All members are seated before the first publication. A failed seat keeps
 * its original factory/random attempts and returns no partial group. */
export function spawnNativeEncounterGroup(host: NativeEncounterGroupHost, recipe: string,
  level: number, at: Vec2, opts: EncounterGroupSpawnOptions = {}): Actor[] {
  const group = host.group(recipe), tier = opts.tier ?? 0;
  if (group?.id !== recipe || !Number.isFinite(at.x) || !Number.isFinite(at.y) || !Number.isInteger(tier) || tier < 0
    || (opts.facing !== undefined && !Number.isFinite(opts.facing))) return [];
  const plan = host.planEncounterGroup(recipe, host.encounterGroupContext(host.zone, group.faction, tier, level), opts.maxMembers);
  if (!plan.length) return [];
  const facing = opts.facing ?? Math.atan2(host.player.pos.y-at.y,host.player.pos.x-at.x);
  const c = Math.cos(facing), s = Math.sin(facing), radius = group.radius ?? host.config.radius;
  const field = host.pathField(tier);
  if (tier > 0 && !host.tierViews?.[tier]) return [];
  const members: Actor[] = [];
  for (const seat of plan) {
    const a = host.createMonster(seat.monster,level,'enemy'); a.tier=tier;
    let placed=false;
    for (let attempt=0;attempt<host.config.placementAttempts;attempt++) {
      const jitter=attempt*host.config.placementJitter;
      a.pos=host.findFreeSpot(vec(at.x+c*seat.offset.x-s*seat.offset.y+host.rand(-jitter,jitter),
        at.y+s*seat.offset.x+c*seat.offset.y+host.rand(-jitter,jitter)),a.radius,tier);
      if (a.habitat && !host.placeInHabitat(a)) continue;
      if (dist(a.pos,at)>radius || host.pointInSolid(a.pos.x,a.pos.y,a.radius,tier)) continue;
      if (field && (!field.isWalkable(a.pos.x,a.pos.y) || (field.reachable && !field.reachable(at,a.pos)))) continue;
      if (members.some(b=>dist(a.pos,b.pos)<a.radius+b.radius+host.config.bodyClearance)) continue;
      placed=true; break;
    }
    if (!placed) return []; // no orphan healer, keeper, or missing frontline
    a.facing=facing;
    if (opts.persistent !== undefined) a.fromZoneGen=opts.persistent;
    members.push(a);
  }
  const id=host.nextSquadId();
  members.forEach((a,i)=>{
    host.applyEncounterGroup(a,{id,recipe,slot:plan[i].member.slot});
    if (a.squadLeader) a.name=`${group.name} — ${a.name}`;
    a.fillResources(); host.actors.push(a);
  });
  return members;
}
