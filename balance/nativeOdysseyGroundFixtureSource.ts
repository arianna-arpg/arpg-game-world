import {createHash} from 'node:crypto';
import {nativeOdysseyGroundArchive as archive} from './nativeOdysseyGroundArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeOdysseyGround(file:string,input:string):string{let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||hash(source)===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native ground exact unique hunk refused: '+file);source=source.replace(h.after,h.before);}if(hash(source)!==row.beforeHash)throw Error('Native ground unknown outside source refused: '+file);return source;}
