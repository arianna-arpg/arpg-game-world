import type { Modifier } from './stats';

export interface DoctrineForm {
  stat?: string;
  label: string;
  formation?: 'wedge' | 'ring' | 'scatter';
  order?: 'assault' | 'guard';
  payload?: string;
  relocate?: boolean;
  healPct?: number;
  /** Bank power extends protection instead of also multiplying its magnitude. */
  scaleDuration?: boolean;
  mods?: Modifier[];
}
export interface BattleDoctrineDef {
  id: string; name: string; stat: string; skill: string; color: string;
  radius: number; duration: number;
  subjects?: 'minions' | 'companions';
  spacing?: number;
  meter?: { max: number; minimum: number; interval: number; events: ('kill' | 'poiseBreak' | 'cooperate')[]; window: number; powerPerCharge: number; emptyReason?: string };
  growth?: { kind: string; maturity: number; maximum: number };
  forms: DoctrineForm[];
  traits?: {
    stat: string;
    mods?: Modifier[];
    healPct?: number;
    spendPly?: boolean;
    answer?: boolean;
    includeOwner?: boolean;
    repeat?: { delay: number; power: number };
    refund?: number;
    shelter?: { radius: number; mods: Modifier[] };
  }[];
}
export interface DoctrineCue { kind: 'meter' | 'order' | 'harvest'; count: number; max: number; formation?: DoctrineForm['formation']; }

/** A family rewrite preserves its original body/skill identity and owns only
 * appearance and the selected inheritance channels. No name matching. */
export interface MinionTransmutationDef {
  id: string; stat: string; family: string; faction: string;
  namePrefix: string; color: string; material: string;
  looks: { melee: string; ranged: string; caster: string };
  personalStats: string[];
  personalPrefixes?: string[];
}
