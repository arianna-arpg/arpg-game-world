// ---------------------------------------------------------------------------
// DEFENSE TUNING — the one table behind the defensive-layer mechanics.
//
// Everything here is a GLOBAL RULE constant (how armor curves, how evasion
// entropy windows work, what a poise break applies). Everything PER-ACTOR —
// pool sizes, reduction percentages, regen rates, taper times — is a stat in
// STAT_DEFS instead, so gear, passives, statuses, and auras can all move it.
// The split is deliberate: rules live here, numbers live on the sheet.
//
// This module imports nothing, so any engine file may read it freely.
// ---------------------------------------------------------------------------

export const DEFENSE_CFG = {
  /** ARMOR — PoE-shaped hyperbolic mitigation with NO hard cap:
   *  reduction = armor / (armor + k × hit). Small hits bounce off high armor
   *  (reduction → 1 as the hit shrinks); enormous hits punch through
   *  (reduction falls as the hit grows). The curve self-limits below 100%,
   *  so no clamp ever flattens investment. `k` sets the pivot: an armor pool
   *  of k × hit mitigates 50% of that hit. */
  armor: {
    k: 6,
  },

  /** RESISTANCES — two ceilings, both movable:
   *  - SOFT cap: the per-element `<elem>ResMax` stat (base 75%) — raisable
   *    by passives/gear ("+5% to maximum fire resistance").
   *  - HARD cap: this absolute rule ceiling the soft cap itself clamps to,
   *    so no stack of maximums ever reaches immunity.
   *  Raw resistance stats are UNCAPPED on the sheet — overcap is real and
   *  buffers against shred (Despair bites the overcap first). Every consumer
   *  reads through resistValue(), which applies both ceilings at query time. */
  resistance: {
    hardCap: 0.9,
    /** PENETRATION digs below the cap — but never below this floor, so
     *  "takes double damage" is reachable and "takes infinite" is not. */
    floor: -0.75,
  },

  /** EVASION — deterministic ENTROPY instead of independent rolls: each
   *  incoming attack adds its chance-to-hit to a per-victim accumulator; the
   *  hit lands only when the accumulator crosses 1 (then pays 1 back). High
   *  evasion thus evades the OPENING burst of a window in succession, then
   *  lets hits trickle through on schedule — no lucky streaks, no unlucky
   *  ones, and true immunity is impossible.
   *  `windowReset`: seconds without being attacked before the accumulator
   *  re-seeds randomly (a fresh fight reads fresh). `weight` scales how hard
   *  evasion rating leans against accuracy; `minHitChance` floors the
   *  attacker (the anti-immunity rule, mirror of the resistance hard cap). */
  evasion: {
    weight: 0.3,
    minHitChance: 0.2,
    windowReset: 4,
  },

  /** POISE — the break-bar (Fortitude's pool). While it stands, the bearer
   *  shrugs stagger: `poiseDR` less hit damage and `poiseCcAvoid` chance to
   *  ignore hard CC (both stats). Every hit drains it:
   *  drain = hit × drainRatio + drainFlat, × the ATTACKER's poiseDamage stat
   *  (so poise-breaker builds are a tag-filtered investment, not code).
   *  At zero it BREAKS: the bearer loses the benefits, wears `breakStatus`,
   *  and stays broken until the pool regenerates back past `rearmFrac` of
   *  max. Recovery rate/delay are stats (poiseRegenPct / poiseRegenDelay). */
  poise: {
    drainRatio: 0.5,
    drainFlat: 1,
    breakStatus: 'sundered',
    rearmFrac: 0.35,
    /** The SMOOTH WEAR dial: poiseDR scales with the remaining bar, from
     *  full reduction at a full bar down to drFloor × DR at a sliver — so
     *  protection erodes readably as the bar chips instead of vanishing in
     *  one cliff at the break. 1 restores the old flat behavior; 0 is a
     *  fully linear fade. The break itself still matters: Sundered lands,
     *  the CC shrug lapses, and the poise-weight anchor lets go. */
    drFloor: 0.35,
    /** Bosses hold their ground by default: a poise pool seeded at spawn
     *  when their def declares none (base + perLevel × level). */
    bossBase: 120,
    bossPerLevel: 6,
  },

  /** ENDURANCE — the break-less pool (D4-Fortify / LE-Endurance shape):
   *  while it holds, hits are reduced by enduranceDR flat — no wear, no
   *  break status, no CC shrug, no weight anchor (poise owns those). The
   *  pool spends what it PREVENTS (× spendRatio): 100 endurance at 20% DR
   *  absorbs 100 damage-worth of protection, then the wall is simply gone.
   *  Refill: a lean delay-gated trickle (stats) + FORTIFY effects. */
  endurance: {
    spendRatio: 1,
  },

  /** INSIGHT — the momentum-fed avoidance pool (Charisma's pool): reading
   *  the enemy's body language and pre-emptively slipping the brunt. On each
   *  incoming hit, up to insightDR × momentum of the damage is avoided by
   *  SPENDING the pool (insightEfficiency damage per point). Momentum is 1
   *  while moving and tapers to 0 over the insightTaper stat's seconds after
   *  stopping — sprint in, unleash under the lingering window, move again.
   *  The pool only refills WHILE moving (insightRegenPct × momentum).
   *  `graceWindow`: seconds of standing still before the taper starts —
   *  matches the stance system's "on the move" breath. */
  insight: {
    graceWindow: 0.15,
  },

  /** WEIGHT — how shovable a body is. Knockback impulses and crowd
   *  separation divide by the victim's `weight` stat (heavy things barely
   *  budge; light things fly). Monsters default their weight from body
   *  radius — weight = (radius / refRadius) ^ radiusPow — unless their def
   *  sets `base.weight` explicitly. `min` floors the divisor so a
   *  weight-shredding debuff can't produce infinite launches. The `phasing`
   *  stat (> 0) exempts an actor from body collision entirely. */
  weight: {
    min: 0.05,
    refRadius: 14,
    radiusPow: 1.4,
    /** POISE IS MASS: each point of CURRENT (unbroken) poise multiplies
     *  effective weight by this much — a poised colossus is an anchor, a
     *  BROKEN one is suddenly shovable. Actor.effectiveWeight() is the one
     *  read; pushes and crowd separation both honour it. */
    perPoise: 0.012,
  },
} as const;
