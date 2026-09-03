// ---------------------------------------------------------------------------
// DEV TAB: ULTIMATES — THE LAB LEVER's one door (engine/ultimates.ts ULT_QA;
// docs/engine/ultimates.md). Her ruling (2026-09-02): the lab lives INSIDE
// the dev tooling — `?dev`, then choose — never a URL param of its own.
//
//   THE LEVER   — the master switch + its dials: the capped stamped cooldown,
//                 the eager banner throttle + global gap, the lab kit.
//   THE KIT     — include/exclude every droppable ultimate + gauge art the
//                 kit deals into a fresh bag; deal it NOW into a live run.
//   THE PANE    — re-aim the default eyecatch style live (flank / sunder /
//                 eclipse — the open registry, whatever it holds).
//   THE HAND    — fill every slotted gauge, clear every ultimate clock,
//                 reset the lever to the shipped face.
//   THE READ    — the lever, the arts on the bar (gauge fill / lock /
//                 cooldown), the wisp pool.
// Choices persist per browser (localStorage — the perf tab's chip idiom) and
// are re-applied when the panel mounts, so a `?dev` serve remembers the lab
// it was left in; the shipped game never reads the key (no panel, no tab).
// Only meaningful on the AUTHORITATIVE peer (see dev/panel.ts).
// ---------------------------------------------------------------------------

import {
  applyLab, labSnapshot, resetLab, setUltStyle, ULT_CFG, ULT_LAB_DEFAULTS, ULT_QA,
} from '../../engine/ultimates';
import { gaugeFill, gaugeLockLeft } from '../../engine/gauge';
import { EYECATCH_STYLES } from '../../render/vis/eyecatch';
import { SKILLS } from '../../data/skills';
import type { DevTabDef } from '../panel';
import { DEV_UI, btn, check, css, hrow, numInput, option, section, selectEl } from '../ui';

const LAB_KEY = 'dev_ultlab';

function persist(): void {
  try { localStorage.setItem(LAB_KEY, JSON.stringify(labSnapshot())); } catch { /* ignore */ }
}
function restore(): boolean {
  try {
    const raw = localStorage.getItem(LAB_KEY);
    if (!raw) return false;
    applyLab(JSON.parse(raw) as Partial<typeof ULT_QA>);
    return true;
  } catch { return false; }
}
function forget(): void {
  try { localStorage.removeItem(LAB_KEY); } catch { /* ignore */ }
}

/** Every art the kit could deal — droppable, wearing the mark or a gauge. */
const kitArts = () => Object.values(SKILLS)
  .filter(d => (d.ultimate || d.gauge) && !d.noDrop && (d.dropWeight ?? 0) > 0);

