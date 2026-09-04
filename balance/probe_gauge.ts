// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GAUGE FABRIC end to end on the real engine
// (engine/gauge.ts; docs/engine/gauge.md). Pins:
//   - THE FOLDS: gaugeEffOf scales need/gain/lockout/cap off the three stat
//     reads (need floored at 1), gaugeAdd banks × gain to the cap and is
//     REFUSED WHOLE during a lockout, gaugeSpend arms the silence, gaugeTick
//     burns it before any regen banks,
//   - THE FEED + ONE READINESS (the Reaper's Toll): credited kills feed the
//     slotted skill's bank through the one tap predicate; the unmet gate
//     greys and refuses with a note that reads the fill; at need the press
//     is accepted, THE PRESS PAYS (the bank empties at the press, not the
//     completion) and the lockout takes nothing until it lapses,
//   - THE DEATH FEED (Grave Tide): a death inside the feed's radius banks a
//     soul whether or not the blow was yours, a death outside it banks
//     nothing, and an ELITE you slay yourself counts for more,
//   - THE THREE STATS: buff-granted gaugeNeed / gaugeGain / gaugeLockout
//     reshape the terms, and a mod scoped to the 'ultimate' tag reaches the
//     super art's gauge and not the ordinary one's,
//   - THE POOL CLOCK (Wisps): no spender on the bar, no accrual; a slotted
//     spender opens the def's own baseline clock (one per four seconds,
//     capped at five); chargeRegen_wisp investment stacks on top; the Hush
//     is refused short of five and drinks the whole pool at five (absorb,
//     mend, the hushed buff),
//   - THE SAME DOOR: a monster wearing a gauge art refuses through the same
//     predicate and fires once its bank is full,
//   - THE DEBUTS: Grave Tide raises its horde as OWNED minions, Doom Bell's
//     ring stuns and wounds, Last Rites refuses at full life and mends +
//     tolls below half, Stormcrown's sky wounds the field,
//   - THE CENSUS: every catalog gauge names a positive need, a feed or a
//     regen, and a unit; the Reaper's Toll Vault row stands.
// Run: npx tsx balance/probe_gauge.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import {
  GAUGE_CFG, gaugeAdd, gaugeEffOf, gaugeFill, gaugeFloor, gaugeLocked, gaugePowerOf,
  gaugeSpend, gaugeTick,
} from '../src/engine/gauge';
import { ULT_QA } from '../src/engine/ultimates';
import { makeSkillInstance, treeNodeRefusal, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { CHARGE_DEFS } from '../src/engine/charges';
import { SKILLS } from '../src/data/skills';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
ULT_QA.active = false; // the shipped law — the lab lever has its own rig elsewhere

const DT = 1 / 60;
const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(DT); };
const secs = (s: number): number => Math.ceil(s / DT);
const feed = (a: Actor): void => { a.sheet.setBase('mana', 400); a.fillResources(); };
const spawn = (w: World, id: string, lv: number, x: number, y: number, life = 1): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  m.sheet.setBase('life', life); m.fillResources();
  m.sheet.setBase('moveSpeed', 0);
  w.actors.push(m);
  return m;
};
/** Seat an instance on the bar (the tap loops read `skills`). */
const slotIn = (a: Actor, inst: SkillInstance): SkillInstance => {
  const i = a.skills.findIndex(s => !s);
  a.skills[i < 0 ? a.skills.length : i] = inst;
  return inst;
};
/** A credited kill: a pinned-accuracy firebolt until the body drops. */
const slay = (w: World, z: Actor): boolean => {
  for (let tries = 0; tries < 4 && !z.dead; tries++) {
    feed(w.player);
    w.useSkill(w.player, makeSkillInstance(SKILLS.firebolt, 1, 2), vec(z.pos.x, z.pos.y));
    for (let i = 0; i < 90 && !z.dead; i++) step(w);
  }
  return z.dead;
};

