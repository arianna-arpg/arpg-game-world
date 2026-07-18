// ---------------------------------------------------------------------------
// THE TRAPWORKS FABRIC — triggers wired to the world's own hazards, as data.
//
// A TRAPWORK is a TRIGGER (a pressure plate underfoot, a tripline across a
// hall) wired to EFFECT rows. The fabric deliberately owns NO hazard of its
// own — every effect drives an EXISTING fabric through the narrow TrapHost:
//
//   'lanes'    — arm/disarm/toggle track lanes by tag (the wall of buzzsaws
//                that appears when the plate clicks; setTracksArmed).
//   'boulder'  — loose a ONE-SHOT track lane from cradle to wall (the
//                Indiana-Jones roll: mode 'once', bornAt = the rumble,
//                ownerId = the presser — crush credit flows to whoever
//                sprang it; tracksEnsure).
//   'volley'   — a fan of dart once-lanes across authored rays, births
//                staggered so the rake telegraph (the track layer's pending
//                stroke) lights the room BEFORE the bolts fly.
//   'collapse' — false floor: after a crumble telegraph, the named cells
//                become fall-able pit doodads and the pitfall fabric owns
//                everything after (descend mints the hollow below, grasp
//                law at the lip, swallowed hostiles credit the presser).
//
// The registry is OPEN (registerTrapEffect) — a package adds an effect kind
// without engine edits, and handlers speak only TrapHost (the PuzzleHost
// discipline: kinds never import World; a stub host unit-probes them).
//
// DOCTRINE — the dead build no allegiance: unlike the Winter King's court
// (ownerTag lanes + notFactions spares), an ancient mechanism's payloads
// spare NO faction by default. The wardens survive their own halls the
// honest way — imminentThreatTo reads the blades and their feet keep them
// out of the grooves — and a player who baits a pack across a plate has
// discovered the intended play, not an exploit.
//
// This module is a PURE LEAF (the tracks.ts idiom): types, config, trigger
// geometry, and the effect registry. The engine half (sweep, spring, host
// facade, wire) lives in World; the drawn half (hidden-plate tells) in
// render/vis/trapLayer.ts. Docs: docs/engine/trapworks.md.
// ---------------------------------------------------------------------------

import type { Vec2 } from '../core/math';
import type { TrackSpec } from './tracks';

// --- config ----------------------------------------------------------------

export const TRAPWORK_CFG = {
  /** Placement-stream salt (distinct from every other fabric's salt). */
  salt: 0x51ab27,
  /** Trigger sweep cadence, seconds (the throng-scan beat). */
  sweepEvery: 0.12,
  /** Default plate press disc radius, px. */
  plateRadius: 16,
  /** Default tripline half-width, px. */
  triplineWidth: 10,
  /** How much of a body's own radius pads a press (feet, not shoulders —
   *  you step ON a plate; brushing past its rim is not a press). */
  pressPad: 0.4,
  /** False-floor shiver seconds before the drop (dash out!). */
  crumbleSec: 0.7,
  /** Cradle rumble seconds before a loosed boulder rolls. */
  boulderDelay: 0.55,
  /** Rake-flash seconds before a volley's bolts fly. */
  volleyDelay: 0.5,
  /** Per-ray birth stagger inside one volley, seconds. */
  volleyStagger: 0.12,
  /** Default loosed-boulder lane speed, px/s. */
  boulderSpeed: 235,
  /** Default dart lane speed, px/s (the blowdart band). */
  dartSpeed: 520,
  /** Sanity ceiling: trapworks per zone (validation + ensure guard). */
  maxPerZone: 14,
  /** A hidden trigger's tell fades in inside this range of a hero, px —
   *  the keen eye spots the odd flagstone; at a sprint you never will. */
  revealNear: 110,
  /** Spring accent (flash + click text) when a spec names no color. */
  springColor: '#e8b45a',
} as const;

// --- triggers --------------------------------------------------------------

/** How a trapwork senses. Plate = a press disc underfoot; tripline = a
 *  capsule across a way. The who/faction/airborne grammar mirrors
 *  TrackPayload's filters — one vocabulary for "whom the world touches". */
