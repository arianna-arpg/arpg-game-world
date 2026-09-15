import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { FEATURE } from '../src/meta/account';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { travelRoutes } from '../src/world/travelRoutes';
import { BOUNTY_BOARD_CFG, clonePosting, bountyUniquePool, bountyUniqueCategories, rollBountyPay, type BountyRollHost, type BountyPosting } from '../src/data/bountyboard';
import { Rng } from '../src/core/rng';
import { rollItem, itemLevelReq } from '../src/engine/itemgen';
import { tierForIlvl, ITEM_CFG } from '../src/engine/items';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { registerEdgeBlockSource } from '../src/world/edgeBlocks';
import { HOLD_CLASSES, mintHoldState } from '../src/data/harborholds';
import { UNIQUE_LIST } from '../src/data/uniques';
import { sanitizeBountyBoard } from '../src/meta/worldstate';

function make(seed: number) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  w.account.features.add(FEATURE.BOUNTY_BOARD);
  w.loadZone('lastlight');
  return w;
}
let crossings = 0;
for (const seed of [1,2,3,4,5,6,7,8,9,10,11,12,20,28,47,49,50,76,97,601,1009]) {
  const w = make(seed);
  const knowledge = () => JSON.stringify({visited:[...w.visited],surveyed:[...w.surveyed]});
  const before = knowledge();
  w.armBountyBoard();
  assert(w.bountyOffers.some(p => w.bountyAppropriate(p)), `${seed}: first writ`);
  assert.equal(knowledge(), before);
  const initial = w.bountyOffers.find(p => w.bountyAppropriate(p))!;
  assert.deepEqual(w.bountyApproaches('lastlight',true).get(initial.zoneId)?.path, ['lastlight','crossroads']);
  w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
  w.time += BOUNTY_BOARD_CFG.beatSec;
  w.armBountyBoard();
  const easy = w.bountyOffers.filter(p => w.bountyAppropriate(p));
  assert(easy.length >= 2, `${seed}: two manageable reward choices`);
  assert(w.bountyOffers.some(p => (w.zoneMap[p.zoneId]?.level ?? p.expedition?.level ?? 0) > 1), `${seed}: deliberate stretch choice`);
  assert(new Set(easy.map(p => Object.keys(p.pay).filter(k=>k!=='level').join(','))).size >= 2);
  const chosen = easy.find(p => p.zoneId !== 'crossroads')!;
  const path = w.bountyApproaches('lastlight',true).get(chosen.zoneId)!.path;
  assert.equal(path[1], 'crossroads');
  Object.assign(w.player.pos,w.townSeat('bounty_board')); // issuing counter, outside the Waking House
  for (const id of path.slice(1)) {
    const door = w.exits.find(e => e.to === id);
    assert(door && !w.isExitLocked(door), `${seed}: actual portal to ${id}`);
    const nav = w.pathField();
    assert(!nav?.reachable || nav.reachable(w.player.pos,door.pos), `${seed}: portal terrain`);
    const from = w.zone.id; w.loadZone(id,from); crossings++;
    assert(w.zone.level <= w.player.level);
  }
  w.loadZone('lastlight');
  w.armBountyBoard(); // visiting an errand target correctly strikes that finished offer
  const levels = Object.fromEntries(Object.values(w.zoneMap).map(z=>[z.id,z.level]));
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const resumed = make(seed);
  assert(applySavedCharacter(resumed,saved)); assert(resumed.adoptWorldState(saved.world));
  assert.deepEqual(resumed.bountyOffers, w.bountyOffers);
  for (const [id,level] of Object.entries(levels)) assert.equal(resumed.zoneMap[id]?.level,level);
  const standing = JSON.stringify(resumed.bountyOffers);
  resumed.armBountyBoard(); assert.equal(JSON.stringify(resumed.bountyOffers),standing);
}
console.log(`PASS opening/cleared boards, reward variety, ${crossings} real portal and terrain crossings, save/resume`);

