// THE CISTERN PROBE — the scald lake's under-story + THE CISTERN CRONE pinned
// end to end (Scald Basin M3 coda; data/cistern.ts + the offered-seat grotto
// form in engine/tiers.ts + the great shoal in engine/lake.ts + THE GROUNDED
// STRIKE in engine/skills.ts / world.ts / render/vis/boilLayer.ts + the
// descent ledger + THE GRID ROOT), and above all the mere's LAYER-HONESTY
// LAW on the basin seat: a surface walker over the cistern neither sees it
// nor is touched by it; one story down the crone is a real fight.
//
//  · RIG A — THE REGISTRY + THE SEAL + THE SHAPE: the lane is a GROTTO with
//    `seat: 'offered'`, packSplit 0, a forbid list naming every basin water;
//    the region rows carry NO gameplay field and no surface visual but the
//    well's (leak-proof by construction — World's grid region-sense is
//    tier-blind, verified this pass, so this is the ONLY honest seal); the
//    heart face dials it; the lair row wears underLane + the symmetric
//    refusal; the crone's def nets (coven, rooted on cistern_water with a
//    rooted tell, lair_hoard, post, NO-TAG kite budget, every skill real +
//    hinted + affordable); THE BOIL's spec (a grounded, non-sky storm with a
//    ≥1.5s telegraph naming the water); the court rows; the ledger key; and
//    WHICH PATH SHIPPED — the GROTTO (no tileset seats the court in-zone).
//  · RIG B — THE CARVE (headless on the heart face, chance forced): the
//    great shoal stands whenever the lane is dialed; a cistern carves in most
//    seeds; EXACTLY ONE stair on EXACTLY ONE well, ON THE SHOAL; the whole
//    chamber lies under the shoal (no shelf/deep cell repainted — THE LAKE
//    KEEPS ITS WATER); covered/under/lane/packSplit-0 declared; zero orphans;
//    the lid walkable over every cistern cell; the story road reaches the
//    water; the residents are tier-stamped on their floor; absent ==
//    identical (no dial → no shoal, no story); the offer without the roll
//    (chance 0 → a shoal, no story); determinism; cells ⇔ one stair.
//  · RIG C — THE COURT (bias-forced): the font tier-stamped on the story,
//    its dress on the story, clear of the one stair, reachable; EXACTLY one
//    crone row, tier 1, seated IN THE WATER (the liquid seat on a region).
//  · RIG D — THE LIVE SEAL + THE BOIL (a real World): the heart face mints
//    a lake with its cistern; the crone stands in her pool and reads ROOTED
//    (THE GRID ROOT); THE VICE seal (the surface walker over the water is
//    untouched while the crone is held adjacent below, brains ticking); the
//    fight below is real; THE BOIL drawn == tested (the telegraph's roil
//    cells are exactly the water cells in the disc; a walker IN the water is
//    scalded at the landing, a walker on the SHORE inside the ring is not;
//    the ramp is pure); THE DESCENT LEDGER stamps on the real crossing.
//
// Exit 1 on any failure.
//   npx tsx balance/probe_cistern.ts

import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/massifs';
import '../src/data/compositions';
import '../src/data/settled';
import '../src/data/lairs';
import '../src/data/merelake';
import '../src/data/cistern';

