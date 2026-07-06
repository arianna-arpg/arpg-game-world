// ---------------------------------------------------------------------------
// SAGAS & NEMESES — the world's memory of a NAME.
//
// Characters die and worlds regenerate, but a NAME is the player's to keep
// giving — and the world keeps the ledger. A SAGA is everything remembered
// about one name: which factions it has bled (grudges), which individual
// foes rose against it (nemeses — minted a name of their own the moment the
// world decides to remember them), how many of its bearers have fallen, and
// the trophies of the grudges it ended. Sagas live on the ACCOUNT keyed by
// the normalized name, so "Arianna" threads through every run named Arianna
// — and a player who never names anyone discovers the seam when their second
// Rogue meets the first Rogue's killer, promoted and waiting.
//
// THE HOOK SURFACE (build-on, not bespoke): every mutation goes through the
// small op set below; the engine announces each one on the event bus
// ('nemesis/formed' | 'promoted' | 'manifested' | 'slain' | 'escaped'), every
// chance/cap/curve is NEMESIS_CFG data, deed marks are an open vocabulary
// (data/nemesis.ts), and each record carries a capped deeds[] history —
// future assassins, bounty boards, and contracts read and write the same
// records without touching the death flow.
// ---------------------------------------------------------------------------

import { GRUDGE_TIERS, NEMESIS_NAMES, NEMESIS_RANKS, type GrudgeTierDef } from '../data/nemesis';
import type { MonsterRarity } from '../engine/rarity';
import type { Account } from './account';

export const NEMESIS_SCHEMA = 1;

/** One remembered deed (capped history — the extensibility ledger). */
export interface NemesisDeed { at: number; kind: string; note?: string }

/** One individual foe the world remembers rising against a name. */
export interface NemesisRecord {
  schema: number;
  id: string;
  /** Its OWN minted name + current rank title (display). */
  name: string;
  /** The monster it is (MonsterDef id) — a removed def skips manifesting. */
  defId: string;
  faction: string;
  /** Elite tier it held IN LIFE (a named rare that killed you) — manifested
   *  again at that tier, ring and all, on top of its nemesis rank. */
  bornRarity?: MonsterRarity;
  /** Index into NEMESIS_RANKS (clamped on read — a shortened ladder tolerates). */
  rank: number;
  /** Deed-mark kinds it carries (data/nemesis.ts NEMESIS_MARKS vocabulary). */
  marks: string[];
  /** Bearers of the name this foe has personally slain. */
  slays: number;
  encounters: number;
  bornAt: number;
  lastSeenAt: number;
  deeds: NemesisDeed[];
}

/** Everything the world remembers about one NAME. */
export interface SagaRecord {
  schema: number;
  /** Display form (the key is the normalized form). */
  name: string;
  /** factionId → lifetime kills by bearers of this name (grudge fuel). */
  grudges: Record<string, number>;
  nemeses: NemesisRecord[];
  /** How many bearers of the name have fallen. */
  fallen: number;
  /** Names of nemeses whose grudge was ENDED (trophies; capped). */
  slainNemeses: string[];
  lastPlayedAt: number;
}

/** Every knob of the world's memory in one place — tune freely. */
export const NEMESIS_CFG = {
  /** Sagas kept on the account (LRU by lastPlayedAt beyond this). */
  sagaCap: 20,
  /** Active nemeses per saga (a new one beyond this replaces the LOWEST rank). */
  nemesesPerSaga: 8,
  /** Deeds kept per nemesis; trophies kept per saga. */
  deedCap: 10,
  trophyCap: 12,
  /** FORMATION chances. slayer = the foe that landed the killing blow on the
   *  run's lethal wipe; survivor = a foe that marked the player and was left
   *  alive when they moved on (rolled per zone-leave, at most one forms);
   *  mercFelled = a foe that downed the patron's named hireling. */
  slayerChance: 0.75,
  survivorChance: 0.18,
  survivorPerZone: 1,
  mercFelledChance: 0.3,
  /** A slain nemesis's chance to CHEAT DEATH (record survives, marked) —
   *  else the grudge dies with it (trophy + bounty). */
  cheatDeathChance: 0.35,
  /** A survivor that was ALREADY a manifested nemesis promotes on escape. */
  escapePromoteChance: 0.5,
  /** MANIFESTATION: chance per zone load that one remembered foe steps out
   *  (rolled per active nemesis, first success fields it; capped at one). A
   *  matching zone faction and the saga's grudge tier both raise the odds. */
  manifestChance: 0.16,
  manifestFactionBonus: 0.2,
  maxManifestPerZone: 1,
} as const;

/** The saga key: names thread by their normalized form ("Arianna" = "arianna").
 *  Class-default names participate on purpose — that's the discovery seam. */
export function sagaKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Fetch-or-create the saga for a name (touches lastPlayedAt; LRU-evicts the
 *  stalest saga beyond the cap so the map never grows unbounded). */
export function touchSaga(a: Account, name: string): SagaRecord {
  const key = sagaKey(name);
  let s = a.sagas[key];
  if (!s) {
    s = {
      schema: NEMESIS_SCHEMA, name: name.trim(), grudges: {}, nemeses: [],
      fallen: 0, slainNemeses: [], lastPlayedAt: Date.now(),
    };
    a.sagas[key] = s;
    const keys = Object.keys(a.sagas);
    if (keys.length > NEMESIS_CFG.sagaCap) {
      let oldest = key;
      let oldestAt = Infinity;
      for (const k of keys) {
        if (a.sagas[k].lastPlayedAt < oldestAt) { oldestAt = a.sagas[k].lastPlayedAt; oldest = k; }
      }
      if (oldest !== key) delete a.sagas[oldest];
    }
  }
  s.lastPlayedAt = Date.now();
  return s;
}

