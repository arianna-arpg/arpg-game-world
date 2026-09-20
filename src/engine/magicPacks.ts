import type { Actor } from './actor';
import type { Modifier } from './stats';
import { MAGIC_PACK_CFG, MAGIC_PACKS } from '../data/magicPacks';
import { packLinks, PACK_CFG, type PackLink } from './pack';
import { STAT_DEFS } from './stats';
import { magicPackFallen, restoreMagicPackRuntime, type MagicPackBearer, type MagicPackBeam, type MagicPackGrave, type MagicPackRuntime } from './magicPackMechanics';
import { magicPackEventErrors, type MagicPackEventSpec } from './magicPackEvents';

export interface MagicPackDef extends MagicPackEventSpec {
  id: string;
  name: string;
  minLevel: number;
  weight: number;
  hint: string;
  activeLabel: string;
  inactiveLabel: string;
  color: string;
  /** Active speed chevrons, driven by the same rule state as the modifiers. */
  strideTell?: boolean;
  bearer?: MagicPackBearer;
  beam?: MagicPackBeam;
  grave?: MagicPackGrave;
  rules: {
    role?: 'bearer' | 'others' | 'donor';
    perDonor?: boolean;
    nearby?: { radius: number; min: number; max?: number; role?: 'bearer' };
    /** Scale the payload once per slain original member, up to this cap. */
    fallen?: { max: number };
    mods: Modifier[];
  }[];
}

/** Optional zone difficulty/content policy. false disables ambient magic rolls. */
export interface MagicPackPolicy { sizeMul?: number; mechanics?: string[]; }

/** JSON-safe identity shared by the ORIGINAL cohort. Summons never inherit it. */
export interface MagicPackState {
  id: number; mechanic: string; size: number; fallen: number; leader?: 1;
  /** Stable identity inside the original group, independent of runtime actor IDs. */
  slot?: number;
  runtime?: MagicPackRuntime;
}

export function magicPackMinimum(def: MagicPackDef): number {
  return Math.max(def.ritual ? 3 : 2, ...def.rules.map(rule => (rule.nearby?.min ?? 0) + 1));
}

export function magicPackPool(level: number, policy?: MagicPackPolicy | false, memberCap = MAGIC_PACK_CFG.maxMembers): MagicPackDef[] {
  if (policy === false) return [];
  return Object.values(MAGIC_PACKS).filter(d => d.minLevel <= level && d.weight > 0 && magicPackMinimum(d) <= memberCap
    && (!policy?.mechanics || policy.mechanics.includes(d.id)));
}

export function rollMagicPack(level: number, policy?: MagicPackPolicy | false, rng = Math.random, memberCap = MAGIC_PACK_CFG.maxMembers): MagicPackDef | undefined {
  const pool = magicPackPool(level, policy, memberCap);
  let roll = rng() * pool.reduce((n, d) => n + d.weight, 0);
  return pool.find(d => (roll -= d.weight) < 0);
}

export function magicPackSize(level: number, policy?: MagicPackPolicy | false, rng = Math.random): number {
  let band = MAGIC_PACK_CFG.sizeByLevel[0].size;
  for (const row of MAGIC_PACK_CFG.sizeByLevel) if (level >= row.level) band = row.size;
  const n = band[0] + Math.floor(rng() * (band[1] - band[0] + 1));
  const mul = policy && Number.isFinite(policy.sizeMul) ? Math.max(0, policy.sizeMul!) : 1;
  return Math.max(2, Math.min(MAGIC_PACK_CFG.maxMembers, Math.round(n * mul)));
}

export function readMagicPack(raw: unknown): MagicPackState | undefined {
  if (!raw || typeof raw !== 'object') return;
  const p = raw as MagicPackState;
  if (!Number.isSafeInteger(p.id) || p.id < 1 || typeof p.mechanic !== 'string' || !Object.hasOwn(MAGIC_PACKS, p.mechanic)
    || !Number.isSafeInteger(p.size) || p.size < 2 || p.size > MAGIC_PACK_CFG.maxMembers
    || !Number.isSafeInteger(p.fallen) || p.fallen < 0 || p.fallen >= p.size) return;
  return { id: p.id, mechanic: p.mechanic, size: p.size, fallen: p.fallen,
    ...(p.leader === 1 ? { leader: 1 as const } : {}),
    ...(Number.isSafeInteger(p.slot) && p.slot! >= 0 && p.slot! < p.size ? { slot: p.slot } : {}),
    runtime: restoreMagicPackRuntime(p.runtime, MAGIC_PACKS[p.mechanic], p.size) };
}

