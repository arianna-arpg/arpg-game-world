/** Run-long zone contents. Values are copied at capture: saved loot must not
 *  alias an item later picked up, sold, socketed or moved in the inventory. */
import type { Chest, GemDrop, World } from './world';
import type { ItemInstance, GemPayload } from './items';
import { packSkillGemPayload, packSupportGemPayload, skillOfGemItem, supportOfGemItem, rebuildAnyItem } from './gemitems';
import { SHRINES, ALTARS } from '../data/shrines';
import { VESTIGES } from '../data/vestiges';
import { ESSENCES } from '../data/essences';

export const ZONE_MEMORY_CFG = {
  /** Infinity = until an explicit reset. Uses game time when made finite. */
  ttl: Infinity,
  rememberSafeZones: true,
};
type SavedDropItem = Exclude<GemDrop['item'], { kind: 'skill' | 'support' }>
  | { kind: 'gem'; gem: GemPayload; locked?: boolean };
export interface ZoneContents {
  chests: Chest[];
  shrines: { pos: { x: number; y: number }; id: string; used: boolean }[];
  altars: { pos: { x: number; y: number }; id: string; tier?: number; objective?: boolean }[];
  drops: (Omit<GemDrop, 'item'> & { item: SavedDropItem })[];
}
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export function captureZoneContents(w: World): ZoneContents {
  return copy({
    chests: w.chests,
    shrines: w.shrines.map(s => ({ pos: s.pos, id: s.def.id, used: s.used })),
    altars: w.altars.map(a => ({ pos: a.pos, id: a.def.id, tier: a.tier, objective: a.objective })),
    drops: w.drops.map(d => ({ ...d, item: d.item.kind === 'skill'
      ? { kind: 'gem' as const, gem: packSkillGemPayload(d.item.inst), locked: d.item.inst.locked }
      : d.item.kind === 'support'
        ? { kind: 'gem' as const, gem: packSupportGemPayload(d.item.gem), locked: d.item.gem.locked }
        : d.item })),
  });
}

/** Reject malformed containers; each consumer validates its registry ids.
 *  Missing data denotes a pre-contents save, never an empty visited zone. */
export function savedZoneContents(raw: unknown): ZoneContents | undefined {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as ZoneContents;
  if (![r.chests, r.shrines, r.altars, r.drops].every(Array.isArray)) return;
  return copy(r);
}
const positioned = (v: { pos?: { x?: number; y?: number } } | null | undefined): boolean =>
  !!v?.pos && Number.isFinite(v.pos.x) && Number.isFinite(v.pos.y);

export function restoreZoneContents(w: World, saved: ZoneContents): void {
  const c = copy(saved);
  w.chests = c.chests.filter(s => positioned(s) && ['objective', 'timed'].includes(s.kind)
    && Number.isFinite(s.lockTime) && Number.isFinite(s.maxLock));
  w.shrines = c.shrines.flatMap(s => {
    const def = s && SHRINES.find(d => d.id === s.id);
    return positioned(s) && def ? [{ pos: s.pos, def, used: !!s.used }] : [];
  });
  w.altars = c.altars.flatMap(a => {
    const def = a && ALTARS.find(d => d.id === a.id);
    return positioned(a) && def ? [{ pos: a.pos, def, tier: a.tier, objective: a.objective, affected: new Set<number>() }] : [];
  });
  w.drops = c.drops.flatMap(d => {
    if (!positioned(d) || !d.item) return [];
    const it = d.item;
    let item: GemDrop['item'] | null = null;
    try {
      if (it.kind === 'gem') {
        const wrapper = { gem: it.gem, locked: it.locked } as ItemInstance;
        if (it.gem?.kind === 'skill') { const inst = skillOfGemItem(wrapper); if (inst) item = { kind: 'skill', inst }; }
        else if (it.gem?.kind === 'support') { const gem = supportOfGemItem(wrapper); if (gem) item = { kind: 'support', gem }; }
      } else if (it.kind === 'gear') {
        const gear = rebuildAnyItem(it.item); if (gear) item = { kind: 'gear', item: gear };
      } else if (it.kind === 'vestige' && VESTIGES[it.id] && it.count > 0) item = it;
      else if (it.kind === 'essence' && ESSENCES[it.essence] && it.count > 0) item = it;
      else if (it.kind === 'abilityEssence' && Number.isFinite(it.tier) && it.tier >= 1 && it.count > 0) item = it;
    } catch { /* Invalid saved loot is refused, never regenerated as a new reward. */ }
    return item ? [{ ...d, bob: Number.isFinite(d.bob) ? d.bob : 0, item }] : [];
  });
}
