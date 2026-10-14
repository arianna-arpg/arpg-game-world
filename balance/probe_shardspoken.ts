// THE SPOKEN QUESTS (shard W12, docs/engine/shard.md "THE SPOKEN QUESTS"): what a hosted hero
// hears, the callings it finds and the ground its quests hold while it is away. The rig pins:
//   Z  THE SOLO DIGEST (first, before any shard host touches a process dial): a seeded solo
//      hero's dialogue at Brandt through every quest and ledger state the authored lines read
//      (fresh, the board, the magic shelf, the hammer sought and ready, the imbue waiting, the
//      hammer returned and remembered, the trophy sought, the speech focus's own admission), a
//      secret vocation site walked (a stranger's silence, the calling heard, the linger's menu
//      request, the menu's cards, the chain taken), a co-op host's second seat standing on the
//      site (never the hero's discovery) and its snapshot rows, and the world save's claim on an
//      event-ground quest, hash to the constant committed BEFORE the spoken quests moved.
//   A  THE GATED LINE PER HEARER: two seats at Brandt, one holding the hammer it took at his own
//      linger: each socket's journal row carries its own held quests (JournalW.sq), the holder's
//      render shell (built on a fresh account) hears the hammer sought through questDialogueView
//      and its speech focus admits it, the other hears the host's shelf line (the shard's own
//      features); a co-op client's shell and the host read the World itself;
//   B  THE LEDGER LINE: a run-scope line follows the seat's own quest keys (never the world's run
//      ledger), an account-scope line reads the seat's gate account (never the shell's own), and
//      both follow their keys away;
//   C  THE KEYS ARE THE DATA'S: the read list equals an independent walk of the dialogue data's
//      conditions by scope, and with every named key held beside a decoy exactly the named keys
//      and features ride.
//   D  THE VOCATION SITES PER SEAT: a secret site at the keeper's own feet is never discovered
//      by the parked body; a Warrior standing on it hears its own silence (its note row) and
//      keeps no key; a Ranger standing on it discovers it into its own ledger (the world's run
//      ledger, the keeper's and the other heroes' untouched) with the account stamp through its
//      own gate and its own note; its linger at the spirit asks its own calling menu
//      (JournalW.voc) on its socket alone; its render shell opens the menu off the row; the pick
//      comes home as its own `vocationQuest` word and lands in its ledger alone; stepping away
//      ends the ask.
//   E  THE OFFLINE HERO'S GROUND: on a shard that writes its world, a vessel holding a quest on
//      event ground (the Unmade's sealed vault) logs out; the desk keeps its ground, the world
//      save keeps the vault and claims it in the ground ledger, a restarted shard keeps it
//      through the transience scrub, and the hero logs back in holding its quest; the quest
//      ended, the ground is released and the vault leaves the save; a copy whose hero has been
//      gone longer than VESSEL_CFG.groundKeptDays releases its ground at its next save.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join as pathJoin } from 'node:path';
import { tmpdir } from 'node:os';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { ShardHost, SHARD_CFG, type ShardSave } from '../server/shardHost';
import { VESSEL_CFG } from '../server/vessel';
import { SHARD_WIRE_CFG } from '../server/shardTransport';
import { WsTransport } from '../src/net/ws';
import type { SessionMsg } from '../src/net/transport';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { BRANDT_CFG, BRANDT_HAMMER_QUEST, BRANDT_TROPHY_QUEST } from '../src/data/brandt';
import { NPC_DIALOGUES } from '../src/data/npcDialogues';
import { VOCATION_CFG, vocationDiscoveryKey } from '../src/data/vocations';
import { QUESTS, ZONE_QUEST_GIVER_IDS } from '../src/quests/defs';
import { FEATURE, ensureAccountId, makeAccount, questDoneKey } from '../src/meta/account';
import { serializeCouchGuest, type CharacterSave } from '../src/meta/character';
import { QUEST_GROUND_LEDGER, type QuestGroundSave } from '../src/engine/questLedger';
import { buildManifest } from '../src/packages/manifest';
import { NullInput } from '../src/net/intent';
import { adoptSnapshot, applyZone, interpolateSnapshot, serializeSnapshot, type StateSnapshot, type ZoneMsg } from '../src/net/snapshot';
import { applyOwnSeatRows } from '../src/net/seatView';
import type { JournalW } from '../src/net/journalWire';
import { questDialogueView, spokenReads } from '../src/net/spokenQuests';
import { Rng } from '../src/core/rng';
import { dist, vec, type Vec2 } from '../src/core/math';
import { World, type Seat } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' : ' + detail : ''}`);
  if (!ok) failed++;
};
const warrior = CLASSES.find(c => c.id === 'warrior')!;
const SITE_VOC = 'greenwarden'; // the Ranger's hidden calling (data/vocations.ts)

// ============================================================ Z: THE SOLO DIGEST ==
/** THE SOLO DIGEST, committed before the spoken quests moved (W12's first commit): any change
 *  to a solo or co-op host's dialogue, site or quest-ground bytes on this walk changes the hash. */
const SOLO_DIGEST = 'b7efae906e1d23c2154c24570f914a366ce7388e91641a3c4f9fe7807f2844a0';

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
const textsOf = (w: World, from: number): unknown => w.texts.slice(from).map(t => [t.text, t.color, t.size]);
/** A free spot in the town at least `clear` px from every quest giver (a site's own linger never
 *  meets another giver's work). */
function quietSpot(w: World, clear: number): Vec2 {
  const givers = w.actors.filter(a => !a.dead && a.defId && ZONE_QUEST_GIVER_IDS.has(a.defId));
  for (const fx of [0.8, 0.2, 0.5, 0.7, 0.3]) for (const fy of [0.75, 0.25, 0.5, 0.65, 0.35]) {
    const p = w.findFreeSpot(vec(w.arena.w * fx, w.arena.h * fy), 14);
    if (givers.every(g => dist(g.pos, p) >= clear)) return p;
  }
  throw new Error('no quiet spot in town');
}

function soloWalk(): { digest: string; trail: string[] } {
  const trail: string[] = [];
  const restore = seedGlobalRandom(0x5b0c3a);
  try {
    const w = makeSimWorld('ranger', 0x5b0c3a);
    const wx = w as unknown as Record<string, any>;
    w.loadZone('crossroads');
    w.loadZone(START_ZONE);
    const hero = w.localSeat;
    hero.actor.level = 12;
    const parts: Record<string, unknown> = {};
    const brandt = w.actors.find(a => !a.dead && a.defId === 'townsfolk_smith');
    if (!brandt) throw new Error('no Brandt in town');
    const park = (s: Seat, at: Vec2, dx = 40): void => {
      const p = w.clampPos(vec(at.x + dx, at.y), s.actor.radius);
      s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0;
    };
    // THE DIALOGUE: Brandt's authored line through every state its conditions read.
    const heard: unknown[] = [];
    const say = (label: string): void => {
      park(hero, brandt.pos);
      const d = w.npcDialogues.dwell(brandt);
      heard.push([label, d?.def.id ?? null, d?.text ?? null, d?.radius ?? null, d?.seconds ?? null]);
      trail.push(`${label}: ${d?.def.id ?? '-'}`);
    };
    say('fresh');
    w.account.features.add(FEATURE.BOUNTY_BOARD); say('board');
    w.account.features.add(BRANDT_CFG.magicWares.flag); say('magic');
    wx.acceptQuest(QUESTS[BRANDT_HAMMER_QUEST]); say('sought');
    const hammer = w.activeQuests.find(q => q.questId === BRANDT_HAMMER_QUEST);
    const collect = QUESTS[BRANDT_HAMMER_QUEST].collect!;
    if (hammer) {
      hammer.fieldDone = true;
      hero.meta.items.push({ uid: 900001, baseId: collect.baseId, name: collect.name, questId: BRANDT_HAMMER_QUEST,
        rarity: 'common', ilvl: 1, tier: 1, baseRoll: 0, affixes: [], implicitRolls: [] });
    }
    say('ready');
    if (hammer) { park(hero, brandt.pos); wx.onQuestZoneCleared(hammer); }
    say('imbue');
    w.questImbues = [];
    say('returned');
    delete w.ledger[questDoneKey(BRANDT_HAMMER_QUEST)];
    say('remembered');
    wx.acceptQuest(QUESTS[BRANDT_TROPHY_QUEST]); say('trophy');
    parts.heard = heard;
    // THE SPEECH FOCUS: the line the renderer's own read admits at Brandt (idle, then dwelt).
    park(hero, brandt.pos);
    hero.lastActedAt = w.time - 1;
    const admitted: unknown[] = [];
    for (let k = 0; k < 12; k++) {
      w.time += 0.1;
      for (const l of w.npcSpeechView(true)) if (l.a === brandt) admitted.push([k, l.text, l.color, l.seatId]);
    }
    parts.admitted = admitted;
    trail.push(`focus: ${admitted.length} admitted lines at Brandt (first at frame ${(admitted[0] as unknown[] | undefined)?.[0] ?? '-'})`);
    parts.quests0 = canon({ active: w.activeQuests, done: [...w.completedQuests].sort(), keys: w.ledger, acct: w.account.ledger });
    // THE SECRET SITE: the Ranger's heartwood, forced onto a quiet stretch of town.
    hero.actor.level = 28;
    const siteAt = quietSpot(w, 320);
    parts.siteSpawn = wx.spawnVocationSite(SITE_VOC, siteAt, new Rng(0x51e7));
    const site = (wx.vocationSites as { vocId: string; npc: { pos: Vec2 } }[]).find(s => s.vocId === SITE_VOC);
    if (!site) throw new Error('no site');
    const ranger = hero.meta.classDef;
    // A stranger first: the hero wears the Warrior's class for one sweep (the calling is the Ranger's).
    hero.meta.classDef = warrior;
    park(hero, site.npc.pos, 60);
    let t0 = w.texts.length;
    wx.updateVocationSites();
    parts.stranger = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0) });
    hero.meta.classDef = ranger;
    t0 = w.texts.length;
    wx.updateVocationSites();
    parts.found = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0), acct: w.account.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0 });
    trail.push(`site: stranger ${JSON.stringify(parts.stranger)}, found ${JSON.stringify(parts.found)}`.slice(0, 300));
    // The linger at the spirit asks the calling menu (once), its cards, and the chain taken.
    hero.lastActedAt = w.time - 1;
    let asked = -1;
    for (let k = 0; k < 30 && asked < 0; k++) {
      w.time += 0.1;
      wx.updateQuestGiver(0.1);
      if (w.vocationOfferRequested) asked = k;
    }
    w.vocationOfferRequested = false;
    const offers = w.vocationMenuOffers();
    parts.menu = canon({ asked, offers });
    parts.taken = offers[0] ? w.acceptVocationQuest(offers[0].questId) : null;
    parts.quests1 = canon({ active: w.activeQuests.map(q => q.questId), keys: w.ledger });
    trail.push(`menu: asked at ${asked}, ${offers.map(o => o.questId).join(',')}; taken ${parts.taken}`);
    // THE CO-OP HOST: a second seat standing on the site discovers nothing (the hero's walk is the
    // run's), and the host's snapshot carries no journal row.
    const guest = w.addSeat('p1', warrior, new NullInput(), { startingCompanions: false, startingFlasks: false });
    delete w.ledger[vocationDiscoveryKey(SITE_VOC)];
    park(hero, brandt.pos);
    park(guest, site.npc.pos, -60);
    t0 = w.texts.length;
    wx.updateVocationSites();
    parts.guest = canon({ key: w.ledger[vocationDiscoveryKey(SITE_VOC)] ?? 0, texts: textsOf(w, t0) });
    const snap = serializeSnapshot(w, 1);
    parts.wire = canon(Object.values(snap.seats).map(r => r.jn ?? null));
    trail.push(`guest: ${JSON.stringify(parts.guest)}, wire rows ${JSON.stringify(parts.wire)}`);
    // THE WORLD SAVE: an event-ground quest (the Unmade's sealed vault) held by the hero is claimed.
    hero.actor.level = 20;
    wx.acceptQuest(QUESTS.unmade_l20);
    const ws = w.serializeWorldState();
    const vault = w.activeQuests.find(q => q.questId === 'unmade_l20')?.zoneId ?? null;
    parts.save = canon({
      overlays: Object.keys(ws.overlays ?? {}).sort(), quests: ws.quests,
      eventGround: ws.zones.filter(z => z.eventOwned).map(z => z.id).sort(), vault,
      vaultKept: !!vault && ws.zones.some(z => z.id === vault),
    });
    trail.push(`save: vault ${vault} kept ${(parts.save as { vaultKept: boolean }).vaultKept}, overlays ${(parts.save as { overlays: string[] }).overlays.join(',')}`);
    const digest = createHash('sha256').update(JSON.stringify(parts)).digest('hex');
    return { digest, trail };
  } finally { restore(); }
}

{
  const { digest, trail } = soloWalk();
  for (const line of trail) console.log(`INFO  Z ${line}`);
  check('Z solo: THE SOLO DIGEST of the seeded solo dialogue-and-site walk (and the co-op host\'s second seat) equals the constant committed before the spoken quests moved',
    digest === SOLO_DIGEST, `digest ${digest}`);
}

// ================================================================= THE SHARD ==
// A classic shard (open account, ephemeral) with clients over the real wire and render shells
// built on FRESH accounts (a shell must read its seat's rows, never its own account).
const restoreShardRandom = seedGlobalRandom(0x5b0c3);
SHARD_WIRE_CFG.maxPerIp = Number.POSITIVE_INFINITY; // every client of this rig arrives from one address
const host = new ShardHost({ seed: 0x5b0c3a7, saveDir: null, open: true, log: () => {} });
await host.ready();
const port = await host.listen(0, '127.0.0.1');
const url = `ws://127.0.0.1:${port}`;
const w = host.world;
const wx = w as unknown as Record<string, any>; // the rig's hands on private verbs (a site's spawn, a quest's accept)
const DT = 1 / SHARD_CFG.tickHz;
const sec = (s: number): number => Math.ceil(s * SHARD_CFG.tickHz);
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
async function runTicks(n: number): Promise<void> { for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); } }
async function waitFor(cond: () => boolean, maxTicks: number): Promise<boolean> {
  for (let i = 0; i < maxTicks; i++) { if (cond()) return true; host.tick(DT); await yieldIO(); }
  return cond();
}
interface Client { c: WsTransport; id: string; heard: SessionMsg[]; snaps: StateSnapshot[]; zones: ZoneMsg[] }
async function join(name: string, classId = 'warrior'): Promise<Client> {
  const c = new WsTransport();
  const cl: Client = { c, id: '', heard: [], snaps: [], zones: [] };
  c.onSession(m => { cl.heard.push(m); });
  c.onState(s => { cl.snaps.push(s); });
  c.onZone(z => { cl.zones.push(z); });
  const welcome = await c.connect(url, { name, classId });
  cl.id = welcome.self;
  await waitFor(() => !!host.units.seatOf(cl.id) && cl.zones.length > 0 && cl.snaps.length > 0, 120);
  return cl;
}
const seatOf = (id: string): Seat => host.units.seatOf(id)!;
const ledgerOf = (s: Seat) => w.questLedgerOf(s);
const hearth = host.hearthSeat();
const toHearth = (s: Seat, dx = 0): void => { const p = w.clampPos(vec(hearth.x + dx, hearth.y), s.actor.radius); s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0; };
/** Stand a seat where `pred` holds, searching rings about `center`. */
function standAt(s: Seat, center: Vec2, pred: () => boolean): boolean {
  for (const r of [20, 40, 60, 80, 100, 120, 140]) {
    for (let k = 0; k < 16; k++) {
      const ang = (k / 16) * Math.PI * 2;
      const p = w.clampPos(vec(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r), s.actor.radius);
      s.actor.pos.x = p.x; s.actor.pos.y = p.y; s.actor.tier = 0;
      if (pred()) return true;
    }
  }
  return false;
}
const jnOf = (cl: Client): JournalW | undefined => [...cl.snaps].reverse().find(s => s.seats[cl.id]?.jn)?.seats[cl.id]?.jn;
/** A render shell, as main.ts startAsClient builds one, on a FRESH account. */
const adoptedUpTo = new WeakMap<World, number>();
function makeShell(cl: Client): World {
  const acct = makeAccount();
  const shell = new World(acct, Object.freeze(buildManifest(acct, w.manifest.seed)));
  shell.clientActionHook = action => { cl.c.sendSession({ t: 'action', action }); };
  shell.clientSeatId = cl.id;
  shell.createPlayer(CLASSES.find(c => c.id === seatOf(cl.id).meta.classDef.id) ?? warrior, { startingCompanions: false, startingFlasks: false });
  applyZone(shell, cl.zones.at(-1)!);
  adoptedUpTo.set(shell, 0);
  return shell;
}
/** One client frame (THE SMOOTH SHELL's way): every snapshot since the last frame adopted once
 *  (the journal row with it), the newest placed, the own rows, the shell's own lingers. */
