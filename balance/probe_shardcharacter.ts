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
//   A  two seats at one giver hold two logs: each linger takes the contract into its own
//      ledger, a quest one completes leaves the other's untouched, the quest-done key is the
//      completer's own (never the shared run ledger), each socket's journal reads its own;
//   B  the ledger travels: THE HAND-OFF moves it with the seat (the same object) and home
//      again; a vessel's ledger for this world stands up at its graft (an unknown row
//      dropped), another world's rides through untouched, the mirror carries both home and
//      the mirrored CharacterSave round-trips the ledger into a rejoin;
//   C  the world's half is shared: an Odyssey operation one hero finishes is the campaign's
//      preparation (once, the world's), its lead is the doer's own, and the consequence
//      reaches the other hero's log (its row for that operation ends, never paid);
//   D  THE BOARD PER CHARACTER: two heroes at one board are dealt from one beat, read
//      different postings, hold and turn in their own hands, each paid at its own feet, the
//      board history in each hero's own keys;
//   E  THE SHELF PER BUYER: two buyers at one counter are dealt from the same beat, read
//      different shelves at their own levels, a purchase changes the buyer's alone, THE
//      PATRON'S HOLD keys by character and rides the world save so, and each socket hears
//      its own shelf row (SeatW.vd) and never another's.
import { createHash } from 'node:crypto';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import type { SessionMsg } from '../src/net/transport';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { ESSENCE_IDS, VENDOR_ITEM_CFG } from '../src/data/essences';
import { VENDOR_CFG } from '../src/data/vendors';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS } from '../src/data/bountyboard';
import { BRANDT_HAMMER_QUEST } from '../src/data/brandt';
import { odysseyQuestId } from '../src/data/odyssey';
import { QUESTS } from '../src/quests/defs';
import { FEATURE, ensureAccountId, gemDropKey, makeAccount, questDoneKey } from '../src/meta/account';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { NullInput, type MetaAction } from '../src/net/intent';
import { serializeSnapshot, WIRE_CFG, type StateSnapshot } from '../src/net/snapshot';
import { charKeyOf, questWorldKey, type QuestLedger } from '../src/engine/questLedger';
import { dist, vec, type Vec2 } from '../src/core/math';
import type { ItemInstance } from '../src/engine/items';
import type { Seat, World, VendorEntry } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
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
      own: Object.values(snap.seats).map(r => [r.jn ?? null, r.vd ?? null]) });
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

