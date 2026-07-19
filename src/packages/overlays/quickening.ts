// ---------------------------------------------------------------------------
// THE QUICKENING FIELD — spent ground runs quick again (pure overlay).
//
// The Terror-Zone thesis in Hollow Wake's own words: the world is a corpse
// being waked, and now and then a surge of whatever it used to be finds an
// old limb — a zone the player has ALREADY walked and outgrown — and the
// ground QUICKENS. For one fixed window the zone's level leaps to a band
// around the hero's own (the engine re-stamps ZoneDef.level off this field's
// truth), its contents re-mint fresh at the new level (the zone-memory drop),
// its in-zone event chance and loot bounty climb, and every enemy on the
// ground wears the `quickborn` mark. When the window closes the zone reverts
// to EXACTLY what it was — level restored, memory dropped again so the next
// entry re-mints true.
//
// LAWS this field keeps (each one a deliberate identity, not an accident):
//  - KNOWN GROUND ONLY: a quickening lands exclusively on zones the player
//    has WALKED (view.visited — stricter than the seat fabric's known =
//    visited ∪ surveyed). The event is ABOUT retracing your steps; a surge
//    on unseen ground would just be another dark node. Enforced here as a
//    hard filter so no tuning can quietly break the re-explore thesis.
//  - OUTLEVELED GROUND FIRST: only zones at least `minOutlevel` below the
//    hero qualify, and the weigh curve leans toward the most outgrown —
//    "previously useless" is the point.
//  - THE SET WINDOW: duration is rolled ONCE at ignition and runs on the
//    world clock, indifferent to anything the player does (the world-boss
//    apparition's stay, worn by ground). Nothing extends it; nothing but
//    the clock (or the dev seam) ends it.
//  - THE POINTER, NOT THE HAND: this field never touches a ZoneDef. The
//    engine's reconcile sweep (world.ts updateQuickening) reads arcs() and
//    stamps/reverts ZoneDef.level + ZoneDef.quickened, drops zone memory at
//    both edges, pulses the kin mark, and stages the Surge Echo — the same
//    pure-overlay/engine-materializes split every sibling field keeps.
//
// Reuses: the seat fabric (world/seats.ts) for WHERE, the bulletin/marker/
// zone-info registries for findability, the event-weather fabric for the
// quickened sky (the def registers the 'quickened_air' row + its dress),
// and the kill-handler registry for the ground's own ledgers (def file).
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { registerEventFront } from '../../engine/eventWeather';
import type { WorldBulletin } from '../../world/bulletins';
import { registerBulletinSource } from '../../world/bulletins';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { pickSeat, type SeatTuning } from '../../world/seats';
import { dimensionIds } from '../../world/dimensions';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed cadence (the slow ignition roll)

/** The whole Quickening mechanic as data — every number a knob. */
export interface QuickeningSurge {
  /** Per-STEP chance a fresh surge lands (× ignitionMul) once cooled. */
  igniteChance: number;
  /** Surges live at once (scaledCap lifts it under the crank). */
  maxConcurrent: number;
  /** Visited-zone floor before the first surge can land (it needs a past). */
  minCharted: number;
  /** Seconds from run start before the first surge may land. */
  firstDelaySec: number;
  /** Seconds between surges (rolled; starts when one fades). */
  cooldown: [number, number];
  /** THE WINDOW: seconds a quickened zone holds (rolled once at ignition;
   *  runs on the world clock, indifferent to the player). */
  holdSec: [number, number];
  /** Surge level = hero level + an int rolled in this inclusive band —
   *  "your level, a level below, up to a few above". */
  levelBand: [number, number];
  /** Only zones at least this many levels BELOW the hero qualify — the
   *  "previously useless" law (also keeps the surge a strict raise). */
  minOutlevel: number;
  /** Seat weight grows by this per level the zone sits below the hero
   *  (capped) — the most outgrown ground calls loudest. */
  outlevelWeighPer: number;
  outlevelWeighCap: number;
  /** WHERE (the seat fabric): the distance envelope + near/far tilt. The
   *  known/unknown muls are structurally moot here — the field hard-filters
   *  to VISITED ground (the law above) — but ride along for the picker. */
  seat: SeatTuning;
  /** In-zone EVENT-density multiplier while quickened (folded into
   *  World.eventDensityFor beside the mycelia suppression). */
  eventMul: number;
  /** ZoneDef.bounty fold while quickened (the kill-path rich-ground lever,
   *  read live at rollDrops — never stamped, never persisted). */
  bountyMul: number;
  /** Drop the zone's memory at the window's edges: onSurge = the re-mint
   *  that makes re-exploring pay; onFade = the revert that makes "exactly
   *  as it had been" true on the next entry. */
  refresh: { onSurge: boolean; onFade: boolean };
  /** The kin mark: every enemy on quickened ground wears this status,
   *  re-pulsed by the engine sweep every pulseSec (status duration should
   *  outlast the pulse by a breath). */
  kin: { status: string; pulseSec: number };
  /** THE SURGE ECHO — the window's one named face: staged once per arc by
   *  the engine (champion-promoted), paid by its kill row (the reward dials
   *  live here so the row and the pitch can never disagree). Optional: a
   *  tuning may run pure farming windows. */
  echo?: { monster: string; levelBonus: number; announce: string; reward: { xp: number; gems: number } };
  /** Announcement templates ({zone} / {level} / {mins} substituted). */
  announce: { surge: string; fade: string };
  /** The event-pinned sky while a zone runs quick (a WEATHER_DEFS eventOnly
   *  kind — the def registers it, dress rows and all). Absent = clear sky. */
  weatherKind?: string;
  /** The event's palette (markers, rings, chips, announce lines). */
  color: string;
}

