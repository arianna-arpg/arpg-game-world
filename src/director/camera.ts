// ---------------------------------------------------------------------------
// THE DIRECTOR'S CAMERA — a cinematic eye for the live renderer: follow a
// subject with a critically damped spring and a velocity lead, ride keyed
// paths and zoom curves, and keep a set of bodies in frame. Pure math over
// plain points; director.ts hands the result to the renderer through the
// frame-lock seam (World.frameLockFocus) and Renderer.setBaseZoom, so the
// game's own camera placement (clamps, modes) still has the last word.
// Contract: docs/engine/director.md.
// ---------------------------------------------------------------------------

export interface Pt { x: number; y: number }

export type Ease = 'linear' | 'inOut' | 'in' | 'out' | 'inOutCubic' | 'outCubic' | 'inCubic';

/** [t, value, ease into this key] */
export type ZoomKey = [number, number, Ease?];
/** [t, x, y, ease into this key] */
export type PathKey = [number, number, number, Ease?];

export interface CameraSpec {
  /** The subject: the hero, an actor id, or a fixed world point. */
  follow?: 'hero' | number | Pt;
  /** Offset from the subject (world units). */
  offset?: Pt;
  /** Seconds of velocity lead (looks ahead of a moving subject). */
  lead?: number;
  /** Spring half-life in seconds (0 = rigid). */
  damp?: number;
  /** Zoom at a 1920-wide reference frame: a constant, or keys over shot time. */
  zoom?: number | ZoomKey[];
  /** Keyed focus path (overrides follow). Coordinates are relative to the
   *  hero's position at the start of the shot unless pathSpace is 'world'. */
  path?: PathKey[];
  pathSpace?: 'world' | 'hero';
  /** Blend the focus toward the centroid of the live foes near the subject
   *  (0..1), within `radius`: keeps the fight in frame. */
  frameFoes?: { weight: number; radius: number };
}

export function ease(e: Ease | undefined, u: number): number {
  const x = Math.max(0, Math.min(1, u));
  switch (e) {
    case 'linear': return x;
    case 'in': return x * x;
    case 'out': return 1 - (1 - x) * (1 - x);
    case 'inCubic': return x * x * x;
    case 'outCubic': return 1 - Math.pow(1 - x, 3);
    case 'inOutCubic': return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'inOut': default: return x * x * (3 - 2 * x);
  }
}

/** Sample a keyed scalar track at t. */
export function sampleKeys(keys: ZoomKey[], t: number): number {
  if (!keys.length) return 1;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return v0 + (v1 - v0) * ease(e, (t - t0) / Math.max(1e-6, t1 - t0));
  }
  return keys[keys.length - 1][1];
}

/** Sample a keyed path at t. */
export function samplePath(keys: PathKey[], t: number): Pt {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  for (let i = 1; i < keys.length; i++) {
    const [t1, x1, y1, e] = keys[i];
    const [t0, x0, y0] = keys[i - 1];
    if (t <= t1) {
      const u = ease(e, (t - t0) / Math.max(1e-6, t1 - t0));
      return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k[1], y: k[2] };
}

/** The live camera: call step() once per frame with the subject's state. */
export class CinematicCamera {
  pos: Pt | null = null;
  private vel: Pt = { x: 0, y: 0 };
  private lastSubject: Pt | null = null;
  private subjectVel: Pt = { x: 0, y: 0 };
  constructor(public spec: CameraSpec, private origin: Pt) {}

  /** Advance to shot time t (dt = seconds since the last step). */
  step(t: number, dt: number, subject: Pt, foes: readonly Pt[]): { focus: Pt; zoom: number } {
    const s = this.spec;
    // Subject velocity (smoothed) for the lead.
    if (this.lastSubject && dt > 0) {
      const vx = (subject.x - this.lastSubject.x) / dt, vy = (subject.y - this.lastSubject.y) / dt;
      const k = Math.min(1, dt * 4);
      this.subjectVel = { x: this.subjectVel.x + (vx - this.subjectVel.x) * k, y: this.subjectVel.y + (vy - this.subjectVel.y) * k };
    }
    this.lastSubject = { x: subject.x, y: subject.y };

    let target: Pt;
    if (s.path?.length) {
      const p = samplePath(s.path, t);
      target = s.pathSpace === 'world' ? p : { x: this.origin.x + p.x, y: this.origin.y + p.y };
    } else {
      const lead = s.lead ?? 0;
      target = { x: subject.x + this.subjectVel.x * lead + (s.offset?.x ?? 0), y: subject.y + this.subjectVel.y * lead + (s.offset?.y ?? 0) };
      if (s.frameFoes && foes.length) {
        let sx = 0, sy = 0, n = 0;
        for (const f of foes) {
          if (Math.hypot(f.x - subject.x, f.y - subject.y) > s.frameFoes.radius) continue;
          sx += f.x; sy += f.y; n++;
        }
        if (n) {
          const w = s.frameFoes.weight;
          target = { x: target.x + (sx / n - subject.x) * w, y: target.y + (sy / n - subject.y) * w };
        }
      }
    }
    // Critically damped spring toward the target.
    if (!this.pos) this.pos = { ...target };
    const hl = s.path?.length ? 0 : (s.damp ?? 0.25);
    if (hl <= 0 || dt <= 0) { this.pos = { ...target }; this.vel = { x: 0, y: 0 }; }
    else {
      const omega = 1.386 / hl; // ln(4)/halflife ≈ critically damped feel
      const x = this.pos.x - target.x, y = this.pos.y - target.y;
      const exp = Math.exp(-omega * dt);
      const tx = (this.vel.x + omega * x) * dt, ty = (this.vel.y + omega * y) * dt;
      this.vel = { x: (this.vel.x - omega * tx) * exp, y: (this.vel.y - omega * ty) * exp };
      this.pos = { x: target.x + (x + tx) * exp, y: target.y + (y + ty) * exp };
    }
    const zoom = typeof s.zoom === 'number' ? s.zoom : s.zoom?.length ? sampleKeys(s.zoom, t) : 1.3;
    return { focus: { ...this.pos }, zoom };
  }
}
