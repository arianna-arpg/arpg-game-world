import {nativeFramePhysicalSeatsArchive as archive} from './nativeFramePhysicalSeatsArchive';
import {createHash} from 'node:crypto';const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeFramePhysicalSeats(file:string,source:string):string {const row=archive.rows.find(r=>r.file===file);if(!row)return source;if(source!==row.after||sha(source)!==row.afterSha256)throw Error('Exact frame physical-seat successor changed: '+file);if(sha(row.before)!==row.beforeSha256)throw Error('Exact frame physical-seat predecessor changed');return row.before;}
