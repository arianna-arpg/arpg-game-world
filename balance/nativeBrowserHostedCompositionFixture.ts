import {beforeNativeJourney as projectJourney} from './nativeJourneyCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeBrowserHostedCompositionArchive as archive} from './nativeBrowserHostedCompositionArchive';
export function beforeNativeBrowserHostedOnly(lane:'browser'|'hosted'|'couch'|'entry'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native browser hosted exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeBrowserHosted(lane:'browser'|'hosted'|'couch'|'entry'|'proof',file:string,input:string):string {return beforeNativeBrowserHostedOnly(lane,file,projectJourney('browser56',file,input));}
