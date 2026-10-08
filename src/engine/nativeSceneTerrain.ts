/** Native terrain changes shared by World and local generated areas. */
import type {World} from './world';
import type {Doodad} from './levelgen';
import {doodadRuleOf} from './levelgen';
import {vec} from '../core/math';
import {isDoodadGround} from '../world/regions';
import {fellableDoodad,fellJitter,RAMPAGE_CFG,type RampageSpec} from './rampage';
const GROUND_KINDS = {
  includes: (kind: string): boolean => isDoodadGround(kind),
};
export interface NativeSceneTerrainHost {
 time:World['time'];regrowing:World['regrowing'];markDoodadsChanged:World['markDoodadsChanged'];flashes:World['flashes'];shake:World['shake'];
 doodads:World['doodads'];bridges:World['bridges'];grounds:World['grounds'];
}
export function nativeFellDoodad(host:NativeSceneTerrainHost, d: Doodad, cause?: string, spec?: RampageSpec | null): boolean {
    if (!fellableDoodad(d)) return false;
    const now = host.time;
    d.felled = { at: now, wake: now + RAMPAGE_CFG.delaySec + fellJitter(d), ...(cause ? { k: cause } : {}) };
    host.regrowing.push(d);
    host.markDoodadsChanged(d);
    if (!spec?.quiet) {
      host.flashes.push({
        pos: vec(d.pos.x, d.pos.y), radius: Math.min(52, d.radius + 14),
        color: RAMPAGE_CFG.fxColor, life: 0.35, maxLife: 0.35,
      });
      host.shake = Math.max(host.shake, RAMPAGE_CFG.shake);
    }
    return true;
  }
export function nativeRebuildClientTerrain(host:NativeSceneTerrainHost): void {
    host.bridges = host.doodads.filter(d => doodadRuleOf(d.kind).spans);
    host.grounds = host.doodads.filter(d => GROUND_KINDS.includes(d.kind));
  }