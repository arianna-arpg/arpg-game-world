// THE PARTY THAT READS (docs/engine/shard.md; charter cards 23 and 28): what a hosted world's
// party SHOWS its players, the audit of a player's first hour (2026-10-10). The rig boots a
// classic shard with an open account, seats players over the wire and pins:
//   N  THE NEAR ROSTER: the panel's model lists the players within THE NEAR LAW's radius of the
//      viewer as "near you" (invitable while ungrouped) and every other connected player by name;
//      the inviter of an unanswered invite stays near and invitable (the founder is no party);
//   I  THE INVITE TELL: the inbox keeps an invitation until its `until` and drops it past it, when
//      its inviter leaves, and hides it while grouped; the menu's Party pip counts it;
//   R  THE REVIVE ROW (SeatW.rv, THE OWN ENTRY): the downed seat reads its own down (the fill, THE
//      BLEED-OUT's seconds, THE WIPE RADIUS and the mates whose standing holds it) and the kneeler
//      reads the body in its reach, each on its own socket alone; a kneel fills both rows and
//      resets the bleed-out to full; a shell's ring reads the row;
//   L  THE RELEASE: a held mortal's interact press gives up the wait (the covenant falls at once);
//      a held Immortal's goes to THE MERCY; a press with nothing holding the down changes nothing;
//   B  THE BLEED-OUT (card 28, RULED B 2026-10-10): the dial ships at 60 s (R reads a held down's
//      clock at 60 and a kneel resetting it there); at a short dial a held down falls when it runs
//      out and a kneel resets it to full; at 0 the wait has no clock (the release still answers);
//   P  THE PARTY SURVIVES A DEATH: a fallen member's place is held; the same connection's next hero
//      or the account's next seat on a new connection takes it back inside rejoinSec; a place past
//      rejoinSec is gone (a party of one dissolves); a wiped party stands on its held places and
//      the first back leads.
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { PARTY_CFG, PartyDesk } from '../server/party';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import { COOP_SCALING } from '../src/data/coop';
import { PARTY_WIRE_CFG, type PartyRow, type ReviveW } from '../src/net/partyWire';
import { PARTY_INBOX, applyOwnReviveRow, partyPanelModel, reviveTargetsOfRow, type PartyPanelModel } from '../src/net/partyReads';
import { SEAT_OWN_ROWS, type StateSnapshot } from '../src/net/snapshot';
import type { SessionMsg } from '../src/net/transport';
import { menuAttentionOf } from '../src/engine/menu';
import '../src/data/menu';
import { ensureAccountId, makeAccount } from '../src/meta/account';
import type { Seat, World } from '../src/engine/world';
import { dist, vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
async function runTicks(n: number, each?: () => void): Promise<void> {
  for (let i = 0; i < n; i++) { each?.(); host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}

SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x9a47e6, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

/** A client over the wire: every snapshot and session word it hears. */
interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[] }
async function join(name: string, accountId?: string): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [] };
  c.onSession(m => { cl.heard.push(m); });
  c.onState(s => { cl.snaps.push(s); if (cl.snaps.length > 200) cl.snaps.splice(0, 100); });
  const welcome = await c.connect(url, { name, classId: 'warrior', ...(accountId ? { accountId } : {}) });
  cl.id = welcome.self;
  await waitFor(() => !!seatOf(cl.id), 60);
  return cl;
}
const latest = (cl: Client): StateSnapshot | undefined => cl.snaps.at(-1);
const rowOf = (cl: Client): ReviveW | undefined => latest(cl)?.seats[cl.id]?.rv;
/** Stand a seat's hero at a spot (the world's clamp says where it truly stands). */
const place = (s: Seat, x: number, y: number): void => { const p = w.clampPos(vec(x, y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; };
const group = (a: Client, b: Client): boolean => host.parties.invite(a.id, b.id, w.time) === null && host.parties.accept(b.id, w.time) === null;
const pressRelease = (cl: Client): void => { cl.c.sendSession({ t: 'action', action: { t: 'pickupItem' } }); };
const account = (): string => { const a = makeAccount(); ensureAccountId(a); return a.accountId; };
/** The panel's model as this client's own wire reads it (main.ts's reads, from the snapshot). */
function modelOf(cl: Client): PartyPanelModel {
  const s = latest(cl)!;
  const me = s.seats[cl.id];
  return partyPanelModel({
    me: cl.id, at: me ? { x: me.pos[0], y: me.pos[1] } : null,
    bodies: s.actors.filter(a => a.seat).map(a => ({ seat: a.seat!, name: a.name, pos: { x: a.p[0], y: a.p[1] } })),
    peers: cl.c.peers().filter(p => !p.isHost).map(p => ({ id: p.id, name: p.name })),
    rows: s.parties ?? null, invites: [], word: null, radius: PARTY_WIRE_CFG.nearRadius,
  });
}
const hearth = host.hearthSeat();
/** The rig's ground: where every joiner stands up (THE HEARTH WAKE), so a kneel beside it is in reach. */
const anchor = w.clampPos(w.findFreeSpot(vec(hearth.x, hearth.y), 22) ?? vec(hearth.x, hearth.y), 18);
const at = (s: Seat, dx: number, dy = 0): void => place(s, anchor.x + dx, anchor.y + dy);

// ============================================================ N: THE NEAR ROSTER ==
const A = await join('Anvil'), B = await join('Bram'), C = await join('Cass');
await runTicks(3);
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;
  at(a, 0);
  at(b, 200);
  at(c, PARTY_WIRE_CFG.nearRadius + 300);
  await runTicks(6);
  const far = dist(a.actor.pos, c.actor.pos);
  const m = modelOf(A);
  check('N near: a player within THE NEAR LAW\'s radius is "near you" and invitable',
    m.near.length === 1 && m.near[0].id === B.id && m.near[0].invite, JSON.stringify(m.near));
  check('N far: a player beyond the radius is listed by name alone (the far roster)', far > PARTY_WIRE_CFG.nearRadius
    && m.far.some(x => x.id === C.id) && !m.near.some(x => x.id === C.id), `${Math.round(far)} px off`);
  check('N radius: the panel\'s reach is THE NEAR LAW the shard itself reads', PARTY_WIRE_CFG.nearRadius === SHARD_CFG.nearRadius && COOP_SCALING.shareRadius === SHARD_CFG.nearRadius);
  A.c.sendSession({ t: 'party', op: 'invite', seat: B.id });
  await waitFor(() => B.heard.some(x => x.t === 'partyInvite'), 60);
  await runTicks(6);
  const mb = modelOf(B);
  check('N founder: the inviter of an unanswered invite stays near and invitable (no party of one)',
    mb.near.some(x => x.id === A.id && x.invite) && !(latest(B)?.parties ?? []).some(r => r.members.includes(A.id)), JSON.stringify(mb.near));
  B.c.sendSession({ t: 'party', op: 'accept' });
  await waitFor(() => host.parties.partyOf(B.id)?.members.length === 2, 60);
  await runTicks(6);
  const ma = modelOf(A);
  check('N party: once grouped, the mate rows under your party and leaves the near list',
    ma.party?.members.map(x => x.id).join() === `${A.id},${B.id}` && !!ma.party?.members[0].lead && ma.party?.members[1].kick === true && !ma.near.some(x => x.id === B.id));
  const mc = modelOf(C);
  check('N grouped: to a stranger the pair reads near-or-far by reach, and never invitable', [...mc.near, ...mc.far].some(x => x.id === A.id)
    && !mc.near.some(x => x.invite && (x.id === A.id || x.id === B.id)));
  // THE STABLE PANEL's digest: the model is the same model when nothing it shows moved.
  check('N stable: a quiet world reads the same model twice (the panel patches only on change)', JSON.stringify(modelOf(A)) === JSON.stringify(ma));
}

// ============================================================= I: THE INVITE TELL ==
{
  const inv = B.heard.find(x => x.t === 'partyInvite');
  const reads = { account: makeAccount(), world: w, seat: w.localSeat, pageOpen: () => false, ownedUnlock: () => true };
  PARTY_INBOX.clear();
  const pip0 = menuAttentionOf('party', reads).pips;
  if (inv?.t === 'partyInvite') PARTY_INBOX.land(inv, w.time);
  const until = inv?.t === 'partyInvite' ? inv.until : 0;
  check('I inbox: a landed invitation stands until its until, and the Party page wears its pip',
    pip0 === 0 && PARTY_INBOX.standing(until - 1).length === 1 && menuAttentionOf('party', reads).pips === 1);
  check('I inbox: hidden while this client stands grouped (a grouped accept is refused)', PARTY_INBOX.standing(until - 1, true).length === 0 && PARTY_INBOX.invites.length === 1);
  check('I inbox: a lapsed invitation falls away, and the pip with it', PARTY_INBOX.standing(until + 0.01).length === 0 && menuAttentionOf('party', reads).pips === 0);
  if (inv?.t === 'partyInvite') PARTY_INBOX.land(inv, w.time);
  check('I inbox: an invitation whose inviter left the world falls away', PARTY_INBOX.standing(until - 1, false, () => false).length === 0);
  PARTY_INBOX.clear();
}

// ============================================================== R: THE REVIVE ROW ==
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;
  at(a, 0); at(b, 300); at(c, 0, 400);
  await runTicks(3);
  w.kill(a.actor);
  await runTicks(6);
  const own = rowOf(A), held = rowOf(B);
  check('R own: the downed seat reads its own down (no kneel yet), THE BLEED-OUT running from the shipped 60 s',
    a.actor.downed && own?.s === A.id && own.f === 0 && VESSEL_CFG.bleedOutSec === 60 && own.lt === 60 && (own.l ?? 0) > 59, JSON.stringify(own));
  check('R wipe: its row draws THE WIPE RADIUS (THE NEAR LAW) and names the mate whose standing holds it',
    own?.r === COOP_SCALING.shareRadius && own.h?.join() === B.id);
  check('R holder: the holding mate out of the revive reach reads the same down and radius, never the knee',
    held?.s === A.id && held.r === COOP_SCALING.shareRadius && !held.k && !!held.h?.includes(B.id), JSON.stringify(held));
  check('R stranger: a player whose standing holds nothing and kneels nothing reads no row', !rowOf(C));
  check('R own entry: each socket carries its own row alone (never another seat\'s)', SEAT_OWN_ROWS.includes('rv')
    && latest(A)?.seats[B.id]?.rv === undefined && latest(B)?.seats[A.id]?.rv === undefined);
  await runTicks(sec(3));
  const bled = rowOf(A)?.l ?? 0;
  check('R bleed: the clock runs while the mate stands off', bled < 57.5 && bled > 56, `${bled} s left`);
  at(b, 40); // the mate walks up and kneels (idle in the revive's reach)
  await runTicks(sec(0.5));
  const knelt = rowOf(B), kneeOwn = rowOf(A);
  check('R kneel: the kneeler\'s row names the body in reach (k) and the fill rising', knelt?.s === A.id && knelt.k === 1 && knelt.f > 0.2 && knelt.f < 1, JSON.stringify(knelt));
  check('R kneel: the downed seat sees the same progress on its own row', !!kneeOwn && Math.abs(kneeOwn.f - (knelt?.f ?? -1)) <= 0.1, `${kneeOwn?.f} vs ${knelt?.f}`);
  check('R kneel: a kneel resets THE BLEED-OUT to the full 60 s', (kneeOwn?.l ?? 0) > 59.5 && kneeOwn?.lt === 60, `${kneeOwn?.l} s left`);
  // The shell's half: its ring and its hint read the row (a shell holds only its own seat).
  const body = { pos: vec(a.actor.pos.x, a.actor.pos.y), name: a.actor.name, dead: false, downed: true };
  const shell = (me: string, rv: ReviveW | undefined): World => ({ netRevive: rv ?? null, clientSeatId: me, player: { dead: false, downed: false, pos: vec(0, 0) },
    partyRows: [] as PartyRow[], party: { members: [{ seat: A.id, actor: body, local: false }] } }) as unknown as World;
  const ring = reviveTargetsOfRow(shell(B.id, knelt));
  check('R shell: a kneeling shell\'s revive ring stands on the body with the host\'s fill (drawn == dwelt)',
    ring.length === 1 && ring[0].kind === 'revive' && ring[0].frac === knelt?.f && ring[0].pos.x === body.pos.x && ring[0].name === a.actor.name);
  check('R shell: a holder out of reach, and the downed body itself, wear no revive ring', !reviveTargetsOfRow(shell(B.id, held)).length && !reviveTargetsOfRow(shell(A.id, kneeOwn)).length);
  const sw = shell(B.id, undefined) as unknown as { netRevive: unknown; partyRows: unknown };
  applyOwnReviveRow(sw as unknown as World, latest(B)!);
  const off = { netRevive: undefined, partyRows: null, clientSeatId: B.id } as unknown as World;
  applyOwnReviveRow(off, latest(B)!);
  check('R shell: a hosted shell adopts its own row; a world with no party rows (co-op, solo) keeps every old read',
    (sw.netRevive as ReviveW | null)?.s === A.id && off.netRevive === undefined);
  await waitFor(() => !a.actor.downed, sec(2));
  await runTicks(6);
  check('R revived: the kneel completes the revive and both rows go quiet', !a.actor.downed && !a.actor.dead && !rowOf(A) && !rowOf(B));
}

