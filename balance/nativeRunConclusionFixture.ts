import {nativeRunConclusionArchive as archive} from './nativeRunConclusionArchive';
/** Only exact reviewed conclusion hunks reverse; unrelated drift remains visible. */
export function beforeNativeRunConclusion(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(row=>row.file===file);if(!row)return source;for(const h of [...row.hunks].reverse()){if(source.split(h.after).length!==2)throw Error('Native run conclusion exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}
