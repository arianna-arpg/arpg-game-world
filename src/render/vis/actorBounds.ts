import type { Actor } from '../../engine/actor';
import type { World } from '../../engine/world';
import { ASSAULT } from '../../engine/assault';
import { foresightView } from '../../engine/foresight';
import { meleeReachCueOf } from '../../engine/meleeReach';
import { poolCueRows } from '../../engine/reserveCues';
import { statusRuptureRadius } from '../../engine/status';
import { guardReleaseCue } from '../../engine/warningCues';
import { MONSTERS } from '../../data/monsters';
import { VIS_CFG } from './visConfig';

/** Conservative rotation-independent world-space reach of an actor's body,
 *  shadow, glows, pose lift/scale, active telegraphs, domes, and overhead UI.
 *  Modeled on projectileDrawScale: generous enough that nothing pops at any
 *  viewport edge under render-scale, couch-stretch, or camera shake. */
export function actorVisualExtent(a: Actor, world: World): number {
  const r = Math.max(0, a.radius);
  const scale = Math.max(4, VIS_CFG.sprite.padFactor + 1.85, VIS_CFG.body.heroHaloScale + 0.5);
  let reach = Math.max(r * scale, 96) + 180;

  if (a === world.player) {
    reach += 96;
    if (world.traversal) {
      const td = world.traversal.def;
      reach = Math.max(reach, Math.abs(td.lift) + r * Math.max(1, td.scaleTo) * 4 + 180);
    }
  }
  if ((a.defId && MONSTERS[a.defId]?.boss) || a.netBossBar) reach += 80;
  if (world.sailing && world.seats?.some(s => s.actor === a)) {
    reach = Math.max(reach, r * 2.4 * world.voyageShip().hullScale + 64);
  }
  if (a.leap) {
    reach += r * 1.6 + (a.leap.vent ? VIS_CFG.ventRide.lift + 24 : 24);
  }
  if (world.emergences?.length && world.emergeOf?.(a)) {
    reach = Math.max(reach, r * 4 + 220);
  }
  if (a.construct?.domeRadius) reach = Math.max(reach, a.construct.domeRadius + 16);
  if (a.assaultAura) reach = Math.max(reach, ASSAULT.radius + 16);
  if (a.fuse !== undefined) reach = Math.max(reach, r + 20 + a.fuse * 14);

  if (a.venting?.size || a.poolCues?.length) {
    for (const row of poolCueRows(a)) {
      if (row.venting && row.radius > 0) reach = Math.max(reach, row.radius + 16);
    }
  }
  if (a.armedCues?.length) {
    for (const c of a.armedCues) {
      if (c.radius > 0) reach = Math.max(reach, c.radius + 16);
    }
  } else if (a.statuses?.length) {
    for (const s of a.statuses) {
      if (s.remaining > 0 && s.rupture && s.rupture > 0) {
        reach = Math.max(reach, statusRuptureRadius(s) + 16);
      }
    }
  }

  const cs = a.casting;
  if (cs) {
    if (cs.mode === 'guard') {
      const warning = guardReleaseCue(a, world.time);
      if (warning) reach = Math.max(reach, warning.radius + 16);
    }
    if (a.team === 'enemy') {
      const geo = foresightView(a, cs);
      if (geo) {
        const fReach = geo.kind === 'ground'
          ? Math.hypot(geo.aim.x - a.pos.x, geo.aim.y - a.pos.y) + geo.reach + 16
          : geo.reach + (geo.band ? geo.band.standoff + geo.band.halfWidth : 0) + 16;
        reach = Math.max(reach, fReach);
      }
    } else if (a === world.localSeat?.actor) {
      const mr = meleeReachCueOf(a);
      if (mr) reach = Math.max(reach, mr.reach * 1.5 + 16);
    }
  }

  const frameFrom = a.remoteFrameBody?.from
    ?? (a.frameState && a.owner && a.summonInst && a.owner.casting?.inst.frameHost === a.summonInst ? a.owner.pos : undefined);
  if (frameFrom) {
    reach = Math.max(reach, Math.hypot(frameFrom.x - a.pos.x, frameFrom.y - a.pos.y) + 48);
  }

  return reach;
}

/** True when `a`'s conservative visual bounds intersect the active viewport. */
export function actorInView(
  a: Actor, world: World,
  camX: number, camY: number, vw: number, vh: number, shakePad: number,
): boolean {
  const reach = actorVisualExtent(a, world) + shakePad;
  return a.pos.x + reach >= camX && a.pos.x - reach <= camX + vw
    && a.pos.y + reach >= camY && a.pos.y - reach <= camY + vh;
}
