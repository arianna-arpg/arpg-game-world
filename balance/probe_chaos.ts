// ---------------------------------------------------------------------------
// THE CHAOS PROBE (docs/design/npc-ai-direction.md, phase 8).
//   A. The rows: none carries nothing, and steady, restless and feral each surprise more in
//      every dial; the default is a real row; the reaction window is the plan's 0.35 s.
//   B. Who carries one: an ordinary intent body carries the default, a dim mind (mindless
//      feet) none, an authored row wins, and with the lever off no body carries one.
//   C. Absent means identical: the lever off fights exactly like a body that carries none,
//      and a dim mind fights the same with the lever on and off.
//   D. The budget: over long fights no body goes off book more often than its tokens allow,
//      at least 90% of decisions stay in character, and the prey's ledger never holds more
//      live surprises than the row allows (a steady pack surprises one hero one at a time).
//   E. The wind-up is sacred: every off-book cast has a bar, or a warned footprint, at least
//      0.35 s long, and its first hit lands no sooner.
//   F. Surprise pays: an off-book cast leaves the body planted for its extra recovery.
//   G. Chaos is earned: the knight carries restless from level 14 and steady below, and off
//      book its hands may cross its authored order for that one cast.
//   H. Same seed, same fight, with chaos on.
//   I. The ceiling: a row above steady is legal only on a body that wears the stance tells,
//      and content validation says so when it is not.
//   J. What a roll picks: with `pick: 'cut'` every roll that goes off book picks a cut
//      option, so more do, and never more than the tokens allow.
// Run: npx tsx balance/probe_chaos.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { CHAOS_BUDGETS, INTENT_CFG } from '../src/data/aiIntent';
import { MONSTERS } from '../src/data/monsters';
import { normalizeBrain, type BrainDef, type BrainTuning } from '../src/engine/brain';
import { chaosBudgetOf, intentOf, kitKeepChoice, offBookLive, windupOf } from '../src/engine/intent';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import type { SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { validateContent } from '../src/data/validate';
import { runEpisode } from '../src/sim/runner';
import { matchupDuel, pilotFor } from '../src/sim/data/scenarios';
import { ensureTierBuild } from '../src/sim/data/builds';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const build = ensureTierBuild('geared', 'warrior', 12);
const duel = (id: string, seed: number, level = 12, seconds = 25) =>
  runEpisode(matchupDuel(build, id, { level, duration: seconds, pilot: pilotFor('warrior'), idTag: 'chaos' }), seed);
const same = (a: ReturnType<typeof duel>, b: ReturnType<typeof duel>): boolean =>
  JSON.stringify(a.fingerprint) === JSON.stringify(b.fingerprint) && JSON.stringify(a.metrics) === JSON.stringify(b.metrics);
const withChaos = <T>(patch: Partial<typeof INTENT_CFG.chaos>, run: () => T): T => {
  const was = { ...INTENT_CFG.chaos };
  Object.assign(INTENT_CFG.chaos, patch);
  try { return run(); } finally { Object.assign(INTENT_CFG.chaos, was); }
};
const withBrain = <T>(id: string, edit: (b: BrainDef) => BrainDef, run: () => T): T => {
  const def = MONSTERS[id], brain = def.brain;
  def.brain = edit(brain ?? {});
  try { return run(); } finally { def.brain = brain; }
};
const { minBar, extraRecovery } = INTENT_CFG.chaos;
const WINDOW = 0.35; // the plan's reaction window
const barOf = (a: Actor, inst: SkillInstance): number => {
  const d = inst.def.delivery;
  return Math.max(windupOf(a, inst), d.type === 'ground' ? (d.delay ?? 0) : 0);
};

interface Seen {
  decisions: number; offBook: number; offAt: number[];
  casts: { id: string; name: string; at: number; bar: number; body: Actor; crossed: boolean; fresh: boolean }[];
  hits: { body: Actor; at: number; source: string }[];
  plants: number[]; maxTokens: number; maxLedger: number;
}

/** Bodies against a hero who stands still and cannot die, read every tick. */
function watch(ids: string[], seed: number, seconds: number, level: number,
  each?: (bodies: Actor[], t: number, hero: Actor) => void): Seen {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const bodies = ids.map((id, k) => {
    const b = w.createMonster(id, level, 'enemy');
    const ang = (k / ids.length) * Math.PI * 2;
    b.pos = { x: p.pos.x + Math.cos(ang) * 260, y: p.pos.y + Math.sin(ang) * 260 };
    b.tier = p.tier; b.facing = ang + Math.PI;
    return b;
  });
  w.actors = [p, ...bodies];
  const seen: Seen = { decisions: 0, offBook: 0, offAt: [], casts: [], hits: [], plants: [], maxTokens: 0, maxLedger: 0 };
  const pending = new Map<Actor, number>();
  const lastCast = new Map<Actor, Map<string, number>>();
  setSimTap({
    onDecide: (a, off) => { if (bodies.includes(a)) { seen.decisions++; if (off) { seen.offBook++; seen.offAt.push(w.time); } } },
    onCast: (a, inst) => {
      if (!bodies.includes(a)) return;
      const m = lastCast.get(a) ?? new Map<string, number>();
      m.set(inst.def.id, w.time);
      lastCast.set(a, m);
    },
    onOffBook: (a, inst) => {
      if (!bodies.includes(a)) return;
      const order = normalizeBrain(MONSTERS[a.defId!].brain ?? {}).base.skillUse?.order ?? [];
      const at = order.indexOf(inst.def.id);
      const d = Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y);
      // Crossed: a skill its author ranked higher stood ready, and in reach, when the hands
      // chose this one.
      const crossed = at > 0 && order.slice(0, at).some(id => {
        const s = a.skills.find(x => x?.def.id === id);
        return !!s && !a.cooldowns.has(id) && a.canAfford(a.skillCost(s)) && d <= (s.def.ai?.range ?? 0) + a.radius + p.radius;
      });
      // Fresh: no earlier cast of the same skill may still be on its way, so the next hit
      // that names it is this one's.
      const prev = lastCast.get(a)?.get(inst.def.id);
      const fresh = prev === undefined || w.time - prev > 2;
      seen.casts.push({ id: inst.def.id, name: inst.def.name, at: w.time, bar: barOf(a, inst), body: a, crossed, fresh });
      pending.set(a, w.time);
    },
    onHit: (a, target, result, packet) => {
      if (bodies.includes(a) && target === p && result.total > 0) seen.hits.push({ body: a, at: w.time, source: packet.sourceName });
    },
  });
  const dt = 1 / 60;
  try {
    for (let t = 0; t < seconds; t += dt) {
      w.applyInputs(new Map(), dt);
      for (const a of [...w.actors]) updateAI(a, w, dt);
      w.update(dt);
      for (const b of bodies) {
        seen.maxTokens = Math.max(seen.maxTokens, b.aiChaosAt >= 0 ? b.aiChaosTokens : 0);
        if (pending.has(b) && !b.casting) { seen.plants.push(b.aiPlantUntil - w.time); pending.delete(b); }
      }
      seen.maxLedger = Math.max(seen.maxLedger, offBookLive(p, w.time));
      each?.(bodies, w.time, p);
    }
  } finally { setSimTap(null); }
  return seen;
}

