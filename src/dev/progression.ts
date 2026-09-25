import type { World } from '../engine/world';
import type { Account } from '../meta/account';
import { CONTAINER_DEFS, RELIQUARY_ID } from '../data/containers';
import { POWER_PROGRESSION, odysseyMilestoneKey } from '../data/powerProgression';
import { RELIQUARY_CFG } from '../data/reliquary';
import { memoryCatalog, memoryKey, type MemoryCandidate } from '../meta/memoryUnlocks';
import { QUESTS } from '../quests/defs';
import { MONSTERS } from '../data/monsters';
import { TRAINING_YARD } from '../data/trainingYard';
import { syncTrainingYard } from '../engine/trainingYard';
import { UNLOCK_CATALOG } from '../meta/unlocks';

/** Developer recipes write the same durable inputs as gameplay. They never
 * fabricate kills, quest completion, currency or campaign state. */
export interface DevProgressionDef {
  id: string;
  label: string;
  group: string;
  description: string;
  core?: boolean;
  requires?: string[];
  ledger?: Record<string, number>;
  features?: readonly string[];
  memories?: MemoryCandidate[];
}

export const devProgressionReceipt = (id: string): string => `dev_progression:${id}`;
const containerId = (id: string, rung: number): string => `container:${id}:${rung}`;

/** Rebuild from live content: new power gates, rescue services, container
 * rungs and eligible Memories join without another UI or executor case. */
export function devProgressionCatalog(): DevProgressionDef[] {
  const rows: DevProgressionDef[] = Object.entries(POWER_PROGRESSION).map(([id, def]) => ({
    id: `power:${id}`, label: def.label, group: 'Account milestones', core: true,
    description: `Record Odyssey depth ${def.odysseyStage} for account access. Individual Memories still need awakening.`,
    ledger: Object.fromEntries(Array.from({ length: def.odysseyStage }, (_, i) => [odysseyMilestoneKey(i + 1), 1])),
  }));
  const rescues = new Set<string>();
  for (const q of Object.values(QUESTS)) {
    const r = q.rescue;
    if (!r || rescues.has(r.ledger)) continue;
    rescues.add(r.ledger);
    rows.push({ id: `rescue:${r.ledger}`, label: `${MONSTERS[r.npc]?.name ?? r.npc}: rescue access`,
      group: 'Account milestones', core: true, description: `${r.message} Return to town to refresh its residents. Quest rewards remain unclaimed.`,
      ledger: { [r.ledger]: 1 }, features: r.features });
  }
  for (const feature of [TRAINING_YARD.feature]) {
    const unlock = UNLOCK_CATALOG.find(u => u.kind === 'feature' && u.payload.flag === feature);
    if (unlock) rows.push({ id: `feature:${feature}`, label: unlock.label, group: 'Town services',
      description: 'Unlock the full Lastlight practice range. In town, its targets appear immediately; elsewhere, they await your return.',
      features: [feature] });
  }
  for (const c of CONTAINER_DEFS) for (const [i, rung] of c.ladder.entries()) {
    rows.push({ id: containerId(c.id, i), label: rung.label, group: 'Containers',
      description: rung.description,
      requires: i ? [containerId(c.id, i - 1)] : rows.filter(r => r.id.startsWith('rescue:')
        && (r.features?.includes(rung.feature) || (c.dropLedger && r.ledger?.[c.dropLedger]))).map(r => r.id),
      features: [rung.feature],
      ...(i === 0 && c.dropLedger ? { ledger: { [c.dropLedger]: 1 } } : {}),
    });
  }
  rows.push({ id: 'reliquary:attunement', label: 'Reliquary Empowerment lesson', group: 'Containers',
    description: 'Expose the ordinary empowerment investments in the Vault; no ranks or currency are granted.',
    requires: [containerId(RELIQUARY_ID, 0)], ledger: { [RELIQUARY_CFG.attunement]: 1 } });
  for (const memory of memoryCatalog()) rows.push({
    id: `memory:${memoryKey(memory.kind, memory.id)}`, label: memory.name, group: 'Memory awakenings',
    description: `Discover and awaken this ${memory.kind} for the account, including its configured secondary mechanics. Does not create an item or grant levels.`,
    requires: ['power:awakening'], memories: [memory],
  });
  return rows;
}

