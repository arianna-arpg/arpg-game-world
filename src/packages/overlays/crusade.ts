// ---------------------------------------------------------------------------
// CRUSADE FIELD — a faction's holy war as a LIVING WARFRONT (pure overlay).
//
// A Crusade IGNITES somewhere in the wilds — often entirely unbeknownst to the
// player — and from that moment it is a CAMPAIGN on the warfield fabric
// (world/warfield.ts): its territory at any coordinate is a PURE FUNCTION of
// its seeded field identity × its live POWER × a well around its HEART, so the
// front exists everywhere the moment it is asked about, breathes and crawls on
// its own clock, and snapshots as a handful of scalars. Nothing overworld is
// minted: real zones under the field read their local CONTROL through
// crusadeOn(), and the tier ladder (outpost → camp → fortress → the faction
// city) derives from that gradient — works RISE where the field runs deep and
// COLLAPSE on re-entry when it has been beaten back (zone generation re-asks
// the field every load).
//
// THE ARC: a young crusade's power OSCILLATES — it grows, its territory
// swelling and its map-wash deepening to the faction's color, but the player,
// a rival crusade pressing the same ground, or another event (the Deadwake
// consuming a hold) can SNUFF it before it takes root. Once power crosses the
// anchor threshold the crusade plants its THRONE: a seat of power that can no
// longer be guttered — its heartland claims the very ground (the engine warps
// the biome), its throne GATE stands in the deepest territory, and only
// cutting down the Leader in its arena (a true one-on-one before the stands —
// the crowd answers his champion-calls) collapses the campaign.
//
// DISCOVERY: the map shows NOTHING of a crusade until the player walks into
// its ground. A crusade may ignite, swell to a throne, and war with a rival
// while the player remains entirely unaware — the living world, detached from
// the player's input — and once found, its whole warfront (the gradient wash,
// the heart sigil, the clash line) is revealed to be fought back.
//
// PURE of the engine, exactly like HellWarField: it owns coordinate-space and
// the power clocks, and never touches World. Population/works materialize
// through the engine's crusadeOn() reads; the throne arena mints through the
// sanctum gate exactly as before.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ArenaSpec } from '../../data/arenas';
import { FACTIONS } from '../../data/monsters';
import type { ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist, DIRS, projectCoord, type MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerBulletinSource } from '../../world/bulletins';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { scaledCap } from '../frequency';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { factionsInContext } from '../../world/traits';
import { anchorWell, decayingModsMul, driftOffset, fieldNoise01, influenceGrad, latticeWindow, thrustArrowSvg, type FieldMod } from '../../world/warfield';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed sim cadence (seconds)
const CRUSADE_GOLD = '#d8b040';
const MAX_BULLETINS = 8;

/** One rung of the CONTROL ladder — a step function over the field's local
 *  strength. All the per-tier severity (which structure rises, how big the
 *  garrison, the commander's rarity, whether rivals are suppressed) is DATA. */
export interface CrusadeTier {
  /** 1..4 (touched, occupied, entrenched, converted). */
  tier: number;
  label: string;
  /** Local control (0..1) at which this tier takes over (ascending). */
  atControl: number;
  /** STRUCTURES id raised at generation in a zone of this tier (null = none). */
  structure: string | null;
  /** Crusade pack size materialized at this tier. */
  garrison: [number, number];
  /** The commander's elite tier. */
  leaderRarity: 'none' | 'champion' | 'crowned';
  /** Kill-hook tag on the commander (its death LIBERATES the zone), or null. */
  leaderTag: string | null;
  /** baseTable returns the crusade roster — the zone's population is fully the
   *  crusade's (the rivals are gone). */
  suppressNatives: boolean;
  /** Native pack-count multiplier (thins the rivals as the grip tightens). */
  countMul: number;
  /** Amplifier on the crusade faction in the spawn table. */
  amp: number;
  /** Local-clear reward multiplier at this tier. */
  rewardMul: number;
  /** Extra structures scattered to make heart-deep ground a FACTION CITY —
   *  a weighted street-mix (the village kit) plus an optional town SQUARE.
   *  Only the converted tier sets it. */
  cityFill?: { structures: { structure: string; weight: number }[]; count: [number, number]; square?: string };
}

/** The whole campaign config — every dial of the war as data. Distances are
 *  MAP UNITS (the node pitch is 78); rates are per second of overlay time. */
