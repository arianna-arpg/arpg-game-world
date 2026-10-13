import {createHash} from 'node:crypto';
import {nativeShardEntryLifetimeArchive as archive} from './nativeShardEntryLifetimeArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function beforeNativeShardEntryLifetime(file:string,input:string):string {
 const text=input.replaceAll('\r\n','\n');if(file!==archive.file||hash(text)===archive.beforeSha256)return text;let result=text;
 for(const h of [...archive.hunks].reverse()){if(result.split(h.after).length!==2)throw Error('Exact shard-entry lifetime hunk refused: '+file);result=result.replace(h.after,h.before);}return result;
}
