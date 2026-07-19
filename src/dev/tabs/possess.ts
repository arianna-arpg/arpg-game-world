// ---------------------------------------------------------------------------
// DEV TAB: POSSESS — the possession seam's QA levers (engine/possess.ts):
// spawn the tutor kin / a weakened study-form target at your feet, force
// the local seat into the nearest enemy through the REAL policy lane
// (devPossess → possessRefusal — the tab can be refused exactly like a
// press), eject home, and stamp the wolf-form study count. Gem grants stay
// where they live (the Gems tab grants any gem). Only meaningful on the
// AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { bestiaryKey } from '../../data/bestiary';
import { MONSTERS } from '../../data/monsters';
import { dist } from '../../core/math';
import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

/** Kin worth a spawn button: the Vacant family + every explicitly
 *  possessable kind, discovered from the registry (a new possessable kind
 *  shows up here with zero dev-tab edits). */
const seamKinds = (): string[] =>
  Object.values(MONSTERS)
    .filter(m => m.possessable !== undefined || m.gemBias?.includes('possession'))
    .map(m => m.id);

export const possessTab: DevTabDef = {
  id: 'possess',
  label: 'Possess',
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
        flash(out === false ? `${label}: refused` : out);
      });

    const spawn = (w: World, id: string, weakened: boolean): string => {
      const m = w.createMonster(id, w.player.level, 'enemy');
      m.pos.x = w.player.pos.x + 70;
      m.pos.y = w.player.pos.y;
      w.actors.push(m);
      if (weakened) m.life = Math.max(1, Math.round(m.maxLife() * 0.2));
      return `spawned ${m.name}${weakened ? ' (weakened)' : ''}`;
    };

    const spawnRow = hrow();
    for (const id of seamKinds()) {
      spawnRow.append(act(`Spawn ${MONSTERS[id].name}`, w => spawn(w, id, false)));
    }
    spawnRow.append(act('Spawn weakened Dire Wolf', w => spawn(w, 'dire_wolf', true)));

    const seatRow = hrow();
    seatRow.append(act('Possess nearest enemy', w => {
      let best: import('../../engine/actor').Actor | null = null;
      let bd = Infinity;
      for (const a of w.actors) {
        if (a.dead || a.team !== 'enemy' || a.possession) continue;
        const d = dist(a.pos, w.player.pos);
        if (d < bd) { bd = d; best = a; }
      }
      if (!best) return false;
      const why = w.devPossess(best);
      return why === null ? `possessed ${best.name}` : `${best.name}: ${why}`;
    }));
    seatRow.append(act('Eject (seat home)', w => {
      if (!w.localSeat.home) return 'already home';
      w.seatEject(w.localSeat, 'released');
      return 'ejected';
    }));
    seatRow.append(act('Seat status', w => {
      const home = w.localSeat.home;
      if (!home) return `home in own flesh (${w.player.name})`;
      const ride = w.player.possession;
      return `riding ${w.player.name} (${ride?.kind ?? '?'}), husk ${Math.round(home.life)}/${Math.round(home.maxLife())}`;
    }));

    const studyRow = hrow();
    studyRow.append(act('Stamp dire_wolf study → 20', w => {
      const key = bestiaryKey('dire_wolf');
      const cur = (w.account.ledger[key] ?? 0) as number;
      w.account.ledger[key] = Math.max(cur, 20);
      return `${key} = ${w.account.ledger[key]} (wolf-form gate met)`;
    }));

    pane.append(
      section('Spawn the seam\'s kin at your feet'), spawnRow,
      section('The seat (real policy lane — refusals are honest)'), seatRow,
      section('Study stamps (unlock gates read the account ledger)'), studyRow,
    );
    return { el: pane };
  },
};
