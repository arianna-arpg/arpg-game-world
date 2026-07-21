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

import { conversionStat, mod } from '../engine/stats';
import { AOE_SHAPE, PROJ_RETURN, GUARD_CAST_CFG } from '../engine/skills';
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
    description: 'This skill drives with your WHOLE WEIGHT behind it: hits shove far harder, your shove authority grows, and victims arrested mid-flight — by wall or by a body heavy enough to be one — take crueller impact wounds.',
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
    description: 'This skill hits 30% harder against enemies of HIGHER LEVEL than you — and not one point harder against anything else. A gem for hunting up the ladder: quickened ground, sovereigns, everything the world says you are not ready for.',
    color: '#e8c86a', requiresTags: ['attack', 'spell'],
    mods: [mod('overmatch', 'flat', 0.3)],
    perLevel: [mod('overmatch', 'flat', 0.02)],
    weight: 6,
  },
  giantsbane: {
    id: 'giantsbane', name: 'Giantsbane',
    description: 'This skill hits 30% harder against bodies at least half again your own WEIGHT — the mass fabric read as a blade. Ogres, hulks, the anchored and the colossal; the light and the fleet gain you nothing.',
    color: '#c8a068', requiresTags: ['attack', 'spell'],
    mods: [mod('giantsbane', 'flat', 0.3)],
    perLevel: [mod('giantsbane', 'flat', 0.02)],
    weight: 6,
  },
  regicide: {
    id: 'regicide', name: 'Regicide',
    description: 'This skill hits 22% harder against EMPOWERED enemies — magic, rare, champion and crowned blood alike. The trash clears itself; this gem is for the ones wearing names.',
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
    description: 'This skill hits 35% harder against a composite monster\'s PARTS — the shield it hides behind, the censer that blesses its kin, the riders on its back. Nothing extra against the body that carries them: this gem decides where the blow lands, not how hard you swing.',
    color: '#d8b04a', requiresTags: ['attack', 'spell'],
    mods: [mod('limbreaver', 'flat', 0.35)],
    perLevel: [mod('limbreaver', 'flat', 0.025)],
    weight: 6,
  },

  // THE GRAB FABRIC's pair (engine/grab.ts) — one gem per half of the art,
  // scoped by the grapple alphabet itself ('grab' / 'throw' tags), so
  // neither can socket into a skill with no hold to deepen or no catch to
  // send. Battering Ram composes on throws already (melee + the mass
  // stats); these are the fabric-native lanes.
  iron_grip: {
    id: 'iron_grip', name: 'Iron Grip',
    description: 'This skill\'s holds are LOCKED: the grip closes on far heavier bodies, and what it holds struggles free far slower. The mass law bends toward the hand.',
    color: '#c8a068', requiresTags: ['grab'],
    mods: [mod('gripPower', 'flat', 0.35)],
    perLevel: [mod('gripPower', 'flat', 0.06)],
    weight: 6,
  },
  trebuchet_arm: {
    id: 'trebuchet_arm', name: 'Trebuchet Arm',
    description: 'This skill\'s throws leave with SIEGE intent: far more launch authority behind the release, and crueller wounds wherever the flight is arrested — by wall, by body, or by the bottom of something.',
    color: '#d8b078', requiresTags: ['throw'],
    mods: [mod('shoveAuthority', 'flat', 0.35), mod('impactDamage', 'flat', 0.45)],
    perLevel: [mod('impactDamage', 'flat', 0.06)],
    weight: 6,
  },
  // THE COLONY PASS's counterplay gem (engine/plies.ts plyRend, folded at
  // the ply gate + the lite carve): the anti-SWARM blade. Count-durable
  // bodies eat blows, not damage — this gem makes each blow count double.
  exterminator: {
    id: 'exterminator', name: 'Exterminator',
    description: 'This skill\'s blows tear ONE EXTRA PLY from count-durable bodies — swarms, husks, everything that eats hits instead of wounds. Against anything with an honest life bar it adds nothing: this gem is for the crawl.',
    color: '#d8d0b8', requiresTags: ['attack', 'spell'],
    mods: [mod('plyRend', 'flat', 1)],
    perLevel: [mod('plyRend', 'flat', 0.05)],
    weight: 6,
  },

  // --- The Wildcraft disciplines (the jungle's arts, bottled) ----------------
  serrated_edge: {
    id: 'serrated_edge', name: 'Serrated Edge',
    description: 'This skill\'s edge is TOOTHED: hits bleed far more readily, and cut a little deeper besides.',
    color: '#a8563c', requiresTags: ['melee'],
    mods: [mod('apply_bleed', 'flat', 0.35), mod('damage', 'increased', 0.1)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 6,
  },
  envenomed_tips: {
    id: 'envenomed_tips', name: 'Envenomed Tips',
    description: 'This skill\'s projectiles fly DIPPED: hits poison far more readily, and the toxin outstays its welcome.',
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
    description: 'This skill\'s projectiles are FLETCHED FOR THE SKY: far more damage against anything Aloft, and quicker through the air besides.',
    color: '#e8d8a0', requiresTags: ['projectile'],
    mods: [mod('damageVs_aloft', 'increased', 0.35), mod('projectileSpeed', 'increased', 0.1)],
    perLevel: [mod('damageVs_aloft', 'increased', 0.05)],
    weight: 5,
  },
  smothering_spores: {
    id: 'smothering_spores', name: 'Smothering Spores',
    description: 'This skill\'s lingering work hangs THICKER: wider, longer, and laced with a poison that finds idle lungs.',
    color: '#a8d05a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('effectDuration', 'increased', 0.2), mod('apply_poison', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Unmaking graft pair (the war-wound's arts) -----------------------
  loose_thread: {
    id: 'loose_thread', name: 'Loose Thread',
    description: 'Hits with this skill find the LOOSE THREAD: a 25% chance to set the victim unravelling — a compounding rot that spreads from the dead.',
    // attack|spell: the hit-capable gate (tag hygiene — the census flags a
    // universal applier as inert on every flask/banner/ward it would fit).
    color: '#7de84a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_unravelling', 'flat', 0.25)],
    perLevel: [mod('apply_unravelling', 'flat', 0.04)],
    weight: 5,
  },
  entropic_bloom: {
    id: 'entropic_bloom', name: 'Entropic Bloom',
    description: 'This skill\'s lingering work comes apart at the seams: wider, longer, and everything inside it unravels a little.',
    color: '#5ee88a', requiresTags: ['duration'],
    mods: [mod('aoeRadius', 'increased', 0.12), mod('effectDuration', 'increased', 0.18), mod('apply_unravelling', 'flat', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.03)],
    weight: 5,
  },

  // --- The Symbiote grafts (the Caul arts' support pair) --------------------
  grasping_tendrils: {
    id: 'grasping_tendrils', name: 'Grasping Tendrils',
    description: 'This skill\'s edge grows BARBS of living cord: hits snare far more readily, and the grip squeezes a little extra hurt out of whatever it holds.',
    color: '#8a6ab0', requiresTags: ['melee'],
    mods: [mod('apply_ensnared', 'flat', 0.2), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_ensnared', 'flat', 0.03)],
    weight: 6,
  },
  parasitic_pact: {
    id: 'parasitic_pact', name: 'Parasitic Pact',
    description: 'Socket a hungry passenger: every landed hit lets it SIP (a small heal, briefly rationed) — and it sharpens its host out of pure self-interest.',
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
    description: 'This song SUSTAINS: the music rings wider and refuses to end on the beat.',
    color: '#d8a8e0', requiresTags: ['song'],
    mods: [mod('effectDuration', 'increased', 0.3), mod('aoeRadius', 'increased', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },
  countermelody: {
    id: 'countermelody', name: 'Countermelody',
    description: 'A second line UNDER this song: it works harder at everything the verse was already saying.',
    color: '#c088d0', requiresTags: ['song'],
    mods: [mod('damage', 'increased', 0.2), mod('statusChance', 'flat', 0.15)],
    perLevel: [mod('damage', 'increased', 0.04)],
    weight: 5,
  },
  lingering_moment: {
    id: 'lingering_moment', name: 'Lingering Moment',
    description: 'This skill\'s stolen seconds STRETCH: what it slows stays slowed, what it holds stays held.',
    color: '#8ae0e8', requiresTags: ['chrono'],
    mods: [mod('effectDuration', 'increased', 0.35), mod('statusMagnitude', 'increased', 0.15)],
    perLevel: [mod('effectDuration', 'increased', 0.06)],
    weight: 5,
  },
  borrowed_haste: {
    id: 'borrowed_haste', name: 'Borrowed Haste',
    description: 'This skill runs on ADVANCED time: it casts quicker and its clock winds back sooner. Somebody, somewhere, is owed.',
    color: '#a8e8e0', requiresTags: ['chrono'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.15)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  commanding_presence: {
    id: 'commanding_presence', name: 'Commanding Presence',
    description: 'This shout CARRIES: a wider ring hears it, and the order stands longer.',
    color: '#e8c04a', requiresTags: ['warcry'],
    mods: [mod('aoeRadius', 'increased', 0.25), mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  hair_trigger: {
    id: 'hair_trigger', name: 'Hair Trigger',
    description: 'This device is SET NERVOUS: laid quicker, rearmed sooner, wound a shade too tight to be safe.',
    color: '#c8a878', requiresTags: ['trap', 'mine'],
    mods: [mod('cooldownRecovery', 'increased', 0.3), mod('castSpeed', 'increased', 0.2)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.05)],
    weight: 5,
  },
  tinkers_arsenal: {
    id: 'tinkers_arsenal', name: 'Tinker\'s Arsenal',
    description: 'One MORE of this device may stand at once, built sturdier — each hitting a little softer. Quantity is a quality.',
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
    description: 'This skill\'s armed sparks detonate SHUFFLED instead of in placement order — the field forgets its own sequence.',
    color: '#ffe94a', requiresTags: ['channel'],
    releaseOrder: 'random',
    mods: [mod('damage', 'increased', 0.1)],
    weight: 5,
  },
  fortunes_favor: {
    id: 'fortunes_favor', name: "Fortune's Favor",
    description: '25% of this skill\'s uses roll damage TWICE and keep the higher — the gambler\'s edge.',
    color: '#e8d44a',
    mods: [mod('luckyChance', 'flat', 0.25)],
    perLevel: [mod('luckyChance', 'flat', 0.04)],
    weight: 6,
  },
  jinxing_touch: {
    id: 'jinxing_touch', name: 'Jinxing Touch',
    description: 'Hits with this skill have a 20% chance to JINX the victim: their own damage rolls twice and keeps the lower for 5 seconds.',
    color: '#8a78a8',
    mods: [mod('apply_jinxed', 'flat', 0.2)],
    perLevel: [mod('apply_jinxed', 'flat', 0.03)],
    weight: 5,
  },
  tempest_range: {
    id: 'tempest_range', name: 'Tempest Range',
    description: 'The D2 thunder: +25 to this skill\'s MAXIMUM lightning damage (the floor stays where it was — variance is the point).',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [mod('addedMax_lightning', 'flat', 25)],
    perLevel: [mod('addedMax_lightning', 'flat', 5)],
    weight: 6,
  },
  steady_current: {
    id: 'steady_current', name: 'Steady Current',
    description: '+8 to this skill\'s MINIMUM lightning damage — the reliable hum under the thunder.',
    color: '#c8e84a', requiresTags: ['lightning'],
    mods: [mod('addedMin_lightning', 'flat', 8)],
    perLevel: [mod('addedMin_lightning', 'flat', 2)],
    weight: 6,
  },
  loaded_dice: {
    id: 'loaded_dice', name: 'Loaded Dice',
    description: 'This skill\'s damage dice WIDEN by 40% around the same average — jackpots jack higher, fizzles fizzle lower. Feeds anything that reads the top of the roll.',
    color: '#e8c04a',
    mods: [mod('damageSpread', 'flat', 0.4)],
    perLevel: [mod('damageSpread', 'flat', 0.06)],
    weight: 6,
  },
  overload: {
    id: 'overload', name: 'Overload',
    description: 'Hits with this skill that roll in the top 12% of their dice ARC — leaping to up to three nearby enemies at 50% damage. Wider dice and wider windows both feed it.',
    color: '#7af0ff', requiresTags: ['lightning'],
    mods: [mod('proc_overload_arc', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05, ['lightning'])],
    weight: 5,
  },
  unstable_compression: {
    id: 'unstable_compression', name: 'Unstable Compression',
    description: 'This skill\'s AREA re-rolls on every cast — from a pop at 60% to a bloom at 155% of itself. 15% more area damage: instability pays.',
    color: '#e89a4a', requiresTags: ['aoe'],
    variance: { aoe: [0.6, 1.55] },
    mods: [mod('damage', 'more', 0.15, ['aoe'])],
    perLevel: [mod('damage', 'increased', 0.05, ['aoe'])],
    weight: 5,
  },
  parting_gift: {
    id: 'parting_gift', name: 'Parting Gift',
    description: 'Where this skill\'s projectiles END their flight — struck home or spent — a FROST NOVA blooms at the death point. The going-away present.',
    color: '#a8e4ff', requiresTags: ['projectile'],
    sequel: { skillId: 'frost_nova', damageScale: 0.7 },
    mods: [mod('manaCost', 'more', 0.2)],
    perLevel: [mod('damage', 'increased', 0.05, ['cold'])],
    weight: 5, minDropLevel: 8,
  },
  epidemic: {
    id: 'epidemic', name: 'Epidemic',
    description: 'Enemies struck by this skill may RE-RELEASE it from themselves after a beat — each hop at half the odds of the last, three hops at most. The crowd becomes the caster.',
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
    description: 'Adds 3 chaos damage to this skill, whatever it is — the universal lane.',
    color: '#b06bd4',
    mods: [mod('addedChaos', 'flat', 3)],
    perLevel: [mod('addedChaos', 'flat', 1)],
    weight: 6,
  },
  umbral_focus: {
    id: 'umbral_focus', name: 'Umbral Focus',
    description: 'Adds 7 chaos damage — but only a CHAOS skill can drink from this well (the school-specific lane).',
    color: '#8a48c8', requiresTags: ['chaos'],
    mods: [mod('addedChaos', 'flat', 7, ['chaos'])],
    perLevel: [mod('addedChaos', 'flat', 2, ['chaos'])],
    weight: 6,
  },

  // --- The Legion's gifts (demon-kill gem drops lean this way via gemBias) ---
  brimstone_tithe: {
    id: 'brimstone_tithe', name: 'Brimstone Tithe',
    description: 'The pit\'s bargain: this skill deals 30% MORE fire damage — and its mana cost swells 40%. The tithe is always collected.',
    color: '#ff6a2a', requiresTags: ['fire'],
    mods: [mod('damage', 'more', 0.3, ['fire']), mod('manaCost', 'more', 0.4)],
    perLevel: [mod('damage', 'more', 0.02, ['fire'])],
    weight: 5,
  },
  tormentors_glee: {
    id: 'tormentors_glee', name: "Tormentor's Glee",
    description: 'Hits with this skill have a 25% chance to TORMENT (a necrotic gnaw that drags at the feet) — and the skill deals 25% increased damage to the tormented.',
    color: '#8a5ac8', requiresTags: ['chaos', 'curse'],
    mods: [mod('apply_torment', 'flat', 0.25), mod('damageVs_torment', 'increased', 0.25)],
    perLevel: [mod('apply_torment', 'flat', 0.03), mod('damageVs_torment', 'increased', 0.03)],
    weight: 5,
  },
  hellhunger: {
    id: 'hellhunger', name: 'Hellhunger',
    description: 'This skill\'s minions fight with burning teeth: 20% chance to set what they strike ALIGHT.',
    color: '#e0503a', requiresTags: ['minion'],
    mods: [mod('minionApply_burn', 'flat', 0.2), mod('minionDamage', 'increased', 0.1)],
    perLevel: [mod('minionApply_burn', 'flat', 0.03)],
    weight: 5,
  },

  // --- The wildwood & carrion gifts (the bestiary expansion's gem lane) ------
  putrefaction: {
    id: 'putrefaction', name: 'Putrefaction',
    description: 'Hits with this skill have a 20% chance to start the ROT (decay), and the skill deals 20% increased damage to the decaying — sickness begets appetite.',
    color: '#9ab83a', requiresTags: ['chaos'],
    mods: [mod('apply_decay', 'flat', 0.2), mod('damageVs_decay', 'increased', 0.2)],
    perLevel: [mod('apply_decay', 'flat', 0.03), mod('damageVs_decay', 'increased', 0.03)],
    weight: 5,
  },
  // The Karst ladder's on-hit lever (putrefaction's grammar in stone): any
  // physical skill can build toward the statue, and profit from one.
  calcifying: {
    id: 'calcifying', name: 'Calcifying',
    description: 'Hits with this skill settle WEIGHT into the victim: 10% chance to build petrifying, and the skill deals 15% increased damage to the petrified — stone remembers every blow.',
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
    description: 'Supported skills REFRACT: 10% of physical damage becomes each element, and the skill deals 12% increased elemental damage — every blow a spectrum.',
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
    description: 'This skill\'s projectiles trail hooked lines: 8% chance to ROOT the victim outright (movement skills forbidden while held).',
    color: '#8a9a4a', requiresTags: ['projectile'],
    mods: [mod('apply_rooted', 'flat', 0.08)],
    perLevel: [mod('apply_rooted', 'flat', 0.012)],
    weight: 5,
  },
  brood_tender: {
    id: 'brood_tender', name: 'Brood Tender',
    description: 'This skill\'s minions drip venom (20% chance to POISON on hit) and are reared a little hardier.',
    color: '#7fce6a', requiresTags: ['minion'],
    mods: [mod('minionApply_poison', 'flat', 0.2), mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionApply_poison', 'flat', 0.03)],
    weight: 5,
  },
  wound_worrier: {
    id: 'wound_worrier', name: 'Wound-Worrier',
    description: 'Hits with this skill have a 15% chance to open a HEMORRHAGE — and the skill deals 20% increased damage to the hemorrhaging. Worry the wound; reopen it for the pop.',
    color: '#e04858', requiresTags: ['attack', 'physical'],
    mods: [mod('apply_hemorrhage', 'flat', 0.15), mod('damageVs_hemorrhage', 'increased', 0.2)],
    perLevel: [mod('apply_hemorrhage', 'flat', 0.02), mod('damageVs_hemorrhage', 'increased', 0.03)],
    weight: 5,
  },

  // --- Blood, mending & the guard hall --------------------------------------------
  sanguine_feast: {
    id: 'sanguine_feast', name: 'Sanguine Feast',
    description: 'Bleeds this skill inflicts LEECH: 5% of their tick damage flows back to you as life.',
    color: '#b03030', requiresTags: ['physical', 'attack'],
    mods: [mod('dotLeech_bleed', 'flat', 0.05)],
    perLevel: [mod('dotLeech_bleed', 'flat', 0.01)],
    weight: 5,
  },
  mending_echoes: {
    id: 'mending_echoes', name: 'Mending Echoes',
    description: 'This skill\'s direct heals POUR instead: 130% of the mend, over 6 seconds — slower, stronger, stackable (the Renew-maker).',
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
    description: 'WHILE GUARDING: +20% passive block chance and +12 block value — the wall behind the wall.',
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
    description: 'This skill\'s lingering fissure segments randomly RE-LIGHT — the crag stays dangerous, unpredictably.',
    color: '#ff8a4a', requiresTags: ['fissure'],
    fissureVolatile: { interval: 1.2, chance: 0.4, damageScale: 0.8 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  tectonic_echoes: {
    id: 'tectonic_echoes', name: 'Tectonic Echoes',
    description: 'Lingering fissure segments glow ARMED: run over one and it detonates an aftershock around that stretch of crack (re-arms in 2.5s). The whack-a-mole movement game.',
    color: '#e8a24a', requiresTags: ['fissure'],
    fissureAftershock: { damageScale: 1.1, radiusScale: 2.4, rearm: 2.5 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  seismic_waltz: {
    id: 'seismic_waltz', name: 'Seismic Waltz',
    description: 'Live fissure segments randomly ARM for a brief beat — cross one while it glows and it DETONATES, and that step goes quiet until the floor deals again. Tectonic Echoes\' dancing cousin: the ground picks the steps, you keep the time.',
    color: '#f0b060', requiresTags: ['fissure'],
    fissureRoulette: { interval: 0.9, chance: 0.3, window: 1.4, damageScale: 1, radiusScale: 2.2 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  restless_wound: {
    id: 'restless_wound', name: 'Restless Wound',
    description: 'The wounds REMAIN restless: after the crack closes (a closing pass is granted if the skill brings none), it has a 60% chance to close AGAIN — up to three more times, each re-closing zipping home at 70% damage.',
    color: '#c88a9a', requiresTags: ['fissure'],
    fissureReclose: { chance: 0.6, times: 3, interval: 0.9, damageScale: 0.7 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  orbital_fault: {
    id: 'orbital_fault', name: 'Orbital Fault',
    description: 'The crack abandons the straight tear and RINGS AROUND YOU — aim distance sets the radius, and extra fissures (fissureCount) lay CONCENTRIC rings. Tethered Orbit for the ground itself.',
    color: '#c8a8e8', requiresTags: ['fissure'],
    fissurePath: { kind: 'orbit' },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  widening_fault: {
    id: 'widening_fault', name: 'Widening Fault',
    description: 'The crack UNWINDS: a spiral tearing out of the impact point, sweeping the whole yard on its way wide. Extra fissures rotate in as further arms — the crack galaxy.',
    color: '#b8a8d8', requiresTags: ['fissure'],
    fissurePath: { kind: 'spiral', turns: 1.6 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.05)],
    weight: 5,
  },
  serpentine_fault: {
    id: 'serpentine_fault', name: 'Serpentine Fault',
    description: 'The tear WEAVES around its bearing — a serpent of broken ground covering a wider swathe than any straight crack could.',
    color: '#a8c89a', requiresTags: ['fissure'],
    fissurePath: { kind: 'serpent', waveDeg: 38 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  faultfinder: {
    id: 'faultfinder', name: 'Faultfinder',
    description: 'Strikes with this skill have a 25% chance to PROJECT a fissure out along the blow — and the gem hands the skill the fissure tag, so the crack gems (volatility, arming, warps, recloses) socket in beside it and ride every lash.',
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
    description: 'This skill is NO LONGER YOURS to press — its key only arms and disarms it. While armed, your critical strikes with OTHER skills cast it for you: one trigger per crit, taken in turn down the bar, honest mana, brief internal cooldown. Quick skills only (0.5s base or less) — heavier bars need Sequenced Invocation beside this.',
    color: '#e8c84a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'crit', chance: 0.7, icd: 0.15 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.06)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_damage_taken: {
    id: 'cast_on_damage_taken', name: 'Cast when Damage Taken',
    description: 'The skill arms itself against your PAIN: once you have taken 30% of your max life (hits and DoT alike), the next wound casts it for you — aimed back at whatever hurt you. Its key only arms and disarms it. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#d87a6a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'damageTaken', chance: 1, icd: 0.25, lifeFrac: 0.3 },
    mods: [],
    perLevel: [mod('triggerThreshold', 'flat', -0.02)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_channeling: {
    id: 'cast_while_channeling', name: 'Cast while Channelling',
    description: 'Socket this into a QUICK skill and it fires itself on a steady beat while you hold ANY channel — the maelstrom you sustain, punctuated by the spell you never press. Its key only arms and disarms it. Channels themselves refuse this gem: a channel cannot channel.',
    color: '#8ab8e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelBeat', chance: 1, icd: 0.35 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_flawless: {
    id: 'cast_on_flawless', name: 'Cast on Flawless',
    description: 'Socket this into a QUICK skill and every PERFECT or FLAWLESS press you land casts it for you — read the bar, and the read answers with a second blade. Its key only arms and disarms it. Skill expression as a trigger: the window you make is the spell you get.',
    color: '#ffd700', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'flawless', chance: 1 },
    mods: [],
    perLevel: [mod('damage', 'more', 0.04)],
    weight: 4, minDropLevel: 10,
  },
  cast_while_guarding: {
    id: 'cast_while_guarding', name: 'Cast while Guarding',
    description: 'Socket this into a QUICK skill and it fires itself on a SLOW, patient beat while you hold ANY guard — sorcery kept burning behind the shield wall, hands never leaving the straps. Its key only arms and disarms it. This is the automated lane; Guarded Casting is the deliberate one.',
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
    description: 'Every overcharge STAGE you bank casts this skill for you — the held greed pays out as you climb, not just when you let go. Its key only arms and disarms it. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#ffd24a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'overchargeStage', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_high_roll: {
    id: 'cast_on_high_roll', name: 'Cast on High Roll',
    description: 'When a hit of yours rolls in the top 12% of its damage dice, THIS skill casts itself at the jackpot — the dice pull the trigger. Honest costs; quick skills only, unless Sequenced Invocation rides beside it. Its key only arms and disarms it.',
    color: '#ffe97a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'highRoll', chance: 1, icd: 0.25 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  culmination: {
    id: 'culmination', name: 'Culmination',
    description: 'This skill casts itself at the moment of COMPLETION: whenever a channel of yours truly finishes — a capped hold reaching its ceiling, a gauge filling to the brim — this fires free at your aim. Interrupted gathers pay nothing: the finish is the whole covenant. Its key only arms and disarms it.',
    color: '#e8d88a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'channelFinish', chance: 1 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 12,
  },
  culminant_frenzy: {
    id: 'culminant_frenzy', name: 'Culminant Frenzy',
    description: 'Every channel you truly COMPLETE while this rides one banks 2 Frenzy charges — the finish, converted to fury. Interrupted gathers bank nothing: fury is earned at the brim.',
    color: '#e8a84a', requiresTags: ['channel'],
    chargeGain: [{ charge: 'frenzy', amount: 2, max: 6, on: 'channelFinish' }],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.5)],
    weight: 4,
  },
  gathered_casting: {
    id: 'gathered_casting', name: 'Gathered Casting',
    description: 'The long cast stops being a promise made standing still: this skill becomes a GATHER — hold to bank its cast time into a bar that KEEPS between holds, then release the whole spell on your own schedule at a power matching the fill. The bank runs half again the honest bar and pays its mana as you pour; haste fills it faster. Channels, instants and quick flicks refuse the conversion.',
    color: '#c8b8e8', excludeTags: ['channel', 'guard', 'instant', 'movement', 'aura', 'overcharge'],
    gather: { premium: 1.5, minRelease: 0.15 },
    mods: [],
    perLevel: [mod('brimFill', 'increased', 0.04)],
    weight: 4, minDropLevel: 12,
  },
  sequenced_invocation: {
    id: 'sequenced_invocation', name: 'Sequenced Invocation',
    description: 'Rides BESIDE a trigger gem and lifts its cast-time gate: the heavy spell answers the moment as a REAL cast in succession — feet planted for the bar (castMove and mobility investments still walk it). No trigger gem beside it, no effect.',
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
    description: 'Fires you set BANK POWER: every third burn you lay casts this skill for you (its key only arms and disarms it; the bank then begins anew). Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#ff9a4a', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'burn', power: 3, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.25)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_poison: {
    id: 'cast_on_poison', name: 'Cast on Poison',
    description: 'Venom is POWER: every fifth poison you lay casts this skill for you (its key only arms and disarms it; the bank then begins anew). Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#7ec850', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'poison', power: 5, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.4)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_bleed: {
    id: 'cast_on_bleed', name: 'Cast on Laceration',
    description: 'Open veins BANK POWER: every fourth bleed you lay casts this skill for you (its key only arms and disarms it; the bank then begins anew). Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#b03030', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'statusApply', status: 'bleed', power: 4, chance: 1, icd: 0.2 },
    mods: [],
    perLevel: [mod('triggerPower', 'flat', -0.3)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_block: {
    id: 'cast_on_block', name: 'Cast on Block',
    description: 'Every hit you BLOCK — raised shield, passive block, or parry — casts this skill for you, aimed back at whoever swung (its key only arms and disarms it). The wall that answers. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#8ab8d8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'block', chance: 1, icd: 0.5 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },
  cast_on_kill: {
    id: 'cast_on_kill', name: 'Cast on Kill',
    description: 'Every kill your own blows take casts this skill for you at where the victim fell (its key only arms and disarms it) — the harvest that reaps onward. Quick skills only, unless Sequenced Invocation rides beside it.',
    color: '#c8a0e8', excludeTags: ['channel', 'guard', 'aura', 'movement'],
    trigger: { on: 'kill', chance: 1, icd: 0.4 },
    mods: [],
    perLevel: [mod('triggerChance', 'flat', 0.05)],
    weight: 4, minDropLevel: 10,
  },

  // --- The status-puppeteer gems ------------------------------------------------
  carrier_strain: {
    id: 'carrier_strain', name: 'Carrier Strain',
    description: 'Hits with this skill have a 30% chance to CARRY one random affliction off the victim to its nearest untouched neighbor — three-quarter strength, clocks still running. Every swing a vector.',
    color: '#a0c878',
    spreadOnHit: { chance: 0.3, radius: 200, strengthScale: 0.75, duration: 'remaining' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  final_bloom: {
    id: 'final_bloom', name: 'Final Bloom',
    description: 'DoTs this skill lays have a 60% chance to PROPAGATE: when the afflicted die still carrying them, the rot jumps to their nearby kin — and keeps jumping, death after death.',
    color: '#78c878',
    mods: [mod('dotPropagates', 'flat', 0.6)],
    perLevel: [mod('dotPropagates', 'flat', 0.1)],
    weight: 5,
  },
  load_bearing_flaw: {
    id: 'load_bearing_flaw', name: 'Load-Bearing Flaw',
    description: 'This skill\'s constructs are built WRONG on purpose: your own hits demolish them at four times the rate, and each one DETONATES as it dies — broken, shattered, evicted or expired alike. Any construct becomes the conjured-ordnance game.',
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

  // --- The impale gems ------------------------------------------------------------
  skewering_blows: {
    id: 'skewering_blows', name: 'Skewering Blows',
    description: 'Hits with this skill leave STEEL BEHIND: 20% of their physical damage lodges as an impalement, and the victim\'s next taken hit drives it through as its own separate blow. Any attack learns to bank violence.',
    color: '#c8ccd8', requiresTags: ['attack'],
    mods: [mod('impalePower', 'flat', 0.2)],
    perLevel: [mod('impalePower', 'flat', 0.04)],
    weight: 6,
  },

  // --- The hex-delivery gems ------------------------------------------------------
  curse_on_hit: {
    id: 'curse_on_hit', name: 'Hexbrand',
    description: 'The socketed curse stops being a CAST: its key now DRAWS or SHEATHES it (reserving a quarter of your mana). While drawn, every top-level hit you land also strikes the victim with the whole curse at 30% of its roll — statuses, ruptures and all. Your weapon becomes the hex.',
    color: '#b06bd4', requiresTags: ['curse'],
    curseOnHit: { damageScale: 0.3, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 4, minDropLevel: 8,
  },

  // --- The retaliation gems (the greatshield-and-poke kit) ----------------------
  answering_steel: {
    id: 'answering_steel', name: 'Answering Steel',
    description: 'Every blow this guard BLOCKS banks a Riposte (up to 3, fading out of combat) — and GRANTS the Riposte Thrust order (⇧+key): spend one for a narrow, vicious poke over the shield rim. Block, answer, block, answer.',
    color: '#d8e8f8', requiresTags: ['guard'],
    chargeGain: [{ charge: 'riposte', amount: 1, max: 3, on: 'block' }],
    meta: { skillId: 'riposte_thrust', label: 'Riposte' },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },
  reckless_rampart: {
    id: 'reckless_rampart', name: 'Reckless Rampart',
    description: 'The wall leans FORWARD: +60% shield-bash power, but the guard itself holds a quarter less — offense bought with the very thing you hide behind.',
    color: '#d8a878', requiresTags: ['guard'],
    mods: [mod('bashPower', 'increased', 0.6), mod('guardStrength', 'increased', -0.25)],
    perLevel: [mod('bashPower', 'increased', 0.1)],
    weight: 5,
  },
  answering_wall: {
    id: 'answering_wall', name: 'Answering Wall',
    description: 'TEACH THE WALL TO ANSWER — one gem, two reads. A guard with no bash of its own GAINS one (the release-blow, 55% of remaining shield); a guard that already answers swings 40% HARDER instead. Either way the arming line drops a fifth, so the answer comes easier — watch the tic on the guard bar move.',
    color: '#c8b088', requiresTags: ['guard'],
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
    description: 'INVERT the answer: the bash measures what the wall has LOST — release a battered guard and the MISSING shield lands as the blow; a pristine wall says nothing. The arming line mirrors to the top of the bar (the tic shows it): ride the wall low, then cash everything it took. +25% bash power for daring the math.',
    color: '#9a8ab8', requiresTags: ['guard'],
    // bashInvert is a STAT on purpose — a passive node or an affix can
    // grant the same inversion later without new machinery.
    mods: [mod('bashInvert', 'flat', 1), mod('bashPower', 'increased', 0.25)],
    perLevel: [mod('bashPower', 'increased', 0.05)],
    weight: 5,
  },
  stalwart_rhythm: {
    id: 'stalwart_rhythm', name: 'Stalwart Rhythm',
    description: 'The wall keeps TIME: every made block winds every OTHER cooldown forward a second — the patient style\'s tempo, earned one answer at a time.',
    color: '#8ab8d8', requiresTags: ['guard'],
    mods: [mod('proc_stalwart_rhythm', 'flat', 1)],
    perLevel: [mod('blockValue', 'flat', 2)],
    weight: 5,
  },

  // --- The offering ecology -----------------------------------------------------
  hiveborn: {
    id: 'hiveborn', name: 'Hiveborn',
    description: 'Each corpse this skill consumes crawls back out — a legless thing dragging itself on its arms — serving you for 12 seconds (up to 6).',
    color: '#a8c860', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'zombie_crawler', perCorpse: true, duration: 12, max: 6 },
    mods: [],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },
  ghostly_communion: {
    id: 'ghostly_communion', name: 'Ghostly Communion',
    description: 'Consuming a corpse with this skill raises TWO brief phantasms regardless of the body — but the rite takes 5 seconds longer to be ready again.',
    color: '#9ad8e8', requiresTags: ['corpse'],
    corpseSpawn: { monsterId: 'phantasm', count: 2, duration: 8, max: 4 },
    mods: [mod('addedCooldown', 'flat', 5)],
    weight: 5,
  },
  gift_of_the_choir: {
    id: 'gift_of_the_choir', name: 'Gift of the Choir',
    description: 'Each minion of this skill is born humming ONE random weak aura — regeneration, haste, or hide — shared with allies around it.',
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
    description: 'This skill\'s minions fight furiously while newly raised: 25% increased damage and 15% movement speed for their first 6 seconds.',
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
    description: 'The summoner\'s art, taught to the summoned: while Resonance rides a summon skill, every riding support socketed beside it BOARDS THE CREW — forwarded into the minions\' own skills wherever it fits. Their power, your strain: boarded gems still bill their costs to your cast.',
    color: '#9a7ee8', requiresTags: ['summon', 'minion'],
    resonance: true,
    mods: [],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 6,
  },
  blood_toll: {
    id: 'blood_toll', name: 'Blood Toll',
    description: 'Each cast CONSUMES your nearest minion (within 260): 0.6% more damage per point of its remaining life. The altar always takes.',
    color: '#c02848',
    sacrifice: { radius: 260, dmgPerLife: 0.006 },
    mods: [],
    weight: 4,
  },
  dominating_blow: {
    id: 'dominating_blow', name: 'Dominating Blow',
    description: 'Kills with this skill have a 25% chance to raise the slain as YOUR thrall for 12 seconds (up to 3; bosses refuse).',
    color: '#e8d44a', requiresTags: ['attack'],
    dominate: { chance: 0.25, duration: 12, max: 3 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  // --- Cursed-ground variants ---------------------------------------------------
  maddening_miasma: {
    id: 'maddening_miasma', name: 'Maddening Miasma',
    description: 'Anything standing in this skill\'s lingering ground for 6 accumulated seconds is driven MAD — lashing at whatever is nearest, friend or foe.',
    color: '#d84a9a', requiresTags: ['duration'],
    madden: { after: 6 },
    mods: [],
    weight: 4,
  },
  pulsing_hex: {
    id: 'pulsing_hex', name: 'Pulsing Hex',
    description: 'This skill\'s lingering ground SNAPS a hex pulse every second across itself.',
    color: '#b06bd4', requiresTags: ['duration'],
    zoneEmit: { skillId: 'hex_pulse', interval: 1 },
    mods: [],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  creeping_fumes: {
    id: 'creeping_fumes', name: 'Creeping Fumes',
    description: 'This skill\'s lingering ground turns FUME: its ticks bite only what has breathed inside for half a second — stepping out clears the lungs — and the vapors work 30% harder on whoever truly marinates. Patience, weaponized.',
    color: '#9ab86a', requiresTags: ['duration'],
    exposure: { after: 0.5 },
    mods: [mod('damage', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  overgrowth: {
    id: 'overgrowth', name: 'Overgrowth',
    description: 'This skill\'s lingering ground GROWS while it lives — 30 radius a second, the patch becoming a field becoming a problem (cascade ripples swell too). 15% less damage; the trade is acreage.',
    color: '#6aa84a', requiresTags: ['duration'],
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
    description: 'This skill\'s lingering ground opens 30% WIDE and then CLOSES like a throat — holding its promise, collapsing late, gone exactly as the duration dies. What it still covers it works 25% harder: the noose concentrates. Duration mods set the pace of the closing.',
    color: '#7a9a52', requiresTags: ['duration'],
    zoneSizeOver: { from: 1.3, to: 0, curve: 'quadIn' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.04)],
    weight: 5,
  },
  blooming_ground: {
    id: 'blooming_ground', name: 'Blooming Ground',
    description: 'This skill\'s lingering ground begins as a SEED — a quarter of its reach — and blooms fast past full to 140% by the end. 15% less damage; patience buys the acreage, and whatever bursts as it expires bursts at FULL spread.',
    color: '#8ab86a', requiresTags: ['duration'],
    zoneSizeOver: { from: 0.25, to: 1.4, curve: 'quadOut' },
    mods: [mod('damage', 'more', -0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.04)],
    weight: 5,
  },
  tidal_ground: {
    id: 'tidal_ground', name: 'Tidal Ground',
    description: 'This skill\'s lingering ground breathes ONE FULL TIDE per life: out from half its reach to half again past it at mid-duration, and home again by the end. Stand where the water was and wait — it comes back.',
    color: '#6a9a8a', requiresTags: ['duration'],
    zoneSizeOver: { from: 0.5, to: 1.5, curve: 'breath' },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 4,
  },

  // --- Brim gems: the persistent gauge, retuned (ChannelSpec.brim) ----------
  stillwater_discipline: {
    id: 'stillwater_discipline', name: 'Stillwater Discipline',
    description: 'This channel\'s gauge STOPS BLEEDING — whatever you bank, it keeps, however long you carry it. The stored water runs 10% shallower: patience buys permanence, permanence pays a tithe.',
    color: '#7ab0c8', requiresTags: ['channel'],
    mods: [mod('brimDecay', 'increased', -1), mod('brimPower', 'increased', -0.1)],
    perLevel: [mod('brimPower', 'increased', 0.02)],
    weight: 5,
  },
  overbrim: {
    id: 'overbrim', name: 'Overbrim',
    description: 'This channel\'s gauge pays out 30% HARDER — and fills 20% slower. The deeper draw: every second of the scream is worth more, and every second is longer.',
    color: '#c8a85a', requiresTags: ['channel'],
    mods: [mod('brimPower', 'increased', 0.3), mod('brimFill', 'increased', -0.2)],
    perLevel: [mod('brimPower', 'increased', 0.03)],
    weight: 5,
  },

  // --- Reservation & resource economies ------------------------------------------
  fleeting_devotion: {
    id: 'fleeting_devotion', name: 'Fleeting Devotion',
    description: 'This aura no longer reserves: it COSTS its mana and burns for 12 seconds instead. The durationAuraCap stat bounds how many may burn at once.',
    color: '#e8d44a', requiresTags: ['aura'],
    auraDuration: { seconds: 12 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 4,
  },
  blood_pact: {
    id: 'blood_pact', name: 'Blood Pact',
    description: 'This aura reserves LIFE instead of mana — the ceiling comes off your blood, not your thoughts.',
    color: '#c02848', requiresTags: ['aura'],
    reserveLife: true,
    mods: [],
    weight: 4,
  },
  dominion_tithe: {
    id: 'dominion_tithe', name: 'Dominion Tithe',
    description: 'This skill gains flat damage per point of your RESERVED mana — locked power IS power.',
    color: '#7a9aff', requiresTags: ['spell'],
    mods: [mod('reservedDamage', 'flat', 0.05)],
    perLevel: [mod('reservedDamage', 'flat', 0.008)],
    weight: 5,
  },
  archons_wellspring: {
    id: 'archons_wellspring', name: "Archon's Wellspring",
    description: 'This skill gains flat damage per point of your MAXIMUM mana.',
    color: '#4a78d8', requiresTags: ['spell'],
    mods: [mod('maxManaDamage', 'flat', 0.04)],
    perLevel: [mod('maxManaDamage', 'flat', 0.006)],
    weight: 5,
  },
  slow_brew: {
    id: 'slow_brew', name: 'Slow Brew',
    description: 'Time banks a Brew charge every 2.5 seconds (up to 5); this skill\'s casts drink the whole pot for 12% more damage per charge — the accumulated, empowered swing.',
    color: '#c8a848',
    chargeGain: [{ charge: 'brew', amount: 1, max: 5, on: 'second', everySeconds: 2.5 }],
    chargeCost: { charge: 'brew', amount: 'all', optional: true, damagePerCharge: 0.12 },
    mods: [],
    weight: 5,
  },

  // --- Cleric echoes, tradeoffs & textures ---------------------------------------
  consecrated_echo: {
    id: 'consecrated_echo', name: 'Consecrated Echo',
    description: 'This warcry leaves HEALING ground where it lands — the slam\'s echo mends allies standing in it.',
    color: '#8ae0a8', requiresTags: ['warcry'],
    healField: { amount: 6 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.08)],
    weight: 5,
  },
  echoing_might: {
    id: 'echoing_might', name: 'Echoing Might',
    description: 'Each landed hit grants added physical damage equal to 30% of what it dealt, for 4 seconds — the previous blow feeds the next.',
    color: '#e8d44a', requiresTags: ['attack'],
    mods: [mod('echoMight', 'flat', 0.3)],
    perLevel: [mod('echoMight', 'flat', 0.04)],
    weight: 5,
  },
  hallowed_flames: {
    id: 'hallowed_flames', name: 'Hallowed Flames',
    description: 'Melee hits with this skill have a 30% chance to SCORCH — a short searing burn, refreshed on hit, independent of ignite.',
    color: '#ffb056', requiresTags: ['melee'],
    mods: [mod('apply_scorch', 'flat', 0.3, ['melee'])],
    perLevel: [mod('statusMagnitude', 'increased', 0.06, ['fire'])],
    weight: 6,
  },
  monolith: {
    id: 'monolith', name: 'Monolith',
    description: 'The heavy trade: 30% increased area, 25% more area damage — 30% less attack and cast speed.',
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
    description: 'This skill\'s projectiles BREATHE — their hit radius swells and shrinks ±40% in flight.',
    color: '#9ad8e8', requiresTags: ['projectile'],
    mods: [mod('projPulse', 'flat', 0.4)],
    perLevel: [mod('projPulse', 'flat', 0.05)],
    weight: 6,
  },

  // --- The chaos & doom suite -----------------------------------------------------
  withering_agony: {
    id: 'withering_agony', name: 'Withering Agony',
    description: 'Chaos hits with this skill have a 40% chance to inflict Withering Agony — a rot that opens as a whisper and ENDS as a scream (ramping damage over time).',
    color: '#8a5ad8', requiresTags: ['chaos'],
    mods: [mod('apply_wither_agony', 'flat', 0.4, ['chaos'])],
    perLevel: [mod('statusMagnitude', 'increased', 0.06, ['chaos'])],
    weight: 5,
  },
  creeping_doom: {
    id: 'creeping_doom', name: 'Creeping Doom',
    description: 'Chaos hits with this skill have a 15% chance to apply a weak DOOM — the armed keg pumps with repetition and culls at lethal.',
    color: '#7a48c8', requiresTags: ['chaos'],
    mods: [mod('apply_doom', 'flat', 0.15, ['chaos'])],
    perLevel: [mod('apply_doom', 'flat', 0.02, ['chaos'])],
    weight: 5,
  },
  lingering_doom: {
    id: 'lingering_doom', name: 'Lingering Doom',
    description: 'Your Dooms also TICK: 35% of the armed payload burns as chaos damage over time while the fuse runs — and the keg still culls at lethal.',
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
    description: 'While channeling this skill, gain a Frenzy charge every 3 seconds held.',
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
    description: 'Damage over time from this skill\'s ailments has a chance per point dealt to hatch a broodling (10s, up to 4).',
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
    description: 'This skill\'s minions bank a Communion charge on you when their blows land (35% chance) — each charge empowers you AND the flock.',
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
    description: 'Real uses of this skill bank a Verdict charge (up to 3). Grants the Verdict meta-action: spend all three for a free consecrated nova.',
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
    description: 'Hits with this skill summon a brief phantasm (~10/minute, up to 5). In a summon skill, your minions\' hits conjure them for you.',
    color: '#9ad8e8',
    mods: [mod('proc_summon_phantasm', 'flat', 1)],
    perLevel: [mod('proc_summon_phantasm', 'flat', 0.15)], // rate multiplier
    weight: 6,
  },

  // SAINTED ASH (the boss-viable on-kill shape): kills with the socketed
  // skill bloom into a consecrated burst. The engine's killProcOnHit rule
  // keeps it alive against bosses — on-kill rolls on plain hits vs elite
  // prey at a fraction, so the gem still matters when nothing dies.
  sainted_ash: {
    id: 'sainted_ash', name: 'Sainted Ash',
    description: 'Kills with this skill bloom after a beat — healing allies and burning enemies in the circle. Also rolls on hits against rare and boss enemies.',
    color: '#ffe8b0',
    mods: [mod('proc_sainted_ash', 'flat', 0.4)],
    perLevel: [mod('proc_sainted_ash', 'flat', 0.06)],
    weight: 6,
  },

  // THE INTERACTION FABRIC, gem form: attacker-side per-stack scaling vs an
  // afflicted target (the generated damageVs_<status> family) — skill-local,
  // so only the socketed skill hunts the poisoned.
  opportunist: {
    id: 'opportunist', name: 'Opportunist',
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
    description: 'Channeled projectile skills wind up: roughly +1 projectile per 2.5 seconds of holding the channel, and the spool CEILING rises as the gem levels (base cap 3 — the channelSpoolCap stat). It stacks with itself; the cap is the leash.',
    color: '#b06bd4', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelSpool', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('channelSpool', 'flat', 0.1), mod('channelSpoolCap', 'flat', 0.5)],
    weight: 5,
  },

  mounting_frenzy: {
    id: 'mounting_frenzy', name: 'Mounting Frenzy',
    description: 'Channeled projectile skills FEED on connection: every ~8 hits LANDED during an unbroken channel add +1 projectile (under the shared spool cap). Time builds nothing — only blood does. The inverse of Spooling Barrage.',
    color: '#e06a50', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelHitSpool', 'flat', 0.125), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('channelHitSpool', 'flat', 0.03)],
    weight: 5,
  },

  overcharge: {
    id: 'overcharge', name: 'Overcharge',
    description: 'HOLD the cast past its bar: each REFILLED bar stacks a stage atop the last (up to 3) for 40% MORE damage and wider area each — every stage re-pays the cost. Release whenever greed says so — or socket a DISCIPLINE beside it (Perfect Draw, Wandering Mark, Spark Discipline) and let go on the gold.',
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
    description: 'The cast gains Snipe\'s GOLDEN TAIL: press again inside the last stretch of the bar for 70% MORE. Under an Overcharge hold there is no second press — RELEASE inside the gold instead (the timing path stops one stage short of maximum greed).',
    color: '#ffd88a', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'perfect', bonus: 0.7 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  wandering_mark: {
    id: 'wandering_mark', name: 'Wandering Mark',
    description: 'A MARKER appears at a random point on the cast bar — press again exactly as the bar crosses it for 120% MORE. Under an Overcharge hold, RELEASE on the marker instead; every banked stage re-rolls where it sits. High wire, higher payoff.',
    color: '#e8f0ff', requiresTags: ['attack', 'spell'],
    excludeTags: ['channel', 'guard', 'movement', 'aura', 'summon', 'totem', 'trap', 'mine', 'buff', 'warcry', 'instant'],
    mods: [],
    strikeTiming: { kind: 'timed', bonus: 1.2 },
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  spark_discipline: {
    id: 'spark_discipline', name: 'Spark Discipline',
    description: 'Sockets only beside OVERCHARGE: releasing within a quarter-second of a stage BANKING lands 35% MORE — the golden border after every spark. The one discipline that still works at maximum stages; leveling widens the window.',
    color: '#ffe86a', requiresTags: ['overcharge'],
    mods: [mod('sparkWindow', 'flat', 0.25)],
    perLevel: [mod('sparkWindow', 'flat', 0.04), mod('sparkBonus', 'increased', 0.08)],
    weight: 5,
  },

  dive_bomb: {
    id: 'dive_bomb', name: 'Dive Bomb',
    description: 'Movement skills EXPLODE at their start and end points (70% damage) — and the skill counts as AREA now, so area supports like No Man\'s Land socket in beside this.',
    color: '#e8924a', requiresTags: ['movement'],
    grantsTags: ['aoe'],
    mods: [mod('moveExplode', 'flat', 0.7), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('moveExplode', 'flat', 0.12)],
    weight: 5,
  },

  fire_walker: {
    id: 'fire_walker', name: 'Fire Walker',
    description: 'Dashes and charges leave a trail of burning ground behind you — Trailblaze, grafted onto anything that moves.',
    color: '#ff8c3a', requiresTags: ['movement'],
    grantsTags: ['aoe', 'duration'],
    mods: [mod('moveTrail', 'flat', 0.5), mod('addedFire', 'flat', 6)],
    perLevel: [mod('moveTrail', 'flat', 0.1), mod('addedFire', 'flat', 2)],
    weight: 5,
  },

  arcing: {
    id: 'arcing', name: 'Arcing',
    description: 'Projectiles CHAIN to 2 additional enemies — everything becomes a little bit Chain Lightning.',
    color: '#f4e84a', requiresTags: ['projectile'],
    mods: [mod('chainCount', 'flat', 2), mod('damage', 'more', -0.15)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  static_buildup: {
    id: 'static_buildup', name: 'Static Buildup',
    description: '+25% ailment chance and lightning effects last 40% longer — shocks pile up for Overload to flip the breaker on.',
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
    description: 'Targeted skills strike 2 additional nearby victims — Ignite a crowd, mark three Living Bombs at once.',
    color: '#e8a268', requiresTags: ['targeted'],
    mods: [mod('multiTarget', 'flat', 2), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('multiTarget', 'flat', 1)],
    weight: 5,
  },

  powderkeg: {
    id: 'powderkeg', name: 'Powderkeg',
    description: 'Ignites applied by this skill deal NO damage over time — instead the victim DETONATES for the burn\'s full payload when it expires, searing everything beside them.',
    color: '#ff5a3a', requiresTags: ['fire'],
    mods: [mod('igniteToBomb', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.08, ['fire'])],
    weight: 5,
  },

  nova_release: {
    id: 'nova_release', name: 'Nova Release',
    description: '+4 projectiles, but the whole volley rings out in a CIRCLE around you — projectile skills become area presence.',
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
    description: 'Fire effects last 80% longer — gentler per second, crueler in total. Living Bombs on a long fuse.',
    color: '#c87a3a', requiresTags: ['fire'],
    mods: [mod('effectDuration', 'increased', 0.8, ['fire'])],
    perLevel: [mod('effectDuration', 'increased', 0.15, ['fire'])],
    weight: 6,
  },

  perfect_timing: {
    id: 'perfect_timing', name: 'Perfect Timing',
    description: 'Grants any guard skill a 0.25s parry window: hits blocked in the opening beat cost no shield and riposte at 150% — independent of shield health.',
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
    description: '40% MORE damage while on low life. Glass, meet cannon.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.4, undefined, 'lowLife')],
    perLevel: [mod('damage', 'increased', 0.08, undefined, 'lowLife')],
    weight: 5,
  },

  serene_power: {
    id: 'serene_power', name: 'Serene Power',
    description: '30% MORE damage while your energy shield is full — strike from behind an unbroken veil.',
    color: '#5ad8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('damage', 'more', 0.3, undefined, 'fullEs')],
    perLevel: [mod('damage', 'increased', 0.07, undefined, 'fullEs')],
    weight: 5,
  },

  untouched_might: {
    id: 'untouched_might', name: 'Untouched Might',
    description: '25% MORE damage while on full life. Pairs with everything that keeps the hits off your skin.',
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
    description: 'Your protection domes DEFLECT enemy projectiles instead of dissolving them — they fly back wearing your colors.',
    color: '#9ad8c8', requiresTags: ['guard'],
    mods: [mod('domeDeflects', 'flat', 1)],
    perLevel: [mod('aoeRadius', 'increased', 0.08)],
    weight: 4,
  },

  crimson_harvest: {
    id: 'crimson_harvest', name: 'Crimson Harvest',
    description: 'Hits have an 8% chance to knock loose a life orb — run it over to drink it.',
    color: '#d04848', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_life', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_life', 'flat', 0.03)],
    weight: 7,
  },

  azure_harvest: {
    id: 'azure_harvest', name: 'Azure Harvest',
    description: 'Hits have an 8% chance to knock loose a mana orb.',
    color: '#4a78d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_mana', 'flat', 0.08)],
    perLevel: [mod('orbOnHit_mana', 'flat', 0.03)],
    weight: 7,
  },

  lambent_harvest: {
    id: 'lambent_harvest', name: 'Lambent Harvest',
    description: 'Hits have an 8% chance to knock loose an energy shield orb — picking one up also kicks off your recharge.',
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
    description: 'Supported skill keeps the wake: its hits have a 6% chance — kills a 25% chance — to shake a Wakeflame orb loose.',
    color: '#ffd98a', requiresTags: ['attack', 'spell'],
    mods: [mod('orbOnHit_wakeflame', 'flat', 0.06), mod('orbOnKill_wakeflame', 'flat', 0.25)],
    perLevel: [mod('orbOnKill_wakeflame', 'flat', 0.04)],
    weight: 6,
  },

  victors_tempo: {
    id: 'victors_tempo', name: "Victor's Tempo",
    description: 'Kills with the supported skill kindle your tempo: 60% chance to gain a Frenzy charge (up to 3) — a Reckoning that feeds your speed, a nova that quickens your feet.',
    color: '#8ae06a', requiresTags: ['attack', 'spell'],
    mods: [],
    perLevel: [mod('chargeCap', 'flat', 0.34)],
    chargeGain: [{ charge: 'frenzy', amount: 1, max: 3, on: 'kill', chance: 0.6 }],
    weight: 5,
  },

  abundant_harvest: {
    id: 'abundant_harvest', name: 'Abundant Harvest',
    description: 'Supported skill sheds RICHER: 30% increased orb shed chance of every kind — life, mana, shield and Wakeflame alike.',
    color: '#c8e87a', requiresTags: ['attack', 'spell'],
    mods: [mod('orbShedRate', 'increased', 0.3)],
    perLevel: [mod('orbShedRate', 'increased', 0.05)],
    weight: 6,
  },

  guardians_aegis: {
    id: 'guardians_aegis', name: "Guardian's Aegis",
    description: 'While you guard, your minions near you are guarded too — hits against them from your blocking arc drain YOUR shield instead.',
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
    description: 'Supported instant skill becomes a REFLEX: pressable straight through your own casts, dashes and recovery, resolving alongside them — the hand learns to move without asking the spine. (Flasks are born knowing this.)',
    color: '#c8c8d8', requiresTags: ['instant'], excludeTags: ['flask'],
    mods: [mod('reflex', 'flat', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.04)],
    weight: 5,
  },

  libation: {
    id: 'libation', name: 'Libation',
    description: 'The drink is the point: this flask ignores its thirst gate — drinkable at a full pool, pour spilled or not — every pour runs 15% richer, and everything the drink grants lingers 10% longer. For builds that drink for what RIDES the drink.',
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
    description: 'The dregs go OUTWARD: every drink from this flask flings an Acrid Splash — a corrosive, poisoning ring — at whoever crowds you. The drink itself pours 15% thinner; teeth cost.',
    color: '#9ac838', requiresTags: ['flask'],
    followUp: { skillId: 'acrid_splash', delay: 0.2 },
    mods: [mod('restorePower', 'more', -0.15)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  shared_draught: {
    id: 'shared_draught', name: 'Shared Draught',
    description: 'A toast: every drink from this flask speaks a Benediction a beat later — everyone on your side around you is mended at once. The mending scales with your healing power, not the pour.',
    color: '#9ae0b0', requiresTags: ['flask'],
    followUp: { skillId: 'benediction', delay: 0.3 },
    mods: [],
    perLevel: [mod('healPower', 'increased', 0.06)],
    weight: 5,
  },

  chaser: {
    id: 'chaser', name: 'Chaser',
    description: 'The drink KICKS: every drink from this flask is chased by a short surge of attack and cast tempo. Drink into the fight, not out of it.',
    color: '#e8c878', requiresTags: ['flask'],
    followUp: { skillId: 'chaser_edge', delay: 0.15 },
    mods: [],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5,
  },

  splitting: {
    id: 'splitting', name: 'Splitting',
    description: 'Fires +1 projectile, but each deals less damage. Costs more mana.',
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
    description: 'Projectiles pierce 2 additional targets.',
    color: '#b8d8a0', requiresTags: ['projectile'],
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
    description: '20% increased cast speed. Costs more mana.',
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
    description: '2% of damage leeched as life.',
    color: '#c04060',
    mods: [mod('lifeLeech', 'flat', 0.02)],
    perLevel: [mod('lifeLeech', 'flat', 0.005)],
    weight: 8,
  },

  precision: {
    id: 'precision', name: 'Deadly Precision',
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
    description: '25% chance for melee hits to trigger Brutal Strike — an extra hit at 60% damage.',
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
    description: 'Ground placements BURY a charge beneath themselves: one second after the impact, the same ground detonates AGAIN at full effect. Grants the pulse tag — Unsettled Earth seats beside it, the way Faultfinder seats the crack gems.',
    color: '#d8a858', requiresTags: ['aoe'],
    grantsTags: ['pulse'],
    // The graft-wins rule (instancePulse): socketed into a skill that
    // already pulses, THIS spec replaces the innate one — Buried Charge
    // is for ground that only ever blew once.
    pulse: { delay: 1.0 },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 6,
  },

  unsettled_earth: {
    id: 'unsettled_earth', name: 'Unsettled Earth',
    description: 'The quake refuses to SETTLE: pulsing ground beats twice more before it stills — every pulse a fresh detonation, and every detonation still scatters its Aftershocks. 20% less damage; the earth pays in instalments.',
    color: '#c8b068', requiresTags: ['pulse'],
    mods: [mod('pulseCount', 'flat', 2), mod('damage', 'more', -0.2)],
    perLevel: [mod('pulseCount', 'flat', 0.5)],
    weight: 5,
  },

  carried_edge: {
    id: 'carried_edge', name: 'Carried Edge',
    description: 'The sweep comes OFF its post and onto your hip: the harvest RIDES you as you move — its arc keeps its own trajectory; only the anchor walks. Reap on the march.',
    color: '#c8a0e0', requiresTags: ['sweep'],
    zoneFollow: true,
    mods: [mod('manaCost', 'more', 0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  reapers_encore: {
    id: 'reapers_encore', name: "Reaper's Encore",
    description: 'Every third-or-so swing of this skill earns an ENCORE: a heartbeat later, a full slow sweep crosses your front on its own — free, unpaid, uninvited. The scythe remembers what your wrists forgot.',
    color: '#b088d0', requiresTags: ['melee'],
    followUp: { skillId: 'follow_sweep', chance: 0.35, delay: 0.35 },
    mods: [mod('manaCost', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 6,
  },

  // --- The cadence gems (one knob, every clock) --------------------------------
  accelerando: {
    id: 'accelerando', name: 'Accelerando',
    description: 'Everything this skill does ON A BEAT — pulses, cascade skips, emitter salvos — arrives SOONER each time: every gap shrinks to 70% of the last. The settling ball, the gathering peal. 10% less damage; haste has a price.',
    color: '#e8d088', requiresTags: ['aoe'],
    cadence: { intervalStep: 0.7 },
    mods: [mod('damage', 'more', -0.1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },
  ritardando: {
    id: 'ritardando', name: 'Ritardando',
    description: 'Everything this skill does ON A BEAT spaces OUT — every gap stretches to 140% of the last — and the patience is paid for: 25% more damage on all of it. Fewer notes; heavier hands.',
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
    description: 'Minions are 40% larger and deal 35% more damage with 35% more life — but you may summon 50% fewer.',
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
    description: 'Summons +1 minion per cast, all at once. Costs more mana.',
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
    description: 'Summons +2 minions per cast, emerging scattered in sequence. Costs much more mana.',
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
    description: 'Minions detonate upon reaching low life, dealing 60% of their maximum life as fire damage — they trade longevity for violence.',
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

  corpsefire: {
    id: 'corpsefire', name: 'Corpsefire',
    description: '50% chance for kills to trigger Corpsefire — the corpse erupts at 80% damage.',
    color: '#ff5a2a',
    mods: [mod('proc_corpsefire', 'flat', 0.5)],
    perLevel: [mod('proc_corpsefire', 'flat', 0.12)],
    weight: 7,
  },

  blood_price: {
    id: 'blood_price', name: 'Blood Price',
    description: 'Costs are paid with life instead of mana. Blood fuels power: 10% more damage.',
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
    description: 'Persistent minions respawn 40% faster.',
    color: '#9ab8d8', requiresTags: ['summon'],
    mods: [mod('minionRespawnTime', 'increased', -0.4)],
    perLevel: [mod('minionRespawnTime', 'increased', -0.08)],
    weight: 7,
  },

  // ===== Projectile form & flight ==========================================

  colossal: {
    id: 'colossal', name: 'Colossal Projectiles',
    description: 'Projectiles are 60% larger and deal 20% more damage, but travel 30% slower.',
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
    description: 'Fires +2 projectiles at 40% reduced size, each dealing 25% less damage.',
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
    description: 'Projectiles travel 40% faster.',
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
    description: 'Projectiles fly erratically but strike 15% harder. Erraticism composes: an unstable spiral wobbles.',
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
    description: 'The supported skill lands LOUD: every wound it deals books three times the threat on the victim\'s chart. Glue for the shield-bearer — make one skill your argument and the swarm forgets the seam, the healer, and everyone you\'re standing in front of.',
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
    description: 'The supported skill lands SOFT on the chart: two-thirds less threat per wound. The assassin\'s manners — cut deep without becoming the conversation; beside a Lodestone or a shield-bearer, you simply never come up.',
    color: '#b8c8c0', requiresTags: ['attack', 'spell'],
    mods: [mod('threatGen', 'more', -0.65)],
    perLevel: [mod('threatGen', 'more', -0.03)],
    weight: 6, minDropLevel: 6,
  },

  beckoning: {
    id: 'beckoning', name: 'Beckoning',
    description: 'Constructs from the supported skill TAUNT — every totem, turret and trap wants to be hit (the decoy pull), and stands a third tougher to survive the wanting. Any construct build becomes a decoy build: the turret line IS the front line.',
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
    description: 'The skill fights on the desert\'s side: hits BAKE their victims (sunscorch — the fire-res erosion the noon sun charges), and the already-baked take more from it.',
    color: '#ffb64a', requiresTags: ['fire'],
    mods: [mod('apply_sunscorched', 'flat', 0.3), mod('damageVs_sunscorched', 'increased', 0.2)],
    perLevel: [mod('apply_sunscorched', 'flat', 0.03), mod('damageVs_sunscorched', 'increased', 0.03)],
    weight: 6,
  },
  noonglass: {
    id: 'noonglass', name: 'Noonglass',
    description: 'Focus the skill through a lens of pan-glass: it burns a shade harder, and part of its heat arrives as IGNITION.',
    color: '#ff8a3a', requiresTags: ['fire'],
    mods: [mod('apply_ignite', 'flat', 0.25), mod('damage', 'increased', 0.08)],
    perLevel: [mod('apply_ignite', 'flat', 0.04)],
    weight: 6,
  },
  scouring_grit: {
    id: 'scouring_grit', name: 'Scouring Grit',
    description: 'Load the skill\'s area with driven sand: it reaches wider, and everything inside gets scoured.',
    color: '#d8b878', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'increased', 0.15), mod('damage', 'increased', 0.08)],
    perLevel: [mod('aoeRadius', 'increased', 0.02)],
    weight: 6,
  },

  // --- The GALE gems (the Driftways' wind-craft) ----------------------------
  crosswind: {
    id: 'crosswind', name: 'Crosswind',
    description: 'Lend your shots the wind: they fly a quarter again as fast and SWERVE on the gusts — a flight no shield wall times cleanly. (Reads the flight axes: speed + erraticism; composers compose.)',
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
    description: 'Every blow carries LIFT: struck bodies lose their footing to a rising shove (winded), and your follow-through hits the staggered harder. On shifting ground, a body with no footing is halfway to falling.',
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
    description: 'The supported skill leaves wind at your back: each cast grants a stride of slipstream — four deep, gone after a couple of idle heartbeats. Casters who keep moving keep the weather.',
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
    description: 'Teach any movement skill the Zephyr\'s trick: dashes CONJURE standing cloud along their travel; blinks and leaps keep one where you left (the cloudTrail axis — wider and longer-held per level). Over the open sky your escape IS the bridge; over solid land the strides stand as wind-lane vapor, hastening whoever runs your road.',
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
    description: 'The supported skill\'s called clouds come CHARGED: allies inside lace every blow with shock and swing a shade harder — the sky was always going to take a side. Levels keep the weather standing longer.',
    color: '#e8e8a8', requiresTags: ['conjure'],
    mods: [mod('cloudCharge', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 11,
  },

  silver_lining: {
    id: 'silver_lining', name: 'Silver Lining',
    description: 'The supported skill\'s called clouds carry silver rain: allies inside knit flesh and focus while the weather holds. Every cloud has one now. Levels keep the rain falling longer.',
    color: '#dcecf8', requiresTags: ['conjure'],
    mods: [mod('cloudSalve', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.05)],
    weight: 5, minDropLevel: 10,
  },

  slow_weather: {
    id: 'slow_weather', name: 'Slow Weather',
    description: 'The supported skill\'s weather refuses to pass: called clouds gather WIDER and stand LONGER — the herd\'s answer to a sky that keeps taking its gifts back.',
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
    description: 'Projectiles spiral outward from where they were cast — or feed their spiral into whatever else shapes the flight.',
    color: '#88c8d8', requiresTags: ['projectile'],
    mods: [mod('spiralPower', 'flat', 4)],
    perLevel: [mod('spiralPower', 'flat', 0.75)],
    weight: 5,
  },

  sidewinder: {
    id: 'sidewinder', name: 'Sidewinder',
    description: 'Projectiles weave a figure-eight along their flight path — around an orbit, that\'s a garland looped over the ring.',
    color: '#b8d8b0', requiresTags: ['projectile'],
    mods: [mod('weavePower', 'flat', 6)],
    perLevel: [mod('weavePower', 'flat', 1)],
    weight: 5,
  },

  momentum: {
    id: 'momentum', name: 'Momentum',
    description: 'Projectiles GATHER 60% speed per second of flight and strike 10% harder — slow out of the hand, murderous downrange. Negative sources (passives) invert it into a stalling lob.',
    color: '#a8c8e8', requiresTags: ['projectile'],
    mods: [mod('projAccel', 'flat', 0.6), mod('damage', 'more', 0.1)],
    perLevel: [mod('projAccel', 'flat', 0.12)],
    weight: 6,
  },

  trueflight: {
    id: 'trueflight', name: 'Trueflight',
    description: '50% less erratic, spiral, spin and weave deviation, and projectiles fly 15% faster — the flight straightens toward true.',
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
    description: 'Projectiles SHATTER on their first impact: 3 shards rake the cone behind the victim. Stacks with a skill\'s own shatter — Ice Spear just throws more knives.',
    color: '#c8c0b0', requiresTags: ['projectile'],
    mods: [mod('projShrapnel', 'flat', 3)],
    perLevel: [mod('projShrapnel', 'flat', 1)],
    weight: 6,
  },

  fulminate: {
    id: 'fulminate', name: 'Fulminate',
    description: 'Projectiles pierce 2 additional targets, and explosive payloads detonate on EVERY hit — not just where the flight ends. A piercing Fireball is a chain of explosions.',
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
    description: 'Shards and emitted projectiles INHERIT half of the parent\'s flight pattern — a seeking spear rakes seeking shards. Each level passes more down.',
    color: '#d8c8e8', requiresTags: ['projectile'],
    mods: [mod('projInherit', 'flat', 0.5)],
    perLevel: [mod('projInherit', 'flat', 0.125)],
    weight: 5,
  },

  cascade_of_knives: {
    id: 'cascade_of_knives', name: 'Cascade of Knives',
    description: 'Projectiles chain to 1 additional target, and a spent SHATTER re-arms on every chain leg (forks split with theirs unspent) — the fan of knives follows the ricochet.',
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
    description: 'The socketed fire skill operates at added levels — past its cap, where the thresholds live. +1 now; +2 at gem level 5.',
    color: '#ff8a4a', requiresTags: ['fire'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_cold: {
    id: 'plus_cold', name: 'Added Levels to Cold Skills',
    description: 'The socketed cold skill operates at added levels — past its cap, where the thresholds live. +1 now; +2 at gem level 5.',
    color: '#9ad8f8', requiresTags: ['cold'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_lightning: {
    id: 'plus_lightning', name: 'Added Levels to Lightning Skills',
    description: 'The socketed lightning skill operates at added levels — past its cap, where the thresholds live. +1 now; +2 at gem level 5.',
    color: '#ffe14a', requiresTags: ['lightning'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_projectile: {
    id: 'plus_projectile', name: 'Added Levels to Projectile Skills',
    description: 'The socketed projectile skill operates at added levels — past its cap, where the thresholds live. +1 now; +2 at gem level 5.',
    color: '#c8d8b8', requiresTags: ['projectile'],
    mods: [], levelBonus: 1, levelBonusPer: 0.25,
    weight: 4,
  },

  plus_minion: {
    id: 'plus_minion', name: 'Added Levels to Minion Skills',
    description: 'The socketed minion skill operates at added levels — past its cap, where the thresholds live. +1 now; +2 at gem level 5.',
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
    description: '25% MORE physical damage — a multiplier on the whole pool, where Brutality is another increase in the pile.',
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
    description: 'The eye steals what the skin need not suffer: studied arts CAST near you are captured as if they had struck you.',
    color: '#c8a0e8', requiresTags: ['mimic'],
    mods: [mod('mimicWitness', 'flat', 1)],
    perLevel: [mod('mimicWitness', 'flat', 0.15)],
    weight: 8, minDropLevel: 6,
  },

  understudy: {
    id: 'understudy', name: 'Understudy',
    description: 'Room backstage for two more borrowed faces — and every borrowed art rehearsed a level truer.',
    color: '#b088d8', requiresTags: ['mimic'],
    mods: [mod('mimicBank', 'flat', 2)],
    levelBonus: 1, levelBonusPer: 0.25,
    weight: 8, minDropLevel: 6,
  },

  // --- The possession seam's gem-side levers (engine/possess.ts) ----------
  iron_trance: {
    id: 'iron_trance', name: 'Iron Trance',
    description: 'The abandoned flesh sits behind iron while you ride: your husk takes far less harm, and so holds its tongue far longer before the pain calls you home.',
    color: '#b8a8e8', requiresTags: ['possession'],
    mods: [mod('huskGuard', 'flat', 0.3)],
    perLevel: [mod('huskGuard', 'flat', 0.02)],
    weight: 8, minDropLevel: 8,
  },
  long_communion: {
    id: 'long_communion', name: 'Long Communion',
    description: 'The seat settles deeper into the borrowed chair: possessions hold considerably longer before the flesh remembers whose it was.',
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
    description: 'The brood reknits on its own clock: while the roster stands below cap, a claimable husk condenses at your feet every 7 seconds. The swarm you forgot to feed, feeding itself.',
    color: '#a8c878', requiresTags: ['throng'],
    throngSource: { kind: 'trickle', everySec: 7, at: 'near' },
    mods: [mod('minionLife', 'increased', 0.1)],
    perLevel: [mod('minionLife', 'increased', 0.05)],
    weight: 5,
  },
  hidden_reserves: {
    id: 'hidden_reserves', name: 'Hidden Reserves',
    description: 'Blows traded — yours and your court\'s — fill a hidden gauge that births husks beside you at the brim. Even a boss with no court of its own feeds the throng.',
    color: '#c8b060', requiresTags: ['throng'],
    throngSource: { kind: 'gauge', per: 'both', fill: 3, yield: [1, 2] },
    mods: [mod('minionDamage', 'increased', 0.08)],
    perLevel: [mod('minionDamage', 'increased', 0.04)],
    weight: 5,
  },
  teeming_warrens: {
    id: 'teeming_warrens', name: 'Teeming Warrens',
    description: 'The world runs richer for this kind: one more husk pocket per zone, and every find — pockets, gauges, motes, raisings — yields half again as many bodies.',
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
    description: 'Minions from this skill wear one extra PLY — one more landed blow eaten whole, however hard it struck. Bodies with no plies grow their first.',
    color: '#98a878', requiresTags: ['summon'],
    mods: [mod('minionPlies', 'flat', 1)],
    perLevel: [mod('minionPlies', 'flat', 0.15)],
    weight: 6,
  },
  calcified_vigor: {
    id: 'calcified_vigor', name: 'Calcified Vigor',
    description: 'The flesh you grow sets like shell: minions from this skill gain 70% increased life, and every 70% of your granted life-increase becomes a PLY instead — vigor traded for blows eaten whole.',
    color: '#c0b8a0', requiresTags: ['summon'],
    mods: [mod('minionLife', 'increased', 0.7), mod('minionLifePlyTrade', 'flat', 0.7)],
    perLevel: [mod('minionLife', 'increased', 0.08)],
    weight: 5,
  },

  meat_shield: {
    id: 'meat_shield', name: 'Meat Shield',
    description: 'Minions from this skill take 30% less damage but deal 25% less — and fight DEFENSIVELY, holding a short leash at your flank instead of chasing across the field.',
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
    description: 'Minions from this skill TAUNT with 30% of their hits — a retinue that insists, loudly, that the fight is with THEM. Pair with Meat Shield and let the wall do the arguing.',
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
    description: "The bond runs DEEPER: your flasks and scooped orbs pour into your beasts at half again the strength (sympathy potency +50% — stacks with the bond Tame Beast already wears).",
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
    description: 'What quickens you quickens THEM: charges you gain echo to your bonded beasts (their own caps bind what sticks — the classic charges bank to 3 on an untapped bearer).',
    color: '#c8a06a', requiresTags: ['companion'],
    mods: [mod('sympathy_pack_charges', 'flat', 1)],
    maxLevel: 1, // a toggle: charge echoes copy counts verbatim, potency gates
    weight: 5, minDropLevel: 8,
  },

  reciprocal_bond: {
    id: 'reciprocal_bond', name: 'Reciprocal Bond',
    description: 'The bond flows BOTH ways: when a bonded beast is mended, 40% of it reaches you too (potency scales the share).',
    color: '#7ec88a', requiresTags: ['companion'],
    mods: [mod('sympathy_feral_reciprocity', 'flat', 1)],
    perLevel: [mod('sympathy_feral_reciprocity', 'flat', 0.125)],
    weight: 5, minDropLevel: 8,
  },

  gentling_hand: {
    id: 'gentling_hand', name: 'Gentling Hand',
    description: 'The claim asks GENTLER terms: certain at 15% more life, +20% chance against the hale — and even RARE-marked beasts may kneel (bosses never).',
    color: '#d8c088', requiresTags: ['companion'],
    mods: [],
    tameMod: { sureBelowAdd: 0.15, wildChanceAdd: 0.2, allowRares: true },
    maxLevel: 1, // the terms are the terms — a claim graft, not a ramp
    weight: 4, minDropLevel: 10,
  },

  beast_master: {
    id: 'beast_master', name: 'Beast Master',
    description: 'The kennel GROWS: this skill holds one more bond — and each voice comes a little quieter (beasts deal 15% less damage).',
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
    description: 'The placed device — trap, mine, sentry or totem — trails a razor line back to YOU: enemies crossing it bleed, transiently, only while they touch the wire. Walk your perimeter.',
    // 'totem' is the umbrella tag every deployed object carries (sentries,
    // totems, pylons); minions stay excluded by simply not being listed.
    color: '#c8b8a0', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { link: 'caster', dps: 7, damageType: 'physical', width: 8 },
    weight: 6,
  },

  tripwire_web: {
    id: 'tripwire_web', name: 'Tripwire Web',
    description: 'Placed devices string razor lines to EACH OTHER — every sibling within reach. Three traps is a triangle; five is a killing field.',
    color: '#b0a890', requiresTags: ['trap', 'mine', 'totem'],
    mods: [],
    tether: { link: 'network', dps: 7, damageType: 'physical', width: 8, radius: 380 },
    weight: 5,
  },

  transient_inferno: {
    id: 'transient_inferno', name: 'Transient Inferno',
    description: 'The placed object burns a corridor of flame back to YOU — everything caught between you and it cooks while it stands there.',
    color: '#ff8a3a', requiresTags: ['totem', 'aura'],
    mods: [],
    tether: { link: 'caster', dps: 9, damageType: 'fire', width: 14 },
    weight: 5,
  },

  lifeline: {
    id: 'lifeline', name: 'Lifeline',
    description: 'The targeted skill BONDS you to its target: a mending cord that heals everything allied standing in it — the target, you, and whoever holds the line between.',
    color: '#7ec88a', requiresTags: ['targeted'],
    mods: [],
    tether: { link: 'target', affects: 'allies', healPerSec: 8, width: 16, duration: 8, color: '#7ec88a' },
    weight: 5,
  },

  witchfire_leash: {
    id: 'witchfire_leash', name: 'Witchfire Leash',
    description: 'The targeted skill LEASHES you to its target in a cord of witchfire — enemies caught between you and it wither while the bond holds.',
    color: '#9a5ad0', requiresTags: ['targeted'],
    mods: [],
    tether: { link: 'target', affects: 'enemies', dps: 8, damageType: 'chaos', width: 12, duration: 8 },
    weight: 5,
  },

  taut_wire: {
    id: 'taut_wire', name: 'Taut Wire',
    description: 'Tether bands you lay deal 50% increased damage and run 30% wider — the wire hums.',
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
    description: 'Objects placed by movement skills string a LIGHTNING arc to their siblings — a Gate Shift pair becomes a killing line you step through and enemies cannot.',
    color: '#d8e84a', requiresTags: ['movement'],
    mods: [],
    tether: { link: 'network', dps: 8, damageType: 'lightning', width: 10, radius: 800 },
    weight: 4,
  },

  // --- Channel-stance gems ---------------------------------------------------------

  walking_meditation: {
    id: 'walking_meditation', name: 'Walking Meditation',
    description: 'Move at 25% speed while channeling — even channels that root you. Invest hard enough and you stroll through your own maelstrom.',
    color: '#a8d8c8', requiresTags: ['channel'],
    mods: [mod('channelMobility', 'flat', 0.25)],
    perLevel: [mod('channelMobility', 'flat', 0.1)],
    weight: 6,
  },

  weathervane: {
    id: 'weathervane', name: 'Weathervane',
    description: 'Turn 60% faster while channeling — the ponderous beam learns to track.',
    color: '#c8d8e8', requiresTags: ['channel'],
    mods: [mod('channelTurnRate', 'increased', 0.6)],
    perLevel: [mod('channelTurnRate', 'increased', 0.15)],
    weight: 6,
  },

  turbulence: {
    id: 'turbulence', name: 'Turbulence',
    description: 'Your knockbacks BUFFET — every shove goes a random way, battering enemies around inside your storms instead of pushing them out of reach.',
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
    description: 'The socketed melee skill plays a FIGURE: the strike lands to one flank, a beat, then the answering cut to the other. Multistrike repeats the whole figure.',
    color: '#88c0d8', requiresTags: ['melee'],
    mods: [],
    aim: { sequence: { steps: [-70, 70], pause: 0.2 } },
    weight: 5,
  },

  wild_abandon: {
    id: 'wild_abandon', name: 'Wild Abandon',
    description: 'The strike goes WHEREVER: anchored swings (Cleave, Buckler Strike) are GRAFTED a random bearing across a wide sector — Wild Strike\'s chaos, teachable — and innately-wild flurries round further toward the full circle. Width stays Reckless Breadth\'s trade; this gem sells direction.',
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
    description: '60% less random-strike arc, 40% less swing arc, and 20% MORE damage — the wildness disciplined into a tight, punishing fan.',
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
    description: 'Move at 25% speed while this skill\'s cast bar runs — the rooted cast learns to walk. Stacks with a skill\'s own mobility.',
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
    description: 'The placement CASCADES along the cast line — one ripple beyond your mark, one short of it — at 25% less area. The storm walks.',
    color: '#a8a0e0', requiresTags: ['aoe'],
    mods: [mod('aoeRadius', 'more', -0.25)],
    cascade: { count: 2, dir: 'axis', dmgStep: 0.8 },
    weight: 5,
  },

  scattered_cascade: {
    id: 'scattered_cascade', name: 'Scattered Cascade',
    description: 'The placement SCATTERS: two extra strikes at random ground around your mark, each 15% less. Chaos theory, weaponized.',
    color: '#b8a0d0', requiresTags: ['aoe'],
    mods: [mod('damage', 'more', -0.15)],
    cascade: { count: 2, dir: 'random', dmgStep: 0.85 },
    weight: 5,
  },

  seismic_march: {
    id: 'seismic_march', name: 'Seismic March',
    description: 'The placement MARCHES: three ripples stride out from the impact on a beat, each a step farther and a shade weaker — any ground skill learns the Sunder walk.',
    color: '#c0a878', requiresTags: ['aoe'],
    mods: [],
    cascade: { count: 3, dir: 'forward', scaleStep: 0.9, dmgStep: 0.8, interval: 0.14 },
    weight: 5,
  },

  resounding_echo: {
    id: 'resounding_echo', name: 'Resounding Echo',
    description: 'The skill repeats ONCE — but the echo lands 35% LARGER and harder. One great answer instead of a chorus of small ones.',
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
    description: 'The volley converts to a SALVO — one shot per beat, tracking your aim — but each deals 35% less. Not a bigger hit: MORE hits, and every one rolls its own ailments and procs. The gatling is a hose, not a hammer.',
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
    description: 'The volley forms a FIRING SQUAD: +1 projectile, all loosed at once from a rank beside you, flying parallel — a wall of shot that never converges on one skull.',
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
    description: 'Volley ranks stand 35% tighter and hit 10% harder — the wall becomes a battering ram.',
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
    description: 'The fan\'s cone is 50% tighter and hits 10% MORE — concentration over coverage.',
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
    description: 'Unseen strikes land 35% harder still — the ambush is your whole argument. Stacks with backstabs; the dark rewards its students.',
    color: '#5a6a88',
    mods: [mod('ambushBonus', 'flat', 0.35)],
    perLevel: [mod('ambushBonus', 'flat', 0.1)],
    weight: 5,
  },

  // --- Cursor-space gems -----------------------------------------------------------

  displaced_conjuring: {
    id: 'displaced_conjuring', name: 'Displaced Conjuring',
    description: 'The volley MATERIALIZES at your mark instead of leaving your hands — the spell arrives where you point and flies onward from there.',
    color: '#c8b0e8', requiresTags: ['projectile'],
    mods: [mod('castAtCursor', 'flat', 1)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  puppet_strings: {
    id: 'puppet_strings', name: 'Puppet Strings',
    description: 'Projectiles are yours to STEER — they bend toward your cursor in flight, marionettes on unseen wires. Each level tightens the strings.',
    color: '#d0a8e0', requiresTags: ['projectile'],
    mods: [mod('guidePower', 'flat', 2.5)],
    perLevel: [mod('guidePower', 'flat', 0.8)],
    weight: 5,
  },

  detonating_passage: {
    id: 'detonating_passage', name: 'Detonating Passage',
    description: 'The projectile\'s PATH detonates behind it — a blast every stretch of flight. Steer it in a curve and write ruin in an arc.',
    color: '#f0b060', requiresTags: ['projectile'],
    mods: [],
    trail: { every: 80, blast: { radius: 55, damageScale: 0.35 } },
    weight: 5,
  },

  scorched_wake: {
    id: 'scorched_wake', name: 'Scorched Wake',
    description: 'The projectile leaves BURNING GROUND along its flight path — lingering fields, laid wherever it goes.',
    color: '#e88a4a', requiresTags: ['projectile'],
    mods: [],
    trail: { every: 90, zone: { radius: 40, duration: 2.5, tickInterval: 0.4, damageScale: 0.3 } },
    weight: 5,
  },

  sloughing_wake: {
    id: 'sloughing_wake', name: 'Sloughing Wake',
    description: 'The projectile SLOUGHS as it flies: ground shed every stretch of travel that CONTRACTS into nothing over its life — and each shedding reads the flight\'s pace at the moment it falls. The slower the passage, the longer it lingers: lob something ponderous and write a moat; a decelerating shot ages its trail young-to-old.',
    color: '#9ab84a', requiresTags: ['projectile'],
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
    description: 'This skill\'s wounds land as PROMISES: every resolution — damage, ailments, on-hit ruin — banks for two seconds and then arrives all at once, rolled at your LIVE power and 25% MORE of it. The room can read the fuse; you can stack the debt.',
    color: '#d8a06a', excludeTags: ['channel', 'guard', 'aura'],
    fuse: { delay: 2, tell: 'the fuse hisses…' },
    mods: [mod('damage', 'more', 0.25)],
    perLevel: [mod('fusePower', 'increased', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  slow_match: {
    id: 'slow_match', name: 'Slow Match',
    description: 'Fused resolutions of this skill wait HALF AGAIN as long — and strike 40% harder when they finally speak. The long bet, for builds that can keep the mark in play. Inert without a fuse (innate or a socketed Time Fuse).',
    color: '#b08a5a',
    mods: [mod('fuseDelay', 'increased', 0.5), mod('fusePower', 'increased', 0.4)],
    perLevel: [mod('fusePower', 'increased', 0.04)],
    weight: 4, minDropLevel: 8,
  },

  grafted_carapace: {
    id: 'grafted_carapace', name: 'Grafted Carapace',
    description: 'While this guard stance holds, you ALSO wear a SHELL across its blind side — a rear carapace that eats blows whole until it breaks (the shell glyph shows the covered arc). Priced by guard strength like the shield itself; drops with the stance, breaks like anatomy.',
    color: '#a8c890', requiresTags: ['guard'],
    shellGraft: { side: 'rear', arcDeg: 200, max: 55, regenDelay: 4 },
    mods: [],
    perLevel: [mod('guardStrength', 'increased', 0.04)],
    weight: 4,
  },

  // --- Ailment-stack + form gems ---------------------------------------------------

  suppuration: {
    id: 'suppuration', name: 'Suppuration',
    description: 'Stacking ailments you apply hold 2 additional stacks — poisons past eight, wounds past five, chills past the freeze.',
    color: '#9ac86a',
    mods: [mod('ailmentStacks', 'flat', 2)],
    perLevel: [mod('ailmentStacks', 'flat', 1)],
    weight: 6,
  },

  heavy_caliber: {
    id: 'heavy_caliber', name: 'Heavy Caliber',
    description: 'Projectiles are 30% MORE massive and shove what they strike — but fly 15% slower. Weight is a choice.',
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
    description: '20% chance for hits to IGNITE — the burn feeds on the hit\'s damage, whatever its element.',
    color: '#ff7a2a',
    mods: [mod('apply_burn', 'flat', 0.2)],
    perLevel: [mod('apply_burn', 'flat', 0.05)],
    weight: 7,
  },

  bleed_chance: {
    id: 'bleed_chance', name: 'Chance to Bleed',
    description: '25% chance for hits to open a stacking BLEED, fed by the hit\'s damage.',
    color: '#b03030',
    mods: [mod('apply_bleed', 'flat', 0.25)],
    perLevel: [mod('apply_bleed', 'flat', 0.05)],
    weight: 7,
  },

  poison_chance: {
    id: 'poison_chance', name: 'Chance to Poison',
    description: '25% chance for hits to inject a stacking POISON, fed by the hit\'s damage.',
    color: '#7ec850',
    mods: [mod('apply_poison', 'flat', 0.25)],
    perLevel: [mod('apply_poison', 'flat', 0.05)],
    weight: 7,
  },

  chill_chance: {
    id: 'chill_chance', name: 'Chance to Chill',
    description: '25% chance for hits to CHILL — stacks build toward the freeze like any other chill.',
    color: '#7ad4ff',
    mods: [mod('apply_chill', 'flat', 0.25)],
    perLevel: [mod('apply_chill', 'flat', 0.05)],
    weight: 7,
  },

  shock_chance: {
    id: 'shock_chance', name: 'Chance to Shock',
    description: '20% chance for hits to SHOCK, amplifying every hit that follows.',
    color: '#ffe14a',
    mods: [mod('apply_shock', 'flat', 0.2)],
    perLevel: [mod('apply_shock', 'flat', 0.05)],
    weight: 6,
  },

  stun_chance: {
    id: 'stun_chance', name: 'Chance to Stun',
    description: '12% chance for hits to STUN outright. Hard control comes rare.',
    color: '#cccccc',
    mods: [mod('apply_stun', 'flat', 0.12)],
    perLevel: [mod('apply_stun', 'flat', 0.03)],
    weight: 5,
  },

  freeze_chance: {
    id: 'freeze_chance', name: 'Chance to Freeze',
    description: '6% chance for hits to FREEZE solid — no buildup, straight to ice. Rare, and it feels it.',
    color: '#d8f4ff',
    mods: [mod('apply_frozen', 'flat', 0.06)],
    perLevel: [mod('apply_frozen', 'flat', 0.02)],
    weight: 4,
  },

  provocation: {
    id: 'provocation', name: 'Provocation',
    description: '35% chance for hits to TAUNT: the struck thing forgets its plans — its blade turns to YOU, and everything it swings at anyone ELSE lands soft. The tank\'s opening argument; the un-cheesable refuse the turn but still pull their punches.',
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
    description: '30% chance for hits to build HARROWING — trembling hands, backward feet — toward the broken-nerve rout. Your hits land 12% harder per stack already worn.',
    color: '#b8a4d8',
    mods: [mod('apply_harrowing', 'flat', 0.3), mod('damageVs_harrowing', 'flat', 0.12)],
    perLevel: [mod('apply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  haunted_service: {
    id: 'haunted_service', name: 'Haunted Service',
    description: 'Your minions\' hits carry the household\'s dread: 25% chance to build HARROWING, and your minions deal 15% increased damage to the harrowed.',
    color: '#9a86c8', requiresTags: ['minion'],
    mods: [mod('minionApply_harrowing', 'flat', 0.25), mod('minionDamage', 'increased', 0.15)],
    perLevel: [mod('minionApply_harrowing', 'flat', 0.05)],
    weight: 5,
  },

  potency: {
    id: 'potency', name: 'Potency',
    description: 'Ailments you apply are 30% stronger — hit-fed and baseline alike, skill-native and chance-granted alike. The crank.',
    color: '#c88ad0',
    mods: [mod('statusMagnitude', 'increased', 0.3)],
    perLevel: [mod('statusMagnitude', 'increased', 0.08)],
    weight: 6,
  },

  conflagrant: {
    id: 'conflagrant', name: 'Conflagrant',
    description: '35% MORE fire-ailment magnitude — potency invested in ONE family, multiplying past every increase.',
    color: '#ff6a3a', requiresTags: ['fire'],
    mods: [mod('statusMagnitude', 'more', 0.35, ['fire'])],
    perLevel: [mod('statusMagnitude', 'more', 0.06, ['fire'])],
    weight: 5,
  },

  // --- Damage conversion -------------------------------------------------------

  flameforged: {
    id: 'flameforged', name: 'Flameforged',
    description: '50% of the skill\'s physical damage is dealt as fire instead — fully fire at maximum level. Conversion stats also work from passives.',
    color: '#e87838', requiresTags: ['physical'],
    mods: [mod('convert_physical_fire', 'flat', 0.5)],
    perLevel: [mod('convert_physical_fire', 'flat', 0.125)],
    weight: 7,
  },

  // --- Repeats & salvos ----------------------------------------------------------

  multistrike: {
    id: 'multistrike', name: 'Multistrike',
    description: 'Melee skills strike TWO extra times in rapid succession, re-aiming at the nearest enemy, but you are locked into the flurry. 25% less damage.',
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
    description: 'The effect repeats twice more, each repetition 30% LARGER and harder-hitting than the last. 35% less base damage.',
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
    description: 'The skill banks a Seal every 1.4s while not being used (up to 2). Casting it fires one extra time per banked Seal in a rapid salvo.',
    color: '#b8d858', excludeTags: ['channel', 'movement', 'summon', 'aura', 'totem'],
    mods: [
      mod('unleashMax', 'flat', 2),
      mod('damage', 'more', -0.1),
    ],
    perLevel: [mod('unleashMax', 'flat', 0.5)],
    weight: 6,
  },

  // --- Melee impact ----------------------------------------------------------------

  reverberation: {
    id: 'reverberation', name: 'Reverberation',
    description: 'Melee strikes ring outward, striking one additional nearby enemy beyond the arc — chain, for blades.',
    color: '#c8a878', requiresTags: ['melee'],
    mods: [mod('meleeReverb', 'flat', 1)],
    perLevel: [mod('meleeReverb', 'flat', 0.5)],
    weight: 8,
  },

  splash: {
    id: 'splash', name: 'Splintering Impact',
    description: 'Every hit splashes to enemies within 60 units of the target at half damage.',
    color: '#a8c8d8', requiresTags: ['melee', 'projectile'],
    mods: [mod('splashRadius', 'flat', 60), mod('damage', 'more', -0.1)],
    perLevel: [mod('splashRadius', 'flat', 12)],
    weight: 8,
  },

  // --- DoT & curse ecosystem -------------------------------------------------

  virulence: {
    id: 'virulence', name: 'Virulence',
    description: 'Damage-over-time effects applied by this skill propagate to nearby enemies when their victim dies — chaining across deaths.',
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
    description: 'The scent CLINGS: this skill\'s afflictions last 40% longer and reach 20% wider — and cost more breath to lay down.',
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
    description: 'The smell turns SWEET enough to argue with: hits from this skill have a 25% chance to TAUNT the victim onto you — appetite, redirected — and its effects linger a little longer.',
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
    description: 'A sour edge under the blow: hits from this skill have a 20% chance to BOLT the victim outright (the rout fabric takes it from there), at the price of hitting 15% less hard.',
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
    description: 'Damage-over-time effects applied by this skill rupture at the end of their duration, dealing 80% of their total damage at once.',
    color: '#a85878',
    mods: [mod('dotRupture', 'flat', 0.8)],
    perLevel: [mod('dotRupture', 'flat', 0.15)],
    weight: 7,
  },

  hedonism: {
    id: 'hedonism', name: 'Hedonism',
    description: 'Cursed targets also gain 25% more attack and cast speed — and the curse has a 50% chance to afflict each of YOUR allies in the area.',
    color: '#e878a8', requiresTags: ['curse'],
    mods: [mod('hedonism', 'override', 1), mod('aoeRadius', 'increased', 0.15)],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 6,
  },

  // --- Projectile impact behaviors ---------------------------------------------

  forking: {
    id: 'forking', name: 'Forking',
    description: 'Projectiles split into two on impact. The children inherit the flight pattern — spirals fork into spirals.',
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
    description: 'Spent projectiles track back to YOU — wherever you\'ve moved — striking everything again on the way.',
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
    description: 'Corpse skills may target one of your living minions when no corpse is available — without harming or consuming it.',
    color: '#88a8c8', requiresTags: ['corpse'],
    mods: [mod('targetMinionFallback', 'override', 1)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.06)],
    weight: 7,
  },

  sacrificial_rites: {
    id: 'sacrificial_rites', name: 'Sacrificial Rites',
    description: 'Corpse skills may kill one of your own minions to provide their corpse when none is available. The death is real — Martyrdom applies.',
    color: '#b04868', requiresTags: ['corpse'],
    mods: [mod('sacrificeMinions', 'override', 1)],
    perLevel: [mod('damage', 'increased', 0.07)],
    weight: 6,
  },

  corpse_wagon: {
    id: 'corpse_wagon', name: 'Corpse Wagon',
    description: 'The dead travel in COMPANY: this skill handles up to 2 additional corpses per cast — detonations eat the whole pile into one greater blast, raisings stand the row up together, offerings burn wider and longer, and Exhume digs its full load in one turn of the spade. The wagon is heavy: 15% less cast speed.',
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
    description: 'The supported skill is cast by a planted totem instead of you, but deals 25% less damage — and PLANTING takes twice the skill\'s cast time. Leveling quickens the totem\'s own casting.',
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
    description: 'One FEWER projectile, but each remaining shot flies 25% faster and deals 35% MORE damage — the volley collapses toward a single focused killshot (never below one).',
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
    description: 'The supported skill\'s cooldown recovers 30% faster — the melee counterpart to faster casting finally gets its clock back.',
    color: '#8ae0e8',
    mods: [mod('cooldownRecovery', 'increased', 0.3)],
    perLevel: [mod('cooldownRecovery', 'increased', 0.08)],
    weight: 8,
  },

  phantasmal_echo: {
    id: 'phantasmal_echo', name: 'Phantasmal Echo',
    description: 'Each completed use of the supported skill binds a mirage of you to your shoulder for 5 seconds. The mirage re-casts the skill — sockets and all — at nearby foes on its own slow clock, far thinner than you. Costs more mana.',
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
    description: 'Each completed use of the supported melee skill sends an ancestor-ghost gliding at a nearby foe to swing it ONCE — if it arrives within its half-heartbeat of existence. Lengthen its stay and it ranges further afield.',
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
    description: 'Your clone is given FLESH: a real, killable shadow-self that fights beside you with its own knives — an autonomous minion scaling with your minion investment, echoing nothing.',
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
    description: 'Your echoes act 40% faster — mirage clocks quicken and shadow clones mirror your strikes more often.',
    color: '#b8a8e8',
    requiresTags: ['mirage', 'clone'],
    mods: [mod('constructCastRate', 'more', 0.4)],
    perLevel: [mod('constructCastRate', 'increased', 0.06)],
    weight: 6,
  },

  sweeping_blow: {
    id: 'sweeping_blow', name: 'Sweeping Blow',
    description: 'The supported melee arc LEAVES YOUR HANDS: a crescent wave built from the cone\'s own geometry travels forward, striking each enemy exactly once. 20% less damage; costs more mana.',
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
    description: 'The skill FEEDS: it costs 50% more mana (+5 flat), but every point of mana spent on a use returns as added damage of the skill\'s own types. Cost multipliers become damage multipliers — if you can sustain the appetite.',
    color: '#5a8ae8',
    // No hit to receive the bonus = a trap socket.
    excludeTags: ['summon', 'minion', 'aura', 'movement', 'buff', 'warcry'],
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
    description: 'Decaying minions rot 40% slower — the curve still wins, but later. Their damage suffers for the borrowed time.',
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
    description: 'Minions from this skill knit themselves back together: flat and percentage life regeneration. Socket it where you want the mending — skeletons heal, the rest don\'t.',
    color: '#8ae0a0',
    requiresTags: ['minion'],
    mods: [mod('minionRegen', 'flat', 3), mod('minionRegenPct', 'flat', 0.008)],
    perLevel: [mod('minionRegen', 'flat', 1), mod('minionRegenPct', 'flat', 0.002)],
    weight: 8,
  },

  bloodletters_rhythm: {
    id: 'bloodletters_rhythm', name: "Bloodletter's Rhythm",
    description: 'Wounds keep the beat: the supported skill gains bleed chance, and every bleed it APPLIES has a chance to bank a Fury charge.',
    color: '#c03030',
    requiresTags: ['attack'],
    mods: [mod('proc_bloodletters_rhythm', 'flat', 0.35), mod('apply_bleed', 'flat', 0.10)],
    perLevel: [mod('proc_bloodletters_rhythm', 'flat', 0.05)],
    weight: 7,
  },

  exposure: {
    id: 'exposure', name: 'Exposure',
    description: '30% chance for this skill\'s hits to leave the target VULNERABLE (stacking: 8% more damage taken per stack, to five) — the opener half of the Execution economy. Minion skills pass it to the horde.',
    color: '#d878b0',
    mods: [mod('apply_vulnerable', 'flat', 0.3)],
    perLevel: [mod('apply_vulnerable', 'flat', 0.06)],
    weight: 6,
  },

  bristling_riposte: {
    id: 'bristling_riposte', name: 'Bristling Riposte',
    description: 'The spikes swing WITH you: 80% of your flat thorns ride this skill\'s hits as added physical damage. Grow the coat (Bristleback, passives), then make it everyone\'s problem.',
    color: '#b09060', requiresTags: ['melee', 'attack'],
    mods: [mod('thornsToHit', 'flat', 0.8)],
    perLevel: [mod('thornsToHit', 'flat', 0.15)],
    weight: 5,
  },

  // --- The mender's kit ('heal'-tag gates — the healer support family) ------

  intensive_care: {
    id: 'intensive_care', name: 'Intensive Care',
    description: '40% increased HEALING POWER on the socketed skill — the healer\'s Searing Heat. Mends, streams, bursts and siphons alike.',
    color: '#7ec88a', requiresTags: ['heal'],
    mods: [mod('healPower', 'increased', 0.4)],
    perLevel: [mod('healPower', 'increased', 0.1)],
    weight: 7,
  },

  mending_chain: {
    id: 'mending_chain', name: 'Mending Chain',
    description: 'Heals from this skill LEAP to 2 further allies — each hop finds the most wounded untouched friend nearby, at 75% per hop. Chaining, for the other side of the ledger.',
    color: '#8ad8c8', requiresTags: ['heal'],
    mods: [mod('chainCount', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('chainCount', 'flat', 1)],
    weight: 6,
  },

  overmend: {
    id: 'overmend', name: 'Overmend',
    description: 'Healing this skill lands past FULL hardens into an absorption ward (60% of the spill) — top the bar, then keep pouring. The pre-hit heal.',
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
    description: 'Kills by this skill SHATTER something loose: a 25% chance to shed a FEROCITY fragment. Scoop it for stacking damage — the fight feeds the fight.',
    color: '#e8784a',
    mods: [mod('remnantDrop_ferocity', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_ferocity', 'flat', 0.06)],
    weight: 6,
  },

  bulwark_shards: {
    id: 'bulwark_shards', name: 'Bulwark Shards',
    description: 'Kills by this skill flake off BULWARK shards (20% chance) — walk over one and wear it: stacking armor plating scavenged mid-fight.',
    color: '#8aa8c8',
    mods: [mod('remnantDrop_bulwark', 'flat', 0.2)],
    perLevel: [mod('remnantDrop_bulwark', 'flat', 0.05)],
    weight: 6,
  },

  rage_remnants: {
    id: 'rage_remnants', name: 'Rage Remnant',
    description: 'Kills by this skill spill their fury onto the floor (25% chance): a RAGE mote worth two charges. Feed the Berserk economy without swinging for it.',
    color: '#e04030', requiresTags: ['attack'],
    mods: [mod('remnantDrop_rage', 'flat', 0.25)],
    perLevel: [mod('remnantDrop_rage', 'flat', 0.06)],
    weight: 5,
  },

  remnant_conduit: {
    id: 'remnant_conduit', name: 'Remnant Conduit',
    description: 'Real casts of this school may shed a REMNANT a step away — walk over it and the NEXT cast of that element is empowered. A dance of cast, step, cast.',
    color: '#e8c86a',
    requiresTags: ['fire', 'cold', 'lightning'],
    mods: [mod('remnantOnCast', 'flat', 0.12)],
    perLevel: [mod('remnantOnCast', 'flat', 0.03)],
    weight: 7,
  },

  metronome: {
    id: 'metronome', name: 'Metronome',
    description: 'Every landed hit builds TEMPO (attack and cast speed, to 8 stacks) — and ONE hit taken wipes the whole spin. Glass rhythm.',
    color: '#7ae0c8',
    requiresTags: ['attack', 'spell'],
    mods: [mod('proc_tempo', 'flat', 0.5)],
    perLevel: [mod('proc_tempo', 'flat', 0.06)],
    weight: 7,
  },

  colossus_stance: {
    id: 'colossus_stance', name: 'Colossus Stance',
    description: 'PLANT your feet (0.5s still — a ground ring marks the set stance) and the supported skill hits 28% HARDER over a wider area; swing within a step (0.15s) and it hits 10% less. The mountain does not chase.',
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
    description: 'The bond feeds THEM: minions from this skill regenerate fiercely, but strike 25% less hard — a wall that mends instead of mauls.',
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
    description: 'The overdrive debt trickles back EVEN WHILE you keep casting — at 35% rate, and even your breathers repay 25% slower. Uptime bought with patience.',
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
    description: 'The channel\'s aim LOCKS at the press: pulses and the release land at the ORIGINAL mark no matter where the cursor wanders — Event-Horizon discipline for any gather (a locked Flame Blast levels the block you chose, not the one you flinched to).',
    color: '#a8a8d8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelLockAim', 'flat', 1), mod('damage', 'more', 0.15)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 5,
  },

  reckless_breadth: {
    id: 'reckless_breadth', name: 'Reckless Breadth',
    description: 'The swing rounds out WIDE — 80% more arc — but 30% SHORTER: circumference bought with reach. Stack attack speed on a flurry and see red properly.',
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
    description: 'The congregation shares the offering: 35% of any minion-blessing this skill grants also dresses YOU — the officiant drinks from the same cup.',
    color: '#c8b8d8', requiresTags: ['minion'],
    mods: [mod('offeringShare', 'flat', 0.35)],
    perLevel: [mod('offeringShare', 'flat', 0.08)],
    weight: 5,
  },

  deep_reserves: {
    id: 'deep_reserves', name: 'Deep Reserves',
    description: '+1 use-charge on the socketed skill and 25% faster charge recovery — the cadence family\'s capacity gem.',
    color: '#d8c86a',
    mods: [
      mod('skillCharges', 'flat', 1),
      mod('skillChargeRate', 'increased', 0.25),
    ],
    perLevel: [mod('skillChargeRate', 'increased', 0.08)],
    weight: 6,
  },

  // --- Munition supports (the ammunition fabric's investment lane) ----------
  // All gated on the 'munition' tag: the guns, not the cadence family.
  // The shared-sockets rule (convert mints ride the slot's gems) is what
  // lets reloadSpeed here reach the gun's OWN reload cast.

  bandolier: {
    id: 'bandolier', name: 'Bandolier',
    description: 'Two more rounds in every bank this gun carries — but the webbing drags the swing of it: 10% reduced damage. Capacity is its own playstyle.',
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
    description: 'The racking hand learns the gun: 40% increased Reload Speed, and magazine clocks (this skill\'s own cooldown) recover 25% faster.',
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
    description: 'The LAST round in the bank leaves the muzzle 50% harder. Spend down to it — or rack short of full on purpose and live at the bottom of the drum.',
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
    description: 'CHAMBER the skill: three rounds, each cast as normal but 20% harder, a third wider, surer of its ailments and longer-lived — read at the button like any ammunition. Spent dry, the press becomes the RE-ENERGIZE rite before it speaks again.',
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
    description: 'Projectiles BOUNCE off rocks, walls and masonry twice before dying — fire into a canyon and let the terrain do the aiming. Composes with any flight pattern.',
    color: '#b0b8a0', requiresTags: ['projectile'],
    mods: [mod('projBounce', 'flat', 2)],
    perLevel: [mod('projBounce', 'flat', 1)],
    weight: 6,
  },

  recurve: {
    id: 'recurve', name: 'Recurve',
    description: 'A 35% chance for projectiles to whip around and strike the SAME victim again — decaying with each miracle. Death by comma, not full stop.',
    color: '#d8a8b8', requiresTags: ['projectile'],
    mods: [mod('projRecurve', 'flat', 0.35)],
    perLevel: [mod('projRecurve', 'flat', 0.08)],
    weight: 5,
  },

  shredding_return: {
    id: 'shredding_return', name: 'Shredding Return',
    description: 'Returning projectiles SPLINTER as they arrive home: 4 shards ring outward from the catch. Pairs with Returning, Boomerang, or anything that flies back on its own.',
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
    description: 'The socketed skill PHASES: shots, rays and placements pass through rock, walls and masonry as through mist — but 25% less damage. What stone cannot stop, it also cannot sharpen.',
    color: '#9a8ab8',
    mods: [mod('phasing', 'flat', 1), mod('damage', 'more', -0.25)],
    perLevel: [mod('damage', 'increased', 0.05)],
    weight: 4,
  },

  // --- Construct FX & rotation (the §5 batch) ---------------------------------

  pulsing_ramparts: {
    id: 'pulsing_ramparts', name: 'Pulsing Ramparts',
    description: 'The skill\'s deployed objects RADIATE: every beat, 40% of its roll washes everything beside them — effects and all. Bone Prison becomes the cage that cooks; a totem hurts just by standing.',
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
    description: 'The skill\'s deployed objects ERUPT as they arrive — 60% of its roll in a ring around each placement. Every wall segment is a landing shell; every trap announces itself in blood.',
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
    description: 'The held channel becomes a LIGHTHOUSE: its facing revolves on its own, sweeping the beam through everything around you — aim is no longer yours to fumble.',
    color: '#b8c8e8', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelAutoSpin', 'flat', 1.7), mod('damage', 'more', 0.1)],
    perLevel: [mod('channelAutoSpin', 'flat', 0.3)],
    weight: 5,
  },

  whirling_sigil: {
    id: 'whirling_sigil', name: 'Whirling Sigil',
    description: 'FACED ground areas (crescents, wedges, triangles) REVOLVE — the standing sweep becomes a clock-hand that keeps cutting. Melee swings refuse it (Sweeping Blow is the swing-to-sweep conversion); spin belongs to what LINGERS.',
    color: '#d8b8e8', requiresTags: ['aoe'],
    excludeTags: ['melee'],
    mods: [mod('aoeSpin', 'flat', 2.4)],
    perLevel: [mod('aoeSpin', 'flat', 0.5)],
    weight: 5,
  },

  enduring_snares: {
    id: 'enduring_snares', name: 'Enduring Snares',
    description: 'Run-over embedments RE-ARM on a 3-second internal cooldown instead of being consumed — the lodged spear is a fixture now, and walking your own minefield is a rotation.',
    color: '#b0a888', requiresTags: ['duration', 'trap'],
    mods: [mod('embedIcd', 'flat', 3), mod('damage', 'more', -0.15)],
    perLevel: [mod('embedIcd', 'flat', -0.35)],
    weight: 5,
  },

  // --- Fissure levers (the §6 batch) -------------------------------------------

  splintered_earth: {
    id: 'splintered_earth', name: 'Splintered Earth',
    description: 'The cast tears ONE MORE whole fissure, fanned beside the first — the ground splits like dropped crockery. 20% less damage per crack. Fits only skills that actually CRACK (the fissure tag).',
    color: '#c89868', requiresTags: ['fissure'],
    mods: [mod('fissureCount', 'flat', 1), mod('damage', 'more', -0.2)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  branching_fissures: {
    id: 'branching_fissures', name: 'Branching Fissures',
    description: 'Each fissure FORKS: two child cracks split off the main line at killing angles — the wound becomes a river delta. Fits only skills that actually CRACK (the fissure tag).',
    color: '#b88858', requiresTags: ['fissure'],
    mods: [mod('fissureBranches', 'flat', 2), mod('manaCost', 'more', 0.3)],
    perLevel: [mod('fissureBranches', 'flat', 0.5)],
    weight: 5,
  },

  suffusion: {
    id: 'suffusion', name: 'Suffusion',
    description: 'Projectiles that cross one of YOUR ground effects CARRY it: the field re-blooms where the flight ends. Shoot through your own Flame Wall and plant a garden downrange — the inverse of every trail gem.',
    color: '#a8d8b8', requiresTags: ['projectile'],
    mods: [mod('suffusion', 'flat', 1)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  // --- Curse & ceremony gems (the §8 batch) -----------------------------------

  deliberate_ruin: {
    id: 'deliberate_ruin', name: 'Deliberate Ruin',
    description: 'The rite takes 30% LONGER and lands 35% HARDER — a tradeoff that pays twice on skills that do things DURING the cast (lashing sacraments, casting-effect compositions).',
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
    description: 'The curse becomes a SENTENCE: it RUPTURES for 200% of its latent damage — on a fuse 30% shorter. Less lingering misery; more scheduled violence.',
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
    description: 'GRANTS the socketed summon the ASSAULT order (⇧+key): every mobile minion marches on your mark and fights whatever holds it. Skeleton Archers were not born knowing this; the gem teaches them.',
    color: '#c8a84b', requiresTags: ['summon'],
    mods: [],
    meta: { skillId: 'command_assault', label: 'Assault' },
    perLevel: [mod('minionMoveSpeed', 'increased', 0.08)],
    weight: 6,
  },

  self_destruct: {
    id: 'self_destruct', name: 'Self-Destruct',
    description: 'GRANTS the socketed summon its LAST instruction (⇧+key): every hard-resummonable minion detonates for most of its life — the untargetable included (invisibility shields them from enemies, never from your order). Refuses persistent contracts and totems outright — a Stone Golem is family, and Shatterrite already owns the totem rite.',
    color: '#e86848', requiresTags: ['summon'],
    excludeTags: ['persistent', 'totem'],
    mods: [],
    meta: { skillId: 'command_detonate', label: 'Detonate' },
    perLevel: [mod('minionExplodeDeath', 'flat', 0.08)],
    weight: 5,
  },

  shatterrite: {
    id: 'shatterrite', name: 'Shatterrite',
    description: 'GRANTS the socketed totem skill the RITE (⇧+key): your standing totems BURST as physical ordnance — the totem-into-mine conversion, one keypress deep.',
    color: '#c8a878', requiresTags: ['totem'],
    mods: [],
    meta: { skillId: 'shatter_totem', label: 'Shatter' },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  beckon_beyond: {
    id: 'beckon_beyond', name: 'Beckon from Beyond',
    description: 'Minions EMERGE AT YOUR MARK instead of beside you — the horde boils out of the ground where you point. Bombardment\'s portal, grafted onto any summon.',
    color: '#a878d8', requiresTags: ['summon'],
    mods: [mod('summonAtCursor', 'flat', 1), mod('manaCost', 'more', 0.2)],
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 5,
  },

  violent_arrival: {
    id: 'violent_arrival', name: 'Violent Arrival',
    description: 'Minions ARRIVE as weapons: 40% of each one\'s life detonates around its emergence point — the inverse Martyrdom. Pair with Beckon from Beyond and the summon IS the strike.',
    color: '#d87858', requiresTags: ['summon'],
    mods: [mod('summonImpact', 'flat', 0.4), mod('manaCost', 'more', 0.25)],
    perLevel: [mod('summonImpact', 'flat', 0.08)],
    weight: 5,
  },

  pyre_legion: {
    id: 'pyre_legion', name: 'Pyre Legion',
    description: 'Minions from this skill RADIATE a burning ring — standing near your ranks is standing in the fire. The kind pyre: it burns the enemy, never the bearer.',
    color: '#ff8a4a', requiresTags: ['summon'],
    mods: [mod('manaCost', 'more', 0.25)],
    minionAura: { radius: 90, enemyDps: { amount: 6, type: 'fire' } },
    perLevel: [mod('damage', 'increased', 0.06, ['fire'])],
    weight: 5,
  },

  ritual_ground: {
    id: 'ritual_ground', name: 'Ritual Ground',
    description: 'The CHANNEL becomes a CAST: the bar plants a channeler-vessel at your mark, and the held working persists THERE for ~4 seconds, independent of you. Tornado spins where you left it; The Amalgam feeds at the altar you chose.',
    color: '#b8a0d0', requiresTags: ['channel'], excludeTags: ['guard'],
    mods: [mod('channelPersist', 'flat', 4), mod('manaCost', 'more', 0.35)],
    perLevel: [mod('channelPersist', 'flat', 0.8)],
    weight: 5,
  },

  // --- Movement, offerings & the travelling crack (the deferred pass) ---------

  closing_instinct: {
    id: 'closing_instinct', name: 'Closing Instinct',
    description: 'The movement skill PICKS ITS OWN prey — auto-lunging at the nearest enemy near your aim — and the instinct STRIKES TWICE: one extra re-targeted repeat rides every use. On Closing Fang itself (already a hunter) the second lunge IS the gift. An empty field never refuses the button.',
    color: '#c8a068', requiresTags: ['movement'],
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
    description: 'The offering RISES: the field plants as an EFFIGY at your feet instead of at the mark — the ring rides the idol, dies with it, and the idol SPITS grave-wisps at enemies inside the incense. Recasting raises a new effigy; the old one crumbles, smoke and all.',
    color: '#b06888', requiresTags: ['corpse'], excludeTags: ['buff'],
    turret: { castSkillId: 'offering_wisp', life: 50, look: 'offering_effigy' },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  sundering_flight: {
    id: 'sundering_flight', name: 'Sundering Flight',
    description: 'Projectiles become TEAR-HEADS: the ground rips open along each shot\'s actual flight — a fissure that bends wherever the flight bends. Earthrender\'s wound, grafted onto any volley.',
    color: '#c8a058', requiresTags: ['projectile'],
    fissureTrail: { radius: 24, linger: 1.2, tickInterval: 0.4, damageScale: 0.4 },
    mods: [mod('manaCost', 'more', 0.3)],
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  // --- The reaping court & miasma (this pass) ---------------------------------

  skeletal_strike: {
    id: 'skeletal_strike', name: 'Skeletal Strike',
    description: 'GRANTS the socketed summon the STRIKE order (⇧+key): every minion of that skill DASHES its nearest enemy and cuts it open. Chain it behind or ahead of other meta-grants — gem ORDER is the order of operations.',
    color: '#cfc8b8', requiresTags: ['summon'],
    mods: [],
    meta: { skillId: 'command_skeletal_strike', label: 'Strike' },
    perLevel: [mod('minionDamage', 'increased', 0.06)],
    weight: 6,
  },

  ravenous_pact: {
    id: 'ravenous_pact', name: 'Ravenous Pact',
    description: 'Minions from this skill learn HUNGER: on a beat, each devours the nearest of your OTHER minions — a real death — healing itself and feasting toward stacking fury. The Harvester\'s appetite, taught to anything.',
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
    description: 'The curse stops being a cast: it becomes a TOGGLED haze WORN around you — enemies inside are re-afflicted on a beat, statuses, procs and ruptures all riding — while a quarter of your mana stays reserved. Press again to exhale it.',
    color: '#a868c8', requiresTags: ['curse'],
    curseField: { mode: 'follow', radius: 170, tickInterval: 0.75, damageScale: 0.4, reservePct: 0.25 },
    mods: [],
    perLevel: [mod('aoeRadius', 'increased', 0.06)],
    weight: 5,
  },

  miasmic_ground: {
    id: 'miasmic_ground', name: 'Miasmic Ground',
    description: 'The curse SETTLES: casting plants it at your mark as a lingering patch that re-afflicts whoever stands in it. One patch — recasting MOVES the sickness, never multiplies it.',
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
    description: 'The SOFT spender: the skill casts as normal — but any FRENZY banked is DEVOURED on use, +15% MORE damage per charge eaten. Cleave learns to feast; nothing is ever refused.',
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
    description: 'The HARD spender: the skill CANNOT be cast until three FRENZY stand banked — then it spends them all, +25% MORE damage per charge. "Not ready" until the tariff is met; ruinous once it is.',
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
    description: 'A LONG clock in trade for a starving price: +8 seconds of cooldown (still reducible), 75% reduced cost. The skill becomes a scheduled indulgence the budget barely notices.',
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
    description: 'The pseudo-ULTIMATE: +10 seconds of cooldown (still reducible) buys 90% MORE damage and wider work — the ordinary skill you press like a finisher. Choose which button becomes the event.',
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
    description: 'Lingering ground areas learn the RETURN STROKE: their facing swings out-and-back, over and over — the exact back-and-forth Reaver\'s Sweep retired when it committed to one pass. Faced shapes feel it; the blade keeps time.',
    color: '#b06ad8', requiresTags: ['aoe'],
    excludeTags: ['melee'],
    pendulum: { arcDeg: 160, period: 1.5 },
    mods: [mod('effectDuration', 'increased', 0.25)],
    perLevel: [mod('effectDuration', 'increased', 0.08)],
    weight: 5,
  },

  phalanx: {
    id: 'phalanx', name: 'Phalanx',
    description: 'GRANTS the socketed guard the THRUST (⇧+key): a razor-narrow lance poked from BEHIND the raised shield, block sustained throughout — greatshield-and-spear discipline. Not ready unless the guard is up.',
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
    description: 'The supported skill is SWORN TO THE SHIELD: castable only while a guard is raised — where it fires INSTANTLY, block sustained throughout, harder-hitting, on a ~4-second clock (levels shave it). The deliberate lane: every cast an aimed, chosen answer from behind the wall. Spellsword discipline.',
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
    description: 'While the supported guard HOLDS, your POISE drains steadily into the wall — the shield rebuilt mid-blow out of your own footing. The pump only draws while the wall is dented, and never below a quarter of your bar: stack poise deep and the stone drinks deep, but it will not break your stance for you. The poise-tank\'s wall: your defense is the fuel.',
    color: '#a89878', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.08, ratio: 2.0, floor: 0.25 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 5, minDropLevel: 8,
  },

  reckless_transfusion: {
    id: 'reckless_transfusion', name: 'Reckless Transfusion',
    description: 'The greedy sibling: your POISE pours HARD into the supported guard — faster and richer than any disciplined pump, and it does NOT stop at the bottom. It will drink your bar through the BREAK: Sundered, brackets ringing, the lot — and then sip nothing until the bar re-arms. The wall you buy is magnificent; the legs you buy it with are yours.',
    color: '#c05a48', requiresTags: ['guard'],
    conduit: { from: 'poise', to: 'guard', drainPct: 0.15, ratio: 2.6, floor: 0 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 3, minDropLevel: 14,
  },

  bulwarks_tithe: {
    id: 'bulwarks_tithe', name: 'Bulwark\'s Tithe',
    description: 'The pump turned around: while the supported guard HOLDS, the WALL pays a steady tithe into your POISE — the shield keeps your footing armed through the storm, and it rests ABOVE the bash line (never below a third of the wall), so the release blow stays loaded. The anti-stagger tank: let the stance take the wear so the bar never breaks.',
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
    description: 'While the supported CHANNEL is held, your blood feeds the working: LIFE drains steadily into MANA — the pump idles whenever the blue bar is full, and it will bleed you white but never dead. The blood-mage\'s bargain: the spell keeps burning as long as you do.',
    color: '#b05a90', requiresTags: ['channel'],
    conduit: { from: 'life', to: 'mana', drainPct: 0.035, ratio: 1.4, floor: 0.1 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  crystal_cistern: {
    id: 'crystal_cistern', name: 'Crystal Cistern',
    description: 'While the supported guard HOLDS, your ENERGY SHIELD decants into the wall — the crystal backing the stone. A withdrawal, not a wound: the drain never interrupts a recharge, and it rests at a floor so the lattice is never drunk dry. The ES-tank\'s guard: two shields, one wall.',
    color: '#8ad8e8', requiresTags: ['guard'],
    conduit: { from: 'es', to: 'guard', drainPct: 0.07, ratio: 1.6, floor: 0.2 },
    mods: [],
    perLevel: [mod('conduitRate', 'increased', 0.06)],
    weight: 4, minDropLevel: 12,
  },

  thoughtburn: {
    id: 'thoughtburn', name: 'Thoughtburn',
    description: 'While the supported CHANNEL is held, your ENERGY SHIELD burns as fuel: the lattice drains steadily into MANA and the working drinks it. A withdrawal, not a wound — recharges flow undisturbed beneath it. The archmage\'s reserve tank: the shield is just mana you haven\'t spent yet.',
    color: '#a8b8f0', requiresTags: ['channel'],
    conduit: { from: 'es', to: 'mana', drainPct: 0.05, ratio: 1.2, floor: 0.15 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 12,
  },

  overflow_reservoir: {
    id: 'overflow_reservoir', name: 'Overflow Reservoir',
    description: 'While the supported TOGGLE burns, spare MANA seeps into your ENERGY SHIELD — the unspent surplus banked as lattice instead of sloshing at the cap. The pump keeps a working half-tank of mana untouchable and idles whenever the shield is whole: pure surplus, never the rent.',
    color: '#7ac0d8', requiresTags: ['aura'],
    conduit: { from: 'mana', to: 'es', drainPct: 0.04, ratio: 1.0, floor: 0.5 },
    mods: [],
    perLevel: [mod('conduitEfficiency', 'increased', 0.07)],
    weight: 4, minDropLevel: 10,
  },

  stillmind_conduit: {
    id: 'stillmind_conduit', name: 'Stillmind Conduit',
    description: 'While the supported guard HOLDS, your INSIGHT decants into the wall — the watcher\'s momentum, spent as masonry. Sings loudest under an inverted eye: root, let stillness pool the mind, and let the mind hold the line.',
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
    description: 'The bar-breaker: 15% less damage, but DOUBLE poise damage — and the break you earn is worth more: Sundered lasts 50% longer and your hits land 20% harder on the sundered. Crack the stance, then spend the window.',
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
    description: 'The anti-dodge: hits land TOO TRUE TO READ — half the target\'s insight slip is denied outright, accuracy climbs 25%, and 35% of hits leave the target REELING (insight stops replenishing). The runner\'s rhythm, taken away.',
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
    description: 'The ward-eater: every point the target\'s energy shield soaks is SHREDDED for 1.8 — the pool strips fast and cheap — and 30% of hits leave it VOIDED (recharge stops cold). Made for the glass and the glimmering.',
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
    description: 'The supported skill TEACHES ITSELF: each cast grants a stack that sharpens and quickens THAT SKILL ALONE — six deep, and the whole pile DROPS after two idle seconds. Any blade can learn the kata; none may rest. (Channels hold, they don\'t recast — they refuse this gem.)',
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
    description: 'Hits BRAND with judgement: 10% chance to shock — and every stack of shock on the victim feeds THIS skill 7% increased damage. Not the storm\'s scatter; the exploiter\'s ledger.',
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
    description: 'Altitude is a weapon: movement skills deal 18% MORE damage — the fall behind every strike. Costs more; momentum always does.',
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
    description: 'Where this skill\'s projectiles END their flight, a JUDGEMENT PILLAR falls on the spot at 60% effect — every shot a sentence, every landing a verdict.',
    color: '#ffd27f', requiresTags: ['projectile'],
    // NOTE: shares parting_gift's known crew-lane inert pair (raise_spectre/
    // revive board sequel gems onto raised minions that never read them) —
    // one behavior class, so whatever fixes the frost gem fixes this one.
    sequel: { skillId: 'judgement_pillar', damageScale: 0.6 },
    mods: [mod('manaCost', 'more', 0.25)],
    perLevel: [mod('damage', 'increased', 0.05, ['fire'])],
    weight: 4, minDropLevel: 12,
  },

  // --- The CIRRUS gem (the high air, rentable) -------------------------------
  rarefy: {
    id: 'rarefy', name: 'Rarefy',
    description: 'The skill is worked in HIGH THIN AIR: 50% of its physical damage arrives as cold instead — fully cold at maximum level. The Flameforged conversion\'s pale sibling; the mountain\'s answer to the forge.',
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
    description: 'Supported skills turn heads LIGHT: 35% of hits build faintness. Pale the room and let the ladder work — at the cap they SWOON (a white-out drag, never a stun), and Syncope lands harder the paler they get.',
    color: '#d8ccd8', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_faintness', 'flat', 0.35)],
    perLevel: [mod('apply_faintness', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  sickening: {
    id: 'sickening', name: 'Sickening',
    description: 'Supported skills turn STOMACHS: 35% of hits build queasy. Five deep and the target is RETCHING — begun attacks and spells keep fizzling. The channel-breaker you apply instead of time.',
    color: '#a8b86a', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_queasy', 'flat', 0.35)],
    perLevel: [mod('apply_queasy', 'flat', 0.03)],
    weight: 5, minDropLevel: 8,
  },
  unblinking: {
    id: 'unblinking', name: 'Unblinking',
    description: 'Supported skills WATCH: 30% of hits build beheld, and damage against the SEEN (the ladder\'s cap — marked meat) is amplified. The Ocular\'s regard, socketed: keep looking and the mark writes itself.',
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
    description: 'Supported skills ring in the INNER EAR: 30% of hits build disoriented. Five deep and they turn WIDDERSHINS — every step contrary to its own brain — and a turned enemy is a HERDED one: ring them off ledges, out of formation, into the ground you laid.',
    color: '#9ad8d0', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_disoriented', 'flat', 0.3)],
    perLevel: [mod('apply_disoriented', 'flat', 0.025)],
    weight: 5, minDropLevel: 10,
  },
  addling: {
    id: 'addling', name: 'Addling',
    description: 'Supported skills CROSS THE WIRES: 20% of hits leave the target addled — its casts may fire the wrong button entirely, burning cooldowns at your convenience. A control economy, not a damage one: what a boss wastes, you did not have to survive.',
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
    description: 'Supported skills READ THE FLAW ALOUD: 22% of hits leave the victim EXPOSED — a weak spot painted on the health bar, 40% more through the window — and the bearer prosecutes what it publishes: hits land 12% harder against the exposed. The tribune\'s whole docket in one stone: paint the spot, then hit it.',
    color: '#f0d890', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_exposed', 'flat', 0.22), mod('damageVs_exposed', 'flat', 0.12)],
    perLevel: [mod('apply_exposed', 'flat', 0.02), mod('damageVs_exposed', 'flat', 0.015)],
    weight: 5, minDropLevel: 11,
  },
  sanctal_cautery: {
    id: 'sanctal_cautery', name: 'Sanctal Cautery',
    description: 'Supported skills close the ledger AND the wound: 25% of hits SEAR — gilt fire cauterizes, and for its span every heal the victim drinks is HALVED (regen, leech, mending bonds alike). The kata\'s answer to whatever refuses to stay judged: menders, drinkers, the self-repairing.',
    color: '#f8d8a0', requiresTags: ['attack', 'spell'],
    mods: [mod('apply_sear', 'flat', 0.25)],
    perLevel: [mod('apply_sear', 'flat', 0.025)],
    weight: 5, minDropLevel: 12,
  },
};

export const SUPPORT_LIST: SupportDef[] = Object.values(SUPPORTS);

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
