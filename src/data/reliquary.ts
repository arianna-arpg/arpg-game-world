/** Best-first value windows as fractions of an affix's account-scale maximum.
 * Every window opens at the family's debut; item level never raises its budget. */
interface RelicAffixTier {
  floor: number;
  ceiling: number;
  weight: number;
  magicOnly?: boolean;
}

/** Account progression tuning. Costs are quadratic; power is linear. */
export const RELIQUARY_CFG = {
  attunement: 'oracle_reliquary_attuned',
  costBase: 25,
  powerPerRank: 0.02,
  xpPenaltyPerCell: 0.02,
  toggleCalmSeconds: 5,
  // A numerical guard, not a practical progression ceiling.
  maxRank: 1000000,
  baseline: 0.2,
  uniqueEquipLimit: 1,
  affixTiers: [
    { floor: 1, ceiling: 1.03, weight: 35, magicOnly: true },
    { floor: 0.85, ceiling: 1, weight: 100 },
  ] as RelicAffixTier[],
  // Discovery widens the pool; earlier families remain available at full power.
  affixDebut: {
    relic_area: 5, relic_projectile_speed: 5, relic_duration: 5,
    relic_minion_damage: 5, relic_minion_life: 5,
    relic_dmg_aoe: 5, relic_dmg_fire: 5, relic_dmg_cold: 5, relic_dmg_lightning: 5,
    relic_crit: 5, relic_crit_multi: 5,
    relic_all_res: 9, relic_cooldown: 9, relic_luck: 9, relic_dmg_chaos: 9,
    relic_planted: 9,
    relic_leech: 12, relic_dmg_channel: 12, relic_dmg_construct: 12,
    relic_dmg_conjure: 12, relic_dmg_javelin: 12,
    relic_reprisal: 12, relic_recovery: 12,
    relic_execution: 16, relic_escape: 16,
    relic_opportunist: 20, relic_recharge: 20, relic_pursuit: 20,
    relic_variety: 24, relic_repetition: 24,
  } as Record<string, number>,
  minion: { levelFactor: 1, baseDamage: 0.35, baseLife: 0.6, empowerment: 1,
    ordinaryStats: 0 },
};

/** Explicit numeric opt-in. Unknown/structural stats remain unchanged. Caps
 * bound each line's contribution, never the player's complete stat. */
export const RELIC_SCALABLE: Record<string, number> = {
  life: Infinity, mana: Infinity, energyShield: Infinity, armor: Infinity,
  evasion: Infinity, damage: Infinity, minionDamage: Infinity, minionLife: Infinity,
  accuracy: Infinity, lifeRegen: Infinity, manaRegen: Infinity,
  aoeRadius: 2, projectileSpeed: 2, effectDuration: 3,
  attackSpeed: 2, castSpeed: 2, moveSpeed: 1, critChance: 0.5, critMulti: 3,
  fireRes: 0.75, coldRes: 0.75, lightningRes: 0.75, chaosRes: 0.75,
  cooldownRecovery: 2, lifeLeech: 0.1, luck: 1,
  firePen: 0.5, coldPen: 0.5, lightningPen: 0.5, chaosPen: 0.5,
  extraAs_fire: 1, extraAs_cold: 1, extraAs_lightning: 1, extraAs_chaos: 1,
  thorns: Infinity, thornsToHit: 1, channelMobility: 0.5,
  statusMagnitude: 2, overheal: 0.5, healPower: 2, restorePower: 2,
  procPower_relic_guard_refrain: 2, procPower_relic_wayfarer: 2, procPower_relic_widows_wick: 2,
};
