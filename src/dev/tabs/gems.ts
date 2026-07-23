// ---------------------------------------------------------------------------
// DEV TAB: GEMS — a filterable list of EVERY skill/support gem; click a row to
// drop it (skills → Skills tab, supports → gem bag) at the chosen level, plus
// character cheats (grant levels / skill / passive / vocation points) and the
// vocation playtest row (instant grant + the live spending-gate toggle).
// ---------------------------------------------------------------------------

import { SKILLS } from '../../data/skills';
import { SUPPORTS } from '../../data/supports';
import { VOCATION_CFG, VOCATION_LIST } from '../../data/vocations';
import { makeSkillGem, type SkillRarity } from '../../engine/skills';
import type { DevTabDef } from '../panel';
import { btn, hrow, listRow, numInput, section, selectEl, textInput, wireFilter } from '../ui';

/** Default rarity for spawned skill gems — 3 sockets, plenty for testing. */
const SPAWN_RARITY: SkillRarity = 'rare';

export const gemsTab: DevTabDef = {
  id: 'gems',
  label: 'Gems',
  build: ({ runActive, flash }) => {
    const pane = document.createElement('div');

    const header = hrow('6px');
    const filter = textInput('filter…');
    const lvlLabel = document.createElement('span');
    lvlLabel.textContent = 'lvl';
    const lvl = numInput(1, 1, 40);
    header.append(filter, lvlLabel, lvl);

    const levelOf = (): number => Math.max(1, Math.min(40, parseInt(lvl.value, 10) || 1));

    const cheats = hrow();
    const grantLevels = (n: number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      for (let i = 0; i < n; i++) w.grantXp(Math.max(1, w.meta.xpNeeded - w.meta.xp));
      flash(`+${n} level${n > 1 ? 's' : ''} → now level ${w.player.level}`);
    };
    const grantSkillPts = (n: number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.meta.skillPoints += n;
      flash(`+${n} skill point${n > 1 ? 's' : ''} (${w.meta.skillPoints} total) — open the Skill Book`);
    };
    const grantPassivePts = (n: number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.meta.passivePoints += n;
      flash(`+${n} passive point${n > 1 ? 's' : ''} (${w.meta.passivePoints} total) — press P`);
    };
    const grantVocationPts = (n: number): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.meta.vocationPoints += n;
      flash(`+${n} vocation point${n > 1 ? 's' : ''} (${w.meta.vocationPoints} total) — press P`);
    };
    cheats.append(
      btn('+1 Lvl', () => grantLevels(1)),
      btn('+5 Lvl', () => grantLevels(5)),
      btn('+1 Skill Pt', () => grantSkillPts(1)),
      btn('+10 Skill Pt', () => grantSkillPts(10)),
      btn('+1 Passive Pt', () => grantPassivePts(1)),
      btn('+1 Voc Pt', () => grantVocationPts(1)),
    );

    // --- VOCATION playtest row: instant-grant any vocation + the LIVE spending-
    // gate toggle (VOCATION_CFG.requireGateNode is read on every check, so the
    // flip takes effect immediately — the user's A/B lever for how ascendancy
    // spending should feel). ---
    const vocRow = hrow();
    const vocSel = selectEl();
    vocSel.style.flex = '1';
    for (const v of VOCATION_LIST) {
      const o = document.createElement('option');
      o.value = v.id; o.textContent = `${v.name} (${v.classId})`;
      vocSel.append(o);
    }
    const vocGrant = btn('Grant Vocation', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      flash(w.grantVocation(vocSel.value)
        ? `${vocSel.value} granted — press P (root crest allocated)`
        : 'refused (already granted / per-character cap reached)');
    });
    const gateBtn = btn(`Gate req: ${VOCATION_CFG.requireGateNode ? 'ON' : 'OFF'}`, () => {
      VOCATION_CFG.requireGateNode = !VOCATION_CFG.requireGateNode;
      gateBtn.textContent = `Gate req: ${VOCATION_CFG.requireGateNode ? 'ON' : 'OFF'}`;
      flash(`vocation spending gate ${VOCATION_CFG.requireGateNode ? 'REQUIRES the class start node' : 'open immediately on grant'}`);
    });
    const siteBtn = btn('Force Site', () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      flash(w.devForceVocationSite(vocSel.value)
        ? `${vocSel.value} site raised beside you — walk to it`
        : 'not a secret vocation (no site to raise)');
    });
    vocRow.append(vocSel, vocGrant, gateBtn, siteBtn);

    const list = document.createElement('div');
    list.style.overflowY = 'auto';
    list.style.flex = '1';

    const spawnSkill = (id: string): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.meta.skillInv.push(makeSkillGem(SKILLS[id], levelOf(), SPAWN_RARITY));
      flash(`+ ${SKILLS[id].name} (lv ${levelOf()}) → Skills tab`);
    };
    const spawnSupport = (id: string): void => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      w.meta.inventory.push({ def: SUPPORTS[id], level: levelOf() });
      flash(`+ ${SUPPORTS[id].name} (lv ${levelOf()}) → gem bag`);
    };
    list.append(section(`Skills (${Object.keys(SKILLS).length})`));
    for (const [id, def] of Object.entries(SKILLS)) {
      list.append(listRow(def.name, def.color ?? '#cccccc', (def.tags ?? []).join(' · ') || id, () => spawnSkill(id)));
    }
    list.append(section(`Supports (${Object.keys(SUPPORTS).length})`));
    for (const [id, def] of Object.entries(SUPPORTS)) {
      list.append(listRow(def.name, def.color ?? '#cccccc', id, () => spawnSupport(id)));
    }
    wireFilter(filter, list);

    pane.append(header, cheats, vocRow, list);
    return { el: pane, onShow: () => filter.focus() };
  },
};
