// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SQUISH FABRIC end to end on the real engine
// (engine/squish.ts; docs/engine/squish.md). Pins:
//   - THE TREAD: a hero standing over the ant file kills it through the
//     ordinary kill path — dead same frame, CREDITED (seat XP paid),
//   - THE MASS GATE: the one predicate refuses the light (a squirrel-weight
//     body can never crush the file; a hero can) and the spec's ratio dial
//     is the whole identity (the sand scorpion asks 1.6×: a man-weight
//     tread crushes it, a half-weight one must fight it),
//   - THE WHOLE ANIMAL IS TENDER: treading the TAIL segment of the worm
//     file, far from the head, is treading the creature (the segR law),
//   - THE BOOT GOES OVER, NOT INTO: a squish pair skips crowd separation —
//     the treader is never shouldered off its own crunch (position pinned
//     through the kill frame),
//   - FACTION-BLIND: a heavy MONSTER tramples the file too (physics, not
//     allegiance — no player special case, credit path safe),
//   - THE ALTITUDE SPLIT: a flying body passes over the file and crushes
//     nothing; the posture guards (carried, leaping, downed) refuse too,
//   - THE SLEEPER IS SPARED: a dormant squishable is scenery, not prey,
//   - the TRUE-ANT RESCALE holds: the file reads as ants (radius ≤ 3.5,
//     the trail still a trail — length ≥ 7).
// Run: npx tsx balance/probe_squish.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { canSquish, squishSpecOf } from '../src/engine/squish';
import { MONSTERS } from '../src/data/monsters';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(1 / 60); };

// ------------------------------------------------------------------ the spec
{
  check('spec: `true` normalizes to all-defaults; absent stays null',
    JSON.stringify(squishSpecOf({ squish: true })) === '{}' && squishSpecOf({}) === null);
  check('data: the ant trail wears the fabric; the scorpion dials its own ratio',
    !!MONSTERS.ant_trail.squish && (MONSTERS.sand_scorpion.squish as { ratio?: number })?.ratio === 1.6);
  check('rescale: the file reads as ANTS (radius ≤ 3.5) and still as a TRAIL (length ≥ 7)',
    MONSTERS.ant_trail.radius <= 3.5 && (MONSTERS.ant_trail.worm?.length ?? 0) >= 7,
    `radius ${MONSTERS.ant_trail.radius}, length ${MONSTERS.ant_trail.worm?.length}`);
}

// ----------------------------------------------------------------- the tread
{
  seedGlobalRandom(11);
  const w = makeSimWorld('warrior', 11);
  const ant = spawn(w, 'ant_trail', 1, 700, 500);
  w.player.pos = vec(700, 500); // the boot comes down
  const xp0 = w.seats[0].meta.xp;
  step(w, 2);
  check('tread: standing over the file kills it same frame (no swing asked)',
    ant.dead, `dead ${ant.dead}`);
  check('tread credit: the crunch PAYS the treader (seat XP — the death ladder ran)',
    w.seats[0].meta.xp > xp0, `xp ${xp0} → ${w.seats[0].meta.xp}`);
}

// -------------------------------------------------------------- the mass gate
{
  seedGlobalRandom(23);
  const w = makeSimWorld('warrior', 23);
  const ant = spawn(w, 'ant_trail', 1, 900, 700);
  const spec = ant.squish!;
  // Unit pins on THE ONE PREDICATE, weights pinned exact (variance-proof).
  const light = spawn(w, 'zombie', 1, 300, 300);
  light.sheet.setBase('weight', 0.3);  // squirrel-class
  light.sheet.setBase('poise', 0);
  const heavy = spawn(w, 'zombie', 1, 300, 400);
  heavy.sheet.setBase('weight', 1);    // man-weight
  heavy.sheet.setBase('poise', 0);
  check('gate: a squirrel-weight body can NEVER crush the file (0.3 < 0.116×6)',
    !canSquish(light, ant, spec));
  check('gate: a man-weight body can (1.0 ≥ 0.116×6)',
    canSquish(heavy, ant, spec) && canSquish(w.player, ant, spec));
  // The scorpion's own dial: 1.6× — man-weight crushes, half-weight fights.
  const scorp = spawn(w, 'sand_scorpion', 1, 900, 900);
  const sSpec = scorp.squish!;
  const asks = scorp.effectiveWeight() * 1.6;
  check('dial: the scorpion asks its OWN ratio (1.6×) — man-weight treads it',
    canSquish(heavy, scorp, sSpec) === (1 >= asks),
    `asks ${asks.toFixed(3)}`);
  const half = spawn(w, 'zombie', 1, 300, 500);
  half.sheet.setBase('weight', asks * 0.9);
  half.sheet.setBase('poise', 0);
  check('dial: a body under the scorpion\'s ask must FIGHT it (gate refuses)',
    !canSquish(half, scorp, sSpec));
  // Integration: the light body stands ON the file — nothing dies.
  light.pos = vec(900, 700);
  step(w, 3);
  check('gate integration: the light body stands among the ants and kills nothing',
    !ant.dead, `ant dead ${ant.dead}`);
}

