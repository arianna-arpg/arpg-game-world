// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE AUTHORED-MAP FABRIC (engine/authoredMaps.ts) on the real
// engine, headless: a hand-made zone as data, minted and walked the way every
// lane mints it. Pins the laws the fabric swears:
//   • THE RASTER — the char-grid paints the walk lattice cell-exact (regions
//     by their registered word, the pad beyond the authored rect, run
//     painting), legend doodads land at cell centres, off-lattice doodads /
//     spawn seats / markers / fixtures seat verbatim (offset when the arena
//     is larger than the map).
//   • THE STEMS — every portal the engine seats stands on ground and reaches
//     the authored floor, whatever side it lands on (the way home faces the
//     anchor; a map never knows its side).
//   • THE DETERMINISM LAW — the generator draws no rng: two generations are
//     byte-identical (doodads + the whole kind table), lite keeps geometry.
//   • THE LINT — every registry reference a map can miss is one line.
//   • THE MINT SIDE — authoredZoneSpec pins exact size / rect / recipe /
//     policies; the seal strips every tileset roll, zeroes the pack density,
//     closes the cohort and re-seats the frontier rows on the map's sides.
//   • World.mintAuthoredZone — idempotent on id, sealed def, notarized road,
//     the anchor's veil lifted; the dev mint lands the party on the entry
//     marker; the SpawnSeat tempers spawn at load (count scatter, the rare
//     promotion through the real ladder, the duty post); RE-MINT drops the
//     memory and re-deals the seats (the one-shot forget).
//   • THE QUEST LANE — QuestZoneSpec.map folds the map's words under the
//     quest's own (a quest's tileset wins; its silence defers).
//   • THE EXPEDITION — the bounty kind rolls a charter beside a sane anchor,
//     mints at the take, reads done/annul/copy off the minted def.
//   • THE ATLAS — the custom_ law both ways, the parse gate, upsert/remove
//     graft into the live registry, the TS promotion literal's shape.
// Run: npx tsx balance/probe_authoredmaps.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { generateLayout, hasLayout, type GeneratedLayout } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { placeZoneAt, PORTAL_EDGE_INSET } from '../src/engine/worldgen';
import {
  AUTHORED_MAPS, AUTHORED_LAYOUT, AUTHORED_CFG, MAP_CELL, authoredMapIds, authoredZoneDef,
  authoredZoneSpec, definedSpec, expeditionMaps, mapPixelSize, portalSeat, registerAuthoredMap,
  sealAuthoredZone, unregisterAuthoredMap, validateAuthoredMap, mapCellWalkable,
  type AuthoredMapDef,
} from '../src/engine/authoredMaps';
import { AUTHORED_MAP_LIST, PROVING_YARD, SUNKEN_RELIQUARY } from '../src/data/authoredMaps';
import {
  atlas, ATLAS_PREFIX, findAtlasSquatters, graftAtlasMap, parseAtlasSave, removeAtlasMap,
  serializeMapTS, upsertAtlasMap,
} from '../src/meta/atlas';
import { BOUNTY_KINDS, type BountyPosting, type BountyRollHost } from '../src/data/bountyboard';
import { EXPEDITION_CFG, expeditionZoneId } from '../src/data/bountyExpeditions';
import { MONSTERS } from '../src/data/monsters';
import { QUESTS } from '../src/quests/defs';
import type { QuestDef } from '../src/quests/types';
import type { ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: { x: number; y: number }, b: { x: number; y: number }, tol: number): boolean =>
  Math.hypot(a.x - b.x, a.y - b.y) <= tol;
const captureWarns = (fn: () => void): string[] => {
  const out: string[] = [];
  const orig = console.warn;
  console.warn = (...a: unknown[]): void => { out.push(a.map(String).join(' ')); };
  try { fn(); } finally { console.warn = orig; }
  return out;
};

bootSimEngine();

