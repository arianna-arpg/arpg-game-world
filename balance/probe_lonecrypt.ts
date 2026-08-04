// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE LONE CRYPT kit (data/lonecrypt.ts + docs in the kit
// header): the exhumation riddle (STRIKE-driven — the loud contrast with
// unearth's dwell), the sealed grave structure + its riddle-sealed mouth
// (SidezoneDef.sealedBy → World.sidezoneSealHolds, the one narrow seam),
// the per-mouth RESIDENT lottery (CRYPT_RESIDENTS on the mint seed's salted
// fork), and the unquiet yard's walkability contract (graveyard_rows on the
// grid arranger — corridors ≥ a player diameter by pure def math).
// Sections: A census (registries + tileset wiring + the RATIFIED ask
// arithmetic + pool hygiene), B the exhumation driven bare on a stub host,
// C the yard's corridor arithmetic, D the pool draw (determinism + spread),
// E the REAL crypt zone end-to-end (devMintTileset → placer birth → seal
// holds → round-robin dig → seal lifts → the mouth's mint draws its
// horror), F the structure sweep (the warren-starved law: the [1,1] tomb
// must actually seat across seeds), G THE ADOPTED ASK live (the 2026-08-04
// ruling: the adoptive lane's puzzle class stamps the STANDING 'puzzle'
// kind over a bare cull; the real dig banks the driver AND lifts the seal).
// Siblings: balance/probe_puzzles.ts (the fabric's own laws),
// balance/probe_objectives.ts RIG V (the lane-side pins: coin rates,
// no-conjure, precedence).
// Run: npx tsx balance/probe_lonecrypt.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32 } from '../src/sim/rng';
import type { Actor } from '../src/engine/actor';
import type { Vec2 } from '../src/core/math';
import { vec } from '../src/core/math';
import { Rng } from '../src/core/rng';
import {
  doodadRuleOf, formationDefs, generateLayout, hasFormation, hasFormationArranger,
  hasStamp, type GeneratedLayout,
} from '../src/engine/levelgen';
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleHost, type PuzzleRun } from '../src/engine/puzzles';
import { ADOPT_CFG, puzzleAskRows } from '../src/data/objectives';
import { PUZZLES } from '../src/data/puzzles';
import { objectiveEarnsChest, objectiveSeals } from '../src/data/zones';
import { CRYPT_RESIDENTS, rollCryptResident } from '../src/data/lonecrypt';
import { HIGH_COURT, MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SIDEZONES } from '../src/data/sidezones';
import { STRUCTURES } from '../src/data/structures';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { TILESETS } from '../src/data/tilesets';
import type { StampSpec, ZoneDef } from '../src/data/zones';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('warrior', 41107);
const p = world.player;
p.invulnerable = true;

