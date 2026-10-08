// ---------------------------------------------------------------------------
// THE WILDS SAVE — a --worldmass shard's own persistence
// (docs/design/shard-world.md §3.12, docs/engine/shard.md "Persistence on the
// wilds").
//
// THE WRITE needs nothing new: the Unbroken Wilds persist through the classic
// ShardSave wrapper on the classic beats (ShardHost.persist — atomic tmp +
// rename, every SHARD_CFG.persistSec and at stop()), because
// World.serializeWorldState() already embeds the mass half: `worldmass` is
// the live runtime's snapshot (terrain edits, claims, natives, settlement,
// sky) — or, while a native pocket owns the scene, the surface the world left
// behind at the mouth — and `massSideareas` carries the pockets the surface
// minted. A wilds world writes its OWN file (SHARD_CFG.wildsSaveSuffix), so
// the classic lane and the wilds never adopt, or overwrite, each other's world.
//
// THE READ is the mass lane's own resume order (src/meta/resumeWorld.ts
// prepareCharacterWorld), with the KEEPER as the player — resumeWilds:
//
//   1. adoptWorldState(ws)          the classic half: graph, clock, memories,
//                                   quests, overlays
//   2. startWorldMass(run seed, ws.worldmass, { restoreOnly: true })
//                                   the surface, its natives and settlement,
//                                   inert until step 6
//   3. restoreMassSideareas(…)      the pockets the surface minted (roots and
//                                   pinned caves) — never the active pocket
//   4. resumeSpawn('town', …)       THE HEARTH WAKE: on a live runtime the
//                                   START_ZONE load IS the runtime's own wake
//                                   at its settlement's spawn
//   5. await prepareResumeNeighborhood(world, …)
//   6. finishResume(world)          under the world's own global policies
//
// THE HEARTH WAKE LAW: the keeper wakes at the hearth, never 'exact' at its
// saved spot. THE SHADOW moves it onto the first focus seat anyway, and a
// world nobody stands in breathes around its hearth — not around the field or
// the pocket the last player happened to leave it in. A pocket stays pinned to
// its mouth (the same mouth re-enters the same pocket id), and its zone memory
// rides the world half, so its survivors stand while the memory's TTL holds.
//
// THE RESUME LAW (ShardHost.ready): steps 1-4 run synchronously inside the
// ShardHost constructor (an async function runs to its first await); steps
// 5-6 resolve ready(). Until then the shard answers no socket (listen awaits
// ready), steps no tick and writes no save — no player and no frame ever meets
// a half-stood world. A save that will not stand — a refused wrapper, another
// seed's run, a checkpoint the runtime rejects — falls back to a fresh wilds
// with one log line, and its file is set aside (`.refused-<ms>`) so the next
// persist beat never overwrites the only copy.
// ---------------------------------------------------------------------------

import { existsSync, readFileSync, renameSync } from 'node:fs';
import type { Seat, World } from '../src/engine/world';
import { WORLD_SCHEMA_VERSION, type WorldStateSave } from '../src/meta/worldstate';
import type { MassSideareaSave } from '../src/worldmass/sideareas';
import type { ShardSave } from './shardHost';

/** A wilds save as read off disk: absent (null), refused (with the reason), or
 *  a world half that carries the Unbroken Wilds of THIS seed. */
export type WildsSaveRead = null | { refused: string } | { ws: WorldStateSave };

/** Read the wilds save at `path`: the shard wrapper at `schema`, a world half at
 *  this build's WORLD_SCHEMA_VERSION, carrying a mass checkpoint whose run is
 *  `seed`'s — THE SEED THREAD: a joining shell lays the land from the welcome's
 *  seed, so the server may never stand another seed's run under it. */
