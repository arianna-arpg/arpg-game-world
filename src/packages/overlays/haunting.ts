// ---------------------------------------------------------------------------
// HAUNT FIELD — a restless GRIEF that settles on one charted zone (pure overlay).
//
// No march, no territory: every so often a haunting simply TAKES a place. While
// it holds, the zone runs cold — apparitions stream in around a standing
// GRIEF-ANCHOR (the engine spawns both off hauntOn()). The knot unties two
// ways: wait it out (the grief drifts on, no reward), or BREAK THE ANCHOR —
// which does not end it. Breaking the anchor MANIFESTS the Wailing One, and
// only its fall lifts the haunt (the reward path).
//
// THE NIGHT CANON (all data on HauntSurge, each knob optional): griefs may
// SETTLE only in their hours (beginPhases) and cannot HOLD their shape outside
// them (holdPhases) — when the wheel turns past, the haunt DISSIPATES: its
// standing spawns fade where they stand (the engine sweeps them off
// drainDissipated(), no bounty), after visibly WANING for the last waneSeconds
// (the pulse the engine paints through HauntInfo.waneFrac → Actor.wane). What
// the light takes it does not erase: a dissipating grief BANKS its progress
// (anchor wounds, a broken anchor, the Wailing One's hurts — synced in by the
// engine via setAnchorLife/setBossLife, the Hunt's preserved-health pattern)
// and the NEXT grief to settle anywhere RESUMES it, so effort spent is never
// wasted. A broken-anchor haunt still never lapses by ttl: grief faced must
// be finished — or carried. While a grief holds the player's zone the air
// itself runs cold (the `wash` knob → the world/zoneWash.ts seam, thinning
// with the wane), and a grief FACED buys a REPRIEVE: resolveCooldownSeconds
// blocks fresh settles for a stretch, so committing to a haunt clears the
// nights that follow instead of inviting the next one.
//
// PURE of the engine: owns the settle/wane/dissipate/lapse lifecycle; the
// engine reads hauntOn() to field the anchor + the stream, and calls
// onAnchorBroken()/resolveHaunt() back through the kill-handler rows in
// defs/haunting.ts.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { inPhases, phaseAhead, type DayPhase } from '../../world/daynight';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { registerZoneWashSource } from '../../world/zoneWash';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const HAUNT_PALE = '#b8c8e8';

/** The whole haunting mechanic as data — every number a knob. */
export interface HauntSurge {
  /** Per-STEP chance a fresh grief settles (gated by pressure + the cap). */
  igniteChance: number;
  maxConcurrent: number;
  /** Seconds an UNBROKEN haunt holds before drifting on (rolled in range). */
  ttlSeconds: [number, number];
  /** Seconds between streamed apparitions while a player stands the ground. */
  streamInterval: [number, number];
  /** Live streamed apparitions the pour holds at (the pressure ceiling). */
  maxAlive: number;
  /** Zone-level bonus the streamed dead and the anchor spawn at. */
  levelBonus: number;
  /** The apparition stream — presence-banded like any roster. */
  roster: PackTableEntry[];
  /** The standing anchor + the grief it manifests when broken. */
  anchorId: string;
  bossId: string;
  /** Extra level bonus on the manifested Wailing One. */
  bossLevelBonus: number;
  color?: string;
  /** Day-phases a fresh grief may SETTLE in (undefined = any hour). */
  beginPhases?: DayPhase[];
  /** Day-phases the grief can HOLD its shape through. When the wheel turns to
   *  a phase outside this set the haunt DISSIPATES: the engine sweeps its
   *  standing spawns (fade-out, no bounty) and — see carryWound — the effort
   *  spent on it is banked, not lost. Undefined = holds any hour (the old
   *  ttl-only lifecycle). */
  holdPhases?: DayPhase[];
  /** Seconds before a dissipating phase-turn the haunt's spawns visibly WANE —
   *  the renderer pulses them toward transparent as the light nears (surfaced
   *  as HauntInfo.waneFrac, 0 → 1 across this window). 0/undefined = no warning. */
  waneSeconds?: number;
  /** A dissipated grief BANKS its progress (anchor wounds / broken anchor /
   *  the Wailing One's wounds) and the NEXT grief to settle — any zone —
   *  RESUMES it, so player effort is never wasted. Default true. */
  carryWound?: boolean;
  /** Full-screen wash while a grief holds the player's zone — dread made
   *  visible (the world/zoneWash.ts seam). Alpha THINS with the wane: the
   *  air warms as the light nears. Colour defaults to the surge colour. */
  wash?: { color?: string; alpha: number };
  /** Seconds (rolled in range) after a grief is FACED — the Wailing One
   *  felled, resolveHaunt() — before a fresh grief may settle anywhere: the
   *  player's reprieve, so committing to a haunt buys quiet nights instead
   *  of wall-to-wall grief. Dissipation never cools (it carries instead);
   *  a ttl lapse never cools (nothing was faced). Undefined = no reprieve. */
  resolveCooldownSeconds?: [number, number];
}

