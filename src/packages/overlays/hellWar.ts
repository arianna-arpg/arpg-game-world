// ---------------------------------------------------------------------------
// THE WAR BELOW — the Underworld's eternal territorial struggle, as a field.
//
// A run seats a handful of LORDS from the pool (packages/lords.ts, seeded,
// manifest-locked) — and they are EVERLASTING for that run: ephemeral,
// eternal, everywhere and nowhere (the Chaos-God texture). The disposition of
// any point in hell is a PURE FUNCTION — per-lord drifting influence noise ×
// the lord's live POWER × a THRONE WELL around its seat-of-power anchor —
// so the warfront exists at every coordinate the moment it is asked about,
// breathes on its own clock, and extends however far the player roams. There
// is no lattice to outrun and no ground outside some lord's footprint: the
// war is not simulated NEAR the player; the player explores INTO a war that
// was always already there.
//
// Nothing about it is permanent except the war itself. The player's acts are
// DECAYING LOCAL MODIFIERS on the eternal field: a slain front-marshal
// suppresses its lord's presence in a disc that HEALS; a repelled surface
// strike bleeds the sender's power (their footprint recedes everywhere —
// rivals flood the vacuum, the revolving door); casting down a manifested
// LORD collapses their power outright — and homeostasis regathers them. No
// throne changes hands, no seat refills: the lords persist through their own
// collapse. Try as one might, the efforts are a fleeting notion in the
// eternal landscape.
//
// THRONES ARE ANCHORS, NOT ZONES: nothing mints. A throne is where its
// lord's field runs deepest; deep in that country the lord MANIFESTS in
// whatever zone the player actually explored (the engine's zone-runtime row
// asks manifestHere) — the throne comes to you.
//
// Determinism: one Rng seeded from the package ctx (dimension-salted); the
// field derives from the overlay's own accumulated clock, so two sims on one
// seed agree everywhere and a resumed save recomputes the same eternity.
// Snapshot is a handful of scalars (the durable pledge).
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

/** Every dial of the war in one place. Distances are MAP UNITS (the node
 *  pitch is 78); rates are per second of overlay time. Tune the war here,
 *  never in the tick. */
export const WAR_CFG = {
  /** Sim cadence (power homeostasis / modifiers / bulletins tick). */
  step: 0.5,
  /** Seats rolled per run from the lord pool — everlasting for the run. */
  seats: 4,
  /** Throne-anchor distance from the Hellgate (min/max, seeded). */
  throneRing: [235, 305] as [number, number],
  /** The Hellgate's shunned ground — no lord claims within (the one neutral
   *  circle in hell; the landing is a door, not a warfront). Covers the
   *  gate's own cell of the world only — its neighbouring zones sit ~70
   *  units out (a diagonal map step) and belong IN the war. */
  neutralRadius: 40,
  /** Within this of its throne a lord's ground is HEARTLAND (population
   *  flip); the inner fraction of it is the SANCTUM (the lord manifests). */
  heartland: 128,
  sanctumFrac: 0.62,
  power: {
    /** The everlasting baseline every lord regathers toward. */
    base: 100,
    /** No collapse ever zeroes a lord — ephemeral, not extinguishable. */
    floor: 8,
    /** Homeostasis rate per second (≈5 min from collapse back to strength). */
    regen: 0.32,
    /** Slow per-lord power breath (temper.tideAmp scales it) — the global
     *  shares ebb even when nobody interferes. */
    tideAmp: 0.1, tidePeriod: [240, 420] as [number, number],
  },
  field: {
    /** Influence-noise feature size (map units) — the grain of the fronts. */
    noiseScale: 230,
    /** Noise floor/amplitude: influence = power × (base + amp×noise) × well. */
    noiseBase: 0.55, noiseAmp: 0.5,
    /** Front crawl speed (map units/s of noise-domain drift), scaled by the
     *  lord's push temper — the map moves on its own, forever. */
    driftVel: 2.4,
    /** Drift headings slowly wheel (seconds per full swing) so no front
     *  marches one way forever. */
    driftTurn: [420, 700] as [number, number],
    /** The throne well: influence multiplier at the anchor, easing out over
     *  wellRange — each lord is strongest around its own seat of power. */
    wellAmp: 1.5, wellRange: 250,
    /** Opportunism: a lord's reach (noise amplitude) grows against bled
     *  rivals — the vulture dial, applied to the WEAKEST rival's deficit. */
    opportunismAmp: 0.45,
  },
  /** Zone contest reads: contested level = rival/holder influence ratio.
   *  Below `near` the ground reads FIRMLY HELD (no front row at all — the
   *  ratio is smooth, so without a floor everywhere would read contested);
   *  above `hot` the front fields the attacker's marshal. */
  contest: { near: 0.62, hot: 0.8 },
  /** DECAYING LOCAL MODIFIERS — the player's fleeting fingerprints (and the
   *  rift-lords' opened doors). A modifier multiplies ONE lord's influence
   *  inside a disc and fades back to 1 as it expires: the field HEALS. */
  modifier: {
    /** A slain front-marshal: the local push collapses... for a while. */
    marshalMul: 0.3, marshalRadius: 110, marshalFor: 160,
    /** ...and the lord pays a nick of power for the officer. */
    marshalPowerNick: 5,
    /** A rift-lord's door behind enemy lines (temper.deepStrike scales). */
    doorMul: 2.4, doorRadius: 95, doorFor: 200,
    doorEvery: 80, doorChance: 0.5, doorRange: [260, 560] as [number, number],
    /** High-hold lords shrug suppression sooner (duration ÷ this at hold 1). */
    holdShrug: 1.6,
  },
  /** A cast-down MANIFESTATION: the lord's power collapses everywhere —
   *  and regathers. No succession; the same lord returns. */
  manifest: {
    collapseMul: 0.3,
    /** Seconds before the lord holds court again. */
    cooldown: 320,
    /** The lord manifests only while its power stands above this fraction
     *  of base — a freshly-collapsed god gathers itself first. */
    minPowerFrac: 0.45,
  },
  strike: {
    /** Power regen multiplier while this lord's host is striking away. */
    awayRegenMul: 0.55,
    /** Repelled: the committed host is LOST — the footprint recedes. */
    repelledMul: 0.85,
    /** Festered to burnout: spoils flow home — a surge, for a while. */
    spoilsPower: 14, spoilsRegenMul: 1.8, spoilsFor: 95,
  },
  /** At most one truce is rolled per run; it always shatters eventually. */
  truce: { chance: 0.35, breakAfter: [340, 720] as [number, number] },
  /** Map: render-lattice cap per axis (world-anchored ladder over the viewed
   *  extent), wash opacities, thrust-arrow count. */
  map: { maxCellsPerAxis: 42, cellBase: 39, washAlpha: 0.13, washPowerAlpha: 0.11, arrows: 4 },
  bulletins: { max: 8 },
};

