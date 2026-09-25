// ---------------------------------------------------------------------------
// DEV TAB: MONSTERS — the Entity Forge's in-game QA seat. Pick any def (workshop
// rows first — the reason this tab exists — then the whole authored roster),
// spawn it beside the hero through the shared spawnDevMonsters seam at a
// chosen rarity (promoteMonster — the real elite ladder), or jump into the
// full-screen Forge to edit it. The tab is list + verbs only; every editor
// concern lives in dev/entityForge.ts, every store concern in meta/workshop.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { MONSTERS } from '../../data/monsters';
import { isWorkshopId, workshop } from '../../meta/workshop';
import { RARITY_DEFS, type MonsterRarity } from '../../engine/rarity';
import { btn, css, DEV_UI, hrow, listRow, numInput, option, section, selectEl, textInput, wireFilter } from '../ui';
import { DEV_MONSTER_SPAWN, spawnDevMonsters } from '../monsterSpawn';

interface ForgeHandle { open: (id?: string) => void }
const forgeHandle = (): ForgeHandle | null =>
  ((window as unknown as Record<string, unknown>).__entityForge as ForgeHandle | undefined) ?? null;

export const entityTab: DevTabDef = {
  id: 'entity',
  label: 'Monsters',
  build(ctx) {
    const el = document.createElement('div');
    el.dataset.devMonsters = '';
    let selId: string | null = null;
    let selRow: HTMLElement | null = null;

    const head = hrow();
    const selLabel = document.createElement('span');
    selLabel.textContent = 'select an entity…';
    css(selLabel, { color: DEV_UI.textDim, flex: '1', minWidth: '80px' });
    const raritySel = selectEl();
    raritySel.setAttribute('aria-label', 'Monster rarity');
    for (const [id, r] of Object.entries(RARITY_DEFS)) raritySel.append(option(id, r.label || 'Normal'));
    const level = numInput(1, DEV_MONSTER_SPAWN.minLevel, DEV_MONSTER_SPAWN.maxLevel);
    level.setAttribute('aria-label', 'Monster level');
    const count = numInput(1, 1, DEV_MONSTER_SPAWN.maxCount);
    count.setAttribute('aria-label', 'Monster quantity');
    let levelChosen = false;
    level.addEventListener('input', () => { levelChosen = true; });

    const spawn = (): void => {
      const w = ctx.runActive();
      if (!w) { ctx.flash('no live run'); return; }
      if (!selId || !MONSTERS[selId]) { ctx.flash('select an entity first'); return; }
      ctx.flash(spawnDevMonsters(w, { id: selId, level: Number(level.value),
        rarity: raritySel.value as MonsterRarity, count: Number(count.value) }).message);
    };

    head.append(selLabel);
    const controls = hrow();
    const spawnBtn = btn('Spawn', spawn); spawnBtn.dataset.devMonsterSpawn = '';
    controls.append('Level', level, btn('= player', () => {
      const w = ctx.runActive(); if (w) { level.value = String(w.player.level); levelChosen = true; }
    }), 'Rarity', raritySel, 'Qty', count, spawnBtn);
    const editors = hrow();
    editors.append(
      btn('Edit in Forge', () => {
        const f = forgeHandle();
        if (!f) { ctx.flash('forge off (config.ts DEV.entityForge, or ?dev=forges — the launcher\'s Forges toggle)'); return; }
        f.open(selId ?? undefined);
      }),
      btn('🖌 Glyph Forge', () => {
        const gf = (window as unknown as Record<string, unknown>).__glyphForge as ForgeHandle | undefined;
        if (!gf) { ctx.flash('forge off (config.ts DEV.entityForge, or ?dev=forges — the launcher\'s Forges toggle)'); return; }
        gf.open();
      }));

    const filter = textInput('Find a monster by name, id or faction…');
    filter.setAttribute('aria-label', 'Filter monsters');
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
      if (!levelChosen && ctx.runActive()) level.value = String(ctx.runActive()!.player.level);
      selRow = null;
      list.append(section(`WORKSHOP (${workshop.entities.length})`));
      for (const e of workshop.entities) {
        const row = listRow(e.def.name, DEV_UI.accent, e.def.id, () => select(e.def.id, row));
        row.dataset.devMonster = e.def.id;
        if (e.def.id === selId) select(e.def.id, row);
        list.append(row);
      }
      list.append(section('AUTHORED'));
      for (const id of Object.keys(MONSTERS).sort()) {
        if (isWorkshopId(id) || id.startsWith('__forge')) continue;
        const d = MONSTERS[id];
        const row = listRow(d.name, d.color, `${id}${d.faction ? ' · ' + d.faction : ''}`, () => select(id, row));
        row.dataset.devMonster = id;
        if (id === selId) select(id, row);
        list.append(row);
      }
      filter.dispatchEvent(new Event('input'));
    };

    el.append(head, controls, editors, filter, list);
    return { el, onShow: rebuild };
  },
};
