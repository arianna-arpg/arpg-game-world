// ---------------------------------------------------------------------------
// Status ailments — data-driven like everything else.
//
// A status either ticks damage over time (dot), applies temporary modifiers
// to its victim (mods), or both. New ailments are added to STATUS_DEFS and
// referenced from any skill's `status` effect by id.
// ---------------------------------------------------------------------------

import { conversionStat, mod, STAT_DEFS, type DamageType, type Modifier, type SkillTag } from './stats';

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
  /** THE BINARY EXEMPTION (the ailment audit, 2026-07-21): this status is
   *  a pure state the POWER lane cannot deepen — you cannot taunt HARDER,
   *  silence LOUDER, or invert a walk twice. statusMagnitude leaves it
   *  untouched and the 'status:power' mechanism skips it, so potency-
   *  family gems refuse hosts whose only applications are exempt. Marked
   *  per-status, never per-family: an ailment that GROWS a scalable knob
   *  (a chance, a buildup, folded mods) drops the mark and rejoins the
   *  lane. */
  powerInert?: true;
  /** If the victim dies while afflicted, the status spreads to its nearby
   *  allies (Contagion) — chains across multiple deaths. */
  propagateOnDeath?: boolean;
  /** Chance that any attack/spell the victim begins fizzles, stunning it
   *  briefly — a curse that acts as an interrupt (Befuddlement). */
  interruptChance?: number;
  /** THE TURNED HAND (the confusion family — engine seam at World.moveActor):
   *  while worn, the bearer's VOLITIONAL movement intent flips — up walks
   *  down, left walks right. One artery, every mover, symmetric by
   *  construction: the player's keys and stick, a monster's steering (its
   *  brain commands 'approach', the feet answer 'away'), a minion's orders.
   *  Forced motion is untouched by the same construction — knockback
   *  (pushActor), grab reeling and track shoves ride other arteries, so the
   *  world still moves you TRUE; only your own steps turn contrary. Composes
   *  with Settings.invertMove as an honest XOR: a by-choice inverted player
   *  who is hexed plays standard for the duration (two turns make a true). */
  invertMove?: true;
  /** THE ADDLED HAND (the confusion family — engine seam at World.useSkill,
   *  beside interruptChance, its misfiring sibling): chance that a
   *  volitional cast fires a DIFFERENT ready skill from the caster's own kit
   *  instead of the pressed one — cooldowns burn at the worst moments.
   *  Player bar presses and AI-chosen casts read the same law (bar slots /
   *  aiActionInsts are one pool); internal mints (metas, converts), triggered
   *  fires, and the reflex lane (flasks are never touched, as pressed OR as
   *  substitute) are exempt. Befuddlement FIZZLES the hand; this REDIRECTS
   *  it. */
  scrambleChance?: number;
  /** Hard crowd control: the victim cannot move or act while afflicted
   *  (checked by Actor.isStunned — stun, frozen). */
  hardCC?: true;
  /** PANIC: while afflicted, AI-driven bodies ROUT (the morale machinery's
   *  flight, forced through updateMorale regardless of the body's own
   *  courage spec) — fear as a real CC class that REPOSITIONS the fight
   *  instead of freezing it. Players are input-driven and never routed;
   *  they wear only the status's ordinary mods. Checked by
   *  Actor.isPanicked — any status may declare it. */
  panic?: true;
  /** THE SCENT LAW: while worn, the bearer reads as PREY to anything that
   *  hunts at all — World.isPrey answers true for any brain with a live
   *  prey list (kin guards still hold: same kind and same squad never eat
   *  their own), so packs converge, lurkers commit, and seekPrey noses the
   *  bearer from beyond sight. The Scentcraft mark's teeth; any future
   *  status (a botched disguise, a blood-soaked curse) may declare it. */
  smellsOfPrey?: true;
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
  /** FLIGHT AS A STATE: while worn, the body FLIES — Actor.flying (noclip
   *  displacement, ground/fall insurance, the renderer's lift-and-bob)
   *  re-derives from worn flight statuses each tick, so takeoffs and
   *  landings are ordinary status traffic through the one skill pipeline
   *  (the murmuration's wing_up / stooping dive). Distinct from the softer
   *  `levitation` STAT (cloudform): a levitator floats over voids but walls
   *  still confine; a flier crosses everything. */
  flight?: true;
  /** CONCEALMENT AS A STATE: while worn, the body is not DRAWN at all —
   *  the renderer's one skip (a swallowed catch, a future burrower or
   *  submerged lurker). Pure presentation: targeting, collision and
   *  statuses keep their own truths (a swallowed body is ALSO
   *  untargetable, but that is the grab sweep's doing, not this flag's).
   *  Ships to co-op clients on the ordinary status wire. */
  conceals?: true;
  /** GHOSTING AS A STATE: while worn, the bearer DRAWS at this alpha (the
   *  minimum across worn statuses wins) — the soft sibling of `conceals`
   *  for bodies that should read present-but-inside (a burrowed parasite
   *  cresting its victim's rim, a half-submerged lurker). Pure
   *  presentation like conceals: targeting, collision and statuses keep
   *  their own truths, and it ships to co-op clients on the ordinary
   *  status wire. */
  ghostAlpha?: number;
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
  /** CHRONOMANCY (engine/timeflow.ts): the victim's OWN clock runs at this
   *  rate while afflicted — 0 is stasis (timers, DoTs, casting, cooldowns,
   *  regen, movement and thought all suspend; the body stays a targetable
   *  statue), fractions are personal slow-motion. A chrono status's OWN
   *  `remaining` burns on UNBENT seconds (it must be able to expire out of
   *  the freeze it causes) — every other status on the body waits. Reachable
   *  from anything that applies statuses: skill effects, procs, fog banks,
   *  ground, monster kits. */
  timeScale?: number;
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
  flamewreathed: {
    // STANDING IN A LIVE FIRE FRONT (the wildfire creep's grant): a short,
    // refreshed terrain burn on the caster-less baseline lane — pressure
    // that asks you to LEAVE, not a one-shot. Its own row so the front's
    // heat tunes independently of the ignite ailment.
    label: 'Flame-Wreathed', color: '#ffb547', duration: 1.2,
    element: 'fire',
    dotType: 'fire',
    stackPolicy: 'strongest',
    baseline: { dps: 4, perLevel: 1.4 },
  },
  starfire: {
    // STANDING IN A PASSING COMET (the cometfall front's grant): a hot,
    // brief star-sear on the caster-less baseline lane — the streak itself
    // is the danger and dodging it is the game (the night sky's Frogger).
    // Fire-typed so fire res answers it; deliberately NO screen-fx row
    // (the terrain-stings rule: environment stings say so in text, never
    // by wearing a combat vignette).
    label: 'Star-Seared', color: '#ffd9a0', duration: 1.1,
    element: 'fire',
    dotType: 'fire',
    stackPolicy: 'strongest',
    baseline: { dps: 6, perLevel: 1.8 },
  },
  stonelashed: {
    // CAUGHT IN A LANDSLIDE (the landslide front's grant): battered by
    // tumbling stone on the caster-less baseline lane, footing wrecked —
    // pressure that asks you to reach the corridor, not a one-shot. Physical
    // so armor answers it; no screen-fx (the terrain-stings rule).
    label: 'Stonelashed', color: '#b8ab90', duration: 1.2,
    dotType: 'physical',
    stackPolicy: 'strongest',
    baseline: { dps: 5, perLevel: 1.6 },
    mods: [mod('moveSpeed', 'more', -0.15)],
  },
  moonlit: {
    // A MOONWELL's blessing (doodad status_wash): the starlight carries
    // your steps — a small, honest speed grace for keeping to the night
    // country's lit basins. The updraft_vent/windswept grammar, vesper-toned.
    label: 'Moonlit', color: '#cfe0ff', duration: 2.5,
    beneficial: true,
    mods: [mod('moveSpeed', 'more', 0.08)],
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
  /** DESERT HEAT (World.updateHeat): shimmer fields — and, in swelter
   *  country, bare daylight — bake stacks on; shade (a canopy, a roof, the
   *  night) dwindles them. Each stack erodes fire resistance — the desert
   *  softens you up for its burns — and AT THE CAP the buildup ladder
   *  consumes them into HEATSTROKE: the sun finally wins a round. The world
   *  manages stacks directly; duration is only a safety TTL. */
  sunscorched: {
    label: 'Sunscorched', color: '#ffb64a', duration: 8,
    element: 'fire',
    stacking: true, maxStacks: 8, buildup: { into: 'heatstroke' },
    mods: [mod('fireRes', 'flat', -0.05)],
    modsPerStack: true,
  },
  /** What sunscorched builds into at cap (the chill→frozen ladder in fire):
   *  a hard SLOW, never a stun — you keep fighting, you stop striding, and
   *  the desert makes you pay for every league you refused to respect.
   *  Consuming the stacks also resets the fire-res erosion: the ladder
   *  breathes instead of compounding. */
  heatstroke: {
    label: 'Heatstroke', color: '#ff7a3a', duration: 5,
    element: 'fire',
    mods: [
      mod('moveSpeed', 'more', -0.18),
      mod('attackSpeed', 'more', -0.12),
      mod('castSpeed', 'more', -0.12),
    ],
  },
  /** THE FLESH COUNTRY's vasovagal ladder (blood grounds, blood-mist fog,
   *  apply_faintness investment): open blood turns the head LIGHT, stack by
   *  stack, and at the cap the buildup consumes into a SWOON. Deliberately
   *  never a stun — the world greys out (VIS_CFG.swoon pall) and the aim
   *  drifts, but you keep your feet. Shed by getting clear of the red. */
  faintness: {
    label: 'Faintness', color: '#d8ccd8', duration: 6,
    stacking: true, maxStacks: 6, buildup: { into: 'swoon' },
    mods: [mod('accuracy', 'more', -0.02)],
    modsPerStack: true,
  },
  /** What faintness collapses into at cap (heatstroke's pale cousin): the
   *  legs go, the hands slur, the vision pales to a white-out — a hard drag,
   *  never a lockout. The swoon pall (renderer) keys on this. */
  swoon: {
    label: 'Swooning', color: '#e8e0ec', duration: 2.2,
    mods: [
      mod('moveSpeed', 'more', -0.26),
      mod('attackSpeed', 'more', -0.18),
      mod('castSpeed', 'more', -0.18),
    ],
  },
  /** The GUTWORKS' sour ladder (bile grounds, gut-miasma fog, apply_queasy):
   *  the stomach argues, then it WINS — at cap the stacks convert into
   *  RETCHING. Casts slur while it climbs. */
  queasy: {
    label: 'Queasy', color: '#a8b86a', duration: 5,
    stacking: true, maxStacks: 5, buildup: { into: 'retching' },
    mods: [mod('castSpeed', 'more', -0.03)],
    modsPerStack: true,
  },
  /** Queasy's cap: doubled over and heaving — begun attacks and spells keep
   *  fizzling (the befuddlement interrupt machinery), everything slows. A
   *  channel-breaker, never a stun. */
  retching: {
    label: 'Retching', color: '#c2cc74', duration: 1.6,
    interruptChance: 0.6,
    mods: [mod('castSpeed', 'more', -0.22), mod('attackSpeed', 'more', -0.14)],
  },
  /** THE OCULAR's regard (World.updateGaze, ZoneTheme.gaze): standing in
   *  reach of OPEN eyes builds BEHELD. Walk right up and an eye flinches
   *  shut (builds nothing); put it out and it never watches again. At cap
   *  the stacks consume into SEEN. Pure pressure — the ladder is the cost. */
  beheld: {
    label: 'Beheld', color: '#d8b04a', duration: 8,
    stacking: true, maxStacks: 8, buildup: { into: 'seen' },
  },
  /** Marked by the flesh: it knows exactly where you are, and it TELLS its
   *  own — the gaze lane answers a fresh conversion with a lure ping (the
   *  zone turns toward you). The mark itself is the classic hunted debuff. */
  seen: {
    label: 'Seen', color: '#f0c860', duration: 6,
    mods: [mod('damageTaken', 'more', 0.12)],
  },
  /** BLIND — the eye country's own verb, usable by and against anything
   *  with aim: accuracy crushed, perception halved. A blinded monster loses
   *  its reach of sight; a blinded hero shoots wide. */
  blind: {
    label: 'Blinded', color: '#3a3444', duration: 4,
    mods: [mod('accuracy', 'more', -0.45), mod('detectionRange', 'more', -0.5)],
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
      // Cold binds the footwork insight reads with: the chilled duelist
      // slips less and refills slower (insightSap × the momentum blend) —
      // THE counter to mobile insight-textured bodies, worn as data.
      mod('insightSap', 'flat', 0.4),
    ],
  },
  frozen: {
    label: 'Frozen', color: '#d8f4ff', duration: 1.5, hardCC: true,
    element: 'cold',
    // A shatter target for Absolute Zero. A frozen nerve reads NOTHING —
    // insight's slip and refill both die with the momentum (sap 1).
    mods: [mod('damageTaken', 'more', 0.1), mod('insightSap', 'flat', 1)],
  },
  shock: {
    label: 'Shocked', color: '#ffe14a', duration: 4,
    element: 'lightning',
    mods: [mod('damageTaken', 'more', 0.2)],
  },
  stun: {
    label: 'Stunned', color: '#cccccc', duration: 0.8, hardCC: true,
    // A rung bell reads nothing: insight momentum dies for the duration.
    mods: [mod('insightSap', 'flat', 1)],
  },
  // THE POSSESSION SEAM's husk mark (engine/possess.ts): worn by a vacated
  // hero body while its seat rides elsewhere — re-stamped by the sweep, so
  // it lapses on its own moments after the seat returns. Presentation plus
  // the lockdown reading (hardCC: break-bars and CC counters see a body
  // that truly cannot answer). The DEFENSE dial is the huskGuard stat and
  // the POSSESS_CFG husk ladder, never this row — the engine takes no side
  // on how naked a trance should be.
  entranced: {
    label: 'Entranced', color: '#b8a8e8', duration: 2, hardCC: true,
    // Vacant eyes read nothing: insight momentum dies while the seat is away.
    mods: [mod('insightSap', 'flat', 1)],
  },
  // CHRONOMANCY (StatusDef.timeScale → engine/timeflow.ts): the victim's own
  // clock, bent. Ordinary statuses in every other way — hard-cast them, proc
  // them (apply_stasis / apply_temporal_drag exist like every apply_), grant
  // them from fog or ground, shrug them with ailmentResist.
  stasis: {
    // The body hangs OUTSIDE time: timers, DoTs, casting, cooldowns, regen,
    // thought and motion all suspend — but the statue is still targetable
    // (add damageTaken mods here to make a protective or a vulnerable
    // stasis; the engine takes no side). hardCC so break-bars, CC counters
    // and stun-family interactions all treat it as the lockdown it is.
    label: 'Stasis', color: '#a8ecf0', duration: 1.2,
    powerInert: true,
    timeScale: 0, hardCC: true,
  },
  temporal_drag: {
    // Personal slow-motion — the whole BODY at half rate (cooldowns, casts,
    // DoTs and feet alike), distinct from chill's move-speed bite. Its own
    // duration burns on unbent seconds (see StatusDef.timeScale).
    label: 'Temporal Drag', color: '#7ea8c8', duration: 3,
    // timeScale COULD deepen with power one day — the timeflow wiring is
    // its own pass; binary until then.
    powerInert: true,
    timeScale: 0.5,
  },
  // THE PETRIFY LADDER (the Karst Country's gaze): stone creeps up the body —
  // every stack is WEIGHT (a per-stack whole-kit slow, chill's grammar at a
  // heavier grain), and at max stacks the flesh is consumed into PETRIFIED: a
  // brief stone stasis riding the chrono fabric (timeScale 0 — a targetable
  // statue, outside time; frozen's damageTaken so the shattering blow lands
  // wider). Ordinary statuses end to end: hard-cast them, proc them
  // (apply_petrifying / damageVs_petrified exist like every lane), point the
  // gaze fabric at them (ZoneTheme.gaze.status — the watcher stones build
  // the climb), shrug them with ailmentResist. The counterplay ladder: break
  // line of sight, press inside closeReach (the eye flinches shut), or burst
  // the watcher itself.
  petrifying: {
    label: 'Petrifying', color: '#9a948a', duration: 4,
    stacking: true, maxStacks: 6, buildup: { into: 'petrified' },
    modsPerStack: true,
    mods: [
      mod('moveSpeed', 'more', -0.055),
      mod('attackSpeed', 'more', -0.045),
      mod('castSpeed', 'more', -0.045),
    ],
  },
  petrified: {
    label: 'Petrified', color: '#b8b2a4', duration: 1.4,
    timeScale: 0, hardCC: true,
    mods: [mod('damageTaken', 'more', 0.1), mod('insightSap', 'flat', 1)],
  },
  // THE FEAR LADDER (the Gloamwood country's dread): every stack is NERVE
  // LOST — trembling hands (attack/cast speed) and backward-stepping feet —
  // and at max stacks the nerve BREAKS into HORRIFIED: a rout, not a
  // freeze. Fear is the CC class that REPOSITIONS fights: monsters scatter
  // (StatusDef.panic rides the morale machinery — refuges, jukes and squad
  // courage all still apply), which is mercy OR disaster depending on what
  // they scatter toward. Players never rout (input is courage); they wear
  // the mods alone. Ordinary statuses end to end: hard-cast, proc'd
  // (apply_harrowing / damageVs_horrified mint like every lane), shrugged
  // with ailmentResist, worn by anything from a support gem to a manor.
  harrowing: {
    label: 'Harrowing', color: '#b8a4d8', duration: 4,
    stacking: true, maxStacks: 5, buildup: { into: 'horrified' },
    modsPerStack: true,
    mods: [
      mod('attackSpeed', 'more', -0.04),
      mod('castSpeed', 'more', -0.04),
      mod('accuracy', 'more', -0.03),
    ],
  },
  horrified: {
    label: 'Horrified', color: '#d8c8f0', duration: 1.6,
    panic: true,
    mods: [mod('damageTaken', 'more', 0.08)],
  },
  // SELECTIVE CC — the forbidsTags family: each locks ONE verb and leaves
  // the rest of the kit alive (the counterplay IS switching verbs).
  // All three are ordinary statuses: hard-cast them, proc them
  // (apply_silence / apply_disarm / apply_rooted exist like every apply_),
  // shrug them with ailmentResist — nothing bespoke anywhere.
  silence: {
    label: 'Silenced', color: '#b8b8e8', duration: 3,
    forbidsTags: ['spell'],
    powerInert: true,
  },
  disarm: {
    label: 'Disarmed', color: '#e8c8a0', duration: 3,
    forbidsTags: ['attack'],
    powerInert: true,
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
  // --- THE WAX COURT's body-grammar (worn via MonsterDef.onHitByType) --------
  /** Cold-set: the wax hardens BRITTLE — slower, and easier to CRACK. The
   *  freeze-then-break half of the candleflesh puzzle. */
  brittle: {
    label: 'Brittle', color: '#bfe4f0', duration: 4,
    element: 'cold',
    stacking: true, maxStacks: 3, modsPerStack: true,
    mods: [mod('damageTaken', 'more', 0.07), mod('moveSpeed', 'more', -0.08)],
  },
  /** Fire-run: the wax MELTS — faster and looser, dripping as it comes. The
   *  burn-and-outrun half of the puzzle. */
  melting: {
    label: 'Melting', color: '#f0c26a', duration: 5,
    element: 'fire',
    mods: [
      mod('moveSpeed', 'increased', 0.22),
      mod('attackSpeed', 'increased', 0.15),
      mod('damageTaken', 'more', 0.08),
    ],
  },
  /** CANDLELIT: picked out by vigil-light — seen from much further. The
   *  shrine's anti-stealth lantern, and what fire does to a living shadow. */
  waxlight: {
    label: 'Candlelit', color: '#ffe9a8', duration: 4,
    mods: [mod('detectability', 'more', 0.6)],
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
  // UNRAVELLING (the Unmaking's signature): a compounding chaos rot — each
  // stack loosens the victim's grip on itself (chaos-res erosion per stack),
  // the ticks open weak and finish hard (ramp), and THE DEAD PASS IT ON
  // (propagateOnDeath): the volcanic country pops when it dies; the
  // unmaking TRAVELS. Caps into UNMADE.
  unravelling: {
    label: 'Unravelling', color: '#7de84a', duration: 6,
    element: 'chaos', dotType: 'chaos',
    stacking: true, maxStacks: 5, buildup: { into: 'unmade' },
    dpsCurve: 'ramp',
    hitMagnitude: 0.4, baseline: { dps: 3, perLevel: 1.1 },
    mods: [mod('chaosRes', 'flat', -0.04)],
    modsPerStack: true,
    propagateOnDeath: true,
  },
  // What unravelling collapses into at cap: for a breath the victim is
  // partly ELSEWHERE — the legs drag, the hands slur, the outline argues
  // with the world. A hard drag, never a lockout (the heatstroke/swoon
  // doctrine).
  unmade: {
    label: 'Unmade', color: '#b8ffd0', duration: 2.2,
    mods: [
      mod('moveSpeed', 'more', -0.24),
      mod('attackSpeed', 'more', -0.15),
      mod('castSpeed', 'more', -0.15),
    ],
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
    powerInert: true,
  },
  // PREY-MARKED (Scentcraft): the smell of the eaten, dashed on. The scent
  // law (smellsOfPrey → World.isPrey) turns every hunter on the bearer;
  // the damage lean makes the cast matter even on an empty field.
  prey_marked: {
    label: 'Prey-Marked', color: '#c8a86a', duration: 8,
    smellsOfPrey: true,
    mods: [mod('damageTaken', 'increased', 0.12)],
  },
  // BOLTED (Scentcraft): the colony's own alarm-scent, weaponized — a
  // short, absolute rout (the panic flag; players wear only the mods).
  bolted: {
    label: 'Bolted', color: '#d8b84a', duration: 2.4,
    panic: true,
    mods: [mod('evasion', 'more', -0.2)],
  },
  // EXPOSED (#12): a weak spot painted on the health bar just below the
  // wound — hit them INTO the window for 40% more; punch through it and
  // the spot shatters.
  exposed: {
    label: 'Exposed', color: '#f0c8d8', duration: 8,
    weakSpot: { size: 0.18, gap: 0.04, bonus: 0.4 },
    // The weak spot could plausibly WIDEN with power one day — until that
    // read exists, the state is binary.
    powerInert: true,
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
  /** THE CONFUSION FAMILY — CONTROL ITSELF as the hit surface, symmetric by
   *  construction (both engine seams read the STATUS, not the seat: a hexed
   *  monster's feet and hands betray it exactly like yours — the player
   *  leverages these EQUALLY). The mind lanes divide clean: befuddlement
   *  FIZZLES the hand, bewilder unmakes the AIM (anti-monster by nature);
   *  these two turn what the hand DOES. Disoriented is the pressure carrier
   *  — the maze building in the inner ear, stack by stack, until the world
   *  turns at the cap. */
  disoriented: {
    label: 'Disoriented', color: '#9ad8d0', duration: 6,
    stacking: true, maxStacks: 5, buildup: { into: 'widdershins' },
  },
  /** The carrier's cap: every volitional step flips (StatusDef.invertMove —
   *  World.moveActor is the one seam). Never a stun: you keep everything
   *  except your bearings — walk it off backwards, or stand and fight. */
  widdershins: {
    label: 'Widdershins', color: '#5ecec0', duration: 3.5,
    invertMove: true,
    powerInert: true,
  },
  /** The direct hex on the casting hand (StatusDef.scrambleChance —
   *  World.useSkill is the one seam): pressed buttons may fire the kit's
   *  NEIGHBOR instead, burning cooldowns at inopportune moments. Applied
   *  straight (no ladder) — the counterplay is the timer and the discipline
   *  to hold your combos until it passes. */
  addled: {
    label: 'Addled', color: '#e0b464', duration: 6,
    scrambleChance: 0.4,
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
  // THE ATTUNED FAMILY (engine/tuning.ts — the attunement fabric): one row
  // per damage type. A tuned crystal WEARS its tone as this status (held
  // until retuned) and PULSES it briefly onto everyone near on a tone
  // change — allies and enemies alike; the crystal doesn't take sides.
  // Each grants that element's edge: increased damage of the type, a
  // little of its resistance, and (elements) a sliver of physical CARRIED
  // AS the type — blows near a fire-tuned crystal take the crystal's
  // color. Physical is the ground state: no conversion (there is nothing
  // to convert INTO it that wouldn't unmake the elemental rows' point),
  // armor instead — the shattered, load-bearing note. These colors ARE
  // the tone tints everywhere (toneTint reads them back): change a hue
  // here and the crystal glow, pulse ring, and text all follow.
  attuned_physical: {
    label: 'Attuned: Physical', color: '#cdc6b6', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.15, ['physical']),
      mod('armor', 'increased', 0.15),
    ],
  },
  attuned_fire: {
    label: 'Attuned: Fire', color: '#ff8a3a', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.15, ['fire']),
      mod(conversionStat('physical', 'fire'), 'flat', 0.12),
      mod('fireRes', 'flat', 0.1),
    ],
  },
  attuned_cold: {
    label: 'Attuned: Cold', color: '#b8e8ff', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.15, ['cold']),
      mod(conversionStat('physical', 'cold'), 'flat', 0.12),
      mod('coldRes', 'flat', 0.1),
    ],
  },
  attuned_lightning: {
    label: 'Attuned: Lightning', color: '#ffe27a', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.15, ['lightning']),
      mod(conversionStat('physical', 'lightning'), 'flat', 0.12),
      mod('lightningRes', 'flat', 0.1),
    ],
  },
  attuned_chaos: {
    label: 'Attuned: Chaos', color: '#c88aff', duration: 6,
    beneficial: true,
    mods: [
      mod('damage', 'increased', 0.15, ['chaos']),
      mod(conversionStat('physical', 'chaos'), 'flat', 0.12),
      mod('chaosRes', 'flat', 0.1),
    ],
  },
  // KINDLED — the puzzle fabric's blink (engine/puzzles.ts): a chime crystal
  // lit by the refrain's playback or a correct answer. Pure display — the
  // status lane is the one dressing wire (nameplate, co-op, fx), so a lit
  // crystal is lit for every seat with zero bespoke sync. Duration 1 on
  // purpose: appliers pass exact seconds as the durationScale.
  kindled: {
    label: 'Kindled', color: '#ffe9a8', duration: 1,
    beneficial: true,
  },
  // CONSECRATED — the standing blessing made a CENTRAL status (the See's
  // liturgy pass): until now every "blessed" was an ad-hoc inline buff;
  // this row gives sanctity one name the whole fabric can reach — the
  // generated apply_/damageVs_ lanes open with it, kin and gems and procs
  // grant it identically, and the liturgy's responsory pours it. A mend
  // that keeps mending and a little more bite while the blessing holds.
  consecrated: {
    label: 'Consecrated', color: '#ffe9b8', duration: 6,
    beneficial: true,
    mods: [mod('lifeRegen', 'flat', 3), mod('damage', 'increased', 0.06)],
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
  // WINDSWEPT — the geyser's uplift clinging to your heels (the sky-launch
  // traversal's landing gift): a few strides of lightness on the clouds.
  windswept: {
    label: 'Windswept', color: '#bfe0ff', duration: 3.5,
    beneficial: true,
    mods: [mod('moveSpeed', 'increased', 0.12)],
  },
  // WINDED — the landing after the cloud gave way: knees bent, breath gone
  // for a heartbeat. A brief heaviness, never a spiral (the fall itself cost
  // whatever the shelf's CollapseSpec priced it at).
  winded: {
    label: 'Winded', color: '#c8d4ea', duration: 1.4,
    mods: [mod('moveSpeed', 'increased', -0.15)],
  },
  // CLOUDFORM — the body condenses into stabilized cloud-stuff and FLOATS:
  // while it rides, every vertical fabric reads the bearer as levitating
  // (collapse teeter, flux fray, the boundary voids — the 'levitation' stat,
  // one lever like phasing) and void bands cross underfoot; walls still
  // confine. Lapse mid-sky and the coyote clock finds you where you stand.
  // The Mistral kata's signature state; granters set their own durations.
  cloudform: {
    label: 'Cloudform', color: '#dceafc', duration: 3,
    beneficial: true,
    mods: [mod('levitation', 'flat', 1), mod('moveSpeed', 'increased', 0.1)],
  },
  // ALOFT — TRUE FLIGHT as a worn state (StatusDef.flight): the bearer
  // rides the flying flag itself — noclip over rocks, walls and chasms,
  // ground/fall insurance, the renderer's lift-and-bob — for as long as the
  // wings hold. The murmuration's air phase (wing_up grants it, the
  // stooping dive sheds it via cleanse), and an open lever: any skill,
  // ground or trap that grants/strips `aloft` moves a body between the
  // sky and the reachable world. `damageVs_aloft` auto-mints with it —
  // fowling as buildcraft. Speed while airborne is the status's own gift.
  aloft: {
    label: 'Aloft', color: '#e8d8a0', duration: 999,
    beneficial: true, flight: true,
    mods: [mod('moveSpeed', 'increased', 0.25)],
  },
  // --- THE CALLED CLOUD'S GIFTS (conjured-cloud presences, engine/flux.ts) --
  // Standing in a cloud a SKILL called grants these on the fog idiom:
  // refreshed while inside, the short duration is the linger stepping out.
  // WHICH cloud grants WHAT is pure data — ConjureEffect.grants rows on the
  // skill, trailConjure rows on the delivery, CONJURE_RIDERS stats from
  // supports (data/conjury.ts). Anything else may apply them too.
  //
  // CLOUD HAVEN — the standing cloud swallows outlines and softens aim:
  // harder to notice, harder to hit, for whoever keeps to the vapor.
  cloudhaven: {
    label: 'Cloud Haven', color: '#cfeaff', duration: 1.0,
    beneficial: true,
    mods: [mod('detectability', 'more', -0.35), mod('evasion', 'increased', 0.2)],
  },
  // WIND LANE — the laid trail is a ROAD: allies who run where the cloud
  // was called borrow the wind's pace (the Gale family's motto, kept).
  windlane: {
    label: 'Wind Lane', color: '#bfe8f4', duration: 0.9,
    beneficial: true,
    mods: [mod('moveSpeed', 'increased', 0.15)],
  },
  // STORM-LACED — the thunderhead takes your side: blows struck from
  // inside the charged cloud carry its sting (apply_shock rides the
  // ordinary ailment pipeline; no bespoke hooks).
  stormlaced: {
    label: 'Storm-Laced', color: '#e8e8a8', duration: 1.0,
    beneficial: true,
    mods: [mod('apply_shock', 'flat', 0.2), mod('damage', 'increased', 0.08)],
  },
  // SILVER-LINED — the cloud's underside is a slow mending: flesh and
  // focus knit while the weather holds over you.
  silverlined: {
    label: 'Silver-Lined', color: '#dcecf8', duration: 1.0,
    beneficial: true,
    mods: [mod('lifeRegenPct', 'flat', 0.02), mod('manaRegen', 'increased', 0.25)],
  },
  // SMOTHERED — the hostile reading of the same weather (Low Ceiling):
  // the cloud pressed down onto a body swallows ITS sight and spoils its
  // aim. Refresh/linger idiom like every other terrain status.
  smothered: {
    label: 'Smothered', color: '#9aa8c2', duration: 1.0,
    mods: [mod('detectionRange', 'more', -0.45), mod('accuracy', 'increased', -0.15)],
  },

  // THE GLOAMING's veil (packages/defs/gloaming.ts grants row): worn by every
  // body standing in the gloom OUTSIDE a light's reach. Both edges cut the
  // same cloth — your sight shrinks AND you are harder to see — so brush
  // stealth composes multiplicatively toward near-invisibility, and enemy
  // cones close in exactly as the player's world does. The dark's own kin
  // never wear it (the grant row's notFactions filter).
  gloomveiled: {
    label: 'Gloom-veiled', color: '#a89ad0', duration: 1.2,
    mods: [mod('detectionRange', 'more', -0.45), mod('detectability', 'more', -0.45)],
  },

  // THE GLIMMERKIN's hold (the grove country): a light too interesting to
  // look away from. The held walk as through honey and sometimes press the
  // wrong hand entirely (THE ADDLED HAND — scrambleChance), which is fair
  // play in both directions: the duskveil dancer transfixes you, and any
  // future player light can transfix the wood right back.
  transfixed: {
    label: 'Transfixed', color: '#d8f078', duration: 1.6,
    mods: [mod('moveSpeed', 'more', -0.35)],
    scrambleChance: 0.25,
  },

  // THE WISPLIGHT's flourish (packages/defs/wisplight.ts): pulsed onto every
  // body near a kindled, wandering light. Beneficial ON PURPOSE — the light
  // blesses the mire's own kin (the danger the event sells), and the same
  // status marks a body as WISP-TOUCHED for the ride's strongest-host scoring
  // (the seek weighs wearers heavier). Short-lived: it fades a few breaths
  // after the light moves on.
  emboldened: {
    label: 'Emboldened', color: '#b8f0a0', duration: 4.5, beneficial: true,
    mods: [mod('damage', 'increased', 0.18), mod('moveSpeed', 'increased', 0.1)],
  },

  // THE QUICKENING's mark (packages/defs/quickening.ts): worn by every enemy
  // on quickened ground — the surge runs in the local kin, the danger half of
  // the event's bargain (the reward half is the zone's raised level + bounty).
  // Beneficial ON PURPOSE and enemy-worn: the gilt tint is the at-a-glance
  // read "this body is surge-fed". Pulse-refreshed by the engine's scene
  // sweep (duration a breath past the pulse), so late spawns join and the
  // mark dies with the surge instead of lingering.
  quickborn: {
    label: 'Quickborn', color: '#e8c86a', duration: 7, beneficial: true,
    mods: [mod('damage', 'increased', 0.14), mod('moveSpeed', 'increased', 0.08), mod('castSpeed', 'increased', 0.08)],
  },

  // THE WISPLIGHT's ride marks — one per wisp KIND (the kind row names its
  // status; a new kind is a new row here + one entry in the surge's kind
  // table). Each is the host's TEXTURE half: percentages that scale whatever
  // the ride's level-computed sheet source granted (the flat ES/armor lane),
  // plus the visible mark the scene re-adopts hosts by. Long-lived on
  // purpose — the ride ends by the blade, not the clock.
  wisp_ridden_pale: {
    label: 'Palelit', color: '#b8f0a0', duration: 900, beneficial: true,
    mods: [mod('energyShield', 'increased', 0.5), mod('armor', 'increased', 0.35)],
  },
  wisp_ridden_flame: {
    label: 'Flamewreathed', color: '#ffb547', duration: 900, beneficial: true,
    mods: [mod('damage', 'more', 0.25), mod('moveSpeed', 'increased', 0.25)],
  },
  wisp_ridden_grave: {
    label: 'Gravelit', color: '#9ae8ff', duration: 900, beneficial: true,
    mods: [mod('damage', 'increased', 0.2), mod('evasion', 'increased', 0.3)],
  },

  // HARRIED — the gnat-cloud's misdirection seed (THE THRONG's smallest
  // flavor, and any future biting-cloud kin): each stack is one more
  // maddening speck in the eyes. Never a blind (that ladder is claimed) —
  // a shallow, stacking aim-and-attention spoiler whose ceiling is the
  // crowd itself. Refreshed by the riders' latch clock (ClingSpec.
  // rideStatus), so shaking the swarm off IS the cleanse.
  harried: {
    label: 'Harried', color: '#b8c86a', duration: 1.6,
    stacking: true, maxStacks: 6, modsPerStack: true,
    mods: [mod('accuracy', 'increased', -0.04), mod('detectionRange', 'more', -0.03)],
  },

  // THE GRAB FABRIC's marker pair (engine/grab.ts) — the READ, not the
  // mechanism: the hold itself lives on the actor pair (gripping/heldBy)
  // and the sweep re-stamps these each beat while it lives, so a cleanse
  // is harmless (the grip is bodily, not a curse) and the wire ships the
  // predicament to every client for free. Short durations = they fall off
  // on their own the moment the sweep stops refreshing.
  seized: {
    label: 'Seized', color: '#d8a06a', duration: 0.5,
    // A body in someone's fists reads NOTHING but the fists — the
    // duelist's momentum dies like any bound nerve (insightSap).
    mods: [mod('insightSap', 'flat', 1)],
  },
  swallowed: {
    label: 'Swallowed', color: '#b46a8a', duration: 0.5,
    conceals: true,
    mods: [mod('insightSap', 'flat', 1)],
  },
  // THE BURROW MARKER (engine/cling.ts): worn by a rider sunk INSIDE the
  // body it rides — pure legibility (the ghost read + a pip + the co-op
  // status wire); the gameplay truth is the ride state and the one-
  // directional hostility gate, never this status. Refreshed on the ride
  // clock, stripped by the release; beneficial (it is the parasite's own
  // advantage — never an affliction, never eaten by a friendly cleanse).
  burrowed: {
    label: 'Burrowed', color: '#c8a878', duration: 1.0,
    beneficial: true,
    ghostAlpha: 0.45,
  },

  living_bomb: {
    label: 'Living Bomb', color: '#ff6a2a', duration: 2.5,
    // The payload is baked at application (a rupture) — power reaches it
    // THERE, through the applier's magnitude; the marker itself is binary.
    powerInert: true,
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
    powerInert: true,
  },

  // POWDER CHARGE (#1): an armed keg RIDING THE TARGET — it moves with
  // them (the lever Storm Call never had), each arrow PUMPS it (armed
  // payloads add on the fixed fuse), and it blows where they stand.
  powder_charge: {
    label: 'Powder Charge', color: '#e8a24a', duration: 2.2,
    powerInert: true,
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
  crestborne: {
    // RIDING THE SURGE (FrontSpec.riders — World.updateCreepRiders): a pure
    // MARKER re-stamped every tick while a body sits a marching crest's
    // seat. Cleansing it is harmless (the seat re-stamps next beat); it
    // carries no mods by design — the readable hook other systems may key
    // off, never the mechanism.
    label: 'Crestborne', color: '#f08a96', duration: 0.5,
  },
  // THE SOUL CURRENT'S GRIP (data/creeps.ts soul_current — the River of
  // Souls): the pale water leaning on living limbs. A drag rides the creep
  // fabric separately; this row is the felt COLD of it — slower steps,
  // duller reads (insightSap: the river blunts the duelist's eye like the
  // chill family does). Stacks WITH wading/swimming by design: the current
  // is worse than still water.
  soulchill: {
    label: 'Soul-Chilled', color: '#9fd8ec', duration: 0.6,
    mods: [mod('moveSpeed', 'more', -0.15), mod('insightSap', 'flat', 0.2)],
  },
  swimming: {
    label: 'Swimming', color: '#2a6ab8', duration: 0.5,
    mods: [mod('moveSpeed', 'more', -0.6), mod('evasion', 'more', -0.3)],
  },
  bogged: {
    label: 'Bogged', color: '#6a8a3a', duration: 0.8,
    mods: [mod('moveSpeed', 'more', -0.45)],
  },
  // TERRAIN-ENTRY STINGS — the bog's rot and the brine's salt burn wear
  // their OWN rows instead of borrowing combat 'poison', deliberately: the
  // borrowed id dragged the full combat-poison SCREEN VIGNETTE with it, so
  // grazing any bog/brine shoreline SNAPPED a heavy green wash over the
  // whole frame at a razor world-line — read in playtests (marsh AND the
  // original Coast report) as "the shaders break past a line", not as
  // feedback. These carry the dot and the floating text; the screen-fx
  // registry deliberately holds NO row for them. Combat poison keeps its
  // vignette untouched.
  bog_rot: {
    label: 'Bog-Rotted', color: '#6a8a3a', duration: 1,
    element: 'chaos', dotType: 'chaos', stackPolicy: 'strongest',
  },
  brine_burn: {
    label: 'Brine-Burned', color: '#9fd8c8', duration: 1,
    element: 'chaos', dotType: 'chaos', stackPolicy: 'strongest',
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
  /** THE CREEP FABRIC (engine/creep.ts): the membrane feeds its own — kinds
   *  grant these via CreepGrant faction filters, so the skin is territory
   *  the way grave-mist is (mistfed's pattern, grounded). Refresh/linger. */
  caulfed: {
    label: 'Caul-Fed', color: '#8a6ab0', duration: 1.6,
    beneficial: true,
    mods: [mod('damage', 'increased', 0.12), mod('lifeRegen', 'flat', 4)],
  },
  /** The caulflesh resents every other boot: a wet, sucking drag — terrain
   *  texture, deliberately shy of the ensnared clutch (the Caul should feel
   *  WRONG underfoot long before it feels unfair). */
  caulmired: {
    label: 'Caul-Mired', color: '#5a4468', duration: 1.2,
    mods: [mod('moveSpeed', 'more', -0.12)],
  },
  /** The blightgrowth (the Eldritch incursion's creep) keeps the same pair
   *  in its own sickly key. */
  blightfed: {
    label: 'Blight-Fed', color: '#7fce6a', duration: 1.6,
    beneficial: true,
    mods: [mod('damage', 'increased', 0.12), mod('lifeRegen', 'flat', 3)],
  },
  blightmired: {
    label: 'Blight-Mired', color: '#587a52', duration: 1.2,
    mods: [mod('moveSpeed', 'more', -0.1)],
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
  /** THE POWER LANE (2026-07-21, "scale ALL ailments"): the applier's ailment
   *  potency (statusMagnitude) for NON-damaging statuses — multiplies the
   *  StatusDef.mods values as they fold onto the victim's sheet (a 30%-
   *  stronger shock takes 30% more; a deeper chill slows harder). DoT
   *  statuses carry their potency in `dps` instead and keep power 1 — one
   *  crank, never double-dipped. Strongest application wins on refresh. */
  power?: number;
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
