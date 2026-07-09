// ---------------------------------------------------------------------------
// HAUNT FIELD — a restless GRIEF that settles on one charted zone (pure overlay).
//
// No march, no territory: every so often a haunting simply TAKES a place. While
// it holds, the zone runs cold — apparitions stream in around a standing
// GRIEF-ANCHOR (the engine spawns both off hauntOn()). The knot unties two
// ways: wait it out (the ttl lapses, the grief drifts on, no reward), or BREAK
// THE ANCHOR — which does not end it. Breaking the anchor MANIFESTS the
// Wailing One, and only its fall lifts the haunt (the reward path). A broken-
// anchor haunt never expires: grief faced must be finished.
//
// PURE of the engine: owns the settle/lapse lifecycle; the engine reads
// hauntOn() to field the anchor + the stream, and calls onAnchorBroken()/
// resolveHaunt() back through the kill-handler rows in defs/haunting.ts.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
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
}

interface ActiveHaunt {
  id: string;
  zoneId: string;
  coord: MapCoord;
  ttlLeft: number;
  anchorBroken: boolean;
}

export class HauntField implements WorldOverlay {
  readonly id = 'haunting';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: HauntSurge;
  private haunts: ActiveHaunt[] = [];
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, surge: HauntSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    // LIFECYCLE — an unbroken haunt lapses when its ttl runs out (the grief
    // drifts on, unrewarded). A BROKEN one holds until the Wailing One falls.
    for (let i = this.haunts.length - 1; i >= 0; i--) {
      const h = this.haunts[i];
      if (h.anchorBroken) continue;
      h.ttlLeft -= dt;
      if (h.ttlLeft <= 0) this.haunts.splice(i, 1);
    }
    // IGNITION — a fresh grief settles on some charted, hauntable ground.
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (g.active
        && this.haunts.length < scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)
        && this.rng.chance(this.cfg.igniteChance * g.ignitionMul)) {
        this.tryIgnite(view);
      }
    }
  }

  onNodeCharted(): void { /* griefs settle on already-charted ground only */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // the stream is engine-poured, not a table bias

  renderMap(): MapLayer {
    let over = '';
    for (const h of this.haunts) {
      const col = this.cfg.color ?? HAUNT_PALE;
      const x = h.coord.x.toFixed(1), y = h.coord.y.toFixed(1);
      // A slow, pale breath around the held zone — grief, not war.
      over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${col}" stroke-width="1.6" stroke-opacity="${h.anchorBroken ? 0.95 : 0.7}">`
        + `<animate attributeName="stroke-opacity" values="0.25;${h.anchorBroken ? 0.95 : 0.7};0.25" dur="2.6s" repeatCount="indefinite"/></circle>`;
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
    };
  }

  /** The anchor fell: the haunt LOCKS (no lapse) until its grief is faced. */
  onAnchorBroken(id: string): void {
    const h = this.haunts.find(x => x.id === id);
    if (h) h.anchorBroken = true;
  }

  /** The Wailing One fell (or a dev lift): the grief releases the ground. */
  resolveHaunt(id: string): void {
    this.haunts = this.haunts.filter(h => h.id !== id);
  }

  activeCount(): number { return this.haunts.length; }

  /** Read-only snapshot for the map markers. */
  peek(): ReadonlyArray<{ id: string; x: number; y: number; broken: boolean }> {
    return this.haunts.map(h => ({ id: h.id, x: h.coord.x, y: h.coord.y, broken: h.anchorBroken }));
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: settle a grief on the given zone immediately. */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.hauntable(z) || this.haunts.some(h => h.zoneId === zoneId)) return false;
    this.haunts.push({
      id: `haunt_${this.seq++}`, zoneId, coord: { x: z.map.x, y: z.map.y },
      ttlLeft: 9999, anchorBroken: false,
    });
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
    this.haunts.push({
      id: `haunt_${this.seq++}`,
      zoneId: z.id, coord: { x: z.map.x, y: z.map.y },
      ttlLeft: this.rng.range(this.cfg.ttlSeconds[0], this.cfg.ttlSeconds[1]),
      anchorBroken: false,
    });
  }
}

// --- map markers + zone-info (registered on import) ---------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const hf = world.sim.hauntField;
  if (!hf) return [];
  return hf.peek().map(h => ({
    id: `haunting-${h.id}`, coord: { x: h.x, y: h.y },
    glyph: '☽', fill: '#12141c', stroke: HAUNT_PALE, text: '#d8e0f0', r: 7,
    title: h.broken ? 'A grief UNBOUND — the Wailing One walks here' : 'A haunting holds this ground',
    fog: 'always', z: 16,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.hauntField?.hauntOn(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '☽', color: info.color, label: 'Haunted',
    detail: info.anchorBroken
      ? 'the anchor is broken — the Wailing One walks until it is faced'
      : 'a grief holds this ground: apparitions gather around its anchor',
    z: 15,
  }];
});
