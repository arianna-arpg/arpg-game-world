import {beforeMuReliquary} from './muReliquarySourceFixture';
import {beforeNativeMainVisualSource as historicalMainVisualSource} from './nativeMainVisualSourceFixture';
import {beforeNativeCombatLeafVisual} from './nativeCombatLeafVisualFixture';
import {nativeCombatLeafVisualArchive as currentLeafArchive} from './nativeCombatLeafVisualArchive';
import {createHash as currentLeafHash} from 'node:crypto';
function beforeNativeMainVisualSource(file:string,source:string):string {
 let prior=beforeNativeCombatLeafVisual(file,source);
 // Preserve the separately committed Mu rule for the original HEAD guard.
 if(file==='src/engine/nativeSceneProgression.ts'){
  const mu=currentLeafArchive.files.find(row=>row.file===file)!.edits.filter(edit=>edit.after.includes('relicPowerActive')&&!edit.before.includes('relicPowerActive'));
  assert.equal(mu.length,2,'exact committed Mu import and fold hunks');
  for(const edit of mu){assert.equal(prior.split(edit.before).length,2,'unique prior Mu hunk');prior=prior.replace(edit.before,edit.after);}
  assert.equal(prior,execFileSync('git',['show','484f926385acb033c36d084d14125b17a23f3be6:'+file],{encoding:'utf8',maxBuffer:20e6}).replaceAll('\r\n','\n'),'complete ownership reversal retains exact committed Mu source');
 }
 return historicalMainVisualSource(file,prior);
}
{
 const file='src/engine/nativeSceneProgression.ts',raw=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replaceAll('\r\n','\n'),row=currentLeafArchive.files.find(row=>row.file===file)!;
 const hash=(text:string)=>currentLeafHash('sha256').update(text).digest('hex');
 assert.equal(hash(raw),row.afterHash,'exact current reviewed leaf source');assert.equal(hash(beforeNativeCombatLeafVisual(file,raw)),row.beforeHash,'complete exact leaf predecessor');
 for(const edit of row.edits){assert.equal(raw.split(edit.after).length,2,'unique current leaf hunk');const changed=raw.replace(edit.after,edit.after.replace(/[A-Za-z]/,'!'));assert.notEqual(changed,raw,'nontrivial current leaf mutation');assert.throws(()=>beforeNativeCombatLeafVisual(file,changed));assert.throws(()=>beforeNativeCombatLeafVisual(file,raw+'\n'+edit.after));}
 const outside=raw+'\n/* unknown outside leaf change */';assert.ok(beforeNativeCombatLeafVisual(file,outside).endsWith('/* unknown outside leaf change */'));assert.notEqual(hash(beforeNativeCombatLeafVisual(file,outside)),row.beforeHash);
 console.log('PASS current leaf source controls: '+row.edits.length+' mutations/duplicates; unrelated source remains visible');
}
import {nativeMainVisualSourceArchive as visualArchive} from './nativeMainVisualSourceArchive';
import {presenceProfile,skillPresenceVoice,PRESENCE_STYLE} from '../src/data/skillPresenceVisuals';
/** Native progression parity proof. Combat calls in this harness use an explicitly registered,
 * genuine native World test driver with this area's actual census/queues. This is
 * test evidence for progression effects, not a production area-combat implementation. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {World,type Seat} from '../src/engine/world';
import {Actor} from '../src/engine/actor';
import {LitePool} from '../src/engine/lite';
import {makeSimWorld} from '../src/sim/arena';
import {Rng,withSeededRandom} from '../src/core/rng';
import {mod} from '../src/engine/stats';
import {STATUS_RELAYS,relayStatusStat} from '../src/engine/reception';
import {makeSkillInstance,skillGrantStat} from '../src/engine/skills';
import {companionGrantStat} from '../src/engine/companionGrants';
import {SKILLS} from '../src/data/skills';
import {CLASSES} from '../src/data/classes';
import {captureNativeActorState} from '../src/worldmass/dormancy';
import {NativeAreaSceneObjectiveCompletion} from '../src/worldmass/nativeAreaSceneObjectiveCompletion';
import {NativeAreaActorAuthority} from '../src/worldmass/nativeAreaActorAuthority';
import {freshAssemblyInput,NativeAreaSceneAssembly} from './nativeFreshAssemblyFixture';
import {NativeAreaSceneProgression,freshSceneProgressionState,type NativeSceneProgressionRuntime} from '../src/worldmass/nativeAreaSceneProgression';
import * as core from '../src/engine/nativeSceneProgression';

import {nativeSceneProgressionArchive as archive,nativeSceneProgressionArchiveHash} from './nativeSceneProgressionArchive';
import {beforeNativeMainContent} from './nativeMainContentFixture';
import {beforeNativeSceneProgression,beforeNativeProgressionDeclarations,beforeNativeProgressionController} from './nativeSceneProgressionFixture';
const cap=(s:string)=>s[0].toUpperCase()+s.slice(1),sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const parse=(s:string)=>ts.createSourceFile('proof.ts',s,99,true);
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const read=(s:string)=>fs.readFileSync(new URL(s,import.meta.url),'utf8').replaceAll('\r\n','\n');
function classOf(source:string){const sf=parse(source),cl=sf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;return {sf,cl};}
assert.equal(sha(JSON.stringify(archive)),nativeSceneProgressionArchiveHash,'immutable progression archive');
const current=classOf(beforeNativeMainContent(read('../src/engine/world.ts'))),source=parse(beforeMuReliquary(beforeNativeMainVisualSource('src/engine/nativeSceneProgression.ts',read('../src/engine/nativeSceneProgression.ts')), 'fold'));
assert.equal(sha(JSON.stringify(current.cl.members.map(m=>m.getText(current.sf)))),archive.worldHash,'all original World members after strict normalization');
if(process.argv.includes('--provenance')){
 const git=execFileSync('git',['show',archive.commit+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:12e6}).replaceAll('\r\n','\n'),prior=classOf(git);
 assert.equal(sha(JSON.stringify(prior.cl.members.map(m=>m.getText(prior.sf)))),archive.worldHash,'immutable Git World');
 for(const row of archive.rows)assert.equal(prior.cl.members.find(m=>m.name?.getText(prior.sf)===row.name)?.getText(prior.sf),'baselineBefore' in row?row.baselineBefore:row.before,'Git method '+row.name);
 for(const row of archive.globals){const original=execFileSync('git',['show',archive.commit+':'+row.file],{encoding:'utf8',maxBuffer:12e6}),sf=parse(original);assert.equal(sf.statements.find(n=>(n as any).name?.text===row.name)?.getText(sf).replaceAll('\r\n','\n'),row.before,'Git global '+row.name);}
}
function receiverBody(body:ts.Block,sf:ts.SourceFile){let text=body.getText(sf),start=body.getStart(sf);const edits:number[][]=[];function visit(n:ts.Node){if(n.kind===ts.SyntaxKind.ThisKeyword)edits.push([n.getStart(sf)-start,n.getEnd()-start]);ts.forEachChild(n,visit);}visit(body);for(const [a,b]of edits.reverse())text=text.slice(0,a)+'nativeHost'+text.slice(b);return text;}
for(const row of archive.rows){
 assert.equal(current.cl.members.find(m=>m.name?.getText(current.sf)===row.name)?.getText(current.sf),'baselineBefore' in row?row.baselineBefore:row.before,'current method '+row.name);
 const old=parse('class X{'+row.before+'}'),method=(old.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='scene'+cap(row.name)) as ts.FunctionDeclaration;
 assert.equal(emit('function f()'+fn.body!.getText(source)),emit('function f()'+receiverBody(method.body!,old)),'exact executable '+row.name);
}
// Exact reviewed v15 status-observer layers; immutable original controllers remain checked below.
const controllerOwnership=[
  {
    "file": "attackSequences",
    "beforeHash": "2145123b0fb392aceac3f563aa0d5056ff32795fb68384655c07a3152e45fe4d",
    "afterHash": "0383eb4ff4c4da3590b6f38a5e1fb4adada85517aeced21a72d13abca6c9e0ef",
    "edits": [
      {
        "before": "",
        "after": "import {observeNativeCombatStatus,observeNativeCombatStatusSource} from './nativeCombatRecordObservation';\n"
      },
      {
        "before": "target.applyStatus(id, dps, duration, inst.def.name, { casterId: s.owner.id, sourceKey, holdDischarge,\n      rupture: rupture > 0 ? rupture : undefined, ruptureType: sd.element,\n      stacksBonus: Math.round(s.owner.sheet.get('ailmentStacks', tags, extra)),\n      leech: s.owner.sheet.get('dotLeech_' + id, tags, extra),\n      propagates: Math.random() < s.owner.sheet.get('dotPropagates', tags, extra) })",
        "after": "observeNativeCombatStatus(this.w,target,()=>target.applyStatus(id, dps, duration, inst.def.name, { casterId: observeNativeCombatStatusSource(this.w,s.owner).id, sourceKey, holdDischarge,\n      rupture: rupture > 0 ? rupture : undefined, ruptureType: sd.element,\n      stacksBonus: Math.round(s.owner.sheet.get('ailmentStacks', tags, extra)),\n      leech: s.owner.sheet.get('dotLeech_' + id, tags, extra),\n      propagates: Math.random() < s.owner.sheet.get('dotPropagates', tags, extra) }))"
      }
    ]
  },
  {
    "file": "challenges",
    "beforeHash": "10e32f3f2c0859b96fd5ec657f7755779c55de3548f401440a8a58e8537504de",
    "afterHash": "d77fc896488be3b0a218763982a0fad3e9e98c55f757b6424645fc909bb3c1c4",
    "edits": [
      {
        "before": "",
        "after": "import {observeNativeCombatStatus,observeNativeCombatStatusSource} from './nativeCombatRecordObservation';\n"
      },
      {
        "before": "enemy.applyStatus('bleed', effigy.average * s.bleedingField.power, 1, 'Field of Wounds',\n            { casterId: effigy.cast.state.owner.id, challengeField: effigy.body.id })",
        "after": "observeNativeCombatStatus(this.w,enemy,()=>enemy.applyStatus('bleed', effigy.average * s.bleedingField!.power, 1, 'Field of Wounds',\n            { casterId: observeNativeCombatStatusSource(this.w,effigy.cast.state.owner).id, challengeField: effigy.body.id }))"
      },
      {
        "before": "other.applyStatus('impaled', 0, 1, 'Lodged Contagion', { casterId: effigy.cast.state.owner.id })",
        "after": "observeNativeCombatStatus(this.w,other,()=>other.applyStatus('impaled', 0, 1, 'Lodged Contagion', { casterId: observeNativeCombatStatusSource(this.w,effigy.cast.state.owner).id }))"
      },
      {
        "before": "target.applyStatus('hemorrhage', dealt * 0.45, 1, 'Reopening Challenge', { casterId: caster.id })",
        "after": "observeNativeCombatStatus(this.w,target,()=>target.applyStatus('hemorrhage', dealt * 0.45, 1, 'Reopening Challenge', { casterId: observeNativeCombatStatusSource(this.w,caster).id }))"
      }
    ]
  }
] as const;
function beforeControllerOwnership(file:string,text:string):string {const layer=controllerOwnership.find(row=>row.file===file);if(!layer)return text;for(const edit of [...layer.edits].reverse()){assert.equal(text.split(edit.after).length,2,'exact current controller ownership hunk');text=text.replace(edit.after,edit.before);}return text;}
for(const row of archive.controllerRows){const raw=read('../src/engine/'+row.file+'.ts'),text=beforeControllerOwnership(row.file,raw),layer=controllerOwnership.find(item=>item.file===row.file);
 if(layer){
  assert.equal(sha(raw),layer.afterHash,'exact reviewed current controller');assert.equal(sha(text),layer.beforeHash,'exact committed controller predecessor');
  for(const edit of layer.edits){const changed=raw.replace(edit.after,edit.after.replace(/[A-Za-z]/,'!'));assert.notEqual(changed,raw);assert.throws(()=>beforeControllerOwnership(row.file,changed));assert.throws(()=>beforeControllerOwnership(row.file,raw+'\n'+edit.after));}
  const outside=beforeControllerOwnership(row.file,raw+'\n/* unknown outside controller change */');assert.ok(outside.endsWith('/* unknown outside controller change */'));assert.throws(()=>beforeNativeProgressionController(outside,row.file));
 }
 assert.equal(beforeNativeProgressionController(text,row.file),row.original);const left=parse(row.original),right=parse(text);const a=left.statements.find(ts.isClassDeclaration)!,b=right.statements.find(ts.isClassDeclaration)!;assert.equal(emit(a.getText(left)),emit(b.getText(right)),'complete native controller '+row.file);}
