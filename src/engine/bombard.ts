// ============================================================================
// THE BOMBARDMENT FABRIC — off-screen artillery presence as data.
//
// A body whose MonsterDef wears `bombard` is a STANDING GUN: on its own
// jittered clock it lobs its named skill at the war — perception-free (the
// battery does not need to SEE you; the front knows where you are — the
// Diablo-2 catapult law), through the ONE pipeline (World.useSkill), so
// telegraphs, dodge-AI reads, mitigation, occlusion attitude and kill credit
// all arrive standard. The fabric is ORCHESTRATION ONLY: cadence + target
// choice. Everything else — scatter, warning time, damage, the falling-shot
// look — is the skill's own data.
//
// THE LAWS:
//  - ONE CLOCK PER GUN. Each wearer rolls its own next-shot time
//    (Actor.bombardAt). Killing a gun removes exactly its share of the rain —
//    the barrage thins emergently, no rate table anywhere.
//  - THE SKILL IS THE SHOT. `skillId` MUST name a skill in the wearer's own
//    def kit (validated at content lint): the cast spends the same instance
//    the brain would, so cooldowns arbitrate between the fabric's far shot
//    and the brain's aimed close-defense, and a part-break that
//    `breakDisables` the skill SILENCES the gun (the crippled hulk still
//    stands, still counts for the objective, and must still be torn down).
//  - THE RAIN FOLLOWS YOU. An enemy-team gun shells a random living player
//    SEAT (couch/co-op included). A player-OWNED gun serves its keeper:
//    it shells hostiles pressing the owner (within `assistRadius`), never
//    a far pack the owner isn't fighting.
//  - REFUSAL IS A RETRY, NEVER A CRASH. useSkill said no (mid-cast, on
//    cooldown, silenced, held) → re-roll a short retry, ask again.
//  - SANCTUARY IS QUIET. Safe ground takes no shellfire; dormant un-roused
//    emplacements keep their powder (the sentry fabric's own gate).
//
// Faction-agnostic by construction: the spec never says "demon" — a future
// dwarf-hold mortar line, a sieging warband, or the player's own planted
// engine (a construct-minion def wearing `bombard`) all ride the same rows.
// ============================================================================

/** One standing gun's orchestration row (MonsterDef.bombard). */
export interface BombardSpec {
  /** The shot — MUST be one of the wearer def's own `skills` (content-linted;
   *  the fabric casts the wearer's real instance, cooldown-arbitrated). */
  skillId: string;
  /** Seconds between shots, re-rolled uniform per shot — the "nearly random
   *  interval" the player feels. */
  cadence: [number, number];
  /** First-shot delay after the gun stands up (default BOMBARD_CFG.opening) —
   *  guns range in; a fresh arrival is never alpha-struck at the door. */
  opening?: [number, number];
  /** Player-owned wearers: shell hostiles within this of the OWNER
   *  (default BOMBARD_CFG.assistRadius). Enemy wearers ignore it. */
  assistRadius?: number;
}

export const BOMBARD_CFG = {
  /** Default first-shot delay window (seconds) after a gun stands up. */
  opening: [2.5, 6] as [number, number],
  /** A refused cast (busy / cooldown / silenced / held) re-asks this soon. */
  retrySec: 0.8,
  /** Default owner-assist reach for player-owned guns. */
  assistRadius: 460,
  /** IMPACT DRESS (the transient battlefield): max standing blast-dress
   *  doodads per zone — planting past the cap starts the OLDEST drying
   *  (the ground never accretes without limit; the transience doctrine). */
  dressCap: 90,
  /** Blast-dress drying: dwell window [min,max] seconds (rolled per pock)
   *  when the delivery's own `evapAfter` is silent, then contraction rate. */
  dressDwell: [45, 90] as [number, number],
  dressEvapRate: 7,
  /** Blast-dress footprint: fraction of the impact radius, clamped. */
  dressRadiusFrac: 0.55,
  dressRadiusMin: 10,
  dressRadiusMax: 26,
};
