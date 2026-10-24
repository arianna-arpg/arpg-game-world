import assert from 'node:assert/strict';
import ts from 'typescript';
import {writeFileSync,mkdirSync} from 'node:fs';
import {NATIVE_HOSTED_PUBLICATION_ARCHIVE as archive} from './nativeHostedPublicationArchive';
import {beforeNativeHostedPublication,hostedLF,hostedHash,currentNativeHostedSource as read} from './nativeHostedPublicationFixture';
const emit=(text:string)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
let mutations=0,duplicates=0,outside=0,portable=0;const emits:{file:string;sha256:string}[]=[];
for(const row of archive.rows){const current=read(row.file);assert.equal(beforeNativeHostedPublication(row.file,current),row.before);
 for(const variant of [hostedLF(current),hostedLF(current).replace(/\n/g,'\r\n'),hostedLF(current).replace(/\n/g,(()=>{let i=0;return()=>i++%2?'\r\n':'\n';})())]){assert.equal(beforeNativeHostedPublication(row.file,variant),row.before);portable++;}
 for(const hunk of row.hunks){assert.throws(()=>beforeNativeHostedPublication(row.file,row.after.replace(hunk.after,hunk.after+'/* changed native source */')),/Unknown|Incomplete/);mutations++;assert.throws(()=>beforeNativeHostedPublication(row.file,row.after.replace(hunk.after,hunk.after+hunk.after)),/Unknown|Incomplete/);duplicates++;}
 assert.throws(()=>beforeNativeHostedPublication(row.file,row.after+'\n/* outside known hunk */'),/Unknown/);outside++;
 if(['src/engine/shardRoads.ts','src/net/journalWire.ts','src/net/partyReads.ts','src/net/seatView.ts','src/net/transport.ts','src/world/mapMarkers.ts','src/worldmass/quests.ts'].includes(row.file)){assert.equal(emit(row.after),emit(row.before),row.file+' executable type-only identity');emits.push({file:row.file,sha256:hostedHash(emit(row.after))});}
 if(row.file==='src/net/snapshot.ts'){
  let narrowed=row.after.replace('w.encounterCue = nativeWireEncounter(world,a);','w.encounterCue = encounterCueOf(a, world);').replace('world.shardWorld ? nativeWireRoad(world,s) : undefined','world.shardWorld ? roadDwellRow(world, s) : undefined');
  const marker='\n/** The retained adapter supplies the real identity-keyed planner and road owner. */';assert.equal(narrowed.split(marker).length,2);narrowed=narrowed.slice(0,narrowed.indexOf(marker));assert.equal(emit(narrowed),emit(row.before),'serializer runtime changes are exactly two optional real-owner identity seams');emits.push({file:row.file,sha256:hostedHash(emit(narrowed))});
 }
}
for(const row of archive.fresh)assert.equal(hostedHash(read(row.file)),row.sha256,row.file);
const world=hostedLF(read('src/engine/world.ts'));assert.equal(hostedHash(world),archive.worldSha256,'complete untouched immutable World');const source=ts.createSourceFile('world.ts',world,ts.ScriptTarget.Latest,true),cls=source.statements.find((x):x is ts.ClassDeclaration=>ts.isClassDeclaration(x)&&x.name?.text==='World')!;
const core=hostedLF(read('src/engine/nativeSceneWireQueries.ts')),coreSource=ts.createSourceFile('core.ts',core,ts.ScriptTarget.Latest,true);let exactBodies=0;
for(const row of archive.native){const method=cls.members.find((x):x is ts.MethodDeclaration=>ts.isMethodDeclaration(x)&&x.name.getText(source)===row.name)!;assert.equal(method.getText(source),row.source,'archived whole native method '+row.name);const fn=coreSource.statements.find((x):x is ts.FunctionDeclaration=>ts.isFunctionDeclaration(x)&&x.name?.text==='scene'+row.name[0].toUpperCase()+row.name.slice(1))!;let body=method.body!.getText(source);const edits:{start:number;end:number}[]=[];const visit=(n:ts.Node)=>{if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push({start:n.getStart(source)-method.body!.getStart(source),end:n.getEnd()-method.body!.getStart(source)});ts.forEachChild(n,visit);};visit(method.body!);for(const edit of edits.reverse())body=body.slice(0,edit.start)+'host'+body.slice(edit.end);assert.equal(fn.body!.getText(coreSource),body,row.name+' only AST this-to-host');exactBodies++;}
const result={base:archive.base,existingFiles:archive.rows.length,newFiles:archive.fresh.length,exactBodies,mutations,duplicates,outside,portable,identicalExecutableModules:emits};mkdirSync('balance/reports',{recursive:true});writeFileSync('balance/reports/native-hosted-source.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
