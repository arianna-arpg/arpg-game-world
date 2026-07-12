// ---------------------------------------------------------------------------
// CHARACTER MODES — what a life IS, as data.
//
// A mode is a contract chosen at character creation: how death treats you, how
// the account treats your deeds, and where your save lives. Each mode is a
// ladder of STAGES; dying advances (or doesn't) along the ladder, and every
// stage is a pure policy record — the death flow, the corpse routing, the
// essence payout, and the meta-progression switch all read the CURRENT stage,
// never a hardcoded mode id. Adding a life-contract (a hardcore variant that
// burns its corpse, a seasonal league, a Mercenary's second life) is one
// CharacterModeDef here plus, at most, one Vault entry to sell it.
//
//   MORTAL   — the roguelite default. One stage: death ends the run, pays the
//              full essence tithe, corpses onto the ACCOUNT ring (any later
//              character may reclaim them), and the run save lives in the one
//              shared Continue slot. Byte-identical to the game before modes.
//
//   IMMORTAL — the softcore covenant (a Vault unlock earned by dying enough).
//              Stage "Sworn": plays exactly as mortal — full account
//              progression — until the FIRST death, which pays a REDUCED
//              tithe, drops a corpse only its owner will ever see, and
//              advances the ladder instead of ending the run: the screen
//              falls dark and the character wakes in town, build intact,
//              carry lost. Stage "Undying": outside the account loop —
//              deaths pay nothing, merge nothing, count nothing; corpses stay
//              self-only; the character persists across sessions in an
//              account ROSTER slot, played purely for the joy of playing.
//
// The INTERACTION-SCOPE rule the Immortal design turns on: an Undying
// character exchanges nothing with the mortal economy — its corpses live in
// its OWN save (structurally invisible to every other character, not merely
// filtered), and every account-scoped write in the sim consults the stage's
// metaProgression switch. Future cross-character systems (stashes, trade,
// mercenary hand-me-downs, Nemesis carriers) should key off the same stage
// policies rather than inventing per-feature flags.
// ---------------------------------------------------------------------------

import { FEATURE, LEDGER_ACCOUNT_DEATHS, ROSTER_SLOT_BASE, type Account } from './account';
import type { ResumeSpawn } from './worldstate';

/** One rung of a mode's death ladder. Every field is a policy the engine
 *  reads at the moment it matters — nothing here is decorative. */
export interface ModeStageDef {
  id: string;
  /** Short HUD chip / roster label for characters standing on this stage
   *  (undefined = no chip — the mortal default draws nothing). */
  badge?: string;
  /** Account meta-progression while ON this stage: ledger merges, vocation
   *  account-unlocks, uber trophies, craft-lore study. Character-scoped
   *  progression (XP, points, the vocation itself) is never gated. */
  metaProgression: boolean;
  /** Multiplier on the death essence payout when dying FROM this stage
   *  (1 = the full mortal tithe, 0 = death pays nothing). */
  deathPayoutMult: number;
  /** What a lethal party wipe FROM this stage does: 'end' = permadeath (the
   *  classic death screen + character wipe), 'advance' = step to the next
   *  stage and respawn, 'stay' = respawn on this stage forever. */
  onDeath: 'end' | 'advance' | 'stay';
  /** Presentation for a non-ending death: the slow fade-to-black-and-wake.
   *  ('screen' is implied for onDeath:'end' — main.ts owns that flow.) */
  deathSequence: 'screen' | 'fade';
  /** Which ring a death FROM this stage records its corpse into:
   *  'account' = the shared ring any later character can reclaim from;
   *  'own' = the character save's private ring (self-only, exploit-proof). */
  corpseRing: 'account' | 'own';
  /** Which ring this stage's zones SPAWN corpses from — the interaction
   *  scope. 'account' = the mortal loop's shared graveyard; 'own' = only
   *  your own falls exist for you. */
  corpseSource: 'account' | 'own';
  /** Does a death from this stage tick the account's lifetime death counter
   *  (the ledger key Vault unlocks like Immortal itself gate on)? */
  countsAccountDeath: boolean;
  /** May this stage RETIRE at a mercenary outpost (end the run, bank the
   *  tithe, and join the account's hireable-veteran roster — meta/mercs.ts)?
   *  A mortal-loop privilege: retirement is meta-progression, and a sworn
   *  covenant is not walked away from. Default false. */
  canRetire?: boolean;
  /** Does the world's memory (meta/nemesis.ts sagas — grudges, nemeses)
   *  watch this stage? WORLD-STATE bookkeeping, not player progression, so
   *  it defaults ON for every stage — a sealed Undying character still
   *  makes enemies; it just can't make PROGRESS. Declared here so a future
   *  ghost-mode that the world forgets is one flag, not a hunt. */
  nemesisMemory?: boolean;
  /** Flavor line floated over the character on waking (fade respawns only). */
  wakeText?: string;
}

