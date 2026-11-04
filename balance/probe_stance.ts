// ---------------------------------------------------------------------------
// THE STANCE PROBE (docs/design/npc-ai-direction.md, phase 7).
//   A. The rows: one vocabulary of three stances, every archetype mix names only them,
//      temperament bands are ordered, the stance tells resolve, and the knight wears the
//      plan's own row.
//   B. Who holds one: a body whose kit keeps a distance with something placed inside it,
//      while its feet follow its decisions. A pure melee body and a fixed-band body hold
//      none and fight exactly as with stances off; off, no body holds one.
//   C. The roll: over many rolls a body's stances follow its mix under its temperament,
//      and a bold body presses more than a timid one.
//   D. The hold: a roll holds its stance's own time; an early roll is a real event, never
//      sooner than minHoldSec after the last.
//   E. The shift beat: a changed stance plants the body square to its prey with no new
//      cast for the beat, and its first new hit lands at least 0.35 s after the change.
//   F. The feet: pressing, a kiter walks into its claw's reach; keeping, it never does.
//   G. Drawn == tested: the lean shows the stance the feet read (keep only while it
//      kites), nothing without a prey, and a bold body stands larger than a timid one.
//   H. Same seed, same fight, and the same body opens differently between seeds.
//   I. A claimed beast drops its stance.
// Run: npx tsx balance/probe_stance.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  INTENT_CFG, STANCE_IDS, STANCE_MIX, STANCE_TELLS, STANCES, TEMPERAMENTS, type StanceId,
} from '../src/data/aiIntent';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { normalizeBrain } from '../src/engine/brain';
import { intentOf, kitKeepChoice, stepStance, type IntentHost } from '../src/engine/intent';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { TELL_SOURCES, tellDressOf } from '../src/engine/tells';
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
const duel = (id: string, seed: number, seconds = 20) =>
  runEpisode(matchupDuel(build, id, { level: 12, duration: seconds, pilot: pilotFor('warrior'), idTag: 'stance' }), seed);
const same = (a: ReturnType<typeof duel>, b: ReturnType<typeof duel>): boolean =>
  JSON.stringify(a.fingerprint) === JSON.stringify(b.fingerprint) && JSON.stringify(a.metrics) === JSON.stringify(b.metrics);
const withStances = <T>(on: boolean, run: () => T): T => {
  const was = INTENT_CFG.stance.enabled;
  INTENT_CFG.stance.enabled = on;
  try { return run(); } finally { INTENT_CFG.stance.enabled = was; }
};
const withMix = <T>(id: string, stances: Partial<Record<StanceId, number>>, run: () => T): T => {
  const def = MONSTERS[id], brain = def.brain;
  def.brain = { ...brain, intent: { ...(brain?.intent ?? {}), stances } };
  try { return run(); } finally { def.brain = brain; }
};

/** One body against a hero who stands still and cannot die, read every tick. */
function watch(id: string, seed: number, seconds: number, opts: { at?: number; setup?: (body: Actor) => void },
  each: (body: Actor, d: number, t: number, hero: Actor) => void): { casts: [string, number][]; hits: number[] } {
  seedGlobalRandom(seed);
  const w = makeSimWorld('warrior', seed), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const body = w.createMonster(id, 12, 'enemy');
  body.pos = { x: p.pos.x + (opts.at ?? 240), y: p.pos.y }; body.tier = p.tier; body.facing = Math.PI;
  w.actors = [p, body];
  opts.setup?.(body);
  const casts: [string, number][] = [], hits: number[] = [];
  setSimTap({
    onCast: (a, inst) => { if (a === body) casts.push([inst.def.id, w.time]); },
    onHit: (a, target, result) => { if (a === body && target === p && result.total > 0) hits.push(w.time); },
  });
  const dt = 1 / 60;
  try {
    for (let t = 0; t < seconds; t += dt) {
      w.applyInputs(new Map(), dt);
      for (const a of [...w.actors]) updateAI(a, w, dt);
      w.update(dt);
      each(body, Math.hypot(body.pos.x - p.pos.x, body.pos.y - p.pos.y), w.time, p);
    }
  } finally { setSimTap(null); }
  return { casts, hits };
}

const KITER = 'spitting_horror'; // keeps 240 px for its venom bolt, carries a claw, wears no lean of its own

