/** One genuine native Titan controller over an area's geometry and population. */
import type { World } from '../engine/world';
import { TitanRuntime, type NativeTitanHost, type TitanScenePiece } from '../engine/titans';
import type { Doodad } from '../engine/levelgen';
import type { NativeSceneCensus, NativeAreaScenePopulation } from './nativeAreaScenePopulation';
import type { NativeAreaSceneGeometry } from './nativeAreaSceneGeometry';
export interface NativeTitanCampaign {
  sim: World['sim'];
  ledger: World['ledger'];
  readonly time: number;
  text: World['text'];
}
export interface NativeSceneTitanInput {
  scene: NativeSceneCensus;
  geometry: NativeAreaSceneGeometry;
  population: NativeAreaScenePopulation;
  campaign: NativeTitanCampaign;
}
export class NativeAreaSceneTitans {
  readonly input: NativeSceneTitanInput;
  readonly host: NativeTitanHost;
  readonly runtime: TitanRuntime;
  constructor(raw: NativeSceneTitanInput) {
    const roots = Object.create(null);
    for (const key of ['scene', 'geometry', 'population', 'campaign']) {
      const d = raw && Object.getOwnPropertyDescriptor(raw, key);
      if (!d || !Object.hasOwn(d, 'value') || !d.value || typeof d.value !== 'object')
        throw Error('Native Titans need own object binding: ' + key);
      roots[key] = d.value;
    }
    const input: NativeSceneTitanInput = this.input = Object.freeze(roots);
    const { scene, geometry, population, campaign } = input;
    const gd = Object.getOwnPropertyDescriptor(geometry, 'state');
    const pd = Object.getOwnPropertyDescriptor(population, 'input');
    if (!gd || !Object.hasOwn(gd, 'value') || gd.value !== scene || !pd || !Object.hasOwn(pd, 'value')
      || pd.value.scene !== scene || pd.value.geometry !== geometry)
      throw Error('Native Titans need identical local geometry/census/population');
    for (const key of ['sim', 'ledger', 'time', 'text'])
      if (!Object.hasOwn(campaign, key)) throw Error('Native Titans need explicit campaign field: ' + key);
    this.host = Object.freeze({
      get zone() { return scene.zone; }, get player() { return scene.player; },
      get actors() { return scene.actors; }, set actors(value) { scene.actors = value; },
      get sim() { return campaign.sim; }, get ledger() { return campaign.ledger; }, get time() { return campaign.time; },
      get exits() { return geometry.exits; }, get arena() { return geometry.arena; },
      get walk() { return geometry.walk; }, get doodads() { return geometry.doodads; },
      get text() { const fn = campaign.text; return (...args: Parameters<typeof fn>) => fn.apply(campaign, args); },
      get createMonster() { const fn = population.createMonster; return (...args: Parameters<typeof fn>) => fn.apply(population, args); },
      get clampPos() { const fn = geometry.clampPos; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get pathField() { const fn = geometry.pathField; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get markDoodadsChanged() { const fn = geometry.markDoodadsChanged; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get fellDoodad() { const fn = geometry.fellDoodad; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get collectContactHazards() { const fn = geometry.collectContactHazards; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
      get rebuildClientTerrain() { const fn = geometry.rebuildClientTerrain; return (...args: Parameters<typeof fn>) => fn.apply(geometry, args); },
    });
    this.runtime = new TitanRuntime(this.host);
    for (const key of Object.keys(this)) Object.defineProperty(this, key, { enumerable: false });
  }
  field() { return this.runtime.field(); }
  owns(d: Doodad): boolean { return this.runtime.owns(d); }
  reset(): void { this.runtime.reset(); }
  update(dt: number): void { this.runtime.update(dt); }
  scene(): TitanScenePiece[] | undefined { return this.runtime.scene(); }
  applyNet(scene?: TitanScenePiece[]): void { this.runtime.applyNet(scene); }
}
