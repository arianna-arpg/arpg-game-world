// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE TELL FABRIC end to end on the real engine
// (docs/engine/tells.md): the registry weave (every shipped tell row names
// a live source, bands its unbounded reads, and wears a painter that
// exists; every hunger-driven predator wears the family lean — the
// completeness census), the pure resolver laws (band mapping + inversion,
// curve shaping, the quantize/wire grid, unknown-source zero, the open
// registry incl. exact-id overrides), DRAWN == TESTED for every shipped
// source against hand-built state, the live sweep on the real world
// (values off the same maps the AI reads, rev bumps only on true change),
// THE NO-CHURN LAW (identity-stable dress + part instances across quiet
// frames), the ACCUMULATOR END TO END (mire_leech feeds → the sac fills →
// the burst pays and the drive empties → the sac drains: the tell leads
// the mechanic and never lies), TEMPERAMENT TELLS (the rolled mind wears
// its roll; the baseline roll wears nothing), the co-op wire round trip
// (derived scalars + the variant index through the REAL serialize/apply
// path), the portrait's sane default, and the read-only law (sources
// never write).
// Run: npx tsx balance/probe_tells.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { HUNGER_LEAN, MONSTERS, SPENT_SLUMP, SPENT_SLUMP_BUFF } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { LOOKS } from '../src/data/looks';
import { STATUS_DEFS } from '../src/engine/status';
import { PART_PAINTERS } from '../src/render/vis/parts';
import {
  materializeTellDress, registerTellSource, resolveTell, TELL_CFG, tellDressOf,
  tellPortraitDress, tellSpecsOf, validateTells,
  type TellBody, type TellSpec, type TellWorld,
} from '../src/engine/tells';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { setSimTap } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x7e11);

const DT = 1 / 60;
// World ticks with every BRAIN frozen — the sweep alone (drives never
// drift, nothing casts; updateTells still runs). The e2e rig runs the
// HOST frame loop verbatim inline (AI per actor, then the world tick).
const tick = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) w.update(DT);
};
const spawn = (w: ReturnType<typeof makeSimWorld>, id: string, lvl = 5,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};

