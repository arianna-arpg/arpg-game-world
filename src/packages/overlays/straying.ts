// ---------------------------------------------------------------------------
// STRAY FIELD — the farmland's tug-of-war (pure overlay).
//
// Every so often a BELL-CALL settles on a worked-country zone: the fold's own
// stock wanders loose while a still, wrong-eyed court of the Chattel stands at
// a rally point, calling. The knot is a LIVING TUG — each stray either comes
// HOME (walked back by a player's touch or a farmhand's; the duty-post fabric
// does the walking) or GOES TO THE BELL (a staggered per-head timer converts
// it in place; the changed body walks, still dormant, to join the court).
// Enough conversions and the court ROUSES and marches the steading — the
// existing chattel|freehold war and the warden rouse row stage the battle.
// Break the call (kill every caller, or save every head) and the strays
// remember themselves: the RELIEF path, with the drovers' purse.
//
// Unattended, the tug still tugs: an absent-resolution die settles the fold's
// fate either way (freeholdWinChance — the drovers manage on their own more
// often than not), so the belt genuinely fluctuates whether or not anyone is
// watching. A LOST fold wears a transient feral spawn-bias hold (the Chattel
// range the ground for a while) and then the land settles — the transience
// doctrine: the event borrows the farm, never owns it.
//
// PURE of the engine: owns the settle/phase/absent-clock lifecycle and the
// head ledger; the engine reads strayingOn() to stage the concrete scene
// (strays, the dormant court, the herding sweep) and reports what happened
// through the note*() calls. Seated through the seat fabric (world/seats.ts),
// latent on unknown ground with a widening bell-omen (world/omens.ts).
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
const BELL_GOLD = '#d8b86a'; // the chattel palette — the bell reads as one thing

/** The whole straying mechanic as data — every number a knob. */
export interface StrayingSurge {
  /** Per-STEP chance a fresh call settles (gated by pressure + the cap). */
  igniteChance: number;
  maxConcurrent: number;
  /** WHERE the bell calls (the seat fabric): envelope + known/unknown weights. */
  seat: SeatTuning;
  /** THE BELT LAW: the biomes a call may settle on — a list, never a hardcode
   *  (a harsher tuning could add 'downs' sheep country or 'field' shires). */
  biomes: string[];
  /** The pastoral band: no calls over ground harder than this. */
  levelMax: number;
  /** A call seated on unknown ground settles LATENT (clock frozen, invisible)
   *  and RISES when found — the haunting's dormancy-until-found law. */
  latentOnUnknown?: boolean;
  /** The murmurs a LATENT call casts (world/omens.ts), aging wider. */
  omen?: { whisper: number; reveal?: number; widenPerMin?: number; lines: string[] };

  // --- the concrete scene (engine-staged while a player stands the ground) ---
  /** Heads let loose when the scene stages (rolled). */
  strays: [number, number];
  /** What the strays spawn as — the pasture kinds. */
  strayTable: PackTableEntry[];
  /** THE BELL'S WORK: stray def id → the feral def it converts to. A kind
   *  missing here falls back to `convertFallback`. */
  convertTo: Record<string, string>;
  convertFallback: string;
  /** The court posted at the rally (rolled count + presence-banded table). */
  callers: [number, number];
  callerTable: PackTableEntry[];
  callerLevelBonus: number;
  /** Fold → rally distance (px) — how far the call stands from the steading. */
  rallyDist: number;
  /** A player this close turns a loose stray home. */
  herdRadius: number;
  /** Freehold folk do the same, leaning in closer. */
  assistRadius: number;
  /** This close to the fold, a homing stray is HOME SAFE. */
  arriveRadius: number;
  /** THE WHEEL paces (fractions of each body's own stride) — the scene walks
   *  its treks itself, migrant-style, so they run however far the player
   *  ranges (the AI's activity scoping never stalls a rescue): the homing
   *  walk, the changed head's sleepwalk to the rally, the roused march. */
  homePace: number;
  thrallPace: number;
  marchPace: number;
  /** Per-stray bell timer (rolled, staggered): expiry converts it in place. */
  bellPull: [number, number];
  /** Conversions that rouse the court to march the steading. */
  raidAt: number;
  /** Seconds the march presses before the bell recedes with what it took. */
  raidTtl: number;

