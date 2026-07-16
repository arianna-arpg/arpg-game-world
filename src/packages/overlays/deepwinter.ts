// ---------------------------------------------------------------------------
// DEEPWINTER FIELD — the creeping frost: a WINTER FRONT that ignites at the
// COLDEST charted node and marches zone-to-zone along the road graph,
// CONVERTING the land as it takes it (pure overlay).
//
// The map's climate geography becomes gameplay. Worldgen bakes every node's
// climate axes (ZoneDef.geo.climate — world/climate.ts); Deepwinter reads the
// TEMPERATURE axis twice: ignition picks the coldest eligible charted node
// (the glacial heart — its zone is guaranteed a frozen_lake landmark, grafted
// by the engine off consumeHeartMark), and every march step takes the COLDEST
// eligible frontier zone next. So the frost eats the cold end of the map
// first and then pushes into warmer country exactly like an advancing army —
// legible, predictable, and rooted in the world's own geography rather than a
// random flood. It rides ONLY existing edges (never mints frontiers); new
// ground minted INSIDE the front's biome warps inherits the winter at mint
// through the ordinary warp→sampleBiome path (freezeAt rivers and all).
//
// A CONVERTED zone is dressed by the engine on entry (materializeDeepwinter):
// standing snow held at the frozen floor (World.snowFloor), WHITEOUT banks
// through the fogEnsure runtime seam, intensity-scaled Rimebound packs — and
// the WINTER KING (Crowned) at the glacial heart. Clearing converted ground
// changes nothing; only felling the King does — the front stops, and the
// thaw RETREATS the winter outermost-ring-first back to the heart it lost
// (the army going home to bury its crown). Conservative BY DESIGN: one front
// at a time, a slow telegraphed early creep, and the map shows the front from
// ignition day — the response window is the point, not the surprise.
//
// PURE of the engine, exactly like ContagionField: it owns the node-space
// march + the per-zone conversion + the thaw clock, with no runtime coupling
// to World (the import-time marker/zone-info registrations only). The engine
// reads frostOn()/kingIn()/convertedZones()/consumeHeartMark() and calls
// onWinterKingSlain() back from the kill row.
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../../core/math';
import { Rng } from '../../core/rng';
import { START_ZONE, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { DEEPWINTER_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed ignition cadence (seconds)

/** The whole Deepwinter mechanic as data — every number a knob (mirrors the
 *  other surges). Carried by the def, passed into the overlay constructor. */
export interface DeepwinterSurge {
  /** Per-STEP base chance (×ignitionMul) a winter IGNITES. ONE front at a
   *  time is a structural invariant of this overlay, not a knob — the state
   *  below holds a single nullable front by design. */
  igniteChance: number;
  /** Seconds (÷severity) between the front taking ONE more zone — slow and
   *  telegraphed (the generous response window is the design). */
  spreadInterval: number;
  /** Extra zones taken the moment it ignites (each via one coldest-first
   *  march step): 1 = the heart plus ONE neighbour — present on the map,
   *  not yet threatening. The most conservative possible birth. */
  initialHops: number;
  /** March cap: the winter never reaches further than this many hops from
   *  the heart; intensity = clamp(1 − hops/maxHops, minIntensity, 1). */
  maxHops: number;
  minIntensity: number;
  /** Seconds between the thaw retreating ONE outermost ring after the King
   *  falls (the front walks home to bury its crown). */
  thawInterval: number;
  /** A node only IGNITES if its baked temperature sits at/below this (the
   *  cold band's shoulder) — no winter is born out of warm country. Nodes
   *  minted before climate baking carry no reading and never ignite. */
  igniteMaxTemp: number;
  /** Min node-distance from town for the heart — the frost marches FROM the
   *  cold end of the map, never out of the starting yard. */
  seedMinDist: number;
  /** The biome a converted zone's ground WARPS toward (the engine stamps a
   *  transient BiomeFieldModifier per converted zone — frontier zones minted
   *  inside the warp inherit the winter at mint), + the warp geometry. */
  warpBiome: string;
  warp: { radius: number; strength: number };
  /** The winter-court faction the engine fields in a converted zone. */
  faction: string;
  /** The Winter King's monster id (raised at the glacial heart) + his tier. */
  bossDefId: string;
  bossPromote: 'none' | 'champion' | 'crowned';
  /** Court packs the engine materializes in a converted zone (lerped by
   *  intensity — thicker near the heart) and the size of each pack. */
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
  /** 0..1, falls off with hops from the heart (pack-density driver). */
  intensity: number;
  /** This is the glacial heart (and the winter still stands) — the engine
   *  raises the Winter King here. */
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
  /** The glacial heart (hops === 0; the coldest charted node at ignition). */
  heartZoneId: string;
  spreadAcc: number;
  /** The player has walked converted ground (one-shot discovery ledger). */
  seen: boolean;
  /** The engine has grafted the heart's frozen_lake landmark (one-shot). */
  heartMarked: boolean;
  /** The King is dead → the winter retreats (no more marching). */
  thawing: boolean;
  thawAcc: number;
  dead: boolean;
}

/** Per-zone conversion state (keyed by zone id). */
interface FrozenZone {
  runId: string;
  /** Graph hop-distance from the heart (0 = the heart itself). */
  hops: number;
  /** Cached intensity = clamp(1 − hops/maxHops, minIntensity, 1). */
  intensity: number;
}

export class DeepwinterField implements WorldOverlay {
  readonly id = 'deepwinter';
  /** Durable: a half-fought winter is a campaign — the converted ground, the
   *  heart, and a running thaw all resume (no quit-to-thaw cheese). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Deepwinter';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: DeepwinterSurge;
  private readonly glowColors: { strong: string; weak: string; accent: string; edge: string };
  private front: FrostFront | null = null;
  private frozen = new Map<string, FrozenZone>();
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
        while (f.thawAcc >= this.cfg.thawInterval) { f.thawAcc -= this.cfg.thawInterval; this.thawRing(f); }
      } else if (g.active) { // a closed gate FREEZES the march in place (it neither takes nor cedes)
        f.spreadAcc += dt * pressure;
        while (f.spreadAcc >= this.cfg.spreadInterval) { f.spreadAcc -= this.cfg.spreadInterval; this.march(f, view); }
      }
    }
    if (this.front?.dead) {
      this.frozen.clear();
      this.front = null;
    }

    // IGNITION — roll on the fixed step; ONE front at a time, structurally.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active && !this.front) this.maybeIgnite(view);
    }
  }

  onNodeCharted(): void { /* the march rides existing edges; a fresh node bordering the front is caught next step */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the court is engine-MATERIALIZED (intensity-scaled), not a table bias

  // --- the map: a FRONT, not a blob -----------------------------------------

  /** Frosted washes on held ground, the glacial-heart glyph — and the RIME
   *  EDGE: an animated tick across every road where held land meets free,
   *  which chains along the graph into a visible FRONT LINE (deliberately
   *  not Contagion's pulse rings or Mycelia's halos — this reads as a
   *  border, an army's edge on the move). Painted off nodesById from
   *  ignition day: Deepwinter is TELEGRAPHED, never a secret. */
  renderMap(_nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    const f = this.front;
    if (!f || f.dead) return { under, over };
    for (const [zid, z] of this.frozen) {
      const n = this.nodesById[zid];
      if (!n) continue;
      const s = clamp(z.intensity, 0, 1);
      const col = mixHex(this.glowColors.weak, this.glowColors.strong, s);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      // The frosted treatment: a broad pale pane + a crisp rime rim — held
      // ground reads FROZEN at a glance, denser toward the heart.
      under += `<circle cx="${cx}" cy="${cy}" r="${(17 + 5 * s).toFixed(1)}" fill="${col}" fill-opacity="${(0.10 + 0.10 * s).toFixed(3)}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="${(11 + 3 * s).toFixed(1)}" fill="${col}" fill-opacity="${(0.08 + 0.08 * s).toFixed(3)}"/>`
        + `<circle cx="${cx}" cy="${cy}" r="12.5" fill="none" stroke="${col}" stroke-width="1.1" stroke-opacity="${(0.35 + 0.3 * s).toFixed(2)}" stroke-dasharray="2.6 2.2"/>`;
      // THE RIME EDGE — one animated double-tick across each road out of
      // held ground into free (charted, surface) ground. The shimmer is the
      // march; during the thaw the same edge dims (the border in retreat).
      for (const e of n.exits) {
        if (e.to === '?' || this.frozen.has(e.to)) continue;
        const nb = this.nodesById[e.to];
        if (!nb || nb.caveDepth != null) continue;
        const dx = nb.map.x - n.map.x, dy = nb.map.y - n.map.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len, uy = dy / len;
        const px = -uy, py = ux;
        const mx = n.map.x + dx * 0.5, my = n.map.y + dy * 0.5;
        const op = f.thawing ? 0.45 : 0.85;
        const dur = f.thawing ? '1.6s' : '2.4s';
        const tick = (ox: number, oy: number, half: number, w: number): string =>
          `<line x1="${(mx + ox + px * half).toFixed(1)}" y1="${(my + oy + py * half).toFixed(1)}" `
          + `x2="${(mx + ox - px * half).toFixed(1)}" y2="${(my + oy - py * half).toFixed(1)}" `
          + `stroke="${this.glowColors.edge}" stroke-width="${w}" stroke-linecap="round" stroke-opacity="${op}">`
          + `<animate attributeName="stroke-opacity" values="${op};${(op * 0.35).toFixed(2)};${op}" dur="${dur}" repeatCount="indefinite"/>`
          + `</line>`;
        over += tick(0, 0, 9, 2.2);
        over += tick(ux * 4.5, uy * 4.5, 5.5, 1.3); // the comb: a second, thinner ridge toward free ground
      }
      // The glacial heart: the winter's crown-glyph + a slow pulse.
      if (z.hops === 0) {
        over += `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${this.glowColors.accent}" stroke-width="1.6" stroke-opacity="0.8">`
          + `<animate attributeName="r" values="13;17;13" dur="3.2s" repeatCount="indefinite"/>`
          + `<animate attributeName="stroke-opacity" values="0.8;0.25;0.8" dur="3.2s" repeatCount="indefinite"/>`
          + `</circle>`
          + `<text x="${cx}" y="${(n.map.y - 15).toFixed(1)}" text-anchor="middle" font-size="13" fill="${this.glowColors.accent}">❄</text>`;
      }
    }
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
    if (!z) return null;
    const f = this.front;
    if (!f || f.dead || z.runId !== f.id) return null;
    return {
      intensity: z.intensity,
      isHeart: z.hops === 0 && !f.thawing, // a slain King never re-crowns
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

  /** ONE-SHOT: the heart zone whose def still needs its frozen_lake landmark
   *  grafted (the glacial heart is a REAL place — the engine appends the
   *  landmark roll to the persisted def; the next visit builds the lake). */
  consumeHeartMark(): string | null {
    const f = this.front;
    if (!f || f.dead || f.heartMarked) return null;
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
    const z = this.frozen.get(zoneId);
    const f = this.front;
    if (!z || !f || f.dead || z.runId !== f.id) return false;
    if (f.seen) return false;
    f.seen = true;
    return true;
  }

  /** The Winter King fell at the heart — the march stops and the thaw begins
   *  (outermost ring first: the front walks home). Returns true if this
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
  peek(): ReadonlyArray<{ zoneId: string; x: number; y: number; intensity: number; hops: number; thawing: boolean }> {
    const f = this.front;
    if (!f || f.dead) return [];
    const out: { zoneId: string; x: number; y: number; intensity: number; hops: number; thawing: boolean }[] = [];
    for (const [zid, z] of this.frozen) {
      const n = this.nodesById[zid];
      if (!n) continue;
      out.push({ zoneId: zid, x: n.map.x, y: n.map.y, intensity: z.intensity, hops: z.hops, thawing: f.thawing });
    }
    return out;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the front + the conversion map + the id counter. Rides
   *  existing edges only — no zones minted, nothing engine-side to save. */
  snapshot(): unknown {
    return {
      front: this.front ? { ...this.front } : null,
      frozen: [...this.frozen.entries()].map(([zid, z]) => ({ zid, ...z })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { front?: unknown; frozen?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    const f = s.front as Partial<FrostFront> | null;
    this.front = null;
    if (f && typeof f === 'object' && !f.dead
      && typeof f.id === 'string' && typeof f.heartZoneId === 'string'
      && [f.spreadAcc, f.thawAcc].every(n => typeof n === 'number' && Number.isFinite(n))) {
      this.front = {
        id: f.id, heartZoneId: f.heartZoneId,
        spreadAcc: f.spreadAcc!, seen: !!f.seen, heartMarked: !!f.heartMarked,
        thawing: !!f.thawing, thawAcc: f.thawAcc!, dead: false,
      };
    }
    this.frozen.clear();
    if (this.front && Array.isArray(s.frozen)) {
      for (const raw of s.frozen) {
        const z = raw as { zid?: unknown; runId?: unknown; hops?: unknown } | null;
        if (!z || typeof z.zid !== 'string' || z.runId !== this.front.id) continue;
        if (typeof z.hops !== 'number' || !Number.isFinite(z.hops) || z.hops < 0) continue;
        // Intensity re-derives from hops against the LIVE config (a re-tuned
        // falloff applies to a resumed winter — config wins over cache).
        this.convert(z.zid, this.front.id, Math.floor(z.hops));
      }
      if (!this.frozen.size) this.front = null; // a winter with no ground recycles
    }
  }

  /** Culled ground sheds its frost; a front whose HEART was culled can never
   *  field its King again, so it turns to thaw and retreats out — the
   *  graceful end, never an immortal winter. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of [...this.frozen.keys()]) if (!has(zid)) this.frozen.delete(zid);
    const f = this.front;
    if (!f || f.dead) return;
    if (!this.frozen.size) { f.dead = true; return; }
    if (!has(f.heartZoneId) && !f.thawing) { f.thawing = true; f.thawAcc = 0; }
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: ignite a winter whose HEART is the given (current) zone, pre-marched
   *  to a small ball so the front + the rime edge read immediately. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.front) return false; // one winter at a time (matches production)
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here) || this.frozen.has(here.id)) return false;
    this.front = this.makeFront(here);
    this.convert(here.id, this.front.id, 0);
    for (let i = 0; i < Math.max(1, this.cfg.initialHops); i++) this.march(this.front, view);
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May the winter TAKE a zone? THE shared predicate (zonePolicy) — safe
   *  zones, caves, event-owned and special ground all refuse, so the frost
   *  parts around town like a river around a stone. */
  private streamable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  /** A node's baked temperature, or null where climate was never baked (old
   *  nodes) — the tolerance doctrine: unbaked ground can be MARCHED onto
   *  (neutral 0.5 ordering) but never ignites a winter (can't prove cold). */
  private tempOf(z: ZoneDef): number | null {
    const t = z.geo?.climate?.['temperature'];
    return typeof t === 'number' && Number.isFinite(t) ? t : null;
  }

  private intensityFor(hops: number): number {
    const t = this.cfg.maxHops > 0 ? hops / this.cfg.maxHops : 1;
    return clamp(1 - t, this.cfg.minIntensity, 1);
  }

  private convert(zoneId: string, runId: string, hops: number): void {
    this.frozen.set(zoneId, { runId, hops, intensity: this.intensityFor(hops) });
  }

  private makeFront(heart: ZoneDef): FrostFront {
    return {
      id: `deepwinter_${this.seq++}`,
      heartZoneId: heart.id,
      spreadAcc: 0, seen: false, heartMarked: false,
      thawing: false, thawAcc: 0, dead: false,
    };
  }

  /** Ignite at the COLDEST eligible charted node — deterministic, not a
   *  weighted draw: the winter is born where the world map is coldest (the
   *  climate geography IS the gameplay), far enough from town to be a
   *  campaign rather than an ambush. Pre-marches the initial ball. */
  private maybeIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.igniteChance * this.gate().ignitionMul, 0, 1))) return;
    const town = view.byId[START_ZONE];
    const tc = town ? town.map : { x: 0, y: 0 };
    let heart: ZoneDef | null = null;
    let heartTemp = Infinity;
    for (const z of view.nodes) {
      if (!this.streamable(z) || this.frozen.has(z.id)) continue;
      if (coordDist(z.map, tc) < this.cfg.seedMinDist) continue;
      const t = this.tempOf(z);
      if (t === null || t > this.cfg.igniteMaxTemp) continue;
      // Strictly coldest wins; id breaks exact ties so the pick is stable.
      if (t < heartTemp || (t === heartTemp && heart !== null && z.id < heart.id)) { heartTemp = t; heart = z; }
    }
    if (!heart) return; // no genuinely cold charted ground → no winter (yet)
    const f = this.makeFront(heart);
    this.front = f;
    this.convert(heart.id, f.id, 0);
    for (let i = 0; i < this.cfg.initialHops; i++) this.march(f, view);
    this.news.push(`A deep winter stirs — the frost is marching from ${heart.name}.`);
  }

  /** The march: take ONE more zone — the COLDEST eligible frontier neighbour
   *  (ties → nearest the heart, then stable id order). The front eats the
   *  cold end of the map first, then pushes into warmer country: watching
   *  the map tells you where it will go next. */
  private march(f: FrostFront, view: OverlayView): void {
    const parentHop = new Map<string, number>();
    for (const [zid, z] of this.frozen) {
      if (z.runId !== f.id) continue;
      const zn = view.byId[zid];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.frozen.has(nb.id) || !this.streamable(nb)) continue;
        parentHop.set(nb.id, Math.min(parentHop.get(nb.id) ?? Infinity, z.hops));
      }
    }
    let pick: string | null = null;
    let pickTemp = Infinity;
    let pickHop = Infinity;
    for (const [zid, ph] of parentHop) {
      if (ph + 1 > this.cfg.maxHops) continue;
      const nb = view.byId[zid];
      if (!nb) continue;
      const t = this.tempOf(nb) ?? 0.5; // unbaked ground marches at neutral order
      if (t < pickTemp
        || (t === pickTemp && ph < pickHop)
        || (t === pickTemp && ph === pickHop && (pick === null || zid < pick))) {
        pick = zid; pickTemp = t; pickHop = ph;
      }
    }
    if (!pick) return; // the front has met its cap (or the map) — it holds
    this.convert(pick, f.id, (parentHop.get(pick) ?? 0) + 1);
  }

  /** The thaw retreats ONE outermost ring (highest hops melts first) — the
   *  beaten front walks home to its heart and dies there. */
  private thawRing(f: FrostFront): void {
    let maxHop = -1;
    for (const z of this.frozen.values()) if (z.runId === f.id && z.hops > maxHop) maxHop = z.hops;
    if (maxHop < 0) { f.dead = true; return; }
    for (const [zid, z] of [...this.frozen]) {
      if (z.runId === f.id && z.hops >= maxHop) this.frozen.delete(zid);
    }
    if (![...this.frozen.values()].some(z => z.runId === f.id)) f.dead = true;
  }
}

// --- map marker + zone-info (registered on import — zero panel edits) --------

registerMarkerSource((world: World): MapMarker[] => {
  const df = world.sim.deepwinterField;
  if (!df) return [];
  const out: MapMarker[] = [];
  for (const s of df.peek()) {
    if (s.hops !== 0) continue;
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
