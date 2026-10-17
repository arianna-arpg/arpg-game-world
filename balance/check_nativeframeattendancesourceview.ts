/** Standalone proposed source-view checks; UNRUN until the exclusive window ends. */
import assert from 'node:assert/strict';
import * as rawFS from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {nativeShardsCaravanFS} from './nativeShardsCompositionFixture';
import {nativeFrameAttendanceSourceFS as fs,nativeFrameAttendanceSource,beforeNativeFrameAttendance} from './nativeFrameAttendanceSourceView';
import {beforeNativeFrameAttendance as originalAttendance} from './nativeFrameAttendanceFixture';
import {beforeNativeFramePhysicalSeats} from './nativeFramePhysicalSeatsFixture';
import {beforeNativeFrameContactSource} from './nativeFrameContactSourceFixture';
import {nativeSceneFrameAttendanceArchive as attendance} from './nativeSceneFrameAttendanceArchive';
import {nativeFramePhysicalSeatsArchive as physical} from './nativeFramePhysicalSeatsArchive';
import {nativeFrameContactSourceArchive as contact} from './nativeFrameContactSourceArchive';
const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const file=contact.file,current=nativeShardsCaravanFS.readFileSync(file,'utf8');
const seats=physical.rows.find(row=>row.file===file)!;
const exposed=fs.readFileSync(file,'utf8');
assert.equal(current,contact.after);
assert.equal(beforeNativeFrameContactSource(file,current),seats.after);
assert.equal(beforeNativeFramePhysicalSeats(file,seats.after),exposed);
assert.equal(exposed,seats.before);
assert.equal(nativeFrameAttendanceSource(file,current),exposed);
assert.equal(beforeNativeFrameAttendance(file,exposed),originalAttendance(file,current));
assert.throws(()=>nativeFrameAttendanceSource(file,exposed),'read side cannot silently accept an already rewound source');
assert.throws(()=>beforeNativeFrameAttendance(file,current),'probe side cannot silently accept the later stage');
let mutations=0,duplicates=0;
for(const row of attendance.files){
 const source=fs.readFileSync(row.file,'utf8');
 assert.equal(sha(beforeNativeFrameAttendance(row.file,source)),row.beforeSha256);
 for(const change of attendance.changes.filter(change=>change.file===row.file)){
  assert.equal(source.split(change.after).length,2,'archived mutation target occurs exactly once: '+change.name);
  const changed=source.replace(change.after,change.after.replace('{','{/*mutation*/'));
  assert.notEqual(changed,source,'the original mutation must actually change the input: '+change.name);
  assert.throws(()=>beforeNativeFrameAttendance(row.file,changed));mutations++;
  assert.throws(()=>beforeNativeFrameAttendance(row.file,source+'\n'+change.after));duplicates++;
 }
}
for(const source of [current+'\n',current+current,current.slice(0,-1),current.replaceAll('\n','\r\n')]){
 assert.notEqual(source,current);
 assert.throws(()=>nativeFrameAttendanceSource(file,source));
 assert.throws(()=>originalAttendance(file,source));mutations++;
}
for(const source of [exposed+'\n',exposed+exposed,exposed.slice(0,-1),exposed.replaceAll('\n','\r\n')]){
 assert.notEqual(source,exposed);
 assert.throws(()=>beforeNativeFrameAttendance(file,source));mutations++;
}
const contactNeedle='observeNativeSource(nativeHost, c.d.contactSource)';
assert.equal(current.split(contactNeedle).length,2);
const badContact=current.replace(contactNeedle,'observeNativeSource(nativeHost, nativeHost.player)');
assert.throws(()=>nativeFrameAttendanceSource(file,badContact));
assert.throws(()=>originalAttendance(file,badContact));
assert.throws(()=>beforeNativeFrameContactSource(file,badContact));
const badSeats=seats.after.replace('frameSeats()','frameSeatZ()');
assert.notEqual(badSeats,seats.after);
assert.throws(()=>beforeNativeFramePhysicalSeats(file,badSeats));
for(const input of [file,path.resolve(file),Buffer.from(file),pathToFileURL(path.resolve(file))]){
 for(const options of ['utf8','utf-8',{encoding:'utf8',flag:'r'}] as const)assert.equal(fs.readFileSync(input,options),exposed);
 for(const options of [undefined,null,{encoding:null}] as const)assert.deepEqual(fs.readFileSync(input,options),Buffer.from(exposed));
}
for(const encoding of ['ascii','latin1','utf16le','hex','base64'] as const)assert.throws(()=>fs.readFileSync(file,encoding));
const fd=rawFS.openSync(file,'r');
try{assert.equal(fs.readFileSync(fd,'utf8'),rawFS.readFileSync(file,'utf8'),'numeric descriptors remain ordinary raw reads');}
finally{rawFS.closeSync(fd);}
const other='balance/nativeFrameAttendanceFixture.ts';
assert.equal(fs.readFileSync(other,'utf8'),nativeShardsCaravanFS.readFileSync(other,'utf8'));
assert.equal(fs.openSync,nativeShardsCaravanFS.openSync);
assert.equal(fs.writeFileSync,nativeShardsCaravanFS.writeFileSync);
assert.equal(nativeFrameAttendanceSource('unrelated','untouched'),'untouched');
const originalFiles:Record<string,string>={
 'balance/nativeFrameAttendanceFixture.ts':'1fd13bc485cebf8ee4a57982b7e5b6b5bd319cce983f4031f33c1494694207b0',
 'balance/nativeFramePhysicalSeatsFixture.ts':'53f11c05c40e2751603999f839ca21549280abfa58bc96f666e27b2482d1c49c',
 'balance/nativeFrameContactSourceFixture.ts':'c71dceeaa841ed6116b5ff0342bbe7fa1942c379fbb770f24121462c6d2cb511',
 'balance/nativeSceneFrameAttendanceArchive.ts':'6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71',
 'balance/nativeFramePhysicalSeatsArchive.ts':'2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db',
 'balance/nativeFrameContactSourceArchive.ts':'c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb',
};
for(const [name,digest] of Object.entries(originalFiles))assert.equal(sha(rawFS.readFileSync(name)),digest,'unchanged original source '+name);
const probe=rawFS.readFileSync('balance/probe_nativeframeattendance.ts','utf8')
 .replace("import {nativeFrameAttendanceSourceFS as fs} from './nativeFrameAttendanceSourceView';","import {nativeShardsCaravanFS as fs} from './nativeShardsCompositionFixture';")
 .replace("import {beforeNativeFrameAttendance} from './nativeFrameAttendanceSourceView';","import {beforeNativeFrameAttendance} from './nativeFrameAttendanceFixture';");
assert.equal(sha(probe),'8320acb8c74a0a42ecbeaf859e8a7eb53528c4e1a5db6d21de355e14660433e9','only the two explicit probe imports change');
console.log(JSON.stringify({status:'PASS',files:attendance.files.length,mutations,duplicates,scope:'Exact attendance mutation input stage; original readers, archives and assertions retained.'}));
