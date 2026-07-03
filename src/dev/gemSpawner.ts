// ---------------------------------------------------------------------------
// DEV PANEL — a quick-and-dirty QA tool (gated by config.ts DEV.gemSpawner).
// Mounts a fixed "🔧 Dev" button bottom-left; clicking opens a TABBED panel:
//
//   • GEMS  — a filterable list of EVERY skill/support gem; click a row to drop
//             it (skills → Skills tab, supports → gem bag) at the chosen level,
//             plus character cheats (grant levels / skill / passive points).
//   • EVENTS — force-spawn each world event in the CURRENT zone on a button press
//             (Demon Invasion / Crusade / Fracture / Hunt / Conclave Ritual /
//             Eldritch Incursion), and a LIVE global event-frequency crank
//             (rate / concurrency / severity sliders) for stress-testing.
//
// Fully self-contained DOM — touches nothing in the game UI, so it's trivial to
// remove. NOT a shipped feature. Event spawns / frequency only meaningfully apply
// on the AUTHORITATIVE peer (host or single-player); on a joined co-op client they
// mutate only the local render shell and are overwritten by the next host snapshot.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { OverlayView } from '../world/overlay';
import type { FrequencyProfile } from '../packages/frequency';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { makeSkillInstance, SKILL_RARITIES, type SkillRarity } from '../engine/skills';

/** Default rarity for spawned skill gems — 3 sockets, plenty for testing. */
const SPAWN_RARITY: SkillRarity = 'rare';

