import {beforeNativeTownFreshFold as projectFreshFold} from './nativeTownFreshFoldFixture';
import {nativeTownClientCompositionArchive as archive} from './nativeTownClientCompositionArchive';
export function beforeNativeTownClientOnly(lane:'client'|'town'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native town/client exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeTownClient(lane:'client'|'town'|'proof',file:string,input:string):string {return beforeNativeTownClientOnly(lane,file,projectFreshFold('runtime',file,input));}
