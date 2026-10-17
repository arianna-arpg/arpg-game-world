/** Native campaign/arena source closure, including exact callback lifetime seams. */
import assert from 'node:assert/strict';
import {nativeCaravanPriorFS as fs} from './nativeCaravanCompositionFixture';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeCombatCampaignArenaArchive as archive,nativeCombatCampaignArenaArchiveHash} from './nativeSceneCombatCampaignArenaArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),lf=(s:string)=>s.replaceAll('\r\n','\n');
assert.equal(hash(JSON.stringify(archive)),nativeCombatCampaignArenaArchiveHash);
const original=execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
assert.equal(hash(original),archive.worldHash);
const worldTree=ts.createSourceFile('world.ts',original,99,true),world=worldTree.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World')! as ts.ClassDeclaration;
function check(file:string,text:string):void {
 const row=archive.files.find(r=>r.file===file);assert(row);assert.equal(hash(lf(text)),row.sha256,'exact native campaign/arena source '+file);
 const tree=ts.createSourceFile(file,lf(text),99,true);
 for(const expected of archive.methods.filter(r=>r.file===file)){
  const fn=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===expected.target);assert(fn);assert.equal(fn.getText(tree),expected.after);
  let pure:string=expected.after;for(const seam of expected.seams){assert.equal(pure.split(seam.from).length,2);pure=pure.replace(seam.from,seam.to);}assert.equal(pure,expected.pure);
  const member=world.members.find(n=>n.name?.getText(worldTree)===expected.name)!;
  const source=expected.kind==='initializer'?(member as ts.PropertyDeclaration).initializer!.getText(worldTree):member.getText(worldTree);
  assert.equal(source,expected.before,expected.name+' immutable World origin');
 }
}
let mutations=0,duplicates=0;const records=[];
for(const row of archive.files){
 const current=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8');check(row.file,current);check(row.file,lf(current).replaceAll('\n','\r\n'));
 for(const method of archive.methods.filter(r=>r.file===row.file)){
  assert.equal(current.split(method.after).length,2);
  const changed=method.after.replace('export function','export !unction');assert.notEqual(changed,method.after);
  assert.throws(()=>check(row.file,current.replace(method.after,changed)),/exact native campaign\/arena source/);mutations++;
  assert.throws(()=>check(row.file,current+'\n'+method.after),/exact native campaign\/arena source/);duplicates++;
 }
 records.push({file:row.file,sha256:hash(lf(current))});
}
const report={nativeBodies:archive.methods.length,modules:records,mutations,duplicates,receipt:hash(JSON.stringify(records))};
fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/nativecombatcampaignarenasource.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
