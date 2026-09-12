import type { LookDef } from '../render/vis/parts';

/** Baked silhouettes do the identity work; live layers stay sparse. These
 * ornaments never imply new hit surfaces, auras or ability timers. */
export const COURT_LOOKS: Record<string, LookDef> = {
  hollow_vanguard: {
    parts: [
      { kind: 'vacantCuirass', scale: 1.03 },
      { kind: 'pauldrons', x: 0.18, scale: 0.82 },
      { kind: 'helm', x: 0.57, scale: 0.53 },
      { kind: 'sword', y: 0.15, params: { len: 0.85 } },
      { kind: 'runes', x: -0.08, color: '#b6e4eb', scale: 0.25, params: { n: 3 } },
    ],
  },
  the_unworn: {
    parts: [
      { kind: 'tatters', x: -0.45, scale: 0.75, color: '#3c5265', params: { n: 4 } },
      { kind: 'vacantCuirass', scale: 1.08 },
      { kind: 'pauldrons', x: 0.25, scale: 0.98 },
      { kind: 'helm', x: 0.65, scale: 0.52 },
      { kind: 'crown', x: 0.77, scale: 0.49 },
      { kind: 'sword', y: 0.08, params: { len: 0.95 } },
      { kind: 'gauntlets', x: -0.14, scale: 0.64, params: { n: 2 } },
    ],
    live: [{ kind: 'wisps', color: '#a7d9ec', scale: 0.45, alpha: 0.35, params: { n: 2 } }],
  },
  helm_choir: {
    parts: [
      { kind: 'reliquaryFolio', x: -0.5, scale: 0.6 },
      { kind: 'helm', x: 0.48, scale: 0.56 },
      { kind: 'helm', x: 0.1, y: 0.7, rot: 0.25, scale: 0.45 },
      { kind: 'helm', x: 0.1, y: -0.7, rot: -0.25, scale: 0.45 },
    ],
    live: [{ kind: 'soulGauze', color: '#9ad4e8', scale: 0.8, alpha: 0.55, params: { n: 3 } }],
  },
  hollow_scripture_harness: {
    parts: [
      { kind: 'vacantCuirass', x: -0.28, scale: 0.87 },
      { kind: 'pauldrons', x: 0.05, scale: 0.76 },
      { kind: 'helm', x: 0.51, scale: 0.43 },
      { kind: 'gauntlets', x: -0.42, y: 0.68, scale: 0.45, mirror: true, params: { n: 1 } },
      { kind: 'reliquaryFolio', x: -0.42, scale: 0.85 },
    ],
    live: [{ kind: 'floatingShards', color: '#c2dbdf', scale: 0.32, alpha: 0.7, params: { n: 3, orbit: 2, spin: 0.2 } }],
    shadowScale: 0.8,
  },
  dust_djinn: {
    parts: [
      { kind: 'gritVortex', x: -0.24, scale: 1.03 },
      { kind: 'mask', x: 0.59, color: '#e8cf92', scale: 0.5 },
    ],
    live: [
      { kind: 'puffMotes', color: '#e8d0a0', scale: 0.75, alpha: 0.55, params: { n: 4 } },
    ],
    shadowScale: 0.5,
  },
  sun_priest: {
    parts: [
      { kind: 'robe', color: '#aa7134', scale: 0.83 },
      { kind: 'ritualFan', x: 0.12, y: 0.78, rot: 0.38, scale: 0.76, color: '#e8b54d', mirror: true },
      { kind: 'sunburst', x: 0.42, color: '#ffd870', scale: 0.66 },
      { kind: 'mask', x: 0.5, color: '#eed797', scale: 0.42 },
      { kind: 'censer', x: -0.4, color: '#8a6e34', scale: 0.7 },
    ],
    shadowScale: 0.95,
  },
  glasschanter: {
    parts: [
      { kind: 'glassFins', x: -0.2, color: '#96c2bc', scale: 0.8 },
      { kind: 'robe', color: '#806c4b', scale: 0.65 },
      { kind: 'glassLyre', x: -0.28, scale: 1.02 },
      { kind: 'gem', x: 0.6, color: '#d7f4df', scale: 0.38 },
    ],
    live: [{ kind: 'floatingShards', color: '#d8f0df', scale: 0.34, params: { n: 3, orbit: 2, spin: 0.16 } }],
    shadowScale: 0.8,
  },
  sirocco_hourglass_diviner: {
    parts: [
      { kind: 'robe', color: '#6f5945', scale: 0.76 },
      { kind: 'sandglass', x: -0.14, scale: 1.12 },
      { kind: 'hood', x: 0.63, color: '#b68f53', scale: 0.46 },
      { kind: 'mask', x: 0.72, color: '#f1d7a4', scale: 0.34 },
      { kind: 'glassFins', x: -0.18, color: '#d5e8d9', scale: 0.46, alpha: 0.65 },
    ],
    live: [{ kind: 'veilSashes', color: '#d9bf8c', scale: 0.93, alpha: 0.65, params: { sashes: 2 } }],
  },
  lampwright: {
    parts: [
      { kind: 'mothWings', color: '#a6bd82', scale: 0.9, alpha: 0.85 },
      { kind: 'lanternAbdomen', x: -0.24, scale: 0.77 },
      { kind: 'carapace', x: 0.38, color: '#66734c', scale: 0.35, params: { segs: 2 } },
      { kind: 'filamentAntennae', x: 0.15, scale: 0.68 },
      { kind: 'eyes', color: '#fcffd5', params: { dist: 0.57, spread: 0.19, size: 0.07 } },
    ],
    // Preserve the existing chorus beat tell.
    live: [{ kind: 'beatPips', x: -0.6, color: '#d8f078', params: { n: 3 } }],
  },
  dew_porter: {
    parts: [
      { kind: 'legs', x: -0.08, color: '#638465', scale: 0.69, params: { pairs: 3 } },
      { kind: 'lanternAbdomen', x: -0.25, color: '#99c1a5', scale: 0.61 },
      { kind: 'yoke', x: -0.05, rot: Math.PI / 2, color: '#657d58', params: { span: 1.1 } },
      { kind: 'lantern', x: -0.36, y: 0.65, color: '#b4e3dc', scale: 0.55, mirror: true },
      { kind: 'filamentAntennae', x: 0.2, scale: 0.5 },
      { kind: 'eyes', color: '#efffdd', params: { dist: 0.55, spread: 0.2, size: 0.07 } },
    ],
    live: [{ kind: 'wisps', color: '#b5e4d3', scale: 0.5, alpha: 0.45, params: { n: 3 } }],
  },
  shard_gardener: {
    parts: [
      { kind: 'legs', color: '#586c62', scale: 0.86, params: { pairs: 3 } },
      { kind: 'carapace', x: -0.17, color: '#688f83', scale: 0.72, params: { segs: 2 } },
      { kind: 'crystalGrowths', x: -0.32, color: '#b3e2cb', scale: 1.03, params: { n: 7 } },
      { kind: 'lanternAbdomen', x: 0.03, scale: 0.4 },
      { kind: 'filamentAntennae', x: 0.29, scale: 0.68 },
      { kind: 'mandibles', x: 0.32, color: '#d6ecd8', scale: 0.4 },
    ],
  },
  glimmer_lantern_weaver: {
    parts: [
      { kind: 'ritualFan', x: -0.08, y: 0.93, rot: 0.45, color: '#b5cbbb', scale: 0.9, alpha: 0.7, mirror: true },
      { kind: 'legs', x: -0.16, color: '#718975', scale: 0.64, params: { pairs: 3 } },
      { kind: 'lanternAbdomen', x: -0.38, scale: 0.8 },
      { kind: 'carapace', x: 0.3, color: '#63836b', scale: 0.38, params: { segs: 2 } },
      { kind: 'filamentAntennae', x: 0.14, scale: 0.78 },
      { kind: 'eyes', color: '#f9ffe1', params: { dist: 0.57, spread: 0.2, size: 0.07 } },
    ],
    live: [{ kind: 'soulGauze', x: -0.5, color: '#d9e9c8', scale: 0.6, alpha: 0.35, params: { n: 2 } }],
    shadowScale: 0.65,
  },
};
