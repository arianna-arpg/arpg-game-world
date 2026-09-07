// ---------------------------------------------------------------------------
// PROBE: THE STOREY FABRIC — stacked rooms on the tier fabric
// (docs/engine/storeys.md; engine/levelgen.ts placeStructurePlan's storey
// composite, world/regions.ts storey rows, engine/los.ts + the sight veil's
// hanging walls, renderer.drawStoreyLayer, render/vis/roomVeil.ts).
//
// Boots the real engine headless and pins:
//   A. THE ROWS — storey_floor is floor on BOTH stories; storey_wall is floor
//      below and a HANGING WALL above; storey_stair is the crossing; the
//      landing and the deck are the story's alone (walls to the street).
//   B. THE COMPOSITE — a plan wearing `storeys` paints the story cell for
//      cell over its ground plan (one region per cell), stamps the story's
//      furniture + folk with their tier, raises ONE stairway face per flight
//      turned toward its landing, derives the story's own room ledger with
//      archways as doors, and stamps the zone an INTERIOR stack.
//   C. THE CROSSING — the mover's own law carries a walker up the flight and
//      keeps it on the story; the flank walls refuse a sideways step onto the
//      flight; walking back down lands on the ground floor.
//   D. THE ELEVATION LAW — a story-1 eye stops at a hanging wall while the
//      ground-floor eye under it sees clean across the room; shots likewise.
//   E. LAYER SOVEREIGNTY — the story's furniture is solid only to the story.
//   F. THE MAP — an interior stack is silent on the world map's tell + tint.
//   G. THE DRAW (source pins) — the storey layer draws in the tier-veil slot,
//      the culls read the stack, the room veil confines by story.
//   H. THE ENCLOSURE LAW — a storey is ENCLOSED by derivation: a shove into a
//      hanging wall or the outer wall holds AT the wall (tier kept, inside
//      the footprint), and THE SPOILS STORY keeps a drop upstairs out of the
//      hands beneath it (and the reverse).
//   I. LAYER SOVEREIGNTY, THE BODIES — the lodger standing in the hall above,
//      in the hero's exact footprint on the common room's floor, moves nobody
//      (no shoulder, no slam across a story); the same-story control parts them.
// Run: npx tsx balance/probe_storey.ts   (exit 0 = all PASS)
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { START_ZONE } from '../src/data/zones';
import { STRUCTURES, legendCell } from '../src/data/structures';
import { regionKind } from '../src/world/regions';
import { floorStoryOf, linkSpanOf, tierElevOf, tierEnclosure, tierFloorAt, tierLinkOf } from '../src/engine/tiers';
import { VESTIGES } from '../src/data/vestiges';
import type { GemDrop } from '../src/engine/world';
import { doodadRuleOf } from '../src/engine/levelgen';
import { tierMapTell, tierMapTint } from '../src/ui/panels';
import { vec } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// ------------------------------------------------------------- A. THE ROWS
{
  const f = regionKind('storey_floor')!, wl = regionKind('storey_wall')!, st = regionKind('storey_stair')!;
  const ld = regionKind('storey_landing')!, dk = regionKind('storey_deck')!;
  check('A1 the five storey rows are registered', !!f && !!wl && !!st && !!ld && !!dk);
  check('A2 storey_floor is floor on BOTH stories (one cell, two floors)', tierFloorAt('storey_floor', 0) && tierFloorAt('storey_floor', 1));
  check('A3 storey_wall is floor below and NO floor above — a hanging wall from story 1',
    tierFloorAt('storey_wall', 0) && !tierFloorAt('storey_wall', 1) && wl.hangingFrom === 1 && wl.walkable && !wl.blocksSight && !wl.blocksShot);
  check('A4 storey_stair is the crossing (floor on both, span [0,1])',
    tierLinkOf('storey_stair') && tierFloorAt('storey_stair', 0) && tierFloorAt('storey_stair', 1) && linkSpanOf(st).join(',') === '0,1');
  check('A5 the landing is the story\'s alone (a closet below: wall, shot-stop, sight-stop)',
    !tierFloorAt('storey_landing', 0) && tierFloorAt('storey_landing', 1) && ld.blocks && !!ld.blocksShot && !!ld.blocksSight);
  check('A6 the deck is the story\'s floor over a ground wall', !tierFloorAt('storey_deck', 0) && tierFloorAt('storey_deck', 1) && dk.blocks);
  check('A7 the elevations read for flights: floor 1, wall 0 (the ground it stands on), landing 1',
    tierElevOf('storey_floor') === 1 && tierElevOf('storey_wall') === 0 && tierElevOf('storey_landing') === 1);
  check('A8 the plan vocabulary: A = the stair cell, ^ = the landing (ground-plan chars)',
    legendCell('A')?.region === 'storey_stair' && legendCell('A')?.interior === true
    && legendCell('^')?.region === 'storey_landing' && legendCell('^')?.interior === true);
}

