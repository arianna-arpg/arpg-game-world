import type {Seat} from './world';
import type {NativeSceneUIActionHost,NativeSceneUITravelHost} from './nativeSceneUIActionHost';
import { vec } from '../core/math';
import { openRealms } from '../data/passiveRealms';
import { type ZoneDef } from '../data/zones';
import { coordDist } from '../world/coords';
import { seaAt } from '../world/seas';
export function sceneChartCourse(host:NativeSceneUITravelHost):string | null {
    if (!host.canSail()) return null;
    // The water this dock faces: march the oceanward bearing to the first
    // open-ocean sample (the cast-off's own walk, reused).
    const a = host.oceanBearing(host.zone.map);
    let water: { x: number; y: number } | null = null;
    for (let i = 1; i <= 16; i++) {
      const c = { x: host.zone.map.x + Math.cos(a) * i * 12, y: host.zone.map.y + Math.sin(a) * i * 12 };
      if (host.continentFor(c).kind === 'ocean') { water = c; break; }
    }
    const sea = water ? seaAt(water, host.sim.biomeField.fieldSeed) : null;
    if (!sea || !sea.ports.length) {
      host.text(vec(host.player.pos.x, host.player.pos.y - 30), 'no farther harbor on this water', '#9ab8cc', 13);
      return null;
    }
    const ports = host.ensureSeaPorts(sea);
    let far: ZoneDef | null = null;
    for (const p of ports) {
      if (p.id === host.zone.id) continue;
      if (!far || coordDist(p.map, host.zone.map) > coordDist(far.map, host.zone.map)) far = p;
    }
    if (!far) {
      host.text(vec(host.player.pos.x, host.player.pos.y - 30),
        `${sea.name} keeps no other harbor`, '#9ab8cc', 13);
      return null;
    }
    host.sailTo(far.id);
    return far.id;
  }

export function sceneEnsureOpenRealmRoots(host:NativeSceneUIActionHost, seat: Seat = host.localSeat):void {
    for (const r of openRealms(host.ledger)) host.ensureRealmRoots(seat, r);
  }

export function sceneHarvestPauseRefused(host:NativeSceneUIActionHost):void {
    const s = host.harvestSessions.find(x => x.held);
    const seat = s ? host.seats.find(x => x.id === s.seatId) : undefined;
    const at = seat?.actor.pos ?? host.player.pos;
    host.text(vec(at.x, at.y - 34), 'the rite holds your hands — see it through', '#c8e8c0', 12);
  }

export function sceneSailTo(host:NativeSceneUITravelHost, portId: string):void {
    if (!host.canSail()) return;
    const dest = host.zoneMap[portId];
    if (!dest?.port) return;
    const here = host.zone;
    (here.searoutes ??= []).includes(portId) || here.searoutes!.push(portId);
    (dest.searoutes ??= []).includes(here.id) || dest.searoutes!.push(here.id);
    host.loadZone(portId);
    host.sailGate.consume();
    const dock = host.portDock();
    if (dock) {
      // THE PARTY-LANDING LAW: the whole party steps ashore at the planks.
      host.landPartyAt(vec(dock.pos.x, dock.pos.y + 34), { band: [-4, 46] });
    }
  }