// --- A. the registry + the lint ---------------------------------------------------
console.log('\n--- A. registry + lint ---');
check('A1 the authored layout is registered under its pin', hasLayout(AUTHORED_LAYOUT) && AUTHORED_LAYOUT === 'authored');
check('A2 both debut maps stand in the registry', authoredMapIds().includes('proving_yard') && authoredMapIds().includes('sunken_reliquary'));
for (const m of AUTHORED_MAP_LIST) {
  const lint = validateAuthoredMap(m);
  check(`A3 shipped map '${m.id}' lints clean`, lint.length === 0, lint.join(' | '));
  check(`A4 shipped map '${m.id}' grid is rows×cols exact`, m.grid.length === m.rows && m.grid.every(r => r.length === m.cols));
}
{
  const bad: AuthoredMapDef = {
    ...PROVING_YARD, id: 'probe_bad', tileset: 'no_such_tileset',
    legend: { ...PROVING_YARD.legend, Q: { region: 'no_such_region' } },
    spawns: [{ id: 'nobody_at_all', x: -5, y: 5, rarity: 'mythic_nonsense' }],
    doodads: [{ kind: 'no_such_doodad', x: 10, y: 10, r: 8 }],
    markers: [{ kind: 'garrison', x: 10, y: 10 }, { kind: 'entry', x: 1, y: 1 }, { kind: 'entry', x: 2, y: 2 }],
    fixtures: [{ structure: 'no_such_structure', x: 5, y: 5 }],
    exits: [{ side: 'n', at: 0.5 }, { side: 'n', at: 0.52 }],
    objective: { kind: 'boss', id: 'no_such_boss' },
    bounty: { level: [9, 3] },
  };
  const lint = validateAuthoredMap(bad);
  const has = (s: string): boolean => lint.some(l => l.includes(s));
  check('A5 lint: unknown tileset', has('unknown tileset'));
  check('A6 lint: unregistered legend region', has('unregistered region'));
  check('A7 lint: unknown monster + outside + unknown rarity', has('unknown monster') && has('outside the map') && has('unknown rarity'));
  check('A8 lint: unknown doodad kind', has('not a registered kind'));
  check('A9 lint: garrison without faction + two entries', has('needs a faction') && has('entry markers'));
  check('A10 lint: unknown structure', has('unknown structure'));
  check('A11 lint: exits seated too close', has('closer than'));
  check('A12 lint: boss not a monster + bounty band', has('is not a monster') && has('bounty level band'));
  check('A13 lint: the good map has none of these', validateAuthoredMap(PROVING_YARD).length === 0);
}
check('A14 the expedition roster gates by level band', expeditionMaps(5).map(m => m.id).join() === 'proving_yard'
  && expeditionMaps(10).length === 2 && expeditionMaps(1).length === 0);

