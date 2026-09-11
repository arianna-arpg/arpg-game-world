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
import { autoPlace, bagBoardFor, bagHeight, canPlaceAt, registerBagExpansion, swapBlockerFits } from '../src/engine/inventory';
import { ITEM_CFG } from '../src/engine/items';
import { BAG_SORT_MODES, bagContentKey, bagFootprint, bagKindRank, bagRarityRank, sortBagItems } from '../src/engine/bagsort';
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

{
  // THE DIRECTION: 'asc' mirrors the order's face — Space leads with the
  // smallest footprint, Rarity with the commonest — and still packs whole
  // and deterministically.
  const bag = mixedBag();
  const n = bag.length;
  const ok = sortBagItems(bag, 'space', undefined, 'asc');
  const minArea = Math.min(...bag.map(i => bagFootprint(i).area));
  check('sort space asc: lands whole and leads with the smallest footprint',
    ok && overlaps(bag) === 0 && bag.length === n && bagFootprint(rowMajorFirst(bag)).area === minArea);
  const once = layout(bag);
  sortBagItems(bag, 'space', undefined, 'asc');
  check('sort space asc: deterministic', layout(bag) === once);
  const bag2 = mixedBag();
  sortBagItems(bag2, 'rarity', undefined, 'asc');
  const minR = Math.min(...bag2.map(bagRarityRank));
  check('sort rarity asc: leads with the commonest', overlaps(bag2) === 0 && bagRarityRank(rowMajorFirst(bag2)) === minR);
}

{
  // THE HOLES' VETO: an ascending pack that tetrises itself out (small
  // pieces seated first leave no hole for the big one) is rescued by
  // fronting the vetoed piece — never a dead press where the hand's own
  // arrangement fit. Board 4×2: a 1×1, a 2×1 and a 2×2 (7 of 8 cells);
  // strict asc seats the 1×1 at 0,0 and the 2×1 at 1,0 — the 2×2 finds no
  // 2×2 hole — so the 2×2 fronts and everything lands.
  const baseOfSize = (w: number, h: number): string | undefined =>
    bases.find(b => { const s = sizeOf(b.id); return s.w === w && s.h === h; })?.id;
  const b11 = baseOfSize(1, 1), b21 = baseOfSize(2, 1), b22 = baseOfSize(2, 2);
  if (b11 && b21 && b22) {
    const board = { w: 4, h: 2 };
    const big = mk(b22, 0, 0), one = mk(b11, 2, 0), two = mk(b21, 2, 1);
    const bag = [big, one, two];
    const strictAscFails = (() => {
      // the same order, hand-simulated: 1×1 at 0,0 · 2×1 at 1,0 · the 2×2 finds no hole
      const probe = [mk(b11, 0, 0), mk(b21, 1, 0)];
      return !canPlaceAt(probe, mk(b22), 0, 0) && !canPlaceAt(probe, mk(b22), 1, 0) && !canPlaceAt(probe, mk(b22), 2, 0);
    })();
    const ok = sortBagItems(bag, 'space', board, 'asc');
    check('veto: the strict ascending order really cannot seat the 2×2 on a 4×2 board', strictAscFails);
    check('veto: the sort still lands whole (the vetoed 2×2 fronted, the rest ascending)',
      ok && overlaps(bag) === 0 && bag.every(i => i.x !== undefined) && bag.length === 3);
  } else {
    console.log('SKIP  veto: the base registry holds no 1×1 / 2×1 / 2×2 trio to stage the board');
  }
}

// --- THE KEEPER'S MARK HOLDS (her ruling: a lock LOCKS) ---------------------

{
  // A locked piece keeps its cell through EVERY mode and direction; the
  // free pieces pack around it.
  for (const mode of BAG_SORT_MODES) for (const dir of ['desc', 'asc'] as const) {
    const bag = mixedBag();
    const pinned = bag[Math.min(2, bag.length - 1)];
    pinned.locked = true;
    const at = { x: pinned.x!, y: pinned.y! };
    const ok = sortBagItems(bag, mode.id, undefined, dir);
    check(`lock: ${mode.id} ${dir} keeps the locked piece at ${at.x},${at.y} and packs whole around it`,
      ok && pinned.x === at.x && pinned.y === at.y && overlaps(bag) === 0 && bag.every(i => i.x !== undefined));
  }
}

