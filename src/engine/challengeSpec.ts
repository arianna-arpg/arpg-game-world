import { treeNodeOf, type SkillInstance, type ConstructDelivery } from './skills';

/** Composable challenge mechanics; scalar patches are unique per tree node. */
export interface ChallengeSpec {
  resetChance?: number;
  guaranteedResetEvery?: number;
  bleedPop?: number;
  bleedingImpaleMore?: number;
  splinters?: { count: number; power: number; spread: number };
  ballast?: { duration: number; radius: number; power: number; rehit: number; cap: number };
  device?: { duration: number; radius: number; life: number; thornsRatio: number; interval: number; range: number };
  deviceCap?: number;
  impaleField?: { ratio: number; radius: number };
  bleedingField?: { power: number };
  aftershock?: { chance: number; delay: number; radius: number; power: number };
  greaterShock?: { chance: number; radius: number; power: number; echoes: number };
  creeper?: { speed: number; trailRadius: number; trailDuration: number; trailPower: number; strikePower: number; strikeInterval: number };
}

export function challengeOf(inst: SkillInstance): ChallengeSpec | undefined {
  if (!inst.def.tree || !inst.treeNodes?.length) return undefined;
  let out: ChallengeSpec | undefined;
  for (const id of [...(inst.treeNodes ?? [])].sort()) {
    const patch = treeNodeOf(inst.def, id)?.challenge;
    if (patch) Object.assign(out ??= {}, patch);
  }
  return out;
}

export function challengeDelivery(inst: SkillInstance): ConstructDelivery | undefined {
  const s = challengeOf(inst), d = s?.device;
  return d ? { type: 'construct', kind: 'pylon', look: 'construct_totem', range: d.radius,
    duration: d.duration, maxActive: s.deviceCap ?? 1, life: d.life, placeRange: d.range,
    interval: d.interval, taunt: true, castSkillId: 'goad_device_call' } : undefined;
}
