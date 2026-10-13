import {beforeNativeTownLocalInput as projectTownInput} from './nativeTownLocalInputCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeLocalInputFinalArchive as archive} from './nativeLocalInputFinalArchive';
export function beforeNativeLocalInputFinalOnly(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native local input final exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeLocalInputFinal(file:string,input:string):string {return beforeNativeLocalInputFinalOnly(file,projectTownInput('input',file,input));}
