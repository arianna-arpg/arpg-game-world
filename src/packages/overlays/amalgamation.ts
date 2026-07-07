// ---------------------------------------------------------------------------
// AMALGAMATION FIELD — the "build your own boss" overlay (pure).
//
// A roving NECROMANCER (the Bonewright) appears — like a Conclave ritual — mostly
// in UNCHARTED zones, rarely on already-charted ground (the incentive is to
// EXPLORE and stumble onto it). Dwell near it and it hands out a hunt: slay a rare
// undead MINIBOSS in a nearby zone (the bone marker leads you there even before
// it's charted), then RETURN and choose a BODY PART to graft. Each part decides
// what the Amalgamation BECOMES (its stats + skills) and what it DROPS — you build
// the boss and pick its spoils at once. After 3 parts (rarely a 4th), the graves
// crack and the Amalgamation RISES at the Bonewright; fell it for the assembled
// spoils, and the Bonewright fades to re-appear, uncharted, somewhere new.
//
// Like every overlay this field is PURE of the engine — it never touches actors or
// World. It owns ONLY the cross-zone state machine: WHICH zone hosts the
// Bonewright, the build progress (stage / chosen parts / the current miniboss
// target / the offered parts), and the boss's preserved health. The in-zone
// runtime (spawning the Necromancer + graves + dwell spots, the miniboss, the
// risen boss) is engine work driven off these accessors — the Conclave shape for
// despawn-on-leave actors, the Hunt shape for state that SURVIVES leaving (so
// walking away mid-build never loses progress). The 'amalgam' faction is overlay-
// only (contexts:['amalgamation']) so it never leaks into ordinary generation.
//
// EXTENSIBILITY: the whole mechanic is data on AmalgamationSurge — open rate, part
// count, the AMALGAM_PARTS registry (each part = stat mods + a granted skill/
// support + a themed drop). Add a part = one registry row. The amalgamations-
// completed tally (engine ledger) is the seam a future Necromancer-Uber-boss reads.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { Modifier } from '../../engine/stats';
import type { World } from '../../engine/world';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventAllowed } from '../../world/zonePolicy';
import { scaledCap } from '../frequency';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;             // fixed ignition cadence (seconds)
const NECRO_GREEN = '#9ad0b0';
const BONE_PALE = '#e8e0c8';

/** A BODY PART the player grafts onto the Amalgamation. Pure data: choosing it
 *  bends the boss (stat mods + a granted skill/support) AND decides a guaranteed,
 *  part-themed DROP. Add a part = one row here; the engine assembles the boss from
 *  the union of chosen parts (riseAmalgamation) and pushes each part's drop on kill.
 *  Unknown skill/support ids are skipped at assembly (defensive), and a boot
 *  validator warns about them. */
export interface AmalgamPartSpec {
  /** Stable id (keys chosenParts + offered). */
  id: string;
  /** Shown on the dwell spot + boss name fragment. */
  label: string;
  /** A short tag woven into the assembled boss's name ("Amalgamation of Maw & …"). */
  epithet: string;
  /** A glyph drawn on the part-pick dwell spot (kept to a render-safe symbol). */
  glyph: string;
  /** Stat bonuses grafted onto the boss (one composed modifier source). */
  mods: Modifier[];
  /** A skill id added to the boss's loadout (needs a monster-castable `.ai` hint). */
  grantSkill?: string;
  /** A support id socketed into one of the boss's skills (rides the cast pipeline). */
  grantSupport?: string;
  /** The guaranteed, part-themed drop when the Amalgamation falls — an exact gem
   *  (skill OR support), plus optional extra random gems. */
  drop: { skill?: string; support?: string; gems?: number };
}

/** The whole Amalgamation mechanic as data, carried by the package def and read by
 *  the engine via AmalgamationField.surge() (so world.ts never imports the def). */
