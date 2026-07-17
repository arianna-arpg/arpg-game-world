// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PITFALL FABRIC end to end on the real engine
// (docs/engine/pitfall.md): pit surfaces drawn == tested (the chasmPit blob
// union, lip grasp in disc space), the classic region default untouched
// where nothing opted in, the 'descend' policy (chasm_fall traversal, the
// one-stratum mint, deterministic pit identity, the climb-out-at-the-rim
// anti-stuck guarantee), the knockback swallow with full killer credit vs
// the steering hold (nothing suicides), the insured (home habitat bodies,
// levitators, dashes), spanning decks, placement hygiene, the unstuck
// sentinel's lip truce, and the co-op wire.
// Run: npx tsx balance/probe_pitfall.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { PIT_CFG, pitAt, pitSupportedAt, pitSectorKey } from '../src/engine/pitfall';
import { pitRegionOf, type Doodad } from '../src/engine/levelgen';
import { regionKind } from '../src/world/regions';
import { TILESETS } from '../src/data/tilesets';
import { serializeZone, applyZone } from '../src/net/snapshot';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9147);

const DT = 1 / 60;
const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

/** Push a pit blob (two overlapping chasm wells) into a world at (x, y). */
const layPitBlob = (world: World, x: number, y: number): { a: Doodad; b: Doodad } => {
  const a: Doodad = { pos: vec(x, y), radius: 70, kind: 'chasm' };
  const b: Doodad = { pos: vec(x + 110, y), radius: 70, kind: 'chasm' };
  world.doodads.push(a, b);
  return { a, b };
};

/** The private seams the console QA idiom reaches (typed escape hatch). */
type WorldPrivate = {
  bridges: Doodad[];
  travelThrough(e: unknown): void;
  caveReturn: { zoneId: string; pos: { x: number; y: number } } | null;
};
const priv = (w: World): WorldPrivate => w as unknown as WorldPrivate;

// --- 0) SURFACES: drawn == tested (the chasmPit blob union) -----------------
{
  const world = makeSimWorld('warrior', 4101);
  const { a } = layPitBlob(world, 900, 600);
  const pits = world.zonePits();
  check('surfaces: both wells resolved as pits carrying the chasm region',
    pits.length === 2 && pits.every(p => p.region === 'chasm'),
    `${pits.length} pits, regions ${pits.map(p => p.region).join(',')}`);
  check('surfaces: rule-level derivation (no per-stamp flag needed)',
    pitRegionOf(a) === 'chasm');
  const grasp = 14 * 0.9; // a player-sized grasp disc
  check('surfaces: the well center is PAST all support',
    !pitSupportedAt(pits, [], 900, 600, grasp));
  check('surfaces: the seam BETWEEN overlapping wells is pit, not ground',
    !!pitAt(pits, [], 955, 600) && !pitSupportedAt(pits, [], 955, 600, grasp));
  check('surfaces: a body at the lip still GRASPS (center inside, disc reaching out)',
    !!pitAt(pits, [], 900 - 70 + 6, 600) && pitSupportedAt(pits, [], 900 - 70 + 6, 600, grasp));
  check('surfaces: one step outside the drawn dark is plain ground',
    !pitAt(pits, [], 900 - 71, 600));
  const deck: Doodad = { pos: vec(900, 600), radius: 40, kind: 'bridge' };
  check('surfaces: a spanning deck negates the drop beneath it (the bridge contract)',
    !pitAt(pits, [deck], 900, 600));
  check('surfaces: a home body (habitat/immuneGround) reads the pit as floor',
    pitSupportedAt(pits, [], 900, 600, grasp, ['chasm']));
}

// --- 1) THE CLASSIC DEFAULT: nothing opted in = yesterday's chasm ----------
{
  const world = makeSimWorld('warrior', 4102);
  layPitBlob(world, 900, 600);
  const p = world.player;
  p.pos = vec(760, 600);
  const life0 = p.life;
  // Press until the FIRST bite lands, then keep pressing 0.3s (inside the
  // debounce window): exactly one region-default chip, no faster.
  let i = 0;
  for (; i < 180 && p.life >= life0 - 0.01; i++) { world.moveActor(p, 1, 0, DT); world.update(DT); }
  const bite = (life0 - p.life) / p.maxLife();
  const lifeAfterBite = p.life;
  for (let k = 0; k < 18; k++) { world.moveActor(p, 1, 0, DT); world.update(DT); }
  check('classic: pressing past the lip bites the region default (18% max life)',
    bite > 0.15 && bite < 0.25, `first bite ${(bite * 100).toFixed(1)}% after ${(i / 60).toFixed(2)}s`);
  check('classic: the bite is DEBOUNCED (0.3s of continued pressing takes nothing more)',
    p.life >= lifeAfterBite - 0.01, `life ${lifeAfterBite.toFixed(1)} → ${p.life.toFixed(1)} (regen may climb)`);
  check('classic: the body never crosses the well (held at the lip, zone unchanged)',
    dist(p.pos.x, p.pos.y, 900, 600) > 40 && world.zone.id === 'sim_arena',
    `ended ${dist(p.pos.x, p.pos.y, 900, 600).toFixed(0)}u from the well heart`);
}

