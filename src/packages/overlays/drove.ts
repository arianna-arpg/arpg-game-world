// ---------------------------------------------------------------------------
// DROVE FIELD — the farmland's honest accident (pure overlay).
//
// Every so often a PEN GIVES WAY on a worked-country zone: the fold pours out
// through the broken rail and scatters, spooked, across the shires. No bell,
// no court, no conversion clock — the trouble here is the plainest one a farm
// knows: the stock is LOOSE, the land is full of teeth, and the reeve wants
// every head back ALIVE. The knot is a GATHERING — panicked heads run FROM
// pressure (walk them down from the far side and they run home; the drive
// wheel in world.ts does the fleeing), a head standing the pen ground is
// PENNED and counted, and a head that dies out there — a wolf, a fox, a
// careless swing — is simply LOST. When the last loose head is accounted for,
// the reeve pays: by the head, and a purse of the PASTORAL REGISTER (the
// drover's own words forced onto honest low-rarity gear — loot
// 'drove_purse'), with a flawless bonus when every single head came home
// breathing.
//
// Unattended, the farm manages or it doesn't: an absent-resolution die
// settles the fold's fate either way (reeveWinChance — crofters are not
// helpless), and a SCATTERED fold wears a transient scavenger hold (the
// beasts range the thinned ground for a while) before the land settles — the
// transience doctrine: the event borrows the farm, never owns it.
//
// PURE of the engine: owns the settle/phase/absent lifecycle, the head
// ledger, and the pen's REMEMBERED SEAT (staged once, so re-entry finds the
// wreck exactly where it fell); the engine reads droveOn() to stage the
// concrete scene (the collapsed pen dress, the loose heads, the reeve) and
// reports what happened through the note*() calls. Seated through the seat
// fabric (world/seats.ts), latent on unknown ground with a widening rumor
// (world/omens.ts). The Straying is this overlay's sibling — two farmland
// troubles, two different verbs: the bell CALLS, the pen SPILLS.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerOmenSource } from '../../world/omens';
import { pickSeat, type SeatTuning } from '../../world/seats';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const SADDLE_TAN = '#c9964b'; // drover's leather — the drove reads as one thing

/** The whole drove mechanic as data — every number a knob. */
export interface DroveSurge {
  /** Per-STEP chance a fresh collapse settles (gated by pressure + the cap). */
  igniteChance: number;
  maxConcurrent: number;
  /** WHERE pens give way (the seat fabric): envelope + known/unknown weights. */
  seat: SeatTuning;
  /** THE BELT LAW: the biomes a collapse may settle on — a list, never a
   *  hardcode (a harsher tuning could add the downs' sheep country). */
  biomes: string[];
  /** The pastoral band: no collapses over ground harder than this. */
  levelMax: number;
  /** A collapse seated on unknown ground settles LATENT (clock frozen,
   *  invisible) and RISES when found — the haunting's dormancy law. */
  latentOnUnknown?: boolean;
  /** The rumors a LATENT collapse casts (world/omens.ts), aging wider. */
  omen?: { whisper: number; reveal?: number; widenPerMin?: number; lines: string[] };

  // --- the concrete scene (engine-staged while a player stands the ground) ---
  /** Heads loose when the scene stages (rolled once). */
  heads: [number, number];
  /** What the loose heads spawn as — the pasture kinds, kept 'critter' (the
   *  wolf/morale contract: predators hunt them, objectives exempt them). */
  headTable: PackTableEntry[];
  /** How far from the pen the fold scattered (px band, per head). */
  scatter: [number, number];
  /** THE PEN GROUND: a head standing this close to the pen seat is PENNED. */
  penRadius: number;
  /** The drawn rail ring's radius (the collapsed-pen dress geometry). */
  penRingR: number;
  /** THE DRIVE: a player this close PRESSES a loose head (it flees away). */
  driveRadius: number;
  /** Freehold folk press too, leaning in closer (the farm helps its own). */
  assistDriveRadius: number;
  /** Flee pace while driven (fraction of the head's own stride). */
  drivePace: number;
  /** Seconds of quiet before a driven head settles back to milling. */
  calmSec: number;

