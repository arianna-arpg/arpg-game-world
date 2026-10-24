import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeBirthLifetimeSourceArchive as archive,nativeBirthLifetimeSourceArchiveHash} from './nativeBirthLifetimeSourceArchive';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
assert.equal(hash(JSON.stringify(archive)),nativeBirthLifetimeSourceArchiveHash,'Immutable birth lifetime source predecessor archive');
/** Recognize only the exact accepted current or already reconstructed predecessor. */
export function beforeNativeBirthLifetimeSource(file:string,input:string):string {
 const row=archive.files.find(candidate=>candidate.file===file);
 if(!row)throw Error('Unknown native birth lifetime predecessor source: '+file);
 const source=input.replace(/\r\n?/g,'\n'),actual=hash(source);
 if(actual===row.afterHash&&source===row.afterSource)return row.beforeSource;
 if(actual===row.beforeHash&&source===row.beforeSource)return row.beforeSource;
 throw Error('Exact native birth lifetime predecessor source refused: '+file);
}
