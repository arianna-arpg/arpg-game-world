import { Rng } from '../core/rng';

/** Rewardless loading toy, independent of world time, progression and game RNG. */
export type SpiritDirection = 'down' | 'right' | 'left';
export const SPIRIT_RUN = Object.freeze({
  length: 1000, halfWidth: 280, playerU: 230, radius: 15,
  baseSpeed: 210, speedPerGate: 0.09, maxSpeed: 2.8,
  steerSpeed: 490, gateGapMin: 114, gateGapMax: 238,
  gateRim: 24, gateThickness: 22, gateSpacing: 480,
  choiceStagger: 70, pickupRadius: 12, pickupFade: 0.28,
  currentHalfLength: 30, currentHalfWidth: 12, currentExtra: 0.8,
  currentSeconds: 2.2, currentEase: 0.45, maxBoostSpeed: 3.6,
  burstSeconds: 0.75, maxBursts: 18, surgeSeconds: 1.2,
  hinderSeconds: 0.7, hinderSpeed: 0.36, entrySeconds: 0.7,
});
/** Encounters have atmosphere and responses, never points or collectible value. */
export const SPIRIT_PICKUPS = {
  mote: { name: 'Memory Mote', boostGates: 0 },
  gilded: { name: 'Gilded Soul', boostGates: 0 },
  wild: { name: 'Wild Wisp', boostGates: 3 },
} as const;
export const SPIRIT_CURRENT_COLOR = '#b6fff0';
export type SpiritPickupKind = keyof typeof SPIRIT_PICKUPS;
const SPIRIT_CHOICES: readonly (readonly [SpiritPickupKind, SpiritPickupKind])[] = [
  ['mote', 'gilded'], ['mote', 'wild'], ['gilded', 'wild'],
];
export interface SpiritOpening { lane: number; width: number }
export interface SpiritGate { id: number; u: number; openings: SpiritOpening[]; resolved: boolean; hit: boolean }
export interface SpiritPickup {
  id: number; choice: number; u: number; lane: number; kind: SpiritPickupKind;
  state: 'live' | 'taken' | 'released'; fade: number;
}
export interface SpiritCurrent {
  id: number; gate: number; placement: 'opening' | 'between'; u: number; lane: number; taken: boolean; fade: number;
}
export interface SpiritBurst { u: number; lane: number; kind: SpiritPickupKind | 'gate' | 'impact' | 'current'; age: number }
export interface SpiritControls { axis: number; target?: number }
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const nearest = (openings: readonly SpiritOpening[], lane: number): SpiritOpening =>
  openings.reduce((a, b) => Math.abs(a.lane - lane) <= Math.abs(b.lane - lane) ? a : b);

/** Ordered solid intervals, including the piers between openings. Painting and
 * probes use the very same geometry as the collision apertures. */
export function spiritGateSolids(gate: SpiritGate): { low: number; high: number }[] {
  const spans: { low: number; high: number }[] = []; let low = -SPIRIT_RUN.halfWidth;
  for (const opening of gate.openings) {
    spans.push({ low, high: opening.lane - opening.width / 2 });
    low = opening.lane + opening.width / 2;
  }
  spans.push({ low, high: SPIRIT_RUN.halfWidth }); return spans;
}

let spiritSequence = 0;
function spiritRandom(): () => number {
  const seed = typeof crypto !== 'undefined' ? crypto.getRandomValues(new Uint32Array(1))[0] : Date.now();
  const rng = new Rng(seed ^ ++spiritSequence); return () => rng.next();
}
export function spiritDirection(kind: 'entry' | 'travel', random = spiritRandom()): SpiritDirection {
  return kind === 'entry' ? 'down' : random() < 0.5 ? 'right' : 'left';
}

