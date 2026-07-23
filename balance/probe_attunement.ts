// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ATTUNEMENT + PUZZLE FABRICS end to end on the real
// engine (docs/engine/attunement.md + docs/engine/puzzles.md): tone reads
// off the ROLLED packet (conversions honored), the worn `attuned_<tone>`
// dressing, the both-sides pulse + its icd pacing, locked hearts, the three
// riddle kinds (lattice / refrain / chord + the shatter variant) driven
// through their host contract, and the REAL crystal-country zone: planted
// scenery voices, salted-stream riddle placement, resolveHit integration.
// Run: npx tsx balance/probe_attunement.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { mulberry32 } from '../src/sim/rng';
import type { BuildSpec } from '../src/sim/types';
import type { Actor } from '../src/engine/actor';
import type { Vec2 } from '../src/core/math';
import type { DamageType } from '../src/engine/stats';
import {
  attunedStatus, rollStartTone, toneAccepted, toneOfAmounts, TUNE_CFG,
} from '../src/engine/tuning';
import {
  pickKnockNode, PUZZLE_KINDS, PUZZLE_CFG, puzzleHumOf, puzzleKnockOf,
  puzzleSpillOf, type PuzzleHost, type PuzzleRun,
} from '../src/engine/puzzles';
import { mod } from '../src/engine/stats';
import { angleTo } from '../src/core/math';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const world = makeSimWorld('magician', 77031);
const spec: BuildSpec = {
  id: 'attune_probe', classId: 'magician', level: 10,
  skills: [
    { id: 'firebolt', level: 3 },
    { id: 'frost_nova', level: 3 },
    { id: 'spark', level: 3 },
    { id: 'prismatic_ray', level: 3 },
  ],
};
const warnings = applyBuild(world, spec, 8);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));

const p = world.player;
const step = (s: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < s; t += dt) world.update(dt);
};
const wears = (a: Actor, tone: DamageType): boolean =>
  a.statuses.some(s => s.id === attunedStatus(tone));
const cast = (skillId: string, at: Vec2): void => {
  const inst = p.skills.find(s => s?.def.id === skillId);
  if (!inst) { check(`cast: '${skillId}' on the bar`, false); return; }
  p.fillResources();
  p.cooldowns.delete(skillId);
  world.useSkill(p, inst, { x: at.x, y: at.y });
  step(0.9); // wind-up + projectile flight + resolution
};

// --- 0) pure tone helpers ----------------------------------------------------
check('toneOfAmounts: argmax wins', toneOfAmounts({ fire: 3, cold: 9, physical: 1 }) === 'cold');
check('toneOfAmounts: ties break by DAMAGE_TYPES order (ground state first)',
  toneOfAmounts({ physical: 5, fire: 5 }) === 'physical');
check('toneOfAmounts: an empty packet is toneless', toneOfAmounts({}) === null);
check('toneAccepted: an allow-list filters', !toneAccepted({ tones: ['fire'] }, 'cold')
  && toneAccepted({ tones: ['fire'] }, 'fire') && toneAccepted({}, 'chaos'));
{
  const rng = mulberry32(5);
  check('rollStartTone: no roll → the ground state', rollStartTone({}, rng) === 'physical');
  const rolled = rollStartTone({ roll: true, tones: ['fire', 'cold'] }, rng);
  check('rollStartTone: roll draws from the pool', rolled === 'fire' || rolled === 'cold');
}

// --- 1) the fabric in the arena: state, dressing, pulse, icd, locks ---------
const crystal = world.createMonster('resonant_crystal', 8, 'enemy');
crystal.pos = { x: p.pos.x + 60, y: p.pos.y };
world.actors.push(crystal);
const bystander = world.createMonster('zombie', 8, 'enemy');
bystander.pos = { x: p.pos.x - 90, y: p.pos.y };
bystander.aiAwakened = false;
world.actors.push(bystander);
step(0.1);

check('boot: a fresh crystal wakes in the ground state',
  crystal.tone === 'physical', `tone=${crystal.tone}`);
check('boot: and WEARS it (attuned_physical held)', wears(crystal, 'physical'));

