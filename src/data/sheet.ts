// ---------------------------------------------------------------------------
// THE CHARACTER SHEET AS DATA — organization, visibility, and prose for the
// stat panel, with zero UI knowledge. Three registries:
//
//   SHEET_CATS      the nested tabs below Attributes (Offense / Defense /
//                   Sustain / Skills / Minions / Misc), each seating its
//                   stats in display order. `core` rows anchor a tab —
//                   always printed, the classic sheet. `used` rows surface
//                   only while their compiled value differs from the
//                   authored base: INVESTMENT REVEALS THEM, so a sheet
//                   shows the build that's actually being played instead
//                   of a wall of untouched dials.
//   SHEET_FAMILY_SEATS  generated stat families (apply_<status>, convert_*,
//                   orbOnKill_<orb>...) seat by PREFIX — one row here covers
//                   however many ids the minting registry produces, and the
//                   shared blurb serves any of them the tooltip meets.
//   STAT_BLURBS     the player-facing one-liner for every static stat,
//                   assigned into STAT_DEFS (UI reads STAT_DEFS[id].desc —
//                   one registry, any surface). Deliberately mechanical-
//                   but-unnumbered: curves live in defense.ts/damage.ts and
//                   retune freely without staling a word here.
//
// Stats seated NOWHERE auto-fold into SHEET_FALLBACK_CAT once modified —
// nothing a build touches is ever invisible, and forgetting to seat a new
// stat degrades to a Misc row, never to silence. balance/probe_sheet.ts
// audits the whole weave (unknown ids, double seats, unseated statics,
// missing blurbs) — run it after touching this file or adding stats.
// ---------------------------------------------------------------------------

import { STAT_DEFS } from '../engine/stats';
import { PROCESSION } from './carriedFields';

export interface SheetCategoryDef {
  /** Tab label — keep it one short word; six tabs share the panel width. */
  label: string;
  /** One muted line under the strip while this tab is active. */
  blurb: string;
  /** Rows that ALWAYS print on this tab, in display order. */
  core: string[];
  /** Rows that print only while non-base (or under "show unused"). */
  used: string[];
}

/** The tab registry, in display order (insertion order = tab order). Open
 *  like every registry: a package may add a category or push seats into an
 *  existing one at module load. */
export const SHEET_CATS: Record<string, SheetCategoryDef> = {
  offense: {
    label: 'Offense',
    blurb: 'How hard, how true, and how often your hits land.',
    core: ['attackSpeed', 'castSpeed', 'accuracy', 'critChance', 'critMulti'],
    used: [
      // The damage lanes
      'damage', 'addedPhysical', 'addedFire', 'addedCold', 'addedLightning', 'addedChaos',
      // Penetration & shred
      'armorPen', 'armorDamageFloor', 'firePen', 'coldPen', 'lightningPen', 'chaosPen', 'insightPen', 'esShred',
      // Ailments & curses
      'statusChance', 'statusMagnitude', 'ailmentStacks', 'dotPropagates',
      'dotCrit', 'hitToAffliction', 'afflictionYield',
      'curseRupture', 'dotRupture', 'doomDot', 'hedonism',
      // The breaker's lane
      'poiseDamage', 'sunderDuration', 'impalePower',
      // Position & execution
      'ambushBonus', 'proximityDamage', 'farShotDamage', 'cullThreshold', 'killProcOnHit',
      // The slayer lane — MORE damage keyed to what the victim IS, where on
      // it you struck, or what state you drove it into
      'overmatch', 'giantsbane', 'regicide', 'limbreaver', 'siegebreaker',
      'spentbane', 'uprooter', 'bondbreaker', 'quailbane',
      // Dice texture
      'damageSpread', 'luckyChance', 'unluckyChance', 'highRollWindow',
      'cannotMiss', 'critIgnoreRes', 'doubleDamageChance', 'overcritChance', 'overcritMulti', 'heftBlowChance', 'heftBlowScale', 'fellingChance',
      'overkillCarry', 'overkillRadius', 'cooldownPower', 'hitEchoFrac', 'hitEchoDelay', 'hitEchoAoe',
      'inertiaGain', 'inertiaDischarge', 'rivenChance', 'rivenPower', 'harmonyPower', 'ailmentReap', 'poiseOverflow',
      // Passes 10-12: Spliced Grafts, Elemental Arsenal & Class Masteries
      'bleedCullThreshold', 'bleedNonBleedLess', 'ailmentCrossSplice', 'multiAilmentMore',
      'synapticLinkDmg', 'statusAmplifyOnCrit', 'prismSinglePenalty', 'attritionRamp', 'attritionFirstPenalty',
      'goldenProcAmplify', 'trampleContactDps', 'blockBladeSlash', 'flaskBeastMode',
      'bounceDamageScale', 'bounceFirstPenalty', 'windfuryChance', 'shatterCritMult', 'shatterSplinter',
      'fateDiceBonus', 'overloadPower', 'tranceRamp', 'ruptureSeed', 'solsticePower',
      // Passes 13-14: Astrolabe Engines & Outer Constellations
      'materialOnlyMore', 'blockToDamage', 'surplusHitMore', 'lowManaHitLess', 'nonCritLess',
      'dualAilmentApply', 'ailmentMultiDot', 'staticDischargeMore', 'staticBasicLess',
      'chronoVsSlowMore', 'ambushBurstMore', 'ambushLowLifeLess', 'omniElemCascade', 'fatalPactPower',
      'fieldCarryMore', 'highRollShockChain',
      // Passes 16-17: Wolcen Gate of Fates Deep-Dive
      'virtuoseStance', 'cadenceFinisher', 'silverQuiverPower', 'smokeVeilPower', 'elemDestabPower',
      'occultStackMore', 'beaconPolarity', 'burnDetonatePower', 'equilibriumPower', 'trophyPower',
      'frostRicochet', 'neuralSparkPower', 'residualImprint', 'plagueDiffPower',
      // Passes 18-19: Voidling Bound Perks Deep-Dive
      'fueledRatePower', 'windburnPower', 'phaseStasisPower', 'tractorTetherPower', 'plasmaDisintPower',
      'critBlastPower', 'hypothermiaPower', 'poisonMeltPower',
      // Power from elsewhere
      'echoMight', 'reservedDamage', 'maxManaDamage', 'igniteToBomb',
      'tetherDamage', 'finalRoundDamage',
    ],
  },
  defense: {
    label: 'Defense',
    blurb: 'What meets a blow before your life does.',
    core: ['armor', 'evasion', 'blockChance', 'fireRes', 'coldRes', 'lightningRes', 'chaosRes'],
    used: [
      // Resistance ceilings & incoming-hit texture
      'fireResMax', 'coldResMax', 'lightningResMax', 'chaosResMax',
      'armorAppliesToElemental', 'flatHitReduction', 'grazeChance', 'grazeMitigation', 'grazeWard', 'traumaCost',
      'damageTaken', 'damageImmunity', 'debuffImmunity', 'critAvoid', 'ailmentResist', 'afflictionExpiry', 'lowLifeLine', 'strideReach',
      // Block & guard
      'blockPower', 'blockValue', 'guardStrength', 'guardParry', 'guardParryPower',
      'parryCounterBonus', 'parryDamageCooldown', 'guardHoldTime', 'guardianRecharge',
      'guardAegis', 'domeDeflects',
      // Energy shield
      'energyShield', 'esRechargeRate', 'esRechargeDelay', 'esRechargeSteadfast',
      'esDotResist', 'esDotBypass', 'lifeRegenToEs', 'manaShield',
      // Poise — the break-bar
      'poise', 'poiseDR', 'poiseCcAvoid', 'poiseRegenPct', 'poiseRegenDelay',
      'poiseRearmAt', 'poiseCalmDelay', 'poiseOnHit', 'poiseOvercharge',
      // Insight — the duelist's read
      'insight', 'insightDR', 'insightEfficiency', 'insightRegenPct', 'insightTaper',
      'insightInversion', 'insightStillTaper', 'insightSap',
      // Endurance — the break-less pool
      'endurance', 'enduranceDR', 'enduranceRegenPct', 'enduranceRegenDelay',
      // Ward & exotic soaks
      'wardDecay', 'wardGain', 'staggerFrac', 'staggerWindow', 'staggerPurge', 'staggerToWard', 'hitImmune', 'hitCap',
      'areaAvoidance',
      // The last gasp (the talent fabric's cheat-death lane)
      'lastGasp', 'lastGaspLife', 'lastGaspCooldown',
      // Body & substance
      'weight', 'phasing',
      // The stat-trade dials
      'evasionToArmor', 'evasionForgone', 'esToPoise', 'esForgone',
      'evasionToInsight', 'evasionToInsightForgo', 'lifeToEs', 'lifeForgone',
      // Retaliation
      'thorns', 'thornsReflect', 'thornsToHit', 'channelThorns', 'minionShare',
      'carapaceHitGain', 'moltShrapnel', 'karmaReflect',
      'evadeSurgeOnHurt', 'fullEsDR', 'direDeferral', 'armorThornsScale', 'burstStaggerPct', 'salvatoryCounter',
      'cryoCocoonPower', 'lithicFissurePower', 'blockIntegratePower',
    ],
  },
  sustain: {
    label: 'Sustain',
    blurb: 'What flows back: regeneration, leech, and every gain.',
    core: ['lifeRegen', 'manaRegen'],
    used: [
      'lifeRegenPct', 'manaRegenPct',
      // On-hit / leech
      'lifeOnHit', 'lifeLeech', 'lifeLeechToEs', 'overleechWard', 'overleechPersist', 'manaLeech', 'esLeech', 'wardLeech', 'esOnHit',
      // On-kill
      'lifeOnKill', 'manaOnKill', 'esOnKill',
      // On-block / on-evade
      'lifeOnBlock', 'lifeOnEvade',
      // Wound recovery & healing economy
      'recuperate', 'recuperateTime', 'healPower', 'absorbPower', 'healTaken', 'overheal',
      'restorePower', 'restorePctMax', 'vampiricShare', 'bondShare', 'guardMend',
      'recentDmgHeal', 'atonementHeal', 'tempestMendPulse', 'overhealToWard', 'flaskBlockCharge', 'dawnConsecrate',
      'livingTidesPower', 'burnFeastPower', 'bleedTransfusePower',
      // Resource plumbing
      'esToMana', 'conduitRate', 'conduitEfficiency', 'costToLife', 'costToMana',
      'orbShedRate',
      // Overdrive — the debt economy
      'overdriveCap', 'overdriveIdleDelay', 'overdriveRecovery', 'overdriveRecoveryFlat',
      'overdriveFlow', 'overdriveLifeFactor',
    ],
  },
  skills: {
    label: 'Skills',
    blurb: 'The shape, count, cost and cadence of your casts.',
    core: ['aoeRadius', 'effectDuration', 'cooldownRecovery'],
    used: [
      // Costs
      'satelliteCount', 'satelliteEquipmentCount', 'satelliteOrbit', 'satelliteSpeed', 'auroraCapacity', 'auroraRecharge', 'creeperSpeed',
      'manaCost', 'manaUseCost', 'addedManaCost', 'addedLifeCost', 'addedCooldown',
      'costDamage_mana', 'costDamage_life',
      'costWard_mana', 'costWard_life', 'costWardDuration', 'costWardCap',
      // THE GAUGE FABRIC (engine/gauge.ts): the bank's terms
      'gaugeGain', 'gaugeNeed', 'gaugeLockout',
      // Use-charges & ammunition
      'skillCharges', 'skillChargeRate', 'reloadSpeed', 'chargeCap', 'runeCap',
      // The combo grammar's timing lever & modifiable "Recently" window
      'comboWindow', 'recentlyWindow', 'chronoSiphon', 'recyclePower', 'energyExtractPower',
      // Projectiles — count & flight
      'projectileCount', 'projectileCountChance', 'projectileSpeed', 'projectileSize',
      'pierceCount', 'pierceDecay', 'chainCount', 'forkCount', 'projReturn', 'projNova', 'projPulse',
      'projShrapnel', 'projHitDetonate', 'projReShatter', 'returnShrapnel', 'projInherit',
      'projAccel', 'projBounce', 'projFrameBounce', 'projRecurve',
      'homingPower', 'erraticPower', 'spiralPower', 'orbitPower', 'spinPower',
      'weavePower', 'guidePower',
      // Firing styles
      'castAtCursor', 'fireSalvo', 'fireVolley', 'volleySpacing', 'spreadAngle',
      'randomArc', 'multiTarget',
      // Melee shaping
      'swingArc', 'meleeReach', 'meleeReverb', 'splashRadius',
      'meleeSweep', 'sweepRange', 'sweepSpeed',
      // Impact & control
      'knockback', 'displaceForce', 'knockBuffet', 'shoveAuthority', 'impactDamage',
      'gripPower', 'gripCrush', 'wriggle', 'trample', 'plyRend',
      // Areas & ground
      'aoeShape', 'aoeScatter', 'aoeCascade', 'cascadeStep', 'aoeSpin', 'pulseCount',
      'stormCount', 'stormImmediate', 'fissureCount', 'fissureBranches',
      'lingerField', 'hexBlast',
      // Channels & gauges
      'channelBurst', 'channelStorm', 'channelRamp', 'channelSpool', 'channelSpoolCap',
      'channelHitSpool', 'channelMobility', 'channelTurnRate', 'channelLockAim',
      'channelAutoSpin', 'channelPersist',
      'brimFill', 'brimDecay', 'brimPower', 'fuseDelay', 'fusePower',
      'overchargeStages', 'sparkWindow', 'sparkBonus',
      // Repeats & seals
      'repeatCount', 'repeatScale', 'repeatRetarget', 'repeatLock', 'unleashMax',
      // Triggers & procs
      'triggerChance', 'triggerThreshold', 'triggerPower', 'procDepth',
      // Movement casting
      'castMobility', 'moveExplode', 'moveTrail', 'departSplash', 'evadeDecoyBurst', 'phoenixBlinkNova',
      // Construct refraction
      'constructRefract', 'astralEchoBuff',
      // Field interplay & oddments
      'conduction', 'suffusion', 'poolCap', 'embedIcd', 'tetherWidth',
      PROCESSION.growth.stat,
      'bashPower', 'bashFloor', 'bashInvert', 'bashArmTime',
      'durationAuraCap', 'auraEsRecharge', 'auraEsDelay',
      'reflex', 'thirstless', 'tuneFavor',
      'pourPower_surge', 'pourPower_settle', 'pourPct_surge', 'pourPct_settle', 'pourPrime',
      'remnantChance', 'remnantOnCast',
      // Borrowed kits — the mimic's stolen arts and the possession seam's
      // ride (huskGuard defends the body you left behind, but it belongs
      // beside the two dials that decide the ride itself)
      'mimicWitness', 'mimicBank',
      'possessDuration', 'possessPower', 'huskGuard',
    ],
  },
  minions: {
    label: 'Minions',
    blurb: 'Everything you summon, plant, echo, or hire.',
    core: [],
    used: [
      'minionDamage', 'minionDamageForgone', 'minionLife', 'minionMaxCount', 'minionDamageTaken',
      'minionThreat', 'minionAreaAvoidance',
      'minionSize', 'minionMoveSpeed', 'minionHaste', 'minionRegen', 'minionRegenPct', 'minionRegenRate',
      'minionPlies', 'minionLifePlyTrade', 'minionLifePlyEcho', 'throngPockets', 'throngYield',
      'minionDetectionRange', 'minionDecayRate', 'minionDecayQuad', 'minionKindleBurn', 'minionKindleFire', 'minionMissingLifeFire', 'minionPyreTether', 'minionStruckFirePulse', 'minionRespawnTime', 'minionUndying',
      'minionGuard', 'minionSquad', 'minionAnchoredInvuln', 'minionDeathHeal', 'minionDeathHealFlat', 'minionExpiryIsDeath', 'minionDeathEffectPower',
      'minionExplodeDeath', 'minionExplodeLowLife', 'minionBloom', 'minionBloomPower',
      'minionLeechToOwner', 'ownerWoundsToMinion', 'minionInheritStatus', 'minionSplitOnLowLife', 'channelEffigyRate',
      'offeringPower', 'plagueWakeDps', 'undertakerPower', 'springBloomPower', 'pylonResonancePower',
      'summonCount', 'summonSequence', 'summonAtCursor', 'summonImpact', 'summonMend', 'summonWard',
      'sacrificeMinions', 'targetMinionFallback', 'corpseBatch', 'offeringShare',
      'commandDiscipline',
      PROCESSION.escort.stat,
      // Constructs & totems
      'constructMaxCount', 'constructCastRate', 'constructTaunt', 'castAsTotem',
      'totemPlaceTime',
      // Echoes — ghosts that cast YOUR skills (deliberately not minions,
      // but this is their household on the sheet)
      'mirageCount', 'mirageDamage',
      // The company lane — hired blades (likewise not minions; likewise
      // the tab a player looks at for the bodies fighting beside them)
      'mercRetinue', 'mercVigor', 'mercEase', 'mercHireDiscount',
    ],
  },
  misc: {
    label: 'Misc',
    blurb: 'Movement, presence, fortune, and anything else your build touches.',
    core: ['moveSpeed'],
    used: ['bodyMass', 'traction', 'detectability', 'concealment', 'noiseOnHit', 'threatGen', 'targetPriority', 'invisible', 'luck'],
  },
};

/** Resource pools shown above every statistics tab. */
export const SHEET_VITALS: string[] = ['life', 'mana'];

/** Generated stat families seat by PREFIX (the itemgen GENERATED_STAT
 *  pattern plus the load-time families): one entry covers however many ids
 *  the minting registry produces. Family rows are never core — they surface
 *  only while non-base, even under "show unused" (a hundred untouched
 *  apply_<status> dials is exactly the wall this file exists to fold away).
 *  The blurb serves any id of the family the tooltip meets. */
