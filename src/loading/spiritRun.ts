import { Rng } from '../core/rng';

/** Rewardless loading toy, independent of world time, progression and game RNG. */
export type SpiritDirection = 'down' | 'right' | 'left';
export const SPIRIT_RUN = Object.freeze({
  length: 1000, halfWidth: 280, playerU: 230, radius: 15,
  baseSpeed: 210, speedPerGate: 0.09, maxSpeed: 4.6,
  steerSpeed: 490, gateGapMin: 68, gateGapMax: 250,
  gateRim: 24, gateThickness: 22, gateSpacingMin: 620, gateSpacingMax: 820,
  gateSpacingTightMin: 340, gateSpacingTightMax: 440, routeMargin: 38,
  maxPickups: 6, pickupStagger: 38, pickupGateMargin: 72, pickupRadius: 12, pickupFade: 0.28,
  currentHalfLength: 30, currentHalfWidth: 12, currentExtra: 0.8,
  currentSeconds: 2.2, currentEase: 0.45, maxBoostSpeed: 5.4,
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
const SPIRIT_KINDS = Object.keys(SPIRIT_PICKUPS) as SpiritPickupKind[];
export interface SpiritOpening { lane: number; width: number }
export interface SpiritGate { id: number; u: number; spacing: number; openings: SpiritOpening[]; resolved: boolean; hit: boolean }
export interface SpiritPickup {
  id: number; gate: number; u: number; lane: number; kind: SpiritPickupKind; flame: number;
  state: 'live' | 'taken'; fade: number;
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
  private upcoming?: { openings: SpiritOpening[]; spacing: number };
  constructor(readonly direction: SpiritDirection, private random: () => number = spiritRandom()) { this.spawn(); }
  get speed(): number {
    const c = SPIRIT_RUN, pace = Math.min(c.maxSpeed, 1 + (this.streak + this.boostGates) * c.speedPerGate);
    return Math.min(c.maxBoostSpeed, pace + c.currentExtra * Math.min(1, this.dash / c.currentEase));
  }
  get playerU(): number { return SPIRIT_RUN.playerU * Math.min(1, this.time / SPIRIT_RUN.entrySeconds); }
  private pick<T>(values: readonly T[]): T { return values[Math.min(values.length - 1, Math.floor(this.random() * values.length))]; }
  private between(low: number, high: number): number { return low + this.random() * (high - low); }
  private plan(): { openings: SpiritOpening[]; spacing: number } {
    const c = SPIRIT_RUN, roll = this.random(), count = roll < 0.34 ? 1 : roll < 0.7 ? 2 : 3;
    // Partition the whole gate, with no fixed lanes or symmetric templates.
    // Independent widths share only the physical space left after the solid rims.
    const widths = Array.from({ length: count }, () => c.gateGapMin + this.random() ** 1.5 * (c.gateGapMax - c.gateGapMin));
    const extra = widths.reduce((sum, width) => sum + width - c.gateGapMin, 0);
    const budget = c.halfWidth * 2 - (count + 1) * c.gateRim - count * c.gateGapMin;
    if (extra > budget) for (let i = 0; i < count; i++) widths[i] = c.gateGapMin + (widths[i] - c.gateGapMin) * budget / extra;
    const free = Math.max(0, c.halfWidth * 2 - widths.reduce((sum, width) => sum + width, 0) - (count + 1) * c.gateRim);
    const weights = Array.from({ length: count + 1 }, () => 0.025 + this.random() ** 3);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let edge = -c.halfWidth;
    const openings = widths.map((width, i) => {
      edge += c.gateRim + free * weights[i] / total;
      const opening = { lane: edge + width / 2, width }; edge += width; return opening;
    });
    // Sample the next gap once. Existing gates never jump when pace changes.
    // At the ceiling, short gaps and extreme lane changes may be impossible;
    // this is a rewardless pastime, not a course the player has to complete.
    const pace = clamp((this.speed - 1) / (c.maxBoostSpeed - 1), 0, 1);
    const spacing = this.between(c.gateSpacingMin + (c.gateSpacingTightMin - c.gateSpacingMin) * pace,
      c.gateSpacingMax + (c.gateSpacingTightMax - c.gateSpacingMax) * pace);
    return { openings, spacing };
  }
  private spawn(): void {
    const c = SPIRIT_RUN, { openings, spacing } = this.upcoming ?? this.plan();
    // Carry substep overshoot into the new gate so actual spacing matches its plan.
    const id = this.nextId++, u = c.length + 60 + this.untilGate;
    this.gates.push({ id, u, spacing, openings, resolved: false, hit: false });
    const to = this.pick(openings).lane, from = nearest(this.previous, to).lane;
    const route = (along: number, start: number, end: number, clustered: boolean, bend: number): number => {
      const bounds = (speed: number): [number, number] => {
        const reach = (distance: number): number => (distance - c.radius - c.gateThickness / 2 - c.routeMargin)
          * c.steerSpeed / (c.baseSpeed * speed);
        return [Math.max(-c.halfWidth + c.radius, start - reach(along), end - reach(spacing - along)),
          Math.min(c.halfWidth - c.radius, start + reach(along), end + reach(spacing - along))];
      };
      let [low, high] = bounds(this.speed);
      // Keep a complete calm-speed route even when the current pace is too wild
      // for it. Collecting flames at high speed is a choice, never a guarantee.
      if (low > high) [low, high] = bounds(1);
      return clustered ? clamp(start + (end - start) * along / spacing + bend + this.between(-14, 14), low, high)
        : this.between(low, high);
    };
    const currentRoll = this.random();
    const current = (lane: number, at: number, placement: SpiritCurrent['placement']): void => {
      this.currents.push({ id: id * 3 + this.currents.filter(b => b.gate === id).length,
        gate: id, placement, lane, u: at, taken: false, fade: 0 });
    };
    // Narrow slots stay precise without forcing a speed boost on the player.
    const currentHoles = openings.filter(o => o.width / 2 - c.radius > c.currentHalfWidth + c.radius + 10);
    if (currentRoll < 0.32 && currentHoles.length) {
      const first = this.pick(currentHoles); current(first.lane, u, 'opening');
      if (currentHoles.length > 1 && this.random() < 0.28)
        current(this.pick(currentHoles.filter(o => o !== first)).lane, u, 'opening');
    }
    if (currentRoll >= 0.32 && currentRoll < 0.54) {
      const along = spacing * this.between(0.35, 0.65);
      current(route(along, from, to, false, 0), u - spacing + along, 'between');
    }
    const pace = clamp((this.speed - 1) / (c.maxBoostSpeed - 1), 0, 1);
    const density = this.between(0.2 * (1 - pace), 1);
    const count = density < 0.1 ? 0 : density < 0.25 ? 1 : density < 0.45 ? 2
      : density < 0.64 ? 3 : density < 0.8 ? 4 : density < 0.91 ? 5 : c.maxPickups;
    const clustered = this.random() < 0.55, bend = this.between(-35, 35);
    // Random gaps plus a small minimum stagger avoid adjacent pairs or regular
    // bead strings. Some groups flood one route; others scatter across branches.
    const slack = spacing - c.pickupGateMargin * 2 - Math.max(0, count - 1) * c.pickupStagger;
    const offsets = Array.from({ length: count }, () => this.random() * slack).sort((a, b) => a - b);
    offsets.forEach((offset, i) => {
      const along = c.pickupGateMargin + offset + i * c.pickupStagger;
      const end = clustered ? to : this.pick(openings).lane;
      const start = clustered ? from : nearest(this.previous, end).lane;
      const lane = route(along, start, end, clustered, bend), at = u - spacing + along;
      if (this.currents.some(b => b.gate === id && Math.hypot(b.u - at, b.lane - lane) < 62)) return;
      this.pickups.push({ id: id * c.maxPickups + i, gate: id, u: at, lane,
        kind: this.pick(SPIRIT_KINDS), flame: this.between(0.82, 1.18), state: 'live', fade: 0 });
    });
    this.previous = openings; this.upcoming = this.plan(); this.untilGate += this.upcoming.spacing;
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
        pickup.state = 'taken'; pickup.fade = 0;
      }
      for (const current of this.currents) {
        current.u -= travel;
        if (current.taken) { current.fade += dt; continue; }
        // A current inside a gate may never rescue a collision with its pier.
        if (this.hinder || Math.abs(current.u - this.playerU) > c.currentHalfLength + c.radius
          || Math.abs(current.lane - this.lane) > c.currentHalfWidth + c.radius) continue;
        current.taken = true; this.currentsTaken++; this.dash = c.currentSeconds; this.burst('current');
      }
      if (this.untilGate <= 0) this.spawn();
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
