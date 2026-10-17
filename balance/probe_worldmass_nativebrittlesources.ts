import assert from 'node:assert/strict';
import '../src/worldmass/nativeBootstrap';
import { doodadRuleOf, compositionDefs } from '../src/engine/levelgen';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { tellSpecsOf, TELL_CFG, TELL_SOURCES, registerTellSource } from '../src/engine/tells';
import { DISSOLVE_MATERIALS, dissolveCutOf, registerDissolveCut } from '../src/engine/dissolve';
import { nativeBrittleRegistryHash, nativeUrnSourceSupported, nativeUrnRewardContextSupported, validateNativeBrittleSources,
  type NativeBrittleDefinition } from '../src/worldmass/nativeBrittleSources';
import { compileNativeFeature, nativeFeatureAdmission, nativeFeatureSourceIdentity, resolveNativeFeature,
  type NativeFeatureDescriptor, type NativeFeatureRequest } from '../src/worldmass/nativeFeatures';
import { prepareNativeFeature, validateNativePreparation } from '../src/worldmass/nativePreparation';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { MassNativeResidency, type NativeFeaturePlacement, type NativeResidencySave } from '../src/worldmass/nativeResidency';
import { address } from '../src/worldmass/address';
import { canonical, massDigest } from '../src/worldmass/random';