// The feeding post: a big, still, unarmed body on the player team.
MONSTERS.probe_tells_dummy = {
  id: 'probe_tells_dummy', name: 'Probe Dummy', color: '#8899aa', shape: 'circle',
  radius: 13, base: { life: 6000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: [], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};
// The stoking post: a tough claw that FEEDS an onHurt meter with real hits.
MONSTERS.probe_tells_biter = {
  id: 'probe_tells_biter', name: 'Probe Biter', color: '#aa8899', shape: 'circle',
  radius: 12, base: { life: 6000, moveSpeed: 150, accuracy: 200, mana: 0 },
  skills: ['claw'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

// Hand-built state for the pure rigs (TellBody is structural by design).
const body = (over?: Partial<TellBody>): TellBody => ({
  id: 7, life: 80, maxLife: () => 100, plies: 0, pliesMax: 0,
  drives: new Map<string, number>(), charges: new Map<string, number>(),
  statuses: [], buffs: new Map(), aggroed: false, aiMoraleUntil: 0,
  ...over,
});
const W: TellWorld = { time: 5, radiance: () => 0.4 };
const row = (source: string, over?: Partial<TellSpec>): TellSpec =>
  ({ source, channel: { kind: 'glow' }, ...over });

// --- 0) Registry weave -------------------------------------------------------
{
  const faults = validateTells(MONSTERS, PART_PAINTERS);
  check('weave: every shipped tell row validates (sources live, bands on unbounded reads, painters exist)',
    faults.length === 0, faults.slice(0, 3).join(' | '));
  check('weave: the fillSac gauge-limb is a registered painter', !!PART_PAINTERS.fillSac);
  check('weave: the mire leech stands (def + look, back bare for the tell sac)',
    !!MONSTERS.mire_leech && !!LOOKS.mire_leech
    && LOOKS.mire_leech.parts.every(p => !!PART_PAINTERS[p.kind])
    && !LOOKS.mire_leech.parts.some(p => p.kind === 'fillSac'));
  const leech = MONSTERS.mire_leech;
  check('weave: the leech sac reads the SAME meter its burst rule reads (drive:glut)',
    leech.tells?.[0]?.source === 'drive:glut'
    && leech.brain?.rules?.[0]?.when.drive?.id === 'glut'
    && (leech.brain?.rules?.[0]?.when.drive?.above ?? 0) >= 0.9
    && leech.brain?.drives?.glut?.onDealt !== undefined);
  check('weave: the burst is reserved OUT of the ordinary rotation (priority kit = claw)',
    leech.brain?.skillUse?.mode === 'priority'
    && !leech.brain?.skillUse?.order?.includes('sanguine_burst')
    && leech.skills.includes('sanguine_burst'));
  check('weave: the burst beat both casts AND empties the bank (cast + drive shove)',
    leech.brain?.rules?.[0]?.actions?.some(a => a.do === 'cast' && a.skill === 'sanguine_burst') === true
    && leech.brain?.rules?.[0]?.actions?.some(a => a.do === 'drive' && a.id === 'glut' && a.add <= -1) === true);
  // THE FAMILY CENSUS: every hunger-driven mind wears the hunger lean —
  // a future predator that hungers without telling gets named here.
  const bare: string[] = [];
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    const hungers = !!def.brain?.drives?.hunger
      || def.brainVariants?.some(v => !!v.brain.drives?.hunger);
    if (!hungers) continue;
    const told = def.tells?.some(t => t.source === 'drive:hunger')
      || def.brainVariants?.some(v => v.tells?.some(t => t.source === 'drive:hunger'));
    if (!told) bare.push(id);
  }
  check('weave: every hunger-driven predator wears the family lean (census)',
    bare.length === 0, bare.join(','));
  // Wave eleven joins the census from the sea floor: the vent crab is the
  // DEEP's first hunger-driven hunter, and it wears the ONE shared row
  // (identity, never a copy — the family lean stays one law).
  check('weave: the deep\'s first hunger-driven hunter wears the shared lean (vent_crab, wave eleven)',
    !!MONSTERS.vent_crab?.brain?.drives?.hunger
    && MONSTERS.vent_crab?.tells === HUNGER_LEAN);

  // WAVE TWELVE (the succession ladders): every new hunter joins by
  // IDENTITY — the ONE shared row, never a copy (the census above already
  // names any future shirker; this pin names the wave's five by hand).
  check('weave: the wave-twelve hunters wear the ONE shared lean by identity',
    (['steppe_harrier', 'dust_lion', 'crag_lynx', 'peak_roc', 'dripstone_weaver'] as const)
      .every(id => !!MONSTERS[id]?.brain?.drives?.hunger && MONSTERS[id]?.tells === HUNGER_LEAN));
  check('weave: HUNGER_LEAN is the one shared row (band spans the hunt thresholds)',
    HUNGER_LEAN.length === 1 && HUNGER_LEAN[0].source === 'drive:hunger'
    && HUNGER_LEAN[0].channel.kind === 'lean'
    && (HUNGER_LEAN[0].band?.[0] ?? 1) < 0.5 && (HUNGER_LEAN[0].band?.[1] ?? 0) > 0.6);
  check('weave: the temperament debuts carry variant tells (skitterer loner+tide, flayer both)',
    (MONSTERS.sand_skitterer.brainVariants?.filter(v => v.tells?.length).length ?? 0) === 2
    && (MONSTERS.abyssal_flayer.brainVariants?.filter(v => v.tells?.length).length ?? 0) === 2);
}

// --- 1) The pure resolver laws -------------------------------------------------
{
  const b = body({ drives: new Map([['hunger', 0.7]]) });
  check('resolve: an un-banded 0..1 source passes through quantized',
    resolveTell(row('drive:hunger'), b, W) === 0.75, // 0.7 → 6/8 = 0.75 on the 8-step grid
    String(resolveTell(row('drive:hunger'), b, W)));
  check('resolve: band maps the input window onto 0..1',
    resolveTell(row('drive:hunger', { band: [0.45, 0.95] }), b, W) === 0.5);
  const fused = body({ fuse: 1.2 });
  check('resolve: an inverted band reads a countdown (fuse [3,0] → rises as it burns)',
    resolveTell(row('fuse', { band: [3, 0] }), fused, W) === 0.625);
  const ramp = (curve?: TellSpec['curve']): number =>
    resolveTell(row('drive:hunger', { curve, steps: 1000 }), body({ drives: new Map([['hunger', 0.3]]) }), W);
  check('resolve: curves shape the read (early ≥ linear ≥ late at 0.3)',
    ramp('early') > ramp() && ramp() > ramp('late') && Math.abs(ramp() - 0.3) < 0.002);
  const outs = new Set<number>();
  for (let i = 0; i <= 200; i++) {
    outs.add(resolveTell(row('drive:hunger'), body({ drives: new Map([['hunger', i / 200]]) }), W));
  }
  check('resolve: THE QUANTIZE LAW — a full ramp lands on ≤ steps+1 values (the churn guard)',
    outs.size <= TELL_CFG.steps + 1, `distinct ${outs.size}`);
  check('resolve: every value sits on the 3-decimal WIRE grid',
    [...outs].every(v => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-9));
  check('resolve: steps:1 is a clean binary threshold',
    resolveTell(row('drive:hunger', { steps: 1 }), body({ drives: new Map([['hunger', 0.4]]) }), W) === 0
    && resolveTell(row('drive:hunger', { steps: 1 }), body({ drives: new Map([['hunger', 0.6]]) }), W) === 1);
  check('resolve: an unknown source resolves 0 (a package tell may ship ahead of its source)',
    resolveTell(row('nonesuch:thing'), b, W) === 0);
  registerTellSource('probe_flat', () => 0.5);
  registerTellSource('drive:probe_exact', () => 1);
  check('resolve: the registry is open (custom source) and exact ids beat the prefix lane',
    resolveTell(row('probe_flat'), b, W) === 0.5
    && resolveTell(row('drive:probe_exact'), b, W) === 1);
}

// --- 2) Drawn == tested: every shipped source against known state ---------------
{
  check('source life: reads the live fraction off the SAME maxLife the bars read',
    resolveTell(row('life'), body(), W) === 0.75); // 80/100 → 0.8 → grid 0.75? no: 0.8*8=6.4→6/8
  // (0.8 quantizes to 6/8 = 0.75 on the default grid — the assertion above
  // is the quantized truth; the raw read is exercised at steps:1000 below.)
  check('source life: raw fraction is exact at fine steps',
    resolveTell(row('life', { steps: 1000 }), body(), W) === 0.8);
  check('source plies: spent fraction (3 of 4 eaten → 0.75)',
    resolveTell(row('plies'), body({ plies: 1, pliesMax: 4 }), W) === 0.75);
  check('source charge: raw count under the author band ([0,5], 3 banked → 0.625 on the grid)',
    resolveTell(row('charge:fury', { band: [0, 5] }), body({ charges: new Map([['fury', 3]]) }), W) === 0.625);
  check('source status: stacks over the registry cap (poison 4/8 → 0.5)',
    STATUS_DEFS.poison.maxStacks === 8
    && resolveTell(row('status:poison'), body({ statuses: [{ id: 'poison', stacks: 4 }] }), W) === 0.5);
  check('source status: a non-stacker reads presence',
    resolveTell(row('status:unhorsed'), body({ statuses: [{ id: 'unhorsed', stacks: 1 }] }), W) === 1);
  check('source alert: the noticed step-tell',
    resolveTell(row('alert'), body({ aggroed: true }), W) === 1
    && resolveTell(row('alert'), body(), W) === 0);
  check('source morale: routing right now (the break window)',
    resolveTell(row('morale'), body({ aiMoraleUntil: 7 }), W) === 1
    && resolveTell(row('morale'), body({ aiMoraleUntil: 3 }), W) === 0);
  check('source stored: the banked reservoir under its band',
    resolveTell(row('stored', { band: [0, 200] }), body({ stored: 100 }), W) === 0.5);
  check('source ground: standing on the named kind',
    resolveTell(row('ground:mud'), body({ groundKind: 'mud' }), W) === 1
    && resolveTell(row('ground:mud'), body({ groundKind: 'grass' }), W) === 0);
  check('source radiance: the sky\'s light through the world view',
    resolveTell(row('radiance'), body(), W) === 0.375); // 0.4 → 3.2 → 3/8
  check('source always: the identity-marker lane', resolveTell(row('always'), body(), W) === 1);
}

// --- 3) The read-only law: sources never write ----------------------------------
{
  const b = body({
    drives: new Map([['hunger', 0.5]]), charges: new Map([['fury', 2]]),
    statuses: [{ id: 'poison', stacks: 3 }], fuse: 2, stored: 50, groundKind: 'mud',
  });
  const before = JSON.stringify({
    life: b.life, drives: [...b.drives], charges: [...b.charges],
    statuses: b.statuses, aggroed: b.aggroed, fuse: b.fuse, stored: b.stored,
  });
  for (const src of ['always', 'life', 'plies', 'drive:hunger', 'charge:fury',
    'status:poison', 'alert', 'morale', 'fuse', 'stored', 'radiance', 'ground:mud']) {
    resolveTell(row(src, { band: src === 'charge:fury' ? [0, 5] : src === 'fuse' ? [3, 0] : src === 'stored' ? [0, 200] : undefined }), b, W);
  }
  const after = JSON.stringify({
    life: b.life, drives: [...b.drives], charges: [...b.charges],
    statuses: b.statuses, aggroed: b.aggroed, fuse: b.fuse, stored: b.stored,
  });
  check('law: every shipped source is a pure read (state byte-identical after the sweep)',
    before === after);
}

// --- 4) The dress materializer: channels, identity, no churn ---------------------
{
  const specs: TellSpec[] = [
    { source: 'drive:glut', channel: { kind: 'part', part: { kind: 'fillSac', x: -0.5, color: '#c8536a' }, scale: [0.7, 1.15], alpha: [0.6, 1], count: [2, 6], color: ['#404040', '#e05050'] } },
    { source: 'always', channel: { kind: 'tint', color: '#4a3a26', max: 0.5 } },
    { source: 'alert', channel: { kind: 'glow', color: '#ff0000' } },
    { source: 'drive:glut', channel: { kind: 'scale', amp: 0.5 } }, // asks past the clamp
    { source: 'alert', channel: { kind: 'lean', amp: 0.9 } },
    { source: 'morale', channel: { kind: 'alpha', min: 0.4 } },
    { source: 'drive:glut', channel: { kind: 'adorn', adorn: 'spikes', at: 0.5 } },
  ];
  const d1 = materializeTellDress(specs, [0.5, 1, 1, 0.5, 1, 1, 0.5], 1);
  check('dress: the part channel lerps scale/alpha/count/color and carries fill',
    d1.parts?.length === 1 && d1.parts[0].kind === 'fillSac'
    && d1.parts[0].params?.fill === 0.5
    && Math.abs((d1.parts[0].scale ?? 0) - 0.925) < 1e-9
    && Math.abs((d1.parts[0].alpha ?? 0) - 0.8) < 1e-9
    && d1.parts[0].params?.n === 4
    && d1.parts[0].color === '#904848');
  check('dress: tint/glow/lean/alpha/adorn all read their channels',
    d1.tint?.f === 0.5 && d1.glow?.a === TELL_CFG.glowAlpha
    && d1.lean === 0.9 && d1.alpha === 0.4 && d1.adorn === 'spikes');
  check('dress: THE POSTURE CLAMP — body swell never exceeds the config ceiling',
    Math.abs(d1.scale - (1 + TELL_CFG.maxBodyScale * 0.5)) < 1e-9);
  const p1 = d1.parts![0];
  const d2 = materializeTellDress(specs, [0.75, 1, 0, 0.5, 0, 0, 0.25], 2, d1);
  check('dress: REBUILD IN PLACE — same dress object, same part instance, new readings',
    d2 === d1 && d2.parts![0] === p1 && d2.parts![0].params?.fill === 0.75
    && d2.glow === undefined && d2.lean === 0 && d2.alpha === 1 && d2.adorn === undefined);
  const dz = materializeTellDress(specs, undefined, 3, d1);
  check('dress: missing values read 0 (client warm-up) — the empty gauge still stands',
    dz.parts?.length === 1 && dz.parts[0].params?.fill === 0);
}

// --- 5) The live sweep on the real world -----------------------------------------
{
  const w = makeSimWorld('warrior', 0x7e11a);
  const leech = spawn(w, 'mire_leech', 6);
  leech.drives.set('glut', 0.62);
  tick(w, 0.2); // one sweep beat, brains frozen
  const spec = MONSTERS.mire_leech.tells![0];
  check('sweep: the value is THE resolver\'s own answer off the live actor (drawn == tested)',
    leech.tells?.[0] === resolveTell(spec, leech, w)
    && leech.tells?.[0] === resolveTell({ ...spec }, { ...leechView(leech) }, w),
    `tells ${leech.tells?.join(',')}`);
  function leechView(a: Actor): TellBody { return a; } // Actor satisfies TellBody structurally
  const dress = tellDressOf(leech)!;
  check('sweep: the dress wears the swept reading (sac fill + the engorge band still shut)',
    dress.parts?.[0].params?.fill === leech.tells?.[0] && dress.scale === 1);
  const rev = leech.tellRev;
  const parts0 = dress.parts![0];
  tick(w, 2); // 13 sweep beats, nothing moves
  check('sweep: THE NO-CHURN LAW — quiet frames bump nothing, the dress keeps its identity',
    leech.tellRev === rev && tellDressOf(leech) === dress && dress.parts![0] === parts0);
  leech.drives.set('glut', 1);
  tick(w, 0.2);
  check('sweep: a true change bumps the rev and the dress follows in place',
    leech.tellRev > rev && tellDressOf(leech) === dress
    && dress.parts![0].params?.fill === 1 && dress.scale > 1.05);
}

// --- 6) Determinism ---------------------------------------------------------------
{
  const run = (): string => {
    seedGlobalRandom(0xd0d0);
    const w = makeSimWorld('warrior', 0x7e11b);
    const leech = spawn(w, 'mire_leech', 6);
    leech.drives.set('glut', 0.63);
    tick(w, 0.5);
    const d = tellDressOf(leech)!;
    return JSON.stringify([leech.tells, d.parts?.[0].params?.fill, d.parts?.[0].scale, d.scale]);
  };
  const a = run(), b = run();
  check('determinism: same seed, same state → byte-identical readings and dress', a === b, a);
}

// --- 7) THE ACCUMULATOR end to end (the flagship honesty rig) -----------------------
{
  seedGlobalRandom(0xfeed);
  const w = makeSimWorld('warrior', 0x7e11c);
  const leech = spawn(w, 'mire_leech', 6);
  const dummy = spawn(w, 'probe_tells_dummy', 6, 'player');
  dummy.pos = vec(w.arena.w / 2 + 30, w.arena.h / 2);
  leech.pos = vec(w.arena.w / 2 - 30, w.arena.h / 2);
  let sawFull = false;   // the sac read ≥ 7/8 while the bank stood
  let burstAt = -1;      // the burst EXECUTED (tap ground truth — the real cast)
  let drainedAt = -1;    // the sac fell back near empty after the burst
  let clock = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === leech && inst.def.id === 'sanguine_burst' && burstAt < 0) burstAt = clock;
    },
  });
  for (let t = 0; t < 45 && drainedAt < 0; t += DT) {
    clock = t;
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    const v = leech.tells?.[0] ?? 0;
    if (v >= 0.875 && burstAt < 0) sawFull = true;
    if (burstAt >= 0 && v <= 0.2) drainedAt = t;
  }
  setSimTap(null);
  check('e2e: the leech FED and the sac told it (reading climbed to full off real onDealt jumps)',
    sawFull);
  check('e2e: the full sac BURST (a real sanguine_burst execution — the cast tap)', burstAt >= 0,
    `burst at ${burstAt.toFixed(1)}s`);
  check('e2e: the tell led the mechanic — full BEFORE the burst, drained right after',
    sawFull && burstAt >= 0 && drainedAt >= burstAt, `drained at ${drainedAt.toFixed(1)}s`);
  check('e2e: the dummy bled for it (the nova landed)', dummy.life < dummy.maxLife() - 50);
}

