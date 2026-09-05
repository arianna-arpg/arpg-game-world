// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE BAG GRID'S LAWS (engine/inventory.ts swapBlockerFits,
// engine/bagsort.ts sortBagItems + BAG_SORT_MODES, engine/world.ts
// sortBag / the sortBag intent). Pins:
//   - THE SWAP TEST (swapBlockerFits — the ONE verdict the bag's landing
//     preview paints and moveBagItem reads): exactly one blocker that fits
//     the mover's vacated spot swaps; a blocker that cannot retreat, two
//     blockers, an off-board origin, a clean spot and an unplaced mover all
//     answer null.
//   - THE BAG SORT: every registered mode re-packs a mixed bag with no
//     overlap, no piece lost, every piece placed, and a DETERMINISTIC layout
//     (sorting twice is byte-identical); Space leads row-major with the
//     largest footprint, Rarity with the rarest, Type with the doll's first
//     kind; a pack that cannot fit (a board too small) REVERTS every
//     position; an unknown mode is inert.
//   - THE INTENT: World.sortBag / applyAction('sortBag') land the same
//     re-pack on the seat's bag.
// Run: npx tsx balance/probe_bagsort.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { START_ZONE } from '../src/data/zones';
import { rollItem, itemGridSize } from '../src/engine/itemgen';
import { autoPlace, canPlaceAt, swapBlockerFits } from '../src/engine/inventory';
import { BAG_SORT_MODES, bagFootprint, bagKindRank, bagRarityRank, sortBagItems } from '../src/engine/bagsort';
import { ITEM_BASES } from '../src/data/itembases';
import type { ItemInstance, ItemRarity } from '../src/engine/items';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xba6);

// --- fixtures ------------------------------------------------------------

let nextUid = 1;
const mk = (baseId: string, x?: number, y?: number, rarity: ItemRarity = 'common'): ItemInstance =>
  ({ uid: nextUid++, baseId, ilvl: 1, tier: 1, rarity, name: baseId, baseRoll: 0, implicitRolls: [], affixes: [], x, y } as ItemInstance);
const sizeOf = (baseId: string) => itemGridSize(mk(baseId));
const bases = Object.values(ITEM_BASES);
const small = bases.find(b => { const s = sizeOf(b.id); return s.w === 1 && s.h === 1; })!.id;
const tall = bases.find(b => { const s = sizeOf(b.id); return s.h >= 2; })!.id;
const wide = bases.find(b => { const s = sizeOf(b.id); return s.w >= 2; })!.id;

const overlaps = (bag: readonly ItemInstance[]): number => {
  let n = 0;
  for (let i = 0; i < bag.length; i++) for (let j = i + 1; j < bag.length; j++) {
    const a = bag[i], b = bag[j];
    if (a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined) continue;
    const sa = itemGridSize(a), sb = itemGridSize(b);
    if (a.x < b.x + sb.w && b.x < a.x + sa.w && a.y < b.y + sb.h && b.y < a.y + sa.h) n++;
  }
  return n;
};
const layout = (bag: readonly ItemInstance[]): string =>
  [...bag].sort((a, b) => a.uid - b.uid).map(i => `${i.uid}@${i.x},${i.y}`).join(' ');
const rowMajorFirst = (bag: readonly ItemInstance[]): ItemInstance =>
  [...bag].sort((a, b) => (a.y! - b.y!) || (a.x! - b.x!))[0];

// --- THE SWAP TEST --------------------------------------------------------

{
  const a = mk(small, 0, 0), b = mk(small, 3, 3);
  check('swap: one 1×1 blocker that fits the vacated spot swaps', swapBlockerFits([a, b], a, 3, 3)?.uid === b.uid);
}
{
  const st = sizeOf(tall);
  const a = mk(small, 0, 0), b = mk(tall, 3, 3), c = mk(small, 0, 1), d = mk(small, 1, 0);
  check(`swap: a ${st.w}×${st.h} blocker that cannot retreat into the 1×1 hole refuses`, swapBlockerFits([a, b, c, d], a, 3, 3) === null);
}
{
  const sw = sizeOf(wide);
  const a = mk(wide, 0, 0), b = mk(small, 4, 4), c = mk(small, 5, 4);
  check(`swap: a ${sw.w}-wide mover over two blockers refuses`, swapBlockerFits([a, b, c], a, 4, 4) === null);
}
{
  const a = mk(small, 0, 0), b = mk(small, 3, 3);
  check('swap: an off-board origin refuses', swapBlockerFits([a, b], a, -1, 3) === null);
  check('swap: a clean spot is not a swap (and places)', swapBlockerFits([a, b], a, 5, 5) === null && canPlaceAt([a, b], a, 5, 5));
}
{
  const a = mk(small), b = mk(small, 3, 3);
  check('swap: an unplaced mover (off the doll) never swaps', swapBlockerFits([a, b], a, 3, 3) === null);
}

