// THE MOONLIT MERE PROBE — the meadow's under-lake pinned end to end
// (data/merelake.ts + the grotto form in engine/tiers.ts + the underLane
// lair rung in engine/lairs.ts), and above all HER QA ASK, the layer-honesty
// law: "if the player is on the upper layer where the lake is not visible,
// then they should neither see the lake, nor should they be affected by it."
//
//  · RIG A — THE REGISTRY + THE SEAL: the lane/regions/dial/span-row/lair-row
//    weave, and the leak-proof construction — the mere region rows carry NO
//    surface visual and NO gameplay field (standStatus/pathCost/severity/…),
//    so no tier-blind read even EXISTS through which the lake could touch a
//    surface walker. The one entryway (the well) alone shows from above.
//  · RIG B — THE CARVE: forced mints — the chamber stands, EXACTLY ONE
//    stair on EXACTLY ONE well ("one entryway", the ruling's word), covered/
//    under/lane declared, packSplit 0, no orphan story cells, the story road
//    reaches the water, the fauna are tier-stamped merefolk, the lid stays
//    walkable over every mere cell; absent == identical; determinism.
//  · RIG C — THE COURT: the LairSeat.underLane row resolved by the carve
//    (bias-forced): the court stone + dress + spawns all on the story's own
//    floor, clear of the one stair, reachable, the sovereign appears.
//  · RIG D — THE LIVE SEAL (the heart): a real minted meadow in a real
//    World — at midnight the mere stands full; a surface walker standing ON
//    the lid over the water takes no damage and no status from the mere's
//    kin below; the SAME walker one story down is genuinely fought (drawn ==
//    tested on BOTH layers); the water drains to the walkable bed by day and
//    re-forms at nightfall, the surface lid byte-stable through every phase.
//
// Exit 1 on any failure.
//   npx tsx balance/probe_meadowmere.ts

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

