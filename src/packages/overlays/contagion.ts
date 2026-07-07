// ---------------------------------------------------------------------------
// CONTAGION FIELD — a slow-burn, initially INVISIBLE plague that spreads zone-to-
// zone along the adjacency graph (pure overlay).
//
// A Contagion is the world quietly sickening on its own. On a slow tick it IGNITES
// at one streamable zone far from town — PATIENT ZERO — and pre-spreads a small
// ball of infection outward along the EXISTING road edges (z.exits), each zone
// taking an INTENSITY that falls off with its graph hop-distance from the source.
// It keeps creeping one more zone every spreadInterval, silently, with NO map tell:
// the disease festers across faded, unvisited ground before the player ever sees it.
//
// The player STUMBLES into a corrupted zone (the engine fields its plague packs on
// entry) before understanding the source. Only then does the contagion begin to
// READ on the map: a glowing, pulsing outline appears on the infected ADJACENT
// zones (revealHops out from where you stand) — brighter + faster-pulsing the closer
// to the source. Walking toward the strongest glow reveals the next ring, and so on:
// following the intensity backward is a monotonic descent in hops that INEVITABLY
// ends at Patient Zero (the hops===0 zone), where the unique boss festers.
//
// Navigating or clearing zones does NOT touch the contagion. Only felling PATIENT
// ZERO does — and not all at once: it destroys the SOURCE, and the infection then
// recedes OUTWARD from the source over time (cure ring by cure ring, the Migration
// tail-first recession turned inside-out), a slow chain-reaction cleanse.
//
// PURE of the engine, exactly like CrusadeField: it owns the node-space spread + the
// per-zone intensity + the reveal/cure clocks, with no runtime coupling to World (the
// World is handed in only to the import-time marker/zone-info registration). The engine
// reads contagionOn()/patientZeroIn() to materialize the plague + the boss, and calls
// onPatientZeroSlain() when the boss dies. It rides ONLY existing edges (never mints
// frontiers), so it expands naturally as the world web grows.
// ---------------------------------------------------------------------------

