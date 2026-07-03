// ---------------------------------------------------------------------------
// CONCLAVE FIELD — the Occult ritual + Eldritch-incubation overlay (pure).
//
// CONCLAVE is a RISK / REWARD gamble built on an in-zone RITUAL SITE: a pentagram
// with a stationary Occult cultist at each of its five points, mid-rite and
// NEUTRAL until you draw blood. Cut them all down (a chance each erupts into an
// Eldritch blood-demon) to SUBDUE the rite — or LEAVE them be, and the ritual
// INCUBATES: a hidden counter ticks, and once enough rites have been left to
// fester, the Eldritch influence awakens and spreads across the world (PoE
// Elder/Shaper — reserved for Pass 2; the counter + ignition seam live here now).
//
// Like every overlay this field is PURE of the engine — it never touches actors
// or World. It owns only the CROSS-ZONE remembrance: WHICH zones currently host a
// ritual (so a site you walk away from is GONE — the cultists migrated on — and
// won't silently reappear), and the hidden incubation tally. The in-zone runtime
// (placing the pentagram + cultists, the dormancy, the death-transform, the
// abandonment check) is engine work the World drives off these accessors. The
// Occult + Eldritch factions are conclave-only (contexts:['conclave']), so they
// never leak into ordinary world generation.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;            // fixed ignition cadence (seconds)
const OCCULT_VIOLET = '#a86ad8';

/** The in-zone ritual config — the whole site as tunable data, no magic numbers
 *  in the engine (mirrors DemonSurge / FractureSurge). */
export interface RitualSiteSpec {
  /** Per-STEP base chance (×pressure) a fresh ritual opens when below the cap. */
  openChance: number;
  /** Clamp ceiling on that per-step chance (so high pressure can't spam). */
  openChanceCap: number;
  /** Most rituals standing at once across the world. */
  maxConcurrent: number;
  /** Relative chance a ritual lands in an ALREADY-CHARTED zone WHEN fresh (uncharted)
   *  candidates also exist. The cultists hide off the charted map, so keep this LOW —
   *  most rituals appear in brand-new zones the player discovers on first entry. (When
   *  no uncharted candidate exists, a charted zone is used as a fallback regardless.) */
  chartedChance: number;
  /** Cultists ringing the pentagram (its five points — the brief's count). */
  cultistCount: number;
  /** Bestiary id fielded at each point (Occult faction, stationary). */
  cultistId: string;
  /** Bestiary id a slain cultist may erupt into (Eldritch faction). */
  bloodDemonId: string;
  /** Pentagram + cultist-ring radius (node/world units). */
  pentagramRadius: number;
  /** Minimum distance from the player the site is placed at (a trek to it). */
  farFrom: number;
  /** A cultist ROUSES (turns hostile) once its life falls to ≤ this fraction of
   *  its max — "taken to ~66% health". Only the wounded retaliate. */
  rouseFrac: number;
  /** Per-cultist-DEATH chance the corpse bursts into a blood-demon ("fairly low"). */
  bloodDemonChance: number;
  /** Subdue (all cultists slain) reward. */
  clearReward: { xpBase: number; xpPerLevel: number; gems: number };
}

/** The meta Eldritch-spread config. Pass 1 ships only the incubation THRESHOLD
 *  (the counter's payoff); the spread sim itself lands in Pass 2 (mirroring
 *  CrusadeField — epicenter mint, claim, influence). */
export interface EldritchSurge {
  /** Fully-incubated rituals (all five cultists survived a leave) before the
   *  Eldritch influence awakens and begins to spread. */
  incubationThreshold: number;
  /** Which Incursion archetype the awakening ignites (data-driven, so a different
   *  package could trigger a different blight). See INCURSION_ARCHETYPES. */
  archetype: string;
}

/** The whole Conclave config, carried by the package def, read by the engine via
 *  ConclaveField.surge() (so world.ts never imports the def). */
export interface ConclaveSurge {
  ritual: RitualSiteSpec;
  eldritch: EldritchSurge;
}

