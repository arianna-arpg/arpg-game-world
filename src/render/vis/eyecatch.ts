// ---------------------------------------------------------------------------
// THE EYECATCH — the super-art cut-away pane (engine/ultimates.ts).
//
// Vis-pure: this module knows no skill, no actor, no registry beyond its own.
// The renderer resolves the moment (progress, colors, the caster's portrait
// tile) into an EyecatchView and a registered painter draws the pane. Styles
// are an OPEN registry — a new banner look is one `registerEyecatchStyle`
// call, no renderer edits (the doodad-painter law, applied to drama).
//
// The pane is screen-anchored BY LAW (the status-overlay exemption to the
// anchored-sky doctrine): it happens TO the player, not in the world.
// Progress `t` runs 0..1 on Timeflow.age (the engine's raw clock — the pane
// animates straight through its own held beat); `clock` is the renderer's
// performance.now seconds, for shimmer that must move while the WORLD clock
// is the thing that froze (the drawTimeflow precedent).
// ---------------------------------------------------------------------------

/** Everything a painter gets — resolved upstream, no lookups down here. */
export interface EyecatchView {
  /** UI-space pane dims (the renderer's uiW/uiH). */
  w: number; h: number;
  /** Pane progress 0..1 (eyecatchElapsed / paneSec — THE ONE FOLD). */
  t: number;
  /** Renderer wall-clock seconds — shimmer/scroll only, never phase. */
  clock: number;
  /** Accent color (the skill's own, or the spec's tint). */
  tint: string;
  /** Side-coding: an enemy's pane is a telegraph and dresses like one. */
  side: 'ally' | 'enemy';
  title: string;
  sub?: string;
  /** The caster's portrait tile (renderer-built via the portrait fabric),
   *  or null when the body is already gone — painters must draw without. */
  avatar: HTMLCanvasElement | null;
}

export type EyecatchPainter = (ctx: CanvasRenderingContext2D, v: EyecatchView) => void;

/** The vis dials — one home, no magic numbers in the painters. */
export const EYECATCH_VIS = {
  /** Entrance / exit windows as fractions of the pane's life. */
  inFrac: 0.16,
  outFrac: 0.16,
  /** Full-screen wash darkness at ride (env-scaled in/out). */
  washAlpha: 0.62,
  /** The sunder band's lean (radians) and half-height (frac of h). */
  bandLean: -0.14,
  bandHalf: 0.36,
  /** Speed-line count + scroll speed (ui units/sec on `clock`). */
  lines: 26,
  lineSpeed: 2600,
  /** Avatar tile edge as a fraction of pane height, and its slow ride zoom. */
  avatarFrac: 0.78,
  avatarZoom: 0.07,
  /** Title size as a fraction of pane height. */
  titleFrac: 0.108,
  subFrac: 0.036,
  /** The pane's type — italic and heavy, matching the HUD family. */
  font: (px: number, weight = 900, italic = true): string =>
    `${italic ? 'italic ' : ''}${weight} ${Math.round(px)}px system-ui, sans-serif`,
  /** Side gutters: the ally's clean edge vs the enemy's blood edge. */
  allyEdge: '#f2f4ff',
  enemyEdge: '#ff5a4a',
  enemyWash: 'rgba(60,8,10,0.30)',
} as const;

// --- easing ------------------------------------------------------------------

const clamp01 = (x: number): number => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (x: number): number => { const c = clamp01(x); return c * c * (3 - 2 * c); };
/** Back-ease out: overshoots ~10% then settles — the cut-in snap. */
const backOut = (x: number): number => {
  const c = clamp01(x) - 1; const s = 1.70158;
  return c * c * ((s + 1) * c + s) + 1;
};
const h01 = (n: number): number => {
  // tiny deterministic hash — speed-line seeds, mote phases
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** THE FIT: shrink a headline's px until it sits inside its budget (floored
 *  at 0.5× — a truly endless name may still clip rather than vanish). Long
 *  art names must never ride into the avatar's third. */
function fitTitlePx(ctx: CanvasRenderingContext2D, text: string, px: number, maxW: number): number {
  ctx.font = EYECATCH_VIS.font(px);
  const tw = ctx.measureText(text).width;
  if (tw <= maxW) return px;
  return Math.max(px * 0.5, px * (maxW / tw));
}

/** The pane's shared envelope: 0→1 over inFrac, 1, 1→0 over outFrac. */
export function eyecatchEnv(t: number): { env: number; tin: number; tout: number } {
  const tin = smooth(t / EYECATCH_VIS.inFrac);
  const tout = smooth((1 - t) / EYECATCH_VIS.outFrac);
  return { env: Math.min(tin, tout), tin, tout };
}

// --- the styles --------------------------------------------------------------

