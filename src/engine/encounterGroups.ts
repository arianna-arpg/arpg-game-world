import type { Vec2 } from '../core/math';
import type { Actor } from './actor';
import type { EncounterCombatSpec } from './encounterCombat';
import { mergeTuning, type BrainTuning } from './brain';
import { presenceMul, type PresenceSpec } from './presence';
import type { Modifier } from './stats';
import type { ZoneDef } from '../data/zones';
import { MONSTERS } from '../data/monsters';
import { ENCOUNTER_GROUPS, ENCOUNTER_GROUP_CFG } from '../data/encounterGroups';

export interface EncounterChoice { id: string; weight: number; presence?: PresenceSpec }
export interface EncounterMember {
  /** Stable slot identity, independent of the monster chosen for it. */
  slot: string;
  role: string;
  monster?: string;
  choices?: EncounterChoice[];
  count?: [number, number];
  presence?: PresenceSpec;
  leader?: boolean;
  /** Formation coordinates: positive forward faces the encounter's approach. */
  at: { forward: number; side: number };
  spacing?: number;
  tactics?: BrainTuning;
  mods?: Modifier[];
}
export interface EncounterGroupDef {
  id: string; name: string; description: string;
  faction: string;
  minLevel: number;
  weight: number;
  presence?: PresenceSpec;
  /** Lists are ANDed when both are present; absent axes are unrestricted. */
  habitats?: { biomes?: string[]; tilesets?: string[]; place?: 'surface' | 'cave'; stories?: [number, number] };
  members: EncounterMember[];
  tactics?: BrainTuning;
  /** Optional shared planner; omitting it preserves ordinary squad behavior. */
  encounterCombat?: EncounterCombatSpec;
  /** Maximum member distance from the requested centre after terrain seating. */
  radius?: number;
}
export type EncounterGroupSpec = false | {
  chance?: number;
  /** Explicit pool replaces the faction's default pool. [] means none. */
  table?: EncounterChoice[];
  /** Refuse oversized recipes rather than dropping their required roles. */
  maxMembers?: number;
};
export interface EncounterContext {
  level: number; faction?: string; biome?: string; tileset?: string;
  place: 'surface' | 'cave'; story: number;
}
export interface EncounterGroupState { id: number; recipe: string; slot: string; leader?: 1 }
export interface EncounterGroupSpawnOptions {
  tier?: number; facing?: number; persistent?: boolean;
  /** Explicit composition still obeys level, faction, habitat and size gates. */
  maxMembers?: number;
}
export interface EncounterSeat { monster: string; member: EncounterMember; offset: Vec2 }

export function encounterGroupContext(zone: ZoneDef, faction?: string, story = 0, level = zone.level): EncounterContext {
  return { level, faction, story, biome: zone.biome ?? zone.anchor,
    tileset: zone.tileset, place: zone.caveDepth ? 'cave' : 'surface' };
}
const range = (m: EncounterMember): [number, number] => m.count ?? [1, 1];
function choices(m: EncounterMember, level: number): EncounterChoice[] {
  return (m.monster ? [{ id: m.monster, weight: 1 }] : m.choices ?? []).filter(r => {
    const body = MONSTERS[r.id];
    return body && !body.boss && !body.passive && Number.isFinite(r.weight) && r.weight > 0
      && presenceMul(r.presence, level) > 0 && presenceMul(body.presence, level) > 0;
  }).map(r => ({ ...r, weight: r.weight * presenceMul(r.presence, level)
    * presenceMul(MONSTERS[r.id].presence, level) }));
}
function eligible(g: EncounterGroupDef, q: EncounterContext, cap: number): boolean {
  if (!Number.isFinite(q.level) || q.level < g.minLevel || presenceMul(g.presence, q.level) <= 0
    || q.faction !== g.faction
    || g.members.reduce((n,m) => n + range(m)[1], 0) > cap) return false;
  const h = g.habitats;
  if (h?.biomes && (!q.biome || !h.biomes.includes(q.biome))) return false;
  if (h?.tilesets && (!q.tileset || !h.tilesets.includes(q.tileset))) return false;
  if (h?.place && h.place !== q.place) return false;
  if (h?.stories && (q.story < h.stories[0] || q.story > h.stories[1])) return false;
  return g.members.every(m => range(m)[0] === 0 || (presenceMul(m.presence, q.level) > 0 && choices(m,q.level).length > 0));
}
const memberCap = (n?: number) => Number.isFinite(n ?? ENCOUNTER_GROUP_CFG.maxMembers)
  ? Math.max(0, Math.min(ENCOUNTER_GROUP_CFG.maxMembers, Math.floor(n ?? ENCOUNTER_GROUP_CFG.maxMembers))) : 0;