// --- A) THE CENSUS — registries, wiring, pool hygiene ------------------------
{
  const spec = PUZZLES.grave_exhumation;
  check('census: the grave_exhumation preset stands in PUZZLES', !!spec && spec.kind === 'exhumation');
  const kind = PUZZLE_KINDS.exhumation;
  check('census: the exhumation kind is registered', !!kind);
  check("law: the exhumation digs wide (spill 'all' — the ember's breadth)",
    kind?.spill === 'all' && kind?.who === 'player');
  const node = MONSTERS.unquiet_grave;
  check('census: the gravestone fixture wears the object-actor contract',
    !!node && !!node.passive && !!node.immortal && !!node.noObjective
    && node.aims === false && node.base.moveSpeed === 0 && !node.tune,
    'unquiet_grave');
  check('census: the fixture is STONE and stays out of the corpse economy',
    node?.material === 'stone');

  const sz = SIDEZONES.lone_crypt_door;
  check('census: the lone_crypt_door sidezone is registered', !!sz);
  check('seal: the mouth is sealed by the exhumation KIND, refusal authored',
    sz?.sealedBy?.kind === 'exhumation' && !!sz?.sealedBy?.refusal);
  check('census: the mouth dwells only under the tomb roof (indoorsOnly)',
    sz?.indoorsOnly === true && sz?.ledgerOnEnter === 'lone_crypt_entered');
  check('census: the door kind carries rule + stamp + visual (the batch-25 law)',
    doodadRuleOf('lone_crypt_door').overlap === 'trigger'
    && hasStamp('lone_crypt_door') && !!DOODAD_VISUALS.lone_crypt_door);

  const st = STRUCTURES.sealed_grave;
  const vCell = st?.legend?.V;
  check('census: the sealed_grave structure seats the mouth in its plan',
    !!st && (st.plan ?? []).some(r => r.includes('V'))
    && vCell?.doodad?.kind === 'lone_crypt_door' && vCell?.interior === true);
  check('census: the tomb is roofed + room-veiled (the indoorsOnly gate has a roof to read)',
    st?.roofs === 'auto' && !!st?.confineVision);

  check('census: graveyard_rows rides the grid arranger (tomb plots)',
    hasFormation('graveyard_rows') && hasFormationArranger('grid')
    && formationDefs().find(f => f.id === 'graveyard_rows')?.arrange === 'grid');

  // Tileset wiring: the loop's two countries pair key and door in EVERY
  // zone (a ring without a tomb, or a tomb without a ring, is a broken
  // promise); the gloamwood heart carries the yard as dress only.
  //
  // THE ASK (RULED 2026-08-04): the exhumation IS askable — via THE ADOPTIVE
  // LANE's puzzle class (registerPuzzleAsk, the kit's module tail), NEVER a
  // weight row. The weight-row lane is permanently DEAD for these tables: a
  // 'puzzle' weight changes a table's weighted TOTAL, which re-rolls every
  // mint of the country and cascades through the chart halo into other
  // countries' pinned-seed rigs (probe_tiers N3.9 was the witness) — and it
  // would double-dip beside the registered row besides. The adoptive read
  // draws nothing at load; section G drives the adopted ask end to end.
  const ASK_TARGETS: Record<string, number> = { crypt: 0.15, mournstead: 0.12 };
  for (const tid of ['crypt', 'mournstead']) {
    const t = TILESETS[tid];
    check(`wiring: ${tid} stands the exhumation up in every zone (chance 1)`,
      (t.puzzles ?? []).some(r => r.id === 'grave_exhumation' && r.chance === 1));
    check(`wiring: ${tid} keeps exactly one sealed grave (common [1,1])`,
      (t.common ?? []).some((s: StampSpec) =>
        s.kind === 'structure' && s.structure === 'sealed_grave'
        && s.count[0] === 1 && s.count[1] === 1));
    check(`wiring: ${tid} never wears a 'puzzle' weight row (the ask rides the adoptive lane — the cascade law)`,
      !(t.objectives ?? []).some(o => o.kind === 'puzzle'));
    // THE RATIFIED ARITHMETIC (Arianna's ~1-in-7): effective ask share =
    // the table's own bare-'clear' share × the per-tileset dial — pinned
    // against the LIVE table, so a table retune (or a dial edit) that moves
    // the landed rate re-surfaces for a ruling instead of drifting silently.
    const total = (t.objectives ?? []).reduce((s, o2) => s + o2.weight, 0);
    const share = ((t.objectives ?? []).find(o2 => o2.kind === 'clear')?.weight ?? 0) / total;
    const dial = ADOPT_CFG.puzzleChanceByTileset[tid];
    check(`ask: ${tid} dial × clear share lands the ratified rate (±0.5pt)`,
      dial !== undefined && Math.abs(share * dial - ASK_TARGETS[tid]) < 0.005,
      `${(share * 100).toFixed(1)}% clear × ${dial} = ${(share * dial * 100).toFixed(1)}% vs ${(ASK_TARGETS[tid] * 100).toFixed(0)}%`);
  }
  check('ask: the kit registered its adoptive row (door → ring, the no-conjure pair)',
    puzzleAskRows().some(r => r.id === 'grave_exhumation'
      && r.doodad === 'lone_crypt_door' && r.puzzle === 'grave_exhumation'));
  check('wiring: the gloamwood heart wears the yard as dress only',
    (TILESETS.gloamwood.common ?? []).some((s: StampSpec) => s.formation === 'graveyard_rows')
    && !(TILESETS.gloamwood.puzzles ?? []).length);
  const lc = TILESETS.lone_crypt;
  check('wiring: the lone_crypt tileset is explicit-mint only (no caveFace, no frontier)',
    !!lc && lc.frontier === false && !lc.caveFace && lc.sky === 'sheltered');

  // Pool hygiene: every resident resolves, wears a registered look, and no
  // entry is boss:true (the anatomy seat census binds boss composites to
  // static seats — a rolled pool must stay below the boss classification;
  // bossBar-without-boss IS the spectacle tier). The undead HIGH COURT's
  // zenith + apex stay doorless for the Odyssey rails.
  check('pool: a huge pool (≥ 10 residents)', CRYPT_RESIDENTS.length >= 10,
    `${CRYPT_RESIDENTS.length}`);
  for (const r of CRYPT_RESIDENTS) {
    const def = MONSTERS[r.id];
    check(`pool: '${r.id}' resolves with a registered look`,
      !!def && r.weight > 0 && !!def.look && !!LOOKS[def.look]);
    check(`pool: '${r.id}' is never boss-classified (the rolled-seat law)`,
      !!def && !def.boss);
  }
  const court = HIGH_COURT.undead;
  check('pool: the undead court\'s zenith + apex stay doorless',
    !CRYPT_RESIDENTS.some(r => r.id === court?.zenith || r.id === court?.apex));
  for (const nid of ['crypt_lich', 'tomb_regent', 'casket_maw', 'sexton_shade']) {
    check(`pool: new resident '${nid}' wears bossBar WITHOUT boss (the champion law)`,
      MONSTERS[nid]?.bossBar === true && !MONSTERS[nid]?.boss);
  }
}

