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
      'armorPen', 'firePen', 'coldPen', 'lightningPen', 'chaosPen', 'insightPen', 'esShred',
      // Ailments & curses
      'statusChance', 'statusMagnitude', 'ailmentStacks', 'dotPropagates',
      'curseRupture', 'dotRupture', 'doomDot', 'hedonism',
      // The breaker's lane
      'poiseDamage', 'sunderDuration', 'impalePower',
      // Position & execution
      'ambushBonus', 'proximityDamage', 'cullThreshold', 'killProcOnHit',
      // Dice texture
      'damageSpread', 'luckyChance', 'unluckyChance', 'highRollWindow',
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
      'damageTaken', 'critAvoid', 'ailmentResist', 'afflictionExpiry', 'lowLifeLine',
      // Block & guard
      'blockPower', 'blockValue', 'guardStrength', 'guardParry', 'guardParryPower',
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
      'wardDecay', 'wardGain', 'staggerFrac', 'staggerWindow', 'hitImmune', 'hitCap',
      // Body & substance
      'weight', 'phasing',
      // The stat-trade dials
      'evasionToArmor', 'evasionForgone', 'esToPoise', 'esForgone',
      // Retaliation
      'thorns', 'thornsReflect', 'thornsToHit', 'channelThorns', 'minionShare',
    ],
  },
  sustain: {
    label: 'Sustain',
    blurb: 'What flows back — regeneration, leech, and every gain.',
    core: ['lifeRegen', 'manaRegen'],
    used: [
      'lifeRegenPct', 'manaRegenPct',
      // On-hit / leech
      'lifeOnHit', 'lifeLeech', 'manaLeech', 'esLeech', 'wardLeech', 'esOnHit',
      // On-kill
      'lifeOnKill', 'manaOnKill', 'esOnKill',
      // On-block / on-evade
      'lifeOnBlock', 'lifeOnEvade',
      // Wound recovery & healing economy
      'recuperate', 'recuperateTime', 'healPower', 'healTaken', 'overheal',
      'restorePower', 'restorePctMax', 'vampiricShare', 'bondShare', 'guardMend',
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
      'manaCost', 'addedManaCost', 'addedLifeCost', 'addedCooldown',
      'costDamage_mana', 'costDamage_life',
      // Use-charges & ammunition
      'skillCharges', 'skillChargeRate', 'reloadSpeed', 'chargeCap', 'runeCap',
      // The combo grammar's timing lever
      'comboWindow',
      // Projectiles — count & flight
      'projectileCount', 'projectileCountChance', 'projectileSpeed', 'projectileSize',
      'pierceCount', 'chainCount', 'forkCount', 'projReturn', 'projNova', 'projPulse',
      'projShrapnel', 'projHitDetonate', 'projReShatter', 'returnShrapnel', 'projInherit',
      'projAccel', 'projBounce', 'projRecurve',
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
      'castMobility', 'moveExplode', 'moveTrail',
      // Field interplay & oddments
      'conduction', 'suffusion', 'poolCap', 'embedIcd', 'tetherWidth',
      'bashPower', 'bashFloor', 'bashInvert',
      'durationAuraCap', 'auraEsRecharge', 'auraEsDelay',
      'reflex', 'thirstless', 'remnantChance', 'remnantOnCast',
    ],
  },
  minions: {
    label: 'Minions',
    blurb: 'Everything you summon, plant, or echo.',
    core: [],
    used: [
      'minionDamage', 'minionLife', 'minionMaxCount', 'minionDamageTaken',
      'minionSize', 'minionMoveSpeed', 'minionHaste', 'minionRegen', 'minionRegenPct',
      'minionDetectionRange', 'minionDecayRate', 'minionRespawnTime', 'minionUndying',
      'minionGuard', 'minionDeathHeal', 'minionDeathHealFlat', 'minionExpiryIsDeath',
      'minionExplodeDeath', 'minionExplodeLowLife',
      'summonCount', 'summonSequence', 'summonAtCursor', 'summonImpact', 'summonMend',
      'sacrificeMinions', 'targetMinionFallback', 'corpseBatch', 'offeringShare',
      'commandDiscipline',
      // Constructs & totems
      'constructMaxCount', 'constructCastRate', 'constructTaunt', 'castAsTotem',
      'totemPlaceTime',
      // Echoes — ghosts that cast YOUR skills (deliberately not minions,
      // but this is their household on the sheet)
      'mirageCount', 'mirageDamage',
    ],
  },
  misc: {
    label: 'Misc',
    blurb: 'Movement, presence, fortune — and anything else your build touches.',
    core: [],
    used: ['traction', 'detectability', 'threatGen', 'invisible', 'luck'],
  },
};

