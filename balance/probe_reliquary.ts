// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CONTAINER FABRIC + THE RELIQUARY (engine/containers.ts,
// data/containers.ts, data/itembases.ts relic families, data/itemaffixes.ts
// THE RELIC REGISTER, engine/inventory.ts THE MASK, World.containerPlace /
// containerTake / containerMove / reconcileContainers, meta/unlocks.ts the
// derived rows, meta/character.ts + net/snapshot.ts + meta/death.ts the
// carry). Pins:
//   - THE MASK FOLD: no rung 0 = no board; quest rung 0 = one cell;
//     the first paid expansion = the hollow ring (8 seats,
//     centre sealed); the ladder grows monotonically to the full 5×5; the
//     centre opens with THE HEART and a corner with THE FULL CASE
//     (containerRungAt — the sealed cell's own tell); pack/unpack round-trips.
//   - THE CELL LAW: a footprint lands only on open cells — no effigy seats on
//     the ring, one seats once the heart opens; first-fit walks open cells
//     only; a mask-less board is the plain bounds test (byte-identical bag).
//   - THE REGISTER + THE ROLLER: 'relic' is a container-carried category;
//     four families, magic-floored, explicit-pool, footprint-capped; relic
//     bases roll the register and NOTHING else, armour never rolls a relic
//     word; every register stat is known; no relic ever drops common; the
//     caps hold on every roll; relics enter the open world pool at their
//     share; the relic cache pays relics.
//   - THE FOLD: a seated charm's line lands on the sheet, leaves when
//     unseated, is inert in the bag; aimed seats refuse sealed cells and
//     land on open ones; containerMove obeys the mask; non-relics, over-
//     level pieces and a full board are refused; the bag↔board swap law;
//     a seated piece drops to the ground and sheds its line; the lock
//     holds; a misfit reconciles to the bag; an unowned board folds nothing.
//   - PERSISTENCE: save/rebuild, wire/adopt, and the corpse all carry the
//     seated pieces (seat cells stripped on the corpse).
//   - THE VAULT: one derived row per purchasable rung; the case comes from
//     its quest; each expansion requires the last; the board grows with the buy;
//     the level roads register their milestones.
//   - DISCOVERY: a genuine world mint stamps the account; a discard never.
//   - THE KIND LADDER + THE LOOKUPS: relics sort after the doll's kinds and
//     before gems; findCarried / containerOriginOf / containerFor speak.
// Run: npx tsx balance/probe_reliquary.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { RELIQUARY, RELIQUARY_ID } from '../src/data/containers';
import {
  boardDims, boardOpenAt, containerAccepts, containerBoard, containerBoardFor, containerCanvas, containerFor,
  containerFullBoard, containerLanding, containerMisfits, containerOriginOf, containerRungAt, containerSeatRefusal,
  findCarried, packContainerBoard, unpackContainerBoard,
} from '../src/engine/containers';
import { autoPlace, bagBoard, canPlaceAt, footprintOpen, placeAt } from '../src/engine/inventory';
import { affixCapsFor, affixPoolsFor, compileItemMods, describeItem, forgeItem, isKnownItemStat, itemLevelReq, rollItem } from '../src/engine/itemgen';
import { ITEM_BASES } from '../src/data/itembases';
import { ITEM_AFFIXES, RELIC_AFFIXES } from '../src/data/itemaffixes';
import { CONTAINER_CATEGORIES, isCarriableCategory, type ItemInstance } from '../src/engine/items';
import { FEATURE, LEDGER_RELIC_FOUND, makeAccount, reachedLevelKey } from '../src/meta/account';
import { UNLOCK_CATALOG, applyUnlock, catalogLevelMilestones, isUnlockVisible } from '../src/meta/unlocks';
import { rebuildSavedMeta, serializeCharacter } from '../src/meta/character';
import { applySeatMeta, serializeSeatMeta } from '../src/net/snapshot';
import { captureLoot } from '../src/meta/death';
import { bagKindRank } from '../src/engine/bagsort';
import { resolveLootTable } from '../src/engine/loot';
import { CLASSES } from '../src/data/classes';
import { Q_RELIQUARY, RELIQUARY_LESSON, resolveQuestZone } from '../src/quests/reliquary';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import type { QuestDef } from '../src/quests/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5e11c);