/** A read-only peek (no create, no touch) — hooks that only ask questions. */
export function peekSaga(a: Account, name: string): SagaRecord | null {
  return a.sagas[sagaKey(name)] ?? null;
}

/** Lifetime kills by this name against a faction, +n. */
export function bumpGrudge(saga: SagaRecord, factionId: string, n = 1): void {
  if (!factionId) return;
  saga.grudges[factionId] = (saga.grudges[factionId] ?? 0) + n;
}

/** The highest grudge tier a faction has climbed against this name (null =
 *  below every tier). Tiers are data (data/nemesis.ts GRUDGE_TIERS). */
export function grudgeTier(saga: SagaRecord | null, factionId: string): GrudgeTierDef | null {
  if (!saga || !factionId) return null;
  const kills = saga.grudges[factionId] ?? 0;
  let best: GrudgeTierDef | null = null;
  for (const t of GRUDGE_TIERS) if (kills >= t.kills) best = t;
  return best;
}

/** Mint a nemesis name from the vocabulary (faction pools override defaults). */
export function mintNemesisName(factionId: string, rand: () => number): string {
  const pools = NEMESIS_NAMES.byFaction[factionId] ?? {};
  const first = pools.first?.length ? pools.first : NEMESIS_NAMES.first;
  const epi = pools.epithets?.length ? pools.epithets : NEMESIS_NAMES.epithets;
  const pick = (arr: string[]): string => arr[Math.floor(rand() * arr.length)] ?? arr[0];
  return `${pick(first)} ${pick(epi)}`;
}

/** The display title at a rank (clamped): "Gorfang the Whisper, the Dreaded". */
export function nemesisTitle(n: NemesisRecord): string {
  const rank = NEMESIS_RANKS[Math.max(0, Math.min(n.rank, NEMESIS_RANKS.length - 1))];
  return `${n.name}, ${rank.title}`;
}

/** Record a deed (capped history). */
export function recordDeed(n: NemesisRecord, kind: string, note?: string): void {
  n.deeds.push({ at: Date.now(), kind, note });
  while (n.deeds.length > NEMESIS_CFG.deedCap) n.deeds.shift();
  if (!n.marks.includes(kind)) n.marks.push(kind);
  n.lastSeenAt = Date.now();
}

/** FORM a new nemesis in a saga (the world decides to remember this foe).
 *  Beyond the cap the LOWEST-ranked active nemesis is replaced — the memory
 *  keeps its most dangerous grudges. `opts.name` carries an identity the foe
 *  ALREADY had (a named rare keeps being itself — the nomenclature mill and
 *  the memory compound); absent, one is minted. Returns the new record. */
export function formNemesis(
  saga: SagaRecord, defId: string, faction: string, deedKind: string, rand: () => number,
  opts?: { name?: string; bornRarity?: MonsterRarity },
): NemesisRecord {
  const n: NemesisRecord = {
    schema: NEMESIS_SCHEMA,
    id: 'n' + Date.now().toString(36) + Math.floor(rand() * 0xffffff).toString(36),
    name: opts?.name?.trim() || mintNemesisName(faction, rand),
    defId, faction,
    ...(opts?.bornRarity && opts.bornRarity !== 'normal' ? { bornRarity: opts.bornRarity } : {}),
    rank: 0, marks: [], slays: 0, encounters: 1,
    bornAt: Date.now(), lastSeenAt: Date.now(), deeds: [],
  };
  recordDeed(n, deedKind, `against ${saga.name}`);
  if (deedKind === 'slayer') n.slays = 1;
  if (saga.nemeses.length >= NEMESIS_CFG.nemesesPerSaga) {
    let lowest = 0;
    for (let i = 1; i < saga.nemeses.length; i++) {
      if (saga.nemeses[i].rank < saga.nemeses[lowest].rank) lowest = i;
    }
    saga.nemeses[lowest] = n;
  } else {
    saga.nemeses.push(n);
  }
  return n;
}

/** PROMOTE a nemesis one rank (clamped to the ladder). */
export function promoteNemesis(n: NemesisRecord, deedKind: string, note?: string): void {
  n.rank = Math.min(n.rank + 1, NEMESIS_RANKS.length - 1);
  recordDeed(n, deedKind, note);
}

/** A manifested nemesis was struck down: it cheats death (marked, retained)
 *  or the grudge ends (removed + trophy). Returns what happened. */
export function resolveNemesisSlain(
  saga: SagaRecord, id: string, rand: () => number,
): 'cheated' | 'slain' | 'unknown' {
  const i = saga.nemeses.findIndex(x => x.id === id);
  if (i < 0) return 'unknown';
  const n = saga.nemeses[i];
  if (rand() < NEMESIS_CFG.cheatDeathChance) {
    recordDeed(n, 'cheated_death');
    return 'cheated';
  }
  saga.nemeses.splice(i, 1);
  saga.slainNemeses.push(nemesisTitle(n));
  while (saga.slainNemeses.length > NEMESIS_CFG.trophyCap) saga.slainNemeses.shift();
  return 'slain';
}