// --- 8) Temperament tells: the rolled mind wears its roll ---------------------------
{
  seedGlobalRandom(0xa11ce);
  const w = makeSimWorld('warrior', 0x7e11d);
  const rolled: Actor[] = [];
  for (let i = 0; i < 40; i++) rolled.push(spawn(w, 'sand_skitterer', 5));
  const byV = (n: number | undefined): Actor[] => rolled.filter(a => a.brainVariant === n);
  check('temperament: the roll is RECORDED and every personality walked in over 40 spawns',
    byV(0).length > 0 && byV(1).length > 0 && byV(2).length > 0,
    `pack ${byV(0).length} / loner ${byV(1).length} / tide ${byV(2).length}`);
  check('temperament: the baseline roll wears NOTHING (null-cost by construction)',
    byV(0).every(a => a.tellSpecs === undefined && tellDressOf(a) === undefined));
  tick(w, 0.2);
  const loner = byV(1)[0], tide = byV(2)[0];
  check('temperament: the loner runs dust-dark (always-tint) and stands easy unalerted',
    tellDressOf(loner)?.tint?.f === 0.5 && (tellDressOf(loner)?.lean ?? 0) === 0);
  loner.aggroed = true;
  tick(w, 0.2);
  check('temperament: the loner HUNKERS the moment it has marked you (lean rides alert)',
    Math.abs((tellDressOf(loner)?.lean ?? 0) - 0.9) < 1e-9);
  check('temperament: the tide wears the storm crest (variant part channel)',
    tellDressOf(tide)?.parts?.[0]?.kind === 'dorsalRidge');
  check('temperament: variant rows COMPOSE with def rows (specs = def + roll)',
    tellSpecsOf(MONSTERS.sand_skitterer, 1)?.length === 2
    && tellSpecsOf(MONSTERS.sand_skitterer, 0) === undefined
    && tellSpecsOf(MONSTERS.mire_leech, undefined) === MONSTERS.mire_leech.tells);
}