/** A tiny seeded stream for the roller (the harness's determinism law). */
const lcg = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};

const R = RELIQUARY;
const rungs = R.ladder.slice(1); // purchasable expansions, after the quest's one cell
const feats = (n: number): Set<string> => new Set([FEATURE.RELIQUARY, ...rungs.slice(0, n).map(r => r.feature)]);
let uidSeq = 900000;
const mk = (baseId: string, x?: number, y?: number): ItemInstance =>
  ({ uid: uidSeq++, baseId, ilvl: 1, tier: 1, rarity: 'magic', name: baseId, baseRoll: 0, implicitRolls: [], affixes: [], x, y } as ItemInstance);

// ------------------------------------------------------ A. THE MASK FOLD
check('A1 no rung 0 → no board', containerBoardFor(R, new Set()) === null);
check('A1b a later rung alone (rung 0 unowned) → no board', containerBoardFor(R, new Set([rungs[1].feature])) === null);
const b1 = containerBoardFor(R, feats(1))!;
check('A2 the first expansion opens the hollow ring: 8 seats, centre sealed',
  !!b1 && b1.cells === 8 && !boardOpenAt(b1, 2, 2) && boardOpenAt(b1, 1, 1) && boardOpenAt(b1, 3, 3) && !boardOpenAt(b1, 0, 0));
const counts = [1, 2, 3, 4].map(n => containerBoardFor(R, feats(n))!.cells);
check('A2b the quest starts with exactly one usable charm cell', containerBoardFor(R, feats(0))?.cells === 1
  && canPlaceAt([], mk('relic_charm'), 1, 1, boardDims(containerBoardFor(R, feats(0))!))
  && !canPlaceAt([], mk('relic_talisman'), 1, 1, boardDims(containerBoardFor(R, feats(0))!)));
check('A3 the ladder grows monotonically', counts.every((c, i) => i === 0 || c > counts[i - 1]), counts.join(' → '));
const full = containerFullBoard(R);
check('A4 the full case is the union of every rung (5×5 = 25)', full.cells === 25 && full.cells === counts[3]);
check('A5 the centre opens with THE HEART',
  containerRungAt(R, 2, 2)?.feature === FEATURE.RELIQUARY_HEART
  && !boardOpenAt(containerBoardFor(R, feats(2))!, 2, 2) && boardOpenAt(containerBoardFor(R, feats(3))!, 2, 2));
check('A6 a corner opens with THE FULL CASE', containerRungAt(R, 0, 0)?.feature === FEATURE.RELIQUARY_CASE);
check('A7 the canvas is the union extent (5×5)', containerCanvas(R).w === 5 && containerCanvas(R).h === 5);
const un = unpackContainerBoard(packContainerBoard(b1));
check('A8 pack/unpack round-trips the board', un.w === b1.w && un.h === b1.h && un.cells === b1.cells && un.open.every((o, i) => o === b1.open[i]));
check('A9 out-of-bounds reads closed', !boardOpenAt(b1, -1, 0) && !boardOpenAt(b1, 5, 5));

// ------------------------------------------------------- B. THE CELL LAW
const dims1 = boardDims(b1);
check('B1 a charm seats on an open ring cell', canPlaceAt([], mk('relic_charm'), 1, 1, dims1));
check('B2 a charm refuses the sealed centre', !canPlaceAt([], mk('relic_charm'), 2, 2, dims1));
check('B3 a talisman lies along the wall', canPlaceAt([], mk('relic_talisman'), 1, 1, dims1) && canPlaceAt([], mk('relic_talisman'), 2, 3, dims1));
check('B3b a talisman refuses a wall it would cross the centre on', !canPlaceAt([], mk('relic_talisman'), 1, 2, dims1));
let effigyAnywhere = false;
for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) if (canPlaceAt([], mk('relic_effigy'), x, y, dims1)) effigyAnywhere = true;
check('B4 no effigy seats anywhere on the ring', !effigyAnywhere);
check('B5 the effigy seats once THE HEART opens', canPlaceAt([], mk('relic_effigy'), 1, 1, boardDims(containerBoardFor(R, feats(3))!)));
{
  const held: ItemInstance[] = [];
  let n = 0;
  while (n < 20 && autoPlace(held, mk('relic_charm'), dims1)) n++;
  check('B6 first-fit fills exactly the 8 open cells, all open', n === 8 && held.every(i => boardOpenAt(b1, i.x!, i.y!)));
}
check('B7 footprintOpen without a mask is the plain bounds test',
  footprintOpen({ w: 3, h: 3 }, 2, 2, 1, 1) && !footprintOpen({ w: 3, h: 3 }, 3, 0, 1, 1) && !footprintOpen({ w: 3, h: 3 }, 2, 2, 2, 1));

