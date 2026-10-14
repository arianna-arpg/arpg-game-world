import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readNativeShardsCaravan} from './nativeShardsCompositionFixture';
import {beforeNativeClientStart} from './nativeClientStartFixtureSource';
import {beforeNativeCampaignRaw} from './nativeCampaignCompositionFixture';
import {nativeShardsLegacySourceArchive as archive} from './nativeShardsLegacySourceArchive';
export type NativeShardsLegacyLane='carried'|'lifetime';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
export function beforeNativeShardsLegacy(lane:NativeShardsLegacyLane,file:string,input:string):string {
 const row=archive.rows.find(row=>row.lane===lane);assert(row,'Unknown finite Shards legacy read');if(file!==row.file)return input;
 const source=input.replace(/\r\n?/g,'\n');if(hash(source)===row.priorHash)return source;
 assert.equal(hash(source),row.currentHash,'Exact original caravan source before its reviewed predecessor');
 const prior=lane==='carried'?beforeNativeClientStart(file,source):beforeNativeCampaignRaw('journey58',file,source);
 assert.equal(hash(prior),row.priorHash,'Complete previously reviewed source predecessor');return prior;
}
function read(lane:NativeShardsLegacyLane,file:string|URL,encoding:'utf8'):string {
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),key=path.relative(fileURLToPath(new URL('../',import.meta.url)),absolute).replaceAll('\\','/');
 return beforeNativeShardsLegacy(lane,key,readNativeShardsCaravan(file,encoding));
}
export const readNativeShardsCarried=(file:string|URL,encoding:'utf8'):string=>read('carried',file,encoding);
export const readNativeShardsLifetime=(file:string|URL,encoding:'utf8'):string=>read('lifetime',file,encoding);
export const nativeShardsCarriedFS={...fs,readFileSync:readNativeShardsCarried};
export const nativeShardsLifetimeFS={...fs,readFileSync:readNativeShardsLifetime};
