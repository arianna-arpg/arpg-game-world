/** Reverse only exact ground/follow-up integration before older guards. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeSceneGroundFollowUpsIntegrationArchive as archive,nativeSceneGroundFollowUpsIntegrationArchiveHash} from './nativeSceneGroundFollowUpsIntegrationArchive';
assert.equal(createHash('sha256').update(JSON.stringify(archive)).digest('hex'),nativeSceneGroundFollowUpsIntegrationArchiveHash,'immutable ground follow-up integration archive');
export function beforeNativeSceneGroundFollowUps(source:string):string {
 let text=source.replaceAll('\r\n','\n');
 for(const row of [...archive.integration].reverse()){assert.equal(text.split(row.after).length,2,'unique exact native ground follow-up integration: '+row.name);text=text.replace(row.after,row.before);}
 return text;
}

/** Preserve older exact mutation controls after this layer moves their source.
 * Overlaps target a byte inside a complete new hunk; unaffected controls retain
 * their original mutant. Full source reconstruction prevents vanished replaces. */
export function groundFollowUpsHistoricalHunk(raw:string,historical:string,mutated:string,legacy:RegExp){
 let text=beforeNativeSceneGroundFollowUps(raw),start=text.indexOf(historical),end=start+historical.length,overlap=false;
 assert.equal(text.split(historical).length,2,'unique older ground integration control');assert.notEqual(historical,mutated);
 for(const edit of archive.integration){const at=text.indexOf(edit.before),stop=at+edit.before.length,delta=edit.after.length-edit.before.length;assert.equal(text.split(edit.before).length,2,'exact ground forward source');
  if(stop<=start){start+=delta;end+=delta;}else if(at<end){start=Math.min(start,at);end=Math.max(end,stop)+delta;overlap=true;}
  text=text.slice(0,at)+edit.after+text.slice(stop);
 }
 assert.equal(text,raw.replaceAll('\r\n','\n'),'whole current source after exact ground forward mapping');const mapped=text.slice(start,end);
 if(!overlap){assert.equal(mapped,historical);return{text:mapped,mutated,guard:legacy};}
 const edit=archive.integration.find(edit=>mapped.includes(edit.after));assert.ok(edit,'overlap includes complete ground after-hunk');const at=mapped.indexOf(edit.after)+edit.after.search(/[A-Za-z]/);assert.ok(at>=0);return{text:mapped,mutated:mapped.slice(0,at)+'!'+mapped.slice(at+1),guard:/unique exact native ground follow-up integration/};
}
