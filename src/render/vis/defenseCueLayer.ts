import { DEFENSE_CUE_CFG as C } from '../../data/defenseCues';
import { DEBUFF_LOOKS } from '../../data/debuffLooks';
import { defenseStyle } from '../../engine/defenseCues';
import { shellArcFactor, type Actor } from '../../engine/actor';
import { STATUS_APPEARANCES } from '../../data/projectileArtVisuals';
import { STATUS_DEFS, type StatusBodyCue } from '../../engine/status';
import type { PartSpec } from './parts';
import { registerEffectVoice } from './effectVoice';
import { drawPartSpecs, type BodyLook } from './body';
import { shade, withAlpha } from './color';
import { drawFrameShell } from './frameVoice';
import { VIS_CFG } from './visConfig';

const TAU = Math.PI * 2;

/** A plate's own shape, shared by attached protection and flying fragments.
 * Coordinates face +X; each style has a distinct silhouette even in grey. */
function plate(ctx: CanvasRenderingContext2D, shape: string, r: number, width: number, thick: number): void {
  ctx.beginPath();
  if (shape === 'spiral') {
    ctx.arc(0, 0, r, -width / 2, width / 2);
    ctx.arc(0, 0, r * (1 - thick), width / 2, -width / 2, true);
  } else if (shape === 'bones') {
    const h = r * Math.min(.16, width * .4), w = r * thick * .5;
    ctx.moveTo(r - w, -h); ctx.quadraticCurveTo(r, -h * .6, r + w, -h);
    ctx.lineTo(r + w * .5, h); ctx.quadraticCurveTo(r, h * .6, r - w, h);
  } else if (shape === 'brace' || shape === 'guard') {
    ctx.moveTo(r, -r * width * 0.38); ctx.lineTo(r * (1 + thick), 0);
    ctx.lineTo(r, r * width * 0.38); ctx.lineTo(r * (1 - thick), 0);
  } else {
    const y = Math.sin(width / 2) * r;
    ctx.moveTo(r * (1 - thick), -y * 0.8); ctx.lineTo(r, -y);
    ctx.lineTo(r * (1 + thick * (shape === 'carapace' ? 0.8 : 0.25)), 0);
    ctx.lineTo(r, y); ctx.lineTo(r * (1 - thick), y * 0.8);
  }
  ctx.closePath();
}

