import assert from 'node:assert/strict';
import ts from 'typescript';
import * as core from '../src/engine/nativeInhabitants';
import {withSeededRandom as nativeSeed} from '../src/core/rng';
export function checkNativeInhabitantMechanisms(blocks:Readonly<Record<string,string>>) {
const sourceNames=['MONSTERS','FIXTURE_IDS','FACTIONS','RARITY_DEFS','DAY_LENGTH','vec','rand','randInt','hashStr','withSeededRandom','rollFolk','makeSpeakerRow'];
const originals=Object.fromEntries(Object.entries(blocks).map(([k,b])=>[k,Function(...sourceNames,ts.transpileModule('"use strict";return function(def,layout){'+b+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)]));
const clone=(x:any)=>JSON.parse(JSON.stringify(x));
let checks=0,entries=0;const rows:any[]=[];
function run(shared:boolean,stage:string,mode:string,fail:string|undefined){
 const trace:any[]=[],made:any[]=[],actors:any[]=[],speakerRows=new Map(),memory=new Map([[1,'old']]),focus=new Map([[1,'old']]);
 let seq=44;let host:any;let folkIndex=0;const world={time:35,massSettlementDay:mode==='fixed-day'?0:null,actors,doodads:[],account:{ledger:{accepted:mode==='account'?1:0}},ledger:{accepted:mode==='run-ledger'?1:0},speakerRows,
 speechMemory:memory,speechFocus:focus,speechFocusSpeaker:1,dialogueScene:4,npcDialogues:{leaveZone(){trace.push(['leaveZone']);if(fail==='leave')throw Error(fail);}},
 createMonster:function(this:any,id:string,level:number,team:string){assert.equal(this,host);trace.push(['factory',id,level,team]);const a:any={id:101+made.length,defId:id,level,team,radius:11,tier:0,life:50,pos:{x:0,y:0},maxLife:function(this:any,){assert.equal(this,a);trace.push(['maxLife',a.id]);return 80;}};made.push(a);if(fail==='factory')throw Error(fail);return a;},
 clampPos:function(this:any,p:any,r:number){assert.equal(this,host);trace.push(['clamp',p,r]);if(fail==='clamp')throw Error(fail);return{x:p.x+1,y:p.y+2};},
 findFreeSpot:function(this:any,p:any,r:number,t:number){assert.equal(this,host);trace.push(['find',p,r,t]);if(fail==='find')throw Error(fail);return{x:p.x+3,y:p.y+4};},
 nextSquadId:function(this:any,){assert.equal(this,host);trace.push(['squad',seq]);return seq++;},
 weightedPick:function(this:any,t:any,l:number){assert.equal(this,host);trace.push(['pick',t,l]);return t[0].id;},
 armAmbush:function(this:any,a:any,s:any){assert.equal(this,host);trace.push(['arm',a.id,s]);a.armed=true;if(fail==='arm')throw Error(fail);},
 promoteMonster:function(this:any,a:any,r:any){assert.equal(this,host);trace.push(['promote',a.id,r]);a.promoted=r;if(fail==='promote')throw Error(fail);}
 };
 host=new Proxy(world,{get(t:any,k){trace.push(['hostget',String(k)]);return t[k];},set(t:any,k,v){trace.push(['hostset',String(k),v]);t[k]=v;return true;}});
 const origSet=speakerRows.set;speakerRows.set=function(this:any,k:any,v:any){trace.push(['speechSet',k]);origSet.call(this,k,v);if(fail==='speechSet')throw Error(fail);return this;};
 const data=(name:string,x:any):any=>new Proxy(x,{get(t,k){trace.push(['data',name,String(k)]);const v=Reflect.get(t,k);return v&&typeof v==='object'&&!Array.isArray(v)?data(name+'.'+String(k),v):v;}});
 const empty=mode==='empty';
 const sources:any={MONSTERS:data('MONSTERS',{npc:{npcRequiresLedger:mode==='gated'?'missing':'accepted',speechRoles:['host']},free:{speechRoles:[]},guard:{}}),
 FIXTURE_IDS:data('FIXTURE_IDS',{door_timber:'door'}),FACTIONS:data('FACTIONS',{good:{table:[{id:'guard',weight:1}]}}),RARITY_DEFS:data('RARITY_DEFS',{rare:{}}),DAY_LENGTH:10,
 vec:function(this:any,x:number,y:number){assert.equal(this,undefined);trace.push(['vec',x,y]);return{x,y};},
 rand:function(this:any,a:number,b:number){assert.equal(this,undefined);trace.push(['rand',a,b]);return a+(b-a)*Math.random();},
 randInt:function(this:any,a:number,b:number){assert.equal(this,undefined);trace.push(['randInt',a,b]);return a;},
 hashStr:function(this:any,s:string){assert.equal(this,undefined);trace.push(['hash',s]);return s.length*31;},
 withSeededRandom:function(this:any,s:number,f:()=>any){assert.equal(this,undefined);trace.push(['seed-enter',s]);return nativeSeed(s,()=>{const die=Math.random;Math.random=function(this:unknown){trace.push(['inner-draw',this===Math?'Math':this===undefined?'undefined':'other']);return die();};try{return f();}finally{trace.push(['seed-leave',s]);Math.random=die;}});},
 rollFolk:function(this:any,pool:string,random:()=>number){assert.equal(this,undefined);trace.push(['folk',pool]);random();if(fail==='folk')throw Error(fail);if(mode==='empty-folk')return null;const name=mode==='duplicate'?'same':'guest'+(folkIndex++);return{defId:'free',name,color:'red',line:'line',row:{roles:['guest'],lines:['line','extra','']}};},
 makeSpeakerRow:function(this:any,...args:any[]){assert.equal(this,undefined);trace.push(['speaker',...args]);if(fail==='speaker')throw Error(fail);return args;},get random(){return Math.random;}};
 const def:any={id:'zone',seed:71,level:0,packs:mode==='no-packs'?undefined:{table:[{id:'guard',weight:1}]}};
 const layout:any={breakables:empty?[]:[{id:'chair',pos:{x:10,y:11}}],npcs:empty?[]:[{id:'npc',tier:2,pos:{x:21,y:22},line:'authored',sid:'house'},{id:'free',pos:{x:23,y:24}}],folk:empty?[]:[{key:'house:folk0',pool:'any',chance:mode==='chance-zero'?0:1,tier:2,pos:{x:31,y:32}},{key:'house:folk1',pool:'any',pos:{x:33,y:34}}],camps:empty?[]:[{x:45,y:46}],garrisons:empty?[]:[{faction:'missing',pos:{x:1,y:1},size:[1,1]},{faction:'good',pos:{x:51,y:52},size:[2,3]}],landmarkSpawns:empty?[]:[{id:'missing',pos:{x:1,y:2}},{id:'guard',pos:{x:61,y:62},tier:2,ambush:{range:11},post:mode==='post-data'?{leash:12}:true,facing:0,rarity:'rare'}]};
 world.doodads=(empty?[]:[{pos:{x:1,y:2}},{pos:{x:3,y:4},door:{open:true}},{pos:{x:5,y:6},door:{mode:'locked'}},{pos:{x:7,y:8},door:{mode:'both',id:'door0',life:30}},{pos:{x:9,y:10},door:{mode:'breakable',id:'door1',life:0}}]) as any;
 if(mode==='fixed-day')Object.defineProperty(world,'time',{get(){throw Error('fixed day read time');}});
 if(mode==='account')Object.defineProperty(world,'ledger',{get(){throw Error('account unlock read run ledger');}});
 const oldMath=Math.random;Math.random=function(this:unknown){trace.push(['outer-draw',this===Math?'Math':this===undefined?'undefined':'other']);return .25;};const ownedMath=Math.random;let error;
 try{if(shared)(core as any)[stage](host,sources,def,layout);else originals[stage](...sourceNames.map(k=>sources[k])).call(host,def,layout);}catch(e){error=(e as Error).message;}finally{assert.equal(Math.random,ownedMath,'folk failures restore outer stream');Math.random=oldMath;}
 return{error,trace,made:clone(made),actors:clone(actors),speakers:clone([...speakerRows]),memory:[...memory],focus:[...focus],scene:world.dialogueScene,focusSpeaker:world.speechFocusSpeaker,seq};
}
for(const [stage,modes,fails] of [
 ['spawnNativeDoorGuards',['ordinary','empty'],[undefined,'factory']],
 ['spawnNativeFurniture',['ordinary','empty'],[undefined,'factory','clamp']],
 ['spawnNativeResidents',['ordinary','empty','account','run-ledger','gated','fixed-day','duplicate','empty-folk','chance-zero'],[undefined,'factory','find','clamp','leave','folk','speaker','speechSet']],
 ['spawnNativeFieldInhabitants',['ordinary','empty','no-packs','post-data'],[undefined,'factory','clamp','arm','promote']],
] as any){for(const mode of modes)for(const fail of fails){const a=run(false,stage,mode,fail),b=run(true,stage,mode,fail);assert.deepEqual(b,a,stage+' '+mode+' '+fail);checks++;entries+=a.trace.length;rows.push({stage,mode,fail,error:a.error,bodies:a.actors.length,made:a.made.length,trace:a.trace.length});}}
return {checks,entries};
}

export function checkNativeInhabitantAdapterOrder(getHost:(world:any)=>core.NativeInhabitantHost) {
 const tape:string[]=[];const target:any={actors:[],doodads:[{pos:{x:1,y:2},door:{mode:'breakable'}}]};
 const first=function(this:any,...args:any[]){assert.equal(this,target);assert.equal(args.length,3);tape.push('first factory');return {};};
 const second=function(){throw Error('replacement factory selected after level getter');};target.createMonster=first;
 const def={get level(){tape.push('level');target.createMonster=second;return 1;}};
 const source:any={FIXTURE_IDS:{door_timber:'door'},vec:(x:number,y:number)=>({x,y})};
 core.spawnNativeDoorGuards(getHost(target),source,def as any,{} as any);
 assert.deepEqual(tape,['level','first factory'],'read native callback before argument getter');
 let methods=0;
 for(const [name,args]of Object.entries({createMonster:['x',1,'enemy'],clampPos:[{x:1,y:2},11],findFreeSpot:[{x:1,y:2},11],nextSquadId:[],weightedPick:[[{id:'x',weight:1}]],armAmbush:[{},{}],promoteMonster:[{},'rare']})){
  let received:any[]|undefined;const owner:any={};
  owner[name]=function(this:any,...actual:any[]){assert.equal(this,owner);received=actual;return 'original';};
  const host=getHost(owner),selected=(host as any)[name];owner[name]=()=>{throw Error('late method reread '+name);};
  assert.equal(selected.apply(host,args),'original');assert.deepEqual(received,args,name+' exact original arity/receiver');methods++;
 }
 return {argumentReadOrder:true,methodSelections:methods};
}
