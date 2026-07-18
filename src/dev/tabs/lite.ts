// ---------------------------------------------------------------------------
// DEV TAB: LITE — the packed-pool tier's QA levers (engine/lite.ts): pour a
// wade-through crowd of any opted-in kind at your feet (enemy-side or as
// your own owned cloud), read the live census, and drop the pool flat. The
// kind list is DISCOVERED from the registry (MonsterDef.lite) — a new lite
// kind shows up here with zero dev-tab edits. Only meaningful on the
// AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { MONSTERS } from '../../data/monsters';
import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

/** Every opted-in kind (MonsterDef.lite), discovered. */
const liteKinds = (): string[] =>
  Object.values(MONSTERS).filter(m => m.lite).map(m => m.id);

export const liteTab: DevTabDef = {
  id: 'lite',
  label: 'Lite',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });

    const act = (label: string, fn: (w: World) => string | false): HTMLButtonElement =>
      btn(label, () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        let out: string | false = false;
        try { out = fn(w); }
        catch (e) { flash(`${label}: ${(e as Error).message}`); return; }
        flash(out === false ? `${label}: refused (kind not lite-opted?)` : out);
      });

    const pourRow = hrow();
    const ownRow = hrow();
    for (const id of liteKinds()) {
      const short = MONSTERS[id].name;
      pourRow.append(act(`Pour 100 (${short})`, w => {
        const n = w.devLitePour(id, 100);
        return n > 0 && `poured ${n} ${short}`;
      }));
      pourRow.append(act(`Pour 300 (${short})`, w => {
        const n = w.devLitePour(id, 300);
        return n > 0 && `poured ${n} ${short}`;
      }));
      ownRow.append(act(`Own 30 (${short})`, w => {
        const n = w.devLitePour(id, 30, undefined, 'player', w.player);
        return n > 0 && `gathered ${n} ${short}`;
      }));
    }
    const censusRow = hrow();
    censusRow.append(act('Census', w => {
      const c = w.devLiteCensus();
      return `live ${c.live}` + c.kinds.map(k => ` · ${k.defId} ${k.n}`).join('');
    }));

    pane.append(
      section('Pour an enemy tide at your feet'), pourRow,
      section('Gather an owned cloud (keeper = you)'), ownRow,
      section('Pool census'), censusRow,
    );
    return { el: pane };
  },
};
