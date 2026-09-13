// ---------------------------------------------------------------------------
// THE RELIC LEGENDS — chase pieces for THE RELIQUARY (docs/engine/containers.md).
//
// A relic legend is a BUILD the case seats (THE LEGEND FABRIC's law —
// docs/engine/legends.md: a unique is never a stat pool), and the debut
// roster's argument is THE SEAT LAW (engine/seatlaw.ts): where a piece sits
// on the board is part of what it does. One legend per footprint and one
// per lever —
//   · The Hermit's Bead (charm 1×1) — SOLITUDE: stronger per empty seat
//     touching it; give it the ring's corner and the room around it.
//   · Sunderstone (charm 1×1) — a rolled, persistent ELEMENT (the living
//     uniques' choice groups): THE EXTRA LANE and penetration of that type,
//     paid in your own resistance to it (the D2 sunder trade).
//   · The Lodestone (talisman 2×1) — COMMUNION: stronger per relic touching
//     it; crowd it.
//   · The Unquarried Idol (idol 1×2) — GRANTS Summon Stone Golem from the
//     case (the granted-skill law: the golem's stones live on the idol).
//   · The Tally Idol (idol 1×2) — THE CASE GAUGE: damage per relic seated
//     in the Reliquary; fill the case.
//   · The Reliquary Crown (effigy 2×2) — OUTWARD: every relic touching it
//     has stronger lines; it seats only once THE HEART opens, and touches
//     eight seats from there.
// The amplifier lines are PINNED (tierScale 0): the seat law is a constant,
// and the lines it amplifies already grow with depth.
// Weights are the world unique pool's share (chase, not floor — a rare
// relic pays the daily wage); minIlvl walks the ladder the case grows on.
// Every number is a dial.
// ---------------------------------------------------------------------------

import type { RangedLineDef, UniqueDef } from '../../engine/items';
import type { UniqueChoiceGroup } from '../../engine/itemchoices';
import { skillGrantStat } from '../../engine/skills';
import { seatPowerStat, seatedGaugeId } from '../../engine/seatlaw';

/** The container the Tally Idol counts (data/containers.ts RELIQUARY_ID —
 *  named by literal here so the legends never import the fabric's data
 *  module mid-evaluation; the probe pins the gauge stands registered). */
export const RELIC_LEGEND_CONTAINER = 'reliquary';

// SUNDERSTONE's rolled element — one identity per stone, forever
// (engine/itemchoices.ts: stable ids, migrated on the group-local seed).
const SUNDER_ELEMENTS = [
  { id: 'fire', name: 'Fire', tag: 'fire' },
  { id: 'cold', name: 'Cold', tag: 'cold' },
  { id: 'lightning', name: 'Lightning', tag: 'lightning' },
  { id: 'chaos', name: 'Chaos', tag: 'chaos' },
] as const;

export const SUNDER_CHOICES: UniqueChoiceGroup[] = [{
  id: 'sundered',
  options: SUNDER_ELEMENTS.map(e => ({
    id: e.id, weight: 1,
    lines: [
      { stat: `${e.id}Pen`, kind: 'flat', range: [0.15, 0.22],
        text: `Your ${e.name} damage penetrates {v%} of ${e.name} resistance` },
      { stat: `extraAs_${e.id}`, kind: 'flat', range: [0.1, 0.15],
        text: `Gain {v%} of damage as extra ${e.name} damage` },
      // The sunder's price — pinned, so depth never deepens the wound.
      { stat: `${e.id}Res`, kind: 'flat', range: [-0.22, -0.15], tierScale: 0 },
    ] satisfies RangedLineDef[],
  })),
}];

