import { CODEX_CFG, CODEX_SECTIONS } from '../data/codex';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { DAMAGE_TYPES, type DamageType } from '../engine/stats';
import type { Account } from '../meta/account';
import { codexConversion, codexEntries, codexFilter, codexSupportHosts, type CodexEntry, type CodexFilter } from '../meta/codex';
import { skillIconSvg } from '../render/skillIcons';
import { skillShowcaseMarkup } from '../showcase/host';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
interface PageState extends CodexFilter { page: number; selected: string | null }
export interface CodexState { section: string; pages: Record<string, PageState>; leaves: Record<string, string> }
export const newCodexState = (): CodexState => ({ section: CODEX_SECTIONS[0].id, pages: {}, leaves: {} });
interface CodexOptions { account: () => Account; back: () => void; paintPortraits: (root: HTMLElement) => void; state: CodexState; page?: string }

function styles(): void {
  if (document.getElementById('codex-styles')) return;
  const el = document.createElement('style'); el.id = 'codex-styles';
  el.textContent = `
  :is(#start-menu,#escape-menu,#account-screen):has(> .codex) { width:min(1180px,calc((100vw - 32px)/var(--ui-scale,1))); max-width:none; height:min(800px,calc((100vh - 32px)/var(--ui-scale,1))); max-height:none; padding:0; overflow:hidden; text-align:left; background:#10151d; border:1px solid #827050; box-shadow:0 18px 80px #000b; }
  .codex { container-type:size; height:100%; scrollbar-width:thin; scrollbar-color:#526070 #151e28; display:flex; flex-direction:column; overflow:auto; color:#d6dce0; font:13px/1.5 Georgia,serif; }
  .codex * { box-sizing:border-box; scrollbar-width:thin; scrollbar-color:#526070 #151e28; }
  .codex header { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:20px 24px 14px; background:linear-gradient(110deg,#262a2f,#131c27); }
  .codex header h1 { margin:0!important; font:28px/1.2 Georgia,serif!important; letter-spacing:3px!important; color:#e5c98e!important; }
  .codex .cx-eyebrow { color:#a6b4bf; font:10px/1.7 Verdana,sans-serif; text-transform:uppercase; letter-spacing:2px; }
  .codex header p { color:#aeb8bf; margin:5px 0 0; }
  .codex button,.codex select,.codex input { color:#dbe1e7; background:#202b38; border:1px solid #455365; border-radius:4px; font:12px/1.4 Verdana,sans-serif; padding:8px 10px; }
  .codex button { cursor:pointer; }
  .codex button:hover:not(:disabled),.codex button:focus-visible { background:#303e4d; border-color:#d4bb88; }
  .codex button:focus-visible,.codex input:focus-visible,.codex select:focus-visible { outline:2px solid #e2c180; outline-offset:2px; }
  .codex button:disabled { opacity:.4; cursor:default; }
  .codex nav { display:flex; flex-wrap:wrap; gap:6px; padding:10px 20px; border-bottom:1px solid #34404c; }
  .codex nav [aria-current=true],.codex .cx-leaves [aria-current=true] { color:#ffe1a5; border-color:#b59b68; background:#3a352b; }
  .codex .cx-leaves { display:flex; flex-wrap:wrap; gap:6px; padding:10px 20px 0; }
  .codex .cx-tools { display:flex; flex-wrap:wrap; gap:8px; padding:12px 20px; align-items:center; }
  .codex .cx-search { flex:1; min-width:150px; }
  .codex .cx-tools input { width:100%; }
  .codex .cx-tags { display:flex; flex-wrap:wrap; gap:5px; padding:0 20px; }
  .codex .cx-tags:empty { display:none; }
  .codex .cx-tags button { padding:3px 8px; color:#c7e2de; }
  .codex .cx-count { font:11px/1.6 Verdana,sans-serif; color:#a7b6c1; padding:0 20px 8px; }
  .codex .cx-body { flex:1; min-height:180px; display:grid; grid-template-columns:minmax(240px,1.15fr) minmax(260px,1fr); border-top:1px solid #34404c; }
  .codex .cx-list { min-height:0; display:flex; flex-direction:column; border-right:1px solid #34404c; }
  .codex .cx-grid { overflow-y:auto; flex:1; display:grid; grid-template-columns:repeat(auto-fill,minmax(145px,1fr)); gap:8px; align-content:start; padding:14px; }
  .codex .cx-card { text-align:left; min-height:94px; display:flex; gap:10px; align-items:center; padding:11px; overflow:hidden; }
  .codex .cx-card[aria-pressed=true] { border-color:#c7a867; background:#34352f; box-shadow:inset 3px 0 #d7b876; }
  .codex .cx-card b { display:block; font:13px/1.35 Georgia,serif; overflow-wrap:anywhere; }
  .codex .cx-card small { display:block; font-size:10px; margin-top:5px; color:#acb8c5; }
  .codex .cx-card.cx-locked { background:#171e29; border-color:#303a48; color:#9ba6ba; }
  .codex .cx-icon { display:flex; align-items:center; justify-content:center; width:40px; height:40px; flex:0 0 40px; font-size:24px; color:#b7a4cc; }
  .codex .cx-icon svg { max-width:100%; }
  .codex .cx-pager { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; border-top:1px solid #34404c; font-size:11px; }
  .codex .cx-detail { overflow-y:auto; min-width:0; padding:22px; background:linear-gradient(140deg,#1b2531,#121922 70%); }
  .codex .cx-detail h2 { color:#eed5a5; font-size:24px; margin:8px 0 12px; line-height:1.25; overflow-wrap:anywhere; }
  .codex .cx-detail .cx-state { color:#96c6bd; font:10px Verdana,sans-serif; text-transform:uppercase; letter-spacing:1px; }
  .codex .cx-detail p { color:#bdc9d2; }
  .codex .cx-detail dl { margin:16px 0; }
  .codex .cx-detail dt { font:10px/1.6 Verdana,sans-serif; color:#abb9c8; margin-top:12px; }
  .codex .cx-detail dd { margin:3px 0 0; color:#e0e3e6; overflow-wrap:anywhere; }
  .codex .cx-detail .cx-badges { display:flex; flex-wrap:wrap; gap:5px; }
  .codex .cx-detail .cx-badges span { padding:3px 7px; border:1px solid #40555a; color:#b4d8d0; font:10px/1.4 Verdana,sans-serif; border-radius:3px; }
  .codex .cx-preview { margin-top:22px; border-top:1px solid #3a4958; padding-top:14px; }
  .codex .cx-preview select { max-width:100%; display:block; margin:10px 0; }
  .codex .skill-showcase { display:block; aspect-ratio:16/9; width:100%; max-width:100%; margin-top:12px; }
  .codex .cx-empty { padding:24px; color:#afbeca; grid-column:1/-1; }
  .codex .cx-convert { display:flex; flex-wrap:wrap; gap:10px; align-items:end; padding:12px 0; }
  .codex .cx-convert label { display:flex; flex-direction:column; gap:5px; }
  .codex .cx-convert input { width:80px; }
  .codex output { display:block; color:#b9ded4; padding:10px 0; }
  @container(max-width:760px) { .codex header { padding:14px; } .codex header p { display:none; } .codex nav,.codex .cx-tools { padding:8px 12px; } .codex .cx-body { flex:0 0 auto; display:block; } .codex .cx-list { border-right:0; height:260px; } .codex .cx-detail { overflow:visible; padding:16px; } .codex .cx-grid { grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); } }
  `;
  document.head.append(el);
}
function icon(e: CodexEntry, size = 40): string {
  if (e.locked) return '<span aria-hidden="true" class="cx-icon runescript">ᛟ</span>';
  const s = e.source;
  if (s?.kind === 'skill') return `<span class="cx-icon" style="color:${esc(e.color ?? '')}">${skillIconSvg(SKILLS[s.id], size)}</span>`;
  if (s?.kind === 'support') return `<span class="cx-icon" style="color:${esc(e.color ?? '')}">${skillIconSvg({ ...SUPPORTS[s.id], icon: 'support' }, size)}</span>`;
  if (s?.kind === 'monster' || s?.kind === 'class') return `<canvas class="b-port" data-${s.kind === 'monster' ? 'bport' : 'bclass'}="${esc(s.id)}" data-bpsize="${size}" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px;flex:none" aria-hidden="true"></canvas>`;
  return '<span class="cx-icon" aria-hidden="true">◇</span>';
}

