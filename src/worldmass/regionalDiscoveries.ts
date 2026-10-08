import { address, floorDiv, localOffset, moveAddress, type MassCell } from './address';
import type { MassPlace, MassSpec } from './contracts';
import type { MassGenerator } from './generator';
import type { MassLandformPlan } from './landforms';
import { canonical, freezeData, massRandom } from './random';
import { regionalCourtRadius } from './regionalCourtShapes';

/** Saved content vocabulary, independent of the terrain's shape/random cursor. */
export interface RegionalDiscoverySpec {
  source: string; version: 1; chance: number;
  count: readonly [number, number]; clearance: number; separation: number;
  choices: readonly { content: string; radius: number; weight: number }[];
}
export interface RegionalDiscoverySocket {
  formation: string; court: number; layer: 'court' | 'motif'; feature?: string;
}
export interface RegionalDiscoveryPlace extends MassPlace { regionalSocket: RegionalDiscoverySocket }

export function validateRegionalDiscoveries(spec: MassSpec): void {
  if (!Object.hasOwn(spec, 'regionalDiscoveries')) return;
  const p = spec.regionalDiscoveries;
  if (!p || !spec.landforms?.regional?.composition || p.version !== 1
    || typeof p.source !== 'string' || !p.source || p.source.length > 256
    || !Number.isFinite(p.chance) || p.chance < 0 || p.chance > 1
    || !Array.isArray(p.count) || p.count.length !== 2
    || p.count.some(n => !Number.isSafeInteger(n) || n < 0 || n > 4) || p.count[0] > p.count[1]
    || !Number.isFinite(p.clearance) || p.clearance < 90 || p.clearance > 240
    || !Number.isFinite(p.separation) || p.separation < 90 || p.separation > 600
    || !Array.isArray(p.choices) || !p.choices.length || p.choices.length > 32
    || p.choices.some(c => !c || typeof c.content !== 'string' || !c.content || c.content.length > 256
      || !Number.isFinite(c.radius) || c.radius < 90 || c.radius > 400
      || !Number.isFinite(c.weight) || c.weight <= 0 || c.weight > 100)
    || new Set(p.choices.map(c => c.content)).size !== p.choices.length)
    throw Error('Invalid regional discovery policy');
}

/** A complete site AND its bypass must fit the final floor, after site holes
 * and whole child motifs. This planner never paints/carves terrain to make room. */
