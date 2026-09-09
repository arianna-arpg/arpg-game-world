// Declarative local exploration plans. Pure data + deterministic compilation;
// builders live in engine/localeGen and authored programs in data/locales.
import { escarpmentPassesCrossed } from './escarpments';
import type { MapCoord } from './coords';
import { atlasSeedInstalled, featuresAt } from './atlas';
import { Rng } from '../core/rng';
import type { DoodadKind } from '../engine/levelgen';
import { transformFragment, validateLocaleFragment, type LocaleFragment } from './localeFragments';

export interface DistrictChoice {
  id: string; weight: number;
  builder: string;
  params?: Record<string, number>;
  region?: string;
  fragment?: LocaleFragment;
  turns?: (0 | 1 | 2 | 3)[];
  mirror?: boolean;
}

export interface LocaleDistrict {
  id: string;
  builder: string;
  /** Weighted interchangeable contents, resolved on an independent district seed. */
  choices?: DistrictChoice[];
  choice?: string;
  fragment?: LocaleFragment;
  transform?: { turns: number; mirror: boolean };
  /** Center and footprint as fractions of the enclosing zone. */
  at: [number, number];
  size: [number, number];
  jitter?: number;
  params?: Record<string, number>;
  /** Registered fill material for builders that carve basins or channels. */
  region?: string;
  dress?: { kind: DoodadKind; count: [number, number]; radius: [number, number] }[];
  cave?: boolean;
  /** Named connection sockets within the district footprint. */
  ports?: Record<string, [number, number]>;
  external?: boolean;
}
export interface LocaleLink {
  from: string; to: string;
  fromPort?: string; toPort?: string;
  role: 'main' | 'flank' | 'discovery';
  width: number;
  /** Optional shortcuts may vary, but the guaranteed links must reach every district. */
  chance?: number;
  via?: [number, number][];
}
export interface LocaleVariant {
  id: string; weight: number;
  districts: LocaleDistrict[];
  links: LocaleLink[];
  entrance: string;
  portalMode?: 'entrance' | 'nearest';
  approaches?: Partial<Record<'n' | 's' | 'e' | 'w', { district: string; via?: [number, number][] }>>;
  goal: string;
  terrain?: { background: string; rim?: { side: 'n' | 's' | 'e' | 'w'; width: number; region: string } };
  river?: { width: [number, number]; bend: [number, number]; region: string; crossing: string };
}
export interface LocaleProgram {
  id: string; version: number; label: string;
  size: { w: number; h: number };
  /** Uniform scaling preserves authored proportions and keeps old plans unchanged. */
  sizeScale?: [number, number];
  /** Ordinary composed terrain may participate in the biome's underground network. */
  underways?: boolean;
  variants: LocaleVariant[];
}
/** Resolved choices are stored on the zone, not re-rolled from live tables. */
export interface LocalePlan extends Omit<LocaleVariant, 'weight' | 'river'> {
  program: string; version: number; seed: number;
  size?: { w: number; h: number };
  underways?: boolean;
  river?: { width: number; bend: number; region: string; crossing: string };
}
export interface AtlasDestination {
  feature: string; name: string;
  seed: number; seat: { x: number; y: number };
  program: string;
}
const PROGRAMS: Record<string, LocaleProgram> = {};
let defaultProgram: string | undefined;
export function registerLocaleProgram(def: LocaleProgram, makeDefault = false): void {
  const errors = validateLocaleProgram(def);
  if (errors.length) throw new Error(`locale ${def.id}: ${errors.join('; ')}`);
  PROGRAMS[def.id] = def;
  if (makeDefault) defaultProgram = def.id;
}
export const localeProgram = (id?: string): LocaleProgram | undefined => PROGRAMS[id ?? defaultProgram ?? ''];
export const localePrograms = (): LocaleProgram[] => Object.values(PROGRAMS);
/** One deterministic winner when destination catchments overlap. */
export function atlasDestinationAt(at: MapCoord, excludeFeature?: string, from?: MapCoord) {
  const seed = atlasSeedInstalled(), hits = featuresAt(at), crossedPasses = new Set<string>();
  if (from && seed !== null) for (const scarp of escarpmentPassesCrossed(from, at, seed)) {
    // A long biome-scaled step must enter the climb, not jump over it.
    for (const hit of featuresAt(scarp.seat, seed)) if (hit.feature.scarp?.id === scarp.id && hit.feature.id !== excludeFeature) {
      crossedPasses.add(hit.feature.id);
      hits.push({ ...hit, dist: 0 });
    }
  }
  return hits.filter(h => h.def.destination && localeProgram(h.def.destination.locale)
    && h.feature.id !== excludeFeature && (h.def.destination.reach === undefined || crossedPasses.has(h.feature.id) || Math.hypot(at.x - h.feature.seat.x, at.y - h.feature.seat.y) <= h.def.destination.reach)).sort((a, b) => a.dist - b.dist || a.feature.id.localeCompare(b.feature.id))[0];
}
export function localeSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function compileLocale(def: LocaleProgram, seed: number, variantId?: string): LocalePlan {
  const rng = new Rng(seed);
  let variant = variantId ? def.variants.find(v => v.id === variantId) : undefined;
  if (variantId && !variant) throw new Error(`locale ${def.id}: unknown variant ${variantId}`);
  if (!variant) {
    let pick = rng.next() * def.variants.reduce((n, v) => n + v.weight, 0);
    variant = def.variants.find(v => (pick -= v.weight) < 0) ?? def.variants[def.variants.length - 1];
  }
  const { weight: _weight, river, ...copy } = structuredClone(variant);
  copy.links = copy.links.filter(l => l.chance === undefined || new Rng(localeSeed(`${seed}/${l.from}/${l.to}/${l.role}/link`)).chance(l.chance));
  for (const l of copy.links) delete l.chance;
  for (const d of copy.districts) {
    const jitter = d.jitter ?? 0;
    d.at = [d.at[0] + rng.range(-jitter, jitter), d.at[1] + rng.range(-jitter, jitter)];
    delete d.jitter;
    if (d.choices) {
      const choiceRng = new Rng(localeSeed(`${seed}/${d.id}/choice`));
      let pick = choiceRng.next() * d.choices.reduce((n, c) => n + c.weight, 0);
      const row = d.choices.find(c => (pick -= c.weight) < 0) ?? d.choices[d.choices.length - 1];
      d.choice = row.id; d.builder = row.builder;
      delete d.fragment; delete d.transform;
      d.params = { ...d.params, ...row.params };
      if (row.region) d.region = row.region;
      if (row.fragment) {
        d.transform = { turns: choiceRng.pick(row.turns ?? [0]), mirror: !!row.mirror && choiceRng.chance(0.5) };
        d.fragment = transformFragment(row.fragment, d.transform.turns, d.transform.mirror);
      }
      delete d.choices;
    }
    if (d.fragment) d.ports = structuredClone(d.fragment.ports);
  }
  const scale = def.sizeScale ? new Rng(localeSeed(`${seed}/${def.id}/size`)).range(...def.sizeScale) : 1;
  return { ...copy, program: def.id, version: def.version, seed,
    size: { w: Math.round(def.size.w * scale), h: Math.round(def.size.h * scale) },
    ...(def.underways ? { underways: true } : {}),
    ...(river ? { river: { ...river, width: rng.range(...river.width), bend: rng.range(...river.bend) } } : {}) };
}

