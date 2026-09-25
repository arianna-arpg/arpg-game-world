import type { World } from './world';
import type { OdysseyState } from '../world/odyssey';
import type { Doodad } from './levelgen';
import type { Vec2 } from '../core/math';
import { dist, vec } from '../core/math';
import { Rng } from '../core/rng';
import { blocksMovement, hitSurfaceOf } from './levelgen';
import { shapeContains } from './shapes';
import { issueCommand } from './ai';
import { MONSTERS } from '../data/monsters';
import { skyOf } from '../data/zones';
import { inPhases } from '../world/daynight';
import { odysseyPressureTier, retimeOdysseyPressure } from '../world/odysseyPressure';
import { odysseyPressureInterval } from '../data/odysseyPressure';
import { ODYSSEY_RISINGS, risingTag, type OdysseyRisingDef } from '../data/odysseyRisings';

interface RisingWarning {
  source: Doodad; origin: Vec2; zoneId: string; tier: number; at: number; goal: Vec2;
  sites: { id: string; pos: Vec2; radius: number; flash: World['flashes'][number] }[];
}

/** Host-only, bounded scenery encounters. One pending warning per data row;
 * no elapsed-time catch-up bursts and no full scenery scans each frame. */
export class OdysseyRisings {
  private warnings = new Map<string, RisingWarning>();
  private zoneId?: string;
  constructor(private readonly w: World) {}

