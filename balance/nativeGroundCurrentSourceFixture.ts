import assert from 'node:assert/strict';
import {nativeCaravanGroundFS as fs} from './nativeCaravanLegacySourceFixture';import {createHash} from 'node:crypto';
import {nativeGroundCurrentSourceArchive as archive} from './nativeGroundCurrentSourceArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
/** Reverse declared current hunks only; all unrelated edits survive to the old guards. */
export function beforeNativeGroundCurrent(file:string,source:string):string {let result=source.replaceAll('\r\n','\n');const row=archive.files.find(r=>r.file===file);if(!row)return result;for(const h of [...row.edits].reverse()){assert.equal(result.split(h.after).length,2,'Changed or duplicated current ground hunk: '+file);result=result.replace(h.after,h.before);}return result;}
export function verifyNativeGroundCurrent():void {
 assert.equal(hash(fs.readFileSync(new URL('./nativeGroundCurrentSourceArchive.ts',import.meta.url),'utf8')),'0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5','immutable current ground layer');let mutations=0,duplicates=0;
 for(const row of archive.files){const raw=fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8').replaceAll('\r\n','\n'),check=(text:string)=>{const result=beforeNativeGroundCurrent(row.file,text);assert.equal(hash(result),row.beforeHash,'complete committed ground predecessor');return result;};assert.equal(hash(raw),row.afterHash,'exact reviewed current ground source');const prior=check(raw);assert.equal(check(raw.replaceAll('\n','\r\n')),prior,'CRLF current projection');let n=0;assert.equal(check(raw.replace(/\n/g,()=>++n%2?'\r\n':'\n')),prior,'mixed EOL current projection');
  for(const h of row.edits){assert.equal(raw.split(h.after).length,2,'unique current raw hunk');const mutated=raw.replace(h.after,h.after.replace(/[A-Za-z]/,'!'));assert.notEqual(mutated,raw,'nontrivial current mutation');assert.throws(()=>check(mutated));mutations++;assert.throws(()=>check(raw+'\n'+h.after));duplicates++;}
  const outside=raw+'\n/* unknown outside current ground edit */';assert.ok(beforeNativeGroundCurrent(row.file,outside).endsWith('/* unknown outside current ground edit */'));assert.throws(()=>check(outside));
 }
 console.log('PASS current ground source layer '+archive.files.length+' files, '+mutations+' mutations/'+duplicates+' duplicates; unknown outside edits preserved');
}