function pick<T extends { weight: number }>(rows: T[], random: () => number): T {
  let r = random() * rows.reduce((s,e) => s + e.weight, 0);
  for (const e of rows) { r -= e.weight; if (r < 0) return e; }
  return rows[rows.length - 1];
}
/** Strict filtering: an entirely gated pool stays empty, never falls back to
 * its unfiltered input. Gate checks themselves consume no random draws. */
export function encounterGroupPool(q: EncounterContext, spec?: EncounterGroupSpec): EncounterChoice[] {
  if (spec === false) return [];
  const rows: EncounterChoice[] = spec?.table ?? Object.values(ENCOUNTER_GROUPS).map(g => ({ id:g.id, weight:g.weight }));
  return rows.filter(r => {
    const g = ENCOUNTER_GROUPS[r.id];
    return g?.id === r.id && Number.isFinite(r.weight) && r.weight > 0 && presenceMul(r.presence,q.level) > 0 && eligible(g,q,memberCap(spec?.maxMembers));
  }).map(r => ({...r,weight:r.weight * presenceMul(r.presence,q.level) * presenceMul(ENCOUNTER_GROUPS[r.id].presence,q.level)}));
}
export function rollEncounterGroup(q: EncounterContext, spec?: EncounterGroupSpec, random = Math.random): string | undefined {
  if (spec === false || !Number.isFinite(spec?.chance ?? ENCOUNTER_GROUP_CFG.chance) || (spec?.chance ?? ENCOUNTER_GROUP_CFG.chance) <= 0) return;
  const rows = encounterGroupPool(q,spec);
  if (!rows.length || random() >= Math.min(1,spec?.chance ?? ENCOUNTER_GROUP_CFG.chance)) return;
  return pick(rows,random).id;
}
/** Pure composition plan. Required roles are atomic; optional slots may be
 * absent. Every alternative honors its own and its species' presence. */
export function planEncounterGroup(id: string, q: EncounterContext, cap?: number, random = Math.random): EncounterSeat[] {
  const g = ENCOUNTER_GROUPS[id];
  if (g?.id !== id || !eligible(g,q,memberCap(cap))) return [];
  const out: EncounterSeat[] = [];
  for (const m of g.members) {
    if (presenceMul(m.presence,q.level) <= 0) continue;
    const rows = choices(m,q.level);
    if (!rows.length) continue;
    const [lo,hi] = range(m), n = lo + Math.floor(random() * (hi-lo+1));
    for (let i=0;i<n;i++) out.push({monster:pick(rows,random).id,member:m,
      offset:{x:m.at.forward,y:m.at.side+(i-(n-1)/2)*(m.spacing ?? ENCOUNTER_GROUP_CFG.spacing)}});
  }
  return out.length >= 2 ? out : [];
}
export function readEncounterGroup(raw: unknown): EncounterGroupState | undefined {
  if (!raw || typeof raw !== 'object') return;
  const s = raw as EncounterGroupState;
  if (typeof s.recipe !== 'string') return;
  const g = ENCOUNTER_GROUPS[s.recipe];
  if (g?.id !== s.recipe || !Number.isSafeInteger(s.id) || s.id < 0 || typeof s.slot !== 'string') return;
  const member = g.members.find(m=>m.slot===s.slot);
  if (!member) return;
  return {id:s.id,recipe:s.recipe,slot:s.slot,...(member.leader ? {leader:1 as const} : {})};
}
export function applyEncounterGroup(a: Actor, state: EncounterGroupState): void {
  const s = readEncounterGroup(state), g = s && ENCOUNTER_GROUPS[s.recipe];
  const member = g?.members.find(m=>m.slot===s!.slot);
  if (!s || !g || !member || a.team !== 'enemy' || a.owner || a.faction !== g.faction
    || !(member.monster === a.defId || member.choices?.some(r=>r.id===a.defId))) return;
  clearEncounterGroup(a);
  a.encounterGroup = s;
  a.encounterGroupBaseBrain = a.brain;
  a.brain = {...a.brain,...mergeTuning(a.brain,g.tactics,member.tactics)};
  a.squadId = s.id; a.squadLeader = !!member.leader;
  a.sheet.setSource(`encounterGroup:${s.recipe}:${s.slot}`,member.mods ?? []);
}
export function clearEncounterGroup(a: Actor): void {
  a.encounterOrder = undefined;
  const s = a.encounterGroup;
  if (!s) return;
  a.sheet.removeSource(`encounterGroup:${s.recipe}:${s.slot}`);
  a.brain = a.encounterGroupBaseBrain;
  a.encounterGroupBaseBrain = undefined; a.encounterGroup = undefined;
  if (a.squadId === s.id) { a.squadId = undefined; a.squadLeader = undefined; }
}
export function updateEncounterGroups(actors: readonly Actor[]): void {
  for (const a of actors) if (a.encounterGroup && (a.owner || a.team !== 'enemy'
    || a.faction !== ENCOUNTER_GROUPS[a.encounterGroup.recipe]?.faction)) clearEncounterGroup(a);
}