// -------------------------------------------------------- B. THE COMPOSITE
const w = makeSimWorld('warrior', 0x5107e);
w.loadZone(START_ZONE);
const inn = w.structures.find(s => s.defId === 'inn')!;
const def = STRUCTURES.inn;
const rec = inn.storeys![0];
const cs = inn.cellSize;
const wf = w.walk!;
const kindAt = (cx: number, cy: number): string => wf.regionAt!(inn.rect.x + cx * cs + cs / 2, inn.rect.y + cy * cs + cs / 2);
{
  check('B1 the placed inn carries one storey record (tier 1) and the zone declares an INTERIOR stack of one level',
    !!rec && rec.tier === 1 && w.zone.tiers?.interior === true && w.zone.tiers.levels === 1 && w.zone.tiers.packSplit === 0
    && w.zone.tiers.exposure === 'open' && w.zone.tiers.kind === 'over');
  // Read the composite back against the two plans, cell for cell.
  const gp = def.plan!, sp = def.storeys![0].plan;
  let floors = 0, walls = 0, stairN = 0, landings = 0, bad: string[] = [];
  for (let cy = 0; cy < gp.length; cy++) {
    for (let cx = 0; cx < gp[cy].length; cx++) {
      const g = gp[cy][cx], s = sp[cy][cx], k = kindAt(cx, cy);
      const gWall = g === '#' || g === 'W';
      const sWall = s === '#';
      let want: string | null = null;
      if (g === 'A') want = 'storey_stair';
      else if (g === '^') want = 'storey_landing';
      else if (g === 'D') want = null; // the ground door's own cell — sealed rampart or door
      else if (gWall) want = g === 'W' ? 'window' : 'rampart';
      else if (sWall) want = 'storey_wall';
      else want = 'storey_floor';
      if (want === 'storey_floor') floors++; else if (want === 'storey_wall') walls++; else if (want === 'storey_stair') stairN++; else if (want === 'storey_landing') landings++;
      if (want && k !== want) bad.push(`(${cx},${cy}) ${g}/${s} → ${k} ≠ ${want}`);
    }
  }
  check('B2 every cell reads ONE region folded from both plans (floor over floor = both floors; wall over floor = hanging; wall over wall = the wall; the flight + landing stand)',
    bad.length === 0 && floors > 20 && walls > 10 && stairN === 4 && landings === 2, bad.slice(0, 4).join(' | ') || `${floors}f/${walls}w/${stairN}s/${landings}l`);
  const up = w.doodads.filter(d => (d.tier ?? 0) === 1);
  check('B3 the story\'s furniture is stamped tier 1 (beds, dressers, chests, candles, rugs, the washstand, a shelf, benches)',
    up.length >= 15 && ['bed', 'dresser', 'linen_chest', 'candle_stand', 'rug', 'washstand', 'shelf', 'bench'].every(k => up.some(d => d.kind === k)),
    [...new Set(up.map(d => d.kind))].join(','));
  check('B4 nothing of the ground floor wears the story (Mireille\'s counter, the hearth, the tables stay tier 0)',
    w.doodads.filter(d => ['bar_counter', 'hearth', 'tavern_table', 'keg'].includes(d.kind) && (d.tier ?? 0) !== 0).length === 0);
  const stairs = w.doodads.filter(d => d.kind === 'stairway');
  check('B5 ONE stairway face stands on the flight, sized to its 2×2 cells, turned to climb toward its landing (NORTH — the foot by the door, the head at the hall)',
    stairs.length === 1 && stairs[0].radius === cs && Math.abs((stairs[0].rot ?? 0) + Math.PI / 2) < 0.01
    && tierLinkOf(wf.regionAt!(stairs[0].pos.x, stairs[0].pos.y)));
  check('B6 the story\'s ledger: floor rects, hanging-wall rects, three archways (open, no slab), four rooms',
    rec.floors.length > 0 && rec.walls.length > 0 && rec.doors.length === 3 && rec.doors.every(d => d.door.open === true && d.door.mode === 'sealed')
    && (rec.rooms?.length ?? 0) === 4 && !w.doodads.some(d => d.kind === 'door' && (d.tier ?? 0) === 1));
  check('B7 three guest rooms are SEALED (rim = hanging walls, the outer wall, an archway) and the hall is sealed too (the ground door\'s row seals it)',
    (rec.rooms?.filter(r => r.enclosed).length ?? 0) === 4, rec.rooms?.map(r => `${r.rects.length}r/${r.doors.length}d/${r.enclosed ? 'sealed' : 'open'}`).join(' '));
  check('B8 every archway belongs to exactly one room\'s rim, and the hall holds all three',
    (rec.rooms ?? []).some(r => r.doors.length === 3) && (rec.rooms ?? []).filter(r => r.doors.length === 1).length === 3);
  const lodger = w.actors.find(a => a.defId === 'townsfolk_lodger')!;
  check('B9 a plan npc with `tier: 1` wakes ON the story, on the story\'s floor',
    !!lodger && lodger.tier === 1 && tierFloorAt(wf.regionAt!(lodger.pos.x, lodger.pos.y), 1));
  check('B10 the ground-floor ledger leaves the landing\'s closet out of the common room (a non-walkable region is no member)',
    !!inn.rooms && inn.rooms.every(r => !r.rects.some(rc => {
      const lx = inn.rect.x + 11.5 * cs, ly = inn.rect.y + 3.5 * cs; // the landing's west cell (north end of the flight)
      return lx > rc.x && lx < rc.x + rc.w && ly > rc.y && ly < rc.y + rc.h;
    })));
  check('B11 the stack is found by position (storeyedStructureAt) inside the inn and nowhere on the square',
    w.storeyedStructureAt(vec(inn.rect.x + 60, inn.rect.y + 60)) === inn && w.storeyedStructureAt(vec(inn.rect.x - 40, inn.rect.y + 60)) === null
    && w.storeyedStructures().length === 1);
}

