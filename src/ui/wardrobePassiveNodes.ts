import { VOCATIONS, vocationNodeId, vocationRootId } from '../data/vocations';
import { PASSIVE_NODES, STAR_CENTER } from '../data/passives';
import { passiveTreeNodeRadius, passiveTreeArtFrame } from '../data/passiveTreePresentation';
import { ARTWORK_CATALOGUES, artworkUrl } from './artworkCatalogues';
import { hollowWakeMenuHeader } from './brand';
import { esc } from './dom';
import { renderInterfacePage } from './interfacePage';
import { passiveNodeArt, type PassiveNodeArtState } from './passiveNodeArt';
import { DEFAULT_PASSIVE_NODE_STYLE, PASSIVE_NODE_PRESETS, PASSIVE_NODE_STYLE_CHOICES, normalizePassiveNodeStyle, resolvePassiveNodeVisual, type PassiveNodeStyle } from './passiveNodeConfig';
import { passiveTreeEdge } from './passiveTreeEdges';

export interface WardrobePassiveNodeOptions { get(): PassiveNodeStyle; save(style: PassiveNodeStyle): void; vocation?: string }
export function renderWardrobePassiveNodes(root: HTMLElement, options: WardrobePassiveNodeOptions, back: () => void): void {
  let draft = normalizePassiveNodeStyle(options.get());
  let vocation = options.vocation && Object.hasOwn(VOCATIONS,options.vocation) ? options.vocation : 'warbringer';
  renderInterfacePage(root, { id:'passive-node-style', className:'wardrobe', label:'Passive node style', body:`
    ${hollowWakeMenuHeader()}
    <header><div><div class="wd-eyebrow">Wardrobe · Passive nodes</div><h1>Marks of your calling</h1>
      <p class="wd-muted">Choose a direction, then mix the surface, silhouette, symbols and color.</p></div></header>
    <div class="wd-passive-presets">${PASSIVE_NODE_PRESETS.map(p => `<button type="button" data-passive-preset="${p.id}" aria-pressed="false"><span data-passive-sample="${p.id}"></span><b>${p.name}</b><small>${p.description}</small></button>`).join('')}</div>
    <div class="wd-layout"><aside>
      <label class="wd-interface-choice"><b>Preview a Vocation</b><select data-passive-vocation aria-label="Preview a Vocation">${Object.values(VOCATIONS).map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></label>
      <div class="wd-passive-stage" data-passive-tree-preview></div>
      <div class="wd-passive-states" data-passive-states></div>
      <p class="wd-muted">Each symbol describes its node. The surrounding shape and palette belong to its Vocation.</p>
    </aside><div>
      <div class="wd-passive-mix">${PASSIVE_NODE_STYLE_CHOICES.map(c => `<label class="wd-interface-choice"><b>${c.label}</b><select data-passive-choice="${c.key}" aria-label="${c.label}">${c.choices.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select></label>`).join('')}</div>
      <p>Available nodes gain a bright crest. Learned nodes carry a small check. Dashed rims mark choices.</p>
      <div class="wd-actions"><button class="wd-primary" data-passive-save>Save node style</button><button data-passive-default>Restore default preview</button></div>
      <p class="wd-note" data-passive-note role="status">Preview freely before saving.</p>
      <small>Free visual choices. Saved on this device for all characters. Original symbols and treatments by Hollow Wake.</small>
    </div></div>`, footer:'<button data-passive-back>Back to Wardrobe</button>' });
  const note = root.querySelector<HTMLElement>('[data-passive-note]')!;
  const paint = (): void => {
    const v = VOCATIONS[vocation], group = 'vocation:'+vocation;
    const visual = (id: string, kind: string) => resolvePassiveNodeVisual({id:vocationNodeId(vocation,id),localId:id,kind,group})!;
    const emblem = visual('root','vocation');
    root.querySelector<HTMLSelectElement>('[data-passive-vocation]')!.value = vocation;
    for (const c of PASSIVE_NODE_STYLE_CHOICES) root.querySelector<HTMLSelectElement>(`[data-passive-choice="${c.key}"]`)!.value = draft[c.key];
    for (const p of PASSIVE_NODE_PRESETS) {
      root.querySelector(`[data-passive-sample="${p.id}"]`)!.innerHTML = `<svg viewBox="0 0 150 58" aria-hidden="true">${passiveNodeArt(27,29,21,emblem,p.style,{allocated:true})}${passiveNodeArt(76,29,18,visual('s1','small'),p.style,{available:true})}${passiveNodeArt(122,29,21,visual('k1','keystone'),p.style,{keystone:true})}</svg>`;
      root.querySelector(`[data-passive-preset="${p.id}"]`)!.setAttribute('aria-pressed', String(PASSIVE_NODE_STYLE_CHOICES.every(c => draft[c.key] === p.style[c.key])));
    }
    const states: [string,PassiveNodeArtState][] = [['Unlearned',{}],['Available',{available:true}],['Learned',{allocated:true}],['Choice',{available:true,choice:true}]];
    root.querySelector('[data-passive-states]')!.innerHTML = states.map(([name,state]) => `<div><svg viewBox="0 0 60 56" aria-hidden="true">${passiveNodeArt(30,28,20,emblem,draft,state)}</svg>${name}</div>`).join('');
    const nodes = [PASSIVE_NODES[vocationRootId(vocation)], ...v.tree.map(n => PASSIVE_NODES[vocationNodeId(vocation,n.id)])];
    const frame = passiveTreeArtFrame(group), cx = STAR_CENTER.x+frame.offsetX, cy = STAR_CENTER.y+frame.offsetY;
    const src = ARTWORK_CATALOGUES.vocation?.[vocation]?.src, url = src && artworkUrl(src);
    const edges = v.tree.flatMap(n => n.links.map(id => passiveTreeEdge(
      { ...PASSIVE_NODES[vocationNodeId(vocation,n.id)], radius:passiveTreeNodeRadius(PASSIVE_NODES[vocationNodeId(vocation,n.id)]) },
      { ...PASSIVE_NODES[vocationNodeId(vocation,id)], radius:passiveTreeNodeRadius(PASSIVE_NODES[vocationNodeId(vocation,id)]) },
      {color:v.color,width:1.5,gap:4,backing:'#101219'}))).join('');
    root.querySelector('[data-passive-tree-preview]')!.innerHTML = `<svg viewBox="${cx-frame.width/2-10} ${cy-frame.height/2-10} ${frame.width+20} ${frame.height+20}" role="img" aria-label="${esc(v.name)} tree style preview">
      <defs><radialGradient id="wardrobe-node-fade"><stop offset=".2" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><mask id="wardrobe-node-mask"><rect x="${cx-frame.width/2}" y="${cy-frame.height/2}" width="${frame.width}" height="${frame.height}" fill="url(#wardrobe-node-fade)"/></mask></defs>
      ${url ? `<image href="${esc(url)}" x="${cx-frame.width/2}" y="${cy-frame.height/2}" width="${frame.width}" height="${frame.height}" opacity=".64" mask="url(#wardrobe-node-mask)"/>` : ''}${edges}
      ${nodes.map((n,i) => `<g><title>${esc(n.name)}</title>${passiveNodeArt(n.x,n.y,passiveTreeNodeRadius(n),visual(i ? v.tree[i-1].id : 'root',n.kind),draft,{allocated:i === 0,available:i > 0 && n.links.includes(vocationRootId(vocation)),choice:!!n.choice,keystone:n.kind === 'keystone'})}</g>`).join('')}</svg>`;
  };
  const changed = (): void => { note.textContent = 'Preview only. Save to apply to your passive tree.'; paint(); };
  root.querySelectorAll<HTMLButtonElement>('[data-passive-preset]').forEach(button => button.addEventListener('click', () => {
    draft = { ...PASSIVE_NODE_PRESETS.find(p => p.id === button.dataset.passivePreset)!.style }; changed();
  }));
  root.querySelectorAll<HTMLSelectElement>('[data-passive-choice]').forEach(select => select.addEventListener('change', () => {
    draft = normalizePassiveNodeStyle({...draft,[select.dataset.passiveChoice!]:select.value}); changed();
  }));
  root.querySelector<HTMLSelectElement>('[data-passive-vocation]')!.addEventListener('change', event => { vocation = (event.target as HTMLSelectElement).value; paint(); });
  root.querySelector('[data-passive-save]')!.addEventListener('click', () => { options.save({...draft}); note.textContent = 'Node style saved. Your passive tree now uses this combination.'; });
  root.querySelector('[data-passive-default]')!.addEventListener('click', () => { draft = {...DEFAULT_PASSIVE_NODE_STYLE}; changed(); });
  root.querySelector('[data-passive-back]')!.addEventListener('click', back);
  paint();
}
