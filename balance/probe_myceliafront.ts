// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SPORE FRONT (mycelia Movement I), headless: the ANCHORED
// claim tree (nodes claimed outward from the home-biome foundation along real
// graph edges, home never relocating), THE FRAGMENTATION LAW (a claim culled
// bare is cut and its whole subtree withers the same beat; a side branch
// stands; cut back to the foundation = pushed-back, once), determinism (same
// seed + same drive ⇒ the identical tree and the identical expression picks),
// THE EXPRESSION (a non-home claim goes loud for an eased window; the spawn
// seasoning is budget-honest and exactly window-scoped; a cut claim ends its
// own window), the SPOREFALL SKY + DRESS on a real world (the registered
// event-front source folds at World.skyFront ONLY while the window holds; the
// spored_air dress plants from the registry row and dissolves back to NOTHING
// — no orphan doodads after the front passes), the never-warps law
// (transformedZones() empty by construction), THE EATS-PLAGUE SEAM stub (the
// mycelia grip published into the groundClaims registry; nothing consumes it
// yet), ABSENT==IDENTICAL (no mycelia-biome home in the world ⇒ the overlay
// stays inert at ignition chance 1 — nothing claimed, nothing suppressed,
// nothing expressed), THE COLLAPSE (Heartbloom ⇒ withdraw, filaments retract
// outermost ring first, re-seeded dormant at home), and PERSISTENCE (v2
// round-trip incl. the live window; a LEGACY v1 mobile-bloom save adopts —
// 'pushed' folds to 'spread', the wandered core re-anchors at its home, and
// via-less spores relink from the foundation, unreachable islands withering).
// Run: npx tsx balance/probe_myceliafront.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import type { ZoneDef } from '../src/data/zones';
import { eventFrontFor, eventFrontSourceIds } from '../src/engine/eventWeather';
import { WEATHER_DEFS, validateWeather } from '../src/world/weather';
import { WEATHER_DRESS_CFG, dressPlanFor } from '../src/engine/weatherDress';
import type { World } from '../src/engine/world';
import type { OverlayView } from '../src/world/overlay';
import { MyceliaField, type MyceliaSurge } from '../src/packages/overlays/mycelia';
import { groundClaimGripAt, groundClaimSourceIds } from '../src/packages/groundClaims';
import type { PackageGate } from '../src/packages/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// --- scaffolding ---------------------------------------------------------------

const GATE = (): PackageGate => ({ active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 });

/** Fast probe dials — the lifecycle at bench cadence (the def's own numbers are
 *  validated separately; these only need to be INTERNALLY coherent). */
const mkSurge = (over: Partial<MyceliaSurge['express']> = {}): MyceliaSurge => ({
  igniteChance: 1, flareThreshold: 1, flareFeed: 1, flareDecay: 0,
  spreadInterval: 0.5, maxHops: 6, minIntensity: 0.15, densityDecay: 0,
  seedDensity: 0.45, claimCap: 7, cullDensity: 1, recedeInterval: 0.5,
  suppressPerDensity: 0.7, suppressFloor: 0.2,
  homeBiome: 'mycelia', faction: 'fungal',
  heartbloom: { enabled: true, defId: 'fungal_heartbloom', promote: 'crowned', promoteAt: 6 },
  express: {
    chance: 1, holdSec: [4, 4], cooldownSec: [50, 50], easeSec: 1, floor: 0.35,
    minClaims: 99, amp: 2.5, weatherKind: 'spored_air', ...over,
  },
  reward: { xpBase: 300, xpPerLevel: 50, gems: 4 },
  color: '#a890cc',
});

const mkZone = (id: string, x: number, y: number, exits: string[], biome = 'plains'): ZoneDef => ({
  id, name: id, level: 6, biome, map: { x, y }, size: { w: 1200, h: 900 },
  objective: { kind: 'clear' }, theme: {}, layout: [],
  exits: exits.map(to => ({ to, pos: { x: 0, y: 0 } })),
} as unknown as ZoneDef);

const mkView = (nodes: ZoneDef[], currentZoneId: string): OverlayView => ({
  nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
  terrain: () => 'land', currentZoneId, time: 0, census: {}, charLevel: 20,
  gates: new Map(), visited: new Set(nodes.map(n => n.id)), surveyed: new Set<string>(),
});

// The bench graph: a home in the mycelia biome, an artery (a—b—c) and a side
// branch (d) — every edge mutual, everything charted.
//        home(mycelia) — a — b — c
//                     \ d
const mkGraph = (): ZoneDef[] => [
  mkZone('home', 0, 0, ['a', 'd'], 'mycelia'),
  mkZone('a', 100, 0, ['home', 'b']),
  mkZone('b', 200, 0, ['a', 'c']),
  mkZone('c', 300, 0, ['b']),
  mkZone('d', 0, 120, ['home']),
];

