// THE COUNTERS AND THE JOURNAL (docs/engine/shard.md "The pieces"): a hosted world's
// counters, quests, bounty board, harvest rites and objective pay answer the seat whose
// hands are on them, never the parked keeper. The rig boots a classic shard with an open
// account, seats players over the wire and pins:
//   A  THE CLIENT'S COUNTERS: the zone message ships the station anchors, the Fonts and the
//      host's counters; a render shell built on a FRESH account (so it reads the host's
//      verdicts, never its own) lingers at the bench, the board and the Font and opens each
//      for its own seat; a shell that heard no counters (a co-op client) never lingers;
//   B  THE QUEST HAND: seat B lingers at the giver and takes a contract, then turns it in:
//      its points, its XP (by the credit law) and its gem pay land on B, never the keeper
//      and never a player AFK at the hearth; a reward to choose waits in B's journal and its
//      claim lands the piece in B's bag;
//   C  THE JOURNAL ROW reaches only its seat (SeatW.jn, THE OWN ENTRY): a shell reads its
//      log and pins off it, and a seat's own remembered body rides its pins;
//   D  THE BOARD PER SEAT: a posting is taken at the board, one hand per seat per board, A's
//      and B's hands stand together, each journal lists its own, only the holder turns a
//      hand in, and each pays at its own seat's feet with its own receipt;
//   E  THE HARVEST for a remote seat: a seat's linger at a node arms its own rite, the rite
//      rides its own row (SeatW.hv) and holds its hands (rooted), and its symbol presses over
//      the input path complete it;
//   F  XP BY PLACE: an encounter's close and a zone objective pay the seats near their place,
//      never a player AFK at the hearth; a grant with no place inside an act pays the actor;
//   G  THE SOLO INVARIANT: a world with no keeper ships no counter rows and its quest hand is
//      its own hero.
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import { applySnapshot, applyZone, serializeSnapshot, serializeZone, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { applyOwnSeatRows } from '../src/net/seatView';
import { JOURNAL_WIRE_CFG } from '../src/net/journalWire';
import type { SessionMsg } from '../src/net/transport';
import type { MetaAction, PlayerInput } from '../src/net/intent';
import { COOP_SCALING } from '../src/data/coop';
import { CLASSES } from '../src/data/classes';
import { BOUNTY_BOARD_CFG, BOUNTY_KINDS } from '../src/data/bountyboard';
import { HARVEST_NODES } from '../src/data/harvest';
import { HARVEST_CFG } from '../src/engine/harvest';
import { ORACLE_RESCUED } from '../src/data/oracle';
import { RELIQUARY_QUEST_ID } from '../src/quests/reliquary';
import { FEATURE, ensureAccountId, makeAccount } from '../src/meta/account';
import { World, type Seat } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { seedGlobalRandom } from '../src/sim/rng';
import { collectMarkers } from '../src/world/mapMarkers';
import { dist, vec, type Vec2 } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
async function runTicks(n: number, each?: () => void): Promise<void> {
  for (let i = 0; i < n; i++) { each?.(); host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, maxTicks: number, each?: () => void): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; each?.(); host.tick(DT); await yieldIO(); }
  return cond();
}

const restoreRandom = seedGlobalRandom(0x5ea7);
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x5ea7ac7, saveDir: null, open: true, log: () => {} });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const wx = w as unknown as Record<string, any>; // the rig's hands on private state (fixtures, sessions, the objective)
const seatOf = (id: string): Seat => w.seats.find(s => s.id === id)!;
const warrior = CLASSES.find(c => c.id === 'warrior')!;

