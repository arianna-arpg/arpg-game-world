/** Complete native theater birth and helpers; full native controller services remain required. */
import type {World} from './world';
import type {NativeTheaterHost} from './nativeTheaterHost';
import {rand,vec,type Vec2} from '../core/math';
import {Actor,type Team} from './actor';
import {factionStance} from '../data/monsters';
import {type PackTableEntry} from '../data/zones';
import {distFromHome,traitsOf} from '../world/traits';
import {ActiveTheaterRun,runTheaterBeat,theaterConcurrencyFold,THEATER_CFG,type TheaterContext,type TheaterKindDef,type TheaterRow} from './theater';

export interface NativeSceneTheaterHost extends NativeTheaterHost {
 sim:World['sim'];
 zone:World['zone'];
 zoneMap:World['zoneMap'];
 theaterSpots:World['theaterSpots'];
 arena:World['arena'];
 theaterContextNow:World['theaterContextNow'];
 theaterRuns:World['theaterRuns'];
 theaterConcurrencyNow:World['theaterConcurrencyNow'];
 radianceCondHeld:World['radianceCondHeld'];
 theaterPour:World['theaterPour'];
 theaterAmbientBudget:World['theaterAmbientBudget'];
 theaterPourRoom:World['theaterPourRoom'];
 spawnEventActor:World['spawnEventActor'];
 createMonster:World['createMonster'];
 weightedPick:World['weightedPick'];
 actors:World['actors'];
 clampPos:World['clampPos'];
 zoneEntry:World['zoneEntry'];
}
export function nativeTheaterContextNow(scope:NativeSceneTheaterHost,): TheaterContext {
    const fac = scope.sim.faction, owner = fac.owner(scope.zone.id);
    const host = scope.sim.invasion.activeHostOn(scope.zone.id);
    // Rooted factions only stage their life near home (FACTION_TRAITS eventRange).
    let nearHome = true;
    if (owner.faction) {
      const t = traitsOf(owner.faction);
      if (t.eventRange !== undefined) {
        nearHome = distFromHome(owner.faction, scope.zone, scope.zoneMap) <= t.eventRange;
      }
    }
    return {
      owner: owner.faction, ownerPower: owner.power,
      biome: scope.zone.biome,
      tileset: scope.zone.tileset, // THE FACE AXIS (TheaterRow.tilesets) — zone-standing truth
      contestants: fac.contestants(scope.zone.id),
      invader: host?.faction ?? null,
      hasCamps: scope.theaterSpots.camps.length > 0,
      hasRoute: scope.theaterSpots.camps.length + scope.theaterSpots.pois.length >= 2,
      nearHome,
    };
  }
export function nativeTheaterConcurrencyNow(scope:NativeSceneTheaterHost,): number {
    const cc = THEATER_CFG.concurrency;
    let ground = cc.base;
    const owner = scope.sim.faction.owner(scope.zone.id).faction;
    if (owner) {
      const t = traitsOf(owner);
      const heartland = t.originZone ? t.originZone === scope.zone.id
        : t.homeBiome ? scope.zone.biome === t.homeBiome : false;
      if (heartland) ground = Math.max(ground, cc.heartland);
    }
    if (Math.min(scope.arena.w, scope.arena.h) < cc.smallDim) ground = Math.min(ground, cc.small);
    return theaterConcurrencyFold(scope, ground);
  }
export function nativeTheaterRunBeat(scope:NativeSceneTheaterHost,beat: number, ctx: TheaterContext = scope.theaterContextNow()): void {
    const run = runTheaterBeat(scope, {
      beat, ctx,
      spots: scope.theaterSpots,
      live: scope.theaterRuns,
      concurrency: scope.theaterConcurrencyNow(),
      // The ENTRY beat arrives pre-gated (the boot site resolves mycelia on
      // the live die — the old lane's exact shape); dwell beats re-check
      // the bloom on their own keyed stream.
      suppression: beat === 0 ? 1 : (scope.sim.myceliaField?.suppressionAt(scope.zone.id) ?? 1),
      held: c => scope.radianceCondHeld(c),
      stance: factionStance,
    });
    if (run && !run.done) scope.theaterRuns.push(run);
  }
export function nativeTheaterPourRoom(scope:NativeSceneTheaterHost,def: TheaterKindDef, row: TheaterRow, entry: boolean): number {
    if (entry && def.posture === 'replacement') return Number.POSITIVE_INFINITY;
    const poured = scope.theaterPour.get(def.id) ?? 0;
    const pc = THEATER_CFG.pour;
    const cap = def.posture === 'additive'
      ? (row.pourCap ?? def.pourCap ?? pc.additiveCap)
      : Math.max(pc.floor, Math.round(pc.bandFrac * scope.theaterAmbientBudget));
    return cap - poured;
  }
export function nativeTheaterSpawn(scope:NativeSceneTheaterHost,run: ActiveTheaterRun, table: PackTableEntry[], level: number, faction: string, tag: string): Actor | null {
    const def = run.def();
    if (!def) return null;
    if (scope.theaterPourRoom(def, run.row, run.entry) <= 0) return null;
    const a = scope.spawnEventActor(table, level, 'enemy', faction, tag);
    scope.theaterPour.set(def.id, (scope.theaterPour.get(def.id) ?? 0) + 1);
    return a;
  }
export function nativeSpawnEventActor(scope:NativeSceneTheaterHost,table: PackTableEntry[], level: number, team: Team, faction: string, tag: string): Actor {
    const a = scope.createMonster(scope.weightedPick(table, level), level, team);
    a.faction = faction;
    a.tag = tag;
    scope.actors.push(a);
    return a;
  }
export function nativeClampNear(scope:NativeSceneTheaterHost,at: Vec2, r: number): Vec2 {
    return scope.clampPos(vec(at.x + rand(-r, r), at.y + rand(-r, r)), 16);
  }
export function nativeAnyAliveWithTag(scope:NativeSceneTheaterHost,tag: string, faction: string): boolean {
    return scope.actors.some(a => !a.dead && a.tag === tag && a.faction === faction);
  }
export function nativeZoneEntryPos(scope:NativeSceneTheaterHost,): Vec2 {
    return vec(scope.zoneEntry.x, scope.zoneEntry.y);
  }