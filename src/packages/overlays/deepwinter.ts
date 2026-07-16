// ---------------------------------------------------------------------------
// DEEPWINTER FIELD — the creeping frost: a WINTER FRONT that is born in the
// world's own climate FIELD and marches through COORDINATE SPACE, converting
// whatever minted ground its territory swallows (pure overlay).
//
// The map's climate geography becomes gameplay — and the map itself becomes a
// SITUATIONAL-AWARENESS MAP. The EYE of winter opens at a cold COORDINATE
// (climateAt/biomeAt sampled directly — winter country per the biome field),
// deliberately clear of every charted node, of town, and of the player: the
// event is NEVER retroactive (no backtracking to ground you already cleared)
// and never spawns on top of anyone. From that eye the front claims the world
// cell by cell on a march lattice, each step taking the COLDEST unclaimed
// boundary cell — so the frost consolidates the cold country first and then
// pushes down the temperature gradient toward the warm, charted world exactly
// like an advancing army. The claimed territory IS the front: the map draws it
// as one contiguous wash behind the node web with an animated frontline along
// its boundary — a war map's shifting border, watchable from ignition day.
//
// Minted zones are DERIVED state: the moment the territory swallows a node,
// that zone converts and everything downstream behaves exactly as before —
// the engine dresses it on entry (snow at the frozen floor, WHITEOUT banks,
// intensity-scaled Rimebound packs) and the biome warp makes frontier zones
// minted inside the claim come out winter at mint. The glacial heart
// CRYSTALLIZES: the first held zone within reach of the eye (usually one the
// player mints pushing toward it) becomes the heart — its def is grafted a
// frozen_lake landmark and the WINTER KING (Crowned) holds it. Clearing
// converted ground changes nothing; only felling the King does — the march
// stops and the thaw walks the territory home newest-ground-first, back to
// the eye it was born from. Conservative BY DESIGN: one front at a time, a
// rare ignition, a slow telegraphed creep, a hard province cap.
//
// PURE of the engine, exactly like ContagionField: it owns the lattice march
// + the zone-conversion sync + the thaw clock, with no runtime coupling to
// World (the import-time marker/zone-info registrations only). The engine
// reads frostOn()/kingIn()/convertedZones()/eyeWarp()/consumeHeartMark() and
// calls onWinterKingSlain() back from the kill row.
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../../core/math';
import { Rng } from '../../core/rng';
import { START_ZONE, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { biomeAt } from '../../world/biomes';
import { climateAt } from '../../world/climate';
import { coordDist, type MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { DEEPWINTER_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed ignition cadence (seconds)

/** 4-neighbourhood of the march lattice. */
const NEIGH4: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Compass octant for the ignition bulletin (screen-space: +y is south). */
const OCTANTS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
function octantOf(dx: number, dy: number): string {
  const i = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return OCTANTS[((i % 8) + 8) % 8];
}

/** The whole Deepwinter mechanic as data — every number a knob (mirrors the
 *  other surges). Carried by the def, passed into the overlay constructor. */
export interface DeepwinterSurge {
  /** Per-STEP base chance (×ignitionMul) a winter IGNITES. ONE front at a
   *  time is a structural invariant of this overlay, not a knob — the state
   *  below holds a single nullable front by design. */
  igniteChance: number;
  /** The EYE only opens where the climate field runs at/below this
   *  temperature — no winter is born out of warm country. */
  igniteMaxTemp: number;
  /** Biomes the eye may open in (biomeAt sampled at the candidate coordinate
   *  — a winter is born in winter country, charted or not). */
  centerBiomes: string[];
  /** Min distance from town for the eye — a campaign, never a siege of home. */
  seedMinDist: number;
  /** The eye opens ONLY this clear of every charted surface node: the event
   *  is never retroactive — no winter materializes over ground the player
   *  already walked; the front must MARCH there in the open. */
  minClearFromCharted: number;
  /** …and this clear of the player's current zone (never an ambush-spawn). */
  avoidPlayerDist: number;
  /** How far past the charted envelope the ignition scan reaches — the same
   *  "the world exists beyond the map's edge" idiom the biome wash paints
   *  with; the eye usually opens just past the known cold rim. */
  igniteSearchMargin: number;
  /** The march lattice cell size (world/node units). The territory, the
   *  frontline, and the map wash all live on this grid. */
  cellSpan: number;
  /** The province cap: the winter claims at most this many cells — a region,
   *  never the world. At the cap the front HOLDS until broken. */
  maxCells: number;
  /** Diamond radius of cells claimed at birth (1 = the eye + 4 neighbours:
   *  present on the map, not yet a crisis). */
  initialRing: number;
  /** Seconds (÷severity) per cell taken — slow and telegraphed (the generous
   *  response window is the design). */
  marchInterval: number;
  /** The frost parts around sanctuaries: no cell is claimed within this of a
   *  safe zone's node (town stays an island in the white). */
  safeClear: number;
  /** A held minted zone this near the eye CRYSTALLIZES as the glacial heart
   *  (frozen_lake graft + the King). Sized past the coldest biomes' node
   *  spacing so pushing toward the eye always finds the heart a body. */
  heartRadius: number;
  /** Floor on a held zone's intensity (the thin edge still fields a patrol). */
  minIntensity: number;
  /** Seconds per thaw step after the King falls… */
  thawInterval: number;
  /** …and cells ceded per step (the retreat visibly outpaces the advance). */
  thawCells: number;
  /** The biome a converted zone's ground WARPS toward (the engine stamps a
   *  transient BiomeFieldModifier per converted zone — frontier zones minted
   *  inside the warp inherit the winter at mint), + the warp geometry. */
  warpBiome: string;
  warp: { radius: number; strength: number };
  /** The standing warp around the EYE itself (minted or not) — ground minted
   *  toward the heart comes out winter country, frozen lake and all. */
  eyeWarpRadius: number;
  /** The winter-court faction the engine fields in a converted zone. */
  faction: string;
  /** The Winter King's monster id (raised at the glacial heart) + his tier. */
  bossDefId: string;
  bossPromote: 'none' | 'champion' | 'crowned';
  /** Court packs the engine materializes in a converted zone (lerped by
   *  intensity — thicker near the eye) and the size of each pack. */
  packCount: [number, number];
  packSize: [number, number];
  /** The WHITEOUT the engine plants via fogEnsure: which registered fog kind,
   *  and how many banks roll per converted zone. */
  whiteout: { kind: string; banks: [number, number] };
  /** Conversion snow: the cover a converted zone wakes wearing, and the
   *  runtime floor it never melts below while held (World.snowFloor). */
  snow: { cover: number; floor: number };
  /** Felling the King pays this (xp + gems), scaled by the heart zone level. */
  reward: { xpBase: number; xpPerLevel: number; gems: number };
  /** The banner colour (entry bulletins; territory washes ride FACTION_COLORS). */
  color: string;
  /** Optional palette override (defaults to the module DEEPWINTER_COLORS) —
   *  the extensibility seam for a second season (a creeping heat, a rot). */
  glow?: { strong: string; weak: string; accent: string; edge: string };
}

/** What the engine reads to dress/field a converted zone. */
export interface FrostInfo {
  /** 0..1, falls off with distance from the eye (pack-density driver). */
  intensity: number;
  /** This is the crystallized glacial heart (and the winter still stands) —
   *  the engine raises the Winter King here. */
  isHeart: boolean;
  /** The King has fallen; the front is retreating (entry text softens). */
  thawing: boolean;
  color: string;
  /** 'deep winter' | 'hard frost' | 'first frost' — severity word. */
  label: string;
}

/** THE front — at most one lives at a time (structural, not a knob). */
interface FrostFront {
  id: string;
  /** The EYE of winter — a coordinate in the climate field. Unminted at
   *  birth by design (never retroactive, never on top of anyone). */
  center: MapCoord;
  /** The minted zone the heart has CRYSTALLIZED onto — null until held
   *  ground exists within heartRadius of the eye. */
  heartZoneId: string | null;
  /** The engine has grafted the bound heart's frozen_lake (re-arms if the
   *  heart ever re-crystallizes onto a different body). */
  heartMarked: boolean;
  spreadAcc: number;
  /** The player has walked converted ground (one-shot discovery ledger). */
  seen: boolean;
  /** The King is dead → the winter retreats (no more marching). */
  thawing: boolean;
  thawAcc: number;
  dead: boolean;
}

/** A held minted zone — DERIVED from the claimed cells each sync. */
interface FrozenZone {
  /** Distance-from-the-eye intensity (1 at the eye → minIntensity at the rim). */
  intensity: number;
}

export class DeepwinterField implements WorldOverlay {
  readonly id = 'deepwinter';
  /** Durable: a half-fought winter is a campaign — the territory, the eye,
   *  and a running thaw all resume (no quit-to-thaw cheese). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Deepwinter';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: DeepwinterSurge;
  private readonly glowColors: { strong: string; weak: string; accent: string; edge: string };
  /** The climate/biome FIELD seed (ctx.biomeSeed) — the eye and the march
   *  sample the same substrate worldgen bakes nodes from. */
  private readonly biomeSeed: number;
  private front: FrostFront | null = null;
  /** The claimed territory: lattice cell key "gx,gy" → claim order. */
  private cells = new Map<string, number>();
  private claimSeq = 0;
  /** Held minted zones (zoneId → derived state) — rebuilt by sync(). */
  private frozen = new Map<string, FrozenZone>();
  /** The claim changed since the last sync (march/thaw/restore set this). */
  private dirty = false;
  private lastNodeCount = -1;
  private acc = 0;
  private seq = 0;
  /** One-shot ignition news the engine drains into the HUD (transient). */
  private news: string[] = [];
  /** Live reference to the world's node map (= view.byId), refreshed each tick. */
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: DeepwinterSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.biomeSeed = ctx.biomeSeed;
    this.glowColors = surge.glow ?? DEEPWINTER_COLORS;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const pressure = clamp(g.severityMul, 0, 1.5); // march cadence = the severity crank

    const f = this.front;
    if (f && !f.dead) {
      if (f.thawing) {
        f.thawAcc += dt;
        while (f.thawAcc >= this.cfg.thawInterval) { f.thawAcc -= this.cfg.thawInterval; this.thawStep(f); }
      } else if (g.active) { // a closed gate FREEZES the march in place (it neither takes nor cedes)
        f.spreadAcc += dt * pressure;
        while (f.spreadAcc >= this.cfg.marchInterval) { f.spreadAcc -= this.cfg.marchInterval; this.march(view); }
      }
    }
    if (this.front?.dead) {
      this.cells.clear();
      this.frozen.clear();
      this.front = null;
      this.dirty = false;
    }

    // Zone conversion is DERIVED state: re-sync whenever the claim changed or
    // the node web grew — a fresh frontier minted inside the territory
    // converts the moment it exists, and ground the thaw ceded is released.
    if (this.front && (this.dirty || view.nodes.length !== this.lastNodeCount)) {
      this.sync(view);
      this.dirty = false;
      this.lastNodeCount = view.nodes.length;
    }

    // IGNITION — roll on the fixed step; ONE front at a time, structurally.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active && !this.front) this.maybeIgnite(view);
    }
  }

  onNodeCharted(): void { /* the sync above catches fresh nodes via the node count */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the court is engine-MATERIALIZED (intensity-scaled), not a table bias

  /** MAP-FIT EXTENT (WorldOverlay.mapExtent): the territory's bounding corners
   *  (+ one cell of air), so the fitted world map always shows the whole front
   *  — the eye opens past the charted rim, and without this the war map's
   *  border would be born off-screen. */
  mapExtent(): ReadonlyArray<{ x: number; y: number }> {
    const f = this.front;
    if (!f || f.dead || !this.cells.size) return [];
    const s = this.cfg.cellSpan;
    let gx0 = Infinity, gx1 = -Infinity, gy0 = Infinity, gy1 = -Infinity;
    for (const key of this.cells.keys()) {
      const gx = this.gxOf(key), gy = this.gyOf(key);
      if (gx < gx0) gx0 = gx;
      if (gx > gx1) gx1 = gx;
      if (gy < gy0) gy0 = gy;
      if (gy > gy1) gy1 = gy;
    }
    return [
      { x: (gx0 - 1) * s, y: (gy0 - 1) * s },
      { x: (gx1 + 2) * s, y: (gy1 + 2) * s },
    ];
  }

  // --- the map: a TERRITORY with a frontline ---------------------------------

  /** The situational-awareness map: the claimed territory drawn as ONE
   *  contiguous frost wash behind the node web (deeper winter toward the
   *  older interior), an animated MARCHING frontline along the boundary
   *  (dashes crawl outward on the advance, homeward on the thaw), rime rims
   *  on held nodes, and the EYE glyph at the winter's center from ignition
   *  day — minted or not. Deliberately a war map's border, not Contagion's
   *  pulse rings or Mycelia's halos. Deepwinter is TELEGRAPHED, never a
   *  secret. */
  renderMap(_nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    const f = this.front;
    if (!f || f.dead) return { under, over };
    const s = this.cfg.cellSpan;
    const total = Math.max(1, this.claimSeq);
    let edges = '';
    for (const [key, order] of this.cells) {
      const gx = this.gxOf(key), gy = this.gyOf(key);
      const x = gx * s, y = gy * s;
      // The territory wash: older ground (the interior) reads DEEPER winter.
      const depth = 1 - clamp(order / total, 0, 1);
      const col = mixHex(this.glowColors.weak, this.glowColors.strong, 0.35 + 0.65 * depth);
      under += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(s + 0.6).toFixed(1)}" height="${(s + 0.6).toFixed(1)}" `
        + `fill="${col}" fill-opacity="${(0.10 + 0.08 * depth).toFixed(3)}"/>`;
      // THE FRONTLINE: every claimed→free cell edge joins one path.
      if (!this.cells.has(`${gx + 1},${gy}`)) edges += `M${(x + s).toFixed(1)} ${y.toFixed(1)}V${(y + s).toFixed(1)}`;
      if (!this.cells.has(`${gx - 1},${gy}`)) edges += `M${x.toFixed(1)} ${y.toFixed(1)}V${(y + s).toFixed(1)}`;
      if (!this.cells.has(`${gx},${gy + 1}`)) edges += `M${x.toFixed(1)} ${(y + s).toFixed(1)}H${(x + s).toFixed(1)}`;
      if (!this.cells.has(`${gx},${gy - 1}`)) edges += `M${x.toFixed(1)} ${y.toFixed(1)}H${(x + s).toFixed(1)}`;
    }
    if (edges) {
      // Soft glow under, crisp MARCHING ANTS over. Dash period 12 and offset
      // ±24 are an exact multiple, so the crawl loops seamlessly; the thaw
      // reverses the direction (the border walking home) and dims it.
      const op = f.thawing ? 0.5 : 0.85;
      const dur = f.thawing ? '1.1s' : '1.7s';
      const off = f.thawing ? 24 : -24;
      under += `<path d="${edges}" fill="none" stroke="${this.glowColors.edge}" stroke-width="4.5" stroke-opacity="0.16" stroke-linecap="round"/>`;
      over += `<path d="${edges}" fill="none" stroke="${this.glowColors.edge}" stroke-width="1.7" stroke-opacity="${op}" stroke-dasharray="7 5">`
        + `<animate attributeName="stroke-dashoffset" values="0;${off}" dur="${dur}" repeatCount="indefinite"/>`
        + `</path>`;
    }
    // Held nodes: a light frosted pane + rime rim (the territory carries the
    // bulk of the read now; the node treatment just confirms "this zone").
    for (const [zid, z] of this.frozen) {
      const n = this.nodesById[zid];
      if (!n) continue;
      const t = clamp(z.intensity, 0, 1);
      const col = mixHex(this.glowColors.weak, this.glowColors.strong, t);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      under += `<circle cx="${cx}" cy="${cy}" r="${(12 + 3 * t).toFixed(1)}" fill="${col}" fill-opacity="${(0.10 + 0.08 * t).toFixed(3)}"/>`;
      over += `<circle cx="${cx}" cy="${cy}" r="12.5" fill="none" stroke="${col}" stroke-width="1.1" `
        + `stroke-opacity="${(0.35 + 0.3 * t).toFixed(2)}" stroke-dasharray="2.6 2.2"/>`;
    }
    // THE EYE: the winter's center, marked from ignition day. Once the heart
    // crystallizes onto a minted zone the glyph rides that node instead (one
    // eye, never two).
    const heartNode = f.heartZoneId ? this.nodesById[f.heartZoneId] : undefined;
    const ex = (heartNode ? heartNode.map.x : f.center.x).toFixed(1);
    const ey = (heartNode ? heartNode.map.y : f.center.y).toFixed(1);
    over += `<circle cx="${ex}" cy="${ey}" r="13" fill="none" stroke="${this.glowColors.accent}" stroke-width="1.6" stroke-opacity="0.8">`
      + `<animate attributeName="r" values="13;17;13" dur="3.2s" repeatCount="indefinite"/>`
      + `<animate attributeName="stroke-opacity" values="0.8;0.25;0.8" dur="3.2s" repeatCount="indefinite"/>`
      + `</circle>`
      + `<text x="${ex}" y="${(Number(ey) - 15).toFixed(1)}" text-anchor="middle" font-size="13" fill="${this.glowColors.accent}">❄</text>`;
    return { under, over };
  }

  // --- accessors the engine reads -------------------------------------------

  /** Live config (the engine reads the faction / boss / whiteout / snow knobs). */
  surge(): DeepwinterSurge { return this.cfg; }

  /** Event-activity fed to the bloom web (WorldOverlay.activityAt). */
  activityAt(zoneId: string): number { return this.frozen.has(zoneId) ? 1 : 0; }

  /** The frost holding a zone (intensity + heart/thaw flags), or null when
   *  free ground. The engine dresses + fields off this on entry. */
  frostOn(zoneId: string): FrostInfo | null {
    const z = this.frozen.get(zoneId);
    const f = this.front;
    if (!z || !f || f.dead) return null;
    return {
      intensity: z.intensity,
      isHeart: zoneId === f.heartZoneId && !f.thawing, // a slain King never re-crowns
      thawing: f.thawing,
      color: this.cfg.color,
      label: z.intensity > 0.66 ? 'deep winter' : z.intensity > 0.33 ? 'hard frost' : 'first frost',
    };
  }

  /** The Winter King's spawn descriptor if this zone is the live heart. */
  kingIn(zoneId: string): { bossDefId: string; promote: 'none' | 'champion' | 'crowned' } | null {
    return this.frostOn(zoneId)?.isHeart
      ? { bossDefId: this.cfg.bossDefId, promote: this.cfg.bossPromote }
      : null;
  }

  /** Every currently-converted zone id — the engine reconciles the biome-warp
   *  modifiers (setWarp/unwarp) against this set each tick, mycelia-style. */
  convertedZones(): string[] {
    const f = this.front;
    if (!f || f.dead) return [];
    return [...this.frozen.keys()];
  }

  /** The standing biome warp around the EYE itself (minted or not) — ground
   *  minted toward the heart comes out winter country. Null once the winter
   *  is dead (the engine unwarps). */
  eyeWarp(): { x: number; y: number; radius: number } | null {
    const f = this.front;
    if (!f || f.dead) return null;
    return { x: f.center.x, y: f.center.y, radius: this.cfg.eyeWarpRadius };
  }

  /** ONE-SHOT per crystallization: the heart zone whose def still needs its
   *  frozen_lake landmark grafted (the glacial heart is a REAL place — the
   *  engine appends the landmark roll to the persisted def; the next visit
   *  builds the lake). */
  consumeHeartMark(): string | null {
    const f = this.front;
    if (!f || f.dead || f.heartMarked || !f.heartZoneId) return null;
    f.heartMarked = true;
    return f.heartZoneId;
  }

  /** One-shot HUD lines (ignition news) the engine drains near the player. */
  consumeNews(): string[] {
    if (!this.news.length) return [];
    const out = this.news;
    this.news = [];
    return out;
  }

  /** The player walked converted ground — returns true ONCE per front (the
   *  engine bumps the deepwinter_seen discovery ledger). */
  markDiscovered(zoneId: string): boolean {
    const f = this.front;
    if (!this.frozen.has(zoneId) || !f || f.dead) return false;
    if (f.seen) return false;
    f.seen = true;
    return true;
  }

  /** The Winter King fell at the heart — the march stops and the thaw begins
   *  (newest ground melts first: the front walks home). Returns true if this
   *  actually broke a standing winter (the cleanse ledger). */
  onWinterKingSlain(): boolean {
    const f = this.front;
    if (!f || f.dead || f.thawing) return false;
    f.thawing = true;
    f.thawAcc = 0;
    return true;
  }

  activeCount(): number { return this.front && !this.front.dead ? 1 : 0; }

  /** Read-only snapshot for tests / dev: held zones with coords + state. */
  peek(): ReadonlyArray<{ zoneId: string; x: number; y: number; intensity: number; isHeart: boolean; thawing: boolean }> {
    const f = this.front;
    if (!f || f.dead) return [];
    const out: { zoneId: string; x: number; y: number; intensity: number; isHeart: boolean; thawing: boolean }[] = [];
    for (const [zid, z] of this.frozen) {
      const n = this.nodesById[zid];
      if (!n) continue;
      out.push({
        zoneId: zid, x: n.map.x, y: n.map.y, intensity: z.intensity,
        isHeart: zid === f.heartZoneId, thawing: f.thawing,
      });
    }
    return out;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the front + the claimed lattice + the counters. Held ZONES
   *  are derived state (re-synced from the cells on the first tick back) —
   *  the territory is the truth, so nothing zone-shaped needs saving. */
  snapshot(): unknown {
    const f = this.front;
    return {
      front: f ? { ...f, center: { x: f.center.x, y: f.center.y } } : null,
      cells: [...this.cells.entries()].map(([key, order]) => [this.gxOf(key), this.gyOf(key), order]),
      claimSeq: this.claimSeq,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { front?: unknown; cells?: unknown[]; claimSeq?: unknown; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (typeof s.claimSeq === 'number' && Number.isFinite(s.claimSeq)) this.claimSeq = Math.max(this.claimSeq, Math.floor(s.claimSeq));
    const f = s.front as (Partial<FrostFront> & { center?: { x?: unknown; y?: unknown } }) | null;
    this.front = null;
    this.cells.clear();
    this.frozen.clear();
    // A pre-territory snapshot (the zone-hop era carried no center/cells) fails
    // these checks and is simply dropped — the winter recycles and re-ignites
    // on its own clock; never a crash, never a half-migrated ghost.
    if (f && typeof f === 'object' && !f.dead
      && typeof f.id === 'string'
      && f.center && typeof f.center.x === 'number' && Number.isFinite(f.center.x)
      && typeof f.center.y === 'number' && Number.isFinite(f.center.y)
      && [f.spreadAcc, f.thawAcc].every(n => typeof n === 'number' && Number.isFinite(n))) {
      this.front = {
        id: f.id,
        center: { x: f.center.x, y: f.center.y },
        heartZoneId: typeof f.heartZoneId === 'string' ? f.heartZoneId : null,
        heartMarked: !!f.heartMarked,
        spreadAcc: f.spreadAcc!, seen: !!f.seen,
        thawing: !!f.thawing, thawAcc: f.thawAcc!, dead: false,
      };
    }
    if (this.front && Array.isArray(s.cells)) {
      for (const raw of s.cells) {
        if (!Array.isArray(raw) || raw.length < 3) continue;
        const [gx, gy, order] = raw;
        if (![gx, gy, order].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
        this.cells.set(`${Math.floor(gx)},${Math.floor(gy)}`, Math.max(0, Math.floor(order)));
      }
    }
    if (this.front && !this.cells.size) this.front = null; // a winter with no ground recycles
    this.dirty = true;
    this.lastNodeCount = -1; // force a sync against the live web on the first tick back
  }

  /** Culled ground: held zones are derived (the next sync simply won't see
   *  them); a culled HEART un-crystallizes so a marching winter may re-crown
   *  on the next body near the eye — the territory itself never depends on
   *  any zone existing, so the front outlives any cull gracefully. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of [...this.frozen.keys()]) if (!has(zid)) this.frozen.delete(zid);
    const f = this.front;
    if (!f || f.dead) return;
    if (f.heartZoneId && !has(f.heartZoneId) && !f.thawing) {
      f.heartZoneId = null;
      f.heartMarked = false;
    }
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: open the EYE on the current zone's own coordinate (bypasses the
   *  never-retroactive ignition rules — QA wants the winter HERE, now) and
   *  sync immediately so the territory, the frontline, and the conversion
   *  all read at once. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.front) return false; // one winter at a time (matches production)
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here)) return false;
    this.seed({ x: here.map.x, y: here.map.y }, view.terrain);
    this.sync(view);
    this.news.push('A deep winter stirs — the frost is claiming this very ground.');
    return true;
  }

  // --- internals -------------------------------------------------------------

  private gxOf(key: string): number { return Number(key.slice(0, key.indexOf(','))); }
  private gyOf(key: string): number { return Number(key.slice(key.indexOf(',') + 1)); }

  private cellCenter(gx: number, gy: number): MapCoord {
    const s = this.cfg.cellSpan;
    return { x: (gx + 0.5) * s, y: (gy + 0.5) * s };
  }

  /** The climate field's temperature at a coordinate — the same substrate
   *  worldgen bakes node.geo.climate from (one truth, charted or not). */
  private tempAt(c: MapCoord): number {
    const t = climateAt(c, this.biomeSeed)['temperature'];
    return typeof t === 'number' && Number.isFinite(t) ? t : 0.5;
  }

  /** May a held zone actually CONVERT? THE shared predicate (zonePolicy) —
   *  safe zones, caves, event-owned and special ground all refuse, so the
   *  frost parts around town like a river around a stone even when the
   *  territory washes past it. */
  private streamable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  private makeFront(center: MapCoord): FrostFront {
    return {
      id: `deepwinter_${this.seq++}`,
      center: { x: center.x, y: center.y },
      heartZoneId: null, heartMarked: false,
      spreadAcc: 0, seen: false, thawing: false, thawAcc: 0, dead: false,
    };
  }

  /** Open the eye at `center` and claim the birth ring (diamond of
   *  initialRing) — present on the map, not yet a crisis. The frost is a
   *  LAND-BOUND field (the OverlayView.terrain contract): ring cells on
   *  open water are simply not taken. */
  private seed(center: MapCoord, terrain: OverlayView['terrain']): void {
    const f = this.makeFront(center);
    this.front = f;
    this.cells.clear();
    this.claimSeq = 0;
    const s = this.cfg.cellSpan;
    const gx0 = Math.floor(center.x / s), gy0 = Math.floor(center.y / s);
    const ring = Math.max(0, Math.floor(this.cfg.initialRing));
    for (let r = 0; r <= ring; r++) {
      for (let dx = -r; dx <= r; dx++) {
        const dy = r - Math.abs(dx);
        for (const yy of dy === 0 ? [gy0] : [gy0 + dy, gy0 - dy]) {
          if (terrain(this.cellCenter(gx0 + dx, yy)) === 'ocean') continue;
          this.cells.set(`${gx0 + dx},${yy}`, this.claimSeq++);
        }
      }
    }
    this.dirty = true;
  }

  /** IGNITION: open the eye at the COLDEST eligible coordinate — sampled from
   *  the climate/biome FIELD itself, not from any minted zone. Eligible means
   *  winter country (centerBiomes + the cold band), a real trek from town,
   *  clear of the player, and clear of EVERY charted node — the winter is
   *  born out in the unknown and must march into view. Deterministic pick
   *  (coldest; stable tie-break); rng spends only the ignition roll. */
  private maybeIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.igniteChance * this.gate().ignitionMul, 0, 1))) return;
    const surface = view.nodes.filter(z => z.caveDepth == null);
    if (!surface.length) return;
    const town = view.byId[START_ZONE];
    const tc = town ? town.map : { x: 0, y: 0 };
    const here = view.byId[view.currentZoneId]?.map;
    const s = this.cfg.cellSpan;
    const M = this.cfg.igniteSearchMargin;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of surface) {
      if (n.map.x < minX) minX = n.map.x;
      if (n.map.x > maxX) maxX = n.map.x;
      if (n.map.y < minY) minY = n.map.y;
      if (n.map.y > maxY) maxY = n.map.y;
    }
    const gx0 = Math.floor((minX - M) / s), gx1 = Math.floor((maxX + M) / s);
    const gy0 = Math.floor((minY - M) / s), gy1 = Math.floor((maxY + M) / s);
    let best: MapCoord | null = null;
    let bestTemp = Infinity;
    let bestKey = '';
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const c = this.cellCenter(gx, gy);
        // Cheap gates first; the every-node clearance scan runs last and rare.
        if (coordDist(c, tc) < this.cfg.seedMinDist) continue;
        if (here && coordDist(c, here) < this.cfg.avoidPlayerDist) continue;
        const t = this.tempAt(c);
        if (t > this.cfg.igniteMaxTemp) continue;
        if (t > bestTemp) continue; // can't beat the standing pick — skip the expensive checks
        if (view.terrain(c) === 'ocean') continue; // land-bound: no eye at sea
        if (!this.cfg.centerBiomes.includes(biomeAt(c, this.biomeSeed))) continue;
        let clear = true;
        for (const n of surface) {
          if (coordDist(n.map, c) < this.cfg.minClearFromCharted) { clear = false; break; }
        }
        if (!clear) continue;
        const key = `${gx},${gy}`;
        if (t < bestTemp || (t === bestTemp && key < bestKey)) { bestTemp = t; best = c; bestKey = key; }
      }
    }
    if (!best) return; // no eligible cold country in reach → no winter (yet)
    this.seed(best, view.terrain);
    this.news.push(`A deep winter stirs in the ${octantOf(best.x - tc.x, best.y - tc.y)} — the frost is on the march.`);
  }

  /** The march: claim ONE more cell — the COLDEST unclaimed boundary cell
   *  (stable tie-break), skipping sanctuary ground. The front consolidates
   *  the cold country first, then pushes down the temperature gradient
   *  toward the warm charted world: watching the map tells you where it
   *  will go next. At the province cap the front HOLDS. */
  private march(view: OverlayView): void {
    if (this.cells.size >= this.cfg.maxCells) return;
    const safes = view.nodes.filter(z => z.caveDepth == null && z.objective.kind === 'safe');
    const seen = new Set<string>();
    let pick: string | null = null;
    let pickTemp = Infinity;
    for (const key of this.cells.keys()) {
      const gx = this.gxOf(key), gy = this.gyOf(key);
      for (const [dx, dy] of NEIGH4) {
        const nk = `${gx + dx},${gy + dy}`;
        if (this.cells.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        const c = this.cellCenter(gx + dx, gy + dy);
        if (safes.some(z => coordDist(z.map, c) < this.cfg.safeClear)) continue;
        // LAND-BOUND (the OverlayView.terrain contract, like every marching
        // field): the frost stops at the sea — coastlines shape the front.
        if (view.terrain(c) === 'ocean') continue;
        const t = this.tempAt(c);
        if (t < pickTemp || (t === pickTemp && (pick === null || nk < pick))) { pickTemp = t; pick = nk; }
      }
    }
    if (!pick) return; // walled in by sanctuaries — the front holds
    this.cells.set(pick, this.claimSeq++);
    this.dirty = true;
  }

  /** The thaw cedes the NEWEST ground first — the beaten front walks home
   *  the way it came and dies at the eye. */
  private thawStep(f: FrostFront): void {
    const cede = [...this.cells.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, Math.floor(this.cfg.thawCells)));
    for (const [key] of cede) this.cells.delete(key);
    this.dirty = true;
    if (!this.cells.size) f.dead = true;
  }

  /** Derive the held-zone map from the claimed territory (+ crystallize the
   *  heart). A minted zone converts exactly when its node sits in a claimed
   *  cell and zone policy allows — so a frontier minted INTO the territory
   *  converts on arrival, and the thaw releases ground cell by cell. */
  private sync(view: OverlayView): void {
    const f = this.front;
    if (!f || f.dead) { this.frozen.clear(); return; }
    // The territory's current reach (for the intensity gradient): the winter
    // DEEPENS behind the front as the province grows.
    let reach = this.cfg.cellSpan;
    for (const key of this.cells.keys()) {
      const d = coordDist(this.cellCenter(this.gxOf(key), this.gyOf(key)), f.center);
      if (d > reach) reach = d;
    }
    const next = new Map<string, FrozenZone>();
    const s = this.cfg.cellSpan;
    for (const z of view.nodes) {
      if (!this.streamable(z)) continue;
      if (!this.cells.has(`${Math.floor(z.map.x / s)},${Math.floor(z.map.y / s)}`)) continue;
      const d = coordDist(z.map, f.center);
      next.set(z.id, {
        intensity: clamp(1 - d / (reach + s), this.cfg.minIntensity, 1),
      });
    }
    this.frozen = next;
    // HEART CRYSTALLIZATION: the first held zone within heartRadius of the
    // eye becomes the glacial heart (nearest wins; sticky once bound). The
    // player usually MINTS it pushing toward the eye — the campaign's goal
    // materializes exactly where the map has pointed all along.
    if (!f.heartZoneId && !f.thawing) {
      let best: string | null = null;
      let bd = this.cfg.heartRadius;
      for (const zid of this.frozen.keys()) {
        const n = view.byId[zid];
        if (!n) continue;
        const d = coordDist(n.map, f.center);
        if (d < bd || (d === bd && best !== null && zid < best)) { bd = d; best = zid; }
      }
      if (best) { f.heartZoneId = best; f.heartMarked = false; }
    }
  }
}

// --- map marker + zone-info (registered on import — zero panel edits) --------

registerMarkerSource((world: World): MapMarker[] => {
  const df = world.sim.deepwinterField;
  if (!df) return [];
  const out: MapMarker[] = [];
  for (const s of df.peek()) {
    if (!s.isHeart) continue;
    out.push({
      id: `deepwinter-heart-${s.zoneId}`, zoneId: s.zoneId,
      glyph: '❄', fill: '#101b26', stroke: DEEPWINTER_COLORS.strong, text: DEEPWINTER_COLORS.accent, r: 9,
      title: s.thawing
        ? 'The glacial heart — the King has fallen; the winter is in retreat'
        : 'The glacial heart — the Winter King holds his court on the frozen lake',
      fog: 'charted', z: 16,
    });
  }
  return out;
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.deepwinterField?.frostOn(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '❄', color: info.color, label: 'Deepwinter',
    detail: info.isHeart
      ? 'the glacial heart — fell the Winter King and the winter breaks'
      : info.thawing ? `${info.label} — the frost is in retreat`
        : `${info.label} — the front holds this ground`,
    z: 14,
  }];
});