// ================================================================ L: THE RELEASE ==
/** THE MERCY's clock, shortened for the rig: the warden's own dial (the law under test is whom it waits on). */
const warden = w.localSeat.keeper!;
const mercy0 = warden.reviveSec;
warden.reviveSec = 2;
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;
  at(a, 0); at(b, 300);
  await runTicks(3);
  const falls0 = host.vessels.freshFalls;
  // A press with nothing holding the down changes nothing (an Immortal alone keeps THE MERCY's clock).
  const mode0 = c.meta.modeId;
  c.meta.modeId = 'immortal';
  at(c, 900, 600);
  w.kill(c.actor);
  await runTicks(2);
  check('L nothing: a release press with no mate holding the down is no press', c.actor.downed && !host.vessels.release(C.id) && !host.vessels.waitEnded(C.id));
  await waitFor(() => !c.actor.downed, sec(warden.reviveSec) + 30);
  check('L nothing: the lone Immortal rises by THE MERCY as ever', !c.actor.downed && !c.actor.dead);
  c.meta.modeId = mode0;
  w.kill(a.actor);
  await runTicks(3);
  check('L held: the grouped mortal\'s down is held by its mate', a.actor.downed && !a.actor.dead && host.vessels.freshFalls === falls0);
  pressRelease(A);
  await waitFor(() => a.actor.dead, 30);
  check('L release: its interact press gives up the wait, and the covenant falls at once (the player\'s own choice)',
    a.actor.dead && host.vessels.freshFalls === falls0 + 1 && !A.heard.some(x => x.t === 'runEnd'));
  await waitFor(() => A.heard.some(x => x.t === 'runEnd'), sec(VESSEL_CFG.deathBeatSec) + 30);
  check('L release: the fall plays THE DEATH BEAT, then its word', A.heard.some(x => x.t === 'runEnd') && !seatOf(A.id));
}