p.facing = 0;
cast('firebolt', crystal.pos);
check('strike: fire attunes the crystal to fire', crystal.tone === 'fire', `tone=${crystal.tone}`);
check('strike: the old dressing sheds with the tone',
  wears(crystal, 'fire') && !wears(crystal, 'physical'));
check('pulse: the striker is washed (attuned_fire on the player)', wears(p, 'fire'));
check('pulse: allies and enemies ALIKE (the bystander zombie too)', wears(bystander, 'fire'));

// Immediately re-tune COLD: state moves, but the wash is icd-paced —
// nobody near gains attuned_cold inside TUNE_CFG.pulseIcd.
cast('frost_nova', p.pos);
check('re-tune: cold takes the state at once', crystal.tone === 'cold', `tone=${crystal.tone}`);
check(`pulse icd (${TUNE_CFG.pulseIcd}s): the immediate re-ring is swallowed`,
  !wears(p, 'cold') && !wears(bystander, 'cold'));

// Same-tone hits leave the state alone.
cast('frost_nova', p.pos);
check('same-tone: a cold hit on a cold crystal changes nothing', crystal.tone === 'cold');

// Re-tune LIGHTNING past the icd window. Spark is a fan of ERRATIC
// projectiles — a single volley can honestly miss a 15px crystal, so the
// probe presses the attack (up to 3 fans) exactly as a player would; the
// assertion stays "a landed lightning hit takes the state".
for (let volley = 0; volley < 3 && crystal.tone !== 'lightning'; volley++) {
  cast('spark', crystal.pos);
}
check('re-tune: lightning takes the state after the icd window', crystal.tone === 'lightning');

// The prismatic ray: all three elements in one packet — lands SOME element.
const fresh = world.createMonster('resonant_crystal', 8, 'enemy');
fresh.pos = { x: p.pos.x + 70, y: p.pos.y + 10 };
world.actors.push(fresh);
step(0.1);
cast('prismatic_ray', fresh.pos);
check('prismatic ray: the split beam attunes to an ELEMENT',
  fresh.tone === 'fire' || fresh.tone === 'cold' || fresh.tone === 'lightning',
  `tone=${fresh.tone}`);

// A locked heart holds its rolled note against any blow.
const heart = world.createMonster('heart_crystal', 8, 'enemy');
heart.pos = { x: p.pos.x - 20, y: p.pos.y - 120 };
world.actors.push(heart);
step(0.1);
const heartTone = heart.tone;
check('heart: wakes attuned to a rolled element',
  heartTone === 'fire' || heartTone === 'cold' || heartTone === 'lightning',
  `tone=${heartTone}`);
cast('firebolt', heart.pos);
cast('frost_nova', p.pos);
check('heart: locked — strikes never move its note', heart.tone === heartTone,
  `tone=${heart.tone}`);

// --- 2) the riddle kinds, driven through their host contract ----------------
const mkHost = (): PuzzleHost & { completed: PuzzleRun[] } => {
  const done: PuzzleRun[] = [];
  const host: PuzzleHost & { completed: PuzzleRun[] } = {
    completed: done,
    now: () => world.time,
    rng: mulberry32(99),
    flash: () => { /* silent probe */ },
    say: () => { /* silent probe */ },
    setTone: (n, tone) => {
      if (n.tone === tone) return;
      if (n.tone) n.endStatus(attunedStatus(n.tone));
      n.tone = tone;
      n.applyStatus(attunedStatus(tone), 0, TUNE_CFG.holdScale, 'attunement');
    },
    kindle: (n, secs) => n.applyStatus(PUZZLE_CFG.kindleStatus, 0, secs, 'the refrain'),
    quench: n => n.endStatus(PUZZLE_CFG.kindleStatus),
    heroNear: () => true,
    complete: run => { run.done = true; done.push(run); },
  };
  return host;
};
const mkNodes = (defId: string, n: number, runId: string): Actor[] => {
  const out: Actor[] = [];
  for (let i = 0; i < n; i++) {
    const m = world.createMonster(defId, 8, 'enemy');
    m.pos = { x: 400 + (i % 3) * 66, y: 400 + Math.floor(i / 3) * 66 };
    m.puzzleNode = { id: runId, idx: i };
    world.actors.push(m);
    out.push(m);
  }
  return out;
};