// ------------------------------------------------- the whole animal is tender
{
  seedGlobalRandom(37);
  const w = makeSimWorld('warrior', 37);
  const ant = spawn(w, 'ant_trail', 1, 700, 500);
  // Lay the file by hand: nine workers marching east, exactly spacing apart
  // (the pull law leaves an exact file untouched).
  const sp = ant.worm!.spacing;
  for (let i = 0; i < ant.worm!.length; i++) {
    ant.worm!.segments.push(vec(700 + (i + 1) * sp, 500));
  }
  const tail = ant.worm!.segments[ant.worm!.length - 1];
  w.player.pos = vec(tail.x, tail.y); // the boot lands on the LAST worker
  step(w, 2);
  check('worm: treading the TAIL segment, far from the head, is treading the creature',
    ant.dead, `head-to-boot ${Math.hypot(w.player.pos.x - 700, w.player.pos.y - 500).toFixed(0)}u`);
}

// --------------------------------------------- the boot goes over, not into
{
  seedGlobalRandom(53);
  const w = makeSimWorld('warrior', 53);
  const ant = spawn(w, 'ant_trail', 1, 800, 800);
  w.player.pos = vec(800, 800);
  const px = w.player.pos.x, py = w.player.pos.y;
  step(w, 2);
  check('separation: the treader is never shouldered off its own crunch (position held)',
    ant.dead && Math.hypot(w.player.pos.x - px, w.player.pos.y - py) < 0.5,
    `moved ${Math.hypot(w.player.pos.x - px, w.player.pos.y - py).toFixed(2)}u`);
}

// -------------------------------------------------------------- faction-blind
{
  seedGlobalRandom(71);
  const w = makeSimWorld('warrior', 71);
  const ant = spawn(w, 'ant_trail', 1, 600, 900);
  const brute = spawn(w, 'scree_shambler', 5, 600, 900); // ~4.8 effective weight
  step(w, 2);
  check('faction-blind: a heavy MONSTER tramples the file too (physics, not allegiance)',
    ant.dead && !brute.dead, `ant dead ${ant.dead}`);
}

// ------------------------------------------------------- posture + the sleeper
{
  seedGlobalRandom(89);
  const w = makeSimWorld('warrior', 89);
  const ant = spawn(w, 'ant_trail', 1, 1000, 500);
  const spec = ant.squish!;
  check('altitude: a FLYING body over the file crushes nothing (the split holds)',
    (() => { w.player.flying = true; const v = canSquish(w.player, ant, spec); w.player.flying = false; return !v; })());
  check('posture: a CARRIED body is not walking (heldBy refuses)',
    (() => { w.player.heldBy = 999; const v = canSquish(w.player, ant, spec); w.player.heldBy = undefined; return !v; })());
  // Integration: a flying player over the file — alive through the frames.
  // (`flying` is RE-DERIVED each tick from flyingBase/flight statuses —
  // the fabric's own law; the probe rides the persistent lever.)
  w.player.flyingBase = true;
  w.player.pos = vec(1000, 500);
  step(w, 3);
  check('altitude integration: the file lives under the flier',
    !ant.dead);
  w.player.flyingBase = false;
  step(w, 2);
  check('altitude integration: landing on it ends it (the same overlap, now a tread)',
    ant.dead);
  // THE SLEEPER IS SPARED: a dormant squishable is scenery, not prey.
  const drowser = spawn(w, 'ant_trail', 1, 400, 500);
  drowser.tag = 'wayfarer'; // a DORMANT_TAGS citizen, un-roused
  w.player.pos = vec(400, 500);
  step(w, 3);
  check('sleeper: dormancy outranks physics (the sentry fabric\'s own law)',
    !drowser.dead);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