function shellFrame(shell: World, cl: Client): void {
  let i = adoptedUpTo.get(shell) ?? 0;
  for (; i < cl.snaps.length; i++) adoptSnapshot(shell, cl.snaps[i], cl.snaps[i - 1] ?? null);
  adoptedUpTo.set(shell, i);
  const s = cl.snaps.at(-1);
  if (s) { interpolateSnapshot(shell, cl.snaps.at(-2) ?? null, s); applyOwnSeatRows(shell, s); }
  shell.updateClientCounters(DT);
}
async function frames(n: number, shells: [World, Client][]): Promise<void> {
  for (let i = 0; i < n; i++) { host.tick(DT); await yieldIO(); for (const [sh, cl] of shells) shellFrame(sh, cl); }
}
/** What a shell's dialogue picks at a speaker of `defId` (the director's own dwell read). */
function heardAt(shell: World, defId: string): string | null {
  const a = shell.actors.find(x => !x.dead && x.defId === defId);
  return a ? shell.npcDialogues.dwell(a)?.def.id ?? null : null;
}
const SMITH = 'townsfolk_smith';
const smith = w.actors.find(a => !a.dead && a.defId === SMITH)!;
/** At Brandt's counter and his giver reach, out of every other giver's (the linger takes his work alone). */
const atBrandt = (s: Seat): boolean => w.withQuestHand(s, () => wx.giverPresent(SMITH) !== null && wx.giverPresent('townsfolk_questgiver') === null);

