import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {readNativeShardsKeeper as readFileSync} from './nativeShardsCompositionFixture';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {beforeNativeArrivalRaw,type NativeArrivalSourceLane} from './nativeArrivalCompositionFixture';
import {nativeArrivalCompositionArchive as arrival} from './nativeArrivalCompositionArchive';
import {beforeNativeMainCastSource} from './nativeMainCastSourceFixture';
import {beforeNativeMainProofSource} from './nativeMainProofSourceFixture';
import {nativeShardKeeperCompositionArchive as archive} from './nativeShardKeeperCompositionArchive';
export {beforeNativeArrivalRaw,type NativeArrivalSourceLane} from './nativeArrivalCompositionFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),rows=new Map<string,typeof archive.rows[number]>(archive.rows.map(r=>[r.file,r]));
export function beforeNativeKeeperComposition(file:string,input:string):string{const row=rows.get(file);if(!row)return input;const digest=hash(input.replace(/\r\n/g,'\n'));if(digest!==row.normalizedBefore&&digest!==row.normalizedAfter)throw Error('Native keeper composition refuses an unreviewed whole source: '+file);return row.before;}
function keyFor(file:string|URL):string{const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),root=fileURLToPath(new URL('../',import.meta.url));return path.relative(root,absolute).replaceAll('\\','/');}
export function readNativeKeeperRaw(file:string|URL,encoding:'utf8'):string;
export function readNativeKeeperRaw(file:string|URL):Buffer;
export function readNativeKeeperRaw(file:string|URL,encoding?:'utf8'):string|Buffer{const key=keyFor(file);if(encoding==='utf8')return beforeNativeKeeperComposition(key,readFileSync(file,encoding));const raw=readFileSync(file);return rows.has(key)?Buffer.from(beforeNativeKeeperComposition(key,raw.toString('utf8')),'utf8'):raw;}
function read(lane:NativeArrivalSourceLane,file:string|URL,encoding:'utf8'):string{return beforeNativeArrivalRaw(lane,keyFor(file),readNativeKeeperRaw(file,encoding));}
export const readNativeArrivalProduction=(file:string|URL,encoding:'utf8'):string=>read('production',file,encoding);
export const readNativeArrivalEncounter=(file:string|URL,encoding:'utf8'):string=>read('encounter',file,encoding);
export const readNativeArrivalWarlord=(file:string|URL,encoding:'utf8'):string=>read('warlord',file,encoding);
export const readNativeArrivalMainCast=(file:string|URL,encoding:'utf8'):string=>beforeNativeMainCastSource(keyFor(file),readNativeArrivalProduction(file,encoding));
export const nativeArrivalProductionFS={...fs,readFileSync:readNativeArrivalProduction};
export const nativeArrivalEncounterFS={...fs,readFileSync:readNativeArrivalEncounter};
export const nativeArrivalWarlordFS={...fs,readFileSync:readNativeArrivalWarlord};
export const nativeArrivalMainCastFS={...fs,readFileSync:readNativeArrivalMainCast};
export function readNativeArrivalMainproof(file:string|URL,encoding:'utf8'):string;
export function readNativeArrivalMainproof(file:string|URL):Buffer;
export function readNativeArrivalMainproof(file:string|URL,encoding?:'utf8'):string|Buffer{if(encoding==='utf8')return read('mainproof',file,encoding);const raw=readNativeKeeperRaw(file),key=keyFor(file);return arrival.lanes.mainproof.some(row=>row.file===key)?Buffer.from(beforeNativeArrivalRaw('mainproof',key,raw.toString('utf8')),'utf8'):raw;}
export const nativeArrivalMainproofFS={...fs,readFileSync:readNativeArrivalMainproof};
export const readNativeArrivalSummonBoundary=(file:string|URL,encoding:'utf8'):string=>{const key=keyFor(file),source=readNativeArrivalMainCast(file,encoding);return key==='src/engine/world.ts'?beforeNativeMainProofSource('content',key,source):source;};
export const nativeArrivalSummonBoundaryFS={...fs,readFileSync:readNativeArrivalSummonBoundary};