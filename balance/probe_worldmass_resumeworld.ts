import assert from 'node:assert/strict';
import { World } from '../src/engine/world';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { atlasSeedInstalled, featuresInRect } from '../src/world/atlas';
import { CLIMATE_CFG } from '../src/world/climate';
import { bagBoard } from '../src/engine/inventory';
import { serializeAccount } from '../src/meta/account';
import { serializeCharacter, readCharacterResume, writeCharacterMirrorRaw, CHAR_SLOT, charKeyFor } from '../src/meta/character';
import { prepareCharacterWorld } from '../src/meta/resumeWorld';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massAdventure } from '../src/worldmass/preset';

const memory = new Map<string,string>();
const storage = {getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v);},
  removeItem:(k:string)=>{memory.delete(k);},clear:()=>memory.clear(),key:(n:number)=>[...memory.keys()][n]??null,get length(){return memory.size;}};
Object.defineProperty(globalThis,'window',{value:{localStorage:storage},configurable:true});
Object.defineProperty(globalThis,'fetch',{value:async()=>new Response('',{status:404}),configurable:true});
const unseed=seedGlobalRandom(71529);
try {
  const live=makeSimWorld('warrior',71529);live.netBagBoard={w:7,h:6};live.bindGlobalPolicies();
  const geographyBefore={seed:atlasSeedInstalled(),capital:structuredClone(CLIMATE_CFG.anchors.capital),
    features:featuresInRect({x:-3,y:-3},{x:3,y:3})};
  const detached=World.staged(structuredClone(live.account),{...live.manifest,seed:88813});detached.netBagBoard={w:4,h:3};
  assert.deepEqual(bagBoard(),{w:7,h:6});
  assert.deepEqual({seed:atlasSeedInstalled(),capital:CLIMATE_CFG.anchors.capital,
    features:featuresInRect({x:-3,y:-3},{x:3,y:3})},geographyBefore);
  detached.withGlobalPolicies(()=>assert.equal(atlasSeedInstalled(),88813));
  assert.equal(atlasSeedInstalled(),geographyBefore.seed);
  assert.throws(()=>detached.withGlobalPolicies(()=>{assert.deepEqual(bagBoard(),{w:4,h:3});throw Error('factory refused');}),/factory refused/);
  assert.deepEqual(bagBoard(),{w:7,h:6});
  const newer=makeSimWorld('warrior',71530);newer.netBagBoard={w:8,h:7};newer.bindGlobalPolicies();
  detached.withGlobalPolicies(()=>assert.deepEqual(bagBoard(),{w:4,h:3}));
  assert.deepEqual(bagBoard(),{w:8,h:7},'a later tranche restores the newer policy owner');
  console.log('PASS detached constructor and throwing/later native factory tranches preserve the current global policies');

  const baseline=JSON.stringify(serializeAccount(live.account));
  live.account.features.add('resume-concurrent-vault');
  assert.equal(detached.publishResumeAccount(live.account,baseline),false,'Set mutation must invalidate account authority');
  assert.ok(live.account.features.has('resume-concurrent-vault'));
  assert.notEqual(detached.account,live.account);
  console.log('PASS a concurrent Vault Set mutation cannot be overwritten by a stale candidate');

  const config=structuredClone(massAdventure());delete config.nativeCountry;delete config.geography;
  const source=makeSimWorld('warrior',71531), runtime=new WorldMassRuntime(713,'expedition:713',config);
  runtime.attach(source);source.time=140;source.player.pos={x:6000,y:0};runtime.update(source,true);
  const baselineBody=runtime.snapshot(source).enemies[0];assert.ok(baselineBody);
  const native=source.actors.find(a=>a.defId===baselineBody.monster&&a.pos.x===baselineBody.x&&a.pos.y===baselineBody.y);assert.ok(native);
  native.life*=.57;
  const save=serializeCharacter(source),root=JSON.stringify(save),accountBefore=JSON.stringify(serializeAccount(source.account));
  await writeCharacterMirrorRaw(CHAR_SLOT,root);newer.bindGlobalPolicies();
  const read=await readCharacterResume();assert.equal(read.status,'ready');if(read.status!=='ready')throw Error('No authority');
  const prepared=await prepareCharacterWorld(source.account,read.resume,{isCurrent:()=>true,fallbackSeed:713,spawn:'exact'});
  assert.notEqual(prepared.world,source);assert.equal(JSON.stringify(serializeAccount(source.account)),accountBefore);
  assert.deepEqual(bagBoard(),{w:8,h:7});
  const resumed=prepared.publish();assert.equal(resumed.account,source.account);resumed.bindGlobalPolicies();
  assert.deepEqual(resumed.player.pos,source.player.pos);
  const snapshots=resumed.massRuntime!.snapshot(resumed).enemies;
  assert.ok(snapshots.some(e=>e.monster===native.defId&&Math.abs(e.life-native.life)<1e-8),'native wounds survive staged restoration');
  prepared.discard();assert.ok(resumed.massRuntime,'discard cannot erase a published world');
  console.log('PASS native inline Continue stages exact wounds/pose before synchronous account/world publication');

  await writeCharacterMirrorRaw(CHAR_SLOT,root);
  const second=await readCharacterResume();assert.equal(second.status,'ready');if(second.status!=='ready')throw Error('No authority');
  const candidate=await prepareCharacterWorld(source.account,second.resume,{isCurrent:()=>true,fallbackSeed:713,spawn:'exact'});
  const replacement=JSON.stringify({...save,xp:save.xp+7});await writeCharacterMirrorRaw(CHAR_SLOT,replacement);
  assert.throws(()=>candidate.publish(),/superseded/);candidate.discard();
  assert.equal(memory.get(charKeyFor(CHAR_SLOT)),replacement);
  assert.equal(resumed.account,source.account);
  console.log('PASS same-slot replacement after preparation refuses stale publication and preserves the newer root');

  const broken=structuredClone(save);broken.world!.schemaVersion=-100;
  await writeCharacterMirrorRaw(CHAR_SLOT,JSON.stringify(broken));
  const bad=await readCharacterResume();assert.equal(bad.status,'ready');if(bad.status!=='ready')throw Error('No authority');
  const retained=memory.get(charKeyFor(CHAR_SLOT));const acc=JSON.stringify(serializeAccount(source.account));
  await assert.rejects(prepareCharacterWorld(source.account,bad.resume,{isCurrent:()=>true,fallbackSeed:713,spawn:'exact'}),/saved world/);
  assert.equal(memory.get(charKeyFor(CHAR_SLOT)),retained);assert.equal(JSON.stringify(serializeAccount(source.account)),acc);
  console.log('PASS invalid seamless world refuses without fresh generation, account promotion or character wipe');
  const transition=makeSimWorld('warrior',71532);transition.mireilleXpBuff=10;
  const phase=transition as unknown as {pendingRespawn:unknown;updateModeRespawn(dt:number):void};
  let readinessCalls=0;
  const pending={nativeReadiness:()=>{readinessCalls++;return {status:'pending'};}} as unknown as WorldMassRuntime;
  phase.pendingRespawn={};phase.updateModeRespawn=()=>{phase.pendingRespawn=null;transition.massRuntime=pending;};
  const beforeTransition=transition.time;transition.update(.1);
  assert.equal(transition.time,beforeTransition+.1,'the elapsed slice belongs to the old scene');
  assert.equal(readinessCalls,1);assert.equal(transition.mireilleXpBuff,10,'no remaining surface effect clock advances while its cohort is unavailable');
  transition.massRuntime=null;
  console.log('PASS a mid-frame survived-death surface swap holds remaining native effects before missing cohorts');
  resumed.massRuntime?.dispose();runtime.dispose();
  await verifyClassicInlineAndRosterResumption();
} finally { unseed(); }