// Route geometry traps: nearby low ground behind a high unavoidable pass is not
// appropriate; sealed objectives are destinations but cannot be transit.
{
  const w=make(11), root=w.zoneMap.crossroads;
  const z=(id:string, level:number, x:number)=>({...root,id,level,map:{x,y:0},exits:[] as typeof root.exits});
  const a=z('a',1,0), b=z('b',9,1), c=z('c',1,2), d=z('d',1,50);
  a.exits=[{to:'b',side:'e'},{to:'d',side:'s'}]; b.exits=[{to:'c',side:'e'}]; d.exits=[{to:'c',side:'n'}];
  const zones={a,b,c,d};
  const routes=travelRoutes(zones,'a',{maxLevel:1,maxSteps:2,maxDistance:200},()=>true,()=>false);
  assert.deepEqual(routes.get('c')?.path,['a','d','c']);
  assert(!travelRoutes(zones,'a',{maxLevel:1,maxSteps:1,maxDistance:200},()=>true,()=>false).has('c'));
  d.objective={kind:'boss',id:'zombie'};
  assert(!travelRoutes(zones,'a',{maxLevel:1,maxSteps:6,maxDistance:200},()=>true,()=>false).has('c'));
  assert(travelRoutes(zones,'a',{maxLevel:1,maxSteps:6,maxDistance:200},()=>true,id=>id==='d').has('c'));
}
console.log('PASS peak danger, travel budget, alternate paths, objective seals');

// The live graph must respect tolls, harbor gates and temporary event blockades.
{
  const w=make(11); w.loadZone('crossroads'); w.loadZone('lastlight');
  const e=w.zoneMap.lastlight.exits.find(e=>e.to==='crossroads')!;
  e.lock='probe_toll';
  const old=(w.sim.holdfastField as any).isLocked;
  (w.sim.holdfastField as any).isLocked=()=>true;
  assert(!w.bountyApproaches('lastlight',true).has('crossroads'));
  (w.sim.holdfastField as any).isLocked=old; delete e.lock;
  let blocked=true;
  registerEdgeBlockSource((world,a,b)=>world===w && blocked && (a==='lastlight'||b==='lastlight')
    ? {source:'probe',reason:'closed'} : null);
  assert(!w.bountyApproaches('lastlight',true).has('crossroads'));
  blocked=false; assert(w.bountyApproaches('lastlight',true).has('crossroads'));
}
console.log('PASS live toll and event locks');

// Regional board: use two genuinely connected generated fields as the open
// hold/quay fixture, then require routes rooted at that issuing counter.
for (const seed of [11,20,76]) {
  const w=make(seed); w.loadZone('crossroads'); w.completedObjectives.add('crossroads');
  const path=[...w.bountyApproaches('lastlight',true).values()].find(r=>r.path.length>=3)!;
  const port=w.zoneMap[path.path[path.path.length-1]], anchor=w.zoneMap.crossroads;
  const cls=Object.values(HOLD_CLASSES).find(c=>c.services.some(s=>s.id==='bounty_board'))!;
  anchor.harborhold={...mintHoldState(cls),state:'open',prosperity:1}; port.holdAnchor=anchor.id;
  w.armBountyBoard(port.id);
  assert(w.bountyOffers.some(p=>p.boardId===port.id && w.bountyAppropriate(p)));
  for(const route of w.bountyApproaches(port.id,true).values()) assert.equal(route.path[0],port.id);
  const saved=JSON.parse(JSON.stringify(serializeCharacter(w))), resumed=make(seed);
  assert(applySavedCharacter(resumed,saved)); assert(resumed.adoptWorldState(saved.world));
  assert.deepEqual(resumed.bountyOffers,w.bountyOffers);
}
console.log('PASS regional board approach roots and save/resume');