export interface TrapTrigger {
  kind: 'plate' | 'tripline';
  /** plate: press disc center + radius (default TRAPWORK_CFG.plateRadius). */
  at?: Vec2;
  r?: number;
  /** tripline: the crossed segment + half-width. */
  a?: Vec2;
  b?: Vec2;
  w?: number;
  /** Who can spring it (default 'any' — a blundering pack springs plates
   *  too, and baiting one across the floor is the intended play). */
  who?: 'any' | 'player' | 'enemy';
  /** The payload faction grammar, reused: these never spring it… */
  notFactions?: string[];
  /** …or only these do. */
  factions?: string[];
  /** Airborne bodies pass over (default true — leap the plate). */
  sparesAirborne?: boolean;
  /** Dormant planted neutrals never press (default true). */
  sparesDormant?: boolean;
}

/** Account-ledger key: the LOCAL HERO pressed a trapwork trigger with their
 *  own feet (world.ts springTrapwork stamps it when the presser is the local
 *  hero; merged into the account on death). THE HARD LESSON seam: discovery
 *  gates read it — the Trapper surfaces in the Vault because the floor
 *  clicked under YOU once (unlocks.ts ClassBundleDef.discover). A raw tally:
 *  "spring 20 traps and live" content reads the same key. */
export const LEDGER_TRAP_SPRUNG = 'trap_sprung';

// --- effects ---------------------------------------------------------------

/** One effect row — `kind` picks a registered handler; the rest is that
 *  kind's own grammar. Open on purpose (packages add kinds). */
export interface TrapEffectRow { kind: string; [k: string]: unknown }

/** Arm/disarm/toggle every track lane wearing each tag. */
export interface LanesEffectRow extends TrapEffectRow {
  kind: 'lanes'; tags: string[]; set: 'on' | 'off' | 'toggle';
}
/** Loose a one-shot lane from cradle to wall (crush credit = the presser). */
export interface BoulderEffectRow extends TrapEffectRow {
  kind: 'boulder'; from: Vec2; to: Vec2; rider?: string; speed?: number; delay?: number;
}
/** A fan of dart once-lanes across authored rays. */
export interface VolleyEffectRow extends TrapEffectRow {
  kind: 'volley'; rays: { a: Vec2; b: Vec2 }[]; rider?: string; speed?: number;
  delay?: number; stagger?: number;
}
/** False floor: the named cells become fall-able pit doodads after a
 *  crumble telegraph; the pitfall fabric owns everything after. */
export interface CollapseEffectRow extends TrapEffectRow {
  kind: 'collapse'; cells: { x: number; y: number; r?: number }[]; delay?: number;
}

// --- specs -----------------------------------------------------------------

/** One authored trapwork. A generation pass, a ZoneTheme row, or a runtime
 *  ensure all speak this same spec (the TrackSpec discipline). */
export interface TrapworkSpec {
  /** Stable handle (auto-assigned at placement when absent). Once-lanes an
   *  effect looses wear this as their tag. */
  id?: string;
  trigger: TrapTrigger;
  effects: TrapEffectRow[];
  /** Seconds until the trigger re-arms (absent/0 = single-use: sprung is
   *  final for this visit — zone re-generation resets, the collapse
   *  transience doctrine). */
  rearm?: number;
  /** Near-indistinguishable trigger: the tell doodad draws faint and only
   *  resolves inside TRAPWORK_CFG.revealNear (render/vis/trapLayer.ts). */
  hidden?: boolean;
  /** Tell doodad kind planted at the trigger ('' = none; default
   *  'ruin_plate' / 'ruin_plate_hidden' for plates, none for triplines). */
  visKind?: string;
  /** Spoken once on spring ("the floor clicks —"). */
  announce?: string;
  /** Spring accent color (flash/rake fallback). */
  color?: string;
}

export interface PlacedTrapwork {
  spec: TrapworkSpec;
  id: string;
  state: 'armed' | 'sprung';
  /** When a sprung rearming trigger re-arms (Infinity = single-use). */
  rearmAt: number;
  /** Zone-clock second of the last spring (the co-op mirror's anchor). */
  sprungAt: number;
  springs: number;
}

// --- the host contract -----------------------------------------------------

/** The narrow world surface effects drive. Handlers never import World —
 *  a stub host unit-probes every registered kind (the PuzzleHost law). */
