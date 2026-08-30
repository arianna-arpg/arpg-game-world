// ---------------------------------------------------------------------------
// THE SUPPORT GEM CATALOG (skill modifiers).
//
// Dropped by slain monsters; socket into any unlocked skill whose tags match
// `requiresTags` (any-of). A support is a bundle of skill-local modifiers —
// the same modifier language used everywhere else — so new supports can
// touch projectile counts, minion caps, areas, costs, crits, ailments, or
// any other registered stat. `perLevel` mods accrue as the gem is leveled
// with skill points.
// ---------------------------------------------------------------------------

import { conversionStat, gaugeMod, mod, STAT_DEFS } from '../engine/stats';
import { AOE_SHAPE, PROJ_RETURN, GUARD_CAST_CFG, BAR_SLOTS, MAX_SUPPORT_LEVEL, slotGraftStat } from '../engine/skills';
import type { SupportDef } from '../engine/skills';

export const SUPPORTS: Record<string, SupportDef> = {

  // PHASE 3 PROOF: a support that adds a damaging component to KNOCKBACK when the
  // victim is slammed into a wall or hurled into the void — purely a 'collision'
  // proc grant + a tag gate, no engine code (the displacement/collision seam).
  crushing_impact: {
    id: 'crushing_impact', name: 'Crushing Impact',
    description: 'Enemies you knock back take 80% of your damage when they slam into a wall or are hurled into the void.',
    color: '#ff7040', requiresTags: ['melee'],
    mods: [mod('proc_collision_crush', 'flat', 1)],
    // No perLevel yet: the proc chance is already 100%, and the payload lives
    // in procs.ts — leveling growth is a balance-pass decision.
    weight: 6,
  },

  // THE MASS FABRIC's player-side gem (engine/mass.ts) — weight made a
  // weapon. Sister to Crushing Impact, different lane: the crush re-rolls
  // YOUR SKILL's damage on arrest; this one scales the fabric's own
  // momentum wounds and the authority behind the launch itself.
  battering_ram: {
    id: 'battering_ram', name: 'Battering Ram',
    description: 'Hits from this skill gain heavy knockback and +25% shove authority, and'
      + ' victims slammed to a halt by a wall, or by a body heavy enough to be one, take +40%'
      + ' impact damage.',
    color: '#c8a068', requiresTags: ['melee'],
    mods: [
      mod('knockback', 'flat', 90),
      mod('shoveAuthority', 'flat', 0.25),
      mod('impactDamage', 'flat', 0.4),
    ],
    perLevel: [mod('knockback', 'flat', 12), mod('impactDamage', 'flat', 0.05)],
    weight: 6,
  },

  // THE SLAYER LANE (engine/stats.ts overmatch/giantsbane/regicide; folded
  // once at damage.ts mitigateTyped) — three orthogonal punch-UP axes, each
  // a plain stat: gems here today, affixes and passives whenever they want
  // the same lane. The quickened-ground diet (fighting above your level),
  // the colossus diet (fighting above your weight class), the head-hunt
  // (fighting the named). All conditional MORE — dead weight against
  // ordinary same-level fodder ON PURPOSE: these gems choose your prey.
  overmatch: {
    id: 'overmatch', name: 'Overmatch',
    description: 'This skill deals 30% more damage to enemies of higher level than you, and'
      + ' nothing extra to anything else. A gem for hunting up the ladder.',
    color: '#e8c86a', requiresTags: ['attack', 'spell'],
    mods: [mod('overmatch', 'flat', 0.3)],
    perLevel: [mod('overmatch', 'flat', 0.02)],
    weight: 6,
  },
  giantsbane: {
    id: 'giantsbane', name: 'Giantsbane',
    description: 'Against bodies at least half again your own weight, this skill deals 30% more'
      + ' damage; the light and the fleet gain you nothing. A gem for felling ogres, hulks, and'
      + ' the colossal.',
    color: '#c8a068', requiresTags: ['attack', 'spell'],
    mods: [mod('giantsbane', 'flat', 0.3)],
    perLevel: [mod('giantsbane', 'flat', 0.02)],
    weight: 6,
  },
  regicide: {
    id: 'regicide', name: 'Regicide',
    description: 'EMPOWERED enemies take 22% more damage from this skill: magic, rare,'
      + ' champion, and crowned blood alike. The trash clears itself; this gem is for the ones'
      + ' wearing names.',
    color: '#e64db4', requiresTags: ['attack', 'spell'],
    mods: [mod('regicide', 'flat', 0.22)],
    perLevel: [mod('regicide', 'flat', 0.015)],
    weight: 6,
  },
  // The lane's fourth axis (engine/stats.ts limbreaver, same mitigateTyped
  // fold): not what the victim is relative to you — WHERE on the creature
  // you spend the blow. Anchored composite parts only (Actor.partLink):
  // the pavise board, the swinging censer, the mounted archer, the bell.
  limbreaver: {
    id: 'limbreaver', name: 'Limbreaver',
    description: 'A composite monster\'s PARTS take 35% more damage from this skill: the shield'
      + ' it hides behind, the censer blessing its kin, the riders on its back. Nothing extra'
      + ' against the body that carries them.',
    color: '#d8b04a', requiresTags: ['attack', 'spell'],
    mods: [mod('limbreaver', 'flat', 0.35)],
    perLevel: [mod('limbreaver', 'flat', 0.025)],
    weight: 6,
  },
  // The lane's FIFTH axis (engine/stats.ts siegebreaker, same mitigateTyped
  // fold): whether the victim can WALK AWAY. IMMOBILE bodies only
  // (Actor.stationary — defs whose base moveSpeed is 0): the Warfront's
  // engines, every spawner object, idols, planted totems. The war below
  // builds; this gem un-builds. (Vocabulary: 'immobile' is this axis;
  // 'ROOTED' belongs to engine/rooted.ts — ground-worn power — and is the
  // Uprooter's business two rows down.)
  siegebreaker: {
    id: 'siegebreaker', name: 'Siegebreaker',
    description: 'IMMOBILE enemies take 30% more damage from this skill: siege engines,'
      + ' spawners, idols, anything built or planted where it stands. What cannot walk away'
      + ' cannot be spared by footwork either.',
    color: '#e8823a', requiresTags: ['attack', 'spell'],
    mods: [mod('siegebreaker', 'flat', 0.3)],
    perLevel: [mod('siegebreaker', 'flat', 0.02)],
    weight: 6,
  },
  // The lane's SIXTH axis (engine/stats.ts spentbane, same mitigateTyped
  // fold) — and the first keyed off a state the victim ENTERS AND LEAVES.
  // Every other axis prices a matchup; this one prices PATIENCE. A body
  // whose reserve has run dry (engine/reserves.ts: a bellows mid-vent, a
  // wick burned down, a leaker bled out) reads spent, and it wears that
  // fact on its body — so the gem is never a guess, and the whole play is
  // "bait it empty, THEN commit".
  spentbane: {
    id: 'spentbane', name: 'Spentbane',
    description: 'SPENT enemies, those whose reserve has run dry or who are venting to refill'
      + ' it, take 40% more damage from this skill; a full one takes nothing extra. Bait the'
      + ' expensive move, then spend into the window it opens.',
    color: '#9ad0c8', requiresTags: ['attack', 'spell'],
    mods: [mod('spentbane', 'flat', 0.4)],
    perLevel: [mod('spentbane', 'flat', 0.028)],
    weight: 6,
  },
  // The lane's SEVENTH axis (engine/stats.ts uprooter, same mitigateTyped
  // fold) — the positional one. A body wearing MonsterDef.rooted draws its
  // strength from ground it claims; off that ground it is merely a body.
  // You ARM this gem with the mass fabric (shove it off) or with the kill
  // order (drop the heart and the membrane recoils under the whole court).
  uprooter: {
    id: 'uprooter', name: 'Uprooter',
    description: 'This skill deals 35% more damage to enemies standing OFF their own claimed'
      + ' ground, the membrane or native floor their strength depends on. Shove one clear of'
      + ' it, or kill the heart that grows it and pull the floor from the whole court.',
    color: '#8fbf6a', requiresTags: ['attack', 'spell'],
    mods: [mod('uprooter', 'flat', 0.35)],
    perLevel: [mod('uprooter', 'flat', 0.025)],
    weight: 6,
  },
  // THE LANE'S SOCIAL PAIR (engine/pack.ts bondbreaker/quailbane, same
  // mitigateTyped fold) — the first two axes keyed off a victim's place in
  // its GROUP rather than any fact about its body. Both exist because the
  // pack layer DRAWS what they price: a rope of light running from a
  // warden, and a body visibly folding as its nerve goes. Punished ==
  // advertised, so neither gem asks the player to memorize anything.
  bondbreaker: {
    id: 'bondbreaker', name: 'Bondbreaker',
    description: 'Enemies standing in a WARDEN\'S FAVOR, the drawn bond from the body'
      + ' empowering them, take 30% more damage from this skill. Nothing extra against the'
      + ' warden itself, or a body already cut loose.',
    color: '#e0a94e', requiresTags: ['attack', 'spell'],
    mods: [mod('bondbreaker', 'flat', 0.3)],
    perLevel: [mod('bondbreaker', 'flat', 0.02)],
    weight: 6,
  },
  quailbane: {
    id: 'quailbane', name: 'Quailbane',
    description: 'Against FALTERING enemies, those whose nerve has broken from wounds, numbers,'
      + ' or a fallen captain, this skill deals 32% more damage. It pays for pressure, and the'
      + ' collapsing posture is the sign to swing.',
    color: '#9aa8b8', requiresTags: ['attack', 'spell'],
    mods: [mod('quailbane', 'flat', 0.32)],
    perLevel: [mod('quailbane', 'flat', 0.022)],
    weight: 6,
  },

  // THE GRAB FABRIC's pair (engine/grab.ts) — one gem per half of the art,
  // scoped by the grapple alphabet itself ('grab' / 'throw' tags), so
  // neither can socket into a skill with no hold to deepen or no catch to
  // send. Battering Ram composes on throws already (melee + the mass
  // stats); these are the fabric-native lanes.
  iron_grip: {
    id: 'iron_grip', name: 'Iron Grip',
    description: 'Holds from this skill close with +35% grip power: far heavier bodies can be'
      + ' gripped, and victims struggle free slower.',
    color: '#c8a068', requiresTags: ['grab'],
    mods: [mod('gripPower', 'flat', 0.35)],
    perLevel: [mod('gripPower', 'flat', 0.06)],
    weight: 6,
  },
  trebuchet_arm: {
    id: 'trebuchet_arm', name: 'Trebuchet Arm',
    description: 'Throws from this skill leave with +35% shove authority and deal +45% impact'
      + ' damage wherever the flight is arrested: by wall, by body, or by the bottom of a pit.',
    color: '#d8b078', requiresTags: ['throw'],
    mods: [mod('shoveAuthority', 'flat', 0.35), mod('impactDamage', 'flat', 0.45)],
    perLevel: [mod('impactDamage', 'flat', 0.06)],
    weight: 6,
  },
  // The family's THIRD verb (2026-07-24, the deepened-courts round): the
  // coilborn court taught the world what a squeeze is — this is the
  // player's edition. iron_grip makes the hold LAST, trebuchet_arm makes
  // the release LAND; wringing_grip makes the hold itself WOUND (the
  // gripCrush read at the grab sweep — physical, mitigated, credited,
  // stacking atop a swallow's own digestion).
  wringing_grip: {
    id: 'wringing_grip', name: 'Wringing Grip',
    description: 'While this skill holds a victim, the grip crushes them for 5% of their own'
      + ' life each second; armor still counts, and the kill is credited to you.',
    color: '#b48858', requiresTags: ['grab'],
    mods: [mod('gripCrush', 'flat', 0.05)],
    perLevel: [mod('gripCrush', 'flat', 0.007)],
    weight: 6,
  },
  // THE COLONY PASS's counterplay gem (engine/plies.ts plyRend, folded at
  // the ply gate + the lite carve): the anti-SWARM blade. Count-durable
  // bodies eat blows, not damage — this gem makes each blow count double.
  exterminator: {
    id: 'exterminator', name: 'Exterminator',
    description: 'Blows from this skill tear one extra PLY from count-durable bodies: swarms,'
      + ' husks, everything that eats hits instead of wounds. Against ordinary life bars it'
      + ' adds nothing; this gem is for the crawl.',
    color: '#d8d0b8', requiresTags: ['attack', 'spell'],
    mods: [mod('plyRend', 'flat', 1)],
    perLevel: [mod('plyRend', 'flat', 0.05)],
    weight: 6,
  },

  // --- The Wildcraft disciplines (the jungle's arts, bottled) ----------------
  serrated_edge: {
    id: 'serrated_edge', name: 'Serrated Edge',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s edge is toothed: hits gain a 35% chance to inflict BLEED, and'
      + ' the skill deals 10% increased damage.',
    color: '#a8563c', requiresTags: ['melee'],
    mods: [mod('apply_bleed', 'flat', 0.35), mod('damage', 'increased', 0.1)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 6,
  },
  envenomed_tips: {
    id: 'envenomed_tips', name: 'Envenomed Tips',
    requiresMechanisms: ['strikes'],
    description: 'Projectiles from this skill fly dipped in venom: hits gain a 30% chance to'
      + ' POISON, and 15% increased effect duration keeps the toxin working longer.',
    color: '#7ec850', requiresTags: ['projectile'],
    mods: [mod('apply_poison', 'flat', 0.3), mod('effectDuration', 'increased', 0.15)],
    perLevel: [mod('apply_poison', 'flat', 0.04)],
    weight: 6,
  },
  // The anti-air lane (damageVs_aloft — the flight status's auto-minted
  // counter-stat): fowling as buildcraft, priced for the murmuration and
  // every winged thing after it.
  fowlers_eye: {
    id: 'fowlers_eye', name: 'Fowler\'s Eye',
    description: 'Fletched for the sky: this skill\'s projectiles deal 35% increased damage to'
      + ' ALOFT enemies and fly with 10% increased projectile speed.',
    color: '#e8d8a0', requiresTags: ['projectile'],
    mods: [mod('damageVs_aloft', 'increased', 0.35), mod('projectileSpeed', 'increased', 0.1)],
    perLevel: [mod('damageVs_aloft', 'increased', 0.05)],
    weight: 5,
  },
  // THE DIN (the watch fabric, engine/watch.ts): strikes as STIMULUS — the
  // stealth layer's lure gem. The stat is a radius; the bang lands at the
  // blow (resolveHit) and wherever a flight ends (wall, floor, range's
  // edge), so a bolt thrown PAST a sentinel pulls it off its post. Watchers
  // climb only to the search rung on sound — the lure repositions, never
  // aggros. Deliberately single-purpose: against anything that keeps no
  // watch it does nothing, and the no-op ledger records that on purpose.
  ringing_report: {
    id: 'ringing_report', name: 'Ringing Report',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s blows land loud, and a spent flight rings wherever it ends;'
      + ' anything keeping a watch comes to investigate the noise instead of you.',
    color: '#c8b880', requiresTags: ['attack', 'spell'],
    mods: [mod('noiseOnHit', 'flat', 260)],
    perLevel: [mod('noiseOnHit', 'flat', 14)],
    weight: 4,
  },
  smothering_spores: {
    id: 'smothering_spores', name: 'Smothering Spores',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s lingering work hangs thicker: 15% increased area of effect, 20%'
      + ' increased effect duration, and its hits gain a 15% chance to POISON.',
    color: '#a8d05a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('effectDuration', 'increased', 0.2), mod('apply_poison', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Unmaking graft pair (the war-wound's arts) -----------------------
  loose_thread: {
    id: 'loose_thread', name: 'Loose Thread',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill find the loose thread: 25% chance to set the victim'
      + ' UNRAVELLING, a compounding rot that spreads from the dead.',
    // attack|spell: the hit-capable gate (tag hygiene — the census flags a
    // universal applier as inert on every flask/banner/ward it would fit).
    color: '#7de84a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_unravelling', 'flat', 0.25)],
    perLevel: [mod('apply_unravelling', 'flat', 0.04)],
    weight: 5,
  },
  entropic_bloom: {
    id: 'entropic_bloom', name: 'Entropic Bloom',
    requiresMechanisms: ['strikes'],
    description: 'Lingering work from this skill comes apart at the seams: 12% increased area'
      + ' of effect, 18% increased effect duration, and its hits gain a 15% chance to inflict'
      + ' UNRAVELLING.',
    color: '#5ee88a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.12), mod('effectDuration', 'increased', 0.18), mod('apply_unravelling', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Symbiote grafts (the Caul arts' support pair) --------------------
  grasping_tendrils: {
    id: 'grasping_tendrils', name: 'Grasping Tendrils',
    requiresMechanisms: ['strikes'],
    description: 'Barbs of living cord ride this skill\'s edge: hits gain a 20% chance to'
      + ' ENSNARE, and the skill deals 8% increased damage.',
    color: '#8a6ab0', requiresTags: ['melee'],
    mods: [mod('apply_ensnared', 'flat', 0.2), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_ensnared', 'flat', 0.03)],
    weight: 6,
  },
  parasitic_pact: {
    id: 'parasitic_pact', name: 'Parasitic Pact',
    requiresMechanisms: ['strikes'],
    description: 'Socket a hungry passenger: landed hits let it SIP, a small heal briefly'
      + ' rationed between sips, and it sharpens its host with 6% increased damage.',
    color: '#9a72c8', requiresTags: ['attack'],
    mods: [mod('proc_parasite_sip', 'flat', 1), mod('damage', 'increased', 0.06)],
    perLevel: [mod('damage', 'increased', 0.02)],
    weight: 5,
  },

  // --- The parity pass's family gems ------------------------------------------
  // Coverage for the tags the class expansion leans on: the skald's songs,
  // the chronomancer's clockwork (previously ZERO dedicated supports), the
  // warcry hall, and the trapper's devices. All plain mod bundles — every
  // stat here is read by the ordinary folds.
  held_note: {
    id: 'held_note', name: 'Held Note',
    description: 'Sustain this song: 30% increased effect duration, and 15% increased area of'
      + ' effect for the music to fill.',
    color: '#d8a8e0', requiresTags: ['song'],
    mods: [mod('effectDuration', 'increased', 0.3), mod('aoeRadius', 'increased', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },
  countermelody: {
    id: 'countermelody', name: 'Countermelody',
    // 'strikes' (2026-07-24 hygiene, the war_chant ledger row): the second
    // line deepens damage and status chance — a pure buff-domain song has
    // neither to deepen, and the refusal self-lifts the moment a graft
    // makes the host genuinely strike (summon songs fit via the crew hop).
    requiresMechanisms: ['strikes'],
    description: 'A second line under this song: 20% increased damage, and +15% status chance'
      + ' for everything the melody applies.',
    color: '#c088d0', requiresTags: ['song'],
    mods: [mod('damage', 'increased', 0.2), mod('statusChance', 'flat', 0.15)],
    perLevel: [mod('damage', 'increased', 0.04)],
    weight: 5,
  },
  // The skald's CADENCE companion (2026-07-24, the deepened-courts round):
  // the family's own meter — Verse, banked by war_chant/dissonance, spent
  // whole by the Coda, decaying when the music rests — reached only two of
  // the six songs. This gem TEACHES the bank to any song (the stored_verdict
  // chargeGain-graft lane: instanceChargeGain merges socketed taps) and pays
  // the singer per banked Verse through the charge:verse GAUGE (the first
  // gauge-scaled support — engine/stats.ts Modifier.gauge, auto-fed from
  // Actor.charges). On the Coda it banks what the chord then spends; on a
  // summon song the court itself sings harder (the minionDamage line, tag-
  // scoped so it sleeps on bodiless verses).
  rising_chorus: {
    id: 'rising_chorus', name: 'Rising Chorus',
    description: 'Each singing of this song banks a VERSE, up to 5, fading when the music'
      + ' rests. Every banked Verse grants 4% increased damage, and 4% increased minion damage'
      + ' on summoning songs. Feeds the Coda; rewards the set never allowed to end.',
    color: '#e0b8e8', requiresTags: ['song'],
    chargeGain: [{ charge: 'verse', amount: 1, max: 5, on: 'use' }],
    mods: [
      gaugeMod('damage', 'increased', 0.04, 'charge:verse'),
      gaugeMod('minionDamage', 'increased', 0.04, 'charge:verse', ['summon']),
    ],
    perLevel: [gaugeMod('damage', 'increased', 0.005, 'charge:verse')],
    weight: 5,
  },
  lingering_moment: {
    id: 'lingering_moment', name: 'Lingering Moment',
    description: 'Stolen seconds stretch: this skill gains 35% increased effect duration and'
      + ' 15% increased status magnitude. What it slows stays slowed longer.',
    color: '#8ae0e8', requiresTags: ['chrono'],
    mods: [mod('effectDuration', 'increased', 0.35), mod('statusMagnitude', 'increased', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.06)],
    weight: 5,
  },
  borrowed_haste: {
    id: 'borrowed_haste', name: 'Borrowed Haste',
    description: 'This skill runs ahead of its own clock: 30% increased cooldown recovery and'
      + ' 15% increased cast speed.',
    color: '#a8e8e0', requiresTags: ['chrono'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.15)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  commanding_presence: {
    id: 'commanding_presence', name: 'Commanding Presence',
    description: 'This shout carries: 25% increased area of effect and 25% increased effect'
      + ' duration, so a wider ring hears the order and it stands longer.',
    color: '#e8c04a', requiresTags: ['warcry'],
    mods: [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  hair_trigger: {
    id: 'hair_trigger', name: 'Hair Trigger',
    description: 'Devices from this skill are set nervous: laid with 20% increased cast speed'
      + ' and rearmed with 30% increased cooldown recovery.',
    color: '#c8a878', requiresTags: ['trap', 'mine'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.2)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  tinkers_arsenal: {
    id: 'tinkers_arsenal', name: 'Tinker\'s Arsenal',
    description: 'This skill may keep one more device standing at once, each built with 20%'
      + ' increased life, but it deals 15% less damage.',
    color: '#b8a068', requiresTags: ['trap', 'mine', 'totem'],
    dropTags: ['trap', 'mine', 'totem'],
    mods: [mod('constructMaxCount', 'flat', 1), mod('minionLife', 'increased', 0.2), mod('damage', 'more', -0.15)],
    perLevel: [mod('minionLife', 'increased', 0.05)],
    minDropLevel: 8,
    weight: 4,
  },

  // --- Channeling & guard supports -------------------------------------------

  // --- Sparks, luck & the roll's ends -------------------------------------------
  chaotic_discharge: {
    id: 'chaotic_discharge', name: 'Chaotic Discharge',
    description: 'Armed charges from this skill detonate in shuffled order rather than'
      + ' placement order, and the skill deals 10% increased damage.',
    color: '#ffe94a', requiresTags: ['channel'],
    releaseOrder: 'random',
    mods: [mod('damage', 'increased', 0.1)],
    weight: 5,
  },
  fortunes_favor: {
    id: 'fortunes_favor', name: "Fortune's Favor",
    requiresMechanisms: ['strikes'],
    description: 'Each use of this skill has a 25% chance to roll its damage twice and keep the'
      + ' higher result.',
    color: '#e8d44a',
    mods: [mod('luckyChance', 'flat', 0.25)],
    perLevel: [mod('luckyChance', 'flat', 0.04)],
    weight: 6,
  },
  jinxing_touch: {
    id: 'jinxing_touch', name: 'Jinxing Touch',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have a 20% chance to JINX the victim: their own damage rolls twice and keeps the lower for 5 seconds.',
    color: '#8a78a8',
    mods: [mod('apply_jinxed', 'flat', 0.2)],
    perLevel: [mod('apply_jinxed', 'flat', 0.03)],
    weight: 5,
  },
  tempest_range: {
    id: 'tempest_range', name: 'Tempest Range',
    description: '+25 to this skill\'s MAXIMUM lightning damage; the minimum stays where it'
      + ' was, so the roll swings higher without getting steadier.',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [mod('addedMax_lightning', 'flat', 25)],
    perLevel: [mod('addedMax_lightning', 'flat', 5)],
    weight: 6,
  },
  steady_current: {
    id: 'steady_current', name: 'Steady Current',
    description: 'Adds +8 to this skill\'s MINIMUM lightning damage: the floor of every roll'
      + ' climbs while the ceiling stays put.',
    color: '#c8e84a', requiresTags: ['lightning'],
    mods: [mod('addedMin_lightning', 'flat', 8)],
    perLevel: [mod('addedMin_lightning', 'flat', 2)],
    weight: 6,
  },
  loaded_dice: {
    id: 'loaded_dice', name: 'Loaded Dice',
    requiresMechanisms: ['strikes'],
    description: 'Widens this skill\'s damage range by 40% around the same average: high rolls'
      + ' land higher, low rolls land lower. Feeds anything that reads the top of the roll.',
    color: '#e8c04a',
    mods: [mod('damageSpread', 'flat', 0.4)],
    perLevel: [mod('damageSpread', 'flat', 0.06)],
    weight: 6,
  },
  overload: {
    id: 'overload', name: 'Overload',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill that roll in the top 12% of their damage range ARC,'
      + ' leaping to up to three nearby enemies at 50% damage. Wider dice and wider windows'
      + ' both feed it.',
    color: '#7af0ff', requiresTags: ['lightning'],
    mods: [mod('proc_overload_arc', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05, ['lightning'])],
    weight: 5,
  },
  unstable_compression: {
    id: 'unstable_compression', name: 'Unstable Compression',
    description: 'This skill\'s AREA re-rolls on every cast, anywhere from a 60% pop to a 155%'
      + ' bloom of itself. In trade it deals 15% more area damage; instability pays.',
    color: '#e89a4a', requiresTags: ['aoe'],
    variance: { aoe: [0.6, 1.55] },
    mods: [mod('damage', 'more', 0.15, ['aoe'])],
    perLevel: [mod('damage', 'increased', 0.05, ['aoe'])],
    weight: 5,
  },
  parting_gift: {
    id: 'parting_gift', name: 'Parting Gift',
    description: 'Where this skill\'s projectiles end their flight, struck home or spent, a'
      + ' FROST NOVA at 70% damage blooms at the death point. The skill costs 20% more mana.',
    color: '#a8e4ff', requiresTags: ['projectile'],
    // THE PARTING LANE (2026-07-27 — this pair carried a standing note calling
    // itself a "known crew-lane inert pair"; THE CREW FORWARD retired it):
    // `sequel` is a MINION_RIDABLE field, so a sequel gem socketed into a
    // summon RIDES — forwardSummonSockets lands it on the raised body's OWN
    // flight skill and instanceSequel reads it THERE, at that flight's end,
    // the kill credited to the keeper like any minion's. Corpse crews
    // (raise_spectre/revive) are 'unknowable' at socket time and resolve fit
    // PER BODY at the raise: raise an archer and the arrows bloom; raise a
    // melee husk and the gem simply finds no flight to board. Pinned end to
    // end — board, read, mint, credit — by probe_supportfabric RIG O.
    sequel: { skillId: 'frost_nova', damageScale: 0.7 },
    mods: [mod('manaCost', 'more', 0.2)],
    perLevel: [mod('damage', 'increased', 0.05, ['cold'])],
    weight: 5, minDropLevel: 8,
  },
  epidemic: {
    id: 'epidemic', name: 'Epidemic',
    description: 'Enemies struck by this skill have a 25% chance to RE-RELEASE it from'
      + ' themselves after a beat, at 60% damage; each hop carries half the odds of the last,'
      + ' three hops at most. This skill costs 30% more mana. The crowd becomes the caster.',
    color: '#b8e06a', requiresTags: ['aoe'],
    excludeTags: ['channel', 'guard', 'aura', 'movement'],
    contagion: { chance: 0.25, decay: 0.5, damageScale: 0.6 },
    mods: [mod('manaCost', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.04, ['aoe'])],
    weight: 4, minDropLevel: 12,
  },
  // The Spell Power / Spell Damage split, as a pair of gems: umbral_power
  // adds chaos to EVERYTHING this skill is (untagged mod — the universal
  // lane); umbral_focus adds MORE, but only when the skill is chaos-tagged
  // (the school-specific lane). One mechanism, two scopes: tag filters.
  umbral_power: {
    id: 'umbral_power', name: 'Umbral Power',
    requiresMechanisms: ['strikes'],
    description: 'Adds 3 chaos damage to this skill\'s hits, whatever school it belongs to; any'
      + ' skill that strikes can take the graft.',
    color: '#b06bd4',
    mods: [mod('addedChaos', 'flat', 3)],
    perLevel: [mod('addedChaos', 'flat', 1)],
    weight: 6,
  },
  umbral_focus: {
    id: 'umbral_focus', name: 'Umbral Focus',
    description: 'Adds 7 chaos damage to this skill\'s hits; only a CHAOS skill can drink from'
      + ' this well, and the narrow lane runs deeper.',
    color: '#8a48c8', requiresTags: ['chaos'],
    mods: [mod('addedChaos', 'flat', 7, ['chaos'])],
    perLevel: [mod('addedChaos', 'flat', 2, ['chaos'])],
    weight: 6,
  },

  // --- The Legion's gifts (demon-kill gem drops lean this way via gemBias) ---
  brimstone_tithe: {
    id: 'brimstone_tithe', name: 'Brimstone Tithe',
    description: 'This skill deals 30% more fire damage and costs 40% more mana. The tithe is'
      + ' always collected.',
    color: '#ff6a2a', requiresTags: ['fire'],
    mods: [mod('damage', 'more', 0.3, ['fire']), mod('manaCost', 'more', 0.4)],
    perLevel: [mod('damage', 'more', 0.02, ['fire'])],
    weight: 5,
  },
  tormentors_glee: {
    id: 'tormentors_glee', name: "Tormentor's Glee",
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have a 25% chance to TORMENT the victim, a necrotic gnaw'
      + ' that drags at the feet; the skill deals 25% increased damage to the tormented.',
    color: '#8a5ac8', requiresTags: ['chaos', 'curse'],
    mods: [mod('apply_torment', 'flat', 0.25), mod('damageVs_torment', 'increased', 0.25)],
    perLevel: [mod('apply_torment', 'flat', 0.03), mod('damageVs_torment', 'increased', 0.03)],
    weight: 5,
  },
  hellhunger: {
    id: 'hellhunger', name: 'Hellhunger',
    description: 'This skill\'s minions have a 20% chance to set what they strike ALIGHT and'
      + ' deal 10% increased damage.',
    color: '#e0503a', requiresTags: ['minion'],
    mods: [mod('minionApply_burn', 'flat', 0.2), mod('minionDamage', 'increased', 0.1)],
    perLevel: [mod('minionApply_burn', 'flat', 0.03)],
    weight: 5,
  },

  // --- The wildwood & carrion gifts (the bestiary expansion's gem lane) ------
  putrefaction: {
    id: 'putrefaction', name: 'Putrefaction',
    requiresMechanisms: ['strikes'],
    description: 'Each hit from this skill carries a 20% chance to start DECAY, and the skill'
      + ' deals 20% increased damage to the decaying.',
    color: '#9ab83a', requiresTags: ['chaos'],
    mods: [mod('apply_decay', 'flat', 0.2), mod('damageVs_decay', 'increased', 0.2)],
    perLevel: [mod('apply_decay', 'flat', 0.03), mod('damageVs_decay', 'increased', 0.03)],
    weight: 5,
  },
  // The Karst ladder's on-hit lever (putrefaction's grammar in stone): any
  // physical skill can build toward the statue, and profit from one.
  calcifying: {
    id: 'calcifying', name: 'Calcifying',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s blows have a 10% chance to build PETRIFYING on the victim, and'
      + ' it deals 15% increased damage to the petrified.',
    color: '#9a948a', requiresTags: ['physical'],
    mods: [mod('apply_petrifying', 'flat', 0.1), mod('damageVs_petrified', 'increased', 0.15)],
    perLevel: [mod('apply_petrifying', 'flat', 0.015), mod('damageVs_petrified', 'increased', 0.025)],
    weight: 5,
  },
  // REFRACTION — the crystal country's lens (the attunement pass): the
  // supported blow SPLITS into the spectrum. A slice of its physical leaves
  // as each element and the elemental portions brighten — on a physical
  // skill it's a prism; on an elemental skill the conversion rows idle but
  // the brightening pays, so the socket is never silent. Changes the
  // packet's MIX, which is exactly what the attunement fabric reads: a
  // refracted mace tunes crystals to whichever color your build feeds.
  refraction: {
    id: 'refraction', name: 'Refraction',
    requiresMechanisms: ['strikes'],
    description: 'This skill REFRACTS: 10% of its physical damage becomes fire, 10% cold, and'
      + ' 10% lightning, and it deals 12% increased fire, cold, and lightning damage. Every'
      + ' blow a spectrum.',
    color: '#cfe8ff',
    // The socket gate IS the no-op audit (ANY-of): only skills with
    // something to refract — physical to split or an element to brighten.
    // Pure-chaos, auras, flasks and wards are REFUSED, never inert.
    requiresTags: ['physical', 'fire', 'cold', 'lightning'],
    mods: [
      mod(conversionStat('physical', 'fire'), 'flat', 0.1),
      mod(conversionStat('physical', 'cold'), 'flat', 0.1),
      mod(conversionStat('physical', 'lightning'), 'flat', 0.1),
      mod('damage', 'increased', 0.12, ['fire']),
      mod('damage', 'increased', 0.12, ['cold']),
      mod('damage', 'increased', 0.12, ['lightning']),
    ],
    perLevel: [
      mod('damage', 'increased', 0.02, ['fire']),
      mod('damage', 'increased', 0.02, ['cold']),
      mod('damage', 'increased', 0.02, ['lightning']),
    ],
    weight: 5,
  },
  barbed_snare: {
    id: 'barbed_snare', name: 'Barbed Snare',
    requiresMechanisms: ['strikes'],
    description: 'Barbed lines trail this skill\'s projectiles: an 8% chance to ROOT the victim'
      + ' outright, with movement skills refused while the root holds.',
    color: '#8a9a4a', requiresTags: ['projectile'],
    mods: [mod('apply_rooted', 'flat', 0.08)],
    perLevel: [mod('apply_rooted', 'flat', 0.012)],
    weight: 5,
  },
  brood_tender: {
    id: 'brood_tender', name: 'Brood Tender',
    description: 'Minions of this skill drip venom, with a 20% chance to POISON on hit, and'
      + ' they are reared with 10% increased life.',
    color: '#7fce6a', requiresTags: ['minion'],
    mods: [mod('minionApply_poison', 'flat', 0.2), mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionApply_poison', 'flat', 0.03)],
    weight: 5,
  },
  wound_worrier: {
    id: 'wound_worrier', name: 'Wound-Worrier',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have a 15% chance to open a HEMORRHAGE, and the skill'
      + ' deals 20% increased damage to the hemorrhaging.',
    color: '#e04858', requiresTags: ['attack', 'physical'],
    mods: [mod('apply_hemorrhage', 'flat', 0.15), mod('damageVs_hemorrhage', 'increased', 0.2)],
    perLevel: [mod('apply_hemorrhage', 'flat', 0.02), mod('damageVs_hemorrhage', 'increased', 0.03)],
    weight: 5,
  },

  // --- Blood, mending & the guard hall --------------------------------------------
  sanguine_feast: {
    id: 'sanguine_feast', name: 'Sanguine Feast',
    description: 'Bleeds inflicted by this skill LEECH: 5% of their tick damage flows back to'
      + ' you as life.',
    // The mechanism IS the gate (no tag gate — 2026-07-21): any host that
    // BLEEDS fits, from its own effects or a bleed-chance gem beside it —
    // and the day an ailment-conversion turns a poison host into a
    // bleeder, the door opens by itself (the live-instance read).
    color: '#b03030', requiresMechanisms: ['affliction:bleed'],
    mods: [mod('dotLeech_bleed', 'flat', 0.05)],
    perLevel: [mod('dotLeech_bleed', 'flat', 0.01)],
    weight: 5,
  },
  mending_echoes: {
    id: 'mending_echoes', name: 'Mending Echoes',
    description: 'This skill\'s direct heals POUR instead: 130% of the mend, spread over 6'
      + ' seconds. Slower, stronger, and separate pours stack.',
    color: '#7ec88a', requiresTags: ['heal'],
    healOverTime: { seconds: 6, factor: 1.3 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.06)],
    weight: 5,
  },
  unyielding_stance: {
    id: 'unyielding_stance', name: 'Unyielding Stance',
    description: 'WHILE GUARDING with this skill: 40% increased guard strength, +20 poise, and your poise recovers twice as fast.',
    color: '#c8d8e8', requiresTags: ['guard'],
    mods: [
      mod('guardStrength', 'increased', 0.4),
      mod('poise', 'flat', 20, undefined, 'guarding'),
      mod('poiseRegenPct', 'increased', 1, undefined, 'guarding'),
    ],
    weight: 5,
  },
  bulwark_of_thorns: {
    id: 'bulwark_of_thorns', name: 'Bulwark of Thorns',
    description: 'While this guard is raised, anything that strikes you takes 14 damage back.',
    color: '#9ec83a', requiresTags: ['guard'],
    mods: [mod('channelThorns', 'flat', 14)],
    perLevel: [mod('channelThorns', 'flat', 5)],
    weight: 6,
  },
  counterweight: {
    id: 'counterweight', name: 'Counterweight',
    description: 'Grants this guard a 0.3s PARRY window: a hit met in the window ripostes at doubled power.',
    color: '#e8e4d8', requiresTags: ['guard'],
    mods: [mod('guardParry', 'flat', 0.3), mod('guardParryPower', 'flat', 0.5)],
    weight: 5,
  },
  shieldwall_doctrine: {
    id: 'shieldwall_doctrine', name: 'Shieldwall Doctrine',
    description: 'WHILE GUARDING: +20% passive block chance and +12 block value. The wall'
      + ' behind the wall.',
    color: '#8a9ab8', requiresTags: ['guard'],
    mods: [
      mod('blockChance', 'flat', 0.2, undefined, 'guarding'),
      mod('blockValue', 'flat', 12, undefined, 'guarding'),
    ],
    perLevel: [mod('blockValue', 'flat', 3, undefined, 'guarding')],
    weight: 5,
  },
  // --- The fissure texture gems -----------------------------------------------
  volcanic_heart: {
    id: 'volcanic_heart', name: 'Volcanic Heart',
    description: 'Lingering fissure segments from this skill randomly RE-LIGHT: on a 1.2 second'
      + ' beat, a 40% chance to erupt again at 80% damage.',
    color: '#ff8a4a', requiresTags: ['fissure'],
    fissureVolatile: { interval: 1.2, chance: 0.4, damageScale: 0.8 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  tectonic_echoes: {
    id: 'tectonic_echoes', name: 'Tectonic Echoes',
    description: 'Lingering fissure segments glow ARMED: run over one and it detonates a wide'
      + ' aftershock around that stretch of crack at 110% damage, re-arming in 2.5 seconds. The'
      + ' whack-a-mole movement game.',
    color: '#e8a24a', requiresTags: ['fissure'],
    fissureAftershock: { damageScale: 1.1, radiusScale: 2.4, rearm: 2.5 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  seismic_waltz: {
    id: 'seismic_waltz', name: 'Seismic Waltz',
    description: 'Live fissure segments randomly ARM for 1.4 seconds at a time: cross one while'
      + ' it glows and it DETONATES a wide burst at full damage, and that step goes quiet until'
      + ' the floor deals again. The ground picks the steps; you keep the time.',
    color: '#f0b060', requiresTags: ['fissure'],
    fissureRoulette: { interval: 0.9, chance: 0.3, window: 1.4, damageScale: 1, radiusScale: 2.2 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  restless_wound: {
    id: 'restless_wound', name: 'Restless Wound',
    description: 'After this skill\'s crack closes (a closing pass is granted if the skill'
      + ' brings none), it has a 60% chance to close AGAIN, up to three more times, each'
      + ' re-closing zipping home at 70% damage.',
    color: '#c88a9a', requiresTags: ['fissure'],
    fissureReclose: { chance: 0.6, times: 3, interval: 0.9, damageScale: 0.7 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  orbital_fault: {
    id: 'orbital_fault', name: 'Orbital Fault',
    description: 'The crack abandons the straight tear and RINGS AROUND YOU: aim farther for a'
      + ' wider ring, and extra fissures lay CONCENTRIC rings. Tethered Orbit for the ground'
      + ' itself.',
    color: '#c8a8e8', requiresTags: ['fissure'],
    fissurePath: { kind: 'orbit' },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  widening_fault: {
    id: 'widening_fault', name: 'Widening Fault',
    description: 'Out of the impact point the crack UNWINDS, a spiral sweeping the whole yard'
      + ' on its way wide. Extra fissures rotate in as further arms.',
    color: '#b8a8d8', requiresTags: ['fissure'],
    fissurePath: { kind: 'spiral', turns: 1.6 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  serpentine_fault: {
    id: 'serpentine_fault', name: 'Serpentine Fault',
    description: 'The tear WEAVES around its bearing, a serpent of broken ground covering a'
      + ' wider swathe than any straight crack could.',
    color: '#a8c89a', requiresTags: ['fissure'],
    fissurePath: { kind: 'serpent', waveDeg: 38 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  faultfinder: {
    id: 'faultfinder', name: 'Faultfinder',
    description: 'Strikes with this skill have a 25% chance to PROJECT a fissure out along the'
      + ' blow at 60% damage. The gem also hands the skill the FISSURE tag, so the crack gems'
      + ' (volatility, arming, warps, recloses) socket in beside it and ride every lash.',
    color: '#c89a5e', requiresTags: ['melee'],
    grantsTags: ['fissure'],
    meleeFissure: { chance: 0.25, length: 300, speed: 520, radius: 26, linger: 2.4, damageScale: 0.6 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  // --- The trigger meta-gems (the "Cast on X" family) --------------------------
  // SupportDef.trigger converts the host: its key only ARMS/DISARMS it, and
  // the skill casts itself when the owner's play raises the event. The
  // golden rules (one cast per event round-robin down the bar, cast-time
  // gate, chain-depth cap, ICDs, honest costs) live in TRIGGER_CFG and
  // world.rollTriggers — see THE TRIGGER DISCIPLINE in engine/skills.ts.
  cast_on_crit: {
    id: 'cast_on_crit', name: 'Cast on Critical Strike',
    description: 'This skill is no longer yours to press: its slot only arms and disarms it.'
      + ' While armed, your critical strikes with OTHER skills have a 70% chance to cast it for'
      + ' you, triggers taken in turn down the bar, paying its full mana cost, on a brief'
      + ' internal cooldown. Quick skills only (0.5s base or less); heavier casts want'
      + ' Sequenced Invocation beside this.',
    color: '#e8c84a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'crit', chance: 0.7, icd: 0.15 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.06)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_damage_taken: {
    id: 'cast_on_damage_taken', name: 'Cast when Damage Taken',
    description: 'Pain arms this skill: once you have taken 30% of your maximum life (hits and'
      + ' DoT alike), the next wound casts it for you, aimed back at whatever hurt you. Its'
      + ' slot only arms and disarms it. Quick skills only, unless Sequenced Invocation rides'
      + ' beside it.',
    color: '#d87a6a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'damageTaken', chance: 1, icd: 0.25, lifeFrac: 0.3 },
    mods: [],
    perLevel: [mod('triggerThreshold', 'flat', -0.02)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_channeling: {
    id: 'cast_while_channeling', name: 'Cast while Channelling',
    description: 'Socket this into a QUICK skill and it fires itself on a steady beat while you'
      + ' hold ANY channel; its slot only arms and disarms it. Channels themselves refuse this'
      + ' gem: a channel cannot channel.',
    color: '#8ab8e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelBeat', chance: 1, icd: 0.35 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_flawless: {
    id: 'cast_on_flawless', name: 'Cast on Flawless',
    description: 'Socket this into a QUICK skill and every PERFECT or FLAWLESS press you land'
      + ' casts it for you. Pressing it by hand only arms and disarms it.',
    color: '#ffd700', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'flawless', chance: 1 },
    mods: [],
    perLevel: [mod('damage', 'more', 0.04)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_guarding: {
    id: 'cast_while_guarding', name: 'Cast while Guarding',
    description: 'Socketed into a QUICK skill, this casts itself on a slow, steady beat while'
      + ' you hold any guard. Pressing it by hand only arms and disarms it. This is the'
      + ' automated lane; Guarded Casting is the deliberate one.',
    color: '#a8c090', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    // No spec icd: the LARGE default clock (TRIGGER_CFG.icd.guardBeat)
    // rules, so the whole lane retunes from one place.
    trigger: { on: 'guardBeat', chance: 1 },
    mods: [],
    perLevel: [mod('damage', 'more', 0.04)],
    weight: 4, minDropLevel: 12,
  },
  cast_on_overcharge: {
    id: 'cast_on_overcharge', name: 'Cast on Overcharge',
    description: 'Every overcharge STAGE you bank casts this skill for you: the payout lands as'
      + ' you climb, not only at release. Pressing it by hand only arms and disarms it. Quick'
      + ' skills only, unless Sequenced Invocation rides beside it.',
    color: '#ffd24a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'overchargeStage', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_high_roll: {
    id: 'cast_on_high_roll', name: 'Cast on High Roll',
    description: 'When a hit of yours rolls in the top 12% of its damage range, this skill'
      + ' casts itself at the victim, paying its costs in full. Pressing it by hand only arms'
      + ' and disarms it. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#ffe97a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'highRoll', chance: 1, icd: 0.25 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  culmination: {
    id: 'culmination', name: 'Culmination',
    description: 'Whenever a channel or gather of yours runs to completion, a capped hold'
      + ' reaching its ceiling or a gauge filled to the brim, this skill casts itself free at'
      + ' your aim. Interrupted gathers trigger nothing. Pressing it by hand only arms and'
      + ' disarms it.',
    color: '#e8d88a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelFinish', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 12,
  },
  culminant_frenzy: {
    id: 'culminant_frenzy', name: 'Culminant Frenzy',
    description: 'Every channel this gem rides that runs to completion banks 2 Frenzy charges,'
      + ' up to 6. An interrupted channel banks nothing.',
    color: '#e8a84a', requiresTags: ['channel'],
    chargeGain: [{ charge: 'frenzy', amount: 2, max: 6, on: 'channelFinish' }],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.5)],
    weight: 4,
  },
  gathered_casting: {
    id: 'gathered_casting', name: 'Gathered Casting',
    description: 'This skill becomes a GATHER: hold to bank its cast time into a bar that keeps'
      + ' between holds, then release the whole spell on your own schedule at a power matching'
      + ' the fill. The bank runs to half again the normal cast, mana is paid as you pour, and'
      + ' haste fills it faster. Channels, instants and quick flicks refuse the conversion.'
      + ' A banked spell may be loosed even while the skill\'s cooldown turns; fresh banking'
      + ' waits out the clock.',
    color: '#c8b8e8', excludeTags: ['channel', 'guard', 'instant', 'movement', 'aura', 'overcharge'],
    gather: { premium: 1.5, minRelease: 0.15, releaseOnCooldown: true },
    mods: [],
    perLevel: [mod('brimFill', 'increased', 0.04)],
    weight: 4, minDropLevel: 12,
  },
  sequenced_invocation: {
    id: 'sequenced_invocation', name: 'Sequenced Invocation',
    description: 'Rides beside a trigger gem and lifts its cast-time gate: heavy spells may'
      + ' answer the trigger as full casts in succession, feet planted for the bar (castMove'
      + ' and mobility investments still let you walk it). With no trigger gem beside it, this'
      + ' does nothing.',
    color: '#b8a8e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    triggerPermit: true,
    mods: [],
    perLevel: [mod('castSpeed', 'increased', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  // The AILMENT-POWER trio: laying the status BANKS power into the gem;
  // at the threshold the next application fires the socketed skill and the
  // bank begins anew. Leveling erodes the threshold (triggerPower).
  cast_on_ignition: {
    id: 'cast_on_ignition', name: 'Cast on Ignition',
    description: 'Every third burn you set casts this skill for you, and the count then begins'
      + ' anew. Pressing it by hand only arms and disarms it. Quick skills only, unless'
      + ' Sequenced Invocation rides beside it.',
    color: '#ff9a4a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'burn', power: 3, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.25)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_poison: {
    id: 'cast_on_poison', name: 'Cast on Poison',
    description: 'Every fifth poison you lay casts this skill for you, and the count then'
      + ' begins anew. Pressing it by hand only arms and disarms it. Quick skills only, unless'
      + ' Sequenced Invocation rides beside it.',
    color: '#7ec850', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'poison', power: 5, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.4)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_bleed: {
    id: 'cast_on_bleed', name: 'Cast on Laceration',
    description: 'Each fourth bleed you open casts this skill for you, and the count then'
      + ' begins anew. Pressing it by hand only arms and disarms it. Quick skills only, unless'
      + ' Sequenced Invocation rides beside it.',
    color: '#b03030', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'bleed', power: 4, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.3)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_block: {
    id: 'cast_on_block', name: 'Cast on Block',
    description: 'Every hit you BLOCK, by raised shield, passive block or parry, casts this'
      + ' skill for you, aimed back at whoever swung. Pressing it by hand only arms and disarms'
      + ' it. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#8ab8d8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'block', chance: 1, icd: 0.5 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_kill: {
    id: 'cast_on_kill', name: 'Cast on Kill',
    description: 'Every kill your own blows take casts this skill for you where the victim'
      + ' fell. Pressing it by hand only arms and disarms it. Quick skills only, unless'
      + ' Sequenced Invocation rides beside it.',
    color: '#c8a0e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'kill', chance: 1, icd: 0.4 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },

  // --- The status-puppeteer gems ------------------------------------------------
  carrier_strain: {
    id: 'carrier_strain', name: 'Carrier Strain',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have a 30% chance to carry one random affliction off the'
      + ' victim to its nearest untouched neighbor, at three-quarter strength with its'
      + ' remaining duration intact.',
    color: '#a0c878',
    spreadOnHit: { chance: 0.3, radius: 200, strengthScale: 0.75, duration: 'remaining' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  final_bloom: {
    id: 'final_bloom', name: 'Final Bloom',
    requiresMechanisms: ['affliction'],
    description: 'DoTs this skill lays have a 60% chance to propagate: when the afflicted dies'
      + ' still carrying one, it jumps to nearby kin, and can keep jumping from death to death.',
    color: '#78c878',
    mods: [mod('dotPropagates', 'flat', 0.6)],
    perLevel: [mod('dotPropagates', 'flat', 0.1)],
    weight: 5,
  },
  load_bearing_flaw: {
    id: 'load_bearing_flaw', name: 'Structural Flaw',
    description: 'This skill\'s constructs are built wrong on purpose: your own hits demolish'
      + ' them at four times the rate, and each one detonates in a blast as it dies, whether'
      + ' broken, shattered, evicted or expired.',
    // Construct-GENERIC: breakableGraft reads the deployed object, whatever
    // its family — the 'construct' capability tag (folded onto every
    // construct delivery at registry load) is the honest gate. dropTags
    // keeps the gem's DROP identity with the totem/trap/mine crowd.
    color: '#c8b090', requiresTags: ['construct'],
    dropTags: ['totem', 'trap', 'mine'],
    breakableGraft: {
      ownerMult: 4,
      deathBurst: { radius: 100, fraction: 1.1 },
    },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  unmoored: {
    id: 'unmoored', name: 'Unmoored',
    description: 'Constructs of this skill stand free of the earth: they gain weight and join'
      + ' the mass fabric, so shoves move them, slams carry them, and wall impacts wound them.'
      + ' Push your own construct into the fray; anything strong enough can push it back out.',
    // THE MASS GRAFT (2026-07-22, the user's construct-mass design): the
    // baseline construct stays anchored with NO mass-like stat — this
    // graft is the ONE door into the mass fabric, and 'construct:massed'
    // (SUPPORT_MECHANISMS) lets future collision-payload gems refuse until
    // it stands beside them (self-lifting, the Forking-lifts-Lineage
    // shape). Weight 6: the player's ~1 shoves it barely; invested
    // shoveAuthority/heft moves it with intent; a colossus bowls it.
    color: '#a89078', requiresTags: ['construct'],
    dropTags: ['totem', 'trap', 'mine'],
    massGraft: { weight: 6 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },

  // --- The impale gems ------------------------------------------------------------
  skewering_blows: {
    id: 'skewering_blows', name: 'Skewering Blows',
    description: 'Attacks with this skill leave steel behind: 20% of their physical damage'
      + ' lodges as an impalement, and the next hit the victim takes drives it through as its'
      + ' own separate blow.',
    color: '#c8ccd8', requiresTags: ['attack'],
    mods: [mod('impalePower', 'flat', 0.2)],
    perLevel: [mod('impalePower', 'flat', 0.04)],
    weight: 6,
  },

  // --- The hex-delivery gems ------------------------------------------------------
  curse_on_hit: {
    id: 'curse_on_hit', name: 'Hexbrand',
    description: 'The socketed curse stops being a cast: its button now draws or sheathes it,'
      + ' and while drawn it reserves a quarter of your mana. Every top-level hit you land also'
      + ' strikes the victim with the whole curse at 30% of its roll, statuses and ruptures'
      + ' included.',
    color: '#b06bd4', requiresTags: ['curse'],
    curseOnHit: { damageScale: 0.3, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 4, minDropLevel: 8,
  },

  // --- The retaliation gems (the greatshield-and-poke kit) ----------------------
  answering_steel: {
    id: 'answering_steel', name: 'Answering Steel',
    description: 'Every blow this guard blocks banks a Riposte charge, up to 3, fading once out'
      + ' of combat. It also grants the Riposte Thrust order: spend one charge for a narrow,'
      + ' vicious thrust over the shield rim.',
    color: '#d8e8f8', requiresTags: ['guard'],
    chargeGain: [{ charge: 'riposte', amount: 1, max: 3, on: 'block' }],
    meta: { skillId: 'riposte_thrust', label: 'Riposte' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  reckless_rampart: {
    id: 'reckless_rampart', name: 'Reckless Rampart',
    description: 'This guard leans forward: 60% increased shield-bash power, paid for with 25%'
      + ' reduced guard strength.',
    color: '#d8a878', requiresTags: ['guard'],
    mods: [mod('bashPower', 'increased', 0.6), mod('guardStrength', 'increased', -0.25)],
    perLevel: [mod('bashPower', 'increased', 0.1)],
    weight: 5,
  },
  answering_wall: {
    id: 'answering_wall', name: 'Answering Wall',
    description: 'One gem, two reads: a guard with no bash of its own gains a release-blow at'
      + ' 55% of remaining shield with a 25% chance to stun, while a guard that already answers'
      + ' gains 40% increased bash power instead. Either way the arming line drops by a fifth,'
      + ' so the bash readies sooner; the tic on the guard bar shows it.',
    color: '#c8b088', requiresTags: ['guard'],
    // THE ANSWERING GATE (2026-08-03, her word): the tag says the theme,
    // the MECHANISM says the truth — the gem demands a real payout moment
    // (stance release, charge arrival, leap landing, construct death,
    // shell drop), so a guard-tagged charge bank (magma_ward) refuses
    // structurally and re-fits the day its def grows a real release.
    requiresMechanisms: ['guard'],
    // The graft is read ONLY when the host guard lacks an innate bash
    // (guardBashSpec: innate wins) — the stat mods land either way, which
    // is the whole dual-use contract: no second gem, no duplicate.
    guardBash: { mult: 0.55, range: 70, arcDeg: 110, stunChance: 0.25, knockback: 50 },
    mods: [mod('bashPower', 'increased', 0.4), mod('bashFloor', 'increased', -0.2)],
    perLevel: [mod('bashPower', 'increased', 0.06)],
    weight: 5,
  },
  hollow_answer: {
    id: 'hollow_answer', name: 'Hollow Answer',
    description: 'Inverted bash: the release measures what the guard has LOST, so a battered'
      + ' guard lands its missing shield as the blow and a pristine guard says nothing. The'
      + ' arming line mirrors to the top of the bar. 25% increased bash power.',
    color: '#9a8ab8', requiresTags: ['guard'],
    // bashInvert is a STAT on purpose — a passive node or an affix can
    // grant the same inversion later without new machinery.
    mods: [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)],
    perLevel: [mod('bashPower', 'increased', 0.05)],
    weight: 5,
  },
  stalwart_rhythm: {
    id: 'stalwart_rhythm', name: 'Stalwart Rhythm',
    description: 'Blocks made by this guard keep time: each one advances every other cooldown'
      + ' of yours by one second.',
    color: '#8ab8d8', requiresTags: ['guard'],
    mods: [mod('proc_stalwart_rhythm', 'flat', 1)],
    perLevel: [mod('blockValue', 'flat', 2)],
    weight: 5,
  },

  // --- The offering ecology -----------------------------------------------------
  hiveborn: {
    id: 'hiveborn', name: 'Hiveborn',
    description: 'Each corpse this skill consumes crawls back out as a legless thing dragging'
      + ' itself on its arms, serving you for 12 seconds; up to 6 can serve at once.',
    color: '#a8c860', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'zombie_crawler', perCorpse: true, duration: 12, max: 6 },
    mods: [],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },
  ghostly_communion: {
    id: 'ghostly_communion', name: 'Ghostly Communion',
    description: 'Consuming a corpse with this skill raises two phantasms for 8 seconds'
      + ' regardless of the body, up to 4 at once. The price: 5 seconds of added cooldown.',
    color: '#9ad8e8', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'phantasm', count: 2, duration: 8, max: 4 },
    mods: [mod('addedCooldown', 'flat', 5)],
    weight: 5,
  },
  gift_of_the_choir: {
    id: 'gift_of_the_choir', name: 'Gift of the Choir',
    description: 'Each minion of this skill is born with one random weak aura, shared with'
      + ' allies around it: +1.2 life regeneration, 6% increased attack and cast speed, or +25'
      + ' armor.',
    color: '#f8e8c8', requiresTags: ['summon'],
    minionAuraPool: [
      { radius: 130, allyMods: [mod('lifeRegen', 'flat', 1.2)] },
      { radius: 130, allyMods: [mod('attackSpeed', 'increased', 0.06), mod('castSpeed', 'increased', 0.06)] },
      { radius: 130, allyMods: [mod('armor', 'flat', 25)] },
    ],
    mods: [],
    weight: 5,
  },
  legion_doctrine: {
    id: 'legion_doctrine', name: 'Legion Doctrine',
    description: '30% more maximum minions for this skill.',
    color: '#b06bd4', requiresTags: ['summon'],
    mods: [mod('minionMaxCount', 'more', 0.3)],
    perLevel: [mod('minionMaxCount', 'more', 0.04)],
    weight: 5,
  },
  fresh_ranks: {
    id: 'fresh_ranks', name: 'Fresh Ranks',
    description: 'This skill\'s minions fight furiously while newly raised: 25% increased'
      + ' damage and 15% increased movement speed for their first 6 seconds.',
    color: '#8ae06a', requiresTags: ['summon'],
    spawnBuff: {
      type: 'buff', id: 'fresh_ranks', duration: 6,
      mods: [mod('damage', 'increased', 0.25), mod('moveSpeed', 'increased', 0.15)],
    },
    mods: [],
    weight: 6,
  },

  // (The Conjurer's wrapper family is RETIRED: supports forward to minions
  // DIRECTLY now — socket the real Splitting into the summon skill and the
  // archer's arrows split. See world.forwardSummonSockets.)
  resonance: {
    id: 'resonance', name: 'Resonance',
    description: 'While Resonance rides a summon skill, every support socketed beside it is'
      + ' forwarded into the minions\' own skills wherever it fits. Forwarded gems still bill'
      + ' their costs to your cast.',
    color: '#9a7ee8', requiresTags: ['summon', 'minion'],
    resonance: true,
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 6,
  },
  blood_toll: {
    id: 'blood_toll', name: 'Blood Toll',
    description: 'Each cast consumes your nearest minion, gaining 0.6% more damage for that'
      + ' cast per point of the minion\'s remaining life.',
    color: '#c02848',
    sacrifice: { radius: 260, dmgPerLife: 0.006 },
    mods: [],
    weight: 4,
  },
  dominating_blow: {
    id: 'dominating_blow', name: 'Dominating Blow',
    description: 'Kills with this skill have a 25% chance to raise the slain as your thrall for'
      + ' 12 seconds, up to 3 at once; bosses refuse.',
    color: '#e8d44a', requiresTags: ['attack'],
    dominate: { chance: 0.25, duration: 12, max: 3 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  // --- Cursed-ground variants ---------------------------------------------------
  maddening_miasma: {
    id: 'maddening_miasma', name: 'Maddening Miasma',
    description: 'Anything that stands in this skill\'s lingering ground for 6 accumulated'
      + ' seconds is driven MAD, turning to lash at whatever is nearest, friend or foe.',
    color: '#d84a9a', requiresTags: ['duration'],
    madden: { after: 6 },
    mods: [],
    weight: 4,
  },
  pulsing_hex: {
    id: 'pulsing_hex', name: 'Pulsing Hex',
    description: 'This skill\'s lingering ground SNAPS a hex pulse every second across itself.',
    color: '#b06bd4', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneEmit: { skillId: 'hex_pulse', interval: 1 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  creeping_fumes: {
    id: 'creeping_fumes', name: 'Creeping Fumes',
    description: 'Lingering ground from this skill turns to fume: its ticks bite only what has'
      + ' breathed inside for half a second, and stepping out clears the lungs. Whatever stays'
      + ' takes 30% more damage.',
    color: '#9ab86a', requiresTags: ['duration'],
    exposure: { after: 0.5 },
    mods: [mod('damage', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  overgrowth: {
    id: 'overgrowth', name: 'Overgrowth',
    description: 'This skill\'s lingering ground grows steadily wider for as long as it lives,'
      + ' and cascade ripples swell with it. 15% less damage; the trade is acreage.',
    color: '#6aa84a', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneGrow: 30,
    mods: [mod('damage', 'more', -0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },

  // --- Size-envelope gems: ground that BREATHES (SupportDef.zoneSizeOver) ---
  // Duration-normalized, curve-shaped radius walks — the graft wins over any
  // innate envelope, and duration mods reshape the PACE, never the journey.
  ebbing_ground: {
    id: 'ebbing_ground', name: 'Ebbing Ground',
    description: 'Lingering ground from this skill opens 30% wider than normal, then shrinks to'
      + ' nothing across its duration, collapsing fastest at the end. It deals 25% more damage;'
      + ' duration mods set the pace of the closing.',
    color: '#7a9a52', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 1.3, to: 0, curve: 'quadIn' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.04)],
    weight: 5,
  },
  blooming_ground: {
    id: 'blooming_ground', name: 'Blooming Ground',
    description: 'Starting at a quarter of its reach, this skill\'s lingering ground blooms'
      + ' quickly past full size to 140% by the end of its duration. 15% less damage, and'
      + ' whatever bursts on expiry bursts at the full spread.',
    color: '#8ab86a', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 0.25, to: 1.4, curve: 'quadOut' },
    mods: [mod('damage', 'more', -0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  tidal_ground: {
    id: 'tidal_ground', name: 'Tidal Ground',
    description: 'One full tide per life: this skill\'s lingering ground swells from half its'
      + ' reach to 150% at mid-duration, then ebbs home to half by the end. What the water'
      + ' leaves, it returns to cover.',
    color: '#6a9a8a', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 0.5, to: 1.5, curve: 'breath' },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 4,
  },

  // --- Brim gems: the persistent gauge, retuned (ChannelSpec.brim) ----------
  stillwater_discipline: {
    id: 'stillwater_discipline', name: 'Stillwater Discipline',
    description: 'This channel\'s gauge no longer decays: whatever you bank, it keeps, however'
      + ' long you carry it. The stored power is 10% reduced.',
    color: '#7ab0c8', requiresTags: ['channel'],
    mods: [mod('brimDecay', 'increased', -1), mod('brimPower', 'increased', -0.1)],
    perLevel: [mod('brimPower', 'increased', 0.02)],
    weight: 5,
  },
  overbrim: {
    id: 'overbrim', name: 'Overbrim',
    description: 'This channel\'s gauge pays out with 30% increased power but fills at a 20%'
      + ' reduced rate: every banked second is worth more and takes longer to earn.',
    color: '#c8a85a', requiresTags: ['channel'],
    mods: [mod('brimPower', 'increased', 0.3), mod('brimFill', 'increased', -0.2)],
    perLevel: [mod('brimPower', 'increased', 0.03)],
    weight: 5,
  },

  // --- Reservation & resource economies ------------------------------------------
  fleeting_devotion: {
    id: 'fleeting_devotion', name: 'Fleeting Devotion',
    description: 'This aura no longer reserves mana: it pays its cost and burns for 12 seconds'
      + ' instead. A separate cap bounds how many timed auras may burn at once.',
    color: '#e8d44a', requiresTags: ['aura'],
    auraDuration: { seconds: 12 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 4,
  },
  blood_pact: {
    id: 'blood_pact', name: 'Blood Pact',
    description: 'This aura reserves LIFE instead of mana: the ceiling comes off your blood,'
      + ' not your thoughts.',
    color: '#c02848', requiresTags: ['aura'],
    reserveLife: true,
    mods: [],
    weight: 4,
  },
  dominion_tithe: {
    id: 'dominion_tithe', name: 'Dominion Tithe',
    description: 'This skill gains added damage equal to 5% of your reserved mana. Locked power'
      + ' is still power.',
    color: '#7a9aff', requiresTags: ['spell'],
    mods: [mod('reservedDamage', 'flat', 0.05)],
    perLevel: [mod('reservedDamage', 'flat', 0.008)],
    weight: 5,
  },
  archons_wellspring: {
    id: 'archons_wellspring', name: "Archon's Wellspring",
    requiresMechanisms: ['strikes'],
    description: 'This skill gains added damage equal to 4% of your maximum mana.',
    color: '#4a78d8', requiresTags: ['spell'],
    mods: [mod('maxManaDamage', 'flat', 0.04)],
    perLevel: [mod('maxManaDamage', 'flat', 0.006)],
    weight: 5,
  },
  slow_brew: {
    id: 'slow_brew', name: 'Slow Brew',
    description: 'Time banks a Brew charge every 2.5 seconds, up to 5. This skill\'s casts'
      + ' drink the whole pot for 12% more damage per charge; an empty pot casts plain.',
    color: '#c8a848',
    chargeGain: [{ charge: 'brew', amount: 1, max: 5, on: 'second', everySeconds: 2.5 }],
    chargeCost: { charge: 'brew', amount: 'all', optional: true, damagePerCharge: 0.12 },
    mods: [],
    weight: 5,
  },

  // --- Cleric echoes, tradeoffs & textures ---------------------------------------
  consecrated_echo: {
    id: 'consecrated_echo', name: 'Consecrated Echo',
    description: 'This warcry leaves healing ground where it lands: consecrated earth that'
      + ' steadily mends allies standing in it.',
    color: '#8ae0a8', requiresTags: ['warcry'],
    healField: { amount: 6 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.08)],
    weight: 5,
  },
  echoing_might: {
    id: 'echoing_might', name: 'Echoing Might',
    description: 'Each landed hit with this skill grants added physical damage equal to 30% of'
      + ' what it dealt, for 4 seconds. The previous blow feeds the next.',
    color: '#e8d44a', requiresTags: ['attack'],
    mods: [mod('echoMight', 'flat', 0.3)],
    perLevel: [mod('echoMight', 'flat', 0.04)],
    weight: 5,
  },
  hallowed_flames: {
    id: 'hallowed_flames', name: 'Hallowed Flames',
    requiresMechanisms: ['strikes'],
    description: 'Melee hits with this skill have a 30% chance to SCORCH: a short searing burn,'
      + ' refreshed on hit, independent of ignite.',
    color: '#ffb056', requiresTags: ['melee'],
    mods: [mod('apply_scorch', 'flat', 0.3, ['melee'])],
    perLevel: [mod('statusMagnitude', 'increased', 0.06, ['fire'])],
    weight: 6,
  },
  // THE DEFENSIVE GEARING AXIS debut (GLOBAL_SUPPORT_STATS — engine/skills):
  // the first gem that armors the CHARACTER, not the cast. Its mods ride
  // the equip-global fold while the host sits on the bar — socket it into
  // an aura and forget it; socket it into a summon and the forwarded copy
  // armors the court (each minion's own equip fold reads it).
  warding_flesh: {
    id: 'warding_flesh', name: 'Warding Flesh',
    description: 'Socketed into a standing working (an aura you keep lit, a court you keep'
      + ' raised, a stance you hold), the body itself thickens: +40 armor and 3 life'
      + ' regenerated per second, worn globally while the engagement stands. Socketed into a'
      + ' summon, the court wears it too.',
    color: '#b8a888',
    // THE ENGAGEMENT GATE (requiresMechanisms — a lever, not a law): the
    // worn value demands a host the player actually keeps LIT (aura /
    // summon / guard / minion), so global gems stay MODIFIERS on real
    // commitments, never free stat sticks in a dead bar slot. Loosen or
    // drop the mechanism here if the axis should ever open wider.
    requiresMechanisms: ['engagement'],
    mods: [
      mod('armor', 'flat', 40),
      mod('lifeRegen', 'flat', 3),
    ],
    perLevel: [mod('armor', 'flat', 12), mod('lifeRegen', 'flat', 0.8)],
    weight: 6,
  },

  monolith: {
    id: 'monolith', name: 'Monolith',
    description: 'The heavy trade: 30% increased area and 25% more area damage, but 30% less'
      + ' attack and cast speed.',
    color: '#8a8a9a',
    mods: [
      mod('aoeRadius', 'increased', 0.3),
      mod('damage', 'more', 0.25, ['aoe']),
      mod('attackSpeed', 'more', -0.3),
      mod('castSpeed', 'more', -0.3),
    ],
    weight: 6,
  },
  measured_blows: {
    id: 'measured_blows', name: 'Measured Blows',
    description: 'The clock trade: 35% more damage, but the skill gains a 1.2 second cooldown (still reducible; charges and founts pace around it).',
    color: '#b8b8c8',
    mods: [mod('damage', 'more', 0.35), mod('addedCooldown', 'flat', 1.2)],
    weight: 6,
  },
  point_blank: {
    id: 'point_blank', name: 'Point Blank',
    description: 'Up to 50% more damage at touch range, tapering to nothing at distance.',
    color: '#e07050', requiresTags: ['projectile', 'attack'],
    mods: [mod('proximityDamage', 'flat', 0.5)],
    perLevel: [mod('proximityDamage', 'flat', 0.06)],
    weight: 6,
  },
  pulsating_missiles: {
    id: 'pulsating_missiles', name: 'Pulsating Missiles',
    description: 'This skill\'s projectiles BREATHE: their hit radius swells and shrinks ±40%'
      + ' in flight.',
    color: '#9ad8e8', requiresTags: ['projectile'],
    mods: [mod('projPulse', 'flat', 0.4)],
    perLevel: [mod('projPulse', 'flat', 0.05)],
    weight: 6,
  },

  // --- The chaos & doom suite -----------------------------------------------------
  withering_agony: {
    id: 'withering_agony', name: 'Withering Agony',
    requiresMechanisms: ['strikes'],
    description: 'Chaos hits with this skill have a 40% chance to inflict Withering Agony, a'
      + ' damage-over-time rot that RAMPS: quiet when it lands, savage by its end.',
    color: '#8a5ad8', requiresTags: ['chaos'],
    mods: [mod('apply_wither_agony', 'flat', 0.4, ['chaos'])],
    perLevel: [mod('statusMagnitude', 'increased', 0.06, ['chaos'])],
    weight: 5,
  },
  creeping_doom: {
    id: 'creeping_doom', name: 'Creeping Doom',
    requiresMechanisms: ['strikes'],
    description: 'Chaos hits with this skill have a 15% chance to apply a weak DOOM. Repeated'
      + ' applications pump the armed keg, and it culls at lethal.',
    color: '#7a48c8', requiresTags: ['chaos'],
    mods: [mod('apply_doom', 'flat', 0.15, ['chaos'])],
    perLevel: [mod('apply_doom', 'flat', 0.02, ['chaos'])],
    weight: 5,
  },
  lingering_doom: {
    id: 'lingering_doom', name: 'Lingering Doom',
    requiresMechanisms: ['status:doom'],
    description: 'Your Dooms also TICK: 35% of the armed payload burns as chaos damage over'
      + ' time while the fuse runs, and the keg still culls at lethal.',
    color: '#a848a8', requiresTags: ['chaos'],
    mods: [mod('doomDot', 'flat', 0.35)],
    perLevel: [mod('doomDot', 'flat', 0.05)],
    weight: 5,
  },

  // CRIT-GATED gain (ProcDef.crit): rage from this skill's critical hits —
  // stacks independently with any passive's crit-fury (distinct proc ids
  // are distinct dice, by construction).
  wrathful_edge: {
    id: 'wrathful_edge', name: 'Wrathful Edge',
    requiresMechanisms: ['strikes'],
    description: 'Critical hits with this skill grant a Rage charge (50% chance).',
    color: '#e04030', requiresTags: ['attack'],
    mods: [mod('proc_crimson_edge', 'flat', 0.5)],
    perLevel: [mod('proc_crimson_edge', 'flat', 0.08)],
    weight: 6,
  },

  // CHANNEL-FED charges (ChargeGainSpec 'channelSecond'): holding the
  // socketed channel banks Frenzy on a metronome — the user-asked shape.
  grace_of_dawn: {
    id: 'grace_of_dawn', name: 'Grace of Dawn',
    description: 'While channeling this skill, gain a Frenzy charge every 3 seconds held, up to'
      + ' 5.',
    color: '#8ae06a', requiresTags: ['channel'],
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 5, on: 'channelSecond', everySeconds: 3 }],
    mods: [],
    weight: 6,
  },

  // BROODCLUTCH (SupportDef.brood): this skill's ailments HATCH — every
  // point of tick damage has a 2% chance to birth a broodling serving you
  // (potency IS fecundity; capped so the bloom never becomes a bomb).
  broodclutch: {
    id: 'broodclutch', name: 'Broodclutch',
    description: 'Damage over time from this skill\'s ailments has a 2% chance per point dealt'
      + ' to hatch a broodling, which fights for 10 seconds; up to 4 may live at once.',
    color: '#7ec850', requiresTags: ['chaos'],
    brood: { monsterId: 'broodling', perDamage: 0.02, duration: 10, max: 4 },
    mods: [],
    perLevel: [mod('statusMagnitude', 'increased', 0.05)],
    weight: 5,
  },

  // COMMUNION OF FLESH (the ebb-and-flow summoner): the flock's blows bank
  // Communion on YOU — each charge feeds your hand and theirs, and any
  // spender graft can burn the bank for its payoff. Front-line summoning.
  communion_of_flesh: {
    id: 'communion_of_flesh', name: 'Communion of Flesh',
    requiresMechanisms: ['strikes'],
    description: 'When this skill\'s minions land blows, they have a 35% chance to bank a'
      + ' Communion charge on you; each charge empowers both you and the flock.',
    color: '#b06bd4', requiresTags: ['summon'],
    mods: [mod('proc_communion_tithe', 'flat', 0.35)],
    perLevel: [mod('proc_communion_tithe', 'flat', 0.05)],
    weight: 5,
  },

  // LAST RITES (the raging-spirits lever + death heals): expiry counts as
  // DEATH, and every death mends the flock — the swarm that heals itself
  // by dying on schedule.
  last_rites: {
    id: 'last_rites', name: 'Last Rites',
    description: 'This skill\'s minions treat expiry as death, and each death heals your other minions for 20% of the deceased\'s life.',
    color: '#9a86e8', requiresTags: ['summon'],
    mods: [mod('minionDeathHeal', 'flat', 0.2), mod('minionExpiryIsDeath', 'flat', 1)],
    perLevel: [mod('minionDeathHeal', 'flat', 0.03)],
    weight: 5,
  },

  // STORED VERDICT (the charge-banked meta): real uses of the host bank
  // Verdict; the granted META-ACTION spends three for a free nova.
  stored_verdict: {
    id: 'stored_verdict', name: 'Stored Verdict',
    description: 'Each use of this skill banks a Verdict charge, up to 3. Grants the Verdict'
      + ' meta-action: spend all three for a free consecrated nova.',
    color: '#e8d44a',
    chargeGain: [{ charge: 'verdict', amount: 1, max: 3, on: 'use' }],
    meta: { skillId: 'verdict_release', label: 'Verdict' },
    mods: [],
    weight: 5,
  },

  // SUMMON PHANTASM (the PPM discipline in gem form): the socketed skill's
  // hits conjure brief raging spirits at ~10 per minute — a strobing
  // Barrage and a glacial maul FEEL different but spend the same budget.
  // Socketed into a SUMMON skill, the minions' own blows do the conjuring
  // for their owner (proc minionCarry — the minion-support seam).
  summon_phantasm: {
    id: 'summon_phantasm', name: 'Summon Phantasm',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill summon a brief phantasm (~10/minute, up to 5). In a summon skill, your minions\' hits conjure them for you.',
    color: '#9ad8e8',
    mods: [mod('proc_summon_phantasm', 'flat', 1)],
    perLevel: [mod('proc_summon_phantasm', 'flat', 0.15)], // rate multiplier
    weight: 6,
  },

  // THE CLUTCH FABRIC's gem half (engine/clutch.ts — SupportDef.birth):
  // the host's LANDINGS bear. Distinct from Summon Phantasm's hit-proc by
  // the whole premise: no victim is needed — every place the delivery
  // RESOLVES (each storm strike's ring, a flight's end however it ends,
  // the aimed ground) claws a broodling out of the dirt. The 'landing'
  // mechanism refuses hosts with nowhere to stand (auras, self-rites,
  // summons), and the refusal self-lifts by delivery shape, never a list.
  // THE SUPPORT BASE's debut chassis (engine/supportbase.ts — her ruling:
  // the gem as an ITEM BASE). Every copy is CUT AT THE VEIN — trigger ×
  // brood × clutch drawn once at the mint and fixed forever (the chase; a
  // support's own skill-rarity sibling). In every OTHER mannerism an
  // ordinary support: normal drop stream, normal pool row, normal socket
  // gesture, normal essence leveling. THE CANONICAL CUT (each axis's
  // FIRST row — steady/broodlings/single) is the census face the matrix
  // probes and the worn-graft default. The GATE READS THE CUT: every v0
  // trigger row is hit-fed, so a hitless host refuses whatever the roll —
  // and a future non-hit trigger row self-lifts that refusal by data.
  teeming_vein: {
    id: 'teeming_vein', name: 'Teeming Vein',
    description: 'A vein of living stone, cut once at the strike that freed it: this skill\'s'
      + ' landed blows FEED the cut — steadily, by chance, or filling a gauge — and the vein'
      + ' answers with a brood of its rolled kind. No two cuts need agree.',
    color: '#b8a86a', requiresTags: ['attack', 'spell'],
    grantsTags: ['minion'],
    rollBase: {
      kind: 'spawn',
      axes: [
        { id: 'trigger', rows: [
          { id: 'steady', weight: 2, line: 'every landed blow bears', every: true, requiresMechanisms: ['strikes'] },
          { id: 'gauge_quick', weight: 3, line: 'a gauge: every 9 landed blows bear', hits: 9, requiresMechanisms: ['strikes'] },
          { id: 'gauge_slow', weight: 2, line: 'a gauge: every 14 landed blows bear', hits: 14, requiresMechanisms: ['strikes'] },
          { id: 'chance', weight: 3, line: '12% of landed blows bear', pct: 0.12, requiresMechanisms: ['strikes'] },
        ] },
        { id: 'brood', rows: [
          { id: 'broodlings', weight: 2, line: 'broodlings — skittering hunters', monsterId: 'broodling' },
          { id: 'gnats', weight: 3, line: 'gnatlings — the cloud is the weapon', monsterId: 'gnatling' },
          { id: 'cinders', weight: 2, line: 'cinder sprites — motes of living flame', monsterId: 'cinder_sprite' },
          { id: 'grubs', weight: 2, line: 'marrowgrubs — they latch and chew', monsterId: 'marrowgrub' },
        ] },
        { id: 'clutch', rows: [
          { id: 'single', weight: 3, line: 'one at a time (up to 3 alive)', count: 1, cap: 3 },
          { id: 'pair', weight: 3, line: 'in pairs (up to 4 alive)', count: 2, cap: 4 },
          { id: 'brood4', weight: 1, line: 'in broods of four (up to 6 alive)', count: 4, cap: 6 },
        ] },
      ],
    },
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.08)],
    weight: 5, minDropLevel: 6,
  },

  broodbearer: {
    id: 'broodbearer', name: 'Broodbearer',
    requiresMechanisms: ['landing'],
    description: 'This skill\'s landings BEAR: where it resolves — each storm strike\'s ring, a'
      + ' flight\'s end however it ends, the aimed ground — a broodling claws out and hunts for'
      + ' you for 8 seconds, up to 2 alive. The blow needs no victim; the ground itself is the'
      + ' womb.',
    color: '#c08a5a', requiresTags: ['attack', 'spell'],
    grantsTags: ['minion'],
    birth: { type: 'birth', monsterId: 'broodling', duration: 8, cap: 2 },
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.08)],
    weight: 5, minDropLevel: 4,
  },

  // SAINTED ASH (the boss-viable on-kill shape): kills with the socketed
  // skill bloom into a consecrated burst. The engine's killProcOnHit rule
  // keeps it alive against bosses — on-kill rolls on plain hits vs elite
  // prey at a fraction, so the gem still matters when nothing dies.
  sainted_ash: {
    id: 'sainted_ash', name: 'Sainted Ash',
    requiresMechanisms: ['strikes'],
    description: 'Kills with this skill roll a 40% chance to bloom after a beat, healing allies'
      + ' and burning enemies in the circle. Hits against rare and boss enemies roll it too,'
      + ' and a summoned flock\'s kills bloom for the shepherd.',
    color: '#ffe8b0',
    mods: [mod('proc_sainted_ash', 'flat', 0.4)],
    perLevel: [mod('proc_sainted_ash', 'flat', 0.06)],
    weight: 6,
  },

  // THE HIT-TO-DOT CONVERSION AXIS (hitToAffliction — the wound is the
  // weapon): the blow forgoes its bite and the affliction drinks it back
  // amplified. Gated on the 'affliction' MECHANISM (the golden rule): the
  // host must fester — innately, or through an apply_<dot> gem beside it,
  // the door opening and closing with the composition.
  septic_bargain: {
    id: 'septic_bargain', name: 'Septic Bargain',
    description: 'The blow FORGOES its bite: this skill\'s hits deal no damage, and every'
      + ' damaging affliction they produce festers as if the blow had landed half again as'
      + ' hard. The wound is the weapon; it needs an affliction to carry it.',
    color: '#8aa050', requiresTags: ['attack', 'spell'],
    requiresMechanisms: ['affliction'],
    mods: [
      mod('hitToAffliction', 'flat', 1),
      mod('afflictionYield', 'flat', 0.5),
    ],
    perLevel: [mod('afflictionYield', 'flat', 0.08)],
    weight: 5,
  },

  // THE INTERACTION FABRIC, gem form: attacker-side per-stack scaling vs an
  // afflicted target (the generated damageVs_<status> family) — skill-local,
  // so only the socketed skill hunts the poisoned.
  opportunist: {
    id: 'opportunist', name: 'Opportunist',
    requiresMechanisms: ['strikes'],
    description: 'This skill deals 3% increased damage per stack of poison on the target.',
    color: '#7ec850',
    mods: [mod('damageVs_poison', 'flat', 0.03)],
    perLevel: [mod('damageVs_poison', 'flat', 0.005)],
    weight: 7,
  },

  nettles: {
    id: 'nettles', name: 'Nettles',
    description: 'While channeling or guarding, anything that strikes you takes 8 damage. Blocked hits prick too.',
    color: '#9ec83a', requiresTags: ['channel'],
    mods: [mod('channelThorns', 'flat', 8)],
    perLevel: [mod('channelThorns', 'flat', 5)],
    weight: 7,
  },

  eruption_cycle: {
    id: 'eruption_cycle', name: 'Eruption Cycle',
    description: 'While channeling, a fiery nova erupts around you every 2 seconds (faster with attack/cast speed), dealing 80% of the skill\'s damage plus added fire.',
    color: '#ff8a4a', requiresTags: ['channel'],
    mods: [
      mod('channelBurst', 'flat', 0.8),
      mod('addedFire', 'flat', 6),
    ],
    perLevel: [mod('channelBurst', 'flat', 0.12), mod('addedFire', 'flat', 2)],
    weight: 6,
  },

  channeled_tempest: {
    id: 'channeled_tempest', name: 'Channeled Tempest',
    description: 'While channeling, lightning hammers random ground around you, dealing 70% of the skill\'s damage plus added lightning.',
    color: '#ffe14a', requiresTags: ['channel'],
    mods: [
      mod('channelStorm', 'flat', 0.7),
      mod('addedLightning', 'flat', 5),
    ],
    perLevel: [mod('channelStorm', 'flat', 0.1), mod('addedLightning', 'flat', 2)],
    weight: 6,
  },

  patient_fury: {
    id: 'patient_fury', name: 'Patient Fury',
    description: 'Channel pulses deal 12% more damage per second the channel has been held (up to +150%).',
    color: '#d8a050', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelRamp', 'flat', 0.12)],
    perLevel: [mod('channelRamp', 'flat', 0.03)],
    weight: 6,
  },

  spooling: {
    id: 'spooling', name: 'Spooling Barrage',
    description: 'Channeled projectile skills wind up while held: roughly +1 projectile per 2.5'
      + ' seconds of unbroken channel, capped at 3 (the cap rises as the gem levels). Stacks'
      + ' with itself under the same cap. Costs 25% more mana.',
    color: '#b06bd4', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelSpool', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('channelSpool', 'flat', 0.1), mod('channelSpoolCap', 'flat', 0.5)],
    weight: 5,
  },

  mounting_frenzy: {
    id: 'mounting_frenzy', name: 'Mounting Frenzy',
    description: 'Every 8 hits landed during an unbroken channel add +1 projectile to the'
      + ' channeled skill, under the same spool cap as Spooling Barrage. Costs 20% more mana.',
    color: '#e06a50', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelHitSpool', 'flat', 0.125), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('channelHitSpool', 'flat', 0.03)],
    weight: 5,
  },

  overcharge: {
    id: 'overcharge', name: 'Overcharge',
    description: 'Hold the cast past its bar: each refilled bar banks a stage, up to 3, and'
      + ' each stage adds 40% more damage and 12% wider area. Every stage re-pays the skill\'s'
      + ' full cost. Release whenever you choose, or socket a discipline gem beside it (Perfect'
      + ' Draw, Wandering Mark, Spark Discipline) and release on its window.',
    color: '#ffd700', requiresTags: ['attack', 'spell'],
    // Held modes can't refill a bar they don't have; deploy/utility casts
    // have no payoff to multiply (the no-op-socket discipline).
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry'],
    // The granted tag is the composition seam: Spark Discipline gates on
    // it, so the release-window gem only sockets where a spark can exist.
    grantsTags: ['overcharge'],
    mods: [],
    overcharge: { stages: 3, time: 0.8, perStage: 0.4, aoePerStage: 0.12, costPerStage: 1 },
    // +1 stage at gem level 5 (floored, the levelBonus convention).
    perLevel: [mod('overchargeStages', 'flat', 0.25)],
    weight: 5,
  },

  // --- Strike-timing disciplines (StrikeTimingSpec grafts) -------------------
  // Snipe's golden window and Timed Strike's roving marker, extracted into
  // gems any bar cast can wear. Alone: a mid-cast PRESS inside the zone.
  // Beside Overcharge: the RELEASE must land inside the zone on the
  // refilling bar — hold for stages, let go on the gold.

  perfect_draw: {
    id: 'perfect_draw', name: 'Perfect Draw',
    description: 'The cast gains Snipe\'s golden tail: press again inside the last stretch of'
      + ' the bar and the hit deals 70% more damage. Under an Overcharge hold, release inside'
      + ' the gold instead; the timing path stops one stage short of the maximum.',
    color: '#ffd88a', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'perfect', bonus: 0.7 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  wandering_mark: {
    id: 'wandering_mark', name: 'Wandering Mark',
    description: 'A marker appears at a random point on the cast bar: press again as the bar'
      + ' crosses it and the hit deals 120% more damage. Under an Overcharge hold, release on'
      + ' the marker instead; each banked stage re-rolls where the marker sits.',
    color: '#e8f0ff', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'timed', bonus: 1.2 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  spark_discipline: {
    id: 'spark_discipline', name: 'Spark Discipline',
    description: 'Sockets only into a skill supported by Overcharge: releasing within a'
      + ' quarter-second of a stage banking deals 35% more damage. The one discipline that'
      + ' still works at maximum stages; the window widens as the gem levels.',
    color: '#ffe86a', requiresTags: ['overcharge'],
    mods: [mod('sparkWindow', 'flat', 0.25)],
    perLevel: [mod('sparkWindow', 'flat', 0.04), mod('sparkBonus', 'increased', 0.08)],
    weight: 5,
  },

  dive_bomb: {
    id: 'dive_bomb', name: 'Dive Bomb',
    description: 'Movement skills explode at their start and end points for 70% of the skill\'s'
      + ' damage. Costs 30% more mana. The skill now counts as area, so area supports like No'
      + ' Man\'s Land socket in beside it.',
    color: '#e8924a', requiresTags: ['movement'],
    grantsTags: ['aoe'],
    mods: [mod('moveExplode', 'flat', 0.7), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('moveExplode', 'flat', 0.12)],
    weight: 5,
  },

  fire_walker: {
    id: 'fire_walker', name: 'Fire Walker',
    description: 'Dashes and charges leave a trail of burning ground in your wake, and the'
      + ' skill gains 6 added fire damage. Trailblaze, grafted onto anything that moves.',
    color: '#ff8c3a', requiresTags: ['movement'],
    grantsTags: ['aoe', 'duration'],
    mods: [mod('moveTrail', 'flat', 0.5), mod('addedFire', 'flat', 6)],
    perLevel: [mod('moveTrail', 'flat', 0.1), mod('addedFire', 'flat', 2)],
    weight: 5,
  },

  arcing: {
    id: 'arcing', name: 'Arcing',
    description: 'Projectiles from this skill chain to 2 additional enemies. The skill deals'
      + ' 15% less damage.',
    color: '#f4e84a', requiresTags: ['projectile'],
    mods: [mod('chainCount', 'flat', 2), mod('damage', 'more', -0.15)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  static_buildup: {
    id: 'static_buildup', name: 'Static Buildup',
    description: 'This skill gains +25% ailment chance, and its lightning effects last 40%'
      + ' longer. Shocks pile up for Overload to flip the breaker on.',
    color: '#ffe96a', requiresTags: ['lightning'],
    mods: [
      mod('statusChance', 'flat', 0.25),
      mod('effectDuration', 'increased', 0.4, ['lightning']),
    ],
    perLevel: [mod('statusChance', 'flat', 0.05)],
    weight: 6,
  },

  forked_focus: {
    id: 'forked_focus', name: 'Forked Focus',
    description: 'Targeted skills strike 2 additional nearby victims, at 35% more mana cost.'
      + ' Ignite a crowd; mark three Living Bombs at once.',
    color: '#e8a268', requiresTags: ['targeted'],
    mods: [mod('multiTarget', 'flat', 2), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('multiTarget', 'flat', 1)],
    weight: 5,
  },

  powderkeg: {
    id: 'powderkeg', name: 'Powderkeg',
    requiresMechanisms: ['affliction:burn'],
    description: 'Ignites applied by this skill deal no damage over time. Instead the victim'
      + ' detonates when the burn expires, searing everything beside them for the burn\'s full'
      + ' payload.',
    color: '#ff5a3a', requiresTags: ['fire'],
    mods: [mod('igniteToBomb', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.08, ['fire'])],
    weight: 5,
  },

  nova_release: {
    id: 'nova_release', name: 'Nova Release',
    description: '+4 projectiles, but the whole volley rings out in a circle around you. The'
      + ' skill deals 20% less damage.',
    color: '#d88a4a', requiresTags: ['projectile'],
    mods: [mod('projNova', 'flat', 4), mod('damage', 'more', -0.2)],
    perLevel: [mod('projNova', 'flat', 1)],
    weight: 5,
  },

  elemental_conduction: {
    id: 'elemental_conduction', name: 'Elemental Conduction',
    description: 'Projectiles passing through your elemental fields and hazardous ground INHERIT the element: added damage and a chance to apply its ailment. Shoot through your own Flame Wall.',
    color: '#9ec8e8', requiresTags: ['projectile'],
    mods: [mod('conduction', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 5,
  },

  slow_burn: {
    id: 'slow_burn', name: 'Slow Burn',
    description: 'Fire effects from this skill last 80% longer: gentler per second, crueler in'
      + ' total. Living Bombs on a long fuse.',
    color: '#c87a3a', requiresTags: ['fire'],
    mods: [mod('effectDuration', 'increased', 0.8, ['fire'])],
    perLevel: [mod('effectDuration', 'increased', 0.15, ['fire'])],
    weight: 6,
  },

  perfect_timing: {
    id: 'perfect_timing', name: 'Perfect Timing',
    description: 'Grants any guard skill a 0.25s parry window: hits blocked in that opening'
      + ' beat cost no shield and riposte at 150% damage, independent of shield health.',
    color: '#e8d8a0', requiresTags: ['guard'],
    mods: [mod('guardParry', 'flat', 0.25)],
    perLevel: [mod('guardParry', 'flat', 0.04), mod('guardParryPower', 'increased', 0.08)],
    weight: 5,
  },

  capacitor: {
    id: 'capacitor', name: 'Capacitor',
    description: 'Socketed into an aura: everyone covered recharges energy shield 60% faster.',
    color: '#5ad8d8', requiresTags: ['aura'],
    mods: [mod('auraEsRecharge', 'flat', 0.6)],
    perLevel: [mod('auraEsRecharge', 'flat', 0.15)],
    weight: 5,
  },

  insulation: {
    id: 'insulation', name: 'Insulation',
    description: 'Socketed into an aura: everyone covered starts recharging energy shield 35% sooner.',
    color: '#9ad8e8', requiresTags: ['aura'],
    mods: [mod('auraEsDelay', 'flat', 0.35)],
    perLevel: [mod('auraEsDelay', 'flat', 0.07)],
    weight: 5,
  },

  desperation: {
    id: 'desperation', name: 'Desperation',
    requiresMechanisms: ['strikes'],
    description: 'This skill deals 40% more damage while you are on low life. Glass, meet'
      + ' cannon.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.4, undefined, 'lowLife')],
    perLevel: [mod('damage', 'increased', 0.08, undefined, 'lowLife')],
    weight: 5,
  },

  serene_power: {
    id: 'serene_power', name: 'Serene Power',
    description: 'While your energy shield is full, this skill deals 30% more damage. Strike'
      + ' from behind an unbroken veil.',
    color: '#5ad8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.3, undefined, 'fullEs')],
    perLevel: [mod('damage', 'increased', 0.07, undefined, 'fullEs')],
    weight: 5,
  },

  untouched_might: {
    id: 'untouched_might', name: 'Untouched Might',
    requiresMechanisms: ['strikes'],
    description: 'On full life, this skill deals 25% more damage. Pairs with everything that'
      + ' keeps the hits off your skin.',
    color: '#e8c848', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.25, undefined, 'fullLife')],
    perLevel: [mod('damage', 'increased', 0.06, undefined, 'fullLife')],
    weight: 5,
  },

  remnants: {
    id: 'remnants', name: 'Elemental Remnants',
    description: 'Elemental hits have a 12% chance to shed a remnant. Picking one up empowers your NEXT cast of that element: 40% more damage, +1 projectile, 30% larger area.',
    color: '#c89ae8', requiresTags: ['fire', 'cold', 'lightning'],
    mods: [mod('remnantChance', 'flat', 0.12)],
    perLevel: [mod('remnantChance', 'flat', 0.04)],
    weight: 6,
  },

  mirror_coating: {
    id: 'mirror_coating', name: 'Mirror Coating',
    description: 'Your protection domes deflect enemy projectiles instead of dissolving them;'
      + ' each deflected shot flies back as your own.',
    color: '#9ad8c8', requiresTags: ['guard'],
    mods: [mod('domeDeflects', 'flat', 1)],
    perLevel: [mod('aoeRadius', 'increased', 0.08)],
    weight: 4,
  },

  crimson_harvest: {
    id: 'crimson_harvest', name: 'Crimson Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have an 8% chance to knock loose a life orb. Walk over'
      + ' the orb to drink it.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_life', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_life', 'flat', 0.03)],
    weight: 7,
  },

  azure_harvest: {
    id: 'azure_harvest', name: 'Azure Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have an 8% chance to knock loose a mana orb. Walk over'
      + ' the orb to drink it.',
    color: '#4a78d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_mana', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_mana', 'flat', 0.03)],
    weight: 7,
  },

  lambent_harvest: {
    id: 'lambent_harvest', name: 'Lambent Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits with this skill have an 8% chance to knock loose an energy shield orb;'
      + ' picking it up also starts your recharge.',
    color: '#5ad8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_es', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_es', 'flat', 0.03)],
    weight: 6,
  },

  // The votive-economy grafts: ANY skill can keep the wake. kindled_wake
  // makes the host a Wakeflame generator (the orbOnHit/orbOnKill families,
  // read with the host's context); abundant_harvest scales every shed roll
  // the host makes, whatever the kind; victors_tempo is the charge-battery
  // shape — the host's kills feed a bank it doesn't natively touch,
  // trading a support slot for a second skill's worth of generation.
  kindled_wake: {
    id: 'kindled_wake', name: 'Kindled Wake',
    requiresMechanisms: ['strikes'],
    description: 'The supported skill keeps the wake: hits have a 6% chance and kills a 25%'
      + ' chance to shake a Wakeflame orb loose.',
    color: '#ffd98a', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_wakeflame', 'flat', 0.06), mod('orbOnKill_wakeflame', 'flat', 0.25)],
    perLevel: [mod('orbOnKill_wakeflame', 'flat', 0.04)],
    weight: 6,
  },

  // THE GLOAMING'S COUNTERPLAY IN GEM FORM (2026-07-24, the deepened-courts
  // round): the LIGHT meter's only player answer was a planted votive
  // (kindle_wick) the fight keeps dragging you away from. This gem makes
  // the fight itself the lantern — kills shed a real lightwell mote at the
  // corpse (the 'kindle' ProcEffect, open to combos/fortunes by
  // construction), pool/decay-bounded so the glow never outlives the war.
  // In a summon skill the court lights its keeper's road (proc minionCarry).
  // Honest everywhere by the lightwell law (the sweep feeds only meters
  // that exist); WORTH its slot where the dark drinks — the Gloaming, the
  // Descent's abyss floor, the long night.
  gutterglow: {
    id: 'gutterglow', name: 'Gutterglow',
    requiresMechanisms: ['strikes'],
    description: 'Kills with this skill GUTTER: each corpse sheds a brief mote of standing'
      + ' light, feeding the Light of whoever fights beside it. In a summon skill, the court'
      + ' lights its keeper\'s road. Where the dark drinks, the fight is your lantern.',
    color: '#e8c078', requiresTags: ['attack', 'spell'],
    mods: [mod('proc_gutterglow', 'flat', 1)],
    // No perLevel: the proc fires every rationed kill already (icd-paced);
    // deepening the MOTE is the lightwell row's business, a balance dial.
    minDropLevel: 6,
    weight: 5,
  },

  victors_tempo: {
    id: 'victors_tempo', name: "Victor's Tempo",
    requiresMechanisms: ['strikes'],
    description: 'A kill with the supported skill has a 60% chance to grant you a Frenzy'
      + ' charge, up to 3. Socketed in a summon skill, the court\'s kills kindle their keeper.',
    color: '#8ae06a', requiresTags: ['attack', 'spell'],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.34)],
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 3, on: 'kill', chance: 0.6 }],
    weight: 5,
  },

  abundant_harvest: {
    id: 'abundant_harvest', name: 'Abundant Harvest',
    requiresMechanisms: ['strikes'],
    description: 'The supported skill\'s orb shed chances of every kind are 30% increased.'
      + ' Where no shed exists at all, the gem grants one: kills gain a 4% base chance to shed'
      + ' life and mana orbs, grown by shed passives and gear but never by this gem\'s own'
      + ' bonus.',
    color: '#c8e87a', requiresTags: ['attack', 'spell'],
    // The mechanism unlock (orbShedGraft): a LOW floor by design — other
    // orbShedRate sources build on it; the gem's own rate mod multiplies
    // only INNATE shed lanes (no self-compounding, rollKillOrbs law).
    orbShedGraft: { chance: 0.04, orbs: ['life', 'mana'] },
    mods: [mod('orbShedRate', 'increased', 0.3)],
    perLevel: [mod('orbShedRate', 'increased', 0.05)],
    weight: 6,
  },

  guardians_aegis: {
    id: 'guardians_aegis', name: "Guardian's Aegis",
    description: 'While you guard, your nearby minions are guarded too: hits against them from'
      + ' within your blocking arc drain your shield instead. The gem also grants 20% increased'
      + ' guard strength.',
    color: '#8ab8d8', requiresTags: ['guard'],
    mods: [mod('guardAegis', 'flat', 1), mod('guardStrength', 'increased', 0.2)],
    perLevel: [mod('guardStrength', 'increased', 0.15)],
    weight: 5,
  },

  // --- The drinking gems (flask lane) ----------------------------------------
  // The flask family's socket wing, all riding existing seams: the `reflex`
  // and `thirstless` stats (skill-scoped like any mod), and followUp
  // payloads (the Reaper's Encore shape) so a drink can carry cargo —
  // outward at enemies, sideways at allies, inward as tempo. Nothing here
  // is flask-only machinery; every lever composes anywhere its tags admit.

  muscle_memory: {
    id: 'muscle_memory', name: 'Muscle Memory',
    description: 'The supported instant skill becomes a REFLEX: pressable straight through your'
      + ' own casts, dashes and recovery, resolving alongside them. Flasks are born knowing'
      + ' this.',
    color: '#c8c8d8', requiresTags: ['instant'], excludeTags: ['flask'],
    mods: [mod('reflex', 'flat', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.04)],
    weight: 5,
  },

  libation: {
    id: 'libation', name: 'Libation',
    description: 'This flask ignores its thirst gate: drinkable even at a full pool, whether'
      + ' the pour spills or not. Each pour grants 15% increased restoration, and everything'
      + ' the drink grants lingers 10% longer. For builds that drink for what rides the drink.',
    color: '#d8b86a', requiresTags: ['flask'],
    // effectDuration is what makes the gem FUNCTION on the buff-flask wing
    // too (quicksilver/stoneskin/antidote carry no pour to enrich): richer
    // where there's a pour, longer everywhere — one devotional identity.
    mods: [mod('thirstless', 'flat', 1), mod('restorePower', 'increased', 0.15),
      mod('effectDuration', 'increased', 0.1)],
    perLevel: [mod('restorePower', 'increased', 0.05)],
    weight: 5,
  },

  acrid_draught: {
    id: 'acrid_draught', name: 'Acrid Draught',
    description: 'Every drink from this flask flings an Acrid Splash at whoever crowds you: a'
      + ' corrosive ring that poisons. The flask itself restores 15% less.',
    color: '#9ac838', requiresTags: ['flask'],
    followUp: { skillId: 'acrid_splash', delay: 0.2 },
    mods: [mod('restorePower', 'more', -0.15)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  adrenal_decant: {
    // Name + copy FLAGGED for Arianna's word (2026-08-08 placeholder).
    id: 'adrenal_decant', name: 'Adrenal Decant',
    description: 'The supported drink is decanted toward the rush: its SURGE pours an extra 10%'
      + ' of your maximum (15% becomes 25%), and its SETTLE pours 50% less. Fits only drinks'
      + ' that carry both streams.',
    color: '#e8744a', requiresTags: ['flask'],
    // THE LANE GATE (pour mechanisms, engine/skills.ts): both lanes must
    // stand on the host — a surge-less mana or catalyst flask refuses
    // honestly, and the refusal self-lifts the day its def grows a surge.
    requiresMechanisms: ['pour:surge', 'pour:settle'],
    // Her spec verbatim (ONE BLESSING UNIT, 2026-08-08): +10pp surge, 50%
    // LESS settle. No perLevel on purpose — the surge is a fixed floor
    // that deepens only by explicit investment, and growth curves await
    // her word. (The inverse settle-fat gem is a noted future row,
    // deliberately not shipped this pass.)
    mods: [mod('pourPct_surge', 'flat', 0.10), mod('pourPower_settle', 'more', -0.5)],
    weight: 5,
  },

  shared_draught: {
    id: 'shared_draught', name: 'Shared Draught',
    description: 'Every drink from this flask casts a Benediction a beat later, mending'
      + ' everyone on your side around you at once. The mending scales with your healing power,'
      + ' not with the pour.',
    color: '#9ae0b0', requiresTags: ['flask'],
    followUp: { skillId: 'benediction', delay: 0.3 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.06)],
    weight: 5,
  },

  chaser: {
    id: 'chaser', name: 'Chaser',
    description: 'Each drink from this flask is chased a moment later by a short surge of'
      + ' attack and cast speed. Drink into the fight, not out of it.',
    color: '#e8c878', requiresTags: ['flask'],
    followUp: { skillId: 'chaser_edge', delay: 0.15 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },

  splitting: {
    id: 'splitting', name: 'Splitting',
    description: 'This skill fires +1 projectile. Each projectile deals 20% less damage, and'
      + ' the cast costs 30% more mana.',
    color: '#7ec8a0', requiresTags: ['projectile'],
    mods: [
      mod('projectileCount', 'flat', 1),
      mod('damage', 'more', -0.2),
      mod('manaCost', 'more', 0.3),
    ],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 6,
  },

  piercing: {
    id: 'piercing', name: 'Piercing',
    description: 'Projectiles from this skill pierce 2 additional targets. Refuses hosts whose'
      + ' flights already pass through everything; a drifting orb has nothing left to pierce.',
    color: '#b8d8a0', requiresTags: ['projectile'],
    // THE SPENDING GATE: pierce is survival past an impact that would end
    // the flight — re-hitting drifters never spend, so the socket refuses
    // honestly instead of riding inert (engine/skills.ts 'flight:spends').
    requiresMechanisms: ['flight:spends'],
    mods: [mod('pierceCount', 'flat', 2)],
    perLevel: [mod('pierceCount', 'flat', 1)],
    weight: 10,
  },

  concentrated: {
    id: 'concentrated', name: 'Concentrated Power',
    description: '30% more area damage, but 25% reduced area of effect.',
    color: '#d8a04a', requiresTags: ['aoe'],
    mods: [
      mod('damage', 'more', 0.3),
      mod('aoeRadius', 'increased', -0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  widening: {
    id: 'widening', name: 'Widening',
    description: '30% increased area of effect.',
    color: '#a0b8d8', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'increased', 0.3)],
    perLevel: [mod('aoeRadius', 'increased', 0.08)],
    weight: 10,
  },

  combustion: {
    id: 'combustion', name: 'Combustion',
    description: '30% increased fire damage and +15% ailment chance.',
    color: '#ff7a2a', requiresTags: ['fire'],
    mods: [
      mod('damage', 'increased', 0.3, ['fire']),
      mod('statusChance', 'flat', 0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.08, ['fire'])],
    weight: 9,
  },

  commanding: {
    id: 'commanding', name: 'Commanding Presence',
    description: '+1 maximum minion and 15% increased minion damage.',
    color: '#b06bd4', requiresTags: ['summon'],
    mods: [
      mod('minionMaxCount', 'flat', 1),
      mod('minionDamage', 'increased', 0.15),
    ],
    perLevel: [mod('minionDamage', 'increased', 0.1)],
    weight: 6,
  },

  accelerated: {
    id: 'accelerated', name: 'Accelerated Casting',
    description: 'Casts of this skill gain 20% increased cast speed and cost 15% more mana.',
    color: '#7a9aff', requiresTags: ['spell'],
    mods: [
      mod('castSpeed', 'increased', 0.2),
      mod('manaCost', 'more', 0.15),
    ],
    perLevel: [mod('castSpeed', 'increased', 0.05)],
    weight: 10,
  },

  relentless: {
    id: 'relentless', name: 'Relentless Strikes',
    description: '18% increased attack speed.',
    color: '#e09040', requiresTags: ['attack'],
    mods: [mod('attackSpeed', 'increased', 0.18)],
    perLevel: [mod('attackSpeed', 'increased', 0.05)],
    weight: 10,
  },

  brutality: {
    id: 'brutality', name: 'Brutality',
    description: '35% increased physical damage.',
    color: '#a85848', requiresTags: ['physical'],
    mods: [mod('damage', 'increased', 0.35, ['physical'])],
    perLevel: [mod('damage', 'increased', 0.08, ['physical'])],
    weight: 9,
  },

  lingering: {
    id: 'lingering', name: 'Lingering Potency',
    description: '30% increased effect duration and +10% ailment chance.',
    color: '#8ad8c0', requiresTags: ['duration', 'buff'],
    mods: [
      mod('effectDuration', 'increased', 0.3),
      mod('statusChance', 'flat', 0.1),
    ],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 9,
  },

  vampiric: {
    id: 'vampiric', name: 'Vampiric Touch',
    requiresMechanisms: ['strikes'],
    description: '2% of damage leeched as life.',
    color: '#c04060',
    mods: [mod('lifeLeech', 'flat', 0.02)],
    perLevel: [mod('lifeLeech', 'flat', 0.005)],
    weight: 8,
  },

  precision: {
    id: 'precision', name: 'Deadly Precision',
    requiresMechanisms: ['strikes'],
    description: '+6% critical strike chance, +15% critical strike multiplier.',
    color: '#ffd24a',
    mods: [
      mod('critChance', 'flat', 0.06),
      mod('critMulti', 'flat', 0.15),
    ],
    perLevel: [mod('critChance', 'flat', 0.015)],
    weight: 8,
  },

  efficiency: {
    id: 'efficiency', name: 'Efficiency',
    description: '30% less mana cost.',
    color: '#6ab8d8',
    mods: [mod('manaCost', 'more', -0.3)],
    perLevel: [mod('manaCost', 'increased', -0.06)],
    weight: 9,
  },

  stunning: {
    id: 'stunning', name: 'Stunning Blows',
    description: '+20% ailment chance and 10% increased melee damage.',
    color: '#cccccc', requiresTags: ['melee'],
    mods: [
      mod('statusChance', 'flat', 0.2),
      mod('damage', 'increased', 0.1, ['melee']),
    ],
    perLevel: [mod('statusChance', 'flat', 0.05)],
    weight: 9,
  },

  // ===== Mechanic-warping supports =========================================
  // These don't just scale numbers — they change how the skill behaves, by
  // feeding the engine's mechanic stats (procs, chains, shapes, scatter,
  // summon batching, minion payloads).

  brutal_strikes: {
    id: 'brutal_strikes', name: 'Brutal Strikes',
    requiresMechanisms: ['strikes'],
    description: 'Melee hits from this skill have a 25% chance to trigger Brutal Strike: an'
      + ' extra hit at 60% damage.',
    color: '#ff8a4a', requiresTags: ['melee'],
    mods: [mod('proc_brutal_strike', 'flat', 0.25)],
    perLevel: [mod('proc_brutal_strike', 'flat', 0.06)],
    weight: 8,
  },

  chaining: {
    id: 'chaining', name: 'Chaining',
    description: 'Projectiles chain to 2 additional enemies, but deal 15% less damage.',
    color: '#8ad8ff', requiresTags: ['projectile'],
    mods: [
      mod('chainCount', 'flat', 2),
      mod('damage', 'more', -0.15),
    ],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 7,
  },

  aftershocks: {
    id: 'aftershocks', name: 'Aftershocks',
    description: 'Area explosions scatter into 2 secondary explosions at 50% damage.',
    color: '#d8b04a', requiresTags: ['aoe'],
    mods: [mod('aoeScatter', 'flat', 2)],
    perLevel: [mod('aoeScatter', 'flat', 1)],
    weight: 7,
  },

  buried_charge: {
    id: 'buried_charge', name: 'Buried Charge',
    description: 'Ground placements from this skill bury a charge beneath themselves: one'
      + ' second after the impact, the same ground detonates again at full effect. Grants the'
      + ' pulse tag, opening this skill to pulse gems such as Unsettled Earth. Casts cost 25%'
      + ' more mana.',
    color: '#d8a858', requiresTags: ['aoe'],
    grantsTags: ['pulse'],
    // The kindred rule (instancePulsePlan): on a skill that already
    // pulses, this beat APPENDS after the native rhythm in its own
    // character — Earthquake's 2.4× quake tolls, then the buried charge
    // answers at full effect. On pulse-less ground it stands the lane up.
    // PRICE RE-DERIVED 2026-07-27, and it STANDS at 0.25 (measured:
    // `sweep supports --support buried_charge --seeds 3`, 184 effective
    // pairs). The APPEND lane is this gem's WEAKEST, not its strongest:
    // +10.6% median output across the 9 natively-pulsing hosts (starcall
    // +38.9 · fleshspur +29.5 · earthquake +26.8 · epicenter +10.6 ·
    // crumble +7.2 · rising_knell +5.6) against +53.0% median across the
    // 175 pulse-less hosts where it stands the lane up. The kindred rule
    // lifted the append lane OUT of a trap — it used to replace the 2.4×
    // quake with a plain 1.0× one, a net loss — but did not make it the
    // strong lane, and the pulse-less lane never moved at all. +25% mana
    // is the repo's own going rate for this magnitude: the same tax buys
    // spooling +43.5%, terminal_velocity +18.0%, violent_genesis +10.7%
    // median. Raising it would re-break the lane the kindred rule fixed.
    // OPEN DESIGN CALL, surfaced not built: one flat price cannot serve
    // both lanes — it is a damage-per-mana LOSS on the append lane
    // (×0.88) and a gain on the stand-up lane (×1.22). Splitting the
    // price by host rhythm would need a mechanism; that call is the
    // owner's, not this pass's.
    pulse: { delay: 1.0 },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 6,
  },

  unsettled_earth: {
    id: 'unsettled_earth', name: 'Unsettled Earth',
    description: 'Pulsing ground from this skill beats twice more before it stills, every pulse'
      + ' a fresh detonation, and each detonation still scatters its Aftershocks. All of it'
      + ' deals 10% less damage; the earth pays in instalments.',
    color: '#c8b068', requiresTags: ['pulse'],
    // PRICE RE-DERIVED 2026-07-27: -0.2 → -0.1 (measured: `sweep supports
    // --support unsettled_earth --seeds 3`, 6 effective hosts — the
    // narrowest tag gate in the game). pulseCount deepens the NATIVE
    // rhythm, so this gem's worth tracks the host's own dmgMult and the
    // spread is structural, not priceable: at -0.2 the median was +24.9%
    // (30s window) / +3.3% (the 10s dummy window, where the late beats
    // simply never land) with THREE of six hosts net NEGATIVE — crumble
    // -9.7%, whose dmgStep 0.8 decay makes each added beat worth less
    // than the flat tax on everything. That sat far under the family's
    // going rate (chaining pays -15% damage for +67.3% median;
    // buried_charge +25% mana for +39.1%). At -0.1: median +40.4% (30s) /
    // +16.2% (10s), no host left a trap (crumble +1.6% / -2.5%), top host
    // earthquake +113.3% — between buried_charge's p90 (+106.8%) and
    // chaining's p75 (+144.2%), so the ceiling is ordinary for the family.
    mods: [mod('pulseCount', 'flat', 2), mod('damage', 'more', -0.1)],
    perLevel: [mod('pulseCount', 'flat', 0.5)],
    weight: 5,
  },

  carried_edge: {
    id: 'carried_edge', name: 'Carried Edge',
    description: 'This skill\'s sweep rides you instead of standing where it was cast: the'
      + ' whole working follows as you move, while its arc keeps its own trajectory. Casts cost'
      + ' 20% more mana. Reap on the march.',
    color: '#c8a0e0', requiresTags: ['sweep'],
    zoneFollow: true,
    mods: [mod('manaCost', 'more', 0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  reapers_encore: {
    id: 'reapers_encore', name: "Reaper's Encore",
    description: 'Each swing of this skill has a 35% chance to earn an encore: a heartbeat'
      + ' later, a full slow sweep crosses your front on its own, free of charge. Casts cost'
      + ' 15% more mana. The scythe remembers what your wrists forgot.',
    color: '#b088d0', requiresTags: ['melee'],
    followUp: { skillId: 'follow_sweep', chance: 0.35, delay: 0.35 },
    mods: [mod('manaCost', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 6,
  },

  // --- The cadence gems (one knob, every clock) --------------------------------
  accelerando: {
    id: 'accelerando', name: 'Accelerando',
    description: 'Every beat this skill keeps (pulses, cascade skips, emitter salvos) lands'
      + ' sooner than the last: each gap shrinks to 70% of the one before. All of it deals 10%'
      + ' less damage; haste has a price.',
    color: '#e8d088', requiresTags: ['aoe'],
    cadence: { intervalStep: 0.7 },
    mods: [mod('damage', 'more', -0.1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  ritardando: {
    id: 'ritardando', name: 'Ritardando',
    description: 'Every beat this skill keeps spaces out, each gap stretching to 140% of the'
      + ' last, and the patience is paid for: 25% more damage on all of it. Fewer notes,'
      + ' heavier hands.',
    color: '#c8b078', requiresTags: ['aoe'],
    cadence: { intervalStep: 1.4 },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  square_sigil: {
    id: 'square_sigil', name: 'Square Sigil',
    description: 'Converts the area of effect into a square, covering the corners.',
    color: '#b8a8d8', requiresTags: ['aoe'],
    mods: [mod('aoeShape', 'override', AOE_SHAPE.square)],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 6,
  },

  triangle_sigil: {
    id: 'triangle_sigil', name: 'Triangle Sigil',
    description: 'Converts the area of effect into a forward-pointing triangle dealing 15% more damage.',
    color: '#d8a8b8', requiresTags: ['aoe'],
    mods: [
      mod('aoeShape', 'override', AOE_SHAPE.triangle),
      mod('damage', 'more', 0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 6,
  },

  titanic: {
    id: 'titanic', name: 'Titanic Command',
    description: 'Minions of this skill are 40% larger and gain 35% more damage and 35% more'
      + ' life, but you may summon 50% fewer.',
    color: '#c8884a', requiresTags: ['summon'],
    mods: [
      mod('minionSize', 'increased', 0.4),
      mod('minionDamage', 'more', 0.35),
      mod('minionLife', 'more', 0.35),
      mod('minionMaxCount', 'more', -0.5),
    ],
    perLevel: [mod('minionDamage', 'increased', 0.08)],
    weight: 6,
  },

  legion_call: {
    id: 'legion_call', name: 'Legion Call',
    description: 'This skill summons +1 minion per cast, all at once. Each cast costs 40% more'
      + ' mana.',
    color: '#a888e8', requiresTags: ['summon'],
    mods: [
      mod('summonCount', 'flat', 1),
      mod('manaCost', 'more', 0.4),
    ],
    perLevel: [mod('manaCost', 'increased', -0.05)],
    weight: 6,
  },

  cascading_call: {
    id: 'cascading_call', name: 'Cascading Call',
    description: 'This skill summons +2 minions per cast, emerging scattered in sequence. Each'
      + ' cast costs 60% more mana.',
    color: '#88b8e8', requiresTags: ['summon'],
    mods: [
      mod('summonCount', 'flat', 2),
      mod('summonSequence', 'override', 1),
      mod('manaCost', 'more', 0.6),
    ],
    perLevel: [mod('summonCount', 'flat', 0.5)],
    weight: 5,
  },

  unstable_flesh: {
    id: 'unstable_flesh', name: 'Unstable Flesh',
    description: 'On reaching low life, this skill\'s minions detonate, dealing 60% of their'
      + ' maximum life as fire damage. They trade longevity for violence.',
    color: '#e86848', requiresTags: ['summon'],
    mods: [mod('minionExplodeLowLife', 'flat', 0.6)],
    perLevel: [mod('minionExplodeLowLife', 'flat', 0.15)],
    weight: 6,
  },

  // The reduced-duration twin of Lingering Potency: brief but brilliant.
  ephemeral: {
    id: 'ephemeral', name: 'Ephemeral',
    description: '30% reduced effect duration, but 25% more damage.',
    color: '#e8d8a8', requiresTags: ['duration', 'buff', 'summon'],
    mods: [
      mod('effectDuration', 'increased', -0.3),
      mod('damage', 'more', 0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  cloudburst: {
    id: 'cloudburst', name: 'Cloudburst',
    description: 'Storm skills release all their strikes at once instead of in sequence.',
    color: '#c8d8e8', requiresTags: ['storm'],
    mods: [mod('stormImmediate', 'override', 1)],
    perLevel: [mod('stormCount', 'flat', 0.5)],
    weight: 6,
  },
  // The Warfront's doctrine gem (cloudburst's counterpart: that one changes
  // WHEN the strikes land, this one changes HOW MANY there are — the two
  // compose): the barrage that simply does not stop.
  sustained_barrage: {
    id: 'sustained_barrage', name: 'Sustained Barrage',
    description: 'Storm skills fire two additional strikes per salvo. The Grind\'s first doctrine: the guns do not stop, and neither does the ground stop moving under whoever they hunt.',
    color: '#e8703a', requiresTags: ['storm'],
    mods: [mod('stormCount', 'flat', 2)],
    perLevel: [mod('stormCount', 'flat', 0.25)],
    weight: 6,
  },

  corpsefire: {
    id: 'corpsefire', name: 'Corpsefire',
    requiresMechanisms: ['strikes'],
    description: 'Kills with this skill have a 50% chance to trigger Corpsefire: the corpse'
      + ' erupts at 80% damage. It also rolls on plain hits against rare and boss enemies, and'
      + ' a summoned court\'s kills erupt for their keeper.',
    color: '#ff5a2a',
    mods: [mod('proc_corpsefire', 'flat', 0.5)],
    perLevel: [mod('proc_corpsefire', 'flat', 0.12)],
    weight: 7,
  },

  blood_price: {
    id: 'blood_price', name: 'Blood Price',
    description: 'This skill pays its costs with life instead of mana, and deals 10% more'
      + ' damage.',
    color: '#c02838',
    mods: [
      mod('costToLife', 'override', 1),
      mod('damage', 'more', 0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 6,
  },

  soul_tether: {
    id: 'soul_tether', name: 'Soul Tether',
    description: 'Persistent minions from this skill return from death sooner: 40% reduced'
      + ' respawn time.',
    color: '#9ab8d8', requiresTags: ['summon'],
    mods: [mod('minionRespawnTime', 'increased', -0.4)],
    perLevel: [mod('minionRespawnTime', 'increased', -0.08)],
    weight: 7,
  },

  // ===== Projectile form & flight ==========================================

  colossal: {
    id: 'colossal', name: 'Colossal Projectiles',
    description: 'Projectiles from this skill are massive: 60% increased projectile size and'
      + ' 20% more damage, but 30% reduced projectile speed.',
    color: '#d89858', requiresTags: ['projectile'],
    mods: [
      mod('projectileSize', 'increased', 0.6),
      mod('damage', 'more', 0.2),
      mod('projectileSpeed', 'increased', -0.3),
    ],
    perLevel: [mod('projectileSize', 'increased', 0.12)],
    weight: 7,
  },

  volley: {
    id: 'volley', name: 'Volley',
    description: 'This skill fires +2 projectiles at 40% reduced projectile size, each dealing'
      + ' 25% less damage.',
    color: '#a8c8a8', requiresTags: ['projectile'],
    mods: [
      mod('projectileCount', 'flat', 2),
      mod('projectileSize', 'increased', -0.4),
      mod('damage', 'more', -0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 7,
  },

  swiftness: {
    id: 'swiftness', name: 'Swiftness',
    description: 'Shots from this skill fly with 40% increased projectile speed.',
    color: '#a8e8d8', requiresTags: ['projectile'],
    mods: [mod('projectileSpeed', 'increased', 0.4)],
    perLevel: [mod('projectileSpeed', 'increased', 0.1)],
    weight: 9,
  },

  // --- Trajectory attribute gems ---------------------------------------------
  // Each grants ONE flight axis as a plain stat (homingPower, erraticPower,
  // spiralPower, orbitPower, spinPower, weavePower). The axes COMPOSE — with
  // each other, with a skill's innate trajectory, and with anything else that
  // grants the stats (passives, future affixes). Leveling a gem strengthens
  // its axis, not just its numbers.

  seeker: {
    id: 'seeker', name: 'Seeker',
    description: 'Projectiles loosely home toward enemies. Each level sharpens the tracking toward a surefire hit.',
    color: '#e8a8d8', requiresTags: ['projectile'],
    mods: [mod('homingPower', 'flat', 2)],
    perLevel: [mod('homingPower', 'flat', 1.5)],
    weight: 6,
  },

  unstable_flight: {
    id: 'unstable_flight', name: 'Unstable Flight',
    description: 'Projectiles fly erratically and deal 15% more damage. Erraticism composes: an'
      + ' unstable spiral wobbles.',
    color: '#d8e858', requiresTags: ['projectile'],
    mods: [
      mod('erraticPower', 'flat', 5),
      mod('damage', 'more', 0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 7,
  },

  // --- The ATTENTION gems (the threat chart, socketed) -----------------------
  // threatGen is an attention lever, never a damage one: it scales how loudly
  // the supported skill's damage books on the victim's chart (resolveHit folds
  // it per-skill). Only highestThreat brains — and every grafted extraction
  // swarm — read the chart, so these gems shine brightest where the world is
  // already arguing about who to bite.

  clamor: {
    id: 'clamor', name: 'Clamor',
    // NOTE: the support matrix reads this INERT in the arena — an ENVIRONMENTAL
    // false positive (the cloudborne precedent): sim duels field ONE candidate
    // target, so a louder chart changes no decision and episodes stay
    // byte-identical. The read site is resolveHit's threat booking; verified
    // LIVE in-browser (an out-booked extraction swarmer retargets).
    description: 'This skill lands LOUD: every wound it deals generates three times the threat,'
      + ' holding enemy attention on you and off your allies.',
    color: '#e8c87a', requiresTags: ['attack', 'spell'],
    mods: [mod('threatGen', 'more', 2.0)],
    perLevel: [mod('threatGen', 'more', 0.25)],
    weight: 6, minDropLevel: 6,
  },

  quiet_hand: {
    id: 'quiet_hand', name: 'Quiet Hand',
    // NOTE: the support matrix may read this INERT in the arena — an
    // ENVIRONMENTAL false positive: sim duels field one candidate target, so
    // nothing exists to out-shout. The read site is resolveHit's threat
    // booking (live wherever a chart has two names on it — verified against
    // the extraction swarm in-browser).
    description: 'This skill lands SOFT: wounds it deals generate 65% less threat, sliding'
      + ' enemy attention past you toward louder targets.',
    color: '#b8c8c0', requiresTags: ['attack', 'spell'],
    mods: [mod('threatGen', 'more', -0.65)],
    perLevel: [mod('threatGen', 'more', -0.03)],
    weight: 6, minDropLevel: 6,
  },

  beckoning: {
    id: 'beckoning', name: 'Beckoning',
    description: 'Constructs from this skill TAUNT: totems, turrets and traps pull enemy'
      + ' attacks onto themselves, and have 35% increased life to survive the attention.',
    color: '#a5e3b4', requiresTags: ['construct'],
    mods: [mod('constructTaunt', 'flat', 1), mod('minionLife', 'increased', 0.35)],
    perLevel: [mod('minionLife', 'increased', 0.05)],
    weight: 5, minDropLevel: 8,
  },

  // --- The SUN & SAND gems (the desert discipline's grafts) ------------------
  // The family's identity supported: sunscorch as ammunition. All three read
  // universal sheet lanes (apply_<status> / damageVs_<status> / aoeRadius),
  // so nothing here can go matrix-INERT on a fitting host.
  sunbaked_edge: {
    id: 'sunbaked_edge', name: 'Sunbaked Edge',
    requiresMechanisms: ['strikes'],
    description: 'Hits from this skill have a 30% chance to SUNSCORCH the victim, eroding fire'
      + ' resistance, and the skill deals 20% increased damage to sunscorched enemies.',
    color: '#ffb64a', requiresTags: ['fire'],
    mods: [mod('apply_sunscorched', 'flat', 0.3), mod('damageVs_sunscorched', 'increased', 0.2)],
    perLevel: [mod('apply_sunscorched', 'flat', 0.03), mod('damageVs_sunscorched', 'increased', 0.03)],
    weight: 6,
  },
  noonglass: {
    id: 'noonglass', name: 'Noonglass',
    requiresMechanisms: ['strikes'],
    description: 'This skill deals 8% increased damage, and its hits carry a 25% chance to'
      + ' IGNITE the victim.',
    color: '#ff8a3a', requiresTags: ['fire'],
    mods: [mod('apply_ignite', 'flat', 0.25), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_ignite', 'flat', 0.04)],
    weight: 6,
  },
  scouring_grit: {
    id: 'scouring_grit', name: 'Scouring Grit',
    description: 'This skill\'s area is 15% wider and it deals 8% increased damage, scouring'
      + ' everything caught inside.',
    color: '#d8b878', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('damage', 'increased', 0.08)],
    perLevel: [mod('aoeRadius', 'increased', 0.02)],
    weight: 6,
  },

  // --- The GALE gems (the Driftways' wind-craft) ----------------------------
  crosswind: {
    id: 'crosswind', name: 'Crosswind',
    description: 'This skill\'s projectiles gain 25% increased projectile speed and SWERVE'
      + ' erratically on the wind. Speed and erraticism both compose with other flight-shaping'
      + ' gems.',
    color: '#bfe0f8', requiresTags: ['projectile'],
    mods: [
      mod('projectileSpeed', 'increased', 0.25),
      mod('erraticPower', 'flat', 3),
    ],
    perLevel: [mod('projectileSpeed', 'increased', 0.05)],
    weight: 7,
  },

  updraft: {
    id: 'updraft', name: 'Updraft',
    requiresMechanisms: ['strikes'],
    description: 'Blows from this skill have a 40% chance to leave the victim WINDED, footing'
      + ' lost to a rising shove, and deal 20% increased damage to winded enemies.',
    color: '#cfe4f0', requiresTags: ['attack'],
    mods: [
      mod('apply_winded', 'flat', 0.4),
      mod('damageVs_winded', 'increased', 0.2),
    ],
    perLevel: [mod('apply_winded', 'flat', 0.04), mod('damageVs_winded', 'increased', 0.03)],
    weight: 7,
  },

  slipstream: {
    id: 'slipstream', name: 'Slipstream',
    description: 'Each cast of this skill grants a stack of 5% increased movement speed, up to'
      + ' 4 stacks; go 2.2 seconds without casting and every stack drops at once.',
    color: '#d4ecf8',
    excludeTags: ['channel', 'aura'],
    selfStack: {
      mods: [mod('moveSpeed', 'increased', 0.05)],
      maxStacks: 4, duration: 2.2, decay: 'all',
    },
    mods: [],
    perLevel: [mod('moveSpeed', 'increased', 0.01)],
    weight: 6, minDropLevel: 8,
  },

  cloudborne: {
    id: 'cloudborne', name: 'Cloudborne',
    description: 'Movement skills learn to CONJURE cloud: dashes lay standing cloud along their'
      + ' travel, while blinks and leaps leave one where you departed. Levels widen the trail'
      + ' and hold it longer. Over open sky the cloud is your bridge; over land it stands as'
      + ' wind-lane vapor, hastening whoever runs your road.',
    // NOTE (history): the support matrix once read this INERT — sim_arena's
    // floor has no conjurable void, so the WALKABLE half always fizzled.
    // The presence half ended that: stat-taught trails now carry the
    // windlane rider (data/conjury.ts), so the trail grants pace on ANY
    // floor and episodes diverge honestly. grantsTags feeds the fold: a
    // Cloudborne'd dash counts as 'conjure' for Thunderhead & kin.
    color: '#cfeaff', requiresTags: ['movement'],
    grantsTags: ['conjure'],
    mods: [mod('cloudTrail', 'flat', 1)],
    perLevel: [mod('cloudTrail', 'flat', 0.25)],
    weight: 5, minDropLevel: 9,
  },

  thunderhead: {
    id: 'thunderhead', name: 'Thunderhead',
    description: 'Clouds called by this skill come CHARGED: allies standing inside lace every'
      + ' blow with shock and hit a shade harder. Levels keep the weather standing longer.',
    color: '#e8e8a8', requiresTags: ['conjure'],
    mods: [mod('cloudCharge', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 11,
  },

  silver_lining: {
    id: 'silver_lining', name: 'Silver Lining',
    description: 'Clouds called by this skill carry silver rain: allies inside recover life and'
      + ' focus while the weather holds. Levels keep the rain falling longer.',
    color: '#dcecf8', requiresTags: ['conjure'],
    mods: [mod('cloudSalve', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 10,
  },

  slow_weather: {
    id: 'slow_weather', name: 'Slow Weather',
    description: 'Weather from this skill refuses to pass: called clouds gather 10% wider and'
      + ' stand with 30% increased duration.',
    color: '#c8d8ea', requiresTags: ['conjure'],
    mods: [mod('effectDuration', 'increased', 0.3), mod('aoeRadius', 'increased', 0.1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 6, minDropLevel: 9,
  },

  tethered_orbit: {
    id: 'tethered_orbit', name: 'Tethered Orbit',
    description: 'Projectiles circle you on a held tether instead of flying forward. Pair with Vortex for a widening gyre.',
    color: '#c8a8e8', requiresTags: ['projectile'],
    mods: [mod('orbitPower', 'flat', 1)],
    perLevel: [mod('orbitPower', 'flat', 0.25)],
    weight: 5,
  },

  gyre: {
    id: 'gyre', name: 'Gyre',
    description: 'Projectiles spin around their own axis as they travel. Each level widens and quickens the wheel.',
    color: '#a8b8e8', requiresTags: ['projectile'],
    mods: [mod('spinPower', 'flat', 8)],
    perLevel: [mod('spinPower', 'flat', 1.5)],
    weight: 5,
  },

  vortex: {
    id: 'vortex', name: 'Vortex',
    description: 'Projectiles spiral outward from where they were cast, or feed their spiral'
      + ' into whatever else shapes the flight.',
    color: '#88c8d8', requiresTags: ['projectile'],
    mods: [mod('spiralPower', 'flat', 4)],
    perLevel: [mod('spiralPower', 'flat', 0.75)],
    weight: 5,
  },

  sidewinder: {
    id: 'sidewinder', name: 'Sidewinder',
    description: 'Projectiles weave a figure-eight along their flight path; around an orbit,'
      + ' the weave becomes a garland looped over the ring.',
    color: '#b8d8b0', requiresTags: ['projectile'],
    mods: [mod('weavePower', 'flat', 6)],
    perLevel: [mod('weavePower', 'flat', 1)],
    weight: 5,
  },

  momentum: {
    id: 'momentum', name: 'Momentum',
    description: 'Projectiles GATHER 60% speed per second of flight and deal 10% more damage:'
      + ' slow out of the hand, swift downrange. Negative sources, such as passives, invert the'
      + ' gather into a stalling lob.',
    color: '#a8c8e8', requiresTags: ['projectile'],
    mods: [mod('projAccel', 'flat', 0.6), mod('damage', 'more', 0.1)],
    perLevel: [mod('projAccel', 'flat', 0.12)],
    weight: 6,
  },

  trueflight: {
    id: 'trueflight', name: 'Trueflight',
    description: 'Projectiles suffer 50% less erratic, spiral, spin and weave deviation and'
      + ' gain 15% increased projectile speed; the flight straightens toward true.',
    color: '#e8e8c8', requiresTags: ['projectile'],
    mods: [
      mod('erraticPower', 'more', -0.5),
      mod('spiralPower', 'more', -0.5),
      mod('spinPower', 'more', -0.5),
      mod('weavePower', 'more', -0.5),
      mod('projectileSpeed', 'increased', 0.15),
    ],
    perLevel: [
      mod('erraticPower', 'more', -0.08),
      mod('spiralPower', 'more', -0.08),
      mod('spinPower', 'more', -0.08),
      mod('weavePower', 'more', -0.08),
    ],
    weight: 6,
  },

  // --- Impact-payload gems -----------------------------------------------------

  shrapnel_gem: {
    id: 'shrapnel_gem', name: 'Shrapnel',
    description: 'Projectiles SHATTER on their first impact: 3 shards rake the cone behind the'
      + ' victim. Stacks with a skill\'s own shatter; Ice Spear simply throws more knives.',
    color: '#c8c0b0', requiresTags: ['projectile'],
    mods: [mod('projShrapnel', 'flat', 3)],
    perLevel: [mod('projShrapnel', 'flat', 1)],
    weight: 6,
  },

  fulminate: {
    id: 'fulminate', name: 'Fulminate',
    description: 'Projectiles pierce 2 additional targets, and explosive payloads detonate on'
      + ' EVERY hit, not just where the flight ends. A piercing Fireball becomes a chain of'
      + ' explosions.',
    color: '#f0a048', requiresTags: ['projectile'],
    mods: [
      mod('pierceCount', 'flat', 2),
      mod('projHitDetonate', 'flat', 1),
    ],
    perLevel: [mod('pierceCount', 'flat', 1)],
    weight: 5,
  },

  lineage: {
    id: 'lineage', name: 'Lineage',
    description: 'Shards and emitted projectiles INHERIT half of the parent\'s flight pattern:'
      + ' a seeking spear rakes seeking shards. Each level passes more down. Sockets only where'
      + ' children exist: native shatters and emitters, or a fork or shrapnel gem beside it.',
    color: '#d8c8e8', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:children'],
    mods: [mod('projInherit', 'flat', 0.5)],
    perLevel: [mod('projInherit', 'flat', 0.125)],
    weight: 5,
  },

  cascade_of_knives: {
    id: 'cascade_of_knives', name: 'Cascade of Knives',
    description: 'Projectiles chain to 1 additional target, and a spent SHATTER re-arms on'
      + ' every chain leg: the fan of knives follows the ricochet. Forks split with their'
      + ' shatter unspent.',
    color: '#b8c8d0', requiresTags: ['projectile'],
    mods: [
      mod('chainCount', 'flat', 1),
      mod('projReShatter', 'flat', 1),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 4,
  },

  // --- Added-level gems --------------------------------------------------------
  // levelBonus (+ levelBonusPer × gem level, floored) raises the socketed
  // skill's EFFECTIVE level — past the point cap: perLevel growth keeps
  // compounding, and over-cap THRESHOLDS unlock (Fireball 11 twins its
  // bloom; Spark 12 learns to arc). +1 at gem level 1 → +2 at gem level 5.

  plus_fire: {
    id: 'plus_fire', name: 'Added Levels to Fire Skills',
    description: 'The socketed fire skill operates at added levels, past its cap where the'
      + ' thresholds live: +1 level now, +2 at gem level 5.',
    color: '#ff8a4a', requiresTags: ['fire'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_cold: {
    id: 'plus_cold', name: 'Added Levels to Cold Skills',
    description: 'The socketed cold skill operates at added levels, past its cap where the'
      + ' thresholds live: +1 level now, +2 at gem level 5.',
    color: '#9ad8f8', requiresTags: ['cold'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_lightning: {
    id: 'plus_lightning', name: 'Added Levels to Lightning Skills',
    description: 'The socketed lightning skill operates at added levels, past its cap where the'
      + ' thresholds live: +1 level now, +2 at gem level 5.',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_projectile: {
    id: 'plus_projectile', name: 'Added Levels to Projectile Skills',
    description: 'The socketed projectile skill operates at added levels, past its cap where'
      + ' the thresholds live: +1 level now, +2 at gem level 5.',
    color: '#c8d8b8', requiresTags: ['projectile'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_minion: {
    id: 'plus_minion', name: 'Added Levels to Minion Skills',
    description: 'The socketed minion skill operates at added levels, past its cap where the'
      + ' thresholds live: +1 level now, +2 at gem level 5.',
    color: '#c8a8e8', requiresTags: ['summon'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  // --- Damage-tag gems ---------------------------------------------------------
  // INCREASED stacks additively with your tree and gear; MORE multiplies the
  // whole pool — the same two words the rest of the engine speaks.

  searing_heat: {
    id: 'searing_heat', name: 'Searing Heat',
    description: '40% increased fire damage.',
    color: '#ff7a2a', requiresTags: ['fire'],
    mods: [mod('damage', 'increased', 0.4, ['fire'])],
    perLevel: [mod('damage', 'increased', 0.1, ['fire'])],
    weight: 8,
  },

  biting_cold: {
    id: 'biting_cold', name: 'Biting Cold',
    description: '40% increased cold damage.',
    color: '#a8dcf0', requiresTags: ['cold'],
    mods: [mod('damage', 'increased', 0.4, ['cold'])],
    perLevel: [mod('damage', 'increased', 0.1, ['cold'])],
    weight: 8,
  },

  static_charge: {
    id: 'static_charge', name: 'Static Charge',
    description: '40% increased lightning damage.',
    color: '#c8e84a', requiresTags: ['lightning'],
    mods: [mod('damage', 'increased', 0.4, ['lightning'])],
    perLevel: [mod('damage', 'increased', 0.1, ['lightning'])],
    weight: 8,
  },

  corrosion: {
    id: 'corrosion', name: 'Corrosion',
    description: '40% increased chaos damage.',
    color: '#7ec850', requiresTags: ['chaos'],
    mods: [mod('damage', 'increased', 0.4, ['chaos'])],
    perLevel: [mod('damage', 'increased', 0.1, ['chaos'])],
    weight: 8,
  },

  ruthless: {
    id: 'ruthless', name: 'Ruthless',
    description: 'This skill deals 25% more physical damage. MORE multiplies the whole pool,'
      + ' where Brutality\'s bonus is one more increase in the additive pile.',
    color: '#c0392b', requiresTags: ['physical'],
    mods: [mod('damage', 'more', 0.25, ['physical'])],
    perLevel: [mod('damage', 'increased', 0.06, ['physical'])],
    weight: 6,
  },

  // --- Cadence gems (THE COMBO GRAMMAR, engine/sequence.ts) ----------------------
  // Conditional payoffs riding the comboVaried/comboRepeated ConditionIds:
  // socketing the gem itself wakes the wearer's recent-cast ring (the
  // instance-mod scan at World.recordCast) — no grammar needed. Each
  // carries an always-on cost line so the gem reads honestly in the
  // support no-op matrix even on builds that never earn its condition.

  polyphony: {
    id: 'polyphony', name: 'Polyphony',
    description: '30% MORE damage while your last three casts were all DIFFERENT skills; 15% increased mana cost. Many voices, one argument.',
    color: '#b8a8e8', requiresTags: ['attack', 'spell'],
    mods: [
      mod('damage', 'more', 0.3, undefined, 'comboVaried'),
      mod('manaCost', 'increased', 0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.06, undefined, 'comboVaried')],
    weight: 6,
  },

  ostinato: {
    id: 'ostinato', name: 'Ostinato',
    description: '25% MORE damage while your last three casts repeated ONE skill; 10% increased mana cost. The phrase, insisted upon.',
    color: '#d8a05a', requiresTags: ['attack', 'spell'],
    mods: [
      mod('damage', 'more', 0.25, undefined, 'comboRepeated'),
      mod('manaCost', 'increased', 0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.05, undefined, 'comboRepeated')],
    weight: 6,
  },

  // --- Mimicry (the blue-mage lane — socket into the mimic SLOT; the
  // --- witness/bank stats are read off the slot, engine/mimic.ts) ---------

  keen_study: {
    id: 'keen_study', name: 'Keen Study',
    description: 'Studied arts CAST near you are captured by this skill as if they had struck'
      + ' you; taking the blow is no longer required. The eye steals what the skin need not'
      + ' suffer.',
    color: '#c8a0e8', requiresTags: ['mimic'],
    mods: [mod('mimicWitness', 'flat', 1)],
    perLevel: [mod('mimicWitness', 'flat', 0.15)],
    weight: 8, minDropLevel: 6,
  },

  understudy: {
    id: 'understudy', name: 'Understudy',
    description: 'This skill banks 2 more borrowed arts, and every borrowed art casts at +1'
      + ' level. Room backstage for two more faces.',
    color: '#b088d8', requiresTags: ['mimic'],
    mods: [mod('mimicBank', 'flat', 2)],
    levelBonus: 1, levelBonusPer: 0.25,
    weight: 8, minDropLevel: 6,
  },

  // --- The possession seam's gem-side levers (engine/possess.ts) ----------
  iron_trance: {
    id: 'iron_trance', name: 'Iron Trance',
    description: 'Your abandoned husk takes 30% less damage while you ride, so far more pain is'
      + ' needed before it calls you home. The flesh sits behind iron.',
    color: '#b8a8e8', requiresTags: ['possession'],
    mods: [mod('huskGuard', 'flat', 0.3)],
    perLevel: [mod('huskGuard', 'flat', 0.02)],
    weight: 8, minDropLevel: 8,
  },
  long_communion: {
    id: 'long_communion', name: 'Long Communion',
    description: '40% increased possession duration: the borrowed body holds you that much'
      + ' longer before the flesh remembers whose it was.',
    color: '#a890d8', requiresTags: ['possession'],
    mods: [mod('possessDuration', 'increased', 0.4)],
    perLevel: [mod('possessDuration', 'increased', 0.05)],
    weight: 8, minDropLevel: 8,
  },

  // --- Minion investment gems ----------------------------------------------------

  vicious_brood: {
    id: 'vicious_brood', name: 'Vicious Brood',
    description: 'Minions from this skill deal 40% increased damage.',
    color: '#d078b0', requiresTags: ['summon'],
    mods: [mod('minionDamage', 'increased', 0.4)],
    perLevel: [mod('minionDamage', 'increased', 0.1)],
    weight: 7,
  },

  hardy_brood: {
    id: 'hardy_brood', name: 'Hardy Brood',
    description: 'Minions from this skill have 50% increased life.',
    color: '#a0b8d0', requiresTags: ['summon'],
    mods: [mod('minionLife', 'increased', 0.5)],
    perLevel: [mod('minionLife', 'increased', 0.12)],
    weight: 7,
  },

  // === THE THRONG LEVER GEMS (engine/throng.ts) ============================
  // Source GRAFTS gate on the registry-folded 'throng' capability word —
  // they add a ThrongSourceRow to the anchor (authored rows keep their
  // pocket indices; the one-clock laws arbitrate duplicates), so the
  // world-found flavor learns the battle-fed grammar by socket choice.
  // The find levers (throngPockets / throngYield) and the ply levers
  // (minionPlies / the calcified trade) are ordinary stats any passive or
  // affix could also grant — the gems are just their first grantors.
  patient_brood: {
    id: 'patient_brood', name: 'Patient Brood',
    description: 'While your roster stands below cap, a claimable husk condenses at your feet'
      + ' every 7 seconds, and minions from this skill gain 10% increased life. The swarm feeds'
      + ' itself.',
    color: '#a8c878', requiresTags: ['throng'],
    throngSource: { kind: 'trickle', everySec: 7, at: 'near' },
    mods: [mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionLife', 'increased', 0.05)],
    weight: 5,
  },
  hidden_reserves: {
    id: 'hidden_reserves', name: 'Hidden Reserves',
    description: 'Blows traded by you and your court fill a hidden gauge; at the brim it births'
      + ' 1–2 husks beside you, so even a boss with no court of its own feeds the throng.'
      + ' Minions from this skill deal 8% increased damage.',
    color: '#c8b060', requiresTags: ['throng'],
    throngSource: { kind: 'gauge', per: 'both', fill: 3, yield: [1, 2] },
    mods: [mod('minionDamage', 'increased', 0.08)],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 5,
  },
  teeming_warrens: {
    id: 'teeming_warrens', name: 'Teeming Warrens',
    description: 'This skill\'s kind claims one more husk pocket per zone, and every find'
      + ' (pockets, gauges, motes, raisings) yields 50% increased bodies.',
    color: '#b09868', requiresTags: ['throng'],
    mods: [mod('throngPockets', 'flat', 1), mod('throngYield', 'increased', 0.5)],
    perLevel: [mod('throngYield', 'increased', 0.06)],
    weight: 5,
  },
  // The ply levers ride the whole SUMMON family (a body with no plies
  // grows its first — the bake stands the fabric up), so hit-counted
  // armor is a build choice on any court, never a throng birthright.
  chitinous_brood: {
    id: 'chitinous_brood', name: 'Chitinous Brood',
    description: 'Minions from this skill wear one extra PLY: one more landed blow eaten whole,'
      + ' however hard it struck. Bodies with no plies grow their first.',
    color: '#98a878', requiresTags: ['summon'],
    mods: [mod('minionPlies', 'flat', 1)],
    perLevel: [mod('minionPlies', 'flat', 0.15)],
    weight: 6,
  },
  calcified_vigor: {
    id: 'calcified_vigor', name: 'Calcified Vigor',
    description: 'Minions from this skill gain 70% increased life, and every 50% of the'
      + ' life-increase you grant them becomes one PLY instead: vigor traded for blows eaten'
      + ' whole.',
    color: '#c0b8a0', requiresTags: ['summon'],
    mods: [mod('minionLife', 'increased', 0.7), mod('minionLifePlyTrade', 'flat', 0.5)],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },
  // The trade's ADDITIVE sibling (minionLifePlyEcho): nothing renounced,
  // so the threshold sits deliberately above the trade's — scale one
  // avenue hard or two at once at the gentler rate; both gems compose
  // (each reads the same pre-trade baseline, one bake pass, loop-free).
  marrowbound_vigor: {
    id: 'marrowbound_vigor', name: 'Marrowbound Vigor',
    description: 'Minions from this skill gain 90% increased life, and every 90% of the'
      + ' life-increase you grant them ALSO sets a PLY: the life kept whole, the shell grown'
      + ' beside it.',
    color: '#d0c0b0', requiresTags: ['summon'],
    mods: [mod('minionLife', 'increased', 0.9), mod('minionLifePlyEcho', 'flat', 0.9)],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },

  meat_shield: {
    id: 'meat_shield', name: 'Meat Shield',
    description: 'Minions from this skill take 30% less damage but deal 25% less, and fight'
      + ' DEFENSIVELY: a short leash at your flank instead of chasing across the field.',
    color: '#b08868', requiresTags: ['summon'],
    mods: [
      mod('minionDamageTaken', 'more', -0.3),
      mod('minionDamage', 'more', -0.25),
      mod('minionGuard', 'flat', 1),
    ],
    perLevel: [mod('minionDamageTaken', 'more', -0.04)],
    weight: 6,
  },

  bodyguard_doctrine: {
    id: 'bodyguard_doctrine', name: 'Bodyguard Doctrine',
    description: 'Minions from this skill TAUNT with 30% of their hits, insisting the fight is'
      + ' with THEM. Pair it with Meat Shield and let the wall do the arguing.',
    color: '#b08868', requiresTags: ['summon'],
    mods: [mod('minionApply_taunted', 'flat', 0.3)],
    perLevel: [mod('minionApply_taunted', 'flat', 0.05)],
    weight: 5,
  },

  // --- The Keeper's hall (companion-bond gems — the Tamer's lane) -------------
  // These gate on 'companion' (the TAMED-BOND family), so they distinguish
  // the keeper's few named beasts from a summoner's swarms: bond sympathy
  // (what stirs you stirs the pack — engine/sympathy.ts), claim terms
  // (SupportDef.tameMod), and the kennel's size. None of them read swarm
  // counts or corpse economies — that's the necromancer's hall.

  alphas_bond: {
    id: 'alphas_bond', name: "Alpha's Bond",
    description: 'Flasks and scooped orbs pour into your bonded beasts at +50% sympathy'
      + ' potency, stacking with the bond Tame Beast already wears.',
    color: '#a8c87a', requiresTags: ['companion'],
    mods: [
      mod('sympathy_bond_flask', 'flat', 0.5),
      mod('sympathy_bond_orb', 'flat', 0.5),
    ],
    perLevel: [
      mod('sympathy_bond_flask', 'flat', 0.1),
      mod('sympathy_bond_orb', 'flat', 0.1),
    ],
    weight: 5, minDropLevel: 6,
  },

  pack_instinct: {
    id: 'pack_instinct', name: 'Pack Instinct',
    description: 'Charges you gain echo to your bonded beasts; their own caps bind what sticks,'
      + ' and the classic charges bank to 3 on an untapped bearer. What quickens you quickens'
      + ' them.',
    color: '#c8a06a', requiresTags: ['companion'],
    mods: [mod('sympathy_pack_charges', 'flat', 1)],
    maxLevel: 1, // a toggle: charge echoes copy counts verbatim, potency gates
    weight: 5, minDropLevel: 8,
  },

  reciprocal_bond: {
    id: 'reciprocal_bond', name: 'Reciprocal Bond',
    description: 'When a bonded beast is mended, 40% of the mending reaches you too; potency'
      + ' scales the share. The bond flows both ways.',
    color: '#7ec88a', requiresTags: ['companion'],
    mods: [mod('sympathy_feral_reciprocity', 'flat', 1)],
    perLevel: [mod('sympathy_feral_reciprocity', 'flat', 0.125)],
    weight: 5, minDropLevel: 8,
  },

  gentling_hand: {
    id: 'gentling_hand', name: 'Gentling Hand',
    description: 'The tame is certain at 15% more life, gains +20% chance against the hale, and'
      + ' even RARE-marked beasts may kneel; bosses never.',
    color: '#d8c088', requiresTags: ['companion'],
    mods: [],
    tameMod: { sureBelowAdd: 0.15, wildChanceAdd: 0.2, allowRares: true },
    maxLevel: 1, // the terms are the terms — a claim graft, not a ramp
    weight: 4, minDropLevel: 10,
  },

  beast_master: {
    id: 'beast_master', name: 'Beast Master',
    description: 'This skill holds one more bonded beast, and every beast deals 15% less'
      + ' damage. The kennel grows; each voice comes quieter.',
    color: '#b08868', requiresTags: ['companion'],
    tameMod: { slotsAdd: 1 },
    mods: [mod('minionDamage', 'more', -0.15)],
    maxLevel: 1, // one more bond is the whole gem
    weight: 3, minDropLevel: 14,
  },

  // --- Tether gems ---------------------------------------------------------------
  // A tether is a LIVE LINE between two anchors (see TetherSpec): spawned
  // object ↔ caster, object ↔ sibling objects, or caster ↔ resolved target.
  // The band is a transient field — hostiles crossing it take typed damage
  // over time WITHOUT any status being applied (a bleed that exists only
  // while they touch the wire), and allied bands heal what stands in them.
  // Beam damage is scaled by your damage stat and runs the CONVERSION schema.

  tripwire: {
    id: 'tripwire', name: 'Tripwire',
    description: 'The placed device (trap, mine, sentry or totem) trails a razor line back to'
      + ' YOU; enemies take physical damage while they touch the wire. Walk your perimeter.',
    // 'totem' is the umbrella tag every deployed object carries (sentries,
    // totems, pylons); minions stay excluded by simply not being listed.
    color: '#c8b8a0', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { link: 'caster', dps: 7, damageType: 'physical', width: 8 },
    weight: 6,
  },

  tripwire_web: {
    id: 'tripwire_web', name: 'Tripwire Web',
    description: 'Placed devices string razor lines to EACH OTHER, every sibling within reach;'
      + ' enemies touching a line take physical damage. Three traps is a triangle; five is a'
      + ' killing field.',
    color: '#b0a890', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { link: 'network', dps: 7, damageType: 'physical', width: 8, radius: 380 },
    weight: 5,
  },

  transient_inferno: {
    id: 'transient_inferno', name: 'Transient Inferno',
    description: 'The placed object burns a corridor of flame back to YOU: enemies caught'
      + ' between you and it take fire damage while it stands.',
    color: '#ff8a3a', requiresTags: ['totem', 'aura'],
    mods: [],
    tether: { link: 'caster', dps: 9, damageType: 'fire', width: 14 },
    weight: 5,
  },

  lifeline: {
    id: 'lifeline', name: 'Lifeline',
    description: 'The targeted skill BONDS you to its target for 8 seconds: a mending cord that'
      + ' heals every ally standing in it, the target, you, and whoever holds the line between.',
    color: '#7ec88a', requiresTags: ['targeted'],
    mods: [],
    tether: { link: 'target', affects: 'allies', healPerSec: 8, width: 16, duration: 8, color: '#7ec88a' },
    weight: 5,
  },

  witchfire_leash: {
    id: 'witchfire_leash', name: 'Witchfire Leash',
    description: 'The targeted skill LEASHES you to its target for 8 seconds: enemies caught in'
      + ' the cord of witchfire take chaos damage while the bond holds.',
    color: '#9a5ad0', requiresTags: ['targeted'],
    mods: [],
    tether: { link: 'target', affects: 'enemies', dps: 8, damageType: 'chaos', width: 12, duration: 8 },
    weight: 5,
  },

  taut_wire: {
    id: 'taut_wire', name: 'Taut Wire',
    description: 'Tether bands you lay deal 50% increased damage and run 30% wider.',
    color: '#d8c8b0',
    mods: [
      mod('tetherDamage', 'increased', 0.5),
      mod('tetherWidth', 'increased', 0.3),
    ],
    perLevel: [mod('tetherDamage', 'increased', 0.12)],
    weight: 5,
  },

  charged_span: {
    id: 'charged_span', name: 'Charged Span',
    description: 'Objects placed by movement skills string a LIGHTNING arc to their siblings;'
      + ' enemies touching the arc take lightning damage. A Gate Shift pair becomes a killing'
      + ' line you step through and enemies cannot.',
    color: '#d8e84a', requiresTags: ['movement'],
    mods: [],
    tether: { link: 'network', dps: 8, damageType: 'lightning', width: 10, radius: 800 },
    weight: 4,
  },

  // --- Channel-stance gems ---------------------------------------------------------

  walking_meditation: {
    id: 'walking_meditation', name: 'Walking Meditation',
    description: 'Move at 25% speed while channeling, even through channels that root you.'
      + ' Invest enough and you stroll through your own maelstrom.',
    color: '#a8d8c8', requiresTags: ['channel'],
    mods: [mod('channelMobility', 'flat', 0.25)],
    perLevel: [mod('channelMobility', 'flat', 0.1)],
    weight: 6,
  },

  weathervane: {
    id: 'weathervane', name: 'Weathervane',
    description: '60% increased turn rate while channeling: the ponderous beam learns to track.',
    color: '#c8d8e8', requiresTags: ['channel'],
    mods: [mod('channelTurnRate', 'increased', 0.6)],
    perLevel: [mod('channelTurnRate', 'increased', 0.15)],
    weight: 6,
  },

  turbulence: {
    id: 'turbulence', name: 'Turbulence',
    requiresMechanisms: ['strikes'],
    description: 'Every knockback this skill deals flies a random direction instead of straight'
      + ' away, and it adds +25 knockback. Enemies get battered around inside your area effects'
      + ' rather than shoved out of reach.',
    color: '#b8d8c8',
    mods: [
      mod('knockBuffet', 'flat', 1),
      mod('knockback', 'flat', 25),
    ],
    perLevel: [mod('knockback', 'flat', 10)],
    weight: 5,
  },

  // --- Aim-transform + stance gems ---------------------------------------------------
  // AimSpec grafts (see engine/skills): a support can hand ANY melee skill a
  // played figure or bend a random-sector flurry. The sector stat (randomArc)
  // and cast mobility (castMobility) are ordinary stats — passives welcome.

  alternating_strikes: {
    id: 'alternating_strikes', name: 'Alternating Strikes',
    description: 'Each cast plays a two-step figure: the swing lands 70 degrees to one flank, a'
      + ' 0.2 second beat, then the answering cut 70 degrees to the other. Multistrike repeats'
      + ' the whole figure.',
    color: '#88c0d8', requiresTags: ['melee'],
    mods: [],
    aim: { sequence: { steps: [-70, 70], pause: 0.2 } },
    weight: 5,
  },

  wild_abandon: {
    id: 'wild_abandon', name: 'Wild Abandon',
    description: 'Grafts a random bearing across a 220 degree sector onto anchored swings like'
      + ' Cleave and Buckler Strike, with 50% increased random-strike arc so already-wild'
      + ' flurries round further toward a full circle. Width is Reckless Breadth\'s trade; this'
      + ' sells direction.',
    color: '#78c0e8',
    // The GRAFT is the identity (AimSpec.random on any strike — a socketed
    // transform wins over the innate one); randomArc then widens the
    // sector, here and on innately-random skills alike.
    aim: { random: { spreadDeg: 220 } },
    mods: [mod('randomArc', 'increased', 0.5)],
    perLevel: [mod('randomArc', 'increased', 0.12)],
    weight: 5,
  },

  measured_blade: {
    id: 'measured_blade', name: 'Measured Blade',
    description: 'Both arcs narrow: 60% less random-strike arc and 40% less swing arc, with 20%'
      + ' more damage for the tighter fan.',
    color: '#a8c8d8',
    mods: [
      mod('randomArc', 'more', -0.6),
      mod('swingArc', 'more', -0.4),
      mod('damage', 'more', 0.2),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  fleetfoot: {
    id: 'fleetfoot', name: 'Fleetfoot Casting',
    description: 'You keep moving at 25% speed while this skill\'s cast bar runs, and that'
      + ' stacks with any mobility the skill grants on its own.',
    color: '#b8e0c8',
    mods: [mod('castMobility', 'flat', 0.25)],
    perLevel: [mod('castMobility', 'flat', 0.1)],
    weight: 6,
  },

  // --- Ground-cascade gems -----------------------------------------------------------
  // GroundCascadeSpec grafts (see engine/skills): displaced REPEATS of a
  // ground placement. They compose with temporal repeats — a Crescendo'd,
  // Cascaded Storm Call cascades per echo — priced by the per-step damage
  // falloff plus each gem's baked tradeoff.

  spell_cascade: {
    id: 'spell_cascade', name: 'Spell Cascade',
    description: 'The cast repeats twice more along your aim line, once a step beyond your mark'
      + ' and once a step short of it, each repeat at 80% of the damage before it. Area of'
      + ' effect is 25% less.',
    color: '#a8a0e0', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'more', -0.25)],
    cascade: { count: 2, dir: 'axis', dmgStep: 0.8 },
    weight: 5,
  },

  scattered_cascade: {
    id: 'scattered_cascade', name: 'Scattered Cascade',
    description: 'Two more casts land on random ground around your mark, each at 85% of the'
      + ' damage before it, and the whole skill deals 15% less damage.',
    color: '#b8a0d0', requiresTags: ['aoe'],
    mods: [mod('damage', 'more', -0.15)],
    cascade: { count: 2, dir: 'random', dmgStep: 0.85 },
    weight: 5,
  },

  seismic_march: {
    id: 'seismic_march', name: 'Seismic March',
    description: 'Three more ripples stride forward from the impact at 0.14 second intervals,'
      + ' each 10% smaller and at 80% of the shock before it. Any ground skill learns the'
      + ' Sunder walk this way, and a skill that already marches gains three shocks on its'
      + ' march.',
    color: '#c0a878', requiresTags: ['aoe'],
    mods: [],
    cascade: { count: 3, dir: 'forward', scaleStep: 0.9, dmgStep: 0.8, interval: 0.14 },
    weight: 5,
  },

  resounding_echo: {
    id: 'resounding_echo', name: 'Resounding Echo',
    description: 'This skill repeats once, and the repeat lands 35% larger and harder than the'
      + ' first cast: one great answer instead of a chorus of small ones.',
    color: '#d8c0a0', requiresTags: ['aoe'],
    mods: [
      mod('repeatCount', 'flat', 1),
      mod('repeatScale', 'flat', 0.35),
    ],
    perLevel: [mod('repeatScale', 'flat', 0.06)],
    weight: 5,
  },

  // --- Firing-style gems -----------------------------------------------------------
  // fire 'fan' | 'salvo' | 'volley' is a projectile PRIMITIVE (see the
  // delivery schema); these gems convert between the styles, and the
  // spreadAngle / volleySpacing stats are the geometry levers.

  rattling_salvo: {
    id: 'rattling_salvo', name: 'Rattling Salvo',
    description: 'The volley converts to a SALVO: shots leave one per beat and track your aim'
      + ' as you turn, each for 35% less damage. More hits rather than a bigger one, and every'
      + ' shot rolls its own ailments and procs.',
    color: '#c8a868', requiresTags: ['projectile'],
    mods: [
      mod('fireSalvo', 'flat', 1),
      mod('damage', 'more', -0.35),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  firing_line: {
    id: 'firing_line', name: 'Firing Line',
    description: 'Shots form a rank beside you and fly parallel: +1 projectile, all loosed at'
      + ' once instead of converging on a single target.',
    color: '#a8b088', requiresTags: ['projectile'],
    mods: [
      mod('fireVolley', 'flat', 1),
      mod('projectileCount', 'flat', 1),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  close_order: {
    id: 'close_order', name: 'Close Order',
    description: 'Volley ranks stand 35% tighter together, landing the parallel wall of shot on'
      + ' a narrower front, and this skill deals 10% increased damage.',
    color: '#98a878', requiresTags: ['projectile'],
    mods: [
      mod('volleySpacing', 'more', -0.35),
      mod('damage', 'increased', 0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  choked_spread: {
    id: 'choked_spread', name: 'Choked Spread',
    description: 'Fan spread is 50% narrower and this skill deals 10% more damage:'
      + ' concentration bought with coverage.',
    color: '#b0a890', requiresTags: ['projectile'],
    mods: [
      mod('spreadAngle', 'more', -0.5),
      mod('damage', 'more', 0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 6,
  },

  cutthroat: {
    id: 'cutthroat', name: 'Cutthroat',
    description: 'Unseen strikes land 35% harder still, stacking on top of the ambush bonus you'
      + ' already carry and on backstabs.',
    color: '#5a6a88',
    mods: [mod('ambushBonus', 'flat', 0.35)],
    perLevel: [mod('ambushBonus', 'flat', 0.1)],
    weight: 5,
  },

  // --- Cursor-space gems -----------------------------------------------------------

  displaced_conjuring: {
    id: 'displaced_conjuring', name: 'Displaced Conjuring',
    description: 'Projectiles materialize at the point you aim at instead of leaving your'
      + ' hands, then fly onward from there.',
    color: '#c8b0e8', requiresTags: ['projectile'],
    mods: [mod('castAtCursor', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  puppet_strings: {
    id: 'puppet_strings', name: 'Puppet Strings',
    description: 'Shots bend toward your aim while in flight, steerable after they leave you,'
      + ' and each gem level tightens the turn.',
    color: '#d0a8e0', requiresTags: ['projectile'],
    mods: [mod('guidePower', 'flat', 2.5)],
    perLevel: [mod('guidePower', 'flat', 0.8)],
    weight: 5,
  },

  detonating_passage: {
    id: 'detonating_passage', name: 'Detonating Passage',
    description: 'The flight path detonates behind the projectile: a blast every stretch of'
      + ' travel, each dealing 35% of the skill\'s damage. Steer the shot in a curve and the'
      + ' blasts follow that arc.',
    color: '#f0b060', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:mints'],
    mods: [],
    trail: { every: 80, blast: { radius: 55, damageScale: 0.35 } },
    weight: 5,
  },

  scorched_wake: {
    id: 'scorched_wake', name: 'Scorched Wake',
    description: 'Burning ground is laid every stretch of the projectile\'s flight, each patch'
      + ' lasting 2.5 seconds and ticking for 30% of the skill\'s damage every 0.4 seconds.',
    color: '#e88a4a', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:mints'],
    mods: [],
    trail: { every: 90, zone: { radius: 40, duration: 2.5, tickInterval: 0.4, damageScale: 0.3 } },
    weight: 5,
  },

  sloughing_wake: {
    id: 'sloughing_wake', name: 'Sloughing Wake',
    description: 'Ground sheds off the shot every stretch of travel: each patch ticks for 28%'
      + ' of the skill\'s damage and contracts to nothing across its 2.8 second life. Every'
      + ' shedding reads the flight\'s pace as it falls, stretching a patch up to 2.2 times as'
      + ' long when slow and down to half as long when fast. Lob something ponderous to write a'
      + ' moat; a decelerating shot ages its trail young to old.',
    color: '#9ab84a', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:mints'],
    mods: [],
    trail: {
      every: 74,
      zone: {
        radius: 44, duration: 2.8, tickInterval: 0.45, damageScale: 0.28,
        sizeOver: { from: 1, to: 0, curve: 'quadIn' },
        durationBySpeed: { ref: 240, exp: -0.6, min: 0.5, max: 2.2 },
      },
    },
    weight: 5,
  },

  // --- Fuse gems: resolutions in arrears (FuseSpec) --------------------------
  time_fuse: {
    id: 'time_fuse', name: 'Time Fuse',
    description: 'Every resolution this skill lands, damage, ailments and on-hit effects alike,'
      + ' banks for 2 seconds and then arrives at once, rolled at your power in that moment and'
      + ' for 25% more damage. A hissing fuse tells the room it is coming while you stack the'
      + ' debt. Cannot socket into channel, guard, or aura skills.',
    color: '#d8a06a', excludeTags: ['channel', 'guard', 'aura'],
    fuse: { delay: 2, tell: 'the fuse hisses…' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('fusePower', 'increased', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  slow_match: {
    id: 'slow_match', name: 'Slow Match',
    description: 'Fused resolutions of this skill wait 50% longer and carry 40% increased fuse'
      + ' power when they finally land. Inert without a fuse, whether innate or from a socketed'
      + ' Time Fuse.',
    color: '#b08a5a',
    mods: [mod('fuseDelay', 'increased', 0.5), mod('fusePower', 'increased', 0.4)],
    perLevel: [mod('fusePower', 'increased', 0.04)],
    weight: 4, minDropLevel: 8,
  },

  grafted_carapace: {
    id: 'grafted_carapace', name: 'Grafted Carapace',
    description: 'While this guard stance holds, a rear carapace also covers its blind side'
      + ' across a 200 degree arc, eating blows whole until it breaks, then beginning to reform'
      + ' 4 seconds later. Its strength is priced off your guard rating like the shield itself,'
      + ' and it drops when the stance drops. The shell glyph shows the covered arc.',
    color: '#a8c890', requiresTags: ['guard'],
    shellGraft: { side: 'rear', arcDeg: 200, max: 55, regenDelay: 4 },
    mods: [],
    perLevel: [mod('guardStrength', 'increased', 0.04)],
    weight: 4,
  },

  // --- Ailment-stack + form gems ---------------------------------------------------

  suppuration: {
    id: 'suppuration', name: 'Suppuration',
    requiresMechanisms: ['status:stacking'],
    description: 'Stacking ailments you apply hold 2 additional stacks: poisons past eight,'
      + ' wounds past five, chills past the freeze.',
    color: '#9ac86a',
    mods: [mod('ailmentStacks', 'flat', 2)],
    perLevel: [mod('ailmentStacks', 'flat', 1)],
    weight: 6,
  },

  heavy_caliber: {
    id: 'heavy_caliber', name: 'Heavy Caliber',
    description: 'Each projectile is 30% more massive and carries +40 knockback to shove what'
      + ' it strikes, but flies 15% slower.',
    color: '#a8988a', requiresTags: ['projectile'],
    mods: [
      mod('projectileSize', 'more', 0.3),
      mod('knockback', 'flat', 40),
      mod('projectileSpeed', 'more', -0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 7,
  },

  // --- Ailment-chance gems -------------------------------------------------------
  // Each grants ONE apply_<status> stat (the generated per-status chance
  // family — passives and future affixes use the same stats). ELEMENT-
  // AGNOSTIC: the ailment derives from the HIT's damage (its hitMagnitude),
  // floored by the status's caster-less baseline — Chance to Ignite on a
  // physical Cleave burns off the physical hit. statusChance (Ailment
  // Chance) adds to these rolls; statusMagnitude (Potency) cranks the dps.

  ignite_chance: {
    id: 'ignite_chance', name: 'Chance to Ignite',
    requiresMechanisms: ['strikes'],
    description: 'Hits have a 20% chance to IGNITE, and the burn feeds on the hit\'s damage'
      + ' whatever its element.',
    color: '#ff7a2a',
    mods: [mod('apply_burn', 'flat', 0.2)],
    perLevel: [mod('apply_burn', 'flat', 0.05)],
    weight: 7,
  },

  bleed_chance: {
    id: 'bleed_chance', name: 'Chance to Bleed',
    requiresMechanisms: ['strikes'],
    description: 'Each hit carries a 25% chance to open a stacking BLEED, fed by the damage of'
      + ' the hit that opened it.',
    color: '#b03030',
    mods: [mod('apply_bleed', 'flat', 0.25)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 7,
  },

  poison_chance: {
    id: 'poison_chance', name: 'Chance to Poison',
    requiresMechanisms: ['strikes'],
    description: 'Hits inject a stacking POISON 25% of the time, fed by the damage of the hit'
      + ' that landed it.',
    color: '#7ec850',
    mods: [mod('apply_poison', 'flat', 0.25)],
    perLevel: [mod('apply_poison', 'flat', 0.05)],
    weight: 7,
  },

  chill_chance: {
    id: 'chill_chance', name: 'Chance to Chill',
    requiresMechanisms: ['strikes'],
    description: 'A 25% chance for hits to CHILL, with stacks building toward the freeze like'
      + ' any other chill.',
    color: '#7ad4ff',
    mods: [mod('apply_chill', 'flat', 0.25)],
    perLevel: [mod('apply_chill', 'flat', 0.05)],
    weight: 7,
  },

  shock_chance: {
    id: 'shock_chance', name: 'Chance to Shock',
    requiresMechanisms: ['strikes'],
    description: 'Landed hits SHOCK 20% of the time, and a shocked victim takes amplified'
      + ' damage from every hit that follows.',
    color: '#ffe14a',
    mods: [mod('apply_shock', 'flat', 0.2)],
    perLevel: [mod('apply_shock', 'flat', 0.05)],
    weight: 6,
  },

  stun_chance: {
    id: 'stun_chance', name: 'Chance to Stun',
    requiresMechanisms: ['strikes'],
    description: 'Every hit carries a 12% chance to STUN outright, the hardest control in this'
      + ' family and the rarest.',
    color: '#cccccc',
    mods: [mod('apply_stun', 'flat', 0.12)],
    perLevel: [mod('apply_stun', 'flat', 0.03)],
    weight: 5,
  },

  freeze_chance: {
    id: 'freeze_chance', name: 'Chance to Freeze',
    requiresMechanisms: ['strikes'],
    description: 'There is a 6% chance for a hit to FREEZE solid, straight to ice with no chill'
      + ' buildup first.',
    color: '#d8f4ff',
    mods: [mod('apply_frozen', 'flat', 0.06)],
    perLevel: [mod('apply_frozen', 'flat', 0.02)],
    weight: 4,
  },

  provocation: {
    id: 'provocation', name: 'Provocation',
    requiresMechanisms: ['strikes'],
    description: 'Struck enemies are TAUNTED 35% of the time: the victim turns its attacks on'
      + ' you, and everything it swings at anyone else lands soft. Enemies that refuse the turn'
      + ' still pull their punches.',
    color: '#e0763a',
    mods: [mod('apply_taunted', 'flat', 0.35)],
    perLevel: [mod('apply_taunted', 'flat', 0.06)],
    weight: 5,
  },

  // THE HARROWING pair (the Gloamwood country's fear-craft, unlocked by
  // walking the manor — the manor_entered pool). Fear is the CC that
  // REPOSITIONS: build stacks, break nerve, fight the rout.
  unnerving: {
    id: 'unnerving', name: 'Unnerving',
    requiresMechanisms: ['strikes'],
    description: 'Hits build HARROWING 30% of the time toward a broken-nerve rout, and your'
      + ' hits land 12% harder for each harrowing stack the victim already wears.',
    color: '#b8a4d8',
    mods: [mod('apply_harrowing', 'flat', 0.3), mod('damageVs_harrowing', 'flat', 0.12)],
    perLevel: [mod('apply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  haunted_service: {
    id: 'haunted_service', name: 'Haunted Service',
    description: 'Your minions\' hits carry a 25% chance to build HARROWING, and your minions'
      + ' deal 15% increased damage.',
    color: '#9a86c8', requiresTags: ['minion'],
    mods: [mod('minionApply_harrowing', 'flat', 0.25), mod('minionDamage', 'increased', 0.15)],
    perLevel: [mod('minionApply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  potency: {
    id: 'potency', name: 'Potency',
    requiresMechanisms: ['status:power'],
    description: 'Ailments you apply are 30% increased in magnitude, hit-fed and baseline'
      + ' alike, skill-native and chance-granted alike.',
    color: '#c88ad0',
    mods: [mod('statusMagnitude', 'increased', 0.3)],
    perLevel: [mod('statusMagnitude', 'increased', 0.08)],
    weight: 6,
  },

  conflagrant: {
    id: 'conflagrant', name: 'Conflagrant',
    requiresMechanisms: ['status:power'],
    description: 'Fire ailments applied by this skill have 35% more magnitude, a multiplier'
      + ' that compounds past every increase you have already stacked.',
    color: '#ff6a3a', requiresTags: ['fire'],
    mods: [mod('statusMagnitude', 'more', 0.35, ['fire'])],
    perLevel: [mod('statusMagnitude', 'more', 0.06, ['fire'])],
    weight: 5,
  },

  // --- Damage conversion -------------------------------------------------------

  flameforged: {
    id: 'flameforged', name: 'Flameforged',
    requiresMechanisms: ['strikes'],
    description: 'Converts 50% of this skill\'s physical damage into fire damage, rising to'
      + ' full conversion at maximum gem level. Conversion stats from passives apply as well.',
    color: '#e87838', requiresTags: ['physical'],
    mods: [mod('convert_physical_fire', 'flat', 0.5)],
    perLevel: [mod('convert_physical_fire', 'flat', 0.125)],
    weight: 7,
  },

  // --- Repeats & salvos ----------------------------------------------------------

  multistrike: {
    id: 'multistrike', name: 'Multistrike',
    description: 'The supported melee skill strikes two extra times in rapid succession, each'
      + ' repeat re-aiming at the nearest enemy, and you are locked into the flurry once it'
      + ' starts. 25% less damage.',
    color: '#e09858', requiresTags: ['melee'], excludeTags: ['channel'],
    mods: [
      mod('repeatCount', 'flat', 2),
      mod('repeatRetarget', 'override', 1),
      mod('repeatLock', 'override', 1),
      mod('damage', 'more', -0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 7,
  },

  spell_echo: {
    id: 'spell_echo', name: 'Spell Echo',
    description: 'Spells echo once, re-casting themselves while you are locked in the gesture. 15% less damage.',
    color: '#8a9ae8', requiresTags: ['spell'],
    excludeTags: ['channel', 'summon', 'aura', 'movement', 'totem', 'mine', 'trap'],
    mods: [
      mod('repeatCount', 'flat', 1),
      mod('repeatLock', 'override', 1),
      mod('damage', 'more', -0.15),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 7,
  },

  cascade: {
    id: 'cascade', name: 'Cascade',
    description: 'The skill\'s effect plays out one extra time, a beat later. 20% less damage.',
    color: '#78b8d8', requiresTags: ['aoe'], excludeTags: ['channel'],
    mods: [
      mod('repeatCount', 'flat', 1),
      mod('damage', 'more', -0.2),
    ],
    perLevel: [mod('repeatCount', 'flat', 0.5)],
    weight: 7,
  },

  crescendo: {
    id: 'crescendo', name: 'Crescendo',
    description: 'The effect repeats twice more, each repetition 30% larger and harder-hitting'
      + ' than the one before it. 35% less damage.',
    color: '#d888c8', requiresTags: ['aoe'], excludeTags: ['channel'],
    mods: [
      mod('repeatCount', 'flat', 2),
      mod('repeatScale', 'flat', 0.3),
      mod('damage', 'more', -0.35),
    ],
    perLevel: [mod('repeatScale', 'flat', 0.05)],
    weight: 6,
  },

  unleash: {
    id: 'unleash', name: 'Unleash',
    description: 'Banks one Seal per 1.4 seconds of true rest, up to 2; time spent on the cast'
      + ' bar banks nothing. Each press spends the bank, firing one extra time per Seal in a'
      + ' rapid salvo. The idleness is paid before the press, and everything the skill sends'
      + ' out deals 25% less damage.',
    color: '#b8d858', excludeTags: ['channel', 'movement', 'summon', 'aura', 'totem'],
    mods: [
      mod('unleashMax', 'flat', 2),
      mod('damage', 'more', -0.25),
    ],
    perLevel: [mod('unleashMax', 'flat', 0.5)],
    weight: 6,
  },

  // --- Melee impact ----------------------------------------------------------------

  reverberation: {
    id: 'reverberation', name: 'Reverberation',
    description: 'Each melee strike from this skill rings outward to hit one additional nearby'
      + ' enemy beyond the arc\'s reach.',
    color: '#c8a878', requiresTags: ['melee'],
    mods: [mod('meleeReverb', 'flat', 1)],
    perLevel: [mod('meleeReverb', 'flat', 0.5)],
    weight: 8,
  },

  splash: {
    id: 'splash', name: 'Splintering Impact',
    description: 'Every hit splashes to enemies standing close around the target, dealing half'
      + ' damage to them. The skill itself deals 10% less damage.',
    color: '#a8c8d8', requiresTags: ['melee', 'projectile'],
    mods: [mod('splashRadius', 'flat', 60), mod('damage', 'more', -0.1)],
    perLevel: [mod('splashRadius', 'flat', 12)],
    weight: 8,
  },

  // --- DoT & curse ecosystem -------------------------------------------------

  virulence: {
    id: 'virulence', name: 'Virulence',
    requiresMechanisms: ['affliction'],
    description: 'When a victim dies carrying damage over time from this skill, the affliction'
      + ' spreads to nearby enemies, chaining onward from each death.',
    color: '#78c878',
    mods: [mod('dotPropagates', 'override', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 7,
  },

  hex_blast: {
    id: 'hex_blast', name: 'Hex Blast',
    description: 'The cursed area detonates 0.9s after the cast, dealing 250% of the curse\'s latent damage.',
    color: '#b06bd4', requiresTags: ['curse'],
    mods: [mod('hexBlast', 'flat', 2.5)],
    perLevel: [mod('hexBlast', 'flat', 0.5)],
    weight: 7,
  },

  no_mans_land: {
    id: 'no_mans_land', name: "No Man's Land",
    description: 'The skill\'s area leaves a lingering damage field for 2.5 seconds.',
    color: '#a88858', requiresTags: ['aoe'],
    mods: [mod('lingerField', 'flat', 2.5)],
    perLevel: [mod('lingerField', 'flat', 0.6)],
    weight: 7,
  },

  // --- The Scentcraft gems (the Garden's pheromone-craft; pooled behind
  // 'nest_entered' — the formicary unlocks the discipline) -------------------
  heavy_musk: {
    id: 'heavy_musk', name: 'Heavy Musk',
    description: 'Afflictions laid by this skill have 40% increased duration and 20% increased'
      + ' area of effect, at 20% increased mana cost.',
    color: '#c8a86a', requiresTags: ['curse'],
    mods: [
      mod('effectDuration', 'increased', 0.4),
      mod('aoeRadius', 'increased', 0.2),
      mod('manaCost', 'increased', 0.2),
    ],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 6,
  },
  candied_scent: {
    id: 'candied_scent', name: 'Candied Scent',
    requiresMechanisms: ['strikes'],
    description: 'Hits from this skill have a 25% chance to taunt the victim into attacking'
      + ' you, and the skill\'s effects have 15% increased duration.',
    color: '#e8cf7a', requiresTags: ['duration'],
    mods: [
      mod('apply_taunted', 'flat', 0.25),
      mod('effectDuration', 'increased', 0.15),
    ],
    perLevel: [mod('apply_taunted', 'flat', 0.04)],
    weight: 5,
  },
  startling_reek: {
    id: 'startling_reek', name: 'Startling Reek',
    requiresMechanisms: ['strikes'],
    description: 'Blows from this skill carry a 20% chance to apply BOLTED, sending the victim'
      + ' fleeing outright, at the price of 15% less damage.',
    color: '#d8b84a', requiresTags: ['attack', 'spell'],
    mods: [
      mod('apply_bolted', 'flat', 0.2),
      mod('damage', 'more', -0.15),
    ],
    perLevel: [mod('apply_bolted', 'flat', 0.03)],
    weight: 5,
  },

  malfeasance: {
    id: 'malfeasance', name: 'Malfeasance',
    description: 'Curses applied by this skill RUPTURE when they expire, dealing 250% of the curse\'s latent damage around the victim.',
    color: '#9858a8', requiresTags: ['curse'],
    mods: [mod('curseRupture', 'flat', 2.5)],
    perLevel: [mod('curseRupture', 'flat', 0.5)],
    weight: 7,
  },

  malpractice: {
    id: 'malpractice', name: 'Malpractice',
    requiresMechanisms: ['affliction'],
    description: 'Damage-over-time effects applied by this skill rupture at the end of their duration, dealing 80% of their total damage at once.',
    color: '#a85878',
    mods: [mod('dotRupture', 'flat', 0.8)],
    perLevel: [mod('dotRupture', 'flat', 0.15)],
    weight: 7,
  },

  hedonism: {
    id: 'hedonism', name: 'Hedonism',
    description: 'Targets cursed by this skill also gain 25% more attack and cast speed, and'
      + ' each of your own allies in the area has a 50% chance to catch the curse too. 15%'
      + ' increased area of effect.',
    color: '#e878a8', requiresTags: ['curse'],
    mods: [mod('hedonism', 'override', 1), mod('aoeRadius', 'increased', 0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 6,
  },

  // --- Projectile impact behaviors ---------------------------------------------

  forking: {
    id: 'forking', name: 'Forking',
    description: 'Projectiles from this skill split into two on impact, and the children'
      + ' inherit the parent\'s flight pattern, so spirals fork into spirals.',
    color: '#a0c8a0', requiresTags: ['projectile'],
    mods: [mod('forkCount', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  returning: {
    id: 'returning', name: 'Returning',
    description: 'Spent projectiles fly back to where they were cast from, striking everything again on the way.',
    color: '#88b8d8', requiresTags: ['projectile'],
    mods: [mod('projReturn', 'override', PROJ_RETURN.origin)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  boomerang: {
    id: 'boomerang', name: 'Boomerang',
    description: 'Once spent, projectiles turn and track back to you wherever you have moved'
      + ' since the cast, striking everything again on the way in.',
    color: '#68a8c8', requiresTags: ['projectile'],
    mods: [mod('projReturn', 'override', PROJ_RETURN.caster)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 7,
  },

  // --- Minion blessings ----------------------------------------------------------

  belligerence_gem: {
    id: 'belligerence_gem', name: 'Belligerence',
    description: 'Minions from this skill notice enemies 50% farther away.',
    color: '#d8a848', requiresTags: ['summon'],
    mods: [mod('minionDetectionRange', 'increased', 0.5)],
    perLevel: [mod('minionDetectionRange', 'increased', 0.12)],
    weight: 8,
  },

  furor_gem: {
    id: 'furor_gem', name: 'Furor',
    description: 'Minions from this skill move, attack and cast 25% faster.',
    color: '#e8c848', requiresTags: ['summon'],
    mods: [mod('minionHaste', 'increased', 0.25)],
    perLevel: [mod('minionHaste', 'increased', 0.06)],
    weight: 7,
  },

  undying_loyalty: {
    id: 'undying_loyalty', name: 'Undying Loyalty',
    description: 'Slain minions refuse to fall: their death effects fire (Martyrdom included), then they fight on for 3 more seconds before expiring.',
    color: '#b8a0e0', requiresTags: ['summon'],
    mods: [mod('minionUndying', 'flat', 3)],
    perLevel: [mod('minionUndying', 'flat', 0.75)],
    weight: 6,
  },

  soulwalk: {
    id: 'soulwalk', name: 'Soulwalk',
    description: 'When no corpse is available, this corpse skill may target one of your living'
      + ' minions instead, leaving it unharmed and unconsumed.',
    color: '#88a8c8', requiresTags: ['corpse'],
    mods: [mod('targetMinionFallback', 'override', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.06)],
    weight: 7,
  },

  sacrificial_rites: {
    id: 'sacrificial_rites', name: 'Sacrificial Rites',
    description: 'With no corpse to hand, this skill may kill one of your own minions to supply'
      + ' one. That death counts in full, so Martyrdom and other on-death effects fire.',
    color: '#b04868', requiresTags: ['corpse'],
    mods: [mod('sacrificeMinions', 'override', 1)],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 6,
  },

  corpse_wagon: {
    id: 'corpse_wagon', name: 'Corpse Wagon',
    description: 'This skill handles up to 2 additional corpses per cast: detonations eat the'
      + ' whole pile into one greater blast, raisings stand the row up together, offerings burn'
      + ' wider and longer, and Exhume digs its full load in one turn of the spade. The wagon'
      + ' is heavy, so 15% less cast speed.',
    color: '#8a7a58', requiresTags: ['corpse'],
    // One destination whatever the load — Corpse Shift can't spend a pile,
    // so the wagon refuses the hitch rather than ride along inert.
    excludeTags: ['movement'],
    mods: [
      mod('corpseBatch', 'flat', 2),
      mod('castSpeed', 'more', -0.15),
    ],
    // The load grows with the driver: +1 body every 4 levels.
    perLevel: [mod('corpseBatch', 'flat', 0.25)],
    weight: 6,
  },

  spirit_totem: {
    id: 'spirit_totem', name: 'Spirit Totem',
    description: 'The supported skill is cast by a planted totem instead of by you, for 25%'
      + ' less damage. Planting takes twice the skill\'s own cast time, and higher gem levels'
      + ' quicken the totem\'s casting.',
    color: '#c89868',
    requiresTags: ['attack', 'spell'],
    // 'mirage'/'clone' cross-exclusion: a totem-intercepted cast never runs
    // the echo hooks (the echo gem would be dead weight), and vice versa.
    excludeTags: ['aura', 'summon', 'totem', 'trap', 'mine', 'movement', 'warcry', 'buff', 'mirage', 'clone'],
    grantsTags: ['totem'],
    mods: [
      mod('castAsTotem', 'override', 1),
      mod('damage', 'more', -0.25),
    ],
    perLevel: [
      mod('damage', 'increased', 0.07),
      mod('constructCastRate', 'increased', 0.06),
    ],
    weight: 6,
  },

  pinpoint: {
    id: 'pinpoint', name: 'Pinpoint',
    description: 'Fires one fewer projectile, never dropping below one, and each remaining shot'
      + ' flies 25% faster and deals 35% more damage.',
    color: '#e8f0ff', requiresTags: ['projectile'],
    mods: [
      mod('projectileCount', 'flat', -1),
      mod('projectileSpeed', 'increased', 0.25),
      mod('damage', 'more', 0.35),
    ],
    perLevel: [mod('damage', 'more', 0.04)],
    weight: 7,
  },

  alacrity: {
    id: 'alacrity', name: 'Alacrity',
    description: 'Cooldowns on the supported skill recover 30% faster. The gem needs a clock to'
      + ' serve, so it stays dormant on a skill with no cooldown until another source stands'
      + ' one up, such as a levy gem or a granted magazine.',
    color: '#8ae0e8',
    // The golden rule's debut: the refusal is STRUCTURAL (the 'cooldown'
    // mechanism predicate over the live instance), never a skill list —
    // socket Austerity beside it and the door opens by construction.
    requiresMechanisms: ['cooldown'],
    mods: [mod('cooldownRecovery', 'increased', 0.3)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.08)],
    weight: 8,
  },

  phantasmal_echo: {
    id: 'phantasmal_echo', name: 'Phantasmal Echo',
    description: 'Each completed use of the supported skill binds a mirage of you at your'
      + ' shoulder for 5 seconds. The mirage re-casts the skill, sockets and all, at nearby'
      + ' foes on its own slower clock for 45% of your damage. 30% more mana cost.',
    color: '#8fd4c8',
    requiresTags: ['attack', 'spell'],
    // 'targeted' excluded: side-effect-laden target eaters are refused by
    // the engine's echoable guard — the gem would be a dead mana tax.
    excludeTags: ['movement', 'aura', 'summon', 'buff', 'warcry', 'totem',
      'trap', 'mine', 'corpse', 'channel', 'guard', 'clone', 'targeted'],
    grantsTags: ['mirage'],
    // The flat +1 IS the rider (spec count 0) — socketed into Mirage Archer
    // it becomes the second archer instead (the composition rule).
    mods: [mod('mirageCount', 'flat', 1), mod('manaCost', 'more', 0.3)],
    echo: {
      mode: 'hover', count: 0, duration: 5, interval: 1.1,
      range: 440, glideSpeed: 340, hoverRadius: 46, damageFactor: 0.45,
    },
    perLevel: [mod('mirageDamage', 'increased', 0.07)],
    weight: 6,
  },

  ancestral_call: {
    id: 'ancestral_call', name: 'Ancestral Call',
    description: 'On each completed use of the supported melee skill, an ancestor ghost glides'
      + ' at a nearby foe to swing once for 60% of your damage, if it arrives inside its 0.45'
      + ' second existence. Increasing effect duration lets it range further afield. 25% more'
      + ' mana cost.',
    color: '#c8a86a',
    requiresTags: ['melee'],
    excludeTags: ['movement', 'totem', 'trap', 'mine', 'corpse', 'channel', 'guard', 'clone', 'targeted'],
    grantsTags: ['mirage'],
    mods: [mod('mirageCount', 'flat', 1), mod('manaCost', 'more', 0.25)],
    // Reach = glideSpeed × duration: ~125u of glide — the NEXT enemy in the
    // pack you are already inside. Acquisition (240) deliberately outruns
    // the budget: the far band WHIFFS unless effectDuration investment
    // extends the ghost's stay (engine-capped at 2s of glide).
    echo: {
      mode: 'strike', count: 0, duration: 0.45, range: 240,
      glideSpeed: 280, damageFactor: 0.6, casts: 1,
    },
    perLevel: [mod('mirageDamage', 'increased', 0.06)],
    weight: 7,
  },

  vessel_of_shadow: {
    id: 'vessel_of_shadow', name: 'Vessel of Shadow',
    description: 'The clone is given flesh: one killable shadow-self stands for 12 seconds and'
      + ' fights beside you with its own knives. It is an autonomous minion scaling with your'
      + ' minion investment, and it echoes none of your casts.',
    color: '#4a4066',
    requiresTags: ['clone'],
    grantsTags: ['minion', 'summon'],
    summon: { type: 'summon', monsterId: 'shadow_self', count: 1, maxActive: 1, duration: 12 },
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.08)],
    weight: 5,
  },

  synchronicity: {
    id: 'synchronicity', name: 'Synchronicity',
    description: 'Your echoes act 40% more often: mirage clocks quicken, and shadow clones'
      + ' mirror your strikes more frequently.',
    color: '#b8a8e8',
    requiresTags: ['mirage', 'clone'],
    mods: [mod('constructCastRate', 'more', 0.4)],
    perLevel: [mod('constructCastRate', 'increased', 0.06)],
    weight: 6,
  },

  sweeping_blow: {
    id: 'sweeping_blow', name: 'Sweeping Blow',
    description: 'The supported melee arc leaves your hands: a crescent wave built from the'
      + ' cone\'s own geometry travels forward, striking each enemy exactly once. 20% less'
      + ' damage and 35% more mana cost.',
    color: '#c8a05e',
    requiresTags: ['melee'],
    // Natively-sweeping skills (Reap) refuse the dead socket.
    excludeTags: ['sweep'],
    grantsTags: ['aoe', 'duration'],
    mods: [
      mod('meleeSweep', 'override', 1),
      mod('damage', 'more', -0.2),
      mod('manaCost', 'more', 0.35),
    ],
    perLevel: [mod('sweepRange', 'increased', 0.08)],
    weight: 6,
  },

  mana_feeder: {
    id: 'mana_feeder', name: 'Mana Feeder',
    description: 'This skill costs 50% more mana (+5 flat), and 80% of the mana spent on each'
      + ' use returns as added damage on the primary strike: the cast itself, never its echoes'
      + ' or aftershocks. Anything that raises the cost raises the payoff.',
    color: '#5a8ae8',
    // THE FEEDER LOCALITY (2026-07-22): the strikes floor replaces the old
    // hand-rolled tag ban — never-striking hosts refuse structurally and the
    // refusal self-lifts beside a strike-granting graft. Summon/minion stay
    // tag-banned deliberately: locality pays the PRIMARY cast, and a
    // summon's primary never strikes (the crew hop must not re-open the
    // trap socket).
    requiresMechanisms: ['strikes'],
    excludeTags: ['summon', 'minion'],
    mods: [
      mod('manaCost', 'more', 0.5),
      mod('addedManaCost', 'flat', 5),
      mod('costDamage_mana', 'flat', 0.8),
    ],
    perLevel: [mod('costDamage_mana', 'flat', 0.12)],
    weight: 6,
  },

  enduring_bond: {
    id: 'enduring_bond', name: 'Enduring Bond',
    description: 'Decaying minions from this skill rot 40% slower, but deal 20% less damage for'
      + ' the borrowed time. The decay still ends them, just later.',
    color: '#8a6ad8',
    requiresTags: ['minion'],
    mods: [
      mod('minionDecayRate', 'more', -0.4),
      mod('minionDamage', 'more', -0.2),
    ],
    perLevel: [mod('minionLife', 'increased', 0.06)],
    weight: 5,
  },

  vital_bond: {
    id: 'vital_bond', name: 'Vital Bond',
    description: 'This skill\'s minions regenerate 3 life plus 0.8% of their maximum life per'
      + ' second. Socket it where you want the mending: only this skill\'s minions heal.',
    color: '#8ae0a0',
    requiresTags: ['minion'],
    mods: [mod('minionRegen', 'flat', 3), mod('minionRegenPct', 'flat', 0.008)],
    perLevel: [mod('minionRegen', 'flat', 1), mod('minionRegenPct', 'flat', 0.002)],
    weight: 8,
  },

  bloodletters_rhythm: {
    id: 'bloodletters_rhythm', name: "Bloodletter's Rhythm",
    requiresMechanisms: ['strikes'],
    description: 'This skill gains 10% chance to bleed, and every bleed it applies has a 35%'
      + ' chance to bank a Fury charge.',
    color: '#c03030',
    requiresTags: ['attack'],
    mods: [mod('proc_bloodletters_rhythm', 'flat', 0.35), mod('apply_bleed', 'flat', 0.10)],
    perLevel: [mod('proc_bloodletters_rhythm', 'flat', 0.05)],
    weight: 7,
  },

  exposure: {
    id: 'exposure', name: 'Exposure',
    requiresMechanisms: ['strikes'],
    description: 'Hits from this skill have a 30% chance to leave the target VULNERABLE: 8%'
      + ' more damage taken per stack, up to five. Minion skills pass the chance to their'
      + ' minions. The opener half of the Execution economy.',
    color: '#d878b0',
    mods: [mod('apply_vulnerable', 'flat', 0.3)],
    perLevel: [mod('apply_vulnerable', 'flat', 0.06)],
    weight: 6,
  },

  bristling_riposte: {
    id: 'bristling_riposte', name: 'Bristling Riposte',
    description: 'This skill\'s hits carry 80% of your flat thorns as added physical damage.'
      + ' Thorns from passives like Bristleback and from gear scale the strike.',
    color: '#b09060', requiresTags: ['melee', 'attack'],
    mods: [mod('thornsToHit', 'flat', 0.8)],
    perLevel: [mod('thornsToHit', 'flat', 0.15)],
    weight: 5,
  },

  // --- The mender's kit ('heal'-tag gates — the healer support family) ------

  intensive_care: {
    id: 'intensive_care', name: 'Intensive Care',
    description: '40% increased HEALING POWER on the socketed skill: mends, streams, bursts and'
      + ' siphons alike.',
    color: '#7ec88a', requiresTags: ['heal'],
    mods: [mod('healPower', 'increased', 0.4)],
    perLevel: [mod('healPower', 'increased', 0.1)],
    weight: 7,
  },

  mending_chain: {
    id: 'mending_chain', name: 'Mending Chain',
    description: 'Heals from this skill chain to 2 further allies, each hop finding the most'
      + ' wounded untouched friend nearby at 75% strength per hop. Costs 30% more mana.',
    color: '#8ad8c8', requiresTags: ['heal'],
    mods: [mod('chainCount', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  overmend: {
    id: 'overmend', name: 'Overmend',
    description: 'Healing from this skill that lands past full life hardens into an absorption'
      + ' ward worth 60% of the spill. Top the bar, then keep pouring.',
    color: '#d8e8f8', requiresTags: ['heal'],
    mods: [mod('overheal', 'flat', 0.6)],
    perLevel: [mod('overheal', 'flat', 0.12)],
    weight: 6,
  },

  // --- Fragment gems (remnant KINDS — see data/remnants.ts) -----------------
  // Each grants ONE remnantDrop_<kind> stat: kills by the socketed skill
  // shed physical pickups whose payload lives in the registry. Offensive /
  // defensive split by data, not code.

  fragmentation: {
    id: 'fragmentation', name: 'Fragmentation',
    description: 'Kills by this skill have a 25% chance to shed a FEROCITY fragment. Walk over'
      + ' it to gain stacking damage; the fight feeds the fight.',
    color: '#e8784a',
    mods: [mod('remnantDrop_ferocity', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_ferocity', 'flat', 0.06)],
    weight: 6,
  },

  bulwark_shards: {
    id: 'bulwark_shards', name: 'Bulwark Shards',
    description: 'A kill by this skill has a 20% chance to flake off a BULWARK shard. Walk over'
      + ' one to wear it: stacking armor, scavenged mid-fight.',
    color: '#8aa8c8',
    mods: [mod('remnantDrop_bulwark', 'flat', 0.2)],
    perLevel: [mod('remnantDrop_bulwark', 'flat', 0.05)],
    weight: 6,
  },

  rage_remnants: {
    id: 'rage_remnants', name: 'Rage Remnant',
    description: 'Kills with this attack have a 25% chance to drop a RAGE mote worth two'
      + ' charges. Feed the Berserk economy without earning the charges by hand.',
    color: '#e04030', requiresTags: ['attack'],
    mods: [mod('remnantDrop_rage', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_rage', 'flat', 0.06)],
    weight: 5,
  },

  remnant_conduit: {
    id: 'remnant_conduit', name: 'Remnant Conduit',
    description: 'Casts of this skill have a 12% chance to shed an elemental REMNANT a step'
      + ' away. Walk over it and your next cast of that element is empowered. Cast, step, cast.',
    color: '#e8c86a',
    requiresTags: ['fire', 'cold', 'lightning'],
    mods: [mod('remnantOnCast', 'flat', 0.12)],
    perLevel: [mod('remnantOnCast', 'flat', 0.03)],
    weight: 7,
  },

  metronome: {
    id: 'metronome', name: 'Metronome',
    requiresMechanisms: ['strikes'],
    description: 'Landed hits from this skill have a 50% chance to build TEMPO: attack and cast'
      + ' speed, up to 8 stacks. One hit taken wipes every stack.',
    color: '#7ae0c8',
    requiresTags: ['attack', 'spell'],
    mods: [mod('proc_tempo', 'flat', 0.5)],
    perLevel: [mod('proc_tempo', 'flat', 0.06)],
    weight: 7,
  },

  colossus_stance: {
    id: 'colossus_stance', name: 'Colossus Stance',
    description: 'Plant your feet for a full second and this skill deals 28% more damage with'
      + ' 20% increased area of effect; strike within a step (0.15s of moving) and it deals 10%'
      + ' less damage. Starting a cast does not count as planting: the feet set first, then'
      + ' casting holds the stance.',
    color: '#c8b088',
    // Summon/aura/buff sockets are traps: minions and toggles never route
    // their hits through the host instance's conditional mods (the
    // mana_feeder precedent — "no hit to receive the bonus").
    excludeTags: ['totem', 'trap', 'mine', 'movement', 'summon', 'minion', 'aura', 'buff', 'warcry'],
    mods: [
      mod('damage', 'more', 0.28, undefined, 'stationary'),
      mod('aoeRadius', 'increased', 0.20, undefined, 'stationary'),
      mod('damage', 'more', -0.10, undefined, 'moving'),
    ],
    perLevel: [mod('damage', 'more', 0.02, undefined, 'stationary')],
    weight: 7,
  },

  transfusion_bond: {
    id: 'transfusion_bond', name: 'Transfusion Bond',
    description: 'Minions from this skill regenerate 6 life plus 2% of their maximum life per'
      + ' second, and deal 25% less damage.',
    color: '#b06888',
    requiresTags: ['minion'],
    mods: [
      mod('minionRegenPct', 'flat', 0.02),
      mod('minionRegen', 'flat', 6),
      mod('minionDamage', 'more', -0.25),
    ],
    perLevel: [mod('minionRegenPct', 'flat', 0.003)],
    weight: 6,
  },

  controlled_burn: {
    id: 'controlled_burn', name: 'Controlled Burn',
    description: 'The overdrive debt on this skill repays at a 35% rate even while you keep'
      + ' casting, but all recovery is 25% slower.',
    color: '#e8a04a',
    requiresTags: ['overdrive'],
    mods: [
      mod('overdriveFlow', 'flat', 0.35),
      mod('overdriveRecovery', 'more', -0.25),
    ],
    perLevel: [mod('overdriveFlow', 'flat', 0.04)],
    weight: 6,
  },

  // --- Seals, Forms & Founts (the §1/§2 batch) --------------------------------

  anchored_focus: {
    id: 'anchored_focus', name: 'Anchored Focus',
    description: 'The channel\'s aim locks when the button is pressed: pulses and the release'
      + ' land at the original mark no matter where the cursor wanders, and the skill deals 15%'
      + ' more damage.',
    color: '#a8a8d8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelLockAim', 'flat', 1), mod('damage', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  reckless_breadth: {
    id: 'reckless_breadth', name: 'Reckless Breadth',
    description: 'Widens this skill\'s melee swing: 80% increased arc, but 30% less reach.'
      + ' Stack attack speed on a flurry to make the most of the breadth.',
    color: '#e88a68', requiresTags: ['melee'],
    mods: [
      mod('swingArc', 'increased', 0.8),
      mod('meleeReach', 'more', -0.3),
    ],
    perLevel: [mod('swingArc', 'increased', 0.15)],
    weight: 6,
  },

  communal_rites: {
    id: 'communal_rites', name: 'Communal Rites',
    description: '35% of any minion blessing this skill grants also applies to you. Socket it'
      + ' into whichever summon carries the offering you want shared.',
    color: '#c8b8d8', requiresTags: ['minion'],
    mods: [mod('offeringShare', 'flat', 0.35)],
    perLevel: [mod('offeringShare', 'flat', 0.08)],
    weight: 5,
  },

  deep_reserves: {
    id: 'deep_reserves', name: 'Deep Reserves',
    description: 'Grafts a 2-round bank onto a skill with none, 3 in all with this gem\'s own'
      + ' +1 charge, though rounds refill 15% slower. Cooldown skills carry their uses as a'
      + ' magazine; free skills gain an EMPOWER bank, each banked round spent for a 20%'
      + ' stronger cast, dry casts plain. Rounds return one per 4 seconds of holding fire, and'
      + ' any cast restarts the clock.',
    color: '#d8c86a',
    // The GRANT (useChargeGraft): chargeless hosts stand a 2-round bank up
    // (3 with this gem's own +1) — magazine on the host's cooldown, or the
    // EMPOWER bank (optional fuel: never a gate, never a conversion) on
    // the 4s trickle where no clock exists. Native banks/munitions win.
    // THE INVERTED RATE (2026-07-22, the specialization price): the old
    // +25% skillChargeRate line was DEAD on cooldown hosts (the drip lane
    // read only cooldownRecovery — deep-lane ablation, 26/26). The drip
    // now reads the rate stat too, so ONE inverted line prices every bank
    // this graft stands up; the malus softens 1%/gem-level.
    useChargeGraft: { rounds: 2, recharge: 4, empower: 0.2 },
    mods: [
      mod('skillCharges', 'flat', 1),
      mod('skillChargeRate', 'increased', -0.15),
    ],
    perLevel: [mod('skillChargeRate', 'increased', 0.01)],
    weight: 6,
  },

  // --- Munition supports (the ammunition fabric's investment lane) ----------
  // All gated on the 'munition' tag: the guns, not the cadence family.
  // The shared-sockets rule (convert mints ride the slot's gems) is what
  // lets reloadSpeed here reach the gun's OWN reload cast.

  bandolier: {
    id: 'bandolier', name: 'Bandolier',
    description: '+2 rounds in the supported skill\'s bank at the price of 10% reduced damage.'
      + ' More shots between reloads, each landing softer.',
    color: '#c8a878', requiresTags: ['munition'],
    mods: [
      mod('skillCharges', 'flat', 2),
      mod('damage', 'increased', -0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.02)],
    weight: 7,
  },

  swift_hands: {
    id: 'swift_hands', name: 'Swift Hands',
    description: '40% increased reload speed, and magazine clocks (this skill\'s own cooldown)'
      + ' recover 25% faster.',
    color: '#e8d8a0', requiresTags: ['munition'],
    mods: [
      mod('reloadSpeed', 'increased', 0.4),
      mod('cooldownRecovery', 'increased', 0.25),
    ],
    perLevel: [mod('reloadSpeed', 'increased', 0.06)],
    weight: 7,
  },

  dead_mans_round: {
    id: 'dead_mans_round', name: "Dead Man's Round",
    description: 'The last round in this skill\'s bank deals 50% more damage. Spend down to it,'
      + ' or reload short of full and live at the bottom of the drum.',
    color: '#d86048', requiresTags: ['munition'],
    mods: [mod('finalRoundDamage', 'more', 0.5)],
    perLevel: [mod('finalRoundDamage', 'more', 0.05)],
    weight: 5,
  },

  // THE MUNITION CONVERSION (SupportDef.munition) — Gathered Casting's
  // sibling lane: any cast becomes an AMMUNITION skill. Three chambered
  // rounds, each cast entirely normal but genuinely LARGER — more damage,
  // wider area, surer ailments, longer-lived work — then the empty press
  // becomes the Re-energize rite (engine DEFAULT_RELOAD_SKILL). grantsTags
  // hands the host 'munition', so Swift Hands quickens ITS rack, Bandolier
  // deepens ITS chambers, and Dead Man's Round crowns ITS final shot — the
  // whole gun family composes onto a fireball. (No meta rack on purpose:
  // metas are seat-bound, and the munition FIELD rides minions — a future
  // crew-facing munition gem forwards whole, its minions running the same
  // rack cycle the bandits do; this one excludes summons for its own feel.)
  chambered_casting: {
    id: 'chambered_casting', name: 'Chambered Casting',
    description: 'Chambers this skill into 3 rounds: each cast deals 20% more damage with 30%'
      + ' increased area, +25% status chance and 25% increased effect duration. Spent dry, the'
      + ' next press RE-ENERGIZES the chamber before the skill casts again.',
    color: '#9ae0c8',
    requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'flask', 'aura', 'summon', 'totem', 'guard'],
    grantsTags: ['munition'],
    munition: { rounds: 3 },
    mods: [
      mod('damage', 'more', 0.2),
      mod('aoeRadius', 'increased', 0.3),
      mod('statusChance', 'flat', 0.25),
      mod('effectDuration', 'increased', 0.25),
    ],
    perLevel: [
      mod('damage', 'more', 0.03),
      mod('aoeRadius', 'increased', 0.04),
    ],
    weight: 6,
  },

  // --- Trajectory levers (the §4 batch) ---------------------------------------

  ricochet: {
    id: 'ricochet', name: 'Ricochet',
    description: 'Projectiles from this skill bounce off rocks, walls and masonry twice before'
      + ' dying. Fire into a canyon and let the terrain do the aiming; composes with any flight'
      + ' pattern.',
    color: '#b0b8a0', requiresTags: ['projectile'],
    mods: [mod('projBounce', 'flat', 2)],
    perLevel: [mod('projBounce', 'flat', 1)],
    weight: 6,
  },

  recurve: {
    id: 'recurve', name: 'Recurve',
    description: 'A 35% chance for this skill\'s projectiles to whip around and strike the same'
      + ' victim again, the chance decaying with each return.',
    color: '#d8a8b8', requiresTags: ['projectile'],
    mods: [mod('projRecurve', 'flat', 0.35)],
    perLevel: [mod('projRecurve', 'flat', 0.08)],
    weight: 5,
  },

  shredding_return: {
    id: 'shredding_return', name: 'Shredding Return',
    description: 'This skill\'s flights splinter where their road ends: 4 shards ring outward'
      + ' from a return\'s catch or from any unspent end, range flown out or masonry met. A'
      + ' flight that dies on a body spends itself in the blow; pierce through and it shatters'
      + ' at the far end. Pairs with Returning and Boomerang.',
    color: '#c8c0a8', requiresTags: ['projectile'],
    mods: [mod('returnShrapnel', 'flat', 4)],
    perLevel: [mod('returnShrapnel', 'flat', 1)],
    weight: 5,
  },

  // The occlusion lever, graftable: `phasing` frees a skill from LOS_CFG's
  // 'blocked' default exactly the way projBounce conjures ricochets — one
  // stat, read at the one skillOcclusion chokepoint. Universal on purpose
  // (no requiresTags): a phasing ray burns through the pillar, a phasing
  // bolt threads the keep, a phasing brand seeds fire past the rampart.
  wraith_passage: {
    id: 'wraith_passage', name: 'Wraith Passage',
    description: 'The socketed skill PHASES: shots, rays and placements pass through rock,'
      + ' walls and masonry, at 25% less damage.',
    color: '#9a8ab8',
    mods: [mod('phasing', 'flat', 1), mod('damage', 'more', -0.25)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 4,
  },

  // --- Construct FX & rotation (the §5 batch) ---------------------------------

  pulsing_ramparts: {
    id: 'pulsing_ramparts', name: 'Pulsing Ramparts',
    description: 'This skill\'s deployed objects pulse every second, washing everything beside'
      + ' them for 40% of the skill\'s damage roll, effects and all. Costs 30% more mana.',
    // 'construct' = the capability fold over every construct delivery — the
    // description's own promise ("Bone Prison becomes the cage that cooks")
    // was REFUSED by the old totem/trap/mine gate; barriers/pods/echoes are
    // deployed objects too. dropTags keeps the drop identity family-scoped.
    color: '#c8a8b8', requiresTags: ['construct'],
    dropTags: ['totem', 'trap', 'mine'],
    mods: [mod('manaCost', 'more', 0.3)],
    constructFx: { pulse: { interval: 1.0, radius: 48, damageScale: 0.4 } },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  violent_genesis: {
    id: 'violent_genesis', name: 'Violent Genesis',
    description: 'Deployed objects from this skill erupt as they arrive: 60% of the skill\'s'
      + ' damage roll in a ring around each placement. Costs 25% more mana.',
    // Same capability gate as pulsing_ramparts — "every wall segment is a
    // landing shell" needs walls to be socketable.
    color: '#e88a58', requiresTags: ['construct'],
    dropTags: ['totem', 'trap', 'mine'],
    mods: [mod('manaCost', 'more', 0.25)],
    constructFx: { burst: { radius: 78, damageScale: 0.6 } },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  orbital_sweep: {
    id: 'orbital_sweep', name: 'Orbital Sweep',
    description: 'The held channel\'s facing revolves on its own, sweeping the beam through'
      + ' everything around you, and the skill deals 10% more damage.',
    color: '#b8c8e8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelAutoSpin', 'flat', 1.7), mod('damage', 'more', 0.1)],
    perLevel: [mod('channelAutoSpin', 'flat', 0.3)],
    weight: 5,
  },

  whirling_sigil: {
    id: 'whirling_sigil', name: 'Whirling Sigil',
    description: 'Faced ground areas from this skill (crescents, wedges, triangles) revolve: a'
      + ' clock-hand that keeps cutting. Melee swings refuse it (Sweeping Blow is the'
      + ' swing-to-sweep gem); spin belongs to what lingers.',
    color: '#d8b8e8', requiresTags: ['aoe'], requiresMechanisms: ['surface'],
    excludeTags: ['melee'],
    mods: [mod('aoeSpin', 'flat', 2.4)],
    perLevel: [mod('aoeSpin', 'flat', 0.5)],
    weight: 5,
  },

  enduring_snares: {
    id: 'enduring_snares', name: 'Enduring Snares',
    description: 'Run-over embedments re-arm on a 3-second internal cooldown instead of being'
      + ' consumed, and the skill deals 15% less damage. Walking your own minefield becomes a'
      + ' rotation.',
    color: '#b0a888', requiresTags: ['duration', 'trap'],
    mods: [mod('embedIcd', 'flat', 3), mod('damage', 'more', -0.15)],
    perLevel: [mod('embedIcd', 'flat', -0.35)],
    weight: 5,
  },

  // --- Fissure levers (the §6 batch) -------------------------------------------

  splintered_earth: {
    id: 'splintered_earth', name: 'Splintered Earth',
    description: 'The cast tears one more whole fissure, fanned beside the first, and deals 20%'
      + ' less damage. Fits only skills that crack the ground (the fissure tag).',
    color: '#c89868', requiresTags: ['fissure'],
    mods: [mod('fissureCount', 'flat', 1), mod('damage', 'more', -0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  branching_fissures: {
    id: 'branching_fissures', name: 'Branching Fissures',
    description: 'Each fissure forks: 2 child cracks split off the main line, and the skill'
      + ' costs 30% more mana. Sockets only into skills that open fissures.',
    color: '#b88858', requiresTags: ['fissure'],
    mods: [mod('fissureBranches', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('fissureBranches', 'flat', 0.5)],
    weight: 5,
  },

  suffusion: {
    id: 'suffusion', name: 'Suffusion',
    description: 'Projectiles that cross one of your own ground effects carry it along: the'
      + ' field blooms again where the flight ends. Shooting through your own Flame Wall'
      + ' replants that wall downrange.',
    color: '#a8d8b8', requiresTags: ['projectile'],
    mods: [mod('suffusion', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  // --- Curse & ceremony gems (the §8 batch) -----------------------------------

  deliberate_ruin: {
    id: 'deliberate_ruin', name: 'Deliberate Ruin',
    description: 'Slow the rite for a heavier landing: 30% less cast speed, 35% more damage.'
      + ' The trade pays twice on spells that do their work during the cast. Channels, instants'
      + ' and guards refuse it.',
    color: '#b878b8', requiresTags: ['spell'],
    excludeTags: ['channel', 'instant', 'guard'],
    mods: [
      mod('castSpeed', 'more', -0.3),
      mod('damage', 'more', 0.35),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 6,
  },

  grim_sentence: {
    id: 'grim_sentence', name: 'Grim Sentence',
    description: 'Turns the curse into a sentence: it ruptures for 200% of its latent damage,'
      + ' on 30% reduced effect duration. Less lingering misery, more scheduled violence.',
    color: '#9858a8', requiresTags: ['curse'],
    mods: [
      mod('curseRupture', 'flat', 2),
      mod('effectDuration', 'increased', -0.3),
    ],
    perLevel: [mod('curseRupture', 'flat', 0.4)],
    weight: 5,
  },

  // --- Minion meta-grants (the §9 batch) ---------------------------------------
  // SupportDef.meta hands the HOST skill a shift-key action — meta-skills
  // as GRAFTS: any summon learns the order the gem carries.

  command_gem: {
    id: 'command_gem', name: 'Command',
    description: 'Grants the socketed summon an ASSAULT order, pressed with Shift plus its'
      + ' slot: every mobile minion of that skill marches to your mark and fights whatever'
      + ' holds it.',
    color: '#c8a84b', requiresTags: ['summon'],
    mods: [],
    meta: { skillId: 'command_assault', label: 'Assault' },
    perLevel: [mod('minionMoveSpeed', 'increased', 0.08)],
    weight: 6,
  },

  self_destruct: {
    id: 'self_destruct', name: 'Self-Destruct',
    description: 'Adds a DETONATE order to the socketed summon on Shift plus its slot: every'
      + ' minion that can be resummoned blows itself up for most of its life, untargetable ones'
      + ' included. Persistent contracts and totems refuse the gem outright.',
    color: '#e86848', requiresTags: ['summon'],
    excludeTags: ['persistent', 'totem'],
    mods: [],
    meta: { skillId: 'command_detonate', label: 'Detonate' },
    perLevel: [mod('minionExplodeDeath', 'flat', 0.08)],
    weight: 5,
  },

  shatterrite: {
    id: 'shatterrite', name: 'Shatterrite',
    description: 'The socketed totem skill gains a SHATTER order on Shift plus its slot: every'
      + ' standing totem of that skill bursts as physical ordnance where it stands, the totem'
      + ' spent as a mine.',
    color: '#c8a878', requiresTags: ['totem'],
    mods: [],
    meta: { skillId: 'shatter_totem', label: 'Shatter' },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  beckon_beyond: {
    id: 'beckon_beyond', name: 'Beckon from Beyond',
    description: 'Minions emerge at your mark instead of beside you, for 20% more mana cost.'
      + ' Point into a pack and the horde arrives already inside it.',
    color: '#a878d8', requiresTags: ['summon'],
    mods: [mod('summonAtCursor', 'flat', 1), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 5,
  },

  violent_arrival: {
    id: 'violent_arrival', name: 'Violent Arrival',
    description: 'Each minion detonates 40% of its own life at the point where it emerges, at'
      + ' 25% more mana cost. Paired with Beckon from Beyond, the summon itself is the strike.',
    color: '#d87858', requiresTags: ['summon'],
    mods: [mod('summonImpact', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('summonImpact', 'flat', 0.08)],
    weight: 5,
  },

  pyre_legion: {
    id: 'pyre_legion', name: 'Pyre Legion',
    description: 'Minions from this skill radiate a burning ring: 6 fire damage per second to'
      + ' enemies near them, and nothing to you or your other ranks. Costs 25% more mana.',
    color: '#ff8a4a', requiresTags: ['summon'],
    mods: [mod('manaCost', 'more', 0.25)],
    minionAura: { radius: 90, enemyDps: { amount: 6, type: 'fire' } },
    perLevel: [mod('damage', 'increased', 0.06, ['fire'])],
    weight: 5,
  },

  ritual_ground: {
    id: 'ritual_ground', name: 'Ritual Ground',
    description: 'The channel becomes a cast: the bar plants a channeler vessel at your mark,'
      + ' and the held working runs there on its own for 4 seconds. Costs 35% more mana.',
    color: '#b8a0d0', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelPersist', 'flat', 4), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('channelPersist', 'flat', 0.8)],
    weight: 5,
  },

  // --- Movement, offerings & the travelling crack (the deferred pass) ---------

  closing_instinct: {
    id: 'closing_instinct', name: 'Closing Instinct',
    description: 'The movement skill picks its own prey, lunging at the nearest enemy near your'
      + ' aim, then repeats once at a freshly picked target: 2 lunges per press, 10% increased'
      + ' damage. An empty field never refuses the press; the lunge just travels where you'
      + ' aimed.',
    // THE DISPLACEMENT GATE (2026-07-22): the instinct demands a real
    // lunge — dash/blink/leap hosts fit; a stealth veil (cloak) or a
    // planted mark refuses structurally rather than wear a counter-
    // intuitive auto-aim (the user's stealth ruling).
    color: '#c8a068', requiresTags: ['movement'], requiresMechanisms: ['displaces'],
    targeting: { target: 'enemy', castRange: 420, searchRadius: 220, fallback: 'aim' },
    mods: [
      mod('repeatCount', 'flat', 1),
      mod('repeatRetarget', 'override', 1),
      mod('damage', 'increased', 0.1),
    ],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  risen_offering: {
    id: 'risen_offering', name: 'Risen Offering',
    description: 'The offering rises as an effigy at your feet instead of a field at your mark:'
      + ' the ring rides the idol and dies with it, while the idol spits grave-wisps at enemies'
      + ' inside. Recasting raises a new effigy and crumbles the old. Costs 25% more mana.',
    color: '#b06888', requiresTags: ['corpse'], excludeTags: ['buff'],
    turret: { castSkillId: 'offering_wisp', life: 50, look: 'offering_effigy' },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  sundering_flight: {
    id: 'sundering_flight', name: 'Sundering Flight',
    description: 'Projectiles rip the ground open along their actual flight, leaving a fissure'
      + ' that bends wherever the shot bends: it lingers 1.2 seconds and ticks for 40% of the'
      + ' skill\'s damage. Costs 30% more mana.',
    color: '#c8a058', requiresTags: ['projectile'],
    fissureTrail: { radius: 24, linger: 1.2, tickInterval: 0.4, damageScale: 0.4 },
    mods: [mod('manaCost', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  // --- The reaping court & miasma (this pass) ---------------------------------

  skeletal_strike: {
    id: 'skeletal_strike', name: 'Skeletal Strike',
    description: 'Teaches the socketed summon a STRIKE order on Shift plus its slot: every'
      + ' minion of that skill dashes its nearest enemy and cuts it open. Beside other order'
      + ' grants, socket order sets the order of operations.',
    color: '#cfc8b8', requiresTags: ['summon'],
    mods: [],
    meta: { skillId: 'command_skeletal_strike', label: 'Strike' },
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 6,
  },

  ravenous_pact: {
    id: 'ravenous_pact', name: 'Ravenous Pact',
    description: 'Minions from this skill devour the nearest of your other minions every 6'
      + ' seconds, a true death: the eater heals 12% of its life and gains 5% increased damage'
      + ' and 3% increased attack speed for 15 seconds, stacking up to 5 times. Costs 15% more'
      + ' mana.',
    color: '#b04868', requiresTags: ['summon'],
    devour: {
      interval: 6, radius: 200, heal: 0.12,
      mods: [mod('damage', 'increased', 0.05), mod('attackSpeed', 'increased', 0.03)],
      maxStacks: 5, duration: 15,
    },
    mods: [mod('manaCost', 'more', 0.15)],
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 5,
  },

  miasma: {
    id: 'miasma', name: 'Miasma',
    description: 'The curse stops being a cast and becomes a toggled haze worn around you:'
      + ' enemies inside are re-afflicted every 0.75 seconds at 40% damage, statuses, procs and'
      + ' ruptures all riding, while 25% of your mana stays reserved. Press again to shed it.',
    color: '#a868c8', requiresTags: ['curse'],
    curseField: { mode: 'follow', radius: 170, tickInterval: 0.75, damageScale: 0.4, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 5,
  },

  miasmic_ground: {
    id: 'miasmic_ground', name: 'Miasmic Ground',
    description: 'Casting settles the curse at your mark as a patch lasting 10 seconds,'
      + ' re-afflicting whoever stands in it every 0.6 seconds at 50% damage. Only one patch'
      + ' stands at a time: recasting moves the sickness rather than multiplying it.',
    color: '#8858b8', requiresTags: ['curse'],
    curseField: { mode: 'ground', radius: 150, tickInterval: 0.6, damageScale: 0.5, duration: 10 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  // --- Spender economics & trade-off levies (the framework pass) --------------
  // Every gem here is a LEVY: a support imposing costs, gates, or clocks on
  // its host — the infrastructure any future support can reuse.

  ravening: {
    id: 'ravening', name: 'Ravening',
    description: 'The soft spender: the skill casts as normal, but any banked FRENZY charges'
      + ' are devoured on use for 15% more damage per charge eaten. An empty bank is never'
      + ' refused.',
    color: '#8ae06a', requiresTags: ['attack', 'spell'],
    chargeCost: {
      charge: 'frenzy', amount: 'all', optional: true,
      damagePerCharge: 0.15,
    },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  embargo: {
    id: 'embargo', name: 'Embargo',
    description: 'The hard spender: the skill cannot be cast until 3 FRENZY charges stand'
      + ' banked, then spends them all for 25% more damage per charge. Not ready until the'
      + ' tariff is met, ruinous once it is.',
    color: '#5a9a4a', requiresTags: ['attack', 'spell'],
    chargeCost: {
      charge: 'frenzy', amount: 'all', minimum: 3,
      damagePerCharge: 0.25,
    },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 4,
  },

  austerity: {
    id: 'austerity', name: 'Austerity',
    description: 'A long clock in trade for a starving price: 8 added seconds of cooldown,'
      + ' still reducible, and 75% less mana cost. The skill becomes a scheduled indulgence the'
      + ' mana bar barely notices.',
    color: '#a8a090', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'aura'],
    mods: [
      mod('addedCooldown', 'flat', 8),
      mod('manaCost', 'more', -0.75),
    ],
    perLevel: [mod('addedCooldown', 'flat', -0.5)],
    weight: 5,
  },

  apotheosis: {
    id: 'apotheosis', name: 'Apotheosis',
    description: 'Ten added seconds of cooldown, still reducible, buy 90% more damage and 15%'
      + ' increased area of effect. Choose which ordinary skill on the bar becomes your'
      + ' finisher.',
    color: '#e8c848', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'aura'],
    mods: [
      mod('addedCooldown', 'flat', 10),
      mod('damage', 'more', 0.9),
      mod('aoeRadius', 'increased', 0.15),
    ],
    perLevel: [mod('damage', 'more', 0.05)],
    weight: 4,
  },

  return_stroke: {
    id: 'return_stroke', name: 'Return Stroke',
    description: 'Lingering ground areas swing their facing back and forth across a 160 degree'
      + ' arc, one sweep every 1.5 seconds, with 25% increased effect duration. Sockets only'
      + ' into skills that leave a lingering surface, and only faced shapes feel the swing.',
    color: '#b06ad8', requiresTags: ['aoe'],
    excludeTags: ['melee'], requiresMechanisms: ['surface'],
    pendulum: { arcDeg: 160, period: 1.5 },
    mods: [mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  phalanx: {
    id: 'phalanx', name: 'Phalanx',
    description: 'A THRUST joins the socketed guard on Shift plus its slot: a razor-narrow'
      + ' lance poked out from behind the raised shield, block sustained throughout. It is not'
      + ' ready unless the guard is up.',
    color: '#c8b890', requiresTags: ['guard'],
    mods: [],
    meta: { skillId: 'phalanx_thrust', label: 'Thrust' },
    perLevel: [mod('guardStrength', 'increased', 0.06)],
    weight: 5,
  },

  // --- Guarded Casting (the deliberate cast-while-guarding lane) ------------
  // The inverse of Phalanx: not a thrust granted TO the guard, but a whole
  // spell SWORN to it. The host greys off-guard (gate), fires as an instant
  // combo press mid-stance (guardCast), and pays for the privilege on a
  // scheduled clock (addedCooldown) — every number in GUARD_CAST_CFG.
  guarded_casting: {
    id: 'guarded_casting', name: 'Guarded Casting',
    description: 'The supported skill can be cast only while a guard is raised, and there it'
      + ' fires instantly with block sustained throughout: 20% more damage on 4 added seconds'
      + ' of cooldown, shaved as the gem levels. Every cast becomes an aimed answer from behind'
      + ' the wall.',
    color: '#c8b890',
    excludeTags: ['channel', 'guard', 'aura', 'movement'],
    guardCast: true,
    gate: { guard: true },
    mods: [
      mod('addedCooldown', 'flat', GUARD_CAST_CFG.gatedCooldown),
      mod('damage', 'more', GUARD_CAST_CFG.moreDamage),
    ],
    perLevel: [mod('addedCooldown', 'flat', GUARD_CAST_CFG.gatedCooldownPerLevel)],
    weight: 4, minDropLevel: 12,
  },

  // --- THE CONDUIT FAMILY (SupportDef.conduit): resource pumps --------------
  // One fabric (Actor.updateConduits), many exchanges: while the HOST is
  // engaged — its stance held, its toggle burning — `from` drains to feed
  // `to` through the canonical gain gates. The pump only draws what the
  // destination has room for, and stops at the source's floor. Build the
  // source deep and the pump is an engine: the poise-stacked wall drinks
  // its own footing. requiresTags keeps every gem where an engagement
  // exists to run it (validate.ts audits exactly that), and the pumps
  // COMPOSE — socket two and mana can back poise can back guard.

  stoneblood_conduit: {
    id: 'stoneblood_conduit', name: 'Stoneblood Conduit',
    description: 'While the supported guard holds, your poise drains into the wall, each point'
      + ' rebuilding 2 guard. The pump draws only while the guard is dented and never below a'
      + ' quarter of your poise bar: stack poise deep and the stone drinks deep, stance intact.',
    color: '#a89878', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.08, ratio: 2.0, floor: 0.25 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 5, minDropLevel: 8,
  },

  reckless_transfusion: {
    id: 'reckless_transfusion', name: 'Reckless Transfusion',
    description: 'Poise pours into the supported guard at 2.6 guard per point, faster and'
      + ' richer than any disciplined pump, and it stops at no floor. It will drain the bar'
      + ' straight through the break, leaving you Sundered, then draws nothing until poise'
      + ' re-arms.',
    color: '#c05a48', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.15, ratio: 2.6, floor: 0 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 3, minDropLevel: 14,
  },

  bulwarks_tithe: {
    id: 'bulwarks_tithe', name: 'Bulwark\'s Tithe',
    description: 'The pump runs backwards: while the supported guard holds, the wall tithes'
      + ' into your poise at 0.6 poise per point spent, and never drains itself below a third.'
      + ' The anti-stagger tank: let the shield take the wear so the poise bar never breaks.',
    color: '#8ab8d8', requiresTags: ['guard'],
    // Floor 0.3 deliberately clears the 25% shield-bash release threshold:
    // a long-held tithe must never silently forfeit the release blow.
    conduit: { from: 'guard', to: 'poise', drainPct: 0.06, ratio: 0.6, floor: 0.3 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 5, minDropLevel: 8,
  },

  sanguine_feed: {
    id: 'sanguine_feed', name: 'Sanguine Feed',
    description: 'Hold the supported channel and life drains into mana at 1.4 mana per point,'
      + ' idling whenever the blue bar is already full. The pump stops at a tenth of your life:'
      + ' it will bleed you white, never dead.',
    color: '#b05a90', requiresTags: ['channel'],
    conduit: { from: 'life', to: 'mana', drainPct: 0.035, ratio: 1.4, floor: 0.1 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  crystal_cistern: {
    id: 'crystal_cistern', name: 'Crystal Cistern',
    description: 'Your energy shield decants into the supported guard while it holds, 1.6 guard'
      + ' per point. A withdrawal, not a wound: the drain never interrupts a recharge and stops'
      + ' at a fifth of the lattice.',
    color: '#8ad8e8', requiresTags: ['guard'],
    conduit: { from: 'es', to: 'guard', drainPct: 0.07, ratio: 1.6, floor: 0.2 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 4, minDropLevel: 12,
  },

  thoughtburn: {
    id: 'thoughtburn', name: 'Thoughtburn',
    description: 'Holding the supported channel burns your energy shield as fuel: the lattice'
      + ' drains into mana at 1.2 mana per point, down to a floor of 15%. Recharge flows'
      + ' undisturbed beneath the draw.',
    color: '#a8b8f0', requiresTags: ['channel'],
    conduit: { from: 'es', to: 'mana', drainPct: 0.05, ratio: 1.2, floor: 0.15 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 12,
  },

  overflow_reservoir: {
    id: 'overflow_reservoir', name: 'Overflow Reservoir',
    description: 'While the supported aura stands, spare mana seeps into your energy shield at'
      + ' 1 point for 1. The pump keeps half your mana untouchable and idles while the shield'
      + ' is whole: it banks surplus, never the rent.',
    color: '#7ac0d8', requiresTags: ['aura'],
    conduit: { from: 'mana', to: 'es', drainPct: 0.04, ratio: 1.0, floor: 0.5 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  stillmind_conduit: {
    id: 'stillmind_conduit', name: 'Stillmind Conduit',
    description: 'Insight decants into the supported guard while it holds, 2.2 guard per point,'
      + ' and never drains below a fifth of its bar. Strongest on a build that roots and lets'
      + ' stillness pool the mind faster than the wall spends it.',
    color: '#b0c8e8', requiresTags: ['guard'],
    conduit: { from: 'insight', to: 'guard', drainPct: 0.1, ratio: 2.2, floor: 0.2 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  // --- The breaker suite: aim your damage at a DEFENSE LAYER ----------------
  // The enemy-defense-textures doctrine read from the attacker's side: each
  // gem tunes WHICH layer the supported skill's damage bites — poise bars,
  // insight flow, energy shields — so hunting a texture is a build, and
  // (since every lever is an ordinary stat/status) monsters wield the same
  // knives back through their own kits.
  concussive_blows: {
    id: 'concussive_blows', name: 'Concussive Blows',
    requiresMechanisms: ['strikes'],
    description: 'Trades 15% less damage for 100% more poise damage, and makes the break pay:'
      + ' SUNDERED lasts 50% longer and your hits deal 20% more damage to sundered enemies.'
      + ' Crack the stance first, then strike while it holds.',
    color: '#c8a058',
    mods: [
      mod('damage', 'more', -0.15),
      mod('poiseDamage', 'more', 1),
      mod('sunderDuration', 'increased', 0.5),
      mod('damageVs_sundered', 'flat', 0.2),
    ],
    perLevel: [mod('poiseDamage', 'increased', 0.15)],
    weight: 5,
  },
  flowbreaker: {
    id: 'flowbreaker', name: 'Flowbreaker',
    requiresMechanisms: ['strikes'],
    description: 'Denies half the target\'s insight slip, adds 25% increased accuracy, and'
      + ' gives hits a 35% chance to leave the target REELING, unable to replenish insight. The'
      + ' anti-dodge gem: the runner\'s rhythm taken away.',
    color: '#c8a8e8',
    mods: [
      mod('insightPen', 'flat', 0.5),
      mod('accuracy', 'increased', 0.25),
      mod('apply_reeling', 'flat', 0.35),
    ],
    perLevel: [mod('insightPen', 'flat', 0.06), mod('apply_reeling', 'flat', 0.04)],
    weight: 5,
  },
  voidrend: {
    id: 'voidrend', name: 'Voidrend',
    requiresMechanisms: ['strikes'],
    description: 'Every point of energy shield that soaks this skill\'s hits is shredded 80%'
      + ' more, and 30% of hits leave the pool VOIDED, stopping its recharge while the status'
      + ' lasts.',
    color: '#9a8ae8',
    mods: [
      mod('esShred', 'more', 0.8),
      mod('apply_voided', 'flat', 0.3),
    ],
    perLevel: [mod('esShred', 'more', 0.08), mod('apply_voided', 'flat', 0.03)],
    weight: 5,
  },

  // --- The kata gem: rent the per-skill frenzy to any blade -----------------
  building_rhythm: {
    id: 'building_rhythm', name: 'Building Rhythm',
    description: 'Each cast of this skill grants it a stack: 5% increased damage with 3%'
      + ' increased attack and cast speed per stack, up to six. Two seconds without a cast'
      + ' drops the whole pile at once. Channeled skills and auras refuse this gem.',
    color: '#e8b458',
    excludeTags: ['channel', 'aura'],
    selfStack: {
      mods: [
        mod('damage', 'increased', 0.05),
        mod('attackSpeed', 'increased', 0.03),
        mod('castSpeed', 'increased', 0.03),
      ],
      maxStacks: 6, duration: 2, decay: 'all',
    },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.02)],
    weight: 5, minDropLevel: 8,
  },

  // --- The EMPYREAN gems (the Aetherial's arts, rentable) --------------------
  lightbrand: {
    id: 'lightbrand', name: 'Lightbrand',
    requiresMechanisms: ['strikes'],
    description: 'Hits from this skill have a 10% chance to shock, and the skill deals 7%'
      + ' increased damage per stack of shock on the victim.',
    color: '#ffe9a8', requiresTags: ['lightning'],
    mods: [
      mod('apply_shock', 'flat', 0.1),
      mod('damageVs_shock', 'increased', 0.07),
    ],
    perLevel: [mod('damageVs_shock', 'increased', 0.02)],
    weight: 5, minDropLevel: 10,
  },
  terminal_velocity: {
    id: 'terminal_velocity', name: 'Terminal Velocity',
    description: 'Sockets only into movement skills, which then deal 18% more damage and cost'
      + ' 25% more mana to cast.',
    color: '#cfe0f4', requiresTags: ['movement'],
    mods: [
      mod('damage', 'more', 0.18),
      mod('manaCost', 'more', 0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.1)],
    weight: 5, minDropLevel: 10,
  },
  parting_judgement: {
    id: 'parting_judgement', name: 'Parting Judgement',
    description: 'Where this skill\'s projectiles end their flight, a JUDGEMENT PILLAR falls on'
      + ' the landing spot at 60% of its damage. The supported skill costs 25% more mana.',
    color: '#ffd27f', requiresTags: ['projectile'],
    // One behavior class with parting_gift — see THE PARTING LANE note there
    // for how a sequel gem reaches a summoned crew's own flights.
    sequel: { skillId: 'judgement_pillar', damageScale: 0.6 },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.05, ['fire'])],
    weight: 4, minDropLevel: 12,
  },

  // --- The CIRRUS gem (the high air, rentable) -------------------------------
  rarefy: {
    id: 'rarefy', name: 'Rarefy',
    requiresMechanisms: ['strikes'],
    description: 'Converts 50% of this skill\'s physical damage to cold, rising to full'
      + ' conversion at the gem\'s maximum level.',
    color: '#cfe8f8', requiresTags: ['physical'],
    mods: [mod('convert_physical_cold', 'flat', 0.5)],
    perLevel: [mod('convert_physical_cold', 'flat', 0.125)],
    weight: 7, minDropLevel: 9,
  },

  // --- The flesh country's lanes (the SUN & SAND shape: universal apply_/
  // damageVs_ gems weaponizing the country's own ladders — expect the same
  // non-hitting-host INERT tails in the no-op matrix). ----------------------
  pallid_touch: {
    id: 'pallid_touch', name: 'Pallid Touch',
    requiresMechanisms: ['strikes'],
    description: 'Faintness builds on 35% of this skill\'s hits. At full stacks the victim'
      + ' SWOONS: a white-out drag, never a stun. Syncope lands harder the more faintness the'
      + ' target carries.',
    color: '#d8ccd8', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_faintness', 'flat', 0.35)],
    perLevel: [mod('apply_faintness', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  sickening: {
    id: 'sickening', name: 'Sickening',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s hits have a 35% chance to build queasy. Five stacks leave the'
      + ' target RETCHING: attacks and spells it has begun keep fizzling out.',
    color: '#a8b86a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_queasy', 'flat', 0.35)],
    perLevel: [mod('apply_queasy', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  unblinking: {
    id: 'unblinking', name: 'Unblinking',
    requiresMechanisms: ['strikes'],
    description: 'Beheld builds on 30% of this skill\'s hits; at the ladder\'s cap the target'
      + ' is SEEN, and this skill deals +12% damage against the SEEN.',
    color: '#d8b04a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_beheld', 'flat', 0.3), mod('damageVs_seen', 'flat', 0.12)],
    perLevel: [mod('apply_beheld', 'flat', 0.025), mod('damageVs_seen', 'flat', 0.015)],
    weight: 5, minDropLevel: 10,
  },
  // The confusion family's socketable halves (status.ts — CONTROL as the
  // hit surface): both ride the auto-generated apply_ lanes like their
  // flesh-country siblings above, and both work on ANY hitting kit.
  maddering: {
    id: 'maddering', name: 'Maddering',
    requiresMechanisms: ['strikes'],
    description: '30% of this skill\'s hits build disoriented. Five stacks turn the victim'
      + ' WIDDERSHINS, every step contrary to its own intent: herd them off ledges, out of'
      + ' formation, onto the ground you laid.',
    color: '#9ad8d0', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_disoriented', 'flat', 0.3)],
    perLevel: [mod('apply_disoriented', 'flat', 0.025)],
    weight: 5, minDropLevel: 10,
  },
  addling: {
    id: 'addling', name: 'Addling',
    requiresMechanisms: ['strikes'],
    description: '20% of this skill\'s hits leave the target ADDLED: its casts may fire the'
      + ' wrong skill entirely, burning cooldowns on workings it never chose.',
    color: '#e0b464', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_addled', 'flat', 0.2)],
    perLevel: [mod('apply_addled', 'flat', 0.02)],
    weight: 5, minDropLevel: 12,
  },
  // --- THE AUREOLE KATA's socketable verdicts (the Seraph City family):
  // both ride GENERATED per-status stat lanes (resolveHit's apply_<status>
  // sweep, the damageVs_<status> multiplier) — the maddering/addling and
  // beheld precedents: zero new machinery, alive on ANY hitting kit. ---
  aureate_writ: {
    id: 'aureate_writ', name: 'Aureate Writ',
    requiresMechanisms: ['strikes'],
    description: 'Hits carry a 22% chance to leave the victim EXPOSED, a painted weak spot that'
      + ' takes 40% more damage while it holds; this skill itself deals +12% damage against the'
      + ' exposed.',
    color: '#f0d890', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_exposed', 'flat', 0.22), mod('damageVs_exposed', 'flat', 0.12)],
    perLevel: [mod('apply_exposed', 'flat', 0.02), mod('damageVs_exposed', 'flat', 0.015)],
    weight: 5, minDropLevel: 11,
  },
  sanctal_cautery: {
    id: 'sanctal_cautery', name: 'Sanctal Cautery',
    requiresMechanisms: ['strikes'],
    description: 'Sear lands on 25% of this skill\'s hits: while it holds, every heal the'
      + ' victim receives is halved, regeneration, leech and mending bonds alike.',
    color: '#f8d8a0', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_sear', 'flat', 0.25)],
    perLevel: [mod('apply_sear', 'flat', 0.025)],
    weight: 5, minDropLevel: 12,
  },

  // --- THE SCALD KIT K2 — the gem side (charter docs/design/scald-kit.md
  // v3 §3; the skills are data/skills.ts' K2 block). THE NO-LOCK LAW binds
  // each: wet is everywhere water is, a bank is pure mechanics, a movement
  // skill is a movement skill, occlusion is universal, and a tunable body
  // stands in half a dozen countries. Acquisition rides sup_scald + THE GEM
  // FLOOR. Every number a DIAL. -------------------------------------------

  // SCALD — BOILING POINT (the conditional hit-rider): your fire scalds
  // WET targets. The applyWet_<status> family's debut — apply_'s
  // water-conditional twin, rolled in the same resolveHit sweep against
  // Actor.isWet (wading / swimming / soaked / rain-wet), so it arms in a
  // river, under a rainstorm, on a shore, or behind your own Kettle Burst.
  // Gated on the 'strikes' FLOOR like every hit-rider: a never-hitting host
  // refuses honestly and the refusal self-lifts the moment anything makes
  // the host strike.
  boiling_point: {
    id: 'boiling_point', name: 'Boiling Point',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s hits SCALD anything wet: a 60% chance against a target that is'
      + ' wading, swimming, soaked or rain-drenched, and nothing at all against a dry one. The'
      + ' scald banks like any other — soak them first and it bites half again as hard.',
    color: '#9fe4ea', requiresTags: ['attack', 'spell'],
    mods: [mod('applyWet_scalded', 'flat', 0.6)],
    perLevel: [mod('applyWet_scalded', 'flat', 0.06)],
    weight: 5, minDropLevel: 4,
  },

  // PRESSURE — PRESSURE SEAL (the magazine graft, Deep Reserves' grammar
  // wearing the basin's temper): stands a bank up on a host with none and
  // makes it a PATIENT one — it fills only while you hold ground and bleeds
  // while you run. Gated on 'bankless' (the honest floor: instanceUseCharges
  // gives a native bank or a munition the slot, so the graft would ride
  // inert — the refusal is "one economy per slot" spoken at socket time,
  // and it self-lifts when the munition gem beside it leaves).
  pressure_seal: {
    id: 'pressure_seal', name: 'Pressure Seal',
    requiresMechanisms: ['bankless'],
    description: 'Seals a 2-round PRESSURE bank onto a skill with none, 3 in all with this'
      + ' gem\'s own charge. The rounds build only while you stand your ground and bleed away'
      + ' while you move. A cooldown skill carries them as a magazine; a free skill gains an'
      + ' EMPOWER bank, each round spent for a 25% stronger cast and dry casts plain.',
    color: '#c8e8e4',
    useChargeGraft: { rounds: 2, recharge: 3.5, empower: 0.25, still: { bleed: 0.4 } },
    mods: [mod('skillCharges', 'flat', 1)],
    perLevel: [mod('skillChargeRate', 'increased', 0.04)],
    weight: 5, minDropLevel: 6,
  },

  // GEYSER-STEP — AFTERSPRAY (THE DEPARTURE SPLASH): your movement skills
  // erupt at the point you LEFT — the decoy's hot cousin, Dive Bomb's
  // one-ended sibling (departSplash pays at the launch alone, and the two
  // stats SUM for a build carrying both). Owner-safe by construction: it is
  // an ordinary skill hit through the ordinary pipeline, so allies standing
  // where you were are untouched — a player's spray is not terrain.
  afterspray: {
    id: 'afterspray', name: 'Afterspray',
    description: 'The ground you leave answers: movement skills spray boiling water at their'
      + ' DEPARTURE point for 55% of the skill\'s damage. Allies standing there are never'
      + ' touched — the spray is yours, not the terrain\'s.',
    color: '#d9f7fb', requiresTags: ['movement'],
    grantsTags: ['aoe'],
    mods: [mod('departSplash', 'flat', 0.55)],
    perLevel: [mod('departSplash', 'flat', 0.1)],
    weight: 5, minDropLevel: 5,
  },

  // STEAM — VAPORIZE (area denial by SIGHT, never by damage): your fire
  // casts flash the water they touch into a brief steam bank where they
  // land. The proc's own icd paces it; the bank is small and short (the
  // transience doctrine — the kettle flashes, it does not smother). Gated
  // on 'strikes' like every hit-trigger rider.
  vaporize: {
    id: 'vaporize', name: 'Vaporize',
    requiresMechanisms: ['strikes'],
    description: 'This skill\'s blows flash the water they touch: a bank of dense steam vents'
      + ' where it struck, at most once every few seconds. Sight stops at the white — theirs'
      + ' and yours — while shots fly through it untouched.',
    color: '#eef6f8', requiresTags: ['attack', 'spell'],
    mods: [mod('proc_vaporize', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.06)],
    weight: 4, minDropLevel: 6,
  },

  // PRISM — MINERAL TUNING (THE FAVORED PULSE): the attunement fabric's
  // player-side lever. A tunable body you re-tune stops being neutral: the
  // wash it pulses SPARES your enemies and runs longer on your side, so the
  // prism snail (or any crystal, chord node or resonant elemental) fights
  // for the build that tuned it. Gated on 'strikes' — the tone comes from a
  // LANDED blow, so a never-hitting host has nothing to tune with.
  mineral_tuning: {
    id: 'mineral_tuning', name: 'Mineral Tuning',
    requiresMechanisms: ['strikes'],
    description: 'When this skill re-tunes a crystalline body, the attunement it pulses takes'
      + ' YOUR side: your enemies are spared the wash entirely, and you and your allies wear'
      + ' it 60% longer.',
    color: '#d8d0b8', requiresTags: ['attack', 'spell'],
    mods: [mod('tuneFavor', 'flat', 0.6)],
    perLevel: [mod('tuneFavor', 'flat', 0.1)],
    weight: 4, minDropLevel: 7,
  },
};

export const SUPPORT_LIST: SupportDef[] = Object.values(SUPPORTS);

// THE WORN GRAFT stat family (engine/skills.ts slotGraftStat, injected at
// World.recalcSeat): one registered stat per (bar seat × cataloged gem), so
// affix/unique/vestige lines validate, label and clamp like any other stat —
// the orbs.ts family-registration loop, on the gem shelf. Value = granted
// gem LEVEL; a new support becomes worn-graftable the moment it registers.
for (const d of SUPPORT_LIST) {
  for (let s = 1; s <= BAR_SLOTS; s++) {
    STAT_DEFS[slotGraftStat(s, d.id)] = {
      label: `${d.name} Graft (Skill Slot ${s})`, base: 0, min: 0, max: MAX_SUPPORT_LEVEL,
    };
  }
}

/** Weighted random support for monster drops. */
export function rollSupportDrop(rand01: number): SupportDef {
  const total = SUPPORT_LIST.reduce((s, d) => s + d.weight, 0);
  let roll = rand01 * total;
  for (const d of SUPPORT_LIST) {
    roll -= d.weight;
    if (roll <= 0) return d;
  }
  return SUPPORT_LIST[SUPPORT_LIST.length - 1];
}
