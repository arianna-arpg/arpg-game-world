import type { Actor } from './actor';
import { ATTRIBUTES, STAT_DEFS, type AttributeId, type Modifier, type SkillTag } from './stats';

export interface AttributeBequest {
  id: string;
  name: string;
  attributes: AttributeId[];
  recipients: 'minions' | 'companions' | 'both';
  maxShare?: number;
}
export const ATTRIBUTE_BEQUESTS: Record<string, AttributeBequest> = {};
export const ATTRIBUTE_BEQUEST_IDS: string[] = [];
export const bequestStat = (id: string): string => `bequest_${id}`;
export function registerAttributeBequest(def: AttributeBequest): void {
  if (!ATTRIBUTE_BEQUESTS[def.id]) ATTRIBUTE_BEQUEST_IDS.push(def.id);
  ATTRIBUTE_BEQUESTS[def.id] = def;
  STAT_DEFS[bequestStat(def.id)] = { label: def.name, base: 0, min: 0, percent: true };
}

/** Shares the owner's ORIGINAL attribute benefits, never an inherited source.
 * No recursive owner traversal, no compounding on rebakes; throngs pay their
 * normal batch divisor once. Recipients keep their native attribute source. */
export function syncAttributeBequests(recipient: Actor, scale = 1, tags?: Set<SkillTag>, extra?: Modifier[]): void {
  const owner = recipient.owner;
  const armed = owner?.sheet.armedFamily('bequest_', ATTRIBUTE_BEQUEST_IDS, extra);
  if (!armed?.length && !recipient.bequestSignature) return;
  const mods: Modifier[] = [];
  const signature: string[] = [];
  if (owner && !owner.dead && owner.attributeValues && recipient.team === owner.team) {
    for (const id of armed ?? []) {
      const def = ATTRIBUTE_BEQUESTS[id];
      if (def.recipients === 'companions' && !recipient.companion) continue;
      if (def.recipients === 'minions' && recipient.companion) continue;
      const share = Math.min(def.maxShare ?? 1, Math.max(0, owner.sheet.get(bequestStat(def.id), tags, extra))) * scale;
      if (share <= 0) continue;
      for (const attr of def.attributes) {
        const points = (owner.attributeValues[attr] ?? 0) * share;
        if (points <= 0) continue;
        signature.push(`${def.id}:${attr}:${points}`);
        for (const m of ATTRIBUTES[attr].perPoint) mods.push({ ...m, value: m.value * points });
      }
    }
  }
  const key = signature.join('|');
  if ((recipient.bequestSignature ?? '') === key) return;
  recipient.bequestSignature = key || undefined;
  if (mods.length) recipient.sheet.setSource('bequest', mods);
  else recipient.sheet.removeSource('bequest');
  recipient.life = Math.min(recipient.life, recipient.maxLife());
  recipient.mana = Math.min(recipient.mana, recipient.maxMana());
}
