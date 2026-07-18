// ---------------------------------------------------------------------------
// DEV TAB: GRAB — the grab fabric's QA levers (engine/grab.ts): grant the
// grapple lane onto the bar, spawn each grip-kin tutor a stride away, force
// a seize ON the local hero per verb (the victim's-eye test — rides the
// REAL grabSeize path, mass law and all), tear every hold open, and watch
// the live pair state on a coarse clock. Only meaningful on the
// AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import { SKILLS } from '../../data/skills';
import type { GrabVerb } from '../../engine/grab';
import type { World } from '../../engine/world';
import type { DevTabDef } from '../panel';
import { btn, css, hrow, section } from '../ui';

/** Every catalog skill carrying a grab verb, discovered — a new grapple
 *  shows up here with zero dev-tab edits. */
const grapples = (): string[] =>
  Object.values(SKILLS)
    .filter(s => s.effects.some(fx => fx.type === 'grabSeize' || fx.type === 'grabThrow'))
    .map(s => s.id);

const KIN = ['gaff_wrangler', 'yoke_mauler', 'gorge_gulper', 'maw_bloom'];
const VERBS: GrabVerb[] = ['carry', 'drag', 'pin', 'swallow'];

export const grabTab: DevTabDef = {
  id: 'grab',
  label: 'Grab',
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
        flash(ok ? label : `${label}: refused (mass law, policy, or nothing in reach)`);
      });

    const grantRow = hrow();
    for (const id of grapples()) {
      // Player-facing gems only — the kin's noDrop rows ride the seize-me
      // buttons below instead of cluttering the bar grants.
      if (SKILLS[id].noDrop) continue;
      grantRow.append(act(`Grant ${SKILLS[id].name}`, w => w.devGrabGrant(id)));
    }

    const spawnRow = hrow();
    for (const id of KIN) {
      spawnRow.append(act(`Spawn ${id.replace(/_/g, ' ')}`, w => w.devGrabSpawn(id)));
    }

    const seizeRow = hrow();
    for (const v of VERBS) {
      seizeRow.append(act(`Seize me: ${v}`, w => w.devGrabSeizeMe(v)));
    }
    seizeRow.append(act('Release ALL holds', w => w.devGrabClearAll()));

    // Live readout — repainted on a coarse clock while the tab is open.
    const readout = document.createElement('pre');
    css(readout, { font: '11px monospace', whiteSpace: 'pre-wrap', margin: '6px 0 0 0' });
    const repaint = (): void => {
      if (!readout.offsetParent) return; // tab hidden — skip the rebuild
      const w = runActive();
      if (!w) { readout.textContent = '(no run)'; return; }
      const lines: string[] = [];
      const p = w.player;
      lines.push(`player: gripping=${p.gripping ? `${p.gripping.verb}#${p.gripping.id}` : '—'}`
        + `  heldBy=${p.heldBy ?? '—'}  proofFor=${Math.max(0, p.grabProofUntil - w.time).toFixed(1)}s`);
      let pairs = 0;
      for (const a of w.actors) {
        const h = a.gripping;
        if (!h || a.dead) continue;
        pairs++;
        const v = w.actors.find(x => x.id === h.id);
        lines.push(`${a.name}#${a.id} ${h.verb.toUpperCase()} → ${v?.name ?? '?'}#${h.id}`
          + `  struggle=${(h.struggle * 100).toFixed(0)}%  severed=${(h.severed * 100).toFixed(0)}%`
          + `  drops in ${Math.max(0, h.until - w.time).toFixed(1)}s`);
      }
      if (!pairs) lines.push('(no live holds — spawn a tutor and stand close, or Seize me)');
      readout.textContent = lines.join('\n');
    };
    // The panel mounts once for the app's life — a 4 Hz repaint that
    // no-ops while hidden needs no teardown.
    window.setInterval(repaint, 250);

    pane.append(
      section('Grant the grapple lane (dev — bar-visible)'), grantRow,
      section('Spawn a grip-kin tutor beside you'), spawnRow,
      section('Force a hold ON you (real path — the mass law still speaks)'), seizeRow,
      section('Live pairs'), readout,
    );
    return { el: pane, onShow: repaint };
  },
};