export interface SheetFamilySeat { prefix: string; cat: string; blurb: string; detail?: string }
export const SHEET_FAMILY_SEATS: SheetFamilySeat[] = [
  {
    prefix: 'carriedField_', cat: 'skills',
    blurb: 'Keeps this ground effect centered on you as you move.',
    detail: 'The field follows you and pulses at regular intervals. Its Vocation node describes what triggers extra pulses.',
  },
  ...['doctrine_', 'doctrineForm_', 'doctrineTrait_', 'transmute_'].map(prefix => ({
    prefix, cat: 'skills',
    blurb: 'Shapes a Vocation\'s combat doctrine or summon tradition according to the path you have chosen.',
    detail: 'Enables this Vocation specialization, tactical action, or minion inheritance rule as described on its Vocation node.',
  })),
  {
    prefix: 'summonPact_', cat: 'minions',
    blurb: 'Binds a summon pact that calls forth minions when its rite is fulfilled.',
    detail: 'Enables this summon pact. See the granting Vocation node for its trigger condition, minion reward, and active limits.',
  },
  {
    prefix: 'summonPactForm_', cat: 'minions',
    blurb: 'Determines the form taken by minions raised through a summon pact.',
    detail: 'Selects which minion variant is summoned when this pact triggers.',
  },
  {
    prefix: 'creeperCount_', cat: 'skills',
    blurb: 'Calls forth burrowing creepers that prowl nearby ground and erupt beneath your foes.',
    detail: 'Grants roaming creepers of this type that automatically pursue nearby enemies and erupt for area damage.',
  },
  {
    prefix: 'satelliteCount_', cat: 'skills',
    blurb: 'Surrounds you with orbiting manifestations that strike or ward as they circle.',
    detail: 'Grants orbiting satellites of this family. Additional satellites increase the count of families you already carry.',
  },
  {
    prefix: 'auroraCapacity_', cat: 'skills',
    blurb: 'Maintains a halo of stored charges overhead that loose themselves at nearby foes.',
    detail: 'Grants a rechargeable reservoir of this aurora that automatically fires stored projectiles at valid targets.',
  },
  {
    prefix: 'guardianCount_', cat: 'defense',
    blurb: 'Keeps warding sentinels at your side to intercept incoming projectiles.',
    detail: 'Grants projectile-intercepting guardians of this family, each recharging independently after use.',
  },
  {
    prefix: 'takenAs_', cat: 'defense',
    blurb: 'Turns a share of incoming blows into another element before your defenses meet them.',
    detail: 'Converts a percentage of incoming hit damage to another damage type before armor and resistances apply. Damage cannot be converted more than once.',
  },
  {
    prefix: 'relayStatus_', cat: 'defense',
    blurb: 'Turns an incoming affliction aside onto a nearby foe when one stands in reach.',
    detail: 'Redirects this incoming status effect to a nearby enemy. If no valid enemy is in range, the status applies to you normally.',
  },
  {
    prefix: 'apply_', cat: 'offense',
    blurb: 'Chance for your blows to lay this affliction upon the foe.',
    detail: 'Chance on hit to inflict this status effect.',
  },
  {
    prefix: 'applyWet_', cat: 'offense',
    blurb: 'Chance for your blows to lay this affliction upon foes soaked by water or rain.',
    detail: 'Chance on hit to inflict this status effect against Wet targets (wading, swimming, soaked, or in rain). Has no effect against dry targets.',
  },
  {
    prefix: 'damageVs_', cat: 'offense',
    blurb: 'Presses harder against foes already suffering under this affliction.',
    detail: 'Grants increased damage per stack of this status effect on the target.',
  },
  {
    prefix: 'popPower_', cat: 'offense',
    blurb: 'Deepens the rupture when a fresh application of this affliction detonates an existing one.',
    detail: 'Scales the burst damage dealt when reapplying this status effect detonates an active stack.',
  },
  {
    prefix: 'convert_', cat: 'offense',
    blurb: 'Turns a share of one damage type into another before the blow lands.',
    detail: 'Converts this percentage of one damage type into another. Converted damage scales with modifiers to the new type instead of the original.',
  },
  {
    prefix: 'gainAs_', cat: 'offense',
    blurb: 'Adds extra damage of one element based on a share of another damage type you deal.',
    detail: 'Gains this percentage of pre-conversion damage of the source type as extra damage of the target type, without reducing the original damage.',
  },
  {
    prefix: 'extraAs_', cat: 'offense',
    blurb: 'Carries an extra measure of this element alongside all damage you deal.',
    detail: 'Gains this percentage of all damage dealt as extra damage of this type, without reducing the original damage.',
  },
  {
    prefix: 'addedMin_', cat: 'offense',
    blurb: 'Steadies your hand by raising the lowest roll of this damage type.',
    detail: 'Adds flat minimum damage of this type, raising the bottom of the damage range without changing the maximum.',
  },
  {
    prefix: 'addedMax_', cat: 'offense',
    blurb: 'Raises the highest roll your blows can reach with this damage type.',
    detail: 'Adds flat maximum damage of this type, raising the top of the damage range without changing the minimum.',
  },
  {
    prefix: 'dotLeech_', cat: 'sustain',
    blurb: 'Draws a share of this affliction\'s ongoing damage back to you as life.',
    detail: 'Recovers life equal to this percentage of damage over time dealt by this status effect.',
  },
  {
    prefix: 'orbOnHit_', cat: 'sustain',
    blurb: 'Chance for a landed blow to shake loose a resource orb.',
    detail: 'Chance on hit to spawn this orb nearby for you or allies to collect.',
  },
  {
    prefix: 'orbOnKill_', cat: 'sustain',
    blurb: 'Chance for a slain foe to leave behind a resource orb.',
    detail: 'Chance on kill to spawn this orb at the slain enemy\'s position.',
  },
  {
    prefix: 'orbOnHurt_', cat: 'sustain',
    blurb: 'Chance for a wound you take to shake loose a resource orb.',
    detail: 'Chance when hit to spawn this orb nearby.',
  },
  {
    prefix: 'orbRefund_', cat: 'sustain',
    blurb: 'Increases what you recover when gathering this orb.',
    detail: 'Restores this amount when you pick up an orb of this type.',
  },
  {
    prefix: 'orbTrickle_', cat: 'sustain',
    blurb: 'Periodically sheds a resource orb a short step away from where you stand.',
    detail: 'Chance every few seconds to automatically spawn this orb a short distance away from you.',
  },
  {
    prefix: 'survivalEase_', cat: 'defense',
    blurb: 'Tempers the harshness of the elements, slowing the drain on this survival meter.',
    detail: 'Reduces the rate at which this environmental survival meter drains.',
  },
  {
    prefix: 'chargeCap_', cat: 'skills',
    blurb: 'Lets you hold more of this charge at once.',
    detail: 'Increases your maximum stack count for this charge type.',
  },
  {
    prefix: 'chargeRegen_', cat: 'skills',
    blurb: 'Builds this charge steadily over time on its own.',
    detail: 'Generates stacks of this charge automatically over time.',
  },
  {
    prefix: 'proc_', cat: 'skills',
    blurb: 'Chance for this triggered effect to activate when its condition is met.',
    detail: 'Chance to trigger this effect when its condition occurs, subject to its internal cooldown.',
  },
  {
    prefix: 'combo_', cat: 'skills',
    blurb: 'Rewards weaving your skills in a specific rhythm or sequence.',
    detail: 'Enables this skill-sequence effect. Completing its cast sequence within the timing window triggers its bonus.',
  },
  {
    prefix: 'classSkill_', cat: 'skills',
    blurb: 'Deepens your mastery of this calling\'s skill gems.',
    detail: 'Adds levels to all equipped skill gems belonging to this class.',
  },
  {
    prefix: 'slotgraft_', cat: 'skills',
    blurb: 'Lends a support gem\'s discipline to whichever compatible skill sits in that bar slot.',
    detail: 'Grants a built-in support gem to the skill bound to this hotbar slot. Has no effect if the seated skill does not match the support\'s required tags.',
  },
  {
    prefix: 'skillgrant_', cat: 'skills',
    blurb: 'Grants the use of this skill while worn, or strengthens the copy you already know.',
    detail: 'Grants this skill for manual or triggered use (using the item\'s own sockets), or adds levels to your learned copy if already equipped.',
  },
  {
    prefix: 'companiongrant_', cat: 'skills',
    blurb: 'Keeps a loyal follower at your side without claiming a skill slot or mana reservation.',
    detail: 'Summons and maintains an independent companion at this skill level with no hotbar slot or mana reservation required.',
  },
  {
    prefix: 'summonReservation_', cat: 'skills',
    blurb: 'Lightens or deepens the mana burden of keeping this summon in the field.',
    detail: 'Multiplies the mana reservation of this summon skill. At 0%, the summon requires no reservation.',
  },
  {
    prefix: 'seatPower_', cat: 'misc',
    blurb: 'Draws on its neighbors in the Reliquary, strengthening adjacent pieces or scaling its own power by the slots beside it.',
    detail: 'Active while placed in a Reliquary or container. Modifies the stats of adjacent pieces, or scales its own stats based on adjacent empty or occupied slots.',
  },
  {
    prefix: 'procPower_', cat: 'skills',
    blurb: 'Amplifies the force of this triggered effect whenever it fires.',
    detail: 'Increases the damage or magnitude of this triggered effect when it activates.',
  },
  {
    prefix: 'trailGrant_', cat: 'skills',
    blurb: 'Leaves a lingering wake across the ground behind your steps.',
    detail: 'Creates a short-lived ground effect along your movement path that scales with your skill modifiers.',
  },
  {
    prefix: 'pocketGrant_', cat: 'defense',
    blurb: 'Calls forth temporary sanctuaries on the battlefield that shelter those who step inside.',
    detail: 'Periodically creates temporary terrain refuges nearby that grant distinct bonuses while standing inside or outside them.',
  },
  {
    prefix: 'throngMorph_', cat: 'minions',
    blurb: 'Chance for a newly raised throng minion to take on a rarer form while keeping its training.',
    detail: 'Chance for a spawned throng minion to transform into another creature type while retaining its skill roster, commands, and scaling.',
  },
  {
    prefix: 'bequest_', cat: 'minions',
    blurb: 'Passes a share of your own natural attributes along to the minions you command.',
    detail: 'Grants eligible summoned minions a percentage of your base attribute bonuses.',
  },
  {
    prefix: 'remnantDrop_', cat: 'skills',
    blurb: 'Chance for your casts to leave behind an elemental remnant that empowers the next cast of its school.',
    detail: 'Chance on cast to spawn an elemental remnant nearby. Collecting it empowers your next skill of that element.',
  },
  {
    prefix: 'minionApply_', cat: 'minions',
    blurb: 'Lets your minions\' blows lay this affliction upon their prey.',
    detail: 'Chance for your minions\' hits to inflict this status effect.',
  },
  {
    prefix: 'sympathy_', cat: 'minions',
    blurb: 'Lets the restorative boons you claim echo across the bond to your minions.',
    detail: 'Shares a percentage of your flask effects, orbs, charges, and healing with your summoned minions.',
  },
  {
    prefix: 'wornThrong_', cat: 'minions',
    blurb: 'Gathers a brood of lesser kin that replenish at your side or wait nearby to be claimed.',
    detail: 'Periodically spawns or replenishes throng minions from your equipment. Higher ranks improve spawn rate and minion tier.',
  },
  {
    prefix: 'attune_', cat: 'misc',
    blurb: 'Resonates with this harmonic tone.',
    detail: 'Grants attunement to this resonance tone.',
  },
  {
    prefix: 'terraform_', cat: 'misc',
    blurb: 'Hastens the spread of this favored ground beneath your feet.',
    detail: 'Multiplies the growth speed of this terrain effect around you.',
  },
  {
    prefix: 'terraformFx_', cat: 'misc',
    blurb: 'Awakens the dormant combat power of this favored ground.',
    detail: 'Enables the combat effect of this terrain type while active.',
  },
];

/** Stats that never print, whatever their value — monster/AI-side dials the
 *  player sheet has no honest reading for. An escape hatch, kept tiny. */
export const SHEET_OMIT: Set<string> = new Set([
  'aiAimLead', 'aiAimJitter', 'aiTurnSpeed', 'detectionRange',
]);

/** Where an unseated, modified stat folds — the safety net, never the plan. */
export const SHEET_FALLBACK_CAT = 'misc';

const FAMILY_BY_PREFIX = new Map<string, SheetFamilySeat>(
  SHEET_FAMILY_SEATS.map(f => [f.prefix, f]),
);
const FAMILY_MULTI_PREFIXES = SHEET_FAMILY_SEATS.filter(
  f => f.prefix.indexOf('_') !== f.prefix.length - 1,
);

/** Precomputed seated stat set and category index for O(1) sheet/Codex lookups. */
export const SEATED_CAT_BY_STAT: ReadonlyMap<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [cat, def] of Object.entries(SHEET_CATS)) {
    for (const id of def.core) m.set(id, cat);
    for (const id of def.used) m.set(id, cat);
  }
  return m;
})();
const SEATED_STAT_SET: ReadonlySet<string> = (() => {
  const s = new Set<string>(SHEET_VITALS);
  for (const id of SEATED_CAT_BY_STAT.keys()) s.add(id);
  return s;
})();

let statRegistryOrder: Map<string, number> | null = null;
let statRegistryOrderLen = -1;
function getStatRegistryOrder(): Map<string, number> {
  const keys = Object.keys(STAT_DEFS);
  if (!statRegistryOrder || statRegistryOrderLen !== keys.length) {
    const m = new Map<string, number>();
    for (let i = 0; i < keys.length; i++) m.set(keys[i], i);
    statRegistryOrder = m;
    statRegistryOrderLen = keys.length;
  }
  return statRegistryOrder;
}

/** The family seat serving a generated id, if any. */
export function sheetFamilyOf(id: string): SheetFamilySeat | null {
  const u = id.indexOf('_');
  if (u < 0) return null;
  const hit = FAMILY_BY_PREFIX.get(id.slice(0, u + 1));
  if (hit) return hit;
  for (const fam of FAMILY_MULTI_PREFIXES) if (id.startsWith(fam.prefix)) return fam;
  return null;
}

/** The tooltip's one-liner for ANY stat id: the authored blurb, else the
 *  generated family's shared line. */
export function statBlurbOf(id: string): string | null {
  return STAT_DEFS[id]?.desc ?? sheetFamilyOf(id)?.blurb ?? null;
}

/** Explicit mechanical detail for Advanced/Full tooltip mode (Option A). */
export function statDetailOf(id: string): string | null {
  return STAT_DETAILS[id] ?? sheetFamilyOf(id)?.detail ?? null;
}

/** The resting compiled value of a stat nobody touched: the authored base
 *  through the def's own min/max clamp — StatSheet.get clamps the same way,
 *  so dials authored `base 0, min 0.5` (spec-seeded queries like overdrive
 *  and trigger thresholds) read as UNTOUCHED at their floor instead of
 *  looking invested on every fresh character. */
export function statRestingValue(id: string): number {
  const def = STAT_DEFS[id];
  if (!def) return 0;
  return Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, def.base));
}

/** "Has the build touched this?" — compiled value vs the resting value
 *  (base overrides and every modifier lane count as touching). */
const isNonBase = (id: string, get: (id: string) => number): boolean => {
  if (!STAT_DEFS[id]) return false;
  const ref = statRestingValue(id);
  const v = get(id);
  return Math.abs(v - ref) > 1e-6 * Math.max(1, Math.abs(ref));
};

export interface SheetTabModel {
  cat: string;
  def: SheetCategoryDef;
  /** Row ids to print, in order, under the current visibility mode. */
  rows: string[];
  /** How many seated rows the invested-only mode is holding back. */
  hidden: number;
  /** Non-base row count — the tab badge ("where does my build live?"). */
  invested: number;
}

/** Fold the whole sheet: seated statics by visibility mode, plus every
 *  LIVE generated/unseated stat routed to its family seat or the fallback
 *  category. One walk, all tabs — the UI renders what this returns.
 *  Optional `candidateIds` (e.g. `sheet.candidateNonRestingStatIds()`) bounds
 *  both non-base probes and the dynamic-stat sweep to touched stats while
 *  preserving exact STAT_DEFS registry ordering. */
export function sheetTabs(
  get: (id: string) => number,
  showAll: boolean,
  candidateIds?: ReadonlySet<string>,
): SheetTabModel[] {
  const models = new Map<string, SheetTabModel>();
  for (const [cat, def] of Object.entries(SHEET_CATS)) {
    models.set(cat, { cat, def, rows: [], hidden: 0, invested: 0 });
  }
  const checkNonBase = candidateIds
    ? (id: string): boolean => candidateIds.has(id) && isNonBase(id, get)
    : (id: string): boolean => isNonBase(id, get);
  // Seated rows first, in authored order.
  for (const [cat, def] of Object.entries(SHEET_CATS)) {
    const m = models.get(cat)!;
    for (const id of def.core) {
      if (!STAT_DEFS[id]) continue; // probe-caught; stay graceful live
      m.rows.push(id);
      if (checkNonBase(id)) m.invested++;
    }
    for (const id of def.used) {
      if (!STAT_DEFS[id]) continue;
      const on = checkNonBase(id);
      if (on) m.invested++;
      if (on || showAll) m.rows.push(id);
      else m.hidden++;
    }
  }
  // Dynamic rows: generated families and the unseated fold — non-base only,
  // in registry order (families mint contiguously, so kin stay adjacent).
  if (candidateIds) {
    let dynamicHits: string[] | undefined;
    for (const id of candidateIds) {
      if (SEATED_STAT_SET.has(id) || SHEET_OMIT.has(id)) continue;
      if (!isNonBase(id, get)) continue;
      (dynamicHits ??= []).push(id);
    }
    if (dynamicHits) {
      if (dynamicHits.length > 1) {
        const order = getStatRegistryOrder();
        dynamicHits.sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity));
      }
      for (const id of dynamicHits) {
        const cat = sheetFamilyOf(id)?.cat ?? SHEET_FALLBACK_CAT;
        const m = models.get(cat) ?? models.get(SHEET_FALLBACK_CAT);
        if (!m) continue;
        m.rows.push(id);
        m.invested++;
      }
    }
  } else {
    for (const id of Object.keys(STAT_DEFS)) {
      if (SEATED_STAT_SET.has(id) || SHEET_OMIT.has(id)) continue;
      if (!isNonBase(id, get)) continue;
      const cat = sheetFamilyOf(id)?.cat ?? SHEET_FALLBACK_CAT;
      const m = models.get(cat) ?? models.get(SHEET_FALLBACK_CAT);
      if (!m) continue;
      m.rows.push(id);
      m.invested++;
    }
  }
  return [...models.values()];
}