// --- B. the raster (headless generateLayout over the synthetic def) ------------------
console.log('\n--- B. the raster ---');
const gen = (m: AuthoredMapDef, arena: { w: number; h: number }, entry: { x: number; y: number }, exits: { x: number; y: number }[], seed = 7, lite = false): GeneratedLayout => {
  const def = authoredZoneDef(m, { id: `probe_${m.id}`, level: 8, seed });
  return generateLayout(def, arena, new Rng(seed), vec(entry.x, entry.y), exits.map(e => vec(e.x, e.y)), undefined, lite ? { lite: true } : undefined);
};
const ySize = mapPixelSize(PROVING_YARD);
check('B0 the map\'s pixel footprint is cols×cell by rows×cell', ySize.w === 40 * MAP_CELL && ySize.h === 28 * MAP_CELL);
{
  // Arbitrary portals: a west door in the wall ring, an east door, the entry at the centre.
  const entry = vec(ySize.w / 2, ySize.h / 2);
  const exits = [portalSeat('w', 0.5, ySize), portalSeat('e', 0.3, ySize), portalSeat('s', 0.65, ySize)];
  const lay = gen(PROVING_YARD, ySize, entry, exits);
  const g = lay.walk as GridWalkField;
  check('B1 the generator paints a GridWalkField', g instanceof GridWalkField);
  check('B2 the wall ring is wall', g.regionAt(15, 15) === 'wall' && g.regionAt(ySize.w - 15, ySize.h - 15) === 'wall');
  check('B3 the cistern is water', g.regionAt(600, 420) === 'water' && g.regionAt(20 * 30 + 15, 13 * 30 + 15) === 'water');
  check('B4 the court is ground', g.regionAt(600, 100) === 'ground' && g.isWalkable(600, 100));
  check('B5 a chamber wall cell is wall (run painting kept the interior open)', g.regionAt(5 * 30 + 15, 5 * 30 + 15) === 'wall' && g.regionAt(6 * 30 + 15, 5 * 30 + 15) === 'ground');
  const rocks = lay.doodads.filter(d => d.kind === 'rock');
  const rockChars = PROVING_YARD.grid.reduce((n, row) => n + [...row].filter(c => c === 'o').length, 0);
  check('B6 legend doodads land one per char at cell centres', rocks.length === rockChars && rocks.every(r => (r.pos.x - 15) % 30 === 0 && (r.pos.y - 15) % 30 === 0), `${rocks.length}/${rockChars}`);
  check('B7 an off-lattice doodad seats verbatim', lay.doodads.some(d => d.kind === 'brazier' && d.pos.x === 450 && d.pos.y === 330 && d.radius === 14));
  const seats = lay.landmarkSpawns ?? [];
  const bodies = (PROVING_YARD.spawns ?? []).reduce((n, s) => n + (s.count ?? 1), 0);
  check('B8 spawn seats expand to one row per body', seats.length === bodies, `${seats.length}/${bodies}`);
  const keeper = seats.find(s => s.id === 'bandit_keeper');
  check('B9 the keeper\'s row carries its rarity', !!keeper && keeper.rarity === 'rare' && keeper.pos.x === 900 && keeper.pos.y === 630);
  const watches = seats.filter(s => s.post);
  check('B10 posted seats carry post + facing', watches.length === 2 && watches.every(w => w.post === true && w.facing === Math.PI / 2));
  const multi = seats.filter(s => s.id === 'bandit_cutthroat' && near(s.pos, { x: 300, y: 210 }, 60));
  check('B11 a multi-body seat scatters within its spread', multi.length === 3 && multi.some(s => s.pos.x !== 300 || s.pos.y !== 210));
  check('B12 the entry marker is the layout\'s spawnAt', !!lay.spawnAt && lay.spawnAt.x === 600 && lay.spawnAt.y === 765);
  check('B13 poi markers reach ctx.pois', lay.pois.some(p => p.x === 600 && p.y === 420) && lay.pois.length >= 3);
  for (const [i, x] of exits.entries()) {
    check(`B14.${i} portal ${i} stands on ground and reaches the entry`, g.isWalkable(x.x, x.y) && g.reachable(entry, x), `${x.x},${x.y}`);
  }
  check('B15 the entry itself is cleared onto ground', g.isWalkable(entry.x, entry.y));
  // determinism: bytes
  const lay2 = gen(PROVING_YARD, ySize, entry, exits);
  const g2 = lay2.walk as GridWalkField;
  const sameKinds = g.kind.length === g2.kind.length && g.kind.every((v, i) => v === g2.kind[i]);
  check('B16 THE DETERMINISM LAW — two generations are byte-identical', JSON.stringify(lay.doodads) === JSON.stringify(lay2.doodads)
    && JSON.stringify(lay.landmarkSpawns) === JSON.stringify(lay2.landmarkSpawns) && sameKinds);
  const lite = gen(PROVING_YARD, ySize, entry, exits, 7, true);
  check('B17 lite keeps geometry, skips the seats', (lite.walk as GridWalkField).regionAt(600, 420) === 'water' && (lite.landmarkSpawns?.length ?? 0) === 0 && lite.doodads.some(d => d.kind === 'brazier'));
}
{
  // The pad: an arena 240px larger each way — the map centres, everything shifts by 120.
  const arena = { w: ySize.w + 240, h: ySize.h + 240 };
  const lay = gen(PROVING_YARD, arena, vec(arena.w / 2, arena.h / 2), [portalSeat('n', 0.5, arena)]);
  const g = lay.walk as GridWalkField;
  check('B18 ground beyond the authored rect is the pad region', g.regionAt(15, 15) === 'wall' && g.regionAt(60, arena.h - 60) === 'wall');
  check('B19 authored payloads shift with the centred seat', lay.doodads.some(d => d.kind === 'brazier' && d.pos.x === 570 && d.pos.y === 450)
    && !!lay.spawnAt && lay.spawnAt.x === 720 && lay.spawnAt.y === 885);
  check('B20 the shifted cistern still reads water', g.regionAt(720, 540) === 'water');
}
{
  // The reliquary: ramparts, water wading, a boss seat.
  const s = mapPixelSize(SUNKEN_RELIQUARY);
  const lay = gen(SUNKEN_RELIQUARY, s, vec(s.w / 2, s.h - 60), [portalSeat('e', 0.5, s)]);
  const g = lay.walk as GridWalkField;
  check('B21 the reliquary\'s R cells are rampart', g.regionAt(15, 15) === 'rampart' && g.regionAt(4 * 30 + 15, 2 * 30 + 15) === 'rampart');
  check('B22 the nave is water, the causeway ground', g.regionAt(10 * 30 + 15, 11 * 30 + 15) === 'water' && g.regionAt(20 * 30 + 15, 11 * 30 + 15) === 'ground');
  check('B23 the boss marker is the layout\'s bossSeat', !!lay.bossSeat && lay.bossSeat.x === 660 && lay.bossSeat.y === 135);
  check('B24 the east door reaches the nave', g.reachable(vec(s.w / 2, s.h - 60), portalSeat('e', 0.5, s)));
  const piles = lay.doodads.filter(d => d.kind === 'bone_pile').length;
  const pileChars = SUNKEN_RELIQUARY.grid.reduce((n, row) => n + [...row].filter(c => c === 'b').length, 0);
  check('B25 bone piles land one per b', piles === pileChars, `${piles}/${pileChars}`);
}
{
  // A fixture: a plan structure carves this grid (raised after the paint).
  const m: AuthoredMapDef = { ...PROVING_YARD, id: 'probe_fixture', fixtures: [{ structure: 'house_small', x: 600, y: 180 }], spawns: [], doodads: [] };
  registerAuthoredMap(m);
  const lay = gen(m, ySize, vec(600, 700), [portalSeat('s', 0.5, ySize)]);
  const g = lay.walk as GridWalkField;
  unregisterAuthoredMap('probe_fixture');
  check('B26 a fixture raises a plan structure into the authored grid', (lay.structures?.length ?? 0) === 1 && lay.structures![0].defId === 'house_small');
  const st = lay.structures![0];
  const inside = g.regionAt(st.rect.x + st.rect.w / 2, st.rect.y + st.rect.h / 2);
  check('B27 the plan\'s interior is floor, its rim rampart', inside === 'ground' && g.regionAt(st.rect.x + 8, st.rect.y + 8) === 'rampart', `${inside}`);
}
{
  // The missing map: falls back to the scatter with one warning, never throws.
  const def = authoredZoneDef(PROVING_YARD, { id: 'probe_missing', level: 8, seed: 3 });
  def.layoutParams = { authored: 'no_such_map' };
  let threw = false;
  const warns = captureWarns(() => { try { generateLayout(def, ySize, new Rng(3), vec(600, 420), []); } catch { threw = true; } });
  check('B28 an unregistered map id degrades to the scatter with a warning', !threw && warns.some(w => w.includes('no registered authored map')));
}
{
  // Hand-rolled: a cell size of 60 covers both lattice cells.
  const m: AuthoredMapDef = { id: 'probe_big_cell', name: 'big', tileset: 'meadow', cols: 8, rows: 8, cell: 60,
    grid: ['########', '#......#', '#......#', '#..~~..#', '#..~~..#', '#......#', '#......#', '########'] };
  registerAuthoredMap(m);
  const s = mapPixelSize(m);
  const lay = gen(m, s, vec(s.w / 2, 60 + 30), [portalSeat('s', 0.5, s)]);
  const g = lay.walk as GridWalkField;
  unregisterAuthoredMap('probe_big_cell');
  check('B29 a 60px cell paints both lattice cells (water at 4 quadrants)', s.w === 480 && g.regionAt(3 * 60 + 15, 3 * 60 + 15) === 'water' && g.regionAt(3 * 60 + 45, 3 * 60 + 45) === 'water' && g.regionAt(4 * 60 + 45, 4 * 60 + 45) === 'water' && g.regionAt(2 * 60 + 45, 3 * 60 + 15) === 'ground');
  check('B30 mapCellWalkable reads the region\'s own word', mapCellWalkable(m, 1, 1) && !mapCellWalkable(m, 0, 0) && mapCellWalkable(m, 3, 3));
}

