// ---------------------------------------------------------------------------
// CURSOR IDENTITY — Hollow Wake's pointer as DATA, one identity driving every
// aiming surface:
//
//   • The OS mouse cursor: a canvas-painted thematic cursor via CSS
//     `url(data:…)`, chosen from the CURSOR_STYLES registry and tinted by a
//     player-picked color (Settings.cursor) — so it can stand out against any
//     visual clutter. 'system' opts back into the native arrow.
//   • THE CURSOR COSTUME: the whole AFFORDANCE SET — hover-a-button, pressed,
//     text entry, grab/drag, help, copy, crosshair — derived from that same
//     style + tint (CursorRole variants: lit/tilted/re-glyphed in the one rim
//     discipline), so no interactive surface ever snaps back to the OS stock
//     arrow. applyCursor publishes each role as a root CSS custom property
//     (`--cursor-<role>`) and flags `html.cursor-themed`; declaration sites
//     opt in with `cursor: var(--cursor-<role>, <stock keyword>)` — the
//     fallback keyword IS the un-themed behavior, so the 'system' style
//     (properties stripped, class off) is byte-clean stock everywhere. A
//     small injected sheet (ensureCursorSheet) covers only the STRUCTURAL
//     surfaces authored CSS never names — UA-default form controls, the
//     :active press beat, text fields — never per-panel rules.
//     NEW PANEL CODE: never write a bare `cursor: pointer` — speak the
//     ladder (`var(--cursor-point, pointer)`) and the costume follows.
//   • The PAD AIM RETICLE: the visible in-world cursor the right stick moves
//     (drawn by the renderer at the pad's aim point), painted here so it
//     shares the same color identity.
//
// Adding a cursor style is ONE registry entry — a painter over a small
// canvas — no renderer or settings-UI edits (the options view iterates the
// registry; unknown saved styles fall back to the default on load), and the
// costume derives every role variant from the style's own painter for free.
// ---------------------------------------------------------------------------

/** The player-facing cursor choice, persisted in Settings.cursor. */
export interface CursorOptions {
  /** A CURSOR_STYLES id ('system' = native OS arrow). */
  style: string;
  /** Any CSS color; the palette below feeds the options swatches. */
  color: string;
}

export interface CursorStyleDef {
  id: string;
  /** Options-UI label. */
  label: string;
  /** Canvas edge in px (cursor images render at intrinsic size). */
  size: number;
  /** Click hotspot within the image. */
  hotspot: [number, number];
  /** Paint the cursor into a size×size canvas in the given tint. */
  paint: (ctx: CanvasRenderingContext2D, size: number, color: string) => void;
}

/** Swatch palette for the options UI — picked to survive every biome's
 *  clutter. The color is stored as plain CSS, so mods/hand-edited saves may
 *  use any color; these are just the offered set. */
export const CURSOR_COLORS: ReadonlyArray<{ label: string; css: string }> = [
  { label: 'Wake Gold', css: '#c8a84b' },
  { label: 'Bone', css: '#e8dcc8' },
  { label: 'Ember', css: '#e8683a' },
  { label: 'Verdigris', css: '#54d8a4' },
  { label: 'Arcane', css: '#b06bd4' },
  { label: 'Ice', css: '#6ab8e8' },
];

export const DEFAULT_CURSOR_OPTIONS: CursorOptions = { style: 'wake', color: '#c8a84b' };

/** Shared stroke discipline: every style is dark-rimmed then tinted, so it
 *  reads against both a snowfield and an ink-black cave. */
const rim = (ctx: CanvasRenderingContext2D, path: () => void, color: string): void => {
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = 'rgba(8,8,12,0.92)';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  path();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
};

