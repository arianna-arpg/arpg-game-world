// ---------------------------------------------------------------------------
// DEV TAB: ATLAS — THE DEV LENS's one door (ui/mapLens.ts) + the painter's
// read (ui/atlasPaint.ts). The shipped world map obeys THE KNOWLEDGE LAW
// (only ground the player knows is drawn); development wants the whole
// minted world at once — every node, the whole painted terrain, the ground
// under the cursor — and that view is a LENS the map renders through, never
// world state: nothing it shows is stamped, saved, or sent over the wire.
//
//   THE LENS  — omniscient chart · cursor read (persisted per browser; the
//               shipped page never reads the key, so the lens ships OFF).
//   THE VERBS — rebuild the chart (drop every cached raster), reset the lens.
//   THE READ  — zones total / shown / veiled / walked / surveyed, the cached
//               rasters (px · build ms), the job in flight.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { MAP_LENS, mapLensReset, mapLensRestore, setMapLens } from '../../ui/mapLens';
import { atlasChartReset, atlasStats } from '../../ui/atlasPaint';
import { ATLAS_CFG } from '../../world/atlas';
import { btn, check, css, hrow, section } from '../ui';

const refreshMap = (): void => {
  const g = (window as unknown as { __game?: { ui?: { refreshMap?: () => void } } }).__game;
  g?.ui?.refreshMap?.();
};

export const atlasTab: DevTabDef = {
  id: 'atlas',
  label: 'Atlas',
  build(ctx) {
    mapLensRestore();
    const el = document.createElement('div');

    el.append(section('THE DEV LENS — the world map through development eyes (render-only; never world state)'));
    const omni = check('Omniscient chart — every minted node named, the whole terrain painted, washes unclipped, far extents in the fit', MAP_LENS.omniscient);
    const read = check('Cursor read — a strip under the layer chips: biome · elevation · climate words · features under the pointer', MAP_LENS.cursorRead);
    omni.box.addEventListener('change', () => {
      setMapLens({ omniscient: omni.box.checked });
      ctx.flash(omni.box.checked ? 'lens: omniscient chart ON (press M)' : 'lens: the honest chart');
      refreshMap(); sync();
    });
    read.box.addEventListener('change', () => {
      setMapLens({ cursorRead: read.box.checked });
      ctx.flash(read.box.checked ? 'lens: cursor read ON' : 'lens: cursor read off');
      refreshMap(); sync();
    });
    el.append(omni.el, read.el);

    el.append(section('THE VERBS'));
    const verbs = hrow();
    verbs.append(
      btn('Rebuild chart', () => { atlasChartReset(); refreshMap(); ctx.flash('atlas: every raster dropped — rebuilding'); sync(); }),
      btn('Reset lens', () => { mapLensReset(); omni.box.checked = false; read.box.checked = false; refreshMap(); ctx.flash('lens reset'); sync(); }),
    );
    el.append(verbs);

    el.append(section('THE READ'));
    const stats = document.createElement('div');
    css(stats, { fontSize: '11px', color: '#b8b4a8', whiteSpace: 'pre-wrap', lineHeight: '1.5' });
    el.append(stats);
    const dials = document.createElement('div');
    css(dials, { fontSize: '10px', color: '#8a8678', marginTop: '8px' });
    dials.textContent = `dials: raster ${ATLAS_CFG.raster.maxPx}px · lattice ${ATLAS_CFG.raster.lattice}px · budget ${ATLAS_CFG.raster.budgetMs}ms · `
      + `veil ${ATLAS_CFG.reveal.radius}+${ATLAS_CFG.reveal.feather}u · zoom window from ${ATLAS_CFG.raster.zoomWindowFrom}× · cache ${ATLAS_CFG.raster.cacheEntries} — world/atlas.ts ATLAS_CFG`;
    el.append(dials);

    const sync = (): void => {
      omni.box.checked = MAP_LENS.omniscient;
      read.box.checked = MAP_LENS.cursorRead;
      const w = ctx.runActive();
      let line = '';
      if (w) {
        const all = Object.values(w.zoneMap);
        const shown = all.filter(z => w.visible(z)).length;
        const veiled = all.filter(z => z.veiled).length;
        line += `zones: ${all.length} minted · ${shown} shown by the knowledge law · ${veiled} veiled · ${w.visited.size} walked · ${w.surveyed.size} surveyed\n`;
      } else line += 'no live run — the lens still applies when one stands\n';
      const st = atlasStats();
      line += `rasters cached: ${st.cached.length}` + (st.cached.length ? ' — ' + st.cached.map(c => `${c.key.split('|')[0]} ${c.px}px ${c.ms}ms`).join(' · ') : '');
      line += st.building ? `\nbuilding: ${st.building.split('|')[0]} ${Math.round(st.progress * 100)}%` : '\nbuilding: nothing';
      stats.textContent = line;
    };
    sync();
    return { el, onShow: sync };
  },
};
