// ---------------------------------------------------------------------------
// Status ailments — data-driven like everything else.
//
// A status either ticks damage over time (dot), applies temporary modifiers
// to its victim (mods), or both. New ailments are added to STATUS_DEFS and
// referenced from any skill's `status` effect by id.
// ---------------------------------------------------------------------------

import { mod, STAT_DEFS, type DamageType, type Modifier, type SkillTag } from './stats';

export interface StatusDef {
  label: string;
  color: string;
  /** Default duration in seconds (scaled by the caster's effectDuration). */
  duration: number;
  /** If true, new applications add stacks (up to maxStacks + the applier's
   *  ailmentStacks stat — the cap is INVESTABLE). */
  stacking?: boolean;
  maxStacks?: number;
  /** Non-stacking RE-APPLICATION policy — what makes each ailment feel
   *  distinct. 'refresh' (default): refresh the timer, keep the stronger
   *  dps. 'strongest': a new application only takes hold if it is STRONGER —
   *  it then seizes the ailment wholesale (dps AND timer); weaker ones
   *  fizzle against what already burns (ignite). Stacking statuses and
   *  armed (rupture-bearing) instances ignore this. */
  stackPolicy?: 'refresh' | 'strongest';
  /** DoT: damage type ticked each second (amount set on application). */
  dotType?: DamageType;
  /** Modifiers applied to the VICTIM while active. */
  mods?: Modifier[];
  /** Scale `mods` by the CURRENT stack count (Vulnerable: 8% per stack).
   *  Opt-in — chill keeps its flat slow while its stacks build the freeze. */
  modsPerStack?: true;
  /** If the victim dies while afflicted, the status spreads to its nearby
   *  allies (Contagion) — chains across multiple deaths. */
  propagateOnDeath?: boolean;
  /** Chance that any attack/spell the victim begins fizzles, stunning it
   *  briefly — a curse that acts as an interrupt (Befuddlement). */
  interruptChance?: number;
  /** Hard crowd control: the victim cannot move or act while afflicted
   *  (checked by Actor.isStunned — stun, frozen). */
  hardCC?: true;
  /** SELECTIVE CC: while afflicted, the victim cannot USE skills carrying
   *  ANY of these tags (Actor.canUse is the one gate — player, monster,
   *  and minion alike). Silence forbids 'spell', Disarm forbids 'attack',
   *  Rooted forbids 'movement' — and any future lock is one entry. */
  forbidsTags?: SkillTag[];
  /** BUILDUP: reaching maxStacks consumes every stack into this status
   *  instead (chill → frozen). Requires stacking + maxStacks. */
  buildup?: { into: string };
  /** Shatters early if the absorption shield that granted it breaks
   *  (Aegis Ward's Warded armor). */
  boundToAbsorb?: true;
  /** IMPALE personality: the status's banked `rupture` DISCHARGES into
   *  the bearer's NEXT qualifying top-level hit as its own separate
   *  mitigated blow (then the status is spent) — instead of waiting for
   *  expiry or death. The pop is not a hit and can never bank, so the
   *  economy is structurally loop-free (the inverse Echoing Might). */
  dischargeOnHit?: true;
  /** The NEWEST applier takes over the status's casterId on re-apply
   *  (taunt: the louder challenge wins the bearer's attention). Default:
   *  the FIRST applier keeps it — DoT credit never migrates mid-burn. */
  refreshCaster?: true;
  /** Canonical fraction-of-the-hit dealt per second when this status is
   *  applied by a STAT-GRANTED chance (the apply_<id> stat family) rather
   *  than a skill's own status effect. Element-agnostic by design: a
   *  physical Cleave ignites off its physical hit. */
  hitMagnitude?: number;
  /** Caster-independent BASELINE dps at level 1 (+perLevel each level): the
   *  FLOOR under hit-derived dps, and the strength caster-less sources
   *  (ground effects, zone modifiers) apply via baselineStatusDps. */
  baseline?: { dps: number; perLevel: number };
  /** The ailment's ELEMENT — the ailmentResist query context (Purity of
   *  Fire shrugs ignites) and the theming hook. Omit for untyped statuses. */
  element?: DamageType;
  /** A POSITIVE status (blessings, wards): cleanses skip it, and it never
   *  counts as an affliction. */
  beneficial?: true;
  /** DOOM: if this status's ARMED payload (its accumulated rupture) ever
   *  meets or exceeds the victim's remaining life, it detonates EARLY —
   *  the counter that culls instead of waiting out its fuse. */
  cullsAtLethal?: true;
  /** WEAK SPOT (Expose Weakness): applying this status paints a WINDOW on
   *  the victim's health bar just below their current life — `gap` below,
   *  `size` wide (fractions of max). While their life sits INSIDE the
   *  window they take `bonus` MORE damage; driving them BELOW it DESTROYS
   *  the spot (the status ends in a flash). Timing damage into the band
   *  is the whole game. */
  weakSpot?: { size: number; gap: number; bonus: number };
  /** BRAND ZAPS (Fulgurweb): while the status rides its victim, every
   *  `interval` seconds a bolt lashes the victim's ALLIES within `radius`
   *  for the status's caster-less baseline × `factor` — the mark that
   *  makes standing NEXT to the marked the mistake. */
  zapNearby?: { interval: number; radius: number; factor: number };
  /** DPS CURVE over the status's life: 'ramp' opens weak and finishes hard
   *  (Curse-of-Agony), 'taper' opens hard and bleeds out. Both average the
   *  flat total (factor 0→2 / 2→0), so investment reads the same. */
  dpsCurve?: 'ramp' | 'taper';
  /** MADNESS (lashOut): the afflicted STRIKES whatever is nearest — friend
   *  or foe — every `interval` seconds within `radius`, for the status's
   *  baseline × `factor`. The cursed-ground betrayal. */
  lashOut?: { interval: number; radius: number; factor: number };
  /** POP-ON-REAPPLY (Hemorrhage): re-applying this status DETONATES
   *  `fraction` of the REMAINING banked DoT (dps × stacks × time left) as an
   *  immediate burst through the ordinary DoT pipeline, then the NEW
   *  application takes over wholesale (dps and timer both replaced — refresh,
   *  not max). The applier's generated popPower_<id> stat scales the
   *  fraction, so the pop is as investable as everything else. Best on long,
   *  non-stacking DoTs — the whole loop is "load the wound, then strike it". */
  pop?: { fraction: number };
}

