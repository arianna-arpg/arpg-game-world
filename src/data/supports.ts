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

import { conversionStat, gaugeGateMod, gaugeMod, mod, STAT_DEFS } from '../engine/stats';
import { AOE_SHAPE, PROJ_RETURN, GUARD_CAST_CFG, BAR_SLOTS, MAX_SUPPORT_LEVEL, slotGraftStat } from '../engine/skills';
import type { SupportDef } from '../engine/skills';
import { ORB_HIT_CADENCE_TEXT } from './orbs';

export const SUPPORTS: Record<string, SupportDef> = {

  // PHASE 3 PROOF: a support that adds a damaging component to KNOCKBACK when the
  // victim is slammed into a wall or hurled into the void — purely a 'collision'
  // proc grant + a tag gate, no engine code (the displacement/collision seam).
  crushing_impact: {
    id: 'crushing_impact', name: 'Crushing Impact',
    description: 'Enemies knocked back by supported skills take 80% of the skill\'s damage when they collide with a wall or are knocked into a pit.',
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
    description: 'Hits from supported skills gain heavy knockback, +25% shove force, and deal 40% more impact damage when knocked-back enemies collide with a wall or a heavy enemy.',
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
    description: 'Supported skills deal 30% more damage to enemies of a higher level than you.',
    color: '#e8c86a', requiresTags: ['attack', 'spell'],
    mods: [mod('overmatch', 'flat', 0.3)],
    perLevel: [mod('overmatch', 'flat', 0.02)],
    weight: 6,
  },
  giantsbane: {
    id: 'giantsbane', name: 'Giantsbane',
    description: 'Supported skills deal 30% more damage to enemies at least 50% heavier than you.',
    color: '#c8a068', requiresTags: ['attack', 'spell'],
    mods: [mod('giantsbane', 'flat', 0.3)],
    perLevel: [mod('giantsbane', 'flat', 0.02)],
    weight: 6,
  },
  regicide: {
    id: 'regicide', name: 'Regicide',
    description: 'Supported skills deal 22% more damage to magic, rare, champion, and boss enemies.',
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
    description: 'Supported skills deal 35% more damage to targetable monster parts and attachments, such as shields, censers, and mounted riders.',
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
    description: 'Supported skills deal 30% more damage to immobile enemies and structures, such as siege engines, spawners, idols, and totems.',
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
    description: 'Supported skills deal 40% more damage to enemies whose resource reserves are depleted or currently venting to refill.',
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
    description: 'Supported skills deal 35% more damage to terrain-bound enemies that have been forced off their native ground.',
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
    description: 'Supported skills deal 30% more damage to enemies tethered to and empowered by a warden.',
    color: '#e0a94e', requiresTags: ['attack', 'spell'],
    mods: [mod('bondbreaker', 'flat', 0.3)],
    perLevel: [mod('bondbreaker', 'flat', 0.02)],
    weight: 6,
  },
  quailbane: {
    id: 'quailbane', name: 'Quailbane',
    description: 'Supported skills deal 32% more damage to faltering enemies whose morale has broken.',
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
    description: 'Supported grab skills gain +35% grip power, allowing them to hold heavier enemies and slowing how quickly targets break free.',
    color: '#c8a068', requiresTags: ['grab'],
    mods: [mod('gripPower', 'flat', 0.35)],
    perLevel: [mod('gripPower', 'flat', 0.06)],
    weight: 6,
  },
  trebuchet_arm: {
    id: 'trebuchet_arm', name: 'Trebuchet Arm',
    description: 'Supported throw skills gain +35% shove force and deal +45% impact damage when thrown enemies collide with a wall, another enemy, or a pit.',
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
    description: 'Enemies held by supported grab skills take physical damage per second equal to 5% of their maximum life, mitigated by armor.',
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
    description: 'Hits from supported skills remove 1 additional hit layer from multi-hit enemies such as swarms and husks.',
    color: '#d8d0b8', requiresTags: ['attack', 'spell'],
    mods: [mod('plyRend', 'flat', 1)],
    perLevel: [mod('plyRend', 'flat', 0.05)],
    weight: 6,
  },

  // --- The Wildcraft disciplines (the jungle's arts, bottled) ----------------
  serrated_edge: {
    id: 'serrated_edge', name: 'Serrated Edge',
    requiresMechanisms: ['strikes'],
    description: 'Supported melee skills deal 10% increased damage and have a 35% chance to inflict Bleed on hit.',
    color: '#a8563c', requiresTags: ['melee'],
    mods: [mod('apply_bleed', 'flat', 0.35), mod('damage', 'increased', 0.1)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 6,
  },
  envenomed_tips: {
    id: 'envenomed_tips', name: 'Envenomed Tips',
    requiresMechanisms: ['strikes'],
    description: 'Supported projectile skills have 15% increased effect duration and a 30% chance to inflict Poison on hit.',
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
    description: 'Projectiles from supported skills have 10% increased speed and deal 35% increased damage to airborne enemies.',
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
    description: 'Hits and projectile impacts from supported skills emit a loud noise that draws nearby sentries to investigate the impact site.',
    color: '#c8b880', requiresTags: ['attack', 'spell'],
    mods: [mod('noiseOnHit', 'flat', 260)],
    perLevel: [mod('noiseOnHit', 'flat', 14)],
    weight: 4,
  },
  smothering_spores: {
    id: 'smothering_spores', name: 'Smothering Spores',
    requiresMechanisms: ['strikes'],
    description: 'Supported duration skills have 15% increased area of effect, 20% increased effect duration, and a 15% chance to inflict Poison on hit.',
    color: '#a8d05a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('effectDuration', 'increased', 0.2), mod('apply_poison', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Unmaking graft pair (the war-wound's arts) -----------------------
  loose_thread: {
    id: 'loose_thread', name: 'Loose Thread',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to inflict Unravelling, a compounding damage-over-time effect that spreads when the target dies.',
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
    description: 'Supported duration skills have 12% increased area of effect, 18% increased effect duration, and a 15% chance to inflict Unravelling on hit.',
    color: '#5ee88a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.12), mod('effectDuration', 'increased', 0.18), mod('apply_unravelling', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Symbiote grafts (the Caul arts' support pair) --------------------
  grasping_tendrils: {
    id: 'grasping_tendrils', name: 'Grasping Tendrils',
    requiresMechanisms: ['strikes'],
    description: 'Supported melee skills deal 8% increased damage and have a 20% chance to Ensnare enemies on hit.',
    color: '#8a6ab0', requiresTags: ['melee'],
    mods: [mod('apply_ensnared', 'flat', 0.2), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_ensnared', 'flat', 0.03)],
    weight: 6,
  },
  parasitic_pact: {
    id: 'parasitic_pact', name: 'Parasitic Pact',
    requiresMechanisms: ['strikes'],
    description: 'Supported attack skills deal 6% increased damage and restore a small amount of life on hit, subject to a brief cooldown.',
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
    description: 'Supported song skills have 30% increased effect duration and 15% increased area of effect.',
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
    description: 'Supported song skills deal 20% increased damage and gain +15% status chance.',
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
    description: 'Using a supported song skill grants a Verse charge, up to 5. Each Verse charge grants 4% increased damage to the supported skill, and 4% increased minion damage if it is a summoning song.',
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
    description: 'Supported chrono skills have 35% increased effect duration and 15% increased status magnitude.',
    color: '#8ae0e8', requiresTags: ['chrono'],
    mods: [mod('effectDuration', 'increased', 0.35), mod('statusMagnitude', 'increased', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.06)],
    weight: 5,
  },
  borrowed_haste: {
    id: 'borrowed_haste', name: 'Borrowed Haste',
    description: 'Supported chrono skills have 30% increased cooldown recovery speed and 15% increased cast speed.',
    color: '#a8e8e0', requiresTags: ['chrono'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.15)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  commanding_presence: {
    id: 'commanding_presence', name: 'Commanding Presence',
    description: 'Supported warcry skills have 25% increased area of effect and 25% increased effect duration.',
    color: '#e8c04a', requiresTags: ['warcry'],
    mods: [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  packed_workshop: {
    id: 'packed_workshop', name: 'Packed Workshop',
    description: 'Grants the Reposition command (Shift + skill key), moving the nearest active totem or sentry from the supported skill within 600 units to a new location while preserving its health and remaining duration. Reposition costs 6 mana and has a 4-second cooldown. Supported constructs have 15% less duration.',
    color: '#c6ad80', requiresMechanisms: ['periodicConstruct'],
    dropTags: ['totem'],
    meta: { skillId: 'relocate_workshop', label: 'Reposition' },
    mods: [mod('effectDuration', 'more', -0.15)],
    minDropLevel: 8, weight: 5,
  },
  overwound_mechanism: {
    id: 'overwound_mechanism', name: 'Overwound Mechanism',
    description: 'Totems and sentries from supported skills act 35% faster, including their attack, cast, and cooldown rates, but have 25% less duration.',
    color: '#d0ae70', requiresMechanisms: ['periodicConstruct'],
    dropTags: ['totem'],
    mods: [mod('constructCastRate', 'more', 0.35), mod('effectDuration', 'more', -0.25)],
    perLevel: [mod('constructCastRate', 'increased', 0.04)],
    minDropLevel: 8, weight: 5,
  },
  hair_trigger: {
    id: 'hair_trigger', name: 'Hair Trigger',
    description: 'Supported trap and mine skills have 20% increased cast speed and 30% increased cooldown recovery speed.',
    color: '#c8a878', requiresTags: ['trap', 'mine'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.2)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  tinkers_arsenal: {
    id: 'tinkers_arsenal', name: 'Tinker\'s Arsenal',
    description: 'Supported trap, mine, and totem skills can have +1 active construct at a time and grant constructs 20% increased life, but deal 15% less damage.',
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
    description: 'Supported channeled skills deal 10% increased damage and detonate their armed charges in a random order rather than in order of placement.',
    color: '#ffe94a', requiresTags: ['channel'],
    releaseOrder: 'random',
    mods: [mod('damage', 'increased', 0.1)],
    weight: 5,
  },
  fortunes_favor: {
    id: 'fortunes_favor', name: "Fortune's Favor",
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to roll damage twice and take the higher result.',
    color: '#e8d44a',
    mods: [mod('luckyChance', 'flat', 0.25)],
    perLevel: [mod('luckyChance', 'flat', 0.04)],
    weight: 6,
  },
  jinxing_touch: {
    id: 'jinxing_touch', name: 'Jinxing Touch',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 20% chance to Jinx enemies for 5 seconds, causing their damage rolls to roll twice and take the lower result.',
    color: '#8a78a8',
    mods: [mod('apply_jinxed', 'flat', 0.2)],
    perLevel: [mod('apply_jinxed', 'flat', 0.03)],
    weight: 5,
  },
  tempest_range: {
    id: 'tempest_range', name: 'Tempest Range',
    description: 'Supported lightning skills gain +25 to maximum lightning damage.',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [mod('addedMax_lightning', 'flat', 25)],
    perLevel: [mod('addedMax_lightning', 'flat', 5)],
    weight: 6,
  },
  steady_current: {
    id: 'steady_current', name: 'Steady Current',
    description: 'Supported lightning skills gain +8 to minimum lightning damage.',
    color: '#c8e84a', requiresTags: ['lightning'],
    mods: [mod('addedMin_lightning', 'flat', 8)],
    perLevel: [mod('addedMin_lightning', 'flat', 2)],
    weight: 6,
  },
  loaded_dice: {
    id: 'loaded_dice', name: 'Loaded Dice',
    requiresMechanisms: ['strikes'],
    description: 'Widens the damage range of supported skills by 40% around the same average, increasing maximum damage rolls and decreasing minimum damage rolls.',
    color: '#e8c04a',
    mods: [mod('damageSpread', 'flat', 0.4)],
    perLevel: [mod('damageSpread', 'flat', 0.06)],
    weight: 6,
  },
  overload: {
    id: 'overload', name: 'Overload',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported lightning skills that roll in the top 12% of their damage range arc to up to 3 nearby enemies for 50% damage.',
    color: '#7af0ff', requiresTags: ['lightning'],
    mods: [mod('proc_overload_arc', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05, ['lightning'])],
    weight: 5,
  },
  unstable_compression: {
    id: 'unstable_compression', name: 'Unstable Compression',
    description: 'Supported area skills deal 15% more area damage, and their area of effect varies randomly between 60% and 155% on each cast.',
    color: '#e89a4a', requiresTags: ['aoe'],
    variance: { aoe: [0.6, 1.55] },
    mods: [mod('damage', 'more', 0.15, ['aoe'])],
    perLevel: [mod('damage', 'increased', 0.05, ['aoe'])],
    weight: 5,
  },
  parting_gift: {
    id: 'parting_gift', name: 'Parting Gift',
    description: 'Projectiles from supported skills trigger a Frost Nova at 70% damage when their flight ends. Supported skills cost 20% more mana.',
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
    description: 'Enemies hit by supported area skills have a 25% chance to re-cast the skill from their position after a short delay at 60% damage, chaining up to 3 times with half the chance on each hop. Supported skills cost 30% more mana.',
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
    description: 'Supported skills gain 3 added chaos damage on hit.',
    color: '#b06bd4',
    mods: [mod('addedChaos', 'flat', 3)],
    perLevel: [mod('addedChaos', 'flat', 1)],
    weight: 6,
  },
  umbral_focus: {
    id: 'umbral_focus', name: 'Umbral Focus',
    description: 'Supported chaos skills gain 7 added chaos damage on hit.',
    color: '#8a48c8', requiresTags: ['chaos'],
    mods: [mod('addedChaos', 'flat', 7, ['chaos'])],
    perLevel: [mod('addedChaos', 'flat', 2, ['chaos'])],
    weight: 6,
  },

  // --- The Legion's gifts (demon-kill gem drops lean this way via gemBias) ---
  brimstone_tithe: {
    id: 'brimstone_tithe', name: 'Brimstone Tithe',
    description: 'Supported fire skills deal 30% more fire damage and cost 40% more mana.',
    color: '#ff6a2a', requiresTags: ['fire'],
    mods: [mod('damage', 'more', 0.3, ['fire']), mod('manaCost', 'more', 0.4)],
    perLevel: [mod('damage', 'more', 0.02, ['fire'])],
    weight: 5,
  },
  tormentors_glee: {
    id: 'tormentors_glee', name: "Tormentor's Glee",
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to inflict Torment, slowing enemies and dealing chaos damage over time. Supported skills deal 25% increased damage to tormented enemies.',
    color: '#8a5ac8', requiresTags: ['chaos', 'curse'],
    mods: [mod('apply_torment', 'flat', 0.25), mod('damageVs_torment', 'increased', 0.25)],
    perLevel: [mod('apply_torment', 'flat', 0.03), mod('damageVs_torment', 'increased', 0.03)],
    weight: 5,
  },
  hellhunger: {
    id: 'hellhunger', name: 'Hellhunger',
    description: 'Minions from supported skills deal 10% increased damage and have a 20% chance to Ignite enemies on hit.',
    color: '#e0503a', requiresTags: ['minion'],
    mods: [mod('minionApply_burn', 'flat', 0.2), mod('minionDamage', 'increased', 0.1)],
    perLevel: [mod('minionApply_burn', 'flat', 0.03)],
    weight: 5,
  },

  // --- The wildwood & carrion gifts (the bestiary expansion's gem lane) ------
  putrefaction: {
    id: 'putrefaction', name: 'Putrefaction',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported chaos skills have a 20% chance to inflict Decay, and supported skills deal 20% increased damage to decaying enemies.',
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
    description: 'Hits from supported physical skills have a 10% chance to apply Petrifying stacks, and supported skills deal 15% increased damage to petrified enemies.',
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
    description: 'Supported skills convert 10% of physical damage to fire, 10% to cold, and 10% to lightning, and deal 12% increased fire, cold, and lightning damage.',
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
    description: 'Projectiles from supported skills have an 8% chance on hit to Root enemies, preventing movement and movement skills.',
    color: '#8a9a4a', requiresTags: ['projectile'],
    mods: [mod('apply_rooted', 'flat', 0.08)],
    perLevel: [mod('apply_rooted', 'flat', 0.012)],
    weight: 5,
  },
  brood_tender: {
    id: 'brood_tender', name: 'Brood Tender',
    description: 'Minions from supported skills have 10% increased life and a 20% chance to inflict Poison on hit.',
    color: '#7fce6a', requiresTags: ['minion'],
    mods: [mod('minionApply_poison', 'flat', 0.2), mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionApply_poison', 'flat', 0.03)],
    weight: 5,
  },
  wound_worrier: {
    id: 'wound_worrier', name: 'Wound-Worrier',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 15% chance to inflict Hemorrhage, and supported skills deal 20% increased damage to hemorrhaging enemies.',
    color: '#e04858', requiresTags: ['attack', 'physical'],
    mods: [mod('apply_hemorrhage', 'flat', 0.15), mod('damageVs_hemorrhage', 'increased', 0.2)],
    perLevel: [mod('apply_hemorrhage', 'flat', 0.02), mod('damageVs_hemorrhage', 'increased', 0.03)],
    weight: 5,
  },

  // --- Blood, mending & the guard hall --------------------------------------------
  sanguine_feast: {
    id: 'sanguine_feast', name: 'Sanguine Feast',
    description: 'You leech 5% of Bleed damage dealt by supported skills as life.',
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
    description: 'Direct healing from supported skills instead restores 130% of the amount over 6 seconds. Multiple healing-over-time effects stack.',
    color: '#7ec88a', requiresTags: ['heal'],
    healOverTime: { seconds: 6, factor: 1.3 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.06)],
    weight: 5,
  },
  unyielding_stance: {
    id: 'unyielding_stance', name: 'Unyielding Stance',
    description: 'Supported guard skills have 40% increased guard strength and grant +20 poise and 100% increased poise regeneration while guarding.',
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
    description: 'While guarding with a supported skill, attackers take 14 reflected physical damage when they hit you.',
    color: '#9ec83a', requiresTags: ['guard'],
    mods: [mod('channelThorns', 'flat', 14)],
    perLevel: [mod('channelThorns', 'flat', 5)],
    weight: 6,
  },
  counterweight: {
    id: 'counterweight', name: 'Counterweight',
    description: 'Supported guard skills gain a 0.3-second parry window when raised, causing hits parried during that window to trigger a riposte with +50% parry power.',
    color: '#e8e4d8', requiresTags: ['guard'],
    mods: [mod('guardParry', 'flat', 0.3), mod('guardParryPower', 'flat', 0.5)],
    weight: 5,
  },
  shieldwall_doctrine: {
    id: 'shieldwall_doctrine', name: 'Shieldwall Doctrine',
    description: 'While guarding with a supported skill, you gain +20% block chance and +12 block value.',
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
    description: 'Lingering fissure segments from supported skills have a 40% chance every 1.2 seconds to erupt again for 80% damage.',
    color: '#ff8a4a', requiresTags: ['fissure'],
    fissureVolatile: { interval: 1.2, chance: 0.4, damageScale: 0.8 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  tectonic_echoes: {
    id: 'tectonic_echoes', name: 'Tectonic Echoes',
    description: 'Lingering fissure segments from supported skills become armed, detonating in a wide aftershock for 110% damage when you step over them and re-arming after 2.5 seconds.',
    color: '#e8a24a', requiresTags: ['fissure'],
    fissureAftershock: { damageScale: 1.1, radiusScale: 2.4, rearm: 2.5 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  seismic_waltz: {
    id: 'seismic_waltz', name: 'Seismic Waltz',
    description: 'Active fissure segments from supported skills periodically arm for 1.4 seconds at a time, detonating in a wide burst for 100% damage when you step across them.',
    color: '#f0b060', requiresTags: ['fissure'],
    fissureRoulette: { interval: 0.9, chance: 0.3, window: 1.4, damageScale: 1, radiusScale: 2.2 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  restless_wound: {
    id: 'restless_wound', name: 'Restless Wound',
    description: 'After a fissure from a supported skill closes (granting a closing pass if the skill has none), it has a 60% chance to close again for 70% damage, up to 3 additional times.',
    color: '#c88a9a', requiresTags: ['fissure'],
    fissureReclose: { chance: 0.6, times: 3, interval: 0.9, damageScale: 0.7 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  orbital_fault: {
    id: 'orbital_fault', name: 'Orbital Fault',
    description: 'Fissures from supported skills form a ring around you instead of a straight line, with additional fissures forming concentric rings.',
    color: '#c8a8e8', requiresTags: ['fissure'],
    fissurePath: { kind: 'orbit' },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  widening_fault: {
    id: 'widening_fault', name: 'Widening Fault',
    description: 'Fissures from supported skills spiral outward from the impact point, with additional fissures forming extra spiral arms.',
    color: '#b8a8d8', requiresTags: ['fissure'],
    fissurePath: { kind: 'spiral', turns: 1.6 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  serpentine_fault: {
    id: 'serpentine_fault', name: 'Serpentine Fault',
    description: 'Fissures from supported skills weave in a serpentine path along their trajectory.',
    color: '#a8c89a', requiresTags: ['fissure'],
    fissurePath: { kind: 'serpent', waveDeg: 38 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  faultfinder: {
    id: 'faultfinder', name: 'Faultfinder',
    description: 'Hits from supported melee skills have a 25% chance to project a fissure forward for 60% damage, and grant the skill the Fissure tag.',
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
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, critical strikes from your other skills have a 70% chance to trigger the supported skill, paying its full mana cost with a 0.15-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#e8c84a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'crit', chance: 0.7, icd: 0.15 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.06)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_damage_taken: {
    presentation: { counter: 'shield' },
    id: 'cast_on_damage_taken', name: 'Cast when Damage Taken',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, taking cumulative damage equal to 30% of your maximum life triggers the supported skill at the attacker, with a 0.25-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#d87a6a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'damageTaken', chance: 1, icd: 0.25, lifeFrac: 0.3 },
    mods: [],
    perLevel: [mod('triggerThreshold', 'flat', -0.02)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_channeling: {
    id: 'cast_while_channeling', name: 'Cast while Channelling',
    description: 'Supported skills cannot be cast manually and are instead toggled on or off. While active, the supported skill triggers every 0.35 seconds while you channel any skill. Supports non-channeled skills with a cast time of 0.5 seconds or less.',
    color: '#8ab8e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelBeat', chance: 1, icd: 0.35 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_flawless: {
    id: 'cast_on_flawless', name: 'Cast on Flawless',
    description: 'Supported skills cannot be cast manually and are instead toggled on or off. While active, landing a Perfect or Flawless timed input triggers the supported skill. Supports skills with a cast time of 0.5 seconds or less.',
    color: '#ffd700', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'flawless', chance: 1 },
    mods: [],
    perLevel: [mod('damage', 'more', 0.04)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_guarding: {
    id: 'cast_while_guarding', name: 'Cast while Guarding',
    description: 'Supported skills cannot be cast manually and are instead toggled on or off. While active, the supported skill triggers periodically while you hold any guard stance. Supports skills with a cast time of 0.5 seconds or less.',
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
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, banking an overcharge stage triggers the supported skill. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#ffd24a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'overchargeStage', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_high_roll: {
    id: 'cast_on_high_roll', name: 'Cast on High Roll',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, hits that roll in the top 12% of their damage range trigger the supported skill at the target, paying its full mana cost with a 0.25-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#ffe97a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'highRoll', chance: 1, icd: 0.25 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  culmination: {
    id: 'culmination', name: 'Culmination',
    description: 'Supported skills cannot be cast manually and are instead toggled on or off. While active, completing a full channel or gather triggers the supported skill for free at your cursor.',
    color: '#e8d88a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelFinish', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 12,
  },
  culminant_frenzy: {
    id: 'culminant_frenzy', name: 'Culminant Frenzy',
    description: 'Channeling a supported skill to completion grants 2 Frenzy charges, up to a maximum of 6.',
    color: '#e8a84a', requiresTags: ['channel'],
    chargeGain: [{ charge: 'frenzy', amount: 2, max: 6, on: 'channelFinish' }],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.5)],
    weight: 4,
  },
  gathered_casting: {
    presentation: { counter: 'glass' },
    id: 'gathered_casting', name: 'Gathered Casting',
    description: 'Converts the supported skill into a gathered cast: hold to store cast progress up to 150% of its normal cast time while paying mana over time, then release on a later press to fire with power scaled to the stored amount. Stored casts can be released during cooldown.',
    color: '#c8b8e8', excludeTags: ['channel', 'guard', 'instant', 'movement', 'aura', 'overcharge'],
    gather: { premium: 1.5, minRelease: 0.15, releaseOnCooldown: true },
    mods: [],
    perLevel: [mod('brimFill', 'increased', 0.04)],
    weight: 4, minDropLevel: 12,
  },
  sequenced_invocation: {
    id: 'sequenced_invocation', name: 'Sequenced Invocation',
    description: "Allows trigger supports socketed into the same supported skill to trigger skills with long cast times, performing their full cast when triggered.",
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
    presentation: { counter: 'embers' },
    id: 'cast_on_ignition', name: 'Cast on Ignition',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, every third Ignite you inflict triggers the supported skill, with a 0.2-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#ff9a4a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'burn', power: 3, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.25)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_poison: {
    presentation: { counter: 'venom' },
    id: 'cast_on_poison', name: 'Cast on Poison',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, every fifth Poison you inflict triggers the supported skill, with a 0.2-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#7ec850', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'poison', power: 5, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.4)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_bleed: {
    presentation: { counter: 'wounds' },
    id: 'cast_on_bleed', name: 'Cast on Laceration',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, every fourth Bleed you inflict triggers the supported skill, with a 0.2-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#b03030', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'bleed', power: 4, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.3)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_block: {
    id: 'cast_on_block', name: 'Cast on Block',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, blocking or parrying a hit triggers the supported skill at the attacker, with a 0.5-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
    color: '#8ab8d8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'block', chance: 1, icd: 0.5 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_kill: {
    id: 'cast_on_kill', name: 'Cast on Kill',
    description: "Supported skills cannot be cast manually and are instead toggled on or off. While active, killing an enemy with your hits triggers the supported skill at the target's location, with a 0.4-second cooldown. Supports skills with a cast time of 0.5 seconds or less.",
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
    description: 'Hits from supported skills have a 30% chance to spread one random affliction from the target to the nearest unaffected enemy within range at 75% strength for its remaining duration.',
    color: '#a0c878',
    spreadOnHit: { chance: 0.3, radius: 200, strengthScale: 0.75, duration: 'remaining' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  final_bloom: {
    id: 'final_bloom', name: 'Final Bloom',
    requiresMechanisms: ['affliction'],
    description: 'Damage-over-time effects from supported skills have a 60% chance to spread to nearby enemies when an afflicted target dies.',
    color: '#78c878',
    mods: [mod('dotPropagates', 'flat', 0.6)],
    perLevel: [mod('dotPropagates', 'flat', 0.1)],
    weight: 5,
  },
  load_bearing_flaw: {
    id: 'load_bearing_flaw', name: 'Structural Flaw',
    description: 'Constructs from supported skills take 400% damage from your own hits and explode on death or expiration, dealing 110% of the skill\'s damage in an area.',
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
    description: 'Constructs from supported skills are no longer anchored in place, allowing them to be pushed, knocked back, and damaged by wall collisions.',
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
    description: 'Attacks from supported skills impale enemies for 20% of the physical damage dealt, causing the next hit against the target to deal that stored damage.',
    color: '#c8ccd8', requiresTags: ['attack'],
    mods: [mod('impalePower', 'flat', 0.2)],
    perLevel: [mod('impalePower', 'flat', 0.04)],
    weight: 6,
  },

  // --- The hex-delivery gems ------------------------------------------------------
  curse_on_hit: {
    id: 'curse_on_hit', name: 'Hexbrand',
    description: 'Converts the supported curse into a toggled reservation that reserves 25% of your mana. While active, your hits apply the supported curse at 30% effect.',
    color: '#b06bd4', requiresTags: ['curse'],
    curseOnHit: { damageScale: 0.3, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 4, minDropLevel: 8,
  },

  // --- The retaliation gems (the greatshield-and-poke kit) ----------------------
  answering_steel: {
    presentation: { counter: 'ripostes' },
    id: 'answering_steel', name: 'Answering Steel',
    description: 'Blocking a hit with a supported guard skill grants a Riposte charge, up to 3, and grants the Riposte Thrust command (Shift + skill key) to spend a charge for a forward thrust.',
    color: '#d8e8f8', requiresTags: ['guard'],
    chargeGain: [{ charge: 'riposte', amount: 1, max: 3, on: 'block' }],
    meta: { skillId: 'riposte_thrust', label: 'Riposte' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  reckless_rampart: {
    id: 'reckless_rampart', name: 'Reckless Rampart',
    description: 'Supported guard skills have 60% increased shield-bash damage and 25% reduced guard strength.',
    color: '#d8a878', requiresTags: ['guard'],
    mods: [mod('bashPower', 'increased', 0.6), mod('guardStrength', 'increased', -0.25)],
    perLevel: [mod('bashPower', 'increased', 0.1)],
    weight: 5,
  },
  answering_wall: {
    id: 'answering_wall', name: 'Answering Wall',
    description: 'Supported guard skills with no innate bash gain a release bash dealing 55% of remaining guard with a 25% chance to Stun; guard skills that already have a bash gain 40% increased bash damage instead. Reduces the minimum guard threshold required to bash by 20%.',
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
    description: 'Supported guard skills gain 25% increased bash damage, and their release bash scales with missing guard instead of remaining guard.',
    color: '#9a8ab8', requiresTags: ['guard'],
    // bashInvert is a STAT on purpose — a passive node or an affix can
    // grant the same inversion later without new machinery.
    mods: [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)],
    perLevel: [mod('bashPower', 'increased', 0.05)],
    weight: 5,
  },
  stalwart_rhythm: {
    id: 'stalwart_rhythm', name: 'Stalwart Rhythm',
    description: 'Blocking a hit with a supported guard skill reduces the remaining cooldowns of your other skills by 1 second.',
    color: '#8ab8d8', requiresTags: ['guard'],
    mods: [mod('proc_stalwart_rhythm', 'flat', 1)],
    perLevel: [mod('blockValue', 'flat', 2)],
    weight: 5,
  },

  // --- The offering ecology -----------------------------------------------------
  hiveborn: {
    presentation: { counter: 'crawlers' },
    id: 'hiveborn', name: 'Hiveborn',
    description: 'Each corpse consumed by a supported skill spawns a zombie crawler that fights for you for 12 seconds, up to 6 active at once.',
    color: '#a8c860', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'zombie_crawler', perCorpse: true, duration: 12, max: 6 },
    mods: [],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },
  ghostly_communion: {
    presentation: { counter: 'spirits' },
    id: 'ghostly_communion', name: 'Ghostly Communion',
    description: 'Consuming a corpse with a supported skill summons 2 phantasms for 8 seconds, up to 4 active at once, and adds 5 seconds to the skill\'s cooldown.',
    color: '#9ad8e8', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'phantasm', count: 2, duration: 8, max: 4 },
    mods: [mod('addedCooldown', 'flat', 5)],
    weight: 5,
  },
  gift_of_the_choir: {
    id: 'gift_of_the_choir', name: 'Gift of the Choir',
    description: 'Minions summoned by supported skills each gain a random aura granting nearby allies +1.2 life regeneration per second, 6% increased attack and cast speed, or +25 armor.',
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
    description: 'Supported summon skills have 30% more maximum minions.',
    color: '#b06bd4', requiresTags: ['summon'],
    mods: [mod('minionMaxCount', 'more', 0.3)],
    perLevel: [mod('minionMaxCount', 'more', 0.04)],
    weight: 5,
  },
  fresh_ranks: {
    id: 'fresh_ranks', name: 'Fresh Ranks',
    description: 'Minions summoned by supported skills gain 25% increased damage and 15% increased movement speed for 6 seconds after being summoned.',
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
    description: 'Other support gems socketed into the supported summon skill also apply to the skills used by its summoned minions. Mana cost multipliers from forwarded supports still apply to your cast.',
    color: '#9a7ee8', requiresTags: ['summon', 'minion'],
    resonance: true,
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 6,
  },
  blood_toll: {
    id: 'blood_toll', name: 'Blood Toll',
    description: 'Casting a supported skill sacrifices your nearest minion within range, granting 0.6% more damage for that cast per point of the minion\'s remaining life.',
    color: '#c02848',
    sacrifice: { radius: 260, dmgPerLife: 0.006 },
    mods: [],
    weight: 4,
  },
  dominating_blow: {
    presentation: { counter: 'crowns' },
    id: 'dominating_blow', name: 'Dominating Blow',
    description: 'Kills with supported attack skills have a 25% chance to revive non-boss enemies as allied thralls for 12 seconds, up to 3 active at once.',
    color: '#e8d44a', requiresTags: ['attack'],
    dominate: { chance: 0.25, duration: 12, max: 3 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  // --- Cursed-ground variants ---------------------------------------------------
  maddening_miasma: {
    id: 'maddening_miasma', name: 'Maddening Miasma',
    description: 'Enemies that remain in lingering ground from supported skills for 6 cumulative seconds become Mad, attacking the nearest target regardless of allegiance.',
    // 'surface:standing': the seconds need ground that STANDS — flash grounds
    // (curse rings, conjures, linger-less strikes) refuse (engine/skills.ts
    // standingSurface; the bank itself is World MaddenBank).
    color: '#d84a9a', requiresTags: ['duration'], requiresMechanisms: ['surface:standing'],
    madden: { after: 6 },
    mods: [],
    weight: 4,
  },
  pulsing_hex: {
    id: 'pulsing_hex', name: 'Pulsing Hex',
    description: 'Lingering ground from supported skills emits a hex pulse every second.',
    color: '#b06bd4', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneEmit: { skillId: 'hex_pulse', interval: 1 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  creeping_fumes: {
    id: 'creeping_fumes', name: 'Creeping Fumes',
    description: 'Lingering ground from supported skills deals 30% more damage, but only affects enemies that have remained inside it for at least 0.5 seconds.',
    color: '#9ab86a', requiresTags: ['duration'],
    exposure: { after: 0.5 },
    mods: [mod('damage', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  overgrowth: {
    id: 'overgrowth', name: 'Overgrowth',
    description: 'Lingering ground from supported skills expands continuously over its duration, but deals 15% less damage.',
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
    description: 'Lingering ground from supported skills starts 30% larger and shrinks to nothing over its duration, dealing 25% more damage.',
    color: '#7a9a52', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 1.3, to: 0, curve: 'quadIn' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.04)],
    weight: 5,
  },
  blooming_ground: {
    id: 'blooming_ground', name: 'Blooming Ground',
    description: 'Lingering ground from supported skills starts at 25% of its radius and expands to 140% over its duration, dealing 15% less damage.',
    color: '#8ab86a', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 0.25, to: 1.4, curve: 'quadOut' },
    mods: [mod('damage', 'more', -0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  tidal_ground: {
    id: 'tidal_ground', name: 'Tidal Ground',
    description: 'Lingering ground from supported skills expands from 50% to 150% of its radius by mid-duration, then shrinks back to 50% as it expires.',
    color: '#6a9a8a', requiresTags: ['duration'], requiresMechanisms: ['surface'],
    zoneSizeOver: { from: 0.5, to: 1.5, curve: 'breath' },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 4,
  },

  // --- Brim gems: the persistent gauge, retuned (ChannelSpec.brim) ----------
  stillwater_discipline: {
    id: 'stillwater_discipline', name: 'Stillwater Discipline',
    description: 'The gauge of supported channeled skills no longer decays while not channeling, but grants 10% reduced stored power.',
    color: '#7ab0c8', requiresTags: ['channel'],
    mods: [mod('brimDecay', 'increased', -1), mod('brimPower', 'increased', -0.1)],
    perLevel: [mod('brimPower', 'increased', 0.02)],
    weight: 5,
  },
  overbrim: {
    id: 'overbrim', name: 'Overbrim',
    description: 'The gauge of supported channeled skills grants 30% increased stored power, but fills 20% slower.',
    color: '#c8a85a', requiresTags: ['channel'],
    mods: [mod('brimPower', 'increased', 0.3), mod('brimFill', 'increased', -0.2)],
    perLevel: [mod('brimPower', 'increased', 0.03)],
    weight: 5,
  },

  // --- Reservation & resource economies ------------------------------------------
  fleeting_devotion: {
    id: 'fleeting_devotion', name: 'Fleeting Devotion',
    description: 'Supported aura skills no longer reserve mana and instead last for 12 seconds when cast.',
    color: '#e8d44a', requiresTags: ['aura'],
    auraDuration: { seconds: 12 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 4,
  },
  blood_pact: {
    id: 'blood_pact', name: 'Blood Pact',
    description: 'Supported aura skills reserve life instead of mana.',
    color: '#c02848', requiresTags: ['aura'],
    reserveLife: true,
    mods: [],
    weight: 4,
  },
  dominion_tithe: {
    id: 'dominion_tithe', name: 'Dominion Tithe',
    description: 'Supported spell skills gain added damage equal to 5% of your reserved mana.',
    color: '#7a9aff', requiresTags: ['spell'],
    mods: [mod('reservedDamage', 'flat', 0.05)],
    perLevel: [mod('reservedDamage', 'flat', 0.008)],
    weight: 5,
  },
  archons_wellspring: {
    id: 'archons_wellspring', name: "Archon's Wellspring",
    requiresMechanisms: ['strikes'],
    description: 'Supported spell skills gain added damage equal to 4% of your maximum mana.',
    color: '#4a78d8', requiresTags: ['spell'],
    mods: [mod('maxManaDamage', 'flat', 0.04)],
    perLevel: [mod('maxManaDamage', 'flat', 0.006)],
    weight: 5,
  },
  slow_brew: {
    presentation: { counter: 'brew' },
    id: 'slow_brew', name: 'Slow Brew',
    description: 'Grants 1 Brew charge every 2.5 seconds, up to 5. Casting a supported skill consumes all Brew charges to deal 12% more damage per charge spent.',
    color: '#c8a848',
    chargeGain: [{ charge: 'brew', amount: 1, max: 5, on: 'second', everySeconds: 2.5 }],
    chargeCost: { charge: 'brew', amount: 'all', optional: true, damagePerCharge: 0.12 },
    mods: [],
    weight: 5,
  },

  // --- Cleric echoes, tradeoffs & textures ---------------------------------------
  consecrated_echo: {
    id: 'consecrated_echo', name: 'Consecrated Echo',
    description: 'Supported warcry skills create consecrated ground that heals allies standing within it.',
    color: '#8ae0a8', requiresTags: ['warcry'],
    healField: { amount: 6 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.08)],
    weight: 5,
  },
  echoing_might: {
    id: 'echoing_might', name: 'Echoing Might',
    description: 'Hits from supported attack skills grant added physical damage equal to 2% of the damage dealt for 4 seconds, up to 15% of the skill\'s base damage.',
    color: '#e8d44a', requiresTags: ['attack'],
    mods: [mod('echoMight', 'flat', 0.02)],
    perLevel: [mod('echoMight', 'flat', 0.0025)],
    weight: 5,
  },
  hallowed_flames: {
    id: 'hallowed_flames', name: 'Hallowed Flames',
    requiresMechanisms: ['strikes'],
    description: 'Melee hits from supported skills have a 30% chance to inflict Scorch.',
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
    description: 'While the supported aura, guard, or summon skill is active, you gain +40 armor and regenerate 3 life per second. When socketed into a summon skill, its minions also gain this bonus.',
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
    description: 'Supported skills have 30% increased area of effect and deal 25% more area damage, but have 30% less attack and cast speed.',
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
    description: 'Supported skills deal 35% more damage, but gain a 1.2-second cooldown.',
    color: '#b8b8c8',
    mods: [mod('damage', 'more', 0.35), mod('addedCooldown', 'flat', 1.2)],
    weight: 6,
  },
  point_blank: {
    id: 'point_blank', name: 'Point Blank',
    description: 'Supported projectile attack skills deal up to 50% more damage to targets at close range, scaling down with distance.',
    color: '#e07050', requiresTags: ['projectile', 'attack'],
    mods: [mod('proximityDamage', 'flat', 0.5)],
    perLevel: [mod('proximityDamage', 'flat', 0.06)],
    weight: 6,
  },
  pulsating_missiles: {
    id: 'pulsating_missiles', name: 'Pulsating Missiles',
    description: 'Projectiles from supported skills pulse in size by ±40% as they travel.',
    color: '#9ad8e8', requiresTags: ['projectile'],
    mods: [mod('projPulse', 'flat', 0.4)],
    perLevel: [mod('projPulse', 'flat', 0.05)],
    weight: 6,
  },

  // --- The chaos & doom suite -----------------------------------------------------
  withering_agony: {
    id: 'withering_agony', name: 'Withering Agony',
    requiresMechanisms: ['strikes'],
    description: 'Chaos hits from supported skills have a 40% chance to inflict Withering Agony, a chaos damage-over-time effect that ramps up over its duration.',
    color: '#8a5ad8', requiresTags: ['chaos'],
    mods: [mod('apply_wither_agony', 'flat', 0.4, ['chaos'])],
    perLevel: [mod('statusMagnitude', 'increased', 0.06, ['chaos'])],
    weight: 5,
  },
  creeping_doom: {
    id: 'creeping_doom', name: 'Creeping Doom',
    requiresMechanisms: ['strikes'],
    description: 'Chaos hits from supported skills have a 15% chance to inflict Doom, which stacks on repeated applications and executes the target when its stored damage exceeds their remaining life.',
    color: '#7a48c8', requiresTags: ['chaos'],
    mods: [mod('apply_doom', 'flat', 0.15, ['chaos'])],
    perLevel: [mod('apply_doom', 'flat', 0.02, ['chaos'])],
    weight: 5,
  },
  lingering_doom: {
    id: 'lingering_doom', name: 'Lingering Doom',
    requiresMechanisms: ['status:doom'],
    description: 'Doom applied by supported chaos skills also deals 35% of its stored payload as chaos damage over time while active.',
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
    description: 'Critical hits from supported attack skills have a 50% chance to grant a Rage charge.',
    color: '#e04030', requiresTags: ['attack'],
    mods: [mod('proc_crimson_edge', 'flat', 0.5)],
    perLevel: [mod('proc_crimson_edge', 'flat', 0.08)],
    weight: 6,
  },

  // CHANNEL-FED charges (ChargeGainSpec 'channelSecond'): holding the
  // socketed channel banks Frenzy on a metronome — the user-asked shape.
  grace_of_dawn: {
    id: 'grace_of_dawn', name: 'Grace of Dawn',
    description: 'While channeling a supported skill, you gain a Frenzy charge every 3 seconds, up to 5.',
    color: '#8ae06a', requiresTags: ['channel'],
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 5, on: 'channelSecond', everySeconds: 3 }],
    mods: [],
    weight: 6,
  },

  // BROODCLUTCH (SupportDef.brood): this skill's ailments HATCH — every
  // point of tick damage has a 2% chance to birth a broodling serving you
  // (potency IS fecundity; capped so the bloom never becomes a bomb).
  broodclutch: {
    presentation: { counter: 'brood' },
    id: 'broodclutch', name: 'Broodclutch',
    description: 'Ailment damage over time from supported chaos skills has a 2% chance per point of damage dealt to spawn a broodling that fights for you for 10 seconds, up to 4 active at once.',
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
    description: 'Minions from supported skills have a 35% chance on hit to grant you a Communion charge, empowering both you and your minions.',
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
    description: 'Minions from supported skills count as dying when they expire, and heal your other minions for 20% of their maximum life on death.',
    color: '#9a86e8', requiresTags: ['summon'],
    mods: [mod('minionDeathHeal', 'flat', 0.2), mod('minionExpiryIsDeath', 'flat', 1)],
    perLevel: [mod('minionDeathHeal', 'flat', 0.03)],
    weight: 5,
  },

  // STORED VERDICT (the charge-banked meta): real uses of the host bank
  // Verdict; the granted META-ACTION spends three for a free nova.
  stored_verdict: {
    presentation: { counter: 'scales' },
    id: 'stored_verdict', name: 'Stored Verdict',
    description: 'Using a supported skill grants a Verdict charge, up to 3, and grants the Verdict command (Shift + skill key) to spend 3 charges for a free consecrated nova.',
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
    presentation: { counter: 'shrouds' },
    id: 'summon_phantasm', name: 'Summon Phantasm',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills summon a temporary phantasm (roughly 10 per minute, up to 5 active at once). When socketed into a summon skill, your minions\' hits summon phantasms for you.',
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
    presentation: { counter: 'clutch', populationCounter: 'hive' },
    id: 'teeming_vein', name: 'Teeming Vein',
    description: 'Hits from supported skills spawn temporary minions based on the modifiers rolled on this gem.',
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
    presentation: { counter: 'hatchlings' },
    id: 'broodbearer', name: 'Broodbearer',
    requiresMechanisms: ['landing'],
    description: 'Supported skills spawn a broodling at each impact or landing location that fights for you for 8 seconds, up to 2 active at once.',
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
    description: 'Kills with supported skills have a 40% chance to trigger a consecrated burst after a brief delay that heals allies and burns enemies in the area. Also triggers at a reduced rate on hits against rare and boss enemies.',
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
    description: 'Hits from supported skills deal no direct damage, but damaging afflictions they apply deal 50% more damage.',
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
    description: 'Supported skills deal 3% increased damage per stack of Poison on the target.',
    color: '#7ec850',
    mods: [mod('damageVs_poison', 'flat', 0.03)],
    perLevel: [mod('damageVs_poison', 'flat', 0.005)],
    weight: 7,
  },

  nettles: {
    id: 'nettles', name: 'Nettles',
    description: 'While channeling a supported skill, attackers take 8 reflected physical damage when they hit you, including on blocked hits.',
    color: '#9ec83a', requiresTags: ['channel'],
    mods: [mod('channelThorns', 'flat', 8)],
    perLevel: [mod('channelThorns', 'flat', 5)],
    weight: 7,
  },

  eruption_cycle: {
    id: 'eruption_cycle', name: 'Eruption Cycle',
    description: 'Supported skills gain 6 added fire damage. While channeling a supported skill, a fiery nova erupts around you every 2 seconds (scaling with attack and cast speed), dealing 80% of the skill\'s damage.',
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
    description: 'Supported skills gain 5 added lightning damage. While channeling a supported skill, lightning strikes random locations around you for 70% of the skill\'s damage.',
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
    description: 'Supported channeled skills deal 12% more damage per second channeled, up to 150%.',
    color: '#d8a050', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelRamp', 'flat', 0.12)],
    perLevel: [mod('channelRamp', 'flat', 0.03)],
    weight: 6,
  },

  spooling: {
    presentation: { counter: 'bobbin' },
    id: 'spooling', name: 'Spooling Barrage',
    description: 'Supported channeled projectile skills fire +1 projectile per 2.5 seconds of continuous channeling, up to +3 projectiles, and cost 25% more mana.',
    color: '#b06bd4', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelSpool', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('channelSpool', 'flat', 0.1), mod('channelSpoolCap', 'flat', 0.5)],
    weight: 5,
  },

  mounting_frenzy: {
    presentation: { counter: 'barbs' },
    id: 'mounting_frenzy', name: 'Mounting Frenzy',
    description: "Supported channeled skills gain +1 projectile for every 8 hits landed during an unbroken channel, up to +3 projectiles, and cost 20% more mana.",
    color: '#e06a50', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelHitSpool', 'flat', 0.125), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('channelHitSpool', 'flat', 0.03)],
    weight: 5,
  },

  overcharge: {
    presentation: { counter: 'bolts' },
    id: 'overcharge', name: 'Overcharge',
    description: 'Holding a supported skill past its cast time stores up to 3 Overcharge stages, each granting 40% more damage and 12% increased area of effect while paying the skill\'s mana cost again per stage.',
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
    description: "Pressing the skill key again near the end of the cast bar (or releasing during the window while overcharging) causes the supported skill to deal 70% more damage.",
    color: '#ffd88a', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'perfect', bonus: 0.7 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  wandering_mark: {
    id: 'wandering_mark', name: 'Wandering Mark',
    description: "Pressing the skill key again as the cast bar crosses a random marker (or releasing on the marker while overcharging) causes the supported skill to deal 120% more damage.",
    color: '#e8f0ff', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'timed', bonus: 1.2 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  spark_discipline: {
    id: 'spark_discipline', name: 'Spark Discipline',
    description: "Releasing an overcharged cast within 0.25 seconds of banking a stage causes the supported skill to deal 35% more damage.",
    color: '#ffe86a', requiresTags: ['overcharge'],
    mods: [mod('sparkWindow', 'flat', 0.25)],
    perLevel: [mod('sparkWindow', 'flat', 0.04), mod('sparkBonus', 'increased', 0.08)],
    weight: 5,
  },

  dive_bomb: {
    id: 'dive_bomb', name: 'Dive Bomb',
    description: 'Supported movement skills trigger an area explosion at both their start and end locations for 70% of the skill\'s damage, gain the Area tag, and cost 30% more mana.',
    color: '#e8924a', requiresTags: ['movement'],
    grantsTags: ['aoe'],
    mods: [mod('moveExplode', 'flat', 0.7), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('moveExplode', 'flat', 0.12)],
    weight: 5,
  },

  fire_walker: {
    id: 'fire_walker', name: 'Fire Walker',
    description: 'Supported movement skills gain 6 added fire damage, leave a trail of burning ground along their path, and gain the Area and Duration tags.',
    color: '#ff8c3a', requiresTags: ['movement'],
    grantsTags: ['aoe', 'duration'],
    mods: [mod('moveTrail', 'flat', 0.5), mod('addedFire', 'flat', 6)],
    perLevel: [mod('moveTrail', 'flat', 0.1), mod('addedFire', 'flat', 2)],
    weight: 5,
  },

  arcing: {
    id: 'arcing', name: 'Arcing',
    description: 'Projectiles from supported skills chain +2 times, and supported skills deal 15% less damage.',
    color: '#f4e84a', requiresTags: ['projectile'],
    mods: [mod('chainCount', 'flat', 2), mod('damage', 'more', -0.15)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  static_buildup: {
    id: 'static_buildup', name: 'Static Buildup',
    description: 'Supported lightning skills gain +25% status chance and 40% increased lightning effect duration.',
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
    description: 'Supported targeted skills strike 2 additional nearby enemies and cost 35% more mana.',
    color: '#e8a268', requiresTags: ['targeted'],
    mods: [mod('multiTarget', 'flat', 2), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('multiTarget', 'flat', 1)],
    weight: 5,
  },

  powderkeg: {
    id: 'powderkeg', name: 'Powderkeg',
    requiresMechanisms: ['affliction:burn'],
    description: 'Ignites from supported fire skills deal no damage over time and instead detonate when their duration expires, dealing their total burn damage in an area around the target.',
    color: '#ff5a3a', requiresTags: ['fire'],
    mods: [mod('igniteToBomb', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.08, ['fire'])],
    weight: 5,
  },

  nova_release: {
    id: 'nova_release', name: 'Nova Release',
    description: 'Supported projectile skills fire +4 projectiles in a ring around you and deal 20% less damage.',
    color: '#d88a4a', requiresTags: ['projectile'],
    mods: [mod('projNova', 'flat', 4), mod('damage', 'more', -0.2)],
    perLevel: [mod('projNova', 'flat', 1)],
    weight: 5,
  },

  elemental_conduction: {
    id: 'elemental_conduction', name: 'Elemental Conduction',
    description: 'Projectiles from supported skills that pass through your elemental ground effects gain added damage of that element and a chance to inflict its corresponding ailment.',
    color: '#9ec8e8', requiresTags: ['projectile'],
    mods: [mod('conduction', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 5,
  },

  slow_burn: {
    id: 'slow_burn', name: 'Slow Burn',
    description: 'Supported fire skills have 80% increased fire effect duration.',
    color: '#c87a3a', requiresTags: ['fire'],
    mods: [mod('effectDuration', 'increased', 0.8, ['fire'])],
    perLevel: [mod('effectDuration', 'increased', 0.15, ['fire'])],
    weight: 6,
  },

  perfect_timing: {
    id: 'perfect_timing', name: 'Perfect Timing',
    description: 'Supported guard skills gain a 0.25-second parry window when raised; hits parried during this window cost no guard and trigger a riposte for 150% damage.',
    color: '#e8d8a0', requiresTags: ['guard'],
    mods: [mod('guardParry', 'flat', 0.25)],
    perLevel: [mod('guardParry', 'flat', 0.04), mod('guardParryPower', 'increased', 0.08)],
    weight: 5,
  },

  capacitor: {
    id: 'capacitor', name: 'Capacitor',
    description: 'Allies affected by supported aura skills recharge energy shield 60% faster.',
    color: '#5ad8d8', requiresTags: ['aura'],
    mods: [mod('auraEsRecharge', 'flat', 0.6)],
    perLevel: [mod('auraEsRecharge', 'flat', 0.15)],
    weight: 5,
  },

  insulation: {
    id: 'insulation', name: 'Insulation',
    description: 'Allies affected by supported aura skills begin recharging energy shield 35% sooner.',
    color: '#9ad8e8', requiresTags: ['aura'],
    mods: [mod('auraEsDelay', 'flat', 0.35)],
    perLevel: [mod('auraEsDelay', 'flat', 0.07)],
    weight: 5,
  },

  desperation: {
    id: 'desperation', name: 'Desperation',
    requiresMechanisms: ['strikes'],
    description: 'Supported skills deal 40% more damage while you are on low life.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.4, undefined, 'lowLife')],
    perLevel: [mod('damage', 'increased', 0.08, undefined, 'lowLife')],
    weight: 5,
  },

  serene_power: {
    id: 'serene_power', name: 'Serene Power',
    description: 'Supported skills deal 30% more damage while you are on full energy shield.',
    color: '#5ad8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.3, undefined, 'fullEs')],
    perLevel: [mod('damage', 'increased', 0.07, undefined, 'fullEs')],
    weight: 5,
  },

  untouched_might: {
    id: 'untouched_might', name: 'Untouched Might',
    requiresMechanisms: ['strikes'],
    description: 'Supported skills deal 25% more damage while you are on full life.',
    color: '#e8c848', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.25, undefined, 'fullLife')],
    perLevel: [mod('damage', 'increased', 0.06, undefined, 'fullLife')],
    weight: 5,
  },

  remnants: {
    id: 'remnants', name: 'Elemental Remnants',
    description: 'Elemental hits from supported skills have a 12% chance to drop an elemental remnant. Picking up a remnant empowers your next cast of that element with 40% more damage, +1 projectile, and 30% increased area of effect.',
    color: '#c89ae8', requiresTags: ['fire', 'cold', 'lightning'],
    mods: [mod('remnantChance', 'flat', 0.12)],
    perLevel: [mod('remnantChance', 'flat', 0.04)],
    weight: 6,
  },

  mirror_coating: {
    id: 'mirror_coating', name: 'Mirror Coating',
    description: 'Protection domes from supported guard skills deflect enemy projectiles back at attackers instead of destroying them.',
    color: '#9ad8c8', requiresTags: ['guard'],
    mods: [mod('domeDeflects', 'flat', 1)],
    perLevel: [mod('aoeRadius', 'increased', 0.08)],
    weight: 4,
  },

  crimson_harvest: {
    id: 'crimson_harvest', name: 'Crimson Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have an 8% chance to drop a life orb.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_life', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_life', 'flat', 0.03)],
    weight: 7,
  },

  azure_harvest: {
    id: 'azure_harvest', name: 'Azure Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have an 8% chance to drop a mana orb.',
    color: '#4a78d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_mana', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_mana', 'flat', 0.03)],
    weight: 7,
  },

  lambent_harvest: {
    id: 'lambent_harvest', name: 'Lambent Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have an 8% chance to drop an energy shield orb that restores energy shield and starts energy shield recharge when picked up.',
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
    description: 'Supported skills have a 6% chance on hit and a 25% chance on kill to drop a Wakeflame orb.',
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
    description: 'Kills with supported skills spawn a brief mote of light at the corpse that restores Light to nearby allies. When socketed into a summon skill, kills by its minions also spawn light motes.',
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
    description: 'Kills with supported skills have a 60% chance to grant a Frenzy charge, up to 3. When socketed into a summon skill, kills by its minions grant you the charge.',
    color: '#8ae06a', requiresTags: ['attack', 'spell'],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.34)],
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 3, on: 'kill', chance: 0.6 }],
    weight: 5,
  },

  abundant_harvest: {
    id: 'abundant_harvest', name: 'Abundant Harvest',
    requiresMechanisms: ['strikes'],
    description: 'Supported skills have 30% increased orb drop chance, and skills without an innate orb drop gain a 4% base chance on kill to drop life and mana orbs.',
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
    description: 'Supported guard skills have 20% increased guard strength, and hits against nearby minions within your blocking arc drain your guard instead.',
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
    description: 'Supported instant skills can be used during other casts, dashes, and recovery animations without interrupting them.',
    color: '#c8c8d8', requiresTags: ['instant'], excludeTags: ['flask'],
    mods: [mod('reflex', 'flat', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.04)],
    weight: 5,
  },

  libation: {
    id: 'libation', name: 'Libation',
    description: 'Supported flasks can be used even while at full life or mana, and have 15% increased recovery and 10% increased effect duration.',
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
    description: 'Using a supported flask releases a corrosive splash around you that poisons nearby enemies, but the flask has 15% less recovery.',
    color: '#9ac838', requiresTags: ['flask'],
    followUp: { skillId: 'acrid_splash', delay: 0.2 },
    mods: [mod('restorePower', 'more', -0.15)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  adrenal_decant: {
    // Name + copy FLAGGED for Arianna's word (2026-08-08 placeholder).
    id: 'adrenal_decant', name: 'Adrenal Decant',
    description: 'Supported flasks restore an additional 10% of maximum pool on their instant surge, but restore 50% less over their settling duration. Only supports flasks with both instant and over-time recovery.',
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
    description: 'Using a supported flask triggers a Benediction after 0.3 seconds that heals nearby allies, scaling with your healing power.',
    color: '#9ae0b0', requiresTags: ['flask'],
    followUp: { skillId: 'benediction', delay: 0.3 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.06)],
    weight: 5,
  },

  chaser: {
    id: 'chaser', name: 'Chaser',
    description: 'Using a supported flask grants a brief burst of attack and cast speed after 0.15 seconds.',
    color: '#e8c878', requiresTags: ['flask'],
    followUp: { skillId: 'chaser_edge', delay: 0.15 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },

  splitting: {
    id: 'splitting', name: 'Splitting',
    description: 'Supported projectile skills fire +1 projectile, deal 20% less damage, and cost 30% more mana.',
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
    description: 'Projectiles from supported skills pierce 2 additional targets.',
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
    description: 'Supported area skills deal 30% more area damage and have 25% reduced area of effect.',
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
    description: 'Supported area skills have 30% increased area of effect.',
    color: '#a0b8d8', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'increased', 0.3)],
    perLevel: [mod('aoeRadius', 'increased', 0.08)],
    weight: 10,
  },

  combustion: {
    id: 'combustion', name: 'Combustion',
    description: 'Supported fire skills deal 30% increased fire damage and gain +15% status chance.',
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
    description: 'Supported summon skills have +1 maximum minion and grant minions 15% increased damage.',
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
    description: 'Supported spell skills have 20% increased cast speed and cost 15% more mana.',
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
    description: 'Supported attack skills have 18% increased attack speed.',
    color: '#e09040', requiresTags: ['attack'],
    mods: [mod('attackSpeed', 'increased', 0.18)],
    perLevel: [mod('attackSpeed', 'increased', 0.05)],
    weight: 10,
  },

  brutality: {
    id: 'brutality', name: 'Brutality',
    description: 'Supported physical skills deal 35% increased physical damage.',
    color: '#a85848', requiresTags: ['physical'],
    mods: [mod('damage', 'increased', 0.35, ['physical'])],
    perLevel: [mod('damage', 'increased', 0.08, ['physical'])],
    weight: 9,
  },

  lingering: {
    id: 'lingering', name: 'Lingering Potency',
    description: 'Supported skills have 30% increased effect duration and gain +10% status chance.',
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
    description: 'Supported skills leech 2% of damage dealt as life.',
    color: '#c04060',
    mods: [mod('lifeLeech', 'flat', 0.02)],
    perLevel: [mod('lifeLeech', 'flat', 0.005)],
    weight: 8,
  },

  precision: {
    id: 'precision', name: 'Deadly Precision',
    requiresMechanisms: ['strikes'],
    description: "Supported skills gain +6% critical strike chance and +15% critical strike multiplier.",
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
    description: "Supported skills have 30% less mana cost.",
    color: '#6ab8d8',
    mods: [mod('manaCost', 'more', -0.3)],
    perLevel: [mod('manaCost', 'increased', -0.06)],
    weight: 9,
  },

  stunning: {
    id: 'stunning', name: 'Stunning Blows',
    description: "Supported skills gain +20% ailment chance and 10% increased melee damage.",
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
    description: "Melee hits from supported skills have a 25% chance to trigger an additional strike for 60% damage.",
    color: '#ff8a4a', requiresTags: ['melee'],
    mods: [mod('proc_brutal_strike', 'flat', 0.25)],
    perLevel: [mod('proc_brutal_strike', 'flat', 0.06)],
    weight: 8,
  },

  chaining: {
    id: 'chaining', name: 'Chaining',
    description: "Projectiles from supported skills chain to 2 additional enemies, but deal 15% less damage.",
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
    description: "Area explosions from supported skills trigger 2 secondary explosions for 50% damage.",
    color: '#d8b04a', requiresTags: ['aoe'],
    mods: [mod('aoeScatter', 'flat', 2)],
    perLevel: [mod('aoeScatter', 'flat', 1)],
    weight: 7,
  },

  buried_charge: {
    id: 'buried_charge', name: 'Buried Charge',
    description: "Ground placements from supported skills detonate a second time at full effect after 1 second. Grants the supported skill the Pulse tag and increases mana cost by 25%.",
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
    description: "Pulsing ground from supported skills triggers 2 additional detonations before expiring, but deals 10% less damage.",
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
    description: "Sweeping effects from supported skills move with you while maintaining their arc trajectory. Supported skills cost 20% more mana.",
    color: '#c8a0e0', requiresTags: ['sweep'],
    zoneFollow: true,
    mods: [mod('manaCost', 'more', 0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  reapers_encore: {
    id: 'reapers_encore', name: "Reaper's Encore",
    description: "Swings from supported skills have a 35% chance to trigger a free follow-up sweep across your front after a brief delay. Supported skills cost 15% more mana.",
    color: '#b088d0', requiresTags: ['melee'],
    followUp: { skillId: 'follow_sweep', chance: 0.35, delay: 0.35 },
    mods: [mod('manaCost', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 6,
  },

  // --- The cadence gems (one knob, every clock) --------------------------------
  accelerando: {
    id: 'accelerando', name: 'Accelerando',
    description: "Sequential pulses, cascades, and salvos from supported skills trigger progressively faster, reducing each interval to 70% of the previous one. Supported skills deal 10% less damage.",
    color: '#e8d088', requiresTags: ['aoe'],
    cadence: { intervalStep: 0.7 },
    mods: [mod('damage', 'more', -0.1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  ritardando: {
    id: 'ritardando', name: 'Ritardando',
    description: "Sequential pulses, cascades, and salvos from supported skills trigger progressively slower, extending each interval to 140% of the previous one. Supported skills deal 25% more damage.",
    color: '#c8b078', requiresTags: ['aoe'],
    cadence: { intervalStep: 1.4 },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  square_sigil: {
    id: 'square_sigil', name: 'Square Sigil',
    description: "Converts the area of effect of supported skills into a square.",
    color: '#b8a8d8', requiresTags: ['aoe'],
    mods: [mod('aoeShape', 'override', AOE_SHAPE.square)],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 6,
  },

  triangle_sigil: {
    id: 'triangle_sigil', name: 'Triangle Sigil',
    description: "Converts the area of effect of supported skills into a forward-pointing triangle that deals 15% more damage.",
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
    description: "Minions from supported skills are 40% larger and have 35% more damage and maximum life, but your maximum minion count for the skill is reduced by 50%.",
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
    description: "Supported skills summon +1 minion per cast simultaneously, and cost 40% more mana.",
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
    description: "Supported skills summon +2 minions per cast in a scattered sequence, and cost 60% more mana.",
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
    description: "Minions from supported skills explode on reaching low life, dealing 60% of their maximum life as fire damage in an area.",
    color: '#e86848', requiresTags: ['summon'],
    mods: [mod('minionExplodeLowLife', 'flat', 0.6)],
    perLevel: [mod('minionExplodeLowLife', 'flat', 0.15)],
    weight: 6,
  },

  // The reduced-duration twin of Lingering Potency: brief but brilliant.
  ephemeral: {
    id: 'ephemeral', name: 'Ephemeral',
    description: "Supported skills have 30% reduced effect duration and deal 25% more damage.",
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
    description: "Supported storm skills release all of their strikes simultaneously instead of in sequence.",
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
    description: "Supported storm skills fire 2 additional strikes per salvo.",
    color: '#e8703a', requiresTags: ['storm'],
    mods: [mod('stormCount', 'flat', 2)],
    perLevel: [mod('stormCount', 'flat', 0.25)],
    weight: 6,
  },

  corpsefire: {
    id: 'corpsefire', name: 'Corpsefire',
    requiresMechanisms: ['strikes'],
    description: "Kills with supported skills (or by their summoned minions) have a 50% chance to detonate the corpse for 80% damage. Hits against rare and boss enemies also have a chance to trigger this explosion.",
    color: '#ff5a2a',
    mods: [mod('proc_corpsefire', 'flat', 0.5)],
    perLevel: [mod('proc_corpsefire', 'flat', 0.12)],
    weight: 7,
  },

  blood_price: {
    id: 'blood_price', name: 'Blood Price',
    description: "Supported skills spend life instead of mana and deal 10% more damage.",
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
    description: "Persistent minions from supported skills have 40% reduced respawn time.",
    color: '#9ab8d8', requiresTags: ['summon'],
    mods: [mod('minionRespawnTime', 'increased', -0.4)],
    perLevel: [mod('minionRespawnTime', 'increased', -0.08)],
    weight: 7,
  },

  // ===== Projectile form & flight ==========================================

  colossal: {
    id: 'colossal', name: 'Colossal Projectiles',
    description: "Projectiles from supported skills have 60% increased size, 20% more damage, and 30% reduced projectile speed.",
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
    description: "Supported skills fire +2 projectiles with 40% reduced projectile size and 25% less damage.",
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
    description: "Projectiles from supported skills have 40% increased projectile speed.",
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
    description: "Projectiles from supported skills loosely home toward nearby enemies, with tracking strength increasing with gem level.",
    color: '#e8a8d8', requiresTags: ['projectile'],
    mods: [mod('homingPower', 'flat', 2)],
    perLevel: [mod('homingPower', 'flat', 1.5)],
    weight: 6,
  },

  unstable_flight: {
    id: 'unstable_flight', name: 'Unstable Flight',
    description: "Projectiles from supported skills weave erratically in flight and deal 15% more damage.",
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
    description: "Damage dealt by supported skills generates 200% more threat.",
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
    description: "Damage dealt by supported skills generates 65% less threat.",
    color: '#b8c8c0', requiresTags: ['attack', 'spell'],
    mods: [mod('threatGen', 'more', -0.65)],
    perLevel: [mod('threatGen', 'more', -0.03)],
    weight: 6, minDropLevel: 6,
  },

  beckoning: {
    id: 'beckoning', name: 'Beckoning',
    description: "Constructs from supported skills taunt nearby enemies and have 35% increased maximum life.",
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
    description: "Hits from supported skills have a 30% chance to inflict Sunscorch, reducing fire resistance, and deal 20% increased damage against sunscorched enemies.",
    color: '#ffb64a', requiresTags: ['fire'],
    mods: [mod('apply_sunscorched', 'flat', 0.3), mod('damageVs_sunscorched', 'increased', 0.2)],
    perLevel: [mod('apply_sunscorched', 'flat', 0.03), mod('damageVs_sunscorched', 'increased', 0.03)],
    weight: 6,
  },
  noonglass: {
    id: 'noonglass', name: 'Noonglass',
    requiresMechanisms: ['strikes'],
    description: "Supported skills deal 8% increased damage and have a 25% chance on hit to Ignite enemies.",
    color: '#ff8a3a', requiresTags: ['fire'],
    mods: [mod('apply_burn', 'flat', 0.25), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_burn', 'flat', 0.04)],
    weight: 6,
  },
  scouring_grit: {
    id: 'scouring_grit', name: 'Scouring Grit',
    description: "Supported skills have 15% increased area of effect and deal 8% increased damage.",
    color: '#d8b878', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('damage', 'increased', 0.08)],
    perLevel: [mod('aoeRadius', 'increased', 0.02)],
    weight: 6,
  },

  // --- The GALE gems (the Driftways' wind-craft) ----------------------------
  crosswind: {
    id: 'crosswind', name: 'Crosswind',
    description: "Projectiles from supported skills gain 25% increased projectile speed and swerve erratically in flight.",
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
    description: "Hits from supported skills have a 40% chance to inflict Winded, and deal 20% increased damage against winded enemies.",
    color: '#cfe4f0', requiresTags: ['attack'],
    mods: [
      mod('apply_winded', 'flat', 0.4),
      mod('damageVs_winded', 'increased', 0.2),
    ],
    perLevel: [mod('apply_winded', 'flat', 0.04), mod('damageVs_winded', 'increased', 0.03)],
    weight: 7,
  },

  slipstream: {
    presentation: { counter: 'feathers' },
    id: 'slipstream', name: 'Slipstream',
    description: "Casting a supported skill grants a stack of 5% increased movement speed, up to 4 stacks. All stacks expire after 2.2 seconds without casting.",
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
    description: "Supported movement skills leave standing clouds along their path (for dashes) or at your departure point (for blinks and leaps), allowing traversal over open sky and hastening allies on land.",
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
    description: "Clouds created by supported skills become charged, granting allies standing inside added shock chance and increased damage.",
    color: '#e8e8a8', requiresTags: ['conjure'],
    mods: [mod('cloudCharge', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 11,
  },

  silver_lining: {
    id: 'silver_lining', name: 'Silver Lining',
    description: "Clouds created by supported skills restore life and focus to allies standing inside.",
    color: '#dcecf8', requiresTags: ['conjure'],
    mods: [mod('cloudSalve', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 10,
  },

  slow_weather: {
    id: 'slow_weather', name: 'Slow Weather',
    description: "Clouds created by supported skills have 10% increased area of effect and 30% increased duration.",
    color: '#c8d8ea', requiresTags: ['conjure'],
    mods: [mod('effectDuration', 'increased', 0.3), mod('aoeRadius', 'increased', 0.1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 6, minDropLevel: 9,
  },

  tethered_orbit: {
    id: 'tethered_orbit', name: 'Tethered Orbit',
    description: "Projectiles from supported skills orbit around you on a held tether instead of flying forward.",
    color: '#c8a8e8', requiresTags: ['projectile'],
    mods: [mod('orbitPower', 'flat', 1)],
    perLevel: [mod('orbitPower', 'flat', 0.25)],
    weight: 5,
  },

  gyre: {
    id: 'gyre', name: 'Gyre',
    description: "Projectiles from supported skills spin around their own axis as they travel, with spin radius and speed increasing with gem level.",
    color: '#a8b8e8', requiresTags: ['projectile'],
    mods: [mod('spinPower', 'flat', 8)],
    perLevel: [mod('spinPower', 'flat', 1.5)],
    weight: 5,
  },

  vortex: {
    id: 'vortex', name: 'Vortex',
    description: "Projectiles from supported skills spiral outward from their origin as they travel.",
    color: '#88c8d8', requiresTags: ['projectile'],
    mods: [mod('spiralPower', 'flat', 4)],
    perLevel: [mod('spiralPower', 'flat', 0.75)],
    weight: 5,
  },

  sidewinder: {
    id: 'sidewinder', name: 'Sidewinder',
    description: "Projectiles from supported skills weave in a figure-eight pattern along their flight path.",
    color: '#b8d8b0', requiresTags: ['projectile'],
    mods: [mod('weavePower', 'flat', 6)],
    perLevel: [mod('weavePower', 'flat', 1)],
    weight: 5,
  },

  momentum: {
    id: 'momentum', name: 'Momentum',
    description: "Projectiles from supported skills gain 60% projectile speed per second of flight and deal 10% more damage.",
    color: '#a8c8e8', requiresTags: ['projectile'],
    mods: [mod('projAccel', 'flat', 0.6), mod('damage', 'more', 0.1)],
    perLevel: [mod('projAccel', 'flat', 0.12)],
    weight: 6,
  },

  trueflight: {
    id: 'trueflight', name: 'Trueflight',
    description: "Projectiles from supported skills have 50% less flight deviation from erratic, spiral, spin, and weave effects, and gain 15% increased projectile speed.",
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
    description: 'Supported projectiles shatter on their first impact, firing 3 shards in a cone behind the target. Stacks with any innate projectile shatter.',
    color: '#c8c0b0', requiresTags: ['projectile'],
    mods: [mod('projShrapnel', 'flat', 3)],
    perLevel: [mod('projShrapnel', 'flat', 1)],
    weight: 6,
  },

  fulminate: {
    id: 'fulminate', name: 'Fulminate',
    description: 'Supported projectiles pierce 2 additional targets, and explosive projectile payloads detonate on every hit rather than only at the end of their flight.',
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
    description: 'Shards and secondary projectiles from supported skills inherit 50% of the parent projectile\'s flight pattern, increasing with gem level.',
    color: '#d8c8e8', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:children'],
    mods: [mod('projInherit', 'flat', 0.5)],
    perLevel: [mod('projInherit', 'flat', 0.125)],
    weight: 5,
  },

  cascade_of_knives: {
    id: 'cascade_of_knives', name: 'Cascade of Knives',
    description: 'Supported projectiles chain to 1 additional target, and projectile shatter effects re-arm on each chain bounce.',
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
    description: 'Grants +1 to the level of supported fire skills (+2 at gem level 5), allowing them to scale past their normal level cap.',
    color: '#ff8a4a', requiresTags: ['fire'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_cold: {
    id: 'plus_cold', name: 'Added Levels to Cold Skills',
    description: 'Grants +1 to the level of supported cold skills (+2 at gem level 5), allowing them to scale past their normal level cap.',
    color: '#9ad8f8', requiresTags: ['cold'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_lightning: {
    id: 'plus_lightning', name: 'Added Levels to Lightning Skills',
    description: 'Grants +1 to the level of supported lightning skills (+2 at gem level 5), allowing them to scale past their normal level cap.',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_projectile: {
    id: 'plus_projectile', name: 'Added Levels to Projectile Skills',
    description: 'Grants +1 to the level of supported projectile skills (+2 at gem level 5), allowing them to scale past their normal level cap.',
    color: '#c8d8b8', requiresTags: ['projectile'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_minion: {
    id: 'plus_minion', name: 'Added Levels to Minion Skills',
    description: 'Grants +1 to the level of supported minion skills (+2 at gem level 5), allowing them to scale past their normal level cap.',
    color: '#c8a8e8', requiresTags: ['summon'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  // --- Damage-tag gems ---------------------------------------------------------
  // INCREASED stacks additively with your tree and gear; MORE multiplies the
  // whole pool — the same two words the rest of the engine speaks.

  searing_heat: {
    id: 'searing_heat', name: 'Searing Heat',
    description: 'Supported skills deal 40% increased fire damage.',
    color: '#ff7a2a', requiresTags: ['fire'],
    mods: [mod('damage', 'increased', 0.4, ['fire'])],
    perLevel: [mod('damage', 'increased', 0.1, ['fire'])],
    weight: 8,
  },

  biting_cold: {
    id: 'biting_cold', name: 'Biting Cold',
    description: 'Supported skills deal 40% increased cold damage.',
    color: '#a8dcf0', requiresTags: ['cold'],
    mods: [mod('damage', 'increased', 0.4, ['cold'])],
    perLevel: [mod('damage', 'increased', 0.1, ['cold'])],
    weight: 8,
  },

  static_charge: {
    id: 'static_charge', name: 'Static Charge',
    description: 'Supported skills deal 40% increased lightning damage.',
    color: '#c8e84a', requiresTags: ['lightning'],
    mods: [mod('damage', 'increased', 0.4, ['lightning'])],
    perLevel: [mod('damage', 'increased', 0.1, ['lightning'])],
    weight: 8,
  },

  corrosion: {
    id: 'corrosion', name: 'Corrosion',
    description: 'Supported skills deal 40% increased chaos damage.',
    color: '#7ec850', requiresTags: ['chaos'],
    mods: [mod('damage', 'increased', 0.4, ['chaos'])],
    perLevel: [mod('damage', 'increased', 0.1, ['chaos'])],
    weight: 8,
  },

  ruthless: {
    id: 'ruthless', name: 'Ruthless',
    description: 'Supported skills deal 25% more physical damage.',
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
    description: 'Supported skills deal 30% more damage after you have used three different skills in a row, and have 15% increased mana cost.',
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
    description: 'Supported skills deal 25% more damage after you have used the same skill three times in a row, and have 10% increased mana cost.',
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
    description: 'Supported mimic skills capture enemy skills cast near you without requiring you to be hit by them.',
    color: '#c8a0e8', requiresTags: ['mimic'],
    mods: [mod('mimicWitness', 'flat', 1)],
    perLevel: [mod('mimicWitness', 'flat', 0.15)],
    weight: 8, minDropLevel: 6,
  },

  understudy: {
    id: 'understudy', name: 'Understudy',
    description: 'Supported mimic skills store 2 additional captured skills, and all captured skills are cast at +1 level.',
    color: '#b088d8', requiresTags: ['mimic'],
    mods: [mod('mimicBank', 'flat', 2)],
    levelBonus: 1, levelBonusPer: 0.25,
    weight: 8, minDropLevel: 6,
  },

  // --- The possession seam's gem-side levers (engine/possess.ts) ----------
  iron_trance: {
    id: 'iron_trance', name: 'Iron Trance',
    description: 'Your vacated body takes 30% less damage while possessing a target with the supported skill.',
    color: '#b8a8e8', requiresTags: ['possession'],
    mods: [mod('huskGuard', 'flat', 0.3)],
    perLevel: [mod('huskGuard', 'flat', 0.02)],
    weight: 8, minDropLevel: 8,
  },
  long_communion: {
    id: 'long_communion', name: 'Long Communion',
    description: 'Supported possession skills have 40% increased duration.',
    color: '#a890d8', requiresTags: ['possession'],
    mods: [mod('possessDuration', 'increased', 0.4)],
    perLevel: [mod('possessDuration', 'increased', 0.05)],
    weight: 8, minDropLevel: 8,
  },

  // --- Minion investment gems ----------------------------------------------------

  vicious_brood: {
    id: 'vicious_brood', name: 'Vicious Brood',
    description: 'Minions from supported skills deal 40% increased damage.',
    color: '#d078b0', requiresTags: ['summon'],
    mods: [mod('minionDamage', 'increased', 0.4)],
    perLevel: [mod('minionDamage', 'increased', 0.1)],
    weight: 7,
  },

  hardy_brood: {
    id: 'hardy_brood', name: 'Hardy Brood',
    description: 'Minions from supported skills have 50% increased maximum life.',
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
    description: 'While below your minion limit, a claimable husk spawns near you every 7 seconds. Minions from supported skills have 10% increased maximum life.',
    color: '#a8c878', requiresTags: ['throng'],
    throngSource: { kind: 'trickle', everySec: 7, at: 'near' },
    mods: [mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionLife', 'increased', 0.05)],
    weight: 5,
  },
  hidden_reserves: {
    presentation: { counter: 'husks' },
    id: 'hidden_reserves', name: 'Hidden Reserves',
    description: 'Hits dealt and taken by you and your minions fill a gauge that spawns 1–2 claimable husks beside you when full. Minions from supported skills deal 8% increased damage.',
    color: '#c8b060', requiresTags: ['throng'],
    throngSource: { kind: 'gauge', per: 'both', fill: 3, yield: [1, 2] },
    mods: [mod('minionDamage', 'increased', 0.08)],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 5,
  },
  teeming_warrens: {
    id: 'teeming_warrens', name: 'Teeming Warrens',
    description: 'Supported throng skills spawn 1 additional husk pocket per zone, and all throng sources yield 50% increased minions.',
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
    description: 'Minions from supported skills gain +1 carapace layer, absorbing one additional hit before taking life damage.',
    color: '#98a878', requiresTags: ['summon'],
    mods: [mod('minionPlies', 'flat', 1)],
    perLevel: [mod('minionPlies', 'flat', 0.15)],
    weight: 6,
  },
  calcified_vigor: {
    id: 'calcified_vigor', name: 'Calcified Vigor',
    description: 'Minions from supported skills gain 70% increased maximum life, and every 50% increased minion life is converted into 1 carapace layer instead.',
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
    description: 'Minions from supported skills gain 90% increased maximum life, and also gain 1 carapace layer per 90% increased minion life without losing their life bonus.',
    color: '#d0c0b0', requiresTags: ['summon'],
    mods: [mod('minionLife', 'increased', 0.9), mod('minionLifePlyEcho', 'flat', 0.9)],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },

  meat_shield: {
    id: 'meat_shield', name: 'Meat Shield',
    description: 'Minions from supported skills take 30% less damage, deal 25% less damage, and stay close to defend you instead of pursuing distant enemies.',
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
    description: 'Hits from supported minions have a 30% chance to taunt enemies.',
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
    description: "When socketed into a supported companion skill, flasks and picked-up orbs also apply to your bonded companions at +50% effectiveness.",
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
    description: "When socketed into a supported companion skill, charges you gain are also granted to your bonded companions, up to their maximum charge limits.",
    color: '#c8a06a', requiresTags: ['companion'],
    mods: [mod('sympathy_pack_charges', 'flat', 1)],
    maxLevel: 1, // a toggle: charge echoes copy counts verbatim, potency gates
    weight: 5, minDropLevel: 8,
  },

  reciprocal_bond: {
    id: 'reciprocal_bond', name: 'Reciprocal Bond',
    description: "When socketed into a supported companion skill, healing a bonded companion also heals you for 40% of the amount restored.",
    color: '#7ec88a', requiresTags: ['companion'],
    mods: [mod('sympathy_feral_reciprocity', 'flat', 1)],
    perLevel: [mod('sympathy_feral_reciprocity', 'flat', 0.125)],
    weight: 5, minDropLevel: 8,
  },

  gentling_hand: {
    id: 'gentling_hand', name: 'Gentling Hand',
    description: "Supported taming skills gain +15% to their guaranteed taming life threshold, +20% taming chance against healthier beasts, and can tame rare beasts.",
    color: '#d8c088', requiresTags: ['companion'],
    mods: [],
    tameMod: { sureBelowAdd: 0.15, wildChanceAdd: 0.2, allowRares: true },
    maxLevel: 1, // the terms are the terms — a claim graft, not a ramp
    weight: 4, minDropLevel: 10,
  },

  beast_master: {
    id: 'beast_master', name: 'Beast Master',
    description: 'Supported companion skills can bond 1 additional beast, but all bonded beasts deal 15% less damage.',
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
    description: 'Deployed traps, mines, and totems from supported skills tether a razor wire back to you, dealing physical damage over time to enemies touching the line.',
    // 'totem' is the umbrella tag every deployed object carries (sentries,
    // totems, pylons); minions stay excluded by simply not being listed.
    color: '#c8b8a0', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { visual: 'tripwire', link: 'caster', dps: 7, damageType: 'physical', width: 8 },
    weight: 6,
  },

  tripwire_web: {
    id: 'tripwire_web', name: 'Tripwire Web',
    description: 'Deployed traps, mines, and totems from supported skills tether razor wires to nearby devices of the same skill, dealing physical damage over time to enemies touching a line.',
    color: '#b0a890', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { visual: 'tripwire_web', link: 'network', dps: 7, damageType: 'physical', width: 8, radius: 380 },
    weight: 5,
  },

  transient_inferno: {
    id: 'transient_inferno', name: 'Transient Inferno',
    description: 'Deployed objects from supported skills link a beam of fire back to you, dealing fire damage over time to enemies in the line.',
    color: '#ff8a3a', requiresTags: ['totem', 'aura'],
    mods: [],
    tether: { visual: 'transient_inferno', link: 'caster', dps: 9, damageType: 'fire', width: 14 },
    weight: 5,
  },

  lifeline: {
    id: 'lifeline', name: 'Lifeline',
    description: 'Supported targeted skills link you to the target for 8 seconds with a healing tether that restores life over time to you, the target, and any allies touching the line.',
    color: '#7ec88a', requiresTags: ['targeted'],
    mods: [],
    tether: { visual: 'lifeline', link: 'target', affects: 'allies', healPerSec: 8, width: 16, duration: 8, color: '#7ec88a' },
    weight: 5,
  },

  witchfire_leash: {
    id: 'witchfire_leash', name: 'Witchfire Leash',
    description: 'Supported targeted skills link you to the target for 8 seconds with a witchfire tether that deals chaos damage over time to enemies touching the line.',
    color: '#9a5ad0', requiresTags: ['targeted'],
    mods: [],
    tether: { visual: 'witchfire_leash', link: 'target', affects: 'enemies', dps: 8, damageType: 'chaos', width: 12, duration: 8 },
    weight: 5,
  },

  taut_wire: {
    id: 'taut_wire', name: 'Taut Wire',
    description: 'Tethers from supported skills deal 50% increased damage and are 30% wider.',
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
    description: 'Objects placed by supported movement skills tether a lightning arc between each other, dealing lightning damage over time to enemies touching the arc.',
    color: '#d8e84a', requiresTags: ['movement'],
    mods: [],
    tether: { visual: 'charged_span', link: 'network', dps: 8, damageType: 'lightning', width: 10, radius: 800 },
    weight: 4,
  },

  // --- Channel-stance gems ---------------------------------------------------------

  walking_meditation: {
    id: 'walking_meditation', name: 'Walking Meditation',
    description: "Allows you to move at 25% of normal movement speed while channeling supported skills, even if the skill normally roots you.",
    color: '#a8d8c8', requiresTags: ['channel'],
    mods: [mod('channelMobility', 'flat', 0.25)],
    perLevel: [mod('channelMobility', 'flat', 0.1)],
    weight: 6,
  },

  weathervane: {
    id: 'weathervane', name: 'Weathervane',
    description: "Grants 60% increased turn rate while channeling supported skills.",
    color: '#c8d8e8', requiresTags: ['channel'],
    mods: [mod('channelTurnRate', 'increased', 0.6)],
    perLevel: [mod('channelTurnRate', 'increased', 0.15)],
    weight: 6,
  },

  turbulence: {
    id: 'turbulence', name: 'Turbulence',
    requiresMechanisms: ['strikes'],
    description: "Supported skills gain +25 knockback and knock enemies back in random directions instead of straight away.",
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
    description: "Supported melee skills swing in a two-step sequence: one strike 70 degrees to one flank, followed 0.2 seconds later by an answering strike 70 degrees to the opposite flank.",
    color: '#88c0d8', requiresTags: ['melee'],
    mods: [],
    aim: { sequence: { steps: [-70, 70], pause: 0.2 } },
    weight: 5,
  },

  wild_abandon: {
    id: 'wild_abandon', name: 'Wild Abandon',
    description: "Supported melee skills strike at random angles across a 220-degree sector and have 50% increased random-strike arc.",
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
    description: "Supported melee skills have 60% less random-strike arc and 40% less swing arc, and deal 20% more damage.",
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
    description: "Allows you to move at 25% of normal movement speed while casting supported skills, stacking with any movement speed while casting the skill already grants.",
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
    description: "Supported area spells repeat twice along your aim line, once in front of and once behind the target point, with each repeat dealing 80% of the previous hit's damage. Supported skills have 25% less area of effect.",
    color: '#a8a0e0', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'more', -0.25)],
    cascade: { count: 2, dir: 'axis', dmgStep: 0.8 },
    weight: 5,
  },

  scattered_cascade: {
    id: 'scattered_cascade', name: 'Scattered Cascade',
    description: "Supported area skills repeat twice at random locations around the target point, with each repeat dealing 85% of the previous hit's damage. Supported skills deal 15% less damage.",
    color: '#b8a0d0', requiresTags: ['aoe'],
    mods: [mod('damage', 'more', -0.15)],
    cascade: { count: 2, dir: 'random', dmgStep: 0.85 },
    weight: 5,
  },

  seismic_march: {
    id: 'seismic_march', name: 'Seismic March',
    description: "Ground impacts from supported skills project 3 additional shockwaves forward at 0.14-second intervals, each 10% smaller and dealing 80% of the previous shockwave's damage.",
    color: '#c0a878', requiresTags: ['aoe'],
    mods: [],
    cascade: { count: 3, dir: 'forward', scaleStep: 0.9, dmgStep: 0.8, interval: 0.14 },
    weight: 5,
  },

  resounding_echo: {
    id: 'resounding_echo', name: 'Resounding Echo',
    description: "Supported skills repeat once, with the repeat having 35% increased area of effect and dealing 35% more damage.",
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
    description: 'Supported skills fire their projectiles sequentially in a salvo that tracks your aim as you turn, dealing 35% less damage per projectile.',
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
    description: "Supported skills fire +1 projectile, launching all projectiles in a parallel rank instead of a fan.",
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
    description: "Parallel projectile ranks from supported skills form 35% tighter together, and supported skills deal 10% increased damage.",
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
    description: "Supported skills have 50% narrower projectile spread and deal 10% more damage.",
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
    description: "Hits from supported skills while unseen deal 35% more damage, stacking with ambush and backstab bonuses.",
    color: '#5a6a88',
    mods: [mod('ambushBonus', 'flat', 0.35)],
    perLevel: [mod('ambushBonus', 'flat', 0.1)],
    weight: 5,
  },

  // --- Cursor-space gems -----------------------------------------------------------

  displaced_conjuring: {
    id: 'displaced_conjuring', name: 'Displaced Conjuring',
    description: "Projectiles from supported skills originate at your target location instead of your position, then fly outward along your aim direction.",
    color: '#c8b0e8', requiresTags: ['projectile'],
    mods: [mod('castAtCursor', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  puppet_strings: {
    id: 'puppet_strings', name: 'Puppet Strings',
    description: "Projectiles from supported skills curve toward your cursor while in flight, with turn rate increasing with gem level.",
    color: '#d0a8e0', requiresTags: ['projectile'],
    mods: [mod('guidePower', 'flat', 2.5)],
    perLevel: [mod('guidePower', 'flat', 0.8)],
    weight: 5,
  },

  detonating_passage: {
    id: 'detonating_passage', name: 'Detonating Passage',
    description: "Projectiles from supported skills trigger explosions along their flight path, each dealing 35% of the skill's damage.",
    color: '#f0b060', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:mints'],
    mods: [],
    trail: { every: 80, blast: { radius: 55, damageScale: 0.35 } },
    weight: 5,
  },

  scorched_wake: {
    id: 'scorched_wake', name: 'Scorched Wake',
    description: "Projectiles from supported skills leave patches of burning ground along their flight path for 2.5 seconds, dealing 30% of the skill's damage every 0.4 seconds.",
    color: '#e88a4a', requiresTags: ['projectile'],
    requiresMechanisms: ['flight:mints'],
    mods: [],
    trail: { every: 90, zone: { radius: 40, duration: 2.5, tickInterval: 0.4, damageScale: 0.3 } },
    weight: 5,
  },

  sloughing_wake: {
    id: 'sloughing_wake', name: 'Sloughing Wake',
    description: "Projectiles from supported skills shed shrinking ground patches along their flight path that deal 28% of the skill's damage over 2.8 seconds, lasting up to 2.2x longer when moving slowly and down to 0.5x when moving fast.",
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
    description: "Damage, ailments, and on-hit effects from supported skills are delayed by 2 seconds, then resolve all at once for 25% more damage based on your stats when the fuse expires. Cannot support channeled, guard, or aura skills.",
    color: '#d8a06a', excludeTags: ['channel', 'guard', 'aura'],
    fuse: { delay: 2, tell: 'the fuse hisses…' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('fusePower', 'increased', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  slow_match: {
    id: 'slow_match', name: 'Slow Match',
    description: "Delayed fuse effects on supported skills have 50% longer fuse duration and 40% increased fuse damage.",
    color: '#b08a5a',
    mods: [mod('fuseDelay', 'increased', 0.5), mod('fusePower', 'increased', 0.4)],
    perLevel: [mod('fusePower', 'increased', 0.04)],
    weight: 4, minDropLevel: 8,
  },

  grafted_carapace: {
    presentation: { counter: 'carapace' },
    id: 'grafted_carapace', name: 'Grafted Carapace',
    description: "While guarding with a supported skill, a rear carapace shields a 200-degree arc behind you based on your guard rating, reforming 4 seconds after breaking.",
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
    description: "Stacking ailments inflicted by supported skills gain +2 maximum stacks.",
    color: '#9ac86a',
    mods: [mod('ailmentStacks', 'flat', 2)],
    perLevel: [mod('ailmentStacks', 'flat', 1)],
    weight: 6,
  },

  heavy_caliber: {
    id: 'heavy_caliber', name: 'Heavy Caliber',
    description: "Projectiles from supported skills are 30% larger and gain +40 knockback, but have 15% reduced projectile speed.",
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
    description: 'Hits from supported skills have a 20% chance to ignite enemies, scaling with the hit\'s damage regardless of damage type.',
    color: '#ff7a2a',
    mods: [mod('apply_burn', 'flat', 0.2)],
    perLevel: [mod('apply_burn', 'flat', 0.05)],
    weight: 7,
  },

  bleed_chance: {
    id: 'bleed_chance', name: 'Chance to Bleed',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to inflict bleed, scaling with the hit\'s damage.',
    color: '#b03030',
    mods: [mod('apply_bleed', 'flat', 0.25)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 7,
  },

  poison_chance: {
    id: 'poison_chance', name: 'Chance to Poison',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to inflict poison, scaling with the hit\'s damage.',
    color: '#7ec850',
    mods: [mod('apply_poison', 'flat', 0.25)],
    perLevel: [mod('apply_poison', 'flat', 0.05)],
    weight: 7,
  },

  chill_chance: {
    id: 'chill_chance', name: 'Chance to Chill',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to chill enemies.',
    color: '#7ad4ff',
    mods: [mod('apply_chill', 'flat', 0.25)],
    perLevel: [mod('apply_chill', 'flat', 0.05)],
    weight: 7,
  },

  shock_chance: {
    id: 'shock_chance', name: 'Chance to Shock',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 20% chance to shock enemies, increasing the damage they take.',
    color: '#ffe14a',
    mods: [mod('apply_shock', 'flat', 0.2)],
    perLevel: [mod('apply_shock', 'flat', 0.05)],
    weight: 6,
  },

  stun_chance: {
    id: 'stun_chance', name: 'Chance to Stun',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 12% chance to stun enemies.',
    color: '#cccccc',
    mods: [mod('apply_stun', 'flat', 0.12)],
    perLevel: [mod('apply_stun', 'flat', 0.03)],
    weight: 5,
  },

  freeze_chance: {
    id: 'freeze_chance', name: 'Chance to Freeze',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 6% chance to freeze enemies directly without requiring chill stacks.',
    color: '#d8f4ff',
    mods: [mod('apply_frozen', 'flat', 0.06)],
    perLevel: [mod('apply_frozen', 'flat', 0.02)],
    weight: 4,
  },

  provocation: {
    id: 'provocation', name: 'Provocation',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 35% chance to taunt enemies, forcing them to target you and reducing the damage they deal to other allies.',
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
    description: 'Hits from supported skills have a 30% chance to inflict Harrowing, and deal 12% more damage per Harrowing stack on the target.',
    color: '#b8a4d8',
    mods: [mod('apply_harrowing', 'flat', 0.3), mod('damageVs_harrowing', 'flat', 0.12)],
    perLevel: [mod('apply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  haunted_service: {
    id: 'haunted_service', name: 'Haunted Service',
    description: 'Hits from supported minions have a 25% chance to inflict Harrowing. Supported minions deal 15% increased damage.',
    color: '#9a86c8', requiresTags: ['minion'],
    mods: [mod('minionApply_harrowing', 'flat', 0.25), mod('minionDamage', 'increased', 0.15)],
    perLevel: [mod('minionApply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  potency: {
    id: 'potency', name: 'Potency',
    requiresMechanisms: ['status:power'],
    description: 'Ailments inflicted by supported skills have 30% increased magnitude.',
    color: '#c88ad0',
    mods: [mod('statusMagnitude', 'increased', 0.3)],
    perLevel: [mod('statusMagnitude', 'increased', 0.08)],
    weight: 6,
  },

  conflagrant: {
    id: 'conflagrant', name: 'Conflagrant',
    requiresMechanisms: ['status:power'],
    description: 'Fire ailments inflicted by supported skills have 35% more magnitude.',
    color: '#ff6a3a', requiresTags: ['fire'],
    mods: [mod('statusMagnitude', 'more', 0.35, ['fire'])],
    perLevel: [mod('statusMagnitude', 'more', 0.06, ['fire'])],
    weight: 5,
  },

  // --- Damage conversion -------------------------------------------------------

  flameforged: {
    id: 'flameforged', name: 'Flameforged',
    requiresMechanisms: ['strikes'],
    description: 'Converts 50% of supported skills\' physical damage to fire damage, scaling up to 100% at maximum gem level.',
    color: '#e87838', requiresTags: ['physical'],
    mods: [mod('convert_physical_fire', 'flat', 0.5)],
    perLevel: [mod('convert_physical_fire', 'flat', 0.125)],
    weight: 7,
  },

  // --- Repeats & salvos ----------------------------------------------------------

  // THE SUPPORT BASE conversion (her Multistrike ruling, 2026-08-28): the
  // gem's IDENTITY (the re-aim, the lock, the 25% damage price) stays
  // fixed on the def; the STRIKES and the further speed OFFSET are cut
  // per copy. THE IDENTITY LAW: the canonical cut (rows[0] per axis) is
  // EXACTLY the legacy gem — two strikes, no speed price — so every
  // existing copy, worn graft and census probe folds byte-identical
  // (absent == identical), and only FRESH drops roll the spread. The
  // premier cut (THREE strikes, unpriced) is the chase; the floor (one
  // strike, leaden) keeps a drop from ever being "complete" by default.
  multistrike: {
    id: 'multistrike', name: 'Multistrike',
    description: 'Supported melee skills repeat additional times in rapid succession, re-aiming at the nearest enemy on each repeat and locking you in place until the sequence finishes. Supported skills deal 25% less damage.',
    color: '#e09858', requiresTags: ['melee'], excludeTags: ['channel'],
    rollBase: {
      axes: [
        { id: 'strikes', rows: [
          { id: 'two', weight: 3, line: 'two extra strikes', mods: [mod('repeatCount', 'flat', 2)] },
          { id: 'one', weight: 3, line: 'one extra strike', mods: [mod('repeatCount', 'flat', 1)] },
          { id: 'three', weight: 1, line: 'three extra strikes', mods: [mod('repeatCount', 'flat', 3)] },
        ] },
        { id: 'tempo', rows: [
          { id: 'clean', weight: 2, line: 'the flurry asks no further price', mods: [] },
          { id: 'light', weight: 3, line: '8% less attack speed', mods: [mod('attackSpeed', 'more', -0.08)] },
          { id: 'heavy', weight: 3, line: '14% less attack speed', mods: [mod('attackSpeed', 'more', -0.14)] },
          { id: 'leaden', weight: 2, line: '20% less attack speed', mods: [mod('attackSpeed', 'more', -0.2)] },
        ] },
      ],
    },
    mods: [
      mod('repeatRetarget', 'override', 1),
      mod('repeatLock', 'override', 1),
      mod('damage', 'more', -0.25),
    ],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 7,
  },

  spell_echo: {
    id: 'spell_echo', name: 'Spell Echo',
    description: "Supported spells repeat once per cast and deal 15% less damage.",
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
    description: "Supported skills trigger their effect one additional time after a brief delay and deal 20% less damage.",
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
    description: "Supported skills repeat twice, with each repetition having 30% larger area of effect and dealing 30% more damage than the previous one. Supported skills deal 35% less base damage.",
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
    presentation: { counter: 'runes' },
    id: 'unleash', name: 'Unleash',
    description: "Supported skills gain 1 Seal every 1.4 seconds while not casting, up to 2 Seals. Casting consumes all Seals to re-cast the skill once per Seal in rapid succession, and deals 25% less damage.",
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
    description: "Melee strikes from supported skills chain outward to hit 1 additional nearby enemy beyond the swing arc.",
    color: '#c8a878', requiresTags: ['melee'],
    mods: [mod('meleeReverb', 'flat', 1)],
    perLevel: [mod('meleeReverb', 'flat', 0.5)],
    weight: 8,
  },

  splash: {
    id: 'splash', name: 'Splintering Impact',
    description: "Hits from supported skills splash 50% of their damage to enemies near the target. Supported skills deal 10% less damage.",
    color: '#a8c8d8', requiresTags: ['melee', 'projectile'],
    mods: [mod('splashRadius', 'flat', 60), mod('damage', 'more', -0.1)],
    perLevel: [mod('splashRadius', 'flat', 12)],
    weight: 8,
  },

  // --- DoT & curse ecosystem -------------------------------------------------

  virulence: {
    id: 'virulence', name: 'Virulence',
    requiresMechanisms: ['affliction'],
    description: "When an enemy dies while afflicted by damage over time from a supported skill, that damage-over-time effect spreads to nearby enemies.",
    color: '#78c878',
    mods: [mod('dotPropagates', 'override', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 7,
  },

  hex_blast: {
    id: 'hex_blast', name: 'Hex Blast',
    description: "Cursed areas created by supported skills detonate after 0.9 seconds, dealing 250% of the curse's base damage.",
    color: '#b06bd4', requiresTags: ['curse'],
    mods: [mod('hexBlast', 'flat', 2.5)],
    perLevel: [mod('hexBlast', 'flat', 0.5)],
    weight: 7,
  },

  no_mans_land: {
    id: 'no_mans_land', name: "No Man's Land",
    description: "Supported area skills leave a lingering damage field for 2.5 seconds.",
    color: '#a88858', requiresTags: ['aoe'],
    mods: [mod('lingerField', 'flat', 2.5)],
    perLevel: [mod('lingerField', 'flat', 0.6)],
    weight: 7,
  },

  // --- The Scentcraft gems (the Garden's pheromone-craft; pooled behind
  // 'nest_entered' — the formicary unlocks the discipline) -------------------
  heavy_musk: {
    id: 'heavy_musk', name: 'Heavy Musk',
    description: "Afflictions applied by supported skills have 40% increased duration and 20% increased area of effect. Supported skills cost 20% more mana.",
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
    description: "Hits from supported skills have a 25% chance to taunt enemies, and effects from supported skills have 15% increased duration.",
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
    description: 'Hits from supported skills have a 20% chance to inflict Bolted, causing enemies to flee, and deal 15% less damage.',
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
    description: 'Curses applied by supported skills rupture when they expire, dealing 250% of the curse\'s base damage around the target.',
    color: '#9858a8', requiresTags: ['curse'],
    mods: [mod('curseRupture', 'flat', 2.5)],
    perLevel: [mod('curseRupture', 'flat', 0.5)],
    weight: 7,
  },

  malpractice: {
    id: 'malpractice', name: 'Malpractice',
    requiresMechanisms: ['affliction'],
    description: "Damage-over-time effects from supported skills rupture when they expire, dealing 80% of their total damage at once.",
    color: '#a85878',
    mods: [mod('dotRupture', 'flat', 0.8)],
    perLevel: [mod('dotRupture', 'flat', 0.15)],
    weight: 7,
  },

  hedonism: {
    id: 'hedonism', name: 'Hedonism',
    description: "Enemies cursed by supported skills gain 25% more attack and cast speed, and allies in the area have a 50% chance to also be cursed. Supported skills have 15% increased area of effect.",
    color: '#e878a8', requiresTags: ['curse'],
    mods: [mod('hedonism', 'override', 1), mod('aoeRadius', 'increased', 0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 6,
  },

  // --- Projectile impact behaviors ---------------------------------------------

  forking: {
    id: 'forking', name: 'Forking',
    description: "Projectiles from supported skills split into 2 projectiles on impact, preserving their flight pattern.",
    color: '#a0c8a0', requiresTags: ['projectile'],
    mods: [mod('forkCount', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  returning: {
    id: 'returning', name: 'Returning',
    description: "Projectiles from supported skills return to their origin at the end of their flight, hitting enemies along the return path.",
    color: '#88b8d8', requiresTags: ['projectile'],
    mods: [mod('projReturn', 'override', PROJ_RETURN.origin)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 8,
  },

  boomerang: {
    id: 'boomerang', name: 'Boomerang',
    description: "Projectiles from supported skills return to your current position at the end of their flight, hitting enemies along the return path.",
    color: '#68a8c8', requiresTags: ['projectile'],
    mods: [mod('projReturn', 'override', PROJ_RETURN.caster)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 7,
  },

  // --- Minion blessings ----------------------------------------------------------

  belligerence_gem: {
    id: 'belligerence_gem', name: 'Belligerence',
    description: "Minions from supported skills have 50% increased aggro range.",
    color: '#d8a848', requiresTags: ['summon'],
    mods: [mod('minionDetectionRange', 'increased', 0.5)],
    perLevel: [mod('minionDetectionRange', 'increased', 0.12)],
    weight: 8,
  },

  furor_gem: {
    id: 'furor_gem', name: 'Furor',
    description: "Minions from supported skills have 25% increased movement, attack, and cast speed.",
    color: '#e8c848', requiresTags: ['summon'],
    mods: [mod('minionHaste', 'increased', 0.25)],
    perLevel: [mod('minionHaste', 'increased', 0.06)],
    weight: 7,
  },

  undying_loyalty: {
    id: 'undying_loyalty', name: 'Undying Loyalty',
    description: "When minions from supported skills die, they trigger their on-death effects and continue fighting for 3 additional seconds before expiring.",
    color: '#b8a0e0', requiresTags: ['summon'],
    mods: [mod('minionUndying', 'flat', 3)],
    perLevel: [mod('minionUndying', 'flat', 0.75)],
    weight: 6,
  },

  soulwalk: {
    id: 'soulwalk', name: 'Soulwalk',
    description: "When no corpse is available, supported corpse skills can target one of your living minions instead without harming or consuming it.",
    color: '#88a8c8', requiresTags: ['corpse'],
    mods: [mod('targetMinionFallback', 'override', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.06)],
    weight: 7,
  },

  sacrificial_rites: {
    id: 'sacrificial_rites', name: 'Sacrificial Rites',
    description: "When no corpse is available, supported corpse skills sacrifice one of your living minions to create a corpse, triggering minion on-death effects.",
    color: '#b04868', requiresTags: ['corpse'],
    mods: [mod('sacrificeMinions', 'override', 1)],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 6,
  },

  corpse_wagon: {
    id: 'corpse_wagon', name: 'Corpse Wagon',
    description: "Supported corpse skills consume up to 2 additional corpses per cast to amplify their effect, and have 15% less cast speed.",
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
    presentation: { counter: 'totems' },
    id: 'spirit_totem', name: 'Spirit Totem',
    constructLooks: { spiritTotem: 'object_spirit_totem' },
    description: "Supported skills are cast by a placed totem instead of by you and deal 25% less damage. Placing a totem takes twice the skill's cast time.",
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
    description: "Supported skills fire 1 fewer projectile (to a minimum of 1), and remaining projectiles have 25% increased speed and deal 35% more damage.",
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
    description: "Supported skills have 30% increased cooldown recovery speed.",
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
    presentation: { counter: 'mirrors' },
    id: 'phantasmal_echo', name: 'Phantasmal Echo',
    description: "Using a supported skill summons a mirage at your shoulder for 5 seconds that periodically re-casts the skill at nearby enemies for 45% damage. Supported skills cost 30% more mana.",
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
    presentation: { counter: 'ancestors' },
    id: 'ancestral_call', name: 'Ancestral Call',
    description: "Using a supported melee skill summons an ancestor spirit for 0.45 seconds that dashes to a nearby enemy and strikes once for 60% damage. Supported skills cost 25% more mana.",
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
    presentation: { counter: 'shadows' },
    id: 'vessel_of_shadow', name: 'Vessel of Shadow',
    description: "Supported shadow-clone skills summon an autonomous, killable shadow minion for 12 seconds that fights with melee attacks scaling with your minion stats instead of mirroring your casts.",
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
    description: "Mirages and shadow clones from supported skills act 40% more frequently.",
    color: '#b8a8e8',
    requiresTags: ['mirage', 'clone'],
    mods: [mod('constructCastRate', 'more', 0.4)],
    perLevel: [mod('constructCastRate', 'increased', 0.06)],
    weight: 6,
  },

  sweeping_blow: {
    id: 'sweeping_blow', name: 'Sweeping Blow',
    description: "Supported melee cone skills project their swing forward as a traveling crescent wave that hits each enemy in its path once. Supported skills deal 20% less damage and cost 35% more mana.",
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
    description: "Supported skills have 50% more mana cost (+5 flat mana), and gain added damage on their primary hit equal to 80% of the mana spent.",
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
    description: "Decaying minions from supported skills decay 40% slower and deal 20% less damage.",
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
    description: "Minions from supported skills regenerate 3 life plus 0.8% of their maximum life per second.",
    color: '#8ae0a0',
    requiresTags: ['minion'],
    mods: [mod('minionRegen', 'flat', 3), mod('minionRegenPct', 'flat', 0.008)],
    perLevel: [mod('minionRegen', 'flat', 1), mod('minionRegenPct', 'flat', 0.002)],
    weight: 8,
  },

  bloodletters_rhythm: {
    id: 'bloodletters_rhythm', name: "Bloodletter's Rhythm",
    requiresMechanisms: ['strikes'],
    description: "Supported skills gain +10% chance to inflict Bleed, and each Bleed inflicted has a 35% chance to grant a Fury charge.",
    color: '#c03030',
    requiresTags: ['attack'],
    mods: [mod('proc_bloodletters_rhythm', 'flat', 0.35), mod('apply_bleed', 'flat', 0.10)],
    perLevel: [mod('proc_bloodletters_rhythm', 'flat', 0.05)],
    weight: 7,
  },

  exposure: {
    id: 'exposure', name: 'Exposure',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills and their minions have a 30% chance to inflict Vulnerable, causing targets to take 8% more damage per stack (up to 5 stacks).',
    color: '#d878b0',
    mods: [mod('apply_vulnerable', 'flat', 0.3)],
    perLevel: [mod('apply_vulnerable', 'flat', 0.06)],
    weight: 6,
  },

  bristling_riposte: {
    id: 'bristling_riposte', name: 'Bristling Riposte',
    description: 'Hits from supported skills gain 80% of your flat thorns as added physical damage.',
    color: '#b09060', requiresTags: ['melee', 'attack'],
    mods: [mod('thornsToHit', 'flat', 0.8)],
    perLevel: [mod('thornsToHit', 'flat', 0.15)],
    weight: 5,
  },

  // --- The mender's kit ('heal'-tag gates — the healer support family) ------

  intensive_care: {
    id: 'intensive_care', name: 'Intensive Care',
    description: 'Supported skills have 40% increased healing power.',
    color: '#7ec88a', requiresTags: ['heal'],
    mods: [mod('healPower', 'increased', 0.4)],
    perLevel: [mod('healPower', 'increased', 0.1)],
    weight: 7,
  },

  mending_chain: {
    id: 'mending_chain', name: 'Mending Chain',
    description: 'Heals from supported skills chain to 2 additional wounded allies nearby at 75% effectiveness per bounce. Supported skills have 30% more mana cost.',
    color: '#8ad8c8', requiresTags: ['heal'],
    mods: [mod('chainCount', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  overmend: {
    id: 'overmend', name: 'Overmend',
    description: '60% of healing beyond full life from supported skills is granted as ward.',
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
    description: 'Kills with supported skills have a 25% chance to drop a Ferocity fragment that grants stacking increased damage when picked up.',
    color: '#e8784a',
    mods: [mod('remnantDrop_ferocity', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_ferocity', 'flat', 0.06)],
    weight: 6,
  },

  bulwark_shards: {
    id: 'bulwark_shards', name: 'Bulwark Shards',
    description: 'Kills with supported skills have a 20% chance to drop a Bulwark shard that grants stacking armor when picked up.',
    color: '#8aa8c8',
    mods: [mod('remnantDrop_bulwark', 'flat', 0.2)],
    perLevel: [mod('remnantDrop_bulwark', 'flat', 0.05)],
    weight: 6,
  },

  rage_remnants: {
    id: 'rage_remnants', name: 'Rage Remnant',
    description: 'Kills with supported attacks have a 25% chance to drop a Rage mote that grants 2 Rage charges when picked up.',
    color: '#e04030', requiresTags: ['attack'],
    mods: [mod('remnantDrop_rage', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_rage', 'flat', 0.06)],
    weight: 5,
  },

  remnant_conduit: {
    id: 'remnant_conduit', name: 'Remnant Conduit',
    description: 'Using supported skills has a 12% chance to spawn an elemental remnant nearby that empowers your next skill of that element when picked up.',
    color: '#e8c86a',
    requiresTags: ['fire', 'cold', 'lightning'],
    mods: [mod('remnantOnCast', 'flat', 0.12)],
    perLevel: [mod('remnantOnCast', 'flat', 0.03)],
    weight: 7,
  },

  metronome: {
    id: 'metronome', name: 'Metronome',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 50% chance to grant a Tempo stack, increasing attack and cast speed up to 8 stacks. Taking a hit removes all Tempo stacks.',
    color: '#7ae0c8',
    requiresTags: ['attack', 'spell'],
    mods: [mod('proc_tempo', 'flat', 0.5)],
    perLevel: [mod('proc_tempo', 'flat', 0.06)],
    weight: 7,
  },

  colossus_stance: {
    id: 'colossus_stance', name: 'Colossus Stance',
    description: "Supported skills deal 28% more damage and have 20% increased area of effect after you have remained stationary for 1 second, but deal 10% less damage if used within 0.15 seconds of moving.",
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
    description: "Minions from supported skills regenerate 6 life plus 2% of their maximum life per second, and deal 25% less damage.",
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
    description: "Overdrive debt on supported skills recovers at 35% of its normal rate even while casting, but overall overdrive recovery is 25% slower.",
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
    description: "Supported channeled skills lock their target location when channeling begins, keeping all pulses and releases on that point, and deal 15% more damage.",
    color: '#a8a8d8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelLockAim', 'flat', 1), mod('damage', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  reckless_breadth: {
    id: 'reckless_breadth', name: 'Reckless Breadth',
    description: "Supported melee skills have 80% increased swing arc and 30% less reach.",
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
    description: "35% of minion blessings granted by supported skills also apply to you.",
    color: '#c8b8d8', requiresTags: ['minion'],
    mods: [mod('offeringShare', 'flat', 0.35)],
    perLevel: [mod('offeringShare', 'flat', 0.08)],
    weight: 5,
  },

  deep_reserves: {
    presentation: { counter: 'cistern' },
    id: 'deep_reserves', name: 'Deep Reserves',
    description: 'Grants 3 charges to supported skills with no innate charges, plus +1 charge to skills that already have charges, with 15% reduced charge recovery rate. Cooldown skills use these charges as a magazine; skills without a cooldown consume a charge to deal 20% more damage and recover 1 charge after 4 seconds without casting.',
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
    description: "Supported magazine skills gain +2 maximum rounds and deal 10% reduced damage.",
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
    description: "Supported magazine skills have 40% increased reload speed and 25% faster cooldown recovery.",
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
    description: "The final round in the magazine of supported skills deals 50% more damage.",
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
    presentation: { counter: 'chamber' },
    id: 'chambered_casting', name: 'Chambered Casting',
    description: 'Converts the supported skill into a 3-round munition skill that deals 20% more damage and has 30% increased area of effect, +25% ailment chance, and 25% increased effect duration. When all rounds are spent, the next use reloads the chamber.',
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
    description: "Projectiles from supported skills bounce off walls and terrain up to 2 times.",
    color: '#b0b8a0', requiresTags: ['projectile'],
    mods: [mod('projBounce', 'flat', 2)],
    perLevel: [mod('projBounce', 'flat', 1)],
    weight: 6,
  },

  // THE FOURTH WALL's trajectory lever (projFrameBounce — the frame-rebound
  // lane): Ricochet's sibling aimed at the edge of vision instead of the
  // masonry. One stat, read at the one spawn fold; the projectile step's
  // frame-rebound lane re-arms range + hit ledger per rebound.
  mirrored_bounds: {
    id: 'mirrored_bounds', name: 'Mirrored Bounds',
    description: "Projectiles from supported skills rebound off the edge of the screen up to 2 times, refreshing their flight range on each rebound.",
    color: '#8ad0e8', requiresTags: ['projectile'],
    mods: [mod('projFrameBounce', 'flat', 2)],
    perLevel: [mod('projFrameBounce', 'flat', 1)],
    weight: 5,
  },

  recurve: {
    id: 'recurve', name: 'Recurve',
    description: "Projectiles from supported skills have a 35% chance on hit to curve back and strike the same target again, with the chance decreasing on each return.",
    color: '#d8a8b8', requiresTags: ['projectile'],
    mods: [mod('projRecurve', 'flat', 0.35)],
    perLevel: [mod('projRecurve', 'flat', 0.08)],
    weight: 5,
  },

  shredding_return: {
    id: 'shredding_return', name: 'Shredding Return',
    description: "Projectiles from supported skills shatter into 4 outward shards when caught on return, when reaching maximum range, or when hitting a wall.",
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
    description: 'Supported skills pass through terrain and obstacles, and deal 25% less damage.',
    color: '#9a8ab8',
    mods: [mod('phasing', 'flat', 1), mod('damage', 'more', -0.25)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 4,
  },

  // --- Construct FX & rotation (the §5 batch) ---------------------------------

  pulsing_ramparts: {
    id: 'pulsing_ramparts', name: 'Pulsing Ramparts',
    description: "Deployed constructs and walls from supported skills emit a damaging pulse every second for 40% of the skill's damage and on-hit effects. Supported skills cost 30% more mana.",
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
    description: "Deployed constructs from supported skills explode on placement, dealing 60% of the skill's damage in an area around them. Supported skills cost 25% more mana.",
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
    description: "Supported channeled beam skills automatically rotate around you while channeled and deal 10% more damage.",
    color: '#b8c8e8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelAutoSpin', 'flat', 1.7), mod('damage', 'more', 0.1)],
    perLevel: [mod('channelAutoSpin', 'flat', 0.3)],
    weight: 5,
  },

  whirling_sigil: {
    id: 'whirling_sigil', name: 'Whirling Sigil',
    description: "Directional lingering ground areas from supported skills continuously rotate in place.",
    color: '#d8b8e8', requiresTags: ['aoe'], requiresMechanisms: ['surface'],
    excludeTags: ['melee'],
    mods: [mod('aoeSpin', 'flat', 2.4)],
    perLevel: [mod('aoeSpin', 'flat', 0.5)],
    weight: 5,
  },

  enduring_snares: {
    id: 'enduring_snares', name: 'Enduring Snares',
    description: "Ground traps and snares from supported skills re-arm on a 3-second cooldown instead of being consumed when triggered, and deal 15% less damage.",
    color: '#b0a888', requiresTags: ['duration', 'trap'],
    mods: [mod('embedIcd', 'flat', 3), mod('damage', 'more', -0.15)],
    perLevel: [mod('embedIcd', 'flat', -0.35)],
    weight: 5,
  },

  // --- Fissure levers (the §6 batch) -------------------------------------------

  splintered_earth: {
    id: 'splintered_earth', name: 'Splintered Earth',
    description: "Supported fissure skills create 1 additional fissure fanned beside the first and deal 20% less damage.",
    color: '#c89868', requiresTags: ['fissure'],
    mods: [mod('fissureCount', 'flat', 1), mod('damage', 'more', -0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  branching_fissures: {
    id: 'branching_fissures', name: 'Branching Fissures',
    description: "Fissures from supported skills split into 2 smaller branching fissures and cost 30% more mana.",
    color: '#b88858', requiresTags: ['fissure'],
    mods: [mod('fissureBranches', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('fissureBranches', 'flat', 0.5)],
    weight: 5,
  },

  suffusion: {
    id: 'suffusion', name: 'Suffusion',
    description: "Projectiles from supported skills that pass through one of your ground effects replicate that ground effect where their flight ends.",
    color: '#a8d8b8', requiresTags: ['projectile'],
    mods: [mod('suffusion', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  // --- Curse & ceremony gems (the §8 batch) -----------------------------------

  deliberate_ruin: {
    id: 'deliberate_ruin', name: 'Deliberate Ruin',
    description: "Supported skills have 30% less cast speed and deal 35% more damage. Cannot support channeled, instant, or guard skills.",
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
    description: "Curses from supported skills have 30% reduced duration and rupture when they expire for 200% of their base damage.",
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
    description: 'Grants the supported summon or companion skill an Assault command (Shift + skill key) that orders its minions to march to the target location and attack enemies there.',
    // THE BOND TAKES ORDERS too (2026-09-16): a companion skill's retinue
    // answers the same commandMinions door (World.minionServes reads the
    // '__companion:' marker), so the gem's gate names the tamed-bond family
    // beside the summons — the meta CHAIN then plays the bond's own stance
    // shift first and this order one beat later.
    color: '#c8a84b', requiresTags: ['summon', 'companion'],
    mods: [],
    meta: { skillId: 'command_assault', label: 'Assault' },
    perLevel: [mod('minionMoveSpeed', 'increased', 0.08)],
    weight: 6,
  },

  self_destruct: {
    id: 'self_destruct', name: 'Self-Destruct',
    description: 'Grants the supported summon skill a Detonate command (Shift + skill key) that causes its minions to explode, dealing fire damage based on their maximum life.',
    color: '#e86848', requiresTags: ['summon'],
    excludeTags: ['persistent', 'totem'],
    mods: [],
    meta: { skillId: 'command_detonate', label: 'Detonate' },
    perLevel: [mod('minionExplodeDeath', 'flat', 0.08)],
    weight: 5,
  },

  shatterrite: {
    id: 'shatterrite', name: 'Shatterrite',
    description: 'Grants the supported totem skill a Shatter command (Shift + skill key) that detonates all active totems from that skill to deal physical area damage.',
    color: '#c8a878', requiresTags: ['totem'],
    mods: [],
    meta: { skillId: 'shatter_totem', label: 'Shatter' },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  beckon_beyond: {
    id: 'beckon_beyond', name: 'Beckon from Beyond',
    description: "Minions from supported skills are summoned at your target location instead of beside you. Supported skills cost 20% more mana.",
    color: '#a878d8', requiresTags: ['summon'],
    mods: [mod('summonAtCursor', 'flat', 1), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 5,
  },

  violent_arrival: {
    id: 'violent_arrival', name: 'Violent Arrival',
    description: "Minions from supported skills trigger an explosion on summon, dealing 40% of their maximum life as damage in an area. Supported skills cost 25% more mana.",
    color: '#d87858', requiresTags: ['summon'],
    mods: [mod('summonImpact', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('summonImpact', 'flat', 0.08)],
    weight: 5,
  },

  pyre_legion: {
    id: 'pyre_legion', name: 'Pyre Legion',
    description: "Minions from supported skills deal 6 fire damage per second to nearby enemies. Supported skills cost 25% more mana.",
    color: '#ff8a4a', requiresTags: ['summon'],
    mods: [mod('manaCost', 'more', 0.25)],
    minionAura: { radius: 90, enemyDps: { amount: 6, type: 'fire' } },
    perLevel: [mod('damage', 'increased', 0.06, ['fire'])],
    weight: 5,
  },

  ritual_ground: {
    id: 'ritual_ground', name: 'Ritual Ground',
    constructLooks: { channelVessel: 'object_channel_vessel' },
    description: "Supported channeled skills instead place a vessel at the target location on cast that channels the skill autonomously for 4 seconds. Supported skills cost 35% more mana.",
    color: '#b8a0d0', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelPersist', 'flat', 4), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('channelPersist', 'flat', 0.8)],
    weight: 5,
  },

  // --- Movement, offerings & the travelling crack (the deferred pass) ---------

  closing_instinct: {
    id: 'closing_instinct', name: 'Closing Instinct',
    description: "Supported movement skills automatically lunge toward the nearest enemy near your cursor and repeat once against a second target, dealing 10% increased damage.",
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
    presentation: { counter: 'effigies' },
    id: 'risen_offering', name: 'Risen Offering',
    description: "Supported offering skills summon a mobile effigy at your feet that carries the offering aura and fires homing chaos wisps at enemies inside. Supported skills cost 25% more mana.",
    color: '#b06888', requiresTags: ['corpse'], excludeTags: ['buff'],
    turret: { castSkillId: 'offering_wisp', life: 50, look: 'offering_effigy' },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  sundering_flight: {
    id: 'sundering_flight', name: 'Sundering Flight',
    description: "Projectiles from supported skills tear a fissure along their flight path that lingers for 1.2 seconds and deals 40% of the skill's damage. Supported skills cost 30% more mana.",
    color: '#c8a058', requiresTags: ['projectile'],
    fissureTrail: { radius: 24, linger: 1.2, tickInterval: 0.4, damageScale: 0.4 },
    mods: [mod('manaCost', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  // --- The reaping court & miasma (this pass) ---------------------------------

  skeletal_strike: {
    id: 'skeletal_strike', name: 'Skeletal Strike',
    description: 'Grants the supported summon skill a Strike command (Shift + skill key) that orders its minions to dash to the nearest enemy and slash.',
    color: '#cfc8b8', requiresTags: ['summon'],
    mods: [],
    meta: { skillId: 'command_skeletal_strike', label: 'Strike' },
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 6,
  },

  ravenous_pact: {
    id: 'ravenous_pact', name: 'Ravenous Pact',
    description: "Minions from supported skills devour your nearest other minion every 6 seconds, healing for 12% of their maximum life and gaining 5% increased damage and 3% increased attack speed for 15 seconds (up to 5 stacks). Supported skills cost 15% more mana.",
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
    description: "Supported curse skills become toggled auras that reserve 25% mana and apply the curse at 40% effect to nearby enemies every 0.75 seconds.",
    color: '#a868c8', requiresTags: ['curse'],
    curseField: { mode: 'follow', radius: 170, tickInterval: 0.75, damageScale: 0.4, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 5,
  },

  miasmic_ground: {
    presentation: { counter: 'mires' },
    id: 'miasmic_ground', name: 'Miasmic Ground',
    description: "Supported curse skills create a cursed ground patch for 10 seconds (up to 1 active at a time) that applies the curse at 50% effect every 0.6 seconds.",
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
    presentation: { counter: 'fangs' },
    id: 'ravening', name: 'Ravening',
    description: 'Supported skills consume all active Frenzy charges on use to deal 15% more damage per charge consumed.',
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
    presentation: { counter: 'gate' },
    id: 'embargo', name: 'Embargo',
    description: 'Supported skills require at least 3 Frenzy charges to use, consuming all Frenzy charges to deal 25% more damage per charge consumed.',
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
    description: "Supported skills have +8 seconds to cooldown and 75% less mana cost.",
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
    description: "Supported skills have +10 seconds to cooldown, deal 90% more damage, and have 15% increased area of effect.",
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
    description: "Directional lingering ground areas from supported skills sweep back and forth across a 160-degree arc every 1.5 seconds and have 25% increased duration.",
    color: '#b06ad8', requiresTags: ['aoe'],
    excludeTags: ['melee'], requiresMechanisms: ['surface'],
    pendulum: { arcDeg: 160, period: 1.5 },
    mods: [mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  phalanx: {
    id: 'phalanx', name: 'Phalanx',
    description: 'Grants the supported guard skill a Thrust attack (Shift + skill key) that strikes enemies in a narrow line in front of you without dropping your guard.',
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
    description: "Supported skills can only be cast while guarding, firing instantly without interrupting block, dealing 20% more damage, and gaining +4 seconds to cooldown.",
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
    description: "While guarding with a supported skill, poise above 25% drains to restore damaged guard health at 2 guard per point of poise spent.",
    color: '#a89878', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.08, ratio: 2.0, floor: 0.25 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 5, minDropLevel: 8,
  },

  reckless_transfusion: {
    id: 'reckless_transfusion', name: 'Reckless Transfusion',
    description: "While guarding with a supported skill, poise drains rapidly to restore damaged guard health at 2.6 guard per point of poise spent, continuing until poise breaks.",
    color: '#c05a48', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.15, ratio: 2.6, floor: 0 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 3, minDropLevel: 14,
  },

  bulwarks_tithe: {
    id: 'bulwarks_tithe', name: 'Bulwark\'s Tithe',
    description: "While guarding with a supported skill, guard health above 33% drains to restore poise at 0.6 poise per point of guard spent.",
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
    description: "While channeling a supported skill, life above 10% drains to restore missing mana at 1.4 mana per point of life spent.",
    color: '#b05a90', requiresTags: ['channel'],
    conduit: { from: 'life', to: 'mana', drainPct: 0.035, ratio: 1.4, floor: 0.1 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  crystal_cistern: {
    id: 'crystal_cistern', name: 'Crystal Cistern',
    description: "While guarding with a supported skill, energy shield above 20% drains without interrupting recharge to restore damaged guard health at 1.6 guard per point spent.",
    color: '#8ad8e8', requiresTags: ['guard'],
    conduit: { from: 'es', to: 'guard', drainPct: 0.07, ratio: 1.6, floor: 0.2 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 4, minDropLevel: 12,
  },

  thoughtburn: {
    id: 'thoughtburn', name: 'Thoughtburn',
    description: "While channeling a supported skill, energy shield above 15% drains without interrupting recharge to restore missing mana at 1.2 mana per point spent.",
    color: '#a8b8f0', requiresTags: ['channel'],
    conduit: { from: 'es', to: 'mana', drainPct: 0.05, ratio: 1.2, floor: 0.15 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 12,
  },

  overflow_reservoir: {
    id: 'overflow_reservoir', name: 'Overflow Reservoir',
    description: "While a supported aura is active, mana above 50% drains to restore missing energy shield at a 1-to-1 ratio.",
    color: '#7ac0d8', requiresTags: ['aura'],
    conduit: { from: 'mana', to: 'es', drainPct: 0.04, ratio: 1.0, floor: 0.5 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  stillmind_conduit: {
    id: 'stillmind_conduit', name: 'Stillmind Conduit',
    description: "While guarding with a supported skill, Insight above 20% drains to restore damaged guard health at 2.2 guard per point of Insight spent.",
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
    description: 'Supported skills deal 15% less damage and 100% more poise damage, inflict 50% longer Sundered duration, and deal 20% more damage against Sundered enemies.',
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
    description: 'Supported skills ignore 50% of enemy insight avoidance, have 25% increased accuracy, and have a 35% chance on hit to inflict Reeling, preventing insight recovery.',
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
    description: 'Hits from supported skills deal 80% more damage to energy shield and have a 30% chance to inflict Voided, preventing energy shield recharge.',
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
    presentation: { counter: 'score' },
    id: 'building_rhythm', name: 'Building Rhythm',
    description: "Each cast of a supported skill grants a stack of 5% increased damage and 3% increased attack and cast speed, up to 6 stacks, expiring after 2 seconds without casting. Cannot support channeled or aura skills.",
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
    description: "Hits from supported skills have a 10% chance to Shock, and deal 7% increased damage per Shock stack on the target.",
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
    description: "Supported movement skills deal 18% more damage and cost 25% more mana.",
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
    description: 'Projectiles from supported skills call down a Judgement Pillar at the end of their flight for 60% of the skill\'s damage. Supported skills have 25% more mana cost.',
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
    description: 'Converts 50% of supported skills\' physical damage to cold damage, scaling up to 100% at maximum gem level.',
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
    description: 'Hits from supported skills have a 35% chance to inflict Faintness, causing targets to swoon at maximum stacks.',
    color: '#d8ccd8', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_faintness', 'flat', 0.35)],
    perLevel: [mod('apply_faintness', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  sickening: {
    id: 'sickening', name: 'Sickening',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 35% chance to inflict Queasy. At 5 stacks, the target becomes Retching, causing its attacks and spells to intermittently fizzle.',
    color: '#a8b86a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_queasy', 'flat', 0.35)],
    perLevel: [mod('apply_queasy', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  unblinking: {
    id: 'unblinking', name: 'Unblinking',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 30% chance to inflict Beheld, converting to Seen at maximum stacks. Supported skills deal 12% more damage against Seen targets.',
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
    description: 'Hits from supported skills have a 30% chance to inflict Disoriented. At 5 stacks, the target\'s movement directions are reversed.',
    color: '#9ad8d0', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_disoriented', 'flat', 0.3)],
    perLevel: [mod('apply_disoriented', 'flat', 0.025)],
    weight: 5, minDropLevel: 10,
  },
  addling: {
    id: 'addling', name: 'Addling',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 20% chance to inflict Addled, causing the target\'s skills to misfire and trigger the wrong ability.',
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
    description: 'Hits from supported skills have a 22% chance to inflict Exposed, increasing damage taken by 40%. Supported skills deal 12% more damage against Exposed targets.',
    color: '#f0d890', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_exposed', 'flat', 0.22), mod('damageVs_exposed', 'flat', 0.12)],
    perLevel: [mod('apply_exposed', 'flat', 0.02), mod('damageVs_exposed', 'flat', 0.015)],
    weight: 5, minDropLevel: 11,
  },
  sanctal_cautery: {
    id: 'sanctal_cautery', name: 'Sanctal Cautery',
    requiresMechanisms: ['strikes'],
    description: 'Hits from supported skills have a 25% chance to inflict Sear, reducing all healing the target receives by 50%.',
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
    description: 'Hits from supported skills have a 60% chance to inflict Scalded against targets that are wading, swimming, soaked, or rain-drenched.',
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
    presentation: { counter: 'pressure' },
    id: 'pressure_seal', name: 'Pressure Seal',
    requiresMechanisms: ['bankless'],
    description: 'Grants 3 charges to supported skills with no innate charges. Charges recharge only while stationary and decay while moving; skills without a cooldown consume a charge to deal 25% more damage.',
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
    description: 'Supported movement skills erupt with boiling water at your departure point, dealing 55% of the skill\'s damage to nearby enemies.',
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
    description: 'Hits from supported skills on wet ground or wet targets release a cloud of dense steam that blocks line of sight without blocking projectiles.',
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
    description: 'When hits from supported skills attune a resonant crystal or creature, its pulses affect only you and your allies and last 60% longer.',
    color: '#d8d0b8', requiresTags: ['attack', 'spell'],
    mods: [mod('tuneFavor', 'flat', 0.6)],
    perLevel: [mod('tuneFavor', 'flat', 0.1)],
    weight: 4, minDropLevel: 7,
  },
  // --- THE TALENT FABRIC's debut gems (docs/engine/talents.md) ----------------
  // THE VICTIM SCOPE as gems: 'vs:' tags on ordinary mods, folded at the
  // hit against the struck body — no new gem field anywhere. Every hit-read
  // gem wears the 'strikes' floor (a never-hitting host has no victim).
  executioners_edge: {
    id: 'executioners_edge', name: "Executioner's Edge",
    requiresMechanisms: ['strikes'],
    description: "Supported skills deal 30% more damage against enemies on low life.",
    color: '#c85050', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.3, ['vs:lowLife'])],
    perLevel: [mod('damage', 'more', 0.04, ['vs:lowLife'])],
    weight: 7, minDropLevel: 4,
  },
  shatterglass: {
    id: 'shatterglass', name: 'Shatterglass',
    requiresMechanisms: ['strikes'],
    description: "Supported skills gain +25% critical strike chance against chilled enemies and +40% critical strike multiplier against frozen enemies.",
    color: '#bfe8ff', requiresTags: ['attack', 'spell'],
    mods: [
      mod('critChance', 'flat', 0.25, ['vs:chill']),
      mod('critChance', 'flat', 0.25, ['vs:frozen']),
      mod('critMulti', 'flat', 0.4, ['vs:frozen']),
    ],
    perLevel: [mod('critChance', 'flat', 0.04, ['vs:chill']), mod('critMulti', 'flat', 0.06, ['vs:frozen'])],
    weight: 6, minDropLevel: 5,
  },
  opportunists_blade: {
    id: 'opportunists_blade', name: "Opportunist's Blade",
    requiresMechanisms: ['strikes'],
    description: "Supported skills deal 35% more damage and gain +30% ailment chance against stunned, frozen, or immobilized enemies.",
    color: '#e0c060', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.35, ['vs:hardCC']), mod('statusChance', 'flat', 0.3, ['vs:hardCC'])],
    perLevel: [mod('damage', 'more', 0.04, ['vs:hardCC'])],
    weight: 6, minDropLevel: 5,
  },
  assassins_angle: {
    id: 'assassins_angle', name: "Assassin's Angle",
    requiresMechanisms: ['strikes'],
    description: "Melee hits from supported skills deal 40% more damage and gain +15% critical strike chance when striking from behind.",
    color: '#9a72c8', requiresTags: ['melee'],
    mods: [mod('damage', 'more', 0.4, ['vs:behind']), mod('critChance', 'flat', 0.15, ['vs:behind'])],
    perLevel: [mod('damage', 'more', 0.05, ['vs:behind'])],
    weight: 6, minDropLevel: 4,
  },
  frostbite_grip: {
    id: 'frostbite_grip', name: 'Frostbite Grip',
    requiresMechanisms: ['strikes'],
    description: "Hits from supported skills against chilled enemies have a 30% chance to freeze the target.",
    color: '#d8f4ff', requiresTags: ['attack', 'spell'],
    mods: [mod('proc_deep_freeze', 'flat', 0.3)],
    perLevel: [mod('proc_deep_freeze', 'flat', 0.06)],
    weight: 5, minDropLevel: 6,
  },
  // THE RECENCY LEDGER as gems: ordinary `when` conditions on instance mods.
  hunters_momentum: {
    id: 'hunters_momentum', name: "Hunter's Momentum",
    description: "Supported skills deal 20% more damage and grant 10% increased movement speed if you have killed an enemy recently.",
    color: '#d8a060', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.2, undefined, 'recentlyKilled'), mod('moveSpeed', 'increased', 0.1, undefined, 'recentlyKilled')],
    perLevel: [mod('damage', 'more', 0.03, undefined, 'recentlyKilled')],
    weight: 7, minDropLevel: 3,
  },
  steady_nerve: {
    id: 'steady_nerve', name: 'Steady Nerve',
    description: "Supported skills deal 25% more damage if you have not been hit recently.",
    color: '#8fa8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.25, undefined, 'notHurtRecently')],
    perLevel: [mod('damage', 'more', 0.03, undefined, 'notHurtRecently')],
    weight: 7, minDropLevel: 3,
  },
  // DERIVED GAUGES as gems: gaugeMod over a quantity the world samples.
  deaths_door: {
    id: 'deaths_door', name: "Death's Door",
    description: "Supported skills deal 3% increased damage per 10% of your missing life.",
    color: '#c85050', requiresTags: ['attack', 'spell'],
    mods: [gaugeMod('damage', 'increased', 0.03, 'life:missing')],
    perLevel: [gaugeMod('damage', 'increased', 0.005, 'life:missing')],
    weight: 6, minDropLevel: 4,
  },
  crowd_favor: {
    id: 'crowd_favor', name: 'Crowd Favor',
    description: "Supported skills deal 3% increased damage per nearby enemy, up to 30%.",
    color: '#e8924a', requiresTags: ['attack', 'spell'],
    mods: [gaugeMod('damage', 'increased', 0.03, 'foes:near')],
    perLevel: [gaugeMod('damage', 'increased', 0.005, 'foes:near')],
    weight: 6, minDropLevel: 4,
  },
  // THE GAUGE GATE as a gem: a threshold, not a scale.
  at_the_brink: {
    id: 'at_the_brink', name: 'At the Brink',
    description: "Supported skills gain +40% critical strike multiplier while you have at least 5 Fury charges.",
    color: '#ff8a4a', requiresTags: ['attack', 'spell'],
    mods: [gaugeGateMod('critMulti', 'flat', 0.4, 'charge:fury', 5)],
    perLevel: [gaugeGateMod('critMulti', 'flat', 0.06, 'charge:fury', 5)],
    weight: 5, minDropLevel: 6,
  },
  // CONTEXT TRIGGERS as gems ('cast' / 'miss' roll with the skill's context,
  // so a socketed grant reaches them like any hit proc).
  fevered_hands: {
    id: 'fevered_hands', name: 'Fevered Hands',
    requiresMechanisms: ['strikes'],
    description: "Landing two consecutive critical strikes with a supported skill causes your next spell hit to be a guaranteed critical strike that deals 50% more damage.",
    color: '#ff9a3a', requiresTags: ['spell'],
    mods: [mod('proc_heating_up', 'flat', 1), mod('proc_hot_streak', 'flat', 1), mod('proc_heat_lost', 'flat', 1)],
    perLevel: [],
    weight: 5, minDropLevel: 6,
  },
  answered_dodge: {
    id: 'answered_dodge', name: 'Answered Dodge',
    requiresMechanisms: ['strikes'],
    description: "When an enemy evades a hit from a supported skill, your next melee hit gains +50% critical strike chance and deals 30% more damage.",
    color: '#e8c060', requiresTags: ['melee'],
    mods: [mod('proc_overpower', 'flat', 1)],
    perLevel: [],
    weight: 5, minDropLevel: 4,
  },
  desperate_measures: {
    id: 'desperate_measures', name: 'Desperate Measures',
    description: "Casting a supported skill while on low mana has a 40% chance to restore 10% of your maximum mana.",
    color: '#8fa8d8', requiresTags: ['spell'],
    mods: [mod('proc_desperate_reserves', 'flat', 0.4)],
    perLevel: [mod('proc_desperate_reserves', 'flat', 0.08)],
    weight: 6, minDropLevel: 3,
  },
};

for (const def of Object.values(SUPPORTS)) {
  if (def.mods.some(m => m.stat === 'orbOnHit_life' || m.stat === 'orbOnHit_mana')) {
    def.description += ORB_HIT_CADENCE_TEXT;
  }
}

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
