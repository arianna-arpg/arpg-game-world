import type { World } from './world';

/** Optional geometry and animation samples for an already resolved hit. */
export interface FieldImpactDetail {
  /** Simulation time at impact, so successive gusts advance and replicas agree. */
  flowAt?: number;
  /** Fraction of the channel's native damage ramp at the instant the beat was paid. */
  strength?: number;
  edge?: number;
  seg?: { ax: number; ay: number; bx: number; by: number };
}
export function copyFieldImpact(detail?: FieldImpactDetail): FieldImpactDetail | undefined {
  if (!detail) return undefined;
  return detail.seg ? { ...detail, seg: { ...detail.seg } } : { ...detail };
}

/** A field's paint surface, shared by the host and replicas. No actor,
 * skill instance, damage, update method or simulated zone is reconstructed. */
export interface SkillFieldVisual {
  skillId: string;
  pos: { x: number; y: number };
  radius: number; color: string; shape: number; facing: number;
  delay: number; exploded: boolean; linger: number;
  strength?: number; flowAt?: number;
  tier: number; telegraph: number; hitAll?: boolean;
  arcRad?: number; edge?: number; edgeFrac?: number;
  delay0?: number; onGround?: string[];
  seg?: { ax: number; ay: number; bx: number; by: number };
  armed?: boolean; volatile?: boolean;
  lobFrom?: { x: number; y: number }; lobArc?: number;
  pulse?: { left: number; next: number; radiusMult: number };
}
export function skillFieldVisual(z: World['zones'][number], time: number): SkillFieldVisual {
  return {
    skillId: z.skillVisualId ?? z.inst.def.id, pos: { ...z.pos }, radius: z.radius, color: z.color,
    shape: z.shape, facing: z.facing, delay: z.delay, exploded: z.exploded,
    linger: z.linger, strength: z.fieldStrength, tier: z.tier ?? z.caster.tier ?? 0, hitAll: z.hitAll,
    telegraph: (z.inst.def.delivery as { telegraph?: number }).telegraph ?? 1,
    arcRad: z.arcRad, edge: z.edge, edgeFrac: z.edgeFrac, delay0: z.delay0,
    onGround: z.onGround?.slice(), seg: z.seg ? { ...z.seg } : undefined,
    armed: !!(z.armed || (z.aftershock && time >= z.aftershock.readyAt) || (z.roulette && time < z.roulette.armedUntil)),
    volatile: !!z.volatile, lobFrom: z.lobFrom ? { ...z.lobFrom } : undefined, lobArc: z.lobArc,
    pulse: z.pulse ? { left: z.pulse.left, next: z.pulse.next, radiusMult: z.pulse.radiusMult } : undefined,
  };
}
export function cloneSkillFieldVisual(z: SkillFieldVisual): SkillFieldVisual {
  return { ...z, pos: { ...z.pos }, onGround: z.onGround?.slice(),
    seg: z.seg ? { ...z.seg } : undefined, lobFrom: z.lobFrom ? { ...z.lobFrom } : undefined,
    pulse: z.pulse ? { ...z.pulse } : undefined };
}
