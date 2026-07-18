// ---------------------------------------------------------------------------
// INCURSION FRAMEWORK — a generalized, faction-themed, EVENT-DRIVEN world blight.
//
// Unlike a Demon Invasion (a marching storm) or a Crusade (a spreading army), an
// Incursion fields NO host: it LANDS a cluster of themed epicenter zones far off
// in the unexplored wilds (hidden — the map neither draws them nor zooms to them),
// wears its blight over that ground WHILE IT LIVES (a keyed heat-map warp + the
// pinned pall — both recede when it collapses; the transience law,
// docs/engine/transience.md), and slowly REACHES OUT — organic,
// non-circular tentacles of influence (Pass 2b) — to nearby zones, where it fires
// deliberately-wired EVENTS (Pass 2c) and can be repelled (Pass 2d). Every dial,
// crucially the SPREAD aggression + the growth CAP, is data on the archetype, so a
// new faction's incursion is one archetype entry. Eldritch is the first.
//
// This overlay is PURE of the engine (like every WorldOverlay): it owns the
// cross-zone state (epicenters + the reach), emits MINT REQUESTS the engine drains,
// and exposes accessors (influence(zoneId)) the engine reads to fire events. It is
// always-on infrastructure (constructed in WorldSim regardless of packages); a
// package's own overlay TRIGGERS it via the engine (ConclaveField → ignite()).
//
// Pass 2a (this file's live behavior): THE LANDING — ignite picks a far cluster,
// emits mints, returns the announce. The reach sim, the gloop render, the event
// rolls, and the termination policy are DECLARED on the archetype and stubbed here
// (update/influence/renderMap inert) — the reserved seams 2b–2d grow into.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import { DIRS, MAP_DIR, projectCoord, type MapCoord } from '../../world/coords';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { registerEventFront } from '../../engine/eventWeather';
import { scaledCap } from '../frequency';
import type { World } from '../../engine/world';

/** Approx node-units per graph hop (the 'graph'/'hybrid' reach maps a tentacle's
 *  length to a road-hop radius). Matches the world map's cardinal step (~78–86). */
const GRAPH_EDGE = 85;

/** The whole spread/reach behavior as tunable data — the MODULAR aggression dials
 *  the design wants to adjust. Consumed by the reach sim in Pass 2b; declared now
 *  so an archetype is stable and the knobs are swappable/extensible per faction. */
export interface IncursionSpread {
  /** Which reach model drives the tentacles (all three are pluggable strategies; a
   *  far/disconnected epicenter wants 'freeSpace' or 'hybrid'). */
  model: 'graph' | 'freeSpace' | 'hybrid';
  /** Tentacles per epicenter (the reach is the UNION of these pseudopods). */
  pseudopods: number;
  /** A tentacle's length the moment it lands (node-units). */
  startReach: number;
  /** Mean tentacle GROWTH per second (node-units/sec) — the speed/aggression dial. */
  growthPerSec: number;
  /** Tentacle RETRACT per second (node-units/sec) — how fast it pulls back / recedes
   *  (the writhe pulse + the Pass-2d cleanse). Independent of growth, so a blight can
   *  lunge out fast and recede slowly, or the reverse. */
  retractPerSec: number;
  /** Hard CAP on a tentacle's length (node-units) — the per-epicenter reach ceiling. */
  maxReach: number;
  /** Tentacle half-width (node-units): narrow = a probing tentacle, wide = a blob. */
  reachWidth: number;
  /** How erratically the tentacles SWING (radians/sec of angular drift). */
  wander: number;
  /** How much each tentacle's target length randomly varies (0..1) — writhe in/out. */
  lengthJitter: number;
  /** Intensity falloff along + across a tentacle (>1 = sharper, hugs the epicenter). */
  falloff: number;
  /** DRAWN reach ÷ TRUE reach. <1 = the gloop LAGS inside the real (event-firing)
   *  frontier (you meet events first, glimpse the tentacles later); 1 = matches;
   *  >1 = the gloop reaches AHEAD of the true frontier — a telegraph that screams
   *  urgency (the end-game "it is coming for you" archetype). Every dial here is an
   *  archetype attribute, so a future event can be tuned to any of these styles. */
  renderLagFrac: number;
}

/** The growth CAP across an incursion (separate from per-epicenter maxReach) — the
 *  other half of the modular aggression control. */
export interface IncursionCap {
  /** Most zones one incursion can hold under influence at once (0 = uncapped). */
  maxInfluencedZones: number;
  /** Most concurrent incursions of this archetype (multiple landings). */
  maxConcurrent: number;
}

/** How an incursion ENDS (Pass 2d). Declared now so the archetype + ledger keys
 *  are stable. 'hybridCleanseObserver' = cleansing events retract the reach + an
 *  Observer kill collapses it; 'ambientCapped' = the reusable no-win standing
 *  hazard (capped growth, spoils only) — kept as a first-class precedent for
 *  future archetypes that want a permanent blight. */