// ========================================== P: THE PARTY SURVIVES A DEATH (same connection) ==
{
  const party = host.parties.partyOf(B.id);
  check('P held: the fallen member\'s place is held (a party of two stands on its survivor and the held place)',
    !!party && party.members.join() === B.id && party.held.length === 1 && party.held[0].seat === A.id && party.leader === B.id);
  await runTicks(6);
  const row = (latest(B)?.parties ?? []).find(r => r.members.includes(B.id));
  check('P held: the wire names the held place (the panel\'s dim row)', !!row && row.held?.length === 1 && row.held[0] === 'Anvil', JSON.stringify(row));
  A.c.sendSession({ t: 'rejoin', classId: 'warrior' }); // the same connection's next hero (THE FRESH HERO'S END, then the class pick)
  await waitFor(() => !!seatOf(A.id), 60);
  await runTicks(3);
  check('P rejoin: the same connection\'s next hero takes its place back inside rejoinSec (no re-invite)',
    host.parties.partyOf(A.id) === party && party?.members.join() === `${B.id},${A.id}` && party.held.length === 0);
}

// ============================================================= I2: the immortal's release ==
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!;
  const mode0 = a.meta.modeId;
  a.meta.modeId = 'immortal';
  at(a, 0); at(b, 300);
  await runTicks(3);
  w.kill(a.actor);
  await runTicks(sec(warden.reviveSec + 1)); // past the mercy's own clock: it waits on the mate
  check('L immortal: a held Immortal\'s down waits on its mate (THE MERCY waits on party mates)', a.actor.downed && !a.actor.dead);
  pressRelease(A);
  await runTicks(3);
  check('L immortal: its release ends the wait without a fall', host.vessels.waitEnded(A.id) && a.actor.downed && !a.actor.dead);
  await waitFor(() => !a.actor.downed, sec(warden.reviveSec) + 30);
  check('L immortal: THE MERCY stands it up where it lay (a life that survives death)', !a.actor.downed && !a.actor.dead && !!seatOf(A.id));
  a.meta.modeId = mode0;
}
warden.reviveSec = mercy0;