/** What the engine reads to field a haunted zone. */
export interface HauntInfo {
  id: string;
  anchorBroken: boolean;
  streamInterval: [number, number];
  maxAlive: number;
  levelBonus: number;
  roster: PackTableEntry[];
  anchorId: string;
  bossId: string;
  bossLevelBonus: number;
  color: string;
  /** How far into the pre-dissipation fade this grief stands (0 = full power,
   *  1 = the light is here). The engine stamps it onto its spawns' Actor.wane. */
  waneFrac: number;
  /** Remembered wounds (fraction of max life left; 1 = unhurt). The engine
   *  spawns the anchor / the Wailing One at these, and syncs them back every
   *  frame — the grief remembers every blow across dawns and zone exits. */
  anchorLifeFrac: number;
  bossLifeFrac: number;
}

interface ActiveHaunt {
  id: string;
  zoneId: string;
  coord: MapCoord;
  ttlLeft: number;
  anchorBroken: boolean;
  /** Live wound ledger (see HauntInfo) — engine-synced, dawn-banked. */
  anchorLifeFrac: number;
  bossLifeFrac: number;
  waneFrac: number;
  /** DEV: a pinned grief ignores the wheel (never dissipates, never lapses) —
   *  it still WANES visually near a boundary so the pulse can be previewed. */
  pinned?: boolean;
}

/** A grief the light banished mid-effort — its wounds ride to the next settle. */
interface RestlessGrief {
  anchorBroken: boolean;
  anchorLifeFrac: number;
  bossLifeFrac: number;
}

export class HauntField implements WorldOverlay {
  readonly id = 'haunting';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: HauntSurge;
  private haunts: ActiveHaunt[] = [];
  /** Wounds banked off dissipated griefs, oldest first — the next settle
   *  (anywhere) consumes one and resumes it. */
  private carried: RestlessGrief[] = [];
  /** Griefs the light dissolved since the engine last drained — the engine
   *  sweeps their standing spawns from the named zone (fade-out, no bounty). */
  private dissipated: { id: string; zoneId: string; color: string }[] = [];
  /** The reprieve: seconds until a fresh grief may settle again after one was
   *  FACED (resolveCooldownSeconds). 0 = no cooldown running. */
  private cooldownLeft = 0;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: HauntSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    // LIFECYCLE — the wheel first: outside its held hours a grief cannot keep
    // its shape (DISSIPATES, banking its wounds); inside them it WANES as a
    // dissolving boundary nears. Then the old clock: an unbroken haunt lapses
    // when its ttl runs out (drifts on, unrewarded); a BROKEN one holds until
    // the Wailing One falls — or the light carries it to another night.
    const ahead = phaseAhead(view.time);
    const holds = (p: DayPhase) => !this.cfg.holdPhases || this.cfg.holdPhases.includes(p);
    for (let i = this.haunts.length - 1; i >= 0; i--) {
      const h = this.haunts[i];
      if (!holds(ahead.phase) && !h.pinned) { this.dissipate(i); continue; }
      h.waneFrac = this.cfg.waneSeconds && !holds(ahead.next)
        ? Math.min(1, Math.max(0, 1 - ahead.endsIn / this.cfg.waneSeconds)) : 0;
      if (h.anchorBroken || h.pinned) continue;
      h.ttlLeft -= dt;
      if (h.ttlLeft <= 0) this.haunts.splice(i, 1);
    }
    // IGNITION — a fresh grief settles on some charted, hauntable ground,
    // only in its hours (beginPhases — the night gate), and never during the
    // reprieve a FACED grief bought (resolveCooldownSeconds).
    if (this.cooldownLeft > 0) this.cooldownLeft = Math.max(0, this.cooldownLeft - dt);
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.cooldownLeft <= 0
        && inPhases(view.time, this.cfg.beginPhases)
        && this.haunts.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  /** The light takes haunt #i: bank its progress (carryWound) and queue the
   *  engine sweep of its standing spawns. */
  private dissipate(i: number): void {
    const h = this.haunts[i];
    if ((this.cfg.carryWound ?? true) && (h.anchorBroken || h.anchorLifeFrac < 1)) {
      this.carried.push({
        anchorBroken: h.anchorBroken,
        anchorLifeFrac: h.anchorLifeFrac,
        bossLifeFrac: h.bossLifeFrac,
      });
    }
    this.dissipated.push({ id: h.id, zoneId: h.zoneId, color: this.cfg.color ?? HAUNT_PALE });
    this.haunts.splice(i, 1);
  }

