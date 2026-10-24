import {createHash} from 'node:crypto';
import {nativeRescueAnchorArchive as row} from './nativeRescueAnchorArchive';
const hash=(s:string)=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex');
/** One reviewed whole-file successor only; preserve raw line endings and all
 * prior readers. Unknown mutations cannot enter the historical parent lane. */
export function beforeNativeRescueAnchor(file:string,source:string):string {
 if(file!==row.file)return source;
 const actual=hash(source);if(actual===row.beforeSha256)return source;
 if(actual!==row.afterSha256)throw Error('Unknown native rescue anchor source: '+file);
 if(source.split(row.after).length!==2)throw Error('Ambiguous native rescue anchor delta');
 const parent=source.replace(row.after,row.before);
 if(hash(parent)!==row.beforeSha256)throw Error('Native rescue anchor parent mismatch');
 return parent;
}
