// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE DOODAD-EFFECT ALLY DIRECTION (thicket_heal) on the real
// engine (world.ts doodadEffects / isEffectTarget; the rule row in levelgen.ts
// DOODAD_RULES.thicket). The 'ally' branch of the shared target scan shipped
// live-but-unused for a long time; this rig pins its first consumer. Pins:
//   - THE ROW CARRIES BOTH HALVES: the thicket's authored effect names
//     thicket_heal with target 'ally' AND a faction — isEffectTarget returns
//     false for a faction-less ally row BY CONSTRUCTION, so a row missing
//     either half is structurally inert (the inert trap),
//   - the faction names a POPULATED family (some MonsterDef wears it, and
//     createMonster stamps def.faction, so the row can ever fire in play),
//   - THE MEND LANDS: a wounded kinsman of the faction near an armed thicket
//     regains life through the ordinary update loop (updateDoodadEffects →
//     the registry → effectThicketHeal),
//   - NEVER THE PLAYER: a wounded hero standing on the bramble gains nothing
//     beyond their own natural regen (measured control vs armed),
//   - NEVER PAST maxLife: the mend clamps exactly at the pool's brim and
//     repeated fires never crest it (maxLife is a METHOD — the banked trap),
//   - A FULL BODY NEVER SHADOWS A WOUNDED ONE: the pick skips already-whole
//     kin, so a healthy kinsman standing nearer cannot eat the beat,
//   - THE INERT TRAP, BEHAVIORALLY: an ally row WITHOUT a faction heals
//     nobody however long it ticks (the scan's !!eff.faction refusal).
// Cadence/chance are rig-tightened for determinism; the authored numbers
// (interval/radius/chance/power) are a FLAGGED blessing unit and only their
// SHAPE is pinned here — magnitudes stay free to re-dial.
// Run: npx tsx balance/probe_doodadeffects.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { doodadRuleOf, type DoodadEffect } from '../src/engine/levelgen';
import { MONSTERS } from '../src/data/monsters';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const ROW = doodadRuleOf('thicket').effect;

const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(1 / 60); };
/** Arm a thicket at (x,y) exactly the way the zone-load attach does — spread
 *  the AUTHORED row — with a rig-tight clock (cd 0, certain chance, fast beat)
 *  so the pins never ride the flagged cadence numbers. */
const plantThicket = (w: World, x: number, y: number, over: Partial<DoodadEffect> = {}): void => {
  w.doodads.push({
    pos: vec(x, y), radius: 20, kind: 'thicket',
    effect: { ...ROW!, interval: 0.25, chance: 1, cd: 0, ...over },
  });
};

// -------------------------------------------------------------------- the row
{
  check('row: the thicket rule carries the thicket_heal effect',
    ROW?.id === 'thicket_heal', `id ${ROW?.id}`);
  check('row: BOTH halves present — target \'ally\' AND a faction (the inert trap)',
    ROW?.target === 'ally' && !!ROW?.faction, `target ${ROW?.target}, faction ${ROW?.faction}`);
  check('row: the cadence shape is sane (interval/radius/chance/power all > 0 — magnitudes stay a flagged blessing unit)',
    !!ROW && ROW.interval > 0 && ROW.radius > 0 && ROW.chance > 0 && ROW.power > 0);
  const kin = Object.values(MONSTERS).filter(m => m.faction === ROW?.faction);
  check('row: the faction names a POPULATED family (createMonster stamps def.faction)',
    kin.length >= 1, `${kin.length} defs wear '${ROW?.faction}'`);
}

// ------------------------------------------------------------------- the mend
{
  seedGlobalRandom(101);
  const w = makeSimWorld('warrior', 101);
  w.player.pos = vec(200, 200); // far from the grove — no aggro in the frame
  const snarl = spawn(w, 'root_snarl', 3, 900, 700); // anchored sylvan kin (moveSpeed 0)
  const wounded = snarl.maxLife() * 0.4;
  snarl.life = wounded;
  plantThicket(w, 900, 700);
  step(w, 90); // 1.5s ≈ 6 rig beats
  check('mend: a wounded kinsman near the bramble regains life through the real update loop',
    snarl.life > wounded + 0.5, `life ${wounded.toFixed(1)} → ${snarl.life.toFixed(1)}`);
  check('mend: the kinsman is never healed past maxLife along the way',
    snarl.life <= snarl.maxLife(), `life ${snarl.life.toFixed(1)} / max ${snarl.maxLife().toFixed(1)}`);
}

