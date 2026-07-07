// ---------------------------------------------------------------------------
// MIGRATION FIELD — a living-world BEAST HERD that crosses the plains (pure overlay).
//
// A Migration is the world breathing on its own. On a slow tick a herd of the wild
// 'beast' faction GATHERS at one Field biome (an un-minted point inside a contiguous
// Field blob) and GRAZES. After a while it sets off, MIGRATING toward another, far
// Field — a growing directional band drawn across the map (origin → destination),
// like a Stormfront anchored at one end that lengthens until it reaches the other.
// Any zone the band rolls over gets a constant directional FLOW of the herd pouring
// through it (entering from the side facing the origin, ambling out the side facing
// the destination). The herd is NEUTRAL — it never minds you — until you strike a
// member: then the ADULTS turn and gore while the YOUNG scatter (the engine's group
// rouse + the scaleVariance juvenile brains). After it arrives, the band CULLS from
// the origin end forward (the flow recedes tail-first) until it's gone — a minor,
// ambient bit of time pressure, the world living regardless of the player.
//
// PURE of the engine: it owns node-space (origins/destinations sampled from the biome
// field), the per-herd lifecycle, and the directional band. The engine reads
// migrationOn() to materialize the in-zone stream; it never touches World.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { biomeAt } from '../../world/biomes';
import { coordDist, type MapCoord } from '../../world/coords';
import { fieldRegionAt, FIELD_BIOME } from '../../world/fieldRegion';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;            // fixed cadence (the slow ignition roll)
const BEAST_BROWN = '#b08a4a'; // a dusty plains-tan (the herd banner default)
/** Cap on Field-region floods per scout pass — bounds the worst case (a huge single
 *  field whose every probe re-floods); distinct regions surface early in the scan, so
 *  this rarely bites. */
const FIELD_SCOUT_FLOOD_BUDGET = 48;

/** A FLAVOUR a fresh migration rolls — the herd size + how wide a band it pours
 *  through (a "Great Migration" floods more zones with more beasts than a "Small Herd"). */
export interface MigrationVariant {
  id: string;
  name: string;
  weight: number;
  /** Concurrent migrants the herd sustains pouring into a single caught zone. */
  streamCap: number;
  /** Coverage half-width of the directional band (node-units) — zones within this of
   *  the band's spine get the flow. */
  radius: number;
  color?: string;
}

/** The whole Migration mechanic as data (mirrors the other surges — every number a knob). */
export interface MigrationSurge {
  /** Per-STEP chance a new migration IGNITES (gated by pressure; only fires when below
   *  the concurrency cap AND ≥2 distinct Field regions are in view). */
  igniteChance: number;
  /** Most migrations crossing the map at once (the normal cap; lifts with concurrency). */
  maxConcurrent: number;
  /** Seconds a herd GRAZES at its origin Field before it sets off (rolled in range). */
  grazeSeconds: [number, number];
  /** March speed of the herd's HEAD across the map (node-units/sec). */
  marchSpeed: number;
  /** Seconds the herd lingers at the destination after the head arrives, before the cull. */
  cullDelaySeconds: number;
  /** Speed the TAIL catches up during the cull (node-units/sec) — the flow recedes. */
  cullSpeed: number;
  /** Default band coverage half-width (a variant may override). */
  radius: number;
  /** The faction the herd belongs to (the new 'beast'). */
  faction: string;
  /** The herd ROSTER (beasts rolled per migrant) + the streamed level bonus. */
  roster: PackTableEntry[];
  levelBonus: number;
  /** Seconds between in-zone migrant spawns, and how many amble in per tick. */
  streamInterval: number;
  streamBatch: [number, number];
  /** When the player STRIKES a herd member, the ADULTS within this rouse to retaliate. */
  rouseRadius: number;
  /** The herd flavours (Great Migration / Small Herd / …). */
  variants: MigrationVariant[];
  /** Banner colour (falls back to the variant / faction colour, then the tan). */
  color?: string;
  /** How far PAST the charted bounds the overlay scouts for Field blobs (node-units) —
   *  a herd may set off toward a Field just beyond the frontier ("a brand new field"). */
  scoutMargin: number;
}

/** What the engine reads to pour the herd through a caught zone. */
export interface MigrationInfo {
  id: string;
  faction: string;
  color: string;
  /** Unit vector of the migration's flow (map space = arena space) — the engine derives
   *  the ENTRY side (facing origin) and the DESTINATION exit (facing dest) from it. */
  dir: MapCoord;
  streamCap: number;
  levelBonus: number;
  variant: string;
}

