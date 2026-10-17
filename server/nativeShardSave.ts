/** A dedicated retained checkpoint has its own file and schema. A refused file
 * remains untouched; this owner never falls back to a fresh world over it. */
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {NativeShardRuntime,type NativeShardStart} from './nativeShardRuntime';
import {openAccount} from './shardHost';
import {deserializeAccount,type AccountSave} from '../src/meta/account';
import type {CharacterSave} from '../src/meta/character';
import {isCurrentCharacterSave} from '../src/meta/saveCompatibility';
import {readNativeRetainedSave} from '../src/worldmass/nativeRetainedSave';
export interface NativeShardCheckpoint {readonly kind:'retained-native-shard';readonly schema:1;readonly seed:number;readonly savedAt:number;readonly account:AccountSave;readonly keeper:CharacterSave}
const capture=NativeShardRuntime.prototype.capture,install=NativeShardRuntime.prototype.install,retire=NativeShardRuntime.prototype.retire;
const ready=Object.getOwnPropertyDescriptor(NativeShardRuntime.prototype,'ready')!.get!;
const openPaths=new Set<string>();
function decode(bytes:Buffer):NativeShardStart{
 const value=JSON.parse(bytes.toString('utf8')) as NativeShardCheckpoint;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='account,keeper,kind,savedAt,schema,seed'||value.kind!=='retained-native-shard'||value.schema!==1||!Number.isInteger(value.seed)||value.seed<0||value.seed>0xffffffff||!Number.isFinite(value.savedAt)||value.savedAt<0||!isCurrentCharacterSave(value.keeper))throw Error('Unsupported dedicated retained shard checkpoint; original bytes were not changed');
 const account=deserializeAccount(structuredClone(value.account));if(!account)throw Error('Unsupported dedicated shard account; original bytes were not changed');
 const record=readNativeRetainedSave(value.keeper);if(!record.catalog||record.manifest.seed!==value.seed)throw Error('Dedicated shard checkpoint seed or recorded catalog differs');
 return {account,seed:value.seed,resume:value.keeper};
}
function existing(file:string):Buffer|null{try{return fs.readFileSync(file);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
/** One process-owned store starts its own fresh or restored keeper before it
 * permits a write. Foreign edits and competing local owners refuse replacement. */
export class NativeShardStore {
 readonly file:string;readonly #key:string;#runtime:NativeShardRuntime|undefined;#baseline:Buffer|null=null;#busy=false;#closed=false;#held=false;
 constructor(file:string){if(typeof file!=='string'||!file.length)throw Error('Dedicated shard store needs its selected file');this.file=path.resolve(file);this.#key=process.platform==='win32'?this.file.toLowerCase():this.file;Object.defineProperty(this,'file',{writable:false,configurable:false});}
 start(fresh:Omit<NativeShardStart,'resume'>,signal?:AbortSignal,options:{openAccount?:boolean}={}):NativeShardRuntime{
  if(this.#closed||this.#busy||this.#runtime||openPaths.has(this.#key))throw Error('Dedicated shard store is already used or owned');this.#busy=true;openPaths.add(this.#key);this.#held=true;let runtime:NativeShardRuntime|undefined;
  try{const bytes=existing(this.file),input=bytes?decode(bytes):fresh;const policy=Object.getOwnPropertyDescriptor(options,'openAccount');if(policy&&(!Object.hasOwn(policy,'value')||typeof policy.value!=='boolean'))throw Error('Dedicated shard account policy must be ordinary boolean data');if(policy?.value===true)openAccount(input.account);if(input.seed!==fresh.seed)throw Error('Saved shard seed differs from requested seed; original bytes were not changed');runtime=new NativeShardRuntime(input);Reflect.apply(install,runtime,[signal]);this.#runtime=runtime;this.#baseline=bytes;return runtime;}
  catch(error){try{if(runtime)Reflect.apply(retire,runtime,[]);}finally{this.#release();}throw error;}finally{this.#busy=false;}
 }
 persist(now=Date.now()):{readonly bytes:number}{
  if(this.#closed||this.#busy||!this.#runtime||!this.#held)throw Error('Dedicated shard store has no idle installed owner');if(!Number.isFinite(now)||now<0)throw Error('Dedicated checkpoint needs a valid timestamp');this.#busy=true;let temporary:string|undefined,fd:number|undefined;
  try{const state=Reflect.apply(capture,this.#runtime,[]) as ReturnType<NativeShardRuntime['capture']>,value:NativeShardCheckpoint={kind:'retained-native-shard',schema:1,seed:this.#runtime.writer.manifest.seed,savedAt:now,...state},bytes=Buffer.from(JSON.stringify(value),'utf8');decode(bytes);this.#unchanged();fs.mkdirSync(path.dirname(this.file),{recursive:true});temporary=this.file+'.'+process.pid+'.'+randomUUID()+'.tmp';fd=fs.openSync(temporary,'wx');let at=0;
   while(at<bytes.length){const wrote=fs.writeSync(fd,bytes,at,bytes.length-at);if(!Number.isInteger(wrote)||wrote<=0)throw Error('Dedicated checkpoint write made no progress');at+=wrote;}fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;const rename=fs.renameSync;this.#unchanged();if(!Reflect.apply(ready,this.#runtime,[]))throw Error('Dedicated checkpoint owner was cancelled before commit');Reflect.apply(rename,fs,[temporary,this.file]);temporary=undefined;this.#baseline=bytes;return Object.freeze({bytes:bytes.length});
  }finally{try{try{if(fd!==undefined)fs.closeSync(fd);}finally{if(temporary){try{fs.unlinkSync(temporary);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}}}}finally{this.#busy=false;}}
 }
 #unchanged():void{const current=existing(this.file);if(this.#baseline===null?current!==null:current===null||!current.equals(this.#baseline))throw Error('Dedicated checkpoint changed outside its owner; original bytes were not replaced');}
 #release():void{if(this.#held){openPaths.delete(this.#key);this.#held=false;}}
 close():void{if(this.#closed)return;if(this.#busy)throw Error('Dedicated shard store cannot close during capture');if(this.#runtime)Reflect.apply(retire,this.#runtime,[]);this.#closed=true;this.#release();}
}
