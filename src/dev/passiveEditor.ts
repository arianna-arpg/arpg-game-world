// ---------------------------------------------------------------------------
// DEV PASSIVE-TREE EDITOR (gated by config.ts DEV.passiveTreeEditor).
//
// With the passive tree open (P), this turns the tree into an EDITOR:
//   • click a node        → SELECT it (yellow ring)
//   • drag a node         → move it (its links follow live)
//   • dbl-click a node     → with one selected, ADD/REMOVE the link between them
//   • dbl-click empty space→ CREATE a new blank node there (selected)
//   • side panel           → edit name / kind / description / attributes / mods,
//                            or delete the node
//   • Save Tree to File    → serialize the WHOLE tree back to src/data/passives.ts
//                            (the dev server backs the old file up to passives.ts.bak)
//
// It mutates the live PASSIVE_NODES + PASSIVE_ADJACENCY (so the in-game tree
// reflects edits immediately) and re-attaches to the SVG after every refreshTree
// via UI.onTreeRender. Fully self-contained; touches nothing when the flag is off.
// NOT a shipped feature.
// ---------------------------------------------------------------------------

import type { UI } from '../ui/panels';
import {
  PASSIVE_ADJACENCY, PASSIVE_NODES, type NodeKind, type PassiveNode,
} from '../data/passives';
import {
  ATTRIBUTE_IDS, STAT_DEFS, mod, type AttributeId, type ModKind, type Modifier,
} from '../engine/stats';

const KINDS: NodeKind[] = ['start', 'small', 'notable', 'keystone', 'attr'];
const MOD_KINDS: ModKind[] = ['flat', 'increased', 'more', 'override'];
const J = (s: string): string => JSON.stringify(s);

