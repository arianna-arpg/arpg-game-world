// ---------------------------------------------------------------------------
// DEADWAKE FIELD — a death-fed, roaming undead TIDE (pure overlay).
//
// A Deadwake is the world's grief made flesh. It begins as an invisible CORPSE
// ACCUMULATION counter: slaying an undead foe has a very low chance to ARM it,
// after which it climbs — partly SIMULATED (a slow drip, swollen at night) and
// partly fed by the MAYHEM the player makes (every death, every raised minion,
// every consumed corpse, heavier when the dead themselves fall). When the counter
// crests, a DEADWAKE breaks loose: a TIGHT front (≈ one zone wide) that DRIFTS
// across the map, colliding with one zone at a time, with a CHANCE on each
// collision to CONSUME that zone's active world-event (a demon rift, a crusade
// hold) — but never the weather. Each Deadwake rolls a VARIANT (a steady horde, a
// swelling flood that grows its pour while engaged, a swift vanguard…).
//
// When the tide catches the zone the PLAYER stands in, it HOLDS POSITION and
// POURS its host in as a relentless STREAM (a horde that overwhelms by number),
// sized by the carried `strength` (which swells as it roams, while it pours, and
// with every casualty it takes — death is everlasting). Flee and it rolls on. It
// dissipates only when ROUTED — its host-leader cut down.
//
// THE NECROPOLIS (the uber): up to maxConcurrent tides roll at once. If TWO
// collide WITH EACH OTHER they fuse into a NECROPOLIS — a travelling seat of the
// dead that becomes its OWN Deadwake generator: the counter then ticks regardless
// of its arm state and new tides break loose FROM the Necropolis. Only one exists
// at a time. The player must chase it down (its access point drifts) and purge it;
// culling it DISPERSES the active tides and refreshes the whole cycle.
//
// PURE of the engine: it owns node-space + the counter + each wake's strength +
// the Necropolis position, emits a consume drain the engine bridges, and never
// touches World. The engine reads deadwakeOn()/necropolisInfo() to materialize it.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist, type MapCoord } from '../../world/coords';
import { dayCycle } from '../../world/daynight';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;                 // fixed cadence (heading wander + threshold check)
const DEADWAKE_VIOLET = '#7a5aa6'; // a grave-violet shroud (darker than the undead banner)
const NECRO_BONE = '#d8cdb0';      // the Necropolis' pale bone glow

/** What feeds the hidden Corpse Accumulation counter — every value a tunable
 *  knob. `undeadMul` folds in the brief's "a larger tick when undead-related". */
export interface CorpseAccrual {
  /** Counter units a death (enemy OR risen ally) adds. */
  death: number;
  /** Counter units a SUMMON (a minion raised) adds. */
  summon: number;
  /** Counter units a CONSUMED corpse (raise-spectre / revive) adds. */
  corpse: number;
  /** Multiplier on any accrual above when the unit belongs to the undead faction. */
  undeadMul: number;
  /** Passive, player-INDEPENDENT drip per second once armed (the "simulated" tick). */
  simDripPerSec: number;
  /** Day/night multipliers on the sim drip (the dead stir after dark). The drip
   *  lerps between these by the ambient light (1 = noon, 0 = midnight). */
  simDripDayMul: number;
  simDripNightMul: number;
}

/** A FLAVOUR a fresh Deadwake rolls — the carried-horde strength model + colour.
 *  The "swelling flood" is just a variant with a big engagedGrowth + a 9→20 band. */
export interface DeadwakeVariant {
  id: string;
  name: string;
  weight: number;
  /** The carried-horde strength: its seed, ceiling, and how fast it swells while
   *  ROAMING vs while ENGAGED (pouring into the player's zone — the flood ramp). */
  startStrength: number;
  maxStrength: number;
  roamGrowthPerSec: number;
  engagedGrowthPerSec: number;
  /** Banner colour for this variant (falls back to the surge / undead colour). */
  color?: string;
}

