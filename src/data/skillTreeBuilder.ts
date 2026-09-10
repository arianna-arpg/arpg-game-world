import type { SkillTreeNode, SkillTreeSpec } from '../engine/skills';
import { mod, type Modifier } from '../engine/stats';
export type Node = Omit<SkillTreeNode, 'links' | 'excludes' | 'x' | 'y'>;
export type Limb = [Node, [Node, Node, Node], [Node, Node, Node]];
/** Shared binary anatomy: only trunks exclude. Descendants add to the chosen
 * identity, so sibling routes can be mixed without last-pick-wins overrides. */
export function tree(left: Limb, right: Limb, passive: Node): SkillTreeSpec {
  const nodes: SkillTreeNode[] = [{ ...passive, ranks: 4, description: passive.description + ' Bonuses apply per rank; up to 4 ranks.', x: 0, y: 150 }];
  for (const [side, limb, other] of [[-1, left, right], [1, right, left]] as const) {
    nodes.push({ ...limb[0], kind: 'keystone', excludes: [other[0].id], x: side * 170, y: -50 });
    [limb[1], limb[2]].forEach(([fork, ...leaves], i) => {
      const y = i === 0 ? -230 : 170;
      nodes.push({ ...fork, links: [limb[0].id], kind: 'major', x: side * 370, y });
      leaves.forEach((leaf, j) => nodes.push({ ...leaf, links: [fork.id],
        x: side * 570, y: y + (j === 0 ? -85 : 85) }));
    });
  }
  return { level: 5, nodes };
}
export const n = (id: string, name: string, description: string, mods?: Modifier[], over?: Node['over']): Node => ({ id, name, description, mods, over });
export const life = (v: number) => mod('minionLife', 'increased', v);
export const damage = (v: number) => mod('minionDamage', 'increased', v);
export const cap = (v: number) => mod('minionMaxCount', 'flat', v);
export const count = (v: number) => mod('summonCount', 'flat', v);
export const haste = (v: number) => mod('minionHaste', 'increased', v);
export const speed = (v: number) => mod('minionMoveSpeed', 'increased', v);
export const size = (v: number) => mod('minionSize', 'increased', v);
export const dr = (v: number) => mod('minionDamageTaken', 'more', -v);
export const body = (...crewMods: Modifier[]): Node['over'] => ({ summon: { crewMods } });
export const kit = (...crewSkills: string[]): Node['over'] => ({ summon: { crewSkills } });
export const aura = (...crewAuras: string[]): Node['over'] => ({ summon: { crewAuras } });
export const element = (id: string): Node['over'] => ({ summon: { selectPool: [id] } });