// ------------------------------------------- C. THE REGISTER + THE ROLLER
check('C1 relic is a container-carried category (slotless carry)', CONTAINER_CATEGORIES.has('relic') && isCarriableCategory('relic'));
const relicBases = Object.values(ITEM_BASES).filter(b => b.category === 'relic');
check('C2 four relic families, magic-floored, explicit-pool, footprint-capped',
  relicBases.length === 4 && relicBases.every(b => b.minRarity === 'magic' && b.affixPool === 'explicit' && !!b.affixCap && b.dropWeight > 0));
check('C3 every relic family rolls the register and nothing else',
  relicBases.every(b => {
    const p = affixPoolsFor(b);
    return p.prefix.length > 0 && p.suffix.length > 0 && [...p.prefix, ...p.suffix].every(a => a.tags?.includes('relic'));
  }));
check('C4 the register names the relic tag and only known stats',
  RELIC_AFFIXES.length >= 30 && RELIC_AFFIXES.every(a => a.tags?.includes('relic') && a.lines.every(l => isKnownItemStat(l.stat))));
check('C5 no armour or jewel ever rolls a relic word',
  !Object.values(ITEM_BASES).filter(b => b.category !== 'relic').some(b => {
    const p = affixPoolsFor(b);
    return [...p.prefix, ...p.suffix].some(a => a.id.startsWith('relic_'));
  }));
check('C5b the wardrobe still rolls its catch-all families on open bases',
  affixPoolsFor(ITEM_BASES.ring_coral).suffix.some(a => !a.tags));
{
  const rng = lcg(0xc0ffee);
  let neverCommon = true, capOk = true, rolled = 0;
  for (const base of relicBases) {
    const caps = { magic: affixCapsFor(base, 'magic'), rare: affixCapsFor(base, 'rare') };
    for (let i = 0; i < 300; i++) {
      const it = rollItem({ ilvl: 20, rng, baseId: base.id });
      if (!it) continue;
      rolled++;
      if (it.rarity === 'common') neverCommon = false;
      if (it.rarity === 'magic' || it.rarity === 'rare') {
        const pre = it.affixes.filter(a => ITEM_AFFIXES[a.id]?.kind === 'prefix').length;
        const suf = it.affixes.filter(a => ITEM_AFFIXES[a.id]?.kind === 'suffix').length;
        const cap = caps[it.rarity];
        if (pre > cap.prefixes || suf > cap.suffixes) capOk = false;
      }
    }
  }
  check('C6 a relic never drops common (THE RARITY FLOOR)', neverCommon && rolled === 1200, `${rolled} rolls`);
  check('C7 the footprint caps hold on every roll', capOk);
  const rareCharm = forgeItem({ ilvl: 20, baseId: 'relic_charm', rarity: 'rare', fillRandom: true, rng })!;
  check('C8 a rare charm carries at most one line each way (the forge honors the cap)',
    !!rareCharm && rareCharm.affixes.length <= 2);
  const rareEffigy = forgeItem({ ilvl: 20, baseId: 'relic_effigy', rarity: 'rare', fillRandom: true, rng })!;
  check('C8b a rare effigy fills the rarity\'s full six', !!rareEffigy && rareEffigy.affixes.length === 6);
  let relics = 0, total = 0;
  for (let i = 0; i < 4000; i++) {
    const it = rollItem({ ilvl: 12, rng });
    if (!it) continue;
    total++;
    if (ITEM_BASES[it.baseId]?.category === 'relic') relics++;
  }
  check('C9 relics enter the open world pool at a find\'s share (0.3%–10%)', relics > total * 0.003 && relics < total * 0.1, `${relics}/${total}`);
  const cache = resolveLootTable('relic_cache', { ilvl: 12, rng });
  check('C10 the relic cache pays a relic', cache.length === 1 && cache[0].kind === 'item' && ITEM_BASES[cache[0].item.baseId]?.category === 'relic');
  const charm = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
  const d = describeItem(charm);
  check('C11 describeItem speaks the register\'s line', d.affix.length === 1 && /Maximum Life/.test(d.affix[0].text) && /relic/.test(d.baseLine));
}

