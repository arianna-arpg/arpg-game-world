// ---------------------------------------------------------------------------
// DEMON INVASION FIELD — the spatial, escalating demon world-event (pure overlay).
//
// Unlike Breach (a per-zone timer) a Demon Invasion lives in NODE-SPACE: when it
// ignites it picks a nearby map COORDINATE (charted or NOT — to pull the player
// to explore toward it), then grows a storm RADIUS over time. The longer it
// festers the STRONGER + WIDER it gets — and that escalation is pure DATA: a
// TYPE rolled at ignition (the flavor) and a STAGE ladder walked by elapsed age
// (the severity), both on the DemonSurge config. The clock runs from ignition
// REGARDLESS of whether the player has charted the epicenter (true urgency); the
// actual meteors / Balor only MATERIALIZE once the player enters an affected
// zone (the engine reads invasionOn/isMeteorZone and acts — this overlay never
// touches World). Minting the epicenter at an uncharted coord and the portal-to-
// realm are engine work drained off mintRequests / portalRequests (Phases 3-4).
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import { coordDist, type MapCoord } from '../../world/coords';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import type { World } from '../../engine/world';
import { scaledCap } from '../frequency';
import type { DemonSurge, InvasionStage, InvasionType } from '../encounters';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;            // fixed ignition cadence (seconds)
const BIND_FLOOR = 52;       // a charted node this close to the epicenter IS it
const DEMON_RED = '#e8503c';

/** A live invasion: an epicenter coordinate + the clock that escalates it. */
interface ActiveInvasion {
  id: string;
  type: InvasionType;
  coord: MapCoord;
  /** The charted node the epicenter was projected from (the mint anchor). */
  anchorZoneId: string;
  /** The bound epicenter zone id (a near charted node, or minted in Phase 3). */
  zoneId: string | null;
  age: number;
  radius: number;
  minted: boolean;        // Phase 3 mint guard
}

/** What an invasion does to one zone, resolved for the engine to materialize. */
export interface InvasionInfo {
  id: string;
  type: InvasionType;
  stageIdx: number;
  stage: InvasionStage;
  /** Type-scaled, rounded added monster level for this invasion's demons. */
  strengthBonus: number;
  /** Type + pressure scaled meteor strikes per second. */
  meteorRatePerSec: number;
  /** Chance a meteor impact spawns a demon / leaves a raisable corpse. */
  meteorSpawnChance: number;
  /** Reward multiplier for repelling at the current stage (risk→reward). */
  rewardMul: number;
  /** Is this zone the bound EPICENTER (the Balor's seat), not just in-radius? */
  isEpicenter: boolean;
  /** Has this invasion festered long enough to tear a portal to the realm? */
  portalReady: boolean;
  color: string;
}

/** Engine-drained: mint a demon-blighted epicenter zone at an uncharted coord. */
export interface MintRequest {
  invId: string;
  coord: MapCoord;
  anchorZoneId: string;
  zoneKey: string;
  tileset: string;
  level: number;
}