// --- C. the mint side --------------------------------------------------------------------
console.log('\n--- C. the mint side ---');
const w = makeSimWorld('warrior', 424242);
{
  const spec = authoredZoneSpec(PROVING_YARD);
  check('C1 the spec pins size, rect, recipe, map id', spec.sizeBand?.w[0] === ySize.w && spec.sizeBand?.w[1] === ySize.w && spec.sizeBand?.h[0] === ySize.h
    && spec.shape === 'rect' && spec.layoutType === AUTHORED_LAYOUT && (spec.layoutParams as { authored: string }).authored === 'proving_yard');
  check('C2 the spec\'s policies: no packs, no war, no weave, the map\'s exits, no blend', spec.packsOverride?.table.length === 0 && spec.noFactionWar === true
    && spec.noWeave === true && spec.forceFrontiers === 1 && spec.blend === null && spec.tileset === 'grand_arena' && spec.name === 'the Proving Yard');
  const over = authoredZoneSpec(PROVING_YARD, definedSpec({ level: 12, tileset: undefined, id: 'x' }));
  check('C3 caller words win; undefined ones defer (definedSpec)', over.level === 12 && over.tileset === 'grand_arena' && over.id === 'x');
  const town = w.zoneMap.lastlight;
  const def = placeZoneAt({ x: town.map.x + 9, y: town.map.y - 7 }, town, w.zoneMap, 7001, authoredZoneSpec(PROVING_YARD, { id: 'probe_spec_mint', level: 5, seed: 99 }));
  check('C4 placeZoneAt honors the pinned footprint', def.size.w === ySize.w && def.size.h === ySize.h && def.shape === 'rect');
  check('C5 the def wears the recipe, the map id, the name, the objective', def.layoutType === AUTHORED_LAYOUT && def.layoutParams?.authored === 'proving_yard'
    && def.name === 'the Proving Yard' && def.objective.kind === 'clear' && (def.objective as { all?: boolean }).all === true);
  check('C6 the def is dressed by the tileset\'s theme, not the special vault', def.theme.floor === w.zoneMap.lastlight.theme.floor ? false : def.theme.floor !== '#0c0710');
  sealAuthoredZone(def, PROVING_YARD);
  check('C7 THE SEAL — no pack density, closed cohort, no rolls, empty layout', def.packDensity === 0 && def.cohort === 'authored' && def.layout.length === 0
    && !def.structures && !def.landmarks && !def.compositions && !def.hollows && !def.annexes && !def.blend);
  const frontiers = def.exits.filter(e => e.to === '?');
  check('C8 THE SEAL re-seats the frontier on the map\'s side', frontiers.length === 1 && frontiers[0].side === 'n' && frontiers[0].at === 0.5);
  check('C9 the back-edge to the anchor stands beside it', def.exits.some(e => e.to === town.id));
  delete w.zoneMap.probe_spec_mint;
  town.exits = town.exits.filter(e => e.to !== 'probe_spec_mint');
}

