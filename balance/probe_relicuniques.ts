// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RELIC LEGENDS + THE SEAT LAW (docs/engine/containers.md;
// data/uniques/relics.ts; engine/seatlaw.ts). Pins:
//   A. THE CENSUS — six legends on relic bases; every line a known stat, the
//      grant a real skill, the gauge a registered derived gauge; THE DEFINING
//      LAW (a signature line no affix rolls); the amplifier stats registered,
//      family-seated on the sheet, blurbed; the describer's words; the roller
//      (rarity unique + category relic yields only relic legends, and below
//      every minIlvl degrades to rare); the relic cache's legend pour; the
//      world unique pool's relic share.
//   B. THE GEOMETRY — seatNeighbourhood over the ring, the shelves and the
//      full case (a sealed cell is never a seat; a 2×2 at the heart touches
//      eight) and seatAmplification's arithmetic, single hop included.
//   C. THE HERMIT — solitude folds per empty seat against the bead, tracks a
//      neighbour arriving and leaving; the amplifier never reaches the sheet.
//   D. THE CROWN — outward scales the eight touching charms, never itself; a
//      hermit beside it wears both factors and no chain.
//   E. THE LODESTONE — communion per touching relic; a far relic is not one.
//   F. THE CASE GAUGE — 'seated:reliquary' publishes the seated count and the
//      Tally Idol's damage climbs with it.
//   G. THE UNQUARRIED IDOL — independent companion, manual golem coexistence,
//      free reservation, death/reform, clean removal, stacking and save/load.
//   H. SUNDERSTONE — a rolled element; its penetration and price on the
//      sheet; the choice survives a save.
// The boards are found by SEAT COUNT (ring 8 / shelves 20 / heart 21 / case
// 25), never by rung index — however the ladder is cut, the census holds.
// Run: npx tsx balance/probe_relicuniques.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { RELIQUARY, RELIQUARY_ID } from '../src/data/containers';
import { containerBoardFor, seatAmplification, seatNeighbourhood } from '../src/engine/containers';
import { SEAT_AMPLIFIERS, amplifySeatMods, seatPowerStat, seatedGaugeId } from '../src/engine/seatlaw';
import { RELIC_LEGEND_CONTAINER, RELIC_UNIQUES } from '../src/data/uniques/relics';
import { UNIQUE_LIST } from '../src/data/uniques';
import { ITEM_AFFIX_LIST } from '../src/data/itemaffixes';
import { ITEM_BASES } from '../src/data/itembases';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { summonReservationUnit } from '../src/engine/companionGrants';
import { DERIVED_GAUGES } from '../src/engine/gauges';
import { STAT_DEFS, type Modifier } from '../src/engine/stats';
import { compileItemMods, describeItem, forgeItem, isKnownItemStat, rollItem } from '../src/engine/itemgen';
import { uniqueDefinitionLines } from '../src/engine/itemchoices';
import { sheetFamilyOf, statBlurbOf } from '../src/data/sheet';
import { resolveLootTable } from '../src/engine/loot';
import { autoPlace } from '../src/engine/inventory';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { CLASSES } from '../src/data/classes';
import type { ItemInstance, ModLineDef } from '../src/engine/items';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

bootSimEngine();
seedGlobalRandom(0x5e11d);

/** A tiny seeded stream for the roller (the harness's determinism law). */
const lcg = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};

const R = RELIQUARY;
/** The ladder prefix whose union first reaches `cells` open seats. */
const rungsFor = (cells: number): Set<string> => {
  for (let n = 1; n <= R.ladder.length; n++) {
    const f = new Set(R.ladder.slice(0, n).map(r => r.feature));
    if ((containerBoardFor(R, f)?.cells ?? 0) >= cells) return f;
  }
  return new Set(R.ladder.map(r => r.feature));
};
const RING = rungsFor(8), SHELVES = rungsFor(20), HEART = rungsFor(21), FULL = rungsFor(25);
const own = (w: World, f: Set<string>): void => { for (const x of f) w.account.features.add(x); };
let uidSeq = 910000;
const mk = (baseId: string, x?: number, y?: number): ItemInstance =>
  ({ uid: uidSeq++, baseId, ilvl: 1, tier: 1, rarity: 'magic', name: baseId, baseRoll: 0, implicitRolls: [], affixes: [], x, y } as ItemInstance);