registerEffectVoice('defenseCue', (ctx, f, remaining) => {
  const cue = f.defenseCue;
  if (!cue) return;
  const cfg = defenseStyle(cue.style, cue.kind), k = 1 - remaining;
  const impact = cue.event === 'impact', bash = cue.event === 'bash';
  const breaking = cue.event === 'break';
  const spread = breaking ? k : cue.event === 'reform' ? 1 - k : 0;
  const n = impact || bash ? 1 : Math.max(1, Math.round(cfg.pieces * cue.arc / TAU));
  const arc = impact || bash ? Math.min(cue.arc, 0.85) : cue.arc;
  ctx.save(); ctx.translate(f.pos.x, f.pos.y);
  for (let i = 0; i < n; i++) {
    const angle = cue.facing - arc / 2 + (i + 0.5) * arc / n;
    ctx.save(); ctx.rotate(angle);
    const travel = bash ? C.bashTravel * Math.sin(k * Math.PI / 2)
      : impact ? -0.1 * Math.sin(k * Math.PI) : cfg.travel * spread;
    ctx.translate(f.radius * travel, breaking ? f.radius * k * k * 0.3 : 0);
    if (breaking) ctx.rotate((i % 2 ? 1 : -1) * k * 0.45);
    const alpha = breaking ? remaining : Math.sin(Math.PI * Math.min(0.99, k + 0.06));
    ctx.fillStyle = withAlpha(f.color, alpha * 0.65);
    ctx.strokeStyle = withAlpha(shade(f.color, 0.4), alpha);
    ctx.lineWidth = C.fractureWidth;
    plate(ctx, cfg.shape, f.radius, arc / n * 0.8, cfg.thickness);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
});

/** Body-local persistent shell. Gaps stay open until the mechanical reform
 * threshold; returning fragments show actual refill, never a guessed timer.
 * Returns true when anatomy supplies the limbs as well as the shell. */
export function drawShellCue(ctx: CanvasRenderingContext2D, a: Actor, time: number, radius = a.radius + C.shellPad): boolean {
  const sg = a.shellGuard;
  if (!sg || sg.max <= 0) return false;
  const cfg = defenseStyle(sg.shellVisual);
  const arc = sg.side === 'all' ? TAU : sg.arcDeg * Math.PI / 180 * shellArcFactor(sg, time);
  const center = a.facing + (sg.side === 'rear' ? Math.PI : 0);
  if (cfg.anatomy && drawFrameShell(ctx, a, cfg.anatomy, time, radius, arc, center)) return true;
  const fill = Math.max(0, Math.min(1, sg.pool / sg.max));
  const open = sg.broken || sg.pool <= 0;
  const recovery = Math.min(1, fill / Math.max(0.001, sg.reformFraction ?? 0.4));
  const n = Math.max(2, Math.round(cfg.pieces * arc / TAU));
  ctx.save();
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.rotate(center - arc / 2 + (i + 0.5) * arc / n);
    if (open) ctx.translate(radius * (0.12 + (1 - recovery) * 0.15), 0);
    const width = arc / n * (open ? 1 - C.brokenGap : 0.94);
    ctx.strokeStyle = withAlpha(sg.color, open ? C.brokenAlpha : C.intactAlpha + C.poolAlpha * fill);
    ctx.fillStyle = withAlpha(sg.color, open ? 0.05 + recovery * 0.1 : 0.08 + fill * 0.14);
    ctx.lineWidth = open ? 1.4 : 2;
    plate(ctx, cfg.shape, radius, width, cfg.thickness); ctx.fill(); ctx.stroke();
    if (open) {
      ctx.beginPath(); ctx.moveTo(radius * 0.88, -radius * 0.04);
      ctx.lineTo(radius, radius * 0.05); ctx.lineTo(radius * 1.1, -radius * 0.04); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore(); return false;
}

/** Broken poise is a split bronze brace close to the body, never an outer
 * shell or an equipped shield. It lasts exactly as long as poiseBroken. */
export function drawPoiseCue(ctx: CanvasRenderingContext2D, a: Actor): void {
  if (!a.poiseBroken) return;
  const r = a.radius + C.poisePad;
  ctx.save(); ctx.strokeStyle = withAlpha(C.poiseColor, 0.8); ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side * r * 0.6, -r * 0.7); ctx.lineTo(side * r, -r * 0.28);
    ctx.moveTo(side * r * 1.08, r * 0.12); ctx.lineTo(side * r * 0.7, r * 0.55); ctx.stroke();
  }
  ctx.restore();
}

type StatusBearer = Pick<Actor, 'statuses' | 'dead' | 'downed'>;
const NO_CUES: readonly StatusBodyCue[] = [];

const stackStageCache = new WeakMap<StatusBodyCue, StatusBodyCue>();
const wickCueCache = new WeakMap<StatusBodyCue, (StatusBodyCue | undefined)[]>();

function resolveStackStage(cue: StatusBodyCue): StatusBodyCue {
  let staged = stackStageCache.get(cue);
  if (!staged) {
    const ss = cue.stackStage!;
    staged = { ...cue, ...ss.cue, layer: ss.cue.layer ?? (cue.layer ?? 0) + 0.1 };
    stackStageCache.set(cue, staged);
  }
  return staged;
}

function resolveWickCue(cue: StatusBodyCue, step: number): StatusBodyCue {
  let slots = wickCueCache.get(cue);
  if (!slots) {
    slots = new Array<StatusBodyCue | undefined>(33);
    wickCueCache.set(cue, slots);
  }
  let hit = slots[step];
  if (!hit) {
    const wick = cue.durationPart!;
    const fill = step / 32;
    hit = { ...cue, parts: [...(cue.parts ?? []), { ...wick, params: { ...wick.params, fill } }] };
    slots[step] = hit;
  }
  return hit;
}

function takesPrecedence(
  cueLayer: number, cueExp: number, cueSpan: number,
  priorLayer: number, priorExp: number, priorSpan: number,
): boolean {
  const layer = cueLayer - priorLayer;
  if (layer !== 0) return layer > 0;
  // When several sources arm one material, show the first known detonation.
  if (cueExp !== priorExp) return cueExp < priorExp;
  return cueSpan > priorSpan;
}

