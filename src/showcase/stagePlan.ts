// ---------------------------------------------------------------------------
// THE STAGE PLAN — where the hero stands, where the dummies stand, where the
// camera looks and how the hand plays, for one skill. Pure: a function of the
// skill's own data (delivery, AI reach, cast mode, targeting) and the
// SHOWCASE tables, so the live showcase, the website recorder and the probe
// all read one plan. Positions are world units relative to the hero.
// Contract: docs/engine/skill-showcases.md.
// ---------------------------------------------------------------------------

import { CLASSES, type ClassDef } from '../data/classes';
import { SHOWCASE_CFG, SHOWCASE_SETUPS, type ShowcaseSetup } from '../data/skillShowcase';
import type { SkillDef } from '../engine/skills';

export interface StagePoint { x: number; y: number }

export interface StageFoe extends StagePoint {
  /** The monster standing here. */
  id: string;
  /** A training dummy (kept whole, slid back to its post) vs a living foe. */
  dummy: boolean;
  /** A living foe starts bled to this share of its life. */
  lifeFrac?: number;
}

/** How the hand plays the skill. hold: keep the button down (repeats cast
 *  on their own; a mash taps through a multitude); toggle: one press;
 *  pulse: press, hold holdSec (a charge holds to full), release, wait;
 *  travel: like pulse, aiming out and home by turns (dashes, leaps). */
export type StagePlayKind = 'hold' | 'toggle' | 'pulse' | 'travel';

/** Where the press aims: the primary target's live position, the dummies'
 *  centre, a fixed point, or the first laid corpse. */
export type StageAimMode = 'foe' | 'cluster' | 'point' | 'grave';

export interface StagePlan {
  skillId: string;
  classId: string;
  hero: StagePoint;
  foes: StageFoe[];
  /** The camera's point and the stage width it frames (world units). */
  focus: StagePoint;
  span: number;
  aimMode: StageAimMode;
  aim: StagePoint;
  cluster: StagePoint;
  kind: StagePlayKind;
  everySec: number;
  holdSec: number;
  maxHold: number;
  mash: boolean;
  /** The act window inside a cycle (seconds). */
  start: number;
  stop: number;
  cycle: number;
  prep: { skill: string; presses: number; then: number } | null;
  /** A status the targeting needs, kept on the dummies. */
  keepStatus: string | null;
  /** Lay a corpse before each dummy (corpse-targeted skills). */
  corpse: string | null;
  /** A wounded companion at the hero's side (ally-targeted skills). */
  ally: StageFoe | null;
  /** Why this skill has no showcase, if it has none. */
  skip: string | null;
}

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Which body casts the skill: the class whose opening bar carries it, else
 *  one chosen by its tags (minions, spells, bow attacks, the rest). */
export function showcaseClassFor(def: SkillDef, classes: readonly ClassDef[] = CLASSES): string {
  const owner = classes.find(c => c.bar.includes(def.id));
  if (owner) return owner.id;
  const tags: readonly string[] = def.tags;
  const has = (id: string): boolean => classes.some(c => c.id === id);
  if ((tags.includes('minion') || tags.includes('summon')) && has('necromancer')) return 'necromancer';
  if (tags.includes('spell') && has('sorcerer')) return 'sorcerer';
  if ((tags.includes('bow') || (tags.includes('projectile') && tags.includes('attack'))) && has('ranger')) return 'ranger';
  return has('warrior') ? 'warrior' : classes[0].id;
}