/** A legend at max rolls (quality 1 pins every range to its top). */
const legend = (id: string, ilvl = 20): ItemInstance => forgeItem({ ilvl, uniqueId: id, quality: 1 })!;
/** A plain magic charm with one register line at max roll. */
const charm = (affix: string): ItemInstance =>
  forgeItem({ ilvl: 1, baseId: 'relic_charm', rarity: 'magic', affixes: [{ id: affix }], quality: 1 })!;
const lineOf = (it: ItemInstance, stat: string): number => compileItemMods(it).find(m => m.stat === stat)?.value ?? 0;
const IDS = ['hermits_bead', 'sunderstone', 'lodestone', 'unquarried_idol', 'tally_idol', 'reliquary_crown'];
const place = (w: World, it: ItemInstance, x: number, y: number): void => {
  autoPlace(w.localSeat.meta.items, it);
  w.applyAction(w.localSeat, { t: 'containerPlace', container: RELIQUARY_ID, uid: it.uid, x, y });
};
const take = (w: World, it: ItemInstance): void => { w.applyAction(w.localSeat, { t: 'containerTake', container: RELIQUARY_ID, uid: it.uid }); };

// ------------------------------------------------------------ A. THE CENSUS
{
  const byId = Object.fromEntries(RELIC_UNIQUES.map(u => [u.id, u]));
  check('A1 six relic legends, each on a relic base, all on the live roster',
    IDS.every(id => byId[id] && ITEM_BASES[byId[id].baseId]?.category === 'relic' && UNIQUE_LIST.includes(byId[id]))
    && RELIC_UNIQUES.length === 6, RELIC_UNIQUES.map(u => `${u.id}@${u.baseId}`).join(' '));
  check('A1b the four footprints each carry a legend',
    ['relic_charm', 'relic_talisman', 'relic_idol', 'relic_effigy'].every(b => RELIC_UNIQUES.some(u => u.baseId === b)));
  const unknown: string[] = [];
  for (const u of RELIC_UNIQUES) for (const l of uniqueDefinitionLines(u)) if (!isKnownItemStat(l.stat)) unknown.push(`${u.id}:${l.stat}`);
  check('A2 every legend line names a known stat', unknown.length === 0, unknown.join(' '));
  check('A2b the grant names a real skill and the gauge a registered derived gauge on the Reliquary',
    !!SKILLS.summon_stone_golem && !!DERIVED_GAUGES[seatedGaugeId(RELIC_LEGEND_CONTAINER)]
    && seatedGaugeId(RELIC_LEGEND_CONTAINER) === seatedGaugeId(RELIQUARY_ID));
  const shapeKey = (l: ModLineDef): string =>
    `${l.stat}|${l.kind}|${l.when ?? ''}|${l.gauge ?? ''}|${(l.tags ?? []).join(',')}|${l.fromStat ?? ''}|${l.local ? 'L' : ''}`;
  const affixShapes = new Set(ITEM_AFFIX_LIST.flatMap(a => a.lines.map(shapeKey)));
  const poolOnly = RELIC_UNIQUES.filter(u => !uniqueDefinitionLines(u).some(l => !affixShapes.has(shapeKey(l)) || sheetFamilyOf(l.stat)?.cat === 'skills')).map(u => u.id);
  check('A3 THE DEFINING LAW: every relic legend wears a signature line', poolOnly.length === 0, poolOnly.join(' '));
  const amps = ['outward', 'solitude', 'communion'] as const;
  check('A4 the three amplifier stats stand registered, family-seated on the sheet, blurbed',
    amps.every(m => SEAT_AMPLIFIERS[seatPowerStat(m)]?.mode === m && !!STAT_DEFS[seatPowerStat(m)]
      && sheetFamilyOf(seatPowerStat(m))?.cat === 'misc' && !!statBlurbOf(seatPowerStat(m)) && isKnownItemStat(seatPowerStat(m))));
  const spoken = (id: string): string => describeItem(legend(id)).unique.join(' | ');
  check('A5 the describer speaks every signature',
    /stronger for every open seat touching it that stands empty/.test(spoken('hermits_bead'))
    && /Relics touching this effigy have [0-9.]+% stronger lines/.test(spoken('reliquary_crown'))
    && /for every relic seated in your Reliquary/.test(spoken('tally_idol'))
    && /A Stone Golem from Level \d Summon Stone Golem/.test(spoken('unquarried_idol'))
    && /penetrates [0-9.]+% of/.test(spoken('sunderstone'))
    && /stronger for every relic touching it/.test(spoken('lodestone')), spoken('reliquary_crown'));
  const rng = lcg(0xbead);
  const seen = new Set<string>();
  let foreign = 0;
  for (let i = 0; i < 300; i++) {
    const it = rollItem({ ilvl: 20, rng, rarity: 'unique', category: 'relic' });
    if (!it || !it.uniqueId) { foreign++; continue; }
    if (ITEM_BASES[it.baseId]?.category !== 'relic') foreign++;
    seen.add(it.uniqueId);
  }
  check('A6 rarity unique + category relic rolls only relic legends, and every one of the six', foreign === 0 && IDS.every(id => seen.has(id)), [...seen].join(' '));
  const shallow = rollItem({ ilvl: 3, rng, rarity: 'unique', category: 'relic' });
  check('A6b below every minIlvl the ask degrades to a rare relic', shallow?.rarity === 'rare' && ITEM_BASES[shallow.baseId]?.category === 'relic');
  let legends = 0, others = 0;
  for (let i = 0; i < 1500; i++) {
    for (const r of resolveLootTable('relic_cache', { ilvl: 20, rng })) {
      if (r.kind !== 'item') continue;
      if (ITEM_BASES[r.item.baseId]?.category !== 'relic') others++;
      else if (r.item.rarity === 'unique') legends++;
    }
  }
  check('A7 the relic cache pours a legend now and then, and never a foreign item', legends > 10 && legends < 200 && others === 0, `${legends} legends in 1500 pours`);
  const mass = UNIQUE_LIST.reduce((n, u) => n + u.weight, 0);
  const relicMass = RELIC_UNIQUES.reduce((n, u) => n + u.weight, 0);
  check('A8 the relic legends hold a chase share of the world unique pool (2%–20%)', relicMass / mass > 0.02 && relicMass / mass < 0.2, `${relicMass}/${mass}`);
}