/** GLOBAL AILMENT BASELINE TUNING — the "physical damage is physical damage"
 *  rebalance, as one config table instead of a 60-entry data sweep.
 *
 *  Skills author their own status chances (identity data). At the ROLL site
 *  (world.resolveHit → tuneAilmentChance) an authored chance BELOW the
 *  status's identityThreshold is treated as INCIDENTAL — a generic attack
 *  that happened to carry a splash of bleed/burn — and is scaled by
 *  incidentalScale. At/above the threshold the skill's ailment IS its
 *  identity (Rend, Ignite) and the authored value stands untouched.
 *
 *  bleed 0×: plain hits never bleed — bleeding now comes from investment
 *  (the generated apply_bleed family: passives, gems, vocation nodes — the
 *  Exsanguinator restores-and-raises the old innate feel) or identity skills.
 *  burn 0.35×: embers still catch, but real ignition is an investment.
 *  Absent status id = untouched. Retune freely; monsters obey the same rule. */
export const AILMENT_TUNING: Record<string, { identityThreshold: number; incidentalScale: number }> = {
  bleed: { identityThreshold: 0.7, incidentalScale: 0 },
  burn: { identityThreshold: 0.6, incidentalScale: 0.35 },
};

/** The effective chance for a skill-authored status effect (see AILMENT_TUNING). */
export function tuneAilmentChance(id: string, authored: number): number {
  const t = AILMENT_TUNING[id];
  if (!t || authored >= t.identityThreshold) return authored;
  return authored * t.incidentalScale;
}

/** THE TAUNT FABRIC's teeth. The 'taunted' status itself (duration, the
 *  refreshCaster hand-off) lives in STATUS_DEFS like any ailment, and
 *  afflictionExpiry resists it like any affliction — this carries only
 *  the levers no def field expresses. */
export const TAUNT_CFG = {
  /** 'more'-style damage penalty a taunted attacker suffers against anyone
   *  who is NOT its taunter — how the status bites bearers whose targeting
   *  cannot be forced (the player's own hand) and brains that refuse to
   *  turn (ignoreTaunt bosses). Folded beside the damageVs family. */
  offTargetLess: 0.3,
} as const;

