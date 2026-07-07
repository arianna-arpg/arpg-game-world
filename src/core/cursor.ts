// ---------------------------------------------------------------------------
// CURSOR IDENTITY — Hollow Wake's pointer as DATA, one identity driving every
// aiming surface:
//
//   • The OS mouse cursor: a canvas-painted thematic cursor via CSS
//     `url(data:…)`, chosen from the CURSOR_STYLES registry and tinted by a
//     player-picked color (Settings.cursor) — so it can stand out against any
//     visual clutter. 'system' opts back into the native arrow.
//   • The PAD AIM RETICLE: the visible in-world cursor the right stick moves
//     (drawn by the renderer at the pad's aim point), painted here so it
//     shares the same color identity.
//
// Adding a cursor style is ONE registry entry — a painter over a small
// canvas — no renderer or settings-UI edits (the options view iterates the
// registry; unknown saved styles fall back to the default on load).
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

/** Apply the chosen cursor identity to the whole document (panels' own
 *  `cursor: pointer` affordances still override on their elements). */
export function applyCursor(opts: CursorOptions): void {
  document.body.style.cursor = cursorCss(opts.style, opts.color);
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