export const RELIC_UNIQUES: UniqueDef[] = [
  // THE HERMIT'S BEAD — SOLITUDE (seatPower_solitude): the bead's own lines
  // grow for every open seat touching it that stands empty. A 1×1 touches
  // four seats at most; in the ring's corner it touches two until the
  // shelves open. Five seats spent for one bead at full strength.
  {
    id: 'hermits_bead', name: "The Hermit's Bead", baseId: 'relic_charm', weight: 45, minIlvl: 5,
    flavor: 'It asked for nothing but the room around it.',
    lines: [
      { stat: seatPowerStat('solitude'), kind: 'flat', range: [0.25, 0.35], tierScale: 0,
        text: "This bead's lines are {v%} stronger for every open seat touching it that stands empty" },
      { stat: 'damage', kind: 'increased', range: [0.08, 0.12] },
      { stat: 'life', kind: 'flat', range: [12, 18] },
    ],
  },
  // SUNDERSTONE — the sunder trade on a charm: one rolled element's
  // penetration and tagged damage, paid in your own resistance to it.
  {
    id: 'sunderstone', name: 'Sunderstone', baseId: 'relic_charm', weight: 40, minIlvl: 8,
    flavor: 'Break the door. Pay the draft.',
    choices: SUNDER_CHOICES,
    lines: [
      { stat: 'accuracy', kind: 'flat', range: [20, 30] },
    ],
  },
  // THE LODESTONE — COMMUNION (seatPower_communion): the talisman's own lines
  // grow for every relic touching it. A 2×1 touches six seats at most.
  {
    id: 'lodestone', name: 'The Lodestone', baseId: 'relic_talisman', weight: 40, minIlvl: 9,
    flavor: 'Iron finds iron.',
    lines: [
      { stat: seatPowerStat('communion'), kind: 'flat', range: [0.06, 0.09], tierScale: 0,
        text: "This talisman's lines are {v%} stronger for every relic touching it" },
      { stat: 'damage', kind: 'increased', range: [0.1, 0.14] },
      { stat: 'lifeRegen', kind: 'flat', range: [2, 3] },
      { stat: 'critChance', kind: 'flat', range: [0.02, 0.03] },
    ],
  },
  // THE UNQUARRIED IDOL — a GRANTED SKILL from the case: Summon Stone Golem
  // at a level that deepens with the tier (the leveling law on a grant),
  // its sockets and tree picks resident on the idol (THE RESIDENCE ON THE
  // ITEM reaches a seated piece through the container fold's host scan).
  // The golem's own binding reserve is the price.
  {
    id: 'unquarried_idol', name: 'The Unquarried Idol', baseId: 'relic_idol', weight: 35, minIlvl: 10,
    flavor: 'Nobody carved it. It simply stopped being a mountain.',
    lines: [
      { stat: skillGrantStat('summon_stone_golem'), kind: 'flat', range: [1, 2], tierScale: 0.3 },
      { stat: 'minionLife', kind: 'increased', range: [0.15, 0.25] },
      { stat: 'minionDamage', kind: 'increased', range: [0.1, 0.15] },
      { stat: 'manaRegen', kind: 'increased', range: [0.1, 0.15] },
    ],
  },
  // THE TALLY IDOL — THE CASE GAUGE (seated:reliquary): damage per relic
  // seated in the case, the idol among them. The full case seats twenty-odd
  // charms; the tally is the reason to fill it.
  {
    id: 'tally_idol', name: 'The Tally Idol', baseId: 'relic_idol', weight: 35, minIlvl: 12,
    flavor: 'Count them. Then count them again.',
    lines: [
      { stat: 'damage', kind: 'increased', range: [0.015, 0.025], gauge: seatedGaugeId(RELIC_LEGEND_CONTAINER),
        text: '{v%} increased damage for every relic seated in your Reliquary, this idol among them' },
      { stat: 'life', kind: 'flat', range: [15, 22] },
      { stat: 'mana', kind: 'flat', range: [12, 18] },
    ],
  },
  // THE RELIQUARY CROWN — OUTWARD (seatPower_outward): every relic touching
  // the effigy has stronger lines. A 2×2 seats only once THE HEART opens,
  // and from the heart it touches eight seats — the whole ring. Its own
  // lines are the case's: life and the four resistances, moving as one.
  {
    id: 'reliquary_crown', name: 'The Reliquary Crown', baseId: 'relic_effigy', weight: 25, minIlvl: 16,
    flavor: 'Every jewel in the case turns to face it.',
    lines: [
      { stat: seatPowerStat('outward'), kind: 'flat', range: [0.15, 0.22], tierScale: 0,
        text: 'Relics touching this effigy have {v%} stronger lines' },
      { stat: 'life', kind: 'increased', range: [0.06, 0.09] },
      { stat: 'fireRes', kind: 'flat', range: [0.06, 0.09] },
      { stat: 'coldRes', kind: 'flat', range: [0.06, 0.09], sharedRoll: true },
      { stat: 'lightningRes', kind: 'flat', range: [0.06, 0.09], sharedRoll: true },
      { stat: 'chaosRes', kind: 'flat', range: [0.06, 0.09], sharedRoll: true },
    ],
  },
];