  // --- the abstract clock (nobody watching — the farm still copes) -----------
  /** Seconds (rolled) before an unattended collapse resolves itself. */
  absentResolveSec: [number, number];
  /** How often the crofters gather the fold on their own. */
  reeveWinChance: number;
  /** Seconds a SCATTERED fold wears the scavenger hold (spawn-bias texture). */
  scatterHoldSec: number;
  /** Beast weight multiplier over the held ground while the hold stands. */
  scatterFactionMul: number;
  /** Reprieve after a GATHERED fold before a fresh collapse may settle. */
  resolveCooldownSeconds?: [number, number];

  reward: {
    /** Per head penned alive: xpPerHead + xpPerHeadPerLevel × zone level. */
    xpPerHead: number; xpPerHeadPerLevel: number;
    /** The reeve's purse at the gathering. */
    gatherXpBase: number; gatherXpPerLevel: number;
    /** Chance the purse includes a gem (the drover's chest — LOW on purpose). */
    gemChance: number;
    /** The purse's loot table (the Pastoral Register rides it). */
    purseTable: string;
    /** One extra register roll when EVERY head came home alive (lost === 0). */
    flawlessTable: string;
  };
  color?: string;
}

/** Lifecycle phases. 'gathered' is a TRANSITIONAL signal — the overlay flips
 *  it, the engine performs the beat (the purse) and calls resolve(). */
export type DrovePhase = 'loose' | 'gathered' | 'scattered';

/** What the engine reads to stage/tick the scene in a spilled zone. */
export interface DroveInfo {
  id: string;
  phase: DrovePhase;
  /** Counts staged yet? false until the first visit rolls the heads. */
  staged: boolean;
  loose: number;
  penned: number;
  lost: number;
  /** The pen's remembered seat (null until staged) — re-entry finds the
   *  wreck exactly where it fell. */
  penAt: { x: number; y: number } | null;
  color: string;
  age: number;
}

interface ActiveDrove {
  id: string;
  zoneId: string;
  coord: MapCoord;
  phase: DrovePhase;
  staged: boolean;
  loose: number;
  penned: number;
  lost: number;
  /** The pen's in-zone seat, remembered from the first staging (undefined
   *  until staged — always PRESENT on the record so the key order, and with
   *  it the snapshot's bytes, never depends on when staging happened). */
  penX: number | undefined;
  penY: number | undefined;
  /** Phase clock: the scatter hold (loose runs clockless while attended —
   *  an attended gathering resolves by play, never by timeout). */
  clock: number;
  /** The absent-resolution timer — frozen while the player stands the zone. */
  absentClock: number;
  age: number;
  latent?: boolean;
  /** DEV: a pinned collapse never absent-resolves and consumes no cooldown. */
  pinned?: boolean;
}

