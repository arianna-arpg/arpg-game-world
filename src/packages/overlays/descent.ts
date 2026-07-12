// ---------------------------------------------------------------------------
// DESCENT FIELD — the "delve into the boundless abyss" overlay (pure, thin).
//
// Unlike Conclave/Amalgamation, Descent owns NO cross-zone node state: its whole
// runtime is a CAVE (off-graph) the engine drives directly (the Delver event is
// rolled in enterCave; the boundless abyss is a special cave streamed + darkened by
// World.updateDescent). So this overlay is just the RUN-LOCKED gate + the config
// (DescentSurge) the engine reads — the package seam that turns the feature on at a
// character level and lets the Vault tune it. It biases no spawns and draws no map.
//
// The Depthkin faction (contexts:['descent'] on its FactionSpec) is grafted at boot
// and appears ONLY because the 'descent' tileset's pack table lists them.
// ---------------------------------------------------------------------------

import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import type { OverlayBuildCtx, PackageGate } from '../types';

/** The whole Descent mechanic as data — every number is a knob (run-locked via the
 *  package gate; DEV-overridable). The engine reads this via sim.descentField.surge(). */
export interface DescentSurge {
  /** Chance a freshly-entered cave hosts a Delver (seeded per cave mouth, so a
   *  given mouth always/never has one). Kept low — a rare find. */
  delverChance: number;
  /** Light (the darkness countdown) drained per second while delving. */
  drainRate: number;
  /** Light restored when a light spot is run over. */
  lightBurst: number;
  /** Max light (mirrors SURVIVAL_RESOURCES.light.max; set on descend). */
  lightMax: number;
  /** Node-units of delve distance per +1 DEPTH (depth scales danger + payout). */
  depthUnit: number;
  /** Echoes paid per Depthkin slain (× depth multiplier). */
  payoutPerKill: number;
  /** Extra Echo multiplier per depth (payout = base × (1 + depth × this)). */
  payoutDepthBonus: number;
  /** Fraction of banked Echoes KEPT when the dark/death takes you (1 = keep all;
   *  lower for bank-or-bust tension). A voluntary climb-out always keeps 100%. */
  payoutKeptOnDeath: number;
  /** Depthkin level = the descent cave level + this + floor(depth). */
  enemyLevelBonus: number;
  /** The abyss's brood FACTION — the engine spawns from ITS registered roster
   *  (weighted + presence-shaped) and scopes culling/credit by it. Swapping
   *  the brood (or reweighting a type) is a data edit, never an engine one. */
  faction: string;
  /** Seconds between continuous Depthkin spawns (scaled down by depth). */
  spawnInterval: number;
  /** The spawn interval never drops below this, however deep you delve. */
  spawnIntervalFloor: number;
  /** Seconds shaved off the interval per depth unit (the pressure ramp). */
  spawnRampPerDepth: number;
  /** Most live Depthkin around the player at once (the streamed pressure cap). */
  spawnCap: number;
  /** Depthkin spawn this far from the player (just past the light, into the dark). */
  spawnDist: [number, number];
  /** Doodads/enemies beyond this from the player are culled (off-screen in the dark). */
  cullRadius: number;
  /** Target streamed-doodad count around the player (terrain density). */
  doodadTarget: number;
}

export class DescentField implements WorldOverlay {
  readonly id = 'descent';
  /** Transient BY EMPTINESS: this field holds config only — the delve itself
   *  is an off-graph cave run the engine drives, and a quit mid-delve resolves
   *  through the cave/return path, never through overlay state. */
  readonly persistence = 'transient' as const;
  private readonly gate: () => PackageGate;
  private readonly cfg: DescentSurge;

  constructor(ctx: OverlayBuildCtx, cfg: DescentSurge) {
    this.gate = ctx.gate;
    this.cfg = cfg;
  }

  // Pure config/gate overlay — no sim, no spawn bias, no map layer.
  update(): void { /* the engine drives the descent runtime directly */ }
  onNodeCharted(): void { /* caves are off-graph */ }
  affectSpawns(): SpawnBias { return NO_BIAS; }
  renderMap(): MapLayer { return { under: '', over: '' }; }

  /** Is the package live at this character level (gate active)? Gates the Delver roll. */
  delverAllowed(charLevel: number): boolean { return this.gate().active && charLevel > 0; }
  /** The per-mouth Delver chance with the package's live IGNITION lever folded
   *  in (pressure × frequency.rate) — the engine rolls its seeded per-mouth
   *  draw against THIS, so the Vault weight and the rate crank reach the abyss
   *  exactly like every other event's ignition. */
  delverChanceNow(): number {
    const g = this.gate();
    return g.active ? Math.min(1, this.cfg.delverChance * g.ignitionMul) : 0;
  }
  /** The live config the engine reads (geometry, drain, payout, spawn). */
  surge(): DescentSurge { return this.cfg; }
}