// --- D. World.mintAuthoredZone + the dev lanes + the seats at load ---------------------------
console.log('\n--- D. the world mint ---');
{
  const town = w.zoneMap.lastlight;
  town.veiled = true; // the anchor's veil must lift
  const def = w.mintAuthoredZone('proving_yard', { id: 'probe_yard', anchor: town, level: 7, seed: 11 });
  check('D1 mintAuthoredZone returns the sealed def in the graph', !!def && w.zoneMap.probe_yard === def && def!.layoutType === AUTHORED_LAYOUT && def!.packDensity === 0 && def!.level === 7);
  check('D2 idempotent on id', w.mintAuthoredZone('proving_yard', { id: 'probe_yard' }) === def);
  check('D3 unknown map → null', w.mintAuthoredZone('no_such_map') === null);
  check('D4 the road is notarized both ways and the anchor unveiled', !town.veiled
    && def!.exits.some(e => e.to === town.id && e.notarized) && town.exits.some(e => e.to === 'probe_yard' && e.notarized));
  w.loadZone('probe_yard');
  const g = w.walk as GridWalkField;
  check('D5 the loaded zone walks the authored grid', g instanceof GridWalkField && g.regionAt(15, 15) === 'wall' && g.regionAt(600, 420) === 'water' && w.arena.w === ySize.w);
  check('D6 the party lands on the entry marker (no back portal)', near(w.player.pos, { x: 600, y: 765 }, 40), `${w.player.pos.x.toFixed(0)},${w.player.pos.y.toFixed(0)}`);
  const bandits = (): Actor[] => w.actors.filter(a => !!a.defId && a.defId.startsWith('bandit_') && !a.dead);
  check('D7 every seat spawned a body', bandits().length === 13, `${bandits().length}`);
  const keeper = bandits().find(a => a.defId === 'bandit_keeper');
  check('D8 the keeper climbed the real ladder', !!keeper && keeper.rarity === 'rare' && near(keeper.pos, { x: 900, y: 630 }, 2));
  const posted = bandits().filter(a => a.aiPost);
  check('D9 the watches stand posted with their facing', posted.length === 2 && posted.every(a => a.postSpec && a.aiPostFacing === Math.PI / 2 && near(a.aiPost!, a.pos, 2)));
  check('D10 the zone underfoot reads as the authored map', w.devAuthoredMapHere() === 'proving_yard');
  // THE ONE-SHOT FORGET: remove a body, re-mint, the seat is re-dealt and no memory lingers.
  const victim = bandits()[0];
  w.actors.splice(w.actors.indexOf(victim), 1);
  check('D11 (setup) one bandit removed', bandits().length === 12);
  const keep = vec(w.player.pos.x, w.player.pos.y);
  check('D12 devRemintZone reloads the zone underfoot', w.devRemintZone() && w.zone.id === 'probe_yard');
  check('D13 re-mint re-deals every seat', bandits().length === 13, `${bandits().length}`);
  check('D14 the party kept its spot', near(w.player.pos, keep, 40));
  const mem = (w as unknown as { zoneMemory: Map<string, unknown> }).zoneMemory;
  check('D15 no memory lingers after the forget', !mem.has('probe_yard'));
  // The dev mint of the reliquary: the boss objective seats the gravecaller at the boss marker.
  const zid = w.devMintAuthored('sunken_reliquary', { level: 9, seed: 5 });
  check('D16 devMintAuthored mints a new node and walks in', !!zid && w.zone.id === zid && w.zone.layoutParams?.authored === 'sunken_reliquary');
  const boss = w.actors.find(a => a.defId === 'gravecaller' && !a.dead);
  check('D17 the boss stands at the boss marker', !!boss && near(boss.pos, { x: 660, y: 135 }, 70), boss ? `${boss.pos.x.toFixed(0)},${boss.pos.y.toFixed(0)}` : 'no boss');
  check('D18 exactly one gravecaller (the objective\'s, no duplicate seat)', w.actors.filter(a => a.defId === 'gravecaller' && !a.dead).length === 1);
  check('D19 the reliquary\'s R cells are rampart in the live zone', (w.walk as GridWalkField).regionAt(15, 15) === 'rampart');
  check('D20 the party lands on the reliquary\'s entry', near(w.player.pos, { x: 660, y: 900 }, 40));
  // Ambient theater patrols may also contain archers. Count the authored
  // population by its engine attribution, then verify both exact shrine posts.
  const archers = w.actors.filter(a => a.fromZoneGen && a.defId === 'skeleton_archer' && !a.dead);
  check('D21 the shrine archers stand posted', archers.length === 2 && [465, 765].every(x => archers.some(a => a.aiPost && a.postSpec && near(a.aiPost, { x, y: 495 }, 1) && near(a.pos, a.aiPost, 1))));
  check('D22 the zone\'s fauna is closed (authored cohort, no biome wildlife table)', Array.isArray(w.zone.fauna) && w.zone.fauna.length === 0 && w.zone.cohort === 'authored');
}

