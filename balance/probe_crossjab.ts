// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CROSS JAB: One-Two as a TRUE COMBO CHAIN (jab, jab,
// CROSS JAB — the Trisect figure's own lane) + THE BAND, a registered AoE
// shape (a strip ACROSS the facing) as a melee delivery's native figure,
// on the real engine. Pins (2026-09-11):
//   A. THE REGISTRY + THE DATA — AOE_SHAPE.band stands unique; cross_jab is
//      a noDrop 'band' swing speaking the registered 'crossjab' voice;
//      one_two walks ['one_two', 'cross_jab'] (THE REPEATED STEP names the
//      host) and wears no castCycle; the display name is unique; the boot
//      raises no warning on either id; descriptions tell the truth.
//   B. THE BAND'S LAW (pure) — inAoe's strip: across within the half-width,
//      along within AOE_BAND_DEPTH × half-width, the target's radius grows
//      both, rotation-invariant, the negated-radius "fully inside" read;
//      bandSwingGeo: the far edge at reach, the width the arc's chord,
//      arcs past 180° saturating at the reach; traceAoePath's four corners
//      are inAoe's own frame (drawn == tested).
//   C. THE CHAIN ON THE ENGINE — press one: the jab, cursor 1, the host's
//      face; press two: THE REPEATED STEP (no minted instance, the host's
//      own press), cursor 2, the bar's face NOW the Cross Jab and its
//      judgment the step's; press three: the cross lands, the victim is
//      STUNNED, Fury banked thrice, the cursor resets, the flash wears the
//      band + the voice; a lapsed window re-arms step one and never
//      crosses; THE SHARED SOCKETS (the step wears the host's gems, a
//      +levels gem counts ONCE); the pressUsable judgment reads the queued
//      step's cost; THE SAME DOOR (the pit champion's third press stuns
//      the hero through the identical chain); Trisect still walks its
//      figure and now shows Bisect / Trisect on the button.
//   D. THE CROSSING STRIP vs THE WEDGE — bodies beside the lead shoulder
//      (45° off the facing) that the jab's 50° wedge passes over are struck
//      and stunned by the cross's strip; a body beyond reach and a body
//      behind the caster are never touched by either.
//   E. THE BEAT LAW — a chain step joins the recent-cast ring as its HOST's
//      beat: with Ostinato socketed the ring after jab, jab, CROSS reads
//      one_two ×3, the repeat condition holds at the cross and the finisher
//      hits harder than the bare rig's (the ledger regression this pass
//      caught: one_two + ostinato working → cost_only, healed); Trisect's
//      figure drums the same way.
//   F. THE HAND'S CURSOR — a borrowed instance (a construct pressing its
//      owner's gem, the echo-ghost shape) walks ITS OWN cursor: its presses
//      never advance or reset the owner's rhythm, and the owner's third
//      press is still the cross.
// Run: npx tsx balance/probe_crossjab.ts
// ---------------------------------------------------------------------------