export interface TrapHost {
  /** The zone clock (world.time). */
  time: number;
  /** Ensure lanes (World.tracksEnsure — lint + rider cap apply). */
  tracksEnsure(specs: TrackSpec[]): void;
  /** Flip tagged lanes (World.setTracksArmed). */
  setTracksArmed(tag: string, armed: boolean): void;
  /** Is any lane wearing this tag currently armed? (toggle's read.) */
  laneArmed(tag: string): boolean;
  /** False-floor drop: crumble telegraph, then fall-able pit doodads at the
   *  cells, then the standing-body swallow pass with presser credit. The
   *  visualOnly half is the co-op client mirror (doodads + FX, no routing). */
  collapseFloor(cells: { x: number; y: number; r?: number }[], delaySec: number,
    presserId?: number, visualOnly?: boolean): void;
  /** Remove tell/decor doodads of a kind near a point (the cradle empties
   *  when the boulder rolls). */
  clearDoodads(kind: string, at: Vec2, r: number): void;
  /** A flash ring (the one FX stream — rides the co-op wire itself). */
  fx(at: Vec2, radius: number, color: string): void;
  /** Run later on the zone clock (host: the update drain; client: the 20 Hz
   *  reconcile drain — mirrors use it to land on the host's own schedule). */
  defer(sec: number, run: () => void): void;
}

export type TrapEffectHandler = (
  host: TrapHost, trap: PlacedTrapwork, row: TrapEffectRow, presserId?: number,
) => void;

/** A registered effect kind. `spring` runs host-side with full authority;
 *  `mirror` (optional) is the IDEMPOTENT visual half a co-op client replays
 *  when the 20 Hz trap-state channel shows the spring — doodads and FX
 *  only, damage/credit stay host-side. Effects that express through lanes
 *  need no mirror at all: the laneArm/laneOnce channels carry them. */
export interface TrapEffectDef { spring: TrapEffectHandler; mirror?: TrapEffectHandler }

const TRAP_EFFECTS: Record<string, TrapEffectDef> = {};

export function registerTrapEffect(kind: string, def: TrapEffectDef): void {
  if (TRAP_EFFECTS[kind]) console.warn(`[trapworks] re-registering effect '${kind}' — overriding`);
  TRAP_EFFECTS[kind] = def;
}

export function trapEffect(kind: string): TrapEffectDef | undefined { return TRAP_EFFECTS[kind]; }
export function trapEffectKinds(): string[] { return Object.keys(TRAP_EFFECTS); }

// --- pure trigger geometry -------------------------------------------------

/** Does a body at (x, y, radius) press this trigger? Feet, not shoulders:
 *  the body's own radius counts only TRAPWORK_CFG.pressPad of itself — you
 *  step ON a plate; brushing its rim is not a press. Pure — the sweep, the
 *  probe, and any AI plate-read all ask the same function. */
export function trapTriggerHit(t: TrapTrigger, x: number, y: number, radius: number): boolean {
  const pad = radius * TRAPWORK_CFG.pressPad;
  if (t.kind === 'plate') {
    if (!t.at) return false;
    const r = (t.r ?? TRAPWORK_CFG.plateRadius) + pad;
    const dx = x - t.at.x, dy = y - t.at.y;
    return dx * dx + dy * dy <= r * r;
  }
  if (!t.a || !t.b) return false;
  const w = (t.w ?? TRAPWORK_CFG.triplineWidth) + pad;
  const abx = t.b.x - t.a.x, aby = t.b.y - t.a.y;
  const len2 = abx * abx + aby * aby;
  const f = len2 > 1e-6 ? Math.min(1, Math.max(0, ((x - t.a.x) * abx + (y - t.a.y) * aby) / len2)) : 0;
  const px = t.a.x + abx * f, py = t.a.y + aby * f;
  const dx = x - px, dy = y - py;
  return dx * dx + dy * dy <= w * w;
}