const A = await join('Aster'), B = await join('Bryn');
const sA = seatOf(A.id), sB = seatOf(B.id);
await runTicks(sec(0.5));

// ============================================== A: THE GATED LINE PER HEARER ==
const shA = makeShell(A), shB = makeShell(B);
{
  w.seatHero(sA).level = 12; // past Brandt's rolled offer level (9 to 12)
  toHearth(sB, 80);
  check('A giver: A stands at Brandt, out of the quartermaster\'s reach', standAt(sA, smith.pos, () => atBrandt(sA)));
  const took = await waitFor(() => ledgerOf(sA).active.some(q => q.questId === BRANDT_HAMMER_QUEST), sec(4));
  check('A giver: A\'s own linger at Brandt takes the hammer into A\'s own ledger (B\'s and the keeper\'s hold none)',
    took && !ledgerOf(sB).active.some(q => q.questId === BRANDT_HAMMER_QUEST) && !w.ownQuestLedger.active.some(q => q.questId === BRANDT_HAMMER_QUEST),
    `A ${ledgerOf(sA).active.map(q => q.questId).join(',')}`);
  // Both heroes walk back to Brandt (B, at level 1, is offered nothing there).
  standAt(sB, smith.pos, () => atBrandt(sB) && dist(sA.actor.pos, sB.actor.pos) > 30);
  await frames(sec(1.5), [[shA, A], [shB, B]]);
  const rowA = jnOf(A)?.sq, rowB = jnOf(B)?.sq;
  check('A row: each socket\'s journal carries its own held quests (A\'s the hammer, B\'s none of it)',
    !!rowA?.q.some(q => q.id === BRANDT_HAMMER_QUEST) && !!rowB && !rowB.q.some(q => q.id === BRANDT_HAMMER_QUEST),
    `A ${JSON.stringify(rowA?.q)}; B ${JSON.stringify(rowB?.q)}`);
  const hearA = heardAt(shA, SMITH), hearB = heardAt(shB, SMITH);
  check('A heard: two hearers at one giver: A\'s shell hears the hammer sought, B\'s shell does not',
    hearA === 'brandt_hammer_sought' && hearB !== null && hearB !== 'brandt_hammer_sought', `A ${hearA}, B ${hearB}`);
  check('A heard: B hears the host\'s own shelf (the shard\'s magic wares, a feature its fresh account never owned)',
    hearB === 'brandt_magic_stock' && !shB.account.features.has(BRANDT_CFG.magicWares.flag), `B ${hearB}`);
  // The renderer's own read: the speech focus admits the gated line at A's counter alone.
  const sought = NPC_DIALOGUES.find(d => d.id === 'brandt_hammer_sought')!.lines[0].text;
  const said = (shell: World): string[] => shell.npcSpeechView(true).map(l => l.text);
  let focusA: string[] = [], focusB: string[] = [];
  for (let k = 0; k < sec(1.2); k++) {
    await frames(1, [[shA, A], [shB, B]]);
    focusA = focusA.concat(said(shA)); focusB = focusB.concat(said(shB));
  }
  check('A focus: the speech focus admits the gated line on A\'s shell and never on B\'s',
    focusA.includes(sought) && !focusB.includes(sought), `A ${focusA.length} lines, B ${focusB.length} lines`);
  // THE SOLO INVARIANT on the client side: a shell whose zone message shipped no counters (a co-op
  // client's) reads its own World, and so does the host.
  const coop = makeShell(A);
  const bare = { ...A.zones.at(-1)! };
  delete bare.anchors; delete bare.fonts; delete bare.counters;
  applyZone(coop, bare);
  check('A solo: a co-op client\'s shell (no counters shipped) and a host read the World itself',
    questDialogueView(coop, coop.clientSeatId) === coop && questDialogueView(w, A.id) === w && questDialogueView(shA, 'p9') === shA);
}

