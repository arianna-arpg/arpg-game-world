import { MASS_ZONE, type MassAdventure } from './preset';
import type { WorldMassRuntime, MassAdventureSave } from './runtime';
import type { SavedQuestEntry } from '../meta/worldstate';
import type { World } from '../engine/world';
import type { MassPlace } from './contracts';
import { QUESTS } from '../quests/defs';
import { massJourneyPlaceId } from './journey';
import { AMBIENT_TAGS, MONSTERS } from '../data/monsters';
import { canonical } from './random';

/** The exact original body slot owns the deed, never its species at large. */
export interface MassQuestBinding {
  quest: string;
  destination: string;
  defeat?: { kind: 'population' | 'fixture'; index: number };
}
export interface MassQuestSpec {
  source: string;
  /** Native contracts bound to existing connected places. */
  bindings: MassQuestBinding[];
}
export interface MassQuestPin { x: number; y: number; label: string; ready: boolean }

export function validateMassQuests(config: MassAdventure): void {
  const spec = config.settlement?.quests;
  if (spec === undefined) return;
  if (!spec || typeof spec.source !== 'string' || !spec.source || !Array.isArray(spec.bindings)
    || spec.bindings.length > 16 || new Set(spec.bindings.map(b => b.quest)).size !== spec.bindings.length)
    throw new Error('Invalid worldmass quest bindings');
  const destinations = [...(config.journey?.destinations ?? []), ...(config.journey?.extensions ?? []), ...(config.journey?.stops ?? [])];
  for (const b of spec.bindings) {
    const def = QUESTS[b.quest], target = destinations.find(d => d.id === b.destination);
    const content = target && config.content.find(c => c.id === target.content);
    const objective = def?.zone.objective;
    if (!def || !content?.site?.completion || def.collect || def.rescue || def.zoneVariants
      || def.geographies && !def.geographies.includes('continuous'))
      throw new Error('Unsupported worldmass quest objective or destination');
    // No partial-clear tally or borrowed success from opening the site's chest.
    if (objective.kind === 'clear' && (objective.frac ?? 1) === 1 && objective.need === undefined
      && b.defeat === undefined) continue;
    const body = objective.kind === 'boss' ? MONSTERS[objective.id] : undefined, slot = b.defeat;
    if (objective.kind !== 'boss' || objective.levelBonus !== undefined || objective.uber
      || objective.promote || objective.arenaBossRetry || !body || body.passive || body.noObjective
      || AMBIENT_TAGS.has(body.tag ?? '') || !slot || !Number.isSafeInteger(slot.index) || slot.index < 0)
      throw new Error('Unsupported worldmass quest objective or destination');
    // A fixed original slot must always seat the named native target. Variable
    // rosters, formations and promoted encounters need explicit adapters.
    const exact = slot.kind === 'fixture'
      ? content.site.fixtures[slot.index]?.garrison === true && content.site.fixtures[slot.index].monster === objective.id
      : slot.kind === 'population' && slot.index < content.count && !content.levels && !content.encounters && !content.magicPack
        && content.table.length > 0 && content.table.every(row => row.id === objective.id);
    if (!exact) throw new Error('Unsupported worldmass quest objective or destination');
  }
}
export function massQuestDestination(mass: WorldMassRuntime, quest: string): MassPlace | undefined {
  const binding = mass.config.settlement?.quests?.bindings.find(b => b.quest === quest);
  return binding ? mass.journey?.places.find(p => p.recipe === binding.destination) : undefined;
}
/** Admission captured native eligibility; a durable death of that same
 * original body completes the named deed, independently of other defenders. */
export function massQuestSatisfied(mass: WorldMassRuntime, quest: string, placeId: string): boolean {
  if (massQuestDestination(mass, quest)?.id !== placeId) return false;
  const binding = mass.config.settlement?.quests?.bindings.find(b => b.quest === quest), objective = QUESTS[quest]?.zone.objective;
  if (objective?.kind === 'clear' && !binding?.defeat) return mass.siteCleared(placeId);
  if (objective?.kind !== 'boss' || !binding?.defeat) return false;
  const slot = binding.defeat, id = slot.kind === 'fixture' ? canonical([placeId, 'fixture', slot.index]) : canonical([placeId, slot.index]);
  return mass.state.claimed('site-guardian', id) && mass.state.claimed('fallen', id);
}
/** Before the live scene exists, accept only the exact saved run's pinned
 * binding. A stale or foreign place cannot become an ordinary zone quest. */
export function validMassQuestEntry(entry: SavedQuestEntry, save: MassAdventureSave | undefined): boolean {
  if (!save || entry.zoneId !== MASS_ZONE || typeof entry.placeId !== 'string') return false;
  const bindings = save.config?.settlement?.quests?.bindings;
  const binding = Array.isArray(bindings) ? bindings.find(b => b?.quest === entry.questId) : undefined;
  return !!binding && !!save.config.journey
    && entry.placeId === massJourneyPlaceId(save.state.run.runId, save.config.journey.source, binding.destination);
}
export function massQuestTarget(mass: WorldMassRuntime, entry: SavedQuestEntry, from: { x: number; y: number }): string | undefined {
  const place = massQuestDestination(mass, entry.questId);
  if (!place || place.id !== entry.placeId) return undefined;
  const point = mass.journey!.local(place), dx = point.x - from.x, dy = point.y - from.y;
  const bearing = Math.hypot(dx, dy) <= place.radius ? 'here' : ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast']
    [(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  const name = mass.config.content.find(c => c.id === place.content)!.site!.name;
  return name + ' · Lv ' + mass.populationFor(place).level + ' · ' + bearing;
}
/** Directions identify only the named destination or a present return giver;
 * reading pins never surveys terrain, spawns bodies or completes objectives. */
export function massQuestPins(world: World): MassQuestPin[] {
  const mass = world.massRuntime;
  if (!mass) return [];
  return world.activeQuests.flatMap((entry): MassQuestPin[] => {
    if (!entry.placeId || entry.directionsKnown === false) return [];
    const place = massQuestDestination(mass, entry.questId);
    if (!place || place.id !== entry.placeId) return [];
    if (world.questStanding(entry) === 'ready') {
      const def = QUESTS[entry.questId], ids = def.turnIn?.giver ?? def.giver;
      const body = world.actors.find(a => !a.dead && a.defId && (Array.isArray(ids) ? ids : [ids]).includes(a.defId)
        && mass.settlement?.isResident(a));
      return body ? [{ ...body.pos, label: 'Return to ' + (MONSTERS[body.defId!]?.name ?? 'the giver'), ready: true }] : [];
    }
    return [{ ...mass.journey!.local(place), label: mass.config.content.find(c => c.id === place.content)!.site!.name, ready: false }];
  });
}