// ------------------------------------------------------------------ the folds
{
  const e = gaugeEffOf({ need: 30, lockoutSec: 12, bankMult: 2 }, 0.5, 2, 0.25);
  check('fold: need/gain/lockout/cap scale off the three reads',
    e.need === 15 && e.gain === 2 && e.lockoutSec === 3 && e.cap === 30);
  check('fold: need floors at one', gaugeEffOf({ need: 1 }, 0.1, 1, 1).need === 1);
  check('fold: the default lockout stands when the spec names none',
    gaugeEffOf({ need: 5 }, 1, 1, 1).lockoutSec === GAUGE_CFG.defaultLockoutSec);
  const inst = makeSkillInstance(SKILLS.reapers_toll, 1, 2);
  const eff = gaugeEffOf({ need: 8 }, 1, 2, 1);
  check('fold: a feed banks × gain', gaugeAdd(inst, 3, eff) === 6 && gaugeFill(inst) === 6);
  check('fold: the cap holds', gaugeAdd(inst, 9, eff) === 2 && gaugeFill(inst) === 8);
  gaugeSpend(inst, { need: 8 }, eff);
  check('fold: the press empties the bank and arms the silence',
    gaugeFill(inst) === 0 && gaugeLocked(inst));
  check('fold: a locked bank refuses whole', gaugeAdd(inst, 5, eff) === 0 && gaugeFill(inst) === 0);
  gaugeTick(inst, { need: 8, regen: 4 }, eff, 5);
  check('fold: the tick burns the lockout first and banks no regen that frame',
    gaugeFill(inst) === 0 && (inst.state?.gaugeLock ?? 0) < 1.01);
  gaugeTick(inst, { need: 8, regen: 4 }, eff, 2);
  check('fold: past the silence the regen clock banks (× gain)',
    !gaugeLocked(inst) && gaugeFill(inst) > 0);
}

// -------------------------------------------- the feed + the one readiness
{
  seedGlobalRandom(5);
  const w = makeSimWorld('magician', 5);
  const p = w.player;
  const px = p.pos.x, py = p.pos.y;
  p.sheet.setBase('accuracy', 5000);
  const toll = slotIn(p, makeSkillInstance(SKILLS.reapers_toll, 1, 2));
  check('feed: an empty bank is NOT READY, and the note reads the fill',
    (p.unmetGate(toll)?.note ?? '') === '0/8 souls', p.unmetGate(toll)?.note);
  check('feed: the press refuses the empty bank',
    w.useSkill(p, toll, vec(px, py)) === false);
  const prey: Actor[] = [];
  for (let i = 0; i < 8; i++) prey.push(spawn(w, 'zombie', 1, px + 160 + i * 4, py + (i % 2) * 30));
  let slain = 0;
  for (const z of prey) if (slay(w, z)) slain++;
  check('feed: eight credited kills landed', slain === 8, `${slain}`);
  check('feed: each kill banked one soul', gaugeFill(toll) === 8, `${gaugeFill(toll)}`);
  check('feed: full = ready (the gate stands down)', p.unmetGate(toll) === null);
  feed(p);
  const ok = w.useSkill(p, toll, vec(px, py));
  check('press: the ring is accepted', ok === true);
  check('press: THE PRESS PAYS — the bank empties at the press, the silence arms',
    gaugeFill(toll) === 0 && gaugeLocked(toll) && (p.unmetGate(toll)?.note ?? '') === GAUGE_CFG.noteLocked);
  // a kill INSIDE the lockout banks nothing
  const late = spawn(w, 'zombie', 1, px + 160, py - 40);
  slay(w, late);
  check('lockout: a kill inside the silence banks nothing', gaugeFill(toll) === 0);
  step(w, secs(4.2)); // the 4s lockout lapses
  check('lockout: the silence lapses on the owner\'s clock', !gaugeLocked(toll));
  const after = spawn(w, 'zombie', 1, px + 160, py + 60);
  slay(w, after);
  check('lockout: the next kill banks again', gaugeFill(toll) === 1, `${gaugeFill(toll)}`);
}

