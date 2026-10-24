import {nativeRealmContextArchive} from './nativeRealmContextArchive';
/** Strict outer layer; unknown edits outside the declared hunks survive. */
export function beforeNativeRealmContext(file:string,source:string):string {const row=nativeRealmContextArchive.find(row=>row.file===file);if(!row) return source;let text=source.replace(/\r\n?/g,'\n');for(const h of [...row.hunks].reverse()){if(text.split(h.after).length!==2)throw Error('Missing or ambiguous native realm hunk: '+file);text=text.replace(h.after,h.before);}return text;}