export function mountDevGemSpawner(getWorld: () => World): void {
  const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration>): void => { Object.assign(el.style, s); };

  const btn = document.createElement('button');
  btn.textContent = '🔧 Dev';
  css(btn, {
    position: 'fixed', left: '8px', bottom: '8px', zIndex: '99999',
    background: '#2a2438', color: '#e8d44a', border: '1px solid #5a4a6a',
    borderRadius: '5px', padding: '5px 10px', font: '12px Verdana', cursor: 'pointer',
  });

  const panel = document.createElement('div');
  css(panel, {
    position: 'fixed', left: '8px', bottom: '44px', zIndex: '99999',
    width: '380px', maxHeight: '64vh', display: 'none', flexDirection: 'column',
    background: 'rgba(18,16,26,0.97)', color: '#d8d4e0', border: '1px solid #5a4a6a',
    borderRadius: '6px', padding: '8px', font: '12px Verdana', boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
  });

  const status = document.createElement('div');
  css(status, { minHeight: '15px', color: '#7ec850', margin: '2px 0 4px', fontSize: '11px' });
  const flash = (msg: string): void => { status.textContent = msg; };

  const runActive = (): World | null => {
    const w = getWorld();
    // Before a run starts there is no seat, so world.meta (a getter over the
    // local seat) would throw — guard on the roster FIRST (short-circuit), then
    // reject a finished/over run (post-death window: the dead world lingers until
    // the next run is built).
    return w && w.seats && w.seats.length > 0 && !w.gameOver && !w.player.dead ? w : null;
  };

  const cheatBtn = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    css(b, { background: '#241f33', color: '#e8d44a', border: '1px solid #5a4a6a', borderRadius: '4px', padding: '4px 7px', font: '11px Verdana', cursor: 'pointer' });
    b.addEventListener('click', onClick);
    return b;
  };
  const section = (title: string): HTMLElement => {
    const h = document.createElement('div');
    h.textContent = title;
    css(h, { color: '#9a86c0', fontWeight: 'bold', margin: '6px 0 2px', borderBottom: '1px solid #2a2438', paddingBottom: '2px' });
    return h;
  };

  // ===================================================================== GEMS
  const gemsPane = document.createElement('div');
  css(gemsPane, { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' });

  const header = document.createElement('div');
  css(header, { display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' });
  const filter = document.createElement('input');
  filter.placeholder = 'filter…';
  css(filter, { flex: '1', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '4px', padding: '4px 6px', font: '12px Verdana' });
  const lvlLabel = document.createElement('span');
  lvlLabel.textContent = 'lvl';
  const lvl = document.createElement('input');
  lvl.type = 'number'; lvl.value = '1'; lvl.min = '1'; lvl.max = '40';
  css(lvl, { width: '46px', background: '#0e0c14', color: '#d8d4e0', border: '1px solid #3a3450', borderRadius: '4px', padding: '4px 6px', font: '12px Verdana' });
  header.append(filter, lvlLabel, lvl);

  const cheats = document.createElement('div');
  css(cheats, { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '6px' });

  const list = document.createElement('div');
  css(list, { overflowY: 'auto', flex: '1' });

  const levelOf = (): number => Math.max(1, Math.min(40, parseInt(lvl.value, 10) || 1));

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
  cheats.append(
    cheatBtn('+1 Lvl', () => grantLevels(1)),
    cheatBtn('+5 Lvl', () => grantLevels(5)),
    cheatBtn('+1 Skill Pt', () => grantSkillPts(1)),
    cheatBtn('+10 Skill Pt', () => grantSkillPts(10)),
    cheatBtn('+1 Passive Pt', () => grantPassivePts(1)),
  );

  const spawnSkill = (id: string): void => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    const inst = makeSkillInstance(SKILLS[id], levelOf(), SKILL_RARITIES[SPAWN_RARITY].sockets);
    inst.rarity = SPAWN_RARITY;
    w.meta.skillInv.push(inst);
    flash(`+ ${SKILLS[id].name} (lv ${levelOf()}) → Skills tab`);
  };
  const spawnSupport = (id: string): void => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    w.meta.inventory.push({ def: SUPPORTS[id], level: levelOf() });
    flash(`+ ${SUPPORTS[id].name} (lv ${levelOf()}) → gem bag`);
  };
  const row = (name: string, color: string, sub: string, onClick: () => void): HTMLElement => {
    const r = document.createElement('div');
    r.dataset.search = (name + ' ' + sub).toLowerCase();
    css(r, { display: 'flex', justifyContent: 'space-between', padding: '3px 5px', cursor: 'pointer', borderRadius: '3px' });
    r.innerHTML = `<span style="color:${color}">${name}</span><span style="color:#6a6478;font-size:10px">${sub}</span>`;
    r.addEventListener('mouseenter', () => css(r, { background: '#241f33' }));
    r.addEventListener('mouseleave', () => css(r, { background: 'transparent' }));
    r.addEventListener('click', onClick);
    return r;
  };
  list.append(section(`Skills (${Object.keys(SKILLS).length})`));
  for (const [id, def] of Object.entries(SKILLS)) {
    list.append(row(def.name, def.color ?? '#cccccc', (def.tags ?? []).join(' · ') || id, () => spawnSkill(id)));
  }
  list.append(section(`Supports (${Object.keys(SUPPORTS).length})`));
  for (const [id, def] of Object.entries(SUPPORTS)) {
    list.append(row(def.name, def.color ?? '#cccccc', id, () => spawnSupport(id)));
  }
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    for (const el of Array.from(list.children) as HTMLElement[]) {
      if (!el.dataset.search) continue; // section headers always show
      el.style.display = !q || el.dataset.search.includes(q) ? 'flex' : 'none';
    }
  });
  gemsPane.append(header, cheats, list);

  // =================================================================== EVENTS
  const eventsPane = document.createElement('div');
  css(eventsPane, { display: 'none', flexDirection: 'column', overflowY: 'auto', flex: '1', minHeight: '0' });

  // --- force-spawn one event into the CURRENT zone -------------------------
  const spawnRow = document.createElement('div');
  css(spawnRow, { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '4px' });

  const forceEvent = (label: string, fn: (w: World, view: OverlayView, zid: string) => boolean): HTMLButtonElement =>
    cheatBtn(label, () => {
      const w = runActive();
      if (!w) { flash('start a run first'); return; }
      const zid = w.zone.id;
      let ok = false;
      try { ok = fn(w, w.devOverlayView(), zid); if (ok) w.devRematerialize(); }
      catch (e) { flash(`${label}: ${(e as Error).message}`); return; }
      flash(ok ? `${label} → spawned in ${w.zone.name}`
        : `${label}: unavailable here (package off this run, or unsuitable zone)`);
    });

  spawnRow.append(
    forceEvent('Demon Invasion', (w, v, z) => w.sim.demonField?.devIgnite(v, z) ?? false),
    forceEvent('Crusade', (w, v, z) => w.sim.crusadeField?.devIgnite(v, z) ?? false),
    forceEvent('Fracture', (w, v, z) => w.sim.fractureField?.devIgnite(v, z) ?? false),
    forceEvent('Hunt Beast', (w, v, z) => w.sim.huntField?.devIgnite(v, z) ?? false),
    forceEvent('Conclave Ritual', (w, v, z) => w.sim.conclaveField?.devOpenRitual(v, z) ?? false),
    forceEvent('Deadwake (flood here)', (w, v, z) => w.sim.deadwakeField?.devIgnite(v, z) ?? false),
    forceEvent('Necropolis (fuse here)', (w, v, z) => w.sim.deadwakeField?.devForceNecropolis(v, z) ?? false),
    forceEvent('Migration (herd here)', (w, v, z) => w.sim.migrationField?.devIgnite(v, z) ?? false),
    forceEvent('Brigands (band here)', (w, v, z) => w.sim.brigandField?.devIgnite(v, z) ?? false),
    forceEvent('Contagion (outbreak here)', (w, v, z) => w.sim.contagionField?.devIgnite(v, z) ?? false),
    forceEvent('Holdfast (toll gate here)', (w) => w.devForceHoldfast()),
    forceEvent('Mycelia (bloom here)', (w, v, z) => w.sim.myceliaField?.devIgnite(v, z) ?? false),
  );

  // Incursion + incubation have bespoke signatures (a far landing / a counter).
  const incursionBtn = cheatBtn('Eldritch Incursion (far)', () => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    const z = w.zoneMap[w.zone.id];
    const r = z ? w.sim.incursionField.ignite('eldritch', { x: z.map.x, y: z.map.y }, w.player.level) : null;
    flash(r ? 'Eldritch Incursion landing — hidden zones minted afar; influence creeps in' : 'Incursion at cap / unavailable');
  });
  const incubateBtn = cheatBtn('Force Eldritch Incubation', () => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    if (!w.sim.conclaveField) { flash('conclave not in this run'); return; }
    w.sim.conclaveField.devMaxIncubation();
    flash('incubation maxed — the Eldritch Incursion ignites within moments');
  });
  const corpseTideBtn = cheatBtn('Max Corpse Tide', () => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    if (!w.sim.deadwakeField) { flash('deadwake not in this run'); return; }
    w.sim.deadwakeField.devMaxCounter();
    flash('corpse tide maxed — a Deadwake breaks loose within moments (it drifts in)');
  });
  const fieldBtn = cheatBtn('Field Expanse (travel)', () => {
    const w = runActive();
    if (!w) { flash('start a run first'); return; }
    const ok = w.devTravelToField();
    flash(ok ? 'travelled to a Field expanse — a wide grassy heat-map-shaped mega-zone'
      : 'no Field region found within range of here');
  });
  spawnRow.append(incursionBtn, incubateBtn, corpseTideBtn, fieldBtn);

  // --- LIVE global frequency crank (the testing lever) ---------------------
  const profile: FrequencyProfile = { rate: 1, concurrency: 1, severity: 1 };
  const freqEls: Partial<Record<keyof FrequencyProfile, { rng: HTMLInputElement; val: HTMLElement }>> = {};
  const applyFreq = (): void => {
    const w = runActive();
    if (w) w.sim.setDevFrequency({ ...profile });
    flash(`live frequency → rate ${profile.rate}× · caps ${profile.concurrency}× · size ${profile.severity}×`);
  };
  const freqWrap = document.createElement('div');
  css(freqWrap, { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' });
  const mkFreq = (key: keyof FrequencyProfile, label: string): HTMLElement => {
    const r = document.createElement('div');
    css(r, { display: 'flex', gap: '6px', alignItems: 'center' });
    const lab = document.createElement('span'); lab.textContent = label; css(lab, { width: '92px', fontSize: '11px' });
    const rng = document.createElement('input');
    rng.type = 'range'; rng.min = '0'; rng.max = '10'; rng.step = '0.25'; rng.value = '1';
    css(rng, { flex: '1' });
    const val = document.createElement('span'); val.textContent = '1.0×';
    css(val, { width: '44px', textAlign: 'right', fontSize: '11px', color: '#e8d44a' });
    rng.addEventListener('input', () => {
      profile[key] = +rng.value; val.textContent = (+rng.value).toFixed(2) + '×';
      applyFreq();
    });
    r.append(lab, rng, val);
    freqEls[key] = { rng, val };
    return r;
  };
  freqWrap.append(
    mkFreq('rate', 'Rate (how often)'),
    mkFreq('concurrency', 'Caps (how many)'),
    mkFreq('severity', 'Severity (size)'),
  );
  const freqReset = cheatBtn('Revert to run setting', () => {
    const w = runActive();
    if (w) w.sim.setDevFrequency(null); // drop the override → effective = manifest value
    syncFreq();                         // re-seed sliders from the (possibly non-1×) effective value
    flash('live frequency reverted to the run setting');
  });

  // Re-seed the sliders from the run's EFFECTIVE frequency when the tab opens.
  const syncFreq = (): void => {
    const w = runActive();
    const f = w ? w.sim.effectiveFrequency() : profile;
    profile.rate = f.rate; profile.concurrency = f.concurrency; profile.severity = f.severity;
    for (const k of Object.keys(freqEls) as (keyof FrequencyProfile)[]) {
      const e = freqEls[k]; if (e) { e.rng.value = String(profile[k]); e.val.textContent = profile[k].toFixed(2) + '×'; }
    }
  };

  eventsPane.append(
    section('Force event in CURRENT zone'), spawnRow,
    section('Live event frequency (this run)'), freqWrap, freqReset,
  );

  // ============================================================== Dev pane
  const devPane = document.createElement('div');
  css(devPane, { display: 'none', flexDirection: 'column', overflowY: 'auto', flex: '1', minHeight: '0' });
  const killBtn = cheatBtn('Kill all enemies', () => {
    const w = runActive(); if (!w) { flash('start a run first'); return; }
    flash(`killed ${w.devKillAll()} enemies`);
  });
  const zoneSel = document.createElement('select');
  css(zoneSel, { width: '100%', padding: '4px', background: '#1a1626', color: '#cfc8e0', border: '1px solid #3a3450', borderRadius: '4px', marginBottom: '4px' });
  const refreshZones = (): void => {
    const w = runActive(); zoneSel.innerHTML = '';
    if (!w) return;
    for (const z of w.devZoneList()) {
      const o = document.createElement('option');
      o.value = z.id; o.textContent = `${z.name} — lv${z.level}${z.biome ? ' · ' + z.biome : ''}`;
      zoneSel.append(o);
    }
  };
  const travelBtn = cheatBtn('Travel to selected zone', () => {
    const w = runActive(); if (!w) { flash('start a run first'); return; }
    flash(w.devTravelTo(zoneSel.value) ? `→ ${zoneSel.value}` : 'no such zone');
  });
  const ghostBtn = cheatBtn('Ghost: OFF', () => {
    const w = runActive(); if (!w) return;
    ghostBtn.textContent = `Ghost: ${w.devToggleGhost() ? 'ON' : 'OFF'}`;
  });
  const noclipBtn = cheatBtn('Noclip: OFF', () => {
    const w = runActive(); if (!w) return;
    noclipBtn.textContent = `Noclip: ${w.devToggleNoclip() ? 'ON' : 'OFF'}`;
  });
  devPane.append(section('Combat'), killBtn, section('Free traversal (no waypoint / locks / combat)'), zoneSel, travelBtn, ghostBtn, noclipBtn);

  // ============================================================== tab strip
  const tabs = document.createElement('div');
  css(tabs, { display: 'flex', gap: '4px', marginBottom: '6px' });
  const panes: HTMLElement[] = [gemsPane, eventsPane, devPane];
  const tabPairs: [HTMLButtonElement, HTMLElement][] = [];
  const mkTab = (label: string, pane: HTMLElement, onShow?: () => void): HTMLButtonElement => {
    const t = cheatBtn(label, () => select());
    const select = (): void => {
      for (const p of panes) p.style.display = p === pane ? 'flex' : 'none';
      for (const [tb, pn] of tabPairs) tb.style.background = pn === pane ? '#3a3450' : '#241f33';
      onShow?.();
    };
    (t as HTMLButtonElement & { _select?: () => void })._select = select;
    return t;
  };
  const tabGems = mkTab('Gems', gemsPane);
  const tabEvents = mkTab('Events', eventsPane, syncFreq);
  const tabDev = mkTab('Dev', devPane, refreshZones);
  tabPairs.push([tabGems, gemsPane], [tabEvents, eventsPane], [tabDev, devPane]);
  tabs.append(tabGems, tabEvents, tabDev);

  panel.append(tabs, status, gemsPane, eventsPane, devPane);
  (tabGems as HTMLButtonElement & { _select?: () => void })._select?.(); // default to Gems

  btn.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) filter.focus();
  });

  document.body.append(btn, panel);
}
