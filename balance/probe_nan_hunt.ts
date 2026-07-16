// ---------------------------------------------------------------------------
// ONE-OFF PROBE — NON-FINITE HUNT: recreate the shape of the one-off
// createRadialGradient crash (2026-07-16: a flash/death-burst reached the
// renderer with a non-finite pos/radius) and catch the FIRST bad number at
// its birth tick, not seconds later at the draw site. The scenario mirrors
// the crash session: a chitin-vs-gnoll faction brawl thick with deathBurst
// bodies (implode + orb + contact-orb + worms), the hero hard-teleported
// EXACTLY onto monsters mid-brawl, dist-0 knockbacks, and rapid mid-combat
// devMintTileset hops. Every tick sweeps actors, death-bursts, flashes and
// projectiles with Number.isFinite. Run: npx tsx balance/probe_nan_hunt.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import type { BuildSpec } from '../src/sim/types';
import { angleTo, vec } from '../src/core/math';

bootSimEngine();

const fin = Number.isFinite;
const DT = 1 / 60;

// The brawl cast: both warring desert factions plus every deathBurst texture —
// implode (bombardier), free orb (shrike), contact orb (acolyte), worm bodies
// (sovereign + the tight-spacing sandmaw).
const WAR_CAST: string[] = [
  'chitin_drone', 'chitin_drone', 'chitin_drone', 'chitin_lancer', 'chitin_lancer',
  'chitin_spitter', 'chitin_burrower', 'chitin_broodtender', 'brood_sovereign',
  'gnoll_prowler', 'gnoll_prowler', 'gnoll_butcher', 'gnoll_longshot', 'gnoll_howler', 'gnoll_impaler',
  'bombardier_beetle', 'bombardier_beetle', 'bombardier_beetle',
  'ember_shrike', 'ember_shrike', 'storm_acolyte', 'storm_acolyte',
  'sandmaw_burrower',
];
const HOP_TILESETS = ['hivesands', 'saltflat'];

function badNum(label: string, v: number): string | null {
  return fin(v) ? null : `${label}=${v}`;
}

/** Sweep every render-bound numeric the crash implicates. Returns the first
 *  offence found, with enough context to name the producer. */
function sweep(world: World): string | null {
  for (const a of world.actors) {
    const parts = [
      badNum('pos.x', a.pos.x), badNum('pos.y', a.pos.y),
      badNum('facing', a.facing), badNum('life', a.life),
      badNum('velEst.x', a.velEst.x), badNum('velEst.y', a.velEst.y),
      a.push ? badNum('push.vx', a.push.vx) : null,
      a.push ? badNum('push.vy', a.push.vy) : null,
    ].filter(Boolean);
    if (parts.length) {
      return `ACTOR ${a.name}#${a.id} (${a.kind ?? 'monster'}, dead=${a.dead}, worm=${!!a.worm}, `
        + `dash=${!!a.dash}, leap=${!!a.leap}, burrow=${!!a.burrow}): ${parts.join(', ')}`;
    }
    if (a.worm) {
      for (let i = 0; i < a.worm.segments.length; i++) {
        const s = a.worm.segments[i];
        if (!fin(s.x) || !fin(s.y)) return `WORM SEG ${a.name}#${a.id}[${i}]=(${s.x},${s.y})`;
      }
    }
  }
  for (const b of world.deathBursts) {
    const parts = [
      badNum('pos.x', b.pos.x), badNum('pos.y', b.pos.y), badNum('t', b.t),
      badNum('coalesce', b.coalesce), badNum('life', b.life), badNum('dir', b.dir),
      badNum('radius', b.radius), badNum('speed', b.speed), badNum('dmg', b.dmg),
    ].filter(Boolean);
    if (parts.length) return `DEATHBURST ${b.mode}/${b.phase} (${b.type}): ${parts.join(', ')}`;
    for (const tp of b.trail) {
      if (!fin(tp.x) || !fin(tp.y)) return `DEATHBURST trail (${b.mode}): (${tp.x},${tp.y})`;
    }
  }
  for (const f of world.flashes) {
    const parts = [
      badNum('pos.x', f.pos.x), badNum('pos.y', f.pos.y),
      badNum('radius', f.radius), badNum('life', f.life), badNum('maxLife', f.maxLife),
    ].filter(Boolean);
    if (parts.length) return `FLASH color=${f.color} beam=${!!f.beam} bolt=${!!f.bolt}: ${parts.join(', ')}`;
  }
  for (const p of world.projectiles) {
    if (!fin(p.pos.x) || !fin(p.pos.y) || !fin(p.dir)) {
      return `PROJECTILE ${p.inst?.def.id ?? '?'} pos=(${p.pos.x},${p.pos.y}) dir=${p.dir}`;
    }
  }
  return null;
}

