import type { Actor } from './actor';
import type { SkillInstance, SummonDelivery } from './skills';
import type { Vec2 } from '../core/math';
/** Composable summoned-frame actions. Skill references and balance knobs are authored. */
export interface FrameSpec {
  primary: string;
  slam?: string;
  arsenal?: {
    every: number;
    barrage: string;
    nova: string;
  };
  sacrifice?: {
    fraction: number;
    damagePerLife: number;
    recoveryPerSlam: number;
    minRecovery: number;
  };
  legion?: {
    chance: number;
    monster: string;
    duration: number;
    cap: number;
    life: number;
    damage: number;
    size: number;
    deathCount: number;
  };
  siege?: {
    skill: string;
    minimumMove: number;
  };
  commander?: {
    skill: string;
    duration: number;
    power: number;
  };
  crush?: {
    command: string;
    strike: string;
    fault: string;
    normalFault?: boolean;
    range: number;
    duration: number;
    pace: number;
    contactPower: number;
    reduction: number;
    faultSteps: number;
    faultSpacing: number;
  };
  protect?: {
    command: string;
    sweep: string;
    range: number;
    duration: number;
    guardRadius: number;
  };
  spines?: {
    skill: string;
    thorns: number;
    inherit: number;
    flat: number;
    sweepThorns: number;
  };
  consolidation?: {
    lifePerSlot: number;
    damagePerSlot: number;
  };
  charge?: {
    command: string;
    rush: string;
    wave: string;
    range: number;
    gatherRange: number;
    spacing: number;
    duration: number;
    pace: number;
    perMass: number;
  };
  repair?: {
    skill: string;
    pulse: string;
    fraction: number;
    taunt: string;
  };
  sanctuary?: {
    regen: number;
    heal: string;
    ward: string;
    cost: number;
    escalation: number;
    strainDecay: number;
    efficiency: number;
    wardRatio: number;
    wardCap: number;
    wardDuration: number;
  };
  reliquary?: {
    field: string;
    explosion: string;
    search: number;
    duration: number;
    pace: number;
    pool: number;
    fieldDuration: number;
  };
}
export interface FrameCast {
  origin: string;
  auxiliary?: boolean;
  paid?: number;
  hit?: boolean;
  completed?: boolean;
}
export interface FrameState {
  kit: SkillInstance[];
  uses: number;
  slams: number;
  last: Vec2;
  travel: number;
  contactAt: number;
  faultAt: number;
  resetMotion?: boolean;
  reservedSlots?: number;
  inheritedThorns?: number;
  shed?: Actor;
  retaliation?: Actor;
  retaliateAt: number;
  commandReady: number;
  strain: number;
  channelTotal: number;
  channelRecipients: Map<Actor, number>;
  tauntAt: number;
  terminalSpent?: boolean;
  terminal?: {
    target?: Actor;
    aim: Vec2;
    end: number;
    killer?: Actor;
    invulnerable: boolean;
  };
  post?: {
    aim: Vec2;
    until: number;
  };
  order?: {
    aim: Vec2;
    end: number;
    strike?: string;
    pace: number;
  };
}
export interface FrameView {
  skill: string;
  ready: boolean;
}
export function frameSkillIds(d: SummonDelivery): string[] {
  const f = d.frame;
  if (!f)
    return [];
  return [...new Set([d.shell?.strikeSkill ?? f.primary, f.slam, f.arsenal?.barrage, f.arsenal?.nova, f.siege?.skill, f.commander?.skill,
      f.crush?.command, f.crush?.strike, f.crush?.fault, f.charge?.command ?? f.protect?.command, f.protect?.sweep, f.spines?.skill, d.shell ? f.charge?.wave : f.charge?.rush,
      f.repair?.skill, f.sanctuary ? undefined : f.repair?.pulse, f.repair?.taunt, f.sanctuary?.heal, f.sanctuary?.ward, f.reliquary?.field, f.reliquary?.explosion
    ].filter((id): id is string => !!id))];
}
/** Validate partial tree fragments as well as complete summon frames. */
export function frameErrors(f: Partial<FrameSpec>, skill: (id: string) => boolean, monster: (id: string) => boolean): string[] {
  const errors: string[] = [];
  const ids = frameSkillIds({ type: 'summon', count: 1, maxActive: 1, frame: f });
  for (const id of [...ids, f.charge?.wave, f.protect?.command].filter((v): v is string => !!v))
    if (!skill(id))
      errors.push('unknown frame skill ' + id);
  if (f.legion && !monster(f.legion.monster))
    errors.push('unknown frame offspring ' + f.legion.monster);
  const fractions = new Set(['fraction', 'minRecovery', 'chance', 'regen', 'wardCap']);
  const positive = new Set(['every', 'cap', 'deathCount', 'duration', 'interval', 'recovery', 'minRecovery', 'pace', 'faultSteps', 'faultSpacing', 'tauntInterval', 'efficiency', 'fieldDuration']);
  const integers = new Set(['every', 'cap', 'deathCount', 'faultSteps']);
  for (const [part, row] of Object.entries(f))
    if (row && typeof row === 'object')
      for (const [key, value] of Object.entries(row)) {
        if (typeof value !== 'number')
          continue;
        if (!Number.isFinite(value) || value < 0 || (positive.has(key) && value <= 0) || (fractions.has(key) && value > 1) || (integers.has(key) && !Number.isInteger(value)))
          errors.push('invalid frame ' + part + '.' + key);
      }
  return errors;
}
