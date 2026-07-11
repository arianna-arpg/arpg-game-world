// ---------------------------------------------------------------------------
// THE BESTIARY — account-wide monster knowledge, as data.
//
// Unlocked by the TRACKER Vault feature (a huntsman camps in Lastlight; dwell
// by his fire to open the book). Every eligible kind in the live MONSTERS
// registry gets a page automatically — new bestiary content is new monster
// defs, never an edit here. Kill counts accrue on the ACCOUNT ledger under
// bestiaryKey(defId) — knowledge outlives every death (the craft-lore
// stance) — fed by ONE registered kill rule below. Reaching a kind's
// threshold MASTERS its entry, which is itself meta-progress: a mastered
// form can be attuned to a Spectre skill (the grimoire — engine/skills.ts
// SummonDelivery.grimoire), and any future "know thy enemy" mechanic reads
// the same ledger (unlock predicates can gate on reqLedgerCounts with these
// keys verbatim).
// ---------------------------------------------------------------------------

import { registerKillHandler } from '../engine/killHandlers';
import { MONSTERS, type MonsterDef } from './monsters';
import type { Account } from '../meta/account';

export const BESTIARY_CFG = {
  /** Kills to MASTER an ordinary kind's entry (MonsterDef.bestiaryKills overrides). */
  kills: 500,
  /** Kills to master a BOSS's entry (rarer bodies, deeper lessons). */
  bossKills: 20,
  /** May mastered BOSS forms be attuned as Spectres? (The grimoire gate —
   *  flip to true and the uber-spectre fantasy is data.) */
  spectreBosses: false,
  /** THE BINDING SITE: attuning — and releasing — a Spectre form happens at
   *  the Tracker's OPEN BOOK (drag a mastered page onto the skill's slot).
   *  The field commits you to the form you carried out; swapping means
   *  walking back to town — the opportunity cost IS the design. This gates
   *  the ENGINE lane (World.attuneSpectre), so untrusted co-op intents and
   *  console pokes meet the same wall; flip false and the intent binds from
   *  anywhere again (the book stays the shipped UI either way). */
  attuneAtBook: true,
  /** STUDY TIERS: fractions of the threshold at which the book reveals more
   *  of a page. Names are the reveal GROUPS the book renders by — reorder or
   *  retune freely; the page reads whatever tier the count has reached. */
  revealTiers: [
    { at: 0,    group: 'sighting' },  // any kill: name, form, allegiance
    { at: 0.1,  group: 'vitals' },    // life, pace
    { at: 0.35, group: 'arts' },      // its skills, its accuracy
    { at: 0.7,  group: 'hide' },      // armor, evasion, innate quirks
    { at: 1,    group: 'mastery' },   // the full page + the grimoire gate
  ] as const,
  /** Entries per book page (the UI leafs through the registry this many at a time). */
  pageSize: 8,
};

/** The account-ledger key holding lifetime kills of one kind. A CROSS-FILE
 *  CONTRACT like every ledger key: unlock predicates may read it verbatim. */
export function bestiaryKey(defId: string): string { return 'bestiary:' + defId; }

/** May this kind have a page? Scenery, fixtures, town folk, driven props and
 *  spawner objects are beneath study; everything else flows in — including
 *  kinds the player has never met (their pages sit dark until first blood). */
export function bestiaryEligible(def: MonsterDef | undefined): def is MonsterDef {
  return !!def && !def.noBestiary && !def.passive && !def.immortal
    && !def.driven && !def.npcRole && !def.spawner;
}

/** Every page-worthy kind, in REGISTRY ORDER (authoring order keeps families
 *  together on facing pages). Derived live — new defs appear on their own. */
export function bestiaryList(): MonsterDef[] {
  return Object.values(MONSTERS).filter(bestiaryEligible);
}

/** Kills required to MASTER a kind: per-def override, else the boss/default split. */
export function bestiaryThreshold(def: MonsterDef): number {
  return Math.max(1, def.bestiaryKills ?? (def.boss ? BESTIARY_CFG.bossKills : BESTIARY_CFG.kills));
}

export function bestiaryKills(account: Account, defId: string): number {
  return account.ledger[bestiaryKey(defId)] ?? 0;
}

/** The study tier a kind's page has reached (index into revealTiers; -1 =
 *  never slain, the page is dark). */
export function bestiaryTier(account: Account, def: MonsterDef): number {
  const kills = bestiaryKills(account, def.id);
  if (kills <= 0) return -1;
  const frac = kills / bestiaryThreshold(def);
  let tier = 0;
  for (let i = 0; i < BESTIARY_CFG.revealTiers.length; i++) {
    if (frac >= BESTIARY_CFG.revealTiers[i].at) tier = i;
  }
  return tier;
}

/** Has this page reached the named reveal group? */
export function bestiaryReveals(account: Account, def: MonsterDef, group: string): boolean {
  const tier = bestiaryTier(account, def);
  return tier >= 0 && BESTIARY_CFG.revealTiers.findIndex(t => t.group === group) <= tier;
}

/** MASTERED: the threshold met — the page complete, the meta-progress earned. */
export function bestiaryMastered(account: Account, def: MonsterDef): boolean {
  return bestiaryKills(account, def.id) >= bestiaryThreshold(def);
}

/** May this mastered form be ATTUNED to a Spectre skill (the grimoire)?
 *  Mastery first; bosses only when the config opens them. */
export function spectreAttunable(account: Account, def: MonsterDef): boolean {
  if (!bestiaryMastered(account, def)) return false;
  return BESTIARY_CFG.spectreBosses || !def.boss;
}

/** Book-wide tallies for the header ("41 sighted · 3 mastered"). */
export function bestiaryTotals(account: Account): { pages: number; sighted: number; mastered: number } {
  const list = bestiaryList();
  let sighted = 0, mastered = 0;
  for (const def of list) {
    if (bestiaryKills(account, def.id) > 0) sighted++;
    if (bestiaryMastered(account, def)) mastered++;
  }
  return { pages: list.length, sighted, mastered };
}

// --- THE RECORDING RULE ------------------------------------------------------
// One row records every credited kill of an eligible kind. Conjured bodies
// (noBounty — an enemy summoner's endless spawn) teach nothing, exactly as
// they pay nothing: the summoner is the lesson. Durable writes (`flush`) are
// reserved for the moments that matter — first blood, a study tier crossed,
// mastery — routine counts ride the next scheduled account save.
registerKillHandler({
  id: 'bestiary_record',
  when: ctx => ctx.credit && !ctx.actor.noBounty && ctx.actor.team === 'enemy'
    && !!ctx.actor.defId && bestiaryEligible(MONSTERS[ctx.actor.defId]),
  run: ctx => {
    const def = MONSTERS[ctx.actor.defId!];
    const need = bestiaryThreshold(def);
    const key = bestiaryKey(def.id);
    const before = ctx.bumpAccountLedger(key, 0);
    if (before >= need) return; // the page is complete — nothing left to learn
    const tierAt = (n: number): number => {
      if (n <= 0) return -1;
      let t = 0;
      for (let i = 0; i < BESTIARY_CFG.revealTiers.length; i++) {
        if (n / need >= BESTIARY_CFG.revealTiers[i].at) t = i;
      }
      return t;
    };
    const after = ctx.bumpAccountLedger(key, 1, tierAt(before + 1) > tierAt(before));
    if (after === need) {
      ctx.text({ x: ctx.actor.pos.x, y: ctx.actor.pos.y - 44 },
        `BESTIARY MASTERED: ${def.name}`, '#e8c860', 17);
    }
  },
});