import { Rng, withSeededRandom } from '../src/core/rng';
import { vec, type Vec2 } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import { bootSimEngine, classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';
import { placeZoneAt } from '../src/engine/worldgen';
import { generateLayout, landmarkOf, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { lairLandmarkRolls, lairOf } from '../src/engine/lairs';
import {
  laneLedgerOnDescend, linkFlipTier, linkSpanOf, storyReachable, TIER_CFG, tierFloorAt, tierLinkOf,
  UNDER_TIER_LANES,
} from '../src/engine/tiers';
import { LAKE_CFG, LAKE_CELL, LAKE_PLANS } from '../src/engine/lake';
import { BOIL_CFG, boilRamp, groundedCellsIn } from '../src/render/vis/boilLayer';
import { makeSkillInstance, type StormDelivery } from '../src/engine/skills';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { TILESETS } from '../src/data/tilesets';
import { LOOT_TABLES } from '../src/data/loottables';
import { HUB_ZONE } from '../src/data/zones';
import type { ZoneDef } from '../src/data/zones';

bootSimEngine();

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const STORY_KINDS = ['cistern_shore', 'cistern_water'] as const;
const CISTERN_KINDS = [...STORY_KINDS, 'cistern_well'] as const;
const COURT = ['brood_matron', 'kettle_minnow', 'vent_lamprey'];
const FACE = TILESETS.sulphur_pools;
const FACE_PARAMS = (FACE.layoutParams ?? {}) as Record<string, unknown>;
const WATER_ROWS = ['sulphur_shelf', 'sulphur_deep'];

// --- RIG A: THE REGISTRY + THE SEAL + THE SHAPE --------------------------------------
{
  const lane = UNDER_TIER_LANES.cistern;
  check('A1 the cistern lane registers as a GROTTO with an OFFERED seat (never a hunt, never a lattice)',
    !!lane && !!lane.grotto && lane.grotto.seat === 'offered' && lane.grotto.water === 'cistern_water'
    && lane.duct === 'cistern_shore' && lane.well === 'cistern_well' && lane.stairKind === 'cistern_stair');
  check('A2 packSplit 0: the cistern\'s population is AUTHORED, no dealt surface packs', lane?.packSplit === 0);
  check('A3 the forbid list names every basin water (the chamber bores under crust, never under water)',
    ['sulphur_shelf', 'sulphur_deep', 'sulphur_pool', 'prism_pool', 'mudpot', 'water', 'lake_shallows', 'lake_deep', 'deep_water']
      .every(k => lane?.forbid?.includes(k) === true));
  let family = true, sealed = true, lidFaces = true;
  for (const id of CISTERN_KINDS) {
    const rk = regionKind(id) as unknown as Record<string, unknown> | undefined;
    family = family && !!rk && rk.walkable === true && rk.tier === 1;
    if (id !== 'cistern_well') lidFaces = lidFaces && !!rk && rk.visual === undefined && rk.tierVisual !== undefined && !rk.tierLink;
    for (const leak of ['standStatus', 'standStatusDeep', 'enterStatus', 'pathCost', 'severity', 'douses',
      'survival', 'surfaceWake', 'standDamage', 'boundaryPolicy', 'moveScale'] as const) {
      if (rk && rk[leak] !== undefined) sealed = false;
    }
  }
  check('A4 the family: floor to the story, lid to the surface', family);
  check('A5 THE LID LAW: no story row shows a surface face (the shoal keeps its crust)', lidFaces);
  check('A6 THE SEAL: no gameplay field on any cistern row (the grid region-sense is tier-blind — leak-proof by construction is the only honest seal)', sealed);
  const well = regionKind('cistern_well');
  check('A7 the well is the ONE crossing and the one row that reads from above',
    !!well?.tierLink && !!well?.walkable && well?.tier === 1 && !!well?.visual
    && linkSpanOf(well!).join(':') === '0:1'
    && linkFlipTier('cistern_well', 0) === 1 && linkFlipTier('cistern_well', 1) === 0);
  check('A8 the heart face ships the dial (a DIAL — raised above the mere\'s "occasionally")',
    FACE_PARAMS.underTier === 'cistern' && typeof FACE_PARAMS.underTierChance === 'number'
    && (FACE_PARAMS.underTierChance as number) > 0 && (FACE_PARAMS.underTierChance as number) < 1
    && !Object.values(TILESETS).some(t => t.id !== 'sulphur_pools'
      && (t.layoutParams as Record<string, unknown> | undefined)?.underTier === 'cistern'));
  const lair = lairOf('cistern_crone');
  const court = landmarkOf('crone_court');
  check('A9 the lair row wears the underLane rung on the heart face of the scald country',
    lair?.seat.underLane === 'cistern' && lair?.seat.place === 'surface'
    && lair?.seat.biomes.length === 1 && lair?.seat.biomes[0] === 'scald'
    && lair?.seat.tilesets?.length === 1 && lair?.seat.tilesets[0] === 'sulphur_pools'
    && (lair?.seat.chance ?? 0) > 0 && lair?.landmark === 'crone_court');
  check('A10 the court landmark: den_mouth on the STORY (siteTier 1), the font its inert mouth, THE LIQUID SEAT on the water, EXACTLY one crone',
    !!court && court.builder === 'den_mouth' && court.siteTier === 1
    && court.params?.mouthKind === 'cistern_font' && court.params?.liquidSeat === 'cistern_water'
    && court.spawns?.where === 'liquid' && court.spawns.count[0] === 1 && court.spawns.count[1] === 1
    && court.spawns.table.length === 1 && court.spawns.table[0].id === 'cistern_crone');
  // THE SYMMETRIC REFUSAL: the standing chokepoints (no lane) never seat
  // the court; the lane's own resolution seats ONLY lane rows; the mere's
  // lane never sees it.
  const ground = { place: 'surface' as const, biome: 'scald', tileset: 'sulphur_pools', level: 12, caveDepth: 0, biomeDepth: 0.8 };
  const plain = lairLandmarkRolls(ground).map(r => r.landmark);
  const laned = lairLandmarkRolls({ ...ground, underLane: 'cistern' }).map(r => r.landmark);
  const mered = lairLandmarkRolls({ ...ground, underLane: 'mere' }).map(r => r.landmark);
  check('A11 laneless ground never seats the court (the chokepoint refusal)', !plain.includes('crone_court'));
  check('A12 the lane resolves the court and ONLY lane rows; another lane never sees it',
    laned.includes('crone_court') && laned.every(l => l === 'crone_court') && !mered.includes('crone_court'),
    `laned=[${laned.join(',')}] plain=[${plain.join(',')}] mere=[${mered.join(',')}]`);
  check('A13 the other face of the country never resolves the row (tilesets gate)',
    !lairLandmarkRolls({ ...ground, tileset: 'geyser_fields', underLane: 'cistern' }).map(r => r.landmark).includes('crone_court'));
  // THE CRONE's def nets.
  const crone = MONSTERS.cistern_crone;
  check('A14 the crone: coven (diplomacy-silent, tongue in both mills), lair alpha not boss, pays the lair hoard, a duty post',
    !!crone && crone.faction === 'coven' && crone.bossBar === true && !crone.boss
    && crone.loot === 'lair_hoard' && !!LOOT_TABLES.lair_hoard && crone.post === true);
  check('A15 the crone is ROOTED on the cistern water, wears mods both sides, and a rooted tell (the honesty law)',
    crone?.rooted?.ground?.length === 1 && crone.rooted.ground[0] === 'cistern_water'
    && crone.rooted.mods.length > 0 && (crone.rooted.off?.length ?? 0) > 0
    && !!crone.tells?.some(t => t.source === 'rooted'));
  const manaPool = crone?.base.mana ?? 0;
  check('A16 every crone skill is real, hinted for the AI, and affordable from her own pool',
    !!crone && crone.skills.length >= 4 && crone.skills.every(id => !!SKILLS[id] && !!SKILLS[id].ai && SKILLS[id].manaCost <= manaPool),
    crone?.skills.join(','));
  check('A17 THE NO-TAG LAW: a finite kite budget (she commits or the fight comes to her)',
    typeof crone?.brain?.tempo?.kite === 'number' && crone.brain.tempo.kite > 0 && crone.brain.tempo.kite < 10);
  const boil = SKILLS.cistern_boil;
  const bd = boil?.delivery as StormDelivery | undefined;
  check('A18 THE BOIL: a GROUNDED storm strike centred on the crone — the water named, a ≥1.5s broil telegraph, one strike, no scatter, NEVER sky (the tier law seals it)',
    !!bd && bd.type === 'storm' && !!bd.onGround?.includes('cistern_water') && (bd.telegraph ?? 0) >= 1.5
    && bd.castRange === 0 && bd.areaRadius === 0 && (Array.isArray(bd.count) ? bd.count[0] === 1 && bd.count[1] === 1 : bd.count === 1)
    && bd.sky === undefined && bd.atEnemies === undefined
    && boil.effects.some(e => e.type === 'damage') && boil.effects.some(e => e.type === 'status' && e.status === 'scalded')
    && !!boil.baseDamage?.fire);
  check('A19 the undertow reels (a DRAG grab on a fire line) and the veil conjures the fog word for allies',
    SKILLS.scald_undertow?.effects.some(e => e.type === 'grabSeize' && e.grab.verb === 'drag') === true
    && SKILLS.steam_veil?.effects.some(e => e.type === 'conjure' && !!e.grants?.some(g => g.status === 'fogveiled' && g.side === 'allies')) === true);
  const fauna = (lane?.grotto?.fauna ?? []).map(f => f.id);
  check('A20 the residents are the shelf\'s own kin (matrons, minnows, lampreys) — registered defs, no strangers',
    fauna.length === 3 && COURT.every(id => fauna.includes(id)) && fauna.every(id => !!MONSTERS[id]));
  check('A21 THE DESCENT LEDGER: the lane books cistern_entered; the mere books nothing',
    lane?.ledgerOnDescend === 'cistern_entered' && laneLedgerOnDescend('cistern') === 'cistern_entered'
    && laneLedgerOnDescend('mere') === undefined && laneLedgerOnDescend(undefined) === undefined);
  check('A22 THE SHAPE PIN: the GROTTO path shipped — no tileset seats the court as an in-zone landmark (the fallback was not taken)',
    !Object.values(TILESETS).some(t => (t.landmarks ?? []).some(r => r.landmark === 'crone_court')));
  check('A23 the lane stands only on the heart face: no other tileset names it',
    !Object.values(TILESETS).some(t => t.id !== 'sulphur_pools'
      && (t.layoutParams as Record<string, unknown> | undefined)?.underTier === 'cistern'));
}

// --- Layout harness (probe_lake's heart-face idiom) ---------------------------------
const ARENA = { w: 4400, h: 3200 }; // a mid-to-large lake (the face's band [3600,4600]×[2600,3400]; live mints run larger)
const entry = vec(120, ARENA.h / 2);
const exits = [vec(ARENA.w - 40, ARENA.h * 0.4), vec(ARENA.w * 0.5, 40), vec(ARENA.w * 0.3, ARENA.h - 40)];
function faceDef(id: string, seed: number, params: Record<string, unknown>): ZoneDef {
  return {
    id, name: `QA ${id}`, level: 12, seed,
    biome: 'scald', size: { w: ARENA.w, h: ARENA.h }, theme: FACE.theme, layout: FACE.layout,
    layoutType: 'lakeshore', layoutParams: params,
    exits: [], map: { x: 2, y: 2 }, objective: { kind: 'clear' },
    tileset: 'sulphur_pools', geo: { biomeDepth: 0.8 },
  } as unknown as ZoneDef;
}
function gen(id: string, seed: number, params: Record<string, unknown>): { out: GeneratedLayout; def: ZoneDef } {
  const def = faceDef(id, seed, params);
  const out = generateLayout(def, { w: ARENA.w, h: ARENA.h }, new Rng(seed), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)));
  return { out, def };
}
const FORCED = { ...FACE_PARAMS, underTierChance: 1 };
interface Census {
  water: Vec2[]; shore: Vec2[]; wellCells: Vec2[]; lidHole: number; orphan: number;
  /** Lake water cells (shelf/deep) painted over a planned water class — and
   *  planned water cells that lost their water (the lake must keep it all). */
  waterLost: number;
}
function census(out: GeneratedLayout, plan?: { classes: Uint8Array; cols: number }): Census | null {
  const g = out.walk;
  if (!(g instanceof GridWalkField)) return null;
  const cs = g.cell;
  const water: Vec2[] = [], shore: Vec2[] = [], wellCells: Vec2[] = [];
  let lidHole = 0, waterLost = 0;
  const at = (gx: number, gy: number): string => g.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
  for (let gy = 0; gy < g.rows; gy++) {
    for (let gx = 0; gx < g.cols; gx++) {
      const k = at(gx, gy);
      if (plan) {
        const pk = plan.classes[gy * plan.cols + gx];
        if ((pk === LAKE_CELL.shelf || pk === LAKE_CELL.deep) && !WATER_ROWS.includes(k)) waterLost++;
      }
      if (!(CISTERN_KINDS as readonly string[]).includes(k)) continue;
      const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
      if (k === 'cistern_water') water.push(vec(x, y));
      else if (k === 'cistern_shore') shore.push(vec(x, y));
      else wellCells.push(vec(x, y));
      if (!g.isWalkable(x, y)) lidHole++;
    }
  }
  const seen = new Uint8Array(g.cols * g.rows);
  const q: number[] = [];
  for (let gy = 0; gy < g.rows; gy++) {
    for (let gx = 0; gx < g.cols; gx++) {
      if (tierLinkOf(at(gx, gy))) { const n = gy * g.cols + gx; if (!seen[n]) { seen[n] = 1; q.push(n); } }
    }
  }
  for (let h = 0; h < q.length; h++) {
    const c = q[h], cx = c % g.cols, cy = Math.floor(c / g.cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= g.cols || ny >= g.rows) continue;
      const n = ny * g.cols + nx;
      if (seen[n] || !tierFloorAt(at(nx, ny), 1)) continue;
      seen[n] = 1; q.push(n);
    }
  }
  let orphan = 0;
  for (let gy = 0; gy < g.rows; gy++) {
    for (let gx = 0; gx < g.cols; gx++) {
      const k = at(gx, gy);
      if (tierFloorAt(k, 1) && !tierLinkOf(k) && !seen[gy * g.cols + gx]) orphan++;
    }
  }
  return { water, shore, wellCells, lidHole, orphan, waterLost };
}
const fp = (o: GeneratedLayout): string => {
  const g = o.walk as GridWalkField;
  let s = o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}:${(d as { tier?: number }).tier ?? 0}`).join('|');
  s += '#' + (o.landmarkSpawns ?? []).map(r => `${r.id}:${Math.round(r.pos.x)},${Math.round(r.pos.y)}:${r.tier ?? 0}`).join('|');
  for (let gy = 0; gy < g.rows; gy += 2) for (let gx = 0; gx < g.cols; gx += 2) s += g.regionAt(gx * g.cell + 15, gy * g.cell + 15).length;
  return s;
};

// --- RIG B: THE CARVE (forced sweep) --------------------------------------------------
{
  const SEEDS = [937001, 937002, 937003, 937004, 937005, 937006, 937007, 937008];
  let shoals = 0, carved = 0, oneMouth = 0, underShoal = 0, wellOnShoal = 0, waterKept = 0, shoalHonest = 0;
  let declared = 0, orphans = 0, lidHoles = 0, roads = 0, faunaGood = 0, cellsIffStair = 0;
  for (const seed of SEEDS) {
    const id = `qa_cistern_${seed}`;
    const { out, def } = gen(id, seed, FORCED);
    const plan = LAKE_PLANS.get(id);
    const sh0 = plan?.isles.find(i => i.shoal);
    if (plan?.shoalAt && sh0) shoals++;
    // THE SHOAL IS HONEST: it stands at or above its floor radius, and when it
    // does NOT stand the lake's widest band was too narrow for the floor (+ a
    // little slack for the span-min and the arrival clearance) — never a
    // lake that could have held it and did not.
    if (plan) {
      let maxBand = 0;
      for (let i = 0; i < 64; i++) { const th = (i / 64) * Math.PI * 2; maxBand = Math.max(maxBand, plan.rimAt(th) - plan.deepAt(th)); }
      const floor = 2 * LAKE_CFG.shoal.r[0] + 2 * LAKE_CFG.shoal.gap;
      if (sh0 ? sh0.r >= LAKE_CFG.shoal.r[0] - 0.5 : maxBand < floor + 120) shoalHonest++;
    }
    const st = census(out, plan);
    const stairs = out.doodads.filter(d => d.kind === 'cistern_stair');
    const cells = st ? st.water.length + st.shore.length + st.wellCells.length : 0;
    if ((cells > 0) === (stairs.length === 1)) cellsIffStair++;
    if (!st || cells === 0) continue; // the seat honestly declined
    carved++;
    orphans += st.orphan;
    lidHoles += st.lidHole;
    if (st.waterLost === 0) waterKept++;
    if (stairs.length === 1 && st.wellCells.length > 0
      && st.wellCells.every(c => Math.hypot(c.x - stairs[0].pos.x, c.y - stairs[0].pos.y) < 75)) oneMouth++;
    const sh = plan?.isles.find(i => i.shoal);
    if (sh && plan?.shoalAt) {
      const all = [...st.water, ...st.shore, ...st.wellCells];
      const cs = (out.walk as GridWalkField).cell;
      if (all.every(c => Math.hypot(c.x - sh.pos.x, c.y - sh.pos.y) <= sh.r + cs * 0.75)) underShoal++;
      if (Math.hypot(stairs[0].pos.x - sh.pos.x, stairs[0].pos.y - sh.pos.y) <= sh.r) wellOnShoal++;
    }
    if (def.tiers?.kind === 'under' && def.tiers?.exposure === 'covered'
      && def.tiers?.lane === 'cistern' && def.tiers?.packSplit === 0) declared++;
    if (st.water.length >= 4 && st.shore.length >= 12
      && storyReachable(out.walk as GridWalkField, entry, st.water[0], 1)) roads++;
    const rows = (out.landmarkSpawns ?? []).filter(r => COURT.includes(r.id));
    if (rows.length >= 4 && rows.every(r => r.tier === 1)
      && rows.every(r => tierFloorAt((out.walk as GridWalkField).regionAt(r.pos.x, r.pos.y), 1))) faunaGood++;
  }
  check('B1 THE GREAT SHOAL stands in most lakes at this size, and HONESTLY: at its floor radius or above, and absent only where the widest band could not hold it', shoals >= 5 && shoalHonest === SEEDS.length, `${shoals}/${SEEDS.length} honest ${shoalHonest}/${SEEDS.length}`);
  check('B2 the cistern carves under most lakes', carved >= 4, `${carved}/${SEEDS.length}`);
  check('B3 ONE entryway — one stair on one well (the ruling\'s word, structural)', oneMouth === carved, `${oneMouth}/${carved}`);
  check('B4 THE CHAMBER UNDER THE SHOAL: every cistern cell lies within the shoal\'s disc', underShoal === carved, `${underShoal}/${carved}`);
  check('B5 THE WELL ON THE SHOAL: the one stair stands on the shoal (reached by wading the shelf)', wellOnShoal === carved, `${wellOnShoal}/${carved}`);
  check('B6 THE LAKE KEEPS ITS WATER: no planned shelf/deep cell lost its water to the story', waterKept === carved, `${waterKept}/${carved}`);
  check('B7 carved lakes DECLARE covered/under/lane + packSplit 0', declared === carved, `${declared}/${carved}`);
  check('B8 no orphan story cell anywhere', orphans === 0, `orphans=${orphans}`);
  check('B9 THE LID stands walkable over every cistern cell, every mint', lidHoles === 0, `holes=${lidHoles}`);
  check('B10 the story road reaches the pool from the arrival (wade the shelf, take the well)', roads === carved, `${roads}/${carved}`);
  check('B11 the residents are tier-stamped court kin on their own floor', faunaGood === carved, `${faunaGood}/${carved}`);
  check('B12 cells ⇔ one stair: never a half-cistern (all-or-nothing by construction)', cellsIffStair === SEEDS.length, `${cellsIffStair}/${SEEDS.length}`);
  // ABSENT == IDENTICAL: without the dial the lake mints NO shoal and NO story.
  {
    const { underTier: _u, underTierChance: _c, ...bare } = FACE_PARAMS;
    void _u; void _c;
    const id = 'qa_cistern_bare';
    const { out, def } = gen(id, 937001, bare);
    const plan = LAKE_PLANS.get(id);
    const st = census(out, plan);
    check('B13 absent == identical: no dial → no great shoal, no story, no tiers, no court kin rows',
      !!plan && !plan.shoalAt && !plan.isles.some(i => i.shoal)
      && (st === null || (st.water.length === 0 && st.shore.length === 0 && st.wellCells.length === 0))
      && def.tiers === undefined
      && !(out.landmarkSpawns ?? []).some(r => COURT.includes(r.id) || r.id === 'cistern_crone')
      && !out.doodads.some(d => d.kind === 'cistern_stair'));
  }
  // THE OFFER WITHOUT THE ROLL: the dial at chance 0 mints the shoal (held
  // out, honest geography) and no story.
  {
    const id = 'qa_cistern_unrolled';
    const { out, def } = gen(id, 937001, { ...FACE_PARAMS, underTierChance: 0 });
    const plan = LAKE_PLANS.get(id);
    const st = census(out, plan);
    check('B14 the offer without the roll: chance 0 → the shoal stands, no story, no tiers',
      !!plan?.shoalAt && !!plan.isles.some(i => i.shoal)
      && (st === null || (st.water.length === 0 && st.shore.length === 0 && st.wellCells.length === 0))
      && def.tiers === undefined && !out.doodads.some(d => d.kind === 'cistern_stair'));
  }
  const a = gen('qa_cistern_det', 937009, FORCED);
  const b = gen('qa_cistern_det', 937009, FORCED);
  check('B15 the cistern is byte-deterministic (doodads + regions + spawn rows)', fp(a.out) === fp(b.out));
}

// --- RIG C: THE COURT (bias-forced) ---------------------------------------------------
{
  const SEEDS = [938001, 938002, 938003, 938004, 938005, 938006];
  let courts = 0, seated = 0, dressed = 0, clearOfStair = 0, reach = 0, oneCrone = 0, inWater = 0, tried = 0;
  for (const seed of SEEDS) {
    const id = `qa_cistern_court_${seed}`;
    const { out } = gen(id, seed, { ...FORCED, underLairBias: 1e6 });
    tried++;
    const st = census(out);
    if (!st || st.wellCells.length === 0) continue;
    const font = out.doodads.find(d => d.kind === 'cistern_font');
    if (!font) continue;
    courts++;
    const g = out.walk as GridWalkField;
    if ((font as { tier?: number }).tier === 1 && tierFloorAt(g.regionAt(font.pos.x, font.pos.y), 1)) seated++;
    const dress = out.doodads.filter(d => (d.kind === 'cistern_bloom' || d.kind === 'bone_pile')
      && (d as { tier?: number }).tier === 1
      && Math.hypot(d.pos.x - font.pos.x, d.pos.y - font.pos.y) < 140);
    if (dress.length >= 2) dressed++;
    const stair = out.doodads.find(d => d.kind === 'cistern_stair');
    if (stair && Math.hypot(stair.pos.x - font.pos.x, stair.pos.y - font.pos.y) >= TIER_CFG.grotto.lairSeatClear - 25) clearOfStair++;
    if (storyReachable(g, entry, font.pos, 1)) reach++;
    const crones = (out.landmarkSpawns ?? []).filter(r => r.id === 'cistern_crone');
    if (crones.length === 1) oneCrone++;
    if (crones.length === 1 && crones[0].tier === 1 && g.regionAt(crones[0].pos.x, crones[0].pos.y) === 'cistern_water') inWater++;
  }
  check('C1 the forced court stands in most cisterns', courts >= 4, `${courts}/${tried}`);
  check('C2 the font is the STORY\'s (tier-stamped, on its own floor)', seated === courts, `${seated}/${courts}`);
  check('C3 the court wears its dress on the story', dressed === courts, `${dressed}/${courts}`);
  check('C4 the court keeps clear of the one stair (the way out survives)', clearOfStair === courts, `${clearOfStair}/${courts}`);
  check('C5 the story road reaches the court', reach === courts, `${reach}/${courts}`);
  check('C6 EXACTLY one crone per court (by count, never by weight)', oneCrone === courts, `${oneCrone}/${courts}`);
  check('C7 THE LIQUID SEAT ON A REGION: the crone boots IN the cistern water, on the story', inWater === courts, `${inWater}/${courts}`);
}

// --- RIG D: THE LIVE SEAL + THE BOIL (a real World) ------------------------------------
// THE OFF-STREAM LAW: the surrounding world's unseeded dice are pinned so
// the halo mints around the probe zone can never wobble another rig.
withSeededRandom(0x3c15e7, () => {
  const account = makeAccount();
  const manifest = buildManifest(account, 4321);
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  const wa = w as unknown as {
    zoneMap: Record<string, ZoneDef>; nextGenId: number; walk: GridWalkField;
    player: Actor;
    actors: Actor[];
    zones: { pos: Vec2; radius: number; delay: number; exploded: boolean; onGround?: string[]; caster: Actor }[];
    ledger: Record<string, number>;
  };
  w.devTravelTo(HUB_ZONE);
  const hub = wa.zoneMap[HUB_ZONE];
  let vz: ZoneDef | null = null;
  for (let i = 0; i < 6 && !vz; i++) {
    const id = `probe_cistern_live_${i}`;
    const z = placeZoneAt({ x: hub.map.x + 90 + i * 60, y: hub.map.y + 60 }, hub, wa.zoneMap, wa.nextGenId++, {
      id, tileset: 'sulphur_pools', objective: { kind: 'clear' }, seed: (0x3c10b1 + i * 7919) >>> 0,
      layoutType: 'lakeshore',
      layoutParams: { ...FACE_PARAMS, underTierChance: 1, underLairBias: 1e6 },
    });
    wa.zoneMap[id] = z;
    z.level = 12; // the crone's seat asks level 8+ (the hub's halo sits at ~2) — the fold reads the def's level
    w.devTravelTo(id);
    if (z.tiers?.lane === 'cistern' && wa.actors.some(a => a.defId === 'cistern_crone')) vz = z;
  }
  check('D0 a live lake carries the cistern and its crone', !!vz, vz ? vz.id : 'no carve+court in 6 seeds');
  if (vz) {
    const g = wa.walk;
    const tick = (secs: number): void => { for (let t = 0; t < secs; t += 1 / 30) w.update(1 / 30); };
    const tickAI = (secs: number, until?: () => boolean): void => {
      for (let t = 0; t < secs; t += 1 / 30) {
        for (const a of wa.actors) updateAI(a, w, 1 / 30);
        w.update(1 / 30);
        if (until?.()) return;
      }
    };
    const crone = wa.actors.find(a => a.defId === 'cistern_crone')!;
    check('D1 the crone stands on the story, IN her pool', crone.tier === 1 && g.regionAt(crone.pos.x, crone.pos.y) === 'cistern_water');
    tick(0.6);
    check('D2 THE GRID ROOT: standing on the painted pool she reads ROOTED (the sheet wears her pool mods)',
      crone.rootedHeld === true, `rootedHeld=${crone.rootedHeld} ground=${crone.groundKind ?? '-'} grid=${crone.gridRegion ?? '-'}`);
    // The pool's cells + a shore cell beside them (for the boil's inverse).
    let W: Vec2 | null = null;
    let S: Vec2 | null = null;
    for (let gy = 0; gy < g.rows && !W; gy++) {
      for (let gx = 0; gx < g.cols; gx++) {
        const x = (gx + 0.5) * g.cell, y = (gy + 0.5) * g.cell;
        if (g.regionAt(x, y) === 'cistern_water') { W = vec(x, y); break; }
      }
    }
    check('D3 the live cistern has pool ground', !!W);
    if (W) {
      // THE QUIET STAGE: every other body leaves — this rig fights one crone.
      const p = wa.player;
      for (const a of wa.actors) {
        if (a === p || a === crone) continue;
        a.dead = true;
      }
      w.update(1 / 30);
      p.pos = vec(W.x, W.y);
      p.tier = 0;
      crone.pos = vec(W.x + 50, W.y);
      crone.tier = 1;
      // The walker arrived through the stinging shelf — shed every carried
      // wound and status before the seal window opens (a ticking sting from
      // the LAKE is not a leak from the CISTERN).
      p.statuses.length = 0;
      p.life = 1e9;
      w.update(1 / 30);
      const life0 = p.life;
      const before = new Set(p.statuses.map(s => s.id));
      let lifeLeak = false, statusLeak = false;
      // THE VICE: the crone's mind runs free but her body is held adjacent
      // BELOW the walker every frame — the strictest seal there is.
      for (let t = 0; t < 4; t += 1 / 30) {
        for (const a of wa.actors) updateAI(a, w, 1 / 30);
        w.update(1 / 30);
        crone.pos = vec(W.x + 50, W.y);
        crone.tier = 1;
        if (p.life < life0) lifeLeak = true;
        if (p.statuses.some(s => !before.has(s.id))) statusLeak = true;
      }
      check('D4 THE SEAL: the surface walker over the pool is UNTOUCHED by the crone below', !lifeLeak, `life ${life0} -> ${p.life}`);
      check('D5 THE SEAL: no cistern status reaches the surface story (none, ever)', !statusLeak, p.statuses.map(s => s.id).join(','));
      // The inverse: one story down the SAME ground is a real fight.
      p.tier = 1;
      crone.pos = vec(W.x + 50, W.y);
      crone.tier = 1;
      let touched = false;
      tickAI(10, () => {
        if (p.life < life0 - 0.5 || p.statuses.some(s => !before.has(s.id))) touched = true;
        return touched;
      });
      check('D6 the fight below is REAL (the crone touches the descended walker)',
        touched, `life ${life0} -> ${p.life} statuses=${p.statuses.map(s => s.id).join(',')}`);
      // THE BOIL (brains frozen — only the verb under test moves): force the
      // cast from the pool, hold the zone against the drawn seats, then let
      // it land on a walker IN the water and on a walker on the SHORE.
      const heal = (): void => { p.statuses.length = 0; p.life = 1e9; w.update(1 / 30); };
      // Brains frozen from here: the real fight used her boil — wait out its
      // cooldown and her cast, then force the verb and tick THROUGH the cast
      // (a monster's useSkill BEGINS the cast; the strike zone is pushed at
      // its completion).
      heal();
      tick(10);
      heal(); // the fight's own pending boil may have landed while we waited
      crone.pos = vec(W.x, W.y); crone.tier = 1; crone.mana = 999;
      p.pos = vec(W.x, W.y); p.tier = 1;
      const inst = makeSkillInstance(SKILLS.cistern_boil, 1);
      crone.skills[0] = inst;
      const cast = w.useSkill(crone, inst, vec(crone.pos.x, crone.pos.y));
      tick(1.2);
      const bz = wa.zones.find(z => z.onGround?.includes('cistern_water') && z.caster === crone && !z.exploded);
      check('D7 THE BOIL casts from the pool as a grounded strike zone (the water named, a telegraph pending)',
        cast && !!bz && bz.delay > 1.5, `cast=${cast} zones=${wa.zones.length}`);
      if (bz) {
        const cells = groundedCellsIn(g, bz.pos, bz.radius, bz.onGround!);
        const allWater = cells.every(c => c.seed !== undefined && g.regionAt(c.x, c.y) === 'cistern_water'
          && Math.hypot(c.x - bz.pos.x, c.y - bz.pos.y) <= bz.radius);
        // A SHORE cell inside the ring — the dry seat the boil must spare.
        let shoreIn: Vec2 | null = null;
        for (let gy = 0; gy < g.rows && !shoreIn; gy++) {
          for (let gx = 0; gx < g.cols; gx++) {
            const x = (gx + 0.5) * g.cell, y = (gy + 0.5) * g.cell;
            if (g.regionAt(x, y) === 'cistern_shore' && Math.hypot(x - bz.pos.x, y - bz.pos.y) <= bz.radius - 12) { shoreIn = vec(x, y); break; }
          }
        }
        S = shoreIn;
        check('D8 DRAWN == TESTED: the roil seats are exactly the pool cells inside the disc (every seat a water cell in reach; a shore cell in the ring is no seat)',
          cells.length >= 3 && allWater && !!S && !cells.some(c => Math.abs(c.x - S!.x) < 1 && Math.abs(c.y - S!.y) < 1),
          `seats=${cells.length} shoreIn=${S ? 'yes' : 'none'}`);
        check('D9 the ramp is pure: uneasy at the first frame, full at the landing',
          Math.abs(boilRamp((bz as { delay: number }).delay, 2.2) - boilRamp(2.2, 2.2)) < 0.3
          && boilRamp(2.2, 2.2) === BOIL_CFG.rampFloor && boilRamp(0, 2.2) === 1 && boilRamp(1.1, 2.2) > BOIL_CFG.rampFloor && boilRamp(1.1, 2.2) < 1);
        // THE WALKER IN THE WATER is scalded at the landing.
        p.pos = vec(W.x, W.y); p.tier = 1;
        const lifeW = p.life;
        tick(3.2);
        const scaldedW = p.life < lifeW - 0.5 || p.statuses.some(s => s.id === 'scalded');
        check('D10 THE BOIL lands on the walker IN the pool (fire + the scald — the water turned lethal)',
          scaldedW && bz.exploded, `life ${lifeW} -> ${p.life} statuses=${p.statuses.map(s => s.id).join(',')}`);
        // THE WALKER ON THE SHORE inside the ring is spared (the grounded strike).
        if (S) {
          heal();
          tick(10); // the crone's cooldown
          crone.mana = 999; crone.pos = vec(W.x, W.y); crone.tier = 1;
          p.pos = vec(S.x, S.y); p.tier = 1;
          const lifeS = p.life;
          const cast2 = w.useSkill(crone, inst, vec(crone.pos.x, crone.pos.y));
          tick(1.2);
          const bz2 = wa.zones.find(z => z.onGround?.includes('cistern_water') && z.caster === crone && !z.exploded);
          tick(3.2);
          check('D11 THE SHORE IS DRY: a walker on the shore inside the ring is spared the boil (drawn == tested, the inverse)',
            cast2 && !!bz2 && bz2.exploded && p.life >= lifeS - 0.01 && !p.statuses.some(s => s.id === 'scalded'),
            `cast=${cast2} life ${lifeS} -> ${p.life} statuses=${p.statuses.map(s => s.id).join(',')}`);
        } else {
          check('D11 THE SHORE IS DRY (no shore cell inside the ring to stand on — the pool fills the disc)', true);
        }
      }
      // THE DESCENT LEDGER: the real crossing — walk the surface hero onto
      // the well and the lane's key is booked.
      heal();
      let wellCell: Vec2 | null = null;
      for (let gy = 0; gy < g.rows && !wellCell; gy++) {
        for (let gx = 0; gx < g.cols; gx++) {
          const x = (gx + 0.5) * g.cell, y = (gy + 0.5) * g.cell;
          if (g.regionAt(x, y) === 'cistern_well') { wellCell = vec(x, y); break; }
        }
      }
      check('D12 the live cistern has its well', !!wellCell);
      if (wellCell) {
        const before = wa.ledger.cistern_entered ?? 0;
        // Start one cell OUTSIDE the well on the shoal's lid (tier 0), walk in.
        const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        let flipped = false;
        for (const [dx, dy] of dirs) {
          const sx = wellCell.x - dx * g.cell * 1.6, sy = wellCell.y - dy * g.cell * 1.6;
          if (!g.isWalkable(sx, sy) || tierLinkOf(g.regionAt(sx, sy))) continue;
          p.pos = vec(sx, sy); p.tier = 0; p.onTierLink = false;
          for (let t = 0; t < 90 && !flipped; t++) {
            w.moveActor(p, dx, dy, 1 / 30);
            w.update(1 / 30);
            if (p.tier >= 1) flipped = true;
          }
          if (flipped) break;
        }
        check('D13 THE DESCENT LEDGER: taking the well down stamps cistern_entered on the run ledger',
          flipped && (wa.ledger.cistern_entered ?? 0) > before, `flipped=${flipped} ledger ${before} -> ${wa.ledger.cistern_entered ?? 0}`);
      }
    }
  }
});

console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