// LATTICE: toggle shape + solvable boot + completion latch.
{
  const kind = PUZZLE_KINDS['lattice'];
  const host = mkHost();
  const run: PuzzleRun = {
    id: 'probe_lattice#0', spec: { kind: 'lattice', grid: [3, 3] }, kind,
    at: { x: 466, y: 466 }, nodes: mkNodes('lattice_crystal', 9, 'probe_lattice#0'),
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run, host);
  const lit = run.state.lit as boolean[];
  check('lattice: boots scrambled, never solved', lit.some(v => !v));
  check('lattice: the board wears its state (lit=lightning, dark=ground)',
    run.nodes.every((n, i) => n.tone === (lit[i] ? 'lightning' : 'physical')));
  const before = [...lit];
  kind.struck!(run, run.nodes[4], host, p); // center press
  const flippedIdx = lit.map((v, i) => v !== before[i] ? i : -1).filter(i => i >= 0).sort((a, b) => a - b);
  check('lattice: a center press toggles the plus-shape', flippedIdx.join(',') === '1,3,4,5,7',
    `flipped=[${flippedIdx}]`);
  // Manual end-state surgery: all lit but one corner, then press... a lone
  // dark cell is not always one press from solved — instead assert the
  // completion LATCH directly: set solved-minus-center, press center's
  // inverse pattern via state, then a real winning press.
  lit.fill(true);
  lit[4] = false; lit[1] = false; lit[3] = false; lit[5] = false; lit[7] = false;
  for (let i = 0; i < 9; i++) {
    host.setTone(run.nodes[i], lit[i] ? 'lightning' : 'physical');
  }
  kind.struck!(run, run.nodes[4], host, p); // flips the plus → all kindled
  check('lattice: kindling the last cells resolves the riddle',
    run.done && host.completed.length === 1);
}

// REFRAIN: play → answer → wrong-note replay → clean solve.
{
  const kind = PUZZLE_KINDS['refrain'];
  const host = mkHost();
  const run: PuzzleRun = {
    id: 'probe_refrain#0', spec: { kind: 'refrain', rounds: [3, 3], beat: 0.3 }, kind,
    at: { x: 700, y: 400 }, nodes: mkNodes('chime_crystal', 4, 'probe_refrain#0'),
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run, host);
  const seq = run.state.seq as number[];
  check('refrain: boots a 3-note sequence with no immediate repeats',
    seq.length === 3 && seq.every((v, i) => i === 0 || v !== seq[i - 1]), `seq=[${seq}]`);
  // Drive the playback with real world time.
  for (let guard = 0; guard < 200 && run.state.phase !== 'answer'; guard++) {
    kind.tick!(run, host, 1 / 20);
    step(0.05);
  }
  check('refrain: the song plays through, then LISTENS', run.state.phase === 'answer');
  // A wrong first note falters back to playback.
  const wrong = (seq[0] + 1) % run.nodes.length;
  kind.struck!(run, run.nodes[wrong], host, p);
  check('refrain: a wrong note replays the song', run.state.phase === 'play' && run.state.progress === 0);
  for (let guard = 0; guard < 200 && run.state.phase !== 'answer'; guard++) {
    kind.tick!(run, host, 1 / 20);
    step(0.05);
  }
  for (const idx of seq) kind.struck!(run, run.nodes[idx], host, p);
  check('refrain: answering in order resolves the riddle',
    run.done && host.completed.length === 1);
}

