// ---------------------------------------------------------------------------
// CONTAGION FIELD — a slow-burn, initially INVISIBLE plague that spreads zone-to-
// zone along the adjacency graph (pure overlay).
//
// A Contagion is the world quietly sickening on its own. On a slow tick it IGNITES
// at one streamable zone far from town — PATIENT ZERO — and pre-spreads a small
// ball of infection outward along the EXISTING road edges (z.exits), each zone
// taking an INTENSITY that falls off with its graph hop-distance from the source.
// From there the spread is KIN-BORNE (Movement II — the migration grammar as
// carrier): the outbreak keeps a small roster of CARRIERS, sick bodies walking
// the graph on the spreadInterval clock, each step infecting the ground it
// arrives on (priced by the path it walked, capped at maxHops) — and a zone the
// player VISITS while infected births one more carrier (World.materializeContagion
// → seedCarrierAt: bodies infected there spread onward on their own AFTER
// infection). Silent, with NO map tell: the disease festers across faded,
// unvisited ground before the player ever sees it. Each outbreak also ROLLS a
// STRAIN at ignition (packages/contagionStrains.ts — seeded on this overlay's
// own stream); the engine reads it off contagionOn() to dress every taken body.
//
// The player STUMBLES into a corrupted zone (the engine fields its plague packs on
// entry) before understanding the source. Only then does the contagion begin to
// READ on the map: a glowing, pulsing outline appears on the infected ADJACENT
// zones (revealHops out from where you stand) — brighter + faster-pulsing the closer
// to the source. Walking toward the strongest glow reveals the next ring; the
// intensity gradient still descends toward the IGNITION ground — but the quarry
// itself moves: PATIENT ZERO is a NAMED, ROAMING counterpart (Movement III), one
// body in one zone at a time, walking the outbreak's own carrier grammar on a
// slower beat and seeding infection where it stands. Once the outbreak is SEEN,
// the omen fabric murmurs a bearing toward the zero's current seat (aging wider
// — the hunt never goes blind), and the ☣ rides wherever it is revealed.
//
// Navigating or clearing zones does NOT touch the contagion. Only felling PATIENT
// ZERO does — and not all at once: it CUTS the source, and the infection then
// recedes OUTWARD from the ignition ground over time (cure ring by cure ring, the
// Migration tail-first recession turned inside-out), a slow chain-reaction cleanse.
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
import { registerOmenSource, type Omen } from '../../world/omens';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import { CONTAGION_COLORS } from '../../world/palette';
import { rollStrain, strainOf } from '../contagionStrains';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;          // fixed ignition cadence (seconds)

/** THE ROAMING ZERO's fallback dials (surge.zero rows absent take these —
 *  one place, never inline; the zero is the fabric's LAW, not an opt-in).
 *  Numbers are the coordinator's, FLAGGED. */
