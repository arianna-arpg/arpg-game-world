// ---------------------------------------------------------------------------
// THE LONG CANDLE FIELD — two courts at war over LIGHT, by night (pure overlay).
//
// The WAX COURT processes: an army from nowhere that claims charted ground
// after dark and raises CANDLE-SHRINES — lamps whose pulse picks everything
// out of the dark, your stealth and the shadows' whole anatomy alike. The
// UMBRAL PARLIAMENT convenes: living shadows that claim dark ground of their
// own. When both courts claim the SAME zone, that ground is THE WAR — wax
// and shadow tear into each other under the shrines (their factions are
// hostile), and the player walks into a three-sided night.
//
// Claims exist only while the dark holds: at dawn every claim clears (the
// Haunting's night canon, simplified — bodies already fielded linger until
// the zone despawns, but no fresh ground is taken and re-entry finds it
// quiet). PURE of the engine: the field owns the night claims; the engine
// reads candleOn() to materialize shrines/wax/umbral on entry.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { START_ZONE, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { inPhases } from '../../world/daynight';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed claim cadence (seconds)

/** The whole Long Candle mechanic as data — every number is a knob. */
export interface LongCandleSurge {
  /** Per-STEP chance (×ignitionMul) a court takes fresh ground — rolled once
   *  per court per step, night only. */
  igniteChance: number;
  /** Standing claims per court at once (×concurrency crank). */
  maxVigils: number;
  maxConvenes: number;
  /** Candle-shrines raised on a vigil ground. */
  shrines: [number, number];
  /** Packs fielded per claimed ground per visit, and their size. */
  packCount: [number, number];
  packSize: [number, number];
  /** The two courts' faction ids. */
  waxFaction: string;
  umbralFaction: string;
  /** Zone level floor/ceiling for claims (the courts walk the mid ring). */
  levelMin: number;
  levelMax: number;
  /** The courts' banner colours (map rings, info rows, entry lines). */
  waxColor: string;
  umbralColor: string;
}

/** What the engine reads to field a claimed zone. */
export interface CandleInfo {
  /** The Wax Court holds ground here (shrines + wax packs). */
  vigil: boolean;
  /** The Parliament convenes here (umbral packs). */
  convene: boolean;
  waxColor: string;
  umbralColor: string;
}

interface CourtClaim {
  id: string;
  zoneId: string;
  kind: 'vigil' | 'convene';
}

export class LongCandleField implements WorldOverlay {
  readonly id = 'longcandle';
  /** Durable across saves (a mid-night save resumes its claims); the DAWN is
   *  what actually ends them. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'The Long Candle';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: LongCandleSurge;
  private claims: CourtClaim[] = [];
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: LongCandleSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const night = inPhases(view.time, ['night']);
    // THE DAWN CANON: light ends every claim at once. Bodies already fielded
    // linger until their zone despawns; the GROUND is no longer held.
    if (!night) {
      if (this.claims.length) this.claims = [];
      this.acc = 0;
      return;
    }
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (!g.active) continue;
      this.maybeClaim(view, 'vigil');
      this.maybeClaim(view, 'convene');
    }
  }

  onNodeCharted(): void { /* fresh ground joins the candidate pool next roll */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the courts are engine-MATERIALIZED

  renderMap(_nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    for (const c of this.claims) {
      const n = this.nodesById[c.zoneId];
      if (!n) continue;
      const col = c.kind === 'vigil' ? this.cfg.waxColor : this.cfg.umbralColor;
      const glyph = c.kind === 'vigil' ? '🕯' : '☾';
      const dy = c.kind === 'vigil' ? -15 : -26; // stack when both courts claim one ground
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      under += `<circle cx="${cx}" cy="${cy}" r="15" fill="${col}" fill-opacity="0.08"/>`;
      over += `<circle cx="${cx}" cy="${cy}" r="12.5" fill="none" stroke="${col}" `
        + `stroke-width="1.6" stroke-opacity="0.55">`
        + `<animate attributeName="stroke-opacity" values="0.55;0.2;0.55" dur="2.4s" repeatCount="indefinite"/>`
        + `</circle>`
        + `<text x="${cx}" y="${(n.map.y + dy).toFixed(1)}" text-anchor="middle" font-size="11" fill="${col}">${glyph}</text>`;
    }
    return { under, over };
  }