export function readWildsSave(path: string, schema: number, seed: number): WildsSaveRead {
  if (!existsSync(path)) return null;
  let save: ShardSave;
  try { save = JSON.parse(readFileSync(path, 'utf-8')) as ShardSave; }
  catch (e) { return { refused: `unreadable (${String(e)})` }; }
  const ws = save?.world;
  if (!save || save.schemaVersion !== schema) return { refused: `shard save schema ${String(save?.schemaVersion)}, this build reads ${schema}` };
  if (!ws || ws.schemaVersion !== WORLD_SCHEMA_VERSION) return { refused: `world schema ${String(ws?.schemaVersion)}, this build reads ${WORLD_SCHEMA_VERSION}` };
  if (!ws.worldmass) return { refused: 'the world half carries no Unbroken Wilds' };
  const run = ws.worldmass.state?.run?.seed;
  if (save.seed !== seed || run !== seed) return { refused: `another seed's world (wrapper ${String(save.seed)}, run ${String(run)}, shard ${seed})` };
  return { ws };
}

/** THE REFUSED SAVE: move an unusable wilds save aside so a fresh world's
 *  persist beat cannot overwrite it. Returns where it went (null: it could not
 *  be moved, or there was nothing to move). */
export function setAsideWildsSave(path: string): string | null {
  if (!existsSync(path)) return null;
  const aside = `${path}.refused-${Date.now()}`;
  try { renameSync(path, aside); return aside; } catch { return null; }
}

/** What a resume stood back up (the ShardHost's one log line). */
export interface WildsResumeReport {
  /** Native bodies the mass checkpoint carried (each restored at its saved spot and wound). */
  natives: number;
  /** Native pockets the surface had minted (their roots and pinned caves restored). */
  pockets: number;
  /** True when the save was taken inside a pocket (the keeper woke at the hearth regardless). */
  wasInPocket: boolean;
}

/** The pockets record minus its ACTIVE rung: the roots and pinned caves stand
 *  back up, the scene never re-enters the pocket (THE HEARTH WAKE LAW). */
function surfacePockets(raw: MassSideareaSave | undefined): MassSideareaSave | undefined {
  if (!raw) return undefined;
  const { active: _active, ...rest } = raw;
  return rest;
}

/** Stand a saved Unbroken Wilds back up on `world` (the keeper's, freshly
 *  booted at the classic hearth, no runtime started) in the mass lane's own
 *  order, the keeper waking at the hearth. Steps 1-4 run synchronously, before
 *  the first await. Throws (rejects) when the save will not stand; the caller
 *  owns the fallback, and the world it was handed must then be discarded. */
export async function resumeWilds(world: World, ws: WorldStateSave, keeper: Seat): Promise<WildsResumeReport> {
  const mass = ws.worldmass;
  if (!mass) throw new Error('the world half carries no Unbroken Wilds');
  if (world.localSeat !== keeper || world.player !== keeper.actor) throw new Error('the keeper is not the world\'s player');
  const prior = world.massRuntime;
  if (prior) throw new Error('a mass runtime already stands on this world');
  // 1. the classic half (fail-safe: a refusal leaves the world untouched)
  if (!world.adoptWorldState(ws)) throw new Error('the world half would not stand');
  // 2. the surface, restore-only
  world.startWorldMass(mass.state.run.seed, mass, { restoreOnly: true });
  const runtime = world.massRuntime;
  if (!runtime) throw new Error('the mass runtime did not stand');
  // 3. the pockets the surface minted — strict, like the mass lane's Continue
  world.restoreMassSideareas(surfacePockets(ws.massSideareas), true);
  // 4. THE HEARTH WAKE
  world.resumeSpawn('town', ws.player);
  // 5. the neighborhood (no character pages on a shard: resolves at once
  //    unless the mass lane grows a page source the server can read)
  await runtime.prepareResumeNeighborhood(world, { isCurrent: () => world.massRuntime === runtime });
  // 6. the first live update, under this world's own policies
  world.withGlobalPolicies(() => runtime.finishResume(world));
  return {
    natives: mass.enemies.length,
    pockets: ws.massSideareas?.caves.length ?? 0,
    wasInPocket: !!ws.massSideareas?.active,
  };
}