interface Seat {
  lord: string;
  /** The seat-of-power anchor (a FIELD WELL, never a zone). */
  throne: MapCoord | null;
  power: number;
  /** Live surface/hell strikes out under this banner. */
  strikesOut: number;
  spoilsUntil: number;
  /** The lord holds court again after this overlay-time (0 = now). */
  manifestAt: number;
  /** Seeded field identity: noise salt, drift heading, turn period, tide. */
  salt: number;
  heading: number;
  turnPeriod: number;
  tidePhase: number;
  tidePeriod: number;
}

/** A decaying local field modifier — see WAR_CFG.modifier. */
interface FieldMod {
  seat: number;
  at: MapCoord;
  radius: number;
  mul: number;
  from: number;
  until: number;
}

export interface ZoneWarState {
  lord: UnderworldLordDef;
  seat: number;
  /** The lord's influence here (relative units — UI shows contest, not this). */
  power: number;
  heartland: boolean;
  /** Deep in the owner's sanctum — where the lord holds court. */
  throne: boolean;
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
  /** The Hellgate's coord — the field's one neutral circle (set on anchor). */
  private anchor: MapCoord | null = null;
  private mods: FieldMod[] = [];
  private doorAt = 0;
  /** Last announced owner per CHARTED zone — the conquest-bulletin edge. */
  private lastZoneOwner = new Map<string, number>();

  readonly bulletins: { text: string; color: string }[] = [];

  /** View plumbing: zone reads resolve coords through the last scoped view. */
  private nodeById: ((id: string) => { map: MapCoord; name: string } | undefined) | null = null;

