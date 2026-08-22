// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SURGE HOUR → THE STEAM-WISP TIDE cascade + THE
// METRONOME-LEAN KIN (Scald Basin M3 coda; charter docs/design/scald-basin.md
// §0 seventh walk — her cascade shape, §3, §8, §8b, §13 M3) on the real
// engine (engine/geysers.ts GEYSER_CFG.surge; engine/lite.ts LiteCond.surge +
// LiteSwarmRow.seat; data/combos.ts). Pins:
//   - THE LONG CLOCK IS PURE: windows are f(world clock, zone key) — spaced,
//     dwell honored, `near` vs `held` as specified; two worlds minting the
//     same seed read the SAME surge state at the same clock, and a "resume"
//     (a fresh world set to the clock) agrees read-for-read with one that
//     stepped there.
//   - THE ALIGNED TIDE quickens the read inside the window: more bursts than
//     an equal quiet stretch, shared-band vents struck TOGETHER on the
//     zone-wide beat, the great every Nth beat, EVERY burst led by a full
//     broil, NO column cut short — and outside the window (before, and after
//     the hand-back) the read is the base clock BYTE-IDENTICAL; burstAt is
//     monotone across the whole scan (the burst-edge key).
//   - THE BURST EDGE (live): no phantom bursts across a join/leave hand-off —
//     the world's burst-fx count equals the read's erupt entries; a great
//     vent's tide burst rains MORE (countMul = rainMul), a base burst ×1.
//   - UNANNOUNCED: the fabric + the kit import no omen/bulletin/marker
//     surface, and the surge's open floats no text naming itself.
//   - THE WISP POUR: pockets seat AT the vents (heart == a vent mouth, no
//     burrow), pour nothing out of hour, rise while the surge holds, recede
//     after with `poured` cleared and rise AGAIN the next surge (never
//     exterminated by its own clock); the steam front pins only while held.
//   - THE METRONOME KIN: the drummer closes its grammar on the 4th stamp
//     (consume-span honest: the first firing is cast #4), its pips are the
//     honest measure (the tell climbs 0.25/0.5/0.75 and falls back after the
//     firing), validateTells is clean, THE NO-TAG LAW holds (it commits).
//   - ABSENT == IDENTICAL: a key-less field never surges (reads the M0
//     formula exactly), a non-scald zone reads null, and a radiance-only lite
//     cond reads exactly as radianceCondHeld.
// Run: npx tsx balance/probe_surge.ts
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { Rng, withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import {
  anchorVent, fieldSurgePeriod, GEYSER_CFG, nextSurgeAfter, rollGeyserField, seatVent, surgeWindowNear,
  surgeWindowOf, ventReadAt, type GeyserField, type PlacedVent, type VentRead,
} from '../src/engine/geysers';
import { TELL_SOURCES, validateTells } from '../src/engine/tells';
import { updateAI } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';
import { COMBO_RULES } from '../src/data/combos';
import { SKILLS } from '../src/data/skills';
import { LOOKS } from '../src/data/looks';
import { TILESETS } from '../src/data/tilesets';
import { WEATHER_DEFS } from '../src/world/weather';
import { WEATHER_FX } from '../src/render/vis/weatherFx';
import { PART_PAINTERS } from '../src/render/vis/parts';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const step = (w: World, sec: number): void => { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) w.update(1 / 60); };
const S = GEYSER_CFG.surge;

// ------------------------------------------------------ §1 the long clock --
{
  const key = 0x1234abcd;
  const wins = [0, 1, 2, 3, 4, 5].map(c => surgeWindowOf(key, c));
  let ordered = true, dwell = true, spaced = true;
  for (let i = 0; i < wins.length; i++) {
    if (Math.abs((wins[i].t1 - wins[i].t0) - S.dwell) > 1e-9) dwell = false;
    if (i > 0) {
      if (wins[i].t0 <= wins[i - 1].t1) ordered = false;
      if (wins[i].t0 - wins[i - 1].t1 < 30) spaced = false;
    }
  }
  check('clock: windows are ordered, dwell-long, and spaced past any spill', ordered && dwell && spaced,
    wins.map(w => `[${w.t0.toFixed(0)},${w.t1.toFixed(0)}]`).join(' '));
  const w2 = wins[2];
  const mid = surgeWindowNear(key, (w2.t0 + w2.t1) / 2);
  check('clock: the window NEAR a mid-window clock is that window, and it HOLDS',
    !!mid && mid.c === 2 && (w2.t0 + w2.t1) / 2 < mid.t1);
  const spill = surgeWindowNear(key, w2.t1 + 1);
  check('clock: just past the close the window is still NEAR (the spill) but no longer HELD',
    !!spill && spill.c === 2 && w2.t1 + 1 >= spill.t1);
  check('clock: well past the close nothing is near', surgeWindowNear(key, w2.t1 + 60) === null);
  check('clock: nextSurgeAfter a spent window is the next ordinal',
    nextSurgeAfter(key, w2.t1 + 1).c === 3 && nextSurgeAfter(key, w2.t0 - 1).c === 2);
  // Purity across keys: a different key deals a different phase (not a shared hour).
  check('clock: the zone key phases the long clock (two zones, two hours)',
    Math.abs(surgeWindowOf(key, 0).t0 - surgeWindowOf(key ^ 0x55aa, 0).t0) > 1);
}

