/** Exact pure native bar, wallet and saved-skill reconstruction. */
import {BAR_SLOTS} from './skills';
import {ABILITY_ESSENCES,ESSENCE_IDS,type EssenceId} from '../data/essences';
import {empowermentRank} from './skillEmpowerment';
import {replenishingDelivery} from './replenishment';
import {SKILLS} from '../data/skills';
import {SUPPORTS} from '../data/supports';
import {MONSTERS} from '../data/monsters';
import {makeSkillInstance,validTreeNodes,type SkillInstance,type SupportInstance,type SkillRarity} from './skills';
export function padBar(skills: (SkillInstance | null)[]): (SkillInstance | null)[] {
  const out = skills.slice(0, BAR_SLOTS);
  while (out.length < BAR_SLOTS) out.push(null);
  return out;
}

export function emptyEssences(): Record<EssenceId, number> {
  return Object.fromEntries(ESSENCE_IDS.map(id => [id, 0])) as Record<EssenceId, number>;
}

export function emptyAbilityEssences(): Record<string, number> {
  return Object.fromEntries(ABILITY_ESSENCES.map(d => [d.id, 0]));
}

export interface SavedSocket {
  supportId: string; level: number;
  /** THE KEEPER'S MARK (salvageLock): the gem refuses salvage and every
   *  salvageBulk sweep skips it. Optional → older saves load unchanged. */
  locked?: boolean;
  /** THE CUT (the support base — engine/supportbase.ts): a chassis gem's
   *  vein roll, fixed forever. Optional → older saves load unchanged. */
  rolled?: Record<string, string>;
}

export interface SavedSkill {
  empowermentRank?: number;
  skillId: string; level: number; rarity: SkillRarity;
  sockets: (SavedSocket | null)[];
  /** GRANTED (reacquired starter — worthless everywhere value is minted).
   *  Optional → older saves load unchanged. */
  granted?: boolean;
  /** THE KEEPER'S MARK (salvageLock) — see SavedSocket. */
  locked?: boolean;
  /** THE GRIMOIRE: the bestiary form this instance is attuned to (a monster
   *  def id; rebuilt tolerantly — a removed def drops the attunement). */
  attunedForm?: string;
  /** THE SKILL-MODE TREES: spent tree-node ids (M0: the one rung-1 pick).
   *  Optional → older saves load unchanged; validated on load — an id no
   *  longer on the def's tree drops with a console note. */
  treeNodes?: string[];
  replenishmentPaused?: true;
}

export function rebuildSkill(s: SavedSkill): SkillInstance | null {
  const def = SKILLS[s.skillId];
  if (!def) return null;
  const inst = makeSkillInstance(def, s.level, Math.max(1, s.sockets.length));
  inst.rarity = s.rarity;
  if (empowermentRank(s)) inst.empowermentRank = empowermentRank(s);
  if (s.granted) inst.granted = true;
  if (s.attunedForm && MONSTERS[s.attunedForm]) inst.attunedForm = s.attunedForm;
  // THE SKILL-MODE TREES: picks survive the round trip; orphans (a renamed
  // node id, a retired tree), structure breaks (a rival-branch id, a broken
  // rung chain) and over-budget tails (the level carries the bandPointsAt
  // trim) drop with a console note — the attunedForm law. An M0-era save's
  // single rung-1 pick loads as a 1-point spend, costless by construction.
  if (s.treeNodes?.length) inst.treeNodes = validTreeNodes(def, s.treeNodes, s.level, inst);
  if (s.replenishmentPaused === true && replenishingDelivery(inst)?.replenish?.toggle) inst.replenishmentPaused = true;
  if (s.locked) inst.locked = true; // the keeper's mark (salvageLock) survives
  inst.sockets = s.sockets.map(sock => {
    if (!sock) return null;
    const sd = SUPPORTS[sock.supportId];
    return sd ? ({
      def: sd, level: sock.level,
      ...(sock.locked ? { locked: true } : {}),
      ...(sock.rolled ? { rolled: { ...sock.rolled } } : {}),
    } as SupportInstance) : null;
  });
  return inst;
}