// ---------------------------------------------------------- B. THE GEOMETRY
{
  const b0 = containerBoardFor(R, RING)!, b1 = containerBoardFor(R, SHELVES)!, b2 = containerBoardFor(R, HEART)!, bAll = containerBoardFor(R, FULL)!;
  const corner = mk('relic_charm', 1, 1), edge = mk('relic_charm', 2, 1);
  const h0 = seatNeighbourhood(b0, [corner, edge]);
  check('B1 on the ring a corner charm touches one open seat beside its neighbour; the sealed centre is never a seat',
    h0.get(corner)!.pieces.length === 1 && h0.get(corner)!.empty === 1 && h0.get(edge)!.pieces.length === 1 && h0.get(edge)!.empty === 1);
  const h1 = seatNeighbourhood(b1, [corner]);
  check('B2 the shelves open two more seats against the corner', h1.get(corner)!.empty === 4 && h1.get(corner)!.pieces.length === 0);
  const h2 = seatNeighbourhood(b2, [edge]), h1e = seatNeighbourhood(b1, [edge]);
  check('B3 the heart opens one more seat against the ring edge (three with the shelves, four with the heart)', h1e.get(edge)!.empty === 3 && h2.get(edge)!.empty === 4);
  const crown = mk('relic_effigy', 1, 1);
  check('B4 a 2×2 at the heart of the full case touches eight seats', seatNeighbourhood(bAll, [crown]).get(crown)!.empty === 8);
  const ring = [[0, 1], [0, 2], [3, 1], [3, 2], [1, 0], [2, 0], [1, 3], [2, 3]].map(([x, y]) => mk('relic_charm', x, y));
  const hc = seatNeighbourhood(bAll, [crown, ...ring]);
  check('B4b ringed, it touches eight pieces and no empty seat; each charm touches the crown and its one paired charm', hc.get(crown)!.pieces.length === 8 && hc.get(crown)!.empty === 0
    && ring.every(c => hc.get(c)!.pieces.length === 2 && hc.get(c)!.pieces.includes(crown)));
  const sol = mk('relic_charm', 1, 1), tal = mk('relic_talisman', 2, 3), out = mk('relic_effigy', 1, 1);
  const mods = new Map<ItemInstance, Modifier[]>([
    [sol, [{ stat: seatPowerStat('solitude'), kind: 'flat', value: 0.3 }, { stat: 'life', kind: 'flat', value: 10 }]],
    [tal, [{ stat: seatPowerStat('communion'), kind: 'flat', value: 0.08 }, { stat: 'mana', kind: 'flat', value: 10 }]],
    [out, [{ stat: seatPowerStat('outward'), kind: 'flat', value: 0.2 }, { stat: 'life', kind: 'increased', value: 0.1 }]],
  ]);
  const plain: Modifier[] = [{ stat: 'mana', kind: 'flat', value: 5 }];
  const modsOf = (it: ItemInstance): Modifier[] => mods.get(it) ?? plain;
  const a1 = seatAmplification(b1, [sol], modsOf);
  check('B5 solitude: 1 + 0.3 × four empty seats', near(a1.get(sol)!, 2.2));
  const crowd = [mk('relic_charm', 1, 3), mk('relic_charm', 3, 4), mk('relic_charm', 2, 4)];
  const a2 = seatAmplification(bAll, [tal, ...crowd], modsOf);
  check('B6 communion: 1 + 0.08 × three touching pieces', near(a2.get(tal)!, 1.24));
  const solB = mk('relic_charm', 0, 1);
  mods.set(solB, mods.get(sol)!);
  const a3 = seatAmplification(bAll, [out, solB, ...ring.slice(1)], modsOf);
  check('B7 outward scales the touching pieces (1.2), never the crown itself (1.0)', near(a3.get(out)!, 1) && ring.slice(1).every(c => near(a3.get(c)!, 1.2)));
  const solEmpty = seatNeighbourhood(bAll, [out, solB, ...ring.slice(1)]).get(solB)!.empty;
  check('B7b the hermit beside the crown wears both factors and no chain: 1 + 0.2 + 0.3 × its one empty seat',
    solEmpty === 1 && near(a3.get(solB)!, 1 + 0.2 + 0.3 * solEmpty), `empty ${solEmpty}`);
  const amped = amplifySeatMods(modsOf(sol), 2.2);
  check('B8 amplifySeatMods drops the amplifier line and scales the rest', amped.length === 1 && amped[0].stat === 'life' && near(amped[0].value, 22));
  check('B8b a factor of one on a plain piece returns the same array', amplifySeatMods(plain, 1) === plain);
  const cursed = new Map<ItemInstance, Modifier[]>([[out, [{ stat: seatPowerStat('outward'), kind: 'flat', value: -2 }]]]);
  const a4 = seatAmplification(bAll, [out, ring[0]], it => cursed.get(it) ?? modsOf(it));
  check('B9 a cursed outward power floors the neighbour at zero, never inverts', a4.get(ring[0]) === 0);
}