function cmpCue(a: StatusBodyCue, b: StatusBodyCue): number {
  const d = (a.layer ?? 0) - (b.layer ?? 0);
  if (d !== 0) return d;
  const ga = a.group ?? '', gb = b.group ?? '';
  return ga < gb ? -1 : ga > gb ? 1 : 0;
}

let scratchExp: number[] = [];
let scratchSpan: number[] = [];

/** Group by material across source lanes. The higher layer wins within a
 * group (solid ice over chill, White Heat over ordinary kindling). */
export function collectStatusBodyCues(a: StatusBearer, includeBeneficial = true, into?: StatusBodyCue[]): readonly StatusBodyCue[] {
  if (into) into.length = 0;
  const sts = a.statuses;
  if (a.dead || a.downed || !sts.length) return into ?? NO_CUES;
  let cues: StatusBodyCue[] | undefined = into;
  let count = 0;
  for (let i = 0; i < sts.length; i++) {
    const s = sts[i];
    if (s.remaining <= 0 || s.stacks <= 0) continue;
    const def = STATUS_DEFS[s.id];
    if (!includeBeneficial && def?.beneficial) continue;
    let cue: StatusBodyCue | undefined = (s.visual && STATUS_APPEARANCES[s.visual]) || def?.bodyCue || (def && !def.beneficial ? DEBUFF_LOOKS[s.id]?.body : undefined);
    if (!cue) continue;
    if (cue.stackStage && s.stacks >= cue.stackStage.at) {
      cue = resolveStackStage(cue);
    }
    const wick = cue.durationPart, span = s.statusDuration ?? s.total;
    let exp = Infinity, sp = 0;
    if (wick && s.remainingKnown !== false && span && Number.isFinite(span) && Number.isFinite(s.remaining) && span > 0) {
      const step = Math.round(Math.min(1, Math.max(0, s.remaining / span)) * 32);
      cue = resolveWickCue(cue, step);
      exp = s.remaining;
      sp = span;
    }
    cues ??= [];
    let prior = -1;
    if (cue.group) {
      for (let j = 0; j < count; j++) {
        if (cues[j].group === cue.group) { prior = j; break; }
      }
    }
    if (prior < 0) {
      cues[count] = cue;
      scratchExp[count] = exp;
      scratchSpan[count] = sp;
      count++;
    } else if (takesPrecedence(cue.layer ?? 0, exp, sp, cues[prior].layer ?? 0, scratchExp[prior], scratchSpan[prior])) {
      cues[prior] = cue;
      scratchExp[prior] = exp;
      scratchSpan[prior] = sp;
    }
  }
  if (!cues || count === 0) return into ?? NO_CUES;
  if (count > 1) cues.sort(cmpCue);
  return cues;
}

export function collectStatusBodyParts(a: StatusBearer): PartSpec[] {
  return collectStatusBodyCues(a).flatMap(cue => cue.parts ?? []);
}

export function statusBodyLean(a: StatusBearer, cues = collectStatusBodyCues(a)): number {
  let lean = 0;
  for (let i = 0; i < cues.length; i++) {
    const cl = cues[i].lean ?? 0;
    if (cl > lean) lean = cl > 1 ? 1 : cl;
  }
  return lean;
}

export function drawStatusBodyCue(ctx: CanvasRenderingContext2D, look: BodyLook,
  cues: readonly StatusBodyCue[], time: number, upright: boolean): void {
  let seals = 0;
  for (let ci = 0; ci < cues.length; ci++) {
    const cue = cues[ci];
    if (!cue.parts || !!cue.upright !== upright) continue;
    if (!cue.crownSlot) {
      drawPartSpecs(ctx, look, cue.parts, time);
      continue;
    }
    const side = seals % 2 === 0 ? 1 : -1;
    const index = Math.floor(seals++ / 2), slots = VIS_CFG.statusSeals;
    const rows = Math.max(1, Math.floor(slots.rowsPerSide));
    const row = index % rows, column = Math.floor(index / rows);
    ctx.save();
    ctx.translate(side * look.radius * ((row ? slots.flank : slots.shoulder) + column * slots.columnGap),
      look.radius * (slots.top + row * slots.rowGap));
    drawPartSpecs(ctx, look, cue.parts, time);
    ctx.restore();
  }
}
