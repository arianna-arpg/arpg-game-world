// ---------------------------------------------------------------------------
// THE RESOURCE HARVEST — biome-flavored resource nodes broken by a keyed RITE.
//
// The shape: zones stand a few HIGHLY THEMATIC gatherable nodes (data/
// harvest.ts rows keyed by biome/tileset — the lair fabric's predicate idiom,
// so a new country joins by adding one row, no tileset edits). DWELLING
// beside one ARMS the rite: a short button sequence against a closing window.
// At the last correct press — or at expiry — the node SHATTERS (the brittle
// pop grammar: flash + husk face, never text) and pays ESSENCE through the
// standing drop path, quantity scaled by DIFFICULTY (zone level) and
// ACCURACY. One-time per node: armed is spent, stamped into zone memory
// (the digsite charge-array precedent), so a rite begun is a rite settled.
//
// THE LAWS (each pinned by balance/probe_harvest.ts):
//  · THE PAUSE LAW — arming engages the 'harvest' TimeHold surface
//    (TIME_CFG.surfaces, kind 'harvest', scale 0), OUTSIDE the menu mode:
//    the world freezes, the harvester cannot die or be disturbed, and the
//    release is immediate at settlement. The hold obeys the SAME solo-only
//    policy the pause menu wears (Timeflow.allowHold — a shared world is
//    never one player's to stop), so in co-op the rite runs UNPAUSED.
//  · THE INPUT LAW — a seat mid-rite speaks to the rite alone: its whole
//    intent (movement, casts, aim) is swallowed at the applyInputs artery
//    and its slot presses become SYMBOLS. A sequence key can never fire
//    the skill bound to it.
//  · THE ANTI-MEMORIZE LAW — the pause toggle REFUSES while the rite's
//    hold stands (ui/panels.ts showEscapeMenu consults
//    World.harvestPauseLocked), each node's sequence is a pure function of
//    (world seed × zone × node position) so re-dwelling can never re-roll
//    it, and the window burns on RAW frame seconds — any freeze that does
//    slip past the refusal costs window, never buys reading time.
//  · THE PROMPT SPEAKS THE LIVE BINDS — symbols are BAR-SLOT actions; the
//    renderer resolves each through resolveBindTokens ('{bind:…}'), so a
//    keyboard shows keys, a pad shows buttons, a couch guest's prompt
//    speaks its own pad, and a rebind re-labels the prompt the same frame.
//
// THE ONE-MATCHER VERDICT (engine/sequence.ts): matchSeqRule serves
// grammars that OBSERVE a completed history (invocation weaves, combo
// rings). A rite validates each press as it lands — advance or miss, with
// a running miss count — which is a prefix POINTER, not a tail match;
// running the matcher on a growing prefix would re-scan what the pointer
// already knows and model misses nowhere. Deliberately not adopted.
//
// This module is the PURE half (config + derivations — sim-safe, no World
// import); the stateful driver lives on World (bootHarvest / updateHarvest /
// harvestFeed / harvestSettle), the themed rows in data/harvest.ts.
// Docs planned under docs/engine/harvest.md once the numbers are blessed.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { ESSENCE_IDS, ESSENCES, type EssenceCost } from '../data/essences';
import type { PadActionId } from '../meta/settings';

/** Central levers. ⚠ EVERY number here is UNBLESSED (2026-08-15) — spawn
 *  cadence, window, lengths, payout curve and denominations all await her
 *  word; the shapes are the commitment, the values are placeholders. */
export const HARVEST_CFG = {
  /** Placement stream salt (zone seed ^ salt — the puzzle placer's law). */
  salt: 0x9a4e57,
  /** Sequence stream salt (world seed ^ salt ^ node key — anti-memorize). */
  seqSalt: 0x51e9d3,
  /** Chance a row-matched zone stands nodes at all, and how many. */
  chance: 0.7,
  count: [1, 3] as [number, number],
  /** Node body + placement clearance (the fixture discipline). */
  nodeRadius: 13,
  portalClear: 110,
  /** THE CONSENT DIAL: how a rite BEGINS at an armable node (calm ground,
   *  in armRadius). 'press' (default) — standing there OFFERS the rite and
   *  the interact verb (the pickup bind, the contextual-verb idiom) begins
   *  it: a one-shot commitment is a deliberate press, and nobody is
   *  auto-committed (or solo-frozen) for pausing beside a node to read a
   *  tooltip. 'dwell' — the commission's letter: standing armSec begins it
   *  outright, no press. ⚠ the 'press' default is the pass's own lean —
   *  her word flips one string. */
  consent: 'press' as 'press' | 'dwell',
  /** THE ARMING REACH + the 'dwell' mode's linger. */
  armRadius: 72,
  armSec: 0.9,
  /** THE SYMBOL ALPHABET: bar-slot indices. Slots 2–5 are keys 1/2/3/4 on
   *  keyboard and Ⓐ/Ⓑ/Ⓧ/Ⓨ on pad — bound by default on both devices, so
   *  a sequence is always enterable. (Slots 0/1 stay out: on keyboard they
   *  are the mouse.) */
  alphabet: [2, 3, 4, 5] as number[],
  /** Sequence length by difficulty (zone level), clamped. */
  len: { base: 3, perLevel: 0.12, min: 3, max: 8 },
  /** The window: base + perStep × length, RAW seconds. */
  window: { base: 3.0, perStep: 1.0 },
  /** THE PAYOUT: total Mortal-Essence worth = (base + perLevel×(level−1))
   *  × accuracy^gamma, floored at `floor` (a clumsy break still shakes
   *  something loose), then denominated greedily down the essence ladder —
   *  deeper tints unlock at `tierAt` levels (the spill fabric's rungs kept
   *  as hard gates so a harvest's tint reads the country's depth). */
  payout: {
    base: 4, perLevel: 0.9, accGamma: 1.25, floor: 1,
    /** Index-aligned with ESSENCE_IDS (coarse/glimmering/brilliant/pristine). */
    tierAt: [0, 8, 16, 26] as number[],
  },
  /** The hold's HUD wash while the world is held (drawTimeflow). */
  hud: { tint: 'rgba(14,22,16,0.30)', label: 'the harvest holds' },
} as const;

