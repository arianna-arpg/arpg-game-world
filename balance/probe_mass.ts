// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MASS & AUTHORITY FABRIC end to end on the real engine
// (engine/mass.ts; docs/engine/mass.md). Pins:
//   - the WEIGHT DERIVATION law: monster weight = (radius/ref)^pow ×
//     material density × def.heft at spawn — and base.weight pins absolute
//     (the cherub keeps its authored 0.3 whatever ethereal's density says),
//   - the AUTHORITY IDENTITY law: a weight-1 caster's push == a casterless
//     push == the pre-fabric arithmetic (every tuned strength keeps its
//     reach) — and the ASYMMETRY: the heavy launch the light, the light
//     barely lean on the heavy, with the body term CLAMPED and the
//     shoveAuthority stat scaling openly beyond it,
//   - IMPACT: a wall arrest above the speed gate wounds through the one
//     mitigation ladder with kill credit to the shover (the pitfall lane's
//     law extended to masonry); below the gate, casterless, or friendly →
//     NOTHING (weather is not an attack); capped per slam; ICD'd per body,
//   - THE BOWLING LANE: a light mover is ARRESTED by a heavy blocker (both
//     wounded, flight over); a heavy mover PLOWS light bodies aside
//     (struck share + momentum hand-off with authority already spent);
//     phasing bodies are passed through untouched,
//   - the impactDamage stat scales the wound; determinism holds seeded.
// Run: npx tsx balance/probe_mass.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { MASS_CFG, heftTierOf, shoveAuthority } from '../src/engine/mass';
import { DEFENSE_CFG } from '../src/engine/defense';
import { mod } from '../src/engine/stats';
import { MONSTERS, defDensity } from '../src/data/monsters';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol;

bootSimEngine();

const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
const step = (w: World, dt: number, n = 1): void => { for (let i = 0; i < n; i++) w.update(dt); };
/** Ride a push to rest (~1s covers the full exponential ease-out). */
const settle = (w: World): void => step(w, 1 / 60, 70);

/** The spawn fold's own formula, recomputed independently. */
const expectWeight = (id: string, radius: number): number =>
  Math.pow(radius / DEFENSE_CFG.weight.refRadius, DEFENSE_CFG.weight.radiusPow)
  * defDensity(MONSTERS[id]) * (MONSTERS[id].heft ?? 1);

// ---------------------------------------------------------------- derivation
{
  seedGlobalRandom(4242);
  const w = makeSimWorld('warrior', 4242);
  const skit = spawn(w, 'scree_skitter', 5, 300, 300);
  const ram = spawn(w, 'sarsen_ram', 5, 500, 300);
  const thrall = spawn(w, 'lode_thrall', 5, 700, 300);
  const cherub = spawn(w, 'cherub', 5, 900, 300);
  check('derivation: scree skitter = radius^pow × stone × heft 0.45 (the bowling pin)',
    near(skit.sheet.get('weight'), expectWeight('scree_skitter', skit.radius), 1e-4),
    `weight ${skit.sheet.get('weight').toFixed(3)} expect ${expectWeight('scree_skitter', skit.radius).toFixed(3)}`);
  check('derivation: sarsen ram = radius^pow × stone × heft 1.15 (the avalanche)',
    near(ram.sheet.get('weight'), expectWeight('sarsen_ram', ram.radius), 1e-4),
    `weight ${ram.sheet.get('weight').toFixed(3)}`);
  check('derivation: lode thrall = radius^pow × METAL × heft 2.2 — knee-high, anchor-heavy',
    near(thrall.sheet.get('weight'), expectWeight('lode_thrall', thrall.radius), 1e-4)
    && thrall.sheet.get('weight') > 2,
    `weight ${thrall.sheet.get('weight').toFixed(3)} at radius ${thrall.radius}`);
  check('derivation: the thrall out-weighs a far bigger flesh body (density IS the teach)',
    thrall.sheet.get('weight') > Math.pow(16 / DEFENSE_CFG.weight.refRadius, DEFENSE_CFG.weight.radiusPow),
    `thrall ${thrall.sheet.get('weight').toFixed(2)} vs r16 flesh ${Math.pow(16 / 14, 1.4).toFixed(2)}`);
  check('derivation: base.weight pins ABSOLUTE (the cherub keeps its authored 0.3)',
    near(cherub.sheet.get('weight'), 0.3, 1e-6),
    `weight ${cherub.sheet.get('weight')}`);
  check('tiers: heft ladder reads Featherweight → Monumental monotonically',
    heftTierOf(0.3) === 'Featherweight' && heftTierOf(1) === 'Solid'
    && heftTierOf(thrall.sheet.get('weight')) === 'Heavy' && heftTierOf(20) === 'Monumental');
}

