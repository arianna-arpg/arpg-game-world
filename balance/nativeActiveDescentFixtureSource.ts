import {beforeNativeClientContinuity as projectClientContinuity} from './nativeClientContinuityCompositionFixture';
import {createHash} from 'node:crypto';import {nativeActiveDescentArchive as archive} from './nativeActiveDescentArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeActiveDescentOnly(file:string,input:string):string{let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||hash(source)===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native active descent exact source hunk refused: '+file);source=source.replace(h.after,h.before);}if(hash(source)!==row.beforeHash)throw Error('Native active descent unknown outside source: '+file);return source;}

export function beforeNativeActiveDescent(file:string,input:string):string {return beforeNativeActiveDescentOnly(file,projectClientContinuity('descent',file,input));}