// -------------------------------------------------------- D. THE FOLD
const world = makeSimWorld(CLASSES[0].id, 11);
const seat = world.localSeat;
const hero = world.player;
world.account.features.add(FEATURE.RELIQUARY);
world.account.features.add(FEATURE.RELIQUARY_RING);
check('D1 the board exists once rung 0 is owned', containerBoard(R)?.cells === 8);
const charm = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
const lifeLine = compileItemMods(charm).find(m => m.stat === 'life')!.value;
autoPlace(seat.meta.items, charm);
world.recalcSeat(seat);
const lifeBase = hero.sheet.get('life');
check('D1b a relic in the bag is inert', lifeLine > 0 && Math.abs(hero.sheet.get('life') - lifeBase) < 1e-6);
world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: charm.uid });
check('D2 containerPlace seats the charm (first open fit)', findCarried(seat.meta, charm.uid)?.where.kind === 'container' && boardOpenAt(b1, charm.x!, charm.y!));
check('D3 the seated charm\'s life folds into the sheet', Math.abs(hero.sheet.get('life') - lifeBase - lifeLine) < 0.01,
  `+${lifeLine} → ${hero.sheet.get('life') - lifeBase}`);
world.applyAction(seat, { t: 'containerTake', container: RELIQUARY_ID, uid: charm.uid });
check('D4 containerTake returns it to the bag and the line leaves',
  findCarried(seat.meta, charm.uid)?.where.kind === 'bag' && Math.abs(hero.sheet.get('life') - lifeBase) < 1e-6);