export const CURSOR_STYLES: Record<string, CursorStyleDef> = {
  /** The signature: a swallowtail arrow with a hollow "wake" eye. */
  wake: {
    id: 'wake', label: 'Wake', size: 26, hotspot: [2, 2],
    paint: (ctx, _s, color) => {
      const arrow = (): void => {
        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.lineTo(2, 20);
        ctx.lineTo(7.5, 15.5);
        ctx.lineTo(11.5, 23.5);
        ctx.lineTo(15, 21.5);
        ctx.lineTo(11.5, 14);
        ctx.lineTo(18.5, 13);
        ctx.closePath();
      };
      rim(ctx, arrow, color);
      // The hollow eye — punched clean through (the "wake").
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(7.2, 8.2, 2.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(8,8,12,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(7.2, 8.2, 2.1, 0, Math.PI * 2);
      ctx.stroke();
    },
  },
  /** A centered ring-and-dot — the precision pick (hotspot at its heart). */
  sigil: {
    id: 'sigil', label: 'Sigil', size: 26, hotspot: [13, 13],
    paint: (ctx, _s, color) => {
      const ring = (): void => {
        ctx.beginPath();
        ctx.arc(13, 13, 7.5, 0, Math.PI * 2);
      };
      ring();
      ctx.strokeStyle = 'rgba(8,8,12,0.92)';
      ctx.lineWidth = 5.5;
      ctx.stroke();
      ring();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // four compass ticks + the center point
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        ctx.beginPath();
        ctx.moveTo(13 + dx * 9.5, 13 + dy * 9.5);
        ctx.lineTo(13 + dx * 12.5, 13 + dy * 12.5);
        ctx.stroke();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(13, 13, 1.8, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  /** A raked talon — the bestial option. */
  talon: {
    id: 'talon', label: 'Talon', size: 26, hotspot: [2, 2],
    paint: (ctx, _s, color) => {
      const claw = (): void => {
        ctx.beginPath();
        ctx.moveTo(2, 2);
        ctx.quadraticCurveTo(16, 4, 21, 17);
        ctx.quadraticCurveTo(21.5, 20.5, 18.5, 22.5);
        ctx.quadraticCurveTo(18, 15, 10.5, 9.5);
        ctx.quadraticCurveTo(5, 5.5, 2, 2);
        ctx.closePath();
      };
      rim(ctx, claw, color);
    },
  },
  /** Native OS arrow — cursorCss returns '' and the browser default rules. */
  system: {
    id: 'system', label: 'System', size: 0, hotspot: [0, 0],
    paint: () => { /* never painted */ },
  },
};

/** Data-URL CSS for a style+color ('' = use the native cursor). Cached per
 *  (style, color) — recoloring in the options re-paints once, not per frame. */
const cssCache = new Map<string, string>();
export function cursorCss(styleId: string, color: string): string {
  const def = CURSOR_STYLES[styleId];
  if (!def || def.id === 'system' || typeof document === 'undefined') return '';
  const key = `${def.id}|${color}`;
  const hit = cssCache.get(key);
  if (hit !== undefined) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = def.size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  def.paint(ctx, def.size, color);
  const css = `url(${c.toDataURL('image/png')}) ${def.hotspot[0]} ${def.hotspot[1]}, auto`;
  cssCache.set(key, css);
  return css;
}

// ------------------------------------------------------- the cursor costume --

/** The affordance roles the costume covers. 'default' is the style's own art;
 *  the rest are DERIVED from it (lit, tilted, badged) or drawn as shared
 *  glyphs in the same rim discipline + tint, so the set reads as one hand. */
export type CursorRole =
  | 'default' | 'point' | 'press' | 'text'
  | 'grab' | 'grabbing' | 'help' | 'copy' | 'crosshair';

export const CURSOR_ROLE_LIST: readonly CursorRole[] = [
  'default', 'point', 'press', 'text', 'grab', 'grabbing', 'help', 'copy', 'crosshair',
];

/** Stock keyword per role — the url() fallback AND the var() fallback panels
 *  write, so an un-themed ('system') document behaves byte-identically to the
 *  pre-costume game. */
const ROLE_FALLBACK: Record<CursorRole, string> = {
  default: 'auto', point: 'pointer', press: 'pointer', text: 'text',
  grab: 'grab', grabbing: 'grabbing', help: 'help', copy: 'copy', crosshair: 'crosshair',
};

/** Glow headroom around the lit/pressed variants. 26 + 2×3 = 32px — the
 *  ceiling where custom cursors stay honored across common DPI scales. */
const ROLE_PAD = 3;
/** Shared role glyphs (text/grab/crosshair) paint at the styles' own edge. */
const GLYPH_SIZE = 26;

/** Stroke discipline for line-drawn role glyphs — dark rim under a tint
 *  stroke, the read-anywhere contract rim() gives the filled styles. */
const inked = (
  ctx: CanvasRenderingContext2D, path: () => void, color: string, w = 2.2,
): void => {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = 'rgba(8,8,12,0.92)';
  ctx.lineWidth = w + 3;
  ctx.stroke();
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
};

/** Normalize any CSS color to rgb — the color is player data ("any CSS
 *  color"), so parsing rides the canvas' own normalizer, not a format list. */
let colorProbe: CanvasRenderingContext2D | null = null;
function parseColor(color: string): [number, number, number] | null {
  if (typeof document === 'undefined') return null;
  if (!colorProbe) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    colorProbe = c.getContext('2d');
  }
  if (!colorProbe) return null;
  colorProbe.fillStyle = '#000';
  colorProbe.fillStyle = color;
  const s = colorProbe.fillStyle;
  if (s.startsWith('#') && s.length === 7) {
    return [
      parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16),
    ];
  }
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** Lerp a tint toward white — the "lit" read of the hover/press variants. */
function lighten(color: string, t: number): string {
  const c = parseColor(color);
  if (!c) return color;
  return `rgb(${c.map(v => Math.round(v + (255 - v) * t)).join(',')})`;
}

/** The style's base art on its own scratch canvas (null = no 2d context). */
function paintStyleArt(def: CursorStyleDef, color: string): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = c.height = def.size;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  def.paint(ctx, def.size, color);
  return c;
}

/** Corner badge for the help/copy variants — a dark coin in the rim
 *  discipline wearing a tint glyph, composited over the style's own arrow. */
function paintBadge(ctx: CanvasRenderingContext2D, glyph: '?' | '+', color: string): void {
  const bx = 18.5, by = 18.5, r = 6;
  ctx.beginPath();
  ctx.arc(bx, by, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,8,12,0.92)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (glyph === '+') {
    inked(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(bx - 3, by);
      ctx.lineTo(bx + 3, by);
      ctx.moveTo(bx, by - 3);
      ctx.lineTo(bx, by + 3);
    }, color, 1.6);
  } else {
    ctx.fillStyle = color;
    ctx.font = 'bold 9px Verdana, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', bx, by + 0.5);
  }
}

/** Paint one role variant for a style+tint. Returns the canvas + hotspot
 *  (hotspot-anchored transforms keep the click point EXACTLY where the base
 *  art put it — the tip never drifts between states). */
function roleArt(
  def: CursorStyleDef, color: string, role: CursorRole,
): { canvas: HTMLCanvasElement; hotspot: [number, number] } | null {
  const [hx, hy] = def.hotspot;
  // Derived-from-the-arrow roles ------------------------------------------
  if (role === 'default' || role === 'help' || role === 'copy') {
    const base = paintStyleArt(def, color);
    if (!base) return null;
    if (role !== 'default') {
      const ctx = base.getContext('2d');
      if (ctx) paintBadge(ctx, role === 'help' ? '?' : '+', color);
    }
    return { canvas: base, hotspot: [hx, hy] };
  }
  if (role === 'point' || role === 'press') {
    // The "about to click" read: the same arrow LIT — tint lifted toward
    // white under a soft same-tint halo. Press adds the stamp: the body
    // compresses and tips a few degrees ABOUT THE HOTSPOT, so the click
    // point holds still while the cursor visibly commits.
    const lit = paintStyleArt(def, lighten(color, 0.32));
    if (!lit) return null;
    const out = document.createElement('canvas');
    out.width = out.height = def.size + ROLE_PAD * 2;
    const ctx = out.getContext('2d');
    if (!ctx) return null;
    ctx.shadowColor = color;
    if (role === 'press') {
      ctx.shadowBlur = 1.5;
      ctx.translate(hx + ROLE_PAD, hy + ROLE_PAD);
      ctx.rotate(0.10);
      ctx.scale(0.85, 0.85);
      ctx.translate(-hx, -hy);
      ctx.drawImage(lit, 0, 0);
    } else {
      ctx.shadowBlur = 2.5;
      ctx.drawImage(lit, ROLE_PAD, ROLE_PAD);
      ctx.drawImage(lit, ROLE_PAD, ROLE_PAD); // second pass fills the halo
    }
    return { canvas: out, hotspot: [hx + ROLE_PAD, hy + ROLE_PAD] };
  }
  // Shared glyph roles ----------------------------------------------------
  const c = document.createElement('canvas');
  c.width = c.height = GLYPH_SIZE;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const m = GLYPH_SIZE / 2;
  if (role === 'text') {
    // A serifed I-beam in the tint — the typing surface stays in costume.
    inked(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(m - 3.5, 4.5);
      ctx.lineTo(m + 3.5, 4.5);
      ctx.moveTo(m, 4.5);
      ctx.lineTo(m, GLYPH_SIZE - 4.5);
      ctx.moveTo(m - 3.5, GLYPH_SIZE - 4.5);
      ctx.lineTo(m + 3.5, GLYPH_SIZE - 4.5);
    }, color, 2);
  } else if (role === 'grab' || role === 'grabbing') {
    // The grip: two facing talon arcs around the held point — open hovers,
    // closed clenches (tighter radius, longer arcs) while a drag rides.
    const r = role === 'grab' ? 8.5 : 6.5;
    const span = role === 'grab' ? 0.62 : 0.82; // arc half-length (× π/2)
    for (const side of [0, Math.PI] as const) {
      inked(ctx, () => {
        ctx.beginPath();
        ctx.arc(m, m, r, side - span * Math.PI * 0.5, side + span * Math.PI * 0.5);
      }, color, 2.2);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(m, m, 1.8, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // crosshair — the sigil's compass ticks without its ring: aim, bare.
    inked(ctx, () => {
      ctx.beginPath();
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
        ctx.moveTo(m + dx * 4, m + dy * 4);
        ctx.lineTo(m + dx * 11, m + dy * 11);
      }
    }, color, 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(m, m, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  return { canvas: c, hotspot: [m, m] };
}

/** Data-URL CSS for one role of a style+color ('' = stock). Cached like
 *  cursorCss — a costume re-paints once per (style, color) change. */
const roleCssCache = new Map<string, string>();
export function cursorRoleCss(styleId: string, color: string, role: CursorRole): string {
  if (role === 'default') return cursorCss(styleId, color);
  const def = CURSOR_STYLES[styleId];
  if (!def || def.id === 'system' || typeof document === 'undefined') return '';
  const key = `${def.id}|${color}|${role}`;
  const hit = roleCssCache.get(key);
  if (hit !== undefined) return hit;
  const art = roleArt(def, color, role);
  if (!art) return '';
  const css = `url(${art.canvas.toDataURL('image/png')}) ${art.hotspot[0]} ${art.hotspot[1]}, ${ROLE_FALLBACK[role]}`;
  roleCssCache.set(key, css);
  return css;
}

/** The one injected sheet: STRUCTURAL affordances authored CSS never names —
 *  UA-default form controls, the :active press beat, text fields, disabled
 *  rests. Everything keys on html.cursor-themed (the 'system' style clears
 *  the class, so stock keywords rule again) and speaks the same --cursor-*
 *  ladder the panels opt into. Panel-specific rules NEVER land here. */
function ensureCursorSheet(): void {
  if (document.getElementById('cursor-theme-sheet')) return;
  const st = document.createElement('style');
  st.id = 'cursor-theme-sheet';
  st.textContent = `
    html.cursor-themed button:not(:disabled), html.cursor-themed a,
    html.cursor-themed select:not(:disabled), html.cursor-themed summary,
    html.cursor-themed input[type=checkbox]:not(:disabled),
    html.cursor-themed input[type=radio]:not(:disabled),
    html.cursor-themed input[type=range]:not(:disabled)
      { cursor: var(--cursor-point); }
    html.cursor-themed button:not(:disabled):active, html.cursor-themed a:active,
    html.cursor-themed select:not(:disabled):active, html.cursor-themed summary:active,
    html.cursor-themed input[type=checkbox]:not(:disabled):active,
    html.cursor-themed input[type=radio]:not(:disabled):active,
    html.cursor-themed input[type=range]:not(:disabled):active
      { cursor: var(--cursor-press); }
    html.cursor-themed input[type=text], html.cursor-themed input[type=number],
    html.cursor-themed input[type=search], html.cursor-themed input:not([type]),
    html.cursor-themed textarea
      { cursor: var(--cursor-text); }
    html.cursor-themed button:disabled, html.cursor-themed select:disabled,
    html.cursor-themed input:disabled, html.cursor-themed textarea:disabled
      { cursor: var(--cursor-default); }
  `;
  document.head.appendChild(st);
}

/** Apply the chosen cursor identity to the whole document: the base cursor on
 *  <body> (canvas + bare panel ground), and THE COSTUME — every role variant
 *  published as a root `--cursor-<role>` property under html.cursor-themed,
 *  which panels' `var(--cursor-*, keyword)` declarations and the structural
 *  sheet resolve. 'system' strips properties + class: stock, byte-clean. */
export function applyCursor(opts: CursorOptions): void {
  const base = cursorCss(opts.style, opts.color);
  document.body.style.cursor = base;
  ensureCursorSheet();
  const root = document.documentElement;
  const themed = base !== '';
  root.classList.toggle('cursor-themed', themed);
  for (const role of CURSOR_ROLE_LIST) {
    const css = themed ? cursorRoleCss(opts.style, opts.color, role) : '';
    if (css !== '') root.style.setProperty(`--cursor-${role}`, css);
    else root.style.removeProperty(`--cursor-${role}`);
  }
}

// ------------------------------------------------------------- pad reticle --

/** Reticle feel numbers — engine-side, moddable (the tint comes from the
 *  player's Settings.cursor color so mouse and pad share one identity). */
export const RETICLE_CFG = {
  /** Ring radius (world units at zoom 1) + the center dot. */
  radius: 12,
  dot: 2,
  /** Compass tick length just outside the ring. */
  tick: 5,
  /** Lock brackets: how far outside the target's radius they sit, their arm
   *  length, and the soft pulse period (seconds). */
  lockPad: 6,
  lockArm: 7,
  pulseSec: 1.1,
  lineWidth: 2,
  alpha: 0.95,
} as const;

/** Paint the pad-aim reticle at (x,y) — plus soft-lock brackets around a
 *  magnetized target when aim assist holds one. Drawn in WORLD space by the
 *  renderer (camera transform already applied). */
export function drawAimReticle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  time: number,
  lock?: { x: number; y: number; r: number },
): void {
  const R = RETICLE_CFG;
  ctx.save();
  ctx.globalAlpha = R.alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = R.lineWidth;
  ctx.shadowColor = 'rgba(8,8,12,0.9)';
  ctx.shadowBlur = 3;
  // ring + heart
  ctx.beginPath();
  ctx.arc(x, y, R.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, R.dot, 0, Math.PI * 2);
  ctx.fill();
  // compass ticks
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx * (R.radius + 2), y + dy * (R.radius + 2));
    ctx.lineTo(x + dx * (R.radius + 2 + R.tick), y + dy * (R.radius + 2 + R.tick));
    ctx.stroke();
  }
  // soft-lock brackets: four corner arms hugging the held target, breathing
  // gently so the magnetism reads as ALIVE rather than a hard laser-lock.
  if (lock) {
    const pulse = 1 + 0.12 * Math.sin((time / RETICLE_CFG.pulseSec) * Math.PI * 2);
    const r = (lock.r + R.lockPad) * pulse;
    ctx.globalAlpha = R.alpha * 0.85;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(lock.x + sx * r, lock.y + sy * (r - R.lockArm));
      ctx.lineTo(lock.x + sx * r, lock.y + sy * r);
      ctx.lineTo(lock.x + sx * (r - R.lockArm), lock.y + sy * r);
      ctx.stroke();
    }
  }
  ctx.restore();
}
