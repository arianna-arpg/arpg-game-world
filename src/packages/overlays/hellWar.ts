// ---------------------------------------------------------------------------
// THE WAR BELOW — the Underworld's eternal territorial struggle, as a field.
//
// A run seats a handful of LORDS from the pool (packages/lords.ts, seeded,
// manifest-locked) and drapes a DISPOSITION LATTICE over hell's map space:
// every cell holds an owner and a power, citadels feed power in, and fronts
// exchange it — attack strength is MOVED forward (never minted), so a hard
// push thins its own rear, opportunist neighbours flood the vacuum, and the
// displaced power shoves somewhere else in turn. Nobody can win: the war is
// a REVOLVING DOOR, and equilibrium is a moving front, not a still one.
// Per-pair war-tides (seeded sinusoids) keep the map breathing even when the
// tempers balance.
//
// TWO PHASES: from run start the war is ABSTRACT (seats rolled, tempers live,
// surface-incursion attribution works — the war exists before you ever see
// it); the moment the Hellgate mints, the lattice anchors around it, citadels
// take their compass seats, and the struggle becomes GROUND — painted live on
// the underworld map tab, read per-zone by spawning, bulletins, and the HUD.
//
// The player is an INTERLOPER, never a belligerent: killing a front-marshal
// collapses a local push (the vacuum fills — with someone else); killing a
// LORD collapses a realm (its ground is re-divided by its rivals, and after a
// while a NEW lord from the unrolled pool claims the empty throne — the war
// does not end because a chair does). Repelling a lord's surface incursion
// bleeds its fronts below; letting one fester feeds them. Surface choices
// move the hell map.
//
// Determinism: one Rng seeded from the package ctx (dimension-salted); the
// clock is the overlay's own accumulated sim time. Snapshot/restore is pure
// JSON (the durable pledge); prune re-queues culled citadel mints.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import { setRunStances, type FactionStance } from '../../data/monsters';
import { allLords, lordDef, type UnderworldLordDef } from '../lords';
import { registerBulletinSource } from '../../world/bulletins';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import type { MapLayer, OverlayView, SpawnBias, WorldOverlay } from '../../world/overlay';
import { NO_BIAS } from '../../world/overlay';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** Every dial of the war in one place. Rates are per second of overlay time;
 *  distances are MAP UNITS (the node pitch is 78; one lattice cell is half a
 *  step). Tune the war here, never in the tick. */
export const WAR_CFG = {
  /** Sim cadence (seconds of overlay time per tick). */
  step: 0.5,
  /** Lattice pitch in map units (half the 78-unit node pitch). */
  cell: 39,
  /** Seats rolled per run from the lord pool. */
  seats: 4,
  /** Citadel anchor distance from the Hellgate (min/max, seeded). */
  citadelRing: [235, 305] as [number, number],
  /** The Hellgate's shunned ground — no lord claims within (the one neutral
   *  circle in hell; the landing is a door, not a warfront). */
  neutralRadius: 70,
  /** Within this of its citadel a lord's ground is HEARTLAND: the zone's
   *  population is fully the lord's host (baseTable override). */
  heartland: 118,
  /** How far past citadels/charted hell the war mask extends (the lattice
   *  only fights over covered ground; coverage GROWS as hell charts). */
  cover: 190,
  power: {
    /** Fresh citadel-ring seed power. */
    init: 88,
    cap: 100,
    /** Citadel feed (the war's only mint) — everything else is moved. */
    seatRegen: 3.2,
    /** Owned ground slowly settles toward this garrison level. */
    homeostasis: { target: 32, rate: 0.5 },
    /** Same-owner high→low equalization (the rear feeds the front). */
    diffuse: 0.16,
  },
  front: {
    /** Base attack flow at a hostile border, before temper/tide/opportunism. */
    basePush: 5.2,
    /** Fraction of dealt damage the ATTACKER also pays (strength moves
     *  forward — the thinning rear, the revolving door's hinge). */
    drainFwd: 0.55,
    /** Defense scale from the defender's hold temper: 0.7 + 0.6×hold. */
    holdBase: 0.7, holdSpan: 0.6,
    /** A cell flips when its power is beaten below this... */
    flipAt: 6,
    /** ...and lands under the new banner at this fraction of the blow. */
    spillFrac: 0.5,
    /** Opportunism reads weakness below this power as an opening. */
    opportunismAt: 52,
    /** Unclaimed in-mask ground is walked into at this flat rate. */
    expand: 9,
  },
  /** Per-seat-pair war-tides: seeded period per pair, amplitude per lord
   *  (temper.tideAmp overrides). The breath of the map. */
  tide: { periodMin: 160, periodMax: 340, amp: 0.55 },
  /** Rift-lord behind-the-lines enclaves (temper.deepStrike scales chance). */
  deepStrike: { every: 80, chance: 0.5, power: 55, minDepth: 3 },
  /** At most one truce is rolled per run; it always shatters eventually. */
  truce: { chance: 0.35, breakAfter: [340, 720] as [number, number] },
  /** A slain lord's throne refills from the unrolled pool after this long. */
  succession: { delay: 260 },
  /** A slain front-marshal collapses the local push. */
  marshal: { dampRadius: 96, dampMul: 0.32 },
  /** A slain LORD collapses the realm (power haircut everywhere it holds). */
  lordFall: { powerMul: 0.16 },
  strike: {
    /** Citadel regen multiplier while this lord's host is striking away. */
    awayRegenMul: 0.55,
    /** Repelled: the committed host is LOST — a global power haircut. */
    repelledMul: 0.85,
    /** Festered to burnout: spoils flow home — citadel surge for a while. */
    spoilsRegenMul: 1.7, spoilsFor: 95, spoilsPower: 26,
  },
  /** Zone contest thresholds (ownerOf/contest reads). */
  contest: { near: 1.6, hot: 0.55 },
  /** Map: at most this many thrust arrows; render lattice coarsens to this
   *  many cells per axis (the world-anchored step ladder — cells never move). */
  map: { arrows: 4, maxCellsPerAxis: 42, washAlpha: 0.14, washPowerAlpha: 0.1 },
  bulletins: { max: 8 },
};