const WITCH = 'frost_witch'; // steady, weighted: frostbolt and ice spear both carry a readable bar
const KNIGHT = 'oblivion_knight'; // priority order despair → heavy_strike → cleave; restless from 14

// --- A) The rows ------------------------------------------------------------------------------
{
  const order = ['steady', 'restless', 'feral'].map(k => CHAOS_BUDGETS[k]);
  const rate = (r: (typeof order)[number]): number => r.regenSec ? r.tokens / r.regenSec : 0;
  check('none carries nothing', CHAOS_BUDGETS.none?.tokens === 0);
  check('each row surprises more than the last, in every dial', order.every((r, i) => i === 0 || (
    r.tokens >= order[i - 1].tokens && rate(r) > rate(order[i - 1]) && (r.rollPerThink ?? 0) > (order[i - 1].rollPerThink ?? 0)
    && (r.floor ?? 0) < (order[i - 1].floor ?? 0) && (r.perPrey ?? 1) >= (order[i - 1].perPrey ?? 1))));
  check('the default is a real row carrying tokens', (CHAOS_BUDGETS[INTENT_CFG.chaos.default]?.tokens ?? 0) > 0, INTENT_CFG.chaos.default);
  check('steady is one surprise per 16 s, one live per victim (the owner\'s decision 3)',
    CHAOS_BUDGETS.steady.tokens === 1 && CHAOS_BUDGETS.steady.regenSec === 16 && CHAOS_BUDGETS.steady.perPrey === 1);
  check('the reaction window is at least the plan\'s 0.35 s', minBar >= WINDOW, `${minBar}`);
  check('surprise pays a positive extra recovery', extraRecovery[0] > 0 && extraRecovery[1] >= extraRecovery[0], JSON.stringify(extraRecovery));
}