export interface CrusadeSurge {
  /** Per-step base chance (×ignition pressure) a fresh Crusade ignites. */
  triggerChance: number;
  /** Most Crusades alive at once (multiple factions crusade in parallel). */
  maxConcurrent: number;
  /** Node-steps from the (randomly drawn) charted seed zone the heart lands —
   *  off in the unknown, where a war can grow unseen. */
  seedSteps: [number, number];
  /** THE FIELD (warfield fabric dials): territory = power × drifting noise ×
   *  heart well × reach falloff. `reachBase + reachPerPower × power` is the
   *  footprint's e-folding radius — territory literally GROWS with power. */
  field: {
    noiseScale: number; noiseBase: number; noiseAmp: number;
    driftVel: number; driftTurn: [number, number];
    wellAmp: number; wellRange: number;
    reachBase: number; reachPerPower: number;
  };
  /** THE POWER MODEL — the campaign's one might scalar. */
  power: {
    /** Ignition power (an ember). */
    start: number;
    /** Logistic ceiling — an unchecked holy war's full might. */
    cap: number;
    /** Growth per second (×vigor ×severity pressure, logistic toward cap).
     *  A planted crusade festers even when the package is dialed down:
     *  severity is clamped to [growthFloorMul, growthCapMul]. */
    growth: number;
    growthFloorMul: number;
    growthCapMul: number;
    /** Crossing this ANCHORS the crusade: its throne is built (invisibly),
     *  and it can no longer be snuffed — only the Leader's death ends it. */
    anchorAt: number;
    /** An UN-anchored crusade whose power falls below this GUTTERS OUT —
     *  beaten back by the player, a rival, or another event before rooting. */
    snuffBelow: number;
    /** An anchored crusade's power never falls below this — the seat holds
     *  (beaten back, never extinguished) until the Leader falls. */
    anchoredFloor: number;
    /** Pre-anchor power OSCILLATION (the young war's ebb and surge) vs the
     *  settled breath of an anchored seat — the tide swings the territory. */
    tideAmp: number; tideAmpAnchored: number; tidePeriod: [number, number];
    /** Per-crusade growth roll — some campaigns are fierce, some slow. */
    vigor: [number, number];
    /** devIgnite plants at this power (a meaty, near-anchor war for QA). */
    devIgnite: number;
  };
  /** CLASH (Crusade vs Crusade): overlapping fields contest ground on their
   *  own; a rival's control at YOUR heart drains your power — a stronger
   *  crusade can squeeze an unrooted rival to the snuff line. */
  clash: {
    /** Power drained per second at FULL rival control over one's heart. */
    drainPerSec: number;
    /** Rival/holder influence ratio above which ground reads CONTESTED (the
     *  floor that keeps a smooth ratio from contesting everywhere). */
    contestNear: number;
    /** Above this the front runs HOT (map arrows; both factions injected). */
    contestHot: number;
    /** Contested real zones spawn BOTH factions' rosters — the warfront
     *  stages its own brawls in walked ground. */
    injectContested: boolean;
  };
  /** DECAYING LOCAL SUPPRESSION — the player's (or a consuming event's)
   *  fleeting fingerprint when a hold is LIBERATED: the field collapses in a
   *  disc that heals, and the campaign pays a nick of power. */
  suppress: { radius: number; mul: number; forSec: number; powerNick: number };
  /** CONTROL normalization + the ladder's ground rules. */
  control: {
    /** Influence below this = outside the territory (the wash's edge). */
    edge: number;
    /** Influence at (≥) this = control 1 — the deepest read. */
    full: number;
    /** Map-units from the heart within which the CITY tier may rise. */
    heartland: number;
    /** Control at the player's zone that DISCOVERS the crusade (reveals its
     *  whole warfront on the map). */
    discoverAt: number;
    /** Highest tier outside the heartland (only the heart converts). */
    nonHeartMaxTier: number;
  };
  /** The ladder (ascending atControl; covers tiers 1..4). */
  tiers: CrusadeTier[];
  /** THE THRONE: once anchored, the gate to the Leader's arena stands in any
   *  owned real zone within gateRange of the heart. */
  throne: { gateRange: number };
  /** The Leader's arena realm (the deep dive through the throne gate).
   *  `packs`/`garrison` author the arena's population: null packs + a [0,0]
   *  garrison = the TRUE ONE-ON-ONE (the crowd's champion-calls remain the
   *  only adds — data/arenas.ts ArenaCrowdSpec). */
  sanctum: {
    tileset: string; rewardMul: number; levelBonus: number;
    /** Leader-kill premium per anchorAt-unit of standing power — a war that
     *  grew mighty pays mightily. */
    rewardPerPower: number;
    /** The Leader's spawn shaping (fed to spawnArenaBoss). */
    bossBump: number; xpFloor: number;
    /** Ambient packs in the arena (null = none — the Daresso purity). */
    packs: { count: [number, number]; size: [number, number] } | null;
    /** The Leader's standing court at his side ([0,0] = he stands alone). */
    garrison: { count: [number, number]; spread?: number };
    arena?: ArenaSpec;
  };
  /** Map paint: render-lattice + wash + arrows (the GRADIENT is the strength
   *  readout — opacity climbs with local control and standing power). */
  map: {
    cellBase: number; maxCellsPerAxis: number; pad: number;
    washAlpha: number; washPowerAlpha: number;
    /** Edge feather: wash alpha at control 0 as a fraction of full. */
    washFloor: number;
    arrows: number;
    /** Map-fit extent reach = wellRange × (base + perPower × power/cap). */
    extentBase: number; extentPerPower: number;
  };
  /** Per-faction ignition weight (default 1); pool = factionsInContext('crusade'). */
  factionWeights?: Record<string, number>;
  /** Fallback wash colour if the faction has none. */
  color?: string;
}

/** What a Crusade does to one zone, resolved for the engine to materialize. */
export interface CrusadeInfo {
  crusadeId: string;
  faction: string;
  color: string;
  tier: number;
  label: string;
  /** Local control 0..1 — the gradient this zone sits on. */
  control: number;
  /** HEART ground (within the heartland) — where the city may rise and the
   *  throne gate stands. (Field name kept for the engine seam.) */
  isStronghold: boolean;
  structure: string | null;
  garrison: [number, number];
  leaderRarity: 'none' | 'champion' | 'crowned';
  leaderTag: string | null;
  suppressNatives: boolean;
  countMul: number;
  amp: number;
  rewardMul: number;
  cityFill?: { structures: { structure: string; weight: number }[]; count: [number, number]; square?: string };
  /** An ANCHORED crusade's throne gate stands in this zone (host-only mint). */
  sanctumReady: boolean;
}

