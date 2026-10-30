import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import type { MemoryCandidate, MemoryReceipt } from '../meta/memoryUnlocks';
import { MEMORY_REVEAL_CFG } from './memoryRevealConfig';

export function memoryPresentation(memory: Pick<MemoryReceipt, 'kind' | 'id'>) {
  const skill = memory.kind === 'skill' ? SKILLS[memory.id] : undefined;
  const support = memory.kind === 'support' ? SUPPORTS[memory.id] : undefined;
  const def = skill ?? support;
  return { ...memory, name: def?.name ?? memory.id, description: def?.description ?? 'This Memory is no longer in the current catalog.',
    color: def?.color ?? '#b8b6c8', tags: skill?.tags ?? support?.requiresTags ?? [],
    face: skill ?? { name: def?.name ?? memory.id, color: def?.color ?? '#b8b6c8', icon: 'support' },
    skillId: skill?.id };
}

/** Normalize by the largest weight to avoid overflow with authored multipliers. */
export function memoryPoolOdds(pool: readonly MemoryCandidate[]): (MemoryCandidate & { chance: number })[] {
  const max = pool.reduce((n, c) => Math.max(n, c.weight), 0);
  const total = pool.reduce((n, c) => n + c.weight / max, 0);
  return pool.map(c => ({ ...c, chance: (c.weight / max) / total }));
}

export function memoryChanceLabel(chance: number): string {
  const percent = chance * 100;
  return percent > 0 && percent < .001 ? '<0.001%' : `${Number(percent.toFixed(3))}%`;
}

/** Decorative, deterministic reel. Never consumes the game's random stream,
 * never chooses or grants a reward; its landing is the committed receipt. */
export function memoryRevealReel(receipt: MemoryReceipt, pool: readonly MemoryCandidate[]) {
  const count = Math.max(1, Math.floor(MEMORY_REVEAL_CFG.reelCards));
  const landing = Math.max(0, Math.min(count - 1, Math.floor(MEMORY_REVEAL_CFG.resultIndex)));
  let seed = receipt.sequence;
  for (const c of `${receipt.kind}:${receipt.id}`) seed = (Math.imul(seed, 31) + c.charCodeAt(0)) >>> 0;
  const cards = Array.from({ length: count }, (_, i) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return i === landing || !pool.length ? receipt : pool[seed % pool.length];
  });
  return { cards, landing };
}
