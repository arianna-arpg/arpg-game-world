// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SCORCH BAR (scald-basin charter §10, M-HEAT): the
// desert's heat mechanic standardized as the survival fabric's first
// FILL-polarity meter, pinned against THE REFIT LAW (her hard ruling: the
// desert must FEEL IDENTICAL after the conversion — same effective onset
// rates, same reliefs — only VISIBLE now). Every timing oracle below is
// computed from HEAT_CFG / the douse rows THEMSELVES (the old loop's own
// formulas), never read back from the implementation. Pins:
//   A  the registry shape: polarity 'fill', ONE UNIT == ONE legacy stack
//      (max == sunscorched's maxStacks), the two bands, the douse lists
//      and the status defs untouched (every standing consumer keeps its
//      meaning), and THE NO-COOK LAW authored: the row carries NO
//      underflow damage (her fourth-walk ruling), THE EIGHTHS sealed
//      (eight stacks span the bar), the erosion dial wired into the def,
//      the readout and the severity wash,
//   B  OPEN-SUN ONSET PARITY: swelter bake at the old cadence —
//      sunStackEvery / (swelter × (tempBase + tempGain × bakedT)) per
//      stack, per-stack fire-res erosion riding the bar, heatstroke at
//      the old 8-stack moment — and A FULL BAR HELD FOR A LONG WINDOW
//      ALONE NEVER LOSES LIFE (the cook is gone; no ramp clock exists),
//   C  THE SHIMMER FAST LANE: heat_shimmer fields bake at stackEvery,
//   D  SHADE/NIGHT RELIEF PARITY: dwindleEvery per stack, heatstroke
//      lifting as the bar leaves full, the bar retiring at empty,
//   E  WATER DOUSE PARITY: the bake suppressed while a douse row holds,
//      relief at EXACTLY the old beat cadence (one unit per beat — the
//      baseline decay stands down; a leak here means double-dipping),
//   F  THE EASE LAW: survivalEase_scorch slows the RISE, capped by the
//      row (slowed, never stopped),
//   G  THE ENTITY SEAM (her "the entity/player"): scorchFeed puts the
//      meter on a monster — bands worn, decay breathing it out, and NO
//      survival doom on entities (the breath law: only seats pay),
//   H  THE ABSORB LAW: combat-applied stacks on a carrier climb the bar
//      instead of fighting the sync,
//   I  THE COMBAT LANE UNTOUCHED: on a bar-less body the status economy
//      (stacking, buildup ladder into heatstroke) runs byte-identical,
//   J  SIM-QUIET: a swelter-less zone allocates nothing and wears nothing,
//   K  THE PROGRESSIVE SPINE (her fourth/fifth-walk rulings): fire-res
//      erosion MONOTONE in bar units frame by frame under the sun, EXACT at
//      full (max × SCORCH_EROSION.fireResPerUnit — −40% at eight), the
//      sheet's number == scorchErosionAt(bar) == the HUD readout at every
//      frame (drawn == tested), heatstroke's slow the only full-band
//      effect, and relief walking the erosion back down the same ladder.
// Run: npx tsx balance/probe_scorch.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { HEAT_CFG } from '../src/engine/world';
import { STATUS_DEFS, SCORCH_EROSION, scorchErosionAt } from '../src/engine/status';
import { mod } from '../src/engine/stats';
import { SURVIVAL_RESOURCES, survivalBandMeter, survivalEaseStat, regionKind, SURVIVAL_EASE_CAP } from '../src/world/regions';
import { DAY_LENGTH } from '../src/world/daynight';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps: number): boolean => Math.abs(a - b) < eps;

bootSimEngine();
seedGlobalRandom(0x5c0c);

const DT = 1 / 30;
const NOON = 0.20 * DAY_LENGTH;   // dayCycle light peaks at t=0.20
const NIGHT = 0.70 * DAY_LENGTH;  // trough — phase 'night', isShaded true
const step = (w: World, n: number): void => { for (let i = 0; i < n; i++) w.update(DT); };
const stacksOf = (a: Actor, id: string): number => a.statuses.find(s => s.id === id)?.stacks ?? 0;
const barOf = (w: World, a: Actor): number => w.scorchOf(a);

