// ---------------------------------------------------------------------------
// THE CHARACTER'S QUESTS (card 24 as ruled 2026-10-10; docs/engine/shard.md
// "THE CHARACTER'S QUESTS"): the unit of a quest is the CHARACTER, exactly as
// single player. A hero's quest log (held and finished), its imbues, its own
// rolled bounty postings and the boards they were dealt at, the run-ledger
// keys its quest acts stamped (the quest-done keys and chain keys that gate
// its offers) and its Odyssey leads are ONE ledger:
//
//   solo and the co-op host   the local seat's ledger IS the run's quest state
//                             (World.ownQuestLedger), saved with the world half
//                             as it always was: THE SOLO INVARIANT, pinned by
//                             balance/probe_shardcharacter.ts Z.
//   a hosted world            every player seat holds its own
//                             (World.seatQuests, a SEAT row THE HAND-OFF
//                             moves); every quest read and act answers the
//                             hand's (World.questHand); the vessel carries it
//                             home (CharacterSave.quests, one ledger per world
//                             the hero walks, keyed by questWorldKey).
//
// THE WORLD'S HALF stays the world's: the Odyssey's progression (leaders slain,
// factions eliminated, preparations, assaults), world events and sieges.
// ---------------------------------------------------------------------------

import type { SavedQuestEntry } from '../meta/worldstate';
import type { BountyPosting } from '../data/bountyboard';
import type { ItemInstance } from './items';
import type { QuestImbue } from './questImbue';

/** The dials (docs/engine/shard.md "Dials"). */
export const QUEST_LEDGER_CFG = {
  /** A vessel keeps one quest ledger per world it walks; past this many, the
   *  world it touched longest ago drops (a hero of many shards forgets the
   *  oldest errands, never the one it stands in). */
  worldsKept: 8,
};

/** One board's bookkeeping in a ledger (the standing-slate law's armed beat and
 *  THE TURN-IN REFRESH's seed limb). */
export interface QuestBoardState { armedBeat: number; refreshSeq: number }

/** A character's quest state (THE CHARACTER'S QUESTS). */
export interface QuestLedger {
  /** Quests held (World.activeQuests). */
  active: SavedQuestEntry[];
  /** Quests finished (World.completedQuests). */
  completed: Set<string>;
  /** Imbues earned and waiting (World.questImbues). */
  imbues: QuestImbue[];
  /** One fixed reward item per card (World.questRewardItems): a preview cache, never saved. */
  rewardItems: Map<string, ItemInstance>;
  /** The slate dealt to this character (World.bountyOffers). */
  offers: BountyPosting[];
  /** The postings it took (World.bountyHands). */
  hands: BountyPosting[];
  /** Each board's armed beat and refresh limb, by board id (World.bountyBoardState). */
  boards: Record<string, QuestBoardState>;
  /** The run-ledger keys this character's quest acts stamped on a hosted
   *  world (World.questStamp): the quest-done and chain keys its offers read
   *  over the world's run ledger (World.questRunLedger). Empty off a shard. */
  keys: Record<string, number>;
  /** The Odyssey leads this character learned on a hosted world (World.odysseyLeads). Empty off a shard. */
  leads: string[];
}

export function newQuestLedger(): QuestLedger {
  return { active: [], completed: new Set(), imbues: [], rewardItems: new Map(),
    offers: [], hands: [], boards: {}, keys: {}, leads: [] };
}

/** A ledger as it rides a CharacterSave (CharacterSave.quests[worldKey]). */
export interface QuestLedgerSave {
  /** The wall-clock time it was written (the cap's age read: worlds keep their own clocks). */
  at: number;
  active: SavedQuestEntry[];
  completed: string[];
  imbues?: QuestImbue[];
  offers?: BountyPosting[];
  hands?: BountyPosting[];
  boards?: Record<string, { armedBeat: number; refreshSeq?: number }>;
  keys?: Record<string, number>;
  leads?: string[];
}

/** THE WORLD KEY: the world a ledger's zone-anchored rows belong to. A shard is
 *  named by its hosted seed and its lane (a classic world and the Unbroken
 *  Wilds on one seed are two worlds), exactly as its save file is. */
