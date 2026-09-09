// ---------------------------------------------------------------------------
// UNIQUE ITEMS — pinned legends on base families.
//
// A unique is a UniqueDef: a base family id + RangedLineDefs. Because bases
// resolve tier from the drop's item level, every line's range scales by
// tierScale per tier (ITEM_CFG.uniqueTierScale default) — the same Emberbrand
// looted in the deep world IS the leveling Emberbrand, bigger. There is no
// separate "leveling unique" category; scaling is the category.
//
// Lines are full Modifier shapes, so uniques reach every seam the engine
// already owns: tag filters (melee-only damage), actor conditions (while
// moving / on low mana), stat LINKS (gain X% of life regen as thorns —
// single-hop rule enforced by the stats engine), the generated apply_/
// damageVs_/minionApply_<status> families, negative ranges (downsides),
// and LOCAL scope (`local: true` — the line scales THIS item's own stats,
// displays "… on this item", and is priced hot because of it).
//
// THE LEGEND FABRIC (docs/engine/legends.md — her ruling 2026-09-08: a
// unique is a BUILD, never a stat pool): every legend wears at least one
// SIGNATURE line no rolled affix can produce (THE DEFINING LAW, pinned by
// balance/probe_legends.ts), drawn from the grammar the engine now speaks:
//  · GRANTED SKILLS — skillGrantStat(id) at a rolled LEVEL ("Grants Level 2
//    Firebolt"): a real, bindable, socketable instance on the wearer's seat
//    whose stones live on the item (engine/skills.ts SKILLGRANT_PREFIX).
//  · TRIGGERS — a proc authored BESIDE the legend (LEGEND_PROCS below,
//    registered through data/procs.ts registerProc) whose chance is the
//    proc_<id> line and whose magnitude is the procPower_<id> line; a
//    'cast' payload with `own` fires the wearer's OWN copy of a skill
//    (level, sockets, tree — the granted one), and hitType gates a blow
//    on what actually struck.
//  · ACCUMULATORS as plain state — THE STRIDE (strideReach + the 'strided'
//    condition), THE ROOTED RAMP (the 'still' gauge), THE BLOOM
//    (minionBloom / minionBloomPower), THE EXTRA LANE (extraAs_<type>).
//  · the standing levers — slot grafts, combos, conversions, sympathy,
//    lowLifeLine, reflex, throng finds, the din — each a legend's whole
//    argument.
// Spoken lines use `text` with {v} (raw), {v%} (percent) and {v0} (whole).
// ---------------------------------------------------------------------------

import type { UniqueDef } from '../engine/items';
import { skillGrantStat, slotGraftStat } from '../engine/skills';
import { comboStat } from '../engine/sequence';
import { mod } from '../engine/stats';
import { procPowerStat, procStat, registerProc, type ProcDef } from './procs';