export const ultlabTab: DevTabDef = {
  id: 'ultlab',
  label: 'Ultimates',
  build: ({ runActive, flash }) => {
    // The remembered lab comes back the moment the panel mounts (build runs
    // at mount) — the shipped game never mounts, so never reads the key.
    const remembered = restore();
    const pane = document.createElement('div');
    css(pane, { overflowY: 'auto' });
    const note = (text: string): HTMLElement => {
      const el = document.createElement('div');
      el.textContent = text;
      css(el, { color: DEV_UI.textDim, fontSize: '10px', padding: '2px 4px' });
      return el;
    };
    const num = (label: string, get: () => number, set: (v: number) => void, min: number, max: number): HTMLElement => {
      const row = hrow();
      const lab = document.createElement('span'); lab.textContent = label;
      css(lab, { minWidth: '150px', fontSize: '11px' });
      const inp = numInput(get(), min, max, '60px');
      inp.step = 'any';
      inp.addEventListener('change', () => { set(Number(inp.value)); persist(); refresh(); });
      row.append(lab, inp);
      syncers.push(() => { inp.value = String(get()); });
      return row;
    };
    const syncers: (() => void)[] = [];

    // ------------------------------------------------------------ lever --
    const leverHead = section('THE LEVER — the lab\'s master switch and its dials (ULT_QA)');
    const active = check('Lab lever ON (capped clocks · eager panes · the kit at first breath)', ULT_QA.active);
    active.box.addEventListener('change', () => { applyLab({ active: active.box.checked }); persist(); refresh(); });
    syncers.push(() => { active.box.checked = ULT_QA.active; });
    const grant = check('Deal the lab kit into every fresh bag (hero built to wield it)', ULT_QA.grantArts);
    grant.box.addEventListener('change', () => { applyLab({ grantArts: grant.box.checked }); persist(); refresh(); });
    syncers.push(() => { grant.box.checked = ULT_QA.grantArts; });
    const capRow = num('Cooldown cap (s)', () => ULT_QA.cooldownCap, v => applyLab({ cooldownCap: v }), 0.5, 600);
    const thrRow = num('Banner throttle per caster (s)', () => ULT_QA.throttleSec, v => applyLab({ throttleSec: v }), 0, 120);
    const gapRow = num('Banner global gap (s)', () => ULT_QA.globalGapSec, v => applyLab({ globalGapSec: v }), 0, 30);
    const leverNote = note(`Shipped: cap ${ULT_LAB_DEFAULTS.cooldownCap}s · throttle ${ULT_LAB_DEFAULTS.throttleSec}s · gap ${ULT_LAB_DEFAULTS.globalGapSec}s (lever OFF). `
      + `Authored pacing: throttle ${ULT_CFG.throttleSec}s · gap ${ULT_CFG.globalGapSec}s; the cap never rewrites a skill's cooldown, only the STAMPED clock.`);

    // -------------------------------------------------------------- kit --
    const kitHead = section('THE KIT — include / exclude what the lab deals (every droppable ultimate + gauge art)');
    const kitList = document.createElement('div');
    css(kitList, { display: 'flex', flexWrap: 'wrap', gap: '2px 10px', padding: '2px 4px' });
    const kitBoxes = new Map<string, HTMLInputElement>();
    const rebuildKit = (): void => {
      kitList.replaceChildren();
      kitBoxes.clear();
      for (const d of kitArts()) {
        const c = check(`${d.name}${d.gauge ? ' ◔' : ''}`, !ULT_QA.kitExclude.includes(d.id));
        css(c.el, { minWidth: '200px' });
        c.box.addEventListener('change', () => {
          const ex = new Set(ULT_QA.kitExclude);
          if (c.box.checked) ex.delete(d.id); else ex.add(d.id);
          applyLab({ kitExclude: [...ex] }); persist(); refresh();
        });
        kitBoxes.set(d.id, c.box);
        kitList.append(c.el);
      }
    };
    const kitRow = hrow();
    kitRow.append(
      btn('All', () => { applyLab({ kitExclude: [] }); persist(); rebuildKit(); refresh(); }),
      btn('None', () => { applyLab({ kitExclude: kitArts().map(d => d.id) }); persist(); rebuildKit(); refresh(); }),
      btn('Deal the kit now ▶', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        const n = w.dealLabArts(true);
        flash(n ? `dealt ${n} gem(s) into the bag — seat them from the rack` : 'nothing to deal (already carried, or all excluded)');
        refresh();
      }),
    );
    const kitNote = note('◔ = a gauge art. Unchecked arts stay in the Vault. "Deal now" works mid-run; a fresh run deals at first breath only while the lever and the kit box are both on.');

    // ------------------------------------------------------------- pane --
    const paneHead = section('THE PANE — re-aim the default eyecatch style live (the open registry)');
    const styleRow = hrow();
    const styleSel = selectEl();
    const rebuildStyles = (): void => {
      styleSel.replaceChildren();
      for (const id of Object.keys(EYECATCH_STYLES)) styleSel.append(option(id, id));
      styleSel.value = ULT_CFG.style;
    };
    styleSel.addEventListener('change', () => { setUltStyle(styleSel.value); flash(`pane style → ${styleSel.value}`); refresh(); });
    styleRow.append(styleSel);
    const paneNote = note('Session-only (not persisted): a skill naming its own style keeps it; the rest ride this default.');

    // ------------------------------------------------------------- hand --
    const handHead = section('THE HAND — fill · clear · reset');
    const handRow = hrow();
    handRow.append(
      btn('Fill every gauge ▶', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        flash(`filled ${w.devFillGauges()} gauge(s) to need`); refresh();
      }),
      btn('Clear ultimate cooldowns ▶', () => {
        const w = runActive();
        if (!w) { flash('start a run first'); return; }
        flash(`cleared ${w.devClearUltimateCooldowns()} clock(s)`); refresh();
      }),
      btn('Reset to shipped ▶', () => {
        resetLab(); forget(); rebuildKit(); syncAll(); flash('lever reset to the shipped face; browser memory cleared'); refresh();
      }),
    );

    // ------------------------------------------------------------- read --
    const readHead = section('The read (the lever · the arts on the bar · the wisp pool)');
    const readout = document.createElement('div');
    css(readout, { whiteSpace: 'pre', font: '11px/1.55 Consolas, monospace', padding: '2px 4px' });
    const syncAll = (): void => { for (const s of syncers) s(); };
    const refresh = (): void => {
      syncAll();
      const q = ULT_QA;
      const lines: string[] = [];
      lines.push(`LEVER ${q.active ? 'ON' : 'off'}  cap ${q.cooldownCap}s  throttle ${q.throttleSec}s  gap ${q.globalGapSec}s  kit ${q.grantArts ? 'on' : 'off'}`
        + `  excluded ${q.kitExclude.length}  pane ${ULT_CFG.style}${remembered ? '  (restored from this browser)' : ''}`);
      const w = runActive();
      if (!w) { lines.push('start a run to read the bar'); readout.textContent = lines.join('\n'); return; }
      const p = w.localSeat.actor;
      for (const inst of p.skills) {
        if (!inst?.def.ultimate && !inst?.def.gauge) continue;
        const d = inst.def;
        const cd = p.cooldowns.get(d.id);
        let s = ` ${d.name.padEnd(22)}`;
        if (d.gauge) {
          const eff = p.gaugeEff(inst)!;
          const lock = gaugeLockLeft(inst);
          s += ` gauge ${gaugeFill(inst).toFixed(0)}/${eff.need} ${d.gauge.unit ?? ''}${lock > 0 ? ` (spent ${lock.toFixed(1)}s)` : ''}`;
        }
        if (cd !== undefined && cd > 0) s += `  cooldown ${cd.toFixed(1)}s`;
        lines.push(s);
      }
      const wisps = p.charges.get('wisp') ?? 0;
      if (wisps > 0 || p.spendsCharge('wisp')) lines.push(` wisps ${wisps}`);
      readout.textContent = lines.join('\n');
    };
    const refreshBtn = btn('Refresh', () => refresh());

    rebuildKit();
    rebuildStyles();
    pane.append(leverHead, active.el, grant.el, capRow, thrRow, gapRow, leverNote,
      kitHead, kitRow, kitList, kitNote, paneHead, styleRow, paneNote,
      handHead, handRow, readHead, readout, refreshBtn);
    return { el: pane, onShow: () => { rebuildKit(); rebuildStyles(); refresh(); } };
  },
};