// --- B) Who carries one ---------------------------------------------------------------------------
{
  check('an ordinary intent body carries the default', chaosBudgetOf({}, false) === CHAOS_BUDGETS[INTENT_CFG.chaos.default]);
  check('a dim mind carries none', chaosBudgetOf({}, true) === undefined);
  check('an authored row wins', chaosBudgetOf({ chaos: 'restless' }, true) === CHAOS_BUDGETS.restless);
  check('a none row carries nothing', chaosBudgetOf({ chaos: 'none' }, false) === undefined);
  check('with the lever off no body carries one', withChaos({ enabled: false }, () => chaosBudgetOf({ chaos: 'feral' }, false)) === undefined);
  const dim = Object.keys(MONSTERS).filter(id => {
    const def = MONSTERS[id];
    if (!def.brain) return false;
    const base = normalizeBrain(def.brain).base;
    const spec = intentOf(base);
    return !!spec && base.move?.pathing === 'none' && !spec.chaos;
  });
  check('every intent body with mindless feet carries none', dim.length > 0 && dim.every(id => {
    const base = normalizeBrain(MONSTERS[id].brain!).base;
    return chaosBudgetOf(intentOf(base)!, true) === undefined;
  }), dim.join(', '));
}

// --- C) Absent means identical --------------------------------------------------------------------
{
  check('the lever off fights exactly like a body that carries none',
    same(withChaos({ enabled: false }, () => duel(WITCH, 0x81)), withChaos({ default: 'none' }, () => duel(WITCH, 0x81))));
  const dimmed = (b: BrainDef): BrainDef => ({ ...b, move: { ...(b.move ?? {}), pathing: 'none' } });
  check('a dim mind fights the same with the lever on and off',
    withBrain(WITCH, dimmed, () => same(withChaos({ enabled: false }, () => duel(WITCH, 0x82)), duel(WITCH, 0x82))));
  let differ = 0;
  for (const seed of [0x83, 0x84, 0x85, 0x86]) if (!same(withChaos({ enabled: false }, () => duel(WITCH, seed)), duel(WITCH, seed))) differ++;
  check('on, a witch\'s fight changes in some seeds', differ > 0, `${differ} of 4 seeds differ`);
}