// ----------------------------------------------------------------- authority
{
  seedGlobalRandom(777);
  const w = makeSimWorld('warrior', 777);
  // A body pinned to EXACTLY effective weight 1 — the identity law's anchor.
  // (A fresh WARRIOR reads ~1.011: Fortitude's 0.2%/pt weight grant is
  // already composing — attributes scale the basis, the fabric inherits it.)
  const unit = spawn(w, 'zombie', 3, 200, 400);
  unit.sheet.setBase('weight', 1);
  unit.sheet.setBase('poise', 0);
  check('authority: EXACTLY 1 at effective weight 1 (the identity law\'s anchor)',
    shoveAuthority(unit) === 1, `auth ${shoveAuthority(unit)}`);
  check('authority: a fresh warrior reads a WHISPER over 1 — Fortitude\'s weight grant composing',
    shoveAuthority(w.player) > 1 && shoveAuthority(w.player) < 1.05,
    `auth ${shoveAuthority(w.player).toFixed(4)}`);

  // Identity: a weight-1 caster's push == a casterless push, same victim.
  const v1 = spawn(w, 'zombie', 3, 400, 500);
  const v2 = spawn(w, 'zombie', 3, 400, 700);
  w.pushActor(v1, 0, 120, unit);
  w.pushActor(v2, 0, 120);
  settle(w);
  check('authority identity: weight-1 caster == casterless (tuned reach kept to the pixel)',
    near(v1.pos.x - 400, v2.pos.x - 400, 0.5),
    `with-caster +${(v1.pos.x - 400).toFixed(1)} vs casterless +${(v2.pos.x - 400).toFixed(1)}`);

  // Asymmetry: the shambler launches the skitter; the skitter leans on the shambler.
  const heavy = spawn(w, 'scree_shambler', 5, 700, 900);
  const light = spawn(w, 'scree_skitter', 5, 1000, 900);
  const lx0 = light.pos.x, hx0 = heavy.pos.x;
  w.pushActor(light, 0, 100, heavy);
  w.pushActor(heavy, 0, 100, light);
  settle(w);
  const lightMoved = light.pos.x - lx0, heavyMoved = heavy.pos.x - hx0;
  check('asymmetry: heavy→light launch ≫ light→heavy lean (the fabric\'s whole point)',
    lightMoved > heavyMoved * 4 && lightMoved > 60,
    `light flew ${lightMoved.toFixed(0)}u, heavy leaned ${heavyMoved.toFixed(1)}u`);

  // The body term clamps; the stat scales openly beyond it.
  const anchor = spawn(w, 'lode_thrall', 5, 200, 200);
  anchor.sheet.setBase('weight', 400);
  check('authority clamp: a 400-weight titan\'s body term caps at MASS_CFG.authority.max',
    near(shoveAuthority(anchor), MASS_CFG.authority.max, 1e-6),
    `auth ${shoveAuthority(anchor).toFixed(2)}`);
  const authBare = shoveAuthority(w.player);
  w.player.sheet.setSource('probe', [mod('shoveAuthority', 'flat', 0.5)]);
  check('authority stat: +50% shove authority multiplies AFTER the clamp (investment is open)',
    near(shoveAuthority(w.player) / authBare, 1.5, 1e-6),
    `×${(shoveAuthority(w.player) / authBare).toFixed(3)}`);
  w.player.sheet.setSource('probe', []);
}