/** A desert-noon world: swelter 1 on the quiet arena (bakedT falls back to
 *  0.5 — asserted, so the oracle's cadence formula is closed-form). NOTE:
 *  the arena ZoneDef is SHARED across makeSimWorld calls, so every rig
 *  sets swelter explicitly — desert or plain — rather than trusting the
 *  boot default. */
const desertWorld = (seed: number): World => {
  const w = makeSimWorld('warrior', seed);
  w.zone.theme.swelter = 1;
  w.time = NOON;
  return w;
};
const plainWorld = (seed: number): World => {
  const w = makeSimWorld('warrior', seed);
  w.zone.theme.swelter = 0;
  w.time = NOON;
  return w;
};
// The old loop's own open-sun cadence formula, at the arena's unbaked 0.5.
const SUN_EVERY = HEAT_CFG.sunStackEvery / (1 * (HEAT_CFG.tempBase + HEAT_CFG.tempGain * 0.5));

// --- A) the registry shape --------------------------------------------------
{
  const row = SURVIVAL_RESOURCES.scorch;
  check('A1 scorch row exists, polarity fill', row?.polarity === 'fill');
  check('A2 ONE UNIT == ONE legacy stack (max == sunscorched maxStacks)',
    row.max === (STATUS_DEFS.sunscorched.maxStacks ?? -1), `max ${row.max}`);
  check('A3 bands: sunscorched = the quantized read, heatstroke = the full state',
    row.bands?.length === 2
    && row.bands.some(b => b.status === 'sunscorched' && b.from === 1 && b.stacksPerUnit === true)
    && row.bands.some(b => b.status === 'heatstroke' && b.from === row.max && !b.stacksPerUnit));
  check('A4 band lookup resolves both statuses to the scorch meter',
    survivalBandMeter('sunscorched')?.id === 'scorch' && survivalBandMeter('heatstroke')?.id === 'scorch');
  check('A5 the water douse rows keep their meaning (both statuses listed)',
    ['water', 'tide_pool', 'deep_water'].every(id => {
      const d = regionKind(id)?.douses;
      return !!d && d.statuses.includes('sunscorched') && d.statuses.includes('heatstroke');
    }));
  check('A6 the status defs are untouched (stacking ladder + per-stack erosion stand)',
    STATUS_DEFS.sunscorched.stacking === true
    && STATUS_DEFS.sunscorched.buildup?.into === 'heatstroke'
    && STATUS_DEFS.sunscorched.modsPerStack === true);
  check('A7 THE NO-COOK LAW authored: the row carries NO underflow damage (never a life tick)',
    row.underflowPctLifePerSec === 0 && row.underflowRampTo === undefined
    && row.underflowRampSecs === undefined && row.underflowText === undefined);
  check('A8 THE EIGHTHS (sealed): eight stacks span the bar — one per eighth, eight at full',
    row.max === 8 && (STATUS_DEFS.sunscorched.maxStacks ?? 0) === 8);
  const per = STATUS_DEFS.sunscorched.mods?.find(m => m.stat === 'fireRes' && m.kind === 'flat')?.value;
  check('A9 the erosion dial is wired into the def (SCORCH_EROSION.fireResPerUnit per stack, modsPerStack)',
    per !== undefined && near(per, -SCORCH_EROSION.fireResPerUnit, 1e-9) && SCORCH_EROSION.fireResPerUnit > 0,
    `per-stack ${per}`);
  check('A10 scorchErosionAt reads the def: 0 below one unit, per-unit steps, capped at the full eight',
    scorchErosionAt(0.99) === 0 && near(scorchErosionAt(1), SCORCH_EROSION.fireResPerUnit, 1e-9)
    && near(scorchErosionAt(4.7), 4 * SCORCH_EROSION.fireResPerUnit, 1e-9)
    && near(scorchErosionAt(8), row.max * SCORCH_EROSION.fireResPerUnit, 1e-9)
    && near(scorchErosionAt(40), row.max * SCORCH_EROSION.fireResPerUnit, 1e-9));
  check('A11 the HUD readout speaks the erosion (show-don\'t-tell\'s one number) and stays silent at empty',
    row.readout?.(0) === '' && !!row.readout?.(4).includes(`${Math.round(scorchErosionAt(4) * 100)}%`),
    `readout(4) = '${row.readout?.(4)}'`);
  check('A12 the warm-red veil is a SEVERITY wash: engages above a frac, no dying flush authored',
    !!row.vignette && row.vignette.startFrac > 0 && row.vignette.startFrac < 1 && row.vignette.maxAlpha > 0
    && row.vignette.flush === undefined);
}