/** The NECROPOLIS config — the uber the Deadwake cycle culminates in. */
export interface NecropolisCfg {
  /** Two tides whose centres come within this fuse into a Necropolis. */
  collideDist: number;
  /** The seat's own drift speed (node-units/sec) — it travels, no fixed anchor. */
  driftSpeed: number;
  /** A charted zone within this of the Necropolis coord can open a way in (the
   *  access point that drifts as it travels — the player juggles avenues). */
  accessRadius: number;
  /** Tileset the off-graph Necropolis arena is built from. */
  tileset: string;
  /** Level bonus on the arena's denizens (atop the radial field at its coord). */
  levelBonus: number;
  /** The uber BOSS pool (rolled, Crowned) + the arena garrison size. */
  bossPool: PackTableEntry[];
  garrison: [number, number];
  /** The purge bounty (the combined-event payoff). */
  reward: { xpBase: number; xpPerLevel: number; gems: number };
}

/** The whole Deadwake mechanic as data (mirrors DemonSurge / CrusadeSurge). */
export interface DeadwakeSurge {
  /** Per-undead-kill chance the dormant counter is ARMED and begins to climb. */
  armChance: number;
  /** Counter value at which a Deadwake breaks loose (then it resets + disarms). */
  threshold: number;
  /** The accrual weights feeding the counter. */
  accrual: CorpseAccrual;
  /** Most Deadwakes rolling across the map at once (the "normal cap"). */
  maxConcurrent: number;
  /** The TIGHT coverage radius in node-units — a travelling zone, one node at a time. */
  radius: number;
  /** Drift speed (node-units/sec) by DAY and by NIGHT (it quickens after dark). */
  daySpeed: number;
  nightSpeed: number;
  /** Per-step heading-perturb chance + max swing (radians) — a slow wander. */
  turnChance: number;
  turnAmount: number;
  /** The faction key for the ambient swell + the undead "tells" (default 'undead'). */
  faction: string;
  /** The relentless STREAM roster + the LEADER pool the host-commander is rolled
   *  from (felling it routs the wake). */
  floodRoster: PackTableEntry[];
  leaderPool: PackTableEntry[];
  /** Added monster level for the streamed host (atop the zone level). */
  floodLevelBonus: number;
  /** The host-LEADER: its added level over the host, and a floor on its xp value. */
  leaderLevelBonus: number;
  leaderXpFloor: number;
  /** The bounty for ROUTING a Deadwake (felling its host-leader). */
  routReward: { xpBase: number; xpPerLevel: number; gems: number };
  /** The FLAVOURS a fresh tide rolls (steady / swelling flood / vanguard…). */
  variants: DeadwakeVariant[];
  /** Strength a casualty adds (the futility), and the live-pour FLOOR. The cap is
   *  `max(minStreamCap, round(strength))`, strength capped by the wake's variant. */
  strengthPerKill: number;
  minStreamCap: number;
  /** Seconds between stream spawns, and how many pour per tick. */
  streamInterval: number;
  streamBatch: [number, number];
  /** Ambient amplifier (+count multiplier) on the covered zone's OWN undead. */
  ambientAmp: number;
  ambientCountMul: number;
  /** The CHANCE the tide CONSUMES a zone's active event on collision, and WHICH
   *  event kinds it can (weather is intentionally NOT consumable). */
  consumeChance: number;
  consume: { demonInvasion: boolean; crusade: boolean };
  /** The Necropolis uber config. */
  necropolis: NecropolisCfg;
  /** Banner colour (falls back to the undead faction colour, then the violet). */
  color?: string;
}

