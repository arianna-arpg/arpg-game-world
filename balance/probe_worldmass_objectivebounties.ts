import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { townStationFeatures } from '../src/data/townBuild';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { sanitizeBountyBoard } from '../src/meta/worldstate';
import { dealMassBounties, massBountyDestination, massBountyDone, savedMassBounty } from '../src/worldmass/bounties';
import { massQuestPins } from '../src/worldmass/quests';
import { localOffset } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import type { HoldFixture } from '../src/engine/holdObjectives';
import type { BountyPosting } from '../src/data/bountyboard';
import type { World } from '../src/engine/world';

const undo=seedGlobalRandom(45127);
const fresh=(seed:number)=>{const w=makeSimWorld('warrior',seed);for(const f of townStationFeatures())w.account.features.add(f);w.startWorldMass(seed);w.player.invulnerable=true;return w;};
const rows=(w:World,kind:'pyres'|'rifts'|'unearth')=>(w as unknown as {pyres:HoldFixture[];rifts:HoldFixture[];digs:HoldFixture[]})[kind==='unearth'?'digs':kind];
try{for(const kind of ['pyres','rifts','unearth'] as const){
 let w=fresh(901743),m=w.massRuntime!;
 let plan:NonNullable<ReturnType<NonNullable<typeof m.geography>['plannedAt']>>|undefined;
 for(let r=0;r<=24&&!plan;r++)for(let y=-r;y<=r&&!plan;y++)for(let x=-r;x<=r&&!plan;x++){
   if(Math.max(Math.abs(x),Math.abs(y))!==r)continue;
   const p=m.geography!.plannedAt(m.walk.at(x*5400+2700,y*5400+2700));
   if(p?.context.zone.objective.kind===kind)plan=p;
 }
 assert.ok(plan,'real default geography supplies an objective');
 w.landPartyAt(localOffset(plan.owner.center,{...m.origin,x:0,y:0},960));m.update(w,true);
 assert.ok(m.geography!.objectives.target(plan.owner.id));
 w.player.level=Math.max(w.player.level,plan.context.zone.level);
 const board=m.settlement!;w.landPartyAt(board.spawn);m.update(w,true);
 const before=canonical(m.geography!.hierarchy.snapshot()),terrain=canonical(m.state.snapshot()),population=w.actors.length;
 let posting:BountyPosting|undefined;
 for(let sequence=0;sequence<32&&!posting;sequence++){
   const offers=dealMassBounties(w,'lastlight',0,sequence,false,()=>null);
   posting=offers.find(p=>p.kind==='country_objective'&&p.massBounty?.id===plan!.owner.id);
   if(posting)w.bountyOffers=offers;
 }
 assert.ok(posting,'native slate deals admitted unfinished geographic work');
 assert.equal(canonical(m.geography!.hierarchy.snapshot()),before,'reading board cannot start, progress or mount objectives');
 assert.equal(canonical(m.state.snapshot()),terrain);assert.equal(w.actors.length,population);
 assert.ok(w.acceptBounty(posting.id));assert.equal(w.handState(posting),'afield');
 assert.ok(massQuestPins(w).some(pin=>!pin.ready));
 const save=serializeCharacter(w),witness=posting.massBounty!;
 assert.deepEqual(savedMassBounty(witness,save.world!.worldmass),witness);
 const wrong={...witness,objective:{...witness.objective!,definitionHash:'wrong'}};
 assert.equal(savedMassBounty(wrong,save.world!.worldmass),undefined);
 assert.equal(massBountyDestination(m,wrong),undefined);
 const crossed={...witness,objective:{...witness.objective!,kind:kind==='pyres'?'rifts' as const:'pyres' as const}};
 assert.equal(savedMassBounty(crossed,save.world!.worldmass),undefined);assert.equal(massBountyDestination(m,crossed),undefined);
 for(const center of [undefined,{...witness.center,x:NaN},{...witness.center,cx:'bad'}]){
   const damaged={...witness,center} as typeof witness;
   assert.equal(savedMassBounty(damaged,save.world!.worldmass),undefined);
   assert.equal(massBountyDestination(m,damaged),undefined);
   assert.equal(sanitizeBountyBoard({offers:[{...posting,massBounty:damaged}]},{},save.world!.worldmass),null);
 }
 assert.equal(sanitizeBountyBoard({offers:[{...posting,kind:'country_visit'}]}, {},save.world!.worldmass),null,'ordinary visit cannot forge a hold completion');
 const continued=fresh(17);assert.ok(applySavedCharacter(continued,save));assert.ok(continued.adoptWorldState(save.world));
 continued.startWorldMass(save.world!.worldmass!.state.run.seed,save.world!.worldmass);w=continued;m=w.massRuntime!;
 const hand=w.bountyHands.find(p=>p.id===posting!.id)!;assert.ok(hand);assert.equal(w.handState(hand),'afield');
 assert.equal(massBountyDone(w,{...hand,massBounty:wrong}),false);
 w.landPartyAt(localOffset(plan.owner.center,{...m.origin,x:0,y:0},960));m.update(w,true);
 const fixtures=rows(w,kind).filter(s=>s.owner===plan!.owner.id);assert.equal(fixtures.length,plan.positions.length);
 for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead)w.kill(a,false,w.player);
 for(const f of fixtures){
   for(const a of [...w.actors])if(a.team==='enemy'&&!a.dead)w.kill(a,false,w.player);
   const positions=[[65,0],[-65,0],[0,65],[0,-65]].map(([x,y])=>({x:f.pos.x+x,y:f.pos.y+y}));
   const at=positions.find(p=>w.walk!.isWalkable(p.x,p.y)&&!w.pointInSolid(p.x,p.y,w.player.radius));assert.ok(at);
   w.landPartyAt(at);w.time+=30;(w as unknown as {updateObjective(dt:number):void}).updateObjective(30);
 }
 assert.equal(w.handState(hand),'ready');assert.equal(w.turnInBounty(hand.id),false,'native issuing-board range still governs payment');
 const done=serializeCharacter(w),returned=fresh(18);assert.ok(applySavedCharacter(returned,done));assert.ok(returned.adoptWorldState(done.world));
 returned.startWorldMass(done.world!.worldmass!.state.run.seed,done.world!.worldmass);w=returned;m=w.massRuntime!;
 assert.equal(w.handState(w.bountyHands.find(p=>p.id===hand.id)!),'ready');
 const issuing=w.bountyBoardsHere().find(b=>b.id==='lastlight');assert.ok(issuing);w.landPartyAt({x:issuing.pos.x,y:issuing.pos.y+55});
 assert.ok(w.turnInBounty(hand.id));assert.equal(w.turnInBounty(hand.id),false);
 assert.ok(!m.geography!.objectives.targets(128,'later-slate').some(t=>t.owner===plan!.owner.id));
 assert.ok(!w.bountyOffers.some(p=>p.massBounty?.id===plan!.owner.id),'completed native operation cannot be dealt again');
 console.log('PASS '+kind+' actual geographic objective -> native board deal/accept -> two CharacterSave Continue states -> exact objective completion -> issuing-board once-only payment; reads and forged witnesses refused');
}}finally{undo();}
