import '../src/engine/world';
import assert from 'node:assert/strict';
import {World,type Seat} from '../src/engine/world';
import {NativeClientStart} from '../src/worldmass/nativeClientStart';
import {bootSimEngine} from '../src/sim/arena';
import {makeAccount,LEDGER_FLASK_LESSON} from '../src/meta/account';
import {buildManifest} from '../src/packages/manifest';
import {CLASSES} from '../src/data/classes';
import {townStationFeatures} from '../src/data/townBuild';
import {address} from '../src/worldmass/address';
import type {MassNativeMapping} from '../src/worldmass/nativeGeography';
import {refuseWorldContinue} from './nativeClientContinueFixture';
export const partyMapping:MassNativeMapping={schema:1,algorithm:'bigint-relative-native-map-v1',addressSpan:960,physicalOrigin:address('surface','0','0',0,0,960),nativeOrigin:{x:0,y:0},physicalUnitsPerNativeUnit:{numerator:'20',denominator:'1'},nativeDimension:'surface',nativeBounds:{minX:-10000,minY:-10000,maxX:10000,maxY:10000},outsideDomain:'refuse',rounding:'nearest-binary64-ties-even-once'};
export function partyAccount(){bootSimEngine();const account=makeAccount();for(const f of townStationFeatures())account.features.add(f);account.ledger[LEDGER_FLASK_LESSON]=1;return account;}
export function actualParty(seed=1211){const account=partyAccount(),start=new NativeClientStart(account,partyMapping),made=start.begin({kind:'run',classDef:CLASSES.find(c=>c.id==='warrior')!,manifest:buildManifest(account,seed),prologue:'skip'});assert(made);return {...made,start,account};}
export function ordinaryParty(seed=1211){const account=partyAccount(),writer=new World(account,Object.freeze(buildManifest(account,seed)));writer.createPlayer(CLASSES.find(c=>c.id==='warrior')!);return writer;}
export function partyFacts(writer:World){return {seats:writer.seats.map(seatFacts),hired:writer.hiredMercs.map(h=>({id:h.seat.id,name:h.name,templateId:h.templateId,mercId:h.mercId,snapshot:h.snapshot})),companions:writer.actors.filter(a=>a.companion).map(a=>({owner:writer.seats.find(s=>s.actor===a.owner)?.id,def:a.defId,level:a.level,life:a.life,max:a.maxLife(),skills:a.skills.map(i=>i?.def.id??null)}))};}
export function seatFacts(s:Seat){return {id:s.id,name:s.actor.name,class:s.meta.classDef.id,attrs:s.meta.attrs,base:s.meta.baseAttrs,life:s.actor.life,max:s.actor.maxLife(),mana:s.actor.mana,maxMana:s.actor.maxMana(),level:s.actor.level,known:[...s.meta.knownSkills.keys()],skills:s.actor.skills.map(i=>i&&{id:i.def.id,level:i.level,rarity:i.rarity,sockets:i.sockets.map(x=>x?.def.id??null)}),allocated:[...s.meta.allocated],essences:s.meta.essences,metaName:s.meta.name};}
export async function refuseWorldParty<T>(action:(drivers:string[])=>Promise<T>):Promise<T>{return refuseWorldContinue(async drivers=>{const names=['hireMercenary','templateSnapshot'],saved=names.map(name=>[name,Object.getOwnPropertyDescriptor(World.prototype,name)!] as const);try{for(const[name,d]of saved)Object.defineProperty(World.prototype,name,{...d,value(){drivers.push(name);throw Error('World party fallback '+name);}});return await action(drivers);}finally{for(const[name,d]of saved)Object.defineProperty(World.prototype,name,d);}});}
