import assert from 'node:assert/strict';
import { VOCATIONS, vocationNodeId, vocationRootId } from '../src/data/vocations';
import { PASSIVE_NODES, PASSIVE_ADJACENCY, STAR_CENTER, vocationGateNodeId } from '../src/data/passives';
import { MAIN_REALM, realmIdOf } from '../src/data/passiveRealms';
import { PASSIVE_TREE_NODE_RADII, passiveTreeArtFrame } from '../src/data/passiveTreePresentation';
import { VOCATION_LAYOUTS, VOCATION_LAYOUT_TEMPLATES, VOCATION_LAYOUT_CFG, vocationTreeLayout } from '../src/data/vocationLayouts';
import { passiveTreeEdge, passiveTreeEdgeSegments } from '../src/ui/passiveTreeEdges';

type Point = { x: number; y: number };
const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}
function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point): number => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return side(a, b, c) * side(a, b, d) < -1e-6 && side(c, d, a) * side(c, d, b) < -1e-6;
}
const ordinary = Object.values(PASSIVE_NODES).filter(n => !n.vocation && realmIdOf(n) === MAIN_REALM);
const nearby = ordinary.filter(n => distance(n, STAR_CENTER) < 700);
const radius = (node: typeof ordinary[number]): number => PASSIVE_TREE_NODE_RADII[node.kind];
const cfg = VOCATION_LAYOUT_CFG;
let checkedNodes = 0, checkedEdges = 0;
for (const v of Object.values(VOCATIONS)) {
  const profile = VOCATION_LAYOUTS[v.id]; assert(profile, `${v.id}: explicit artwork layout`);
  const frame = passiveTreeArtFrame(`vocation:${v.id}`), center = { x: STAR_CENTER.x + frame.offsetX, y: STAR_CENTER.y + frame.offsetY };
  const root = PASSIVE_NODES[vocationRootId(v.id)], gate = PASSIVE_NODES[vocationGateNodeId(v.id)!];
  const nodes = [root, ...v.tree.map(n => PASSIVE_NODES[vocationNodeId(v.id, n.id)])];
  assert.equal(root.kind, 'vocation'); assert.deepEqual(root.links, []);
  for (const n of v.tree) {
    assert(profile.points?.[n.id] || VOCATION_LAYOUT_TEMPLATES[profile.template!]?.[profile.slots?.[n.id] ?? n.id], `${v.id}/${n.id}: authored placement`);
    const actual = PASSIVE_NODES[vocationNodeId(v.id, n.id)];
    assert.deepEqual(actual.links, n.links.map(id => vocationNodeId(v.id, id)), 'presentation keeps allocation paths');
    assert.equal(actual.mods, n.mods); assert.equal(actual.choice, n.choice); assert.equal(actual.kind, n.kind);
    assert(distance(actual, gate) >= distance(root, gate) + cfg.rootLead, `${v.id}/${n.id}: crest must be closest to its gate`);
  }
  const edges: [typeof root, typeof root][] = [];
  for (const n of nodes) for (const id of PASSIVE_ADJACENCY[n.id]) {
    if (n.id < id) edges.push([n, PASSIVE_NODES[id]]);
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i], r = radius(n) + cfg.nodeBacking;
    assert(Number.isFinite(n.x) && Number.isFinite(n.y));
    assert(Math.hypot((n.x - center.x) / (frame.width / 2), (n.y - center.y) / (frame.height / 2))
      + r / (Math.min(frame.width, frame.height) / 2) < 1, `${n.id}: complete disc inside portrait ellipse`);
    for (const b of nodes.slice(i + 1)) assert(distance(n, b) >= radius(n) + radius(b) + cfg.nodeGap, `${n.id}/${b.id}: disc clearance`);
    for (const b of nearby) assert(distance(n, b) >= radius(n) + radius(b) + cfg.nodeGap, `${n.id}/${b.id}: ordinary tree clearance`);
    for (const [a, b] of edges) if (n !== a && n !== b)
      assert(segmentDistance(n, a, b) >= radius(n) + cfg.edgeClearance, `${n.id}: no unrelated edge across disc (${a.id}/${b.id})`);
    if (n !== root) assert(segmentDistance(n, root, gate) >= radius(n) + cfg.edgeClearance, `${n.id}: gate link is clear`);
  }
  const allEdges: [typeof root, typeof root][] = [...edges, [root, gate]];
  for (let i = 0; i < allEdges.length; i++) for (const [c, d] of allEdges.slice(i + 1)) {
    const [a, b] = allEdges[i];
    if ([a, b].includes(c) || [a, b].includes(d)) continue;
    assert(!crosses(a, b, c, d), `${v.id}: connections cross (${a.id}/${b.id}, ${c.id}/${d.id})`);
  }
  const ordinaryEdges: [Point, Point][] = ordinary.flatMap(c => PASSIVE_ADJACENCY[c.id]
    .filter(id => c.id < id && !PASSIVE_NODES[id].vocation).map(id => [c, PASSIVE_NODES[id]] as [Point, Point]));
  const gateSegments = passiveTreeEdgeSegments({ ...root, radius: radius(root) }, { ...gate, radius: radius(gate) }, cfg.edgeEndGap, {
    nodes: [...ordinary, ...nodes].filter(n => n !== root && n !== gate).map(n => ({ ...n, radius: radius(n) })),
    edges: [...ordinaryEdges, ...edges], gap: cfg.edgeClearance,
  });
  assert(gateSegments.length > 0, `${v.id}: gate connection stays visible`);
  const visibleEdges: [Point, Point][] = [...edges, ...gateSegments.map(s => [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] as [Point, Point])];
  for (const [a, b] of visibleEdges) {
    for (const n of nearby) if (n !== a && n !== b)
      assert(segmentDistance(n, a, b) >= (n === gate ? radius(n) + cfg.edgeEndGap : radius(n) + cfg.edgeClearance) - 1e-7, `${v.id}: connection obstructs ${n.id}`);
    for (const c of nearby) for (const id of PASSIVE_ADJACENCY[c.id]) {
      const d = PASSIVE_NODES[id];
      if (d.vocation || c.id > d.id || [a, b].includes(c) || [a, b].includes(d)) continue;
      assert(!crosses(a, b, c, d), `${v.id}: connection crosses ordinary edge ${c.id}/${d.id}`);
    }
  }
  checkedNodes += nodes.length; checkedEdges += allEdges.length;
}