// ------------------------------------------------------------- the death feed
{
  seedGlobalRandom(7);
  const w = makeSimWorld('magician', 7);
  const p = w.player;
  const px = p.pos.x, py = p.pos.y;
  p.sheet.setBase('accuracy', 5000);
  const tide = slotIn(p, makeSkillInstance(SKILLS.grave_tide, 1, 2));
  const near = spawn(w, 'zombie', 1, px + 300, py);
  const far = spawn(w, 'zombie', 1, px + 900, py);
  // uncredited deaths through the real death path: no killer, no blow
  w.kill(near); w.kill(far);
  step(w, 3);
  check('death: a death inside the radius banks a soul, one outside banks none',
    near.dead && far.dead && gaugeFill(tide) === 1, `${gaugeFill(tide)}`);
  const elite = spawn(w, 'zombie', 1, px + 200, py + 20);
  elite.rarity = 'rare';
  slay(w, elite);
  check('death: an elite slain by your own hand counts for its death AND its rank',
    gaugeFill(tide) === 4, `${gaugeFill(tide)}`);
}

// ---------------------------------------------------------------- the stats
{
  seedGlobalRandom(9);
  const w = makeSimWorld('magician', 9);
  const p = w.player;
  const toll = slotIn(p, makeSkillInstance(SKILLS.reapers_toll, 1, 2));
  const tide = slotIn(p, makeSkillInstance(SKILLS.grave_tide, 1, 2));
  const before = p.gaugeEff(toll)!;
  check('stats: the bare terms are the spec\'s', before.need === 8 && before.gain === 1 && before.lockoutSec === 4);
  p.addBuff({
    type: 'buff', id: 'probe_gauge_invest', duration: 99,
    mods: [
      mod('gaugeNeed', 'increased', -0.5),
      mod('gaugeGain', 'increased', 1),
      mod('gaugeLockout', 'increased', -0.75),
    ],
  }, 1);
  const after = p.gaugeEff(toll)!;
  check('stats: need halves, gain doubles, the silence quarters',
    after.need === 4 && Math.abs(after.gain - 2) < 1e-9 && Math.abs(after.lockoutSec - 1) < 1e-9,
    `need ${after.need} gain ${after.gain} lock ${after.lockoutSec}`);
  p.removeBuff('probe_gauge_invest');
  p.addBuff({
    type: 'buff', id: 'probe_gauge_scoped', duration: 99,
    mods: [mod('gaugeNeed', 'increased', -0.5, ['ultimate'])],
  }, 1);
  check('stats: an ultimate-scoped mod reaches the super art\'s gauge and not the ordinary one\'s',
    p.gaugeEff(tide)!.need === 15 && p.gaugeEff(toll)!.need === 8,
    `tide ${p.gaugeEff(tide)!.need} toll ${p.gaugeEff(toll)!.need}`);
}

