// ---------------------------------------------------------------------------
// THE WILDS ON THE WIRE — the render shell's half of a hosted Unbroken Wilds
// (docs/design/shard-world.md §3.12). THE LAND IS THE SEED'S, THE LIFE IS THE
// SERVER'S: the shell starts the seamless foundation's mass runtime from the
// shard's seed in RESTORE-ONLY posture (inert — it births no natives, runs no
// sim; World.update never runs on a client), streams terrain pages around
// the shell's own hero with the runtime's PUBLIC pieces (the body of
// WorldMassRuntime.update's streaming block, copied, since the runtime
// exposes no stream-only entry), and takes every body, drop and doodad from
// the wire exactly as a classic client does.
//
// Two laws the zone message would otherwise break: applyZone nulls
// `world.walk` (a MassWalk is not a packed grid) — the shell re-seats the
// runtime's walk after every zone message, so prediction clamps on the real
// ground; and a POCKET (a native cave, a side area) arrives as an ordinary
// zone id — the runtime is disposed for the pocket and re-attached when the
// surface returns. The town tier the runtime lays comes from the account the
// shell was built with, so the shell is built with the SHARD's town features
// (the welcome carries them) — the one divergence the seed alone cannot pin.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { Vec2 } from '../core/math';
import { MASS_ZONE } from '../worldmass/preset';
import { cellKey, localOffset, neighborCell, type MassCell } from '../worldmass/address';
import { applyZone, type ZoneMsg } from './snapshot';

export const WILDS_CLIENT_CFG = {
  /** Survey (map memory) observation cadence in frames — the runtime observes
   *  on its half-second beat; the shell matches it at 60 fps. */
  surveyEveryFrames: 30,
};

/** Is this shell showing a hosted wilds surface right now? */
export function wildsShellActive(world: World): boolean {
  return world.massRuntime !== null && world.zone.id === MASS_ZONE;
}

/** Stand the mass runtime up on a render shell, inert. Idempotent. */
export function wildsShellAttach(world: World, seed: number): void {
  if (world.massRuntime) return;
  world.startWorldMass(seed >>> 0, undefined, { restoreOnly: true });
}

/** Tear the shell's runtime down (a pocket, a leave). Idempotent. */
export function wildsShellDetach(world: World): void {
  if (!world.massRuntime) return;
  world.massRuntime.dispose();
  world.massRuntime = null;
}

/** The shard's zone message, on a wilds shell: the surface re-seats the
 *  runtime's walk under the server's doodads; a pocket drops the runtime so
 *  the classic terrain paints. */
export function wildsShellZone(world: World, msg: ZoneMsg, seed: number): void {
  if (msg.zoneId === MASS_ZONE) {
    wildsShellAttach(world, seed);
    applyZone(world, msg);
    world.walk = world.massRuntime!.walk; // applyZone nulled it: the MassWalk IS the ground
    nearKeys.delete(world);               // re-request the pages around wherever we stand
  } else {
    wildsShellDetach(world);
    applyZone(world, msg);
  }
}

const nearKeys = new WeakMap<World, string>();
const surveyFrames = new WeakMap<World, number>();

/** Per frame: stream terrain around `pos` (the shell's own hero), keep the
 *  sky on the shard's clock, and let the map remember what the hero saw.
 *  The streaming is WorldMassRuntime.update's own block over its public
 *  members; nothing here births a body or claims state. */
export function wildsShellStream(world: World, pos: Vec2): void {
  const mass = world.massRuntime;
  if (!mass || world.zone.id !== MASS_ZONE) return;
  const at = mass.walk.at(pos.x, pos.y);
  const key = cellKey(at);
  if (key !== nearKeys.get(world)) {
    nearKeys.set(world, key);
    const r = mass.config.pageRadius;
    const cells: { cell: MassCell; distance: number }[] = [];
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) cells.push({ cell: neighborCell(at, x, y), distance: x * x + y * y });
    cells.sort((a, b) => a.distance - b.distance);
    mass.stream.request(cells.map(c => c.cell));
  }
  mass.stream.step(mass.config.samplesPerTick);
  // The sky follows the shard's clock (snapshots carry it), never backwards.
  if (mass.weather && world.time > mass.weather.time) mass.weather.advanceTo(world.time);
  // Map memory on the runtime's own half-second beat (its observe predicate, verbatim).
  const n = (surveyFrames.get(world) ?? 0) + 1;
  surveyFrames.set(world, n);
  if (n % WILDS_CLIENT_CFG.surveyEveryFrames === 0 && !world.player.dead) {
    const span = mass.config.terrain.addressSpan;
    mass.survey.observe(at, target => world.lineOfSight(world.player.pos,
      localOffset(target, { ...mass.origin, x: 0, y: 0 }, span), world.player.tier));
  }
}