export interface CharacterModeDef {
  id: string;
  name: string;
  /** Character-select copy — what this covenant means, in the player's terms. */
  blurb: string;
  /** Accent color for mode chips/cards. */
  color: string;
  /** Vault FEATURE flag that must be owned for this mode to appear at
   *  character select (undefined = always offered). */
  unlockFlag?: string;
  /** Where the run save lives: 'run' = the single shared Continue slot,
   *  wiped by permadeath; 'roster' = an owned, cross-session account slot
   *  (the character is a persistent possession, not a run). */
  save: 'run' | 'roster';
  /** PIN the relaunch wake policy (meta/worldstate.ts): 'exact' = wake at the
   *  saved spot in the saved situation (the anti-Alt-F4 covenant — quitting
   *  saves you from nothing); 'town' = always wake in Lastlight. UNDEFINED =
   *  the player's Settings choose (the default for both stock modes — where
   *  you wake is agency, not contract, unless a mode swears otherwise). */
  resume?: ResumeSpawn;
  /** Roster capacity = base + one per owned extraFlag (Vault slot unlocks).
   *  Required when save === 'roster'. */
  rosterPool?: { base: number; extraFlags: string[] };
  /** Fade-respawn pacing (seconds); FADE_DEFAULTS when omitted. */
  respawnFx?: { fadeOutSec: number; holdSec: number; fadeInSec: number };
  /** A line shown centered on the black screen mid-crossing. */
  crossingText?: string;
  /** The death ladder, in order. Index = PlayerMeta.modeStage. */
  stages: ModeStageDef[];
}

/** Every knob of the Immortal covenant in one place — tune freely. */
export const IMMORTAL_CFG = {
  /** Account deaths before the Vault surfaces the covenant. */
  unlockDeaths: 20,
  /** The first (immortalizing) death pays this fraction of the mortal tithe. */
  firstDeathPayoutMult: 0.25,
  /** Roster vessels: one sworn by default; each slot unlock adds one. */
  baseSlots: 1,
  /** Fade pacing — the slow dark, a beat of nothing, the waking. */
  fadeOutSec: 2.4,
  holdSec: 1.1,
  fadeInSec: 1.6,
} as const;

export const FADE_DEFAULTS = {
  fadeOutSec: IMMORTAL_CFG.fadeOutSec,
  holdSec: IMMORTAL_CFG.holdSec,
  fadeInSec: IMMORTAL_CFG.fadeInSec,
} as const;

/** The registry. Adding a mode = one entry (plus its Vault unlock, if gated). */
export const MODES: CharacterModeDef[] = [
  {
    id: 'mortal',
    name: 'Mortal',
    blurb: 'The wake as it has always run: death ends the character, pays the '
      + 'full essence tithe, and leaves a corpse any successor may reclaim.',
    color: '#c8b048',
    save: 'run',
    stages: [{
      id: 'mortal',
      metaProgression: true,
      deathPayoutMult: 1,
      onDeath: 'end',
      deathSequence: 'screen',
      corpseRing: 'account',
      corpseSource: 'account',
      countsAccountDeath: true,
      canRetire: true,
    }],
  },
  {
    id: 'immortal',
    name: 'Immortal',
    blurb: 'A covenant against the dark: your first death seals you outside '
      + 'the mortal ledger — you wake in town, build intact, carry lost. '
      + 'Deaths thereafter feed the account nothing; the character is yours, '
      + 'across sessions, for as long as you keep the vessel.',
    color: '#b8a0e0',
    unlockFlag: FEATURE.IMMORTAL,
    save: 'roster',
    rosterPool: {
      base: IMMORTAL_CFG.baseSlots,
      extraFlags: [FEATURE.IMMORTAL_SLOT_2, FEATURE.IMMORTAL_SLOT_3],
    },
    crossingText: 'Death cannot keep you.',
    stages: [
      {
        id: 'sworn',
        badge: 'SWORN',
        metaProgression: true,
        deathPayoutMult: IMMORTAL_CFG.firstDeathPayoutMult,
        onDeath: 'advance',
        deathSequence: 'fade',
        // The immortalizing corpse is ALREADY self-only — the moment of death
        // is the moment the covenant takes; nothing of it enters the shared ring.
        corpseRing: 'own',
        corpseSource: 'account',
        countsAccountDeath: true,
        wakeText: 'You wake in Lastlight. Something did not come back with you.',
      },
      {
        id: 'undying',
        badge: 'UNDYING',
        metaProgression: false,
        deathPayoutMult: 0,
        onDeath: 'stay',
        deathSequence: 'fade',
        corpseRing: 'own',
        corpseSource: 'own',
        countsAccountDeath: false,
        wakeText: 'You wake again. The world has stopped counting.',
      },
    ],
  },
];

