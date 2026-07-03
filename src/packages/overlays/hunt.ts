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
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import { FACTIONS } from '../../data/monsters';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const HUNT_GOLD = '#d8a83a';

/** One quarry the Hunt can roll (faction → its great beast). */
export interface HuntBeast {
  faction: string;
  defId: string;
  weight: number;
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
}

export class HuntField implements WorldOverlay {
  readonly id = 'hunt';

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
    this.acc += dt;
    const g = this.gate();
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active && !this.hunt) this.maybeIgnite(view); }
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

  /** Read-only snapshot for markers / tests. */
  peek(): { id: string; beastDefId: string; faction: string; color: string; lairZoneId: string; coord: MapCoord; currentZoneId: string; revealed: boolean; lifeFrac: number; phaseIdx: number } | null {
    const h = this.hunt;
    return h ? { id: h.id, beastDefId: h.beastDefId, faction: h.faction, color: h.color, lairZoneId: h.lairZoneId, coord: h.lairCoord, currentZoneId: h.currentZoneId, revealed: h.revealed, lifeFrac: h.lifeFrac, phaseIdx: h.phaseIdx } : null;
  }

  // --- internals -------------------------------------------------------------

  /** DEV: force the hunted beast to stand REVEALED in the given (current) zone,
   *  past its flee phases so it fights rather than flees. The engine spawns it on
   *  the next zone (re)materialization. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.hunt) return false; // one-at-a-time (matches production; no orphan)
    const lair = view.byId[zoneId];
    if (!lair || lair.id.startsWith('cave_') || lair.floating || lair.eventOwned || lair.objective.kind === 'safe') return false;
    const beast = this.pickBeast();
    if (!beast) return false;
    this.hunt = {
      id: `hunt_${this.seq++}`, beastDefId: beast.defId, faction: beast.faction,
      color: FACTION_COLORS[beast.faction] ?? HUNT_GOLD,
      lairZoneId: zoneId, lairCoord: { x: lair.map.x, y: lair.map.y },
      currentZoneId: zoneId, revealed: true, tracksTotal: 1, tracksFound: 1, lifeFrac: 1, phaseIdx: 999,
    };
    return true;
  }

  private maybeIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.triggerChance * this.gate().ignitionMul, 0, 1))) return;
    // The FIRST tracks appear in a random CHARTED, non-safe/cave/floating node OTHER
    // than where the player stands — so the hunt begins as a zone you navigate to.
    const lairs = view.nodes.filter(n =>
      view.visited.has(n.id) && n.id !== view.currentZoneId
      && !n.id.startsWith('cave_') && !n.floating && !n.eventOwned && n.objective.kind !== 'safe'
      && eventAllowed('hunt', n));
    if (!lairs.length) return;
    const beast = this.pickBeast();
    if (!beast) return;
    const lair = lairs[this.rng.int(0, lairs.length - 1)];
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
    };
  }

  private pickBeast(): HuntBeast | null {
    const pool = this.cfg.beasts.filter(b => FACTIONS[b.faction]);
    if (!pool.length) return null;
    let total = 0;
    for (const b of pool) total += b.weight;
    let r = this.rng.next() * total;
    for (const b of pool) { r -= b.weight; if (r <= 0) return b; }
    return pool[pool.length - 1];
  }
}

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
    title: 'Fresh tracks lead here — follow the trail', fog: 'always', z: 17,
  }];
  return [{
    id: `hunt-${h.id}`, zoneId: h.currentZoneId, coord,
    glyph: '🐗', fill: '#241c08', stroke: h.color, text: h.color, r: 10,
    title: 'A great beast prowls here — the Hunt', fog: 'always', z: 18,
  }];
});
