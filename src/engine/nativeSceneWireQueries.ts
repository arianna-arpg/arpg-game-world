/** Shared native authority-side wire queries from immutable b8ae6541. */
import {dist} from '../core/math';
import {HARVEST_CFG} from './harvest';
import {prunePings,type WorldPing} from './pings';
import {ACTING_SEAT_CFG,LOW_LIFE_FLASH_SEC,type World,type Seat,type VendorEntry,type VendorHoldRow} from './world';
export interface NativeSceneWireQueryHost {
 actors:World["actors"];
 approachPass:World["approachPass"];
 gloomCur:World["gloomCur"];
 harvestDwell:World["harvestDwell"];
 harvestNodes:World["harvestNodes"];
 harvestOffer:World["harvestOffer"];
 harvestSessions:World["harvestSessions"];
 hasNpcRole:World["hasNpcRole"];
 pings:World["pings"];
 seatHud:World["seatHud"];
 sim:World["sim"];
 time:World["time"];
 vendorHolds:World["vendorHolds"];
 zone:World["zone"];
 zoneHasVendorCounter:World["zoneHasVendorCounter"];
}
export function sceneFrostHeld(host:NativeSceneWireQueryHost):boolean {
    return !!host.sim.deepwinterField?.frostOn(host.zone.id);
  }
export function sceneGloom(host:NativeSceneWireQueryHost):number { return host.gloomCur; }
export function sceneHarvestHolds(host:NativeSceneWireQueryHost, seat: Seat):boolean { return host.harvestSessions.some(s => s.seatId === seat.id); }
export function sceneLivePings(host:NativeSceneWireQueryHost):WorldPing[] {
    if (host.pings.length && host.pings.some(p => p.until <= host.time)) host.pings = prunePings(host.pings, host.time);
    return host.pings;
  }
export function sceneSeatHudWire(host:NativeSceneWireQueryHost, seat: Seat):{ fn?: { text: string; at: number }; lh?: number } | null {
    const row = host.seatHud.get(seat);
    if (!row) return null;
    const out: { fn?: { text: string; at: number }; lh?: number } = {};
    if (row.fn && host.time - row.fn.at < ACTING_SEAT_CFG.noteSec) out.fn = { text: row.fn.text, at: row.fn.at };
    const left = row.lhAt === undefined ? 0 : LOW_LIFE_FLASH_SEC - (host.time - row.lhAt);
    if (left > 0) out.lh = Math.round(left * 1000) / 1000;
    if (out.fn || out.lh !== undefined) return out;
    host.seatHud.delete(seat);
    return null;
  }
export function sceneSmithCounterHere(host:NativeSceneWireQueryHost):boolean {
    return host.zoneHasVendorCounter && host.actors.some(a => host.hasNpcRole(a, 'vendor') && !a.dead);
  }
export function sceneVendorEntryHold(host:NativeSceneWireQueryHost, key: string,entry: VendorEntry):VendorHoldRow | undefined {
    return host.vendorHolds[key]?.locks.find(r => r.entry === entry);
  }
export function sceneWithApproachPass<T>(host:NativeSceneWireQueryHost, fn: () => T):T {
    if (host.approachPass) return fn();
    host.approachPass = new Map();
    try { return fn(); } finally { host.approachPass = null; }
  }
export function sceneSeatHarvestView(host:NativeSceneWireQueryHost, seat: Seat,reach: number):ReturnType<World['harvestView']> {
    const a = seat.actor;
    const s = host.harvestSessions.find(x => x.seatId === seat.id);
    const near = host.harvestNodes.map((n, ix) => ({ n, ix }))
      .filter(({ n }) => !n.spent && (n.doodad.tier ?? 0) === a.tier && dist(a.pos, n.pos) <= reach);
    if (!s && !near.length) return null;
    const dwell = host.harvestDwell.get(seat.id), offer = host.harvestOffer.get(seat.id);
    return {
      nodes: near.map(({ n, ix }) => ({
        x: n.pos.x, y: n.pos.y, r: n.doodad.radius, spent: false, accent: n.def.accent,
        armFrac: dwell && dwell.ix === ix ? Math.min(1, dwell.t / HARVEST_CFG.armSec) : 0,
        offered: offer === ix, offeredPad: false,
      })),
      rites: s ? [{
        x: a.pos.x, y: a.pos.y - a.radius, steps: s.seq, done: s.done, left: s.left, window: s.window,
        accent: host.harvestNodes[s.ix]?.def.accent ?? '#e8e0c8', pad: false, missT: s.missT,
      }] : [],
    };
  }
