// ---------------------------------------------------------------------------
// WISPLIGHT FIELD — the marsh's beckoning lights (pure overlay).
//
// Every so often a HANDFUL OF LIGHTS settles on some stretch of fen: still,
// neutral, unkillable marsh-lamps waiting in the reeds. Walk into one and it
// KINDLES — it rises and wanders a pre-drawn route, and everything near its
// glow FLOURISHES (the emboldened blessing: the mire's own kin fight harder
// under the light — the danger the event sells). At the route's end (or the
// wander clock's, whichever comes first) the light turns PURPOSEFUL: it
// drawls toward the strongest body it can find and pours itself IN — the
// possession seam's third consumer (riderRefusal: one law for what can be
// entered, per-rider policy on top). The ridden host is transformed by its
// light's KIND — a shield of cold fire, a wreath of flame, a grave-blessing —
// each kind one data row: ride status, level-computed defense gifts, grafted
// skills, an epithet. Break the host and the drovers of the fen pay nothing —
// but the light's hoard does (xp + gems), and the Vault counts the act.
//
// Unattended, the lights still work: an absent die lets kindled lights find
// hosts (or gutter out) while nobody watches, and a ridden champion waits one
// long clock before the light grows tired and departs. Standing lights are
// PATIENT — found ground keeps its lights until the die sweeps the event —
// and an unfound seat settles LATENT with a widening omen (the haunting's
// dormancy-until-found law). The event borrows the marsh, never owns it.
//
// PURE of the engine: owns the settle/slot/absent lifecycle; the engine reads
// wisplightOn() to stage the concrete scene (the standing lights, the wander,
// the aura, the ride) and reports every light's fate back through the note*()
// calls. Seated through the seat fabric (world/seats.ts).
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
const BOG_LIGHT = '#b8f0a0'; // the marsh_wisp doodad's own glow — one hue for the event

/** ONE WISP KIND — a whole ride as data. Add a row (+ its status) and a new
 *  color of light walks the fen with its own gift. */
export interface WispKindRow {
  id: string;
  /** Weighted roll at stage time (presence-banded like any spawn table). */
  weight: number;
  presence?: PackTableEntry['presence'];
  /** The light's BODY (a MonsterDef — untargetable/invulnerable at mint). */
  monster: string;
  /** The host's mark + texture mods (a StatusDef id — long-lived, beneficial). */
  rideStatus: string;
  /** Prefixed onto the host's name: 'Palelit Bog Dweller'. */
  epithet: string;
  /** The ride's announcement line. */
  line: string;
  /** Level-computed FLAT defense gifts worn as a sheet source on the host
   *  ([base, perLevel] — computed at ride time, so a level-40 host's shield
   *  is a level-40 shield; the 'more'-source lesson, applied). The kind's
   *  ride status carries the PERCENTAGE half that scales these. */
  grant?: { es?: [number, number]; armor?: [number, number] };
  /** Real skills grafted onto the host's kit (ordinary SkillInstances — a
   *  player who later possesses the host inherits them on the borrowed bar,
   *  by construction). */
  grantSkills?: string[];
}

/** A light's whole life, one word at a time. 'slain' and 'guttered' are the
 *  terminal pair — every slot ends in one of them, and the event resolves
 *  when the last slot does. */
export type WispSlotState = 'standing' | 'kindled' | 'ridden' | 'slain' | 'guttered';

export interface WispSlot {
  kind: string;
  state: WispSlotState;
  /** Pinned when the ride lands (or when a deferred absent-ride is staged):
   *  re-entry re-mints THIS def if the body itself is gone. */
  hostDef?: string;
}

/** The whole wisplight mechanic as data — every number a knob. */
export interface WisplightSurge {
  /** Per-STEP chance a fresh gathering settles (gated by pressure + cap). */
  igniteChance: number;
  maxConcurrent: number;
  /** WHERE the lights gather (the seat fabric). */
  seat: SeatTuning;
  /** THE FEN LAW: the biomes lights may gather on — a list, never a
   *  hardcode (a harsher tuning could add 'gloamwood' hollows or 'caul'). */
  biomes: string[];
  /** Optional depth cap; absent = the whole fen, every band. */
  levelMax?: number;
  latentOnUnknown?: boolean;
  omen?: { whisper: number; reveal?: number; widenPerMin?: number; lines: string[] };

