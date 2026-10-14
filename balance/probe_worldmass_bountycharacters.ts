// Actual solo/co-op and hosted quest hands read the same seamless board through
// their existing owners. The solo digest was captured on the unmodified parent.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost } from '../server/shardHost';
import { CLASSES } from '../src/data/classes';
import { NullInput } from '../src/net/intent';
import { BOUNTY_BOARD_CFG } from '../src/data/bountyboard';
import { canonical } from '../src/worldmass/random';
import { dealMassBounties, massBountyCandidates, massBountyDestination, massBountyLocal } from '../src/worldmass/bounties';
import type { Seat } from '../src/engine/world';
const restore=seedGlobalRandom(55321);
let host:ShardHost|undefined;
try{
  const solo=makeSimWorld('warrior',42);solo.startWorldMass(42);
  const soloRows=[];
  for(const level of [1,4,12,50]){solo.player.level=level;for(let beat=0;beat<4;beat++)soloRows.push(dealMassBounties(solo,BOUNTY_BOARD_CFG.boardId,beat,0,false,()=>null));}
  assert.equal(createHash('sha256').update(canonical(soloRows)).digest('hex'),'336a53c088f03911a8f8b7dfda1781303aef28bfb65abef9173e8451915b2091','unchanged parent solo slate/reward digest');
  const coop=solo.addSeat('coop',CLASSES[0],new NullInput(),{startingCompanions:false,startingFlasks:false});
  coop.meta.charId='coop-character';coop.actor.level=1;
  assert.equal(solo.withQuestHand(coop,()=>solo.questCharKey()),null);
  assert.equal(solo.withQuestHand(coop,()=>solo.questHandLevel()),50);
  assert.deepEqual(solo.withQuestHand(coop,()=>dealMassBounties(solo,BOUNTY_BOARD_CFG.boardId,0,0,false,()=>null)),soloRows[12],'co-op keeps the shared solo board');
  host=new ShardHost({worldmass:true,seed:42,saveDir:null,open:true,log:()=>{}});await host.ready();
  const w=host.world,m=w.massRuntime!;
  assert.ok(w.localSeat.keeper);
  const add=(id:string,charId:string,level:number)=>{const s=w.addSeat(id,CLASSES[0],new NullInput(),{startingCompanions:false,startingFlasks:false});s.meta.charId=charId;s.actor.level=level;return s;};
  const a=add('bounty-a','char-a',1),b=add('bounty-b','char-b',1);
  const draw=(s:Seat,beat=1,standing=false)=>w.withQuestHand(s,()=>dealMassBounties(w,BOUNTY_BOARD_CFG.boardId,beat,0,standing,()=>null));
  const levelOf=(p:ReturnType<typeof draw>[number])=>massBountyDestination(m,p.massBounty)!.level;
  w.player.level=50;
  assert.equal(w.withQuestHand(a,()=>w.questCharKey()),'char-a');
  const first=draw(a);assert.equal(first.length,BOUNTY_BOARD_CFG.offers);
  assert.deepEqual(draw(a),first,'same character and beat are stable');
  assert.notDeepEqual(draw(b),first,'same-level characters receive independently seeded slates');
  assert.ok(first.slice(0,BOUNTY_BOARD_CFG.routes.manageableSeats).every(p=>levelOf(p)<=1),'manageable choices use the acting level rather than the keeper');
  w.player.level=1;assert.deepEqual(draw(a),first,'keeper level does not alter a character slate');
  w.removeSeat(a.id);const rejoined=add('bounty-a-rejoined','char-a',1);
  assert.deepEqual(draw(rejoined),first,'rejoining with a new seat retains character seed');
  // Discover an actual generated higher-level destination, through the site's
  // public scenery/discovery owners, so the challenge filter has work to do.
  let far:ReturnType<typeof massBountyCandidates>[number]|undefined;
  for(let x=20000;x<=40000&&!far;x+=2000)for(let y=0;y<=8000&&!far;y+=2000){
    far=m.placesInCell(m.walk.at(x,y)).find(p=>{const site=m.config.content.find(c=>c.id===p.content)?.site;return !!site?.completion&&m.populationFor(p).level>4;});
  }
  assert.ok(far,'actual generated high-level bounty site');
  m.sites.sync(w,[...(m.journey?.places??[]),far]);m.sites.discover(massBountyLocal(m,far));
  assert.ok(massBountyCandidates(w).some(p=>p.id===far!.id));
  const terrain=canonical(m.state.snapshot()),found=canonical(m.sites.discovered),bodies=[...w.actors];
  w.player.level=50;let highSeen=false;
  for(let beat=0;beat<32;beat++){
    assert.ok(draw(rejoined,beat).every(p=>levelOf(p)<=1+BOUNTY_BOARD_CFG.routes.challengeAbove),'low-level hand excludes over-level destinations despite high keeper');
    b.actor.level=50;w.player.level=1;
    if(draw(b,beat).some(p=>levelOf(p)>4))highSeen=true;
    w.player.level=50;
  }
  assert.ok(highSeen,'high-level hand can receive discovered work above keeper reach');
  assert.equal(canonical(m.state.snapshot()),terrain);assert.equal(canonical(m.sites.discovered),found);assert.deepEqual(w.actors,bodies,'board reading births no actors');
  w.withQuestHand(rejoined,()=>{w.bountyOffers.push(...first);w.bountyOffers[0].locked=true;});
  assert.deepEqual(draw(rejoined,9,true),first,'standing board preserves the character slate');
  const held=first[1];w.withQuestHand(rejoined,()=>{w.bountyHands.push(held);w.bountyOffers.splice(1,1);});
  const refreshed=draw(rejoined,10);
  assert.equal(refreshed[0],first[0],'locked posting retains its actual object');
  assert.ok(refreshed.every(p=>p.massBounty!.id!==held.massBounty!.id),'held destination is not dealt again');
  assert.equal(w.withQuestHand(b,()=>w.bountyHands.length),0,'another character has no borrowed hand');
  assert.equal(w.withQuestHand(b,()=>w.bountyOffers.length),0,'another character has no borrowed slate');
  console.log('PASS parent solo digest, shared co-op slate, hosted character seed/rejoin, acting level and challenge bounds, read-only board, locked/held/standing ledger ownership');
}finally{await host?.stop({persist:false});restore();}