export function encounterGroupErrors(): string[] {
  const errors:string[]=[];
  for(const [id,g] of Object.entries(ENCOUNTER_GROUPS)) {
    const say=(s:string)=>errors.push(`encounterGroup ${id}: ${s}`);
    if(g.id!==id || !Number.isFinite(g.minLevel) || g.minLevel<1 || !Number.isFinite(g.weight) || g.weight<=0) say('invalid identity/level/weight');
    if(!g.members.length || g.members.some(m=>!m.slot || !m.role) || new Set(g.members.map(m=>m.slot)).size!==g.members.length) say('slots must be nonempty and unique, with named roles');
    if(g.members.filter(m=>m.leader).length!==1) say('require exactly one leader slot');
    const max=g.members.reduce((n,m)=>n+range(m)[1],0);
    if(max<2 || max>ENCOUNTER_GROUP_CFG.maxMembers) say('member budget out of range');
    if(g.radius!==undefined && (!Number.isFinite(g.radius)||g.radius<=0)) say('invalid radius');
    if(g.habitats?.stories && (!g.habitats.stories.every(n=>Number.isInteger(n)&&n>=0) || g.habitats.stories[1]<g.habitats.stories[0])) say('invalid story range');
    for(const m of g.members) {
      const [lo,hi]=range(m);
      if(!Number.isInteger(lo)||!Number.isInteger(hi)||lo<0||hi<lo) say(`${m.slot}: invalid count`);
      if(m.leader&&(lo!==1||hi!==1)) say(`${m.slot}: leader must occur once`);
      if(!Number.isFinite(m.at.forward)||!Number.isFinite(m.at.side)) say(`${m.slot}: invalid seat`);
      if(m.spacing!==undefined && (!Number.isFinite(m.spacing)||m.spacing<=0)) say(`${m.slot}: invalid spacing`);
      if(!!m.monster===!!m.choices?.length) say(`${m.slot}: choose monster OR alternatives`);
      for(const r of m.monster?[{id:m.monster,weight:1}]:m.choices??[]) {
        const d=MONSTERS[r.id];
        if(!d || d.faction!==g.faction || d.boss || d.passive || !Number.isFinite(r.weight)||r.weight<=0) say(`${m.slot}: invalid member ${r.id}`);
      }
    }
  }
  return errors;
}

export function encounterGroupSpecErrors(spec?: EncounterGroupSpec): string[] {
  if (!spec) return [];
  const errors: string[] = [];
  if (spec.chance !== undefined && (!Number.isFinite(spec.chance) || spec.chance < 0 || spec.chance > 1)) errors.push('chance must be 0..1');
  if (spec.maxMembers !== undefined && (!Number.isInteger(spec.maxMembers) || spec.maxMembers < 2 || spec.maxMembers > ENCOUNTER_GROUP_CFG.maxMembers)) errors.push('invalid member cap');
  for (const row of spec.table ?? []) {
    if (ENCOUNTER_GROUPS[row.id]?.id !== row.id) errors.push(`unknown recipe ${row.id}`);
    if (!Number.isFinite(row.weight) || row.weight <= 0) errors.push(`invalid weight for ${row.id}`);
  }
  return errors;
}
