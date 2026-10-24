import type { Actor, ConstructState } from './actor';
import type { SkillInstance } from './skills';
import type { Vec2 } from '../core/math';
import { pointSegDist } from '../core/math';

/** Shared by skill constructs and authored monster devices. No actor/skill IDs. */
export interface DeviceTriggerSpec {
  /** Delay before contact/remote activation, in seconds. */
  armTime?: number;
  /** Override the delivery's trigger radius, in world units. */
  radius?: number;
  /** Ground contacts ignore airborne bodies by default. */
  groundOnly?: boolean;
}
export interface GroundDeviceSpec extends DeviceTriggerSpec {
  kind: 'trap' | 'mine';
  skillId: string;
}
export function deviceTriggerErrors(spec: DeviceTriggerSpec): string[] {
  const issues: string[] = [];
  for (const key of ['armTime', 'radius'] as const) {
    const n = spec[key];
    if (n !== undefined && (!Number.isFinite(n) || n < 0)) issues.push(`${key} must be finite and nonnegative`);
  }
  if (spec.groundOnly !== undefined && typeof spec.groundOnly !== 'boolean') issues.push('groundOnly must be boolean');
  return issues;
}
export const DEVICE_CFG = {
  armTime: { trap: .5, mine: 0 },
  detonation: { lead: .05, stagger: .08 },
};

export function groundDeviceState(spec: DeviceTriggerSpec & { kind: 'trap' | 'mine' }, payload?: SkillInstance, range = 0): ConstructState {
  const armTime = Math.max(0, spec.armTime ?? DEVICE_CFG.armTime[spec.kind]);
  return { kind: spec.kind, castInst: payload, range: Math.max(0, spec.radius ?? range),
    timer: armTime, armingDuration: armTime, deviceTrigger: { groundOnly: spec.groundOnly ?? true } };
}

export function deviceContactEligible(device: Actor, prey: Actor, airborne: boolean): boolean {
  return !device.dead && !prey.dead && !prey.downed && !prey.untargetable && !prey.construct
    && device.tier === prey.tier && (!(device.construct?.deviceTrigger?.groundOnly ?? true) || !airborne);
}

/** Only resolved movement segments enter here. Blink/teleport destinations are
 * checked by the ordinary occupancy sweep, never connected by an invented path.
 * Storage exists only while a contact trap is present; consumed once per frame. */
export class DeviceContacts {
  private watching = false;
  private nextSegment = 0;
  private placedAfter = new WeakMap<Actor, number>();
  private paths = new Map<Actor, { from: Vec2; to: Vec2; tier: number; airborne: boolean; sequence: number }[]>();
  watch(device: Actor): void {
    this.watching = true; this.placedAfter.set(device, this.nextSegment);
  }
  record(actor: Actor, from: Vec2, to: Vec2, tier: number, airborne: boolean): void {
    if (!this.watching || actor.construct || actor.dead
      || actor.tier !== tier || from.x === to.x && from.y === to.y) return;
    let path = this.paths.get(actor);
    if (!path) this.paths.set(actor, path = []);
    path.push({ from: { ...from }, to: { ...to }, tier, airborne, sequence: this.nextSegment++ });
  }
  crosses(device: Actor, prey: Actor): boolean {
    const radius = Math.max(0, device.construct?.range ?? 0) + prey.radius;
    return this.paths.get(prey)?.some(s => s.sequence >= (this.placedAfter.get(device) ?? 0) && s.tier === device.tier
      && (!(device.construct?.deviceTrigger?.groundOnly ?? true) || !s.airborne)
      && pointSegDist(device.pos.x, device.pos.y, s.from.x, s.from.y, s.to.x, s.to.y) <= radius) ?? false;
  }
  finish(active: boolean): void { this.paths.clear(); this.watching = active; }
}
