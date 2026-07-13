// ---------------------------------------------------------------------------
// ASCENT FIELD — the "ride a geyser into the realm above" overlay (pure, thin).
//
// The Descent's structural mirror, and the same overlay shape: Ascent owns NO
// cross-zone node state. Its whole runtime is engine-driven ground — the
// geyser is a seeded per-zone roll (World.placeAscentGeyser, gated through
// THIS field), the shelf it launches to is an off-graph sidezone pocket
// (data/sidezones.ts 'sky_geyser', minted per mouth), the crossing's
// dissolution is the zone's own CollapseSpec, and the far gate is the
// aetherial DIMENSion's realm gate (DimensionEntry.gateDoodad). So this
// overlay is just the RUN-LOCKED gate + the config (AscentSurge) the engine
// reads — the package seam that turns the feature on and lets the Vault tune
// it. It biases no spawns and draws no map.
//
// The Vigilant Host faction (contexts:['aetherial'] on its FactionSpec) is
// grafted at boot and appears ONLY via the aether tilesets' pack tables.
// ---------------------------------------------------------------------------

import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** The whole Ascent mechanic as data — every number is a knob (run-locked via
 *  the package gate; DEV-overridable). The engine reads this via
 *  sim.ascentField.surge(). */
export interface AscentSurge {
  /** Chance a freshly-entered ELIGIBLE zone vents a sky geyser (seeded per
   *  zone, so a given zone always/never has one). Rare — a wonder, not a
   *  fixture. Folded with the package's live ignition lever at the roll. */
  geyserChance: number;
  /** Biomes whose ground can vent a geyser (geothermal / open country).
   *  Empty = any open-sky, non-special surface zone passes the shape gate. */
  geyserBiomes: string[];
  /** The shelf runs this much hotter than the land it hangs over (the
   *  aetherial dimension's own levelBonus takes over past the gate). */
  shelfLevelBonus: number;
  /** The escape trickle's spawn interval on a shelf (seconds, rolled). */
  shelfTrickle: [number, number];
  /** Minimum walkable span (px) a zone needs to host the spring dressing. */
  clearNeeded: number;
}

export class AscentField implements WorldOverlay {
  readonly id = 'ascent';
  /** Transient BY EMPTINESS: this field holds config only — the shelf is an
   *  off-graph pocket the engine drives, the Firmament is dimension ground
   *  (worldstate persists it like any charted zone), and a quit mid-crossing
   *  resolves through the cave/return path, never through overlay state. */
  readonly persistence = 'transient' as const;
  private readonly gate: () => PackageGate;
  private readonly cfg: AscentSurge;

  constructor(ctx: OverlayBuildCtx, cfg: AscentSurge) {
    this.gate = ctx.gate;
    this.cfg = cfg;
  }

  // Pure config/gate overlay — no sim, no spawn bias, no map layer.
  update(): void { /* the engine drives the ascent runtime directly */ }
  onNodeCharted(): void { /* geysers roll per zone entry, not per chart */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }
  renderMap(): MapLayer { return { under: '', over: '' }; }

  /** Is the package live at this character level (gate active)? Gates the
   *  geyser roll. */
  geyserAllowed(charLevel: number): boolean { return this.gate().active && charLevel > 0; }

  /** The per-zone geyser chance with the package's live IGNITION lever folded
   *  in (pressure × frequency.rate) — the engine rolls its seeded per-zone
   *  draw against THIS, so the Vault weight and the rate crank reach the sky
   *  exactly like every other event's ignition. */
  geyserChanceNow(): number {
    const g = this.gate();
    return g.active ? Math.min(1, this.cfg.geyserChance * g.ignitionMul) : 0;
  }

  /** The live config the engine + the shelf mint read. */
  surge(): AscentSurge { return this.cfg; }
}
