/** Explicit saved mapping from durable physical addresses to one frozen native source.
 * This module does not select a face, activate a preset or alter historical country policy. */
import {address,cellInteger,floorDiv,validSpan,type MassAddress} from './address';
import type {MapCoord} from '../world/coords';
import {copyNativeGeographyData,createNativeGeographyReader,restoreNativeGeographySource,type NativeGeographyReader} from '../world/geographySource';
import {canonical,freezeData,massDigest,streamSeed} from './random';
export interface PositiveRatio {numerator:string;denominator:string}
export interface MassNativeMapping {
 schema:1;algorithm:'bigint-relative-native-map-v1';
 addressSpan:number;
 physicalOrigin:MassAddress;
 nativeOrigin:MapCoord;
 physicalUnitsPerNativeUnit:PositiveRatio;
 nativeDimension:string;
 /** Inclusive native coordinate envelope. Exact rational results are tested before rounding. */
 nativeBounds:{minX:number;minY:number;maxX:number;maxY:number};
 /** No clamping, wrapping, modulo, floating-origin reset or distant reroll. */
 outsideDomain:'refuse';
 rounding:'nearest-binary64-ties-even-once';
}
export interface ExactFraction {n:bigint;d:bigint}
const abs=(v:bigint)=>v<0n?-v:v;
export function gcd(a:bigint,b:bigint):bigint {a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a;}
export function fraction(n:bigint,d=1n):ExactFraction {if(d===0n)throw RangeError('Zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
function plus(a:ExactFraction,b:ExactFraction):ExactFraction{return fraction(a.n*b.d+b.n*a.d,a.d*b.d);}
function minus(a:ExactFraction,b:ExactFraction):ExactFraction{return plus(a,{n:-b.n,d:b.d});}
/** Every finite JavaScript offset/origin is an exact binary rational. */
export function exactNumber(value:number):ExactFraction {
 if(!Number.isFinite(value))throw RangeError('Mapping input must be finite');if(value===0)return {n:0n,d:1n};
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value,false);const bits=view.getBigUint64(0,false);
 const negative=(bits>>63n)!==0n,exp=Number((bits>>52n)&0x7ffn),mantissa=bits&((1n<<52n)-1n);
 const significand=exp?((1n<<52n)|mantissa):mantissa,power=(exp?exp-1023:-1022)-52;
 return fraction((negative?-1n:1n)*significand*(power>0?1n<<BigInt(power):1n),power<0?1n<<BigInt(-power):1n);
}
function roundInteger(n:bigint,d:bigint):bigint {const q=n/d,r=n%d;return r*2n>d||(r*2n===d&&(q&1n)===1n)?q+1n:q;}
/** Correctly round the complete rational once, without Number(largeCell).
 * The rounded result need not be exact as a rational; the arithmetic before
 * this explicit native-number boundary is exact. */
export function nativeNumber(value:ExactFraction):number {
 if(value.d<=0n)throw RangeError('Invalid denominator');if(value.n===0n)return 0;
 const negative=value.n<0n,n=abs(value.n),d=value.d;
 let exponent=n.toString(2).length-d.toString(2).length;
 if(exponent>=0?(n<(d<<BigInt(exponent))):((n<<BigInt(-exponent))<d))exponent--;
 if(exponent>1023)throw RangeError('Outside finite native-number domain');
 let magnitude:number;
 if(exponent < -1022){const q=roundInteger(n<<1074n,d);magnitude=Number(q)*2**-1074;}
 else {const shift=52-exponent;let q=shift>=0?roundInteger(n<<BigInt(shift),d):roundInteger(n,d<<BigInt(-shift));
  if(q===(1n<<53n)){q>>=1n;exponent++;}if(exponent>1023)throw RangeError('Outside finite native-number domain');
  magnitude=Number(q)*2**(exponent-52);
 }
 if(!Number.isFinite(magnitude))throw RangeError('Outside finite native-number domain');
 return magnitude===0?0:negative?-magnitude:magnitude;
}
function positiveRatio(value:PositiveRatio):[bigint,bigint] {
 const valid=(s:string)=>typeof s==='string'&&s.length<=20&&/^[1-9][0-9]*$/.test(s);
 if(!valid(value.numerator)||!valid(value.denominator))throw RangeError('Scale needs canonical positive integer strings');
 const p=BigInt(value.numerator),q=BigInt(value.denominator),max=(1n<<63n)-1n;
 if(p>max||q>max||gcd(p,q)!==1n)throw RangeError('Scale must be reduced positive signed64 integers');return[p,q];
}
function canonicalAddress(at:MassAddress,span:number):void {
 if(!at||typeof at!=='object'||Object.keys(at).length!==5||Object.keys(at).some(k=>!['dimension','cx','cy','x','y'].includes(k)))throw Error('Mapping needs exact durable address fields');
 const canonical=address(at.dimension,at.cx,at.cy,at.x,at.y,span);
 if(canonical.cx!==at.cx||canonical.cy!==at.cy||canonical.x!==at.x||canonical.y!==at.y)throw RangeError('Mapping needs a normalized durable address');
}
export function validateMapping(spec:MassNativeMapping):void {
 if(spec.schema!==1||spec.algorithm!=='bigint-relative-native-map-v1'||spec.outsideDomain!=='refuse'||spec.rounding!=='nearest-binary64-ties-even-once')throw Error('Unsupported mapping policy');
 validSpan(spec.addressSpan);canonicalAddress(spec.physicalOrigin,spec.addressSpan);positiveRatio(spec.physicalUnitsPerNativeUnit);
 exactNumber(spec.nativeOrigin.x);exactNumber(spec.nativeOrigin.y);
 if(!spec.nativeDimension||spec.nativeDimension.length>128)throw Error('Explicit native dimension required');
 const b=spec.nativeBounds;
 if(!b||![b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite)||b.minX>=b.maxX||b.minY>=b.maxY)throw RangeError('Invalid native mapping envelope');
 if(spec.nativeOrigin.x<b.minX||spec.nativeOrigin.x>b.maxX||spec.nativeOrigin.y<b.minY||spec.nativeOrigin.y>b.maxY)throw RangeError('Native origin lies outside mapping envelope');
}
/** No conversion of an absolute address or large relative cell delta to Number. */
export function exactMappedPoint(spec:MassNativeMapping,at:MassAddress):{x:ExactFraction;y:ExactFraction} {
 validateMapping(spec);canonicalAddress(at,spec.addressSpan);if(at.dimension!==spec.physicalOrigin.dimension)throw Error('No mapping recorded for this physical dimension');
 const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);
 const axis=(cell:string,offset:number,originCell:string,originOffset:number,nativeOrigin:number)=>{
  const whole=(cellInteger(cell)-cellInteger(originCell))*span;
  const delta=plus({n:whole,d:1n},minus(exactNumber(offset),exactNumber(originOffset)));
  return plus(exactNumber(nativeOrigin),fraction(delta.n*q,delta.d*p));
 };
 return {x:axis(at.cx,at.x,spec.physicalOrigin.cx,spec.physicalOrigin.x,spec.nativeOrigin.x),y:axis(at.cy,at.y,spec.physicalOrigin.cy,spec.physicalOrigin.y,spec.nativeOrigin.y)};
}
function within(value:ExactFraction,min:number,max:number):boolean {const lo=exactNumber(min),hi=exactNumber(max);return value.n*lo.d>=lo.n*value.d&&value.n*hi.d<=hi.n*value.d;}
function inEnvelope(spec:MassNativeMapping,point:{x:ExactFraction;y:ExactFraction}):void {const b=spec.nativeBounds;if(!within(point.x,b.minX,b.maxX)||!within(point.y,b.minY,b.maxY))throw RangeError('Address lies outside recorded native mapping envelope');}
export function mappedPoint(spec:MassNativeMapping,at:MassAddress):MapCoord {const exact=exactMappedPoint(spec,at);inEnvelope(spec,exact);return {x:nativeNumber(exact.x),y:nativeNumber(exact.y)};}
/** This returns local geometric truth only. Its biome and depth are not
 * a stable face/area selection context and never overwrite a saved mint. */