/** One crossing herd — its sampled endpoints + the band's growing/receding ends. */
interface ActiveMigration {
  id: string;
  origin: MapCoord;
  dest: MapCoord;
  originRegion: string;
  destRegion: string;
  phase: 'graze' | 'march' | 'cull';
  /** 0..1 fraction along origin→dest of the band's leading edge (the head). */
  headT: number;
  /** 0..1 fraction of the trailing edge (advances during the cull → the flow recedes). */
  tailT: number;
  age: number;
  grazeLeft: number;
  cullDelayLeft: number;
  segLen: number;
  radius: number;
  streamCap: number;
  color: string;
  variant: string;
}

const lerp = (a: MapCoord, b: MapCoord, t: number): MapCoord =>
  ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Distance from point p to the segment a→b (the band's spine). */
function segDist(p: MapCoord, a: MapCoord, b: MapCoord): number {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-6) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(p.x - (a.x + vx * t), p.y - (a.y + vy * t));
}

export class MigrationField implements WorldOverlay {
  readonly id = 'migration';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: MigrationSurge;
  private readonly biomeSeed: number;
  private migrations: ActiveMigration[] = [];
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: MigrationSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.biomeSeed = ctx.biomeSeed;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();

    // 1. LIFECYCLE — graze ⇒ march (head grows toward dest) ⇒ cull (tail catches up).
    for (const m of this.migrations) {
      m.age += dt;
      if (m.phase === 'graze') {
        m.grazeLeft -= dt;
        if (m.grazeLeft <= 0) m.phase = 'march';
      } else if (m.phase === 'march') {
        const adv = m.segLen > 1 ? (this.cfg.marchSpeed * dt) / m.segLen : 1;
        m.headT = Math.min(1, m.headT + adv);
        if (m.headT >= 1) { m.phase = 'cull'; m.cullDelayLeft = this.cfg.cullDelaySeconds; }
      } else { // cull
        if (m.cullDelayLeft > 0) m.cullDelayLeft -= dt;
        else {
          const adv = m.segLen > 1 ? (this.cfg.cullSpeed * dt) / m.segLen : 1;
          m.tailT = Math.min(1, m.tailT + adv);
        }
      }
    }
    // The tail caught the head — the herd has fully passed. It's gone.
    this.migrations = this.migrations.filter(m => !(m.phase === 'cull' && m.tailT >= 1));

    // 2. STEP cadence — passively IGNITE new crossings (gate + cap + ≥2 fields gated).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.migrations.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* migrations target sampled coordinates, not freshly-charted ids */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the herd is the engine STREAM, not a table bias

  renderMap(): MapLayer {
    let under = '', over = '';
    for (const m of this.migrations) {
      const a = lerp(m.origin, m.dest, m.tailT);
      const b = lerp(m.origin, m.dest, Math.max(m.headT, m.tailT));
      const col = m.color;
      const ax = a.x.toFixed(1), ay = a.y.toFixed(1), bx = b.x.toFixed(1), by = b.y.toFixed(1);
      if (coordDist(a, b) > 1) {
        // The soft coverage band — a fat translucent corridor the herd pours through.
        under += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${col}" stroke-opacity="0.07" stroke-width="${(m.radius * 2).toFixed(1)}" stroke-linecap="round"/>`;
        under += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${col}" stroke-opacity="0.12" stroke-width="${m.radius.toFixed(1)}" stroke-linecap="round"/>`;
        // The directional spine + arrowhead at the leading edge.
        over += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${col}" stroke-opacity="0.8" stroke-width="2" stroke-dasharray="6 5"/>`;
        over += this.arrowHead(a, b, col);
      }
      // A pulse at the herd's leading edge (the gathering point during graze).
      over += `<circle cx="${bx}" cy="${by}" r="6" fill="none" stroke="${col}" stroke-width="2" `
        + `stroke-opacity="0.9"><animate attributeName="r" values="4;8;4" dur="2s" repeatCount="indefinite"/></circle>`;
    }
    return { under, over };
  }

