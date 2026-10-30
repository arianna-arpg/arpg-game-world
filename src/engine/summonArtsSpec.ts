import type { Actor } from './actor';
import type { SkillInstance, SummonDelivery, Delivery, TargetingSpec } from './skills';
import type { Vec2 } from '../core/math';
import type { DamageType, SkillTag } from './stats';

/** Optional, composable summon mechanics. Payloads remain ordinary supported skills. */
export interface SummonSchool {
  id: DamageType; name: string; monster: string; primary: string; signature: string; trace: string;
  conversion?: number; color?: string;
}
export interface SummonArtsSpec {
  single?: true;
  summonTime?: number;
  capacityPower?: { base: number; perSlot: number; maximum: number };
  command?: string;
  rite?: string;
  /** Opt a rite into the normal AI kit; otherwise it remains command/auxiliary only. */
  riteAutonomous?: boolean;
  field?: string;
  flare?: string;
  flareCooldown?: number;
  frost?: string;
  blizzard?: string;
  detonation?: string;
  riteRecovery?: number;
  reconstruction?: { monster: string; delay: number; recovery: number; life: number;
    soulCap: number; soulDuration: number; soulRange: number; soulPower: number; soulRecovery: number };
  echo?: { cooldown: number; power: number; deliveries: Delivery['type'][]; requireTags: SkillTag[];
    excludeTags: SkillTag[]; targets: TargetingSpec['target'][] };
  choicesLabel?: string;
  schools?: SummonSchool[];
  balanceSchools?: true;
  lessons?: true;
  relay?: { range: number; cooldown: number; power: number };
  concordance?: { fraction: number; duration: number };
  discordance?: string;
  traces?: true;
  siphon?: { ratio: number; perSecond: number; range: number };
}
/** Read-only host presentation for clients that do not simulate minion ownership. */
export interface SummonArtView { command?: string; ready: boolean; held: boolean; }
export interface SummonArtContract {
  /** Fair tie rotation when the selected schools outnumber available slots. */
  lastSchool?: string;
  recovery: number;
  souls: number[];
  anchor?: Actor;
  rebuilding?: number;
}
export interface SummonArtState {
  kit: SkillInstance[];
  relayReady: number;
  echoReady: number;
  echoes?: Map<SkillInstance, SkillInstance>;
  flareReady: number;
  siphonCredit: number;
  ritual?: { pos: Vec2; radius: number; remaining: number; readyAt: number; power: number };
}
/** Shared per-use provenance survives projectile splits/repeats; payloads cannot relay or echo. */
export interface SummonArtCast {
  role: 'native' | 'relay' | 'echo' | 'field' | 'flare' | 'rupture';
  commanded?: boolean;
  replied?: boolean;
  traced?: boolean;
  origin?: string;
  power?: number;
  field?: 'ritual' | 'script';
}
export function summonArtIds(d: SummonDelivery, monsterId?: string): string[] {
  const a = d.arts;
  if (!a) return [];
  const schools = (a.schools ?? []).filter(s => monsterId ? s.monster === monsterId : !d.pool || d.pool.some(p => p.id === s.monster));
  return [...new Set([a.rite, a.field, a.flare, a.frost, a.blizzard, a.detonation, a.discordance,
    ...(a.lessons ? schools.map(s => s.signature) : []),
    ...(a.traces ? schools.map(s => s.trace) : []),
  ].filter((s): s is string => !!s))];
}
