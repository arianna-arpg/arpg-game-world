import { Rng } from '../core/rng';

/** Rewardless loading toy. Coordinates are travel distance (u) and cross-lane
 * offset (v), independent of viewport, direction, world time and game RNG. */
export type SpiritDirection = 'down' | 'right' | 'left';
export const SPIRIT_RUN = Object.freeze({
  length: 1000, halfWidth: 280, playerU: 230, radius: 15,
  baseSpeed: 210, speedPerGate: 0.09, maxSpeed: 2.8,
  steerSpeed: 490, gateGap: 174, gateThickness: 22, gateSpacing: 340,
  hinderSeconds: 0.7, hinderSpeed: 0.36, entrySeconds: 0.7,
});
export interface SpiritGate { id: number; u: number; gap: number; resolved: boolean; hit: boolean }
export interface SpiritControls { axis: number; target?: number }
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

let spiritSequence = 0;
/** A private stream, seeded without consuming the combat/global random source. */
function spiritRandom(): () => number {
  const seed = typeof crypto !== 'undefined' ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
  const rng = new Rng(seed ^ ++spiritSequence);
  return () => rng.next();
}

export function spiritDirection(kind: 'entry' | 'travel', random = spiritRandom()): SpiritDirection {
  return kind === 'entry' ? 'down' : random() < 0.5 ? 'right' : 'left';
}

export class SpiritRun {
  time = 0;
  lane = 0;
  streak = 0;
  passed = 0;
  hits = 0;
  hinder = 0;
  distance = 0;
  gates: SpiritGate[] = [];
  private nextId = 1;
  private untilGate = 0;
  private gap = 0;
  constructor(readonly direction: SpiritDirection, private random: () => number = spiritRandom()) { this.spawn(); }
  get speed(): number { return Math.min(SPIRIT_RUN.maxSpeed, 1 + this.streak * SPIRIT_RUN.speedPerGate); }
  get playerU(): number { return SPIRIT_RUN.playerU * Math.min(1, this.time / SPIRIT_RUN.entrySeconds); }
  private spawn(): void {
    // Bound successive gaps so even the fastest stream remains navigable.
    this.gap = clamp(this.gap + (this.random() * 2 - 1) * 160, -155, 155);
    this.gates.push({ id: this.nextId++, u: SPIRIT_RUN.length + 60, gap: this.gap, resolved: false, hit: false });
    this.untilGate += SPIRIT_RUN.gateSpacing;
  }
  step(seconds: number, controls: SpiritControls): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    // A tab returning from sleep never teleports a whole gate through the body.
    let remaining = Math.min(seconds, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120); remaining -= dt;
      this.time += dt; this.hinder = Math.max(0, this.hinder - dt);
      const axis = Number.isFinite(controls.axis) ? clamp(controls.axis, -1, 1) : 0;
      const target = controls.target !== undefined && Number.isFinite(controls.target) ? controls.target : undefined;
      const steer = SPIRIT_RUN.steerSpeed * dt * (this.hinder ? 0.55 : 1);
      this.lane = clamp(this.lane + (Math.abs(axis) > 0.01 ? axis * steer
        : target === undefined ? 0 : clamp(target - this.lane, -steer, steer)),
      -SPIRIT_RUN.halfWidth + SPIRIT_RUN.radius, SPIRIT_RUN.halfWidth - SPIRIT_RUN.radius);
      const travel = SPIRIT_RUN.baseSpeed * this.speed * (this.hinder ? SPIRIT_RUN.hinderSpeed : 1) * dt;
      this.distance += travel; this.untilGate -= travel;
      if (this.untilGate <= 0) this.spawn();
      for (const gate of this.gates) {
        gate.u -= travel;
        if (gate.resolved) continue;
        const overlap = Math.abs(gate.u - this.playerU) <= SPIRIT_RUN.gateThickness / 2 + SPIRIT_RUN.radius;
        if (overlap && Math.abs(this.lane - gate.gap) + SPIRIT_RUN.radius >= SPIRIT_RUN.gateGap / 2) {
          gate.resolved = gate.hit = true;
          this.hits++; this.streak = 0; this.hinder = SPIRIT_RUN.hinderSeconds;
        } else if (gate.u + SPIRIT_RUN.gateThickness / 2 < this.playerU - SPIRIT_RUN.radius) {
          gate.resolved = true; this.passed++; this.streak++;
        }
      }
      this.gates = this.gates.filter(gate => gate.u > -80);
    }
  }
}

/** Same transform for drawing and pointing. Cross-lane stays screen-oriented:
 * left/right for descent, up/down for either horizontal direction. */
export function spiritLayout(width: number, height: number, direction: SpiritDirection) {
  const vertical = direction === 'down';
  const scale = Math.min((vertical ? height : width) / SPIRIT_RUN.length,
    (vertical ? width : height) / (SPIRIT_RUN.halfWidth * 2));
  const along = SPIRIT_RUN.length * scale, across = SPIRIT_RUN.halfWidth * 2 * scale;
  const x = (width - (vertical ? across : along)) / 2, y = (height - (vertical ? along : across)) / 2;
  return { scale,
    point: (u: number, v: number) => vertical ? { x: x + (v + SPIRIT_RUN.halfWidth) * scale, y: y + u * scale }
      : { x: x + (direction === 'right' ? u : SPIRIT_RUN.length - u) * scale, y: y + (v + SPIRIT_RUN.halfWidth) * scale },
    lane: (px: number, py: number) => ((vertical ? px - x : py - y) / scale) - SPIRIT_RUN.halfWidth,
  };
}