// ------------------------------------- §2 the tide quickens, then restores --
{
  // A deterministic field: two shared bands, five shared vents, one great anchor.
  const build = (withKey: boolean): GeyserField => {
    const rng = new Rng(0x77ee11);
    const f = rollGeyserField(rng, { bands: [2, 2] }, withKey ? 0x00c0ffee : undefined);
    // Shared seats straddle the two stripes (bandIndexAt is position-keyed).
    const seats: [number, number, PlacedVent['cls']][] = [
      [100, 100, 'geyser'], [160, 120, 'hiss'], [900, 900, 'geyser'], [960, 880, 'hiss'], [1600, 300, 'geyser'],
    ];
    for (const [x, y, cls] of seats) seatVent(f, rng, vec(x, y), cls);
    anchorVent(f, rng, vec(500, 1500), 'great');
    return f;
  };
  const f = build(true);
  const base = build(false);
  check('field: the tide period derives from the dealt bands (mean × periodMul, floored)',
    Math.abs(fieldSurgePeriod(f) - Math.max(S.minPeriod, (f.bands[0].period + f.bands[1].period) / 2 * S.periodMul)) < 1e-9
    && f.surgeKey !== undefined && base.surgeKey === undefined);
  const win = surgeWindowOf(f.surgeKey!, 0);
  const dt = 0.02;
  type Burst = { at: number; k: number };
  const scan = (field: GeyserField, v: PlacedVent, from: number, to: number, mode: 'bands' | 'solo' = 'bands'): {
    bursts: Burst[]; broiledAll: boolean; noCut: boolean; burstAtMono: boolean;
  } => {
    const bursts: Burst[] = [];
    let broiledAll = true, noCut = true, burstAtMono = true;
    let prev: VentRead | null = null, broilRun = 0, eruptRun = 0, lastBurstAt = -Infinity;
    const cls = GEYSER_CFG.classes[v.cls];
    for (let t = from; t <= to; t += dt) {
      const r = ventReadAt(field, v, t, mode);
      if (r.phase === 'erupt') {
        if (r.burstAt < lastBurstAt - 1e-6) burstAtMono = false;
        lastBurstAt = Math.max(lastBurstAt, r.burstAt);
        if (!prev || prev.phase !== 'erupt') {
          bursts.push({ at: t, k: r.k });
          // The broil that led here must have run (nearly) the whole telegraph.
          if (prev && broilRun < GEYSER_CFG.telegraph - 3 * dt) broiledAll = false;
          eruptRun = 0;
        }
        eruptRun += dt;
      } else if (prev && prev.phase === 'erupt') {
        if (eruptRun < cls.eruptSec - 3 * dt) noCut = false;
      }
      broilRun = r.phase === 'broil' ? broilRun + dt : 0;
      prev = r;
    }
    return { bursts, broiledAll, noCut, burstAtMono };
  };
  const from = win.t0 - S.dwell, to = win.t1 + 60;
  const shared = f.vents.filter(v => v.cls !== 'great');
  const great = f.vents.find(v => v.cls === 'great')!;
  let quickened = true, broiledAll = true, noCut = true, mono = true, kUnique = true;
  const inWin: Burst[][] = [];
  for (const v of f.vents) {
    const r = scan(f, v, from, to);
    const before = r.bursts.filter(b => b.at >= from && b.at < win.t0).length;
    const inside = r.bursts.filter(b => b.at >= win.t0 && b.at < win.t1);
    if (inside.length <= before) quickened = false;
    if (!r.broiledAll) broiledAll = false;
    if (!r.noCut) noCut = false;
    if (!r.burstAtMono) mono = false;
    const ks = new Set(inside.map(b => b.k));
    if (ks.size !== inside.length) kUnique = false;
    inWin.push(inside);
  }
  check('tide: every vent bursts MORE inside the window than in an equal quiet stretch', quickened);
  check('tide: EVERY burst is led by a full broil (the telegraph never shortened, join + hand-off included)', broiledAll);
  check('tide: no column is ever cut short', noCut);
  check('tide: burstAt is monotone across the whole scan (the burst-edge key)', mono);
  check('tide: tide-beat ordinals are unique per burst', kUnique);
  // Alignment: after both have joined, the shared vents in DIFFERENT bands
  // burst together on the zone-wide beat.
  const a = f.vents.indexOf(shared.find(v => v.band === 0)!), b = f.vents.indexOf(shared.find(v => v.band === 1)!);
  const joined = Math.max(inWin[a][0]?.at ?? Infinity, inWin[b][0]?.at ?? Infinity);
  const aLate = inWin[a].filter(x => x.at >= joined), bLate = inWin[b].filter(x => x.at >= joined);
  const together = aLate.length > 0 && aLate.every(x => bLate.some(y => Math.abs(y.at - x.at) <= 2 * dt));
  check('tide: shared vents of DIFFERENT bands strike TOGETHER on the aligned beat', together,
    `band0 ${aLate.length} beats, band1 ${bLate.length} beats after both joined`);
  const gi = f.vents.indexOf(great);
  check('tide: the great strikes every Nth aligned beat (the metronome under the tide)',
    inWin[gi].length >= 1 && inWin[gi].length <= Math.ceil(aLate.length / S.greatEvery) + 1
    && inWin[gi].every(x => aLate.some(y => Math.abs(y.at - x.at) <= 2 * dt) || x.at < joined),
    `great ${inWin[gi].length} vs shared ${aLate.length}`);
  // Restore: before the open and after the hand-back the read IS the base clock.
  let restored = true, beforeSame = true;
  for (const v of f.vents) {
    const bv = base.vents[f.vents.indexOf(v)];
    for (let t = win.t1 + 8; t < to; t += 0.37) {
      if (JSON.stringify(ventReadAt(f, v, t, 'bands')) !== JSON.stringify(ventReadAt(base, bv, t, 'bands'))) { restored = false; break; }
    }
    for (let t = from; t < win.t0; t += 0.37) {
      if (JSON.stringify(ventReadAt(f, v, t, 'bands')) !== JSON.stringify(ventReadAt(base, bv, t, 'bands'))) { beforeSame = false; break; }
    }
  }
  check('restore: after the hand-back the read is the base clock BYTE-IDENTICAL', restored);
  check('restore: before the open the read is the base clock BYTE-IDENTICAL', beforeSame);
  // Solo mode rides the same tide.
  const rs = scan(f, shared[0], win.t0, win.t1, 'solo');
  check('tide: the A/B solo face rides the same aligned schedule', rs.bursts.length >= 2 && rs.broiledAll);
}