export const STATUS_DEFS: Record<string, StatusDef> = {
  burn: {
    label: 'Burning', color: '#ff7a2a', duration: 4,
    element: 'fire',
    dotType: 'fire',
    // STRONGEST-WINS: a weaker ignite fizzles against a hotter one — you
    // want your biggest hit to be the one that burns.
    stackPolicy: 'strongest',
    hitMagnitude: 0.35, baseline: { dps: 3, perLevel: 1.2 },
  },
  poison: {
    label: 'Poisoned', color: '#7ec850', duration: 6,
    element: 'chaos',
    dotType: 'chaos', stacking: true, maxStacks: 8,
    hitMagnitude: 0.3, baseline: { dps: 2, perLevel: 0.8 },
  },
  bleed: {
    label: 'Bleeding', color: '#b03030', duration: 5,
    element: 'physical',
    dotType: 'physical', stacking: true, maxStacks: 5,
    hitMagnitude: 0.3, baseline: { dps: 2.5, perLevel: 1 },
  },
  // IMPALED — the lodged spear (the PoE homage, single-pop form): a hit
  // with impalePower DRIVES IN a fraction of its physical damage as the
  // bank (ActiveStatus.rupture); the NEXT top-level hit discharges the
  // whole bank as a separate mitigated blow (dischargeOnHit). Death and
  // expiry still pop the keg through the ordinary rupture machinery —
  // a spear never rots in the corpse.
  impaled: {
    label: 'Impaled', color: '#c8ccd8', duration: 8,
    element: 'physical',
    dischargeOnHit: true,
  },
  // HEMORRHAGE — bleed's antithesis: ONE deep wound instead of many shallow
  // cuts. A long, slow, non-stacking physical drip whose REAPPLICATION pops
  // a fraction of whatever damage was still owed (see StatusDef.pop), then
  // reloads the wound with the new application. Reached like any ailment:
  // apply_hemorrhage / minionApply_hemorrhage stats, skill effects, or the
  // ruptured_veins proc — the Exsanguinator vocation is built on it.
  hemorrhage: {
    label: 'Hemorrhage', color: '#e04858', duration: 14,
    element: 'physical',
    dotType: 'physical',
    hitMagnitude: 0.45, baseline: { dps: 2, perLevel: 0.9 },
    pop: { fraction: 0.4 },
  },
  /** FOG-VEILED (the FOG FABRIC, engine/fog.ts): the murk swallows your
   *  outline — detectability drops while you stand in LIVE fog (a bank's
   *  drawn lobes are its hit surface; dissipated edges grant nothing).
   *  Refreshed while inside; the short duration is the linger stepping out. */
  fogveiled: {
    label: 'Fog-Veiled', color: '#b8c4cc', duration: 1.2,
    mods: [mod('detectability', 'more', -0.35)],
  },
  /** MIST-FED (the fog fabric): dead things DRINK the fog — grave-mist and
   *  gloam-shroud banks grant this to their own kind (FogGrant faction
   *  filters), so the murk is territory, not decoration. The counterplay
   *  writes itself: bait them out of the bank, or ride the same fog veiled
   *  and cut the fight loose from the weather. Refresh/linger idiom. */
  mistfed: {
    label: 'Mist-Fed', color: '#9fc9a9', duration: 1.6,
    mods: [mod('damage', 'increased', 0.12), mod('lifeRegen', 'flat', 3)],
  },
  /** CANOPIED (the veil system, engine/veil.ts): the leaves swallow your
   *  outline — detectability drops while you stand under an unbroken crown.
   *  Refreshed per tick under cover; the short duration is the linger when
   *  stepping into the open. The default standStatus for veil kinds. */
  canopied: {
    label: 'Canopied', color: '#4e7a3c', duration: 1.2,
    mods: [mod('detectability', 'more', -0.35)],
  },
  /** DESERT HEAT (World.updateHeat): standing in a heat-shimmer field bakes
   *  stacks on; shade (a canopy, a roof, the night) dwindles them. Each stack
   *  erodes fire resistance — the desert softens you up for its burns. The
   *  world manages stacks directly; duration is only a safety TTL. */
  sunscorched: {
    label: 'Sunscorched', color: '#ffb64a', duration: 8,
    element: 'fire',
    stacking: true, maxStacks: 8,
    mods: [mod('fireRes', 'flat', -0.05)],
    modsPerStack: true,
  },
  // Chill BUILDS UP: each application stacks intensity, and at max stacks
  // the chill is consumed into a FREEZE — a long, hard stun.
  chill: {
    label: 'Chilled', color: '#7ad4ff', duration: 3,
    element: 'cold',
    stacking: true, maxStacks: 5, buildup: { into: 'frozen' },
    mods: [
      mod('moveSpeed', 'more', -0.3),
      mod('attackSpeed', 'more', -0.2),
      mod('castSpeed', 'more', -0.2),
    ],
  },
  frozen: {
    label: 'Frozen', color: '#d8f4ff', duration: 1.5, hardCC: true,
    element: 'cold',
    // A shatter target for Absolute Zero.
    mods: [mod('damageTaken', 'more', 0.1)],
  },
  shock: {
    label: 'Shocked', color: '#ffe14a', duration: 4,
    element: 'lightning',
    mods: [mod('damageTaken', 'more', 0.2)],
  },
  stun: {
    label: 'Stunned', color: '#cccccc', duration: 0.8, hardCC: true,
  },
  // SELECTIVE CC — the forbidsTags family: each locks ONE verb and leaves
  // the rest of the kit alive (the counterplay IS switching verbs).
  // All three are ordinary statuses: hard-cast them, proc them
  // (apply_silence / apply_disarm / apply_rooted exist like every apply_),
  // shrug them with ailmentResist — nothing bespoke anywhere.
  silence: {
    label: 'Silenced', color: '#b8b8e8', duration: 3,
    forbidsTags: ['spell'],
  },
  disarm: {
    label: 'Disarmed', color: '#e8c8a0', duration: 3,
    forbidsTags: ['attack'],
  },
  rooted: {
    label: 'Rooted', color: '#8a9a4a', duration: 2,
    forbidsTags: ['movement'],
    mods: [mod('moveSpeed', 'more', -0.95)],
  },
  // SUNDERED — the poise break (DEFENSE_CFG.poise.breakStatus): the bar
  // shatters and the body is briefly OPEN — reeling, slower, hit harder.
  // Deliberately not a hard stun: the break strips poise's own benefits
  // (DR + CC shrug) at the same moment, so a follow-up stun lands honestly
  // through this window instead of being bundled into it. Pure data — any
  // skill/curse can apply it directly (apply_sundered exists like the rest).
  sundered: {
    label: 'Sundered', color: '#d8b06a', duration: 2.5,
    mods: [
      mod('damageTaken', 'more', 0.15),
      mod('moveSpeed', 'more', -0.15),
    ],
  },
  weaken: {
    label: 'Weakened', color: '#b06bd4', duration: 5,
    mods: [mod('damage', 'more', -0.25)],
  },
  // VULNERABLE (#20): the apply-and-consume debuff — each stack opens the
  // victim a little wider; Execution consumes the lot for a scaling blow.
  vulnerable: {
    label: 'Vulnerable', color: '#d878b0', duration: 6,
    stacking: true, maxStacks: 5, modsPerStack: true,
    mods: [mod('damageTaken', 'more', 0.08)],
  },
  // DOOM (#25): a swelling counter with a fixed fuse. Every application
  // PUMPS the keg (armed payloads add); if the bank ever covers what life
  // remains, it goes off EARLY — the cull. Otherwise the fuse decides.
  // 6s: long enough to pump three Words into one keg (cast + cooldown
  // spacing ≈ 2s) — the cull arithmetic must be REACHABLE.
  doom: {
    label: 'Doomed', color: '#7a48c8', duration: 6,
    cullsAtLethal: true,
    // hitMagnitude routes STAT-GRANTED dooms (apply_doom — Creeping Doom)
    // into the ARMED PAYLOAD rather than a tick: a weak keg per hit,
    // pumped by repetition, culling at lethal like every doom.
    hitMagnitude: 0.4,
  },
  // SCORCH (Hallowed Flames): a short, non-stacking searing — refreshed by
  // every fresh application, INDEPENDENT of ignite (its own id, its own
  // clock; the two burns coexist by construction).
  scorch: {
    label: 'Scorched', color: '#ffb056', duration: 2.5,
    element: 'fire', dotType: 'fire',
    hitMagnitude: 0.25, baseline: { dps: 3, perLevel: 1.1 },
  },
  // WITHER-AGONY (Curse of Agony): a chaos rot that opens as a whisper and
  // ENDS as a scream — the ramp curve (weak→strong, same flat total).
  wither_agony: {
    label: 'Withering Agony', color: '#8a5ad8', duration: 8,
    element: 'chaos', dotType: 'chaos',
    dpsCurve: 'ramp',
    hitMagnitude: 0.45, baseline: { dps: 3.5, perLevel: 1.3 },
  },
  // JINXED (the unlucky mark): the afflicted's own damage rolls twice and
  // keeps the LOWER — misfortune as a debuff (the dark twin of Lucky).
  jinxed: {
    label: 'Jinxed', color: '#8a78a8', duration: 5,
    mods: [mod('unluckyChance', 'flat', 1)],
  },
  // MADDENED (the cursed-ground betrayal): the afflicted lashes at
  // whatever is NEAREST — friend or foe alike — until the fog lifts.
  maddened: {
    label: 'Maddened', color: '#d84a9a', duration: 4,
    baseline: { dps: 4, perLevel: 1.2 },
    lashOut: { interval: 0.8, radius: 120, factor: 1.2 },
    mods: [mod('detectionRange', 'more', -0.4)],
  },
  // REELING (the flow broken): INSIGHT stops replenishing while it lasts —
  // the read is gone; what's already banked still spends. The anti-dodge
  // status (Flowbreaker's teeth, the veilstalker's lash): pure data, since
  // insight refills only through insightRegenPct and statuses mod the
  // bearer. Counterplay runs both ways — enemies can be made to reel too.
  reeling: {
    label: 'Reeling', color: '#c8a8e8', duration: 4,
    mods: [mod('insightRegenPct', 'more', -1)],
  },
  // VOIDED (the shield unsung): ENERGY-SHIELD recharge stops while it
  // lasts — the rate floors (stat min leaves a negligible drip) and the
  // wait stretches; what's still banked soaks as ever. The anti-ward
  // status (Voidrend's teeth, the null adept's lance).
  voided: {
    label: 'Voided', color: '#9a8ae8', duration: 3,
    mods: [mod('esRechargeRate', 'more', -1), mod('esRechargeDelay', 'increased', 1)],
  },
  // TAUNTED (the challenge fabric): attention itself, as a status. The
  // APPLIER (casterId — refreshCaster: the newest shout wins) becomes the
  // bearer's whole fight: AI bearers — monsters, minions, mercenaries —
  // are FORCED onto the taunter (ai.ts / mercbrain.ts, honoring
  // TargetSpec.ignoreTaunt for the un-cheesable bosses), and ANY bearer,
  // the player included, deals TAUNT_CFG.offTargetLess LESS to everyone
  // who is not their taunter — the teeth that bite even a human hand.
  // Reached like any ailment: apply_taunted / minionApply_taunted stats,
  // skill status effects, guard pulses — the whole apply fabric works.
  taunted: {
    label: 'Taunted', color: '#e0763a', duration: 3,
    refreshCaster: true,
  },
  // EXPOSED (#12): a weak spot painted on the health bar just below the
  // wound — hit them INTO the window for 40% more; punch through it and
  // the spot shatters.
  exposed: {
    label: 'Exposed', color: '#f0c8d8', duration: 8,
    weakSpot: { size: 0.18, gap: 0.04, bonus: 0.4 },
  },
  // Cauterized wounds (Eruption): incoming healing is HALVED while it
  // burns — regen, leech, restores, mending bonds alike (healTaken gates
  // every heal through Actor.healBy, so this is pure data).
  sear: {
    label: 'Seared', color: '#ff9a5a', duration: 3,
    element: 'fire',
    mods: [mod('healTaken', 'more', -0.5)],
  },

  // --- Chaos DoT debuffs ----------------------------------------------------
  decay: {
    label: 'Decaying', color: '#9a78c8', duration: 6,
    element: 'chaos',
    dotType: 'chaos',
    hitMagnitude: 0.35, baseline: { dps: 3, perLevel: 1.2 },
  },
  // TORMENT (Netherfissure's spirits; the §8 curse family's workhorse):
  // the grave's grip — a necrotic gnaw that DRAGS at the feet. Doom's
  // slower cousin: no cull, just the long cold pull.
  torment: {
    label: 'Tormented', color: '#8a5ac8', duration: 5,
    element: 'chaos',
    dotType: 'chaos',
    mods: [mod('moveSpeed', 'more', -0.25)],
    hitMagnitude: 0.3, baseline: { dps: 2.5, perLevel: 1 },
  },
  contagion: {
    label: 'Contagion', color: '#78c878', duration: 7,
    element: 'chaos',
    dotType: 'chaos',
    propagateOnDeath: true,
    hitMagnitude: 0.3, baseline: { dps: 2.5, perLevel: 1 },
  },

  // --- Curses (debuff fields applied in an area) -----------------------------
  despair: {
    label: 'Despair', color: '#8a68b8', duration: 7,
    mods: [
      mod('fireRes', 'flat', -0.25), mod('coldRes', 'flat', -0.25),
      mod('lightningRes', 'flat', -0.25), mod('chaosRes', 'flat', -0.25),
    ],
  },
  agony: {
    label: 'Agony', color: '#b85858', duration: 7,
    mods: [mod('armor', 'more', -0.6), mod('evasion', 'more', -0.3)],
  },
  indecision: {
    label: 'Indecision', color: '#6888b8', duration: 7,
    mods: [mod('castSpeed', 'more', -0.3), mod('attackSpeed', 'more', -0.25)],
  },
  befuddlement: {
    label: 'Befuddled', color: '#c878b8', duration: 7,
    interruptChance: 0.35,
  },
  // The behavior fabric turned into a HEX: aiAimLead/aiAimJitter are stats
  // (the AI's cast aim reads the sheet), so a curse can unmake a mind — the
  // sylvan sniper's intercept solving zeroes out and every cast's bearing
  // wobbles wide. Purely anti-monster: player aim is a hand, not a stat.
  bewilder: {
    label: 'Bewildered', color: '#c8a8e8', duration: 7,
    mods: [
      mod('aiAimJitter', 'flat', 0.38),
      mod('aiAimLead', 'more', -1),
    ],
  },

  // --- Blessings (positive statuses, applied to allies) ----------------------
  hedonism: {
    label: 'Hedonism', color: '#e878a8', duration: 6,
    beneficial: true,
    mods: [mod('attackSpeed', 'more', 0.25), mod('castSpeed', 'more', 0.25)],
  },
  belligerence: {
    label: 'Belligerence', color: '#d8a848', duration: 8,
    beneficial: true,
    mods: [mod('detectionRange', 'increased', 0.45)],
  },
  furor: {
    label: 'Furor', color: '#e8c848', duration: 8,
    beneficial: true,
    mods: [
      mod('moveSpeed', 'increased', 0.2),
      mod('attackSpeed', 'increased', 0.2),
      mod('castSpeed', 'increased', 0.2),
    ],
  },
  rally: {
    label: 'Rallied', color: '#e8a040', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.25),
      mod('moveSpeed', 'increased', 0.15),
    ],
  },
  // VERDANT COMMUNION — the tree-attunement boon (data/attunements.ts): while
  // rooted near living wood the flesh knits fast. Applied and refreshed by the
  // attunement tick while in range; the short duration IS the linger — step
  // away from the green and it wilts off in moments.
  verdant_communion: {
    label: 'Verdant Communion', color: '#6ac860', duration: 1.6,
    beneficial: true,
    mods: [
      mod('lifeRegenPct', 'flat', 0.05),
      mod('manaRegen', 'increased', 0.25),
    ],
  },
  // STONE COMMUNION — the mountain's patience while you stand among rock
  // (the stone_communion attunement, data/attunements.ts): armored, harder
  // to stagger, harder to shove. Wilts moments after you leave the stone.
  stone_communion: {
    label: 'Stone Communion', color: '#a8a090', duration: 1.6,
    beneficial: true,
    mods: [
      mod('armor', 'increased', 0.45),
      mod('staggerWindow', 'increased', 0.3),
      mod('damageTaken', 'more', -0.06),
    ],
  },
  // PHASING: the bearer has no BODY for a while — walks through the pack
  // and the pack through it (crowd separation skips phasing actors; hits
  // and targeting are untouched). One stat, so movement skills, potions,
  // or a whole ghost-monster (base.phasing 1) grant it identically.
  phasing: {
    label: 'Phasing', color: '#9ad8e8', duration: 4,
    beneficial: true,
    mods: [mod('phasing', 'flat', 1)],
  },

  living_bomb: {
    label: 'Living Bomb', color: '#ff6a2a', duration: 2.5,
    // No DoT — the payload arrives all at once when the timer runs out
    // (the skill bakes a rupture at application).
  },

  // FULGURWEB: the brand that makes PROXIMITY the sin — while it rides,
  // bolts lash the victim's nearby allies on a beat (caster-less baseline
  // × factor; no self-tick).
  fulgur_brand: {
    label: 'Fulgurweb', color: '#e8e05a', duration: 4,
    element: 'lightning',
    baseline: { dps: 4, perLevel: 1.4 },
    zapNearby: { interval: 0.7, radius: 150, factor: 1.1 },
  },

  // DOOMBRAND: a plain vessel — the skill arms it with a rupture payload
  // (curseRupture innate), and it detonates at expiry OR death, whichever
  // answers first (kill() fires armed ruptures).
  doombrand: {
    label: 'Doombrand', color: '#a848a8', duration: 4,
  },

  // POWDER CHARGE (#1): an armed keg RIDING THE TARGET — it moves with
  // them (the lever Storm Call never had), each arrow PUMPS it (armed
  // payloads add on the fixed fuse), and it blows where they stand.
  powder_charge: {
    label: 'Powder Charge', color: '#e8a24a', duration: 2.2,
    element: 'fire',
  },

  warded: {
    label: 'Warded', color: '#d8e8f8', duration: 8, boundToAbsorb: true,
    beneficial: true,
    mods: [mod('armor', 'flat', 60)],
  },

  // --- Terrain statuses -------------------------------------------------------
  // Ground underfoot applies these (refreshed while you stand in it; the
  // short durations are the LINGER after stepping off). Because they're
  // ordinary statuses, anything else can apply them too — a "slippery"
  // curse skill is one data entry away.
  mired: {
    label: 'Mired', color: '#8a7440', duration: 0.6,
    mods: [mod('moveSpeed', 'more', -0.4)],
  },
  sodden: {
    label: 'Sodden', color: '#5a7a4a', duration: 0.8,
    mods: [
      mod('moveSpeed', 'more', -0.55),
      mod('attackSpeed', 'more', -0.15),
      mod('castSpeed', 'more', -0.15),
    ],
  },
  wading: {
    label: 'Wading', color: '#4a90c8', duration: 0.5,
    mods: [mod('moveSpeed', 'more', -0.3)],
  },
  swimming: {
    label: 'Swimming', color: '#2a6ab8', duration: 0.5,
    mods: [mod('moveSpeed', 'more', -0.6), mod('evasion', 'more', -0.3)],
  },
  bogged: {
    label: 'Bogged', color: '#6a8a3a', duration: 0.8,
    mods: [mod('moveSpeed', 'more', -0.45)],
  },
  slippery: {
    label: 'Slippery', color: '#bfe8ff', duration: 0.7,
    mods: [mod('traction', 'more', -0.85)],
  },
  // The OCEAN FLOOR underfoot: a GENTLE slow (milder than wading/swimming) plus a
  // moderate slip (less than ice) — the heavy, low-agency drift of walking the seabed.
  seabed: {
    label: 'Seabed', color: '#3a8aa8', duration: 0.5,
    mods: [mod('moveSpeed', 'more', -0.2), mod('traction', 'more', -0.5)],
  },
  concealed: {
    label: 'Concealed', color: '#4a6a3a', duration: 0.7,
    beneficial: true,
    // Underbrush hides you: enemies notice you at half the range.
    mods: [mod('detectability', 'more', -0.5)],
  },
  // Eldritch tentacle-field grip: a heavy clutch while you stand in it (the brief
  // HARD immobilize on entry is a short `stun` the terrain applies — moveSpeed
  // floors, so a true root needs the stun path). Terrain-style short linger.
  ensnared: {
    label: 'Ensnared', color: '#7fce6a', duration: 0.7,
    mods: [mod('moveSpeed', 'more', -0.7), mod('attackSpeed', 'more', -0.2)],
  },
};