/** Rows printed ABOVE the tab strip, always — the three numbers every build
 *  checks constantly (attributes render above these, also always). */
export const SHEET_VITALS: string[] = ['life', 'mana', 'moveSpeed'];

/** Generated stat families seat by PREFIX (the itemgen GENERATED_STAT
 *  pattern plus the load-time families): one entry covers however many ids
 *  the minting registry produces. Family rows are never core — they surface
 *  only while non-base, even under "show unused" (a hundred untouched
 *  apply_<status> dials is exactly the wall this file exists to fold away).
 *  The blurb serves any id of the family the tooltip meets. */
export interface SheetFamilySeat { prefix: string; cat: string; blurb: string }
export const SHEET_FAMILY_SEATS: SheetFamilySeat[] = [
  { prefix: 'apply_', cat: 'offense', blurb: 'Chance your hits inflict this status.' },
  { prefix: 'damageVs_', cat: 'offense', blurb: 'Increased damage per stack of this status already on the target.' },
  { prefix: 'popPower_', cat: 'offense', blurb: 'Scales the burst a reapplication detonates from this status.' },
  { prefix: 'convert_', cat: 'offense', blurb: 'A fraction of one damage type dealt as another instead — conversion, not addition.' },
  { prefix: 'addedMin_', cat: 'offense', blurb: 'Raises only the BOTTOM of this damage roll — a steadier floor.' },
  { prefix: 'addedMax_', cat: 'offense', blurb: 'Raises only the TOP of this damage roll — a taller ceiling.' },
  { prefix: 'dotLeech_', cat: 'sustain', blurb: 'A fraction of this ailment\'s ticking damage flows back to you as life.' },
  { prefix: 'orbOnHit_', cat: 'sustain', blurb: 'Chance your hits shed this orb for anyone to pick up.' },
  { prefix: 'orbOnKill_', cat: 'sustain', blurb: 'Chance your kills shed this orb.' },
  { prefix: 'orbOnHurt_', cat: 'sustain', blurb: 'Chance taking a wound sheds this orb.' },
  { prefix: 'orbRefund_', cat: 'sustain', blurb: 'What picking this orb up refunds.' },
  { prefix: 'chargeCap_', cat: 'skills', blurb: 'Additional maximum stacks of this charge.' },
  { prefix: 'chargeRegen_', cat: 'skills', blurb: 'This charge builds on its own over time.' },
  { prefix: 'proc_', cat: 'skills', blurb: 'Chance this triggered effect fires — on top of its own rate discipline.' },
  { prefix: 'combo_', cat: 'skills', blurb: 'Equips this cast-pattern grammar: complete its pattern with your recent casts and its payoff fires.' },
  { prefix: 'classSkill_', cat: 'skills', blurb: 'Levels added to every skill gem of this class\'s school.' },
  { prefix: 'remnantDrop_', cat: 'skills', blurb: 'Chance your casts shed this remnant, empowering the next cast of its school.' },
  { prefix: 'minionApply_', cat: 'minions', blurb: 'Your minions\' hits may inflict this status.' },
  { prefix: 'sympathy_', cat: 'minions', blurb: 'Your gains echo along this bond to kin — flasks, orbs, charges, heals.' },
  { prefix: 'attune_', cat: 'misc', blurb: 'Attunement to this tone.' },
  { prefix: 'terraform_', cat: 'misc', blurb: 'Multiplies how fast this ground grows for its bearer.' },
  { prefix: 'terraformFx_', cat: 'misc', blurb: 'Arms this ground\'s authored combat effect.' },
];

/** Stats that never print, whatever their value — monster/AI-side dials the
 *  player sheet has no honest reading for. An escape hatch, kept tiny. */
export const SHEET_OMIT: Set<string> = new Set([
  'aiAimLead', 'aiAimJitter', 'detectionRange',
]);

/** Where an unseated, modified stat folds — the safety net, never the plan. */
export const SHEET_FALLBACK_CAT = 'misc';

/** The family seat serving a generated id, if any. */
export function sheetFamilyOf(id: string): SheetFamilySeat | null {
  for (const fam of SHEET_FAMILY_SEATS) if (id.startsWith(fam.prefix)) return fam;
  return null;
}

/** The tooltip's one-liner for ANY stat id: the authored blurb, else the
 *  generated family's shared line. */