const restoredCharacter=beforeNativeProgressionDeclarations(read('../src/meta/character.ts'),'src/meta/character.ts');
for(const row of archive.globals){const sf=row.file==='src/engine/world.ts'?current.sf:parse(restoredCharacter);assert.equal(sf.statements.find(n=>(n as any).name?.text===row.name)?.getText(sf),row.before,'normalized global '+row.name);const meta=parse(read('../src/engine/nativeProgressionMeta.ts'));const node=meta.statements.find(n=>(n as any).name?.text===row.name)!;assert.equal(emit(node.getText(meta)),emit(row.before.startsWith('export ')?row.before:'export '+row.before),'pure executable global '+row.name);}
console.log('PASS exact Git archive, 29 executable bodies, four unchanged controllers, six pure globals');
import * as nativeArchiveBindings0 from '../src/engine/companionCues';
import * as nativeArchiveBindings1 from '../src/data/companionCues';
import * as nativeArchiveBindings2 from '../src/engine/companionGrants';
import * as nativeArchiveBindings3 from '../src/engine/minionInheritance';
import * as nativeArchiveBindings4 from '../src/engine/throngEvolution';
import * as nativeArchiveBindings5 from '../src/engine/companionSpec';
import * as nativeArchiveBindings6 from '../src/core/math';
import * as nativeArchiveBindings7 from '../src/engine/stats';
import * as nativeArchiveBindings8 from '../src/engine/status';
import * as nativeArchiveBindings9 from '../src/engine/actor';
import * as nativeArchiveBindings10 from '../src/engine/skills';
import * as nativeArchiveBindings11 from '../src/engine/containers';
import * as nativeArchiveBindings12 from '../src/data/containers';
import * as nativeArchiveBindings13 from '../src/engine/seatlaw';
import * as nativeArchiveBindings14 from '../src/engine/gemitems';
import * as nativeArchiveBindings15 from '../src/engine/relicPower';
import * as nativeArchiveBindings16 from '../src/meta/reliquary';
import * as nativeArchiveBindings17 from '../src/data/reliquary';
import * as nativeArchiveBindings18 from '../src/engine/itemgen';
import * as nativeArchiveBindings19 from '../src/engine/items';
import * as nativeArchiveBindings20 from '../src/data/skills';
import * as nativeArchiveBindings21 from '../src/data/monsters';
import * as nativeArchiveBindings22 from '../src/data/classes';
import * as nativeArchiveBindings23 from '../src/data/supports';
import * as nativeArchiveBindings24 from '../src/data/passives';
import * as nativeArchiveBindings25 from '../src/data/passiveChoices';
import * as nativeArchiveBindings26 from '../src/engine/stats';
import * as nativeArchiveBindings27 from '../src/engine/emerge';
import * as nativeArchiveBindings28 from '../src/engine/ultimates';
import * as nativeArchiveBindings29 from '../src/engine/bequests';
import * as nativeArchiveBindings30 from '../src/engine/combatCues';
import * as nativeArchiveBindings31 from '../src/meta/modes';
import * as nativeArchiveBindings32 from '../src/meta/mercs';
import * as nativeArchiveBindings33 from '../src/engine/nativePopulationRules';
import * as nativeArchiveBindings34 from '../src/engine/nativeProgressionMeta';
const archiveBindings={companionCueFlash:nativeArchiveBindings0.companionCueFlash,companionCueSpec:nativeArchiveBindings0.companionCueSpec,RECOVERY_CUES:nativeArchiveBindings1.RECOVERY_CUES,COMPANION_GRANT_PREFIX:nativeArchiveBindings2.COMPANION_GRANT_PREFIX,companionGrantStat:nativeArchiveBindings2.companionGrantStat,resolveMinionInheritance:nativeArchiveBindings3.resolveMinionInheritance,applyMinionPlyBonus:nativeArchiveBindings3.applyMinionPlyBonus,throngEvolution:nativeArchiveBindings4.throngEvolution,throngClusterPlies:nativeArchiveBindings4.throngClusterPlies,companionRecoverySeconds:nativeArchiveBindings5.companionRecoverySeconds,COMPANION_CFG:nativeArchiveBindings5.COMPANION_CFG,vec:nativeArchiveBindings6.vec,mod:nativeArchiveBindings7.mod,STATUS_DEFS:nativeArchiveBindings8.STATUS_DEFS,Actor:nativeArchiveBindings9.Actor,effectiveSkillLevel:nativeArchiveBindings10.effectiveSkillLevel,guardBashSpec:nativeArchiveBindings10.guardBashSpec,instanceDelivery:nativeArchiveBindings10.instanceDelivery,instanceMods:nativeArchiveBindings10.instanceMods,instanceSummon:nativeArchiveBindings10.instanceSummon,instanceTameMod:nativeArchiveBindings10.instanceTameMod,makeSkillInstance:nativeArchiveBindings10.makeSkillInstance,treeNodeOf:nativeArchiveBindings10.treeNodeOf,skillContextTags:nativeArchiveBindings10.skillContextTags,skillCooldownSeconds:nativeArchiveBindings10.skillCooldownSeconds,skillMaxLevel:nativeArchiveBindings10.skillMaxLevel,summonCrewOf:nativeArchiveBindings10.summonCrewOf,supportFitsInstOrCrew:nativeArchiveBindings10.supportFitsInstOrCrew,MAX_SUPPORT_LEVEL:nativeArchiveBindings10.MAX_SUPPORT_LEVEL,parseSlotGraftStat:nativeArchiveBindings10.parseSlotGraftStat,SLOTGRAFT_PREFIX:nativeArchiveBindings10.SLOTGRAFT_PREFIX,GRANT_CFG:nativeArchiveBindings10.GRANT_CFG,parseSkillGrantStat:nativeArchiveBindings10.parseSkillGrantStat,SKILLGRANT_PREFIX:nativeArchiveBindings10.SKILLGRANT_PREFIX,containerBoard:nativeArchiveBindings11.containerBoard,seatAmplification:nativeArchiveBindings11.seatAmplification,containerMisfits:nativeArchiveBindings11.containerMisfits,CONTAINER_DEFS:nativeArchiveBindings12.CONTAINER_DEFS,amplifySeatMods:nativeArchiveBindings13.amplifySeatMods,packGrantState:nativeArchiveBindings14.packGrantState,restoreGrantState:nativeArchiveBindings14.restoreGrantState,empowerRelicMods:nativeArchiveBindings15.empowerRelicMods,reliquaryPower:nativeArchiveBindings16.reliquaryPower,RELIQUARY_CFG:nativeArchiveBindings17.RELIQUARY_CFG,compileItemMods:nativeArchiveBindings18.compileItemMods,itemLevelReq:nativeArchiveBindings18.itemLevelReq,rebuildItem:nativeArchiveBindings18.rebuildItem,EQUIP_SLOTS:nativeArchiveBindings19.EQUIP_SLOTS,SKILLS:nativeArchiveBindings20.SKILLS,MONSTERS:nativeArchiveBindings21.MONSTERS,CLASSES:nativeArchiveBindings22.CLASSES,classOpeningSkills:nativeArchiveBindings22.classOpeningSkills,classSkillStat:nativeArchiveBindings22.classSkillStat,PROGRESSION:nativeArchiveBindings22.PROGRESSION,SUPPORTS:nativeArchiveBindings23.SUPPORTS,classStartNode:nativeArchiveBindings24.classStartNode,PASSIVE_ADJACENCY:nativeArchiveBindings24.PASSIVE_ADJACENCY,PASSIVE_NODES:nativeArchiveBindings24.PASSIVE_NODES,choiceOptionOf:nativeArchiveBindings25.choiceOptionOf,chosenOf:nativeArchiveBindings25.chosenOf,graftSourcesOf:nativeArchiveBindings25.graftSourcesOf,sanitizeChoices:nativeArchiveBindings25.sanitizeChoices,ATTRIBUTE_IDS:nativeArchiveBindings26.ATTRIBUTE_IDS,DAMAGE_COLOR:nativeArchiveBindings26.DAMAGE_COLOR,isAttributeId:nativeArchiveBindings26.isAttributeId,EMERGE_CFG:nativeArchiveBindings27.EMERGE_CFG,emergeFor:nativeArchiveBindings27.emergeFor,emergeGroundFor:nativeArchiveBindings27.emergeGroundFor,emergeSeedOf:nativeArchiveBindings27.emergeSeedOf,ultCooldownCap:nativeArchiveBindings28.ultCooldownCap,syncAttributeBequests:nativeArchiveBindings29.syncAttributeBequests,combatCueFlash:nativeArchiveBindings30.combatCueFlash,DEFAULT_MODE_ID:nativeArchiveBindings31.DEFAULT_MODE_ID,MERC_CFG:nativeArchiveBindings32.MERC_CFG,monsterSkillLevelOf:nativeArchiveBindings33.monsterSkillLevelOf,padBar:nativeArchiveBindings34.padBar,emptyEssences:nativeArchiveBindings34.emptyEssences,emptyAbilityEssences:nativeArchiveBindings34.emptyAbilityEssences,rebuildSkill:nativeArchiveBindings34.rebuildSkill};
const archivedNativeMethods=new Function(...Object.keys(archiveBindings),emit('class Archived{'+archive.rows.map(r=>r.before).join('\n')+'}\nreturn Archived.prototype;'))(...Object.values(archiveBindings));
// Historical source bodies remain immutable. Only these explicitly named
// methods use the separately pinned main successor in the behavior lane.
const visualMain='ea56c7ac4f5f4963dc6ad8ce3cb86bc12b66fa0b';
assert.equal(visualArchive.main,visualMain);
const visualMainText=execFileSync('git',['show',visualMain+':src/engine/world.ts'],{encoding:'utf8',maxBuffer:30e6});
const visualMainFile=ts.createSourceFile('main-world.ts',visualMainText,99,true),visualMainWorld=visualMainFile.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;
const visualReferenceEvidence:{name:string;sha256:string}[]=[];
function visualReference(historical:Record<string,Function>,names:string[],bindings:Record<string,unknown>){
 const rows=names.map(name=>{const m=visualMainWorld.members.find(n=>n.name?.getText(visualMainFile)===name);assert(m&&ts.isMethodDeclaration(m));const body=m.getText(visualMainFile);visualReferenceEvidence.push({name,sha256:createHash('sha256').update(body).digest('hex')});return body;});
 const js=ts.transpileModule('class VisualNative{'+rows.join('\n')+'}\nreturn VisualNative.prototype;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 const overrides=Function(...Object.keys(bindings),js)(...Object.values(bindings));return Object.defineProperties(Object.create(historical),Object.fromEntries(names.map(name=>[name,Object.getOwnPropertyDescriptor(overrides,name)!]))) as Record<string,Function>;
}

const nativeReference=visualReference(archivedNativeMethods,['clearTreeFields','expireZone'],{...archiveBindings,presenceProfile,skillPresenceVoice,PRESENCE_STYLE});

type Lane='native'|'world'|'core'|'owner';
const methods=archive.rows.map((r:any)=>r.name) as string[];
const combatNames=['kill','guardBash','executeSkill','burstDamage','guardArtHit','litePromoteNearest','companionPulseHit','useSkill','spawnConstruct','spawnProjectile','attackSequenceBurst','challengeBurst','challengeHit'];
function graph(v:any,memo=new Map<object,number>()):any{if(v instanceof Actor)return {actor:v.id};if(v===null||typeof v!=='object')return typeof v==='function'?'[function]':v;if(memo.has(v))return {ref:memo.get(v)};memo.set(v,memo.size);if(v instanceof Map)return [...v].map(([k,x])=>[graph(k,memo),graph(x,memo)]);if(v instanceof Set)return [...v].map(x=>graph(x,memo));if(v instanceof WeakMap)return '[weakmap]';return Object.fromEntries(Object.keys(v).map(k=>[k,graph(v[k],memo)]));}
function fixture(lane:Lane,shared?:{campaign:any;authority:NativeAreaActorAuthority<NativeSceneProgressionRuntime>}){
 const w=makeSimWorld('warrior',28219);const definition={...w.zone,id:w.zone.id+(shared?'-neighbor':''),objective:{kind:'none' as const}};w.zoneMap[definition.id]=definition;if(shared)shared.campaign.zoneMap[definition.id]=definition;
 const raw=freshAssemblyInput(w,definition,shared?.campaign),dirty=new Set<Seat>(),campaign:any=raw.campaign;if(shared){raw.player=campaign.localSeat.actor;raw.initialActors=[raw.player];}
 if(!shared)Object.assign(campaign,{time:100,timeflow:w.timeflow,hiredMercs:[],mercSyncedLevel:-1,
  seatHero(s:Seat){assert.equal(this,campaign);return s.home??s.actor;},seatOf(a:Actor){assert.equal(this,campaign);return campaign.seats.find((s:Seat)=>s.actor===a);},markMetaDirty(s:Seat){assert.equal(this,campaign);dirty.add(s);}});
 const area=new NativeAreaSceneAssembly(raw),scene=area.input.scene,geometry=area.input.geometry,population=area.input.population,state=freshSceneProgressionState();
 geometry.walk=w.walk;scene.actors.splice(0,scene.actors.length,raw.player);scene.player=raw.player;
 const authority=shared?.authority??new NativeAreaActorAuthority<NativeSceneProgressionRuntime>(campaign);
 const owner=new NativeAreaSceneProgression({scene,geometry,population,ecology:area.input.ecology,runtime:area.input.registry.input.birth,loot:area.lootController,campaign,state,authority});
 const combat:any={scene,state};const effects:string[]=[];
 for(const name of combatNames)combat[name]=function(...args:any[]){assert.equal(this,combat,'real driver receiver '+name);effects.push(name);return (World.prototype as any)[name].apply(w,args);};
 const binding=authority.register(scene,{progression:owner,combat});if(!shared)authority.claim(binding,scene.actors);
 // The driver is an explicit test-only complete native runtime. Its local data
 // aliases the retained census/queues; no production owner is given a World.
 const writableFields=['actors','player','zone','pendingRespawns','pendingSummons','projectiles','zones','pendingRepeats','pendingFuses','pendingSalvos','pendingSteps','pendingFollowUps','pendingBlinks','treeBuffSources','recallTreeSpears','emergences','mercSyncedLevel'];
 const fields=archive.hostMembers.filter((k:string)=>typeof (owner.host as any)[k]!=='function'&&!['guardArts','companionBonds','attackSequences','challenges','companionGrants'].includes(k));
 for(const key of fields){const d=Object.getOwnPropertyDescriptor(owner.host,key)!;Object.defineProperty(w,key,{configurable:true,get:d.get,set:writableFields.includes(key)?(v:any)=>{if(key in state)(state as any)[key]=v;else if(key in scene)(scene as any)[key]=v;else campaign[key]=v;}:undefined});}
 Object.defineProperty(w,'relayStatus',{configurable:true,get:()=>population.factory.relayStatus});
 if(lane==='owner'){for(const key of ['companionGrants','guardArts','companionBonds','attackSequences','challenges','lite'])Object.defineProperty(w,key,{configurable:true,get:()=> (owner as any)[key]});}
 for(const key of ['seatHero','seatOf','markMetaDirty'])Object.defineProperty(w,key,{configurable:true,value:(...args:any[])=>campaign[key](...args)});
 w.text=(...args:any[])=> (geometry.text as any)(...args);
 for(const name of methods){if(lane==='native')(w as any)[name]=(...args:any[])=>nativeReference[name].apply(w,args);else if(lane==='core')(w as any)[name]=(...args:any[])=>(core as any)['scene'+cap(name)](w,...args);else if(lane==='owner')(w as any)[name]=(...args:any[])=>(owner as any)[name](...args);}
 function nativeMint(caster:Actor,inst:any,delivery:any){const saved=Object.fromEntries(methods.map(name=>[name,(w as any)[name]]));try{for(const name of methods)(w as any)[name]=(...args:any[])=>nativeReference[name].apply(w,args);return (w as any).spawnMinion(caster,inst,{delivery}) as Actor|null;}finally{for(const name of methods)(w as any)[name]=saved[name];}}
 function enroll(a:Actor){scene.actors.push(a);authority.claim(binding,[a]);return a;}
 function snapshot(){return {actors:scene.actors.map(a=>({id:a.id,state:captureNativeActorState(a)})),seats:campaign.seats.map((s:Seat)=>({id:s.id,meta:graph(s.meta),grants:graph(s.grantedSkills),insts:graph(s.grantedInsts)})),state:graph(state),flashes:graph(geometry.flashes),texts:graph(area.objectiveController.input.state.texts),dirty:[...dirty].map(s=>s.id),mercSyncedLevel:campaign.mercSyncedLevel};}
 return {w,raw,area,scene,geometry,population,state,campaign,authority,owner,combat,binding,effects,enroll,nativeMint,snapshot};
}
// Mu's explicit departure from the historical living-vessel contract also
// holds through retained progression owners, without active-world lookups.
for (const lane of ['world', 'core', 'owner'] as Lane[]) {
  const {w, scene} = fixture(lane), seat = w.localSeat, p = w.player;
  for (const rung of nativeArchiveBindings12.RELIQUARY.ladder) w.account.features.add(rung.feature);
  const item = nativeArchiveBindings18.forgeItem({ilvl: 30, uniqueId: 'unquarried_idol', quality: 1})!;
  item.x = 1; item.y = 1; item.relicKey = 'mu-native-idol';
  seat.meta.containers.reliquary = [item];
  w.recalcSeat(seat);
  assert.ok(p.sheet.get(companionGrantStat('summon_stone_golem')) > 0, lane + ' living grant');
  p.relicEffectsSuppressed = true;
  w.recalcSeat(seat); w.recalcSeat(seat);
  assert.ok(!p.sheet.hasSource('container:reliquary'), lane + ' Mu fold');
  (w as any).companionGrants.update(p, scene.actors, 10, () => { throw Error(lane + ' granted a Mu companion'); }, () => {});
  assert.equal(seat.meta.containers.reliquary[0], item);
  assert.equal(w.account.reliquary.enabled, true);
}
console.log('PASS Mu Reliquary suppression through World, shared core and retained progression owner');


const results:any[]=[];
function parity(label:string,course:(f:ReturnType<typeof fixture>)=>any){let baseline:any;for(const lane of ['native','world','core','owner'] as Lane[]){let result:any;withSeededRandom(28018,()=>{const f=fixture(lane);const rng=new Rng(8891);let draws=0;const priorRandom=Math.random;Math.random=()=>{draws++;return rng.next();};try{const receipt=course(f);result={receipt,snapshot:f.snapshot(),draws,sentinel:rng.next()};}finally{Math.random=priorRandom;}});if(lane==='native')baseline=result;else try{assert.deepEqual(result,baseline,label+' '+lane);}catch(e){fs.writeFileSync(new URL('./reports/native-scene-progression-failure-'+lane+'.json',import.meta.url),JSON.stringify({label,baseline,result},null,2));throw e;}}results.push(label);console.log('PASS four-lane '+label);}
parity('native attributes, granted skill identity, status routing and removal',f=>{const {w}=f,p=w.player,meta=w.localSeat.meta;const id='fireball';assert.ok(SKILLS[id]);meta.baseAttrs.strength+=17;meta.classDef={...meta.classDef,innate:[...(meta.classDef.innate??[]),mod(skillGrantStat(id),'flat',3),mod(relayStatusStat('grounding'),'flat',1)]};w.recalcSeat(w.localSeat);const inst=w.localSeat.grantedInsts!.get(id)!;assert.ok(inst);w.recalcSeat(w.localSeat);assert.equal(w.localSeat.grantedInsts!.get(id),inst);const foe=f.enroll(f.population.createMonster('zombie',3,'enemy'));foe.pos={x:p.pos.x+20,y:p.pos.y};const status=STATUS_RELAYS.grounding.status;p.applyStatus(status,8,1,'progression relay');assert.ok(foe.statuses.some(s=>s.id===status),JSON.stringify({relay:p.sheet.get(relayStatusStat('grounding')),enemies:f.population.enemiesOf(p).map(a=>a.id),status,p:p.statuses,foe:foe.statuses}));meta.classDef={...meta.classDef,innate:[]};w.recalcSeat(w.localSeat);assert.equal(w.localSeat.grantedInsts,undefined);return {grantedLevel:inst.level,relay:foe.statuses.map(s=>s.id),strength:meta.attrs.strength};});
parity('native aura reservation, ledger settlement and actual deactivation attack',f=>{const p=f.w.player;const def=Object.values(SKILLS).find(d=>d.delivery.type==='aura'&&d.delivery.onDeactivate)!;assert.ok(def);const inst=makeSkillInstance(def,2);p.sheet.setSource('proof-life',[mod('life','flat',100000)]);p.skills[0]=inst;p.life=p.maxLife()*0.7;p.mana=0;const foe=f.enroll(f.population.createMonster('zombie',3,'enemy'));foe.pos={x:p.pos.x+10,y:p.pos.y};const source='aura:'+def.id+':'+p.id;foe.sheet.setSource(source,[mod('life','flat',17)]);p.reservedMana=12;p.activeAuras.set(def.id,{inst,spec:def.delivery,reserved:12,affected:new Set([foe.id]),since:90} as any);f.w.deactivateAura(p,def.id);assert.equal(p.activeAuras.size,0);assert.equal(p.reservedMana,0);assert.ok(!(foe.sheet as any).sources.has(source));(f.w as any).settleLedger(p,{lapse:'landDamage'},{balance:3});const due={balance:4};(f.w as any).settleLedger(p,{lapse:'ventMana'},due);assert.equal(due.balance,0);return {skill:def.id,life:p.life,mana:p.mana,foeLife:foe.life};});
parity('native persistent companion refresh, relevel and silent retirement',f=>{const w=f.w,p=w.player,meta=w.localSeat.meta;const def=Object.values(SKILLS).find(d=>d.delivery.type==='summon'&&d.delivery.persistent&&d.delivery.monsterId==='zombie')??Object.values(SKILLS).find(d=>d.delivery.type==='summon'&&d.delivery.persistent)!;assert.ok(def);meta.classDef={...meta.classDef,innate:[mod(companionGrantStat(def.id),'flat',2)]};w.recalcSeat(w.localSeat);let body:Actor|null=null;(w as any).companionGrants.update(p,f.scene.actors,1,(inst:any,delivery:any)=>{body=f.nativeMint(p,inst,delivery);if(body)f.authority.claim(f.binding,[body]);return body;},(a:Actor)=>w.kill(a,true));assert.ok(body);const b=body as Actor;b.life=b.maxLife()*0.43;const fraction=b.life/b.maxLife();p.level=7;w.recalcSeat(w.localSeat);assert.equal(b.level,7);assert.ok(Math.abs(b.life/b.maxLife()-fraction)<1e-9);meta.classDef={...meta.classDef,innate:[]};w.recalcSeat(w.localSeat);assert.equal(b.dead,true);return {skill:def.id,level:b.level,dead:b.dead,grant:b.summonInst?.companionGrant};});





parity('mercenary actual metadata rebuild, patron vigor, live level and resource fractions',f=>{const w=f.w,p=w.player,warrior=CLASSES.find(c=>c.id==='warrior')!;p.level=9;p.sheet.setSource('proof-patron',[mod('mercVigor','flat',0.2)]);const snapshot:any={classId:'warrior',level:30,baseAttrs:{...warrior.attributes},allocated:[],vocations:[],knownSkills:[{skillId:'fireball',level:20,rarity:'normal',sockets:[null,null]}],bar:['fireball'],equipped:{}};const a=f.enroll(new Actor('Kessa','player',{...p.pos}));const meta=(w as any).normalizeMercMeta(snapshot,1);const seat:Seat={...w.localSeat,id:'proof-merc',actor:a,meta,merc:{name:'Kessa'} as any,reviveDwellBy:new Map()};f.campaign.seats.push(seat);f.campaign.hiredMercs.push({seat,snapshot});a.life=a.maxLife()*0.4;const fraction=a.life/a.maxLife();w.resyncMercenary();assert.equal(seat.meta.name,'Kessa');assert.equal(a.level,(w as any).mercTargetLevel());assert.ok(Math.abs(a.life/a.maxLife()-fraction)<1e-9);const stable=seat.meta;w.resyncMercenary();assert.equal(seat.meta,stable);assert.equal((w as any).applyMercNormalization(seat,{...snapshot,classId:'not-a-class'},false),false);assert.equal(seat.meta,stable);return {level:a.level,name:seat.meta.name,fraction:a.life/a.maxLife(),dirty:[...f.campaign.seats].filter(s=>s===seat).map(s=>s.id)};});
parity('local authored fields, real reservations, madden lineage cleanup and repeat retirement',f=>{const p=f.w.player,inst=makeSkillInstance(SKILLS.fireball,2),live=f.enroll(f.population.createMonster('zombie',3,'enemy')),dead=f.enroll(f.population.createMonster('zombie',3,'enemy'));dead.dead=true;p.reservedMana=8;const domain='proof-domain';live.sheet.setSource(domain,[mod('life','flat',17)]);const z:any={caster:p,inst,pos:{...p.pos},radius:20,color:'#ddd',reserved:8,domainAffected:new Set([live]),domainKey:domain,fieldCue:{color:'#abc'},madden:{dwell:new Map([[live.id,1],[dead.id,2],[987654,3]]),credited:new Map([[live.id,1],[dead.id,2],[987654,3]])}};f.state.zones.push(z);(f.w as any).expireZone(z);assert.equal(p.reservedMana,0);assert.deepEqual([...z.madden.dwell.keys()],[live.id]);assert.deepEqual([...z.madden.credited.keys()],[live.id]);assert.equal(z.domainAffected.size,0);const flashes=f.geometry.flashes.length;(f.w as any).expireZone(z);assert.equal(f.geometry.flashes.length,flashes);f.w.retireOwnedZone(z);assert.equal(f.state.zones.length,0);return {flashes,keys:[...z.madden.credited.keys()]};});
parity('partial native failure after real grant mutation',f=>{const w=f.w,p=w.player,meta=w.localSeat.meta;meta.classDef={...meta.classDef,innate:[mod(skillGrantStat('fireball'),'flat',2)]};const sheet=p.sheet as any,real=sheet.setSource;sheet.setSource=function(name:string,...args:any[]){const result=real.call(this,name,...args);if(name==='passives')throw Error('injected after actual sheet mutation');return result;};let failure='';try{w.recalcSeat(w.localSeat);}catch(e){failure=(e as Error).message;}assert.equal(failure,'injected after actual sheet mutation');sheet.setSource=real;return {failure,relay:!!p.statusRelay};});



parity('summon toggle real body retirement and deferred birth cancellation',f=>{const p=f.w.player,def=Object.values(SKILLS).find(d=>d.delivery.type==='summon'&&d.delivery.persistent&&!d.delivery.shell)!;const inst=makeSkillInstance(def,2),delivery={...def.delivery,persistent:undefined} as any;const body=f.nativeMint(p,inst,delivery)!;assert.ok(body);f.authority.claim(f.binding,[body]);p.summonToggles.set(def.id,{inst,reserved:9} as any);p.reservedMana=9;f.state.pendingRespawns.push({caster:p,inst,timer:1});f.state.pendingSummons.push({caster:p,inst,timer:1} as any);(f.w as any).dismissSummonToggle(p,def.id);assert.equal(body.dead,true);assert.equal(p.summonToggles.size,0);assert.equal(p.reservedMana,0);assert.equal(f.state.pendingRespawns.length,0);assert.equal(f.state.pendingSummons.length,0);return {skill:def.id,dead:body.dead};});
parity('native tree cleanup of detached local construct payload and quiet aura',f=>{const p=f.w.player,inst=makeSkillInstance(SKILLS.fireball,2),auraDef=Object.values(SKILLS).find(d=>d.delivery.type==='aura'&&!d.delivery.ledger)!;const ai=makeSkillInstance(auraDef,1);const detached=f.population.createMonster('zombie',3,'player');detached.owner=p;detached.summonInst=inst;detached.construct={castInst:inst} as any;detached.activeAuras.set(auraDef.id,{inst:ai,spec:auraDef.delivery,reserved:4,affected:new Set([p.id])} as any);detached.reservedMana=4;const auraSource='aura:'+auraDef.id+':'+detached.id;p.sheet.setSource(auraSource,[mod('life','flat',5)]);f.state.projectiles.push({caster:detached,inst,pos:{...p.pos}} as any);(f.w as any).clearTreeFields(p,inst);assert.equal(detached.dead,true);assert.equal(detached.life,0);assert.equal(detached.reservedMana,0);assert.equal(detached.activeAuras.size,0);assert.equal(f.state.projectiles.length,0);assert.ok(!(p.sheet as any).sources.has(auraSource));return {dead:detached.dead,life:detached.life,reserved:detached.reservedMana,auras:detached.activeAuras.size};});
withSeededRandom(7182,()=>{
 const a=fixture('owner'),hero=a.scene.player,seat=a.campaign.localSeat;
 const b=fixture('owner',{campaign:a.campaign,authority:a.authority}),placeholder=b.scene.player;
 // Preparation starts with the same borrowed campaign hero. Admission refuses
 // it until the real body is explicitly transferred to its physical area.
 assert.equal(hero,placeholder);assert.throws(()=>b.authority.assertAdmitted(b.scene),/unowned or borrowed/);b.scene.actors.splice(b.scene.actors.indexOf(placeholder),1);
 a.scene.actors.splice(a.scene.actors.indexOf(hero),1);b.scene.actors.push(hero);a.authority.transfer(hero,a.binding,b.binding);b.scene.player=hero;
 const enemyA=a.enroll(a.population.createMonster('zombie',3,'enemy')),enemyB=b.enroll(b.population.createMonster('zombie',3,'enemy'));
 // Deliberate test-only ID collision: local status work must use exact ownership.
 enemyB.id=enemyA.id;assert.notEqual(enemyA,enemyB);
 enemyA.pos={x:hero.pos.x+1,y:hero.pos.y};enemyB.pos={x:hero.pos.x+30,y:hero.pos.y};
 seat.meta.classDef={...seat.meta.classDef,innate:[mod(relayStatusStat('grounding'),'flat',1)]};
 a.owner.recalcSeat(seat);assert.equal(hero.statusRelay,b.population.factory.relayStatus);assert.notEqual(hero.statusRelay,a.population.factory.relayStatus);
 const status=STATUS_RELAYS.grounding.status;hero.applyStatus(status,8,1,'cross area native progression');
 assert.ok(enemyB.statuses.some(s=>s.id===status));assert.ok(!enemyA.statuses.some(s=>s.id===status));
  const companion=Object.values(SKILLS).find(d=>d.delivery.type==='summon'&&d.delivery.persistent&&d.delivery.monsterId==='zombie')??Object.values(SKILLS).find(d=>d.delivery.type==='summon'&&d.delivery.persistent)!;
 seat.meta.classDef={...seat.meta.classDef,innate:[...seat.meta.classDef.innate,mod(companionGrantStat(companion.id),'flat',2)]};a.owner.recalcSeat(seat);
 let follower:Actor|null=null;b.owner.companionGrants.update(hero,b.scene.actors,1,(inst,delivery)=>{follower=b.nativeMint(hero,inst,delivery);if(follower)b.authority.claim(b.binding,[follower]);return follower;},body=>b.combat.kill(body,true));assert.ok(follower);
 const completion=new NativeAreaSceneObjectiveCompletion({...a.area.objectiveController.input,progression:a.owner});
 const level=hero.level,flashesA=a.geometry.flashes.length,flashesB=b.geometry.flashes.length;
 completion.grantSeatXp(seat,seat.meta.xpNeeded);assert.equal(hero.level,level+1);assert.equal((follower as Actor).level,hero.level);assert.equal(hero.life,hero.maxLife());assert.equal(hero.statusRelay,b.population.factory.relayStatus);assert.equal(a.geometry.flashes.length,flashesA+1);assert.equal(b.geometry.flashes.length,flashesB);
 seat.meta.classDef={...seat.meta.classDef,innate:[mod(relayStatusStat('grounding'),'flat',1)]};a.owner.recalcSeat(seat);assert.equal((follower as Actor).dead,true);assert.ok(b.effects.includes('kill'));assert.ok(!a.effects.includes('kill'));
 const borrowed=a.enroll(a.population.createMonster('zombie',3,'player'));borrowed.owner=hero;borrowed.companion={} as any;b.scene.actors.push(borrowed);
 const before=JSON.stringify({hero:captureNativeActorState(hero),borrowed:captureNativeActorState(borrowed),meta:graph(seat.meta)}),relay=hero.statusRelay;
 assert.throws(()=>a.owner.recalcSeat(seat),/unowned or borrowed/);assert.equal(hero.statusRelay,relay);assert.equal(JSON.stringify({hero:captureNativeActorState(hero),borrowed:captureNativeActorState(borrowed),meta:graph(seat.meta)}),before);
 b.scene.actors.splice(b.scene.actors.indexOf(borrowed),1);a.owner.recalcSeat(seat);
 const foreignSeat={...seat};assert.throws(()=>a.owner.recalcSeat(foreignSeat),/Foreign native progression seat/);
 b.scene.actors.splice(b.scene.actors.indexOf(hero),1);assert.throws(()=>a.owner.recalcSeat(seat),/Stale native actor authority/);b.scene.actors.push(hero);
 assert.throws(()=>b.owner.host.clearTreeFields(new Actor('unclaimed','player',{x:0,y:0}),makeSkillInstance(SKILLS.fireball,1)),/unowned or borrowed|Missing native actor authority/);
 const foreignZone={} as any;assert.throws(()=>b.owner.expireZone(foreignZone),/Foreign native progression zone/);
 const trueState=b.combat.state,priorHero=JSON.stringify(captureNativeActorState(hero));b.combat.state=freshSceneProgressionState();assert.throws(()=>a.owner.recalcSeat(seat),/Mismatched native progression runtime authority/);assert.equal(JSON.stringify(captureNativeActorState(hero)),priorHero);b.combat.state=trueState;
 const badCombat={...b.combat,scene:a.scene};a.authority.release(b.binding,b.scene.actors);a.authority.unregister(b.binding);const invalid=a.authority.register(b.scene,{progression:b.owner,combat:badCombat});a.authority.claim(invalid,b.scene.actors);
 assert.throws(()=>a.owner.recalcSeat(seat),/Mismatched native progression runtime authority/);
 results.push('current-area relay and exact identity admission, foreign/stale/mismatched refusals');
 console.log('PASS cross-area actual XP/relevel/cleanup/relay, borrowed companion pre-mutation refusal, stale/foreign/mismatched authority');
});
// A cached World view must keep mutable data live and method lookup lazy, while
// a previously selected callable preserves the original lookup/receiver order.
withSeededRandom(7183,()=>{
 const w=makeSimWorld('warrior',28220),host=(w as any).nativeSceneProgressionHost();
 assert.equal((w as any).nativeSceneProgressionHost(),host);assert.equal(Object.getOwnPropertyDescriptor(w,'nativeSceneProgressionView')?.enumerable,false);
 const queue:World['pendingRespawns']=[];host.pendingRespawns=queue;assert.equal((w as any).pendingRespawns,queue);
 const calls:string[]=[],originalProto=Object.getPrototypeOf(w),derived=Object.create(originalProto);
 derived.relevelActor=function(actor:Actor,level:number){assert.equal(this,w);calls.push('inherited');actor.level=level;};Object.setPrototypeOf(w,derived);
 const selected=host.relevelActor;(w as any).relevelActor=function(actor:Actor,level:number){assert.equal(this,w);calls.push('replacement');actor.level=level;};
 selected(w.player,7);host.relevelActor(w.player,9);assert.deepEqual(calls,['inherited','replacement']);assert.equal(w.player.level,9);Object.setPrototypeOf(w,originalProto);
});
withSeededRandom(7184,()=>{
 const f=fixture('owner'),pool=f.area.input.ecology.input.state.lite;
 assert.ok(pool.spawn(0,100,100,1,0,2)>=0);assert.equal(pool.liveCount,1);
 assert.equal(f.owner.lite,pool);assert.equal((f.owner.host as any).lite,pool);assert.equal((f.owner.guardArts as any).w.lite,pool);
 const restored=new LitePool();restored.spawn(0,120,120,1,0,2);restored.spawn(0,140,140,1,0,2);f.area.input.ecology.input.state.lite=restored;
 assert.equal(f.owner.lite,restored);assert.equal((f.owner.guardArts as any).w.lite.liveCount,2);assert.equal((f.w as any).lite,restored);
 assert.throws(()=>new NativeAreaSceneProgression({...f.owner.input,ecology:{input:{...f.area.input.ecology.input,scene:{...f.scene}}} as any}),/identical ecology/);
 const priorActor=JSON.stringify(captureNativeActorState(f.scene.player));
 assert.throws(()=>new NativeAreaSceneProgression({...f.owner.input,campaign:{...f.campaign}}),/identical campaign authority/);
 assert.throws(()=>new NativeAreaSceneProgression({...f.owner.input,authority:new NativeAreaActorAuthority<NativeSceneProgressionRuntime>({...f.campaign})}),/identical campaign authority/);
 assert.throws(()=>new NativeAreaSceneProgression({...f.owner.input,population:{input:{...f.population.input,campaign:{...f.campaign}}} as any}),/identical ecology/);
 assert.throws(()=>new NativeAreaSceneProgression({...f.owner.input,loot:{input:{...f.area.lootController.input,campaign:{...f.campaign}},shedOrb:f.area.lootController.shedOrb}}),/identical campaign authority/);
 assert.equal(JSON.stringify(captureNativeActorState(f.scene.player)),priorActor);
 console.log('PASS genuine ecology pool identity, nonempty guard reads, restore replacement, and foreign ecology/campaign/authority/loot refusal');
});
const checkedWorld=read('../src/engine/world.ts');
for(const row of [archive.rows[0],archive.rows.at(-1)!])assert.throws(()=>beforeNativeSceneProgression(checkedWorld.replace(row.after,row.after.replace('return ','return undefined; return '))),/checked progression delegate/);
const checkedCharacter=read('../src/meta/character.ts'),top=archive.topLevel.find(r=>r.file==='src/meta/character.ts')!;
assert.throws(()=>beforeNativeProgressionDeclarations(checkedCharacter+'\n'+top.after,'src/meta/character.ts'),/single progression declaration/);
console.log('PASS cached live World host, inherited receivers, captured lookup order, and strict mutation refusals');
fs.writeFileSync(new URL('./reports/native-scene-progression.json',import.meta.url),JSON.stringify({visualMain,visualReferenceEvidence,passed:results.length,courses:results,archiveHash:sha(JSON.stringify(archive)),combatBoundary:'Explicit genuine native World test driver only; production runtime owner remains required'},null,2));
console.log(JSON.stringify({passed:results.length,courses:results}));
