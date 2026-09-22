import { FEATURE, LEDGER_BOUNTY_CRAFT_DONE, questDoneKey } from '../meta/account';

export const BRANDT_HAMMER_QUEST = 'brandt_hammer';
export const BRANDT_TROPHY_QUEST = 'brandt_trophy';

/** Brandt's early account ladder. Deeds qualify a Vault purchase; they never
 * silently buy a service. Quest and reward tuning share these authored dials. */
export const BRANDT_CFG = {
  magicWares: {
    unlock: 'feat_brandt_magic_wares', flag: FEATURE.BRANDT_MAGIC_WARES,
    cost: 200, ledger: LEDGER_BOUNTY_CRAFT_DONE, required: 10,
    label: 'Brandt: Magic Wares',
  },
  rareWares: {
    unlock: 'feat_brandt_rare_wares', flag: 'brandt_rare_wares', cost: 350,
    ledger: questDoneKey(BRANDT_HAMMER_QUEST), label: 'Brandt: Rare Wares',
  },
  quest: { offerLevels: [9, 12], level: 10, choices: 3, monster: 'cindermaw_toolthief' },
  stock: {
    baseRarities: ['common'],
    upgrades: [
      { feature: FEATURE.BRANDT_MAGIC_WARES, rarities: ['magic'] },
      { feature: 'brandt_rare_wares', rarities: ['rare'] },
    ],
    memoriesRequire: FEATURE.VENDOR_GEMS,
  },
} as const;
