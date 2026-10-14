import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {readNativeShardsSeats as readFileSync} from './nativeShardsCompositionFixture';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {beforeNativeKeeperComposition} from './nativeShardKeeperCompositionFixture';
import {beforeNativeArrivalRaw,type NativeArrivalSourceLane} from './nativeArrivalCompositionFixture';
import {nativeArrivalCompositionArchive as arrival} from './nativeArrivalCompositionArchive';
import {beforeNativeMainCastSource} from './nativeMainCastSourceFixture';
import {beforeNativeMainProofSource} from './nativeMainProofSourceFixture';
import {beforeNativeShardSeats} from './nativeShardSeatsFixture';
import {nativeShardSeatsArchive as seats} from './nativeShardSeatsArchive';
import {nativeShardSeatCompositionArchive as archive} from './nativeShardSeatCompositionArchive';
export {beforeNativeKeeperComposition} from './nativeShardKeeperCompositionFixture';
export {beforeNativeArrivalRaw,type NativeArrivalSourceLane} from './nativeArrivalCompositionFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),rows=new Map<string,typeof archive.rows[number]>(archive.rows.map(r=>[r.file,r])),runtime=new Set<string>(seats.rows.map(r=>r.file));
export function beforeNativeSeatComposition(file:string,input:string):string {const row=rows.get(file);if(!row)return beforeNativeShardSeats(file,input);const digest=hash(input.replace(/\r\n/g,'\n'));if(digest!==row.normalizedBefore&&digest!==row.normalizedAfter)throw Error('Native seat composition refuses unreviewed whole source: '+file);return row.before;}
function keyFor(file:string|URL):string {const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),root=fileURLToPath(new URL('../',import.meta.url));return path.relative(root,absolute).replaceAll('\\','/');}
export function readNativeSeatsRaw(file:string|URL,encoding:'utf8'):string;
export function readNativeSeatsRaw(file:string|URL):Buffer;
export function readNativeSeatsRaw(file:string|URL,encoding?:'utf8'):string|Buffer {const key=keyFor(file);if(encoding==='utf8')return beforeNativeSeatComposition(key,readFileSync(file,encoding));const raw=readFileSync(file);return rows.has(key)||runtime.has(key)?Buffer.from(beforeNativeSeatComposition(key,raw.toString('utf8')),'utf8'):raw;}
export function readNativeKeeperRaw(file:string|URL,encoding:'utf8'):string;
export function readNativeKeeperRaw(file:string|URL):Buffer;
export function readNativeKeeperRaw(file:string|URL,encoding?:'utf8'):string|Buffer {const key=keyFor(file);if(encoding==='utf8')return beforeNativeKeeperComposition(key,readNativeSeatsRaw(file,encoding));const raw=readNativeSeatsRaw(file),text=beforeNativeKeeperComposition(key,raw.toString('utf8'));return text===raw.toString('utf8')?raw:Buffer.from(text,'utf8');}
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
export function readNativeArrivalMainproof(file:string|URL,encoding?:'utf8'):string|Buffer {if(encoding==='utf8')return read('mainproof',file,encoding);const raw=readNativeKeeperRaw(file),key=keyFor(file);return arrival.lanes.mainproof.some(row=>row.file===key)?Buffer.from(beforeNativeArrivalRaw('mainproof',key,raw.toString('utf8')),'utf8'):raw;}
export const nativeArrivalMainproofFS={...fs,readFileSync:readNativeArrivalMainproof};
export const readNativeArrivalSummonBoundary=(file:string|URL,encoding:'utf8'):string=>{const key=keyFor(file),source=readNativeArrivalMainCast(file,encoding);return key==='src/engine/world.ts'?beforeNativeMainProofSource('content',key,source):source;};
export const nativeArrivalSummonBoundaryFS={...fs,readFileSync:readNativeArrivalSummonBoundary};

export {beforeNativeHostedPublication,hostedLF,hostedHash} from './nativeHostedPublicationFixture';
import {beforeNativeBrowserHosted as projectBrowserHosted} from './nativeBrowserHostedCompositionFixture';
export function currentNativeHostedSource(file:string):string{return projectBrowserHosted('hosted',file,readNativeArrivalMainCast(file,'utf8'));}
