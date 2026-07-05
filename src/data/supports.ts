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

import { mod } from '../engine/stats';
import { AOE_SHAPE, PROJ_RETURN } from '../engine/skills';
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

  // --- Channeling & guard supports -------------------------------------------

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
    mods: [mod('orbDropLife', 'flat', 0.08)],
    perLevel: [mod('orbDropLife', 'flat', 0.03)],
    weight: 7,
  },

  azure_harvest: {
    id: 'azure_harvest', name: 'Azure Harvest',
    description: 'Hits have an 8% chance to knock loose a mana orb.',
    color: '#4a78d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbDropMana', 'flat', 0.08)],
    perLevel: [mod('orbDropMana', 'flat', 0.03)],
    weight: 7,
  },

  lambent_harvest: {
    id: 'lambent_harvest', name: 'Lambent Harvest',
    description: 'Hits have an 8% chance to knock loose an energy shield orb — picking one up also kicks off your recharge.',
    color: '#5ad8d8', requiresTags: ['attack', 'spell'],
    mods: [mod('orbDropEs', 'flat', 0.08)],
    perLevel: [mod('orbDropEs', 'flat', 0.03)],
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

  // --- Construct FX & rotation (the §5 batch) ---------------------------------

  pulsing_ramparts: {
    id: 'pulsing_ramparts', name: 'Pulsing Ramparts',
    description: 'The skill\'s deployed objects RADIATE: every beat, 40% of its roll washes everything beside them — effects and all. Bone Prison becomes the cage that cooks; a totem hurts just by standing.',
    color: '#c8a8b8', requiresTags: ['totem', 'trap', 'mine'],
    mods: [mod('manaCost', 'more', 0.3)],
    constructFx: { pulse: { interval: 1.0, radius: 48, damageScale: 0.4 } },
    perLevel: [mod('damage', 'increased', 0.06)],
    weight: 5,
  },

  violent_genesis: {
    id: 'violent_genesis', name: 'Violent Genesis',
    description: 'The skill\'s deployed objects ERUPT as they arrive — 60% of its roll in a ring around each placement. Every wall segment is a landing shell; every trap announces itself in blood.',
    color: '#e88a58', requiresTags: ['totem', 'trap', 'mine'],
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
    turret: { castSkillId: 'offering_wisp', life: 50 },
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
