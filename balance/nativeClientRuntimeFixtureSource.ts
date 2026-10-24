import {createHash} from 'node:crypto';
import {nativeClientRuntimeArchive as archive} from './nativeClientRuntimeArchive';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const count=(text:string,part:string)=>text.split(part).length-1;
/** Only reviewed exact edits reverse. Unrelated drift remains for older guards. */
export function beforeNativeClientRuntime(file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.files.find(row=>row.file===file);if(!row)return source;
 if(hash(source)===row.beforeSha256)return source;
 if(row.hunks.every(h=>count(source,h.before)===1)&&row.hunks.every(h=>count(source,h.after)===0))return source;
 for(const h of row.hunks){if(count(source,h.after)!==1)throw Error('Native client runtime exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;
}
