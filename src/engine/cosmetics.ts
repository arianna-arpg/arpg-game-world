// Presentation contracts only: no modifiers, delivery overrides or collision data.
import type { ActorAdorn } from './actor';
import type { GateRow } from '../meta/gates';

export const COSMETIC_SLOTS = {
  playerModel: 'Character models',
  playerSkin: 'Character skins', playerEffect: 'Character effects', footprints: 'Footprints',
  avatar: 'Avatars', skillSkin: 'Skill skins', skillRecolor: 'Skill colors', summonSkin: 'Summon skins',
  portalSkin: 'Town portals', portalRecolor: 'Portal colors', hotbarSkin: 'Hotbars', wispSkin: 'Mu wisps',
} as const;
export type CosmeticSlot = keyof typeof COSMETIC_SLOTS;
export type CosmeticMotif = 'stars' | 'petals' | 'embers';
export interface CosmeticPaint {
  /** Presentation look id; never replaces class, anatomy or collision data. */
  look?: string;
  projectile?: string;
  portal?: string;
  hotbar?: string;
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
  /** Each receipt is one permanent skill binding, with freely editable color afterward. */
  consume?: { target: 'skillColor'; starterCharges: number };
  acquire: { kind: 'starter' } | { kind: 'achievement'; rows: readonly GateRow[]; mode: 'any' | 'all' }
    | { kind: 'credits'; cost: number } | { kind: 'external' };
}
export interface CosmeticLoadout {
  slots: Partial<Record<CosmeticSlot, string>>;
  /** Explicit null restores native visuals for this skill instead of inheriting. */
  skills: Record<string, Partial<Record<'skillSkin' | 'skillRecolor', string | null>>>;
  customColors?: Record<string, string>;
}
export interface CosmeticGrant { id: string; source: string; reference: string }
export interface CosmeticApplication extends CosmeticGrant { skill: string }
export interface CosmeticState { grants: CosmeticGrant[]; loadout: CosmeticLoadout; applications?: CosmeticApplication[] }
export const emptyCosmeticLoadout = (): CosmeticLoadout => ({ slots: {}, skills: {} });
export const emptyCosmetics = (): CosmeticState => ({ grants: [], loadout: emptyCosmeticLoadout() });

/** The one catalogue. Mods register content through the same checked entry point. */
export const COSMETICS: Record<string, CosmeticDef> = Object.create(null) as Record<string, CosmeticDef>;
export function registerCosmetic(def: CosmeticDef): void {
  if (!/^[a-z][a-z0-9_.:-]*$/.test(def.id) || COSMETICS[def.id]) throw new Error(`Duplicate/invalid cosmetic: ${def.id}`);
  if (!(def.slot in COSMETIC_SLOTS) || !def.name || !def.author) throw new Error(`Invalid cosmetic metadata: ${def.id}`);
  if (def.paint.color && !/^#[0-9a-f]{6}$/i.test(def.paint.color)) throw new Error(`Invalid cosmetic color: ${def.id}`);
  if (def.paint.look && def.slot !== 'playerModel' && def.slot !== 'wispSkin') throw new Error(`Model look requires a model or wisp slot: ${def.id}`);
  if (def.paint.projectile && def.slot !== 'skillSkin') throw new Error(`Projectile art requires a skill skin: ${def.id}`);
  if (def.paint.portal && def.slot !== 'portalSkin') throw new Error(`Portal art requires a portal skin: ${def.id}`);
  if (def.paint.hotbar && def.slot !== 'hotbarSkin') throw new Error(`Hotbar art requires a hotbar skin: ${def.id}`);
  if (def.consume && (def.slot !== 'skillRecolor' || def.consume.target !== 'skillColor'
    || !Number.isSafeInteger(def.consume.starterCharges) || def.consume.starterCharges < 0 || def.consume.starterCharges > 100)) throw new Error(`Invalid cosmetic consumable: ${def.id}`);
  if (def.acquire.kind === 'credits' && (!Number.isSafeInteger(def.acquire.cost) || def.acquire.cost <= 0)) throw new Error(`Invalid cosmetic cost: ${def.id}`);
  if (def.acquire.kind === 'achievement' && !def.acquire.rows.length) throw new Error(`Empty cosmetic achievement: ${def.id}`);
  COSMETICS[def.id] = def;
}
