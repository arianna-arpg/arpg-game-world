// THE PARTY (docs/design/shard-world.md card 23 — her word 2026-10-08/09): the explicit
// social unit on a hosted world. The rig boots a classic shard with an open account,
// seats three players over the wire and pins:
//   A  the words — invite lands on its target, accept groups, the refusals answer the asker
//      with one line (yourself, already grouped, no invite, not the leader), the keeper is
//      never seated in a party, a lapsed invite is no invite;
//   B  the wire — the snapshot ships the parties on change, then holds its tongue;
//   C  THE KILLER'S DUE widens to the party within reach, never a stranger beside it;
//   D  THE GROUP LAW — a grouped hero's lethal down is a DOWN while a mate stands, and the
//      party wipe fells every downed member at once; an ungrouped down ends at once;
//   E  the ledger — kick, leave, the dissolve of a party of one, the leader passing to the
//      eldest member, a seat gone from the world gone from its party.
import { ShardHost, SHARD_CFG } from '../server/shardHost';
import { PARTY_CFG } from '../server/party';
import { WsTransport } from '../src/net/ws';
import { COOP_SCALING } from '../src/data/coop';
import type { SessionMsg } from '../src/net/transport';
import type { Seat } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const DT = 1 / SHARD_CFG.tickHz;
async function runTicks(host: ShardHost, n: number): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); }
}
async function waitFor(cond: () => boolean, host: ShardHost | null, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) {
    if (cond()) return true;
    if (host) host.tick(DT);
    await yieldIO();
  }
  return cond();
}

const host = new ShardHost({ seed: 0x9a47e5, saveDir: null, open: true, log: () => { /* quiet */ } });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const seatOf = (id: string): Seat | undefined => w.seats.find(s => s.id === id);

async function join(name: string): Promise<{ c: WsTransport; id: string; heard: SessionMsg[] }> {
  const c = new WsTransport();
  const heard: SessionMsg[] = [];
  c.onSession(m => { heard.push(m); });
  const welcome = await c.connect(url, { name, classId: 'warrior' });
  await waitFor(() => !!seatOf(welcome.self), host, 60);
  return { c, id: welcome.self, heard };
}
const A = await join('Anvil'), B = await join('Bram'), C = await join('Cass');
await runTicks(host, 3);
const words = (x: { heard: SessionMsg[] }): string[] => x.heard.flatMap(m => (m.t === 'partyWord' ? [m.word] : []));
const lastWord = (x: { heard: SessionMsg[] }): string => words(x).at(-1) ?? '(none)';

// ================================================================ A: the words ==
A.c.sendSession({ t: 'party', op: 'invite', seat: B.id });
await waitFor(() => B.heard.some(m => m.t === 'partyInvite'), host, 60);
const inv = B.heard.find(m => m.t === 'partyInvite');
check('A invite: the invite lands on its target, naming the inviter', inv?.t === 'partyInvite' && inv.from === A.id && inv.name === 'Anvil' && !!host.parties.inviteFor(B.id),
  inv?.t === 'partyInvite' ? `${inv.name} → ${B.id}` : 'no invite heard');
check('A invite: the inviter founded a party of one, its leader', host.parties.partyOf(A.id)?.leader === A.id && host.parties.partyOf(A.id)?.members.length === 1);
B.c.sendSession({ t: 'party', op: 'accept' });
await waitFor(() => (host.parties.partyOf(B.id)?.members.length ?? 0) === 2, host, 60);
const party = host.parties.partyOf(A.id)!;
check('A accept: the invitee joins — one party, two members, the leader first', !!party && party.members[0] === A.id && party.members[1] === B.id && host.parties.partyOf(B.id) === party);
A.c.sendSession({ t: 'party', op: 'invite', seat: A.id });
await waitFor(() => words(A).length >= 1, host, 60);
check('A refusal: inviting yourself answers with one line', lastWord(A) === 'cannot invite yourself', lastWord(A));
C.c.sendSession({ t: 'party', op: 'invite', seat: B.id });
await waitFor(() => words(C).length >= 1, host, 60);
check('A refusal: inviting a grouped player is refused, and the stranger founded no party', lastWord(C) === 'already grouped' && !host.parties.partyOf(C.id), lastWord(C));
C.c.sendSession({ t: 'party', op: 'accept' });
await waitFor(() => words(C).length >= 2, host, 60);
check('A refusal: accepting with no invite', lastWord(C) === 'no invite', lastWord(C));
B.c.sendSession({ t: 'party', op: 'kick', seat: A.id });
await waitFor(() => words(B).length >= 1, host, 60);
check('A refusal: only the leader kicks', lastWord(B) === 'not the leader' && party.members.length === 2, lastWord(B));
check('A keeper: the warden is never seated in a party', host.parties.invite(A.id, host.keeper.id, w.time) === 'not seated');
{
  const before = host.parties.rev;
  const word = host.parties.invite(A.id, C.id, w.time);
  const lapsed = host.parties.accept(C.id, w.time + PARTY_CFG.inviteSec + 1);
  check('A lapse: an invite past inviteSec is no invite', word === null && lapsed === 'invite lapsed' && !host.parties.partyOf(C.id) && host.parties.rev > before, `${String(word)} / ${lapsed}`);
}