/** The trigger's anchor point (tell placement, reveal range, map reads). */
export function trapAnchor(t: TrapTrigger): Vec2 {
  if (t.kind === 'plate') return t.at ?? { x: 0, y: 0 };
  const a = t.a ?? { x: 0, y: 0 }, b = t.b ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// --- validation ------------------------------------------------------------

/** Physical-band lint (the lintTrackSpec discipline). Empty = sane. */
export function lintTrapworkSpec(spec: TrapworkSpec, where: string): string[] {
  const out: string[] = [];
  const t = spec.trigger;
  if (!t) { out.push(`${where}: no trigger`); return out; }
  if (t.kind === 'plate' && !t.at) out.push(`${where}: plate without 'at'`);
  if (t.kind === 'tripline' && (!t.a || !t.b)) out.push(`${where}: tripline needs 'a' and 'b'`);
  if (t.r !== undefined && (t.r < 6 || t.r > 90)) out.push(`${where}: plate r ${t.r} outside [6,90]`);
  if (!spec.effects?.length) out.push(`${where}: trapwork with no effects`);
  for (const e of spec.effects ?? []) {
    if (!TRAP_EFFECTS[e.kind]) out.push(`${where}: effect '${e.kind}' unregistered`);
  }
  if (spec.rearm !== undefined && (spec.rearm < 0 || spec.rearm > 300)) {
    out.push(`${where}: rearm ${spec.rearm}s outside [0,300]`);
  }
  return out;
}

// --- the core effect kinds -------------------------------------------------
// Registered here in the leaf: each speaks ONLY TrapHost, so purity holds
// and a stub host exercises them all (balance/probe_trapworks.ts).

registerTrapEffect('lanes', {
  spring(host, _trap, row) {
    const r = row as LanesEffectRow;
    for (const tag of r.tags ?? []) {
      const on = r.set === 'toggle' ? !host.laneArmed(tag) : r.set === 'on';
      host.setTracksArmed(tag, on);
    }
  },
  // No mirror: laneArm rides its own 20 Hz channel.
});

registerTrapEffect('boulder', {
  spring(host, trap, row, presserId) {
    const r = row as BoulderEffectRow;
    host.clearDoodads('boulder_cradle', r.from, 64);
    host.fx(r.from, 46, trap.spec.color ?? TRAPWORK_CFG.springColor);
    host.tracksEnsure([{
      path: [{ x: r.from.x, y: r.from.y }, { x: r.to.x, y: r.to.y }],
      mode: 'once',
      speed: r.speed ?? TRAPWORK_CFG.boulderSpeed,
      riders: [{ kind: r.rider ?? 'ruin_boulder' }],
      bornAt: host.time + (r.delay ?? TRAPWORK_CFG.boulderDelay),
      // The runway is carved at gen (the trap gen pass lays the groove);
      // no live stroke — the rake telegraph owns the pre-roll read.
      groove: true,
      ownerId: presserId,
      tag: trap.id,
    }]);
  },
  mirror(host, _trap, row) {
    // Lanes arrive via laneOnce; only the emptied cradle needs mirroring.
    const r = row as BoulderEffectRow;
    host.clearDoodads('boulder_cradle', r.from, 64);
  },
});

registerTrapEffect('volley', {
  spring(host, trap, row, presserId) {
    const r = row as VolleyEffectRow;
    const delay = r.delay ?? TRAPWORK_CFG.volleyDelay;
    const stagger = r.stagger ?? TRAPWORK_CFG.volleyStagger;
    host.tracksEnsure((r.rays ?? []).map((ray, i) => ({
      path: [{ x: ray.a.x, y: ray.a.y }, { x: ray.b.x, y: ray.b.y }],
      mode: 'once' as const,
      speed: r.speed ?? TRAPWORK_CFG.dartSpeed,
      riders: [{ kind: r.rider ?? 'ruin_dart' }],
      bornAt: host.time + delay + i * stagger,
      groove: true,           // no scored line — the rake IS the telegraph
      ownerId: presserId,
      tag: trap.id,
    })));
  },
  // No mirror: laneOnce carries the bolts to every seat.
});

registerTrapEffect('collapse', {
  spring(host, _trap, row, presserId) {
    const r = row as CollapseEffectRow;
    host.collapseFloor(r.cells ?? [], r.delay ?? TRAPWORK_CFG.crumbleSec, presserId);
  },
  mirror(host, trap, row) {
    // Land on the HOST's schedule: the host plants at sprungAt + delay; the
    // client defers the visual plant to the same clock second (collapseFloor
    // is idempotent, so the 20 Hz re-mirror is free).
    const r = row as CollapseEffectRow;
    const at = trap.sprungAt + (r.delay ?? TRAPWORK_CFG.crumbleSec);
    host.defer(Math.max(0, at - host.time), () => host.collapseFloor(r.cells ?? [], 0, undefined, true));
  },
});
