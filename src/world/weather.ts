// ---------------------------------------------------------------------------
// WEATHER — drifting fronts over the world-map node space.
//
// Weather is a set of moving cells, each a kind (rain, storm, fog, ashfall,
// blood moon) with a position and velocity in the SAME coordinate space the
// World Map draws zones in. Fronts are born at a random charted node, drift,
// swell and fade on a triangle of intensity, then dissipate. A zone's weather
// is the strongest front covering its node; that weather reweights the zone's
// spawn table toward whatever the storm stirs up, scaled by intensity. The
// front births and drift use the field's OWN seeded Rng so a run's weather is
// coherent and replayable; nothing here touches the global spawn rolls.
// ---------------------------------------------------------------------------

import { clamp, type Vec2 } from '../core/math';
import { Rng } from '../core/rng';
import type { ZoneDef } from '../data/zones';
import { dayCycle, type DayPhase } from './daynight';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from './overlay';
import { WEATHER_COLORS } from './palette';
import { scaledCap } from '../packages/frequency';

export type WeatherKind = 'clear' | 'rain' | 'storm' | 'fog' | 'ashfall' | 'bloodmoon';

export interface WeatherFront {
  kind: WeatherKind;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  /** 0..1 ramp: fades in, plateaus, fades out across its life. */
  intensity: number;
  age: number;
  life: number;
}

/** An environmental hazard a front rains down on whoever stands beneath it.
 *  Pure data (a skill id + cadence) so the engine, not weather, casts it —
 *  any front can be given one without weather knowing what a skill is. */
export interface WeatherStrike {
  skillId: string;
  radius: number;
  /** Telegraph time before the bolt lands (seconds). */
  telegraph: number;
  /** Strikes per second at FULL intensity (scaled down by the front's ramp). */
  ratePerSec: number;
}

interface WeatherDef {
  label: string;
  /** Spawn-count multiplier at full intensity. */
  countMul: number;
  /** Per-faction weight multiplier at full intensity. */
  factionMul: Record<string, number>;
  /** Environmental strikes while you stand under this front (optional). */
  strike?: WeatherStrike;
  /** Fraction of the front's LIFE spent ramping in/out (default 0.4) — a
   *  storm that gathers in minutes vs one that breaks all at once is this
   *  one number. Pairs with the renderer's per-kind display crossfade. */
  rampFrac?: number;
  /** DIRECTIONAL WIND strength (0..1) this front drives at full intensity.
   *  The wind's DIRECTION is the front's own drift vector — the storm blows
   *  the way it travels. Consumed by World.windAt: headwinds slow movement,
   *  tailwinds hasten it, anchored solids upwind shelter you (WIND_CFG). */
  wind?: number;
}

export const WEATHER_DEFS: Record<WeatherKind, WeatherDef> = {
  clear: { label: 'Clear', countMul: 1.0, factionMul: {} },
  rain: { label: 'Rain', countMul: 1.05, factionMul: { sylvan: 1.3, wild: 1.15 }, wind: 0.4 },
  storm: {
    label: 'Storm', countMul: 1.25, factionMul: { elemental: 1.8 },
    // The sky calls lightning down at random — more often the harder it rages.
    strike: { skillId: 'storm_call', radius: 80, telegraph: 0.7, ratePerSec: 1.3 },
    rampFrac: 0.15, // storms BREAK — a short gather, then full rage
    wind: 0.9,      // — and they SHOVE: the strongest gale in the sky
  },
  fog: { label: 'Fog', countMul: 1.15, factionMul: { undead: 1.3, gnoll: 1.3 }, rampFrac: 0.5, wind: 0.12 },
  ashfall: { label: 'Ashfall', countMul: 1.2, factionMul: { elemental: 1.4, goblin: 1.2 }, wind: 0.3 },
  bloodmoon: { label: 'Blood Moon', countMul: 1.6, factionMul: { undead: 2.0, wild: 1.3 }, wind: 0.18 },
};

// Which kinds the sky favours at each hour (clear = simply fewer fronts).
const KIND_WEIGHTS: Record<DayPhase, { kind: WeatherKind; weight: number }[]> = {
  day: [{ kind: 'rain', weight: 3 }, { kind: 'fog', weight: 2 }, { kind: 'storm', weight: 1 }, { kind: 'ashfall', weight: 1 }],
  dusk: [{ kind: 'fog', weight: 3 }, { kind: 'rain', weight: 2 }, { kind: 'storm', weight: 2 }, { kind: 'ashfall', weight: 1 }],
  night: [{ kind: 'storm', weight: 3 }, { kind: 'fog', weight: 2 }, { kind: 'bloodmoon', weight: 2 }, { kind: 'rain', weight: 1 }],
  dawn: [{ kind: 'fog', weight: 3 }, { kind: 'rain', weight: 2 }, { kind: 'storm', weight: 1 }],
};

