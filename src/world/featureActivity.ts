import { hash01 } from '../engine/hash';
import { registerEventFront, type EventFrontPin } from '../engine/eventWeather';
import { skyOf, type ZoneDef } from '../data/zones';
import { featuresInRect, mapFeatureKinds, mapFeatureKind, ATLAS_CFG, type MapFeature } from './atlas';
import { NO_BIAS, type WorldOverlay, type OverlayView, type MapLayer } from './overlay';
import { registerZoneInfoSource } from './zoneInfo';
import { WEATHER_DEFS } from './weather';

export interface FeaturePhase {
  id: string; label: string; seconds: number; color: string;
  /** A regional sky plus an optional, smaller hazardous core. */
  weather?: { kind: string; radius: number; intensity: number };
  core?: { kind: string; radius: number; intensity: number };
  /** Map-space outflow reach; grows over this phase, then hands back the ground. */
  flows?: { count: number; reach: number; width: number; color: string };
}
export interface FeatureCycle { id: string; phases: FeaturePhase[] }
const CYCLES = new Map<string, FeatureCycle>();
export function registerFeatureCycle(def: FeatureCycle): void {
  if (!def.id || !def.phases.length || new Set(def.phases.map(p => p.id)).size !== def.phases.length)
    throw new Error('feature activity requires unique phases');
  for (const p of def.phases) {
    if (!p.id || !Number.isFinite(p.seconds) || p.seconds <= 0) throw new Error(`${def.id}: invalid phase duration`);
    for (const sky of [p.weather, p.core]) if (sky && (!WEATHER_DEFS[sky.kind] || !Number.isFinite(sky.radius)
      || sky.radius <= 0 || !Number.isFinite(sky.intensity) || sky.intensity <= 0 || sky.intensity > 1)) throw new Error(`${def.id}: invalid activity weather`);
    if (p.flows && (!Number.isInteger(p.flows.count) || p.flows.count < 1 || p.flows.count > 8
      || !Number.isFinite(p.flows.reach) || p.flows.reach <= 0 || !Number.isFinite(p.flows.width) || p.flows.width <= 0)) throw new Error(`${def.id}: invalid flows`);
  }
  CYCLES.set(def.id, structuredClone(def));
}
export const featureCycle = (id: string) => CYCLES.get(id);
/** Pure periodic phase; no per-frame rolls, discovery-triggered clock, or missed
 * transitions after long steps. Save/co-op already carry seed and world time. */
export function featurePhase(feature: MapFeature, seed: number, time: number, cycle: FeatureCycle) {
  const period = cycle.phases.reduce((n, p) => n + p.seconds, 0);
  const offset = hash01(Math.round(feature.seat.x), Math.round(feature.seat.y), seed ^ 0x701ca10) * period;
  let t = ((Math.max(0, time) + offset) % period + period) % period;
  for (const phase of cycle.phases) {
    if (t < phase.seconds) return { phase, progress: t / phase.seconds, remaining: phase.seconds - t };
    t -= phase.seconds;
  }
  return { phase: cycle.phases[0], progress: 0, remaining: cycle.phases[0].seconds };
}