  // --- accessors the engine reads -------------------------------------------

  surge(): LongCandleSurge { return this.cfg; }

  activityAt(zoneId: string): number { return this.candleOn(zoneId) ? 1 : 0; }

  /** The courts holding a zone tonight, or null when unclaimed. BOTH true =
   *  the war: the engine fields both sides and they tear into each other. */
  candleOn(zoneId: string): CandleInfo | null {
    let vigil = false, convene = false;
    for (const c of this.claims) {
      if (c.zoneId !== zoneId) continue;
      if (c.kind === 'vigil') vigil = true; else convene = true;
    }
    if (!vigil && !convene) return null;
    return { vigil, convene, waxColor: this.cfg.waxColor, umbralColor: this.cfg.umbralColor };
  }

  activeCount(): number { return this.claims.length; }

  // --- worldstate (the persistence pledge) -----------------------------------

  snapshot(): unknown {
    return { claims: this.claims.map(c => ({ ...c })), seq: this.seq };
  }

  restore(snap: unknown): void {
    const s = snap as { claims?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (!Array.isArray(s.claims)) return;
    this.claims = [];
    for (const raw of s.claims) {
      const c = raw as { id?: unknown; zoneId?: unknown; kind?: unknown } | null;
      if (!c || typeof c.id !== 'string' || typeof c.zoneId !== 'string') continue;
      if (c.kind !== 'vigil' && c.kind !== 'convene') continue;
      this.claims.push({ id: c.id, zoneId: c.zoneId, kind: c.kind });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    this.claims = this.claims.filter(c => has(c.zoneId));
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: claim the given zone for a court at once (QA only; ignores night). */
  devIgnite(view: OverlayView, zoneId: string, kind: 'vigil' | 'convene' = 'vigil'): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.claimable(z)) return false;
    if (this.claims.some(c => c.zoneId === zoneId && c.kind === kind)) return false;
    this.claims.push({ id: `${kind}_${this.seq++}`, zoneId, kind });
    return true;
  }

  // --- internals -------------------------------------------------------------

  private claimable(z: ZoneDef): boolean {
    return z.id !== START_ZONE && z.level >= this.cfg.levelMin && z.level <= this.cfg.levelMax
      && eventTargetable(this.id, z);
  }

  private maybeClaim(view: OverlayView, kind: 'vigil' | 'convene'): void {
    const g = this.gate();
    const cap = scaledCap(kind === 'vigil' ? this.cfg.maxVigils : this.cfg.maxConvenes, g.concurrencyMul);
    if (this.claims.filter(c => c.kind === kind).length >= cap) return;
    if (!this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) return;
    const held = new Set(this.claims.filter(c => c.kind === kind).map(c => c.zoneId));
    const cands = view.nodes.filter(z =>
      this.claimable(z) && !held.has(z.id) && view.visited.has(z.id));
    if (!cands.length) return;
    const pick = cands[this.rng.int(0, cands.length - 1)];
    this.claims.push({ id: `${kind}_${this.seq++}`, zoneId: pick.id, kind });
  }
}

// --- zone-info rows (registered on import — zero panel edits) -----------------
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.longCandleField?.candleOn(zoneId);
  if (!info) return [];
  const rows: ZoneInfoEntry[] = [];
  if (info.vigil) {
    rows.push({
      kind: 'event', icon: '🕯', color: info.waxColor, label: 'The Vigil',
      detail: info.convene
        ? 'the Wax Court holds this ground — and the Parliament contests it'
        : 'the Wax Court processes here — candle-shrines light the dark',
      z: 13,
    });
  }
  if (info.convene) {
    rows.push({
      kind: 'event', icon: '☾', color: info.umbralColor, label: 'The Parliament Convenes',
      detail: info.vigil
        ? 'living shadows war with the Court under the shrines'
        : 'living shadows hold this ground — bring light, or be dark',
      z: 12,
    });
  }
  return rows;
});
