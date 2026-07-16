// ---------------------------------------------------------------------------
// ONE-OFF PROBE — the SHIELD-BASH lane end to end on the real engine
// (docs/engine/guard-bash.md): the arming line as layered data (BASH_CFG ×
// bashFloor, per-tick refresh, the cs.bashAt/bashLow tic fields the HUD and
// the release check share), the taught bash (Answering Wall's guardBash
// graft + its dual-use stat mods), the INVERTED contract (Hollow Answer:
// armed below the mirrored line, payload = what the wall lost), the mute
// walls of the differentiation pass (no tic, no blow), and the cold-typed
// Ice Shield burst riding the ordinary damage roll. Plus the BOSS BAR
// contract (docs/engine/boss-bar.md): authored bosses only, live-latched,
// pips derived, overrides in both directions.
// Run: npx tsx balance/probe_guardbash.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { MONSTERS } from '../src/data/monsters';
import { setSimTap } from '../src/engine/tap';
import type { Actor } from '../src/engine/actor';
import type { BuildSpec } from '../src/sim/types';
import type { DamageType } from '../src/engine/stats';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('guardian', 31337);
const spec: BuildSpec = {
  id: 'guardbash_probe', classId: 'guardian', level: 12,
  skills: [
    { id: 'shield_up', level: 3 },                                                  // innate bash, bare
    { id: 'spiked_bulwark', level: 3, supports: [{ id: 'answering_wall', level: 1 }] }, // mute wall, TAUGHT
    { id: 'marching_bulwark', level: 3, supports: [{ id: 'hollow_answer', level: 1 }] }, // innate bash, INVERTED
    { id: 'ice_shield', level: 3 },                                                 // cold burst
    { id: 'defiant_bulwark', level: 3 },                                            // mute wall, bare
  ],
};
const warnings = applyBuild(world, spec, 12);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));

const p = world.player;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};
const skill = (id: string) => p.skills.find(s => s?.def.id === id);

/** A fresh pinned victim in front of the hero — AI parked so nothing swings
 *  back at the wall mid-probe (the shield drain would move the bar under us). */
const mintVictim = (): Actor => {
  const v = world.createMonster('plains_wolf', 5, 'enemy');
  v.pos = { x: p.pos.x + 45, y: p.pos.y };
  v.aiCooldown = 9999;
  v.sheet.setBase('life', 4000);   // survives every payload — deltas stay readable
  v.life = 4000;
  world.actors.push(v);
  return v;
};
/** Hold a guard, optionally bleed the wall to `frac`, release, settle. */
const holdRelease = (id: string, frac: number | undefined, victim: Actor): number => {
  p.cooldowns.clear();
  p.mana = p.maxMana();
  p.useLock = 0;              // the previous release's recovery must not eat the press
  // Re-pin the victim: the previous bash's knockback must not carry it out
  // of this one's reach (the probe measures the line, not the shove).
  victim.pos.x = p.pos.x + 45; victim.pos.y = p.pos.y;
  victim.vel.x = 0; victim.vel.y = 0;
  world.useSkill(p, skill(id)!, { x: victim.pos.x, y: victim.pos.y });
  step(0.1);
  if (!p.casting || p.casting.mode !== 'guard') return NaN;
  if (frac !== undefined) p.casting.shield = (p.casting.maxShield ?? 0) * frac;
  const before = victim.life;
  p.casting.held = false;
  step(0.2);
  return before - victim.life;
};

// --- 0) the tic: one resolver writes it, live -------------------------------
p.cooldowns.clear();
world.useSkill(p, skill('shield_up')!, { x: p.pos.x + 50, y: p.pos.y });
step(0.05);
check('tic: shield_up arms at BASH_CFG.releaseFloor', Math.abs((p.casting?.bashAt ?? 0) - 0.25) < 1e-6,
  `bashAt=${p.casting?.bashAt}`);
check('tic: upright contract (bashLow unset)', p.casting?.bashLow !== true);
p.casting!.held = false; step(0.3);

world.useSkill(p, skill('defiant_bulwark')!, { x: p.pos.x + 50, y: p.pos.y });
step(0.05);
check('mute wall: defiant_bulwark carries NO tic (no innate bash now)', p.casting?.bashAt === undefined);
p.casting!.held = false; step(0.3);

world.useSkill(p, skill('spiked_bulwark')!, { x: p.pos.x + 50, y: p.pos.y });
step(0.05);
check('taught: Answering Wall grafts a tic onto the spiked wall', p.casting?.bashAt !== undefined);
check('taught: its bashFloor mod LOWERS the line (0.25 × 0.8)', Math.abs((p.casting?.bashAt ?? 0) - 0.2) < 1e-6,
  `bashAt=${p.casting?.bashAt}`);
p.casting!.held = false; step(0.3);

world.useSkill(p, skill('marching_bulwark')!, { x: p.pos.x + 50, y: p.pos.y });
step(0.05);
check('inverted: Hollow Answer mirrors the line to 0.75', Math.abs((p.casting?.bashAt ?? 0) - 0.75) < 1e-6,
  `bashAt=${p.casting?.bashAt}`);
