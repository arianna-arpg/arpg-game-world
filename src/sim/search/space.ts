// ---------------------------------------------------------------------------
// THE SEARCH SPACE — a build as a small genome, decoded through the real gates.
//
// The space (class × skills × supports × trees × passives × gear × level) is far
// too large to enumerate, so the search samples it, and a candidate must be a
// build a player could actually hold:
//
//   * supports come from the skill's own fit list (supportFitsInst, the socket
//     UI's function), so a misfit gem can never be proposed;
//   * tree nodes pass validTreeNodes under the gem's real Ability-point budget;
//   * passives are a real connected walk spending exactly the level's points,
//     with choice nodes dealt through the live legality rule;
//   * uniques respect their minimum item level;
//   * the decoded BuildSpec then goes through applyBuild like any other, and
//     `evaluate.ts` rejects anything that warns or that its own attributes cannot
//     cast. There is no second copy of these rules to drift.
//
// Genomes are short, JSON-safe, and fully determine the build, so one token plus
// a commit reproduces any finding.
//
// Browser-safe. Everything is derived from the live registries at call time.
// ---------------------------------------------------------------------------

import { CLASSES, PROGRESSION } from '../../data/classes';
import { choiceGroupOf, choiceLockReason, type PassiveChoiceOption } from '../../data/passiveChoices';
import { PASSIVE_ADJACENCY, PASSIVE_NODES, classStartNode } from '../../data/passives';
import { MAIN_REALM, realmOf } from '../../data/passiveRealms';
import { SKILLS } from '../../data/skills';
import { SUPPORTS } from '../../data/supports';
import { UNIQUES } from '../../data/uniques';
import { ITEM_BASES } from '../../data/itembases';
import {
  SKILL_RARITIES, makeSkillInstance, skillMaxLevel, supportFitsInst, validTreeNodes,
  type SkillRarity,
} from '../../engine/skills';
import { treeLimbs } from '../../engine/skilltree';
import { EQUIP_SLOTS, type ItemRarity } from '../../engine/items';
import type { Attributes, Modifier } from '../../engine/stats';
import { gemLevelAt, GEARED_CFG, KITTED_CFG } from '../data/builds';
import type { BuildSpec, GearSpec } from '../types';

// ------------------------------------------------------------------- genome --

export interface GenomeSkill {
  /** SKILLS id. */
  id: string;
  /** Gem levels above the band's expected gem level (the "invested" axis). */
  over?: number;
  rarity: SkillRarity;
  supports?: string[];
  /** Limb index to walk with the gem's Ability points. */
  limb?: number;
}

export interface BuildGenome {
  v: 1;
  cls: string;
  lvl: number;
  skills: GenomeSkill[];
  /** What the passive walk leans towards, beyond meeting the bar's attributes. */
  off: string;
  def: string;
  /** Worn rarity (absent = no wardrobe). */
  gear?: ItemRarity;
  /** Gear roll seed. */
  gs?: number;
  /** Named uniques worn, keyed by equip slot. */
  uniques?: Record<string, string>;
}