const bootWarns: string[] = [];
const origWarn = console.warn;
console.warn = (...a: unknown[]) => { bootWarns.push(a.map(String).join(' ')); origWarn(...a); };

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import { inAoe, type World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import {
  AOE_BAND_DEPTH, AOE_SHAPE, bandSwingGeo, effectiveSkillLevel, hostSockets, makeSkillInstance,
  type SkillInstance, type SupportDef,
} from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { SUPPORTS } from '../src/data/supports';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { traceAoePath, traceFlashFigure } from '../src/render/vis/aoeTrace';
import { VIS_CFG } from '../src/render/vis/visConfig';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;

bootSimEngine();
console.warn = origWarn;

const DT = 0.05;
const step = (w: World, secs: number): void => {
  for (let t = 0; t < secs - 1e-9; t += DT) w.update(DT);
};
const spawn = (w: World, id: string, lv: number, x: number, y: number, team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lv, team);
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
/** A world with the Brawler centred, facing EAST, One-Two in slot 0, no
 *  evasion anywhere on the rig (single-hit rigs must land). */
const rig = (seed: number): { w: World; p: Actor; jab: SkillInstance } => {
  seedGlobalRandom(seed);
  const w = makeSimWorld('brawler', seed);
  const p = w.player;
  p.pos = w.clampPos(vec(w.arena.w / 2, w.arena.h / 2), p.radius);
  p.facing = 0;
  let jab = p.skills.find(s => s?.def.id === 'one_two') ?? null;
  if (!jab) { jab = makeSkillInstance(SKILLS.one_two, 1, 3); p.skills[0] = jab; }
  p.sheet.setSource('probeBase', [mod('evasion', 'flat', -1e6), mod('critChance', 'flat', -1)]);
  step(w, 0.05);
  return { w, p, jab };
};
const dummy = (w: World, p: Actor, dx: number, dy: number, life = 1000): Actor => {
  const z = spawn(w, 'zombie', 3, p.pos.x + dx, p.pos.y + dy);
  z.sheet.setSource('probe', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  z.sheet.setBase('life', life);
  z.life = life;
  z.brain = undefined; // no AI: the rig swings, the dummy stands
  return z;
};
const stunned = (a: Actor): boolean => a.statuses.some(s => s.id === 'stun');
/** Press the hero's slot-0 One-Two toward the east and run the swing out,
 *  recording whether a BAND flash (the cross's strip) was ever pushed. */
const press = (w: World, p: Actor, jab: SkillInstance, secs = 0.6): { ok: boolean; bandFlash: boolean; voiced: boolean } => {
  p.mana = p.maxMana();
  const ok = w.useSkill(p, jab, vec(p.pos.x + 60, p.pos.y));
  let bandFlash = false, voiced = false;
  for (let t = 0; t < secs - 1e-9; t += DT) {
    w.update(DT);
    for (const f of w.flashes) {
      if (f.shape === AOE_SHAPE.band) { bandFlash = true; if (f.fx === 'crossjab') voiced = true; }
    }
  }
  return { ok, bandFlash, voiced };
};

// === A. THE REGISTRY + THE DATA ==============================================
{
  const vals = Object.values(AOE_SHAPE);
  check('A1 AOE_SHAPE.band is registered with a value no other shape wears',
    AOE_SHAPE.band !== undefined && vals.filter(v => v === AOE_SHAPE.band).length === 1
    && AOE_BAND_DEPTH > 0 && AOE_BAND_DEPTH < 1, `band=${AOE_SHAPE.band} depth=${AOE_BAND_DEPTH}`);
  const cj = SKILLS.cross_jab;
  check('A2 cross_jab is a noDrop melee BAND swing speaking the registered crossjab voice',
    !!cj && cj.noDrop === true && cj.delivery.type === 'melee'
    && cj.delivery.shape === 'band' && cj.delivery.fx === 'crossjab' && !!effectVoiceOf('crossjab')
    && !!VIS_CFG.effectVoice.crossjab);
  check('A3 cross_jab stuns on every landed hit and banks Fury like the jabs',
    cj.effects.some(e => e.type === 'status' && e.status === 'stun' && e.chance === 1)
    && cj.effects.some(e => e.type === 'gainCharge' && e.charge === 'fury')
    && cj.effects.some(e => e.type === 'damage'));
  const ot = SKILLS.one_two;
  check('A4 one_two walks [one_two, cross_jab] (THE REPEATED STEP names the host) and wears no castCycle',
    !!ot.comboChain && ot.comboChain.skills.length === 2
    && ot.comboChain.skills[0] === 'one_two' && ot.comboChain.skills[1] === 'cross_jab'
    && ot.comboChain.window > 0 && ot.castCycle === undefined);
  const named = Object.values(SKILLS).filter(s => s.name.toLowerCase() === 'cross jab');
  check('A5 the display name "Cross Jab" stands alone in the book (the scaldkit census law)',
    named.length === 1 && named[0].id === 'cross_jab');
  const noisy = bootWarns.filter(l => /one_two|cross_jab/.test(l));
  check('A6 the boot raises no warning on one_two / cross_jab', noisy.length === 0, noisy.join(' | ') || 'quiet');
  check('A7 descriptions tell the truth: the jab names the CROSS JAB and its window, the cross names the stun',
    /CROSS JAB/.test(ot.description) && ot.description.includes(`${ot.comboChain!.window} seconds`)
    && /stun/i.test(cj.description) && /across/i.test(cj.description));
  check('A8 the pit champion still fields one_two (the same door — its third press is the cross)',
    (MONSTERS.pit_champion.skills ?? []).includes('one_two'));
}

// === B. THE BAND'S LAW (pure) ================================================
{
  const c = vec(100, 100);
  const R = 50, D = R * AOE_BAND_DEPTH;
  const at = (along: number, across: number, facing: number): { x: number; y: number } => ({
    x: c.x + Math.cos(facing) * along - Math.sin(facing) * across,
    y: c.y + Math.sin(facing) * along + Math.cos(facing) * across,
  });
  const hit = (along: number, across: number, tr = 0, facing = 0): boolean =>
    inAoe(c, R, AOE_SHAPE.band, facing, at(along, across, facing), tr);
  check('B1 across: inside the half-width hits, past it misses, the target radius grows the reach',
    hit(0, 0) && hit(0, R - 1) && hit(0, -(R - 1)) && !hit(0, R + 1) && hit(0, R + 1, 2));
  check('B2 along: within the depth hits, past it misses, the target radius grows the depth',
    hit(D - 1, 0) && hit(-(D - 1), 0) && !hit(D + 1, 0) && hit(D + 1, 0, 2) && !hit(D + 10, 0, 2));
  check('B3 the strip is rotation-invariant (facing north reads the same offsets)',
    hit(0, R - 1, 0, Math.PI / 2) && !hit(0, R + 1, 0, Math.PI / 2)
    && hit(D - 1, 0, 0, Math.PI / 2) && !hit(D + 1, 0, 0, Math.PI / 2)
    && hit(D - 1, R - 1, 0, 2.2) && !hit(D + 1, R + 1, 0, 2.2));
  check('B4 the negated radius reads "fully inside" (zoneHoleSpares\' grace math)',
    hit(0, 0, -10) && !hit(0, R - 5, -10) && hit(0, R - 11, -10));
  const g = bandSwingGeo(66, 110 * Math.PI / 180);
  check('B5 bandSwingGeo: the far edge sits exactly at reach, the width is the arc\'s chord, the depth AOE_BAND_DEPTH of it',
    near(g.standoff + g.halfDepth, 66) && near(g.halfWidth, 66 * Math.sin(55 * Math.PI / 180))
    && near(g.halfDepth, g.halfWidth * AOE_BAND_DEPTH));
  const wide = bandSwingGeo(66, 300 * Math.PI / 180);
  check('B6 an arc past 180° saturates the strip at the full reach (never folds back)',
    near(wide.halfWidth, 66) && bandSwingGeo(66, 0).halfWidth >= 1);
  // The tracer's corners are inAoe's own frame (drawn == tested).
  const pts: { x: number; y: number }[] = [];
  const ctx = {
    moveTo: (x: number, y: number) => pts.push({ x, y }),
    lineTo: (x: number, y: number) => pts.push({ x, y }),
    closePath: () => {},
    arc: () => { throw new Error('a band traces corners, never arcs'); },
    rect: () => { throw new Error('a band is faced, never an axis rect'); },
  } as unknown as CanvasRenderingContext2D;
  const facing = 0.7;
  traceAoePath(ctx, c.x, c.y, R, AOE_SHAPE.band, facing);
  const inside = pts.every(q => inAoe(c, R, AOE_SHAPE.band, facing, q, 1e-6));
  const outside = pts.every(q => {
    const dx = q.x - c.x, dy = q.y - c.y;
    return !inAoe(c, R, AOE_SHAPE.band, facing, { x: c.x + dx * 1.02, y: c.y + dy * 1.02 }, 0);
  });
  check('B7 traceAoePath draws the band as four corners that sit exactly ON the tested strip\'s rim',
    pts.length === 4 && inside && outside, `${pts.length} corners`);
  // A flash carrying a swing ARC traces the sector, not a shape.
  let arced = false;
  const ctx2 = {
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, rect: () => {},
    arc: () => { arced = true; },
  } as unknown as CanvasRenderingContext2D;
  traceFlashFigure(ctx2, { pos: c, radius: 30, arc: { facing: 0, arcRad: 1 } });
  check('B8 traceFlashFigure follows the flash\'s own figure (an arc flash traces its sector)', arced);
}

// === C. THE CHAIN ON THE ENGINE ==============================================
{
  const { w, p, jab } = rig(0xc0a1);
  const z = dummy(w, p, 40, 0);
  const life0 = z.life;
  const r1 = press(w, p, jab);
  check('C1 press one: the jab lands, the cursor arms step one, the bar\'s face is One-Two itself',
    r1.ok && z.life < life0 && jab.state?.comboIdx === 1 && w.slotFaceOf(p, jab) === SKILLS.one_two
    && !r1.bandFlash);
  const life1 = z.life;
  const r2 = press(w, p, jab);
  check('C2 press two: THE REPEATED STEP — the host\'s own press lands (no minted instance), the cursor walks to two',
    r2.ok && z.life < life1 && jab.state?.comboIdx === 2 && !p.metaInsts.has('one_two:combo1')
    && !r2.bandFlash && !stunned(z));
  const queued = w.comboQueuedStep(p, jab);
  check('C3 THE HONEST CHAIN FACE: with the cross queued the slot IS the Cross Jab, judged usable',
    w.slotFaceOf(p, jab) === SKILLS.cross_jab && !!queued && queued.def === SKILLS.cross_jab
    && w.pressUsable(p, jab));
  check('C4 the queued step is ONE mint: the press resolver and the face resolver hand back the same instance',
    w.comboStepOf(p, jab, 2) === queued && queued!.hostSkillId === 'one_two');
  const fury2 = p.charges.get('fury') ?? 0;
  const life2 = z.life;
  const r3 = press(w, p, jab);
  check('C5 press three: the CROSS JAB lands stunning, Fury banks a third knuckle, the cursor resets, the face returns',
    r3.ok && z.life < life2 && stunned(z) && (p.charges.get('fury') ?? 0) === fury2 + 1
    && jab.state?.comboIdx === 0 && w.slotFaceOf(p, jab) === SKILLS.one_two,
    `fury ${fury2}→${p.charges.get('fury')} idx=${jab.state?.comboIdx}`);
  check('C6 the cross\'s flash wears the BAND figure and speaks the crossjab voice (drawn == tested)',
    r3.bandFlash && r3.voiced);
  check('C7 the cross was minted at the host\'s level and holds the host\'s sockets by reference',
    queued!.level === jab.level && queued!.sockets === jab.sockets);
}
{
  // THE WINDOW: a lapsed rhythm re-arms step one and never crosses.
  const { w, p, jab } = rig(0xc0a2);
  const z = dummy(w, p, 40, 0);
  const win = SKILLS.one_two.comboChain!.window;
  press(w, p, jab);
  step(w, win + 0.6);
  const r = press(w, p, jab);
  check('C8 a lapsed window re-arms step one (the press is a fresh jab, not the repeated step)',
    r.ok && jab.state?.comboIdx === 1 && !r.bandFlash && !stunned(z));
  step(w, win + 0.6);
  const r2 = press(w, p, jab);
  check('C9 three presses each outside the window never reach the cross',
    r2.ok && jab.state?.comboIdx === 1 && !r2.bandFlash && !stunned(z)
    && w.slotFaceOf(p, jab) === SKILLS.one_two);
}
{
  // THE SHARED SOCKETS + THE ONE-COUNT LAW.
  const { w, p, jab } = rig(0xc0a3);
  const plus: SupportDef = {
    id: 'probe_plus_melee', name: 'Probe Plus', description: 'probe', color: '#fff',
    requiresTags: ['melee'], mods: [], levelBonus: 1, weight: 0,
  };
  const more: SupportDef = {
    id: 'probe_more_melee', name: 'Probe More', description: 'probe', color: '#fff',
    requiresTags: ['melee'], mods: [mod('damage', 'more', 1)], weight: 0,
  };
  jab.sockets[0] = { def: plus, level: 1 };
  jab.sockets[1] = { def: more, level: 1 };
  const stepInst = w.comboStepOf(p, jab, 2)!;
  check('C10 the chain step wears the host\'s gems (tag-admitted through hostSockets) by live reference',
    stepInst.sockets === jab.sockets && hostSockets(stepInst).length === 2
    && hostSockets(stepInst).some(s => s.def.id === 'probe_more_melee'));
  check('C11 a +levels gem counts ONCE: the step is minted at the host\'s base level and reaches the host\'s effective level through the shared sockets',
    stepInst.level === jab.level && effectiveSkillLevel(stepInst) === effectiveSkillLevel(jab)
    && effectiveSkillLevel(jab) === jab.level + 1);
  jab.sockets[0] = null;
  const again = w.comboStepOf(p, jab, 2)!;
  check('C12 unsocketing re-seats the step at the host\'s new effective level (the mint follows the host)',
    again.level === jab.level && effectiveSkillLevel(again) === effectiveSkillLevel(jab)
    && effectiveSkillLevel(jab) === jab.level);
  // THE MORE GEM reaches the cross: the third beat's damage on a bare dummy
  // vs. an unsocketed rig's third beat (same seed, same positions).
  const z = dummy(w, p, 40, 0);
  press(w, p, jab); press(w, p, jab);
  const before = z.life;
  press(w, p, jab);
  const socketedCross = before - z.life;
  const bare = rig(0xc0a3);
  const zb = dummy(bare.w, bare.p, 40, 0);
  press(bare.w, bare.p, bare.jab); press(bare.w, bare.p, bare.jab);
  const b0 = zb.life;
  press(bare.w, bare.p, bare.jab);
  const bareCross = b0 - zb.life;
  check('C13 the socketed MORE gem reaches the cross itself (the finisher hits harder than the bare rig\'s)',
    socketedCross > bareCross * 1.5 && bareCross > 0, `${bareCross.toFixed(1)} → ${socketedCross.toFixed(1)}`);
}
{
  // THE JUDGMENT reads the queued step's own cost.
  const { w, p, jab } = rig(0xc0a4);
  dummy(w, p, 40, 0);
  press(w, p, jab); press(w, p, jab);
  const stepCost = SKILLS.cross_jab.manaCost, baseCost = SKILLS.one_two.manaCost;
  p.mana = (stepCost + baseCost) / 2;
  const judgedPoor = w.pressUsable(p, jab);
  p.mana = p.maxMana();
  const judgedRich = w.pressUsable(p, jab);
  check('C14 pressUsable judges the queued cross by ITS cost (the AI and the greyed slot read the true press)',
    stepCost > baseCost && !judgedPoor && judgedRich, `mana ${(stepCost + baseCost) / 2}: ${judgedPoor}`);
}
{
  // THE SAME DOOR: the pit champion's three presses stun the hero.
  const { w, p } = rig(0xc0a5);
  const m = spawn(w, 'pit_champion', 5, p.pos.x - 40, p.pos.y);
  m.brain = undefined;
  m.facing = 0;
  const mjab = m.skills.find(s => s?.def.id === 'one_two');
  let okAll = !!mjab;
  if (mjab) {
    for (let i = 0; i < 3; i++) {
      m.mana = m.maxMana();
      okAll = w.useSkill(m, mjab, vec(p.pos.x, p.pos.y)) && okAll;
      step(w, 0.6);
    }
  }
  check('C15 THE SAME DOOR: the pit champion walks jab, jab, CROSS through the identical chain and the hero stands stunned',
    okAll && stunned(p) && mjab?.state?.comboIdx === 0);
}
{
  // TRISECT keeps its figure — and now shows it on the button.
  const { w, p } = rig(0xc0a6);
  const tri = makeSkillInstance(SKILLS.trisect, 1, 3);
  p.skills[1] = tri;
  const z = dummy(w, p, 40, 0);
  const go = (): boolean => { p.mana = p.maxMana(); const ok = w.useSkill(p, tri, vec(p.pos.x + 60, p.pos.y)); step(w, 0.7); return ok; };
  const f0 = w.slotFaceOf(p, tri);
  const ok1 = go();
  const f1 = w.slotFaceOf(p, tri);
  const ok2 = go();
  const f2 = w.slotFaceOf(p, tri);
  const l2 = z.life;
  const ok3 = go();
  const f3 = w.slotFaceOf(p, tri);
  check('C16 Trisect walks opener → Bisect → Trisect and the button shows each coming step (Bisect, then Trisect, then home)',
    ok1 && ok2 && ok3 && f0 === SKILLS.trisect && f1 === SKILLS.bisect_cut && f2 === SKILLS.trisect_finisher
    && f3 === SKILLS.trisect && z.life < l2 && tri.state?.comboIdx === 0);
  check('C17 Trisect\'s steps wear the host\'s sockets by reference too (one law for every chain)',
    w.comboStepOf(p, tri, 1)!.sockets === tri.sockets && w.comboStepOf(p, tri, 2)!.sockets === tri.sockets);
}

// === D. THE CROSSING STRIP vs THE WEDGE ======================================
{
  const { w, p, jab } = rig(0xd0a1);
  const tags = new Set(SKILLS.cross_jab.tags);
  const reach = (p.radius + 52) * p.sheet.get('meleeReach', tags);
  const arcRad = (110 * Math.PI / 180) * Math.sqrt(p.sheet.get('aoeRadius', tags)) * p.sheet.get('swingArc', tags);
  const g = bandSwingGeo(reach, arcRad);
  const zr = MONSTERS.zombie.radius;
  // Two bodies beside the lead and rear shoulders: inside the strip, well
  // outside the jab's 50° wedge (their bearing is ~45° off the facing).
  const across = Math.min(g.halfWidth - 2, g.standoff);
  const side1 = dummy(w, p, g.standoff, across);
  const side2 = dummy(w, p, g.standoff, -across);
  const far = dummy(w, p, reach + zr + 20, 0);   // past the strip's far edge
  const behind = dummy(w, p, -(zr + 30), 0);     // at the caster's back
  const bearing = Math.atan2(across, g.standoff) * 180 / Math.PI;
  check('D1 the rig\'s side bodies sit inside the strip yet outside the jab\'s wedge',
    bearing > 25 && inAoe(vec(p.pos.x + g.standoff, p.pos.y), g.halfWidth, AOE_SHAPE.band, 0, side1.pos, zr),
    `bearing ${bearing.toFixed(1)}°`);
  const L = [side1, side2, far, behind].map(a => a.life);
  press(w, p, jab); press(w, p, jab);
  // (Untouched = no life LOST — a standing dummy regenerates toward its
  // folded max, so exact equality would read the mend as a wound.)
  check('D2 two jabs (a 50° wedge) pass over the side bodies, the far body and the body behind',
    [side1, side2, far, behind].every((a, i) => a.life >= L[i]) && !stunned(side1) && !stunned(side2));
  const r = press(w, p, jab);
  check('D3 the CROSS JAB\'s strip strikes BOTH side bodies and stuns them',
    r.ok && r.bandFlash && side1.life < L[0] && side2.life < L[1] && stunned(side1) && stunned(side2));
  check('D4 the strip never reaches past its far edge nor behind the caster',
    far.life >= L[2] && behind.life >= L[3] && !stunned(far) && !stunned(behind));
}

// === E. THE BEAT LAW =========================================================
{
  // Ostinato (when: comboRepeated) arms the cast ring by itself; the ring
  // must read the chain as ONE skill drummed thrice.
  const { w, p, jab } = rig(0xe0a1);
  jab.sockets[0] = { def: SUPPORTS.ostinato, level: 1 };
  const z = dummy(w, p, 40, 0);
  press(w, p, jab); press(w, p, jab);
  const before = z.life;
  press(w, p, jab);
  const ring = (p.castRing ?? []).map(r => r.sid);
  check('E1 THE BEAT LAW: after jab, jab, CROSS the ring reads one_two ×3 (the step joined as its host\'s beat)',
    ring.length >= 3 && ring.slice(-3).every(sid => sid === 'one_two'), ring.join(','));
  // The condition is stamped at record time (docs/engine/combo.md — the
  // starter conditions), so it holds from the beat AFTER the third recorded
  // cast: the FOURTH press (a fresh jab) is where Ostinato's MORE lands.
  const third = before - z.life;
  const before4 = z.life;
  press(w, p, jab);
  const ostinatoFourth = before4 - z.life;
  const bare = rig(0xe0a1);
  const zb = dummy(bare.w, bare.p, 40, 0);
  press(bare.w, bare.p, bare.jab); press(bare.w, bare.p, bare.jab); press(bare.w, bare.p, bare.jab);
  const b0 = zb.life;
  press(bare.w, bare.p, bare.jab);
  const bareFourth = b0 - zb.life;
  check('E2 with the ring reading one_two ×3 the repeat condition holds: the beat after the cross hits harder than the bare rig\'s (Ostinato heals)',
    third > 0 && bareFourth > 0 && ostinatoFourth > bareFourth * 1.1,
    `4th beat ${bareFourth.toFixed(1)} → ${ostinatoFourth.toFixed(1)}`);
  check('E3 the ring keeps the step\'s OWN tags (an element/lane key still reads what fired)',
    (p.castRing ?? []).slice(-2)[0]?.tags === SKILLS.cross_jab.tags);
  // Trisect drums the same way.
  const t = rig(0xe0a2);
  const tri = makeSkillInstance(SKILLS.trisect, 1, 3);
  tri.sockets[0] = { def: SUPPORTS.ostinato, level: 1 };
  t.p.skills[1] = tri;
  dummy(t.w, t.p, 40, 0);
  for (let i = 0; i < 3; i++) { t.p.mana = t.p.maxMana(); t.w.useSkill(t.p, tri, vec(t.p.pos.x + 60, t.p.pos.y)); step(t.w, 0.7); }
  const tring = (t.p.castRing ?? []).map(r => r.sid);
  check('E4 Trisect\'s opener, Bisect and Trisect join the ring as trisect ×3 (one law for every chain)',
    tring.length >= 3 && tring.slice(-3).every(sid => sid === 'trisect'), tring.join(','));
}

// === F. THE HAND'S CURSOR ====================================================
{
  const { w, p, jab } = rig(0xf0a1);
  const z = dummy(w, p, 40, 0);
  // A construct body pressing the OWNER's instance — the echo-ghost shape
  // (sockets and all, the instance shared by reference).
  const ghost = spawn(w, 'pit_champion', 5, p.pos.x - 60, p.pos.y, 'player');
  ghost.brain = undefined;
  ghost.construct = { kind: 'echo', timer: 0 } as unknown as typeof ghost.construct;
  ghost.facing = 0;
  press(w, p, jab); // the owner's first beat
  ghost.mana = ghost.maxMana();
  const g1 = w.useSkill(ghost, jab, vec(ghost.pos.x + 60, ghost.pos.y)); step(w, 0.6);
  ghost.mana = ghost.maxMana();
  const g2 = w.useSkill(ghost, jab, vec(ghost.pos.x + 60, ghost.pos.y)); step(w, 0.6);
  const ownerIdx = jab.state?.comboIdx;
  const ghostCur = w.comboCursorOf(ghost, jab);
  check('F1 a borrowed instance keeps ITS OWN cursor: two ghost presses walked the ghost to two and left the owner at one',
    g1 && g2 && ownerIdx === 1 && ghostCur !== jab.state && ghostCur.comboIdx === 2, `owner=${ownerIdx} ghost=${ghostCur.comboIdx}`);
  press(w, p, jab); // the owner's second beat (the repeated step)
  const r3 = press(w, p, jab); // the owner's third beat — the cross
  check('F2 the owner\'s rhythm is untouched by the ghost\'s presses: the owner\'s third press is still the CROSS JAB',
    r3.bandFlash && stunned(z) && jab.state?.comboIdx === 0);
  check('F3 an instance on its own bar keeps the cursor on the instance (the sliver\'s read is unchanged)',
    w.comboCursorOf(p, jab) === jab.state);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
