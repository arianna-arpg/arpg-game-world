// ---------------------------------------------------------------------------
// DEV TAB: GEYSERS — the Scald Basin M0 walk kit (engine/geysers.ts).
//
// Three duties, all QA-only:
//   MINT    — stand up a fresh geyser_fields zone through the REAL mint path
//             (devMintTileset — the perf sweep's own lane) and travel there.
//             The face is deliberately off the frontier field until M1's
//             biome row, so this button IS its door.
//   THE A/B — her ruled lever (charter §3): flip the live zone between THE
//             CURRENT BANDS ('bands', the default — every vent in a band
//             erupts together on the band's mint-rolled clock) and the
//             per-vent POLYRHYTHM ('solo') it replaced. Both clock sets are
//             rolled at mint, so the flip re-rolls NOTHING — the same
//             field, read through the other pure function, live.
//   READOUT — the field's dealt shape (bands, clocks, vents per class) +
//             each band's next-burst countdown, straight off the resolver.
// ---------------------------------------------------------------------------

import { fieldSurgePeriod, GEYSER_CFG, ventReadAt, type GeyserClassId } from '../../engine/geysers';
import { devSummonPilgrimage } from '../../data/pilgrimage'; // THE TERRACE PILGRIMAGE dev lever (M3 coda)
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, hrow, section, textInput } from '../ui';

