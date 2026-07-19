// ---------------------------------------------------------------------------
// DEV TAB: HOLDS — the harborhold fabric's QA levers (data/harborholds.ts +
// world/harborholds.ts): hunt the nearest sea and mint its whole port system
// (the devEnsureSea seam), watch every minted hold's standing on a live
// clock, force states with CANONICAL timers, and drive the standing zone's
// defense end to end (muster / instant win / instant fall). Only meaningful
// on the AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

/** Spiral out from the standing zone until water answers — seaAt is pure +
 *  memoized, so the hunt is cheap and idempotent. */
function huntSea(w: World): string | null {
  for (let r = 1; r <= 40; r++) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const at = { x: w.zone.map.x + Math.cos(a) * r * 300, y: w.zone.map.y + Math.sin(a) * r * 300 };
      const sea = w.devEnsureSea(at);
      if (sea) return `${sea.name} (${sea.cls}, ${sea.ports.length} ports)`;
    }
  }
  return null;
}

export const holdsTab: DevTabDef = {
  id: 'holds',
  label: 'Holds',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    const act = (label: string, fn: (w: World) => boolean | string | null): HTMLButtonElement =>
      btn(label, () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        let r: boolean | string | null = false;
        try { r = fn(w); }
        catch (e) { flash(`${label}: ${(e as Error).message}`); return; }
        flash(typeof r === 'string' ? r : r ? label : `${label}: refused`);
      });

    const mintRow = hrow();
    mintRow.append(act('Hunt + mint nearest sea', w => {
      const got = huntSea(w);
      return got ? `minted ${got}` : 'no water within the hunt ring';
    }));

    const hereRow = hrow();
    hereRow.append(
      act('Muster (this zone)', w => { w.beginHoldMuster(); return !!w.holdPanelInfo(); }),
      act('Win defense NOW', w => w.devResolveHoldDefense(true)),
      act('Fail defense NOW', w => w.devResolveHoldDefense(false)),
      act('Set here: besieged', w => w.devSetHoldState(w.zone.id, 'besieged')),
      act('Set here: open', w => w.devSetHoldState(w.zone.id, 'open')),
      act('Set here: fallen', w => w.devSetHoldState(w.zone.id, 'fallen')),
    );

    // Live census — every minted hold's standing, repainted on a coarse clock.
    const readout = document.createElement('pre');
    css(readout, { font: '11px monospace', whiteSpace: 'pre-wrap', margin: '6px 0 0 0' });
    const repaint = (): void => {
      if (!readout.offsetParent) return; // tab hidden — skip the rebuild
      const w = runActive();
      if (!w) { readout.textContent = '(no run)'; return; }
      const rows = w.devHoldsInfo();
      if (!rows.length) { readout.textContent = '(no holds minted — hunt a sea, or walk a coast)'; return; }
      const t = (s: number): string => s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '—';
      readout.textContent = rows.map(r =>
        `${r.here ? '▶' : ' '} ${r.name} [${r.cls}] ${r.state.toUpperCase()}`
        + `  prosperity=${r.prosperity}  won=${r.defenses} lost=${r.falls}`
        + `  rebuild=${t(r.rebuildLeft)} siege-in=${t(r.siegeIn)} falls-in=${t(r.fallLeft)}`
        + `${r.veiled ? '  (veiled)' : ''}`).join('\n');
    };
    window.setInterval(repaint, 500);

    pane.append(
      section('Mint (the sea fabric mints its whole port system — holds ride the spots)'), mintRow,
      section('The standing zone (muster + forced resolutions + state forces)'), hereRow,
      section('Every minted hold'), readout,
    );
    return { el: pane, onShow: repaint };
  },
};
