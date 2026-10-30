import assert from 'node:assert/strict';
import ts from 'typescript';
import {nativeSceneInputArchive as archive} from './nativeSceneInputArchive';
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
function once(s:string,a:string,b:string):string{assert.equal(s.split(a).length,2,'exact declared input seam');return s.replace(a,b);}
export function expectedNativeInput():string{
 let source=archive.module as string;const sf=ts.createSourceFile('input.ts',source,ts.ScriptTarget.Latest,true),fn=sf.statements.find((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text==='sceneApplyInputs')!;
 const rows=fn.body!.statements;assert.equal(rows.length,4);assert(ts.isForOfStatement(rows[2]));const loop=rows[2].statement.getText(sf);
 source+='\nexport function sceneInputBegin(nativeHost:NativeSceneInputHost,dt:number):void {\n'+rows.slice(0,2).map(n=>n.getText(sf)).join('\n')+'\n}\nexport function sceneInputSeat(nativeHost:NativeSceneInputHost,selected:Seat,inputs:Map<string,PlayerInput>,dt:number):void {\nfor(const seat of [selected]) '+loop.replaceAll('a === nativeHost.player','a === nativeHost.localSeat.actor')+'\n}\nexport function sceneInputEnd(nativeHost:NativeSceneInputHost):void {\n'+rows[3].getText(sf)+'\n}\n';
 source="import {observeNativeCombatRecord} from './nativeCombatRecordObservation';\n"+source;
 source=once(source,
  `      nativeHost.pendingMetas.push({
        caster, host, skillId: metas[i].skillId,
        aim: vec(aim.x, aim.y), timer: META_CHAIN_INTERVAL * i,
      });`,
  `      let nativeStorage: NativeSceneInputHost['pendingMetas'];
      let nativeRecord: NativeSceneInputHost['pendingMetas'][number];
      (nativeStorage = nativeHost.pendingMetas).push(nativeRecord = {
        caster, host, skillId: metas[i].skillId,
        aim: vec(aim.x, aim.y), timer: META_CHAIN_INTERVAL * i,
      });
      observeNativeCombatRecord(nativeHost,'pendingMetas',nativeStorage,nativeRecord,caster,host);`);
 return source;
}
export function assertNativeInputSource(source:string):void{
 const expected=expectedNativeInput(),sf=ts.createSourceFile('input.ts',source,ts.ScriptTarget.Latest,true),original=ts.createSourceFile('input.ts',expected,ts.ScriptTarget.Latest,true);
 const functions=sf.statements.filter(ts.isFunctionDeclaration),wanted=original.statements.filter(ts.isFunctionDeclaration);assert.equal(functions.length,14,'exact input bodies and native partitions');
 for(const fn of wanted){const matches=functions.filter(n=>n.name?.text===fn.name!.text);assert.equal(matches.length,1,'unique native input function '+fn.name!.text);assert.equal(emit(matches[0].getText(sf)),emit(fn.getText(original)),'exact input function '+fn.name!.text);}
 assert.equal(emit(source),emit(expected),'no undeclared native input runtime changes');
}
