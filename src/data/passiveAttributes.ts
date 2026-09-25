import { ATTRIBUTE_IDS, ATTRIBUTES } from '../engine/stats';
import { registerChoiceGroup } from './passiveChoices';

/** Attribute training tiers. Nodes reference these ordinary choice groups;
 * changing an option's payload can later add companion attributes, modifiers
 * or tradeoffs without changing allocation, stat folding or persistence. */
export const PASSIVE_ATTRIBUTE_TIERS = [
  { id: 'attribute_training', amount: 2 },
  { id: 'attribute_training_major', amount: 5 },
] as const;

for (const tier of PASSIVE_ATTRIBUTE_TIERS) registerChoiceGroup({
  id: tier.id,
  name: `Choose an Attribute (+${tier.amount})`,
  pick: 1,
  unique: 'node',
  deal: 'each',
  pathing: true,
  options: ATTRIBUTE_IDS.map(id => ({
    id, name: ATTRIBUTES[id].label,
    description: `+${tier.amount} ${ATTRIBUTES[id].label}`,
    attributes: { [id]: tier.amount },
  })),
});
