import type { Actor } from '../engine/actor';
import { FACTIONS, MONSTERS, type MonsterDef } from '../data/monsters';
import { portraitSubjectOf, type PortraitDefLike, type PortraitSubject } from './vis/portrait';

/** Live bodies in cutaways and conversations share the same portrait source:
 * the actor's current look/color/material/adorn/tack, with def geometry. */
export function liveActorPortrait(a: Actor): PortraitSubject {
  const def = a.defId ? MONSTERS[a.defId] : undefined;
  const defLike = (d: MonsterDef): PortraitDefLike =>
    ({ ...d, demonHorns: !!FACTIONS[d.faction ?? '']?.nubHorns });
  return portraitSubjectOf({
    shape: a.shape, radius: a.radius, color: a.color,
    material: a.material, adorn: a.adorn, look: a.look,
    demonHorns: !!FACTIONS[a.faction ?? '']?.nubHorns,
    portrait: def?.portrait, worm: def?.worm, parts: def?.parts, extraParts: a.extraParts,
  }, { resolvePart: id => MONSTERS[id] ? defLike(MONSTERS[id]) : undefined });
}
