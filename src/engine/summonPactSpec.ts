import type { Modifier } from './stats';
import type { SummonDelivery } from './skills';

/** Owner-granted summon reactions. No vocation, node or class IDs in the runtime. */
export interface PactReward {
  skill: string;
  duration: number;
  maxActive: number;
  forms?: { stat: string; monster: string; crewSkills?: string[]; crewAuras?: string[]; replaceSkills?: boolean }[];
}
interface PactBase {
  id: string;
  name: string;
  stat: string;
  color: string;
  reward: PactReward;
}
export interface DeathBankPact extends PactBase {
  kind: 'deathBank';
  threshold: number;
  temporaryOnly: boolean;
  expiry: boolean;
}
export interface GraveyardPact extends PactBase {
  kind: 'graveyard';
  threshold: number;
  radius: number;
  ownerRadius: number;
  gatherDuration: number;
  activeDuration: number;
  interval: number;
  maxSites: number;
  expiry: boolean;
}
export interface AssemblyPart {
  id: string;
  name: string;
  shape: 'bone' | 'claw' | 'heart' | 'skull';
  color: string;
  mods: Modifier[];
  /** Each distinct part grants its art once; stat contributions stack per part. */
  skills?: string[];
}
export interface AssemblyPact extends PactBase {
  kind: 'assembly';
  parts: AssemblyPart[];
  required: number;
  interval: [number, number];
  scatter: [number, number];
  pickupRadius: number;
  partDuration: number;
  maxParts: number;
}
export interface EchoPact extends PactBase {
  kind: 'echo';
  cooldown: number;
}
export type SummonPactDef = DeathBankPact | GraveyardPact | AssemblyPact | EchoPact;

/** Paint-only snapshot shared by world, renderer and remote clients. */
export interface SummonPactCue {
  kind: 'bank' | 'graveyard' | 'part' | 'assembly';
  fill: number;
  count: number;
  active?: boolean;
  shape?: AssemblyPart['shape'];
  parts?: { shape: AssemblyPart['shape']; color: string }[];
}

export function cloneSummonPactCue(cue: SummonPactCue | undefined): SummonPactCue | undefined {
  return cue && { ...cue, parts: cue.parts?.map(p => ({ ...p })) };
}

export interface PactSpawn {
  delivery: SummonDelivery;
  pact: string;
  monsterId?: string;
  pos: { x: number; y: number };
  noReplace: true;
  offspring: { maxActive: number; size: number; life: number; damage: number };
}
