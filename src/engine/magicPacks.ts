import type { Actor } from './actor';
import type { Modifier } from './stats';
import { MAGIC_PACK_CFG, MAGIC_PACKS } from '../data/magicPacks';
import { packLinks, PACK_CFG, type PackLink } from './pack';
import { STAT_DEFS } from './stats';

export interface MagicPackDef {
  id: string;
  name: string;
  minLevel: number;
  weight: number;
  hint: string;
  activeLabel: string;
  inactiveLabel: string;
  color: string;
  rules: {
    nearby?: { radius: number; min: number };
    /** Scale the payload once per slain original member, up to this cap. */
    fallen?: { max: number };
    mods: Modifier[];
  }[];
}

/** Optional zone difficulty/content policy. false disables ambient magic rolls. */
export interface MagicPackPolicy { sizeMul?: number; mechanics?: string[]; }

/** JSON-safe identity shared by the ORIGINAL cohort. Summons never inherit it. */
export interface MagicPackState { id: number; mechanic: string; size: number; fallen: number; leader?: 1; }

export function magicPackMinimum(def: MagicPackDef): number {
  return Math.max(2, ...def.rules.map(rule => (rule.nearby?.min ?? 0) + 1));
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
  return { id: p.id, mechanic: p.mechanic, size: p.size, fallen: p.fallen, ...(p.leader === 1 ? { leader: 1 as const } : {}) };
}

function active(a: Actor): boolean {
  return !!a.magicPack && !a.dead && !a.owner && a.team === 'enemy' && a.rarity === 'magic';
}

/** Called only for an actual death, after death refusal/revival gates. Quiet
 * retirement, taming, despawn and zone travel cannot manufacture casualty buffs. */
export function magicPackDeath(a: Actor, actors: readonly Actor[]): void {
  const p = a.magicPack;
  if (!p || a.owner || a.team !== 'enemy' || a.rarity !== 'magic') return;
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
      const kin = rule.nearby ? group.filter(b => b !== a && b.faction === a.faction
        && b.tier === a.tier && b.magicPack!.mechanic === p.mechanic
        && Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= rule.nearby!.radius)
        .sort((b, c) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y)
          - Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) || b.id - c.id) : [];
      if (rule.nearby && kin.length < rule.nearby.min) return 0;
      const n = rule.fallen ? Math.min(p.fallen, rule.fallen.max) : 1;
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

export function magicPackHint(a: Actor): string | undefined {
  const p = a.magicPack;
  const def = p && MAGIC_PACKS[p.mechanic];
  if (!def) return;
  const power = a.magicPackPower ?? 0;
  return `${power ? def.activeLabel + (power > 1 ? ` ×${power}` : '') : def.inactiveLabel} · ${def.hint}`;
}

/** Boot-time authoring diagnostics, shared with the regression rig. */
export function magicPackErrors(): string[] {
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
    if (id !== def.id || !integer(def.minLevel, 1) || !Number.isFinite(def.weight) || def.weight < 0
      || !def.name || !def.hint || !def.color || !def.activeLabel || !def.inactiveLabel
      || !def.rules.length) errors.push(`magicPack ${id}: invalid recipe`);
    for (const rule of def.rules) {
      if (rule.nearby && (!Number.isFinite(rule.nearby.radius) || rule.nearby.radius <= 0
        || !integer(rule.nearby.min, 1) || rule.nearby.min >= MAGIC_PACK_CFG.maxMembers))
        errors.push(`magicPack ${id}: invalid proximity gate`);
      if (rule.fallen && (!integer(rule.fallen.max, 1) || rule.fallen.max >= MAGIC_PACK_CFG.maxMembers))
        errors.push(`magicPack ${id}: invalid casualty cap`);
      if (!rule.mods.length || rule.mods.some(m => !Object.hasOwn(STAT_DEFS, m.stat) || !Number.isFinite(m.value)))
        errors.push(`magicPack ${id}: invalid modifier payload`);
    }
  }
  return errors;
}
