// ---------------------------------------------------------------------------
// MYCELIA FIELD — a mobile, event-fed SPORE-DENSITY influence (pure overlay).
//
// The fungal 'mycelia' biome is the dormant HOME of a living bloom. The bloom feeds
// on EVENTS in/near it: enough nearby activity and it FLARES, lashing spores toward
// the most event-rich adjacent zone — fungal monsters pour in (engine-materialized
// from the exit facing the core) and that zone's own event chance is SUPPRESSED. So
// the bloom must keep spreading to find fresh food (it "eats its own tail": a CAPPED
// total mass, the weakest edge drained to fund the strong front). The player CULLS it
// (killing the fungal hordes drops a zone's density); pushed back, the bloom RELOCATES
// its core toward its thickest remaining ground — you chase it node to node. Chased
// far/long enough, it WITHDRAWS to dormant, collapsing back into its home until events
// flare it anew. At high density it WARPS the biome it has saturated (a transient
// BiomeFieldModifier the engine drains) — the rot taking root.
//
// PURE of the engine: it owns the density map + the bloom state machine. The engine
// FEEDS per-zone event activity (setEventActivity, bounded to interestZones), reads
// sporeOn()/coreInfo()/suppressionAt()/transformedZones() to materialize + suppress +
// warp, and calls cull()/onHeartbloomSlain() back. Synthesis of Contagion (spread),
// Hunt (mobile core), Crusade (collapse).
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { SPORE_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed lifecycle cadence (seconds)

/** The whole Mycelia mechanic as data — every number a knob. */
export interface MyceliaSurge {
  /** Per-STEP chance the dormant bloom IGNITES once a home biome region is charted. */
  igniteChance: number;
  /** flareCharge needed to lash out (DORMANT → spreading). */
  flareThreshold: number;
  /** flareCharge gained per unit of nearby event-activity per second. */
  flareFeed: number;
  /** flareCharge bled per second (so a starved bloom calms + re-dormants). */
  flareDecay: number;
  /** Seconds (÷severity) between the bloom creeping to ONE more zone. */
  spreadInterval: number;
  /** Spread reach cap (intensity = 1 − hops/maxHops). */
  maxHops: number;
  minIntensity: number;
  /** Per-second passive density fade (the bloom needs feeding to hold ground). */
  densityDecay: number;
  /** The CAP: total Σ density the bloom may hold. Grows as it's fed, shrinks on cull. */
  massStart: number;
  massPerFeed: number; // mass gained per spread while fed
  massMax: number;
  /** Cull (per fungal kill): density + mass lost, and pushPressure gained. */
  cullDensity: number;
  cullMass: number;
  cullPush: number;
  pushDecay: number; // pushPressure bleed/sec
  /** pushPressure that flips SPREAD → PUSHED (the bloom recoils + relocates). */
  pushThreshold: number;
  /** mass below which (or chaseZones beyond which) the bloom WITHDRAWS. */
  withdrawMass: number;
  chaseLimit: number;
  /** Seconds between the withdraw receding one ring. */
  recedeInterval: number;
  /** How hard density smothers a zone's events (1 − density×this, floored). */
  suppressPerDensity: number;
  suppressFloor: number;
  /** Density at/above which a zone's biome is WARPED to (the transform), + the warp
   *  geometry the engine stamps (radius + override strength). */
  transformDensity: number;
  warp: { radius: number; strength: number };
  /** The biome this bloom calls home + warps toward (so a 2nd influence-biome reuses
   *  this overlay as pure data). Defaults to 'mycelia'. */
  homeBiome: string;
  faction: string;
  /** The toggleable core boss (default ON). When enabled the Heartbloom holds the core;
   *  striking it FORCES a withdraw. When disabled, the bloom is pure-cull (no heart). */
  heartbloom: { enabled: boolean; defId: string; promote: 'none' | 'champion' | 'crowned' };
  reward: { xpBase: number; xpPerLevel: number; gems: number };
  color: string;
  glow?: { strong: string; weak: string; accent: string };
}

type BloomState = 'dormant' | 'spread' | 'pushed' | 'withdraw';

interface SporeZone {
  density: number; // 0..1
  hops: number;    // graph distance from the core (0 = core)
}

interface ActiveBloom {
  id: string;
  homeZoneId: string;
  coreZoneId: string;
  mass: number;
  state: BloomState;
  flareCharge: number;
  spreadAcc: number;
  recedeAcc: number;
  pushPressure: number;
  chaseZones: number;
  age: number;
}

export interface SporeInfo {
  density: number;
  isCore: boolean;
  color: string;
  label: string;
}

export class MyceliaField implements WorldOverlay {
  readonly id = 'mycelia';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: MyceliaSurge;
  private readonly glowColors: { strong: string; weak: string; accent: string };
  private bloom: ActiveBloom | null = null;
  private spores = new Map<string, SporeZone>();
  /** Per-zone event activity fed by the engine each tick (bounded to interestZones). */
  private activity = new Map<string, number>();
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};
  /** Set true once when the bloom is forced into WITHDRAW (culled back or Heart slain);
   *  the engine consumes it to bump the mycelia_pushed Vault ledger. */
  private pushedBackPending = false;

  constructor(ctx: OverlayBuildCtx, surge: MyceliaSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.glowColors = surge.glow ?? SPORE_COLORS;
  }

  // --- WorldOverlay ----------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const pressure = clamp(g.severityMul, 0, 1.5);

    if (!this.bloom) {
      this.acc += dt;
      while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.tryIgnite(view); }
      return;
    }
    const b = this.bloom;
    b.age += dt;

    // FEED: nearby event-activity charges the flare; starvation bleeds it back down.
    const act = this.totalActivity();
    b.flareCharge = Math.max(0, b.flareCharge + act * this.cfg.flareFeed * dt - this.cfg.flareDecay * dt);
    b.pushPressure = Math.max(0, b.pushPressure - this.cfg.pushDecay * dt);

    // DENSITY FADE: every held zone slowly loses spores (the bloom must keep feeding).
    // The core never fully fades while the bloom lives (it's the dormant reserve).
    for (const [zid, z] of this.spores) {
      if (zid === b.coreZoneId) continue;
      z.density = Math.max(0, z.density - this.cfg.densityDecay * dt);
    }
    for (const [zid, z] of [...this.spores]) {
      if (z.density <= 0.001 && zid !== b.coreZoneId) this.spores.delete(zid);
    }

    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; this.step(view, g.active, pressure); }
  }

  onNodeCharted(): void { /* the bloom rides existing edges; a fresh node is caught next tick */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // fungal hordes are engine-MATERIALIZED, intensity-scaled

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // The creeping bloom: a luminous halo per spore-laced zone (scaling with density) +
    // a pulsing core ring (the mass's heart). Drawn off nodesById (like Crusade) so the
    // whole reach reads on the map — the slow grasping tendril.
    let under = '', over = '';
    const b = this.bloom;
    for (const [zid, z] of this.spores) {
      const n = this.nodesById[zid];
      if (!n) continue;
      const s = clamp(z.density, 0, 1);
      const col = mixHex(this.glowColors.weak, this.glowColors.strong, s);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      for (const [m, base] of [[1, 0.05], [0.6, 0.09]] as const) {
        under += `<circle cx="${cx}" cy="${cy}" r="${(16 * m + 8 * s).toFixed(1)}" fill="${col}" fill-opacity="${(base + 0.1 * s).toFixed(3)}"/>`;
      }
      if (b && zid === b.coreZoneId) {
        const dur = (2.6 - 1.4 * s).toFixed(2);
        over += `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${this.glowColors.strong}" stroke-width="2.2" stroke-opacity="0.85">`
          + `<animate attributeName="r" values="13;${(13 + 6 * s).toFixed(1)};13" dur="${dur}s" repeatCount="indefinite"/>`
          + `</circle>`
          + `<text x="${cx}" y="${(n.map.y - 15).toFixed(1)}" text-anchor="middle" font-size="13" fill="${this.glowColors.accent}">❀</text>`;
      }
    }
    return { under, over };
  }

  // --- engine-facing API -----------------------------------------------------

  surge(): MyceliaSurge { return this.cfg; }

  /** The spore state of a zone (density + whether it's the core) — the engine reads it
   *  to materialize intensity-scaled fungal packs + the Heartbloom. */
  sporeOn(zoneId: string): SporeInfo | null {
    const z = this.spores.get(zoneId);
    if (!z || z.density <= 0.001) return null;
    return {
      density: z.density,
      isCore: this.bloom?.coreZoneId === zoneId,
      color: this.cfg.color,
      label: z.density > 0.66 ? 'saturated' : z.density > 0.33 ? 'spreading' : 'creeping',
    };
  }

  /** The Heartbloom descriptor for the core zone (if the toggle is on + the bloom lives). */
  heartbloomIn(zoneId: string): { defId: string; promote: 'none' | 'champion' | 'crowned' } | null {
    if (!this.cfg.heartbloom.enabled || !this.bloom || this.bloom.state === 'withdraw') return null;
    if (this.bloom.coreZoneId !== zoneId) return null;
    return { defId: this.cfg.heartbloom.defId, promote: this.cfg.heartbloom.promote };
  }

  /** Event-chance multiplier a zone's spore density imposes (1 = clear, →floor = smothered).
   *  The dynamic tug-of-war: the thicker the bloom, the fewer competing events ignite. */
  suppressionAt(zoneId: string): number {
    const z = this.spores.get(zoneId);
    if (!z) return 1;
    return clamp(1 - z.density * this.cfg.suppressPerDensity, this.cfg.suppressFloor, 1);
  }

  /** Zones saturated enough to WARP to the mycelia biome (the engine reconciles the
   *  BiomeField modifiers against this set each tick). */
  transformedZones(): string[] {
    const out: string[] = [];
    for (const [zid, z] of this.spores) if (z.density >= this.cfg.transformDensity) out.push(zid);
    return out;
  }

  /** The bloom's core + its neighbours + the home + its neighbours — the only zones the
   *  engine needs to measure event-activity for (bounded). */
  interestZones(): string[] {
    const set = new Set<string>();
    const add = (zid: string) => {
      set.add(zid);
      const zn = this.nodesById[zid];
      if (zn) for (const e of zn.exits) if (e.to !== '?' && !e.to.startsWith('cave_')) set.add(e.to);
    };
    if (this.bloom) { add(this.bloom.coreZoneId); add(this.bloom.homeZoneId); }
    for (const zid of this.spores.keys()) add(zid);
    return [...set];
  }

  /** The engine feeds per-zone event activity each tick (before sim.update). */
  setEventActivity(map: ReadonlyMap<string, number>): void {
    this.activity = new Map(map);
  }

  /** The player culled the bloom in a zone (a fungal kill) — drop its density, shrink the
   *  mass, and build push-pressure that recoils + relocates the core. */
  cull(zoneId: string, amount = 1): void {
    const b = this.bloom;
    const z = this.spores.get(zoneId);
    if (!b || !z) return;
    z.density = Math.max(0, z.density - this.cfg.cullDensity * amount);
    b.mass = Math.max(0, b.mass - this.cfg.cullMass * amount);
    b.pushPressure += this.cfg.cullPush * amount;
  }

  /** The Heartbloom fell — force a fast collapse to dormant (the high-risk shortcut). */
  onHeartbloomSlain(): boolean {
    if (!this.bloom || this.bloom.state === 'withdraw') return false;
    this.bloom.state = 'withdraw';
    this.bloom.recedeAcc = 0;
    this.pushedBackPending = true;
    return true;
  }

  /** Returns true ONCE when the bloom has just been pushed into withdraw (the engine
   *  bumps the mycelia_pushed Vault ledger). */
  consumePushedBack(): boolean {
    if (!this.pushedBackPending) return false;
    this.pushedBackPending = false;
    return true;
  }

  activeBloom(): { state: BloomState; coreZoneId: string; mass: number; zones: number } | null {
    return this.bloom
      ? { state: this.bloom.state, coreZoneId: this.bloom.coreZoneId, mass: this.bloom.mass, zones: this.spores.size }
      : null;
  }

  /** Read-only snapshot for markers / tests. */
  peek(): ReadonlyArray<{ zoneId: string; density: number; isCore: boolean }> {
    const b = this.bloom;
    return [...this.spores].map(([zid, z]) => ({ zoneId: zid, density: z.density, isCore: b?.coreZoneId === zid }));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: ignite a bloom whose HOME + core is the given (current) zone, pre-charged so it
   *  flares + spreads at once. (QA Event tab.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.bloom) return false; // one-at-a-time (matches production; no orphaned spores)
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here)) return false;
    this.bloom = this.makeBloom(here.id);
    this.bloom.flareCharge = this.cfg.flareThreshold * 2;
    this.bloom.state = 'spread';
    this.spores.set(here.id, { density: 1, hops: 0 });
    return true;
  }

  // --- internals -------------------------------------------------------------

  private streamable(z: ZoneDef): boolean {
    return !z.id.startsWith('cave_') && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed(this.id, z);
  }

  private totalDensity(): number {
    let t = 0;
    for (const z of this.spores.values()) t += z.density;
    return t;
  }

  /** Sum of fed event-activity across the bloom's owned + neighbour zones (the food). */
  private totalActivity(): number {
    let t = 0;
    for (const zid of this.interestZones()) t += this.activity.get(zid) ?? 0;
    return t;
  }

  private intensityFor(hops: number): number {
    return clamp(1 - hops / this.cfg.maxHops, this.cfg.minIntensity, 1);
  }

  private makeBloom(homeId: string): ActiveBloom {
    return {
      id: `mycelia_${this.seq++}`, homeZoneId: homeId, coreZoneId: homeId,
      mass: this.cfg.massStart, state: 'dormant', flareCharge: 0, spreadAcc: 0,
      recedeAcc: 0, pushPressure: 0, chaseZones: 0, age: 0,
    };
  }

  /** Find a charted mycelia-biome zone (the dormant HOME) and seed a bloom there. */
  private tryIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.igniteChance * this.gate().ignitionMul, 0, 1))) return;
    const homes = view.nodes.filter(z => z.biome === this.cfg.homeBiome && this.streamable(z));
    if (!homes.length) return;
    const home = homes[this.rng.int(0, homes.length - 1)];
    this.bloom = this.makeBloom(home.id);
    this.spores.set(home.id, { density: 0.45, hops: 0 }); // a faint dormant seed
  }

  /** The fixed-cadence state machine. */
  private step(view: OverlayView, active: boolean, pressure: number): void {
    const b = this.bloom;
    if (!b) return;
    const cfg = this.cfg;

    switch (b.state) {
      case 'dormant':
        if (active && b.flareCharge >= cfg.flareThreshold) b.state = 'spread';
        break;
      case 'spread':
        if (active) {
          b.spreadAcc += STEP * pressure;
          while (b.spreadAcc >= cfg.spreadInterval) { b.spreadAcc -= cfg.spreadInterval; this.spread(view); }
        }
        if (this.totalDensity() > b.mass) this.eatTail();
        if (b.pushPressure >= cfg.pushThreshold) b.state = 'pushed';
        // Starved + dormant-low: the bloom calms back to its home.
        else if (b.flareCharge < cfg.flareThreshold * 0.25 && this.totalActivity() <= 0 && this.spores.size <= 1) b.state = 'dormant';
        break;
      case 'pushed':
        this.relocateCore();
        if (b.mass <= cfg.withdrawMass || b.chaseZones >= cfg.chaseLimit) { b.state = 'withdraw'; b.recedeAcc = 0; this.pushedBackPending = true; }
        else if (b.pushPressure < cfg.pushThreshold * 0.4 && b.flareCharge >= cfg.flareThreshold) b.state = 'spread';
        break;
      case 'withdraw':
        b.recedeAcc += STEP;
        while (b.recedeAcc >= cfg.recedeInterval) { b.recedeAcc -= cfg.recedeInterval; this.recede(); }
        if (this.spores.size <= 1) {
          // Collapsed to (at most) the core — fall fully dormant back at home.
          this.spores.clear();
          const home = view.byId[b.homeZoneId];
          if (home && this.streamable(home)) {
            this.bloom = this.makeBloom(home.id);
            this.spores.set(home.id, { density: 0.45, hops: 0 });
          } else {
            this.bloom = null; // home gone — recycle entirely (re-ignites elsewhere later)
          }
        }
        break;
    }
  }

  /** Creep to ONE more zone: the highest-event-activity uninfected neighbour of the
   *  front (the bloom lashes toward food). Caps via eatTail. */
  private spread(view: OverlayView): void {
    const b = this.bloom;
    if (!b) return;
    const cand = new Map<string, number>(); // zoneId → min parent hop
    for (const [zid, z] of this.spores) {
      const zn = view.byId[zid];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?' || e.to.startsWith('cave_')) continue;
        const nb = view.byId[e.to];
        if (!nb || this.spores.has(nb.id) || !this.streamable(nb)) continue;
        cand.set(nb.id, Math.min(cand.get(nb.id) ?? Infinity, z.hops));
      }
    }
    if (!cand.size) return;
    // Pick by event-activity (lash toward events); ties broken by nearest hop. If NOTHING
    // adjacent has activity, the bloom coalesces (don't spread blindly).
    let best: string | null = null, bestScore = -1;
    for (const [zid, ph] of cand) {
      if (ph + 1 > this.cfg.maxHops) continue;
      const score = (this.activity.get(zid) ?? 0) * 10 - ph;
      if (score > bestScore) { bestScore = score; best = zid; }
    }
    if (!best || (this.activity.get(best) ?? 0) <= 0) return; // no food adjacent → coalesce
    const hops = (cand.get(best) ?? 0) + 1;
    this.spores.set(best, { density: this.intensityFor(hops), hops });
    b.mass = Math.min(this.cfg.massMax, b.mass + this.cfg.massPerFeed); // fed — the mass grows
    if (this.totalDensity() > b.mass) this.eatTail();
  }

  /** EAT THE TAIL: at the mass cap, drain the weakest (faintest) edge zones to fund the
   *  strong front — the influence's total is bounded, so growth relocates the mass. */
  private eatTail(): void {
    const b = this.bloom;
    if (!b) return;
    const edges = [...this.spores.entries()]
      .filter(([zid]) => zid !== b.coreZoneId)
      .sort((a, c) => a[1].density - c[1].density); // faintest first
    let total = this.totalDensity();
    for (const [zid, z] of edges) {
      if (total <= b.mass) break;
      total -= z.density;
      this.spores.delete(zid);
    }
  }

  /** Relocate the core toward the THICKEST remaining ground (the chase) — the mass
   *  recoils into its own interior when the front is pushed back. */
  private relocateCore(): void {
    const b = this.bloom;
    if (!b) return;
    let best = b.coreZoneId, bd = this.spores.get(b.coreZoneId)?.density ?? 0;
    for (const [zid, z] of this.spores) if (z.density > bd) { bd = z.density; best = zid; }
    if (best !== b.coreZoneId) {
      b.coreZoneId = best;
      b.chaseZones++;
      this.rehop(); // re-measure hops from the new core
    }
  }

  /** WITHDRAW recede: remove the outermost (highest-hop) ring — the bloom collapses
   *  inward toward its core. */
  private recede(): void {
    const b = this.bloom;
    if (!b) return;
    let maxHop = -1;
    for (const [zid, z] of this.spores) if (zid !== b.coreZoneId && z.hops > maxHop) maxHop = z.hops;
    if (maxHop < 0) { this.spores.delete([...this.spores.keys()].find(k => k !== b.coreZoneId) ?? ''); return; }
    for (const [zid, z] of [...this.spores]) if (zid !== b.coreZoneId && z.hops >= maxHop) this.spores.delete(zid);
  }

  /** Recompute every zone's hop-distance from the current core (BFS over the held set). */
  private rehop(): void {
    const b = this.bloom;
    if (!b) return;
    const hop = new Map<string, number>([[b.coreZoneId, 0]]);
    const q = [b.coreZoneId];
    for (let qi = 0; qi < q.length; qi++) {
      const id = q[qi], h = hop.get(id)!;
      const zn = this.nodesById[id];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?' || hop.has(e.to) || !this.spores.has(e.to)) continue;
        hop.set(e.to, h + 1);
        q.push(e.to);
      }
    }
    for (const [zid, z] of this.spores) z.hops = hop.get(zid) ?? z.hops;
  }
}

// --- map marker + zone-info (registered on import) ----------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const mf = world.sim.myceliaField;
  if (!mf) return [];
  const out: MapMarker[] = [];
  for (const s of mf.peek()) {
    if (!s.isCore) continue;
    out.push({
      id: `mycelia-core-${s.zoneId}`, zoneId: s.zoneId,
      glyph: '❀', fill: '#16220f', stroke: SPORE_COLORS.strong, text: SPORE_COLORS.accent, r: 9,
      title: 'The Bloom — its spore-core festers here', fog: 'charted', z: 16,
    });
  }
  return out;
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.myceliaField?.sporeOn(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '❀', color: SPORE_COLORS.strong, label: 'Mycelia',
    detail: info.isCore ? 'the spore-core — cull it or strike the Heartbloom' : `spores ${info.label}`,
    z: 13,
  }];
});
