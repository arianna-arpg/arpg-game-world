import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {NullInput} from '../src/net/intent';
import {CLASSES} from '../src/data/classes';
import {BOUNTY_BOARD_CFG} from '../src/data/bountyboard';
import {dealMassBounties,massBountyDestination} from '../src/worldmass/bounties';
import {canonical} from '../src/worldmass/random';
import {packQuestLedger,sanitizeQuestWorlds} from '../src/engine/questLedger';
const undo=seedGlobalRandom(42),w=makeSimWorld('warrior',42);
try {
 w.startWorldMass(42);const m=w.massRuntime!,pick=()=>null,board=BOUNTY_BOARD_CFG.boardId;
 const solo=canonical(dealMassBounties(w,board,3,2,false,pick));
 const a=w.addSeat('bounty-a',CLASSES[0],new NullInput(),{startingCompanions:false,startingFlasks:false});
 const b=w.addSeat('bounty-b',CLASSES[0],new NullInput(),{startingCompanions:false,startingFlasks:false});
 a.meta.charId='traveler-a';b.meta.charId='traveler-b';a.actor.level=b.actor.level=12;
 assert.equal(canonical(dealMassBounties(w,board,3,2,false,pick)),solo,'ordinary co-op preserves solo seed bytes');
 w.localSeat.keeper={reviveSec:2};
 const draw=(seat:typeof a)=>w.withQuestHand(seat,()=>dealMassBounties(w,board,3,2,false,pick));
 const before=canonical(m.snapshot(w)),aa=draw(a),bb=draw(b);
 assert(aa.length>=3&&bb.length>=3);assert.notEqual(canonical(aa),canonical(bb),'two characters at one board have distinct deterministic slates');
 assert.notDeepEqual(aa.map(p=>[p.kind,p.massBounty?.id,p.pay]),bb.map(p=>[p.kind,p.massBounty?.id,p.pay]),'the draw itself differs, beyond posting IDs');
 assert(aa.every(p=>!bb.some(q=>q.id===p.id)),'posting IDs cannot collide across characters');
 assert.equal(canonical(draw(a)),canonical(aa),'another hand cannot change this character draw');
 a.id='bounty-reconnected';assert.equal(canonical(draw(a)),canonical(aa),'vessel character key survives a new socket seat');
 w.player.level=1;assert.equal(canonical(draw(a)),canonical(aa),'keeper level does not limit the hand');
 b.actor.level=1;const low=draw(b);
 assert(low.length>0);assert(low.every(p=>massBountyDestination(m,p.massBounty)!.level<=1+BOUNTY_BOARD_CFG.routes.challengeAbove));
 // Isolate the level boundary with the same real destinations and a fixed high-level population fixture.
 const populationFor=m.populationFor;
 m.populationFor=place=>({...populationFor.call(m,place),level:12});
 try {assert(draw(a).length>=3,'high-level hand sees high-level native destinations');assert.equal(draw(b).length,0,'low-level hand cannot inherit the keeper or another traveler level');}
 finally {m.populationFor=populationFor;}
 const ledger=w.questLedgerOf(a);ledger.offers=aa;aa[0].locked=true;
 assert.deepEqual(w.withQuestHand(a,()=>dealMassBounties(w,board,3,2,true,pick)),aa,'standing slates retain exact postings');
 const saved=packQuestLedger(ledger,123),restored=sanitizeQuestWorlds(JSON.parse(JSON.stringify({world:saved})))?.world;assert(restored);assert.deepEqual(restored.offers,aa,'character quest save retains the frozen slate');
 assert.equal(canonical(m.snapshot(w)),before,'dealing per-character work mutates no terrain or population');
 console.log('PASS per-character wilds draws, identity across reconnect, hand-level gates, standing offers, save and solo parity');
} finally {w.massRuntime?.dispose();undo();}
