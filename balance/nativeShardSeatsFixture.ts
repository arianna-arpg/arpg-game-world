import {createHash} from 'node:crypto';
import {nativeShardSeatsArchive as archive} from './nativeShardSeatsArchive';
const rows=new Map<string,typeof archive.rows[number]>(archive.rows.map(r=>[r.file,r])),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Only the reviewed whole current file or its exact predecessor can enter old readers. */
export function beforeNativeShardSeats(file:string,input:string):string {const row=rows.get(file);if(!row)return input;const digest=hash(input.replace(/\r\n/g,'\n'));if(digest!==row.normalizedBefore&&digest!==row.normalizedAfter)throw Error('Native shard seat source differs from reviewed whole file: '+file);return row.before;}
