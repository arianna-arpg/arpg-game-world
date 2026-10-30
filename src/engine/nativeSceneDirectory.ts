/** Native directory effects over the actual selected area; no World driver. */
import type {World} from './world';
import type {Actor} from './actor';
import {vec,dist,type Vec2} from '../core/math';
import {nativeFarPoint} from './nativePlacement';
import {nativeSceneNativePlacementHost,type NativeSceneGeometryHost} from './nativeSceneGeometry';
export interface NativeSceneDirectoryHost extends Pick<World,'actors'|'flashes'|'notice'|'clampPos'> {
 hauntStreamTimer:World['hauntStreamTimer'];
 farPointFrom:World['farPointFrom'];
 nativeSceneGeometryHost():NativeSceneGeometryHost;
 retireCombatBody?(body:Actor):void;
}
const HAUNT_TAGS = new Set([
  'haunt_spawn',   // the streamed apparitions
  'haunt_anchor',  // the standing grief-anchor
  'wailing_one',   // the manifested boss
]);
const WAYPOINT_CLEAR = 500;

export function sceneDissipateHauntSpawns(host:NativeSceneDirectoryHost, color: string): void {
    let swept = 0;
    for (let i = host.actors.length - 1; i >= 0; i--) {
      const a = host.actors[i];
      if (a.dead || !a.tag || !HAUNT_TAGS.has(a.tag)) continue;
      host.flashes.push({ pos: vec(a.pos.x, a.pos.y), radius: 46, color, life: 0.5, maxLife: 0.5 });
      host.actors.splice(i, 1);host.retireCombatBody?.(a);
      swept++;
    }
    if (swept) {
      host.notice('The light comes — the grief and its shades fade from this ground…', color, 17, 'events');
    }
    host.hauntStreamTimer = 0;
  }

export function sceneClearWaypointLanding(host:NativeSceneDirectoryHost, hero: Actor): void {
    // SOVEREIGNTY: seat (the arrival's bubble: travelToWaypoint's own clear, the derived census)
    for (const a of host.actors) {
      if (a.team === 'enemy' && !a.dead && a.owner !== hero && !a.fromZoneGen
        && dist(a.pos, hero.pos) < WAYPOINT_CLEAR) {
        a.pos = host.clampPos(host.farPointFrom(hero, WAYPOINT_CLEAR), a.radius);
      }
    }
  }

export function sceneFarPointFrom(host:NativeSceneDirectoryHost, from: Actor, min: number): Vec2 {
    const view = Object.create(host.nativeSceneGeometryHost()) as NativeSceneGeometryHost;
    Object.defineProperty(view, 'player', { value: from });
    return nativeFarPoint(nativeSceneNativePlacementHost(view), min, false);
  }
