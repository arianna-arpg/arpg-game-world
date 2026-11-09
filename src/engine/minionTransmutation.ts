import type { Actor } from './actor';
import { MINION_TRANSMUTATIONS } from '../data/battleDoctrines';
import { minionBodyTags } from './skillScopes';
import type { Modifier } from './stats';

export interface TransmutationState {
  id: string;
  original: Pick<Actor, 'name' | 'look' | 'color' | 'material' | 'faction'>;
  sources: string[];
  fingerprint: string;
}
export function transmutationOf(owner: Actor, bodyId?: string) {
  return transmutationSource(owner, bodyId)?.def;
}
function transmutationSource(owner: Actor, bodyId?: string) {
  if (!bodyId) return undefined;
  const tags = minionBodyTags(bodyId);
  const seen = new Set<Actor>();
  for (let keeper: Actor | undefined = owner; keeper && !seen.has(keeper); keeper = keeper.owner) {
    seen.add(keeper);
    const def = MINION_TRANSMUTATIONS.find(d => tags.includes(`minion:${d.family}`) && keeper!.sheet.get(d.stat) > 0);
    if (def) return { def, keeper };
  }
}

/** Copy only authored personal channels, with the owner's condition evaluated
 * now and the recipient's skill tags preserved. Each original source remains
 * individually attributable; minion-only channels cannot double-dip. */
export function refreshTransmutation(body: Actor, owner: Actor): boolean {
  const source = transmutationSource(owner, body.defId), d = source?.def, old = body.transmutation;
  if (!d) {
    if (!old) return false;
    for (const key of old.sources) body.sheet.removeSource(key);
    Object.assign(body, old.original); body.transmutation = undefined;
    return true;
  }
  owner = source!.keeper;
  const eligible = (m: Modifier) => (d.personalStats.includes(m.stat) || d.personalPrefixes?.some(prefix => m.stat.startsWith(prefix)))
    && !m.tags?.some(t => t === 'minion' || t.startsWith('minion:')) && (!m.when || owner.sheet.hasCondition(m.when))
    && (!m.gauge || m.gaugeAt === undefined || owner.sheet.gauge(m.gauge) >= m.gaugeAt);
  const copy = (m: Modifier): Modifier => ({ ...m, when: undefined, gauge: undefined, gaugeAt: undefined,
    value: m.value * (!m.gauge ? 1 : m.gaugeAt !== undefined ? +(owner.sheet.gauge(m.gauge) >= m.gaugeAt) : owner.sheet.gauge(m.gauge)),
    tags: m.tags && [...m.tags] });
  // A shared aura/order already received by this body is one source, even
  // when its keeper also receives it. Personal inheritance must not clone it.
  const rows = owner.sheet.sourceNames().filter(s => !s.startsWith('transmute:') && !(s.startsWith('buff:') && body.sheet.getSourceMods(s))).map(source => ({
    source: `transmute:${d.id}:${source}`, mods: (owner.sheet.getSourceMods(source) ?? []).filter(eligible).map(copy),
  })).filter(r => r.mods.length);
  const fingerprint = JSON.stringify(rows);
  if (old?.id === d.id && old.fingerprint === fingerprint) return false;
  const original = old?.original ?? { name: body.name, look: body.look, color: body.color, material: body.material, faction: body.faction };
  for (const key of old?.sources ?? []) body.sheet.removeSource(key);
  for (const row of rows) body.sheet.setSource(row.source, row.mods);
  body.transmutation = { id: d.id, original, sources: rows.map(r => r.source), fingerprint };
  body.name = `${d.namePrefix} ${original.name}`; body.color = d.color; body.faction = d.faction; body.material = d.material;
  body.look = body.skills.some(s => s?.def.tags.includes('spell')) ? d.looks.caster
    : body.skills.some(s => s?.def.tags.includes('projectile')) ? d.looks.ranged : d.looks.melee;
  return true;
}