/** Read-only browser. Parent owns Back/Escape and the existing pause/input contract.
 * Disposal stops refresh and removes showcase nodes even when its parent is merely hidden. */
export function renderCodex(root: HTMLElement, opts: CodexOptions): () => void {
  styles();
  const state = opts.state;
  if (opts.page) {
    const section = CODEX_SECTIONS.find(s => s.pages.some(p => p.id === opts.page));
    if (section) { state.section = section.id; state.leaves[section.id] = opts.page; }
  }
  let page = '', entries: CodexEntry[] = [], signature = '', playing = false, previewHost = '', disposed = false;
  let st: PageState;
  const read = (): void => { entries = codexEntries(opts.account(), page); signature = JSON.stringify(entries); };
  const detail = (e?: CodexEntry): void => {
    const target = root.querySelector<HTMLElement>('.cx-detail')!;
    if (!e) { target.innerHTML = '<p class="cx-empty">Choose an entry to open its page.</p>'; return; }
    const hosts = e.source?.kind === 'support' ? codexSupportHosts(opts.account(), e.source.id) : [];
    if (!hosts.includes(previewHost)) previewHost = hosts[0] ?? '';
    const preview = e.preview ?? (e.source?.kind === 'support' && previewHost
      ? { skillId: previewHost, supports: [{ id: e.source.id }] } : undefined);
    target.innerHTML = `<div class="cx-state">${esc(e.state)}</div>${icon(e, 56)}
      <h2 class="${e.locked ? 'runescript' : ''}">${esc(e.title)}</h2>
      <div class="cx-badges">${e.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <p class="${e.locked && page === 'classes' ? 'runescript' : ''}">${esc(e.description)}</p>
      ${!e.locked && (preview || e.source?.kind === 'support') ? `<div class="cx-preview"><b>Live demonstration</b>
        ${e.source?.kind === 'support' ? `<p>Known base skills that accept this support. Other combinations may open as a build gains new mechanisms.</p>
          <select data-cx-host aria-label="Demonstration skill" ${hosts.length ? '' : 'disabled'}>${hosts.length ? hosts.map(id => `<option value="${esc(id)}" ${id === previewHost ? 'selected' : ''}>${esc(SKILLS[id].name)}</option>`).join('') : '<option>No compatible skill discovered yet</option>'}</select>` : '<p>The current skill, played by the game.</p>'}
        ${preview ? `<button data-cx-play>${playing ? 'Stop demonstration' : 'Play demonstration'}</button>${playing ? skillShowcaseMarkup({ ...preview, level: CODEX_CFG.previewLevel }) : ''}` : ''}</div>` : ''}
      <dl>${e.facts.map(f => `<dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd>`).join('')}</dl>
      ${e.conversion ? `<h3>Try a conversion</h3><p>Start with 100 damage. The result uses the current combat rules.</p><div class="cx-convert">
        <label>From<select data-cx-from>${DAMAGE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
        <label>To<select data-cx-to>${DAMAGE_TYPES.map(t => `<option ${t === 'fire' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Percent<input data-cx-percent type="number" min="0" max="100" value="50"></label></div><output aria-live="polite" data-cx-output></output>` : ''}
`;
    target.querySelector('[data-cx-play]')?.addEventListener('click', () => { playing = !playing; detail(e); if (playing) target.querySelector('.skill-showcase')?.scrollIntoView({ block: 'nearest' }); });
    target.querySelector<HTMLSelectElement>('[data-cx-host]')?.addEventListener('change', ev => {
      previewHost = (ev.target as HTMLSelectElement).value; detail(e);
    });
    if (e.conversion) {
      const convert = (): void => {
        const from = target.querySelector<HTMLSelectElement>('[data-cx-from]')!.value as DamageType;
        const to = target.querySelector<HTMLSelectElement>('[data-cx-to]')!.value as DamageType;
        const value = target.querySelector<HTMLInputElement>('[data-cx-percent]')!.valueAsNumber;
        const result = codexConversion(from, to, Number.isFinite(value) ? value : 0);
        target.querySelector('output')!.textContent = Object.entries(result).filter(([, v]) => v > 0).map(([k, v]) => `${Number(v.toFixed(2))} ${k}`).join(' + ');
      };
      target.querySelectorAll('select,input').forEach(el => el.addEventListener('input', convert)); convert();
    }
    opts.paintPortraits(target);
  };
  const results = (): void => {
    const filtered = codexFilter(entries, st), pages = Math.max(1, Math.ceil(filtered.length / CODEX_CFG.pageSize));
    st.page = Math.min(st.page, pages - 1);
    const visible = filtered.slice(st.page * CODEX_CFG.pageSize, (st.page + 1) * CODEX_CFG.pageSize);
    if (!visible.some(e => e.key === st.selected)) { st.selected = visible[0]?.key ?? null; playing = false; }
    const known = entries.filter(e => !e.locked).length;
    root.querySelector('.cx-count')!.textContent = `${known} known / ${entries.length} entries · ${filtered.length} matching${entries.some(e => e.locked) ? ' · Locked names and tags remain veiled' : ''}`;
    root.querySelector('.cx-tags')!.innerHTML = st.tags.map((t, i) => `<button data-cx-remove="${i}" aria-label="Remove ${esc(t)} filter">${esc(t)} ×</button>`).join('');
    root.querySelector('.cx-grid')!.innerHTML = visible.length ? visible.map(e => `<button class="cx-card${e.locked ? ' cx-locked' : ''}" data-cx-entry="${esc(e.key)}" aria-pressed="${e.key === st.selected}">
      ${icon(e)}<span><b class="${e.locked ? 'runescript' : ''}">${esc(e.title)}</b><small>${esc(e.state)}</small></span></button>`).join('')
      : '<div class="cx-empty">No entries match these filters. Clear the filters or discover more through play.</div>';
    root.querySelector('.cx-pager')!.innerHTML = `<button data-cx-prev ${st.page <= 0 ? 'disabled' : ''}>Previous</button><span>Page ${st.page + 1} of ${pages}</span><button data-cx-next ${st.page >= pages - 1 ? 'disabled' : ''}>Next</button>`;
    root.querySelectorAll<HTMLElement>('[data-cx-entry]').forEach(el => el.addEventListener('click', () => {
      st.selected = el.dataset.cxEntry!; playing = false; previewHost = '';
      root.querySelectorAll('[data-cx-entry]').forEach(card => card.setAttribute('aria-pressed', String(card === el)));
      detail(visible.find(e => e.key === st.selected));
      const pane = root.querySelector<HTMLElement>('.cx-detail')!; pane.scrollTop = 0;
      if (getComputedStyle(root.querySelector('.cx-body')!).display === 'block') pane.scrollIntoView({ block: 'start' });
    }));
    root.querySelector('[data-cx-prev]')!.addEventListener('click', () => { st.page--; playing = false; results(); });
    root.querySelector('[data-cx-next]')!.addEventListener('click', () => { st.page++; playing = false; results(); });
    root.querySelectorAll<HTMLElement>('[data-cx-remove]').forEach(el => el.addEventListener('click', () => {
      st.tags.splice(Number(el.dataset.cxRemove), 1); st.page = 0; results();
    }));
    opts.paintPortraits(root.querySelector('.cx-grid')!);
    detail(visible.find(e => e.key === st.selected));
  };
  const draw = (): void => {
    playing = false; previewHost = '';
    const section = CODEX_SECTIONS.find(s => s.id === state.section) ?? CODEX_SECTIONS[0];
    page = state.leaves[section.id] ?? section.pages[0].id;
    st = state.pages[page] ??= { query: '', tags: [], status: 'all', page: 0, selected: null };
    read();
    const tags = [...new Set(entries.filter(e => !e.locked).flatMap(e => e.tags))].sort();
    root.innerHTML = `<section class="codex" aria-label="Codex"><header><div><div class="cx-eyebrow">Hollow Wake · Account knowledge</div><h1>CODEX</h1><p>Memories of the world. Possibilities of the next life.</p></div><button data-cx-back>Back</button></header>
      <nav aria-label="Codex sections">${CODEX_SECTIONS.map(s => `<button data-cx-section="${s.id}" aria-current="${section.id === s.id}">${esc(s.label)}</button>`).join('')}</nav>
      <div class="cx-leaves" aria-label="${esc(section.label)} pages">${section.pages.map(p => `<button data-cx-page="${p.id}" aria-current="${p.id === page}">${esc(p.label)}</button>`).join('')}</div>
      <div class="cx-tools"><label class="cx-search"><input type="search" data-cx-search aria-label="Search known entries" placeholder="Search known entries…" value="${esc(st.query)}"></label>
        <select data-cx-tag aria-label="Add tag filter"><option value="">Filter by tag…</option>${tags.map(t => `<option>${esc(t)}</option>`).join('')}</select>
        <select data-cx-status aria-label="Discovery filter"><option value="all">All entries</option><option value="known">Known only</option><option value="locked">Locked only</option></select><button data-cx-clear>Clear filters</button></div>
      <div class="cx-tags"></div><div class="cx-count" aria-live="polite"></div>
      <div class="cx-body"><div class="cx-list"><div class="cx-grid"></div><div class="cx-pager"></div></div><article class="cx-detail" aria-label="Selected entry"></article></div></section>`;
    root.querySelector('[data-cx-back]')!.addEventListener('click', opts.back);
    root.querySelectorAll<HTMLElement>('[data-cx-section]').forEach(el => el.addEventListener('click', () => { state.section = el.dataset.cxSection!; draw(); }));
    root.querySelectorAll<HTMLElement>('[data-cx-page]').forEach(el => el.addEventListener('click', () => { state.leaves[section.id] = el.dataset.cxPage!; draw(); }));
    root.querySelector<HTMLInputElement>('[data-cx-search]')!.addEventListener('input', ev => { st.query = (ev.target as HTMLInputElement).value; st.page = 0; playing = false; results(); });
    root.querySelector<HTMLSelectElement>('[data-cx-tag]')!.addEventListener('change', ev => {
      const el = ev.target as HTMLSelectElement; if (el.value && !st.tags.includes(el.value)) st.tags.push(el.value);
      el.value = ''; st.page = 0; playing = false; results();
    });
    const status = root.querySelector<HTMLSelectElement>('[data-cx-status]')!; status.value = st.status;
    status.addEventListener('change', () => { st.status = status.value as CodexFilter['status']; st.page = 0; playing = false; results(); });
    root.querySelector('[data-cx-clear]')!.addEventListener('click', () => { st.query = ''; st.tags = []; st.status = 'all'; st.page = 0; draw(); });
    results();
  };
  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Escape' || disposed || root.classList.contains('hidden') || !root.querySelector('.codex')) return;
    ev.preventDefault(); ev.stopImmediatePropagation(); opts.back();
  };
  window.addEventListener('keydown', onKey, true);
  draw();
  const timer = window.setInterval(() => {
    if (disposed || root.classList.contains('hidden') || !root.querySelector('.codex')) return;
    const next = codexEntries(opts.account(), page), sig = JSON.stringify(next);
    if (sig === signature) return;
    entries = next; signature = sig; playing = false; results();
    const select = root.querySelector<HTMLSelectElement>('[data-cx-tag]')!;
    select.innerHTML = '<option value="">Filter by tag…</option>' + [...new Set(entries.filter(e => !e.locked).flatMap(e => e.tags))].sort().map(t => `<option>${esc(t)}</option>`).join('');
  }, CODEX_CFG.refreshMs);
  return () => { disposed = true; clearInterval(timer); window.removeEventListener('keydown', onKey, true); root.querySelector('.codex')?.remove(); };
}