// CHORD: hearted goal-matching + the heartless shatter boot.
{
  const kind = PUZZLE_KINDS['chord'];
  const host = mkHost();
  const cheart = world.createMonster('heart_crystal', 8, 'enemy');
  cheart.pos = { x: 900, y: 420 };
  world.actors.push(cheart);
  host.setTone(cheart, 'fire');
  const run: PuzzleRun = {
    id: 'probe_chord#0', spec: { kind: 'chord' }, kind,
    at: { x: 900, y: 400 }, nodes: mkNodes('chord_crystal', 4, 'probe_chord#0'),
    heart: cheart, state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run, host);
  check('chord: the heart\'s note is the goal', run.state.goal === 'fire');
  for (let i = 0; i < 3; i++) {
    host.setTone(run.nodes[i], 'fire');
    kind.tuned!(run, run.nodes[i], host, 'fire');
  }
  check('chord: three of four voices — unresolved', !run.done);
  host.setTone(run.nodes[3], 'fire');
  kind.tuned!(run, run.nodes[3], host, 'fire');
  check('chord: the last voice joins — resolved', run.done && host.completed.length === 1);

  // The shatter variant: heartless, goal physical, ring boots MISTUNED.
  const host2 = mkHost();
  const run2: PuzzleRun = {
    id: 'probe_shatter#0', spec: { kind: 'chord', heart: false, tones: ['physical'] }, kind,
    at: { x: 1100, y: 400 }, nodes: mkNodes('chord_crystal', 3, 'probe_shatter#0'),
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run2, host2);
  check('shatter: heartless chord pins the ground state as its goal',
    run2.state.goal === 'physical');
  check('shatter: the ring boots MISTUNED (work to do)',
    run2.nodes.every(n => n.tone !== 'physical'));
}

// --- 3) the REAL crystal country: scenery voices + salted riddles ------------
{
  const zid = world.devMintTileset('crystal', 0, 8, { seed: 424242 });
  check('country: the crystal zone mints', !!zid, zid ?? 'null');
  const voices = world.actors.filter(a => !a.dead && a.defId === 'resonant_crystal');
  check('country: the scenery lane planted its voices (3–5)',
    voices.length >= 3 && voices.length <= 5, `${voices.length} voices`);
  const views = world.puzzleViews();
  check('country: riddle placement stays inside the cap',
    views.length <= PUZZLE_CFG.maxPerZone, `${views.length} runs`);
  check('country: every placed riddle reads out a HUD line',
    views.every(v => v.line.length > 3 && v.label.length > 3));
  // resolveHit integration in a REAL zone: strike a planted voice.
  const voice = voices[0];
  if (voice) {
    p.pos = { x: voice.pos.x - 60, y: voice.pos.y };
    cast('firebolt', voice.pos);
    check('country: a real blow tunes a planted voice', voice.tone === 'fire',
      `tone=${voice.tone}`);
  }
  // The singing face: spires stand and carry the toll rule.
  const zid2 = world.devMintTileset('crystal', 1, 8, { seed: 90210, variant: 'singing spires' });
  check('country: the singing-spires face mints', !!zid2);
  const spires = world.doodads.filter(d => d.kind === 'crystal_spire');
  check('country: the needle country raises its chorus (6+)', spires.length >= 6,
    `${spires.length} spires`);
}

