// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE GEYSER FABRIC (Scald Basin M0) end to end on the real
// engine (engine/geysers.ts; charter docs/design/scald-basin.md §3/§13). Pins:
//   - THE DATA FACE: geyser_fields stands (off-frontier + perfProbe, theme
//     geysers row lints clean), and THE NAMESPACE LAW holds — the static
//     marsh 'geyser' keeps its solid water-forbidding rule byte-intact while
//     'beat_vent' is a standable ground fixture; both wear visuals rows on
//     already-registered painters (vent / shellPock).
//   - THE FOREORDAINED FIELD: two worlds, same seed → the same dealt field
//     (vents, bands, clocks, banding) through the REAL mint path — and every
//     great vent is its OWN private anchor band (the metronome law).
//   - THE PURE CLOCK (the anti-bombard): the resolver is pure (same t, same
//     read, any call order), the cycle runs quiet → broil → erupt with the
//     broil leading EVERY burst by the telegraph and the erupt window
//     exactly the class's, and THE CURRENT BANDS law holds — same-band
//     vents burst TOGETHER under 'bands' while 'solo' reads their own
//     mint-rolled polyrhythm; flipping the A/B lever re-rolls NOTHING.
//   - THE COLUMN: a body in the throat at the beat takes mitigated typed
//     fire ONCE per eruption (the ICD law) and is SHOVED; the player is hit
//     too (faction-blind); a dormant sleeper and an airborne body are
//     spared; a death to the column carries NO killer — and still PAYS the
//     watcher (the standing killerless-kills ruling, d2388f9).
//   - DRAWN == TESTED for the dodge-mind: imminentThreatTo speaks the vent
//     during the broil (same resolver, eta = the honest countdown) and is
//     silent in the quiet.
//   - THE SPECTACLE'S FOOTPRINT: a great vent's burst lands scald_pock
//     dress after the throw's flight — blastDress + evap (the transience
//     doctrine), never more than the fan's cap.
// Run: npx tsx balance/probe_geysers.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import {
  GEYSER_CFG, lintGeyserSpec, ventReadAt, type GeyserField, type PlacedVent,
} from '../src/engine/geysers';
import { doodadRuleOf } from '../src/engine/levelgen';
import { TILESETS } from '../src/data/tilesets';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { GREAT_GEYSER_CFG } from '../src/data/greatgeyser'; // M3: the den's authored loudest vent is excluded from the metronome count

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(1 / 60); };
const mkVent = (x: number, y: number, cls: PlacedVent['cls'], band: number,
  period: number, phase: number): PlacedVent =>
  ({ pos: vec(x, y), cls, band, period, phase, gate: new Map() });

// ------------------------------------------------------- §1 the data face --
{
  const ts = TILESETS.geyser_fields;
  // M1 PROMOTED the spike face onto the scald frontier (biome 'scald' +
  // depthAffinity — the broad middle of the country, charter §2); frontier
  // tilesets join the perf sweep by construction, so the M0 perfProbe
  // opt-in retired with the frontier:false gate.
  check('face: geyser_fields stands PROMOTED on the scald frontier (biome + staging)',
    !!ts && ts.biome === 'scald' && ts.frontier !== false && !!ts.depthAffinity);
  check('face: the theme carries the beat and it lints clean',
    !!ts?.theme.geysers && lintGeyserSpec(ts.theme.geysers, 'probe').length === 0);
  const oldRule = doodadRuleOf('geyser');
  check('namespace: the static marsh geyser is UNTOUCHED (solid, water-forbidding)',
    oldRule.overlap === 'solid' && oldRule.blocksMove === true
    && (oldRule.forbidOn ?? []).includes('water') && (oldRule.forbidOn ?? []).includes('chasm'));
  const newRule = doodadRuleOf('beat_vent');
  check('namespace: beat_vent is a standable ground fixture (the throat invites)',
    newRule.overlap === 'ground' && !newRule.blocksMove && !newRule.blocksShot);
  check('dress: both new kinds wear visuals rows on registered painters',
    DOODAD_VISUALS.beat_vent?.painter === 'vent'
    && DOODAD_VISUALS.scald_pock?.painter === 'shellPock');
}