export interface IncursionTermination {
  policy: 'hybridCleanseObserver' | 'ambientCapped';
  /** Monster id of the epicenter Observer (the kill that collapses it). */
  observer?: string;
  /** How much resolving one zone's event retracts the reach (hybrid only). */
  cleanseRetract?: number;
  /** Observer-kill reward multiplier: base + festerBonusMax × min(1, age /
   *  festerSeconds) — "the longer it spread, the richer the collapse". Optional
   *  (defaults preserve the classic 1.5 + up to 2 over 240s). */
  observerReward?: { base: number; festerBonusMax: number; festerSeconds: number };
}

/** How a per-fire COUNT scales with the zone's influence intensity:
 *  count = perFire × (intensityFloor + intensityGain × intensity). Both are
 *  archetype dials (no magic numbers in the engine) — e.g. floor 0.5/gain 1 = a
 *  count from 0.5× (faint) to 1.5× (deep) the base. perFire ≤ 0 turns the event off. */
export interface CountScale {
  perFire: number;
  intensityFloor: number;
  intensityGain: number;
}

/** Tuning for the monster-corruption event (all attributable). */
export interface CorruptionEventCfg extends CountScale {
  dmgMore: number;        // 'more' damage on a corrupted foe
  lifeMore: number;       // 'more' life on a corrupted foe
  maxFraction: number;    // up to this fraction of a zone's foes may be corrupted
  grantSkill?: string;    // optional skill id granted to corrupted foes (omit = none)
}

/** Tuning for the tentacle-field event. */
export interface TentacleFieldEventCfg extends CountScale {
  radius: number;
  duration: number;       // seconds the patch lingers
  farFrom: number;        // minimum distance from the player a patch drops (a dodge window)
}

/** Tuning for the doodad-mutation event: graft tentacle adorns onto a fraction of a
 *  zone's solid doodads, and a CHANCE each also becomes an ambient SWING hazard. */
export interface DoodadMutationEventCfg extends CountScale {
  maxFraction: number;     // up to this fraction of mutable doodads get tentacles
  swingChance: number;     // chance a mutated doodad ALSO gets the swing effect
  swing: { interval: number; radius: number; chance: number; power: number; powerPerLevel: number };
}

/** Tuning for the eldritch-spawn event: conjure monstrosities into the zone. */
export interface SpawnEventCfg extends CountScale {
  maxAlive: number;        // cap on concurrent tagged eldritch spawns in the zone
  farFrom: number;         // min distance from the player they appear
}

/** Per-event-type tuning for an archetype. A new event type = a field here + a
 *  handler (engine) + an `events` weight — the nested-framework extension point. */
export interface IncursionEventConfig {
  corruption: CorruptionEventCfg;
  tentacleField: TentacleFieldEventCfg;
  doodadMutation: DoodadMutationEventCfg;
  spawn: SpawnEventCfg;
}

/** One faction's incursion, as data. A new themed blight = one of these. */
export interface IncursionArchetype {
  id: string;
  /** Faction ids this incursion fields (its epicenter population + spawns). */
  factions: string[];
  /** The ominous bulletin shown when it lands. */
  announce: string;
  /** Theming colour (gloop, washes, bulletins). */
  color: string;
  /** THE PALL (engine/eventWeather.ts): an eventOnly WEATHER_DEFS kind pinned
   *  over influenced zones at `max × influence` — the veil DEEPENS toward the
   *  epicenter and recedes as the reach is cleansed back, and it clears
   *  entirely when the incursion collapses. Omitted = the blight has no air. */
  weather?: { kind: string; max: number };
  // --- THE LANDING (Pass 2a) ---
  /** Tileset the epicenter zones are minted from. */
  tileset: string;
  /** Biome the landing wears on the world map while it lives — a KEYED
   *  heat-map warp per epicenter (presentation + attribution only; minted
   *  ground keeps its TRUE biome), released to fade when the epicenter
   *  falls. The transience law, docs/engine/transience.md. */
  biome: string;
  /** The corruption adornment attached to mutated doodads/monsters (Pass 2c). */
  adorn: string;
  /** Epicenter zones minted per landing (the brief's 1–5). */
  nodeCount: [number, number];
  /** Node-STEPS the cluster lands from the trigger origin — FAR (beyond the
   *  charted frontier), so it stays obscured until the player explores to it. */
  mintDistance: [number, number];
  /** Spread of the epicenters around the cluster centre (node-units). */
  clusterRadius: number;
  /** The biome heat-map warp pushed at the cluster (radius + strength). */
  biomeWarp: { radius: number; strength: number };
  // --- SPREAD / CAP / TERMINATION / EVENTS (Pass 2b–2d; declared now) ---
  spread: IncursionSpread;
  cap: IncursionCap;
  termination: IncursionTermination;
  /** In-zone event cadence: the engine rolls every `eventInterval` seconds, once per
   *  influence SOURCE, firing at `eventChance` × that source's intensity (so overlap
   *  from several epicenters = more rolls = more events). */
  eventInterval: number;
  eventChance: number;
  /** The event pool rolled in influenced zones, by weight. */
  events: { id: string; weight: number }[];
  /** Per-event tuning (all attributable; the engine handlers read it). */
  eventConfig: IncursionEventConfig;
}

/** Engine-drained: mint a (hidden, floating) epicenter zone at a coordinate, and
 *  warp the biome field around it. Mirrors CrusadeMintRequest. */
