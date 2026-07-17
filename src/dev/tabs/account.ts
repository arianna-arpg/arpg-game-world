// ---------------------------------------------------------------------------
// DEV TAB: ACCOUNT — pokes at the account meta-layer for QA. First resident:
// BESTIARY STUDY, writing the same `bestiary:<id>` ledger keys the kill rule
// accrues (data/bestiary.ts), so the book's every state — dark silhouette,
// part-revealed page, mastered ★ portrait — can be inspected without five
// hundred kills. Registry-derived: new eligible kinds are covered on their
// own, and the counts persist through the normal account-save cadence.
// ---------------------------------------------------------------------------

import type { DevTabDef } from '../panel';
import { DEV_UI, btn, css, hrow, section } from '../ui';
import { bestiaryKey, bestiaryList, bestiaryThreshold } from '../../data/bestiary';

export const accountTab: DevTabDef = {
  id: 'account',
  label: 'Account',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');

    const head = section('Bestiary study (account ledger)');
    const row = hrow();
    /** Rewrite every eligible kind's study count; null = forget the page. */
    const apply = (label: string, fn: (cur: number, need: number) => number | null): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      let touched = 0;
      for (const def of bestiaryList()) {
        const key = bestiaryKey(def.id);
        const next = fn(w.account.ledger[key] ?? 0, bestiaryThreshold(def));
        if (next === null) delete w.account.ledger[key];
        else w.account.ledger[key] = next;
        touched++;
      }
      w.accountDirty = true; // the main loop books the account save
      flash(`bestiary ${label}: ${touched} kinds`);
    };
    row.append(
      btn('Sight all', () => apply('sighted', cur => Math.max(cur, 1))),
      btn('Half-study all', () => apply('half-studied', (cur, need) => Math.max(cur, Math.ceil(need / 2)))),
      btn('Master all', () => apply('mastered', (_cur, need) => need)),
      btn('Reset study', () => apply('reset', () => null)),
    );

    const note = document.createElement('div');
    note.textContent = 'Writes the same bestiary:<id> account-ledger keys the kill rule bumps. Reopen the Tracker’s book to see the pages move.';
    css(note, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    pane.append(head, row, note);
    return { el: pane };
  },
};
