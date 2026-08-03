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
import { skillDamageBands } from '../src/engine/damage';
import { instanceMods, skillContextTags } from '../src/engine/skills';
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
    { id: 'defiant_bulwark', level: 3, supports: [                                  // mute wall + the stance-conditional gems (2c)
      { id: 'unyielding_stance', level: 1 }, { id: 'shieldwall_doctrine', level: 1 }] },
    { id: 'runeward', level: 3 },                                                   // the stance broadcast (2c)
    { id: 'firebolt', level: 1, supports: [{ id: 'guarded_casting', level: 1 }] },
    { id: 'rearguard_aegis', level: 3, supports: [{ id: 'answering_wall', level: 1 }] }, // the answering shell (2d)
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

// --- 2b) the spiked wall pricks: innate 'guarding' thorns pay through the block
// (The defect this pins: instance-innate thorns live in instanceMods, never on
// the sheet — applyThorns must read them in the held stance's own context, or
// the spiked wall is a mute Shield Up.)
const mintStriker = (dx = 38): Actor => {
  const s = world.createMonster('plains_wolf', 5, 'enemy');
  s.pos = { x: p.pos.x + dx, y: p.pos.y };
  s.aiCooldown = 9999;
  s.sheet.setBase('life', 4000);
  s.sheet.setBase('lifeRegen', 0);
  s.life = 4000;
  world.actors.push(s);
  return s;
};
/** Hold `id` facing a fresh striker, drive one claw into the wall, and return
 *  the thorns the striker paid for it (measured before the release). */
const guardedPrick = (id: string): number => {
  p.cooldowns.clear();
  p.mana = p.maxMana();
  p.useLock = 0;
  const s = mintStriker();
  world.useSkill(p, skill(id)!, { x: s.pos.x, y: s.pos.y });
  step(0.1);
  if (!p.casting || p.casting.mode !== 'guard') return NaN;
  const before = s.life;
  world.useSkill(s, s.skills.find(k => k)!, { x: p.pos.x, y: p.pos.y });
  step(1.2); // claw useTime 0.9 — let the swing resolve into the wall
  const prick = before - s.life;
  s.dead = true; // the release bash must not answer a spent prop
  if (p.casting?.mode === 'guard') { p.casting.held = false; step(0.3); }
  return prick;
};
const prick = guardedPrick('spiked_bulwark');
check('thorns: the spiked wall pricks its striker through the block (12 + 3/lvl @3)',
  Math.abs(prick - 18) < 0.75, `prick=${prick.toFixed(1)}`);
const mute = guardedPrick('shield_up');
check('thorns: a thornless wall stays mute (the context read leaks nothing)',
  Math.abs(mute) < 0.5, `prick=${mute.toFixed(1)}`);

// --- 2c) the stance-conditional class: 'guarding'-scoped rows reach their
// read sites through the held stance's own context (Actor.stanceRead + the
// damage fold's stance broadcast). Four consuming sites, four families of pin.
p.sheet.setBase('evasion', 0);     // a rear-strike zero below must mean BLOCK, never evade
p.sheet.setBase('lifeRegen', 0);   // …and never a regen-masked wound
p.sheet.setBase('lifeRegenPct', 0);
p.sheet.setBase('life', 4000);
p.life = 4000;
// Clear the stage: sections 1-2's parked props litter the walk lane east of
// the hero, and a living body shoulders the walker off the measured pace.
for (const a of world.actors) if (a.team === 'enemy') a.dead = true;

// The marching wall's leveling moveSpeed row moves real feet.
p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
world.useSkill(p, skill('marching_bulwark')!, { x: p.pos.x + 100, y: p.pos.y });
step(0.1);
{
  const inst = p.casting!.inst;
  const bare = p.sheet.get('moveSpeed');
  const ctxSpeed = p.sheet.get('moveSpeed', skillContextTags(inst.def), instanceMods(inst));
  const x0 = p.pos.x;
  for (let t = 0; t < 1; t += 1 / 60) { world.update(1 / 60); world.moveActor(p, 1, 0, 1 / 60); }
  const walked = p.pos.x - x0;
  check('stance: the marching wall\'s speed row lives (context > bare read)',
    ctxSpeed > bare + 1, `bare=${bare.toFixed(1)} ctx=${ctxSpeed.toFixed(1)}`);
  check('stance: walked feet obey the context read (ctx × moveFactor 0.75)',
    Math.abs(walked - ctxSpeed * 0.75) < 2,
    `walked=${walked.toFixed(1)} expect=${(ctxSpeed * 0.75).toFixed(1)}`);
  if (p.casting?.mode === 'guard') { p.casting.held = false; step(0.3); }
}

