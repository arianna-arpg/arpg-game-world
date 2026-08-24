// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DESCENT REWORK end to end on the real engine
// (docs/engine/descent.md): THE ABYSSAL REGISTER (reserved weight-0 families —
// forceable at the Delver, structurally silent in the wild), THE EASE LAW
// (survivalEase_<resource> folded once at survivalDrainRate, row-capped),
// THE LOCKED SHELF (seeded once-per-shaft mint, identity-stable across cave
// re-entry, rung-valid depth locks), THE PROVING LAW (no counter until THIS
// shaft's dive resolves), THE DEPTH LOCKS (entry refusal + essence purchase
// through the normalized buy lane), THE PRESSURE LADDER (live zone level,
// depth-axis brood composition, cap/batch density growth), and THE DEEP
// LEDGER (kill-fed essence packets, depth-tinted, banked to real wallets on
// resurface, × keptOnDeath).
// Run: npx tsx balance/probe_descent.ts
// ---------------------------------------------------------------------------

import { vec } from '../src/core/math';
import { CLASSES } from '../src/data/classes';
import { DESCENT_AFFIX_FAMILIES, ITEM_AFFIXES } from '../src/data/itemaffixes';
import { ITEM_BASES } from '../src/data/itembases';
import { affixPoolsFor, isKnownItemStat, rollItem } from '../src/engine/itemgen';
import { FACTIONS } from '../src/data/monsters';
import { mod } from '../src/engine/stats';
import { ESSENCE_IDS, type EssenceId } from '../src/data/essences';
import { VENDOR_CFG, VENDORS } from '../src/data/vendors';
import { World, type VendorEntry } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { resetActorIdCounter } from '../src/engine/actor';
import type { ZoneDef } from '../src/data/zones';
import { TILESETS } from '../src/data/tilesets';
import { FEATURE, makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { bootSimEngine, classById, SIM_ARENA_ID } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

// A tiny deterministic rng for the pure item rigs (no global stream moved).
const mulberry = (seed: number) => (): number => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// --- RIG A: THE ABYSSAL REGISTER (static weave + the reserved-word law) --------
{
  for (const id of DESCENT_AFFIX_FAMILIES) {
    const def = ITEM_AFFIXES[id];
    check(`A1 family '${id}' registered`, !!def);
    if (!def) continue;
    check(`A2 '${id}' is RESERVED (weight 0 — structurally wild-silent)`, def.weight === 0);
    check(`A3 '${id}' tiers + names authored`, def.tiers.length > 0 && def.names.length > 0);
    const reachable = Object.values(ITEM_BASES).some(b => {
      const pools = affixPoolsFor(b);
      return [...pools.prefix, ...pools.suffix].some(a => a.family === id);
    });
    check(`A4 '${id}' reachable on some base (forceable, never unreachable data)`, reachable);
    for (const l of def.lines) {
      check(`A5 '${id}' line stat '${l.stat}' known to the item pipeline`, isKnownItemStat(l.stat));
    }
  }
  // The force lane: withFamily mints the family (base lottery aims itself).
  const rng = mulberry(0xabc1);
  let forced = 0;
  for (let i = 0; i < 24; i++) {
    const famId = DESCENT_AFFIX_FAMILIES[i % DESCENT_AFFIX_FAMILIES.length];
    const item = rollItem({ ilvl: 24, rarity: 'rare', withFamily: famId, rng });
    if (item?.affixes.some(a => ITEM_AFFIXES[a.id]?.family === famId)) forced++;
  }
  check('A6 withFamily lands the register on ≥22/24 forced mints', forced >= 22, `${forced}/24`);
  // The wild stays silent: no organic mint ever carries a register word.
  const wildRng = mulberry(0x77dd);
  let leaked = 0;
  for (let i = 0; i < 400; i++) {
    const item = rollItem({ ilvl: 30, rng: wildRng });
    if (item?.affixes.some(a => DESCENT_AFFIX_FAMILIES.includes(ITEM_AFFIXES[a.id]?.family ?? ''))) leaked++;
  }
  check('A7 the wild never rolls the register (400 organic mints, 0 leaks)', leaked === 0, `${leaked} leaked`);
}

// --- the live rigs: a descent-enabled world ------------------------------------
bootSimEngine();
seedGlobalRandom(0xde5c);

function makeDescentWorld(seed: number): World {
  resetActorIdCounter();
  const account = makeAccount();
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  // THE MEMORY COUNTER (skill-items M3): the delver's shelf mirrors the
  // town law — true gems mint only once the rung is owned. These rigs are
  // ABOUT the shelf's grammar (counts, locks, determinism), so own it.
  account.features.add(FEATURE.VENDOR_GEMS);
  const manifest = buildManifest(account, seed);
  // The QUIET expedition, except the one package under test.
  for (const p of manifest.packages) p.enabled = p.id === 'descent';
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById('warrior'));
  world.loadZone(SIM_ARENA_ID);
  world.player.pos.x = 1200;
  world.player.pos.y = 1200;
  world.player.level = 20; // clears the package's startLevel gate
  return world;
}

