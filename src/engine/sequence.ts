// ---------------------------------------------------------------------------
// THE CADENCE FABRIC — one sequence-matcher for every cast grammar.
//
// The game speaks several cadence vocabularies, each with its own verb:
//   · SkillDef.comboChain  EXECUTES a sequence (one key walks Unisect →
//     Bisect → Trisect; the chain is the cast).
//   · SkillDef.castCycle   COUNTS one skill's own uses (every Nth press
//     imbues; the counter is skill-local).
//   · SkillDef.invokes     BANKS a resource (elemental casts mint runes;
//     the invoke burns the sequence for a payload).
//   · requiresStatus /     consume marks on the TARGET (set-up-and-spend
//     consumesStatus        across bodies, not across time).
//   · THE COMBO GRAMMAR    READS the caster's own recent-cast history:
//     patterns over the tags of the last N real casts — order, variety,
//     repetition, timing — pay off through existing status/proc machinery.
//
// The first four EXECUTE or SPEND; the grammar only OBSERVES. What they all
// share is the MATCHING MATH, and that lives here exactly once:
// matchSeqRule / resolveSeqRules are the one sequence matcher in the game —
// data/invocations.ts resolves rune weaves through it, and the combo
// grammar resolves cast patterns through it. New grammars (grab-verb
// combos, future beat-clock readers) consume the same functions with their
// own symbol alphabet; nobody writes a second tail-walker.
//
// THE COMBO GRAMMAR, concretely:
//   · Every actor MAY carry a small recent-cast ring (Actor.castRing).
//     Recording is NULL-COST until something opts in: the world records
//     only while `comboWatch` holds — any equipped ComboRuleDef (the
//     combo_<id> stat family, grantable by passives / vocation nodes /
//     equipMods / affixes exactly like proc_<id>), or any live modifier
//     conditioned on comboVaried/comboRepeated. Non-combo builds keep an
//     empty ring and byte-identical sim baselines.
//   · ComboRuleDef (registry in data/combos.ts) is pure data: ONE pattern
//     kind per rule — an ordered tail `seq`, a `counts` multiset, `vary`
//     (last n pairwise-distinct under a key), `repeat` (last n equal) —
//     plus a timing `within`, an `icd`, and an owner-scoped ProcEffect
//     payoff executed through THE proc pipeline (World.executeProc): no
//     second payoff executor exists. Floating text + flash come free.
//   · Completing a pattern CONSUMES its span per-rule (bookkeeping only —
//     the shared ring never mutates): the same casts can't pay the same
//     rule twice unless the rule opts into `overlap` rolling matches.
//   · comboVaried / comboRepeated are ordinary ConditionIds ("30% more
//     damage while your last three casts were all different skills") —
//     the cheap starter any modifier source can ride with no plumbing.
//   · The alphabet is the SkillTag vocabulary on the records, so future
//     state verbs (grab, throw — the grab-fabric kinship) join patterns
//     the day their skills carry tags: no matcher changes.
//
// Docs: docs/engine/combo.md. Probe: balance/probe_combo.ts.
// ---------------------------------------------------------------------------

import type { SkillTag } from './stats';
import type { ProcEffect } from '../data/procs';

// ------------------------------------------------------------ the matcher --

/** One rule for the generic matcher. Exactly ONE pattern kind decides per
 *  rule, checked in fixed order: seq, else counts, else vary, else repeat,
 *  else minLen. (This preserves the invocation registry's historical
 *  semantics: a rule's tail-sequence check never falls through to its own
 *  counts.) `gate` additionally screens every symbol of a vary/repeat/
 *  minLen span; seq and counts carry their own per-step predicates. */
export interface SeqRule<P> {
  /** Matches when the sequence ENDS with symbols fitting these, in order. */
  seq?: readonly P[];
  /** Matches when a tail of the sequence holds at least these counts (any
   *  order; each symbol satisfies at most one row, first fitting row). */
  counts?: readonly { p: P; n: number }[];
  /** Matches when the last `n` symbols are pairwise DISTINCT under keyOf. */
  vary?: { n: number };
  /** Matches when the last `n` symbols are all EQUAL under keyOf. */
  repeat?: { n: number };
  /** Fallback: matches when the sequence holds at least this many symbols. */
  minLen?: number;
  /** vary/repeat/minLen only: every symbol in the span must also fit this. */
  gate?: P;
}