const STEP = 0.5;          // fixed lifecycle step (seconds)
const MAX_FRONTS = 4;
const SPAWN_CHANCE = 0.06; // per step, while under the cap — fronts are rarer now

export class WeatherField implements WorldOverlay {
  readonly id = 'weather' as const;
  readonly fronts: WeatherFront[] = [];
  private rng: Rng;
  private acc = 0;
  /** Front-spawn-rate multiplier from the Storm Fronts package's pressure
   *  (set by WorldSim). 0 ⇒ no new fronts; 1 ⇒ today's cadence. */
  spawnScale = 1;
  /** Global concurrency crank (frequency.concurrency, set by WorldSim) — lifts the
   *  max-concurrent-fronts cap so a frequency boost shows more storms at once. */
  concurrencyScale = 1;

  constructor(rng: Rng) {
    this.rng = rng;
  }

  update(dt: number, view: OverlayView): void {
    // Drift and intensity advance smoothly every frame.
    for (const f of this.fronts) {
      f.pos.x += f.vel.x * dt;
      f.pos.y += f.vel.y * dt;
      f.age += dt;
      // Smooth ease in/out (smoothstep) over the kind's own ramp fraction,
      // so a fog seeps in over minutes while a storm gathers fast and BREAKS.
      const rampFrac = WEATHER_DEFS[f.kind].rampFrac ?? 0.4;
      const u = clamp(Math.min(f.age, f.life - f.age) / (f.life * rampFrac), 0, 1);
      f.intensity = u * u * (3 - 2 * u);
    }
    // Cull the spent.
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      if (this.fronts[i].age >= this.fronts[i].life) this.fronts.splice(i, 1);
    }
    // Births happen on the fixed step.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.maybeSpawn(view);
    }
  }

  onNodeCharted(): void {
    // Weather lives in shared node-space and covers any node by distance;
    // a new node needs no seeding.
  }

  /** The strongest front covering this zone's node, or null (= clear). */
  sample(zone: ZoneDef): WeatherFront | null {
    let best: WeatherFront | null = null;
    let bestS = 0.04; // ignore trivially weak coverage
    for (const f of this.fronts) {
      const d = Math.hypot(f.pos.x - zone.map.x, f.pos.y - zone.map.y);
      if (d > f.radius) continue;
      const s = f.intensity * (1 - d / f.radius);
      if (s > bestS) { bestS = s; best = f; }
    }
    return best;
  }

  affectSpawns(zone: ZoneDef): SpawnBias {
    const f = this.sample(zone);
    if (!f) return NO_BIAS;
    const def = WEATHER_DEFS[f.kind];
    const k = f.intensity;
    const factionMul: Record<string, number> = {};
    for (const [fac, m] of Object.entries(def.factionMul)) factionMul[fac] = 1 + (m - 1) * k;
    return { countMul: 1 + (def.countMul - 1) * k, factionMul, injectFactions: [] };
  }

  renderMap(): MapLayer {
    let under = '';
    for (const f of this.fronts) {
      const col = WEATHER_COLORS[f.kind];
      const op = (0.08 + 0.20 * f.intensity).toFixed(3);
      under += `<circle cx="${f.pos.x.toFixed(1)}" cy="${f.pos.y.toFixed(1)}" `
        + `r="${f.radius.toFixed(1)}" fill="${col}" fill-opacity="${op}">`
        + `<title>${WEATHER_DEFS[f.kind].label}</title></circle>`;
    }
    return { under, over: '' };
  }

  private maybeSpawn(view: OverlayView): void {
    if (this.fronts.length >= scaledCap(MAX_FRONTS, this.concurrencyScale)) return;
    if (view.nodes.length === 0) return;
    if (this.spawnScale <= 0) return;
    if (!this.rng.chance(SPAWN_CHANCE * this.spawnScale)) return;
    const anchor = this.rng.pick(view.nodes).map;
    const phase = dayCycle(view.time).phase;
    const kind = this.rng.weighted(KIND_WEIGHTS[phase]).kind;
    const dir = this.rng.range(0, Math.PI * 2);
    const speed = this.rng.range(1.5, 4.5); // node-units/sec — a slow, legible crawl
    this.fronts.push({
      kind,
      pos: { x: anchor.x + this.rng.range(-40, 40), y: anchor.y + this.rng.range(-40, 40) },
      vel: { x: Math.cos(dir) * speed, y: Math.sin(dir) * speed },
      radius: this.rng.range(95, 150),
      intensity: 0,
      age: 0,
      life: this.rng.range(140, 280), // longer-lived fronts = slower-changing sky
    });
  }
}
