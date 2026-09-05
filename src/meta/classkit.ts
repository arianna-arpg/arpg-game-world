// ---------------------------------------------------------------------------
// THE CLASS KIT RESOLVER — what a class WAKES with, given the account.
//
// A ClassDef's bar is the base kit; its `kit` rows (data/classes.ts
// KitRungRow) name the alternates each MASTERY rung opens (data/classTiers.ts).
// This leaf folds the two against the account's owned rungs into ONE
// answer, read by every seam that seats a hero: the class card's chooser
// (what may be picked), the wake (World.createPlayer — the resolved bar),
// and the remembered picks (Account.kitPicks). Pure and account-honest: a
// pick whose rung is not owned is refused here, so the wire, the UI and any
// future lane (couch guests, co-op clients) can never smuggle an unearned
// opening past the engine.
// ---------------------------------------------------------------------------

import type { Account } from './account';
import { classTierId, CLASS_TIER_BY_ID } from '../data/classTiers';
import { kitRungs, type ClassDef, type KitRungRow } from '../data/classes';

/** Does the account own this rung of this class? */
export function classTierOwned(a: Account, classId: string, tierId: string): boolean {
  return a.unlockedClassTiers.has(classTierId(classId, tierId));
}

/** The rung rows the account has UNLOCKED for a class. */
export function ownedKitRungs(a: Account, c: ClassDef): KitRungRow[] {
  return kitRungs(c).filter(r => classTierOwned(a, c.id, r.tier));
}

/** One base starter and everything that may stand in for it. */
export interface KitSlotChoice {
  /** The base starter (always the first option). */
  base: string;
  /** base + every owned alternate for it, in rung order. */
  options: string[];
  /** The option currently chosen (remembered pick if still valid, else base). */
  picked: string;
}

/** The Master's gifts standing on the bar outright. */
export interface KitGrant { skill: string; tier: string }

/** THE CHOOSER'S READ: per base starter, its owned alternates; plus every
 *  owned outright grant. A class with no owned rungs reads its base kit
 *  exactly (every slot one option — the card can stay silent). */
export function kitChoicesFor(a: Account, c: ClassDef): { slots: KitSlotChoice[]; grants: KitGrant[] } {
  const owned = ownedKitRungs(a, c);
  const remembered = a.kitPicks[c.id] ?? {};
  const slots: KitSlotChoice[] = [];
  for (const base of c.bar) {
    if (!base) continue;
    const options = [base, ...owned.filter(r => r.replaces === base).map(r => r.skill)];
    const want = remembered[base];
    slots.push({ base, options, picked: want && options.includes(want) ? want : base });
  }
  const grants: KitGrant[] = owned.filter(r => !r.replaces).map(r => ({ skill: r.skill, tier: r.tier }));
  return { slots, grants };
}

/** THE WAKE'S READ: the resolved bar — the class's base bar with each
 *  chosen (and OWNED) alternate standing in for its base, and every owned
 *  grant seated in the first empty slots. `picks` (baseSkillId → skillId)
 *  defaults to the remembered picks; anything unowned or unknown falls
 *  back to the base kit — silently, by construction. Same length as the
 *  def's bar, always. */
export function resolveClassKit(a: Account, c: ClassDef, picks?: Record<string, string>): (string | null)[] {
  const { slots, grants } = kitChoicesFor(a, c);
  const bySlot = new Map(slots.map(s => [s.base, s]));
  const bar: (string | null)[] = c.bar.map(base => {
    if (!base) return null;
    const slot = bySlot.get(base);
    const want = picks?.[base] ?? slot?.picked ?? base;
    return slot && slot.options.includes(want) ? want : base;
  });
  for (const g of grants) {
    if (bar.includes(g.skill)) continue;
    const free = bar.indexOf(null);
    if (free < 0) break; // a full bar takes no more gifts — the pack lane is the graft's, not ours
    bar[free] = g.skill;
  }
  return bar;
}

/** Remember a chooser's picks on the account (only non-base, currently
 *  valid picks are kept — the record never carries a stale claim). */
export function rememberKitPicks(a: Account, c: ClassDef, picks: Record<string, string>): void {
  const { slots } = kitChoicesFor(a, c);
  const kept: Record<string, string> = {};
  for (const s of slots) {
    const want = picks[s.base];
    if (want && want !== s.base && s.options.includes(want)) kept[s.base] = want;
  }
  if (Object.keys(kept).length) a.kitPicks[c.id] = kept;
  else delete a.kitPicks[c.id];
}

/** Is a class's kit anything but its base right now — i.e. does the card
 *  have a choice to offer or a gift to show? */
export function kitHasOptions(a: Account, c: ClassDef): boolean {
  const { slots, grants } = kitChoicesFor(a, c);
  return grants.length > 0 || slots.some(s => s.options.length > 1);
}

/** The rung a skill belongs to for this class (undefined for a base starter
 *  or a stranger) — the card's chip label. */
export function kitRungOf(c: ClassDef, skillId: string): { tier: string; label: string } | undefined {
  const row = kitRungs(c).find(r => r.skill === skillId);
  if (!row) return undefined;
  return { tier: row.tier, label: CLASS_TIER_BY_ID[row.tier]?.label ?? row.tier };
}