export interface IncursionMintRequest {
  /** The epicenter id (the engine calls bindEpicenter after placeZoneAt). */
  id: string;
  coord: MapCoord;
  zoneKey: string;
  tileset: string;
  level: number;
  biome: string;
  biomeRadius: number;
  biomeStrength: number;
}

/** One tentacle of an epicenter's reach — a heading + a writhing length. */
interface Pseudopod {
  /** Heading in radians (drifts by `spread.wander`). */
  angle: number;
  /** Current length (node-units) — random-walks toward `target`, capped at maxReach. */
  len: number;
  /** The length this tentacle is currently reaching for (re-rolled now and then). */
  target: number;
}

interface Epicenter {
  id: string;
  coord: MapCoord;
  /** The minted zone id, once the engine has placed it. */
  zoneId: string | null;
  /** The reaching tentacles (the freeSpace reach is their union). */
  pods: Pseudopod[];
}

interface Incursion {
  id: string;
  archetype: string;
  origin: MapCoord;
  center: MapCoord;
  epicenters: Epicenter[];
  age: number;
  dead: boolean;
}

/** The registry — adding a faction's incursion is one entry. */
export const INCURSION_ARCHETYPES: Record<string, IncursionArchetype> = {
  eldritch: {
    id: 'eldritch',
    factions: ['eldritch'],
    announce: 'An observer has landed — something vast turns its gaze upon this world.',
    color: '#7fce6a', // a sickly bioluminescent green over the eldritch violet
    weather: { kind: 'eldritch_pall', max: 0.85 },
    tileset: 'eldritch',
    biome: 'eldritch',
    adorn: 'tentacles',
    nodeCount: [1, 3],          // 1–3 epicenter zones per landing (≤5 per the brief)
    mintDistance: [9, 15],      // FAR — well beyond the charted frontier (crusade lands closer)
    clusterRadius: 150,
    biomeWarp: { radius: 260, strength: 0.7 },
    spread: {
      model: 'freeSpace',       // a far, disconnected epicenter reaches across coordinate space
      pseudopods: 4,
      startReach: 90,
      growthPerSec: 7,          // ← reach SPEED (node-units/sec)
      retractPerSec: 5,         // ← how fast it pulls back (writhe + cleanse)
      maxReach: 560,            // ← per-epicenter reach CAP (node-units)
      reachWidth: 130,          // a probing tentacle, not a blob
      wander: 0.5,              // gentle writhing swing
      lengthJitter: 0.45,       // tentacles pulse in + out
      falloff: 1.4,
      renderLagFrac: 0.6,       // the gloop trails inside the true reach — events lead, tentacles follow
    },
    cap: { maxInfluencedZones: 14, maxConcurrent: 1 },
    // The OBSERVER that landed is Vhal-Serrat, the Convergence — the script-FSM
    // boss (data/monsters.ts): rotation phases, an add-warded veil, a held apex.
    // Slaying it ends the incursion; the eldritch_horror remains the faction's
    // warlord for its ordinary war routes.
    termination: { policy: 'hybridCleanseObserver', observer: 'vhal_serrat', cleanseRetract: 60 },
    eventInterval: 3,           // roll in-zone events every 3s…
    eventChance: 0.5,           // …at 50% × the zone's influence intensity, per source
    events: [
      { id: 'monster_corruption', weight: 3 },
      { id: 'tentacle_field', weight: 2 },
      { id: 'doodad_mutation', weight: 2 },
      { id: 'eldritch_spawn', weight: 1 },
    ],
    eventConfig: {
      corruption: { dmgMore: 0.5, lifeMore: 0.4, maxFraction: 0.6, perFire: 2, intensityFloor: 0.5, intensityGain: 1 },
      tentacleField: { radius: 95, duration: 9, perFire: 1, intensityFloor: 0.5, intensityGain: 0.5, farFrom: 90 },
      doodadMutation: { maxFraction: 0.5, perFire: 2, intensityFloor: 0.5, intensityGain: 1, swingChance: 0.45,
        swing: { interval: 2.2, radius: 95, chance: 0.5, power: 8, powerPerLevel: 1.6 } },
      spawn: { maxAlive: 6, farFrom: 240, perFire: 1, intensityFloor: 0.5, intensityGain: 1 },
    },
  },
};

export class IncursionField implements WorldOverlay {
  readonly id = 'incursion';
  /** Durable: a landed blight is the long arc of its triggering package (the
   *  Conclave's whole incubation pays into it) — epicenters, reach, and minted
   *  ground all resume; its zones ride the ownedZones claim. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Incursions';
  /** Engine-drained mint seam (host-only): hidden epicenter zones + biome warps. */
  readonly mintRequests: IncursionMintRequest[] = [];
  /** Global concurrency crank (frequency.concurrency, set by WorldSim) — the
   *  always-on infra field has no package gate, so the sim hands it the run's
   *  lever directly (the weather/invasion migrated-feature pattern). */
  concurrencyScale = 1;

