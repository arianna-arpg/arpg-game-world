// ---------------------------------------------------------------------------
// MYCELIA FIELD — THE SPORE FRONT: an ANCHORED place-network (pure overlay).
//
// The fungal 'mycelia' biome is the FOUNDATION of a living network. The bloom
// feeds on EVENTS in/near its ground: enough nearby turmoil and it FLARES,
// claiming zones outward from its home along the EXISTING zone-graph edges —
// nodes and edges, a structural web whose drawn map read IS the claim tree
// (strokes along the edges it grew through, never a gradient). The network is
// ANCHORED BY LAW: the home never relocates, never warps the land, never
// abandons its foundation — and that foundation is exactly why it can be
// EATEN FROM (the containment asymmetry vs the mobile Contagion): every claim
// is attackable ground. Culling the fungal in a zone drops its grip; a zone
// cleansed to nothing is CUT from the tree, and every claim whose only path
// home ran through it WITHERS the same beat — fragmentation is the gameplay
// surface. Cut the whole web back to its home and the bloom falls dormant
// (pushed back); fell the Heartbloom at the foundation and it collapses
// outright, filaments retracting ring by ring.
//
// THE EXPRESSION: on occasion, spore-held ground EXPRESSES — the biome never
// changes or shifts, but for a window the zone reads as if the fungus is
// really spreading from its own biome: SPOREFALL stands over it (an eventOnly
// weather row pinned via registerEventFront — wash, radiance, wind and the
// TEMPORARY fungal dress all riding the standing weather stack, dissolving
// via Doodad.evap as the front passes), and the fungal season the zone's own
// spawn rolls (affectSpawns — table seasoning inside the zone's own budget,
// never a threat spike). The transience doctrine binds every lane: nothing
// here marks the land (transformedZones() is EMPTY BY LAW — the old
// saturation warp is retired; world.ts' reconcile heals legacy warps to
// nothing on its first tick).
//
// PURE of the engine: it owns the claim tree + the state machine. The engine
// FEEDS per-zone event activity (setEventActivity, bounded to interestZones),
// reads sporeOn()/heartbloomIn()/suppressionAt() to materialize + suppress,
// and calls cull()/onHeartbloomSlain() back. Crusade's territory grammar on
// a graph: hidden machinery, walkable claims, liberation that fragments.
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import { registerEventFront } from '../../engine/eventWeather';
import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { SPORE_COLORS } from '../../world/palette';
import { registerGroundClaim } from '../groundClaims';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5; // fixed lifecycle cadence (seconds)

/** The whole Mycelia mechanic as data — every number a knob. */
export interface MyceliaSurge {
  /** Per-STEP chance the dormant bloom IGNITES once a home biome region is charted. */
  igniteChance: number;
  /** flareCharge needed to flare out (DORMANT → spreading). */
  flareThreshold: number;
  /** flareCharge gained per unit of nearby event-activity per second. */
  flareFeed: number;
  /** flareCharge bled per second (so a starved network stops grasping). */
  flareDecay: number;
  /** Seconds (÷severity) between the network claiming ONE more zone. */
  spreadInterval: number;
  /** Claim reach cap in tree hops from the home (grip = 1 − hops/maxHops). */
  maxHops: number;
  minIntensity: number;
  /** Per-second passive grip fade on non-home claims (hold ground by feeding). */
  densityDecay: number;
  /** Grip a fresh DORMANT home seed starts at (the faint foundation patch). */
  seedDensity: number;
  /** THE BOUND: most zones the network may hold at once, home included — the
   *  anchored web never eats its own tail; at the cap it simply stops
   *  grasping until decay or the player's culls free a claim. */
  claimCap: number;
  /** Grip lost per fungal kill on a claim (the player eating the network back). */
  cullDensity: number;
  /** Seconds between the withdraw retracting one ring (the Heartbloom collapse). */
  recedeInterval: number;
  /** How hard a claim's grip smothers a zone's events (1 − grip×this, floored). */
  suppressPerDensity: number;
  suppressFloor: number;
  /** The biome this network is anchored in (a 2nd influence-biome reuses this
   *  overlay as pure data). Defaults to 'mycelia'. */
  homeBiome: string;
  faction: string;
  /** The toggleable foundation boss (default ON). The Heartbloom holds the HOME;
   *  striking it FORCES the collapse. promoteAt: zone level the full `promote`
   *  rarity is EARNED at (below it the bloom stands champion instead). */
  heartbloom: { enabled: boolean; defId: string; promote: 'none' | 'champion' | 'crowned'; promoteAt?: number };
  /** THE EXPRESSION — the occasional loud window on spore-held ground.
   *  All numbers FLAGGED (coordinator's, awaiting the user's word). */
  express: {
    /** Per-STEP chance (while spreading + off cooldown) a claim expresses. */
    chance: number;
    /** The window's rolled length (seconds). */
    holdSec: [number, number];
    /** Rolled quiet between windows (seconds). */
    cooldownSec: [number, number];
    /** Ramp in/out seconds (the eased seam — the sky gathers and clears). */
    easeSec: number;
    /** Intensity floor while the window stands (the front always reads). */
    floor: number;
    /** Claims (home included) the network needs before it may express. */
    minClaims: number;
    /** Fungal faction-weight amp on the expressed zone's spawn rolls. */
    amp: number;
    /** The eventOnly WEATHER_DEFS row pinned over the expressed zone. */
    weatherKind: string;
  };
  reward: { xpBase: number; xpPerLevel: number; gems: number };
  color: string;
  glow?: { strong: string; weak: string; accent: string };
}

type BloomState = 'dormant' | 'spread' | 'withdraw';

/** One claimed zone — a NODE of the network. `via` is the zone this claim was
 *  reached THROUGH (the tree edge the map draws; null = the home root). */
interface ClaimNode {
  density: number; // 0..1 — the grip
  hops: number;    // tree distance from the home (0 = home)
  via: string | null;
}

interface ActiveBloom {
  id: string;
  /** THE FOUNDATION — the anchored home. Never relocates while the bloom lives. */
  homeZoneId: string;
  state: BloomState;
  flareCharge: number;
  spreadAcc: number;
  recedeAcc: number;
  age: number;
  /** The live expression window (one at a time), or null. */
  express: { zoneId: string; holdLeft: number; holdTotal: number } | null;
  /** Countdown to the next expression roll window. */
  expressCooldown: number;
}

export interface SporeInfo {
  density: number;
  isCore: boolean;
  color: string;
  label: string;
}

/** What the EXPRESSION reads as over one zone right now (the event-front
 *  source + zone-info + spawn seasoning all resolve through this). */
export interface ExpressionInfo {
  intensity: number; // 0..1, eased in/out over the window
  color: string;
}

// State-machine internals (algorithm shape, not content knobs — the designer
// levers all live on MyceliaSurge):
/** Fraction of flareThreshold below which a starved, home-only bloom re-calms. */
const DORMANT_CALM_FRAC = 0.25;
/** How heavily event-activity outweighs hop-distance when the network picks
 *  its next claim (it grasps toward turmoil first, quiet ground after). */
const ACTIVITY_SCORE_WEIGHT = 10;

