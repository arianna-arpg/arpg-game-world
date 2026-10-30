import {createHash} from 'node:crypto';
import {nativeShardKeeperArchive as row} from './nativeShardKeeperArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),norm=(s:string)=>s.replace(/\r\n/g,'\n');
/** The original client/resume reader may consume only its exact full predecessor. */
export function beforeNativeShardKeeper(file:string,source:string):string{
 if(file!==row.file)return source;let text=norm(source),digest=hash(text);if(digest===row.normalizedBefore)return row.before;if(digest!==row.normalizedAfter)throw Error('Native keeper source differs from the reviewed whole file');
 for(const edit of [...row.edits].reverse()){if(text.split(edit.after).length!==2)throw Error('Native keeper source delta is not unique');text=text.replace(edit.after,edit.before);}if(hash(text)!==row.normalizedBefore)throw Error('Native keeper did not restore the original character owner');return row.before;
}