// ------------------------------------------------------------------ the pool
{
  seedGlobalRandom(13);
  const w = makeSimWorld('magician', 13);
  const p = w.player;
  check('pool: the wisp def stands with its own clock and a spender gate',
    !!CHARGE_DEFS.wisp && (CHARGE_DEFS.wisp.regen ?? 0) > 0 && CHARGE_DEFS.wisp.regenNeedsSpender === true);
  step(w, secs(12));
  check('pool: no spender on the bar, no accrual', (p.charges.get('wisp') ?? 0) === 0);
  const hush = slotIn(p, makeSkillInstance(SKILLS.hush_of_the_wake, 1, 2));
  step(w, secs(4.6));
  check('pool: a slotted spender opens the clock — one wisp per four seconds',
    (p.charges.get('wisp') ?? 0) === 1, `${p.charges.get('wisp')}`);
  check('pool: short of five the Hush is not usable', !w.skillUsable(p, hush));
  step(w, secs(20));
  check('pool: the bank caps at five', (p.charges.get('wisp') ?? 0) === 5, `${p.charges.get('wisp')}`);
  check('pool: at five the Hush is usable', w.skillUsable(p, hush));
  p.life = p.maxLife() * 0.5;
  const lifeAt = p.life;
  const ok = w.useSkill(p, hush, vec(p.pos.x, p.pos.y));
  check('pool: the press drinks the whole pool', ok === true && (p.charges.get('wisp') ?? 0) === 0);
  step(w, 2);
  check('pool: the Hush mends and shelters', p.life > lifeAt && p.buffs.has('hushed'),
    `life ${lifeAt.toFixed(0)} -> ${p.life.toFixed(0)}`);
  // investment stacks on the baseline clock
  p.addBuff({
    type: 'buff', id: 'probe_wisp_invest', duration: 99,
    mods: [mod('chargeRegen_wisp', 'flat', 2.5)],
  }, 1);
  step(w, secs(4.6));
  check('pool: chargeRegen_wisp investment stacks on the def\'s own clock (two per four seconds)',
    (p.charges.get('wisp') ?? 0) >= 2, `${p.charges.get('wisp')}`);
}

// ------------------------------------------------------------ the same door
{
  seedGlobalRandom(17);
  const w = makeSimWorld('warrior', 17);
  const p = w.player;
  const z = spawn(w, 'zombie', 3, p.pos.x + 300, p.pos.y, 900);
  feed(z);
  const toll = slotIn(z, makeSkillInstance(SKILLS.reapers_toll, 1, 2));
  check('door: a monster\'s empty gauge refuses through the same predicate',
    z.unmetGate(toll) !== null && w.useSkill(z, toll, vec(z.pos.x, z.pos.y)) === false);
  (toll.state ??= {}).gauge = 8;
  check('door: a full one fires', z.unmetGate(toll) === null
    && w.useSkill(z, toll, vec(z.pos.x, z.pos.y)) === true && gaugeFill(toll) === 0);
}

