import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {nativeRescueAnchorArchive as row} from './nativeRescueAnchorArchive';
import {beforeNativeRescueAnchor as before} from './nativeRescueAnchorFixture';
const hash=(s:string)=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex'),raw=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),parent=execFileSync('git',['show',row.pin+':'+row.file],{encoding:'utf8'});
assert.equal(hash(raw),row.afterSha256);assert.equal(hash(parent),row.beforeSha256);assert.equal(before(row.file,raw).replaceAll('\r\n','\n'),parent.replaceAll('\r\n','\n'));
assert.equal(before(row.file,parent),parent);assert.equal(before(row.file,before(row.file,raw)),before(row.file,raw));
let portable=0,mutations=0;const lf=raw.replaceAll('\r\n','\n');for(const s of[lf,lf.replaceAll('\n','\r\n')]){assert.equal(before(row.file,s),s.replace(row.after,row.before));portable++;}
for(let i=0;i<64;i++){const at=Math.floor(lf.length*i/64),mutant=lf.slice(0,at)+'!'+lf.slice(at);assert.throws(()=>before(row.file,mutant));mutations++;}
assert.throws(()=>before(row.file,raw+'\n'+row.after));assert.throws(()=>before(row.file,raw+'\n// undeclared edit'));
assert.equal(before('unrelated.ts',raw),raw);
console.log(JSON.stringify({mode:'Exact one-condition rescue anchor successor; whole original parent reconstructed from actual git bytes.',portable,mutations,duplicates:1,outside:1,pin:row.pin}));
