// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CORPSE WAGON fabric end to end on the real engine
// (docs/engine/corpses.md): plural finds (TargetingSpec.plural × the
// corpseBatch stat), the summed corpseLifeDamage fuel, echo re-seek (each
// beat eats its own wagon-load), Sacrificial Rites filling a short wagon
// from the minion rank, Soulwalk's bare-field precedence over the knife,
// cap-clamped batch raising (Revive), and the producer inversion (Exhume
// digs by the load). Run: npx tsx balance/probe_corpse.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import { CORPSE_CFG } from '../src/engine/world';
import type { World } from '../src/engine/world';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import type { BuildSpec } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(20260715); // every chance() roll below replays exactly

const mkWorld = (skills: BuildSpec['skills']): World => {
  const world = makeSimWorld('tamer', 7411);
  const spec: BuildSpec = { id: 'corpse_probe', classId: 'tamer', level: 12, skills };
  const warnings = applyBuild(world, spec, 12);
  if (warnings.length) console.log('build warnings:', warnings.join(' | '));
  return world;
};
const step = (world: World, s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};
/** Lay n corpses ringed tight around `at` (inside the default 70px find). */
const lay = (world: World, at: { x: number; y: number }, n: number, maxLife = 100): void => {
  for (let i = 0; i < n; i++) {
    const r = i === 0 ? 0 : 24;
    world.corpses.push({
      pos: { x: at.x + Math.cos(i * 2.1) * r, y: at.y + Math.sin(i * 2.1) * r },
      defId: 'zombie', level: 8, maxLife, remaining: CORPSE_CFG.duration,
    });
  }
};
const press = (world: World, skillId: string, aim: { x: number; y: number }): void => {
  const p = world.player;
  p.mana = p.maxMana();
  const inst = p.skills.find(s => s?.def.id === skillId);
  if (!inst) throw new Error(`probe: '${skillId}' not on the bar`);
  world.useSkill(p, inst, aim);
};
const minions = (world: World): number =>
  world.actors.filter(a => a.owner === world.player && !a.dead && !a.construct).length;

// --- 1) the classic single appetite is untouched ---------------------------
{
  const world = mkWorld([{ id: 'corpse_explosion', level: 3 }]);
  const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
  lay(world, spot, 4);
  press(world, 'corpse_explosion', spot);
  step(world, 1.2);
  check('bare CE eats exactly one body', world.corpses.length === 3,
    `left ${world.corpses.length}/4`);
}

// --- 2) the wagon: one cast, one load (1 + corpseBatch = 3) -----------------
{
  const world = mkWorld([
    { id: 'corpse_explosion', level: 3, supports: [{ id: 'corpse_wagon', level: 1 }] },
  ]);
  const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
  lay(world, spot, 4);
  press(world, 'corpse_explosion', spot);
  step(world, 1.4); // the wagon is heavier: 15% less cast speed
  check('wagon CE eats the load of three', world.corpses.length === 1,
    `left ${world.corpses.length}/4`);
}

// --- 3) the pile detonates LARGER: summed corpse-life fuel ------------------
{
  const hit = (wagon: boolean): number => {
    const world = mkWorld([{
      id: 'corpse_explosion', level: 3,
      ...(wagon ? { supports: [{ id: 'corpse_wagon', level: 1 }] } : {}),
    }]);
    const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
    const victim = world.createMonster('zombie', 30, 'enemy');
    victim.pos = { x: spot.x, y: spot.y };
    world.actors.push(victim);
    const before = victim.life;
    lay(world, spot, 3, 400); // fat bodies: the 15% fuel dominates the roll
    press(world, 'corpse_explosion', spot);
    step(world, 1.4);
    return before - victim.life;
  };
  const bare = hit(false), loaded = hit(true);
  check('wagon blast carries the summed fuel', loaded > bare * 1.6,
    `bare ${Math.round(bare)} vs loaded ${Math.round(loaded)}`);
}