world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: charm.uid, x: 2, y: 2 });
check('D5 an aimed seat on the sealed centre is refused', findCarried(seat.meta, charm.uid)?.where.kind === 'bag');
world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: charm.uid, x: 1, y: 1 });
check('D6 an aimed seat on an open cell lands there', findCarried(seat.meta, charm.uid)?.where.kind === 'container' && charm.x === 1 && charm.y === 1);
world.applyAction(seat, { t: 'containerMove', container: RELIQUARY_ID, uid: charm.uid, x: 3, y: 3 });
check('D7 containerMove re-places on an open cell', charm.x === 3 && charm.y === 3);
world.applyAction(seat, { t: 'containerMove', container: RELIQUARY_ID, uid: charm.uid, x: 2, y: 2 });
check('D8 containerMove refuses the sealed centre', charm.x === 3 && charm.y === 3);
{
  const ring = rollItem({ ilvl: 1, category: 'ring', rng: lcg(7) })!;
  autoPlace(seat.meta.items, ring);
  world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: ring.uid });
  check('D9 a ring is refused by the reliquary', findCarried(seat.meta, ring.uid)?.where.kind === 'bag');
  const deep = forgeItem({ ilvl: 30, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
  autoPlace(seat.meta.items, deep);
  world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: deep.uid });
  check('D10 a relic above the hero\'s level is refused (the level gate)', findCarried(seat.meta, deep.uid)?.where.kind === 'bag' && hero.level < 5);
}
{
  // Fill the ring: seven more charms seat, an eighth is refused (full).
  const extras: ItemInstance[] = [];
  for (let i = 0; i < 8; i++) {
    const c = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_mana' }], quality: 1 })!;
    autoPlace(seat.meta.items, c);
    extras.push(c);
    world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: c.uid });
  }
  const seated = extras.filter(c => findCarried(seat.meta, c.uid)?.where.kind === 'container').length;
  check('D11 the ring holds eight; the ninth is refused', seated === 7 && seat.meta.containers[RELIQUARY_ID].length === 8);
  check('D11b every seated piece stands on an open cell, none overlapping', containerMisfits(containerBoard(R), seat.meta.containers[RELIQUARY_ID]).length === 0);
  // THE SWAP LAW: an aimed seat over exactly one blocker trades places —
  // the blocker takes the mover's vacated bag cell.
  const mover = extras.find(c => findCarried(seat.meta, c.uid)?.where.kind === 'bag')!;
  const blocker = seat.meta.containers[RELIQUARY_ID].find(c => c.uid !== charm.uid)!;
  const bagCell = { x: mover.x!, y: mover.y! };
  const bx = blocker.x!, by = blocker.y!;
  const verdict = containerLanding(R, containerBoard(R), seat.meta.containers[RELIQUARY_ID], mover, 'bag', bx, by, hero.level, seat.meta.items, bagBoard());
  check('D12 the landing law reads the swap', verdict.verdict === 'swap' && verdict.with?.uid === blocker.uid);
  world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: mover.uid, x: bx, y: by });
  check('D12b the swap lands: mover seated where the blocker stood, blocker in the mover\'s bag cell',
    mover.x === bx && mover.y === by && findCarried(seat.meta, mover.uid)?.where.kind === 'container'
    && findCarried(seat.meta, blocker.uid)?.where.kind === 'bag' && blocker.x === bagCell.x && blocker.y === bagCell.y);
  // Drop a seated piece to the ground: it leaves the board and the sheet.
  const before = hero.sheet.get('life');
  const drops = world.drops.length;
  world.applyAction(seat, { t: 'dropItem', uid: charm.uid });
  check('D13 a seated piece dropped to the world leaves the board and sheds its line',
    !findCarried(seat.meta, charm.uid) && world.drops.length === drops + 1 && Math.abs(hero.sheet.get('life') - (before - lifeLine)) < 0.01);
  // THE KEEPER'S MARK holds on a seated piece.
  world.applyAction(seat, { t: 'salvageLock', uid: mover.uid, on: true });
  world.applyAction(seat, { t: 'dropItem', uid: mover.uid });
  check('D14 the lock holds: a locked seated piece never leaves', mover.locked === true && findCarried(seat.meta, mover.uid)?.where.kind === 'container');
  world.applyAction(seat, { t: 'salvageLock', uid: mover.uid, on: false });
}
{
  // A misfit (a piece on the sealed centre — a retuned frame, a lost rung)
  // reconciles to the bag at adoption; nothing lost.
  const ghost = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_es' }], quality: 1 })!;
  ghost.x = 2; ghost.y = 2;
  seat.meta.containers[RELIQUARY_ID].push(ghost);
  world.reconcileContainers(seat);
  check('D15 a misfit reconciles to the bag', findCarried(seat.meta, ghost.uid)?.where.kind === 'bag');
  // An unowned board folds nothing and refuses seats.
  const seatedNow = seat.meta.containers[RELIQUARY_ID].length;
  world.recalcSeat(seat);
  const withBoard = hero.sheet.get('mana');
  world.account.features.delete(FEATURE.RELIQUARY);
  world.recalcSeat(seat);
  check('D16 an unowned board folds nothing (the existence law)', seatedNow > 0 && hero.sheet.get('mana') < withBoard);
  world.applyAction(seat, { t: 'containerPlace', container: RELIQUARY_ID, uid: ghost.uid });
  check('D17 an unowned board refuses a seat', findCarried(seat.meta, ghost.uid)?.where.kind === 'bag');
  world.account.features.add(FEATURE.RELIQUARY);
  world.recalcSeat(seat);
  check('D18 re-owning the board re-folds the seated pieces', Math.abs(hero.sheet.get('mana') - withBoard) < 1e-6);
}

// ------------------------------------------------------ E. PERSISTENCE
{
  const held = seat.meta.containers[RELIQUARY_ID];
  const n = held.length;
  const first = held[0];
  const save = serializeCharacter(world);
  check('E1 the character save carries the seated pieces with their cells',
    (save.containers?.[RELIQUARY_ID]?.length ?? 0) === n && save.containers![RELIQUARY_ID][0].x === first.x);
  const rebuilt = rebuildSavedMeta(save)!;
  check('E2 the rebuild seats them again', rebuilt.meta.containers[RELIQUARY_ID].length === n
    && rebuilt.meta.containers[RELIQUARY_ID].find(i => i.uid === first.uid)?.y === first.y);
  const w = serializeSeatMeta(seat);
  check('E3 the wire ships the boards', (w.gear?.containers?.[RELIQUARY_ID]?.length ?? 0) === n);
  applySeatMeta(world, seat, w);
  check('E4 a client adopts the seated pieces and the fold stands',
    seat.meta.containers[RELIQUARY_ID].length === n && findCarried(seat.meta, first.uid)?.where.kind === 'container');
  world.recalcSeat(seat);
  const loot = captureLoot(seat.meta);
  const carried = loot.items.filter(l => l.kind === 'gear' && seat.meta.containers[RELIQUARY_ID].some(i => i.uid === l.item.uid));
  check('E5 the corpse carries the seated pieces, cells stripped',
    carried.length === n && carried.every(l => l.kind === 'gear' && l.item.x === undefined && l.item.y === undefined));
}

