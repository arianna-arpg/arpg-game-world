// ---------------------------------------------------------------------------
// THE DEAL — Mu's hand as ONE pure function of the account (the engine half
// of data/mu.ts; the mu stage in engine/scenes.ts seats what this returns).
//
// THE HAND LAW: the class screen's exact economy — hand size =
// selectableSlotCount, dealt from the Vault-activated pool; known classes
// outside the hand stand VEILED, undiscovered ones as capped FAINT cowls.
// Seeded off the account's own history (runs + deaths), so a re-entered Mu
// keeps its hand within a sitting and re-deals as the account moves on.
//
// THE OFFERED CONTRACT (meta/modes.ts ModeOfferSpec — her ruling 2026-09-13,
// Mu × the Immortal covenant): every life-contract wearing a `muOffer` row
// that the account may swear into RIGHT NOW (muOfferableModes: the unlock
// owned, a free vessel slot) is rolled along the dealt hand in seat order —
// per-vessel `chance`, at most `max` per waking, one contract per vessel —
// AFTER the deal on the SAME stream, so the hand is byte-identical whether
// or not a contract is offerable (THE STREAM LAW), and the roll holds for
// the sitting exactly as the hand does. The result is a plain map the stage
// wears onto the vessel as the contract's marker status (the drawn tell —
// shown, never told) and the card reads to open pre-sworn.
//
// Pure by construction (no world, no rng but its own seeded stream): the
// probe sweeps a thousand sittings in a blink, and the stage can never
// disagree with what the probe measured.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { CLASSES, type ClassDef } from '../data/classes';
import { MU_CFG, MU_ZONE } from '../data/mu';
import { isClassDiscovered, isClassUnlocked, selectableSlotCount, type Account } from '../meta/account';
import { muOfferableModes } from '../meta/modes';

/** One waking's deal. */
export interface MuDeal {
  /** The dealt hand — AWAKE, selectable — in seat order. */
  awake: ClassDef[];
  /** Known classes outside the hand, including pending Vault unlocks (named, refusing). */
  veiled: ClassDef[];
  /** How many faint unknown cowls stand (the locked remainder, capped). */
  faintN: number;
  /** THE OFFERED CONTRACT: class id → the mode id its vessel stands offered
   *  under (absent = an ordinary mortal waking). At most one per vessel. */
  offers: ReadonlyMap<string, string>;
}

/** The sitting's seed — the account's own history, so a re-entered Mu keeps
 *  its hand (and its offers) until a run or a death moves the account on. */
export function muDealSeed(acc: Account): number {
  return (MU_ZONE.seed
    ^ Math.imul(acc.runRecords.length + 1, 0x9e3779b1)
    ^ Math.imul(acc.deaths.length + 1, 0x85ebca6b)) >>> 0;
}

/** Deal one waking: the hand law, then the offered contracts. `seed`
 *  defaults to the sitting's (muDealSeed); probes and dev lanes sweep it. */
export function muDeal(acc: Account, seed: number = muDealSeed(acc)): MuDeal {
  const pool = CLASSES.filter(c => isClassUnlocked(acc, c.id));
  const handN = Math.min(selectableSlotCount(acc), pool.length);
  const rng = new Rng(seed);
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const awake = shuffled.slice(0, handN);
  // Pending discoveries reveal their own bodies without entering the deal
  // or consuming its random stream. Only the Vault click activates them.
  const discovered = CLASSES.filter(c => isClassDiscovered(acc, c.id));
  const veiled = [...shuffled.slice(handN), ...discovered.filter(c => !isClassUnlocked(acc, c.id))];
  const faintN = Math.min(MU_CFG.faintCap, CLASSES.length - discovered.length);
  // THE OFFERED CONTRACT — rolled AFTER the deal on the same stream (an
  // ineligible account draws nothing here and deals the identical hand),
  // registry order across contracts, seat order along the hand, one
  // contract per vessel, `max` per contract per waking.
  const offers = new Map<string, string>();
  for (const md of muOfferableModes(acc)) {
    const spec = md.muOffer!;
    let n = 0;
    for (const c of awake) {
      if (n >= spec.max) break;
      if (offers.has(c.id)) continue;
      if (rng.next() < spec.chance) { offers.set(c.id, md.id); n++; }
    }
  }
  return { awake, veiled, faintN, offers };
}
