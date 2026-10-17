import {beforeNativeBrowserEntry as projectBrowserEntry} from './nativeBrowserEntryCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeClientContinuityCompositionArchive as archive} from './nativeClientContinuityCompositionArchive';
export function beforeNativeClientContinuityOnly(lane:'continuity'|'input'|'save'|'descent'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native client continuity exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeClientContinuity(lane:'continuity'|'input'|'save'|'descent'|'proof',file:string,input:string):string {return beforeNativeClientContinuityOnly(lane,file,projectBrowserEntry('continuity',file,input));}