/** What the engine reads to materialize the ritual sitting in a zone. */
export interface RitualInfo {
  /** Unique id (keys the in-zone runtime + the map marker). */
  id: string;
  zoneId: string;
}

interface ActiveRitual {
  id: string;
  zoneId: string;
}

export class ConclaveField implements WorldOverlay {
  readonly id = 'conclave';

  /** The hidden incubation tally — fully-incubated rituals (all five cultists
   *  survived the player leaving). Drives the subtle pentagram "tell" (drawn
   *  in-zone) and, at the threshold, the Eldritch awakening. */
  incubationCounter = 0;
  /** Set once the counter crosses the threshold — the Eldritch influence has
   *  awakened. Pass 2 reads this to ignite the spatial spread (and would enqueue
   *  mint requests, mirroring CrusadeField). Reserved now so the seam is stable. */
  ignited = false;
  /** A pending Eldritch ignition the engine drains once (the counter maxed) and
   *  routes to the shared IncursionField — overlays can't reach each other, so the
   *  engine bridges. Set when the threshold is first crossed; null otherwise. */
  private pendingIgnition: { archetype: string; origin: { x: number; y: number } } | null = null;

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: ConclaveSurge;
  /** zoneId → the ritual currently sitting in that zone. */
  private rituals = new Map<string, ActiveRitual>();
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, cfg: ConclaveSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = cfg;
  }

  update(dt: number, view: OverlayView): void {
    this.acc += dt;
    const g = this.gate();
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeOpen(view); }
    // The Eldritch influence awakens once enough rites have incubated. The spread
    // simulation (mint a spatial epicenter, claim zones, paint influence —
    // mirroring CrusadeField) grows from HERE in Pass 2. The flag latches once.
    if (!this.ignited && this.incubationCounter >= this.cfg.eldritch.incubationThreshold) {
      this.ignited = true;
      // THE OBSERVER LANDS. Hand an ignition to the shared Incursion field (the
      // engine bridges it). Origin = where the player stands now, so the blight
      // lands FAR from there (the archetype's mintDistance), obscured in the wilds.
      const here = view.byId[view.currentZoneId];
      this.pendingIgnition = {
        archetype: this.cfg.eldritch.archetype,
        origin: here ? { x: here.map.x, y: here.map.y } : { x: 0, y: 0 },
      };
    }
  }

  onNodeCharted(): void { /* rituals target charted zones by id; no per-node seeding */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // cultists are materialized, never biased
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker source draws the sites

  // --- accessors the engine reads --------------------------------------------

  /** Live config (the engine reads the ritual knobs: HP rouse, blood-demon chance,
   *  placement geometry, reward). */
  surge(): ConclaveSurge { return this.cfg; }

  /** The ritual sitting in this zone (engine materializes the pentagram + cultists
   *  from it), or null when the zone holds none. */
  ritualIn(zoneId: string): RitualInfo | null {
    const r = this.rituals.get(zoneId);
    return r ? { id: r.id, zoneId } : null;
  }

  /** Remove a ritual from a zone — SUBDUED (all cultists slain) or DISRUPTED (the
   *  player left after thinning, but not clearing, them). No counter change. */
  clearRitual(zoneId: string): void { this.rituals.delete(zoneId); }

  /** DEV: force an Occult ritual site into the given (current) zone. Mirrors the
   *  production maybeOpen filter (+ the sibling dev seams): rejects safe/waves/cave/
   *  floating/unpopulated nodes. The engine materializes it on the next zone
   *  (re)materialization. (QA only.) */
  devOpenRitual(view: OverlayView, zoneId: string): boolean {
    if (this.rituals.has(zoneId)) return false;
    const z = view.byId[zoneId];
    if (!z || z.id.startsWith('cave_') || z.floating
      || z.objective.kind === 'safe' || z.objective.kind === 'waves'
      || !z.packs?.table?.length) return false;
    this.rituals.set(zoneId, { id: `ritual_${this.seq++}`, zoneId });
    return true;
  }

  /** DEV: jump the hidden incubation tally to its threshold so the Eldritch
   *  Incursion ignites on the next update (the engine bridges takeIgnition). (QA.) */
  devMaxIncubation(): void {
    if (!this.ignited) this.incubationCounter = this.cfg.eldritch.incubationThreshold;
  }

  /** The player LEFT with every cultist still alive — the rite INCUBATES: tick the
   *  hidden counter, then disperse the site (the cultists migrate onward). */
  incubate(zoneId: string): void {
    this.incubationCounter++;
    this.rituals.delete(zoneId);
  }

  /** The engine drains a pending Eldritch ignition once (the counter maxed) and
   *  routes it to the shared IncursionField. Returns + clears it. */
  takeIgnition(): { archetype: string; origin: { x: number; y: number } } | null {
    const p = this.pendingIgnition;
    this.pendingIgnition = null;
    return p;
  }

  /** Read-only snapshot for the map markers / tests. */
  peek(): ReadonlyArray<RitualInfo> {
    return [...this.rituals.values()].map(r => ({ id: r.id, zoneId: r.zoneId }));
  }

  // --- internals -------------------------------------------------------------

  private maybeOpen(view: OverlayView): void {
    const cfg = this.cfg.ritual;
    const g = this.gate();
    if (this.rituals.size >= scaledCap(cfg.maxConcurrent, g.concurrencyMul)) return;
    // NB: openChanceCap is conclave's own per-step ceiling — a deliberate rarity
    // gate, so an extreme global rate crank saturates here (raise it in the def to
    // let conclave keep pace). Byte-identical to before at the default profile.
    if (!this.rng.chance(clamp(cfg.openChance * g.ignitionMul, 0, cfg.openChanceCap))) return;
    // A ritual opens on non-safe/waves/cave/floating, populated ground that doesn't
    // already host one — and NOT the zone the player currently stands in. The cultists
    // hide OFF the charted map, so it prefers a FRESH (uncharted) zone the player will
    // discover on first entry; only a small chartedChance (or a no-fresh fallback)
    // lands it in already-explored ground. Materializes lazily on entry (by-id), so a
    // fresh-zone ritual simply appears the first time the player walks in.
    const cands = view.nodes.filter(z =>
      z.id !== view.currentZoneId
      && !z.id.startsWith('cave_') && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && z.objective.kind !== 'waves'
      && !!z.packs?.table?.length && !this.rituals.has(z.id)
      && eventAllowed('conclave', z));
    if (!cands.length) return;
    const fresh = cands.filter(z => !view.visited.has(z.id));
    const charted = cands.filter(z => view.visited.has(z.id));
    const pool = fresh.length && (!charted.length || this.rng.next() >= cfg.chartedChance) ? fresh : charted;
    if (!pool.length) return;
    const z = pool[this.rng.int(0, pool.length - 1)];
    this.rituals.set(z.id, { id: `ritual_${this.seq++}`, zoneId: z.id });
  }
}

