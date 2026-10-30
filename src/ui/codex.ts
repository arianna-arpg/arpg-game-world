import { mountSideScreen, refreshSideScreen, captureSideScreenFocus, type SideScreenContext } from './sideScreen';
import type { SideScreenProfile } from './sideScreenConfig';
import { CODEX_CFG, CODEX_SECTIONS } from '../data/codex';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { DAMAGE_TYPES, type DamageType } from '../engine/stats';
import type { Account } from '../meta/account';
import { codexConversion, codexEntries, codexFilter, codexSupportHosts, type CodexEntry, type CodexFilter } from '../meta/codex';
import { skillIconSvg } from '../render/skillIcons';
import { mountCodexPreview, type CodexPreview } from './codexPreview';
import { mountWindowedGrid, type WindowedGrid, type GridAnchor } from './windowedGrid';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
interface PageState extends CodexFilter { selected: string | null; scroll?: number; anchor?: GridAnchor; host?: string }
export interface CodexState { section: string; pages: Record<string, PageState>; leaves: Record<string, string>; autoplay?: boolean }
export const newCodexState = (): CodexState => ({ section: CODEX_SECTIONS[0].id, pages: {}, leaves: {}, autoplay: CODEX_CFG.autoplay });
export interface CodexOptions {
  account: () => Account; back: () => void; paintPortraits: (root: HTMLElement) => void; state: CodexState; page?: string;
  shell?: { profile: SideScreenProfile; context: SideScreenContext };
}
function icon(e: CodexEntry, size = 40): string {
  if (e.locked) return '<span aria-hidden="true" class="cx-icon runescript">ᛟ</span>';
  const s = e.source;
  if (s?.kind === 'skill') return `<span class="cx-icon" style="color:${esc(e.color ?? '')}">${skillIconSvg(SKILLS[s.id], size)}</span>`;
  if (s?.kind === 'support') return `<span class="cx-icon" style="color:${esc(e.color ?? '')}">${skillIconSvg({ ...SUPPORTS[s.id], icon: 'support' }, size)}</span>`;
  if (s?.kind === 'monster' || s?.kind === 'class') return `<canvas class="b-port" data-${s.kind === 'monster' ? 'bport' : 'bclass'}="${esc(s.id)}" data-bpsize="${size}" width="${size * 2}" height="${size * 2}" style="width:${size}px;height:${size}px;flex:none" aria-hidden="true"></canvas>`;
  return '<span class="cx-icon" aria-hidden="true">◇</span>';
}

/** Read-only reader. Parent retains navigation, pause, and account ownership.
 * Styles load at the browser entry point; this module remains safe for headless imports. */