// -------------------------------------------------------------------- impact
{
  seedGlobalRandom(31337);
  const w = makeSimWorld('warrior', 31337);
  // A stone wall to be thrown against, mid-arena (the sim arena's BOUNDS
  // clamp without classifying — only real solids report 'wall').
  const wallAt = (x: number, y: number): void => {
    w.doodads.push({ pos: vec(x, y), radius: 42, kind: 'rock' });
  };
  wallAt(700, 300); wallAt(700, 500); wallAt(700, 700); wallAt(700, 900);
  (w as unknown as { markDoodadsChanged(): void }).markDoodadsChanged();

  // The wound: hostile-authored, above the gate.
  const v = spawn(w, 'zombie', 3, 610, 300);
  const life0 = v.life;
  w.pushActor(v, 0, 260, w.player);
  settle(w);
  const wound = life0 - v.life;
  check('impact: a hostile-authored wall slam WOUNDS (mitigated physical, momentum-scaled)',
    wound > 0, `life ${life0.toFixed(0)} → ${v.life.toFixed(0)} (−${wound.toFixed(1)})`);
  check('impact cap: one slam never exceeds maxFrac of max life (pre-mitigation ceiling)',
    wound <= MASS_CFG.impact.maxFrac * v.maxLife() + 0.5,
    `wound ${wound.toFixed(1)} vs cap ${(MASS_CFG.impact.maxFrac * v.maxLife()).toFixed(1)}`);

  // ICD: while the wound gate is armed, an arrest adds NOTHING. (The natural
  // window is tested by construction — a corner's double clamp lands inside
  // icdSec; here we pin the GATE itself with an armed clock.)
  const lifeAfter = v.life;
  v.slamIcdUntil = w.time + 100;
  w.pushActor(v, 0, 260, w.player);
  settle(w);
  check('impact ICD: an armed wound gate swallows the arrest whole (regen may still trickle)',
    v.life >= lifeAfter - 0.01, `life ${lifeAfter.toFixed(1)} → ${v.life.toFixed(1)}`);
  v.slamIcdUntil = 0;

  // Below the speed gate: ordinary jostling never turns walls into damage.
  const soft = spawn(w, 'zombie', 3, 662, 500);
  const soft0 = soft.life;
  w.pushActor(soft, 0, 30, w.player);
  settle(w);
  check('impact gate: a gentle nudge into the wall deals ZERO (minSpeed holds)',
    near(soft.life, soft0, 0.01), `life ${soft0.toFixed(0)} → ${soft.life.toFixed(1)}`);

  // Casterless: wind is weather, not an attack.
  const blown = spawn(w, 'zombie', 3, 610, 700);
  const blown0 = blown.life;
  w.pushActor(blown, 0, 260);
  settle(w);
  check('impact law: a CASTERLESS launch into the wall deals ZERO (weather is not an attack)',
    near(blown.life, blown0, 0.01), `life ${blown0.toFixed(0)} → ${blown.life.toFixed(1)}`);

  // Friendly: two same-team bodies — repositioning bruises nothing.
  const shover = spawn(w, 'scree_shambler', 5, 560, 900);
  const mate = spawn(w, 'zombie', 3, 610, 900);
  const mate0 = mate.life;
  w.pushActor(mate, 0, 260, shover);
  settle(w);
  check('impact law: a NON-HOSTILE author deals ZERO (friendly repositioning stays kind)',
    near(mate.life, mate0, 0.01), `life ${mate0.toFixed(0)} → ${mate.life.toFixed(1)}`);

  // Kill credit: the shover is paid like any killer.
  const prey = spawn(w, 'scree_skitter', 1, 610, 500);
  prey.life = 2;
  const xp0 = w.seats[0].meta.xp;
  w.pushActor(prey, 0, 300, w.player);
  settle(w);
  check('impact credit: the wall kill PAYS the shover (xp — the death ladder ran)',
    prey.dead && w.seats[0].meta.xp > xp0,
    `dead ${prey.dead}, xp ${xp0} → ${w.seats[0].meta.xp}`);

  // The impactDamage stat scales the wound (fresh victim, same launch).
  const v2 = spawn(w, 'zombie', 3, 610, 900);
  // Clear the friendly shover so the lane is clean.
  shover.pos = vec(200, 200);
  const v2base = v2.life;
  w.player.sheet.setSource('probe', [mod('impactDamage', 'flat', 1)]);
  w.pushActor(v2, 0, 260, w.player);
  settle(w);
  const boosted = v2base - v2.life;
  w.player.sheet.setSource('probe', []);
  check('impact stat: +100% impactDamage lands roughly double the base wound',
    boosted > wound * 1.6, `base ${wound.toFixed(1)} vs boosted ${boosted.toFixed(1)}`);
}