// --- D) The budget, E) the wind-up, F) surprise pays ------------------------------------------------
{
  let decisions = 0, off = 0, over = 0, readable = 0, offCasts = 0, ownKit = 0, early = 0, hitsRead = 0, plants = 0, short = 0;
  let worstLedger = 0, steadyOff = 0;
  const each: string[] = [];
  const runs: [string[], number][] = [[[WITCH], 0x91], [[WITCH], 0x92], [[WITCH], 0x93], [[KNIGHT], 0x94], [[KNIGHT], 0x95]];
  for (const [ids, seed] of runs) {
    const seconds = 120;
    const level = ids[0] === KNIGHT ? 16 : 12;
    const s = watch(ids, seed, seconds, level);
    decisions += s.decisions; off += s.offBook;
    // The bound: a body starts full and regains one token every regenSec, sooner volatile.
    const row = ids[0] === KNIGHT ? CHAOS_BUDGETS.restless : CHAOS_BUDGETS.steady;
    const t = s.casts[0]?.body.aiTemper?.volatile ?? 0;
    const cap = row.tokens + seconds * (1 + t) / row.regenSec!;
    if (s.offBook > cap + 1e-9) over++;
    each.push(`${ids[0]}@${seed.toString(16)} ${s.offBook}/${s.decisions} (cap ${cap.toFixed(1)})`);
    for (const c of s.casts) {
      offCasts++;
      if (c.bar >= minBar - 1e-9) readable++;
      if ((MONSTERS[c.body.defId!].skills ?? []).includes(c.id)) ownKit++;
      const hit = c.fresh ? s.hits.find(h => h.body === c.body && h.at >= c.at && h.source === c.name) : undefined;
      if (hit) { hitsRead++; if (hit.at - c.at < WINDOW - 1e-9) early++; }
    }
    for (const p of s.plants) { plants++; if (p < extraRecovery[0] - 1 / 60) short++; }
  }
  check('off book never runs past the tokens a body was given', off > 0 && over === 0, each.join('; '));
  check('at least 90% of decisions stay in character', decisions > 0 && off / decisions <= 0.1, `${off} of ${decisions} off book (${(100 * off / Math.max(1, decisions)).toFixed(1)}%)`);
  check('every off-book pick is a skill from its own kit', offCasts > 0 && ownKit === offCasts, `${ownKit} of ${offCasts}`);
  check(`every off-book cast is readable: a bar or warned footprint of at least ${minBar} s`, offCasts > 0 && readable === offCasts, `${readable} of ${offCasts}`);
  check('its first hit lands no sooner than the reaction window', hitsRead > 0 && early === 0, `${early} of ${hitsRead} hits came early`);
  check('an off-book cast leaves the body planted for its extra recovery', plants > 0 && short === 0, `${short} of ${plants} plants too short`);

  // A steady pack around one hero: the ledger holds at most one live surprise at a time, so
  // no two come closer together than its hold; without the hold, the same pack's do.
  const { claimSec } = INTENT_CFG.chaos;
  const closest = (at: number[]): number => {
    let m = Infinity;
    for (let i = 1; i < at.length; i++) m = Math.min(m, at[i] - at[i - 1]);
    return m;
  };
  const pack = watch([WITCH, WITCH, WITCH, WITCH, WITCH], 0x96, 90, 12);
  steadyOff = pack.offBook;
  worstLedger = pack.maxLedger;
  check('a steady pack surprises one hero one at a time',
    steadyOff > 1 && worstLedger <= CHAOS_BUDGETS.steady.perPrey! && closest(pack.offAt) >= claimSec - 1e-9,
    `${steadyOff} off-book picks, at most ${worstLedger} live at once, closest ${closest(pack.offAt).toFixed(2)} s apart`);
  const loose = withChaos({ claimSec: 0 }, () => watch([WITCH, WITCH, WITCH, WITCH, WITCH], 0x96, 90, 12));
  check('and without the ledger\'s hold the same pack\'s surprises crowd together', closest(loose.offAt) < claimSec,
    `closest ${closest(loose.offAt).toFixed(2)} s apart over ${loose.offBook} picks`);
}