// ------------------------------------------------------ F. THE VAULT
{
  const rows = rungs.map(r => UNLOCK_CATALOG.find(u => u.id === `feat_${r.feature}`)!);
  check('F1 one derived Vault row per rung', rows.every(Boolean) && rows.every(u => u.kind === 'feature'));
  const acct = makeAccount();
  acct.credits = 100000;
  check('F2 the case itself has no Vault purchase', !UNLOCK_CATALOG.some(u => u.id === `feat_${FEATURE.RELIQUARY}`));
  acct.ledger[LEDGER_RELIC_FOUND] = 1;
  check('F2b finding a relic cannot bypass the quest', !isUnlockVisible(acct, rows[0]));
  check('F3 rung 1 hides until rung 0 is owned', !isUnlockVisible(acct, rows[1]));
  check('F4 no board before the buy', containerBoardFor(R, acct.features) === null);
  acct.features.add(FEATURE.RELIQUARY);
  check('F4a the quest grant opens one cell and exposes the ring upgrade', containerBoardFor(R, acct.features)?.cells === 1 && isUnlockVisible(acct, rows[0]));
  applyUnlock(acct, rows[0]);
  check('F4b the buy raises the ring', acct.features.has(FEATURE.RELIQUARY) && containerBoardFor(R, acct.features)?.cells === 8);
  check('F5 rung 1 still waits on its level road', !isUnlockVisible(acct, rows[1]));
  acct.ledger[reachedLevelKey(12)] = 1;
  check('F5b the level road opens rung 1', isUnlockVisible(acct, rows[1]));
  applyUnlock(acct, rows[1]);
  check('F5c the second buy widens the shelves', containerBoardFor(R, acct.features)?.cells === 20);
  const milestones = catalogLevelMilestones();
  check('F6 every rung\'s level road registers its milestone', [12, 25, 40].every(l => milestones.includes(l)));
}

// -------------------------------------------------------- G. DISCOVERY
{
  const w2 = makeSimWorld(CLASSES[0].id, 12);
  const relic = forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: 'relic_life' }], quality: 1 })!;
  const meta = w2.metaProgressionActive();
  w2.dropGearAt(w2.player.pos, { ...relic, uid: relic.uid + 1 }, w2.localSeat.id); // a DISCARD
  check('G1 a discard never stamps the discovery ledger', !(w2.account.ledger[LEDGER_RELIC_FOUND] ?? 0));
  w2.dropGearAt(w2.player.pos, relic); // a genuine world mint
  check('G1b ambient relics wait for the seating lesson', w2.drops.length === 1);
  w2.account.ledger[RELIQUARY_LESSON] = 1;
  w2.dropGearAt(w2.player.pos, relic);
  if (meta) check('G2 a genuine world mint stamps it once', (w2.account.ledger[LEDGER_RELIC_FOUND] ?? 0) === 1);
  else check('G2 (meta sealed in this stage) the ledger stays honest', !(w2.account.ledger[LEDGER_RELIC_FOUND] ?? 0));
  const ring = rollItem({ ilvl: 1, category: 'ring', rng: lcg(3) })!;
  const before = w2.account.ledger[LEDGER_RELIC_FOUND] ?? 0;
  w2.dropGearAt(w2.player.pos, ring);
  check('G3 a ring stamps nothing', (w2.account.ledger[LEDGER_RELIC_FOUND] ?? 0) === before);
}