// ---------------------------------------------------------------------------
// THE LEGEND PROCS — triggers authored beside the legends that wear them,
// registered through the proc registry's open door (registerProc): the same
// rate disciplines, depth law, chance cap, luck multiplier and power dial as
// every row in data/procs.ts. Only a legend line grants their chance, so a
// build without the piece never rolls them (the armed guard).
// ---------------------------------------------------------------------------
export const LEGEND_PROCS: ProcDef[] = [
  // THE REKINDLING (The Emberbrand): setting a body Burning looses the
  // wearer's OWN Firebolt at it — the granted copy, level, sockets and all
  // (the own-copy law) — from the hand ('self'), so the bolt flies AT the
  // burning victim. The icd paces a burn-spam build to a bolt a second.
  {
    id: 'emberbrand_rekindle', name: 'The Rekindling', color: '#ff8a3a',
    trigger: 'statusApply', status: 'burn', icd: 1.0,
    effect: { type: 'cast', cast: { skillId: 'firebolt', count: [1, 1], at: 'self', own: true } },
  },
  // STORMCALL'S ANSWER (Stormcall): a blow whose DOMINANT rolled type is
  // lightning (conversions honored — ProcDef.hitType) calls one bolt down
  // on its victim: the stormcall_strike payload played AT the struck body.
  {
    id: 'stormcall_answer', name: 'Stormcall', color: '#c8e8ff',
    trigger: 'hit', hitType: 'lightning', icd: 0.5, oncePerCast: true,
    effect: { type: 'cast', cast: { skillId: 'stormcall_strike', count: [1, 1], at: 'target' } },
  },
  // THE LETTING (Bloodletter's Girdle): a BLEEDING body slain by your blow
  // bursts — the killing skill's damage re-rolled around the corpse.
  {
    id: 'bloodletting', name: 'The Letting', color: '#d04a4a',
    trigger: 'kill', vs: ['bleed'], oncePerCast: true,
    effect: { type: 'explosion', damageScale: 0.9, radius: 85 },
  },
  // THE SECOND REFUSAL (Fleetfeather Treads): a made evade becomes flight.
  {
    id: 'fleetfeather_refusal', name: 'Second Refusal', color: '#8ad0ff',
    trigger: 'evade', icd: 2,
    effect: {
      type: 'buff', buff: {
        type: 'buff', id: 'fleetfeather_refusal', duration: 3,
        mods: [mod('moveSpeed', 'increased', 0.25), mod('attackSpeed', 'increased', 0.15)],
      },
    },
  },
  // THE WHISPER (The Miser's Loop): running dry halves every waiting clock.
  {
    id: 'misers_whisper', name: "The Miser's Whisper", color: '#7aa0e8',
    trigger: 'condition', condition: 'lowMana', icd: 10,
    effect: { type: 'cooldown', fraction: 0.5 },
  },
  // THE VIGIL'S ANSWER (The Cindervigil): every REAL spell cast also looses
  // the wearer's Pyroclast Bolt — the GRANTED copy (own) — at the spell's
  // own mark (the aimed 'cast' payload). Payload casts never re-roll the
  // trigger (they pass as echoes), so the vigil can never answer itself.
  {
    id: 'cindervigil_answer', name: "The Vigil's Answer", color: '#ffb060',
    trigger: 'cast', tags: ['spell'], icd: 0.8,
    effect: { type: 'cast', cast: { skillId: 'pyroclast_bolt', count: [1, 1], own: true } },
  },
];
for (const def of LEGEND_PROCS) registerProc(def);