const ZERO_DEFAULTS = {
  /** The zero steps once per this many spread beats — the head walks
   *  slower than its legs (the carriers), so the map outruns the quarry. */
  stride: 2,
  /** The name pool a fresh outbreak draws its zero from (overlay stream). */
  names: [
    'Maruch, the First Host', 'Vessel Ondrel', 'Hollow Amasa',
    'Carrier Vey', 'The Gray Pilgrim', 'Mother Rot',
    'Yeva the Unburied', 'Pale Tomasz', 'The Patient Man',
  ],
  /** The zero's omen voice ({name}/{bearing}/{dist} expand): whisper/reveal
   *  radii in node units + the aging widen — published only once the
   *  outbreak is SEEN (the silence doctrine holds until the stumble; from
   *  then on the hunt for the root never goes blind). */
  omen: {
    whisper: 280, reveal: 140, widenPerMin: 30,
    lines: [
      '{name} walks {bearing}, and the rot walks with it…',
      'They say the first sickness has a face — something {dist}, {bearing}.',
      'The plague runs thickest {bearing}. Its heart is moving.',
    ],
  },
};

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
  /** Patient Zero's monster id (the engine raises it at the ROAMING zero's
   *  current seat — patientZeroIn). */
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
  /** THE CARRIERS (kin-borne spread): how many sick walkers an outbreak stands
   *  up at ignition (`base`, at the source) and the most it may ever field
   *  (`cap` — player visits birth one more each, seedCarrierAt). Curing
   *  disbands them all: cut the source and no new legs walk. */
  carriers: { base: number; cap: number };
  /** THE INFECTION EXPRESSION (World.updateContagionInfection reads these —
   *  the population-process half): the in-zone sweep cadence, the zombie
   *  lean's watch-rise multiplier (slow to react — riseSec × dullMul), and
   *  the FATED SHARE of the standing zone's own breathing kin the plague
   *  takes, lerped [at minIntensity .. at full] by the zone's intensity (the
   *  Plaguebound court is always taken). The strain status's own DURATION is
   *  the body-wane clock — the engine adds no dial for it. */
  infection: { sweepSec: number; dullMul: number; frac: [number, number] };
  /** THE EATS-PLAGUE DIALS (packages/groundClaims.ts — this consumer owns
   *  them): anchored ground whose folded grip is at/above `threshold` refuses
   *  infection outright (spread + ignition + the pre-spread ball), and
   *  STANDING infection under such a grip wanes off over `waneSec` — the
   *  network eats the plague back, never the reverse. Absent (or no grip
   *  source registered) = the whole lane is structurally silent. */
  grip?: { threshold: number; waneSec: number };
  /** THE ROAMING ZERO (Movement III): the outbreak's named counterpart — its
   *  step cadence (once per `stride` spread beats), the name pool a fresh
   *  outbreak draws from, and its omen voice. Every row optional; absent
   *  rows take ZERO_DEFAULTS (the zero itself is the fabric's law). */
  zero?: {
    stride?: number;
    names?: string[];
    omen?: { whisper: number; reveal: number; widenPerMin: number; lines?: string[] };
  };
}

/** What the engine reads to field the plague / the boss in a zone. */
export interface ContagionInfo {
  /** 0..1, falls off with hops from the source (the glow + pack-density driver). */
  intensity: number;
  /** The outbreak's ROAMING ZERO stands in this zone (and the outbreak is not
   *  yet curing) — the engine raises the named boss here. One zone at a time
   *  by construction (Movement III: the seat walks). */
  isSource: boolean;
  /** The zero's rolled NAME (the omen, the map row and the body all speak
   *  it). Undefined once cut, or on a legacy snapshot mid-adoption. */
  zeroName?: string;
  color: string;
  /** 'virulent' | 'spreading' | 'faint' — the severity word for the info row. */
  label: string;
  /** The outbreak's rolled STRAIN id (contagionStrains.ts) — the engine
   *  dresses taken bodies in its status. Undefined on a strainless outbreak
   *  (no rollable strain registered — the pre-Movement-II plague). */
  strain?: string;
  /** Patient Zero has fallen (or the source was eaten): the outbreak only
   *  recedes now — the engine infects NO new bodies and stops refreshing the
   *  worn marks, so standing infected wane out on the status's own clock. */
  curing: boolean;
}

/** One sick walker: where it stands, and how far (in walked hops) it is from
 *  the source — the price its next infection is stamped at. */
interface CarrierState {
  zoneId: string;
  hops: number;
}

/** One festering outbreak — its source + strain + carriers + spread/reveal/cure
 *  state. */
interface ActiveOutbreak {
  id: string;
  /** The IGNITION ground (the hops===0 entry — the intensity geometry's
   *  anchor; the zero itself walks). */
  sourceZoneId: string;
  /** The rolled STRAIN (contagionStrains.ts — seeded at ignition; undefined
   *  when nothing rollable is registered). */
  strainId?: string;
  /** THE CARRIERS — the sick bodies whose walking IS the spread (kin-borne;
   *  disbanded the moment the outbreak turns to curing). */
  carriers: CarrierState[];
  /** THE ROAMING ZERO (Movement III): the outbreak's named counterpart — ONE
   *  body, one zone at a time, walking the carrier grammar on its own slower
   *  beat and seeding infection where it stands. patientZeroIn resolves at
   *  THIS seat; the cut (slain, or the source lost) clears it — the zero is
   *  the outbreak's life, and a curing outbreak has none. */
  zero?: CarrierState & { name: string };
  /** Spread beats taken (the zero steps on every `stride`-th). */
  zeroBeat: number;
  /** Seconds since the outbreak was SEEN (ages the omen's widening voice). */
  seenAgeSec: number;
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
  /** Seconds this zone has stood under an anchored claim's grip at/above the
   *  eats-plague threshold (transient — never snapshotted; a reload restarts
   *  the meal, which only delays the eating). */
  waneSec?: number;
}