function active(a: Actor): boolean {
  return !!a.magicPack && !a.dead && !a.owner && a.team === 'enemy' && a.rarity === 'magic';
}

/** Called only for an actual death, after death refusal/revival gates. Quiet
 * retirement, taming, despawn and zone travel cannot manufacture casualty buffs. */
export function magicPackDeath(a: Actor, actors: readonly Actor[]): void {
  const p = a.magicPack;
  if (!p || a.owner || a.team !== 'enemy' || a.rarity !== 'magic') return;
  magicPackFallen(a, actors);
  for (const b of actors) if (active(b) && b.magicPack!.id === p.id && b.magicPack!.mechanic === p.mechanic) {
    b.magicPack = { ...b.magicPack!, fallen: Math.min(p.size - 1, b.magicPack!.fallen + 1) };
  }
}

/** One bucket pass, then only small cohort-local scans. Reconcile modifiers on
 * edges; all power remains attributable to magicPack:<recipe>:<rule>. */
export function updateMagicPacks(actors: readonly Actor[]): void {
  const groups = new Map<number, Actor[]>();
  for (const a of actors) {
    if (!active(a) || !MAGIC_PACKS[a.magicPack!.mechanic]) {
      for (const key of a.magicPackSources ?? []) a.sheet.removeSource(key);
      a.magicPackSources = undefined;
      a.magicPackSignature = undefined;
      a.magicPackFrom = undefined;
      a.magicPackPower = 0;
      continue;
    }
    const id = a.magicPack!.id;
    const group = groups.get(id);
    if (group) group.push(a); else groups.set(id, [a]);
  }
  for (const group of groups.values()) for (const a of group) {
    const p = a.magicPack!;
    const def = MAGIC_PACKS[p.mechanic];
    let from: Actor | undefined;
    const stacks = def.rules.map(rule => {
      if (rule.role && (rule.role === 'others' ? a.magicPackRole !== 'member'
        : rule.role === 'donor' ? a.magicPackRole !== 'donor' : a.magicPackRole !== 'bearer')) return 0;
      const kin = rule.nearby ? group.filter(b => b !== a && b.faction === a.faction
        && b.tier === a.tier && b.magicPack!.mechanic === p.mechanic
        && (!rule.nearby!.role || b.magicPackRole === rule.nearby!.role)
        && Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= rule.nearby!.radius)
        .sort((b, c) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)
          - Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) || b.id - c.id) : [];
      if (rule.nearby && kin.length < rule.nearby.min) return 0;
      if (rule.nearby?.max !== undefined && kin.length > rule.nearby.max) return 0;
      const n = rule.perDonor ? a.magicPackDonors : rule.fallen ? Math.min(p.fallen, rule.fallen.max) : 1;
      if (n > 0 && kin.length) from ??= kin[0];
      return n;
    });
    a.magicPackFrom = from;
    a.magicPackPower = Math.max(0, ...stacks);
    const signature = `${p.mechanic}:${stacks.join(',')}`;
    if (a.magicPackSignature === signature) continue;
    for (const key of a.magicPackSources ?? []) a.sheet.removeSource(key);
    a.magicPackSources = def.rules.map((rule, i) => {
      const key = `magicPack:${p.mechanic}:${i}`;
      if (stacks[i]) a.sheet.setSource(key, rule.mods.map(m => ({ ...m, value: m.value * stacks[i] })));
      return key;
    });
    a.magicPackSignature = signature;
  }
}

/** Reuse the existing deterministic link budget/painter, reading precisely the
 * supporter chosen by the combat fold. No second proximity test for rendering. */
export function magicPackLinks(actors: readonly Actor[], view: { x: number; y: number }, limit: number = PACK_CFG.links.max): PackLink[] {
  const bodies = actors.filter(a => a.magicPackFrom && active(a)).map(a => ({
    id: a.id, dead: a.dead, pos: a.pos, radius: a.radius, defId: a.magicPack!.mechanic,
    bondHeld: true, bondFrom: a.magicPackFrom,
  }));
  return packLinks(bodies, id => ({ color: MAGIC_PACKS[id ?? '']?.color, style: 'beam' }), view).slice(0, Math.max(0, limit));
}