const clone = <T>(value:T):T => JSON.parse(JSON.stringify(value)) as T;
const rehash = (d:NativeFeatureDescriptor):NativeFeatureDescriptor => {const {hash:_hash,...body}=d;return {...body,hash:massDigest(body)};};
const request = (id='family_plot'):NativeFeatureRequest => ({id:'urn-source/'+id,seed:713,level:15,size:{w:1800,h:1800},source:{kind:'composition',id,tileset:'courtland'}});
const originalRandom=Math.random;
Math.random=()=>{throw Error('Source contract or native preparation consumed ambient random');};
try {
  const d=resolveNativeFeature(request()),s=d.brittleSources!;
  assert.equal(s.rows.length,2);assert.equal(s.definitions.length,1);
  const definition=s.definitions[0];
  assert.ok(Object.isFrozen(definition.rule.brittle)&&Object.isFrozen(definition.wake.skills[0].definition));
  assert.deepEqual(definition.rule,clone(doodadRuleOf('burial_urn')));
  assert.deepEqual(definition.rule.brittle,{on:['hit','touch'],orbChance:.55,gemChance:.12,color:'#b8a890',spawn:{monster:'skeleton_warrior',count:[1,2],chance:.22}});
  assert.equal(definition.wake.id,'skeleton_warrior');assert.deepEqual(definition.wake.definition,clone(MONSTERS.skeleton_warrior));
  assert.deepEqual(definition.wake.skills,[{id:'cleave',definition:clone(SKILLS.cleave)}]);
  assert.deepEqual(definition.wake.tells,clone(tellSpecsOf(MONSTERS.skeleton_warrior)));
  assert.equal(definition.wake.tellSweepSec,TELL_CFG.sweepSec);
  assert.equal(definition.dissolve!.material,'ceramic');assert.equal(definition.dissolve!.debris,'debris_clay');
  assert.deepEqual(definition.debris,{kind:'debris_clay',rule:clone(doodadRuleOf('debris_clay'))});
  assert.equal(nativeUrnSourceSupported(definition,d.zone),true);
  const caps=new Set(nativeWorldCapabilities());caps.add('doodad:burial_urn');caps.add('native-brittles');caps.add('native-brittle:burial_urn');
  for(const id of ['family_plot','sepulcher_site','buried_village']) {
    const full=resolveNativeFeature(request(id));
    assert.deepEqual(full.authored.feature,clone(compositionDefs().find(row=>row.id===id)));
    assert.ok(full.brittleSources!.rows.length>0);assert.ok(full.entrances.length>0,'complete native ruin keeps its registered physical mouth');
    assert.equal(nativeFeatureAdmission(compileNativeFeature(full),caps).ok,true);
    const noOwner=new Set(caps);noOwner.delete('native-brittles');assert.equal(nativeFeatureAdmission(compileNativeFeature(full),noOwner).ok,false);
  }
  console.log('PASS unchanged complete native ruin providers retain exact urn/wake/skill/dissolution payload and registered mouths; capability still requires lifecycle owner');

  const job={protocol:1 as const,token:1,request:request(),identity:nativeFeatureSourceIdentity(request()),maxBytes:2*1024*1024};
  const prepared=prepareNativeFeature(job).preparation;
  assert.equal(canonical(prepared.descriptor),canonical(d));assert.equal(validateNativePreparation(request(),prepared)!.descriptor.hash,d.hash);
  const old:NativeFeatureDescriptor=clone(d);delete old.brittleSources;old.requirements=old.requirements.filter(x=>!x.startsWith('native-brittle'));
  const legacy=rehash(old);
  assert.ok(nativeFeatureAdmission(compileNativeFeature(legacy),caps).unsupported.includes('native-brittle-source-contract'));
  const origin=address('surface','0','0',0,0,960),placement:NativeFeaturePlacement={id:d.id,origin,request:request()};
  const saved:NativeResidencySave={schema:1,run:'urn-source',born:[{placement,descriptor:legacy,changes:{clock:0,grid:[],doodads:[]}}]};
  assert.throws(()=>new MassNativeResidency({run:'urn-source',addressSpan:960,maxBlueprints:3,maxResidents:1,maxCandidates:2},()=>[placement],caps,()=>origin,saved),/unsupported|refused|capabilit|admi/i);
  const havenRequest:NativeFeatureRequest={...request(),id:'old-haven',source:{kind:'composition',id:'drover_waystation',tileset:'overpass'}};
  const haven:NativeFeatureDescriptor=clone(resolveNativeFeature(havenRequest));delete haven.brittleSources;
  const historicHaven=rehash(haven),oldHash=historicHaven.hash;
  assert.equal(nativeFeatureAdmission(compileNativeFeature(historicHaven),caps).ok,true);
  assert.equal(compileNativeFeature(historicHaven).descriptor.hash,oldHash,'old source payload/hash stays unchanged');
  console.log('PASS normal/worker exact descriptor identity, historical urn refusal before cold collision, and existing haven hash/geometry acceptance');

  const missing:NativeFeatureDescriptor=clone(d);Reflect.set(missing.brittleSources!,'rows',[]);
  assert.throws(()=>compileNativeFeature(rehash(missing)),/lost scenery mechanism/);
  const wrongIndex:NativeFeatureDescriptor=clone(d);wrongIndex.brittleSources!.rows[0].index=-1;
  assert.throws(()=>compileNativeFeature(rehash(wrongIndex)),/source row/);
  const duplicate:NativeFeatureDescriptor=clone(d);duplicate.brittleSources!.rows.push(clone(duplicate.brittleSources!.rows[0]));
  assert.throws(()=>compileNativeFeature(rehash(duplicate)),/source row/);
  const badHash:NativeFeatureDescriptor=clone(d);badHash.brittleSources!.definitions[0].wake.definition.base.life=999;
  assert.throws(()=>compileNativeFeature(rehash(badHash)),/definition/);
  for(const edit of [(b:NativeBrittleDefinition)=>{b.rule.brittle!.corpses={monster:'skeleton_warrior',count:[1,1]};},
    (b:NativeBrittleDefinition)=>{b.wake.definition.base.life=999;},(b:NativeBrittleDefinition)=>{b.wake.skills[0].definition.manaCost=999;},
    (b:NativeBrittleDefinition)=>{b.dissolve!.life=999;},(b:NativeBrittleDefinition)=>{b.debris!.rule.blocksMove=true;},(b:NativeBrittleDefinition)=>{b.wake.tellSweepSec=9;}]) {
    const altered:NativeFeatureDescriptor=clone(d),b=altered.brittleSources!.definitions[0];edit(b);
    const {hash:_hash,...body}=b;b.hash=massDigest(body);Reflect.set(altered.brittleSources!,'registryHash',massDigest(b));
    for(const row of altered.brittleSources!.rows)row.definitionHash=b.hash;
    const coherent=rehash(altered);validateNativeBrittleSources(coherent.brittleSources!,coherent.geometry.layout.doodads);
    assert.ok(nativeFeatureAdmission(compileNativeFeature(coherent),caps).unsupported.includes('native-brittle-source-incompatible'));
    const forged={...prepared,descriptor:coherent,bytes:JSON.stringify(coherent).length*2};assert.throws(()=>validateNativePreparation(request(),forged),/source|identity/);
  }
  console.log('PASS missing/duplicate/foreign slots and coherently rehashed rule/monster/skill/dissolution tampering refuse before publication');

  const rule=doodadRuleOf('burial_urn'),chance=rule.brittle!.spawn;
  assert.ok(chance&&!Array.isArray(chance));
  const debrisRule=doodadRuleOf('debris_clay'),block=debrisRule.blocksMove;
  const registry=nativeBrittleRegistryHash(),life=MONSTERS.skeleton_warrior.base.life,mana=SKILLS.cleave.manaCost,pieces=DISSOLVE_MATERIALS.ceramic.pieces;
  const changes:[()=>void,()=>void][]=[
    [()=>{debrisRule.blocksMove=true;},()=>{if(block===undefined)delete debrisRule.blocksMove;else debrisRule.blocksMove=block;}],
    [()=>{rule.brittle!.orbChance=.99;},()=>{rule.brittle!.orbChance=.55;}],
    [()=>{MONSTERS.skeleton_warrior.base.life=999;},()=>{MONSTERS.skeleton_warrior.base.life=life;}],
    [()=>{SKILLS.cleave.manaCost=999;},()=>{SKILLS.cleave.manaCost=mana;}],
    [()=>{DISSOLVE_MATERIALS.ceramic.pieces=[1,1];},()=>{DISSOLVE_MATERIALS.ceramic.pieces=pieces;}],
  ];
  for(const [change,restore] of changes)try {change();assert.notEqual(nativeBrittleRegistryHash(),registry);
    assert.equal(nativeUrnSourceSupported(definition,d.zone),false);assert.equal(nativeFeatureAdmission(compileNativeFeature(d),caps).ok,false);
    assert.throws(()=>validateNativePreparation(request(),prepared),/identity|source/);
    assert.equal(prepareNativeFeature(job).preparation.failure?.kind,'compatibility');
  }finally{restore();}
  const wind=TELL_SOURCES.wind;
  try{registerTellSource('wind',()=>1);assert.equal(nativeUrnSourceSupported(definition,d.zone),false);}finally{registerTellSource('wind',wind);}
  const cut=dissolveCutOf('shards')!;
  try{registerDissolveCut('shards',()=>[]);assert.equal(nativeUrnSourceSupported(definition,d.zone),false);}finally{registerDissolveCut('shards',cut);}
  assert.equal(nativeBrittleRegistryHash(),registry);assert.equal(nativeUrnSourceSupported(definition,d.zone),true);
  for(const zone of [{...clone(d.zone),spoils:'none' as const},{...clone(d.zone),bounty:2},{...clone(d.zone),caveDepth:1},
    {...clone(d.zone),objective:{kind:'pyres' as const,count:[1,1] as [number,number]}}])assert.equal(nativeUrnSourceSupported(definition,zone),false);
  assert.equal(nativeUrnRewardContextSupported({...clone(d.zone),objective:{kind:'pyres'}}),true,'unrelated shell objective does not change ordinary kill loot');
  assert.equal(nativeUrnRewardContextSupported({...clone(d.zone),spoils:'none'}),false);
  console.log('PASS live selected-rule/monster/skill/dissolution incompatibility and unsupported reward/cave contexts fail closed; no ambient draws/factories');
  console.log('ALL NATIVE BRITTLE SOURCE PROBES PASS (4 groups; compiler/source proof only, not playable urn lifecycle)');
} finally {Math.random=originalRandom;}