export class ContagionField implements WorldOverlay {
  readonly id = 'contagion';
  /** Durable: a half-traced plague is an investigation arc — the infection
   *  ball, the revealed trail, and a running cure all resume (no quit-to-cure
   *  cheese, no lost trace-home progress). */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'Contagion';

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
  /** THE EATS-PLAGUE READ (packages/groundClaims.ts): the sim hands this
   *  accessor in at boot (sim.ts — the vendetta-bridge idiom, an accessor
   *  instead of pushed values), so the overlay stays PURE of the engine while
   *  consuming the anchored networks' folded grip. Unset (probes, bare
   *  fields) = the whole lane silent. */
  private gripRead?: (zoneId: string) => number;

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
      if (o.seen && !o.curing) o.seenAgeSec += dt; // the omen's voice ages from discovery
      if (o.curing) {
        o.cureAcc += dt;
        while (o.cureAcc >= this.cfg.cureInterval) { o.cureAcc -= this.cfg.cureInterval; this.cureRing(o); }
      } else if (g.active) { // a closed gate FREEZES the spread (it doesn't recede)
        o.spreadAcc += dt * pressure;
        while (o.spreadAcc >= this.cfg.spreadInterval) { o.spreadAcc -= this.cfg.spreadInterval; this.spread(o, view); }
      }
    }

    // THE EATS-PLAGUE CONSUMPTION (groundClaims.ts — Movement II wires the
    // consumer half; her containment asymmetry: the anchored eats the mobile,
    // never the reverse). A zone whose folded grip holds at/above the
    // threshold WANES on this consumer's clock and is eaten off the map; the
    // SOURCE eaten flips the outbreak to curing outright (a heartless plague
    // can only recede — the pruneZones shape), and carriers standing on
    // eaten ground are eaten with it.
    if (this.gripRead && this.cfg.grip) {
      const gr = this.cfg.grip;
      for (const [zid, z] of [...this.infected]) {
        if (this.gripAt(zid) >= gr.threshold) {
          z.waneSec = (z.waneSec ?? 0) + dt;
          if (z.waneSec < gr.waneSec) continue;
          this.infected.delete(zid);
          const o = this.outbreaks.find(x => x.id === z.runId && !x.dead);
          if (!o) continue;
          o.revealed.delete(zid);
          o.carriers = o.carriers.filter(c => c.zoneId !== zid);
          // The zero's ground eaten under it: it slips to the outbreak's own
          // nearest ring (draw-free) — the anchored network eats GROUND, the
          // mobile heart walks on (her containment asymmetry, Movement III).
          if (o.zero?.zoneId === zid) this.rehomeZero(o);
          if (o.sourceZoneId === zid && !o.curing) this.cutSource(o);
          if (![...this.infected.values()].some(zz => zz.runId === o.id)) o.dead = true;
        } else if (z.waneSec) {
          z.waneSec = 0; // the grip lapsed mid-meal — the bite starts over
        }
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
        // A ☣ over the ZERO's CURRENT seat once that zone is revealed — the
        // quarry sighted (Movement III: the mark walks with it; slipping into
        // unrevealed ground takes the mark away until the hunt catches up —
        // the omen keeps murmuring the bearing so it is never lost blind).
        if (o.zero?.zoneId === zid) {
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

  /** The contagion affecting a zone (intensity + whether the ZERO stands
   *  here), or null when uninfected. The engine fields intensity-scaled
   *  plague packs off this, and the named Patient Zero when isSource
   *  (Movement III: the seat ROAMS — one zone at a time by construction; a
   *  slain zero never re-spawns, curing gates it). NOT gated on `revealed` —
   *  entering an infected zone always fields its plague, which IS the player
   *  stumbling in. */
  contagionOn(zoneId: string): ContagionInfo | null {
    const z = this.infected.get(zoneId);
    if (!z) return null;
    const o = this.outbreaks.find(x => x.id === z.runId);
    if (!o || o.dead) return null;
    return {
      intensity: z.intensity,
      isSource: !o.curing && o.zero?.zoneId === zoneId,
      zeroName: o.zero?.name,
      color: this.glowColors.strong, // matches the map glow (per-variant)
      label: z.intensity > 0.66 ? 'virulent' : z.intensity > 0.33 ? 'spreading' : 'faint',
      strain: o.strainId,
      curing: o.curing,
    };
  }

  /** THE EATS-PLAGUE HANDOFF: the sim wires the anchored networks' folded
   *  grip in at boot (world/sim.ts → groundClaimGripAt). An accessor, not
   *  pushed values — the fold is a pure read the overlay may take per zone
   *  per step (the stub's own cheapness law). */
  setGripRead(read: (zoneId: string) => number): void {
    this.gripRead = read;
  }

  /** THE KIN-BORNE SEAM (World.materializeContagion): a zone the player
   *  VISITS while infected births ONE more carrier there — the bodies
   *  infected in it spread onward on their own after infection. Capped
   *  (cfg.carriers.cap); a curing outbreak births none (containment: cut
   *  the source and no new legs walk). Returns whether a carrier stood up. */
  seedCarrierAt(zoneId: string): boolean {
    const z = this.infected.get(zoneId);
    if (!z) return false;
    const o = this.outbreaks.find(x => x.id === z.runId && !x.dead);
    if (!o || o.curing) return false;
    if (o.carriers.length >= this.cfg.carriers.cap) return false;
    o.carriers.push({ zoneId, hops: z.hops });
    return true;
  }

  /** Patient Zero's spawn descriptor if the outbreak's ROAMING ZERO stands in
   *  this zone (Movement III — one zone at a time by construction), else
   *  null. Carries the outbreak's rolled NAME so the raised body, the omen
   *  and the map row all speak the same word. */
  patientZeroIn(zoneId: string): { bossDefId: string; promote: 'none' | 'champion' | 'crowned'; name?: string } | null {
    const info = this.contagionOn(zoneId);
    return info?.isSource
      ? { bossDefId: this.cfg.bossDefId, promote: this.cfg.bossPromote, name: info.zeroName }
      : null;
  }

  /** THE ZERO SEATS (the omen source + probes): each live outbreak's named
   *  zero — its CURRENT zone + node coords, whether the outbreak has been
   *  SEEN (the omen holds the silence doctrine until then), and the seen-age
   *  (the widening voice). Pure read. */
  zeroSeat(): ReadonlyArray<{ outbreakId: string; zoneId: string; name: string; x: number; y: number; seen: boolean; curing: boolean; seenAgeSec: number }> {
    const out: { outbreakId: string; zoneId: string; name: string; x: number; y: number; seen: boolean; curing: boolean; seenAgeSec: number }[] = [];
    for (const o of this.outbreaks) {
      if (o.dead || !o.zero) continue;
      const n = this.nodesById[o.zero.zoneId];
      if (!n) continue;
      out.push({
        outbreakId: o.id, zoneId: o.zero.zoneId, name: o.zero.name,
        x: n.map.x, y: n.map.y, seen: o.seen, curing: o.curing, seenAgeSec: o.seenAgeSec,
      });
    }
    return out;
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

  /** Patient Zero was slain in `sourceZoneId` (any of the outbreak's zones —
   *  the seat ROAMS) — begin the outward recession. Returns true if it
   *  actually started a cure (the cleanse ledger gates the Vault tiers). */
  onPatientZeroSlain(sourceZoneId: string): boolean {
    const z = this.infected.get(sourceZoneId);
    const o = z ? this.outbreaks.find(x => x.id === z.runId)
                : this.outbreaks.find(x => x.sourceZoneId === sourceZoneId);
    if (!o || o.dead || o.curing) return false;
    this.cutSource(o);
    return true;
  }

  /** THE CUT — one door for every way the outbreak's heart is lost (the zero
   *  slain, its source ground eaten or culled): curing begins, the legs
   *  disband on the spot (spread was already curing-gated; this makes the
   *  stop structural, and the snapshot carries the emptiness), and the zero
   *  is gone — a curing outbreak has no quarry left to hunt. */
  private cutSource(o: ActiveOutbreak): void {
    o.curing = true;
    o.cureAcc = 0;
    o.curedThrough = -1;
    o.carriers = [];
    o.zero = undefined;
  }

  /** The ground under the ZERO was eaten/culled: it slips to the outbreak's
   *  nearest still-infected ring (lowest hops, ties lexical — DRAW-FREE, so
   *  no stream moves for it). Nothing left to stand on = the heart is gone:
   *  the cut lands here. */
  private rehomeZero(o: ActiveOutbreak): void {
    if (!o.zero) return;
    let best: { zoneId: string; hops: number } | null = null;
    for (const [zid, z] of this.infected) {
      if (z.runId !== o.id || zid === o.zero.zoneId) continue;
      if (!best || z.hops < best.hops || (z.hops === best.hops && zid < best.zoneId)) {
        best = { zoneId: zid, hops: z.hops };
      }
    }
    if (best) { o.zero.zoneId = best.zoneId; o.zero.hops = best.hops; }
    else if (!o.curing) this.cutSource(o);
    else o.zero = undefined;
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

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: outbreaks (reveal Sets flattened to arrays; the strain +
   *  carriers ride along), the infection map, and the id counter. Rides
   *  existing edges only — no zones minted. (The per-zone waneSec is
   *  deliberately transient: a reload restarts the eats-plague meal, which
   *  only delays the eating.) */
  snapshot(): unknown {
    return {
      outbreaks: this.outbreaks.map(o => ({
        id: o.id, sourceZoneId: o.sourceZoneId, strainId: o.strainId,
        carriers: o.carriers.map(c => ({ zoneId: c.zoneId, hops: c.hops })),
        zero: o.zero ? { zoneId: o.zero.zoneId, hops: o.zero.hops, name: o.zero.name } : undefined,
        zeroBeat: o.zeroBeat, seenAgeSec: o.seenAgeSec,
        spreadAcc: o.spreadAcc, seen: o.seen,
        revealed: [...o.revealed], curing: o.curing, cureAcc: o.cureAcc,
        curedThrough: o.curedThrough, dead: o.dead,
      })),
      infected: [...this.infected.entries()].map(([zid, z]) => ({ zid, runId: z.runId, hops: z.hops, intensity: z.intensity })),
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as { outbreaks?: unknown[]; infected?: unknown[]; seq?: unknown } | null;
    if (!s || typeof s !== 'object') return;
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    if (Array.isArray(s.outbreaks)) {
      this.outbreaks = [];
      const zc = this.zeroCfg();
      for (const raw of s.outbreaks) {
        const o = raw as { id?: unknown; sourceZoneId?: unknown; strainId?: unknown; carriers?: unknown; zero?: unknown; zeroBeat?: unknown; seenAgeSec?: unknown; spreadAcc?: unknown; seen?: unknown; revealed?: unknown; curing?: unknown; cureAcc?: unknown; curedThrough?: unknown; dead?: unknown } | null;
        if (!o || typeof o.id !== 'string' || typeof o.sourceZoneId !== 'string') continue;
        if (o.dead) continue; // a finished outbreak stays finished
        const curing = !!o.curing;
        // Carriers round-trip; a LEGACY save (pre-Movement-II, no carrier
        // rows) adopts — a live outbreak re-stands its base walkers at the
        // source (a curing one stays legless: the containment survives the
        // trip). A legacy outbreak likewise ROLLS its strain on adoption
        // (the overlay's own stream), so a standing plague gains a face.
        const carriers = Array.isArray(o.carriers)
          ? o.carriers
            .map(c => c as { zoneId?: unknown; hops?: unknown } | null)
            .filter((c): c is { zoneId: string; hops: number } =>
              !!c && typeof c.zoneId === 'string'
              && typeof c.hops === 'number' && Number.isFinite(c.hops) && c.hops >= 0)
            .map(c => ({ zoneId: c.zoneId, hops: Math.floor(c.hops) }))
          : curing ? []
            : Array.from({ length: Math.max(0, this.cfg.carriers.base) },
              () => ({ zoneId: o.sourceZoneId as string, hops: 0 }));
        // The ZERO round-trips; a LEGACY save (pre-Movement-III, no zero row)
        // adopts — a LIVE outbreak stands its zero at the source with a name
        // rolled on the overlay's own stream (the strain-adoption idiom); a
        // curing one was already cut and stands none.
        const zr = o.zero as { zoneId?: unknown; hops?: unknown; name?: unknown } | null | undefined;
        const zero = curing ? undefined
          : zr && typeof zr.zoneId === 'string' && typeof zr.name === 'string'
            && typeof zr.hops === 'number' && Number.isFinite(zr.hops) && zr.hops >= 0
            ? { zoneId: zr.zoneId, hops: Math.floor(zr.hops), name: zr.name }
            : { zoneId: o.sourceZoneId, hops: 0, name: zc.names[this.rng.int(0, zc.names.length - 1)] };
        this.outbreaks.push({
          id: o.id, sourceZoneId: o.sourceZoneId,
          strainId: typeof o.strainId === 'string' ? o.strainId : rollStrain(this.rng)?.id,
          carriers: curing ? [] : carriers.slice(0, Math.max(0, this.cfg.carriers.cap)),
          zero,
          zeroBeat: typeof o.zeroBeat === 'number' && Number.isFinite(o.zeroBeat) ? Math.floor(o.zeroBeat) : 0,
          seenAgeSec: typeof o.seenAgeSec === 'number' && Number.isFinite(o.seenAgeSec) ? o.seenAgeSec : 0,
          spreadAcc: typeof o.spreadAcc === 'number' && Number.isFinite(o.spreadAcc) ? o.spreadAcc : 0,
          seen: !!o.seen,
          revealed: new Set(Array.isArray(o.revealed) ? o.revealed.filter((z): z is string => typeof z === 'string') : []),
          curing,
          cureAcc: typeof o.cureAcc === 'number' && Number.isFinite(o.cureAcc) ? o.cureAcc : 0,
          curedThrough: typeof o.curedThrough === 'number' && Number.isFinite(o.curedThrough) ? Math.floor(o.curedThrough) : -1,
          dead: false,
        });
      }
    }
    if (Array.isArray(s.infected)) {
      this.infected.clear();
      const live = new Set(this.outbreaks.map(o => o.id));
      for (const raw of s.infected) {
        const z = raw as { zid?: unknown; runId?: unknown; hops?: unknown } | null;
        if (!z || typeof z.zid !== 'string' || typeof z.runId !== 'string' || !live.has(z.runId)) continue;
        if (typeof z.hops !== 'number' || !Number.isFinite(z.hops) || z.hops < 0) continue;
        // Intensity re-derives from hops against the LIVE config (a re-tuned
        // falloff applies to a resumed plague — config wins over cache).
        this.infect(z.zid, z.runId, Math.floor(z.hops));
      }
    }
  }

  /** Culled ground sheds its infection; an outbreak whose SOURCE was culled can
   *  never field Patient Zero again, so it turns to CURING and recedes out —
   *  the graceful end, never an immortal plague. */
  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of [...this.infected.keys()]) if (!has(zid)) this.infected.delete(zid);
    for (const o of this.outbreaks) {
      o.revealed = new Set([...o.revealed].filter(z => has(z)));
      o.carriers = o.carriers.filter(c => has(c.zoneId)); // culled ground takes its walkers
      if (o.zero && !has(o.zero.zoneId)) this.rehomeZero(o); // …but the zero slips aside
      if (!has(o.sourceZoneId) && !o.curing) this.cutSource(o);
    }
  }

  // --- dev seam (the QA Event tab) -------------------------------------------

  /** DEV: ignite an outbreak whose SOURCE is the given (current) zone, pre-spread to
   *  the full ball at once so the infection + the glow read immediately. (QA only.) */
  devIgnite(view: OverlayView, zoneId: string): boolean {
    const here = view.byId[zoneId];
    if (!here || !this.mayInfect(here) || this.infected.has(here.id)) return false;
    const o = this.makeOutbreak(here);
    this.outbreaks.push(o);
    this.infect(here.id, o.id, 0);
    this.infectBall(o, view, this.cfg.maxHops);
    return true;
  }

  // --- internals -------------------------------------------------------------

  /** May the plague INFECT / spread into a zone? THE shared predicate
   *  (zonePolicy) — in lockstep with the engine's materialize guard. */
  private streamable(z: ZoneDef): boolean {
    return eventTargetable(this.id, z);
  }

  /** The anchored networks' folded grip over a zone (0 when no read is wired
   *  or the grip lane is off; a throwing source reads 0 — one bad fold never
   *  breaks the lifecycle, the groundClaims tolerance law). */
  private gripAt(zoneId: string): number {
    if (!this.gripRead || !this.cfg.grip) return 0;
    try { return this.gripRead(zoneId); } catch { return 0; }
  }

  /** THE ONE INFECTION GATE — streamable AND not held by an anchored claim
   *  at/above the eats-plague threshold. Every road in (ignition source, the
   *  pre-spread ball, a carrier's step) passes here, so claimed ground
   *  refuses the plague at every door, not just some. */
  private mayInfect(z: ZoneDef): boolean {
    return this.streamable(z)
      && !(this.cfg.grip && this.gripAt(z.id) >= this.cfg.grip.threshold);
  }

  private intensityFor(hops: number): number {
    const t = this.cfg.maxHops > 0 ? hops / this.cfg.maxHops : 1;
    const exp = this.cfg.falloffExp ?? 1; // 1 = the linear gradient (default)
    return clamp(1 - Math.pow(t, exp), this.cfg.minIntensity, 1);
  }

  private infect(zoneId: string, runId: string, hops: number): void {
    this.infected.set(zoneId, { runId, hops, intensity: this.intensityFor(hops) });
  }

  /** The zero's resolved dials (surge rows over ZERO_DEFAULTS — one fold). */
  private zeroCfg(): { stride: number; names: string[]; omen: { whisper: number; reveal: number; widenPerMin: number; lines: string[] } } {
    const z = this.cfg.zero;
    return {
      stride: Math.max(1, Math.floor(z?.stride ?? ZERO_DEFAULTS.stride)),
      names: z?.names?.length ? z.names : ZERO_DEFAULTS.names,
      omen: {
        whisper: z?.omen?.whisper ?? ZERO_DEFAULTS.omen.whisper,
        reveal: z?.omen?.reveal ?? ZERO_DEFAULTS.omen.reveal,
        widenPerMin: z?.omen?.widenPerMin ?? ZERO_DEFAULTS.omen.widenPerMin,
        lines: z?.omen?.lines?.length ? z.omen.lines : ZERO_DEFAULTS.omen.lines,
      },
    };
  }

  private makeOutbreak(src: ZoneDef): ActiveOutbreak {
    const zc = this.zeroCfg();
    return {
      id: `contagion_${this.seq++}`,
      sourceZoneId: src.id,
      // THE STRAIN ROLL — seeded on this overlay's own stream at ignition
      // (undefined when nothing rollable is registered: the plague then runs
      // strainless, exactly the pre-Movement-II behavior).
      strainId: rollStrain(this.rng)?.id,
      // The ignition's own sick walkers, standing at the source.
      carriers: Array.from({ length: Math.max(0, this.cfg.carriers.base) },
        () => ({ zoneId: src.id, hops: 0 })),
      // THE ZERO stands where it all began, NAMED on the same stream (after
      // the strain roll — appended draws, so the strain's seat never shifts).
      zero: { zoneId: src.id, hops: 0, name: zc.names[this.rng.int(0, zc.names.length - 1)] },
      zeroBeat: 0, seenAgeSec: 0,
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
      this.mayInfect(z) && !this.infected.has(z.id) && coordDist(z.map, tc) >= this.cfg.seedMinDist);
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
        if (!nb || this.infected.has(nb.id) || !this.mayInfect(nb)) continue;
        this.infect(nb.id, o.id, z.hops + 1);
        q.push(nb.id);
      }
    }
  }

  /** THE CARRIER WALK (kin-borne spread — Movement II retires the random
   *  front-pick the convergence ledger named a placeholder skeleton): each of
   *  the outbreak's sick walkers takes ONE step per spread beat. A step onto
   *  fresh ground INFECTS it, priced at the carrier's own walked distance
   *  (hops+1, capped at maxHops — the disease weakens along the path its
   *  bodies actually carried it); with no fresh door in reach the carrier
   *  ROAMS across the outbreak's own infected ground instead (re-syncing its
   *  hops to the ground it stands on, so its next infection prices honestly).
   *  Roads only — it can cross nothing that does not exist (never mints a
   *  frontier), claimed ground refuses it at the one gate (mayInfect), and
   *  another outbreak's ground is a wall (one plague per zone). Seeded picks
   *  on the overlay's own stream — deterministic beat for beat. */
  private spread(o: ActiveOutbreak, view: OverlayView): void {
    // THE ZERO'S STEP first (the head walks, then the legs — one stream,
    // stable order): once per `stride` beats, and NEVER out of the zone the
    // player stands in — THE CORNERED HOLD: the hunter's presence pins the
    // quarry, so its materialized body can never desync from this seat.
    o.zeroBeat += 1;
    if (o.zero && o.zeroBeat % this.zeroCfg().stride === 0
      && o.zero.zoneId !== view.currentZoneId) {
      this.stepWalker(o, view, o.zero);
    }
    for (const c of o.carriers) this.stepWalker(o, view, c);
  }

  /** ONE sick body's step (the carrier grammar — Movement III's zero rides
   *  the same law): onto fresh ground if any door offers it (infecting at
   *  the WALKED distance, capped at maxHops), else roaming the outbreak's
   *  own infected ground (hops re-synced so its next infection prices
   *  honestly). Roads only; claimed ground refuses at the one gate; another
   *  outbreak's ground is a wall. Seeded picks on the overlay's own stream —
   *  deterministic beat for beat. */
  private stepWalker(o: ActiveOutbreak, view: OverlayView, c: CarrierState): void {
    const zn = view.byId[c.zoneId];
    if (!zn) return;
    const fresh: string[] = [];
    const roam: { id: string; hops: number }[] = [];
    for (const e of zn.exits) {
      if (e.to === '?') continue;
      const nb = view.byId[e.to];
      if (!nb) continue;
      const held = this.infected.get(nb.id);
      if (held) {
        if (held.runId === o.id) roam.push({ id: nb.id, hops: held.hops });
        continue;
      }
      if (c.hops + 1 > this.cfg.maxHops || !this.mayInfect(nb)) continue;
      fresh.push(nb.id);
    }
    if (fresh.length) {
      const pick = fresh[this.rng.int(0, fresh.length - 1)];
      this.infect(pick, o.id, c.hops + 1);
      c.zoneId = pick;
      c.hops += 1;
    } else if (roam.length) {
      const pick = roam[this.rng.int(0, roam.length - 1)];
      c.zoneId = pick.id;
      c.hops = pick.hops;
    }
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
  // The strain reads on the row ("virulent (Miasmal)") — the map names the
  // face of the sickness the moment the glow does.
  const strainWord = strainOf(info.strain)?.label;
  const sev = strainWord ? `${info.label} (${strainWord})` : info.label;
  return [{
    kind: 'event', icon: '☣', color: info.color, label: 'Contagion',
    detail: info.isSource ? `${info.zeroName ?? 'Patient Zero'} festers here`
      : `${sev}; follow the strongest pulse to its source`,
    z: 14,
  }];
});

// --- the zero's omen (registered on import — the findability guarantee) ------
//
// THE SILENCE DOCTRINE HOLDS: the contagion festers unannounced until the
// player STUMBLES in (markDiscovered flips `seen`) — only a SEEN outbreak's
// zero murmurs. From then on the hunt for the root never goes blind: the
// world whispers a bearing toward the zero's CURRENT seat, aging wider
// (widenPerMin — an uncaught quarry's shadow grows), and close in it surveys
// the seat onto the map. The omen id is stable per OUTBREAK while `at` walks
// with the quarry — the whisper memory follows one hunt, not one zone.
registerOmenSource((world: World): Omen[] => {
  const cf = world.sim.contagionField;
  if (!cf) return [];
  const surge = cf.surge();
  const om = {
    whisper: surge.zero?.omen?.whisper ?? ZERO_DEFAULTS.omen.whisper,
    reveal: surge.zero?.omen?.reveal ?? ZERO_DEFAULTS.omen.reveal,
    widenPerMin: surge.zero?.omen?.widenPerMin ?? ZERO_DEFAULTS.omen.widenPerMin,
    lines: surge.zero?.omen?.lines?.length ? surge.zero.omen.lines : ZERO_DEFAULTS.omen.lines,
  };
  return cf.zeroSeat().filter(z => z.seen && !z.curing).map(z => ({
    id: `contagion_zero_${z.outbreakId}`,
    at: { x: z.x, y: z.y }, zoneId: z.zoneId,
    color: surge.color,
    lines: om.lines.map(l => l.replace('{name}', z.name)),
    whisper: om.whisper, reveal: om.reveal, widenPerMin: om.widenPerMin,
    age: z.seenAgeSec,
  }));
});
