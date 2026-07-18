// ---------------------------------------------------------------------------
// THE SIM ARENA — a quiet, flat, event-free zone plus the world factory that
// boots a REAL World into it headless.
//
// Boot mirrors main.ts exactly (same side-effect registrations, same
// validateContent, same World/createPlayer path) so a sim world and a played
// world are the same machine. Differences are all DATA, not code paths:
//   - the account is fresh + fully class-unlocked (sims may probe anything),
//   - every expedition package is disabled (no invasions landing mid-probe),
//   - the arena zone is registered into ZONES before construction (it rides
//     cloneZones into the world graph like any authored zone),
//   - after the town boot we loadZone into the arena and hold there.
// ---------------------------------------------------------------------------

import { installHeadlessShims } from './shims';
// The same side-effect registrations main.ts performs — a World without them
// is missing stamps/landmarks/layouts and zone generation would be wrong.
import '../data/clusters';
import '../data/formations';
import '../engine/landmarkBuilders';
import '../data/landmarks';
import '../engine/layoutRecipes';
import '../engine/interiorGen';
import '../data/massifs';
import '../data/compositions';
import '../data/fog';
import '../data/creeps';
import '../data/traversals';
import { validateContent } from '../data/validate';
import { registerAllPackageFactions } from '../packages/factionGen';
import { buildManifest } from '../packages/manifest';
import { makeAccount } from '../meta/account';
import { World } from '../engine/world';
import { CLASSES, type ClassDef } from '../data/classes';
import { ZONES, type ZoneDef } from '../data/zones';

/** Open sim knobs — modular thresholds, never magic numbers inline. */
export const SIM_CFG = {
  /** Arena zone geometry. Roomy enough to kite, small enough to always meet. */
  arena: { w: 1600, h: 1200 },
  /** Fixed arena layout seed — the floor itself is not part of the experiment. */
  arenaSeed: 0x51713a,
  /** Fixed tick. 60 Hz matches the live game's cadence assumptions. */
  dt: 1 / 60,
  /** Default hero-vitals sampling rate (Hz). */
  sampleHz: 5,
  /** Default wave spawn ring distance (px). */
  spawnDistance: 260,
  /** Hard per-episode wall: ticks beyond duration/stop we refuse to run. */
  maxTicksHardCap: 60 * 60 * 30, // 30 sim-minutes
};

export const SIM_ARENA_ID = 'sim_arena';

/** The arena: objective 'safe' keeps every ambient system quiet (no frontier
 *  minting, no events, no storms) — combat itself works fine in safe zones
 *  (the town training dummy proves it). Flat floor, no stamps, no exits. */
function simArenaDef(): ZoneDef {
  return {
    id: SIM_ARENA_ID, name: 'Proving Grounds',
    level: 1,
    size: { ...SIM_CFG.arena },
    theme: {
      floor: '#101010', grid: '#181818', border: '#3a3a3a',
      obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888',
    },
    seed: SIM_CFG.arenaSeed,
    layout: [],
    objective: { kind: 'safe' },
    exits: [],
    map: { x: 9000, y: 9000 }, // far off every real chart
  };
}

let booted = false;

/** One-time engine boot for a sim process: shims, registrations, validation,
 *  arena zone injection. Idempotent — every factory entry point calls it. */
export function bootSimEngine(): void {
  if (booted) return;
  booted = true;
  installHeadlessShims();
  registerAllPackageFactions();
  validateContent();
  ZONES[SIM_ARENA_ID] = simArenaDef();
}

export function classById(id: string): ClassDef {
  const cls = CLASSES.find(c => c.id === id);
  if (!cls) throw new Error(`sim: unknown class '${id}' (have: ${CLASSES.map(c => c.id).join(', ')})`);
  return cls;
}

/** A fresh, quiet, headless World parked in the arena with a level-1 hero of
 *  the given class (the build injector then reshapes that hero wholesale). */
export function makeSimWorld(classId: string, seed: number): World {
  bootSimEngine();
  const account = makeAccount();
  // Sims may probe any class — unlock the full roster on the throwaway account.
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = false; // a QUIET expedition
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById(classId));
  world.loadZone(SIM_ARENA_ID);
  // Center the hero — spawn points are an exits concern and the arena has none.
  world.player.pos.x = SIM_CFG.arena.w / 2;
  world.player.pos.y = SIM_CFG.arena.h / 2;
  return world;
}
