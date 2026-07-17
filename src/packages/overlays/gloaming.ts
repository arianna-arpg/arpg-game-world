// ---------------------------------------------------------------------------
// THE GLOAMING — a weather-front of darkness, worn as ONE breathing number.
//
// The front originates PURELY in its origin biome: every surface node whose
// biome is the gloamwood seeds it at hop 0, and hop distances BFS outward
// from ALL seeds at once over the existing road edges (contagion's walk —
// never minting, only riding what the world web already grew). The whole
// lifecycle is one continuous float, ringF:
//
//     gloom(zone) = clamp((ringF - hops + 1) / rampHops, 0, 1)
//
// ringF climbs from -1 (nothing) toward maxRing (WAXING), pins (HOLDING),
// and falls back (WANING) — so the rim is always the faintest ground, the
// wood the deepest, arrival and retreat are the same shape, and NO zone ever
// steps in one frame (a weather front arrives as weather, never as a light
// switch). The dark walks the open sky only: sheltered ground (caves,
// interiors, off-surface) is neither covered nor crossed.
//
// The overlay is PURE of the engine (the WorldOverlay law): it owns the
// front's clock + coverage and answers gloomOn(zoneId); the engine half
// (World.updateGloaming) eases the in-zone gloom, drains the LIGHT meter,
// spawns lightwells, and grants the gloom statuses off surge() data. The
// in-zone dark itself is the render light layer reading World.gloomDarkness.
// Docs: docs/engine/gloaming.md.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { skyOf, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { biomeAt } from '../../world/biomes';
import { inPhases, type DayPhase } from '../../world/daynight';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { registerBulletinSource, type WorldBulletin } from '../../world/bulletins';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { registerZoneWashSource } from '../../world/zoneWash';
import { eventTargetable } from '../../world/zonePolicy';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed ignition-roll cadence (seconds) — the contagion idiom

/** The whole Gloaming as data — every number is a knob. Carried by the def,
 *  passed into the overlay constructor; the ENGINE half reads the in-zone
 *  levers (drain, wells, grants, darkness) through field.surge(). */
export interface GloamingSurge {
  /** Ignition roll per STEP while idle, gate-scaled (ignitionMul). */
  igniteChance: number;
  /** The gloaming hour: phases in which a front may BEGIN (it persists
   *  through any hour once risen — the dark is not the night). */
  beginPhases: DayPhase[];
  /** Whose zones seed the front at hop 0 (the biome heat map is the origin). */
  originBiome: string;
  /** Seconds per ring while WAXING (severity-scaled: a pressured world
   *  marches faster). */
  advanceEverySec: number;
  /** How many hops past the wood the front may reach. */
  maxRing: number;
  /** Seconds the front HOLDS at full reach. */
  holdSec: number;
  /** Seconds per ring while WANING (the retreat's own cadence). */
  recedeEverySec: number;
  /** Hops behind the rim to full dark — the front's ramp width. */
  rampHops: number;
  /** Cooldown band rolled after a front dies. */
  cooldownSec: [number, number];

  // --- the engine half's levers (World.updateGloaming / the render dark) ---
  /** LIGHT meter loss/sec at FULL gloom, outside any light's reach. */
  drainPerSec: number;
  /** Meter regain/sec once the zone is clear (and delete-at-full). */
  recoverPerSec: number;
  /** In-zone easing toward the front's target (seconds to close the gap). */
  easeSec: number;
  /** Ambient-darkness ceiling at full gloom (deep night is ~0.66 — the
   *  Gloaming EATS light: darker than any natural hour). */
  gloomDark: number;
  /** The air's tint while gloomed (zoneWash: strongest-alpha-wins). */
  wash: { color: string; alpha: number };
  /** The event's spawned lightwells: kind + cadence + placement bands. */
  wells: { kind: string; cap: number; firstSec: number; everySec: [number, number]; nearR: [number, number]; minSep: number };
  /** Gloom statuses granted to bodies in the dark outside light (the fog
   *  fabric's filter grammar — the dark's own kin are exempt and hunt
   *  unimpaired). */
  grants: { status: string; notFactions?: string[] }[];
  /** At-home spawn pressure while covered (folded by gloom depth). */
  spawnBias: { faction: string; mulAtFull: number }[];
  /** Rosters forced into covered ground once the gloom is deep. */
  injectFactions: string[];
  /** Gloom depth at which injections begin. */
  injectFrom: number;
  color: string;
}

type GloamPhase = 'idle' | 'waxing' | 'holding' | 'waning';

export class GloamingField implements WorldOverlay {
  readonly id = 'gloaming';
  /** Durable: a risen front is world weather — it must survive a save/resume
   *  mid-storm (the persistence pledge). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'The Gloaming';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: GloamingSurge;
  private readonly biomeSeed: number;

  private phase: GloamPhase = 'idle';
  /** THE front, as one float (see header). -1 = nothing anywhere. */
  private ringF = -1;
  /** Seconds accumulated in the current phase (holding) / toward the next
   *  ignition roll (idle). */
  private phaseT = 0;
  private cooldownLeft = 0;
  /** The player has stood in deep gloom this front (drives the one-shot
   *  discovery ledger, bumped engine-side). */
  private witnessed = false;
  private seq = 0;
  private devForce = false;

