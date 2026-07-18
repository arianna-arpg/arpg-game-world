// ---------------------------------------------------------------------------
// LONG NIGHT FIELD — the Night Court's estate ledger (pure overlay).
//
// BY NIGHT the Court establishes FEEDING GROUNDS on charted zones: a parked
// GLOOM COACH and a feeding party poured in the dark hours (the engine fields
// both off groundOn(), the Haunting's pattern). Every dawn a standing ground
// banks the night it just fed — DOUBLE under a BLOOD MOON (the engine feeds
// the sky in via markBloodmoon; overlays can't see the weather field) — and at
// nightsToConvert the ground CONVERTS: its spawns shift to the Court for good,
// the map's biome field warps toward the gloam (the engine rides
// BiomeField.setWarp off convertedZones(), the Mycelia pattern), and the air
// runs wine-dark (the zoneWash seam below). The counterplay is the CLOCK,
// stated everywhere the player can read: the coach is gloom-warded and rolling
// at night — BURN IT BY DAY and the ground is reclaimed (a night kill only
// re-knits it; the ward makes that a feat to waste). Once enough estates
// convert, the COUNTESS takes court at her most-fed ground — crowned, seated,
// and the whole Long Night breaks with her: fell her at court and every
// feeding ground collapses at once, buying a long quiet (brokenCooldown).
//
// PURE of the engine: owns the establish/feed/convert/reclaim lifecycle; the
// engine reads groundOn()/convertedZones()/consumeAnnouncements() and calls
// onCoachBurned()/onCoachReknits()/onCourtBroken() back through the kill rows
// in defs/longNight.ts. Fed-night counters are DURABLE (the per-overlay
// snapshot bag), never TTL'd zone memory — an estate outlives a relaunch.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { dayCycle, inPhases, type DayPhase } from '../../world/daynight';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerOmenSource } from '../../world/omens';
import { pickSeat, type SeatTuning } from '../../world/seats';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { registerZoneWashSource } from '../../world/zoneWash';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const COURT_CRIMSON = '#b83a5a';

/** The whole Long Night mechanic as data — every number a knob. */
export interface LongNightSurge {
  /** Per-STEP chance a fresh ground establishes (night hours only, × pressure). */
  igniteChance: number;
  /** WHERE the Court parks its coach (the seat fabric, world/seats.ts): the
   *  whole minted web inside the envelope — a ground may establish in country
   *  nobody has walked and FEED there, night after night, converting unseen
   *  (its growing estate is its own announcement when finally found). */
  seat: SeatTuning;
  /** The UNKNOWN ground's murmurs (world/omens.ts) — known grounds pin on the
   *  map instead. Converted estates whisper louder (the overlay scales it). */
  omen?: { whisper: number; reveal?: number; widenPerMin?: number; lines: string[] };
  /** Un-converted grounds the Court works at once. */
  maxPending: number;
  /** HARD estate cap: once this many zones are converted, the Court stops
   *  spreading until something is reclaimed — a handful of threatened
   *  zones, never the map. */
  maxConverted: number;
  /** Day-phases a fresh ground may ESTABLISH in (the night gate). */
  beginPhases: DayPhase[];
  /** Consecutive fed nights that convert a ground. */
  nightsToConvert: number;
  /** What one night under a covering BLOOD MOON is worth (2 = double pace). */
  bloodmoonWorth: number;
  /** Seconds between poured Court bodies while a player stands the ground. */
  streamInterval: [number, number];
  /** Live poured bodies the feeding party holds at. */
  maxAlive: number;
  /** Zone-level bonus the party and the coach spawn at. */
  levelBonus: number;
  /** The feeding party — presence-banded like any roster. */
  roster: PackTableEntry[];
  /** The parked POI body (burn it BY DAY to reclaim the ground). */
  coachId: string;
  /** The finale: past `courtAt` converted estates the Countess seats herself
   *  at the most-fed ground, crowned and `levelBonus` above the zone. */
  countess: { defId: string; courtAt: number; levelBonus: number };
  /** The conversion's map-side face: the biome-field warp stamped on a
   *  converted zone (the engine reconciles these — the Mycelia pattern). */
  warp: { radius: number; strength: number; biome: string };
  /** The air of a held ground (zoneWash seam): wine-dark, deepest at
   *  midnight — the promised "deepened nightDark", render-only. */
  wash: { color: string; alpha: number };
  /** Seconds (rolled) after the court is BROKEN before the Court tries
   *  again anywhere — the player's long quiet. */
  brokenCooldownSeconds: [number, number];
  color: string;
}

