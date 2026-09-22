import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { BOUNTY_KINDS, BOUNTY_BOARD_CFG, clonePosting, describeBountyPay, type BountyPosting, type BountyRollHost } from '../src/data/bountyboard';
import { BOUNTY_REWARD_RECIPES, BOUNTY_REWARD_CFG, bountyEssenceMix, rollBudgetBountyPay } from '../src/data/bountyRewards';
import { bountyChartable } from '../src/data/bountyJourneys';
import { ESSENCES } from '../src/data/essences';
import { UNIQUE_LIST } from '../src/data/uniques';
import { sanitizeBountyBoard } from '../src/meta/worldstate';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { collectMarkers } from '../src/world/mapMarkers';
import type { ItemInstance } from '../src/engine/items';

function make(seed = 1) {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed);
  w.account.features.add('bounty_board');
  w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
  Object.assign(w.player.pos, w.townSeat('bounty_board'));
  return w;
}
function host(w: ReturnType<typeof make>, seq = 1): BountyRollHost {
  const routes = w.bountyApproaches('lastlight', false);
  return { routes, routeFits: id => routes.has(id), zoneMap: w.zoneMap, view: {} as BountyRollHost['view'],
    playerLevel: w.player.level, visited: id => w.visited.has(id), objectiveDone: id => w.objectiveDoneAt(id),
    boardZoneId: 'lastlight', boardId: 'lastlight', beat: 0, slateKey: 'quality', seq,
    reach: 1, lean: () => 1, kindClaimed: () => false, pickGemId: () => null,
    answers: () => [], igniteReady: () => [], summonsStanding: () => 0 };
}
const valueOf = (pay: BountyPosting['pay']) => (pay.essence ?? []).reduce((n, c) => n + c.count * ESSENCES[c.essence].mortalWorth, 0);
const poster = (pay: BountyPosting['pay']): BountyPosting => ({ id: 'bounty_quality_pay', kind: 'cull', boardId: 'lastlight',
  zoneId: 'crossroads', beat: 0, cull: { count: 1, claimed: 1 }, pay });

// Every recipe: deterministic, frozen and complete after clone/sanitize; exact
// value exchange for currency/XP and no unique level overreach at boundaries.
{
  const w = make(), rng = new Rng(55);
  let awarded = 0;
  for (const level of [1, 7, 8, 15, 16, 25, 26, 40, 80]) {
    for (const style of ['mixed', 'coarse', 'fine'] as const) {
      for (let value = 0; value < 100; value++) assert.equal(valueOf({ essence: bountyEssenceMix(value, level, style, rng) }), value);
    }
    for (const recipe of BOUNTY_REWARD_RECIPES) {
      for (let seed = 1; seed <= 20; seed++) {
        const pay = rollBudgetBountyPay(host(w), new Rng(seed), level, undefined, recipe.id);
        assert.deepEqual(pay, rollBudgetBountyPay(host(w), new Rng(seed), level, undefined, recipe.id));
        assert.equal(pay.level, level);
        assert.equal(pay.budget?.recipe, recipe.id);
        const p = poster(pay), clone = clonePosting(p);
        const saved = sanitizeBountyBoard({ offers: [clone] }, w.zoneMap)!.offers[0];
        assert.deepEqual(saved.pay, pay);
        if (!recipe.shares.unique && !recipe.shares.legacy) {
          const shares = Object.values(recipe.shares).reduce((n, v) => n + v, 0);
          const craftSpend = pay.craft ? Math.floor(pay.budget!.value * (recipe.shares.craft ?? 0) / shares) : 0;
          assert.equal(valueOf(pay) + (pay.xp ?? 0) / BOUNTY_REWARD_CFG.xpPerValue + craftSpend, pay.budget!.value);
        }
        if (pay.unique?.id) {
          const u = UNIQUE_LIST.find(u => u.id === pay.unique!.id)!;
          assert(u && (u.minIlvl ?? 0) <= level);
        }
        const drops: ItemInstance[] = [];
        (w as any).dropGearAt = (_at: unknown, item: ItemInstance) => drops.push(item);
        w.player.level = 99; w.zoneMap.crossroads.level = 99;
        (w as any).payBountyLanes(p, w.localSeat);
        if (pay.unique) { assert.equal(drops.length, 1); assert.equal(drops[0].rarity, 'unique'); }
        for (const item of drops) { if (pay.unique || pay.lot || pay.craft) assert.equal(item.ilvl, level); awarded++; }
        assert(describeBountyPay(pay).length > 0);
        if (pay.xp) assert(describeBountyPay(pay).includes(`${pay.xp} XP`));
        if (pay.essence) assert(describeBountyPay(pay).includes('Essence'));
      }
    }
  }
  assert(awarded > 100);
  // Statistical evidence of the advertised rarity tilt, same eligible pool.
  let mixed = 0, focused = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    for (const recipe of ['unique_cache', 'unique_prize']) {
      const p = rollBudgetBountyPay(host(w), new Rng(seed), 40, undefined, recipe);
      const weight = UNIQUE_LIST.find(u => u.id === p.unique?.id)!.weight ?? 100;
      if (recipe === 'unique_cache') mixed += Math.log(weight); else focused += Math.log(weight);
    }
  }
  assert(focused < mixed, 'Unique-only rewards favor rarer eligible definitions');
  const missingPay = rollBudgetBountyPay(host(w), new Rng(1), 8, undefined, 'unique_cache');
  missingPay.unique!.id = 'removed_unique_definition';
  let refund = 0;
  (w as any).dropEssenceAt = (_at: unknown, c: { essence: keyof typeof ESSENCES; count: number }) => {
    refund += c.count * ESSENCES[c.essence].mortalWorth;
  };
  (w as any).payBountyLanes(poster(missingPay), w.localSeat);
  assert.equal(refund + valueOf(missingPay), missingPay.budget!.value, 'missing item refunds only its spent share');
  console.log(`PASS reward recipes: exact currency/XP budgets, rarity tilt, save fidelity, ${awarded} real items at frozen levels`);
}