interface Seat {
  /** Seat index is the lattice's owner value — stable across succession
   *  (the BANNER changes, the ground remembers its column). */
  lord: string;
  citadel: MapCoord | null;
  /** Minted citadel zone id (null until the drain places it). */
  zoneId: string | null;
  /** True while the throne sits empty (lord slain, successor pending). */
  fallen: boolean;
  successionAt: number | null;
  /** Live surface/hell strikes out under this banner. */
  strikesOut: number;
  /** Spoils surge until this overlay-time (successful strike). */
  spoilsUntil: number;
}

interface Grid {
  ox: number; oy: number;      // world-anchored origin (cell multiples)
  w: number; h: number;        // in cells
  owner: Int16Array;           // seat index, -1 = unclaimed
  power: Float32Array;
  mask: Uint8Array;            // 1 = the war covers this cell
}

export interface HellWarMint {
  lordId: string;
  coord: MapCoord;
  zoneKey: string;
  tileset: string;
  layout?: string;
  name: string;
}

export interface ZoneWarState {
  lord: UnderworldLordDef;
  seat: number;
  power: number;
  heartland: boolean;
  citadel: boolean;
  /** Present when a rival presses this ground. */
  contested: { by: UnderworldLordDef; level: number } | null;
}

export class HellWarField implements WorldOverlay {
  readonly id = 'underworld_war';
  readonly persistence = 'durable';
  readonly mapLabel = 'The War Below';
  /** Stamped by the sim for non-surface instances (declared, never self-set). */
  readonly dimension?: string;

  private rng: Rng;
  private gate: () => PackageGate;
  private time = 0;
  private acc = 0;

  private seats: Seat[] = [];
  /** Rolled truce (at most one): seat-index pair + when it shatters. */
  private truce: { a: number; b: number; breakAt: number } | null = null;
  private grid: Grid | null = null;
  /** Origin the lattice anchored on (the Hellgate's coord at init). */
  private anchor: MapCoord | null = null;
  /** Last announced owner per CHARTED zone — the conquest-bulletin edge. */
  private lastZoneOwner = new Map<string, number>();
  private deepStrikeAt = 0;

  readonly mintRequests: HellWarMint[] = [];
  /** Conquest/succession/strike bulletins, drained by the engine (announced
   *  only in the underworld — the surface hears the war through its strikes). */
  readonly bulletins: { text: string; color: string }[] = [];

  /** Per-tick front-flow accumulators for the map's thrust arrows. */
  private flows = new Map<number, { flow: number; x: number; y: number; dx: number; dy: number }>();

