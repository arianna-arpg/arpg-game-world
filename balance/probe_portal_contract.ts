// PORTAL-CLEAR CONTRACT PROBE — the convex portal splice (levelgen's
// EXIT_CLEAR_CARVE carve) and genqa's portal invariant must exempt the SAME
// set: keep-tagged waiver pieces, doors, plan-structure rects — and nothing
// else. A bare Reservation shields NOTHING from the carve: it promises that
// LATER stamps route around the footprint, never that whatever already stood
// inside is authored.
//
// The historical failure class (tileset:petrified_weald, genqa seed 2000023):
// a recipe-planted blocker that a LATER site/clearing reservation happened to
// cover survived the splice (which then exempted ALL reserved ground) and
// failed the invariant. Rig A recreates the class structurally and densely
// instead of waiting for a lucky seed: a forest roof allowed to plant INSIDE
// the carve disc (portalClear 100 < EXIT_CLEAR_CARVE + rMin), then a blanket
// of fat clearings whose reservations land across the planted roof. With the
// contract aligned, covered scatter is carved like bare scatter and no seed
// can violate.
//
// Rig B — THE BODY GATE: the recipes' own portalClear promise is priced
// against the rolled BODY (radius × bodyScale), never the center alone — a
// fat trunk rolled at the clearance edge may not lean its body across the
// line. CLEAR here sits far above the splice's 95 + r jurisdiction, so every
// offender is the RECIPE's own acceptance, not a missed carve; both canopy
// lanes carry the gate (the forest sweep and riverland's riverbank roof).
//
// Exit 1 on any violation — or on a dead rig (a probe that cannot fire must
// say so, not pass green).
//   npx tsx balance/probe_portal_contract.ts [-- --seeds 60 --verbose]

// Side-effect registries — the same set genqa loads; a missing import here
// would make the probe test a DIFFERENT game.
import '../src/data/clusters';
import '../src/data/formations';
import '../src/engine/landmarkBuilders';
import '../src/data/landmarks';
import '../src/engine/layoutRecipes';
import '../src/engine/interiorGen';
import '../src/data/compositions';

import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import {
  generateLayout, blocksMovement, doodadRuleOf, type Doodad, type GeneratedLayout,
} from '../src/engine/levelgen';
import type { ZoneDef } from '../src/data/zones';

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SEEDS = Number(flag('seeds') ?? 60);
const VERBOSE = args.includes('--verbose');

// Mirrored from levelgen, like genqa — the probe asserts the OBSERVABLE
// promise, not the internals.
const EXIT_CLEAR_CARVE = 95;

const arena = { w: 2400, h: 1800 };
const entry = vec(120, arena.h / 2);
const exits = [vec(arena.w - 120, arena.h / 2), vec(arena.w / 2, 120)];
const pts = [entry, ...exits];

const def: ZoneDef = {
  id: 'qa_portal_contract', name: 'QA portal contract', level: 8,
  size: { w: arena.w, h: arena.h },
  theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
  layoutType: 'forest',
  layoutParams: {
    // Plant INSIDE the carve disc on purpose: the recipe's pre-roll gate is
    // center-only, so gate 100 < EXIT_CLEAR_CARVE + rMin(40) puts every
    // near-portal tree in the splice's jurisdiction. (The recipe's post-roll
    // BODY gate — rig B's subject — refuses only 100 + r × bodyScale ≈ 117,
    // still well inside it: the rig keeps firing.)
    forestPortalClear: 100,
    // forestTrees is the recipe's real dial — the long-dead 'forestTreeMix'
    // name this rig carried silently planted the DEFAULT mix instead (the
    // same trap probe_coherence.ts documents). The rig fired anyway; now it
    // plants the fat single-kind roof its own comment always claimed.
    forestTrees: [{ kind: 'tree', weight: 1, radius: [40, 58] }],
  },
  // The blanket of fat clearings: each reservation that lands over the roof
  // COVERS already-planted trees — the shield the old splice honored and the
  // invariant never did.
  layout: [{ kind: 'clearing', count: [14, 18], radius: [120, 170] }],
  objective: { kind: 'clear' },
  exits: [], map: { x: 0, y: 0 },
};

// genqa's portal predicate, verbatim — keep / door / structure rects exempt.
const inStructure = (layout: GeneratedLayout, d: Doodad): boolean =>
  (layout.structures ?? []).some(st =>
    d.pos.x > st.rect.x - d.radius && d.pos.x < st.rect.x + st.rect.w + d.radius
    && d.pos.y > st.rect.y - d.radius && d.pos.y < st.rect.y + st.rect.h + d.radius);

