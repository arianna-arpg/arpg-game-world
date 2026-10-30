import {createHash} from 'node:crypto';
import {nativeCouchJoinLifetimeArchive as archive} from './nativeCouchJoinLifetimeArchive';
export function beforeNativeCouchJoinLifetime(input:string):string {
 let source=input.replaceAll('\r\n','\n');
 if(createHash('sha256').update(source).digest('hex')===archive.beforeHash)return source;
 for(const h of [...archive.hunks].reverse()){
  if(source.split(h.after).length!==2)throw Error('Native couch join exact lifetime hunk refused');
  source=source.replace(h.after,h.before);
 }
 return source;
}