export type { DamageType };

/** The caster-INDEPENDENT strength of a status at a level: the floor under
 *  hit-derived dps, and what a caster-less source (a ground effect, a zone
 *  modifier) applies. 0 for statuses that declare no baseline. */
export function baselineStatusDps(id: string, level: number): number {
  const b = STATUS_DEFS[id]?.baseline;
  return b ? b.dps + b.perLevel * Math.max(0, level - 1) : 0;
}

// Register a generated `apply_<id>` CHANCE stat for every status, mirroring
// the generated convert_<from>_<to> family: any modifier source — support
// gem, passive node, future affix — can grant "chance to apply <status> on
// hit" through the ordinary stat engine. Registered here (not stats.ts) so
// the stat family always matches the status registry, with no import cycle.
//
// `damageVs_<id>` is its attacker-side sibling: increased damage PER STACK
// of <status> already riding the victim ("8% increased damage per poison
// stack on the target" is one flat modifier). Bounded by each status's own
// stack cap — the anti-runaway golden rule comes free with the registry.
for (const [id, def] of Object.entries(STATUS_DEFS)) {
  STAT_DEFS['apply_' + id] = {
    label: `Chance to apply ${def.label}`, base: 0, min: 0, max: 1, percent: true,
  };
  STAT_DEFS['damageVs_' + id] = {
    label: `Damage vs ${def.label} (per stack)`, base: 0, percent: true,
  };
  // MINION CARRY — the owner-side sibling of apply_<id>: "your MINIONS have
  // X% chance to apply <status> on hit". Queried on the OWNER with the summon
  // skill's tags at summon time and transferred onto the minion's own
  // apply_<id> (world.summonMinion), so gems, passives and vocation nodes can
  // arm whole armies with any status through the ordinary stat engine.
  STAT_DEFS['minionApply_' + id] = {
    label: `Minions: Chance to apply ${def.label}`, base: 0, min: 0, max: 1, percent: true,
  };
  // POP POWER — pop-bearing statuses only: scales the fraction of remaining
  // DoT a reapplication detonates ("50% increased Hemorrhage pop" is one mod).
  if (def.pop) {
    STAT_DEFS['popPower_' + id] = {
      label: `${def.label} Pop Damage`, base: 0, percent: true,
    };
  }
  // DOT LEECH — per ticking family: "5% of bleed damage leeched as life"
  // is one modifier on this generated stat, stamped at application and
  // paid to the APPLIER as the affliction ticks.
  if (def.dotType) {
    STAT_DEFS['dotLeech_' + id] = {
      label: `${def.label} Damage Leeched as Life`, base: 0, min: 0, max: 0.5, percent: true,
    };
  }
}

