// THE CHARACTER'S QUESTS and THE SHELF PER BUYER (cards 24 and 29 as ruled 2026-10-10;
// docs/engine/shard.md "THE CHARACTER'S QUESTS" and "THE SHELF PER BUYER"). The unit of a
// quest is the CHARACTER, exactly as single player: each hero carries its own quest log,
// its own rolled bounty postings and its own Odyssey leads in its save, and the vendor
// shelf rolls per buyer from the shared restock clock. The rig pins:
//   Z  THE SOLO DIGEST (first, before any shard host touches a process dial): a seeded solo
//      hero's shelf (the arm, a reserve, a purchase, the restock, the standing order) and
//      quest state (accepts, a turn-in, an imbue, a bounty slate taken and turned in, the
//      world save's quest, board and hold blocks), then a co-op host's second seat buying
//      off the one shared shelf and reading the one quest log, hash to the constant
//      committed BEFORE the ledger moved into the character.
import { createHash } from 'node:crypto';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { ESSENCE_IDS } from '../src/data/essences';
import { VENDOR_CFG } from '../src/data/vendors';
import { BOUNTY_KINDS } from '../src/data/bountyboard';
import { BRANDT_HAMMER_QUEST } from '../src/data/brandt';
import { QUESTS } from '../src/quests/defs';
import { FEATURE, gemDropKey } from '../src/meta/account';
import { NullInput } from '../src/net/intent';
import { serializeSnapshot } from '../src/net/snapshot';
import type { Seat, World, VendorEntry } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const warrior = CLASSES.find(c => c.id === 'warrior')!;

// ============================================================ Z: THE SOLO DIGEST ==
/** THE SOLO DIGEST, committed before the ledger moved (W9's first commit): any change to a
 *  solo or co-op host's shelf or quest state on this walk changes the hash. */
const SOLO_DIGEST = 'da7a08d5abc27fb7fa74b2ea3599264411a88d8db5c91851f2a2d824a6e92527';

/** A digest-stable copy: item uids are a process-wide counter, so they never ride. */
function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v instanceof Set) return [...v].map(canon);
  if (v instanceof Map) return [...v.entries()].map(([k, x]) => [k, canon(x)]);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      if (k === 'uid') continue;
      const x = (v as Record<string, unknown>)[k];
      if (typeof x === 'function') continue;
      out[k] = canon(x);
    }
    return out;
  }
  return v;
}
const entryFace = (e: VendorEntry): unknown => e.kind === 'skill' ? { k: 's', id: e.inst.def.id, lv: e.inst.level, r: e.inst.rarity }
  : e.kind === 'support' ? { k: 'g', id: e.gem.def.id, lv: e.gem.level, cut: e.gem.rolled ?? null }
  : { k: 'i', item: canon(e.item) };
const shelfOf = (w: World): unknown => w.vendorStock.map(e => ({ e: entryFace(e), hold: w.vendorEntryHold('brandt', e) ? 1 : 0 }));
const questsOf = (w: World): unknown => ({
  active: canon(w.activeQuests), done: [...w.completedQuests].sort(), imbues: canon(w.questImbues),
  log: canon(w.questLog()), offers: canon(w.bountyOffers), hands: canon(w.bountyHands),
});
const smithOf = (w: World) => w.actors.find(a => !a.dead && a.defId && MONSTERS[a.defId]?.npcRole === 'vendor');
const parkAtSmith = (w: World, s: Seat): void => {
  const smith = smithOf(w);
  if (!smith) throw new Error('no smith in town');
  s.actor.pos.x = smith.pos.x + 10; s.actor.pos.y = smith.pos.y; s.actor.tier = 0;
};
const parkAtBoard = (w: World, s: Seat): void => {
  const at = w.townSeat('bounty_board');
  s.actor.pos.x = at.x; s.actor.pos.y = at.y; s.actor.tier = 0;
};