  // --- the abstract clock (nobody watching — the world still tugs) -----------
  /** Seconds (rolled) before an unattended call resolves itself. */
  absentResolveSec: [number, number];
  /** How often the drovers manage on their own (the tug's other hand). */
  freeholdWinChance: number;
  /** Seconds a LOST fold wears the feral hold (spawn-bias texture). */
  overrunHoldSec: number;
  /** Chattel weight multiplier over held ground while the hold stands. */
  overrunFactionMul: number;
  /** Reprieve after a RELIEVED fold before a fresh call may settle. */
  resolveCooldownSeconds?: [number, number];

  reward: {
    /** Per head walked home: xpPerHead + xpPerHeadPerLevel × zone level. */
    xpPerHead: number; xpPerHeadPerLevel: number;
    /** The drovers' purse at relief/defense. */
    reliefXpBase: number; reliefXpPerLevel: number; reliefGems: number;
  };
  color?: string;
}

/** Lifecycle phases. 'relieved' is a TRANSITIONAL signal — the overlay flips
 *  it, the engine performs the beat (auto-home, purse) and calls resolve(). */
export type StrayingPhase = 'gathering' | 'raid' | 'relieved' | 'overrun';

/** What the engine reads to stage/tick the scene in a called zone. */
export interface StrayingInfo {
  id: string;
  phase: StrayingPhase;
  /** Counts staged yet? false until the first visit rolls the heads. */
  staged: boolean;
  straysLeft: number;
  returned: number;
  converted: number;
  callersLeft: number;
  color: string;
  age: number;
}

interface ActiveStraying {
  id: string;
  zoneId: string;
  coord: MapCoord;
  phase: StrayingPhase;
  staged: boolean;
  straysLeft: number;
  returned: number;
  converted: number;
  lost: number;
  callersLeft: number;
  /** Phase clock: raid ttl / overrun hold (gathering runs clockless while
   *  attended — an attended scene resolves by play, never by timeout). */
  clock: number;
  /** The absent-resolution timer — frozen while the player stands the zone. */
  absentClock: number;
  age: number;
  latent?: boolean;
  /** DEV: a pinned call never absent-resolves and consumes no cooldown. */
  pinned?: boolean;
}

