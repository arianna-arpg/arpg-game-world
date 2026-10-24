import {createHash} from 'node:crypto';
import {nativeLiveSiteArchive as archive} from './nativeLiveSiteArchive';
export function beforeNativeLiveSite(file:string,input:string):string {
 let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);
 if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;
 for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native live site exact hunk refused: '+file);source=source.replace(h.after,h.before);}
 return source;
}
