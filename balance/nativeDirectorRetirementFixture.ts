import assert from 'node:assert/strict';
export function beforeNativeDirectorRetirement(source:string):string {
 const before="const token=observeNativeCombatRetirement(w,[w.actors[i]]);",after="const token=observeNativeCombatRetirement(w,w.actors);";
 assert.equal(source.split(after).length,2,'exact current Director retirement census seam');
 assert.equal(source.split(before).length,1,'obsolete Director singleton retirement seam absent');
 return source.replace(after,before);
}