/** Exercise the shared Continue orchestration with actual finite native saves.
 * The arena helper only boots registries; all saved ground/bodies below are
 * the unchanged authored crossroads, with controlled wounds and hero pose. */
async function verifyClassicInlineAndRosterResumption(): Promise<void> {
  const { CLASSES } = await import('../src/data/classes');
  const { START_ZONE } = await import('../src/data/zones');
  const { freeRosterSlot, modeById } = await import('../src/meta/modes');
  const { resolveResumeSpawn } = await import('../src/meta/worldstate');
  const { saveCharacter, flushCharacterSaves } = await import('../src/meta/character');
  const classic = makeSimWorld('warrior',71533);
  classic.loadZone('crossroads',START_ZONE);
  const classicRoot = JSON.stringify(serializeCharacter(classic));
  await writeCharacterMirrorRaw(CHAR_SLOT,classicRoot);
  for (const modeId of ['mortal','immortal'] as const) {
    const finite = makeSimWorld('warrior',modeId==='mortal'?71534:71535);
    const charId='finite-resume-'+modeId;
    finite.createPlayer(CLASSES.find(c=>c.id==='warrior')!,{modeId,charId,
      startingCompanions:false,startingFlasks:false});
    const mode=modeById(modeId),slot=mode.save==='roster'?freeRosterSlot(finite.account,mode)!:CHAR_SLOT;
    if(mode.save==='roster')finite.account.roster.push({charId,modeId,slot,classId:'warrior',
      name:'Finite roster witness',level:1,stage:0,savedAt:0});
    finite.loadZone('crossroads',START_ZONE);finite.time=137;
    finite.player.pos={x:finite.player.pos.x+9,y:finite.player.pos.y+13};
    finite.player.life=finite.player.maxLife()*.43;finite.player.mana=finite.player.maxMana()*.38;
    const witness=finite.actors.find(a=>a.team==='enemy'&&a.fromZoneGen&&!a.dead&&!a.doorId&&!a.passive);
    assert.ok(witness,'actual finite native population is required');witness.life*=.61;
    const saved=serializeCharacter(finite),body=JSON.stringify(saved),spot=saved.world!.player!;
    const memo=saved.world!.memory!.find(row=>row.zoneId==='crossroads')!;
    assert.ok(memo.enemies.some(a=>a.defId===witness.defId&&a.x===witness.pos.x&&a.y===witness.pos.y&&a.life===witness.life));
    assert.equal(saved.world!.worldmass,undefined);assert.equal(saved.charId,charId);
    for(const choice of ['exact','town'] as const) {
      await writeCharacterMirrorRaw(slot,body);
      const mortalBefore=memory.get(charKeyFor(CHAR_SLOT));
      const read=await readCharacterResume(slot);assert.equal(read.status,'ready');
      if(read.status!=='ready')throw Error('Missing finite resume authority');
      assert.equal(read.resume.kind,'inline');
      const accountBefore=JSON.stringify(serializeAccount(finite.account));
      const candidate=await prepareCharacterWorld(finite.account,read.resume,{isCurrent:()=>true,
        fallbackSeed:999999,spawn:resolveResumeSpawn(mode.resume,choice),
        ...(mode.save==='roster'?{roster:{charId,modeId}}:{})});
      assert.equal(JSON.stringify(serializeAccount(finite.account)),accountBefore,'staging leaves live account alone');
      const restored=candidate.publish();restored.bindGlobalPolicies();
      assert.equal(restored.massRuntime,null);assert.equal(restored.meta.charId,charId);assert.equal(restored.meta.modeId,modeId);
      assert.equal(restored.manifest.seed,finite.manifest.seed,'fallback seed cannot replace an adoptable finite world');
      assert.equal(restored.time,finite.time);assert.ok(restored.visited.has('crossroads'));
      assert.deepEqual(restored.zoneMap.crossroads.exits,finite.zoneMap.crossroads.exits,'existing geographic routes survive Continue');
      assert.equal(restored.zone.id,choice==='exact'?'crossroads':START_ZONE);
      if(choice==='exact') {
        assert.deepEqual(restored.player.pos,{x:spot.x,y:spot.y});
        assert.ok(Math.abs(restored.player.life/restored.player.maxLife()-.43)<1e-10,'exact finite Continue keeps native wounded vitals');
        assert.ok(Math.abs(restored.player.mana/restored.player.maxMana()-.38)<1e-10);
      } else {
        assert.notDeepEqual(restored.player.pos,{x:spot.x,y:spot.y});
        assert.equal(restored.player.life,restored.player.maxLife(),'safe-town wake uses the native refreshed arrival');
        assert.equal(restored.player.mana,restored.player.maxMana());
      }
      if(mode.save==='roster') {
        assert.deepEqual(restored.account.roster.find(r=>r.charId===charId),finite.account.roster.find(r=>r.charId===charId));
        assert.equal(restored.account.roster.find(r=>r.charId===charId)!.slot,slot);
      }
      saveCharacter(restored);await flushCharacterSaves();
      const written=JSON.parse(memory.get(charKeyFor(slot))!);
      assert.equal(written.charId,charId);assert.equal(written.modeId,modeId);
      assert.equal(written.world.player.zoneId,choice==='exact'?'crossroads':START_ZONE);
      if(mode.save==='roster')assert.equal(memory.get(charKeyFor(CHAR_SLOT)),mortalBefore,'roster Continue/save cannot overwrite the mortal slot');
      // Town relocates the hero only: an actual later entry restores the same
      // finite survivor memory instead of rerolling a fresh authored pack.
      if(choice==='town')restored.loadZone('crossroads',START_ZONE);
      const survivors=restored.actors.filter(a=>a.team==='enemy'&&a.fromZoneGen&&!a.dead&&!a.doorId);
      assert.equal(survivors.length,memo.enemies.length,'finite zone memory cannot duplicate the saved population');
      const kept: import('../src/engine/actor').Actor | undefined=survivors.find(a=>a.defId===witness.defId&&a.pos.x===witness.pos.x&&a.pos.y===witness.pos.y);
      assert.ok(kept);assert.equal(kept.life,witness.life,'the original finite wounded survivor is retained');
      candidate.discard();
    }
    console.log('PASS actual finite '+modeId+' exact/safe-town staged Continue preserves survivor memory, routes, vitals and correct save-slot identity');
  }
}
