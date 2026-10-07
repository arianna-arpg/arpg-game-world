import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { MassRewards, validateMassRewards } from '../src/worldmass/rewards';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { canonical } from '../src/worldmass/random';
import { SUPPORTS } from '../src/data/supports';
import { instanceMods } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { makeSupportGemItem } from '../src/engine/gemitems';
import { mintSupportInstance } from '../src/engine/supportbase';
import { autoPlace } from '../src/engine/inventory';
import { serializeCharacter } from '../src/meta/character';
import { menuFold } from '../src/engine/menu';
import { ownedUnlockById } from '../src/meta/unlocks';
import '../src/data/menu';
import { memoryProvenanceLabel, makeMemoryItem } from '../src/engine/memories';

const restore=seedGlobalRandom(8723), spec=massAdventure().rewards!;
for(const id of ['warrior','magician','rogue']){
 const w=makeSimWorld(id,32), rewards=new MassRewards(spec,92);
 const account=canonical([...w.account.unlockedSupports]), attrs={...w.meta.attrs};
 assert.ok(rewards.earn(w,'cache:'+id,'A native cache'));
 const offers=rewards.offers(w);
 assert.ok(offers[0].choices.length>=1);
 assert.ok(offers[0].choices.every(c=>c.hosts.length));
 assert.equal(canonical([...w.account.unlockedSupports]),account);assert.deepEqual(w.meta.attrs,attrs);
 assert.equal(rewards.earn(w,'another','Another'),false);
 const frozen=canonical(rewards.snapshot());
 w.account.unlockedSupports.add('widening');w.player.skills=[];
 assert.equal(canonical(rewards.snapshot()),frozen,'UI/build/account changes never reroll earned choices');
 assert.ok(rewards.offers(w)[0].choices.every(c=>!c.hosts.length));
 assert.deepEqual(new MassRewards(spec,999,rewards.snapshot()).snapshot(),rewards.snapshot());
}
console.log('PASS all starter classes earn a usable native support; no attribute/unlock grants and no reroll on build/account changes');

for (const gemId of ['splash','battering_ram'] as const) {
 const world=makeSimWorld('rogue',102), treasure=new MassRewards(spec,102);
 world.account.unlockedSupports.clear();
 const accountBefore=canonical([...world.account.unlockedSupports]);
 assert.ok(treasure.earn(world,'earned-cache','Earned cache'));
 assert.deepEqual(treasure.offers(world)[0].choices.map(c=>c.id),['splash','battering_ram']);
 assert.equal(treasure.claim(world,'earned-cache',gemId),'claimed');
 const item=world.meta.items.find(i=>i.gem?.kind==='support'&&i.gem.supportId===gemId)!;
 assert.ok(world.socketSupport(item.uid,'backstab'));
 assert.equal(canonical([...world.account.unlockedSupports]),accountBefore,'treasure never unlocks future random drops');
 assert.deepEqual(new MassRewards(spec,102,treasure.snapshot()).snapshot(),treasure.snapshot());
 const inst=world.meta.knownSkills.get('backstab')!,p=world.player;
 p.pos={x:500,y:500};p.sheet.setSource('qa/land',[mod('accuracy','override',100000),mod('critChance','override',0)]);
 const enemies=[{x:540,y:500},{x:540,y:545}].map(pos=>{
  const a=world.createMonster('zombie',1,'enemy');a.pos=pos;a.facing=Math.PI;a.skills=[];a.brain=undefined;
  a.sheet.setSource('qa/target',[mod('life','override',10000),mod('evasion','override',0),mod('blockChance','override',0)]);
  a.fillResources();return a;
 });
 world.actors=[p,...enemies];const before=enemies.map(a=>a.life);
 world.executeSkill(p,inst,{x:700,y:500});
 assert.ok(enemies[0].life<before[0]);
 if(gemId==='splash')assert.ok(enemies[1].life<before[1],'earned splash reaches a neighbour outside the direct melee sector');
 else {
  assert.equal(enemies[1].life,before[1],'knockback remains a direct strike');
  assert.ok(enemies[0].push,'earned Battering Ram creates native physical displacement');
 }
}
console.log('PASS authored treasures preserve drop locks and native socketing; actual Backstab splash and knockback differ');