function soloWalk(): { digest: string; trail: string[] } {
  const trail: string[] = [];
  const restore = seedGlobalRandom(0xd16e57);
  try {
    const w = makeSimWorld('warrior', 0x5d1e57);
    const wx = w as unknown as Record<string, any>;
    for (const f of [FEATURE.BOUNTY_BOARD, FEATURE.SALVAGE_STATION, FEATURE.VENDOR_GEMS, FEATURE.BRANDT_SELL_SUPPORTS,
      FEATURE.VENDOR_COMMISSION, ...VENDOR_CFG.lock.ladder.map(r => r.flag), VENDOR_CFG.wares.ladder[0].flag]) w.account.features.add(f);
    w.loadZone('crossroads');
    w.loadZone(START_ZONE);
    w.completedObjectives.add('crossroads');
    const hero = w.localSeat;
    hero.actor.level = 9;
    for (const id of ESSENCE_IDS) hero.meta.essences[id] = 99999;
    const parts: Record<string, unknown> = {};
    // THE SHELF: the arm, a reserve, a purchase, the beat's restock, the standing order.
    parkAtSmith(w, hero);
    parts.shelf0 = shelfOf(w);
    w.time = VENDOR_CFG.restock.baseSec + 1;
    w.restockVendor();
    parts.shelf1 = shelfOf(w);
    trail.push(`shelf ${w.vendorStock.length} wares (beat 0: ${(parts.shelf0 as unknown[]).length})`);
    parts.lock = w.setVendorLock('brandt', 0, true);
    parts.buy = w.buyVendorGem(1);
    parts.shelf1b = shelfOf(w);
    const gem = w.vendorStock.find(e => e.kind === 'skill');
    if (gem?.kind === 'skill') w.account.ledger[gemDropKey(gem.inst.def.id)] = VENDOR_CFG.commission.need;
    parts.order = gem?.kind === 'skill' ? w.setVendorCommission('brandt', { kind: 'skill', id: gem.inst.def.id }) : null;
    for (let beat = 2; beat <= 6; beat++) {
      w.time = beat * VENDOR_CFG.restock.baseSec + 1;
      w.restockVendor();
      parts[`shelf_beat${beat}`] = shelfOf(w);
    }
    parts.holds = canon(w.serializeWorldState().vendorHolds);
    trail.push(`lock ${parts.lock}, buy ${parts.buy}, order ${parts.order}, holds ${JSON.stringify(parts.holds)}`.slice(0, 400));
    // THE QUESTS: accepts, a turn-in, an imbue (the hammer's cargo at the smith), one left afield.
    wx.acceptQuest(QUESTS.undead_south_l5);
    const undead = w.activeQuests.find(q => q.questId === 'undead_south_l5');
    if (undead) { undead.fieldDone = true; wx.onQuestZoneCleared(undead); }
    wx.acceptQuest(QUESTS[BRANDT_HAMMER_QUEST]);
    const hammer = w.activeQuests.find(q => q.questId === BRANDT_HAMMER_QUEST);
    const collect = QUESTS[BRANDT_HAMMER_QUEST].collect!;
    if (hammer) {
      hammer.fieldDone = true;
      hero.meta.items.push({ uid: 900001, baseId: collect.baseId, name: collect.name, questId: BRANDT_HAMMER_QUEST,
        rarity: 'common', ilvl: 1, tier: 1, baseRoll: 0, affixes: [], implicitRolls: [] });
      parkAtSmith(w, hero);
      wx.onQuestZoneCleared(hammer);
    }
    wx.acceptQuest(QUESTS.relic_depths_l8);
    // THE ODYSSEY: the campaign stands up on its first beat (its quests enrolled) and the
    // giver's leads reveal its leaders.
    w.odyssey.update();
    w.odyssey.localLeads();
    parts.odyssey = canon(w.odyssey.snapshot());
    parts.quests0 = questsOf(w);
    trail.push(`quests ${w.activeQuests.map(q => q.questId).join(',')} done ${[...w.completedQuests].join(',')} imbues ${w.questImbues.length}`);
    // THE BOARD: the slate, a hand taken, its work forced done, the turn-in and the refresh.
    w.armBountyBoard();
    parts.slate0 = canon(w.bountyOffers);
    const offer = w.bountyOffers[0];
    if (offer) {
      parts.take = w.acceptBounty(offer.id);
      parkAtBoard(w, hero);
      const row = BOUNTY_KINDS[offer.kind];
      const done = row.done;
      row.done = () => true;
      try { parts.turnIn = w.turnInBounty(offer.id); } finally { row.done = done; }
    }
    parts.quests1 = questsOf(w);
    trail.push(`slate ${w.bountyOffers.length} offers, hands ${w.bountyHands.length}`);
    // THE WORLD SAVE's own blocks.
    const ws = w.serializeWorldState();
    parts.save = canon({ quests: ws.quests, questImbues: ws.questImbues, vendorHolds: ws.vendorHolds, bountyBoard: ws.bountyBoard });
    // THE CO-OP HOST: a second seat buys off the one shared shelf and reads the one quest log.
    const guest = w.addSeat('p1', warrior, new NullInput(), { startingCompanions: false, startingFlasks: false });
    for (const id of ESSENCE_IDS) guest.meta.essences[id] = 99999;
    parkAtSmith(w, guest);
    parts.guestBuy = w.buyVendorGem(0, guest);
    parts.shelf2 = shelfOf(w);
    parts.guestLog = canon(w.withQuestHand(guest, () => ({ log: w.questLog(), done: [...w.completedQuests].sort() })));
    parts.guestBag = guest.meta.items.length;
    // THE WIRE: the co-op host's snapshot keeps its shared shelf rows and carries no journal row.
    const snap = serializeSnapshot(w, 1);
    parts.wire = canon({ vendor: snap.vendor, at: snap.vendorRestockAt, cap: snap.vendorCap,
      own: Object.values(snap.seats).map(r => [r.jn ?? null, (r as Record<string, unknown>).vd ?? null]) });
    trail.push(`guest bought ${parts.guestBuy}, shelf ${w.vendorStock.length}`);
    const digest = createHash('sha256').update(JSON.stringify(parts)).digest('hex');
    return { digest, trail };
  } finally { restore(); }
}

{
  const { digest, trail } = soloWalk();
  for (const line of trail) console.log(`INFO  Z ${line}`);
  check('Z solo: THE SOLO DIGEST of the seeded solo shelf and quest walk (and the co-op host\'s second buyer) equals the constant committed before the ledger moved',
    digest === SOLO_DIGEST, `digest ${digest}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