// --- map marker (registered on import — zero panels.ts edits) -----------------
//
// Each active ritual pins a subtle Occult star to its CHARTED zone (fog:'charted'
// — no spoilers; you find them by exploring). The stroke brightens toward a blood
// tint as the hidden incubation counter climbs — a quiet implication that
// SOMETHING is building, for the player to infer.
registerMarkerSource((world: World): MapMarker[] => {
  const cf = world.sim.conclaveField;
  if (!cf) return [];
  const threshold = Math.max(1, cf.surge().eldritch.incubationThreshold);
  const heat = clamp(cf.incubationCounter / threshold, 0, 1);
  // Pale occult violet → a faint blood red as incubation deepens.
  const stroke = heat <= 0 ? OCCULT_VIOLET : `rgb(${Math.round(168 + heat * 56)},${Math.round(106 - heat * 46)},${Math.round(216 - heat * 116)})`;
  const out: MapMarker[] = [];
  for (const r of cf.peek()) {
    const node = world.zoneMap[r.zoneId];
    if (!node) continue;
    out.push({
      id: `ritual-${r.id}`, zoneId: r.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '☆', fill: '#160c22', stroke, text: stroke, r: 9,
      title: 'An Occult ritual stirs here', fog: 'charted', z: 14,
    });
  }
  return out;
});
