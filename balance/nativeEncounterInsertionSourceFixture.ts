import {createHash} from 'node:crypto';
import {nativeEncounterInsertionSourceArchive as archive} from './nativeEncounterInsertionSourceArchive';
export function beforeNativeEncounterInsertion(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native encounter arrival exact hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}
