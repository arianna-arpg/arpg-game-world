import assert from 'node:assert/strict';
import {beforeNativeDirectorRetirement} from './nativeDirectorRetirementFixture';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeDirectorBirthSourceArchive as archive} from './nativeDirectorBirthSourceArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
assert.equal(hash(fs.readFileSync(new URL('./nativeDirectorBirthSourceArchive.ts',import.meta.url),'utf8')),'0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112','immutable extraction archive');
const original=execFileSync('git',['show',archive.pin+':src/engine/scenes.ts'],{encoding:'utf8'});assert.equal(hash(original),archive.nativeHash);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
assert.equal(emit(archive.predecessor),emit(original),'type-only predecessor equals committed Mu Director');
const inputSignature="export function sceneNoteCast(w: Pick<NativeSceneDirectorHost, 'scene'>): void {";
const priorSignature='export function sceneNoteCast(w: NativeSceneDirectorHost): void {';
function beforeInput(file:string,source:string):string {if(file!=='src/engine/scenes.ts')return source;source=beforeNativeDirectorRetirement(source);assert.equal(source.split(inputSignature).length,2,'exact input sceneNoteCast type projection');return source.replace(inputSignature,priorSignature);}
function reverse(file:typeof archive.files[number],source:string):string {
 assert.equal(hash(source),file.after,'exact Director successor '+file.file);
 for(const edit of [...file.edits].reverse()){assert.equal(source.split(edit.after).length,2,'exact extraction site');source=source.replace(edit.after,edit.before);}
 assert.equal(hash(source),file.before,'complete exact predecessor');return source;
}
let mutations=0,duplicates=0,currentMutations=0,currentDuplicates=0;
for(const file of archive.files){const raw=fs.readFileSync(new URL('../'+file.file,import.meta.url),'utf8'),current=beforeInput(file.file,raw),before=reverse(file,current);if(file.file==='src/engine/scenes.ts'){
 assert.equal(before,archive.predecessor);assert.equal(emit(beforeNativeDirectorRetirement(raw)),emit(current),'Input signature projection emits identical Director JavaScript');
 const retired=raw.replace('observeNativeCombatRetirement(w,w.actors)','observeNativeCombatRetirement(w,[w.actors[i]])');assert.notEqual(retired,raw);assert.throws(()=>beforeInput(file.file,retired));currentMutations++;assert.throws(()=>beforeInput(file.file,raw+'\nconst token=observeNativeCombatRetirement(w,w.actors);'));currentDuplicates++;
 const mutated=raw.replace(inputSignature,inputSignature.replace("'scene'","'player'"));assert.notEqual(mutated,raw,'nontrivial current signature mutation');assert.throws(()=>reverse(file,beforeInput(file.file,mutated)));currentMutations++;
 assert.throws(()=>reverse(file,beforeInput(file.file,raw+'\n'+inputSignature)));currentDuplicates++;
 const outside=raw+'\n/* unknown outside change */';assert.ok(beforeInput(file.file,outside).endsWith('/* unknown outside change */'));assert.throws(()=>reverse(file,beforeInput(file.file,outside)),/exact Director successor/);
}
 for(const edit of file.edits){assert.ok(current.includes(edit.after),'historical extraction hunk is present');assert.notEqual(current.replace(edit.after,edit.before),current,'nontrivial historical mutation');assert.throws(()=>reverse(file,current.replace(edit.after,edit.before)),/exact Director successor/);mutations++;assert.throws(()=>reverse(file,current+'\n'+edit.after),/exact Director successor/);duplicates++;}
 // EOL receipt: apply exactly the same extraction to the archived predecessor,
 // keeping intentional helper text intact; no unseen native statement is masked.
 let forward=before;for(const edit of file.edits){assert.equal(forward.split(edit.before).length,2);forward=forward.replace(edit.before,edit.after);}assert.equal(forward,current);
}
const report={currentMutations,currentDuplicates,inputEmitEqual:true,nativePin:archive.pin,muEmitEqual:true,files:archive.files.map(({file,after})=>({file,sha256:after})),mutations,duplicates};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativedirectorbirthsource.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
