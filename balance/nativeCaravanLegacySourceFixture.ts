import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {readNativeArrivalMainCast} from './nativeArrivalCompositionFixture';
import {beforeNativeClientPublicationComposition} from './nativeClientPublicationCompositionFixture';
import {beforeNativeClientRuntime} from './nativeClientRuntimeFixtureSource';
import {beforeNativeClientStartMenus} from './nativeClientStartMenuCompositionFixture';
import {beforeNativeClientStart} from './nativeClientStartFixtureSource';
import {nativeSceneRestorationArchive as restoration} from './nativeSceneRestorationArchive';
const hash=(source:string)=>createHash('sha256').update(source).digest('hex');
export const nativeCaravanGroundReads=[
 {file:'src/worldmass/nativeAreaActorAuthority.ts',current:'996cf7e0d5fa3143a19f84a8b0493309f32e4aeeb9bcfb56bd39b2b762b5b05d',prior:'7b98138ca4e7c31a9f981b69a501ce0507a65531eda1a867c5ff3f546ab809f8'},
 {file:'src/worldmass/nativeAreaSceneProgression.ts',current:'4d3ed7c3485e1be22f94ca33ef358e4a983b1c6d834763a91f0034fffb492398',prior:'2b3cdc580a2c696a9ba27e50f7a8a79391d1a4c62d1e4c644fc417a60f4cae1d'},
] as const;
/** The original ground verifier predates these two fully archived layers. */
export function beforeNativeCaravanGroundRead(file:string,input:string):string {
 const row=nativeCaravanGroundReads.find(row=>row.file===file);if(!row)return input;
 const source=input.replace(/\r\n?/g,'\n');if(hash(source)===row.prior)return source;
 assert.equal(hash(source),row.current,'Exact current ground read '+file);
 const prior=file==='src/worldmass/nativeAreaActorAuthority.ts'
  ?beforeNativeClientRuntime(file,beforeNativeClientPublicationComposition('runtime',file,source))
  :beforeNativeClientStart(file,beforeNativeClientStartMenus('startup',file,source));
 assert.equal(hash(prior),row.prior,'Complete original ground read '+file);return prior;
}
export function readNativeCaravanGround(file:string|URL,encoding:'utf8'):string {
 const absolute=file instanceof URL?fileURLToPath(file):path.resolve(file),key=path.relative(fileURLToPath(new URL('../',import.meta.url)),absolute).replaceAll('\\','/');
 return beforeNativeCaravanGroundRead(key,readNativeArrivalMainCast(file,encoding));
}
export const nativeCaravanGroundFS={...fs,readFileSync:readNativeCaravanGround};
/** The live census adds only the two actual extracted cure bodies. No other
 * restoration string can supply an unrelated status-caption assertion. */
export function nativeStatusVoiceSources(world:string,source:string):string {
 const sf=ts.createSourceFile('nativeSceneRestoration.ts',source,ts.ScriptTarget.Latest,true),bodies:string[]=[];
 for(const name of ['cleanseActor','ringAfflictions']){
  const row=restoration.rows.find(row=>row.name===name);assert(row,'Original cure body '+name);
  const old=ts.createSourceFile('original.ts','class Original{'+row.source+'}',ts.ScriptTarget.Latest,true),method=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
  const matches=sf.statements.filter((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='scene'+name[0].toUpperCase()+name.slice(1));assert.equal(matches.length,1,'One actual extracted cure '+name);
  const fn=matches[0];assert(fn.body&&method.body);assert.equal(fn.parameters[0].name.getText(sf),'host');
  assert.deepEqual(fn.parameters.slice(1).map(p=>p.getText(sf)),method.parameters.map(p=>p.getText(old)));assert.equal(fn.type?.getText(sf),method.type?.getText(old));
  let expected=method.body.getText(old);const offsets:number[]=[];function visit(node:ts.Node):void{if(node.kind===ts.SyntaxKind.ThisKeyword)offsets.push(node.getStart(old)-method.body!.getStart(old));node.forEachChild(visit);}visit(method.body);
  for(const start of offsets.reverse())expected=expected.slice(0,start)+'host'+expected.slice(start+4);
  assert.equal(fn.body.getText(sf),expected,'Complete original cure body '+name);
  const caption=name==='cleanseActor'?'cleansed':'rung clean',calls:ts.CallExpression[]=[];function collect(node:ts.Node):void{if(ts.isCallExpression(node)&&node.expression.getText(sf)==='host.text')calls.push(node);node.forEachChild(collect);}collect(fn.body);
  assert.equal(calls.length,1,'One genuine cure caption');assert.equal(calls[0].arguments.length,5);assert.equal(calls[0].arguments[1].getText(sf),"'"+caption+"'");assert.equal(calls[0].arguments[4].getText(sf),"'combat'");
  bodies.push(fn.getText(sf));
 }
 return world+'\n'+bodies.join('\n');
}