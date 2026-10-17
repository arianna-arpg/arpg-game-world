import {createHash} from 'node:crypto';
import {runtimeBirthLifetimeArchive} from './nativeRuntimeBirthLifetimeArchive';
const norm=(s:string)=>s.replaceAll('\r\n','\n');const hash=(s:string)=>createHash('sha256').update(norm(s)).digest('hex');
export function beforeNativeRuntimeBirthLifetime(source:string,file:string):string {const row=runtimeBirthLifetimeArchive.find(r=>r.file===file);if(!row)throw Error('Unknown native runtime lifetime source: '+file);if(hash(source)!==hash(row.successor))throw Error('Native runtime lifetime successor source changed: '+file);return row.original;}
