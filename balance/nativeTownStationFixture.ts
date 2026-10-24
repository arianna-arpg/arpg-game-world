import {nativeTownStationArchive as archive} from './nativeTownStationArchive';
/** Reverse only the reviewed town successor; unknown outside changes survive. */
export function beforeNativeTownStations(file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row)return source;
 for(const h of [...row.hunks].reverse()){if(source.split(h.after).length!==2)throw Error('Native town exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;
}
