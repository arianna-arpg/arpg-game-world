/** Shared exact native face selection. Pool order, duplicates and caller RNG
 * are source inputs. This leaf neither derives geography nor owns a live registry. */
import type { Rng } from '../core/rng';
import type { TilesetDef } from '../data/tilesets';
import type { climateAffinity } from './climate';
import { presenceMul } from '../engine/presence';

export interface NativeTilesetChoicePolicy {
  readonly shared: Readonly<Record<string, readonly string[]>>;
  readonly realms: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>;
  readonly definitions: Readonly<Record<string, Pick<TilesetDef, 'depthAffinity' | 'geoAffinity'>>>;
  readonly climateAffinity: typeof climateAffinity;
}
export function nativeTilesetChoice(
  policy: NativeTilesetChoicePolicy, biome: string, rng: Pick<Rng, 'pick' | 'range'>,
  depth?: number, realm?: string, climate?: Record<string, number>,
): string | undefined {
  const shared = policy.shared[biome];
  const owned = realm ? policy.realms[realm]?.[biome] : undefined;
  const c = owned?.length ? (shared?.length ? [...shared, ...owned] : owned) : shared;
  if (!c || !c.length) return undefined;
  const staged = depth !== undefined && c.some(id => policy.definitions[id].depthAffinity);
  const geoed = !!climate && c.some(id => policy.definitions[id].geoAffinity);
  if (!staged && !geoed) return rng.pick(c);
  const weights = c.map(id => {
    const t = policy.definitions[id];
    const dAff = t.depthAffinity && depth !== undefined ? presenceMul(t.depthAffinity, depth) : 1;
    const gAff = t.geoAffinity && climate ? policy.climateAffinity(t.geoAffinity, climate) : 1;
    return dAff * gAff;
  });
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return rng.pick(c);
  let roll = rng.range(0, total);
  for (let i = 0; i < c.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return c[i];
  }
  return c[c.length - 1];
}
