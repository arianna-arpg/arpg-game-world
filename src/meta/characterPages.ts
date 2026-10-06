import type { CharacterSave } from './character';
import type { NativePageRef, NativePageStorage } from './browserNativePages';
import type { NativeCohortLease, NativeCohortPage } from '../worldmass/nativePaging';
import type { MassAdventureSave } from '../worldmass/runtime';
import type { MassDormancySave } from '../worldmass/dormancy';
import { canonical } from '../worldmass/random';

/** This is a transport envelope, never a new CharacterSave schema. The game's
 * one BrowserRunStore slot owns its commit and previous revision. Portable and
 * native-file saves are expanded back to the existing inline format. */
export interface CharacterPageEntry { ref: NativePageRef; ids: string[]; positions: {x:number;y:number}[] }
export interface CharacterPagesEnvelope {
  characterPages: 1; character: CharacterSave; pages: CharacterPageEntry[]; order: string[];
}
export interface CharacterNativePage {
  characterNativePage: 1; configHash: string; cohort: NativeCohortPage;
  enemies: MassAdventureSave['enemies'];
}
export const hasCharacterPages = (value: unknown): value is CharacterPagesEnvelope =>
  !!value && typeof value === 'object' && 'characterPages' in value;
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
function reject(): never { throw Error('Invalid character native page transport'); }

/** Retain the exact codec for selected native owners and remove unused shared
 * dictionary entries. No mutable field is re-derived from its species. */
export function selectNativeCheckpoint(saved: MassDormancySave, ids: ReadonlySet<string>): MassDormancySave {
  const out: MassDormancySave = { schema: 1, clock: saved.clock, playerId: saved.playerId,
    dictionary: [], nodeDictionary: [], identities: saved.identities.filter(r => ids.has(r.id)).map(copy),
    actors: [], sleeping: saved.sleeping.filter(id => ids.has(id)), unsupported: saved.unsupported.filter(id => ids.has(id)) };
  const entries = new Map<number, number>(), nodes = new Map<number, number>();
  for (const row of saved.actors) if (ids.has(row.id)) {
    if (row.state.version !== 2 || !Array.isArray(row.state.nodes)) reject();
    const state = { ...copy(row.state), nodes: row.state.nodes.map(old => {
      if (nodes.has(old)) return nodes.get(old)!;
      const n = saved.nodeDictionary[old]; if (!Number.isSafeInteger(old) || old < 0 || !n) reject();
      const node = { kind: n.kind, entries: n.entries.map(i => {
        if (entries.has(i)) return entries.get(i)!;
        if (!Number.isSafeInteger(i) || i < 0 || !saved.dictionary[i]) reject();
        const index = out.dictionary.length; out.dictionary.push(copy(saved.dictionary[i])); entries.set(i,index); return index;
      }) };
      const index = out.nodeDictionary.length; out.nodeDictionary.push(node); nodes.set(old,index); return index;
    }) };
    out.actors.push({ ...copy(row), state });
  }
  return out;
}

export function characterNativePage(save: CharacterSave, lease: NativeCohortLease): CharacterNativePage {
  const mass = save.world?.worldmass, cohort = JSON.parse(lease.body) as NativeCohortPage;
  if (!mass?.dormancy || cohort.run !== mass.state.run.runId || cohort.addressSpan !== mass.config.terrain.addressSpan
    || canonical(cohort.frame) !== canonical(mass.origin) || canonical(cohort.policy) !== canonical(mass.config.dormancy)
    || new Set(lease.ids).size !== lease.ids.length || canonical(cohort.bodies.map(b=>b.id)) !== canonical(lease.ids)) reject();
  const ids = new Set(lease.ids), enemies = mass.enemies.filter(e=>ids.has(e.id));
  if (enemies.length !== ids.size || enemies.some(e=>!mass.dormancy!.sleeping.includes(e.id)
    || !cohort.bodies.some(b=>b.id===e.id && b.monster===e.monster && b.level===e.level))) reject();
  return { characterNativePage: 1, configHash: mass.configHash, cohort, enemies: copy(enemies) };
}

/** Never leave selected native state in the cached root; its immutable page is
 * the sole copy there. Metadata retains the native creation order. */
export function encodeCharacterPages(save: CharacterSave, pages: readonly CharacterPageEntry[], order: readonly string[]): string {
  if (!pages.length) return JSON.stringify(save);
  const character = copy(save), mass = character.world?.worldmass;
  if (!mass?.dormancy) reject();
  const paged = new Set(pages.flatMap(p=>p.ids));
  if (paged.size !== pages.reduce((n,p)=>n+p.ids.length,0) || pages.some(p=>p.ref.run!==mass.state.run.runId)) reject();
  const kept = new Set(mass.enemies.filter(e=>!paged.has(e.id)).map(e=>e.id));
  mass.enemies = mass.enemies.filter(e=>kept.has(e.id));
  mass.dormancy = selectNativeCheckpoint(mass.dormancy,kept);
  const all = new Set([...kept,...paged]);
  const exactOrder = [...order.filter(id=>all.has(id)), ...[...all].filter(id=>!order.includes(id))];
  if (new Set(exactOrder).size!==all.size || exactOrder.length!==all.size) reject();
  return JSON.stringify({ characterPages: 1, character, pages: [...pages], order: exactOrder } satisfies CharacterPagesEnvelope);
}