// --- A) The rows ------------------------------------------------------------------------------
{
  check('three stances, one vocabulary', STANCE_IDS.length === 3 && STANCE_IDS.every(id => !!STANCES[id]));
  check('a roll never holds shorter than an event may interrupt it',
    STANCE_IDS.every(id => STANCES[id].holdSec[0] >= INTENT_CFG.stance.minHoldSec && STANCES[id].holdSec[1] >= STANCES[id].holdSec[0]));
  const bad = Object.entries(STANCE_MIX).filter(([, mix]) =>
    Object.keys(mix).some(k => !STANCE_IDS.includes(k as StanceId)) || !(Object.values(mix).reduce((s, v) => s + (v ?? 0), 0) > 0));
  check('every archetype mix names only stances and weighs something', !bad.length, bad.map(([k]) => k).join(', '));
  check('the basic mix is the kiter\'s choice: mostly keep', (STANCE_MIX.basic.keep ?? 0) / Object.values(STANCE_MIX.basic).reduce((s, v) => s + (v ?? 0), 0) > 0.5);
  check('temperament bands are ordered', Object.values(TEMPERAMENTS).every(r => r.bold[0] <= r.bold[1] && r.nerve[0] <= r.nerve[1] && r.volatile[0] <= r.volatile[1]));
  check('the stance tells name registered sources', STANCE_TELLS.every(t => !!TELL_SOURCES[t.source.split(':')[0]]), STANCE_TELLS.map(t => t.source).join(', '));
  const knight = MONSTERS.oblivion_knight.brain?.intent;
  check('the knight wears the plan\'s own row', !!knight && knight.temperament === 'veteran' && knight.stances?.press === 6 && knight.stances?.harry === 3 && knight.stances?.keep === 1);
}

// --- B) Who holds one --------------------------------------------------------------------------
const pick = (want: (base: ReturnType<typeof normalizeBrain>['base'], id: string) => boolean): string | undefined =>
  Object.keys(MONSTERS).sort().find(id => {
    const def = MONSTERS[id];
    if (def.passive || !def.brain || def.brainVariants?.length) return false;
    const base = normalizeBrain(def.brain).base;
    return !!intentOf(base) && (def.skills ?? []).filter(s => SKILLS[s]?.ai).length >= 2 && want(base, id);
  });
const melee = pick((base, id) => base.move?.style === 'direct' && kitKeepChoice(MONSTERS[id]) === 0);
const banded = pick((base, id) => base.move?.style === 'holdRange' && kitKeepChoice(MONSTERS[id]) > 0);
{
  check('a kiter\'s kit has the choice, and a pure melee kit has none', kitKeepChoice(MONSTERS[KITER]) > 0 && !!melee, `${KITER} keeps ${kitKeepChoice(MONSTERS[KITER])}; melee ${melee}`);
  let held = 0;
  watch(KITER, 0x81, 6, {}, body => { if (body.aiStance) held++; });
  check(`${KITER} holds a stance`, held > 0);
  for (const [what, id] of [['a pure melee body', melee], ['a fixed-band body with the choice', banded]] as const) {
    if (!id) { check(`${what} exists to read`, false); continue; }
    let any = 0;
    watch(id, 0x82, 8, {}, body => { if (body.aiStance) any++; });
    check(`${what} (${id}) holds none`, any === 0);
    check(`and fights exactly as with stances off`, same(withStances(false, () => duel(id, 0x83)), duel(id, 0x83)));
  }
  let off = 0;
  withStances(false, () => watch(KITER, 0x81, 6, {}, body => { if (body.aiStance) off++; }));
  check('off, no body holds one', off === 0);
}

// --- C) The roll ----------------------------------------------------------------------------------
{
  // Fresh rolls on one live body, read against the mix under the body's own temperament.
  seedGlobalRandom(0x84);
  const w = makeSimWorld('warrior', 0x84);
  const body = w.createMonster(KITER, 12, 'enemy');
  const host = { options: body.skills.filter(s => !!s?.def.ai) } as unknown as IntentHost;
  const share = (temper: Actor['aiTemper'], mix = STANCE_MIX.basic): Record<StanceId, number> => {
    body.aiTemper = temper;
    const n: Record<StanceId, number> = { keep: 0, harry: 0, press: 0 };
    for (let i = 0; i < 3000; i++) {
      body.aiStance = undefined;
      stepStance(body, w, { stances: mix }, undefined, host, true);
      n[body.aiStance!]++;
    }
    for (const id of STANCE_IDS) n[id] /= 3000;
    return n;
  };
  const plain = { bold: 0, nerve: 0, volatile: 0 };
  const got = share(plain);
  const total = Object.values(STANCE_MIX.basic).reduce((s, v) => s + (v ?? 0), 0);
  const off = STANCE_IDS.map(id => Math.abs(got[id] - (STANCE_MIX.basic[id] ?? 0) / total));
  check('a level temperament rolls its mix', off.every(x => x < 0.03), STANCE_IDS.map(id => `${id} ${got[id].toFixed(3)}`).join(', '));
  const bold = share({ bold: 0.3, nerve: 0, volatile: 0 });
  const timid = share({ bold: -0.3, nerve: 0, volatile: 0 });
  check('a bold body presses more and keeps away less than a timid one', bold.press > got.press && got.press > timid.press && bold.keep < got.keep && got.keep < timid.keep,
    `press ${timid.press.toFixed(2)} < ${got.press.toFixed(2)} < ${bold.press.toFixed(2)}`);
  const flat = share({ bold: 0, nerve: 0, volatile: 0.6 });
  check('a volatile body strays from its kind\'s habit', flat.keep < got.keep - 0.1, `keep ${got.keep.toFixed(2)} → ${flat.keep.toFixed(2)}`);
  body.aiTemper = undefined;
  body.aiStance = undefined;
  stepStance(body, w, { temperament: 'veteran' }, undefined, host, true);
  const t = body.aiTemper as { bold: number; nerve: number; volatile: number } | undefined;
  const row = TEMPERAMENTS.veteran;
  check('a temperament is drawn once, inside its row', !!t && t.bold >= row.bold[0] && t.bold <= row.bold[1] && t.nerve >= row.nerve[0] && t.nerve <= row.nerve[1]
    && t.volatile >= row.volatile[0] && t.volatile <= row.volatile[1], JSON.stringify(t));
}