// --- 9) The co-op wire round trip ----------------------------------------------------
{
  seedGlobalRandom(0xbeef);
  const w = makeSimWorld('warrior', 0x7e11e);
  const leech = spawn(w, 'mire_leech', 6);
  leech.drives.set('glut', 0.75);
  let loner: Actor | undefined;
  for (let i = 0; i < 30 && !loner; i++) {
    const s = spawn(w, 'sand_skitterer', 5);
    if (s.brainVariant === 1) loner = s;
  }
  const fresh = spawn(w, 'mire_leech', 6); // glut 0 — the all-zero lane
  tick(w, 0.2);
  const snap = serializeSnapshot(w, 1);
  const rowOf = (a: Actor) => snap.actors.find(x => x.id === a.id);
  check('wire: the DERIVED scalars ride (tl mirrors the swept values exactly)',
    JSON.stringify(rowOf(leech)?.tl) === JSON.stringify(leech.tells));
  check('wire: the variant roll rides (bv) so the client rebuilds the same rows',
    rowOf(loner!)?.bv === 1 && rowOf(loner!)?.tl?.length === 2);
  check('wire: an all-zero reading ships nothing (the client materializes zeros free)',
    rowOf(fresh)?.tl === undefined && (fresh.tells ?? []).every(v => v === 0));
  // The REAL adopt path onto a second world (the render-mirror client).
  // Client shells keep their own auto ids (the adopt loop pools by wire id
  // without stamping it), so match by snapshot ORDER — the adopt loop
  // rebuilds world.actors in snap.actors order.
  const w2 = makeSimWorld('warrior', 0x7e11f);
  applySnapshot(w2, snap);
  const c = (a: Actor): Actor | undefined =>
    w2.actors[snap.actors.findIndex(x => x.id === a.id)];
  const cl = c(leech)!, cn = c(loner!)!, cf = c(fresh)!;
  check('wire: the client rebuilt the SAME binding lists from its own registry',
    cl.tellSpecs === MONSTERS.mire_leech.tells && cn.tellSpecs?.length === 2
    && cn.brainVariant === 1);
  check('wire: host and client materialize the SAME dress from the SAME numbers',
    JSON.stringify(cl.tells) === JSON.stringify(leech.tells)
    && tellDressOf(cl)?.parts?.[0].params?.fill === tellDressOf(leech)?.parts?.[0].params?.fill
    && tellDressOf(cn)?.tint?.f === tellDressOf(loner!)?.tint?.f);
  check('wire: the zero-reading client body still wears the EMPTY gauge (specs without values)',
    tellDressOf(cf)?.parts?.[0].params?.fill === 0);
  // Re-apply the same snapshot: nothing may churn on the client either.
  const rev = cl.tellRev, dress = tellDressOf(cl);
  applySnapshot(w2, snap);
  check('wire: a repeated snapshot bumps nothing (the client no-churn law)',
    c(leech)!.tellRev === rev && tellDressOf(c(leech)!) === dress);

  // THE BURST TEAM ON THE WIRE (2026-07-30): THE SPARED RING softens a
  // death burst's command cues for the team it cannot hurt — a read of
  // b.team in drawDeathBursts — so DeathBurstW ships it (`tm`) and the
  // client's row compares equal to the hero's team exactly where the
  // host's does. Absent tm (an old host's wire) the row stays undefined:
  // the classic full-strength ring, never a false "safe".
  w.deathBursts.push({
    phase: 'gather', mode: 'implode', pos: vec(400, 300), team: 'player', dmg: 25,
    radius: 60, type: 'physical', color: '#f4a', t: 0.1, coalesce: 0.8, life: 1.2,
    armAt: 0.3, speed: 0, turn: 0, dir: 0, trail: [], arming: false, contact: false,
    stuck: false, contactFuse: 0, contactRadius: 0,
  });
  const snapB = serializeSnapshot(w, 1);
  check('wire: a death burst ships its team (tm rides)',
    snapB.deathBursts[0]?.tm === 'player', String(snapB.deathBursts[0]?.tm));
  applySnapshot(w2, snapB);
  const cb = w2.deathBursts[0] as { team?: string } | undefined;
  check('wire: the client row compares equal to the hero team (the spared ring softens)',
    cb?.team === w2.player.team, String(cb?.team));
  delete snapB.deathBursts[0].tm;
  applySnapshot(w2, snapB);
  const cbOld = w2.deathBursts[0] as { team?: string } | undefined;
  check('wire: an old host\'s teamless burst stays full-strength (undefined — never a false safe)',
    cbOld?.team === undefined, String(cbOld?.team));
}

