import {createHash} from 'node:crypto';
import {nativeSceneCombatRecordSelectionArchive as archive} from './nativeSceneCombatRecordSelectionArchive';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeCombatRecordSelection(source:string):string {
 if(sha(source)!==archive.afterSha256)throw Error('Complete selected-record successor hash');
 for(const edit of [...archive.edits].reverse()){const at=source.indexOf(edit.after);if(at<0||source.indexOf(edit.after,at+1)>=0)throw Error('Exact selected-record successor hunk');source=source.slice(0,at)+edit.before+source.slice(at+edit.after.length);}
 if(sha(source)!==archive.beforeSha256)throw Error('Complete selected-record predecessor hash');return source;
}