/** What the engine reads to stream the host into a caught zone. */
export interface DeadwakeInfo {
  /** The wake covering the zone (so its leader's death can ROUT that wake). */
  id: string;
  faction: string;
  color: string;
  /** The wake's node coordinate — the engine derives the ENTRY SIDE (the exit the
   *  host pours in from) from this relative to the zone's own node. */
  coord: MapCoord;
  /** The carried horde size, and the live pour-cap it sustains in the zone. */
  strength: number;
  streamCap: number;
  variant: string;
  levelBonus: number;
  ambientAmp: number;
  ambientCountMul: number;
  leaderLevelBonus: number;
  leaderXpFloor: number;
}

/** What the engine reads to materialize / chase the Necropolis. */
export interface NecropolisInfo {
  id: string;
  coord: MapCoord;
  /** The bound off-graph arena id once the player has entered it (else null). */
  zoneId: string | null;
  /** Set once its boss is felled — it holds position + stops generating, and fully
   *  crumbles (the icon disappears) when the player next leaves the arena. */
  defeated: boolean;
}

/** One rolling tide — its drift + its rolled variant's carried-horde model. */
interface ActiveWake {
  id: string;
  coord: MapCoord;
  heading: number;   // radians
  age: number;
  strength: number;
  // resolved from the rolled variant (so deadwakeOn / bolster stay simple):
  maxStrength: number;
  roamGrowth: number;
  engagedGrowth: number;
  color: string;
  variant: string;
}

/** The travelling seat of the dead — its own Deadwake generator. */
interface ActiveNecropolis {
  id: string;
  coord: MapCoord;
  heading: number;
  age: number;
  zoneId: string | null; // the off-graph arena, bound when the player first enters
  defeated: boolean;     // its boss felled — holds position + stops generating
}

export class DeadwakeField implements WorldOverlay {
  readonly id = 'deadwake';

  /** The hidden Corpse Accumulation counter, and whether an undead kill has ARMED
   *  it. While a Necropolis stands, accumulation runs regardless of `armed`. */
  counter = 0;
  armed = false;

  /** Charted zones the tide has NEWLY collided with AND won the consume roll on —
   *  the engine drains this each frame to DEPLETE their world-event. */
  readonly consumedZones: string[] = [];

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: DeadwakeSurge;
  private wakes: ActiveWake[] = [];
  private necropolis: ActiveNecropolis | null = null;
  private coveredLast = new Set<string>();
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: DeadwakeSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const cyc = dayCycle(view.time);
    // light 1 = noon, 0 = midnight → night = (1 - light) drives faster drift + drip.
    const night = clamp(1 - cyc.light, 0, 1);
    // A standing (un-defeated) Necropolis is its OWN generator: it forces
    // accumulation on (the counter ticks regardless of the player's arm state).
    const generating = this.armed || this.necroGenerating();

    // 1. SIMULATED accrual — a player-independent drip (gate-gated; a Necropolis
    //    keeps it ticking even when the player never re-armed it).
    if (generating && g.active && this.counter < this.cfg.threshold) {
      const a = this.cfg.accrual;
      const dripMul = a.simDripDayMul + (a.simDripNightMul - a.simDripDayMul) * night;
      this.counter += a.simDripPerSec * dripMul * dt;
    }

    // 2. DRIFT + SWELL — every tide swells (its variant's roam vs engaged rate) and
    //    rolls along its heading… UNLESS it is pouring into the player's own zone,
    //    where it HOLDS POSITION. The Necropolis always travels (the player chases).
    const speed = this.cfg.daySpeed + (this.cfg.nightSpeed - this.cfg.daySpeed) * night;
    const bounds = this.visibleBounds(view);
    const here = view.byId[view.currentZoneId];
    for (const w of this.wakes) {
      w.age += dt;
      const eng = this.engaged(w, here);
      w.strength = Math.min(w.maxStrength, w.strength + (eng ? w.engagedGrowth : w.roamGrowth) * dt);
      if (eng) continue; // pouring into the player's zone — it holds
      this.drift(w, speed, dt, bounds, view.terrain);
    }
    if (this.necropolis) {
      this.necropolis.age += dt;
      // It STOPS to be fought: once the player is inside its arena (or once it has
      // been defeated) the seat HOLDS POSITION — only its roaming-the-map phase
      // drifts (slowly), so the player can deliberately approach and engage.
      const inside = !!this.necropolis.zoneId && view.currentZoneId === this.necropolis.zoneId;
      if (!this.necropolis.defeated && !inside) {
        this.drift(this.necropolis, this.cfg.necropolis.driftSpeed, dt, bounds, view.terrain);
      }
    }
    // NB: no lifespan cull — tides persist until ROUTED; the Necropolis until PURGED.