/** Steer the spread: put activity on ONE zone so the next claim beat takes it
 *  (activity outweighs hops in the pick by an order of magnitude). */
const steer = (mf: MyceliaField, view: OverlayView, zid: string): void => {
  mf.setEventActivity(new Map([[zid, 5]]));
  mf.update(0.5, view);
};

const claimIds = (mf: MyceliaField): string[] => mf.peek().map(p => p.zoneId).sort();
const claimOf = (mf: MyceliaField, zid: string) => mf.peek().find(p => p.zoneId === zid);

// ------------------------------ A. THE ANCHOR + THE CLAIM TREE -----------------
{
  const view = mkView(mkGraph(), 'a');
  const mf = new MyceliaField({ seed: 0xa11c, gate: GATE, biomeSeed: 1 }, mkSurge());
  mf.update(0.05, view);
  check('A1 devIgnite roots the bloom at its home', mf.devIgnite(view, 'home') && mf.activeBloom()?.coreZoneId === 'home');
  steer(mf, view, 'a');
  steer(mf, view, 'b');
  steer(mf, view, 'c');
  steer(mf, view, 'd');
  check('A2 the web claims outward along real edges', claimIds(mf).join(',') === 'a,b,c,d,home', claimIds(mf).join(','));
  check('A3 every claim records the edge it grew through (a tree rooted at home)',
    claimOf(mf, 'home')?.via === null && claimOf(mf, 'a')?.via === 'home'
    && claimOf(mf, 'b')?.via === 'a' && claimOf(mf, 'c')?.via === 'b' && claimOf(mf, 'd')?.via === 'home');
  check('A4 hops measure the tree, grip falls with them',
    claimOf(mf, 'c')?.hops === 3 && (claimOf(mf, 'a')?.density ?? 0) > (claimOf(mf, 'c')?.density ?? 0));
  check('A5 the home never relocates (the ANCHOR law)', mf.activeBloom()?.coreZoneId === 'home');
  check('A6 sporeOn reads the foundation as rooted', mf.sporeOn('home')?.isCore === true && mf.sporeOn('home')?.label === 'rooted');
  check('A7 the claim smothers rival events (suppression < 1), clear ground reads 1',
    mf.suppressionAt('a') < 1 && mf.suppressionAt('offmap') === 1);
  check('A8 THE NEVER-WARPS LAW: transformedZones is empty with the whole web standing',
    mf.transformedZones().length === 0);

  // The cap: a 5-claim web under claimCap 7 keeps growing only to the cap.
  const capped = new MyceliaField({ seed: 0xa11c, gate: GATE, biomeSeed: 1 },
    { ...mkSurge(), claimCap: 3 });
  capped.update(0.05, view);
  capped.devIgnite(view, 'home');
  steer(capped, view, 'a');
  steer(capped, view, 'b');
  steer(capped, view, 'c');
  steer(capped, view, 'c');
  check('A9 claimCap bounds the web (home counts)', claimIds(capped).join(',') === 'a,b,home');

  // ------------------------------ B. THE FRAGMENTATION LAW ---------------------
  check('B1 pushed-back is quiet before any cut', !mf.consumePushedBack());
  mf.cull('a', 1); // cullDensity 1 — one cull cleanses the claim
  check('B2 cutting the artery withers its whole subtree the same beat (b, c gone with a)',
    claimIds(mf).join(',') === 'd,home', claimIds(mf).join(','));
  check('B3 the side branch stands (fragmentation severs, it does not collapse)',
    claimOf(mf, 'd')?.via === 'home');
  check('B4 a cut that leaves reach standing is not yet a push-back', !mf.consumePushedBack());
  mf.cull('d', 1);
  check('B5 cut back to the foundation: the bloom falls dormant, pushed-back fires ONCE',
    mf.activeBloom()?.state === 'dormant' && mf.consumePushedBack() && !mf.consumePushedBack());
  check('B6 the dormant foundation keeps its faint seed', Math.abs((claimOf(mf, 'home')?.density ?? 0) - 0.45) < 1e-9);
}