/** Bar-slot index → the bindable action naming it (prompt display — the
 *  '{bind:…}' token family; meta/settings.ts resolves keyboard vs pad). */
export const HARVEST_SLOT_ACTIONS: PadActionId[] = [
  'skillSlot0', 'skillSlot1', 'skillSlot2', 'skillSlot3',
  'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7',
];

/** FNV-1a — the repo's canonical string hash (each module carries its own). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Sequence length at a difficulty (zone level) — monotone, clamped. */
export function harvestSeqLen(level: number): number {
  const c = HARVEST_CFG.len;
  return Math.max(c.min, Math.min(c.max, c.base + Math.floor(Math.max(1, level) * c.perLevel)));
}

/** The entry window for a sequence of `len` steps, RAW seconds. */
export function harvestWindowFor(len: number): number {
  return HARVEST_CFG.window.base + HARVEST_CFG.window.perStep * len;
}

/**
 * THE SEEDED SEQUENCE — a pure function of (world seed, zone, node position,
 * difficulty): the same node deals the same sequence across re-dwells,
 * reloads and sessions (the anti-memorize law's second leg — nothing to
 * re-roll), while different nodes differ. Returns bar-slot indices drawn
 * from the alphabet.
 */
export function harvestSeqFor(
  worldSeed: number, zoneId: string, pos: { x: number; y: number }, level: number,
): number[] {
  const key = `${zoneId}|${Math.round(pos.x)},${Math.round(pos.y)}`;
  const rng = new Rng((worldSeed ^ HARVEST_CFG.seqSalt ^ hashStr(key)) >>> 0);
  const len = harvestSeqLen(level);
  const seq: number[] = [];
  const ab = HARVEST_CFG.alphabet;
  for (let i = 0; i < len; i++) seq.push(ab[rng.int(0, ab.length - 1)]);
  return seq;
}

/** ACCURACY: completion × cleanliness — hits/len says how much of the rite
 *  landed, hits/(hits+misses) how cleanly. Perfect completion = 1; an
 *  untouched expiry = 0. Monotone in hits, antitone in misses. */
export function harvestAccuracy(hits: number, misses: number, len: number): number {
  const h = Math.max(0, Math.min(len, hits));
  const m = Math.max(0, misses);
  if (len <= 0) return 0;
  return (h / len) * (h > 0 ? h / (h + m) : 0);
}

/** The payout's total Mortal-Essence worth — the probe's monotone surface:
 *  non-decreasing in `level` and in `hits`, non-increasing in `misses`. */
export function harvestPayoutValue(level: number, hits: number, misses: number, len: number): number {
  const c = HARVEST_CFG.payout;
  const max = c.base + c.perLevel * (Math.max(1, level) - 1);
  const acc = Math.pow(harvestAccuracy(hits, misses, len), c.accGamma);
  return Math.max(c.floor, Math.round(max * acc));
}

/**
 * THE DENOMINATION — pour the payout's worth down the essence ladder,
 * deepest level-unlocked tint first; coarse (worth 1 by THE CHANGE LAW)
 * mops the remainder, so the packets' wallet value equals the payout value
 * EXACTLY (probe-pinned conservation).
 */
export function harvestPayout(level: number, hits: number, misses: number, len: number): EssenceCost[] {
  let owed = harvestPayoutValue(level, hits, misses, len);
  const gates = HARVEST_CFG.payout.tierAt;
  let deepest = 0;
  for (let t = 0; t < ESSENCE_IDS.length && t < gates.length; t++) {
    if (level >= gates[t]) deepest = t;
  }
  const out: EssenceCost[] = [];
  for (let t = deepest; t >= 0 && owed > 0; t--) {
    const id = ESSENCE_IDS[t];
    const worth = ESSENCES[id].mortalWorth;
    const n = t === 0 ? owed : Math.floor(owed / worth);
    if (n > 0) { out.push({ essence: id, count: n }); owed -= n * worth; }
  }
  return out;
}