// --- E. the quest lane ---------------------------------------------------------------------
console.log('\n--- E. the quest lane ---');
{
  const cast = w as unknown as { acceptQuest(q: QuestDef): void };
  const q: QuestDef = {
    id: 'probe_q_yard', giver: 'townsfolk_questgiver', offerLabel: 'probe', offerAtLevel: 1,
    zone: { map: 'proving_yard', direction: 'e', level: 6, objective: { kind: 'clear', all: true } },
    reward: {},
  };
  cast.acceptQuest(q);
  const z = w.zoneMap.quest_probe_q_yard;
  check('E1 a quest naming a map mints the authored zone', !!z && z.layoutType === AUTHORED_LAYOUT && z.layoutParams?.authored === 'proving_yard');
  check('E2 the map\'s words stand where the quest is silent', !!z && z.tileset === 'grand_arena' && z.size.w === ySize.w && z.size.h === ySize.h && z.name === 'the Proving Yard' && z.packDensity === 0 && z.cohort === 'authored');
  check('E3 the quest\'s own words win', !!z && z.level === 6 && z.objective.kind === 'clear');
  check('E4 the map\'s exits stand (one north frontier), the quest\'s waypoint stands', !!z && z.exits.filter(e => e.to === '?').length === 1 && z.exits.find(e => e.to === '?')?.side === 'n' && z.waypoint === true);
  const q2: QuestDef = { ...q, id: 'probe_q_yard2', zone: { ...q.zone, tileset: 'crypt' } };
  cast.acceptQuest(q2);
  const z2 = w.zoneMap.quest_probe_q_yard2;
  check('E5 a quest\'s explicit tileset wins over the map\'s dress', !!z2 && z2.tileset === 'crypt' && z2.layoutParams?.authored === 'proving_yard');
  const q3: QuestDef = { ...q, id: 'probe_q_missing', zone: { ...q.zone, map: 'no_such_map', tileset: 'meadow' } };
  const warns = captureWarns(() => cast.acceptQuest(q3));
  const z3 = w.zoneMap.quest_probe_q_missing;
  check('E6 an unregistered map warns and mints the tileset\'s own ground', !!z3 && z3.tileset === 'meadow' && z3.layoutType !== AUTHORED_LAYOUT && warns.some(s => s.includes('unregistered authored map')));
  check('E7 no shipped quest names an unregistered map or both a map and a layout', Object.values(QUESTS).every(qq => (!qq.zone.map || AUTHORED_MAPS[qq.zone.map]) && !(qq.zone.map && qq.zone.layoutType) && (qq.zone.map || qq.zone.tileset)));
  w.activeQuests = w.activeQuests.filter(a => !a.questId.startsWith('probe_q_'));
}

