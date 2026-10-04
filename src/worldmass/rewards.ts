import type { World } from '../engine/world';
import { SUPPORTS } from '../data/supports';
import { SKILLS } from '../data/skills';
import { isSupportUnlockedForDrop } from '../meta/account';
import { supportFitsInstOrCrew, type SupportInstance } from '../engine/skills';
import { mintSupportInstance, veinLines } from '../engine/supportbase';
import { makeSupportGemItem, packSupportGemPayload } from '../engine/gemitems';
import { autoPlace } from '../engine/inventory';
import type { SupportGemPayload } from '../engine/items';
import { canonical, massRandom } from './random';

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
const instance = (gem: SupportGemPayload): SupportInstance =>
  ({ def: SUPPORTS[gem.supportId], level: gem.level, ...(gem.rolled ? { rolled: gem.rolled } : {}) });

/** Read the actual equipped skills and native socket gate, including summon crews.
 * No class list, attribute grants, free sockets or account unlocks. */
export function explorationRewardHosts(world: World, gem: SupportInstance): string[] {
  return world.player.skills.flatMap(inst => inst && inst.sockets.includes(null)
    && world.meetsRequirements(inst.def.id)
    && supportFitsInstOrCrew(gem.def, inst, world.summonCrewSkills(inst), gem.rolled) ? [inst.def.id] : []);
}

/** Choices are earned once at a native discovery, then remain an owned entitlement.
 * Saving the native payload fixes rolled cuts; UI reads never mint or reroll. */
export class MassRewards {
  private entries: MassRewardSave[] = [];
  constructor(readonly spec: MassRewardSpec | undefined, readonly seed: number, saved?: MassRewardSave[]) {
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
  admits(kind: 'cache' | 'puzzle'): boolean { return !!this.spec && (this.spec.earnFrom ?? ['cache']).includes(kind); }
  earn(world: World, source: string, label: string): boolean {
    const spec = this.spec;
    if (!spec || this.entries.length >= spec.maxRewards || this.entries.some(r => r.source === source)) return false;
    const authored = new Set(spec.authoredSupports ?? []);
    const choices = [...spec.supports, ...authored].flatMap(id => {
      if (!authored.has(id) && !isSupportUnlockedForDrop(world.account, id)) return [];
      const rng = massRandom(this.seed, [spec.source, source, id]);
      const gem = mintSupportInstance(SUPPORTS[id], spec.level, () => rng.next());
      const hosts = explorationRewardHosts(world, gem);
      return hosts.length ? [{ gem: packSupportGemPayload(gem), hosts }] : [];
    });
    if (!choices.length) return false; // No compatible kit: leave the budget for a later discovery.
    this.entries.push({ source, label, choices });
    return true;
  }
  get pending(): boolean { return this.entries.some(r => !r.claimed); }
  offers(world: World) {
    return this.entries.filter(r => !r.claimed).map(r => ({
      source: r.source, label: r.label,
      choices: r.choices.map(c => {
        const gem = instance(c.gem), hosts = explorationRewardHosts(world, gem);
        return { id: gem.def.id, name: gem.def.name, description: [gem.def.description,
          ...(gem.def.rollBase ? veinLines(gem.def.rollBase, gem.rolled) : [])].join(' '),
          hosts: hosts.map(id => SKILLS[id].name),
          originalHosts: c.hosts.map(id => SKILLS[id].name), level: gem.level };
      }),
    }));
  }
  /** Historical receipt, never a claim that the gem remains in the pack or fitted. */
  receipts() {
    return this.entries.flatMap(r => {
      const choice = r.choices.find(c => c.gem.supportId === r.claimed);
      if (!choice) return [];
      const gem = instance(choice.gem);
      return [{ source: r.source, label: r.label, name: gem.def.name,
        description: [gem.def.description,
          ...(gem.def.rollBase ? veinLines(gem.def.rollBase, gem.rolled) : [])].join(' '),
        level: gem.level }];
    });
  }
  claim(world: World, source: string, choice: string): 'claimed' | 'full' | 'refused' {
    const row = this.entries.find(r => r.source === source && !r.claimed);
    const c = row?.choices.find(c => c.gem.supportId === choice);
    if (!row || !c) return 'refused';
    const item = makeSupportGemItem(instance(c.gem));
    if (!autoPlace(world.meta.items, item)) return 'full';
    row.claimed = choice; // Mutate last; a full pack leaves the complete offer intact.
    return 'claimed';
  }
  snapshot(): MassRewardSave[] { return JSON.parse(canonical(this.entries)); }
}