// --- D) The hold, E) the shift beat, G) drawn == tested ----------------------------------------------
{
  const { minHoldSec } = INTENT_CFG.stance;
  let rolls = 0, early = 0, events = 0, changes = 0;
  let beats = 0, moved = 0, castIn = 0, turned = 0, minFirst = Infinity, measured = 0;
  let leanWrong = 0, leanRead = 0, kept = 0, keepLean = 0, quiet = 0;
  const offPrey = (body: Actor, hero: Actor): number => {
    const want = Math.atan2(hero.pos.y - body.pos.y, hero.pos.x - body.pos.x);
    return Math.abs(Math.atan2(Math.sin(body.facing - want), Math.cos(body.facing - want)));
  };
  for (const seed of [0x91, 0x92, 0x93, 0x94, 0x95, 0x96]) {
    let at = -1, until = 0, stance: StanceId | undefined;
    let beat: { end: number; x: number; y: number; err0: number; err: number } | undefined;
    const shifts: number[] = [];
    const { casts, hits } = watch(KITER, seed, 40, {}, (body, _d, t, hero) => {
      if (body.aiStanceAt !== at) {
        if (at >= 0) {
          rolls++;
          if (body.aiStanceAt < until - 1e-6) { events++; if (body.aiStanceAt - at < minHoldSec - 1e-6) early++; }
        }
        at = body.aiStanceAt; until = body.aiStanceUntil;
      }
      if (body.aiStance !== stance) { if (stance && body.aiStance) { changes++; shifts.push(t); } stance = body.aiStance; }
      if (body.aiShiftUntil > t) {
        if (!beat || beat.end !== body.aiShiftUntil) {
          beat = { end: body.aiShiftUntil, x: body.pos.x, y: body.pos.y, err0: offPrey(body, hero), err: offPrey(body, hero) };
          beats++;
        } else {
          if (Math.hypot(body.pos.x - beat.x, body.pos.y - beat.y) > 0.5) moved++;
          beat.err = offPrey(body, hero);
        }
      } else if (beat) {
        // Squaring up: it ends the beat turned to its prey, however its body's turn rate paces it.
        if (beat.err > Math.max(0.05, beat.err0)) turned++;
        beat = undefined;
      }
      // The lean the renderer would draw, against the stamp the feet read.
      const dress = tellDressOf(body);
      const winded = t < body.aiWindedUntil;
      if (dress && body.aiStance && !winded && t > body.aiStanceAt + 0.02) {
        leanRead++;
        const wantSign = body.aiStance === 'press' ? 1 : body.aiStance === 'keep' && body.aiKiteKeep > 0 ? -1 : 0;
        if (Math.sign(dress.lean) !== wantSign) leanWrong++;
        if (body.aiStance === 'keep') { kept++; if (body.aiKiteKeep <= 0 && dress.lean < 0) keepLean++; }
      }
      if (dress && body.aiTargetId === undefined && dress.lean !== 0 && !winded) quiet++;
    });
    for (const [, t] of casts) for (const s of shifts) if (t > s && t < s + 0.2) castIn++;
    for (const s of shifts) {
      const first = casts.find(([, t]) => t > s);
      const hit = first ? hits.find(h => h >= first[1]) : undefined;
      if (hit !== undefined) { minFirst = Math.min(minFirst, hit - s); measured++; }
    }
  }
  check('a roll holds its stance\'s own time, and rolls again when it runs out', rolls >= 8, `${rolls} rolls, ${changes} changed the stance, ${events} came early on an event`);
  check('an event never rolls sooner than minHoldSec after the last', early === 0, `${early} too early`);
  check('a changed stance opens the shift beat', beats > 0 && beats === changes, `${beats} beats for ${changes} changes`);
  check('in the beat the feet stay planted', moved === 0, `${moved} ticks moved`);
  check('and the body squares up to its prey', turned === 0, `${turned} beats ended turned further away`);
  check('and no new cast starts', castIn === 0, `${castIn} casts inside a beat`);
  check('its first new hit lands at least 0.35 s after the change', measured > 0 && minFirst >= 0.35, `earliest ${minFirst.toFixed(2)} s over ${measured} changes`);
  check('the lean shows the stance the feet read', leanRead > 100 && leanWrong / leanRead < 0.02, `${leanWrong} of ${leanRead} ticks disagree`);
  check('keep leans back only while it kites', kept > 0 && keepLean === 0, `${keepLean} of ${kept} keep ticks lean back without kiting`);
  check('no prey, no posture', quiet === 0, `${quiet} ticks lean at nothing`);
}