// Outgrown, exhausted and pinned slates: fixed commissioned marks reuse real
// low ground; level-ups never rewrite existing offers, hands or zone levels.
{
  const w=make(20); w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight'); w.armBountyBoard();
  w.bountyOffers[0].locked=true;
  const prior=w.bountyOffers.map(clonePosting), levels=Object.values(w.zoneMap).map(z=>[z.id,z.level]);
  w.player.level=20;
  const knowledge=JSON.stringify([[...w.visited],[...w.surveyed]]);
  w.armBountyBoard();
  for (const p of prior) assert.deepEqual(w.bountyOffers.find(o=>o.id===p.id),p);
  const relief=w.bountyOffers.find(p=>w.bountyAppropriate(p))!;
  assert(relief?.challengeLevel===19);
  assert.deepEqual(Object.values(w.zoneMap).map(z=>[z.id,z.level]),levels);
  assert.equal(JSON.stringify([[...w.visited],[...w.surveyed]]),knowledge);
  const at=w.townSeat('bounty_board'); Object.assign(w.player.pos,at);
  assert(w.acceptBounty(relief.id));
  const hand=clonePosting(w.bountyHands[0]);
  w.player.level=21; w.armBountyBoard(); assert.deepEqual(w.bountyHands[0],hand);
  const saved=JSON.parse(JSON.stringify(serializeCharacter(w)));
  const resumed=make(20); assert(applySavedCharacter(resumed,saved)); assert(resumed.adoptWorldState(saved.world));
  assert.deepEqual(resumed.bountyHands[0],hand);
  resumed.loadZone(hand.zoneId);
  const marks=resumed.actors.filter(a=>a.tag==='bounty_mark');
  assert.equal(marks.length,BOUNTY_BOARD_CFG.routes.fallbackMarks);
  assert(marks.every(a=>a.level===19));
  resumed.bountyHands[0].cull!.claimed=hand.cull!.count;
  resumed.loadZone('lastlight'); Object.assign(resumed.player.pos,resumed.townSeat('bounty_board'));
  assert(resumed.turnInBounty(hand.id)); assert(!resumed.bountyHands.length);
}
console.log('PASS depleted/outgrown fallback, pinned choices, active work, actual frozen quarry, turn-in');

// Reward budgets, pool boundaries, exact unique eligibility and equipment
// requirements use the real roller, including ordinary Magic overroll rules.
{
  const w=make(1), rng=new Rng(11), host={pickGemId:()=>null} as unknown as BountyRollHost;
  let items=0;
  for(const level of [1,2,7,8,15,16,25,26,45,60,80]) {
    for(const u of bountyUniquePool(level)) assert((UNIQUE_LIST.find(x=>x.id===u.id)?.minIlvl??0)<=level);
    for(const category of bountyUniqueCategories(level)) {
      const it=rollItem({ilvl:level,category,rarity:'unique',rng:()=>rng.next()}); assert(it?.rarity==='unique');
    }
    for(let i=0;i<20;i++) {
      const pay={...rollBountyPay(host,rng,level,{essence:0,pouch:0,lot:1,unique:0,craft:0}),level};
      assert(pay.lot);
      const p:BountyPosting={id:`test_${level}_${i}`,kind:'cull',zoneId:'crossroads',boardId:'lastlight',beat:0,pay};
      const landed:any[]=[]; (w as any).dropGearAt=(_at:unknown,item:unknown)=>landed.push(item);
      w.zoneMap.crossroads.level=99; w.player.level=99;
      (w as any).payBountyLanes(p,w.localSeat);
      assert.equal(landed.length,pay.lot.count);
      for(const it of landed) {
        assert.equal(it.ilvl,level); assert.equal(it.tier,tierForIlvl(level));
        assert(itemLevelReq(it)<=level); assert(['magic','rare'].includes(it.rarity)); items++;
        for(const affix of it.affixes) {
          const def=ITEM_AFFIXES[affix.id], eligible=def.tiers.findIndex(t=>t.ilvl<=level && (!t.magicOnly || it.rarity==='magic'));
          assert(eligible>=0, 'a family must have an eligible tier');
          assert(affix.tier >= eligible - (it.rarity==='magic' ? ITEM_CFG.magic.overroll.maxSteps : 0));
        }
      }
      assert.deepEqual(sanitizeBountyBoard({armedBeat:0,offers:[p]},w.zoneMap)?.offers[0],p);
    }
  }
  console.log(`PASS ${items} awarded items match frozen budgets, tier/requirement and stated grades`);
}

// An unaccepted expedition has no target zone yet. Both clone and sanitizer
// must retain its charter; accepted expeditions require their actual ground.
{
  const w=make(1), p:BountyPosting={id:'bounty_charter',kind:'expedition',boardId:'lastlight',zoneId:'expedition_future',beat:0,
    expedition:{map:'probe',anchor:'crossroads',seed:123,level:3},pay:{level:3,essence:[{essence:'coarse',count:11}]}};
  assert.deepEqual(clonePosting(p),p);
  assert.deepEqual(sanitizeBountyBoard({armedBeat:0,offers:[p]},w.zoneMap)?.offers[0],p);
  assert.equal(sanitizeBountyBoard({armedBeat:0,hands:[{...p,acceptAt:1}]},w.zoneMap),null);
}
console.log('PASS unaccepted expedition charter persistence and accepted-ground validation');