export function statBlurbOf(id: string): string | null {
  return STAT_DEFS[id]?.desc ?? sheetFamilyOf(id)?.blurb ?? null;
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
 *  category. One walk, all tabs — the UI renders what this returns. */
export function sheetTabs(get: (id: string) => number, showAll: boolean): SheetTabModel[] {
  const models = new Map<string, SheetTabModel>();
  const seated = new Set<string>(SHEET_VITALS);
  for (const [cat, def] of Object.entries(SHEET_CATS)) {
    models.set(cat, { cat, def, rows: [], hidden: 0, invested: 0 });
    for (const id of def.core) seated.add(id);
    for (const id of def.used) seated.add(id);
  }
  // Seated rows first, in authored order.
  for (const [cat, def] of Object.entries(SHEET_CATS)) {
    const m = models.get(cat)!;
    for (const id of def.core) {
      if (!STAT_DEFS[id]) continue; // probe-caught; stay graceful live
      m.rows.push(id);
      if (isNonBase(id, get)) m.invested++;
    }
    for (const id of def.used) {
      if (!STAT_DEFS[id]) continue;
      const on = isNonBase(id, get);
      if (on) m.invested++;
      if (on || showAll) m.rows.push(id);
      else m.hidden++;
    }
  }
  // Dynamic rows: generated families and the unseated fold — non-base only,
  // in registry order (families mint contiguously, so kin stay adjacent).
  for (const id of Object.keys(STAT_DEFS)) {
    if (seated.has(id) || SHEET_OMIT.has(id)) continue;
    if (!isNonBase(id, get)) continue;
    const cat = sheetFamilyOf(id)?.cat ?? SHEET_FALLBACK_CAT;
    const m = models.get(cat) ?? models.get(SHEET_FALLBACK_CAT);
    if (!m) continue;
    m.rows.push(id);
    m.invested++;
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
  life: 'Your health pool. Reaching zero downs you — and death here is permanent.',
  lifeRegen: 'Flat life restored every second.',
  lifeRegenPct: 'A fraction of your MAXIMUM life restored every second, on top of flat regeneration.',
  mana: 'The casting pool skills spend.',
  manaRegen: 'Flat mana restored every second.',
  manaRegenPct: 'A fraction of your MAXIMUM mana restored every second, on top of flat regeneration.',
  lowLifeLine: 'The life fraction below which you count as on low life — raising it wakes low-life gear, passives, and the blood vignette sooner.',

  // Mobility & action speed
  moveSpeed: 'How fast you travel.',
  traction: 'Grip on the ground — below full, movement becomes momentum that slides (ice).',
  attackSpeed: 'Multiplies how quickly attack skills swing.',
  castSpeed: 'Multiplies how quickly spells cast.',
  cooldownRecovery: 'Speeds the return of every cooldown.',
  skillCharges: 'Additional banked uses for skills that carry use-charges.',
  skillChargeRate: 'How fast spent use-charges recover.',
  reloadSpeed: 'Quickens reload channels and racking hands alike.',
  finalRoundDamage: 'The press that spends a bank\'s LAST round hits this much harder.',

  // Offense
  accuracy: 'Contests enemy evasion — the higher it is, the less you whiff.',
  critChance: 'The odds a hit strikes critically.',
  critMulti: 'The damage multiplier a critical strike applies.',
  damage: 'Scales all damage you deal — always read through the acting skill\'s own tags.',
  addedPhysical: 'Flat physical damage added to your hits.',
  addedFire: 'Flat fire damage added to your hits.',
  addedCold: 'Flat cold damage added to your hits.',
  addedLightning: 'Flat lightning damage added to your hits.',
  addedChaos: 'Flat chaos damage added to your hits.',
  armorPen: 'Your physical hits ignore this fraction of the victim\'s armor.',
  firePen: 'Your fire damage digs below the victim\'s resistance — even past their cap.',
  coldPen: 'Your cold damage digs below the victim\'s resistance — even past their cap.',
  lightningPen: 'Your lightning damage digs below the victim\'s resistance — even past their cap.',
  chaosPen: 'Your chaos damage digs below the victim\'s resistance — even past their cap.',
  insightPen: 'Your blows land too true to read — this fraction of the victim\'s insight slip is denied.',
  esShred: 'How hard your hits strip energy shields — above one drains the pool faster per point of damage.',
  statusChance: 'Chance your hits inflict their ailments.',
  statusMagnitude: 'The potency of every ailment you apply — ticking damage scales with it.',
  ailmentStacks: 'Raises how many stacks of an ailment you can keep on a victim.',
  dotPropagates: 'Chance a damage-over-time you applied spreads when its victim dies.',
  curseRupture: 'Your curses rupture at expiry, dealing a burst scaled by this.',
  dotRupture: 'Your damage-over-time effects rupture at expiry for a fraction of what they ticked.',
  doomDot: 'Armed doom also ticks chaos damage while its fuse runs.',
  hedonism: 'Your curses also grant their victims reckless haste — dangerous to leave near allies.',
  poiseDamage: 'Multiplies the poise damage your hits inflict — the breaker\'s stat.',
  sunderDuration: 'How long the Sundered state lasts when YOUR hit breaks a poise bar.',
  impalePower: 'A fraction of your physical hit is driven in as a lodged spear, discharged by the next blow.',
  ambushBonus: 'More damage on strikes the victim never saw coming — stealthed and unalerted.',
  proximityDamage: 'Up to this much more damage at touch range, fading with distance.',
  cullThreshold: 'Your hits EXECUTE enemies at or below this fraction of their life.',
  killProcOnHit: 'Your on-kill effects may also fire on plain hits against elite prey.',
  damageSpread: 'Widens every damage roll around its midpoint — same average, fatter tails.',
  luckyChance: 'Chance to roll damage twice and keep the higher.',
  unluckyChance: 'Chance to roll damage twice and keep the LOWER — the jinxed hand.',
  highRollWindow: 'Widens every top-of-the-dice gate — jackpot effects fire on more of your rolls.',
  echoMight: 'After a landed hit, briefly gain added damage equal to a fraction of what it dealt.',
  reservedDamage: 'Flat damage per point of mana you keep RESERVED — locked power is power.',
  maxManaDamage: 'Flat damage per point of your maximum mana — the archmage\'s base.',
  igniteToBomb: 'A fraction of your ignites banks into a detonation at expiry instead of burning over time.',
  tetherDamage: 'Multiplies the ticking damage of your tether beams.',

  // Defense
  armor: 'Physical mitigation on a self-limiting curve — big hits punch through more; investment is uncapped and never reaches immunity.',
  evasion: 'Entropy-based avoidance: dodges bank on a deterministic meter, never pure dice, and a hit is always eventually due.',
  blockChance: 'The odds an incoming hit is blocked.',
  fireRes: 'Fire damage mitigated. Soft-capped — overcap is a buffer against resistance shred.',
  coldRes: 'Cold damage mitigated. Soft-capped — overcap is a buffer against resistance shred.',
  lightningRes: 'Lightning damage mitigated. Soft-capped — overcap is a buffer against resistance shred.',
  chaosRes: 'Chaos damage mitigated. Soft-capped — overcap is a buffer against resistance shred.',
  fireResMax: 'The ceiling your effective fire resistance may reach.',
  coldResMax: 'The ceiling your effective cold resistance may reach.',
  lightningResMax: 'The ceiling your effective lightning resistance may reach.',
  chaosResMax: 'The ceiling your effective chaos resistance may reach.',
  damageTaken: 'Multiplies all damage you receive — shock raises it, fortification lowers it.',
  critAvoid: 'Chance an incoming critical lands as a normal hit instead.',
  ailmentResist: 'Chance to shrug an incoming ailment outright.',
  afflictionExpiry: 'Harmful statuses on you run out this much faster.',
  blockPower: 'The fraction of a blocked hit that is stopped.',
  blockValue: 'Flat damage a block eats before the fraction applies.',
  guardStrength: 'How much punishment a raised guard absorbs before it breaks.',
  guardParry: 'Guard skills without a parry of their own gain a parry window this long.',
  guardParryPower: 'The riposte multiplier on damage you parry.',
  guardAegis: 'Your raised guard also absorbs hits against nearby minions.',
  domeDeflects: 'Your protection domes DEFLECT projectiles back out instead of dissolving them.',
  energyShield: 'A second life pool that soaks damage first and recharges after a quiet moment — but a wound mid-recharge interrupts the flow and the wait starts over.',
  esRechargeRate: 'How fast a recharging energy shield refills.',
  esRechargeDelay: 'How long you must go unwounded before energy shield begins recharging.',
  esRechargeSteadfast: 'The chance a wound fails to interrupt a running energy shield recharge.',
  esDotResist: 'How much of a damage-over-time seep the shield stops before it reaches life.',
  esDotBypass: 'The fraction of damage over time that seeps PAST your energy shield straight to what\'s beneath.',
  lifeRegenToEs: 'A fraction of your life regeneration flows to energy shield instead — trickling even through the recharge delay.',
  manaShield: 'A fraction of incoming damage paid from mana instead of life.',
  poise: 'A break-bar hits wear down. While it holds you shrug stagger and keep some damage reduction; broken, it lies inert until it recovers — uninterruptibly — and re-arms.',
  poiseDR: 'The damage reduction granted while your poise holds.',
  poiseCcAvoid: 'Chance to ignore hard crowd control while your poise holds.',
  poiseRegenPct: 'How fast poise recovers — the broken bar\'s climb and the calm refill alike.',
  poiseRegenDelay: 'Seconds after a break before the recovery climb begins.',
  poiseRearmAt: 'How full a broken poise bar must climb back before it re-arms.',
  poiseCalmDelay: 'How long the drains must stop before an unbroken, dented bar refills.',
  poiseOnHit: 'Flat poise restored to you per hit you land — fight to stay armed.',
  poiseOvercharge: 'Headroom past maximum poise that explicit gains can crest into — a temporary larger buffer.',
  insight: 'A momentum pool that refills only while you are MOVING — it spends itself to blunt incoming hits.',
  insightDR: 'The damage reduction granted while insight remains.',
  insightEfficiency: 'Damage avoided per point of insight spent.',
  insightRegenPct: 'How much of the insight pool each second of movement restores.',
  insightTaper: 'How long the read lingers after you stop moving.',
  insightInversion: 'Blends what feeds insight: 0 = motion (the default), 1 = stillness — planted feet ramp it in, walking bleeds it.',
  insightStillTaper: 'Seconds of unbroken stillness to reach full inverted momentum — the rooted stance is earned slowly.',
  insightSap: 'How much of your insight momentum is sapped away — chill, freeze and stun bind the footwork the pool reads with.',
  endurance: 'A break-less stamina pool: it shaves damage flat off every hit, spending what it prevents.',
  enduranceDR: 'The flat damage shaved per hit while endurance lasts.',
  enduranceRegenPct: 'How fast spent endurance trickles back — fortify effects are the real refill.',
  enduranceRegenDelay: 'Seconds after spending endurance before the trickle resumes.',
  wardDecay: 'The fraction of your ward that evaporates each second — retention investment lowers it.',
  wardGain: 'Multiplies all ward you gain — the ward-build\'s scaling stat.',
  staggerFrac: 'A fraction of life damage lands as a slow drain over seconds instead of at once.',
  staggerWindow: 'How long a staggered wound takes to finish landing.',
  hitImmune: 'Incoming HITS are dodged outright — damage over time still ticks.',
  hitCap: 'A ceiling on the life damage any single hit may land — attrition still does full work.',
  weight: 'Mass. The heavy resist knockback and poise wear, and shove harder in the bargain; the light get shoved.',
  phasing: 'No body collision at all — you walk through others, and they through you. Substance, not stealth.',
  evasionToArmor: 'This fraction of your evasion is read again as armor — the swap\'s gain dial.',
  evasionForgone: 'This fraction of your evasion is renounced outright — the swap\'s forgo dial.',
  esToPoise: 'This fraction of your energy shield is read again as maximum poise — the swap\'s gain dial.',
  esForgone: 'This fraction of your energy shield is renounced outright — the swap\'s forgo dial.',
  thorns: 'Flat damage returned to any attacker whose hit lands on you.',
  thornsReflect: 'A fraction of the damage you take is returned to the attacker.',
  thornsToHit: 'A fraction of your flat thorns rides your own hits as added physical damage.',
  channelThorns: 'Flat damage returned to attackers who strike you while you channel.',
  minionShare: 'A fraction of damage you take is redirected onto your minions, split among the living.',

  // Sustain
  lifeOnHit: 'Flat life gained per hit you land.',
  lifeLeech: 'A fraction of your damage flows back as life.',
  manaLeech: 'A fraction of your damage flows back as mana.',
  esLeech: 'A fraction of your damage flows back as energy shield.',
  wardLeech: 'A fraction of your damage flows back as ward — the decaying shell.',
  esOnHit: 'Flat energy shield gained per hit you land.',
  lifeOnKill: 'Flat life gained per kill.',
  manaOnKill: 'Flat mana gained per kill.',
  esOnKill: 'Flat energy shield gained per kill.',
  lifeOnBlock: 'Flat life gained when you block a hit.',
  lifeOnEvade: 'Flat life gained when you evade an attack.',
  recuperate: 'A fraction of every wound that lands on life flows back as healing over a few seconds — if you survive it.',
  recuperateTime: 'How long a recuperating wound takes to half-close.',
  healPower: 'Multiplies the healing you GIVE — the healer\'s damage stat.',
  healTaken: 'Multiplies the life healing you RECEIVE, from any source.',
  overheal: 'A fraction of healing past full hardens into a ward on the target.',
  restorePower: 'Scales every fount pour and restore-over-time stream you drink.',
  restorePctMax: 'Your fount drinks add this fraction of the pool\'s maximum to their pour.',
  vampiricShare: 'A fraction of your landed damage heals allies near you — not you.',
  bondShare: 'While your life bond stands, a fraction of your damage dealt heals the bonded.',
  guardMend: 'Allies near you heal each second while you hold a guard stance.',
  esToMana: 'The fraction of your energy shield spendable as mana when the pool runs dry.',
  conduitRate: 'How fast your conduits pump — the drain side of every running resource conversion.',
  conduitEfficiency: 'How much a conduit delivers per point it drains — the exchange rate on every running conversion.',
  costToLife: 'A fraction of mana costs paid from life instead.',
  costToMana: 'A fraction of life costs paid from mana instead.',
  orbShedRate: 'Multiplies every resource-orb shed roll you make.',
  overdriveCap: 'How deep unaffordable casts may overdraft their cost into debt.',
  overdriveIdleDelay: 'The breather required before overdrive debt starts repaying.',
  overdriveRecovery: 'The fraction of overdrive debt repaid each second.',
  overdriveRecoveryFlat: 'Flat overdrive debt repaid each second.',
  overdriveFlow: 'Repayment trickles even while you cast, at this fraction of rate.',
  overdriveLifeFactor: 'Blood-debt metabolism: life-lane repayment scales with your regeneration and pace.',

  // Skills
  aoeRadius: 'Widens every area effect you create.',
  effectDuration: 'Lengthens your timed effects — buffs, ailments you inflict, lingering zones.',
  manaCost: 'Multiplies what your skills cost.',
  addedManaCost: 'Flat mana added to every cost.',
  addedLifeCost: 'Flat life added to every cost.',
  addedCooldown: 'Flat seconds added to a skill\'s cooldown — still reducible by recovery.',
  costDamage_mana: 'Flat damage per point of mana actually paid on the cast.',
  costDamage_life: 'Flat damage per point of life actually paid on the cast.',
  chargeCap: 'Additional maximum stacks for the charges your skills bank.',
  runeCap: 'How long an invocation sequence may grow.',
  comboWindow: 'Multiplies every combo grammar\'s timing window — patterns stay open longer.',
  projectileCount: 'Additional projectiles per volley.',
  projectileCountChance: 'Chance each volley carries one more projectile.',
  projectileSpeed: 'How fast your projectiles fly.',
  projectileSize: 'How large your projectiles are.',
  pierceCount: 'Your projectiles pass through this many extra victims.',
  chainCount: 'Your projectiles leap to this many further targets.',
  forkCount: 'On impact, projectiles split into this many extra pairs.',
  projReturn: 'Spent projectiles fly back — to the cast point, or to your moving hand.',
  projNova: 'Extra projectiles fired in a full ring around you instead of at the aim.',
  projPulse: 'Projectiles breathe in flight — swelling and shrinking on a fixed rhythm.',
  projShrapnel: 'Projectiles shatter into shards past their first victim.',
  projHitDetonate: 'Explosive payloads detonate on EVERY hit the projectile survives, not just its last.',
  projReShatter: 'Spent shatter re-arms on every chain leg, and forked children split with theirs fresh.',
  returnShrapnel: 'A returning projectile splinters outward as it arrives home.',
  projInherit: 'The fraction of a parent\'s flight character its children inherit.',
  projAccel: 'Projectiles gather (or bleed) speed over their flight.',
  projBounce: 'Projectiles ricochet off terrain before dying.',
  projRecurve: 'Chance a surviving projectile whips around and strikes the same victim again.',
  homingPower: 'How sharply projectiles bend toward their prey.',
  erraticPower: 'Random jitter in projectile flight — chaos as a flight path.',
  spiralPower: 'Projectiles revolve outward from the cast point.',
  orbitPower: 'Projectiles circle you, tethered.',
  spinPower: 'Projectiles corkscrew tightly around their flight line.',
  weavePower: 'Projectiles weave a figure-eight along their travel.',
  guidePower: 'Projectiles bend toward your LIVE cursor — marionettes on a string.',
  castAtCursor: 'The volley materializes at your aim point instead of leaving your hands.',
  fireSalvo: 'The volley becomes a drum-roll — one shot per beat, each re-aimed at the live cursor.',
  fireVolley: 'The volley becomes a firing line of side-by-side parallel shots.',
  volleySpacing: 'How tight the firing line stands.',
  spreadAngle: 'How wide a fan of projectiles splays.',
  randomArc: 'Widens (or focuses) the sector random strikes land in.',
  multiTarget: 'Single-target skills resolve against this many extra victims.',
  swingArc: 'How WIDE your melee arcs and cones sweep.',
  meleeReach: 'How FAR your melee strikes and cones extend.',
  meleeReverb: 'Melee hits echo to this many extra nearby enemies.',
  splashRadius: 'Your hits splash to enemies within this radius at reduced damage.',
  meleeSweep: 'Melee arcs become forward-traveling crescent waves.',
  sweepRange: 'How far a sweeping crescent travels.',
  sweepSpeed: 'How fast a sweeping crescent travels.',
  knockback: 'Your melee hits shove the victim away.',
  shoveAuthority: 'Multiplies your shove authority — how much of your mass every push you author carries. The heavy move the light; this moves the needle.',
  impactDamage: 'Scales the impact wounds your shoves inflict when the victim is arrested — by a wall, or by a body heavy enough to be one.',
  displaceForce: 'Signed on-hit displacement — positive shoves the victim away, negative drags them in.',
  knockBuffet: 'Your knockbacks batter victims in RANDOM directions instead of shoving them away.',
  aoeShape: 'Overrides the geometry of your areas — circle, square, triangle.',
  aoeScatter: 'Your area skills scatter into this many secondary explosions.',
  aoeCascade: 'Ground skills ripple displaced repeats out from the impact.',
  cascadeStep: 'How far apart cascade ripples land.',
  aoeSpin: 'Your faced zones — crescents, wedges — revolve.',
  pulseCount: 'Extra pulses beaten out of dormant ground effects.',
  stormCount: 'Additional strikes for your storm skills.',
  stormImmediate: 'A fraction of a storm\'s strikes crash at once, up front; the rest keep the cadence.',
  fissureCount: 'Extra whole fissures fanned out per cast.',
  fissureBranches: 'Extra branches forked off each fissure.',
  lingerField: 'Your area skills leave a damaging field behind for this long.',
  hexBlast: 'Your cursed areas detonate shortly after the cast.',
  channelBurst: 'A periodic nova erupts from you while channeling.',
  channelStorm: 'Periodic strikes land around you while channeling.',
  channelRamp: 'Channel pulses grow stronger for every second held.',
  channelSpool: 'Channeled projectile skills gain projectiles for every second held.',
  channelSpoolCap: 'The ceiling on spooled bonus projectiles — time-fed and hit-fed alike.',
  channelHitSpool: 'Channeled projectile skills gain projectiles per LANDED hit — connection feeds the barrage.',
  channelMobility: 'Lets you walk while channeling — enough investment strolls through any maelstrom.',
  channelTurnRate: 'How fast a held channel may turn to face your aim.',
  channelLockAim: 'The channel\'s aim LOCKS at press — pulses land at the original mark, wherever the cursor wanders.',
  channelAutoSpin: 'A held channel revolves on its own instead of tracking the aim — the beam becomes a lighthouse.',
  channelPersist: 'The channel plants itself at the mark and burns on without you.',
  brimFill: 'How fast your gathering gauges fill.',
  brimDecay: 'How fast an untended gauge drains.',
  brimPower: 'The payoff a filled gauge releases.',
  fuseDelay: 'How long your fuses burn before resolving.',
  fusePower: 'How hard a fused resolution lands.',
  overchargeStages: 'Additional stages your overcharged casts may bank.',
  sparkWindow: 'A release landing within this window of a stage banking counts as struck at the spark.',
  sparkBonus: 'The extra power a spark-timed release earns.',
  repeatCount: 'Your skills execute extra times after the real one.',
  repeatScale: 'Each repeat grows this much bigger and harder.',
  repeatRetarget: 'Repeats re-aim at the nearest living enemy.',
  repeatLock: 'You are held in place while the repeats play out.',
  unleashMax: 'Seals banked while the skill rests — each one an extra salvo on the next cast.',
  triggerChance: 'Chance per event that an armed trigger gem fires.',
  triggerThreshold: 'How much damage must accumulate to fire your wound-triggers — lower fires sooner.',
  triggerPower: 'How many applications your status-triggers bank per firing — lower fires sooner.',
  procDepth: 'How many layers of proc-in-proc your triggers may run — each layer at a fraction of its chance.',
  castMobility: 'Lets you walk while casting.',
  moveExplode: 'Your movement skills explode at their start and end points.',
  moveTrail: 'Your dashes leave a burning trail.',
  conduction: 'Projectiles passing through elemental fields inherit the element.',
  suffusion: 'Projectiles crossing YOUR ground effects carry them onward — the field re-blooms where the flight ends.',
  poolCap: 'Raises the caps of your banked damage pools.',
  embedIcd: 'Your run-over snares re-arm on a timer instead of being consumed.',
  tetherWidth: 'How wide your tether bands reach.',
  bashPower: 'The payload multiplier on your shield bashes.',
  bashFloor: 'Where the bash arms: the guard-bar line at which a release converts to the blow.',
  bashInvert: 'The bash contract mirrors — ride the wall LOW and cash the damage it has taken.',
  durationAuraCap: 'How many duration-mode auras may burn at once.',
  auraEsRecharge: 'Your auras carry a recharge bonus to allied energy shields.',
  auraEsDelay: 'Your auras shorten allied energy-shield recharge delays.',
  reflex: 'The skill fires THROUGH your own casts, channels and dashes without disturbing them.',
  thirstless: 'Thirst gates are waived — a brimming pool no longer refuses the drink.',
  remnantChance: 'Your hits may shed an elemental remnant; picking it up empowers the next cast of that school.',
  remnantOnCast: 'Chance a real cast of a school sheds its remnant.',

  // Minions
  minionDamage: 'Scales the damage everything you summon deals.',
  minionLife: 'Scales the life of everything you summon.',
  minionMaxCount: 'Additional maximum minions.',
  minionDamageTaken: 'Multiplies the damage your minions receive.',
  minionSize: 'How large your minions grow.',
  minionMoveSpeed: 'How fast your minions travel.',
  minionHaste: 'Speeds everything your minions do.',
  minionRegen: 'Flat life your minions regenerate each second.',
  minionRegenPct: 'A fraction of each minion\'s maximum life regenerated each second.',
  minionDetectionRange: 'How far your minions notice prey.',
  minionDecayRate: 'How fast your decaying minions rot — lower lets them linger.',
  minionRespawnTime: 'How long your persistent minions take to return.',
  minionUndying: 'Slain minions cling to unlife this long after their death effects fire.',
  minionGuard: 'Your minions fight DEFENSIVELY — a short leash around you instead of a chase.',
  minionDeathHeal: 'When a minion dies, its kin heal a fraction of the deceased\'s life.',
  minionDeathHealFlat: 'Flat healing to the flock when one of its own falls.',
  minionExpiryIsDeath: 'A minion\'s duration lapsing counts as a DEATH — every on-death effect fires.',
  minionExplodeDeath: 'Your minions detonate on death for a fraction of their life.',
  minionExplodeLowLife: 'Your minions detonate THEMSELVES upon reaching low life.',
  summonCount: 'Extra summons per cast.',
  summonSequence: 'Extra summons emerge one after another instead of all at once.',
  summonAtCursor: 'Minions emerge at your cursor instead of beside you.',
  summonImpact: 'Arrival as a blast: emerging minions deal a fraction of their life as damage around them.',
  summonMend: 'Arrival as balm: allies near an emerging minion heal.',
  sacrificeMinions: 'Corpse-targeting skills may kill your own minion for a body.',
  targetMinionFallback: 'Corpse-targeting skills may target a minion, unharmed, when no corpse exists.',
  corpseBatch: 'Additional corpses each corpse-handling cast consumes or raises.',
  offeringShare: 'A fraction of your minion-buffs also blesses YOU — offerings shared with the officiant.',
  commandDiscipline: 'Pressure added to every command you issue — only the unruly need convincing.',
  constructMaxCount: 'Additional maximum constructs — totems, sentries, traps, mines.',
  constructCastRate: 'How fast your constructs cast.',
  constructTaunt: 'Your constructs draw enemy attention onto themselves.',
  castAsTotem: 'The skill is planted and cast by a totem instead of your own hands.',
  totemPlaceTime: 'How long planting a totem takes, against the spell\'s own bar.',
  mirageCount: 'Additional echo-ghosts per family — mirages that cast YOUR skills with YOUR scaling.',
  mirageDamage: 'Scales every echo\'s blow — the one crank on the whole mirage economy.',

  // Misc
  detectability: 'How far away enemies notice you — the stealth stat.',
  threatGen: 'How loudly your damage registers on the victim\'s ledger — loud styles goad monsters onto themselves.',
  invisible: 'Enemies cannot see or deliberately target you — but areas and stray shots still connect.',
  luck: 'Every proc roll\'s chance is scaled by your luck — fortune as a stat, curseable both ways.',
};
for (const [id, d] of Object.entries(STAT_BLURBS)) {
  if (STAT_DEFS[id]) STAT_DEFS[id].desc = d;
}