// ---------------------------------------------------------------- the debuts
{
  // Grave Tide — the horde stands as OWNED minions
  seedGlobalRandom(19);
  const w = makeSimWorld('magician', 19);
  const p = w.player;
  feed(p);
  const tide = slotIn(p, makeSkillInstance(SKILLS.grave_tide, 1, 2));
  (tide.state ??= {}).gauge = 30;
  check('tide: the full bank casts', w.useSkill(p, tide, vec(p.pos.x + 120, p.pos.y)) === true);
  step(w, secs(1.0));
  const horde = w.actors.filter(a => a.owner === p && !a.dead);
  check('tide: eight of the dead rise as the caster\'s own', horde.length >= 8, `${horde.length}`);
  check('tide: the pane armed (an ultimate through the same door)',
    !!w.eyecatch && w.eyecatch.skillId === 'grave_tide');
}
{
  // Doom Bell — the ring stuns and wounds
  seedGlobalRandom(23);
  const w = makeSimWorld('warrior', 23);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const zs = [spawn(w, 'zombie', 1, p.pos.x + 150, p.pos.y, 900), spawn(w, 'zombie', 1, p.pos.x - 300, p.pos.y + 40, 900)];
  const life0 = zs[0].life + zs[1].life;
  check('bell: the cast is accepted', w.useSkill(p, makeSkillInstance(SKILLS.doom_bell, 1, 2), vec(p.pos.x, p.pos.y)) === true);
  step(w, secs(0.75));
  check('bell: both inside the ring are stunned and wounded',
    zs.every(z => z.statuses.some(s => s.id === 'stun')) && zs[0].life + zs[1].life < life0 - 20,
    `life ${life0.toFixed(0)} -> ${(zs[0].life + zs[1].life).toFixed(0)}`);
}
{
  // Last Rites — the low-life license
  seedGlobalRandom(29);
  const w = makeSimWorld('warrior', 29);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const rites = makeSkillInstance(SKILLS.last_rites, 1, 2);
  check('rites: at full life the rites are not yours to read',
    w.useSkill(p, rites, vec(p.pos.x, p.pos.y)) === false && p.unmetGate(rites)?.note === 'not yet dying');
  const z = spawn(w, 'zombie', 1, p.pos.x + 120, p.pos.y, 900);
  p.life = p.maxLife() * 0.3;
  const lifeAt = p.life;
  check('rites: below half they read', w.useSkill(p, rites, vec(p.pos.x, p.pos.y)) === true);
  step(w, 2);
  check('rites: the reading mends and the fury is worn',
    p.life > lifeAt + p.maxLife() * 0.3 && p.buffs.has('last_rites_fury'),
    `life ${lifeAt.toFixed(0)} -> ${p.life.toFixed(0)} of ${p.maxLife().toFixed(0)}`);
  // the follow-up beat waits out the reader's own swing before it fires
  step(w, secs(1.2));
  check('rites: the toll lands a beat later and stuns', z.life < 900 && z.statuses.some(s => s.id === 'stun'),
    `life ${z.life.toFixed(0)}`);
}
{
  // Stormcrown — the sky wounds the field
  seedGlobalRandom(31);
  const w = makeSimWorld('magician', 31);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const aim = vec(p.pos.x + 350, p.pos.y);
  const zs = [spawn(w, 'zombie', 1, aim.x, aim.y, 2000), spawn(w, 'zombie', 1, aim.x + 60, aim.y + 40, 2000), spawn(w, 'zombie', 1, aim.x - 50, aim.y - 50, 2000)];
  const total = (): number => zs.reduce((s, z) => s + z.life, 0);
  const life0 = total();
  check('crown: the cast is accepted', w.useSkill(p, makeSkillInstance(SKILLS.stormcrown, 1, 2), aim) === true);
  step(w, secs(5.5));
  check('crown: the bolts wound the field', total() < life0 - 60, `${life0.toFixed(0)} -> ${total().toFixed(0)}`);
}

// ------------------------------------------------------- the partial press
{
  seedGlobalRandom(37);
  const w = makeSimWorld('magician', 37);
  const p = w.player;
  feed(p);
  const tide = slotIn(p, makeSkillInstance(SKILLS.grave_tide, 1, 2));
  const eff = p.gaugeEff(tide)!;
  check('partial: the firing floor is a tenth of need (three souls)',
    gaugeFloor(SKILLS.grave_tide.gauge!, eff) === 3);
  (tide.state ??= {}).gauge = 2;
  check('partial: two souls is still not ready', p.unmetGate(tide) !== null);
  tide.state.gauge = 15;
  check('partial: fifteen souls is ready', p.unmetGate(tide) === null);
  const power = gaugePowerOf(SKILLS.grave_tide.gauge!, eff, 15);
  check('partial: the power law ramps from the floor to full',
    power > 0.5 && power < 0.7, power.toFixed(3));
  check('partial: a half press casts', w.useSkill(p, tide, vec(p.pos.x + 120, p.pos.y)) === true);
  check('partial: THE PRESS PAYS — the whole bank, and the power is stamped',
    gaugeFill(tide) === 0 && Math.abs((tide.state?.gaugePower ?? 0) - power) < 1e-9);
  step(w, secs(1.0));
  const horde = w.actors.filter(a => a.owner === p && !a.dead).length;
  check('partial: the horde scales with the power (eight × ~0.58 → five)',
    horde === Math.max(1, Math.round(8 * power)), `${horde}`);
}