// ----------------------------------------- §3 two worlds + a resume agree --
{
  const mint = (time: number): { w: World; field: GeyserField } => {
    const w = makeSimWorld('warrior', 77);
    w.time = time;
    let f: GeyserField | null = null;
    withSeededRandom(0xbeef02, () => {
      const id = w.devMintTileset('geyser_fields', 0, 8, { seed: 4242 });
      f = id ? w.geysers : null;
    });
    return { w, field: f! };
  };
  const A = mint(0), B = mint(0);
  check('mint: both worlds deal the same surge key + tide period',
    !!A.field && !!B.field && A.field.surgeKey === B.field.surgeKey && A.field.surgePeriod === B.field.surgePeriod
    && A.field.surgeKey !== undefined);
  const win = nextSurgeAfter(A.field.surgeKey!, 0);
  // A steps into the window; B is "resumed" straight onto the same clock.
  A.w.time = win.t0 - 2;
  step(A.w, 10);
  B.w.time = A.w.time;
  const sa = A.w.geyserSurge(), sb = B.w.geyserSurge();
  check('purity: the stepped world and the resumed world agree the hour HOLDS',
    !!sa && !!sb && sa.held && sb.held && sa.t0 === sb.t0 && sa.t1 === sb.t1);
  let same = true;
  for (let i = 0; i < A.field.vents.length; i++) {
    const ra = ventReadAt(A.field, A.field.vents[i], A.w.time, 'bands');
    const rb = ventReadAt(B.field, B.field.vents[i], B.w.time, 'bands');
    if (JSON.stringify(ra) !== JSON.stringify(rb)) { same = false; break; }
  }
  check('purity: every vent reads identically on both (the tide is a pure function of the clock)', same);
}