function spawnWar(world: World, at: { x: number; y: number }): Actor[] {
  const spawned: Actor[] = [];
  WAR_CAST.forEach((id, i) => {
    const m = world.createMonster(id, 12, 'enemy');
    // A tight ring, some EXACTLY stacked (i % 5 === 0) — the crash session's
    // teleport-onto-cluster produced true zero-distance bodies.
    const r = i % 5 === 0 ? 0 : 18 + (i % 4) * 14;
    m.pos = world.clampPos(vec(at.x + Math.cos(i * 1.7) * r, at.y + Math.sin(i * 1.7) * r), m.radius);
    m.aggroed = true;
    world.actors.push(m);
    spawned.push(m);
  });
  return spawned;
}

function liveMonsters(world: World): Actor[] {
  return world.actors.filter(a => a !== world.player && !a.dead && !a.construct && a.team === 'enemy');
}

let failed = 0;

for (const seed of [11, 137, 20260716, 7411, 424242, 998877]) {
  seedGlobalRandom(seed);
  const world = makeSimWorld('tamer', seed);
  const spec: BuildSpec = {
    id: 'nan_hunt', classId: 'tamer', level: 12,
    skills: [{ id: 'corpse_explosion', level: 3 }],
  };
  applyBuild(world, spec, 12);
  world.player.invulnerable = true; // the hunt needs a standing seat, not a fair fight

  let hop = 0;
  const zid = world.devMintTileset(HOP_TILESETS[0], 40 + hop, 12, { seed: seed * 31 + hop });
  if (!zid) { console.log(`FAIL  seed=${seed} could not mint ${HOP_TILESETS[0]}`); failed++; continue; }
  spawnWar(world, world.player.pos);

  let breach: string | null = null;
  const FRAMES = 60 * 40; // 40 sim-seconds per seed
  for (let frame = 0; frame < FRAMES && !breach; frame++) {
    // The session's stressors, on staggered cadences:
    const live = liveMonsters(world);
    if (frame % 45 === 17 && live.length) {
      // Hard QA teleport: the hero lands EXACTLY on a monster (zero distance).
      const m = live[frame % live.length];
      world.player.pos.x = m.pos.x; world.player.pos.y = m.pos.y;
    }
    if (frame % 60 === 31 && live.length) {
      // A dist-0 knockback: shover standing in the shovee.
      const m = live[(frame * 7) % live.length];
      world.pushActor(m, angleTo(m.pos, m.pos), 420);
    }
    if (frame % 9 === 3 && live.length) {
      // The hero blasts the brawl (also feeds on its corpses).
      const m = live[(frame * 3) % live.length];
      const inst = world.player.skills.find(s => s?.def.id === 'corpse_explosion');
      if (inst) { world.player.mana = world.player.maxMana(); world.useSkill(world.player, inst, vec(m.pos.x, m.pos.y)); }
    }
    if (frame > 0 && frame % 420 === 0) {
      // Mid-combat zone hop through the real mint path, then a fresh war.
      hop++;
      world.devMintTileset(HOP_TILESETS[hop % HOP_TILESETS.length], 40 + hop, 12, { seed: seed * 31 + hop });
      spawnWar(world, world.player.pos);
    }
    if (frame % 240 === 120) spawnWar(world, world.player.pos); // keep bodies dying all run

    world.update(DT);
    const bad = sweep(world);
    if (bad) breach = `seed=${seed} frame=${frame} (hop=${hop}): ${bad}`;
  }
  if (breach) { console.log(`FAIL  ${breach}`); failed++; }
  else console.log(`PASS  seed=${seed} clean (${FRAMES} frames, ${hop} hops)`);
}

console.log(failed ? `\nnan-hunt: ${failed} breach(es)` : '\nnan-hunt: all clean');
process.exit(failed ? 1 : 0);