export function validateLocaleProgram(def: LocaleProgram, refs?: { builder?: (id: string) => boolean; doodad?: (id: string) => boolean; region?: (id: string) => boolean; walkable?: (id: string) => boolean }): string[] {
  const errors: string[] = [];
  if (!def.id || !Number.isSafeInteger(def.version) || def.version < 1) errors.push('id and positive integer version required');
  if (![def.size.w, def.size.h].every(n => Number.isFinite(n) && n >= 900 && n <= 4800)) errors.push('size must be 900..4800');
  if (def.sizeScale && (!def.sizeScale.every(n => Number.isFinite(n) && n >= 0.75 && n <= 1.5)
    || def.sizeScale[0] > def.sizeScale[1] || [def.size.w, def.size.h].some(n => n * def.sizeScale![0] < 900 || n * def.sizeScale![1] > 6000))) errors.push('invalid locale size scale');
  if (!def.variants.length || new Set(def.variants.map(v => v.id)).size !== def.variants.length) errors.push('unique nonempty variants required');
  for (const v of def.variants) {
    const ids = new Set(v.districts.map(d => d.id));
    if (!v.id || !(v.weight > 0) || !Number.isFinite(v.weight)) errors.push(`${v.id}: invalid weight/id`);
    if (ids.size !== v.districts.length || !ids.has(v.entrance) || !ids.has(v.goal)) errors.push(`${v.id}: invalid district identities/endpoints`);
    if (v.districts.length < 2 || v.districts.length > 12 || v.links.length > 24) errors.push(`${v.id}: district/link budget exceeded`);
    for (const d of v.districts) {
      if (!d.choices && (d.builder === 'fragment') !== !!d.fragment) errors.push(`${v.id}/${d.id}: fragment district requires fragment builder and terrain`);
      if (d.choices && (!d.choices.length || new Set(d.choices.map(c => c.id)).size !== d.choices.length)) errors.push(`${v.id}/${d.id}: unique nonempty choices required`);
      for (const c of d.choices ?? []) {
        if (!c.id || !Number.isFinite(c.weight) || c.weight <= 0 || !c.builder
          || Object.values(c.params ?? {}).some(n => !Number.isFinite(n))) errors.push(`${v.id}/${d.id}: invalid district choice`);
        if (refs?.builder && !refs.builder(c.builder)) errors.push(`${v.id}/${d.id}: unknown choice builder ${c.builder}`);
        if (c.region && refs?.region && !refs.region(c.region)) errors.push(`${v.id}/${d.id}: unknown choice region ${c.region}`);
        if (c.turns && (!c.turns.length || c.turns.some(n => !Number.isInteger(n) || n < 0 || n > 3))) errors.push(`${v.id}/${d.id}: invalid fragment rotation`);
        if ((c.builder === 'fragment') !== !!c.fragment) errors.push(`${v.id}/${d.id}: fragment choice requires fragment builder and terrain`);
      }
      for (const f of [d.fragment, ...(d.choices ?? []).map(c => c.fragment)].filter((f): f is LocaleFragment => !!f)) {
        errors.push(...validateLocaleFragment(f, refs).map(e => `${v.id}/${d.id}/${f.id}: ${e}`));
        const minAxis = Math.min(d.size[0] * def.size.w, d.size[1] * def.size.h) * (def.sizeScale?.[0] ?? 1);
        if (minAxis / Math.max(f.cells.length, f.cells[0]?.length ?? 1) < 30) errors.push(`${v.id}/${d.id}: fragment cells smaller than walk grid`);
      }
      if (d.region && refs?.region && !refs.region(d.region)) errors.push(`${v.id}/${d.id}: unknown district region ${d.region}`);
      if (refs?.builder && !refs.builder(d.builder)) errors.push(`${v.id}/${d.id}: unknown builder ${d.builder}`);
      if (!d.id || !d.builder || Object.values(d.params ?? {}).some(n => !Number.isFinite(n))) errors.push(`${v.id}/${d.id}: invalid builder parameters`);
      if (Object.values(d.ports ?? {}).some(p => !p.every(n => Number.isFinite(n) && n >= 0 && n <= 1))) errors.push(`${v.id}/${d.id}: invalid ports`);
      const j = d.jitter ?? 0;
      if (!Number.isFinite(j) || j < 0 || j > 0.08 || !d.at.every(Number.isFinite)
        || !d.size.every(n => Number.isFinite(n) && n >= 0.12 && n <= 0.85)
        || d.at.some((n, i) => n - d.size[i] / 2 - j < 0.04 || n + d.size[i] / 2 + j > 0.96)) errors.push(`${v.id}/${d.id}: footprint escapes zone`);
      for (const r of d.dress ?? []) {
        if (refs?.doodad && !refs.doodad(r.kind)) errors.push(`${v.id}/${d.id}: unknown dressing ${r.kind}`);
        if (!r.count.every(n => Number.isInteger(n) && n >= 0 && n <= 80) || r.count[0] > r.count[1]
          || !r.radius.every(n => Number.isFinite(n) && n > 0 && n <= 90) || r.radius[0] > r.radius[1]) errors.push(`${v.id}/${d.id}: invalid dressing budget`);
      }
    }
    for (const approach of Object.values(v.approaches ?? {})) if (!ids.has(approach.district) || approach.via?.some(p => !p.every(n => Number.isFinite(n) && n >= 0.02 && n <= 0.98))) errors.push(`${v.id}: invalid approach`);
    if (!v.districts.some(d => d.external !== false)) errors.push(`${v.id}: no external portal district`);
    if (v.terrain?.rim && (!['n', 's', 'e', 'w'].includes(v.terrain.rim.side) || !Number.isFinite(v.terrain.rim.width) || v.terrain.rim.width < 30 || v.terrain.rim.width > 180)) errors.push(`${v.id}: invalid terrain rim`);
    if (v.terrain && refs?.region && (!refs.region(v.terrain.background) || (v.terrain.rim && !refs.region(v.terrain.rim.region)))) errors.push(`${v.id}: unknown terrain region`);
    for (const l of v.links) {
      const hasPort = (id: string, port: string) => {
        const d = v.districts.find(d => d.id === id);
        return !!d && (d.choices ? d.choices.every(c => c.fragment?.ports[port] ?? d.ports?.[port]) : !!(d.fragment?.ports[port] ?? d.ports?.[port]));
      };
      if ((l.fromPort && !hasPort(l.from, l.fromPort)) || (l.toPort && !hasPort(l.to, l.toPort))) errors.push(`${v.id}: unknown connection port`);
      if (l.chance !== undefined && (!Number.isFinite(l.chance) || l.chance < 0 || l.chance > 1)) errors.push(`${v.id}: invalid connection chance`);
      if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to || !Number.isFinite(l.width) || l.width < 90 || l.width > 240
        || l.via?.some(p => !p.every(n => Number.isFinite(n) && n >= 0.04 && n <= 0.96))) errors.push(`${v.id}: invalid connection ${l.from}/${l.to}`);
    }
    const reached = new Set([v.entrance]);
    for (let i = 0; i < ids.size; i++) for (const l of v.links) {
      if (l.chance !== undefined && l.chance < 1) continue;
      if (reached.has(l.from)) reached.add(l.to);
      if (reached.has(l.to)) reached.add(l.from);
    }
    if ([...ids].some(id => !reached.has(id))) errors.push(`${v.id}: disconnected district`);
    if (v.river && refs?.walkable && (!refs.walkable(v.river.region) || !refs.walkable(v.river.crossing))) errors.push(`${v.id}: unwalkable river/crossing region`);
    if (v.river && refs?.region && (!refs.region(v.river.region) || !refs.region(v.river.crossing))) errors.push(`${v.id}: unknown or unwalkable river/crossing region`);
    if (v.river && (![...v.river.width, ...v.river.bend].every(Number.isFinite) || v.river.width[0] < 60
      || v.river.width[0] > v.river.width[1] || v.river.width[1] > 280 || v.river.bend[0] > v.river.bend[1]
      || v.river.bend.some(n => Math.abs(n) > 0.25))) errors.push(`${v.id}: invalid river band`);
  }
  return errors;
}