  constructor(ctx: OverlayBuildCtx) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.rollSeats();
  }

  // --- the roll -------------------------------------------------------------

  /** Seat the run's lords + roll their eternal field identities + the (rare)
   *  truce. Fixed draw count for a fixed pool — two sims on one seed seat the
   *  same war. The seats never change for the run: no succession, no
   *  elimination — these four ARE this world's war. */
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
      lord: l.id, throne: null,
      power: WAR_CFG.power.base,
      strikesOut: 0, spoilsUntil: 0, manifestAt: 0,
      salt: (this.rng.next() * 0xffffffff) >>> 0,
      heading: this.rng.range(0, Math.PI * 2),
      turnPeriod: this.rng.range(WAR_CFG.field.driftTurn[0], WAR_CFG.field.driftTurn[1]),
      tidePhase: this.rng.range(0, Math.PI * 2),
      tidePeriod: this.rng.range(WAR_CFG.power.tidePeriod[0], WAR_CFG.power.tidePeriod[1]),
    }));
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
        const truced = this.truce &&
          ((this.truce.a === i && this.truce.b === j) || (this.truce.a === j && this.truce.b === i));
        pairs[`${a.faction}|${b.faction}`] = truced ? 'ally' : 'hostile';
      }
    }
    setRunStances('underworld_war', pairs);
  }

  // --- overlay surface --------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodeById = (id) => view.byId[id];
    if (!this.gate().active) return;
    this.time += dt;
    this.acc += dt;
    if (this.acc < WAR_CFG.step) return;
    const step = this.acc;
    this.acc = 0;

    if (!this.anchor) this.tryAnchor(view);
    if (!this.anchor) return;

    this.tickPower(step);
    this.tickTruce();
    this.tickDoors();
    this.tickMods();
    this.tickZoneBulletins(view);
  }

  onNodeCharted(): void { /* the field exists everywhere already */ }

  /** Spawn shaping for hell zones: the owner's host patrols its ground (a
   *  coherent injected contingent), and contested ground injects the rival
   *  too — the brawl stages itself through the ordinary contest fabric. */
  affectSpawns(zone: { id: string }): SpawnBias {
    const st = this.zoneWar(zone.id);
    if (!st) return NO_BIAS;
    const bias: SpawnBias = { countMul: 1, factionMul: { [st.lord.faction]: 1.35 }, injectFactions: [st.lord.faction] };
    if (st.contested) bias.injectFactions.push(st.contested.by.faction);
    return bias;
  }

  activityAt(zoneId: string): number {
    const st = this.zoneWar(zoneId);
    return st?.contested ? 1.5 : 0;
  }

  // --- anchoring ----------------------------------------------------------------

  /** The field fixes its geometry the first time hell EXISTS (any underworld
   *  node in view — the Hellgate is the first): thrones take seeded compass
   *  seats on a ring around the gate. Until then the war is ABSTRACT — the
   *  lords, powers, and strike attribution all stand; only geometry waits. */
  private tryAnchor(view: OverlayView): void {
    const first = view.nodes[0];
    if (!first) return;
    const gate = view.byId[view.currentZoneId] ?? first;
    this.anchor = { x: gate.map.x, y: gate.map.y };
    const baseAng = this.rng.range(0, Math.PI * 2);
    for (let i = 0; i < this.seats.length; i++) {
      const ang = baseAng + (i / this.seats.length) * Math.PI * 2 + this.rng.range(-0.3, 0.3);
      const r = this.rng.range(WAR_CFG.throneRing[0], WAR_CFG.throneRing[1]);
      this.seats[i].throne = {
        x: this.anchor.x + Math.cos(ang) * r,
        y: this.anchor.y + Math.sin(ang) * r,
      };
    }
    const named = this.seats.map(s => lordDef(s.lord)?.short).filter(Boolean).join(', ');
    this.pushBulletin(`The war below has ${this.seats.length} thrones: ${named}. It has always had them.`, '#d8b8a8');
    if (this.truce) {
      const a = lordDef(this.seats[this.truce.a].lord), b = lordDef(this.seats[this.truce.b].lord);
      if (a && b) this.pushBulletin(`${a.short} and ${b.short} hold an uneasy pact — for now.`, '#b8b0c8');
    }
  }

  // --- the eternal field ----------------------------------------------------------

  /** Deterministic 2D value noise in [0,1]: hashed lattice corners, bilinear
   *  blend, two octaves. Pure in (salt, x, y) — the field's fabric. */
  private noise01(salt: number, x: number, y: number): number {
    const h = (gx: number, gy: number): number => {
      let v = (salt ^ 0x9e3779b9) >>> 0;
      v = Math.imul(v ^ (gx | 0), 0x85ebca6b) >>> 0;
      v = Math.imul(v ^ (gy | 0), 0xc2b2ae35) >>> 0;
      v ^= v >>> 13; v = Math.imul(v, 0x27d4eb2f) >>> 0; v ^= v >>> 15;
      return (v >>> 0) / 4294967296;
    };
    const sample = (px: number, py: number): number => {
      const gx = Math.floor(px), gy = Math.floor(py);
      const fx = px - gx, fy = py - gy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = h(gx, gy), b = h(gx + 1, gy), c = h(gx, gy + 1), d = h(gx + 1, gy + 1);
      return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
    };
    return 0.66 * sample(x, y) + 0.34 * sample(x * 2.13 + 51.7, y * 2.13 - 17.3);
  }

  /** Where a lord's influence noise is LOOKING right now: the drift offset —
   *  velocity scaled by push temper, along a heading that slowly wheels. The
   *  fronts crawl forever; nobody marches one way for good. */
  private driftOffset(s: Seat, t: number): { x: number; y: number } {
    const lord = lordDef(s.lord);
    const vel = WAR_CFG.field.driftVel * (0.5 + (lord?.temper.push ?? 0.5));
    const ang = s.heading + Math.sin((t / s.turnPeriod) * Math.PI * 2) * 1.2;
    return { x: Math.cos(ang) * vel * t, y: Math.sin(ang) * vel * t };
  }

  /** One lord's influence at a coordinate — the eternal layer × the live
   *  power × the fleeting local modifiers. Pure in (state, coord, time). */
  private influence(i: number, coord: MapCoord, t: number): number {
    const s = this.seats[i];
    const lord = lordDef(s.lord);
    if (!s.throne || !lord) return 0;
    const F = WAR_CFG.field;
    // Opportunism: reach grows against the most-bled rival.
    let deficit = 0;
    for (let j = 0; j < this.seats.length; j++) {
      if (j === i) continue;
      deficit = Math.max(deficit, 1 - this.seats[j].power / WAR_CFG.power.base);
    }
    const amp = F.noiseAmp * (1 + F.opportunismAmp * lord.temper.opportunism * deficit);
    const off = this.driftOffset(s, t);
    const n = this.noise01(s.salt, (coord.x + off.x) / F.noiseScale, (coord.y + off.y) / F.noiseScale);
    const dx = coord.x - s.throne.x, dy = coord.y - s.throne.y;
    const well = 1 + F.wellAmp * Math.exp(-Math.hypot(dx, dy) / F.wellRange);
    let inf = s.power * (F.noiseBase + amp * n) * well;
    // The fleeting fingerprints: suppressions heal, doors close.
    for (const m of this.mods) {
      if (m.seat !== i || t >= m.until) continue;
      const d = Math.hypot(coord.x - m.at.x, coord.y - m.at.y);
      if (d > m.radius) continue;
      const life = (m.until - t) / (m.until - m.from);   // 1 → 0 as it fades
      inf *= 1 + (m.mul - 1) * Math.min(1, life * 1.4);
    }
    return inf;
  }

  /** The war as any COORDINATE feels it — the everywhere read. Null only in
   *  the Hellgate's one neutral circle (and before hell exists). */
  warAt(coord: MapCoord): ZoneWarState | null {
    if (!this.anchor) return null;
    if (Math.hypot(coord.x - this.anchor.x, coord.y - this.anchor.y) < WAR_CFG.neutralRadius) return null;
    const t = this.time;
    let best = -1, bi = 0, second = -1, si = 0;
    for (let i = 0; i < this.seats.length; i++) {
      const inf = this.influence(i, coord, t);
      if (inf > bi) { second = best; si = bi; best = i; bi = inf; }
      else if (inf > si) { second = i; si = inf; }
    }
    if (best < 0 || bi <= 0) return null;
    const seat = this.seats[best];
    const lord = lordDef(seat.lord);
    if (!lord) return null;
    const rival = second >= 0 && !this.isTruced(best, second) ? lordDef(this.seats[second].lord) : undefined;
    const level = rival ? Math.min(1, si / Math.max(1e-6, bi)) : 0;
    const dThrone = seat.throne ? Math.hypot(coord.x - seat.throne.x, coord.y - seat.throne.y) : Infinity;
    return {
      lord, seat: best, power: bi,
      heartland: dThrone <= WAR_CFG.heartland,
      throne: dThrone <= WAR_CFG.heartland * WAR_CFG.sanctumFrac,
      // Below the `near` floor the ground reads firmly held — a front is a
      // PLACE, not a percentage that follows you everywhere.
      contested: rival && level >= WAR_CFG.contest.near ? { by: rival, level } : null,
    };
  }

  /** The war as this ZONE feels it (coord resolved through the view). */
  zoneWar(zoneId: string): ZoneWarState | null {
    const z = this.nodeById?.(zoneId);
    return z ? this.warAt(z.map) : null;
  }

  // --- the tick ---------------------------------------------------------------

  /** Power homeostasis: every lord regathers toward the everlasting baseline
   *  (slower with a host away, faster on spoils), breathing on its tide. */
  private tickPower(dt: number): void {
    const P = WAR_CFG.power;
    for (const s of this.seats) {
      let regen = P.regen;
      if (s.strikesOut > 0) regen *= WAR_CFG.strike.awayRegenMul;
      if (this.time < s.spoilsUntil) regen *= WAR_CFG.strike.spoilsRegenMul;
      const lord = lordDef(s.lord);
      const tide = 1 + (lord?.temper.tideAmp ?? 0.5) * P.tideAmp *
        Math.sin(((this.time + s.tidePhase) / s.tidePeriod) * Math.PI * 2);
      const target = P.base * tide;
      s.power += (target - s.power) * Math.min(1, regen * dt * 0.1);
      s.power = Math.max(P.floor, s.power);
    }
  }

  private tickTruce(): void {
    if (!this.truce || this.time < this.truce.breakAt) return;
    const a = lordDef(this.seats[this.truce.a]?.lord), b = lordDef(this.seats[this.truce.b]?.lord);
    this.truce = null;
    this.applyStances();
    if (a && b) this.pushBulletin(`The pact shatters — ${a.short} turns on ${b.short}!`, '#e8604a');
  }

  /** Rift-lord doors: a boost disc behind a rival's lines — opened where the
   *  lord pleases, closed by nothing but time. */
  private tickDoors(): void {
    if (this.time < this.doorAt) return;
    this.doorAt = this.time + WAR_CFG.modifier.doorEvery;
    for (let i = 0; i < this.seats.length; i++) {
      const s = this.seats[i];
      const lord = lordDef(s.lord);
      const scale = lord?.temper.deepStrike ?? 0;
      if (!lord || scale <= 0 || !s.throne) continue;
      if (!this.rng.chance(WAR_CFG.modifier.doorChance * scale)) continue;
      const ang = this.rng.range(0, Math.PI * 2);
      const r = this.rng.range(WAR_CFG.modifier.doorRange[0], WAR_CFG.modifier.doorRange[1]);
      const at = { x: s.throne.x + Math.cos(ang) * r, y: s.throne.y + Math.sin(ang) * r };
      const victim = this.warAt(at);
      if (!victim || victim.seat === i || this.isTruced(i, victim.seat)) continue;
      this.mods.push({
        seat: i, at, radius: WAR_CFG.modifier.doorRadius, mul: WAR_CFG.modifier.doorMul,
        from: this.time, until: this.time + WAR_CFG.modifier.doorFor,
      });
      this.pushBulletin(`${lord.short} opens a door behind ${victim.lord.short}'s lines!`, lord.color);
      return; // one door per beat — the map should read, not strobe
    }
  }

  private tickMods(): void {
    for (let i = this.mods.length - 1; i >= 0; i--) {
      if (this.time >= this.mods[i].until) this.mods.splice(i, 1);
    }
  }

  private isTruced(a: number, b: number): boolean {
    return !!this.truce &&
      ((this.truce.a === a && this.truce.b === b) || (this.truce.a === b && this.truce.b === a));
  }

  /** Charted-zone owner changes become war bulletins (the deeds strings). */
  private tickZoneBulletins(view: OverlayView): void {
    for (const z of view.nodes) {
      if (!view.visited.has(z.id)) continue;
      const st = this.warAt(z.map);
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

  /** The seated lords, in seat order — everlasting for the run. */
  seatedLords(): (UnderworldLordDef | undefined)[] {
    return this.seats.map(s => lordDef(s.lord));
  }

  /** Live power per seat (attribution weights + UI). */
  strengths(): number[] { return this.seats.map(s => s.power); }

  throneOf(lordId: string): MapCoord | null {
    const s = this.seats.find(x => x.lord === lordId);
    return s?.throne ? { x: s.throne.x, y: s.throne.y } : null;
  }

  /** Non-null when this zone's front runs HOT enough to field the attacker's
   *  MARSHAL (the engine's zone-runtime row spawns the body; the armies
   *  themselves ride affectSpawns' injection — this is just the officer). */
  frontStage(zoneId: string): { attacker: UnderworldLordDef; defender: UnderworldLordDef } | null {
    const st = this.zoneWar(zoneId);
    if (!st?.contested || st.contested.level < WAR_CFG.contest.hot) return null;
    return { attacker: st.contested.by, defender: st.lord };
  }

  /** Should the LORD hold court in this zone right now? Deep sanctum ground,
   *  held by its own lord, power gathered, cooldown clear — the throne is
   *  wherever the lord stands, and it stands where YOU walked in. */
  manifestHere(zoneId: string): UnderworldLordDef | null {
    const st = this.zoneWar(zoneId);
    if (!st?.throne) return null;
    const seat = this.seats[st.seat];
    if (this.time < seat.manifestAt) return null;
    if (seat.power < WAR_CFG.power.base * WAR_CFG.manifest.minPowerFrac) return null;
    return st.lord;
  }

  // --- the player's levers (fleeting, all of them) -------------------------------

  /** A front-marshal fell: the local push collapses — into a suppression
   *  that HEALS. The vacuum fills; the war forgets. */
  onMarshalSlain(lordId: string, at: MapCoord): void {
    const i = this.seats.findIndex(x => x.lord === lordId);
    if (i < 0) return;
    const lord = lordDef(lordId);
    const hold = lord?.temper.hold ?? 0.5;
    const dur = WAR_CFG.modifier.marshalFor / (1 + (WAR_CFG.modifier.holdShrug - 1) * hold);
    this.mods.push({
      seat: i, at: { x: at.x, y: at.y }, radius: WAR_CFG.modifier.marshalRadius,
      mul: WAR_CFG.modifier.marshalMul, from: this.time, until: this.time + dur,
    });
    this.seats[i].power = Math.max(WAR_CFG.power.floor, this.seats[i].power - WAR_CFG.modifier.marshalPowerNick);
    if (lord) this.pushBulletin(`${lord.short}'s marshal falls — the push collapses. For now.`, lord.color);
  }

  /** A manifested LORD was cast down: its power collapses everywhere — the
   *  rivals flood the footprint — and then it REGATHERS. No throne changes
   *  hands; there is nothing here the player can end. */
  onLordSlain(lordId: string): void {
    const i = this.seats.findIndex(x => x.lord === lordId);
    if (i < 0) return;
    const s = this.seats[i];
    s.power = Math.max(WAR_CFG.power.floor, s.power * WAR_CFG.manifest.collapseMul);
    s.manifestAt = this.time + WAR_CFG.manifest.cooldown;
    const lord = lordDef(lordId);
    if (lord) {
      this.pushBulletin(`${lord.name} is CAST DOWN — and the war does not even pause.`, lord.color);
    }
  }

  // --- incursion attribution -----------------------------------------------------

  /** A demonic incursion ignites: WHICH lord sent it, and in what shape?
   *  Wrath × power-share picks the striker (a strong lord has hosts to spare
   *  — the strike is DETACHED strength, not desperation); the lord's
   *  preferred flavors pick the type. Never throws on an empty war. */
  attributeStrike(typeIds: string[]): { lordId: string; typeId: string } | null {
    if (!this.seats.length) return null;
    const total = this.seats.reduce((a, s) => a + s.power, 0) || 1;
    const table = this.seats.map(s => {
      const lord = lordDef(s.lord);
      const surplus = 0.4 + (s.power / total) * this.seats.length * 0.6;
      return { lord, weight: Math.max(0.05, (lord?.temper.wrath ?? 0.5) * surplus) };
    }).filter(e => e.lord) as { lord: UnderworldLordDef; weight: number }[];
    if (!table.length) return null;
    const pick = this.rng.weighted(table).lord;
    const prefs = pick.strikes.filter(p => typeIds.includes(p.type));
    const typeId = prefs.length ? this.rng.weighted(prefs).type
      : (typeIds.length ? typeIds[Math.floor(this.rng.next() * typeIds.length)] : '');
    const seat = this.seats.find(x => x.lord === pick.id);
    if (seat) seat.strikesOut++;
    return { lordId: pick.id, typeId };
  }

  /** The strike came home: repelled = the committed host is LOST (the
   *  footprint recedes everywhere — rivals notice); spoils = it fed. */
  strikeResolved(lordId: string, outcome: 'repelled' | 'spoils'): void {
    const s = this.seats.find(x => x.lord === lordId);
    if (!s) return;
    s.strikesOut = Math.max(0, s.strikesOut - 1);
    const lord = lordDef(lordId);
    if (outcome === 'repelled') {
      s.power = Math.max(WAR_CFG.power.floor, s.power * WAR_CFG.strike.repelledMul);
      if (lord) this.pushBulletin(`${lord.short}'s strike is broken — the fronts below feel it.`, lord.color);
    } else {
      s.power = Math.min(WAR_CFG.power.base * 1.3, s.power + WAR_CFG.strike.spoilsPower);
      s.spoilsUntil = this.time + WAR_CFG.strike.spoilsFor;
      if (lord) this.pushBulletin(`${lord.short}'s strike feeds — the ${lord.epithet}'s banners swell.`, lord.color);
    }
  }

  // --- map --------------------------------------------------------------------

  /** The living warfront: the eternal field sampled over the VIEWED extent on
   *  a world-anchored render ladder (the wash breathes and crawls on its own
   *  clock — the map's auto-refresh animates it), throne sigils (dimmed while
   *  a cast-down lord regathers), hot-front badges over charted ground, and
   *  thrust arrows along the strongest advances. The field is infinite; the
   *  render just window-shops it. */
  renderMap(nodes: { id: string; map: MapCoord; name: string }[]): MapLayer {
    if (!this.anchor) return { under: '', over: '' };
    // Extent: charted hell + thrones + a margin — the window, not the war.
    let minX = this.anchor.x, maxX = this.anchor.x, minY = this.anchor.y, maxY = this.anchor.y;
    for (const s of this.seats) {
      if (!s.throne) continue;
      minX = Math.min(minX, s.throne.x); maxX = Math.max(maxX, s.throne.x);
      minY = Math.min(minY, s.throne.y); maxY = Math.max(maxY, s.throne.y);
    }
    for (const z of nodes) {
      minX = Math.min(minX, z.map.x); maxX = Math.max(maxX, z.map.x);
      minY = Math.min(minY, z.map.y); maxY = Math.max(maxY, z.map.y);
    }
    const pad = 140;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    // World-anchored ladder: cell = base × 2^k so growth never re-tiles.
    let cell = WAR_CFG.map.cellBase;
    while (Math.max(maxX - minX, maxY - minY) / cell > WAR_CFG.map.maxCellsPerAxis) cell *= 2;
    const ox = Math.floor(minX / cell) * cell, oy = Math.floor(minY / cell) * cell;
    const t = this.time;
    let under = '';
    const flows: { x: number; y: number; seat: number; gain: number }[] = [];
    for (let y = oy; y < maxY; y += cell) {
      for (let x = ox; x < maxX; x += cell) {
        const c = { x: x + cell / 2, y: y + cell / 2 };
        const st = this.warAt(c);
        if (!st) continue;
        const alpha = WAR_CFG.map.washAlpha +
          WAR_CFG.map.washPowerAlpha * Math.min(1, st.power / (WAR_CFG.power.base * 1.2));
        under += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${cell}" height="${cell}" fill="${st.lord.color}" fill-opacity="${alpha.toFixed(3)}"/>`;
        // Hot border cells feed the arrow pick: who is GAINING here?
        if (st.contested && st.contested.level > WAR_CFG.contest.hot) {
          const rivalSeat = this.seats.findIndex(s => s.lord === st.contested!.by.id);
          if (rivalSeat >= 0) {
            const now = this.influence(rivalSeat, c, t) - this.influence(st.seat, c, t);
            const soon = this.influence(rivalSeat, c, t + 4) - this.influence(st.seat, c, t + 4);
            flows.push({ x: c.x, y: c.y, seat: soon > now ? rivalSeat : st.seat, gain: Math.abs(soon - now) });
          }
        }
      }
    }
    let over = '';
    // Throne sigils — the seats of power (dim while the lord regathers).
    for (const s of this.seats) {
      if (!s.throne) continue;
      const lord = lordDef(s.lord);
      if (!lord) continue;
      const gathering = s.power < WAR_CFG.power.base * WAR_CFG.manifest.minPowerFrac;
      const op = gathering ? 0.4 : 0.9;
      const x = s.throne.x.toFixed(0), y = s.throne.y.toFixed(0);
      over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${lord.color}" stroke-width="1.6" stroke-dasharray="3 2" opacity="${op}"/>` +
        `<text x="${x}" y="${(s.throne.y + 4.5).toFixed(0)}" text-anchor="middle" font-size="12" fill="${lord.color}" font-weight="bold" opacity="${op}">${lord.sigil}<title>${lord.throne.name} — ${lord.name}. ${lord.creed}${gathering ? ' (cast down — regathering)' : ''}</title></text>`;
    }
    // Hot fronts over charted zones.
    for (const z of nodes) {
      const st = this.warAt(z.map);
      if (!st?.contested || st.contested.level < WAR_CFG.contest.hot) continue;
      over += `<text x="${z.map.x.toFixed(0)}" y="${(z.map.y - 14).toFixed(0)}" text-anchor="middle" font-size="11" fill="#e8b060" opacity="0.95">⚔<title>${st.lord.short} vs ${st.contested.by.short}</title></text>`;
    }
    // Thrust arrows: the strongest live advances, pointed along the gain.
    flows.sort((a, b) => b.gain - a.gain);
    const drawn: { x: number; y: number }[] = [];
    for (const f of flows) {
      if (drawn.length >= WAR_CFG.map.arrows) break;
      if (drawn.some(d => Math.hypot(d.x - f.x, d.y - f.y) < cell * 2)) continue;
      drawn.push(f);
      const lord = lordDef(this.seats[f.seat]?.lord ?? '');
      if (!lord) continue;
      // Advance direction: the gainer's influence gradient (finite difference).
      const e = 14;
      const gx = this.influence(f.seat, { x: f.x + e, y: f.y }, t) - this.influence(f.seat, { x: f.x - e, y: f.y }, t);
      const gy = this.influence(f.seat, { x: f.x, y: f.y + e }, t) - this.influence(f.seat, { x: f.x, y: f.y - e }, t);
      const len = Math.hypot(gx, gy) || 1;
      const ux = -gx / len, uy = -gy / len;  // downhill = into the rival
      const x2 = f.x + ux * 26, y2 = f.y + uy * 26;
      over += `<path d="M ${f.x.toFixed(0)} ${f.y.toFixed(0)} L ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${lord.color}" stroke-width="2.2" opacity="0.85"/>` +
        `<path d="M ${x2.toFixed(0)} ${y2.toFixed(0)} l ${(-ux * 7 - uy * 4).toFixed(1)} ${(-uy * 7 + ux * 4).toFixed(1)} l ${(uy * 8).toFixed(1)} ${(-ux * 8).toFixed(1)} Z" fill="${lord.color}" opacity="0.85"/>`;
    }
    return { under, over };
  }

  // --- persistence (the durable pledge) ----------------------------------------
  // A handful of scalars: the eternal layer derives from time, so the field
  // itself needs no saving — it cannot be corrupted, only re-asked.

  snapshot(): unknown {
    return {
      time: Math.round(this.time * 10) / 10,
      anchor: this.anchor ? { x: Math.round(this.anchor.x), y: Math.round(this.anchor.y) } : null,
      seats: this.seats.map(s => ({
        lord: s.lord,
        throne: s.throne ? { x: Math.round(s.throne.x), y: Math.round(s.throne.y) } : null,
        power: Math.round(s.power * 10) / 10,
        strikesOut: s.strikesOut, spoilsUntil: Math.round(s.spoilsUntil),
        manifestAt: Math.round(s.manifestAt),
        salt: s.salt, heading: Math.round(s.heading * 1000) / 1000,
        turnPeriod: Math.round(s.turnPeriod), tidePhase: Math.round(s.tidePhase * 1000) / 1000,
        tidePeriod: Math.round(s.tidePeriod),
      })),
      truce: this.truce ? { a: this.truce.a, b: this.truce.b, breakAt: Math.round(this.truce.breakAt) } : null,
      mods: this.mods.map(m => ({
        seat: m.seat, at: { x: Math.round(m.at.x), y: Math.round(m.at.y) },
        radius: m.radius, mul: m.mul, from: Math.round(m.from), until: Math.round(m.until),
      })),
      doorAt: Math.round(this.doorAt),
      lastZoneOwner: Object.fromEntries(this.lastZoneOwner),
    };
  }

  restore(snap: unknown): void {
    const s = snap as {
      time?: number;
      anchor?: { x: number; y: number } | null;
      seats?: { lord: string; throne: { x: number; y: number } | null; power: number; strikesOut: number; spoilsUntil: number; manifestAt: number; salt: number; heading: number; turnPeriod: number; tidePhase: number; tidePeriod: number }[];
      truce?: { a: number; b: number; breakAt: number } | null;
      mods?: FieldMod[];
      doorAt?: number;
      lastZoneOwner?: Record<string, number>;
    } | null;
    if (!s || !Array.isArray(s.seats)) return;
    this.time = typeof s.time === 'number' ? s.time : 0;
    this.anchor = s.anchor ? { x: s.anchor.x, y: s.anchor.y } : null;
    // Registry-tolerant: a lord gone from the pool re-rolls deterministically
    // from what remains — the seat's field identity carries over.
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
        throne: x.throne ? { x: x.throne.x, y: x.throne.y } : null,
        power: typeof x.power === 'number' ? Math.max(WAR_CFG.power.floor, x.power) : WAR_CFG.power.base,
        strikesOut: Math.max(0, x.strikesOut | 0),
        spoilsUntil: typeof x.spoilsUntil === 'number' ? x.spoilsUntil : 0,
        manifestAt: typeof x.manifestAt === 'number' ? x.manifestAt : 0,
        salt: (x.salt ?? 1) >>> 0,
        heading: typeof x.heading === 'number' ? x.heading : 0,
        turnPeriod: typeof x.turnPeriod === 'number' ? x.turnPeriod : WAR_CFG.field.driftTurn[0],
        tidePhase: typeof x.tidePhase === 'number' ? x.tidePhase : 0,
        tidePeriod: typeof x.tidePeriod === 'number' ? x.tidePeriod : WAR_CFG.power.tidePeriod[0],
      };
    });
    this.truce = s.truce && typeof s.truce.a === 'number' ? { a: s.truce.a, b: s.truce.b, breakAt: s.truce.breakAt } : null;
    this.mods = [];
    for (const m of s.mods ?? []) {
      if (typeof m?.seat !== 'number' || !m.at) continue;
      this.mods.push({ seat: m.seat, at: { x: m.at.x, y: m.at.y }, radius: m.radius, mul: m.mul, from: m.from, until: m.until });
    }
    this.doorAt = s.doorAt ?? 0;
    this.lastZoneOwner = new Map(Object.entries(s.lastZoneOwner ?? {}));
    this.applyStances();
  }

  /** Nothing minted, nothing owned — only the bulletin memory follows zones. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const [zid] of this.lastZoneOwner) {
      if (!has(zid)) this.lastZoneOwner.delete(zid);
    }
  }

  /** dev/QA: a summary peek at the standing war. */
  peek(): { seats: { lord: string; power: number; strikesOut: number; gathering: boolean }[]; anchored: boolean; truce: boolean; mods: number } {
    return {
      seats: this.seats.map(s => ({
        lord: s.lord, power: Math.round(s.power), strikesOut: s.strikesOut,
        gathering: s.power < WAR_CFG.power.base * WAR_CFG.manifest.minPowerFrac,
      })),
      anchored: !!this.anchor,
      truce: !!this.truce,
      mods: this.mods.length,
    };
  }
}

