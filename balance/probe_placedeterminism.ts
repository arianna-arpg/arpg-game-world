// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SEEDED FALLBACK: load-time placement stays a pure
// function of the zone seed even when the POI pool runs dry.
//
// interactSpot (world.ts) hands out ground for every load-time fixture —
// survey spires, rift seams, pyre bowls, dig mounds, altars, shrines, chests,
// fonts, the waypoint, throng pockets, lite pours, ambient scenery, riddle
// courts. It prefers a generation POI, and `pois` is CONSUMED by splice, so the
// last consumers in a load routinely find the pool empty and fall through to
// farPoint. That fallback used to sample the TRUE die, which quietly broke the
// contract two authored comments still promise — "a remembered seed puts every
// stone back where it stood" — while a spire's banked charge restores by INDEX
// (memory.spireCharges[i]): the stone could re-place itself somewhere new and
// inherit a stranger's progress.
//
// This rig pins the cure: farPoint takes its sampler as a parameter, and the
// seeded lane draws from a dedicated sub-stream keyed (zone seed, salt, call
// ordinal) — never from the caller's rng, so no other lane's draw order moves.
// Run: npx tsx balance/probe_placedeterminism.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import type { Vec2 } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const at = (p: Vec2): string => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
const same = (a: Vec2, b: Vec2): boolean =>
  Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;

bootSimEngine();
const world = makeSimWorld('warrior', 4242);

/** The private seam this rig is about — reached the headless way. */
type Guts = {
  seededDraw(): (a: number, c: number) => number;
  farPoint(minFromPlayer: number, spaceFromEvents?: boolean,
    draw?: (a: number, c: number) => number): Vec2;
  interactSpot(pois: Vec2[], rng: unknown, minDist: number, clear: number): Vec2;
  farPointDraws: number;
  currentZoneSeed: number;
};
const guts = world as unknown as Guts;
const { Rng } = await import('../src/core/rng');

// Stand the hero on real ground before asking for far points.
const zid = world.devMintTileset('crystal', 0, 8, { seed: 424242 });
check('boot: the crystal country mints', !!zid, zid ?? 'null');

// === RIG A — seededDraw is a pure function of (zone seed, ordinal) ==========
{
  const pull = (ordinal: number): Vec2 => {
    guts.farPointDraws = ordinal - 1; // the factory pre-increments
    return guts.farPoint(300, false, guts.seededDraw());
  };
  const a1 = pull(1), a1again = pull(1), a2 = pull(2);
  check('A1 the same ordinal replays the same ground', same(a1, a1again),
    `${at(a1)} vs ${at(a1again)}`);
  check('A2 the NEXT ordinal lands elsewhere — two fallbacks in one load never stack',
    !same(a1, a2), `${at(a1)} vs ${at(a2)}`);

  // The zone seed is the other half of the key: the same ordinal under a
  // different seed must find different ground, or every zone in the world
  // would stand its fixtures on one spot.
  const seed0 = guts.currentZoneSeed;
  const b1 = pull(1);
  guts.currentZoneSeed = (seed0 ^ 0x5eed) >>> 0;
  const c1 = pull(1);
  guts.currentZoneSeed = seed0;
  check('A3 a different zone seed moves the same ordinal', !same(b1, c1),
    `${at(b1)} vs ${at(c1)}`);
  check('A4 and restoring the seed restores the ground', same(pull(1), b1));
}

// === RIG B — interactSpot's DRY-POOL road is seeded ========================
// The reported bug's exact shape: an empty `pois` (what the last consumers in a
// load actually see) used to reach the true die.
{
  const rng = new Rng(7);
  const spot = (ordinal: number): Vec2 => {
    guts.farPointDraws = ordinal - 1;
    return guts.interactSpot([], rng, 560, 200);
  };
  const s1 = spot(1), s1again = spot(1);
  check('B1 an exhausted POI pool still replays its spot', same(s1, s1again),
    `${at(s1)} vs ${at(s1again)}`);
  check('B2 successive dry calls spread (the beacon circuit asks twice in a row)',
    !same(spot(1), spot(2)));
}

// === RIG C — the TRUE die is still the default ==============================
// The fix must not quietly freeze the ~70 event/overlay callers that WANT a
// fresh roll every visit. Sampling once could coincide by luck, so this asks
// for many and demands real spread.
{
  const seen = new Set<string>();
  for (let i = 0; i < 24; i++) seen.add(at(guts.farPoint(300)));
  check('C1 farPoint with no sampler still wanders (events keep their fresh roll)',
    seen.size > 1, `${seen.size} distinct of 24`);
}

// === RIG D — THE STRUCTURAL WITNESS: the dry road never touches the true die =
// The discriminating check. B1 catches the wander behaviourally, but only when
// the sampled points happen to differ; this states the invariant itself, so it
// fails the instant any road through a seeded placement reaches Math.random
// again — samplePoint's `rand`, or a future leak in clearTransitSpot /
// farthestStand / clampPos.
{
  const real = Math.random;
  let touched = 0;
  Math.random = (): number => { touched++; return real(); };
  let spot: Vec2;
  try {
    spot = guts.interactSpot([], new Rng(11), 560, 200);
  } finally {
    Math.random = real;
  }
  check('D1 an exhausted-pool placement consults the true die ZERO times',
    touched === 0, `${touched} unseeded draw(s), spot ${at(spot)}`);
}

// === RIG E — end to end: a re-load re-places scenery on the SAME ground =====
// A whole-pipeline sanity pass, NOT the discriminating one: whether scenery
// even reaches the fallback depends on how much of the POI pool the earlier
// consumers spliced away, and in this zone it does not. It still guards the
// seeded roads it DOES exercise (the POI splice order, clampPos, the per-load
// reset) against a future unseeded leak. Zone memory would mask the whole thing
// — scenery actors are fromZoneGen, so a remembered zone restores them at their
// recorded spots — hence refreshZones before each re-load.
{
  const voices = (): string[] => world.actors
    .filter((a: Actor) => !a.dead && a.defId === 'resonant_crystal')
    .map((a: Actor) => at(a.pos)).sort();
  const first = voices();
  check('E1 the country planted voices to compare', first.length >= 3,
    `${first.length} voices`);
  let stable = true;
  let witness = '';
  for (let pass = 0; pass < 3 && stable; pass++) {
    world.refreshZones();          // forget the population — force re-derivation
    world.loadZone(zid!);          // same def.seed ⇒ same layout, fresh scenery roll
    const again = voices();
    if (again.join('|') !== first.join('|')) {
      stable = false;
      witness = `pass ${pass + 1}: [${first.join(' ')}] -> [${again.join(' ')}]`;
    }
  }
  check('E2 three memory-less re-loads plant every voice on the same ground',
    stable, witness || `${first.length} voices held across 3 re-loads`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
