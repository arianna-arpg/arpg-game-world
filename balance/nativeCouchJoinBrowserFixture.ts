import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,serializeAccount,FEATURE} from '../src/meta/account';
import {CLASSES} from '../src/data/classes';
import {buildManifest} from '../src/packages/manifest';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {serializeCharacter,flushCharacterSaves} from '../src/meta/character';
import {seedGlobalRandom} from '../src/sim/rng';
bootSimEngine();const restore=seedGlobalRandom(550901);const storage=new Map<string,string>();Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}}});Object.defineProperty(globalThis,'fetch',{configurable:true,value:async()=>new Response('',{status:404})});
const out=resolve(process.argv[2]??'balance/reports/native-couch-fixtures');mkdirSync(out,{recursive:true});const account=makeAccount();account.ledger.prologue_lived=1;account.features.add(FEATURE.IMMORTAL);account.features.add(FEATURE.IMMORTAL_SLOT_2);const start=new NativeClientStart(account);
for(const [i,name]of ['Couch Host','Couch Guest'].entries()){const made=start.begin({kind:'run',classDef:CLASSES[0],modeId:'immortal',prologue:'skip',manifest:buildManifest(account,1211+i),name});if(!made)throw Error('Native start failed');const save=serializeCharacter(made.writer),entry=account.roster.find(r=>r.charId===made.writer.meta.charId)!;writeFileSync(resolve(out,String(entry.slot)+'.json'),JSON.stringify(save));await flushCharacterSaves();console.log(JSON.stringify({slot:entry.slot,name:save.name,charId:save.charId,ready:made.runtime.ready,retained:!!save.world?.nativeRetained}));}
writeFileSync(resolve(out,'0.json'),JSON.stringify(serializeAccount(account)));writeFileSync(resolve(out,'cards.json'),JSON.stringify(account.roster));start.cancel();restore();