// --- 10) The portrait's sane default ---------------------------------------------------
{
  const d = tellPortraitDress(MONSTERS.mire_leech.tells!);
  check('portrait: the book shows the gauge at the sane default (half-full sac, no engorge)',
    d.parts?.[0].kind === 'fillSac' && d.parts[0].params?.fill === TELL_CFG.portraitValue
    && d.scale === 1); // engorge band [0.6,1] reads 0 at the 0.5 default
  const dd = tellPortraitDress([{ source: 'drive:x', portrait: 1, channel: { kind: 'part', part: { kind: 'fillSac' } } }]);
  check('portrait: a spec may pin its own book value (portrait: 1 → a full sac)',
    dd.parts?.[0].params?.fill === 1);
}

// --- 11) validateTells catches real faults ----------------------------------------------
{
  const bad = validateTells({
    broken: {
      tells: [
        { source: 'nonesuch:x', channel: { kind: 'glow' } },
        { source: 'charge:fury', channel: { kind: 'glow' } },              // unbounded, no band
        { source: 'always', band: [1, 1], channel: { kind: 'glow' } },     // degenerate band
        { source: 'always', channel: { kind: 'part', part: { kind: 'no_such_painter' } } },
      ],
      brainVariants: [{ tells: [{ source: 'drive:x', steps: 0, channel: { kind: 'glow' } }] }],
    },
  }, PART_PAINTERS);
  check('validate: unknown source / missing band / degenerate band / dead painter / bad steps all named',
    bad.length === 5, bad.join(' | '));
}