// --------------------------------------------------------- C. THE CROSSING
{
  const stair = w.doodads.find(d => d.kind === 'stairway')!;
  const p = w.player;
  const step = (dx: number, dy: number, n: number): void => { for (let i = 0; i < n; i++) w.moveActor(p, dx, dy, 1 / 30); };
  // THE FLIPPED FLIGHT (her word 2026-09-06): the foot is SOUTH of the run
  // (by the door), the landing NORTH — the climb walks north.
  p.pos.x = stair.pos.x; p.pos.y = stair.pos.y + stair.radius + 18; p.tier = 0; p.onTierLink = false;
  const footK = wf.regionAt!(p.pos.x, p.pos.y);
  check('C1 the flight\'s foot is ground-floor floor under a hanging wall (the stairwell\'s rim above)', footK === 'storey_wall');
  // The landing opens straight into the hall now, so the walk stops the
  // moment the landing is underfoot (a fixed count would carry on north).
  let onLanding = false;
  for (let i = 0; i < 90 && !onLanding; i++) { step(0, -1, 1); onLanding = wf.regionAt!(p.pos.x, p.pos.y) === 'storey_landing'; }
  check('C2 walking up the flight carries the walker to the story: tier 1, standing on the landing',
    p.tier === 1 && onLanding, `tier ${p.tier} on ${wf.regionAt!(p.pos.x, p.pos.y)}`);
  step(0, -1, 60);
  check('C3 the hall above is the story\'s floor — from the landing the walker steps straight NORTH into the hall (no corridor of furniture between), keeping tier 1 on both-floor cells', p.tier === 1 && wf.regionAt!(p.pos.x, p.pos.y) === 'storey_floor');
  // The flank: from the east room, east toward the flight's west side is a wall (both floors).
  p.pos.x = inn.rect.x + 9.5 * cs; p.pos.y = inn.rect.y + 5.5 * cs; p.tier = 1; p.onTierLink = false;
  step(1, 0, 60);
  check('C4 the flight\'s flank refuses a sideways step onto it (the stairwell wall stands on both floors)',
    p.tier === 1 && p.pos.x < inn.rect.x + 10 * cs + 2 && !tierLinkOf(wf.regionAt!(p.pos.x, p.pos.y)), `x ${p.pos.x.toFixed(0)} tier ${p.tier}`);
  // Back down: to the landing, then south down the flight.
  p.pos.x = inn.rect.x + 11.5 * cs; p.pos.y = inn.rect.y + 3.5 * cs; p.tier = 1; p.onTierLink = false;
  step(0, 1, 45);
  check('C5 walking back down the flight lands on the common room\'s floor (tier 0)', p.tier === 0 && tierFloorAt(wf.regionAt!(p.pos.x, p.pos.y), 0), `tier ${p.tier} on ${wf.regionAt!(p.pos.x, p.pos.y)}`);
  // The mover confines a story-1 body against the hanging walls: a lodger
  // cannot walk through a partition, a ground walker under it can.
  // The rooms sit along the south wall now (rows 4–6): room 2's WEST
  // partition hangs at column 4 over the common room's open floor (a
  // walk-over chair sits under it — no solid on the ground walker's way).
  p.pos.x = inn.rect.x + 5.5 * cs; p.pos.y = inn.rect.y + 5.5 * cs; p.tier = 1; p.onTierLink = false;
  step(-1, 0, 60);
  check('C6 a story-1 walker is held by a hanging wall (room 2\'s west partition)', p.tier === 1 && p.pos.x > inn.rect.x + 5 * cs - 2, `x ${p.pos.x.toFixed(0)}`);
  p.pos.x = inn.rect.x + 5.5 * cs; p.pos.y = inn.rect.y + 5.5 * cs; p.tier = 0; p.onTierLink = false;
  step(-1, 0, 60);
  check('C7 the same walk on the ground floor passes under it (open floor beneath the partition)', p.tier === 0 && p.pos.x < inn.rect.x + 4 * cs, `x ${p.pos.x.toFixed(0)}`);
  p.tier = 0; p.pos.x = 100; p.pos.y = 100;
}

