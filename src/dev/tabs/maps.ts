// ---------------------------------------------------------------------------
// DEV TAB: MAPS — the Map Forge's in-game QA seat (engine/authoredMaps.ts).
// Pick any authored map (atlas rows first — the reason this tab exists — then
// the shipped roster), MINT & WALK it beside the hero through the ordinary
// World.mintAuthoredZone seam at a chosen level, RE-MINT the zone underfoot
// after an edit (the one-shot memory forget), or jump into the full-screen
// Forge to edit it. The tab is list + verbs only; every editor concern lives
// in dev/mapForge.ts, every store concern in meta/atlas.ts.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { AUTHORED_MAPS, authoredMapIds, mapPixelSize } from '../../engine/authoredMaps';
import { atlas, isAtlasId } from '../../meta/atlas';
import { btn, css, DEV_UI, hrow, listRow, numInput, section, textInput, wireFilter } from '../ui';

interface MapForgeHandle { open: (id?: string) => void }
const forgeHandle = (): MapForgeHandle | null =>
  ((window as unknown as Record<string, unknown>).__mapForge as MapForgeHandle | undefined) ?? null;

export const mapsTab: DevTabDef = {
  id: 'maps',
  label: 'Maps',
  build(ctx) {
    const el = document.createElement('div');
    let selId: string | null = null;
    let selRow: HTMLElement | null = null;

    const head = hrow();
    const selLabel = document.createElement('span');
    selLabel.textContent = 'select a map…';
    css(selLabel, { color: DEV_UI.textDim, flex: '1', minWidth: '80px' });
    const levelIn = numInput(0, 0, 99, '52px');
    levelIn.title = 'mint level (0 = the hero\'s)';
    head.append(selLabel, levelIn,
      btn('▶ Mint & Walk', () => {
        const w = ctx.runActive();
        if (!w) { ctx.flash('no live run'); return; }
        if (!selId || !AUTHORED_MAPS[selId]) { ctx.flash('select a map first'); return; }
        const lvl = Number(levelIn.value) || undefined;
        const zid = w.devMintAuthored(selId, lvl ? { level: lvl } : undefined);
        ctx.flash(zid ? `minted ${selId} → ${zid} (walked in)` : `✗ mint refused (${selId})`);
      }),
      btn('↻ Re-mint here', () => {
        const w = ctx.runActive();
        if (!w) { ctx.flash('no live run'); return; }
        const here = w.devAuthoredMapHere();
        if (!here) { ctx.flash('the zone underfoot is not an authored map'); return; }
        ctx.flash(w.devRemintZone() ? `re-minted ${here} from its def (memory dropped)` : '✗ re-mint refused');
      }),
      btn('🗺 Edit in Map Forge', () => {
        const f = forgeHandle();
        if (!f) { ctx.flash('map forge off (config.ts DEV.mapForge, or ?dev)'); return; }
        f.open(selId ?? undefined);
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
      const sub = (id: string): string => {
        const m = AUTHORED_MAPS[id];
        const s = mapPixelSize(m);
        return `${m.tileset} · ${m.cols}×${m.rows} (${s.w}×${s.h}) · ${(m.objective ?? { kind: 'clear' }).kind}${m.bounty ? ' · bounty' : ''}`;
      };
      list.append(section(`ATLAS (${atlas.maps.length})`));
      for (const m of atlas.maps) {
        const row = listRow(m.name, DEV_UI.accent, sub(m.id), () => select(m.id, row));
        if (m.id === selId) select(m.id, row);
        list.append(row);
      }
      list.append(section('SHIPPED'));
      for (const id of authoredMapIds()) {
        if (isAtlasId(id) || id.startsWith('__forge')) continue;
        const row = listRow(AUTHORED_MAPS[id].name, DEV_UI.heading, sub(id), () => select(id, row));
        if (id === selId) select(id, row);
        list.append(row);
      }
      const w = ctx.runActive();
      const here = w?.devAuthoredMapHere();
      if (here) {
        const note = document.createElement('div');
        note.textContent = `standing in authored map '${here}' — Re-mint reloads it from its def`;
        css(note, { color: DEV_UI.good, fontSize: '10px', padding: '4px 2px' });
        list.append(note);
      }
      filter.dispatchEvent(new Event('input'));
    };

    el.append(head, filter, list);
    return { el, onShow: rebuild };
  },
};