  constructor(ctx: OverlayBuildCtx) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.rollSeats();
  }

  // --- the roll -------------------------------------------------------------

  /** Seat the run's lords + roll the (rare) truce. Fixed draw count for a
   *  fixed pool — two sims on one seed seat the same war. */
  private rollSeats(): void {
    const pool = allLords();
    const picks: UnderworldLordDef[] = [];
    const bag = [...pool];
    const n = Math.min(WAR_CFG.seats, bag.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(this.rng.next() * bag.length);
      picks.push(bag.splice(idx, 1)[0]);
    }
    this.seats = picks.map(l => ({
      lord: l.id, citadel: null, zoneId: null, fallen: false,
      successionAt: null, strikesOut: 0, spoilsUntil: 0,
    }));
    // One pact at most — and pacts below always shatter.
    this.truce = null;
    if (this.seats.length >= 2 && this.rng.chance(WAR_CFG.truce.chance)) {
      const a = this.rng.int(0, this.seats.length - 1);
      let b = this.rng.int(0, this.seats.length - 2);
      if (b >= a) b++;
      this.truce = { a, b, breakAt: this.rng.range(WAR_CFG.truce.breakAfter[0], WAR_CFG.truce.breakAfter[1]) };
    }
    this.applyStances();
  }

  /** Publish the run's lord diplomacy into the stance layer: seated hosts are
   *  pairwise HOSTILE (the eternal struggle), except the standing truce. */
  private applyStances(): void {
    const pairs: Record<string, FactionStance> = {};
    for (let i = 0; i < this.seats.length; i++) {
      for (let j = i + 1; j < this.seats.length; j++) {
        const a = lordDef(this.seats[i].lord), b = lordDef(this.seats[j].lord);
        if (!a || !b) continue;
        const truced = this.truce && !this.seats[i].fallen && !this.seats[j].fallen &&
          ((this.truce.a === i && this.truce.b === j) || (this.truce.a === j && this.truce.b === i));
        pairs[`${a.faction}|${b.faction}`] = truced ? 'ally' : 'hostile';
      }
    }
    setRunStances('underworld_war', pairs);
  }

  // --- overlay surface --------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.captureView(view);
    if (!this.gate().active) return;
    this.time += dt;
    this.acc += dt;
    if (this.acc < WAR_CFG.step) return;
    const step = this.acc;
    this.acc = 0;

    if (!this.grid) this.tryAnchor(view);
    if (!this.grid) return;

    this.growCover(view);
    this.tickTruce();
    this.tickSuccession();
    this.tickLattice(step);
    this.tickZoneBulletins(view);
  }

  onNodeCharted(): void { /* coverage growth reads the view each tick */ }

  /** Spawn shaping for hell zones: the owner's host patrols its ground (a
   *  coherent injected contingent), and contested ground injects the rival
   *  too — the brawl stages itself through the ordinary contest fabric. */
  affectSpawns(zone: { id: string }): SpawnBias {
    const st = this.zoneWar(zone.id);
    if (!st) return NO_BIAS;
    const bias: SpawnBias = { countMul: 1, factionMul: { [st.lord.faction]: 1.35 }, injectFactions: [st.lord.faction] };
    if (st.contested && st.contested.level > 0.25) bias.injectFactions.push(st.contested.by.faction);
    return bias;
  }

  activityAt(zoneId: string): number {
    const st = this.zoneWar(zoneId);
    return st?.contested ? 1.5 : 0;
  }

  // --- anchoring + coverage ---------------------------------------------------

  /** The lattice anchors the first time hell EXISTS (any underworld node in
   *  view — the Hellgate is the first). Citadels take seeded compass seats
   *  on a ring around the gate; ground seeds by nearest-citadel falloff. */
  private tryAnchor(view: OverlayView): void {
    const first = view.nodes[0];
    if (!first) return;
    const gate = view.byId[view.currentZoneId] ?? first;
    this.anchor = { x: gate.map.x, y: gate.map.y };
    const baseAng = this.rng.range(0, Math.PI * 2);
    for (let i = 0; i < this.seats.length; i++) {
      const ang = baseAng + (i / this.seats.length) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
      const r = this.rng.range(WAR_CFG.citadelRing[0], WAR_CFG.citadelRing[1]);
      this.seats[i].citadel = {
        x: this.anchor.x + Math.cos(ang) * r,
        y: this.anchor.y + Math.sin(ang) * r,
      };
    }
    this.rebuildGrid();
    this.queueCitadelMints();
    const named = this.seats.map(s => lordDef(s.lord)?.short).filter(Boolean).join(', ');
    this.pushBulletin(`The war below has ${this.seats.length} thrones: ${named}.`, '#d8b8a8');
    if (this.truce) {
      const a = lordDef(this.seats[this.truce.a].lord), b = lordDef(this.seats[this.truce.b].lord);
      if (a && b) this.pushBulletin(`${a.short} and ${b.short} hold an uneasy pact — for now.`, '#b8b0c8');
    }
  }

  /** World-anchored lattice covering citadels + charted hell + margin. Growth
   *  only ADDS cells (origins floored to cell multiples — cells never move). */
  private rebuildGrid(): void {
    const c = WAR_CFG.cell;
    const pts: MapCoord[] = [];
    if (this.anchor) pts.push(this.anchor);
    for (const s of this.seats) if (s.citadel) pts.push(s.citadel);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const pad = WAR_CFG.cover;
    const ox = Math.floor((minX - pad) / c) * c;
    const oy = Math.floor((minY - pad) / c) * c;
    const w = Math.ceil((maxX + pad - ox) / c);
    const h = Math.ceil((maxY + pad - oy) / c);
    const grid: Grid = {
      ox, oy, w, h,
      owner: new Int16Array(w * h).fill(-1),
      power: new Float32Array(w * h),
      mask: new Uint8Array(w * h),
    };
    this.grid = grid;
    this.remask();
    this.seedPower();
  }

  /** Extend the lattice so new charted hell ground joins the war. Copies the
   *  old cells at their exact world positions; only NEW cells appear. */
  private growCover(view: OverlayView): void {
    const g = this.grid;
    if (!g) return;
    const c = WAR_CFG.cell;
    let minX = g.ox, minY = g.oy, maxX = g.ox + g.w * c, maxY = g.oy + g.h * c;
    let dirty = false;
    for (const z of view.nodes) {
      const pad = WAR_CFG.cover;
      if (z.map.x - pad < minX) { minX = z.map.x - pad; dirty = true; }
      if (z.map.x + pad > maxX) { maxX = z.map.x + pad; dirty = true; }
      if (z.map.y - pad < minY) { minY = z.map.y - pad; dirty = true; }
      if (z.map.y + pad > maxY) { maxY = z.map.y + pad; dirty = true; }
    }
    // Remask cheaply when only the charted set changed (new nodes inside the
    // current frame still need their cover painted).
    if (!dirty) {
      if (view.nodes.length !== this.maskedNodes) this.remask(view);
      return;
    }
    const ox = Math.floor(minX / c) * c, oy = Math.floor(minY / c) * c;
    const w = Math.ceil((maxX - ox) / c), h = Math.ceil((maxY - oy) / c);
    const next: Grid = {
      ox, oy, w, h,
      owner: new Int16Array(w * h).fill(-1),
      power: new Float32Array(w * h),
      mask: new Uint8Array(w * h),
    };
    const sx = Math.round((g.ox - ox) / c), sy = Math.round((g.oy - oy) / c);
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const from = y * g.w + x, to = (y + sy) * w + (x + sx);
        next.owner[to] = g.owner[from];
        next.power[to] = g.power[from];
      }
    }
    this.grid = next;
    this.remask(view);
  }

  private maskedNodes = -1;

  /** The war covers ground near a citadel, the gate, or charted hell — and
   *  shuns the Hellgate's neutral circle. */
  private remask(view?: OverlayView): void {
    const g = this.grid;
    if (!g) return;
    const c = WAR_CFG.cell, cover2 = WAR_CFG.cover ** 2, neutral2 = WAR_CFG.neutralRadius ** 2;
    const pts: MapCoord[] = [];
    for (const s of this.seats) if (s.citadel) pts.push(s.citadel);
    if (this.anchor) pts.push(this.anchor);
    for (const z of view?.nodes ?? []) pts.push(z.map);
    this.maskedNodes = view?.nodes.length ?? this.maskedNodes;
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (g.mask[i]) continue;
        const px = g.ox + (x + 0.5) * c, py = g.oy + (y + 0.5) * c;
        if (this.anchor && (px - this.anchor.x) ** 2 + (py - this.anchor.y) ** 2 < neutral2) continue;
        for (const p of pts) {
          if ((px - p.x) ** 2 + (py - p.y) ** 2 <= cover2) { g.mask[i] = 1; break; }
        }
      }
    }
  }

  /** First ground: each cell leans to its nearest citadel, strong at the
   *  seat and thinning toward the midlines — a war already old when found. */
  private seedPower(): void {
    const g = this.grid;
    if (!g) return;
    const c = WAR_CFG.cell;
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (!g.mask[i]) continue;
        const px = g.ox + (x + 0.5) * c, py = g.oy + (y + 0.5) * c;
        let best = -1, bd = Infinity;
        for (let s = 0; s < this.seats.length; s++) {
          const ct = this.seats[s].citadel;
          if (!ct) continue;
          const d = (px - ct.x) ** 2 + (py - ct.y) ** 2;
          if (d < bd) { bd = d; best = s; }
        }
        if (best < 0) continue;
        g.owner[i] = best;
        const d = Math.sqrt(bd);
        g.power[i] = Math.max(14, WAR_CFG.power.init - d * 0.22);
      }
    }
  }

  private queueCitadelMints(): void {
    for (const s of this.seats) {
      const l = lordDef(s.lord);
      if (!l || !s.citadel || s.zoneId) continue;
      const key = `hellseat_${l.id}`;
      if (this.mintRequests.some(m => m.zoneKey === key)) continue;
      this.mintRequests.push({
        lordId: l.id, coord: { x: s.citadel.x, y: s.citadel.y }, zoneKey: key,
        tileset: l.citadel.tileset, layout: l.citadel.layout, name: l.citadel.name,
      });
    }
  }

  // --- the tick ---------------------------------------------------------------

  private tickTruce(): void {
    if (!this.truce || this.time < this.truce.breakAt) return;
    const a = lordDef(this.seats[this.truce.a]?.lord), b = lordDef(this.seats[this.truce.b]?.lord);
    this.truce = null;
    this.applyStances();
    if (a && b) this.pushBulletin(`The pact shatters — ${a.short} turns on ${b.short}!`, '#e8604a');
  }

  private tickSuccession(): void {
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      if (!s.fallen || s.successionAt === null || this.time < s.successionAt) continue;
      const seated = new Set(this.seats.map(x => x.lord));
      const pool = allLords().filter(l => !seated.has(l.id));
      const heir = pool.length ? pool[Math.floor(this.rng.next() * pool.length)] : lordDef(s.lord);
      if (!heir) { s.successionAt = null; continue; }
      s.lord = heir.id;
      s.fallen = false;
      s.successionAt = null;
      s.strikesOut = 0;
      s.spoilsUntil = 0;
      s.zoneId = null;               // the new claimant raises a NEW seat
      this.applyStances();
      this.queueCitadelMints();
      // The empty column relights under the new banner, weak — the rivals
      // already ate the edges; the heir starts from the citadel out.
      const g = this.grid;
      if (g && s.citadel) {
        const c = WAR_CFG.cell;
        for (let y = 0; y < g.h; y++) {
          for (let x = 0; x < g.w; x++) {
            const i2 = y * g.w + x;
            if (g.owner[i2] !== i) continue;
            const px = g.ox + (x + 0.5) * c, py = g.oy + (y + 0.5) * c;
            const d = Math.hypot(px - s.citadel.x, py - s.citadel.y);
            g.power[i2] = Math.max(g.power[i2], Math.max(16, 70 - d * 0.3));
          }
        }
      }
      this.pushBulletin(`A new power rises below — ${heir.name} claims the empty throne.`, heir.color);
    }
  }

  /** One lattice step: citadel feed, homeostasis, same-owner diffusion, then
   *  front exchange under temper × tide × opportunism. Deltas buffer so the
   *  sweep order never favours a side. */
  private tickLattice(dt: number): void {
    const g = this.grid;
    if (!g) return;
    const c = WAR_CFG.cell, P = WAR_CFG.power;
    const n = g.w * g.h;
    const delta = this.scratch(n);
    this.flows.clear();

    // Citadel feed + spoils/away scaling + owned-ground homeostasis.
    for (let s = 0; s < this.seats.length; s++) {
      const seat = this.seats[s];
      if (!seat.citadel || seat.fallen) continue;
      let regen = P.seatRegen;
      if (seat.strikesOut > 0) regen *= WAR_CFG.strike.awayRegenMul;
      if (this.time < seat.spoilsUntil) regen *= WAR_CFG.strike.spoilsRegenMul;
      const cx = Math.floor((seat.citadel.x - g.ox) / c), cy = Math.floor((seat.citadel.y - g.oy) / c);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
          const i = y * g.w + x;
          if (!g.mask[i]) continue;
          if (g.owner[i] === -1) g.owner[i] = s;
          if (g.owner[i] === s) delta[i] += regen * dt;
        }
      }
    }

    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (!g.mask[i]) continue;
        const o = g.owner[i];
        if (o < 0) continue;
        const pow = g.power[i];
        // Settling garrison.
        delta[i] += (P.homeostasis.target - pow) * P.homeostasis.rate * dt * 0.1;
        // Right/down neighbours once each (each pair visited once).
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]] as const) {
          if (nx >= g.w || ny >= g.h) continue;
          const j = ny * g.w + nx;
          if (!g.mask[j]) continue;
          const oj = g.owner[j];
          if (oj === o) {
            // Same banner: the rear feeds the front.
            const d = (g.power[j] - pow) * P.diffuse * dt;
            delta[i] += d; delta[j] -= d;
            continue;
          }
          // Hostile (or empty) border — both directions considered.
          this.frontExchange(g, delta, i, o, j, oj, dt);
          this.frontExchange(g, delta, j, oj, i, o, dt);
        }
      }
    }

    // Apply + clamp (flips were recorded by frontExchange as blows landed).
    for (let i = 0; i < n; i++) {
      if (!g.mask[i]) continue;
      g.power[i] = Math.min(P.cap, Math.max(0, g.power[i] + delta[i]));
    }
    for (const f of this.pendingFlips) {
      g.owner[f.i] = f.to;
      g.power[f.i] = Math.max(g.power[f.i], f.power);
    }
    this.pendingFlips.length = 0;

    // Rift-lord deep strikes: a claimed pocket behind a rival's lines.
    if (this.time >= this.deepStrikeAt) {
      this.deepStrikeAt = this.time + WAR_CFG.deepStrike.every;
      this.tryDeepStrike(g);
    }
  }

  private pendingFlips: { i: number; to: number; power: number }[] = [];
  private scratchBuf: Float32Array | null = null;
  private scratch(n: number): Float32Array {
    if (!this.scratchBuf || this.scratchBuf.length !== n) this.scratchBuf = new Float32Array(n);
    else this.scratchBuf.fill(0);
    return this.scratchBuf;
  }

  /** One directed border exchange: attacker cell i (seat a) presses defender
   *  cell j (seat b, or unclaimed). Damage moves power out of BOTH sides —
   *  the attacker pays drainFwd of every blow (strength spent forward). */
  private frontExchange(g: Grid, delta: Float32Array, i: number, a: number, j: number, b: number, dt: number): void {
    if (a < 0) return;
    const seatA = this.seats[a];
    if (!seatA || seatA.fallen) return;
    const lordA = lordDef(seatA.lord);
    if (!lordA) return;
    const F = WAR_CFG.front;
    const powA = g.power[i];
    if (powA <= F.flipAt) return;

    if (b < 0) {
      // Unclaimed cover: walk in.
      const move = Math.min(powA * 0.4, F.expand * dt);
      delta[i] -= move * 0.5;
      this.pendingFlips.push({ i: j, to: a, power: move });
      return;
    }
    if (this.isTruced(a, b)) return;
    const seatB = this.seats[b];
    const lordB = seatB && !seatB.fallen ? lordDef(seatB.lord) : undefined;

    const powB = g.power[j];
    const weakness = Math.max(0, 1 - powB / F.opportunismAt);
    const tide = this.tideMul(a, b);
    const atk = F.basePush * lordA.temper.push * tide *
      (1 + lordA.temper.opportunism * weakness) * (powA / 100) * dt;
    const hold = lordB ? F.holdBase + F.holdSpan * lordB.temper.hold : 0.8;
    const dmg = atk / hold;
    delta[j] -= dmg;
    delta[i] -= dmg * F.drainFwd;
    if (powB + delta[j] < F.flipAt) {
      this.pendingFlips.push({ i: j, to: a, power: dmg * F.spillFrac + 4 });
    }
    // Arrow bookkeeping: net flow per ordered seat pair.
    const key = a * 64 + b;
    const c = WAR_CFG.cell;
    const px = g.ox + ((i % g.w) + 0.5) * c, py = g.oy + (Math.floor(i / g.w) + 0.5) * c;
    const qx = g.ox + ((j % g.w) + 0.5) * c, qy = g.oy + (Math.floor(j / g.w) + 0.5) * c;
    let f = this.flows.get(key);
    if (!f) { f = { flow: 0, x: 0, y: 0, dx: 0, dy: 0 }; this.flows.set(key, f); }
    f.flow += dmg; f.x += px * dmg; f.y += py * dmg; f.dx += (qx - px) * dmg; f.dy += (qy - py) * dmg;
  }

  private isTruced(a: number, b: number): boolean {
    return !!this.truce &&
      ((this.truce.a === a && this.truce.b === b) || (this.truce.a === b && this.truce.b === a));
  }

  /** Seeded per-pair sinusoid — the war's breath. Deterministic in overlay
   *  time; the phase/period hash from seat indices keeps it draw-free. */
  private tideMul(a: number, b: number): number {
    const lord = lordDef(this.seats[a]?.lord ?? '');
    const amp = lord?.temper.tideAmp ?? WAR_CFG.tide.amp;
    const h = ((a * 73 + b * 151 + 29) * 2654435761) >>> 0;
    const period = WAR_CFG.tide.periodMin + (h % 1000) / 1000 * (WAR_CFG.tide.periodMax - WAR_CFG.tide.periodMin);
    const phase = ((h >>> 10) % 1000) / 1000 * period;
    return 1 + amp * Math.sin(((this.time + phase) / period) * Math.PI * 2);
  }

  private tryDeepStrike(g: Grid): void {
    for (let s = 0; s < this.seats.length; s++) {
      const seat = this.seats[s];
      const lord = seat && !seat.fallen ? lordDef(seat.lord) : undefined;
      const scale = lord?.temper.deepStrike ?? 0;
      if (!lord || scale <= 0) continue;
      if (!this.rng.chance(WAR_CFG.deepStrike.chance * scale)) continue;
      // A seeded stab: pick a random covered rival cell far from any front
      // this lord already holds — the door opens WHERE IT PLEASES.
      const tries = 14;
      for (let t = 0; t < tries; t++) {
        const i = Math.floor(this.rng.next() * g.owner.length);
        const o = g.owner[i];
        if (!g.mask[i] || o < 0 || o === s || this.isTruced(s, o)) continue;
        if (this.nearOwnGround(g, i, s, WAR_CFG.deepStrike.minDepth)) continue;
        g.owner[i] = s;
        g.power[i] = WAR_CFG.deepStrike.power;
        const victim = lordDef(this.seats[o]?.lord ?? '');
        this.pushBulletin(`${lord.short} opens a door behind ${victim?.short ?? 'the'} lines!`, lord.color);
        return;
      }
    }
  }

  private nearOwnGround(g: Grid, i: number, seat: number, depth: number): boolean {
    const x0 = i % g.w, y0 = Math.floor(i / g.w);
    for (let dy = -depth; dy <= depth; dy++) {
      for (let dx = -depth; dx <= depth; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= g.w || y >= g.h) continue;
        if (g.owner[y * g.w + x] === seat) return true;
      }
    }
    return false;
  }

  /** Charted-zone owner changes become war bulletins (the deeds strings). */
  private tickZoneBulletins(view: OverlayView): void {
    for (const z of view.nodes) {
      if (!view.visited.has(z.id)) continue;
      const st = this.zoneWar(z.id);
      const now = st ? st.seat : -1;
      const before = this.lastZoneOwner.get(z.id);
      if (before === undefined) { this.lastZoneOwner.set(z.id, now); continue; }
      if (before === now) continue;
      this.lastZoneOwner.set(z.id, now);
      const taker = now >= 0 ? lordDef(this.seats[now]?.lord ?? '') : undefined;
      const loser = before >= 0 ? lordDef(this.seats[before]?.lord ?? '') : undefined;
      if (taker) this.pushBulletin(taker.deeds.take.replace('%z', z.name), taker.color);
      else if (loser) this.pushBulletin(loser.deeds.fall.replace('%z', z.name), loser.color);
    }
  }

  private pushBulletin(text: string, color: string): void {
    this.bulletins.push({ text, color });
    if (this.bulletins.length > WAR_CFG.bulletins.max) this.bulletins.shift();
  }

  // --- reads (engine/UI) --------------------------------------------------------

  /** The seated lords, in seat order (index = lattice owner value). */
  seatedLords(): (UnderworldLordDef | undefined)[] {
    return this.seats.map(s => (s.fallen ? undefined : lordDef(s.lord)));
  }

  /** Total power share per seat (attribution + UI). */
  strengths(): number[] {
    const out = this.seats.map(() => 0);
    const g = this.grid;
    if (!g) return out.map(() => 1);
    for (let i = 0; i < g.owner.length; i++) {
      const o = g.owner[i];
      if (o >= 0) out[o] += g.power[i];
    }
    return out;
  }

  citadelOf(lordId: string): { coord: MapCoord; zoneId: string | null } | null {
    const s = this.seats.find(x => x.lord === lordId);
    return s?.citadel ? { coord: s.citadel, zoneId: s.zoneId } : null;
  }

  /** The citadel seat standing on this zone, if any (minted seats only). */
  seatOnZone(zoneId: string): UnderworldLordDef | undefined {
    const s = this.seats.find(x => x.zoneId === zoneId && !x.fallen);
    return s ? lordDef(s.lord) : undefined;
  }

  /** Bind a drained citadel mint to its zone id (the engine's drain). */
  bindSeat(lordId: string, zoneId: string): void {
    const s = this.seats.find(x => x.lord === lordId);
    if (s) s.zoneId = zoneId;
  }

  /** The war as this ZONE feels it: owner, power, heartland, contest. */
  zoneWar(zoneId: string): ZoneWarState | null {
    const g = this.grid;
    const z = this.nodeById?.(zoneId);
    if (!g || !z) return null;
    return this.warAt(z.map, zoneId);
  }

  /** View plumbing: the sim hands us dimension-scoped views each tick; keep a
   *  resolver so zone reads work between ticks (set on update). */
  private nodeById: ((id: string) => { map: MapCoord; name: string } | undefined) | null = null;
  private captureView(view: OverlayView): void {
    this.nodeById = (id) => view.byId[id];
  }

  warAt(coord: MapCoord, zoneId?: string): ZoneWarState | null {
    const g = this.grid;
    if (!g) return null;
    const c = WAR_CFG.cell;
    const x = Math.floor((coord.x - g.ox) / c), y = Math.floor((coord.y - g.oy) / c);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return null;
    const i = y * g.w + x;
    if (!g.mask[i]) return null;
    const o = g.owner[i];
    if (o < 0) return null;
    const seat = this.seats[o];
    const lord = seat && !seat.fallen ? lordDef(seat.lord) : undefined;
    if (!lord) return null;
    // Contest: the strongest hostile neighbour cell within reach.
    let rival: number = -1, rivalPow = 0;
    const reach = Math.ceil(WAR_CFG.contest.near);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) continue;
        const j = ny * g.w + nx;
        const oj = g.owner[j];
        if (!g.mask[j] || oj < 0 || oj === o || this.isTruced(o, oj)) continue;
        if (g.power[j] > rivalPow) { rivalPow = g.power[j]; rival = oj; }
      }
    }
    const by = rival >= 0 && !this.seats[rival].fallen ? lordDef(this.seats[rival].lord) : undefined;
    const level = by ? Math.min(1, rivalPow / Math.max(12, g.power[i])) : 0;
    const heart = !!seat.citadel &&
      Math.hypot(coord.x - seat.citadel.x, coord.y - seat.citadel.y) <= WAR_CFG.heartland;
    return {
      lord, seat: o, power: g.power[i],
      heartland: heart,
      citadel: zoneId !== undefined && seat.zoneId === zoneId,
      contested: by ? { by, level } : null,
    };
  }

  /** Non-null when this zone's front runs HOT enough to field the attacker's
   *  MARSHAL (the engine's zone-runtime row spawns the body; the armies
   *  themselves ride affectSpawns' injection — this is just the officer). */
  frontStage(zoneId: string): { attacker: UnderworldLordDef; defender: UnderworldLordDef } | null {
    const st = this.zoneWar(zoneId);
    if (!st?.contested || st.contested.level < WAR_CFG.contest.hot) return null;
    return { attacker: st.contested.by, defender: st.lord };
  }

  // --- the player's levers ----------------------------------------------------

  /** A front-marshal fell: the local push collapses — a vacuum the OTHER
   *  banners feel (their opportunism does the rest, unscripted). */
  onMarshalSlain(lordId: string, at: MapCoord): void {
    const g = this.grid;
    const s = this.seats.findIndex(x => x.lord === lordId);
    if (!g || s < 0) return;
    const c = WAR_CFG.cell, r2 = WAR_CFG.marshal.dampRadius ** 2;
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        const i = y * g.w + x;
        if (g.owner[i] !== s) continue;
        const px = g.ox + (x + 0.5) * c, py = g.oy + (y + 0.5) * c;
        if ((px - at.x) ** 2 + (py - at.y) ** 2 > r2) continue;
        g.power[i] *= WAR_CFG.marshal.dampMul;
      }
    }
    const lord = lordDef(lordId);
    if (lord) this.pushBulletin(`${lord.short}'s marshal falls — the push collapses!`, lord.color);
  }

  /** A LORD fell on its throne: the realm's power collapses everywhere, the
   *  rivals flood in, and — after a while — a NEW claimant from the pool
   *  takes the empty seat. The war does not end because a chair does. */
  onLordSlain(lordId: string): void {
    const g = this.grid;
    const idx = this.seats.findIndex(x => x.lord === lordId);
    if (idx < 0) return;
    const s = this.seats[idx];
    s.fallen = true;
    s.successionAt = this.time + WAR_CFG.succession.delay;
    if (g) {
      for (let i = 0; i < g.owner.length; i++) {
        if (g.owner[i] === idx) g.power[i] *= WAR_CFG.lordFall.powerMul;
      }
    }
    this.applyStances();
    const lord = lordDef(lordId);
    if (lord) this.pushBulletin(`${lord.name} IS SLAIN — the realm tears itself over the spoils!`, lord.color);
  }

  // --- incursion attribution -----------------------------------------------------

  /** A demonic incursion ignites: WHICH lord sent it, and in what shape?
   *  Wrath × strength-surplus picks the striker (a winning lord has hosts to
   *  spare — the strike is DETACHED strength, not desperation); the lord's
   *  preferred flavors pick the type. Never throws on an empty war. */
  attributeStrike(typeIds: string[]): { lordId: string; typeId: string } | null {
    const live = this.seats.map((s, i) => ({ s, i })).filter(x => !x.s.fallen);
    if (!live.length) return null;
    const str = this.strengths();
    const total = str.reduce((a, b) => a + b, 0) || 1;
    const table = live.map(({ s, i }) => {
      const lord = lordDef(s.lord);
      const surplus = this.grid ? 0.4 + (str[i] / total) * this.seats.length * 0.6 : 1;
      return { lord, weight: Math.max(0.05, (lord?.temper.wrath ?? 0.5) * surplus) };
    }).filter(e => e.lord) as { lord: UnderworldLordDef; weight: number }[];
    if (!table.length) return null;
    const pick = this.rng.weighted(table).lord;
    const prefs = pick.strikes.filter(p => typeIds.includes(p.type));
    const typeId = prefs.length ? this.rng.weighted(prefs.map(p => ({ ...p, weight: p.weight }))).type
      : (typeIds.length ? typeIds[Math.floor(this.rng.next() * typeIds.length)] : '');
    const seat = this.seats.find(x => x.lord === pick.id);
    if (seat) seat.strikesOut++;
    return { lordId: pick.id, typeId };
  }

  /** The strike came home: repelled = the committed host is LOST (the fronts
   *  below thin — rivals notice); spoils = it fed (the citadel surges). */
  strikeResolved(lordId: string, outcome: 'repelled' | 'spoils'): void {
    const idx = this.seats.findIndex(x => x.lord === lordId);
    if (idx < 0) return;
    const s = this.seats[idx];
    s.strikesOut = Math.max(0, s.strikesOut - 1);
    const lord = lordDef(lordId);
    if (outcome === 'repelled') {
      const g = this.grid;
      if (g) {
        for (let i = 0; i < g.owner.length; i++) {
          if (g.owner[i] === idx) g.power[i] *= WAR_CFG.strike.repelledMul;
        }
      }
      if (lord) this.pushBulletin(`${lord.short}'s strike is broken — the fronts below feel it.`, lord.color);
    } else {
      s.spoilsUntil = this.time + WAR_CFG.strike.spoilsFor;
      const g = this.grid;
      if (g && s.citadel) {
        const c = WAR_CFG.cell;
        const cx = Math.floor((s.citadel.x - g.ox) / c), cy = Math.floor((s.citadel.y - g.oy) / c);
        const i = cy * g.w + cx;
        if (i >= 0 && i < g.power.length && g.owner[i] === idx) {
          g.power[i] = Math.min(WAR_CFG.power.cap, g.power[i] + WAR_CFG.strike.spoilsPower);
        }
      }
      if (lord) this.pushBulletin(`${lord.short}'s strike feeds — the ${lord.epithet}'s banners swell.`, lord.color);
    }
  }

  // --- map --------------------------------------------------------------------

  /** The living warfront: an owner-tinted cell wash (world-anchored render
   *  ladder — growth never re-tiles), citadel sigils, hot-front badges over
   *  charted ground, and the top thrust arrows. The map auto-refreshes while
   *  open, so the war ANIMATES. */
  renderMap(nodes: { id: string; map: MapCoord; name: string }[]): MapLayer {
    const g = this.grid;
    if (!g) return { under: '', over: '' };
    const c = WAR_CFG.cell;
    let k = 1;
    while (Math.max(g.w, g.h) / k > WAR_CFG.map.maxCellsPerAxis) k *= 2;
    const rc = c * k;
    let under = '';
    for (let y = 0; y < g.h; y += k) {
      for (let x = 0; x < g.w; x += k) {
        // Majority owner over the render block (power-weighted).
        const tally = new Map<number, number>();
        for (let dy = 0; dy < k && y + dy < g.h; dy++) {
          for (let dx = 0; dx < k && x + dx < g.w; dx++) {
            const i = (y + dy) * g.w + (x + dx);
            if (!g.mask[i] || g.owner[i] < 0) continue;
            tally.set(g.owner[i], (tally.get(g.owner[i]) ?? 0) + g.power[i]);
          }
        }
        let best = -1, bp = 0, sum = 0;
        for (const [o, p] of tally) { sum += p; if (p > bp) { bp = p; best = o; } }
        if (best < 0) continue;
        const seat = this.seats[best];
        const lord = seat && !seat.fallen ? lordDef(seat.lord) : undefined;
        if (!lord) continue;
        const alpha = WAR_CFG.map.washAlpha + WAR_CFG.map.washPowerAlpha * Math.min(1, sum / (k * k * 60));
        under += `<rect x="${(g.ox + x * c).toFixed(0)}" y="${(g.oy + y * c).toFixed(0)}" width="${rc}" height="${rc}" fill="${lord.color}" fill-opacity="${alpha.toFixed(3)}"/>`;
      }
    }
    let over = '';
    // Citadel seats.
    for (const s of this.seats) {
      if (!s.citadel) continue;
      const lord = s.fallen ? undefined : lordDef(s.lord);
      const x = s.citadel.x.toFixed(0), y = s.citadel.y.toFixed(0);
      if (!lord) {
        over += `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" fill="#8a8496" opacity="0.9">✝</text>`;
        continue;
      }
      over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${lord.color}" stroke-width="1.6" stroke-dasharray="3 2" opacity="0.85"/>` +
        `<text x="${x}" y="${(s.citadel.y + 4.5).toFixed(0)}" text-anchor="middle" font-size="12" fill="${lord.color}" font-weight="bold">${lord.sigil}<title>${lord.name} — ${lord.creed}</title></text>`;
    }
    // Hot fronts over charted zones.
    for (const z of nodes) {
      const st = this.warAt(z.map, z.id);
      if (!st?.contested || st.contested.level < WAR_CFG.contest.hot) continue;
      over += `<text x="${z.map.x.toFixed(0)}" y="${(z.map.y - 14).toFixed(0)}" text-anchor="middle" font-size="11" fill="#e8b060" opacity="0.95">⚔<title>${st.lord.short} vs ${st.contested.by.short}</title></text>`;
    }
    // Thrust arrows: the strongest live pushes.
    const flows = [...this.flows.entries()]
      .sort((a, b) => b[1].flow - a[1].flow)
      .slice(0, WAR_CFG.map.arrows);
    for (const [key, f] of flows) {
      if (f.flow <= 0.01) continue;
      const a = Math.floor(key / 64);
      const lord = this.seats[a] && !this.seats[a].fallen ? lordDef(this.seats[a].lord) : undefined;
      if (!lord) continue;
      const x = f.x / f.flow, y = f.y / f.flow;
      const len = Math.hypot(f.dx, f.dy) || 1;
      const ux = f.dx / len, uy = f.dy / len;
      const x2 = x + ux * 26, y2 = y + uy * 26;
      over += `<path d="M ${x.toFixed(0)} ${y.toFixed(0)} L ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${lord.color}" stroke-width="2.2" opacity="0.85" marker-end="none"/>` +
        `<path d="M ${x2.toFixed(0)} ${y2.toFixed(0)} l ${(-ux * 7 - uy * 4).toFixed(1)} ${(-uy * 7 + ux * 4).toFixed(1)} l ${(uy * 8).toFixed(1)} ${(-ux * 8).toFixed(1)} Z" fill="${lord.color}" opacity="0.85"/>`;
    }
    return { under, over };
  }

  // --- persistence (the durable pledge) ----------------------------------------

  snapshot(): unknown {
    const g = this.grid;
    return {
      time: Math.round(this.time * 10) / 10,
      seats: this.seats.map(s => ({
        lord: s.lord,
        citadel: s.citadel ? { x: Math.round(s.citadel.x), y: Math.round(s.citadel.y) } : null,
        zoneId: s.zoneId, fallen: s.fallen, successionAt: s.successionAt,
        strikesOut: s.strikesOut, spoilsUntil: Math.round(s.spoilsUntil),
      })),
      truce: this.truce ? { a: this.truce.a, b: this.truce.b, breakAt: Math.round(this.truce.breakAt) } : null,
      anchor: this.anchor ? { x: Math.round(this.anchor.x), y: Math.round(this.anchor.y) } : null,
      grid: g ? {
        ox: g.ox, oy: g.oy, w: g.w, h: g.h, cell: WAR_CFG.cell,
        owner: Array.from(g.owner),
        power: Array.from(g.power, p => Math.round(p * 10) / 10),
        mask: Array.from(g.mask),
      } : null,
      lastZoneOwner: Object.fromEntries(this.lastZoneOwner),
      mints: this.mintRequests.map(m => ({ ...m, coord: { x: Math.round(m.coord.x), y: Math.round(m.coord.y) } })),
      deepStrikeAt: Math.round(this.deepStrikeAt),
      // THE ZONE-CLAIM CONVENTION: minted citadel seats persist across saves.
      ownedZones: this.seats.map(s => s.zoneId).filter((z): z is string => !!z),
    };
  }

  restore(snap: unknown): void {
    const s = snap as ReturnType<HellWarField['snapshot']> as {
      time?: number;
      seats?: { lord: string; citadel: { x: number; y: number } | null; zoneId: string | null; fallen: boolean; successionAt: number | null; strikesOut: number; spoilsUntil: number }[];
      truce?: { a: number; b: number; breakAt: number } | null;
      anchor?: { x: number; y: number } | null;
      grid?: { ox: number; oy: number; w: number; h: number; cell: number; owner: number[]; power: number[]; mask: number[] } | null;
      lastZoneOwner?: Record<string, number>;
      mints?: HellWarMint[];
      deepStrikeAt?: number;
    } | null;
    if (!s || !Array.isArray(s.seats)) return;
    this.time = typeof s.time === 'number' ? s.time : 0;
    // Registry-tolerant: a lord that left the pool since the save re-rolls
    // deterministically from what remains.
    const seated = new Set<string>();
    this.seats = s.seats.map(x => {
      let lord = lordDef(x.lord) ? x.lord : '';
      if (!lord) {
        const pool = allLords().filter(l => !seated.has(l.id));
        lord = pool.length ? pool[Math.floor(this.rng.next() * pool.length)].id : x.lord;
      }
      seated.add(lord);
      return {
        lord,
        citadel: x.citadel ? { x: x.citadel.x, y: x.citadel.y } : null,
        zoneId: typeof x.zoneId === 'string' ? x.zoneId : null,
        fallen: !!x.fallen,
        successionAt: typeof x.successionAt === 'number' ? x.successionAt : null,
        strikesOut: Math.max(0, x.strikesOut | 0),
        spoilsUntil: typeof x.spoilsUntil === 'number' ? x.spoilsUntil : 0,
      };
    });
    this.truce = s.truce && typeof s.truce.a === 'number' ? { a: s.truce.a, b: s.truce.b, breakAt: s.truce.breakAt } : null;
    this.anchor = s.anchor ? { x: s.anchor.x, y: s.anchor.y } : null;
    this.deepStrikeAt = s.deepStrikeAt ?? 0;
    this.lastZoneOwner = new Map(Object.entries(s.lastZoneOwner ?? {}));
    this.mintRequests.length = 0;
    for (const m of s.mints ?? []) this.mintRequests.push(m);
    const gs = s.grid;
    if (gs && gs.cell === WAR_CFG.cell && gs.owner?.length === gs.w * gs.h) {
      this.grid = {
        ox: gs.ox, oy: gs.oy, w: gs.w, h: gs.h,
        owner: Int16Array.from(gs.owner),
        power: Float32Array.from(gs.power),
        mask: Uint8Array.from(gs.mask),
      };
    } else if (this.anchor) {
      // Cell-size drift (a config tune between saves): rebuild fresh ground
      // from the surviving seats rather than adopt a misaligned lattice.
      this.rebuildGrid();
    }
    this.applyStances();
  }

  /** Culled citadel zone → the seat re-queues its mint (prune contract). */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const s of this.seats) {
      if (s.zoneId && !has(s.zoneId)) {
        s.zoneId = null;
        this.queueCitadelMints();
      }
    }
    for (const [zid] of this.lastZoneOwner) {
      if (!has(zid)) this.lastZoneOwner.delete(zid);
    }
  }

  /** dev/QA: a summary peek at the standing war. */
  peek(): { seats: { lord: string; fallen: boolean; strikesOut: number }[]; cells: number; truce: boolean } {
    return {
      seats: this.seats.map(s => ({ lord: s.lord, fallen: s.fallen, strikesOut: s.strikesOut })),
      cells: this.grid ? this.grid.owner.length : 0,
      truce: !!this.truce,
    };
  }
}