    // 3. NECROPOLIS FUSION — two tides colliding fuse into the (single) Necropolis.
    if (!this.necropolis && this.wakes.length >= 2) this.maybeFuseNecropolis();

    // 4. STEP cadence: wander headings, then break a Deadwake loose when the counter
    //    crests. New tides spawn FROM the Necropolis when one stands.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      for (const w of this.wakes) {
        if (this.engaged(w, here)) continue;
        if (this.rng.chance(this.cfg.turnChance)) w.heading += this.rng.range(-this.cfg.turnAmount, this.cfg.turnAmount);
      }
      if (g.active && generating && this.counter >= this.cfg.threshold) {
        if (this.wakes.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) {
          this.breakLoose(view); // spawns a tide + resets/disarms the counter
        } else {
          // At the tide cap — the buildup dissipates UNSPENT (still resets/disarms),
          // so a fresh tide never auto-fires the instant a slot frees / one routs.
          this.counter = 0;
          this.armed = false;
        }
      }
    }

    // 5. COLLISION → CONSUME — charted zones newly rolled onto roll a consume chance.
    this.updateCoverage(view);
  }

  onNodeCharted(): void { /* wakes target coordinates, not freshly-charted ids */ }

  /** A covered zone's own undead swell on top of the streamed host. */
  affectSpawns(zone: ZoneDef): SpawnBias {
    const info = this.deadwakeOn(zone.id);
    if (!info) return NO_BIAS;
    return { countMul: info.ambientCountMul, factionMul: { [info.faction]: info.ambientAmp }, injectFactions: [] };
  }

  renderMap(): MapLayer {
    let under = '', over = '';
    for (const w of this.wakes) {
      const x = w.coord.x.toFixed(1), y = w.coord.y.toFixed(1), col = w.color;
      for (const [m, op] of [[1, 0.06], [0.6, 0.10], [0.3, 0.14]] as const) {
        under += `<circle cx="${x}" cy="${y}" r="${(this.cfg.radius * m).toFixed(1)}" fill="${col}" fill-opacity="${op}"/>`;
      }
      under += `<circle cx="${x}" cy="${y}" r="${this.cfg.radius.toFixed(1)}" fill="none" `
        + `stroke="${col}" stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="4 4"/>`;
      over += `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="${col}" stroke-width="2" `
        + `stroke-opacity="0.9"><animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/></circle>`;
    }
    // The Necropolis: a larger pale-bone reach with a slow ominous pulse.
    if (this.necropolis) {
      const x = this.necropolis.coord.x.toFixed(1), y = this.necropolis.coord.y.toFixed(1);
      const R = this.cfg.necropolis.accessRadius;
      for (const [m, op] of [[1, 0.05], [0.6, 0.09], [0.3, 0.13]] as const) {
        under += `<circle cx="${x}" cy="${y}" r="${(R * m).toFixed(1)}" fill="${NECRO_BONE}" fill-opacity="${op}"/>`;
      }
      under += `<circle cx="${x}" cy="${y}" r="${R.toFixed(1)}" fill="none" stroke="${NECRO_BONE}" `
        + `stroke-opacity="0.6" stroke-width="1.5" stroke-dasharray="6 5"/>`;
      over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${NECRO_BONE}" stroke-width="2.5" `
        + `stroke-opacity="0.95"><animate attributeName="r" values="9;15;9" dur="2.6s" repeatCount="indefinite"/></circle>`;
    }
    return { under, over };
  }

  // --- accessors the engine reads --------------------------------------------

  /** Live config (the engine reads the stream / consume / necropolis knobs). */
  surge(): DeadwakeSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): a washing tide. */
  activityAt(zoneId: string): number { return this.deadwakeOn(zoneId) ? 1 : 0; }

  /** The Deadwake currently washing over a zone, or null. Spares non-streamable
   *  ground (caves / special / event-owned / sanctuaries / forbidden biomes). */
  deadwakeOn(zoneId: string): DeadwakeInfo | null {
    const z = this.nodesById[zoneId];
    if (!z || !this.streamable(z)) return null;
    for (const w of this.wakes) {
      if (coordDist(z.map, w.coord) <= this.cfg.radius) {
        return {
          id: w.id, faction: this.cfg.faction, color: w.color,
          coord: { x: w.coord.x, y: w.coord.y },
          strength: w.strength, streamCap: this.streamCapFor(w.strength), variant: w.variant,
          levelBonus: this.cfg.floodLevelBonus, ambientAmp: this.cfg.ambientAmp,
          ambientCountMul: this.cfg.ambientCountMul,
          leaderLevelBonus: this.cfg.leaderLevelBonus, leaderXpFloor: this.cfg.leaderXpFloor,
        };
      }
    }
    return null;
  }

  /** The standing Necropolis, or null. */
  necropolisInfo(): NecropolisInfo | null {
    const n = this.necropolis;
    return n ? { id: n.id, coord: { x: n.coord.x, y: n.coord.y }, zoneId: n.zoneId, defeated: n.defeated } : null;
  }

  /** Bind the off-graph arena id the engine minted for the Necropolis (once). */
  bindNecropolisZone(zoneId: string): void { if (this.necropolis) this.necropolis.zoneId = zoneId; }

  /** The player felled the Bonelord — mark the seat DEFEATED so it holds position
   *  and stops generating tides. It fully crumbles (cullNecropolis) when the player
   *  next LEAVES the arena (so the icon disappears on exit, not mid-fight). */
  markNecropolisDefeated(): boolean {
    if (!this.necropolis) return false;
    this.necropolis.defeated = true;
    // Quiet the whole cycle while it crumbles — a defeated seat generates nothing,
    // and the player's own armed counter shouldn't break a fresh tide loose in the
    // window before they leave (the full cull on exit resets it again anyway).
    this.counter = 0;
    this.armed = false;
    return true;
  }

  /** The player PURGED the Necropolis — DISPERSE every active tide and clear the
   *  seat, then reset the cycle (re-seed needed). Returns whether one was purged. */
  cullNecropolis(): boolean {
    if (!this.necropolis) return false;
    this.necropolis = null;
    this.wakes = [];
    this.coveredLast = new Set();
    this.counter = 0;
    this.armed = false;
    return true;
  }

  /** The player slew an undead foe — a VERY LOW chance ARMS the dormant counter. */
  noteUndeadSlain(): void {
    if (this.armed || !this.gate().active) return;
    if (this.rng.chance(this.cfg.armChance)) this.armed = true;
  }

  /** A corpse-making event (death / summon / consumed corpse) feeds the counter.
   *  No-op until ARMED or while a Necropolis generates (and the gate is open). */
  accrue(kind: 'death' | 'summon' | 'corpse', undead: boolean): void {
    if ((!this.armed && !this.necroGenerating()) || !this.gate().active || this.counter >= this.cfg.threshold) return;
    const a = this.cfg.accrual;
    const base = kind === 'death' ? a.death : kind === 'summon' ? a.summon : a.corpse;
    this.counter += base * (undead ? a.undeadMul : 1);
  }

  /** A streamed undead fell — the tide SWELLS (each casualty feeds the next). */
  bolster(coord: MapCoord): void {
    for (const w of this.wakes) {
      if (coordDist(w.coord, coord) <= this.cfg.radius) {
        w.strength = Math.min(w.maxStrength, w.strength + this.cfg.strengthPerKill);
        return;
      }
    }
  }

  /** The player cut down a Deadwake's host-leader — ROUT the wake covering this
   *  coordinate. Returns whether one was actually routed (it may have rolled on). */
  routeWakeAt(coord: MapCoord): boolean {
    let bestIdx = -1, bestD = Infinity;
    for (let i = 0; i < this.wakes.length; i++) {
      const d = coordDist(this.wakes[i].coord, coord);
      if (d <= this.cfg.radius && d < bestD) { bestD = d; bestIdx = i; }
    }
    if (bestIdx < 0) return false;
    this.wakes.splice(bestIdx, 1);
    return true;
  }

  activeCount(): number { return this.wakes.length; }
  hasNecropolis(): boolean { return !!this.necropolis; }

  /** 0..1 progress of the hidden counter (drives the marker "tell" + dev read). */
  counterFrac(): number { return clamp(this.counter / Math.max(1, this.cfg.threshold), 0, 1); }

  /** Read-only snapshot for the map markers / tests. */
  peek(): ReadonlyArray<{ id: string; coord: MapCoord; age: number; strength: number; color: string; variant: string }> {
    return this.wakes.map(w => ({ id: w.id, coord: { x: w.coord.x, y: w.coord.y }, age: w.age, strength: w.strength, color: w.color, variant: w.variant }));
  }

  // --- dev seams (the QA Event tab) ------------------------------------------

  /** DEV: break a Deadwake loose CENTRED on the given (current) zone so it pours in
   *  place at once. Rolls a variant like a real one. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here)) return false;
    this.wakes.push(this.makeWake({ x: here.map.x, y: here.map.y }));
    return true;
  }

  /** DEV: jump the counter to its threshold (arming it) so a tide breaks loose. */
  devMaxCounter(): void { this.armed = true; this.counter = this.cfg.threshold; }

  /** DEV: force two tides to FUSE into a Necropolis at the current zone (spawns the
   *  pair on top of each other so the next update fuses them). (QA only.) */
  devForceNecropolis(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here) || this.necropolis) return false;
    const c = { x: here.map.x, y: here.map.y };
    this.wakes.push(this.makeWake(c), this.makeWake({ x: c.x + 4, y: c.y + 4 }));
    this.maybeFuseNecropolis();
    return !!this.necropolis;
  }

  // --- internals -------------------------------------------------------------

  private streamCapFor(strength: number): number {
    return Math.max(this.cfg.minStreamCap, Math.round(strength));
  }

  /** Is a NON-defeated Necropolis standing (so it generates tides on its own)? */
  private necroGenerating(): boolean { return !!this.necropolis && !this.necropolis.defeated; }

  /** Roll a variant and build a fresh wake at a coord (seeded at the variant). */
  private makeWake(coord: MapCoord): ActiveWake {
    const v = this.pickVariant();
    return {
      id: `wake_${this.seq++}`, coord: { x: coord.x, y: coord.y },
      heading: this.rng.range(0, Math.PI * 2), age: 0,
      strength: v.startStrength, maxStrength: v.maxStrength,
      roamGrowth: v.roamGrowthPerSec, engagedGrowth: v.engagedGrowthPerSec,
      color: v.color ?? this.cfg.color ?? FACTION_COLORS[this.cfg.faction] ?? DEADWAKE_VIOLET,
      variant: v.name,
    };
  }

  private pickVariant(): DeadwakeVariant {
    return this.rng.weighted(this.cfg.variants);
  }

  /** Advance a drifting point along its heading, reflecting off the visible
   *  bounds AND off the COAST: the dead are a LAND-BOUND tide (the world map
   *  has a terrain collision layer now), so a step that would land in open
   *  ocean bounces instead — no front marches the sea ad infinitum. Bridges
   *  pass (walkable ground). The axis test mirrors the bounds idiom. */
  private drift(p: { coord: MapCoord; heading: number }, speed: number, dt: number,
                bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
                terrain?: (c: MapCoord) => 'land' | 'ocean' | 'bridge'): void {
    const nx = p.coord.x + Math.cos(p.heading) * speed * dt;
    const ny = p.coord.y + Math.sin(p.heading) * speed * dt;
    if (terrain && terrain({ x: nx, y: ny }) === 'ocean') {
      const oceanX = terrain({ x: nx, y: p.coord.y }) === 'ocean';
      const oceanY = terrain({ x: p.coord.x, y: ny }) === 'ocean';
      if (oceanX) p.heading = Math.PI - p.heading;
      if (oceanY) p.heading = -p.heading;
      if (!oceanX && !oceanY) p.heading += Math.PI; // a corner cove — turn back
      return; // hold this step; the next tick moves along the new heading
    }
    p.coord.x = nx;
    p.coord.y = ny;
    if (!bounds) return;
    if (p.coord.x < bounds.minX) { p.coord.x = bounds.minX; p.heading = Math.PI - p.heading; }
    else if (p.coord.x > bounds.maxX) { p.coord.x = bounds.maxX; p.heading = Math.PI - p.heading; }
    if (p.coord.y < bounds.minY) { p.coord.y = bounds.minY; p.heading = -p.heading; }
    else if (p.coord.y > bounds.maxY) { p.coord.y = bounds.maxY; p.heading = -p.heading; }
  }

  /** May a Deadwake STREAM into / hold on / consume a zone? Kept in LOCKSTEP with
   *  the engine's stream guard (world.ts updateDeadwakeStream): never a cave, a
   *  special arena, a floating/eventOwned event node, a sanctuary, or forbidden
   *  ground (else a tide could stall on / consume a zone that streams nothing). */
  private streamable(z: ZoneDef): boolean {
    return z.caveDepth == null && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed('deadwake', z);
  }

  /** Is the wake currently POURING into the player's zone (so it holds position)? */
  private engaged(w: ActiveWake, here: ZoneDef | undefined): boolean {
    return !!here && this.streamable(here) && coordDist(here.map, w.coord) <= this.cfg.radius;
  }

  /** The bounding box of the VISIBLE (charted) map, padded — drifters reflect off
   *  these edges so they roll through explored ground rather than off into the void. */
  private visibleBounds(view: OverlayView): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, seen = 0;
    for (const n of view.nodes) {
      if (!view.visited.has(n.id) || n.caveDepth != null) continue;
      seen++;
      if (n.map.x < minX) minX = n.map.x;
      if (n.map.x > maxX) maxX = n.map.x;
      if (n.map.y < minY) minY = n.map.y;
      if (n.map.y > maxY) maxY = n.map.y;
    }
    if (!seen) return null;
    const pad = this.cfg.radius * 1.5;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  /** A Deadwake breaks loose: from the NECROPOLIS coord if one stands (it is the
   *  generator), else a short way off the player (a telegraph, not point-blank).
   *  Then RESET + DISARM the counter (re-seed needed for the next). */
  private breakLoose(view: OverlayView): void {
    let origin: MapCoord;
    if (this.necropolis) {
      origin = { x: this.necropolis.coord.x, y: this.necropolis.coord.y };
    } else {
      const here = view.byId[view.currentZoneId];
      const bounds = this.visibleBounds(view);
      origin = here ? { x: here.map.x, y: here.map.y }
        : bounds ? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
          : { x: 0, y: 0 };
    }
    // A tide is BORN ashore: re-roll the offset up to a few times if the spot
    // is open ocean (the coast bounce would shepherd it back anyway, but a
    // mid-sea birth looks broken for the seconds it takes).
    let at = { x: origin.x, y: origin.y };
    for (let tries = 0; tries < 6; tries++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const off = this.rng.range(this.cfg.radius * 1.3, this.cfg.radius * 2.2);
      at = { x: origin.x + Math.cos(ang) * off, y: origin.y + Math.sin(ang) * off };
      if (view.terrain(at) !== 'ocean') break;
    }
    this.wakes.push(this.makeWake(at));
    this.counter = 0;
    this.armed = false;
  }

  /** Two tides whose centres come within collideDist FUSE into the (single)
   *  Necropolis at their midpoint; the pair is consumed into the seat. */
  private maybeFuseNecropolis(): void {
    for (let i = 0; i < this.wakes.length; i++) {
      for (let j = i + 1; j < this.wakes.length; j++) {
        if (coordDist(this.wakes[i].coord, this.wakes[j].coord) > this.cfg.necropolis.collideDist) continue;
        const a = this.wakes[i].coord, b = this.wakes[j].coord;
        this.necropolis = {
          id: `necro_${this.seq++}`,
          coord: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          heading: this.rng.range(0, Math.PI * 2), age: 0, zoneId: null, defeated: false,
        };
        this.wakes.splice(j, 1);
        this.wakes.splice(i, 1);
        return;
      }
    }
  }

  /** Recompute which charted zones the tide covers; for each NEWLY-collided zone,
   *  roll the consume chance and (on a win) emit it to the depletion drain. */
  private updateCoverage(view: OverlayView): void {
    const covered = new Set<string>();
    for (const z of view.nodes) {
      if (!view.visited.has(z.id) || !this.streamable(z)) continue;
      for (const w of this.wakes) {
        if (coordDist(z.map, w.coord) <= this.cfg.radius) { covered.add(z.id); break; }
      }
    }
    for (const id of covered) {
      if (this.coveredLast.has(id)) continue;          // already rolled this collision
      if (id === view.currentZoneId) continue;          // the player's zone gets the STREAM, never a consume
      if (this.rng.chance(this.cfg.consumeChance)) this.consumedZones.push(id);
    }
    this.coveredLast = covered;
  }
}