// ================================================================= THE SHARD ==
// A classic shard (open account, ephemeral) with clients over the real wire.
const restoreShardRandom = seedGlobalRandom(0x5c4a2);
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x5c4a7e, saveDir: null, open: true, log: () => {} });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const wx = w as unknown as Record<string, any>; // the rig's hands on private quest verbs
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
async function runTicks(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}
interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[] }
async function join(name: string, opts: { accountId?: string; vessel?: CharacterSave } = {}): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [] };
  c.onSession(m => { cl.heard.push(m); });
  c.onState(s => { cl.snaps.push(s); });
  const welcome = await c.connect(url, { name, classId: 'warrior', ...(opts.accountId ? { accountId: opts.accountId } : {}) }, opts.vessel);
  cl.id = welcome.self;
  await waitFor(() => !!host.units.seatOf(cl.id) && cl.snaps.length > 0, 120);
  return cl;
}
const seatOf = (id: string): Seat => host.units.seatOf(id)!;
/** THE CHARACTER'S QUESTS: a seat's own ledger, wherever on the shard it stands. */
const ledgerOf = (s: Seat): QuestLedger => w.questLedgerOf(s);
const act = (cl: Client, action: MetaAction): void => { cl.c.sendSession({ t: 'action', action }); };
const hearth = host.hearthSeat();
const toHearth = (s: Seat, dx = 0): void => { const p = w.clampPos(vec(hearth.x + dx, hearth.y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0; };
/** Stand a seat where `pred` holds, searching rings about `center`. */
function standAt(s: Seat, center: Vec2, pred: () => boolean, side = 0): boolean {
  for (const r of [20, 40, 60, 80, 100, 120, 150]) {
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2 + (side < 0 ? Math.PI : 0);
      const p = w.clampPos(vec(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r), s.actor.radius);
      s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0;
      if (pred()) return true;
    }
  }
  return false;
}
const jnOf = (cl: Client) => [...cl.snaps].reverse().find(s => s.seats[cl.id]?.jn)?.seats[cl.id]?.jn;
const ids = (ps: readonly { id: string }[]): string => ps.map(p => p.id).join(',');
/** Forge a vessel on a scratch seat: the couch guest's shape, as the wire carries it. */
function forgeVessel(name: string, charId: string, level: number): CharacterSave {
  const seat = w.addSeat('forge', warrior, new NullInput(), { startingCompanions: false, startingFlasks: false });
  w.seatHero(seat).level = level;
  seat.meta.name = name; seat.meta.charId = charId;
  const save = serializeCouchGuest(w, seat, {});
  w.removeSeat('forge');
  const out = JSON.parse(JSON.stringify(save)) as CharacterSave;
  out.ledger = { mireille_flasks_given: 1 };
  return out;
}

const A = await join('Aster'), B = await join('Bryn');
const sA = seatOf(A.id), sB = seatOf(B.id);
await runTicks(sec(0.5));

// ================================================= A: THE QUEST LOG PER CHARACTER ==
const giver = w.actors.find(a => a.defId === 'townsfolk_questgiver')!;
const QID = 'undead_south_l5';
{
  sA.actor.level = 6; sB.actor.level = 6;
  toHearth(sB, 60);
  check('A log: the host stands A at the giver', standAt(sA, giver.pos, () => w.withQuestHand(sA, () => w.nearAnyQuestGiver())));
  const tookA = await waitFor(() => ledgerOf(sA).active.some(q => q.questId === QID), sec(4));
  check('A log: A\'s own linger takes the contract into A\'s own ledger, and B (away) holds none of it',
    tookA && !ledgerOf(sB).active.some(q => q.questId === QID) && !w.ownQuestLedger.active.some(q => q.questId === QID),
    `A ${ledgerOf(sA).active.map(q => q.questId).join(',')}`);
  check('A leads: the giver marks the Odyssey\'s leads for the hero that lingered (A\'s own, never B\'s nor the campaign\'s)',
    ledgerOf(sA).leads.length > 0 && ledgerOf(sB).leads.length === 0 && (w.odyssey.state?.leads.length ?? 0) === 0,
    `A [${ledgerOf(sA).leads}], B [${ledgerOf(sB).leads}]`);
  toHearth(sA, -60);
  standAt(sB, giver.pos, () => w.withQuestHand(sB, () => w.nearAnyQuestGiver()));
  const tookB = await waitFor(() => ledgerOf(sB).active.some(q => q.questId === QID), sec(4));
  toHearth(sB, 60);
  const rowA = ledgerOf(sA).active.find(q => q.questId === QID), rowB = ledgerOf(sB).active.find(q => q.questId === QID);
  check('A log: two seats at one giver hold two logs (the same contract twice: two rows in two ledgers)',
    tookB && !!rowA && !!rowB && rowA !== rowB && ledgerOf(sA) !== ledgerOf(sB));
  // A finishes the field and turns its own in at the giver.
  rowA!.fieldDone = true;
  standAt(sA, giver.pos, () => w.withQuestHand(sA, () => w.nearAnyQuestGiver()));
  const doneA = await waitFor(() => ledgerOf(sA).completed.has(QID), sec(4));
  toHearth(sA, -60);
  check('A done: a quest A completes leaves B\'s own untouched (still held, still afield, never completed)',
    doneA && !ledgerOf(sA).active.some(q => q.questId === QID)
      && ledgerOf(sB).active.some(q => q.questId === QID && !q.fieldDone) && !ledgerOf(sB).completed.has(QID));
  check('A keys: the quest-done key gates A\'s own offers alone (A\'s keys, never the shared run ledger nor B\'s)',
    (ledgerOf(sA).keys[questDoneKey(QID)] ?? 0) >= 1 && !w.ledger[questDoneKey(QID)] && !ledgerOf(sB).keys[questDoneKey(QID)]);
  await runTicks(sec(1));
  const ja = jnOf(A), jb = jnOf(B);
  check('A journal: each socket hears its own log (A\'s row lists the contract done, B\'s lists it held)',
    !!ja?.done.includes(QID) && !ja.log.active.some(e => e.id === QID) && !!jb && !jb.done.includes(QID) && jb.log.active.some(e => e.id === QID));
}

// ================================================= B: THE LEDGER TRAVELS ==
const KEY = questWorldKey(w.manifest.seed, false);
{
  // THE HAND-OFF: A walks the direct road into a field unit; its ledger rides the SEAT row.
  const mine = ledgerOf(sA);
  const road = w.exits.find(e => e.to !== '?' && !!w.zoneMap[e.to])!;
  const unit = host.units.travel(A.id, road.to);
  check('B hand-off: A\'s ledger moves with its seat into the unit (the same object), and the keeper keeps none of it',
    !!unit && unit.world !== w && unit.world.seatQuests.get(A.id) === mine && !w.seatQuests.has(A.id) && ledgerOf(sA) === mine);
  await runTicks(sec(1));
  check('B hand-off: A\'s journal, judged in its new unit, still reads its own log', !!jnOf(A)?.done.includes(QID));
  host.units.travel(A.id, w.zone.id);
  check('B hand-off: and home again, the same ledger', w.seatQuests.get(A.id) === mine);
  toHearth(sA, -60);
}
{
  // THE MIRROR: a vessel's own ledger for this world stands up at its graft (re-validated) and
  // rides home; another world's passes through untouched.
  const acct = makeAccount(); ensureAccountId(acct);
  const vessel = forgeVessel('Vale', 'c-probe-vale', 9);
  const far = { at: 7, active: [{ questId: 'far_away', zoneId: 'gen_far', fieldDone: true }], completed: ['far_done'], keys: { far_key: 2 } };
  vessel.quests = {
    [KEY]: { at: 5, active: [
      { questId: QID, zoneId: `quest_${QID}`, fieldDone: true },
      { questId: 'ghost_quest', zoneId: 'no_such_zone', fieldDone: false },
    ], completed: [BRANDT_HAMMER_QUEST], keys: { [questDoneKey(BRANDT_HAMMER_QUEST)]: 1 }, leads: [] },
    'shard:deadbeef': far,
  };
  const V = await join('Vale', { accountId: acct.accountId, vessel });
  const sV = seatOf(V.id), lv = ledgerOf(sV);
  // (The campaign enrolls its own rows into every standing hero's ledger beside what it carried.)
  const carried = (l: { active: { questId: string }[] }) => l.active.filter(q => !q.questId.startsWith('odyssey_') && !q.questId.startsWith('revenge_'));
  check('B graft: the vessel\'s own ledger for this world stands up as its seat\'s (an unknown quest dropped on adoption)',
    carried(lv).length === 1 && carried(lv)[0].questId === QID && lv.active.some(q => q.questId === QID && q.fieldDone)
      && !lv.active.some(q => q.questId === 'ghost_quest') && lv.completed.has(BRANDT_HAMMER_QUEST)
      && (lv.keys[questDoneKey(BRANDT_HAMMER_QUEST)] ?? 0) === 1,
    `active ${lv.active.map(q => q.questId).join(',')}`);
  check('B graft: another world\'s ledger rides the hero, never this world\'s quest state',
    JSON.stringify(sV.meta.questWorlds?.['shard:deadbeef']) === JSON.stringify(far) && !lv.completed.has('far_done'));
  // Its hero lives a little here (a fresh contract held), then the mirror goes home.
  lv.completed.add('relic_depths_l8');
  const n0 = V.heard.length;
  host.vessels.mirror(V.id);
  await waitFor(() => V.heard.slice(n0).some(m => m.t === 'heroSave'), sec(2));
  const hs = V.heard.slice(n0).find(m => m.t === 'heroSave') as { t: 'heroSave'; save: CharacterSave } | undefined;
  const home = hs?.save.quests?.[KEY];
  check('B mirror: the mirror home carries the hero\'s ledger for this world as it stands now',
    !!home && JSON.stringify(home.active) === JSON.stringify(lv.active) && home.active.some(q => q.questId === QID && q.fieldDone)
      && home.completed.includes('relic_depths_l8') && home.completed.includes(BRANDT_HAMMER_QUEST)
      && (home.keys?.[questDoneKey(BRANDT_HAMMER_QUEST)] ?? 0) === 1,
    JSON.stringify(home)?.slice(0, 200));
  check('B mirror: and every other world\'s ledger as it came', JSON.stringify(hs?.save.quests?.['shard:deadbeef']) === JSON.stringify(far));
  // The round trip: the mirrored CharacterSave carries the same hero back in.
  V.c.leave();
  await waitFor(() => !host.units.seatOf(V.id), sec(4));
  const back = await join('Vale', { accountId: acct.accountId, vessel: JSON.parse(JSON.stringify(hs!.save)) as CharacterSave });
  const lb = ledgerOf(seatOf(back.id));
  check('B round trip: the CharacterSave round-trips the ledger (rejoined, the same log, the same keys)',
    JSON.stringify(lb.active) === JSON.stringify(home?.active) && JSON.stringify([...lb.completed]) === JSON.stringify(home?.completed)
      && JSON.stringify(lb.keys) === JSON.stringify(home?.keys ?? {}),
    `active ${lb.active.length}/${home?.active.length}, completed ${[...lb.completed].join(',')}`);
  back.c.leave();
  await waitFor(() => !host.units.seatOf(back.id), sec(4));
}

// ================================================= C: THE WORLD'S HALF ==
{
  await runTicks(sec(0.5));
  const camp = w.odyssey.state!;
  const F = camp.roster.find(id => !camp.prepared.includes(id) && !camp.defeated.includes(id))!;
  const opId = odysseyQuestId(F, 'operation');
  check('C enroll: each hero holds its own campaign rows (one pursuit, two ledgers)',
    ledgerOf(sA).active.some(q => q.questId === opId) && ledgerOf(sB).active.some(q => q.questId === opId),
    `faction ${F}`);
  const rowOp = ledgerOf(sA).active.find(q => q.questId === opId)!;
  w.withQuestHand(sA, () => wx.onQuestZoneCleared(rowOp));
  await runTicks(sec(0.5));
  check('C world: the deed\'s consequence is the world\'s (the campaign records the preparation once)', camp.prepared.includes(F));
  check('C shared: the consequence reaches B\'s log (its row for the prepared operation ends, never completed, never paid)',
    ledgerOf(sA).completed.has(opId) && !ledgerOf(sB).active.some(q => q.questId === opId) && !ledgerOf(sB).completed.has(opId));
  // A hero arriving after meets the same world: no row for the prepared operation, its own
  // row for the surviving leader, and none of the others' leads.
  const Cc = await join('Cass');
  await runTicks(sec(0.5));
  const sC = seatOf(Cc.id);
  check('C newcomer: a hero arriving after meets the one world (the prepared operation never offered, the surviving leader its own pursuit) and none of the others\' leads',
    !ledgerOf(sC).active.some(q => q.questId === opId) && ledgerOf(sC).active.some(q => q.questId === odysseyQuestId(F, 'leader'))
      && ledgerOf(sC).leads.length === 0 && ledgerOf(sA).leads.length > 0,
    `C ${ledgerOf(sC).active.map(q => q.questId).join(',')}; leads [${ledgerOf(sC).leads}]`);
  Cc.c.leave();
  await waitFor(() => !host.units.seatOf(Cc.id), sec(4));
}

// ================================================= D: THE BOARD PER CHARACTER ==
{
  const BID = BOUNTY_BOARD_CFG.boardId;
  const board = w.stationAnchor('bounty_board')!;
  // Both heroes at the charted country's own level (the hand's level is the deal's band).
  w.seatHero(sA).level = 2; w.seatHero(sB).level = 2;
  check('D board: A and B stand at the board, on its two sides',
    standAt(sA, board.pos, () => w.nearBountyBoard(sA, BID), -1)
      && standAt(sB, board.pos, () => w.nearBountyBoard(sB, BID) && dist(sA.actor.pos, sB.actor.pos) >= 100, 1));
  const dealt = await waitFor(() => ledgerOf(sA).offers.some(o => o.boardId === BID) && ledgerOf(sB).offers.some(o => o.boardId === BID), sec(2));
  const beat = wx.bountyBeat() as number;
  const offersA = ledgerOf(sA).offers.filter(o => o.boardId === BID), offersB = ledgerOf(sB).offers.filter(o => o.boardId === BID);
  check('D slate: two heroes at one board are dealt from the one shared beat',
    dealt && ledgerOf(sA).boards[BID]?.armedBeat === beat && ledgerOf(sB).boards[BID]?.armedBeat === beat
      && offersA.every(o => o.beat === beat) && offersB.every(o => o.beat === beat), `beat ${beat}`);
  const drawOf = (os: typeof offersA): string => JSON.stringify(os.map(o => [o.kind, o.zoneId, o.pay]));
  check('D slate: and read different postings, each its own seeded draw (no posting in both)',
    offersA.length > 0 && offersB.length > 0 && !offersA.some(a => offersB.some(b => b.id === a.id))
      && drawOf(offersA) !== drawOf(offersB),
    `A ${ids(offersA)}; B ${ids(offersB)}`);
  act(A, { t: 'bountyAccept', id: offersA[0].id });
  act(B, { t: 'bountyAccept', id: offersB[0].id });
  await runTicks(3);
  const hA = ledgerOf(sA).hands.find(h => h.id === offersA[0].id), hB = ledgerOf(sB).hands.find(h => h.id === offersB[0].id);
  check('D hands: each holds its own hand in its own ledger', !!hA && !!hB && ledgerOf(sA).hands.length === 1 && ledgerOf(sB).hands.length === 1);
  const restore = new Map<string, unknown>();
  for (const h of [hA!, hB!]) { const row = BOUNTY_KINDS[h.kind]; if (!restore.has(h.kind)) restore.set(h.kind, row.done); row.done = () => true; }
  const take = (s: Seat): number => Object.values(s.meta.essences).reduce((n, v) => n + v, 0) * 1000
    + s.meta.items.reduce((n, i) => n + (i.mem?.length ?? 0), 0) * 10 + s.meta.items.length;
  const p0 = { a: take(sA), b: take(sB) };
  act(A, { t: 'bountyTurnIn', id: offersA[0].id });
  await runTicks(8);
  const p1 = { a: take(sA), b: take(sB) };
  act(B, { t: 'bountyTurnIn', id: offersB[0].id });
  await runTicks(8);
  for (const [kind, done] of restore) (BOUNTY_KINDS[kind] as { done: unknown }).done = done;
  check('D turn-in: each turns in its own hand and is paid at its own feet',
    !ledgerOf(sA).hands.length && !ledgerOf(sB).hands.length && p1.a > p0.a && p1.b === p0.b && take(sB) > p1.b && take(sA) === p1.a,
    `A ${p0.a}->${p1.a}->${take(sA)}, B ${p0.b}->${p1.b}->${take(sB)}`);
  check('D keys: the board history is each hero\'s own (bounty_done in its own keys, never the shared run ledger)',
    (ledgerOf(sA).keys.bounty_done ?? 0) >= 1 && (ledgerOf(sB).keys.bounty_done ?? 0) >= 1 && !w.ledger.bounty_done);
  toHearth(sA, -60); toHearth(sB, 60);
}

// ================================================= E: THE SHELF PER BUYER ==
{
  const smith = w.actors.find(a => !a.dead && a.defId && MONSTERS[a.defId]?.npcRole === 'vendor')!;
  w.seatHero(sA).level = 4; w.seatHero(sB).level = 30;
  w.restockVendor(); // the counter's own restock re-deals every buyer's shelf here, at its level now
  await runTicks(2);
  const shelfOf2 = (s: Seat): VendorEntry[] => w.withBuyer(s, () => w.vendorStock);
  const armedOf = (s: Seat): number | undefined => w.seatShelves.get(s.id)?.armed.brandt;
  const beat = Math.floor(w.time / (wx.restockSeconds() as number));
  const a0 = JSON.stringify(shelfOf2(sA).map(entryFace)), b0 = JSON.stringify(shelfOf2(sB).map(entryFace));
  check('E shelf: two buyers at one counter are dealt from the same beat and read different shelves',
    armedOf(sA) === beat && armedOf(sB) === beat && shelfOf2(sA).length > 0 && shelfOf2(sB).length > 0 && a0 !== b0,
    `beat ${beat}; A ${shelfOf2(sA).length} wares, B ${shelfOf2(sB).length} wares`);
  const gear = (s: Seat): ItemInstance[] => shelfOf2(s).flatMap(e => (e.kind === 'item' && !e.item.mem && !e.item.gem ? [e.item] : []));
  const at = (s: Seat): boolean => gear(s).length > 0 && gear(s).every(i => Math.abs(i.ilvl - w.seatHero(s).level) <= VENDOR_ITEM_CFG.ilvlJitter
    || (i.ilvl === 1 && w.seatHero(s).level - VENDOR_ITEM_CFG.ilvlJitter < 1));
  check('E level: each shelf rolls at its own buyer\'s level', at(sA) && at(sB),
    `A ilvls ${gear(sA).map(i => i.ilvl).join(',')}; B ilvls ${gear(sB).map(i => i.ilvl).join(',')}`);
  for (const id of ESSENCE_IDS) sA.meta.essences[id] = 99999;
  standAt(sA, smith.pos, () => w.nearSmith(sA));
  const n = shelfOf2(sA).length;
  const bought = w.buyVendorGem(0, sA);
  check('E buy: a purchase by one changes only its own shelf (the other\'s byte for byte)',
    bought && shelfOf2(sA).length === n - 1 && JSON.stringify(shelfOf2(sB).map(entryFace)) === b0,
    `bought ${bought}; A ${n} -> ${shelfOf2(sA).length}`);
  standAt(sB, smith.pos, () => w.nearSmith(sB), 1);
  const locked = w.setVendorLock('brandt', 0, true, sB);
  check('E hold: THE PATRON\'S HOLD keys by character (B\'s reserve is B\'s, never A\'s nor the World\'s own book)',
    locked && w.charVendorHolds[charKeyOf(sB)]?.brandt?.locks.length === 1 && !w.charVendorHolds[charKeyOf(sA)]?.brandt?.locks.length
      && !w.ownVendorHolds.brandt?.locks.length);
  const ws = w.serializeWorldState();
  check('E save: the character\'s holds ride the world save by character key',
    ws.charVendorHolds?.[charKeyOf(sB)]?.brandt?.locks.length === 1 && !ws.vendorHolds);
  const nA = A.snaps.length, nB = B.snaps.length;
  await runTicks(WIRE_CFG.vendorBeat + 2);
  const lastVd = (cl: Client) => [...cl.snaps].reverse().find(s => s.seats[cl.id]?.vd)?.seats[cl.id]?.vd;
  const faces = (rows: { kind: string }[] | undefined): number => rows?.length ?? -1;
  check('E wire: each socket hears its own shelf (A\'s row is A\'s wares, B\'s row B\'s, with B\'s reserve flagged)',
    faces(lastVd(A)?.v) === shelfOf2(sA).length && faces(lastVd(B)?.v) === shelfOf2(sB).length && lastVd(B)?.v[0]?.lk === 1
      && !lastVd(A)?.v.some(e => e.lk === 1),
    `A ${faces(lastVd(A)?.v)}/${shelfOf2(sA).length}, B ${faces(lastVd(B)?.v)}/${shelfOf2(sB).length}`);
  check('E wire: and never another\'s (THE OWN ENTRY)',
    A.snaps.slice(nA).every(s => s.seats[B.id]?.vd === undefined) && B.snaps.slice(nB).every(s => s.seats[A.id]?.vd === undefined)
      && A.snaps.slice(nA).every(s => s.vendor === undefined));
}

for (const cl of [A, B]) cl.c.leave();
await waitFor(() => w.seats.length === 1, sec(4));
await host.stop();
restoreShardRandom();
await new Promise(r => setTimeout(r, 600));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
