// ---------------------------------------------------------------------------
// DEV TAB: EMERGE — THE EMERGENCE GRAMMAR's gauge lever (design
// docs/design/show-dont-tell.md §3b; engine/emerge.ts + vis/emergeLayer.ts).
//   THE RING    — one ARMED ambusher per motion around the hero; walk into
//                 each and watch the arrival (the ring's ground paints the grains).
//   THE NEAREST — re-play an arrival on the nearest monster, forcing any motion
//                 (or its own row over the seat's ground).
//   THE READOUT — live arrivals vs the cap, the ground under your feet, the
//                 nearest body's folded row, and the dial tables she blesses.
// Only meaningful on the AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { EMERGE_CFG, EMERGE_GROUNDS, emergeMotionIds, emergeMotionOf } from '../../engine/emerge';
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, hrow, section } from '../ui';

export const emergeTab: DevTabDef = {
  id: 'emerge',
  label: 'Emerge',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });
    const note = (text: string): HTMLElement => {
      const el = document.createElement('div');
      el.textContent = text;
      css(el, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });
      return el;
    };

    const ringHead = section('Stand the ring (one armed ambusher per motion — walk into each)');
    const ringRow = hrow();
    ringRow.append(btn('Stand the ring ▶', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const stood = w.devEmergeRing();
      flash(stood.length ? `stood ${stood.length}: ${stood.join(', ')}` : 'nothing stood (no clear ground?)');
      refresh();
    }));
    const ringNote = note('Each body waits armed + hidden; step within 90 and it ARRIVES by its forced motion — '
      + 'the slit + grains wear the ground under your feet (sand here, snow there). The bodies then fight as normal.');

    const motHead = section('Re-play an arrival on the nearest monster (force a motion — or its own row)');
    const motRow = hrow();
    css(motRow, { flexWrap: 'wrap' });
    const act = (motion: string | null): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const out = w.devEmergeNearest(motion);
      flash(out ?? 'no body within reach (or one is still arriving)');
      refresh();
    };
    motRow.append(btn('its own row ▶', () => act(null)));
    for (const m of emergeMotionIds()) motRow.append(btn(`${m} ▶`, () => act(m)));

    const readHead = section('The read (live · cap · the ground here · the nearest row · the dials)');
    const readout = document.createElement('div');
    css(readout, { whiteSpace: 'pre', font: '11px/1.55 Consolas, monospace', padding: '2px 4px' });
    const refreshBtn = btn('Refresh', () => refresh());

    const refresh = (): void => {
      const w = runActive();
      const lines: string[] = [];
      if (!w) lines.push('start a run first');
      else {
        const i = w.devEmergeInfo();
        lines.push(`live ${i.live} / cap ${i.cap}   ground under you: ${i.ground}`);
        if (i.nearest) {
          const s = i.nearest.spec;
          lines.push(s
            ? `nearest ${i.nearest.name}: ${s.motion}${s.ground ? ` (${s.ground})` : ''} life ${s.life}s grains ${s.grains[0]}–${s.grains[1]} fling ${s.fling} voice ${s.voice || (s.haze ? 'haze' : '—')}${s.hold ? ' hold' : ''}`
            : `nearest ${i.nearest.name}: no row (force a motion above)`);
        } else lines.push('nearest: nothing within 360');
      }
      lines.push('');
      lines.push('MOTIONS (engine/emerge.ts — every number a DIAL):');
      for (const id of emergeMotionIds()) {
        const m = emergeMotionOf(id)!;
        lines.push(` ${id.padEnd(9)} life ${m.life}s grains ${m.grains[0]}–${m.grains[1]} fling ${m.fling} voice ${m.voice || (m.haze ? 'haze' : '—')}${m.hold ? ' hold' : ''}${m.lift ? ` lift ${m.lift}` : ''}${m.dropFrom ? ` drop ${m.dropFrom}` : ''}`);
      }
      lines.push('GROUNDS (row > ground > motion > base):');
      for (const [id, g] of Object.entries(EMERGE_GROUNDS)) {
        lines.push(` ${id.padEnd(8)} → ${String(g.motion).padEnd(8)} grains ${g.grainShape ?? '-'} ${g.grainColor ?? ''} voice ${g.voice === false ? '—' : (g.voice ?? '(motion)')}${g.haze ? ' haze' : ''}`);
      }
      const B = EMERGE_CFG.base;
      lines.push(`BASE: life ${B.life}s grains ${B.grains[0]}–${B.grains[1]} fling ${B.fling} lift ${B.lift} drop ${B.dropFrom}  cap ${EMERGE_CFG.maxLive}  slit w ${EMERGE_CFG.slit.width} h ${EMERGE_CFG.slit.height} peak ${EMERGE_CFG.slit.peak}`);
      readout.textContent = lines.join('\n');
    };

    pane.append(ringHead, ringRow, ringNote, motHead, motRow, readHead, readout, refreshBtn);
    return { el: pane, onShow: refresh };
  },
};
