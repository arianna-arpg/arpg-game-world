// ---------------------------------------------------------------------------
// CRUSADE FIELD — a spreading-state-machine world event (pure overlay).
//
// A Crusade is faction influence as a SPREADING NETWORK over the zone graph,
// with warbands leading the vanguard. It seeds a STRONGHOLD in a cardinal
// direction off in unexplored territory (minted beyond the player's vision),
// then SPREADS: claiming adjacent zones over time, each one accumulating
// influence as it's held. A zone's MATURATION climbs a tier ladder by
// time-held + network-closeness to the stronghold:
//
//   unaffected → touched → occupied → entrenched → converted
//
// A freshly-claimed zone is barely changed (touched); a long-held one raises
// faction structures and floods the faction while suppressing rivals (occupied
// → a war camp, entrenched → a fortress), and the capital matures into a
// faction-city LABYRINTH (converted) whose sanctum gate tears open onto the
// Crusade Leader's inner realm. The engine reads crusadeOn() to materialize the
// camps / fortress / city + leader and resolves a zone (or the whole crusade)
// when the player cuts down the tagged commander (or the Leader).
//
// PURE of the engine, exactly like DemonInvasionField: it owns node-space + the
// maturation clock, queues uncharted mints the engine drains, and never touches
// World. It is self-contained — it does NOT route through FactionField/Invasion
// (so a crusade-only faction never leaks into the baseline war machine).
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ArenaSpec } from '../../data/arenas';
import { FACTIONS } from '../../data/monsters';
import type { ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist, DIRS, projectCoord, type Dir, type MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { scaledCap } from '../frequency';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { FACTION_COLORS } from '../../world/palette';
import { factionsInContext } from '../../world/traits';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed ignition cadence (seconds)
const CRUSADE_GOLD = '#d8b040';

/** One rung of the maturation ladder — a step function over a zone's time-held.
 *  All the per-tier severity (which structure rises, how big the garrison, the
 *  commander's rarity, whether rivals are suppressed) is DATA here. */
export interface CrusadeTier {
  /** 1..4 (touched, occupied, entrenched, converted). */
  tier: number;
  label: string;
  /** Seconds-held at which this tier takes over (0 = touched on claim). */
  atSecondsHeld: number;
  /** STRUCTURES id stamped into the live arena at this tier (null = none). */
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
  /** Native pack-count multiplier (thins the rivals as the crusade tightens). */
  countMul: number;
  /** Amplifier on the crusade faction in the spawn table. */
  amp: number;
  /** Local-clear reward multiplier at this tier. */
  rewardMul: number;
  /** Extra structures scattered to make a converted capital a doodad LABYRINTH
   *  (the "traversing a faction city" feel). Only the converted tier sets it. */
  cityFill?: { structure: string; count: [number, number] };
}

/** The whole spreading-state-machine config (tunable data, carried by the def). */
export interface CrusadeSurge {
  /** Per-step base chance (×pressure) a fresh Crusade ignites. */
  triggerChance: number;
  /** Most Crusades alive at once (multiple factions can crusade in parallel). */
  maxConcurrent: number;
  /** Node-steps from the trigger zone the stronghold coordinate is rolled. */
  seedSteps: [number, number];
  /** Tileset a minted stronghold zone is built with. */
  strongholdTileset: string;
  /** Maturation-rate multiplier for the capital (it festers fastest → converts
   *  first, becoming the city + sanctum the others orbit). */
  strongholdAccel: number;
  /** Node-distance over which proximity-to-stronghold acceleration falls off. */
  networkRange: number;
  /** Floor on a far zone's maturation-rate multiplier. */
  minNetFactor: number;
  /** Seconds (×pressure) between a Crusade claiming another zone. */
  claimInterval: number;
  /** Cap on zones one Crusade holds. */
  maxHeldZones: number;
  /** Chance a claim pushes a SIMULATED frontier (a floating zone in the wilds) vs
   *  taking a charted neighbour. */
  frontierMintChance: number;
  /** Cap on simulated (floating) frontier zones per Crusade. */
  maxMints: number;
  /** Node-distance within which a floating crusade zone WIRES INTO the charted
   *  graph (its exit spawns) — the accessibility stopgap: a crusade zone connects
   *  only once it's this close to real charted ground, so it's always reachable
   *  and never inadvertent dead content. Far frontiers stay SIMULATED (shown on
   *  the warfront heat-map, not yet enterable) until the front reaches near. */
  accessRadius: number;
  /** The ladder (ascending atSecondsHeld; covers tiers 1..4). */
  tiers: CrusadeTier[];
  /** Highest tier a NON-capital zone can reach (only the stronghold converts). */
  nonCapitalMaxTier: number;
  /** Per-faction ignition weight (default 1); pool itself = factionsInContext('crusade'). */
  factionWeights?: Record<string, number>;
  /** Fallback wash colour if the faction has none. */
  color?: string;
  /** The inner-sanctum realm config (the converted capital's deep dive).
   *  `arena` (data/arenas.ts) makes the sanctum DISTINCT with one row — a
   *  forced layout recipe, a fixed name, pack density, even boss-warding
   *  seals — riding the same pipeline as every event realm. */
  sanctum: { atSecondsHeld: number; tileset: string; rewardMul: number; levelBonus: number; arena?: ArenaSpec };
  /** CLASH (Crusade vs Crusade): when two different-faction crusades' fronts meet,
   *  the stronger side wrests the contested border zone — a tug-of-war warfront that
   *  shifts on its own, which the player can tip by thinning a side. */
  clash: {
    /** Seconds between clash-resolution passes. */
    interval: number;
    /** Per-pass chance a winnable border actually flips (gradual, not instant). */
    chance: number;
    /** Attacker power must exceed the defender's by THIS factor to take the zone
     *  (>1 — so a weak vanguard can never overrun a mighty, longstanding capital). */
    takeMargin: number;
    /** Power per the zone's OWN maturation tier (the local gradient). */
    perTier: number;
    /** Power per unit of the crusade's overall MIGHT (held count + capital tier). */
    perMight: number;
    /** Held-seconds a freshly-wrested zone is LOCKED from re-flipping — hysteresis
     *  so a balanced front can SETTLE instead of ping-ponging a border forever. */
    holdGuard: number;
  };
}

/** What a Crusade does to one zone, resolved for the engine to materialize. */
export interface CrusadeInfo {
  crusadeId: string;
  faction: string;
  color: string;
  tier: number;
  label: string;
  isStronghold: boolean;
  structure: string | null;
  garrison: [number, number];
  leaderRarity: 'none' | 'champion' | 'crowned';
  leaderTag: string | null;
  suppressNatives: boolean;
  countMul: number;
  amp: number;
  rewardMul: number;
  cityFill?: { structure: string; count: [number, number] };
  /** A converted stronghold whose sanctum gate has torn open (host-only mint). */
  sanctumReady: boolean;
}

/** Engine-drained: mint a crusade frontier/stronghold zone at an uncharted coord. */
export interface CrusadeMintRequest {
  crusadeId: string;
  coord: MapCoord;
  anchorZoneId: string;
  zoneKey: string;
  tileset: string;
  level: number;
  /** A stronghold (the capital) or a pushed frontier. */
  kind: 'stronghold' | 'frontier';
}

interface ActiveCrusade {
  id: string;
  faction: string;
  color: string;
  dir: Dir;                 // the cardinal the vanguard pushes
  strongholdId: string | null;
  strongholdCoord: MapCoord;
  anchorId: string;
  age: number;
  minted: boolean;
  mints: number;
  claimAcc: number;
  sanctumMinted: boolean;   // engine has minted the realm (set via markSanctumMinted)
  dead: boolean;
}

interface CrusadeZone {
  crusadeId: string;
  faction: string;
  ageHeld: number;
  netFactor: number;        // maturation-rate multiplier (capital fast, far zones slow)
  isStronghold: boolean;
}

export class CrusadeField implements WorldOverlay {
  readonly id = 'crusade';
  /** Mint seam the engine drains (host-only): strongholds + pushed frontiers. */
  readonly mintRequests: CrusadeMintRequest[] = [];

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: CrusadeSurge;
  private crusades: ActiveCrusade[] = [];
  private held = new Map<string, CrusadeZone>();
  private acc = 0;
  private clashAcc = 0;
  private seq = 0;
  private nodesById: Record<string, ZoneDef> = {};
  /** Engine-drained war bulletins: a front shifted (one crusade overran another). */
  readonly frontShifts: { zoneId: string; faction: string; from: string }[] = [];

  constructor(ctx: OverlayBuildCtx, surge: CrusadeSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const pressure = clamp(g.severityMul, 0, 1.5); // spread cadence = the SIZE/severity crank
    for (const c of this.crusades) {
      if (c.dead) continue;
      c.age += dt;
      // SPREAD: a bound stronghold sends the vanguard outward on a cadence scaled
      // by pressure (a closed gate freezes expansion but not maturation).
      if (c.strongholdId && g.active) {
        c.claimAcc += dt * pressure;
        while (c.claimAcc >= this.cfg.claimInterval) {
          c.claimAcc -= this.cfg.claimInterval;
          this.maybeClaim(c, view);
        }
      }
    }
    // MATURATION: every held zone accrues time-held, faster near its stronghold —
    // the "network-connected zones rise in tier" rule. Runs regardless of the
    // gate (a planted crusade festers even if its package is dialed down).
    for (const hz of this.held.values()) hz.ageHeld += dt * hz.netFactor;
    // Drop held zones whose crusade has fallen (the Leader was slain).
    for (const [zid, hz] of [...this.held]) {
      const c = this.crusades.find(x => x.id === hz.crusadeId);
      if (!c || c.dead) this.held.delete(zid);
    }
    // A crusade that LOST its capital to a rival (strongholdId disowned) and holds no
    // ground is finished — clear it so it stops counting against maxConcurrent.
    for (const c of this.crusades) {
      if (c.dead || !c.minted || c.strongholdId) continue;
      if (![...this.held.values()].some(h => h.crusadeId === c.id)) c.dead = true;
    }
    this.crusades = this.crusades.filter(c => !c.dead);
    // CLASH: where two different-faction crusades' fronts meet, the stronger side
    // takes the contested border — a tug-of-war that shifts the warfront WITHOUT the
    // player (runs regardless of the gate — planted crusades war on even if dialed
    // down). The player tips it by thinning a side (liberating zones / felling a
    // leader drops that crusade's might everywhere).
    this.clashAcc += dt;
    while (this.clashAcc >= this.cfg.clash.interval) {
      this.clashAcc -= this.cfg.clash.interval;
      if (this.crusades.length >= 2) this.resolveClashes();
    }
    // IGNITION: roll a fresh crusade on the fixed step (gated by pressure).
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeIgnite(view); }
  }

  onNodeCharted(): void { /* crusades target coordinates + spread along exits */ }

  affectSpawns(zone: ZoneDef): SpawnBias {
    const info = this.crusadeOn(zone.id);
    if (!info) return NO_BIAS;
    // Amplify the crusade faction (present in the base table once suppressNatives
    // flips it in) and thin the natives as the hold tightens. The camp / fortress
    // / city packs + the commander are MATERIALIZED by the engine, not biased.
    return { countMul: info.countMul, factionMul: { [info.faction]: info.amp }, injectFactions: [] };
  }

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // A WAR-MAP WARFRONT: each crusade paints its held territory as a faction-
    // coloured INFLUENCE HEAT-MAP so its reach + strength read at a glance. Drawn
    // off `this.nodesById` (every charted node, not just the visited subset) so the
    // whole front is revealed like an army's territory — the bigger + hotter the
    // blob, the mightier the crusade. The stronghold/Leader glyph rides the marker
    // source (fog:'always'); this layer is the territory + the front line.
    let under = '';
    const byId = this.nodesById;
    for (const c of this.crusades) {
      if (c.dead) continue;
      const col = c.color;
      const mine: { n: ZoneDef; tier: number }[] = [];
      for (const [zid, hz] of this.held) {
        if (hz.crusadeId !== c.id) continue;
        const n = byId[zid];
        if (n) mine.push({ n, tier: this.tierIdxFor(hz) });
      }
      if (!mine.length) continue;
      // Soft, LAYERED translucent discs per held zone (radius + opacity climb with
      // tier). They OVERLAP into one continuous field — denser + larger where the
      // crusade is deep (high-tier, clustered near the stronghold), so a glance
      // reads its strength. No SVG filter; stacked discs give the falloff.
      for (const { n, tier } of mine) {
        const baseR = 20 + 10 * tier;
        for (const [m, op] of [[1, 0.045 + 0.02 * tier], [0.62, 0.06 + 0.03 * tier], [0.32, 0.09 + 0.045 * tier]] as const) {
          under += `<circle cx="${n.map.x.toFixed(1)}" cy="${n.map.y.toFixed(1)}" `
            + `r="${(baseR * m).toFixed(1)}" fill="${col}" fill-opacity="${op.toFixed(3)}"/>`;
        }
      }
      // THE FRONT LINE: a dashed reach-ring around the stronghold spanning the held
      // territory — wider ring = a crusade that has marched further.
      const sh = c.strongholdId ? byId[c.strongholdId] : null;
      if (sh) {
        let reach = 34;
        for (const { n } of mine) reach = Math.max(reach, coordDist(n.map, sh.map) + 30);
        under += `<circle cx="${sh.map.x.toFixed(1)}" cy="${sh.map.y.toFixed(1)}" r="${reach.toFixed(1)}" `
          + `fill="none" stroke="${col}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="6 5"/>`;
      }
    }
    // THE CLASH FRONT: a ⚔ over every contested held zone (one touching a rival-
    // faction crusade's territory), so a power struggle reads at a glance.
    let over = '';
    for (const [zid, hz] of this.held) {
      const z = byId[zid];
      if (!z) continue;
      const contested = z.exits.some(e => {
        if (e.to === '?') return false;
        const nb = this.held.get(e.to);
        return !!nb && nb.faction !== hz.faction;
      });
      if (contested) {
        over += `<text x="${z.map.x.toFixed(1)}" y="${(z.map.y - 13).toFixed(1)}" text-anchor="middle" `
          + `font-size="12" fill="#ff5a5a">⚔</text>`;
      }
    }
    return { under, over };
  }

  // --- accessors the engine reads -------------------------------------------

  /** Live config (the engine reads sanctum tileset / reward / level bonus). */
  surge(): CrusadeSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): held crusade
   *  ground is heavy turmoil. */
  activityAt(zoneId: string): number { return this.crusadeOn(zoneId) ? 2 : 0; }

  /** The crusade affecting a zone (its held tier resolved into engine info), or
   *  null when the zone is untouched. */
  crusadeOn(zoneId: string): CrusadeInfo | null {
    const hz = this.held.get(zoneId);
    if (!hz) return null;
    const c = this.crusades.find(x => x.id === hz.crusadeId);
    if (!c || c.dead) return null;
    const t = this.tierFor(hz);
    const isConvertedCapital = hz.isStronghold && t.tier >= 4;
    return {
      crusadeId: c.id, faction: c.faction, color: c.color,
      tier: t.tier, label: t.label, isStronghold: hz.isStronghold,
      structure: t.structure, garrison: t.garrison,
      leaderRarity: t.leaderRarity, leaderTag: t.leaderTag,
      suppressNatives: t.suppressNatives, countMul: t.countMul, amp: t.amp,
      rewardMul: t.rewardMul, cityFill: t.cityFill,
      sanctumReady: isConvertedCapital && hz.ageHeld >= this.tierAt(4) + this.cfg.sanctum.atSecondsHeld,
    };
  }

  /** Monster id of a crusade's Leader = the faction's warlord (WARLORD_OF), looked
   *  up by the engine. Exposed for the sanctum spawn + collapse reward scaling. */
  factionOf(crusadeId: string): string | null {
    return this.crusades.find(c => c.id === crusadeId)?.faction ?? null;
  }

  /** Bind a freshly-minted stronghold zone (the engine calls after placeZoneAt). */
  bindStronghold(crusadeId: string, zoneId: string): void {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (!c || c.dead) return;
    c.strongholdId = zoneId;
    c.minted = true;
    this.registerHeld(zoneId, c, true);
  }

  /** Bind a freshly-minted pushed frontier zone (registered as touched). */
  bindFrontier(crusadeId: string, zoneId: string): void {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (!c || c.dead) return;
    this.registerHeld(zoneId, c, false);
  }

  /** The player cut down a camp/fortress commander — LIBERATE that zone (its
   *  influence is obliterated). Returns the tier's reward multiplier. */
  resolveCrusadeZone(zoneId: string): number {
    const hz = this.held.get(zoneId);
    if (!hz) return 1;
    const mul = this.tierFor(hz).rewardMul;
    this.held.delete(zoneId);
    return mul;
  }

  /** The Crusade Leader fell — COLLAPSE the whole crusade (every held zone
   *  reverts). Returns a reward multiplier (the converted-capital reward × a
   *  per-converted-zone premium). */
  resolveCrusade(crusadeId: string): number {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (!c) return 1;
    c.dead = true;
    let converted = 0;
    for (const hz of this.held.values()) if (hz.crusadeId === crusadeId && this.tierIdxFor(hz) >= 4) converted++;
    for (const [zid, hz] of [...this.held]) if (hz.crusadeId === crusadeId) this.held.delete(zid);
    this.crusades = this.crusades.filter(x => x.id !== crusadeId);
    return this.cfg.sanctum.rewardMul * (1 + 0.25 * converted);
  }

  /** Mark a crusade's sanctum realm as minted (so the engine mints it once). */
  markSanctumMinted(crusadeId: string): void {
    const c = this.crusades.find(x => x.id === crusadeId);
    if (c) c.sanctumMinted = true;
  }
  sanctumMinted(crusadeId: string): boolean {
    return this.crusades.find(c => c.id === crusadeId)?.sanctumMinted ?? false;
  }

  activeCount(): number { return this.crusades.filter(c => !c.dead).length; }

  /** Read-only snapshot for markers / tests. */
  peek(): ReadonlyArray<{ id: string; faction: string; color: string; strongholdId: string | null; coord: MapCoord; held: number; capitalTier: number; sanctumReady: boolean }> {
    return this.crusades.filter(c => !c.dead).map(c => {
      const sh = c.strongholdId ? this.held.get(c.strongholdId) : undefined;
      return {
        id: c.id, faction: c.faction, color: c.color,
        strongholdId: c.strongholdId, coord: c.strongholdCoord,
        held: [...this.held.values()].filter(h => h.crusadeId === c.id).length,
        capitalTier: sh && sh.crusadeId === c.id ? this.tierIdxFor(sh) : 0,
        sanctumReady: c.strongholdId ? (this.crusadeOn(c.strongholdId)?.sanctumReady ?? false) : false,
      };
    });
  }

  // --- internals -------------------------------------------------------------

  private registerHeld(zoneId: string, c: ActiveCrusade, isStronghold: boolean): void {
    if (this.held.has(zoneId)) return;
    const z = this.nodesById[zoneId];
    let netFactor = isStronghold ? this.cfg.strongholdAccel : this.cfg.minNetFactor;
    if (!isStronghold && z) {
      const d = coordDist(z.map, c.strongholdCoord);
      netFactor = clamp(1.2 - d / this.cfg.networkRange, this.cfg.minNetFactor, 1.2);
    }
    this.held.set(zoneId, { crusadeId: c.id, faction: c.faction, ageHeld: 0, netFactor, isStronghold });
  }

  /** Index of the highest tier a held zone has reached (1..4), capped for
   *  non-capital zones (only the stronghold converts to a city + sanctum). */
  private tierIdxFor(hz: CrusadeZone): number {
    let idx = 1;
    for (const t of this.cfg.tiers) if (hz.ageHeld >= t.atSecondsHeld) idx = t.tier;
    const cap = hz.isStronghold ? 4 : this.cfg.nonCapitalMaxTier;
    return Math.min(idx, cap);
  }

  private tierFor(hz: CrusadeZone): CrusadeTier {
    const idx = this.tierIdxFor(hz);
    return this.cfg.tiers.find(t => t.tier === idx) ?? this.cfg.tiers[0];
  }

  /** atSecondsHeld threshold of a tier index (for sanctum gating). */
  private tierAt(tierIdx: number): number {
    return this.cfg.tiers.find(t => t.tier === tierIdx)?.atSecondsHeld ?? 0;
  }

  /** A crusade's projected POWER at one held zone: the zone's own maturation tier
   *  (the local gradient) compounded by the crusade's overall MIGHT (held count +
   *  capital tier). So a deep zone of a big, mature crusade is mighty while a fresh
   *  frontier of a small one is weak — a minor vanguard can never overrun a capital.
   *  `sizes` is the precomputed held-count per crusade for the pass. */
  private zonePower(hz: CrusadeZone, sizes: Map<string, number>): number {
    const might = (sizes.get(hz.crusadeId) ?? 1) + this.capitalTierOf(hz.crusadeId);
    return this.tierIdxFor(hz) * this.cfg.clash.perTier + might * this.cfg.clash.perMight;
  }

  /** The maturation tier of a crusade's capital (1 if none held yet). */
  private capitalTierOf(crusadeId: string): number {
    const c = this.crusades.find(x => x.id === crusadeId);
    const sh = c?.strongholdId ? this.held.get(c.strongholdId) : undefined;
    // Guard a stale id: if the stronghold zone was wrested by a rival, it no longer
    // belongs to this crusade — its capital might collapses to the floor.
    return sh && sh.crusadeId === crusadeId ? this.tierIdxFor(sh) : 1;
  }

  /** Resolve the WARFRONT where rival crusades meet: every contested border zone (held
   *  by R, adjacent to a zone held by a DIFFERENT-faction crusade O) flips to the
   *  STRONGEST attacker whose power clears the defender's by takeMargin. The taken zone
   *  arrives FRESH (touched) for the winner, so the front is a genuine tug-of-war the
   *  loser can push back — and a clearly mightier crusade grinds steadily forward. */
  private resolveClashes(): void {
    const sizes = new Map<string, number>();
    for (const hz of this.held.values()) sizes.set(hz.crusadeId, (sizes.get(hz.crusadeId) ?? 0) + 1);
    const flips: { zoneId: string; to: ActiveCrusade; from: string }[] = [];
    for (const [nId, defHz] of this.held) {
      const nz = this.nodesById[nId];
      if (!nz) continue;
      if (defHz.ageHeld < this.cfg.clash.holdGuard) continue; // a just-wrested zone holds — no instant ping-pong
      const defPower = this.zonePower(defHz, sizes);
      let best: { c: ActiveCrusade; power: number } | null = null;
      for (const e of nz.exits) {
        if (e.to === '?') continue;
        const atkHz = this.held.get(e.to);
        if (!atkHz || atkHz.faction === defHz.faction) continue; // same faction = allied, no clash
        const atkPower = this.zonePower(atkHz, sizes);
        if (atkPower > (best?.power ?? 0)) {
          const c = this.crusades.find(x => x.id === atkHz.crusadeId && !x.dead);
          if (c) best = { c, power: atkPower };
        }
      }
      if (best && best.power > defPower * this.cfg.clash.takeMargin && this.rng.chance(this.cfg.clash.chance)) {
        flips.push({ zoneId: nId, to: best.c, from: defHz.faction });
      }
    }
    for (const f of flips) {
      // If the wrested zone was a crusade's CAPITAL, disown it — that crusade can no
      // longer spread (update gates on strongholdId) and its capital might collapses
      // (capitalTierOf floors), so losing your seat is a real, cascading defeat.
      const loser = this.crusades.find(x => x.strongholdId === f.zoneId);
      if (loser) loser.strongholdId = null;
      this.held.delete(f.zoneId);               // wrested from the loser
      this.registerHeld(f.zoneId, f.to, false); // …and arrives FRESH for the winner (re-conquest, not inherited maturation)
      this.frontShifts.push({ zoneId: f.zoneId, faction: f.to.faction, from: f.from });
    }
  }

  /** DEV: force a crusade whose stronghold IS the given (current) zone, aged so it
   *  materializes a meaty tier (a fortress by default) immediately, in-place. (QA.) */
  devIgnite(view: OverlayView, zoneId: string, ageSeconds = 130): boolean {
    const here = view.byId[zoneId];
    if (!here || here.caveDepth != null || here.floating || here.eventOwned || here.objective.kind === 'safe') return false;
    const faction = this.pickFaction();
    if (!faction) return false;
    const id = `cru_${this.seq++}`;
    this.crusades.push({
      id, faction, color: FACTION_COLORS[faction] ?? this.cfg.color ?? CRUSADE_GOLD,
      dir: DIRS[0], strongholdId: null, strongholdCoord: { x: here.map.x, y: here.map.y },
      anchorId: here.id, age: ageSeconds, minted: true, mints: 0, claimAcc: 0,
      sanctumMinted: false, dead: false,
    });
    this.bindStronghold(id, zoneId);
    const hz = this.held.get(zoneId);
    if (hz) hz.ageHeld = ageSeconds; // age up to a visible structure tier
    return true;
  }

  private maybeIgnite(view: OverlayView): void {
    const g = this.gate();
    if (this.crusades.filter(c => !c.dead).length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.triggerChance * g.ignitionMul, 0, 1))) return;
    const here = view.byId[view.currentZoneId];
    if (!here || here.caveDepth != null || here.eventOwned) return;
    const faction = this.pickFaction();
    if (!faction) return;
    const dir = DIRS[this.rng.int(0, DIRS.length - 1)];
    const steps = this.rng.int(this.cfg.seedSteps[0], this.cfg.seedSteps[1]);
    const coord = projectCoord(here.map, dir, steps);
    const id = `cru_${this.seq++}`;
    const color = FACTION_COLORS[faction] ?? this.cfg.color ?? CRUSADE_GOLD;
    // The stronghold is a banner planted off in UNEXPLORED, uncharted territory
    // (often beyond the player's vision) — minted FLOATING (a free point, NOT
    // auto-anchored to the nearest existing node). It wires into the graph only
    // once the front reaches within accessRadius of charted ground (the engine's
    // accessibility stopgap); until then it's a simulated point on the warfront.
    this.crusades.push({
      id, faction, color, dir, strongholdId: null, strongholdCoord: coord,
      anchorId: here.id, age: 0, minted: false, mints: 0, claimAcc: 0,
      sanctumMinted: false, dead: false,
    });
    this.mintRequests.push({
      crusadeId: id, coord, anchorZoneId: here.id, zoneKey: `crusade_${id}`,
      tileset: this.cfg.strongholdTileset, level: Math.max(here.level, view.charLevel),
      kind: 'stronghold',
    });
  }

  /** A Crusade expands its front: SIMULATE a new adjacent zone (a floating point
   *  one cardinal step off one of its held nodes — the vanguard pressing into the
   *  wilds), or, where it already touches charted ground, claim a real neighbour. */
  private maybeClaim(c: ActiveCrusade, view: OverlayView): void {
    const mine = [...this.held.entries()].filter(([, h]) => h.crusadeId === c.id);
    if (mine.length >= this.cfg.maxHeldZones) return;
    // SIMULATE the next adjacent node: project ONE cardinal step off a RANDOM held
    // node into a fresh coordinate. It's minted FLOATING — the crusade's territory
    // exists in the wilds (shown on the warfront) before it's reachable; the engine
    // wires it in once it nears charted ground. The Crusade thus expands STEPWISE
    // through simulated nodes it can already operate in (no real zone required yet).
    if (c.mints < this.cfg.maxMints && this.rng.chance(this.cfg.frontierMintChance)) {
      const from = mine[this.rng.int(0, mine.length - 1)];
      const fz = this.nodesById[from[0]];
      if (fz) {
        const dir = DIRS[this.rng.int(0, DIRS.length - 1)];
        const coord = projectCoord(fz.map, dir, 1);
        // Skip if this crusade already holds a node ~at the coordinate.
        const dup = mine.some(([zid]) => { const z = this.nodesById[zid]; return !!z && coordDist(z.map, coord) < 52; });
        if (!dup) {
          const key = `crusade_${c.id}_f${c.mints++}`;
          this.mintRequests.push({
            crusadeId: c.id, coord, anchorZoneId: from[0], zoneKey: key,
            tileset: this.cfg.strongholdTileset,
            level: Math.max(fz.level, view.charLevel),
            kind: 'frontier',
          });
          return;
        }
      }
    }
    // Else, where a held node already touches charted ground, claim a real neighbour
    // (the war reaching the player's explored lands).
    const cands = new Set<string>();
    for (const [zid] of mine) {
      const z = view.byId[zid];
      if (!z) continue;
      for (const e of z.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.held.has(nb.id) || nb.objective.kind === 'safe' || nb.caveDepth != null || nb.eventOwned) continue;
        if (!eventAllowed('crusade', nb)) continue; // a biome may forbid the crusade (no march into the deep sea)
        cands.add(nb.id);
      }
    }
    if (!cands.size) return;
    const arr = [...cands];
    this.registerHeld(arr[this.rng.int(0, arr.length - 1)], c, false);
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
}

// --- map markers (registered on import — zero panels.ts edits) ---------------
//
// A stronghold banner (visible even in the fog, like a quest target — it PULLS
// the player toward the distant crusade), upgrading to a Leader skull once the
// capital converts and its sanctum opens.
registerMarkerSource((world: World): MapMarker[] => {
  const cf = world.sim.crusadeField;
  if (!cf) return [];
  const out: MapMarker[] = [];
  for (const c of cf.peek()) {
    const node = c.strongholdId ? world.zoneMap[c.strongholdId] : null;
    const coord = node ? { x: node.map.x, y: node.map.y } : c.coord;
    if (c.sanctumReady) {
      out.push({
        id: `crusade-leader-${c.id}`, zoneId: c.strongholdId ?? undefined, coord,
        glyph: '☗', fill: '#2a1e08', stroke: c.color, text: c.color, r: 10,
        title: `Crusade capital — slay the leader`, fog: 'always', z: 19,
      });
    } else {
      out.push({
        id: `crusade-${c.id}`, zoneId: c.strongholdId ?? undefined, coord,
        glyph: '♜', fill: '#241c08', stroke: c.color, text: c.color, r: 9,
        title: `A Crusade musters here`, fog: 'always', z: 15,
      });
    }
  }
  return out;
});
