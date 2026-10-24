import type { NativeMassHoldSource } from './objectives';
import type { NativeMassProcessionSource } from './processionTypes';
import { canonical, freezeData, massDigest, massRandom } from './random';

export type NativeGeographicObjectiveSource = NativeMassHoldSource | NativeMassProcessionSource;
export interface NativeGeographicSelectionReceipt {
  version:1; owner:string; seed:number; sourceHash:string; selected:string|null;
}
/** One owner, one draw across the supported rows, with the native unsupported
 * weight still present in the denominator. Empty/old catalogues keep their
 * former order and random draws; adding a family is an explicit new-run policy. */
export function chooseNativeGeographicObjective(seed:number, owner:string, rows:readonly NativeGeographicObjectiveSource[]):Readonly<NativeGeographicObjectiveSource>|null {
  if (!rows.length) return null;
  if (rows.length>128||new Set(rows.map(r=>r.id)).size!==rows.length
    ||rows.some(r=>!r.id||r.source!=='data/tilesets'||!r.tileset||r.tileset!==rows[0].tileset||!Number.isFinite(r.weight)||r.weight<=0
      ||r.totalWeight!==rows[0].totalWeight||!Number.isFinite(r.totalWeight)||r.totalWeight<r.weight)
    ||rows.reduce((n,r)=>n+r.weight,0)>rows[0].totalWeight+1e-9) throw Error('Invalid native objective catalogue');
  const rng=massRandom(seed,[owner,'native-objective']);
  return rng.chance(rows.reduce((n,r)=>n+r.weight,0)/rows[0].totalWeight)?rng.weighted(rows):null;
}
export function nativeGeographicSelectionReceipt(seed:number,owner:string,rows:readonly NativeGeographicObjectiveSource[]):Readonly<NativeGeographicSelectionReceipt>{
  return freezeData({version:1,owner,seed,sourceHash:massDigest(rows),selected:chooseNativeGeographicObjective(seed,owner,rows)?.id??null});
}
export function validateNativeGeographicSelection(seed:number,owner:string,rows:readonly NativeGeographicObjectiveSource[],receipt:NativeGeographicSelectionReceipt):void {
  if(canonical(receipt)!==canonical(nativeGeographicSelectionReceipt(seed,owner,rows)))throw Error('Native objective selection changed');
}