export async function readCharacterNativePage(storage: Pick<NativePageStorage,'readPage'>, entry: CharacterPageEntry): Promise<CharacterNativePage> {
  const data = JSON.parse(await storage.readPage(entry.ref)) as CharacterNativePage;
  const c = data?.cohort;
  if (data?.characterNativePage!==1 || !c || c.schema!==1 || c.run!==entry.ref.run || c.page!==entry.ref.page
    || !Array.isArray(data.enemies) || !Array.isArray(c.bodies) || !c.checkpoint || !Array.isArray(entry.ids)
    || !Array.isArray(entry.positions) || entry.positions.length!==entry.ids.length
    || entry.positions.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))
    || entry.ids.length<1 || entry.ids.length>96 || new Set(entry.ids).size!==entry.ids.length
    || canonical(data.enemies.map(e=>e.id).sort())!==canonical([...entry.ids].sort())
    || canonical(c.bodies.map(b=>b.id).sort())!==canonical([...entry.ids].sort())
    || canonical(c.checkpoint.identities.map(r=>r.id).sort())!==canonical([...entry.ids].sort())
    || canonical(c.checkpoint.actors.map(r=>r.id).sort())!==canonical([...entry.ids].sort())
    || canonical([...c.checkpoint.sleeping].sort())!==canonical([...entry.ids].sort())
    || c.checkpoint.unsupported.length
    || data.enemies.some(e=>!entry.ids.some((id,i)=>id===e.id&&entry.positions[i].x===e.x&&entry.positions[i].y===e.y))) reject();
  return data;
}

/** Expand transport only at the existing async Continue/export seam. No Actor
 * factory is called here. The native runtime still owns the subsequent restore.
 * Imported and native-file slots never depend on a browser database. */
export async function decodeCharacterPages(value: unknown, storage: Pick<NativePageStorage,'readPage'>): Promise<CharacterSave> {
  if (!hasCharacterPages(value)) return value as CharacterSave;
  if (value.characterPages!==1 || !Array.isArray(value.pages) || !value.pages.length || !Array.isArray(value.order)) reject();
  const save = copy(value.character), mass = save.world?.worldmass;
  if (!mass?.dormancy || !Array.isArray(mass.enemies)) reject();
  const target = mass.dormancy, known = new Set(mass.enemies.map(e=>e.id));
  const actorIds = new Set([target.playerId,...target.identities.map(r=>r.actorId)]);
  const squadIds = new Set(target.identities.flatMap(r=>r.squadId===undefined?[]:[r.squadId]));
  let nextActor = Math.max(0,...actorIds)+1, nextSquad = Math.max(0,...squadIds)+1;
  const refKeys = new Set<string>();
  for (const entry of value.pages) {
    if (!entry?.ref || refKeys.has(entry.ref.page) || entry.ref.run!==mass.state.run.runId) reject();
    refKeys.add(entry.ref.page);
    const page = await readCharacterNativePage(storage,entry), c = page.cohort, from = c.checkpoint;
    if (page.configHash!==mass.configHash || c.addressSpan!==mass.config.terrain.addressSpan
      || canonical(c.frame)!==canonical(mass.origin) || canonical(c.policy)!==canonical(mass.config.dormancy)
      || entry.ids.some(id=>known.has(id))) reject();
    for (const id of entry.ids) known.add(id);
    // Page-local actor IDs may come from different residency lifetimes. Give
    // every page a disjoint saved identity namespace before the native decoder.
    const actors = new Map<number,number>([[from.playerId,target.playerId]]), squads = new Map<number,number>();
    for (const row of from.identities) {
      if (actors.has(row.actorId) || !Number.isSafeInteger(nextActor)) reject();
      actors.set(row.actorId,nextActor++);
      if (row.squadId!==undefined && !squads.has(row.squadId)) squads.set(row.squadId,nextSquad++);
    }
    const remap = (v: MassDormancySave['dictionary'][number][number]): typeof v => {
      if (!v || typeof v!=='object') return v;
      if ('actor' in v) { const id=actors.get(v.actor); if(id===undefined)reject(); return {actor:id}; }
      if ('entity' in v) return {entity:actors.get(v.entity)??0};
      if ('squad' in v) { const id=squads.get(v.squad); if(id===undefined)reject(); return {squad:id}; }
      return v;
    };
    const compact = selectNativeCheckpoint(from,new Set(entry.ids)), entryOffset=target.dictionary.length,nodeOffset=target.nodeDictionary.length;
    target.dictionary.push(...compact.dictionary.map(pair=>pair.map(remap) as typeof pair));
    target.nodeDictionary.push(...compact.nodeDictionary.map(n=>({...n,entries:n.entries.map(i=>i+entryOffset)})));
    const identity = (r: MassDormancySave['identities'][number])=>({...r,actorId:actors.get(r.actorId)!,
      ...(r.squadId===undefined?{}:{squadId:squads.get(r.squadId)!})});
    target.identities.push(...compact.identities.map(identity));
    target.actors.push(...compact.actors.map(r=>({...identity(r),state:{...r.state,root:remap(r.state.root),nodes:r.state.nodes.map(i=>i+nodeOffset)}})));
    target.sleeping.push(...compact.sleeping);
    mass.enemies.push(...page.enemies.map(e=>({...e,
      ...(e.magicPack?{magicPack:{...e.magicPack,id:squads.get(e.magicPack.id)??reject()}}:{}),
      ...(e.encounterGroup?{encounterGroup:{...e.encounterGroup,id:squads.get(e.encounterGroup.id)??reject()}}:{})})));
  }
  if (new Set(value.order).size!==known.size || value.order.length!==known.size || value.order.some(id=>!known.has(id))) reject();
  const rank = new Map(value.order.map((id,i)=>[id,i]));
  mass.enemies.sort((a,b)=>rank.get(a.id)!-rank.get(b.id)!);
  target.identities.sort((a,b)=>rank.get(a.id)!-rank.get(b.id)!);
  target.actors.sort((a,b)=>rank.get(a.id)!-rank.get(b.id)!);
  target.sleeping.sort((a,b)=>rank.get(a)!-rank.get(b)!);
  return save;
}