/**
 * THE sequence matcher. Tests one rule against a symbol sequence and
 * returns the matched SPAN — how many tail symbols form the match — or 0
 * for no match. `fit` decides whether a pattern element accepts a symbol;
 * `keyOf` names a symbol for vary/repeat identity (required only when a
 * rule uses those kinds).
 */
export function matchSeqRule<S, P>(
  syms: readonly S[], rule: SeqRule<P>,
  fit: (p: P, s: S) => boolean,
  keyOf?: (s: S) => string,
): number {
  const n = syms.length;
  if (rule.seq) {
    const want = rule.seq;
    if (n < want.length) return 0;
    for (let i = 0; i < want.length; i++) {
      if (!fit(want[i], syms[n - want.length + i])) return 0;
    }
    return want.length;
  }
  if (rule.counts) {
    // Walk backward until every row is satisfied — the minimal tail is the
    // span (the whole-sequence boolean matches the historical check).
    const left = rule.counts.map(r => r.n);
    let need = 0;
    for (const r of rule.counts) need += r.n;
    if (need <= 0) return 0;
    for (let i = n - 1; i >= 0; i--) {
      for (let r = 0; r < rule.counts.length; r++) {
        if (left[r] > 0 && fit(rule.counts[r].p, syms[i])) {
          left[r]--; need--;
          break;
        }
      }
      if (need === 0) return n - i;
    }
    return 0;
  }
  if (rule.vary) {
    const k = rule.vary.n;
    if (k < 2 || n < k || !keyOf) return 0;
    const seen = new Set<string>();
    for (let i = n - k; i < n; i++) {
      if (rule.gate && !fit(rule.gate, syms[i])) return 0;
      seen.add(keyOf(syms[i]));
    }
    return seen.size === k ? k : 0;
  }
  if (rule.repeat) {
    const k = rule.repeat.n;
    if (k < 2 || n < k || !keyOf) return 0;
    const key = keyOf(syms[n - 1]);
    for (let i = n - k; i < n; i++) {
      if (rule.gate && !fit(rule.gate, syms[i])) return 0;
      if (keyOf(syms[i]) !== key) return 0;
    }
    return k;
  }
  if (rule.minLen !== undefined) {
    if (n < Math.max(1, rule.minLen)) return 0;
    if (rule.gate) for (const s of syms) if (!fit(rule.gate, s)) return 0;
    return n;
  }
  return 0;
}

/** Ranked resolution: first matching rule of an ordered (most-specific-
 *  first) list wins — the invocation registry's contract. Returns the rule
 *  and its span, or null. */
export function resolveSeqRules<S, P, R extends SeqRule<P>>(
  syms: readonly S[], rules: readonly R[],
  fit: (p: P, s: S) => boolean,
  keyOf?: (s: S) => string,
): { rule: R; span: number } | null {
  if (!syms.length) return null;
  for (const rule of rules) {
    const span = matchSeqRule(syms, rule, fit, keyOf);
    if (span > 0) return { rule, span };
  }
  return null;
}

// ------------------------------------------------------- the cast record --

/** One completed REAL use in an actor's recent-cast ring. `tags` is the
 *  def's own (stable) tag array by reference — never copied, never
 *  mutated. `seq` is the actor's monotonic cast counter: per-rule consume
 *  bookkeeping compares seqs so the shared ring itself never mutates. */
export interface CastRecord {
  sid: string;
  tags: readonly SkillTag[];
  at: number;
  seq: number;
}

export const COMBO_CFG = {
  /** Ring capacity — history beyond this is forgotten (oldest first). */
  ringCap: 10,
  /** Seconds between comboWatch re-evaluations at the record site (the
   *  throng-rebake cadence: socketing a grammar reaches the ring within
   *  a beat, and everyone else pays one cached check per cast). */
  watchRefresh: 1,
  /** comboVaried/comboRepeated: run length and freshness window. */
  conditionRun: 3,
  conditionWindow: 6,
  /** Rules that don't author their own pacing. */
  defaultIcd: 0.25,
  defaultWithin: 6,
  /** HUD: seconds the fired-glow pulse lasts at the bar chip. */
  hudGlow: 0.9,
} as const;

// ------------------------------------------------------- the combo rules --

/** How vary/repeat name a cast for identity. 'skill' = the skill id;
 *  'element' = the first elemental tag in canonical order (fire, cold,
 *  lightning, chaos), else 'physical', else 'none' — AUTHORED tags, never
 *  rolled numbers: the grammar must be readable at the bar, so it speaks
 *  the same tag language the gems print; 'lane' = attack / spell / move /
 *  other. */
