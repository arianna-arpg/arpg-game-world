import { World } from '../engine/world';
import type { Account } from '../meta/account';
import type { NativeClientRuntime } from '../worldmass/nativeClientRuntime';

/** The desktop sweep keeps the original deterministic mint and landing recipe,
 * but loads through the actual retained owner. This finite development receiver
 * cannot write the published writer's scene identity or invoke World.loadZone.
 * It exists only inside one synchronous coordinator frame. */
export function retainedPerfTravel(runtime: NativeClientRuntime) {
  const coordinator = runtime.current.combat.input.coordinator;
  const campaign = coordinator.input.campaign;
  const host = {
    get zoneMap() { return campaign.zoneMap; },
    get zone() { return coordinator.current.assembly.input.scene.zone; },
    get nextGenId() { return campaign.nextGenId; },
    set nextGenId(value: number) { campaign.nextGenId = value; },
    get arena() { return coordinator.current.assembly.input.geometry.arena; },
    loadZone(...args: Parameters<World['loadZone']>) { coordinator.loadZone(...args); },
    landPartyAt(...args: Parameters<World['landPartyAt']>) { coordinator.landPartyAt(...args); },
  };
  const run = <T>(operation: () => T): T => {
    // Capture before entering: runtime.current is an idle-only public read.
    const source = runtime.current;
    return coordinator.runFrom(source, operation);
  };
  return {
    travelTo: (...args: Parameters<World['devTravelTo']>): boolean =>
      run(() => Reflect.apply(World.prototype.devTravelTo, host, args)),
    mintTileset: (...args: Parameters<World['devMintTileset']>): string | null =>
      run(() => Reflect.apply(World.prototype.devMintTileset, host, args)),
    /** Capture one real area's read-only geometry for the synchronous whisker
     * work before the next rAF. No legacy writer caches or bridge list. */
    hazards: (): World['fallHazardAt'] => {
      const area = runtime.current, geometry = area.assembly.input.geometry;
      const query = {
        get walk() { return geometry.walk; },
        get bridges() { return geometry.bridges; },
        zonePits: () => geometry.zonePits(),
        pitHomeKinds: (...args: Parameters<World['pitHomeKinds']>) => geometry.pitHomeKinds(...args),
        groundInsured: (...args: Parameters<World['groundInsured']>) => geometry.groundInsured(...args),
        levitating: (...args: Parameters<World['levitating']>) => area.combat.levitating(...args),
      };
      return (...args) => {
        if (coordinator.current !== area) throw Error('perfSweep: terrain query changed area');
        return Reflect.apply(World.prototype.fallHazardAt, query, args);
      };
    },
    pourLite: (...args: Parameters<World['devLitePour']>): number => {
      const area = runtime.current, ecology = area.assembly.input.ecology;
      return Reflect.apply(World.prototype.devLitePour, {
        get player() { return area.assembly.input.scene.player; },
        get lite() { return ecology.input.state.lite; },
        get liteKinds() { return ecology.input.state.liteKinds; },
        liteKindOf: (...a: Parameters<World['liteKindOf']>) => ecology.liteKindOf(...a),
        liteOpenAt: (...a: Parameters<World['liteOpenAt']>) => ecology.liteOpenAt(...a),
      }, args);
    },
    census: (): { residentAreas: number; residentActors: number } => {
      // Outside the measured window. Every retained area continues to tick;
      // report that growing bill rather than hiding it behind the visible row.
      void runtime.current;
      const areas = coordinator.residentAreas();
      return { residentAreas: areas.length,
        residentActors: areas.reduce((n, area) => n + area.assembly.input.scene.actors.length, 0) };
    },
  };
}

/** A performance walk starts after the one-time tutorial. Restore the exact
 * account gate and persist that restoration even when native startup throws;
 * other genuine startup writes remain intact. Never release gameplay holds. */
export function withPerfProfile<T>(account: Account, start: () => T, persist: () => void): T {
  const ledger = account.ledger;
  const previous = Object.getOwnPropertyDescriptor(ledger, 'prologue_lived');
  ledger.prologue_lived = 1;
  try { return start(); }
  finally {
    if (previous) Object.defineProperty(ledger, 'prologue_lived', previous);
    else delete ledger.prologue_lived;
    persist();
  }
}

/** A stopped render pump is not a zero-cost frame. Preserve its fatal reason. */
export function assertPerfFrames(frames: number, fatal: { msg: string; stack?: string } | null): void {
  if (fatal) throw Error('perfSweep: game failed: ' + fatal.msg + (fatal.stack ? '\n' + fatal.stack : ''));
  if (!Number.isSafeInteger(frames) || frames <= 0)
    throw Error('perfSweep: invalid walking sample — no completed frame telemetry');
}

export function assertPerfWalk(worldSeconds: number, walkDistance: number, pausedFrames = 0): void {
  if (pausedFrames !== 0 || !Number.isFinite(worldSeconds) || !Number.isFinite(walkDistance) || !(worldSeconds > 0) || !(walkDistance > 0))
    throw Error('perfSweep: invalid walking sample — simulation or hero did not advance, or a gameplay pause interrupted the window');
}
