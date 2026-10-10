import { Rng } from '../core/rng';

/** Rewardless loading toy. Coordinates are travel distance (u) and cross-lane
 * offset (v), independent of viewport, direction, world time and game RNG. */
export type SpiritDirection = 'down' | 'right' | 'left';
export const SPIRIT_RUN = Object.freeze({
  length: 1000, halfWidth: 280, playerU: 230, radius: 15,
  baseSpeed: 210, speedPerGate: 0.09, maxSpeed: 2.8,
  steerSpeed: 490, gateGapMin: 114, gateGapMax: 238, gateShift: 110,
  gateRim: 24, gateThickness: 22, gateSpacing: 360, gatePoints: 10,
  choiceOffset: 56, pickupRadius: 12, pickupFade: 0.28,
  burstSeconds: 0.75, maxBursts: 18, surgeSeconds: 1.2,
  hinderSeconds: 0.7, hinderSpeed: 0.36, entrySeconds: 0.7,
});
/** Values, shape and color are shared by simulation, painting and score cues. */
export const SPIRIT_PICKUPS = {
  mote: { name: 'Memory Mote', points: 25, boostGates: 0, color: '#a2e9d8', shape: 'pearl' },
  gilded: { name: 'Gilded Soul', points: 100, boostGates: 0, color: '#f4cb7f', shape: 'diamond' },
  wild: { name: 'Wild Wisp', points: 50, boostGates: 3, color: '#c7a5ff', shape: 'wing' },
} as const;
export type SpiritPickupKind = keyof typeof SPIRIT_PICKUPS;
const SPIRIT_CHOICES: readonly (readonly [SpiritPickupKind, SpiritPickupKind])[] = [
  ['mote', 'gilded'], ['mote', 'wild'], ['gilded', 'wild'],
];
export interface SpiritGate { id: number; u: number; gap: number; width: number; resolved: boolean; hit: boolean }
export interface SpiritPickup {
  id: number; choice: number; u: number; lane: number; kind: SpiritPickupKind;
  state: 'live' | 'taken' | 'released'; fade: number;
}
export interface SpiritBurst { u: number; lane: number; kind: SpiritPickupKind | 'gate' | 'impact'; age: number; points: number }
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
  score = 0;
  collected = 0;
  boostGates = 0;
  surge = 0;
  hinder = 0;
  distance = 0;
  gates: SpiritGate[] = [];
  pickups: SpiritPickup[] = [];
  bursts: SpiritBurst[] = [];
  private nextId = 1;
  private untilGate = 0;
  private gap = 0;
  constructor(readonly direction: SpiritDirection, private random: () => number = spiritRandom()) { this.spawn(); }
  get speed(): number { return Math.min(SPIRIT_RUN.maxSpeed, 1 + (this.streak + this.boostGates) * SPIRIT_RUN.speedPerGate); }
  get playerU(): number { return SPIRIT_RUN.playerU * Math.min(1, this.time / SPIRIT_RUN.entrySeconds); }
  private spawn(): void {
    const c = SPIRIT_RUN, previousGap = this.gap;
    const width = c.gateGapMin + this.random() * (c.gateGapMax - c.gateGapMin);
    const edge = c.halfWidth - width / 2 - c.gateRim;
    this.gap = clamp(previousGap + (this.random() * 2 - 1) * c.gateShift, -edge, edge);
    const id = this.nextId++, u = c.length + 60;
    this.gates.push({ id, u, gap: this.gap, width, resolved: false, hit: false });
    // Two choices between gates; picking either releases its sibling. The
    // midpoint route bounds both detours even at the speed cap (see probe).
    const pair = SPIRIT_CHOICES[Math.min(SPIRIT_CHOICES.length - 1, Math.floor(this.random() * SPIRIT_CHOICES.length))];
    const side = Math.sign(this.gap - previousGap) || (this.random() < 0.5 ? -1 : 1);
    const midpoint = (previousGap + this.gap) / 2;
    pair.forEach((kind, i) => this.pickups.push({ id: id * 2 + i, choice: id,
      u: u - c.gateSpacing / 2, lane: midpoint + side * (i ? -1 : 1) * c.choiceOffset,
      kind, state: 'live', fade: 0 }));
    this.untilGate += c.gateSpacing;
  }
  private burst(kind: SpiritBurst['kind'], points = 0): void {
    this.bursts.push({ u: this.playerU, lane: this.lane, kind, age: 0, points });
    if (this.bursts.length > SPIRIT_RUN.maxBursts) this.bursts.shift();
  }
  step(seconds: number, controls: SpiritControls): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const c = SPIRIT_RUN;
    // A tab returning from sleep never teleports a whole gate through the body.
    let remaining = Math.min(seconds, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120); remaining -= dt;
      this.time += dt; this.hinder = Math.max(0, this.hinder - dt); this.surge = Math.max(0, this.surge - dt);
      const axis = Number.isFinite(controls.axis) ? clamp(controls.axis, -1, 1) : 0;
      const target = controls.target !== undefined && Number.isFinite(controls.target) ? controls.target : undefined;
      const steer = c.steerSpeed * dt * (this.hinder ? 0.55 : 1);
      this.lane = clamp(this.lane + (Math.abs(axis) > 0.01 ? axis * steer
        : target === undefined ? 0 : clamp(target - this.lane, -steer, steer)),
      -c.halfWidth + c.radius, c.halfWidth - c.radius);
      const travel = c.baseSpeed * this.speed * (this.hinder ? c.hinderSpeed : 1) * dt;
      this.distance += travel; this.untilGate -= travel;
      for (const burst of this.bursts) { burst.age += dt; burst.u -= travel * 0.28; }
      this.bursts = this.bursts.filter(b => b.age < c.burstSeconds);
      if (this.untilGate <= 0) this.spawn();
      for (const gate of this.gates) {
        gate.u -= travel;
        if (gate.resolved) continue;
        const overlap = Math.abs(gate.u - this.playerU) <= c.gateThickness / 2 + c.radius;
        if (overlap && Math.abs(this.lane - gate.gap) + c.radius >= gate.width / 2) {
          gate.resolved = gate.hit = true;
          this.hits++; this.streak = this.boostGates = 0; this.surge = 0; this.hinder = c.hinderSeconds;
          this.burst('impact');
        } else if (gate.u + c.gateThickness / 2 < this.playerU - c.radius) {
          gate.resolved = true; this.passed++; this.streak++; this.score += c.gatePoints;
          this.burst('gate', c.gatePoints);
        }
      }
      for (const pickup of this.pickups) {
        pickup.u -= travel;
        if (pickup.state !== 'live') { pickup.fade += dt; continue; }
        if (Math.hypot(pickup.u - this.playerU, pickup.lane - this.lane) > c.radius + c.pickupRadius) continue;
        const def = SPIRIT_PICKUPS[pickup.kind];
        this.score += def.points; this.collected++; this.boostGates += def.boostGates;
        if (def.boostGates) this.surge = c.surgeSeconds;
        this.burst(pickup.kind, def.points);
        for (const sibling of this.pickups) if (sibling.choice === pickup.choice) {
          sibling.state = sibling === pickup ? 'taken' : 'released'; sibling.fade = 0;
        }
      }
      this.gates = this.gates.filter(gate => gate.u > -80);
      this.pickups = this.pickups.filter(p => p.u > -80 && (p.state === 'live' || p.fade < c.pickupFade));
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
