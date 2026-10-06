import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { townStationFeatures } from '../src/data/townBuild';
import { clonePosting } from '../src/data/bountyboard';
import { serializeCharacter } from '../src/meta/character';
import { sanitizeBountyBoard } from '../src/meta/worldstate';
import { canonical } from '../src/worldmass/random';
import { massBountyCandidates, massBountyLocal, massBountyPlace, MASS_BOUNTY_KINDS } from '../src/worldmass/bounties';
import { massQuestPins } from '../src/worldmass/quests';
import type { Actor } from '../src/engine/actor';

const restore = seedGlobalRandom(55321);
const fresh = (seed: number) => {
  const w = makeSimWorld('warrior', seed);
  for (const f of townStationFeatures()) w.account.features.add(f);
  w.startWorldMass(seed); w.player.invulnerable = true; return w;
};
try {
  const w = fresh(42), mass = w.massRuntime!;
  const terrain = canonical(mass.state.snapshot()), found = canonical(mass.sites.discovered), actors = w.actors.length;
  w.armBountyBoard(); assert.ok(w.bountyOffers.length >= 3);
  assert.ok(w.bountyOffers.every(p => p.massBounty && MASS_BOUNTY_KINDS.includes(p.kind as typeof MASS_BOUNTY_KINDS[number])));
  assert.equal(new Set(w.bountyOffers.map(p => p.massBounty!.id)).size, w.bountyOffers.length);
  assert.equal(canonical(mass.state.snapshot()), terrain); assert.equal(canonical(mass.sites.discovered), found);
  assert.equal(w.actors.length, actors, 'reading work spawns nothing');
  const offers = canonical(w.bountyOffers); w.armBountyBoard(); assert.equal(canonical(w.bountyOffers), offers);
  const save = serializeCharacter(w), n = fresh(44);
  assert.ok(n.adoptWorldState(save.world)); n.startWorldMass(42, save.world!.worldmass);
  assert.equal(canonical(n.bountyOffers), offers, 'unaccepted frozen slate survives Continue');
  n.armBountyBoard(); assert.equal(canonical(n.bountyOffers), offers);
  const chosen = n.bountyOffers.find(p => p.kind === 'country_clear') ?? n.bountyOffers[0];
  assert.ok(n.acceptBounty(chosen.id)); assert.equal(n.handState(chosen), 'afield');
  assert.equal(n.acceptBounty(n.bountyOffers[0].id), false, 'native one-hand cap');
  assert.ok(!n.questLog().active.find(q => q.id === chosen.id)!.target!.includes('unavailable'));
  assert.equal(massQuestPins(n).length, 1);
  const taken = serializeCharacter(n), r = fresh(45);
  assert.ok(r.adoptWorldState(taken.world)); r.startWorldMass(42, taken.world!.worldmass);
  assert.equal(canonical(r.bountyHands), canonical(n.bountyHands));
  const p = r.bountyHands[0], place = massBountyPlace(r.massRuntime!, p.massBounty)!;
  assert.ok(place); r.landPartyAt(massBountyLocal(r.massRuntime!, place)); r.massRuntime!.update(r, true);
  if (p.kind === 'country_clear') {
    const natives = (r.massRuntime as unknown as { natives: Map<string, Actor> }).natives;
    for (const [id, a] of natives) if (r.massRuntime!.state.claimed('site-guardian', id) && id.includes(place.id.replaceAll('"', '\\"')) && !a.dead) r.kill(a, false, r.player);
    r.massRuntime!.update(r, true);
  }
  assert.equal(r.handState(p), 'ready', p.kind);
  assert.equal(r.turnInBounty(p.id), false, 'field completion cannot pay away from issuing board');
  const done = serializeCharacter(r), returned = fresh(46);
  assert.ok(returned.adoptWorldState(done.world)); returned.startWorldMass(42, done.world!.worldmass);
  assert.equal(returned.handState(returned.bountyHands[0]), 'ready');
  const board = returned.bountyBoardsHere()[0]; assert.ok(board);
  returned.landPartyAt({ x: board.pos.x, y: board.pos.y + 55 });
  assert.ok(returned.nearBountyBoard());
  assert.ok(returned.turnInBounty(p.id)); assert.equal(returned.turnInBounty(p.id), false);
  assert.equal(returned.bountyHands.length, 0); assert.ok(returned.bountyOffers.length);
  assert.ok(!returned.bountyOffers.some(o => o.kind === p.kind && o.massBounty?.id === p.massBounty?.id), 'completed deed never re-deals');
  const corrupt = clonePosting(chosen); corrupt.massBounty!.run = 'another-life';
  assert.equal(sanitizeBountyBoard({ offers: [corrupt] }, {}, save.world!.worldmass), null);
  const clone = clonePosting(chosen); clone.massBounty!.center.x += 1;
  assert.notEqual(clone.massBounty!.center.x, chosen.massBounty!.center.x);
  assert.equal(massBountyPlace(returned.massRuntime!, clone.massBounty), undefined);
  assert.ok(massBountyCandidates(returned).length <= returned.massRuntime!.config.bounties!.maxCandidates);
  assert.equal(returned.graphWorkAvailable(), false, 'Odyssey and authored graph work stay gated');
  console.log('PASS seeded board offers, real-place directions, three Continue states, native completion/return, once-only payout, stale identities and bounded census');
} finally { restore(); }