// --- live state (all pure JSON — it IS the snapshot) -------------------------

interface ActiveQuickening {
  id: string;
  zoneId: string;
  /** The rolled surge level the engine stamps onto ZoneDef.level. */
  level: number;
  /** Absolute world-clock second the window closes. */
  until: number;
  startedAt: number;
  /** The engine staged the Surge Echo for this arc (once, ever). */
  echoStaged: boolean;
  /** The echo fell (its kill row noted back) — the chip brags. */
  echoDown: boolean;
  /** The materialize beat ran (first entry: ledger + line — once per arc). */
  seen: boolean;
}

/** What the engine (and the chip/marker sources) read per quickened zone. */
export interface QuickeningInfo {
  id: string;
  zoneId: string;
  level: number;
  until: number;
  timeLeft: number;
  echoStaged: boolean;
  echoDown: boolean;
  seen: boolean;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export class QuickeningField implements WorldOverlay {
  readonly id = 'quickening';
  /** DURABLE: a half-run window with a stamped zone level behind it is a
   *  real arc — losing it on relaunch would strand a surged ZoneDef.level
   *  with no clock to revert it. The stamp and the arc save TOGETHER. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Quickening';
  readonly dimension?: string;

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: QuickeningSurge;
  private arcs: ActiveQuickening[] = [];
  private cool: number;
  private acc = 0;
  private seq = 0;
  private now = 0;
  private nodesById: Record<string, ZoneDef> = {};
  private pending: WorldBulletin[] = [];

  constructor(ctx: OverlayBuildCtx, surge: QuickeningSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.dimension = ctx.dimension;
    this.cool = surge.firstDelaySec;
  }

  surge(): QuickeningSurge { return this.cfg; }

  // --- the tick ---------------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    this.now = view.time;

    // 1. Windows close on the world clock — nothing the player does moves it.
    const faded = this.arcs.filter(a => this.now >= a.until);
    if (faded.length) {
      this.arcs = this.arcs.filter(a => !faded.includes(a));
      for (const a of faded) {
        this.say(this.cfg.announce.fade, this.nodesById[a.zoneId]?.name, a.level);
      }
      this.cool = this.rng.range(this.cfg.cooldown[0], this.cfg.cooldown[1]);
    }

    // 2. The cooldown breathes out.
    if (this.cool > 0) this.cool -= dt;

    // 3. STEP cadence — the surge rolls (gate + cap + cooldown + a past).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      const g = this.gate();
      if (!g.active) continue;
      if (this.cool > 0) continue;
      if (this.arcs.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) continue;
      if (view.visited.size < this.cfg.minCharted) continue;
      if (!this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) continue;
      this.trySurge(view);
    }
  }

  onNodeCharted(): void { /* surges land on WALKED ground; growth is moot */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the level stamp IS the tilt

  /** A surge IS something happening here (feeds the Mycelia bloom). */
  activityAt(zoneId: string): number {
    return this.arcs.some(a => a.zoneId === zoneId) ? 1.2 : 0;
  }

  // --- the surge --------------------------------------------------------------

  /** Land a surge on eligible walked ground. `preferZone` pins the seat (the
   *  dev button); `force` waives TUNING (visited floor, outlevel law, the
   *  cooldown and cap) but never ELIGIBILITY (zonePolicy, not-already-quick). */
  private trySurge(view: OverlayView, preferZone?: string, force = false): boolean {
    const surgeLevel = Math.max(1, view.charLevel
      + this.rng.int(this.cfg.levelBand[0], this.cfg.levelBand[1]));
    const taken = new Set(this.arcs.map(a => a.zoneId));
    const eligible = (z: ZoneDef): boolean =>
      !taken.has(z.id) && eventTargetable(this.id, z)
      && (force || (
        view.visited.has(z.id)                                  // THE LAW: walked ground only
        && z.level <= view.charLevel - this.cfg.minOutlevel     // outgrown ground only
        && z.level < surgeLevel));                              // the surge only ever RAISES
    let zone: ZoneDef | null = null;
    if (preferZone) {
      const z = view.byId[preferZone];
      zone = z && eligible(z) ? z : null;
    } else {
      zone = pickSeat(view, {
        event: this.id,
        ...this.cfg.seat,
        // Structural belt over the tuning: the filter above already demands
        // visited, so known/unknown muls cannot re-open unseen ground.
        unknownMul: 0, veiledMul: 0,
        filter: eligible,
        weigh: (z) => 1 + Math.min(this.cfg.outlevelWeighCap,
          Math.max(0, view.charLevel - z.level) * this.cfg.outlevelWeighPer),
      }, this.rng);
    }
    if (!zone) return false;
    const hold = this.rng.range(this.cfg.holdSec[0], this.cfg.holdSec[1]);
    this.arcs.push({
      id: `qk_${this.seq++}`, zoneId: zone.id,
      level: Math.max(zone.level + 1, surgeLevel), // even a forced seat rises
      until: this.now + hold, startedAt: this.now,
      echoStaged: false, echoDown: false, seen: false,
    });
    this.say(this.cfg.announce.surge, zone.name, Math.max(zone.level + 1, surgeLevel),
      Math.max(1, Math.round(hold / 60)));
    return true;
  }

  // --- accessors the engine reads ---------------------------------------------

  private infoOf(a: ActiveQuickening): QuickeningInfo {
    return {
      id: a.id, zoneId: a.zoneId, level: a.level, until: a.until,
      timeLeft: Math.max(0, a.until - this.now),
      echoStaged: a.echoStaged, echoDown: a.echoDown, seen: a.seen,
    };
  }

  /** The live surge over a zone (null = the ground runs at its own pace). */
  quickeningOn(zoneId: string): QuickeningInfo | null {
    const a = this.arcs.find(x => x.zoneId === zoneId);
    return a ? this.infoOf(a) : null;
  }

  /** Every live arc (the engine's reconcile sweep + markers + probes). */
  peek(): QuickeningInfo[] { return this.arcs.map(a => this.infoOf(a)); }

  activeCount(): number { return this.arcs.length; }

  /** In-zone EVENT-density fold (1 = untouched) — read by eventDensityFor. */
  eventMulAt(zoneId: string): number {
    return this.arcs.some(a => a.zoneId === zoneId) ? this.cfg.eventMul : 1;
  }

  /** Kill-path bounty fold (1 = untouched) — read live at rollDrops. */
  bountyMulAt(zoneId: string): number {
    return this.arcs.some(a => a.zoneId === zoneId) ? this.cfg.bountyMul : 1;
  }

  /** Engine note-backs (idempotent; unknown ids are a quiet no-op). */
  noteSeen(id: string): void { const a = this.arcs.find(x => x.id === id); if (a) a.seen = true; }
  noteEchoStaged(id: string): void { const a = this.arcs.find(x => x.id === id); if (a) a.echoStaged = true; }
  noteEchoDown(zoneId: string): void { const a = this.arcs.find(x => x.zoneId === zoneId); if (a) a.echoDown = true; }

  // --- dev seams (the QA Events tab) ------------------------------------------

  /** DEV: quicken THIS zone at once — eligibility (zonePolicy, not already
   *  quick) holds; tuning (visited floor, outlevel law, cooldown, cap) is
   *  waived, because a force button forces. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    return this.trySurge(view, zoneId, true);
  }

  /** DEV: close THIS zone's window now (the revert QAs in one sitting). */
  devFade(zoneId: string): boolean {
    const a = this.arcs.find(x => x.zoneId === zoneId);
    if (!a) return false;
    a.until = this.now;
    return true;
  }

  // --- the map ----------------------------------------------------------------

  renderMap(): MapLayer {
    let over = '';
    for (const a of this.arcs) {
      const z = this.nodesById[a.zoneId];
      if (!z) continue;
      const x = z.map.x.toFixed(1), y = z.map.y.toFixed(1);
      const frac = clamp01((a.until - this.now) / Math.max(1, a.until - a.startedAt));
      // The gilt breath: a live surge pulses; the ring thins as the window
      // spends itself (readable at a glance, no clock needed).
      over += `<circle cx="${x}" cy="${y}" r="14" fill="${this.cfg.color}" fill-opacity="0.10" `
        + `stroke="${this.cfg.color}" stroke-width="${(1 + 1.8 * frac).toFixed(2)}" stroke-opacity="0.9">`
        + `<animate attributeName="r" values="12;17;12" dur="2.4s" repeatCount="indefinite"/></circle>`;
      const secs = Math.max(0, Math.ceil(a.until - this.now));
      const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
      over += `<text x="${x}" y="${(z.map.y + 28).toFixed(1)}" text-anchor="middle" font-size="10" `
        + `fill="${this.cfg.color}" stroke="#120d08" stroke-width="2.6" paint-order="stroke">${mm}:${ss}</text>`;
    }
    return { under: '', over };
  }

  /** World-notice drain (the bulletins registry's contract). */
  drainBulletins(): WorldBulletin[] { return this.pending.splice(0); }

  private say(template: string, zoneName: string | undefined, level: number, mins?: number): void {
    this.pending.push({
      text: template
        .replace('{zone}', zoneName ?? 'a far place')
        .replace('{level}', String(level))
        .replace('{mins}', String(mins ?? 0)),
      color: this.cfg.color,
      size: 16,
    });
  }

  // --- the pledge -------------------------------------------------------------

  snapshot(): unknown {
    return {
      arcs: this.arcs.map(a => ({ ...a })),
      cool: this.cool,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const raw = snap as { arcs?: unknown[]; cool?: number; seq?: number } | null;
    if (!raw || typeof raw !== 'object') return;
    const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);
    this.seq = Math.max(this.seq, num(raw.seq, 0));
    this.cool = num(raw.cool, this.cool);
    if (Array.isArray(raw.arcs)) {
      this.arcs = raw.arcs.flatMap((v) => {
        const a = v as Partial<ActiveQuickening> | null;
        if (!a || typeof a.id !== 'string' || typeof a.zoneId !== 'string') return [];
        if (!isFinite(num(a.level, NaN)) || !isFinite(num(a.until, NaN))) return [];
        return [{
          id: a.id, zoneId: a.zoneId,
          level: Math.max(1, Math.round(num(a.level, 1))),
          until: num(a.until, 0),
          startedAt: num(a.startedAt, 0),
          echoStaged: a.echoStaged === true,
          echoDown: a.echoDown === true,
          seen: a.seen === true,
        } satisfies ActiveQuickening];
      });
    }
  }

  /** Post-resume scrub: an arc whose ground the sanitizer culled is dropped
   *  (its ZoneDef stamp died with the zone — nothing left to revert). */
  pruneZones(has: (zoneId: string) => boolean): void {
    this.arcs = this.arcs.filter(a => has(a.zoneId));
  }
}

// --- findability surfaces (registered on import — zero panels.ts edits) --------

/** The reader every surface shares: this package's live instance in every
 *  REGISTERED dimension (world/dimensions.ts — never a hardcoded plane list;
 *  declaring `dimensions: [...]` on the package makes new instances appear
 *  here for free). */
function quickeningFields(world: World): QuickeningField[] {
  return dimensionIds()
    .map(d => world.sim.overlayFor<QuickeningField>('quickening', d))
    .filter((f): f is QuickeningField => !!f);
}

registerMarkerSource((world: World): MapMarker[] => {
  const out: MapMarker[] = [];
  for (const f of quickeningFields(world)) {
    for (const a of f.peek()) {
      const secs = Math.max(0, Math.ceil(a.timeLeft));
      const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
      out.push({
        id: `qk-${a.id}`, zoneId: a.zoneId,
        glyph: '✦', fill: '#1a140c', stroke: f.surge().color, text: '#f8ecc8', r: 9,
        title: `Quickened — the ground runs at level ${a.level} for ${clock}`,
        fog: 'charted', z: 21, dimension: f.dimension,
      });
    }
  }
  return out;
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  for (const f of quickeningFields(world)) {
    const info = f.quickeningOn(zoneId);
    if (!info) continue;
    const secs = Math.max(0, Math.ceil(info.timeLeft));
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    let detail = `the surge holds ${clock} more — richer ground, thicker trouble`;
    if (f.surge().echo && !info.echoDown) detail += info.echoStaged
      ? ' · its echo still walks' : ' · something is gathering';
    if (info.echoDown) detail += ' · its echo is broken';
    return [{
      kind: 'event', icon: '✦', color: f.surge().color,
      label: `Quickened — level ${info.level}`,
      detail, z: 23,
    }];
  }
  return [];
});

registerBulletinSource((world: World) => {
  const out: WorldBulletin[] = [];
  for (const f of quickeningFields(world)) out.push(...f.drainBulletins());
  return out;
});

// The quickened SKY: while a zone runs quick its air reads gilt (the
// eventOnly 'quickened_air' row the def registers — wash, radiance, dress),
// easing off through the window's last breath so the fade never pops.
registerEventFront({
  id: 'quickening',
  sample: (world: World, zone: ZoneDef) => {
    const f = world.sim.overlayFor<QuickeningField>('quickening', zone.dimension);
    const info = f?.quickeningOn(zone.id);
    const kind = f?.surge().weatherKind;
    if (!info || !kind) return null;
    return { kind, intensity: Math.min(1, Math.max(0.25, info.timeLeft / 45)) };
  },
});
