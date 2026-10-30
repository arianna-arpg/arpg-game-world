import type { PartSpec } from '../render/vis/parts';

/** Optional anatomy for an attached frame. Units are shell radii, +X is the opening.
 * The painter clips every part to the live coverage arc and keeps the keeper clear. */
export interface FrameShellStyle {
  ribs: number;
  inner: number;
  outer: number;
  width: number;
  looseTravel: number;
  parts: PartSpec[];
}
export const FRAME_SHELL_STYLES: Record<string, FrameShellStyle> = {
  ossuary: {
    ribs: 12, inner: .79, outer: 1.08, width: .12, looseTravel: .24,
    parts: [
      { kind: 'boundBones', x: -.98, scale: .35, rot: Math.PI / 2 },
      { kind: 'boundBones', x: -.51, y: -.94, scale: .31, mirror: true, rot: -.65 },
      { kind: 'boundBones', x: .2, y: -.98, scale: .3, mirror: true, rot: .2 },
      { kind: 'boundBones', x: .7, y: -.69, scale: .22, mirror: true, rot: -.25 },
      { kind: 'skull', x: -1.04, scale: .84, params: { glow: '#b6e9dc' } },
    ],
  },
};

/** Distinct silhouettes and colors supplement, rather than replace, each ability's
 * normal impact art. No gameplay timings, radii or protections are defined here. */
export interface FrameCueStyle {
  repair: string;
  transfusion: string;
  charge: string;
  terminal: string;
  crush: string;
  marks: number;
  tetherBeads: number;
}
export const FRAME_CUE_STYLES: Record<string, FrameCueStyle> = {
  ossuary: { repair: '#b5e9dc', transfusion: '#e7a28d', charge: '#cfefeb',
    terminal: '#ffc98f', crush: '#e7c399', marks: 6, tetherBeads: 5 },
};

export interface FrameRampartStyle {
  ribs: number;
  spread: number;
  crest: number;
  shoulder: number;
  halfSpan: number;
  width: number;
  alpha: number;
  parts: PartSpec[];
}
export const FRAME_RAMPART_STYLES: Record<string, FrameRampartStyle> = {
  boneRampart: { ribs: 7, spread: 1.8, crest: .84, shoulder: .25,
    halfSpan: .85, width: 4, alpha: .22,
    parts: [{ kind: 'skull', x: .76, scale: .35, params: { glow: '#d2fff5' } }] },
};
