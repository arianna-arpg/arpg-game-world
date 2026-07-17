// ---------------------------------------------------------------------------
// DEV TAB: THRONG — the gathered-swarm fabric's QA levers (engine/throng.ts):
// grant an anchor skill straight onto the bar, plant a husk pocket at your
// feet, mint claimed bodies outright, and fill the combat gauge to the brink
// — the whole playstyle inspectable without five hundred walks. Only
// meaningful on the AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { SKILLS } from '../../data/skills';
import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

/** Every catalog anchor (SkillDef.throng), discovered — a new flavor shows
 *  up here with zero dev-tab edits. */
const anchors = (): string[] =>
  Object.values(SKILLS).filter(s => s.throng).map(s => s.id);

export const throngTab: DevTabDef = {
  id: 'throng',
  label: 'Throng',
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
        flash(ok ? label : `${label}: refused (skill missing from the bar, or bar full)`);
      });

    const grantRow = hrow();
    const pocketRow = hrow();
    const mintRow = hrow();
    const gaugeRow = hrow();
    for (const id of anchors()) {
      const short = SKILLS[id].name;
      grantRow.append(act(`Grant ${short}`, w => w.devThrongGrant(id)));
      pocketRow.append(act(`Pocket here (${short})`, w => w.devThrongPocketHere(id)));
      mintRow.append(act(`+5 bodies (${short})`, w => w.devThrongMint(id, 5)));
      gaugeRow.append(act(`Fill gauge (${short})`, w => w.devThrongFillGauge(id)));
    }

    pane.append(
      section('Grant anchor to the bar'), grantRow,
      section('Plant a husk pocket beside you'), pocketRow,
      section('Mint claimed bodies outright'), mintRow,
      section('Fill the combat gauge (next hits tip it)'), gaugeRow,
    );
    return { el: pane };
  },
};
