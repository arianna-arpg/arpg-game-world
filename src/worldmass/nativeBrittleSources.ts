import { doodadRuleOf, type Doodad, type DoodadRule } from '../engine/levelgen';
import { dissolveFor, dissolveCutOf, dissolveMotionOf, type ResolvedDissolve } from '../engine/dissolve';
import { MONSTERS, defBreathes, defDensity, defLeavesRemains, type MonsterDef } from '../data/monsters';
import { SKILLS } from '../data/skills';
import type { SkillDef } from '../engine/skills';
import { tellSpecsOf, TELL_CFG, TELL_SOURCES, type TellSpec } from '../engine/tells';
import type { ZoneDef } from '../data/zones';
import { gemFloorFor } from '../engine/loot';
import { canonical, freezeData, massDigest } from './random';

/** Only the native urn family is owned. This is a compatibility protocol for
 * native factory/dissolution algorithms, not a replacement implementation. */
export const NATIVE_URN_PROTOCOL = 'native-burial-urn-v1' as const;
export interface NativeBrittleDefinition {
  protocol: typeof NATIVE_URN_PROTOCOL;
  kind: 'burial_urn';
  rule: DoodadRule;
  dissolve: ResolvedDissolve | null;
  debris: { kind: string; rule: DoodadRule } | null;
  wake: {
    id: string; definition: MonsterDef;
    skills: { id: string; definition: SkillDef }[];
    tells: TellSpec[]; tellSweepSec: number;
    nature: { breathes: boolean; density: number; remains: boolean };
  };
  hash: string;
}
export interface NativeBrittleSource { index: number; kind: 'burial_urn'; definitionHash: string }
export interface NativeBrittleSources {
  schema: 1; registryHash: string;
  /** Interned per feature, never duplicate a skill tree for every pot. */
  definitions: NativeBrittleDefinition[];
  rows: NativeBrittleSource[];
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const digest = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value);

function currentDefinition(): NativeBrittleDefinition {
  const rule = copy(doodadRuleOf('burial_urn'));
  // The family is intentionally fixed. An altered spawn row is retained in the
  // rule and refused by support, never silently redirected to another body.
  const def = MONSTERS.skeleton_warrior, dissolve = copy(dissolveFor('burial_urn'));
  const debris = dissolve?.debris ? { kind: dissolve.debris, rule: copy(doodadRuleOf(dissolve.debris)) } : null;
  const body = { protocol: NATIVE_URN_PROTOCOL, kind: 'burial_urn' as const, rule,
    dissolve, debris,
    wake: { id: 'skeleton_warrior', definition: copy(def),
      skills: def.skills.map(id => ({ id, definition: copy(SKILLS[id]) })),
      tells: copy(tellSpecsOf(def) ?? []), tellSweepSec: TELL_CFG.sweepSec,
      nature: { breathes: defBreathes(def), density: defDensity(def), remains: defLeavesRemains(def) } } };
  return { ...body, hash: massDigest(body) };
}
// Selected native implementations only. Replacing a registered cut/pose at
// runtime is not equivalent to retaining its name and numeric tuning.
const nativeCut = dissolveCutOf('shards');
const nativePose = dissolveMotionOf('shatter')?.pose;
const nativeDefinition = canonical(currentDefinition());
const nativeTellSources = new Map(currentDefinition().wake.tells.map(t =>
  [t.source, TELL_SOURCES[t.source] ?? TELL_SOURCES[t.source.split(':')[0]]]));
const supportedRule = canonical({ overlap:'inert', spacing:22, brittle:{on:['hit','touch'],
  orbChance:.55,gemChance:.12,color:'#b8a890',spawn:{monster:'skeleton_warrior',count:[1,2],chance:.22}},
  dissolve:{material:'ceramic'} });

/** Pre-generation worker identity touches one rule/body and its actual skills,
 * not the entire bestiary, mutable proc registries or unrelated dissolution. */
export function nativeBrittleRegistryHash(): string { return massDigest(currentDefinition()); }

export function captureNativeBrittleSources(doodads: readonly Doodad[]): Readonly<NativeBrittleSources> {
  const definition = currentDefinition();
  const rows: NativeBrittleSource[] = [];
  doodads.forEach((d, index) => { if (d.kind === 'burial_urn') rows.push({ index, kind: 'burial_urn', definitionHash: definition.hash }); });
  const result: NativeBrittleSources = { schema: 1, registryHash: massDigest(definition), definitions: rows.length ? [definition] : [], rows };
  validateNativeBrittleSources(result, doodads);
  return freezeData(result);
}