check('inverted: bashLow set (armed below the line)', p.casting?.bashLow === true);
p.casting!.held = false; step(0.3);

// --- 1) the release check honors the line both ways -------------------------
let v = mintVictim();
check('upright: a broken-low release does NOT bash (10% < 25%)',
  holdRelease('shield_up', 0.10, v) <= 0);
check('upright: a healthy release bashes (full ≥ 25%)',
  holdRelease('shield_up', undefined, v) > 0);
check('taught: the grafted bash actually lands on release',
  holdRelease('spiked_bulwark', undefined, v) > 0);
check('taught: below even the lowered line stays quiet (15% < 20%)',
  holdRelease('spiked_bulwark', 0.15, v) <= 0);
check('inverted: a PRISTINE release says nothing (100% > 75%)',
  holdRelease('marching_bulwark', undefined, v) <= 0);
const emptied = holdRelease('marching_bulwark', 0.30, v);
check('inverted: a battered release cashes what the wall lost', emptied > 0,
  `payload landed ${Math.round(emptied)}`);

// --- 2) Ice Shield's burst is a true COLD hit through the pipeline ----------
const seen: Partial<Record<DamageType, number>>[] = [];
setSimTap({
  onHit: (attacker, _t, _r, packet) => { if (attacker === p) seen.push({ ...packet.amounts }); },
});
v = mintVictim();
const iceDmg = holdRelease('ice_shield', undefined, v);
setSimTap(null);
const burst = seen.find(a => (a.cold ?? 0) > 0);
check('ice: the burst landed', iceDmg > 0, `landed ${Math.round(iceDmg)}`);
check('ice: payload is COLD-typed (tag-derived element)', !!burst && !(burst.physical ?? 0),
  `packet=${JSON.stringify(seen[0] ?? {})}`);

// --- 3) THE BOSS BAR contract ------------------------------------------------
// Far spawn: authored boss, but the fight isn't live — no marquee.
const banshee = world.createMonster('wailing_one', 12, 'enemy');
banshee.pos = { x: p.pos.x + 2000, y: p.pos.y };
banshee.aiCooldown = 9999;
world.actors.push(banshee);
check('boss bar: an authored boss FAR away stays off the marquee', world.bossBarInfo(banshee) === null);
// Walk into sense range → live, latched, pips derived from the HP ladder.
banshee.pos = { x: p.pos.x + 300, y: p.pos.y };
const bb = world.bossBarInfo(banshee);
check('boss bar: inside senseRange the fight is live', bb !== null);
check('boss bar: HP-ladder pips = phases + 1 (fill mode)',
  !!bb && bb.hl === false && bb.pips === (banshee.brain?.phases?.length ?? 0) + 1,
  `pips=${bb?.pips}`);
banshee.pos = { x: p.pos.x + 2000, y: p.pos.y };
check('boss bar: the latch sticks when it drifts back out', world.bossBarInfo(banshee) !== null);
// Script FSM boss reads highlight-mode pips.
const serrat = world.createMonster('vhal_serrat', 12, 'enemy');
serrat.pos = { x: p.pos.x + 200, y: p.pos.y };
serrat.aiCooldown = 9999;
world.actors.push(serrat);
const sb = world.bossBarInfo(serrat);
check('boss bar: script-FSM pips highlight the current phase',
  !!sb && sb.hl === true && sb.pips === (serrat.brain?.script?.length ?? 0) && sb.pips >= 2,
  `pips=${sb?.pips}`);
// A fat bounty is NOT a marquee: xp alone never lights it now.
const elite = world.createMonster('plains_wolf', 12, 'enemy');
elite.xpValue = 500;
elite.pos = { x: p.pos.x + 100, y: p.pos.y };
elite.aiCooldown = 9999;
world.actors.push(elite);
check('boss bar: a high-xp NON-boss elite shows nothing', world.bossBarInfo(elite) === null);
// A single-phase authored boss still owns the marquee — bare (pips 0).
const lord = world.createMonster('lord_bhorog', 14, 'enemy');
lord.pos = { x: p.pos.x + 250, y: p.pos.y };
lord.aiCooldown = 9999;
world.actors.push(lord);
const lb = world.bossBarInfo(lord);
check('boss bar: a pip-less LORD keeps the bar (bare)', !!lb && lb.pips === 0, `pips=${lb?.pips}`);
// The override lane, both directions (restore after — defs are shared).
MONSTERS['plains_wolf']!.bossBar = true;
check('boss bar: bossBar:true lifts a plain def onto the marquee', world.bossBarInfo(elite) !== null);
delete MONSTERS['plains_wolf']!.bossBar;
MONSTERS['wailing_one']!.bossBar = false;
check('boss bar: bossBar:false silences even a latched boss', world.bossBarInfo(banshee) === null);
delete MONSTERS['wailing_one']!.bossBar;
// The dead hold no court.
lord.dead = true;
check('boss bar: the dead hold no court', world.bossBarInfo(lord) === null);

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
process.exit(failed ? 1 : 0);