// --- helpers: stub host + hand-built runs (the probe_puzzles idiom) ----------
const mkHost = (seed = 7): PuzzleHost & { completed: PuzzleRun[] } => {
  const done: PuzzleRun[] = [];
  const host: PuzzleHost & { completed: PuzzleRun[] } = {
    completed: done,
    now: () => world.time,
    rng: mulberry32(seed),
    flash: () => { /* silent probe */ },
    say: () => { /* silent probe */ },
    setTone: () => { /* stones take no tone */ },
    kindle: (n, secs) => n.applyStatus(PUZZLE_CFG.kindleStatus, 0, secs, 'the exhumation'),
    quench: n => n.endStatus(PUZZLE_CFG.kindleStatus),
    heroNear: () => true,
    complete: run => { run.done = true; done.push(run); },
  };
  return host;
};
const mkCourt = (runId: string, n: number, at: Vec2): Actor[] => {
  const out: Actor[] = [];
  for (let i = 0; i < n; i++) {
    const m = world.createMonster('unquiet_grave', 8, 'enemy');
    const ang = (i / n) * Math.PI * 2;
    m.pos = { x: at.x + Math.cos(ang) * 118, y: at.y + Math.sin(ang) * 118 };
    m.puzzleNode = { id: runId, idx: i };
    world.actors.push(m);
    out.push(m);
  }
  return out;
};
const mkRun = (id: string, spec: PuzzleRun['spec'], nodes: Actor[], at: Vec2): PuzzleRun => ({
  id, spec, kind: PUZZLE_KINDS[spec.kind], at, nodes,
  state: {}, hums: new Map(), done: false, isObjective: false,
});
const kindledOn = (a: Actor): boolean =>
  a.statuses.some(s => s.id === PUZZLE_CFG.kindleStatus);

