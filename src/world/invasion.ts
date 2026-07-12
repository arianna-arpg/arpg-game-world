// ---------------------------------------------------------------------------
// FACTION INVASION — war hosts on the move.
//
// Where weather drifts and faction territory simmers, an invasion is an EVENT:
// a warband peels off a faction's stronghold and marches across the map toward
// a neighbouring zone it does not yet hold. As it bears down it pours its
// faction's influence into the target (far harder than slow diffusion ever
// could), so the place tips toward a contest and, if the host lingers, toward
// outright CONQUEST — at which point the zone's population flips (the faction
// field owns that flip; this overlay just supplies the pressure). Walk into a
// zone under invasion and the warband is really there, brawling with whoever
// held the ground. Repel them — thin the warband and outlast the host — or let
// the frontier move. Either way the map is alive.
//
// This overlay holds a reference to the faction field: an invasion IS faction
// power on the march, so the two are deliberately coupled through a tiny API
// (reinforce / owner / conquerorOf). Births and marches use an OWNED seeded Rng.
// ---------------------------------------------------------------------------

import { clamp, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import { factionStance } from '../data/monsters';
import type { ZoneDef } from '../data/zones';
import type { FactionField } from './faction';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from './overlay';
import { FACTION_COLORS, FALLBACK_FACTION_COLOR } from './palette';
import { scaledCap } from '../packages/frequency';
import { isWarOrigin, traitsOf } from './traits';

export interface InvasionHost {
  faction: string;
  pos: Vec2;            // node-space, marching from a stronghold…
  target: Vec2;         // …toward the target zone's node
  /** The stronghold zone this host marched FROM — the direction it enters by. */
  fromZoneId: string;
  targetZoneId: string;
  radius: number;
  age: number;
  life: number;
  /** Set once the host reaches its target node — fires a one-time ARRIVAL the
   *  engine materializes as a real warband pack IF the player is in the zone. */
  arrived: boolean;
}

const STEP = 0.5;
const ARRIVE_DIST = 16;         // within this of the target node = ARRIVED (pack lands)
const MAX_HOSTS = 2;
const LAUNCH_CHANCE = 0.03;     // per step, when below the cap and a frontier exists
const MARCH_SPEED = 7;          // node-units/sec a host advances on its target
const PUMP_RATE = 17;           // influence/sec poured in — enough to overrun a
                                // defended frontier and push past the conquest line
const HOST_RADIUS = 60;
const HOST_LIFE: [number, number] = [70, 120];
const WARBAND_FULL = 8;         // a warband at full strength; the pump scales with
                                // how much of it is still alive where you stand

export class InvasionField implements WorldOverlay {
  readonly id = 'invasion' as const;
  /** Transient BY DESIGN (the movers doctrine): a marching host mid-road on
   *  quit simply re-launches next session — weather-like motion, no arc lost. */
  readonly persistence = 'transient' as const;
  readonly mapLabel = 'Invasions';
  readonly hosts: InvasionHost[] = [];
  /** Hosts that REACHED their target this tick — the engine drains this each
   *  update to materialize an arriving warband where the player stands. */
  readonly arrivals: InvasionHost[] = [];
  private faction: FactionField;
  private rng: Rng;
  private acc = 0;
  /** A faction may only march behind a living warlord (set by WorldSim). */
  gate?: (faction: string, now: number) => boolean;
  /** Per-faction launch-rate multiplier from the content packages governing
   *  that faction (Warbands / Demon Invasions). 0 ⇒ that faction never marches
   *  this run (package off or below its start level). Default 1 (un-gated). */
  factionScale: (faction: string) => number = () => 1;
  /** Global concurrency crank (frequency.concurrency, set by WorldSim) — lifts the
   *  max-concurrent-hosts cap so a frequency boost shows more invasions at once. */
  concurrencyScale = 1;

  constructor(faction: FactionField, rng: Rng) {
    this.faction = faction;
    this.rng = rng;
  }

  update(dt: number, view: OverlayView): void {
    for (const h of this.hosts) {
      const dx = h.target.x - h.pos.x, dy = h.target.y - h.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const step = Math.min(MARCH_SPEED * dt, d);
        h.pos.x += (dx / d) * step;
        h.pos.y += (dy / d) * step;
      }
      h.age += dt;
      // The moment it reaches the target node, fire a one-time ARRIVAL — the
      // engine turns this into a real warband pack at the zone's entry IF the
      // player is standing there (otherwise the territory sim handles it abstractly).
      if (d <= ARRIVE_DIST && !h.arrived) { h.arrived = true; this.arrivals.push(h); }
      // Within reach of the target zone, the host pours its strength in. Where
      // YOU stand, that strength is only as great as the warband still on the
      // field — thin the invaders and the pressure lifts, so clearing the zone
      // (and outlasting the host) repels the invasion. Where you AREN'T, it
      // presses at full strength: the frontier moves whether you watch or not.
      if (d <= h.radius) {
        let rate = PUMP_RATE;
        if (view.currentZoneId === h.targetZoneId) {
          rate *= clamp((view.census[h.faction] ?? 0) / WARBAND_FULL, 0, 1);
        }
        if (rate > 0) this.faction.reinforce(h.targetZoneId, h.faction, rate * dt);
      }
    }
    for (let i = this.hosts.length - 1; i >= 0; i--) {
      if (this.hosts[i].age >= this.hosts[i].life) this.hosts.splice(i, 1);
    }
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.maybeLaunch(view);
    }
  }

  onNodeCharted(): void {
    // War hosts are global and target by zone id; a new node needs no seeding.
  }

  affectSpawns(zone: ZoneDef): SpawnBias {
    const host = this.activeHostOn(zone.id);
    if (!host) return NO_BIAS;
    // Don't re-inject a faction that already rules the zone — it spawns natively.
    if (this.faction.conquerorOf(zone.id) === host.faction) return NO_BIAS;
    if (this.faction.owner(zone.id).faction === host.faction) return NO_BIAS;
    return { countMul: 1.15, factionMul: { [host.faction]: 1.4 }, injectFactions: [host.faction] };
  }

  renderMap(): MapLayer {
    let over = '';
    for (const h of this.hosts) {
      const col = FACTION_COLORS[h.faction] ?? FALLBACK_FACTION_COLOR;
      const ang = Math.atan2(h.target.y - h.pos.y, h.target.x - h.pos.x);
      const x = h.pos.x, y = h.pos.y, r = 8;
      // a dashed line of march to the target…
      over += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" `
        + `x2="${h.target.x.toFixed(1)}" y2="${h.target.y.toFixed(1)}" `
        + `stroke="${col}" stroke-width="1.5" stroke-dasharray="2 4" stroke-opacity="0.85"/>`;
      // …an arrowhead at the host, pointing the way…
      const p0 = `${(x + Math.cos(ang) * r).toFixed(1)} ${(y + Math.sin(ang) * r).toFixed(1)}`;
      const p1 = `${(x + Math.cos(ang + 2.5) * r).toFixed(1)} ${(y + Math.sin(ang + 2.5) * r).toFixed(1)}`;
      const p2 = `${(x + Math.cos(ang - 2.5) * r).toFixed(1)} ${(y + Math.sin(ang - 2.5) * r).toFixed(1)}`;
      over += `<path d="M ${p0} L ${p1} L ${p2} Z" fill="${col}" stroke="#0a0a0e" stroke-width="0.5"/>`;
      // …and a faint marshalling ring.
      over += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="none" `
        + `stroke="${col}" stroke-width="1" stroke-opacity="0.55"/>`;
    }
    return { under: '', over };
  }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): a war host
   *  bearing down on the zone. */
  activityAt(zoneId: string): number { return this.activeHostOn(zoneId) ? 1 : 0; }

  /** A war host bearing down on (or arrived at) this zone, if any. */
  activeHostOn(zoneId: string): InvasionHost | null {
    for (const h of this.hosts) {
      if (h.targetZoneId !== zoneId) continue;
      const d = Math.hypot(h.target.x - h.pos.x, h.target.y - h.pos.y);
      if (d <= h.radius * 1.5) return h;
    }
    return null;
  }

  private maybeLaunch(view: OverlayView): void {
    if (this.hosts.length >= scaledCap(MAX_HOSTS, this.concurrencyScale)) return;
    // A WAR frontier: a strongly-held zone whose neighbour is held by a HOSTILE
    // faction, has a pack table to flip, and isn't already under invasion. ROOTED
    // factions (FACTION_TRAITS) only marshal from native home ground. (We only
    // march where reaching the target means a real brawl — and where conquest
    // changes who spawns, so packs-less arenas like The Pit are never "invaded".)
    const candidates: { faction: string; from: ZoneDef; to: ZoneDef }[] = [];
    for (const z of view.nodes) {
      if (z.objective.kind === 'safe') continue;
      const o = this.faction.owner(z.id);
      if (!o.faction || !o.owned) continue;
      if (this.gate && !this.gate(o.faction, view.time)) continue; // no warlord, no war
      if (!isWarOrigin(o.faction, z, this.faction.conquerorOf(z.id))) continue;
      for (const e of z.exits) {
        const nb = view.byId[e.to];
        if (e.to === '?' || !nb || nb.objective.kind === 'safe') continue;
        if (!nb.packs?.table?.length) continue;
        const nbFaction = this.faction.owner(nb.id).faction;
        if (!nbFaction || factionStance(o.faction, nbFaction) !== 'hostile') continue;
        if (this.hosts.some(h => h.targetZoneId === nb.id)) continue;
        candidates.push({ faction: o.faction, from: z, to: nb });
      }
    }
    // Drop frontiers whose package is off / un-governed (pressure 0) BEFORE the
    // pick — otherwise a disabled faction's frontier could win the lottery and
    // abort the whole step, silently throttling the packages that ARE enabled.
    const live = candidates.filter(c => this.factionScale(c.faction) > 0);
    if (!live.length) return;
    const c = this.rng.pick(live);
    // Roaming × aggression scales the launch chance for the winning faction:
    // goblins/demons march hard, the rooted undead rarely. The package pressure
    // (Warbands / Demon Invasions) then scales it by the player's weighting.
    const scale = this.factionScale(c.faction);
    const t = traitsOf(c.faction);
    if (!this.rng.chance(clamp(LAUNCH_CHANCE * t.roaming * t.aggression * 8 * scale, 0, 1))) return;
    this.hosts.push({
      faction: c.faction,
      pos: { x: c.from.map.x, y: c.from.map.y },
      target: { x: c.to.map.x, y: c.to.map.y },
      fromZoneId: c.from.id,
      targetZoneId: c.to.id,
      radius: HOST_RADIUS,
      age: 0,
      life: this.rng.range(HOST_LIFE[0], HOST_LIFE[1]),
      arrived: false,
    });
  }
}