export type ComboKeyBy = 'skill' | 'element' | 'lane';

/** One step (or gate) of a combo pattern: predicates over a record's tags
 *  and id. All present clauses must hold. */
export interface ComboStep {
  /** The cast must carry ALL of these tags. */
  tags?: SkillTag[];
  /** The cast must carry AT LEAST ONE of these tags. */
  anyTags?: SkillTag[];
  /** The cast must carry NONE of these tags. */
  notTags?: SkillTag[];
  /** Exact skill id (rare — prefer the tag grammar). */
  skillId?: string;
}

/**
 * A COMBO GRAMMAR as data (registry: data/combos.ts). Grantable exactly
 * like a proc: the `combo_<id>` stat (base 0) equips it — any passive
 * node, vocation node, equipMods skill, or affix with
 * mod(comboStat(id), 'flat', 1) opts the build in; the same modifier on a
 * MonsterDef opts a monster in (enemies reuse player grammars verbatim).
 * Payoffs are owner-scoped ProcEffects through the ONE proc executor —
 * grant a buff, restore, bank a charge, tick cooldowns — never a second
 * pipeline. Target-requiring effects (status/extraHit/...) are refused by
 * the validator: the grammar completes on a CAST, not a hit.
 */
export interface ComboRuleDef {
  id: string;
  name: string;
  color: string;
  /** The sheet/tooltip line for the combo_<id> stat. */
  blurb: string;
  /** Ordered tail: the last steps.length casts fit these, in order. */
  seq?: ComboStep[];
  /** Multiset: a recent tail holds at least these counts, any order. */
  counts?: { step: ComboStep; n: number }[];
  /** The last n casts pairwise-distinct under `by`. */
  vary?: { n: number; by: ComboKeyBy };
  /** The last n casts identical under `by` (default 'skill'). */
  repeat?: { n: number; by?: ComboKeyBy };
  /** vary/repeat only: each cast of the span must also fit this. */
  gate?: ComboStep;
  /** Seconds the whole matched span must fit inside, measured to the
   *  completing cast (default COMBO_CFG.defaultWithin). Scaled live by
   *  the owner's comboWindow stat. */
  within?: number;
  /** Seconds between firings (default COMBO_CFG.defaultIcd). */
  icd?: number;
  /** Rolling matches: skip the consume-span rule (icd still paces).
   *  Default off — a completed pattern spends its casts and must re-form. */
  overlap?: boolean;
  /** The payoff — an OWNER-scoped effect through World.executeProc. */
  effect: ProcEffect;
}

/** The stat id whose value equips this grammar (the proc_<id> idiom). */
export function comboStat(id: string): string {
  return 'combo_' + id;
}

const ELEMENT_ORDER = ['fire', 'cold', 'lightning', 'chaos'] as const;

/** A cast's identity under a ComboKeyBy. */
export function castKey(r: CastRecord, by: ComboKeyBy): string {
  if (by === 'skill') return r.sid;
  if (by === 'element') {
    for (const t of ELEMENT_ORDER) if (r.tags.includes(t)) return t;
    return r.tags.includes('physical') ? 'physical' : 'none';
  }
  if (r.tags.includes('attack')) return 'attack';
  if (r.tags.includes('spell')) return 'spell';
  if (r.tags.includes('movement')) return 'move';
  return 'other';
}

/** Does a record fit a step's predicates? */
export function fitStep(step: ComboStep, r: CastRecord): boolean {
  if (step.skillId && r.sid !== step.skillId) return false;
  if (step.tags) for (const t of step.tags) if (!r.tags.includes(t)) return false;
  if (step.anyTags && !step.anyTags.some(t => r.tags.includes(t))) return false;
  if (step.notTags) for (const t of step.notTags) if (r.tags.includes(t)) return false;
  return true;
}

/** Rule → generic SeqRule view (pattern precedence documented on SeqRule). */
function seqView(rule: ComboRuleDef): SeqRule<ComboStep> {
  return {
    seq: rule.seq,
    counts: rule.counts?.map(c => ({ p: c.step, n: c.n })),
    vary: rule.vary, repeat: rule.repeat, gate: rule.gate,
  };
}

function keyFnOf(rule: ComboRuleDef): ((r: CastRecord) => string) | undefined {
  const by = rule.vary?.by ?? rule.repeat?.by ?? (rule.repeat ? 'skill' : undefined);
  return by ? (r: CastRecord) => castKey(r, by) : undefined;
}