export interface AmalgamationSurge {
  /** Per-STEP base chance (×pressure) a Bonewright appears while none stands. */
  openChance: number;
  /** Clamp ceiling on that per-step chance (a deliberate rarity gate). */
  openChanceCap: number;
  /** Most Bonewrights at once (single roving giver = 1; raise for more). */
  maxConcurrent: number;
  /** Relative chance the Bonewright lands in an ALREADY-CHARTED zone when fresh
   *  (uncharted) candidates also exist — keep LOW (explore to find it). */
  chartedChance: number;
  /** Bestiary id of the Necromancer NPC (passive + invulnerable + untargetable). */
  necromancerId: string;
  /** Bestiary id of the assembled boss BASE the parts build upon. */
  bossBaseId: string;
  /** Rare-undead miniboss bestiary ids (one rolled per hunt). */
  minibossIds: string[];
  /** Relative chance a hunt's miniboss lands in an ALREADY-CHARTED neighbour
   *  (else an uncharted one is preferred — "pointing toward the uncharted"). */
  minibossChartedChance: number;
  /** Miniboss level = necromancer-zone level + this. */
  minibossLevelBonus: number;
  /** Parts to gather before the boss rises (the usual count). */
  partCount: number;
  /** Chance the build wants a RARE extra (partCount + 1) — "the fourth, rare". */
  rareExtraChance: number;
  /** How many parts are OFFERED to choose from on each return (2..3). */
  offerCount: [number, number];
  /** Ring radius the Necromancer + graves + part-pick spots occupy (world units). */
  ringRadius: number;
  /** Placed this far from the player at materialization (a trek across the zone). */
  farFrom: number;
  /** Subdue reward when the Amalgamation falls (on top of part drops). */
  bossReward: { xpBase: number; xpPerLevel: number; gems: number };
  /** Reward for each miniboss felled. */
  minibossReward: { xpBase: number; xpPerLevel: number; gems: number };
  /** The body-part registry. */
  parts: AmalgamPartSpec[];
}

/** Quest sub-state of the active build. */
export type AmalgamQuest = 'offer' | 'hunt' | 'choose' | 'boss';

/** What the engine reads to materialize / drive the Bonewright. */
export interface AmalgamInfo {
  id: string;
  zoneId: string;
  stage: number;
  partsNeeded: number;
  quest: AmalgamQuest;
  offered: string[];
  chosenParts: string[];
  bossLifeFrac: number;
}

interface ActiveAmalgamation {
  id: string;
  zoneId: string;
  stage: number;
  partsNeeded: number;
  chosenParts: string[];
  offered: string[];
  quest: AmalgamQuest;
  minibossZoneId: string | null;
  minibossDefId: string | null;
  bossLifeFrac: number;
}

export class AmalgamationField implements WorldOverlay {
  readonly id = 'amalgamation';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: AmalgamationSurge;
  /** The single roving Bonewright + its build, or null while none stands. */
  private active: ActiveAmalgamation | null = null;
  private acc = 0;
  private seq = 0;

  constructor(ctx: OverlayBuildCtx, cfg: AmalgamationSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = cfg;
  }

  update(dt: number, view: OverlayView): void {
    this.acc += dt;
    const g = this.gate();
    while (this.acc >= STEP) { this.acc -= STEP; if (g.active) this.maybeOpen(view); }
  }