const ARENA = { w: 2400, h: 2400 };
const caveDef = (over: Partial<ZoneDef>): ZoneDef => ({
  id: 'probe_delver_cave', name: 'Probe Delve', level: 12,
  size: { w: ARENA.w, h: ARENA.h },
  theme: { ...TILESETS.cavern.theme },
  layout: [{ kind: 'rocks', count: [2, 3], radius: [16, 24] }],
  objective: { kind: 'none' },
  packs: TILESETS.cavern.packs,
  exits: [{ to: SIM_ARENA_ID, side: 's' }],
  map: { x: 0, y: 0 },
  seed: 4242,
  caveDepth: 1, anchor: 'highland',
  ...over,
});

const world = makeDescentWorld(771221);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;
const step = (secs: number, keepLit = true): void => {
  const dt = 1 / 30;
  for (let t = 0; t < secs; t += dt) {
    if (keepLit) w.player.survival?.set('light', 100);
    w.update(dt);
  }
};

const surge = w.sim.descentField?.surge();
check('B0 the descent overlay stands (package enabled, surge readable)', !!surge);

// Stand a Delver site in a probe cave through the REAL projection seam.
const enterProbeCave = (id: string): ZoneDef => {
  const def = caveDef({ id });
  w.caveMap[id] = def;
  w.loadZone(id);
  return def;
};
const standSite = (): void => {
  const delver = w.createMonster('descent_delver', 12, 'enemy');
  delver.tag = 'descent_delver';
  delver.pos = vec(w.player.pos.x + 70, w.player.pos.y);
  w.actors.push(delver);
  w.descentSite = { delverId: delver.id, platform: vec(w.player.pos.x, w.player.pos.y + 90) };
  w.descentStock = w.descentStocks.get(w.zone.id) ?? w.mintDelverStock(w.zone);
};