// --- 4) echo re-seeks: each beat eats its own wagon-load --------------------
{
  const world = mkWorld([{
    id: 'corpse_explosion', level: 3,
    supports: [{ id: 'corpse_wagon', level: 1 }, { id: 'spell_echo', level: 1 }],
  }]);
  const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
  lay(world, spot, 6);
  press(world, 'corpse_explosion', spot);
  step(world, 2.0);
  check('echoed wagon clears the whole pile (3 + 3)', world.corpses.length === 0,
    `left ${world.corpses.length}/6`);
}

// --- 5) Sacrificial Rites fills a SHORT wagon from the rank -----------------
{
  const world = mkWorld([{
    id: 'corpse_explosion', level: 3,
    supports: [{ id: 'corpse_wagon', level: 1 }, { id: 'sacrificial_rites', level: 1 }],
  }]);
  const p = world.player;
  const spot = { x: p.pos.x + 200, y: p.pos.y };
  for (let i = 0; i < 3; i++) {
    const m = world.createMonster('skeleton_warrior', 8, p.team, p);
    m.pos = { x: spot.x + 30 * (i + 1), y: spot.y + 20 };
    world.actors.push(m);
  }
  lay(world, spot, 1);
  check('rites rig: three in the rank', minions(world) === 3);
  press(world, 'corpse_explosion', spot);
  step(world, 1.4);
  check('rites tops the load up: two of the rank paid', minions(world) === 1,
    `standing ${minions(world)}/3`);
  check('rites-fed wagon leaves no bodies', world.corpses.length === 0,
    `left ${world.corpses.length}`);
}

// --- 6) Soulwalk keeps first claim on a BARE field --------------------------
{
  const world = mkWorld([{
    id: 'corpse_explosion', level: 3,
    supports: [{ id: 'soulwalk', level: 1 }, { id: 'sacrificial_rites', level: 1 }],
  }]);
  const p = world.player;
  const spot = { x: p.pos.x + 200, y: p.pos.y };
  for (let i = 0; i < 2; i++) {
    const m = world.createMonster('skeleton_warrior', 8, p.team, p);
    m.pos = { x: spot.x + 24 * i, y: spot.y };
    world.actors.push(m);
  }
  press(world, 'corpse_explosion', spot);
  step(world, 1.2);
  check('soulwalk precedence: nobody was knifed for fuel', minions(world) === 2,
    `standing ${minions(world)}/2`);
}

// --- 7) Revive raises by the load, clamped to free roster slots -------------
{
  const world = mkWorld([{
    id: 'revive', level: 3, supports: [{ id: 'corpse_wagon', level: 1 }],
  }]);
  const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
  lay(world, spot, 4);
  press(world, 'revive', spot);
  step(world, 1.6);
  check('revive stands the row up together (3 raised)', minions(world) === 3,
    `standing ${minions(world)}`);
  check('revive ate only what stood back up', world.corpses.length === 1,
    `left ${world.corpses.length}/4`);
  lay(world, spot, 2); // 3 on the ground now, 3 free slots (cap 6)
  press(world, 'revive', spot);
  step(world, 1.6);
  check('second load fills the roster to its cap of 6', minions(world) === 6,
    `standing ${minions(world)}`);
  lay(world, spot, 3);
  press(world, 'revive', spot);
  step(world, 1.6);
  check('at cap the rite keeps the classic single-rotate', minions(world) === 6
    && world.corpses.length === 2, `standing ${minions(world)}, left ${world.corpses.length}/3`);
}

// --- 8) the producer inversion: Exhume digs by the load ---------------------
{
  const dug = (wagon: boolean): number => {
    const world = mkWorld([{
      id: 'exhume', level: 3,
      ...(wagon ? { supports: [{ id: 'corpse_wagon', level: 1 }] } : {}),
    }]);
    const spot = { x: world.player.pos.x + 120, y: world.player.pos.y };
    press(world, 'exhume', spot);
    step(world, 1.2);
    return world.corpses.length;
  };
  check('bare Exhume digs its two', dug(false) === 2);
  check('wagon Exhume digs the full load of four', dug(true) === 4);
}

