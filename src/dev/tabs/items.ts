// ---------------------------------------------------------------------------
// DEV TAB: ITEMS — the item generator. Pick a base (or a unique), an item
// level, rarity, exact affix families + tiers, roll quality, and sockets;
// preview the exact tooltip the game would render; drop the result at your
// feet through the REAL ground-drop path (pickup, announce, tetris bag).
//
// Everything here is REGISTRY-DERIVED — bases/categories from ITEM_BASES,
// uniques from UNIQUE_LIST, affix pools from affixPoolsFor (the same
// tag-gated pools drops roll from), rarities from ITEM_RARITY_IDS — so new
// content rows appear in this tool the moment they exist, no edits here.
// Minting goes through engine/itemgen forgeItem/rollItem: this tab owns DOM
// and zero item logic.
// ---------------------------------------------------------------------------

import { ITEM_BASES } from '../../data/itembases';
import { UNIQUE_LIST } from '../../data/uniques';
import {
  affixPoolsFor, describeItem, forgeItem, rollItem, type ForgeItemOpts,
} from '../../engine/itemgen';
import {
  ITEM_CFG, ITEM_RARITY_IDS, socketCap,
  type AffixDef, type ItemRarity,
} from '../../engine/items';
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, check, css, hrow, numInput, option, section, selectEl, textInput } from '../ui';

const ALL_CATEGORIES = '(all)';
const NATURAL = '';

