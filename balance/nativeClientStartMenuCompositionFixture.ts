import {beforeNativeClientStartActions as projectActions} from './nativeClientStartActionsCompositionFixture';
import {nativeClientStartMenuCompositionArchive as archive} from './nativeClientStartMenuCompositionArchive';
export function beforeNativeClientStartMenusOnly(lane:'clientMenu'|'startup',file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.lanes[lane].find(r=>r.file===file);if(!row)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native startup/menu exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeClientStartMenuProof(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.proofRows.find(r=>r.file===file);if(!row)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native startup/menu exact proof hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeClientStartMenus(lane:'clientMenu'|'startup',file:string,input:string):string {return beforeNativeClientStartMenusOnly(lane,file,projectActions('startMenus',file,input));}