// --- F. the expedition -----------------------------------------------------------------------
console.log('\n--- F. the expedition ---');
{
  const row = BOUNTY_KINDS.expedition;
  check('F1 the expedition kind is registered', !!row && row.weight === EXPEDITION_CFG.weight);
  const town = w.zoneMap.lastlight;
  // A sane anchor inside the seat range (the fresh headless map is nearly bare).
  const anchor: ZoneDef = {
    ...JSON.parse(JSON.stringify(town)) as ZoneDef, id: 'probe_anchor', name: 'the Probe Downs', level: 6,
    map: { x: town.map.x + 120, y: town.map.y + 20 }, objective: { kind: 'clear' }, exits: [{ to: town.id, side: 'w' }],
  };
  delete anchor.kind; delete anchor.waypoint;
  w.zoneMap.probe_anchor = anchor;
  const host: BountyRollHost = {
    view: w.devOverlayView(), zoneMap: w.zoneMap,
    objectiveDone: () => false, visited: id => w.visited.has(id), pickGemId: () => null, answers: () => [],
    igniteReady: () => [], summonsStanding: () => 0, reach: 1, boardZoneId: town.id,
    lean: () => 1, kindClaimed: () => false, playerLevel: 5, boardId: 'lastlight', beat: 3, slateKey: '3', seq: 0,
  };
  check('F2 available at a level a map serves, not below', row.available!(host) && !row.available!({ ...host, playerLevel: 1 }));
  check('F3 a pinned seat refuses (the charter names no standing ground)', row.roll({ ...host, pin: town.id }, new Rng(1), new Set()) === null);
  const p = row.roll(host, new Rng(5), new Set()) as BountyPosting | null;
  // Any sane charted node in the seat range may anchor (the world grew a few
  // beside the town during D); the probe anchor guarantees at least one.
  const anc = p?.expedition ? w.zoneMap[p.expedition.anchor] : undefined;
  check('F4 the roll posts a charter beside a sane anchor in range', !!p && p.kind === 'expedition' && !!anc && !anc.floating && !anc.concealed && anc.caveDepth == null
    && p.expedition?.map === 'proving_yard' && p.zoneId === expeditionZoneId(host) && !w.zoneMap[p.zoneId], p ? `${p.expedition?.anchor}/${p.expedition?.map}` : 'null');
  check('F5 the posting pays the charge fold at the anchor\'s level', !!p && !!anc && (p.pay.essence?.length ?? 0) > 0 && p.expedition?.level === Math.max(1, anc.level));
  check('F6 an offered charter is not annulled while its anchor stands', !!p && row.annulled!(w, p!) === null);
  const copy = row.copy(w, p!);
  check('F7 the card reads the map + the anchor', copy.title.includes('Proving Yard') && !!anc && copy.ask.includes(anc.name));
  check('F8 done reads false before the take', !row.done(w, p!));
  const refusal = row.accept!(w, p!);
  const z = w.zoneMap[p!.zoneId];
  check('F9 THE TAKE mints the authored ground beside the anchor', refusal === null && !!z && z.layoutParams?.authored === 'proving_yard' && z.level === p!.expedition!.level
    && !!anc && z.exits.some(e => e.to === anc.id && e.notarized) && anc.exits.some(e => e.to === p!.zoneId),
    `refusal=${refusal} z=${!!z} authored=${z?.layoutParams?.authored} level=${z?.level}/${p!.expedition!.level} back=${z?.exits.some(e => e.to === anc?.id && e.notarized)} recip=${anc?.exits.some(e => e.to === p!.zoneId)}`);
  p!.acceptAt = w.time;
  check('F10 a taken charter stands while its ground stands', row.annulled!(w, p!) === null);
  delete w.zoneMap[p!.zoneId];
  check('F11 …and annuls when the ground is gone', typeof row.annulled!(w, p!) === 'string');
  check('F12 a charter for a forgotten map annuls', typeof row.annulled!(w, { ...p!, expedition: { ...p!.expedition!, map: 'gone' } }) === 'string');
  check('F13 accept refuses a lost anchor', row.accept!(w, { ...p!, zoneId: 'probe_exp2', expedition: { ...p!.expedition!, anchor: 'nope' } }) !== null);
  delete w.zoneMap.probe_anchor;
  town.exits = town.exits.filter(e => e.to !== 'probe_anchor');
}