// ============================================== B: THE LEDGER LINE PER HEARER ==
{
  const done = questDoneKey(BRANDT_HAMMER_QUEST);
  w.withQuestHand(sA, () => w.questStamp(done)); // A's own quest key (THE CHARACTER'S QUESTS), as its turn-in stamps it
  w.journalDirty.add(sA.id);
  await frames(sec(1.5), [[shA, A], [shB, B]]);
  const hearA = heardAt(shA, SMITH), hearB = heardAt(shB, SMITH);
  check('B run: a run-ledger line follows the seat\'s own ledger (A hears the hammer returned, B still its shelf; the world\'s run ledger holds no such key)',
    hearA === 'brandt_hammer_returned' && hearB === 'brandt_magic_stock' && !w.ledger[done] && !shA.ledger[done],
    `A ${hearA}, B ${hearB}, A row r ${JSON.stringify(jnOf(A)?.sq.r)}`);
  w.account.ledger[done] = 1; // THE SEAT'S GATE: the account a hosted hero's account-scope lines read (the shard's today)
  for (const s of [sA, sB]) w.journalDirty.add(s.id);
  await frames(sec(1.5), [[shA, A], [shB, B]]);
  const accA = heardAt(shA, SMITH), accB = heardAt(shB, SMITH);
  check('B account: an account-scope line reads the seat\'s gate account (B hears the hammer remembered off the host\'s account, never its shell\'s own fresh one)',
    accB === 'brandt_hammer_remembered' && accA === 'brandt_hammer_returned' && !shB.account.ledger[done], `A ${accA}, B ${accB}`);
  delete w.account.ledger[done];
  delete ledgerOf(sA).keys[done];
  for (const s of [sA, sB]) w.journalDirty.add(s.id);
  await frames(sec(1), [[shA, A], [shB, B]]);
  check('B clear: and the lines follow the keys away again', heardAt(shA, SMITH) === 'brandt_hammer_sought' && heardAt(shB, SMITH) === 'brandt_magic_stock',
    `A ${heardAt(shA, SMITH)}, B ${heardAt(shB, SMITH)}`);
}

