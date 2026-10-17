import {nativeArrivalMainCastFS as fs} from './nativeArrivalCompositionFixture';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as cp from 'node:child_process';
import ts from 'typescript';
import {nativeSceneCombatKernelArchive as archive} from './nativeSceneCombatKernelArchive';
import {beforeNativeCombatKernelHooks,assertNativeCombatHookHost} from './nativeCombatKernelHooksFixture';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const must=(ok:unknown,why:string)=>{if(!ok)throw new Error(why);};
const root=process.cwd();
const texts=new Map(['Casting','Resolution','Spawning','Events'].map(group=>[group,beforeNativeCombatKernelHooks(group,fs.readFileSync(path.join(root,'src/engine/nativeSceneCombat'+group+'.ts'),'utf8'))]));
assertNativeCombatHookHost(fs.readFileSync(path.join(root,'src/engine/nativeSceneCombatHost.ts'),'utf8'));
function scanReplace(source:string):string {
 const prefix='class Original {\n', parsed=ts.createSourceFile('receiver.ts',prefix+source+'\n}',ts.ScriptTarget.Latest,true);
 const changes:{start:number;end:number}[]=[];
 function inspect(node:ts.Node):void {
  if(node.kind===ts.SyntaxKind.ThisKeyword||(ts.isIdentifier(node)&&node.text==='this'))changes.push({start:node.getStart(parsed)-prefix.length,end:node.end-prefix.length});
  ts.forEachChild(node,inspect);
 }
 inspect(parsed);
 for(const c of changes.sort((a,b)=>b.start-a.start))source=source.slice(0,c.start)+'nativeHost'+source.slice(c.end);
 return source;
}
function expected(row:typeof archive.methods[number]):string {
 const source=scanReplace(row.source),sf=ts.createSourceFile('original.ts','class Original {\n'+source+'\n}',ts.ScriptTarget.Latest,true),cls=sf.statements.find(ts.isClassDeclaration)!;
 const method=cls.members.find(ts.isMethodDeclaration)!;
 let result='export function '+row.fn+source.slice(method.name.end-method.getStart(sf));
 const at=result.indexOf('(')+1;
 return result.slice(0,at)+'nativeHost: NativeSceneCombatHost'+(method.parameters.length?', ':'')+result.slice(at);
}
const parse=(text:string)=>ts.createSourceFile('core.ts',text,ts.ScriptTarget.Latest,true);
function checkFunction(text:string,row:typeof archive.methods[number]) {
 const sf=parse(text),matches=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===row.fn);
 must(matches.length===1,'Exact function count '+row.fn);
 const actual=matches[0].getText(sf),want=expected(row);
 if(actual!==want){let i=0;while(actual[i]===want[i]&&i<actual.length)i++;throw new Error('Exact native function '+row.fn+' at '+i+' actual '+JSON.stringify(actual.slice(i-40,i+90))+' expected '+JSON.stringify(want.slice(i-40,i+90)));}
 must(sha(row.source)===row.sourceSha256&&sha(actual)===row.outputSha256,'Archive hashes '+row.fn);
}
function helperText(text:string,name:string):string[] {
 const sf=parse(text),found:string[]=[];
 for(const n of sf.statements){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found.push(n.getText(sf));if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(sf)===name))found.push(n.getText(sf));}
 return found;
}
let mutation=0,duplicate=0;
for(const row of archive.methods){
 const text=texts.get(row.group)!;checkFunction(text,row);
 for(const changed of [text.replace(row.output,row.output+'\n'+row.output),text.replace(row.output,row.output.replace('{','{/* source mutation */'))]){
  let refused=false;try{checkFunction(changed,row);}catch{refused=true;}must(refused,'Mutation/duplicate must refuse '+row.fn);
 }
 mutation++;duplicate++;
}
for(const row of archive.helpers){
 const found=helperText(texts.get(row.group)!,row.name);
 must(found.length===1,'Helper count '+row.name);
 must(found[0]===row.output&&sha(row.source)===row.sourceSha256,'Exact helper '+row.name);
 must(row.output===(row.name==='PROC_INDEX'||row.source.startsWith('export ')?row.source:'export '+row.source),'Only export added '+row.name);
}
const ground=fs.readFileSync(path.join(root,'src/engine/nativeSceneGroundFollowUps.ts'),'utf8');
for(const helper of archive.externalHelpers){const found=helperText(ground,helper.name);must(found.length===1&&found[0]==='export '+helper.source,'Shared exact phase43 helper '+helper.name);}
const gitWorld=cp.execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
must(sha(gitWorld)===archive.worldSha256,'Complete immutable World hash');
const sf=parse(gitWorld),world=sf.statements.find((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='World')!;
for(const row of archive.methods){const matches=world.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(sf)===row.name);must(matches.length===1&&matches[0].getText(sf)===row.source,'Immutable original '+row.name);}
for(const row of archive.helpers)must(helperText(gitWorld,row.name)[0]===row.source,'Immutable original helper '+row.name);
const report={status:'pass',pin:archive.pin,worldSha256:archive.worldSha256,methods:archive.methods.length,helpers:archive.helpers.length,sharedHelpers:archive.externalHelpers.length,mutationsRefused:mutation,duplicatesRefused:duplicate,scope:'Exact audited hook reversal to pure149 and immutable-source proof; runtime lifetime behavior requires the actual aggregate acceptance.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativecombatkernelsource.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

