import {createHash} from 'node:crypto';
import {nativeOdysseyPressureArchive as archive} from './nativeOdysseyPressureArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeOdysseyPressure(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||hash(source)===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native Odyssey unique exact source hunk refused: '+file);source=source.replace(h.after,h.before);}if(hash(source)!==row.beforeHash)throw Error('Native Odyssey unique exact outside source refused: '+file);return source;}

import {nativeOdysseyHistoricalRescueArchive as rescue} from './nativeOdysseyHistoricalRescueArchive';
export function beforeNativeOdysseyHistoricalRescue(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');if(file!==rescue.file||hash(source)===rescue.beforeHash)return source;for(const h of rescue.hunks){if(source.split(h.after).length!==2)throw Error('Exact historical rescue source hunk refused');source=source.replace(h.after,h.before);}if(hash(source)!==rescue.beforeHash)throw Error('Unknown historical rescue source');return source;}
