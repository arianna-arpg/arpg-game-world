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
  affixFloor: 0.85,
  // New families may opt into later discovery without increasing their values.
  affixDebut: { relic_area: 5, relic_projectile_speed: 5, relic_duration: 5,
    relic_all_res: 9, relic_cooldown: 9, relic_leech: 12 } as Record<string, number>,
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
};