// ------------------------------------------------------ D. THE ELEVATION LAW
{
  // Two points in neighbouring guest rooms (room 1 and room 2), the hanging
  // wall at column 4 between them.
  const a = vec(inn.rect.x + 2.5 * cs, inn.rect.y + 5.5 * cs), b = vec(inn.rect.x + 5.5 * cs, inn.rect.y + 5.5 * cs);
  check('D1 a story-1 eye stops at the hanging wall between two guest rooms', !w.lineOfSight(a, b, 1, 1));
  check('D2 the ground-floor eye under it sees clean across the common room', w.lineOfSight(a, b, 0, 0));
  check('D3 a story-1 shot stops at the hanging wall; the ground-floor shot flies under it',
    !w.lineOfFire(a, b, 1) && w.lineOfFire(a, b, 0));
  // Across the outer wall, both stories are blind (the ground's wall is everyone's).
  const outside = vec(inn.rect.x - 40, inn.rect.y + 5.5 * cs);
  check('D4 the building\'s outer wall stops both stories', !w.lineOfSight(a, outside, 1, 0) && !w.lineOfSight(a, outside, 0, 0));
}

// ---------------------------------------------------- E. LAYER SOVEREIGNTY
{
  // A story-1 solid standing over OPEN ground-floor floor: room 3's dresser
  // (storey cell 8,4) stands over a bare cell of the common room — the one
  // seat both stories can be asked about honestly.
  const dx = inn.rect.x + 8.5 * cs, dy = inn.rect.y + 4.5 * cs;
  const bed = w.doodads.find(d => d.kind === 'dresser' && (d.tier ?? 0) === 1 && Math.hypot(d.pos.x - dx, d.pos.y - dy) < 2)!;
  check('E0 the seat under test is a storey dresser over bare floor', !!bed && doodadRuleOf(bed.kind).blocksMove === true
    && !w.doodads.some(o => (o.tier ?? 0) === 0 && doodadRuleOf(o.kind).blocksMove && Math.hypot(o.pos.x - dx, o.pos.y - dy) < 20));
  const on0 = w.findFreeSpot(vec(bed.pos.x, bed.pos.y), 12, 0);
  const on1 = w.findFreeSpot(vec(bed.pos.x, bed.pos.y), 12, 1);
  check('E1 a story-1 solid (a bed, a chest) is no solid to the room beneath it (a ground-floor seat stays where it is)', Math.hypot(on0.x - bed.pos.x, on0.y - bed.pos.y) < 1);
  check('E2 and a solid to the story it stands on (a story-1 seat is pushed off it)', Math.hypot(on1.x - bed.pos.x, on1.y - bed.pos.y) > 8);
}