// ============================================== C: THE KEYS ARE THE DATA'S ==
{
  // An independent walk of the authored data: every condition's key, by the scope it reads.
  const run = new Set<string>(), acct = new Set<string>(), feats = new Set<string>();
  for (const d of NPC_DIALOGUES) for (const c of [...(d.all ?? []), ...(d.any ?? []), ...(d.none ?? [])]) {
    const x = c as { ledger?: string; scope?: string; feature?: string };
    if (x.ledger !== undefined) { if (x.scope !== 'account') run.add(x.ledger); if (x.scope !== 'run') acct.add(x.ledger); }
    if (x.feature !== undefined) feats.add(x.feature);
  }
  const reads = spokenReads();
  const same = (a: readonly string[], b: Set<string>): boolean => a.length === b.size && a.every(k => b.has(k));
  check('C derive: the read list is the dialogue data\'s own (run keys, account keys and features, derived at boot)',
    same(reads.run, run) && same(reads.account, acct) && same(reads.features, feats) && reads.run.length > 0 && reads.account.length > 0,
    `run [${reads.run}], account [${reads.account}], features [${reads.features}]`);
  // Every named key held, and a decoy beside them: exactly the named keys ride.
  const DECOY = 'w12_decoy_key';
  w.withQuestHand(sA, () => { for (const k of [...reads.run, DECOY]) w.questStamp(k, 2); });
  const was = { ...w.account.ledger };
  for (const k of [...reads.account, DECOY]) w.account.ledger[k] = 3;
  w.journalDirty.add(sA.id);
  await frames(sec(1), [[shA, A]]);
  const sq = jnOf(A)?.sq;
  check('C ship: the run view ships exactly the named run keys (the decoy never rides)',
    !!sq?.r && same(Object.keys(sq.r).sort(), run) && !(DECOY in sq.r), `r ${JSON.stringify(sq?.r)}`);
  check('C ship: the account view ships exactly the named account keys, the features exactly the named ones the gate owns',
    !!sq?.a && same(Object.keys(sq.a).sort(), acct) && !(DECOY in sq.a) && same(sq.ft ?? [], feats) && sq.lv === undefined,
    `a ${JSON.stringify(sq?.a)}, ft ${JSON.stringify(sq?.ft)}`);
  check('C ship: no other ledger key rides the journal anywhere', !JSON.stringify(jnOf(A)).includes(DECOY));
  for (const k of [...reads.run, DECOY]) delete ledgerOf(sA).keys[k];
  w.account.ledger = was;
  w.journalDirty.add(sA.id);
  await frames(sec(1), [[shA, A]]);
}

