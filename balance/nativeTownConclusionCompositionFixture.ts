import {beforeNativeContinuity as projectContinuity} from './nativeContinuityCompositionFixture';
import {nativeTownConclusionCompositionArchive as archive} from './nativeTownConclusionCompositionArchive';
export function beforeNativeTownConclusionOnly(lane:'town'|'conclusion'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native town/conclusion exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeTownConclusion(lane:'town'|'conclusion'|'proof',file:string,input:string):string {return beforeNativeTownConclusionOnly(lane,file,projectContinuity('production',file,input));}