/** What the engine reads to field a feeding ground. */
export interface LongNightInfo {
  id: string;
  converted: boolean;
  fedNights: number;
  nightsToConvert: number;
  streamInterval: [number, number];
  maxAlive: number;
  levelBonus: number;
  roster: PackTableEntry[];
  coachId: string;
  /** Remembered wounds (the Hunt's preserved-health pattern). */
  coachLifeFrac: number;
  /** The Countess holds court HERE (the finale ground). */
  countessHere: boolean;
  countessId: string;
  countessLevelBonus: number;
  countessLifeFrac: number;
  color: string;
}

interface FeedingGround {
  id: string;
  zoneId: string;
  coord: MapCoord;
  fedNights: number;
  converted: boolean;
  /** A blood moon covered this ground at some point THIS night. */
  bloodFed: boolean;
  coachLifeFrac: number;
  countessHere: boolean;
  countessLifeFrac: number;
}

/** World-facing event beats the engine drains into toasts + ledgers. */
export interface LongNightAnnouncement {
  kind: 'converted' | 'court';
  zoneId: string;
}

export class LongNightField implements WorldOverlay {
  readonly id = 'long_night';
  /** Durable: fed-night counters ARE the design (three nights is a promise);
   *  a relaunch that forgot them would un-tell the whole story. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'The Long Night';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: LongNightSurge;
  private grounds: FeedingGround[] = [];
  private announcements: LongNightAnnouncement[] = [];
  /** Seconds until the Court may establish again after its court BROKE. */
  private cooldownLeft = 0;
  /** Dawn-edge tracker (re-derived on the first tick after a restore). */
  private lastPhase: DayPhase | null = null;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: LongNightSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    // THE DAWN LEDGER: a ground that stood through the night banks it —
    // double under a blood moon — and at the threshold it CONVERTS.
    const phase = dayCycle(view.time).phase;
    if (this.lastPhase === 'night' && phase === 'dawn') this.onDawn();
    this.lastPhase = phase;
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    // A court may need seating even between dawns (a resume mid-arc).
    this.maybeSeatCourt();
    // ESTABLISHMENT — night hours only, on charted huntable ground, under
    // both the pending cap and the hard estate cap.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.cooldownLeft <= 0
        && inPhases(view.time, this.cfg.beginPhases)
        && this.pendingCount() < scaledCap(this.cfg.maxPending, g.concurrencyMul)
        && this.convertedCount() < this.cfg.maxConverted
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryEstablish(view);
      }
    }
  }

  /** Dawn: bank the night on every standing ground; convert at threshold. */
  private onDawn(): void {
    for (const gr of this.grounds) {
      gr.fedNights += gr.bloodFed ? this.cfg.bloodmoonWorth : 1;
      gr.bloodFed = false;
      if (!gr.converted && gr.fedNights >= this.cfg.nightsToConvert) {
        gr.converted = true;
        this.announcements.push({ kind: 'converted', zoneId: gr.zoneId });
      }
    }
    this.maybeSeatCourt();
  }

  /** Past the threshold the Countess seats herself at the MOST-FED estate. */
  private maybeSeatCourt(): void {
    if (this.grounds.some(gr => gr.countessHere)) return;
    if (this.convertedCount() < this.cfg.countess.courtAt) return;
    let best: FeedingGround | null = null;
    for (const gr of this.grounds) {
      if (!gr.converted) continue;
      if (!best || gr.fedNights > best.fedNights) best = gr;
    }
    if (!best) return;
    best.countessHere = true;
    this.announcements.push({ kind: 'court', zoneId: best.zoneId });
  }

  onNodeCharted(): void { /* grounds establish on already-charted zones only */ }

  /** A held ground spawns as COURT territory: converted estates field the
   *  Court's full muster day and night; a pending ground only shifts in the
   *  dark hours (the party came at night, and at night it swells). */
  affectSpawns(zone: ZoneDef, view: OverlayView): SpawnBias {
    const gr = this.grounds.find(x => x.zoneId === zone.id);
    if (!gr) return NO_BIAS;
    if (gr.converted) {
      return { countMul: 1.15, factionMul: { nightkin: 2.2 }, injectFactions: ['nightkin'] };
    }
    if (inPhases(view.time, ['dusk', 'night'])) {
      return { countMul: 1.1, factionMul: { nightkin: 1.6 }, injectFactions: ['nightkin'] };
    }
    return NO_BIAS;
  }

  /** Feeding stirs the world: a pending ground simmers, an estate weighs
   *  more, a seated court most of all (the Mycelia bloom eats this). */
  activityAt(zid: string): number {
    const gr = this.grounds.find(x => x.zoneId === zid);
    return gr ? (gr.countessHere ? 3 : gr.converted ? 2 : 1) : 0;
  }

  renderMap(): MapLayer {
    let over = '';
    for (const gr of this.grounds) {
      const x = gr.coord.x.toFixed(1), y = gr.coord.y.toFixed(1);
      if (gr.converted) {
        // An estate: a steady wine-dark ring, doubled where the court sits.
        over += `<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${this.cfg.color}" stroke-width="1.8" stroke-opacity="0.85"/>`;
        if (gr.countessHere) {
          over += `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${this.cfg.color}" stroke-width="1.2">`
            + `<animate attributeName="stroke-opacity" values="0.2;0.8;0.2" dur="2.2s" repeatCount="indefinite"/></circle>`;
        }
      } else {
        // A feeding in progress: a slow crimson breath, quickening as the
        // ledger fills (the map whispers how close the third night is).
        const frac = Math.min(1, gr.fedNights / this.cfg.nightsToConvert);
        over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${this.cfg.color}" stroke-width="1.4" stroke-opacity="0.6">`
          + `<animate attributeName="stroke-opacity" values="0.1;${(0.45 + 0.4 * frac).toFixed(2)};0.1" dur="${(3.2 - 1.2 * frac).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): LongNightSurge { return this.cfg; }

  /** The feeding ground holding this zone, if any. */
  groundOn(zoneId: string): LongNightInfo | null {
    const gr = this.grounds.find(x => x.zoneId === zoneId);
    if (!gr) return null;
    return {
      id: gr.id, converted: gr.converted, fedNights: gr.fedNights,
      nightsToConvert: this.cfg.nightsToConvert,
      streamInterval: this.cfg.streamInterval, maxAlive: this.cfg.maxAlive,
      levelBonus: this.cfg.levelBonus, roster: this.cfg.roster,
      coachId: this.cfg.coachId, coachLifeFrac: gr.coachLifeFrac,
      countessHere: gr.countessHere, countessId: this.cfg.countess.defId,
      countessLevelBonus: this.cfg.countess.levelBonus,
      countessLifeFrac: gr.countessLifeFrac,
      color: this.cfg.color,
    };
  }

  /** Zone ids of every standing ground (the engine's blood-moon sweep). */
  groundZoneIds(): string[] { return this.grounds.map(gr => gr.zoneId); }

  /** Converted estates (the engine reconciles biome warps against this). */
  convertedZones(): string[] {
    return this.grounds.filter(gr => gr.converted).map(gr => gr.zoneId);
  }

  /** The engine marks grounds a BLOOD MOON covers tonight (double feeding). */
  markBloodmoon(zoneIds: string[]): void {
    for (const zid of zoneIds) {
      const gr = this.grounds.find(x => x.zoneId === zid);
      if (gr) gr.bloodFed = true;
    }
  }

  /** Engine sync (per frame): the parked coach's wounds, remembered. */
  setCoachLife(id: string, frac: number): void {
    const gr = this.grounds.find(x => x.id === id);
    if (gr) gr.coachLifeFrac = Math.min(1, Math.max(0, frac));
  }

  /** Engine sync (per frame): the seated Countess's wounds. */
  setCountessLife(id: string, frac: number): void {
    const gr = this.grounds.find(x => x.id === id);
    if (gr) gr.countessLifeFrac = Math.min(1, Math.max(0, frac));
  }

  /** The coach BURNED BY DAY: the ground is reclaimed — converted or not,
   *  the estate is struck from the ledger (the engine lifts its warp on the
   *  next reconcile). Returns true when a ground actually fell. */
  onCoachBurned(zoneId: string): boolean {
    const i = this.grounds.findIndex(x => x.zoneId === zoneId);
    if (i < 0) return false;
    this.grounds.splice(i, 1);
    return true;
  }

  /** The coach fell AT NIGHT: the gloom re-knits it — the ground stands,
   *  the ledger keeps counting, and the next visit parks a whole coach.
   *  (The ward makes a night kill a feat; this makes it a lesson.) */
  onCoachReknits(zoneId: string): void {
    const gr = this.grounds.find(x => x.zoneId === zoneId);
    if (gr) gr.coachLifeFrac = 1;
  }

  /** The Countess falls AT COURT: the whole Long Night breaks — every
   *  feeding ground collapses at once and the Court goes quiet for a long
   *  stretch (the reprieve a finale deserves). */
  onCourtBroken(): void {
    this.grounds = [];
    this.cooldownLeft = this.rng.range(
      this.cfg.brokenCooldownSeconds[0], this.cfg.brokenCooldownSeconds[1]);
  }

  /** World-facing beats since the last drain (conversions, the court). */
  consumeAnnouncements(): LongNightAnnouncement[] {
    if (!this.announcements.length) return this.announcements;
    const out = this.announcements;
    this.announcements = [];
    return out;
  }

  /** Counts for caps + QA. */
  pendingCount(): number { return this.grounds.filter(gr => !gr.converted).length; }
  convertedCount(): number { return this.grounds.filter(gr => gr.converted).length; }
  cooldownRemaining(): number { return this.cooldownLeft; }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the estates (fed-night ledgers included), the broken-court
   *  reprieve clock, undrained announcements, and the id counter. */
  snapshot(): unknown {
    return {
      grounds: this.grounds.map(gr => ({ ...gr, coord: { ...gr.coord } })),
      announcements: this.announcements.map(a => ({ ...a })),
      cooldownLeft: this.cooldownLeft,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { grounds?: unknown[]; announcements?: unknown[]; cooldownLeft?: unknown; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    const frac = (v: unknown, def: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : def;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (typeof s.cooldownLeft === 'number' && Number.isFinite(s.cooldownLeft)) this.cooldownLeft = Math.max(0, s.cooldownLeft);
    if (Array.isArray(s.grounds)) {
      this.grounds = [];
      for (const raw of s.grounds) {
        const gr = raw as Partial<FeedingGround> | null;
        if (!gr || typeof gr.id !== 'string' || typeof gr.zoneId !== 'string') continue;
        if (!gr.coord || ![gr.coord.x, gr.coord.y].every(n => typeof n === 'number' && Number.isFinite(n))) continue;
        this.grounds.push({
          id: gr.id, zoneId: gr.zoneId, coord: { x: gr.coord.x, y: gr.coord.y },
          fedNights: typeof gr.fedNights === 'number' && Number.isFinite(gr.fedNights)
            ? Math.max(0, Math.floor(gr.fedNights)) : 0,
          converted: !!gr.converted,
          bloodFed: !!gr.bloodFed,
          coachLifeFrac: frac(gr.coachLifeFrac, 1),
          countessHere: !!gr.countessHere,
          countessLifeFrac: frac(gr.countessLifeFrac, 1),
        });
      }
    }
    if (Array.isArray(s.announcements)) {
      this.announcements = [];
      for (const raw of s.announcements) {
        const a = raw as { kind?: unknown; zoneId?: unknown } | null;
        if (!a || typeof a.zoneId !== 'string') continue;
        if (a.kind !== 'converted' && a.kind !== 'court') continue;
        this.announcements.push({ kind: a.kind, zoneId: a.zoneId });
      }
    }
  }

  /** A culled zone's ground is struck from the ledger (its warp lifts on
   *  the next reconcile — the sanitizer never leaves a ghost estate). */
  pruneZones(has: (zoneId: string) => boolean): void {
    this.grounds = this.grounds.filter(gr => has(gr.zoneId));
    this.announcements = this.announcements.filter(a => has(a.zoneId));
  }

  /** Read-only snapshot for the map markers. */
  peek(): ReadonlyArray<{ id: string; zoneId: string; x: number; y: number; fedNights: number; toConvert: number; converted: boolean; court: boolean }> {
    return this.grounds.map(gr => ({
      id: gr.id, zoneId: gr.zoneId, x: gr.coord.x, y: gr.coord.y,
      fedNights: gr.fedNights, toConvert: this.cfg.nightsToConvert,
      converted: gr.converted, court: gr.countessHere,
    }));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: establish a ground on the given zone immediately (QA). */
  devEstablish(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.targetable(z) || this.grounds.some(gr => gr.zoneId === zoneId)) return false;
    this.grounds.push(this.mintGround(z));
    return true;
  }

  /** DEV: bank fed nights on a standing ground (QA — walks the convert path). */
  devFeed(zoneId: string, nights: number): void {
    const gr = this.grounds.find(x => x.zoneId === zoneId);
    if (!gr) return;
    gr.fedNights += Math.max(0, Math.floor(nights));
    if (!gr.converted && gr.fedNights >= this.cfg.nightsToConvert) {
      gr.converted = true;
      this.announcements.push({ kind: 'converted', zoneId: gr.zoneId });
    }
    this.maybeSeatCourt();
  }

  // --- internals -------------------------------------------------------------

  /** May the Court feed here? THE shared predicate (zonePolicy). */
  private targetable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  private tryEstablish(view: OverlayView): void {
    const taken = new Set(this.grounds.map(gr => gr.zoneId));
    // Seated through the seat fabric (surge.seat): the visited-only filter is
    // gone — the Court may park in the veiled halo and feed unseen, so a far
    // ground found late is already CONVERTED (the stumble is the story).
    const z = pickSeat(view, {
      event: this.id, ...this.cfg.seat,
      filter: n => this.targetable(n) && !taken.has(n.id),
    }, this.rng);
    if (!z) return;
    this.grounds.push(this.mintGround(z));
  }

  private mintGround(z: ZoneDef): FeedingGround {
    return {
      id: `long_night_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      fedNights: 0, converted: false, bloodFed: false,
      coachLifeFrac: 1, countessHere: false, countessLifeFrac: 1,
    };
  }
}

