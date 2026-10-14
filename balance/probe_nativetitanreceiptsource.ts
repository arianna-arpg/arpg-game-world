import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeTitanReceiptArchive as archive} from './nativeTitanReceiptArchive';
import {beforeNativeTitanActorSlots,beforeHistoricalCleaveReceipt} from './nativeTitanReceiptFixture';
import {nativeArrivalUnusedActorSlots,assertNativeArrivalActorSlots} from './nativeCaravanArrivalReceiptFixture';
const read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),hash=(text:string)=>createHash('sha256').update(text).digest('hex');
const normalize=(text:string)=>text.replace(/\r\n?/g,'\n');
const original=archive.parentProbe as string,current=read('balance/probe_nativescenetitans.ts'),oldImport="from './nativeHistoricalCleaveReceipt';",newImport="from './nativeTitanReceiptFixture';";
assert.equal(current.split(newImport).length,2);assert.equal(normalize(current.replace(newImport,oldImport)),normalize(original),'Entire original Titan probe, golden, raw comparisons and assertions; repository EOL policy only');assert.equal(hash(normalize(original)),archive.parentProbeNormalizedSha256);assert.equal(hash(original),archive.parentProbeSha256);
let assertions=0;const sf=ts.createSourceFile('original.ts',original,99,true);const count=(node:ts.Node):void=>{if(ts.isCallExpression(node)&&node.expression.getText(sf).startsWith('assert'))assertions++;ts.forEachChild(node,count);};count(sf);
for(const row of archive.unchangedHelpers)assert.equal(hash(normalize(read(row.file))),row.normalizedSha256,'Original helper/archive '+row.file);
const actor=read('src/engine/actor.ts');assertNativeArrivalActorSlots(actor);let declarations=0;
for(const slot of nativeArrivalUnusedActorSlots){assert.equal(actor.split(slot.source).length,2);for(const replacement of [slot.source.replace(slot.name,slot.name+'Wrong'),slot.source+'\n'+slot.source,slot.source.replace(slot.array?'[] = [];':'?','[] = [null as never];')]){assert.notEqual(replacement,slot.source);assert.throws(()=>assertNativeArrivalActorSlots(actor.replace(slot.source,replacement)));declarations++;}}
const copy=<T>(value:T):T=>JSON.parse(JSON.stringify(value));let fullReceipts=0,refusals=0,unchangedDifferences=0;const paths=new Set<string>();
function actorPaths(value:any,path:(string|number)[]=[],out:(string|number)[][]=[]):(string|number)[][]{if(value&&typeof value==='object'){if(Object.hasOwn(value,'resourceFlows')&&Object.hasOwn(value,'relicEffectsSuppressed'))out.push(path);for(const [key,x]of Object.entries(value))actorPaths(x,[...path,key],out);}return out;}
const at=(value:any,path:(string|number)[])=>path.reduce((v:any,k)=>v[k],value);
const ids=(value:any):Map<any,number>=>{const result=new Map<any,number>();function visit(v:any):void{if(!v||typeof v!=='object'||['$ref','$undefined','$function','$number'].some(k=>Object.hasOwn(v,k)))return;assert(!result.has(v));result.set(v,result.size);if(Object.hasOwn(v,'$map'))v.$map.forEach(([k,x]:any[])=>{visit(k);visit(x);});else if(Object.hasOwn(v,'$set'))v.$set.forEach(visit);else if(Array.isArray(v))v.forEach(visit);else Object.values(v).forEach(visit);}visit(value);return result;};
for(const sample of archive.samples){sample.paths.forEach((path:string)=>paths.add(path));const raw=JSON.stringify(sample.current),expected=JSON.stringify(sample.historical);assert.equal(JSON.stringify(beforeHistoricalCleaveReceipt(sample.current)),expected,'Genuine original complete stage bytes '+sample.name+'/'+sample.stage);assert.equal(JSON.stringify(sample.current),raw,'No mutation of genuine current receipt');fullReceipts++;
 const actorLocations=actorPaths(sample.current);assert(actorLocations.length>0);
 for(const location of actorLocations){for(const slot of nativeArrivalUnusedActorSlots){for(const mutation of ['active','missing','order']){const bad=copy(sample.current),target=at(bad,location);if(mutation==='active')target[slot.name]=slot.array?[{active:true}]:1;else if(mutation==='missing')delete target[slot.name];else{const value=target[slot.name];delete target[slot.name];target[slot.name]=value;}assert.throws(()=>beforeNativeTitanActorSlots(bad),sample.name+' '+slot.name+' '+mutation);refusals++;}}
  const bad=copy(sample.current),target=at(bad,location);target.life+=.25;assert.notEqual(JSON.stringify(beforeHistoricalCleaveReceipt(bad)),expected,'Ordinary Actor gameplay changes survive');unchangedDifferences++;
 }
 const primary=actorLocations[0];
 {const bad=copy(sample.current),state=bad.stages[0].state,id=ids(state).get(at(bad,primary).resourceFlows);assert(id!==undefined);state.messages.push({$ref:id});assert.throws(()=>beforeNativeTitanActorSlots(bad),/must not be aliased/);refusals++;}
 {const bad=copy(sample.current),state=bad.stages[0].state;state.messages.push({$ref:999999999});assert.throws(()=>beforeNativeTitanActorSlots(bad),/backward reference/);refusals++;}
 {const bad=copy(sample.current);bad.stages[0].state.messages.push({$ref:0,extra:true});assert.throws(()=>beforeNativeTitanActorSlots(bad),/Exact serialized marker/);refusals++;}
 {const bad=copy(sample.current),state=bad.stages[0].state;state.messages.push(state.actors);assert.throws(()=>beforeNativeTitanActorSlots(bad),/serialized object identity/);refusals++;}
 {const bad=copy(sample.current),target=at(bad,primary),state=bad.stages[0].state;target.resourceFlows={$ref:ids(state).get(target)};assert.throws(()=>beforeNativeTitanActorSlots(bad));refusals++;}
 {const bad=copy(sample.current);const unrelated={resourceFlows:[],companionReturnTo:{$undefined:true},relicEffectsSuppressed:{$undefined:true},selfBankCues:{$undefined:true},presenceBadge:{$undefined:true}};bad.stages[0].state.messages.push(unrelated);const projected=beforeNativeTitanActorSlots(bad) as any;assert.deepEqual(projected.stages[0].state.messages.at(-1),unrelated,'Same named slots outside actual Actor ownership survive');unchangedDifferences++;}
 {const bad=copy(sample.current);bad.stages[0].wire=[{unrelated:'wire unchanged'}];assert.deepEqual((beforeNativeTitanActorSlots(bad) as any).stages[0].wire,bad.stages[0].wire);unchangedDifferences++;}
}
assert.equal(paths.size,5);assert.equal(archive.historicalGolden,'540dc241ee054bfa27a5134f2bc65d11527252cb7c5226acff429397f63a9a85');
console.log('PASS native Titan historical receipt source',JSON.stringify({fullOriginalReaders:1,originalAssertions:assertions,unchangedHelpers:archive.unchangedHelpers.length,fullReceipts,actualActorLocations:paths.size,declarationRefusals:declarations,graphAndSlotRefusals:refusals,unchangedDifferences,historicalGolden:archive.historicalGolden}));
