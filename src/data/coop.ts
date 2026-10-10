// ---------------------------------------------------------------------------
// CO-OP TUNING — global enemy stat scaling by live player count, so the game
// stays balanced as a party grows. ONE tunable table; everything reads through
// coopScale(). Life scales FASTER than damage on purpose: a bigger party brings
// more DPS, so enemies need more HP to chew through — but spiking their damage
// would just one-shot people, which feels worse than a longer fight.
//
// coopScale(1) === {0,0}, so single-player is byte-identical: the 'partyScale'
// stat source is never even set when there's one player.
// ---------------------------------------------------------------------------

export const COOP_SCALING = {
  /** Added enemy max-life per EXTRA player, as a 'more' multiplier (0.55 = +55%). */
  lifePerPlayer: 0.55,
  /** Added enemy damage per EXTRA player, as a 'more' multiplier. */
  damagePerPlayer: 0.15,
  /** Players past this don't add scaling (a 5th hero is "free"). */
  maxScaledPlayers: 4,
  /** THE NEAR LAW (docs/design/shard-world.md card 8): the radius, in px,
   *  within which seats COUNT as party for a kill's XP, an enemy's party
   *  scale and the keeper's mercy. 0 = the whole world — solo and every
   *  co-op lane keep their byte-identical world-wide party; a hosted shard
   *  sets its own radius at boot (SHARD_CFG.nearRadius), since strangers a
   *  continent apart share no fight. */
  shareRadius: 0,
};

/** Life/damage 'more' fractions for a given live player count.
 *  1p → {0,0}; 2p → {0.55,0.15}; 3p → {1.10,0.30}; 4p+ → {1.65,0.45}. */
export function coopScale(count: number): { life: number; damage: number } {
  const extra = Math.max(0, Math.min(count, COOP_SCALING.maxScaledPlayers) - 1);
  return {
    life: COOP_SCALING.lifePerPlayer * extra,
    damage: COOP_SCALING.damagePerPlayer * extra,
  };
}