// --- map markers + zone-info (registered on import) ---------------------------
// KNOWN grounds pin; a ground feeding in country the player has never seen
// stays off the map (found by boots, a survey, or the omen's widening voice)
// — the stumble onto a fully-converted estate is the Long Night's best scene.
registerMarkerSource((world: World): MapMarker[] => {
  const lnf = world.sim.longNightField;
  if (!lnf) return [];
  return lnf.peek()
    .filter(gr => world.visited.has(gr.zoneId) || world.surveyed.has(gr.zoneId))
    .map(gr => ({
      id: `long_night-${gr.id}`, coord: { x: gr.x, y: gr.y },
      glyph: gr.court ? '♕' : gr.converted ? '⚰' : '☾',
      fill: '#180a10', stroke: COURT_CRIMSON, text: '#e8c8d0', r: 7,
      title: gr.court ? 'The COUNTESS holds court here — break it and the Long Night breaks'
        : gr.converted ? 'A converted feeding ground — burn the gloom coach BY DAY to reclaim it'
          : `The Court feeds here by night (${gr.fedNights} of ${gr.toConvert} nights) — burn the coach by day`,
      fog: 'always', z: 16,
    }));
});

// The UNKNOWN ground's voice (world/omens.ts): a converted estate murmurs
// louder than a fresh one — grounds deepen unseen, and the world lets it slip.
registerOmenSource((world: World) => {
  const lnf = world.sim.longNightField;
  const om = lnf?.surge().omen;
  if (!lnf || !om) return [];
  return lnf.peek()
    .filter(gr => !world.visited.has(gr.zoneId) && !world.surveyed.has(gr.zoneId))
    .map(gr => ({
      id: `long_night-${gr.id}`, at: { x: gr.x, y: gr.y }, zoneId: gr.zoneId,
      color: COURT_CRIMSON,
      lines: om.lines, whisper: om.whisper * (gr.converted ? 1.35 : 1),
      reveal: om.reveal, widenPerMin: om.widenPerMin,
      age: gr.fedNights * 60, // fed nights ARE its age — the estate's voice deepens
    }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.longNightField?.groundOn(zoneId);
  if (!info) return [];
  let detail: string;
  if (info.countessHere) {
    detail = 'the Countess holds court — fell her here and every feeding ground breaks';
  } else if (info.converted) {
    detail = 'the Court holds this ground; its coach is gloom-warded at night — burn it by day to reclaim';
  } else {
    detail = `the Court has fed here ${info.fedNights} of ${info.nightsToConvert} nights — burn the parked coach by day before the third`;
  }
  return [{
    kind: 'event', icon: '☾', color: info.color,
    label: info.countessHere ? 'The Court Seated' : info.converted ? 'Feeding Ground' : 'The Court Feeds',
    detail,
    z: 15,
  }];
});

// --- zone wash (registered on import): held ground runs WINE-DARK -------------
// The "deepened nightDark" made visible: a converted estate's air darkens
// toward the Court's colour, deepest at midnight and thinnest at noon; a
// pending ground wears half the mood. Render-only, pure data off the surge.
registerZoneWashSource((world: World) => {
  const lnf = world.sim.longNightField;
  const wash = lnf?.surge().wash;
  if (!lnf || !wash) return null;
  const info = lnf.groundOn(world.zone.id);
  if (!info) return null;
  const nightness = 1 - dayCycle(world.time).light; // 0 noon .. 1 midnight
  const depth = info.converted ? 1 : 0.5;
  return { color: wash.color, alpha: wash.alpha * depth * (0.35 + 0.65 * nightness) };
});