export class StrayField implements WorldOverlay {
  readonly id = 'straying';
  /** Durable: a standing call, its head ledger, and the feral hold must
   *  survive a relaunch — a half-herded fold that forgot its progress would
   *  break the tug's whole promise. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Strayings';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: StrayingSurge;
  private strayings: ActiveStraying[] = [];
  private cooldownLeft = 0;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: StrayingSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    for (let i = this.strayings.length - 1; i >= 0; i--) {
      const s = this.strayings[i];
      s.age += dt;
      // THE LATENT CALL: seated on unknown ground it waits — clock frozen,
      // invisible — and RISES the moment its ground is known (walked or
      // surveyed; the omen reveal counts). Mirrors the haunting's law.
      if (s.latent) {
        if (view.visited.has(s.zoneId) || view.surveyed.has(s.zoneId)) s.latent = false;
        else continue;
      }
      const present = view.currentZoneId === s.zoneId;
      // Phase clocks tick everywhere (a raid presses on whether or not the
      // player stays to watch it; a feral hold expires on its own).
      if (s.phase === 'raid' || s.phase === 'overrun') {
        s.clock -= dt;
        if (s.clock <= 0) {
          if (s.phase === 'raid') this.becomeOverrun(s);
          else { this.strayings.splice(i, 1); continue; } // the land settles
        }
      }
      // A 'relieved' signal nobody is present to perform resolves silently —
      // the drovers finish the walk themselves.
      if (s.phase === 'relieved' && !present) { this.finish(i, true); continue; }
      // THE ABSENT CLOCK: unattended gathering resolves itself either way.
      if (s.phase === 'gathering' && !present && !s.pinned) {
        s.absentClock -= dt;
        if (s.absentClock <= 0) {
          if (this.rng.chance(this.cfg.freeholdWinChance)) this.finish(i, false);
          else this.becomeOverrun(s);
          continue;
        }
      }
    }
    // IGNITION — a fresh call settles on some worked ground, never during the
    // reprieve a relieved fold bought.
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.cooldownLeft <= 0
        && this.strayings.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* calls settle on standing ground only */ }

  /** A LOST fold runs feral for a while: the Chattel range the held ground —
   *  amplified where they already belong, injected where the table lacks them.
   *  Everything else is the authored scene, never a table bias. */
  affectSpawns(zone: ZoneDef): SpawnBias {
    const s = this.strayings.find(x => x.zoneId === zone.id && x.phase === 'overrun' && !x.latent);
    if (!s) return NO_BIAS;
    return { countMul: 1, factionMul: { chattel: this.cfg.overrunFactionMul }, injectFactions: ['chattel'] };
  }

  renderMap(): MapLayer {
    let over = '';
    for (const s of this.strayings) {
      if (s.latent) continue; // a latent call paints nothing — found, not shown
      const col = this.cfg.color ?? BELL_GOLD;
      const x = s.coord.x.toFixed(1), y = s.coord.y.toFixed(1);
      if (s.phase === 'overrun') {
        // A held fold: a steady feral ring, no breath — the tug already lost.
        over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${col}" stroke-width="1.5" stroke-opacity="0.55" stroke-dasharray="3 3"/>`;
      } else {
        // The bell breathes — quicker once the march is up.
        const dur = s.phase === 'raid' ? '1.2s' : '2.4s';
        over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="1.6" stroke-opacity="0.7">`
          + `<animate attributeName="stroke-opacity" values="0.15;0.7;0.15" dur="${dur}" repeatCount="indefinite"/></circle>`;
      }
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): StrayingSurge { return this.cfg; }

  /** The call holding this zone, if any (a latent one reads as nothing). */
  strayingOn(zoneId: string): StrayingInfo | null {
    const s = this.strayings.find(x => x.zoneId === zoneId && !x.latent);
    if (!s) return null;
    return {
      id: s.id, phase: s.phase, staged: s.staged,
      straysLeft: s.straysLeft, returned: s.returned, converted: s.converted,
      callersLeft: s.callersLeft,
      color: this.cfg.color ?? BELL_GOLD, age: s.age,
    };
  }

  /** The engine staged the concrete scene: the heads are rolled ONCE. */
  noteStaged(id: string, strays: number, callers: number): void {
    const s = this.byId(id);
    if (!s || s.staged) return;
    s.staged = true;
    s.straysLeft = Math.max(0, strays);
    s.callersLeft = Math.max(0, callers);
  }

  /** One head walked home. */
  noteReturned(id: string): void {
    const s = this.byId(id);
    if (!s) return;
    s.straysLeft = Math.max(0, s.straysLeft - 1);
    s.returned++;
    this.checkExhausted(s);
  }

  /** One head went to the bell. May rouse the march (raidAt). */
  noteConverted(id: string): void {
    const s = this.byId(id);
    if (!s) return;
    s.straysLeft = Math.max(0, s.straysLeft - 1);
    s.converted++;
    if (s.phase === 'gathering' && s.converted >= this.cfg.raidAt) {
      s.phase = 'raid';
      s.clock = this.cfg.raidTtl;
    } else this.checkExhausted(s);
  }

  /** One head simply died out there (a wolf, a stray blade). */
  noteStrayLost(id: string): void {
    const s = this.byId(id);
    if (!s) return;
    s.straysLeft = Math.max(0, s.straysLeft - 1);
    s.lost++;
    this.checkExhausted(s);
  }

  /** A caller fell. The LAST one breaks the call — relief, mid-gathering. */
  noteCallerDown(id: string): void {
    const s = this.byId(id);
    if (!s) return;
    s.callersLeft = Math.max(0, s.callersLeft - 1);
    if (s.callersLeft <= 0 && s.phase === 'gathering') s.phase = 'relieved';
  }

  /** The engine performed the relief/defense beat (purse paid): remove the
   *  call and start the reprieve. Stale ids are a no-op. */
  resolve(id: string): void {
    const i = this.strayings.findIndex(x => x.id === id);
    if (i < 0) return;
    this.finish(i, this.strayings[i].pinned ?? false);
  }

  /** The raid pressed its whole ttl (or an absent fold was lost): the ground
   *  runs feral for a while. Exposed for the engine's ttl-expiry sweep. */
  markOverrun(id: string): void {
    const s = this.byId(id);
    if (s) this.becomeOverrun(s);
  }

  activeCount(): number { return this.strayings.length; }
  cooldownRemaining(): number { return this.cooldownLeft; }

  /** A standing call keeps its ground restless; a marching one doubly so.
   *  The feral hold stirs less — the fight is over, only the texture holds. */
  activityAt(zoneId: string): number {
    const s = this.strayings.find(x => x.zoneId === zoneId && !x.latent);
    if (!s) return 0;
    return s.phase === 'raid' ? 2 : s.phase === 'overrun' ? 0.6 : 1;
  }

  /** Read-only snapshot for the marker/omen/zone-info sources. */
  peek(): ReadonlyArray<{ id: string; zoneId: string; x: number; y: number; phase: StrayingPhase; latent: boolean; age: number; returned: number; converted: number; straysLeft: number }> {
    return this.strayings.map(s => ({
      id: s.id, zoneId: s.zoneId, x: s.coord.x, y: s.coord.y, phase: s.phase,
      latent: !!s.latent, age: s.age, returned: s.returned, converted: s.converted,
      straysLeft: s.straysLeft,
    }));
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  snapshot(): unknown {
    return {
      strayings: this.strayings.map(s => ({ ...s, coord: { ...s.coord } })),
      cooldownLeft: this.cooldownLeft,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const raw = snap as { strayings?: unknown[]; cooldownLeft?: unknown; seq?: unknown } | null;
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.seq === 'number' && Number.isFinite(raw.seq)) this.seq = Math.max(this.seq, Math.floor(raw.seq));
    if (typeof raw.cooldownLeft === 'number' && Number.isFinite(raw.cooldownLeft)) this.cooldownLeft = Math.max(0, raw.cooldownLeft);
    if (!Array.isArray(raw.strayings)) return;
    const num = (v: unknown, def: number, min = 0): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : def;
    const phases: StrayingPhase[] = ['gathering', 'raid', 'relieved', 'overrun'];
    this.strayings = [];
    for (const r of raw.strayings) {
      const s = r as Partial<ActiveStraying> | null;
      if (!s || typeof s.id !== 'string' || typeof s.zoneId !== 'string') continue;
      if (!s.coord || ![s.coord.x, s.coord.y].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
      this.strayings.push({
        id: s.id, zoneId: s.zoneId, coord: { x: s.coord.x, y: s.coord.y },
        phase: phases.includes(s.phase as StrayingPhase) ? s.phase as StrayingPhase : 'gathering',
        staged: !!s.staged,
        straysLeft: num(s.straysLeft, 0), returned: num(s.returned, 0),
        converted: num(s.converted, 0), lost: num(s.lost, 0),
        callersLeft: num(s.callersLeft, 0),
        clock: num(s.clock, 0), absentClock: num(s.absentClock, this.cfg.absentResolveSec[0]),
        age: num(s.age, 0),
        ...(s.latent ? { latent: true } : {}),
        // A DEV pin is a live-session probe, never a saved fact.
      });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    this.strayings = this.strayings.filter(s => has(s.zoneId));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: settle a call on the given zone immediately — PINNED (it never
   *  absent-resolves; resolving it consumes no reprieve). Skips the biome law
   *  on purpose (forcing the scene onto a test meadow is the point) but never
   *  double-seats a zone. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || this.strayings.some(s => s.zoneId === zoneId)) return false;
    this.strayings.push(this.mint(z, /* pinned */ true));
    return true;
  }

  // --- internals -------------------------------------------------------------

  private byId(id: string): ActiveStraying | undefined {
    return this.strayings.find(x => x.id === id);
  }

  /** Strays exhausted below the march threshold: whatever the bell holds, it
   *  isn't enough — the call breaks (relief; the engine performs the beat). */
  private checkExhausted(s: ActiveStraying): void {
    if (s.phase === 'gathering' && s.staged && s.straysLeft <= 0 && s.converted < this.cfg.raidAt) {
      s.phase = 'relieved';
    }
  }

  private becomeOverrun(s: ActiveStraying): void {
    // Any heads still loose are lost with the fold.
    s.lost += s.straysLeft;
    s.straysLeft = 0;
    s.phase = 'overrun';
    s.clock = this.cfg.overrunHoldSec;
  }

  /** Remove call #i; a RELIEVED fold buys the reprieve (dev pins never do). */
  private finish(i: number, skipCooldown: boolean): void {
    this.strayings.splice(i, 1);
    if (!skipCooldown && this.cfg.resolveCooldownSeconds) {
      this.cooldownLeft = this.rng.range(
        this.cfg.resolveCooldownSeconds[0], this.cfg.resolveCooldownSeconds[1]);
    }
  }

  private tryIgnite(view: OverlayView): void {
    const taken = new Set(this.strayings.map(s => s.zoneId));
    const z = pickSeat(view, {
      event: this.id, ...this.cfg.seat,
      filter: n => !taken.has(n.id)
        && !!n.biome && this.cfg.biomes.includes(n.biome)
        && n.level <= this.cfg.levelMax,
    }, this.rng);
    if (!z) return;
    const s = this.mint(z);
    if ((this.cfg.latentOnUnknown ?? true)
      && !view.visited.has(z.id) && !view.surveyed.has(z.id)) s.latent = true;
    this.strayings.push(s);
  }

  private mint(z: ZoneDef, pinned?: boolean): ActiveStraying {
    return {
      id: `straying_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      phase: 'gathering', staged: false,
      straysLeft: 0, returned: 0, converted: 0, lost: 0, callersLeft: 0,
      clock: 0,
      absentClock: this.rng.range(this.cfg.absentResolveSec[0], this.cfg.absentResolveSec[1]),
      age: 0,
      pinned,
    };
  }
}