export function mountPassiveEditor(ui: UI): void {
  const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration>): void => { Object.assign(el.style, s); };
  let selectedId: string | null = null;

  // --- side panel ----------------------------------------------------------
  const panel = document.createElement('div');
  css(panel, {
    position: 'fixed', right: '8px', top: '60px', zIndex: '99998', width: '300px',
    maxHeight: '82vh', overflowY: 'auto', display: 'none', flexDirection: 'column', gap: '6px',
    background: 'rgba(18,16,26,0.97)', color: '#d8d4e0', border: '1px solid #5a4a6a',
    borderRadius: '6px', padding: '9px', font: '12px Verdana', boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
  });
  document.body.append(panel);

  const status = document.createElement('div');
  css(status, { minHeight: '14px', color: '#7ec850', fontSize: '11px' });
  const flash = (msg: string, color = '#7ec850'): void => { status.textContent = msg; status.style.color = color; };

  const label = (t: string): HTMLElement => { const d = document.createElement('div'); d.textContent = t; css(d, { color: '#9a86c0', fontSize: '10px', marginTop: '4px' }); return d; };
  const inputStyle = (el: HTMLElement): void => css(el, { width: '100%', boxSizing: 'border-box', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '4px', padding: '3px 5px', font: '12px Verdana' });
  const btn = (t: string, onClick: () => void, color = '#e8d44a'): HTMLButtonElement => {
    const b = document.createElement('button'); b.textContent = t;
    css(b, { background: '#241f33', color, border: '1px solid #5a4a6a', borderRadius: '4px', padding: '4px 8px', font: '11px Verdana', cursor: 'pointer' });
    b.addEventListener('click', onClick); return b;
  };

  // --- helpers over the live tree ------------------------------------------
  const adjacent = (a: string, b: string): boolean => (PASSIVE_ADJACENCY[a] ?? []).includes(b);

  const toggleLink = (a: string, b: string): void => {
    if (a === b) return;
    PASSIVE_ADJACENCY[a] = PASSIVE_ADJACENCY[a] ?? [];
    PASSIVE_ADJACENCY[b] = PASSIVE_ADJACENCY[b] ?? [];
    if (adjacent(a, b)) {
      PASSIVE_ADJACENCY[a] = PASSIVE_ADJACENCY[a].filter(x => x !== b);
      PASSIVE_ADJACENCY[b] = PASSIVE_ADJACENCY[b].filter(x => x !== a);
      flash(`unlinked ${a} — ${b}`);
    } else {
      PASSIVE_ADJACENCY[a].push(b); PASSIVE_ADJACENCY[b].push(a);
      flash(`linked ${a} — ${b}`);
    }
    ui.refreshTree();
  };

  const freshId = (): string => { let n = 1; while (PASSIVE_NODES[`node_${n}`]) n++; return `node_${n}`; };

  const createNodeAt = (x: number, y: number): void => {
    const id = freshId();
    PASSIVE_NODES[id] = { id, name: 'New Node', description: '', kind: 'small', x: Math.round(x), y: Math.round(y), mods: [], attributes: {}, links: [] };
    PASSIVE_ADJACENCY[id] = [];
    selectedId = id;
    flash(`created ${id}`);
    ui.refreshTree();
  };

  const deleteNode = (id: string): void => {
    for (const other of [...(PASSIVE_ADJACENCY[id] ?? [])]) {
      PASSIVE_ADJACENCY[other] = (PASSIVE_ADJACENCY[other] ?? []).filter(x => x !== id);
    }
    delete PASSIVE_ADJACENCY[id];
    delete PASSIVE_NODES[id];
    if (selectedId === id) selectedId = null;
    flash(`deleted ${id}`, '#e85050');
    ui.refreshTree();
  };

  const select = (id: string): void => { selectedId = id; renderPanel(); highlight(); };

  /** Circle radii by kind (mirrors panels.refreshTree) — for coordinate hit-tests. */
  const RADII: Record<string, number> = { start: 13, small: 9, notable: 14, keystone: 17, attr: 11, choice: 15 };
  /** Which node (if any) sits under a tree COORDINATE — a capture-safe hit-test
   *  (e.target is corrupted to the SVG once a node grabs the pointer). */
  const nodeAt = (x: number, y: number): string | null => {
    for (const n of Object.values(PASSIVE_NODES)) {
      if (Math.hypot(n.x - x, n.y - y) <= (RADII[n.kind] ?? 10) + 6) return n.id;
    }
    return null;
  };
  /** A plain CLICK on a node: with NOTHING selected → select it; clicking the
   *  SELECTED node again → deselect; clicking a DIFFERENT node while one is
   *  selected → toggle the link between them (the anchor STAYS selected, so you
   *  can wire one node to many in a row). */
  const onNodeClick = (id: string): void => {
    if (selectedId === id) { selectedId = null; flash('deselected'); ui.refreshTree(); }
    else if (selectedId === null) { selectedId = id; ui.refreshTree(); }
    else toggleLink(selectedId, id); // toggleLink refreshes; selectedId unchanged (hub)
  };

  // --- mod row -------------------------------------------------------------
  const modRow = (n: PassiveNode, i: number): HTMLElement => {
    const m = n.mods![i];
    const row = document.createElement('div');
    css(row, { display: 'flex', gap: '3px', alignItems: 'center', marginBottom: '3px' });
    const stat = document.createElement('input'); stat.value = m.stat; stat.setAttribute('list', 'pe-stats'); stat.placeholder = 'stat';
    css(stat, { flex: '2', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '3px', padding: '2px 4px', font: '11px Verdana', minWidth: '0' });
    stat.addEventListener('change', () => { m.stat = stat.value.trim(); });
    const kind = document.createElement('select');
    for (const k of MOD_KINDS) { const o = document.createElement('option'); o.value = k; o.textContent = k; if (k === m.kind) o.selected = true; kind.append(o); }
    css(kind, { flex: '1.4', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '3px', font: '11px Verdana', minWidth: '0' });
    kind.addEventListener('change', () => { m.kind = kind.value as ModKind; });
    const val = document.createElement('input'); val.type = 'number'; val.step = 'any'; val.value = String(m.value);
    css(val, { flex: '1.2', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '3px', padding: '2px 4px', font: '11px Verdana', minWidth: '0' });
    val.addEventListener('change', () => { m.value = parseFloat(val.value) || 0; });
    const tags = document.createElement('input'); tags.value = (m.tags ?? []).join(','); tags.placeholder = 'tags';
    tags.title = 'comma-separated skill tags (e.g. melee, spell)';
    css(tags, { flex: '1.4', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '3px', padding: '2px 4px', font: '11px Verdana', minWidth: '0' });
    tags.addEventListener('change', () => { const t = tags.value.split(',').map(s => s.trim()).filter(Boolean); (m as { tags?: string[] }).tags = t.length ? t : undefined; });
    const rm = btn('✕', () => { n.mods!.splice(i, 1); renderPanel(); }, '#e85050');
    css(rm, { padding: '2px 6px' });
    row.append(stat, kind, val, tags, rm);
    return row;
  };

  // --- the panel for the selected node -------------------------------------
  function renderPanel(): void {
    panel.innerHTML = '';
    const head = document.createElement('div');
    css(head, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2a2438', paddingBottom: '4px' });
    const title = document.createElement('div'); title.innerHTML = '<b style="color:#e8d44a">Passive Editor</b>';
    head.append(title, btn('💾 Save', save, '#7ec8a0'));
    panel.append(head, status);

    const help = document.createElement('div');
    help.innerHTML = 'click a node: select · drag: move · click another (while one’s selected): link/unlink · click the selected one: deselect · dbl-click empty: new node';
    css(help, { color: '#6a6478', fontSize: '10px', lineHeight: '1.4' });
    panel.append(help);

    if (!selectedId || !PASSIVE_NODES[selectedId]) {
      const none = document.createElement('div'); none.textContent = 'No node selected.';
      css(none, { color: '#8a8678', marginTop: '6px' });
      panel.append(none);
      // datalist for stat autocomplete is needed even with no selection
      panel.append(statDatalist());
      return;
    }
    const n = PASSIVE_NODES[selectedId];

    const idLine = document.createElement('div'); idLine.innerHTML = `<span style="color:#8a8678">id</span> <b>${n.id}</b> <span style="color:#6a6478">(${Math.round(n.x)}, ${Math.round(n.y)})</span>`;
    panel.append(idLine);

    panel.append(label('name'));
    const name = document.createElement('input'); name.value = n.name; inputStyle(name);
    name.addEventListener('input', () => { n.name = name.value; ui.refreshTree(); });
    panel.append(name);

    panel.append(label('kind'));
    const kindSel = document.createElement('select'); inputStyle(kindSel);
    for (const k of KINDS) { const o = document.createElement('option'); o.value = k; o.textContent = k; if (k === n.kind) o.selected = true; kindSel.append(o); }
    kindSel.addEventListener('change', () => { n.kind = kindSel.value as NodeKind; ui.refreshTree(); });
    panel.append(kindSel);

    panel.append(label('description'));
    const desc = document.createElement('input'); desc.value = n.description; inputStyle(desc);
    desc.addEventListener('input', () => { n.description = desc.value; });
    panel.append(desc);

    panel.append(label('attributes'));
    const attrWrap = document.createElement('div'); css(attrWrap, { display: 'flex', gap: '4px' });
    for (const a of ATTRIBUTE_IDS) {
      const box = document.createElement('div'); css(box, { flex: '1' });
      const cap = document.createElement('div'); cap.textContent = a.slice(0, 3); css(cap, { color: '#6a6478', fontSize: '9px', textAlign: 'center' });
      const inp = document.createElement('input'); inp.type = 'number'; inp.step = '1'; inp.value = String(n.attributes?.[a as AttributeId] ?? 0); inputStyle(inp); css(inp, { padding: '2px 3px', textAlign: 'center' });
      inp.addEventListener('change', () => {
        const v = parseInt(inp.value, 10) || 0;
        n.attributes = n.attributes ?? {};
        if (v) n.attributes[a as AttributeId] = v; else delete n.attributes[a as AttributeId];
      });
      box.append(cap, inp); attrWrap.append(box);
    }
    panel.append(attrWrap);

    panel.append(label('modifiers'));
    n.mods = n.mods ?? [];
    for (let i = 0; i < n.mods.length; i++) panel.append(modRow(n, i));
    panel.append(btn('+ add modifier', () => { n.mods!.push(mod('life', 'increased', 0.05)); renderPanel(); }));

    const ops = document.createElement('div'); css(ops, { display: 'flex', gap: '6px', marginTop: '8px', borderTop: '1px solid #2a2438', paddingTop: '6px' });
    ops.append(btn('🗑 Delete Node', () => deleteNode(n.id), '#e85050'), btn('Deselect', () => { selectedId = null; renderPanel(); highlight(); }));
    panel.append(ops);

    panel.append(statDatalist());
  }

  function statDatalist(): HTMLElement {
    const dl = document.createElement('datalist'); dl.id = 'pe-stats';
    for (const s of Object.keys(STAT_DEFS)) { const o = document.createElement('option'); o.value = s; dl.append(o); }
    return dl;
  }

  // --- SVG interaction (re-attached after every refreshTree) ----------------
  const svgPoint = (svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } => {
    const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM(); if (!ctm) return { x: 0, y: 0 };
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  };

  const highlight = (): void => {
    const svg = document.getElementById('tree-svg');
    if (!svg) return;
    svg.querySelectorAll<SVGCircleElement>('.tree-node').forEach(c => {
      if (c.dataset.node === selectedId) { c.setAttribute('stroke', '#22e6e6'); c.setAttribute('stroke-width', '4'); }
    });
  };

  function onRender(): void {
    const svg = document.getElementById('tree-svg') as SVGSVGElement | null;
    panel.style.display = ui.treeOpen ? 'flex' : 'none';
    if (!svg) return;
    if (ui.treeOpen) renderPanel();

    let drag: { id: string; start: { x: number; y: number }; nodeStart: { x: number; y: number }; moved: boolean } | null = null;

    svg.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return; // node drags are LMB-only (RMB is a skill button)
      const el = (e.target as Element).closest('.tree-node') as SVGCircleElement | null;
      if (!el || !el.dataset.node) return;
      const id = el.dataset.node;
      const n = PASSIVE_NODES[id]; if (!n) return;
      drag = { id, start: svgPoint(svg, e.clientX, e.clientY), nodeStart: { x: n.x, y: n.y }, moved: false };
      try { svg.setPointerCapture(e.pointerId); } catch { /* synthetic / already-released pointer */ }
    });
    svg.addEventListener('pointermove', (e: PointerEvent) => {
      if (!drag) return;
      // Chord self-heal: LMB is up but pointerup never fired (another button
      // still held) — finish the drag rather than trailing the cursor forever.
      if ((e.buttons & 1) === 0) { endDrag(e); return; }
      const p = svgPoint(svg, e.clientX, e.clientY);
      const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
      if (Math.hypot(dx, dy) > 3) drag.moved = true;
      const n = PASSIVE_NODES[drag.id]; if (!n) return;
      n.x = Math.round(drag.nodeStart.x + dx); n.y = Math.round(drag.nodeStart.y + dy);
      const c = svg.querySelector<SVGCircleElement>(`.tree-node[data-node="${CSS.escape(drag.id)}"]`);
      if (c) { c.setAttribute('cx', String(n.x)); c.setAttribute('cy', String(n.y)); }
      // links follow live (data-a is x1's node, data-b is x2's node)
      svg.querySelectorAll<SVGLineElement>(`line[data-a="${CSS.escape(drag.id)}"]`).forEach(l => { l.setAttribute('x1', String(n.x)); l.setAttribute('y1', String(n.y)); });
      svg.querySelectorAll<SVGLineElement>(`line[data-b="${CSS.escape(drag.id)}"]`).forEach(l => { l.setAttribute('x2', String(n.x)); l.setAttribute('y2', String(n.y)); });
    });
    const endDrag = (e: PointerEvent): void => {
      if (!drag) return;
      try { svg.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
      const d = drag; drag = null;
      if (d.moved) { selectedId = d.id; ui.refreshTree(); return; } // a real drag → move + select
      // A plain CLICK (no movement) selects / deselects / toggles the link. We use
      // the pointer-DOWN node id (d.id), NOT e.target — setPointerCapture redirects
      // the later click/dblclick to the SVG, so e.target here would be wrong.
      onNodeClick(d.id);
    };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    svg.addEventListener('lostpointercapture', endDrag); // SVG swapped mid-drag

    // CREATE a node on a double-click in EMPTY space. Coordinate HIT-TEST (not
    // e.target): a node's pointer-capture corrupts the dblclick target to the SVG,
    // which would otherwise spawn a node right on top of the one you double-clicked.
    svg.addEventListener('dblclick', (e: MouseEvent) => {
      const p = svgPoint(svg, e.clientX, e.clientY);
      if (nodeAt(p.x, p.y)) return; // on a node → ignore
      createNodeAt(p.x, p.y);
    });

    highlight();
  }

  // --- serialize the whole tree back to src/data/passives.ts ---------------
  const canonicalLinks = (id: string): string[] =>
    [...new Set(PASSIVE_ADJACENCY[id] ?? [])].filter(m => id < m && PASSIVE_NODES[m]).sort();

  // Tail args shared by all three constructors: [tags?][, when?].
  const serModTail = (m: Modifier, args: string[]): string[] => {
    if (m.tags && m.tags.length) args.push(`[${m.tags.map(J).join(', ')}]`);
    else if (m.when) args.push('undefined');
    if (m.when) args.push(J(m.when));
    return args;
  };
  const serMod = (m: Modifier): string => {
    // LINK and GAUGE modifiers round-trip through their own constructors —
    // flattening them to mod() would silently drop fromStat/gauge on the
    // next editor save (the interaction-fabric nodes would go inert).
    if (m.kind === 'link' && m.fromStat !== undefined) {
      return `linkMod(${serModTail(m, [J(m.stat), J(m.fromStat), String(m.value)]).join(', ')})`;
    }
    if (m.gauge !== undefined) {
      return `gaugeMod(${serModTail(m, [J(m.stat), J(m.kind), String(m.value), J(m.gauge)]).join(', ')})`;
    }
    return `mod(${serModTail(m, [J(m.stat), J(m.kind), String(m.value)]).join(', ')})`;
  };

  const serAttrs = (a: Record<string, number>): string =>
    `{ ${Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(', ')} }`;

  const serNode = (n: PassiveNode): string => {
    const p = [`id: ${J(n.id)}`, `name: ${J(n.name)}`, `description: ${J(n.description)}`, `kind: ${J(n.kind)}`, `x: ${Math.round(n.x)}`, `y: ${Math.round(n.y)}`];
    if (n.attributes && Object.keys(n.attributes).length) p.push(`attributes: ${serAttrs(n.attributes)}`);
    if (n.attributesPct && Object.keys(n.attributesPct).length) p.push(`attributesPct: ${serAttrs(n.attributesPct)}`);
    if (n.mods && n.mods.length) p.push(`mods: [${n.mods.map(serMod).join(', ')}]`);
    // Choice deals are a group REFERENCE (options live in passiveChoices.ts,
    // safely outside this file's overwrite) — pure JSON, trivially emitted.
    if (n.choice) p.push(`choice: { group: ${J(n.choice.group)}${n.choice.pick !== undefined ? `, pick: ${n.choice.pick}` : ''} }`);
    p.push(`links: [${canonicalLinks(n.id).map(J).join(', ')}]`);
    return `  { ${p.join(', ')} },`;
  };

  const serializeTree = (): string => {
    // VOCATION nodes are GENERATED from data/vocations.ts at load — never
    // serialized (a save that inlined them would duplicate every tree on the
    // next boot). Edit vocation trees in their VocationDef, not here.
    const list = Object.values(PASSIVE_NODES).filter(n => n.vocation === undefined);
    // Emit exactly the constructors the tree uses (unused imports fail tsc).
    const usesLink = list.some(n => n.mods?.some(m => m.kind === 'link' && m.fromStat !== undefined));
    const usesGauge = list.some(n => n.mods?.some(m => m.gauge !== undefined));
    const usesMod = list.some(n => n.mods?.some(m => m.gauge === undefined && !(m.kind === 'link' && m.fromStat !== undefined)));
    const fns = [usesGauge ? 'gaugeMod' : '', usesLink ? 'linkMod' : '', usesMod ? 'mod' : ''].filter(Boolean);
    const importLine =
      `import { ${[...fns, 'type Attributes', 'type Modifier'].join(', ')} } from '../engine/stats';`;
    return `// ---------------------------------------------------------------------------
// THE PASSIVE TREE — written by the in-game passive-tree editor (DEV tool).
// Each node is explicit data: position (x, y), attribute grants, stat modifiers,
// and links. Re-edit visually with DEV.passiveTreeEditor and Save to overwrite.
// (The prior version is preserved alongside as passives.ts.bak.)
// ---------------------------------------------------------------------------

${importLine}
import { CLASSES } from './classes';
import { VOCATIONS, VOCATION_CFG, vocationNodeId, vocationRootId } from './vocations';
import type { PassiveChoiceRef } from './passiveChoices';

export type NodeKind = 'start' | 'small' | 'notable' | 'keystone' | 'attr' | 'vocation' | 'choice';

export interface PassiveNode {
  id: string;
  name: string;
  description: string;
  kind: NodeKind;
  x: number;
  y: number;
  attributes?: Partial<Attributes>;
  /** PERCENT attribute grants (+0.05 = "5% increased Fortitude") — the
   *  multiplicative lever beside the flat one. Folded in recalcSeat AFTER
   *  every flat source (base + tree + gear), so it scales the whole pool. */
  attributesPct?: Partial<Attributes>;
  mods?: Modifier[];
  links: string[];
  /** CHOICE NODE: this node deals options from a data/passiveChoices.ts group
   *  instead of (or on top of) its own grants. Each pick spends a point and is
   *  permanent; the popup, allocation legality, recalc folding, saves and the
   *  wire all resolve through that one registry. */
  choice?: PassiveChoiceRef;
  /** Set on VOCATION mini-tree nodes (the owning VocationDef id). These render
   *  and allocate ONLY for a character who has EARNED that vocation, and they
   *  spend vocation points — see world.allocateNode / panels.refreshTree. */
  vocation?: string;
}

const nodes: PassiveNode[] = [
${list.map(serNode).join('\n')}
];

// --- VOCATION MINI-TREES -------------------------------------------------------
// Each VocationDef's tree (authored in LOCAL coords around 0,0) is offset into
// the EMPTY CENTRE of the nine-point star and merged into the ordinary node
// registry — adjacency, recalc, save and the validator all work unchanged.

const starNodes = nodes.filter(n => n.kind === 'start');
/** The hub of the nine-point star — where vocation trees anchor. Derived from
 *  the live start nodes (never a hardcoded coordinate). */
export const STAR_CENTER = {
  x: Math.round(starNodes.reduce((s, n) => s + n.x, 0) / Math.max(1, starNodes.length)),
  y: Math.round(starNodes.reduce((s, n) => s + n.y, 0) / Math.max(1, starNodes.length)),
};

for (const v of Object.values(VOCATIONS)) {
  nodes.push({
    id: vocationRootId(v.id), name: v.name,
    description: \`\${v.blurb} — the \${v.name}'s crest, granted with the vocation. Its nodes spend vocation points.\`,
    kind: 'vocation', vocation: v.id,
    x: STAR_CENTER.x, y: STAR_CENTER.y, links: [],
  });
  for (const n of v.tree) {
    nodes.push({
      id: vocationNodeId(v.id, n.id), name: n.name, description: n.description,
      kind: n.kind, vocation: v.id,
      x: STAR_CENTER.x + n.x, y: STAR_CENTER.y + n.y,
      attributes: n.attributes, mods: n.mods,
      links: n.links.map(l => vocationNodeId(v.id, l)),
    });
  }
}

// --- Exports -----------------------------------------------------------------

export const PASSIVE_NODES: Record<string, PassiveNode> = {};
for (const n of nodes) PASSIVE_NODES[n.id] = n;

/** Bidirectional adjacency built from the one-way \`links\` declarations. */
export const PASSIVE_ADJACENCY: Record<string, string[]> = {};
for (const n of nodes) PASSIVE_ADJACENCY[n.id] = [];
for (const n of nodes) {
  for (const to of n.links) {
    if (!PASSIVE_NODES[to]) continue;
    PASSIVE_ADJACENCY[n.id].push(to);
    PASSIVE_ADJACENCY[to].push(n.id);
  }
}

/** Resolved from ClassDef.startNode — the tree never hardcodes class ids. */
export function classStartNode(classId: string): string {
  const c = CLASSES.find(cd => cd.id === classId);
  if (!c) console.warn(\`[passives] unknown class '\${classId}' — starting at str_start\`);
  return c?.startNode ?? 'str_start';
}

/** The start node that GATES a vocation's point-spending (when the
 *  VOCATION_CFG.requireGateNode playtest toggle is on): the def's authored
 *  override, else the home class's startNode. Registry-resolved — no ids. */
export function vocationGateNodeId(vocId: string): string | null {
  const v = VOCATIONS[vocId];
  if (!v) return null;
  return v.gateNode ?? classStartNode(v.classId);
}

/** May a character with these allocations SPEND points in \`vocId\`'s tree?
 *  True when the gate toggle is off, or once the gate start node is taken.
 *  (A home-class character passes from birth — its start node is allocated
 *  at creation; an off-class character must path to it first.) */
export function vocationGateOpen(allocated: ReadonlySet<string>, vocId: string): boolean {
  if (!VOCATION_CFG.requireGateNode) return true;
  const gate = vocationGateNodeId(vocId);
  return gate === null || allocated.has(gate);
}
`;
  };

  async function save(): Promise<void> {
    flash('saving…', '#e8d44a');
    try {
      const res = await fetch('/__dev/passives', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: serializeTree() });
      const j = await res.json().catch(() => ({ ok: false }));
      if (res.ok && j.ok) flash(`saved ${Object.keys(PASSIVE_NODES).length} nodes → src/data/passives.ts`, '#7ec850');
      else flash(`save failed: ${j.error ?? res.status}`, '#e85050');
    } catch (e) { flash(`save failed (dev server only): ${String(e)}`, '#e85050'); }
  }

  // expose the serializer for headless/QA round-trip checks
  (window as unknown as { __passiveEditor?: unknown }).__passiveEditor = { serializeTree, select, createNodeAt, toggleLink };

  ui.onTreeRender = onRender;
}
