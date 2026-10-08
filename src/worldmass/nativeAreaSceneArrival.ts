/** Arrival services share one genuine local census/geometry and live campaign records. */
import type { World } from '../engine/world';
import type { ObjectiveSpec } from '../data/zones';
import type { NativeSceneCensus } from './nativeAreaScenePopulation';
import type { NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';
import { enforceNativeArrivalGrace, nativeUberDefeated, nativeNearestZoneOf,
  type NativeSceneArrivalHost, type NativeSceneArrivalPolicy } from '../engine/nativeSceneArrival';

export interface NativeSceneArrivalCampaign {
  account: World['account'];
  completedObjectives: World['completedObjectives'];
  zoneMap: World['zoneMap'];
}
export interface NativeSceneArrivalInput {
  scene: NativeSceneCensus;
  geometry: NativeAreaSceneGeometry;
  campaign: NativeSceneArrivalCampaign;
  policy: NativeSceneArrivalPolicy;
}
export class NativeAreaSceneArrival {
  readonly input: NativeSceneArrivalInput;
  readonly host: NativeSceneArrivalHost;
  constructor(raw: NativeSceneArrivalInput) {
    const roots = Object.create(null);
    for (const key of ['scene', 'geometry', 'campaign', 'policy']) {
      const d = raw && Object.getOwnPropertyDescriptor(raw, key);
      if (!d || !Object.hasOwn(d, 'value') || !d.value || typeof d.value !== 'object')
        throw Error('Native arrival needs own object binding: ' + key);
      roots[key] = d.value;
    }
    const input: NativeSceneArrivalInput = this.input = Object.freeze(roots);
    const { scene, geometry, campaign, policy } = input;
    const state = Object.getOwnPropertyDescriptor(geometry, 'state');
    if (!state || !Object.hasOwn(state, 'value') || state.value !== scene)
      throw Error('Native arrival needs identical local geometry/census');
    for (const key of ['account', 'completedObjectives', 'zoneMap'])
      if (!Object.hasOwn(campaign, key)) throw Error('Native arrival needs explicit campaign field: ' + key);
    if (!Object.hasOwn(policy, 'arrivalGrace')) throw Error('Native arrival needs explicit arrival policy');
    this.host = Object.freeze({
      get actors() { return scene.actors; },
      get zoneEntry() { return geometry.zoneEntry; },
      get structures() { return geometry.structures; },
      get walk() { return geometry.walk; },
      get account() { return campaign.account; },
      get completedObjectives() { return campaign.completedObjectives; },
      get zoneMap() { return campaign.zoneMap; },
      get clampPos() { const fn = geometry.clampPos; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get findFreeSpot() { const fn = geometry.findFreeSpot; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get farthestStand() { const fn = geometry.farthestStand; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
    });
    for (const key of Object.keys(this)) Object.defineProperty(this, key, { enumerable: false });
  }
  enforceArrivalGrace(): void { enforceNativeArrivalGrace(this.host, this.input.policy); }
  uberDefeated(o: ObjectiveSpec, zoneId: string): boolean { return nativeUberDefeated(this.host, o, zoneId); }
  nearestZoneOf(dimId: string, at: { x: number; y: number }, excludeId?: string): string | null {
    return nativeNearestZoneOf(this.host, dimId, at, excludeId);
  }
}