const single=makeSimWorld('rogue',103), oldReward=new MassRewards({...spec,authoredSupports:undefined},103);
assert.ok(oldReward.earn(single,'old-cache','Older cache'));
assert.deepEqual(oldReward.offers(single)[0].choices.map(c=>c.id),['precision'],'omission retains the old Rogue reward');
assert.deepEqual(new MassRewards({...spec,authoredSupports:undefined},103,oldReward.snapshot()).snapshot(),oldReward.snapshot());
assert.throws(()=>new MassRewards({...spec,authoredSupports:undefined},103,[{source:'forged',label:'Bad',
 choices:[{gem:{kind:'support',supportId:'splash',level:1},hosts:['backstab']}]}]));
for(const authoredSupports of [['missing'],['splash','splash'],['precision'],null,'splash'])
 assert.throws(()=>validateMassRewards({...spec,authoredSupports} as never));
console.log('PASS legacy one-choice reward and authored-pool corruption/duplicate refusals');

const accountSpec={...spec,authoredSupports:undefined};
const w=makeSimWorld('warrior',77), rewards=new MassRewards(accountSpec,77);
w.account.unlockedSupports.clear();
assert.equal(rewards.earn(w,'locked','Locked'),false);assert.equal(rewards.snapshot().length,0);
w.account.unlockedSupports.add('concentrated');assert.ok(rewards.earn(w,'earned','Earned'));
const saved=rewards.snapshot();
assert.equal(saved[0].choices.length,1);
assert.equal(rewards.claim(w,'forged','concentrated'),'refused');
assert.equal(rewards.claim(w,'earned','precision'),'refused');
w.meta.items=[];
while(autoPlace(w.meta.items,makeSupportGemItem(mintSupportInstance(SUPPORTS.precision,1)))) {}
assert.equal(rewards.claim(w,'earned','concentrated'),'full');
assert.deepEqual(rewards.snapshot(),saved);
assert.deepEqual(rewards.receipts(),[],'full pack cannot display a paid receipt');
w.meta.items=[];
assert.equal(rewards.claim(w,'earned','concentrated'),'claimed');
assert.equal(rewards.claim(w,'earned','concentrated'),'refused');
const item=w.meta.items[0], cleave=w.meta.knownSkills.get('cleave')!;
const before=instanceMods(cleave);
assert.ok(w.socketSupport(item.uid,'cleave'));
assert.ok(instanceMods(cleave).length>before.length);
assert.ok(cleave.sockets.some(s=>s?.def.id==='concentrated'));
assert.equal(w.meta.items.length,0);
assert.equal(new MassRewards(spec,77,rewards.snapshot()).pending,false);
const receipt = rewards.receipts();
assert.equal(receipt.length,1);
assert.equal(receipt[0].name,SUPPORTS.concentrated.name);
assert.equal(receipt[0].description,SUPPORTS.concentrated.description);
assert.deepEqual(new MassRewards(spec,77,rewards.snapshot()).receipts(),receipt,
 'the chosen reward receipt survives socketing and Continue without minting another gem');
console.log('PASS locked/forged claims refuse, full pack retries, exact one payout, native socket changes Cleave and claimed saves stay claimed');

assert.throws(()=>validateMassRewards({...spec,maxRewards:0}));
assert.throws(()=>validateMassRewards({...spec,supports:['missing']}));
assert.throws(()=>new MassRewards(spec,77,[...saved,...saved]));
assert.throws(()=>new MassRewards(spec,77,[{...saved[0],claimed:'precision'}]));
assert.throws(()=>new MassRewards(spec,77,[{...saved[0],choices:[{...saved[0].choices[0],
 gem:{...saved[0].choices[0].gem,rolled:{bad:'bad'}}}]}]));
console.log('PASS invalid reward policies, duplicate receipts and corrupted payloads refuse');

