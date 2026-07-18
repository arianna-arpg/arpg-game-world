// THE SETTLED BELT PROBE — farmland + metropolis pinned structurally
// (engine/settled.ts + data/settled.ts + the biome/tileset/door rows), so the
// pass's laws hold by assertion, not by lucky sweep seeds.
//
// The promises this rig pins:
//   A. THE REGISTRY WEAVE — every row the belt references resolves: biomes +
//      field seeds + the enclave gate, mass kinds/shapes (incl. 'block'),
//      recipes, sidezone doors, the stairwell hollow, wildlife/pack ids,
//      structures — and the hovel/goblin_hut RESKIN LAW (same plan rows).
//   B. THE CROP LAW — wheat/corn are walk-through, shoot-through, SIGHT-
//      eating, veil-concealing; the paved way carries the road's exact
//      clearway contract.
//   C. THE FIELDS LAW — a farmland zone is ONE walkable weave, its roads
//      real (way discs present), exits reachable, byte-deterministic.
//   D. THE DISTRICT LAW — massing faces paint tenement walls + boulevards +
//      lamps and stay ONE weave; blocks faces raise structures from the pool
//      over paved seams; both byte-deterministic.
//   E. THE PASTURE LAW — livestock graze posted and near-blind, wolves prey
//      on them through the hunger drive, a wound ROUTS the sheep; the
//      village watch is a true SENTRY (dormant, walks home displaced,
//      wound-roused, forgiving by NEUTRAL_RESET row).
//   F. THE ASCENSION LAW — city_stair mints 'the Rooms Above' one flight up
//      (sheltered, objective 'none', deterministic id + layout), the garret
//      chain caps at two flights with every stair mouth STRIPPED from the
//      top floor, and the way back down unwinds the ladder.
//
//   npx tsx balance/probe_settled.ts [-- --verbose]

import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/massifs';
import '../src/data/compositions';
import '../src/data/settled';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  doodadRuleOf, generateLayout, hasLayout, type GeneratedLayout,
} from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { massKindOf, massShapeIds } from '../src/engine/massif';
import { BIOMES, BIOME_FIELD, BIOME_FIELD_BANDS, biomeAt } from '../src/world/biomes';
import { boundaryGateOf } from '../src/data/boundaryGates';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS, WILDLIFE } from '../src/data/monsters';
import { STRUCTURES } from '../src/data/structures';
import { sidezoneOf } from '../src/data/sidezones';
import { hollowDef } from '../src/data/hollows';
import { meldOf } from '../src/data/melds';
import { skyOf, type StampSpec, type ZoneDef } from '../src/data/zones';
import { isDormant, NEUTRAL_RESET, updateAI } from '../src/engine/ai';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