export const itemsTab: DevTabDef = {
  id: 'items',
  label: 'Items',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto', gap: '2px' });

    // ------------------------------------------------------------ controls --
    const rowA = hrow();
    const catSel = selectEl();
    const baseSel = selectEl();
    baseSel.style.flex = '1';
    rowA.append(catSel, baseSel);

    const rowB = hrow();
    const ilvlIn = numInput(8, 1, 99);
    const ilvlBtn = btn('= player lvl', () => {
      const w = runActive();
      if (w) { ilvlIn.value = String(w.player.level); onState(); }
    });
    const raritySel = selectEl();
    for (const r of ITEM_RARITY_IDS) raritySel.append(option(r, r));
    raritySel.value = 'rare';
    const qualitySel = selectEl();
    qualitySel.append(
      option(NATURAL, 'rolls: random'), option('1', 'rolls: max'),
      option('0.5', 'rolls: mid'), option('0', 'rolls: min'));
    const sockSel = selectEl();
    rowB.append(ilvlIn, ilvlBtn, raritySel, qualitySel, sockSel);

    const uniqueRow = hrow();
    const uniqueSel = selectEl();
    uniqueSel.style.flex = '1';
    uniqueRow.append(uniqueSel);

    const flagsRow = hrow('10px');
    const fill = check('fill remaining affix slots randomly', true);
    const superior = check('superior (common only)', false);
    flagsRow.append(fill.el, superior.el);

    // ---------------------------------------------------------- affix picker --
    const affixHead = section('Affixes');
    const affixFilter = textInput('filter affixes…');
    const affixFilterRow = hrow();
    affixFilterRow.append(affixFilter);
    const affixWrap = document.createElement('div');
    css(affixWrap, { display: 'flex', gap: '8px', maxHeight: '180px', minHeight: '0' });
    const cols: Record<'prefix' | 'suffix', { head: HTMLElement; list: HTMLElement }> = {
      prefix: mkCol('Prefixes'), suffix: mkCol('Suffixes'),
    };
    affixWrap.append(colWrap(cols.prefix), colWrap(cols.suffix));

    function mkCol(title: string): { head: HTMLElement; list: HTMLElement } {
      const head = document.createElement('div');
      head.textContent = title;
      css(head, { color: DEV_UI.heading, fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' });
      const list = document.createElement('div');
      css(list, { overflowY: 'auto', flex: '1', minHeight: '0' });
      return { head, list };
    }
    function colWrap(c: { head: HTMLElement; list: HTMLElement }): HTMLElement {
      const w = document.createElement('div');
      css(w, { flex: '1', display: 'flex', flexDirection: 'column', minWidth: '0', minHeight: '0' });
      w.append(c.head, c.list);
      return w;
    }

    /** Chosen affixes: id → tier index ('' = best ilvl-legal). Survives
     *  ilvl/rarity edits; cleared when the base changes (pools differ). */
    const picks = new Map<string, string>();

    // ------------------------------------------------------------- preview --
    const previewHead = section('Preview');
    const preview = document.createElement('div');
    css(preview, {
      border: `1px solid ${DEV_UI.borderDim}`, borderRadius: '4px', padding: '6px 8px',
      font: DEV_UI.fontSmall, lineHeight: '1.5', minHeight: '40px', whiteSpace: 'pre-wrap',
    });

    const actions = hrow();
    actions.append(
      btn('Drop at feet', () => drop(1)),
      btn('Drop ×5', () => drop(5)),
      btn('Reroll preview', () => onState()),
      btn('Pure random drop @ ilvl', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        const item = rollItem({ ilvl: ilvlOf() });
        if (!item) { flash('roll failed (empty pool?)'); return; }
        w.dropGearAt(w.player.pos, item);
        flash(`dropped ${item.name} (${item.rarity}, ilvl ${item.ilvl}) — the kill-path lottery`);
      }),
    );

    // -------------------------------------------------------------- state ---
    const ilvlOf = (): number => Math.max(1, parseInt(ilvlIn.value, 10) || 1);
    const rarityOf = (): ItemRarity => (raritySel.value as ItemRarity) ?? 'rare';
    const baseOf = (): string => baseSel.value;

    const rebuildCategories = (): void => {
      const prev = catSel.value;
      catSel.innerHTML = '';
      catSel.append(option(ALL_CATEGORIES, ALL_CATEGORIES));
      for (const cat of [...new Set(Object.values(ITEM_BASES).map(b => b.category))]) {
        catSel.append(option(cat, cat));
      }
      if ([...catSel.options].some(o => o.value === prev)) catSel.value = prev;
    };

    const rebuildBases = (): void => {
      const prev = baseSel.value;
      baseSel.innerHTML = '';
      const cat = catSel.value;
      const bases = Object.values(ITEM_BASES)
        .filter(b => cat === ALL_CATEGORIES || b.category === cat);
      for (const b of bases) {
        // dropWeight-0 bases (monster-infrequent themes) still forge — mark them.
        baseSel.append(option(b.id, `${b.name} · ${b.category}${b.dropWeight > 0 ? '' : ' · themed'}`));
      }
      if ([...baseSel.options].some(o => o.value === prev)) baseSel.value = prev;
    };

    const rebuildUniques = (): void => {
      const prev = uniqueSel.value;
      uniqueSel.innerHTML = '';
      uniqueSel.append(option(NATURAL, '(weighted unique for base + ilvl)'));
      for (const u of UNIQUE_LIST) {
        const base = ITEM_BASES[u.baseId];
        uniqueSel.append(option(u.id, `${u.name} — ${base?.name ?? u.baseId}${u.minIlvl ? ` · i${u.minIlvl}+` : ''}`));
      }
      if ([...uniqueSel.options].some(o => o.value === prev)) uniqueSel.value = prev;
    };

    const rebuildSockets = (): void => {
      const prev = sockSel.value;
      sockSel.innerHTML = '';
      sockSel.append(option(NATURAL, 'sockets: natural'));
      const cap = ITEM_BASES[baseOf()] ? socketCap(ITEM_BASES[baseOf()].category) : 0;
      for (let n = 0; n <= cap; n++) sockSel.append(option(String(n), `sockets: ${n}`));
      if ([...sockSel.options].some(o => o.value === prev)) sockSel.value = prev;
    };

    const capsOf = (): { prefixes: number; suffixes: number } => ITEM_CFG.affixSlots[rarityOf()];

    const rebuildAffixes = (): void => {
      const base = ITEM_BASES[baseOf()];
      const rarity = rarityOf();
      const caps = capsOf();
      const showPicker = !!base && (caps.prefixes + caps.suffixes > 0) && rarity !== 'unique';
      for (const el of [affixHead, affixFilterRow, affixWrap]) el.style.display = showPicker ? '' : 'none';
      affixWrap.style.display = showPicker ? 'flex' : 'none';
      if (!showPicker) return;
      const pools = affixPoolsFor(base);
      const counts = { prefix: 0, suffix: 0 };
      for (const kind of ['prefix', 'suffix'] as const) {
        const pool = kind === 'prefix' ? pools.prefix : pools.suffix;
        const cap = kind === 'prefix' ? caps.prefixes : caps.suffixes;
        const col = cols[kind];
        col.list.innerHTML = '';
        for (const def of pool) {
          if (picks.has(def.id)) counts[kind]++;
          col.list.append(affixRow(def, kind, cap, counts));
        }
        col.head.textContent = `${kind === 'prefix' ? 'Prefixes' : 'Suffixes'} ${counts[kind]}/${cap} · ${pool.length} families`;
      }
      applyAffixFilter();
    };

    const affixRow = (def: AffixDef, kind: 'prefix' | 'suffix', cap: number, counts: { prefix: number; suffix: number }): HTMLElement => {
      const row = document.createElement('div');
      const statSummary = [...new Set(def.lines.map(l => l.stat))].join(' / ');
      row.dataset.search = `${def.names.join(' ')} ${statSummary} ${def.id}`.toLowerCase();
      css(row, { display: 'flex', gap: '4px', alignItems: 'center', padding: '1px 2px', borderRadius: '3px' });
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = picks.has(def.id);
      const tierSel = selectEl();
      css(tierSel, { fontSize: '10px', padding: '1px' });
      tierSel.append(option(NATURAL, 'auto'));
      def.tiers.forEach((t, i) => {
        tierSel.append(option(String(i), `#${i + 1} i${t.ilvl}${t.magicOnly ? ' EX' : ''}`));
      });
      if (picks.has(def.id)) tierSel.value = picks.get(def.id) ?? NATURAL;
      tierSel.style.display = box.checked ? '' : 'none';
      const label = document.createElement('span');
      label.innerHTML = `<span style="color:${DEV_UI.text}">${def.names[0] ?? def.id}</span> <span style="color:${DEV_UI.textDim};font-size:10px">${statSummary}</span>`;
      css(label, { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1', fontSize: '11px' });
      label.title = `${def.id} · ${def.tiers.length} tiers`;
      box.addEventListener('change', () => {
        if (box.checked) {
          if (counts[kind] >= cap) { box.checked = false; flash(`${kind} cap reached (${cap}) for ${rarityOf()}`); return; }
          picks.set(def.id, tierSel.value);
        } else picks.delete(def.id);
        rebuildAffixes();
        onState();
      });
      tierSel.addEventListener('change', () => { picks.set(def.id, tierSel.value); onState(); });
      row.append(box, tierSel, label);
      return row;
    };

    const applyAffixFilter = (): void => {
      const q = affixFilter.value.trim().toLowerCase();
      for (const col of [cols.prefix.list, cols.suffix.list]) {
        for (const el of Array.from(col.children) as HTMLElement[]) {
          el.style.display = !q || (el.dataset.search ?? '').includes(q) ? 'flex' : 'none';
        }
      }
    };
    affixFilter.addEventListener('input', applyAffixFilter);

    const forgeOpts = (): ForgeItemOpts => {
      const rarity = rarityOf();
      const q = qualitySel.value === NATURAL ? undefined : Number(qualitySel.value);
      const opts: ForgeItemOpts = { ilvl: ilvlOf(), rarity, quality: q };
      if (rarity === 'unique' && uniqueSel.value !== NATURAL) opts.uniqueId = uniqueSel.value;
      else opts.baseId = baseOf();
      if (rarity === 'magic' || rarity === 'rare') {
        opts.affixes = [...picks.entries()].map(([id, tier]) => (
          tier === NATURAL ? { id } : { id, tier: Number(tier) }));
        opts.fillRandom = fill.box.checked;
      }
      if (rarity === 'common') opts.superior = superior.box.checked;
      if (sockSel.value !== NATURAL) opts.sockets = Number(sockSel.value);
      return opts;
    };

    /** rarity 'unique' without a pinned legend needs the weighted pick —
     *  that path lives in rollItem, so route there (forceable via base). */
    const mint = (): ReturnType<typeof forgeItem> => {
      const opts = forgeOpts();
      if (opts.rarity === 'unique' && !opts.uniqueId) {
        return rollItem({ ilvl: opts.ilvl, rarity: 'unique', baseId: opts.baseId });
      }
      return forgeItem(opts);
    };

    const renderPreview = (): void => {
      const item = mint();
      if (!item) {
        preview.innerHTML = `<span style="color:${DEV_UI.textDim}">nothing forgeable — no unique fits this base at this ilvl, or the base is unknown</span>`;
        return;
      }
      const d = describeItem(item);
      const dim = (t: string): string => `<div style="color:${DEV_UI.textDim}">${t}</div>`;
      const lines: string[] = [
        `<div style="color:${d.color};font-weight:bold">${d.title}</div>`,
        dim(d.baseLine), dim(d.reqLine),
        ...d.defense.map(t => `<div${t.augmented ? ' style="color:#8fa3e8"' : ''}>${t.text}</div>`),
        ...d.implicit.map(t => `<div style="color:#9ab0d0">${t}</div>`),
        ...d.affix.map(a => `<div>${a.text} <span style="color:${DEV_UI.textDim};font-size:10px">${a.tag}</span></div>`),
        ...d.unique.map(t => `<div style="color:#d0a050">${t}</div>`),
        ...(d.sockets ?? []).map(s => `<div><span style="color:${s.color}">${s.glyph}</span> ${s.name}</div>`),
        ...(d.epitaph ? [`<div style="color:#c080ff">${d.epitaph.name}: ${d.epitaph.lines.join(' · ')}</div>`] : []),
        ...(d.flavor ? [`<div style="color:${DEV_UI.textDim};font-style:italic">${d.flavor}</div>`] : []),
        `<div style="color:${DEV_UI.textDim};font-size:10px">${qualitySel.value === NATURAL ? 'rolls randomize per drop' : 'rolls pinned'} · uid ${item.uid}</div>`,
      ];
      preview.innerHTML = lines.join('');
    };

    const drop = (n: number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      let last: string | null = null;
      let made = 0;
      for (let i = 0; i < n; i++) {
        const item = mint();
        if (!item) break;
        w.dropGearAt(w.player.pos, item);
        last = item.name; made++;
      }
      flash(made ? `dropped ${made > 1 ? made + '× — last: ' : ''}${last}` : 'forge failed (see preview)');
    };

    const onState = (): void => { rebuildSockets(); rebuildAffixes(); renderPreview(); };
    catSel.addEventListener('change', () => { rebuildBases(); picks.clear(); onState(); });
    baseSel.addEventListener('change', () => { picks.clear(); onState(); });
    raritySel.addEventListener('change', () => {
      uniqueRow.style.display = rarityOf() === 'unique' ? '' : 'none';
      flagsRow.style.display = rarityOf() === 'unique' ? 'none' : '';
      onState();
    });
    uniqueSel.addEventListener('change', () => {
      // A pinned legend dictates its base — sync the pickers so the preview reads true.
      const u = UNIQUE_LIST.find(x => x.id === uniqueSel.value);
      if (u && ITEM_BASES[u.baseId]) {
        catSel.value = ALL_CATEGORIES;
        rebuildBases();
        baseSel.value = u.baseId;
      }
      onState();
    });
    for (const el of [ilvlIn, qualitySel, sockSel]) el.addEventListener('change', onState);
    for (const c of [fill, superior]) c.box.addEventListener('change', onState);

    pane.append(rowA, rowB, uniqueRow, flagsRow, affixHead, affixFilterRow, affixWrap, previewHead, preview, actions);

    const onShow = (): void => {
      // Registry-derived rebuilds — new bases/uniques/affixes appear here the
      // moment their data rows exist.
      rebuildCategories();
      rebuildBases();
      rebuildUniques();
      uniqueRow.style.display = rarityOf() === 'unique' ? '' : 'none';
      flagsRow.style.display = rarityOf() === 'unique' ? 'none' : '';
      onState();
    };
    onShow();
    return { el: pane, onShow };
  },
};