export class MyceliaField implements WorldOverlay {
  readonly id = 'mycelia';
  /** Durable: a rooted network is a slow siege — its claim tree, its charge
   *  and its expression window all resume. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Mycelia';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: MyceliaSurge;
  private readonly glowColors: { strong: string; weak: string; accent: string };
  private bloom: ActiveBloom | null = null;
  private claims = new Map<string, ClaimNode>();
  /** Per-zone event activity fed by the engine each tick (bounded to interestZones). */
  private activity = new Map<string, number>();
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};
  /** A LEGACY (pre-front) save was adopted — the claim tree must relink from
   *  the home over live graph edges on the first tick (restore has no view). */
  private needsRelink = false;
  /** Set true once when the network is cut back to dormant by the player's
   *  culls (or the Heart falls); the engine consumes it for mycelia_pushed. */
  private pushedBackPending = false;

  constructor(ctx: OverlayBuildCtx, surge: MyceliaSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.glowColors = surge.glow ?? SPORE_COLORS;
  }

  // --- WorldOverlay ----------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const pressure = clamp(g.severityMul, 0, 1.5);

    if (this.needsRelink) { this.relink(); this.needsRelink = false; }

    if (!this.bloom) {
      this.acc += dt;
      while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.tryIgnite(view); }
      return;
    }
    const b = this.bloom;
    b.age += dt;

    // FEED: nearby event-activity charges the flare; starvation bleeds it back down.
    const act = this.totalActivity();
    b.flareCharge = Math.max(0, b.flareCharge + act * this.cfg.flareFeed * dt - this.cfg.flareDecay * dt);

    // GRIP FADE: every non-home claim slowly loses hold (feeding keeps ground).
    // The home never fades while the bloom lives — it is the foundation.
    for (const [zid, z] of this.claims) {
      if (zid === b.homeZoneId) continue;
      z.density = Math.max(0, z.density - this.cfg.densityDecay * dt);
    }
    for (const [zid, z] of [...this.claims]) {
      if (z.density <= 0.001 && zid !== b.homeZoneId) this.dropClaim(zid, 'faded');
    }

    // THE EXPRESSION CLOCK: the window burns down on the raw overlay clock;
    // it ends with its time, with its ground (claim cut ⇒ sky clears), or
    // with the bloom's own state.
    if (b.express) {
      b.express.holdLeft -= dt;
      if (b.express.holdLeft <= 0 || !this.claims.has(b.express.zoneId) || b.state !== 'spread') {
        b.express = null;
        b.expressCooldown = this.rng.range(this.cfg.express.cooldownSec[0], this.cfg.express.cooldownSec[1]);
      }
    } else if (b.expressCooldown > 0) {
      b.expressCooldown = Math.max(0, b.expressCooldown - dt);
    }

    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; this.step(view, g.active, pressure); }
  }

  onNodeCharted(): void { /* the network rides existing edges; a fresh node is caught next tick */ }

  /** THE OVERRUN SEASONING: an EXPRESSED zone's own spawn rolls lean fungal —
   *  the roster injected + amped through the ordinary table fold, countMul 1
   *  ON PURPOSE (budget-honest: the zone's pack budget is untouched; the
   *  fungus takes seats, it never adds them). Claimed-but-quiet ground keeps
   *  NO_BIAS — its standing presence is the engine's entry pour. */
  affectSpawns(zone: ZoneDef): SpawnBias {
    if (this.expressionOn(zone.id)) {
      return { countMul: 1, factionMul: { [this.cfg.faction]: this.cfg.express.amp }, injectFactions: [this.cfg.faction] };
    }
    return NO_BIAS;
  }

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // THE NETWORK LOOK: strokes along the claim tree's own edges (the roads it
    // grew through), node knots scaled by grip, and the pulsing foundation ring.
    // Drawn off nodesById (crusade-style) so the whole reach reads — tendrils,
    // never a gradient (the Contagion keeps its concentric rings; the two
    // green crises must not rhyme).
    let under = '', over = '';
    const b = this.bloom;
    for (const [zid, z] of this.claims) {
      const n = this.nodesById[zid];
      if (!n) continue;
      const s = clamp(z.density, 0, 1);
      const col = mixHex(this.glowColors.weak, this.glowColors.strong, s);
      const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
      // The EDGE it grew through — the drawn filament.
      if (z.via) {
        const p = this.nodesById[z.via];
        if (p) {
          const ps = clamp(this.claims.get(z.via)?.density ?? s, 0, 1);
          const es = Math.min(s, ps); // a filament is as strong as its weaker end
          under += `<line x1="${p.map.x.toFixed(1)}" y1="${p.map.y.toFixed(1)}" x2="${cx}" y2="${cy}" `
            + `stroke="${mixHex(this.glowColors.weak, this.glowColors.strong, es)}" `
            + `stroke-width="${(1.4 + 2.6 * es).toFixed(2)}" stroke-opacity="${(0.4 + 0.4 * es).toFixed(2)}" stroke-linecap="round"/>`;
        }
      }
      // The NODE knot.
      under += `<circle cx="${cx}" cy="${cy}" r="${(2.6 + 2.6 * s).toFixed(1)}" fill="${col}" fill-opacity="${(0.5 + 0.3 * s).toFixed(2)}"/>`;
      if (b && zid === b.homeZoneId) {
        const dur = (2.6 - 1.4 * s).toFixed(2);
        over += `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="${this.glowColors.strong}" stroke-width="2.2" stroke-opacity="0.85">`
          + `<animate attributeName="r" values="13;${(13 + 6 * s).toFixed(1)};13" dur="${dur}s" repeatCount="indefinite"/>`
          + `</circle>`
          + `<text x="${cx}" y="${(n.map.y - 15).toFixed(1)}" text-anchor="middle" font-size="13" fill="${this.glowColors.accent}">❀</text>`;
      }
      // The EXPRESSED zone breathes — the sporefall window's map tell.
      if (b?.express?.zoneId === zid) {
        over += `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="${this.glowColors.accent}" stroke-width="1.6" stroke-opacity="0.8">`
          + `<animate attributeName="r" values="10;16;10" dur="1.8s" repeatCount="indefinite"/>`
          + `<animate attributeName="stroke-opacity" values="0.8;0.25;0.8" dur="1.8s" repeatCount="indefinite"/>`
          + `</circle>`;
      }
    }
    return { under, over };
  }

  // --- engine-facing API -----------------------------------------------------

  surge(): MyceliaSurge { return this.cfg; }

  /** The claim state of a zone (grip + whether it's the foundation) — the
   *  engine reads it to materialize grip-scaled fungal packs + the Heartbloom. */
  sporeOn(zoneId: string): SporeInfo | null {
    const z = this.claims.get(zoneId);
    if (!z || z.density <= 0.001) return null;
    return {
      density: z.density,
      isCore: this.bloom?.homeZoneId === zoneId,
      color: this.cfg.color,
      label: this.bloom?.homeZoneId === zoneId ? 'rooted'
        : z.density > 0.66 ? 'saturated' : z.density > 0.33 ? 'spreading' : 'creeping',
    };
  }

  /** The live EXPRESSION over a zone (eased intensity), or null. The event-
   *  front source, the spawn seasoning and the zone-info row all read this —
   *  one predicate, so the sky, the table and the map can never disagree. */
  expressionOn(zoneId: string): ExpressionInfo | null {
    const b = this.bloom;
    if (!b || !b.express || b.express.zoneId !== zoneId) return null;
    const E = this.cfg.express;
    const elapsed = b.express.holdTotal - b.express.holdLeft;
    const ramp = Math.min(elapsed, b.express.holdLeft) / Math.max(1e-6, E.easeSec);
    return { intensity: clamp(Math.max(E.floor, Math.min(1, ramp)), 0, 1), color: this.cfg.color };
  }

  /** The Heartbloom descriptor for the FOUNDATION zone (toggle on + bloom live). */
  heartbloomIn(zoneId: string): { defId: string; promote: 'none' | 'champion' | 'crowned'; promoteAt?: number } | null {
    if (!this.cfg.heartbloom.enabled || !this.bloom || this.bloom.state === 'withdraw') return null;
    if (this.bloom.homeZoneId !== zoneId) return null;
    const hb = this.cfg.heartbloom;
    return { defId: hb.defId, promote: hb.promote, promoteAt: hb.promoteAt };
  }

  /** Event-chance multiplier a zone's claim imposes (1 = clear, →floor = smothered).
   *  The tug-of-war: the thicker the network, the fewer competing events ignite. */
  suppressionAt(zoneId: string): number {
    const z = this.claims.get(zoneId);
    if (!z) return 1;
    return clamp(1 - z.density * this.cfg.suppressPerDensity, this.cfg.suppressFloor, 1);
  }

  /** EMPTY BY LAW — the anchored network never warps the land (the biome does
   *  not change or shift; the EXPRESSION is the loud read instead). The method
   *  stands as the law's own probe-pinned witness (probe_myceliafront A8/E12/
   *  F2); the old world.ts warp reconcile is gone (Movement II's cleanup —
   *  warps are runtime-only, so no save could carry one to heal). */
  transformedZones(): string[] { return []; }

  /** The claims + their neighbours + the home + its neighbours — the only zones
   *  the engine needs to measure event-activity for (bounded). */
  interestZones(): string[] {
    const set = new Set<string>();
    const add = (zid: string) => {
      set.add(zid);
      const zn = this.nodesById[zid];
      if (zn) for (const e of zn.exits) if (e.to !== '?' && this.nodesById[e.to]?.caveDepth == null) set.add(e.to);
    };
    if (this.bloom) add(this.bloom.homeZoneId);
    for (const zid of this.claims.keys()) add(zid);
    return [...set];
  }

  /** The engine feeds per-zone event activity each tick (before sim.update). */
  setEventActivity(map: ReadonlyMap<string, number>): void {
    this.activity = new Map(map);
  }

  /** The player culled the network in a zone (a fungal kill) — its grip drops;
   *  a claim eaten to nothing is CUT, and everything beyond it withers (the
   *  fragmentation law). Eating the FOUNDATION itself to nothing collapses the
   *  whole bloom — the heartless kill route. */
  cull(zoneId: string, amount = 1): void {
    const b = this.bloom;
    const z = this.claims.get(zoneId);
    if (!b || !z || b.state === 'withdraw') return;
    z.density = Math.max(0, z.density - this.cfg.cullDensity * amount);
    if (z.density > 0.001) return;
    if (zoneId === b.homeZoneId) {
      // The foundation itself eaten bare: the bloom collapses (no Heart needed).
      b.state = 'withdraw';
      b.recedeAcc = 0;
      b.express = null;
      this.pushedBackPending = true;
      return;
    }
    this.dropClaim(zoneId, 'culled');
  }

  /** The Heartbloom fell — force the collapse (the high-risk shortcut). */
  onHeartbloomSlain(): boolean {
    if (!this.bloom || this.bloom.state === 'withdraw') return false;
    this.bloom.state = 'withdraw';
    this.bloom.recedeAcc = 0;
    this.bloom.express = null;
    this.pushedBackPending = true;
    return true;
  }

  /** Returns true ONCE when the network has just been pushed back (the engine
   *  bumps the mycelia_pushed Vault ledger). */
  consumePushedBack(): boolean {
    if (!this.pushedBackPending) return false;
    this.pushedBackPending = false;
    return true;
  }

  activeBloom(): { state: BloomState; coreZoneId: string; claims: number } | null {
    return this.bloom
      ? { state: this.bloom.state, coreZoneId: this.bloom.homeZoneId, claims: this.claims.size }
      : null;
  }

  /** Read-only snapshot for markers / tests: the claim tree with its edges. */
  peek(): ReadonlyArray<{ zoneId: string; density: number; hops: number; via: string | null; isCore: boolean }> {
    const b = this.bloom;
    return [...this.claims].map(([zid, z]) => ({
      zoneId: zid, density: z.density, hops: z.hops, via: z.via, isCore: b?.homeZoneId === zid,
    }));
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON (v2 — the spore front). The activity feed is NOT saved — the
   *  engine re-feeds it every tick. */
  snapshot(): unknown {
    const b = this.bloom;
    return {
      v: 2,
      bloom: b ? {
        id: b.id, homeZoneId: b.homeZoneId, state: b.state,
        flareCharge: b.flareCharge, spreadAcc: b.spreadAcc, recedeAcc: b.recedeAcc,
        age: Math.round(b.age),
        express: b.express ? { ...b.express } : null,
        expressCooldown: b.expressCooldown,
      } : null,
      claims: [...this.claims.entries()].map(([zid, z]) => ({ zid, ...z })),
      pushedBackPending: this.pushedBackPending,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as {
      v?: unknown; bloom?: unknown; claims?: unknown[]; spores?: unknown[];
      pushedBackPending?: unknown; seq?: unknown;
    } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    if (num(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    this.pushedBackPending = !!s.pushedBackPending;
    this.bloom = null;
    this.claims.clear();

    const b = s.bloom as Record<string, unknown> | null;
    if (!b || typeof b !== 'object' || typeof b.homeZoneId !== 'string' || typeof b.id !== 'string') return;
    // LEGACY (v1, the mobile bloom): 'pushed' folds to 'spread'; the wandered
    // core is ABANDONED — the network re-anchors at its home (the foundation
    // is the identity), and claims relink from there on the first tick.
    const rawState = b.state as string;
    const state: BloomState = rawState === 'withdraw' ? 'withdraw'
      : rawState === 'dormant' ? 'dormant' : 'spread';
    if (!num(b.flareCharge) || !num(b.spreadAcc) || !num(b.recedeAcc)) return;
    const ex = b.express as { zoneId?: unknown; holdLeft?: unknown; holdTotal?: unknown } | null;
    this.bloom = {
      id: b.id, homeZoneId: b.homeZoneId, state,
      flareCharge: b.flareCharge, spreadAcc: b.spreadAcc, recedeAcc: b.recedeAcc,
      age: num(b.age) ? b.age : 0,
      express: (s.v === 2 && ex && typeof ex.zoneId === 'string' && num(ex.holdLeft) && num(ex.holdTotal))
        ? { zoneId: ex.zoneId, holdLeft: ex.holdLeft, holdTotal: ex.holdTotal } : null,
      expressCooldown: num(b.expressCooldown) ? b.expressCooldown : 0,
    };
    const rows = Array.isArray(s.claims) ? s.claims : Array.isArray(s.spores) ? s.spores : [];
    for (const raw of rows) {
      const z = raw as { zid?: unknown; density?: unknown; hops?: unknown; via?: unknown } | null;
      if (!z || typeof z.zid !== 'string' || !num(z.density) || !num(z.hops)) continue;
      this.claims.set(z.zid, {
        density: clamp(z.density, 0, 1),
        hops: Math.max(0, Math.floor(z.hops)),
        via: typeof z.via === 'string' ? z.via : null,
      });
    }
    // The home claim always exists while the bloom lives (a legacy save whose
    // core wandered may not carry one — re-seat the foundation).
    if (!this.claims.has(this.bloom.homeZoneId)) {
      this.claims.set(this.bloom.homeZoneId, { density: this.cfg.seedDensity, hops: 0, via: null });
    }
    // v1 rows carry no `via` — the tree must relink over live edges (deferred
    // to the first update tick; restore has no graph view). v2 relinks too:
    // it is cheap, idempotent, and drops claims whose ground left the map.
    this.needsRelink = true;
  }

  /** Culled ground sheds its claim (fragmentation included); a home gone from
   *  the map recycles the bloom entirely (it re-ignites elsewhere later). */
  pruneZones(has: (zoneId: string) => boolean): void {
    const b = this.bloom;
    if (b && !has(b.homeZoneId)) {
      this.bloom = null;
      this.claims.clear();
      return;
    }
    for (const zid of [...this.claims.keys()]) {
      if (!has(zid) && this.claims.has(zid)) this.dropClaim(zid, 'faded');
    }
  }

  // --- dev seam --------------------------------------------------------------

  /** DEV: root a bloom whose HOME is the given (current) zone, pre-charged so
   *  it flares + claims at once. (QA Event tab.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    if (this.bloom) return false; // one-at-a-time (matches production)
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here)) return false;
    this.bloom = this.makeBloom(here.id);
    this.bloom.flareCharge = this.cfg.flareThreshold * 2;
    this.bloom.state = 'spread';
    this.claims.set(here.id, { density: 1, hops: 0, via: null });
    return true;
  }

  /** DEV/PROBE: force an expression window on a claimed zone (the QA lens on
   *  the sporefall stack — sky, dress, seasoning — without waiting the roll). */
  devExpress(zoneId: string, holdSec?: number): boolean {
    const b = this.bloom;
    if (!b || b.state !== 'spread' || !this.claims.has(zoneId)) return false;
    const hold = holdSec ?? this.rng.range(this.cfg.express.holdSec[0], this.cfg.express.holdSec[1]);
    b.express = { zoneId, holdLeft: hold, holdTotal: hold };
    return true;
  }

  // --- internals -------------------------------------------------------------

  private streamable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  /** Sum of fed event-activity across the network's owned + neighbour zones. */
  private totalActivity(): number {
    let t = 0;
    for (const zid of this.interestZones()) t += this.activity.get(zid) ?? 0;
    return t;
  }

  private intensityFor(hops: number): number {
    return clamp(1 - hops / this.cfg.maxHops, this.cfg.minIntensity, 1);
  }

  private makeBloom(homeId: string): ActiveBloom {
    return {
      id: `mycelia_${this.seq++}`, homeZoneId: homeId, state: 'dormant',
      flareCharge: 0, spreadAcc: 0, recedeAcc: 0, age: 0,
      express: null, expressCooldown: 0,
    };
  }

  /** Find a charted mycelia-biome zone (the dormant HOME) and root a bloom
   *  there. No home biome in the world ⇒ no roll ever lands (the absent==
   *  identical guarantee: the candidate filter is the world's own truth). */
  private tryIgnite(view: OverlayView): void {
    if (!this.rng.chance(clamp(this.cfg.igniteChance * this.gate().ignitionMul, 0, 1))) return;
    const homes = view.nodes.filter(z => z.biome === this.cfg.homeBiome && this.streamable(z));
    if (!homes.length) return;
    const home = homes[this.rng.int(0, homes.length - 1)];
    this.bloom = this.makeBloom(home.id);
    this.claims.set(home.id, { density: this.cfg.seedDensity, hops: 0, via: null }); // a faint foundation
  }

  /** The fixed-cadence state machine. */
  private step(view: OverlayView, active: boolean, pressure: number): void {
    const b = this.bloom;
    if (!b) return;
    const cfg = this.cfg;

    switch (b.state) {
      case 'dormant':
        if (active && b.flareCharge >= cfg.flareThreshold) {
          b.state = 'spread';
          const home = this.claims.get(b.homeZoneId);
          if (home) home.density = 1; // the foundation wakes full
        }
        break;
      case 'spread':
        if (active) {
          b.spreadAcc += STEP * pressure;
          while (b.spreadAcc >= cfg.spreadInterval) { b.spreadAcc -= cfg.spreadInterval; this.spread(view); }
          this.maybeExpress();
        }
        // Starved back to the foundation alone: the bloom calms home.
        if (b.flareCharge < cfg.flareThreshold * DORMANT_CALM_FRAC && this.totalActivity() <= 0 && this.claims.size <= 1) {
          b.state = 'dormant';
          b.express = null;
          const home = this.claims.get(b.homeZoneId);
          if (home) home.density = cfg.seedDensity;
        }
        break;
      case 'withdraw':
        b.recedeAcc += STEP;
        while (b.recedeAcc >= cfg.recedeInterval) { b.recedeAcc -= cfg.recedeInterval; this.recede(); }
        if (this.claims.size <= 1) {
          // Collapsed to (at most) the foundation — fall fully dormant at home.
          this.claims.clear();
          const home = view.byId[b.homeZoneId];
          if (home && this.streamable(home)) {
            this.bloom = this.makeBloom(home.id);
            this.claims.set(home.id, { density: this.cfg.seedDensity, hops: 0, via: null });
          } else {
            this.bloom = null; // home gone — recycle entirely (re-ignites elsewhere later)
          }
        }
        break;
    }
  }

  /** Claim ONE more zone along a live edge of the tree: activity-first (the
   *  network grasps toward turmoil), nearest-hop then lexical-id after (quiet
   *  ground is still taken — an anchored web spreads from its foundation, it
   *  does not wait for food to walk to it). Bounded by claimCap + maxHops. */
  private spread(view: OverlayView): void {
    const b = this.bloom;
    if (!b || this.claims.size >= this.cfg.claimCap) return;
    const cand = new Map<string, string>(); // zoneId → best parent (lowest hop, then id)
    const candHop = new Map<string, number>();
    for (const [zid, z] of this.claims) {
      const zn = view.byId[zid];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.claims.has(nb.id) || !this.streamable(nb)) continue;
        const ph = candHop.get(nb.id);
        if (ph === undefined || z.hops < ph || (z.hops === ph && zid < (cand.get(nb.id) ?? ''))) {
          cand.set(nb.id, zid);
          candHop.set(nb.id, z.hops);
        }
      }
    }
    if (!cand.size) return;
    let best: string | null = null, bestScore = -Infinity;
    for (const [zid, ph] of candHop) {
      if (ph + 1 > this.cfg.maxHops) continue;
      const score = (this.activity.get(zid) ?? 0) * ACTIVITY_SCORE_WEIGHT - ph;
      if (score > bestScore || (score === bestScore && (best === null || zid < best))) {
        bestScore = score;
        best = zid;
      }
    }
    if (!best) return;
    const via = cand.get(best)!;
    const hops = (candHop.get(best) ?? 0) + 1;
    this.claims.set(best, { density: this.intensityFor(hops), hops, via });
  }

  /** Roll the EXPRESSION: one claimed non-home zone goes loud for a window. */
  private maybeExpress(): void {
    const b = this.bloom;
    const E = this.cfg.express;
    if (!b || b.express || b.expressCooldown > 0) return;
    if (this.claims.size < E.minClaims) return;
    if (!this.rng.chance(clamp(E.chance, 0, 1))) return;
    // Grip-weighted pick over the non-home claims (the home IS the biome —
    // sporefall says the fungus is spreading FROM it, so it stands elsewhere).
    const rows = [...this.claims.entries()]
      .filter(([zid]) => zid !== b.homeZoneId)
      .sort((a, c) => a[0] < c[0] ? -1 : 1); // stable order — the pick is seeded, not map-ordered
    if (!rows.length) return;
    let total = 0;
    for (const [, z] of rows) total += Math.max(0.05, z.density);
    let r = this.rng.next() * total;
    let pick = rows[rows.length - 1][0];
    for (const [zid, z] of rows) { r -= Math.max(0.05, z.density); if (r <= 0) { pick = zid; break; } }
    const hold = this.rng.range(E.holdSec[0], E.holdSec[1]);
    b.express = { zoneId: pick, holdLeft: hold, holdTotal: hold };
  }

  /** CUT a claim out of the tree. Every claim whose only path to the home ran
   *  through it WITHERS the same beat (the subtree over `via` links — the
   *  fragmentation law: the graph is the gameplay surface). A player-authored
   *  cut that leaves the foundation standing alone is the PUSH-BACK: the
   *  bloom falls dormant and the Vault ledger hears it. */
  private dropClaim(zoneId: string, cause: 'culled' | 'faded'): void {
    const b = this.bloom;
    if (!b || zoneId === b.homeZoneId) return; // the foundation only falls via withdraw
    if (!this.claims.delete(zoneId)) return;
    // Sever the subtree: repeated passes drop every claim whose `via` no
    // longer stands (a dropped parent orphans its children, and so on).
    let dropped = true;
    while (dropped) {
      dropped = false;
      for (const [zid, z] of [...this.claims]) {
        if (zid === b.homeZoneId || z.via === null) continue;
        if (!this.claims.has(z.via)) {
          this.claims.delete(zid);
          dropped = true;
        }
      }
    }
    if (b.express && !this.claims.has(b.express.zoneId)) b.express = null;
    if (cause === 'culled' && b.state === 'spread' && this.claims.size <= 1) {
      // Cut back to the foundation by the player's hand — pushed back.
      b.state = 'dormant';
      b.flareCharge = 0;
      const home = this.claims.get(b.homeZoneId);
      if (home) home.density = this.cfg.seedDensity;
      this.pushedBackPending = true;
    }
  }

  /** WITHDRAW recede: retract the outermost (highest-hop) ring — the filaments
   *  draw back toward the foundation. */
  private recede(): void {
    const b = this.bloom;
    if (!b) return;
    let maxHop = -1;
    for (const [zid, z] of this.claims) if (zid !== b.homeZoneId && z.hops > maxHop) maxHop = z.hops;
    if (maxHop < 0) { this.claims.delete([...this.claims.keys()].find(k => k !== b.homeZoneId) ?? ''); return; }
    for (const [zid, z] of [...this.claims]) if (zid !== b.homeZoneId && z.hops >= maxHop) this.claims.delete(zid);
  }

  /** Rebuild the tree from the HOME over live graph edges: hops + via re-derive,
   *  and claims the walk cannot reach are dropped (a legacy mobile bloom's far
   *  islands wither on adoption — the anchored law applied to old saves). */
  private relink(): void {
    const b = this.bloom;
    if (!b) return;
    const home = this.claims.get(b.homeZoneId);
    if (!home) { this.bloom = null; this.claims.clear(); return; }
    home.hops = 0;
    home.via = null;
    const seen = new Map<string, { hops: number; via: string | null }>([[b.homeZoneId, { hops: 0, via: null }]]);
    const q = [b.homeZoneId];
    for (let qi = 0; qi < q.length; qi++) {
      const id = q[qi], at = seen.get(id)!;
      const zn = this.nodesById[id];
      if (!zn) continue;
      // Deterministic edge order: sort by target id (relink is rare — restore
      // and legacy adoption only — so the sort's cost is nothing).
      const outs = zn.exits.filter(e => e.to !== '?' && this.claims.has(e.to) && !seen.has(e.to))
        .map(e => e.to).sort();
      for (const to of outs) {
        seen.set(to, { hops: at.hops + 1, via: id });
        q.push(to);
      }
    }
    for (const [zid, z] of [...this.claims]) {
      const at = seen.get(zid);
      if (!at) { this.claims.delete(zid); continue; }
      z.hops = at.hops;
      z.via = at.via;
    }
    if (b.express && !this.claims.has(b.express.zoneId)) b.express = null;
  }
}

// --- the sporefall sky (registered on import — the quickening idiom) ----------
// THE EXPRESSION AS WEATHER: while a claim expresses, its zone's sky IS the
// spore-front (an eventOnly WEATHER_DEFS row the def registers), folded at
// World.skyFront() like every pinned front — shelter law, dress, radiance and
// the crossfade all standard. One pure read; the pin dies with the window.
registerEventFront({
  id: 'mycelia',
  sample: (world: World, zone: ZoneDef) => {
    const mf = world.sim.myceliaField;
    const info = mf?.expressionOn(zone.id);
    if (!mf || !info) return null;
    return { kind: mf.surge().express.weatherKind, intensity: info.intensity };
  },
});

// --- THE EATS-PLAGUE SEAM (stub half — Movement II consumes) ------------------
// The network's grip published into the green-ground registry: the mobile
// Contagion will read the fold in its spread/cure steps (anchored ground eats
// the plague). Registering is the whole Movement-I wiring — nothing live
// consumes the fold yet.
registerGroundClaim({
  id: 'mycelia',
  gripAt: (sim, zoneId) => sim.myceliaField?.sporeOn(zoneId)?.density ?? 0,
});

// --- map marker + zone-info (registered on import) ----------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const mf = world.sim.myceliaField;
  if (!mf) return [];
  const g = mf.surge().glow ?? SPORE_COLORS; // one palette, network + marker agree
  const out: MapMarker[] = [];
  for (const s of mf.peek()) {
    if (!s.isCore) continue;
    out.push({
      id: `mycelia-core-${s.zoneId}`, zoneId: s.zoneId,
      glyph: '❀', fill: '#16220f', stroke: g.strong, text: g.accent, r: 9,
      title: 'The Bloom is rooted here — its foundation feeds the whole web', fog: 'charted', z: 16,
    });
  }
  return out;
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const mf = world.sim.myceliaField;
  const info = mf?.sporeOn(zoneId);
  if (!mf || !info) return [];
  const expressed = mf.expressionOn(zoneId);
  return [{
    kind: 'event', icon: '❀', color: (mf.surge().glow ?? SPORE_COLORS).strong, label: 'Mycelia',
    detail: info.isCore ? 'the foundation: cull it bare or strike the Heartbloom'
      : expressed ? 'SPOREFALL — the fungus is spreading from its own biome'
      : `the web holds this ground (${info.label}); cut a node and its reach withers`,
    z: 13,
  }];
});