// ------------------------------- §4 the burst edge + the rain (live world) --
{
  const w = makeSimWorld('warrior', 0x5a5a);
  const W = w as unknown as {
    time: number; player: Actor; actors: Actor[]; geysers: GeyserField | null;
    geyserBurstFx(v: PlacedVent, vi: number, k: number, surge?: boolean): void;
    burnRain(v: PlacedVent, vi: number, k: number, countMul?: number): void;
    devMintTileset(id: string, spread: number, level: number, opts?: unknown): string | null;
  };
  W.player.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  W.player.life = 99999;
  withSeededRandom(0xbeef03, () => { W.devMintTileset('geyser_fields', 0, 8, { seed: 4242 }); });
  const f = W.geysers!;
  // Park the hero out of every column and clear the field of kin (quiet ground).
  W.player.pos.x = 40; W.player.pos.y = 40;
  for (const a of W.actors) if (a !== W.player) a.dead = true;
  // The spy records each fired edge's burst CLOCK TIME (the vent's lastBurstAt
  // was just stamped from VentRead.burstAt) — an exact key both sides share.
  const fxAt: number[] = []; const rainMuls: number[] = [];
  const origFx = W.geyserBurstFx;
  W.geyserBurstFx = function (this: unknown, v: PlacedVent, vi: number, k: number, surge?: boolean) {
    fxAt.push(v.lastBurstAt ?? -1);
    return origFx.call(this, v, vi, k, surge);
  };
  const origRain = W.burnRain;
  W.burnRain = function (this: unknown, v: PlacedVent, vi: number, k: number, countMul?: number) {
    rainMuls.push(countMul ?? 1);
    return origRain.call(this, v, vi, k, countMul);
  };
  // A base stretch first (the spy is warm), then the forced tide, then the release.
  step(w, 0.1);
  // The read's bursts whose clock time falls inside [from, to] (the scan is
  // primed a second early so a straddling column is never mis-counted).
  const burstsIn = (from: number, to: number): number[] => {
    const out: number[] = [];
    for (const v of f.vents) {
      let prevErupt = false;
      for (let t = from - 1; t <= to + 1; t += 1 / 60) {
        const r = ventReadAt(f, v, t, 'bands');
        if (r.phase === 'erupt' && !prevErupt && r.burstAt >= from && r.burstAt <= to) out.push(r.burstAt);
        prevErupt = r.phase === 'erupt';
      }
    }
    return out.sort((a, b) => a - b);
  };
  const firedIn = (from: number, to: number): number[] => fxAt.filter(a => a >= from && a <= to).sort((a, b) => a - b);
  const sameSets = (a: number[], b: number[]): boolean => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-6);
  const guard = 0.3;
  const t0 = W.time;
  step(w, 30);
  const baseRead = burstsIn(t0 + guard, W.time - guard), baseFired = firedIn(t0 + guard, W.time - guard);
  check('edge: on the base clock every burst the read shows fired once, and nothing else fired',
    sameSets(baseRead, baseFired) && baseRead.length > 0, `${baseFired.length} fx vs ${baseRead.length} erupts`);
  w.geyserSurgeForce(true);
  const t1 = W.time;
  rainMuls.length = 0;
  step(w, S.lead + fieldSurgePeriod(f) * S.greatEvery * 2 + 4);
  const tideRead = burstsIn(t1 + guard, W.time - guard), tideFired = firedIn(t1 + guard, W.time - guard);
  check('edge: across the JOIN hand-off the fired set still equals the read\'s bursts (no phantom, none missed)',
    sameSets(tideRead, tideFired) && tideRead.length > 0, `${tideFired.length} fx vs ${tideRead.length} erupts`);
  check('rain: a great vent\'s tide burst rains MORE (countMul = rainMul)',
    rainMuls.length > 0 && rainMuls.every(m => Math.abs(m - S.rainMul) < 1e-9), `muls ${rainMuls.join(',')}`);
  const s = w.geyserSurge();
  check('force: the dev lever reads as a held, forced window', !!s && s.held && s.forced);
  w.geyserSurgeForce(false);
  const t2 = W.time;
  rainMuls.length = 0;
  step(w, 40);
  const backRead = burstsIn(t2 + guard, W.time - guard), backFired = firedIn(t2 + guard, W.time - guard);
  check('edge: across the RELEASE hand-back the sets still agree (no phantom burst at the jump)',
    sameSets(backRead, backFired), `${backFired.length} fx vs ${backRead.length} erupts`);
  check('rain: base bursts rain ×1 again', rainMuls.every(m => m === 1));
}