// --- 4) THE ROUTING LAWS — knock, spill, hum (the resolveHit seam) ----------
// The kinds above were unit-driven; this lane exercises World's REAL knock
// queue and per-frame drain (private, reached the headless way) with runs
// ENROLLED in world.puzzles — docs/engine/puzzles.md "The knock, the spill,
// the hum".
{
  type WorldGuts = {
    puzzles: PuzzleRun[];
    puzzleHost(): PuzzleHost;
    puzzleStruck(node: Actor, striker: Actor | null, wounding: boolean): void;
  };
  const guts = world as unknown as WorldGuts;
  // Remember REAL in-zone ground for the cast-driven tests at the end —
  // projectiles need legal air; the queue-driven tests don't.
  const home = { x: p.pos.x, y: p.pos.y };
  // Park the hero on quiet ground far from the spires — these tests need
  // stepping, not survival.
  p.invulnerable = true;
  p.pos = { x: -4000, y: -4000 };
  const courtNodes = (defId: string, runId: string, n: number, at: Vec2, ringR: number): Actor[] => {
    const out: Actor[] = [];
    for (let i = 0; i < n; i++) {
      const m = world.createMonster(defId, 8, 'enemy');
      const ang = (i / n) * Math.PI * 2;
      m.pos = { x: at.x + Math.cos(ang) * ringR, y: at.y + Math.sin(ang) * ringR };
      m.puzzleNode = { id: runId, idx: i };
      world.actors.push(m);
      out.push(m);
    }
    return out;
  };
  const sing = (run: PuzzleRun): void => {
    for (let guard = 0; guard < 600 && run.state.phase !== 'answer'; guard++) {
      world.update(1 / 60);
    }
  };

  // pickKnockNode, bare: facing decides; striker-less keeps arrival order.
  {
    const a = world.createMonster('chime_crystal', 8, 'enemy');
    const b = world.createMonster('chime_crystal', 8, 'enemy');
    a.pos = { x: p.pos.x + 80, y: p.pos.y };
    b.pos = { x: p.pos.x - 80, y: p.pos.y };
    p.facing = Math.PI; // facing b
    check('spill pick: the faced bell wins', pickKnockNode([a, b], p) === b);
    check('spill pick: a striker-less knock keeps arrival order',
      pickKnockNode([a, b], null) === a);
  }

  // A refrain enrolled in the WORLD's ledger, all dials at their defaults.
  const kind = PUZZLE_KINDS['refrain'];
  const rNodes = courtNodes('chime_crystal', 'probe_route#0', 4, p.pos, 112);
  const run: PuzzleRun = {
    id: 'probe_route#0', spec: { kind: 'refrain', rounds: [3, 3], beat: 0.25 }, kind,
    at: { x: p.pos.x, y: p.pos.y }, nodes: rNodes,
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run, guts.puzzleHost());
  guts.puzzles.push(run);
  check('dials: a bare spec resolves the config defaults',
    puzzleKnockOf(run) === PUZZLE_CFG.knock && puzzleSpillOf(run) === PUZZLE_CFG.spill
    && puzzleHumOf(run) === PUZZLE_CFG.hum);
  sing(run);
  check('route: the enrolled refrain plays through the WORLD tick',
    run.state.phase === 'answer');
  const seq = run.state.seq as number[];

  // THE SPILL LAW: one blow (same striker, same instant) knocks a stray
  // bell AND the right one — arc order even lands the stray FIRST — yet
  // only the AIMED bell is judged: no falter.
  const right = rNodes[seq[0]];
  const stray = rNodes[(seq[0] + 1) % rNodes.length];
  p.facing = angleTo(p.pos, right.pos);
  guts.puzzleStruck(stray, p, true);
  guts.puzzleStruck(right, p, true);
  world.update(1 / 60);
  check('spill: a two-bell blow rings only the AIMED bell — no falter',
    run.state.phase === 'answer' && run.state.progress === 1,
    `phase=${run.state.phase} progress=${run.state.progress}`);

  // THE HUM: the just-judged bell swallows its own echo (a re-knock one
  // frame later would otherwise judge as the NEXT note and falter).
  guts.puzzleStruck(right, p, true);
  world.update(1 / 60);
  check('hum: the answered bell swallows its echo — progress holds',
    run.state.phase === 'answer' && run.state.progress === 1,
    `phase=${run.state.phase} progress=${run.state.progress}`);

  // A DIFFERENT bell rings straight through — and clears the old hum, so
  // a legitimate return (A,B,A) is legal at any speed.
  const second = rNodes[seq[1]];
  p.facing = angleTo(p.pos, second.pos);
  guts.puzzleStruck(second, p, true);
  world.update(1 / 60);
  check('hum: a different bell rings through', run.state.progress === 2,
    `progress=${run.state.progress}`);
  check('hum: the ledger holds only the LAST-rung bell',
    run.hums.size === 1 && (run.hums.get(second.id) ?? 0) > world.time);
  const third = rNodes[seq[2]];
  p.facing = angleTo(p.pos, third.pos);
  guts.puzzleStruck(third, p, true);
  world.update(1 / 60);
  check('route: the song resolves through the world drain', run.done);

  // Dialed run: spill 'all' + knock 'wounding' prove the overrides.
  const at2 = { x: p.pos.x + 900, y: p.pos.y };
  const rNodes2 = courtNodes('chime_crystal', 'probe_route#1', 4, at2, 112);
  const run2: PuzzleRun = {
    id: 'probe_route#1',
    spec: { kind: 'refrain', rounds: [3, 3], beat: 0.25, spill: 'all', knock: 'wounding' },
    kind, at: at2, nodes: rNodes2,
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  kind.boot(run2, guts.puzzleHost());
  guts.puzzles.push(run2);
  check('dials: spec overrides outrank the defaults',
    puzzleSpillOf(run2) === 'all' && puzzleKnockOf(run2) === 'wounding');
  p.pos = { x: at2.x, y: at2.y }; // in earshot of the second court
  sing(run2);
  const seq2 = run2.state.seq as number[];
  check('route: the dialed refrain reaches its answer phase',
    run2.state.phase === 'answer');

  // knock 'wounding': a bloodless landed blow is refused by the dial.
  guts.puzzleStruck(rNodes2[seq2[0]], p, false);
  world.update(1 / 60);
  check("knock 'wounding': a bloodless knock is refused",
    run2.state.phase === 'answer' && run2.state.progress === 0);

  // spill 'all': the fan-out keeps every bell — a TRULY stray note (never
  // the current answer, never the next) falters the song.
  const strayIdx2 = [0, 1, 2, 3].find(i => i !== seq2[0] && i !== seq2[1])!;
  p.facing = angleTo(p.pos, rNodes2[seq2[0]].pos);
  guts.puzzleStruck(rNodes2[seq2[0]], p, true);
  guts.puzzleStruck(rNodes2[strayIdx2], p, true);
  world.update(1 / 60);
  check("spill 'all': every bell of the blow is judged — the stray falters",
    run2.state.phase === 'play', `phase=${run2.state.phase}`);

  // THE WHO GATE survives the queue: an enemy's knock never plays.
  sing(run2);
  const foe = world.createMonster('zombie', 8, 'enemy');
  foe.pos = { x: at2.x, y: at2.y };
  world.actors.push(foe);
  guts.puzzleStruck(rNodes2[(seq2[0] + 1) % 4], foe, true);
  world.update(1 / 60);
  check('who gate: an enemy knock is refused at the drain',
    run2.state.phase === 'answer' && run2.state.progress === 0,
    `phase=${run2.state.phase} progress=${run2.state.progress}`);

  // THE KNOCK LAW end to end: a FULL-FORGO hit (hitToAffliction 1 — the
  // septic carrier, dealt 0) still presses an enrolled board and still
  // PAINTS a tuned voice, through the real resolveHit — on REAL in-zone
  // ground (a bolt into the void never lands).
  const at3 = { x: home.x, y: home.y + 140 };
  const lNodes = courtNodes('lattice_crystal', 'probe_route#2', 9, at3, 90);
  const lkind = PUZZLE_KINDS['lattice'];
  const lrun: PuzzleRun = {
    id: 'probe_route#2', spec: { kind: 'lattice', grid: [3, 3] }, kind: lkind,
    at: at3, nodes: lNodes,
    state: {}, hums: new Map(), done: false, isObjective: false,
  };
  lkind.boot(lrun, guts.puzzleHost());
  guts.puzzles.push(lrun);
  p.sheet.setSource('probe_septic', [mod('hitToAffliction', 'flat', 1)]);
  const cell = lNodes[0];
  const before = (lrun.state.lit as boolean[]).join('');
  p.pos = { x: cell.pos.x - 60, y: cell.pos.y };
  cast('firebolt', cell.pos);
  const after = (lrun.state.lit as boolean[]).join('');
  check('knock law: a full-forgo hit still presses the board', before !== after,
    `lit ${before} -> ${after}`);
  const septicVoice = world.createMonster('resonant_crystal', 8, 'enemy');
  septicVoice.pos = { x: p.pos.x + 70, y: p.pos.y - 40 };
  world.actors.push(septicVoice);
  step(0.1);
  cast('firebolt', septicVoice.pos);
  check('knock law: the full-forgo carrier still paints a tuned voice',
    septicVoice.tone === 'fire', `tone=${septicVoice.tone}`);
  p.sheet.removeSource('probe_septic');
  p.invulnerable = false;
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
