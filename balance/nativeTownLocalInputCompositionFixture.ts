import {beforeNativeClientContinuity as projectClientContinuity} from './nativeClientContinuityCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeTownLocalInputCompositionArchive as archive} from './nativeTownLocalInputCompositionArchive';
export function beforeNativeTownLocalInputOnly(lane:'town'|'input'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native town/input exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeTownLocalInput(lane:'town'|'input'|'proof',file:string,input:string):string {return beforeNativeTownLocalInputOnly(lane,file,projectClientContinuity('input',file,input));}
