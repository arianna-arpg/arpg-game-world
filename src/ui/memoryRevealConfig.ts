import type { MemoryUnlockTier } from '../data/memoryUnlocks';

/** Presentation only. The Vault's ordinary investment path owns every grant. */
export const MEMORY_REVEAL_CFG = {
  defaultMode: 'cinematic' as 'cinematic' | 'instant',
  autoplayPreview: true,
  durationMs: 2600,
  settleGuardMs: 250,
  previewWaitMs: 8000,
  reelCards: 22,
  resultIndex: 18,
  cardWidth: 126,
  cardGap: 14,
  poolPageSize: 40,
  tiers: {
    discovery: { rolling: 'A memory takes shape', title: 'Memory discovered', color: '#8adbd8',
      benefit: 'Permanently added to your account’s find and selection pools.',
      note: 'Find or select this Memory during play to use it. Discovery does not grant a gem to your current inventory.' },
    secondary: { rolling: 'A memory awakens', title: 'Skill awakened', color: '#e9c784',
      benefit: 'Skill-tree investment and commissioning are now available for this skill.',
      note: 'Skill levels, ability points and vendor service requirements still apply.' },
  } satisfies Record<MemoryUnlockTier, { rolling: string; title: string; color: string; benefit: string; note: string }>,
};
