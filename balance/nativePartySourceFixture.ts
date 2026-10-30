import {beforeNativeBrowserEntry as projectBrowserEntry} from './nativeBrowserEntryCompositionFixture';
import {createHash} from 'node:crypto';
import {nativePartyArchive as archive} from './nativePartyArchive';
export function beforeNativePartyOnly(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native party exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeParty(file:string,input:string):string {return beforeNativePartyOnly(file,projectBrowserEntry('hiring',file,input));}