// --- map markers (registered on import — zero panels.ts edits) ----------------
//
// Each rolling Deadwake pins a drifting coffin glyph at its core; the NECROPOLIS
// pins a pale skull-throne. Both fog:'always' (a threat you can see coming and
// must chase), riding their live coordinates so the markers MOVE across the map.
registerMarkerSource((world: World): MapMarker[] => {
  const df = world.sim.deadwakeField;
  if (!df) return [];
  const out: MapMarker[] = df.peek().map(w => ({
    id: `deadwake-${w.id}`, coord: { x: w.coord.x, y: w.coord.y },
    glyph: '⚰', fill: '#160e1e', stroke: w.color, text: '#d8c2ec', r: 10,
    title: `Deadwake — ${w.variant} (${Math.round(w.strength)} strong)`, fog: 'always', z: 18,
  }));
  const n = df.necropolisInfo();
  if (n) out.push({
    id: `necropolis-${n.id}`, coord: { x: n.coord.x, y: n.coord.y },
    glyph: '☗', fill: '#1a1812', stroke: n.defeated ? '#6a6458' : NECRO_BONE, text: '#f0e8cc', r: 12,
    title: n.defeated
      ? 'The Necropolis is broken — leave its halls and the cycle begins anew.'
      : 'The Necropolis — the seat of the dead drifts near. Reach a zone it touches, take the gate, and purge it.',
    fog: 'always', z: 21,
  });
  return out;
});

// --- zone-info row (registered on import) ------------------------------------
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.deadwakeField?.deadwakeOn(zoneId);
  if (!info) return [];
  // The host only POURS into the player's OWN zone; a covered neighbour merely has
  // the tide roll over it (a consume risk + an ambient swell), not a stream.
  const streaming = zoneId === world.zone.id;
  return [{
    kind: 'event', icon: '⚰', color: info.color, label: `Deadwake · ${info.variant}`,
    detail: streaming ? `an undead tide pours through — ${info.streamCap} strong` : 'an undead tide rolls over this ground',
    z: 16,
  }];
});
