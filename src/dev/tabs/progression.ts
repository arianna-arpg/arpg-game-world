import type { DevTabDef } from '../panel';
import { applyDevProgression, devProgressionCatalog, devProgressionOwned, devProgressionReceipt } from '../progression';
import { saveAccount } from '../../meta/persistence';
import { DEV_UI, btn, css, disclosure, hrow, section, textInput } from '../ui';
import { buildAccountTools } from './account';

export const progressionTab: DevTabDef = {
  id: 'progression', label: 'Account',
  build: ctx => {
    const { runActive, flash } = ctx;
    const pane = document.createElement('div');
    pane.dataset.devProgression = '';
    const note = document.createElement('div');
    note.textContent = 'Permanent account grants, saved immediately. Prerequisites are included. Skill trees need both account access and an awakened skill. Use Gems / Items to create test equipment.';
    css(note, { color: DEV_UI.text, fontSize: '11px', marginBottom: '6px' });
    const filter = textInput('Find a milestone, container or Memory…');
    filter.setAttribute('aria-label', 'Filter progression');
    const bar = hrow(), list = document.createElement('div'), scroll = document.createElement('div');
    css(scroll, { overflowY: 'auto', minHeight: '0', flex: '1' });
    const memories = disclosure('Memory awakenings');
    memories.el.dataset.devMemories = '';
    const accountTools = buildAccountTools(ctx);
    scroll.append(list, memories.el, accountTools);
    const apply = (ids: string[]): void => {
      const w = runActive();
      if (!w) { flash('Start a run first.'); return; }
      const result = applyDevProgression(w, ids);
      if (result.ok) saveAccount(w.account); // also saves while the game is paused
      flash(result.message); refresh();
    };
    const learned = (): string[] => {
      const w = runActive();
      const known = new Set([...(w?.meta.knownSkills.keys() ?? []), ...(w?.localSeat.grantedInsts?.keys() ?? [])]);
      return devProgressionCatalog().filter(r => r.memories?.some(m => m.kind === 'skill' && known.has(m.id))).map(r => r.id);
    };
    bar.append(btn('Core access + learned trees', () => apply([
      ...devProgressionCatalog().filter(r => r.core).map(r => r.id), ...learned(),
    ])), btn('Awaken learned skills', () => apply(learned())), btn('Refresh', () => refresh()));
    const renderRows = (target: HTMLElement, rows: ReturnType<typeof devProgressionCatalog>, catalog: ReturnType<typeof devProgressionCatalog>): void => {
      const w = runActive();
      for (const row of rows) {
        const item = hrow(), label = document.createElement('span');
        const owned = !!w && devProgressionOwned(w.account, row, catalog);
        label.textContent = row.label;
        css(label, { flex: '1', minWidth: '160px' });
        item.title = row.description + '\n' + row.id;
        const grant = btn(owned ? 'Granted' : 'Grant', () => apply([row.id]));
        grant.dataset.progressionGrant = row.id;
        grant.disabled = owned || !w;
        css(grant, { opacity: grant.disabled ? '0.55' : '1' });
        if (w?.account.ledger[devProgressionReceipt(row.id)]) label.textContent += ' · dev';
        item.append(label, grant); target.append(item);
      }
    };
    const refresh = (): void => {
      list.replaceChildren();
      memories.body.replaceChildren();
      const query = filter.value.trim().toLowerCase();
      let group = '';
      const catalog = devProgressionCatalog();
      const matches = catalog.filter(row => !query || `${row.label} ${row.id} ${row.group} ${row.description}`.toLowerCase().includes(query));
      const memoryRows = matches.filter(row => row.memories);
      memories.summary.textContent = `Memory awakenings (${memoryRows.length}${query ? ' matches' : ''})`;
      memories.el.hidden = !!query && !memoryRows.length;
      if (memories.el.open) renderRows(memories.body, memoryRows, catalog);
      for (const row of matches.filter(row => !row.memories)) {
        if (row.group !== group) { group = row.group; list.append(section(group)); }
        renderRows(list, [row], catalog);
      }
    };
    memories.el.addEventListener('toggle', refresh);
    filter.addEventListener('input', refresh);
    pane.append(note, bar, filter, scroll);
    return { el: pane, onShow: refresh };
  },
};