// --- B) THE EXHUMATION — struck open, stage by stage -------------------------
{
  const at = vec(p.pos.x + 600, p.pos.y + 200);
  const host = mkHost(11);
  const nodes = mkCourt('probe_exhume#0', 4, at);
  const run = mkRun('probe_exhume#0', { kind: 'exhumation' }, nodes, at);
  run.kind.boot(run, host);
  const need = run.state.need as number;
  check('exhume: boots dark with a shared dig count in the band',
    need >= 2 && need <= 3 && (run.state.dug as number[]).every(d => d === 0),
    `need=${need}`);
  check('exhume: the status reads the yard', run.kind.status(run).includes('0/4'));

  // One stone through its stages: closed until the LAST blow, then held open.
  for (let i = 0; i < need - 1; i++) run.kind.struck!(run, nodes[0], host, p);
  check('exhume: a part-dug grave stays closed (no kindle yet)',
    !kindledOn(nodes[0]) && (run.state.dug as number[])[0] === need - 1);
  run.kind.struck!(run, nodes[0], host, p);
  check('exhume: the last blow stands the grave open (kindled for good)',
    kindledOn(nodes[0]) && run.kind.status(run).includes('1/4'));
  const dugSnap = (run.state.dug as number[])[0];
  run.kind.struck!(run, nodes[0], host, p);
  check('exhume: an opened grave is QUIET (re-strikes change nothing)',
    (run.state.dug as number[])[0] === dugSnap && !run.done);

  // The rest of the yard: every grave open resolves the ring.
  for (let i = 1; i < nodes.length; i++) {
    for (let d = 0; d < need; d++) run.kind.struck!(run, nodes[i], host, p);
  }
  check('exhume: every grave open resolves the riddle',
    run.done && host.completed.length === 1);
  check('exhume: the finished yard reads 4/4', run.kind.status(run).includes('4/4'));

  // solved() dress (memory re-entry): all stones stand open.
  const at2 = vec(p.pos.x + 600, p.pos.y + 800);
  const nodes2 = mkCourt('probe_exhume#1', 5, at2);
  const run2 = mkRun('probe_exhume#1', { kind: 'exhumation' }, nodes2, at2);
  run2.kind.boot(run2, mkHost(12));
  run2.kind.solved!(run2, mkHost(13));
  check('exhume: a remembered solve dresses the whole yard open',
    nodes2.every(n => kindledOn(n)) && run2.kind.status(run2).includes('5/5'));

  // Determinism: the same host stream digs the same yard.
  const runA = mkRun('probe_exhume#2', { kind: 'exhumation' }, nodes2, at2);
  const runB = mkRun('probe_exhume#3', { kind: 'exhumation' }, nodes2, at2);
  runA.kind.boot(runA, mkHost(99));
  runB.kind.boot(runB, mkHost(99));
  check('exhume: the dig count is deterministic on the host stream',
    runA.state.need === runB.state.need);
}

// --- C) THE YARD'S CORRIDORS — walkability as pure def math ------------------
{
  const f = formationDefs().find(d => d.id === 'graveyard_rows')!;
  const step = f.step ?? 46;
  const rowGap = typeof f.params?.rowGap === 'number' ? f.params.rowGap : step;
  const BODY = 30; // the player diameter (Actor radius 15)
  const solid = f.pieces.filter(pc => {
    const rule = doodadRuleOf(pc.kind);
    return rule.blocksMove !== false && rule.overlap !== 'ground';
  });
  const main = solid.find(pc => pc.kind === 'tombstone')!;
  check('yard: the headstones are the lattice\'s main body', !!main);
  const mainWorst = 2 * main.radius[1] + 2 * (main.jitter ?? 0);
  check('yard: along-row corridors pass a player body',
    step - mainWorst >= BODY, `${step - mainWorst}px vs ${BODY}px`);
  check('yard: across-row corridors pass a player body',
    rowGap - mainWorst >= BODY, `${rowGap - mainWorst}px`);
  // Co-located every-N punctuation: a cairn sharing an anchor with a
  // headstone must still leave the lane to the NEXT plot open.
  for (const pc of solid) {
    if (pc === main) continue;
    const worst = main.radius[1] + (main.jitter ?? 0) + pc.radius[1] + (pc.jitter ?? 0);
    check(`yard: '${pc.kind}' punctuation never closes a lane`,
      step - worst >= BODY * 0.9, `${step - worst}px`);
  }
  check('yard: LESS dense than the crops (both gaps beat the field\'s 30/46)',
    step >= 60 && rowGap >= 70, `${step}/${rowGap}`);
}

// --- D) THE POOL DRAW — one door, one horror, forever ------------------------
{
  const a = rollCryptResident(123456);
  const b = rollCryptResident(123456);
  check('pool: the same mouth draws the same horror forever', a.id === b.id, a.id);
  const seen = new Set<string>();
  for (let s = 0; s < 300; s++) seen.add(rollCryptResident(s * 7919 + 3).id);
  check('pool: 300 mouths spread the lottery wide (≥ 8 distinct)',
    seen.size >= 8, `${seen.size} distinct`);
  check('pool: every drawn id is a pool row',
    [...seen].every(id => CRYPT_RESIDENTS.some(r => r.id === id)));
  check('pool: the marquee lich surfaces somewhere in 300', seen.has('crypt_lich'));
}