// --- B) open-sun onset parity + the ramp at full ----------------------------
{
  const w = desertWorld(0xb01);
  const p = w.player;
  check('B0 arena zone carries no baked geo (the oracle\'s 0.5 fallback holds)',
    (w.zoneMap[w.zone.id] as { geo?: { climate?: { temperature?: number } } } | undefined)?.geo?.climate?.temperature === undefined);
  // March to just past each expected stack moment and read the band.
  const at = (sec: number): number => Math.ceil(sec / DT) + 2; // frames, +2 grace
  let frames = 0;
  const marchTo = (sec: number): void => { const want = at(sec); step(w, want - frames); frames = want; };
  const fireRes0 = p.sheet.get('fireRes');

  marchTo(SUN_EVERY * 0.9);
  check('B1 below the first cadence: no stack yet', stacksOf(p, 'sunscorched') === 0,
    `bar ${barOf(w, p).toFixed(2)} at ${(frames * DT).toFixed(2)}s (sunEvery ${SUN_EVERY.toFixed(2)})`);
  marchTo(SUN_EVERY * 1.05);
  check('B2 the first stack lands on the old cadence', stacksOf(p, 'sunscorched') === 1,
    `stacks ${stacksOf(p, 'sunscorched')}`);
  marchTo(SUN_EVERY * 4.05);
  check('B3 stack 4 lands at 4× the cadence', stacksOf(p, 'sunscorched') === 4,
    `stacks ${stacksOf(p, 'sunscorched')} bar ${barOf(w, p).toFixed(2)}`);
  check('B4 per-stack fire-res erosion rides the bar (the combat economy\'s read)',
    near(p.sheet.get('fireRes'), fireRes0 - 0.05 * 4, 1e-6),
    `Δ ${(p.sheet.get('fireRes') - fireRes0).toFixed(3)}`);
  marchTo(SUN_EVERY * 8.1);
  check('B5 the bar fills at the old 8-stack moment; heatstroke engages as the full state',
    near(barOf(w, p), 8, 0.05) && stacksOf(p, 'heatstroke') > 0 && stacksOf(p, 'sunscorched') === 8,
    `bar ${barOf(w, p).toFixed(2)} heatstroke ${stacksOf(p, 'heatstroke')}`);
  // THE NO-COOK LAW (her fourth-walk ruling — the ramp DELETED): held at
  // full under bare sun for a LONG window, alone, the bar never drains
  // life. The full band is heatstroke's slow and the erosion — that is all.
  const life0 = p.life;
  // The arena's day is SHORT — 30s past this point crosses the sun's
  // sunUpMin gate; pin the clock at noon so the window is bare SUN, not
  // dusk (the bar must stay full for the pin to mean anything).
  for (let i = 0; i < Math.round(30 / DT); i++) { w.time = NOON; w.update(DT); }
  check('B6 a full bar held 30s under bare sun ALONE never loses life (no cook, no ramp)',
    near(barOf(w, p), 8, 0.05) && p.life >= life0 - 1e-6 && !p.dead,
    `bar ${barOf(w, p).toFixed(2)} Δlife ${(p.life - life0).toFixed(3)} over 30s`);
  check('B7 no ramp clock exists for the bar (nothing stamped, nothing to draw or suffer)',
    p.underflowSince?.scorch === undefined && p.lastGaspAt?.scorch === undefined);
  check('B8 at full the worn price is exact: fire res down by max × the dial (−40% at eight), heatstroke worn',
    near(p.sheet.get('fireRes'), fireRes0 - SURVIVAL_RESOURCES.scorch.max * SCORCH_EROSION.fireResPerUnit, 1e-6)
    && stacksOf(p, 'heatstroke') > 0,
    `Δ ${(p.sheet.get('fireRes') - fireRes0).toFixed(3)}`);
}