// Real visits, old ground, repeat visits, save/resume, marker ownership and a
// full return/turn-in. No field objective or map reveal can fake exploration.
{
  const w = make();
  const p = BOUNTY_KINDS.survey.roll(host(w), new Rng(1), new Set())!;
  assert(p?.survey); p.survey.count = 2;
  p.pay = { level: 1, xp: 16, essence: [{ essence: 'coarse', count: 3 }] };
  w.bountyOffers = [p]; assert(w.acceptBounty(p.id));
  assert.equal(w.questLog().active.find(q => q.id === p.id)?.target, undefined);
  assert(!collectMarkers(w).some(m => m.id === `quest-target-${p.id}`));
  w.loadZone('crossroads', 'lastlight'); assert.equal(p.survey.zones.length, 0);
  const zones = Object.values(w.zoneMap).filter(z => bountyChartable(z) && !w.visited.has(z.id) && z.level >= p.survey!.minLevel);
  assert(zones.length >= 2);
  w.surveyed.add(zones[0].id); assert.equal(w.handState(p), 'afield');
  w.loadZone(zones[0].id, 'crossroads'); assert.equal(p.survey.zones.length, 1);
  w.loadZone('lastlight'); w.loadZone(zones[0].id); assert.equal(p.survey.zones.length, 1);
  const clone = clonePosting(p); clone.survey!.zones.push('not-shared'); assert.equal(p.survey.zones.length, 1);
  const save = JSON.parse(JSON.stringify(serializeCharacter(w))), restored = make(); assert(applySavedCharacter(restored, save)); assert(restored.adoptWorldState(save.world));
  const hand = restored.bountyHands.find(h => h.id === p.id)!; assert(hand?.survey);
  assert.deepEqual(hand.survey, p.survey); assert.deepEqual(hand.pay, p.pay);
  restored.loadZone(zones[0].id); assert.equal(hand.survey.zones.length, 1);
  restored.loadZone(zones[1].id); assert.equal(restored.handState(hand), 'ready');
  assert(collectMarkers(restored).some(m => m.zoneId === 'lastlight' && m.glyph === '!'));
  restored.loadZone('lastlight'); Object.assign(restored.player.pos, restored.townSeat('bounty_board'));
  let xp = 0, essence = 0;
  restored.grantXp = n => { xp += n; };
  (restored as any).dropEssenceAt = (_at: unknown, c: { count: number }) => { essence += c.count; };
  assert(restored.turnInBounty(hand.id)); assert.equal(xp, 16); assert.equal(essence, 3);
  assert(!restored.turnInBounty(hand.id)); assert.equal(xp, 16); assert.equal(essence, 3);
  console.log('PASS exploration: first visits only, player-chosen ground, live progress, full save/resume, one-time mixed payout');
}

