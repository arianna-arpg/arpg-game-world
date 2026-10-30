import {beforeNativeClientContinuity as projectClientContinuity} from './nativeClientContinuityCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeContinuityCompositionArchive as archive} from './nativeContinuityCompositionArchive';
export function beforeNativeContinuityOnly(lane:'production'|'party'|'continue'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native continuity exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeContinuity(lane:'production'|'party'|'continue'|'proof',file:string,input:string):string {return beforeNativeContinuityOnly(lane,file,projectClientContinuity('continuity',file,input));}