export class DroveField implements WorldOverlay {
  readonly id = 'drove';
  /** Durable: a standing collapse, its head ledger, and the pen's seat must
   *  survive a relaunch — a half-gathered fold that forgot its progress (or
   *  its pen) would break the gathering's whole promise. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Droves';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: DroveSurge;
  private droves: ActiveDrove[] = [];
  private cooldownLeft = 0;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: DroveSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    for (let i = this.droves.length - 1; i >= 0; i--) {
      const d = this.droves[i];
      d.age += dt;
      // THE LATENT COLLAPSE: seated on unknown ground it waits — clock frozen,
      // invisible — and RISES the moment its ground is known (walked or
      // surveyed; the omen reveal counts). The haunting's law, verbatim.
      if (d.latent) {
        if (view.visited.has(d.zoneId) || view.surveyed.has(d.zoneId)) d.latent = false;
        else continue;
      }
      const present = view.currentZoneId === d.zoneId;
      // The scatter hold expires on its own, watched or not.
      if (d.phase === 'scattered') {
        d.clock -= dt;
        if (d.clock <= 0) { this.droves.splice(i, 1); continue; } // the land settles
      }
      // A 'gathered' signal nobody is present to perform resolves silently —
      // the reeve pockets the purse himself and thinks well of nobody.
      if (d.phase === 'gathered' && !present) { this.finish(i, false); continue; }
      // THE ABSENT CLOCK: an unattended gathering resolves itself either way.
      if (d.phase === 'loose' && !present && !d.pinned) {
        d.absentClock -= dt;
        if (d.absentClock <= 0) {
          if (this.rng.chance(this.cfg.reeveWinChance)) this.finish(i, false);
          else this.becomeScattered(d);
          continue;
        }
      }
    }
    // IGNITION — a fresh pen gives way somewhere on the belt, never during
    // the reprieve a gathered fold bought.
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.cooldownLeft <= 0
        && this.droves.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* pens give way on standing ground only */ }

  /** A SCATTERED fold feeds the land: the beasts range the held ground while
   *  the hold stands — the fox fattens, the wolves linger. Everything else is
   *  the authored scene, never a table bias. */
  affectSpawns(zone: ZoneDef): SpawnBias {
    const d = this.droves.find(x => x.zoneId === zone.id && x.phase === 'scattered' && !x.latent);
    if (!d) return NO_BIAS;
    return { countMul: 1, factionMul: { beast: this.cfg.scatterFactionMul }, injectFactions: ['beast'] };
  }

  renderMap(): MapLayer {
    let over = '';
    for (const d of this.droves) {
      if (d.latent) continue; // a latent collapse paints nothing — found, not shown
      const col = this.cfg.color ?? SADDLE_TAN;
      const x = d.coord.x.toFixed(1), y = d.coord.y.toFixed(1);
      if (d.phase === 'scattered') {
        // A lost fold: a broken ring, no breath — the gathering already failed.
        over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${col}" stroke-width="1.5" stroke-opacity="0.55" stroke-dasharray="2 4"/>`;
      } else {
        // The pen breathes open and shut — slow; a drove is work, not war.
        over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="1.6" stroke-opacity="0.7">`
          + `<animate attributeName="stroke-opacity" values="0.2;0.7;0.2" dur="2.8s" repeatCount="indefinite"/></circle>`;
      }
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): DroveSurge { return this.cfg; }

  /** The collapse holding this zone, if any (a latent one reads as nothing). */
  droveOn(zoneId: string): DroveInfo | null {
    const d = this.droves.find(x => x.zoneId === zoneId && !x.latent);
    if (!d) return null;
    return {
      id: d.id, phase: d.phase, staged: d.staged,
      loose: d.loose, penned: d.penned, lost: d.lost,
      penAt: d.penX !== undefined && d.penY !== undefined ? { x: d.penX, y: d.penY } : null,
      color: this.cfg.color ?? SADDLE_TAN, age: d.age,
    };
  }

  /** The engine staged the concrete scene: the heads are rolled ONCE, and the
   *  pen's seat is remembered forever after (re-entry re-stages around it). */
  noteStaged(id: string, heads: number, penX: number, penY: number): void {
    const d = this.byId(id);
    if (!d || d.staged) return;
    d.staged = true;
    d.loose = Math.max(0, heads);
    d.penX = penX;
    d.penY = penY;
  }

  /** One head driven (or carried) home ALIVE. */
  notePenned(id: string): void {
    const d = this.byId(id);
    if (!d) return;
    d.loose = Math.max(0, d.loose - 1);
    d.penned++;
    this.checkExhausted(d);
  }

  /** One head died out there (a wolf, a fox, a careless swing). */
  noteLost(id: string): void {
    const d = this.byId(id);
    if (!d) return;
    d.loose = Math.max(0, d.loose - 1);
    d.lost++;
    this.checkExhausted(d);
  }

  /** The engine performed the gathering beat (purse paid): remove the
   *  collapse and start the reprieve. Stale ids are a no-op. */
  resolve(id: string): void {
    const i = this.droves.findIndex(x => x.id === id);
    if (i < 0) return;
    this.finish(i, this.droves[i].pinned ?? false);
  }

  /** Every head lost (or the absent die failed): the fold is gone — the
   *  ground wears the scavenger hold. Exposed for the engine's edge sweep. */
  markScattered(id: string): void {
    const d = this.byId(id);
    if (d) this.becomeScattered(d);
  }

  activeCount(): number { return this.droves.length; }
  cooldownRemaining(): number { return this.cooldownLeft; }

  /** A loose fold keeps its ground restless; the scavenger hold stirs less —
   *  the gathering is over, only the texture holds. */
  activityAt(zoneId: string): number {
    const d = this.droves.find(x => x.zoneId === zoneId && !x.latent);
    if (!d) return 0;
    return d.phase === 'scattered' ? 0.5 : 1;
  }

  /** Read-only snapshot for the marker/omen/zone-info sources. */
  peek(): ReadonlyArray<{ id: string; zoneId: string; x: number; y: number; phase: DrovePhase; latent: boolean; age: number; loose: number; penned: number; lost: number }> {
    return this.droves.map(d => ({
      id: d.id, zoneId: d.zoneId, x: d.coord.x, y: d.coord.y, phase: d.phase,
      latent: !!d.latent, age: d.age, loose: d.loose, penned: d.penned, lost: d.lost,
    }));
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  snapshot(): unknown {
    return {
      droves: this.droves.map(d => ({ ...d, coord: { ...d.coord } })),
      cooldownLeft: this.cooldownLeft,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const raw = snap as { droves?: unknown[]; cooldownLeft?: unknown; seq?: unknown } | null;
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.seq === 'number' && Number.isFinite(raw.seq)) this.seq = Math.max(this.seq, Math.floor(raw.seq));
    if (typeof raw.cooldownLeft === 'number' && Number.isFinite(raw.cooldownLeft)) this.cooldownLeft = Math.max(0, raw.cooldownLeft);
    if (!Array.isArray(raw.droves)) return;
    const num = (v: unknown, def: number, min = 0): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : def;
    const phases: DrovePhase[] = ['loose', 'gathered', 'scattered'];
    this.droves = [];
    for (const r of raw.droves) {
      const d = r as Partial<ActiveDrove> | null;
      if (!d || typeof d.id !== 'string' || typeof d.zoneId !== 'string') continue;
      if (!d.coord || ![d.coord.x, d.coord.y].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
      this.droves.push({
        id: d.id, zoneId: d.zoneId, coord: { x: d.coord.x, y: d.coord.y },
        phase: phases.includes(d.phase as DrovePhase) ? d.phase as DrovePhase : 'loose',
        staged: !!d.staged,
        loose: num(d.loose, 0), penned: num(d.penned, 0), lost: num(d.lost, 0),
        penX: typeof d.penX === 'number' && Number.isFinite(d.penX) ? d.penX : undefined,
        penY: typeof d.penY === 'number' && Number.isFinite(d.penY) ? d.penY : undefined,
        clock: num(d.clock, 0), absentClock: num(d.absentClock, this.cfg.absentResolveSec[0]),
        age: num(d.age, 0),
        ...(d.latent ? { latent: true } : {}),
        // A DEV pin is a live-session probe, never a saved fact.
      });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    this.droves = this.droves.filter(d => has(d.zoneId));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: spill a pen on the given zone immediately — PINNED (it never
   *  absent-resolves; resolving it consumes no reprieve). Skips the biome law
   *  on purpose (forcing the scene onto a test meadow is the point) but never
   *  double-seats a zone. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || this.droves.some(d => d.zoneId === zoneId)) return false;
    this.droves.push(this.mint(z, /* pinned */ true));
    return true;
  }

  // --- internals -------------------------------------------------------------

  private byId(id: string): ActiveDrove | undefined {
    return this.droves.find(x => x.id === id);
  }

  /** The last loose head accounted for: whatever the pen holds is the
   *  gathering — a fold with even ONE head penned pays; a fold that lost
   *  every head to the teeth is simply gone. */
  private checkExhausted(d: ActiveDrove): void {
    if (d.phase !== 'loose' || !d.staged || d.loose > 0) return;
    if (d.penned > 0) d.phase = 'gathered';
    else this.becomeScattered(d);
  }

  private becomeScattered(d: ActiveDrove): void {
    // Any heads still loose are gone with the fold.
    d.lost += d.loose;
    d.loose = 0;
    d.phase = 'scattered';
    d.clock = this.cfg.scatterHoldSec;
  }

  /** Remove drove #i; a GATHERED fold buys the reprieve (dev pins never do). */
  private finish(i: number, skipCooldown: boolean): void {
    this.droves.splice(i, 1);
    if (!skipCooldown && this.cfg.resolveCooldownSeconds) {
      this.cooldownLeft = this.rng.range(
        this.cfg.resolveCooldownSeconds[0], this.cfg.resolveCooldownSeconds[1]);
    }
  }

  private tryIgnite(view: OverlayView): void {
    const taken = new Set(this.droves.map(d => d.zoneId));
    const z = pickSeat(view, {
      event: this.id, ...this.cfg.seat,
      filter: n => !taken.has(n.id)
        && !!n.biome && this.cfg.biomes.includes(n.biome)
        && n.level <= this.cfg.levelMax,
    }, this.rng);
    if (!z) return;
    const d = this.mint(z);
    if ((this.cfg.latentOnUnknown ?? true)
      && !view.visited.has(z.id) && !view.surveyed.has(z.id)) d.latent = true;
    this.droves.push(d);
  }

  private mint(z: ZoneDef, pinned?: boolean): ActiveDrove {
    return {
      id: `drove_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      phase: 'loose', staged: false,
      loose: 0, penned: 0, lost: 0,
      // Seeded undefined so the pen coords keep THIS slot in the object's
      // key order when noteStaged fills them — snapshot → restore stays
      // byte-identical whether a record was staged live or rebuilt.
      penX: undefined, penY: undefined,
      clock: 0,
      absentClock: this.rng.range(this.cfg.absentResolveSec[0], this.cfg.absentResolveSec[1]),
      age: 0,
      pinned,
    };
  }
}