// --- E) THE REAL CRYPT ZONE — placer birth, seal, dig, mint ------------------
{
  type WorldGuts = {
    puzzles: PuzzleRun[];
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
    sidezoneSealHolds(kind: string): boolean;
    caveEntrances: { pos: Vec2; kind: string }[];
    zone: ZoneDef;
  };
  const guts = world as unknown as WorldGuts;
  const zid = world.devMintTileset('crypt', 0, 9, { seed: 60611 });
  check('zone: a crypt country mints', !!zid);
  const run = guts.puzzles.find(r => r.kind.id === 'exhumation');
  check('zone: the placer stood the exhumation up (chance 1 — every zone)',
    !!run && !run.done, run ? `${run.nodes.length} stones` : 'no run');
  const mouth = guts.caveEntrances.find(cm => cm.kind === 'lone_crypt_door');
  check('zone: the sealed grave seated its mouth (the tomb stands)', !!mouth);
  check('seal: the mouth HOLDS while the yard is undug',
    guts.sidezoneSealHolds('lone_crypt_door') === true);

  // Round-robin the stones (each fresh bell clears the last one's hum —
  // the drain's own law), through the REAL knock queue.
  if (run) {
    const need = run.state.need as number;
    for (let d = 0; d < need; d++) {
      for (const n of run.nodes) {
        guts.puzzleStruck(n, p, true);
        world.update(1 / 60);
      }
    }
    check('seal: the dug yard resolves the run', run.done);
  }
  check('seal: the opened yard LIFTS the seal',
    guts.sidezoneSealHolds('lone_crypt_door') === false);

  // The mouth's mint: the pocket draws its horror on the mint seed's fork,
  // pure (twice the same seed, twice the same crypt).
  const sz = SIDEZONES.lone_crypt_door;
  const ctx = {
    parent: guts.zone, seed: 987654, id: 'probe_lone_crypt_pocket',
    pos: vec(0, 0), playerLevel: 9, pkgActive: () => false,
  };
  const pocket = sz.mint(ctx);
  const pocket2 = sz.mint(ctx);
  check('mint: the pocket wears the lone_crypt face, sealed no-deeper',
    pocket.tileset === 'lone_crypt' && pocket.noDeeper === true);
  const obj = pocket.objective as { kind: string; id?: string };
  check('mint: the objective is the drawn resident (a boss ask from the pool)',
    obj.kind === 'boss' && !!obj.id && CRYPT_RESIDENTS.some(r => r.id === obj.id),
    obj.id ?? 'none');
  check('mint: the draw is pure (same mouth, same horror)',
    obj.id === (pocket2.objective as { id?: string }).id);
  check('mint: the crypt breathes its own fauna, never meadow hares',
    Array.isArray(pocket.fauna) && pocket.fauna.length > 0);
}

// --- F) THE STRUCTURE SWEEP — the warren-starved law -------------------------
// The [1,1] tomb must actually seat: generateLayout over both graveland
// faces at the tileset's own SMALLEST size band (the worst case), several
// seeds each — every layout must carry the mouth's doodad.
{
  const crypt = TILESETS.crypt;
  const arena = { w: crypt.sizeW![0], h: crypt.sizeH![0] };
  const entry = vec(120, arena.h / 2);
  const exits = [vec(arena.w - 120, arena.h / 2)];
  const THEME = { floor: '#161616', grid: '#222', border: '#555', obstacle: '#333', obstacleEdge: '#666', accent: '#999' };
  const genAt = (variantIdx: number, seed: number): GeneratedLayout => {
    const rows: StampSpec[] = [...(crypt.common ?? []), ...crypt.variants![variantIdx].layout];
    const def: ZoneDef = {
      id: `probe_lc_sweep_${variantIdx}_${seed}`, name: 'QA sweep', level: 9,
      size: { w: arena.w, h: arena.h }, theme: THEME, layout: rows,
      objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 }, seed,
    };
    return generateLayout(def, arena, new Rng(seed), entry, exits);
  };
  let seated = 0, swept = 0;
  for (let v = 0; v < 2; v++) {
    for (let s = 0; s < 6; s++) {
      const seed = 1000003 * (v * 6 + s + 1) + 41;
      const layout = genAt(v, seed);
      swept++;
      const door = layout.doodads.some(d => d.kind === 'lone_crypt_door');
      const tomb = (layout.structures ?? []).some(st => st.defId === 'sealed_grave');
      if (door && tomb) seated++;
    }
  }
  check('sweep: the sealed grave seats its tomb + mouth on every seed',
    seated === swept, `${seated}/${swept}`);
}