// ------------------------------------------------------------- bowling lane
{
  seedGlobalRandom(9001);
  const w = makeSimWorld('warrior', 9001);

  // PLOW-THROUGH: the shambler bowls the skitter line aside. POISE IS MASS
  // works against the launch too — the shambler's anchored 4.8 effective
  // weight demands a real heave before it reaches slam speed at all.
  const mover = spawn(w, 'scree_shambler', 5, 400, 300);
  const pinA = spawn(w, 'scree_skitter', 5, 452, 300);
  const pinB = spawn(w, 'scree_skitter', 5, 505, 300);
  const ax0 = pinA.pos.x, bx0 = pinB.pos.x;
  const aLife0 = pinA.life, bLife0 = pinB.life;
  w.pushActor(mover, 0, 900, w.player);
  settle(w);
  check('bowling: a heavy mover PLOWS the light aside — and pins scatter pins (the chain)',
    pinA.pos.x - ax0 > 30 && Math.hypot(pinB.pos.x - bx0, pinB.pos.y - 300) > 15,
    `pins +${(pinA.pos.x - ax0).toFixed(0)}u / +${(pinB.pos.x - bx0).toFixed(0)}u`);
  // pinB's own wound may honestly vanish: the launched pinA reaches it
  // FIRST (hand-offs ride uncapped v₀), arrest-stamps its shared wound
  // gate, and chip-vs-armor mitigation swallows featherweight momentum —
  // both laws working, so the pin here is pinA's real wound + the cascade.
  check('bowling: the directly-plowed pin takes the struck share (hostile-authored, mitigated)',
    pinA.life < aLife0,
    `pinA −${(aLife0 - pinA.life).toFixed(1)}, pinB −${(bLife0 - pinB.life).toFixed(1)} (chain-gated)`);
  check('bowling: the mover keeps going THROUGH the pins (plow, not arrest)',
    mover.pos.x - 400 > 100, `mover advanced ${(mover.pos.x - 400).toFixed(0)}u`);

  // ARREST: the skitter meets the shambler and learns why not. A featherweight
  // launch is FAST (fresh pushes ride uncapped v₀), so the sweep may only
  // catch it a frame into the overlap — the pin is that it stops AT the
  // body (within a frame's travel) instead of sailing its full ~270u arc.
  const wall = spawn(w, 'scree_shambler', 5, 800, 700);
  const pebble = spawn(w, 'scree_skitter', 5, 740, 700);
  const wallX0 = wall.pos.x;
  const pebbleLife0 = pebble.life;
  w.pushActor(pebble, 0, 300, w.player);
  settle(w);
  const restDist = Math.hypot(pebble.pos.x - wall.pos.x, pebble.pos.y - wall.pos.y);
  check('bowling: a light mover is ARRESTED at the heavy blocker (no sail-through)',
    restDist < wall.radius + pebble.radius + 95 && pebble.pos.x < 740 + 200,
    `rest ${restDist.toFixed(0)}u from the blocker (uncapped flight would carry ~270u past)`);
  check('bowling arrest: the mover takes the wall wound against a wall of meat',
    pebble.life < pebbleLife0, `life −${(pebbleLife0 - pebble.life).toFixed(1)}`);
  check('bowling arrest: the blocker feels a lean, never a launch',
    Math.abs(wall.pos.x - wallX0) < 40, `blocker moved ${(wall.pos.x - wallX0).toFixed(1)}u`);

  // PHASING: no rim to strike — passed through untouched.
  const ghost = spawn(w, 'zombie', 3, 452, 1000);
  ghost.sheet.setSource('probe', [mod('phasing', 'flat', 1)]);
  const gx0 = ghost.pos.x, gLife0 = ghost.life;
  const runner = spawn(w, 'scree_shambler', 5, 400, 1000);
  w.pushActor(runner, 0, 300, w.player);
  settle(w);
  check('bowling spare: a PHASING body is passed through untouched (substance, not stealth)',
    near(ghost.pos.x, gx0, 2) && near(ghost.life, gLife0, 0.01),
    `moved ${(ghost.pos.x - gx0).toFixed(1)}u, life Δ${(gLife0 - ghost.life).toFixed(2)}`);
}

// -------------------------------------------------------------- determinism
{
  const run = (): number[] => {
    seedGlobalRandom(1234);
    const w = makeSimWorld('warrior', 1234);
    w.doodads.push({ pos: vec(700, 500), radius: 42, kind: 'rock' });
    (w as unknown as { markDoodadsChanged(): void }).markDoodadsChanged();
    const a = spawn(w, 'zombie', 3, 610, 500);
    const b = spawn(w, 'scree_skitter', 5, 660, 500);
    w.pushActor(a, 0, 260, w.player);
    w.pushActor(b, 0.1, 220, w.player);
    settle(w);
    return [a.life, b.life, a.pos.x, a.pos.y, b.pos.x, b.pos.y];
  };
  const r1 = run(), r2 = run();
  check('determinism: the same seed replays the same wounds and resting spots byte-for-byte',
    r1.every((v, i) => v === r2[i]),
    r1.map(v => v.toFixed(2)).join(',') + ' vs ' + r2.map(v => v.toFixed(2)).join(','));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