  onNodeCharted(): void { /* targets zones by id; no per-node seeding */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // its actors are materialized, never biased
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker source draws it

  // --- accessors the engine reads --------------------------------------------

  /** Live config (the engine reads geometry, reward, the part registry). */
  surge(): AmalgamationSurge { return this.cfg; }

  /** The part spec by id (engine assembles the boss + resolves drops from these). */
  partById(id: string): AmalgamPartSpec | undefined {
    return this.cfg.parts.find(p => p.id === id);
  }

  /** The Bonewright sitting in this zone (engine materializes it from this), or null. */
  activeIn(zoneId: string): AmalgamInfo | null {
    const a = this.active;
    if (!a || a.zoneId !== zoneId) return null;
    return {
      id: a.id, zoneId: a.zoneId, stage: a.stage, partsNeeded: a.partsNeeded,
      quest: a.quest, offered: [...a.offered], chosenParts: [...a.chosenParts],
      bossLifeFrac: a.bossLifeFrac,
    };
  }

  /** The miniboss target sitting in this zone (engine spawns it), or null. Only
   *  while a hunt is live and unfinished. */
  minibossIn(zoneId: string): { id: string; defId: string } | null {
    const a = this.active;
    if (!a || a.quest !== 'hunt' || a.minibossZoneId !== zoneId || !a.minibossDefId) return null;
    return { id: a.id, defId: a.minibossDefId };
  }

  // --- mutators the engine drives ---------------------------------------------

  /** Dwell-accept a hunt: the engine has picked the target zone + miniboss def
   *  (it owns the live graph). Records them and arms the hunt. */
  acceptQuest(minibossZoneId: string, minibossDefId: string): void {
    const a = this.active;
    if (!a || a.quest !== 'offer') return;
    a.minibossZoneId = minibossZoneId;
    a.minibossDefId = minibossDefId;
    a.quest = 'hunt';
  }

  /** The hunt's miniboss fell — return to the Bonewright to graft a part. Rolls the
   *  2-3 parts now on offer (from those not yet chosen). */
  onMinibossSlain(): void {
    const a = this.active;
    if (!a || a.quest !== 'hunt') return;
    a.quest = 'choose';
    a.minibossZoneId = null;
    a.minibossDefId = null;
    a.offered = this.rollOffer(a);
  }

  /** Graft the chosen part: advance the build, and either arm the next hunt or, once
   *  every part is gathered, mark the Amalgamation ready to rise. Returns true when
   *  this pick completed the build (boss should rise now). */
  pickPart(partId: string): boolean {
    const a = this.active;
    if (!a || a.quest !== 'choose' || !a.offered.includes(partId)) return false;
    if (a.chosenParts.includes(partId)) return false;
    a.chosenParts.push(partId);
    a.stage++;
    a.offered = [];
    if (a.stage >= a.partsNeeded) { a.quest = 'boss'; return true; }
    a.quest = 'offer';
    return false;
  }

  /** Preserve the risen boss's health across zone leaves (Hunt-style). */
  setBossLife(frac: number): void {
    if (this.active) this.active.bossLifeFrac = clamp(frac, 0.02, 1);
  }

  /** The Amalgamation fell: the Bonewright's study is complete — it fades, to
   *  re-appear uncharted somewhere new on a later open roll. */
  endAmalgamation(): void { this.active = null; }

  /** Read-only snapshot for the map markers / tests. */
  peek(): AmalgamInfo | null { return this.active ? this.activeIn(this.active.zoneId) : null; }
  /** The current miniboss target zone (for the bone marker), or null. */
  minibossTarget(): string | null {
    return this.active?.quest === 'hunt' ? this.active.minibossZoneId : null;
  }

  // --- DEV ---------------------------------------------------------------------

  /** DEV: force a Bonewright into the given zone (mirrors the maybeOpen filter). */
  devOpen(view: OverlayView, zoneId: string): boolean {
    if (this.active) return false;
    const z = view.byId[zoneId];
    if (!z || z.caveDepth != null || z.floating || z.eventOwned
      || z.objective.kind === 'safe' || z.objective.kind === 'waves'
      || !z.packs?.table?.length) return false;
    this.open(zoneId);
    return true;
  }

  // --- internals --------------------------------------------------------------

  private maybeOpen(view: OverlayView): void {
    const g = this.gate();
    if (this.active || this.cfg.maxConcurrent < 1) return;
    if (scaledCap(this.cfg.maxConcurrent, g.concurrencyMul) < 1) return;
    if (!this.rng.chance(clamp(this.cfg.openChance * g.ignitionMul, 0, this.cfg.openChanceCap))) return;
    // Non-safe/waves/cave/floating, populated ground that isn't already event-owned
    // and isn't the zone the player stands in — prefer FRESH (uncharted) zones so the
    // Bonewright is something you DISCOVER, not something handed to you on the map.
    const cands = view.nodes.filter(z =>
      z.id !== view.currentZoneId
      && z.caveDepth == null && !z.floating && !z.eventOwned
      && z.objective.kind !== 'safe' && z.objective.kind !== 'waves'
      && !!z.packs?.table?.length
      && eventAllowed('amalgamation', z));
    if (!cands.length) return;
    const fresh = cands.filter(z => !view.visited.has(z.id));
    const charted = cands.filter(z => view.visited.has(z.id));
    const pool = fresh.length && (!charted.length || this.rng.next() >= this.cfg.chartedChance) ? fresh : charted;
    if (!pool.length) return;
    this.open(pool[this.rng.int(0, pool.length - 1)].id);
  }

  private open(zoneId: string): void {
    const extra = this.rng.chance(this.cfg.rareExtraChance) ? 1 : 0;
    this.active = {
      id: `amalgam_${this.seq++}`, zoneId,
      stage: 0, partsNeeded: Math.max(1, this.cfg.partCount + extra),
      chosenParts: [], offered: [], quest: 'offer',
      minibossZoneId: null, minibossDefId: null, bossLifeFrac: 1,
    };
  }

  /** Roll the 2-3 parts on offer from those not yet chosen (fewer than that left ⇒
   *  offer whatever remains). Fisher-Yates over a filtered copy, seeded. */
  private rollOffer(a: ActiveAmalgamation): string[] {
    const remaining = this.cfg.parts.map(p => p.id).filter(id => !a.chosenParts.includes(id));
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i);
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    const lo = Math.min(this.cfg.offerCount[0], this.cfg.offerCount[1]);
    const hi = Math.max(this.cfg.offerCount[0], this.cfg.offerCount[1]);
    const n = Math.min(remaining.length, this.rng.int(lo, hi));
    return remaining.slice(0, Math.max(1, n));
  }
}

