import {createHash} from 'node:crypto';
import {nativeSceneCombatMotionHooksArchive as a} from './nativeSceneCombatMotionHooksArchive';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function beforeNativeCombatMotionHooks(source:string):string {
 if(source!==a.afterSource||sha(source)!==a.afterSha256)throw Error('Native motion hook full source changed');
 for(const edit of [...a.edits].reverse()){
  if(source.split(edit.after).length!==2)throw Error('Native motion hook duplicate or changed');
  source=source.replace(edit.after,edit.before);
 }
 if(source!==a.beforeSource||sha(source)!==a.beforeSha256)throw Error('Native motion original full source changed');
 return source;
}
