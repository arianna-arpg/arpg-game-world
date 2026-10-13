import {beforeNativeLocalInputFinal as projectFinal} from './nativeLocalInputFinalFixture';
import {createHash} from 'node:crypto';
import {nativeLocalInputArchive as archive} from './nativeLocalInputArchive';
export function beforeNativeLocalInputOnly(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=[...archive.files,...archive.proofRows].find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native local input exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeLocalInput(file:string,input:string):string {return beforeNativeLocalInputOnly(file,projectFinal(file,input));}