// --- RIG A: the registry weave --------------------------------------------------
{
  check('A1 biomes registered', !!BIOMES.farmland && !!BIOMES.metropolis);
  check('A2 field seeds present',
    BIOME_FIELD.some(s => s.biome === 'farmland') && BIOME_FIELD.some(s => s.biome === 'metropolis'));
  check('A3 metropolis is an enclave wearing city_gate',
    BIOMES.metropolis?.enclave?.gate === 'city_gate' && !!boundaryGateOf('city_gate'));
  check('A4 recipes registered', hasLayout('fields') && hasLayout('district'));
  check('A5 block shape registered', massShapeIds().includes('block'));
  for (const k of ['tenement', 'manor', 'croft']) {
    const kind = massKindOf(k);
    check(`A6 mass kind '${k}' seats a registered MASS region`,
      !!kind && !!regionKind(kind.region) && !regionKind(kind.region)?.walkable);
  }
  const ten = regionKind('tenement_wall'), man = regionKind('manor_wall');
  check('A7 tenement/manor walls are TRUE WALLS',
    !!ten && !!ten.blocksShot && !!ten.blocksSight && !!man && !!man.blocksShot && !!man.blocksSight);
  check('A8 ascension doors registered', !!sidezoneOf('city_stair') && !!sidezoneOf('garret_stair'));
  check('A9 stairwell hollow registered', !!hollowDef('stairwell_hollow'));
  check('A10 melds registered', !!meldOf('farmland_meld') && !!meldOf('metropolis_meld'));
  for (const b of ['farmland', 'metropolis']) {
    const bad = (WILDLIFE[b] ?? []).filter(r => !MONSTERS[r.id]).map(r => r.id);
    check(`A11 WILDLIFE['${b}'] ids resolve`, bad.length === 0, bad.join(','));
    const table = TILESETS[b]?.packs.table ?? [];
    const badP = table.filter(r => !MONSTERS[r.id]).map(r => r.id);
    check(`A12 ${b} pack table ids resolve`, table.length > 0 && badP.length === 0, badP.join(','));
  }
  const badT = (TILESETS.townhouse?.packs.table ?? []).filter(r => !MONSTERS[r.id]).map(r => r.id);
  check('A13 townhouse pack table ids resolve', badT.length === 0, badT.join(','));
  for (const s of ['hovel', 'goblin_hut', 'skinners_hut', 'fletchers_range', 'coaching_inn', 'townhouse']) {
    check(`A14 structure '${s}' authored`, !!STRUCTURES[s]?.plan);
  }
  // THE RESKIN LAW: the goblin hut IS the hovel's rows (identity, not copy) —
  // a drifted duplicate would break the one-blueprint promise.
  check('A15 hovel/goblin_hut share ONE plan (reskin doctrine)',
    STRUCTURES.hovel?.plan === STRUCTURES.goblin_hut?.plan
    && STRUCTURES.goblin_hut?.legend?.['#']?.region === 'palisade'
    && STRUCTURES.goblin_hut?.garrison === 'goblin');
  check('A16 freehold faction + relations seated',
    !!MONSTERS.crofter && !!MONSTERS.village_warden && MONSTERS.village_warden.tag === 'freehold_watch');
}

// --- RIG B: the crop + paving laws ----------------------------------------------
{
  for (const k of ['wheat', 'corn_stand']) {
    const r = doodadRuleOf(k);
    check(`B1 ${k} is walk-through veil cover`,
      r.overlap === 'inert' && r.blocksMove === false && r.blocksShot === false
      && r.blocksSight === true && !!r.veil);
    check(`B2 ${k} veil group is 'crop' (never fuses with the woods)`,
      r.veil?.group === 'crop');
  }
  const road = doodadRuleOf('road'), paved = doodadRuleOf('paved_way');
  check('B3 paved_way carries the road\'s exact clearway contract',
    JSON.stringify(paved.clearway) === JSON.stringify(road.clearway) && paved.overlap === 'ground');
  const lamp = doodadRuleOf('street_lamp');
  check('B4 street lamp: solid post, shots pass', lamp.overlap === 'solid' && lamp.blocksMove === true && lamp.blocksShot === false);
}

// --- Layout helpers (probe_massif's harness) ------------------------------------
const arena = { w: 3400, h: 2500 };
const entry = vec(150, arena.h / 2);
const exits = [vec(arena.w - 150, arena.h / 2), vec(arena.w / 2, 150)];
const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };

function defOf(id: string, layoutType: string, layout: StampSpec[], layoutParams: Record<string, unknown>, extra?: Partial<ZoneDef>): ZoneDef {
  return {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout, objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType, layoutParams,
    ...extra,
  } as ZoneDef;
}
function gen(def: ZoneDef, seed: number): GeneratedLayout {
  return generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
}
/** Walkable component count of the OUTDOOR weave: cells inside a placed
 *  structure's footprint are excluded — a roofed room behind its (gen-time
 *  sealed) door is not a stranded pocket, it's a house. The apron law +
 *  genqa's open-doors topology check own the indoor half of the promise. */