export interface ActiveStatus {
  id: string;
  remaining: number;
  stacks: number;
  /** DoT damage per second per stack (locked in at application time). */
  dps: number;
  sourceName: string;
  /** Spreads to the victim's nearby allies if it dies while afflicted. */
  propagates?: boolean;
  /** Damage dealt in an area when the status EXPIRES (rupture supports). */
  rupture?: number;
  ruptureType?: DamageType;
  /** WEAK SPOT band on the victim's health bar, as fractions of max life
   *  (stamped at application from StatusDef.weakSpot). */
  window?: { lo: number; hi: number };
  /** BRAND ZAP clock (StatusDef.zapNearby): world time of the next lash. */
  zapAt?: number;
  /** MADNESS clock (StatusDef.lashOut): world time of the next strike. */
  lashAt?: number;
  /** The status's FULL span, stamped at application — dpsCurve's clock. */
  total?: number;
  /** The APPLIER's actor id (stamped where the world applies statuses) —
   *  brood hatchlings and future caster-attributed clauses read it. */
  casterId?: number;
  /** BROOD clause riding this affliction (BroodSpec, stamped from the
   *  applying skill's graft) + the tick-damage accumulated toward the
   *  next hatch roll (fed by Actor.updateTimers, spent by the world). */
  brood?: { monsterId: string; perDamage: number; duration: number; max: number };
  broodAcc?: number;
  /** DOT LEECH fraction stamped at application (the applier's
   *  dotLeech_<id> stat) + ticks banked toward the applier's healing. */
  leech?: number;
  leechAcc?: number;
  /** POP-ON-REAPPLY (StatusDef.pop): burst damage banked by a reapplication —
   *  paid out INSTANTLY by the next DoT tick through the ordinary typed
   *  pipeline (mitigation discipline, DoT text, kill handling all standard). */
  popAcc?: number;
}
