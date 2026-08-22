// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SCALD KIT K1: the monster side, the folds, the
// geyser-step spike, end to end on the real registries and the real engine
// (charter docs/design/scald-kit.md v2 — cards 1–8 ratified, card 3 amended
// by THE RUPTURE LAW; parent docs/design/scald-basin.md §8/§8b/§9; registry
// leaf data/scaldkit.ts; docs docs/engine/scaldkit.md). Pins:
//   A  THE SCALD BANK (StatusDef.bank on `scalded`): an AUTHORED application
//      (casterId) ACCUMULATES — dps adds per blow, capped at capMul × the
//      strongest single application (bankPeak), the bank read (bankFrac)
//      restamped, the bank's own duration stood; a CASTER-LESS application
//      (the runoff, the rain, a region sting) keeps the row's strongest-wins
//      policy and its 1.2s clock — absent == identical; a terrain instance
//      banks from the first authored blow's peak. A non-bank status with a
//      casterId applies exactly as before.
//   B  THE WET FOLD: ×wetMul EXACT onto a wading / swimming / soaked body
//      vs a dry twin's exact baseline (Actor.isWet — the stand states), and
//      the RAIN-WET stamp (WeatherDef.wets + World.updateWetSky): a body
//      under open sky beneath a rain front reads wet and banks ×wetMul; a
//      body under a sinter overhang (DoodadRule.shelter → underRoofAt)
//      reads dry; the stamp clears when the front passes.
//   C  THE RUPTURE (the 'rupture' SkillEffect → World.ruptureBank): consumes
//      the fraction (dps × (1 − f)), bursts the banked share as the status's
//      element, never over-consumes (f clamps to 1 — a whole-fraction rupture
//      expunges, an over-fraction bursts no more than a whole one), a body
//      with no bank takes nothing, the burst is CREDITED to the rupturer (a
//      killing burst pays the rupturer's XP); LIVE through the real pipeline:
//      the scald lancer's Pressure Throw spends the hero's bank.
//   D  THE VENT (the 'vent' SkillEffect → World.plantVent → FogField.plantBank):
//      the `steam` bank registered (occludesSight, fogveiled grant, life >
//      4s), planted at the point, MORTAL (dies at life's end, occluders back
//      to 0); THE VAPOR RIDE: lineOfSight across a standing steam bank is
//      FALSE (castRay 'sight' stops as 'medium'), the watch fan's clip lands
//      inside the bank, a SHOT ray across it is clear (steam is not a wall),
//      a control line away from the bank is clear, and after the bank dies
//      the eye line is clear again; LIVE: the vent-shaman's Steam Vent
//      plants the bank at its own feet through useSkill.
//   E  THE PRESSURE GAUGE read ('rounds:<skill>' — Actor.roundsOf): reads the
//      SAME magazine bank useSkill spends (full → 1, spent → 0, rebuilt → 1);
//      the lancer's pressure-pack and the hopper's jet legs wear it.
//   F  THE VENT-RIDE + GEYSER-STEP (LeapDelivery.vent): the player's cast is
//      a wind-up whose column the dodge-minds read (imminentThreatTo returns
//      the caster's own feet), the take-off ERUPTS (an enemy at the feet is
//      hit + scalded with the player's casterId; an ALLY at the feet is
//      untouched — owner-safe), the flight carries `vent`, the landing is AT
//      the aimed point and splashes (enemy hit + scalded, ally untouched),
//      the wet fold rides the landing (A/B worlds: a wading victim banks
//      exactly ×wetMul the dry twin's dps), and the saddle REFUSES the cast
//      (movement-tagged — the mounts law); geyser_step is not in the
//      account's drop pool (K2's acquisition) but dev-listable (no noDrop).
//   G  THE NETS: every K1 def exists (five wave-3 + the three kit gains),
//      every kit skill exists + carries an ai hint + is affordable from its
//      wearer's own mana pool, every look part resolves to a PART_PAINTER
//      (the eight NEW pieces included), validateTells clean over the K1
//      defs, the wave-3 kin seat in SCALD tilesets ONLY, the tongue rows
//      carry the kit's epithets in BOTH mills.
//   H  THE CENSUSES (data/scaldkit.ts): THE NO-LOCK CENSUS — one line per
//      player piece present ("has a non-scald effect") — and THE MIRROR
//      CENSUS — every player piece's family has at least one scald monster
//      wearer whose kit actually carries the family's verb.
// Run: npx tsx balance/probe_scaldkit.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import { STATUS_DEFS, WET_STAND_STATUSES, bankFracOf } from '../src/engine/status';
import { instanceUseCharges, makeSkillInstance, supportFitsInst, type LeapDelivery } from '../src/engine/skills';
import { FOG_BANKS, FOG_CFG, validateFog } from '../src/engine/fog';
import { castRay } from '../src/engine/los';
import { resolveTell, validateTells, type TellSpec } from '../src/engine/tells';
import { GEM_FLOORS, gemFloorFor } from '../src/engine/loot';
import { STAT_DEFS } from '../src/engine/stats';
import type { Doodad } from '../src/engine/levelgen';
import { WEATHER_DEFS, WET_SKY } from '../src/world/weather';
import { SKILLS, SKILL_LIST } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { PROCS } from '../src/data/procs';
import { EPITAPH_LIST, VESTIGES, epitaphFor } from '../src/data/vestiges';
import { TILESETS } from '../src/data/tilesets';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import {
  SCALD_KIT_FAMILIES, SCALD_KIT_FLOOR_TILESETS, SCALD_KIT_PLAYER_PIECES,
  SCALD_KIT_PLAYER_SUPPORTS, SCALD_KIT_UNLOCK_LEDGERS, SCALD_KIT_VESTIGES, SCALD_KIT_WAVE3,
} from '../src/data/scaldkit';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { isSkillUnlockedForDrop, isSupportUnlockedForDrop } from '../src/meta/account';
import { UNLOCK_CATALOG, applyUnlock, isUnlockVisible } from '../src/meta/unlocks';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) <= eps;

bootSimEngine();

