import {createHash} from 'node:crypto';
import {nativeCaravanPriorFS as fs,readNativeCaravanPrior as readFileSync} from './nativeCaravanCompositionFixture';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {beforeNativeMainProofSource} from './nativeMainProofSourceFixture';
import {beforeNativeMainCastSource} from './nativeMainCastSourceFixture';
import {nativeArrivalCompositionArchive as archive,type NativeArrivalSourceRow} from './nativeArrivalCompositionArchive';
export type NativeArrivalSourceLane='production'|'encounter'|'warlord'|'mainproof';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
const lanes=new Map<string,Map<string,NativeArrivalSourceRow>>(Object.entries(archive.lanes).map(([lane,rows])=>[lane,new Map(rows.map(row=>[row.file,row]))]));
/** Only exact combined input or the exact selected predecessor is accepted. */
export function beforeNativeArrivalRaw(lane:NativeArrivalSourceLane,file:string,input:string):string {
 const rows=lanes.get(lane);if(!rows)throw Error('Unknown native arrival source lane: '+lane);const row=rows.get(file);if(!row)return input;
 let source=input.replace(/\r\n?/g,'\n');
 if(hash(source)!==row.beforeHash){
  if(hash(source)!==row.afterHash)throw Error('Unknown native arrival source: '+lane+':'+file);
  for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Nonunique native arrival hunk: '+lane+':'+file);source=source.replace(h.after,h.before);}
  if(hash(source)!==row.beforeHash)throw Error('Incomplete native arrival reconstruction: '+lane+':'+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function keyFor(file:string|URL):string {const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),root=fileURLToPath(new URL('../',import.meta.url));return path.relative(root,absolute).replaceAll('\\','/');}
function read(lane:NativeArrivalSourceLane,file:string|URL,encoding:'utf8'):string{return beforeNativeArrivalRaw(lane,keyFor(file),readFileSync(file,encoding));}
export const readNativeArrivalProduction=(file:string|URL,encoding:'utf8'):string=>read('production',file,encoding);
export const readNativeArrivalEncounter=(file:string|URL,encoding:'utf8'):string=>read('encounter',file,encoding);
export const readNativeArrivalWarlord=(file:string|URL,encoding:'utf8'):string=>read('warlord',file,encoding);
/** Keep the accepted casting guard after the exact new outer projection. */
export const readNativeArrivalMainCast=(file:string|URL,encoding:'utf8'):string=>beforeNativeMainCastSource(keyFor(file),readNativeArrivalProduction(file,encoding));
export const nativeArrivalProductionFS={...fs,readFileSync:readNativeArrivalProduction};
export const nativeArrivalEncounterFS={...fs,readFileSync:readNativeArrivalEncounter};
export const nativeArrivalWarlordFS={...fs,readFileSync:readNativeArrivalWarlord};

export function readNativeArrivalMainproof(file:string|URL,encoding:'utf8'):string;
export function readNativeArrivalMainproof(file:string|URL):Buffer;
export function readNativeArrivalMainproof(file:string|URL,encoding?:'utf8'):string|Buffer {if(encoding==='utf8')return read('mainproof',file,encoding);const raw=readFileSync(file),key=keyFor(file);return lanes.get('mainproof')!.has(key)?Buffer.from(beforeNativeArrivalRaw('mainproof',key,raw.toString('utf8')),'utf8'):raw;}
export const nativeArrivalMainproofFS={...fs,readFileSync:readNativeArrivalMainproof};

export const nativeArrivalMainCastFS={...fs,readFileSync:readNativeArrivalMainCast};

/** The original asynchronous boundary proof expects the exact ground-era World from the accepted content source proof; its owner still reads the actual production predecessor. */
export const readNativeArrivalSummonBoundary=(file:string|URL,encoding:'utf8'):string=>{const key=keyFor(file),source=readNativeArrivalMainCast(file,encoding);return key==='src/engine/world.ts'?beforeNativeMainProofSource('content',key,source):source;};
export const nativeArrivalSummonBoundaryFS={...fs,readFileSync:readNativeArrivalSummonBoundary};
