import {createHash} from 'node:crypto';
import {nativeShardMusterArchive as archive} from './nativeShardMusterArchive';
const rows=new Map<string,typeof archive.rows[number]>(archive.rows.map(r=>[r.file,r])),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Only the exact reviewed whole current file or its exact parent can reach an inherited reader. */
export function beforeNativeShardMuster(file:string,input:string):string{const row=rows.get(file);if(!row)return input;const h=hash(input.replace(/\r\n/g,'\n'));if(h!==row.normalizedBefore&&h!==row.normalizedAfter)throw Error('Native muster source differs from reviewed whole file: '+file);return row.before;}