const DT = 1 / 60;
const step = (w: World, n: number): void => { for (let i = 0; i < n; i++) w.update(DT); };
/** THE HOST FRAME LOOP verbatim (the AI is caller-driven — ★AI-IS-CALLER-DRIVEN). */
const stepAI = (w: World, n: number): void => {
  for (let i = 0; i < n; i++) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
const has = (a: Actor, id: string): boolean => a.statuses.some(s => s.id === id);
const st = (a: Actor, id: string) => a.statuses.find(s => s.id === id);
const d2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
/** A stationary body (anchored — the AI never walks it; every payload lands). */
const dummy = (w: World, id: string, at: { x: number; y: number }, team: 'enemy' | 'player' = 'enemy', prep?: (m: Actor) => void): Actor => {
  const m = w.createMonster(id, 3, team);
  m.pos = vec(at.x, at.y);
  m.anchored = true;
  prep?.(m);
  w.actors.push(m);
  return m;
};
const KIT_DEFS = [...SCALD_KIT_WAVE3, 'vent_shaman', 'kettleback', 'stilt_strider'];
const NEW_PARTS = ['sinterLance', 'pressurePack', 'vaporBody', 'steamTrail', 'pressureBladder', 'spoutOrgan', 'steamJetLegs', 'sinterPlates'];
const KIT_SKILLS = ['steam_vent', 'vent_ride', 'kettleback_burst', 'scalding_lunge', 'sinter_lance', 'pressure_throw',
  'vapor_lash', 'bladder_vent', 'spout_hop', 'hopper_jab', 'mineral_slam', 'geyser_step'];
/** K2's own roster (the player pieces the censuses and the acquisition rigs
 *  read; geyser_step is K1's spike and is pinned separately where it matters). */
const K2_SKILLS = SCALD_KIT_PLAYER_PIECES.map(p => p.skill).filter(id => id !== 'geyser_step');
const K2_SUPPORTS = SCALD_KIT_PLAYER_SUPPORTS.map(s => s.support);

// ------------------------------------------------------------ A) the bank --
{
  const row = STATUS_DEFS.scalded;
  check('A1 data: `scalded` carries THE BANK (capMul, a standing duration, a wet fold) and a by-bank body read',
    !!row.bank && row.bank.capMul > 1 && (row.bank.duration ?? 0) > row.duration && (row.bank.wetMul ?? 1) > 1
    && !!row.bodyFx?.byBank, JSON.stringify(row.bank));
  check('A2 data: `soaked` (the splash\'s wetness) is a status and the wet stand list names wading/swimming/soaked',
    !!STATUS_DEFS.soaked && ['wading', 'swimming', 'soaked'].every(id => WET_STAND_STATUSES.includes(id)));
  seedGlobalRandom(0x5ca1);
  const w = makeSimWorld('warrior', 0x5ca1);
  const p = w.player;
  const cap = row.bank!.capMul;
  // An AUTHORED application banks; the bank's clock stands.
  const v = dummy(w, 'kettleback', vec(900, 700));
  v.applyStatus('scalded', 10, 1, 'probe', { casterId: p.id });
  let s = st(v, 'scalded')!;
  check('A3 live: one authored application — dps 10, peak 10, read 1/capMul, the bank\'s own duration stood',
    !!s && near(s.dps, 10) && near(s.bankPeak ?? 0, 10) && near(s.bankFrac ?? -1, 1 / cap) && near(s.remaining, row.bank!.duration!),
    s ? `dps ${s.dps} peak ${s.bankPeak} frac ${s.bankFrac} rem ${s.remaining.toFixed(2)}` : 'no status');
  v.applyStatus('scalded', 10, 1, 'probe', { casterId: p.id });
  s = st(v, 'scalded')!;
  check('A4 live: a second authored blow ACCUMULATES (dps 20, read 2/capMul, peak held)',
    near(s.dps, 20) && near(s.bankPeak ?? 0, 10) && near(s.bankFrac ?? -1, 2 / cap), `dps ${s.dps} frac ${s.bankFrac}`);
  for (let i = 0; i < 8; i++) v.applyStatus('scalded', 10, 1, 'probe', { casterId: p.id });
  s = st(v, 'scalded')!;
  check('A5 live: THE CAP — the bank never exceeds capMul × the peak (dps 40 at capMul 4), read 1',
    near(s.dps, 10 * cap) && near(s.bankFrac ?? -1, 1) && near(bankFracOf(s, row), 1), `dps ${s.dps}`);
  // A CASTER-LESS application (terrain) keeps the row's own policy + clock.
  const t = dummy(w, 'kettleback', vec(1000, 700));
  t.applyStatus('scalded', 4, 1, 'the runoff');
  t.applyStatus('scalded', 4, 1, 'the runoff');
  t.applyStatus('scalded', 3, 1, 'the runoff');
  const ts = st(t, 'scalded')!;
  check('A6 live: caster-less stings do NOT bank — strongest-wins, the row\'s 1.2s clock, no peak/read (absent == identical)',
    !!ts && near(ts.dps, 4) && near(ts.remaining, row.duration) && ts.bankPeak === undefined && ts.bankFrac === undefined,
    ts ? `dps ${ts.dps} rem ${ts.remaining.toFixed(2)} peak ${ts.bankPeak}` : 'no status');
  // A terrain instance then an authored blow: banks from the blow's peak.
  t.applyStatus('scalded', 10, 1, 'probe', { casterId: p.id });
  const ts2 = st(t, 'scalded')!;
  check('A7 live: an authored blow onto a terrain-born instance banks ON it (dps 4+10, peak = the blow, the bank\'s clock)',
    near(ts2.dps, 14) && near(ts2.bankPeak ?? 0, 10) && near(ts2.remaining, row.bank!.duration!), `dps ${ts2.dps} peak ${ts2.bankPeak}`);
  // A non-bank status with a casterId is untouched by the law.
  const b = dummy(w, 'kettleback', vec(1100, 700));
  b.applyStatus('burn', 10, 1, 'probe', { casterId: p.id });
  b.applyStatus('burn', 8, 1, 'probe', { casterId: p.id });
  const bs = st(b, 'burn')!;
  check('A8 live: a non-bank status (burn) with a casterId applies exactly as before — strongest-wins, no bank fields',
    !!bs && near(bs.dps, 10) && bs.bankPeak === undefined && bs.bankFrac === undefined && near(bs.remaining, STATUS_DEFS.burn.duration));
}

// -------------------------------------------------------- B) the wet fold --
{
  seedGlobalRandom(0x5ca2);
  const w = makeSimWorld('warrior', 0x5ca2);
  const p = w.player;
  const wetMul = STATUS_DEFS.scalded.bank!.wetMul!;
  const dry = dummy(w, 'kettleback', vec(900, 700));
  const wading = dummy(w, 'kettleback', vec(1000, 700), 'enemy', m => m.applyStatus('wading', 0, 10, 'probe'));
  const swimming = dummy(w, 'kettleback', vec(1100, 700), 'enemy', m => m.applyStatus('swimming', 0, 10, 'probe'));
  const soaked = dummy(w, 'kettleback', vec(1200, 700), 'enemy', m => m.applyStatus('soaked', 0, 1, 'probe'));
  check('B1 read: the stand states read WET (wading, swimming, soaked) and a bare body reads dry',
    !dry.isWet() && wading.isWet() && swimming.isWet() && soaked.isWet());
  for (const m of [dry, wading, swimming, soaked]) m.applyStatus('scalded', 10, 1, 'probe', { casterId: p.id });
  check(`B2 live: THE WET FOLD — a wading body banks ×${wetMul} EXACTLY (15 vs the dry twin's exact 10)`,
    near(st(dry, 'scalded')!.dps, 10) && near(st(wading, 'scalded')!.dps, 10 * wetMul)
    && near(st(swimming, 'scalded')!.dps, 10 * wetMul) && near(st(soaked, 'scalded')!.dps, 10 * wetMul),
    `dry ${st(dry, 'scalded')!.dps} wading ${st(wading, 'scalded')!.dps} swim ${st(swimming, 'scalded')!.dps} soaked ${st(soaked, 'scalded')!.dps}`);
  // The caster-less lane never folds (the runoff onto a wading body).
  const wadeT = dummy(w, 'kettleback', vec(1300, 700), 'enemy', m => m.applyStatus('wading', 0, 10, 'probe'));
  wadeT.applyStatus('scalded', 4, 1, 'the runoff');
  check('B3 live: a caster-less sting onto a wet body does NOT fold (absent == identical for the terrain lanes)',
    near(st(wadeT, 'scalded')!.dps, 4));
  // THE RAIN-WET STAMP: a scald surface zone under a rain front.
  check('B4 data: rain, storm and the basin\'s mineral rain wear `wets`; fog, snow and ash do not',
    !!WEATHER_DEFS.rain.wets && !!WEATHER_DEFS.storm.wets && !!WEATHER_DEFS.mineral_rain?.wets
    && !WEATHER_DEFS.fog.wets && !WEATHER_DEFS.snow.wets && !WEATHER_DEFS.ashfall.wets);
  const w2 = makeSimWorld('warrior', 0x5ca3);
  let zid = '';
  const fromId = w2.zone.id;
  withSeededRandom(0x5ca4, () => { zid = w2.devMintTileset('geyser_fields', 0.5, 8, { seed: 7301 }) ?? ''; });
  const zdef = w2.zoneMap[zid];
  if (zdef) withSeededRandom(0x5ca4, () => w2.loadZone(zid, fromId));
  check('B5 live: a scald surface zone minted through the real path and entered (an open-sky face: no shelter on the def)', !!zid && !!zdef && w2.zone.id === zid && w2.zone.sky !== 'sheltered',
    `zid ${zid} current ${w2.zone.id} sky ${String(w2.zone.sky)}`);
  if (zdef) {
    const p2 = w2.player;
    const open = dummy(w2, 'kettleback', vec(p2.pos.x + 80, p2.pos.y), 'enemy');
    // A roofed twin under a sinter overhang (DoodadRule.shelter — the same
    // roof the burn rain spares).
    const roofAt = vec(p2.pos.x - 120, p2.pos.y);
    w2.doodads.push({ pos: vec(roofAt.x, roofAt.y), radius: 44, kind: 'sinter_overhang' } as Doodad);
    w2.markDoodadsChanged();
    const roofed = dummy(w2, 'kettleback', roofAt, 'enemy');
    step(w2, 20);
    check('B6 live: no front → nobody reads rain-wet', !open.rainWet && !roofed.rainWet && !p2.rainWet);
    // A MATURE front (past its ramp-in: age beyond rampFrac × life) — a
    // drizzle's first minute reads below WET_SKY.minIntensity by design.
    w2.sim.weather.fronts.push({ kind: 'rain', pos: { x: zdef.map.x, y: zdef.map.y }, vel: { x: 0, y: 0 }, radius: 500, intensity: 1, age: 100, life: 200 });
    step(w2, Math.ceil(WET_SKY.sweepSec / DT) + 4);
    check('B7 live: under a rain front the open-sky bodies read RAIN-WET and the roofed twin reads DRY',
      !!w2.skyFront() && open.rainWet && open.isWet() && !roofed.rainWet && !roofed.isWet(),
      `front ${w2.skyFront()?.kind} open ${open.rainWet} roofed ${roofed.rainWet}`);
    open.applyStatus('scalded', 10, 1, 'probe', { casterId: p2.id });
    roofed.applyStatus('scalded', 10, 1, 'probe', { casterId: p2.id });
    check(`B8 live: the rain-wet body banks ×${wetMul}, the roofed one the dry baseline`,
      near(st(open, 'scalded')!.dps, 10 * wetMul) && near(st(roofed, 'scalded')!.dps, 10),
      `open ${st(open, 'scalded')!.dps} roofed ${st(roofed, 'scalded')!.dps}`);
    w2.sim.weather.fronts.length = 0;
    step(w2, Math.ceil(WET_SKY.sweepSec / DT) + 4);
    check('B9 live: the front passes → the stamp clears', !open.rainWet && !p2.rainWet);
  }
}

// ---------------------------------------------------------- C) the rupture --
{
  seedGlobalRandom(0x5ca5);
  const w = makeSimWorld('warrior', 0x5ca5);
  const p = w.player;
  const row = STATUS_DEFS.scalded;
  // A banked victim, a clean rupture of half.
  const v = dummy(w, 'kettleback', vec(900, 700));
  v.applyStatus('scalded', 20, 1, 'probe', { casterId: p.id });
  const life0 = v.life;
  const s0 = st(v, 'scalded')!;
  const banked = s0.dps * s0.stacks * s0.remaining;
  const took = w.ruptureBank(p, v, 'scalded', 0.5, 1);
  const s1 = st(v, 'scalded')!;
  check('C1 live: a half rupture SPENDS half the bank (dps 20 → 10), restamps the read, and BURSTS — life falls by the mitigated share',
    !!s1 && near(s1.dps, 10) && near(s1.bankFrac ?? -1, bankFracOf(s1, row)) && took > 0 && near(v.life, life0 - took, 1e-6) && took <= banked * 0.5 + 1e-6,
    `took ${took.toFixed(2)} of banked ${banked.toFixed(2)}, dps ${s1?.dps}`);
  // A whole-fraction rupture expunges.
  const v2 = dummy(w, 'kettleback', vec(1000, 700));
  v2.applyStatus('scalded', 20, 1, 'probe', { casterId: p.id });
  const tookAll = w.ruptureBank(p, v2, 'scalded', 1, 1);
  check('C2 live: a whole-fraction rupture EXPUNGES the status and bursts the whole bank', tookAll > 0 && !has(v2, 'scalded'));
  // Over-consume: fraction 3 bursts no more than a whole one (same bank, same mitigation).
  const v3 = dummy(w, 'kettleback', vec(1100, 700));
  v3.applyStatus('scalded', 20, 1, 'probe', { casterId: p.id });
  const tookOver = w.ruptureBank(p, v3, 'scalded', 3, 1);
  check('C3 live: NEVER OVER-CONSUMES — a fraction of 3 bursts exactly what a fraction of 1 does, and expunges',
    near(tookOver, tookAll, 1e-6) && !has(v3, 'scalded'), `over ${tookOver.toFixed(2)} whole ${tookAll.toFixed(2)}`);
  // No bank → nothing.
  const v4 = dummy(w, 'kettleback', vec(1200, 700));
  const l4 = v4.life;
  const took4 = w.ruptureBank(p, v4, 'scalded', 0.6, 1);
  check('C4 live: a body with NO banked scald takes nothing (0 returned, life untouched)', took4 === 0 && near(v4.life, l4));
  // Credit: a killing burst pays the rupturer.
  const v5 = dummy(w, 'kettleback', vec(1300, 700), 'enemy', m => { m.life = 6; });
  v5.applyStatus('scalded', 30, 1, 'probe', { casterId: p.id });
  const xp0 = w.meta.xp;
  const took5 = w.ruptureBank(p, v5, 'scalded', 1, 1);
  check('C5 live: a killing burst is CREDITED to the rupturer (the kill pays the hero\'s XP)',
    took5 > 0 && v5.dead && w.meta.xp > xp0, `xp ${xp0} → ${w.meta.xp}`);
  // LIVE through the real pipeline: the lancer's Pressure Throw on a banked hero.
  const lancer = dummy(w, 'scald_lancer', vec(p.pos.x + 150, p.pos.y), 'enemy');
  lancer.facing = Math.atan2(p.pos.y - lancer.pos.y, p.pos.x - lancer.pos.x);
  p.applyStatus('scalded', 20, 1, 'probe', { casterId: lancer.id });
  const pl0 = p.life;
  const pinst = makeSkillInstance(SKILLS.pressure_throw, 1);
  const cast = w.useSkill(lancer, pinst, vec(p.pos.x, p.pos.y));
  step(w, 90);
  const ps = st(p, 'scalded');
  check('C6 live: the scald lancer\'s Pressure Throw (the real projectile pipeline) RUPTURES the hero\'s bank — dps × (1 − 0.6), life down',
    cast && !!ps && ps.dps < 20 * 0.4 + 1e-3 && ps.dps > 0 && p.life < pl0, `cast ${cast} dps ${ps?.dps} life ${pl0.toFixed(1)} → ${p.life.toFixed(1)}`);
}

// ------------------------------------------------------------- D) the vent --
{
  const steam = FOG_BANKS.steam;
  check('D1 data: the `steam` bank is registered — occludes sight, grants fogveiled, life floor > 4s, validateFog clean',
    !!steam && !!steam.occludesSight && !!steam.grants?.some(g => g.status === 'fogveiled') && (steam.life?.[0] ?? 0) > 4
    && validateFog(id => !!STATUS_DEFS[id], []).filter(m => m.includes("'steam'")).length === 0);
  seedGlobalRandom(0x5ca6);
  const w = makeSimWorld('warrior', 0x5ca6);
  const at = vec(1000, 700);
  const A = vec(at.x - 160, at.y), B = vec(at.x + 160, at.y);
  const C = vec(at.x - 160, at.y + 420), D = vec(at.x + 160, at.y + 420);
  check('D2 live: with no bank standing the eye line across the seat is CLEAR and the env reads no medium',
    w.lineOfSight(A, B) && !w.opaqueAt(at.x, at.y) && (w.fog?.occluders ?? 0) === 0);
  const bank = w.plantVent({ bank: 'steam', radius: 90, duration: 9 }, at, 1, 1);
  check('D3 live: plantVent stands a MORTAL bank at the point with the cast\'s reach + life (the field\'s occluder count 1)',
    !!bank && !!bank.mortal && near(bank.pos.x, at.x) && near(bank.pos.y, at.y) && near(bank.reach, 90) && near(bank.life, 9)
    && w.fog!.occluders === 1 && w.fog!.banks.includes(bank));
  step(w, Math.ceil(3 / DT)); // past the ramp-in: the lobes read at full density
  check('D4 live: THE VAPOR RIDE — the heart reads opaque, the eye line ACROSS the bank is blocked (kind medium), the control line clear',
    w.opaqueAt(at.x, at.y) && !w.lineOfSight(A, B) && castRay(w, A, B, 'sight')?.kind === 'medium' && w.lineOfSight(C, D),
    `opaque ${w.opaqueAt(at.x, at.y)} los ${w.lineOfSight(A, B)} kind ${castRay(w, A, B, 'sight')?.kind}`);
  check('D5 live: the watch fan\'s clip lands INSIDE the bank (sightClipD finite and short of B) — drawn == unseen',
    Number.isFinite(w.sightClipD(A, B)) && w.sightClipD(A, B) < d2(A, B));
  check('D6 live: a SHOT ray across the same bank is clear — steam is not a wall (the shot channel byte-identical)',
    castRay(w, A, B, 'shot') === null);
  check('D7 live: occupants of the white wear fogveiled (the bank\'s grant — the stealth fabric\'s word)',
    (() => { const m = dummy(w, 'kettleback', at); step(w, Math.ceil(FOG_CFG.applyEvery / DT) + 2); return has(m, 'fogveiled'); })());
  step(w, Math.ceil(8 / DT));
  check('D8 live: MORTAL — past its life the bank is gone (never re-gathered), occluders 0, the eye line clear again',
    !!bank && !w.fog!.banks.includes(bank) && w.fog!.occluders === 0 && w.lineOfSight(A, B));
  // LIVE: the vent-shaman's Steam Vent through useSkill.
  const sh = dummy(w, 'vent_shaman', vec(700, 900));
  sh.mana = 200;
  const before = w.fog!.banks.length;
  const ok = w.useSkill(sh, makeSkillInstance(SKILLS.steam_vent, 1), vec(sh.pos.x, sh.pos.y));
  step(w, 60);
  const shBank = w.fog!.banks.find(b => b.def.id === 'steam' && b.mortal && d2(b.pos, sh.pos) < 20);
  check('D9 live: the vent-shaman\'s Steam Vent (useSkill, self delivery) plants the steam bank at its OWN feet',
    ok && w.fog!.banks.length === before + 1 && !!shBank, `ok ${ok} banks ${before} → ${w.fog!.banks.length}`);
}

// ---------------------------------------------------- E) the pressure gauge --
{
  seedGlobalRandom(0x5ca7);
  const w = makeSimWorld('warrior', 0x5ca7);
  const p = w.player;
  const lancer = dummy(w, 'scald_lancer', vec(p.pos.x + 200, p.pos.y));
  stepAI(w, 2);
  const spec: TellSpec = { source: 'rounds:pressure_throw', steps: 10, channel: { kind: 'glow', color: '#fff', max: 1 } };
  const r0 = w.kitRounds(lancer, 'pressure_throw');
  check('E1 live: a fresh lancer reads a FULL pack (rounds 1/1) and the tell source resolves 1 (World.kitRounds — the read MINTS the kit instance the cast will spend)',
    !!r0 && r0.count === 1 && r0.max === 1 && near(resolveTell(spec, lancer, w), 1), JSON.stringify(r0));
  const inst = lancer.aiActionInsts?.get('pressure_throw');
  check('E2 live: the kit instance now stands on the body (aiActionInsts — the same cache the scripted cast reads)', !!inst);
  if (inst) {
    lancer.facing = 0;
    const cast = w.useSkill(lancer, inst, vec(lancer.pos.x + 200, lancer.pos.y));
    const r1 = w.kitRounds(lancer, 'pressure_throw');
    check('E3 live: the cast SPENDS the round the gauge reads — rounds 0/1, the source resolves 0 (one bank, drawn == spent)',
      cast && !!r1 && r1.count === 0 && near(resolveTell(spec, lancer, w), 0), `cast ${cast} ${JSON.stringify(r1)}`);
    step(w, Math.ceil((SKILLS.pressure_throw.useCharges!.recharge! + 0.5) / DT));
    const r2 = w.kitRounds(lancer, 'pressure_throw');
    check('E4 live: the magazine REBUILDS on its recharge — the gauge reads full again', !!r2 && r2.count === 1 && near(resolveTell(spec, lancer, w), 1));
  }
  check('E5 data: the lancer\'s pressure-pack and the hopper\'s jet legs are worn off the rounds source',
    (MONSTERS.scald_lancer.tells ?? []).some(t => t.source === 'rounds:pressure_throw')
    && (MONSTERS.spout_hopper.tells ?? []).some(t => t.source === 'rounds:spout_hop'));
  check('E6 live: a skill without use-charges reads nothing (rounds → 0) — the hopper\'s jab beside its hop',
    w.kitRounds(lancer, 'hopper_jab') === undefined && near(resolveTell({ ...spec, source: 'rounds:hopper_jab' }, lancer, w), 0)
    && !!w.kitRounds(dummy(w, 'spout_hopper', vec(600, 600)), 'spout_hop'));
}

// -------------------------------------------- F) the vent-ride / geyser-step --
{
  const def = SKILLS.geyser_step;
  const del = def.delivery as LeapDelivery;
  check('F1 data: geyser_step is a movement-tagged fire LEAP with a VENT (the cast\'s broil + column), a scald splash, and a wind-up',
    !!def && del.type === 'leap' && !!del.vent && def.tags.includes('movement') && def.tags.includes('fire') && def.useTime > 0
    && def.effects.some(e => e.type === 'status' && e.status === 'scalded') && def.effects.some(e => e.type === 'damage'));
  seedGlobalRandom(0x5ca8);
  const w = makeSimWorld('warrior', 0x5ca8);
  const p = w.player;
  check('F2 data: geyser_step is dev-listable (no noDrop) and NOT in a fresh account\'s drop pool (acquisition is K2\'s)',
    !def.noDrop && !isSkillUnlockedForDrop(w.account, 'geyser_step'));
  const start = vec(p.pos.x, p.pos.y);
  const aimD = 250;
  const aim = vec(start.x + aimD, start.y);
  p.facing = 0;
  p.mana = 500;
  // The enemies wear no evasion: the pins are about WHERE the column and the
  // splash land, not about the accuracy roll (a leveled kettleback evades
  // ~20% — a deterministic miss on one seed would lie about the law).
  const sure = (m: Actor): void => { m.sheet.setBase('evasion', 0); };
  // Seated a body's width off the hero (the crowd shoulder nudges an
  // overlapped caster during the wind-up; the column is read where the
  // caster STANDS at take-off, so both stay well inside columnR 40).
  const enemyFeet = dummy(w, 'kettleback', vec(start.x + 26, start.y), 'enemy', sure);
  const allyFeet = dummy(w, 'kettleback', vec(start.x, start.y - 26), 'player');
  const enemyLand = dummy(w, 'kettleback', vec(aim.x + 30, aim.y), 'enemy', sure);
  const allyLand = dummy(w, 'kettleback', vec(aim.x - 30, aim.y), 'player');
  const lives = [enemyFeet, allyFeet, enemyLand, allyLand].map(m => m.life);
  const inst = makeSkillInstance(def, 1);
  const cast = w.useSkill(p, inst, aim);
  check('F3 live: the hero casts geyser_step — a wind-up (casting) with the leap+vent delivery', cast && !!p.casting && p.casting.inst === inst);
  const thr = w.imminentThreatTo(enemyFeet, 0);
  check('F4 live: DURING the wind-up the dodge-mind reads the coming column at the caster\'s OWN feet (radius = columnR)',
    !!thr && near(thr.pos.x, start.x, 1) && near(thr.pos.y, start.y, 1) && near(thr.radius, del.vent!.columnR, 1e-6) && thr.eta > 0,
    thr ? `at ${thr.pos.x.toFixed(0)},${thr.pos.y.toFixed(0)} r ${thr.radius} eta ${thr.eta.toFixed(2)}` : 'no threat');
  step(w, Math.ceil(def.useTime / DT) + 2);
  check('F5 live: at take-off the hero is AIRBORNE carrying the vent (LeapState.vent.columnR) toward the aim',
    !!p.leap && !!p.leap.vent && near(p.leap.vent.columnR, del.vent!.columnR, 1e-6) && near(p.leap.dest.x, aim.x, 2) && near(p.leap.dest.y, aim.y, 2),
    p.leap ? `dest ${p.leap.dest.x.toFixed(0)},${p.leap.dest.y.toFixed(0)} vent ${JSON.stringify(p.leap.vent)}` : 'no leap');
  const ef = st(enemyFeet, 'scalded');
  check('F6 live: THE COLUMN at the departure — the enemy at the feet is hit + banks a scald with the hero\'s casterId; the ALLY at the feet is untouched (owner-safe)',
    enemyFeet.life < lives[0] && !!ef && ef.casterId === p.id && ef.bankPeak !== undefined
    && near(allyFeet.life, lives[1]) && !has(allyFeet, 'scalded'),
    `enemy ${lives[0].toFixed(1)} → ${enemyFeet.life.toFixed(1)} ally ${lives[1].toFixed(1)} → ${allyFeet.life.toFixed(1)}`);
  step(w, Math.ceil(del.airTime / DT) + 3);
  // (The anchored bodies flanking the aim shoulder the hero a few px after
  // touchdown — the crowd separation; the DEST itself was pinned in F5.)
  check('F7 live: the hero LANDS at the aimed point (no leap left; within the crowd\'s shoulder)', !p.leap && d2(p.pos, aim) < 40,
    `at ${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)} aim ${aim.x},${aim.y}`);
  const el = st(enemyLand, 'scalded');
  check('F8 live: THE SPLASH — the enemy at the landing is hit + banks a scald; the ally at the landing is untouched',
    enemyLand.life < lives[2] && !!el && el.casterId === p.id && near(allyLand.life, lives[3]) && !has(allyLand, 'scalded'),
    `enemy ${lives[2].toFixed(1)} → ${enemyLand.life.toFixed(1)} ally ${lives[3].toFixed(1)} → ${allyLand.life.toFixed(1)}`);
  // THE SADDLE refuses (movement-tagged).
  step(w, Math.ceil(def.cooldown / DT) + 5);
  p.mana = 500;
  p.mountId = 999999;
  const refused = w.useSkill(p, inst, vec(p.pos.x + 200, p.pos.y));
  p.mountId = undefined;
  check('F9 live: a SADDLE refuses geyser_step (movement-tagged — the mounts law) and the cast is honest again dismounted',
    !refused && !p.casting && w.useSkill(p, inst, vec(p.pos.x + 200, p.pos.y)));
  // THE WET FOLD through the real landing: A/B worlds, one victim dry, one wading.
  const land = (seed: number, wet: boolean): number => {
    seedGlobalRandom(seed);
    const wx = makeSimWorld('warrior', seed);
    const px = wx.player;
    px.facing = 0; px.mana = 500;
    const am = vec(px.pos.x + 220, px.pos.y);
    const victim = dummy(wx, 'kettleback', vec(am.x, am.y), 'enemy', m => { m.sheet.setBase('evasion', 0); if (wet) m.applyStatus('wading', 0, 20, 'probe'); });
    seedGlobalRandom(seed ^ 0x77);
    wx.useSkill(px, makeSkillInstance(def, 1), am);
    step(wx, Math.ceil((def.useTime + del.airTime) / DT) + 4);
    return st(victim, 'scalded')?.dps ?? 0;
  };
  const dryDps = land(0x5ca9, false), wetDps = land(0x5ca9, true);
  check(`F10 live: THE WET FOLD rides the landing — a wading victim banks ×${STATUS_DEFS.scalded.bank!.wetMul} the dry twin's dps EXACTLY (A/B worlds, identical rolls)`,
    dryDps > 0 && near(wetDps, dryDps * STATUS_DEFS.scalded.bank!.wetMul!, 1e-6), `dry ${dryDps.toFixed(3)} wet ${wetDps.toFixed(3)}`);
  // The monster half: the spout-hopper's hop carries the same vent.
  check('F11 data: THE MIRROR — the vent-shaman\'s vent_ride and the spout-hopper\'s spout_hop are vent-leaps (the same LeapDelivery.vent law)',
    SKILLS.vent_ride.delivery.type === 'leap' && !!(SKILLS.vent_ride.delivery as { vent?: unknown }).vent
    && SKILLS.spout_hop.delivery.type === 'leap' && !!(SKILLS.spout_hop.delivery as { vent?: unknown }).vent
    && MONSTERS.vent_shaman.skills.includes('vent_ride') && MONSTERS.spout_hopper.skills.includes('spout_hop'));
}

// ------------------------------------------------------------- G) the nets --
{
  check('G1 nets: every K1 def exists with a look', KIT_DEFS.every(id => !!MONSTERS[id] && !!LOOKS[MONSTERS[id].look ?? '']),
    KIT_DEFS.filter(id => !MONSTERS[id] || !LOOKS[MONSTERS[id].look ?? '']).join(',') || 'all');
  const missingSkill: string[] = [];
  for (const id of KIT_DEFS) {
    const d = MONSTERS[id];
    for (const sk of d.skills) {
      const s = SKILLS[sk];
      if (!s) { missingSkill.push(`${id}:${sk} (missing)`); continue; }
      if (!s.ai) missingSkill.push(`${id}:${sk} (no ai hint)`);
      if (s.manaCost > (d.base.mana ?? 0)) missingSkill.push(`${id}:${sk} (unaffordable: ${s.manaCost} > ${d.base.mana ?? 0})`);
    }
  }
  check('G2 nets: every kit skill exists, carries an ai hint, and is affordable from its wearer\'s own mana pool', missingSkill.length === 0, missingSkill.join('; ') || 'all');
  check('G3 nets: every K1 kit skill is registered', KIT_SKILLS.every(id => !!SKILLS[id]), KIT_SKILLS.filter(id => !SKILLS[id]).join(',') || 'all');
  const unpainted: string[] = [];
  for (const id of KIT_DEFS) {
    const look = LOOKS[MONSTERS[id].look ?? ''];
    for (const part of [...(look?.parts ?? []), ...(look?.live ?? [])]) if (!PART_PAINTERS[part.kind]) unpainted.push(`${id}:${part.kind}`);
  }
  check('G4 nets: every look part resolves to a painter — the EIGHT NEW PIECES included (THE NEW-PIECES PREFERENCE)',
    unpainted.length === 0 && NEW_PARTS.every(k => !!PART_PAINTERS[k]), unpainted.join(',') || 'all');
  const usedNew = new Set<string>();
  for (const id of KIT_DEFS) {
    const look = LOOKS[MONSTERS[id].look ?? ''];
    for (const part of [...(look?.parts ?? []), ...(look?.live ?? [])]) if (NEW_PARTS.includes(part.kind)) usedNew.add(part.kind);
    for (const t of MONSTERS[id].tells ?? []) if (t.channel.kind === 'part' && NEW_PARTS.includes(t.channel.part.kind)) usedNew.add(t.channel.part.kind);
  }
  check('G5 nets: every new piece is WORN by a K1 body (looks or tells) — no orphan painters', NEW_PARTS.every(k => usedNew.has(k)),
    NEW_PARTS.filter(k => !usedNew.has(k)).join(',') || 'all');
  const tellDefs: Record<string, { tells?: TellSpec[] }> = {};
  for (const id of KIT_DEFS) tellDefs[id] = MONSTERS[id];
  const faults = validateTells(tellDefs, PART_PAINTERS);
  check('G6 nets: validateTells clean over the K1 defs (the rounds source, the bladder gauge, the warden\'s tone plates)', faults.length === 0, faults.join('; '));
  // Seating: scald tilesets ONLY.
  const scaldSets = new Set<string>([...Object.values(TILESETS).filter(t => t.biome === 'scald').map(t => t.id), 'steam_galleries', 'great_geyser', 'cistern']);
  const foreign: string[] = [];
  const seated = new Set<string>();
  for (const t of Object.values(TILESETS)) {
    const tables = [t.packs?.table ?? []];
    for (const table of tables) for (const row of table) {
      if (!(SCALD_KIT_WAVE3 as readonly string[]).includes(row.id)) continue;
      seated.add(row.id);
      if (!scaldSets.has(t.id)) foreign.push(`${row.id}@${t.id}`);
    }
  }
  check('G7 nets: every wave-3 kin is SEATED, and only in scald tilesets (presence envelopes ride the rows)',
    SCALD_KIT_WAVE3.every(id => seated.has(id)) && foreign.length === 0, foreign.join(',') || `seated ${[...seated].join(',')}`);
  check('G8 nets: every wave-3 row wears a presence envelope (the leveled-list law)',
    SCALD_KIT_WAVE3.every(id => !!MONSTERS[id].presence));
  // Tongues: both mills carry the kit's epithets (the geyserkin kin read them).
  const tongue = readFileSync('src/data/monsterNames.ts', 'utf8');
  const saga = readFileSync('src/data/nemesis.ts', 'utf8');
  check('G9 nets: the kit\'s epithets stand in BOTH name mills', tongue.includes('Who Rides the Spout') && saga.includes('Who Rides the Spout'));
}

// --------------------------------------------------------- H) the censuses --
{
  // THE NO-LOCK CENSUS: one line per player piece — "has a non-scald effect".
  for (const piece of SCALD_KIT_PLAYER_PIECES) {
    const s = SKILLS[piece.skill];
    const nonScald = !!s && (s.effects.some(e => e.type !== 'status' || e.status !== 'scalded')
      || ['leap', 'dash', 'blink', 'projectile', 'melee', 'nova', 'ground', 'storm'].includes(s.delivery.type));
    console.log(`CENSUS  no-lock: ${piece.skill} (${piece.family}) — ${nonScald ? 'has a non-scald effect (works anywhere)' : 'SCALD-ONLY (effect-locked!)'}`);
    check(`H1 no-lock: ${piece.skill} carries a non-scald effect (THE NO-LOCK LAW)`, nonScald);
  }
  // THE MIRROR CENSUS: every player piece's family has a wearer whose kit carries the verb.
  const wears = (id: string, family: string): boolean => {
    const d = MONSTERS[id];
    if (!d) return false;
    const skills = d.skills.map(k => SKILLS[k]).filter(Boolean);
    switch (family) {
      case 'geyserStep': return skills.some(s => s.delivery.type === 'leap' && !!(s.delivery as { vent?: unknown }).vent);
      case 'steam': return skills.some(s => s.effects.some(e => e.type === 'vent'));
      case 'scald': return skills.some(s => s.effects.some(e => (e.type === 'status' && e.status === 'scalded') || e.type === 'rupture'));
      case 'pressure': return (d.tells ?? []).some(t => t.source.startsWith('rounds:') || t.source.startsWith('drive:'));
      case 'prism': return !!d.tune;
      default: return false;
    }
  };
  for (const [family, row] of Object.entries(SCALD_KIT_FAMILIES)) {
    const live = row.wearers.filter(id => wears(id, family));
    console.log(`CENSUS  mirror: ${family} — wearers ${row.wearers.join(',')} — carrying the verb: ${live.join(',') || 'NONE'}`);
    check(`H2 mirror: family '${family}' has at least one scald monster wearer carrying its verb`, live.length >= 1);
  }
  for (const piece of SCALD_KIT_PLAYER_PIECES) {
    const row = SCALD_KIT_FAMILIES[piece.family];
    check(`H3 mirror: the player piece ${piece.skill} is mirrored by ${row.wearers.filter(id => wears(id, piece.family)).join(',') || 'NOBODY'}`,
      row.wearers.some(id => wears(id, piece.family)));
  }
  // K2's gem half rides the SAME mirror ledger (a support's family must have
  // a wearer too — the player meets the verb before owning the temper).
  for (const gem of SCALD_KIT_PLAYER_SUPPORTS) {
    const row = SCALD_KIT_FAMILIES[gem.family];
    check(`H4 mirror: the player gem ${gem.support} is mirrored by ${row.wearers.filter(id => wears(id, gem.family)).join(',') || 'NOBODY'}`,
      row.wearers.some(id => wears(id, gem.family)));
  }
}

// ===========================================================================
// K2 — THE PLAYER PIECES + ACQUISITION (charter §3/§4/§7 — the roster cut,
// the ledger, the vendor rung). Sections I–Q.
// ===========================================================================

// ------------------------------------------------- I) the pieces stand up --
{
  for (const id of K2_SKILLS) {
    const s = SKILLS[id];
    check(`I1 registry: player skill '${id}' exists, is DROPPABLE (no noDrop), carries a bracket and honest tags`,
      !!s && !s.noDrop && (s.minDropLevel ?? 0) > 0 && s.tags.length > 0
      && !!s.description && s.description.length > 40,
      s ? `${s.name} · ${s.tags.join('/')} · lvl ${s.minDropLevel}` : 'MISSING');
  }
  for (const id of K2_SUPPORTS) {
    const g = SUPPORTS[id];
    check(`I2 registry: player gem '${id}' exists with a weight, a bracket and a real description`,
      !!g && g.weight > 0 && (g.minDropLevel ?? 0) > 0 && !!g.description && g.description.length > 40,
      g ? `${g.name} · w${g.weight} · lvl ${g.minDropLevel}` : 'MISSING');
  }
  // THE HIT-RIDER FLOOR: every gem whose payload rides resolveHit declares
  // the 'strikes' mechanism (the supports law); the bank-granting gem
  // declares its own honest floor instead.
  for (const id of ['boiling_point', 'vaporize', 'mineral_tuning']) {
    check(`I3 gate: '${id}' rides the 'strikes' MECHANISM floor (a never-hitting host refuses honestly)`,
      (SUPPORTS[id]?.requiresMechanisms ?? []).includes('strikes'));
  }
  check('I4 gate: Pressure Seal rides the \'bankless\' floor (one economy per slot — a native bank or a munition wins, so the graft would ride inert)',
    (SUPPORTS.pressure_seal?.requiresMechanisms ?? []).includes('bankless'));
  // The bankless predicate is LIVE and self-lifting: refused on a banked
  // host, open on a bankless one.
  {
    const banked = makeSkillInstance(SKILLS.blowhole, 1);   // a native bank
    const bare = makeSkillInstance(SKILLS.scalding_lash, 1); // none
    check('I5 live: \'bankless\' refuses a host that already banks (blowhole) and opens on one that does not (scalding_lash)',
      !supportFitsInst(SUPPORTS.pressure_seal, banked) && supportFitsInst(SUPPORTS.pressure_seal, bare));
  }
  // Every piece casts through the ONE pipeline — each on its own clean
  // world with a real mark standing in front of it (Boil Over TARGETS an
  // enemy and honestly refuses an empty field, so the census must give it
  // one; a shared world would also let one press's recovery mask another).
  {
    const cast: string[] = [];
    for (const id of K2_SKILLS) {
      seedGlobalRandom(0x5cb0);
      const w = makeSimWorld('warrior', 0x5cb0);
      const p = w.player;
      p.mana = 9999;
      p.facing = 0;
      dummy(w, 'kettleback', vec(p.pos.x + 160, p.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
      const inst = makeSkillInstance(SKILLS[id], 1);
      if (!w.useSkill(p, inst, vec(p.pos.x + 160, p.pos.y))) cast.push(id);
      step(w, 40);
      if (p.casting) { p.casting.held = false; step(w, 40); }
    }
    check('I6 live: every K2 player skill CASTS through the one pipeline (useSkill accepted the press)', cast.length === 0, cast.join(',') || 'all');
  }
}

// ------------------------------------------------------- J) SCALD, played --
{
  seedGlobalRandom(0x5cb1);
  const w = makeSimWorld('warrior', 0x5cb1);
  const p = w.player;
  p.mana = 9999;
  p.facing = 0;
  const wetMul = STATUS_DEFS.scalded.bank!.wetMul!;
  // SCALDING LASH banks.
  const v = dummy(w, 'kettleback', vec(p.pos.x + 70, p.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
  const l0 = v.life;
  w.useSkill(p, makeSkillInstance(SKILLS.scalding_lash, 1), vec(v.pos.x, v.pos.y));
  step(w, 45);
  const s1 = st(v, 'scalded');
  check('J1 live: SCALDING LASH wounds and BANKS (the scald carries the hero\'s casterId and a bank peak)',
    v.life < l0 && !!s1 && s1.casterId === p.id && s1.bankPeak !== undefined,
    s1 ? `dps ${s1.dps} peak ${s1.bankPeak}` : 'no scald');
  const dps1 = s1?.dps ?? 0;
  p.cooldowns.clear();
  w.useSkill(p, makeSkillInstance(SKILLS.scalding_lash, 1), vec(v.pos.x, v.pos.y));
  step(w, 45);
  check('J2 live: a SECOND lash ACCUMULATES on the same wound (the two-verb family banks before it spends)',
    (st(v, 'scalded')?.dps ?? 0) > dps1, `${dps1} → ${st(v, 'scalded')?.dps}`);
  // KETTLE BURST soaks, and the soak makes the NEXT scald bank ×wetMul —
  // measured as an exact A/B against a dry twin taking the same blow.
  const soakDps = (soakFirst: boolean): number => {
    seedGlobalRandom(0x5cb2);
    const wx = makeSimWorld('warrior', 0x5cb2);
    const px = wx.player;
    px.mana = 9999; px.facing = 0;
    const vx = dummy(wx, 'kettleback', vec(px.pos.x + 150, px.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    if (soakFirst) vx.applyStatus('soaked', 0, 1, 'probe');
    vx.applyStatus('scalded', 10, 1, 'probe', { casterId: px.id });
    return st(vx, 'scalded')?.dps ?? 0;
  };
  check(`J3 live: THE SELF-ENABLING COMBO — a SOAKED body banks ×${wetMul} the dry twin's exact dps`,
    near(soakDps(true), soakDps(false) * wetMul, 1e-6), `dry ${soakDps(false)} soaked ${soakDps(true)}`);
  {
    const wv = makeSimWorld('warrior', 0x5cb3);
    const pv = wv.player;
    pv.mana = 9999; pv.facing = 0;
    const vv = dummy(wv, 'kettleback', vec(pv.pos.x + 140, pv.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    wv.useSkill(pv, makeSkillInstance(SKILLS.kettle_burst, 1), vec(vv.pos.x, vv.pos.y));
    step(wv, 50);
    check('J4 live: KETTLE BURST leaves the crowd SOAKED and scalded (it brings its own water)',
      has(vv, 'soaked') && has(vv, 'scalded'), `soaked ${has(vv, 'soaked')} scalded ${has(vv, 'scalded')}`);
  }
  // BOIL OVER spends the bank through the real pipeline.
  {
    const wb = makeSimWorld('warrior', 0x5cb4);
    const pb = wb.player;
    pb.mana = 9999; pb.facing = 0;
    const vb = dummy(wb, 'kettleback', vec(pb.pos.x + 150, pb.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    vb.applyStatus('scalded', 20, 1, 'probe', { casterId: pb.id });
    const before = st(vb, 'scalded')!.dps;
    const lb = vb.life;
    const fx = SKILLS.boil_over.effects.find(e => e.type === 'rupture') as { fraction: number } | undefined;
    wb.useSkill(pb, makeSkillInstance(SKILLS.boil_over, 1), vec(vb.pos.x, vb.pos.y));
    step(wb, 60);
    const after = st(vb, 'scalded');
    check('J5 live: BOIL OVER RUPTURES the mark\'s bank — dps falls by exactly the spent fraction, life falls by lance + burst',
      !!fx && !!after && near(after.dps, before * (1 - fx.fraction), 1e-6) && vb.life < lb,
      `dps ${before} → ${after?.dps} (fraction ${fx?.fraction}) life ${lb.toFixed(1)} → ${vb.life.toFixed(1)}`);
    // With NO bank standing it is still an honest lance (the floor).
    const vb2 = dummy(wb, 'kettleback', vec(pb.pos.x - 150, pb.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    const lb2 = vb2.life;
    pb.cooldowns.clear();
    pb.facing = Math.PI;
    wb.useSkill(pb, makeSkillInstance(SKILLS.boil_over, 1), vec(vb2.pos.x, vb2.pos.y));
    step(wb, 60);
    check('J6 live: with NOTHING banked Boil Over is still a hot lance (no bank → no burst, never a refused press)',
      vb2.life < lb2, `life ${lb2.toFixed(1)} → ${vb2.life.toFixed(1)}`);
  }
  // BOILING POINT: the wet rider — armed on a wet target, silent on a dry one.
  {
    const wetRider = (wetTarget: boolean): boolean => {
      seedGlobalRandom(0x5cb5);
      const wx = makeSimWorld('warrior', 0x5cb5);
      const px = wx.player;
      px.mana = 9999; px.facing = 0;
      const inst = makeSkillInstance(SKILLS.cleave ? SKILLS.cleave : SKILLS.scalding_lash, 1);
      inst.sockets[0] = { def: SUPPORTS.boiling_point, level: 5 };
      const vx = dummy(wx, 'kettleback', vec(px.pos.x + 60, px.pos.y), 'enemy', m => {
        m.sheet.setBase('evasion', 0);
        if (wetTarget) m.applyStatus('wading', 0, 30, 'probe');
      });
      for (let i = 0; i < 4 && !has(vx, 'scalded'); i++) {
        px.cooldowns.clear();
        wx.useSkill(px, inst, vec(vx.pos.x, vx.pos.y));
        step(wx, 40);
      }
      return has(vx, 'scalded');
    };
    check('J7 live: BOILING POINT scalds a WET target through the real hit sweep, and a DRY one never',
      wetRider(true) && !wetRider(false));
  }
  check('J8 data: the wet rider is a GENERATED family (applyWet_<status>) — registered for every status, never a bespoke hook',
    !!STAT_DEFS.applyWet_scalded && !!STAT_DEFS.applyWet_chill && !!STAT_DEFS.applyWet_burn
    && STAT_DEFS.applyWet_scalded.max === 1);
}

// ---------------------------------------------------- K) PRESSURE, played --
{
  seedGlobalRandom(0x5cb6);
  const w = makeSimWorld('warrior', 0x5cb6);
  const p = w.player;
  p.mana = 9999;
  p.facing = 0;
  const inst = makeSkillInstance(SKILLS.blowhole, 1);
  p.skills[0] = inst;
  const cap = p.skillChargeCap(inst);
  const bank = p.skillChargeBank(inst);
  check('K1 data: BLOWHOLE carries a PATIENT bank that VENTS WHOLE (ventAll + still.bleed + a real clock)',
    !!SKILLS.blowhole.useCharges?.ventAll && !!SKILLS.blowhole.useCharges?.still
    && (SKILLS.blowhole.useCharges?.recharge ?? 0) > 0, JSON.stringify(SKILLS.blowhole.useCharges));
  // THE VENT PRESS: the whole bank goes, and 1 + rounds columns land.
  bank.count = cap;
  const ring = [0, 1, 2, 3, 4].map(i => dummy(w, 'kettleback',
    vec(p.pos.x + 120 + i * 8, p.pos.y - 70 + i * 34), 'enemy', m => m.sheet.setBase('evasion', 0)));
  const lives = ring.map(m => m.life);
  w.useSkill(p, inst, vec(p.pos.x + 150, p.pos.y));
  const afterPress = p.skillChargeBank(inst).count;
  step(w, 200);
  const struck = ring.filter((m, i) => m.life < lives[i]).length;
  check(`K2 live: THE VENT PRESS spends the WHOLE bank (${cap} → 0) and every round is one more column — ${struck} of ${ring.length} bodies struck`,
    afterPress === 0 && struck >= Math.min(ring.length, 1 + cap), `bank ${cap} → ${afterPress}, struck ${struck}`);
  // A DRY press still spits (never refused, never converted).
  {
    const wd = makeSimWorld('warrior', 0x5cb7);
    const pd = wd.player;
    pd.mana = 9999; pd.facing = 0;
    const id = makeSkillInstance(SKILLS.blowhole, 1);
    pd.skills[0] = id;
    pd.skillChargeBank(id).count = 0;
    const vd = dummy(wd, 'kettleback', vec(pd.pos.x + 150, pd.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    const ld = vd.life;
    const ok = pd.canUse(id) && wd.useSkill(pd, id, vec(vd.pos.x, vd.pos.y));
    step(wd, 200);
    check('K3 live: a DRY vent press is NEVER refused — the plain hot spit still lands (the empower law\'s dry clause)',
      ok && vd.life < ld, `press ${ok} life ${ld.toFixed(1)} → ${vd.life.toFixed(1)}`);
  }
  // THE PATIENT BANK: builds while STILL, bleeds while MOVING.
  {
    const wp = makeSimWorld('warrior', 0x5cb8);
    const pp = wp.player;
    const ip = makeSkillInstance(SKILLS.blowhole, 1);
    pp.skills[0] = ip;
    const b = pp.skillChargeBank(ip);
    const period = SKILLS.blowhole.useCharges!.recharge!;
    b.count = 0; b.timer = 0;
    step(wp, Math.ceil((period * 2 + 0.2) / DT));
    const built = b.count;
    check(`K4 live: THE PATIENT BANK BUILDS while the body stands (2 rounds over ${(period * 2).toFixed(0)}s of stillness)`,
      built === 2, `bank ${built} timer ${b.timer.toFixed(2)}`);
    // Now MOVE: the same clock bleeds it back down at `bleed`/s.
    const bleed = SKILLS.blowhole.useCharges!.still!.bleed;
    b.count = 4; b.timer = 0;
    const secs = 4;
    for (let i = 0; i < Math.ceil(secs / DT); i++) {
      pp.pos = vec(pp.pos.x + 0.4, pp.pos.y);
      pp.idleFor = 0;
      wp.update(DT);
    }
    check(`K5 live: MOTION BLEEDS it — ${(bleed * secs).toFixed(1)} rounds hiss away over ${secs}s of running`,
      near(b.count, 4 - bleed * secs, 0.05), `bank 4 → ${b.count.toFixed(2)}`);
  }
  // HEAD OF STEAM pours into the PATIENT banks only.
  {
    const wh = makeSimWorld('warrior', 0x5cb9);
    const ph = wh.player;
    ph.mana = 9999;
    const patient = makeSkillInstance(SKILLS.blowhole, 1);
    // A flask/gun-style bank standing beside it: NOT patient, so untouched.
    const other = SKILL_LIST.find(s => s.useCharges && !s.useCharges.still && !s.noDrop);
    const otherInst = other ? makeSkillInstance(other, 1) : null;
    ph.skills[0] = patient;
    if (otherInst) ph.skills[1] = otherInst;
    ph.skillChargeBank(patient).count = 0;
    const otherBefore = otherInst ? (() => { const b = ph.skillChargeBank(otherInst); b.count = 0; return b.count; })() : 0;
    const hos = makeSkillInstance(SKILLS.head_of_steam, 1);
    wh.useSkill(ph, hos, vec(ph.pos.x, ph.pos.y));
    step(wh, Math.ceil(3 / DT));
    if (ph.casting) ph.casting.held = false;
    step(wh, 10);
    const poured = ph.skillChargeBank(patient).count;
    const otherAfter = otherInst ? ph.skillChargeBank(otherInst).count : 0;
    check('K6 live: HEAD OF STEAM channels rounds into the PATIENT bank — and into nothing else (flasks and guns keep their own clocks)',
      poured > 0 && otherAfter === otherBefore,
      `patient 0 → ${poured}; ${other?.id ?? 'no other bank'} ${otherBefore} → ${otherAfter}`);
  }
  // PRESSURE SEAL stands a patient bank up on a host with none.
  {
    const ws = makeSimWorld('warrior', 0x5cba);
    const ps = ws.player;
    const host = makeSkillInstance(SKILLS.scalding_lash, 1);
    check('K7 live: a bare host banks NOTHING before the seal', instanceUseCharges(host) === undefined);
    host.sockets[0] = { def: SUPPORTS.pressure_seal, level: 1 };
    const uc = instanceUseCharges(host);
    check('K8 live: PRESSURE SEAL stands a bank up on the bankless host — and it is a PATIENT one (still + bleed ride the graft)',
      !!uc && uc.max > 0 && !!uc.still && uc.still.bleed > 0, JSON.stringify(uc));
    // The recovery sweep walks the BAR (a bank only lives where the skill is
    // equipped), so seat it before measuring the bleed.
    ps.skills[0] = host;
    const b = ps.skillChargeBank(host);
    b.count = 1; b.timer = 0;
    for (let i = 0; i < Math.ceil(2 / DT); i++) { ps.pos = vec(ps.pos.x + 0.4, ps.pos.y); ps.idleFor = 0; ws.update(DT); }
    check('K9 live: the GRANTED bank bleeds on the move exactly like a native patient one', b.count < 1, `1 → ${b.count.toFixed(2)}`);
  }
}

// ------------------------------------------- L) GEYSER-STEP, played (K2) --
{
  seedGlobalRandom(0x5cbb);
  const w = makeSimWorld('warrior', 0x5cbb);
  const p = w.player;
  p.mana = 9999;
  p.facing = 0;
  const banks0 = w.fog!.banks.length;
  const start = vec(p.pos.x, p.pos.y);
  w.useSkill(p, makeSkillInstance(SKILLS.vent_hop, 1), vec(p.pos.x + 300, p.pos.y));
  step(w, 40);
  const planted = w.fog!.banks.filter(b => b.def.id === 'steam' && b.mortal);
  check('L1 live: VENT HOP trails STEAM banks along the run (more than one — the corridor is a line, not a puff)',
    w.fog!.banks.length > banks0 + 1 && planted.length >= 2, `banks ${banks0} → ${w.fog!.banks.length}`);
  step(w, Math.ceil(3 / DT));
  const heart = planted[0]!;
  const A = vec(heart.pos.x - 170, heart.pos.y), B = vec(heart.pos.x + 170, heart.pos.y);
  check('L2 live: the trail OCCLUDES — the eye line across a trailed bank is blocked (the vapor ride) while a shot flies through',
    !w.lineOfSight(A, B) && castRay(w, A, B, 'shot') === null,
    `los ${w.lineOfSight(A, B)} occluders ${w.fog!.occluders}`);
  check('L3 live: the hop MOVED the body (a dash is a dash — the NO-LOCK floor)', d2(p.pos, start) > 150,
    `travelled ${d2(p.pos, start).toFixed(0)}`);
  // AFTERSPRAY: the DEPARTURE point erupts, and allies standing there are safe.
  {
    const wa = makeSimWorld('warrior', 0x5cbc);
    const pa = wa.player;
    pa.mana = 9999; pa.facing = 0;
    const from = vec(pa.pos.x, pa.pos.y);
    // OFF the dash's own corridor (width 56 — a body on the line is struck
    // by the ordinary travel damage, which would say nothing about the
    // departure splash) but inside the eruption's disc.
    const foeAtStart = dummy(wa, 'kettleback', vec(from.x, from.y + 58), 'enemy', m => m.sheet.setBase('evasion', 0));
    const allyAtStart = dummy(wa, 'kettleback', vec(from.x, from.y - 58), 'player');
    const l0 = foeAtStart.life, a0 = allyAtStart.life;
    const inst = makeSkillInstance(SKILLS.vent_hop, 1);
    inst.sockets[0] = { def: SUPPORTS.afterspray, level: 1 };
    wa.useSkill(pa, inst, vec(from.x + 320, from.y));
    step(wa, 60);
    check('L4 live: AFTERSPRAY erupts at the DEPARTURE point — the foe standing where you left is hit, the ALLY there is untouched (owner-safe: a player\'s spray is not terrain)',
      foeAtStart.life < l0 && near(allyAtStart.life, a0),
      `foe ${l0.toFixed(1)} → ${foeAtStart.life.toFixed(1)} ally ${a0.toFixed(1)} → ${allyAtStart.life.toFixed(1)}`);
    // Absent == identical: without the gem, the departure point is quiet.
    const wb = makeSimWorld('warrior', 0x5cbc);
    const pb2 = wb.player;
    pb2.mana = 9999; pb2.facing = 0;
    const foe2 = dummy(wb, 'kettleback', vec(pb2.pos.x, pb2.pos.y + 58), 'enemy', m => m.sheet.setBase('evasion', 0));
    const l2 = foe2.life;
    wb.useSkill(pb2, makeSkillInstance(SKILLS.vent_hop, 1), vec(pb2.pos.x + 320, pb2.pos.y));
    step(wb, 60);
    check('L5 live: ABSENT == IDENTICAL — with no Afterspray socketed, the departure point never erupts',
      near(foe2.life, l2), `${l2.toFixed(1)} → ${foe2.life.toFixed(1)}`);
  }
}

// ------------------------------------------------ M) STEAM, played (K2) --
{
  seedGlobalRandom(0x5cbd);
  const w = makeSimWorld('warrior', 0x5cbd);
  const p = w.player;
  p.mana = 9999;
  p.facing = 0;
  const at = vec(p.pos.x + 260, p.pos.y);
  w.useSkill(p, makeSkillInstance(SKILLS.vent_veil, 1), at);
  step(w, Math.ceil(3.4 / DT));
  const bank = w.fog!.banks.find(b => b.def.id === 'steam' && b.mortal && d2(b.pos, at) < 60);
  check('M1 live: VENT VEIL plants the STEAM bank AT THE AIM (a ground delivery plants where you point)', !!bank,
    bank ? `at ${bank.pos.x.toFixed(0)},${bank.pos.y.toFixed(0)} vs aim ${at.x.toFixed(0)},${at.y.toFixed(0)}` : 'no bank');
  if (bank) {
    const A = vec(at.x - 170, at.y), B = vec(at.x + 170, at.y);
    const C = vec(at.x - 170, at.y + 460), D = vec(at.x + 170, at.y + 460);
    check('M2 live: the veil STOPS EYES (lineOfSight false across it, the control line clear) and LETS SHOTS THROUGH',
      !w.lineOfSight(A, B) && w.lineOfSight(C, D) && castRay(w, A, B, 'shot') === null);
  }
  // VAPORIZE: a hit flashes a bank at the strike.
  {
    const wv = makeSimWorld('warrior', 0x5cbe);
    const pv = wv.player;
    pv.mana = 9999; pv.facing = 0;
    const inst = makeSkillInstance(SKILLS.scalding_lash, 1);
    inst.sockets[0] = { def: SUPPORTS.vaporize, level: 1 };
    const vv = dummy(wv, 'kettleback', vec(pv.pos.x + 70, pv.pos.y), 'enemy', m => m.sheet.setBase('evasion', 0));
    const before = wv.fog?.banks.length ?? 0;
    wv.useSkill(pv, inst, vec(vv.pos.x, vv.pos.y));
    step(wv, 50);
    check('M3 live: VAPORIZE flashes a steam bank where the blow landed (the proc\'s vent payload — area denial by sight)',
      (wv.fog?.banks.length ?? 0) > before, `banks ${before} → ${wv.fog?.banks.length}`);
    check('M4 data: the vent proc names a REGISTERED bank (the boot net\'s twin)', !!FOG_BANKS[(PROCS.vaporize.effect as { bank: string }).bank]);
  }
  check('M5 data: the player\'s veil is a DISTINCT art from the Cistern Crone\'s conjured cloud (different id AND different name — the book prints one art per name)',
    SKILLS.vent_veil.id !== SKILLS.steam_veil.id && SKILLS.vent_veil.name !== SKILLS.steam_veil.name
    && SKILLS.vent_veil.effects.some(e => e.type === 'vent'),
    `${SKILLS.vent_veil.name} vs ${SKILLS.steam_veil.name}`);
}

// ------------------------------------------------ N) PRISM, played (K2) --
{
  seedGlobalRandom(0x5cbf);
  const w = makeSimWorld('warrior', 0x5cbf);
  const p = w.player;
  p.mana = 9999;
  p.facing = 0;
  // A tunable body + a bystander on each side. THE SHELL STANDS DOWN for
  // the rig: the warden's shellGuard absorbs a light blow whole, and an
  // absorbed blow re-tunes nothing (the shell fabric's own standing
  // behavior — noted for the coordinator, not this pass's to change), so
  // the probe strips it to measure the ATTUNEMENT lane it is here for.
  const bareShell = (m: Actor): void => { m.sheet.setBase('evasion', 0); m.shellGuard = undefined; };
  const crystal = dummy(w, 'terrace_warden', vec(p.pos.x + 70, p.pos.y), 'enemy', bareShell);
  const foe = dummy(w, 'kettleback', vec(p.pos.x + 110, p.pos.y + 30), 'enemy');
  const ally = dummy(w, 'kettleback', vec(p.pos.x + 40, p.pos.y + 30), 'player');
  const inst = makeSkillInstance(SKILLS.scalding_lash, 1);
  inst.sockets[0] = { def: SUPPORTS.mineral_tuning, level: 1 };
  w.useSkill(p, inst, vec(crystal.pos.x, crystal.pos.y));
  step(w, 45);
  const tone = crystal.tone;
  check('N1 live: MINERAL TUNING\'s host re-tunes the crystalline body to the blow it landed (fire)', tone === 'fire', String(tone));
  const worn = (a: Actor): boolean => a.statuses.some(s => s.id === 'attuned_fire');
  check('N2 live: THE FAVORED PULSE — the wash lands on the striker\'s SIDE and SPARES the striker\'s enemies',
    worn(ally) && !worn(foe), `ally ${worn(ally)} foe ${worn(foe)}`);
  // Absent == identical: without the gem the crystal is neutral again.
  {
    const wn = makeSimWorld('warrior', 0x5cbf);
    const pn = wn.player;
    pn.mana = 9999; pn.facing = 0;
    const cn = dummy(wn, 'terrace_warden', vec(pn.pos.x + 70, pn.pos.y), 'enemy', bareShell);
    const fn = dummy(wn, 'kettleback', vec(pn.pos.x + 110, pn.pos.y + 30), 'enemy');
    wn.useSkill(pn, makeSkillInstance(SKILLS.scalding_lash, 1), vec(cn.pos.x, cn.pos.y));
    step(wn, 45);
    check('N3 live: ABSENT == IDENTICAL — an untuned striker\'s pulse still washes EVERYONE (the crystal takes no sides on its own)',
      fn.statuses.some(s => s.id === 'attuned_fire'));
  }
  // The vestige words.
  for (const id of SCALD_KIT_VESTIGES) {
    const v = VESTIGES[id];
    check(`N4 data: the mineral vestige '${id}' is registered with a weight, a glyph and a default line (it works in any slot)`,
      !!v && v.weight > 0 && !!v.glyph && (v.effects.default?.length ?? 0) > 0,
      v ? `${v.name}` : 'MISSING');
  }
  {
    const bad: string[] = [];
    for (const v of Object.values(VESTIGES)) {
      for (const lines of Object.values(v.effects)) {
        for (const l of lines ?? []) if (!STAT_DEFS[l.stat]) bad.push(`${v.id}:${l.stat}`);
      }
    }
    check('N5 data: every vestige line names a REGISTERED stat (the mineral register included)', bad.length === 0, bad.join(',') || 'all');
  }
  {
    const words = EPITAPH_LIST.filter(e => e.sequence.some(s => (SCALD_KIT_VESTIGES as readonly string[]).includes(s)));
    const resolves = words.every(e => e.sequence.every(s => !!VESTIGES[s])
      && e.effects.every(l => !!STAT_DEFS[l.stat]));
    check('N6 data: the basin\'s EPITAPHS spell real vestige sequences and grant registered stats',
      words.length >= 2 && resolves, words.map(e => e.name).join(', '));
    // The word is READ back by the one resolver the gear uses.
    const w0 = words[0]!;
    check('N7 live: epitaphFor READS a basin word off a common base with its sequence socketed (drawn == worn)',
      epitaphFor('common', w0.categories[0], w0.sequence)?.id === w0.id);
  }
}

// ------------------------------------- O) THE NO-LOCK CENSUS, K2's whole --
{
  // Every PLAYER piece must carry an effect that is not "apply scald" — the
  // charter's test made mechanical: would it earn a bar slot in the grove?
  for (const piece of SCALD_KIT_PLAYER_PIECES) {
    const s = SKILLS[piece.skill];
    const nonScald = !!s && (s.effects.some(e => e.type !== 'status' || e.status !== 'scalded')
      || ['leap', 'dash', 'blink', 'projectile', 'melee', 'nova', 'ground', 'storm'].includes(s.delivery.type));
    console.log(`CENSUS  no-lock: ${piece.skill} (${piece.family}) — ${nonScald ? 'has a non-scald effect (works anywhere)' : 'SCALD-ONLY (effect-locked!)'}`);
    check(`O1 no-lock: ${piece.skill} carries a non-scald effect (THE NO-LOCK LAW)`, nonScald);
  }
  // …and every player GEM's payload must read something other than the
  // scald status: a wet body (water is everywhere), a bank, a movement, a
  // fog bank, a tunable body.
  const gemPayloadReads: Record<string, (g: typeof SUPPORTS[string]) => boolean> = {
    // The rider is generic over the whole status registry and keys on WET —
    // rivers, rain fronts, shores and sewers all arm it.
    boiling_point: g => g.mods.some(m => m.stat.startsWith('applyWet_')),
    pressure_seal: g => !!g.useChargeGraft,
    afterspray: g => g.mods.some(m => m.stat === 'departSplash'),
    vaporize: g => g.mods.some(m => m.stat === 'proc_vaporize'),
    mineral_tuning: g => g.mods.some(m => m.stat === 'tuneFavor'),
  };
  for (const gem of SCALD_KIT_PLAYER_SUPPORTS) {
    const g = SUPPORTS[gem.support];
    const ok = !!g && !!gemPayloadReads[gem.support]?.(g);
    console.log(`CENSUS  no-lock: ${gem.support} (${gem.family}) — ${ok ? 'a country-blind payload (works anywhere)' : 'NO GENERIC PAYLOAD (effect-locked!)'}`);
    check(`O2 no-lock: the gem ${gem.support} grafts a payload no country gates`, ok);
  }
  // The structural half: nothing in the kit reads a tileset, a biome or a
  // zone id — an effect lock could only enter through one of those.
  {
    const src = readFileSync('src/data/skills.ts', 'utf8');
    const block = src.slice(src.indexOf('THE SCALD KIT K2 — THE PLAYER PIECES'), src.indexOf('M3 coda: THE METRONOME LEAN'));
    const leaks = ['tileset', 'biome', 'zoneId', 'zone.id'].filter(w => block.includes(w + ':'));
    check('O3 no-lock (structural): the K2 skill block names NO tileset, biome or zone — an effect lock has no door in',
      block.length > 1000 && leaks.length === 0, leaks.join(',') || 'clean');
  }
}

// ------------------------------------------------- P) ACQUISITION (§4) --
{
  // (a) THE GEM FLOOR — the country's own seam carries its gems FIRST.
  check('P1 data: the scald FLOOR names the country\'s faces and carries every K2 gem (skills + supports)',
    !!GEM_FLOORS.scald_kit
    && SCALD_KIT_FLOOR_TILESETS.every(t => !!TILESETS[t])
    && K2_SKILLS.every(id => (GEM_FLOORS.scald_kit.skills ?? []).includes(id))
    && K2_SUPPORTS.every(id => (GEM_FLOORS.scald_kit.supports ?? []).includes(id)),
    (GEM_FLOORS.scald_kit?.tilesets ?? []).join(','));
  check('P2 read: gemFloorFor resolves the floor on SCALD ground and is EMPTY everywhere else (absent == identical off the country)',
    gemFloorFor('geyser_fields').skills.has('boil_over') && gemFloorFor('sulphur_pools').supports.has('vaporize')
    && gemFloorFor('meadow').skills.size === 0 && gemFloorFor(undefined).skills.size === 0);
  check('P2b data: every floored tileset is a REAL tileset id (the cistern needs no row — it is an under-STORY of the sulphur_pools face and rides that floor)',
    SCALD_KIT_FLOOR_TILESETS.every(t => !!TILESETS[t]) && !TILESETS.cistern,
    SCALD_KIT_FLOOR_TILESETS.filter(t => !TILESETS[t]).join(',') || 'all real');
  // LIVE: on scald ground a fresh account finds the kit; off it, never.
  const floorFinds = (tileset: string): { kit: number; total: number } => {
    seedGlobalRandom(0x5cc0);
    const wx = makeSimWorld('warrior', 0x5cc0);
    const from = wx.zone.id;
    let zid = '';
    withSeededRandom(0x5cc1, () => { zid = wx.devMintTileset(tileset, 0.5, 12, { seed: 4242 }) ?? ''; });
    if (zid) withSeededRandom(0x5cc1, () => wx.loadZone(zid, from));
    const kitIds = new Set<string>([...K2_SKILLS, ...K2_SUPPORTS]);
    let kit = 0, total = 0;
    for (let i = 0; i < 400; i++) {
      wx.drops.length = 0;
      wx.dropGemAt(vec(wx.player.pos.x, wx.player.pos.y));
      for (const d of wx.drops) {
        const id = d.item.kind === 'skill' ? d.item.inst.def.id
          : d.item.kind === 'support' ? d.item.gem.def.id : '';
        if (!id) continue;
        total++;
        if (kitIds.has(id)) kit++;
      }
    }
    return { kit, total };
  };
  const onScald = floorFinds('geyser_fields');
  const offScald = floorFinds('meadow');
  check('P3 live: THE GEM FLOOR — on SCALD ground a fresh account (no unlock) finds the kit in the real drop mint; on ordinary ground it never does',
    onScald.kit > 0 && offScald.kit === 0,
    `scald ${onScald.kit}/${onScald.total} · meadow ${offScald.kit}/${offScald.total}`);
  // (b) THE LEDGER OPENS THE POOL.
  const row = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_scald');
  const supRow = UNLOCK_CATALOG.find(u => u.id === 'sup_scald');
  check('P4 data: the Vault carries a SCALD skill pool + a support pool, the gem row sequenced behind the skill row',
    !!row && row.kind === 'skill' && !!supRow && supRow.kind === 'support'
    && (supRow as { requiresUnlock?: string }).requiresUnlock === 'gem_skills_scald');
  check('P5 data: the pool row opens on ANY-OF the scald ledgers the M3 piles stamp (the gatework avenue group), and TEASES itself so the road is printed',
    !!row && ((row as { reqAnyOf?: readonly { ledger?: string }[] }).reqAnyOf ?? []).map(r => r.ledger).sort().join(',')
      === [...SCALD_KIT_UNLOCK_LEDGERS].sort().join(',')
    && (row as { tease?: boolean }).tease === true);
  check('P6 data: the pool carries EVERY K2 skill and EVERY K2 gem — nothing minted this round is unreachable',
    !!row && K2_SKILLS.every(id => (row as { payload: { skillIds: string[] } }).payload.skillIds.includes(id))
    && (row as { payload: { skillIds: string[] } }).payload.skillIds.includes('geyser_step')
    && !!supRow && K2_SUPPORTS.every(id => (supRow as { payload: { supportIds: string[] } }).payload.supportIds.includes(id)));
  {
    const w = makeSimWorld('warrior', 0x5cc2);
    const acc = w.account;
    check('P7 live: on a FRESH account the whole kit is out of the account-wide pool (found in the country, not yet owned)',
      !K2_SKILLS.some(id => isSkillUnlockedForDrop(acc, id))
      && !K2_SUPPORTS.some(id => isSupportUnlockedForDrop(acc, id))
      && !isSkillUnlockedForDrop(acc, 'geyser_step'));
    check('P8 live: the row is SEALED (not yet visible-and-buyable) before any scald ledger stands', !isUnlockVisible(acc, row!));
    // ONE of the three roads is enough (the any-of law) — the cistern's.
    acc.ledger.cistern_entered = 1;
    check('P9 live: the cistern\'s descent alone OPENS the row (any-of: whichever road the player crossed first)',
      isUnlockVisible(acc, row!));
    acc.credits = 99999;
    const bought = applyUnlock(acc, row!) && applyUnlock(acc, supRow!);
    check('P10 live: buying the pool carries the WHOLE kit into the account-wide pool — every K2 gem now drops and vends ANYWHERE (the no-lock law\'s other half)',
      bought && K2_SKILLS.every(id => isSkillUnlockedForDrop(acc, id))
      && isSkillUnlockedForDrop(acc, 'geyser_step')
      && K2_SUPPORTS.every(id => isSupportUnlockedForDrop(acc, id)));
    // (c) THE VENDOR RUNG follows for free: the shelf reads the same pool.
    // (The counter rolls at its own BRACKET — vendorGemLevel — so the rig
    // stands it at a depth the kit's own minDropLevels clear.)
    w.zone.level = 12;
    const odds = w.commissionOdds({ kind: 'skill', id: 'boil_over' });
    check('P11 live: THE COUNTER sees it too — the standing order\'s odds for a scald gem are non-zero once the pool is open (the shelf reads the same pool the mint does)',
      odds > 0, `odds ${odds.toFixed(4)}`);
    // …and geyser_step's K1 dev-only gate is now THIS unlock.
    check('P12 live: GEYSER-STEP is no longer dev-only — the same row that opened the kit opened the spike (K1\'s owed acquisition, paid)',
      isSkillUnlockedForDrop(acc, 'geyser_step') && !SKILLS.geyser_step.noDrop);
  }
  // THE POOL-ORPHAN NET's own promise, checked from this side: nothing K2
  // minted is droppable-but-unpooled.
  {
    const pooled = new Set<string>();
    const pooledSup = new Set<string>();
    for (const u of UNLOCK_CATALOG) {
      if (u.kind === 'skill' || u.kind === 'class') for (const id of u.payload.skillIds) pooled.add(id);
      if (u.kind === 'support' || u.kind === 'class') for (const id of u.payload.supportIds) pooledSup.add(id);
    }
    check('P13 census: every K2 gem sits in a pool row (no new pool orphans — the catalog debt does not grow)',
      [...K2_SKILLS, 'geyser_step'].every(id => pooled.has(id)) && K2_SUPPORTS.every(id => pooledSup.has(id)));
  }
}

// ------------------------------------------- Q) THE DISPLAY-NAME CENSUS --
{
  // K1's owed collision, paid: the PLAYER's ground nova keeps "Kettle
  // Burst"; the kettleback's verb and the drummer's payoff took one word
  // each. The census then stands guard over the whole book — a NEW pair
  // sharing a display name is a defect, and the LEGACY pairs are named
  // here with their whys (the excluded-probe idiom: a debt with a name,
  // never a silenced test).
  const NAME_DEBT: Record<string, string> = {
    'transfixing gaze': 'gaze_beam is the monster kit-piece of the player art transfixing_gaze — a deliberate mirror (2026-08-21, pre-K2)',
    'the clutch splits': 'egg_hatch_spiders / egg_hatch_chitin — two broods, one flavor line (2026-08-21, pre-K2)',
    'the clutch hatches': 'egg_hatch_formics / brood_clutch_hatch — same (2026-08-21, pre-K2)',
    reap: 'harvester_command is the minion order of the player art reap — a deliberate mirror (2026-08-21, pre-K2)',
    trisect: 'trisect_finisher is the last STEP of trisect\'s own chain, not a second art (2026-08-21, pre-K2)',
  };
  const byName = new Map<string, string[]>();
  for (const s of Object.values(SKILLS)) {
    const k = s.name.toLowerCase();
    byName.set(k, [...(byName.get(k) ?? []), s.id]);
  }
  const collisions = [...byName.entries()].filter(([, ids]) => ids.length > 1);
  const fresh = collisions.filter(([n]) => !NAME_DEBT[n]);
  for (const [n, ids] of collisions) {
    console.log(`CENSUS  name: "${n}" — ${ids.join(', ')}${NAME_DEBT[n] ? ` (known: ${NAME_DEBT[n]})` : ' ← NEW'}`);
  }
  check('Q1 census: no NEW display-name collision in the skill book (the known legacy pairs are named with their whys above)',
    fresh.length === 0, fresh.map(([n, ids]) => `${n}: ${ids.join('/')}`).join('; ') || 'clean');
  check('Q2 census: K1\'s owed collision is PAID — the player\'s Kettle Burst stands alone, the kettleback and the drummer renamed',
    SKILLS.kettle_burst.name === 'Kettle Burst' && !SKILLS.kettle_burst.noDrop
    && SKILLS.kettleback_burst?.name === 'Shell Burst' && SKILLS.tempo_vent_burst.name === 'Tattoo Burst',
    `${SKILLS.kettle_burst?.name} / ${SKILLS.kettleback_burst?.name} / ${SKILLS.tempo_vent_burst?.name}`);
  check('Q3 nets: the renamed verb is still WORN — the kettleback casts kettleback_burst and its brain rule names it (no dangling id)',
    (MONSTERS.kettleback.skills ?? []).includes('kettleback_burst')
    && JSON.stringify(MONSTERS.kettleback.brain ?? {}).includes('kettleback_burst')
    && !JSON.stringify(MONSTERS.kettleback).includes('\'kettle_burst\'')
    && !(MONSTERS.kettleback.skills ?? []).includes('kettle_burst'));
  // The gems' own names must not collide either.
  {
    const sup = new Map<string, string[]>();
    for (const g of Object.values(SUPPORTS)) {
      const k = g.name.toLowerCase();
      sup.set(k, [...(sup.get(k) ?? []), g.id]);
    }
    const dupes = [...sup.entries()].filter(([, ids]) => ids.length > 1)
      .filter(([n]) => n !== 'commanding presence'); // legacy pair (pre-K2)
    check('Q4 census: no NEW display-name collision on the gem shelf', dupes.length === 0,
      dupes.map(([n, ids]) => `${n}: ${ids.join('/')}`).join('; ') || 'clean');
  }
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
