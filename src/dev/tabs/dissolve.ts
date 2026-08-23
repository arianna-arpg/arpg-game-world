// ---------------------------------------------------------------------------
// DEV TAB: DISSOLVE — THE DISSOLUTION GRAMMAR's GAUGE LEVER (D0; design
// docs/design/dissolution.md §5, engine/dissolve.ts + vis/dissolveLayer.ts).
//
// Her purpose for the whole pass is a GAUGE — "exactly how well those would
// all look" — so this tab lets her meet every motion in one visit:
//   THE RING   — stand every brittle kind carrying a dissolve row (the D0
//                gauge set + D1's tail, discovered from the registry) in a
//                ring around the hero;
//                walk to each and break it the way play breaks it.
//   THE NEAREST — force any motion on the nearest body (a tree may shatter,
//                a pot may dissolve) — or play its own row.
//   ALL IN VIEW — break every rowed body in view at once: the concurrency
//                cap's honest degrade shows (debris lands, motion skipped).
//   THE READOUT — live motions vs cap, standing debris, running pre-cracks,
//                the nearest body's folded spec, and the dial table
//                (DISSOLVE_CFG + the motion/material defaults) she blesses.
// Only meaningful on the AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import {
  DISSOLVE_CFG, DISSOLVE_MATERIALS, dissolveMotionIds, dissolveMotionOf,
} from '../../engine/dissolve';
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, hrow, section } from '../ui';

export const dissolveTab: DevTabDef = {
  id: 'dissolve',
  label: 'Dissolve',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    const note = (text: string): HTMLElement => {
      const el = document.createElement('div');
      el.textContent = text;
      css(el, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });
      return el;
    };

    // ------------------------------------------------------------- ring --
    const ringHead = section('Break one of each (every rowed brittle kind stands in a ring around you — D0 + D1)');
    const ringRow = hrow();
    ringRow.append(btn('Stand the ring ▶', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const stood = w.devDissolveRing();
      flash(stood.length ? `stood ${stood.length}: ${stood.join(', ')}` : 'nothing stood (no clear ground?)');
      refresh();
    }));
    const ringNote = note('Walk to each: pots/urns/glass/crystal break at a touch or a blow; pods burst on touch/near; '
      + 'the secret faces give to a standing press (watch the crack grow over the dwell); the mirages dissolve as you near. '
      + 'In a sanctuary, any tenants a break wakes purge at once — expected.');

    // ---------------------------------------------------------- nearest --
    const motHead = section('Break the nearest body (force a motion on ANY doodad — or play its own row)');
    const motRow = hrow();
    css(motRow, { flexWrap: 'wrap' });
    const act = (motion: string | null): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const out = w.devDissolveNearest(motion);
      flash(out ?? (motion ? 'no body within reach' : 'no dissolve-rowed body within reach'));
      refresh();
    };
    motRow.append(btn('its own row ▶', () => act(null)));
    for (const m of dissolveMotionIds()) motRow.append(btn(`${m} ▶`, () => act(m)));
    const motNote = note('Brittle kinds break through the REAL pop (carve / spawn / fume fire as in play); '
      + 'other bodies are spliced and dissolved directly — zone re-entry re-mints them.');

    // ------------------------------------------------------- all in view --
    const allHead = section('Break all in view (the cap\'s honest degrade)');
    const allRow = hrow();
    allRow.append(btn('Break all in view ▶', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const n = w.devDissolveAllInView();
      flash(`broke ${n} — cap ${DISSOLVE_CFG.maxLive} live motions; past it the debris lands and the voice speaks, the motion is skipped`);
      refresh();
    }));

    // ---------------------------------------------------------- readout --
    const readHead = section('The read (live · cap · debris · pre-cracks · the nearest row · the dials)');
    const readout = document.createElement('div');
    css(readout, { whiteSpace: 'pre', font: '11px/1.55 Consolas, monospace', padding: '2px 4px' });
    const refreshBtn = btn('Refresh', () => refresh());

    const refresh = (): void => {
      const w = runActive();
      const lines: string[] = [];
      if (!w) lines.push('start a run first');
      else {
        const i = w.devDissolveInfo();
        lines.push(`live ${i.live} / cap ${i.cap}   debris standing ${i.debris}   pre-cracks running ${i.cracks}`);
        if (i.nearest) {
          const s = i.nearest.spec;
          lines.push(s
            ? `nearest ${i.nearest.kind}: ${s.motion}${s.material ? ` (${s.material})` : ''} cut ${s.cut} pieces ${s.pieces[0]}–${s.pieces[1]} life ${s.life}s`
              + ` fling ${s.fling} grav ${s.gravity} spin ${s.spin} debris ${s.debris || '—'}`
              + ` fade ${s.fade ? `${s.fade.after[0]}–${s.fade.after[1]}s @${s.fade.rate ?? DISSOLVE_CFG.base.fade.rate}` : 'never'}`
              + ` voice ${s.voice || (s.haze ? 'haze' : '—')}${s.preCrack ? ' preCrack' : ''}`
            : `nearest ${i.nearest.kind}: no dissolve row (force a motion above)`);
        } else lines.push('nearest: nothing within 320');
      }
      lines.push('');
      lines.push('MOTION DEFAULTS (engine/dissolve.ts — every number a DIAL):');
      for (const id of dissolveMotionIds()) {
        const m = dissolveMotionOf(id)!;
        lines.push(` ${id.padEnd(9)} cut ${m.cut.padEnd(7)} pieces ${String(m.pieces[0]).padStart(2)}–${String(m.pieces[1]).padEnd(2)} life ${m.life}s fling ${m.fling} grav ${m.gravity} spin ${m.spin} debris ${m.debris || '—'} voice ${m.voice || (m.haze ? 'haze' : '—')}`);
      }
      lines.push('MATERIAL DEFAULTS (row > material > motion > base):');
      for (const [id, m] of Object.entries(DISSOLVE_MATERIALS)) {
        lines.push(` ${id.padEnd(8)} → ${String(m.motion).padEnd(8)} ${m.cut ? `cut ${m.cut} ` : ''}${m.pieces ? `pieces ${m.pieces[0]}–${m.pieces[1]} ` : ''}${m.fling ? `fling ${m.fling} ` : ''}debris ${m.debris === false ? '—' : (m.debris ?? '(motion)')} voice ${m.voice === false ? '—' : (m.voice ?? '(motion)')}${m.haze ? ' haze' : ''}`);
      }
      const B = DISSOLVE_CFG.base;
      lines.push(`BASE: pieces ${B.pieces[0]}–${B.pieces[1]} life ${B.life}s fling ${B.fling} grav ${B.gravity} spin ${B.spin} debrisR ${B.debrisRadius} fade ${B.fade.after[0]}–${B.fade.after[1]}s @${B.fade.rate} scope ${B.scope}  cap ${DISSOLVE_CFG.maxLive}  settle ${DISSOLVE_CFG.settle[0]}–${DISSOLVE_CFG.settle[1]}`);
      readout.textContent = lines.join('\n');
    };

    pane.append(ringHead, ringRow, ringNote, motHead, motRow, motNote, allHead, allRow, readHead, readout, refreshBtn);
    return { el: pane, onShow: refresh };
  },
};