{
  const w = make(), p = BOUNTY_KINDS.trail.roll(host(w), new Rng(2), new Set())!;
  assert(p?.trail); p.pay = { level: 1, xp: 16 };
  const path = p.trail.path;
  w.bountyOffers = [p]; assert(w.acceptBounty(p.id));
  w.loadZone(path[2], path[1]); assert.equal(p.trail.crossed, 0, 'out-of-order crossing');
  w.loadZone(path[1]); assert.equal(p.trail.crossed, 0, 'teleport does not satisfy crossing');
  w.loadZone(path[0]); w.loadZone(path[1], path[0]); assert.equal(p.trail.crossed, 1);
  assert.equal(collectMarkers(w).find(m => m.id === `quest-target-${p.id}`)?.zoneId, path[2]);
  assert(w.questLog().active.find(q => q.id === p.id)?.ask?.includes('Next:'));
  const save = JSON.parse(JSON.stringify(serializeCharacter(w))), restored = make(); assert(applySavedCharacter(restored, save)); assert(restored.adoptWorldState(save.world));
  const hand = restored.bountyHands.find(h => h.id === p.id)!;
  assert.deepEqual(hand.trail, p.trail);
  for (let i = 2; i < path.length; i++) restored.loadZone(path[i], path[i - 1]);
  assert.equal(restored.handState(hand), 'ready');
  assert.equal(restored.questLog().active.find(q => q.id === p.id)?.standing, 'ready');
  const invalid = clonePosting(p); invalid.trail!.crossed = Infinity;
  assert.equal(sanitizeBountyBoard({ offers: [invalid] }, w.zoneMap), null);
  console.log('PASS itinerary: real road order, no teleport shortcuts, next-step journal/map, saved partial progress');
}

// A native puzzle completion is the contract's deed; clearing another zone
// cannot claim it. The puzzle engine's own probe covers individual solutions.
{
  const w = make(), h = host(w);
  const z = Object.values(w.zoneMap).find(z => bountyChartable(z) && h.routeFits!(z.id) && !w.objectiveDoneAt(z.id))!;
  z.objective = { kind: 'puzzle', puzzle: 'charged_lattice' };
  const p = BOUNTY_KINDS.puzzle.roll({ ...h, pin: z.id }, new Rng(1), new Set())!;
  assert(p && p.kind === 'puzzle'); p.pay = { level: 1, xp: 24 };
  w.bountyOffers = [p]; assert(w.acceptBounty(p.id));
  w.loadZone(z.id); assert(w.puzzleViews().some(p => p.isObjective && !p.done));
  assert.equal(w.handState(p), 'afield');
  w.completedObjectives.add('irrelevant'); assert.equal(w.handState(p), 'afield');
  const run = (w as any).puzzles.find((r: any) => r.isObjective);
  (w as any).completePuzzle(run); w.update(0.05);
  assert.equal(w.handState(p), 'ready');
  console.log('PASS puzzle posting: native puzzle spawn and completion, objective attribution');
}

// The starter lesson stays small and pairs a writ with a cash alternative.
{
  const w = make(); w.completedObjectives.delete('crossroads'); w.time += w.bountyBeatSeconds(); w.armBountyBoard();
  assert(w.bountyOffers.length <= BOUNTY_BOARD_CFG.starter.offers);
  assert(w.bountyOffers.every(p => p.pay.essence && !p.pay.xp && !p.survey && !p.trail));
  assert(w.bountyOffers.some(p => p.pay.craft));
  assert(w.bountyOffers.some(p => !p.pay.craft));
}
console.log('PASS bounty quality');
