import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {nativeCompilerPlatformOriginal} from './nativeCompilerPlatformReceiptArchive';
import {nativeCompilerReceiptText} from './nativeCompilerReceiptFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const text=gunzipSync(Buffer.from(nativeCompilerPlatformOriginal,'base64')).toString('utf8'),original=JSON.parse(text);
assert.equal(hash(text),'b8afd9251dd1fd329ae3857712589d47f0654a4a9f450e4b14f414a50ed13e0c');
assert.equal(nativeCompilerReceiptText(original),text);
const linux=structuredClone(original);linux.layout.doodads[123].radius=25.878675014138274;
assert.equal(hash(JSON.stringify(linux)),'fe3b89547970a7ba5da6cb3fd7a3b1eb261d056c2063db3ad4320d4a83d392ba');
const held=structuredClone(linux);assert.equal(nativeCompilerReceiptText(linux),text);assert.deepEqual(linux,held);
const differences:string[]=[];
function compare(a:any,b:any,path:string):void {if(a===b)return;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){differences.push(path);return;}assert.deepEqual(Object.keys(a),Object.keys(b));for(const key of Object.keys(a))compare(a[key],b[key],path+'.'+key);}
compare(original,linux,'');assert.deepEqual(differences,['.layout.doodads.123.radius']);
const mutators=[(x:any)=>{x.layout.doodads[123].radius+=1e-13;},(x:any)=>{x.layout.doodads[123].pos.x+=1;},(x:any)=>{x.layout.doodads[124].radius+=1e-13;},(x:any)=>{x.layout.doodads[123].kind='tree';},(x:any)=>{x.extra='unexplained';}];
for(const mutate of mutators){const changed=structuredClone(linux);mutate(changed);const raw=JSON.stringify(changed);assert.equal(nativeCompilerReceiptText(changed),raw);assert.notEqual(hash(raw),hash(text));}
for(const other of [null,{},[],{layout:original.layout},[linux]])assert.equal(nativeCompilerReceiptText(other),JSON.stringify(other));
console.log('PASS exact compiler platform receipt',{completeBytes:text.length,onlyDifference:differences[0],mutations:mutators.length,unknownRecordsUntouched:true,inputsUnchanged:true});