export const UNIQUE_LIST: UniqueDef[] = [
  // WANDERER'S WAKE — THE STRIDE (engine/stats.ts 'strided'): walk the
  // reach and the next blow you land strides — priced as increased damage
  // AND a flat physical kick, both reading the one condition; the landing
  // spends the walk at the end of its frame (every contact of one swing
  // sees it). A lower reach is the better roll, so the line is pinned
  // (tierScale 0) — depth must never lengthen the road.
  {
    id: 'wanderers_wake', name: "Wanderer's Wake", baseId: 'boots_evasion', weight: 100,
    flavor: 'The road never asked her name; it simply made room.',
    lines: [
      { stat: 'strideReach', kind: 'flat', range: [560, 400], tierScale: 0,
        text: 'After walking {v0} paces, your next blow STRIDES' },
      { stat: 'damage', kind: 'increased', range: [0.45, 0.65], when: 'strided' },
      { stat: 'addedPhysical', kind: 'flat', range: [8, 14], when: 'strided' },
      { stat: 'moveSpeed', kind: 'increased', range: [0.12, 0.18] },
      // LOCAL — the boots themselves are slippery; sized for one item.
      { stat: 'evasion', kind: 'increased', range: [0.25, 0.4], local: true },
    ],
  },
  // THE EMBERBRAND — THE REKINDLING: the ring GRANTS Firebolt (a level that
  // deepens with the tier — the leveling law on a granted skill) and every
  // burn you lay has a chance to loose that very bolt at its victim (the
  // own-copy law: the granted instance's level and sockets ride the
  // trigger). A burn build owns a free second cannon.
  {
    id: 'emberbrand', name: 'The Emberbrand', baseId: 'ring_ruby', weight: 100,
    flavor: 'It remembers every fire it has started.',
    lines: [
      { stat: skillGrantStat('firebolt'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: procStat('emberbrand_rekindle'), kind: 'flat', range: [0.35, 0.5],
        text: '{v%} chance to loose your Firebolt at an enemy you set Burning' },
      { stat: 'addedFire', kind: 'flat', range: [4, 7] },
      { stat: 'damageVs_burn', kind: 'flat', range: [0.1, 0.18] },
      { stat: 'fireRes', kind: 'flat', range: [0.1, 0.15] },
    ],
  },
  // THE DUELIST'S-READ anchor (the STAT_TRADES conversion fabric): footwork
  // re-read as the fencer's insight pool. BOTH dials ride as ordinary
  // lines — the rate deliberately outweighs the row-scoped forgo (this
  // item's texture is net-positive; a keystone could invert that), the
  // local evasion feeds its own trade, and the insight-increased line
  // scales the granted base (trades join the BASE layer — the fabric's
  // own law, worn as proof).
  {
    id: 'duelists_ledger', name: "The Duelist's Ledger", baseId: 'chest_evasion', weight: 70,
    minIlvl: 8,
    flavor: 'Every step she ever dodged is written somewhere in the weave.',
    lines: [
      { stat: 'evasionToInsight', kind: 'flat', range: [0.22, 0.3] },
      // The trade's price — its own separable line, sized under the rate.
      { stat: 'evasionToInsightForgo', kind: 'flat', range: [0.15, 0.22] },
      { stat: 'evasion', kind: 'increased', range: [0.3, 0.45], local: true },
      { stat: 'insight', kind: 'increased', range: [0.1, 0.15] },
    ],
  },
  // THE FUSE BUILD's anchor: shorter fuses, far harder verdicts — worn by
  // anyone running Time Fuse / Doomsayer's arrears (the gather family).
  {
    id: 'slowmatch_coil', name: 'The Slowmatch Coil', baseId: 'ring_ruby', weight: 70,
    minIlvl: 8,
    flavor: 'Light it, then live long enough to hear the answer.',
    lines: [
      { stat: 'fusePower', kind: 'increased', range: [0.35, 0.55] },
      { stat: 'fuseDelay', kind: 'increased', range: [-0.3, -0.18] },
      { stat: 'damage', kind: 'increased', range: [0.08, 0.14] },
      // The coil takes its time — a real downside line.
      { stat: 'castSpeed', kind: 'increased', range: [-0.08, -0.05] },
    ],
  },
  // THE LOW-LIFE LINE's anchor (the lowLifeLine stat): you count as wounded
  // from half — Painfuel, Red Rapture, low-life supports, the hit surge and
  // the blood vignette all wake there with you. The pact's price is a
  // thinner bar to be low WITH: the conditional damage rides the belt's own
  // raised line, so the item is its own uptime.
  {
    id: 'pale_bargain', name: 'The Pale Bargain', baseId: 'belt_endurance', weight: 70,
    minIlvl: 6,
    flavor: 'Half a life, she reasoned, is a thing you can spend twice.',
    lines: [
      { stat: 'lowLifeLine', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'damage', kind: 'increased', range: [0.1, 0.16], when: 'lowLife' },
      { stat: 'lifeRegen', kind: 'flat', range: [2, 4] },
      // The bargain's price — a real downside line.
      { stat: 'life', kind: 'increased', range: [-0.12, -0.08] },
    ],
  },
  // THE ATTUNEMENT PASS's anchor: the crystal country distilled into a
  // pendant — blows leave part-lightning (the fabric reads the MIX, so the
  // fork is a walking tuning tool), and the storm-share of the wearer's
  // kit brightens to match.
  {
    id: 'tuning_fork', name: 'The Tuning Fork', baseId: 'amulet_opal', weight: 70,
    minIlvl: 7,
    flavor: 'Strike anything, it says, and I will tell you what it truly is.',
    lines: [
      { stat: 'convert_physical_lightning', kind: 'flat', range: [0.2, 0.3] },
      { stat: 'damage', kind: 'increased', range: [0.1, 0.16], tags: ['lightning'] },
      { stat: 'lightningRes', kind: 'flat', range: [0.1, 0.15] },
      { stat: 'castSpeed', kind: 'increased', range: [0.04, 0.07] },
    ],
  },
  // GRAVEBLOOM — THE BLOOM (engine minionBloom / minionBloomPower): every
  // minion you raise ripens on a timer and BURSTS in chaos for a share of
  // its own maximum life, then dies — so life investment IS the bomb, and
  // the bigger-bodied contracts are the fattest charges. A shorter fuse
  // is the better roll (pinned); the marker status counts the seconds
  // down on the body.
  {
    id: 'gravebloom', name: 'Gravebloom', baseId: 'helmet_es', weight: 100,
    flavor: 'What you plant in sorrow you may harvest in service.',
    lines: [
      { stat: 'minionBloom', kind: 'flat', range: [8, 5], tierScale: 0,
        text: 'Your minions BLOOM {v0} seconds after they emerge: they burst, and they die' },
      { stat: 'minionBloomPower', kind: 'flat', range: [0.4, 0.6],
        text: "The bloom deals {v%} of the minion's maximum life as chaos damage around it" },
      { stat: 'minionLife', kind: 'increased', range: [0.3, 0.45] },
      { stat: 'minionApply_poison', kind: 'flat', range: [0.1, 0.18] },
    ],
  },
  // BLOODLETTER'S GIRDLE — THE LETTING: a bleeding body you slay BURSTS
  // for the killing blow's damage around it (the 'kill' trigger's victim
  // gate reads the wound), the burst's magnitude a rolled POWER line (the
  // proc's second dial) beside the pinned certainty. The bleed build's
  // chain reaction.
  {
    id: 'bloodletters_girdle', name: "Bloodletter's Girdle", baseId: 'belt_poise', weight: 100,
    flavor: 'Cinched tight, so nothing spills that was not meant to.',
    lines: [
      { stat: procStat('bloodletting'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'Bleeding enemies you slay BURST, wounding everything around them' },
      { stat: procPowerStat('bloodletting'), kind: 'flat', range: [0.15, 0.4],
        text: 'The burst strikes for {v%} more damage' },
      { stat: 'apply_bleed', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'poise', kind: 'flat', range: [30, 50] },
      { stat: 'life', kind: 'flat', range: [25, 40] },
    ],
  },
  // THE HOLLOW SOVEREIGN — the energy-shield pact: a crown's worth of
  // local shield, and the body that agreed to leave takes LESS while the
  // shield holds (the hasEs condition — the ES-first build's own armor).
  {
    id: 'hollow_sovereign', name: 'The Hollow Sovereign', baseId: 'chest_es', weight: 80,
    minIlvl: 9,
    flavor: 'A crown for the body once the body agrees to leave.',
    lines: [
      // LOCAL — a 40-60% window is one-item pricing; global it would dwarf
      // every affix in the game.
      { stat: 'energyShield', kind: 'increased', range: [0.4, 0.6], local: true },
      { stat: 'damageTaken', kind: 'more', range: [-0.12, -0.08], when: 'hasEs' },
      { stat: 'esRechargeRate', kind: 'increased', range: [0.2, 0.3] },
      { stat: 'mana', kind: 'flat', range: [30, 50] },
      // The bargain — a real downside line (negative range, scales too).
      { stat: 'life', kind: 'increased', range: [-0.15, -0.1], tierScale: 0 },
    ],
  },
  // STORMCALL — THE ANSWER: a blow of lightning (the DOMINANT rolled type,
  // conversions honored — so The Tuning Fork's part-lightning qualifies
  // when it wins the roll) has a rolled chance to call a bolt down on its
  // victim, and a rolled POWER makes the bolt bite harder. The bolt wears
  // the wearer's whole lightning investment like any cast.
  {
    id: 'stormcall', name: 'Stormcall', baseId: 'amulet_opal', weight: 100,
    flavor: 'Wear it high on the chest, where the thunder can find it.',
    lines: [
      { stat: procStat('stormcall_answer'), kind: 'flat', range: [0.12, 0.2],
        text: '{v%} chance for a blow of lightning to call a bolt down on its victim' },
      { stat: procPowerStat('stormcall_answer'), kind: 'flat', range: [0.2, 0.5],
        text: 'The called bolt strikes for {v%} more damage' },
      { stat: 'addedLightning', kind: 'flat', range: [5, 9] },
      { stat: 'apply_shock', kind: 'flat', range: [0.15, 0.22] },
      { stat: 'lightningRes', kind: 'flat', range: [0.15, 0.25] },
    ],
  },
  {
    id: 'aegis_of_the_drowned', name: 'Aegis of the Drowned', baseId: 'chest_armor', weight: 90,
    flavor: 'The hull held. The crew did not. The hull held.',
    lines: [
      // LOCAL — "the hull held": this plate, half again as thick.
      { stat: 'armor', kind: 'increased', range: [0.5, 0.8], local: true },
      { stat: 'thorns', kind: 'flat', range: [15, 25] },
      // A stat LINK line: thorns fed by life regen (single-hop by engine rule).
      { stat: 'thorns', kind: 'link', fromStat: 'lifeRegen', range: [1.5, 2.5], tierScale: 0 },
      { stat: 'lifeRegen', kind: 'flat', range: [2, 4] },
    ],
  },
  // FLEETFEATHER TREADS — THE SECOND REFUSAL: the bird that refused to be
  // caught twice. A made evade has a rolled chance to become flight (a
  // real buff off the 'evade' trigger — the dodge wardrobe's tempo).
  {
    id: 'fleetfeather', name: 'Fleetfeather Treads', baseId: 'boots_armor_evasion', weight: 110,
    flavor: 'Stitched from a bird that refused to be caught twice.',
    lines: [
      { stat: procStat('fleetfeather_refusal'), kind: 'flat', range: [0.5, 0.8],
        text: '{v%} chance when you evade to take flight: 25% increased movement speed and 15% increased attack speed for 3 seconds' },
      { stat: 'moveSpeed', kind: 'increased', range: [0.1, 0.15] },
      { stat: 'attackSpeed', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'evasion', kind: 'flat', range: [60, 100] },
    ],
  },
  // THE MISER'S LOOP — THE WHISPER: spend it all, and every cooldown you
  // are waiting on halves the moment you run dry (the 'condition' trigger
  // on lowMana's rising edge, paced by its own clock) — the dump-and-reset
  // rhythm the low-mana damage line already paid for.
  {
    id: 'misers_loop', name: "The Miser's Loop", baseId: 'ring_lapis', weight: 100,
    flavor: 'Spend it all, it whispers. See what happens.',
    lines: [
      { stat: procStat('misers_whisper'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'Running low on mana halves every cooldown you are waiting on, once per 10 seconds' },
      { stat: 'damage', kind: 'increased', range: [0.15, 0.2], when: 'lowMana' },
      { stat: 'mana', kind: 'increased', range: [0.25, 0.4] },
      { stat: 'manaRegen', kind: 'flat', range: [2, 3.5] },
      { stat: 'cooldownRecovery', kind: 'increased', range: [0.08, 0.12] },
    ],
  },
  // TITAN'S GRASP — THE ONE BLOW: melee strikes MORE (a true multiplier,
  // not another increase) and the hands swing slower for it — the heavy
  // build's trade, priced whole (the downside pinned).
  {
    id: 'titans_grasp', name: "Titan's Grasp", baseId: 'gloves_armor', weight: 100,
    flavor: 'The mountain does not strike quickly. It strikes once.',
    lines: [
      { stat: 'damage', kind: 'more', range: [0.15, 0.22], tags: ['melee'] },
      { stat: 'attackSpeed', kind: 'increased', range: [-0.15, -0.1], tierScale: 0 },
      { stat: 'addedPhysical', kind: 'flat', range: [4, 8] },
      { stat: 'strength', kind: 'flat', range: [8, 14] },
    ],
  },
  // --- The Aetherial's relics (the Ascent's own prizes) ----------------------
  // THE THOUSAND STEPS: the causeway-runner's boots — momentum as doctrine.
  // Made for the shelves (the floor is leaving; so are you), honest anywhere.
  {
    id: 'thousand_steps', name: 'The Thousand Steps', baseId: 'boots_evasion', weight: 70,
    minIlvl: 10,
    flavor: 'Count them later.',
    lines: [
      { stat: 'moveSpeed', kind: 'increased', range: [0.14, 0.2] },
      { stat: 'evasion', kind: 'increased', range: [0.3, 0.45], local: true },
      { stat: 'damage', kind: 'increased', range: [0.12, 0.18], tags: ['movement'] },
      { stat: 'damage', kind: 'increased', range: [0.08, 0.12], when: 'moving' },
    ],
  },
  // THE HALO OF THE NINTH CHOIR — THE COUNT: the aureole-caster's crown.
  // Eight choirs sing; the ninth keeps count — lightning damage climbs per
  // enemy near you (the foes:near derived gauge), so the storm caster who
  // wades in is the one the Host rewards.
  {
    id: 'halo_ninth_choir', name: 'Halo of the Ninth Choir', baseId: 'helmet_es', weight: 65,
    minIlvl: 12,
    flavor: 'Eight choirs sing. The ninth keeps count.',
    lines: [
      { stat: 'energyShield', kind: 'increased', range: [0.3, 0.5], local: true },
      { stat: 'damage', kind: 'increased', range: [0.02, 0.03], gauge: 'foes:near', tags: ['lightning'],
        text: 'Lightning skills deal {v%} increased damage for each enemy near you: the ninth keeps count' },
      { stat: 'castSpeed', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'apply_shock', kind: 'flat', range: [0.1, 0.15] },
      { stat: 'lightningRes', kind: 'flat', range: [0.1, 0.15] },
    ],
  },
  // THE ROTE HAND — the WORN GRAFT fabric's debut legend (slotgraft_<slot>_
  // <gem>: the glove grants the support; the PLAYER aims it by choosing what
  // to bind in that bar seat). Two deliberately different-fitting grafts —
  // Multistrike wants melee on the primary, Splitting wants a projectile on
  // Skill Slot 3 — so on most builds ONE line is live and the other sits
  // honestly dormant in the book: the item that teaches the fabric's honesty
  // by being worn. Ranges pin whole levels (tierScale 0): a granted gem's
  // level is a promise, never a decimal.
  {
    id: 'rote_hand', name: 'The Rote Hand', baseId: 'gloves_evasion', weight: 70,
    minIlvl: 8,
    flavor: 'Every finger remembers.',
    lines: [
      { stat: slotGraftStat(1, 'multistrike'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'The skill in Skill Slot 1 is granted Level {v} Multistrike' },
      { stat: slotGraftStat(3, 'splitting'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'The skill in Skill Slot 3 is granted Level {v} Splitting' },
      { stat: 'attackSpeed', kind: 'increased', range: [0.06, 0.1] },
      { stat: 'evasion', kind: 'increased', range: [0.2, 0.3], local: true },
    ],
  },
  // --- The build-around wave (each legend IS one landed fabric's lever) ------
  // THE UNMOVED — the conversion fabric at FULL RENUNCIATION (the
  // Iron-Reflexes shape as an item): the rate line reads the wearer's whole
  // evasion baseline as armor while the forgo dial renounces ALL of it,
  // pinned whole — half a renunciation is a different item. Every point of
  // footwork anywhere on the doll becomes plate (the golden rule reads the
  // pre-forgo baseline, so nothing is lost to the order of grants); beside
  // the Ledger's net-positive echo and the Lattice's bargain below, this is
  // the fabric's third texture: total. And THE ROOTED RAMP: the stone that
  // abstains hits harder the longer it stands (the 'still' derived gauge,
  // capped at GAUGE_CFG.stillCap seconds). Stone is slow — a real downside.
  {
    id: 'the_unmoved', name: 'The Unmoved', baseId: 'chest_armor_evasion', weight: 65,
    minIlvl: 9,
    flavor: 'Let the wind vote. The stone abstains.',
    lines: [
      { stat: 'evasionToArmor', kind: 'flat', range: [0.85, 1.0] },
      { stat: 'evasionForgone', kind: 'flat', range: [1, 1], tierScale: 0 },
      { stat: 'damage', kind: 'more', range: [0.04, 0.06], gauge: 'still',
        text: '{v%} more damage for every second you stand still, up to five' },
      { stat: 'armor', kind: 'increased', range: [0.3, 0.45], local: true },
      { stat: 'moveSpeed', kind: 'increased', range: [-0.06, -0.04] },
    ],
  },
  // THE GALEWRIGHTS — the worn-graft fabric's second teacher, wearing the
  // wind: two shove gems granted by SEAT (Turbulence onto Skill Slot 1,
  // Battering Ram onto Skill Slot 2 — the player aims them by choosing what
  // to bind there), so one bar reads buffet-and-ram while the flat lines
  // put the whole doll into the mass fabric's shove economy (authority
  // folds into every push, impact prices every arrested body). Misfits sit
  // honestly dormant — Battering Ram wants melee in Slot 2, and the socket
  // gate, not the item, says so.
  {
    id: 'galewrights', name: 'The Galewrights', baseId: 'gloves_armor_evasion', weight: 70,
    minIlvl: 8,
    flavor: 'The wind writes with both hands.',
    lines: [
      { stat: slotGraftStat(1, 'turbulence'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'The skill in Skill Slot 1 is granted Level {v} Turbulence' },
      { stat: slotGraftStat(2, 'battering_ram'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'The skill in Skill Slot 2 is granted Level {v} Battering Ram' },
      { stat: 'shoveAuthority', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'impactDamage', kind: 'flat', range: [0.2, 0.3] },
    ],
  },
  // SQUALLSTEP WINDTREWS — the proc registry's signature lane worn as a
  // legend (data/procs.ts answering_gale): a slipped blow claps a REAL Gust
  // Burst off the evader, so the dodge wardrobe stops crowds instead of
  // merely leaving them. Chance and evasion feed one loop — more slips,
  // more sky — and the winded lane pays it forward. The first legend on a
  // LEGS base.
  {
    id: 'squallstep', name: 'Squallstep Windtrews', baseId: 'legs_evasion_es', weight: 65,
    minIlvl: 9,
    flavor: 'Miss her once, and the sky files its answer.',
    lines: [
      { stat: procStat('answering_gale'), kind: 'flat', range: [0.3, 0.4] },
      { stat: 'evasion', kind: 'increased', range: [0.25, 0.4], local: true },
      { stat: 'apply_winded', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'moveSpeed', kind: 'increased', range: [0.06, 0.1] },
    ],
  },
  // THE BORROWED BREATH — the survival-meter fabric's EASE LANE as a wind
  // legend: the gale lends its lung (slower breath drain — the diver's
  // amulet, still capped by the meter's own row at the fold) and marks its
  // prey in the gale family's own word, WINDED — applied by the amulet,
  // then priced by it. Wind kits get a predator loop; everyone else gets
  // the deep.
  {
    id: 'borrowed_breath', name: 'The Borrowed Breath', baseId: 'amulet_jade', weight: 70,
    minIlvl: 6,
    flavor: 'Give it back slowly.',
    lines: [
      { stat: 'survivalEase_breath', kind: 'flat', range: [0.25, 0.35] },
      { stat: 'apply_winded', kind: 'flat', range: [0.12, 0.2] },
      { stat: 'damageVs_winded', kind: 'flat', range: [0.15, 0.25] },
      { stat: 'evasion', kind: 'flat', range: [40, 70] },
    ],
  },
  // THE GLEANER'S CROWN — the throng fabric's FIND LEVERS as a legend: one
  // more husk pocket rolled into every zone (pinned whole — the quanta law:
  // a fractional pocket would promise bodies that aren't there) and every
  // mint event swollen through the one quanta-rounded fold. The gatherer's
  // farming crown; the minion lines keep the harvest standing once claimed.
  {
    id: 'gleaners_crown', name: "The Gleaner's Crown", baseId: 'helmet_armor_es', weight: 65,
    minIlvl: 8,
    flavor: 'A kingdom is picked up one pair of hands at a time.',
    lines: [
      { stat: 'throngPockets', kind: 'flat', range: [1, 1], tierScale: 0 },
      { stat: 'throngYield', kind: 'increased', range: [0.25, 0.4] },
      { stat: 'minionLife', kind: 'increased', range: [0.15, 0.25] },
      { stat: 'minionDamage', kind: 'increased', range: [0.1, 0.18] },
    ],
  },
  // BELLWETHER — the watch fabric's noise stimulus worn as doctrine: every
  // landed blow RINGS (the Ringing Report's lure play, item-wide), so
  // watchers step off their posts to investigate you — and the agate's
  // poise plus the thorns are what they find when they arrive. The flock
  // goes where the bell goes; the poised line pays the shepherd who holds.
  {
    id: 'bellwether', name: 'Bellwether', baseId: 'amulet_agate', weight: 70,
    minIlvl: 7,
    flavor: 'The flock goes where the bell goes.',
    lines: [
      { stat: 'noiseOnHit', kind: 'flat', range: [150, 220] },
      { stat: 'poise', kind: 'flat', range: [25, 40] },
      { stat: 'thorns', kind: 'flat', range: [10, 18] },
      { stat: 'damage', kind: 'increased', range: [0.12, 0.18], when: 'poised' },
    ],
  },
  // THE STANDING TOAST — the reflex fabric's from-outside twin worn whole:
  // flask skills become REFLEXES (the stat doc's own example made a legend
  // — the press pierces your own casts and dashes) and the THIRST gate is
  // waived (drink brimming for the on-drink riders and let the pour spill).
  // The restore lines make every toast worth raising.
  {
    id: 'standing_toast', name: 'The Standing Toast', baseId: 'belt_endurance', weight: 65,
    minIlvl: 7,
    flavor: 'Raised mid-argument, drained mid-swing.',
    lines: [
      { stat: 'reflex', kind: 'flat', range: [1, 1], tierScale: 0, tags: ['flask'],
        text: 'Your flask skills are Reflexes: their press pierces your own casts and dashes' },
      { stat: 'thirstless', kind: 'flat', range: [1, 1], tierScale: 0, tags: ['flask'],
        text: 'Your flasks never refuse a drink: thirst gates are waived' },
      { stat: 'restorePower', kind: 'increased', range: [0.15, 0.25] },
      { stat: 'restorePctMax', kind: 'flat', range: [0.02, 0.04] },
    ],
  },
  // THE SHARED CUP — the sympathy fabric's tamed BOND as a legend: the
  // keeper's pours and orb scoops REPLAY on the bonded companion, potency
  // rolled (the fabric multiplies the echo by the stat's value), so one
  // flask waters the whole hunt. Without a companion both lines sit
  // honestly dormant — the Rote Hand's law: the item teaches by being worn.
  {
    id: 'shared_cup', name: 'The Shared Cup', baseId: 'ring_coral', weight: 70,
    minIlvl: 6,
    flavor: 'What she drinks, they drink.',
    lines: [
      // text overrides: both links register the label 'bond', so bare lines
      // would read as twins — the override names each echo's channel.
      { stat: 'sympathy_bond_flask', kind: 'flat', range: [0.5, 0.75],
        text: 'Flask pours you drink echo to your bonded companion at {v}× strength' },
      { stat: 'sympathy_bond_orb', kind: 'flat', range: [0.5, 0.75],
        text: 'Orbs you scoop echo to your bonded companion at {v}× strength' },
      { stat: 'healPower', kind: 'increased', range: [0.1, 0.15] },
      { stat: 'life', kind: 'flat', range: [20, 30] },
    ],
  },
  // ROUNDELAY — a combo grammar granted by jewelry (the same combo_<id>
  // stat family the tree's notables write, worn instead of specced): the
  // Prismatic Round arrives with the amulet, and the comboVaried condition
  // — the grammar's own starter read — pays the cycling it teaches. The
  // elementalist's reason to own three schools.
  {
    id: 'roundelay', name: 'Roundelay', baseId: 'amulet_opal', weight: 65,
    minIlvl: 8,
    flavor: 'Three verses, one round, no rest.',
    lines: [
      { stat: comboStat('elemental_round'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'Grants the Prismatic Round grammar: three different elements in a row close the round' },
      { stat: 'damage', kind: 'increased', range: [0.1, 0.16], when: 'comboVaried' },
      { stat: 'castSpeed', kind: 'increased', range: [0.06, 0.1] },
      { stat: 'mana', kind: 'flat', range: [20, 30] },
    ],
  },
  // THE GROUNDED LATTICE — the bonewright lane worn PARTIAL: half the
  // mage-shield knelt into footing, rate over a mid forgo — a true trade
  // with change left over. Beside The Unmoved's total renunciation and the
  // Ledger's echo this is the conversion fabric's BARGAIN texture; the
  // poise-increased line scales the granted base (trades join the BASE
  // layer — the fabric's own law), and the local armor keeps the plate
  // honest while the lattice thins.
  {
    id: 'grounded_lattice', name: 'The Grounded Lattice', baseId: 'chest_armor_es', weight: 65,
    minIlvl: 9,
    flavor: 'The shield did not break. It knelt.',
    lines: [
      { stat: 'esToPoise', kind: 'flat', range: [0.5, 0.7] },
      { stat: 'esForgone', kind: 'flat', range: [0.35, 0.5] },
      { stat: 'poise', kind: 'increased', range: [0.2, 0.3] },
      { stat: 'armor', kind: 'increased', range: [0.3, 0.45], local: true },
    ],
  },
  // --- THE LEGEND FABRIC's flagship ------------------------------------------
  // THE CINDERVIGIL — the whole grammar on one helm (the Dusk Vigil's
  // shape): two GRANTED skills (Firebolt at a level that deepens with the
  // tier; Pyroclast Bolt pinned at one), a TRIGGER that fires the granted
  // bolt at every real spell's mark (the own-copy law: its sockets, its
  // tree picks ride), THE EXTRA LANE, spell damage, life on kill and mana
  // regeneration. Wear it and a build exists that did not before — the
  // item IS the kit, and the player builds around it.
  {
    id: 'cindervigil', name: 'The Cindervigil', baseId: 'helmet_es', weight: 55,
    minIlvl: 12,
    flavor: 'Keep the watch, and the watch keeps you.',
    lines: [
      { stat: skillGrantStat('firebolt'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: skillGrantStat('pyroclast_bolt'), kind: 'flat', range: [1, 1], tierScale: 0 },
      { stat: procStat('cindervigil_answer'), kind: 'flat', range: [1, 1], tierScale: 0,
        text: 'Casting a spell also looses your Pyroclast Bolt at its mark' },
      { stat: 'extraAs_fire', kind: 'flat', range: [0.3, 0.5],
        text: 'Gain {v%} of damage as extra fire damage' },
      { stat: 'damage', kind: 'increased', range: [0.25, 0.4], tags: ['spell'] },
      { stat: 'lifeOnKill', kind: 'flat', range: [5, 10] },
      { stat: 'manaRegen', kind: 'increased', range: [0.25, 0.25], tierScale: 0 },
    ],
  },
];

export const UNIQUES: Record<string, UniqueDef> =
  Object.fromEntries(UNIQUE_LIST.map(u => [u.id, u]));