// ------------------------------------- H. THE KIND LADDER + THE LOOKUPS
{
  const relic = mk('relic_charm');
  const boots = mk('boots_greaves');
  const bootsBase = Object.values(ITEM_BASES).find(b => b.category === 'boots')!;
  boots.baseId = bootsBase.id;
  const gem = { ...mk('skill_gem'), gem: { kind: 'support', supportId: 'x', level: 1 } } as ItemInstance;
  check('H1 relics sort after the doll\'s kinds and before gems',
    bagKindRank(relic) > bagKindRank(boots) && bagKindRank(relic) < bagKindRank(gem));
  const m = seat.meta;
  const seated = m.containers[RELIQUARY_ID][0];
  const bagged = m.items.find(i => ITEM_BASES[i.baseId]?.category === 'relic')!;
  check('H2 containerOriginOf speaks bag / board', containerOriginOf(m, bagged.uid) === 'bag' && containerOriginOf(m, seated.uid) === `c:${RELIQUARY_ID}`);
  check('H3 containerFor / containerAccepts', containerFor(relic)?.id === RELIQUARY_ID && containerFor(boots) === null && containerAccepts(R, relic) && !containerAccepts(R, boots));
  check('H4 the refusals speak', /not yours/.test(containerSeatRefusal(R, null, relic, 1) ?? '')
    && /does not take/.test(containerSeatRefusal(R, b1, boots, 1) ?? '') && containerSeatRefusal(R, b1, relic, 1) === null);
  const bagOnly = mk('relic_charm', 0, 0);
  const held = [mk('relic_charm', 1, 1)];
  const l = containerLanding(R, b1, held, bagOnly, 'bag', 1, 1, 1, [bagOnly], { w: 4, h: 4 });
  check('H5 a bag→board landing over one blocker swaps when the blocker fits the vacated bag cell', l.verdict === 'swap' && l.with === held[0]);
  const l2 = containerLanding(R, b1, held, bagOnly, 'bag', 2, 2, 1, [bagOnly], { w: 4, h: 4 });
  check('H6 a landing over the sealed centre is blocked', l2.verdict === 'blocked');
  check('H7 placeAt honors the mask', !placeAt([], mk('relic_charm'), 2, 2, dims1) && placeAt([], mk('relic_charm'), 1, 1, dims1));
}