// --- THE BAG SORT ---------------------------------------------------------

/** A mixed bag: rolled gear of every rarity and footprint, first-fit placed
 *  in ROLL order (the hand's arbitrary arrangement the sort re-packs). */
const mixedBag = (): ItemInstance[] => {
  const bag: ItemInstance[] = [];
  const want: ItemRarity[] = ['common', 'magic', 'rare', 'unique', 'common', 'magic', 'rare', 'common', 'magic', 'common'];
  for (const rarity of want) {
    let item: ItemInstance | null = null;
    for (let tries = 0; tries < 60 && !item; tries++) item = rollItem({ ilvl: 8, rarity });
    if (!item) continue;
    item.uid = nextUid++;
    delete item.x; delete item.y;
    if (!autoPlace(bag, item)) break; // the bag is only so big — enough pieces is enough
  }
  return bag;
};

for (const mode of BAG_SORT_MODES) {
  const bag = mixedBag();
  const n = bag.length;
  const ok = sortBagItems(bag, mode.id);
  const placed = bag.every(i => i.x !== undefined && i.y !== undefined);
  check(`sort ${mode.id}: lands (${n} pieces), every piece placed, no overlap, none lost`,
    ok && placed && overlaps(bag) === 0 && bag.length === n, `overlaps=${overlaps(bag)} placed=${placed}`);
  const once = layout(bag);
  sortBagItems(bag, mode.id);
  check(`sort ${mode.id}: deterministic (sorting twice is byte-identical)`, layout(bag) === once);
  const first = rowMajorFirst(bag);
  if (mode.id === 'space') {
    const maxArea = Math.max(...bag.map(i => bagFootprint(i).area));
    check('sort space: the first piece row-major carries the largest footprint', bagFootprint(first).area === maxArea);
  }
  if (mode.id === 'rarity') {
    const maxR = Math.max(...bag.map(bagRarityRank));
    check('sort rarity: the first piece row-major is the rarest', bagRarityRank(first) === maxR);
  }
  if (mode.id === 'type') {
    const minK = Math.min(...bag.map(bagKindRank));
    check('sort type: the first piece row-major wears the doll\'s first kind', bagKindRank(first) === minK);
  }
}

{
  // ALL OR NOTHING: a board too small to hold the pieces refuses and leaves
  // every position exactly as it was.
  const bag = mixedBag();
  const before = layout(bag);
  const ok = sortBagItems(bag, 'space', { w: 1, h: 1 });
  check('sort: a pack that cannot fit refuses and reverts every position', !ok && layout(bag) === before);
  check('sort: an unknown mode is inert', !sortBagItems(bag, 'no_such_mode') && layout(bag) === before);
  check('sort: an empty bag is inert', !sortBagItems([], 'space'));
}

// --- THE INTENT -----------------------------------------------------------

{
  const w = makeSimWorld('warrior', 0xba6);
  w.loadZone(START_ZONE);
  const m = w.localSeat.meta;
  m.items.length = 0;
  for (const i of mixedBag()) m.items.push(i);
  const n = m.items.length;
  const before = layout(m.items);
  w.applyAction(w.localSeat, { t: 'sortBag', mode: 'rarity' });
  const rarest = Math.max(...m.items.map(bagRarityRank));
  check('intent: applyAction sortBag re-packs the seat\'s bag by rarity',
    m.items.length === n && overlaps(m.items) === 0 && bagRarityRank(rowMajorFirst(m.items)) === rarest && layout(m.items) !== before || n < 2);
  const sorted = layout(m.items);
  w.sortBag(w.localSeat, 'no_such_mode');
  check('intent: an unknown mode leaves the bag exactly as it was', layout(m.items) === sorted);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
