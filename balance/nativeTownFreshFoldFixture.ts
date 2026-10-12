import {beforeNativeTownConclusion as projectTownConclusion} from './nativeTownConclusionCompositionFixture';
import {nativeTownFreshFoldArchive as archive} from './nativeTownFreshFoldArchive';
export function beforeNativeTownFreshFoldOnly(lane:'runtime'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='runtime'?archive.files:archive.proofRows).find(r=>r.file===file);if(!row)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native fresh town exact repair hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeTownFreshFold(lane:'runtime'|'proof',file:string,input:string):string {return beforeNativeTownFreshFoldOnly(lane,file,projectTownConclusion('town',file,input));}
