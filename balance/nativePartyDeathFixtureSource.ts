import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import {createHash} from 'node:crypto';import {nativePartyDeathArchive as archive} from './nativePartyDeathArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativePartyDeathOnly(file:string,input:string):string{let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||hash(source)===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native party death exact source hunk refused: '+file);source=source.replace(h.after,h.before);}if(hash(source)!==row.beforeHash)throw Error('Native party death unknown outside source: '+file);return source;}

export function beforeNativePartyDeath(file:string,input:string):string {return beforeNativePartyDeathOnly(file,projectContinuity('party',file,input));}
