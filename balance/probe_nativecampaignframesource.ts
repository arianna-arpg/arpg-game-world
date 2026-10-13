import {beforeNativeClientStartActions as projectActions} from './nativeClientStartActionsCompositionFixture';
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeCampaignFrameArchive as archive} from './nativeSceneCampaignFrameArchive';
import {nativeCampaignFrameAttendanceArchive as attendance} from './nativeSceneCampaignFrameAttendanceArchive';
const lf=(s:string)=>s.replace(/\r\n/g,'\n'),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const native=execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
assert.equal(hash(native),archive.worldHash,'Immutable native World');
const worldTree=ts.createSourceFile('world.ts',native,ts.ScriptTarget.Latest,true);
const world=worldTree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const update=world.members.find(n=>n.name?.getText(worldTree)==='update') as ts.MethodDeclaration;
for(const row of archive.groups){
 const selected=update.body!.statements.slice(row.from,row.to+1);
 assert.equal(native.slice(selected[0].getFullStart(),selected.at(-1)!.end),row.before,row.name+' original statements');
 let transformed:string=row.before;
 for(const edit of [...row.edits].sort((a,b)=>Number(b[0])-Number(a[0])))transformed=transformed.slice(0,Number(edit[0]))+edit[2]+transformed.slice(Number(edit[1]));
 for(const seam of row.seams){assert.equal(transformed.split(seam.from).length,2);transformed=transformed.replace(seam.from,seam.to);}
 const tree=ts.createSourceFile(row.name,row.after,ts.ScriptTarget.Latest,true),fn=tree.statements[0] as ts.FunctionDeclaration;
 const body=row.after.slice(fn.body!.getStart(tree)+1,fn.body!.end-1);
 const endings:Record<string,string>={Begin:'return {dt,rawDt,doorPressIntents};',Clock:'return true;',PendingTransitions:'return true;',WorldRole:'return unitWorld;'};
 assert.equal(body,transformed+(endings[row.name]?'\n    '+endings[row.name]:'')+'\n',row.name+' exact transformed statements');
}
for(const cut of archive.partitions){
 const oldTree=ts.createSourceFile(cut.name,cut.before,99,true),oldFn=oldTree.statements[0] as ts.FunctionDeclaration;
 assert.equal(oldFn.body!.statements.length,cut.steps.length);
 const current=archive.files[0].functions.find(f=>f.name===cut.functionName)!;assert.equal(current.source,cut.after);
 const tree=ts.createSourceFile(cut.name,cut.after,99,true),fn=tree.statements[0] as ts.FunctionDeclaration;assert.equal(fn.body!.statements.length,cut.steps.length);
 for(let i=0;i<cut.steps.length;i++){const step=cut.steps[i],originalStatement=oldFn.body!.statements[i];assert.equal(cut.before.slice(originalStatement.getFullStart(),originalStatement.end),step.body,'unchanged statement '+step.index);assert.equal(fn.body!.statements[i].getText(tree),'steps.'+step.name+'('+step.args+');','exact phase dispatch '+step.index);const core=archive.files[2].functions.find(f=>f.name===step.name)!;assert.equal(core.source,step.source);const st=ts.createSourceFile(step.name,step.source,99,true),sf=st.statements[0] as ts.FunctionDeclaration;assert.equal(sf.body!.statements.length,1);assert.equal(step.source.slice(sf.body!.getStart(st)+1,sf.body!.end-1),step.body+'\n');}
}
const roads=execFileSync('git',['show',archive.pin+':src/engine/shardRoads.ts'],{encoding:'utf8'}),roadTree=ts.createSourceFile('roads.ts',roads,ts.ScriptTarget.Latest,true);
const road=roadTree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scanShardRoads')!;
assert.equal(road.getText(roadTree),archive.road.before,'Immutable native road scan');
let expectedRoad:string=archive.road.before.replace('scanShardRoads(w: World)','scanNativeSceneRoads(w:NativeSceneRoadScanHost,state:NativeSceneRoadState)');
for(const seam of archive.road.seams){assert.equal(expectedRoad.split(seam.from).length,2);expectedRoad=expectedRoad.replace(seam.from,seam.to);}
assert.equal(expectedRoad,archive.road.after);
function normalizeRoadTypes(file:string,source:string):string {source=lf(source);if(file!=='src/engine/nativeSceneRoadScan.ts')return source;assert.equal(hash(source),'31871ba94bac5f00cb897d4ba3e39272b0b20aa649c6e740224e52784782b8cd','exact road directory type successor');const before=source.replace("import type {NativeAreaDirectoryView} from '../worldmass/nativeAreaDirectoryView';\n",'').replaceAll("ShardWorldLink<NativeAreaRoadDestination,NativeAreaDirectoryView>",'ShardWorldLink<NativeAreaRoadDestination>');assert.equal(hash(before),'5a180941431bb4e5273e8e0559014094eac9c3d2fcc3753d8c292e65d4284b93');assert.equal(ts.transpileModule(source,{compilerOptions:{target:99,module:99}}).outputText,ts.transpileModule(before,{compilerOptions:{target:99,module:99}}).outputText);return before;}
function normalizeAttendance(file:string,source:string):string{source=lf(source);if(file!==attendance.file)return source;assert.equal(hash(source),attendance.afterHash,'exact attendance successor');const pending=[...attendance.edits];while(pending.length){const edit=pending.pop()!;assert.equal(source.split(edit.after).length,2+pending.filter(row=>row.after===edit.after).length,'exact attendance site');source=source.replace(edit.after,edit.before);}assert.equal(hash(source),attendance.beforeHash,'exact attendance predecessor');return source;}
function check(file:string,source:string):void{
 const reference=archive.files.find(f=>f.file===file)!;source=lf(source);
 assert.equal(hash(source),reference.sha256,'exact native frame module '+file);
 const tree=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),functions=tree.statements.filter(ts.isFunctionDeclaration);
 assert.equal(functions.length,reference.functions.length);
 for(const row of reference.functions){const matches=functions.filter(n=>n.name?.text===row.name);assert.equal(matches.length,1);assert.equal(matches[0].getText(tree),row.source);}
}
let mutations=0,duplicates=0;
for(const file of archive.files){
 const raw=projectActions('startMenus',file.file,fs.readFileSync(new URL('../'+file.file,import.meta.url),'utf8')),current=normalizeAttendance(file.file,normalizeRoadTypes(file.file,raw));check(file.file,current);check(file.file,normalizeAttendance(file.file,normalizeRoadTypes(file.file,lf(raw).replaceAll('\n','\r\n'))));
 if(file.file===attendance.file){for(let index=0;index<attendance.edits.length;index++){const edit=attendance.edits[index];let mutant=current;for(let step=0;step<attendance.edits.length;step++){const row=attendance.edits[step];if(step!==index)mutant=mutant.replace(row.before,row.after);}assert.notEqual(mutant,lf(raw),'real omitted seam');assert.throws(()=>normalizeAttendance(file.file,mutant),/exact attendance successor/);assert.throws(()=>normalizeAttendance(file.file,raw+'\n'+edit.after),/exact attendance successor/);}}
 for(const row of file.functions){assert.equal(current.split(row.source).length,2);const changed=row.source.replace(/\b(nativeFrame|w|steps)\./,'unauthorizedNativeOwner.');assert.notEqual(changed,row.source);assert.throws(()=>check(file.file,current.replace(row.source,changed)),/exact native frame module/);mutations++;assert.throws(()=>check(file.file,current+'\n'+row.source),/exact native frame module/);duplicates++;}
}
const report={ownershipSeamMutations:attendance.edits.length,ownershipSeamDuplicates:attendance.edits.length,statementGroups:archive.groups.length,nativeRoadScans:1,mutations,duplicates,files:archive.files.map(({file,sha256})=>({file,sha256}))};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativecampaignframesource.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