// ------------------------------------------------------------ never the player
{
  seedGlobalRandom(211);
  const w = makeSimWorld('warrior', 211);
  w.player.pos = vec(900, 700);
  const frac = 0.5;
  // Control lap: the hero's own natural drift (regen etc.) over the window.
  w.player.life = w.player.maxLife() * frac;
  step(w, 120);
  const drift = w.player.life - w.player.maxLife() * frac;
  // Armed lap: same wound, same window, bramble underfoot with a certain beat.
  w.player.life = w.player.maxLife() * frac;
  plantThicket(w, 900, 700);
  step(w, 120);
  const gained = w.player.life - w.player.maxLife() * frac;
  check('player: the bramble mends NONE of the hero — armed gain ≈ natural drift (a single stray beat would show whole)',
    gained < drift + 1.0, `drift ${drift.toFixed(2)}, armed ${gained.toFixed(2)}`);
}

// -------------------------------------------------------------------- the brim
{
  seedGlobalRandom(307);
  const w = makeSimWorld('warrior', 307);
  w.player.pos = vec(200, 200);
  const snarl = spawn(w, 'root_snarl', 3, 900, 700);
  snarl.life = snarl.maxLife() - 2; // missing a sliver; the mend overshoots it
  plantThicket(w, 900, 700, { power: 50 });
  let crested = false;
  for (let i = 0; i < 90; i++) { w.update(1 / 60); if (snarl.life > snarl.maxLife()) crested = true; }
  check('brim: the mend lands EXACTLY at maxLife (the method, not a field)',
    snarl.life === snarl.maxLife(), `life ${snarl.life.toFixed(3)} / max ${snarl.maxLife().toFixed(3)}`);
  check('brim: repeated certain fires never crest the pool at any step',
    !crested);
}

// -------------------------------------------- a full body never shadows a hurt one
{
  seedGlobalRandom(401);
  const w = makeSimWorld('warrior', 401);
  w.player.pos = vec(200, 200);
  const whole = spawn(w, 'root_snarl', 3, 910, 700);  // nearer, already full
  const hurt = spawn(w, 'root_snarl', 3, 960, 700);   // farther, wounded
  const wounded = hurt.maxLife() * 0.4;
  hurt.life = wounded;
  plantThicket(w, 900, 700);
  step(w, 90);
  check('shadow: the pick skips the already-whole — the farther WOUNDED kinsman takes the mend',
    hurt.life > wounded + 0.5 && whole.life === whole.maxLife(),
    `hurt ${wounded.toFixed(1)} → ${hurt.life.toFixed(1)}`);
}

// -------------------------------------------------- the inert trap, behaviorally
{
  seedGlobalRandom(503);
  const w = makeSimWorld('warrior', 503);
  w.player.pos = vec(200, 200);
  const snarl = spawn(w, 'root_snarl', 3, 900, 700);
  const wounded = snarl.maxLife() * 0.4;
  // Control lap: the kinsman's own natural drift (monsters keep a small regen).
  snarl.life = wounded;
  step(w, 90);
  const drift = snarl.life - wounded;
  // Armed lap: the faction-less ally shape, authored directly (no spread — the
  // half is ABSENT). power 50, certain beat: one stray fire would show whole.
  snarl.life = wounded;
  w.doodads.push({
    pos: vec(900, 700), radius: 20, kind: 'thicket',
    effect: { id: 'thicket_heal', target: 'ally', interval: 0.2, radius: ROW!.radius, chance: 1, power: 50, cd: 0 },
  });
  step(w, 90);
  const gained = snarl.life - wounded;
  check('trap: an ally row WITHOUT a faction heals nobody however long it ticks (the scan\'s !!eff.faction refusal) — armed gain ≈ natural drift',
    gained < drift + 1.0, `drift ${drift.toFixed(2)}, armed ${gained.toFixed(2)}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
