// ---------------------------------------------------------------------------
// DEV TAB: WATCH — the sense-fan visibility lever's QA seat. THE FLOOD
// (WATCH_FAN_DEV.all) draws EVERY stamped sense fan — enemy sentries, owned
// crews, cone:false kinds, even locked watchers — the debugging read for
// actual sight radii; the roster below lists every live watch-bearing body
// with its resolved fan verdict (and WHY: stamp / kind posture / THE FAN
// DEFAULT) plus per-body stamp verbs, so the per-entity grain (Actor.watchFan)
// is exercised without authoring content. The lever gates only WHETHER a
// fan draws — geometry is always the scan's own stamps (engine/watch.ts
// watchFanVisible; render/vis/watchLayer.ts).
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import type { Actor } from '../../engine/actor';
import { watchFanVisible, type WatchFanMode } from '../../engine/watch';
import { WATCH_FAN_DEV } from '../../render/vis/watchLayer';
import { btn, check, css, DEV_UI, hrow, section } from '../ui';

/** One body's resolved verdict + the grain that decided it. */
function verdictOf(a: Actor): string {
  if (!a.watch) return '—';
  const vis = watchFanVisible(a, a.watch) ? 'SHOWN' : 'hidden';
  const why = a.watchFan ? `stamp:${a.watchFan}`
    : a.watch.fan ? `kind:${a.watch.fan}`
      : 'law:hide'; // THE FAN DEFAULT — unauthored fans stay sheathed
  return `${vis} (${why})`;
}

export const watchTab: DevTabDef = {
  id: 'watch',
  label: 'Watch',
  build(ctx) {
    const el = document.createElement('div');

    const flood = check('FLOOD: draw every sense fan (radii on all bodies)', WATCH_FAN_DEV.all);
    flood.box.addEventListener('change', () => {
      WATCH_FAN_DEV.all = flood.box.checked;
      ctx.flash(WATCH_FAN_DEV.all ? 'fan flood ON — all fans draw' : 'fan flood off — the lever rules');
    });
    const head = hrow();
    head.append(flood.el);

    const list = document.createElement('div');
    css(list, { overflowY: 'auto', flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' });

    const rebuild = (): void => {
      flood.box.checked = WATCH_FAN_DEV.all;
      list.innerHTML = '';
      const w = ctx.runActive();
      if (!w) {
        const empty = document.createElement('div');
        empty.textContent = 'no live run';
        css(empty, { color: DEV_UI.textDim, padding: '4px' });
        list.append(empty);
        return;
      }
      list.append(section('LIVE WATCHERS — stamp Actor.watchFan per body'));
      let n = 0;
      for (const a of w.actors) {
        if (!a.watch || a.dead) continue;
        n++;
        const row = hrow('4px');
        css(row, { padding: '2px 4px', marginBottom: '0' });
        const name = document.createElement('span');
        name.textContent = `${a.defId ?? 'actor'}#${a.id}${a.owner ? ' (owned)' : ''}`;
        css(name, { color: DEV_UI.text, flex: '1', minWidth: '90px' });
        const verdict = document.createElement('span');
        verdict.textContent = verdictOf(a);
        css(verdict, { color: DEV_UI.textDim, fontSize: '10px' });
        const stamp = (mode: WatchFanMode | undefined): void => {
          a.watchFan = mode;
          verdict.textContent = verdictOf(a);
          ctx.flash(`${a.defId ?? 'actor'}#${a.id} watchFan = ${mode ?? '(clear)'} → ${verdictOf(a)}`);
        };
        row.append(name, verdict,
          btn('show', () => stamp('show')),
          btn('hide', () => stamp('hide')),
          btn('clear', () => stamp(undefined)));
        list.append(row);
      }
      if (!n) {
        const empty = document.createElement('div');
        empty.textContent = 'no watch-bearing bodies in this zone';
        css(empty, { color: DEV_UI.textDim, padding: '4px' });
        list.append(empty);
      }
    };

    const refresh = hrow();
    refresh.append(btn('↻ Refresh roster', rebuild));

    el.append(head, refresh, list);
    return { el, onShow: rebuild };
  },
};
