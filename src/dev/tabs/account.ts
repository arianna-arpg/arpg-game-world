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
import {
  UNLOCK_CATALOG, catalogClassLevelMilestones, classObjectiveKeys, classObjectiveNeeds, settleClassUnlocks,
} from '../../meta/unlocks';
import { CLASS_TIERS } from '../../data/classTiers';

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

    // --- THE OBJECTIVE WEB + THE MASTERY LADDER (meta/unlocks.ts) ----------
    // Stamps the ACCOUNT ledger directly (real play stamps most keys on the
    // RUN ledger and merges on death) so the Vault's shrouded wall can be
    // walked without dying twenty times. Chained classes still need their
    // parent CLAIMED first — that is the web working, not a gap here.
    // 'Settle' runs the very claim the live sweep runs, so stamped
    // objectives land as classes on the spot.
    const dHead = section('Class objectives + mastery (account ledger)');
    const dRow = hrow();
    /** Mutate the account ledger through one save-booking gate. */
    const stamp = (label: string, fn: (l: Record<string, number>) => number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const n = fn(w.account.ledger);
      w.accountDirty = true;
      flash(`objectives ${label}: ${n} keys`);
    };
    dRow.append(
      btn('Milestones: current class', () => stamp('milestones', l => {
        // The standing list PLUS every level the catalog asks of this class
        // (the rungs at 10/30/60/100, the chains' played-parent asks).
        const w = runActive()!;
        const cls = w.meta.classDef.id;
        const levels = new Set([...CLASS_LEVEL_MILESTONES, ...catalogClassLevelMilestones(cls)]);
        for (const m of levels) l[classLevelLedgerKey(cls, m)] = 1;
        return levels.size;
      })),
      btn('Quarter every objective', () => stamp('quartered', l => {
        // THE REVEAL walk: every counted deed at a quarter of its ask — the
        // shrouded cards' objectives read plain, nothing claims yet.
        const needs = classObjectiveNeeds();
        let n = 0;
        for (const [k, need] of Object.entries(needs)) {
          if (need <= 1) continue; // presence keys have no quarter
          l[k] = Math.max(l[k] ?? 0, Math.ceil(need / 4)); n++;
        }
        return n;
      })),
      btn('All objective ledgers', () => stamp('web-stamped', l => {
        // Registry-derived (classObjectiveNeeds): every deed and play
        // threshold the authored web names, at its NEEDED COUNT (twenty
        // corpses, eight deaths, five undead bosses) — never drifts.
        const needs = classObjectiveNeeds();
        for (const [k, n] of Object.entries(needs)) l[k] = Math.max(l[k] ?? 0, n);
        return Object.keys(needs).length;
      })),
      btn('Settle claims', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        const got = settleClassUnlocks(w.account, w.ledgerView());
        w.accountDirty = true;
        flash(got.length ? `claimed: ${got.map(u => u.label).join(', ')}` : 'nothing new to claim');
      }),
      btn('Own every rung', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        let n = 0;
        for (const u of UNLOCK_CATALOG) {
          if (u.kind !== 'classtier' || w.account.unlockedClassTiers.has(u.id)) continue;
          w.account.unlockedClassTiers.add(u.id);
          for (const sid of u.payload.skillIds) w.account.unlockedSkills.add(sid);
          n++;
        }
        w.accountDirty = true;
        flash(`mastery: ${n} rungs owned (${CLASS_TIERS.map(t => t.label).join('/')})`);
      }),
      btn('Forget objectives + rungs', () => stamp('forgotten', l => {
        let n = 0;
        const web = new Set(classObjectiveKeys());
        for (const k of Object.keys(l)) {
          if (web.has(k) || /^class_.+_level_\d+$/.test(k)) { delete l[k]; n++; }
        }
        const w = runActive()!;
        n += w.account.unlockedClassTiers.size;
        w.account.unlockedClassTiers.clear();
        w.account.kitPicks = {};
        return n;
      })),
    );
    const dNote = document.createElement('div');
    dNote.textContent = 'Shrouded class cards read their objectives once any deed is a quarter along, and the world CLAIMS a class the moment one completes (the live sweep, or “Settle”). Mastery rungs surface in the Vault at class level 10/30/60/100. “Forget” re-shrouds every unclaimed class (claimed classes never re-lock).';
    css(dNote, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });

    pane.append(head, row, note, dHead, dRow, dNote);
    return { el: pane };
  },
};