/** 'sunder' — the diagonal slash cut-in: a leaning band sweeps the screen,
 *  the caster rides one third, the art's name the other, speed lines howl
 *  between. The Judgement-Cut school of announcement. */
const sunder: EyecatchPainter = (ctx, v) => {
  const { w, h } = v;
  const { env, tin, tout } = eyecatchEnv(v.t);
  if (env <= 0) return;
  const fromLeft = v.side === 'ally';
  const dir = fromLeft ? 1 : -1;
  const edge = fromLeft ? EYECATCH_VIS.allyEdge : EYECATCH_VIS.enemyEdge;
  // the whole composition slides: in with a snap, out with a shove
  const slide = (1 - backOut(tin)) * -w * 0.5 * dir + (1 - tout) * w * 0.6 * dir;

  ctx.save();
  // 1 · the wash — the world dims to watch
  ctx.fillStyle = `rgba(8,10,16,${(EYECATCH_VIS.washAlpha * env).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  if (v.side === 'enemy') { ctx.fillStyle = EYECATCH_VIS.enemyWash; ctx.fillRect(0, 0, w, h); }

  // 2 · the leaning band
  const cy = h * 0.5;
  const half = h * EYECATCH_VIS.bandHalf;
  const lean = EYECATCH_VIS.bandLean;
  ctx.translate(slide, 0);
  ctx.save();
  ctx.translate(w / 2, cy);
  ctx.rotate(lean);
  const bw = w * 1.6;
  const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
  const a = (x: number): string => `rgba(10,12,20,${x.toFixed(3)})`;
  grad.addColorStop(0, a(0));
  grad.addColorStop(0.18, a(0.88 * env));
  grad.addColorStop(0.82, a(0.88 * env));
  grad.addColorStop(1, a(0));
  ctx.fillStyle = grad;
  ctx.fillRect(-bw / 2, -half, bw, half * 2);
  // gutter edges — the cut's clean lips
  ctx.globalAlpha = env;
  ctx.fillStyle = edge;
  ctx.fillRect(-bw / 2, -half - h * 0.006, bw, h * 0.006);
  ctx.fillRect(-bw / 2, half, bw, h * 0.006);
  // tint bleed just inside each lip
  ctx.globalAlpha = 0.5 * env;
  ctx.fillStyle = v.tint;
  ctx.fillRect(-bw / 2, -half, bw, h * 0.012);
  ctx.fillRect(-bw / 2, half - h * 0.012, bw, h * 0.012);
  // 3 · speed lines, scrolling against the entrance
  ctx.globalAlpha = 1;
  for (let i = 0; i < EYECATCH_VIS.lines; i++) {
    const seed = h01(i + 1);
    const ly = -half + (i + 0.5) / EYECATCH_VIS.lines * half * 2;
    const len = w * (0.12 + 0.3 * h01(i + 40));
    const speed = EYECATCH_VIS.lineSpeed * (0.5 + seed);
    const lx = (((-v.clock * speed * dir + seed * bw * 2) % (bw * 1.2)) + bw * 1.2) % (bw * 1.2) - bw * 0.6;
    ctx.globalAlpha = (0.05 + 0.1 * h01(i + 80)) * env;
    ctx.fillStyle = i % 5 === 0 ? v.tint : '#e8ecf8';
    ctx.fillRect(lx, ly, len, Math.max(1, h * 0.0022));
  }
  ctx.restore();

  // 4 · the avatar — the caster, huge, slightly alive
  if (v.avatar) {
    const size = h * EYECATCH_VIS.avatarFrac * (1 + EYECATCH_VIS.avatarZoom * v.t);
    const ax = fromLeft ? w * 0.24 : w * 0.76;
    const ay = cy + h * 0.02;
    const glow = ctx.createRadialGradient(ax, ay, size * 0.1, ax, ay, size * 0.62);
    glow.addColorStop(0, `rgba(255,255,255,${(0.16 * env).toFixed(3)})`);
    glow.addColorStop(0.55, hexA(v.tint, 0.22 * env));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ax - size, ay - size, size * 2, size * 2);
    ctx.globalAlpha = env;
    ctx.drawImage(v.avatar, ax - size / 2, ay - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  // 5 · the words — name opposite the body, echo-shadowed, fitted to its
  // half so a long name never rides into the avatar's third
  const tx = fromLeft ? w * 0.63 : w * 0.37;
  const ty = cy - h * 0.015;
  const px = fitTitlePx(ctx, v.title, h * EYECATCH_VIS.titleFrac, w * 0.5);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = EYECATCH_VIS.font(px);
  ctx.globalAlpha = env;
  ctx.fillStyle = hexA(v.tint, 0.85);
  ctx.fillText(v.title, tx + px * 0.06 * dir, ty + px * 0.06);
  ctx.fillStyle = '#f4f6ff';
  ctx.fillText(v.title, tx, ty);
  if (v.sub) {
    ctx.font = EYECATCH_VIS.font(h * EYECATCH_VIS.subFrac, 600, false);
    ctx.fillStyle = 'rgba(220,226,244,0.85)';
    ctx.fillText(v.sub, tx, ty + px * 0.62);
  }
  ctx.restore();
};

/** 'eclipse' — the iris cut-in: the screen goes to a dark sky, one corona
 *  opens around the caster, motes fall inward. The black-hole school. */
const eclipse: EyecatchPainter = (ctx, v) => {
  const { w, h } = v;
  const { env, tin } = eyecatchEnv(v.t);
  if (env <= 0) return;
  const cx = w / 2, cy = h * 0.44;
  const R = h * 0.42 * backOut(tin);

  ctx.save();
  ctx.fillStyle = `rgba(4,5,10,${(Math.min(0.78, EYECATCH_VIS.washAlpha + 0.16) * env).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  if (v.side === 'enemy') { ctx.fillStyle = EYECATCH_VIS.enemyWash; ctx.fillRect(0, 0, w, h); }

  // the corona — dark heart, burning rim
  const cor = ctx.createRadialGradient(cx, cy, R * 0.42, cx, cy, R);
  cor.addColorStop(0, 'rgba(0,0,0,0)');
  cor.addColorStop(0.62, hexA(v.tint, 0.05 * env));
  cor.addColorStop(0.86, hexA(v.tint, 0.5 * env));
  cor.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cor;
  ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
  // thin turning rays
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(v.clock * 0.35);
  for (let i = 0; i < 5; i++) {
    ctx.rotate(Math.PI * 2 / 5);
    const ray = ctx.createLinearGradient(R * 0.8, 0, R * 1.5, 0);
    ray.addColorStop(0, hexA(v.tint, 0.34 * env));
    ray.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ray;
    ctx.fillRect(R * 0.8, -h * 0.0025, R * 0.7, h * 0.005);
  }
  ctx.restore();
  // motes spiraling inward
  for (let i = 0; i < 30; i++) {
    const ph = h01(i + 7);
    const fall = ((v.clock * (0.16 + 0.2 * h01(i + 21)) + ph) % 1);
    const rr = R * (1.35 - fall);
    const ang = ph * Math.PI * 2 + v.clock * (0.5 + ph) + fall * 2.2;
    ctx.globalAlpha = (0.5 - Math.abs(fall - 0.5)) * 1.1 * env;
    ctx.fillStyle = i % 4 === 0 ? '#f4f6ff' : v.tint;
    const mr = Math.max(1, h * 0.0035 * (1 - fall * 0.6));
    ctx.beginPath();
    ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.92, mr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // the avatar, centered in the dark heart
  if (v.avatar) {
    const size = h * (EYECATCH_VIS.avatarFrac * 0.8) * (1 + EYECATCH_VIS.avatarZoom * v.t);
    ctx.globalAlpha = env;
    ctx.drawImage(v.avatar, cx - size / 2, cy - size / 2, size, size);
    ctx.globalAlpha = 1;
  }

  // the words, beneath the eye — fitted to the pane's width
  const px = fitTitlePx(ctx, v.title, h * EYECATCH_VIS.titleFrac, w * 0.86);
  const ty = h * 0.82;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = EYECATCH_VIS.font(px);
  ctx.globalAlpha = env;
  ctx.fillStyle = hexA(v.tint, 0.85);
  ctx.fillText(v.title, cx, ty + px * 0.06);
  ctx.fillStyle = '#f4f6ff';
  ctx.fillText(v.title, cx, ty);
  if (v.sub) {
    ctx.font = EYECATCH_VIS.font(h * EYECATCH_VIS.subFrac, 600, false);
    ctx.fillStyle = 'rgba(220,226,244,0.85)';
    ctx.fillText(v.sub, cx, ty + px * 0.6);
  }
  ctx.restore();
};

/** Accent hex → rgba at alpha (tolerates #rgb/#rrggbb; else passes through). */
function hexA(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  let c = m[1];
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp01(alpha).toFixed(3)})`;
}

/** THE OPEN REGISTRY — style id → painter. Data picks by id
 *  (UltimateSpec.style); unknown ids fall back to ULT_CFG.style upstream. */
export const EYECATCH_STYLES: Record<string, EyecatchPainter> = {
  sunder,
  eclipse,
};

/** Register (or replace) a pane style — packages and mods welcome. */
export function registerEyecatchStyle(id: string, painter: EyecatchPainter): void {
  EYECATCH_STYLES[id] = painter;
}
