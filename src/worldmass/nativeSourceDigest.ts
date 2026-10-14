/** Pure string checksum reuse. Keys are complete source bytes, never a sampling
 * hash; this carries no validation, reader state, or authority. */
import {massDigest} from './random';
const nativeStringify=JSON.stringify;
const sources=new Map<string,string>();
const maxBytes=2*1024*1024;
let bytes=0;
export function nativeSourceDigest(source:string):string {
  if(JSON.stringify!==nativeStringify)return massDigest(source);
  const known=sources.get(source);
  if(known!==undefined){sources.delete(source);sources.set(source,known);return known;}
  const digest=massDigest(source),size=source.length*2;
  if(size>maxBytes||JSON.stringify!==nativeStringify)return digest;
  sources.set(source,digest);bytes+=size;
  while(sources.size>4||bytes>maxBytes){const first=sources.keys().next().value!;sources.delete(first);bytes-=first.length*2;}
  return digest;
}