export function sampleMappedPoint(spec:MassNativeMapping,reader:NativeGeographyReader,at:MassAddress) {
 const native=mappedPoint(spec,at),dimension=spec.nativeDimension;
 const climate=reader.climateAt(native,dimension); // actual reader numeric-domain guard
 if(dimension==='surface'){const region=reader.regionWinner(native);return {native,dimension,biome:reader.biomeAt(native),depth:region.depth,region,climate,continent:reader.continentAt(native)};}
 return {native,dimension,biome:reader.dimensionBiomeAt(dimension,native),depth:reader.dimensionBiomeDepth(dimension,native),climate};
}

/** Atlas/locale source resolution can supply a different authoritative native
 * anchor. Inverse-map that anchor before mint; never recenter a chosen face
 * by sampling geography again after physical placement jitter. */
export function physicalAnchorForNative(spec:MassNativeMapping,native:MapCoord):MassAddress {
 validateMapping(spec);inEnvelope(spec,{x:exactNumber(native.x),y:exactNumber(native.y)});const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);
 const axis=(value:number,nativeOrigin:number,originCell:string,originOffset:number):[string,number]=>{
  const nativeDelta=minus(exactNumber(value),exactNumber(nativeOrigin));
  const absolute=plus(plus({n:cellInteger(originCell)*span,d:1n},exactNumber(originOffset)),fraction(nativeDelta.n*p,nativeDelta.d*q));
  const cell=floorDiv(absolute.n,absolute.d*span),offset=fraction(absolute.n-cell*absolute.d*span,absolute.d);
  return [cell.toString(),nativeNumber(offset)];
 };
 const [cx,x]=axis(native.x,spec.nativeOrigin.x,spec.physicalOrigin.cx,spec.physicalOrigin.x);
 const [cy,y]=axis(native.y,spec.nativeOrigin.y,spec.physicalOrigin.cy,spec.physicalOrigin.y);
 const at=address(spec.physicalOrigin.dimension,cx,cy,x,y,spec.addressSpan),projected=mappedPoint(spec,at);
 // The inverse crosses a second binary64 boundary at the physical local offset.
 // Authoritative native mint coordinates must survive that boundary exactly;
 // a nearest physical encoding which changes the native input cannot be used.
 // Refuse without tolerance or silently moving/resampling the native anchor.
 if(projected.x!==native.x||projected.y!==native.y)throw RangeError('Physical anchor cannot preserve the authoritative native coordinate');
 return at;
}