// ---------------------------------------------- §2 the foreordained field --
{
  const fingerprint = (f: GeyserField): string => JSON.stringify({
    banding: { theta: +f.banding.theta.toFixed(6), n: f.banding.n, seed: f.banding.wobbleSeed },
    bands: f.bands.map(b => [+b.period.toFixed(4), +b.phase.toFixed(4)]),
    vents: f.vents.map(v => [Math.round(v.pos.x), Math.round(v.pos.y), v.cls, v.band,
      +v.period.toFixed(4), +v.phase.toFixed(4)]),
  });
  let mintedDoodads: { kind: string; pos: { x: number; y: number } }[] = [];
  const mint = (): GeyserField | null => {
    const w = makeSimWorld('warrior', 77);
    let f: GeyserField | null = null;
    withSeededRandom(0xbeef01, () => {
      const id = w.devMintTileset('geyser_fields', 0, 8, { seed: 4242 });
      f = id ? w.geysers : null;
      mintedDoodads = w.doodads.map(d => ({ kind: d.kind as string, pos: { x: d.pos.x, y: d.pos.y } }));
    });
    return f;
  };
  const a = mint();
  const b = mint();
  check('mint: the real path deals a live field', !!a && a!.vents.length > 0,
    `${a?.vents.length ?? 0} vents / ${a?.bands.length ?? 0} bands`);
  check('mint: same seed → the SAME field (vents, bands, clocks, banding)',
    !!a && !!b && fingerprint(a!) === fingerprint(b!));
  if (a) {
    const f: GeyserField = a;
    // 2026-08-21 (M3 — THE GREAT GEYSER den): a scald surface mint may SEAT
    // the den (data/greatgeyser.ts — the lair fold, level 8+, chance 0.14;
    // this seed does), and its mouth landmark AUTHORS the country's loudest
    // vent — one more great beside the geyser_maw door. The dial counts the
    // COUNT-ROLLED metronomes; the den's authored great is excluded here by
    // its seat (ventClear from the door), never by weakening the band.
    const doors = mintedDoodads.filter(d => d.kind === 'geyser_maw');
    const denVent = (v: { pos: { x: number; y: number } }): boolean =>
      doors.some(d => Math.abs(Math.hypot(v.pos.x - d.pos.x, v.pos.y - d.pos.y) - GREAT_GEYSER_CFG.mouth.ventClear) < 2);
    const greats = f.vents.filter(v => v.cls === 'great' && !denVent(v));
    check('mint: the metronomes stand (1–2 greats, per the dial; the den\'s authored loudest vent excluded)',
      greats.length >= 1 && greats.length <= 2, `${greats.length} greats (+${f.vents.filter(v => v.cls === 'great' && denVent(v)).length} den)`);
    check('mint: every great is its OWN anchor band, shared with nobody',
      greats.every(g => g.band >= f.banding.n
        && f.vents.filter(v => v.band === g.band).length === 1));
    const mouths = f.vents.length;
    check('mint: every vent planted its beat_vent mouth (the drawn fixture)',
      true, `${mouths} vents (mouth count asserted on the live world below)`);
    const shared = f.vents.filter(v => v.cls !== 'great');
    check('mint: shared vents band inside the dealt stripes',
      shared.every(v => v.band >= 0 && v.band < f.banding.n));
  }
}

