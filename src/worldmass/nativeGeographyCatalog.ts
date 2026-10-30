/** Recorded dimension charts. Address units are native world-map units, not
 * actor pixels or metres; 1024-unit binary pages only partition durable storage.
 * SourceSession still owns exact native face/coordinate and runtime admission. */
import {restoreNativeGeographySource,copyNativeGeographyData,type NativeGeographySource} from '../world/geographySource';
import {MassNativeGeography,makeMassNativeGeographySpec,type MassNativeMapping,type MassNativeGeographySpec} from './nativeGeography';
import {canonical,freezeData} from './random';
export interface NativeGeographyCatalogSpec {
 readonly schema:1;readonly policy:'native-geography-catalog';readonly version:1;
 readonly coordinatePolicy:'native-chart-unit-address-v1';readonly initialDimension:'surface';
 readonly entries:readonly {readonly dimension:string;readonly geography:Readonly<MassNativeGeographySpec>}[];
}
function keys(value:object,names:readonly string[],label:string):void {const actual=Object.keys(value);if(actual.length!==names.length||actual.some(k=>!names.includes(k)))throw Error('Invalid recorded '+label+' shape');}
/** A conservative chart envelope, derived from this source's actual stencil
 * spacings. The 2^52 cap keeps a chart unit distinguishable in binary64; the
 * lattice margin reserves every native neighbour and coastal probe. This is
 * not a promise that every point can execute: the existing exact source reader
 * additionally refuses unsupported per-point distance/lattice arithmetic. */
function chartBound(source:Readonly<NativeGeographySource>):number {
 const g=source.field.geometry,layers=[...source.climate.axes.flatMap(([,a])=>a.layers),...source.climate.dimensions.flatMap(([,axes])=>axes.flatMap(([,a])=>a.layers??[]))];
 const coast=Math.max(0,...layers.filter(l=>l.kind==='coastal').map(l=>Math.abs(l.probe)));
 const lattices:[number,number][]=[[g.cellSpan,g.regionScale.search+4],[source.continent.cellSpan,5],...layers.filter(l=>l.kind==='noise'||l.kind==='ridge').map(l=>[l.cell,5] as [number,number])];
 const bound=Math.floor(Math.min(2**52,...lattices.map(([span,margin])=>span*(2**52-margin)-coast)));
 if(!Number.isSafeInteger(bound)||bound<=0)throw Error('Captured source has no supported production chart envelope');return bound;
}
function chartMapping(source:Readonly<NativeGeographySource>,dimension:string):MassNativeMapping {
 const bound=chartBound(source);return {schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:1024,physicalOrigin:{dimension,cx:'0',cy:'0',x:0,y:0},nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'1',denominator:'1'},nativeDimension:dimension,nativeBounds:{minX:-bound,minY:-bound,maxX:bound,maxY:bound},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
}
/** Explicit new production policy. Existing supplied mappings and v1 saves are
 * never expanded, recentered or silently migrated through this factory. */
export function makeNativeGeographyCatalogSpec(sourceJson:string):Readonly<NativeGeographyCatalogSpec> {
 const source=restoreNativeGeographySource(sourceJson),entries=source.dimensions.map(([dimension])=>({dimension,geography:makeMassNativeGeographySpec(sourceJson,chartMapping(source,dimension))}));
 return new NativeGeographyCatalog({schema:1,policy:'native-geography-catalog',version:1,coordinatePolicy:'native-chart-unit-address-v1',initialDimension:'surface',entries}).spec;
}
export class NativeGeographyCatalog {
 readonly spec:Readonly<NativeGeographyCatalogSpec>;readonly identity:string;
 readonly #entries=new Map<string,MassNativeGeography>();
 constructor(input:NativeGeographyCatalogSpec){
  const spec=copyNativeGeographyData(input);keys(spec,['schema','policy','version','coordinatePolicy','initialDimension','entries'],'geography catalog');
  if(spec.schema!==1||spec.policy!=='native-geography-catalog'||spec.version!==1||spec.coordinatePolicy!=='native-chart-unit-address-v1'||spec.initialDimension!=='surface'||!Array.isArray(spec.entries)||!spec.entries.length)throw Error('Unsupported recorded geography catalog');
  const sourceJson=spec.entries[0].geography.sourceJson,source=restoreNativeGeographySource(sourceJson);
  if(spec.entries.length!==source.dimensions.length)throw Error('Recorded catalog omits a captured dimension');
  for(let i=0;i<spec.entries.length;i++){
   const entry=spec.entries[i];keys(entry,['dimension','geography'],'dimension entry');const dimension=source.dimensions[i][0];
   if(entry.dimension!==dimension||this.#entries.has(dimension)||entry.geography.sourceJson!==sourceJson||canonical(entry.geography.mapping)!==canonical(chartMapping(source,dimension)))throw Error('Recorded dimension identity, source or mapping differs');
   const geography=new MassNativeGeography(entry.geography);Object.freeze(geography);this.#entries.set(dimension,geography);
  }
  if(!this.#entries.has('surface'))throw Error('Recorded catalog requires its native initial surface');
  this.spec=freezeData(spec);this.identity=canonical(spec);Object.freeze(this);
 }
 get initial():MassNativeGeography{return this.select(this.spec.initialDimension);}
 select(dimension:string):MassNativeGeography {const geography=this.#entries.get(dimension);if(!geography)throw Error('No recorded native geography for dimension: '+dimension);return geography;}
 assertCompatible(input:NativeGeographyCatalogSpec):void {const other=new NativeGeographyCatalog(input);if(other.identity!==this.identity)throw Error('Recorded geography catalogs differ');}
}