// --- F) The feet ------------------------------------------------------------------------------------
{
  const closest = (stances: Partial<Record<StanceId, number>>, seed: number): number => {
    let min = Infinity;
    withMix(KITER, stances, () => watch(KITER, seed, 12, {}, (_b, d) => { min = Math.min(min, d); }));
    return min;
  };
  const claw = Math.max(...(MONSTERS[KITER].skills ?? []).map(s => SKILLS[s]).filter(s => s?.delivery.type === 'melee').map(s => s!.ai!.range));
  const press = Math.max(closest({ press: 1 }, 0xa1), closest({ press: 1 }, 0xa2));
  const keep = Math.min(closest({ keep: 1 }, 0xa1), closest({ keep: 1 }, 0xa2));
  check('pressing, a kiter walks into its claw\'s reach', press < claw + 30, `closest ${press.toFixed(0)} px, claw ${claw} px`);
  check('keeping, it never does', keep > claw + 60, `closest ${keep.toFixed(0)} px`);
  const harry = closest({ harry: 1 }, 0xa1);
  check('harrying, it comes nearer than keeping', harry < keep, `harry ${harry.toFixed(0)} px, keep ${keep.toFixed(0)} px`);
}

// --- G2) Temperament worn ------------------------------------------------------------------------------
{
  const scale = (bold: number): number => {
    let s = 1;
    watch(KITER, 0xb1, 3, { setup: b => { b.aiTemper = { bold, nerve: 0, volatile: 0 }; } }, body => { s = tellDressOf(body)?.scale ?? 1; });
    return s;
  };
  const bold = scale(0.3), level = scale(0), timid = scale(-0.3);
  check('a bold body stands larger, a timid one smaller', bold > level && level === 1 && timid < level, `${timid.toFixed(3)} / ${level.toFixed(3)} / ${bold.toFixed(3)}`);
}

// --- H) Same seed, same fight; another seed, another opening ---------------------------------------------
{
  check('the same seed fights the same fight with stances', same(duel(KITER, 0xc1), duel(KITER, 0xc1)));
  const opens = new Set<string>();
  for (const seed of [0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9]) {
    let first: string | undefined;
    watch('oblivion_knight', seed, 2, {}, body => { first ??= body.aiStance; });
    opens.add(first ?? 'none');
  }
  check('the same body opens in different stances between seeds', opens.size >= 2 && !opens.has('none'), [...opens].join(', '));
}

// --- I) A claimed beast drops its stance -----------------------------------------------------------------
{
  seedGlobalRandom(0xd1);
  const w = makeSimWorld('warrior', 0xd1), p = w.player;
  p.skills = []; p.casting = null;
  p.sheet.setSource('probe-rig', [mod('life', 'override', 1e7), mod('moveSpeed', 'override', 0)]);
  p.fillResources();
  const body = w.createMonster(KITER, 12, 'enemy');
  body.pos = { x: p.pos.x + 240, y: p.pos.y }; body.tier = p.tier; body.facing = Math.PI;
  w.actors = [p, body];
  const dt = 1 / 60;
  let wild = false;
  for (let t = 0; t < 6; t += dt) {
    if (t >= 3 && body.team === 'enemy') { wild = !!body.aiStance; w.tameCompanion(p, body, 'tame_beast'); }
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
  check('claimed by the player, it drops its stance and never rolls again', wild && !body.aiStance, `held one wild: ${wild}`);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