// --- Sheet blurbs ------------------------------------------------------------
// One line per static stat on what it DOES, assigned into STAT_DEFS below
// (UI reads STAT_DEFS[id].desc — one registry, any surface). Generated
// families carry theirs on SHEET_FAMILY_SEATS above. probe_sheet.ts fails
// on any static stat left silent, so a new stat brings its line with it.
const STAT_BLURBS: Record<string, string> = {
  // Vitals & resources
  life: 'Your vitality. When it is spent, you fall—and death here is final.',
  lifeRegen: 'Life steadily mended each second.',
  lifeRegenPct: 'A share of your maximum life mended each second alongside flat regeneration.',
  mana: 'The well of power your skills draw from.',
  manaRegen: 'Mana steadily restored each second.',
  manaRegenPct: 'A share of your maximum mana restored each second alongside flat regeneration.',
  lowLifeLine: 'Raises the threshold at which your body is considered on low life, waking blood-bound gear and passives sooner.',
  strideReach: 'Paces of purposeful walking needed to gather your stride, empowering the next blow you land before the walk begins anew.',

  // Mobility & action speed
  moveSpeed: 'How swiftly you cover ground.',
  bodyMass: 'The weight your body lends to a shared charge, growing with your size.',
  traction: 'How firmly your boots hold slick or frozen ground before momentum carries you into a slide.',
  attackSpeed: 'How swiftly your weapon and unarmed attacks strike.',
  castSpeed: 'How swiftly you weave and release spells.',
  cooldownRecovery: 'Hastens the readiness of skills recovering between uses.',
  skillCharges: 'Extra stored uses held in reserve for charge-based skills.',
  skillChargeRate: 'How quickly spent skill charges replenish.',
  reloadSpeed: 'Quickens the hand when reloading weapons or preparing fresh volleys.',
  finalRoundDamage: 'Puts extra weight behind the shot or strike that spends your last prepared round.',

  // Offense
  accuracy: 'Measures how true your blows fly against an enemy\'s evasion.',
  critChance: 'The likelihood that a blow finds a vital opening for a critical strike.',
  critMulti: 'The extra severity dealt when a blow lands critically.',
  damage: 'Strengthens all damage you deal, scaling through the tags of the skill you use.',
  addedPhysical: 'Adds raw physical force directly to your hits.',
  addedFire: 'Adds searing flame directly to your hits.',
  addedCold: 'Adds biting frost directly to your hits.',
  addedLightning: 'Adds arcing shock directly to your hits.',
  addedChaos: 'Adds corrosive chaos directly to your hits.',
  armorPen: 'Drives physical blows through a share of the target\'s armor.',
  armorDamageFloor: 'Guarantees a minimum share of your physical damage gets through, no matter how heavily armored the foe.',
  firePen: 'Burns through a share of the foe\'s fire resistance, even past their natural cap.',
  coldPen: 'Bites through a share of the foe\'s cold resistance, even past their natural cap.',
  lightningPen: 'Arcs through a share of the foe\'s lightning resistance, even past their natural cap.',
  chaosPen: 'Erodes a share of the foe\'s chaos resistance, even past their natural cap.',
  insightPen: 'Strikes too cleanly to anticipate, denying a share of the target\'s insight defense.',
  esShred: 'Tears at energy shields with greater force, draining them faster per point of damage.',
  statusChance: 'Improves the odds that your hits lay ailments upon the target.',
  statusMagnitude: 'Deepens the severity of ailments you inflict, strengthening both damaging ticks and slowing or weakening effects.',
  ailmentStacks: 'Lets you stack more layers of an ailment onto a single foe.',
  dotPropagates: 'Gives your damaging ailments a chance to leap to nearby foes when their victim dies.',
  curseRupture: 'Causes your curses to burst with damaging force when they expire.',
  dotRupture: 'Causes your damage-over-time effects to burst when they end for a share of the damage they dealt.',
  doomDot: 'Causes an armed doom mark to sear its bearer with chaos damage while counting down.',
  hedonism: 'Drives cursed foes into a reckless frenzy, quickening their actions alongside the curse.',
  poiseDamage: 'Wears down an enemy\'s footing and composure faster with every hit.',
  sunderDuration: 'Lengthens the vulnerable window after your blow breaks an enemy\'s poise.',
  impalePower: 'Leaves a share of your physical hit lodged in the wound, waiting to be wrenched free by the next strike.',
  ambushBonus: 'Rewards striking from the shadows or before a foe knows you are there.',
  proximityDamage: 'Lends extra weight to blows struck at close quarters, fading with distance.',
  cullThreshold: 'Fells weakened foes outright once a hit brings them below this share of life.',
  killProcOnHit: 'Gives your on-kill effects a chance to trigger on ordinary hits against tougher foes.',
  overmatch: 'Turns your edge toward stronger prey, dealing more damage to foes above your level.',
  giantsbane: 'Weighted to fell hulks and colossi, dealing more damage to foes far heavier than you.',
  regicide: 'Marked for champions and lords, dealing more damage to magic, rare, champion, and boss foes.',
  limbreaver: 'Strikes at what a beast carries—shields, censers, and riders—dealing more damage to targetable monster parts.',
  siegebreaker: 'Shatters entrenched targets, dealing more damage to siege engines, spawners, idols, and other immobile foes.',
  spentbane: 'Punishes overextension, dealing more damage to foes that have exhausted their reserves or left a vent open.',
  uprooter: 'Punishes displaced guardians, dealing more damage to rooted foes forced off the ground they claim.',
  bondbreaker: 'Cuts through a warden\'s protection, dealing more damage to enemies held in a protector\'s favor.',
  quailbane: 'Preys on faltering resolve, dealing more damage to foes whose morale has been shaken.',
  dotCrit: 'Lets a share of your critical chance apply to damaging ailments, causing critical afflictions to tick at full critical severity.',
  hitToAffliction: 'Holds back a share of each blow\'s direct force to feed the damaging ailments it inflicts.',
  afflictionYield: 'Multiplies how much held-back hit damage returns through the ailments your blow inflicts.',
  damageSpread: 'Widens the swing of your damage rolls—lower lows and higher highs around the same average.',
  luckyChance: 'Chance to roll your damage twice and keep the better strike.',
  unluckyChance: 'Chance to roll your damage twice and keep the weaker strike.',
  highRollWindow: 'Widens the upper band of your damage rolls that counts as a top-end strike.',
  cannotMiss: 'Your attacks strike true and cannot be evaded by enemy footwork.',
  critIgnoreRes: 'Your critical strikes bypass positive enemy elemental resistances entirely.',
  doubleDamageChance: 'Chance for your damaging skill hits to deal double damage.',
  overcritChance: 'Chance for a critical strike to escalate into an even deadlier Apex Strike.',
  overcritMulti: 'The extra damage multiplier applied when a critical strike becomes an Apex Strike.',
  overkillCarry: 'Share of excess killing-blow damage that splashes to nearby enemies.',
  overkillRadius: 'How far an Overkill Cascade shockwave reaches around the slain enemy.',
  cooldownPower: 'Increases a skill\'s hit damage proportionally to its effective cooldown duration.',
  hitEchoFrac: 'Banks a share of each landed hit into a delayed Temporal Debt detonation.',
  hitEchoDelay: 'How long Temporal Debt gathers damage on a target before detonating.',
  hitEchoAoe: 'Radius over which a detonating Temporal Debt also splashes nearby enemies.',
  inertiaGain: 'How rapidly movement builds Kinetic Inertia stacks.',
  inertiaDischarge: 'Expends banked Kinetic Inertia stacks on hit for multiplicative bonus damage.',
  rivenChance: 'Chance for hits to carve Riven armor-shredding fractures onto enemies.',
  rivenPower: 'Elemental and chaos resistance shredded per Riven stack on the target.',
  harmonyPower: 'Multiplies hit damage for each Harmonic Pitch stack earned by alternating skill types.',
  overleechWard: 'Converts excess life leech past full life into decaying Ward.',
  overleechPersist: 'Preserves excess life leech past full life as a short lingering recovery stream.',
  ailmentReap: 'Consumes active damaging ailments on crits or cooldown hits for instant burst damage.',
  poiseOverflow: 'Unleashes a physical shockwave scaled by the victim\'s maximum poise on poise break.',
  staggerPurge: 'Clears a portion of remaining deferred stagger damage on kill or cooldown cast.',
  staggerToWard: 'Converts purged deferred stagger damage directly into Ward.',
  minionMissingLifeFire: 'Minions gain extra fire damage proportional to their missing life percentage.',
  minionDecayQuad: 'Minion decay deals accelerating quadratic self-damage while keeping normal expiry timing.',
  minionKindleBurn: 'Recently summoned minions suffer level-scaled self-burn over 4 seconds.',
  minionKindleFire: 'Extra fire damage dealt by minions while burning from Kindled Bones.',
  minionPyreTether: 'Recently summoned minions tether together, burning enemies between them with minion-scaled fire damage.',
  minionStruckFirePulse: 'Struck minions emit a minor minion-scaled fire pulse on a shared cooldown across all your minions.',
  minionDeathEffectPower: 'Scales the potency of all minion death explosions, heals, and Martyrdom effects.',
  minionLeechToOwner: 'Minion hits leech a share of dealt damage back to you as life.',
  ownerWoundsToMinion: 'Each recent Wound stack on you empowers your minions\' hit damage.',
  bleedCullThreshold: 'Executes bleeding enemies instantaneously once their life drops below this threshold.',
  bleedNonBleedLess: 'Reduces direct hit damage dealt to enemies that are not currently bleeding.',
  carapaceHitGain: 'Taking or blocking hits hardens Chitin stacks until your carapace molts at 10 stacks.',
  moltShrapnel: 'Physical shrapnel damage unleashed around you when your Chitin carapace molts at 10 stacks.',
  ailmentCrossSplice: 'Chance when inflicting Bleed, Burn, Poison, or Shock to splice a paired secondary ailment.',
  multiAilmentMore: 'Multiplies hit damage for each distinct active ailment currently afflicting the target.',
  synapticLinkDmg: 'Tags struck enemies into a lattice that relays a share of hit damage to other tagged foes nearby.',
  statusAmplifyOnCrit: 'Critical strikes mutate active damaging ailments on the target, amplifying DPS and extending duration.',
  prismSinglePenalty: 'Reduces hit damage while you have dealt only a single damage type recently.',
  attritionRamp: 'Consecutive hits on the same foe build Adaptation stacks that amplify your damage against them.',
  attritionFirstPenalty: 'Reduces the opening hit dealt to an enemy before any Adaptation stacks are built.',
  minionInheritStatus: 'Summoned minions inherit a share of your own ailment chances and critical strike bonuses.',
  minionSplitOnLowLife: 'Chance for non-persistent minions dropping below 35% life to shed a temporary Fission Husk.',
  goldenProcAmplify: 'Triggered passive or item procs empower your next skill cast and pulse ward and haste to allies.',
  trampleContactDps: 'Crushes nearby enemies with contact physical impact and knockback while you move continuously.',
  blockBladeSlash: 'Blocking or parrying banks Bone-Shield Charges spent on your next attack for a vampiric cleave.',
  flaskBeastMode: 'Drinking a Flask triggers Feral Draught melee transformation; 3 kills clears the brief hangover.',
  bounceDamageScale: 'Multiplies projectile damage for each wall bounce, chain, or fork the projectile has completed.',
  bounceFirstPenalty: 'Reduces projectile damage before the projectile\'s first bounce, chain, or fork.',
  evadeDecoyBurst: 'Evading or using a movement skill leaves a taunting Wicker Decoy that bursts into spinning blades.',
  constructRefract: 'Projectiles passing through your own Totems or Constructs refract into extra angled prism bolts.',
  phoenixBlinkNova: 'Movement skills ignite a wake and erupt in fire novas at both departure and arrival points.',
  channelEffigyRate: 'Channeling periodically births homing Volatile Effigies that sprint at foes and detonate.',
  tempestMendPulse: 'Cold, Lightning, Song, or Storm casts conjure Squall Clouds that zap foes and mend allies inside.',
  recentDmgHeal: 'Melee, guard, or cooldown hits heal you for a share of damage taken over the past 5 seconds.',
  karmaReflect: 'Marks an enemy with a Penance Vow so a share of hit damage you suffer redirects onto them.',
  windfuryChance: 'Chance for melee and attack hits to unleash two instantaneous follow-up flurry strikes.',
  shatterCritMult: 'Multiplies your effective critical strike chance against Chilled enemies.',
  shatterSplinter: 'Critical strikes against Chilled enemies splinter cold shards onto nearby foes.',
  fateDiceBonus: 'Cooldown and movement skills cast Fate\'s Lots for tactical boons scaled by Luck.',
  overloadPower: 'Spell casts bank Overload Runes for escalating spell damage and cost; non-spells refund mana.',
  tranceRamp: 'Chaos and curse casts enter Abyssal Trance, ramping haste and damage while draining mana and ES.',
  ruptureSeed: 'Curses and damaging ailments plant a seed that detonates on death or heavy damage and spreads DoTs.',
  atonementHeal: 'Direct spell and song hit damage heals your living minions, companions, and nearby allies.',
  solsticePower: 'Alternating Fire/Physical and Cold/Lightning casts triggers opposing Solstice Zenith surges.',
  materialOnlyMore: 'Amplifies physical hit damage while forbidding fire, cold, lightning, and chaos hit damage.',
  blockToDamage: 'Turns a share of your active Block Chance directly into MORE hit damage.',
  surplusHitMore: 'Grants MORE hit damage while your current Mana remains at or above 75% of maximum.',
  lowManaHitLess: 'Reduces hit damage dealt while your current Mana stands below half.',
  pierceDecay: 'Reduces a projectile\'s hit damage after each pierced target (floored at 35%).',
  evadeSurgeOnHurt: 'Taking a hit grants a brief Slipstream evasion surge and guarantees dodging the next attack.',
  nonCritLess: 'Reduces the damage of hits that do not critically strike.',
  fullEsDR: 'Reduces incoming hit damage while your Energy Shield stands at or above 75% of maximum.',
  dualAilmentApply: 'Direct hits deal less damage, inflict a second distinct ailment simultaneously, and raise ailment stack caps.',
  ailmentMultiDot: 'Enemies carrying three or more distinct ailments suffer more damage over time.',
  offeringPower: 'Slaying afflicted foes banks Undying Offering stacks that grant MORE damage to you and your minions.',
  overhealToWard: 'Excess healing past full life overflows into Ward and adds a share of current Ward as fire hit damage.',
  direDeferral: 'Defers a large share of incoming hit damage across your Stagger window with a modest surcharge.',
  armorThornsScale: 'Blocking or taking a melee hit unleashes a physical retaliation shockwave scaled by Armor.',
  staticDischargeMore: 'Non-cooldown attacks build Static Charges discharged by spenders or cooldown skills for MORE damage.',
  staticBasicLess: 'Reduces direct hit damage dealt by non-cooldown attacks.',
  chronoVsSlowMore: 'Grants MORE hit damage against chilled, slowed, stunned, or Temporal-Debt foes.',
  ambushBurstMore: 'Grants MORE hit damage and bonus critical chance against high-life enemies.',
  ambushLowLifeLess: 'Reduces hit damage dealt against enemies below half life.',
  omniElemCascade: 'Elemental hits trigger a cascading area burst of the next element in the Fire-Cold-Lightning cycle.',
  fatalPactPower: 'Mirrors mild ailments onto yourself for MORE damage per self-ailment and purges three or more into a chaos nova.',
  plagueWakeDps: 'Moving or losing a minion pulses toxic chaos miasma that poisons foes and empowers nearby minions.',
  astralEchoBuff: 'Casting a Song, Warcry, or Aura extends active buffs and pulses Ward and Haste to nearby allies.',
  recentlyWindow: 'How many seconds count as "recently" (4s base) for all recency conditions, recent minion death stacks, and recently-summoned minion windows.',
  minionAnchoredInvuln: 'Temporary minions summoned are stationary and immobile for their full duration, but invulnerable while summoned recently.',
  minionSquad: 'Organizes minions into coordinated tactical squads that fight together and share armor and hit damage reduction with nearby squadmates.',
  summonWard: 'Newly summoned minions grant flat Ward to you, nearby allies, and themselves on arrival.',
  fieldCarryMore: 'Projectiles passing through your ground effects or fields deal MORE damage and gain area of effect.',
  burstStaggerPct: 'When a single hit exceeds 30% of maximum life, diverts a share of the excess damage into your Stagger pool.',
  highRollShockChain: 'High-roll hits guarantee Shock and arc a chained lightning bolt to a nearby foe.',
  flaskBlockCharge: 'Blocking a hit has a chance to restore a flask charge (1s cooldown).',
  virtuoseStance: 'Movement skills toggle between Probing Weakness (double damage & penetration) and Stalwart Resolve (block, guard, & poise).',
  cadenceFinisher: 'Every 4th landed hit unleashes a tag-specialized finisher: melee shockwave, projectile splinter fan, or spell nova with mana rebound.',
  salvatoryCounter: 'Blocking or parrying launches an immediate weapon-scaled counter-strike that can crit, bleeds, and restores Endurance or Ward.',
  silverQuiverPower: 'Holds 5 Anointed Silver rounds (reloaded by movement or time): loaded rounds empower Projectiles; spent rounds empower Melee.',
  smokeVeilPower: 'Movement skills grant brief Phantom Invisibility whose ambush-breaking hit deals MORE damage with heavy crit chance and ailments.',
  elemDestabPower: 'Casting below 35% Mana unleashes a Fire, Cold, and Lightning cataclysm scaled by Life and Energy Shield and rebounds Mana.',
  occultStackMore: 'Deals MORE hit and damage-over-time damage per total active ailment stack on the target (up to 20).',
  undertakerPower: 'Fallen foes (and elite hits) drop Bile Globes harvested by you or minions for healing and stacking MORE damage.',
  beaconPolarity: 'High Energy Shield or active Ward empowers Spells and Heals; depleted shield empowers Attacks with speed and Energy Shield leech.',
  burnDetonatePower: 'Hitting heavily burning foes consumes half their Burn stacks to detonate a Fire Nova and ignite nearby enemies.',
  equilibriumPower: 'Alternating Attacks and Spells banks cross-weave charges that empower the opposite skill class with MORE damage, speed, and shared scaling.',
  trophyPower: 'Slaying or repeatedly striking rares and bosses stacks long-lived Trophies granting MORE damage, armor, speed, and resistances.',
  frostRicochet: 'Projectiles striking Chilled or Frozen enemies ricochet freezing shards to nearby foes with Cold Penetration.',
  neuralSparkPower: 'Critical strikes build Neural Surge for attack and cast speed; reaching 5 stacks discharges a chained Lightning Arc.',
  residualImprint: 'Casting a Spell imprints its element onto your next two Attacks; casting an Attack imprints physical force onto your next Spell.',
  plagueDiffPower: 'Inflicting a damaging ailment emits a corrosive chaos pulse around the victim that refreshes nearby DoTs and empowers minions.',
  dawnConsecrate: 'Healing or gaining Ward lays Consecrated Ground that scorches foes (harder below 40% life) and hastes and mends allies.',
  chronoSiphon: 'Striking Chilled, Slowed, Stunned, Cursed, or Temporal-Debt foes shaves active skill cooldowns and extends active buffs.',
  cryoCocoonPower: 'Dropping below 35% life encases you in 2s of invulnerable healing ice, then shatters in a Cold & Stun burst (25s cooldown).',
  lithicFissurePower: 'Dropping below 40% life erupts an Armor-scaled shockwave, refills Endurance, and hardens Stone Skin (12s cooldown).',
  fueledRatePower: 'Kills or every 4th elite/boss hit stack Fueled Momentum (up to 10) for attack/cast speed and moving-cast haste.',
  windburnPower: 'Moving launches Fire+Cold Windburn bolts applying Burn & Chill; reload or movement skills release a chilling knockback whirlpool.',
  phaseStasisPower: 'Invisibility, high concealment, or evading dilates nearby enemies; hitting stunned, frozen, or dilated foes bleeds and heals you.',
  tractorTetherPower: 'Links up to 3 nearby enemies, dealing Lightning damage, pulling them inward, shocking, and siphoning Mana and Energy Shield.',
  plasmaDisintPower: 'Hits stack Disintegration (0–5); >=4 stacks amplify damage and pushing past 5 detonates a Plasma Overflow blast and shreds defenses.',
  springBloomPower: 'Ultimate, Cooldown (>=3s), or Summon casts (or elite kills) scatter Bloom Flowers granting damage, speed, and sustain to allies.',
  livingTidesPower: 'Standing still 2s blooms a Healing Roots sanctuary; moving untouched ramps Soothing Voyage healing and speed.',
  burnFeastPower: 'Hits have a 30% chance to erupt burning Lava Puddles (3s cooldown), and Burn damage you inflict heals you.',
  blockIntegratePower: 'Cooldown, guard, or warcry casts bank Block Charges (0–4) that automatically blunt incoming hits, grant Ward, and reflect damage.',
  critBlastPower: 'Critical strikes stack Blast Charges (0–3); the 3rd crit detonates a concussive physical+fire blast stunning foes and breaking boss poise.',
  recyclePower: 'Kills or every 5th elite hit restore +1 skill charge & shave cooldown; reload, munition, or flask casts unleash a chilling frost nova.',
  bleedTransfusePower: 'Hits against Bleeding foes heal you directly (overflowing to Ward), and Low Life triggers Adrenal Hyperdrive speed and crit.',
  hypothermiaPower: 'Deals massive MORE damage to Frozen, Stunned, or Poise-Broken foes and amplifies Cold poise damage against Chilled enemies.',
  poisonMeltPower: 'Each active Poison stack on foes you poison shreds their Armor and Chaos/Physical defenses (up to 15 stacks) for you and minions.',
  pylonResonancePower: 'Standing near your Constructs or Minions restores Mana & Energy Shield and hastes them; movement skills overcharge them in area bursts.',
  energyExtractPower: 'Kills or every 6th elite hit drop Power Blobs restoring Mana, shaving cooldowns, feeding Ultimate gauge, and granting haste on pickup.',
  heftBlowChance: 'Chance for a damaging skill hit to crush with the combined weight of your current life, endurance, and energy shield.',
  heftBlowScale: 'The share of your current life, endurance, and energy shield added when Crushing Heft triggers.',
  fellingChance: 'Chance for your landed attacks to shear away a percentage of the target\'s remaining life.',
  farShotDamage: 'Rewards long-range marksmanship by dealing progressively more damage the farther your shot travels.',
  echoMight: 'Briefly carries a share of a landed blow\'s force into your next strikes as added damage.',
  reservedDamage: 'Turns bound mana into raw force, adding flat damage for every point of mana you keep reserved.',
  maxManaDamage: 'Draws raw force from the depth of your mana pool, adding flat damage per point of maximum mana.',
  igniteToBomb: 'Holds back a share of your ignites to detonate in a single blast when the burn ends.',
  tetherDamage: 'Strengthens the continuous burn of your tethered beams.',

  // Defense
  armor: 'Blunts physical blows; heavier hits punch through more of it, and no amount grants total immunity.',
  armorAppliesToElemental: 'Applies a share of your armor to mitigate incoming elemental hits alongside your resistances.',
  flatHitReduction: 'Shaves a flat amount off every incoming hit after armor and resistances apply.',
  grazeChance: 'Chance for any landed incoming hit to strike as a partial Graze.',
  grazeMitigation: 'Share of hit damage prevented when an incoming hit is Grazed.',
  grazeWard: 'Turns a fraction of damage prevented by a Graze into protective Ward.',
  traumaCost: 'Voluntary self-wound taken per skill cast, building recent Wound stacks.',
  evasion: 'Turns attacks aside through footwork on a steady rhythm rather than pure chance—a blow will eventually land.',
  blockChance: 'The odds of catching an incoming hit on your guard, stopping damage up to your block strength.',
  fireRes: 'Tempers incoming fire damage up to your resistance cap.',
  coldRes: 'Tempers incoming cold damage up to your resistance cap.',
  lightningRes: 'Tempers incoming lightning damage up to your resistance cap.',
  chaosRes: 'Tempers incoming chaos damage up to your resistance cap.',
  fireResMax: 'Raises the ceiling your effective fire resistance can reach.',
  coldResMax: 'Raises the ceiling your effective cold resistance can reach.',
  lightningResMax: 'Raises the ceiling your effective lightning resistance can reach.',
  chaosResMax: 'Raises the ceiling your effective chaos resistance can reach.',
  damageTaken: 'Shifts how much damage reaches you from all sources.',
  critAvoid: 'Chance to turn an incoming critical strike into an ordinary hit.',
  ailmentResist: 'Chance to shrug off an incoming ailment before it takes hold.',
  afflictionExpiry: 'Hastens the passing of harmful statuses laid upon you.',
  damageImmunity: 'Renders you impervious to hits, damage over time, and hazards while it holds.',
  debuffImmunity: 'Bars new harmful statuses from taking hold while leaving beneficial effects untouched.',
  blockPower: 'Raises the maximum share of an incoming hit your block can stop at once.',
  blockValue: 'Adds flat stopping power to every hit you block.',
  guardStrength: 'Bolsters both raised guard stances and passive blocks alike.',
  guardParry: 'Opens a brief parry window at the start of guard skills that lack one of their own.',
  guardParryPower: 'Amplifies the counterstrike damage returned when you parry a blow.',
  parryDamageCooldown: 'Sets the minimum breathing room between damaging parry counters against the same attacker.',
  parryCounterBonus: 'Turns a share of the parried blow\'s own force back into your counterstrike.',
  guardHoldTime: 'Lengthens how long you can maintain a timed guard stance.',
  guardAegis: 'Extends your raised guard to shelter nearby minions from incoming blows.',
  domeDeflects: 'Causes your protective domes to rebound incoming projectiles outward instead of merely dissolving them.',
  energyShield: 'A protective ward over your life that absorbs damage first and recharges once you go a moment without taking a wound.',
  esRechargeRate: 'How swiftly your energy shield refills once recharge begins.',
  esRechargeDelay: 'How long you must avoid taking damage before your energy shield begins to recharge.',
  esRechargeSteadfast: 'Chance for an ongoing energy shield recharge to hold steady even when you take a hit.',
  esDotResist: 'Softens damage-over-time effects while your energy shield absorbs them.',
  esDotBypass: 'The share of damage over time that slips past your energy shield straight to your life.',
  lifeRegenToEs: 'Redirects a share of your life regeneration to steadily mend your energy shield, even during recharge delays.',
  manaShield: 'Draws a share of incoming damage from your mana pool before it reaches your life.',
  poise: 'Your footing and composure under fire; while unbroken it reduces damage and shrugs off stagger, and once broken it must recover before re-arming.',
  poiseDR: 'The damage reduction you keep while your poise holds firm.',
  poiseCcAvoid: 'Chance to shrug off stuns and crowd control while your poise holds firm.',
  poiseRegenPct: 'How swiftly a dented or broken poise bar recovers.',
  poiseRegenDelay: 'The pause after your poise breaks before recovery begins.',
  poiseRearmAt: 'How much of a broken poise bar must refill before your footing re-arms.',
  poiseCalmDelay: 'How long you must go without poise wear before an unbroken bar refills.',
  poiseOnHit: 'Restores poise with every blow you land, keeping your footing through aggression.',
  poiseOvercharge: 'Lets explicit poise gains build a temporary buffer above your normal maximum.',
  insight: 'A duelist\'s readiness gathered while moving and spent to slip the edge of incoming blows.',
  insightDR: 'The damage reduction granted while you have insight to spend.',
  insightEfficiency: 'How much incoming damage each point of spent insight turns aside.',
  insightRegenPct: 'How quickly movement builds your insight pool.',
  insightTaper: 'How long your gathered insight lingers after you stop moving.',
  insightInversion: 'Shifts what feeds your insight from movement toward planted stillness.',
  insightStillTaper: 'How long you must stand your ground to build full inverted insight.',
  insightSap: 'How much chill, freeze, and stun dull your footwork and drain your insight.',
  endurance: 'A reserve of grit that shaves flat damage off every incoming hit until spent.',
  enduranceDR: 'The flat damage shaved off each hit while your endurance holds.',
  enduranceRegenPct: 'How quickly spent endurance trickles back on its own.',
  enduranceRegenDelay: 'The pause after spending endurance before its natural trickle resumes.',
  wardDecay: 'The share of temporary ward that fades away each second.',
  wardGain: 'Amplifies the strength of every temporary ward you raise.',
  staggerFrac: 'Turns a share of sudden life damage into a staggered bleed over several seconds.',
  staggerWindow: 'How many seconds a staggered wound takes to play out.',
  hitImmune: 'Causes incoming hits to miss you outright, though damage over time still takes its toll.',
  hitCap: 'Caps how much life any single hit can take from you at once.',
  lastGasp: 'Chance to defy a killing blow and remain standing, subject to a recovery cooldown.',
  lastGaspLife: 'The share of maximum life you keep when Last Gasp saves you from a fatal blow.',
  lastGaspCooldown: 'How long you must wait before Last Gasp can save you again.',
  weight: 'Your physical heft; heavier bodies resist shoves and poise wear while driving lighter foes back.',
  phasing: 'Lets you slip unobstructed through other bodies on the battlefield.',
  evasionToArmor: 'Reads a share of your evasion rating as additional armor.',
  evasionForgone: 'Gives up a share of your evasion rating in exchange for another defense.',
  esToPoise: 'Reads a share of your energy shield as additional maximum poise.',
  esForgone: 'Gives up a share of your energy shield in exchange for another defense.',
  evasionToInsight: 'Reads a share of your evasion rating as additional maximum insight.',
  evasionToInsightForgo: 'Gives up a share of your evasion rating as part of an insight trade.',
  lifeToEs: 'Reads a share of your maximum life as additional maximum energy shield.',
  lifeForgone: 'Gives up a share of your maximum life in exchange for another defense.',
  thorns: 'Returns flat physical damage to attackers whose blows connect with you.',
  thornsReflect: 'Turns a share of the damage you take back upon the attacker.',
  thornsToHit: 'Carries a share of your flat thorns onto your own strikes as added physical damage.',
  channelThorns: 'Returns flat damage to attackers who strike you while you are channeling.',
  minionShare: 'Passes a share of the damage you take onto your living minions.',

  // Sustain
  lifeOnHit: 'Restores flat life each time one of your hits lands.',
  lifeLeech: 'Draws a share of the damage you deal back as life.',
  lifeLeechToEs: 'Redirects a share of your life leech to mend your energy shield instead of your life.',
  manaLeech: 'Draws a share of the damage you deal back as mana.',
  esLeech: 'Draws a share of the damage you deal back to mend your energy shield.',
  wardLeech: 'Draws a share of the damage you deal back as temporary ward.',
  esOnHit: 'Restores flat energy shield each time one of your hits lands.',
  lifeOnKill: 'Restores flat life with each foe you slay.',
  manaOnKill: 'Restores flat mana with each foe you slay.',
  esOnKill: 'Restores flat energy shield with each foe you slay.',
  lifeOnBlock: 'Restores flat life whenever you block an attack.',
  lifeOnEvade: 'Restores flat life whenever you evade an attack.',
  recuperate: 'Slowly mends a share of any life wound you survive over the seconds that follow.',
  recuperateTime: 'How quickly a recuperating wound finishes mending.',
  absorbPower: 'Strengthens the damage-absorbing shields raised by your skills.',
  healPower: 'Amplifies the healing you grant to yourself and allies.',
  healTaken: 'Amplifies all life healing you receive from any source.',
  overheal: 'Hardens a share of healing past full life into a temporary ward.',
  restorePower: 'Increases the potency of flask drinks and restorative streams.',
  restorePctMax: 'Adds a share of your maximum pool to every flask drink you take.',
  vampiricShare: 'Redirects a share of your life-leeching strikes to mend nearby allies instead of yourself.',
  bondShare: 'Passes a share of the damage you deal as healing to your bonded companion.',
  guardMend: 'Mends nearby allies each second while you hold a guard stance.',
  esToMana: 'Lets your skills draw upon energy shield when your mana runs dry.',
  conduitRate: 'Controls how quickly active resource conduits draw from their source pool.',
  conduitEfficiency: 'Controls how much resource a conduit delivers for each point it drains.',
  costToLife: 'Pays a share of your skills\' mana costs with life instead.',
  costToMana: 'Pays a share of your skills\' life costs with mana instead.',
  orbShedRate: 'Improves the odds of shaking loose resource orbs across all triggers.',
  overdriveCap: 'Lets you push casts past an empty pool by taking on temporary resource debt.',
  overdriveIdleDelay: 'The brief pause between casts needed before resource debt begins clearing.',
  overdriveRecovery: 'The share of accumulated resource debt cleared each second.',
  overdriveRecoveryFlat: 'Flat resource debt cleared each second.',
  overdriveFlow: 'Allows resource debt to keep clearing at a reduced pace even while you continue casting.',
  overdriveLifeFactor: 'Scales how quickly life-bound debt clears with your regeneration and movement.',

  // Skills
  creeperSpeed: 'Quickens the prowl of your carried creepers.',
  aoeRadius: 'Widens the reach of your area skills and blasts.',
  effectDuration: 'Lengthens the life of your buffs, ailments, and lingering ground effects.',
  manaCost: 'Scales the resource cost of your skills.',
  manaUseCost: 'Scales only the mana spent when using a skill, leaving reservations and life costs untouched.',
  addedManaCost: 'Adds flat mana to the cost of every skill.',
  addedLifeCost: 'Adds flat life to the cost of every skill.',
  addedCooldown: 'Adds flat seconds to a skill\'s cooldown before cooldown recovery applies.',
  costDamage_mana: 'Adds flat damage to a cast for every point of mana spent on it.',
  costDamage_life: 'Adds flat damage to a cast for every point of life spent on it.',
  costWard_mana: 'Raises a brief protective shield based on the mana spent on a skill.',
  costWard_life: 'Raises a brief protective shield based on the life spent on a skill.',
  costWardDuration: 'How long shields raised by spending mana or life endure.',
  costWardCap: 'The maximum shield you can hold from spending mana or life, as a share of maximum life.',
  chargeCap: 'Increases the maximum stacks of charges your skills can hold.',
  runeCap: 'Lengthens the rune sequence you can weave before releasing an invocation.',
  comboWindow: 'Gives you more time between casts to complete a skill sequence.',
  projectileCount: 'Adds extra projectiles to every volley you fire.',
  projectileCountChance: 'Chance for a volley to loose an additional projectile.',
  projectileSpeed: 'How swiftly your projectiles cross the field.',
  projectileSize: 'Increases the physical size of your projectiles.',
  pierceCount: 'Lets your projectiles drive through additional targets before spending themselves.',
  chainCount: 'Lets your projectiles leap to additional nearby foes on impact.',
  forkCount: 'Causes projectiles to split into additional pairs on impact.',
  projReturn: 'Draws spent projectiles back toward their origin or your hand.',
  projNova: 'Fires projectiles outward in a full ring around you instead of toward a single mark.',
  projPulse: 'Causes projectiles to swell and contract rhythmically in flight.',
  projShrapnel: 'Causes projectiles to burst into a spray of shards upon striking their first foe.',
  projHitDetonate: 'Causes explosive projectiles to detonate on every foe they pass through, not only the last.',
  projReShatter: 'Renews projectile shrapnel bursts across chains and forked splits.',
  returnShrapnel: 'Causes returning projectiles to burst into shards when they finish their flight back.',
  projInherit: 'The share of a projectile\'s flight behavior carried over to its split or chained children.',
  projAccel: 'Causes projectiles to gather or lose speed over the course of their flight.',
  projBounce: 'Lets projectiles ricochet off walls and obstacles instead of vanishing.',
  projFrameBounce: 'Lets projectiles rebound off the edge of sight with renewed range.',
  projRecurve: 'Chance for a projectile that passes through a target to curve back for a second strike.',
  homingPower: 'How sharply your projectiles bend in flight to seek nearby foes.',
  erraticPower: 'Sends projectiles weaving along an unpredictable, erratic path.',
  spiralPower: 'Sends projectiles spiraling outward from where they were cast.',
  orbitPower: 'Keeps projectiles circling around you in orbit.',
  spinPower: 'Sends projectiles corkscrewing tightly along their line of flight.',
  weavePower: 'Sends projectiles weaving in a figure-eight pattern as they travel.',
  guidePower: 'Bends projectiles in flight to follow your live aim.',
  castAtCursor: 'Calls projectile volleys forth directly at your cursor instead of from your hand.',
  fireSalvo: 'Turns a volley into a rapid succession of shots, each aimed at your live cursor.',
  fireVolley: 'Looses projectiles side by side in a parallel firing line.',
  volleySpacing: 'Adjusts how closely spaced a parallel volley stands.',
  spreadAngle: 'Widens or narrows the fan of a multi-projectile volley.',
  randomArc: 'Widens or tightens the arc within which random strikes fall.',
  multiTarget: 'Lets single-target skills strike additional nearby foes at once.',
  swingArc: 'Widens the sweep of your melee swings and cone attacks.',
  meleeReach: 'Extends the reach of your melee strikes and cones.',
  meleeReverb: 'Causes melee blows to echo onto additional nearby foes.',
  splashRadius: 'Causes single-target hits to splash reduced damage onto nearby foes.',
  meleeSweep: 'Sends melee swings traveling forward as crescent waves.',
  sweepRange: 'How far a traveling melee wave carries.',
  sweepSpeed: 'How swiftly a traveling melee wave crosses the ground.',
  knockback: 'Drives enemies backward when your melee blows connect.',
  shoveAuthority: 'Puts more of your weight behind every shove and knockback you inflict.',
  impactDamage: 'Increases the collision damage foes take when your shoves slam them into walls or heavy bodies.',
  gripPower: 'Strengthens your holds, letting you seize heavier foes and keep them pinned longer.',
  gripCrush: 'Crushes held foes each second for a share of their maximum life while your grip holds.',
  wriggle: 'Helps you wrench free from enemy grabs and holds more quickly.',
  trample: 'Lends extra crushing weight to your stride, letting you bowl through packs of smaller foes as you move.',
  plyRend: 'Tears through additional protective layers on swarm and multi-layered foes with each hit.',
  displaceForce: 'Shifts the force of your displacing hits—positive drives foes away, negative draws them in.',
  knockBuffet: 'Sends knocked-back foes careening in unpredictable directions.',
  aoeShape: 'Reshapes the footprint of your area skills into a circle, square, or triangle.',
  aoeScatter: 'Breaks area skills into a cluster of smaller secondary blasts.',
  aoeCascade: 'Sends area skills rippling outward in a line of repeated blasts.',
  cascadeStep: 'Adjusts the distance between each ripple of a cascading area skill.',
  aoeSpin: 'Sets directional area effects revolving as they play out.',
  pulseCount: 'Draws additional pulses from lingering ground effects.',
  stormCount: 'Calls down additional strikes during storm skills.',
  stormImmediate: 'Brings a share of a storm\'s strikes crashing down immediately on cast.',
  fissureCount: 'Splits additional ground fissures outward with each cast.',
  fissureBranches: 'Forks additional secondary cracks off each ground fissure.',
  lingerField: 'Leaves a damaging field on the ground after an area skill resolves.',
  hexBlast: 'Causes cursed ground to detonate in a secondary blast shortly after being laid.',
  channelBurst: 'Releases periodic novas around you while you hold a channel.',
  channelStorm: 'Calls periodic strikes down around you while you hold a channel.',
  channelRamp: 'Grows the strength of channeled pulses for every second you hold the cast.',
  channelSpool: 'Adds extra projectiles to channeled volleys the longer you hold the channel.',
  channelSpoolCap: 'Sets the maximum number of bonus projectiles a channeled skill can spool up.',
  channelHitSpool: 'Builds bonus projectiles on channeled skills with each hit that connects.',
  channelMobility: 'Lets you keep moving at a steadier pace while channeling.',
  channelTurnRate: 'How quickly you can pivot your aim while holding a directional channel.',
  channelLockAim: 'Fixes a channeled skill\'s aim to the spot you first targeted, freeing you to look elsewhere.',
  channelAutoSpin: 'Sweeps a held channel steadily around you in a full circle.',
  channelPersist: 'Anchors a channeled skill at its mark so it continues on its own after you release it.',
  brimFill: 'Hastens the filling of your gathering gauges.',
  brimDecay: 'Slows or quickens how fast an unspent gauge drains away.',
  brimPower: 'Amplifies the release when a filled gauge is spent.',
  fuseDelay: 'Adjusts how long delayed blasts and fuses burn before detonating.',
  fusePower: 'Amplifies the detonation of fused and delayed blasts.',
  overchargeStages: 'Lets charged casts build additional stages before release.',
  sparkWindow: 'Widens the timing window for releasing a charged cast at the exact moment a stage completes.',
  sparkBonus: 'Increases the bonus granted when you release a charged cast with perfect timing.',
  repeatCount: 'Causes skills to repeat additional times after the initial cast.',
  repeatScale: 'Grows the size and force of each successive repeat.',
  repeatRetarget: 'Allows repeated casts to turn toward the nearest living foe.',
  repeatLock: 'Holds your feet in place until all repeats finish playing out.',
  unleashMax: 'Lets resting skills gather seals between casts, releasing them as extra salvos on the next use.',
  triggerChance: 'Improves the odds that a socketed trigger support fires when its condition is met.',
  triggerThreshold: 'Lowers or raises the damage needed to fire wound-triggered skills.',
  triggerPower: 'Adjusts how many status applications are needed to fire status-triggered skills.',
  procDepth: 'Allows triggered effects to chain into further triggers at reduced chance.',
  castMobility: 'Lets you keep moving while casting non-channeled skills.',
  moveExplode: 'Causes movement skills to detonate both where you leave and where you land.',
  moveTrail: 'Leaves a burning wake behind your movement skills.',
  departSplash: 'Focuses a movement skill\'s blast at the spot you leaped from rather than where you land.',
  conduction: 'Allows projectiles passing through elemental ground to take on that element.',
  suffusion: 'Allows projectiles crossing your ground effects to carry them forward and re-lay them on impact.',
  poolCap: 'Raises the ceiling on how much damage your stored pools can hold.',
  embedIcd: 'Allows triggered ground snares to re-arm after a brief cooldown instead of vanishing.',
  tetherWidth: 'Widens the beam of your tether skills.',
  [PROCESSION.growth.stat]: 'Casting Consecration widens your carried circle for a time.',
  [PROCESSION.escort.stat]: 'A Radiant Sentinel guards your circle. Its double pulses call reinforcements.',
  bashPower: 'Amplifies the impact of your shield bashes.',
  bashFloor: 'Sets the guard threshold required to turn a released block into a shield bash.',
  bashInvert: 'Rewards holding a battered guard, scaling shield bash power with the damage your guard has absorbed.',
  bashArmTime: 'Adjusts how long you must hold a guard stance before its shield bash is ready.',
  durationAuraCap: 'Lets you maintain more temporary auras at the same time.',
  auraEsRecharge: 'Lends faster energy-shield recharge to allies standing within your auras.',
  auraEsDelay: 'Shortens the energy-shield recharge delay of allies standing within your auras.',
  reflex: 'Allows a skill to fire seamlessly during other casts, channels, or dashes without interrupting them.',
  thirstless: 'Allows flasks to be drunk even when your life or mana pool is already full.',
  tuneFavor: 'Turns re-tuned crystal constructs to your cause, sparing allies from their hazards and extending their boons.',
  pourPower_surge: 'Strengthens the immediate upfront rush of two-part flask drinks.',
  pourPower_settle: 'Strengthens the lingering recovery that follows a flask\'s initial rush.',
  pourPct_surge: 'Adds an extra share of maximum life or mana to the upfront rush of flask drinks.',
  pourPct_settle: 'Adds an extra share of maximum life or mana to the lingering recovery of flask drinks.',
  pourPrime: 'Lets drinks taken at full health or mana wait in reserve, releasing automatically the moment you take a wound.',
  remnantChance: 'Chance for your hits to shake loose an elemental remnant that empowers the next cast of its element.',
  remnantOnCast: 'Chance for casting an elemental skill to leave behind a matching remnant.',
  mimicWitness: 'Lets Mimicry learn studied monster arts simply by witnessing them cast within range, without taking the hit.',
  mimicBank: 'Expands how many stolen monster arts your Mimicry repertoire can hold at once.',
  windchillWard: 'Shelters you from mountain windchill as if standing beside a fire, shedding ambient chill while leaving cold attacks unaffected.',
  possessDuration: 'Lengthens how long you can inhabit a possessed vessel before returning to your own body.',
  possessPower: 'Brings the skills of a possessed vessel closer to their full strength.',
  huskGuard: 'Protects the body you leave behind while your spirit rides another vessel.',

  // Minions
  minionDamage: 'Strengthens the blows and spells of all minions you summon.',
  minionDamageForgone: 'Fraction of your minion damage scaling renounced by your minions.',
  minionLife: 'Bolsters the maximum life of all minions you summon.',
  minionMaxCount: 'Lets you field additional summoned minions at once.',
  minionDamageTaken: 'Scales the damage your minions take from enemy blows.',
  minionThreat: 'Draws enemy attention more strongly toward your minions.',
  minionAreaAvoidance: 'Gives your minions a chance to slip clear of area blasts and their on-hit effects.',
  minionSize: 'Increases the physical stature of your summoned minions.',
  minionMoveSpeed: 'Quickens the stride of your summoned minions.',
  minionHaste: 'Quickens the attacks, casts, and movement of your summoned minions.',
  minionPlies: 'Grants your minions extra protective layers, each absorbing a single landed hit in full.',
  minionLifePlyTrade: 'Trades a share of your minions\' bonus life for protective layers that each absorb a full hit.',
  minionLifePlyEcho: 'Forms protective layers on your minions alongside their bonus life without trading it away.',
  throngPockets: 'Seeds additional dormant husk pockets across each zone for throng skills to claim.',
  throngYield: 'Increases how many throng bodies emerge whenever a pocket, gauge, or raising is claimed.',
  minionRegen: 'Flat life your minions mend each second.',
  minionRegenPct: 'A share of each minion\'s maximum life mended each second.',
  minionRegenRate: 'Multiplies all flat and percentage life regeneration on your minions.',
  minionDetectionRange: 'Extends how far out your minions spot and engage foes.',
  minionDecayRate: 'Slows or hastens the natural life drain of temporary minions.',
  minionRespawnTime: 'Adjusts how long fallen persistent minions take to rise again.',
  minionUndying: 'Allows slain minions to fight on briefly after their death effects trigger.',
  minionGuard: 'Keeps your minions on a close defensive leash around you instead of ranging ahead.',
  minionDeathHeal: 'Mends surviving minions for a share of a fallen minion\'s life when it dies.',
  minionDeathHealFlat: 'Restores flat life to surviving minions whenever one of their number falls.',
  minionExpiryIsDeath: 'Treats the natural expiration of a timed minion as a death, triggering all on-death effects.',
  minionExplodeDeath: 'Causes your minions to rupture on death, dealing a share of their maximum life as damage around them.',
  minionExplodeLowLife: 'Causes your minions to detonate themselves as soon as they are brought to low life.',
  minionBloom: 'Causes summoned minions to ripen and burst after a set number of seconds in the field.',
  minionBloomPower: 'The chaos burst loosed when a minion ruptures, scaled by a share of its maximum life.',
  summonCount: 'Calls forth additional minions with each summon cast.',
  summonSequence: 'Raises multiple minions in a steady procession rather than all at once.',
  summonAtCursor: 'Calls summoned minions forth directly at your cursor instead of beside you.',
  summonImpact: 'Causes newly summoned minions to slam the ground on arrival, dealing a share of their life as area damage.',
  summonMend: 'Causes newly summoned minions to mend nearby allies when they arrive.',
  sacrificeMinions: 'Allows corpse-consuming skills to sacrifice one of your own minions when needed.',
  targetMinionFallback: 'Allows corpse-targeting skills to center on a living minion without harming it when no corpse is near.',
  corpseBatch: 'Lets each corpse skill consume or raise additional corpses at once.',
  offeringShare: 'Extends a share of your minion-offering buffs to yourself as well.',
  commandDiscipline: 'Lends greater authority to your minion commands so unruly summons obey without hesitation.',
  constructMaxCount: 'Lets you maintain additional totems, sentries, traps, and mines at once.',
  constructCastRate: 'Quickens the firing and casting pace of your placed constructs.',
  constructTaunt: 'Causes your placed constructs to draw nearby enemy aggression.',
  castAsTotem: 'Plants a totem to cast the skill on your behalf instead of casting it from your hand.',
  totemPlaceTime: 'Adjusts how quickly you plant totems on the field.',
  mirageCount: 'Allows additional echo mirages to form and repeat your skills.',
  mirageDamage: 'Scales the damage dealt by all of your echo mirages.',
  mercRetinue: 'Lets you hire and field additional mercenary companions at once.',
  mercVigor: 'Bolsters the life and damage of every mercenary in your company.',
  mercEase: 'Softens the extra world difficulty normally drawn by travelling with hired mercenaries.',
  mercHireDiscount: 'Lowers the price of hiring mercenaries to your company.',

  // Misc
  detectability: 'Scales how easily enemies spot you from afar.',
  concealment: 'Narrows enemy sightlines and masks your approach from behind until you strike.',
  noiseOnHit: 'Causes your blows and landing shots to ring out, drawing watchers within earshot toward the sound.',
  threatGen: 'Scales how strongly your damage draws enemy aggression onto you.',
  targetPriority: 'Shifts how likely enemies are to single you out over nearby allies and minions.',
  areaAvoidance: 'Chance to slip clear of area hits and their on-hit effects before they land.',
  invisible: 'Hides you from enemy sight and direct targeting, though untargeted blasts can still catch you.',
  luck: 'Bends the odds on every triggered effect roll in your favor—or against you if cursed.',
};