// ================================================================= B: the wire ==
// The rows ride the host's own broadcast on change (the serializer's ledger is per world,
// so a probe reads what a CLIENT receives, never a second direct serialization).
{
  const seen: { tick: number; parties: import('../src/net/partyWire').PartyRow[] | undefined }[] = [];
  const off = A.c.onState(snap => { seen.push({ tick: snap.tick, parties: snap.parties }); });
  await runTicks(host, 12);
  const quietBefore = seen.length;
  host.parties.invite(A.id, C.id, w.time); host.parties.accept(C.id, w.time);
  await runTicks(host, 12);
  const shipped = seen.slice(quietBefore).filter(x => x.parties);
  check('B wire: a change ships every party to the clients on the next snapshot',
    shipped.length >= 1 && shipped[0].parties!.some(p => p.id === party.id && p.members.length === 3 && p.leader === A.id),
    JSON.stringify(shipped[0]?.parties ?? null));
  const quietFrom = seen.length;
  await runTicks(host, 12);
  const quiet = seen.slice(quietFrom).filter(x => x.parties);
  check('B wire: then the rows hold their tongue (at most the account view\'s beat re-sends them, unchanged)',
    quiet.length <= 1 && quiet.every(x => JSON.stringify(x.parties) === JSON.stringify(shipped[0].parties)), `${quiet.length} re-sends over 12 ticks`);
  off();
  host.parties.leave(C.id); await runTicks(host, 3);
}

// ============================================================ C: THE KILLER'S DUE ==
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;
  const radius = COOP_SCALING.shareRadius;
  const was = { ax: a.meta.xp, al: a.actor.level, bx: b.meta.xp, bl: b.actor.level, cx: c.meta.xp, cl: c.actor.level };
  try {
    COOP_SCALING.shareRadius = 400;
    b.actor.pos.x = a.actor.pos.x + 60; b.actor.pos.y = a.actor.pos.y;
    c.actor.pos.x = a.actor.pos.x - 60; c.actor.pos.y = a.actor.pos.y;
    w.grantXp(5, a.actor.pos, a);
    const banked = (s: Seat, x: number, l: number): boolean => s.meta.xp > x || s.actor.level > l;
    check('C due: the killer\'s party mate within reach is paid', banked(a, was.ax, was.al) && banked(b, was.bx, was.bl));
    check('C due: the stranger beside them is not', !banked(c, was.cx, was.cl), `C xp ${was.cx}→${c.meta.xp}`);
    const bx2 = b.meta.xp, bl2 = b.actor.level;
    b.actor.pos.x = a.actor.pos.x + 900;
    w.grantXp(5, a.actor.pos, a);
    check('C due: a mate beyond the near radius is not paid either', !banked(b, bx2, bl2));
    b.actor.pos.x = a.actor.pos.x + 60;
  } finally { COOP_SCALING.shareRadius = radius; }
}

// ============================================================ D: THE GROUP LAW ==
{
  const a = seatOf(A.id)!, b = seatOf(B.id)!, c = seatOf(C.id)!;
  w.kill(a.actor);
  await runTicks(host, 3);
  check('D group: a grouped hero\'s lethal down is a DOWN while a mate stands — the seat stays, no runEnd',
    a.actor.downed && !!seatOf(A.id) && !A.heard.some(m => m.t === 'runEnd') && host.vessels.freshFalls === 0);
  w.kill(c.actor);
  await waitFor(() => !seatOf(C.id), host, 10);
  check('D single: the ungrouped hero\'s down ends it at once (card 14 C)', !seatOf(C.id) && C.heard.some(m => m.t === 'runEnd') && host.vessels.freshFalls === 1);
  w.kill(b.actor);
  await waitFor(() => !seatOf(A.id) && !seatOf(B.id), host, 10);
  check('D wipe: the last mate\'s down is THE PARTY WIPE — every downed member falls that tick',
    !seatOf(A.id) && !seatOf(B.id) && A.heard.some(m => m.t === 'runEnd') && B.heard.some(m => m.t === 'runEnd') && host.vessels.freshFalls === 3);
  check('D wipe: the fallen are gone from the desk', !host.parties.partyOf(A.id) && !host.parties.partyOf(B.id));
}

// =============================================================== E: the ledger ==
{
  for (const x of [A, B, C]) x.c.leave();
  await waitFor(() => w.seats.length === 1, host, 60);
  const D = await join('Dorrin'), E = await join('Esme'), F = await join('Fen');
  await runTicks(host, 2);
  const now = (): number => w.time;
  check('E found: an invite founds, an accept joins', host.parties.invite(D.id, E.id, now()) === null && host.parties.accept(E.id, now()) === null
    && host.parties.invite(E.id, F.id, now()) === null && host.parties.accept(F.id, now()) === null && host.parties.partyOf(D.id)?.members.length === 3);
  check('E kick: the leader kicks a member', host.parties.kick(D.id, F.id) === null && !host.parties.partyOf(F.id) && host.parties.partyOf(D.id)?.members.length === 2);
  check('E leave: the leader leaving passes the lead to the eldest member', host.parties.leave(D.id) === null && host.parties.partyOf(E.id) === null && !host.parties.partyOf(D.id),
    'a party of one dissolves');
  check('E found again: the ledger starts clean', host.parties.invite(E.id, D.id, now()) === null && host.parties.accept(D.id, now()) === null
    && host.parties.invite(E.id, F.id, now()) === null && host.parties.accept(F.id, now()) === null && host.parties.partyOf(E.id)?.leader === E.id);
  E.c.leave();
  await waitFor(() => !seatOf(E.id), host, 60);
  check('E gone: a seat gone from the world is gone from its party; the lead passes', !host.parties.partyOf(E.id) && host.parties.partyOf(D.id)?.leader === D.id && host.parties.partyOf(D.id)?.members.length === 2);
  check('E status: the page lists the parties', JSON.stringify((host.status() as { parties: unknown }).parties).includes(D.id));
  D.c.leave(); F.c.leave();
  await waitFor(() => w.seats.length === 1, host, 60);
}

await host.stop();
await new Promise(r => setTimeout(r, 600));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