{
  // The drop refuses a locked thing, bag or worn — the piece stays where it is.
  const w = makeSimWorld('warrior', 0x10c4);
  w.loadZone(START_ZONE);
  const m = w.localSeat.meta;
  m.items.length = 0;
  for (const i of mixedBag()) m.items.push(i);
  const bagPiece = m.items[0];
  bagPiece.locked = true;
  const n = m.items.length;
  w.dropGearFromBag(w.localSeat, bagPiece.uid);
  check('lock: a locked bag piece refuses the drop (still in the bag)', m.items.length === n && m.items.includes(bagPiece));
  delete bagPiece.locked;
  w.dropGearFromBag(w.localSeat, bagPiece.uid);
  check('lock: unlocked, the same piece drops', m.items.length === n - 1 && !m.items.includes(bagPiece));
  // worn: wear a piece, lock it, try to drop it off the body
  const wearable = m.items.find(i => { const b = ITEM_BASES[i.baseId]; return b && ['helmet', 'chest', 'gloves', 'boots', 'legs', 'belt', 'amulet', 'ring'].includes(b.category); });
  if (wearable) {
    w.applyAction(w.localSeat, { t: 'equipItem', uid: wearable.uid });
    const slot = Object.keys(m.equipped).find(s => m.equipped[s]?.uid === wearable.uid);
    if (slot) {
      m.equipped[slot]!.locked = true;
      w.dropGearFromBag(w.localSeat, wearable.uid);
      check('lock: a locked WORN piece refuses the drop (still worn)', m.equipped[slot]?.uid === wearable.uid);
    } else console.log('SKIP  lock worn: the piece did not equip (level gate) — the bag pin stands');
  }
}

// --- THE BAG BOARD (the grid is derived, the expansion is a rung) ----------

{
  const base = { w: ITEM_CFG.inventory.w, h: ITEM_CFG.inventory.h };
  const bare = bagBoardFor(new Set());
  check('board: no expansions owned = the base', bare.w === base.w && bare.h === base.h);
  registerBagExpansion({ feature: 'probe_bag_rows', rows: 2 });
  const grown = bagBoardFor(new Set(['probe_bag_rows']));
  check('board: an owned rung adds its rows', grown.w === base.w && grown.h === base.h + 2);
  check('board: the rails hold', bagBoardFor(new Set(['probe_bag_rows'])).h <= 12);
  // the World's installed source folds the ACCOUNT lazily — a feature gained
  // mid-run grows the next placement's board without a re-install
  const w = makeSimWorld('warrior', 0xb0a7d);
  w.loadZone(START_ZONE);
  const m = w.localSeat.meta;
  m.items.length = 0;
  const probe = mk(small);
  check('board: before the rung, the row past the base is off the board', !canPlaceAt(m.items, probe, 0, base.h) && bagHeight() === base.h);
  w.account.features.add('probe_bag_rows');
  check('board: with the rung owned, the bag is two rows taller and the new row takes a piece',
    bagHeight() === base.h + 2 && canPlaceAt(m.items, probe, 0, base.h) && autoPlace(m.items, probe) && probe.x !== undefined);
  w.account.features.delete('probe_bag_rows');
  check('board: the rung revoked, the board is the base again', bagHeight() === base.h);
}

// --- THE INTENT -----------------------------------------------------------