  clear(): void {
    for (const warning of this.warnings.values()) for (const site of warning.sites) site.flash.life = 0;
    this.warnings.clear(); this.zoneId = undefined;
  }
  private cancel(id: string, def?: OdysseyRisingDef): void {
    const warning = this.warnings.get(id);
    if (warning) for (const site of warning.sites) {
      site.flash.life = 0;
      if (def && warning.zoneId === this.w.zone.id) this.w.flashes.push({
        pos: { ...site.pos }, radius: site.flash.radius, color: def.cue.color,
        fx: def.cue.settleFx, life: def.cue.settleSec, maxLife: def.cue.settleSec,
      });
    }
    this.warnings.delete(id);
  }
  private field(): boolean {
    const w = this.w;
    return w.zone.objective.kind !== 'safe' && !w.zone.special && !w.zone.boundless
      && !w.zone.id.startsWith('quest_') && !w.inCave && skyOf(w.zone) === 'open';
  }
  private count(def: OdysseyRisingDef): number {
    return this.w.actors.filter(a => !a.dead && a.tag === risingTag(def.id)).length;
  }
  update(s: OdysseyState): void {
    const w = this.w, clocks = s.risings ??= {};
    const entering = this.zoneId !== w.zone.id;
    this.zoneId = w.zone.id;
    for (const def of ODYSSEY_RISINGS) {
      const tier = odysseyPressureTier(s, def);
      if (tier === null) { this.cancel(def.id, def); delete clocks[def.id]; continue; }
      const interval = odysseyPressureInterval(def, tier, s.prepared.includes(def.faction));
      const clock = clocks[def.id] ??= { nextAt: w.time + def.entryGraceSec, interval };
      if (clock.interval !== interval) {
        clock.nextAt = retimeOdysseyPressure(clock.nextAt, clock.interval, interval, w.time);
        clock.interval = interval;
      }
      if (entering || !this.field() || !inPhases(w.time, def.phases)) {
        this.cancel(def.id, entering ? undefined : def);
        clock.nextAt = Math.max(clock.nextAt, w.time + def.entryGraceSec);
        continue;
      }
      const pending = this.warnings.get(def.id);
      if (pending) {
        const near = w.seats.some(seat => !seat.actor.dead && !seat.actor.downed
          && seat.actor.tier === pending.tier && dist(seat.actor.pos, pending.source.pos) <= def.abandonRange);
        if (!near || pending.zoneId !== w.zone.id || pending.source.gone
          || (pending.source.tier ?? 0) !== pending.tier || !def.sourceKinds.includes(pending.source.kind)
          || dist(pending.source.pos, pending.origin) > 1
          || !w.doodadsNear(pending.source.pos.x, pending.source.pos.y, 1).includes(pending.source)) {
          this.cancel(def.id, def); continue;
        }
        if (w.time >= pending.at) {
          this.raise(def, pending); this.cancel(def.id, def);
          clock.nextAt = Math.max(clock.nextAt, w.time + Math.max(def.retrySec, interval - def.warningSec));
        }
        continue;
      }
      if (w.time < clock.nextAt) continue;
      clock.nextAt = w.time + def.retrySec;
      if (this.count(def) >= def.fieldCap) continue;
      const sources = w.doodadsNear(w.player.pos.x, w.player.pos.y, def.sourceRange[1]).filter(d => {
        const distance = dist(w.player.pos, d.pos);
        return !d.gone && (d.tier ?? 0) === w.player.tier && def.sourceKinds.includes(d.kind)
          && distance >= def.sourceRange[0] && distance <= def.sourceRange[1];
      });
      if (!sources.length) continue;
      const rng = new Rng(w.manifest.seed ^ Math.floor(w.time * 1000));
      const source = rng.pick(sources);
      const warning: RisingWarning = { source, origin: { ...source.pos }, zoneId: w.zone.id,
        tier: w.player.tier, at: w.time + def.warningSec, goal: { ...w.player.pos }, sites: [] };
      const room = Math.min(def.batch, def.fieldCap - this.count(def));
      for (let i = 0; i < room; i++) {
        const id = rng.pick(def.roster), monster = MONSTERS[id];
        if (!monster) continue;
        for (let attempt = 0; attempt < def.placementAttempts; attempt++) {
          const angle = rng.range(0, Math.PI * 2), ring = source.radius + def.spawnRing;
          const pos = vec(source.pos.x + Math.cos(angle) * ring, source.pos.y + Math.sin(angle) * ring);
          if (!this.spotOpen(def, warning, pos, monster.radius)
            || warning.sites.some(site => dist(site.pos, pos) < site.radius + monster.radius)) continue;
          const flash = { pos: { ...pos }, radius: monster.radius * def.cue.radiusMul,
            fx: def.cue.fx, color: def.cue.color, life: def.warningSec, maxLife: def.warningSec };
          warning.sites.push({ id, pos, radius: monster.radius, flash });
          w.flashes.push(flash);
          break;
        }
      }
      if (!warning.sites.length) continue;
      this.warnings.set(def.id, warning);
      clock.nextAt = w.time + interval;
    }
  }
  /** The birth is committed to the shown patch. Changed terrain or occupancy
   * cancels that body; it must never relocate to an unwarned position. */
  private spotOpen(def: OdysseyRisingDef, warning: RisingWarning, pos: Vec2, radius: number): boolean {
    const w = this.w;
    const field = w.pathField(warning.tier);
    if (pos.x < radius || pos.y < radius || pos.x > w.arena.w - radius || pos.y > w.arena.h - radius) return false;
    if (field && (!field.isWalkable(pos.x, pos.y) || (field.reachable && !field.reachable(warning.goal, pos)))) return false;
    if (w.exits.some(exit => dist(exit.pos, pos) < exit.radius + def.portalClear)) return false;
    if (w.seats.some(seat => !seat.actor.dead && seat.actor.tier === warning.tier
      && dist(seat.actor.pos, pos) < def.sourceRange[0])) return false;
    if (w.actors.some(a => !a.dead && a.tier === warning.tier && dist(a.pos, pos) < a.radius + radius)) return false;
    return !w.doodadsNear(pos.x, pos.y, radius).some(d => (d.tier ?? 0) === warning.tier && blocksMovement(d)
      && shapeContains(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, pos.x, pos.y, radius));
  }
  private raise(def: OdysseyRisingDef, warning: RisingWarning): void {
    const w = this.w;
    let room = def.fieldCap - this.count(def);
    for (const site of warning.sites) {
      if (room <= 0) break;
      if (this.spotOpen(def, warning, site.pos, site.radius)) {
        const a = w.createMonster(site.id, w.zone.level, 'enemy');
        a.pos = { ...site.pos }; a.tier = warning.tier; a.tag = risingTag(def.id);
        a.fromZoneGen = true; // ordinary zone memory owns kits, wounds, tags and casualties
        issueCommand(a, { kind: 'assault', pos: { ...warning.goal }, until: w.time + def.orderSec });
        w.actors.push(a);
        room--;
      }
    }
  }
}
