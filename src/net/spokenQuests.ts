// ---------------------------------------------------------------------------
// THE SPOKEN QUESTS (shard W12; docs/engine/shard.md "THE SPOKEN QUESTS"): what a
// hosted hero's NPC dialogue reads. The authored lines (data/npcDialogues.ts) gate
// on the hearer's quests, its run ledger and its account; a render shell holds none
// of that for its own seat (the host owns every quest), so the seat's JOURNAL ROW
// (SeatW.jn, THE OWN ENTRY) carries exactly what the conditions read:
//
//   spokenReads       the run-ledger keys, account-ledger keys, features and the
//                     account level the dialogue data's conditions name: derived
//                     from the data at its first read (boot), never a hand list.
//   spokenRowOf       the host's half (JournalW.sq, read inside THE QUEST HAND's
//                     scope): the seat's held quests with their standing and field
//                     leg, the run view of the named keys (the world's run ledger
//                     under the seat's own quest keys, World.questRunLedger), the
//                     account view and the named features through THE SEAT'S GATE
//                     (World.gateAccountOf: the shard's account today, the seat's
//                     own once M2 re-points the one line).
//   questDialogueView THE ONE RESOLVER the dialogue conditions read through: on a
//                     hosted world's shell, for its own seat, the shell's World with
//                     the seat's rows standing in for the quest state, the named
//                     keys and the named features; everywhere else the World itself
//                     (THE SOLO INVARIANT: solo, the co-op host and a co-op client
//                     read exactly what they read).
//   spokenDialogueHost the World's own dialogue director's host (World.npcDialogues):
//                     each read resolves through questDialogueView at the moment it is
//                     made, so the director (engine/npcDialogues.ts, pinned verbatim
//                     by the foundation's native resident probe) never changes.
//
// NPC_APPEARANCES never ride: an NPC's look is one body every hearer sees, the
// host's to resolve and ship on the actor. A key no condition names never rides.
// ---------------------------------------------------------------------------

import { NPC_DIALOGUES, type DialogueCondition, type NpcDialogueDef } from '../data/npcDialogues';
import type { NativeNpcDialogueHost } from '../engine/nativeNpcDialogueHost';
import type { Seat, World } from '../engine/world';
import type { NativeSnapshotHost } from './nativeSnapshotHost';
import type { QuestStanding } from '../quests/types';
import type { SavedQuestEntry } from '../meta/worldstate';
import type { QuestImbue } from '../engine/questImbue';
import type { JournalW } from './journalWire';

/** What the dialogue conditions read, by kind (sorted, unique). */
export interface SpokenReads {
  /** Ledger keys a condition reads in the run ledger (scope 'run' or 'either'). */
  run: readonly string[];
  /** Ledger keys a condition reads in the account ledger (scope 'account' or 'either'). */
  account: readonly string[];
  /** Account features a condition reads. */
  features: readonly string[];
  /** Does any condition read the account level? */
  level: boolean;
}

/** The reads of a set of dialogue definitions: every condition of `all`, `any` and `none`,
 *  classified exactly as dialogueConditionMet classifies it. */
export function spokenReadsOf(defs: readonly NpcDialogueDef[]): SpokenReads {
  const run = new Set<string>(), account = new Set<string>(), features = new Set<string>();
  let level = false;
  const read = (c: DialogueCondition): void => {
    if ('quest' in c || 'fact' in c) return; // the held quests ride whole; a fact is code over the view
    if ('feature' in c) { features.add(c.feature); return; }
    if ('accountLevel' in c) { level = true; return; }
    if (c.scope !== 'account') run.add(c.ledger);
    if (c.scope !== 'run') account.add(c.ledger);
  };
  for (const d of defs) for (const c of [...(d.all ?? []), ...(d.any ?? []), ...(d.none ?? [])]) read(c);
  return { run: [...run].sort(), account: [...account].sort(), features: [...features].sort(), level };
}

let READS: SpokenReads | null = null;
/** THE SPOKEN QUESTS' read list: the authored dialogue's own, derived once at its first use. */
export function spokenReads(): SpokenReads {
  return READS ??= spokenReadsOf(NPC_DIALOGUES);
}

/** One held quest as the dialogue reads it: its id, its standing (absent = afield) and its
 *  field leg (absent = not done). */
export interface SpokenQuestW { id: string; s?: Exclude<QuestStanding, 'afield'>; f?: 1 }

/** THE SPOKEN QUESTS row (JournalW.sq): what the seat's dialogue conditions read. */
export interface SpokenW {
  /** The seat's held quests (World.activeQuests under its hand). */
  q: SpokenQuestW[];
  /** The run view of the named keys (absent = 0). */
  r?: Record<string, number>;
  /** The account view of the named keys, THE SEAT'S GATE's (absent = 0). */
  a?: Record<string, number>;
  /** The named features the seat's gate account owns. */
  ft?: string[];
  /** The gate account's level, while a condition reads one. */
  lv?: number;
}