// Interleaved acquisition must not split duplicates in ANY mode/direction.
// Different levels, rarities and rolled chassis are deliberately mixed in.
for (const mode of BAG_SORT_MODES) for (const dir of ['asc', 'desc'] as const) {
  const bag: ItemInstance[] = [];
  const board = { w: 12, h: 6 };
  for (let n = 0; n < 5; n++) {
    const skill = mk('skill_gem');
    skill.gem = { kind: 'skill', skillId: 'cleave', level: 1, rarity: 'common', sockets: [null] };
    const other = mk('skill_gem');
    other.gem = { kind: 'skill', skillId: n % 2 ? 'cleave' : 'fireball', level: 2, rarity: 'magic', sockets: [null] };
    const support = mk('support_gem');
    support.gem = { kind: 'support', supportId: 'chassis', level: 1, rolled: n % 2 ? { b: 'y', a: 'x' } : { a: 'x', b: 'y' } };
    const otherSupport = mk('support_gem');
    otherSupport.gem = { kind: 'support', supportId: 'chassis', level: 1, rolled: { a: 'z', b: 'y' } };
    const gear = mk(small);
    for (const item of [skill, other, support, otherSupport, gear]) autoPlace(bag, item, board);
  }
  check(`duplicates ${mode.id} ${dir}: sort fits`, sortBagItems(bag, mode.id, board, dir));
  const rows = [...bag].sort((a, b) => a.y! - b.y! || a.x! - b.x!);
  const seen = new Set<string>();
  let previous = '', contiguous = true;
  for (const item of rows) {
    const key = bagContentKey(item);
    if (key !== previous && seen.has(key)) contiguous = false;
    seen.add(key); previous = key;
  }
  check(`duplicates ${mode.id} ${dir}: identical gear, skills and rolled supports are adjacent`, contiguous);
  const once = layout(bag);
  sortBagItems(bag, mode.id, board, dir);
  check(`duplicates ${mode.id} ${dir}: repeat is stable and every item survives`,
    layout(bag) === once && bag.length === 25 && overlaps(bag) === 0);
}

{
  const a = mk('support_gem', 0, 0), b = mk('support_gem', 1, 0);
  a.gem = { kind: 'support', supportId: 'chassis', level: 1, rolled: { a: 'x', b: 'y' } };
  b.gem = { kind: 'support', supportId: 'chassis', level: 1, rolled: { b: 'y', a: 'x' } };
  b.locked = true;
  check('content identity ignores uid, position, lock and object insertion order', bagContentKey(a) === bagContentKey(b));
  b.gem.rolled!.a = 'z';
  check('content identity preserves differing gameplay rolls', bagContentKey(a) !== bagContentKey(b));
}

for (const mode of BAG_SORT_MODES) for (const dir of ['asc', 'desc'] as const) {
  // Isolated one-cell holes above tall equipment used to split five Cleaves
  // even though a full row was free below. The locked gem must stay pinned.
  const bag: ItemInstance[] = [];
  const board = { w: 12, h: 6 };
  const pin = mk('support_gem', 2, 0);
  pin.gem = { kind: 'support', supportId: 'pinned', level: 1 };
  pin.locked = true; bag.push(pin);
  for (const cat of ['helmet', 'chest', 'legs', 'boots', 'ring']) {
    autoPlace(bag, mk(bases.find(b => b.category === cat)!.id), board);
  }
  const copies: ItemInstance[] = [];
  for (let n = 0; n < 5; n++) {
    const gem = mk('skill_gem');
    gem.gem = { kind: 'skill', skillId: 'cleave', level: 1, rarity: 'common', sockets: [null] };
    copies.push(gem); autoPlace(bag, gem, board);
    const other = mk('skill_gem');
    other.gem = { kind: 'skill', skillId: 'fireball', level: 1, rarity: 'magic', sockets: [null] };
    autoPlace(bag, other, board);
  }
  check(`blocks ${mode.id} ${dir}: mixed bag fits`, sortBagItems(bag, mode.id, board, dir));
  const xs = copies.map(i => i.x!).sort((a, b) => a - b);
  check(`blocks ${mode.id} ${dir}: five Cleaves sit side by side despite equipment holes`,
    copies.every(i => i.y === copies[0].y) && xs.every((x, n) => x === xs[0] + n));
  check(`blocks ${mode.id} ${dir}: pin stays and items never overlap`, pin.x === 2 && pin.y === 0 && overlaps(bag) === 0);
}

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
