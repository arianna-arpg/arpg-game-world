import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { Q_FRONTIER_WATCH, Q_FRONTIER_STONEWARD } from '../src/quests/frontier';
import { QUESTS } from '../src/quests/defs';
import type { QuestDef } from '../src/quests/types';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { PROGRESSION } from '../src/data/classes';
import { questDoneKey } from '../src/meta/account';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { massQuestDestination, massQuestPins, massQuestSatisfied, validateMassQuests } from '../src/worldmass/quests';
import { canonical } from '../src/worldmass/random';

type Hooks = { acceptableQuests(): QuestDef[]; updateQuestGiver(dt: number): void };
const hooks = (w: World) => w as unknown as Hooks, q = Q_FRONTIER_STONEWARD;
const stand = (w: World, id = 'townsfolk_innkeep') => {
  const a = w.actors.find(a => a.defId === id && !a.dead)!; assert.ok(a);
  w.player.pos = {...a.pos}; w.player.tier = a.tier;
};
const natives = (m: WorldMassRuntime) => (m as unknown as {natives: Map<string,Actor>}).natives;
const earned = (w: World) => w.meta.xp + Array.from({length:w.player.level-1},(_,i)=>PROGRESSION.xpForLevel(i+1)).reduce((a,b)=>a+b,0);
const fresh = (seed: number, config?: MassAdventure) => {
  const w = makeSimWorld('warrior', seed);
  if (config) new WorldMassRuntime(seed,'target-'+seed,config).attach(w); else w.startWorldMass(seed);
  w.player.invulnerable=true;
  w.grantXp(PROGRESSION.xpForLevel(1)+PROGRESSION.xpForLevel(2)); assert.equal(w.player.level,3);
  stand(w); return w;
};
const accept = (w: World, id: string) => {
  if (!hooks(w).acceptableQuests().some(q=>q.id===id)) return false;
  hooks(w).updateQuestGiver(4);return w.activeQuests.some(q=>q.questId===id);
};
const qualify = (w: World) => { w.completedQuests.add(Q_FRONTIER_WATCH.id); stand(w); assert.ok(accept(w,q.id)); };
const visit = (w: World) => {
  const m=w.massRuntime!,p=massQuestDestination(m,q.id)!; w.player.pos=m.journey!.local(p); m.update(w,true);
  return {m,p,id:canonical([p.id,0]),escort:canonical([p.id,'fixture',0])};
};
const continued = (w: World) => {
  const save=serializeCharacter(w),r=makeSimWorld('warrior',99);
  assert.ok(applySavedCharacter(r,save));assert.ok(r.adoptWorldState(save.world));
  r.startWorldMass(save.world!.worldmass!.state.run.seed,save.world!.worldmass);r.player.invulnerable=true;return r;
};
const restore=seedGlobalRandom(69042);
try {
  const w=fresh(42);
  w.account.ledger[questDoneKey(Q_FRONTIER_WATCH.id)]=1;
  assert.equal(accept(w,q.id),false,'prior characters cannot skip this run\'s chain');
  assert.ok(accept(w,Q_FRONTIER_WATCH.id));
  w.activeQuests[0].fieldDone=true;
  assert.equal(accept(w,q.id),false,'an unpaid previous deed is not completed');
  w.activeQuests=[];
  w.completedQuests.add(Q_FRONTIER_WATCH.id);
  const level=w.player.level;w.player.level=2;
  assert.equal(accept(w,q.id),false,'minimum offer level still applies');
  assert.match(w.questGiverPrompt()!,/Return at level 3/);
  const waiting=canonical({quests:w.activeQuests,zones:Object.keys(w.zoneMap),pins:massQuestPins(w)});
  hooks(w).updateQuestGiver(4);
  assert.equal(canonical({quests:w.activeQuests,zones:Object.keys(w.zoneMap),pins:massQuestPins(w)}),waiting);
  const waitingResume=continued(w);stand(waitingResume);
  assert.match(waitingResume.questGiverPrompt()!,/Return at level 3/);
  const hint=q.offerLevelHint;q.offerLevelHint=undefined;
  assert.equal(w.questGiverPrompt(),'No hunts are posted for this country yet.');q.offerLevelHint=hint;
  console.log('PASS an otherwise qualified future contract names its real offer level without acceptance, directions or replay changes');
  w.player.level=level;assert.ok(accept(w,q.id));
  assert.ok(!hooks(w).acceptableQuests().some(x=>x.id===q.id),'active quest cannot be accepted twice');
  const {m,p,id,escort}=visit(w);
  assert.equal(w.activeQuests[0].fieldDone,false);
  assert.equal(massQuestSatisfied(m,q.id,p.id+'/foreign'),false);
  const extra=w.createMonster('stone_sentinel',4,'enemy');extra.pos={...w.player.pos};w.actors.push(extra);
  w.kill(extra,false,w.player);m.update(w,true);
  assert.equal(w.activeQuests[0].fieldDone,false,'another Stone Sentinel has no contract ownership');
  w.chests.find(c=>c.rewardSource===canonical([p.id,'cache']))!.opened=true;m.update(w,true);
  assert.equal(w.activeQuests[0].fieldDone,false,'cache ownership is independent');
  const body=natives(m).get(id)!;assert.ok(body);body.life*=.41;
  const signature=(a:Actor)=>({life:a.life,home:a.aiAnchor,skills:a.skills.map(s=>s&&({id:s.def.id,sockets:s.sockets.map(g=>g?.def.id)}))});
  const before=signature(body),resumed=continued(w),rm=resumed.massRuntime!;
  assert.deepEqual(signature(natives(rm).get(id)!),before);
  assert.deepEqual(resumed.activeQuests,w.activeQuests);
  assert.equal(resumed.activeQuests[0].fieldDone,false);
  console.log('PASS paid current-run and level gates; duplicate species, cache and foreign destinations cannot complete; wounded original native kit and quest survive Continue');

  const prior=earned(resumed),points=resumed.meta.passivePoints;
  resumed.kill(natives(rm).get(id)!,false,resumed.player);rm.update(resumed,true);
  assert.ok(resumed.activeQuests[0].fieldDone);
  assert.ok(!natives(rm).get(escort)!.dead,'escort survives the named target');
  assert.equal(rm.siteCleared(p.id),false,'named deed does not clear the garrison');
  assert.ok(massQuestPins(resumed)[0].ready);
  assert.equal(resumed.meta.passivePoints,points,'reward remains owed in the field');
  assert.ok(earned(resumed)-prior<q.reward.xp!,'only the native kill reward landed');
  const ready=continued(resumed);
  assert.ok(ready.activeQuests[0].fieldDone);assert.equal(ready.massRuntime!.siteCleared(p.id),false);
  assert.ok(!natives(ready.massRuntime!).has(id)&&natives(ready.massRuntime!).has(escort));
  stand(ready,'townsfolk_smith');hooks(ready).updateQuestGiver(4);assert.equal(ready.activeQuests.length,1);
  stand(ready);const owed=earned(ready),pp=ready.meta.passivePoints,lvl=ready.player.level;
  hooks(ready).updateQuestGiver(4);
  assert.ok(ready.completedQuests.has(q.id));assert.equal(ready.activeQuests.length,0);
  assert.equal(earned(ready)-owed,q.reward.xp);
  assert.equal(ready.meta.passivePoints-pp,q.reward.passivePoints!+(ready.player.level-lvl)*PROGRESSION.passivePointsPerLevel);
  const paid={xp:earned(ready),points:ready.meta.passivePoints};
  hooks(ready).updateQuestGiver(4);assert.deepEqual({xp:earned(ready),points:ready.meta.passivePoints},paid);
  const paidAgain=continued(ready);stand(paidAgain);hooks(paidAgain).updateQuestGiver(4);
  assert.deepEqual({xp:earned(paidAgain),points:paidAgain.meta.passivePoints},paid);
  assert.equal(paidAgain.activeQuests.length,0);
  console.log('PASS only original target death earns return, escort/garrison stay independent; pending and paid Continue preserve exactly one native experience/passive reward');

  const escortFirst=fresh(81);qualify(escortFirst);const e=visit(escortFirst);
  escortFirst.kill(natives(e.m).get(e.escort)!,false,escortFirst.player);e.m.update(escortFirst,true);
  assert.equal(escortFirst.activeQuests[0].fieldDone,false,'escort is not the named target');
  const earlier=fresh(142),d=visit(earlier);
  earlier.kill(natives(d.m).get(d.id)!,false,earlier.player);d.m.update(earlier,true);
  const earlierResume=continued(earlier);qualify(earlierResume);earlierResume.massRuntime!.update(earlierResume,true);
  assert.ok(earlierResume.activeQuests[0].fieldDone,'an honestly defeated target before acceptance still counts');
  const unadmitted=fresh(143);qualify(unadmitted);
  const u=massQuestDestination(unadmitted.massRuntime!,q.id)!;
  unadmitted.massRuntime!.state.claim('fallen',canonical([u.id,0]));
  assert.equal(massQuestSatisfied(unadmitted.massRuntime!,q.id,u.id),false,'a missing body without original eligibility is not a deed');
  console.log('PASS escort-first remains afield; pre-accepted death survives Continue; unadmitted or absent bodies cannot invent completion');

  const fixture=structuredClone(massAdventure());
  fixture.content.find(c=>c.id==='stoneward')!.site!.fixtures[0].monster='stone_sentinel';
  fixture.settlement!.quests!.bindings.find(b=>b.quest===q.id)!.defeat={kind:'fixture',index:0};
  validateMassQuests(fixture);
  const fw=fresh(42,fixture);qualify(fw);const f=visit(fw);
  fw.kill(natives(f.m).get(f.id)!,false,fw.player);f.m.update(fw,true);
  assert.equal(fw.activeQuests[0].fieldDone,false);
  fw.kill(natives(f.m).get(f.escort)!,false,fw.player);f.m.update(fw,true);
  assert.ok(fw.activeQuests[0].fieldDone,'fixture binding uses its own original slot');
  const legacy=structuredClone(massAdventure());
  legacy.settlement!.quests!.bindings=legacy.settlement!.quests!.bindings.filter(b=>b.quest!==q.id);
  const old=fresh(71,legacy);old.completedQuests.add(Q_FRONTIER_WATCH.id);
  assert.equal(accept(old,q.id),false,'an older descriptor does not acquire new work');
  const oldAgain=continued(old);stand(oldAgain);assert.equal(accept(oldAgain,q.id),false);
  console.log('PASS fixture targets are separately attributable; older saved binding sets do not acquire the new contract');

  const badCases:((c:MassAdventure)=>void)[]=[
    c=>{delete c.settlement!.quests!.bindings[1].defeat;},
    c=>{c.settlement!.quests!.bindings[1].defeat!.index=-1;},
    c=>{c.settlement!.quests!.bindings[1].defeat!.index=1;},
    c=>{c.settlement!.quests!.bindings[1].defeat!.index=.5;},
    c=>{c.settlement!.quests!.bindings[1].defeat={kind:'fixture',index:0};},
    c=>{c.content.find(r=>r.id==='stoneward')!.table.push({id:'zombie',weight:1});},
    c=>{const r=c.content.find(r=>r.id==='stoneward')!;r.levels=[{level:4,table:r.table}];},
    c=>{c.content.find(r=>r.id==='stoneward')!.magicPack={source:'test',mechanic:'footfall'};},
    c=>{c.settlement!.quests!.bindings[0].defeat={kind:'population',index:0};},
  ];
  for(const mutate of badCases){const c=structuredClone(massAdventure());mutate(c);assert.throws(()=>validateMassQuests(c),/quest objective or destination/);}
  for(const field of [{levelBonus:1},{promote:{kind:'test'}},{uber:{}},{arenaBossRetry:'restart'}]){
    try{QUESTS[q.id]={...q,zone:{...q.zone,objective:{...q.zone.objective,...field} as typeof q.zone.objective}};
      assert.throws(()=>validateMassQuests(massAdventure()),/quest objective or destination/);
    }finally{QUESTS[q.id]=q;}
  }
  try{QUESTS[Q_FRONTIER_WATCH.id]={...Q_FRONTIER_WATCH,zone:{...Q_FRONTIER_WATCH.zone,objective:{kind:'clear',need:1}}};
    assert.throws(()=>validateMassQuests(massAdventure()),/quest objective or destination/);
  }finally{QUESTS[Q_FRONTIER_WATCH.id]=Q_FRONTIER_WATCH;}
  console.log('PASS unsupported targets, indices, rosters, promoted bosses and partial tallies refuse instead of silently changing the objective');
} finally { restore(); }
