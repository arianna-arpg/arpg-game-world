// ---------------------------------------------------------------------------
// DEV TAB: COMBO — THE COMBO GRAMMAR's QA levers (engine/sequence.ts,
// data/combos.ts): equip any registry grammar on the local hero without a
// respec, strip the dev grants, and watch the live readout — the ring's
// tail, the comboVaried/comboRepeated conditions, and each equipped rule's
// progress — refresh in place. Only meaningful on the AUTHORITATIVE peer
// (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { COMBO_LIST } from '../../data/combos';
import { comboProgress } from '../../engine/sequence';
import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

export const comboTab: DevTabDef = {
  id: 'combo',
  label: 'Combo',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    const act = (label: string, fn: (w: World) => boolean): HTMLButtonElement =>
      btn(label, () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        let ok = false;
        try { ok = fn(w); }
        catch (e) { flash(`${label}: ${(e as Error).message}`); return; }
        flash(ok ? label : `${label}: refused`);
      });

    const grantRow = hrow();
    for (const rule of COMBO_LIST) {
      grantRow.append(act(`Grant ${rule.name}`, w => w.devComboGrant(rule.id)));
    }
    grantRow.append(act('Clear dev grants', w => { w.devComboClear(); return true; }));

    // Live readout — repainted on a coarse clock while the tab is open.
    const readout = document.createElement('pre');
    css(readout, { font: '11px monospace', whiteSpace: 'pre-wrap', margin: '6px 0 0 0' });
    const repaint = (): void => {
      if (!readout.offsetParent) return; // tab hidden — skip the rebuild
      const w = runActive();
      if (!w) { readout.textContent = '(no run)'; return; }
      const p = w.player;
      const lines: string[] = [];
      lines.push(`watch=${p.comboWatch}  condVaried=${!!(p.comboCondBits & 1) && p.comboCondLeft > 0}  condRepeated=${!!(p.comboCondBits & 2) && p.comboCondLeft > 0}`);
      const ring = p.castRing ?? [];
      lines.push('ring: ' + (ring.length
        ? ring.map(r => `${r.sid}@${r.at.toFixed(1)}`).join(' → ')
        : '(empty — cast something)'));
      for (const rule of p.comboRules ?? []) {
        const pr = comboProgress(ring, rule, w.time, p.sheet.get('comboWindow'));
        const fire = p.comboFire?.get(rule.id);
        lines.push(`${rule.name}: ${pr.lit}/${pr.len}`
          + (fire ? `  last fired ${(w.time - fire.at).toFixed(1)}s ago` : ''));
      }
      if (!p.comboRules?.length) lines.push('(no grammar equipped — grant one above, then cast once)');
      readout.textContent = lines.join('\n');
    };
    // The panel mounts once for the app's life — a 4 Hz repaint that
    // no-ops while hidden needs no teardown.
    window.setInterval(repaint, 250);

    pane.append(
      section('Equip a grammar (dev grant — sheet-visible)'), grantRow,
      section('Live readout'), readout,
    );
    return { el: pane, onShow: repaint };
  },
};
