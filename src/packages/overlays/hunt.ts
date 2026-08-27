// ---------------------------------------------------------------------------
// HUNT FIELD — a roving monster-hunter event (pure overlay).
//
// One Hunt at a time. A great BEAST lurks somewhere on the charted map; the
// player finds FOOTPRINTS in zones (an in-zone dwell), which REVEAL the beast's
// lair on the world map. Travel there and the beast materializes. Bloody it past
// a health threshold and it FLEES to an adjacent zone (a flee phase on its
// brain — fast + damage-reduced, so a huge-burst player can still drop it), and
// the chase is on: it makes a few stands across zones, then a final stand.
//
// This overlay is the beast's REMEMBRANCE: it carries the beast's life fraction
// + phase across zones (the beast actor is re-spawned, health-preserved, each
// time the player enters its current zone — like the demon epicenter, but with
// state). The footprint placement, beast spawn, life sync, and migration are
// engine work the World drives off these accessors; the overlay never touches
// World. Pure, like every other field.
//
// THE WANING CLOCK (her ruling, 2026-08-05 — "a waning clock on unrevealed
// hunts only"): the hunt is one-at-a-time, so an ignored trail used to stand
// IMMORTAL and bar every future hunt for the run. Now an UNFOUND hunt — the
// player has never once READ its tracks (tracksFound 0; the lifecycle's own
// "find" is the dwell-read, the stage the config itself counts) — lapses
// QUIETLY once its clock runs out: no toast, no failure arc, no ledger trace;
// the 🐾 pin simply leaves the map and the lane frees for a future hunt. ONE
// read (or the located flag) REVEALS it and it stands forever — the clock
// freezes at its spend and never resumes (her word). THE APPROACH HOLD: the
// clock pauses while the player stands in the trail's own zone, so a hunt can
// never lapse under an active approach — which also means no live footprint
// or dress can ever be orphaned mid-visit (footprints exist only in the
// loaded zone, where the hold reigns).
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { registerBountySource } from '../../data/bountyboard';
import { FACTIONS, MONSTERS } from '../../data/monsters';
import { registerEventFront } from '../../engine/eventWeather';
import type { World } from '../../engine/world';
import { registerAttentionSource, type AttentionPoint } from '../../world/attention';
import type { MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { pickSeat, type SeatTuning } from '../../world/seats';
import { registerWeather } from '../../world/weather';
import { eventTargetable } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const HUNT_GOLD = '#d8a83a';

/** One quarry the Hunt can roll (faction → its great beast). */
export interface HuntBeast {
  faction: string;
  defId: string;
  weight: number;
  /** CHARACTER-level band this quarry may be rolled at ([min, max] inclusive;
   *  absent = any level). The pool reads as a progression — early hunts meet
   *  the river-wyrm, the deep bands keep the colossi — and if a band filter
   *  ever empties the pool the roll falls back to every valid row (a hunt
   *  never dry-fires over authored bands). */
  level?: [number, number];
  /** The LOCATED-quarry map glyph (🐗 when absent). The trail pin stays 🐾 —
   *  which beast you are tracking is the reveal's own payoff. */
  glyph?: string;
}

/** The Hunt config (tunable data on the def). */
export interface HuntSurge {
  /** Per-step base chance (×pressure) a Hunt begins when none is active. */
  triggerChance: number;
  /** The quarries it can roll (faction + beast monster id). */
  beasts: HuntBeast[];
  /** [min,max] inclusive count of times the player FINDS the tracks (incl. the
   *  first sighting) before the beast is LOCATED — each non-final find RELOCATES
   *  the trail to an adjacent zone, so the player hunts the location down. */
  trackStages: [number, number];
  /** Seconds the player must dwell by the tracks to read the trail. */
  dwellSeconds: number;
  /** WHERE the lair seats (the seat fabric, world/seats.ts): a distance
   *  envelope + known/unknown/veiled weights. The forechart mints the halo
   *  this draws from — a hunt may now open in country nobody has walked,
   *  and the trail pin leads the player out into it. */
  seat: SeatTuning;
  /** THE WANING CLOCK (unrevealed hunts only): seconds an UNFOUND trail may
   *  stand — zero reads, player elsewhere — before the hunt quietly lapses
   *  and the one-at-a-time lane frees. One track READ (or the located flag)
   *  reveals the hunt and freezes the clock forever. Absent/0 = no clock
   *  (the old immortal standing invitation, byte-identical). */
  waneSeconds?: number;
}

/** What the engine reads to materialize the beast in a zone. */
export interface HuntInfo {
  id: string;
  beastDefId: string;
  faction: string;
  color: string;
  /** The cross-zone REMEMBRANCE — life as a fraction of max. */
  lifeFrac: number;
  /** Flee phases already completed (re-spawned beast's aiPhaseIdx). */
  phaseIdx: number;
}

interface ActiveHunt {
  id: string;
  beastDefId: string;
  faction: string;
  color: string;
  lairZoneId: string;
  lairCoord: MapCoord;
  /** Where the trail/beast is NOW: while !revealed this is the current TRACK zone
   *  (it hops as the trail relocates); once revealed it's where the beast stands. */
  currentZoneId: string;
  revealed: boolean;
  /** Track-find counter: total finds before the beast is located, and how many so far. */
  tracksTotal: number;
  tracksFound: number;
  lifeFrac: number;
  phaseIdx: number;
  /** Seconds the trail has stood UNFOUND (the waning clock's spend). Ticks
   *  only while unrevealed AND the player is out of the trail's zone; frozen
   *  forever at the first read. Rides the save (no free hours on reload). */
  waneSec: number;
}

export class HuntField implements WorldOverlay {
  readonly id = 'hunt';
  /** Durable: a half-bloodied quarry mid-chase is an ARC, not weather — the
   *  remembrance (life fraction, phase, trail progress) resumes exactly. The
   *  one exception is the waning clock: a trail NOBODY ever read may lapse
   *  (quietly, lane-freeing) — but only unfound, and never underfoot. */
  readonly persistence = 'durable' as const;

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: HuntSurge;
  private hunt: ActiveHunt | null = null;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: HuntSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.tickWane(dt, view); // before ignition: a lane the clock frees may reseat this very tick
    this.acc += dt;
    const g = this.gate();
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active && !this.hunt) this.maybeIgnite(view); }
  }

  /** THE WANING CLOCK (her ruling, 2026-08-05): an UNFOUND trail wanes; a
   *  revealed hunt stands forever. THE LINE is the lifecycle's own "find" —
   *  the first track READ (advanceTrail: tracksFound 0 → 1; located subsumes
   *  it) — NOT mere zone entry: walking past unread footprints leaves the
   *  hunt unfound (the marker was always visible; the trail was never met).
   *  THE APPROACH HOLD keeps the clock paused while the player stands in the
   *  trail's own zone, so it can never lapse under an active approach — the
   *  hold protects the walk-up; only walking AWAY unread resumes the wane.
   *  The lapse is QUIET by construction: this overlay is pure (no toast, no
   *  ledger), and every visible trace (pin, spoor front) derives from peek()
   *  per read, so it all simply stops. Runs on the world's own dt (a held
   *  world doesn't tick), ungated by the package gate — a standing hunt's
   *  clock is its own; the gate governs ignition only. */
  private tickWane(dt: number, view: OverlayView): void {
    const h = this.hunt;
    if (!h) return;
    const cap = this.cfg.waneSeconds ?? 0;
    if (cap <= 0) return; // no clock authored — the immortal standing invitation
    if (h.revealed || h.tracksFound > 0) return; // found: it stands FOREVER (her word)
    if (view.currentZoneId === h.currentZoneId) return; // the approach hold
    h.waneSec += dt;
    if (h.waneSec >= cap) this.hunt = null; // the quiet lapse — the lane frees
  }

  onNodeCharted(): void { /* the hunt targets a charted lair + existing exits */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // the beast is materialized, not biased
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker source draws it

  // --- accessors the engine reads --------------------------------------------

  surge(): HuntSurge { return this.cfg; }

  /** Does the trail currently lead HERE? The track sits in exactly the current
   *  trail zone (deterministic — the player navigates to the marked zone and finds
   *  it), until it's read; relocation moves it on. Re-placement across visits is fine
   *  (the engine guards intra-visit double-placement on the live footprint object). */
  wantsTrack(zoneId: string): boolean {
    const h = this.hunt;
    return !!h && !h.revealed && h.lifeFrac > 0 && zoneId === h.currentZoneId;
  }

  /** The player read the tracks. Advance the stage counter and report whether this
   *  find RELOCATES the trail (more to follow) or LOCATES the beast (the final find).
   *  The engine chooses the adjacent zone and applies it via relocateTrack/locateBeast. */
  advanceTrail(): 'relocate' | 'locate' {
    const h = this.hunt;
    if (!h) return 'locate';
    h.tracksFound++;
    return h.tracksFound >= h.tracksTotal ? 'locate' : 'relocate';
  }

  /** The trail moves to an adjacent (engine-chosen) zone — fresh tracks await there. */
  relocateTrack(zoneId: string): void {
    if (!this.hunt) return;
    this.hunt.currentZoneId = zoneId;
  }

  /** The final find: the beast is LOCATED in an adjacent zone — hand off to the
   *  (UNCHANGED) beastIn → spawn → flee → chase → kill flow on entry. */
  locateBeast(zoneId: string): void {
    if (!this.hunt) return;
    this.hunt.currentZoneId = zoneId;
    this.hunt.revealed = true;
  }

  /** The beast info IF it currently stands in this zone (revealed + alive) — the
   *  engine spawns it from this (life-preserved). */
  beastIn(zoneId: string): HuntInfo | null {
    const h = this.hunt;
    if (!h || !h.revealed || h.lifeFrac <= 0 || h.currentZoneId !== zoneId) return null;
    return { id: h.id, beastDefId: h.beastDefId, faction: h.faction, color: h.color, lifeFrac: h.lifeFrac, phaseIdx: h.phaseIdx };
  }

  /** Sync the beast's live health into the remembrance (so damage persists). */
  setLife(frac: number): void { if (this.hunt) this.hunt.lifeFrac = clamp(frac, 0, 1); }

  /** The beast fled and reached an exit → migrate to the destination zone,
   *  preserving its health, advancing its phase. */
  migrate(toZoneId: string, phaseIdx: number): void {
    if (!this.hunt) return;
    this.hunt.currentZoneId = toZoneId;
    this.hunt.phaseIdx = phaseIdx;
  }

  /** End the hunt — killed (the quarry fell) or abandoned. */
  endHunt(): void { this.hunt = null; }

  isBeast(huntId: string): boolean { return this.hunt?.id === huntId; }

  /** A located, living beast keeps its zone restless (feeds the bloom); the
   *  quiet trail does not — tracks are a whisper, not turmoil. */
  activityAt(zoneId: string): number {
    const h = this.hunt;
    return h && h.revealed && h.lifeFrac > 0 && h.currentZoneId === zoneId ? 1 : 0;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the whole remembrance verbatim (+ the id counter, so a resumed
   *  run can never mint a colliding hunt id). No zones minted → no claims. */
  snapshot(): unknown {
    return { hunt: this.hunt ? { ...this.hunt, lairCoord: { ...this.hunt.lairCoord } } : null, seq: this.seq };
  }

  /** Rebuild tolerantly: a quarry whose beast def left the surge roster (or
   *  whose numbers don't parse) ends the hunt — a fresh one ignites on its own
   *  clock. The trail/beast zone rides verbatim; pruneZones handles culls. */
  restore(snap: unknown): void {
    const s = snap as { hunt?: unknown; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    const h = s.hunt as Partial<ActiveHunt> | null;
    this.hunt = null;
    if (!h || typeof h !== 'object') return;
    if (typeof h.id !== 'string' || typeof h.beastDefId !== 'string' || typeof h.faction !== 'string') return;
    if (!this.cfg.beasts.some(b => b.defId === h.beastDefId && b.faction === h.faction)) return;
    if (typeof h.lairZoneId !== 'string' || typeof h.currentZoneId !== 'string') return;
    if (!h.lairCoord || ![h.lairCoord.x, h.lairCoord.y].every(n => typeof n === 'number' && Number.isFinite(n))) return;
    if (![h.tracksTotal, h.tracksFound, h.lifeFrac, h.phaseIdx].every(n => typeof n === 'number' && Number.isFinite(n))) return;
    if ((h.lifeFrac as number) <= 0) return; // a dead quarry stays dead
    this.hunt = {
      id: h.id, beastDefId: h.beastDefId, faction: h.faction,
      color: typeof h.color === 'string' ? h.color : (FACTION_COLORS[h.faction] ?? HUNT_GOLD),
      lairZoneId: h.lairZoneId, lairCoord: { x: h.lairCoord.x, y: h.lairCoord.y },
      currentZoneId: h.currentZoneId, revealed: !!h.revealed,
      tracksTotal: Math.max(1, Math.floor(h.tracksTotal as number)),
      tracksFound: Math.max(0, Math.floor(h.tracksFound as number)),
      lifeFrac: clamp(h.lifeFrac as number, 0, 1), phaseIdx: Math.floor(h.phaseIdx as number),
      // THE GRANDFATHER: a pre-clock save carries no waneSec — restore to a
      // FRESH clock (0), never NaN, never an instant lapse on load. Keyed
      // LAST to match the live literals (snapshot byte-parity, the F rigs).
      waneSec: typeof h.waneSec === 'number' && Number.isFinite(h.waneSec) ? Math.max(0, h.waneSec) : 0,
    };
  }

  /** The chase needs its ground: if the trail/beast zone was culled the hunt
   *  ends (the lair marker alone is not a hunt). */
  pruneZones(has: (zoneId: string) => boolean): void {
    if (this.hunt && !has(this.hunt.currentZoneId)) this.hunt = null;
  }

  /** Read-only snapshot for markers / tests. */
  peek(): { id: string; beastDefId: string; faction: string; color: string; lairZoneId: string; coord: MapCoord; currentZoneId: string; revealed: boolean; lifeFrac: number; phaseIdx: number; waneSec: number } | null {
    const h = this.hunt;
    return h ? { id: h.id, beastDefId: h.beastDefId, faction: h.faction, color: h.color, lairZoneId: h.lairZoneId, coord: h.lairCoord, currentZoneId: h.currentZoneId, revealed: h.revealed, lifeFrac: h.lifeFrac, phaseIdx: h.phaseIdx, waneSec: h.waneSec } : null;
  }

  // --- internals -------------------------------------------------------------

  /** DEV: force the hunted beast to stand REVEALED in the given (current) zone,
   *  past its flee phases so it fights rather than flees. The engine spawns it on
   *  the next zone (re)materialization. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.hunt) return false; // one-at-a-time (matches production; no orphan)
    const lair = view.byId[zoneId];
    if (!lair || !eventTargetable(this.id, lair)) return false;
    const beast = this.pickBeast(view.charLevel);
    if (!beast) return false;
    this.hunt = {
      id: `hunt_${this.seq++}`, beastDefId: beast.defId, faction: beast.faction,
      color: FACTION_COLORS[beast.faction] ?? HUNT_GOLD,
      lairZoneId: zoneId, lairCoord: { x: lair.map.x, y: lair.map.y },
      currentZoneId: zoneId, revealed: true, tracksTotal: 1, tracksFound: 1, lifeFrac: 1, phaseIdx: 999,
      waneSec: 0,
    };
    return true;
  }

  private maybeIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.triggerChance * this.gate().ignitionMul, 0, 1))) return;
    // The FIRST tracks appear somewhere OTHER than where the player stands —
    // seated through the seat fabric (surge.seat): the pool is the whole
    // minted web, veiled halo included, inside the tuned distance envelope.
    // The old visited-only filter is gone — a hunt begins as country you
    // navigate INTO, not a cleared zone you backtrack to.
    const beast = this.pickBeast(view.charLevel);
    if (!beast) return;
    const lair = pickSeat(view, {
      event: this.id, ...this.cfg.seat,
      filter: n => n.id !== view.currentZoneId,
    }, this.rng);
    if (!lair) return;
    const color = FACTION_COLORS[beast.faction] ?? HUNT_GOLD;
    // Roll how many times the tracks are found (incl. this first) before the beast
    // is located — each non-final find relocates the trail to an adjacent zone.
    const [lo, hi] = this.cfg.trackStages;
    const tracksTotal = this.rng.int(lo, hi);
    this.hunt = {
      id: `hunt_${this.seq++}`,
      beastDefId: beast.defId, faction: beast.faction, color,
      lairZoneId: lair.id, lairCoord: { x: lair.map.x, y: lair.map.y },
      currentZoneId: lair.id, revealed: false, tracksTotal, tracksFound: 0, lifeFrac: 1, phaseIdx: -1,
      waneSec: 0,
    };
  }

  private pickBeast(charLevel: number): HuntBeast | null {
    const valid = this.cfg.beasts.filter(b => FACTIONS[b.faction]);
    if (!valid.length) return null;
    // The LEVEL BAND fold: rows banded to the character's level make the pool
    // a progression. An emptied band falls back to every valid row — authored
    // bands may gap, but a hunt never dry-fires over data.
    const banded = valid.filter(b => !b.level || (charLevel >= b.level[0] && charLevel <= b.level[1]));
    const pool = banded.length ? banded : valid;
    let total = 0;
    for (const b of pool) total += b.weight;
    let r = this.rng.next() * total;
    for (const b of pool) { r -= b.weight; if (r <= 0) return b; }
    return pool[pool.length - 1];
  }
}

// --- THE BEAST'S GROUND (registered on import — the transience doctrine) ------
//
// The quarry FLAVORS the land it borrows and hands every piece back: two
// event-pinned weather kinds (never sky-born) whose DRESS kits are the beast's
// whole ground story, planted while the pin holds and dissolved (Doodad.evap)
// the moment the hunt moves on or ends. Every doodad kind is an EXISTING one
// (the demonstorm kit's discipline — bones the world already knows how to
// draw); caves and roofed ground never dress (the sky-exposure law).
//
// SPOOR — the trail zones: the beast has just completed its OWN hunt here.
// Bones strewn, a picked carcass-cairn — the kill site you track it by.
registerWeather('hunt_spoor', {
  label: 'Beast Spoor', color: '#8a7a5c', countMul: 1, factionMul: {},
  eventOnly: true,
  dress: {
    rows: [
      { doodad: 'bone_pile', count: [2, 4], radius: [12, 18], minGap: 170 },
      { doodad: 'bone_cairn', count: [1, 2], radius: [12, 16], minGap: 260, solid: true },
    ],
  },
});
// THE NEST — the located quarry's stand: the chase MAY culminate in a charnel
// nest — rib arches raised like walls, heaped mounds, the larder's litter —
// the "housed in bone" read, laid only while the beast stands its ground.
registerWeather('hunt_nest', {
  label: 'The Nest', color: '#9a8a68', countMul: 1, factionMul: {},
  eventOnly: true,
  dress: {
    rows: [
      { doodad: 'bone_mound', count: [2, 3], radius: [24, 38], minGap: 240, solid: true },
      { doodad: 'rib_arch', count: [2, 4], radius: [16, 26], minGap: 200, solid: true },
      { doodad: 'bone_pile', count: [3, 6], radius: [12, 18], minGap: 130 },
      { doodad: 'bone', count: [2, 4], radius: [9, 13], minGap: 150, solid: true },
    ],
  },
});
// The pin: sampled for the CURRENT zone only — the trail zone wears the spoor
// while the hunt is unrevealed, the located beast's zone wears the nest. A
// dead or ended hunt pins nothing, so the dress evaporates with the chase.
registerEventFront({
  id: 'hunt',
  sample: (world: World, zone) => {
    const hf = world.sim.huntField;
    if (!hf) return null;
    const h = hf.peek();
    if (!h || h.lifeFrac <= 0 || h.currentZoneId !== zone.id) return null;
    return h.revealed ? { kind: 'hunt_nest', intensity: 1 } : { kind: 'hunt_spoor', intensity: 0.7 };
  },
});

// --- map marker (registered on import — zero panels.ts edits) -----------------
//
// While UNREVEALED, the current TRACK location pins (🐾) so the player can hunt the
// trail down zone to zone; once the beast is LOCATED it becomes the quarry pin (🐗),
// following the beast as it flees. Both fog:'always' so the chase always has a lead.
registerMarkerSource((world: World): MapMarker[] => {
  const hf = world.sim.huntField;
  if (!hf) return [];
  const h = hf.peek();
  if (!h || h.lifeFrac <= 0) return [];
  const node = world.zoneMap[h.currentZoneId];
  const coord = node ? { x: node.map.x, y: node.map.y } : h.coord;
  if (!h.revealed) return [{
    id: `hunt-trail-${h.id}`, zoneId: h.currentZoneId, coord,
    glyph: '🐾', fill: '#241c08', stroke: h.color, text: h.color, r: 9,
    title: 'Fresh tracks lead here. Follow the trail', fog: 'always', z: 17,
  }];
  // The located pin wears the QUARRY's own glyph (HuntBeast.glyph — the
  // reveal's payoff): the map tells you WHAT you cornered, not just where.
  const glyph = hf.surge().beasts.find(b => b.defId === h.beastDefId)?.glyph ?? '🐗';
  return [{
    id: `hunt-${h.id}`, zoneId: h.currentZoneId, coord,
    glyph, fill: '#241c08', stroke: h.color, text: h.color, r: 10,
    title: 'A great beast prowls here: the Hunt', fog: 'always', z: 18,
  }];
});

// --- the bounty board's census row (M2 K4 — the compounding law: registered
// from the package's own module, zero board edits). Only a REVEALED, living
// quarry is an answerable ask — an unfound trail is the hunt fabric's own
// exploration, and a bounty on it would spoil the find. Resolution is the
// kill row's hunt_beasts_slain stamp, read by the board's delta law; a
// migrating beast's card follows it live (the kind's copy re-reads here).
registerBountySource({
  id: 'hunt',
  census(world: World) {
    const h = world.sim.huntField?.peek();
    if (!h || !h.revealed || h.lifeFrac <= 0) return [];
    const z = world.zoneMap[h.currentZoneId];
    if (!z) return [];
    const name = MONSTERS[h.beastDefId]?.name ?? 'the great beast';
    return [{
      key: `hunt:${h.id}`, zoneId: h.currentZoneId, name,
      ask: `${name} is run to ground at ${z.name} — bring the great beast down.`,
      ledger: 'hunt_beasts_slain',
    }];
  },
});

// --- in-zone attention pointers (world/attention.ts — same zero-edit contract) --
//
// The map pin says which ZONE the trail or the quarry is in; these edge
// chevrons say where in THIS zone — the fabric's founding rider ("built for
// the Hunt beast", its own header). The FOOTPRINT is a dwell target lost in
// open country: the pin led the player here, and an unfindable track reads as
// "it never spawned" (the fracture lesson). The BEAST is the chase itself —
// off-screen exactly when it breaks for an exit, the moment the player must
// not lose it. Both wear the hunt's own colour; the beast wears the quarry's
// own map glyph (the located pin's fold), the trail the 🐾 it pinned by.
registerAttentionSource((world: World): AttentionPoint[] => {
  const hf = world.sim.huntField;
  if (!hf) return [];
  const h = hf.peek();
  if (!h || h.lifeFrac <= 0) return [];
  const out: AttentionPoint[] = [];
  const fp = world.huntFootprintView();
  if (fp) out.push({
    id: `hunt-track-${h.id}`, pos: fp.pos, color: h.color, glyph: '🐾',
    label: 'beast tracks — dwell to follow', z: 2,
  });
  const beast = world.huntBeastView();
  if (beast) out.push({
    id: `hunt-beast-${h.id}`, pos: beast.pos, color: h.color,
    glyph: hf.surge().beasts.find(b => b.defId === h.beastDefId)?.glyph ?? '🐗',
    label: beast.name, z: 6,
  });
  return out;
});
