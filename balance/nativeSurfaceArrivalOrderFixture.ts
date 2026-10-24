import {nativeSurfaceArrivalOrderArchive as row} from './nativeSurfaceArrivalOrderArchive';
export function beforeNativeSurfaceArrivalOrder(file:string,source:string):string {
 if(file!==row.file)return source;let text=source.replace(/\r\n?/g,'\n');
 for(const h of [...row.hunks].reverse()){if(text.split(h.after).length!==2)throw Error('Missing or ambiguous surface arrival hunk');text=text.replace(h.after,h.before);}return text;
}