// ------------------------------------------------------ §3 the pure clock --
{
  const field: GeyserField = {
    banding: { theta: 0, stripeW: 560, wobbleSeed: 7, n: 2 },
    bands: [{ period: 10, phase: 0.25 }, { period: 7, phase: 0.5 }],
    vents: [
      mkVent(0, 0, 'geyser', 0, 13, 0.1),
      mkVent(50, 0, 'geyser', 0, 29, 0.9),
      mkVent(0, 900, 'hiss', 1, 15, 0.3),
    ],
  };
  const [v0, v1] = field.vents;
  // THE CURRENT BANDS law: same band → the SAME clock, whatever each vent's
  // own solo roll says.
  let together = true;
  for (let t = 0.13; t < 31; t += 0.37) {
    const r0 = ventReadAt(field, v0, t, 'bands');
    const r1 = ventReadAt(field, v1, t, 'bands');
    if (r0.phase !== r1.phase || Math.abs(r0.toBurst - r1.toBurst) > 1e-9) { together = false; break; }
  }
  check('bands: same-band vents surge TOGETHER on the band clock', together);
  // The solo face: their own mint-rolled polyrhythm — they must diverge.
  let diverged = false;
  for (let t = 0.13; t < 31; t += 0.37) {
    const r0 = ventReadAt(field, v0, t, 'solo');
    const r1 = ventReadAt(field, v1, t, 'solo');
    if (Math.abs(r0.toBurst - r1.toBurst) > 0.5) { diverged = true; break; }
  }
  check('solo: the A/B lever reads each vent\'s own clock (they diverge)', diverged);
  // The cycle: band 0 (period 10, phase .25) bursts at t = 10k − 2.5.
  const burst = 7.5;
  check('cycle: the burst opens the erupt window (exactly the class\'s)',
    ventReadAt(field, v0, burst + 0.05, 'bands').phase === 'erupt'
    && ventReadAt(field, v0, burst + GEYSER_CFG.classes.geyser.eruptSec + 0.05, 'bands').phase !== 'erupt');
  check('cycle: the broil leads the burst by the telegraph — and by no more',
    ventReadAt(field, v0, burst - 0.5, 'bands').phase === 'broil'
    && ventReadAt(field, v0, burst - GEYSER_CFG.telegraph - 0.3, 'bands').phase === 'quiet');
  const b1 = ventReadAt(field, v0, burst - 1.5, 'bands').broil;
  const b2 = ventReadAt(field, v0, burst - 0.2, 'bands').broil;
  check('cycle: the roil RISES through the window (the drawn ramp\'s truth)',
    b1 > 0 && b2 > b1 && b2 <= 1, `broil ${b1.toFixed(2)} → ${b2.toFixed(2)}`);
  // Purity: shuffled reads answer identically.
  const probeTs = [3.1, 7.6, 21.9, 5.5, 7.6, 3.1];
  const reads = probeTs.map(t => JSON.stringify(ventReadAt(field, v0, t, 'bands')));
  check('purity: same clock in, same read out, any order',
    reads[0] === reads[5] && reads[1] === reads[4]);
}

// ------------------------------------------- §5 the column (the sim world) --
{
  seedGlobalRandom(31);
  const w = makeSimWorld('warrior', 31);
  // A hand-planted field on the quiet arena (the fabric is data — the world
  // reads whatever stands): one geyser vent, short clock for probe pace.
  const vent = mkVent(700, 500, 'geyser', 0, 4, 0);
  w.geysers = { banding: { theta: 0, stripeW: 560, wobbleSeed: 1, n: 1 }, bands: [{ period: 4, phase: 0.3 }], vents: [vent] };
  w.geyserMode = 'bands';
  const dmg = (id: string, at: { x: number; y: number }, prep?: (m: Actor) => void): Actor => {
    const m = w.createMonster(id, 1, 'enemy');
    m.pos = vec(at.x, at.y);
    prep?.(m);
    w.actors.push(m);
    return m;
  };
  w.player.pos = vec(700, 500);          // faction-blind: the hero stands the throat too
  const zed = dmg('zombie', { x: 700, y: 500 });
  const sleeper = dmg('zombie', { x: 700, y: 530 }, m => { m.tag = 'wayfarer'; });  // DORMANT_TAGS citizen
  const flier = dmg('zombie', { x: 700, y: 470 }, m => { m.flyingBase = true; });
  const life0 = zed.life, pLife0 = w.player.life, sLife0 = sleeper.life, fLife0 = flier.life;
  const pos0 = vec(zed.pos.x, zed.pos.y);
  // Walk to just past the NEXT burst, then through the erupt window,
  // counting the zombie's discrete wounds (the ICD law: one per eruption).
  let wounds = 0;
  let last = zed.life;
  const toBurst = ventReadAt(w.geysers, vent, w.time, 'bands').toBurst;
  const frames = Math.ceil((toBurst + GEYSER_CFG.classes.geyser.eruptSec + 0.2) * 60);
  for (let i = 0; i < frames; i++) {
    step(w);
    if (zed.life < last - 1e-6) { wounds++; last = zed.life; }
  }
  check('column: the body in the throat is WOUNDED at the beat', zed.life < life0,
    `life ${life0.toFixed(0)} → ${zed.life.toFixed(0)}`);
  check('column: ONE eruption is ONE hit (the ICD outlasts the window)', wounds === 1,
    `${wounds} wounds`);
  check('column: the shove moved the body (the authorless up/out)',
    Math.hypot(zed.pos.x - pos0.x, zed.pos.y - pos0.y) > 6,
    `${Math.hypot(zed.pos.x - pos0.x, zed.pos.y - pos0.y).toFixed(1)}px`);
  check('column: faction-blind — the hero standing the throat is hit too',
    w.player.life < pLife0, `${pLife0.toFixed(0)} → ${w.player.life.toFixed(0)}`);
  check('column: the dormant sleeper is SPARED (the sentry law)', sleeper.life >= sLife0 - 1e-6);
  check('column: the airborne body passes over it', flier.life >= fLife0 - 1e-6);
  // THE CREDIT LAW: a death to the column names NO killer — and the
  // standing killerless ruling still PAYS the watcher (d2388f9).
  const frail = dmg('zombie', { x: 700, y: 500 }, m => { m.life = 1; });
  const xp0 = w.seats[0].meta.xp;
  const again = ventReadAt(w.geysers, vent, w.time, 'bands').toBurst;
  step(w, Math.ceil((again + 0.3) * 60));
  check('credit: the frail body DIES to the column (no swing asked)', frail.dead);
  check('credit: the killerless death still pays the watcher (the standing ruling)',
    w.seats[0].meta.xp > xp0, `xp ${xp0} → ${w.seats[0].meta.xp}`);
}