// ------------------------------------------- the overflow + the hastening
{
  seedGlobalRandom(41);
  const w = makeSimWorld('warrior', 41);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const hour = slotIn(p, makeSkillInstance(SKILLS.red_hour, 1, 2));
  const fb = makeSkillInstance(SKILLS.firebolt, 1, 2);
  const z = spawn(w, 'zombie', 1, p.pos.x + 110, p.pos.y, 5000);
  p.cooldowns.set('red_hour', 30);
  // Land ONE bolt and step until it truly bites (the warrior's bolt is
  // slower than the magician's) — returns the frames stepped.
  const land = (): number => {
    feed(p);
    const before = z.life;
    w.useSkill(p, fb, vec(z.pos.x, z.pos.y));
    let n = 0;
    while (n < 180 && z.life >= before) { step(w); n++; }
    step(w); n++;
    return n;
  };
  const n1 = land();
  const cd = p.cooldowns.get('red_hour') ?? 0;
  check('hastening: a landed blow shaves the resting clock instead of banking',
    z.life < 5000 && cd < 30 - n1 / 60 - 1.0 && gaugeFill(hour) === 0,
    `cd ${cd.toFixed(2)} after ${n1} frames`);
  p.cooldowns.delete('red_hour');
  land();
  check('hastening: with the clock clear, blows bank wrath', gaugeFill(hour) >= 1, `${gaugeFill(hour)}`);
  (hour.state ??= {}).gauge = 24; // a double purse
  check('overflow: a brimming purse reads power past one',
    Math.abs(gaugePowerOf(SKILLS.red_hour.gauge!, p.gaugeEff(hour)!, 24) - 2) < 1e-9);
  check('overflow: the Hour casts', w.useSkill(p, hour, vec(p.pos.x, p.pos.y)) === true);
  step(w, 2);
  const buff = p.buffs.get('red_hour');
  check('overflow: the press wears the whole bank as stacks (10 per unit of power → 20)',
    !!buff && buff.stacks === 20 && gaugeFill(hour) === 0, `stacks ${buff?.stacks}`);
}

// ------------------------------------------------------------ the trees
{
  seedGlobalRandom(43);
  const w = makeSimWorld('magician', 43);
  const p = w.player;
  const tide = makeSkillInstance(SKILLS.grave_tide, 10, 2);
  w.meta.knownSkills.set('grave_tide', tide);
  slotIn(p, tide);
  const need0 = p.gaugeEff(tide)!.need;
  w.pickTreeNode('grave_tide', 'gt_soul_ledger');
  check('tree: the neutral\'s gaugeNeed mod reaches the fold (30 → 26)',
    (tide.treeNodes ?? []).includes('gt_soul_ledger') && p.gaugeEff(tide)!.need === Math.round(need0 * 0.85),
    `need ${p.gaugeEff(tide)!.need}`);
  w.pickTreeNode('grave_tide', 'gt_grave_court');
  check('tree: a branch rung spends and seals its rival',
    (tide.treeNodes ?? []).includes('gt_grave_court') && treeNodeRefusal(tide, 'gt_unburied') !== null);
  for (const d of Object.values(SKILLS)) {
    if (!d.tree || !d.ultimate) continue;
    check(`tree census: ${d.id} obeys the exact cover (2 × 3 + neutral)`,
      (d.tree.branches?.length ?? 0) === 2 && (d.tree.branches ?? []).every(b => b.rungs.length === 3) && !!d.tree.neutral);
  }
}

