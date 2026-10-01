// ---------------------------------------------------------------------------
// THE SKILL-SHOWCASE ENGINE — the entry of showcase.html, a sandboxed copy of
// the game that plays one skill's stage at a time. It runs in its OWN realm
// (a hidden same-origin frame the host owns, or the recorder's window), so
// nothing here can reach the live game: its module state, its Math.random,
// its account and its saves are its own, and the shield + the persistence
// latch keep it from writing anywhere at all.
//
// It never runs a loop of its own: whoever holds it calls frame(), which
// steps the stage one tick and renders it world-only into its canvas. A
// cycle ends on a fresh stage (a new World each time: cheap, and nothing
// leaks between loops). API: window.__hwShowcase (ShowcaseEngineApi).
// Contract: docs/engine/skill-showcases.md.
// ---------------------------------------------------------------------------

import './shield'; // FIRST: no storage, no /__save traffic from this realm
import { SHOWCASE_CFG, SHOWCASE_SETUPS } from '../data/skillShowcase';
import { SKILLS } from '../data/skills';
import { suppressSaves } from '../meta/persistence';
import { makeSettings } from '../meta/settings';
import { Renderer } from '../render/renderer';
import { bootSimEngine, makeSimWorld } from '../sim/arena';
import { seedGlobalRandom } from '../sim/rng';
import { buildStage, type ShowcaseSpec, type Stage, type StageReport } from './stage';
import { planStage } from './stagePlan';

export interface ShowcasePlayOpts {
  /** Seed the realm's randomness (default SHOWCASE_CFG.seed): one skill, one loop. */
  seed?: number;
  /** Advance performance.now only with frames (the recorder's determinism). */
  pinClock?: boolean;
  /** End the act after one cycle instead of restaging (the recorder). */
  once?: boolean;
}

export interface ShowcasePlayInfo {
  skillId: string;
  classId: string;
  delivery: string;
  castMode: string;
  span: number;
  cycle: number;
}

export interface ShowcaseFrameInfo {
  /** Seconds into the current cycle, and the cycle's length. */
  t: number;
  cycle: number;
  /** This frame began a fresh cycle. */
  seam: boolean;
}

/** One row of the showcase catalog: every player skill (monster kit rows,
 *  noDrop, are not a player's) with the stage it would play. */
export interface ShowcaseCatalogRow {
  id: string;
  name: string;
  delivery: string;
  castMode: string;
  classId: string;
  span: number;
  skip: string | null;
}

export interface ShowcaseEngineApi {
  readonly ready: Promise<void>;
  /** Every player skill and its stage (the recorder's --all, the probe). */
  catalog(): ShowcaseCatalogRow[];
  /** The showcase dials (SHOWCASE_CFG), for a recorder outside this realm. */
  readonly config: typeof SHOWCASE_CFG;
  readonly canvas: HTMLCanvasElement;
  /** Stage a skill (null: no such skill, or it is skipped — see why). */
  play(spec: ShowcaseSpec, opts?: ShowcasePlayOpts): ShowcasePlayInfo | null;
  /** Step one tick of dtMs and render it. */
  frame(dtMs: number): ShowcaseFrameInfo | null;
  report(): StageReport | null;
  /** Why the last play() or frame() came back empty. */
  readonly why: string | null;
  /** How long the engine's own boot took (ms; QA). */
  readonly bootMs: number;
  stop(): void;
}

declare global {
  interface Window { __hwShowcase?: ShowcaseEngineApi }
}

suppressSaves('the skill showcase engine never saves');

const canvas = document.getElementById('showcase') as HTMLCanvasElement;
const settings = makeSettings();
settings.renderScale = 1;
settings.speechTyping = false;
const renderer = new Renderer(canvas, () => settings);
renderer.worldOnly = true;

let stage: Stage | null = null;
let current: { spec: ShowcaseSpec; opts: ShowcasePlayOpts } | null = null;
let why: string | null = null;
let clock = 0;
let bootMs = 0;
const realNow = performance.now.bind(performance);

function stageOnce(spec: ShowcaseSpec, opts: ShowcasePlayOpts): ShowcasePlayInfo | null {
  const def = SKILLS[spec.skillId];
  if (!def) { why = `no skill '${spec.skillId}'`; return null; }
  const plan = planStage(def, SHOWCASE_SETUPS[def.id]);
  if (plan.skip) { why = plan.skip; return null; }
  // this realm's Math.random: one skill, one loop (the live game's stream is
  // another realm's, untouched)
  seedGlobalRandom(opts.seed ?? SHOWCASE_CFG.seed);
  const world = makeSimWorld(plan.classId, opts.seed ?? SHOWCASE_CFG.seed);
  stage = buildStage(world, plan, spec);
  renderer.setBaseZoom(canvas.width / plan.span);
  why = null;
  return {
    skillId: def.id, classId: plan.classId, delivery: def.delivery.type, castMode: def.castMode ?? 'cast',
    span: plan.span, cycle: plan.cycle,
  };
}

const api: ShowcaseEngineApi = {
  ready: new Promise<void>((resolve) => {
    // Off the module's own evaluation, so the frame paints before the
    // registrations and the content census run.
    // The census is skipped: the game around this frame already ran it.
    setTimeout(() => { const t0 = realNow(); bootSimEngine({ validate: false }); bootMs = realNow() - t0; resolve(); }, 0);
  }),
  canvas,
  get why() { return why; },
  get bootMs() { return bootMs; },
  config: SHOWCASE_CFG,
  catalog() {
    return Object.values(SKILLS).filter(d => !d.noDrop).map(d => {
      const plan = planStage(d, SHOWCASE_SETUPS[d.id]);
      return {
        id: d.id, name: d.name, delivery: d.delivery.type, castMode: d.castMode ?? 'cast',
        classId: plan.classId, span: Math.round(plan.span), skip: plan.skip,
      };
    });
  },
  play(spec, opts = {}) {
    current = { spec, opts };
    if (opts.pinClock) { clock = realNow(); performance.now = () => clock; }
    try { return stageOnce(spec, opts); }
    catch (e) { stage = null; why = e instanceof Error ? e.message : String(e); return null; }
  },
  frame(dtMs) {
    if (!stage || !current) return null;
    let seam = false;
    try {
      if (stage.t >= stage.plan.cycle && !current.opts.once) {
        if (!stageOnce(current.spec, current.opts)) return null;
        seam = true;
      }
      stage.tick(dtMs / 1000);
      if (current.opts.pinClock) clock += dtMs;
      renderer.render(stage.world);
      return { t: stage.t, cycle: stage.plan.cycle, seam };
    } catch (e) {
      why = e instanceof Error ? e.message : String(e);
      stage = null;
      return null;
    }
  },
  report() { return stage ? stage.report() : null; },
  stop() { stage = null; current = null; },
};

window.__hwShowcase = api;
