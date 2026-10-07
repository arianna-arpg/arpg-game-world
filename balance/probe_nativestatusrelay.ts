import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom,mulberry32} from '../src/sim/rng';
import {resetActorIdCounter,type Actor} from '../src/engine/actor';
import {World} from '../src/engine/world';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {STATUS_RELAY_IDS,STATUS_RELAYS,relayStatusStat,registerStatusRelay} from '../src/engine/reception';
import {sameStory} from '../src/engine/tiers';
import {dist} from '../src/core/math';
import {mod} from '../src/engine/stats';
import {nativeRelayStatus} from '../src/engine/nativeStatusRelay';
// Complete original source pinned inline: no Git or ignored-file dependency.
const archived = {
  "revision": "8dcfa9e1accb1d9fa90dc9e65416513e354befbe",
  "worldSHA256": "67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc",
  "property": "private relayStatus: NonNullable<Actor['statusRelay']> = (owner, args) => {\n    if (owner.dead || owner.downed) return false;\n    for (const id of owner.sheet.armedFamily('relayStatus_', STATUS_RELAY_IDS)) {\n      const relay = STATUS_RELAYS[id];\n      if (relay.status !== args[0] || owner.sheet.get(relayStatusStat(id)) <= 0) continue;\n      let nearest: Actor | undefined, reach = relay.radius;\n      for (const enemy of this.enemiesOf(owner)) {\n        if (!sameStory(owner, enemy) || enemy.dead || enemy.untargetable || enemy.invulnerable || enemy.passive) continue;\n        const d = dist(owner.pos, enemy.pos);\n        if (d < reach) { reach = d; nearest = enemy; }\n      }\n      if (!nearest) continue; // No recipient: the original application lands normally.\n      nearest.applyStatus(args[0], args[1], args[2], owner.name,\n        { ...args[4], casterId: owner.id, relayed: true });\n      return true;\n    }\n    return false;\n  };",
  "propertySHA256": "3a160328152fa25436147dfad527adfcd259b5921a164c90d26d04216bdf6338"
};
assert.equal(createHash('sha256').update(archived.property).digest('hex'),'3a160328152fa25436147dfad527adfcd259b5921a164c90d26d04216bdf6338');
const js=ts.transpileModule('class Archived {\n'+archived.property+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const oldAST=ts.createSourceFile('old.ts','class C{'+archived.property+'}',ts.ScriptTarget.Latest,true),coreAST=ts.createSourceFile('core.ts',readFileSync(new URL('../src/engine/nativeStatusRelay.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true});
const body=(coreAST.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='nativeRelayStatus') as ts.FunctionDeclaration).body!;
const restored=printer.printNode(ts.EmitHint.Unspecified,body,coreAST).replace(/\(0, sources\.([A-Za-z0-9_]+)\)/g,'$1').replace(/sources\./g,'').replace(/host\./g,'this.');
const norm=ts.createSourceFile('norm.ts','class C{f()'+restored+'}',ts.ScriptTarget.Latest,true);assert.equal(printer.printNode(ts.EmitHint.Unspecified,(((oldAST.statements[0] as ts.ClassDeclaration).members[0] as ts.PropertyDeclaration).initializer as ts.ArrowFunction).body,oldAST),printer.printNode(ts.EmitHint.Unspecified,((norm.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration).body!,norm));
bootSimEngine();seedGlobalRandom(719);const w=makeSimWorld('warrior',719),nativeRelayIds=STATUS_RELAY_IDS.slice();assert.ok(nativeRelayIds.includes('grounding'));
const originalSources={STATUS_RELAY_IDS,STATUS_RELAYS,relayStatusStat,sameStory,dist};
let pairs=0,wrapperPairs=0,entries=0;
function run(core:boolean|'wrapper',i:number,id='grounding',tableIds=STATUS_RELAY_IDS,armIds=[id]){
 const tape:unknown[]=[],rng=mulberry32(719),previous=Math.random;Math.random=rng;resetActorIdCounter(81000);
 const owner=w.createMonster('goblin_brute',20,'player'),a=w.createMonster('zombie',20,'enemy'),b=w.createMonster('zombie',20,'enemy');const actors=[owner,a,b];
 owner.pos={x:0,y:0};a.pos={x:100,y:0};b.pos={x:-100,y:0};const relay=STATUS_RELAYS[id];owner.sheet.setSource('relay',armIds.map(armed=>mod(relayStatusStat(armed),'flat',1)));
 let source:any={...originalSources,STATUS_RELAY_IDS:tableIds};for(const key of ['relayStatusStat','sameStory','dist']){const fn=(source as any)[key];source[key]=function(this:unknown,...args:any[]){assert.equal(this,undefined,'native relay source receiver '+key);tape.push(['source',key,args.map(x=>x&&typeof x==='object'?x.id??[x.x,x.y]:x)]);return fn(...args);};}
 const Old=new Function(...Object.keys(source),'"use strict";'+js+';return Archived;')(...Object.values(source));
 const originalEnemies=w.enemiesOf,originalProvider=(World as any).nativeStatusRelaySources;const host:any=core==='wrapper'?w:core?{}:new Old();if(core==='wrapper')(World as any).nativeStatusRelaySources=()=>source;host.enemiesOf=function(who:Actor){assert.equal(this,host);assert.equal(who,owner);tape.push(['enemies',who.id]);if(i===16)throw Error('enemies failure');return i===20?[a,a,b]:[a,b];};
 owner.statusRelay=core===true?(target,args)=>nativeRelayStatus(host,source,target,args):host.relayStatus;
 // Relayed true must prevent a real recipient's capability from running again.
 for(const target of [a,b]){target.sheet.setSource('relay',[mod(relayStatusStat(id),'flat',1)]);target.statusRelay=()=>{throw Error('recursive relay');};const apply=target.applyStatus;target.applyStatus=function(...args){assert.equal(this,target);tape.push(['apply',target.id,args]);if(i===17){apply.apply(this,args);throw Error('after apply failure');}return apply.apply(this,args);};}
 const args:Parameters<Actor['applyStatus']>=[relay.status,12,1.75,'external origin',i===0?undefined:{casterId:123,power:1.5,stacksBonus:2,propagates:true,challengeField:5,sourceKey:'same-source',holdDischarge:true}];
 if(i===1)a.pos=b.pos={x:relay.radius,y:0};if(i===2)owner.dead=true;if(i===3)owner.downed=true;if(i===4)args[0]='burn';if(i===5)owner.sheet.removeSource('relay');
 if(i===6)a.dead=true;if(i===7)a.untargetable=true;if(i===8)a.invulnerable=true;if(i===9)a.passive=true;if(i===10)a.tier=1;
 if(i===11){a.sheet.setSource('immune',[mod('debuffImmunity','flat',1)]);}
 if(i===12){a.dead=b.dead=true;}
 if(i===13){a.pos.x=relay.radius+1;b.pos.x=relay.radius-.25;}
 if(i===14){owner.pos.x=200;a.pos.x=201;b.pos.x=201;}
 if(i===15){a.sheet.setSource('expires',[mod('afflictionExpiry','more',1)]);}
 if(i===18)Object.defineProperty(args,0,{get(){tape.push(['args.status']);return relay.status;}});
 if(i===19&&args[4])Object.defineProperty(args[4],'power',{enumerable:true,get(){tape.push(['options.power']);return 1.5;}});
 const optionsBefore=structuredClone(args[4]);let result:boolean|undefined,error:string|undefined;
 try{result=core===true?nativeRelayStatus(host,source,owner,args):host.relayStatus(owner,args);}catch(e){error=(e as Error).message;}
 assert.deepEqual(args[4],optionsBefore,'relay does not mutate incoming options');
 for(const target of [a,b])Reflect.deleteProperty(target,'applyStatus'); // Remove only the temporary method instrumentation before complete state capture.
 const state=actors.map(a=>captureNativeActorState(a));assert.ok(state.every(Boolean));const output={result,error,tape,states:state,next:rng()};Math.random=previous;w.enemiesOf=originalEnemies;(World as any).nativeStatusRelaySources=originalProvider;return output;
}
for(const id of nativeRelayIds)for(let i=0;i<21;i++){const a=run(false,i,id),b=run(true,i,id);assert.deepEqual(b,a,id+' case '+i);assert.deepEqual(run('wrapper',i,id),a,id+' World '+i);wrapperPairs++;pairs++;entries+=a.tape.length;
 if(i===0){assert.equal(b.result,true);assert.equal((b.tape.find(x=>(x as any[])[0]==='apply') as any[])[1],81001,'first nearest tie');}
 if(i===1)assert.equal(b.result,false,'strict native reach');if(i===11)assert.equal(b.result,true,'native relay claims applied recipient despite internal immunity');if(i===17){assert.equal(b.error,'after apply failure');assert.ok((b.states[1] as any),'partial mutated body retained');}}
// Ordered registry data controls supplement the actual grounding relay.
registerStatusRelay({id:'independent_first',status:'shock',radius:90,name:'First'});registerStatusRelay({id:'independent_second',status:'shock',radius:180,name:'Second'});
for(const order of [['independent_first','independent_second'],['independent_second','independent_first']]){const old=run(false,0,order[1],order,order),now=run(true,0,order[1],order,order);assert.deepEqual(now,old);assert.deepEqual(run('wrapper',0,order[1],order,order),old);wrapperPairs++;assert.equal(now.result,true);pairs++;entries+=old.tape.length;}
const first=run(true,0),middle=run(true,12),last=run(true,0);assert.equal(middle.result,false);assert.deepEqual(last,first,'independent staged relay A/B/A');
const result={pass:true,original:archived.revision,propertySHA256:archived.propertySHA256,astPairs:1,nativeRelayIds,pairs,wrapperPairs,orderedEntries:entries,directLexicalReceivers:true,fullBodies:true,independentABA:true,coreSHA256:createHash('sha256').update(readFileSync(new URL('../src/engine/nativeStatusRelay.ts',import.meta.url))).digest('hex'),limits:'Exact shared immediate relay operation; explicit staged enemies callback and actual Actor.applyStatus/source registry remain trusted. No source issuer or runtime binding.'};console.log(JSON.stringify(result,null,2));