/** Explicit mechanical descriptions (Option A) shown when Full Tooltip Detail is enabled. */
export const STAT_DETAILS: Record<string, string> = {
  life: 'Maximum Life. Reaching 0 Life kills your character.',
  lifeRegen: 'Flat Life regenerated per second.',
  lifeRegenPct: 'Percentage of Maximum Life regenerated per second, added to flat Life Regeneration.',
  mana: 'Maximum Mana available to pay skill costs and reservations.',
  manaRegen: 'Flat Mana regenerated per second.',
  manaRegenPct: 'Percentage of Maximum Mana regenerated per second, added to flat Mana Regeneration.',
  lowLifeLine: 'Sets the Maximum Life fraction at or below which Low Life conditions activate (default 35%).',
  strideReach: 'Distance in movement units required to gain Strided. Your next hit consumes Strided to trigger all "when strided" modifiers.',
  moveSpeed: 'Movement speed multiplier.',
  bodyMass: 'Increases effective mass for charge and collision calculations, scaled further by character size.',
  traction: 'Reduces movement sliding on low-friction surfaces such as ice.',
  attackSpeed: 'Multiplier to the attack rate of Attack skills.',
  castSpeed: 'Multiplier to the cast rate of Spell skills.',
  cooldownRecovery: 'Increases the rate at which skill cooldowns recover.',
  skillCharges: 'Adds to the maximum charges a charge-based skill can store.',
  skillChargeRate: 'Multiplier to charge recovery speed for charge-based skills.',
  reloadSpeed: 'Increases the speed of reload actions and reload channels.',
  finalRoundDamage: 'More damage dealt by the skill use that consumes the final round of an ammunition bank.',
  accuracy: 'Contests enemy Evasion to determine hit chance.',
  critChance: 'Probability that a hit scores a Critical Strike.',
  critMulti: 'Total damage multiplier applied on a Critical Strike.',
  damage: 'Increases damage dealt by skills matching the modifier\'s tags.',
  addedPhysical: 'Flat Physical damage added to hits.',
  addedFire: 'Flat Fire damage added to hits.',
  addedCold: 'Flat Cold damage added to hits.',
  addedLightning: 'Flat Lightning damage added to hits.',
  addedChaos: 'Flat Chaos damage added to hits.',
  armorPen: 'Ignores this percentage of the target\'s Armor against Physical hits.',
  armorDamageFloor: 'Prevents Armor from reducing Physical hit damage below this fraction of unmitigated damage.',
  firePen: 'Reduces the target\'s effective Fire Resistance against your hits, penetrating below 0% and past resistance caps.',
  coldPen: 'Reduces the target\'s effective Cold Resistance against your hits, penetrating below 0% and past resistance caps.',
  lightningPen: 'Reduces the target\'s effective Lightning Resistance against your hits, penetrating below 0% and past resistance caps.',
  chaosPen: 'Reduces the target\'s effective Chaos Resistance against your hits, penetrating below 0% and past resistance caps.',
  insightPen: 'Ignores this fraction of the target\'s Insight damage reduction.',
  esShred: 'Multiplier to damage dealt strictly to Energy Shield pools.',
  statusChance: 'Increases the chance on hit to apply status ailments.',
  statusMagnitude: 'Multiplies the damage over time and non-damaging effect strength of status ailments you inflict.',
  ailmentStacks: 'Increases the maximum number of stacks of a stackable ailment a target can have from you.',
  dotPropagates: 'Chance for active damage-over-time effects on a slain enemy to spread to nearby enemies.',
  curseRupture: 'Causes curses to deal a burst of area damage upon expiring, scaled by this value.',
  dotRupture: 'Causes damage-over-time effects to deal a burst of damage upon expiring equal to this fraction of total damage dealt.',
  doomDot: 'Causes active Doom marks to deal Chaos damage over time per second before detonating.',
  hedonism: 'Causes your curses to also grant affected enemies increased action speed.',
  poiseDamage: 'Multiplier to Poise damage dealt by your hits.',
  sunderDuration: 'Duration in seconds of the Sundered state inflicted when you break an enemy\'s Poise.',
  impalePower: 'Stores this fraction of Physical hit damage on the target as Impale, which is dealt as bonus Physical damage when the next hit lands.',
  ambushBonus: 'Grants more damage on hits against unalerted targets or while Cloaked/Stealthed.',
  proximityDamage: 'Grants up to this much more damage at point-blank range, scaling down to 0% with distance.',
  cullThreshold: 'Instantly kills enemies whose Life is at or below this fraction after a hit lands.',
  killProcOnHit: 'Chance on hit against rare, champion, or boss enemies to trigger your on-kill effects.',
  overmatch: 'Grants more damage against enemies whose level is higher than yours.',
  giantsbane: 'Grants more damage against enemies with at least 150% of your weight.',
  regicide: 'Grants more damage against magic, rare, champion, and boss enemies.',
  limbreaver: 'Grants more damage against targetable monster parts and attachments.',
  siegebreaker: 'Grants more damage against stationary enemies and structures (base Move Speed 0).',
  spentbane: 'Grants more damage against enemies in an exhausted or reserve-depleted state.',
  uprooter: 'Grants more damage against Rooted enemies that have been moved off their claimed ground.',
  bondbreaker: 'Grants more damage against enemies currently protected by a warden or tether bond.',
  quailbane: 'Grants more damage against enemies suffering from broken morale or fear.',
  dotCrit: 'Applies this fraction of your Critical Strike Chance to damaging ailments; critical ailments deal damage at your full Critical Strike Multiplier.',
  hitToAffliction: 'Reduces direct hit damage by this fraction and adds it to damaging ailments inflicted by the hit, multiplied by Affliction Yield.',
  afflictionYield: 'Multiplier applied to hit damage converted into ailment damage via Hit to Affliction.',
  damageSpread: 'Widens the minimum-to-maximum damage roll range around the same average value.',
  luckyChance: 'Chance to roll damage twice and take the higher result.',
  unluckyChance: 'Chance to roll damage twice and take the lower result.',
  highRollWindow: 'Expands the top percentile of a damage roll that qualifies for high-roll triggered effects.',
  cannotMiss: 'When active, your attack hits bypass the target\'s Evasion check entirely.',
  critIgnoreRes: 'When active, your critical strikes treat positive enemy Fire, Cold, and Lightning Resistance as 0%.',
  doubleDamageChance: 'Chance for a damaging skill hit to deal 2x damage (capped at 50%).',
  overcritChance: 'Chance when rolling a Critical Strike to escalate into an Apex Strike (capped at 50%).',
  overcritMulti: 'Additional multiplier applied on top of Critical Strike Multiplier when an Apex Strike triggers.',
  overkillCarry: 'Fraction of overkill damage beyond a slain target\'s remaining life that cascades to nearby enemies (capped at 100%).',
  overkillRadius: 'Base world-unit radius for Overkill Cascade shocks (scales with Area of Effect).',
  cooldownPower: 'Grants additional MORE hit damage per second of a skill\'s effective cooldown (base + addedCooldown, capped at 12 seconds).',
  hitEchoFrac: 'Fraction of post-mitigation primary hit damage banked onto the target as Temporal Debt, detonating when the window expires.',
  hitEchoDelay: 'Seconds between banking the first hit of Temporal Debt and its detonation.',
  hitEchoAoe: 'Base radius around a detonating Temporal Debt target that receives 50% splash damage (scales with Area of Effect).',
  inertiaGain: 'Bonus build rate for Kinetic Inertia stacks while moving (every 40 / (1 + rate) units grants 1 stack, up to 20).',
  inertiaDischarge: 'When hitting with a non-movement skill while holding Kinetic Inertia, consumes all stacks for this much MORE damage per stack.',
  rivenChance: 'Chance on primary hits to inflict a Riven fracture stack (up to 12 for 5s; each stack strips 4% effective armor). Values above 100% can add 2 stacks.',
  rivenPower: 'Reduces an enemy\'s effective elemental and chaos resistance by this percentage per Riven fracture stack.',
  harmonyPower: 'Grants this much MORE hit damage per Harmonic Pitch stack built by alternating distinct skill families (up to 10; at 5%+ reaching 10 stacks triggers a tri-elemental crescendo).',
  overleechWard: 'Fraction of excess life leech beyond full life granted to you as Ward.',
  overleechPersist: 'Fraction of excess life leech beyond full life banked into a 3-second lingering life restoration stream.',
  ailmentReap: 'On critical strikes or cooldown skill hits (>= 1.5s), consumes active damaging ailments on the victim to deal this fraction of their remaining total damage instantly.',
  poiseOverflow: 'When breaking an enemy\'s poise, unleashes a physical shockwave dealing this fraction of their maximum poise (at 80%+, also pulls nearby foes inward).',
  staggerPurge: 'Fraction of remaining deferred Stagger damage immediately purged when you slay an enemy or cast a cooldown skill (>= 1.5s).',
  staggerToWard: 'Fraction of Stagger damage purged by Stagger Purge that is granted to you as Ward.',
  minionMissingLifeFire: 'Minions gain up to this fraction of their rolled damage as extra Fire damage, scaled linearly by their missing life percentage.',
  minionDecayQuad: 'Minion decay and duration clocks also deal quadratic self-damage toward 1 life (never killing early; normal decay/lifespan still ends the minion).',
  minionKindleBurn: 'Flat life per second burned off newly summoned minions for 4 seconds after summon (floors at 1 life).',
  minionKindleFire: 'Extra Fire damage fraction dealt by minions while burning from Kindled Bones.',
  minionPyreTether: 'Flat fire damage per second (scaled by minion and fire modifiers) dealt to enemies caught between pairs of your recently summoned minions (within 6s of summoning).',
  minionStruckFirePulse: 'Flat fire damage (scaled by minion and fire modifiers) pulsed around a struck minion, governed by a single shared 0.6s cooldown across all of your minions.',
  minionDeathEffectPower: 'Multiplicative scaling applied to all minion death explosions (Martyrdom, Volatile Corpse, Necrotic Dynamo) and minion death heals.',
  minionLeechToOwner: 'Fraction of hit damage dealt by your minions that heals you directly.',
  ownerWoundsToMinion: 'Grants your minions this much MORE hit damage for each recent Wound stack on you (up to 25).',
  bleedCullThreshold: 'Landed hits execute bleeding enemies at or below this life fraction (45% as effective against rares and bosses).',
  bleedNonBleedLess: 'Deal this much LESS direct hit damage against enemies that are not currently bleeding.',
  carapaceHitGain: 'Taking or blocking a hit adds this many Chitin stacks (up to 10, 6s decay). At 10 stacks your carapace Molts, shattering outward and resetting stacks.',
  moltShrapnel: 'Flat physical shrapnel burst unleashed around you when Molting at 10 Chitin stacks (scales with armor at Keystone tier).',
  ailmentCrossSplice: 'Chance when inflicting Bleed→Chill, Burn→Shock, Poison→Bleed, or Shock→Poison to splice the paired ailment (0.35s per-target ICD).',
  multiAilmentMore: 'Grants this much MORE hit damage for each distinct active status ailment currently on the victim (capped at 5).',
  synapticLinkDmg: 'Landed hits tag foes into a Synaptic Lattice (up to 4 targets, 4s). Hitting any tagged foe relays this fraction of hit damage to all other tagged foes within 280px.',
  statusAmplifyOnCrit: 'Critical strikes mutate active damaging ailments on the target, multiplying their DPS by (1 + value) up to 2x original baseline and extending remaining duration by 1.2s.',
  prismSinglePenalty: 'Deal this much LESS hit damage while you have dealt at most 1 distinct damage type in the last 6 seconds.',
  attritionRamp: 'Consecutive hits on the same target grant this much MORE hit damage per Adaptation stack (up to 15 stacks, 5s decay).',
  attritionFirstPenalty: 'Your opening hit against an enemy with 0 Adaptation stacks deals this much LESS hit damage.',
  minionInheritStatus: 'Summoned minions inherit this fraction of your own ailment application chances and bonus critical strike chance/multiplier.',
  minionSplitOnLowLife: 'Chance when a non-persistent minion drops below 35% life for the first time to shed a temporary Fission Husk (40% life/damage, 4s lifespan, max 2 active).',
  goldenProcAmplify: 'When any passive or gear proc triggers (1.5s ICD), empowers your next skill cast by this fraction and pulses ward and haste to nearby allies and minions.',
  trampleContactDps: 'While moving continuously, crushes enemies within contact reach (0.35s per-target ICD) for this flat physical damage plus knockback and poise break.',
  blockBladeSlash: 'Blocking or parrying banks up to 5 Bone-Shield Charges. Your next attack consumes them for a wide vampiric cleave dealing this damage per charge (18% life leech).',
  flaskBeastMode: 'Drinking a Flask triggers 6s of Feral Draught melee/speed transformation scaled by this power; slaying 3 enemies clears the 3s post-surge Hangover.',
  bounceDamageScale: 'Projectiles deal this much MORE hit damage for each wall bounce, chain, or fork they have completed (up to 6).',
  bounceFirstPenalty: 'Projectiles deal this much LESS hit damage before their first bounce, chain, or fork.',
  evadeDecoyBurst: 'Evading an attack or using a movement skill (3.5s ICD) leaves a taunting Wicker Decoy that detonates after 1.4s in spinning physical blades and grants 1.5s concealment.',
  constructRefract: 'Projectiles passing through your own Totems or Constructs refract once per construct into this many angled prism bolts at 65% damage with +15% elemental penetration.',
  phoenixBlinkNova: 'Movement skills erupt in fire novas at both departure and arrival plus an ignited line between them; striking enemies at both ends refunds 25% cooldown.',
  channelEffigyRate: 'While channeling, births homing Volatile Effigies every 1.3s / rate (up to 3–4 active) that sprint at enemies and detonate for minion-scaled chaos damage.',
  tempestMendPulse: 'Casting a Cold, Lightning, Song, or Storm skill (4s ICD) conjures a 4s Squall Cloud pulsing every 1s to zap enemies and mend allies and minions inside.',
  recentDmgHeal: 'Landing a melee, guard, or cooldown (>= 1.5s) hit (2.5s ICD) heals you for this fraction of damage suffered in the last 5 seconds (overflow converts to Ward).',
  karmaReflect: 'Guarding, warcrying, or striking marks an enemy with a Penance Vow for 5s; this fraction of mitigated hit damage you take redirects onto them as physical retribution.',
  windfuryChance: 'Chance on primary melee and attack hits (1.0s ICD) to unleash 2 instantaneous follow-up strikes at 45% hit damage each.',
  shatterCritMult: 'Multiplies your effective critical strike chance by (1 + value) when striking Chilled enemies.',
  shatterSplinter: 'Critical strikes against Chilled enemies splinter cold shards to nearby foes within 135px for this fraction of hit damage.',
  fateDiceBonus: 'Casting a cooldown or movement skill (4.5s ICD) casts Fate\'s Lots for 6s tactical boons; higher tiers and Luck unlock double or triple simultaneous boons.',
  overloadPower: 'Spell casts bank Overload Runes (0..4, 8s decay) granting this much MORE spell damage per rune; non-spell casts discharge all runes to restore 8% max mana each.',
  tranceRamp: 'Chaos and curse casts enter Abyssal Trance (0..15 stacks, +1/s in combat) granting this much more chaos/DoT damage & cast speed per stack while draining escalating mana/ES.',
  ruptureSeed: 'Applying a curse or damaging ailment plants a 3.5s Rupture Seed that detonates on death or 25% max life lost for this chaos/fire AoE and spreads active DoTs.',
  atonementHeal: 'This fraction of your direct spell and song hit damage heals your living minions, companions, and nearby allies (and yourself at 35% efficiency).',
  solsticePower: 'Casting 3 Fire/Physical skills grants 6s Lunar Zenith (+value more Cold/Lightning damage); casting 3 Cold/Lightning skills grants 6s Solar Zenith (+value more Fire/Physical damage).',
  heftBlowChance: 'Chance for a damaging skill roll to add (Life + Endurance + Energy Shield) × Crushing Heft Ratio pro-rata across its rolled types (capped at 40%).',
  heftBlowScale: 'Fraction of current Life + Endurance + Energy Shield added when Crushing Heft triggers.',
  fellingChance: 'Chance on landed attack hits to shear 8% of a normal enemy\'s remaining life (4% against empowered/boss enemies, capped at 50%).',
  farShotDamage: 'Up to this much more hit damage at long range, ramping smoothly from 140px to 460px distance.',
  echoMight: 'After landing a hit, grants flat added damage for a short duration equal to this fraction of damage dealt (capped at 15% of the skill\'s base damage).',
  reservedDamage: 'Adds flat damage per point of Mana currently reserved.',
  maxManaDamage: 'Adds flat damage per point of Maximum Mana.',
  igniteToBomb: 'Stores this fraction of Ignite damage to detonate as a single burst when the Ignite expires instead of ticking over time.',
  tetherDamage: 'Multiplier to the tick damage of tether skills.',
  armor: 'Reduces incoming Physical hit damage on a diminishing curve; less effective against single large hits.',
  armorAppliesToElemental: 'Fraction of your Armor that also reduces incoming Fire, Cold, and Lightning hit damage.',
  flatHitReduction: 'Flat damage subtracted from each incoming hit after armor, resistances, and damage-taken multipliers apply (floors at 0).',
  grazeChance: 'Chance for any landed incoming hit (attack, spell, or area) to become a Graze (up to 100%).',
  grazeMitigation: 'Fraction of hit damage reduced when a Graze occurs (base 35%, capped at 65%).',
  grazeWard: 'Fraction of damage prevented by a Graze that is granted to you as Ward (scales with Ward Gain).',
  traumaCost: 'Fraction of Maximum Life paid as voluntary self-wound trauma on skill casts (never drops you below 1 life; feeds recent Wound stacks).',
  evasion: 'Avoids incoming attacks using a deterministic entropy counter rather than pure randomness.',
  blockChance: 'Chance to block an incoming hit, preventing damage up to your Block Value (capped by Block Power).',
  fireRes: 'Reduces incoming Fire damage by this percentage, up to your Maximum Fire Resistance.',
  coldRes: 'Reduces incoming Cold damage by this percentage, up to your Maximum Cold Resistance.',
  lightningRes: 'Reduces incoming Lightning damage by this percentage, up to your Maximum Lightning Resistance.',
  chaosRes: 'Reduces incoming Chaos damage by this percentage, up to your Maximum Chaos Resistance.',
  fireResMax: 'Maximum effective Fire Resistance cap.',
  coldResMax: 'Maximum effective Cold Resistance cap.',
  lightningResMax: 'Maximum effective Lightning Resistance cap.',
  chaosResMax: 'Maximum effective Chaos Resistance cap.',
  damageTaken: 'Multiplier applied to all incoming damage.',
  critAvoid: 'Chance to cause an incoming Critical Strike to deal normal hit damage instead.',
  ailmentResist: 'Chance to ignore an incoming elemental or physical ailment.',
  afflictionExpiry: 'Increases the expiration rate of harmful status effects on you.',
  damageImmunity: 'Prevents all damage from hits, damage over time, and ground hazards while active.',
  debuffImmunity: 'Prevents application of new harmful status effects while active.',
  blockPower: 'Maximum fraction of an incoming hit\'s damage that can be prevented by a single block.',
  blockValue: 'Flat damage prevented when you block a hit, before Block Power capping.',
  guardStrength: 'Multiplier to both active Guard absorption pools and passive Block Value.',
  guardParry: 'Adds a parry window of this duration (in seconds) to the start of Guard skills that do not natively parry.',
  guardParryPower: 'Multiplier to counterattack damage dealt when you successfully parry.',
  parryDamageCooldown: 'Minimum cooldown in seconds between damaging parry counterattacks against the same target (projectile reflection is unaffected).',
  parryCounterBonus: 'Adds this multiple of parried incoming damage to your parry counterattack.',
  guardHoldTime: 'Adds flat duration in seconds to timed Guard stances (minimum 0.05s).',
  guardAegis: 'Causes your active Guard stance to also absorb hits taken by nearby minions.',
  domeDeflects: 'Causes your protective dome skills to reflect enemy projectiles outward instead of destroying them.',
  energyShield: 'Absorbs incoming damage before Life and recharges automatically after going unwounded for the Recharge Delay.',
  esRechargeRate: 'Amount of Energy Shield restored per second during recharge.',
  esRechargeDelay: 'Time in seconds without taking damage required before Energy Shield recharge begins.',
  esRechargeSteadfast: 'Chance for incoming damage not to interrupt an active Energy Shield recharge.',
  esDotResist: 'Reduces damage over time taken by your Energy Shield.',
  esDotBypass: 'Fraction of incoming damage over time that bypasses Energy Shield and damages Life directly.',
  lifeRegenToEs: 'Redirects this fraction of your Life Regeneration to restore Energy Shield continuously.',
  manaShield: 'Redirects this fraction of incoming damage to be deducted from Mana before Life.',
  poise: 'Absorbs Poise wear from incoming hits. Grants Poise Damage Reduction and Crowd Control Avoidance while unbroken; breaks at 0 and recovers after a delay.',
  poiseDR: 'Damage reduction granted while your Poise bar is unbroken.',
  poiseCcAvoid: 'Chance to ignore stuns and hard crowd control while your Poise bar is unbroken.',
  poiseRegenPct: 'Percentage of Maximum Poise recovered per second during recovery or calm refill.',
  poiseRegenDelay: 'Delay in seconds after Poise breaks before Poise recovery begins.',
  poiseRearmAt: 'Fraction of Maximum Poise that must be recovered after a break before Poise re-arms.',
  poiseCalmDelay: 'Delay in seconds without taking Poise damage before an unbroken Poise bar begins refilling.',
  poiseOnHit: 'Flat Poise restored each time you land a hit.',
  poiseOvercharge: 'Maximum additional Poise above your cap that can be held from explicit Poise gain effects.',
  insight: 'Resource generated while moving (or standing still if inverted) that is spent on hit to reduce incoming damage.',
  insightDR: 'Maximum damage reduction applied to incoming hits while Insight is available to spend.',
  insightEfficiency: 'Amount of incoming damage prevented per 1 point of Insight spent.',
  insightRegenPct: 'Fraction of Maximum Insight generated per second while moving.',
  insightTaper: 'Grace period in seconds after stopping movement before Insight begins decaying.',
  insightInversion: 'Shifts Insight generation from movement (0) to standing still (1).',
  insightStillTaper: 'Time in seconds of continuous stillness required to reach full inverted Insight generation.',
  insightSap: 'Rate at which Chill, Freeze, and Stun drain your current Insight pool.',
  endurance: 'Pool that subtracts up to Endurance DR flat damage from each incoming hit, spending 1 Endurance per point of damage prevented.',
  enduranceDR: 'Maximum flat damage subtracted from each incoming hit while Endurance remains.',
  enduranceRegenPct: 'Fraction of Maximum Endurance regenerated per second after the Endurance Regen Delay.',
  enduranceRegenDelay: 'Delay in seconds after spending Endurance before passive regeneration resumes.',
  wardDecay: 'Fraction of current Ward lost per second.',
  wardGain: 'Multiplier applied to all Ward gained.',
  staggerFrac: 'Fraction of incoming Life hit damage prevented upfront and dealt as damage over time over the Stagger Window.',
  staggerWindow: 'Duration in seconds over which staggered hit damage is dealt.',
  hitImmune: 'Causes all incoming hits to miss while active; does not prevent damage over time.',
  hitCap: 'Maximum Life damage that can be taken from a single hit.',
  lastGasp: 'Chance when taking lethal damage to survive at Last Gasp Life instead, subject to Last Gasp Cooldown.',
  lastGaspLife: 'Fraction of Maximum Life retained when Last Gasp prevents death.',
  lastGaspCooldown: 'Cooldown in seconds between Last Gasp activations.',
  weight: 'Character mass used in knockback, shove, and Poise calculations.',
  phasing: 'Allows movement through enemies and other actors without collision.',
  evasionToArmor: 'Grants Armor equal to this fraction of your Evasion rating.',
  evasionForgone: 'Reduces your Evasion rating by this fraction.',
  esToPoise: 'Grants Maximum Poise equal to this fraction of your Maximum Energy Shield.',
  esForgone: 'Reduces your Maximum Energy Shield by this fraction.',
  evasionToInsight: 'Grants Maximum Insight equal to this fraction of your Evasion rating.',
  evasionToInsightForgo: 'Reduces your Evasion rating by this fraction as part of an Insight conversion.',
  lifeToEs: 'Grants Maximum Energy Shield equal to this fraction of your Maximum Life baseline.',
  lifeForgone: 'Reduces your Maximum Life by this fraction as part of an Energy Shield conversion.',
  thorns: 'Flat Physical damage dealt to attackers when they hit you.',
  thornsReflect: 'Deals damage back to attackers equal to this fraction of hit damage taken.',
  thornsToHit: 'Adds this fraction of your flat Thorns as Physical damage to your own hits.',
  channelThorns: 'Flat Physical damage dealt to attackers when they hit you while you are channeling.',
  minionShare: 'Redirects this fraction of hit damage you take to be split evenly among your living minions.',
  lifeOnHit: 'Flat Life restored per hit landed.',
  lifeLeech: 'Recovers Life equal to this fraction of hit damage dealt.',
  lifeLeechToEs: 'Redirects this fraction of your Life Leech recovery into Energy Shield instead of Life.',
  manaLeech: 'Recovers Mana equal to this fraction of hit damage dealt.',
  esLeech: 'Recovers Energy Shield equal to this fraction of hit damage dealt.',
  wardLeech: 'Gains Ward equal to this fraction of hit damage dealt.',
  esOnHit: 'Flat Energy Shield restored per hit landed.',
  lifeOnKill: 'Flat Life restored per enemy killed.',
  manaOnKill: 'Flat Mana restored per enemy killed.',
  esOnKill: 'Flat Energy Shield restored per enemy killed.',
  lifeOnBlock: 'Flat Life restored when you block a hit.',
  lifeOnEvade: 'Flat Life restored when you evade an attack.',
  recuperate: 'Restores Life over the Recuperate Time equal to this fraction of Life lost to hits.',
  recuperateTime: 'Half-life duration in seconds over which Recuperate healing is restored.',
  absorbPower: 'Multiplier to the shield value of explicit skill absorb effects.',
  healPower: 'Multiplier to outgoing healing you grant.',
  healTaken: 'Multiplier to all Life healing you receive.',
  overheal: 'Converts this fraction of healing in excess of Maximum Life into Ward.',
  restorePower: 'Multiplier to Life and Mana restored by flasks and restoration streams.',
  restorePctMax: 'Adds this fraction of Maximum Life or Mana to flask restoration amounts.',
  vampiricShare: 'Redirects this fraction of your Life Leech to heal nearby allies instead of you.',
  bondShare: 'Heals your bonded companion for this fraction of damage you deal.',
  guardMend: 'Flat Life restored per second to nearby allies while you hold a Guard stance.',
  esToMana: 'Allows up to this fraction of Maximum Energy Shield to be spent to pay Mana costs when Mana is insufficient.',
  conduitRate: 'Drain rate per second for active resource conduits.',
  conduitEfficiency: 'Resource gained per 1 point of resource drained by an active conduit.',
  costToLife: 'Converts this fraction of skill Mana costs to be paid with Life instead.',
  costToMana: 'Converts this fraction of skill Life costs to be paid with Mana instead.',
  orbShedRate: 'Multiplier to all chances to spawn resource orbs.',
  overdriveCap: 'Maximum resource debt allowed when using skills without sufficient Mana or Life.',
  overdriveIdleDelay: 'Delay in seconds after casting before Overdrive debt repayment begins.',
  overdriveRecovery: 'Fraction of maximum Overdrive debt repaid per second.',
  overdriveRecoveryFlat: 'Flat Overdrive debt repaid per second.',
  overdriveFlow: 'Fraction of normal Overdrive debt repayment that continues while actively casting.',
  overdriveLifeFactor: 'Scales Life-based Overdrive debt repayment with your Life Regeneration and movement.',
  creeperSpeed: 'Movement speed multiplier for your carried creepers.',
  aoeRadius: 'Multiplier to the radius of your area skills and effects.',
  effectDuration: 'Multiplier to the duration of your buffs, status effects, and ground effects.',
  manaCost: 'Multiplier to skill resource costs.',
  manaUseCost: 'Multiplier to Mana spent when activating skills (excludes reservations and Life costs).',
  addedManaCost: 'Flat Mana added to skill costs.',
  addedLifeCost: 'Flat Life added to skill costs.',
  addedCooldown: 'Flat seconds added to base skill cooldowns.',
  costDamage_mana: 'Flat damage added to skills per 1 Mana spent on cast.',
  costDamage_life: 'Flat damage added to skills per 1 Life spent on cast.',
  costWard_mana: 'Grants an absorb shield per 1 Mana spent on cast (strongest shield applies; excludes substituted costs).',
  costWard_life: 'Grants an absorb shield per 1 Life spent on cast (strongest shield applies; excludes substituted costs).',
  costWardDuration: 'Base duration in seconds of shields granted by spending Mana or Life.',
  costWardCap: 'Maximum absorb shield from cost-ward effects as a fraction of Maximum Life.',
  chargeCap: 'Increases maximum stacks for all skill charges.',
  runeCap: 'Maximum number of runes that can be queued in an invocation sequence.',
  comboWindow: 'Multiplier to the allowed time window for completing skill sequences.',
  projectileCount: 'Additional projectiles fired per cast or attack.',
  projectileCountChance: 'Chance per cast or attack to fire 1 additional projectile.',
  projectileSpeed: 'Multiplier to projectile travel speed.',
  projectileSize: 'Multiplier to projectile collision and visual radius.',
  pierceCount: 'Number of targets a projectile passes through before terminating.',
  chainCount: 'Number of times a projectile chains to a new target after hitting.',
  forkCount: 'Number of times a projectile splits into two projectiles on hit.',
  projReturn: 'Causes projectiles to return to the cast origin or caster at the end of their flight.',
  projNova: 'Fires projectiles evenly in a 360-degree ring around you.',
  projPulse: 'Causes projectiles to oscillate in size and hitbox radius during flight.',
  projShrapnel: 'Causes projectiles to release a cone of shards behind the first target hit.',
  projHitDetonate: 'Causes projectile explosion payloads to trigger on every pierced, chained, or forked hit.',
  projReShatter: 'Allows projectile shrapnel effects to trigger again on each chain or fork.',
  returnShrapnel: 'Releases a burst of shards when a returning projectile reaches you.',
  projInherit: 'Fraction of parent projectile modifiers inherited by split or secondary projectiles.',
  projAccel: 'Rate at which projectiles accelerate (positive) or decelerate (negative) in flight.',
  projBounce: 'Number of times projectiles ricochet off walls and terrain.',
  projFrameBounce: 'Number of times projectiles bounce off the edge of the screen with refreshed range.',
  projRecurve: 'Chance for a piercing projectile to curve back and hit the same target again.',
  homingPower: 'Turn rate at which projectiles steer toward nearby enemies.',
  erraticPower: 'Amount of random lateral deviation added to projectile flight paths.',
  spiralPower: 'Causes projectiles to travel in an expanding spiral around the cast origin.',
  orbitPower: 'Causes projectiles to orbit around your character as you move.',
  spinPower: 'Causes projectiles to spiral tightly along their forward trajectory.',
  weavePower: 'Causes projectiles to oscillate in a figure-eight pattern along their trajectory.',
  guidePower: 'Turn rate at which in-flight projectiles steer toward your current cursor position.',
  castAtCursor: 'Spawns projectiles at your cursor position instead of at your character.',
  fireSalvo: 'Fires projectiles sequentially in a rapid burst toward your live cursor rather than simultaneously.',
  fireVolley: 'Fires projectiles in a parallel line abreast rather than a fan.',
  volleySpacing: 'Distance between adjacent projectiles in a parallel volley.',
  spreadAngle: 'Total arc angle in degrees across which multi-projectile fans spread.',
  randomArc: 'Arc angle modifier for randomly targeted strikes or projectiles.',
  multiTarget: 'Additional nearby targets struck by single-target skills.',
  swingArc: 'Multiplier to the arc angle of melee swings and cone skills.',
  meleeReach: 'Multiplier to the range of melee strikes and cone skills.',
  meleeReverb: 'Number of additional nearby enemies struck by echoed melee hits.',
  splashRadius: 'Radius around the primary target within which single-target hits deal splash damage.',
  meleeSweep: 'Converts melee arc attacks into forward-traveling crescent projectiles.',
  sweepRange: 'Travel distance of melee sweep crescents.',
  sweepSpeed: 'Travel speed of melee sweep crescents.',
  knockback: 'Distance enemies are pushed back on melee hit.',
  shoveAuthority: 'Multiplier to your effective mass when calculating knockback and shove distance.',
  impactDamage: 'Multiplier to collision damage dealt when knocked-back enemies hit walls or heavy targets.',
  gripPower: 'Increases the maximum target weight your grabs can hold and reduces target escape rate.',
  gripCrush: 'Deals Physical damage per second to grabbed targets equal to this fraction of their Maximum Life.',
  wriggle: 'Increases how quickly you break free from enemy grabs and holds.',
  trample: 'Adds effective mass for trampling through lesser swarm enemies while moving.',
  plyRend: 'Additional plies (hit-absorbing layers) stripped per hit against plied enemies.',
  displaceForce: 'On-hit displacement force: positive pushes targets away, negative pulls targets inward.',
  knockBuffet: 'Causes knockback to push targets in a random direction.',
  aoeShape: 'Overrides area skill geometry (circle, square, or triangle).',
  aoeScatter: 'Splits area skills into this many smaller secondary blasts.',
  aoeCascade: 'Repeats ground area skills in a forward line of cascading impacts.',
  cascadeStep: 'Distance between successive impacts in an area cascade.',
  aoeSpin: 'Rotation speed of directional area effects.',
  pulseCount: 'Additional pulses emitted by lingering ground effects.',
  stormCount: 'Additional strikes called down over a storm skill\'s duration.',
  stormImmediate: 'Fraction of a storm skill\'s total strikes that land immediately on cast.',
  fissureCount: 'Additional fissures created per fissure skill cast.',
  fissureBranches: 'Additional secondary branches split from each fissure.',
  lingerField: 'Duration in seconds of the damaging ground field left behind by area skills.',
  hexBlast: 'Causes cursed ground areas to detonate for area damage shortly after placement.',
  channelBurst: 'Periodically triggers a damaging nova around you while channeling.',
  channelStorm: 'Periodically calls down damaging strikes around you while channeling.',
  channelRamp: 'Increases channeled skill damage for each second the channel is held.',
  channelSpool: 'Grants additional projectiles per second while holding a channeled projectile skill.',
  channelSpoolCap: 'Maximum bonus projectiles a channeled skill can gain from spooling.',
  channelHitSpool: 'Grants additional projectiles to a channeled skill per hit landed during the channel.',
  channelMobility: 'Increases movement speed while channeling.',
  channelTurnRate: 'Maximum turn speed in radians per second while channeling a directional skill.',
  channelLockAim: 'Locks channeled skill targeting to the initial cursor position on cast.',
  channelAutoSpin: 'Automatically rotates directional channeled skills in a continuous circle.',
  channelPersist: 'Causes channeled skills to remain active at their target location after you stop channeling.',
  brimFill: 'Multiplier to the fill rate of gathering gauges.',
  brimDecay: 'Multiplier to the decay rate of unspent gathering gauges.',
  brimPower: 'Multiplier to the effect or damage of a full gathering gauge release.',
  fuseDelay: 'Multiplier to the detonation delay of fused skills and effects.',
  fusePower: 'Multiplier to the damage of fused skills and effects upon detonation.',
  overchargeStages: 'Additional charge stages a staged cast can reach before release.',
  sparkWindow: 'Time window in seconds after a charge stage completes during which releasing grants a Perfect Timing bonus.',
  sparkBonus: 'Multiplier to the bonus granted by a Perfect Timing release.',
  repeatCount: 'Number of additional times a skill repeats after its initial execution.',
  repeatScale: 'Increases the damage and area of each successive skill repeat.',
  repeatRetarget: 'Allows skill repeats to re-aim toward the nearest living enemy.',
  repeatLock: 'Locks movement until all repeats of a cast have completed.',
  unleashMax: 'Maximum seals a skill can generate between casts to repeat on its next use.',
  triggerChance: 'Multiplier to the trigger probability of armed trigger effects.',
  triggerThreshold: 'Scales the damage taken required to activate wound-triggered skills (lower triggers sooner).',
  triggerPower: 'Scales the number of status applications required to activate status-triggered skills (lower triggers sooner).',
  procDepth: 'Maximum chain depth for triggered effects triggering subsequent triggered effects.',
  castMobility: 'Allows movement at this fraction of normal speed during non-channeled cast times.',
  moveExplode: 'Triggers a damaging explosion at both the departure and arrival points of movement skills.',
  moveTrail: 'Leaves a damaging ground trail along the path of movement skills.',
  departSplash: 'Causes movement skill area payloads to trigger at the departure point instead of the destination.',
  conduction: 'Causes projectiles passing through elemental ground effects to gain damage of that element.',
  suffusion: 'Causes projectiles passing through your ground effects to recreate that ground effect where they land.',
  poolCap: 'Multiplier to the maximum capacity of stored damage pools.',
  embedIcd: 'Allows triggered ground traps and snares to re-arm after this cooldown instead of expiring.',
  tetherWidth: 'Multiplier to the beam width of tether skills.',
  [PROCESSION.growth.stat]: `Each Consecration cast adds ${PROCESSION.growth.perStack * 100}% of the circle’s base radius for ${PROCESSION.growth.duration} seconds. Up to ${PROCESSION.growth.max} casts stack, and each expires separately.`,
  [PROCESSION.escort.stat]: `Your guardian reforms ${PROCESSION.escort.reform} seconds after falling. Each double pulse calls a Sentinel for ${PROCESSION.escort.duration} seconds, up to ${PROCESSION.escort.maxGuests} reinforcements.`,
  bashPower: 'Multiplier to Shield Bash damage.',
  bashFloor: 'Minimum Guard bar fraction required on release to trigger a Shield Bash.',
  bashInvert: 'Inverts Shield Bash scaling so lower remaining Guard bar grants higher bash damage.',
  bashArmTime: 'Multiplier to the hold duration required before a raised Guard arms its Shield Bash.',
  durationAuraCap: 'Maximum number of temporary duration auras that can be active simultaneously.',
  auraEsRecharge: 'Increases Energy Shield recharge rate for allies affected by your auras.',
  auraEsDelay: 'Reduces Energy Shield recharge delay for allies affected by your auras.',
  reflex: 'Allows the skill to be used instantaneously without interrupting active casts, channels, or dashes.',
  thirstless: 'Allows flasks to be activated even while at full Life or Mana.',
  tuneFavor: 'Causes re-tuned crystal constructs to spare allies and extend their beneficial effects.',
  pourPower_surge: 'Multiplier to the instant/front-loaded portion of two-stage flask recovery.',
  pourPower_settle: 'Multiplier to the gradual over-time portion of two-stage flask recovery.',
  pourPct_surge: 'Adds flat percentage of Maximum Life/Mana to the front-loaded portion of flask recovery.',
  pourPct_settle: 'Adds flat percentage of Maximum Life/Mana to the over-time portion of flask recovery.',
  pourPrime: 'Maximum number of full-pool flask uses that can be banked to trigger automatically upon taking damage.',
  remnantChance: 'Chance on hit to spawn an elemental remnant that empowers your next skill of that element.',
  remnantOnCast: 'Chance on casting an elemental skill to spawn a matching elemental remnant.',
  mimicWitness: 'Radius within which Mimicry can capture studied enemy skills when cast, without needing to be hit by them.',
  mimicBank: 'Additional captured skills your Mimicry repertoire can store.',
  windchillWard: 'Prevents ambient mountain windchill accumulation and sheds existing windchill as if near a heat source.',
  possessDuration: 'Multiplier to the duration of possession effects.',
  possessPower: 'Increases the damage and effect scaling of skills used while possessing a target.',
  huskGuard: 'Reduces damage taken by your original body while possessing another actor.',
  minionDamage: 'Multiplier to all damage dealt by your summoned minions.',
  minionDamageForgone: 'Fraction of bonus Minion Damage scaling above 100% removed from minions (links still read your pre-forgo scaling).',
  minionLife: 'Multiplier to the Maximum Life of your summoned minions.',
  minionMaxCount: 'Increases the maximum number of minions you can have active.',
  minionDamageTaken: 'Multiplier to all damage taken by your summoned minions.',
  minionThreat: 'Multiplier to threat generated by your minions and their priority as enemy targets.',
  minionAreaAvoidance: 'Chance for your minions to avoid area-of-effect hits (capped at 85%; does not affect damage over time).',
  minionSize: 'Multiplier to the size and collision radius of your minions.',
  minionMoveSpeed: 'Multiplier to the movement speed of your minions.',
  minionHaste: 'Multiplier to the attack, cast, and movement speed of your minions.',
  minionPlies: 'Grants additional Plies to your minions; each Ply prevents all damage from 1 hit.',
  minionLifePlyTrade: 'Converts increments of this much increased Minion Life into +1 Minion Ply instead.',
  minionLifePlyEcho: 'Grants +1 Minion Ply for each increment of this much increased Minion Life without removing the Life bonus.',
  throngPockets: 'Additional dormant throng husk pockets spawned per zone.',
  throngYield: 'Multiplier to the number of throng minions spawned per pocket or raising (minimum 1).',
  minionRegen: 'Flat Life regenerated per second by your minions.',
  minionRegenPct: 'Fraction of Maximum Life regenerated per second by your minions.',
  minionRegenRate: 'Multiplier applied to both flat and percentage Life Regeneration on your minions.',
  minionDetectionRange: 'Aggro and target acquisition range of your minions.',
  minionDecayRate: 'Multiplier to the Life decay rate of temporary decaying minions.',
  minionRespawnTime: 'Multiplier to the revival timer of persistent minions after death.',
  minionUndying: 'Duration in seconds that slain minions remain active and continue fighting after death.',
  minionGuard: 'Causes minions to stay close to you and prioritize defending you rather than chasing distant targets.',
  minionDeathHeal: 'Heals surviving minions for this fraction of a dying minion\'s Maximum Life.',
  minionDeathHealFlat: 'Flat Life restored to surviving minions when a minion dies.',
  minionExpiryIsDeath: 'Causes minions expiring from duration to count as dying, triggering on-minion-death effects.',
  minionExplodeDeath: 'Causes minions to explode on death for this fraction of their Maximum Life as area damage.',
  minionExplodeLowLife: 'Causes minions to automatically detonate upon reaching Low Life.',
  minionBloom: 'Time in seconds after summoning at which minions automatically burst and die (0 disables Bloom).',
  minionBloomPower: 'Fraction of a minion\'s Maximum Life dealt as Chaos area damage when it bursts via Bloom.',
  summonCount: 'Additional minions summoned per cast of a summon skill.',
  summonSequence: 'Spawns multiple summoned minions sequentially rather than simultaneously.',
  summonAtCursor: 'Spawns summoned minions at your cursor location instead of beside you.',
  summonImpact: 'Causes newly summoned minions to deal this fraction of their Maximum Life as area damage on arrival.',
  summonMend: 'Causes newly summoned minions to heal nearby allies on arrival.',
  sacrificeMinions: 'Allows corpse-consuming skills to sacrifice your own living minions when no corpse is available.',
  targetMinionFallback: 'Allows corpse-targeted skills to target a living minion without killing it when no corpse is available.',
  corpseBatch: 'Additional corpses consumed or raised per cast of a corpse skill.',
  offeringShare: 'Grants you this fraction of the buff effects from your Minion Offering skills.',
  commandDiscipline: 'Increases command authority applied to unruly minions.',
  constructMaxCount: 'Increases the maximum number of totems, traps, mines, and sentries you can have active.',
  constructCastRate: 'Multiplier to the attack and cast rate of your constructs.',
  constructTaunt: 'Causes your constructs to taunt nearby enemies.',
  castAsTotem: 'Converts the skill to place a totem that casts the skill for you.',
  totemPlaceTime: 'Multiplier to the placement speed of totems.',
  mirageCount: 'Additional echo mirages created to repeat your skills.',
  mirageDamage: 'Multiplier to damage dealt by your echo mirages.',
  mercRetinue: 'Additional mercenary companions you can have hired at once.',
  mercVigor: 'Increases the Maximum Life and damage of hired mercenaries.',
  mercEase: 'Reduces the enemy difficulty scaling added by active mercenaries.',
  mercHireDiscount: 'Reduces the hiring cost of mercenaries by this fraction.',
  detectability: 'Multiplier to the radius at which enemies detect you.',
  concealment: 'Reduces enemy detection range and rear awareness until you attack.',
  noiseOnHit: 'Radius within which your hits and projectile impacts alert nearby enemies.',
  threatGen: 'Multiplier to threat generated by your hits.',
  targetPriority: 'Weights how likely enemies are to target you relative to allies and minions.',
  areaAvoidance: 'Chance to avoid area-of-effect hits and their on-hit effects (capped at 85%).',
  invisible: 'Prevents enemies from seeing or directly targeting you; does not prevent damage from area effects or stray projectiles.',
  luck: 'Multiplies the trigger chance of all probability-based proc rolls.',
  // Engine-registered stat details
  gaugeGain: 'Multiplier to gauge points gained from kills, deaths, hits, and time.',
  gaugeNeed: 'Multiplier to the gauge points required before a gauge skill can be used.',
  gaugeLockout: 'Multiplier to the lockout duration after a gauge skill is used during which it cannot gain gauge.',
  auroraCapacity: 'Increases the maximum stored projectiles of your active auroras.',
  auroraRecharge: 'Multiplier to the recharge speed of your active auroras.',
  guardianRecharge: 'Multiplier to the recharge speed of your projectile-intercepting guardians.',
  satelliteCount: 'Adds additional orbiting satellites to satellite families you already have active.',
  satelliteEquipmentCount: 'Count of equipped items that grant orbiting satellites.',
  satelliteOrbit: 'Multiplier to the orbit radius of your satellites.',
  satelliteSpeed: 'Multiplier to the angular orbit speed of your satellites.',
  seatPower_outward: 'Active while placed in a container. Multiplies the stat values of all orthogonally adjacent items in the container.',
  seatPower_solitude: 'Active while placed in a container. Multiplies this item\'s own stat values for each orthogonally adjacent empty slot.',
  seatPower_communion: 'Active while placed in a container. Multiplies this item\'s own stat values for each orthogonally adjacent occupied slot.',
  // Passes 13-14: Astrolabe Engines & Outer Constellations
  materialOnlyMore: 'Multiplies your physical hit damage while preventing you from dealing fire, cold, lightning, or chaos hit damage.',
  blockToDamage: 'Grants MORE hit damage proportional to your active Block Chance.',
  surplusHitMore: 'Grants MORE hit damage while your current Mana is at or above 75% of maximum.',
  lowManaHitLess: 'Reduces hit damage dealt while your current Mana is below 50% of maximum.',
  pierceDecay: 'Reduces a projectile\'s subsequent hit damage for each target it has already pierced (floored at 35%).',
  evadeSurgeOnHurt: 'Taking hit damage grants a brief Slipstream evasion surge and guarantees evading the next attack within 1.5 seconds (internal cooldown).',
  nonCritLess: 'Reduces hit damage dealt by hits that do not critically strike.',
  fullEsDR: 'Reduces incoming hit damage while your Energy Shield stands at or above 75% of maximum.',
  dualAilmentApply: 'Direct hits deal less damage, can inflict a second distinct ailment simultaneously, and raise stackable ailment caps.',
  ailmentMultiDot: 'Enemies suffering from three or more distinct active ailments take more damage over time.',
  offeringPower: 'Slaying afflicted foes (or repeatedly striking afflicted elites) builds Undying Offering stacks that grant MORE damage to you and your minions.',
  overhealToWard: 'Converts excess healing past full Life into decaying Ward and adds a share of current Ward as flat fire hit damage.',
  direDeferral: 'Defers a large share of incoming hit damage into your Stagger window with a modest surcharge on the deferred damage.',
  armorThornsScale: 'Blocking or taking a melee hit unleashes a physical retaliation shockwave scaled by your Armor (internal cooldown).',
  staticDischargeMore: 'Non-cooldown attacks build Static Charges that mana-spending or cooldown skills discharge for MORE hit damage per charge.',
  staticBasicLess: 'Reduces hit damage dealt by non-cooldown attacks.',
  chronoVsSlowMore: 'Grants MORE hit damage against enemies that are Chilled, Slowed, Frozen, Stunned, or carrying Temporal Debt.',
  ambushBurstMore: 'Grants MORE hit damage and bonus critical strike chance against high-life enemies.',
  ambushLowLifeLess: 'Reduces hit damage dealt against enemies below half life.',
  omniElemCascade: 'Fire, Cold, or Lightning hit damage triggers a cascading area burst of the next element in the cycle (internal cooldown).',
  fatalPactPower: 'Inflicting damaging ailments may mirror mild copies onto you, granting MORE damage per active self-ailment and purging three or more into a chaos nova.',
  plagueWakeDps: 'Moving or losing a minion pulses a toxic chaos miasma that poisons nearby enemies and empowers nearby minions.',
  astralEchoBuff: 'Casting a Song, Warcry, or Aura extends your active buffs and pulses Ward and Haste to nearby allies (internal cooldown).',
  recentlyWindow: 'Sets the duration in seconds that counts as "recently" (base 4s, clamped 1–12s) for all recency conditions, recent minion death stacks, recently-summoned minion effects, and recent damage tracking.',
  minionAnchoredInvuln: 'Temporary minions you summon cannot move for their entire duration, but are invulnerable to incoming hits and damage over time while summoned recently.',
  minionSquad: 'Organizes minions into coordinated tactical squads that advance and engage together, granting +6% Armor and +3% hit damage reduction per nearby squadmate (up to 4). Composes with Close Formation to form defensive squads around you.',
  summonWard: 'Grants flat protective Ward to you, nearby allies, and the newly summoned minion on emergence.',
  fieldCarryMore: 'Projectiles that pass through one of your ground effects or elemental fields become amplified, dealing MORE hit damage and gaining +15% area of effect.',
  burstStaggerPct: 'Whenever a single hit exceeds 30% of your maximum life, diverts this fraction of the excess portion into your Stagger window (composes cleanly with per-hit damage caps).',
  highRollShockChain: 'Hits that land in your high-roll window guarantee Shock and arc a chained lightning bolt to a nearby enemy (0.4s cooldown).',
  flaskBlockCharge: 'Chance on blocking a hit to restore +1 charge to a non-full flask (1s cooldown).',
  virtuoseStance: 'Using a movement skill (0.5s cooldown) toggles between Probing Weakness (chance for double damage and penetration, reduced resistances) and Stalwart Resolve (block chance, guard strength, and poise, reduced attack/cast speed).',
  cadenceFinisher: 'Every 4th landed hit (0.15s hit-count cooldown) unleashes a tag-specialized finisher: Melee triggers a concussive shockwave and poise break; Projectile splinters shards onto nearby foes; Spells unleash an arcane nova and restore 6% maximum Mana.',
  salvatoryCounter: 'Blocking or parrying (0.5s cooldown) immediately strikes the attacker back with a weapon-scaled physical counter-strike that rolls critical chance, inflicts Bleed, and grants Endurance or Ward.',
  silverQuiverPower: 'Holds up to 5 Anointed Silver rounds (regenerates +1 every 2s and refills completely on any movement skill). Each loaded round grants MORE Projectile damage; each spent round grants MORE Melee damage.',
  smokeVeilPower: 'Using a movement skill (4s cooldown) grants 2.5s of Phantom Invisibility. Your next hit breaks the veil for MORE damage, heavy critical strike chance, and guaranteed Bleed and Poison.',
  elemDestabPower: 'Casting a skill while below 35% Mana (or dropping below 35% Mana, 3.5s cooldown) unleashes a tri-elemental Fire, Cold, and Lightning cataclysm scaled by Maximum Life and Energy Shield, applying Burn, Chill, and Shock and rebounding 18% Maximum Mana.',
  occultStackMore: 'Grants MORE hit damage (and DoT damage at higher investment) for each total active ailment stack currently on the enemy, capped at 20 stacks.',
  undertakerPower: 'Slaying enemies, losing a minion, or landing every 5th hit against rares/bosses spawns necrotic Bile Globes. You or your minions harvest globes on contact for healing and Undertaker stacks (0–8, 10s) granting MORE damage to you and your minions.',
  beaconPolarity: 'Splits your Energy Shield and Ward bar into two active polarities: at >=50% Energy Shield or while holding Ward, Spells, Songs, and Heals gain MORE power and area; below 50% Energy Shield without Ward, Attacks gain MORE damage, attack speed, and Energy Shield leech.',
  burnDetonatePower: 'Hitting an enemy carrying 4 or more Burn stacks (0.8s per-target cooldown) consumes half those stacks to detonate a Fire Nova scaled by the consumed burn damage and applies fresh Burn to nearby enemies.',
  equilibriumPower: 'Casting Attacks banks up to 3 Lure of Darkness charges that empower Spells; casting Spells banks up to 3 Lure of Light charges that empower Attacks with MORE damage, haste, and cross-pollinated attack/spell scaling.',
  trophyPower: 'Slaying rares or bosses—or landing every 8th hit against them—banks long-lived Trophy stacks (0–5, 20s) granting MORE damage (doubled vs rares/bosses), Armor, attack and cast speed, and resistances.',
  frostRicochet: 'Projectiles hitting Chilled or Frozen enemies (0.35s cooldown) ricochet freezing shards to nearby foes with Cold Penetration and Chill.',
  neuralSparkPower: 'Critical strikes (0.2s cooldown) stack Neural Surge (0–5, 5s) for attack and cast speed; reaching 5 stacks discharges a chained Lightning Arc that Shocks nearby foes and resets stacks.',
  residualImprint: 'Casting a Spell imprints its dominant element onto your next 2 Attacks as extra typed damage; casting an Attack imprints kinetic force onto your next Spell as extra Physical damage.',
  plagueDiffPower: 'Inflicting Bleed, Burn, or Poison (1.2s per-target cooldown) emits a corrosive chaos pulse centered on the victim that damages nearby foes, refreshes their DoTs, and empowers nearby minions.',
  dawnConsecrate: 'Real healing or gaining Ward (3.5s cooldown) lays 4s of Consecrated Ground that periodically scorches enemies (40% MORE vs foes below 40% Life) and hastes and mends allies and minions inside.',
  chronoSiphon: 'Hitting Chilled, Slowed, Frozen, Stunned, Cursed, or Temporal-Debt enemies (0.75s cooldown) shaves active skill cooldowns and extends active beneficial buffs.',
  cryoCocoonPower: 'When incoming damage drops your Life below 35% (25s cooldown), encases you in 2s of invulnerable ice that heals per second, then shatters in a 210px Cold nova applying Chill and Stun/Poise crush.',
  lithicFissurePower: 'When incoming damage drops your Life below 40% (12s cooldown), erupts a 190px physical shockwave scaled by Armor, refills 30% max Endurance, and hardens a 6s Stone Skin armor and endurance shell.',
  fueledRatePower: 'Slaying enemies—or landing every 4th hit against rares/bosses—banks Fueled Momentum stacks (0–10, 7s) granting attack and cast speed per stack and Frenzied moving-cast speed while active.',
  windburnPower: 'Moving continuously launches Fire+Cold Windburn bolts every 0.9s applying Burn and Chill; casting reload or movement skills (2.5s cooldown) unleashes a 165px chilling knockback Overflow whirlpool.',
  phaseStasisPower: 'Becoming Invisible, holding >=40% concealment, or evading an attack (3.5s cooldown) emits a 2.5s Phase Dilation field slowing and marking nearby foes; hitting stunned, frozen, or dilated foes triggers Night Bite bleed and healing.',
  tractorTetherPower: 'Automatically links up to 3 enemies within 250px every 0.6s, dealing Lightning damage, pulling non-bosses inward, inflicting Shock, and siphoning 2.5% maximum Mana and Energy Shield per linked enemy.',
  plasmaDisintPower: 'Hits etch Disintegration stacks (0–5, 0.2s per-target cooldown). Victims at >=4 stacks suffer MORE hit damage; applying a 6th stack triggers Plasma Overflow, detonating a 175px Chaos+Lightning blast and shredding defenses for 4s.',
  springBloomPower: 'Casting Ultimate, Cooldown (>=3s), or Summon skills (5s cooldown)—or slaying rares/bosses—scatters 2 empowering 8s Bloom Flowers that pulse MORE damage, attack/cast/minion haste, and Life+Mana regen to allies inside 145px.',
  livingTidesPower: 'Dual-mode sustain: standing stationary for 2s blooms a 160px Healing Roots sanctuary restoring Life, Mana, and Energy Shield to allies; moving continuously without taking hits ramps Soothing Voyage healing and movement speed.',
  burnFeastPower: 'Direct hits have a 30% chance (3s cooldown) to spawn a 4s Lava Puddle burning foes inside; Burn damage you inflict heals you for 18% of burn damage dealt (capped at 15% maximum life per second).',
  blockIntegratePower: 'Casting Cooldown (>=2s), Guard, or Warcry skills (2s cooldown) banks Integrated Block Charges (0–4, 10s). Taking a hit spends 1 charge to cut damage by 35% (scaled), grant Ward, and reflect 40% of prevented damage.',
  critBlastPower: 'Critical strikes (0.25s cooldown) stack Blast Charges (0–3). The 3rd crit detonates a 175px Physical+Fire explosion on the target, stunning non-bosses for 1s and tearing 35% of a boss\'s maximum Poise.',
  recyclePower: 'Slaying enemies—or landing every 5th hit against rares/bosses (1.5s cooldown)—restores +1 charge to a non-full charge skill and shaves cooldown; casting reload, munition, or flask skills (2s cooldown) emits a chilling Cold nova.',
  bleedTransfusePower: 'Direct hits against Bleeding enemies heal you for 12% of hit damage dealt (40% of overheal becomes Ward), and while on Low Life you enter Adrenal Hyperdrive for attack/cast speed, critical chance, critical multiplier, and movement speed.',
  hypothermiaPower: 'Deals massive MORE hit damage against Frozen, Stunned, or Poise-Broken enemies, and increases Cold poise damage against Chilled enemies by 40%.',
  poisonMeltPower: 'Each active Poison stack on enemies you poison (up to 15 stacks) shreds their effective Armor by 4% per stack and reduces their Chaos and Physical defenses for both you and your minions.',
  pylonResonancePower: 'Standing within 220px of your Constructs or Living Minions restores Mana and Energy Shield per second and hastes them; casting a movement skill (3s cooldown) overcharges nearby Constructs and Minions in a Lightning+Chaos burst.',
  energyExtractPower: 'Slaying enemies—or landing every 6th hit against rares/bosses (2s cooldown)—spawns collectable Power Blobs that restore Mana, shave active cooldowns, feed Ultimate skill gauges, and grant haste on pickup.',
};
for (const [id, d] of Object.entries(STAT_BLURBS)) {
  if (STAT_DEFS[id]) STAT_DEFS[id].desc = d;
}