// ============================================================ B: THE BLEED-OUT ==
// The shipped 60 s is pinned above (R: a held down's row runs from 60, a kneel resets it to 60);
// the law itself runs here at a short dial, so the rig need not wait out a minute.
check('B dial: THE BLEED-OUT ships at 60 s (card 28 RULED B, 2026-10-10)', VESSEL_CFG.bleedOutSec === 60);
{
  const dial = VESSEL_CFG.bleedOutSec;
  VESSEL_CFG.bleedOutSec = 4;
  try {
    const a = seatOf(A.id)!, b = seatOf(B.id)!;
    at(a, 0); at(b, 300); // held, never kneeling
    await runTicks(3);
    const falls0 = host.vessels.freshFalls;
    w.kill(a.actor);
    await runTicks(sec(2));
    at(b, 40); // a kneel...
    await runTicks(sec(0.4));
    at(b, 300); // ...broken off before the revive
    await runTicks(3);
    const reset = rowOf(A)?.l ?? 0;
    check('B reset: a kneel resets the clock to full (2 s into a 4 s dial)', a.actor.downed && reset > 3.8 && rowOf(A)?.lt === 4, `${reset} s left`);
    await runTicks(sec(3.4));
    check('B hold: short of the dial after the kneel the down still waits (without the reset it would have fallen)',
      a.actor.downed && !a.actor.dead && host.vessels.freshFalls === falls0, `${rowOf(A)?.l} s left`);
    await waitFor(() => a.actor.dead, sec(1.5));
    check('B out: when the bleed-out runs out, the held mortal falls by the covenant (no player holds another hostage)',
      a.actor.dead && host.vessels.freshFalls === falls0 + 1);
    await waitFor(() => !seatOf(A.id), sec(VESSEL_CFG.deathBeatSec) + 30);
    A.c.sendSession({ t: 'rejoin', classId: 'warrior' });
    await waitFor(() => !!seatOf(A.id), 60);
    await runTicks(3);
    check('B rejoin: the bled-out member takes its held place back', host.parties.partyOf(A.id) === host.parties.partyOf(B.id) && !!host.parties.partyOf(A.id));
    // The dial at 0: no clock (the wait lasts while a mate stands).
    VESSEL_CFG.bleedOutSec = 0;
    const a2 = seatOf(A.id)!;
    at(a2, 0); at(b, 300);
    await runTicks(3);
    w.kill(a2.actor);
    await runTicks(sec(5));
    const r0 = rowOf(A);
    check('B zero: at 0 a held down has no clock: no seconds on its row, and it waits past any value', a2.actor.downed && !a2.actor.dead && !!r0 && r0.l === undefined && r0.lt === undefined
      && !host.vessels.waitEnded(A.id), JSON.stringify(r0));
    pressRelease(A);
    await waitFor(() => a2.actor.dead, 30);
    check('B zero: the release still answers with no clock', a2.actor.dead);
  } finally { VESSEL_CFG.bleedOutSec = dial; }
  await waitFor(() => !seatOf(A.id), sec(VESSEL_CFG.deathBeatSec) + 30);
}