// ------------------------------------------------------------- C. THE HERMIT
{
  const w = makeSimWorld(CLASSES[0].id, 21);
  const seat = w.localSeat, hero = w.player;
  own(w, RING);
  w.recalcSeat(seat);
  const life0 = hero.sheet.get('life');
  // The sheet's life multiplier, measured on a plain charm (the fold's own
  // arithmetic is not the question here — the factor is).
  const gauge = charm('relic_life');
  place(w, gauge, 1, 1);
  const mult = (hero.sheet.get('life') - life0) / lineOf(gauge, 'life');
  take(w, gauge);
  const bead = legend('hermits_bead', 1);
  const lifeRaw = lineOf(bead, 'life'), sol = lineOf(bead, seatPowerStat('solitude'));
  const delta = (): number => hero.sheet.get('life') - life0;
  place(w, bead, 1, 1);
  check('C1 alone in the ring corner the bead speaks at 1 + solitude × two empty seats', mult > 0 && sol > 0 && near(delta(), lifeRaw * mult * (1 + 2 * sol), 1e-6), `${delta().toFixed(3)} vs ${(lifeRaw * mult * (1 + 2 * sol)).toFixed(3)}`);
  check('C2 the amplifier never reaches the sheet', hero.sheet.get(seatPowerStat('solitude')) === 0);
  const mana = charm('relic_mana');
  place(w, mana, 2, 1);
  check('C3 a neighbour arriving takes a seat from the solitude', near(delta(), lifeRaw * mult * (1 + sol), 1e-6));
  take(w, mana);
  check('C4 and leaving gives it back', near(delta(), lifeRaw * mult * (1 + 2 * sol), 1e-6));
  take(w, bead);
  check('C5 unseated, the bead is silent', near(delta(), 0, 1e-6));
}