// ------------------------------------------------------------ the debuts II
{
  // The Long Cold — freeze, near-immunity, then the shatter
  seedGlobalRandom(47);
  const w = makeSimWorld('magician', 47);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const zs = [spawn(w, 'zombie', 1, p.pos.x + 140, p.pos.y, 3000), spawn(w, 'zombie', 1, p.pos.x - 180, p.pos.y + 50, 3000)];
  const life0 = zs[0].life + zs[1].life;
  check('cold: the cast is accepted', w.useSkill(p, makeSkillInstance(SKILLS.long_cold, 1, 2), vec(p.pos.x, p.pos.y)) === true);
  step(w, secs(0.5));
  check('cold: the field freezes and the stillness is worn',
    zs.every(z => z.statuses.some(s => s.id === 'frozen')) && p.buffs.has('long_cold'),
    `frozen ${zs.filter(z => z.statuses.some(s => s.id === 'frozen')).length}`);
  const lifeMid = zs[0].life + zs[1].life;
  // the follow-up beat waits out the swing before its own three-second delay
  step(w, secs(5.0));
  check('cold: the shatter lands when the cold lets go', zs[0].life + zs[1].life < lifeMid - 40,
    `${life0.toFixed(0)} -> ${lifeMid.toFixed(0)} -> ${(zs[0].life + zs[1].life).toFixed(0)}`);
}
{
  // Rain of Knives — the partial press on a storm
  seedGlobalRandom(53);
  const w = makeSimWorld('rogue', 53);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const rain = slotIn(p, makeSkillInstance(SKILLS.rain_of_knives, 1, 2));
  const aim = vec(p.pos.x + 300, p.pos.y);
  const zs = [spawn(w, 'zombie', 1, aim.x, aim.y, 4000), spawn(w, 'zombie', 1, aim.x + 50, aim.y + 40, 4000), spawn(w, 'zombie', 1, aim.x - 40, aim.y - 50, 4000)];
  (rain.state ??= {}).gauge = 4;
  check('knives: four marks is below the floor (five)', p.unmetGate(rain) !== null);
  rain.state.gauge = 10;
  check('knives: ten marks may call the rain', p.unmetGate(rain) === null);
  const power = gaugePowerOf(SKILLS.rain_of_knives.gauge!, p.gaugeEff(rain)!, 10);
  const life0 = zs.reduce((s, z) => s + z.life, 0);
  check('knives: the half-rain casts', w.useSkill(p, rain, aim) === true);
  step(w, secs(2.5));
  check('knives: fewer marks, fewer knives — but knives', zs.reduce((s, z) => s + z.life, 0) < life0 - 30
    && Math.abs((rain.state?.gaugePower ?? 0) - power) < 1e-9, `power ${power.toFixed(3)}`);
}
{
  // Litany of Dawn — the shafts, then the mending
  seedGlobalRandom(59);
  const w = makeSimWorld('cleric', 59);
  const p = w.player;
  feed(p); p.sheet.setBase('accuracy', 5000);
  const aim = vec(p.pos.x + 250, p.pos.y);
  const zs = [spawn(w, 'zombie', 1, aim.x, aim.y, 3000), spawn(w, 'zombie', 1, aim.x + 60, aim.y + 30, 3000)];
  const life0 = zs[0].life + zs[1].life;
  p.life = p.maxLife() * 0.4;
  const lifeAt = p.life;
  check('dawn: the cast is accepted', w.useSkill(p, makeSkillInstance(SKILLS.litany_of_dawn, 1, 2), aim) === true);
  step(w, secs(2.8));
  check('dawn: the shafts wound and weaken', zs[0].life + zs[1].life < life0 - 40
    && zs.some(z => z.statuses.some(s => s.id === 'weaken')));
  step(w, secs(2.0));
  check('dawn: the mending gives a third of life back', p.life > lifeAt + p.maxLife() * 0.25,
    `life ${lifeAt.toFixed(0)} -> ${p.life.toFixed(0)} of ${p.maxLife().toFixed(0)}`);
}

// ---------------------------------------------------------------- the census
{
  const gauged = Object.values(SKILLS).filter(d => d.gauge);
  check('census: the catalog fields gauge arts', gauged.length >= 2, `${gauged.length}`);
  for (const d of gauged) {
    const g = d.gauge!;
    check(`census: ${d.id} names a positive need, a feed or a clock, and a unit`,
      g.need >= 1 && ((g.feeds?.length ?? 0) > 0 || (g.regen ?? 0) > 0) && !!g.unit);
  }
  const row = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_gauge');
  check('census: the Reaper\'s Toll Vault row stands', !!row && row.kind === 'skill');
}

console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