// --- 12) THE ACCUMULATOR FAMILY weave (the shared grammar, statically) -------------
{
  // Every family body: the payoff is RESERVED out of the weighted roll, the
  // brim rule casts it + shoves the drive + ends in the family slump, the
  // worn rows read the SAME drive the rule reads, and the look keeps the
  // meter's seat BARE (the leech law: the gauge is a tell, never a part).
  const fam: [string, string, string, string][] = [
    // [def, drive, payoff skill, the bare look part the tell wears]
    ['mire_leech', 'glut', 'sanguine_burst', 'fillSac'],
    ['charnel_glutton', 'gorge', 'gorge_burst', 'fillSac'],
    ['cinderback', 'kindle', 'kindled_eruption', 'fillSac'],
    ['bloat_mother', 'brood', 'broodpod', 'fillSac'],
  ];
  for (const [id, drive, payoff, barePart] of fam) {
    const def = MONSTERS[id];
    const rule = def.brain?.rules?.find(r => r.when.drive?.id === drive
      && r.actions?.some(a => a.do === 'cast' && a.skill === payoff));
    check(`family ${id}: brim rule casts ${payoff}, empties the bank, and SLUMPS`,
      !!rule
      && (rule.when.drive?.above ?? 0) >= 0.9
      && rule.actions?.some(a => a.do === 'drive' && a.id === drive && a.add <= -1) === true
      && rule.actions?.some(a => a.do === 'buff' && a.buff.id === SPENT_SLUMP_BUFF.id) === true);
    check(`family ${id}: the payoff is reserved OUT of the rotation (priority kit)`,
      def.brain?.skillUse?.mode === 'priority'
      && !def.brain?.skillUse?.order?.includes(payoff)
      && def.skills.includes(payoff));
    check(`family ${id}: a worn row reads the SAME meter the rule reads (drawn == decided)`,
      def.tells?.some(t => t.source === `drive:${drive}`) === true);
    check(`family ${id}: the slump window is worn (the buff: source row)`,
      def.tells?.some(t => t.source === `buff:${SPENT_SLUMP_BUFF.id}`) === true);
    const look = LOOKS[def.look ?? ''];
    check(`family ${id}: the look keeps the meter's seat bare (no ${barePart}/crest as a part)`,
      !!look && !look.parts.some(p => p.kind === barePart || p.kind === 'crest'));
  }
  check('family: the chorister wears the crest AS the pack meter (part channel, dun→gold)',
    MONSTERS.crag_chorister.tells?.some(t => t.source === 'drive:chorus'
      && t.channel.kind === 'part' && t.channel.part.kind === 'crest') === true
    && !LOOKS.crag_chorister.parts.some(p => p.kind === 'crest'));
  check('family: the chorus drive is PACK-SHARED and sags on a felled voice',
    (MONSTERS.crag_chorister.brain?.drives?.chorus?.share ?? 0) >= 1
    && (MONSTERS.crag_chorister.brain?.drives?.chorus?.onAllyDeath ?? 0) < 0
    && (MONSTERS.crag_chorister.brain?.drives?.chorus?.onKill ?? 0) > 0);
  check('family: the glutton BANKS meals through the carrion lane, under fire',
    MONSTERS.charnel_glutton.carrion?.drive?.id === 'gorge'
    && (MONSTERS.charnel_glutton.carrion?.drive?.add ?? 0) > 0
    && MONSTERS.charnel_glutton.carrion?.combat === true);
  check('family: the releases are monster-only (noDrop — outside the gem economy by construction)',
    SKILLS.gorge_burst.noDrop === true && SKILLS.kindled_eruption.noDrop === true);
  // THE BURST-TELL CENSUS: every deathBurst body wears a life-read glow (the
  // registry-close fold) unless deliberately opted out — shirkers get named.
  const dark: string[] = [];
  let bursters = 0;
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    if (!def.deathBurst || def.burstTell === false) continue;
    bursters++;
    const worn = def.tells?.some(t => t.source === 'life' && t.channel.kind === 'glow');
    if (!worn) dark.push(id);
  }
  check(`family: THE BURST-TELL LAW — all ${bursters} death-burst bodies glow as life falls (census)`,
    bursters >= 30 && dark.length === 0, dark.join(','));
  const cb = MONSTERS.cinderback;
  check('family: the cinderback layers BOTH glows (kindle drive + the derived life read; deepest wins)',
    cb.tells?.some(t => t.source === 'drive:kindle' && t.channel.kind === 'glow') === true
    && cb.tells?.some(t => t.source === 'life' && t.channel.kind === 'glow') === true
    && !!cb.deathBurst);
}

