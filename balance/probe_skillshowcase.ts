// ---------------------------------------------------------------------------
// THE SKILL SHOWCASE PROBE — the stage every skill plays (src/showcase/stage*.ts
// + data/skillShowcase.ts; docs/engine/skill-showcases.md): the one
// choreography behind the game's live showcases and the website's clips.
// Pins:
//   A. THE PLAN CENSUS: every player skill plans a stage — a known class, a
//      foe to face, a finite span inside the framing dials — and every body
//      the stage borrows and every setup row names real data.
//   B. THE HAND PLAYS: one skill from every delivery × cast-mode group casts
//      on its stage within one cycle (hold, toggle, pulse, charge, timing
//      arts, travel), through the ordinary input artery.
//   C. THE SETUPS AND THE GATEKEEPER: a claim on a bled beast, a prep cast a
//      detonator spends, bodies for corpse-fed skills, a wounded companion
//      for ally skills, a status the targeting needs, a gathered swarm, and
//      banks (charges, a gauge) refilled at the demo pace.
//   D. ONE SKILL, ONE LOOP: the same seed plays the same stage.
// Run: npx tsx balance/probe_skillshowcase.ts
// ---------------------------------------------------------------------------

import { CLASSES } from '../src/data/classes';
import { MONSTERS } from '../src/data/monsters';
import { SHOWCASE_CFG, SHOWCASE_SETUPS, SHOWCASE_STAGES } from '../src/data/skillShowcase';
import { SKILLS } from '../src/data/skills';
import type { SkillDef } from '../src/engine/skills';
import { buildStage, type StageReport } from '../src/showcase/stage';
import { planStage } from '../src/showcase/stagePlan';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const players = Object.values(SKILLS).filter(d => !d.noDrop);

/** One full cycle of a skill's stage, headless. */
function play(def: SkillDef, seed = SHOWCASE_CFG.seed): StageReport {
  seedGlobalRandom(seed);
  const plan = planStage(def);
  const world = makeSimWorld(plan.classId, seed);
  const stage = buildStage(world, plan, { skillId: def.id });
  while (stage.t < plan.cycle) stage.tick(1 / 30);
  return stage.report();
}

// ── A. the plan census ──────────────────────────────────────────────────────
const classIds = new Set(CLASSES.map(c => c.id));
const badPlans: string[] = [];
for (const def of players) {
  try {
    const p = planStage(def);
    const spanOk = Number.isFinite(p.span) && p.span >= SHOWCASE_CFG.minSpanClose && p.span <= SHOWCASE_CFG.maxSpan;
    const posOk = [p.focus, p.aim, p.cluster, ...p.foes].every(v => Number.isFinite(v.x) && Number.isFinite(v.y));
    if (!classIds.has(p.classId) || !p.foes.length || !spanOk || !posOk || !(p.stop > p.start && p.cycle >= p.stop)) {
      badPlans.push(`${def.id}(${p.classId}, ${p.foes.length} foes, span ${p.span})`);
    }
  } catch (e) {
    badPlans.push(`${def.id} threw ${e instanceof Error ? e.message : e}`);
  }
}
check(`A1: every player skill plans a stage (${players.length})`, badPlans.length === 0, badPlans.slice(0, 5).join('; '));
const borrowed = [SHOWCASE_CFG.foe, SHOWCASE_CFG.corpse, SHOWCASE_CFG.ally];
check('A2: the bodies the stage borrows exist', borrowed.every(id => !!MONSTERS[id]), borrowed.join(', '));
check('A3: the stage look exists', !!SHOWCASE_STAGES[SHOWCASE_CFG.stage], SHOWCASE_CFG.stage);
const badSetups = Object.entries(SHOWCASE_SETUPS).filter(([id, s]) =>
  !SKILLS[id] || (s.foe && !MONSTERS[s.foe.id]) || (s.prep && !SKILLS[s.prep.skill])).map(([id]) => id);
check('A4: every setup row names a real skill and real bodies', badSetups.length === 0, badSetups.join(', '));

// ── B. the hand plays one skill of every delivery × cast mode ───────────────
const groups = new Map<string, SkillDef>();
for (const def of players) {
  if (planStage(def).skip) continue;
  const key = `${def.delivery.type}/${def.castMode ?? 'cast'}${def.concentration ? '+concentration' : ''}`;
  if (!groups.has(key)) groups.set(key, def);
}
const silent: string[] = [];
for (const [key, def] of groups) {
  const r = play(def);
  if (!r.casts) silent.push(`${key}: ${def.id} (${r.why})`);
}
check(`B: the hand casts one skill of every delivery × cast mode (${groups.size} groups)`, silent.length === 0, silent.join('; '));

// ── C. the setups and the gatekeeper ───────────────────────────────────────
const staged: [string, string, (r: StageReport) => boolean][] = [
  ['tame_beast', 'a claim lands on a bled beast', r => r.casts >= 1],
  ['detonate_mines', 'the prep lays mines and the detonator sets them off', r => r.casts >= 1 && r.dealt > 0],
  ['cold_snap', 'a bolt in flight is snapped among the dummies', r => r.casts >= 1 && r.dealt > 0],
  ['corpse_explosion', 'corpse-fed skills find their bodies', r => r.casts >= 2 && r.dealt > 0],
  ['shamans_call', 'a corpse summon raises from a laid body', r => r.casts >= 1],
  ['guardian_bond', 'an ally-targeted skill finds its companion', r => r.casts >= 1],
  ['flash_freeze', 'a status the targeting needs is kept on the dummies', r => r.casts >= 1 && r.dealt > 0],
  ['eviscerate', 'a short cast range pulls the dummies in (a bleed kept on them)', r => r.casts >= 1 && r.dealt > 0],
  ['reprisal', 'an answering art finds its fresh wound', r => r.casts >= 1 && r.dealt > 0],
  ['raise_gnatveil', 'a gathered swarm arrives claimed and goes to work', r => r.casts >= 1 && r.dealt > 0],
  ['verdict_release', 'a charge bank refills at the demo pace', r => r.casts >= 2 && r.casts <= 8],
  ['reapers_toll', 'a gauge refills at the demo pace', r => r.casts >= 2 && r.casts <= 8],
];
for (const [id, what, ok] of staged) {
  if (!SKILLS[id]) { check(`C: ${what}`, false, `no skill ${id}`); continue; }
  const r = play(SKILLS[id]);
  check(`C: ${what}`, ok(r), `${id}: ${r.casts} casts, ${r.dealt} dealt${r.why ? `, ${r.why}` : ''}`);
}
const skipped = players.filter(d => planStage(d).skip).map(d => d.id);
check('C: skipped skills are named by data, with a reason', skipped.every(id => !!SHOWCASE_SETUPS[id]?.skip), skipped.join(', '));

// ── D. one skill, one loop ─────────────────────────────────────────────────
const once = play(SKILLS.glass_lance), twice = play(SKILLS.glass_lance);
check('D: the same seed plays the same stage', once.casts === twice.casts && once.dealt === twice.dealt && once.casts > 0,
  `${once.casts}/${once.dealt} vs ${twice.casts}/${twice.dealt}`);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
