import {nativeAreaUIActionArchive as archive} from './nativeAreaUIActionArchive';
/** Only exact reviewed action hunks reverse; unrelated drift remains visible. */
export function beforeNativeAreaUIActions(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(row=>row.file===file);if(!row)return source;for(const h of [...row.hunks].reverse()){if(source.split(h.after).length!==2)throw Error('Native UI action exact source hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}
