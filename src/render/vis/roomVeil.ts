// ---------------------------------------------------------------------------
// THE ROOM VEIL — interior vision confinement (VIS_CFG.roomVeil).
//
// While the local hero stands under a CONFINING structure's roof
// (StructureDef.confineVision → PlacedStructure.confineVision), the rendered
// world beyond the room veils dark: a downscaled sheet of "unseen" with the
// room's rects — and its doorways — punched out (the light layer's
// destination-out idiom; soft edges come free with the buffer's resolution
// plus a blur feather). The Cellar's deliberate smallness, made LOCAL: the
// playing field is these four walls until you step through the frame.
//
// RENDER-ONLY by doctrine. Gameplay LoS (engine/los.ts) keeps its own honest
// occlusion — walls already block sight and shots; this pass is the drawn
// horizon of attention, plus the label gate riding veiledAt(). Weather's
// wash/particles damp against frac() (the psychological shelter lever).
//
// EXTENSIBLE by shape: the pass draws VISION VOLUMES (rects + spill discs),
// and today's single SOURCE is the confining roofed room. A future cave
// throat, curse, or dream pocket feeds the same volume and inherits the
// whole treatment — add a source, not a pass.
// ---------------------------------------------------------------------------

import { VIS_CFG } from './visConfig';

interface Rect { x: number; y: number; w: number; h: number }
interface Pt { x: number; y: number }

/** What the veil draws: clear rects + clear discs, everything else dark.
 *  `alpha` lets a source soften its own dark (a lantern-lit undercroft may
 *  confine at 0.6 where a windowless cottage closes at 1). */
export interface VisionVolume {
  rects: Rect[];
  spills: { x: number; y: number; r: number }[];
  alpha?: number;
}

/** The sliver of World this pass needs (structural — the vis layer never
 *  imports the engine's World; PlacedStructure satisfies ConfineStructure). */
interface ConfineStructure {
  id: string;
  confineVision?: boolean;
  roofs: Rect[];
  doors: { pos: Pt; normal: Pt; door: { open?: boolean; broken?: boolean; cells?: Rect } }[];
}
interface RoomView {
  player: { pos: Pt };
  roofedStructureAt(pos: Pt): ConfineStructure | null;
}

/** Build the confining room's volume: padded roof rects, every doorway's
 *  cells (the door is the room's one promise — it must stay seen, latched or
 *  not), and a spill disc past each OPEN aperture (the world, glimpsed
 *  through the frame you dwell in). */
function roomVolume(st: ConfineStructure): VisionVolume {
  const cfg = VIS_CFG.roomVeil;
  const p = cfg.pad;
  const rects: Rect[] = st.roofs.map(r => ({ x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 }));
  const spills: { x: number; y: number; r: number }[] = [];
  for (const d of st.doors) {
    const c = d.door.cells;
    if (c) rects.push({ x: c.x - p, y: c.y - p, w: c.w + p * 2, h: c.h + p * 2 });
    if (d.door.open || d.door.broken) {
      spills.push({
        x: d.pos.x + d.normal.x * cfg.doorSpill * 0.45,
        y: d.pos.y + d.normal.y * cfg.doorSpill * 0.45,
        r: cfg.doorSpill,
      });
    }
  }
  return { rects, spills };
}

export class RoomVeil {
  private buf = document.createElement('canvas');
  private bctx = this.buf.getContext('2d')!;
  /** Smoothed confinement (0 open world .. 1 fully wrapped). */
  private fade = 0;
  /** The volume the veil wraps — held while fading out so leaving a room
   *  releases the dark around the room you LEFT, not around nothing. */
  private vol: VisionVolume | null = null;

  /** Resolve the hero's confinement + advance the fade. Once per frame,
   *  before draw — render-clock (frameDt), like every other smoothed fade. */
  update(world: RoomView, dt: number): void {
    const cfg = VIS_CFG.roomVeil;
    let target = 0;
    if (cfg.enabled) {
      const st = world.roofedStructureAt(world.player.pos);
      if (st?.confineVision) {
        this.vol = roomVolume(st); // rebuilt live: a door opened from inside spills at once
        target = 1;
      }
    }
    this.fade += (target - this.fade) * Math.min(1, dt * cfg.fadeRate);
    if (target === 0 && this.fade < 0.01) { this.fade = 0; this.vol = null; }
  }

  /** Confinement felt right now (0..1) — the atmosphere pass damps its
   *  weather wash/particles/wind streaks against this. */
  frac(): number {
    return this.vol ? this.fade * (this.vol.alpha ?? 1) : 0;
  }

  /** How veiled a WORLD point is (0 clear .. 1 unseen) — the label pass
   *  multiplies its reveal through this, so nameplates beyond the room hide
   *  with the world they stand in. */
  veiledAt(pos: Pt): number {
    const f = this.frac();
    if (f <= 0.02 || !this.vol) return 0;
    for (const r of this.vol.rects) {
      if (pos.x > r.x && pos.x < r.x + r.w && pos.y > r.y && pos.y < r.y + r.h) return 0;
    }
    for (const s of this.vol.spills) {
      const dx = pos.x - s.x, dy = pos.y - s.y;
      if (dx * dx + dy * dy < s.r * s.r) return 0;
    }
    return f;
  }

  /** Composite the veil over the drawn world. Screen space, untransformed
   *  ctx, projected through the same cam the light layer uses. Free when
   *  the hero is anywhere but inside a confining room (fade 0 → no-op). */
  draw(ctx: CanvasRenderingContext2D, camX: number, camY: number,
    zoom: number, w: number, h: number): void {
    const cfg = VIS_CFG.roomVeil;
    const a = this.frac() * cfg.alpha;
    if (a <= 0.02 || !this.vol) return;
    const scale = cfg.scale;
    const bw = Math.max(2, Math.ceil(w * scale)), bh = Math.max(2, Math.ceil(h * scale));
    if (this.buf.width !== bw || this.buf.height !== bh) {
      this.buf.width = bw; this.buf.height = bh;
    }
    const b = this.bctx;
    const t = cfg.tint;
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, 0, bw, bh);
    b.fillStyle = `rgba(${t.r},${t.g},${t.b},${a.toFixed(3)})`;
    b.fillRect(0, 0, bw, bh);
    // Punch the volume clear — alpha subtraction; the feather blurs every
    // punched edge so the dark laps at the walls instead of guillotining.
    b.globalCompositeOperation = 'destination-out';
    if (cfg.featherPx > 0) b.filter = `blur(${cfg.featherPx}px)`;
    b.fillStyle = '#fff';
    const k = zoom * scale;
    for (const r of this.vol.rects) {
      b.fillRect((r.x - camX) * k, (r.y - camY) * k, r.w * k, r.h * k);
    }
    for (const s of this.vol.spills) {
      b.beginPath();
      b.arc((s.x - camX) * k, (s.y - camY) * k, s.r * k, 0, Math.PI * 2);
      b.fill();
    }
    if (cfg.featherPx > 0) b.filter = 'none';
    b.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.buf, 0, 0, bw, bh, 0, 0, w, h);
    ctx.restore();
  }
}
