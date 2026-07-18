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
import { eventTargetable } from '../../world/zonePolicy';
import { Rng } from '../../core/rng';
import { lordDef } from '../lords';
import type { ZoneDef } from '../../data/zones';
import { coordDist, type MapCoord } from '../../world/coords';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { registerEventFront } from '../../engine/eventWeather';
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
  /** The Underworld lord whose strike this is (attribution — null when the
   *  War Below isn't running, or the war had no live throne to send it). */
  lordId: string | null;
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
  /** The sending Underworld lord (the War Below's attribution) — the engine
   *  fields that lord's champion + texts; null keeps every legacy path. */
  lordId: string | null;
  /** The faction this strike FIELDS: the sending lord's host when attributed,
   *  else the type's first faction, else the Legion — resolved HERE so every
   *  engine consumer (epicenter, craters, storm bias) reads one truth. */
  faction: string;
  /** The strike's champion body: the sending lord's MARSHAL when attributed
   *  (the lord itself never leaves its throne), else null → the surge's
   *  legacy champion (the Balor). */
  champion: string | null;
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
  /** Durable: a festering invasion is the package's whole arc — its age (the
   *  stage ladder), its storm radius, and its minted epicenter zone all resume;
   *  minted ground rides the ownedZones claim (per instance, per dimension). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Demon Rifts';
  /** Which DIMENSION this instance governs (stamped by the sim at construction
   *  for non-surface instances — the per-dimension world-state seam). The
   *  overlay's own logic never reads it; the engine's drains/lookups do. */
  readonly dimension?: string;
  /** Mint seam the engine drains (host-only): the epicenter zone at its target
   *  coordinate. The portal-to-realm is read directly off invasionOn().portalReady. */
  readonly mintRequests: MintRequest[] = [];

  /** LORD ATTRIBUTION (wired by the sim's composition root when the War Below
   *  runs): every ignition asks WHO sent this strike — and in what shape — and
   *  every resolution reports the outcome home (repelled bleeds the sender's
   *  fronts; a festered burnout feeds them). Null = the legacy self-rolled
   *  flavor, byte-for-byte. */
  attribution: {
    pick(typeIds: string[]): { lordId: string; typeId: string } | null;
    resolved(lordId: string, outcome: 'repelled' | 'spoils'): void;
  } | null = null;

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
    // Burn out invasions that festered past the lifetime cap (utterly ignored) —
    // a festered strike SUCCEEDED: its lord's spoils flow home to the war below.
    for (let i = this.invasions.length - 1; i >= 0; i--) {
      if (this.invasions[i].age < this.cfg.maxLifeSec) continue;
      const [gone] = this.invasions.splice(i, 1);
      if (gone.lordId) this.attribution?.resolved(gone.lordId, 'spoils');
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
    // The resolved strike faction (a lord's host when attributed) leads the
    // bias; the type's own list still tilts for multi-faction flavors.
    const factionMul: Record<string, number> = { [info.faction]: this.cfg.stormFactionMul };
    for (const f of info.type.factions ?? []) factionMul[f] = this.cfg.stormFactionMul;
    // An attributed strike also SEEDS its host among the walk-ins — the
    // banner is readable in the monsters, not just on the map.
    return { countMul: 1, factionMul, injectFactions: info.lordId ? [info.faction] : [] };
  }

  renderMap(nodes: ZoneDef[]): MapLayer {
    let under = '', over = '';
    for (const inv of this.invasions) {
      const bound = inv.zoneId ? nodes.find(n => n.id === inv.zoneId) : null;
      const cx = bound ? bound.map.x : inv.coord.x;
      const cy = bound ? bound.map.y : inv.coord.y;
      const col = (inv.lordId ? lordDef(inv.lordId)?.color : undefined) ?? inv.type.color ?? DEMON_RED;
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
      const lord = inv.lordId ? lordDef(inv.lordId) : undefined;
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
        // An attributed strike flies its LORD'S banner: color, host faction,
        // and marshal (lords.ts is a pure data leaf — no coupling to the war
        // overlay itself). Unattributed keeps every legacy value.
        color: lord?.color ?? inv.type.color ?? DEMON_RED,
        lordId: inv.lordId,
        faction: lord?.faction ?? inv.type.factions?.[0] ?? 'demon',
        champion: lord?.marshal ?? null,
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
    const [gone] = this.invasions.splice(idx, 1);
    // Every resolve path is a BROKEN strike (epicenter kill, realm kill, or a
    // surface conquest swallowing the rift) — the sending lord pays for it.
    if (gone.lordId) this.attribution?.resolved(gone.lordId, 'repelled');
    return mul;
  }

  /** Read-only snapshot for tests / HUD. */
  activeCount(): number { return this.invasions.length; }
  peek(): ReadonlyArray<{ id: string; type: string; age: number; radius: number; zoneId: string | null; stageIdx: number }> {
    return this.invasions.map(i => ({ id: i.id, type: i.type.id, age: i.age, radius: i.radius, zoneId: i.zoneId, stageIdx: this.stageIdxFor(i) }));
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: each invasion stores its TYPE BY ID (rebound against the live
   *  surge on restore, so a re-tuned flavor applies to a resumed storm), plus
   *  any undrained mints and the namespaced counter. `ownedZones` claims every
   *  bound epicenter zone — minted rift ground rides the save. */
  snapshot(): unknown {
    return {
      ownedZones: this.invasions.map(i => i.zoneId).filter((z): z is string => !!z),
      invasions: this.invasions.map(i => ({
        id: i.id, typeId: i.type.id, coord: { ...i.coord }, anchorZoneId: i.anchorZoneId,
        zoneId: i.zoneId, age: i.age, radius: i.radius, minted: i.minted, lordId: i.lordId,
      })),
      mintRequests: this.mintRequests.map(m => ({ ...m, coord: { ...m.coord } })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { invasions?: unknown[]; mintRequests?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (num(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (Array.isArray(s.invasions)) {
      this.invasions = [];
      for (const raw of s.invasions) {
        const i = raw as { id?: unknown; typeId?: unknown; coord?: { x?: unknown; y?: unknown }; anchorZoneId?: unknown; zoneId?: unknown; age?: unknown; radius?: unknown; minted?: unknown } | null;
        if (!i || typeof i.id !== 'string' || typeof i.typeId !== 'string') continue;
        const type = this.cfg.types.find(t => t.id === i.typeId);
        if (!type) continue; // the flavor left the surge — that storm is spent
        if (!i.coord || !num(i.coord.x) || !num(i.coord.y) || !num(i.age) || !num(i.radius)) continue;
        if (typeof i.anchorZoneId !== 'string') continue;
        this.invasions.push({
          id: i.id, type, coord: { x: i.coord.x, y: i.coord.y }, anchorZoneId: i.anchorZoneId,
          zoneId: typeof i.zoneId === 'string' ? i.zoneId : null,
          age: Math.max(0, i.age), radius: Math.max(0, i.radius), minted: !!i.minted,
          lordId: typeof (i as { lordId?: unknown }).lordId === 'string' ? (i as { lordId: string }).lordId : null,
        });
      }
    }
    if (Array.isArray(s.mintRequests)) {
      this.mintRequests.length = 0;
      const live = new Set(this.invasions.map(i => i.id));
      for (const raw of s.mintRequests) {
        const m = raw as Partial<MintRequest> | null;
        if (!m || typeof m.invId !== 'string' || !live.has(m.invId)) continue;
        if (typeof m.zoneKey !== 'string' || typeof m.tileset !== 'string' || typeof m.anchorZoneId !== 'string') continue;
        if (!m.coord || !num(m.coord.x) || !num(m.coord.y) || !num(m.level)) continue;
        this.mintRequests.push({
          invId: m.invId, coord: { x: m.coord.x, y: m.coord.y },
          anchorZoneId: m.anchorZoneId, zoneKey: m.zoneKey, tileset: m.tileset, level: m.level,
        });
      }
    }
  }

  /** An invasion whose bound zone the sanitizer culled (claims make this rare)
   *  unbinds and re-queues its mint — the storm re-tears its ground rather
   *  than raining forever on a void. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const inv of this.invasions) {
      if (inv.anchorZoneId && !has(inv.anchorZoneId)) inv.anchorZoneId = '';
      if (inv.zoneId && !has(inv.zoneId)) {
        inv.zoneId = null;
        inv.minted = false;
        this.mintRequests.push({
          invId: inv.id, coord: { ...inv.coord }, anchorZoneId: inv.anchorZoneId,
          zoneKey: `demon_${inv.id}`, tileset: this.cfg.epicenterTileset,
          level: Math.max(1, this.nodesById[inv.anchorZoneId]?.level ?? 1),
        });
      }
    }
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
    // THE shared predicate (zonePolicy): never seize a safe town, a cave, a
    // floating node, a special arena, or biome-forbidden ground as an epicenter.
    if (!here || !eventTargetable(this.id, here)) return false;
    const strike = this.rollStrike();
    this.invasions.push({
      id: `inv_${this.idTag}${this.seq++}`, type: strike.type, lordId: strike.lordId,
      coord: { x: here.map.x, y: here.map.y }, anchorZoneId: zoneId, zoneId,
      age: 0, radius: this.cfg.startRadius, minted: true,
    });
    return true;
  }

  /** WHO strikes, in WHAT shape: the War Below's attribution when wired (the
   *  lord's preferred flavor among this surge's types), else the legacy
   *  self-rolled weighted flavor — byte-identical when the war is absent. */
  private rollStrike(): { type: InvasionType; lordId: string | null } {
    if (this.attribution) {
      const pick = this.attribution.pick(this.cfg.types.map(t => t.id));
      const type = pick ? this.cfg.types.find(t => t.id === pick.typeId) : undefined;
      if (pick && type) return { type, lordId: pick.lordId };
    }
    return { type: this.rng.weighted(this.cfg.types), lordId: null };
  }

  private maybeIgnite(view: OverlayView): void {
    const g = this.gate();
    if (this.invasions.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.triggerChance * g.ignitionMul, 0, 1))) return;
    // Roll a COORDINATE within the MINTED WORLD's bounding box (+ a small
    // spread past its rim). With the forechart's veiled halo the minted world
    // reaches many steps past the walked map — an invasion may now erupt in
    // country the player has never seen and FESTER there (its storm veil and
    // stage ladder are its own announcement as they approach). It need NOT
    // land on a node: if one sits there it SEIZES it; otherwise it SIMULATES
    // a floating epicenter at the coordinate (no forced road trail).
    // (The box was sized by `visited` before the forechart existed — the halo
    // is the new, wider "world that exists to erupt in".)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, seen = 0;
    for (const n of view.nodes) {
      if (n.caveDepth != null) continue;
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
    const strike = this.rollStrike();
    const id = `inv_${this.idTag}${this.seq++}`;
    this.invasions.push({
      id, type: strike.type, lordId: strike.lordId, coord, anchorZoneId,
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
      // THE shared predicate (zonePolicy): the epicenter must be real, hostile,
      // biome-permitted ground — never a sanctuary, cave, arena, or event turf.
      if (z.id === anchorId || !eventTargetable(this.id, z)) continue;
      const d = coordDist(z.map, c);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }
}

// --- the pinned sky (registered on import) -----------------------------------
//
// THE DEMON STORM AS WEATHER (engine/eventWeather.ts): every zone the storm
// radius covers reads the stage's `weather` row through World.skyFront — the
// crimson veil, ember wind, bent radiance and the temporary occupation dress
// all ride the ordinary weather stack, and all of it LIFTS when the invasion
// breaks. Sanctuaries keep their own sky (the meteor gate's same courtesy);
// sheltered ground (caves, interiors, roofed dimensions) is already refused
// upstream by skyFront itself.
registerEventFront({
  id: 'demon_invasion',
  sample: (world: World, zone: ZoneDef) => {
    if (zone.objective.kind === 'safe') return null;
    const info = world.sim.demonFieldFor(zone.dimension)?.invasionOn(zone.id);
    return info?.stage.weather ?? null;
  },
});

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
  // An attributed strike is announced under its LORD'S name — the surface
  // reads WHO is reaching up from below, not just what shape the reach takes.
  const lord = inv.lordId ? lordDef(inv.lordId) : undefined;
  return [{
    kind: 'event',
    icon: inv.isEpicenter ? '★' : '✸',
    color: inv.color,
    label: inv.isEpicenter ? `${inv.type.label} — epicenter` : inv.type.label,
    detail: [lord ? `sent by ${lord.short}` : '', inv.stage.label, inv.isEpicenter && inv.portalReady ? 'portal open' : '']
      .filter(Boolean).join(' · '),
    z: inv.isEpicenter ? 19 : 12,
  }];
});