// --- map markers + omen + zone-info (registered on import) --------------------

registerMarkerSource((world: World): MapMarker[] => {
  const df = world.sim.droveField;
  if (!df) return [];
  return df.peek().filter(d => !d.latent).map(d => ({
    id: `drove-${d.id}`, coord: { x: d.x, y: d.y },
    glyph: '🐑', fill: '#20180d', stroke: SADDLE_TAN, text: '#f0e0c2', r: 7,
    title: d.phase === 'scattered' ? 'A fold lost to the teeth — scavengers range here'
      : d.phase === 'gathered' ? 'The fold is gathered — the reeve settles up'
        : 'A pen gave way here — the fold runs loose, wanted back alive',
    fog: 'always', z: 16,
  }));
});

// A LATENT collapse murmurs instead of marking: loose bleating heard
// {bearing} of here, aging wider until someone follows it.
registerOmenSource((world: World) => {
  const df = world.sim.droveField;
  const om = df?.surge().omen;
  if (!df || !om) return [];
  return df.peek().filter(d => d.latent).map(d => ({
    id: `drove-${d.id}`, at: { x: d.x, y: d.y }, zoneId: d.zoneId,
    color: df.surge().color ?? SADDLE_TAN,
    lines: om.lines, whisper: om.whisper, reveal: om.reveal,
    widenPerMin: om.widenPerMin, age: d.age,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const df = world.sim.droveField;
  const info = df?.droveOn(zoneId);
  if (!df || !info) return [];
  const detail = info.phase === 'scattered'
    ? 'the fold is gone — scavengers range this ground until it settles'
    : info.phase === 'gathered'
      ? `the fold is gathered — ${info.penned} penned, ${info.lost} lost`
      : `drive the loose heads back to the pen ALIVE — ${info.loose} loose · ${info.penned} penned · ${info.lost} lost`;
  return [{
    kind: 'event', icon: '🐑', color: info.color, label: 'The Drove',
    detail,
    z: 15,
  }];
});