import { Rng, withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import { bootSimEngine, classById } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';
import { placeZoneAt } from '../src/engine/worldgen';
import { generateLayout, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { regionKind } from '../src/world/regions';
import { lairLandmarkRolls, lairOf } from '../src/engine/lairs';
import {
  linkFlipTier, linkSpanOf, storyReachable, TIER_CFG, tierFloorAt, tierLinkOf,
  UNDER_TIER_LANES,
} from '../src/engine/tiers';
import { MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { HUB_ZONE } from '../src/data/zones';
import type { StampSpec, ZoneDef } from '../src/data/zones';

bootSimEngine();

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

const MERE_KINDS = ['mere_shore', 'mere_water', 'mere_water_fading', 'mere_bed'] as const;
const MEREFOLK = ['mere_wisp', 'mere_dancer', 'mere_leaper', 'mere_sovereign'];
const NOON = 48, MIDNIGHT = 168; // the dayCycle anchors (probe_radiance's constants)

// --- RIG A: THE REGISTRY + THE SEAL ------------------------------------------------
{
  const lane = UNDER_TIER_LANES.mere;
  check('A1 the mere lane registers as a GROTTO (set piece, never a lattice)',
    !!lane && !!lane.grotto && lane.grotto.water === 'mere_water'
    && lane.duct === 'mere_shore' && lane.well === 'mere_well' && lane.stairKind === 'mere_stair');
  check('A2 packSplit 0: the mere\'s population is AUTHORED, no dealt surface packs',
    lane?.packSplit === 0);
  // The family rows: lid up, floor down, and THE SEAL — no gameplay field at
  // all, so a tier-blind read has nothing to leak through. If a field is
  // ever added, this pin demands the layer-honest audit first.
  let family = true, sealed = true, lidFaces = true;
  for (const id of MERE_KINDS) {
    const rk = regionKind(id) as unknown as Record<string, unknown> | undefined;
    family = family && !!rk && rk.walkable === true && rk.tier === 1 && !rk.tierLink;
    lidFaces = lidFaces && !!rk && rk.visual === undefined && rk.tierVisual !== undefined;
    for (const leak of ['standStatus', 'standStatusDeep', 'enterStatus', 'pathCost',
      'severity', 'douses', 'survival', 'surfaceWake'] as const) {
      if (rk && rk[leak] !== undefined) sealed = false;
    }
  }
  check('A3 the family: floor to the story, lid to the surface', family);
  check('A4 THE LID LAW: no mere row shows a surface face (the lea keeps its own)', lidFaces);
  check('A5 THE SEAL: no gameplay field on any mere row (leak-proof by construction)', sealed);
  const well = regionKind('mere_well');
  check('A6 the well is the ONE crossing and the one row that reads from above',
    !!well?.tierLink && !!well?.walkable && well?.tier === 1 && !!well?.visual
    && linkSpanOf(well!).join(':') === '0:1'
    && linkFlipTier('mere_well', 0) === 1 && linkFlipTier('mere_well', 1) === 0);
  const mp = TILESETS.meadow.layoutParams as Record<string, unknown> | undefined;
  check('A7 the meadow ships the dial ("occasionally" — flagged number)',
    mp?.underTier === 'mere' && typeof mp?.underTierChance === 'number'
    && (mp.underTierChance as number) > 0 && (mp.underTierChance as number) < 0.5);
  const span = (TILESETS.meadow.theme as { spans?: { region: string; when?: { phases?: string[] }; voidRegion?: string; fadeRegion?: string }[] }).spans?.[0];
  check('A8 the ephemerality is the theme\'s span row (condition-held, ratified)',
    !!span && span.region === 'mere_water' && span.voidRegion === 'mere_bed'
    && span.fadeRegion === 'mere_water_fading'
    && !!span.when?.phases?.includes('night') && !!span.when?.phases?.includes('dusk'));
  const lair = lairOf('mere_court');
  const barrow = lairOf('barrow_watch');
  check('A9 the court row wears the underLane rung + the interior axis',
    lair?.seat.underLane === 'mere' && !!lair?.seat.interior
    && lair?.seat.place === 'surface' && lair?.seat.tilesets?.includes('meadow') === true);
  check('A10 the seat chance is RAISED (her word — ≥2× the wild-lair norm)',
    !!lair && !!barrow && lair.seat.chance >= barrow.seat.chance * 2,
    `mere=${lair?.seat.chance} barrow=${barrow?.seat.chance}`);
  // THE SYMMETRIC REFUSAL: the standing chokepoints (no lane) never seat the
  // court; the lane's own resolution seats ONLY lane rows — an ordinary
  // grove lair (the gnoll moot) must refuse there.
  const ground = { place: 'surface' as const, biome: 'grove', tileset: 'meadow', level: 8, caveDepth: 0, biomeDepth: 0.3 };
  const plain = lairLandmarkRolls(ground).map(r => r.landmark);
  const laned = lairLandmarkRolls({ ...ground, underLane: 'mere' }).map(r => r.landmark);
  check('A11 laneless ground never seats the court (the chokepoint refusal)',
    !plain.includes('mere_court'));
  check('A12 the lane resolves the court and ONLY lane rows (no double-seating)',
    laned.includes('mere_court') && laned.every(l => l === 'mere_court'),
    `laned=[${laned.join(',')}] plain=[${plain.join(',')}]`);
  // The kin exist and are the NEW branch (faction merefolk, her palette not
  // the aether's — the fauna and the court tables never name a stranger).
  const fauna = (lane?.grotto?.fauna ?? []).map(f => f.id);
  check('A13 every fauna row and court spawn is a registered merefolk def',
    fauna.length >= 2 && fauna.every(id => MONSTERS[id]?.faction === 'merefolk')
    && MEREFOLK.every(id => !!MONSTERS[id] && MONSTERS[id].faction === 'merefolk'));
}

// --- Layout harness (probe_tiers' gen idiom, meadow-shaped) ------------------------
const arena = { w: 2600, h: 1900 };
const entry = vec(150, arena.h / 2);
const exits = [vec(arena.w - 150, arena.h / 2), vec(arena.w / 2, 150)];
const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
function gen(id: string, layoutParams: Record<string, unknown>, seed: number,
  genOpts?: { shape?: 'rect' | 'ellipse' }): { out: GeneratedLayout; def: ZoneDef } {
  const def = {
    id, name: `QA ${id}`, level: 8, size: { w: arena.w, h: arena.h },
    theme: THEME, layout: TILESETS.meadow.layout as StampSpec[],
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    layoutType: 'plains', layoutParams, seed,
    tileset: 'meadow', geo: { biomeDepth: 0.3 },
    ...(genOpts?.shape ? { shape: genOpts.shape } : {}),
  } as unknown as ZoneDef;
  const out = generateLayout(def, arena, new Rng(seed), entry, exits);
  return { out, def };
}
interface MereCensus {
  water: { x: number; y: number }[]; shore: { x: number; y: number }[];
  wellCells: { x: number; y: number }[]; lidHole: number; orphan: number;
}
function census(out: GeneratedLayout): MereCensus | null {
  const g = out.walk;
  if (!(g instanceof GridWalkField)) return null;
  const cs = g.cell;
  const water: { x: number; y: number }[] = [], shore: { x: number; y: number }[] = [];
  const wellCells: { x: number; y: number }[] = [];
  let lidHole = 0;
  const at = (gx: number, gy: number): string => g.regionAt(gx * cs + cs / 2, gy * cs + cs / 2);
  for (let gy = 0; gy < g.rows; gy++) {
    for (let gx = 0; gx < g.cols; gx++) {
      const k = at(gx, gy);
      if (!(MERE_KINDS as readonly string[]).includes(k) && k !== 'mere_well') continue;
      const x = gx * cs + cs / 2, y = gy * cs + cs / 2;
      if (k === 'mere_water' || k === 'mere_water_fading' || k === 'mere_bed') water.push({ x, y });
      else if (k === 'mere_shore') shore.push({ x, y });
      else wellCells.push({ x, y });
      if (!g.isWalkable(x, y)) lidHole++; // the LID must stand over every mere cell
    }
  }
  // Orphans: every story-1 mere cell must reach a crossing on its own floor.
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
  return { water, shore, wellCells, lidHole, orphan };
}
const fp = (o: GeneratedLayout): string => {
  const g = o.walk as GridWalkField;
  let s = o.doodads.map(d => `${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}:${(d as { tier?: number }).tier ?? 0}`).join('|');
  s += '#' + (o.landmarkSpawns ?? []).map(r => `${r.id}:${Math.round(r.pos.x)},${Math.round(r.pos.y)}:${r.tier ?? 0}`).join('|');
  for (let gy = 0; gy < g.rows; gy += 2) for (let gx = 0; gx < g.cols; gx += 2) s += g.regionAt(gx * g.cell + 15, gy * g.cell + 15).length;
  return s;
};

// --- RIG B: THE CARVE (forced sweep) -----------------------------------------------
{
  let carved = 0, oneMouth = 0, declared = 0, orphans = 0, lidHoles = 0;
  let roads = 0, faunaGood = 0, tried = 0;
  for (const seed of [935001, 935002, 935003, 935004, 935005, 935006]) {
    const { out, def } = gen('qa_mere', { underTier: 'mere', underTierChance: 1 }, seed);
    tried++;
    const st = census(out);
    if (!st || (st.water.length === 0 && st.shore.length === 0)) continue; // the seat honestly declined
    carved++;
    orphans += st.orphan;
    lidHoles += st.lidHole;
    const stairs = out.doodads.filter(d => d.kind === 'mere_stair');
    // ONE entryway, structurally: one stair, standing on the one well.
    if (stairs.length === 1 && st.wellCells.length > 0
      && st.wellCells.every(c => Math.hypot(c.x - stairs[0].pos.x, c.y - stairs[0].pos.y) < 75)) oneMouth++;
    if (def.tiers?.kind === 'under' && def.tiers?.exposure === 'covered'
      && def.tiers?.lane === 'mere' && def.tiers?.packSplit === 0) declared++;
    if (st.water.length >= 4 && st.shore.length >= 12
      && storyReachable(out.walk as GridWalkField, entry, st.water[0], 1)) roads++;
    const rows = (out.landmarkSpawns ?? []).filter(r => MEREFOLK.includes(r.id));
    if (rows.length >= 3 && rows.every(r => r.tier === 1)
      && rows.every(r => tierFloorAt((out.walk as GridWalkField).regionAt(r.pos.x, r.pos.y), 1))) faunaGood++;
  }
  check('B1 the mere carves under most leas', carved >= 4, `${carved}/${tried}`);
  check('B2 ONE entryway — one stair on one well (the ruling\'s word, structural)',
    oneMouth === carved, `${oneMouth}/${carved}`);
  check('B3 carved leas DECLARE covered/under/lane + packSplit 0', declared === carved, `${declared}/${carved}`);
  check('B4 no orphan story cell anywhere', orphans === 0, `orphans=${orphans}`);
  check('B5 THE LID stands walkable over every mere cell, every mint', lidHoles === 0, `holes=${lidHoles}`);
  check('B6 the story road reaches the water from the arrival', roads === carved, `${roads}/${carved}`);
  check('B7 the fauna are tier-stamped merefolk on their own floor', faunaGood === carved, `${faunaGood}/${carved}`);
  // absent == identical (the N9 idiom): a dial-less lea mints FLAT.
  {
    const { out, def } = gen('qa_mere_flat', {}, 935001);
    const st = census(out);
    check('B8 absent == identical: no dial, no mere, no tiers, no merefolk',
      (st === null || (st.water.length === 0 && st.shore.length === 0 && st.wellCells.length === 0))
      && def.tiers === undefined
      && !(out.landmarkSpawns ?? []).some(r => MEREFOLK.includes(r.id)));
  }
  // Determinism: same seed, byte-equal furniture, ground AND fauna rows.
  const a = gen('qa_mere', { underTier: 'mere', underTierChance: 1 }, 935009);
  const b = gen('qa_mere', { underTier: 'mere', underTierChance: 1 }, 935009);
  check('B9 the mere is byte-deterministic (doodads + regions + spawn rows)', fp(a.out) === fp(b.out));
  // THE RIM LAW on ellipse ground: if a mere stands, its dwell fixtures do.
  let placedE = 0, rimE = 0;
  for (const seed of [935021, 935022, 935023, 935024]) {
    const { out } = gen('qa_mere_e', { underTier: 'mere', underTierChance: 1 }, seed, { shape: 'ellipse' });
    const stairs = out.doodads.filter(d => d.kind === 'mere_stair');
    if (!stairs.length) continue;
    placedE++;
    const rx = arena.w / 2 - 28, ry = arena.h / 2 - 28;
    const nx = (stairs[0].pos.x - arena.w / 2) / rx, ny = (stairs[0].pos.y - arena.h / 2) / ry;
    if (nx * nx + ny * ny <= 1) rimE++;
  }
  check('B10 ellipse mints keep the one mouth in-shape (or honestly decline)',
    rimE === placedE, `placed=${placedE} rim=${rimE}`);
}

// --- RIG C: THE COURT (the underLane row, bias-forced) -----------------------------
{
  let courts = 0, dressed = 0, seated = 0, clearOfStair = 0, reach = 0, tried = 0;
  let sovereignSeen = false;
  for (const seed of [936001, 936002, 936003, 936004, 936005, 936006]) {
    const { out } = gen('qa_mere_court', { underTier: 'mere', underTierChance: 1, underLairBias: 1e6 }, seed);
    tried++;
    const st = census(out);
    if (!st || st.wellCells.length === 0) continue;
    const stone = out.doodads.find(d => d.kind === 'mere_court_stone');
    if (!stone) continue;
    courts++;
    const g = out.walk as GridWalkField;
    if ((stone as { tier?: number }).tier === 1 && tierFloorAt(g.regionAt(stone.pos.x, stone.pos.y), 1)) seated++;
    const dress = out.doodads.filter(d => (d.kind === 'mere_bloom' || d.kind === 'standing_stone')
      && (d as { tier?: number }).tier === 1
      && Math.hypot(d.pos.x - stone.pos.x, d.pos.y - stone.pos.y) < 160);
    if (dress.length >= 2) dressed++;
    const stair = out.doodads.find(d => d.kind === 'mere_stair');
    if (stair && Math.hypot(stair.pos.x - stone.pos.x, stair.pos.y - stone.pos.y) >= TIER_CFG.grotto.lairSeatClear - 25) clearOfStair++;
    if (storyReachable(g, entry, stone.pos, 1)) reach++;
    const court = (out.landmarkSpawns ?? []).filter(r =>
      MEREFOLK.includes(r.id) && r.tier === 1 && Math.hypot(r.pos.x - stone.pos.x, r.pos.y - stone.pos.y) < 180);
    if (court.length >= 3) {
      if (court.some(r => r.id === 'mere_sovereign')) sovereignSeen = true;
    }
  }
  check('C1 the forced court stands in most meres', courts >= 4, `${courts}/${tried}`);
  check('C2 the stone is the STORY\'s (tier-stamped, on its own floor)', seated === courts, `${seated}/${courts}`);
  check('C3 the court wears its dress on the story', dressed === courts, `${dressed}/${courts}`);
  check('C4 the court keeps clear of the one stair (the way out survives)', clearOfStair === courts, `${clearOfStair}/${courts}`);
  check('C5 the story road reaches the court', reach === courts, `${reach}/${courts}`);
  check('C6 the sovereign holds court somewhere in the sweep', sovereignSeen);
}

// --- RIG D: THE LIVE SEAL (her QA ask, on a real World) ----------------------------
// THE OFF-STREAM LAW: the surrounding world's unseeded dice are pinned so
// the halo mints around the probe zone can never wobble another rig.
withSeededRandom(0x35a7e1, () => {
  const account = makeAccount();
  const manifest = buildManifest(account, 4321);
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  const wa = w as unknown as {
    zoneMap: Record<string, ZoneDef>; nextGenId: number; walk: GridWalkField;
    player: { pos: { x: number; y: number }; tier?: number; life: number; statuses: { id: string }[] };
    actors: { pos: { x: number; y: number }; tier?: number; defId?: string }[];
    zoneEntry: { x: number; y: number };
  };
  w.devTravelTo(HUB_ZONE);
  const hub = wa.zoneMap[HUB_ZONE];
  // Mint the lea with the mere FORCED through the real spec lane (the
  // probe_radiance idiom) — a couple of seeds in case a seat declines.
  let vz: ZoneDef | null = null;
  for (let i = 0; i < 4 && !vz; i++) {
    const id = `probe_mere_live_${i}`;
    const z = placeZoneAt({ x: hub.map.x + 90 + i * 60, y: hub.map.y + 40 }, hub, wa.zoneMap, wa.nextGenId++, {
      id, tileset: 'meadow', objective: { kind: 'clear' }, seed: (0x35a0b1 + i * 7919) >>> 0,
      layoutType: 'plains',
      layoutParams: { underTier: 'mere', underTierChance: 1 },
    });
    wa.zoneMap[id] = z;
    w.time = MIDNIGHT;
    w.devTravelTo(id);
    w.time = MIDNIGHT;
    if (z.tiers?.lane === 'mere') vz = z;
  }
  check('D0 a live lea carries the mere', !!vz, vz ? vz.id : 'no carve in 4 seeds');
  if (vz) {
    const tick = (secs: number): void => { for (let t = 0; t < secs; t += 1 / 30) w.update(1 / 30); };
    const g = wa.walk;
    let W: { x: number; y: number } | null = null;
    for (let gy = 0; gy < g.rows && !W; gy++) {
      for (let gx = 0; gx < g.cols; gx++) {
        const x = (gx + 0.5) * g.cell, y = (gy + 0.5) * g.cell;
        const k = g.regionAt(x, y);
        if (k === 'mere_water' || k === 'mere_water_fading' || k === 'mere_bed') { W = { x, y }; break; }
      }
    }
    check('D1 the live mere has water ground', !!W);
    if (W) {
      tick(0.6);
      check('D2 midnight: the mere stands FULL', g.regionAt(W.x, W.y) === 'mere_water', g.regionAt(W.x, W.y));
      check('D3 the zone is COVERED and every minted merefolk lives on the story',
        vz.tiers?.exposure === 'covered'
        && wa.actors.filter(a => a.defId && MEREFOLK.includes(a.defId)).length >= 3
        && wa.actors.filter(a => a.defId && MEREFOLK.includes(a.defId)).every(a => a.tier === 1));
      // THE QUIET STAGE (the RIG J idiom): the mint's own fauna leaves —
      // this rig fights one dancer, and the lea's sprites must not muddy
      // the seal's ledger.
      const p = wa.player;
      for (const a of wa.actors) {
        if ((a as unknown) === (p as unknown)) continue;
        (a as unknown as { dead: boolean }).dead = true;
      }
      w.update(1 / 30);
      p.pos = { x: W.x, y: W.y };
      p.tier = 0;
      const d = w.createMonster('mere_dancer', 8, 'enemy');
      d.pos = vec(W.x + 50, W.y);
      d.tier = 1;
      (wa.actors as unknown[]).push(d);
      // Brains are the CALLER's to tick (the main.ts/runner idiom — RIG J's
      // law): tickAI drives every mind, then the world. The dancer hunts or
      // holds on its OWN perception — nothing here primes a target, because
      // whether it can even SEE across the stories is the thing under test.
      const tickAI = (secs: number, until?: () => boolean): void => {
        for (let t = 0; t < secs; t += 1 / 30) {
          for (const a of wa.actors) updateAI(a as unknown as Actor, w, 1 / 30);
          w.update(1 / 30);
          if (until?.()) return;
        }
      };
      const life0 = p.life;
      // THE VICE: the dancer's mind runs free but its body is held adjacent
      // BELOW the walker every frame — the strictest seal there is (a
      // wandering threat would test nothing). The watch is total: any life
      // lost, any status the walker did not already wear, at any tick.
      const before = new Set(p.statuses.map(s => s.id));
      let lifeLeak = false, statusLeak = false;
      for (let t = 0; t < 4; t += 1 / 30) {
        for (const a of wa.actors) updateAI(a as unknown as Actor, w, 1 / 30);
        w.update(1 / 30);
        d.pos = vec(W.x + 50, W.y);
        d.tier = 1;
        if (p.life < life0) lifeLeak = true;
        if (p.statuses.some(s => !before.has(s.id))) statusLeak = true;
      }
      check('D4 THE SEAL: the surface walker over the full mere is UNTOUCHED',
        !lifeLeak, `life ${life0} -> ${p.life}`);
      check('D5 THE SEAL: no mere status reaches the surface story (none, ever)',
        !statusLeak, p.statuses.map(s => s.id).join(','));
      // The inverse: the SAME ground one story down is a real fight — drawn
      // == tested on BOTH layers. The dancer is re-seated beside the walker
      // (the seal window let it drift), then hunts on its OWN perception.
      // Tracked DURING the loop: a transfix or blind that expires, or a
      // wound the regen recovers, must still count as touched.
      p.tier = 1;
      d.pos = vec(W.x + 50, W.y);
      d.tier = 1;
      let touched = false;
      tickAI(10, () => {
        if (p.life < life0 - 0.5 || p.statuses.some(s => !before.has(s.id))) touched = true;
        return touched;
      });
      check('D6 the fight below is REAL (the dancer touches the descended walker)',
        touched, `life ${life0} -> ${p.life} statuses=${p.statuses.map(s => s.id).join(',')}`);
      // Stand down for the phase sweep: the walker surfaces, the dancer is
      // banished, the wounds are dressed.
      d.pos = vec(60, 60);
      p.tier = 0;
      p.life = life0;
      // THE PHASES: day drains the mere to the WALKABLE bed (an ebb first —
      // the slow fade is the telegraph), nightfall re-forms it instantly;
      // the surface lid stands through every face.
      w.time = NOON;
      tick(0.6);
      const ebb = g.regionAt(W.x, W.y);
      check('D7 day breaks: the mere EBBS first (the telegraph)', ebb === 'mere_water_fading', ebb);
      tick(7);
      check('D8 day: the mere drains to the walkable bed',
        g.regionAt(W.x, W.y) === 'mere_bed' && tierFloorAt(g.regionAt(W.x, W.y), 1), g.regionAt(W.x, W.y));
      check('D9 the lid stands through the drain (surface walkable, surface untouched)',
        g.isWalkable(W.x, W.y) && p.life === life0);
      w.time = MIDNIGHT;
      tick(0.6);
      check('D10 nightfall: the mere re-forms instantly', g.regionAt(W.x, W.y) === 'mere_water');
      check('D11 the lid stands through the fill', g.isWalkable(W.x, W.y));
    }
  }
});

console.log(fails ? `\n${fails} FAILURES` : '\nALL PASS');
process.exit(fails ? 1 : 0);
