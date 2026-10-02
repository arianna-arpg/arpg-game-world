// ---------------------------------------------------------------------------
// THE AGENT's dials (src/agent/) — a mind that plays a hero through the same
// input artery a person does (World.applyInputs). Every number the agent
// weighs lives here; the PROFILES are named temperaments over those numbers,
// so a capture rig, a playtest bot or a future companion picks a temperament
// by id instead of forking code. Contract: docs/engine/agent.md.
// ---------------------------------------------------------------------------

/** One temperament: how a hero agent likes to fight. Distances are world
 *  units; times are seconds; weights are relative (they only rank choices). */
export interface AgentProfile {
  /** Where the agent stands relative to its focus: 'close' presses into
   *  melee reach, 'band' holds a range band (kites inside it), 'hold' stands
   *  its ground and turns. */
  stance: 'close' | 'band' | 'hold';
  /** The preferred standoff for 'band' (the kit's own reach caps it). */
  band: number;
  /** Fraction of the band treated as too close (retreat) / too far (advance). */
  bandLow: number;
  bandHigh: number;
  /** Extra gap past touching radii at which a 'close' stance stops advancing. */
  meleeGap: number;
  /** How far the agent looks for a fight at all. */
  sight: number;
  /** Step out of a telegraphed blast when one will land on us (BehaviorSpec
   *  dodge's read: World.imminentThreatTo). */
  dodge: boolean;
  /** Use a movement skill to leave a blast when walking would be too slow. */
  dodgeWithSkills: boolean;
  /** Life share below which defensive buffs, heals and flasks outrank damage. */
  hurt: number;
  /** Life share below which the agent breaks off and backs away (0 = never). */
  retreat: number;
  /** Skill choice weights per role (ranked with the live situation). */
  weights: Partial<Record<AgentRole, number>>;
  /** Reward per extra body an area skill would catch at its best aim point. */
  perExtraTarget: number;
  /** Seconds between voluntary re-picks of the same opener/buff (upkeep). */
  upkeep: number;
  /** Hold the primary (slot 0) as a mouse button between choices, as a
   *  person filling time with a basic attack would. */
  holdPrimary: boolean;
  /** Seconds of jitter-free calm after a press before another voluntary
   *  press (keeps the hand readable; 0 = as fast as the engine allows). */
  pace: number;
}

/** What a slot is for, read off the skill's own data (src/agent/kit.ts). */
export type AgentRole =
  | 'strike'     // melee / cone: hits what stands in reach
  | 'shot'       // projectile / target / mark: one line or one body at range
  | 'area'       // ground / storm / detonate: a placed footprint
  | 'nova'       // around the caster
  | 'summon'     // raises allies
  | 'aura'       // toggled / reserved standing effect
  | 'buff'       // self cast without damage (wards, stances, buffs)
  | 'heal'       // restores life (flasks included)
  | 'move'       // dash / leap / blink / carom
  | 'construct'  // traps, mines, totems, sentries
  | 'ultimate';  // a super art (SkillDef.ultimate)

export const AGENT_CFG = {
  /** Padding added to telegraph radii when reading a blast (dodge). */
  threatPad: 18,
  /** Below this ETA a walk cannot clear the blast: a movement skill is used. */
  dodgeSkillEta: 0.35,
  /** Radius over which foes count as one cluster for area aim. */
  clusterRadius: 120,
  /** Area skills with no data radius read this footprint. */
  defaultArea: 90,
  /** Reach used for a slot whose skill names none. */
  defaultReach: 300,
  /** A melee slot counts as in reach within its range plus this slack. */
  strikeSlack: 18,
  /** Steering: whisker length and the angles tried when the straight line is blocked. */
  whisker: 46,
  whiskerAngles: [0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8] as readonly number[],
  /** A directive 'move' counts as arrived within this distance. */
  arrive: 14,
  /** Hold time for a 'charge' press before releasing even if the bar is short. */
  chargeMax: 2.4,
  /** Perfect-cast window: press again at this bar fraction. */
  perfectAt: 0.8,
  /** Seconds a channel is held when chosen autonomously. */
  channelHold: 2.2,
  /** Thirsty flasks (GateSpec.missing) are only drunk below this life share. */
  flaskBelow: 0.6,
};

/** The temperaments. 'auto' picks one from the bar (src/agent/agent.ts). */
export const AGENT_PROFILES: Record<string, AgentProfile> = {
  brawler: {
    stance: 'close', band: 0, bandLow: 0.8, bandHigh: 1.15, meleeGap: 14, sight: 900,
    dodge: true, dodgeWithSkills: true, hurt: 0.45, retreat: 0,
    weights: { ultimate: 9, area: 4, nova: 5, strike: 3, shot: 2, move: 2.5, summon: 4, aura: 6, buff: 3, heal: 8, construct: 2 },
    perExtraTarget: 1.1, upkeep: 6, holdPrimary: true, pace: 0.05,
  },
  skirmisher: {
    stance: 'band', band: 210, bandLow: 0.75, bandHigh: 1.2, meleeGap: 20, sight: 950,
    dodge: true, dodgeWithSkills: true, hurt: 0.5, retreat: 0.2,
    weights: { ultimate: 9, area: 4, nova: 2, strike: 2.5, shot: 3.5, move: 2, summon: 4, aura: 6, buff: 3, heal: 8, construct: 3 },
    perExtraTarget: 1.0, upkeep: 6, holdPrimary: true, pace: 0.05,
  },
  caster: {
    stance: 'band', band: 260, bandLow: 0.7, bandHigh: 1.15, meleeGap: 24, sight: 1000,
    dodge: true, dodgeWithSkills: true, hurt: 0.5, retreat: 0.25,
    weights: { ultimate: 9, area: 5, nova: 3, strike: 1, shot: 3, move: 2, summon: 4, aura: 6, buff: 3, heal: 8, construct: 3 },
    perExtraTarget: 1.3, upkeep: 6, holdPrimary: true, pace: 0.05,
  },
  summoner: {
    stance: 'band', band: 300, bandLow: 0.7, bandHigh: 1.2, meleeGap: 30, sight: 1000,
    dodge: true, dodgeWithSkills: true, hurt: 0.55, retreat: 0.3,
    weights: { ultimate: 9, summon: 7, area: 4, nova: 2.5, strike: 1, shot: 2.5, move: 1.5, aura: 6, buff: 3, heal: 8, construct: 4 },
    perExtraTarget: 1.1, upkeep: 5, holdPrimary: false, pace: 0.05,
  },
  /** For capture rigs: unhurried, never retreats, never wastes the frame. */
  cinematic: {
    stance: 'band', band: 220, bandLow: 0.65, bandHigh: 1.25, meleeGap: 16, sight: 1100,
    dodge: true, dodgeWithSkills: false, hurt: 0.3, retreat: 0,
    weights: { ultimate: 10, area: 5, nova: 5, strike: 3, shot: 3, move: 1, summon: 5, aura: 6, buff: 2, heal: 6, construct: 3 },
    perExtraTarget: 1.4, upkeep: 8, holdPrimary: true, pace: 0.12,
  },
};