// --- C) the shimmer fast lane -----------------------------------------------
{
  const w = desertWorld(0xc02);
  const p = w.player;
  w.zone.theme.swelter = 0; // shimmer alone — the non-desert fast lane
  w.doodads.push({ kind: 'heat_shimmer', pos: vec(p.pos.x, p.pos.y), radius: 140 });
  w.markDoodadsChanged();
  step(w, Math.ceil((HEAT_CFG.stackEvery * 4.05) / DT) + 2);
  check('C1 the shimmer field bakes at stackEvery (the fast lane kept)',
    stacksOf(p, 'sunscorched') === 4,
    `stacks ${stacksOf(p, 'sunscorched')} bar ${barOf(w, p).toFixed(2)} (want 4 at ${(HEAT_CFG.stackEvery * 4).toFixed(1)}s)`);
}

// --- D) shade/night relief parity -------------------------------------------
{
  const w = desertWorld(0xd03);
  const p = w.player;
  w.scorchFeed(p, 8);
  step(w, 1); // one frame: bands sync at full
  check('D0 fed to full: heatstroke worn', stacksOf(p, 'heatstroke') > 0 && stacksOf(p, 'sunscorched') === 8);
  w.time = NIGHT; // night is shade (isShaded), and the sun lane sleeps
  let nightFrames = 0;
  const nightTo = (sec: number): void => { const want = Math.round(sec / DT); step(w, want - nightFrames); nightFrames = want; };
  nightTo(1.2);
  check('D1 heatstroke lifts as the bar leaves full (the state, not a timer)',
    stacksOf(p, 'heatstroke') === 0, `bar ${barOf(w, p).toFixed(2)}`);
  // Bar bleeds at 1/dwindleEvery from 8 — read mid-window: at 3.5 units
  // bled (t = 3.5 × dwindleEvery) the bar reads 4.5 → the worn band 4.
  nightTo(3.5 * HEAT_CFG.dwindleEvery);
  check('D2 night sheds at the old dwindle cadence', stacksOf(p, 'sunscorched') === 4
    && near(barOf(w, p), 4.5, 0.2), `bar ${barOf(w, p).toFixed(2)} at ${(nightFrames * DT).toFixed(1)}s`);
  nightTo(8 * HEAT_CFG.dwindleEvery + 0.5);
  check('D3 the bar retires at empty (entry deleted, nothing worn)',
    p.survival?.get('scorch') === undefined && stacksOf(p, 'sunscorched') === 0);
}

// --- E) water douse parity ---------------------------------------------------
{
  const w = desertWorld(0xe04);
  const p = w.player;
  w.doodads.push({ kind: 'water', pos: vec(p.pos.x, p.pos.y), radius: 90, shallow: true });
  w.markDoodadsChanged();
  w.rebuildClientTerrain(); // the grounds cache is built at zone load — rebuild so groundAt senses the pool
  w.scorchFeed(p, 6);
  // The douse beat is frame-quantized exactly like the old sweep's timer:
  // one unit per ceil(every/dt) frames.
  const every = regionKind('water')!.douses!.every!;
  const beatFrames = Math.ceil(every / DT);
  step(w, beatFrames * 3 + 1);
  check('E1 water bleeds one unit per beat EXACTLY (no baseline-decay double-dip)',
    near(barOf(w, p), 3, 0.15), `bar ${barOf(w, p).toFixed(2)} after 3 beats (want 3.00)`);
  check('E2 the bake is suppressed while doused (noon sun, bar only falls)',
    barOf(w, p) <= 6, `bar ${barOf(w, p).toFixed(2)}`);
  step(w, beatFrames * 3 + 2);
  check('E3 the final quench retires the bar', p.survival?.get('scorch') === undefined
    && stacksOf(p, 'sunscorched') === 0);
}