// --- 13) The buff source (the slump's read) — pure and honest ----------------------
{
  const withBuff = (id: string, stacks = 1, maxStacks?: number): TellBody => body({
    buffs: new Map([[id, { stacks, def: { maxStacks } }]]),
  });
  check('source buff: presence reads 1 (the slump window is binary)',
    resolveTell(row('buff:spent_slump'), withBuff('spent_slump'), W) === 1
    && resolveTell(row('buff:spent_slump'), body(), W) === 0);
  check('source buff: stacks read over the buff\'s own cap (3/4 → 0.75)',
    resolveTell(row('buff:stack_pile'), withBuff('stack_pile', 3, 4), W) === 0.75);
  const b = withBuff('spent_slump');
  const before = JSON.stringify([...b.buffs as Map<string, unknown>]);
  resolveTell(row('buff:spent_slump'), b, W);
  check('source buff: a pure read (the map is byte-identical after)',
    JSON.stringify([...b.buffs as Map<string, unknown>]) === before);
  check('law: SPENT_SLUMP is one binary lean row, invisible in the book (portrait 0)',
    SPENT_SLUMP.length === 1 && SPENT_SLUMP[0].steps === 1 && SPENT_SLUMP[0].portrait === 0
    && SPENT_SLUMP[0].channel.kind === 'lean');
}

// --- 14) THE GORGER end to end (fill from real meals → burst → slump) ----------------
{
  seedGlobalRandom(0x60f6e);
  const w = makeSimWorld('warrior', 0x7e120);
  const glut = spawn(w, 'charnel_glutton', 6);
  glut.pos = vec(w.arena.w / 2 - 40, w.arena.h / 2);
  glut.drives.set('gorge', 0); // strip the rolled head start: every fill is a MEAL
  const meal = (): void => {
    w.corpses.push({
      pos: vec(glut.pos.x + 50, glut.pos.y), defId: 'taiga_elk', level: 6,
      maxLife: 100, remaining: 60,
    });
  };
  meal(); meal(); meal();
  const corpses0 = w.corpses.length;
  // Phase 1 — the IDLE larder: full-life, it still eats (the bank is hunger).
  for (let t = 0; t < 25 && (glut.drives.get('gorge') ?? 0) < 0.95; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (w.corpses.length === 0) { meal(); }
  }
  check('gorger e2e: meals BANKED at full life (corpses eaten, the drive climbed to the brim)',
    (glut.drives.get('gorge') ?? 0) >= 0.95 && w.corpses.length < corpses0,
    `gorge ${(glut.drives.get('gorge') ?? 0).toFixed(2)}`);
  check('gorger e2e: the paunch tell reads the bank (drawn == banked)',
    (glut.tells?.[0] ?? 0) >= 0.875, `tell ${glut.tells?.[0]}`);
  check('gorger e2e: the gorged waddle is ON while fed (the drag buff reapplies)',
    glut.buffs.get('gorged_waddle') !== undefined);
  // Phase 2 — the RELEASE: prey in reach, the bank comes back up.
  const dummy = spawn(w, 'probe_tells_dummy', 6, 'player');
  dummy.pos = vec(glut.pos.x + 60, glut.pos.y);
  let burstAt = -1; let clock = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === glut && inst.def.id === 'gorge_burst' && burstAt < 0) burstAt = clock;
    },
  });
  let slumped = false, drained = false;
  for (let t = 0; t < 20 && !(slumped && drained); t += DT) {
    clock = t;
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    if (burstAt >= 0 && glut.buffs.get('spent_slump')) slumped = true;
    if (burstAt >= 0 && (glut.drives.get('gorge') ?? 0) <= 0.05) drained = true;
  }
  setSimTap(null);
  check('gorger e2e: the full paunch BURST in reach (a real gorge_burst cast)', burstAt >= 0,
    `burst at ${burstAt.toFixed(1)}s`);
  check('gorger e2e: the spend emptied the bank and bought the SLUMP window', slumped && drained);
  check('gorger e2e: the slump row wore the sag (lean while the window held)',
    (glut.tellSpecs?.findIndex(t => t.source === 'buff:spent_slump') ?? -1) >= 0);
  // Phase 3 — THE COMPULSION: under fire, a short bank walks it back to meat.
  // (A CLEAR larder: leftover phase-1 corpses can sit under the dummy's own
  // body — the nearest-corpse walk then body-blocks into the stall/snub
  // guard, which is that guard's own law, not the one under test here.)
  glut.drives.set('gorge', 0.2);
  glut.carrionSnubUntil = 0;
  w.corpses.length = 0;
  w.corpses.push({
    pos: vec(glut.pos.x - 50, glut.pos.y - 60), defId: 'taiga_elk', level: 6,
    maxLife: 100, remaining: 60,
  });
  const n0 = w.corpses.length;
  for (let t = 0; t < 12 && w.corpses.length >= n0; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
  check('gorger e2e: it kept feeding UNDER FIRE (carrion.combat — the meal owned the fight)',
    w.corpses.length < n0 && !glut.dead);
}