// --- 9) Corpse Feast: the banquet feeds by the body --------------------------
{
  const gain = (wagon: boolean): number => {
    const world = mkWorld([{
      id: 'corpse_feast', level: 3,
      ...(wagon ? { supports: [{ id: 'corpse_wagon', level: 1 }] } : {}),
    }]);
    const p = world.player;
    const spot = { x: p.pos.x + 200, y: p.pos.y };
    lay(world, spot, 3, 100);
    p.life = Math.max(1, p.maxLife() * 0.2);
    const before = p.life;
    press(world, 'corpse_feast', spot);
    step(world, 1.0);
    return p.life - before;
  };
  const bare = gain(false), banquet = gain(true);
  check('feast: the wagon banquet feeds harder', banquet > bare * 2,
    `bare +${Math.round(bare)} vs banquet +${Math.round(banquet)}`);
}

// --- 10) Gather the Dead piles the field -------------------------------------
{
  const world = mkWorld([{ id: 'gather_the_dead', level: 3 }]);
  const p = world.player;
  const mark = { x: p.pos.x + 220, y: p.pos.y };
  for (const [dx, dy] of [[150, 60], [-140, 80], [90, -120], [-60, -150]]) {
    world.corpses.push({
      pos: { x: mark.x + dx, y: mark.y + dy },
      defId: 'zombie', level: 8, maxLife: 80, remaining: CORPSE_CFG.duration,
    });
  }
  press(world, 'gather_the_dead', mark);
  step(world, 0.8);
  const near = world.corpses.filter(c =>
    Math.hypot(c.pos.x - mark.x, c.pos.y - mark.y) <= 60).length;
  check('gather: the graveyard walks to the mark', near === 4, `${near}/4 piled`);
}

// --- 11) Volatile Cinders: the pile rises together ----------------------------
{
  const flights = (wagon: boolean): number => {
    const world = mkWorld([{
      id: 'volatile_cinders', level: 3,
      ...(wagon ? { supports: [{ id: 'corpse_wagon', level: 1 }] } : {}),
    }]);
    const spot = { x: world.player.pos.x + 200, y: world.player.pos.y };
    lay(world, spot, 3);
    press(world, 'volatile_cinders', spot);
    step(world, 0.9);
    return world.projectiles.length;
  };
  check('cinders: one body, one cinder', flights(false) === 1);
  check('cinders: the wagon looses a flight of three', flights(true) === 3);
}

// --- 12) the plague cart spills its load (BrittleSpec.corpses) ---------------
// (The cart's spill is unconditional — the shallow grave shares the same
//  handler behind a 0.9 gameplay roll, so the cart is the deterministic probe.)
{
  const world = mkWorld([{ id: 'cleave', level: 3 }]);
  const p = world.player;
  const spot = { x: p.pos.x + 34, y: p.pos.y };
  world.doodads.push({ pos: { x: spot.x, y: spot.y }, radius: 16, kind: 'plague_cart' });
  const before = world.corpses.length;
  press(world, 'cleave', spot);
  step(world, 1.2);
  check('plague cart: the load spills as raisable bodies', world.corpses.length >= before + 2,
    `+${world.corpses.length - before} bodies`);
}

// --- 13) the ghoul's table manners: gorge heals off YOUR fuel -----------------
{
  const world = mkWorld([{ id: 'corpse_explosion', level: 3 }]);
  const p = world.player;
  const ghoul = world.createMonster('charnel_ghoul', 8, 'enemy');
  ghoul.pos = { x: p.pos.x + 300, y: p.pos.y };
  world.actors.push(ghoul);
  ghoul.life = ghoul.maxLife() * 0.4;
  const hurt = ghoul.life;
  lay(world, { x: ghoul.pos.x + 40, y: ghoul.pos.y }, 2, 120);
  const fuel = world.corpses.length;
  const inst = makeSkillInstance(SKILLS.gorge_carrion, 1);
  world.useSkill(ghoul, inst, { x: ghoul.pos.x + 40, y: ghoul.pos.y });
  step(world, 1.2);
  check('gorge: the ghoul ate the fuel', world.corpses.length < fuel,
    `${world.corpses.length}/${fuel} left`);
  check('gorge: the meal knit its flesh', ghoul.life > hurt + 20,
    `${Math.round(hurt)} → ${Math.round(ghoul.life)}`);
  check('gorge: the frenzy took', ghoul.buffs.has('gorged'));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
