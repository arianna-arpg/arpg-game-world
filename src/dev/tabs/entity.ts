// ---------------------------------------------------------------------------
// DEV TAB: FORGE — the Entity Forge's in-game QA seat. Pick any def (workshop
// rows first — the reason this tab exists — then the whole authored roster),
// spawn it beside the hero through the ordinary World.devGrabSpawn seam at a
// chosen rarity (promoteMonster — the real elite ladder), or jump into the
// full-screen Forge to edit it. The tab is list + verbs only; every editor
// concern lives in dev/entityForge.ts, every store concern in meta/workshop.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { MONSTERS } from '../../data/monsters';
import { isWorkshopId, workshop } from '../../meta/workshop';
import { RARITY_DEFS, type MonsterRarity } from '../../engine/rarity';
import { btn, css, DEV_UI, hrow, listRow, option, section, selectEl, textInput, wireFilter } from '../ui';

interface ForgeHandle { open: (id?: string) => void }
const forgeHandle = (): ForgeHandle | null =>
  ((window as unknown as Record<string, unknown>).__entityForge as ForgeHandle | undefined) ?? null;

export const entityTab: DevTabDef = {
  id: 'entity',
  label: 'Forge',
  build(ctx) {
    const el = document.createElement('div');
    let selId: string | null = null;
    let selRow: HTMLElement | null = null;

    const head = hrow();
    const selLabel = document.createElement('span');
    selLabel.textContent = 'select an entity…';
    css(selLabel, { color: DEV_UI.textDim, flex: '1', minWidth: '80px' });
    const raritySel = selectEl();
    for (const r of Object.keys(RARITY_DEFS)) raritySel.append(option(r, r));

    const spawn = (n: number): void => {
      const w = ctx.runActive();
      if (!w) { ctx.flash('no live run'); return; }
      if (!selId || !MONSTERS[selId]) { ctx.flash('select an entity first'); return; }
      const rarity = raritySel.value as MonsterRarity;
      let ok = 0;
      for (let i = 0; i < n; i++) {
        if (!w.devGrabSpawn(selId)) break;
        ok++;
        const a = w.actors[w.actors.length - 1];
        if (rarity !== 'normal' && a && a.defId === selId) w.promoteMonster(a, rarity);
      }
      ctx.flash(ok ? `spawned ${ok}× ${selId}${rarity !== 'normal' ? ` (${rarity})` : ''}` : `✗ spawn refused (${selId})`);
    };

    head.append(selLabel, raritySel,
      btn('Spawn', () => spawn(1)),
      btn('×5', () => spawn(5)),
      btn('Edit in Forge', () => {
        const f = forgeHandle();
        if (!f) { ctx.flash('forge off (config.ts DEV.entityForge)'); return; }
        f.open(selId ?? undefined);
      }),
      btn('🖌 Glyph Forge', () => {
        const gf = (window as unknown as Record<string, unknown>).__glyphForge as ForgeHandle | undefined;
        if (!gf) { ctx.flash('forge off (config.ts DEV.entityForge)'); return; }
        gf.open();
      }));

    const filter = textInput('filter…');
    const list = document.createElement('div');
    css(list, { overflowY: 'auto', flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' });
    wireFilter(filter, list);

    const select = (id: string, row: HTMLElement): void => {
      if (selRow) selRow.style.outline = 'none';
      selId = id;
      selRow = row;
      row.style.outline = `1px solid ${DEV_UI.accent}`;
      selLabel.textContent = id;
      css(selLabel, { color: DEV_UI.text });
    };

    const rebuild = (): void => {
      list.innerHTML = '';
      selRow = null;
      list.append(section(`WORKSHOP (${workshop.entities.length})`));
      for (const e of workshop.entities) {
        const row = listRow(e.def.name, DEV_UI.accent, e.def.id, () => select(e.def.id, row));
        if (e.def.id === selId) select(e.def.id, row);
        list.append(row);
      }
      list.append(section('AUTHORED'));
      for (const id of Object.keys(MONSTERS).sort()) {
        if (isWorkshopId(id) || id.startsWith('__forge')) continue;
        const d = MONSTERS[id];
        const row = listRow(d.name, d.color, id, () => select(id, row));
        if (id === selId) select(id, row);
        list.append(row);
      }
      filter.dispatchEvent(new Event('input'));
    };

    el.append(head, filter, list);
    return { el, onShow: rebuild };
  },
};