/** New opt-in policy only. Exact native bytes are saved once as a string so
 * parent manifest canonicalization cannot sort the native source's own keys. */
export interface MassNativeGeographySpec {
 schema:1;policy:'mass-native-geography';version:1;
 sourceJson:string;
 /** Sampling checksum, not a unique identity. Exact sourceJson remains authoritative. */
 sourceHash:string;
 mapping:MassNativeMapping;
 mappingHash:string;
 mintNamespace:'mass-native-area-mint-v1';
}
export interface MassNativeOwnerContext {
 schema:1;policy:'mass-native-geography';version:1;
 sourceHash:string;mappingHash:string;
 ownerId:string;canonicalAnchor:MassAddress;
 nativeDimension:string;requestedTarget:MapCoord;requestedSeed:number;
}
/** Receipt from the complete native atlas/topology resolver before face draws.
 * nativeId and resolvedOwnerId need not equal the original candidate identity. */
export interface MassNativeMintResolution {
 resolvedOwnerId:string;resolutionKey:string;nativeId:string;
 resolvedTarget:MapCoord;resolvedSeed:number;
}
export interface MassNativeResolvedOwnerContext extends MassNativeMintResolution {
 schema:1;request:MassNativeOwnerContext;physicalAnchor:MassAddress;
 nativeDimension:string;sourceHash:string;mappingHash:string;
}
const SPEC_KEYS=['schema','policy','version','sourceJson','sourceHash','mapping','mappingHash','mintNamespace'];
const MAPPING_KEYS=['schema','algorithm','addressSpan','physicalOrigin','nativeOrigin','physicalUnitsPerNativeUnit','nativeDimension','nativeBounds','outsideDomain','rounding'];
function exactKeys(value:object,keys:readonly string[],label:string):void {const own=Object.keys(value);if(own.length!==keys.length||own.some(k=>!keys.includes(k)))throw Error('Invalid '+label+' shape');}
function mappingShape(mapping:MassNativeMapping):void {
 if(!mapping||typeof mapping!=='object')throw Error('Missing native mapping');exactKeys(mapping,MAPPING_KEYS,'mapping');
 exactKeys(mapping.physicalOrigin,['dimension','cx','cy','x','y'],'physical origin');exactKeys(mapping.nativeOrigin,['x','y'],'native origin');
 exactKeys(mapping.physicalUnitsPerNativeUnit,['numerator','denominator'],'scale');exactKeys(mapping.nativeBounds,['minX','minY','maxX','maxY'],'native envelope');validateMapping(mapping);
}
function stableId(value:string,label:string):void {if(typeof value!=='string'||!value||value.length>4096)throw Error('Invalid '+label);}
function uint32(value:number,label:string):void {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid '+label);}
function mappingChecksum(mapping:MassNativeMapping):string{return massDigest({algorithm:'bigint-relative-native-map-v1',mapping});}
function checkedSpec(input:MassNativeGeographySpec):MassNativeGeographySpec {
 const spec=copyNativeGeographyData(input);exactKeys(spec,SPEC_KEYS,'native geography spec');
 if(spec.schema!==1||spec.policy!=='mass-native-geography'||spec.version!==1||spec.mintNamespace!=='mass-native-area-mint-v1')throw Error('Unsupported native geography policy');
 if(typeof spec.sourceJson!=='string'||massDigest(spec.sourceJson)!==spec.sourceHash)throw Error('Native source checksum mismatch');
 mappingShape(spec.mapping);if(mappingChecksum(spec.mapping)!==spec.mappingHash)throw Error('Native mapping checksum mismatch');return spec;
}
export function makeMassNativeGeographySpec(sourceJson:string,mapping:MassNativeMapping):Readonly<MassNativeGeographySpec> {
 const cleanMapping=copyNativeGeographyData(mapping);
 const spec:MassNativeGeographySpec={schema:1,policy:'mass-native-geography',version:1,sourceJson,sourceHash:massDigest(sourceJson),mapping:cleanMapping,mappingHash:mappingChecksum(cleanMapping),mintNamespace:'mass-native-area-mint-v1'};
 // Construct once to verify exact serialized native source and both origins.
 return new MassNativeGeography(spec).spec;
}
/** Per-source reader, explicit finite envelope and stable pre-mint contexts.
 * Neither point sampling nor physical placement can reselect an owned face.
 * Old country policies never pass through this new discriminator. */
export class MassNativeGeography {
 readonly spec:Readonly<MassNativeGeographySpec>;
 readonly identity:string;
 private readonly reader:NativeGeographyReader;
 constructor(input:MassNativeGeographySpec){
  const spec=checkedSpec(input);this.reader=createNativeGeographyReader(restoreNativeGeographySource(spec.sourceJson));
  if(!this.reader.source.dimensions.some(([id])=>id===spec.mapping.nativeDimension))throw Error('Mapping names an uncaptured native dimension');
  this.spec=freezeData(spec);this.identity=canonical(spec);
  this.reader.climateAt(spec.mapping.nativeOrigin,spec.mapping.nativeDimension);
 }
 get seed():number{return this.reader.source.seed;}
 /** Check complete bytes and policy, never accept a conflicting source on a checksum alone. */
 assertCompatible(input:MassNativeGeographySpec):void {
  const spec=checkedSpec(input);
  if(spec.sourceJson!==this.spec.sourceJson||canonical(spec)!==this.identity)throw Error('Conflicting native geography source or mapping policy');
 }
 pointAt(at:MassAddress){return sampleMappedPoint(this.spec.mapping,this.reader,copyNativeGeographyData(at));}
 nativePoint(at:MassAddress):MapCoord {
  const point=mappedPoint(this.spec.mapping,copyNativeGeographyData(at));this.reader.climateAt(point,this.spec.mapping.nativeDimension);return point;
 }
 physicalAnchor(native:MapCoord):MassAddress {
  const point=copyNativeGeographyData(native);this.reader.climateAt(point,this.spec.mapping.nativeDimension);return physicalAnchorForNative(this.spec.mapping,point);
 }
 ownerContext(ownerId:string,canonicalAnchor:MassAddress):Readonly<MassNativeOwnerContext> {
  stableId(ownerId,'native area owner');const anchor=copyNativeGeographyData(canonicalAnchor),requestedTarget=this.nativePoint(anchor),s=this.spec;
  // One candidate seed feeds the complete native mint. Native atlas resolution
  // may replace it; the mint then preserves rng(seed) and genRng(seed^0x51ed2ab9).
  const requestedSeed=streamSeed(this.seed,[s.mintNamespace,s.version,s.sourceHash,s.mappingHash,ownerId,canonical(anchor)]);
  return freezeData({schema:1 as const,policy:s.policy,version:s.version,sourceHash:s.sourceHash,mappingHash:s.mappingHash,ownerId,canonicalAnchor:anchor,nativeDimension:s.mapping.nativeDimension,requestedTarget,requestedSeed});
 }
 restoreOwnerContext(input:MassNativeOwnerContext):Readonly<MassNativeOwnerContext> {
  const saved=copyNativeGeographyData(input),expected=this.ownerContext(saved.ownerId,saved.canonicalAnchor);
  if(canonical(saved)!==canonical(expected))throw Error('Saved native owner context conflicts with its recorded policy');return expected;
 }
 resolveOwnerContext(input:MassNativeOwnerContext,resolution:MassNativeMintResolution):Readonly<MassNativeResolvedOwnerContext> {
  const request=this.restoreOwnerContext(input),resolved=copyNativeGeographyData(resolution);
  exactKeys(resolved,['resolvedOwnerId','resolutionKey','nativeId','resolvedTarget','resolvedSeed'],'native mint resolution');
  stableId(resolved.resolvedOwnerId,'resolved native owner');stableId(resolved.resolutionKey,'native source resolution');stableId(resolved.nativeId,'native zone id');uint32(resolved.resolvedSeed,'resolved native seed');
  exactKeys(resolved.resolvedTarget,['x','y'],'resolved native target');const physicalAnchor=this.physicalAnchor(resolved.resolvedTarget);
  return freezeData({schema:1 as const,request,...resolved,physicalAnchor,nativeDimension:request.nativeDimension,sourceHash:this.spec.sourceHash,mappingHash:this.spec.mappingHash});
 }
 restoreResolvedOwnerContext(input:MassNativeResolvedOwnerContext):Readonly<MassNativeResolvedOwnerContext> {
  const saved=copyNativeGeographyData(input),expected=this.resolveOwnerContext(saved.request,{resolvedOwnerId:saved.resolvedOwnerId,resolutionKey:saved.resolutionKey,nativeId:saved.nativeId,resolvedTarget:saved.resolvedTarget,resolvedSeed:saved.resolvedSeed});
  if(canonical(saved)!==canonical(expected))throw Error('Saved native mint resolution conflicts with its recorded policy');return expected;
 }
}