// ======================================== P2: a new connection on the account; the lapse ==
{
  const acct = account();
  const Q1 = await join('Quill', acct), Q2 = await join('Quell');
  await runTicks(3);
  check('P account: two players group', group(Q1, Q2) && host.parties.partyOf(Q1.id) === host.parties.partyOf(Q2.id));
  const q1 = seatOf(Q1.id)!, q2 = seatOf(Q2.id)!;
  at(q1, 0, 600); at(q2, 300, 600);
  await runTicks(3);
  w.kill(q1.actor);
  await runTicks(3);
  pressRelease(Q1);
  await waitFor(() => !seatOf(Q1.id), sec(VESSEL_CFG.deathBeatSec) + 30);
  Q1.c.leave(); // the client drifts back into Mu: its connection closes
  await runTicks(3);
  const held = host.parties.partyOf(Q2.id);
  check('P account: a closed connection keeps an account\'s held place', !!held && held.held.length === 1 && held.held[0].account === acct);
  const Q3 = await join('Quill', acct); // the account's next vessel, on a new connection
  await runTicks(3);
  check('P account: the account\'s next seat on a new connection takes the place back', Q3.id !== Q1.id && host.parties.partyOf(Q3.id) === held && held?.members.join() === `${Q2.id},${Q3.id}`);
  // Past rejoinSec the place is gone, and a party of one dissolves.
  const q3 = seatOf(Q3.id)!;
  at(q3, 0, 600); at(q2, 300, 600);
  await runTicks(3);
  w.kill(q3.actor);
  await runTicks(3);
  pressRelease(Q3);
  await waitFor(() => !seatOf(Q3.id), sec(VESSEL_CFG.deathBeatSec) + 30);
  host.parties.sweep(w.time + PARTY_CFG.rejoinSec + 1);
  check('P lapse: past rejoinSec the held place is gone and the party of one dissolves', !host.parties.partyOf(Q2.id));
  Q3.c.sendSession({ t: 'rejoin', classId: 'warrior' });
  await waitFor(() => !!seatOf(Q3.id), 60);
  check('P lapse: the late return walks alone', !!seatOf(Q3.id) && !host.parties.partyOf(Q3.id));
  for (const x of [Q2, Q3]) x.c.leave();
}