import { clamp, mixHex } from '../../core/math';
import { Rng } from '../../core/rng';
import { START_ZONE, type ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { coordDist } from '../../world/coords';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { CONTAGION_COLORS } from '../../world/palette';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed ignition cadence (seconds)

/** The whole Contagion mechanic as data — every number is a knob (mirrors the
 *  other surges). Carried by the def, passed into the overlay constructor. */
export interface ContagionSurge {
  /** Per-STEP base chance (×ignitionMul) a fresh outbreak IGNITES. */
  igniteChance: number;
  /** Most outbreaks festering at once (one disease reads cleanest; a knob). */
  maxConcurrent: number;
  /** Seconds (×severity) between the spread creeping to ONE more zone. */
  spreadInterval: number;
  /** Hops already infected the moment it ignites — so by the time it's NOTICED the
   *  spread is already "pronounced" (a pre-spread ball, not a single seed). */
  initialHops: number;
  /** Spread cap: the contagion never reaches further than this many hops from the
   *  source, and intensity = clamp(1 − hops/maxHops, minIntensity, 1). */
  maxHops: number;
  /** Floor on a far zone's intensity (so the faintest edge still dimly glows). */
  minIntensity: number;
  /** Seconds between the cure receding ONE more ring after Patient Zero falls. */
  cureInterval: number;
  /** How far (graph hops) from a zone the player enters-while-infected the glow
   *  reveals — 1 = strictly the adjacent infected zones (the user's ask). */
  revealHops: number;
  /** Min node-distance from town a source may ignite, so the outbreak is a genuine
   *  trek out in the world (and pre-spreads before the player arrives). */
  seedMinDist: number;
  /** The plague faction the engine fields in an infected zone. */
  faction: string;
  /** Patient Zero's monster id (the engine spawns it at the hops===0 zone). */
  bossDefId: string;
  /** Patient Zero's elite tier on spawn. */
  bossPromote: 'none' | 'champion' | 'crowned';
  /** Plague packs the engine materializes in an infected zone (lerped by intensity)
   *  and the size of each pack. */
  packCount: [number, number];
  packSize: [number, number];
  /** Felling Patient Zero pays this (xp + gems), scaled by the source zone level. */
  reward: { xpBase: number; xpPerLevel: number; gems: number };
  /** The banner colour (entry bulletins; the spawn-contest wash uses FactionSpec.color). */
  color: string;
  /** Optional per-variant glow palette for the map outline + the info row (defaults to
   *  the module CONTAGION_COLORS). Lets a data-only contagion variant paint a different
   *  sickness — the extensibility seam for a second corruption. */
  glow?: { strong: string; weak: string; accent: string };
  /** Optional exponent on the hop falloff — intensity = 1 − (hops/maxHops)^falloffExp.
   *  1 (default) = the linear gradient; >1 holds high then drops steeply; <1 drops fast
   *  then flattens. A pure-data lever on how concentrated the disease reads. */
  falloffExp?: number;
}

/** What the engine reads to field the plague / the boss in a zone. */
export interface ContagionInfo {
  /** 0..1, falls off with hops from the source (the glow + pack-density driver). */
  intensity: number;
  /** This is the hops===0 source (and the outbreak is not yet curing) — the engine
   *  spawns Patient Zero here. */
  isSource: boolean;
  color: string;
  /** 'virulent' | 'spreading' | 'faint' — the severity word for the info row. */
  label: string;
}

/** One festering outbreak — its source + spread/reveal/cure state. */
interface ActiveOutbreak {
  id: string;
  /** The Patient Zero zone id (the hops===0 entry). */
  sourceZoneId: string;
  spreadAcc: number;
  /** The player has entered an infected zone of this run (drives the reveal start
   *  + the one-shot discovery ledger). */
  seen: boolean;
  /** Zone ids whose glow is REVEALED — grown as the player walks the spread backward
   *  (entering an infected zone reveals its infected neighbours within revealHops). */
  revealed: Set<string>;
  /** Patient Zero is dead → the contagion recedes (no more spread). */
  curing: boolean;
  cureAcc: number;
  /** The cure has cleansed every ring with hops ≤ this (advances from −1 outward). */
  curedThrough: number;
  dead: boolean;
}

/** Per-zone infection state (keyed by zone id, crusade.held shape). */
interface InfectedZone {
  runId: string;
  /** Graph hop-distance from the source (0 = Patient Zero). */
  hops: number;
  /** Cached intensity = clamp(1 − hops/maxHops, minIntensity, 1). */
  intensity: number;
}

export class ContagionField implements WorldOverlay {
  readonly id = 'contagion';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: ContagionSurge;
  /** The map-glow palette (per-variant override, else the module default). */
  private readonly glowColors: { strong: string; weak: string; accent: string };
  private outbreaks: ActiveOutbreak[] = [];
  private infected = new Map<string, InfectedZone>();
  private acc = 0;
  private seq = 0;
  /** Live reference to the world's node map (= view.byId), refreshed each tick. */
  private nodesById: Record<string, ZoneDef> = {};

  constructor(ctx: OverlayBuildCtx, surge: ContagionSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
    this.glowColors = surge.glow ?? CONTAGION_COLORS;
  }

  update(dt: number, view: OverlayView): void {
    this.nodesById = view.byId;
    const g = this.gate();
    const pressure = clamp(g.severityMul, 0, 1.5); // spread cadence = the SIZE/severity crank

    // REVEAL: standing in an infected zone unveils it + its infected neighbours (the
    // spread reading backward as the player walks it). Runs every tick (idempotent).
    const here = this.infected.get(view.currentZoneId);
    if (here) {
      const o = this.outbreaks.find(x => x.id === here.runId && !x.dead);
      if (o) this.revealAround(o, view.currentZoneId);
    }

    // LIFECYCLE — each outbreak SPREADS (until killed), then RECEDES (once curing).
    for (const o of this.outbreaks) {
      if (o.dead) continue;
      if (o.curing) {
        o.cureAcc += dt;
        while (o.cureAcc >= this.cfg.cureInterval) { o.cureAcc -= this.cfg.cureInterval; this.cureRing(o); }
      } else if (g.active) { // a closed gate FREEZES the spread (it doesn't recede)
        o.spreadAcc += dt * pressure;
        while (o.spreadAcc >= this.cfg.spreadInterval) { o.spreadAcc -= this.cfg.spreadInterval; this.spread(o, view); }
      }
    }

    // Drop infected zones of finished runs, then recycle the runs (crusade.ts pattern).
    for (const [zid, z] of [...this.infected]) {
      const o = this.outbreaks.find(x => x.id === z.runId);
      if (!o || o.dead) this.infected.delete(zid);
    }
    this.outbreaks = this.outbreaks.filter(o => !o.dead);

    // IGNITION — roll a fresh outbreak on the fixed step (gated by pressure + cap).
    this.acc += dt;
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeIgnite(view); }
  }

  onNodeCharted(): void { /* the spread rides existing edges; a fresh node bordering an infected one is caught next spread tick */ }

  affectSpawns(): SpawnBias { return NO_BIAS; } // the plague is engine-MATERIALIZED (intensity-scaled), not a table bias

  renderMap(_nodes: ZoneDef[]): MapLayer {
    // Painted off this.nodesById (NOT the visited-gated `_nodes` arg) so a glow can
    // appear on the infected ADJACENT zones the player has REVEALED but not yet
    // visited — the affordance that guides them backward. Gating is the per-outbreak
    // `revealed` set: nothing is drawn until the player stumbles in, then the chain
    // unveils ring by ring. (Crusade renders off nodesById likewise to show its front.)
    let under = '', over = '';
    for (const o of this.outbreaks) {
      if (o.dead) continue;
      for (const zid of o.revealed) {
        const z = this.infected.get(zid);
        if (!z || z.runId !== o.id) continue; // cured rings drop out of `infected` → stop glowing
        const n = this.nodesById[zid];
        if (!n) continue;
        const s = clamp(z.intensity, 0, 1);
        const col = mixHex(this.glowColors.weak, this.glowColors.strong, s);
        const cx = n.map.x.toFixed(1), cy = n.map.y.toFixed(1);
        // Soft halo — stacked translucent discs, denser + larger nearer the source
        // (the codebase's no-filter glow, crusade-style).
        for (const [m, base] of [[1, 0.05], [0.6, 0.08]] as const) {
          under += `<circle cx="${cx}" cy="${cy}" r="${(16 * m + 6 * s).toFixed(1)}" `
            + `fill="${col}" fill-opacity="${(base + 0.09 * s).toFixed(3)}"/>`;
        }
        // Crisp pulsing ring — brighter + FASTER the higher the intensity (sicker =
        // nearer the source). SVG <animate> drives the pulse at native framerate,
        // independent of the 0.5s minimap rebuild.
        const op = (0.3 + 0.55 * s).toFixed(2);
        const w = (1.2 + 2 * s).toFixed(1);
        const dur = (2.6 - 1.4 * s).toFixed(2);
        const r0 = 12.5, r1 = (12.5 + 5 * s).toFixed(1);
        over += `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" stroke="${col}" `
          + `stroke-width="${w}" stroke-opacity="${op}">`
          + `<animate attributeName="r" values="${r0};${r1};${r0}" dur="${dur}s" repeatCount="indefinite"/>`
          + `<animate attributeName="stroke-opacity" values="${op};${(+op * 0.35).toFixed(2)};${op}" dur="${dur}s" repeatCount="indefinite"/>`
          + `</circle>`;
        // A ☣ over Patient Zero's own node once it's revealed — "you've traced it home".
        if (z.hops === 0) {
          over += `<text x="${cx}" y="${(n.map.y - 15).toFixed(1)}" text-anchor="middle" `
            + `font-size="13" fill="${this.glowColors.accent}">☣</text>`;
        }
      }
    }
    return { under, over };
  }

  // --- accessors the engine reads -------------------------------------------

  /** Live config (the engine reads the faction / boss / pack / reward knobs). */
  surge(): ContagionSurge { return this.cfg; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): an infected zone. */
  activityAt(zoneId: string): number { return this.contagionOn(zoneId) ? 1 : 0; }

  /** The contagion affecting a zone (intensity + whether it's the source), or null
   *  when uninfected. The engine fields intensity-scaled plague packs off this, and
   *  Patient Zero when isSource. NOT gated on `revealed` — entering an infected zone
   *  always fields its plague, which IS the player stumbling in. */
  contagionOn(zoneId: string): ContagionInfo | null {
    const z = this.infected.get(zoneId);
    if (!z) return null;
    const o = this.outbreaks.find(x => x.id === z.runId);
    if (!o || o.dead) return null;
    return {
      intensity: z.intensity,
      isSource: z.hops === 0 && !o.curing, // a slain Patient Zero never re-spawns (curing)
      color: this.glowColors.strong, // matches the map glow (per-variant)
      label: z.intensity > 0.66 ? 'virulent' : z.intensity > 0.33 ? 'spreading' : 'faint',
    };
  }

  /** Patient Zero's spawn descriptor if this zone is a live source, else null. */
  patientZeroIn(zoneId: string): { bossDefId: string; promote: 'none' | 'champion' | 'crowned' } | null {
    return this.contagionOn(zoneId)?.isSource
      ? { bossDefId: this.cfg.bossDefId, promote: this.cfg.bossPromote }
      : null;
  }

  /** The info row for the map's zone box — only for a zone the player has REVEALED
   *  (so the text matches the glow). */
  revealedInfo(zoneId: string): ContagionInfo | null {
    const z = this.infected.get(zoneId);
    if (!z) return null;
    const o = this.outbreaks.find(x => x.id === z.runId && !x.dead);
    if (!o || !o.revealed.has(zoneId)) return null;
    return this.contagionOn(zoneId);
  }

  /** The player entered an infected zone — flips the run's reveal on and returns
   *  true ONCE per outbreak (the engine bumps contagion_seen + the entry bulletin).
   *  Idempotent thereafter. */
  markDiscovered(zoneId: string): boolean {
    const z = this.infected.get(zoneId);
    if (!z) return false;
    const o = this.outbreaks.find(x => x.id === z.runId && !x.dead);
    if (!o) return false;
    this.revealAround(o, zoneId);
    if (o.seen) return false;
    o.seen = true;
    return true;
  }

  /** Patient Zero was slain in `sourceZoneId` — begin the outward recession. Returns
   *  true if it actually started a cure (the cleanse ledger gates the Vault tiers). */
  onPatientZeroSlain(sourceZoneId: string): boolean {
    const z = this.infected.get(sourceZoneId);
    const o = z ? this.outbreaks.find(x => x.id === z.runId)
                : this.outbreaks.find(x => x.sourceZoneId === sourceZoneId);
    if (!o || o.dead || o.curing) return false;
    o.curing = true;
    o.cureAcc = 0;
    o.curedThrough = -1;
    return true;
  }

  activeCount(): number { return this.outbreaks.filter(o => !o.dead).length; }

  /** Read-only snapshot for tests / a potential marker source: the REVEALED infected
   *  zones with coords + intensity. */
  peek(): ReadonlyArray<{ zoneId: string; x: number; y: number; intensity: number; hops: number; curing: boolean }> {
    const out: { zoneId: string; x: number; y: number; intensity: number; hops: number; curing: boolean }[] = [];
    for (const o of this.outbreaks) {
      if (o.dead) continue;
      for (const zid of o.revealed) {
        const z = this.infected.get(zid);
        const n = this.nodesById[zid];
        if (!z || z.runId !== o.id || !n) continue;
        out.push({ zoneId: zid, x: n.map.x, y: n.map.y, intensity: z.intensity, hops: z.hops, curing: o.curing });
      }
    }
    return out;
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: ignite an outbreak whose SOURCE is the given (current) zone, pre-spread to
   *  the full ball at once so the infection + the glow read immediately. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.streamable(here) || this.infected.has(here.id)) return false;
    const o = this.makeOutbreak(here);
    this.outbreaks.push(o);
    this.infect(here.id, o.id, 0);
    this.infectBall(o, view, this.cfg.maxHops);
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May the plague INFECT / spread into a zone? Kept in lockstep with the engine's
   *  materialize guard: never a cave, special arena, floating / event-owned node, a
   *  sanctuary (the town), or biome-forbidden ground. */
  private streamable(z: ZoneDef): boolean {
    return z.caveDepth == null && !z.special && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && eventAllowed('contagion', z);
  }

  private intensityFor(hops: number): number {
    const t = this.cfg.maxHops > 0 ? hops / this.cfg.maxHops : 1;
    const exp = this.cfg.falloffExp ?? 1; // 1 = the linear gradient (default)
    return clamp(1 - Math.pow(t, exp), this.cfg.minIntensity, 1);
  }

  private infect(zoneId: string, runId: string, hops: number): void {
    this.infected.set(zoneId, { runId, hops, intensity: this.intensityFor(hops) });
  }

  private makeOutbreak(src: ZoneDef): ActiveOutbreak {
    return {
      id: `contagion_${this.seq++}`,
      sourceZoneId: src.id,
      spreadAcc: 0, seen: false, revealed: new Set(),
      curing: false, cureAcc: 0, curedThrough: -1, dead: false,
    };
  }

  /** Pick a streamable, charted source FAR from town (so the outbreak is a trek and
   *  pre-spreads before the player arrives), weighted toward distance + unvisited
   *  ground, then ignite + pre-spread its initial ball. */
  private maybeIgnite(view: OverlayView): void {
    const g = this.gate();
    if (this.outbreaks.filter(o => !o.dead).length >= scaledCap(this.cfg.maxConcurrent, g.concurrencyMul)) return;
    if (!this.rng.chance(clamp(this.cfg.igniteChance * g.ignitionMul, 0, 1))) return;
    const town = view.byId[START_ZONE];
    const tc = town ? town.map : { x: 0, y: 0 };
    const cands = view.nodes.filter(z =>
      this.streamable(z) && !this.infected.has(z.id) && coordDist(z.map, tc) >= this.cfg.seedMinDist);
    if (!cands.length) return;
    // Weight by distance (farther = likelier) + an unvisited bonus (a hidden seed).
    let total = 0;
    const weights = cands.map(z => {
      const w = coordDist(z.map, tc) + (view.visited.has(z.id) ? 0 : 120);
      total += w; return w;
    });
    let r = this.rng.next() * total;
    let src = cands[cands.length - 1];
    for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) { src = cands[i]; break; } }
    const o = this.makeOutbreak(src);
    this.outbreaks.push(o);
    this.infect(src.id, o.id, 0);
    this.infectBall(o, view, this.cfg.initialHops); // already "pronounced" by the time it's noticed
  }

  /** BFS-infect every streamable, uninfected zone within `maxBallHops` of the source
   *  along existing edges (the ignition pre-spread + the dev full-ball). */
  private infectBall(o: ActiveOutbreak, view: OverlayView, maxBallHops: number): void {
    const q = [o.sourceZoneId];
    for (let qi = 0; qi < q.length; qi++) {
      const z = this.infected.get(q[qi]);
      if (!z || z.hops >= maxBallHops) continue;
      const zn = view.byId[q[qi]];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.infected.has(nb.id) || !this.streamable(nb)) continue;
        this.infect(nb.id, o.id, z.hops + 1);
        q.push(nb.id);
      }
    }
  }

  /** Creep the infection to ONE more zone: pick a uninfected streamable neighbour of
   *  the current front (within maxHops) and infect it at parentHops+1. The disease
   *  travels road-by-road — it can only cross edges that already exist (never mints a
   *  frontier), so it naturally expands as the world web grows around it. */
  private spread(o: ActiveOutbreak, view: OverlayView): void {
    const parentHop = new Map<string, number>();
    for (const [zid, z] of this.infected) {
      if (z.runId !== o.id) continue;
      const zn = view.byId[zid];
      if (!zn) continue;
      for (const e of zn.exits) {
        if (e.to === '?') continue;
        const nb = view.byId[e.to];
        if (!nb || this.infected.has(nb.id) || !this.streamable(nb)) continue;
        const ph = Math.min(parentHop.get(nb.id) ?? Infinity, z.hops);
        parentHop.set(nb.id, ph);
      }
    }
    // Only zones still within the spread cap are eligible (a bounded ball of disease).
    const arr = [...parentHop.entries()].filter(([, ph]) => ph + 1 <= this.cfg.maxHops).map(([id]) => id);
    if (!arr.length) return;
    const pick = arr[this.rng.int(0, arr.length - 1)];
    this.infect(pick, o.id, (parentHop.get(pick) ?? 0) + 1);
  }

  /** Grow an outbreak's REVEALED set: a BFS over its infected zones out to revealHops
   *  from `zoneId` (the zone the player just entered). So a stumble unveils the
   *  adjacent infected zones; the next step unveils theirs; the chain leads home. */
  private revealAround(o: ActiveOutbreak, zoneId: string): void {
    const seen = new Set<string>([zoneId]);
    o.revealed.add(zoneId);
    let frontier = [zoneId];
    for (let h = 0; h < this.cfg.revealHops && frontier.length; h++) {
      const next: string[] = [];
      for (const id of frontier) {
        const zn = this.nodesById[id];
        if (!zn) continue;
        for (const e of zn.exits) {
          if (e.to === '?' || seen.has(e.to)) continue;
          const z = this.infected.get(e.to);
          if (!z || z.runId !== o.id) continue; // only this run's infected neighbours reveal
          seen.add(e.to);
          o.revealed.add(e.to);
          next.push(e.to);
        }
      }
      frontier = next;
    }
  }

  /** Recede the cure ONE ring outward from the source: cleanse every zone with hops ≤
   *  curedThrough (so hops 0 = Patient Zero's own zone heals FIRST, then its
   *  neighbours, then theirs — the slow chain-reaction cleanse). When nothing remains
   *  infected, the outbreak is finished (recycled by the dead filter). */
  private cureRing(o: ActiveOutbreak): void {
    o.curedThrough += 1;
    for (const [zid, z] of [...this.infected]) {
      if (z.runId === o.id && z.hops <= o.curedThrough) { this.infected.delete(zid); o.revealed.delete(zid); }
    }
    if (![...this.infected.values()].some(z => z.runId === o.id)) o.dead = true;
  }
}

// --- zone-info row (registered on import — zero panel edits) ------------------
//
// A revealed infected zone surfaces a severity row in the World Map's zone box, so
// the glow on the node and the text in the box read as the same thing. Gated on the
// overlay's own `revealed` set (NOT the fog), so it matches exactly what's glowing —
// an un-discovered outbreak stays a total secret.
registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.contagionField?.revealedInfo(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '☣', color: info.color, label: 'Contagion',
    detail: info.isSource ? 'Patient Zero festers here' : `${info.label} — follow the strongest pulse to its source`,
    z: 14,
  }];
});
