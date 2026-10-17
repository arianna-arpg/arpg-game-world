import {beforeNativeClientStartMenus as projectStartMenu} from './nativeClientStartMenuCompositionFixture';
import {nativeClientMenuCompositionArchive as archive} from './nativeClientMenuCompositionArchive';
export function beforeNativeClientMenusOnly(lane:'client'|'menu',file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.lanes[lane].find(r=>r.file===file);if(!row)return source;
 for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native client/menu exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;
}

export function beforeNativeClientMenus(lane:'client'|'menu',file:string,input:string):string {return beforeNativeClientMenusOnly(lane,file,projectStartMenu('clientMenu',file,input));}