interface ActiveCrusade {
  id: string;
  faction: string;
  color: string;
  /** The seat-of-power anchor — a FIELD WELL, never a zone. */
  heart: MapCoord;
  /** The campaign's might — the one scalar the whole territory derives from. */
  power: number;
  /** The throne stands: no longer snuffable; the gate opens in the deep. */
  anchored: boolean;
  /** The player has walked its ground — until then the map shows nothing. */
  discovered: boolean;
  age: number;
  /** Seeded field identity (warfield fabric): noise salt, drift, tide. */
  salt: number;
  heading: number;
  turnPeriod: number;
  tidePhase: number;
  tidePeriod: number;
  /** Per-crusade growth roll. */
  vigor: number;
  sanctumMinted: boolean;
  dead: boolean;
}

export class CrusadeField implements WorldOverlay {
  readonly id = 'crusade';
  /** Durable: a crusade is a slow arc — power grows over minutes toward the
   *  throne. Campaigns, suppression discs and the owner ledger all resume;
   *  the territory itself derives from time and needs no saving. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Crusades';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: CrusadeSurge;
  private crusades: ActiveCrusade[] = [];
  /** Decaying local suppression discs (warfield fabric; key = crusade id). */
  private mods: FieldMod[] = [];
  private time = 0;
  private acc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};
  /** Last announced owner per VISITED zone — the conquest-bulletin edge. */
  private lastZoneOwner = new Map<string, string>();
  /** War news (drained by the registered bulletin source). */
  readonly bulletins: { text: string; color: string }[] = [];

  constructor(ctx: OverlayBuildCtx, surge: CrusadeSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  // --- the tick ---------------------------------------------------------------

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    this.time += dt;
    this.acc += dt;
    if (this.acc < STEP) return;
    const step = this.acc;
    this.acc = 0;
    const g = this.gate();

    // POWER: every campaign grows (logistic toward cap), scaled by its vigor
    // and the severity crank — floored so a planted crusade festers even when
    // the package is dialed down (growth stops only at death).
    const P = this.cfg.power;
    const growMul = clamp(g.severityMul, P.growthFloorMul, P.growthCapMul);
    for (const c of this.crusades) {
      if (c.dead) continue;
      c.age += step;
      c.power = Math.min(P.cap, c.power + P.growth * c.vigor * growMul * (1 - c.power / P.cap) * step);
    }

    // CLASH: overlapping campaigns drain each other — a rival's control over
    // YOUR heart bleeds your power. Runs regardless of the gate (planted
    // crusades war on even if dialed down); the player tips it by thinning a
    // side (liberations nick power and suppress the field locally).
    if (this.crusades.length >= 2) this.tickClash(step);

    // ANCHOR / SNUFF: crossing anchorAt plants the throne (one-way); an
    // un-anchored campaign ground below snuffBelow gutters out. An anchored
    // seat never falls below its floor — only the Leader's death ends it.
    for (const c of this.crusades) {
      if (c.dead) continue;
      if (!c.anchored && c.power >= P.anchorAt) {
        c.anchored = true;
        if (c.discovered) {
          this.pushBulletin(`${this.factionName(c)} crusade plants its THRONE — a seat of power rises!`, c.color);
        }
      }
      if (c.anchored) c.power = Math.max(P.anchoredFloor, c.power);
      else if (c.power < P.snuffBelow) {
        c.dead = true;
        if (c.discovered) {
          this.pushBulletin(`The ${this.factionName(c)} crusade gutters out — its banner never took root.`, c.color);
        }
      }
    }

    // DISCOVERY: walking ground the field holds reveals the whole warfront.
    const here = view.byId[view.currentZoneId];
    if (here && here.caveDepth == null) {
      const read = this.strongestAt(here.map);
      if (read && read.control >= this.cfg.control.discoverAt && !read.crusade.discovered) {
        read.crusade.discovered = true;
        this.pushBulletin(
          `You have found ${this.factionName(read.crusade)} crusade — its warfront burns on your map!`,
          read.crusade.color);
      }
    }

    // Expired suppression discs heal off the ledger.
    for (let i = this.mods.length - 1; i >= 0; i--) {
      if (this.time >= this.mods[i].until) this.mods.splice(i, 1);
    }

    this.tickZoneBulletins(view);
    this.crusades = this.crusades.filter(c => !c.dead);

    // IGNITION: a fresh war kindles somewhere in the wilds (gated).
    if (g.active) this.maybeIgnite(view, g);
  }

  onNodeCharted(): void { /* the field exists everywhere already */ }

  // --- the field --------------------------------------------------------------

  /** A campaign's EFFECTIVE power right now — the grown baseline breathing on
   *  its tide (harder pre-anchor: the young war ebbs and surges). Pure in t. */
  private effectivePower(c: ActiveCrusade, t: number): number {
    const P = this.cfg.power;
    const amp = c.anchored ? P.tideAmpAnchored : P.tideAmp;
    return c.power * (1 + amp * Math.sin(((t + c.tidePhase) / c.tidePeriod) * Math.PI * 2));
  }

  /** One campaign's influence at a coordinate — drifting noise × effective
   *  power × the heart well × a power-scaled REACH falloff (the footprint
   *  grows with might) × the healing suppression discs. Pure in (state,
   *  coord, time) — the warfield fabric composition. */
  private influence(c: ActiveCrusade, coord: MapCoord, t: number): number {
    const F = this.cfg.field;
    const off = driftOffset(c.heading, c.turnPeriod, F.driftVel, t);
    const n = fieldNoise01(c.salt, (coord.x + off.x) / F.noiseScale, (coord.y + off.y) / F.noiseScale);
    const d = coordDist(coord, c.heart);
    const reach = Math.exp(-d / (F.reachBase + F.reachPerPower * c.power));
    const inf = this.effectivePower(c, t) * (F.noiseBase + F.noiseAmp * n)
      * anchorWell(coord, c.heart, F.wellAmp, F.wellRange) * reach;
    return inf * decayingModsMul(this.mods, coord, t, c.id);
  }

  /** Influence normalized to CONTROL 0..1 (edge → outside, full → deepest). */
  private control01(inf: number): number {
    const C = this.cfg.control;
    return clamp((inf - C.edge) / Math.max(1e-6, C.full - C.edge), 0, 1);
  }

  /** The strongest campaign at a coordinate (with its control and the best
   *  rival's contest level), or null where no field reaches. */
  private strongestAt(coord: MapCoord): {
    crusade: ActiveCrusade; control: number;
    rival: ActiveCrusade | null; contest: number;
  } | null {
    const t = this.time;
    let best: ActiveCrusade | null = null, bi = 0;
    let second: ActiveCrusade | null = null, si = 0;
    for (const c of this.crusades) {
      if (c.dead) continue;
      const inf = this.influence(c, coord, t);
      if (inf > bi) { second = best; si = bi; best = c; bi = inf; }
      else if (inf > si) { second = c; si = inf; }
    }
    if (!best || bi <= this.cfg.control.edge) return null;
    // Same-faction campaigns never contest each other (allied banners).
    const rivalOk = second && second.faction !== best.faction && si > this.cfg.control.edge;
    const level = rivalOk ? Math.min(1, si / Math.max(1e-6, bi)) : 0;
    return {
      crusade: best, control: this.control01(bi),
      rival: rivalOk && level >= this.cfg.clash.contestNear ? second : null,
      contest: level,
    };
  }

  /** Rival pressure ON a campaign: each different-faction rival's control over
   *  this heart drains power — the clash resolves itself, field vs field. */
  private tickClash(dt: number): void {
    const drains: { c: ActiveCrusade; amt: number }[] = [];
    for (const c of this.crusades) {
      if (c.dead) continue;
      let press = 0;
      for (const r of this.crusades) {
        if (r === c || r.dead || r.faction === c.faction) continue;
        press = Math.max(press, this.control01(this.influence(r, c.heart, this.time)));
      }
      if (press > 0) drains.push({ c, amt: this.cfg.clash.drainPerSec * press * dt });
    }
    for (const d of drains) d.c.power = Math.max(0, d.c.power - d.amt);
  }

  /** Owner changes over VISITED ground become war bulletins — only for wars
   *  the player has FOUND (an unknown crusade stays unknown), and only over
   *  ground a crusade may actually hold (a sanctuary is never "reached"). */
  private tickZoneBulletins(view: OverlayView): void {
    for (const z of view.nodes) {
      if (!view.visited.has(z.id) || z.caveDepth != null || !eventTargetable(this.id, z)) continue;
      const read = this.strongestAt(z.map);
      const now = read && read.control >= (this.cfg.tiers[0]?.atControl ?? 0) ? read.crusade : null;
      const before = this.lastZoneOwner.get(z.id) ?? '';
      const nowId = now ? now.id : '';
      if (before === nowId) continue;
      this.lastZoneOwner.set(z.id, nowId);
      const prev = this.crusades.find(c => c.id === before);
      if (now && now.discovered) {
        this.pushBulletin(prev && prev.discovered
          ? `${this.factionName(now)} overrun ${this.factionName(prev)} at ${z.name}!`
          : `The crusade's front reaches ${z.name}!`, now.color);
      } else if (!now && prev?.discovered) {
        this.pushBulletin(`${z.name} is free of the crusade.`, prev.color);
      }
    }
  }

  private factionName(c: ActiveCrusade): string {
    return (FACTIONS[c.faction]?.name ?? c.faction).replace(/^the /, '');
  }

  private pushBulletin(text: string, color: string): void {
    this.bulletins.push({ text, color });
    if (this.bulletins.length > MAX_BULLETINS) this.bulletins.shift();
  }

  // --- overlay surface --------------------------------------------------------

  affectSpawns(zone: ZoneDef): SpawnBias {
    const info = this.crusadeOn(zone.id);
    if (info) {
      // Amplify the crusade faction and thin the natives as the grip tightens;
      // CONTESTED ground fields BOTH rivals' rosters — the warfront brawls in
      // walked zones. The works + commander are MATERIALIZED by the engine.
      const inject: string[] = [];
      if (this.cfg.clash.injectContested) {
        const read = this.strongestAt(zone.map);
        if (read?.rival) inject.push(read.crusade.faction, read.rival.faction);
      }
      return { countMul: info.countMul, factionMul: { [info.faction]: info.amp }, injectFactions: inject };
    }
    return NO_BIAS;
  }

  /** Event-activity fed to the bloom: crusade ground stirs with its control. */
  activityAt(zoneId: string): number {
    const z = this.nodesById[zoneId];
    if (!z || z.caveDepth != null) return 0;
    const read = this.strongestAt(z.map);
    return read ? read.control * 2 : 0;
  }

  // --- accessors the engine reads -------------------------------------------

  /** Live config (the engine reads sanctum tileset / reward / arena shape). */
  surge(): CrusadeSurge { return this.cfg; }

  /** The crusade affecting a zone — its local CONTROL resolved through the
   *  tier ladder into engine info — or null when the field doesn't reach (or
   *  the ground refuses events: sanctuary, cave, another event's arena). */
  crusadeOn(zoneId: string): CrusadeInfo | null {
    const z = this.nodesById[zoneId];
    if (!z || z.caveDepth != null || z.special) return null;
    if (!eventTargetable(this.id, z)) return null;
    const read = this.strongestAt(z.map);
    if (!read) return null;
    const c = read.crusade;
    const C = this.cfg.control;
    let tierIdx = 0;
    for (const t of this.cfg.tiers) if (read.control >= t.atControl) tierIdx = t.tier;
    if (tierIdx <= 0) return null;
    const dHeart = coordDist(z.map, c.heart);
    const heartGround = dHeart <= C.heartland;
    if (!heartGround) tierIdx = Math.min(tierIdx, C.nonHeartMaxTier);
    const t = this.cfg.tiers.find(x => x.tier === tierIdx) ?? this.cfg.tiers[0];
    return {
      crusadeId: c.id, faction: c.faction, color: c.color,
      tier: t.tier, label: t.label, control: read.control,
      isStronghold: heartGround,
      structure: t.structure, garrison: t.garrison,
      leaderRarity: t.leaderRarity, leaderTag: t.leaderTag,
      suppressNatives: t.suppressNatives, countMul: t.countMul, amp: t.amp,
      rewardMul: t.rewardMul,
      ...(t.cityFill ? { cityFill: t.cityFill } : {}),
      sanctumReady: c.anchored && dHeart <= this.cfg.throne.gateRange,
    };
  }

  /** Faction of a crusade (the engine resolves the Leader = its warlord). */
  factionOf(crusadeId: string): string | null {
    return this.crusades.find(c => c.id === crusadeId)?.faction ?? null;
  }

  /** A hold was LIBERATED (tagged commander cut down, a conquest, the
   *  Deadwake consuming the ground): the field collapses locally in a disc
   *  that HEALS, and the campaign pays a nick of power — enough pressure can
   *  gutter an unrooted war entirely. Returns the tier's reward multiplier. */
  resolveCrusadeZone(zoneId: string): number {
    const z = this.nodesById[zoneId];
    if (!z) return 1;
    const info = this.crusadeOn(zoneId);
    let c = info ? this.crusades.find(x => x.id === info.crusadeId) : undefined;
    if (!c) {
      // The ground may read clear THROUGH a fresh suppression disc while the
      // campaign that raised its works still stands — attribute the blow to
      // the nearest heart whose reach plausibly covers the zone, so sustained
      // pressure always lands (repeat liberations CAN gutter an unrooted war,
      // and a consuming event's strike never vanishes into a mask).
      let bestD = Infinity;
      for (const x of this.crusades) {
        if (x.dead) continue;
        const d = coordDist(z.map, x.heart);
        const reach = (this.cfg.field.reachBase + this.cfg.field.reachPerPower * x.power) * 3;
        if (d <= reach && d < bestD) { bestD = d; c = x; }
      }
    }
    if (!c) return 1;
    const S = this.cfg.suppress;
    this.mods.push({
      key: c.id, at: { x: z.map.x, y: z.map.y },
      radius: S.radius, mul: S.mul, from: this.time, until: this.time + S.forSec,
    });
    c.power = Math.max(0, c.power - S.powerNick);
    return info?.rewardMul ?? 1;
  }

  /** The Crusade Leader fell in his arena — the whole campaign COLLAPSES.
   *  Returns the reward multiplier, scaled by the standing power (a war that
   *  grew mighty pays mightily). */
  resolveCrusade(crusadeId: string): number {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (!c) return 1;
    c.dead = true;
    const mul = this.cfg.sanctum.rewardMul
      * (1 + this.cfg.sanctum.rewardPerPower * (c.power / Math.max(1, this.cfg.power.anchorAt)));
    this.pushBulletin(`The ${this.factionName(c)} crusade is BROKEN — its throne stands empty.`, c.color);
    this.crusades = this.crusades.filter(x => x.id !== crusadeId);
    return mul;
  }

  /** Mark a crusade's throne arena as minted (so the engine mints it once). */
  markSanctumMinted(crusadeId: string): void {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (c) c.sanctumMinted = true;
  }
  sanctumMinted(crusadeId: string): boolean {
    return this.crusades.find(c => c.id === crusadeId)?.sanctumMinted ?? false;
  }

  activeCount(): number { return this.crusades.filter(c => !c.dead).length; }

  /** Read-only snapshot for markers / the engine's warp claim / dev QA. */
  peek(): ReadonlyArray<{
    id: string; faction: string; color: string; heart: MapCoord;
    power: number; powerFrac: number; anchored: boolean; discovered: boolean;
  }> {
    return this.crusades.filter(c => !c.dead).map(c => ({
      id: c.id, faction: c.faction, color: c.color,
      heart: { x: c.heart.x, y: c.heart.y },
      power: c.power, powerFrac: c.power / Math.max(1, this.cfg.power.cap),
      anchored: c.anchored, discovered: c.discovered,
    }));
  }

  // --- ignition ---------------------------------------------------------------

  private maybeIgnite(view: OverlayView, g: PackageGate): void {
    if (this.crusades.length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.triggerChance * g.ignitionMul, 0, 1))) return;
    // The seed zone is a RANDOM eligible charted node — not the player's: a
    // war may kindle a country away, entirely unbeknownst (fixed-count draws;
    // a rejected candidate never shifts later rolls).
    const pool = view.nodes;
    if (!pool.length) return;
    let seed: ZoneDef | null = null;
    for (let t = 0; t < 6 && !seed; t++) {
      const z = pool[this.rng.int(0, pool.length - 1)];
      if (z.caveDepth == null && !z.eventOwned && eventTargetable(this.id, z)) seed = z;
    }
    if (!seed) return;
    const faction = this.pickFaction();
    if (!faction) return;
    // The heart plants a few node-steps off in the UNKNOWN — on land.
    let heart: MapCoord | null = null;
    for (let t = 0; t < 4 && !heart; t++) {
      const dir = DIRS[this.rng.int(0, DIRS.length - 1)];
      const steps = this.rng.int(this.cfg.seedSteps[0], this.cfg.seedSteps[1]);
      const cand = projectCoord(seed.map, dir, steps);
      if (view.terrain(cand) !== 'ocean') heart = cand;
    }
    if (!heart) return;
    this.plant(faction, heart, this.cfg.power.start, false);
    // NO bulletin, NO marker — the world does not announce this war. The
    // player finds it (or its throne finds them).
  }

  private plant(faction: string, heart: MapCoord, power: number, discovered: boolean): ActiveCrusade {
    const P = this.cfg.power;
    const c: ActiveCrusade = {
      id: `cru_${this.seq++}`, faction,
      color: FACTION_COLORS[faction] ?? this.cfg.color ?? CRUSADE_GOLD,
      heart: { x: heart.x, y: heart.y },
      power, anchored: power >= P.anchorAt, discovered,
      age: 0,
      salt: (this.rng.next() * 0xffffffff) >>> 0,
      heading: this.rng.range(0, Math.PI * 2),
      turnPeriod: this.rng.range(this.cfg.field.driftTurn[0], this.cfg.field.driftTurn[1]),
      tidePhase: this.rng.range(0, Math.PI * 2),
      tidePeriod: this.rng.range(P.tidePeriod[0], P.tidePeriod[1]),
      vigor: this.rng.range(P.vigor[0], P.vigor[1]),
      sanctumMinted: false, dead: false,
    };
    this.crusades.push(c);
    return c;
  }

  /** Weighted pick from the crusade-eligible faction pool (data-driven via the
   *  spawn-context gate — never a hardcoded id list). */
  private pickFaction(): string | null {
    const pool = factionsInContext('crusade').filter(f => FACTIONS[f]?.table?.length);
    if (!pool.length) return null;
    const weights = this.cfg.factionWeights ?? {};
    let total = 0;
    for (const f of pool) total += weights[f] ?? 1;
    let r = this.rng.next() * total;
    for (const f of pool) { r -= weights[f] ?? 1; if (r <= 0) return f; }
    return pool[pool.length - 1];
  }

  /** DEV: plant a crusade whose HEART is the given (current) zone, at a meaty
   *  near-anchor power so works materialize immediately, pre-discovered. (QA;
   *  pass `power` to stage a specific arc — e.g. an un-anchored ember — and
   *  `faction` to pin the banner for clash staging.) */
  devIgnite(view: OverlayView, zoneId: string, power?: number, faction?: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !eventTargetable(this.id, here)) return false;
    const f = faction && FACTIONS[faction]?.table?.length ? faction : this.pickFaction();
    if (!f) return false;
    this.plant(f, here.map, power ?? this.cfg.power.devIgnite, true);
    return true;
  }

  // --- map --------------------------------------------------------------------

  /** THE LIVING WARFRONT — for wars the player has FOUND: each campaign's
   *  territory as a faction-coloured GRADIENT wash (deeper = stronger, both
   *  locally and in standing power — the gradient IS the strength readout),
   *  breathing and crawling on its own clock; heart sigils (♜ mustering, ☗ an
   *  anchored throne); ⚔ + thrust arrows where rival crusades clash. An
   *  undiscovered war paints NOTHING — it grows unseen. */
  renderMap(nodes: ZoneDef[]): MapLayer {
    const found = this.crusades.filter(c => !c.dead && c.discovered);
    if (!found.length) return { under: '', over: '' };
    const M = this.cfg.map;
    const t = this.time;
    // Window: discovered hearts + their reach + charted ground.
    const pts: MapCoord[] = [];
    for (const c of found) {
      const reach = this.extentReach(c);
      pts.push(c.heart,
        { x: c.heart.x - reach, y: c.heart.y }, { x: c.heart.x + reach, y: c.heart.y },
        { x: c.heart.x, y: c.heart.y - reach }, { x: c.heart.x, y: c.heart.y + reach });
    }
    for (const z of nodes) pts.push(z.map);
    const win = latticeWindow(pts, M.pad, M.cellBase, M.maxCellsPerAxis);
    if (!win) return { under: '', over: '' };
    let under = '';
    const flows: { x: number; y: number; c: ActiveCrusade; gain: number }[] = [];
    for (let y = win.oy; y < win.maxY; y += win.cell) {
      for (let x = win.ox; x < win.maxX; x += win.cell) {
        const at = { x: x + win.cell / 2, y: y + win.cell / 2 };
        // Discovered campaigns only — an unknown war must not leak one pixel.
        let best: ActiveCrusade | null = null, bi = 0, second: ActiveCrusade | null = null, si = 0;
        for (const c of found) {
          const inf = this.influence(c, at, t);
          if (inf > bi) { second = best; si = bi; best = c; bi = inf; }
          else if (inf > si) { second = c; si = inf; }
        }
        if (!best || bi <= this.cfg.control.edge) continue;
        const control = this.control01(bi);
        if (control < 0.02) continue;
        // THE GRADIENT: opacity climbs with local control (feathered edge →
        // deep core) and the campaign's standing power — a glance reads both
        // the shape of the territory and the might behind it.
        const powerFrac = Math.min(1, best.power / this.cfg.power.cap);
        const alpha = (M.washAlpha + M.washPowerAlpha * powerFrac)
          * (M.washFloor + (1 - M.washFloor) * control);
        under += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${win.cell}" height="${win.cell}" `
          + `fill="${best.color}" fill-opacity="${alpha.toFixed(3)}"/>`;
        // Hot borders between rival FACTIONS feed the thrust arrows.
        if (second && second.faction !== best.faction && si > this.cfg.control.edge
          && si / bi >= this.cfg.clash.contestHot && second.discovered) {
          const now = this.influence(second, at, t) - bi;
          const soon = this.influence(second, at, t + 4) - this.influence(best, at, t + 4);
          flows.push({ x: at.x, y: at.y, c: soon > now ? second : best, gain: Math.abs(soon - now) });
        }
      }
    }
    let over = '';
    // Heart sigils: a mustering banner, or the anchored THRONE.
    for (const c of found) {
      const x = c.heart.x.toFixed(0), y = c.heart.y.toFixed(0);
      const fname = this.factionName(c);
      const pct = Math.round(100 * c.power / Math.max(1, this.cfg.power.anchorAt));
      if (c.anchored) {
        over += `<circle cx="${x}" cy="${y}" r="11" fill="none" stroke="${c.color}" stroke-width="1.8" opacity="0.9"/>`
          + `<text x="${x}" y="${(c.heart.y + 4.5).toFixed(0)}" text-anchor="middle" font-size="13" fill="${c.color}" font-weight="bold">☗`
          + `<title>The ${fname} crusade's THRONE — its gate stands in the deep territory. Cut down the Leader to break the war.</title></text>`;
      } else {
        over += `<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${c.color}" stroke-width="1.4" stroke-dasharray="3 2" opacity="0.8"/>`
          + `<text x="${x}" y="${(c.heart.y + 4).toFixed(0)}" text-anchor="middle" font-size="11" fill="${c.color}">♜`
          + `<title>A ${fname} crusade musters — ${pct}% toward its throne. Snuff it before it roots.</title></text>`;
      }
    }
    // ⚔ over charted contested ground (both wars known).
    for (const z of nodes) {
      if (z.caveDepth != null) continue;
      const read = this.strongestAt(z.map);
      if (!read?.rival || !read.crusade.discovered || !read.rival.discovered) continue;
      over += `<text x="${z.map.x.toFixed(0)}" y="${(z.map.y - 13).toFixed(0)}" text-anchor="middle" `
        + `font-size="12" fill="#ff5a5a">⚔<title>${this.factionName(read.crusade)} vs ${this.factionName(read.rival)} — `
        + `${Math.round(read.contest * 100)}% pressure</title></text>`;
    }
    // Thrust arrows along the strongest live advances.
    flows.sort((a, b) => b.gain - a.gain);
    const drawn: { x: number; y: number }[] = [];
    for (const f of flows) {
      if (drawn.length >= M.arrows) break;
      if (drawn.some(d => Math.hypot(d.x - f.x, d.y - f.y) < win.cell * 2)) continue;
      drawn.push(f);
      const { ux, uy } = influenceGrad(c => this.influence(f.c, c, t), { x: f.x, y: f.y });
      over += thrustArrowSvg(f.x, f.y, ux, uy, f.c.color);
    }
    return { under, over };
  }

  /** Map-fit extent: the fitted view encloses each FOUND war's territory. */
  mapExtent(): ReadonlyArray<MapCoord> {
    const out: MapCoord[] = [];
    for (const c of this.crusades) {
      if (c.dead || !c.discovered) continue;
      const reach = this.extentReach(c);
      out.push(
        { x: c.heart.x - reach, y: c.heart.y }, { x: c.heart.x + reach, y: c.heart.y },
        { x: c.heart.x, y: c.heart.y - reach }, { x: c.heart.x, y: c.heart.y + reach });
    }
    return out;
  }

  private extentReach(c: ActiveCrusade): number {
    const M = this.cfg.map;
    return this.cfg.field.wellRange
      * (M.extentBase + M.extentPerPower * Math.min(1, c.power / this.cfg.power.cap));
  }

  // --- worldstate (the persistence pledge) -----------------------------------
  // Scalars only: the territory derives from time — it cannot be corrupted,
  // only re-asked. (v2 — the pre-field spreading-state-machine snapshots are
  // dropped on restore: those wars re-roll fresh, and their old minted zones
  // lose their claim and scrub through the ordinary transience rules.)

  snapshot(): unknown {
    return {
      v: 2,
      time: Math.round(this.time * 10) / 10,
      seq: this.seq,
      crusades: this.crusades.filter(c => !c.dead).map(c => ({
        id: c.id, faction: c.faction, color: c.color,
        heart: { x: Math.round(c.heart.x), y: Math.round(c.heart.y) },
        power: Math.round(c.power * 10) / 10,
        anchored: c.anchored, discovered: c.discovered,
        age: Math.round(c.age),
        salt: c.salt, heading: Math.round(c.heading * 1000) / 1000,
        turnPeriod: Math.round(c.turnPeriod),
        tidePhase: Math.round(c.tidePhase * 1000) / 1000,
        tidePeriod: Math.round(c.tidePeriod),
        vigor: Math.round(c.vigor * 1000) / 1000,
        sanctumMinted: c.sanctumMinted,
      })),
      mods: this.mods.map(m => ({
        key: String(m.key), at: { x: Math.round(m.at.x), y: Math.round(m.at.y) },
        radius: m.radius, mul: m.mul, from: Math.round(m.from * 10) / 10, until: Math.round(m.until * 10) / 10,
      })),
      lastZoneOwner: Object.fromEntries(this.lastZoneOwner),
    };
  }

  restore(snap: unknown): void {
    const s = snap as {
      v?: unknown; time?: unknown; seq?: unknown; crusades?: unknown[];
      mods?: { key?: unknown; at?: { x: number; y: number }; radius?: number; mul?: number; from?: number; until?: number }[];
      lastZoneOwner?: Record<string, string>;
    } | null;
    if (!s || typeof s !== 'object' || s.v !== 2 || !Array.isArray(s.crusades)) return;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    this.time = num(s.time) ? s.time : 0;
    if (num(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    this.crusades = [];
    for (const raw of s.crusades) {
      const c = raw as Partial<ActiveCrusade> | null;
      if (!c || typeof c.id !== 'string' || typeof c.faction !== 'string') continue;
      if (!FACTIONS[c.faction]) continue; // the marching faction left the registries
      if (!c.heart || ![c.heart.x, c.heart.y].every(num)) continue;
      if (![c.power, c.age, c.salt, c.heading, c.turnPeriod, c.tidePhase, c.tidePeriod, c.vigor].every(num)) continue;
      this.crusades.push({
        id: c.id, faction: c.faction,
        color: typeof c.color === 'string' ? c.color : (FACTION_COLORS[c.faction] ?? this.cfg.color ?? CRUSADE_GOLD),
        heart: { x: c.heart.x, y: c.heart.y },
        power: Math.max(0, c.power!), anchored: !!c.anchored, discovered: !!c.discovered,
        age: Math.max(0, c.age!),
        salt: (c.salt! >>> 0), heading: c.heading!, turnPeriod: c.turnPeriod!,
        tidePhase: c.tidePhase!, tidePeriod: c.tidePeriod!, vigor: c.vigor!,
        sanctumMinted: !!c.sanctumMinted, dead: false,
      });
    }
    this.mods = [];
    for (const m of s.mods ?? []) {
      if (!m || typeof m.key !== 'string' || !m.at || ![m.at.x, m.at.y].every(num)) continue;
      if (![m.radius, m.mul, m.from, m.until].every(num)) continue;
      this.mods.push({ key: m.key, at: { x: m.at.x, y: m.at.y }, radius: m.radius!, mul: m.mul!, from: m.from!, until: m.until! });
    }
    this.lastZoneOwner = new Map(Object.entries(s.lastZoneOwner ?? {}));
  }

  /** Nothing minted, nothing owned — only the bulletin memory follows zones. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const [zid] of this.lastZoneOwner) {
      if (!has(zid)) this.lastZoneOwner.delete(zid);
    }
  }
}

// --- bulletins (registered on import — zero panels.ts edits) ------------------
// War news is DISCOVERY-GATED at the source (the overlay only pushes lines
// about wars the player has found); the engine's single collectBulletins pump
// drains us.
registerBulletinSource((world: World) => {
  const cf = world.sim.crusadeField;
  if (!cf || !cf.bulletins.length) return [];
  return cf.bulletins.splice(0);
});

// --- map markers (registered on import) ---------------------------------------
// The heart of every FOUND war: a mustering banner (♜) that becomes the
// THRONE (☗) once the crusade anchors — fog:'always' so a discovered war's
// seat pulls the player toward it across uncharted ground. Undiscovered
// wars show nothing at all.
registerMarkerSource((world: World): MapMarker[] => {
  const cf = world.sim.crusadeField;
  if (!cf) return [];
  const out: MapMarker[] = [];
  for (const c of cf.peek()) {
    if (!c.discovered) continue;
    if (c.anchored) {
      out.push({
        id: `crusade-throne-${c.id}`, coord: { x: c.heart.x, y: c.heart.y },
        glyph: '☗', fill: '#2a1e08', stroke: c.color, text: c.color, r: 10,
        title: 'Crusade throne — find its gate, slay the Leader', fog: 'always', z: 19,
      });
    } else {
      out.push({
        id: `crusade-${c.id}`, coord: { x: c.heart.x, y: c.heart.y },
        glyph: '♜', fill: '#241c08', stroke: c.color, text: c.color, r: 9,
        title: 'A Crusade musters here', fog: 'always', z: 15,
      });
    }
  }
  return out;
});

// --- zone-info rows (registered on import) ------------------------------------
// The map's zone box names the ground's holder, its grip, the pressing rival,
// and the throne gate — the warfront's reads where the player plans.
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const cf = world.sim.crusadeField;
  if (!cf) return [];
  const info = cf.crusadeOn(zoneId);
  if (!info) return [];
  const c = cf.peek().find(x => x.id === info.crusadeId);
  if (!c?.discovered) return [];
  const fname = (FACTIONS[info.faction]?.name ?? info.faction).replace(/^the /, '');
  const out: ZoneInfoEntry[] = [{
    kind: 'event', icon: info.sanctumReady ? '☗' : '♜', color: info.color,
    label: info.sanctumReady
      ? `The crusade's throne gate stands here`
      : `Crusade ground — ${fname} (${info.label})`,
    detail: info.sanctumReady
      ? 'Step through and cut down the Leader'
      : `${Math.round(info.control * 100)}% grip${info.isStronghold ? ' · heartland' : ''}`,
    z: info.sanctumReady ? 18 : 9,
  }];
  return out;
});