// -------------------------------------------------------------- D. THE CROWN
{
  const w = makeSimWorld(CLASSES[0].id, 22);
  const seat = w.localSeat, hero = w.player;
  own(w, FULL);
  w.recalcSeat(seat);
  const mana0 = hero.sheet.get('mana'), fire0 = hero.sheet.get('fireRes'), life0 = hero.sheet.get('life');
  const probeCharm = charm('relic_mana');
  place(w, probeCharm, 4, 4);
  const mult = (hero.sheet.get('mana') - mana0) / lineOf(probeCharm, 'mana');
  take(w, probeCharm);
  const crown = legend('reliquary_crown', 1);
  const out = lineOf(crown, seatPowerStat('outward')), fireRaw = lineOf(crown, 'fireRes');
  place(w, crown, 1, 1);
  check('D1 the crown seats at the heart of the full case', seat.meta.containers[RELIQUARY_ID]?.some(i => i.uid === crown.uid && i.x === 1 && i.y === 1) === true);
  check('D2 its own lines are never scaled by its own outward power', near(hero.sheet.get('fireRes') - fire0, fireRaw, 1e-6));
  const ring = [[0, 1], [0, 2], [3, 1], [3, 2], [1, 0], [2, 0], [1, 3], [2, 3]].map(([x, y]) => { const c = charm('relic_mana'); place(w, c, x, y); return c; });
  const manaRaw = ring.reduce((n, c) => n + lineOf(c, 'mana'), 0);
  check('D3 the eight charms touching it speak at 1 + outward', out > 0 && near(hero.sheet.get('mana') - mana0, manaRaw * mult * (1 + out), 1e-6),
    `${(hero.sheet.get('mana') - mana0).toFixed(3)} vs ${(manaRaw * mult * (1 + out)).toFixed(3)}`);
  const far = charm('relic_mana');
  place(w, far, 4, 4);
  check('D4 a charm not touching it speaks plain', near(hero.sheet.get('mana') - mana0, (manaRaw * (1 + out) + lineOf(far, 'mana')) * mult, 1e-6));
  for (const c of [...ring, far]) take(w, c);
  const bead = legend('hermits_bead', 1);
  const sol = lineOf(bead, seatPowerStat('solitude')), lifeRaw = lineOf(bead, 'life');
  const lifeMult = (() => { const base = hero.sheet.get('life'); const g = charm('relic_life'); place(w, g, 4, 4); const m = (hero.sheet.get('life') - base) / lineOf(g, 'life'); take(w, g); return m; })();
  place(w, bead, 3, 1);
  const lifeBase = life0 * 1; // the crown's life% is measured below against the bead's own share
  const crownLife = hero.sheet.get('life');
  take(w, bead);
  const withoutBead = hero.sheet.get('life');
  place(w, bead, 3, 1);
  check('D5 a hermit beside the crown wears both factors and no chain: 1 + outward + solitude × three empty seats',
    near(crownLife - withoutBead, lifeRaw * lifeMult * (1 + out + 3 * sol), 1e-3) && lifeBase >= 0,
    `${(crownLife - withoutBead).toFixed(3)} vs ${(lifeRaw * lifeMult * (1 + out + 3 * sol)).toFixed(3)}`);
}

// ---------------------------------------------------------- E. THE LODESTONE
{
  const w = makeSimWorld(CLASSES[0].id, 23);
  const seat = w.localSeat, hero = w.player;
  own(w, FULL);
  w.recalcSeat(seat);
  const regen0 = hero.sheet.get('lifeRegen');
  const stone = legend('lodestone', 1);
  const comm = lineOf(stone, seatPowerStat('communion'));
  place(w, stone, 1, 1);
  const alone = hero.sheet.get('lifeRegen') - regen0;
  const a = charm('relic_mana'), b = charm('relic_mana');
  place(w, a, 0, 1);
  place(w, b, 3, 1);
  const crowded = hero.sheet.get('lifeRegen') - regen0;
  check('E1 two relics touching the talisman: its lines at 1 + 2 × communion', comm > 0 && alone > 0 && near(crowded / alone, 1 + 2 * comm, 1e-6), `${(crowded / alone).toFixed(4)} vs ${(1 + 2 * comm).toFixed(4)}`);
  const far = charm('relic_mana');
  place(w, far, 4, 4);
  check('E2 a far relic is not touching', near(hero.sheet.get('lifeRegen') - regen0, crowded, 1e-9));
  check('E3 the talisman stands where it was asked, a 2×1', seat.meta.containers[RELIQUARY_ID]?.some(i => i.uid === stone.uid && i.x === 1 && i.y === 1) === true);
}