// ----------------------------------------------------- §5 unannounced --
{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = (p: string): string => fs.readFileSync(path.join(here, '..', 'src', p), 'utf8');
  const fabric = src('engine/geysers.ts') + src('render/vis/geyserLayer.ts') + src('data/scald.ts');
  check('unannounced: the fabric + the kit import no omen/bulletin/marker/sounding surface',
    !/from ['"][^'"]*omens['"]/.test(fabric)
    && !/from ['"][^'"]*bulletins['"]/.test(fabric)
    && !/from ['"][^'"]*mapMarkers['"]/.test(fabric)
    && !/registerOmenSource|postBulletin|registerMarkerSource|requestSoundings/.test(fabric));
  const w = makeSimWorld('warrior', 0x7e57);
  const W = w as unknown as {
    time: number; player: Actor; actors: Actor[]; texts: { text: string }[];
    devMintTileset(id: string, spread: number, level: number, opts?: unknown): string | null;
  };
  W.player.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  W.player.life = 99999;
  withSeededRandom(0xbeef04, () => { W.devMintTileset('geyser_fields', 0, 8, { seed: 4242 }); });
  for (const a of W.actors) if (a !== W.player) a.dead = true;
  W.player.pos.x = 40; W.player.pos.y = 40;
  step(w, 0.5);
  const before = W.texts.length;
  w.geyserSurgeForce(true);
  step(w, 4);
  const floated = W.texts.slice(before).map(t => t.text.toLowerCase());
  check('unannounced: the surge\'s open floats NO text naming itself (no floater — the broils quicken, that is all)',
    !floated.some(t => /surge|tide|steam|wisp|vent/.test(t)), floated.length ? floated.slice(0, 3).join(' | ') : 'nothing floated');
  w.geyserSurgeForce(false);
}

