// ---------------------------------------------------------------------------
// AIM TICK — the small facing pointer worn by everything that ACTS in a
// direction. During a cast the facing rides the cast lock, so the tick IS the
// honest "this is where it will land" readout; between casts it's the body's
// intent line. One registry of STYLES: each entry owns its geometry and paint,
// the options menu lists whatever is registered, and Settings.aimTick picks a
// style + an opacity (0 hides ticks entirely — the see-the-monster option).
// A new style is ONE entry here — no renderer or menu edits (the cursor
// identity pattern, core/cursor.ts).
//
// WHO wears a tick is the engine's call, not the renderer's: Actor.aims —
// stamped by CONSTRUCT_KIND_AIMS (engine/skills.ts) for deployed furniture
// and by MonsterDef.aims for bestiary bodies.
// ---------------------------------------------------------------------------

export interface AimTickStyleDef {
  id: string;
  /** Options-menu button label. */
  label: string;
  /** Paint the tick in BODY SPACE (origin = the actor's center; the body
   *  transform is already applied). `radius` is the body radius. The caller
   *  owns alpha (player setting × the body's own fade) — a style picks only
   *  shape and paint. */
  draw: (ctx: CanvasRenderingContext2D, facing: number, radius: number) => void;
}

export const AIM_TICK_STYLES: Record<string, AimTickStyleDef> = {
  /** The classic: a radial line from mid-body to the rim. */
  line: {
    id: 'line', label: 'Line',
    draw: (ctx, facing, radius) => {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(facing) * radius * 0.4, Math.sin(facing) * radius * 0.4);
      ctx.lineTo(Math.cos(facing) * radius, Math.sin(facing) * radius);
      ctx.stroke();
    },
  },
  /** Minimal: a single dot riding the rim — the body stays unobstructed. */
  dot: {
    id: 'dot', label: 'Dot',
    draw: (ctx, facing, radius) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(Math.cos(facing) * radius, Math.sin(facing) * radius,
        Math.max(1.8, radius * 0.14), 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

/** The player's tick preferences (persisted in Settings.aimTick). */
export interface AimTickOptions {
  /** An AIM_TICK_STYLES id; unknown ids (a removed entry) fall back. */
  style: string;
  /** 0..1, multiplied onto the body's own fade; 0 hides ticks entirely. */
  alpha: number;
}

/** alpha 0.8 = the pre-options look, verbatim. */
export const DEFAULT_AIM_TICK: AimTickOptions = { style: 'line', alpha: 0.8 };
