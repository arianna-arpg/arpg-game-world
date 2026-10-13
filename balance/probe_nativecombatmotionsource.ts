import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import * as cp from 'node:child_process';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import {nativeSceneCombatMotionArchive as a} from './nativeSceneCombatMotionArchive';
import {nativeSceneCombatMotionHooksArchive as hooks} from './nativeSceneCombatMotionHooksArchive';
import {beforeNativeCombatMotionHooks} from './nativeCombatMotionHooksFixture';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const must=(ok:unknown,why:string)=>{if(!ok)throw Error(why);};
const parse=(s:string)=>ts.createSourceFile('proof.ts',s,ts.ScriptTarget.Latest,true);
const currentSource=fs.readFileSync('src/engine/nativeSceneCombatMotion.ts','utf8');
const source=beforeNativeCombatMotionHooks(currentSource);
let hookNegatives=0;for(const edit of hooks.edits){for(const mutated of [currentSource.replace(edit.after,edit.after+'/*mutation*/'),currentSource+'\n'+edit.after]){let refused=false;try{beforeNativeCombatMotionHooks(mutated);}catch{refused=true;}must(refused,'Exact retirement hook mutation/duplicate refusal');hookNegatives++;}}
const world=cp.execFileSync('git',['show',a.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:20*1024*1024});
must(sha(world)===a.worldSha256,'Immutable entire original World');
const original=parse(world),wc=original.statements.find((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='World')!;
function transformed(row:typeof a.methods[number]):string {
 const prefix='class Original {\n',sf=parse(prefix+row.source+'\n}'),cls=sf.statements.find(ts.isClassDeclaration)!;
 const n=cls.members.find(m=>ts.isMethodDeclaration(m)||ts.isGetAccessorDeclaration(m))!;
 const changes:{start:number;end:number}[]=[];
 function visit(n:ts.Node):void{if(n.kind===ts.SyntaxKind.ThisKeyword)changes.push({start:n.getStart(sf)-prefix.length,end:n.end-prefix.length});ts.forEachChild(n,visit);}visit(n);
 let out:string=row.source;for(const c of changes.sort((a,b)=>b.start-a.start))out=out.slice(0,c.start)+'host'+out.slice(c.end);
 out='export function '+row.fn+out.slice(n.name!.end-n.getStart(sf));const at=out.indexOf('(')+1;
 return out.slice(0,at)+'host:NativeSceneCombatMotionHost'+((n as ts.MethodDeclaration).parameters.length?', ':'')+out.slice(at);
}
function check(text:string,row:typeof a.methods[number]):void {const sf=parse(text),found=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===row.fn);must(found.length===1,'Exact function count '+row.fn);const out=found[0].getText(sf);must(out===transformed(row)&&sha(out)===row.outputSha256,'Exact AST-only receiver extraction '+row.fn);}
let mutation=0,duplicate=0;
for(const row of a.methods){const n=wc.members.filter(n=>n.name?.getText(original)===row.name&&(ts.isMethodDeclaration(n)||ts.isGetAccessorDeclaration(n)));must(n.length===1&&n[0].getText(original)===row.source&&sha(row.source)===row.sourceSha256,'Immutable native member '+row.name);check(source,row);for(const s of [source.replace(row.output,row.output.replace('{','{/* mutation */')),source+'\n'+row.output]){let refused=false;try{check(s,row);}catch{refused=true;}must(refused,'Mutation/duplicate refusal '+row.name);}mutation++;duplicate++;}
const variable=(sf:ts.SourceFile,name:string)=>sf.statements.filter((n):n is ts.VariableStatement=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(sf)===name)).map(n=>n.getText(sf));
for(const row of a.helpers){must(variable(original,row.name)[0]===row.source,'Immutable helper '+row.name);const found=variable(parse(source),row.name);must(found.length===1&&found[0]===row.output&&row.output===(row.source.startsWith('export ')?row.source:'export '+row.source),'Exact exported helper '+row.name);}
for(const row of a.fields){const n=wc.members.find(n=>ts.isPropertyDeclaration(n)&&n.name.getText(original)===row.name) as ts.PropertyDeclaration;must(n.getText(original)===row.source&&n.initializer?.getText(original)===row.initializer,'Exact field initializer '+row.name);}
must(source===a.outputSource&&sha(source)===a.outputSha256,'Entire source guard, including imports/host/state factory');
const report={status:'pass',pin:a.pin,worldSha256:a.worldSha256,methods:a.methods.length,helpers:a.helpers.length,initializers:a.fields.length,sourceSha256:sha(source),mutationRefusals:mutation,duplicateRefusals:duplicate,hookNegatives,scope:'Pure native movement closure source proof; actual aggregate ownership, removal lifetimes and behavior remain separate obligations.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativecombatmotionsource.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