// --------------------------------------------------------- F. THE CASE GAUGE
{
  const w = makeSimWorld(CLASSES[0].id, 24);
  const seat = w.localSeat, hero = w.player;
  own(w, FULL);
  w.recalcSeat(seat);
  const gid = seatedGaugeId(RELIQUARY_ID);
  const settle = (): void => { for (let i = 0; i < 12; i++) w.update(0.05); };
  const dmg0 = hero.sheet.get('damage');
  const idol = legend('tally_idol', 1);
  const per = lineOf(idol, 'damage');
  place(w, idol, 1, 1);
  settle();
  check('F1 the idol seated alone publishes a tally of one', hero.derivedGauges?.get(gid) === 1, `${hero.derivedGauges?.get(gid)}`);
  const d1 = hero.sheet.get('damage');
  const a = charm('relic_mana'), b = charm('relic_mana');
  place(w, a, 0, 1);
  place(w, b, 4, 4);
  settle();
  check('F2 two more relics tally three', hero.derivedGauges?.get(gid) === 3);
  check('F3 the damage climbs by the line per relic seated', per > 0 && near(hero.sheet.get('damage') - d1, 2 * per, 1e-6) && near(d1 - dmg0, per, 1e-6),
    `${(hero.sheet.get('damage') - d1).toFixed(4)} vs ${(2 * per).toFixed(4)}`);
  take(w, a);
  settle();
  check('F4 unseating drops the tally', hero.derivedGauges?.get(gid) === 2 && near(hero.sheet.get('damage') - dmg0, 2 * per, 1e-6));
}

