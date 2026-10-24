import { TILESETS, type TilesetDef } from '../data/tilesets';
import type { ZoneDef } from '../data/zones';
import { nativeProcessionConfig } from '../engine/processionObjectives';
import type { NativeCountrySpec } from './nativeCountry';
import type { NativeMassProcessionSource, MassProcessionContext } from './processionTypes';
import { canonical, freezeData } from './random';

/** Only native open-country tile rows. Campaign/sealed/realm operations need
 * their own physical prerequisites and never borrow this open escort owner. */
export function nativeMassProcessionSources(country?: NativeCountrySpec): readonly Readonly<NativeMassProcessionSource>[] {
  const rows: NativeMassProcessionSource[] = [];
  const tilesets = country ? (country.sources as {tilesets:{definition:TilesetDef}[]}).tilesets.map(t=>t.definition) : Object.values(TILESETS);
  for (const ts of tilesets) {
    if (ts.frontier === false || ts.realm || ts.boundless) continue;
    for (const [i,row] of ts.objectives.entries()) if (row.kind === 'procession' && row.weight > 0)
      rows.push({id: 'tilesets/'+ts.id+'/objectives/'+i, source:'data/tilesets', tileset:ts.id,
        weight:row.weight, totalWeight:ts.objectives.reduce((n,o)=>n+Math.max(0,o.weight),0), objective:{kind:'procession'}});
  }
  return freezeData(rows.sort((a,b)=>a.id.localeCompare(b.id)));
}
export function resolveMassProcessionContext(zone:ZoneDef, source:NativeMassProcessionSource, level:number):Readonly<MassProcessionContext> {
  if (!Number.isSafeInteger(level)||level<1||source.source!=='data/tilesets'||source.tileset!==zone.tileset
    ||source.objective.kind!=='procession'||zone.aquatic||zone.boundless) throw Error('Unsupported native procession source');
  return freezeData(JSON.parse(canonical({source:source.source+'/'+source.id, zone:{...zone,level,objective:source.objective},
    recipe:source,config:nativeProcessionConfig(source.objective)})) as MassProcessionContext);
}