// ------------------------------------------- I. QUEST → CHOICE → LESSON
{
  const variants = new Set<string>();
  for (let seed = 1; seed <= 40; seed++) {
    const z = resolveQuestZone(Q_RELIQUARY, seed);
    variants.add(z.name!);
    check(`I1.${seed} seeded site repeats and references real content`,
      JSON.stringify(z) === JSON.stringify(resolveQuestZone(Q_RELIQUARY, seed))
      && !!TILESETS[z.tileset!] && (z.objective.kind !== 'boss' || !!MONSTERS[z.objective.id])
      && z.packsOverride!.table.every(p => !!MONSTERS[p.id]));
  }
  check('I2 seeds span all authored burial sites', variants.size === Q_RELIQUARY.zoneVariants!.length);
  const w = makeSimWorld(CLASSES[0].id, 9001);
  const hooks = w as unknown as {
    acceptQuest(q: QuestDef): void;
    onQuestZoneFieldCleared(zoneId: string): void;
    onQuestZoneCleared(aq: { questId: string; zoneId: string; fieldDone: boolean }): void;
  };
  hooks.acceptQuest(Q_RELIQUARY);
  const aq = w.activeQuests.find(q => q.questId === Q_RELIQUARY.id)!;
  const zone = w.zoneMap[aq.zoneId];
  check('I3 the introduction mints a named, locally connected level-8 destination with directions',
    variants.has(zone.name) && zone.level === 8 && !zone.floating && aq.directionsKnown === true
    && zone.exits.some(e => e.to !== '?'));
  const fieldSave = w.serializeWorldState();
  check('I4 the generated site and active quest ride the world save',
    fieldSave.quests?.active.some(q => q.questId === aq.questId) === true);
  check('I5 no claim before completing the field objective', !w.claimQuestReward(Q_RELIQUARY.id, 'hearth'));
  hooks.onQuestZoneFieldCleared(aq.zoneId);
  check('I6 field completion grants neither relic nor case', aq.fieldDone && !w.account.features.has(FEATURE.RELIQUARY)
    && !w.meta.items.some(i => ITEM_BASES[i.baseId]?.category === 'relic'));
  check('I7 no remote claim away from the giver', !w.claimQuestReward(Q_RELIQUARY.id, 'hearth'));
  const giver = w.createMonster('townsfolk_questgiver', 1, 'player');
  giver.pos = { ...w.player.pos };
  w.actors.push(giver);
  hooks.onQuestZoneCleared(aq);
  check('I8 turn-in requests a choice; no automatic payout', w.questRewardRequested
    && w.questRewardOffers()[0]?.choices.length === 3 && !w.completedQuests.has(Q_RELIQUARY.id));
  const previewLines = w.questRewardOffers()[0].choices.find(c => c.id === 'hearth')!.lines;
  check('I8b reward previews show stable exact stats and footprint', previewLines.length > 0
    && w.questRewardOffers()[0].choices.every(c => c.footprint === '1 × 1')
    && JSON.stringify(previewLines) === JSON.stringify(w.questRewardOffers()[0].choices[0].lines));
  check('I9 unknown choice refuses without completing', !w.claimQuestReward(Q_RELIQUARY.id, 'forged-choice')
    && !w.completedQuests.has(Q_RELIQUARY.id));
  const bag = w.meta.items;
  while (autoPlace(bag, mk('relic_charm'))) { /* occupy every bag cell */ }
  const beforeFull = bag.length;
  check('I10 full pack defers the ENTIRE reward and unlock', !w.claimQuestReward(Q_RELIQUARY.id, 'hearth')
    && bag.length === beforeFull && !w.account.features.has(FEATURE.RELIQUARY)
    && !(w.ledger.relic_recovered ?? 0) && w.activeQuests.includes(aq));
  bag.length = 0;
  const awaitingChoice = w.serializeWorldState();
  check('I11 ready-to-choose state persists across world adoption', w.adoptWorldState(awaitingChoice)
    && w.activeQuests.some(q => q.questId === Q_RELIQUARY.id && q.fieldDone));
  // Adoption restores the graph; the local test giver still stands in the arena.
  check('I12 chosen reward pays once and grants one open seat', w.claimQuestReward(Q_RELIQUARY.id, 'hearth')
    && w.meta.items.length === 1 && w.meta.items[0].name === 'Hearthkeeper’s Charm'
    && containerBoardFor(R, w.account.features)?.cells === 1 && w.ledger.relic_recovered === 1);
  const reward = w.meta.items[0];
  check('I12b the awarded item matches its preview exactly',
    JSON.stringify(describeItem(reward).affix.map(l => l.text)) === JSON.stringify(previewLines));
  check('I13 duplicate and guest claims cannot award another item', !w.claimQuestReward(Q_RELIQUARY.id, 'well')
    && !w.claimQuestReward(Q_RELIQUARY.id, 'veil', { ...w.localSeat, id: 'guest' }) && w.meta.items.length === 1);
  check('I14 chosen relic is immediately usable but inert in the pack', itemLevelReq(reward) <= w.player.level
    && w.reliquaryLesson() && !w.meta.containers[RELIQUARY_ID]?.length);
  const nDrops = w.drops.length;
  w.dropGearAt(w.player.pos, mk('relic_charm'));
  check('I15 claiming the case alone does not enable ambient drops', w.drops.length === nDrops);
  w.containerPlace(w.localSeat, RELIQUARY_ID, reward.uid, 2, 2);
  check('I16 a refused seating does not complete the lesson', w.reliquaryLesson());
  const lifeBefore = w.player.sheet.get('life');
  w.containerPlace(w.localSeat, RELIQUARY_ID, reward.uid);
  check('I17 actual seating completes the lesson and adds the relic stats', !w.reliquaryLesson()
    && w.account.ledger[RELIQUARY_LESSON] === 1 && w.player.sheet.get('life') > lifeBefore);
  w.dropGearAt(w.player.pos, mk('relic_charm'));
  check('I18 ambient relics now land', w.drops.length === nDrops + 1);
  w.containerTake(w.localSeat, RELIQUARY_ID, reward.uid);
  check('I19 unseating removes power without relocking discovery', !w.reliquaryLesson()
    && Math.abs(w.player.sheet.get('life') - lifeBefore) < 0.01);
  const doneSave = w.serializeWorldState();
  check('I20 claim completion survives reload and cannot pay twice', w.adoptWorldState(doneSave)
    && w.completedQuests.has(Q_RELIQUARY.id) && !w.claimQuestReward(Q_RELIQUARY.id, 'hearth'));
}

console.log(failed ? `\nFAIL — ${failed} check(s) failed` : '\nPASS — THE RELIQUARY');
process.exit(failed ? 1 : 0);