// --- 2) DESCEND: the pit is a door (mint, toll, rim return, determinism) ---
{
  const world = makeSimWorld('warrior', 4103);
  layPitBlob(world, 900, 600);
  world.zone.theme.pitfall = { kind: 'descend' };
  const parentId = world.zone.id;
  const parentDepth = world.zone.caveDepth ?? 0;
  const p = world.player;
  p.pos = vec(780, 600);
  const life0 = p.life;
  // Walk until the lip lets go, then RIDE THE WHOLE TRAVERSAL DOWN — the
  // real game's dwell guards (!this.traversal) forbid acting mid-crossing,
  // and the probe honors the same law.
  for (let i = 0; i < 240 && !world.traversal; i++) { world.moveActor(p, 1, 0, DT); world.update(DT); }
  for (let i = 0; i < 600 && world.traversal; i++) world.update(DT);
  const caveId1 = world.zone.id;
  check('descend: the fall LANDS one stratum down (the chasm_fall traversal swapped zones)',
    caveId1 !== parentId && caveId1.startsWith(`cave_${parentId}_pit_`), `landed in '${caveId1}'`);
  check('descend: the hollow is a REAL cave rung (caveDepth +1, strata fabric)',
    (world.zone.caveDepth ?? 0) === parentDepth + 1, `caveDepth ${world.zone.caveDepth}`);
  const toll = (life0 - p.life) / p.maxLife();
  check('descend: the landing toll bit (never lethal)',
    p.life >= 1 && toll > 0.1 && toll < 0.45, `toll ${(toll * 100).toFixed(1)}%`);
  check('descend: the discovery ledger learned it', (world.ledger['pit_descents'] ?? 0) >= 1);
  const ret = priv(world).caveReturn;
  check('descend: the way home is banked AT THE RIM (anti-stuck by construction)',
    !!ret && ret.zoneId === parentId && dist(ret.pos.x, ret.pos.y, 830, 600) < 60,
    ret ? `rim (${ret.pos.x.toFixed(0)}, ${ret.pos.y.toFixed(0)})` : 'no caveReturn');
  const rimPos = ret ? vec(ret.pos.x, ret.pos.y) : vec(0, 0);
  const out = world.exits.find(e => e.to === parentId);
  check('descend: the minted hollow keeps its climb-out exit', !!out);
  if (out) {
    priv(world).travelThrough(out);
    check('descend: climbing out surfaces you BESIDE the very lip you fell past',
      world.zone.id === parentId && dist(p.pos.x, p.pos.y, rimPos.x, rimPos.y) < 110,
      `surfaced ${dist(p.pos.x, p.pos.y, rimPos.x, rimPos.y).toFixed(0)}u from the rim`);
    // The pits are gen-time doodads on the SIM zone def, re-laid by hand here
    // (the arena regenerates clean) — same stretch, same sector.
    layPitBlob(world, 900, 600);
    world.zone.theme.pitfall = { kind: 'descend' };
    p.pos = vec(780, 600);
    for (let i = 0; i < 240 && !world.traversal; i++) { world.moveActor(p, 1, 0, DT); world.update(DT); }
    for (let i = 0; i < 600 && world.traversal; i++) world.update(DT);
    check('descend: the SAME stretch of the same pit opens the SAME hollow (identity is math)',
      world.zone.id === caveId1, `re-fell into '${world.zone.id}'`);
  }
  delete world.zone.theme.pitfall; // the sim def is a module singleton — leave it clean
}