// --- RIG B: THE LOCKED SHELF ---------------------------------------------------
{
  const def = enterProbeCave('probe_delver_cave');
  const first = w.descentStocks.get(def.id) ?? w.mintDelverStock(def);
  const again = w.descentStocks.get(def.id) ?? w.mintDelverStock(def);
  check('B1 one shaft, ONE shelf (the map re-projects the same array)', first === again);
  const st = surge.stock;
  const gears = (first as VendorEntry[]).filter(e => e.kind === 'item');
  const gems = (first as VendorEntry[]).filter(e => e.kind !== 'item');
  check('B2 the shelf deals both faces at the surge counts',
    gears.length === st.gear && gems.length === st.gems, `${gears.length} gear / ${gems.length} gems`);
  const rungDepths = new Set<number>(st.depthRungs.map((r: { depth: number }) => r.depth));
  check('B3 every depth lock is a TABLE rung (never an invented number)',
    (first as VendorEntry[]).every(e => e.depthReq === undefined || rungDepths.has(e.depthReq)));
  // Determinism: a second world on the SAME seed mints the same shelf.
  const world2 = makeDescentWorld(771221);
  const w2 = world2 as any;
  w2.caveMap['probe_delver_cave'] = caveDef({ id: 'probe_delver_cave' });
  w2.loadZone('probe_delver_cave');
  const other = w2.descentStocks.get('probe_delver_cave') ?? w2.mintDelverStock(w2.zone);
  const print = (s: VendorEntry[]): string => s.map(e =>
    `${e.kind}:${e.kind === 'item' ? e.item.name + '#' + e.item.affixes.map(a => a.id).join(',')
      : e.kind === 'skill' ? e.inst.def.id : e.gem.def.id}@${e.depthReq ?? 0}`).join('|');
  check('B4 same world seed, same cave, SAME shelf (no re-roll scumming lane)',
    print(first) === print(other), print(first).slice(0, 80));
  // The farm exists: across many shafts the register turns up on gear.
  let carriers = 0, minted = 0;
  for (let i = 0; i < 20; i++) {
    const d = caveDef({ id: `probe_farm_${i}` });
    const stock: VendorEntry[] = w.mintDelverStock(d);
    for (const e of stock) {
      if (e.kind !== 'item') continue;
      minted++;
      if (e.item.affixes.some(a => DESCENT_AFFIX_FAMILIES.includes(ITEM_AFFIXES[a.id]?.family ?? ''))) carriers++;
    }
  }
  check('B5 the deterministic farm is real (register words on some shelves)',
    carriers > 0, `${carriers}/${minted} gear entries carry the register`);
}