// ============================================== D: THE VOCATION SITES PER SEAT ==
{
  const KEY = vocationDiscoveryKey(SITE_VOC);
  const STRANGER = 'It does not stir for you.';
  const R = await join('Rowan', 'ranger');
  const sR = seatOf(R.id);
  w.seatHero(sR).level = 28; // the Greenwarden's own offer level
  const keeper = host.keeper;
  // The heartwood stands at the keeper's own feet first, every player seat far from it.
  standAt(sR, smith.pos, () => atBrandt(sR) || dist(sR.actor.pos, smith.pos) > 60);
  wx.spawnVocationSite(SITE_VOC, vec(keeper.actor.pos.x + 30, keeper.actor.pos.y), new Rng(0x51e7));
  const site = (wx.vocationSites as { vocId: string; npc: { pos: Vec2 } }[]).find(s => s.vocId === SITE_VOC)!;
  const far = (s: Seat): boolean => dist(s.actor.pos, site.npc.pos) > VOCATION_CFG.discoveryRadius + 50;
  await runTicks(sec(1));
  check('D keeper: the keeper\'s parked body never discovers a site at its feet (no key in the world\'s run ledger, the keeper\'s own or any hero\'s)',
    !!site && dist(keeper.actor.pos, site.npc.pos) <= VOCATION_CFG.discoveryRadius && [sA, sB, sR].every(far)
      && !w.ledger[KEY] && !w.ownQuestLedger.keys[KEY] && [sA, sB, sR].every(s => !ledgerOf(s).keys[KEY]) && !w.account.ledger[KEY],
    `keeper ${dist(keeper.actor.pos, site.npc.pos).toFixed(0)} px from the site`);
  // The site moves to a quiet stretch of town (no other giver's work in reach).
  const spot = quietSpot(w, 320);
  site.npc.pos.x = spot.x; site.npc.pos.y = spot.y;
  // A stranger first: the Warrior hears nothing and the silence is its own row.
  check('D stranger: B (a Warrior) stands by the heartwood', standAt(sB, site.npc.pos, () => dist(sB.actor.pos, site.npc.pos) <= 90));
  await runTicks(sec(1));
  const noteB = [...B.snaps].reverse().find(s => s.seats[B.id]?.fn)?.seats[B.id]?.fn?.text;
  check('D stranger: a seat the calling is not for hears its own silence (its own note row) and keeps no key',
    noteB === STRANGER && !ledgerOf(sB).keys[KEY] && ![...A.snaps, ...R.snaps].some(s => s.seats[A.id]?.fn?.text === STRANGER || s.seats[R.id]?.fn?.text === STRANGER),
    `B note ${noteB}`);
  toHearth(sB, 80);
  // The Ranger finds it: its own ledger, never the keeper's or another hero's.
  check('D found: R (a Ranger) stands by the heartwood', standAt(sR, site.npc.pos, () => dist(sR.actor.pos, site.npc.pos) <= 90
    && w.withQuestHand(sR, () => w.nearAnyQuestGiver())));
  const found = await waitFor(() => (ledgerOf(sR).keys[KEY] ?? 0) >= 1, sec(1));
  check('D found: a hosted seat standing on the site discovers it into its own ledger (the world\'s run ledger, the keeper\'s and B\'s untouched)',
    found && !w.ledger[KEY] && !w.ownQuestLedger.keys[KEY] && !ledgerOf(sB).keys[KEY] && !ledgerOf(sA).keys[KEY],
    `R keys ${JSON.stringify(ledgerOf(sR).keys)}`);
  check('D found: the account stamp its run\'s end would have paid lands through its own gate (World.gateAccountOf: the shard\'s account today)',
    (w.gateAccountOf(sR).ledger[KEY] ?? 0) >= 1);
  await runTicks(3);
  const noteR = [...R.snaps].reverse().find(s => s.seats[R.id]?.fn)?.seats[R.id]?.fn?.text;
  check('D found: the discovery speaks on its own seat\'s note row', !!noteR && noteR !== STRANGER, `R note ${noteR}`);
  // The linger at the spirit: the calling menu's row reaches R's socket alone.
  const asked = await waitFor(() => !!jnOf(R)?.voc?.offers.some(o => o.vocationId === SITE_VOC), sec(4));
  const voc = jnOf(R)?.voc;
  check('D menu: R\'s linger at the spirit asks R\'s own calling menu (JournalW.voc, the Greenwarden on offer, its own class)',
    asked && !!voc?.offers.some(o => o.vocationId === SITE_VOC && o.ownClass && o.secret) && !w.vocationOfferRequested,
    `voc ${JSON.stringify(voc)?.slice(0, 160)}`);
  check('D menu: the menu row reaches R\'s socket alone (no other socket ever hears R\'s journal, B\'s own never carries a calling)',
    ![...A.snaps, ...B.snaps].some(s => s.seats[R.id]?.jn) && ![...A.snaps, ...B.snaps, ...R.snaps].some(s => s.seats[B.id]?.jn?.voc));
  // R's render shell opens the menu off the row, and the pick is R's own word.
  const shR = makeShell(R);
  await frames(2, [[shR, R]]);
  const cards = shR.vocationMenuOffers();
  check('D shell: R\'s shell opens the calling menu off its row (the solo dwell\'s own request) with the host\'s cards',
    shR.vocationOfferRequested && cards.some(o => o.vocationId === SITE_VOC && o.ownClass), `cards ${cards.map(o => o.questId).join(',')}`);
  const step = cards.find(o => o.vocationId === SITE_VOC)!.questId;
  shR.requestMeta({ t: 'vocationQuest', questId: step });
  const took = await waitFor(() => ledgerOf(sR).active.some(q => q.questId === step), sec(2));
  check('D choice: the pick comes home as R\'s own word and the host applies it to R (B\'s and the keeper\'s ledgers hold none of it)',
    took && !ledgerOf(sB).active.some(q => q.questId === step) && !ledgerOf(sA).active.some(q => q.questId === step)
      && !w.ownQuestLedger.active.some(q => q.questId === step), `R ${ledgerOf(sR).active.map(q => q.questId).filter(id => id.startsWith('voc_')).join(',')}`);
  toHearth(sR, -80);
  await runTicks(sec(0.5));
  check('D visit: stepping away ends the ask (the row\'s calling rests)', !jnOf(R)?.voc);
}