// --- bulletins (registered on import) -------------------------------------------
// War news is heard WHERE THE WAR IS: standing in the underworld you hear its
// conquests, pacts, successions; on the surface the queue drains silently —
// the world above learns of the war only through its strikes (and the map).
registerBulletinSource((world: World) => {
  const hw = world.sim.hellWarField;
  if (!hw || !hw.bulletins.length) return [];
  const fresh = hw.bulletins.splice(0);
  if ((world.zone.dimension ?? 'surface') !== (hw.dimension ?? 'surface')) return [];
  return fresh;
});

// --- zone-info rows (registered on import) ---------------------------------------
// The map's zone box names the ground's holder, the pressing front, and a
// standing throne — the same reads the HUD condition line carries, plus the
// creed (the box has room for doctrine; the HUD does not).
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const hw = world.sim.hellWarField;
  if (!hw || (world.zoneMap[zoneId]?.dimension ?? 'surface') !== (hw.dimension ?? 'surface')) return [];
  const st = hw.zoneWar(zoneId);
  if (!st) return [];
  const out: ZoneInfoEntry[] = [{
    kind: 'modifier',
    icon: st.citadel ? st.lord.sigil : '⚑',
    color: st.lord.color,
    label: st.citadel ? `${st.lord.name} — the throne` : `Held by ${st.lord.short}, ${st.lord.epithet}`,
    detail: st.citadel ? st.lord.creed : (st.heartland ? `heartland · ${st.lord.creed}` : st.lord.creed),
    z: st.citadel ? 18 : 8,
  }];
  if (st.contested) {
    out.push({
      kind: 'event', icon: '⚔', color: st.contested.by.color,
      label: `The front: ${st.lord.short} vs ${st.contested.by.short}`,
      detail: `${Math.round(st.contested.level * 100)}% pressure`,
      z: 14,
    });
  }
  return out;
});