// ------------------------------------------------------------- F. THE MAP
{
  check('F1 an interior stack is silent on the world map\'s tell', tierMapTell(w.zone, true) === null);
  check('F2 and leaves the node\'s fill untouched', tierMapTint(w.zone, true, '#a0b0c0') === '#a0b0c0');
  check('F3 a country stack still tells (the buttes\' law stands)',
    tierMapTell({ tiers: { kind: 'over', exposure: 'open' } }, true)?.mark === 'open');
}

// ----------------------------------------------- G. THE DRAW (source pins)
{
  const renderer = readFileSync(resolve('src/render/renderer.ts'), 'utf8');
  const veil = readFileSync(resolve('src/render/vis/roomVeil.ts'), 'utf8');
  check('G1 the storey layer draws in the tier-veil slot, under the doodad pass',
    /this\.drawTierVeil\(world, vw, vh\);[\s\S]{0,400}this\.drawStoreyLayer\(world\);[\s\S]{0,200}this\.drawDoodads\(world\)/.test(renderer));
  check('G2 the layer paints the story\'s floor in the structure\'s own style and its hanging walls; the understair closets downstairs',
    renderer.includes('paintFloorRect(ctx, r, style)') && renderer.includes('rec.walls') && renderer.includes("'storey_landing'"));
  check('G3 the doodad cull and the actor cull both read the stack (the other story hides; the crossing shows both)',
    (renderer.match(/this\.inStack\(/g) ?? []).length >= 2 && renderer.includes('tierLinkOf(world.walk.regionAt(d.pos.x, d.pos.y))'));
  check('G4 the room veil confines by the hero\'s story (the storey\'s own ledger + archways)',
    veil.includes('st0?.storeys?.find(s => s.tier === tier)') && veil.includes('rooms: storey.rooms, doors: storey.doors'));
}

// ------------------------------------------------------ H. THE ENCLOSURE LAW
// (engine/tiers.ts tierEnclosure + the world's push lane; docs/engine/tiers.md):
// a building's storey is ENCLOSED by derivation — a shove never carries a
// body off it. The rim fall that drops a butte-stander into the valley is a
// wall here: the knockback clamps at the hanging wall / the outer wall
// exactly as feet do, tier 1 kept, the body inside the footprint on the
// story's own floor. And THE SAME-STORY LAW on spoils: a drop lying upstairs
// is nobody's pickup downstairs, and the reverse.
{
  const p = w.player;
  const settle = (n: number): void => { for (let i = 0; i < n; i++) w.update(1 / 30); };
  check('H1 the interior stack resolves ENCLOSED by derivation (no word on the def); open country stays open; the explicit word wins both ways',
    tierEnclosure(w.zone.tiers) === 'enclosed' && w.zone.tiers?.enclosure === undefined
    && tierEnclosure({ kind: 'over', exposure: 'open' }) === 'open'
    && tierEnclosure({ kind: 'under', exposure: 'covered' }) === 'enclosed'
    && tierEnclosure({ kind: 'over', exposure: 'open', enclosure: 'enclosed' }) === 'enclosed'
    && tierEnclosure({ kind: 'under', exposure: 'covered', enclosure: 'open' }) === 'open');
  // A quiet inn: the folk stand aside (the shove must meet walls, not bodies).
  for (const a of w.actors) if (a !== p) a.dead = true;
  settle(1);
  const inside = (): boolean => p.pos.x > inn.rect.x && p.pos.x < inn.rect.x + inn.rect.w && p.pos.y > inn.rect.y && p.pos.y < inn.rect.y + inn.rect.h;
  const onStory = (): boolean => tierFloorAt(wf.regionAt!(p.pos.x, p.pos.y), 1);
  // H2 — room 2's west partition (the hanging wall at column 4, C6's seat): a
  // hard shove WEST from (5.5, 5.5). Before the law the rim fall read the
  // partition's open ground floor as a landing and dropped the hero through it.
  p.pos.x = inn.rect.x + 5.5 * cs; p.pos.y = inn.rect.y + 5.5 * cs; p.tier = 1; p.onTierLink = false; p.push = null;
  w.pushActor(p, Math.PI, 320);
  settle(40);
  check('H2 a shove into a hanging wall holds AT the wall: tier 1 kept, inside the inn, on the story\'s floor — never through the boards',
    p.tier === 1 && inside() && onStory() && p.pos.x > inn.rect.x + 5 * cs - 2 && !p.push && !p.isStunned(),
    `tier ${p.tier} x ${(p.pos.x - inn.rect.x).toFixed(0)} on ${wf.regionAt!(p.pos.x, p.pos.y)}`);
  // H3 — the outer wall: room 1 (2.5, 5.5), a shove SOUTH at the south wall
  // (the ground's rampart stands on both floors) — held above it.
  p.pos.x = inn.rect.x + 2.5 * cs; p.pos.y = inn.rect.y + 5.5 * cs; p.tier = 1; p.onTierLink = false; p.push = null;
  w.pushActor(p, Math.PI / 2, 320);
  settle(40);
  check('H3 a shove into the outer wall holds inside the footprint on the story',
    p.tier === 1 && inside() && onStory() && p.pos.y < inn.rect.y + 7 * cs && !p.push,
    `tier ${p.tier} y ${(p.pos.y - inn.rect.y).toFixed(0)} on ${wf.regionAt!(p.pos.x, p.pos.y)}`);
  // H4–H8 — THE SPOILS STORY: a vestige lying in the hall above (8.5, 2.5 —
  // storey floor over the common room's open floor).
  const vid = Object.keys(VESTIGES)[0];
  const hx = inn.rect.x + 8.5 * cs, hy = inn.rect.y + 2.5 * cs;
  check('H4 the seat under test is a both-floor cell (storey_floor) whose unstamped floor read is the ground\'s; a landing reads its story',
    wf.regionAt!(hx, hy) === 'storey_floor' && floorStoryOf('storey_floor') === 0 && floorStoryOf('storey_landing') === 1);
  const drop: GemDrop = { pos: vec(hx, hy), item: { kind: 'vestige', id: vid, count: 1 }, bob: 0, tier: 1 };
  w.drops.push(drop);
  p.pos.x = hx; p.pos.y = hy; p.tier = 0; p.onTierLink = false; p.push = null;
  settle(3);
  check('H5 a vestige lying UPSTAIRS is no pickup for the hero in the common room beneath it (same position, story 0)', w.drops.includes(drop));
  p.tier = 1;
  settle(3);
  check('H6 … and the hero on the story takes it', !w.drops.includes(drop));
  const drop2: GemDrop = { pos: vec(hx, hy), item: { kind: 'vestige', id: vid, count: 1 }, bob: 0 };
  w.drops.push(drop2);
  settle(3);
  check('H7 an UNSTAMPED drop on a both-floor cell is the ground\'s (the sweep settles the floor\'s word): the story hero leaves it …',
    w.drops.includes(drop2) && drop2.tier === 0, `tier ${String(drop2.tier)}`);
  p.tier = 0;
  settle(3);
  check('H8 … and the ground hero takes it', !w.drops.includes(drop2));
  p.pos.x = 100; p.pos.y = 100; p.tier = 0;
}

// ------------------------------------------- I. LAYER SOVEREIGNTY, THE BODIES
// (engine/tiers.ts sameStory — the sovereignty gate at the crowd shoulder and
// the bowling lane): the lodger strolling in the hall above stands in the
// hero's exact footprint on the common room's floor and moves NOBODY — the
// reported "invisible wall" was this shoulder, thrown by a body the storey
// cull had hidden. The same-story control still parts them.
{
  const p = w.player;
  const settle = (n: number): void => { for (let i = 0; i < n; i++) w.update(1 / 30); };
  for (const a of w.actors) if (a !== p) a.dead = true;
  settle(1);
  const hx = inn.rect.x + 8.5 * cs, hy = inn.rect.y + 2.5 * cs; // the hall above / the common room beneath
  const lodger = w.createMonster('townsfolk_lodger', 1, 'enemy');
  lodger.tier = 1; lodger.pos = vec(hx, hy); lodger.anchored = true; lodger.passive = true;
  w.actors.push(lodger); // (createMonster mints; the caller seats)
  const off = (a: { pos: { x: number; y: number } }): number => Math.hypot(a.pos.x - hx, a.pos.y - hy);
  // The stand is a hand's breadth (2px) inside the footprint, never dead on
  // it: coincident bodies give the shoulder pass no angle (its d > 0.01 guard).
  p.pos.x = hx + 2; p.pos.y = hy; p.tier = 0; p.onTierLink = false; p.push = null;
  settle(20);
  check('I1 a body on the story above, standing in the hero\'s footprint, moves the hero not one pixel (no shoulder across a story)',
    Math.abs(off(p) - 2) < 0.5 && off(lodger) < 0.5, `hero ${off(p).toFixed(1)}px lodger ${off(lodger).toFixed(1)}px`);
  const life0 = lodger.life;
  w.pushActor(p, 0, 320); // a hard shove THROUGH the footprint
  settle(30);
  check('I2 a shove through it lands no slam: the body above keeps its life and its seat', lodger.life === life0 && off(lodger) < 0.5 && !p.push);
  p.pos.x = hx + 2; p.pos.y = hy; p.tier = 1; p.onTierLink = false; p.push = null;
  settle(20);
  check('I3 the same-story control: the hero standing in a same-story body\'s footprint is shouldered clear (the gate is alive, not dead)',
    off(p) >= (p.radius + lodger.radius) * 0.8, `${off(p).toFixed(1)}px`);
  lodger.dead = true;
  p.pos.x = 100; p.pos.y = 100; p.tier = 0;
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