/** A client over the wire: every snapshot, zone message and session word it hears. */
interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[]; zones: ZoneMsg[] }
async function join(name: string, accountId?: string): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [], zones: [] };
  c.onSession(m => { cl.heard.push(m); });
  c.onState(s => { cl.snaps.push(s); });
  c.onZone(z => { cl.zones.push(z); });
  const welcome = await c.connect(url, { name, classId: 'warrior', ...(accountId ? { accountId } : {}) });
  cl.id = welcome.self;
  await waitFor(() => w.seats.some(s => s.id === cl.id) && cl.zones.length > 0 && cl.snaps.length > 0, 120);
  return cl;
}
const act = (cl: Client, action: MetaAction): void => { cl.c.sendSession({ t: 'action', action }); };
const still = (): boolean[] => new Array(8).fill(false);
/** Stand a seat's hero where `pred` holds, searching rings about `center` (the clamp says where it truly stands). */
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
const hearth = host.hearthSeat();
const toHearth = (s: Seat, dx = 0): void => { const p = w.clampPos(vec(hearth.x + dx, hearth.y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; };
/** A render shell, as main.ts startAsClient builds one: no sim, intents to the host. */
function makeShell(cl: Client): { shell: World; sent: MetaAction[] } {
  const acct = makeAccount(); // a FRESH account: the shell must read the host's verdicts, never its own
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  const sent: MetaAction[] = [];
  shell.clientActionHook = action => { sent.push(action); cl.c.sendSession({ t: 'action', action }); };
  shell.clientSeatId = cl.id;
  shell.createPlayer(warrior, { startingCompanions: false, startingFlasks: false });
  applyZone(shell, cl.zones.at(-1)!);
  return { shell, sent };
}
/** One client frame: the newest snapshot applied (positions, clock, own rows), then the shell's own lingers. */
function shellFrame(shell: World, cl: Client): void {
  const s = cl.snaps.at(-1);
  if (s) { applySnapshot(shell, s); applyOwnSeatRows(shell, s); }
  shell.updateClientCounters(DT);
}
async function shellTicks(shell: World, cl: Client, n: number, until?: () => boolean): Promise<boolean> {
  for (let i = 0; i < n; i++) {
    host.tick(DT); await yieldIO(); shellFrame(shell, cl);
    if (until?.()) return true;
  }
  return until ? until() : true;
}
const xpOf = (s: Seat): number => s.actor.level * 1e7 + s.meta.xp;
const memUnits = (s: Seat): number => s.meta.items.reduce((n, i) => n + (i.mem?.length ?? 0), 0);
const essOf = (s: Seat): number => Object.values(s.meta.essences).reduce((n, v) => n + v, 0);

// ======================================================== A: THE CLIENT'S COUNTERS ==
const A = await join('Anvil');
const sA = seatOf(A.id);
const bench = w.stationAnchor('salvage')!, board = w.stationAnchor('bounty_board')!, font = w.fonts[0];
{
  const z = A.zones.at(-1)!;
  check('A zone: the zone message ships the station anchors, the Fonts and the host\'s counters',
    !!z.anchors?.some(r => r.a === bench.doodad.anchor) && !!z.anchors?.some(r => r.a === board.doodad.anchor)
      && (z.fonts?.length ?? 0) === w.fonts.length && w.fonts.length > 0
      && !!z.counters?.includes(FEATURE.SALVAGE_STATION) && !!z.counters?.includes(FEATURE.BOUNTY_BOARD),
    `anchors ${z.anchors?.map(r => r.a).join(',')}; fonts ${z.fonts?.length}; counters ${z.counters?.join(',')}`);
  const { shell } = makeShell(A);
  check('A zone: a shell on a fresh account wears the shipped anchors and reads the host\'s counters',
    shell.stationAnchor('salvage') !== null && shell.stationAnchor('bounty_board') !== null && shell.salvageUnlocked()
      && shell.bountyBoardUnlocked() && !shell.account.features.has(FEATURE.SALVAGE_STATION) && shell.fonts.length === w.fonts.length);
  toHearth(sA);
  await shellTicks(shell, A, 12); // away from every station: the arrival latch arms
  // The bench.
  check('A bench: the host stands the seat at the bench', standAt(sA, bench.pos, () => w.nearSalvage(sA)));
  const benchOpened = await shellTicks(shell, A, sec(3), () => shell.salvageDwellRequested);
  check('A bench: the shell\'s own linger opens the bench for its own seat (the dwell on the client, the anchor shipped)',
    benchOpened && shell.salvageDwellSeatId === shell.localSeat.id && shell.nearSalvage(shell.localSeat));
  shell.salvageDwellRequested = false;
  // The board: its slate deals for the reader and rides the reader's journal.
  check('A board: the host stands the seat at the board', standAt(sA, board.pos, () => w.nearBountyBoard(sA, BOUNTY_BOARD_CFG.boardId)));
  const boardOpened = await shellTicks(shell, A, sec(3), () => shell.bountyDwellRequested);
  const view = shell.bountyBoardView(BOUNTY_BOARD_CFG.boardId);
  check('A board: the shell\'s linger opens the board, and the slate the host dealt for the reader reaches it',
    boardOpened && shell.bountyDwellBoardId === BOUNTY_BOARD_CFG.boardId && view.offers.length > 0
      && view.offers.length === w.bountyOffers.filter(o => o.boardId === BOUNTY_BOARD_CFG.boardId).length
      && view.countdown > 0,
    `opened ${boardOpened}, offers ${view.offers.length} (host ${w.bountyOffers.length}), countdown ${view.countdown.toFixed(1)}`);
  shell.bountyDwellRequested = false;
  // The Font.
  check('A font: the host stands the seat at the Font', standAt(sA, font.pos, () => w.nearFont(sA)));
  const fontOpened = await shellTicks(shell, A, sec(3), () => shell.fontDwellRequested);
  check('A font: the shell\'s linger opens the Font (the Font list shipped)', fontOpened && shell.fontDwellSeatId === shell.localSeat.id);
  // The campfire's refresh is the world's (keeper-held on a hosted world): even a shell whose own
  // account owns the fire never offers it.
  const fire = w.stationAnchor('campfire');
  if (fire) {
    standAt(sA, fire.pos, () => dist(sA.actor.pos, fire.pos) <= 60);
    shell.account.features.add(FEATURE.CAMPFIRE);
    await shellTicks(shell, A, 6);
    check('A fire: a hosted shell never offers the campfire, whatever its own account owns', shell.campfireHint() === null);
  }
  // A shell whose zone message carried no counters (a co-op host's) never lingers.
  const { shell: coop } = makeShell(A);
  const bare = { ...A.zones.at(-1)! };
  delete bare.anchors; delete bare.fonts; delete bare.counters;
  applyZone(coop, bare);
  standAt(sA, font.pos, () => w.nearFont(sA));
  await shellTicks(coop, A, sec(2));
  check('A solo: a shell that heard no counters (the co-op lane) never runs a counter linger',
    !coop.fontDwellRequested && !coop.salvageDwellRequested && coop.netCounters === undefined);
}

// ============================================================= B: THE QUEST HAND ==
const accB = makeAccount(); ensureAccountId(accB);
const B = await join('Bram', accB.accountId);
const C = await join('Cass');
const sB = seatOf(B.id), sC = seatOf(C.id);
const giver = w.actors.find(a => a.defId === 'townsfolk_questgiver')!;
const QID = 'undead_south_l5';
const near = (p: Vec2, at: Vec2, r: number): boolean => dist(p, at) <= r;
{
  toHearth(sA, 60); toHearth(sC, -60); // two players AFK at the hearth, far from the giver
  sB.actor.level = 6;
  check('B quest: the host stands B at the giver', standAt(sB, giver.pos, () => w.withQuestHand(sB, () => w.nearAnyQuestGiver())));
  const took = await waitFor(() => w.activeQuests.some(q => q.questId === QID), sec(4));
  check('B quest: B\'s own linger at the giver takes the contract (the giver judged by B, never the keeper)', took,
    `active ${w.activeQuests.map(q => q.questId).join(',')}`);
  const keeper = host.keeper;
  const before = { b: xpOf(sB), a: xpOf(sA), c: xpOf(sC), bPts: sB.meta.passivePoints, bLvl: sB.actor.level, kPts: keeper.meta.passivePoints,
    kBag: keeper.meta.items.length, bMem: memUnits(sB), drops: w.drops.length };
  const aq = w.activeQuests.find(q => q.questId === QID)!;
  aq.fieldDone = true; // the field is done; the turn-in is the giver's
  const paid = await waitFor(() => !w.activeQuests.includes(aq), sec(4));
  await runTicks(6); // the gem pay falls at B's feet as Memories, and B's own hands take them
  const gems = memUnits(sB) - before.bMem + w.drops.slice(before.drops).filter(d => near(d.pos, sB.actor.pos, 90)).length;
  const quest = sB.meta.passivePoints - before.bPts - (sB.actor.level - before.bLvl); // the quest's own point, past any level-up's
  check('B quest: B\'s linger turns it in, and the pay is B\'s: its passive point, its XP, its gems at its own feet',
    paid && w.completedQuests.has(QID) && quest === 1 && xpOf(sB) > before.b && gems >= 3,
    `paid ${paid}, points ${before.bPts}->${sB.meta.passivePoints} (level ${before.bLvl}->${sB.actor.level}), xp ${before.b}->${xpOf(sB)}, gems at B ${gems}`);
  check('B quest: never the keeper (no point, no bag) and never a player AFK at the hearth (no XP)',
    keeper.meta.passivePoints === before.kPts && keeper.meta.items.length === before.kBag
      && xpOf(sA) === before.a && xpOf(sC) === before.c,
    `keeper points ${before.kPts}->${keeper.meta.passivePoints}, A xp ${before.a}->${xpOf(sA)}, C xp ${before.c}->${xpOf(sC)}`);
  // A reward to choose: the Oracle's recovered charm lands in B's own bag.
  w.ledger[ORACLE_RESCUED] = 1;
  const oracle = w.createMonster('townsfolk_oracle', 1, 'player');
  const op = w.clampPos(vec(board.pos.x - 260, board.pos.y + 300), oracle.radius);
  oracle.pos = op; w.actors.push(oracle);
  sB.actor.level = 8;
  check('B choice: the host stands B at the Oracle', standAt(sB, oracle.pos, () => w.withQuestHand(sB, () => w.nearAnyQuestGiver())));
  const tookRelic = await waitFor(() => w.activeQuests.some(q => q.questId === RELIQUARY_QUEST_ID), sec(4));
  const rq = w.activeQuests.find(q => q.questId === RELIQUARY_QUEST_ID);
  if (rq) rq.fieldDone = true;
  const offered = await waitFor(() => !!B.snaps.at(-1)?.seats[B.id]?.jn?.rewards.some(r => r.questId === RELIQUARY_QUEST_ID), sec(4));
  const row = [...B.snaps].reverse().find(s => s.seats[B.id]?.jn)?.seats[B.id]?.jn;
  const choice = row?.rewards.find(r => r.questId === RELIQUARY_QUEST_ID)?.choices[0];
  check('B choice: the reward to choose waits in B\'s own journal row (the giver by B)', tookRelic && offered && !!choice,
    `took ${tookRelic}, offered ${offered}`);
  const bBag = sB.meta.items.length, kBag = keeper.meta.items.length;
  if (choice) act(B, { t: 'questReward', questId: RELIQUARY_QUEST_ID, choiceId: choice.id });
  const claimed = await waitFor(() => w.completedQuests.has(RELIQUARY_QUEST_ID), sec(1));
  check('B choice: B\'s claim lands the piece in B\'s bag, never the keeper\'s',
    claimed && sB.meta.items.length === bBag + 1 && keeper.meta.items.length === kBag
      && sB.meta.items.some(i => i.name === choice?.name),
    `claimed ${claimed}, B bag ${bBag}->${sB.meta.items.length}, keeper bag ${kBag}->${keeper.meta.items.length}`);
}

// ============================================================ C: THE JOURNAL ROW ==
{
  const ownOnly = (cl: Client): boolean => cl.snaps.every(s => Object.entries(s.seats)
    .every(([id, r]) => id === cl.id || (r.jn === undefined && r.hv === undefined)));
  check('C journal: a seat\'s journal row reaches its own socket alone (THE OWN ENTRY)', ownOnly(A) && ownOnly(B) && ownOnly(C),
    `A ${ownOnly(A)}, B ${ownOnly(B)}, C ${ownOnly(C)}`);
  const rows = B.snaps.filter(s => s.seats[B.id]?.jn);
  const bytes = rows.map(s => JSON.stringify(s.seats[B.id].jn).length);
  console.log(`INFO  C bytes: B's journal row rode ${rows.length} of ${B.snaps.length} snapshots, ${Math.min(...bytes)}-${Math.max(...bytes)} B (${w.activeQuests.length} quests held world-wide)`);
  check('C journal: B heard its own row with its contract in it',
    B.snaps.some(s => !!s.seats[B.id]?.jn?.log.active.some(e => e.id === QID))
      && B.snaps.some(s => !!s.seats[B.id]?.jn?.done.includes(QID)));
  // A fresh contract for B to hold, its pin on B's own chart.
  sB.actor.level = 9;
  w.ledger[ORACLE_RESCUED] = 0;
  standAt(sB, giver.pos, () => w.withQuestHand(sB, () => w.nearAnyQuestGiver()));
  await waitFor(() => w.activeQuests.some(q => q.questId === 'relic_depths_l8'), sec(4));
  const corpses = (host as unknown as { corpses: { record(c: object): unknown } }).corpses;
  corpses.record({ accountId: accB.accountId, charId: 'old-bram', name: 'Old Bram', classId: 'warrior', level: 3,
    zoneId: w.zone.id, zoneName: w.zone.name, pos: { x: 400, y: 400 }, map: { x: w.zone.map.x, y: w.zone.map.y }, loot: { items: [] }, diedAt: Date.now() });
  await runTicks(sec(1));
  const { shell: shellB } = makeShell(B);
  for (let i = 0; i < 4; i++) shellFrame(shellB, B);
  const lastRow = [...B.snaps].reverse().find(s => s.seats[B.id]?.jn);
  if (lastRow) applyOwnSeatRows(shellB, lastRow);
  const pins = collectMarkers(shellB);
  check('C shell: B\'s shell reads its log and its pins off the row (its contract, its own remembered body)',
    shellB.questLog().active.some(e => e.id === 'relic_depths_l8') && pins.some(m => m.id === 'quest-target-relic_depths_l8')
      && pins.some(m => m.glyph === '☠' && m.title.includes('Old Bram')),
    `active ${shellB.questLog().active.map(e => e.id).join(',')}; pins ${pins.map(m => m.id).join(',')}`);
}

// ======================================================== D: THE BOARD PER SEAT ==
{
  const BID = BOUNTY_BOARD_CFG.boardId;
  toHearth(sA, 40); toHearth(sB, -40);
  w.armBountyBoard(BID);
  await runTicks(3);
  const offers = w.bountyOffers.filter(o => o.boardId === BID).map(o => o.id);
  act(A, { t: 'bountyAccept', id: offers[0] });
  await runTicks(3);
  check('D board: a posting is taken at its board, never from across the town', !w.bountyHands.some(h => h.id === offers[0]),
    `offers ${offers.join(',')}`);
  check('D board: A and B stand at the board, on its two sides',
    standAt(sA, board.pos, () => w.nearBountyBoard(sA, BID), -1) && standAt(sB, board.pos, () => w.nearBountyBoard(sB, BID) && dist(sA.actor.pos, sB.actor.pos) >= 100, 1));
  act(A, { t: 'bountyAccept', id: offers[0] });
  await runTicks(3);
  act(A, { t: 'bountyAccept', id: offers[1] });
  await runTicks(3);
  const aHeld = w.bountyHands.filter(h => h.holder === A.id).length;
  act(B, { t: 'bountyAccept', id: offers[1] });
  await runTicks(3);
  const hA = w.bountyHands.find(h => h.id === offers[0]), hB = w.bountyHands.find(h => h.id === offers[1]);
  check('D board: one hand per seat per board — A\'s second take is refused, B\'s own take stands beside A\'s',
    aHeld === 1 && hA?.holder === A.id && hB?.holder === B.id && w.bountyHands.length >= 2,
    `A held ${aHeld}; holders ${w.bountyHands.map(h => `${h.id}:${h.holder}`).join(',')}`);
  await runTicks(sec(0.7));
  const boardRow = (cl: Client) => [...cl.snaps].reverse().find(s => s.seats[cl.id]?.jn?.boards?.[BID])?.seats[cl.id]?.jn?.boards?.[BID];
  const ra = boardRow(A), rb = boardRow(B);
  check('D board: each seat\'s journal lists its own hand alone',
    !!ra && !!rb && ra.hands.length === 1 && ra.hands[0].id === offers[0] && rb.hands.length === 1 && rb.hands[0].id === offers[1],
    `A ${ra?.hands.map(h => h.id).join(',')}, B ${rb?.hands.map(h => h.id).join(',')}`);
  // The work is done (the kinds' own predicates, forced for the rig).
  const restore = new Map<string, unknown>();
  for (const h of [hA!, hB!]) { const row = BOUNTY_KINDS[h.kind]; if (!restore.has(h.kind)) restore.set(h.kind, row.done); row.done = () => true; }
  act(B, { t: 'bountyTurnIn', id: offers[0] });
  await runTicks(3);
  check('D board: only the holder turns a hand in (B cannot turn in A\'s)', w.bountyHands.some(h => h.id === offers[0]));
  // A writ pays at the turning seat's feet; essence vacuums into that seat's own wallet, a pouch into its own bag.
  const take = (s: Seat): number => essOf(s) * 1000 + memUnits(s) * 10 + s.meta.items.length;
  const p0 = { a: take(sA), b: take(sB), k: take(host.keeper) };
  act(A, { t: 'bountyTurnIn', id: offers[0] });
  await runTicks(8);
  check('D board: A\'s writ pays A (never the keeper, never B)',
    !w.bountyHands.some(h => h.id === offers[0]) && take(sA) > p0.a && take(sB) === p0.b && take(host.keeper) === p0.k,
    `A ${p0.a}->${take(sA)}, B ${p0.b}->${take(sB)}, keeper ${p0.k}->${take(host.keeper)}`);
  const p1 = { a: take(sA), b: take(sB) };
  act(B, { t: 'bountyTurnIn', id: offers[1] });
  await runTicks(8);
  check('D board: B\'s writ pays B', !w.bountyHands.some(h => h.id === offers[1]) && take(sB) > p1.b && take(sA) === p1.a,
    `B ${p1.b}->${take(sB)}, A ${p1.a}->${take(sA)}`);
  for (const [kind, done] of restore) (BOUNTY_KINDS[kind] as { done: unknown }).done = done;
  w.journalDirty.add(A.id); w.journalDirty.add(B.id);
  await runTicks(2);
  const viewA = w.withQuestHand(sA, () => w.bountyBoardView(BID)), viewB = w.withQuestHand(sB, () => w.bountyBoardView(BID));
  check('D board: the receipt prints for the seat it paid (B\'s last turn-in, never on A\'s board)', !!viewB.receipt && viewA.receipt === undefined,
    `A ${viewA.receipt?.title}, B ${viewB.receipt?.title}`);
}

// ====================================================== E: THE HARVEST, remote ==
{
  const def = HARVEST_NODES[0];
  const at = w.clampPos(vec(1300, 1000), HARVEST_CFG.nodeRadius);
  const doodad = { pos: vec(at.x, at.y), radius: HARVEST_CFG.nodeRadius, kind: def.kind };
  w.doodads.push(doodad as never);
  wx.harvestNodes.push({ pos: vec(at.x, at.y), def, doodad, spent: false });
  toHearth(sB, -40);
  standAt(sA, at, () => dist(sA.actor.pos, at) <= HARVEST_CFG.armRadius && dist(sA.actor.pos, at) > 20);
  const armed = await waitFor(() => wx.harvestSessions.some((s: { seatId: string }) => s.seatId === A.id), sec(3));
  const session = wx.harvestSessions.find((s: { seatId: string }) => s.seatId === A.id) as { seq: number[] } | undefined;
  await runTicks(4);
  const hv = A.snaps.at(-1)?.seats[A.id]?.hv;
  check('E harvest: a remote seat\'s linger at a node arms its own rite, and the rite rides its own row (rooted, its steps)',
    armed && !!session && !!hv && hv.rites.length === 1 && JSON.stringify(hv.rites[0].steps) === JSON.stringify(session.seq)
      && A.snaps.at(-1)?.seats[A.id]?.rooted === true,
    `armed ${armed}, steps ${JSON.stringify(session?.seq)} / ${JSON.stringify(hv?.rites[0]?.steps)}`);
  const e0 = essOf(sA), d0 = w.drops.length;
  for (const step of session?.seq ?? []) {
    const edge = still(); edge[step] = true;
    const held = still(); held[step] = true;
    A.c.sendInput(A.id, { dx: 0, dy: 0, aim: { x: sA.actor.pos.x + 50, y: sA.actor.pos.y }, held, edge } as PlayerInput);
    await runTicks(2);
    A.c.sendInput(A.id, { dx: 0, dy: 0, aim: { x: sA.actor.pos.x + 50, y: sA.actor.pos.y }, held: still(), edge: still() } as PlayerInput);
    await runTicks(2);
  }
  const done = await waitFor(() => !wx.harvestSessions.some((s: { seatId: string }) => s.seatId === A.id), sec(1));
  await runTicks(6);
  const paidRite = essOf(sA) - e0 + w.drops.slice(d0).filter(d => near(d.pos, at, 80)).length;
  check('E harvest: its symbol presses over the input path complete the rite, and the node pays',
    done && wx.harvestNodes.at(-1).spent && paidRite > 0 && !A.snaps.at(-1)?.seats[A.id]?.rooted,
    `done ${done}, paid ${paidRite}`);
  check('E harvest: the rite row never reached another seat', B.snaps.every(s => Object.entries(s.seats).every(([id, r]) => id === B.id || r.hv === undefined)));
}

// ===================================================== F: XP BY PLACE ==
{
  const radius = COOP_SCALING.shareRadius;
  COOP_SCALING.shareRadius = 400;
  try {
    const P = w.clampPos(vec(1300, 1300), 12);
    standAt(sA, P, () => dist(sA.actor.pos, P) <= 120);
    toHearth(sC); // AFK at the hearth
    const far = w.clampPos(vec(2400, 300), 12); sB.actor.pos.x = far.x; sB.actor.pos.y = far.y;
    const b0 = { a: xpOf(sA), b: xpOf(sB), c: xpOf(sC) };
    wx.closeEncounter({ pos: vec(P.x, P.y), radius: 100, phase: 'open', def: { ledger: { onClose: 'probe_close' }, label: 'Probe', trigger: { color: '#ffffff' } }, scale: { rewardMul: 1 } });
    check('F place: an encounter\'s close pays the seat near its place, never the AFK hearth nor a far player',
      xpOf(sA) > b0.a && xpOf(sB) === b0.b && xpOf(sC) === b0.c, `A ${b0.a}->${xpOf(sA)}, B ${b0.b}->${xpOf(sB)}, C ${b0.c}->${xpOf(sC)}`);
    const b1 = { a: xpOf(sA), b: xpOf(sB), c: xpOf(sC) };
    wx.objectiveFallAt = { zone: w.zone.id, pos: vec(P.x, P.y) };
    const hadDone = wx.objectiveDone, hadCleared = w.completedObjectives.has(w.zone.id);
    wx.objectiveDone = false; w.completedObjectives.delete(w.zone.id);
    wx.completeObjective('probe');
    wx.objectiveDone = hadDone; if (!hadCleared) w.completedObjectives.delete(w.zone.id);
    check('F place: a zone objective pays the seats near where it was done, never the AFK hearth',
      xpOf(sA) > b1.a && xpOf(sB) === b1.b && xpOf(sC) === b1.c, `A ${b1.a}->${xpOf(sA)}, B ${b1.b}->${xpOf(sB)}, C ${b1.c}->${xpOf(sC)}`);
    const b2 = { a: xpOf(sA), b: xpOf(sB), c: xpOf(sC) };
    w.actingSeat = sB; w.grantXp(120); w.actingSeat = null;
    check('F place: a grant with no place inside an act pays the acting seat, never the hearth',
      xpOf(sB) > b2.b && xpOf(sA) === b2.a && xpOf(sC) === b2.c, `A ${b2.a}->${xpOf(sA)}, B ${b2.b}->${xpOf(sB)}, C ${b2.c}->${xpOf(sC)}`);
  } finally { COOP_SCALING.shareRadius = radius; }
}

// ================================================== G: THE SOLO INVARIANT ==
{
  const acct = makeAccount();
  const solo = new World(acct, Object.freeze(buildManifest(acct, 0x51a7)));
  solo.createPlayer(warrior, { startingCompanions: false, startingFlasks: false });
  const z = serializeZone(solo), s = serializeSnapshot(solo, 31);
  check('G solo: a world with no keeper ships no counter rows (zone or snapshot) and its quest hand is its hero',
    z.anchors === undefined && z.fonts === undefined && z.counters === undefined
      && Object.values(s.seats).every(r => r.jn === undefined && r.hv === undefined) && solo.questHand() === solo.localSeat);
}

for (const cl of [A, B, C]) cl.c.leave();
await waitFor(() => w.seats.length === 1, sec(VESSEL_CFG.deathBeatSec) + 120);
await host.stop();
restoreRandom();
await new Promise(r => setTimeout(r, 600));
void JOURNAL_WIRE_CFG;
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
