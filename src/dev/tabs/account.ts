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
import { BESTIARY_CFG, bestiaryKey, bestiaryList, bestiaryThreshold } from '../../data/bestiary';
import { MIMIC_CFG } from '../../engine/mimic';
import { CLASS_LEVEL_MILESTONES, classLevelLedgerKey } from '../../meta/account';
import { discoveryLedgerKeys, discoveryLedgerNeeds } from '../../meta/unlocks';

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
      // THE MIMIC QA LEVER: stamp exactly the capture gate's study tier
      // (MIMIC_CFG.studyGroup read against the live reveal ladder — the
      // button can never drift from what engine/mimic.ts actually checks).
      btn('Study all to arts', () => apply('arts-studied', (cur, need) => {
        const tier = BESTIARY_CFG.revealTiers.find(t => t.group === MIMIC_CFG.studyGroup);
        return Math.max(cur, Math.max(1, Math.ceil(need * (tier?.at ?? 0.35))));
      })),
      btn('Half-study all', () => apply('half-studied', (cur, need) => Math.max(cur, Math.ceil(need / 2)))),
      btn('Master all', () => apply('mastered', (_cur, need) => need)),
      btn('Reset study', () => apply('reset', () => null)),
    );

    const note = document.createElement('div');
    note.textContent = 'Writes the same bestiary:<id> account-ledger keys the kill rule bumps. Reopen the Tracker’s book to see the pages move.';
    css(note, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    // --- CLASS DISCOVERY (meta/unlocks.ts, the discovery web) ---------------
    // Stamps the ACCOUNT ledger directly (real play stamps the RUN ledger and
    // merges on death) so the Vault's rumor wall can be walked without dying
    // twenty times. Ownership-chained classes still need their parent bought —
    // that is the web working, not a gap here.
    const dHead = section('Class discovery (account ledger)');
    const dRow = hrow();
    /** Mutate the account ledger through one save-booking gate. */
    const stamp = (label: string, fn: (l: Record<string, number>) => number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const n = fn(w.account.ledger);
      w.accountDirty = true;
      flash(`discovery ${label}: ${n} keys`);
    };
    dRow.append(
      btn('Milestones: current class', () => stamp('milestones', l => {
        const w = runActive()!;
        const cls = w.meta.classDef.id;
        for (const m of CLASS_LEVEL_MILESTONES) l[classLevelLedgerKey(cls, m)] = 1;
        return CLASS_LEVEL_MILESTONES.length;
      })),
      btn('All web ledgers', () => stamp('web-stamped', l => {
        // Registry-derived (discoveryLedgerNeeds): every threshold AND hard
        // lesson the authored web names, at its NEEDED COUNT (the Flagellant
        // wants eight deaths, not one) — never drifts.
        const needs = discoveryLedgerNeeds();
        for (const [k, n] of Object.entries(needs)) l[k] = Math.max(l[k] ?? 0, n);
        return Object.keys(needs).length;
      })),
      btn('Forget discoveries', () => stamp('forgotten', l => {
        let n = 0;
        const web = new Set(discoveryLedgerKeys());
        for (const k of Object.keys(l)) {
          if (web.has(k) || /^class_.+_level_\d+$/.test(k)) { delete l[k]; n++; }
        }
        return n;
      })),
    );
    const dNote = document.createElement('div');
    dNote.textContent = 'Rumor cards resolve into purchasable Class bundles as their keys land. “Forget” re-shrouds everything unowned (owned classes never re-lock).';
    css(dNote, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    pane.append(head, row, note, dHead, dRow, dNote);
    return { el: pane };
  },
};