  // --- the concrete scene (engine-staged while a player stands the ground) ---
  /** Lights gathered when the scene stages (rolled). */
  wisps: [number, number];
  /** THE KINDS — the event's whole variety table. */
  kinds: WispKindRow[];
  /** A light never waits underfoot: min distance from the arrival. */
  standMinDist: number;
  /** THE TOUCH: a seat this close kindles a standing light. */
  kindleRadius: number;
  /** The pre-drawn patrol: waypoint count + segment length + heading jitter.
   *  edgeMargin keeps waypoints off the arena's border band (live QA watched
   *  a light press the rim forever over a margin-60 waypoint); stallSec is
   *  the no-progress insurance — a light that gains no ground on a waypoint
   *  for this long loses interest and drifts for the next one. */
  route: { points: [number, number]; segLen: [number, number]; jitterDeg: number; edgeMargin: number; stallSec: number };
  /** The wander clock (rolled per light) — route's end or clock's end,
   *  whichever comes first, turns the light purposeful. */
  wanderSec: [number, number];
  /** Wheel paces (fractions of the body's own stride). */
  wanderPace: number;
  seekPace: number;
  /** The seek: give-up clock, scan radius, contact radius. */
  seekSec: number;
  seekRadius: number;
  rideRadius: number;
  /** THE FLOURISH: the aura pulsed along the walk. */
  aura: { radius: number; status: string; pulseSec: number };
  /** THE BLOOM TRAIL: little lights budded along the walked path, drying on
   *  their own (Doodad.evap). null = no trail. */
  bloom: { kind: string; every: number; radius: [number, number]; dwell: [number, number]; rate: number; max: number } | null;
  /** THE STRONGEST-HOST SCORE: rarity weights (0 refuses a tier outright),
   *  level weight, the wisp-touched preference, and tag refusals — the
   *  rider's OWN policy over the seam's one enterable-body law. */
  seek: { rarity: Record<string, number>; levelWeight: number; emboldenedMul: number; denyTags: string[] };
  /** Host level → grafted-skill level: 1 + floor((lvl-1)/div). */
  grantSkillLevelDiv: number;

  // --- the abstract clock (nobody watching — the lights still work) ----------
  /** Seconds (rolled) before an unattended gathering settles itself. */
  absentResolveSec: [number, number];
  /** Each kindled light's die at that settling: ride, or gutter. */
  absentRideChance: number;
  /** How long a ridden champion waits unattended before the light departs. */
  hostHoldSec: number;
  /** Reprieve after a resolved gathering before a fresh one may settle. */
  resolveCooldownSeconds?: [number, number];

  reward: {
    /** Per kindled light (the touch pays a little). */
    kindleXp: number;
    /** The host bounty: xpBase + xpPerLevel × zone level, plus gems. */
    xpBase: number; xpPerLevel: number; gems: number;
  };
  color?: string;
}

/** What the engine reads to stage/tick the scene in a gathered zone. */
export interface WisplightInfo {
  id: string;
  staged: boolean;
  slots: ReadonlyArray<Readonly<WispSlot>>;
  standing: number;
  kindled: number;
  ridden: number;
  slain: number;
  guttered: number;
  color: string;
  age: number;
}

interface ActiveWisplight {
  id: string;
  zoneId: string;
  coord: MapCoord;
  staged: boolean;
  slots: WispSlot[];
  /** The absent-settling timer — frozen while the player stands the zone;
   *  re-rolled fresh each departure. */
  absentClock: number;
  /** The first absent expiry rolled the ride die; the second sweeps. */
  absentRolled: boolean;
  wasPresent: boolean;
  age: number;
  latent?: boolean;
  /** DEV: a pinned gathering never absent-resolves, consumes no cooldown. */
  pinned?: boolean;
}

const TERMINAL: ReadonlySet<WispSlotState> = new Set(['slain', 'guttered']);

/** The kind row behind a slot (engine + probe convenience). */
export function wispKindOf(cfg: WisplightSurge, id: string): WispKindRow | undefined {
  return cfg.kinds.find(k => k.id === id);
}