  private arrowHead(a: MapCoord, b: MapCoord, col: string): string {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const L = 11, w = 0.5;
    const p1x = (b.x - Math.cos(ang - w) * L).toFixed(1), p1y = (b.y - Math.sin(ang - w) * L).toFixed(1);
    const p2x = (b.x - Math.cos(ang + w) * L).toFixed(1), p2y = (b.y - Math.sin(ang + w) * L).toFixed(1);
    return `<polyline points="${p1x},${p1y} ${b.x.toFixed(1)},${b.y.toFixed(1)} ${p2x},${p2y}" `
      + `fill="none" stroke="${col}" stroke-opacity="0.9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // --- accessors the engine reads --------------------------------------------

  /** Live config (the engine reads the stream / roster / rouse knobs). */
  surge(): MigrationSurge { return this.cfg; }

  /** The migration whose band currently rolls over a zone, or null. Spares non-
   *  streamable ground (caves / special / event-owned / sanctuaries / forbidden). */
  migrationOn(zoneId: string): MigrationInfo | null {
    const z = this.nodesById[zoneId];
    if (!z || !this.streamable(z)) return null;
    for (const m of this.migrations) {
      const a = lerp(m.origin, m.dest, m.tailT);
      const b = lerp(m.origin, m.dest, Math.max(m.headT, m.tailT));
      if (segDist(z.map, a, b) <= m.radius) {
        const dx = m.dest.x - m.origin.x, dy = m.dest.y - m.origin.y;
        const len = Math.hypot(dx, dy) || 1;
        return {
          id: m.id, faction: this.cfg.faction, color: m.color,
          dir: { x: dx / len, y: dy / len },
          streamCap: m.streamCap, levelBonus: this.cfg.levelBonus, variant: m.variant,
        };
      }
    }
    return null;
  }

  /** Read-only snapshot for the map markers / tests — each herd's moving TRAIL of
   *  glyph points spaced along the active band (they advance as head/tail move). */
  peek(): ReadonlyArray<{ id: string; color: string; variant: string; trail: { k: number; x: number; y: number }[] }> {
    return this.migrations.map(m => {
      const a = lerp(m.origin, m.dest, m.tailT);
      const b = lerp(m.origin, m.dest, Math.max(m.headT, m.tailT));
      const span = coordDist(a, b);
      const count = Math.min(8, Math.max(1, Math.round(span / 60)));
      const trail: { k: number; x: number; y: number }[] = [];
      for (let k = 0; k < count; k++) {
        const t = count === 1 ? 0 : k / (count - 1);
        trail.push({ k, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
      return { id: m.id, color: m.color, variant: m.variant, trail };
    });
  }

  activeCount(): number { return this.migrations.length; }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: ignite a migration whose band PASSES THROUGH the player's current zone, so
   *  the stream pours in here at once (endpoints snapped to real Fields when two are
   *  in view, else a synthetic corridor through the zone). (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here)) return false;
    // ORIGIN = the nearest real Field (so the map arrow starts on grassland), else a
    // point off to one side. DEST = the origin MIRRORED across the player's zone, so
    // the band passes straight THROUGH `here` (segDist 0) — coverage is guaranteed and
    // the stream pours in at once, unlike the passive ignite which only catches zones
    // the field-to-field band happens to roll over.
    const fields = this.scoutFields(view);
    let origin: MapCoord = { x: here.map.x - 760, y: here.map.y - 130 }, oid = 'dev_o';
    let bd = Infinity;
    for (const f of fields) {
      const d = coordDist(here.map, f.point);
      if (d > 80 && d < bd) { bd = d; origin = f.point; oid = f.regionId; }
    }
    const dest = { x: here.map.x * 2 - origin.x, y: here.map.y * 2 - origin.y };
    const m = this.makeMigration({ regionId: oid, point: origin }, { regionId: 'dev_d', point: dest });
    // Skip straight to a fully-extended band lingering over `here` (a long cull window).
    m.phase = 'cull'; m.headT = 1; m.tailT = 0; m.cullDelayLeft = 60; m.grazeLeft = 0;
    this.migrations.push(m);
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May the herd STREAM through a zone? Kept in LOCKSTEP with the engine's stream
   *  guard (world.ts updateMigrationStream): never a cave, special arena, floating /
   *  event-owned node, sanctuary, or biome-forbidden ground. */
  private streamable(z: ZoneDef): boolean {
    return z.caveDepth == null && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed('migration', z);
  }

  /** Roll a fresh crossing between two sampled Field points (seeded at the variant). */
  private makeMigration(o: { regionId: string; point: MapCoord }, d: { regionId: string; point: MapCoord }): ActiveMigration {
    const v = this.rng.weighted(this.cfg.variants);
    const segLen = coordDist(o.point, d.point);
    return {
      id: `herd_${this.seq++}`,
      origin: { x: o.point.x, y: o.point.y },
      dest: { x: d.point.x, y: d.point.y },
      originRegion: o.regionId, destRegion: d.regionId,
      phase: 'graze', headT: 0, tailT: 0, age: 0,
      grazeLeft: this.rng.range(this.cfg.grazeSeconds[0], this.cfg.grazeSeconds[1]),
      cullDelayLeft: 0,
      segLen, radius: v.radius || this.cfg.radius, streamCap: v.streamCap,
      color: v.color ?? this.cfg.color ?? FACTION_COLORS[this.cfg.faction] ?? BEAST_BROWN,
      variant: v.name,
    };
  }

  /** Pick an origin Field + a DIFFERENT destination Field and set the herd off. */
  private tryIgnite(view: OverlayView): void {
    const fields = this.scoutFields(view);
    if (fields.length < 2) return;
    const oi = this.rng.int(0, fields.length - 1);
    let di = this.rng.int(0, fields.length - 1);
    if (di === oi) di = (di + 1) % fields.length;
    this.migrations.push(this.makeMigration(fields[oi], fields[di]));
  }

  /** Scout the visible map (charted bounds + scoutMargin) for distinct contiguous
   *  Field regions, returning one representative in-blob point per region. De-dup is by
   *  the CANONICAL regionId (entry-independent), never a bounding-box test — a bbox of
   *  an irregular blob can swallow a distinct region in its concavity / pad margin and
   *  drop it, starving ignition. A flood BUDGET bounds the worst case (a huge single
   *  field whose every probe re-floods): the scan is coarse + capped, so each ignite
   *  attempt does at most a few dozen floods. */
  private scoutFields(view: OverlayView): { regionId: string; point: MapCoord }[] {
    const b = this.visibleBounds(view);
    if (!b) return [];
    // Bound the scan to ≤ ~40×40 samples regardless of how large the explored map grows.
    const stepX = Math.max(90, (b.maxX - b.minX) / 40);
    const stepY = Math.max(90, (b.maxY - b.minY) / 40);
    const regions = new Map<string, MapCoord>();
    let floods = 0;
    for (let x = b.minX; x <= b.maxX && floods < FIELD_SCOUT_FLOOD_BUDGET; x += stepX) {
      for (let y = b.minY; y <= b.maxY && floods < FIELD_SCOUT_FLOOD_BUDGET; y += stepY) {
        if (biomeAt({ x, y }, this.biomeSeed) !== FIELD_BIOME) continue;
        floods++;
        const ext = fieldRegionAt({ x, y }, this.biomeSeed);
        if (ext && !regions.has(ext.regionId)) regions.set(ext.regionId, { x, y });
      }
    }
    return [...regions.entries()].map(([regionId, point]) => ({ regionId, point: { x: point.x, y: point.y } }));
  }

  /** The bounding box of the VISIBLE (charted) map, padded by scoutMargin so a herd
   *  can set off toward a Field just beyond the frontier. Null when nothing's charted. */
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
    const pad = this.cfg.scoutMargin;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }
}

// --- map markers (registered on import — zero panels.ts edits) ----------------
//
// Each crossing herd pins a moving COLUMN of paw-print glyphs along its band — a
// continuous pack drifting from one Field to the next (the user's "Hunt icons slowly
// moving"). fog:'always' so the migration reads on the map whether or not its path is
// charted; the points ride the live band, so the column MARCHES across the world.
registerMarkerSource((world: World): MapMarker[] => {
  const mf = world.sim.migrationField;
  if (!mf) return [];
  const out: MapMarker[] = [];
  for (const h of mf.peek()) {
    for (const pt of h.trail) {
      out.push({
        id: `migration-${h.id}-${pt.k}`, coord: { x: pt.x, y: pt.y },
        glyph: '🐾', fill: '#1c160c', stroke: h.color, text: '#f0e2c0', r: 8,
        title: `Migration — a ${h.variant} crosses the plains`, fog: 'always', z: 17,
      });
    }
  }
  return out;
});

// --- zone-info row (registered on import) ------------------------------------
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.migrationField?.migrationOn(zoneId);
  if (!info) return [];
  const here = zoneId === world.zone.id;
  return [{
    kind: 'event', icon: '🐾', color: info.color, label: `Migration · ${info.variant}`,
    detail: here ? 'a great herd ambles through — leave them be, or face the adults'
      : 'a migrating herd crosses this ground',
    z: 15,
  }];
});