let violations = 0;
let rigDead = 0;
for (let s = 0; s < SEEDS; s++) {
  const seed = 1000003 * (s + 1) + 17; // genqa's ladder — s=1 IS the historical 2000023
  const layout = generateLayout({ ...def, seed }, arena, new Rng(seed), entry, exits);
  // Rig-alive: the roof planted, and trees stand in portal country (survivors
  // between the carve disc and the plant band always exist when the rig fires).
  const near = layout.doodads.filter(d =>
    pts.some(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) < 200)).length;
  if (layout.doodads.length < 200 || near === 0) {
    rigDead++;
    console.log(`seed ${seed}: RIG DEAD (${layout.doodads.length} doodads, ${near} near portals)`);
    continue;
  }
  const offenders = layout.doodads.filter(d =>
    blocksMovement(d) && !d.keep && d.kind !== 'door' && !inStructure(layout, d)
    && pts.some(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) < EXIT_CLEAR_CARVE * 0.9 + d.radius));
  if (offenders.length) {
    violations += offenders.length;
    for (const d of offenders) {
      const dist = Math.min(...pts.map(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y)));
      console.log(`seed ${seed}: ${d.kind} r=${d.radius.toFixed(0)} at ${dist.toFixed(0)} from a portal — inside the clear`);
    }
  } else if (VERBOSE) {
    console.log(`seed ${seed}: ok (${layout.doodads.length} doodads, ${near} near portals)`);
  }
}

console.log(`\nrig A (splice contract): ${SEEDS} seeds — ${violations} violation(s), ${rigDead} dead rig(s)`);

// --- RIG B: THE BODY GATE ---------------------------------------------------
// The recipes must refuse a tree whose BODY (radius × bodyScale) crosses the
// portalClear line — the exact post-roll rejection layoutRecipes carries, so
// the scan below mirrors its predicate term for term. CLEAR 240 puts the
// whole offender band [CLEAR, CLEAR + r × bodyScale) beyond the splice carve
// (95 + r ≤ 153): nothing downstream deletes what the recipe accepts here,
// and both lanes plant the same fat mix so the band cannot be empty.
const BODY_CLEAR = 240;
const bodyBs = doodadRuleOf('tree').bodyScale ?? 1;
const bEntry = vec(120, 200);
const bExits = [vec(arena.w - 120, 200), vec(arena.w / 2, arena.h - 120)];
const bPts = [bEntry, ...bExits];

let bViolations = 0;
let bDead = 0;
for (const layoutType of ['forest', 'riverland'] as const) {
  const bDef: ZoneDef = {
    id: `qa_portal_body_${layoutType}`, name: `QA portal body (${layoutType})`, level: 8,
    size: { w: arena.w, h: arena.h },
    theme: { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' },
    layoutType,
    layoutParams: {
      forestPortalClear: BODY_CLEAR,
      forestTrees: [{ kind: 'tree', weight: 1, radius: [40, 58] }],
    },
    layout: [],
    objective: { kind: 'clear' },
    exits: [], map: { x: 0, y: 0 },
  };
  let vio = 0, dead = 0, treeMin = Infinity, nearMin = Infinity;
  for (let s = 0; s < SEEDS; s++) {
    const seed = 2000003 * (s + 1) + 71;
    const layout = generateLayout({ ...bDef, seed }, arena, new Rng(seed), bEntry, bExits);
    const trees = layout.doodads.filter(d => d.kind === 'tree');
    // Rig-alive: the roof planted, and trees stand right up against the
    // clearance line (an empty near band would make the assert vacuous —
    // an overtightened gate must fail loudly, not pass green by absence).
    const near = trees.filter(d =>
      bPts.some(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) < BODY_CLEAR + 220)).length;
    treeMin = Math.min(treeMin, trees.length);
    nearMin = Math.min(nearMin, near);
    if (trees.length < 150 || near === 0) {
      dead++;
      console.log(`B/${layoutType} seed ${seed}: RIG DEAD (${trees.length} trees, ${near} near portals)`);
      continue;
    }
    const offenders = trees.filter(d =>
      bPts.some(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y) < BODY_CLEAR + d.radius * bodyBs));
    if (offenders.length) {
      vio += offenders.length;
      for (const d of offenders) {
        const dist = Math.min(...bPts.map(p => Math.hypot(p.x - d.pos.x, p.y - d.pos.y)));
        console.log(`B/${layoutType} seed ${seed}: tree r=${d.radius.toFixed(0)} body=${(d.radius * bodyBs).toFixed(0)} at ${dist.toFixed(0)} — body crosses the ${BODY_CLEAR} clear`);
      }
    } else if (VERBOSE) {
      console.log(`B/${layoutType} seed ${seed}: ok (${trees.length} trees, ${near} near the line)`);
    }
  }
  console.log(`rig B (${layoutType} body gate): ${SEEDS} seeds — ${vio} violation(s), ${dead} dead rig(s) (min ${treeMin} trees, min ${nearMin} near)`);
  bViolations += vio;
  bDead += dead;
}

if (violations || rigDead || bViolations || bDead) process.exit(1);
console.log('PROBE PORTAL-CONTRACT OK');