  /** hops-from-the-wood per zone id — derived, never persisted. Rebuilt when
   *  the graph grows (mints) or on restore. */
  private hops = new Map<string, number>();
  private hopsForLen = -1;
  /** Queued announcements (drained into bulletins by the module source). */
  private news: WorldBulletin[] = [];
  /** Zone ids already announced as covered this front (rim news fires once). */
  private told = new Set<string>();

  constructor(ctx: OverlayBuildCtx, surge: GloamingSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.biomeSeed = ctx.biomeSeed;
  }

  surge(): GloamingSurge { return this.cfg; }

  /** May the dark stand on this ground? Open sky + the one event floor. */
  private coverable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z) && skyOf(z) !== 'sheltered';
  }

  private isSeed(z: ZoneDef): boolean {
    return this.coverable(z) && (z.biome ?? biomeAt(z.map, this.biomeSeed)) === this.cfg.originBiome;
  }

  /** BFS hop distances from ALL origin-biome seeds at once, over z.exits,
   *  never crossing uncoverable ground. Rebuilt when the node count changes
   *  (the web grew) — cheap, and coverage stays honest as the world mints. */
  private rebuildHops(view: OverlayView): void {
    this.hops.clear();
    const q: string[] = [];
    for (const z of view.nodes) {
      if (this.isSeed(z)) { this.hops.set(z.id, 0); q.push(z.id); }
    }
    for (let qi = 0; qi < q.length; qi++) {
      const h = this.hops.get(q[qi])!;
      const zn = view.byId[q[qi]];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.hops.has(nb.id) || !this.coverable(nb)) continue;
        this.hops.set(nb.id, h + 1);
        q.push(nb.id);
      }
    }
    this.hopsForLen = view.nodes.length;
  }

  update(dt: number, view: OverlayView): void {
    if (view.nodes.length !== this.hopsForLen) this.rebuildHops(view);
    const g = this.gate();
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);

    switch (this.phase) {
      case 'idle': {
        this.phaseT += dt;
        while (this.phaseT >= STEP) {
          this.phaseT -= STEP;
          const may = this.devForce
            || (g.active && this.cooldownLeft <= 0 && inPhases(view.time, this.cfg.beginPhases)
              && this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1)));
          if (may && this.hops.size > 0) {
            this.devForce = false;
            this.phase = 'waxing';
            this.ringF = -1;
            this.told.clear();
            this.witnessed = false;
            this.seq++;
            this.news.push({ text: 'A gloaming gathers over the wood — the dark is rising.', color: this.cfg.color });
            break;
          }
        }
        break;
      }
      case 'waxing': {
        // Severity is the march crank; a closed gate FREEZES the front
        // (weather does not un-happen because a slider moved).
        const rate = g.active ? clamp(g.severityMul, 0, 1.5) : 0;
        this.ringF = Math.min(this.cfg.maxRing, this.ringF + (rate * dt) / Math.max(0.5, this.cfg.advanceEverySec));
        this.announceRim(view);
        if (this.ringF >= this.cfg.maxRing) { this.phase = 'holding'; this.phaseT = 0; }
        break;
      }
      case 'holding': {
        this.phaseT += dt;
        this.announceRim(view);
        if (this.phaseT >= this.cfg.holdSec) { this.phase = 'waning'; this.phaseT = 0; }
        break;
      }
      case 'waning': {
        this.ringF -= dt / Math.max(0.5, this.cfg.recedeEverySec);
        if (this.ringF <= -1) {
          this.ringF = -1;
          this.phase = 'idle';
          this.phaseT = 0;
          this.cooldownLeft = this.cfg.cooldownSec[0]
            + this.rng.next() * (this.cfg.cooldownSec[1] - this.cfg.cooldownSec[0]);
          this.news.push({ text: 'The gloaming recedes — the light holds.', color: '#d8cfa8' });
        }
        break;
      }
    }
  }

  /** First-cover news for CHARTED ground only (the player's map speaks about
   *  places the player knows). Fires once per zone per front. */
  private announceRim(view: OverlayView): void {
    for (const [zid, h] of this.hops) {
      if (this.told.has(zid) || !view.visited.has(zid)) continue;
      if (this.ringF - h + 1 <= 0) continue;
      this.told.add(zid);
      const z = view.byId[zid];
      if (z && h > 0) this.news.push({ text: `The Gloaming rises over ${z.name}.`, color: this.cfg.color });
    }
  }

  /** THE front sample: gloom target 0..1 for a zone. The engine eases toward
   *  it; the formula is continuous in time by construction. */
  gloomOn(zoneId: string): number {
    if (this.phase === 'idle') return 0;
    const h = this.hops.get(zoneId);
    if (h === undefined) return 0;
    return clamp((this.ringF - h + 1) / this.cfg.rampHops, 0, 1);
  }

  phaseNow(): GloamPhase { return this.phase; }
  frontSeq(): number { return this.seq; }
  isWitnessed(): boolean { return this.witnessed; }
  markWitnessed(): void { this.witnessed = true; }
  /** Drained by the module-scope bulletin source. */
  drainNews(): WorldBulletin[] { const n = this.news; this.news = []; return n; }

  /** Dev seams (Events tab + eventqa's dev-seam roster). */
  devIgnite(): void { this.devForce = true; this.cooldownLeft = 0; this.phase = 'idle'; }
  devRecede(): void { if (this.phase !== 'idle') { this.phase = 'waning'; this.phaseT = 0; } }

  onNodeCharted(): void { this.hopsForLen = -1; /* re-derive on next tick */ }

  affectSpawns(zone: ZoneDef): SpawnBias {
    const g = this.gloomOn(zone.id);
    if (g <= 0.02) return NO_BIAS;
    const factionMul: Record<string, number> = {};
    for (const row of this.cfg.spawnBias) factionMul[row.faction] = 1 + (row.mulAtFull - 1) * g;
    return {
      countMul: 1 + 0.15 * g,
      factionMul,
      injectFactions: g >= this.cfg.injectFrom ? [...this.cfg.injectFactions] : [],
    };
  }

  activityAt(zid: string): number { return this.gloomOn(zid) * 0.8; }

  renderMap(nodes: ZoneDef[]): MapLayer {
    if (this.phase === 'idle') return { under: '', over: '' };
    let under = '';
    let over = '';
    for (const z of nodes) {
      const g = this.gloomOn(z.id);
      if (g <= 0.03) continue;
      under += `<circle cx="${z.map.x}" cy="${z.map.y}" r="36" fill="#141024" fill-opacity="${(0.55 * g).toFixed(3)}"/>`;
      // The rim reads as a faint breathing ring on the freshest ground.
      if (g < 0.45) {
        over += `<circle cx="${z.map.x}" cy="${z.map.y}" r="30" fill="none" stroke="${this.cfg.color}" stroke-opacity="0.5" stroke-dasharray="4 6"><animate attributeName="r" values="26;33;26" dur="3.2s" repeatCount="indefinite"/></circle>`;
      }
    }
    return { under, over };
  }

  snapshot(): unknown {
    return {
      phase: this.phase, ringF: this.ringF, phaseT: this.phaseT,
      cooldownLeft: this.cooldownLeft, witnessed: this.witnessed, seq: this.seq,
      told: [...this.told],
    };
  }

  restore(snap: unknown): void {
    const s = snap as Partial<{ phase: GloamPhase; ringF: number; phaseT: number; cooldownLeft: number; witnessed: boolean; seq: number; told: string[] }> | null;
    if (!s || typeof s !== 'object') return;
    if (s.phase === 'idle' || s.phase === 'waxing' || s.phase === 'holding' || s.phase === 'waning') this.phase = s.phase;
    if (typeof s.ringF === 'number' && Number.isFinite(s.ringF)) this.ringF = clamp(s.ringF, -1, this.cfg.maxRing);
    if (typeof s.phaseT === 'number' && Number.isFinite(s.phaseT)) this.phaseT = Math.max(0, s.phaseT);
    if (typeof s.cooldownLeft === 'number' && Number.isFinite(s.cooldownLeft)) this.cooldownLeft = Math.max(0, s.cooldownLeft);
    if (typeof s.witnessed === 'boolean') this.witnessed = s.witnessed;
    if (typeof s.seq === 'number') this.seq = s.seq;
    if (Array.isArray(s.told)) this.told = new Set(s.told.filter(x => typeof x === 'string'));
    this.hopsForLen = -1; // coverage re-derives from the restored graph
  }
}

// --- module-scope presentation sources (zero renderer/panel edits) ----------

registerZoneWashSource((world: World) => {
  const gf = world.sim.gloamingField;
  if (!gf) return null;
  const g = world.gloom();
  if (g <= 0.02) return null;
  const wash = gf.surge().wash;
  return { color: wash.color, alpha: wash.alpha * g };
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const gf = world.sim.gloamingField;
  const g = gf?.gloomOn(zoneId) ?? 0;
  if (!gf || g <= 0.03) return [];
  const word = g >= 0.85 ? 'deep dark' : g >= 0.4 ? 'the dark risen' : 'the rim of the dark';
  return [{
    kind: 'condition', icon: '🌑', color: gf.surge().color,
    label: 'The Gloaming', detail: `${word} — carry light or stand near it`, z: 6,
  }];
});

registerBulletinSource((world: World) => world.sim.gloamingField?.drainNews() ?? []);
