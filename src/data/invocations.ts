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

/** First matching rule for a banked sequence (rules are ordered most-
 *  specific first). Null only for an empty sequence. */
export function resolveInvocation(runes: string[]): InvocationRule | null {
  if (!runes.length) return null;
  for (const rule of INVOCATIONS) {
    if (rule.seq) {
      if (runes.length < rule.seq.length) continue;
      const tail = runes.slice(-rule.seq.length);
      if (!rule.seq.every((r, i) => tail[i] === r)) continue;
      return rule;
    }
    if (rule.counts) {
      let ok = true;
      for (const [r, n] of Object.entries(rule.counts)) {
        if (runes.filter(x => x === r).length < (n ?? 0)) { ok = false; break; }
      }
      if (!ok) continue;
      return rule;
    }
    if (runes.length >= (rule.minRunes ?? 1)) return rule;
  }
  return null;
}
