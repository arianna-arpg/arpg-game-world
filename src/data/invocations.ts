// ---------------------------------------------------------------------------
// INVOCATION RUNES — the rune-weaver's grammar, as data.
//
// While an invoking skill (SkillDef.invokes) sits on the bar, every real
// elemental cast banks a RUNE of its school — Ember (fire), Arc (lightning),
// Rime (cold); channels bank one per held second. The invoke consumes the
// WHOLE sequence: rules below are matched against it — most-specific first
// (exact tail sequences beat count requirements beat the fallback) — the
// matched payload is cast at the aim, every rune burned is MORE damage, and
// the LAST rune sets the payload's damage type (an instance-local full
// conversion, so it honors the one conversion path like everything typed).
//
// New invocations are added here: a tail `seq` for order-specific weaves, a
// `counts` requirement for combination recipes, or both. No engine changes.
// ---------------------------------------------------------------------------

import { matchSeqRule, type SeqRule } from '../engine/sequence';

export type RuneId = 'ember' | 'arc' | 'rime';

export const RUNE_INFO: Record<RuneId, { label: string; color: string; element: 'fire' | 'lightning' | 'cold' }> = {
  ember: { label: 'Ember', color: '#ff8a4a', element: 'fire' },
  arc:   { label: 'Arc',   color: '#ffe14a', element: 'lightning' },
  rime:  { label: 'Rime',  color: '#9ad8f8', element: 'cold' },
};

/** The rune an elemental school banks (chaos/physical bank nothing — the
 *  weave is an ELEMENTAL grammar by design). */
export const RUNE_OF_ELEMENT: Record<string, RuneId> = {
  fire: 'ember', lightning: 'arc', cold: 'rime',
};

export interface InvocationRule {
  id: string;
  label: string;
  /** Matches when the sequence ENDS with exactly these runes, in order. */
  seq?: RuneId[];
  /** Matches when the sequence holds at least these counts (any order). */
  counts?: Partial<Record<RuneId, number>>;
  /** Minimum total runes (the fallback's only gate). */
  minRunes?: number;
  /** The payload skill (noDrop catalog entry) cast at the aim point. */
  skillId: string;
  /** MORE damage per rune consumed (default 0.15). */
  dmgPerRune?: number;
}

/** Ordered most-specific-first; resolveInvocation returns the first match. */
export const INVOCATIONS: InvocationRule[] = [
  // PURE TRIADS — three of a school closing the weave: the school's own
  // catastrophe, regardless of what came before.
  {
    id: 'conflagration', label: 'Conflagration',
    seq: ['ember', 'ember', 'ember'], skillId: 'invoke_conflagration',
    dmgPerRune: 0.18,
  },
  {
    id: 'stormfront', label: 'Stormfront',
    seq: ['arc', 'arc', 'arc'], skillId: 'invoke_stormfront',
    dmgPerRune: 0.18,
  },
  {
    id: 'glaciation', label: 'Glaciation',
    seq: ['rime', 'rime', 'rime'], skillId: 'invoke_glaciation',
    dmgPerRune: 0.18,
  },
  // ORDERED PAIRS — the closing two runes name the weave (order matters:
  // ember-then-arc is not arc-then-ember).
  {
    id: 'flashfire', label: 'Flashfire',
    seq: ['arc', 'ember'], skillId: 'invoke_lance',
  },
  {
    id: 'thunder_chill', label: 'Hoarfrost Thunder',
    seq: ['arc', 'rime'], skillId: 'invoke_lance',
  },
  {
    id: 'steamburst', label: 'Steamburst',
    seq: ['rime', 'ember'], skillId: 'invoke_lance',
  },
  {
    id: 'shatter_spark', label: 'Shatterspark',
    seq: ['ember', 'arc'], skillId: 'invoke_lance',
  },
  {
    id: 'black_ice', label: 'Black Ice',
    seq: ['ember', 'rime'], skillId: 'invoke_lance',
  },
  {
    id: 'static_frost', label: 'Static Frost',
    seq: ['rime', 'arc'], skillId: 'invoke_lance',
  },
  // THE FULL SPECTRUM — one of each anywhere in the weave: cataclysm.
  {
    id: 'cataclysm', label: 'Elemental Cataclysm',
    counts: { ember: 1, arc: 1, rime: 1 }, skillId: 'invoke_cataclysm',
    dmgPerRune: 0.2,
  },
  // FALLBACK — any runes at all burst, scaled by the count.
  {
    id: 'release', label: 'Rune Release',
    minRunes: 1, skillId: 'invoke_burst',
  },
];

/** Each rule's view for THE one sequence matcher (engine/sequence.ts) —
 *  built once at load. Pattern precedence inside a rule (seq, else counts,
 *  else the minRunes fallback) is the matcher's own fixed order, which IS
 *  this registry's historical contract. */
const RULE_VIEWS: SeqRule<RuneId>[] = INVOCATIONS.map(rule => ({
  seq: rule.seq,
  counts: rule.counts
    ? (Object.entries(rule.counts) as [RuneId, number][]).map(([p, n]) => ({ p, n }))
    : undefined,
  minLen: rule.seq || rule.counts ? undefined : rule.minRunes ?? 1,
}));

/** First matching rule for a banked sequence (rules are ordered most-
 *  specific first). Null only for an empty sequence. Resolution runs
 *  through THE shared sequence matcher — the same math the combo grammar
 *  reads cast history with; this registry keeps only its rune alphabet. */
export function resolveInvocation(runes: string[]): InvocationRule | null {
  for (let i = 0; i < INVOCATIONS.length; i++) {
    if (matchSeqRule(runes, RULE_VIEWS[i], (p, s) => s === p) > 0) return INVOCATIONS[i];
  }
  return null;
}
