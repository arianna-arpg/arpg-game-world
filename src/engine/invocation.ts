import { RUNE_INFO, RUNE_OF_ELEMENT, type RuneId } from '../data/invocations';
import { conversionStat, type SkillTag } from './stats';
import { mod } from './stats';
import { effectiveSkillLevel, hostSockets, instanceBaseTags, instanceInnateMods, instanceTreeOver, makeSkillInstance,
  type SkillDef, type SkillInstance, type SkillTreeNode } from './skills';

/** Baseline schoolless spell fuel works before the first tree milestone. */
export function instanceInvocation(inst: SkillInstance) {
  return inst.def.invokes ? instanceTreeOver(inst)?.invocation : undefined;
}

/** Elemental schools retain their old precedence. Only non-attack spells
 * gain the schoolless fallback; invocation itself can never bank fuel. */
export function runeForCast(def: SkillDef, invoker: SkillInstance, bank: readonly string[]): RuneId | undefined {
  if (def.invokes) return;
  const element = ['fire', 'cold', 'lightning'].find(e => def.tags.includes(e as SkillTag));
  if (element) return RUNE_OF_ELEMENT[element];
  if (!def.tags.includes('spell') || def.tags.includes('attack') || def.tags.includes('melee') || def.tags.includes('chaos') || def.tags.includes('physical')) return;
  const alphabet = instanceInvocation(invoker)?.untypedRunes ?? ['glyph'];
  const previous = alphabet.indexOf(bank[bank.length - 1] as RuneId);
  return alphabet[(previous + 1) % alphabet.length];
}

/** One immutable release snapshot: host level/tree/supports exactly once,
 * recipe delivery/effects, closing element, and exact host provenance. */
export function makeInvocationPayload(host: SkillInstance, recipe: SkillDef, last: string): SkillInstance {
  const element = RUNE_INFO[last as RuneId]?.element;
  const tags = [...new Set([...recipe.tags, ...instanceBaseTags(host), ...(element ? [element] : [])])];
  const payload = makeSkillInstance({ ...recipe, tags, leveling: { perLevel: [] }, thresholds: undefined }, effectiveSkillLevel(host));
  payload.extraMods = [...instanceInnateMods(host)];
  if (element && element !== 'physical') payload.extraMods.push(mod(conversionStat('physical', element), 'override', 1));
  payload.sockets = hostSockets(host).map(s => ({ ...s }));
  payload.invocationHost = host;
  return payload;
}

export function invocationTreeErrors(def: SkillDef, node: SkillTreeNode): string[] {
  const spec = node.over?.invocation;
  if (!spec) return [];
  const errors: string[] = [];
  if (!def.invokes) errors.push('invocation override requires an invoking skill');
  if (Object.keys(spec).some(k => !['untypedRunes', 'damagePerRune'].includes(k))) errors.push('unknown invocation field');
  if (!Array.isArray(spec.untypedRunes) || !spec.untypedRunes.length || spec.untypedRunes.some(r => !Object.hasOwn(RUNE_INFO, r))) errors.push('invalid invocation alphabet');
  if (!Number.isFinite(spec.damagePerRune) || spec.damagePerRune < 0 || spec.damagePerRune > 1) errors.push('invalid invocation rune multiplier');
  return errors;
}