/** Historical geometry uses its saved source. No re-generation, hydration,
 * live body allocation, or compatibility substitution occurs here. */
export function validateNativeBrittleSources(value: Readonly<NativeBrittleSources>, doodads: readonly Doodad[]): void {
  if (!value || value.schema !== 1 || !digest(value.registryHash) || !Array.isArray(value.rows)
    || !Array.isArray(value.definitions) || value.definitions.length > 1 || value.rows.length > doodads.length)
    throw Error('Invalid native brittle source contract');
  canonical(value);
  const definitions = new Map<string, NativeBrittleDefinition>();
  for (const definition of value.definitions) {
    const { hash, ...body } = definition;
    if (definition.protocol !== NATIVE_URN_PROTOCOL || definition.kind !== 'burial_urn'
      || !digest(hash) || massDigest(body) !== hash || !definition.rule?.brittle
      || (definition.dissolve?.debris ? !definition.debris || definition.debris.kind !== definition.dissolve.debris || !definition.debris.rule : definition.debris !== null)
      || !definition.wake || definition.wake.id !== 'skeleton_warrior' || definition.wake.definition?.id !== definition.wake.id
      || !Array.isArray(definition.wake.tells) || !Number.isFinite(definition.wake.tellSweepSec) || definition.wake.tellSweepSec <= 0
      || !Array.isArray(definition.wake.definition.skills) || !Array.isArray(definition.wake.skills)
      || definition.wake.skills.length !== definition.wake.definition.skills.length
      || definition.wake.skills.some((s, i) => s.id !== definition.wake.definition.skills[i] || s.definition?.id !== s.id)
      || !definition.wake.nature || typeof definition.wake.nature.breathes !== 'boolean'
      || typeof definition.wake.nature.remains !== 'boolean' || !Number.isFinite(definition.wake.nature.density)
      || definition.wake.nature.density <= 0 || massDigest(definition) !== value.registryHash)
      throw Error('Invalid native brittle definition');
    definitions.set(hash, definition);
  }
  let last = -1;
  for (const row of value.rows) {
    if (!Number.isSafeInteger(row.index) || row.index <= last || row.kind !== 'burial_urn'
      || doodads[row.index]?.kind !== row.kind || !definitions.has(row.definitionHash))
      throw Error('Invalid native brittle source row');
    last = row.index;
  }
  const expected = doodads.flatMap((d, index) => d.kind === 'burial_urn' ? [index] : []);
  if (expected.length !== value.rows.length || expected.some((index, i) => value.rows[i].index !== index)
    || (value.rows.length > 0) !== (value.definitions.length > 0))
    throw Error('Native brittle source lost scenery mechanism');
}

export function nativeBrittleRequirements(value: Readonly<NativeBrittleSources>): string[] {
  return value.rows.length ? ['native-brittle:burial_urn', 'native-brittles'] : [];
}

/** This adapter can reuse the ordinary kill reward artery only on an open,
 * default-bounty shell with no gem floor. Objective kind is not a loot policy.
 * The World host additionally owns any live quickening-overlay equivalence. */
export function nativeUrnRewardContextSupported(zone: Readonly<ZoneDef>): boolean {
  const floor = gemFloorFor(zone.tileset);
  return zone.spoils !== 'none' && (zone.bounty === undefined || zone.bounty === 1)
    && !zone.quickened && floor.skills.size === 0 && floor.supports.size === 0;
}

/** The first adapter owns the original simple urn, including its complete
 * skeleton + ceramic dissolution. Current native implementations must still
 * match the frozen source; arbitrary brittle branches are never stripped. */
export function nativeUrnSourceSupported(definition: Readonly<NativeBrittleDefinition>, zone: Readonly<ZoneDef>): boolean {
  return definition.protocol === NATIVE_URN_PROTOCOL && definition.kind === 'burial_urn'
    && canonical(definition.rule) === supportedRule
    && canonical(definition) === nativeDefinition && canonical(definition) === canonical(currentDefinition())
    && definition.wake.tells.every(t => t.source === 'wind' || t.source === 'winded')
    && [...nativeTellSources].every(([id, fn]) => !!fn && (TELL_SOURCES[id] ?? TELL_SOURCES[id.split(':')[0]]) === fn)
    && !!nativeCut && !!nativePose && dissolveCutOf('shards') === nativeCut && dissolveMotionOf('shatter')?.pose === nativePose
    && zone.objective.kind === 'none' && (zone.caveDepth ?? 0) === 0 && !zone.castSeal && !zone.quickened
    && nativeUrnRewardContextSupported(zone);
}