export function questWorldKey(seed: number, wilds: boolean): string {
  return `shard:${(seed >>> 0).toString(16).padStart(8, '0')}${wilds ? ':wilds' : ''}`;
}

const clonePosting = (p: BountyPosting): BountyPosting => structuredClone(p);

/** A ledger, save-shaped (the reward preview cache never rides). */
export function packQuestLedger(l: QuestLedger, at: number): QuestLedgerSave {
  const boards = Object.fromEntries(Object.entries(l.boards)
    .map(([k, v]) => [k, { armedBeat: v.armedBeat, ...(v.refreshSeq > 0 ? { refreshSeq: v.refreshSeq } : {}) }]));
  return {
    at,
    active: l.active.map(q => ({ ...q })),
    completed: [...l.completed],
    ...(l.imbues.length ? { imbues: structuredClone(l.imbues) } : {}),
    ...(l.offers.length ? { offers: l.offers.map(clonePosting) } : {}),
    ...(l.hands.length ? { hands: l.hands.map(clonePosting) } : {}),
    ...(Object.keys(boards).length ? { boards } : {}),
    ...(Object.keys(l.keys).length ? { keys: { ...l.keys } } : {}),
    ...(l.leads.length ? { leads: [...l.leads] } : {}),
  };
}

const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The shape a CharacterSave's ledgers must hold before a world reads them (the
 *  structure alone: the adopting World re-validates every row against its own
 *  chart and registries). Unreadable ledgers drop; never throws. */
export function sanitizeQuestWorlds(raw: unknown): Record<string, QuestLedgerSave> | undefined {
  if (!plain(raw)) return undefined;
  const out: Record<string, QuestLedgerSave> = {};
  for (const [key, l] of Object.entries(raw)) {
    if (!plain(l) || !Array.isArray(l.active) || !Array.isArray(l.completed)) continue;
    out[key] = {
      at: finite(l.at) ? l.at : 0,
      active: l.active.filter((q): q is SavedQuestEntry => plain(q) && typeof q.questId === 'string' && typeof q.zoneId === 'string')
        .map(q => ({ questId: q.questId, zoneId: q.zoneId, fieldDone: !!q.fieldDone,
          ...(typeof q.directionsKnown === 'boolean' ? { directionsKnown: q.directionsKnown } : {}),
          ...(typeof q.placeId === 'string' ? { placeId: q.placeId } : {}) })),
      completed: l.completed.filter((id): id is string => typeof id === 'string'),
      ...(Array.isArray(l.imbues) ? { imbues: l.imbues as QuestImbue[] } : {}),
      ...(Array.isArray(l.offers) ? { offers: l.offers as BountyPosting[] } : {}),
      ...(Array.isArray(l.hands) ? { hands: l.hands as BountyPosting[] } : {}),
      ...(plain(l.boards) ? { boards: l.boards as QuestLedgerSave['boards'] } : {}),
      ...(plain(l.keys) ? { keys: Object.fromEntries(Object.entries(l.keys).filter(([, n]) => finite(n))) as Record<string, number> } : {}),
      ...(Array.isArray(l.leads) ? { leads: l.leads.filter((id): id is string => typeof id === 'string') } : {}),
    };
  }
  return Object.keys(out).length ? out : undefined;
}

/** The ledgers a vessel carries home once `key`'s is written: every other
 *  world's rides through as it came, the newest `worldsKept` kept. */
export function withQuestWorld(worlds: Record<string, QuestLedgerSave> | undefined, key: string,
  save: QuestLedgerSave): Record<string, QuestLedgerSave> {
  const rows = Object.entries({ ...(worlds ?? {}), [key]: save })
    .sort(([ka, a], [kb, b]) => (ka === key ? -1 : kb === key ? 1 : b.at - a.at))
    .slice(0, Math.max(1, QUEST_LEDGER_CFG.worldsKept));
  return Object.fromEntries(rows);
}

/** A character's key on a hosted world (THE BOARD PER CHARACTER's and THE SHELF PER
 *  BUYER's seed limb, THE PATRON'S HOLD's key): its character id, else, for a
 *  fresh hero who never travels, its seat id. */
export function charKeyOf(seat: { id: string; meta: { charId?: string } }): string {
  return seat.meta.charId || seat.id;
}
