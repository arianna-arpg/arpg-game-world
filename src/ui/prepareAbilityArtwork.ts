import type { World } from '../engine/world';
import type { SkillInstance } from '../engine/skills';
import { abilityArtworkUrl, type AbilityIconKind } from '../render/abilityArtwork';
import { ABILITY_ARTWORK_CACHE, loadAbilityArtwork } from '../render/abilityArtworkCache';

/** Prepare the actual local loadout and bag, never the whole art catalogue.
 * Active skills have first priority; the source-cache budget bounds the batch. */
export function playerAbilityArtworkUrls(world: World): string[] {
  const urls = new Set<string>();
  const add = (kind: AbilityIconKind, id: string) => {
    const url = abilityArtworkUrl(kind, id);
    if (url && urls.size < ABILITY_ARTWORK_CACHE.limit) urls.add(url);
  };
  const skill = (inst: SkillInstance) => {
    add('skill', inst.def.id);
    for (const gem of inst.sockets) if (gem) add('support', gem.def.id);
  };
  const seats = world.seats.filter(seat => seat === world.localSeat || seat.couch);
  for (const seat of seats) for (const inst of world.seatHero(seat).skills) if (inst) skill(inst);
  for (const seat of seats) {
    for (const item of seat.meta.items) {
      const gem = item.gem;
      if (gem?.kind === 'support') add('support', gem.supportId);
      else if (gem?.kind === 'skill') {
        add('skill', gem.skillId);
        for (const socket of gem.sockets) if (socket) add('support', socket.supportId);
      }
    }
    for (const inst of seat.meta.knownSkills.values()) skill(inst);
    for (const inst of seat.grantedInsts?.values() ?? []) skill(inst);
  }
  return [...urls];
}
/** Run beside world presentation. Slow/missing art must not hold entry hostage;
 * cancellation/expiry stops further scheduling and in-flight requests are shared. */
export async function preparePlayerAbilityArtwork(world: World, current: () => boolean): Promise<void> {
  const urls = playerAbilityArtworkUrls(world);
  if (!urls.length || !current()) return;
  const deadline = performance.now() + 2000;
  let next = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const workers = Array.from({ length: Math.min(urls.length, ABILITY_ARTWORK_CACHE.concurrent) }, async () => {
    while (next < urls.length && current() && performance.now() < deadline)
      await loadAbilityArtwork(urls[next++]);
  });
  try { await Promise.race([Promise.all(workers), new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]); }
  finally { clearTimeout(timer); }
}
