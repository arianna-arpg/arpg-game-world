import { registerDistrictBuilder } from './localeGen';
import { registerRegion } from '../world/regions';
import type { LocalePlan } from '../world/locales';
import type { Dir } from '../world/coords';

registerRegion({ id: 'cliff_drop', label: 'the cliff edge', walkable: false, blocks: false,
  visual: { fill: '#151b25', alpha: 1 }, boundaryPolicy: { kind: 'fall', to: 'edge',
    damage: { amount: 0, pctMaxLife: 0.18, type: 'physical', canKill: true } } });
registerRegion({ id: 'cliff_face', label: 'the cliff face', walkable: false, blocks: true,
  visual: { fill: '#777065', alpha: 1 } });

const rotate = (p: [number, number], n: number): [number, number] => {
  for (let i = 0; i < n; i++) p = [1 - p[1], p[0]];
  return p;
};
/** Orient the whole compiled plan, including sockets and the builder's frame. */
export function orientEscarpment(plan: LocalePlan, side: Dir): LocalePlan {
  const out = structuredClone(plan), n = { n: 0, e: 1, s: 2, w: 3 }[side];
  for (const d of out.districts) {
    d.at = rotate(d.at, n);
    if (n % 2) d.size = [d.size[1], d.size[0]];
    if (d.ports) for (const id of Object.keys(d.ports)) d.ports[id] = rotate(d.ports[id], n);
    d.params = { ...d.params, rotation: n };
  }
  if (out.approaches) {
    const sides: Dir[] = ['n', 'e', 's', 'w'];
    out.approaches = Object.fromEntries(Object.entries(out.approaches).map(([side, row]) => [sides[(sides.indexOf(side as Dir) + n) % 4], { ...row, via: row.via?.map(p => rotate(p, n)) }]));
  }
  for (const link of out.links) if (link.via) link.via = link.via.map(p => rotate(p, n));
  return out;
}

registerDistrictBuilder('switchback', ({ grid, center, w, h, params }) => {
  const n = params.rotation ?? 0;
  const point = (u: number, v: number) => {
    const [x, y] = rotate([u, v], n);
    return { x: center.x + (x - 0.5) * w, y: center.y + (y - 0.5) * h };
  };
  const halfWidth = Math.max(45, Math.min(170, params.pathWidth ?? 110) / 2);
  // Odd run counts keep both named sockets and the central POI on the path.
  const turns = Math.max(3, Math.min(9, Math.round(((params.turns ?? 5) - 1) / 2) * 2 + 1));
  let last = point(0.12, 0.88);
  for (let i = 0; i < turns; i++) {
    const y = 0.88 - i * 0.76 / (turns - 1);
    const start = point(i % 2 ? 0.88 : 0.12, y), end = point(i % 2 ? 0.12 : 0.88, y);
    grid.carveCorridor(last.x, last.y, start.x, start.y, halfWidth);
    grid.carveCorridor(start.x, start.y, end.x, end.y, halfWidth);
    last = end;
  }
});