// --- bulletins (registered on import) -------------------------------------------
// War news is heard WHERE THE WAR IS: standing in the underworld you hear its
// conquests, pacts, collapses; on the surface the queue drains silently —
// the world above learns of the war only through its strikes (and the map).
registerBulletinSource((world: World) => {
  const hw = world.sim.hellWarField;
  if (!hw || !hw.bulletins.length) return [];
  const fresh = hw.bulletins.splice(0);
  if ((world.zone.dimension ?? 'surface') !== (hw.dimension ?? 'surface')) return [];
  return fresh;
});

// --- zone-info rows (registered on import) ---------------------------------------
// The map's zone box names the ground's holder, the pressing front, and the
// sanctum — the same reads the HUD condition line carries, plus the creed
// (the box has room for doctrine; the HUD does not).
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const hw = world.sim.hellWarField;
  if (!hw || (world.zoneMap[zoneId]?.dimension ?? 'surface') !== (hw.dimension ?? 'surface')) return [];
  const st = hw.zoneWar(zoneId);
  if (!st) return [];
  const out: ZoneInfoEntry[] = [{
    kind: 'modifier',
    icon: st.throne ? st.lord.sigil : '⚑',
    color: st.lord.color,
    label: st.throne ? `${st.lord.name} — the sanctum` : `Held by ${st.lord.short}, ${st.lord.epithet}`,
    detail: st.throne ? st.lord.creed : (st.heartland ? `heartland · ${st.lord.creed}` : st.lord.creed),
    z: st.throne ? 18 : 8,
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