// --- RIG C: THE PROVING LAW → THE DIVE → THE LEDGER → THE LOCKS ---------------
{
  const def = enterProbeCave('probe_delver_cave_c');
  standSite();
  w.player.invulnerable = true;
  const delverRow = VENDORS.find(v => v.id === 'delver')!;
  check('C1 pre-dive: the body is near but THE COUNTER DOES NOT EXIST',
    w.nearDelver() === true && w.delverShopOpen() === false
    && delverRow.near(world, w.localSeat) === false);
  check('C2 pre-dive: the buy lane refuses through the same law',
    w.buyDelverGem(0) === false);
  check('C3 pre-dive prompt teaches the proving law',
    String(w.delverPrompt() ?? '').includes('shaft'));

  // Descend (the real seam — mints the abyss, swaps caveReturn, loads it).
  w.descend();
  const run = w.descentRun;
  check('C4 the dive stands (abyss loaded, run live, lamp full)',
    !!run && w.zone.id === `cave_descent_${def.id}`
    && (w.player.survival?.get('light') ?? 0) >= surge.lightMax);
  const baseLevel = run.baseLevel;
  check('C5 mid-dive: the counter stays sealed (nearDelver false in the abyss)',
    w.nearDelver() === false && w.delverShopOpen() === false);

  // THE PRESSURE LADDER: walk to depth 6 and let the tide build.
  w.player.pos = vec(run.origin.x + 6 * surge.depthUnit + 40, run.origin.y);
  step(0.2);
  check('C6 depth reads the walk (6 units out = depth 6)', run.depth === 6, `depth ${run.depth}`);
  check('C7 the abyss\'s OWN level climbs the ladder (base + floor(6×levelPerDepth))',
    w.zone.level === baseLevel + Math.floor(6 * surge.levelPerDepth),
    `level ${w.zone.level} vs base ${baseLevel}`);
  check('C8 the witness records what the dive has SEEN',
    w.descentDeepest.get(def.id) === 6);
  step(14);
  const live = (w.actors as Actor[]).filter(a => a.team === 'enemy' && !a.dead && a.faction === surge.faction).length;
  const capAt6 = Math.min(surge.spawnCapMax, surge.spawnCap + 6 * surge.spawnCapPerDepth);
  check('C9 the tide thickens past the base cap toward the depth cap',
    live > surge.spawnCap && live <= capAt6, `${live} live (base ${surge.spawnCap}, cap@6 ${capAt6})`);

  // Composition is a DEPTH read: the shallow never deals the heavy kin.
  const roster = FACTIONS[surge.faction].table;
  let shallowHeavy = 0, deepHeavy = 0;
  for (let i = 0; i < 80; i++) {
    const s = w.weightedPick(roster, surge.broodAnchor + 0);
    if (s === 'depthkin_brute' || s === 'pressure_hulk' || s === 'brine_cantor') shallowHeavy++;
    const d = w.weightedPick(roster, surge.broodAnchor + 9);
    if (d === 'depthkin_brute' || d === 'pressure_hulk' || d === 'brine_cantor') deepHeavy++;
  }
  check('C10 depth 0 never deals the heavy kin (presence = the depth gauge)', shallowHeavy === 0, `${shallowHeavy}/80`);
  check('C11 depth 9 deals them freely', deepHeavy > 0, `${deepHeavy}/80`);

  // THE DEEP LEDGER: exact banking at depth 6, packets minted on the whole.
  run.haul = {}; run.haulBank = 0;
  const perKill = surge.payoutPerKill * (1 + 6 * surge.payoutDepthBonus);
  const prey1 = w.createMonster('depthkin_crawler', 10, 'enemy');
  prey1.faction = surge.faction;
  prey1.pos = vec(w.player.pos.x + 40, w.player.pos.y);
  w.actors.push(prey1);
  w.kill(prey1, false, w.player);
  const bankAfterOne = run.haulBank + Object.values(run.haul as Record<string, number>).reduce((s: number, n) => s + (n as number), 0);
  check('C12 one kill banks exactly payoutPerKill × the depth multiplier',
    Math.abs(bankAfterOne - perKill) < 1e-9, `${bankAfterOne} vs ${perKill}`);
  for (let i = 0; i < 9; i++) {
    const prey = w.createMonster('depthkin_crawler', 10, 'enemy');
    prey.faction = surge.faction;
    prey.pos = vec(w.player.pos.x + 40, w.player.pos.y);
    w.actors.push(prey);
    w.kill(prey, false, w.player);
  }
  const packets = Object.values(run.haul as Record<string, number>).reduce((s: number, n) => s + (n as number), 0);
  const expectWhole = Math.floor(10 * perKill);
  check('C13 ten kills mint the whole packets (fractions stay banked)',
    packets === expectWhole && run.haulBank >= 0 && run.haulBank < 1,
    `${packets} packets vs ${expectWhole}, bank ${run.haulBank.toFixed(3)}`);
  check('C14 every packet wears a real tint', Object.keys(run.haul).every(k => ESSENCE_IDS.includes(k as EssenceId)));

  // THE EASE LAW: the lampkeeper stat halves the drain through the ONE fold,
  // and the row cap floors it.
  const rate = surge.drainRate;
  const bare = w.survivalDrainRate(w.player, 'light', rate);
  w.player.sheet.setSource('probe:lamp', [mod('survivalEase_light', 'flat', 0.5)]);
  const eased = w.survivalDrainRate(w.player, 'light', rate);
  w.player.sheet.setSource('probe:lamp', [mod('survivalEase_light', 'flat', 5)]);
  const capped = w.survivalDrainRate(w.player, 'light', rate);
  w.player.sheet.setSource('probe:lamp', []);
  check('C15 THE EASE LAW halves the drain at 50% ease (one fold, drawn == tested)',
    Math.abs(eased - bare * 0.5) < 1e-9, `${eased} vs ${bare * 0.5}`);
  check('C16 stacked ease FLOORS at the row cap (slowed, never stopped)',
    Math.abs(capped - bare * 0.3) < 1e-9, `${capped} vs ${bare * 0.3}`);

  // Resurface by CHOICE with a known haul: the wallets get paid, the law opens.
  run.haul = { coarse: 8, glimmering: 2 };
  run.haulBank = 0.7;
  const before: Record<string, number> = { ...w.localSeat.meta.essences };
  w.resurfaceFromDescent('climb');
  const gained = (id: string): number => (w.localSeat.meta.essences[id] ?? 0) - (before[id] ?? 0);
  check('C17 resurface returns to the Delver cave and ends the run',
    w.zone.id === def.id && w.descentRun === null);
  check('C18 the haul lands in the REAL wallet (8 coarse + 2 glimmering; the bank\'s fraction dies)',
    gained('coarse') === 8 && gained('glimmering') === 2);
  check('C19 the abyss def hands back its entry level (the ladder dies with the dive)',
    w.caveMap[`cave_descent_${def.id}`].level === baseLevel);
  // Re-arm the site the way a REAL re-entry does: the organic per-mouth roll
  // is seeded (a cave that hosted a Delver hosts him on every entry), but this
  // probe's hand-stood site must re-stand by hand after the resurface load.
  // The shelf re-projects the SAME array from the run map — that is the law
  // under test in C22.
  standSite();
  check('C20 THE PROVING LAW opens: the counter now EXISTS',
    w.delverShopOpen() === true && delverRow.near(world, w.localSeat) === true);
  check('C21 the headline reads the witness', w.delverDepthReached() === 6);

  // THE DEPTH LOCKS through the normalized buy lane. Open the trade gate the
  // honest way (the account owns the station), fund the wallet, then buy.
  w.account.features.add(VENDOR_CFG.trade.gate[0].feature!);
  const stock: VendorEntry[] = w.descentStock;
  check('C22 the projected shelf is the minted shelf', stock === w.descentStocks.get(def.id));
  const gearIdx = stock.findIndex(e => e.kind === 'item');
  check('C23 the shelf holds gear (normalized to Brandt)', gearIdx >= 0);
  if (gearIdx >= 0) {
    const entry = stock[gearIdx];
    // Seal it beyond the witness: the lock refuses with the depth in its words.
    entry.depthReq = 10;
    for (const id of ESSENCE_IDS) w.localSeat.meta.essences[id] = 999;
    const lenBefore = stock.length;
    check('C24 a depth-10 lock refuses a depth-6 witness (entry lock = one predicate)',
      w.buyDelverGem(gearIdx) === false && stock.length === lenBefore
      && String(w.delverEntryRefusal(entry)).includes('Depth 10'));
    // Withdraw the seal to a SEEN depth: the same lane sells it for essence.
    entry.depthReq = 4;
    const wallet: Record<string, number> = { ...w.localSeat.meta.essences };
    const bought = w.buyDelverGem(gearIdx);
    const spentSome = ESSENCE_IDS.some(id => (w.localSeat.meta.essences[id] ?? 0) < wallet[id]);
    check('C25 an unlocked entry SELLS through the essence lane (wallet debited, shelf spliced)',
      bought === true && stock.length === lenBefore - 1 && spentSome);
  }
}

// --- RIG D: keptOnDeath (the bank-or-bust dial, exercised at a real fraction) --
{
  const def = enterProbeCave('probe_delver_cave_d');
  standSite();
  w.descend();
  const run = w.descentRun;
  check('D1 the second shaft opens its own dive', !!run && w.zone.id === `cave_descent_${def.id}`);
  run.haul = { coarse: 10 };
  const kept = surge.payoutKeptOnDeath;
  (surge as { payoutKeptOnDeath: number }).payoutKeptOnDeath = 0.5;
  const before = w.localSeat.meta.essences.coarse ?? 0;
  w.player.life = 0;
  w.resurfaceFromDescent('died');
  (surge as { payoutKeptOnDeath: number }).payoutKeptOnDeath = kept;
  check('D2 death keeps the DIAL\'s fraction (round(10 × 0.5) = 5)',
    (w.localSeat.meta.essences.coarse ?? 0) - before === 5);
  check('D3 the deep spits you out ALIVE at the platform (never a run end)',
    w.zone.id === def.id && w.player.life > 0 && w.descentRun === null);
  check('D4 a spent shaft never re-opens (one descent per Delver per run)',
    (w.descend(), w.descentRun === null));
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