/**
 * Match one grammar against a ring at `now`. Returns the matched span (0 =
 * no match). The whole span must sit inside the rule's timing window
 * (records ascend in time, so testing the OLDEST suffices);
 * `windowScale` is the owner's live comboWindow multiplier.
 */
export function matchComboRule(
  ring: readonly CastRecord[], rule: ComboRuleDef, now: number, windowScale = 1,
): number {
  const span = matchSeqRule(ring, seqView(rule), fitStep, keyFnOf(rule));
  if (span <= 0) return 0;
  const within = (rule.within ?? COMBO_CFG.defaultWithin) * Math.max(0.05, windowScale);
  return ring[ring.length - span].at >= now - within ? span : 0;
}

/**
 * HUD progress toward a grammar: pips lit of pips total. Honest about the
 * live tail — for `seq`, the longest tail matching a PREFIX of the
 * pattern; for vary/repeat, the current qualifying run; for counts, rows
 * satisfied by the in-window tail. Purely presentational — firing truth is
 * matchComboRule alone.
 */
export function comboProgress(
  ring: readonly CastRecord[], rule: ComboRuleDef, now: number, windowScale = 1,
): { lit: number; len: number } {
  const within = (rule.within ?? COMBO_CFG.defaultWithin) * Math.max(0.05, windowScale);
  const n = ring.length;
  const fresh = (i: number): boolean => ring[i].at >= now - within;
  if (rule.seq) {
    const len = rule.seq.length;
    for (let k = Math.min(len, n); k >= 1; k--) {
      let ok = fresh(n - k);
      for (let i = 0; ok && i < k; i++) {
        if (!fitStep(rule.seq[i], ring[n - k + i])) ok = false;
      }
      if (ok) return { lit: k, len };
    }
    return { lit: 0, len };
  }
  const keyOf = keyFnOf(rule);
  if (rule.vary && keyOf) {
    const len = rule.vary.n;
    const seen = new Set<string>();
    let lit = 0;
    for (let i = n - 1; i >= 0 && lit < len; i--) {
      if (!fresh(i) || (rule.gate && !fitStep(rule.gate, ring[i]))) break;
      const k = keyOf(ring[i]);
      if (seen.has(k)) break;
      seen.add(k); lit++;
    }
    return { lit, len };
  }
  if (rule.repeat && keyOf) {
    const len = rule.repeat.n;
    let lit = 0;
    for (let i = n - 1; i >= 0 && lit < len; i--) {
      if (!fresh(i) || (rule.gate && !fitStep(rule.gate, ring[i]))) break;
      if (keyOf(ring[i]) !== keyOf(ring[n - 1])) break;
      lit++;
    }
    return { lit, len };
  }
  if (rule.counts) {
    let len = 0;
    for (const c of rule.counts) len += c.n;
    const left = rule.counts.map(c => c.n);
    let lit = 0;
    for (let i = n - 1; i >= 0 && lit < len; i--) {
      if (!fresh(i)) break;
      for (let r = 0; r < rule.counts.length; r++) {
        if (left[r] > 0 && fitStep(rule.counts[r].step, ring[i])) {
          left[r]--; lit++;
          break;
        }
      }
    }
    return { lit, len };
  }
  return { lit: 0, len: 1 };
}

// ------------------------------------------- the starter conditions -------

/** The last COMBO_CFG.conditionRun casts used all-different skills, the
 *  run fresh within the condition window. The comboVaried ConditionId's
 *  truth — computed at record time, held on a countdown (see Actor). */
export function comboVariedNow(ring: readonly CastRecord[], now: number): boolean {
  const k = COMBO_CFG.conditionRun;
  const n = ring.length;
  if (n < k) return false;
  if (ring[n - k].at < now - COMBO_CFG.conditionWindow) return false;
  const seen = new Set<string>();
  for (let i = n - k; i < n; i++) seen.add(ring[i].sid);
  return seen.size === k;
}

/** The last COMBO_CFG.conditionRun casts repeated ONE skill, fresh within
 *  the condition window — comboRepeated's truth. */
export function comboRepeatedNow(ring: readonly CastRecord[], now: number): boolean {
  const k = COMBO_CFG.conditionRun;
  const n = ring.length;
  if (n < k) return false;
  if (ring[n - k].at < now - COMBO_CFG.conditionWindow) return false;
  for (let i = n - k; i < n - 1; i++) if (ring[i].sid !== ring[n - 1].sid) return false;
  return true;
}
