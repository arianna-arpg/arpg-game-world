import type { CosmeticMotif } from '../engine/cosmetics';
import type { GlyphDef } from '../render/vis/parts';

export interface CosmeticProjectileStyle { glyph: GlyphDef; spin: number; extent: number }
/** Visual geometry only. The real projectile's form, radius and sweep remain intact. */
export const COSMETIC_PROJECTILES: Record<string, CosmeticProjectileStyle> = {
  feathered_arrow: { spin: 0, extent: 2.6, glyph: { ops: [
    { kind: 'path', pts: [[-2.2,0],[1.8,0]], color: '#f4dbc1', wR: .22 },
    { kind: 'poly', pts: [[2.5,0],[1.2,-.7],[1.5,0],[1.2,.7]], role: 'glow', outline: true },
    { kind: 'poly', pts: [[-1.35,0],[-2.35,-.6],[-2.05,0],[-2.35,.6]], role: 'base', outline: true },
  ] } },
  sun_lance: { spin: 0, extent: 2.6, glyph: { ops: [
    { kind: 'poly', pts: [[2.5,0],[.25,-.52],[-1.9,0],[.25,.52]], role: 'base', outline: true },
    { kind: 'path', pts: [[-1.7,0],[2.1,0]], color: '#fff2ca', wR: .16 },
    { kind: 'path', pts: [[-1.2,-.46],[-1.7,0],[-1.2,.46]], role: 'glow', wR: .2 },
  ] } },
  ember_comet: { spin: 0, extent: 2.6, glyph: { ops: [
    { kind: 'poly', pts: [[.6,-.8],[-1,-.7],[-2.5,-.45],[-1.6,0],[-2.2,.6],[.55,.8]], role: 'base', smooth: true, alpha: .7 },
    { kind: 'disc', x: .45, rx: .75, role: 'glow', outline: true },
    { kind: 'disc', x: .62, rx: .35, color: '#fff4d7' },
  ] } },
  crystal_bolt: { spin: 1.3, extent: 1.5, glyph: { ops: [
    { kind: 'poly', pts: [[1.4,0],[0,-.7],[-1.4,0],[0,.7]], role: 'base', outline: true },
    { kind: 'poly', pts: [[1.4,0],[0,-.7],[-.3,0]], role: 'glow' },
  ] } },
};
export interface CosmeticPortalRing {
  radius: number; aspect: number; spin: number; width: number;
  sides?: number; segments?: number; arc?: number; phase?: number; pulse?: number;
}
export interface CosmeticPortalStyle {
  fill: string; rings: CosmeticPortalRing[];
  motes?: { motif: CosmeticMotif; count: number; radius: number; size: number; speed: number };
}
/** All rings use the native portal's display dimensions; travel reach is independent. */
export const COSMETIC_PORTALS: Record<string, CosmeticPortalStyle> = {
  astral_iris: { fill: '#11172d', rings: [
    { radius: 1, aspect: 1, spin: 0, width: 2 },
    { radius: .78, aspect: 1, spin: 1.2, width: 2, segments: 3, arc: .55 },
    { radius: .55, aspect: 1, spin: -1.6, width: 1, segments: 5, arc: .3, pulse: .12 },
  ], motes: { motif: 'stars', count: 5, radius: 1.1, size: 3, speed: .35 } },
  runic_gate: { fill: '#201828', rings: [
    { radius: 1.06, aspect: .76, spin: .15, width: 2, sides: 6 },
    { radius: .9, aspect: .76, spin: -.2, width: 1, sides: 6 },
    { radius: .65, aspect: 1, spin: -.6, width: 3, segments: 8, arc: .4 },
  ], motes: { motif: 'embers', count: 6, radius: 1.06, size: 3, speed: .15 } },
  petal_door: { fill: '#211725', rings: [
    { radius: .85, aspect: 1, spin: .35, width: 2, segments: 5, arc: .65, pulse: .08 },
    { radius: .56, aspect: 1, spin: -.8, width: 1, segments: 3, arc: .6 },
  ], motes: { motif: 'petals', count: 8, radius: .97, size: 5, speed: -.22 } },
};
export interface CosmeticHotbarStyle { fill: string; border: string; trim: string; motif: CosmeticMotif; rail: string }
export const COSMETIC_HOTBARS: Record<string, CosmeticHotbarStyle> = {
  moon_silver: { fill: '#141f30', border: '#6d8fac', trim: '#c8e5f0', motif: 'stars', rail: '#0d1526' },
  rose_vellum: { fill: '#291d2c', border: '#9a718b', trim: '#e5b2cd', motif: 'petals', rail: '#1b1421' },
  ember_forge: { fill: '#2a211b', border: '#9b7958', trim: '#e9b575', motif: 'embers', rail: '#191612' },
};
/** Never resolve inherited object keys from a peer's appearance packet. */
export function cosmeticStyle<T>(registry: Record<string, T>, id?: string): T | undefined {
  return id && Object.prototype.hasOwnProperty.call(registry, id) ? registry[id] : undefined;
}