/** The host's half: the seat's row, judged inside THE QUEST HAND's scope (journalViewOf). */
// THE HEARER'S ROW reads the narrowed snapshot host (W12 over the foundation's exact serializer capabilities).
export function spokenRowOf(world: NativeSnapshotHost, seat: Seat): SpokenW {
  const reads = spokenReads();
  const run = world.questRunLedger(), gate = world.gateAccountOf(seat);
  const pick = (keys: readonly string[], ledger: Readonly<Record<string, number>>): Record<string, number> | undefined => {
    let out: Record<string, number> | undefined;
    for (const k of keys) { const n = ledger[k] ?? 0; if (n) (out ??= {})[k] = n; }
    return out;
  };
  const r = pick(reads.run, run), a = pick(reads.account, gate.ledger);
  const ft = reads.features.filter(f => gate.features.has(f));
  return {
    q: world.activeQuests.map(e => {
      const s = world.questStanding(e);
      return { id: e.questId, ...(s !== 'afield' ? { s } : {}), ...(e.fieldDone ? { f: 1 as const } : {}) };
    }),
    ...(r ? { r } : {}), ...(a ? { a } : {}), ...(ft.length ? { ft } : {}),
    ...(reads.level ? { lv: gate.level } : {}),
  };
}

/** Nothing for the dialogue to read (an empty row never rides on its own). */
export function spokenEmpty(row: SpokenW): boolean {
  return !row.q.length && !row.r && !row.a && !row.ft && row.lv === undefined;
}

/** The World's own dialogue director's host (World.npcDialogues): every read the director and
 *  the facts make resolves through THE ONE RESOLVER for the local seat at the moment it is made
 *  (questDialogueView: the World itself off a hosted world's shell), and every write lands on
 *  the World. The director's own source stays the foundation's pinned original. */
export function spokenDialogueHost(world: World): NativeNpcDialogueHost {
  return new Proxy({} as NativeNpcDialogueHost, {
    get: (_t, k) => {
      const view = questDialogueView(world, world.clientSeatId);
      const v = Reflect.get(view, k);
      return view === world && typeof v === 'function' ? (v as (...args: unknown[]) => unknown).bind(world) : v;
    },
    set: (_t, k, v) => Reflect.set(world, k, v),
  });
}

const VIEWS = new WeakMap<World, { jn: JournalW | undefined; view: NativeNpcDialogueHost }>();

/** THE ONE RESOLVER (THE SPOKEN QUESTS): the host the dialogue conditions read for `seatId`.
 *  A hosted world's shell answers its own seat from the seat's rows (the newest journal row
 *  it adopted; none yet = nothing held, no key, no feature); everywhere else the World. */
export function questDialogueView(world: World, seatId: string): NativeNpcDialogueHost {
  // THE SOLO INVARIANT: solo, the co-op host and a co-op client (no counters shipped) read the World.
  if (!world.clientActionHook || !world.netCounters || seatId !== world.clientSeatId) return world;
  const jn = world.netJournal, memo = VIEWS.get(world);
  if (memo && memo.jn === jn) return memo.view;
  const view = shellView(world, jn);
  VIEWS.set(world, { jn, view });
  return view;
}

/** The shell's World with the seat's rows standing in: the held quests and their standing,
 *  the imbues waiting, the named run keys, the named account keys, features and level. Every
 *  other read (a local receipt, the hero's place, a fact's own world state) is the shell's,
 *  live, and every write lands on the shell itself. */
function shellView(world: World, jn: JournalW | undefined): NativeNpcDialogueHost {
  const reads = spokenReads(), row = jn?.sq;
  const runKeys = new Set(reads.run), acctKeys = new Set(reads.account), named = new Set(reads.features);
  const owned = new Set(row?.ft ?? []);
  const active: SavedQuestEntry[] = (row?.q ?? []).map(r => ({ questId: r.id, zoneId: '', fieldDone: !!r.f }));
  const standing = new Map<string, QuestStanding>((row?.q ?? []).map(r => [r.id, r.s ?? 'afield']));
  // The imbues waiting are the journal's own cards (a fact reads only the quest each answers).
  const imbues: QuestImbue[] = (jn?.imbues ?? []).map(i => ({ questId: i.questId, level: i.level, offers: {} }));
  const keyed = (keys: ReadonlySet<string>, own: () => Record<string, number>, rows: Record<string, number> | undefined): Record<string, number> =>
    new Proxy({} as Record<string, number>, {
      get: (_t, k) => (typeof k !== 'string' ? undefined : keys.has(k) ? rows?.[k] : own()[k]),
      set: (_t, k, v) => { if (typeof k === 'string') own()[k] = v; return true; },
    });
  const features = { has: (f: string): boolean => (named.has(f) ? owned.has(f) : world.account.features.has(f)) };
  const accountLedger = keyed(acctKeys, () => world.account.ledger, row?.a);
  const account = new Proxy({} as World['account'], {
    get: (_t, k) => (k === 'ledger' ? accountLedger : k === 'features' ? features
      : k === 'level' && reads.level ? row?.lv ?? world.account.level : Reflect.get(world.account, k)),
    set: (_t, k, v) => Reflect.set(world.account, k, v),
  });
  const own: Partial<Record<keyof NativeNpcDialogueHost, unknown>> = {
    activeQuests: active,
    questImbues: imbues,
    ledger: keyed(runKeys, () => world.ledger, row?.r),
    account,
    questStanding: (e: { questId: string }): QuestStanding => standing.get(e.questId) ?? 'afield',
  };
  return new Proxy({} as NativeNpcDialogueHost, {
    get: (_t, k) => {
      if (typeof k === 'string' && Object.hasOwn(own, k)) return own[k as keyof NativeNpcDialogueHost];
      const v = Reflect.get(world, k);
      return typeof v === 'function' ? (v as (...args: unknown[]) => unknown).bind(world) : v;
    },
    set: (_t, k, v) => Reflect.set(world, k, v),
  });
}
