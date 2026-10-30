import {beforeNativeClientMenus as projectClientMenu} from './nativeClientMenuCompositionFixture';
import {nativeClientPublicationCompositionArchive as archive} from './nativeClientPublicationCompositionArchive';
export function beforeNativeClientPublicationCompositionOnly(lane:'runtime'|'view',file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.lanes[lane].find(r=>r.file===file);if(!row)return source;
 for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native client/publication composition exact hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;
}

export function beforeNativeClientPublicationComposition(lane:'runtime'|'view',file:string,input:string):string {return beforeNativeClientPublicationCompositionOnly(lane,file,projectClientMenu('client',file,input));}
