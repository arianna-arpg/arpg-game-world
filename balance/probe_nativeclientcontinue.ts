import {recordedContinueSave,refuseWorldContinue} from './nativeClientContinueFixture';
import '../src/engine/world';
import assert from 'node:assert/strict';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,serializeAccount} from '../src/meta/account';
import {readCharacterResume,writeCharacterMirrorRaw,charKeyFor,CHAR_SLOT,serializeCharacter,type CharacterSave} from '../src/meta/character';
import {prepareNativeCharacterContinue} from '../src/worldmass/nativeClientContinue';
import {seedGlobalRandom} from '../src/sim/rng';
bootSimEngine();const restoreRandom=seedGlobalRandom(48012);
const memory=new Map<string,string>(),storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},removeItem:(k:string)=>{memory.delete(k);}};
Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
const raw=recordedContinueSave(),save=JSON.parse(raw) as CharacterSave,account=makeAccount(),before=JSON.stringify(serializeAccount(account));
try{await writeCharacterMirrorRaw(CHAR_SLOT,raw);const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('Missing actual resume authority');
 // The asynchronous trap remains installed across the entire genuine hydration.
 const prepared=await refuseWorldContinue(async()=>prepareNativeCharacterContinue(account,read.resume,{spawn:'exact',isCurrent:()=>true}));assert.equal(JSON.stringify(serializeAccount(account)),before);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);const resumed=prepared.publish();assert.equal(resumed.writer.account,account);assert(resumed.runtime.ready);const now=serializeCharacter(resumed.writer);assert.equal(now.world!.player!.vitals!.life,.37);assert.equal(now.companions?.length,1);const frame=await refuseWorldContinue(async worldDrivers=>{resumed.runtime.dispatch({dt:.01,wallSeconds:.01,inputs:new Map()});return {worldDrivers};});resumed.runtime.retire();prepared.discard();
 await writeCharacterMirrorRaw(CHAR_SLOT,raw);const second=await readCharacterResume();if(second.status!=='ready')throw Error('Missing second authority');const controller=new AbortController();await assert.rejects(prepareNativeCharacterContinue(account,second.resume,{spawn:'exact',signal:controller.signal,isCurrent:()=>true,loadingStage:async label=>{if(label.includes('ownership'))controller.abort();}}),/superseded|cancelled/i);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),raw);
 const missing=structuredClone(save);delete missing.world!.nativeRetained;const old=JSON.stringify(missing);await writeCharacterMirrorRaw(CHAR_SLOT,old);const older=await readCharacterResume();if(older.status!=='ready')throw Error('Missing older fixture');await assert.rejects(prepareNativeCharacterContinue(account,older.resume,{spawn:'exact',isCurrent:()=>true}),/migration/);assert.equal(memory.get(charKeyFor(CHAR_SLOT)),old);
 console.log(JSON.stringify({actualLease:true,stagedAccount:true,life:.37,companions:1,cancelled:true,missingAuthorityRefused:true,...frame}));
}finally{restoreRandom();}