// --- G. the atlas -----------------------------------------------------------------------------
console.log('\n--- G. the atlas ---');
{
  const custom: AuthoredMapDef = { ...JSON.parse(JSON.stringify(PROVING_YARD)) as AuthoredMapDef, id: `${ATLAS_PREFIX}probe_yard`, name: 'probe yard' };
  check('G1 the graft refuses an unprefixed id', typeof graftAtlasMap({ ...custom, id: 'shipped_looking' }) === 'string');
  check('G2 the graft refuses a malformed row', typeof graftAtlasMap({ ...custom, grid: 'nope' as unknown as string[] }) === 'string');
  const parsed = parseAtlasSave({ schemaVersion: 1, maps: [custom, { ...custom, id: 'unprefixed' }, { id: `${ATLAS_PREFIX}bad` }] });
  check('G3 the parse gate keeps the lawful row only', !!parsed && parsed.length === 1 && parsed[0].id === custom.id);
  check('G4 a schema mismatch parses to null', parseAtlasSave({ schemaVersion: 9, maps: [custom] }) === null && parseAtlasSave(null) === null);
  check('G5 upsert grafts into the live registry', upsertAtlasMap(custom) === null && AUTHORED_MAPS[custom.id]?.name === 'probe yard' && atlas.maps.length === 1);
  check('G6 a grafted atlas map mints like any other', !!w.mintAuthoredZone(custom.id, { id: 'probe_custom_mint', level: 4 }) && w.zoneMap.probe_custom_mint.layoutParams?.authored === custom.id);
  check('G7 no shipped map squats the prefix', findAtlasSquatters().length === 0 && AUTHORED_MAP_LIST.every(m => !m.id.startsWith(ATLAS_PREFIX)));
  check('G8 remove un-grafts', removeAtlasMap(custom.id) && !AUTHORED_MAPS[custom.id] && atlas.maps.length === 0);
  const ts = serializeMapTS(custom);
  const gridLines = ts.split('\n').filter(l => /^\s+'#/.test(l) || /^\s+'[#.~o]{40}',?$/.test(l)).length;
  check('G9 the promotion literal names the const, the map, a quest snippet, the bounty note', ts.includes('export const PROBE_YARD: AuthoredMapDef')
    && ts.includes(`map: '${custom.id}'`) && ts.includes('bounty') && ts.includes("tileset: 'grand_arena'"));
  check('G10 the grid prints one row per line', gridLines === PROVING_YARD.rows, `${gridLines}`);
  check('G11 the literal parses back as the same map (eval-free shape read)', ts.includes(`cols: ${custom.cols}`) && ts.includes(`rows: ${custom.rows}`) && ts.includes("objective: { kind: 'clear', all: true }"));
  delete w.zoneMap.probe_custom_mint;
}

// --- H. portal seat math mirrors placeExit --------------------------------------------------
console.log('\n--- H. the seat mirror ---');
{
  const s = { w: 1200, h: 840 };
  const n = portalSeat('n', 0.5, s), e = portalSeat('e', 0.3, s), wv = portalSeat('w', 0.01, s), so = portalSeat('s', 0.99, s);
  check('H1 north/south seats sit an inset off the rim at the fraction', n.x === 600 && n.y === PORTAL_EDGE_INSET && so.y === s.h - PORTAL_EDGE_INSET);
  check('H2 east/west seats clamp the fraction inside the inset', e.x === s.w - PORTAL_EDGE_INSET && e.y === 252 && wv.y === PORTAL_EDGE_INSET && so.x === s.w - PORTAL_EDGE_INSET);
  check('H3 the fabric\'s dials are sane', AUTHORED_CFG.portalClear > 2 * MAP_CELL && AUTHORED_CFG.minCells * MAP_CELL >= 200);
  check('H4 the registry lists monsters the debut maps seat', ['bandit_keeper', 'gravecaller', 'skeleton_archer'].every(id => !!MONSTERS[id]));
}

console.log(`\n${failed === 0 ? 'ALL PASS' : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
