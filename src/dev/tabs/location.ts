// ---------------------------------------------------------------------------
// DEV TAB: LOCATION — registry-derived world navigation. Every DIMENSION row
// (jump to its gate / first ground, or tear it open through the real
// enterDimension crossing) and every BIOME row (jump to the nearest zone of it
// you've seen, or the nearest you HAVEN'T — minting one from the live heat map
// when none exists yet), plus the plain zone hop and traversal cheats the old
// Dev pane carried (ghost / noclip / kill-all).
//
// The whole tab renders from World.devLocationCatalog() — a new biome or
// dimension registry row appears here with zero edits to this file.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, dot, hrow, section, selectEl, textInput } from '../ui';

export const locationTab: DevTabDef = {
  id: 'location',
  label: 'Location',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    // ---------------------------------------------------------- dimensions --
    const dimHead = section('Dimensions');
    const dimList = document.createElement('div');

    // --------------------------------------------------------------- biomes --
    const biomeHead = section('Biomes');
    const biomeBar = hrow();
    const biomeFilter = textInput('filter biomes…');
    const surpriseBtn = btn('Nearest unexplored biome ▶', () => act(w => w.devTravelToBiome(undefined, 'unexplored')));
    biomeBar.append(biomeFilter, surpriseBtn);
    const biomeList = document.createElement('div');
    css(biomeList, { maxHeight: '220px', overflowY: 'auto' });

    // ------------------------------------------------------------- zone hop --
    const zoneHead = section('Zone hop (no waypoint / locks / combat)');
    const zoneRow = hrow();
    const zoneSel = selectEl();
    zoneSel.style.flex = '1';
    const travelBtn = btn('Travel', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      flash(w.devTravelTo(zoneSel.value) ? `→ ${zoneSel.value}` : 'no such zone');
      refresh();
    });
    zoneRow.append(zoneSel, travelBtn);

    // ------------------------------------------------------------ traversal --
    const cheatHead = section('Traversal & combat cheats');
    const cheatRow = hrow();
    const ghostBtn = btn('Ghost: OFF', () => {
      const w = runActive(); if (!w) return;
      ghostBtn.textContent = `Ghost: ${w.devToggleGhost() ? 'ON' : 'OFF'}`;
    });
    const noclipBtn = btn('Noclip: OFF', () => {
      const w = runActive(); if (!w) return;
      noclipBtn.textContent = `Noclip: ${w.devToggleNoclip() ? 'ON' : 'OFF'}`;
    });
    const killBtn = btn('Kill all enemies', () => {
      const w = runActive(); if (!w) { flash('start a run first'); return; }
      flash(`killed ${w.devKillAll()} enemies`);
    });
    // The hit-surface truth-layer: outlines every blocker's real surface and
    // every flight's drawn-form hit test (engine/shapes.ts + projForms.ts).
    const hitboxBtn = btn('Hitboxes: OFF', () => {
      const w = runActive(); if (!w) return;
      hitboxBtn.textContent = `Hitboxes: ${w.devToggleHitboxes() ? 'ON' : 'OFF'}`;
    });
    cheatRow.append(ghostBtn, noclipBtn, hitboxBtn, killBtn);

    /** Run a travel action, flash its note, and re-render (the graph moved). */
    const act = (fn: (w: NonNullable<ReturnType<typeof runActive>>) => string | null): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const note = fn(w);
      flash(note ?? 'nowhere qualifies (nothing minted, and no field grows it)');
      refresh();
    };

    const refresh = (): void => {
      const w = runActive();
      dimList.innerHTML = '';
      biomeList.innerHTML = '';
      zoneSel.innerHTML = '';
      if (!w) {
        dimList.textContent = 'start a run first';
        css(dimList, { color: DEV_UI.textDim, padding: '2px 4px' });
        return;
      }
      css(dimList, { color: '', padding: '' });
      const cat = w.devLocationCatalog();

      for (const d of cat.dimensions) {
        const row = document.createElement('div');
        css(row, { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 4px', borderRadius: '3px' });
        const name = document.createElement('span');
        name.textContent = d.label;
        css(name, { flex: '1', color: DEV_UI.text });
        const state = document.createElement('span');
        state.textContent = d.here ? 'HERE' : d.discovered ? 'discovered' : 'unexplored';
        css(state, { color: d.here ? DEV_UI.good : d.discovered ? DEV_UI.textDim : DEV_UI.accent, fontSize: '10px' });
        row.append(dot(d.color), name, state);
        if (!d.here && d.reachable) {
          row.append(btn(d.discovered ? 'Go' : 'Breach', () => act(w2 => w2.devTravelToDimension(d.id))));
        }
        dimList.append(row);
      }

      for (const b of cat.biomes) {
        const row = document.createElement('div');
        row.dataset.search = `${b.label} ${b.id} ${b.occursIn.join(' ')}`.toLowerCase();
        css(row, { display: 'flex', gap: '6px', alignItems: 'center', padding: '2px 4px', borderRadius: '3px' });
        const name = document.createElement('span');
        name.textContent = b.label;
        css(name, { flex: '1', color: DEV_UI.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
        name.title = b.id;
        const where = document.createElement('span');
        where.textContent = b.occursIn.length ? b.occursIn.join('·') : 'realm-only';
        css(where, { color: DEV_UI.textDim, fontSize: '10px' });
        const seen = document.createElement('span');
        seen.textContent = `${b.visited}/${b.minted}`;
        seen.title = 'visited / minted zones of this biome';
        css(seen, { color: b.visited ? DEV_UI.good : DEV_UI.textDim, fontSize: '10px', width: '30px', textAlign: 'right' });
        row.append(dot(b.color), name, where, seen);
        const canNew = b.minted - b.visited > 0 || b.occursIn.length > 0;
        if (b.visited > 0) row.append(btn('Seen', () => act(w2 => w2.devTravelToBiome(b.id, 'explored'))));
        if (canNew) row.append(btn('New', () => act(w2 => w2.devTravelToBiome(b.id, 'unexplored'))));
        biomeList.append(row);
      }
      applyFilter();

      for (const z of w.devZoneList()) {
        const o = document.createElement('option');
        o.value = z.id; o.textContent = `${z.name} — lv${z.level}${z.biome ? ' · ' + z.biome : ''}`;
        zoneSel.append(o);
      }
    };

    const applyFilter = (): void => {
      const q = biomeFilter.value.trim().toLowerCase();
      for (const el of Array.from(biomeList.children) as HTMLElement[]) {
        el.style.display = !q || (el.dataset.search ?? '').includes(q) ? 'flex' : 'none';
      }
    };
    biomeFilter.addEventListener('input', applyFilter);

    pane.append(dimHead, dimList, biomeHead, biomeBar, biomeList, zoneHead, zoneRow, cheatHead, cheatRow);
    return { el: pane, onShow: refresh };
  },
};
