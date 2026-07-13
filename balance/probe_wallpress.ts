// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the wall-press contract, on the real engine in the real town:
// a body pressed into a grid-carved structure wall must HOLD THE FACE. No
// oscillation ("rubberband"), no cell-center pops, with or without crowd
// pressure (an overlapping neighbor shoving through separateActors — the
// mechanism that used to snapToWalkable-hop a pinned hero every few frames).
// Wind push and vortex pull ride the same origin-aware confine; this probe
// covers the separation lane, the one a player feels in town.
// Run: npx tsx balance/probe_wallpress.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const world = makeSimWorld('juggernaut', 12345);
world.loadZone('lastlight');
const p = world.player;
const dt = 1 / 60;

// house_small (a fixture at a fixed spot — the town keeps its shape by seed).
const house = world.structures.find(s => s.defId === 'house_small');
check('town: house_small placed', !!house, world.structures.map(s => s.defId).join(','));
const rect = house!.rect;

interface Press { amp: number; reversals: number; maxJump: number; settledX: number }
/** Hold a heading for `frames`; measure post-contact stability on the press axis. */
function press(startX: number, startY: number, dx: number, dy: number,
  frames: number, glueShover: (() => void) | null): Press {
  p.pos.x = startX; p.pos.y = startY; p.vel.x = 0; p.vel.y = 0;
  const xs: number[] = [];
  for (let f = 0; f < frames; f++) {
    glueShover?.();
    world.moveActor(p, dx, dy, dt);
    world.update(dt);
    xs.push(dx !== 0 ? p.pos.x : p.pos.y);
  }
  const w0 = Math.floor(frames * 0.4); // approach done well before this
  let lo = Infinity, hi = -Infinity, rev = 0, lastD = 0, maxJ = 0;
  for (let i = w0; i < frames; i++) {
    lo = Math.min(lo, xs[i]); hi = Math.max(hi, xs[i]);
    if (i === w0) continue;
    const d = (xs[i] - xs[i - 1]) * Math.sign(dx !== 0 ? dx : dy);
    maxJ = Math.max(maxJ, Math.abs(d));
    if (Math.abs(d) > 0.3 && Math.abs(lastD) > 0.3 && Math.sign(d) !== Math.sign(lastD)) rev++;
    if (Math.abs(d) > 0.3) lastD = d;
  }
  return { amp: hi - lo, reversals: rev, maxJump: maxJ, settledX: xs[frames - 1] };
}

// --- 1) plain cardinal press into the west face: dead still at the face -----
const midY = rect.y + rect.h / 2;
const plain = press(rect.x - 60, midY, 1, 0, 240, null);
check('plain west press: no oscillation', plain.amp < 0.5 && plain.reversals === 0,
  `amp=${plain.amp.toFixed(2)} rev=${plain.reversals}`);

// --- 2) crowd pressure: a neighbor glued behind must not rubberband ---------
const shover = world.actors.find(a => a !== p && !a.dead && !a.construct && a.team !== 'enemy');
check('town: found a body to shove with', !!shover, shover?.name ?? 'none');
if (shover) {
  const glued = press(rect.x - 60, midY, 1, 0, 240, () => {
    shover.pos.x = p.pos.x - (p.radius + shover.radius) + 6;
    shover.pos.y = p.pos.y;
  });
  check('crowded west press: holds the face (no pops)',
    glued.amp < 2 && glued.maxJump < 2 && glued.reversals === 0,
    `amp=${glued.amp.toFixed(2)} maxJump=${glued.maxJump.toFixed(2)} rev=${glued.reversals}`);
}

// --- 3) diagonal slide along the face: smooth travel, no teleports ----------
const stepMax = p.sheet.get('moveSpeed') * dt * 1.25;
const slide = press(rect.x - 60, rect.y + rect.h * 0.25, 1, 0.55, 240, null);
check('diagonal slide: no frame ever jumps past a stride',
  slide.maxJump <= stepMax, `maxJump=${slide.maxJump.toFixed(2)} stride≈${stepMax.toFixed(2)}`);

process.exit(failed ? 1 : 0);