// ------------------------------------------- §6 the wisp pour (live) --
{
  const w = makeSimWorld('warrior', 0x71de4);
  const W = w as unknown as {
    time: number; player: Actor; actors: Actor[]; geysers: GeyserField | null;
    litePockets: { live: number; extinct: boolean; poured: boolean; x: number; y: number; kindIdx: number }[];
    liteBurrows: unknown[];
    lite: { liveCount: number };
    devMintTileset(id: string, spread: number, level: number, opts?: unknown): string | null;
    skyFront(): { kind: string } | null;
  };
  W.player.sheet.setSource('probe', [{ stat: 'life', kind: 'flat', value: 99999 }]);
  W.player.life = 99999;
  withSeededRandom(0xbeef05, () => { W.devMintTileset('geyser_fields', 0, 8, { seed: 4242 }); });
  const f = W.geysers!;
  const s0 = w.geyserSurge()!;
  check('boot: the surge is quiet at the zone\'s open (the test starts in the calm)', !!s0 && !s0.held);
  const ts = TILESETS.geyser_fields;
  const row = ts.theme.lite?.swarms.find(r => r.monsterId === 'steam_wisp');
  check('data: the face carries a vent-seated, surge-keyed steam_wisp row',
    !!row && row.seat === 'vents' && row.when?.surge === true && !row.announce);
  const pockets = W.litePockets;
  check('seat: pockets SEAT at boot (the conditioned pour\'s law) and pour nothing out of hour',
    pockets.length > 0 && W.lite.liveCount === 0 && pockets.every(p => !p.poured),
    `${pockets.length} pockets, ${W.lite.liveCount} bodies`);
  check('seat: every pocket heart IS a vent mouth (drawn == seated)',
    pockets.every(p => f.vents.some(v => Math.abs(v.pos.x - p.x) < 1e-6 && Math.abs(v.pos.y - p.y) < 1e-6)));
  check('seat: vent pockets wear no burrow (the vent is the mark)',
    pockets.every((_, i) => !W.liteBurrows[i]));
  // Park the hero far from every heart (the calm gate must not confound).
  let fx = 40, fy = 40, best = -1;
  for (const c of [[40, 40], [w.arena.w - 40, 40], [40, w.arena.h - 40], [w.arena.w - 40, w.arena.h - 40]]) {
    const d = Math.min(...pockets.map(p => Math.hypot(p.x - c[0], p.y - c[1])));
    if (d > best) { best = d; fx = c[0]; fy = c[1]; }
  }
  W.player.pos.x = fx; W.player.pos.y = fy;
  for (const a of W.actors) if (a !== W.player) a.dead = true;
  // Into the window: the tide rises at the vents.
  const win = nextSurgeAfter(f.surgeKey!, W.time);
  W.time = win.t0 + 2;
  step(w, 8);
  const risen = W.lite.liveCount;
  check('pour: the tide RISES at the vents while the surge holds', risen > 0 && w.geyserSurge()!.held, `${risen} wisps after 8s`);
  W.time = win.t0 + 30;
  step(w, 0.2);
  check('sky: the surge steam front pins over the open-sky field while held',
    W.skyFront()?.kind === 'scald_surge_steam', `sky ${W.skyFront()?.kind ?? 'clear'}`);
  check('data: the surge steam row is event-only with the mist\'s look and a dress row',
    WEATHER_DEFS.scald_surge_steam?.eventOnly === true && !!WEATHER_FX.scald_surge_steam
    && (WEATHER_DEFS.scald_surge_steam?.dress?.rows.length ?? 0) > 0);
  // Past the close: the tide recedes, and no pocket reads exterminated.
  const peak = W.lite.liveCount;
  W.time = win.t1 + 2;
  step(w, 12);
  const after = W.lite.liveCount;
  check('recede: after the window the tide recedes (the hour is weather, not violence)', after < peak, `${peak} → ${after}`);
  let guard = 0;
  while (W.lite.liveCount > 0 && guard++ < 40) step(w, 2);
  check('recede: fully reclaimed pockets clear `poured` and never read extinct',
    W.lite.liveCount === 0 && pockets.every(p => !p.poured && !p.extinct), `${W.lite.liveCount} left after ${guard} × 2s`);
  check('sky: the steam front lifts with the window', W.skyFront()?.kind !== 'scald_surge_steam');
  // The next surge: the SAME seats rise again.
  const win2 = nextSurgeAfter(f.surgeKey!, W.time);
  W.time = win2.t0 + 2;
  step(w, 8);
  check('pour: the next surge raises the tide again from the SAME seats (no extermination)',
    W.lite.liveCount > 0 && pockets.every(p => !p.extinct), `${W.lite.liveCount} wisps`);
  // The lite cond reads both faces.
  check('cond: `surge: true` holds now and `surge: false` does not',
    w.liteCondHeld({ surge: true }) && !w.liteCondHeld({ surge: false }));
}