/** Boot-time authoring diagnostics, shared with the regression rig. */
export function magicPackErrors(skillExists?: (id: string) => boolean): string[] {
  const errors: string[] = [];
  const integer = (n: number, min: number): boolean => Number.isSafeInteger(n) && n >= min;
  if (!integer(MAGIC_PACK_CFG.maxMembers, 2)) errors.push('magicPack: invalid member cap');
  let level = 0;
  for (const row of MAGIC_PACK_CFG.sizeByLevel) {
    if (!integer(row.level, 1) || row.level <= level || !integer(row.size[0], 2)
      || !integer(row.size[1], row.size[0]) || row.size[1] > MAGIC_PACK_CFG.maxMembers)
      errors.push('magicPack: invalid size progression');
    level = row.level;
  }
  if (MAGIC_PACK_CFG.sizeByLevel[0]?.level !== 1) errors.push('magicPack: missing level-one size');
  for (const [id, def] of Object.entries(MAGIC_PACKS)) {
    errors.push(...magicPackEventErrors(def, skillExists).map(message => `magicPack ${id}: ${message}`));
    for (const skill of [def.beam?.skill, def.grave?.skill]) if (skill && skillExists && !skillExists(skill)) errors.push(`magicPack ${id}: missing skill ${skill}`);
    if (id !== def.id || !integer(def.minLevel, 1) || !Number.isFinite(def.weight) || def.weight < 0
      || !def.name || !def.hint || !def.color || !def.activeLabel || !def.inactiveLabel
      || (!def.rules.length && !def.beam && !def.grave && !def.burst && !def.mend && !def.ritual)) errors.push(`magicPack ${id}: invalid recipe`);
    const positive = (n: number): boolean => Number.isFinite(n) && n > 0;
    if (def.bearer && (!positive(def.bearer.warning) || (def.bearer.rotateEvery !== undefined
      && (!positive(def.bearer.rotateEvery) || def.bearer.rotateEvery <= def.bearer.warning))
      || (def.bearer.siphonRadius !== undefined && !positive(def.bearer.siphonRadius)))) errors.push(`magicPack ${id}: invalid bearer`);
    if (def.beam && (!def.beam.skill || ![def.beam.cooldown, def.beam.initialDelay, def.beam.warning,
      def.beam.travel, def.beam.pulseLength, def.beam.halfWidth, def.beam.range, def.beam.breakDistance].every(positive))) errors.push(`magicPack ${id}: invalid beam`);
    if (def.grave && (!def.grave.skill || ![def.grave.warning, def.grave.radius, def.grave.halfWidth, def.grave.tick].every(positive)
      || !integer(def.grave.spokes, 1) || def.grave.spokes > 8 || !Number.isFinite(def.grave.turnSpeed))) errors.push(`magicPack ${id}: invalid grave`);
    for (const rule of def.rules) {
      if ((rule.role && !def.bearer) || (rule.perDonor && !def.bearer?.siphonRadius)) errors.push(`magicPack ${id}: missing role provider`);
      if (rule.nearby && (!Number.isFinite(rule.nearby.radius) || rule.nearby.radius <= 0
        || !integer(rule.nearby.min, 0) || rule.nearby.min >= MAGIC_PACK_CFG.maxMembers
        || (rule.nearby.max !== undefined && (!integer(rule.nearby.max, rule.nearby.min) || rule.nearby.max >= MAGIC_PACK_CFG.maxMembers))
        || (rule.nearby.role && !def.bearer)))
        errors.push(`magicPack ${id}: invalid proximity gate`);
      if (rule.fallen && (!integer(rule.fallen.max, 1) || rule.fallen.max >= MAGIC_PACK_CFG.maxMembers))
        errors.push(`magicPack ${id}: invalid casualty cap`);
      if (!rule.mods.length || rule.mods.some(m => !Object.hasOwn(STAT_DEFS, m.stat) || !Number.isFinite(m.value)))
        errors.push(`magicPack ${id}: invalid modifier payload`);
    }
  }
  return errors;
}