export const geysersTab: DevTabDef = {
  id: 'geysers',
  label: 'Geysers',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    // ------------------------------------------------------------- mint --
    const mintHead = section('The spike face (mint by name — off-frontier until M1)');
    const mintRow = hrow();
    const lvlIn = textInput('level (8)');
    lvlIn.style.width = '70px';
    let spread = 0;
    const mintBtn = btn('Mint geyser_fields ▶', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const lvl = Math.max(1, parseInt(lvlIn.value, 10) || 8);
      const id = w.devMintTileset('geyser_fields', spread++, lvl);
      flash(id ? `→ ${w.zone.name} (lv${lvl})` : 'mint failed');
      refresh();
    });
    mintRow.append(mintBtn, lvlIn);

    // ---------------------------------------------------------- the A/B --
    const abHead = section('The clock (her walk compares these live)');
    const abRow = hrow();
    const abBtn = btn('…', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.geyserMode = w.geyserMode === 'bands' ? 'solo' : 'bands';
      flash(w.geyserMode === 'bands'
        ? 'CURRENT BANDS — a band surges together (her ruled default)'
        : 'PER-VENT POLYRHYTHM — every vent keeps its own count');
      refresh();
    });
    abRow.append(abBtn);
    const abNote = document.createElement('div');
    abNote.textContent = 'Both clock sets are mint-rolled — the flip re-rolls nothing.';
    css(abNote, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    // ------------------------------------------------------ the surge --
    // THE SURGE HOUR (M3 coda — GEYSER_CFG.surge): the long clock's readout
    // + a FORCE lever (World.geyserSurgeForce — dev-only, the A/B lever's
    // sibling) so her walk meets the tide at will: vents align on the
    // zone-wide beat, the steam thickens, the wisps pour off the vents.
    const surgeHead = section('The surge hour (her cascade — force it to meet the tide)');
    const surgeRow = hrow();
    const surgeBtn = btn('…', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const s = w.geyserSurge();
      if (!s) { flash('no geyser field in this zone'); return; }
      w.geyserSurgeForce(!s.forced);
      flash(!s.forced ? 'SURGE FORCED — the vents align on the tide' : 'surge released — the long clock reads again');
      refresh();
    });
    surgeRow.append(surgeBtn);
    const surgeNote = document.createElement('div');
    surgeNote.textContent = 'Windows are pure f(world clock, zone key): seats + resumes agree. The force is dev-only.';
    css(surgeNote, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    // ----------------------------------------------------- the pilgrimage --
    // THE TERRACE PILGRIMAGE (M3 coda — data/pilgrimage.ts): stage the
    // lantern line on THIS zone right now — a forced FUTURE surge window
    // seated where the walk fits, the column stood up directly (no beat, no
    // row draw) so her walk sees the climb, the brim, the offerings and the
    // surge it cues without waiting out the long clock. The run hands the
    // forced window back when it ends.
    const pilgrimHead = section('The terrace pilgrimage (stage the lantern line now)');
    const pilgrimRow = hrow();
    const pilgrimBtn = btn('Summon the pilgrimage ▶', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      flash(devSummonPilgrimage(w));
      refresh();
    });
    pilgrimRow.append(pilgrimBtn);
    const pilgrimNote = document.createElement('div');
    pilgrimNote.textContent = 'The line climbs to the loudest vent and arrives as the (forced) surge opens — the cue law, on demand.';
    css(pilgrimNote, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    // ---------------------------------------------------------- readout --
    const fieldHead = section('The dealt field');
    const readout = document.createElement('div');
    css(readout, { whiteSpace: 'pre', font: '11px/1.6 Consolas, monospace', padding: '2px 4px' });
    const refreshBtn = btn('Refresh countdowns', () => refresh());

    const refresh = (): void => {
      const w = runActive();
      abBtn.textContent = w
        ? (w.geyserMode === 'bands' ? 'Clock: CURRENT BANDS  (tap → solo)' : 'Clock: PER-VENT POLYRHYTHM  (tap → bands)')
        : 'Clock: —';
      if (!w) { readout.textContent = 'start a run first'; return; }
      const f = w.geysers;
      if (!f) { readout.textContent = 'no geyser field in this zone — mint one above'; return; }
      const byCls: Record<GeyserClassId, number> = { hiss: 0, geyser: 0, great: 0 };
      for (const v of f.vents) byCls[v.cls]++;
      const lines: string[] = [];
      lines.push(`vents  hiss ${byCls.hiss}  geyser ${byCls.geyser}  great ${byCls.great}   mode ${w.geyserMode}`);
      lines.push(`bands  ${f.bands.length} dealt (${f.banding.n} shared stripes @ ${GEYSER_CFG.band.stripeW}u, bearing ${(f.banding.theta * 180 / Math.PI).toFixed(0)}°)`);
      const s = w.geyserSurge();
      surgeBtn.textContent = s?.forced ? 'Surge: FORCED  (tap → release)' : 'Surge: long clock  (tap → force)';
      if (s) {
        lines.push(s.held
          ? `surge  HOLDING${s.forced ? ' (forced)' : ''} — tide period ${fieldSurgePeriod(f).toFixed(1)}s, ${s.forced ? 'until released' : (s.t1 - w.time).toFixed(0) + 's left'}`
          : `surge  quiet — next in ${s.next !== null ? (s.next - w.time).toFixed(0) + 's' : '?'} (every ${GEYSER_CFG.surge.every}s, dwell ${GEYSER_CFG.surge.dwell}s)`);
      }
      for (let b = 0; b < f.bands.length; b++) {
        const members = f.vents.filter(v => v.band === b);
        if (!members.length) { lines.push(` band ${b}  period ${f.bands[b].period.toFixed(1)}s  (empty)`); continue; }
        const read = ventReadAt(f, members[0], w.time, w.geyserMode);
        const kinds = members.map(v => v.cls[0]).join('');
        const anchor = b >= f.banding.n ? ' ⚓' : '';
        lines.push(` band ${b}${anchor}  period ${f.bands[b].period.toFixed(1)}s  ${members.length} vent${members.length > 1 ? 's' : ''} [${kinds}]  next ${read.phase === 'erupt' ? 'NOW' : read.toBurst.toFixed(1) + 's'}${read.phase === 'broil' ? ' (broiling)' : ''}`);
      }
      readout.textContent = lines.join('\n');
    };

    pane.append(mintHead, mintRow, abHead, abRow, abNote, surgeHead, surgeRow, surgeNote,
      pilgrimHead, pilgrimRow, pilgrimNote, fieldHead, readout, refreshBtn);
    return { el: pane, onShow: refresh };
  },
};