// Runeward's blessing reaches a spell fired through the wall (the broadcast:
// 'guarding'-scoped authored rows only — sockets never cross instances).
{
  const fb = skill('firebolt')!;
  const free = skillDamageBands(p, fb).total.hi;
  p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
  world.useSkill(p, skill('runeward')!, { x: p.pos.x + 100, y: p.pos.y });
  step(0.1);
  const held = skillDamageBands(p, fb).total.hi;
  check('stance: runeward blesses the guarded cast (+35% spell at L3)',
    held / free > 1.25 && held / free < 1.45, `ratio=${(held / free).toFixed(3)}`);
  if (p.casting?.mode === 'guard') { p.casting.held = false; step(0.3); }
}

// Unyielding Stance's poise stands only while the wall does, and the block
// gems answer from the same held stance below.
{
  check('stance: no wall, no poise (the grant is stance-scoped)',
    p.maxPoise() === 0, `maxPoise=${p.maxPoise()}`);
  p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
  world.useSkill(p, skill('defiant_bulwark')!, { x: p.pos.x + 100, y: p.pos.y });
  step(0.1);
  const mp = p.maxPoise();
  check('stance: Unyielding Stance stands +20 poise on the held wall',
    mp > 15, `maxPoise=${mp.toFixed(1)}`);
  step(5); // the refill's calm gate — calm accrues only while max > 0
  p.poise = 0;
  step(0.6);
  const rate = mp > 0 ? p.poise / 0.6 / mp : 0;
  check('stance: …and doubles the recovery (rate/max ≈ 0.5)',
    Math.abs(rate - 0.5) < 0.06, `rate/max=${rate.toFixed(3)}`);
}

// Shieldwall Doctrine blocks rear strikes the guard arc never covers.
{
  const s = mintStriker(-38); // WEST — behind the eastward wall
  const rearClaw = s.skills.find(k => k)!;
  let zeros = 0;
  for (let i = 0; i < 30; i++) {
    if (p.casting?.mode !== 'guard') { // a poise break may drop the wall — re-raise
      p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
      world.useSkill(p, skill('defiant_bulwark')!, { x: p.pos.x + 100, y: p.pos.y });
      step(0.1);
    }
    s.useLock = 0; s.cooldowns.clear(); s.mana = s.maxMana();
    const before = p.life;
    if (!world.useSkill(s, rearClaw, { x: p.pos.x, y: p.pos.y })) continue;
    step(1.2);
    if (before - p.life <= 0.001) zeros++;
  }
  s.dead = true;
  check('stance: Shieldwall Doctrine blocks rear strikes (≥1 of 30 at 20%)',
    zeros >= 1, `zeros=${zeros}/30`);
  if (p.casting?.mode === 'guard') { p.casting.held = false; step(0.3); }
}

// --- 2d) THE ANSWERING SHELL: a toggled rear-guard's DROP pays its remaining
// pool through the grafted bash (deactivateAura → guardBashSpec). This is the
// read the matrix probe can never reach — pilots never un-press a toggle —
// so the compat.ts blindness row cites THIS pin as the deterministic proof.
{
  const s = mintStriker(40); // in FRONT — the drop bash answers along the facing
  p.cooldowns.clear(); p.mana = p.maxMana(); p.useLock = 0;
  world.useSkill(p, skill('rearguard_aegis')!, { x: s.pos.x, y: s.pos.y }, true);
  step(0.6); // useTime 0.4 — let the toggle install the shell
  check('shell: the toggle wears the rear-guard', !!p.shellGuard,
    `pool=${p.shellGuard?.pool?.toFixed(0)}`);
  const before = s.life;
  p.cooldowns.clear(); p.useLock = 0;
  world.useSkill(p, skill('rearguard_aegis')!, { x: s.pos.x, y: s.pos.y }, true); // toggle OFF
  step(0.4);
  const paid = before - s.life;
  check('shell: the DROPPED shell answers through the grafted bash (Answering Wall)',
    paid > 0 && !p.shellGuard, `paid=${paid.toFixed(1)} shellGone=${!p.shellGuard}`);
  s.dead = true;
}

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