// -------------------------------------------- §7 the metronome kin (live) --
{
  for (const id of ['steam_wisp', 'tempo_drummer', 'clock_crab']) {
    const d = MONSTERS[id];
    check(`kin: ${id} stands with a look + every kit skill real and ai-hinted`,
      !!d && !!LOOKS[d.look ?? ''] && d.skills.every(s => !!SKILLS[s] && !!SKILLS[s].ai));
  }
  check('kin: the wisp opts into the lite tier with the faintest scald', !!MONSTERS.steam_wisp.lite?.contact
    && MONSTERS.steam_wisp.lite!.contact!.damage <= 2 && MONSTERS.steam_wisp.plies?.count === 1);
  check('grammar: the two rules exist, repeat-shaped, payoffs cast at self',
    COMBO_RULES.kettle_tattoo?.repeat?.n === 4 && COMBO_RULES.tick_snap?.repeat?.n === 3
    && COMBO_RULES.kettle_tattoo.effect.type === 'cast' && COMBO_RULES.tick_snap.effect.type === 'cast');
  check('grammar: the kin wear their grammar by MonsterDef.mods (the cadenced-kin law)',
    MONSTERS.tempo_drummer.mods!.some(m => m.stat === 'combo_kettle_tattoo')
    && MONSTERS.clock_crab.mods!.some(m => m.stat === 'combo_tick_snap'));
  check('tells: the `combo` source is registered and the kin\'s rows validate clean',
    !!TELL_SOURCES.combo
    && validateTells({ tempo_drummer: MONSTERS.tempo_drummer, clock_crab: MONSTERS.clock_crab }, PART_PAINTERS).length === 0);
  check('no-tag: both kin carry no kite tempo (commit on the beat)',
    !MONSTERS.tempo_drummer.brain?.tempo && !MONSTERS.clock_crab.brain?.tempo);
  // Live: the drummer vs an immortal hero (the AI is caller-driven in the
  // sim — stepAI; the quiet floor woken with a 'clear' objective).
  const w = makeSimWorld('warrior', 0xd7a1);
  w.zone.objective = { kind: 'clear' };
  const W = w as unknown as {
    time: number; player: Actor; actors: Actor[];
    createMonster(id: string, level: number, team: string): Actor;
  };
  const p = W.player;
  p.invulnerable = true;
  p.pos = vec(1100, 900);
  const drummer = W.createMonster('tempo_drummer', 6, 'enemy');
  drummer.pos = vec(p.pos.x + 160, p.pos.y);
  drummer.facing = Math.PI;
  W.actors.push(drummer);
  const seen = new Set<number>();
  let fell = false, firstFireSeq = -1, peak = 0;
  for (let i = 0; i < 60 * 16; i++) {
    for (const a of W.actors) updateAI(a, w, 1 / 60);
    w.update(1 / 60);
    const v = drummer.tells?.[0] ?? 0;
    seen.add(v);
    if (v > 0.5) peak = Math.max(peak, v);
    if (peak >= 0.75 && v === 0) fell = true;
    const fire = drummer.comboFire?.get('kettle_tattoo');
    if (fire && firstFireSeq < 0) firstFireSeq = fire.seq;
  }
  check('drummer: it closes the tattoo on the FOURTH stamp (consume-span honest)', firstFireSeq === 4,
    `first firing at cast #${firstFireSeq} (castSeq ${drummer.castSeq})`);
  check('drummer: the pips are the honest measure — the tell climbs through 0.25/0.5/0.75 and falls back after the burst',
    seen.has(0.25) && seen.has(0.5) && seen.has(0.75) && fell, `seen ${[...seen].sort().join(',')}`);
  check('drummer: it commits (closes to melee, no hover)', Math.hypot(drummer.pos.x - p.pos.x, drummer.pos.y - p.pos.y) < 120,
    `dist ${Math.hypot(drummer.pos.x - p.pos.x, drummer.pos.y - p.pos.y).toFixed(0)}`);
}

// ------------------------------------------------ §8 absent == identical --
{
  // A key-less hand-built field reads the M0 formula exactly, forever.
  const field: GeyserField = {
    banding: { theta: 0, stripeW: 560, wobbleSeed: 7, n: 2 },
    bands: [{ period: 10, phase: 0.25 }, { period: 7, phase: 0.5 }],
    vents: [{ pos: vec(0, 0), cls: 'geyser', band: 0, period: 13, phase: 0.1, gate: new Map() }],
  };
  const v = field.vents[0];
  let identical = true;
  for (let t = 0; t < 5000; t += 3.7) {
    const r = ventReadAt(field, v, t, 'bands');
    const p = 10, local = ((t + 0.25 * p) % p + p) % p, toBurst = p - local;
    const cls = GEYSER_CFG.classes.geyser;
    const tele = Math.min(GEYSER_CFG.telegraph, Math.max(0, p - cls.eruptSec) * 0.8);
    const phase = local < cls.eruptSec ? 'erupt' : toBurst <= tele ? 'broil' : 'quiet';
    if (r.phase !== phase || r.surge || Math.abs(r.toBurst - toBurst) > 1e-9) { identical = false; break; }
  }
  check('absent: a key-less field never surges — the M0 read, byte-for-byte, over hours of clock', identical);
  const w = makeSimWorld('warrior', 0x0a0a);
  check('absent: a zone with no geyser field reads no surge', w.geyserSurge() === null);
  const cond = { phases: ['night' as const] };
  let same = true;
  for (const t of [0, 60, 120, 180, 230]) {
    w.time = t;
    if (w.liteCondHeld(cond) !== w.radianceCondHeld(cond)) same = false;
  }
  check('absent: a radiance-only lite cond reads exactly as radianceCondHeld (the grove\'s tides untouched)', same);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
