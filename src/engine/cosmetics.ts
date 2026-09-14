// Presentation contracts only: no modifiers, delivery overrides or collision data.
import type { ActorAdorn } from './actor';
import type { GateRow } from '../meta/gates';

export const COSMETIC_SLOTS = {
  playerSkin: 'Character skins', playerEffect: 'Character effects', footprints: 'Footprints',
  avatar: 'Avatars', skillSkin: 'Skill skins', skillRecolor: 'Skill colors', summonSkin: 'Summon skins',
} as const;
export type CosmeticSlot = keyof typeof COSMETIC_SLOTS;
export type CosmeticMotif = 'stars' | 'petals' | 'embers';
export interface CosmeticPaint {
  color?: string;
  material?: string;
  adorn?: ActorAdorn;
  motif?: CosmeticMotif;
}
export interface CosmeticDef {
  id: string; name: string; description: string; slot: CosmeticSlot;
  collection: string; author: string; paint: CosmeticPaint;
  /** Omit for all skills; otherwise the skin is compatible only with these ids. */
  skills?: readonly string[];
  acquire: { kind: 'starter' } | { kind: 'achievement'; rows: readonly GateRow[]; mode: 'any' | 'all' }
    | { kind: 'credits'; cost: number } | { kind: 'external' };
}
export interface CosmeticLoadout {
  slots: Partial<Record<CosmeticSlot, string>>;
  /** Explicit null restores native visuals for this skill instead of inheriting. */
  skills: Record<string, Partial<Record<'skillSkin' | 'skillRecolor', string | null>>>;
}
export interface CosmeticGrant { id: string; source: string; reference: string }
export interface CosmeticState { grants: CosmeticGrant[]; loadout: CosmeticLoadout }
export const emptyCosmeticLoadout = (): CosmeticLoadout => ({ slots: {}, skills: {} });
export const emptyCosmetics = (): CosmeticState => ({ grants: [], loadout: emptyCosmeticLoadout() });

/** The one catalogue. Mods register content through the same checked entry point. */
export const COSMETICS: Record<string, CosmeticDef> = Object.create(null) as Record<string, CosmeticDef>;
export function registerCosmetic(def: CosmeticDef): void {
  if (!/^[a-z][a-z0-9_.:-]*$/.test(def.id) || COSMETICS[def.id]) throw new Error(`Duplicate/invalid cosmetic: ${def.id}`);
  if (!(def.slot in COSMETIC_SLOTS) || !def.name || !def.author) throw new Error(`Invalid cosmetic metadata: ${def.id}`);
  if (def.paint.color && !/^#[0-9a-f]{6}$/i.test(def.paint.color)) throw new Error(`Invalid cosmetic color: ${def.id}`);
  if (def.acquire.kind === 'credits' && (!Number.isSafeInteger(def.acquire.cost) || def.acquire.cost <= 0)) throw new Error(`Invalid cosmetic cost: ${def.id}`);
  if (def.acquire.kind === 'achievement' && !def.acquire.rows.length) throw new Error(`Empty cosmetic achievement: ${def.id}`);
  COSMETICS[def.id] = def;
}