// G. Independent companions and the manual reservation benefit.
{
  const w = makeSimWorld(CLASSES[0].id, 25);
  const seat = w.localSeat, hero = w.player;
  own(w, FULL);
  seat.meta.baseAttrs.willpower = 100;
  w.recalcSeat(seat);
  const idol = legend('unquarried_idol', 1);
  const level = Math.floor(lineOf(idol, 'companiongrant_summon_stone_golem'));
  check('G0 follower tooltip floors its actual skill level', describeItem(idol).unique.some(line => line.includes('Level ' + level + ' Summon Stone Golem')));
  const bar = [...hero.skills];
  const step = (n = 1) => { for (let i = 0; i < n; i++) w.update(0.05); };
  const followers = () => w.actors.filter(a => !a.dead && a.owner === hero && a.summonInst?.companionGrant);
  place(w, idol, 1, 1); step();
  const first = followers()[0];
  check('G1 idol maintains an attributed follower at its rolled skill level', followers().length === 1
    && first?.summonInst?.level === level && first.summonInst.grantedBy === idol.name);
  check('G2 follower uses no skill slot, learned entry or reservation', hero.skills.every((s, i) => s === bar[i])
    && !seat.meta.knownSkills.has('summon_stone_golem') && !seat.grantedInsts && hero.reservedMana === 0);
  step(20); w.recalcSeat(seat); step();
  check('G3 ordinary ticking and recalculation preserve the same follower', followers()[0] === first && followers().length === 1);
  const manual = makeSkillInstance(SKILLS.summon_stone_golem, 10, 2);
  seat.meta.knownSkills.set(manual.def.id, manual);
  hero.skills[0] = manual; w.recalcSeat(seat);
  hero.mana = hero.maxMana();
  const pressed = w.useSkill(hero, manual, { x: hero.pos.x + 40, y: hero.pos.y });
  step(30);
  check('G4 a manual golem coexists with the free follower', pressed
    && w.minionsOfSkill(hero, manual.def.id).length === 1 && followers()[0] === first);
  check('G5 the manual contract also reserves no mana', hero.summonToggles.has(manual.def.id) && hero.reservedMana === 0);
  first.life = 0; w.kill(first); step();
  check('G6 a slain follower waits to reform', followers().length === 0 && w.minionsOfSkill(hero, manual.def.id).length === 1);
  step(170);
  check('G7 the follower reforms without evicting the manual golem', followers().length === 1
    && followers()[0] !== first && w.minionsOfSkill(hero, manual.def.id).length === 1);
  const save = serializeCharacter(w), w2 = makeSimWorld(CLASSES[0].id, 26);
  own(w2, FULL);
  check('G8 save adopts', applySavedCharacter(w2, save)); w2.update(0.05);
  check('G9 reload reconstructs one follower from the item', w2.actors.filter(a => !a.dead
    && a.owner === w2.player && a.summonInst?.companionGrant).length === 1);
  const manualBody = w.minionsOfSkill(hero, manual.def.id)[0];
  take(w, idol); step();
  check('G10 removing the idol retires only its follower', followers().length === 0
    && !manualBody.dead && hero.skills[0] === manual);
  const delivery = manual.def.delivery;
  check('G11 the manual reservation returns to its ordinary live price', delivery.type === 'summon'
    && hero.reservedMana > 0 && Math.abs(hero.reservedMana - summonReservationUnit(hero, manual, delivery)) < 0.001);
  place(w, idol, 1, 1); step();
  check('G12 reseating restores one follower and removes manual reservation again', followers().length === 1 && hero.reservedMana === 0);
  const old = followers()[0];
  w.actors = w.actors.filter(a => a !== old); step();
  check('G13 a body missing after travel is reconstructed once', followers().length === 1 && followers()[0] !== old);
  const second = legend('unquarried_idol', 1);
  const beforeStack = followers()[0];
  beforeStack.life = beforeStack.maxLife() * 0.4;
  place(w, second, 3, 1); step();
  check('G14 duplicate idols add levels to one follower without healing or consuming the manual pool',
    followers().length === 1 && followers()[0] === beforeStack
    && followers()[0].summonInst!.level === level + Math.floor(lineOf(second, 'companiongrant_summon_stone_golem'))
    && followers()[0].life / followers()[0].maxLife() < 0.41
    && hero.reservedMana === 0 && w.minionsOfSkill(hero, manual.def.id).length === 1);
  hero.dead = true; step();
  check('G15 owner death retires the follower', followers().length === 0);
}

// ------------------------------------------------------------ H. SUNDERSTONE
{
  const w = makeSimWorld(CLASSES[0].id, 27);
  const seat = w.localSeat, hero = w.player;
  own(w, FULL);
  w.recalcSeat(seat);
  const stone = legend('sunderstone', 1);
  const el = stone.uniqueChoices?.sundered?.id ?? '';
  check('H1 the stone rolls one element', ['fire', 'cold', 'lightning', 'chaos'].includes(el), el);
  const pen = lineOf(stone, `${el}Pen`), res = lineOf(stone, `${el}Res`);
  check('H2 it carries the rolled element as an extra lane and penetration, and pays in its own resistance', pen > 0 && res < 0 && lineOf(stone, `extraAs_${el}`) > 0);
  const pen0 = hero.sheet.get(`${el}Pen`), res0 = hero.sheet.get(`${el}Res`);
  place(w, stone, 1, 1);
  check('H3 seated, the sheet wears both', near(hero.sheet.get(`${el}Pen`) - pen0, pen, 1e-6) && near(hero.sheet.get(`${el}Res`) - res0, res, 1e-6));
  const save = serializeCharacter(w);
  const w2 = makeSimWorld(CLASSES[0].id, 28);
  own(w2, FULL);
  applySavedCharacter(w2, save);
  const back = w2.localSeat.meta.containers[RELIQUARY_ID]?.find(i => i.uid === stone.uid);
  check('H4 the element survives a save', back?.uniqueChoices?.sundered?.id === el && near(w2.player.sheet.get(`${el}Pen`), hero.sheet.get(`${el}Pen`), 1e-6));
  check('H5 the describer names the element', describeItem(stone).unique.join(' ').includes(`${el[0].toUpperCase()}${el.slice(1)} damage penetrates`));
}

console.log(failed ? `\nFAIL — ${failed} check(s) failed` : '\nPASS — THE RELIC LEGENDS');
process.exit(failed ? 1 : 0);
