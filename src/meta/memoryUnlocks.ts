import { MEMORY_UNLOCK_CFG, MEMORY_UNLOCKS, type MemoryKind, type MemorySecondaryMechanic, type MemoryUnlockDef } from '../data/memoryUnlocks';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { FEATURE, gemDropKey, isSkillUnlockedForDrop, isSupportUnlockedForDrop, type Account } from './account';

export interface MemoryCandidate { kind: MemoryKind; id: string; name: string; weight: number }
export interface MemoryReceipt { sequence: number; kind: MemoryKind; id: string; tier: 'discovery' | 'secondary' }
export const memoryKey = (kind: MemoryKind, id: string): string => `${kind}:${id}`;
export const memoryUnlockDef = (id: string): MemoryUnlockDef | undefined => MEMORY_UNLOCKS.find(r => r.id === id);

/** Authored drop eligibility, independent of account, level or old bundle lists. */
export function memoryCatalog(): MemoryCandidate[] {
  return [
    ...Object.values(SKILLS).filter(s => !s.noDrop && (s.dropWeight ?? 100) > 0)
      .map(s => ({ kind: 'skill' as const, id: s.id, name: s.name, weight: s.dropWeight ?? 100 })),
    ...Object.values(SUPPORTS).filter(s => s.weight > 0)
      .map(s => ({ kind: 'support' as const, id: s.id, name: s.name, weight: s.weight })),
  ].filter(c => !MEMORY_UNLOCK_CFG.excluded.includes(memoryKey(c.kind, c.id)));
}

export function memoryDiscovered(a: Account, kind: MemoryKind, id: string): boolean {
  return kind === 'skill' ? isSkillUnlockedForDrop(a, id) : isSupportUnlockedForDrop(a, id);
}

export function memorySecondaryOwned(a: Account, kind: MemoryKind, id: string): boolean {
  return a.memorySecondary.has(memoryKey(kind, id))
    || (MEMORY_UNLOCK_CFG.debugCodexBypassesSecondary && a.features.has(FEATURE.UNLOCK_ALL_GEMS));
}

/** One switch per mechanic; future prestige consumers use this same read. */
export function memorySecondaryOpen(a: Account, kind: MemoryKind, id: string, mechanic: MemorySecondaryMechanic): boolean {
  return !MEMORY_UNLOCK_CFG.secondary.mechanics[mechanic] || !MEMORY_UNLOCK_CFG.secondary.kinds.includes(kind)
    || memorySecondaryOwned(a, kind, id);
}

export function memoryCommissionReady(a: Account, kind: MemoryKind, id: string, need: number): boolean {
  if (!memoryDiscovered(a, kind, id)) return false;
  return MEMORY_UNLOCK_CFG.secondary.mechanics.commission && MEMORY_UNLOCK_CFG.secondary.kinds.includes(kind)
    ? memorySecondaryOwned(a, kind, id) : (a.ledger[gemDropKey(id)] ?? 0) >= need;
}

export function memoryUnlockCandidates(a: Account, def: MemoryUnlockDef): MemoryCandidate[] {
  if (def.tier === 'secondary' && !MEMORY_UNLOCK_CFG.secondary.vault) return [];
  return memoryCatalog().filter(c => def.tier === 'discovery'
    ? !memoryDiscovered(a, c.kind, c.id)
    : MEMORY_UNLOCK_CFG.secondary.kinds.includes(c.kind)
      && memoryDiscovered(a, c.kind, c.id) && !memorySecondaryOwned(a, c.kind, c.id))
    .map(c => ({ ...c, weight: def.weights[c.kind]
      * (MEMORY_UNLOCK_CFG.weighting === 'drop' ? c.weight : 1)
      * (MEMORY_UNLOCK_CFG.weightOverrides[memoryKey(c.kind, c.id)] ?? 1) }))
    .filter(c => Number.isFinite(c.weight) && c.weight > 0);
}

/** Called only for a completed, funded purchase. Empty pools consume nothing. */
export function grantMemoryUnlock(a: Account, def: MemoryUnlockDef, random = Math.random): MemoryReceipt | null {
  const pool = memoryUnlockCandidates(a, def);
  if (!pool.length) return null;
  const roll = random();
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) return null;
  let cursor = roll * pool.reduce((sum, c) => sum + c.weight, 0);
  const picked = pool.find(c => { cursor -= c.weight; return cursor < 0; }) ?? pool[pool.length - 1];
  if (def.tier === 'discovery') {
    (picked.kind === 'skill' ? a.unlockedSkills : a.unlockedSupports).add(picked.id);
  } else a.memorySecondary.add(memoryKey(picked.kind, picked.id));
  const receipt = { sequence: (a.memoryReceipts[def.id]?.sequence ?? 0) + 1,
    kind: picked.kind, id: picked.id, tier: def.tier };
  a.memoryReceipts[def.id] = receipt;
  return receipt;
}

/** Genuine minted/remembered legendary skills only; never purchases or transfers. */
export function awakenMemoryFromDrop(a: Account, id: string, rarity?: string): boolean {
  if (!MEMORY_UNLOCK_CFG.secondary.legendaryFinds || !MEMORY_UNLOCK_CFG.secondary.kinds.includes('skill')
    || rarity !== 'legendary' || !SKILLS[id] || SKILLS[id].noDrop) return false;
  const key = memoryKey('skill', id);
  if (a.memorySecondary.has(key)) return false;
  // A regional or fixed find may legitimately precede global discovery.
  a.unlockedSkills.add(id);
  a.memorySecondary.add(key);
  return true;
}

/** Mirrors the session host's gate on remote clients, without copying its account. */
export type MemoryAccess = Partial<Record<MemorySecondaryMechanic, string[] | null>>;
export function memoryAccessView(a: Account): MemoryAccess {
  return Object.fromEntries(Object.entries(MEMORY_UNLOCK_CFG.secondary.mechanics).map(([mechanic, gated]) => [mechanic,
    !gated || !MEMORY_UNLOCK_CFG.secondary.kinds.includes('skill')
      || (MEMORY_UNLOCK_CFG.debugCodexBypassesSecondary && a.features.has(FEATURE.UNLOCK_ALL_GEMS))
      ? null : [...a.memorySecondary].filter(k => k.startsWith('skill:')).map(k => k.slice(6)),
  ]));
}