// ------------------------------ C. DETERMINISM ---------------------------------
{
  const drive = (seed: number): string => {
    const view = mkView(mkGraph(), 'a');
    const mf = new MyceliaField({ seed, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
    mf.update(0.05, view);
    mf.devIgnite(view, 'home');
    const log: string[] = [];
    for (let i = 0; i < 24; i++) {
      // A fixed steering script: turmoil at b's door, then quiet grasping.
      mf.setEventActivity(new Map(i < 4 ? [['a', 3]] : i < 8 ? [['b', 3]] : []));
      mf.update(0.5, view);
      const b = mf.activeBloom();
      log.push(`${claimIds(mf).join('.')}/${b?.state}/${mf.peek().map(p => `${p.zoneId}:${p.via}:${p.hops}`).sort().join('|')}`);
    }
    return log.join(' ');
  };
  check('C1 same seed + same drive ⇒ the identical tree, beat for beat', drive(0xbeef) === drive(0xbeef));
  check('C2 quiet ground is still taken (the anchored web grasps without food)',
    drive(0xbeef).includes('a.b.c') || drive(0xbeef).includes('a.b.d'), 'the script goes quiet after 8 beats yet claims continue');
}

// ------------------------------ D. THE EXPRESSION ------------------------------
{
  const view = mkView(mkGraph(), 'a');
  const mf = new MyceliaField({ seed: 0xd0d0, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  mf.update(0.05, view);
  mf.devIgnite(view, 'home');
  check('D1 no window yet, the seasoning is silent',
    mf.expressionOn('a') === null && mf.affectSpawns(view.byId['a']).injectFactions.length === 0);
  steer(mf, view, 'a'); // ≥ minClaims — the roll (chance 1) fires this very beat
  const b0 = mf.activeBloom();
  check('D2 the window opens on a NON-HOME claim (the home IS the biome)',
    b0?.state === 'spread' && mf.expressionOn('a') !== null && mf.expressionOn('home') === null);
  check('D3 the window opens eased (floor holds the young sky)',
    Math.abs((mf.expressionOn('a')?.intensity ?? 0) - 0.35) < 0.26, `intensity ${mf.expressionOn('a')?.intensity}`);
  mf.setEventActivity(new Map());
  mf.update(1.5, view);
  check('D4 mid-window the sky stands full', (mf.expressionOn('a')?.intensity ?? 0) === 1);
  const bias = mf.affectSpawns(view.byId['a']);
  check('D5 THE OVERRUN SEASONING is budget-honest: fungal injected + amped, countMul EXACTLY 1',
    bias.countMul === 1 && bias.injectFactions.join(',') === 'fungal' && bias.factionMul.fungal === 2.5);
  check('D6 a claimed-but-quiet zone keeps NO_BIAS', mf.affectSpawns(view.byId['home']).injectFactions.length === 0
    && mf.affectSpawns(view.byId['home']).countMul === 1 && Object.keys(mf.affectSpawns(view.byId['home']).factionMul).length === 0);
  mf.update(3.0, view); // the 4s window runs out
  check('D7 the window closes with its clock; the seasoning is silent again',
    mf.expressionOn('a') === null && mf.affectSpawns(view.byId['a']).injectFactions.length === 0);
  mf.update(2.0, view);
  check('D8 the cooldown holds the next window shut', mf.expressionOn('a') === null && mf.expressionOn('b') === null);

  // A cut claim ends its own window instantly (drawn == held).
  const mf2 = new MyceliaField({ seed: 0xd0d1, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  mf2.update(0.05, view);
  mf2.devIgnite(view, 'home');
  steer(mf2, view, 'a');
  check('D9 (setup) the window stands on a', mf2.expressionOn('a') !== null);
  mf2.cull('a', 1);
  mf2.update(0.05, view);
  check('D10 cutting the expressed claim ends the window the same beat', mf2.expressionOn('a') === null);
}

// --------------- E. THE SPOREFALL SKY + DRESS + THE SEAM, the real world -------
{
  check('E1 the weather registry validates clean with spored_air in it',
    validateWeather(() => true, k => !!DOODAD_VISUALS[k]).length === 0,
    validateWeather(() => true, k => !!DOODAD_VISUALS[k]).join('; '));
  const row = WEATHER_DEFS.spored_air;
  check('E2 spored_air is event-pinned only (never sky-born) and bends the light',
    !!row && row.eventOnly === true && !row.skyWeight && (row.radiance?.mul ?? 1) < 1);
  check('E3 the dress kit names only registered kinds',
    (row?.dress?.rows.length ?? 0) === 3 && (row?.dress?.rows ?? []).every(r => !!DOODAD_VISUALS[r.doodad]));
  check('E4 the event-front + ground-claim registries carry the mycelia sources',
    eventFrontSourceIds().includes('mycelia') && groundClaimSourceIds().includes('mycelia'));

  const w = makeSimWorld('warrior', 0x51f0);
  const arena = w.zoneMap[SIM_ARENA_ID];
  const prevObjective = arena.objective;
  arena.objective = { kind: 'clear' }; // wake the quiet floor (restored below)
  const mf = new MyceliaField({ seed: 0xf00d, gate: GATE, biomeSeed: 1 },
    mkSurge({ minClaims: 99, holdSec: [30, 30] }));
  (w.sim as unknown as { myceliaField: MyceliaField | null }).myceliaField = mf;
  const fv = mkView([mkZone(SIM_ARENA_ID, 0, 0, [], 'mycelia')], SIM_ARENA_ID);
  mf.update(0.05, fv);
  check('E5 (setup) the field roots on the proving ground', mf.devIgnite(fv, SIM_ARENA_ID));
  check('E6 no window ⇒ no pin (the fold is quiet)', w.skyFront()?.kind !== 'spored_air');
  check('E7 THE SEAM: the anchored grip is published (claimed 1, foreign 0)',
    groundClaimGripAt(w.sim, SIM_ARENA_ID) === 1 && groundClaimGripAt(w.sim, 'nowhere') === 0
    && groundClaimGripAt(w.sim, SIM_ARENA_ID, 'mycelia') === 0);
  check('E8 (setup) devExpress opens the window here', mf.devExpress(SIM_ARENA_ID, 30));
  const stepBoth = (dt: number, n: number): void => {
    for (let i = 0; i < n; i++) { w.update(dt); mf.update(dt, fv); }
  };
  stepBoth(0.55, 3);
  const front = w.skyFront();
  check('E9 THE SPOREFALL reads through skyFront while the window holds',
    front?.kind === 'spored_air' && (front?.intensity ?? 0) > 0.3, `kind ${front?.kind} intensity ${front?.intensity}`);
  const dressed = (): typeof w.doodads => w.doodads.filter(d => d.weatherDress === 'spored_air' && !d.gone && !d.evap);
  const plan = dressPlanFor('spored_air');
  check('E10 the sporefall dress PLANTS from the registry row (within the hard cap)',
    !!plan && dressed().length > 0 && dressed().length <= WEATHER_DRESS_CFG.maxPieces, `${dressed().length} pieces`);
  check('E11 every planted piece is the row\'s own kit',
    dressed().every(d => ['spore_pod', 'giant_mushroom', 'mycelial_mat'].includes(d.kind)));
  check('E12 the never-warps law holds on the live world (no transform while expressed)',
    mf.transformedZones().length === 0);
  stepBoth(0.5, 70); // the 30s window burns out under both clocks
  check('E13 the window over, the pin is GONE from the sky', mf.expressionOn(SIM_ARENA_ID) === null && w.skyFront()?.kind !== 'spored_air');
  stepBoth(0.5, 60);
  check('E14 THE DRESS DISSOLVES WHOLE — no orphan doodads after the front passes',
    w.doodads.every(d => d.weatherDress !== 'spored_air' || d.gone),
    `${w.doodads.filter(d => d.weatherDress === 'spored_air' && !d.gone).length} lingering`);
  arena.objective = prevObjective;
}

// ------------------------------ F. ABSENT == IDENTICAL -------------------------
{
  // No mycelia-biome home anywhere ⇒ at ignition chance 1, fed heavy turmoil,
  // the overlay never claims, never suppresses, never expresses — the world
  // reads exactly as if the package were absent (every engine consumer of this
  // overlay is a null/1/[] no-op by construction).
  const zones = [mkZone('p1', 0, 0, ['p2']), mkZone('p2', 100, 0, ['p1'])];
  const view = mkView(zones, 'p1');
  const mf = new MyceliaField({ seed: 0xabab, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  for (let i = 0; i < 240; i++) {
    mf.setEventActivity(new Map([['p1', 9], ['p2', 9]]));
    mf.update(0.5, view);
  }
  check('F1 no home biome ⇒ no bloom, ever (ignition chance 1 for 2 minutes)',
    mf.activeBloom() === null && mf.peek().length === 0);
  check('F2 …and every engine read is the absent read',
    mf.sporeOn('p1') === null && mf.suppressionAt('p1') === 1
    && mf.transformedZones().length === 0 && mf.expressionOn('p1') === null
    && mf.affectSpawns(zones[0]).injectFactions.length === 0);
  // The registered sky source on a world with no field at all: silent.
  const bare = { sim: { myceliaField: null } } as unknown as World;
  check('F3 the sky source is silent on a bare world', eventFrontFor(bare, zones[0]) === null);
}

// ------------------------------ G. THE COLLAPSE --------------------------------
{
  const view = mkView(mkGraph(), 'a');
  const mf = new MyceliaField({ seed: 0xc011, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  mf.update(0.05, view);
  mf.devIgnite(view, 'home');
  steer(mf, view, 'a');
  steer(mf, view, 'b');
  check('G1 (setup) web home—a—b with a window standing', claimIds(mf).join(',') === 'a,b,home' && mf.expressionOn('a') !== null);
  check('G2 the Heartbloom stands only at the foundation',
    mf.heartbloomIn('home')?.defId === 'fungal_heartbloom' && mf.heartbloomIn('a') === null);
  check('G3 the Heart falls: the collapse begins, the window dies with it',
    mf.onHeartbloomSlain() && mf.activeBloom()?.state === 'withdraw' && mf.expressionOn('a') === null);
  check('G4 …and pays the pushed-back ledger once', mf.consumePushedBack() && !mf.consumePushedBack());
  check('G5 a collapsing bloom fields no Heart', mf.heartbloomIn('home') === null);
  mf.update(0.5, view);
  check('G6 the filaments retract outermost ring first', claimIds(mf).join(',') === 'a,home', claimIds(mf).join(','));
  mf.update(0.5, view);
  mf.update(0.5, view);
  check('G7 collapsed home: re-seeded dormant at the foundation, faint again',
    mf.activeBloom()?.state === 'dormant' && mf.activeBloom()?.coreZoneId === 'home'
    && Math.abs((claimOf(mf, 'home')?.density ?? 0) - 0.45) < 1e-9);
}

// ------------------------------ H. PERSISTENCE ---------------------------------
{
  const view = mkView(mkGraph(), 'a');
  const mf = new MyceliaField({ seed: 0x5a5a, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  mf.update(0.05, view);
  mf.devIgnite(view, 'home');
  steer(mf, view, 'a');
  steer(mf, view, 'b');
  const snap = JSON.parse(JSON.stringify(mf.snapshot()));
  const mf2 = new MyceliaField({ seed: 0x5a5a, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 2 }));
  mf2.restore(snap);
  mf2.update(0.01, view); // the relink beat
  check('H1 v2 round-trip: the tree resumes whole (claims, edges, the live window)',
    JSON.stringify(claimIds(mf2)) === JSON.stringify(claimIds(mf))
    && claimOf(mf2, 'b')?.via === 'a'
    && mf2.expressionOn('a') !== null,
    `claims ${claimIds(mf2).join(',')}`);
  const resnap = JSON.parse(JSON.stringify(mf2.snapshot())) as { claims: unknown[] };
  const orig = snap as { claims: unknown[] };
  check('H2 the relink is idempotent (edges byte-stable across the trip)',
    JSON.stringify(resnap.claims) === JSON.stringify(orig.claims));

  // THE LEGACY ADOPTION: a v1 mobile-bloom save — wandered core, 'pushed'
  // state, via-less spore rows, one island the graph cannot reach from home.
  const legacy = {
    bloom: {
      id: 'mycelia_3', homeZoneId: 'home', coreZoneId: 'b', mass: 3.2, state: 'pushed',
      flareCharge: 2, spreadAcc: 0.1, recedeAcc: 0, pushPressure: 2.5, chaseZones: 2, age: 400,
    },
    spores: [
      { zid: 'home', density: 0.5, hops: 2 }, { zid: 'a', density: 0.8, hops: 1 },
      { zid: 'b', density: 1, hops: 0 }, { zid: 'z9', density: 0.9, hops: 4 },
    ],
    pushedBackPending: false, seq: 4,
  };
  const mf3 = new MyceliaField({ seed: 0x5a5b, gate: GATE, biomeSeed: 1 }, mkSurge({ minClaims: 99 }));
  mf3.restore(legacy);
  mf3.setEventActivity(new Map());
  mf3.update(0.01, view); // the relink beat
  check('H3 legacy adoption: pushed folds to spread, the core re-anchors at HOME',
    mf3.activeBloom()?.state === 'spread' && mf3.activeBloom()?.coreZoneId === 'home');
  check('H4 legacy claims relink from the foundation (hops + edges re-derived)',
    claimOf(mf3, 'home')?.hops === 0 && claimOf(mf3, 'a')?.via === 'home' && claimOf(mf3, 'b')?.via === 'a');
  check('H5 the unreachable island withers on adoption (the anchored law applied to old saves)',
    claimOf(mf3, 'z9') === undefined, claimIds(mf3).join(','));
}

console.log(failed ? `probe_myceliafront: ${failed} FAILURE(S)` : 'probe_myceliafront: all checks passed');
process.exit(failed ? 1 : 0);