  private rng: Rng;
  private incursions: Incursion[] = [];
  private seq = 0;
  /** Cached each tick from the view, so the influence accessors + the gloop render
   *  can resolve zone coords + the charted (visited) set without the engine. */
  private nodesById: Record<string, ZoneDef> = {};
  private visited: ReadonlySet<string> = new Set();
  /** Per-tick memo of graph-reach BFS results ('graph'/'hybrid' models only), keyed
   *  `epId:lenScale`. Cleared each update so it never goes stale as the pods grow. */
  private reachMemo = new Map<string, Map<string, number>>();

  constructor(rng: Rng) { this.rng = rng; }

  // Pass 2b: advance the tentacle reach. (Event rolls 2c, termination 2d still inert.)
  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    this.visited = view.visited;
    this.reachMemo.clear(); // pods are about to move — drop last tick's graph-reach memo
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      inc.age += dt;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      // GROWTH CAP: once enough charted zones are under the blight, hold the reach
      // (tentacles may still writhe/shrink, but the front stops advancing). The
      // global concurrency crank widens how much ground one blight may hold.
      const frozen = a.cap.maxInfluencedZones > 0
        && this.influencedCount(inc, a) >= scaledCap(a.cap.maxInfluencedZones, this.concurrencyScale);
      for (const ep of inc.epicenters) {
        for (const pod of ep.pods) {
          pod.angle += this.rng.range(-1, 1) * a.spread.wander * dt; // writhe (swing)
          // Re-aim the target length now and then (the tentacle pulses in + out).
          if (pod.target <= 0 || this.rng.chance(0.5 * dt)) {
            const span = a.spread.maxReach - a.spread.startReach;
            pod.target = a.spread.startReach + span * (1 - a.spread.lengthJitter * this.rng.next());
          }
          // Move toward the target — growth + retract have INDEPENDENT rates; while
          // the cap is hit the grow rate is 0, so the front holds (and may recede).
          const grow = frozen ? 0 : a.spread.growthPerSec * dt;
          const shrink = a.spread.retractPerSec * dt;
          pod.len = clamp(pod.len + clamp(pod.target - pod.len, -shrink, grow), 0, a.spread.maxReach);
        }
      }
    }
  }
  onNodeCharted(): void { /* epicenters are coordinate-anchored; nothing per-node */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // events materialize, never bias the table
  // Pass 2b: paint the DELAYED gloop — writhing tentacles + a faint corruption wash
  // on charted ground, drawn at the reach × renderLagFrac (so it trails the true,
  // event-firing frontier; renderLagFrac > 1 would instead reach AHEAD — urgency).
  // Off-map epicenters are clipped by the map viewBox, reading as tentacles groping
  // in from beyond the known edge. The wash only shows on VISITED zones (corruption
  // where you've been), so the events lead and the tentacles are a glimpse if you look.
  renderMap(): MapLayer {
    let under = '';
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      const col = a.color, lag = a.spread.renderLagFrac, w = a.spread.reachWidth;
      for (const ep of inc.epicenters) {
        for (let pi = 0; pi < ep.pods.length; pi++) {
          const pod = ep.pods[pi];
          const vlen = pod.len * lag;
          if (vlen <= 4) continue;
          const ax = Math.cos(pod.angle), ay = Math.sin(pod.angle);
          const px = -ay, py = ax; // perpendicular (for the writhe wobble)
          const segs = 6;
          for (let s = 1; s <= segs; s++) {
            const f = s / segs;
            const along = vlen * f;
            const wob = Math.sin(f * 6 + pi * 1.7) * w * 0.25 * f;
            const cx = ep.coord.x + ax * along + px * wob;
            const cy = ep.coord.y + ay * along + py * wob;
            const r = w * (1 - f * 0.7);
            under += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" `
              + `fill="${col}" fill-opacity="${(0.05 + 0.05 * (1 - f)).toFixed(3)}"/>`;
          }
          // The flicker grasp: the tip briefly stretches + glows, then snaps back
          // (self-animating on the map SVG) — "a tentacle reaching, for a moment".
          const tx = ep.coord.x + ax * vlen, ty = ep.coord.y + ay * vlen;
          const dur = (2.4 + pi * 0.6).toFixed(1);
          under += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4" fill="${col}" fill-opacity="0">`
            + `<animate attributeName="fill-opacity" values="0;0.16;0" dur="${dur}s" repeatCount="indefinite"/>`
            + `<animate attributeName="r" values="4;${(w * 0.5).toFixed(0)};4" dur="${dur}s" repeatCount="indefinite"/></circle>`;
        }
      }
      // Faint wash on CHARTED zones under (visual) influence.
      for (const id of Object.keys(this.nodesById)) {
        if (!this.visited.has(id)) continue;
        const vi = this.intensityAt(id, lag);
        if (vi <= 0.05) continue;
        const z = this.nodesById[id];
        under += `<circle cx="${z.map.x}" cy="${z.map.y}" r="${(12 + 14 * vi).toFixed(1)}" `
          + `fill="${col}" fill-opacity="${(0.12 * vi).toFixed(3)}"/>`;
      }
    }
    return { under, over: '' };
  }

  // --- ignition + the landing (Pass 2a) --------------------------------------

  /** A package's trigger fired (the Conclave counter maxed): LAND a new incursion
   *  of `archetypeId` far from `origin`. Picks the cluster + emits mint requests;
   *  returns the bulletin for the engine to announce (or null if unknown/at cap). */
  ignite(archetypeId: string, origin: MapCoord, level: number): { announce: string; color: string } | null {
    const a = INCURSION_ARCHETYPES[archetypeId];
    if (!a) return null;
    if (this.incursions.filter(i => i.archetype === archetypeId && !i.dead).length
      >= scaledCap(a.cap.maxConcurrent, this.concurrencyScale)) return null;
    // The cluster lands FAR off in a random cardinal-ish direction from the origin.
    const dir = DIRS[this.rng.int(0, DIRS.length - 1)];
    const steps = this.rng.int(a.mintDistance[0], a.mintDistance[1]);
    const center = projectCoord(origin, dir, steps);
    // Skew the centre a little off-axis so landings don't line up on the grid.
    const off = MAP_DIR[DIRS[this.rng.int(0, DIRS.length - 1)]];
    center.x += off.x * this.rng.range(0, 1.5);
    center.y += off.y * this.rng.range(0, 1.5);
    const incId = `inc_${this.seq++}`;
    const n = this.rng.int(a.nodeCount[0], a.nodeCount[1]);
    const epicenters: Epicenter[] = [];
    for (let i = 0; i < n; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const r = i === 0 ? 0 : this.rng.range(a.clusterRadius * 0.4, a.clusterRadius);
      const coord = { x: center.x + Math.cos(ang) * r, y: center.y + Math.sin(ang) * r };
      const epId = `${incId}_e${i}`;
      const pods: Pseudopod[] = [];
      for (let p = 0; p < a.spread.pseudopods; p++) {
        pods.push({
          angle: (p / a.spread.pseudopods) * Math.PI * 2 + this.rng.range(-0.4, 0.4),
          len: a.spread.startReach,
          target: a.spread.startReach + (a.spread.maxReach - a.spread.startReach) * (1 - a.spread.lengthJitter * this.rng.next()),
        });
      }
      epicenters.push({ id: epId, coord, zoneId: null, pods });
      this.mintRequests.push({
        id: epId, coord, zoneKey: `${a.id}_${epId}`,
        tileset: a.tileset, level: Math.max(1, level),
        biome: a.biome, biomeRadius: a.biomeWarp.radius, biomeStrength: a.biomeWarp.strength,
      });
    }
    this.incursions.push({ id: incId, archetype: archetypeId, origin, center, epicenters, age: 0, dead: false });
    return { announce: a.announce, color: a.color };
  }

  /** Bind a freshly-minted epicenter zone (engine calls after placeZoneAt).
   *  `finalCoord` is where the zone ACTUALLY landed (pulled ashore / pushed by
   *  the anti-crowd) — the tentacle render + intensity capsules re-anchor to
   *  it, so the blight never gloops over open ocean its zone was pulled off. */
  bindEpicenter(epId: string, zoneId: string, finalCoord?: MapCoord): void {
    for (const inc of this.incursions) {
      const ep = inc.epicenters.find(e => e.id === epId);
      if (ep) {
        ep.zoneId = zoneId;
        if (finalCoord) { ep.coord.x = finalCoord.x; ep.coord.y = finalCoord.y; }
        return;
      }
    }
  }

  // --- accessors the engine reads (reach is 2b) ------------------------------

  /** Combined 0..1 influence in a zone (peak across epicenters), using the TRUE
   *  reach — events fire at the real frontier, ahead of the lagged gloop. Drives the
   *  event gate (2c). */
  influence(zoneId: string): number { return this.intensityAt(zoneId, 1); }

  /** Per-epicenter contributions in a zone, for INDEPENDENT event rolls — overlap
   *  from several epicenters means more rolls, i.e. a higher event chance. (2c.) */
  influenceSources(zoneId: string): number[] {
    const z = this.nodesById[zoneId];
    if (!z) return [];
    const out: number[] = [];
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      for (const ep of inc.epicenters) {
        const v = this.epicenterIntensity(ep, a, zoneId, 1);
        if (v > 0.001) out.push(v);
      }
    }
    return out;
  }

  /** What the engine needs to fire in-zone EVENTS (Pass 2c) for a zone: the archetype
   *  of the dominant incursion influencing it + every per-source intensity (so the
   *  engine can roll each independently — overlap = more rolls). Null if uninfluenced. */
  eventContext(zoneId: string): { archetype: IncursionArchetype; sources: number[] } | null {
    let best: IncursionArchetype | null = null, bestV = 0;
    const sources: number[] = [];
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      for (const ep of inc.epicenters) {
        const v = this.epicenterIntensity(ep, a, zoneId, 1);
        if (v > 0.05) { sources.push(v); if (v > bestV) { bestV = v; best = a; } }
      }
    }
    return best ? { archetype: best, sources } : null;
  }

  // --- payoff (Pass 2d): the epicenter Observer + the cleanse retract ---------

  /** The incursion + archetype whose epicenter sits in this zone (for the engine to
   *  materialize the Observer), or null. */
  epicenterInfo(zoneId: string): { incId: string; archetype: IncursionArchetype } | null {
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      if (inc.epicenters.some(e => e.zoneId === zoneId)) {
        const a = INCURSION_ARCHETYPES[inc.archetype];
        if (a) return { incId: inc.id, archetype: a };
      }
    }
    return null;
  }

  /** The epicenter's Observer was slain → remove that epicenter; if its incursion has
   *  none left, the whole incursion COLLAPSES. Returns a reward multiplier scaled by
   *  how long it festered (the risk/reward of letting it spread). */
  resolveEpicenter(zoneId: string): number {
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const i = inc.epicenters.findIndex(e => e.zoneId === zoneId);
      if (i < 0) continue;
      inc.epicenters.splice(i, 1);
      const r = INCURSION_ARCHETYPES[inc.archetype]?.termination.observerReward
        ?? { base: 1.5, festerBonusMax: 2, festerSeconds: 240 };
      const mul = r.base + r.festerBonusMax * Math.min(1, inc.age / Math.max(1, r.festerSeconds));
      if (!inc.epicenters.length) inc.dead = true;
      return mul;
    }
    return 1;
  }

  /** A blight foe was culled in `zoneId` → RETRACT the reach of the epicenter(s)
   *  influencing it (shrink their tentacles by `amount`), pushing the front back.
   *  Only meaningful for hybrid termination; an AmbientCapped blight just regrows. */
  cleanse(zoneId: string, amount: number): void {
    if (amount <= 0) return;
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      for (const ep of inc.epicenters) {
        if (this.epicenterIntensity(ep, a, zoneId, 1) <= 0.05) continue;
        for (const pod of ep.pods) {
          pod.len = Math.max(0, pod.len - amount);
          pod.target = Math.max(0, pod.target - amount);
        }
      }
    }
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: every live incursion (epicenters, pods, age), any UNDRAINED mint
   *  requests, and the counter. `ownedZones` (the claim convention) names every
   *  BOUND epicenter zone so the minted eldritch ground rides the save. */
  snapshot(): unknown {
    const ownedZones: string[] = [];
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      for (const ep of inc.epicenters) if (ep.zoneId) ownedZones.push(ep.zoneId);
    }
    return {
      ownedZones,
      incursions: this.incursions.filter(i => !i.dead).map(inc => ({
        id: inc.id, archetype: inc.archetype,
        origin: { ...inc.origin }, center: { ...inc.center }, age: inc.age, dead: false,
        epicenters: inc.epicenters.map(ep => ({
          id: ep.id, coord: { ...ep.coord }, zoneId: ep.zoneId,
          pods: ep.pods.map(p => ({ ...p })),
        })),
      })),
      mintRequests: this.mintRequests.map(m => ({ ...m, coord: { ...m.coord } })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { incursions?: unknown[]; mintRequests?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
    const coord = (c: unknown): MapCoord | null => {
      const m = c as { x?: unknown; y?: unknown } | null;
      return m && num(m.x) && num(m.y) ? { x: m.x, y: m.y } : null;
    };
    if (num(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (Array.isArray(s.incursions)) {
      this.incursions = [];
      for (const raw of s.incursions) {
        const i = raw as { id?: unknown; archetype?: unknown; origin?: unknown; center?: unknown; age?: unknown; epicenters?: unknown[] } | null;
        if (!i || typeof i.id !== 'string' || typeof i.archetype !== 'string') continue;
        if (!INCURSION_ARCHETYPES[i.archetype]) continue; // archetype unregistered since the save
        const origin = coord(i.origin), center = coord(i.center);
        if (!origin || !center || !num(i.age) || !Array.isArray(i.epicenters)) continue;
        const epicenters: Epicenter[] = [];
        for (const eraw of i.epicenters) {
          const e = eraw as { id?: unknown; coord?: unknown; zoneId?: unknown; pods?: unknown[] } | null;
          if (!e || typeof e.id !== 'string') continue;
          const c = coord(e.coord);
          if (!c || !Array.isArray(e.pods)) continue;
          const pods: Pseudopod[] = [];
          for (const praw of e.pods) {
            const p = praw as { angle?: unknown; len?: unknown; target?: unknown } | null;
            if (!p || ![p.angle, p.len, p.target].every(num)) continue;
            pods.push({ angle: p.angle as number, len: p.len as number, target: p.target as number });
          }
          if (!pods.length) continue;
          epicenters.push({ id: e.id, coord: c, zoneId: typeof e.zoneId === 'string' ? e.zoneId : null, pods });
        }
        if (!epicenters.length) continue; // nothing left standing — the incursion is spent
        this.incursions.push({ id: i.id, archetype: i.archetype, origin, center, epicenters, age: i.age, dead: false });
      }
    }
    if (Array.isArray(s.mintRequests)) {
      this.mintRequests.length = 0;
      for (const raw of s.mintRequests) {
        const m = raw as Partial<IncursionMintRequest> | null;
        if (!m || typeof m.id !== 'string' || typeof m.zoneKey !== 'string' || typeof m.tileset !== 'string') continue;
        const c = coord(m.coord);
        if (!c || !num(m.level)) continue;
        this.mintRequests.push({
          id: m.id, coord: c, zoneKey: m.zoneKey, tileset: m.tileset, level: m.level,
          ...(typeof m.biome === 'string' ? { biome: m.biome } : {}),
          ...(num(m.biomeRadius) ? { biomeRadius: m.biomeRadius } : {}),
          ...(num(m.biomeStrength) ? { biomeStrength: m.biomeStrength } : {}),
        } as IncursionMintRequest);
      }
    }
  }

  /** A bound epicenter whose zone the sanitizer culled (claims make this RARE —
   *  structural corruption only) unbinds: the reach + events keep firing, but
   *  its Observer payoff is gone, so warn loudly rather than fail silently. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const inc of this.incursions) {
      for (const ep of inc.epicenters) {
        if (ep.zoneId && !has(ep.zoneId)) {
          console.warn(`[incursion] epicenter '${ep.id}' lost its minted zone '${ep.zoneId}' — unbound (no Observer there)`);
          ep.zoneId = null;
        }
      }
    }
  }

  /** Peak influence at a zone across all live epicenters, the reach scaled by
   *  `lenScale` (1 = true reach for events; renderLagFrac for the drawn gloop). */
  private intensityAt(zoneId: string, lenScale: number): number {
    const z = this.nodesById[zoneId];
    if (!z) return 0;
    let best = 0;
    for (const inc of this.incursions) {
      if (inc.dead) continue;
      const a = INCURSION_ARCHETYPES[inc.archetype];
      if (!a) continue;
      for (const ep of inc.epicenters) best = Math.max(best, this.epicenterIntensity(ep, a, zoneId, lenScale));
    }
    return best;
  }

  /** One epicenter's influence at a zone, dispatched by the archetype's reach MODEL —
   *  a swappable strategy (a new model is one more case here + data, never an engine
   *  change), exactly the extensibility the design wants:
   *    freeSpace — capsule geometry across raw coordinate space (grabs nearby nodes
   *                regardless of roads; right for a far, disconnected epicenter);
   *    graph     — spreads strictly along the zone ROADS from the nearest charted
   *                node, intensity by hop-distance (a contagion that follows paths);
   *    hybrid    — the graph decides REACHABILITY, the capsule decides intensity + look.
   *  `lenScale` scales the reach (1 = true, for events; renderLagFrac for the gloop). */
  private epicenterIntensity(ep: Epicenter, a: IncursionArchetype, zoneId: string, lenScale: number): number {
    const z = this.nodesById[zoneId];
    if (!z) return 0;
    switch (a.spread.model) {
      case 'graph':  return this.graphIntensity(ep, a, zoneId, lenScale);
      case 'hybrid': return this.graphIntensity(ep, a, zoneId, lenScale) > 0 ? this.capsuleIntensity(ep, a, z.map, lenScale) : 0;
      default:       return this.capsuleIntensity(ep, a, z.map, lenScale); // 'freeSpace'
    }
  }

  /** FREE-SPACE reach: the max over the epicenter's tentacles (each a capsule from the
   *  epicenter along the pod) plus a deep core near the epicenter. Pure geometry. */
  private capsuleIntensity(ep: Epicenter, a: IncursionArchetype, at: MapCoord, lenScale: number): number {
    const dx = at.x - ep.coord.x, dy = at.y - ep.coord.y;
    const dist = Math.hypot(dx, dy);
    const w = Math.max(1e-3, a.spread.reachWidth); // guard: a 0-width archetype must not NaN
    let best = dist <= w ? clamp(1 - dist / (w * 2), 0, 1) : 0; // the epicenter's own deep core
    for (const pod of ep.pods) {
      const len = pod.len * lenScale;
      if (len <= 1 || dist > len + w) continue;
      const ax = Math.cos(pod.angle), ay = Math.sin(pod.angle);
      const along = dx * ax + dy * ay;              // along the tentacle axis
      if (along < 0 || along > len) continue;
      const lateral = Math.abs(dx * -ay + dy * ax); // off the axis
      if (lateral > w) continue;
      // Falloff applies BOTH along the tentacle and across it (per the dial's doc).
      best = Math.max(best, Math.pow(1 - along / len, a.spread.falloff) * Math.pow(1 - lateral / w, a.spread.falloff));
    }
    return clamp(best, 0, 1);
  }

  /** GRAPH reach: BFS along the zone roads from the epicenter's nearest charted node,
   *  out to a hop-radius set by the live tentacle reach; intensity falls with hops.
   *  Memoized per tick. 'freeSpace' archetypes never call it. */
  private graphIntensity(ep: Epicenter, a: IncursionArchetype, zoneId: string, lenScale: number): number {
    const reachHops = this.reachHopsOf(ep, lenScale);
    if (reachHops <= 0) return 0;
    const h = this.graphHops(ep, reachHops, lenScale).get(zoneId);
    if (h === undefined) return 0;
    return clamp(Math.pow(1 - h / (reachHops + 1), a.spread.falloff), 0, 1);
  }

  /** Live hop-radius of an epicenter's reach (its furthest tentacle ÷ a node step). */
  private reachHopsOf(ep: Epicenter, lenScale: number): number {
    let len = 0;
    for (const pod of ep.pods) len = Math.max(len, pod.len);
    return Math.round((len * lenScale) / GRAPH_EDGE);
  }

  /** BFS distances (zoneId → hops) from the epicenter's nearest charted node, capped
   *  at `reachHops`. Memoized per (epicenter, lenScale) for the tick. */
  private graphHops(ep: Epicenter, reachHops: number, lenScale: number): Map<string, number> {
    const key = `${ep.id}:${lenScale}`;
    const cached = this.reachMemo.get(key);
    if (cached) return cached;
    const out = new Map<string, number>();
    const anchor = this.nearestCharted(ep.coord);
    if (anchor) {
      out.set(anchor.id, 0);
      const q = [anchor.id];
      for (let qi = 0; qi < q.length; qi++) {
        const id = q[qi], h = out.get(id)!;
        if (h >= reachHops) continue;
        const zn = this.nodesById[id];
        if (!zn) continue;
        for (const e of zn.exits) {
          if (e.to === '?' || out.has(e.to) || !this.nodesById[e.to]) continue;
          out.set(e.to, h + 1); q.push(e.to);
        }
      }
    }
    this.reachMemo.set(key, out);
    return out;
  }

  /** Nearest CHARTED (visited) node to a coordinate — the graph reach's entry point. */
  private nearestCharted(c: MapCoord): ZoneDef | null {
    let best: ZoneDef | null = null, bd = Infinity;
    for (const id of Object.keys(this.nodesById)) {
      if (!this.visited.has(id)) continue;
      const z = this.nodesById[id];
      const d = Math.hypot(z.map.x - c.x, z.map.y - c.y);
      if (d < bd) { bd = d; best = z; }
    }
    return best;
  }

  /** Charted (visited) zones currently under this incursion's influence (cap reads it). */
  private influencedCount(inc: Incursion, a: IncursionArchetype): number {
    let n = 0;
    for (const id of Object.keys(this.nodesById)) {
      if (!this.visited.has(id)) continue;
      for (const ep of inc.epicenters) {
        if (this.epicenterIntensity(ep, a, id, 1) > 0.05) { n++; break; }
      }
    }
    return n;
  }

  /** The archetype of a live incursion (engine reads theming / observer id). */
  archetypeOf(incId: string): IncursionArchetype | null {
    const inc = this.incursions.find(i => i.id === incId);
    return inc ? INCURSION_ARCHETYPES[inc.archetype] ?? null : null;
  }

  activeCount(): number { return this.incursions.filter(i => !i.dead).length; }

  /** Read-only snapshot for tests / (future) markers. Epicenters are intentionally
   *  NOT surfaced as map markers in Pass 2a — the landing stays hidden. */
  peek(): ReadonlyArray<{ id: string; archetype: string; center: MapCoord; epicenters: { id: string; coord: MapCoord; zoneId: string | null }[] }> {
    return this.incursions.filter(i => !i.dead).map(i => ({
      id: i.id, archetype: i.archetype, center: i.center,
      epicenters: i.epicenters.map(e => ({ id: e.id, coord: e.coord, zoneId: e.zoneId })),
    }));
  }
}

// --- the pall (registered on import) -----------------------------------------
//
// THE PALL AS WEATHER (engine/eventWeather.ts): influenced zones read the
// archetype's `weather` row through World.skyFront at max × influence — the
// air goes wrong exactly as deep as the reach runs, recedes as tentacles are
// cleansed back, and clears when the incursion collapses. The blight's GROUND
// flavor stays its own event kit (doodad mutation, tentacle fields, spawns) —
// all of it runtime, none of it persisted; the pall is the light over it.
registerEventFront({
  id: 'incursion',
  sample: (world: World, zone: ZoneDef) => {
    if (zone.objective.kind === 'safe') return null;
    const inc = world.sim.incursionField;
    const wx = inc ? inc.eventContext(zone.id)?.archetype.weather : undefined;
    if (!inc || !wx) return null;
    const influence = inc.influence(zone.id);
    return influence > 0.03 ? { kind: wx.kind, intensity: wx.max * influence } : null;
  },
});

// --- zone-info row (registered on import) ------------------------------------
//
// An Incursion renders as a writhing gloop LAYER (drawn on VISITED influenced
// zones), not a marker — so it needs its own zone-info row. We only surface it on
// VISITED ground (mirroring the gloop), so the hidden far landing stays a mystery
// until the player approaches; a revealed epicenter reads as such.
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const inc = world.sim.incursionField;
  if (!inc || !world.visited.has(zoneId)) return [];
  const epi = inc.epicenterInfo(zoneId);
  if (epi) {
    return [{ kind: 'event', icon: '◉', color: epi.archetype.color,
      label: `${cap(epi.archetype.id)} epicenter`, detail: 'an observer has landed', z: 19 }];
  }
  if (inc.influence(zoneId) > 0) {
    const ctx = inc.eventContext(zoneId);
    const color = ctx?.archetype.color ?? '#6fd06f';
    const id = ctx?.archetype.id ?? 'eldritch';
    // Overlapping epicenters (more independent event rolls) read as "deepening".
    const overlap = (ctx?.sources.length ?? 1) > 1 ? ' (deepening)' : '';
    return [{ kind: 'event', icon: '✦', color, label: `${cap(id)} corruption${overlap}`, z: 11 }];
  }
  return [];
});

function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }
