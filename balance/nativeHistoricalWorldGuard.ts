/** Original pins
 * remain unchanged; the legacy subset path also checks its exact excluded
 * delegates. The alternate path accepts only existing reviewed full receipts. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeInstalledOtherWorldHash,nativeInstalledShardWorldHash} from './nativeInstalledSourcesArchive';
import {originalHistoricalDelegates} from './nativeHistoricalWorldDelegates';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export interface NativeHistoricalWorldGuard {label:string;excluded:readonly string[];count:number;hash:string}
export function assertNativeHistoricalWorld(text:string,guard:NativeHistoricalWorldGuard):'original'|'reviewed' {
 const sf=ts.createSourceFile('world.ts',text,99,true),classes=sf.statements.filter((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='World');
 assert.equal(classes.length,1,guard.label+' has exactly one World class');
 const members=classes[0].members,other=members.filter(m=>!guard.excluded.includes(m.name?.getText(sf)??'')).map(m=>m.getText(sf).replaceAll('\r\n','\n'));
 if(other.length===guard.count&&hash(JSON.stringify(other))===guard.hash){
  for(const row of originalHistoricalDelegates){const matches=members.filter(m=>m.name?.getText(sf)===row.name);assert.equal(matches.length,1,'one original delegate '+row.name);assert.equal(matches[0].getText(sf).replaceAll('\r\n','\n'),row.text,'exact original delegate '+row.name);}
  return 'original';
 }
 const complete=hash(JSON.stringify(members.map(m=>m.getText(sf).replaceAll('\r\n','\n'))));
 assert.ok([nativeInstalledOtherWorldHash,nativeInstalledShardWorldHash].includes(complete),guard.label+' must match its original subset or independently reviewed complete World receipt; '+other.length+' members, complete hash '+complete);
 return 'reviewed';
}