export function generateRegionalDiscoveries(plan: Readonly<MassLandformPlan>, policy: RegionalDiscoverySpec,
  seed: number, span: number): readonly RegionalDiscoveryPlace[] {
  const graph = plan.shape.grammar, cell = 30, rows = plan.shape.rows;
  if (!graph || plan.turn || plan.mirror) return Object.freeze([]);
  const rng = massRandom(seed, [policy.source, policy.version, plan.id, 'discoveries']);
  if (!rng.chance(policy.chance)) return Object.freeze([]);
  const target = rng.int(...policy.count), result: RegionalDiscoveryPlace[] = [];
  const courts = graph.nodes.map((node, index) => ({ node, index, rank: rng.next() })).sort((a,b) => a.rank-b.rank || a.index-b.index);
  const floorFits = (x: number, y: number, radius: number): boolean => {
    for (let iy = Math.floor((y-radius)/cell); iy <= Math.floor((y+radius)/cell); iy++)
      for (let ix = Math.floor((x-radius)/cell); ix <= Math.floor((x+radius)/cell); ix++) {
        const dx = Math.max(ix*cell-x, 0, x-(ix+1)*cell), dy = Math.max(iy*cell-y, 0, y-(iy+1)*cell);
        if (dx*dx+dy*dy <= radius*radius && rows[iy]?.[ix] !== 'g') return false;
      }
    return true;
  };
  for (const {node, index} of courts) {
    if (result.length >= target) break;
    // Weighted order without replacement; a large puzzle that cannot fit does
    // not suppress a smaller shrine. No repeated content within one formation.
    const choices = policy.choices.filter(c => !result.some(p => p.content === c.content));
    while (choices.length) {
      const choice = rng.weighted(choices); choices.splice(choices.indexOf(choice), 1);
      const radius = choice.radius + policy.clearance, reach = node.radius*cell-radius;
      if (reach < cell/2) continue;
      let placed = false;
      for (let attempt = 0; attempt < 32; attempt++) {
        const angle = rng.range(0, Math.PI*2), distance = Math.sqrt(rng.next())*reach;
        const x = (Math.floor(node.x+Math.cos(angle)*distance/cell)+.5)*cell,
          y = (Math.floor(node.y+Math.sin(angle)*distance/cell)+.5)*cell;
        const dx = x/cell-node.x, dy = y/cell-node.y;
        if (Math.hypot(dx,dy) > node.radius*(node.court ? regionalCourtRadius(node.court, Math.atan2(dy,dx)) : 1)
          || !floorFits(x,y,radius)) continue;
        if (result.some(p => { const q=localOffset(p.center,plan.origin,span);
          return Math.hypot(q.x-x,q.y-y) < choice.radius+p.radius+policy.separation; })) continue;
        // Motif ancestry means the complete site fits inside that child's
        // envelope, not just a center accidentally touching its edge.
        const child = plan.shape.components?.find(c => x-choice.radius>=c.x*cell && y-choice.radius>=c.y*cell
          && x+choice.radius<=(c.x+c.size)*cell && y+choice.radius<=(c.y+c.size)*cell);
        const id = canonical([plan.id, policy.source, policy.version, 'court', index]);
        result.push({id,recipe:policy.source,content:choice.content,center:moveAddress(plan.origin,{x,y},span),radius:choice.radius,
          source:{generator:policy.source,version:policy.version,rule:choice.content,source:plan.shape.source,stream:id},
          regionalSocket:{formation:plan.id,court:index,layer:child?'motif':'court',...(child?{feature:child.shape}:{})}});
        placed = true; break;
      }
      if (placed) break;
    }
  }
  return freezeData(result);
}

/** Post-terrain planning has its own bounded cache and query. Ordinary site
 * admission must not consult it: that would make terrain depend on its children. */
export class MassRegionalDiscoveries {
  private cache = new Map<string, readonly RegionalDiscoveryPlace[]>();
  constructor(private readonly generator: MassGenerator) {}
  forPlan(plan: Readonly<MassLandformPlan>): readonly RegionalDiscoveryPlace[] {
    const hit = this.cache.get(plan.id); if (hit) return hit;
    const rows = generateRegionalDiscoveries(plan,this.generator.spec.regionalDiscoveries!,this.generator.run.seed,this.generator.spec.addressSpan);
    this.cache.set(plan.id,rows);
    if (this.cache.size>64) this.cache.delete(this.cache.keys().next().value!);
    return rows;
  }
  inCell(cell: MassCell): readonly RegionalDiscoveryPlace[] {
    const g=this.generator, span=g.spec.addressSpan, period=BigInt(g.spec.landforms!.regional!.spacing), s=BigInt(span);
    const origin=address(cell.dimension,cell.cx,cell.cy,0,0,span), bx=BigInt(origin.cx)*s, by=BigInt(origin.cy)*s;
    const found: RegionalDiscoveryPlace[]=[];
    for(let y=floorDiv(by,period);y<=floorDiv(by+s-1n,period);y++)
      for(let x=floorDiv(bx,period);x<=floorDiv(bx+s-1n,period);x++) {
        const plan=g.landforms!.regionalLandforms!.regionalDiscoveryFormation(cell.dimension,x,y); if(!plan)continue;
        for(const p of this.forPlan(plan)) {
          const q=localOffset(p.center,origin,span,Math.ceil(Number(period)/span)+2);
          const dx=Math.max(-q.x,0,q.x-span),dy=Math.max(-q.y,0,q.y-span);
          if(dx*dx+dy*dy<=p.radius*p.radius)found.push(p);
        }
      }
    return freezeData(found.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
  }
  get stats(): {cached:number} { return {cached:this.cache.size}; }
}
