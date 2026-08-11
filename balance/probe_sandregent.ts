// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SAND REGENT'S PHASE SCRIPT: the desert Unsealing's
// capstone (src/packages/defs/unsealing.ts) carries the flagship v1 HP-LADDER
// phase pair (engine/brain.ts BrainPhase — one-way, deepest-threshold wins)
// and no rig had ever fired it. Everything is read off the DEF — thresholds,
// husk counts, rings, the announce line, the summoned id, the capstone
// rarity — so the probe notices when the data changes instead of restating it.
// Pins:
//   S) static: the def stands (authored boss, a ladder of >= 2 rungs,
//      thresholds strictly descending so array order IS depth order, every
//      summoned id resolves, each rung mints, the first rung SPEAKS — the
//      authored honor-guard beat), and the Unsealing surge names this def.
//   A) THE LADDER FIGHT on the real engine — the real spawn shape
//      (createMonster + the kill-row tag + promoteMonster at the surge's
//      rarity) driven by REAL resolveHit blows through shell/resists, never
//      a boss.life assignment:
//      A1 crossing rung 1 fires it EXACTLY once — the def's count of husks
//         on the enemy team, seated on the def's ring around the boss, the
//         announce genuinely surfaced on world.texts;
//      A2 a heal back to full and a REAL re-cross re-fire NOTHING (the
//         one-way ladder under honest life jitter);
//      A3 each deeper rung appends exactly its own count (shallow rungs
//         never re-fire, no unauthored announce);
//      A4 the fight completes: driven to death, the kill lands CREDITED
//         (world.kills, the '+N xp' floater) and the standing guard
//         outlives its summoner (wild summons stand on their own).
//   B) THE OVERKILL LAW (fresh world): held above the FIRST threshold with
//      the ladder unfired, ONE landed blow crossing every threshold at once
//      enters ONLY the deepest rung — deepest-threshold wins by construction
//      (brain.ts "kept intact: one-way, deepest-threshold wins"), so the
//      shallow rung is SKIPPED: its bodies never mint and its announce never
//      sounds, not even late. The ladder is also an AI-TICK law: right after
//      the blow, before any tick, the index still reads unfired.
// SIM LAW (probe_highcourt's lane): world.update never runs brains headless —
// the rig ticks updateAI itself. Between blows NO world.update runs, so burn
// DoTs and shell regen never move life behind the rig's back: every crossing
// is authored by a resolved hit.
// CALIBRATION: with the shell broken, life-out is affine in a blow's flat
// rider (out = r*(F + R)); two ten-blow means solve the map exactly, so the
// drives and the single overkill blow are AIMED off the def's own numbers,
// never magic constants. The hero's crit is zeroed so the map holds.
// Run: npx tsx balance/probe_sandregent.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom, deriveSeed } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { UNSEALING_SURGE } from '../src/packages/defs/unsealing';
import { dist, vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import type { AIAction, BrainPhase } from '../src/engine/brain';

const SEED = 0x5a4d3e;
const DT = 1 / 60;
const RING_TOL = 14;   // groundPoint bedding + <=1 tick of boss drift
const HIT_CAP = 6000;  // hard wall on any drive loop — a stuck fight fails loudly

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(SEED);

// --- the def, read whole (content is DATA — the probe drives what it reads) --
const REGENT_ID = UNSEALING_SURGE.regent.monsterId;
const DEF = MONSTERS[REGENT_ID];
type SummonAct = { do: 'summon'; monster: string; count?: number; ring?: number; announce?: string };
const isSummon = (a: AIAction): a is SummonAct => a.do === 'summon';
const PHASES: BrainPhase[] = ((DEF?.brain ?? {}) as { phases?: BrainPhase[] }).phases ?? [];
const RUNGS = PHASES.map(ph => {
  const rows = (ph.onEnter ?? []).filter(isSummon);
  return {
    frac: ph.atLifeFrac,
    count: rows.reduce((s, r) => s + (r.count ?? 1), 0),
    rings: rows.map(r => r.ring ?? 140), // 140 = the summon verb's own default
    monsters: rows.map(r => r.monster),
    announces: rows.flatMap(r => (r.announce ? [r.announce] : [])),
  };
});
const ALL_ANNOUNCES = new Set(RUNGS.flatMap(r => r.announces));
const HUSK_IDS = new Set(RUNGS.flatMap(r => r.monsters));

// ========================================================= S) the script stands
{
  check('S1 the Unsealing capstone def resolves and is the authored boss',
    !!DEF && DEF.boss === true, REGENT_ID);
  check('S2 the ladder stands (>= 2 rungs — the authored two-beat honor guard)',
    PHASES.length >= 2, `${PHASES.length} rung(s)`);
  check('S3 thresholds strictly descend (array order IS depth order — the deepest-wins scan rides it)',
    PHASES.every((p, i) => i === 0 || p.atLifeFrac < PHASES[i - 1].atLifeFrac),
    PHASES.map(p => p.atLifeFrac).join(' > '));
  check('S4 every rung mints (>= 1 body) and every summoned id resolves',
    RUNGS.length > 0 && RUNGS.every(r => r.count >= 1)
      && [...HUSK_IDS].every(id => !!MONSTERS[id]),
    RUNGS.map(r => `${r.count}@${r.frac}`).join(', ') || 'no rungs');
  check('S5 the first rung SPEAKS (the authored announce) and every ring is positive',
    (RUNGS[0]?.announces.length ?? 0) >= 1 && RUNGS.every(r => r.rings.every(g => g > 0)),
    RUNGS[0]?.announces[0] ?? 'no announce');
}

// =============================================================== the fight rig
/** Stand the regent the way materializeUnsealing stands it (createMonster →
 *  pos → the kill-row tag → promoteRarity at the surge's word → push), with
 *  the hero an outliving anvil whose crit is zeroed (the blow map's one ask). */
function stage(lane: number) {
  seedGlobalRandom(deriveSeed(SEED, lane));
  const world = makeSimWorld('warrior', deriveSeed(SEED, lane));
  const w = world as any; // resolveHit is private — the holdfast/warfront lane
  const p = world.player;
  p.sheet.setBase('life', 90000); p.life = 90000; // outlives every court
  p.sheet.setBase('critChance', 0);               // no 1.5x outliers in the map
  const boss = world.createMonster(REGENT_ID, 14, 'enemy');
  boss.pos = vec(p.pos.x + 260, p.pos.y);
  boss.tag = REGENT_ID;
  world.promoteMonster(boss, UNSEALING_SURGE.regent.rarity, 1, { distinctName: false });
  world.actors.push(boss);
  const inst = makeSkillInstance(SKILLS.firebolt ?? SKILLS.cleave, 1);

  // The announce ledger: every matching float counted ONCE by object identity,
  // swept after every tick — decay can never hide a line that surfaced.
  const seen = new Set<object>();
  const heard = new Map<string, number>();
  const sweep = (): void => {
    for (const t of world.texts as { text: string }[]) {
      if (!ALL_ANNOUNCES.has(t.text) || seen.has(t)) continue;
      seen.add(t);
      heard.set(t.text, (heard.get(t.text) ?? 0) + 1);
    }
  };
  const heardCount = (s: string): number => heard.get(s) ?? 0;

  const fullStep = (n: number): void => { // the highcourt stepper (SIM LAW)
    for (let k = 0; k < n; k++) {
      for (const a of world.actors) if (!a.dead) updateAI(a, world, DT);
      world.update(DT);
      sweep();
    }
  };
  const bossTick = (n: number): void => { // brain-only ticks: life stays OURS
    for (let k = 0; k < n; k++) {
      if (!boss.dead) updateAI(boss, world, DT);
      sweep();
    }
  };
  const tickUntil = (pred: () => boolean, cap: number): boolean => {
    for (let k = 0; k < cap; k++) {
      if (pred()) return true;
      updateAI(boss, world, DT);
      sweep();
    }
    return pred();
  };
  const hit = (flat: number): void => {
    w.resolveHit(p, inst, boss, 1, 0, flat > 0 ? { fire: flat } : undefined);
  };
  const husks = (): Actor[] =>
    (world.actors as Actor[]).filter(a => !a.dead && a.team === boss.team
      && a.defId !== undefined && HUSK_IDS.has(a.defId));
  return { world, p, boss, inst, hit, fullStep, bossTick, tickUntil, husks, heardCount, sweep };
}
type Rig = ReturnType<typeof stage>;
type BlowMap = { r: number; R: number };

/** Two-point blow map: break the shell (it eats raw input off the top), then
 *  M1 (ten plain blows: a = r*R) and M2 (ten ridden blows: b = r*(F+R)) —
 *  r = (b-a)/F exactly, the skill's own roll mean cancelled. */
function calibrate(s: Rig): BlowMap {
  const { boss, hit } = s;
  const max = boss.maxLife();
  const shellMax = DEF.shellGuard?.max ?? 0;
  let guard = 0;
  while (boss.life >= max - 0.5 && guard++ < 200) hit(Math.max(1, shellMax));
  const N = 10;
  const l0 = boss.life;
  for (let i = 0; i < N; i++) hit(0);
  const a = (l0 - boss.life) / N;
  const F = Math.max(20, max * 0.01);
  const l1 = boss.life;
  for (let i = 0; i < N; i++) hit(F);
  const b = (l1 - boss.life) / N;
  const r = (b - a) / F;
  return { r, R: r > 0 ? a / r : 0 };
}

/** Drive the boss with REAL blows to at-or-below `frac` of max (~0.25% of max
 *  per blow — the crossing can never skip a rung's band). Returns blows. */
function driveTo(s: Rig, cal: BlowMap, frac: number): number {
  const { boss, hit } = s;
  const max = boss.maxLife();
  const step = Math.max(0, (max * 0.0025) / cal.r - cal.R);
  let n = 0;
  while (!boss.dead && boss.life / max > frac && n < HIT_CAP) { hit(step); n++; }
  return n;
}

const SCRIPT_OK = !!DEF && PHASES.length >= 2 && RUNGS.every(r => r.count >= 1)
  && [...HUSK_IDS].every(id => !!MONSTERS[id]);
let calShared: BlowMap | null = null;

// ============================================================ A) the ladder fight
if (SCRIPT_OK) {
  const s = stage(1);
  const { boss, husks, heardCount } = s;
  const max0 = boss.maxLife();
  s.fullStep(30); // the fight is LIVE (the boss engages a real hero) before any wound
  check('A0 at full life nothing fires (no rung, no husk, no announce)',
    boss.aiPhaseIdx === -1 && husks().length === 0
      && RUNGS.every(r => r.announces.every(t => heardCount(t) === 0)),
    `idx ${boss.aiPhaseIdx}, husks ${husks().length}`);
  check('A0b the boss stands whole at the bell (full life, max unmoved)',
    Math.abs(boss.maxLife() - max0) < 0.5 && boss.life >= max0 - 0.5,
    `${Math.round(boss.life)}/${Math.round(max0)}`);

  seedGlobalRandom(deriveSeed(SEED, 11)); // firewall: drive draws never leak across sections
  const cal = calibrate(s);
  calShared = cal;
  check('A0c the damage pipeline is OPEN (the calibrated blow map is positive)',
    cal.r > 0.001 && boss.life / boss.maxLife() > RUNGS[0].frac,
    `r ${cal.r.toFixed(4)}, R ${cal.R.toFixed(2)}, frac ${(boss.life / boss.maxLife()).toFixed(3)}`);

  // --- A1: the first rung, honestly crossed ----------------------------------
  seedGlobalRandom(deriveSeed(SEED, 12));
  const before1 = new Set((s.world.actors as Actor[]).map(a => a.id));
  const hits1 = driveTo(s, cal, RUNGS[0].frac);
  const fired1 = s.tickUntil(() => boss.aiPhaseIdx >= 0, 300);
  const batch1 = husks().filter(h => !before1.has(h.id));
  check(`A1 crossing ${RUNGS[0].frac} fires rung 1 once: exactly ${RUNGS[0].count} of ${[...new Set(RUNGS[0].monsters)].join('/')} rise with the boss`,
    fired1 && boss.aiPhaseIdx === 0 && batch1.length === RUNGS[0].count
      && batch1.every(h => h.team === boss.team && h.noBounty === true),
    `idx ${boss.aiPhaseIdx}, batch ${batch1.length} after ${hits1} blows`);
  check('A1b the guard seats on the authored ring around the boss',
    batch1.length > 0 && batch1.every(h => {
      const d = dist(h.pos, boss.pos);
      return d >= Math.min(...RUNGS[0].rings) - RING_TOL
        && d <= Math.max(...RUNGS[0].rings) + RING_TOL;
    }),
    `seats ${batch1.map(h => Math.round(dist(h.pos, boss.pos))).join(',')} vs ring ${RUNGS[0].rings.join('/')}`);
  check('A1c the announce genuinely surfaces on the world\'s text stream, once',
    RUNGS[0].announces.every(t => heardCount(t) === 1),
    RUNGS[0].announces.map(t => `${heardCount(t)}x "${t}"`).join('; '));
  s.bossTick(45);
  check('A1d held under the threshold, the rung never re-mints (45 ticks)',
    husks().length === RUNGS[0].count && boss.aiPhaseIdx === 0,
    `husks ${husks().length}`);

  // --- A2: heal above, re-cross with real blows — the one-way law ------------
  seedGlobalRandom(deriveSeed(SEED, 13));
  boss.healBy(boss.maxLife());
  check('A2 the mend takes (life back above the first threshold)',
    boss.life / boss.maxLife() > RUNGS[0].frac, (boss.life / boss.maxLife()).toFixed(3));
  const hits2 = driveTo(s, cal, RUNGS[0].frac);
  s.bossTick(90);
  check('A2b the re-cross re-fires NOTHING (no new husk, no second announce, index held)',
    husks().length === RUNGS[0].count && boss.aiPhaseIdx === 0
      && RUNGS[0].announces.every(t => heardCount(t) === 1),
    `husks ${husks().length}, idx ${boss.aiPhaseIdx}, ${hits2} blows`);

  // --- A3: every deeper rung appends exactly its own count --------------------
  for (let ri = 1; ri < RUNGS.length; ri++) {
    seedGlobalRandom(deriveSeed(SEED, 20 + ri));
    const cum = RUNGS.slice(0, ri + 1).reduce((n, r) => n + r.count, 0);
    const beforeR = new Set((s.world.actors as Actor[]).map(a => a.id));
    const hitsR = driveTo(s, cal, RUNGS[ri].frac);
    const firedR = s.tickUntil(() => boss.aiPhaseIdx >= ri, 300);
    const batchR = husks().filter(h => !beforeR.has(h.id));
    check(`A3 crossing ${RUNGS[ri].frac} fires rung ${ri + 1} once: +${RUNGS[ri].count} guard (total ${cum}), shallow rungs silent`,
      firedR && boss.aiPhaseIdx === ri && batchR.length === RUNGS[ri].count
        && husks().length === cum
        && RUNGS[ri].announces.every(t => heardCount(t) === 1)
        && RUNGS.slice(0, ri).every(r => r.announces.every(t => heardCount(t) === 1)),
      `idx ${boss.aiPhaseIdx}, +${batchR.length} after ${hitsR} blows, total ${husks().length}`);
    check(`A3b rung ${ri + 1}'s guard seats on its authored ring`,
      batchR.length > 0 && batchR.every(h => {
        const d = dist(h.pos, boss.pos);
        return d >= Math.min(...RUNGS[ri].rings) - RING_TOL
          && d <= Math.max(...RUNGS[ri].rings) + RING_TOL;
      }),
      `seats ${batchR.map(h => Math.round(dist(h.pos, boss.pos))).join(',')}`);
  }

  // --- A4: the fight completes to a credited kill -----------------------------
  seedGlobalRandom(deriveSeed(SEED, 15));
  const kills0 = s.world.kills;
  const guard0 = husks().length;
  const hits4 = driveTo(s, cal, 0);
  const xpFloat = (s.world.texts as { text: string; kind?: string }[])
    .some(t => t.kind === 'xp' && /^\+\d+ xp$/.test(t.text));
  check('A4 driven to death: the kill lands CREDITED (kills counted, the xp floater pays)',
    boss.dead && s.world.kills === kills0 + 1 && xpFloat,
    `${hits4} blows, kills ${kills0}->${s.world.kills}, xp float ${xpFloat}`);
  check('A4b the ladder ended on its last rung and the guard outlives its summoner',
    boss.aiPhaseIdx === PHASES.length - 1 && husks().length === guard0,
    `idx ${boss.aiPhaseIdx}, guard ${husks().length}/${guard0}`);
  s.fullStep(20); // the world marches on around the corpse — no throw, guard stands
  check('A4c twenty full frames later the guard still stands (wild summons own their lives)',
    husks().length === guard0, `${husks().length}`);
} else {
  console.log('(live rigs skipped — the static script gate failed)');
}

// ============================================================ B) the overkill law
if (SCRIPT_OK && calShared && calShared.r > 0.001) {
  const s = stage(2);
  const { boss, husks, heardCount } = s;
  s.fullStep(30);
  seedGlobalRandom(deriveSeed(SEED, 31));
  const cal = calShared; // same content, same hero build — the map transfers
  const max = boss.maxLife();
  const tLast = RUNGS[RUNGS.length - 1].frac;
  const deepIdx = PHASES.length - 1;
  // Soften to just ABOVE the first threshold with granular blows — the loop
  // reads life directly, so the fresh shell/full-poise regimes only shrink
  // the steps (a fresh bar shaves poiseDR off every blow until it breaks;
  // the scratch curve showed blow 1 lands ~1.0x and blows 2+ settle on the
  // calibrated map). The ladder never moves: no AI tick runs in here.
  const hold = Math.min(0.95, RUNGS[0].frac + 0.06);
  driveTo(s, cal, hold);
  const fracBefore = boss.life / max;
  check('B0 the approach holds above the FIRST threshold with the ladder unfired',
    fracBefore > RUNGS[0].frac && boss.aiPhaseIdx === -1 && husks().length === 0,
    `frac ${fracBefore.toFixed(3)}, idx ${boss.aiPhaseIdx}`);
  // ONE blow sized in the now-settled regime to land mid-band below the
  // DEEPEST threshold — it must cross every rung's band in a single hit.
  const F = Math.max(1, ((fracBefore - tLast / 2) * max) / cal.r - cal.R);
  const lifeBefore = boss.life;
  let swings = 0;
  while (boss.life >= lifeBefore - 0.5 && swings < 5) { s.hit(F); swings++; }
  const fracAfter = boss.life / max;
  check('B1 ONE landed blow crosses EVERY threshold, leaves the boss standing — and the ladder is an AI-tick law (unfired before any tick)',
    !boss.dead && boss.life > 0 && fracAfter <= tLast && boss.aiPhaseIdx === -1,
    `frac ${fracBefore.toFixed(3)}->${fracAfter.toFixed(3)} after ${swings} swing(s), idx ${boss.aiPhaseIdx}`);
  const fired = s.tickUntil(() => boss.aiPhaseIdx >= 0, 300);
  check('B2 the ladder answers with the DEEPEST rung alone (deepest-threshold wins)',
    fired && boss.aiPhaseIdx === deepIdx && husks().length === RUNGS[deepIdx].count,
    `idx ${boss.aiPhaseIdx}, husks ${husks().length} (deep rung ${RUNGS[deepIdx].count})`);
  s.bossTick(45);
  check('B3 the skipped shallow rung NEVER fires late — bodies unminted, announce unspoken',
    husks().length === RUNGS[deepIdx].count
      && RUNGS.slice(0, deepIdx).every(r => r.announces.every(t => heardCount(t) === 0)),
    `husks ${husks().length}, shallow announces ${RUNGS.slice(0, deepIdx)
      .flatMap(r => r.announces).map(t => `${heardCount(t)}x`).join(',') || 'none authored'}`);
} else if (SCRIPT_OK) {
  console.log('(overkill rig skipped — no calibrated blow map)');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 2 : 0);