export class FeatureActivityField implements WorldOverlay {
  readonly id = 'feature_activity';
  readonly mapLabel = 'Natural activity';
  readonly persistence = 'durable' as const;
  private time = 0;
  private cache = new Map<string, MapFeature[]>();
  constructor(readonly seed: number) {}
  update(_dt: number, view: OverlayView): void { this.time = view.time; }
  onNodeCharted(): void {}
  affectSpawns(): typeof NO_BIAS { return NO_BIAS; }
  snapshot(): unknown { return { time: this.time }; }
  restore(raw: unknown): void {
    const time = (raw as { time?: unknown } | null)?.time;
    if (typeof time === 'number' && Number.isFinite(time)) this.time = Math.max(0, time);
    this.cache.clear();
  }
  private nearby(at: { x: number; y: number }): MapFeature[] {
    const defs = mapFeatureKinds().filter(d => d.activity && CYCLES.has(d.activity));
    const reach = Math.max(ATLAS_CFG.reveal.radius + ATLAS_CFG.reveal.feather,
      ...defs.flatMap(d => CYCLES.get(d.activity!)!.phases.flatMap(p => [p.weather?.radius ?? 0, p.core?.radius ?? 0])));
    const key = `${at.x}/${at.y}/${reach}/${defs.map(d => d.id).join('/')}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const found = featuresInRect({ x: at.x - reach, y: at.y - reach }, { x: at.x + reach, y: at.y + reach }, this.seed, defs.map(d => d.id));
    if (this.cache.size >= 512) this.cache.clear();
    this.cache.set(key, found);
    return found;
  }
  state(feature: MapFeature, time = this.time) {
    const cycle = CYCLES.get(mapFeatureKind(feature.kind)?.activity ?? '');
    return cycle ? featurePhase(feature, this.seed, time, cycle) : null;
  }
  sample(zone: ZoneDef, time = this.time): EventFrontPin | null {
    if ((zone.dimension ?? 'surface') !== 'surface' || zone.kind === 'town' || zone.kind === 'port' || skyOf(zone) === 'sheltered') return null;
    const at = zone.geo?.atlas?.sample ?? zone.map;
    let best: EventFrontPin | null = null;
    for (const f of this.nearby(at)) {
      const state = this.state(f, time);
      if (!state) continue;
      const distance = Math.hypot(at.x - f.seat.x, at.y - f.seat.y);
      // The core deliberately supersedes its own ash plume. Other activity
      // sources compete through the existing strongest-front policy.
      const sky = state.phase.core && distance < state.phase.core.radius ? state.phase.core : state.phase.weather;
      if (!sky || distance >= sky.radius) continue;
      const intensity = sky.intensity * (1 - distance / sky.radius);
      if (!best || intensity > best.intensity) best = { kind: sky.kind, intensity, pos: { ...f.seat }, radius: sky.radius };
    }
    return best;
  }
  describe(zone: ZoneDef, time: number) {
    if ((zone.dimension ?? 'surface') !== 'surface') return [];
    const at = zone.geo?.atlas?.sample ?? zone.map;
    return this.nearby(at).filter(f => Math.hypot(at.x - f.seat.x, at.y - f.seat.y) <= (mapFeatureKind(f.kind)?.reach ?? 0))
      .flatMap(f => {
        const s = this.state(f, time);
        return s ? [{ kind: 'condition' as const, icon: '⛰', color: s.phase.color,
          label: `${f.name} — ${s.phase.label}`, detail: `${Math.ceil(s.remaining)}s until the next phase` }] : [];
      });
  }
  renderMap(nodes: ZoneDef[]): MapLayer {
    // Caller supplies the knowledge-filtered graph; no far event expands it.
    const features = new Map<string, MapFeature>();
    for (const node of nodes) for (const f of this.nearby(node.map)) {
      if (Math.hypot(f.seat.x - node.map.x, f.seat.y - node.map.y) <= ATLAS_CFG.reveal.radius + ATLAS_CFG.reveal.feather) features.set(f.id, f);
    }
    let under = '';
    for (const f of features.values()) {
      const s = this.state(f);
      if (!s) continue;
      const { x, y } = f.seat, p = s.phase;
      if (p.weather) under += `<circle cx="${x}" cy="${y}" r="${p.weather.radius}" fill="${p.color}" opacity="0.15"/>`;
      if (p.flows) for (let i = 0; i < p.flows.count; i++) {
        const a = hash01(Math.round(x), Math.round(y), this.seed ^ i) * Math.PI * 2;
        const reach = p.flows.reach * (0.2 + 0.8 * s.progress);
        under += `<path d="M ${x} ${y} Q ${x + Math.cos(a + 0.3) * reach * 0.5} ${y + Math.sin(a + 0.3) * reach * 0.5} ${x + Math.cos(a) * reach} ${y + Math.sin(a) * reach}" fill="none" stroke="${p.flows.color}" stroke-width="${p.flows.width}" stroke-linecap="round"/>`;
      }
      if (p.weather) under += `<path d="M ${x - 17} ${y + 13} L ${x} ${y - 20} L ${x + 17} ${y + 13} Z" fill="${p.color}" stroke="#342b28" stroke-width="3"/>`;
    }
    return { under, over: '' };
  }
}

registerEventFront({ id: 'feature_activity', sample: (world, zone) =>
  world.sim.overlayFor<FeatureActivityField>('feature_activity')?.sample(zone, world.time) ?? null });
registerZoneInfoSource((world, id) => {
  const zone = world.zoneMap[id];
  return zone ? world.sim.overlayFor<FeatureActivityField>('feature_activity')?.describe(zone, world.time) ?? [] : [];
});
