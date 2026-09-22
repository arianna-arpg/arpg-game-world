// ---------------------------------------------------------------------------
// THE CONTAINERS — every side board the account can own, as data.
//
// A row here is a whole inventory: what it takes, whether what sits in it is
// ACTIVE, and the ladder of Vault rungs that grow its board (each rung a
// char-grid FRAME of the cells it opens on the container's canvas; the live
// board is the union of the owned frames — engine/containers.ts). The Vault
// rows, the menu page, the inventory tab, the sheet fold and the co-op wire
// all DERIVE from this list; adding a pouch, a quiver, a spellbook, a second
// bag is one more ContainerDef and one FEATURE flag per rung — nothing else.
//
// THE RELIQUARY (debut): a case for relics — charms, talismans, idols,
// effigies (data/itembases.ts relic families; data/itemaffixes.ts the RELIC
// REGISTER). A relic is inert in the pack and speaks only from a seat here.
// The ladder is the D2-charm / Last-Epoch-idol tetris made explicit: a
// single quest-earned cell first, then a HOLLOW ring (eight cells — pairs fit along the walls, no 2×2 can
// seat until THE HEART opens the centre), then the shelves widen, the heart
// opens, the corners close the case. Sealed cells draw dim with the rung
// that opens them, so the ladder teaches itself on the face.
//
// Every number is a dial: costs (Mortal Essence), the level roads, the
// frames themselves. Frames are authored on a 5×5 canvas; '#' opens a cell.
// ---------------------------------------------------------------------------

import { registerContainer, type ContainerDef } from '../engine/containers';
import { FEATURE, LEDGER_RELIC_FOUND } from '../meta/account';
import { ORACLE_RESCUED } from './oracle';

export const RELIQUARY_ID = 'reliquary';

export const RELIQUARY: ContainerDef = registerContainer({
  id: RELIQUARY_ID,
  label: 'Reliquary',
  glyph: '🧿',
  icon: 'relic',
  blurb: 'A case for relics. A charm, a talisman, an idol or an effigy speaks only from a seat here; carried loose in the pack it is silent.',
  accepts: { categories: ['relic'] },
  active: true,
  foundLedger: LEDGER_RELIC_FOUND,
  dropLedger: ORACLE_RESCUED,
  ladder: [
    {
      feature: FEATURE.RELIQUARY, label: 'The Reliquary', cost: 0, rewardOnly: true,
      description: 'Rescue the Oracle from the commander who ended your first life. One seat opens for a charm, and relics begin to appear. A relic wakes only when seated here.',
      cells: ['.....', '.#...', '.....', '.....', '.....'],
    },
    {
      feature: FEATURE.RELIQUARY_RING, label: 'Reliquary: The First Ring', cost: 60,
      description: 'Seven more seats open around the sealed heart, eight in all. Talismans fit along the walls and idols stand beside them.',
      cells: [
        '.....',
        '.###.',
        '.#.#.',
        '.###.',
        '.....',
      ],
    },
    {
      feature: FEATURE.RELIQUARY_SHELVES, label: 'Reliquary: Wider Shelves', cost: 140,
      reqAnyOf: [{ level: 12 }], tease: true,
      description: 'The case grows outward: twelve more seats along its outer walls, twenty in all. Talismans lie flat along the shelves, idols stand in the corners of the ring.',
      cells: [
        '.###.',
        '#...#',
        '#...#',
        '#...#',
        '.###.',
      ],
    },
    {
      feature: FEATURE.RELIQUARY_HEART, label: 'Reliquary: The Heart', cost: 260,
      reqAnyOf: [{ level: 25 }], tease: true,
      description: 'The centre of the case opens. An effigy — the 2×2 relic that carries a rare\'s full six lines — can finally seat, and every charm around it must make room.',
      cells: [
        '.....',
        '.....',
        '..#..',
        '.....',
        '.....',
      ],
    },
    {
      feature: FEATURE.RELIQUARY_CASE, label: 'Reliquary: The Full Case', cost: 420,
      reqAnyOf: [{ level: 40 }], tease: true,
      description: 'The four corners close the case: twenty-five seats, a solid five-by-five. Every footprint fits somewhere now; the puzzle is only what you choose to carry.',
      cells: [
        '#...#',
        '.....',
        '.....',
        '.....',
        '#...#',
      ],
    },
  ],
});

/** Every authored container, in ladder order — the list the Vault, the
 *  menu, the inventory face and the World's fold all read (importing this
 *  list is also what REGISTERS the rows: no bare side-effect imports). */
export const CONTAINER_DEFS: readonly ContainerDef[] = [RELIQUARY];