// ========================================================= P3: the wipe, at the desk ==
{
  const desk = new PartyDesk(() => true);
  const t0 = 100;
  desk.seatJoined('x1', 'acct_x1', t0); desk.seatJoined('x2', undefined, t0);
  desk.invite('x1', 'x2', t0); desk.accept('x2', t0);
  desk.seatFell('x1', t0, 'Xan'); desk.seatFell('x2', t0, 'Xia');
  check('P wipe: a wiped party ships no row while no member stands', desk.rows().length === 0 && !desk.partyOf('x1') && !desk.partyOf('x2'));
  const back = desk.seatJoined('x9', 'acct_x1', t0 + 10);
  check('P wipe: it stands on its held places; the first back leads', !!back && desk.rows()[0]?.leader === 'x9' && desk.rows()[0]?.held?.join() === 'Xia');
  desk.dropSeat('x2'); // a seat-keyed place goes with its connection
  check('P wipe: a seat-keyed place goes with its closed connection, and a party of one dissolves', desk.rows().length === 0 && !desk.partyOf('x9'));
  const desk2 = new PartyDesk(() => true);
  desk2.seatJoined('y1', 'acct_y1', t0); desk2.invite('y1', 'y2', t0); desk2.accept('y2', t0);
  desk2.seatFell('y1', t0, 'Yew');
  check('P cap: a held place counts toward the member cap', (() => {
    const cap = PARTY_CFG.maxMembers;
    let n = 0;
    for (let i = 0; i < cap; i++) if (desk2.invite('y2', `z${i}`, t0) === null && desk2.accept(`z${i}`, t0) === null) n++;
    return n === cap - 2;
  })());
}

for (const x of [A, B, C]) x.c.leave();
await waitFor(() => w.seats.length === 1, 120);
await host.stop();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