// --- 15) THE BROODER end to end (term → the laying → the clutch) ---------------------
{
  seedGlobalRandom(0xb00d);
  const w = makeSimWorld('warrior', 0x7e121);
  const mother = spawn(w, 'bloat_mother', 6);
  mother.pos = vec(w.arena.w / 2, w.arena.h / 2);
  mother.drives.set('brood', 0.9);
  let laidAt = -1; let clock = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === mother && inst.def.id === 'broodpod' && laidAt < 0) laidAt = clock;
    },
  });
  for (let t = 0; t < 20 && laidAt < 0; t += DT) {
    clock = t;
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
  check('brooder e2e: the sac came to TERM on its own clock (a real broodpod laying)',
    laidAt >= 0, `laid at ${laidAt.toFixed(1)}s`);
  check('brooder e2e: the laying emptied the clock and bought the slump',
    (mother.drives.get('brood') ?? 1) <= 0.2 && mother.buffs.get('spent_slump') !== undefined);
  // The pod incubates its five readable seconds, then the clutch walks.
  let hatched = false;
  for (let t = 0; t < 12 && !hatched; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
    hatched = w.actors.some(a => !a.dead && a.defId === 'broodling');
  }
  check('brooder e2e: the pod HATCHED the brood (the machinery was always hers)', hatched);
  setSimTap(null);
  // The death-clutch stands regardless: killing her still spills the mites.
  w.kill(mother, false);
  const mites = w.actors.filter(a => !a.dead && a.defId === 'blood_mite').length;
  check('brooder e2e: her death still spills the death-clutch (the old law kept)', mites >= 4,
    `${mites} mites`);
}

// --- 16) THE CHORUS live (the crest crests, the felled voice sags the choir) ----------
{
  seedGlobalRandom(0xc405);
  const w = makeSimWorld('warrior', 0x7e122);
  const choir: Actor[] = [];
  for (let i = 0; i < 4; i++) {
    const c = spawn(w, 'crag_chorister', 5);
    c.squadId = 777;
    c.pos = vec(w.arena.w / 2 + (i % 2) * 60 - 30, w.arena.h / 2 + Math.floor(i / 2) * 60 - 30);
    choir.push(c);
  }
  for (const c of choir) c.drives.set('chorus', 0.95);
  for (let t = 0; t < 4; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
  check('chorus live: the crested choir wears the fervor (the crescendo rule reapplies it)',
    choir.every(c => c.buffs.get('chorus_crescendo') !== undefined));
  check('chorus live: the crest tell stands tall at crest (the worn meter)',
    choir.every(c => (c.tells?.[0] ?? 0) >= 0.875));
  const before = choir.slice(1).map(c => c.drives.get('chorus') ?? 0);
  w.kill(choir[0], false);
  for (let t = 0; t < 0.4; t += DT) {
    for (const a of w.actors) { if (!a.dead) updateAI(a, w, DT); }
    w.update(DT);
  }
  const after = choir.slice(1).map(c => c.drives.get('chorus') ?? 0);
  check('chorus live: ONE felled voice sagged every crest in earshot (onAllyDeath)',
    after.every((v, i) => v < before[i] - 0.3),
    `${before.map(v => v.toFixed(2))} -> ${after.map(v => v.toFixed(2))}`);
  const sagged = choir[1];
  check('chorus live: the sag is WORN (the crest tell fell with the meter after a sweep)',
    (sagged.tells?.[0] ?? 1) <= 0.625, `tell ${sagged.tells?.[0]}`);
}

// --- 17) THE KINDLER end to end (stoked by real blows → the vent → the slump) --------
{
  seedGlobalRandom(0x51071);
  const w = makeSimWorld('warrior', 0x7e123);
  // THE PINNED STAGE: enemies hunt the HERO, and the sim hero drifts — so
  // the rig parks the seat at the stage and holds it there. The kindler
  // stands at its quarry, the biter stands at the kindler, and the blows
  // stream instead of a three-body chase across the arena.
  const hub = vec(w.arena.w / 2, w.arena.h / 2);
  const hero = w.player;
  const kin = spawn(w, 'cinderback', 6);
  kin.pos = vec(hub.x + 28, hub.y);
  kin.drives.set('kindle', 0);
  const biter = spawn(w, 'probe_tells_biter', 6, 'player');
  biter.pos = vec(kin.pos.x + 30, kin.pos.y);
  let stoked = 0;
  let ventAt = -1; let clock = 0;
  setSimTap({
    onCast: (caster, inst) => {
      if (caster === kin && inst.def.id === 'kindled_eruption' && ventAt < 0) ventAt = clock;
    },
  });
  for (let t = 0; t < 60 && ventAt < 0; t += DT) {
    clock = t;
    for (const a of w.actors) { if (!a.dead) updateAI(a, w, DT); }
    w.update(DT);
    stoked = Math.max(stoked, kin.drives.get('kindle') ?? 0);
    // The rig tops the furnace's LIFE each beat (the meter is under test,
    // not the TTK — a real fight overkills it long before the brim, which
    // is exactly the DENY strategy and its own probe-less truth). The seat
    // is pinned + topped the same way: the stage must outlive the lesson.
    kin.life = kin.maxLife();
    hero.pos.x = hub.x; hero.pos.y = hub.y;
    hero.life = hero.maxLife();
  }
  setSimTap(null);
  check('kindler e2e: real blows STOKED the furnace (the drive climbed off onHurt jumps alone)',
    stoked >= 0.95 && !kin.dead, `peak ${stoked.toFixed(2)}`);
  check('kindler e2e: the brimming furnace VENTED in reach (a real kindled_eruption cast)',
    ventAt >= 0, `vent at ${ventAt.toFixed(1)}s`);
  check('kindler e2e: the vent emptied the coals and bought the slump window',
    (kin.drives.get('kindle') ?? 1) <= 0.2 && kin.buffs.get('spent_slump') !== undefined);
  check('kindler e2e: the glow rows read the same meter (kindle glow at 0 now, life glow layered)',
    kin.tellSpecs?.[0]?.source === 'drive:kindle'
    && kin.tellSpecs?.some(t => t.source === 'life' && t.channel.kind === 'glow') === true);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