  onNodeCharted(): void { /* griefs settle on already-charted ground only */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // the stream is engine-poured, not a table bias

  renderMap(): MapLayer {
    let over = '';
    for (const h of this.haunts) {
      const col = this.cfg.color ?? HAUNT_PALE;
      const x = h.coord.x.toFixed(1), y = h.coord.y.toFixed(1);
      // A slow, pale breath around the held zone — grief, not war. A waning
      // grief breathes thinner (the map echoes the in-world fade).
      const peak = (h.anchorBroken ? 0.95 : 0.7) * (1 - 0.6 * h.waneFrac);
      over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="1.6" stroke-opacity="${peak.toFixed(2)}">`
        + `<animate attributeName="stroke-opacity" values="0.15;${peak.toFixed(2)};0.15" dur="2.6s" repeatCount="indefinite"/></circle>`;
    }
    return { under: '', over };
  }

  // --- accessors the engine reads --------------------------------------------

  surge(): HauntSurge { return this.cfg; }

  /** The grief holding this zone, if any. */
  hauntOn(zoneId: string): HauntInfo | null {
    const h = this.haunts.find(x => x.zoneId === zoneId);
    if (!h) return null;
    return {
      id: h.id, anchorBroken: h.anchorBroken,
      streamInterval: this.cfg.streamInterval, maxAlive: this.cfg.maxAlive,
      levelBonus: this.cfg.levelBonus, roster: this.cfg.roster,
      anchorId: this.cfg.anchorId, bossId: this.cfg.bossId,
      bossLevelBonus: this.cfg.bossLevelBonus,
      color: this.cfg.color ?? HAUNT_PALE,
      waneFrac: h.waneFrac,
      anchorLifeFrac: h.anchorLifeFrac, bossLifeFrac: h.bossLifeFrac,
    };
  }

  /** The anchor fell: the haunt LOCKS (no lapse) until its grief is faced. */
  onAnchorBroken(id: string): void {
    const h = this.haunts.find(x => x.id === id);
    if (h) h.anchorBroken = true;
  }

  /** The Wailing One fell (or a dev lift): the grief releases the ground —
   *  and RESTS. A faced grief starts the resolve cooldown, the player's
   *  reprieve: the nights right after a commitment aren't wall-to-wall grief.
   *  (Only a real resolution cools — a stale id is a no-op.) */
  resolveHaunt(id: string): void {
    const before = this.haunts.length;
    this.haunts = this.haunts.filter(h => h.id !== id);
    if (this.haunts.length < before && this.cfg.resolveCooldownSeconds) {
      this.cooldownLeft = this.rng.range(
        this.cfg.resolveCooldownSeconds[0], this.cfg.resolveCooldownSeconds[1]);
    }
  }

  /** Seconds of reprieve left before griefs may settle again (QA / tests). */
  cooldownRemaining(): number { return this.cooldownLeft; }

  /** Engine sync (per frame, the Hunt's preserved-health pattern): the standing
   *  anchor's wound, remembered so a dawn — or a zone exit — keeps it. */
  setAnchorLife(id: string, frac: number): void {
    const h = this.haunts.find(x => x.id === id);
    if (h) h.anchorLifeFrac = Math.min(1, Math.max(0, frac));
  }

  /** Engine sync (per frame): the walking Wailing One's wound. */
  setBossLife(id: string, frac: number): void {
    const h = this.haunts.find(x => x.id === id);
    if (h) h.bossLifeFrac = Math.min(1, Math.max(0, frac));
  }

  /** Griefs the light dissolved since the last drain. The engine sweeps each
   *  one's standing spawns out of its named zone (fade-out, no bounty). */
  drainDissipated(): ReadonlyArray<{ id: string; zoneId: string; color: string }> {
    if (!this.dissipated.length) return this.dissipated;
    const out = this.dissipated;
    this.dissipated = [];
    return out;
  }

  activeCount(): number { return this.haunts.length; }

  /** Wounds waiting to ride the next settle (QA / tests). */
  carriedCount(): number { return this.carried.length; }

  /** Read-only snapshot for the map markers. */
  peek(): ReadonlyArray<{ id: string; x: number; y: number; broken: boolean; waneFrac: number }> {
    return this.haunts.map(h => ({
      id: h.id, x: h.coord.x, y: h.coord.y, broken: h.anchorBroken, waneFrac: h.waneFrac,
    }));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: settle a grief on the given zone immediately — PINNED (it ignores
   *  the wheel, so a day-time force holds; it still previews the wane pulse
   *  near a dissolving boundary). Consumes a banked wound like any settle,
   *  and bypasses the resolve cooldown (dev forces answer to no reprieve). */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.hauntable(z) || this.haunts.some(h => h.zoneId === zoneId)) return false;
    this.haunts.push(this.mintHaunt(z, 9999, /* pinned */ true));
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May a grief settle here? Ordinary combat ground only. */
  private hauntable(z: ZoneDef): boolean {
    return z.caveDepth == null && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed('haunting', z);
  }

  private tryIgnite(view: OverlayView): void {
    const taken = new Set(this.haunts.map(h => h.zoneId));
    const nodes = view.nodes.filter(n =>
      view.visited.has(n.id) && this.hauntable(n) && !taken.has(n.id));
    if (!nodes.length) return;
    const z = nodes[this.rng.int(0, nodes.length - 1)];
    this.haunts.push(this.mintHaunt(z, this.rng.range(this.cfg.ttlSeconds[0], this.cfg.ttlSeconds[1])));
  }

  /** Mint a settle on `z` — and if a banished grief's wounds are banked, the
   *  oldest RESUMES here (broken anchor stays broken, hurts stay taken). */
  private mintHaunt(z: ZoneDef, ttl: number, pinned?: boolean): ActiveHaunt {
    const c = this.carried.shift();
    return {
      id: `haunt_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      ttlLeft: ttl,
      anchorBroken: c?.anchorBroken ?? false,
      anchorLifeFrac: c?.anchorLifeFrac ?? 1,
      bossLifeFrac: c?.bossLifeFrac ?? 1,
      waneFrac: 0,
      pinned,
    };
  }
}

// --- map markers + zone-info (registered on import) ---------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const hf = world.sim.hauntField;
  if (!hf) return [];
  return hf.peek().map(h => ({
    id: `haunting-${h.id}`, coord: { x: h.x, y: h.y },
    glyph: '☽', fill: '#12141c', stroke: HAUNT_PALE, text: '#d8e0f0', r: 7,
    title: h.waneFrac > 0 ? 'A haunting thins in the coming light — it will not hold'
      : h.broken ? 'A grief UNBOUND — the Wailing One walks here'
        : 'A haunting holds this ground',
    fog: 'always', z: 16,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.hauntField?.hauntOn(zoneId);
  if (!info) return [];
  let detail = info.anchorBroken
    ? 'the anchor is broken — the Wailing One walks until it is faced'
    : 'a grief holds this ground: apparitions gather around its anchor';
  if (info.waneFrac > 0) detail += ' — the light comes; it cannot hold much longer';
  return [{
    kind: 'event', icon: '☽', color: info.color, label: 'Haunted',
    detail,
    z: 15,
  }];
});

// --- zone wash (registered on import): held ground runs COLD ------------------
// The dread made visible — a pale wash over the whole zone while the grief
// holds, thinning with the wane (the air warms as the light nears). Pure data:
// the surge's `wash` knob; no knob, no wash.
registerZoneWashSource((world: World) => {
  const hf = world.sim.hauntField;
  const wash = hf?.surge().wash;
  if (!hf || !wash) return null;
  const info = hf.hauntOn(world.zone.id);
  if (!info) return null;
  return { color: wash.color ?? info.color, alpha: wash.alpha * (1 - info.waneFrac) };
});