/** Stable identity of a genome: the same genome always hashes the same. */
export function genomeKey(g: BuildGenome): string {
  let h = 0x811c9dc5;
  const s = JSON.stringify(canonicalGenome(g));
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  let h2 = 0x9e3779b9;
  for (let i = s.length - 1; i >= 0; i--) { h2 ^= s.charCodeAt(i); h2 = Math.imul(h2, 0x85ebca6b); }
  return (h >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

export function canonicalGenome(g: BuildGenome): BuildGenome {
  const uniques = g.uniques && Object.keys(g.uniques).length
    ? Object.fromEntries(Object.entries(g.uniques).sort(([a], [b]) => (a < b ? -1 : 1))) : undefined;
  return {
    v: 1, cls: g.cls, lvl: g.lvl,
    skills: g.skills.map(s => ({
      id: s.id, rarity: s.rarity,
      ...(s.over ? { over: s.over } : {}),
      ...(s.supports?.length ? { supports: [...s.supports] } : {}),
      ...(s.limb !== undefined ? { limb: s.limb } : {}),
    })),
    off: g.off, def: g.def,
    ...(g.gear ? { gear: g.gear } : {}),
    ...(g.gs !== undefined ? { gs: g.gs } : {}),
    ...(uniques ? { uniques } : {}),
  };
}

/** One copyable token: base64url of the canonical JSON. */
export function encodeGenome(g: BuildGenome): string {
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalGenome(g)));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeGenome(token: string): BuildGenome {
  const bin = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as BuildGenome;
}

/** The factor tokens a genome expresses, for coverage and for the main-effects
 *  fit. Every value a balance question might be about has a token. */
export function factorsOf(g: BuildGenome): string[] {
  const out = [`class:${g.cls}`, `off:${g.off}`, `def:${g.def}`];
  if (g.gear) out.push(`gear:${g.gear}`);
  g.skills.forEach((s, i) => {
    out.push(`skill:${s.id}`);
    if (i === 0) out.push(`primary:${s.id}`);
    for (const sup of s.supports ?? []) out.push(`support:${sup}`);
    if (s.limb !== undefined) out.push(`limb:${s.id}#${s.limb}`);
  });
  for (const u of Object.values(g.uniques ?? {})) out.push(`unique:${u}`);
  return [...new Set(out)];
}

// --------------------------------------------------------------- the themes --

/** What a walk scores: stat → weight. Open registries: a new way to spend the
 *  tree is one row, and it joins the sampler automatically. */
export const OFFENSE_THEMES: Record<string, Record<string, number>> = {
  damage: { damage: 3, addedPhysical: 1, critMulti: 0.5 },
  speed: { attackSpeed: 3, castSpeed: 3, damage: 1 },
  crit: { critChance: 3, critMulti: 3, damage: 1 },
};
export const DEFENSE_THEMES: Record<string, Record<string, number>> = {
  life: { life: 3, lifeRegen: 1 },
  armor: { armor: 3, life: 1 },
  evasion: { evasion: 3, life: 1 },
  ward: { energyShield: 3, life: 1 },
  none: {},
};

const KIND_SCALE: Record<string, (v: number) => number> = {
  flat: v => Math.min(3, Math.abs(v) / 5),
  increased: v => Math.abs(v) * 10,
  more: v => Math.abs(v) * 20,
};

function modScore(mods: readonly Modifier[] | undefined, wants: Record<string, number>, barTags: ReadonlySet<string>): number {
  let s = 0;
  for (const m of mods ?? []) {
    const w = wants[m.stat];
    if (!w || m.value < 0) continue;
    const scale = KIND_SCALE[m.kind]?.(m.value) ?? 0;
    const tagged = m.tags?.length ? (m.tags.some(t => barTags.has(t)) ? 1 : 0.1) : 1;
    s += w * scale * tagged;
  }
  return s;
}

/** Whole-tree payload of one pick. Attribute grants score by the bar's unmet need. */
function payloadScore(
  p: { attributes?: Partial<Attributes>; mods?: Modifier[] },
  wants: Record<string, number>, barTags: ReadonlySet<string>, need: Record<string, number>,
): number {
  let s = modScore(p.mods, wants, barTags);
  for (const [a, v] of Object.entries(p.attributes ?? {})) {
    if ((need[a] ?? 0) > 0 && typeof v === 'number') s += 4 * Math.min(need[a], v);
    else if (typeof v === 'number') s += 0.05 * v;
  }
  return s;
}

/** A real walk over the live graph: allocate the frontier node whose near
 *  neighbourhood scores best, spending exactly `points`. Choice nodes take their
 *  best currently legal option. Deterministic: score, then id. */
export function walkPassives(
  classId: string, points: number,
  wants: Record<string, number>, barTags: ReadonlySet<string>, startNeed: Record<string, number>,
): { passives: string[]; choices: Record<string, string[]> } {
  const start = classStartNode(classId);
  const allocated = new Set<string>([start]);
  const picks: string[] = [];
  const choices: Record<string, string[]> = {};
  const need = { ...startNeed };

  const bestOption = (id: string): PassiveChoiceOption | null => {
    const node = PASSIVE_NODES[id];
    const group = node ? choiceGroupOf(node) : undefined;
    if (!group) return null;
    let best: PassiveChoiceOption | null = null, bestS = -1;
    for (const o of group.options) {
      if (choiceLockReason(node, o.id, choices, PASSIVE_NODES) !== null) continue;
      const s = payloadScore(o, wants, barTags, need);
      if (s > bestS) { bestS = s; best = o; }
    }
    return best;
  };
  const nodeScore = (id: string): number => {
    const node = PASSIVE_NODES[id];
    if (!node) return -1;
    if (node.choice) {
      const o = bestOption(id);
      return o ? payloadScore(o, wants, barTags, need) : -1;
    }
    return payloadScore(node, wants, barTags, need);
  };
  const usable = (id: string): boolean => {
    const node = PASSIVE_NODES[id];
    if (!node || allocated.has(id) || node.vocation) return false;
    const r = realmOf(node);
    if (r && r.id !== MAIN_REALM) return false;
    return !node.choice || bestOption(id) !== null;
  };
  /** Best score reachable within two further hops, discounted per hop. */
  const lookahead = (id: string): number => {
    let best = nodeScore(id);
    for (const a of PASSIVE_ADJACENCY[id] ?? []) {
      if (!usable(a)) continue;
      best = Math.max(best, nodeScore(a) * 0.6);
      for (const b of PASSIVE_ADJACENCY[a] ?? []) {
        if (usable(b)) best = Math.max(best, nodeScore(b) * 0.35);
      }
    }
    return best;
  };

  while (picks.length < points) {
    const frontier = new Set<string>();
    for (const at of allocated) for (const n of PASSIVE_ADJACENCY[at] ?? []) if (usable(n)) frontier.add(n);
    if (!frontier.size) break;
    let pick: string | null = null, pickS = -Infinity;
    for (const id of [...frontier].sort()) {
      const s = lookahead(id);
      if (s > pickS) { pickS = s; pick = id; }
    }
    if (!pick) break;
    allocated.add(pick);
    picks.push(pick);
    const node = PASSIVE_NODES[pick];
    const opt = node.choice ? bestOption(pick) : null;
    if (opt) choices[pick] = [opt.id];
    const grants = (opt ?? node).attributes ?? {};
    for (const [a, v] of Object.entries(grants)) {
      if (typeof v === 'number' && need[a] !== undefined) need[a] -= v;
    }
  }
  return { passives: picks, choices };
}

// ----------------------------------------------------------------- catalogs --

export const SEARCH_CFG = {
  /** Character level bands the search explores. */
  levels: [5, 10, 20, 40],
  /** Bar skills per candidate, primary included. */
  barMin: 1,
  barMax: 4,
  /** Gem levels above the expected band a candidate may invest. */
  maxOver: 2,
  /** Worn rarity ladders by band: the smallest band ≥ level wins. */
  gearByLevel: [
    { upTo: 4, rarities: ['common', 'magic'] as ItemRarity[] },
    { upTo: 9, rarities: ['magic', 'rare'] as ItemRarity[] },
    { upTo: Infinity, rarities: ['rare'] as ItemRarity[] },
  ],
  /** Named uniques a candidate may wear. */
  maxUniques: 2,
};

export interface SearchCatalog {
  classes: string[];
  /** Skills the player can obtain. */
  skills: string[];
  /** Strikers: skills that can stand as the bar's primary. */
  strikers: string[];
  offense: string[];
  defense: string[];
  /** Every unique wearable on the doll, with its slot-ready category. */
  uniques: { id: string; slots: string[]; minIlvl: number }[];
  fits: (skillId: string) => string[];
}

/** Derived from the live registries, once per call. Sorted, so the same content
 *  gives the same catalog on every machine. */
export function buildCatalog(): SearchCatalog {
  const skills = Object.values(SKILLS).filter(s => !s.noDrop).map(s => s.id).sort();
  const strikers = skills.filter(id => {
    const d = SKILLS[id];
    const t = d.tags as readonly string[];
    return t.includes('attack') || t.includes('spell') || t.includes('minion');
  });
  const enabled = EQUIP_SLOTS.filter(s => s.enabled);
  const uniques = Object.values(UNIQUES).flatMap(u => {
    const base = ITEM_BASES[u.baseId];
    if (!base || u.weight <= 0) return [];
    const slots = enabled.filter(s => s.accepts.includes(base.category)).map(s => s.id);
    return slots.length ? [{ id: u.id, slots, minIlvl: u.minIlvl ?? 0 }] : [];
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
  const fitCache = new Map<string, string[]>();
  const supportDefs = Object.values(SUPPORTS)
    .filter(s => (s.weight ?? 0) > 0 && !s.resonance)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  return {
    classes: CLASSES.map(c => c.id),
    skills, strikers,
    offense: Object.keys(OFFENSE_THEMES),
    defense: Object.keys(DEFENSE_THEMES),
    uniques,
    fits: id => {
      let f = fitCache.get(id);
      if (!f) {
        const inst = makeSkillInstance(SKILLS[id], 1, 4);
        f = supportDefs.filter(s => supportFitsInst(s, inst)).map(s => s.id);
        fitCache.set(id, f);
      }
      return f;
    },
  };
}

/** The gem rarity the band plays at (KITTED_CFG's ladder, the sockets a real
 *  character of that level plausibly holds). */
export function rarityAtLevel(level: number): SkillRarity {
  return KITTED_CFG.gemRarityByLevel.find(r => level <= r.upTo)!.rarity;
}

// ----------------------------------------------------------------- decoding --

const reqNeed = (classId: string, g: BuildGenome): Record<string, number> => {
  const cls = CLASSES.find(c => c.id === classId)!;
  const need: Record<string, number> = {};
  for (const s of g.skills) {
    for (const [a, v] of Object.entries(SKILLS[s.id]?.requirements ?? {})) {
      const have = (cls.attributes as unknown as Record<string, number>)[a] ?? 0;
      need[a] = Math.max(need[a] ?? 0, (v ?? 0) - have);
    }
  }
  return need;
};

/** Genome → BuildSpec. Pure. The result still passes through applyBuild's audits
 *  in evaluate.ts, so a bad decode warns instead of silently lying. */
export function genomeToBuild(g: BuildGenome, id: string): BuildSpec {
  const gem = gemLevelAt(g.lvl);
  const barTags = new Set<string>(g.skills.flatMap(s => (SKILLS[s.id]?.tags as readonly string[] | undefined) ?? []));
  const wants: Record<string, number> = { ...OFFENSE_THEMES[g.off], ...DEFENSE_THEMES[g.def] };
  const { passives, choices } = walkPassives(
    g.cls, PROGRESSION.passivePointsAtLevel(g.lvl), wants, barTags, reqNeed(g.cls, g),
  );
  const supportLevel = Math.max(1, Math.floor(g.lvl / KITTED_CFG.supportLevelPer));
  const skills: BuildSpec['skills'] = g.skills.map(s => {
    const def = SKILLS[s.id];
    const level = Math.min(gem + (s.over ?? 0), def ? skillMaxLevel(def) : gem);
    let treeNodes: string[] | undefined;
    if (def?.tree && s.limb !== undefined) {
      const limb = treeLimbs(def)[s.limb];
      if (limb) {
        const kept = validTreeNodes(def, limb.rungs.map(n => n.id), level, { quiet: true });
        if (kept?.length) treeNodes = kept;
      }
    }
    return {
      id: s.id, level, rarity: s.rarity,
      ...(s.supports?.length ? { supports: s.supports.map(sid => ({ id: sid, level: supportLevel })) } : {}),
      ...(treeNodes ? { treeNodes } : {}),
    };
  });
  const gear: GearSpec[] = [];
  const uniqueSlots = g.uniques ?? {};
  for (const slot of GEARED_CFG.slots) {
    if (uniqueSlots[slot]) gear.push({ slot, uniqueId: uniqueSlots[slot], ilvl: g.lvl });
    else if (g.gear) gear.push({ slot, rarity: g.gear, ilvl: g.lvl });
  }
  return {
    id, label: `search candidate ${id}`,
    classId: g.cls, level: g.lvl,
    skills,
    passives,
    ...(Object.keys(choices).length ? { choices } : {}),
    ...(gear.length ? { gear, gearSeed: g.gs ?? GEARED_CFG.gearSeed } : {}),
  };
}

// ---------------------------------------------------------------- operators --

/** A stream of pseudo-random floats. */
export type Rand = () => number;
const pick = <T>(xs: readonly T[], r: Rand): T => xs[Math.floor(r() * xs.length)];

function randomSupports(cat: SearchCatalog, skillId: string, rarity: SkillRarity, r: Rand): string[] {
  const fits = cat.fits(skillId);
  const sockets = SKILL_RARITIES[rarity].sockets;
  const count = Math.floor(r() * (sockets + 1));
  const out: string[] = [];
  for (let i = 0; i < count && fits.length; i++) {
    const s = pick(fits, r);
    if (!out.includes(s)) out.push(s);
  }
  return out;
}

function randomSkillGene(cat: SearchCatalog, id: string, level: number, r: Rand): GenomeSkill {
  const rarity = rarityAtLevel(level);
  const limbs = SKILLS[id]?.tree ? treeLimbs(SKILLS[id]).length : 0;
  return {
    id, rarity,
    ...(r() < 0.3 ? { over: 1 + Math.floor(r() * SEARCH_CFG.maxOver) } : {}),
    supports: randomSupports(cat, id, rarity, r),
    ...(limbs ? { limb: Math.floor(r() * limbs) } : {}),
  };
}

function wardrobeFor(level: number): ItemRarity[] {
  return SEARCH_CFG.gearByLevel.find(b => level <= b.upTo)!.rarities;
}

/** Fresh, unbiased candidate. */
export function randomGenome(cat: SearchCatalog, r: Rand, fixed?: Partial<Pick<BuildGenome, 'cls' | 'lvl'>>, primary?: string): BuildGenome {
  const lvl = fixed?.lvl ?? pick(SEARCH_CFG.levels, r);
  const cls = fixed?.cls ?? pick(cat.classes, r);
  const barN = SEARCH_CFG.barMin + Math.floor(r() * (SEARCH_CFG.barMax - SEARCH_CFG.barMin + 1));
  const ids = [primary ?? pick(cat.strikers, r)];
  while (ids.length < barN) {
    const s = pick(cat.skills, r);
    if (!ids.includes(s)) ids.push(s);
  }
  const g: BuildGenome = {
    v: 1, cls, lvl,
    skills: ids.map(id => randomSkillGene(cat, id, lvl, r)),
    off: pick(cat.offense, r),
    def: pick(cat.defense, r),
    gear: pick(wardrobeFor(lvl), r),
    gs: Math.floor(r() * 0x7fffffff),
  };
  if (r() < 0.35) addUnique(cat, g, r);
  return g;
}

function addUnique(cat: SearchCatalog, g: BuildGenome, r: Rand): void {
  const pool = cat.uniques.filter(u => u.minIlvl <= g.lvl);
  if (!pool.length) return;
  const u = pick(pool, r);
  const uniques = { ...(g.uniques ?? {}) };
  const slot = u.slots.find(s => !uniques[s]) ?? u.slots[0];
  if (!Object.values(uniques).includes(u.id)) uniques[slot] = u.id;
  if (Object.keys(uniques).length > SEARCH_CFG.maxUniques) delete uniques[Object.keys(uniques)[0]];
  g.uniques = uniques;
}

/** The open variation operators. One is drawn per child; several may stack. */
export const MUTATIONS: { id: string; weight: number; apply: (g: BuildGenome, cat: SearchCatalog, r: Rand) => void }[] = [
  {
    id: 'swap_support', weight: 4,
    apply: (g, cat, r) => {
      const s = pick(g.skills, r);
      const fits = cat.fits(s.id);
      if (!fits.length) return;
      const sockets = SKILL_RARITIES[s.rarity].sockets;
      const cur = [...(s.supports ?? [])];
      const next = pick(fits, r);
      if (cur.includes(next)) return;
      if (cur.length < sockets) cur.push(next);
      else cur[Math.floor(r() * cur.length)] = next;
      s.supports = cur;
    },
  },
  {
    id: 'drop_support', weight: 1,
    apply: (g, _c, r) => {
      const s = pick(g.skills, r);
      if (s.supports?.length) s.supports.splice(Math.floor(r() * s.supports.length), 1);
    },
  },
  {
    id: 'swap_skill', weight: 2,
    apply: (g, cat, r) => {
      const at = Math.floor(r() * g.skills.length);
      const id = pick(at === 0 ? cat.strikers : cat.skills, r);
      if (g.skills.some(s => s.id === id)) return;
      g.skills[at] = randomSkillGene(cat, id, g.lvl, r);
    },
  },
  {
    id: 'add_skill', weight: 1,
    apply: (g, cat, r) => {
      if (g.skills.length >= SEARCH_CFG.barMax) return;
      const id = pick(cat.skills, r);
      if (!g.skills.some(s => s.id === id)) g.skills.push(randomSkillGene(cat, id, g.lvl, r));
    },
  },
  {
    id: 'drop_skill', weight: 1,
    apply: (g, _c, r) => {
      if (g.skills.length > SEARCH_CFG.barMin) g.skills.splice(1 + Math.floor(r() * (g.skills.length - 1)), 1);
    },
  },
  {
    id: 'limb', weight: 1,
    apply: (g, _c, r) => {
      const s = pick(g.skills, r);
      const limbs = SKILLS[s.id]?.tree ? treeLimbs(SKILLS[s.id]).length : 0;
      if (limbs) s.limb = Math.floor(r() * limbs);
    },
  },
  {
    id: 'invest', weight: 1,
    apply: (g, _c, r) => {
      const s = pick(g.skills, r);
      s.over = Math.floor(r() * (SEARCH_CFG.maxOver + 1));
    },
  },
  { id: 'theme_off', weight: 1, apply: (g, cat, r) => { g.off = pick(cat.offense, r); } },
  { id: 'theme_def', weight: 1, apply: (g, cat, r) => { g.def = pick(cat.defense, r); } },
  { id: 'wardrobe', weight: 1, apply: (g, _c, r) => { g.gear = pick(wardrobeFor(g.lvl), r); g.gs = Math.floor(r() * 0x7fffffff); } },
  { id: 'unique', weight: 2, apply: (g, cat, r) => { addUnique(cat, g, r); } },
  {
    id: 'unique_off', weight: 1,
    apply: (g, _c, r) => {
      const slots = Object.keys(g.uniques ?? {});
      if (slots.length) delete g.uniques![pick(slots, r)];
    },
  },
  { id: 'class', weight: 1, apply: (g, cat, r) => { g.cls = pick(cat.classes, r); } },
];

const MUTATION_WEIGHT = MUTATIONS.reduce((s, m) => s + m.weight, 0);

/** A child: the parent with 1-3 operators applied. Never mutates the parent. */
export function mutateGenome(parent: BuildGenome, cat: SearchCatalog, r: Rand): BuildGenome {
  const g = JSON.parse(JSON.stringify(parent)) as BuildGenome;
  const count = 1 + Math.floor(r() * 3);
  for (let i = 0; i < count; i++) {
    let w = r() * MUTATION_WEIGHT;
    const m = MUTATIONS.find(x => (w -= x.weight) < 0) ?? MUTATIONS[0];
    m.apply(g, cat, r);
  }
  return canonicalGenome(g);
}

/** One-point crossover at the skill list: keeps the elite's class and band. */
export function crossGenomes(a: BuildGenome, b: BuildGenome, r: Rand): BuildGenome {
  const take = Math.max(1, Math.floor(r() * a.skills.length));
  const skills = [...a.skills.slice(0, take)];
  for (const s of b.skills) {
    if (skills.length >= SEARCH_CFG.barMax) break;
    if (!skills.some(x => x.id === s.id)) skills.push(JSON.parse(JSON.stringify(s)) as GenomeSkill);
  }
  return canonicalGenome({ ...JSON.parse(JSON.stringify(a)) as BuildGenome, skills, def: r() < 0.5 ? a.def : b.def });
}

// ----------------------------------------------------------- pairwise sampler --

/** THE COVERING SAMPLER: row `i` of a deterministic low-discrepancy design over
 *  the high-value factors. Each factor walks its own shuffled order with a stride
 *  coprime to its length, so every value recurs on a fixed cycle and pairs of
 *  factors with coprime strides sweep their product. A night is a contiguous
 *  range of row indices, the only state is the cursor, and a shard takes its
 *  stride through the rows without coordination. */
export function coveringRow(i: number, cat: SearchCatalog, catalogSeed: number): BuildGenome {
  const axis = <T>(name: string, xs: readonly T[]): T => {
    const n = xs.length;
    let h = catalogSeed;
    for (let c = 0; c < name.length; c++) h = Math.imul(h ^ name.charCodeAt(c), 0x01000193) >>> 0;
    const stride = strideFor(n, h);
    return xs[(((h % n) + i * stride) % n + n) % n];
  };
  const lvl = axis('lvl', SEARCH_CFG.levels);
  const cls = axis('cls', cat.classes);
  const primary = axis('primary', cat.strikers);
  const second = axis('second', cat.skills);
  const fits = cat.fits(primary);
  const rarity = rarityAtLevel(lvl);
  const sockets = SKILL_RARITIES[rarity].sockets;
  const supports = fits.length
    ? [...new Set(['sup0', 'sup1', 'sup2', 'sup3'].slice(0, sockets).map(k => axis(k, fits)))]
    : [];
  const limbs = SKILLS[primary]?.tree ? treeLimbs(SKILLS[primary]).length : 0;
  const skills: GenomeSkill[] = [{
    id: primary, rarity, supports,
    ...(limbs ? { limb: i % limbs } : {}),
  }];
  if (second !== primary) skills.push({ id: second, rarity });
  const uniquePool = cat.uniques.filter(u => u.minIlvl <= lvl);
  const useUnique = axis('uniqueOn', [false, true, false]);
  const unique = useUnique && uniquePool.length ? axis('unique', uniquePool) : null;
  return canonicalGenome({
    v: 1, cls, lvl, skills,
    off: axis('off', cat.offense),
    def: axis('def', cat.defense),
    gear: axis('gear', wardrobeFor(lvl)),
    gs: (Math.imul(i + 1, 0x9e3779b1) >>> 0) & 0x7fffffff,
    ...(unique ? { uniques: { [unique.slots[0]]: unique.id } } : {}),
  });
}

function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }

/** A stride coprime to n, away from the trivial ±1. */
function strideFor(n: number, hash: number): number {
  if (n <= 2) return 1;
  let s = 2 + (hash % (n - 2));
  while (gcd(s, n) !== 1) s = s + 1 < n ? s + 1 : 2;
  return s;
}
