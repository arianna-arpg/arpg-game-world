import { beforeWildernessPaths } from './worldmassFixtures';
import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { LegacyMassRewardArchive, type MassRewardSpec } from '../src/worldmass/rewards';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { SUPPORTS } from '../src/data/supports';
import { mintSupportInstance } from '../src/engine/supportbase';
import { packSupportGemPayload } from '../src/engine/gemitems';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { MetaAction } from '../src/net/intent';
import { menuFold } from '../src/engine/menu';
import { ownedUnlockById } from '../src/meta/unlocks';
import '../src/data/menu';
import { memoryProvenanceLabel } from '../src/engine/memories';

const restore=seedGlobalRandom(8723);
try {
 const cfg:MassAdventure=structuredClone(beforeWildernessPaths(structuredClone(massAdventure())));
 assert.equal(cfg.rewards,undefined,'new expeditions have no support-choice policy');
 delete cfg.progression;delete cfg.journey;delete cfg.ecology;delete cfg.settlement;
 delete cfg.terrain.patches;delete cfg.terrain.landforms;delete cfg.terrain.regionalDiscoveries;delete cfg.terrain.nativeRegional;
 cfg.terrain.fields=[];
 cfg.terrain.surfaces=[{id:'land',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];
 cfg.terrain.places=[{id:'camp',version:1,content:'wayside-camp',period:1920,radius:180,jitter:0,chance:1,when:[],priority:1}];
 cfg.content=[{...cfg.content.find(c=>c.id==='wayside-camp')!,count:1}];delete cfg.content[0].levels;
 const live=makeSimWorld('warrior',23),mass=new WorldMassRuntime(47,'reward-world',cfg);mass.attach(live);
 live.player.pos={x:960,y:960};mass.update(live,true);
 const chest=live.chests[0];assert.ok(chest);live.player.invulnerable=true;live.player.pos={...chest.pos};
 for(let i=0;i<170;i++)live.update(1/30);
 assert.ok(chest.opened);assert.ok(live.drops.length||live.meta.items.length,'native cache loot still pays');
 assert.equal(mass.snapshot(live).rewards,undefined);assert.equal('explorationRewardOffers' in live,false);
 assert.equal(menuFold({account:live.account,world:live,seat:live.localSeat,pageOpen:()=>false,
  ownedUnlock:ownedUnlockById(live.account)}).entries.find(e=>e.def.id==='journal')!.attention.lesson,false);
 console.log('PASS actual cache search and native loot without support offers, ribbon or Journal reward attention');

 const spec:MassRewardSpec={source:'worldmass/first-discovery-support-v3',earnFrom:['cache','puzzle'],
  supports:['precision'],level:1,maxRewards:1};
 const gem=mintSupportInstance(SUPPORTS.precision,1,()=>.5);
 for(const claimed of [undefined,'precision']) {
  const oldCfg=structuredClone(cfg);oldCfg.rewards=spec;
  const w=makeSimWorld('rogue',24),m=new WorldMassRuntime(47,'historical-offer',oldCfg);m.attach(w);
  const carried=w.grantSupportGemItem(w.localSeat,gem)!;assert.ok(carried);
  const fitted=w.grantSupportGemItem(w.localSeat,gem)!;w.lastCombatAt=-100;
  assert.ok(w.socketSupport(fitted.uid,'backstab'));
  const save=serializeCharacter(w);
  save.world!.worldmass!.rewards=[{source:'old-cache',label:'Old cache',choices:[{gem:packSupportGemPayload(gem),hosts:['backstab']}],...(claimed?{claimed}:{})}];
  const resumed=makeSimWorld('rogue',25);assert.ok(applySavedCharacter(resumed,save));assert.ok(resumed.adoptWorldState(save.world));
  resumed.startWorldMass(47,save.world!.worldmass);
  assert.ok(resumed.meta.items.some(i=>i.uid===carried.uid),'already owned bag item is retained');
  assert.equal(resumed.meta.knownSkills.get('backstab')!.sockets[0]!.def.id,'precision','already fitted gem retained');
  assert.deepEqual(resumed.massRuntime!.legacyRewards.snapshot(),save.world!.worldmass!.rewards);
  const before=JSON.stringify(serializeCharacter(resumed));
  resumed.applyAction(resumed.localSeat,{t:'explorationReward',source:'old-cache',choiceId:'precision'} as unknown as MetaAction);
  assert.equal(JSON.stringify(serializeCharacter(resumed)),before,'old or forged claim intent cannot mint anything');
  assert.equal('claimExplorationReward' in resumed,false);
 }
 assert.throws(()=>new LegacyMassRewardArchive(undefined,[{source:'bad',label:'Bad',choices:[]}]));
 assert.throws(()=>new LegacyMassRewardArchive(spec,[{source:'bad',label:'Bad',choices:[]}]));
 assert.equal(memoryProvenanceLabel(canonical([canonical(['expedition:1','worldmass/frontier-circuit','east-camp']),'cache'])),'Chest');
 console.log('PASS legacy pending/paid saves remain readable; owned bag/socket gems survive; obsolete intents refuse without mutation');
} finally {restore();}
