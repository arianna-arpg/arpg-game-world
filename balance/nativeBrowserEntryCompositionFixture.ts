import {beforeNativeBrowserHosted as projectBrowserHosted} from './nativeBrowserHostedCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeBrowserEntryCompositionArchive as archive} from './nativeBrowserEntryCompositionArchive';
export function beforeNativeBrowserEntryOnly(lane:'continuity'|'dimension'|'hiring'|'proof',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native browser entry exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeBrowserEntry(lane:'continuity'|'dimension'|'hiring'|'proof',file:string,input:string):string {return beforeNativeBrowserEntryOnly(lane,file,projectBrowserHosted('browser',file,input));}
