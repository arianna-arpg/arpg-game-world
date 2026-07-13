// ---------------------------------------------------------------------------
// TRAVERSAL KINDS — the data half of the traversal fabric (engine/traversal.ts).
//
// Each row is one vertical crossing's whole feel: phase timings, the veil
// that hides the zone swap, how the body leaves its shadow, streaks, landing
// status. A new way up or down anywhere in the game is one row here — no
// engine edits.
//
// Side-effect module: import it wherever content registries must exist
// (main.ts, sim/arena.ts, balance/genqa.ts, data/validate.ts).
// ---------------------------------------------------------------------------

import { registerTraversal } from '../engine/traversal';

/** SKY LAUNCH — an Aetherial geyser takes you. The ground trembles, the spout
 *  gathers, and the hero is hurled UP toward the camera: the body swells, the
 *  shadow shrinks to a pin on the abandoned ground, cloud-wisps streak
 *  downward past the view, and the world whites out as you punch through the
 *  deck. The veil clears on cloud-stuff underfoot and the launch's uplift
 *  clings to your heels for a few strides. */
registerTraversal({
  id: 'sky_launch',
  windup: 1.1,
  rise: 1.35,
  land: 1.0,
  veil: '#eef3fb',
  veilPeak: 1,
  scaleTo: 2.6,
  lift: 46,
  streaks: { count: 26, color: '#ffffff', dir: 1 },
  shake: 7,
  status: { id: 'windswept' },
  text: 'the geyser takes you…',
  textColor: '#9fd8ff',
});

/** SKY FALL — the cloud gives way. A blink of teetering, then the body drops
 *  AWAY from the camera, tumbling, wisps rushing upward past the view; the
 *  white swallows you and clears on the land you once launched from — knees
 *  bent, winded, alive. The clouds are kind; the spec's fall damage (if any)
 *  is the zone's own CollapseSpec, not this row. */
registerTraversal({
  id: 'sky_fall',
  windup: 0.25,
  rise: 1.1,
  land: 0.9,
  veil: '#eef3fb',
  veilPeak: 1,
  scaleTo: 0.34,
  lift: -30,
  spin: 3.6,
  streaks: { count: 22, color: '#ffffff', dir: -1 },
  status: { id: 'winded' },
  text: 'the cloud gives way!',
  textColor: '#c8d4ea',
});
