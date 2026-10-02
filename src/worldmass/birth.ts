import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { withSeededRandom } from '../core/rng';
import { streamSeed } from './random';

/** Replays the native factory's initial random choices, not combat RNG/state.
 * Keep the original scale argument: an omitted scale can itself draw a die. */
export interface MassBirth { seed: number; scale?: number }
export function validMassBirth(value: MassBirth): boolean {
  return !!value && Number.isSafeInteger(value.seed) && value.seed>=0 && value.seed<=0xffffffff
    && (value.scale===undefined || Number.isFinite(value.scale) && value.scale>0);
}
export class MassBirths {
  private records=new WeakMap<Actor,MassBirth>();
  constructor(readonly source: string | undefined, readonly runSeed: number) {
    if(source!==undefined && (typeof source!=='string'||!source||source.length>256))
      throw Error('Invalid native birth source');
  }
  create(world: World, id: string, monster: string, level: number, scale?: number, saved?: MassBirth): Actor {
    const birth=saved ?? (this.source ? {seed:streamSeed(this.runSeed,[this.source,id]),
      ...(scale===undefined?{}:{scale})} : undefined);
    const create=(scale:number|undefined)=>world.createMonster(monster,level,'enemy',undefined,
      scale===undefined?undefined:{scale});
    const actor=birth ? withSeededRandom(birth.seed,()=>create(birth.scale)) : create(scale);
    if(birth)this.records.set(actor,{...birth});
    return actor;
  }
  of(actor: Actor): MassBirth | undefined { return this.records.get(actor); }
}
