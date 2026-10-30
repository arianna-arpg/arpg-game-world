import { Rng } from '../core/rng';
import { compileLocale, localeSeed, type LocalePlan } from './locales';
import { localeProgram } from './locales';

export const GENERATION_DIVERSITY = { candidates: 16, regionCell: 950 };
/** Order-invariant rooted graph descriptor. IDs and drawing orientation carry no novelty. */
export function graphProfile(ids: string[], links: { from: string; to: string }[], entrance: string, goal?: string): string {
  const neighbors = new Map(ids.map(id => [id, links.flatMap(l => l.from === id ? [l.to] : l.to === id ? [l.from] : [])]));
  const depth = new Map([[entrance, 0]]), queue = [entrance];
  for (let i = 0; i < queue.length; i++) for (const n of neighbors.get(queue[i]) ?? []) if (!depth.has(n)) {
    depth.set(n, depth.get(queue[i])! + 1); queue.push(n);
  }
  return [ids.length, links.length - ids.length + 1, goal ? depth.get(goal) : '-',
    ids.map(id => [neighbors.get(id)!.length, depth.get(id), id === entrance ? 'entry' : id === goal ? 'goal' : ''].join(':')).sort().join(',')].join('/');
}
/** Canonicalize rectangular fragment terrain over rotations and reflections. */
export function fragmentShape(cells: string[][]): string {
  const signatures: string[] = [];
  for (const mirror of [false, true]) {
    let rows = cells.map(r => mirror ? [...r].reverse() : [...r]);
    for (let turn = 0; turn < 4; turn++) {
      signatures.push(JSON.stringify(rows));
      rows = rows[0].map((_, x) => rows.map(r => r[x]).reverse());
    }
  }
  return signatures.sort()[0];
}
export function localeShape(plan: LocalePlan): { graph: string; motifs: string[] } {
  return { graph: graphProfile(plan.districts.map(d => d.id), plan.links, plan.entrance, plan.goal),
    motifs: plan.districts.map(d => [d.builder, Object.entries(d.params ?? {}).filter(([k]) => k !== 'rotation' && k !== 'bearing').sort().map(([k, v]) => k + ':' + v).join(','),
      d.fragment ? fragmentShape(d.fragment.cells) : '', d.cave ? 'cave' : '', d.region ?? ''].join('/')).concat(plan.river ? ['river'] : [], plan.underTier ? ['covered:' + plan.underTier] : []).sort() };
}
export function localeDifference(a: LocalePlan, b: LocalePlan): number {
  const x = localeShape(a), y = localeShape(b), remaining = [...y.motifs];
  let shared = 0;
  for (const motif of x.motifs) { const i = remaining.indexOf(motif); if (i >= 0) { shared++; remaining.splice(i, 1); } }
  return (x.graph === y.graph ? 0 : 0.6) + 0.4 * (1 - 2 * shared / (x.motifs.length + y.motifs.length));
}
/** Cover each eligible route grammar before repeating candidates. A random
 * handful can miss the only unused topology even when the catalogue has it.
 * Geometry remains seeded; only siblings participate, never player history. */
export function distinctLocale(programs: string[], seed: number, siblings: LocalePlan[]): LocalePlan {
  const rng = new Rng(localeSeed(seed + '/routes'));
  const routes = programs.flatMap(id => {
    const program = localeProgram(id);
    if (!program) throw new Error(`unknown locale candidate ${id}`);
    return program.variants.filter(v => v.weight > 0).map(v => ({ program, variant: v.id,
      // Weighted order breaks equal structural scores while still considering
      // every route. A rare route cannot disappear from the diversity search.
      order: -Math.log(Math.max(Number.EPSILON, rng.next())) / v.weight }));
  }).sort((a, b) => a.order - b.order);
  if (!routes.length) throw new Error('locale candidates need a positive-weight route');
  let best: LocalePlan | undefined, score = -1;
  for (let i = 0; i < Math.max(GENERATION_DIVERSITY.candidates, routes.length); i++) {
    const route = routes[i % routes.length];
    const candidate = compileLocale(route.program, localeSeed(seed + '/terrain/' + i), route.variant);
    const value = siblings.length ? Math.min(...siblings.map(p => localeDifference(candidate, p))) : 1;
    if (value > score) { best = candidate; score = value; }
  }
  return best!;
}
/** Graph forms repeat on a spatial lattice, with a world/family permutation.
 * Adjacent cells differ, including negatives and block seams. Sparse sites and
 * sites in the same cell can share a form; this is not a global uniqueness claim. */
export function spatialFormIndex(seed: number, family: string, x: number, y: number, count: number): number {
  if (!Number.isInteger(count) || count < 1) throw new Error('positive form count required');
  const deck = Array.from({ length: count }, (_, i) => i), rng = new Rng(localeSeed(seed + '/' + family + '/forms'));
  for (let i = deck.length - 1; i > 0; i--) { const j = rng.int(0, i); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const mod = (n: number, d: number) => ((n % d) + d) % d;
  const cx = Math.floor(x / GENERATION_DIVERSITY.regionCell), cy = Math.floor(y / GENERATION_DIVERSITY.regionCell);
  return deck[mod(cx + Math.max(1, Math.floor(count / 2)) * cy, count)];
}
