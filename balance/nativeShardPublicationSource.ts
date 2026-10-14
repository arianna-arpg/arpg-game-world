import {createHash} from 'node:crypto';
import {readNativeShardsWire as readFileSync} from './nativeShardsCompositionFixture';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beforeNativeArrivalRaw} from './nativeArrivalCompositionFixture';
import {beforeNativeMainCastSource} from './nativeMainCastSourceFixture';
import {nativeShardPublicationArchive as archive} from './nativeShardPublicationArchive';
export const shardPublicationLF=(s:string):string=>s.replace(/\r\n?/g,'\n');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Only the exact reviewed successor and exact predecessor are accepted. */
export function beforeNativeShardPublication(file:string,input:string):string {
 const row=archive.rows.find(r=>r.file===file)??archive.readers.find(r=>r.file===file);if(!row)return input;
 const source=shardPublicationLF(input),digest=hash(source);
 if(digest===row.beforeHash&&source===row.before)return row.before;
 if(digest!==row.afterHash||source!==row.after)throw Error('Unknown native shard publication source: '+file);
 return row.before;
}
export function readNativeShardPublicationMainCast(file:string|URL,encoding:'utf8'):string {
 const root=fileURLToPath(new URL('../',import.meta.url)),absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),key=path.relative(root,absolute).replaceAll('\\','/');
 const source=beforeNativeShardPublication(key,readFileSync(file,encoding));
 return beforeNativeMainCastSource(key,beforeNativeArrivalRaw('production',key,source));
}