const cfg:MassAdventure=JSON.parse(canonical(massAdventure()));
delete cfg.progression;delete cfg.journey;delete cfg.ecology;delete cfg.settlement;
delete cfg.terrain.patches;
cfg.terrain.fields =[];
cfg.terrain.surfaces=[{id:'land',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];
cfg.terrain.places=[{id:'camp',version:1,content:'wayside-camp',period:1920,radius:180,jitter:0,chance:1,when:[],priority:1}];
cfg.content=[{...cfg.content.find(c=>c.id==='wayside-camp')!,levels:undefined,count:1}];
delete cfg.content[0].levels;
const live=makeSimWorld('warrior',23),mass=new WorldMassRuntime(47,'reward-world',cfg);mass.attach(live);
live.player.pos={x:960,y:960};mass.update(live,true);
const chest=live.chests[0];assert.ok(chest);
mass.earnCacheReward(live,'forged',chest.pos);assert.equal(mass.rewards.pending,false);
live.player.invulnerable=true;live.player.pos={...chest.pos};
for(let i=0;i<170;i++)live.update(1/30);
assert.ok(chest.opened);assert.ok(mass.rewards.pending);
assert.equal(mass.rewards.snapshot().length,1);
assert.ok(live.drops.length||live.meta.items.length,'ordinary cache spoils still exist');
const fold=()=>menuFold({account:live.account,world:live,seat:live.localSeat,pageOpen:()=>false,
 ownedUnlock:ownedUnlockById(live.account)}).entries.find(e=>e.def.id==='journal')!.attention.lesson;
assert.ok(fold());
const checkpoint=serializeCharacter(live), again=makeSimWorld('warrior',24);
assert.ok(again.adoptWorldState(checkpoint.world));
again.startWorldMass(checkpoint.world!.worldmass!.state.run.seed,checkpoint.world!.worldmass!);
assert.deepEqual(again.massRuntime!.rewards.snapshot(),mass.rewards.snapshot());
const offer=live.explorationRewardOffers()[0],choice=offer.choices[0].id;
assert.equal(live.claimExplorationReward(offer.source,choice,{...live.localSeat}),false);
live.player.dead=true;assert.equal(live.claimExplorationReward(offer.source,choice),false);live.player.dead=false;
assert.ok(live.claimExplorationReward(offer.source,choice));
assert.equal(fold(),false);assert.equal(live.claimExplorationReward(offer.source,choice),false);
assert.equal(live.completedQuests.size,0,'exploration never manufactures quest completion');
const next=makeSimWorld('warrior',25),paid=serializeCharacter(live);assert.ok(next.adoptWorldState(paid.world));
next.startWorldMass(paid.world!.worldmass!.state.run.seed,paid.world!.worldmass!);
assert.equal(next.explorationRewardOffers().length,0);
assert.deepEqual(next.explorationRewardReceipts(),live.explorationRewardReceipts());
console.log('PASS real cache timer, normal loot, menu glow, character save/Continue, seat/death gates and no quest forgery');

delete cfg.rewards;
const legacy=makeSimWorld('warrior',26),old=new WorldMassRuntime(47,'legacy-reward',cfg);old.attach(legacy);
assert.equal(old.snapshot(legacy).rewards,undefined);
const oldSave=old.snapshot(legacy);
new WorldMassRuntime(47,'legacy-reward',cfg,oldSave);
assert.equal(legacy.explorationRewardOffers().length,0);
console.log('PASS legacy descriptors retain their reward behavior');
const address=canonical([canonical(['expedition:1','worldmass/frontier-circuit','east-camp']),'cache']);
assert.equal(memoryProvenanceLabel(address),'Chest');
assert.equal(memoryProvenanceLabel('unknown'),'Found in the world');
assert.equal(memoryProvenanceLabel('zombie','Zombie'),'Zombie');
const memory=makeMemoryItem('rough',[{d:address,s:771}]);
autoPlace(legacy.meta.items,memory);
const recall=legacy.memoryRecallView(legacy.localSeat,memory.uid)!;
assert.equal(recall.groups[0].name,'Chest');
assert.equal(recall.groups[0].d,address,'saved attribution and recall identity stay intact');
console.log('PASS old cache Memory names remain readable without changing their source identity');
const haven=makeSimWorld('warrior',91);haven.startWorldMass(42);
haven.lastCombatAt=haven.time;
assert.equal(haven.swapRefusal(haven.localSeat,'socket'),null,'continuous Lastlight keeps native sanctuary policy');
const out=haven.massRuntime!.journey!.local(haven.massRuntime!.journey!.places[0]);
haven.player.pos={...out};
assert.equal(haven.swapRefusal(haven.localSeat,'socket'),'the blood is still hot');
console.log('PASS continuous Lastlight waives field surgery; the same recent combat refuses outside town');
restore();