/** The stage for one skill. */
export function planStage(def: SkillDef, setupRow?: ShowcaseSetup): StagePlan {
  const cfg = SHOWCASE_CFG;
  const setup = setupRow ?? SHOWCASE_SETUPS[def.id] ?? {};
  const d = def.delivery as unknown as Record<string, unknown>;
  const type = String(d.type);
  const reach = num(def.ai?.range);
  const hero: StagePoint = { x: 0, y: 0 };
  /** Circles the frame must hold beyond the bodies. */
  const areas: { x: number; y: number; r: number }[] = [];
  let spots: StagePoint[];
  let aim: StagePoint | null = null;
  let aimMode: StageAimMode = 'foe';
  let kind: StagePlayKind = 'hold';
  let everySec = 0.1, holdSec = 0.1, mash = false;
  const trio = (cx: number, spread: number): StagePoint[] =>
    [{ x: cx, y: 0 }, { x: cx + spread * 0.35, y: -spread }, { x: cx + spread * 0.35, y: spread }];
  const ring = (r: number, n = 5): StagePoint[] => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / n);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const aroundHero = type === 'nova' || type === 'aura' || type === 'self'
    || (type === 'ground' && (num(d.castRange) === 0 || !!d.follow));

  if (type === 'melee' || type === 'cone') {
    // the swing or the beam reaches forward: frame its far end, not a circle
    const length = num(d.range) || num(d.length) || reach || 60;
    const r = clamp(length * 0.8, 38, 150);
    spots = trio(r + 12, 44);
    areas.push({ x: Math.min(length, 420), y: 0, r: 24 });
  } else if (aroundHero) {
    // only a real radius widens the frame; with none, a self cast keeps its
    // ring close (a buff reads on the body) and the AI's reach spaces the rest
    const rad = num(d.radius) + num(d.grow);
    spots = ring(rad ? clamp(rad * 0.62, 56, 200) : type === 'self' ? cfg.selfRing : clamp((reach || 120) * 0.62, 56, 200));
    if (rad) areas.push({ x: 0, y: 0, r: Math.min(rad, cfg.areaFit) });
    aimMode = 'point';
    if (type === 'aura' && d.mode === 'toggle') kind = 'toggle';
  } else if (type === 'dash' || type === 'leap' || type === 'blink' || type === 'carom') {
    const dist = clamp(num(d.distance) || num(d.range) || reach || 240, 140, 300);
    spots = trio(dist * 0.72, 56);
    aimMode = 'point';
    aim = { x: dist, y: 0 };
    kind = 'travel'; everySec = 1.1; holdSec = 0.06;
  } else if (type === 'summon') {
    const dist = clamp(reach || 200, 150, 240);
    spots = trio(dist, 56);
    aimMode = 'point';
    aim = { x: dist * 0.55, y: 0 };
  } else if (type === 'construct') {
    const dist = clamp(reach || 220, 160, 260);
    spots = trio(dist, 60);
    // A trap or a mine waits under the dummies (they never walk into one);
    // a totem or a sentry stands between.
    const lies = d.kind === 'trap' || d.kind === 'mine';
    aimMode = lies ? 'cluster' : 'point';
    aim = { x: dist * 0.55, y: 0 };
    areas.push({ x: lies ? dist : dist * 0.55, y: 0, r: Math.min(num(d.range) || 80, 110) });
  } else {
    // projectile, ground, storm, target, mark, detonate…: a firing line,
    // inside the targeting's own cast range when it names one
    const castRange = num((def.targeting as unknown as Record<string, unknown> | undefined)?.castRange);
    const dist = Math.min(clamp((reach || num(d.range) || 300) * 0.5, 170, 300), castRange ? castRange * 0.8 : Infinity);
    spots = trio(dist, 54);
    if (type === 'ground' || type === 'storm') {
      aimMode = 'cluster';
      areas.push({ x: dist, y: 0, r: Math.min((num(d.radius) || 90) + num(d.grow), 420) });
    }
  }

  const foes: StageFoe[] = spots.map(p => ({ ...p, id: cfg.foe, dummy: true }));
  if (setup.foe) foes[0] = { ...foes[0], id: setup.foe.id, dummy: false, lifeFrac: setup.foe.lifeFrac };
  const cluster: StagePoint = {
    x: foes.reduce((a, f) => a + f.x, 0) / foes.length,
    y: foes.reduce((a, f) => a + f.y, 0) / foes.length,
  };
  if (!aim) aim = { x: foes[0].x, y: foes[0].y };

  const mode = def.castMode ?? 'cast';
  if (def.concentration || mode === 'concentration' || mode === 'channel' || mode === 'overcharge' || mode === 'guard') {
    kind = 'pulse'; everySec = 2.6; holdSec = 2.0;
  } else if (mode === 'charge') {
    kind = 'pulse'; everySec = 0.9; holdSec = 0.25; // held on until the bar is full
  } else if (mode === 'multitude') {
    mash = true;
  }
  if (setup.hold) { kind = 'pulse'; holdSec = setup.hold; everySec = setup.hold + 0.6; }
  let prep: StagePlan['prep'] = null;
  if (setup.prep) {
    prep = { skill: setup.prep.skill, presses: setup.prep.presses ?? 1, then: setup.prep.then ?? 0.3 };
    everySec = Math.max(everySec, 0.8);
  }

  const targeting = def.targeting as unknown as Record<string, unknown> | undefined;
  const req = targeting?.requiresStatus;
  const corpseFed = targeting?.target === 'corpse';
  const allyFed = targeting?.target === 'ally';
  if (corpseFed) aimMode = 'grave';

  // Fit the frame: the hero, the foes, the aim and every area, with a margin.
  const pts: StagePoint[] = [hero, ...foes, aim];
  let minX = Math.min(...pts.map(v => v.x)), maxX = Math.max(...pts.map(v => v.x));
  let minY = Math.min(...pts.map(v => v.y)), maxY = Math.max(...pts.map(v => v.y));
  for (const a of areas) {
    minX = Math.min(minX, a.x - a.r); maxX = Math.max(maxX, a.x + a.r);
    minY = Math.min(minY, a.y - a.r); maxY = Math.max(maxY, a.y + a.r);
  }
  const spanX = (maxX - minX) + 150, spanY = (maxY - minY) + 130;
  const close = type === 'melee' || type === 'cone';
  const span = clamp(Math.max(spanX, spanY * 16 / 9), close ? cfg.minSpanClose : cfg.minSpan, cfg.maxSpan);

  return {
    skillId: def.id, classId: showcaseClassFor(def),
    hero, foes, focus: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, span,
    aimMode, aim, cluster, kind, everySec, holdSec, maxHold: 3, mash,
    start: cfg.lead, stop: cfg.lead + cfg.act, cycle: cfg.lead + cfg.act + cfg.tail,
    prep,
    keepStatus: Array.isArray(req) ? (typeof req[0] === 'string' ? req[0] : null) : typeof req === 'string' ? req : null,
    corpse: corpseFed ? cfg.corpse : null,
    ally: allyFed ? { id: cfg.ally, x: 70, y: 46, dummy: false } : null,
    skip: setup.skip ?? null,
  };
}
