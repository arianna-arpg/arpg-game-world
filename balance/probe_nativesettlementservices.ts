/** Native settlement exact materialization course. Pinned original29 methods embedded below.
 * Cold processes preserve native item allocation IDs; no ignored file or Git dependency.
 * Current installed sources are trusted. No purchase/controller/theater admission claimed. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {massDormancyPins} from '../src/worldmass/dormancy';
import {makeSimWorld} from '../src/sim/arena';
import {World} from '../src/engine/world';
import {Rng,withSeededRandom} from '../src/core/rng';
import {FEATURE,gemDropKey} from '../src/meta/account';
import {START_ZONE} from '../src/data/zones';
import {VENDOR_CFG,VENDORS} from '../src/data/vendors';
import {TOWN_TIERS,TOWN_SITES,townStationFeatures} from '../src/data/townBuild';
import {SKILL_LIST} from '../src/data/skills';
import {SUPPORT_LIST} from '../src/data/supports';
import {makeSkillGem} from '../src/engine/skills';
import {mintSupportInstance} from '../src/engine/supportbase';
import {makeSkillGemItem,makeSupportGemItem} from '../src/engine/gemitems';
import {NativeAreaSceneSettlement} from '../src/worldmass/nativeAreaSceneSettlement';

const archiveBytes=gunzipSync(Buffer.from('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','base64'));
assert.equal(createHash('sha256').update(archiveBytes).digest('hex'),'32e8abb93df87d0f923677d9472b4926ca309f85cf230717d60815906cf20f23');
const archive=JSON.parse(archiveBytes.toString('utf8'));
const names:string[]=archive.methods.map((m:any)=>m.name);
const originals:any={};
const bindingNames:string[]=[],bindingValues:unknown[]=[];
for(const declaration of archive.imports){
 const parsed=ts.createSourceFile('imports.ts',declaration,ts.ScriptTarget.Latest,true).statements[0] as ts.ImportDeclaration;
 if(parsed.importClause?.isTypeOnly)continue;
 const path=(parsed.moduleSpecifier as ts.StringLiteral).text.replace('../../src/','../src/')+'.ts';
 const module=await import(new URL(path,import.meta.url).href);
 for(const item of (parsed.importClause!.namedBindings as ts.NamedImports).elements)if(!item.isTypeOnly){bindingNames.push(item.name.text);bindingValues.push(module[(item.propertyName??item.name).text]);}
}
for(const m of archive.methods){const method=m.text.replace(/^(private|public|protected)\s+/,'');const code=ts.transpileModule(archive.helper+'\nreturn function '+method,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;originals[m.name]=Function(...bindingNames,code)(...bindingValues);}
const childIndex=process.argv.indexOf('--native-settlement-child');
if(childIndex>=0) {
const mode=process.argv[childIndex+1],outputPath=process.argv[childIndex+2];
assert(['original','local','world'].includes(mode));
function snap(value:any):any {const seen=new Map<any,number>();function rec(v:any):any {
 if(v===undefined)return{$undefined:true};if(typeof v==='number'&&!Number.isFinite(v))return{$number:String(v)};
 if(typeof v==='function')return{$callable:true};if(v===null||typeof v!=='object')return v;
 if(seen.has(v))return{$ref:seen.get(v)};seen.set(v,seen.size);
 if(v instanceof Map)return{$map:[...v].map(([a,b])=>[rec(a),rec(b)])};if(v instanceof Set)return{$set:[...v].map(rec)};
 if(Array.isArray(v))return v.map(rec);return Object.fromEntries(Object.keys(v).map(k=>[k,rec(v[k])]));
 }return rec(value);}
const sha=(v:any)=>createHash('sha256').update(JSON.stringify(snap(v))).digest('hex');
const logs:any[]=[],rng:any[]=[],reads:any[]=[],calls:any[]=[];
const world:any=withSeededRandom(5517,()=>makeSimWorld('warrior',991));
for(const flag of townStationFeatures())world.account.features.add(flag);
withSeededRandom(809,()=>world.loadZone(START_ZONE));
const scene:any={zone:world.zone,player:world.player,actors:world.actors};
const geometry:any={state:scene,arena:world.arena};
const state:any={townTierIdx:world.townTierIndex(),mercOutpost:null};
const campaign:any={manifest:world.manifest,time:0,account:world.account,vendorHolds:{},mercSheets:{},charDirty:false,seats:world.seats,sim:{boroughField:{population:0}}};
const captain=world.mercOutpost?.captain;
assert(captain?.defId==='merc_captain','actual native town recruiter required');
const nativeBirth={zone:scene.zone.id,tier:state.townTierIdx,actors:scene.actors.map((a:any)=>({id:a.id,defId:a.defId,pos:a.pos})),arena:geometry.arena};
// The standing World provides fixture data only. No local operation can call it.
if(mode!=='world')for(const name of Object.getOwnPropertyNames(World.prototype))if(typeof Object.getOwnPropertyDescriptor(World.prototype,name)?.value==='function')Object.defineProperty(world,name,{value(){throw Error('FOREIGN WORLD METHOD '+name);},configurable:true});
const provider=(name:string,value:any)=>new Proxy(value,{get(target,key,recv){if(typeof key==='string')reads.push(['get',name,key]);return Reflect.get(target,key,recv);},set(target,key,v,recv){reads.push(['set',name,String(key),sha(v)]);return Reflect.set(target,key,v,recv);}});
const providers:any={scene:provider('scene',scene),geometry:null,campaign:provider('campaign',campaign),state:provider('state',state)};
geometry.state=providers.scene;providers.geometry=provider('geometry',geometry);
let api:any,host:any;
if(mode==='local') {api=new NativeAreaSceneSettlement(providers);host=api.host;for(const name of names){const fn=api[name];api[name]=(...args:any[])=>{calls.push([name,sha(args)]);return fn.apply(api,args);};}}
else {host=mode==='world'?world:{};api=mode==='world'?world:{};const fields:any={scene:['zone','player'],geometry:['arena'],state:['townTierIdx','mercOutpost'],campaign:['manifest','time','account','vendorHolds','mercSheets','charDirty','seats','sim']};for(const [p,keys]of Object.entries(fields))for(const key of keys as string[])Object.defineProperty(host,key,{configurable:true,get(){return providers[p][key];},set(v){providers[p][key]=v;}});for(const name of names){const fn=mode==='world'?(World.prototype as any)[name]:originals[name];api[name]=(...args:any[])=>{calls.push([name,sha(args)]);return fn.apply(host,args);};if(mode!=='world'&&archive.roots.includes(name))Object.defineProperty(host,name,{get(){return api[name];}});}}

reads.length=0;calls.length=0;
const next=Rng.prototype.next,ids=new WeakMap<object,number>();let nextId=0;
Rng.prototype.next=function(){if(!ids.has(this))ids.set(this,++nextId);const before=this.snapshot(),v=next.call(this);rng.push([ids.get(this),before,v,this.snapshot()]);return v;};
const outer=Math.random,sentinel=new Rng(713);let outerDraws=0;const die=()=>{outerDraws++;return sentinel.next();};Math.random=die;
const warn=console.warn;const warnings:string[]=[];console.warn=(...v)=>warnings.push(v.join(' '));
function run(name:string,fn:()=>any){const r0=reads.length,c0=calls.length,d0=rng.length,w0=warnings.length;let out:any,error:any;try{out=fn();}catch(e){error=String(e);}logs.push({name,out:snap(out),error,reads:reads.slice(r0),calls:calls.slice(c0),rng:rng.slice(d0),warnings:warnings.slice(w0),holds:snap(campaign.vendorHolds),sheets:snap(campaign.mercSheets),dirty:campaign.charDirty,dieRestored:Math.random===die});assert.equal(Math.random,die);}
try {
 campaign.account.features.clear();
 run('fresh-gated-brandt',()=>api.armVendorStock('brandt'));
 campaign.account.features.add(FEATURE.VENDOR_GEMS);campaign.account.features.add(FEATURE.BRANDT_SELL_SUPPORTS);campaign.account.features.add(FEATURE.UNLOCK_ALL_GEMS);scene.player.level=38;
 for(const row of [...VENDOR_CFG.wares.ladder,...VENDOR_CFG.quality.ladder,...VENDOR_CFG.restock.ladder])campaign.account.features.add(row.flag);
 for(const row of VENDORS)for(const u of row.stockPolicy?.upgrades??[])campaign.account.features.add(u.feature);
 campaign.sim.boroughField.population=54;
 const sg=makeSkillGem(SKILL_LIST.find(s=>!s.noDrop)!,1,'magic'),sd=SUPPORT_LIST[0];sg.sockets[0]=mintSupportInstance(sd,1);
 campaign.seats[0].actor.skills[0]=sg;campaign.seats[0].meta.items.push(makeSkillGemItem(sg),makeSupportGemItem(mintSupportInstance(sd,1)));
 run('party-bag-bar-socket-carry',()=>api.carriedGemIds());
 let first:any[]=[];run('advanced-full-native-stock',()=>first=api.armVendorStock('brandt'));
 assert(first.some(e=>e.kind==='skill'));assert(first.some(e=>e.kind==='item'&&e.item.mem));
 const held=first.find(e=>e.kind==='item'&&!e.item.mem)!;assert(held);
 campaign.vendorHolds.brandt={locks:[{entry:held,idx:999},{entry:first[0],idx:999}],watchedSec:0};
 let shelf:any[]=[];run('rearm-held-object-identity',()=>{shelf=api.armVendorStock('brandt');assert(shelf.includes(held));assert.equal(shelf.find(e=>e===held),held);return{stock:shelf,identity:shelf.includes(held)};});
 run('sync-shifted-hold-indices',()=>{shelf.reverse();api.syncHoldIdx('brandt',shelf);return campaign.vendorHolds.brandt;});
 campaign.time=api.restockSeconds()+1;run('next-beat-retains-held-items',()=>{const s=api.armVendorStock('brandt');assert(s.includes(held));return s;});
 run('chandler-separate-counter',()=>api.armVendorStock('chandler'));
 run('native-unknown-counter-fallback',()=>api.armVendorStock('review-unregistered-counter'));
 run('native-half-shelves',()=>[api.buildVendorStock({gems:false}),api.buildVendorStock({gear:false}),api.buildVendorStock({gems:false,gear:false})]);
 const borough=campaign.sim.boroughField;campaign.sim.boroughField=null;
 run('native-null-borough-explicit-loot-floor-and-defaults',()=>{
  const floor={skills:new Set([SKILL_LIST.find(s=>!s.noDrop&&(s.minDropLevel??0)<=scene.zone.level)!.id]),supports:new Set([SUPPORT_LIST[0].id])};
  const gear=api.buildVendorStock({gems:false});const skill=api.rollSkillGem(['projectile'],undefined,floor,'magic');const support=api.rollSupportDropGated(['projectile'],undefined,floor);
  assert(skill.def&&skill.level===1);return{gear,skill,support};
 });campaign.sim.boroughField=borough;
 run('generic-native-gem-weight-edges',()=>{
  const pool=[{id:'negative',w:-3,tags:['fire']},{id:'zero',w:0,tags:[]},{id:'positive',w:7,tags:['projectile']}];
  const weights=api.gemWeights(pool,(x:any)=>x.tags,(x:any)=>x.w,['projectile'],(x:any)=>x.id==='positive');
  assert.equal(api.pickGem([],(x:any)=>x.tags,(x:any)=>x.w),null);
  assert.equal(api.pickGem(pool,()=>[],()=>0),pool[0]);
  return{weights,pick:api.pickGem(pool,(x:any)=>x.tags,(x:any)=>x.w,['projectile'],(x:any)=>x.id==='positive')};
 });
 const illegal={kind:'skill',inst:makeSkillGem(SKILL_LIST.find(s=>!s.noDrop)!,1,'legendary')};campaign.account.features.clear();campaign.vendorHolds.brandt={locks:[{entry:illegal,idx:0}],watchedSec:campaign.time};campaign.charDirty=false;
 run('retuned-policy-releases-illegal-hold',()=>{const s=api.armVendorStock('brandt');assert.equal(campaign.vendorHolds.brandt.locks.length,0);assert(campaign.charDirty);return s;});
 const cskill=SKILL_LIST.find(s=>!s.noDrop&&(s.minDropLevel??0)<=38)!;
 campaign.account.features.add(FEATURE.UNLOCK_ALL_GEMS);campaign.account.features.add(FEATURE.VENDOR_GEMS);campaign.account.features.add(FEATURE.BRANDT_SELL_SUPPORTS);campaign.account.ledger[gemDropKey(cskill.id)]=999;
 campaign.vendorHolds.brandt={locks:[],commission:{kind:'skill',id:cskill.id},watchedSec:0};campaign.time=api.restockSeconds()*VENDOR_CFG.commission.maxCatchup;
 run('native-positive-skill-commission',()=>{api.resolveCommission('brandt');assert(campaign.vendorHolds.brandt.locks.some((r:any)=>r.commission));return campaign.vendorHolds.brandt;});
 const csupport=SUPPORT_LIST.find(s=>s.weight>0&&(s.minDropLevel??0)<=38)!;campaign.account.ledger[gemDropKey(csupport.id)]=999;
 campaign.vendorHolds.chandler={locks:[],commission:{kind:'support',id:csupport.id},watchedSec:0};
 run('native-positive-support-commission',()=>{api.resolveCommission('chandler');assert(campaign.vendorHolds.chandler.locks.some((r:any)=>r.commission));return campaign.vendorHolds.chandler;});
 campaign.vendorHolds.denied={locks:[],commission:{kind:'skill',id:cskill.id},watchedSec:0};campaign.account.features.clear();campaign.account.memorySecondary.clear();
 run('native-ineligible-commission',()=>{api.resolveCommission('denied');assert.equal(campaign.vendorHolds.denied.locks.length,0);return campaign.vendorHolds.denied;});
 campaign.account.features.add(FEATURE.UNLOCK_ALL_GEMS);campaign.vendorHolds.zerosupport={locks:[],commission:{kind:'support',id:csupport.id},watchedSec:0};
 run('eligible-support-zero-native-odds',()=>{assert.equal(api.commissionOdds(campaign.vendorHolds.zerosupport.commission),0);api.resolveCommission('zerosupport');assert.equal(campaign.vendorHolds.zerosupport.locks.length,0);return campaign.vendorHolds.zerosupport;});
 run('registry-missing-commission-mint',()=>[api.mintCommissionEntry({kind:'skill',id:'absent'},new Rng(55)),api.mintCommissionEntry({kind:'support',id:'absent'},new Rng(66))]);
 run('fresh-recruiter-sheet',()=>{api.armLastlightRecruiter(captain,scene.zone.id);assert.equal(state.mercOutpost.captain,captain);assert.equal(state.mercOutpost.offers,campaign.mercSheets[scene.zone.id]);return{offers:state.mercOutpost.offers,title:state.mercOutpost.title,pitch:state.mercOutpost.pitch,port:state.mercOutpost.port};});
 const sheet=campaign.mercSheets[scene.zone.id];sheet.shift();campaign.charDirty=false;
 run('reentry-never-rerolls-sheet',()=>{api.armLastlightRecruiter(captain,scene.zone.id);assert.equal(state.mercOutpost.offers,sheet);assert.equal(campaign.charDirty,false);return sheet;});
 sheet.push({kind:'retired',refId:'retired-gone',name:'gone',classId:'warrior',blurb:''},{kind:'retired',refId:'retired-present',name:'present',classId:'warrior',blurb:''});campaign.account.mercRoster.push({mercId:'retired-present'});
 run('retired-offer-reconciliation',()=>{api.armLastlightRecruiter(captain,scene.zone.id);assert(!sheet.some((s:any)=>s.refId==='retired-gone'));assert(sheet.some((s:any)=>s.refId==='retired-present'));assert(campaign.charDirty);return sheet;});
 run('all-native-town-tiers-and-sites',()=>{const result=[];for(let tier=0;tier<TOWN_TIERS.length;tier++){state.townTierIdx=tier;geometry.arena={kind:'rect',w:TOWN_TIERS[tier].w,h:TOWN_TIERS[tier].h};for(const site of TOWN_SITES)result.push([tier,site.id,api.townSeat(site.id,13,-7)]);}return result;});
 run('adopted-town-tier-independent-of-unlocks',()=>{const before=api.townSeat('recruiter');campaign.account.features.clear();assert.deepEqual(api.townSeat('recruiter'),before);return before;});
 const goodBuild=api.buildVendorStock;api.buildVendorStock=(...args:any[])=>{goodBuild(...args);throw Error('AFTER NATIVE STOCK ALLOCATION');};
 run('post-allocation-failure-restores-global-random',()=>api.armVendorStock('brandt'));api.buildVendorStock=goodBuild;
 const oldMint=api.mercSheetFor;api.mercSheetFor=(_zoneId:string,mint:()=>any)=>{mint();throw Error('AFTER NATIVE OFFERS BEFORE PUBLISH');};const oldOutpost=state.mercOutpost;
 run('recruiter-failure-keeps-previous-local-officer',()=>api.armLastlightRecruiter(captain,'new-district'));assert.equal(state.mercOutpost,oldOutpost);api.mercSheetFor=oldMint;
 // Every public source root stays lazy after binding. Replacement affects the next native call.
 const priorAccount=campaign.account;campaign.account={...priorAccount,features:new Set([FEATURE.VENDOR_GEMS])};run('live-account-replacement',()=>api.vendorGemsOpen());campaign.account=priorAccount;
 run('external-random-sentinel',()=>Math.random());
} finally {Math.random=outer;Rng.prototype.next=next;console.warn=warn;}
assert.deepEqual(logs.filter(x=>x.error).map(x=>x.name),['post-allocation-failure-restores-global-random','recruiter-failure-keeps-previous-local-officer'],'unexpected case assertion or native failure');
const output={nativeBirth,logs,rngCount:rng.length,readCount:reads.length,callCount:calls.length,outerDraws};
fs.writeFileSync(outputPath,JSON.stringify(output));console.log(JSON.stringify({mode,cases:logs.length,rng:rng.length,reads:reads.length,calls:calls.length,outerDraws,errors:logs.filter(x=>x.error).map(x=>[x.name,x.error])}));


} else {
 const coreText=readFileSync(new URL('../src/engine/nativeSettlementServices.ts',import.meta.url),'utf8');
 const coreFile=ts.createSourceFile('native.ts',coreText,ts.ScriptTarget.Latest,true);
 for(const m of archive.methods){
  const fn=coreFile.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='settlement'+m.name[0].toUpperCase()+m.name.slice(1)) as ts.FunctionDeclaration;
  const old=ts.createSourceFile('original.ts','class Original{'+m.text+'}',ts.ScriptTarget.Latest,true).statements[0] as ts.ClassDeclaration;
  const method=old.members[0] as ts.MethodDeclaration;let expected=method.body!.getText();const edits:[number,number][]=[];
  function walk(n:ts.Node){if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push([n.getStart()-method.body!.getStart(),n.end-method.body!.getStart()]);ts.forEachChild(n,walk);}walk(method.body!);
  for(const[a,b]of edits.reverse())expected=expected.slice(0,a)+'host'+expected.slice(b);
  assert.equal(fn.body!.getText(coreFile).replace(/\r/g,''),expected.replace(/\r/g,''),m.name+' exact original operation');
 }
 console.log('PASS settlement29 complete original bodies including strings and comments');
 const directory=mkdtempSync(join(tmpdir(),'native-settlement-'));
 try {
  const outputs:any[]=[];
  for(const mode of ['original','local','world']){
   const target=join(directory,mode+'.json');
   const child=spawnSync(process.execPath,[resolve('node_modules/tsx/dist/cli.mjs'),fileURLToPath(import.meta.url),'--native-settlement-child',mode,target],{encoding:'utf8',maxBuffer:4*1024*1024});
   if(child.status!==0)throw Error(mode+' child failed: '+child.stdout+'\n'+child.stderr);
   outputs.push(JSON.parse(readFileSync(target,'utf8')));
  }
  function paired(x:any,y:any,path='root'):void {if(Object.is(x,y))return;if(!x||!y||typeof x!=='object'||typeof y!=='object')throw Error('native settlement difference '+path+': '+JSON.stringify([x,y]));assert.deepEqual(Object.keys(x),Object.keys(y),'keys '+path);for(const k of Object.keys(x))paired(x[k],y[k],path+'.'+k);}
  paired(outputs[1],outputs[0]);paired(outputs[2],outputs[0]);
  const result=outputs[0];console.log('PASS native settlement original/local/actual-World',JSON.stringify({cases:result.logs.length,draws:result.rngCount,providerReads:result.readCount,operationCalls:result.callCount,nativeTownTier:result.nativeBirth.tier,nativeBodies:result.nativeBirth.actors.length,fullNativeUIDs:true,pinned:archive.head}));
 } finally {rmSync(directory,{recursive:true,force:true});}
 const scene:any={},geometry:any={state:scene,arena:{w:11,h:13}},state:any={},campaign:any={};
const input:any={scene,geometry,state,campaign};
let count=0,getterReads=0;
for(const key of Object.keys(input))for(const mode of ['missing','inherited','getter','null']) {
 const bad:any={...input};delete bad[key];
 if(mode==='inherited')Object.setPrototypeOf(bad,{[key]:input[key]});
 if(mode==='getter')Object.defineProperty(bad,key,{get(){getterReads++;return input[key];}});
 if(mode==='null')bad[key]=null;
 assert.throws(()=>new NativeAreaSceneSettlement(bad),new RegExp('own object binding: '+key));count++;
}
assert.equal(getterReads,0);assert.throws(()=>new NativeAreaSceneSettlement({...input,geometry:{...geometry,state:{}}}),/identity/);count++;
const lazy=new Proxy(campaign,{get(){throw Error('campaign eagerly read');}});new NativeAreaSceneSettlement({...input,campaign:lazy});count++;
const mutable={...input},owner:any=new NativeAreaSceneSettlement(mutable);
for(const key of Object.keys(input)){mutable[key]={};assert.equal(owner.input[key],input[key]);count++;}
assert(Object.isFrozen(owner.input)&&Object.isFrozen(owner.host));assert.throws(()=>{owner.host={};});assert.throws(()=>{owner.input={};});count+=3;
let selections=0;
for(const key of archive.roots.filter((k:string)=>archive.methods.some((m:any)=>m.name===k))){
 const prior=owner[key];let receiver:any,calls=0;
 owner[key]=function(this:any,...args:any[]){receiver=this;calls++;return args;};
 const selected=owner.host[key];owner[key]=()=>{throw Error('late method lookup');};
 assert.deepEqual(selected('captured',17),['captured',17]);assert.equal(calls,1);assert.equal(receiver,owner);selections++;
 owner[key]=prior;
}
// Field setters stay on the real retained campaign/state roots after their binding is sealed.
owner.host.charDirty=true;assert.equal(campaign.charDirty,true);owner.host.mercOutpost={title:'retained'};assert.equal(state.mercOutpost.title,'retained');count+=2;
console.log('PASS settlement binding guards',count,'selections',selections);
let cachedSelections=0;
withSeededRandom(61991,()=>{
 const world:any=makeSimWorld('warrior',61991),actor=world.createMonster('zombie',10,'enemy');
 world.actors=[world.player,actor];const owned=new Map([['settlement-cache-witness',actor]]);
 assert.equal(massDormancyPins(world,owned).has(actor),false);
 const host=world.nativeSettlementHost();assert.equal(host,world.nativeSettlementHost());
 assert.equal(Object.getOwnPropertyDescriptor(world,'nativeSettlementView')?.enumerable,false);
 assert.ok(!Object.keys(world).includes('nativeSettlementView'));
 assert.equal(massDormancyPins(world,owned).has(actor),false);
 world.player.aiTargetId=actor.id;assert.equal(massDormancyPins(world,owned).has(actor),true);world.player.aiTargetId=-1;
 for(const name of archive.roots.filter((k:string)=>names.includes(k))){
  const prior=Object.getOwnPropertyDescriptor(world,name),calls:any[]=[],argument={name};
  try{
   Object.defineProperty(world,name,{configurable:true,writable:true,value:function(this:unknown,...args:unknown[]){calls.push(['old',this===world,args]);return 'old';}});
   const selected=host[name];
   Object.defineProperty(world,name,{configurable:true,writable:true,value:function(this:unknown,...args:unknown[]){calls.push(['new',this===world,args]);return 'new';}});
   assert.equal(selected(argument),'old');assert.equal(host[name](argument),'new');assert.deepEqual(calls,[['old',true,[argument]],['new',true,[argument]]]);cachedSelections++;
  }finally{if(prior)Object.defineProperty(world,name,prior);else delete world[name];}
 }
});assert.equal(cachedSelections,25);console.log('PASS actual World settlement cache',cachedSelections,'selection/receiver and genuine dormant-pin controls');

}
