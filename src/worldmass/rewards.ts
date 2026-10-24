import { SUPPORTS } from '../data/supports';
import { SKILLS } from '../data/skills';
import type { SupportGemPayload } from '../engine/items';
import { canonical } from './random';

/** Historical descriptor types only. New expeditions never issue these offers. */
export interface MassRewardSpec {
  source: string;
  /** Native events which can earn this shared, bounded treasure budget.
   * Omission preserves historical cache-only expeditions. */
  earnFrom?: ('cache' | 'puzzle')[];
  /** Ordinary pool, gated again by the account and live equipped kit. */
  supports: string[];
  /** Explicit physical treasures: usable this life without unlocking random drops.
   * Omission retains the older account-only reward contract. */
  authoredSupports?: string[];
  level: number;
  maxRewards: number;
}
export interface MassRewardChoice { gem: SupportGemPayload; hosts: string[] }
export interface MassRewardSave {
  source: string; label: string; choices: MassRewardChoice[]; claimed?: string;
}
export function validateMassRewards(spec: MassRewardSpec): void {
  const triggers = spec.earnFrom;
  if (triggers !== undefined && (!Array.isArray(triggers) || !triggers.length || triggers.length > 2
    || new Set(triggers).size !== triggers.length || triggers.some(v => !['cache','puzzle'].includes(v))))
    throw new Error('Invalid exploration reward triggers');
  const authored = spec.authoredSupports;
  if (authored !== undefined && !Array.isArray(authored)) throw new Error('Invalid authored exploration treasures');
  const pool = [...(Array.isArray(spec.supports) ? spec.supports : []), ...(authored ?? [])];
  if (!spec.source || !Number.isSafeInteger(spec.level) || spec.level < 1 || spec.level > 20
    || !Number.isSafeInteger(spec.maxRewards) || spec.maxRewards < 1 || spec.maxRewards > 16
    || !Array.isArray(spec.supports) || !pool.length || pool.length > 64
    || new Set(pool).size !== pool.length
    || pool.some(id => typeof id !== 'string' || !Object.hasOwn(SUPPORTS, id))) throw new Error('Invalid exploration reward policy');
}

/** Read-only compatibility for saved experimental offers and receipts.
 * There is no earning, claim, item-minting or UI path. Owned items live in the
 * ordinary inventory and skill sockets and are deliberately unaffected. */
export class LegacyMassRewardArchive {
  private entries: MassRewardSave[] = [];
  constructor(spec: MassRewardSpec | undefined, saved?: MassRewardSave[]) {
    if (spec) validateMassRewards(spec);
    if (!saved) return;
    if (!spec || !Array.isArray(saved) || saved.length > spec.maxRewards
      || new Set(saved.map(r => r.source)).size !== saved.length) throw new Error('Invalid exploration rewards');
    const pool = [...spec.supports, ...(spec.authoredSupports ?? [])];
    for (const row of saved) {
      if (!row.source || typeof row.label !== 'string' || row.label.length > 200
        || !Array.isArray(row.choices) || !row.choices.length || row.choices.length > pool.length
        || new Set(row.choices.map(c => c.gem.supportId)).size !== row.choices.length
        || row.claimed !== undefined && !row.choices.some(c => c.gem.supportId === row.claimed))
        throw new Error('Invalid exploration reward receipt');
      for (const c of row.choices) {
        const g = c.gem, def = SUPPORTS[g.supportId];
        if (g.kind !== 'support' || !pool.includes(g.supportId) || g.level !== spec.level
          || !Array.isArray(c.hosts) || !c.hosts.length || c.hosts.length > 32 || c.hosts.some(id => !SKILLS[id]))
          throw new Error('Invalid exploration reward choice');
        const axes = def.rollBase?.axes ?? [];
        if (axes.length ? !g.rolled || Object.keys(g.rolled).length !== axes.length
          || axes.some(a => !a.rows.some(r => r.id === g.rolled![a.id])) : g.rolled !== undefined)
          throw new Error('Invalid exploration reward cut');
      }
    }
    this.entries = JSON.parse(canonical(saved));
  }
  snapshot(): MassRewardSave[] { return JSON.parse(canonical(this.entries)); }
}