/** Boot validator: every part's granted skill/support id is checked against the
 *  catalogs (so a typo warns instead of silently no-op'ing). Pure — takes the
 *  predicates so this leaf never imports the engine. Returns "part:kind:id" misses. */
export function validateAmalgamParts(
  parts: AmalgamPartSpec[],
  isSkill: (id: string) => boolean,
  isSupport: (id: string) => boolean,
): string[] {
  const bad: string[] = [];
  for (const p of parts) {
    if (p.grantSkill && !isSkill(p.grantSkill)) bad.push(`${p.id}:grantSkill:${p.grantSkill}`);
    if (p.grantSupport && !isSupport(p.grantSupport)) bad.push(`${p.id}:grantSupport:${p.grantSupport}`);
    if (p.drop.skill && !isSkill(p.drop.skill)) bad.push(`${p.id}:drop.skill:${p.drop.skill}`);
    if (p.drop.support && !isSupport(p.drop.support)) bad.push(`${p.id}:drop.support:${p.drop.support}`);
  }
  return bad;
}

// --- map markers (registered on import — zero panels.ts edits) -----------------
//
// Two markers. The BONEWRIGHT pins to its CHARTED zone (fog:'charted' — you find it
// by exploring, no spoilers), its title reading the live build stage so you know
// what's left. The MINIBOSS target pins a pale skull/bone with fog:'always' — the
// hunt reveals its zone on the map EVEN before a road exists, the explore-toward-it
// affordance (mirrors the quest "?" marker).
registerMarkerSource((world: World): MapMarker[] => {
  const af = world.sim.amalgamationField;
  if (!af) return [];
  const info = af.peek();
  if (!info) return [];
  const out: MapMarker[] = [];
  const node = world.zoneMap[info.zoneId];
  if (node) {
    const stageTxt = info.quest === 'boss'
      ? 'the Amalgamation rises!'
      : info.quest === 'choose'
        ? `choose a part (${info.stage}/${info.partsNeeded})`
        : `${info.stage}/${info.partsNeeded} parts gathered`;
    out.push({
      id: `amalgam-necro-${info.id}`, zoneId: info.zoneId, coord: { x: node.map.x, y: node.map.y },
      glyph: '⚰', fill: '#13241c', stroke: NECRO_GREEN, text: NECRO_GREEN, r: 9,
      title: `The Bonewright — ${stageTxt}`, fog: 'charted', z: 16,
    });
  }
  const mbZone = af.minibossTarget();
  const mbNode = mbZone ? world.zoneMap[mbZone] : null;
  if (mbNode) {
    out.push({
      id: `amalgam-miniboss-${info.id}`, zoneId: mbNode.id, coord: { x: mbNode.map.x, y: mbNode.map.y },
      glyph: '☠', fill: '#1c1a12', stroke: BONE_PALE, text: BONE_PALE, r: 9,
      title: 'A rare undead stalks here — slay it for the Bonewright', fog: 'always', z: 18,
    });
  }
  return out;
});