export class WisplightField implements WorldOverlay {
  readonly id = 'wisplight';
  /** Durable: a standing gathering, its slot ledger, and above all a RIDDEN
   *  champion must survive a relaunch — a light that forgot its host would
   *  break the come-back-and-fight promise. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Wisplights';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: WisplightSurge;
  private lights: ActiveWisplight[] = [];
  private cooldownLeft = 0;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: WisplightSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    for (let i = this.lights.length - 1; i >= 0; i--) {
      const s = this.lights[i];
      s.age += dt;
      // THE LATENT GATHERING: seated on unknown ground it waits — clock
      // frozen, invisible — and RISES the moment its ground is known.
      if (s.latent) {
        if (view.visited.has(s.zoneId) || view.surveyed.has(s.zoneId)) s.latent = false;
        else continue;
      }
      const present = view.currentZoneId === s.zoneId;
      if (present) {
        s.wasPresent = true;
      } else if (s.wasPresent) {
        // Departure re-arms the absent clock fresh (one draw per leave).
        s.wasPresent = false;
        s.absentRolled = false;
        s.absentClock = this.rng.range(this.cfg.absentResolveSec[0], this.cfg.absentResolveSec[1]);
      }
      // THE ABSENT SETTLING: unattended, the lights still do their work —
      // and a risen-but-never-visited gathering settles too (an empty slot
      // roll resolves it quietly), so no gathering holds the cap forever.
      if (!present && !s.pinned) {
        s.absentClock -= dt;
        if (s.absentClock <= 0) {
          if (!s.absentRolled) {
            // First expiry: every kindled light rolls its die — it finds a
            // host out there (deferred: the def rolls at next staging), or
            // it gutters out over the water.
            s.absentRolled = true;
            for (const slot of s.slots) {
              if (slot.state !== 'kindled') continue;
              slot.state = this.rng.chance(this.cfg.absentRideChance) ? 'ridden' : 'guttered';
            }
            if (s.slots.some(x => x.state === 'ridden')) {
              // A champion stands somewhere in the reeds: the light waits
              // one long clock for someone to come and see.
              s.absentClock = this.cfg.hostHoldSec;
            } else {
              // Nothing walks and nothing waits: the standing lights sink
              // back into the mire and the gathering ends.
              for (const slot of s.slots) if (!TERMINAL.has(slot.state)) slot.state = 'guttered';
              this.finish(i, s.pinned ?? false);
              continue;
            }
          } else {
            // Second expiry: the light grows tired of waiting — every
            // remaining slot gutters and the gathering ends. (A host body
            // the zone remembers keeps its gifts; the bookkeeping ends.)
            for (const slot of s.slots) if (!TERMINAL.has(slot.state)) slot.state = 'guttered';
            this.finish(i, s.pinned ?? false);
            continue;
          }
        }
      }
    }
    // IGNITION — fresh lights gather on some stretch of fen, never during
    // the reprieve a resolved gathering bought.
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.cooldownLeft <= 0
        && this.lights.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* lights gather on standing ground only */ }

  /** The lights bias no tables — the scene is authored, the flourish is a
   *  status, and the ridden champion is one body, not a population. */
  affectSpawns(_zone: ZoneDef): SpawnBias { return NO_BIAS; }

  renderMap(): MapLayer {
    let over = '';
    for (const s of this.lights) {
      if (s.latent) continue; // a latent gathering paints nothing
      const col = this.cfg.color ?? BOG_LIGHT;
      const x = s.coord.x.toFixed(1), y = s.coord.y.toFixed(1);
      const ridden = s.slots.some(x2 => x2.state === 'ridden');
      const kindled = s.slots.some(x2 => x2.state === 'kindled');
      if (ridden && !kindled) {
        // A champion waits: a steady ring, no breath — the walk is over.
        over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${col}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="3 3"/>`;
      } else {
        // The lights breathe — quicker once one is walking.
        const dur = kindled ? '1.5s' : '2.8s';
        over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="1.6" stroke-opacity="0.7">`
          + `<animate attributeName="stroke-opacity" values="0.15;0.7;0.15" dur="${dur}" repeatCount="indefinite"/></circle>`;
      }
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): WisplightSurge { return this.cfg; }

  /** The gathering on this zone, if any (a latent one reads as nothing). */
  wisplightOn(zoneId: string): WisplightInfo | null {
    const s = this.lights.find(x => x.zoneId === zoneId && !x.latent);
    if (!s) return null;
    const count = (st: WispSlotState): number => s.slots.filter(x => x.state === st).length;
    return {
      id: s.id, staged: s.staged,
      slots: s.slots,
      standing: count('standing'), kindled: count('kindled'), ridden: count('ridden'),
      slain: count('slain'), guttered: count('guttered'),
      color: this.cfg.color ?? BOG_LIGHT, age: s.age,
    };
  }

  /** The engine staged the concrete scene: the kinds are rolled ONCE. */
  noteStaged(id: string, kinds: string[]): void {
    const s = this.byId(id);
    if (!s || s.staged) return;
    s.staged = true;
    s.slots = kinds.map(k => ({ kind: k, state: 'standing' as WispSlotState }));
  }

  /** A seat's touch woke slot #i — it walks now. */
  noteKindled(id: string, slot: number): void {
    const s = this.byId(id);
    const x = s?.slots[slot];
    if (!s || !x || x.state !== 'standing') return;
    x.state = 'kindled';
  }

  /** Slot #i's light poured into a host (the ride landed — or a deferred
   *  absent-ride finally staged its body). Pins the def for re-entry. */
  noteRidden(id: string, slot: number, hostDef: string): void {
    const s = this.byId(id);
    const x = s?.slots[slot];
    if (!s || !x || TERMINAL.has(x.state)) return;
    x.state = 'ridden';
    x.hostDef = hostDef;
  }

  /** Slot #i's ridden host fell — the bounty beat is the engine's. */
  noteHostSlain(id: string, slot: number): void {
    const s = this.byId(id);
    const x = s?.slots[slot];
    if (!s || !x || x.state !== 'ridden') return;
    x.state = 'slain';
    this.resolveIfDone(s);
  }

  /** Slot #i's light gave up — found nothing to ride, or was left too long. */
  noteGuttered(id: string, slot: number): void {
    const s = this.byId(id);
    const x = s?.slots[slot];
    if (!s || !x || TERMINAL.has(x.state)) return;
    x.state = 'guttered';
    delete x.hostDef;
    this.resolveIfDone(s);
  }

  activeCount(): number { return this.lights.length; }
  cooldownRemaining(): number { return this.cooldownLeft; }

  /** Walking lights stir the ground; a waiting champion less so; standing
   *  lights barely at all (they are patient, and quiet). */
  activityAt(zoneId: string): number {
    const s = this.lights.find(x => x.zoneId === zoneId && !x.latent);
    if (!s) return 0;
    if (s.slots.some(x => x.state === 'kindled')) return 1.2;
    if (s.slots.some(x => x.state === 'ridden')) return 0.8;
    return 0.35;
  }

  /** Read-only snapshot for the marker/omen/zone-info sources. */
  peek(): ReadonlyArray<{ id: string; zoneId: string; x: number; y: number; latent: boolean; age: number; staged: boolean; standing: number; kindled: number; ridden: number }> {
    return this.lights.map(s => ({
      id: s.id, zoneId: s.zoneId, x: s.coord.x, y: s.coord.y,
      latent: !!s.latent, age: s.age, staged: s.staged,
      standing: s.slots.filter(x => x.state === 'standing').length,
      kindled: s.slots.filter(x => x.state === 'kindled').length,
      ridden: s.slots.filter(x => x.state === 'ridden').length,
    }));
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  snapshot(): unknown {
    return {
      lights: this.lights.map(s => ({ ...s, coord: { ...s.coord }, slots: s.slots.map(x => ({ ...x })) })),
      cooldownLeft: this.cooldownLeft,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const raw = snap as { lights?: unknown[]; cooldownLeft?: unknown; seq?: unknown } | null;
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.seq === 'number' && Number.isFinite(raw.seq)) this.seq = Math.max(this.seq, Math.floor(raw.seq));
    if (typeof raw.cooldownLeft === 'number' && Number.isFinite(raw.cooldownLeft)) this.cooldownLeft = Math.max(0, raw.cooldownLeft);
    if (!Array.isArray(raw.lights)) return;
    const num = (v: unknown, def: number, min = 0): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(min, v) : def;
    const states: WispSlotState[] = ['standing', 'kindled', 'ridden', 'slain', 'guttered'];
    this.lights = [];
    for (const r of raw.lights) {
      const s = r as Partial<ActiveWisplight> | null;
      if (!s || typeof s.id !== 'string' || typeof s.zoneId !== 'string') continue;
      if (!s.coord || ![s.coord.x, s.coord.y].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
      const slots: WispSlot[] = Array.isArray(s.slots)
        ? s.slots.flatMap(x0 => {
          const x = x0 as Partial<WispSlot> | null;
          if (!x || typeof x.kind !== 'string') return [];
          return [{
            kind: x.kind,
            state: states.includes(x.state as WispSlotState) ? x.state as WispSlotState : 'standing',
            ...(typeof x.hostDef === 'string' ? { hostDef: x.hostDef } : {}),
          }];
        })
        : [];
      this.lights.push({
        id: s.id, zoneId: s.zoneId, coord: { x: s.coord.x, y: s.coord.y },
        staged: !!s.staged, slots,
        absentClock: num(s.absentClock, this.cfg.absentResolveSec[0]),
        absentRolled: !!s.absentRolled,
        wasPresent: false,
        age: num(s.age, 0),
        ...(s.latent ? { latent: true } : {}),
        // A DEV pin is a live-session probe, never a saved fact.
      });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    this.lights = this.lights.filter(s => has(s.zoneId));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: gather lights on the given zone immediately — PINNED (never
   *  absent-resolves; resolving it consumes no reprieve). Skips the biome
   *  law on purpose but never double-seats a zone. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || this.lights.some(s => s.zoneId === zoneId)) return false;
    this.lights.push(this.mint(z, /* pinned */ true));
    return true;
  }

  // --- internals -------------------------------------------------------------

  private byId(id: string): ActiveWisplight | undefined {
    return this.lights.find(x => x.id === id);
  }

  /** All slots terminal: the gathering ends (resolution buys the reprieve). */
  private resolveIfDone(s: ActiveWisplight): void {
    if (!s.staged || !s.slots.every(x => TERMINAL.has(x.state))) return;
    const i = this.lights.indexOf(s);
    if (i >= 0) this.finish(i, s.pinned ?? false);
  }

  private finish(i: number, skipCooldown: boolean): void {
    this.lights.splice(i, 1);
    if (!skipCooldown && this.cfg.resolveCooldownSeconds) {
      this.cooldownLeft = this.rng.range(
        this.cfg.resolveCooldownSeconds[0], this.cfg.resolveCooldownSeconds[1]);
    }
  }

  private tryIgnite(view: OverlayView): void {
    const taken = new Set(this.lights.map(s => s.zoneId));
    const z = pickSeat(view, {
      event: this.id, ...this.cfg.seat,
      filter: n => !taken.has(n.id)
        && !!n.biome && this.cfg.biomes.includes(n.biome)
        && (this.cfg.levelMax === undefined || n.level <= this.cfg.levelMax),
    }, this.rng);
    if (!z) return;
    const s = this.mint(z);
    if ((this.cfg.latentOnUnknown ?? true)
      && !view.visited.has(z.id) && !view.surveyed.has(z.id)) s.latent = true;
    this.lights.push(s);
  }

  private mint(z: ZoneDef, pinned?: boolean): ActiveWisplight {
    return {
      id: `wisplight_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      staged: false, slots: [],
      absentClock: this.rng.range(this.cfg.absentResolveSec[0], this.cfg.absentResolveSec[1]),
      absentRolled: false,
      wasPresent: false,
      age: 0,
      pinned,
    };
  }
}

// --- map markers + omen + zone-info (registered on import) --------------------

registerMarkerSource((world: World): MapMarker[] => {
  const wf = world.sim.wisplightField;
  if (!wf) return [];
  return wf.peek().filter(s => !s.latent).map(s => ({
    id: `wisplight-${s.id}`, coord: { x: s.x, y: s.y },
    glyph: '✨', fill: '#101c10', stroke: BOG_LIGHT, text: '#e8ffd8', r: 7,
    title: s.ridden > 0 && s.kindled === 0 && s.standing === 0
      ? 'A ridden thing waits in the fen — the light found a body'
      : s.kindled > 0 ? 'A light walks the fen — the mire flourishes around it'
        : 'Lights wait in the reeds here — touch one and see',
    fog: 'always', z: 16,
  }));
});

// A LATENT gathering murmurs instead of marking: lights heard {bearing} of
// here, aging wider until someone follows them.
registerOmenSource((world: World) => {
  const wf = world.sim.wisplightField;
  const om = wf?.surge().omen;
  if (!wf || !om) return [];
  return wf.peek().filter(s => s.latent).map(s => ({
    id: `wisplight-${s.id}`, at: { x: s.x, y: s.y }, zoneId: s.zoneId,
    color: wf.surge().color ?? BOG_LIGHT,
    lines: om.lines, whisper: om.whisper, reveal: om.reveal,
    widenPerMin: om.widenPerMin, age: s.age,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const wf = world.sim.wisplightField;
  const info = wf?.wisplightOn(zoneId);
  if (!wf || !info) return [];
  const live = info.standing + info.kindled + info.ridden;
  const detail = info.ridden > 0 && info.kindled === 0 && info.standing === 0
    ? `the light found a body — break the ridden thing (${info.ridden} waiting)`
    : info.kindled > 0
      ? `a light walks the fen — follow it, or fight what flourishes (${info.standing} waiting · ${info.kindled} walking · ${info.ridden} ridden)`
      : `lights wait in the reeds — ${live} of them, patient`;
  return [{
    kind: 'event', icon: '✨', color: info.color, label: 'The Wisplight',
    detail,
    z: 15,
  }];
});