// --- 3) THE SWALLOW vs THE HOLD (knockback payoff; nothing suicides) -------
{
  const world = makeSimWorld('warrior', 4104);
  layPitBlob(world, 900, 600);
  world.zone.theme.pitfall = { kind: 'descend' };
  const p = world.player;
  p.pos = vec(700, 300);
  // A wolf at the lip, shoved by the player: swallowed, credited, looted.
  const wolf = world.createMonster('plains_wolf', 5, 'enemy');
  wolf.pos = vec(815, 600);
  world.actors.push(wolf);
  const xp0 = world.seats[0].meta.xp;
  world.pushActor(wolf, 0, 260, p); // due east, into the dark
  for (let i = 0; i < 90 && !wolf.dead; i++) world.update(DT);
  check('swallow: the shoved hostile is KILLED by the pit', wolf.dead);
  check('swallow: the shover is PAID like any killer (xp credit — the death ladder ran)',
    world.seats[0].meta.xp > xp0, `xp ${xp0} → ${world.seats[0].meta.xp}`);
  // A second wolf STEERING at the pit holds at the rim, unharmed, forever.
  const walker = world.createMonster('plains_wolf', 5, 'enemy');
  walker.pos = vec(790, 600);
  world.actors.push(walker);
  const wl0 = walker.life;
  for (let i = 0; i < 150; i++) { world.moveActor(walker, 1, 0, DT); world.update(DT); }
  check('hold: a walker pressing the rim by its own steering is HELD, alive, unbitten',
    !walker.dead && walker.life >= wl0 - 0.01 && dist(walker.pos.x, walker.pos.y, 900, 600) > 40,
    `life ${wl0.toFixed(0)}→${walker.life.toFixed(0)}, ${dist(walker.pos.x, walker.pos.y, 900, 600).toFixed(0)}u out`);
  // A levitator shoved at the pit: the float is insurance (unharmed, alive).
  const floater = world.createMonster('plains_wolf', 5, 'enemy');
  floater.pos = vec(815, 480);
  floater.levitates = true;
  world.actors.push(floater);
  world.pushActor(floater, Math.atan2(120, 85), 260, p);
  for (let i = 0; i < 90; i++) world.update(DT);
  check('insured: a LEVITATING body cannot be shoved to its death', !floater.dead);
  // The void angler is HOME: it roams its own chasm and cannot be fed to it.
  const angler = world.createMonster('void_angler', 5, 'enemy');
  angler.pos = vec(900, 600); // dead center of the well
  world.actors.push(angler);
  world.pushActor(angler, 0, 300, p);
  for (let i = 0; i < 90; i++) world.update(DT);
  const anglerHome = !!pitAt(world.zonePits(), [], angler.pos.x, angler.pos.y, null);
  check('insured: the void angler is HOME — shoved and still fishing from its own dark',
    !angler.dead && anglerHome,
    `at (${angler.pos.x.toFixed(0)}, ${angler.pos.y.toFixed(0)})`);
  // The pit itself never confines its own: the mover carries a home body
  // freely across the dark (habitat-confinement rules are their own fabric
  // and keep their own say — this asserts only the pit's silence).
  const carried = world.clampPos(vec(930, 612), angler.radius, vec(900, 600), { mover: angler });
  check('insured: the home body WALKS its pit like floor (the lava-wader doctrine)',
    dist(carried.x, carried.y, 930, 612) < 1,
    `mover carried it to (${carried.x.toFixed(0)}, ${carried.y.toFixed(0)})`);
  delete world.zone.theme.pitfall;
}

// --- 4) DECKS: the span holds; being shoved OFF it is the fall -------------
{
  const world = makeSimWorld('warrior', 4105);
  layPitBlob(world, 900, 600);
  world.zone.theme.pitfall = { kind: 'descend' };
  // One plank lane across the blob's waist.
  const decks: Doodad[] = [
    { pos: vec(860, 600), radius: 34, kind: 'bridge' },
    { pos: vec(920, 600), radius: 34, kind: 'bridge' },
    { pos: vec(980, 600), radius: 34, kind: 'bridge' },
    { pos: vec(1040, 600), radius: 34, kind: 'bridge' },
  ];
  world.doodads.push(...decks);
  priv(world).bridges.push(...decks);
  const p = world.player;
  p.pos = vec(770, 600);
  for (let i = 0; i < 360 && p.pos.x < 1105; i++) { world.moveActor(p, 1, 0, DT); world.update(DT); }
  check('decks: the span carries a body clear across the dark (drawn == tested)',
    p.pos.x >= 1095 && world.zone.id === 'sim_arena', `crossed to x=${p.pos.x.toFixed(0)}`);
  // Mid-deck, shoved SIDEWAYS off the planks: the pit takes its due.
  p.pos = vec(920, 600);
  const parentId = world.zone.id;
  world.pushActor(p, Math.PI / 2, 340);
  for (let i = 0; i < 420 && world.zone.id === parentId; i++) world.update(DT);
  check('decks: knocked OFF the planks mid-span, the player DESCENDS (bridges are precarious now)',
    world.zone.id !== parentId && world.zone.id.startsWith(`cave_${parentId}_pit_`),
    `landed in '${world.zone.id}'`);
  delete world.zone.theme.pitfall;
}