export class DemonInvasionField implements WorldOverlay {
  readonly id = 'demon_invasion';
  readonly mapLabel = 'Demon Rifts';
  /** Which DIMENSION this instance governs (stamped by the sim at construction
   *  for non-surface instances — the per-dimension world-state seam). The
   *  overlay's own logic never reads it; the engine's drains/lookups do. */
  readonly dimension?: string;
  /** Mint seam the engine drains (host-only): the epicenter zone at its target
   *  coordinate. The portal-to-realm is read directly off invasionOn().portalReady. */
  readonly mintRequests: MintRequest[] = [];

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: DemonSurge;
  private invasions: ActiveInvasion[] = [];
  private acc = 0;
  private seq = 0;
  /** NAMESPACES ids/zone-keys per instance: a hell instance mints
   *  `inv_underworld_0` / `demon_inv_underworld_0` while the surface keeps the
   *  legacy `inv_0`. Without it, both instances' counters walked 0,1,2… — a
   *  hell epicenter's zoneKey collided with an old surface demon zone (the
   *  drain BOUND hell's invasion to the surface zone: no Balor, no portal),
   *  and a realm kill's resolve-by-id hit BOTH dimensions' `inv_3`. */
  private readonly idTag: string;
  /** Last view's node map, for distance lookups outside update(). */
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: DemonSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.idTag = ctx.dimension && ctx.dimension !== 'surface' ? `${ctx.dimension}_` : '';
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    // Advance the urgency clock + grow the radius for every live invasion. The
    // clock runs even while the package gate is shut (a closed gate only stops
    // NEW ignitions and zeroes the materialized severity via severityMul 0).
    // severityMul = pressure × frequency.severity (the global SIZE crank).
    const pressure = g.severityMul;
    for (const inv of this.invasions) {
      inv.age += dt * inv.type.ageScale;
      const stage = this.stageFor(inv);
      const target = Math.min(this.cfg.maxRadius,
        (this.cfg.startRadius + stage.radiusBonus) * (0.6 + 0.4 * clamp(pressure, 0, 1.5)));
      if (inv.radius < target) {
        inv.radius = Math.min(target, inv.radius + this.cfg.radiusGrowthPerSec * dt);
      }
    }
    // Burn out invasions that festered past the lifetime cap (utterly ignored).
    for (let i = this.invasions.length - 1; i >= 0; i--) {
      if (this.invasions[i].age >= this.cfg.maxLifeSec) this.invasions.splice(i, 1);
    }
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeIgnite(view); }
  }

  onNodeCharted(): void { /* invasions target coordinates, not freshly-charted ids */ }

  affectSpawns(zone: ZoneDef): SpawnBias {
    // In-radius zones tilt their walk-in spawns toward demons — the storm bleeds
    // into the ordinary monster mix, compounding the felt invasion. The epicenter
    // pack + meteors are materialized by the engine; this is just ambient bias.
    const info = this.invasionOn(zone.id);
    if (!info) return NO_BIAS;
    const factionMul: Record<string, number> = {};
    for (const f of info.type.factions ?? ['demon']) factionMul[f] = 1.6;
    return { countMul: 1, factionMul, injectFactions: [] };
  }

  renderMap(nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    for (const inv of this.invasions) {
      const bound = inv.zoneId ? nodes.find(n => n.id === inv.zoneId) : null;
      const cx = bound ? bound.map.x : inv.coord.x;
      const cy = bound ? bound.map.y : inv.coord.y;
      const col = inv.type.color ?? DEMON_RED;
      // The growing storm reach — a dashed ring + a soft wash that swell with age.
      under += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${inv.radius.toFixed(1)}" `
        + `fill="${col}" fill-opacity="0.07" stroke="${col}" stroke-opacity="0.5" `
        + `stroke-width="1.5" stroke-dasharray="5 5"/>`;
      // The epicenter mark — a pulsing star (hollow when still uncharted).
      over += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="11" fill="none" `
        + `stroke="${col}" stroke-width="2" stroke-opacity="0.9"><animate attributeName="r" `
        + `values="8;13;8" dur="1.6s" repeatCount="indefinite"/></circle>`;
      over += `<text x="${cx.toFixed(1)}" y="${(cy + 5).toFixed(1)}" text-anchor="middle" `
        + `font-size="14" fill="${col}">✶</text>`;
    }
    return { under, over };
  }

  // --- accessors the engine reads to materialize the event -------------------

  /** Live config (the engine reads meteorSkillId / telegraph / portal). */
  surge(): DemonSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): an active
   *  demon invasion is heavy turmoil. */
  activityAt(zoneId: string): number { return this.invasionOn(zoneId) ? 2 : 0; }

  /** The strongest invasion affecting a zone (in-radius or its epicenter), with
   *  type + pressure scaled severity — null when the zone is untouched. */
  invasionOn(zoneId: string): InvasionInfo | null {
    const z = this.nodesById[zoneId]; // may be undefined for a just-minted epicenter
    const pressure = this.gate().severityMul; // meteor rate scales with the SIZE crank
    let best: InvasionInfo | null = null;
    for (const inv of this.invasions) {
      const isEpicenter = inv.zoneId === zoneId;
      // The epicenter always counts; an in-radius test needs the node's coord.
      const within = isEpicenter
        || (!!z && coordDist(z.map, inv.coord) <= inv.radius + this.cfg.inRadiusSlack);
      if (!within) continue;
      const stageIdx = this.stageIdxFor(inv);
      const stage = this.cfg.stages[stageIdx];
      const info: InvasionInfo = {
        id: inv.id, type: inv.type, stageIdx, stage,
        strengthBonus: Math.round(stage.strengthBonus * inv.type.strengthMul),
        meteorRatePerSec: stage.meteorRatePerSec * inv.type.meteorMul * (0.5 + 0.5 * clamp(pressure, 0, 1.5)),
        meteorSpawnChance: stage.meteorSpawnChance,
        rewardMul: stage.rewardMul,
        isEpicenter,
        // The current stage must explicitly allow a portal (data-driven: a late
        // stage could suppress it) AND the age must cross the portal threshold.
        portalReady: !!stage.opensPortal && inv.age >= this.cfg.portal.atSeconds,
        color: inv.type.color ?? DEMON_RED,
      };
      // Prefer the epicenter, else the higher stage (the more dangerous one wins).
      if (!best || (info.isEpicenter && !best.isEpicenter) || info.stageIdx > best.stageIdx) best = info;
    }
    return best;
  }

  /** Does a Demon Storm rain on this zone right now? */
  isMeteorZone(zoneId: string): boolean {
    const info = this.invasionOn(zoneId);
    return !!info && info.meteorRatePerSec > 0;
  }

  /** Tell the overlay the real id of a minted/bound epicenter zone (Phase 3). */
  bindTarget(invId: string, zoneId: string): void {
    const inv = this.invasions.find(i => i.id === invId);
    if (inv) { inv.zoneId = zoneId; inv.minted = true; }
  }

  /** Drop an invasion the player has REPELLED (the engine calls this on the
   *  epicenter encounter closing). Returns the reward multiplier earned. */
  resolveInvasion(zoneId: string): number {
    return this.dropInvasion(this.invasions.findIndex(i => i.zoneId === zoneId));
  }

  /** Drop an invasion by its id (the demon-realm Balor's death resolves the
   *  OVERWORLD invasion it spawned from, even though the realm is off-graph). */
  resolveInvasionById(invId: string): number {
    return this.dropInvasion(this.invasions.findIndex(i => i.id === invId));
  }

  private dropInvasion(idx: number): number {
    if (idx < 0) return 1;
    const mul = this.cfg.stages[this.stageIdxFor(this.invasions[idx])].rewardMul;
    this.invasions.splice(idx, 1);
    return mul;
  }

  /** Read-only snapshot for tests / HUD. */
  activeCount(): number { return this.invasions.length; }
  peek(): ReadonlyArray<{ id: string; type: string; age: number; radius: number; zoneId: string | null; stageIdx: number }> {
    return this.invasions.map(i => ({ id: i.id, type: i.type.id, age: i.age, radius: i.radius, zoneId: i.zoneId, stageIdx: this.stageIdxFor(i) }));
  }

  // --- internals -------------------------------------------------------------

  private stageIdxFor(inv: ActiveInvasion): number {
    let idx = 0;
    for (let i = 0; i < this.cfg.stages.length; i++) {
      if (inv.age >= this.cfg.stages[i].atSeconds) idx = i; else break;
    }
    return idx;
  }

  private stageFor(inv: ActiveInvasion): InvasionStage {
    return this.cfg.stages[this.stageIdxFor(inv)];
  }

  /** DEV: force an invasion whose epicenter IS the given (current) zone — instant,
   *  in-place, no gate/RNG/floating-mint. The engine's materializeLiveZoneEvents
   *  spawns the Balor next frame. (QA only; see dev/gemSpawner.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    // Mirror the production filter (+ the sibling dev seams): never seize a safe
    // town, a cave, or a floating node as an epicenter.
    if (!here || here.caveDepth != null || here.floating || here.eventOwned || here.objective.kind === 'safe') return false;
    this.invasions.push({
      id: `inv_${this.idTag}${this.seq++}`, type: this.rng.weighted(this.cfg.types),
      coord: { x: here.map.x, y: here.map.y }, anchorZoneId: zoneId, zoneId,
      age: 0, radius: this.cfg.startRadius, minted: true,
    });
    return true;
  }

  private maybeIgnite(view: OverlayView): void {
    const g = this.gate();
    if (this.invasions.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.triggerChance * g.ignitionMul, 0, 1))) return;
    // Roll a COORDINATE within the VISIBLE map's bounding box (the extent the
    // player's map actually shows, + a small spread past the frontier). The
    // invasion thus erupts WITHIN what the player can see — never 1000 nodes off
    // in the unexplored void — but it need NOT land on a charted node: if a node
    // already sits there it SEIZES it; otherwise it SIMULATES a floating
    // epicenter at the coordinate (no forced road trail, like a crusade banner).
    // (`visited` only sizes the box here — it does NOT gate the coordinate, so the
    // epicenter can be uncharted ground inside the visible frontier.)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, seen = 0;
    for (const n of view.nodes) {
      if (!view.visited.has(n.id) || n.caveDepth != null) continue;
      seen++;
      if (n.map.x < minX) minX = n.map.x; if (n.map.x > maxX) maxX = n.map.x;
      if (n.map.y < minY) minY = n.map.y; if (n.map.y > maxY) maxY = n.map.y;
    }
    if (!seen) return;
    const pad = this.cfg.epicenter.spread;
    const sample = (): MapCoord => ({
      x: this.rng.range(minX - pad, maxX + pad),
      y: this.rng.range(minY - pad, maxY + pad),
    });
    // BIAS the coordinate near/away from the player's current zone (tunable): roll
    // several candidates, sort by distance to here, then skew the pick toward the
    // nearest (bias>0) or the farthest (bias<0). bias 0 = uniform.
    const here = view.byId[view.currentZoneId];
    const bias = this.cfg.epicenter.bias;
    let coord: MapCoord;
    if (here && bias !== 0) {
      const cands: MapCoord[] = [];
      for (let i = 0; i < 8; i++) cands.push(sample());
      cands.sort((a, b) => coordDist(a, here.map) - coordDist(b, here.map)); // nearest first
      let u = this.rng.next();
      const k = Math.abs(bias) * 3;
      u = bias > 0 ? Math.pow(u, 1 + k) : 1 - Math.pow(1 - u, 1 + k); // toward 0 (near) / 1 (far)
      coord = cands[Math.min(cands.length - 1, Math.floor(u * cands.length))];
    } else {
      coord = sample();
    }
    // Seize an existing node sitting ~on the coordinate (ANY node, charted or
    // not — never gated on `visited`), else simulate a floating epicenter there.
    const near = this.nearestChartedNode(coord, view, '');
    const zoneId = near && coordDist(near.map, coord) <= BIND_FLOOR ? near.id : null;
    const anchorZoneId = near?.id ?? view.currentZoneId;
    const type = this.rng.weighted(this.cfg.types);
    const id = `inv_${this.idTag}${this.seq++}`;
    this.invasions.push({
      id, type, coord, anchorZoneId,
      zoneId, age: 0, radius: this.cfg.startRadius, minted: zoneId !== null,
    });
    // No node at the coordinate → mint a FLOATING demon-blighted zone there (the
    // engine drains this; floating ⇒ no forced trail, a road forms as the player
    // explores toward it). Level floored at the character's so it's always a
    // credible threat even in a low-level backwater.
    if (zoneId === null) {
      this.mintRequests.push({
        invId: id, coord, anchorZoneId, zoneKey: `demon_${id}`,
        tileset: this.cfg.epicenterTileset, level: Math.max(near?.level ?? view.charLevel, view.charLevel),
      });
    }
  }

  private nearestChartedNode(c: MapCoord, view: OverlayView, anchorId: string): ZoneDef | null {
    let best: ZoneDef | null = null, bd = Infinity;
    for (const z of view.nodes) {
      // Never seize a sanctuary (the safe town), a cave, or a not-yet-wired
      // floating zone — the epicenter must be real, hostile ground.
      if (z.caveDepth != null || z.id === anchorId || z.floating || z.eventOwned || z.objective.kind === 'safe') continue;
      const d = coordDist(z.map, c);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }
}

// --- zone-info row (registered on import) ------------------------------------
//
// A Demon Invasion renders as a map LAYER (the storm ring + epicenter star), not
// a marker, so it would be invisible in the World Map's zone-info box. This adds
// a structured row off the SAME public accessor the engine reads (invasionOn) —
// the epicenter, or the in-radius stage, with its severity in the detail.
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  // Resolve the instance governing the ZONE'S dimension (a hell zone reads
  // hell's invasion, never the surface field's empty ledger).
  const inv = world.sim.demonFieldFor(world.zoneMap[zoneId]?.dimension)?.invasionOn(zoneId);
  if (!inv) return [];
  return [{
    kind: 'event',
    icon: inv.isEpicenter ? '★' : '✸',
    color: inv.color,
    label: inv.isEpicenter ? `${inv.type.label} — epicenter` : inv.type.label,
    detail: inv.isEpicenter && inv.portalReady ? `${inv.stage.label} · portal open` : inv.stage.label,
    z: inv.isEpicenter ? 19 : 12,
  }];
});