export class SpiritRun {
  time = 0; lane = 0; streak = 0; passed = 0; hits = 0;
  collected = 0; boostGates = 0; currentsTaken = 0;
  surge = 0; dash = 0; hinder = 0; distance = 0;
  gates: SpiritGate[] = [];
  pickups: SpiritPickup[] = [];
  currents: SpiritCurrent[] = [];
  bursts: SpiritBurst[] = [];
  private nextId = 1;
  private untilGate = 0;
  private previous: SpiritOpening[] = [{ lane: 0, width: SPIRIT_RUN.gateGapMax }];
  constructor(readonly direction: SpiritDirection, private random: () => number = spiritRandom()) { this.spawn(); }
  get speed(): number {
    const c = SPIRIT_RUN, pace = Math.min(c.maxSpeed, 1 + (this.streak + this.boostGates) * c.speedPerGate);
    return Math.min(c.maxBoostSpeed, pace + c.currentExtra * Math.min(1, this.dash / c.currentEase));
  }
  get playerU(): number { return SPIRIT_RUN.playerU * Math.min(1, this.time / SPIRIT_RUN.entrySeconds); }
  private pick<T>(values: readonly T[]): T { return values[Math.min(values.length - 1, Math.floor(this.random() * values.length))]; }
  private spawn(): void {
    const c = SPIRIT_RUN, roll = this.random(), count = roll < 0.4 ? 1 : roll < 0.78 ? 2 : 3;
    const drift = (this.random() * 2 - 1) * (count === 1 ? 55 : count === 2 ? 30 : 10);
    const centers = count === 1 ? [0] : count === 2 ? [-130, 130] : [-175, 0, 175];
    const maximum = count === 1 ? c.gateGapMax : count === 2 ? 180 : 136;
    const openings = centers.map(lane => ({ lane: lane + drift,
      width: c.gateGapMin + this.random() * (maximum - c.gateGapMin) }));
    const id = this.nextId++, u = c.length + 60;
    this.gates.push({ id, u, openings, resolved: false, hit: false });
    // Every aperture has an incoming and outgoing route within 240 lane units.
    // At the boosted cap the clear-to-clear steering budget is over 277 units.
    const to = this.pick(openings).lane, from = nearest(this.previous, to).lane;
    const currentRoll = this.random();
    const current = (lane: number, at: number, placement: SpiritCurrent['placement']): void => {
      this.currents.push({ id: id * 3 + this.currents.filter(b => b.gate === id).length,
        gate: id, placement, lane, u: at, taken: false, fade: 0 });
    };
    if (currentRoll < 0.32) {
      const first = this.pick(openings); current(first.lane, u, 'opening');
      if (openings.length > 1 && this.random() < 0.22)
        current(this.pick(openings.filter(o => o !== first)).lane, u, 'opening');
    }
    if (currentRoll >= 0.32 && currentRoll < 0.54) {
      current((from + to) / 2, u - c.gateSpacing / 2, 'between');
    } else {
      const pair = this.pick(SPIRIT_CHOICES);
      pair.forEach((kind, i) => {
        const along = c.gateSpacing / 2 + (i ? 1 : -1) * c.choiceStagger;
        // Fit each staggered encounter to a complete route. The margin also
        // covers one 30 Hz control frame after clearing the preceding gate.
        const reach = (distance: number): number => (distance - c.radius - c.gateThickness / 2 - 18)
          * c.steerSpeed / (c.baseSpeed * c.maxBoostSpeed);
        const low = Math.max(from - reach(along), to - reach(c.gateSpacing - along));
        const high = Math.min(from + reach(along), to + reach(c.gateSpacing - along));
        const bend = (i ? -1 : 1) * (25 + this.random() * 20);
        const lane = clamp(from + (to - from) * along / c.gateSpacing + bend, low, high);
        this.pickups.push({ id: id * 2 + i, choice: id, u: u - c.gateSpacing + along,
          lane, kind, state: 'live', fade: 0 });
      });
    }
    this.previous = openings; this.untilGate += c.gateSpacing;
  }
  private burst(kind: SpiritBurst['kind']): void {
    this.bursts.push({ u: this.playerU, lane: this.lane, kind, age: 0 });
    if (this.bursts.length > SPIRIT_RUN.maxBursts) this.bursts.shift();
  }
  step(seconds: number, controls: SpiritControls): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const c = SPIRIT_RUN; let remaining = Math.min(seconds, 0.1);
    while (remaining > 0) {
      const dt = Math.min(remaining, 1 / 120); remaining -= dt;
      this.time += dt; this.hinder = Math.max(0, this.hinder - dt);
      this.surge = Math.max(0, this.surge - dt); this.dash = Math.max(0, this.dash - dt);
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
        const clear = gate.openings.some(o => Math.abs(this.lane - o.lane) + c.radius < o.width / 2);
        if (overlap && !clear) {
          gate.resolved = gate.hit = true; this.hits++;
          this.streak = this.boostGates = 0; this.surge = this.dash = 0; this.hinder = c.hinderSeconds;
          this.burst('impact');
        } else if (gate.u + c.gateThickness / 2 < this.playerU - c.radius) {
          gate.resolved = true; this.passed++; this.streak++; this.burst('gate');
        }
      }
      for (const pickup of this.pickups) {
        pickup.u -= travel;
        if (pickup.state !== 'live') { pickup.fade += dt; continue; }
        if (this.hinder || Math.hypot(pickup.u - this.playerU, pickup.lane - this.lane) > c.radius + c.pickupRadius) continue;
        const def = SPIRIT_PICKUPS[pickup.kind]; this.collected++; this.boostGates += def.boostGates;
        if (def.boostGates) this.surge = c.surgeSeconds;
        this.burst(pickup.kind);
        for (const sibling of this.pickups) if (sibling.choice === pickup.choice) {
          sibling.state = sibling === pickup ? 'taken' : 'released'; sibling.fade = 0;
        }
      }
      for (const current of this.currents) {
        current.u -= travel;
        if (current.taken) { current.fade += dt; continue; }
        // A current inside a gate may never rescue a collision with its pier.
        if (this.hinder || Math.abs(current.u - this.playerU) > c.currentHalfLength + c.radius
          || Math.abs(current.lane - this.lane) > c.currentHalfWidth + c.radius) continue;
        current.taken = true; this.currentsTaken++; this.dash = c.currentSeconds; this.burst('current');
      }
      this.gates = this.gates.filter(g => g.u > -80);
      this.pickups = this.pickups.filter(p => p.u > -80 && (p.state === 'live' || p.fade < c.pickupFade));
      this.currents = this.currents.filter(b => b.u > -80 && (!b.taken || b.fade < c.pickupFade));
    }
  }
}

/** Drawing and pointing share screen-oriented cross-lane coordinates. */
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