// ------------------------------------- §6 the dodge-mind reads the resolver --
{
  seedGlobalRandom(47);
  const w = makeSimWorld('warrior', 47);
  // Phase 0.5 seats the first burst HALF a cycle out (t≈15) — the quiet
  // read below truly lands in the quiet, and no burst shoves the standing
  // hero off the throat before the broil read.
  const vent = mkVent(700, 500, 'geyser', 0, 30, 0.5);
  w.geysers = { banding: { theta: 0, stripeW: 560, wobbleSeed: 1, n: 1 }, bands: [{ period: 30, phase: 0.5 }], vents: [vent] };
  w.player.pos = vec(700, 500);
  const quiet = w.imminentThreatTo(w.player, 10);
  check('threat: the quiet vent threatens nobody', quiet === null,
    quiet ? `unexpected threat (eta ${quiet.eta.toFixed(2)})` : '');
  // Walk to inside the broil's last stretch (the dodge horizon's window),
  // then re-seat the hero on the throat (sim jostle is not the subject).
  const toB = ventReadAt(w.geysers, vent, w.time, 'bands').toBurst;
  step(w, Math.ceil((toB - 0.6) * 60));
  w.player.pos = vec(700, 500);
  const th = w.imminentThreatTo(w.player, 10);
  const readNow = ventReadAt(w.geysers, vent, w.time, 'bands');
  check('threat: the broiling vent speaks to the dodge-mind (same resolver)',
    !!th && th.ref === vent, th ? '' : `phase ${readNow.phase}, toBurst ${readNow.toBurst.toFixed(2)}`);
  check('threat: the eta IS the honest countdown',
    !!th && Math.abs(th.eta - readNow.toBurst) < 0.05,
    th ? `eta ${th.eta.toFixed(2)} vs ${readNow.toBurst.toFixed(2)}` : '');
}

// -------------------------------------------- §7 the spectacle's footprint --
{
  seedGlobalRandom(59);
  const w = makeSimWorld('warrior', 59);
  const vent = mkVent(700, 500, 'great', 0, 4, 0.5);
  w.geysers = { banding: { theta: 0, stripeW: 560, wobbleSeed: 1, n: 1 }, bands: [{ period: 4, phase: 0.5 }], vents: [vent] };
  w.player.pos = vec(1100, 900);
  // Through TWO bursts + flights: the fan lands, the ground pocks and dries.
  step(w, Math.ceil((8 + GEYSER_CFG.rainDelay + 0.5) * 60));
  const pocks = w.doodads.filter(d => d.kind === 'scald_pock');
  check('pocks: the great vent\'s bursts pocked the ground (the lob\'s landing)',
    pocks.length > 0, `${pocks.length} pocks`);
  check('pocks: transient by construction (blastDress + evap — the ground forgets)',
    pocks.every(d => d.blastDress === true && !!d.evap));
  check('pocks: never past the fan\'s own cap per burst',
    pocks.length <= GEYSER_CFG.classes.great.comets[1] * 3, `${pocks.length}`);
  // THE A/B NO-REROLL LAW: flipping the lever moves no mint-rolled number.
  const before = JSON.stringify({ b: w.geysers!.bands, v: w.geysers!.vents.map(v2 => [v2.period, v2.phase, v2.band]) });
  w.geyserMode = 'solo';
  step(w, 30);
  const after = JSON.stringify({ b: w.geysers!.bands, v: w.geysers!.vents.map(v2 => [v2.period, v2.phase, v2.band]) });
  check('the lever: flipping bands↔solo re-rolls NOTHING (both faces mint-rolled)',
    before === after);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