// --- G) Chaos is earned -----------------------------------------------------------------------------
{
  const low = watch([KNIGHT], 0xa1, 30, 12), high = watch([KNIGHT], 0xa1, 30, 16);
  check('below level 14 the knight carries steady, from 14 restless', low.maxTokens <= CHAOS_BUDGETS.steady.tokens && high.maxTokens > CHAOS_BUDGETS.steady.tokens,
    `tokens at most ${low.maxTokens.toFixed(2)} at 12, ${high.maxTokens.toFixed(2)} at 16`);
  let crossed = 0, casts = 0;
  for (const seed of [0xa2, 0xa3, 0xa4, 0xa5]) {
    const s = watch([KNIGHT], seed, 90, 16);
    casts += s.casts.length;
    crossed += s.casts.filter(c => c.crossed).length;
  }
  check('off book, the knight\'s hands cross its authored order for that one cast', crossed > 0, `${crossed} of ${casts} off-book casts passed a ready higher-ranked skill`);
}

// --- H) Same seed, same fight ------------------------------------------------------------------------
{
  check('the same seed fights the same fight with chaos', same(duel(WITCH, 0xb1), duel(WITCH, 0xb1)) && same(duel(KNIGHT, 0xb2, 16), duel(KNIGHT, 0xb2, 16)));
}

// --- I) The ceiling -----------------------------------------------------------------------------------
{
  const steady = CHAOS_BUDGETS.steady;
  const above = (name: string): boolean => {
    const r = CHAOS_BUDGETS[name];
    return !!r && r.tokens > 0 && (r.tokens > steady.tokens || (r.rollPerThink ?? 0) > (steady.rollPerThink ?? 0));
  };
  const untold: string[] = [];
  let named = 0;
  for (const def of Object.values(MONSTERS)) {
    const told = kitKeepChoice(def) > 0 || !!def.tells?.some(t => t.source.startsWith('stance:'));
    const brains = [def.brain, ...(def.brainVariants ?? []).map(v => v.brain)].filter((b): b is BrainDef => !!b);
    for (const b of brains) {
      const layers: (BrainTuning | undefined)[] = [b, ...(b.phases ?? []).map(p => p.use), ...(b.script ?? []).map(p => p.use),
        ...(b.rules ?? []).map(r => r.use), ...(b.cycle ?? []).map(c => c.use)];
      for (const t of layers) {
        const name = t?.intent?.chaos;
        if (!name) continue;
        named++;
        if (above(name) && !told) untold.push(`${def.id}:${name}`);
      }
    }
  }
  check('every row above steady sits on a body that wears the stance tells', named > 0 && !untold.length, untold.join(', ') || `${named} named rows`);
  // Teeth: an untold body raised to restless is named by content validation.
  const quiet = Object.keys(MONSTERS).find(id => kitKeepChoice(MONSTERS[id]) === 0 && !!MONSTERS[id].brain && !MONSTERS[id].tells?.length)!;
  const warned: string[] = [];
  const was = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args.map(String).join(' ')); };
  try {
    withBrain(quiet, b => ({ ...b, intent: { ...(b.intent ?? {}), chaos: 'restless' } }), () => validateContent());
  } finally { console.warn = was; }
  check('content validation names an untold body raised above steady', warned.some(w => w.includes(quiet) && w.includes("intent.chaos 'restless'")), quiet);
}

// --- J) What a roll picks -------------------------------------------------------------------------------
{
  const join = watch([WITCH], 0xc1, 120, 12);
  const cut = withChaos({ pick: 'cut' }, () => watch([WITCH], 0xc1, 120, 12));
  const t = cut.casts[0]?.body.aiTemper?.volatile ?? 0;
  const cap = CHAOS_BUDGETS.steady.tokens + 120 * (1 + t) / CHAOS_BUDGETS.steady.regenSec!;
  check('picking only cut options, more rolls become surprises, still within the tokens',
    cut.offBook > join.offBook && cut.offBook <= cap + 1e-9, `${join.offBook} → ${cut.offBook} (cap ${cap.toFixed(1)})`);
  check('and each is still readable', cut.casts.length > 0 && cut.casts.every(c => c.bar >= minBar - 1e-9), `${cut.casts.length} casts`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