// --- G) THE ADOPTED ASK — the ruling made live (2026-08-04) ------------------
// Arianna ratified the ~1-in-7 ask on THE ADOPTIVE LANE (the weight-row lane
// is DEAD — the A-section pin): a graveland/mournstead zone that rolled a
// bare cull MAY wear the exhumation as its ask, stamped at load by the
// lane's puzzle class (registerPuzzleAsk, data/objectives.ts) as the
// STANDING 'puzzle' kind with THE ring pinned, completed by the standing
// driver through the real dig. This rig pins the loop deterministically:
// the coin is skipped via adopt:true (the mintWith law — the coin's own
// rates are RIG V's business in probe_objectives, the effective-rate
// arithmetic the A-section's), the dig is the real knock queue, and the
// SAME dig that banks the objective lifts the crypt's seal.
{
  type GGuts = {
    zoneMap: Record<string, ZoneDef>;
    zoneMemory: Map<string, unknown>;
    completedObjectives: Set<string>;
    objectiveDone: boolean;
    puzzles: PuzzleRun[];
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
    sidezoneSealHolds(kind: string): boolean;
    zone: ZoneDef;
    loadZone(id: string): void;
  };
  const g = world as unknown as GGuts;
  const before = g.zone.id; // wherever section E left us — any elsewhere serves
  const zid = world.devMintTileset('crypt', 3, 9, { seed: 777001 })!;
  check('adopt: a fresh graveland country mints', !!zid);
  g.loadZone(before); // step off the scout visit (the mintWith law)…
  const def = g.zoneMap[zid];
  def.objective = { kind: 'clear', adopt: true }; // …and pin the coin open
  g.zoneMemory.delete(zid);
  g.completedObjectives.delete(zid);
  g.loadZone(zid);
  const o = g.zone.objective as { kind: string; puzzle?: string };
  check('adopt: the load ADOPTED the standing ground — kind puzzle, THE ring pinned',
    o.kind === 'puzzle' && o.puzzle === 'grave_exhumation', JSON.stringify(o));
  check('adopt: the standing kind\'s own laws apply (chest banks, roads open)',
    objectiveEarnsChest(g.zone.objective) === true && objectiveSeals(g.zone.objective) === false);
  const run = g.puzzles.find(r => r.isObjective);
  check('adopt: the placer bound THE exhumation ring as the objective run',
    !!run && run.kind.id === 'exhumation' && !run.done,
    run ? `${run.nodes.length} stones` : 'no run');
  check('adopt: the seal + the ask are ONE undug yard (mouth holds, ask open)',
    g.sidezoneSealHolds('lone_crypt_door') === true && g.objectiveDone === false);
  if (run) {
    const need = run.state.need as number;
    for (let d = 0; d < need; d++) {
      for (const n of run.nodes) {
        g.puzzleStruck(n, p, true);
        world.update(1 / 60);
      }
    }
    world.update(1 / 60); // one settling tick for the driver's bank
  }
  check('adopt: the REAL dig resolves the run and the STANDING driver banks the ask',
    !!run && run.done && g.objectiveDone === true && g.completedObjectives.has(zid));
  check('adopt: the same dig lifts the crypt\'s seal (ask and door, one loop)',
    g.sidezoneSealHolds('lone_crypt_door') === false);
  // Idempotence: the stamped kind survives a re-load byte-identically and
  // stays done ('puzzle' is not in ADOPT_CFG.overrides — never re-rolled).
  const stamped = JSON.stringify(g.zone.objective);
  g.loadZone(before);
  g.loadZone(zid);
  check('adopt: re-entry re-reads the SAME adopted ask and stays done',
    JSON.stringify(g.zone.objective) === stamped && g.objectiveDone === true);
}

console.log(failed ? `\nprobe_lonecrypt: ${failed} FAILED` : '\nprobe_lonecrypt: all OK');
process.exit(failed ? 1 : 0);