await host.stop();
restoreShardRandom();

// ============================================== E: THE OFFLINE HERO'S GROUND ==
// A classic shard that writes its world: a vessel holds a quest on event ground (the Unmade's
// sealed vault, a special arena), logs out, the shard saves and restarts.
{
  const restoreGroundRandom = seedGlobalRandom(0x6e0d);
  const SEED = 0x5e7e5e7, CHAR = 'c-probe-vesper', QID = 'unmade_l20';
  const dir = mkdtempSync(pathJoin(tmpdir(), 'hw-spoken-')), dir2 = mkdtempSync(pathJoin(tmpdir(), 'hw-spoken-aged-'));
  const tickH = async (h: ShardHost, cond: () => boolean, maxTicks: number): Promise<boolean> => {
    for (let i = 0; i < maxTicks; i++) { if (cond()) return true; h.tick(DT); await yieldIO(); }
    return cond();
  };
  const joinTo = async (h: ShardHost, port: number, name: string, accountId: string, vessel: CharacterSave): Promise<Client> => {
    const c = new WsTransport();
    const cl: Client = { c, id: '', heard: [], snaps: [], zones: [] };
    c.onSession(m => { cl.heard.push(m); });
    c.onState(s => { cl.snaps.push(s); });
    c.onZone(z => { cl.zones.push(z); });
    const welcome = await c.connect(`ws://127.0.0.1:${port}`, { name, classId: 'warrior', accountId }, vessel);
    cl.id = welcome.self;
    await tickH(h, () => !!h.units.seatOf(cl.id) && cl.snaps.length > 0, 120);
    return cl;
  };
  const savedOf = (h: ShardHost): ShardSave => JSON.parse(readFileSync(h.savePath!, 'utf-8')) as ShardSave;
  const ledgerIn = (s: ShardSave): QuestGroundSave | undefined => s.world.overlays?.[QUEST_GROUND_LEDGER] as QuestGroundSave | undefined;
  try {
    const h1 = new ShardHost({ seed: SEED, saveDir: dir, open: true, log: () => {} });
    await h1.ready();
    const port1 = await h1.listen(0, '127.0.0.1');
    const w1 = h1.world;
    const acct = makeAccount(); ensureAccountId(acct);
    // The vessel: forged on a scratch seat in the couch guest's shape, as the wire carries it.
    const forge = w1.addSeat('forge', warrior, new NullInput(), { startingCompanions: false, startingFlasks: false });
    w1.seatHero(forge).level = 20;
    forge.meta.name = 'Vesper'; forge.meta.charId = CHAR;
    const vessel = JSON.parse(JSON.stringify(serializeCouchGuest(w1, forge, {}))) as CharacterSave;
    w1.removeSeat('forge');
    vessel.ledger = { mireille_flasks_given: 1 };
    const V = await joinTo(h1, port1, 'Vesper', acct.accountId, vessel);
    const sV = h1.units.seatOf(V.id)!;
    w1.withQuestHand(sV, () => (w1 as unknown as Record<string, any>).acceptQuest(QUESTS[QID]));
    const vault = w1.questLedgerOf(sV).active.find(q => q.questId === QID)?.zoneId ?? '';
    check('E held: the hero takes a quest on event ground (the Unmade\'s sealed vault, a special arena)',
      !!vault && !!w1.zoneMap[vault]?.eventOwned, `vault ${vault}`);
    // Its mirror home, then it logs out on its feet.
    const n0 = V.heard.length;
    h1.vessels.mirror(V.id);
    await tickH(h1, () => V.heard.slice(n0).some(m => m.t === 'heroSave'), 120);
    const home = (V.heard.slice(n0).find(m => m.t === 'heroSave') as { save: CharacterSave } | undefined)?.save;
    V.c.leave();
    await tickH(h1, () => !h1.units.seatOf(V.id), 240);
    check('E away: the desk keeps the absent hero\'s ground (its vault, noted at its leave)',
      !h1.units.seatOf(V.id) && !!h1.vessels.heldGround(acct.accountId, CHAR)?.zones.includes(vault));
    h1.persist();
    const save1 = savedOf(h1), led1 = ledgerIn(save1);
    check('E save: the world save keeps the absent hero\'s vault and claims it in the ground ledger (THE ZONE-CLAIM CONVENTION)',
      save1.world.zones.some(z => z.id === vault) && !!led1?.ownedZones.includes(vault)
        && !!led1?.heroes[`${acct.accountId}:${CHAR}`]?.zones.includes(vault),
      `owned ${JSON.stringify(led1?.ownedZones)}`);
    await h1.stop({ persist: false });
    // A copy of that save, its hero gone longer than the dial (the expiry lane, below).
    const aged = JSON.parse(JSON.stringify(save1)) as ShardSave;
    const agedRow = ledgerIn(aged)!.heroes[`${acct.accountId}:${CHAR}`];
    agedRow.at = Date.now() - (VESSEL_CFG.groundKeptDays + 1) * 86_400_000;
    writeFileSync(pathJoin(dir2, basename(h1.savePath!)), JSON.stringify(aged));
    // THE RESUME: the vault survives the transience scrub, and the hero comes back holding its quest.
    const h2 = new ShardHost({ seed: SEED, saveDir: dir, open: true, log: () => {} });
    await h2.ready();
    check('E resume: a restarted shard keeps the absent hero\'s vault through the scrub, and its desk the hero\'s ground',
      !!h2.world.zoneMap[vault]?.eventOwned && !!h2.vessels.heldGround(acct.accountId, CHAR)?.zones.includes(vault));
    const port2 = await h2.listen(0, '127.0.0.1');
    const V2 = await joinTo(h2, port2, 'Vesper', acct.accountId, JSON.parse(JSON.stringify(home)) as CharacterSave);
    const sV2 = h2.units.seatOf(V2.id)!;
    const back = h2.world.questLedgerOf(sV2).active.find(q => q.questId === QID);
    check('E return: the hero logs back in holding its quest (its graft finds the vault standing)',
      !!home && !!back && back.zoneId === vault, `active ${h2.world.questLedgerOf(sV2).active.map(q => q.questId).filter(id => !id.startsWith('odyssey_') && !id.startsWith('revenge_')).join(',')}`);
    // The quest ends: its ground is released.
    if (back) {
      back.fieldDone = true;
      h2.world.withQuestHand(sV2, () => (h2.world as unknown as Record<string, any>).onQuestZoneCleared(back));
    }
    h2.vessels.mirror(V2.id);
    h2.persist();
    const save2 = savedOf(h2);
    check('E released: the quest ended, its ground is released (no hero holds it, no claim, the vault left the save)',
      h2.world.questLedgerOf(sV2).completed.has(QID) && !h2.vessels.heldGround(acct.accountId, CHAR)
        && !(ledgerIn(save2)?.ownedZones ?? []).includes(vault) && !save2.world.zones.some(z => z.id === vault));
    V2.c.leave();
    await tickH(h2, () => !h2.units.seatOf(V2.id), 240);
    await h2.stop({ persist: false });
    // THE EXPIRY: the aged copy resumes (its claim read by the scrub), and the next save releases it.
    const h3 = new ShardHost({ seed: SEED, saveDir: dir2, open: true, log: () => {} });
    await h3.ready();
    const stood = !!h3.world.zoneMap[vault];
    h3.persist();
    const save3 = savedOf(h3);
    check('E aged: a hero gone longer than VESSEL_CFG.groundKeptDays releases its ground at the next save (the vault left it)',
      stood && !ledgerIn(save3) && !save3.world.zones.some(z => z.id === vault) && !h3.vessels.heldGround(acct.accountId, CHAR));
    await h3.stop({ persist: false });
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(dir2, { recursive: true, force: true });
    restoreGroundRandom();
  }
}

console.log(failed ? `\n${failed} FAIL` : '\nALL PASS');
process.exit(failed ? 1 : 0);
