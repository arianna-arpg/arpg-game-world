import type { NativeRegionalGeometry } from './nativeRegionalGeometry';
import { massRandom } from './random';

/** Saved opt-in: older descriptors retain their original random-jitter seats. */
export interface NativeRegionalSeating { kind: 'source-fit'; version: 1; fallbackSeats: number }
export const NATIVE_REGIONAL_SEATING: Readonly<NativeRegionalSeating> = Object.freeze({kind:'source-fit',version:1,fallbackSeats:8});

/** A seeded Latin hypercube covers both axes without always trying one corner
 * first. Fallback follows every historical attempt. Each seat consumes one complete
 * source attempt, never an unbounded
 * collision-repair search. Margin contains the scenery circle, composer
 * reservation and the subsequent 30-unit origin snap inside this lattice. */
export function nativeRegionalSeat(geometry: NativeRegionalGeometry, spacing: number, clearance: number,
  seed: number, key: string, seat: number, seats: number): {x:number;y:number} {
  const rng=massRandom(seed,['nativeRegionalSeating/v1',key]);
  const xs=Array.from({length:seats},(_,i)=>i),ys=[...xs];
  for(const list of [xs,ys])for(let i=seats-1;i>0;i--){const j=Math.floor(rng.next()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  const jitter=massRandom(seed,['nativeRegionalSeating/v1',key,seat]);
  const margin=Math.hypot(geometry.width,geometry.height)/2+clearance+30,extent=spacing-2*margin;
  return {x:margin+extent*(xs[seat]+jitter.range(.1,.9))/seats,
    y:margin+extent*(ys[seat]+jitter.range(.1,.9))/seats};
}
