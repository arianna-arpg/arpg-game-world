import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeMainProofSourceArchive as archive,nativeMainProofSourceArchiveHash} from './nativeMainProofSourceArchive';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
assert.equal(hash(JSON.stringify(archive)),nativeMainProofSourceArchiveHash,'Immutable main proof predecessor archive');
/** Only exact committed current/predecessor bytes can reach the old assertions. */
export function beforeNativeMainProofSource(lane:string,file:string,input:string):string {
 const row=archive.rows.find(row=>row.lane===lane&&row.file===file);
 if(!row)throw Error('Unknown native main proof predecessor: '+lane+' '+file);
 const source=input.replace(/\r\n?/g,'\n'),actual=hash(source),before=archive.blobs[row.beforeHash];
 if(actual===row.beforeHash&&source===before)return before;
 if(actual===row.afterHash&&source===archive.blobs[row.afterHash])return before;
 throw Error('Exact native main proof predecessor refused: '+lane+' '+file);
}