// --- F) the ease law ----------------------------------------------------------
{
  const w = desertWorld(0xf05);
  const p = w.player;
  p.sheet.setSource('probeEase', [mod(survivalEaseStat('scorch'), 'flat', 0.5)]);
  step(w, Math.ceil((SUN_EVERY / 0.5) / DT) + 3);
  check('F1 survivalEase_scorch slows the RISE (0.5 ease → half rate)',
    stacksOf(p, 'sunscorched') === 1 && barOf(w, p) < 1.2,
    `bar ${barOf(w, p).toFixed(2)} at ${(SUN_EVERY / 0.5).toFixed(1)}s`);
  const w2 = desertWorld(0xf06);
  const p2 = w2.player;
  p2.sheet.setSource('probeEase', [mod(survivalEaseStat('scorch'), 'flat', 2)]);
  // Capped: rate × (1 − EASE_CAP), never zero — the clock slows, never stops.
  const cappedEvery = SUN_EVERY / (1 - SURVIVAL_EASE_CAP);
  step(w2, Math.ceil((cappedEvery * 0.9) / DT));
  const before = stacksOf(p2, 'sunscorched');
  step(w2, Math.ceil((cappedEvery * 0.25) / DT));
  check('F2 ease caps at the row ceiling (slowed, never stopped)',
    before === 0 && stacksOf(p2, 'sunscorched') === 1,
    `stacks ${before}→${stacksOf(p2, 'sunscorched')} around ${cappedEvery.toFixed(1)}s`);
}

// --- G) the entity seam -------------------------------------------------------
{
  const w = plainWorld(0xa07);
  const m = w.createMonster('plains_wolf', 3, 'enemy');
  m.pos = vec(1400, 1000);
  w.actors.push(m);
  const fireRes0 = m.sheet.get('fireRes');
  w.scorchFeed(m, 3.5);
  step(w, 1);
  check('G1 an entity carries the meter (her "the entity/player")',
    near(barOf(w, m), 3.5, 0.05) && stacksOf(m, 'sunscorched') === 3);
  check('G2 the bands erode the entity\'s fire res (damageVs_/apply_ reads light up)',
    near(m.sheet.get('fireRes'), fireRes0 - 0.15, 1e-6));
  // Decay breathes it out (regen row = out-of-source decay).
  const row = SURVIVAL_RESOURCES.scorch;
  step(w, Math.round(((3.5 - 1) / row.regen) / DT) + 8);
  check('G3 the out-of-source decay bleeds an idle entity\'s bar',
    barOf(w, m) < 1.2 && stacksOf(m, 'sunscorched') <= 1, `bar ${barOf(w, m).toFixed(2)}`);
  // Held at full: NO survival doom on entities (the breath law — seats pay).
  const life0 = m.life;
  for (let i = 0; i < Math.round(2 / DT); i++) { w.scorchFeed(m, 1); w.update(DT); }
  check('G4 an entity at full wears heatstroke and loses no life (nothing cooks anyone)',
    stacksOf(m, 'heatstroke') > 0 && m.life >= life0 - 1e-6,
    `Δlife ${(m.life - life0).toFixed(2)}`);
}

// --- H) the absorb law --------------------------------------------------------
{
  const w = desertWorld(0xa08);
  const p = w.player;
  w.time = NIGHT; // quiet lanes; decay negligible over one frame
  w.scorchFeed(p, 2);
  step(w, 1);
  p.applyStatus('sunscorched', 0, 1, 'probe blade');
  p.applyStatus('sunscorched', 0, 1, 'probe blade');
  p.applyStatus('sunscorched', 0, 1, 'probe blade');
  step(w, 1);
  check('H1 combat stacks on a carrier ABSORB into the bar (heat is heat)',
    barOf(w, p) > 4.5 && stacksOf(p, 'sunscorched') === Math.floor(barOf(w, p) + 1e-6),
    `bar ${barOf(w, p).toFixed(2)} stacks ${stacksOf(p, 'sunscorched')}`);
}

// --- I) the combat lane untouched --------------------------------------------
{
  const w = plainWorld(0xa09);
  const m = w.createMonster('plains_wolf', 3, 'enemy');
  m.pos = vec(1400, 1000);
  w.actors.push(m);
  for (let i = 0; i < 7; i++) m.applyStatus('sunscorched', 0, 1, 'probe blade');
  check('I1 a bar-less body stacks the status exactly as before',
    stacksOf(m, 'sunscorched') === 7 && barOf(w, m) === 0);
  m.applyStatus('sunscorched', 0, 1, 'probe blade');
  check('I2 the def\'s own buildup ladder still pops heatstroke at cap',
    stacksOf(m, 'heatstroke') > 0 && stacksOf(m, 'sunscorched') === 0);
  step(w, 1);
  check('I3 the sync never touches a non-carrier (no bar minted, the pop stands)',
    barOf(w, m) === 0 && stacksOf(m, 'heatstroke') > 0);
}

