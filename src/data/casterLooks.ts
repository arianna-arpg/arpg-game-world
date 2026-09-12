import type { LookDef } from '../render/vis/parts';

/** Faction-first casters: the source of the spell is readable in the body.
 * Baked anatomy carries the silhouette; small live accents supply movement. */
export const CASTER_LOOKS: Record<string, LookDef> = {
  deep_tidecaller: {
    parts: [
      { kind: 'fins', color: '#397e88', scale: 1.12 },
      { kind: 'tentacleRing', x: -0.28, color: '#36675e', scale: 0.85, params: { n: 5 } },
      { kind: 'shell', x: -0.18, color: '#386b78', scale: 0.78 },
      { kind: 'gills', x: 0.14, color: '#76bbba', scale: 0.9 },
      { kind: 'coralCrown', x: -0.18, scale: 0.84 },
      { kind: 'conchFocus', x: 0.68, y: 0.55, rot: -0.25, scale: 0.83 },
      { kind: 'eyes', color: '#d0ffea', params: { spread: 0.22, dist: 0.52, size: 0.08 } },
    ],
    live: [{ kind: 'puffMotes', color: '#9ee8df', scale: 0.65, alpha: 0.45, params: { n: 3 } }],
    shadowScale: 0.9,
  },
  river_obol_cantor: {
    parts: [
      { kind: 'soulGauze', color: '#698995', x: -0.15, scale: 0.9 },
      { kind: 'tatters', color: '#496773', scale: 0.8, params: { n: 5 } },
      { kind: 'ribs', color: '#94adb0', scale: 0.65, params: { pairs: 3, under: true } },
      { kind: 'skull', color: '#a9c8c6', x: 0.4, scale: 0.75 },
      { kind: 'obolEyes', x: 0.4, color: '#c9ac6c', scale: 0.75, params: { dist: 0.35, spread: 0.53, size: 0.13 } },
    ],
    live: [
      { kind: 'prayerChimes', x: 0.03, y: 0.05, scale: 1.02 },
      { kind: 'wisps', color: '#a2d5d9', scale: 0.65, alpha: 0.4, params: { n: 2 } },
    ],
    shadowScale: 0.7,
  },
  bloom_scentweaver: {
    parts: [
      { kind: 'roots', x: -0.32, color: '#536a3b', scale: 0.58 },
      { kind: 'fronds', x: -0.12, color: '#728c4a', scale: 0.72 },
      { kind: 'disc', color: '#455c3b', scale: 0.55 },
      { kind: 'ritualFan', x: 0.12, y: 0.83, rot: 0.48, scale: 0.92, mirror: true },
      { kind: 'bloomCap', x: 0.1, color: '#ead6a0', scale: 0.52 },
      { kind: 'eyes', color: '#fcf2b7', params: { spread: 0.24, dist: 0.49, size: 0.065 } },
    ],
    live: [{ kind: 'puffMotes', color: '#e7cd72', scale: 0.85, alpha: 0.5, params: { n: 4 } }],
    shadowScale: 0.85,
  },
  starfall_ephemerist: {
    parts: [
      { kind: 'glassFins', color: '#718bac', scale: 0.72 },
      { kind: 'astrolabe', scale: 1.03 },
      { kind: 'gem', color: '#e1f4ff', scale: 0.58 },
      { kind: 'runes', color: '#a6d3f5', scale: 0.52, params: { n: 3 } },
    ],
    live: [{ kind: 'floatingShards', color: '#b2d4f0', scale: 0.58, params: { n: 3, orbit: 1.5, spin: 0.35 } }],
    shadowScale: 0.65,
  },
};
