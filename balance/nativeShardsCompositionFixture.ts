import assert from 'node:assert/strict';
import * as fs from './nativeMainHostCompositionFS';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeShardsCompositionArchive as archive,type NativeShardsSourceRow,type NativeShardsSourceLane} from './nativeShardsCompositionArchive';
export type {NativeShardsSourceLane} from './nativeShardsCompositionArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),normal=(s:string)=>s.replace(/\r\n?/g,'\n');
type Row=NativeShardsSourceRow;
const lanes=new Map<string,Map<string,Row>>(Object.entries(archive.lanes).map(([lane,rows])=>[lane,new Map(rows.map(row=>[row.file,row]))]));
/** Exact raw predecessor selection before the unchanged package source readers. */
export function beforeNativeShardsComposition(lane:NativeShardsSourceLane,file:string,input:string):string {
 const rows=lanes.get(lane);assert(rows,'Unknown native Shards source lane');const row=rows.get(file);if(!row)return input;
 let source=normal(input);if(hash(source)!==row.beforeHash){
  assert.equal(hash(source),row.afterHash,'Native Shards source differs from its exact reviewed predecessor or combined source: '+lane+'/'+file);
  for(const h of row.hunks){assert.equal(source.split(h.after).length,2,'Unique native Shards source hunk: '+lane+'/'+file);source=source.replace(h.after,h.before);}
  assert.equal(hash(source),row.beforeHash,'Complete native Shards source predecessor: '+lane+'/'+file);
 }
 let line=0;return source.replace(/\n/g,()=>row.crlfLines.includes(line++)?'\r\n':'\n');
}
function sourceKey(file:fs.PathOrFileDescriptor):string|undefined {
 if(typeof file==='number')return undefined;
 const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);
 return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\','/');
}
function reader(lane:NativeShardsSourceLane):typeof fs.readFileSync {
 const read=(file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{
  const raw=fs.readFileSync(file,options),key=sourceKey(file);
  if(key===undefined||!lanes.get(lane)!.has(key))return raw;
  const encoding=typeof options==='string'?options:options?.encoding;
  assert(encoding==null||encoding==='utf8'||encoding==='utf-8','Native Shards source projection requires UTF-8 or raw bytes');
  const before=beforeNativeShardsComposition(lane,key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);
  return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;
 };
 return read as typeof fs.readFileSync;
}
export const readNativeShardsCaravan=reader('caravan');
export const nativeShardsCaravanFS={...fs,readFileSync:readNativeShardsCaravan};
export const readNativeShardsKeeper=reader('keeper');
export const nativeShardsKeeperFS={...fs,readFileSync:readNativeShardsKeeper};
export const readNativeShardsWire=reader('wire');
export const nativeShardsWireFS={...fs,readFileSync:readNativeShardsWire};
export const readNativeShardsFrames=reader('frames');
export const nativeShardsFramesFS={...fs,readFileSync:readNativeShardsFrames};
export const readNativeShardsSave=reader('save');
export const nativeShardsSaveFS={...fs,readFileSync:readNativeShardsSave};
export const readNativeShardsPresentation=reader('presentation');
export const nativeShardsPresentationFS={...fs,readFileSync:readNativeShardsPresentation};
export const readNativeShardsSeats=reader('seats');
export const nativeShardsSeatsFS={...fs,readFileSync:readNativeShardsSeats};
export const readNativeShardsNearScale=reader('near-scale');
export const nativeShardsNearScaleFS={...fs,readFileSync:readNativeShardsNearScale};
export const readNativeShardsNear96=reader('near96');
export const nativeShardsNear96FS={...fs,readFileSync:readNativeShardsNear96};
export const readNativeShardsMuster=reader('muster');
export const nativeShardsMusterFS={...fs,readFileSync:readNativeShardsMuster};
export const readNativeShardsHost=reader('host');
export const nativeShardsHostFS={...fs,readFileSync:readNativeShardsHost};
export const readNativeShardsHostSuccessor=reader('host-successor');
export const nativeShardsHostSuccessorFS={...fs,readFileSync:readNativeShardsHostSuccessor};