// --- map markers + omen + zone-info (registered on import) --------------------

registerMarkerSource((world: World): MapMarker[] => {
  const sf = world.sim.strayField;
  if (!sf) return [];
  return sf.peek().filter(s => !s.latent).map(s => ({
    id: `straying-${s.id}`, coord: { x: s.x, y: s.y },
    glyph: '🔔', fill: '#1c180e', stroke: BELL_GOLD, text: '#f0e4c0', r: 7,
    title: s.phase === 'overrun' ? 'A lost fold — the fields run feral here'
      : s.phase === 'raid' ? 'THE BELL TURNS — the changed march on the steading'
        : 'The fold strays here — a bell calls it away',
    fog: 'always', z: 16,
  }));
});

// A LATENT call murmurs instead of marking: the bell heard {bearing} of here,
// aging wider until someone follows it.
registerOmenSource((world: World) => {
  const sf = world.sim.strayField;
  const om = sf?.surge().omen;
  if (!sf || !om) return [];
  return sf.peek().filter(s => s.latent).map(s => ({
    id: `straying-${s.id}`, at: { x: s.x, y: s.y }, zoneId: s.zoneId,
    color: sf.surge().color ?? BELL_GOLD,
    lines: om.lines, whisper: om.whisper, reveal: om.reveal,
    widenPerMin: om.widenPerMin, age: s.age,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const sf = world.sim.strayField;
  const info = sf?.strayingOn(zoneId);
  if (!sf || !info) return [];
  const detail = info.phase === 'overrun'
    ? 'the fold is broken — the Chattel range this ground until it settles'
    : info.phase === 'raid'
      ? `the changed march on the steading — break them (${info.converted} gone to the bell)`
      : `walk the strays home before the bell takes them — ${info.straysLeft} loose · ${info.returned} home · ${info.converted} gone`;
  return [{
    kind: 'event', icon: '🔔', color: info.color, label: 'The Straying',
    detail,
    z: 15,
  }];
});