// An authored source with different node IDs uses the same resolver. It does
// not rewrite its caller's coordinates, and the real gate moves its orientation.
const custom = [{ id: 'blessing', x: 30, y: 20 }]; const before = JSON.stringify(custom);
const profile = { points: { root: { x: 0, y: .8 }, blessing: { x: .2, y: -.2 } } };
const east = vocationTreeLayout('future', custom, { x: 1000, y: 0 }, { x: 0, y: 0 }, profile);
const north = vocationTreeLayout('future', custom, { x: 0, y: -1000 }, { x: 0, y: 0 }, profile);
assert(east.root.x > east.blessing.x); assert(north.root.y < north.blessing.y);
assert.equal(JSON.stringify(custom), before);
const stroke = passiveTreeEdge({ x: 0, y: 0, radius: 15 }, { x: 100, y: 0, radius: 17 },
  { color: '#fff', backing: '#000', width: 2, gap: cfg.edgeEndGap, from: 'a', to: 'b' });
assert(stroke.includes('x1="19"')); assert(stroke.includes('x2="79"'));
assert(stroke.includes('data-a="a" data-b="b"')); assert(stroke.includes('pointer-events="none"'));
const a = { x: 0, y: 0, radius: 0 }, b = { x: 100, y: 0, radius: 0 };
const baseline = passiveTreeEdgeSegments(a, b, 0);
assert.deepEqual(passiveTreeEdgeSegments(a, b, 0, { nodes: [], gap: 8,
  edges: [[{ x: 1000, y: 0 }, { x: 1100, y: .01 }]] }), baseline, 'distant finite segments do not mask the tether');
const crossSpans = passiveTreeEdgeSegments(a, b, 0, { nodes: [], gap: 8,
  edges: [[{ x: 50, y: -10 }, { x: 50, y: 10 }]] });
assert.equal(crossSpans.length, 2); assert(Math.abs(crossSpans[0].x2 - 42) < 1e-7); assert(Math.abs(crossSpans[1].x1 - 58) < 1e-7);
const discSpans = passiveTreeEdgeSegments(a, b, 0, { edges: [], gap: 8, nodes: [{ x: 50, y: 0, radius: 10 }] });
assert.equal(discSpans.length, 2); assert(Math.abs(discSpans[0].x2 - 32) < 1e-7); assert(Math.abs(discSpans[1].x1 - 68) < 1e-7);
assert.deepEqual(passiveTreeEdgeSegments(a, a, 0), []);
console.log(`PASS Vocation layouts: ${Object.keys(VOCATIONS).length} portraits, ${checkedNodes} discs, ${checkedEdges} clear connections, gate-facing roots, preserved powers/paths and configurable custom identities`);