// --- J) sim-quiet --------------------------------------------------------------
{
  const w = plainWorld(0xa0a);
  step(w, Math.round(3 / DT));
  check('J1 a swelter-less zone allocates nothing and wears nothing',
    w.player.survival?.get('scorch') === undefined && stacksOf(w.player, 'sunscorched') === 0);
}

// --- K) THE PROGRESSIVE SPINE — erosion monotone, exact, drawn == tested ----
{
  // Under bare noon sun the bar climbs frame by frame from empty to full;
  // at EVERY frame the sheet's fire-res loss must equal scorchErosionAt(bar)
  // (the number the HUD readout prints) and must never climb back while
  // the bar only rises — the higher the bar, the more fire res is gone.
  const w = desertWorld(0xa0b);
  const p = w.player;
  const fireRes0 = p.sheet.get('fireRes');
  let monotone = true, agrees = true, worstGap = 0, lastLoss = 0, barsSeen = 0;
  const frames = Math.ceil((SUN_EVERY * 8.3) / DT);
  for (let i = 0; i < frames; i++) {
    w.update(DT);
    const loss = fireRes0 - p.sheet.get('fireRes');
    const want = scorchErosionAt(barOf(w, p));
    const gap = Math.abs(loss - want);
    if (gap > worstGap) worstGap = gap;
    if (gap > 1e-6) agrees = false;
    if (loss < lastLoss - 1e-9) monotone = false;
    lastLoss = loss;
    barsSeen = Math.max(barsSeen, barOf(w, p));
  }
  check('K1 the erosion is MONOTONE in bar units under the climbing sun (never climbs back while the bar rises)',
    monotone && barsSeen >= 8 - 0.05, `peak bar ${barsSeen.toFixed(2)}`);
  check('K2 drawn == tested every frame: sheet loss == scorchErosionAt(bar) == the readout\'s number',
    agrees, `worst gap ${worstGap.toExponential(2)}`);
  check('K3 exact at full: −(max × dial) — the full eight strip the whole dial ladder',
    near(lastLoss, SURVIVAL_RESOURCES.scorch.max * SCORCH_EROSION.fireResPerUnit, 1e-6),
    `loss ${lastLoss.toFixed(3)} (want ${(SURVIVAL_RESOURCES.scorch.max * SCORCH_EROSION.fireResPerUnit).toFixed(3)})`);
  // The full band's ONLY effect beyond the erosion is heatstroke's slow —
  // the legacy cap feel, kept by her word (retired by deleting its row).
  const hs = STATUS_DEFS.heatstroke;
  check('K4 the full band is a SLOW, not a cook: heatstroke carries speed mods only — no DoT, no baseline dps',
    stacksOf(p, 'heatstroke') > 0 && !!hs.mods?.length
    && hs.mods.every(m => ['moveSpeed', 'attackSpeed', 'castSpeed'].includes(m.stat))
    && !hs.dotType && !hs.baseline,
    `mods ${hs.mods?.map(m => m.stat).join(',')}`);
  // Relief walks the erosion back DOWN the same ladder (shade at night).
  w.time = NIGHT;
  step(w, Math.round((4 * HEAT_CFG.dwindleEvery + 0.3) / DT));
  const lossAfter = fireRes0 - p.sheet.get('fireRes');
  check('K5 relief walks the erosion back down the same ladder (shade bleeds the bar, the res returns)',
    lossAfter < lastLoss - SCORCH_EROSION.fireResPerUnit * 2 && near(lossAfter, scorchErosionAt(barOf(w, p)), 1e-6),
    `loss ${lastLoss.toFixed(3)} → ${lossAfter.toFixed(3)} at bar ${barOf(w, p).toFixed(2)}`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
