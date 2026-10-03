import type { MassAddress } from './address';
import type { MassTerrain } from './contracts';
import type { ZoneDef } from '../data/zones';
import { VIS_CFG } from '../render/vis/visConfig';
import { massNoise } from './noise';
import { streamSeed } from './random';

export interface MassGroundRule {
  surface: string;
  /** Original terrain source and native palette provenance are separate. */
  terrainSource: string; source: string;
  palette: string[];
  period: { x: number; y: number };
  bias: number; alpha: number; strength: number; evenness: number; contrast: number;
}
export interface MassGroundSpec { source: string; rules: MassGroundRule[] }

/** Resolve native palette controls once, when creating a new expedition.
 * Palette-less snow themes keep their existing physical surface color. */
export function nativeMassGround(rows: readonly { surface: string; source: string; theme: ZoneDef['theme'] }[]): MassGroundSpec {
  return { source: 'worldmass/native-ground-v1', rules: rows.flatMap(row => {
    const g = row.theme.ground;
    if (!g?.palette || g.palette.length < 2) return [];
    const period = (g.scale ?? 1) / VIS_CFG.ground.noiseScale;
    return [{ surface: row.surface, terrainSource: row.source, source: row.source + '/ground',
      palette: [...g.palette], period: { x: Math.round(period * (g.stretchX ?? 1)), y: Math.round(period) },
      bias: g.bias ?? .5, alpha: g.alpha ?? VIS_CFG.ground.mottleAlpha,
      strength: g.strength ?? 1, evenness: g.evenness ?? 0, contrast: 2.6 }];
  }) };
}
export function validateMassGround(spec: MassGroundSpec): void {
  const text = (s: string): boolean => typeof s === 'string' && !!s && s.length <= 256;
  const range = (n: number, min: number, max: number): boolean => Number.isFinite(n) && n >= min && n <= max;
  if (!spec || !text(spec.source) || !Array.isArray(spec.rules) || spec.rules.length > 64)
    throw new Error('Invalid worldmass ground palette');
  const ids = new Set<string>();
  for (const r of spec.rules) {
    if (!r || !text(r.surface) || ids.has(r.surface) || !text(r.terrainSource) || !text(r.source)
      || !Array.isArray(r.palette) || r.palette.length < 2 || r.palette.length > 16
      || r.palette.some(c => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c))
      || !r.period || !Number.isSafeInteger(r.period.x) || !Number.isSafeInteger(r.period.y)
      || !range(r.period.x, 16, 16384) || !range(r.period.y, 16, 16384)
      || !range(r.bias, .08, .92) || !range(r.alpha, 0, 1) || !range(r.strength, 0, 4)
      || !range(r.evenness, 0, 1) || !range(r.contrast, 0, 8))
      throw new Error('Invalid worldmass ground palette rule');
    ids.add(r.surface);
  }
}
type RGB = [number, number, number];
const rgb = (color: string): RGB => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as RGB;

/** Bake-only compiled palettes. Consequences, route verges and authored sites
 * retain their own attributed surface instead of inheriting the old biome. */
export class MassGround {
  private readonly rules = new Map<string, { def: MassGroundRule; colors: RGB[]; salt: number; exponent: number }>();
  constructor(spec: MassGroundSpec | undefined, seed: number, private readonly span: number) {
    if (!spec) return;
    validateMassGround(spec);
    for (const r of spec.rules) this.rules.set(r.surface, { def: r, colors: r.palette.map(rgb),
      salt: streamSeed(seed, [spec.source, r.source, r.surface]), exponent: Math.log(1 - r.bias) / Math.log(.5) });
  }
  color(sample: MassTerrain, at: MassAddress): RGB {
    const base = rgb(sample.color), rule = this.rules.get(sample.source.rule);
    if (!rule || sample.source.source !== rule.def.terrainSource) return base;
    const { def: d, colors, salt, exponent } = rule;
    let n = Math.max(0, Math.min(1, .5 + (massNoise(at, this.span, d.period.x, salt, d.period.y) - .5) * d.contrast));
    if (exponent !== 1) n = 1 - Math.pow(1 - n, exponent);
    const t = n * (colors.length - 1), i = Math.min(colors.length - 2, Math.floor(t)), f = t - i;
    const shaped = .4 + .6 * Math.abs(n - .5) * 2;
    const alpha = Math.min(1, d.alpha * d.strength * (shaped + (1 - shaped) * d.evenness));
    return base.map((v, channel) => v * (1 - alpha) + (colors[i][channel] * (1 - f) + colors[i + 1][channel] * f) * alpha) as RGB;
  }
}
