import type { LookDef } from '../render/vis/parts';

/** Lesser Abyssals share fractured anatomy; their silhouette says their job.
 * Bosses retain their existing showpiece looks. All drawn limbs are decorative. */
export const ABYSS_LOOKS: Record<string, LookDef> = {
  abyssal_horologist: {
    parts: [
      { kind: 'riftCilia', x: -0.24, color: '#3c566b', scale: 0.68 },
      { kind: 'brokenDial', scale: 1.02 },
      { kind: 'voidIris', x: 0.1, color: '#79c5d7', scale: 0.42 },
    ],
    live: [{ kind: 'floatingShards', color: '#9ee7e8', scale: 0.32, params: { n: 3, orbit: 3.6, spin: -0.22 } }],
    shadowScale: 0.65,
  },
  abyssal_seer: {
    parts: [
      { kind: 'riftCilia', x: -0.23, scale: 0.82 },
      { kind: 'riftCarapace', x: -0.09, scale: 0.91 },
      { kind: 'voidIris', x: 0.28, scale: 1.03 },
    ],
    live: [{ kind: 'wisps', color: '#936bb9', x: -0.25, scale: 0.55, alpha: 0.4, params: { n: 2 } }],
    shadowScale: 0.7,
  },
  abyssal_vanguard: {
    parts: [
      { kind: 'riftTalons', color: '#4d316d', scale: 1.04 },
      { kind: 'riftCarapace', x: -0.23, scale: 1.16 },
      { kind: 'riftCarapace', x: 0.19, scale: 0.76 },
      { kind: 'maw', x: 0.44, color: '#bf9ee2', scale: 0.46 },
      { kind: 'voidIris', x: -0.08, scale: 0.37 },
    ],
    shadowScale: 1.05,
  },
  rift_ascetic: {
    parts: [
      { kind: 'tatters', x: -0.46, color: '#43404e', scale: 0.66, params: { n: 4 } },
      { kind: 'riftCarapace', x: -0.22, color: '#8e8995', scale: 0.64 },
      { kind: 'riftTalons', x: 0.2, rot: Math.PI, color: '#b0aaba', scale: 0.58 },
      { kind: 'voidIris', x: 0.39, scale: 0.48 },
    ],
    live: [{ kind: 'soulGauze', x: -0.4, color: '#b5b7c8', scale: 0.5, alpha: 0.35, params: { n: 2 } }],
  },
  abyssal_render: {
    parts: [
      { kind: 'riftCilia', x: -0.46, scale: 0.48 },
      { kind: 'riftTalons', scale: 1.15 },
      { kind: 'riftCarapace', x: -0.17, scale: 0.69 },
      { kind: 'maw', x: 0.47, color: '#c99cef', scale: 0.53 },
      { kind: 'eyes', color: '#e8c6ff', params: { n: 3, dist: 0.1, spread: 0.45, size: 0.06 } },
    ],
  },
  abyssal_wretch: {
    parts: [
      { kind: 'tatters', x: -0.4, color: '#362448', scale: 0.88, params: { n: 5 } },
      { kind: 'riftCilia', x: -0.13, scale: 0.68 },
      { kind: 'riftCarapace', scale: 0.66 },
      { kind: 'maw', x: 0.42, color: '#a77bd5', scale: 0.68 },
    ],
    live: [{ kind: 'wisps', color: '#9560ca', x: -0.35, scale: 0.45, alpha: 0.45, params: { n: 2 } }],
  },
  abyssal_crawler: {
    parts: [
      { kind: 'riftCilia', scale: 0.74 },
      { kind: 'riftCarapace', scale: 0.76 },
      { kind: 'voidIris', x: 0.37, scale: 0.43 },
      { kind: 'mandibles', x: 0.38, color: '#b393d4', scale: 0.37 },
    ],
  },
  abyssal_broodling: {
    parts: [
      { kind: 'riftCilia', x: -0.18, scale: 0.51 },
      { kind: 'riftCarapace', scale: 0.59 },
      { kind: 'voidIris', x: 0.2, scale: 0.64 },
    ],
    shadowScale: 0.65,
  },
  abyssal_foldwright: {
    parts: [
      { kind: 'riftCilia', x: -0.3, scale: 0.63 },
      { kind: 'riftCarapace', color: '#404b65', scale: 0.66 },
      { kind: 'riftTalons', x: -0.26, rot: Math.PI, color: '#687693', scale: 0.86 },
      { kind: 'voidIris', x: 0.34, color: '#89b9c9', scale: 0.54 },
      { kind: 'riftCarapace', x: -0.35, y: 1, rot: 0.65, scale: 0.37, mirror: true },
    ],
    live: [{ kind: 'floatingShards', color: '#a2c5eb', scale: 0.42, params: { n: 3, orbit: 2.6, spin: 0.16 } }],
    shadowScale: 0.75,
  },
};
