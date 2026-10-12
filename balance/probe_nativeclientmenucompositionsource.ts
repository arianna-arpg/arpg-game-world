import {beforeNativeClientStartMenuProof} from './nativeClientStartMenuCompositionFixture';
import {beforeNativeClientStartMenus as projectStartMenu} from './nativeClientStartMenuCompositionFixture';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeClientMenuCompositionArchive as archive} from './nativeClientMenuCompositionArchive';
import {beforeNativeClientMenusOnly as project} from './nativeClientMenuCompositionFixture';
import {writeCombatProof} from './probe_nativecombatcycle';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0;const rows=[];
for(const lane of ['client','menu'] as const)for(const row of archive.lanes[lane]){
 const source=projectStartMenu('clientMenu',row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\r\n','\n');assert.equal(hash(source),row.afterHash,'actual complete combined runtime');assert.equal(hash(project(lane,row.file,source)),row.beforeHash,'complete frozen parent');let line=0;
 for(const form of [source,source.replaceAll('\n','\r\n'),source.replace(/\n/g,()=>++line%2?'\r\n':'\n')]){assert.equal(hash(project(lane,row.file,form)),row.beforeHash);portable++;}
 for(const h of row.hunks){const changed=source.replace(h.after,h.after.replace(/\S/,'!'));assert.notEqual(changed,source);assert.throws(()=>project(lane,row.file,changed),/exact composition hunk refused/);mutations++;assert.throws(()=>project(lane,row.file,source.replace(h.after,h.after+h.after)),/exact composition hunk refused/);duplicates++;}
 const marker='\n// outside unreviewed client/menu edit\n';const extended=project(lane,row.file,source+marker);assert.ok(extended.endsWith(marker));assert.notEqual(hash(extended),row.beforeHash);outside++;rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,hunks:row.hunks.length});
}
const printer=ts.createPrinter({removeComments:true});function assertions(text:string):string[]{const sf=ts.createSourceFile('proof.ts',text,ts.ScriptTarget.Latest,true),out:string[]=[];const visit=(n:ts.Node)=>{if(ts.isCallExpression(n)&&/^(assert\.|assert\()/.test(n.getText(sf)))out.push(printer.printNode(ts.EmitHint.Unspecified,n,sf));ts.forEachChild(n,visit);};visit(sf);return out;}
const preserved={client:0,menu:0};for(const row of archive.historical){const actual=assertions(beforeNativeClientStartMenuProof(row.file,readFileSync(new URL('../'+row.file,import.meta.url),'utf8')));let at=0;for(const statement of actual)if(statement===row.assertions[at])at++;assert.equal(at,row.assertions.length,row.lane+':'+row.file+' unchanged original assertions');preserved[row.lane]+=at;}assert.deepEqual(preserved,{client:90,menu:77});
const result={files:rows.length,mutations,duplicates,portable,outside,preserved,rows},report={scope:'Exact dual projection of the actual merged client/menu runtime to both immutable reviewed parents. Both original assertion lanes remain present; outside text remains visible.',result,receipt:hash(JSON.stringify(result))};writeCombatProof('native-client-menu-composition-source.json',report);console.log(JSON.stringify(report));