export function renderCodex(root: HTMLElement, opts: CodexOptions): () => void {
  const state = opts.state;
  if (opts.page) {
    const section = CODEX_SECTIONS.find(s => s.pages.some(p => p.id === opts.page));
    if (section) { state.section = section.id; state.leaves[section.id] = opts.page; }
  }
  let page = '', entries: CodexEntry[] = [], filtered: CodexEntry[] = [];
  let signature = '', detailSignature = '', detailKey = '', knowledge = '', disposed = false;
  let st: PageState, preview: CodexPreview | undefined, list: WindowedGrid<CodexEntry> | undefined;
  const q = <T extends HTMLElement = HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const compact = (): boolean => getComputedStyle(q('.cx-body')).display === 'block';
  const resetPreview = (): void => { preview?.dispose(); preview = undefined; };
  const reading = (value: boolean): void => { q('.codex').dataset.cxReading = String(value); };
  const restoreFocus = (address?: string): void => {
    if (!address || document.activeElement !== document.body) return;
    const target = root.querySelector<HTMLElement>(address);
    if (target && !target.matches(':disabled') && target.getClientRects().length) target.focus({ preventScroll: true });
  };
  const rememberScroll = (): void => {
    if (root.querySelector('.cx-grid')?.getClientRects().length && list) {
      const saved = list.snapshot(); st.scroll = saved.top; st.anchor = saved.anchor;
    }
  };
  const returnToResults = (): void => {
    const position = { top: st.scroll ?? 0, anchor: st.anchor };
    reading(false); list?.setItems(filtered, st.selected, position); list?.focus(st.selected);
  };
  const activeFilters = (): boolean => !!(st.query.trim() || st.tags.length || st.status !== 'all');
  const filterChanged = (): void => { st.scroll = 0; st.anchor = undefined; reading(false); results(); updateTags(); };
  const resetFilters = (): void => {
    st.query = ''; st.tags = []; st.status = 'all';
    q<HTMLInputElement>('[data-cx-search]').value = ''; q<HTMLSelectElement>('[data-cx-status]').value = 'all'; filterChanged();
  };
  const addTag = (tag: string): void => { if (!st.tags.includes(tag)) st.tags.push(tag); filterChanged(); };
  const navState = (): void => {
    const index = filtered.findIndex(e => e.key === st.selected);
    const position = root.querySelector('.cx-entry-position');
    if (position) position.textContent = `${index + 1} / ${filtered.length}`;
    const prev = root.querySelector<HTMLButtonElement>('[data-cx-entry-prev]'), next = root.querySelector<HTMLButtonElement>('[data-cx-entry-next]');
    if (prev) prev.disabled = index <= 0; if (next) next.disabled = index < 0 || index >= filtered.length - 1;
  };
  const stepEntry = (delta: number): void => {
    const entry = filtered[filtered.findIndex(e => e.key === st.selected) + delta];
    if (!entry) return;
    const focus = captureSideScreenFocus(root);
    st.selected = entry.key; list?.select(entry.key); paintDetail(entry); navState(); reading(true); q('.cx-detail').scrollTop = 0;
    restoreFocus(focus);
    if (document.activeElement === document.body || (document.activeElement instanceof HTMLButtonElement && document.activeElement.disabled)) q('#cx-entry-title').focus({ preventScroll: true });
  };
  const paintDetail = (e?: CodexEntry): void => {
    const target = q('.cx-detail'), nextSignature = JSON.stringify(e ?? null);
    if (detailSignature === nextSignature) return;
    const focus = captureSideScreenFocus(root), scroll = target.scrollTop;
    const sameEntry = !!e && detailKey === e.key;
    if (!sameEntry) resetPreview();
    // Keep the selected demonstration's actual node and controls when only its facts change.
    const savedPreview = sameEntry ? preview?.element : undefined;
    savedPreview?.remove();
    detailSignature = nextSignature; detailKey = e?.key ?? '';
    if (!e) {
      target.innerHTML = '<div class="cx-empty"><span aria-hidden="true">◇</span><h2>Nothing selected</h2><p>Choose an entry from the results to read its page.</p></div>'; return;
    }
    target.innerHTML = `<div class="cx-entry-tools"><button data-cx-results>← Results</button><div class="cx-entry-steps"><button data-cx-entry-prev aria-label="Previous entry">←</button><span class="cx-entry-position"></span><button data-cx-entry-next aria-label="Next entry">→</button></div></div>
      <div class="cx-entry-heading">${icon(e, 56)}<div><div class="cx-state">${esc(e.state)}</div><h2 id="cx-entry-title" tabindex="-1" class="${e.locked ? 'runescript' : ''}">${esc(e.title)}</h2></div></div>
      <div class="cx-badges">${e.tags.map(t => `<button data-cx-filter="${esc(t)}" title="Filter by ${esc(t)}" aria-label="Filter by ${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <p class="cx-description ${e.locked && page === 'classes' ? 'runescript' : ''}">${esc(e.description)}</p>
      ${!e.locked && (e.preview || e.source?.kind === 'support') ? '<section class="cx-preview" aria-label="Skill demonstration"></section>' : ''}
      ${e.facts.length ? `<dl class="cx-facts">${e.facts.map(f => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}
      ${e.conversion ? `<section class="cx-calculator"><h3>Try a conversion</h3><p>Start with 100 damage. The result uses the current combat rules.</p><div class="cx-convert">
        <label>From<select data-cx-from>${DAMAGE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label>
        <label>To<select data-cx-to>${DAMAGE_TYPES.map(t => `<option ${t === 'fire' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Percent<input data-cx-percent type="number" min="0" max="100" value="50"></label></div><output aria-live="polite" data-cx-output></output></section>` : ''}`;
    target.querySelector('[data-cx-results]')!.addEventListener('click', returnToResults);
    target.querySelector('[data-cx-entry-prev]')!.addEventListener('click', () => stepEntry(-1));
    target.querySelector('[data-cx-entry-next]')!.addEventListener('click', () => stepEntry(1));
    target.querySelectorAll<HTMLElement>('[data-cx-filter]').forEach(button => button.addEventListener('click', () => { addTag(button.dataset.cxFilter!); list?.focus(st.selected); }));
    const seat = target.querySelector<HTMLElement>('.cx-preview');
    if (seat) {
      if (savedPreview) seat.replaceWith(savedPreview);
      else preview = mountCodexPreview(seat, e, e.source?.kind === 'support' ? codexSupportHosts(opts.account(), e.source.id) : [], st.host ?? '', id => { st.host = id; }, { autoplay: state.autoplay ?? CODEX_CFG.autoplay, changed: value => { state.autoplay = value; } });
    } else resetPreview();
    if (e.conversion) {
      const convert = (): void => {
        const from = q<HTMLSelectElement>('[data-cx-from]').value as DamageType;
        const to = q<HTMLSelectElement>('[data-cx-to]').value as DamageType;
        const percent = q<HTMLInputElement>('[data-cx-percent]').valueAsNumber;
        q('[data-cx-output]').textContent = Object.entries(codexConversion(from, to, Number.isFinite(percent) ? percent : 0))
          .filter(([, v]) => v > 0).map(([type, value]) => `${Number(value.toFixed(2))} ${type}`).join(' + ');
      };
      target.querySelectorAll('select,input').forEach(el => el.addEventListener('input', convert)); convert();
    }
    opts.paintPortraits(target); navState(); target.scrollTop = sameEntry ? scroll : 0; restoreFocus(focus);
  };
  const selectEntry = (key: string, open: boolean): void => {
    const entry = filtered.find(e => e.key === key); if (!entry) return;
    st.selected = key; list?.select(key); paintDetail(entry); navState();
    if (open && compact()) { rememberScroll(); reading(true); q('.cx-detail').scrollTop = 0; q('#cx-entry-title').focus({ preventScroll: true }); q('#cx-entry-title').scrollIntoView({ block: 'nearest' }); }
  };
  const results = (): void => {
    const focus = captureSideScreenFocus(root);
    filtered = codexFilter(entries, st);
    if (!filtered.some(e => e.key === st.selected)) st.selected = filtered[0]?.key ?? null;
    const known = entries.filter(e => !e.locked).length;
    q('.cx-count').textContent = `${known} discovered · ${entries.length} entries${activeFilters() ? ` · ${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}` : ''}`;
    q('.cx-list-meta').textContent = filtered.length ? `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'} · Scroll to explore` : 'No matching entries';
    q('.cx-tags').innerHTML = st.tags.map((tag, index) => `<button data-cx-remove="${index}" aria-label="Remove ${esc(tag)} filter">${esc(tag)} <span aria-hidden="true">×</span></button>`).join('');
    q<HTMLButtonElement>('[data-cx-clear-query]').disabled = !st.query;
    q<HTMLButtonElement>('[data-cx-clear]').disabled = !activeFilters();
    const empty = q('.cx-list-empty'); empty.hidden = filtered.length > 0; q('.cx-grid').hidden = !filtered.length;
    empty.innerHTML = filtered.length ? '' : `<div class="cx-empty"><span aria-hidden="true">◇</span><h3>${activeFilters() ? 'No known entries match' : 'An unwritten page'}</h3><p>${esc(activeFilters() ? 'Try fewer words or remove a filter. Locked names and tags stay veiled while searching.' : CODEX_SECTIONS.flatMap(s => s.pages).find(p => p.id === page)?.empty ?? 'Discover more through play to fill this part of the Codex.')}</p>${activeFilters() ? '<button data-cx-reset>Clear filters</button>' : ''}</div>`;
    root.querySelector('[data-cx-reset]')?.addEventListener('click', resetFilters);
    root.querySelectorAll<HTMLElement>('[data-cx-remove]').forEach(button => button.addEventListener('click', () => { st.tags.splice(Number(button.dataset.cxRemove), 1); filterChanged(); }));
    list?.setItems(filtered, st.selected, { top: st.scroll ?? 0, anchor: st.anchor });
    paintDetail(filtered.find(e => e.key === st.selected)); navState(); restoreFocus(focus);
  };
  const updateTags = (): void => {
    const counts = new Map<string, number>();
    for (const e of entries) if (!e.locked) for (const tag of new Set(e.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const select = q<HTMLSelectElement>('[data-cx-tag]');
    const html = '<option value="">Add a tag…</option>' + [...counts].sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, count]) => `<option value="${esc(tag)}" ${st.tags.includes(tag) ? 'disabled' : ''}>${esc(tag)} (${count})</option>`).join('');
    if (select.innerHTML !== html) select.innerHTML = html;
  };
  const draw = (): void => {
    const focus = captureSideScreenFocus(root); list?.dispose(); list = undefined; resetPreview(); detailSignature = ''; detailKey = '';
    const section = CODEX_SECTIONS.find(s => s.id === state.section) ?? CODEX_SECTIONS[0];
    const leaf = section.pages.find(p => p.id === state.leaves[section.id]) ?? section.pages[0]; page = leaf.id;
    st = state.pages[page] ??= { query: '', tags: [], status: 'all', selected: null, scroll: 0 };
    entries = codexEntries(opts.account(), page); signature = JSON.stringify(entries);
    const markup = `<div class="cx-head"><header><h1>Codex</h1><p>${esc(leaf.description ?? 'Knowledge that endures across your lives.')}</p></header>
      <nav aria-label="Codex sections" class="cx-sections">${CODEX_SECTIONS.map(s => `<button data-cx-section="${s.id}" aria-current="${section.id === s.id}" tabindex="${section.id === s.id ? 0 : -1}">${esc(s.label)}</button>`).join('')}</nav>
      <nav class="cx-leaves" aria-label="${esc(section.label)} pages" ${section.pages.length === 1 ? 'hidden' : ''}>${section.pages.map(p => `<button data-cx-page="${p.id}" aria-current="${p.id === page}" tabindex="${p.id === page ? 0 : -1}">${esc(p.label)}</button>`).join('')}</nav>
      <div class="cx-tools"><div class="cx-search"><input type="search" data-cx-search aria-label="Search known ${esc(leaf.label.toLocaleLowerCase())}" placeholder="Search names, tags and details…" value="${esc(st.query)}" autocomplete="off" spellcheck="false"><button data-cx-clear-query aria-label="Clear search" title="Clear search">×</button></div>
        <select data-cx-tag aria-label="Add tag filter"></select><select data-cx-status aria-label="Discovery filter"><option value="all">All entries</option><option value="known">Known only</option><option value="locked">Locked only</option></select><button data-cx-clear>Clear filters</button></div>
      <div class="cx-search-summary"><div class="cx-tags"></div><div class="cx-count" role="status" aria-live="polite" aria-atomic="true"></div></div></div>
      <div class="cx-body"><div class="cx-list"><div class="cx-list-meta"></div><div class="cx-grid" role="group" aria-label="${esc(leaf.label)} entries"></div><div class="cx-list-empty" hidden></div></div><article class="cx-detail" aria-label="Selected entry"></article></div>
      <footer class="cx-foot"><span class="cx-help"><kbd>/</kbd> Search <span>·</span> <kbd>↑</kbd><kbd>↓</kbd> Browse <span>·</span> <kbd>Esc</kbd> Back</span><button data-cx-results-footer>Results</button><button data-cx-back>Back</button></footer>`;
    const existing = root.querySelector<HTMLElement>('.codex');
    if (existing) existing.innerHTML = markup;
    else root.innerHTML = `<section class="codex" aria-label="Codex">${markup}</section>`;
    reading(false);
    q('[data-cx-back]').addEventListener('click', opts.back);
    q('[data-cx-results-footer]').addEventListener('click', returnToResults);
    root.querySelectorAll<HTMLElement>('[data-cx-section]').forEach(button => button.addEventListener('click', () => { rememberScroll(); state.section = button.dataset.cxSection!; draw(); }));
    root.querySelectorAll<HTMLElement>('[data-cx-page]').forEach(button => button.addEventListener('click', () => { rememberScroll(); state.leaves[section.id] = button.dataset.cxPage!; draw(); }));
    q<HTMLInputElement>('[data-cx-search]').addEventListener('input', ev => { st.query = (ev.target as HTMLInputElement).value; st.selected = null; filterChanged(); });
    q('[data-cx-clear-query]').addEventListener('click', () => { st.query = ''; q<HTMLInputElement>('[data-cx-search]').value = ''; filterChanged(); q('[data-cx-search]').focus(); });
    q<HTMLSelectElement>('[data-cx-tag]').addEventListener('change', ev => { const select = ev.target as HTMLSelectElement; if (select.value) addTag(select.value); select.value = ''; updateTags(); });
    const status = q<HTMLSelectElement>('[data-cx-status]'); status.value = st.status;
    status.addEventListener('change', () => { st.status = status.value as CodexFilter['status']; filterChanged(); });
    q('[data-cx-clear]').addEventListener('click', resetFilters);
    if (opts.shell) {
      if (root.querySelector(':scope > .side-screen')) refreshSideScreen(root, opts.shell.profile, focus);
      else mountSideScreen(root, opts.shell.profile, opts.shell.context, focus);
    }
    list = mountWindowedGrid(q('.cx-grid'), {
      ...CODEX_CFG.list,
      signature: entry => JSON.stringify(entry),
      render: entry => {
        const card = document.createElement('button');
        card.className = `cx-card${entry.locked ? ' cx-locked' : ''}`; card.dataset.cxEntry = entry.key;
        card.innerHTML = `${icon(entry)}<span><b class="${entry.locked ? 'runescript' : ''}">${esc(entry.title)}</b><small>${esc(entry.state)}</small></span>`;
        return card;
      },
      selected: (card, selected, tabStop) => { card.setAttribute('aria-pressed', String(selected)); card.tabIndex = tabStop ? 0 : -1; },
      paint: opts.paintPortraits,
      scrolled: (top, anchor) => { st.scroll = top; st.anchor = anchor; },
    });
    q('.cx-grid').addEventListener('click', event => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-cx-entry]') : null;
      if (card) selectEntry(card.dataset.cxEntry!, true);
    });
    updateTags(); results(); restoreFocus(focus);
  };
  const onKey = (event: KeyboardEvent): void => {
    if (disposed || root.classList.contains('hidden') || !root.querySelector('.codex')) return;
    const target = event.target instanceof HTMLElement ? event.target : document.activeElement instanceof HTMLElement ? document.activeElement : root;
    const editing = target.matches('input,textarea,select,[contenteditable="true"]');
    const consume = (): void => { event.preventDefault(); event.stopImmediatePropagation(); };
    if ((event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey)
      || (event.key.toLowerCase() === 'f' && (event.ctrlKey || event.metaKey))) {
      consume(); returnToResults(); q<HTMLInputElement>('[data-cx-search]').focus(); q<HTMLInputElement>('[data-cx-search]').select(); return;
    }
    if (event.key === 'Escape') {
      consume(); if (event.repeat) return;
      if (target.matches('[data-cx-search]') && st.query) { st.query = ''; q<HTMLInputElement>('[data-cx-search]').value = ''; filterChanged(); }
      else if (compact() && q('.codex').dataset.cxReading === 'true') returnToResults();
      else opts.back();
      return;
    }
    if (target.matches('[data-cx-search]') && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      consume(); list?.focus(st.selected); if (event.key === 'Enter' && document.activeElement instanceof HTMLButtonElement) document.activeElement.click(); return;
    }
    if (!root.contains(target) || editing) return;
    const tab = target.closest<HTMLElement>('[data-cx-section],[data-cx-page]');
    if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      consume(); const tabs = [...tab.parentElement!.querySelectorAll<HTMLButtonElement>('button')], i = tabs.indexOf(tab as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus({ preventScroll: true }); tabs[next].click();
      requestAnimationFrame(() => { root.querySelector('nav button:focus')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }); return;
    }
    const card = target.closest<HTMLButtonElement>('.cx-card');
    if ((!card && !target.matches('.cx-grid')) || !filtered.length || !list) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) return;
    consume();
    const index = card ? filtered.findIndex(e => e.key === card.dataset.cxEntry) : list.firstVisible;
    const shift = event.key === 'PageDown' ? list.pageStep : event.key === 'PageUp' ? -list.pageStep
      : event.key === 'ArrowDown' ? list.columns : event.key === 'ArrowUp' ? -list.columns : event.key === 'ArrowRight' ? 1 : -1;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : Math.max(0, Math.min(filtered.length - 1, index + shift));
    selectEntry(filtered[next].key, false); list.focus(filtered[next].key);
  };
  window.addEventListener('keydown', onKey, true); draw();
  const timer = window.setInterval(() => {
    if (disposed || root.classList.contains('hidden') || !root.querySelector('.codex')) return;
    const account = opts.account(), next = codexEntries(account, page), sig = JSON.stringify(next);
    if (sig !== signature) { entries = next; signature = sig; results(); updateTags(); }
    const nextKnowledge = [...account.unlockedSkills, ...account.features].join('|');
    if (nextKnowledge !== knowledge) {
      knowledge = nextKnowledge;
      const selected = entries.find(e => e.key === st.selected);
      if (selected?.source?.kind === 'support') preview?.updateHosts(codexSupportHosts(account, selected.source.id));
    }
  }, CODEX_CFG.refreshMs);
  return () => { rememberScroll(); list?.dispose(); disposed = true; clearInterval(timer); window.removeEventListener('keydown', onKey, true); resetPreview(); root.querySelector('.codex')?.remove(); };
}
