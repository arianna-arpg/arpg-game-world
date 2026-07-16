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
// failed the invariant. This rig recreates the class structurally and densely
// instead of waiting for a lucky seed: a forest roof allowed to plant INSIDE
// the carve disc (portalClear 100 < EXIT_CLEAR_CARVE + rMin), then a blanket
// of fat clearings whose reservations land across the planted roof. With the
// contract aligned, covered scatter is carved like bare scatter and no seed
// can violate.
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
  generateLayout, blocksMovement, type Doodad, type GeneratedLayout,
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
    // Plant INSIDE the carve disc on purpose: the recipe's gate is center-only
    // (no radius term), so gate 100 < EXIT_CLEAR_CARVE + rMin(40) puts every
    // near-portal tree in the splice's jurisdiction.
    forestPortalClear: 100,
    forestTreeMix: [{ kind: 'tree', weight: 1, radius: [40, 58] }],
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

console.log(`\nprobe portal-contract: ${SEEDS} seeds — ${violations} violation(s), ${rigDead} dead rig(s)`);
if (violations || rigDead) process.exit(1);
console.log('PROBE PORTAL-CONTRACT OK');