export function devProgressionOwned(a: Account, row: DevProgressionDef,
  catalog: readonly DevProgressionDef[], visited = new Set<string>()): boolean {
  if (visited.has(row.id)) return false;
  const path = new Set(visited).add(row.id);
  return Object.entries(row.ledger ?? {}).every(([key, n]) => (a.ledger[key] ?? 0) >= n)
    && (row.features ?? []).every(flag => a.features.has(flag))
    && (row.memories ?? []).every(m => a.memorySecondary.has(memoryKey(m.kind, m.id))
      && (m.kind === 'skill' ? a.unlockedSkills : a.unlockedSupports).has(m.id))
    && (row.requires ?? []).every(id => {
      const parent = catalog.find(r => r.id === id);
      return !!parent && devProgressionOwned(a, parent, catalog, path);
    });
}

/** Resolve the whole dependency graph before writing, so bad extensions fail
 * atomically. Already-owned inputs are monotone and never replay rewards. */
export function applyDevProgression(w: World, ids: readonly string[],
  catalog = devProgressionCatalog()): { ok: boolean; message: string } {
  if (!w.seats.length || w.gameOver || w.player.dead || w.player.downed) return { ok: false, message: 'Start a living run first.' };
  if (w.clientActionHook) return { ok: false, message: 'Progression controls require the host or single-player.' };
  if (w.scene || !w.metaProgressionActive()) return { ok: false, message: 'Progression controls require a run with account progression, outside a story scene.' };
  const byId = new Map(catalog.map(r => [r.id, r])), visiting = new Set<string>(), plan = new Map<string, DevProgressionDef>();
  const visit = (id: string): boolean => {
    if (plan.has(id)) return true;
    const row = byId.get(id);
    if (!row || visiting.has(id) || Object.values(row.ledger ?? {}).some(n => !Number.isSafeInteger(n) || n < 1)) return false;
    visiting.add(id);
    for (const parent of row.requires ?? []) if (!visit(parent)) return false;
    visiting.delete(id); plan.set(id, row); return true;
  };
  if (byId.size !== catalog.length || !ids.every(visit)) return { ok: false, message: 'Invalid progression recipe or prerequisite; nothing changed.' };
  let changed = 0;
  for (const row of plan.values()) {
    if (devProgressionOwned(w.account, row, catalog)) continue;
    for (const [key, n] of Object.entries(row.ledger ?? {})) w.account.ledger[key] = Math.max(w.account.ledger[key] ?? 0, n);
    for (const flag of row.features ?? []) w.account.features.add(flag);
    for (const m of row.memories ?? []) {
      (m.kind === 'skill' ? w.account.unlockedSkills : w.account.unlockedSupports).add(m.id);
      if (m.kind === 'skill') w.account.explicitSkillUnlocks.add(m.id);
      w.account.memorySecondary.add(memoryKey(m.kind, m.id));
    }
    w.account.ledger[devProgressionReceipt(row.id)] = 1;
    changed++;
  }
  if (changed) {
    w.questRescues.reconcile();
    w.reconcileContainers(w.localSeat);
    w.recalcPlayer();
    syncTrainingYard(w);
    for (const seat of w.seats) w.markMetaDirty(seat);
    w.accountDirty = true;
  }
  return { ok: true, message: changed ? `Granted ${changed} progression step${changed === 1 ? '' : 's'} (including prerequisites). Reopen the relevant panel; return to town for residents.` : 'Already granted; nothing changed.' };
}