function gridStats(out: GeneratedLayout): { comps: number; grid: GridWalkField } | null {
  const grid = out.walk;
  if (!(grid instanceof GridWalkField)) return null;
  const rects = (out.structures ?? []).map(s => s.rect);
  const indoor = (gx: number, gy: number): boolean => {
    const x = gx * grid.cell + grid.cell / 2, y = gy * grid.cell + grid.cell / 2;
    for (const r of rects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  };
  const n = grid.cols * grid.rows;
  const label = new Int32Array(n).fill(-1);
  let comps = 0;
  const q: number[] = [];
  for (let s = 0; s < n; s++) {
    if (grid.mask[s] !== 1 || label[s] >= 0) continue;
    if (indoor(s % grid.cols, Math.floor(s / grid.cols))) continue;
    comps++;
    q.length = 0; q.push(s); label[s] = comps;
    for (let head = 0; head < q.length; head++) {
      const c = q[head];
      const cx = c % grid.cols, cy = Math.floor(c / grid.cols);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= grid.cols || ny >= grid.rows) continue;
        const nc = ny * grid.cols + nx;
        if (grid.mask[nc] !== 1 || label[nc] >= 0 || indoor(nx, ny)) continue;
        label[nc] = comps; q.push(nc);
      }
    }
  }
  return { comps, grid };
}
const fingerprint = (out: GeneratedLayout): string =>
  out.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)},${Math.round(d.radius)}`).join('|');
const kindCount = (out: GeneratedLayout, k: string): number => out.doodads.filter(d => d.kind === k).length;
const regionCells = (grid: GridWalkField, id: string): number => {
  let n = 0;
  for (let gy = 0; gy < grid.rows; gy++) {
    for (let gx = 0; gx < grid.cols; gx++) {
      if (grid.regionAt(gx * grid.cell + grid.cell / 2, gy * grid.cell + grid.cell / 2) === id) n++;
    }
  }
  return n;
};

// --- RIG C: the fields law --------------------------------------------------------
{
  const farm = TILESETS.farmland;
  const base = defOf('qa_fields', 'fields', farm.layout, {
    ...farm.layoutParams,
  });
  let roadsSeen = 0, wheatSeen = 0;
  for (const seed of [777001, 777002, 777003]) {
    const out = gen(base, seed);
    const gs = gridStats(out);
    if (!gs) { check(`C1 fields grid (seed ${seed})`, false, 'no grid'); continue; }
    check(`C1 fields ONE weave (seed ${seed})`, gs.comps === 1, `comps=${gs.comps}`);
    for (const e of exits) {
      check(`C2 exit reachable (seed ${seed})`, gs.grid.reachable(entry, e));
    }
    roadsSeen += kindCount(out, 'road');
    wheatSeen += kindCount(out, 'wheat');
  }
  check('C3 the roads are REAL (way discs laid)', roadsSeen > 30, `discs=${roadsSeen}`);
  check('C4 the crops are REAL (wheat stands laid)', wheatSeen > 0, `wheat=${wheatSeen}`);
  const a = fingerprint(gen(base, 424242)), b = fingerprint(gen(base, 424242));
  check('C5 fields byte-deterministic', a === b && a.length > 0);

  // The harvest-towns face: paved + lamplit + built (variant dials only).
  const towns = farm.variants?.find(v => v.name === 'the harvest towns');
  if (!towns) check('C6 harvest towns face exists', false);
  else {
    const tdef = defOf('qa_towns', 'fields', towns.layout, { ...farm.layoutParams, ...towns.layoutParams });
    const out = gen(tdef, 777004);
    check('C6 the kingsroad is PAVED on the towns face', kindCount(out, 'paved_way') > 10,
      `paved=${kindCount(out, 'paved_way')}`);
    check('C7 the towns face is LAMPLIT', kindCount(out, 'street_lamp') > 0);
    check('C8 the towns face BUILDS (structures raised)', (out.structures?.length ?? 0) > 0,
      `structures=${out.structures?.length ?? 0}`);
  }
}

// --- RIG D: the district law -------------------------------------------------------
{
  const metro = TILESETS.metropolis;
  const massing = defOf('qa_massing', 'district', metro.layout, { ...metro.layoutParams });
  let pavedSeen = 0, lampsSeen = 0;
  for (const seed of [888001, 888002, 888003]) {
    const out = gen(massing, seed);
    const gs = gridStats(out);
    if (!gs) { check(`D1 massing grid (seed ${seed})`, false, 'no grid'); continue; }
    check(`D1 massing ONE weave (seed ${seed})`, gs.comps === 1, `comps=${gs.comps}`);
    const tenCells = regionCells(gs.grid, 'tenement_wall');
    check(`D2 the tenements STAND (seed ${seed})`, tenCells > 120, `cells=${tenCells}`);
    pavedSeen += kindCount(out, 'paved_way');
    lampsSeen += kindCount(out, 'street_lamp');
    // Lamps must stand on ground the weave owns — never plugging a lane.
    for (const d of out.doodads) {
      if (d.kind !== 'street_lamp') continue;
      if (!gs.grid.isWalkable(d.pos.x, d.pos.y)) {
        check('D3 lamp stands on walkable ground', false, `${Math.round(d.pos.x)},${Math.round(d.pos.y)}`);
        break;
      }
    }
  }
  check('D4 boulevards are PAVED', pavedSeen > 30, `paved=${pavedSeen}`);
  check('D5 the ways are LIT', lampsSeen > 0, `lamps=${lampsSeen}`);
  const a = fingerprint(gen(massing, 909090)), b = fingerprint(gen(massing, 909090));
  check('D6 massing byte-deterministic', a === b && a.length > 0);

  const blocksFace = metro.variants?.find(v => v.name === 'the boulevards');
  if (!blocksFace) check('D7 boulevards face exists', false);
  else {
    const bdef = defOf('qa_blocks', 'district', blocksFace.layout, { ...metro.layoutParams, ...blocksFace.layoutParams });
    const out = gen(bdef, 888004);
    check('D7 the planned city BUILDS from the pool', (out.structures?.length ?? 0) >= 3,
      `structures=${out.structures?.length ?? 0}`);
    check('D8 the street seams are PAVED', kindCount(out, 'paved_way') > 40,
      `paved=${kindCount(out, 'paved_way')}`);
    const gs = gridStats(out);
    check('D9 blocks ONE weave', !!gs && gs.comps === 1, `comps=${gs?.comps}`);
    const a2 = fingerprint(gen(bdef, 909091)), b2 = fingerprint(gen(bdef, 909091));
    check('D10 blocks byte-deterministic', a2 === b2 && a2.length > 0);
  }
}

// --- RIG H: THE BELT GUARANTEE ---------------------------------------------------
// The structural promise the field bands exist for: EVERY world seed has its
// capital and its worked land near home — never boom-or-bust. (Pre-band, the
// ~4-cell settled ring lost the roll outright in whole worlds: the live bug
// this rig pins. Downs is moisture-conditional by design — it must claim the
// belt in a healthy share of worlds, not all of them.)
{
  check('H1 field bands registered (civic core + settled belt)',
    BIOME_FIELD_BANDS.some(b => b.id === 'civic_core') && BIOME_FIELD_BANDS.some(b => b.id === 'settled_belt'));
  let worldsWithFarm = 0, worldsWithMetro = 0, worldsWithDowns = 0;
  const SEEDS_H = [11, 22, 33, 44, 55, 66, 77, 88, 99, 110];
  for (const seed of SEEDS_H) {
    let farm = 0, metro = 0, downs = 0;
    for (let r = 60; r <= 640; r += 60) {
      for (let a = 0; a < Math.PI * 2; a += 0.2) {
        const b = biomeAt({ x: Math.round(Math.cos(a) * r), y: Math.round(Math.sin(a) * r) }, seed);
        if (b === 'farmland') farm++;
        else if (b === 'metropolis') metro++;
        else if (b === 'downs') downs++;
      }
    }
    if (farm > 0) worldsWithFarm++;
    if (metro > 0) worldsWithMetro++;
    if (downs > 0) worldsWithDowns++;
    note(`seed ${seed}: farmland ${farm} · metropolis ${metro} · downs ${downs}`);
  }
  check('H2 EVERY world grows farmland near home (the shire ring forces it)',
    worldsWithFarm === SEEDS_H.length, `${worldsWithFarm}/${SEEDS_H.length}`);
  check('H3 EVERY world raises its capital (the civic core forces it)',
    worldsWithMetro === SEEDS_H.length, `${worldsWithMetro}/${SEEDS_H.length}`);
  check('H4 the downs claim their share of worlds (dry-conditional by design)',
    worldsWithDowns >= 5, `${worldsWithDowns}/${SEEDS_H.length}`);
}

// --- SIM RIGS (the live world) -----------------------------------------------------
bootSimEngine();
const world = makeSimWorld('warrior', 777001);
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = world as any;
const homeId: string = w.zone.id;
const leaveToHome = (): void => {
  w.loadZone(homeId);
  w.caveReturn = null;
  w.caveStack = [];
};
const step = (secs: number): void => {
  const dt = 1 / 30;
  for (let t = 0; t < secs; t += dt) {
    for (const a of w.actors) updateAI(a, world, dt);
    w.update(dt);
  }
};
// Park the hero out of every scene's way.
w.player.pos.x = 100; w.player.pos.y = 100;
w.player.invulnerable = true;

// --- RIG E: the pasture law --------------------------------------------------------
{
  const sheep = w.createMonster('wool_sheep', 3, 'enemy');
  sheep.pos.x = 800; sheep.pos.y = 700;
  w.actors.push(sheep);
  const wolf = w.createMonster('plains_wolf', 3, 'enemy');
  wolf.pos.x = 1000; wolf.pos.y = 700;
  w.actors.push(wolf);
  step(0.2); // seed drives, stamp anchors/posts
  check('E1 the sheep is NOT dormant (it grazes, never stands inert)', !isDormant(sheep));
  check('E2 the sheep is posted (hold:false — the graze orbit)', !!sheep.aiPost || !!sheep.aiAnchor);
  wolf.drives.set('hunger', 0.95);
  step(0.2);
  const preyList: string[] | undefined = wolf.aiPrey;
  check('E3 a hungry wolf resolves prey [critter]', !!preyList && preyList.includes('critter'),
    JSON.stringify(preyList));
  check('E4 the hostility gate agrees (isPrey wolf→sheep)', w.isPrey(wolf, sheep) === true);
  // Graze law: over six idle seconds the fold stays NEAR its post (the
  // unbounded idle wander is exactly what the post orbit bounds).
  const sx = sheep.pos.x, sy = sheep.pos.y;
  wolf.drives.set('hunger', 0); // sated — it must NOT hunt during the graze read
  step(6);
  const drift = Math.hypot(sheep.pos.x - sx, sheep.pos.y - sy);
  check('E5 the graze stays bounded (post orbit)', drift < 420, `drift=${Math.round(drift)}px`);
  // Rout law: a wound breaks the placid morale and the sheep RUNS.
  sheep.life = sheep.maxLife() * 0.5;
  wolf.drives.set('hunger', 0.95);
  wolf.pos.x = sheep.pos.x + 60; wolf.pos.y = sheep.pos.y;
  const d0 = Math.hypot(wolf.pos.x - sheep.pos.x, wolf.pos.y - sheep.pos.y);
  step(1.2);
  const d1 = Math.hypot(wolf.pos.x - sheep.pos.x, wolf.pos.y - sheep.pos.y);
  check('E6 a wounded sheep ROUTS (morale break runs it off)',
    sheep.aiMoraleBroke === true || d1 > d0 + 40, `broke=${sheep.aiMoraleBroke} d0=${Math.round(d0)} d1=${Math.round(d1)}`);
  // The watch: a true sentry.
  const warden = w.createMonster('village_warden', 3, 'enemy');
  warden.pos.x = 1600; warden.pos.y = 700;
  w.actors.push(warden);
  step(0.2);
  check('F1 the warden stands DORMANT (freehold_watch is a sentry tag)', isDormant(warden));
  const post = warden.aiPost ?? warden.aiAnchor;
  warden.pos.x = post.x + 220; warden.pos.y = post.y; // shoved off station
  const away0 = Math.hypot(warden.pos.x - post.x, warden.pos.y - post.y);
  step(3);
  const away1 = Math.hypot(warden.pos.x - post.x, warden.pos.y - post.y);
  check('F2 a displaced warden WALKS HOME without waking',
    away1 < away0 - 60 && isDormant(warden), `off=${Math.round(away0)}→${Math.round(away1)}`);
  w.rouseOnWound(warden);
  check('F3 a wound TURNS OUT THE WATCH (rouse row)', warden.aiAwakened === true);
  check('F4 the watch FORGIVES (NEUTRAL_RESET row registered)',
    NEUTRAL_RESET.freehold_watch?.coolDownSecs === 7 && NEUTRAL_RESET.freehold_watch?.disengageDist === 340);
  check('F5 the crofter never starts anything (no kit, milling post)',
    (MONSTERS.crofter.skills.length === 0) && (MONSTERS.crofter.post as { hold?: boolean }).hold === false);
  for (const a of [sheep, wolf, warden]) { a.dead = true; }
  step(0.1);
}

// --- RIG G: the ascension law -------------------------------------------------------
{
  w.player.pos.x = 400; w.player.pos.y = 400;
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 4242, kind: 'city_stair' });
  const floor1: string = w.zone.id;
  check('G1 the stair mints THE ROOMS ABOVE (id shape + name)',
    floor1 === `cave_city_stair_${homeId}_4242` && String(w.zone.name).includes('the Rooms Above'),
    `${floor1} · ${w.zone.name}`);
  check('G2 one flight up (caveDepth 1, sky SHELTERED by derivation)',
    w.zone.caveDepth === 1 && skyOf(w.zone) === 'sheltered');
  check('G3 someone\'s rooms, nobody\'s errand (objective none)',
    w.zone.objective?.kind === 'none');
  const floorPrint = (): string => (w.doodads as { kind: string; pos: { x: number; y: number } }[])
    .map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`).join('|');
  const floor1Doodads = floorPrint();
  // The chain: climb the garret rung from INSIDE the floor.
  w.enterSidezone({ pos: { x: 500, y: 500 }, seed: 555, kind: 'garret_stair' });
  const garret: string = w.zone.id;
  check('G4 the garret rung climbs again (depth 2, named, noDeeper)',
    garret === `cave_garret_stair_${floor1}_555` && w.zone.caveDepth === 2
    && String(w.zone.name).includes('the Garret') && w.zone.noDeeper === true,
    `${garret} · ${w.zone.name}`);
  const strays = (w.doodads as { kind: string }[]).filter(d => d.kind === 'city_stair' || d.kind === 'garret_stair').length;
  check('G5 the top floor lays NO further stairs (the strip law)', strays === 0, `strays=${strays}`);
  check('G6 the ladder unwinds (caveStack carries the way down)',
    Array.isArray(w.caveStack) && w.caveStack.length === 1 && w.caveReturn?.zoneId === floor1);
  leaveToHome();
  // Determinism: the SAME stair is the SAME house, forever.
  w.enterSidezone({ pos: { x: 400, y: 400 }, seed: 4242, kind: 'city_stair' });
  const again: string = w.zone.id;
  const againDoodads = floorPrint();
  check('G7 the same stair is the SAME house (id + layout byte-stable)',
    again === floor1 && againDoodads === floor1Doodads);
  leaveToHome();
  note(`floor fingerprint ${floor1Doodads.slice(0, 80)}…`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