// --- 5) AIRBORNE ARCS, PLACEMENTS, THE SENTINEL TRUCE -----------------------
{
  const world = makeSimWorld('warrior', 4106);
  layPitBlob(world, 900, 600);
  world.zone.theme.pitfall = { kind: 'descend' };
  const p = world.player;
  // A dash pressed INTO the rim arrests harmlessly — no zone swap, no toll.
  p.pos = vec(800, 600);
  const life0 = p.life;
  p.dash = { dir: 0, speed: 620, remaining: 0.28 };
  for (let i = 0; i < 60; i++) world.update(DT);
  check('airborne: a dash arrested at the rim neither drops nor bites',
    world.zone.id === 'sim_arena' && Math.abs(p.life - life0) < 0.01 && !world.traversal,
    `at x=${p.pos.x.toFixed(0)}`);
  // A from-less placement (teleport/spawn) may not land in the dark.
  const placed = world.clampPos(vec(900, 600), 14);
  check('placement: a from-less clamp is pushed out to the rim (nothing is born over the dark)',
    !pitAt(world.zonePits(), [], placed.x, placed.y, null),
    `placed at (${placed.x.toFixed(0)}, ${placed.y.toFixed(0)})`);
  // The unstuck sentinel leaves a lawful lip-grasper alone.
  p.pos = vec(900 - 70 + 5, 600); // center inside the disc, grasp holding
  const gx = p.pos.x, gy = p.pos.y;
  for (let i = 0; i < 48; i++) world.update(DT);
  check('sentinel: a grasped lip is lawful footing — no rescue teleport (the aetherial lesson)',
    dist(p.pos.x, p.pos.y, gx, gy) < 2 && world.zone.id === 'sim_arena',
    `drifted ${dist(p.pos.x, p.pos.y, gx, gy).toFixed(2)}u over 48 idle ticks`);
  delete world.zone.theme.pitfall;
}

// --- 6) THE WIRE: a guest's predicted pits are the host's pits -------------
{
  const host = makeSimWorld('warrior', 4107);
  const { a } = layPitBlob(host, 900, 600);
  a.fall = false; // stamp-level override: THIS well is a decorative crack
  host.zone.theme.pitfall = { kind: 'descend' };
  const guest = makeSimWorld('warrior', 4108);
  applyZone(guest, serializeZone(host));
  const gp = guest.zonePits();
  check('wire: the guest rebuilds the SAME pit list (kind-level + per-stamp override)',
    gp.length === 1 && gp[0].x === 1010 && gp[0].region === 'chasm',
    `${gp.length} pits, first at x=${gp[0]?.x}`);
  check('wire: theme.pitfall rides the zone message wholesale',
    guest.zone.theme.pitfall?.kind === 'descend');
  delete host.zone.theme.pitfall;
  delete guest.zone.theme.pitfall;
}

// --- 7) THE DATA CONTRACT: parity roster + defaults -------------------------
{
  check('contract: the karst gorge descends (the Reach connects from above)',
    TILESETS['karst_reach'].theme.pitfall?.kind === 'descend');
  check('contract: the deep sea\'s trenches descend (parity reaches the seabed)',
    TILESETS['deepsea'].theme.pitfall?.kind === 'descend');
  check('contract: hell\'s rents descend into hell',
    TILESETS['hell_steppes'].theme.pitfall?.kind === 'descend');
  check('contract: every cave rung descends by STRUCTURE (PIT_CFG.caveFall), no per-face rows',
    PIT_CFG.caveFall.kind === 'descend'
    && !TILESETS['cavern'].theme.pitfall && !TILESETS['depths'].theme.pitfall);
  check('contract: the descent abyss OPTED OUT (its shaft economy owns its drops)',
    TILESETS['descent'].theme.pitfall?.kind === 'fall');
  check('contract: the classic region rows are UNTOUCHED (fall-to-edge defaults)',
    regionKind('chasm')?.boundaryPolicy?.kind === 'fall'
    && regionKind('void')?.boundaryPolicy?.kind === 'fall'
    && regionKind('abyss')?.boundaryPolicy?.kind === 'fall');
  check('contract: the sector key is pure math (co-op / revisit identity)',
    pitSectorKey('z', 481, 0) === 'z:pitfall:1,0' && pitSectorKey('z', 479, -1) === 'z:pitfall:0,-1');
}

console.log(failed === 0 ? '\nALL CHECKS PASS' : `\n${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