export const MODE_BY_ID: Record<string, CharacterModeDef> =
  Object.fromEntries(MODES.map(m => [m.id, m]));

/** The default life-contract (and the fallback for any unknown/legacy id). */
export const DEFAULT_MODE_ID = 'mortal';

export function modeById(id: string | undefined): CharacterModeDef {
  return MODE_BY_ID[id ?? DEFAULT_MODE_ID] ?? MODE_BY_ID[DEFAULT_MODE_ID];
}

/** The stage a character stands on (index clamped — a shortened ladder in a
 *  data patch degrades to the last stage, never a crash). */
export function stageOf(modeId: string | undefined, stageIdx: number): ModeStageDef {
  const m = modeById(modeId);
  return m.stages[Math.max(0, Math.min(stageIdx, m.stages.length - 1))];
}

/** Modes this account may swear a NEW character into (unlock owned). */
export function availableModes(a: Account): CharacterModeDef[] {
  return MODES.filter(m => !m.unlockFlag || a.features.has(m.unlockFlag));
}

// --- the ROSTER: owned character slots ---------------------------------------

// Roster characters live at disk slot ROSTER_SLOT_BASE+i (defined beside the
// other slot constants' layer in account.ts). Numeric on purpose — the
// /__save/:slot endpoints (both the Vite plugin and the desktop launcher's
// server) accept any \d+ slot, so the roster needs NO server-side changes.

/** An account-owned character: the index card for a roster save slot. Display
 *  metadata only — the slot's CharacterSave is the authority; this exists so
 *  the start menu lists vessels without loading every slot file. */
export interface RosterEntry {
  charId: string;
  modeId: string;
  /** Disk save slot (ROSTER_SLOT_BASE + n). */
  slot: number;
  classId: string;
  /** Display name — the class name today; the Naming system will write here. */
  name: string;
  level: number;
  /** Mode-stage index at last save (drives the SWORN/UNDYING roster chip). */
  stage: number;
  savedAt: number;
}

/** How many roster vessels this account may hold for a mode. */
export function rosterCapacity(a: Account, mode: CharacterModeDef): number {
  const pool = mode.rosterPool;
  if (!pool) return 0;
  return pool.base + pool.extraFlags.filter(f => a.features.has(f)).length;
}

/** Roster entries sworn to a given mode. */
export function rosterOf(a: Account, modeId: string): RosterEntry[] {
  return a.roster.filter(r => r.modeId === modeId);
}

/** The lowest free roster disk slot for a new vessel of this mode, or null
 *  when the pool is full (or the mode owns no pool). Slots are scanned across
 *  the WHOLE roster — two modes never share a slot number. */
export function freeRosterSlot(a: Account, mode: CharacterModeDef): number | null {
  if (rosterOf(a, mode.id).length >= rosterCapacity(a, mode)) return null;
  const used = new Set(a.roster.map(r => r.slot));
  for (let s = ROSTER_SLOT_BASE; ; s++) if (!used.has(s)) return s;
}

/** Mint a collision-proof character id (time + entropy). */
export function mintCharId(): string {
  return 'c' + Date.now().toString(36) + Math.floor(Math.random() * 0xffffff).toString(36);
}

export { LEDGER_ACCOUNT_DEATHS, ROSTER_SLOT_BASE };
