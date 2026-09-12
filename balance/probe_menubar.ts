// MENU BAR PROBE — THE MENU FABRIC (engine/menu.ts + data/menu.ts +
// ui/menuConfig.ts + ui/icons.ts) pinned headlessly, plus a text census of
// the DOM half (ui/menubar.ts, ui/panels.ts, main.ts, renderer.ts, world.ts).
//
// The failure classes this rig pins:
//   A. THE REGISTRY — groups and entries unique; every entry names a known
//      group, a drawable icon, a verb; every attention row names an entry;
//      duplicates and unknown groups refuse; the anchor registry + dials sane.
//   B. THE FOLD (the real engine, in town) — THE EXISTENCE LAW (an unowned
//      feature's page is hidden; a run-ledger stamp counts through the merged
//      view), THE REACH LAW (a station page is sealed away from its station
//      with a plain why, open at it — on the SAME near-read its dwell fires
//      on), the hero's pages open anywhere, fold order = group order then
//      entry order, the vendor page reads the counter's stock.
//   C. ATTENTION — unspent passive points are the tree's pips and the
//      button's roll-up; Mireille's flask lesson lights the inventory while
//      her gift waits unseated and the bag is closed, quiets when the bag is
//      open, never speaks for a lived lesson; banked tree points fold.
//   D. SETTINGS — the panelMenu bind exists on keyboard + pad with a label;
//      menuBar options default from the dials, round-trip through the save,
//      and garbage falls back.
//   E. THE CENSUS — every entry's verb has a host row (ui/panels.ts
//      menuVerbs); main.ts binds the toggle behind the folio's Tab walk,
//      drives the per-frame sync, folds the tray first on Esc; the hero's
//      passive-point nudge is retired in the renderer and the cluster rect
//      is published; the three station dwells read the new near-reads; the
//      stack rung sits above the folio and under the popups; the roster has
//      this row; index.html carries no menu root (the TS-built law).
//
//   npx tsx balance/probe_menubar.ts

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { bootSimEngine, classById } from '../src/sim/arena';
import { resetActorIdCounter } from '../src/engine/actor';
import { World, type Seat } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { CLASSES } from '../src/data/classes';
import { FEATURE, makeAccount } from '../src/meta/account';
import { START_ZONE } from '../src/data/zones';
import { townStationFeatures } from '../src/data/townBuild';
import { VENDORS } from '../src/data/vendors';
import { SKILLS } from '../src/data/skills';
import { makeSkillGem, bandPointsAt, treePointsSpent } from '../src/engine/skills';
import { ownedUnlockById } from '../src/meta/unlocks';
import '../src/data/menu';
import { bankedTreePoints } from '../src/data/menu';
import {
  MENU_ATTENTION, MENU_ENTRIES, MENU_GROUPS, menuFold, menuLessonTarget,
  registerMenuAttention, registerMenuEntry, registerMenuGroup, type MenuReads,
} from '../src/engine/menu';
import { MENU_ICONS } from '../src/ui/icons';
import { MENU_ANCHORS, MENU_CFG } from '../src/ui/menuConfig';
import { ESCAPE_CFG, ESCAPE_MODES, escapeModeOf } from '../src/ui/escapeConfig';
import {
  ACTION_IDS, ACTION_LABELS, DEFAULT_KEYBINDS, DEFAULT_PAD_BINDS, PAD_ACTION_IDS,
  deserializeSettings, makeSettings, serializeSettings,
} from '../src/meta/settings';
import { Z_LADDER } from '../src/ui/zorder';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}
const src = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

// --- A. THE REGISTRY -----------------------------------------------------------
console.log('A. THE REGISTRY');
{
  const ids = MENU_ENTRIES.map(e => e.id);
  check('A1 entry ids unique', new Set(ids).size === ids.length);
  check('A2 group ids unique', new Set(MENU_GROUPS.map(g => g.id)).size === MENU_GROUPS.length);
  check('A3 every entry names a registered group', MENU_ENTRIES.every(e => MENU_GROUPS.some(g => g.id === e.group)));
  const badIcon = MENU_ENTRIES.filter(e => !MENU_ICONS[e.icon] || !MENU_ICONS[e.icon].includes('<'));
  check('A4 every entry names a drawable icon', badIcon.length === 0, badIcon.map(e => `${e.id}→${e.icon}`).join(','));
  check('A5 every entry names a verb + label', MENU_ENTRIES.every(e => e.verb.length > 0 && e.label.length > 0));
  check('A6 every attention row names a known entry', MENU_ATTENTION.every(s => ids.includes(s.entry)));
  check('A7 the menu glyph exists', !!MENU_ICONS.menu);
  check('A8 a doubled group refuses', (() => { try { registerMenuGroup({ id: 'hero', label: 'x', order: 9 }); return false; } catch { return true; } })());
  check('A9 a doubled entry refuses', (() => {
    try { registerMenuEntry({ id: 'inventory', label: 'x', icon: 'bag', group: 'hero', verb: 'inventory', order: 0 }); return false; } catch { return true; }
  })());
  check('A10 an entry on an unknown group refuses', (() => {
    try { registerMenuEntry({ id: 'zz_probe', label: 'x', icon: 'bag', group: 'nope', verb: 'inventory', order: 0 }); return false; } catch { return true; }
  })());
  check('A11 a doubled attention row refuses', (() => {
    try { registerMenuAttention({ id: 'passive_points', entry: 'passives', kind: 'pip', read: () => 0 }); return false; } catch { return true; }
  })());
  check('A12 the anchor registry: unique ids, the default among them',
    new Set(MENU_ANCHORS.map(a => a.id)).size === MENU_ANCHORS.length && MENU_ANCHORS.some(a => a.id === MENU_CFG.anchorDefault));
  check('A13 the dials are sane', MENU_CFG.syncSec > 0 && MENU_CFG.syncSec < 2 && MENU_CFG.pipMax >= 1 && MENU_CFG.tilePx >= 24 && MENU_CFG.couchLiftPx > 0);
  check('A14 the shipped roster: the hero\'s five pages, the stations, the pause',
    ['inventory', 'character', 'passives', 'map', 'journal', 'vendor', 'salvage', 'font', 'oracle', 'bestiary',
      'bounties', 'caravan', 'harbor', 'hold', 'mercs', 'pause'].every(id => ids.includes(id)));
}

// --- B. THE FOLD (the real engine, in town) -------------------------------------
console.log('B. THE FOLD (the real engine, in town)');
bootSimEngine();
resetActorIdCounter();
const acc = makeAccount();
for (const f of townStationFeatures()) acc.features.add(f);
for (const f of [FEATURE.BOUNTY_BOARD, FEATURE.CARAVAN, FEATURE.MERC_RECRUITER]) acc.features.add(f);
for (const c of CLASSES) acc.unlockedClasses.add(c.id);
const manifest = buildManifest(acc, 0x0f02);
for (const p of manifest.packages) p.enabled = false;
const w = new World(acc, Object.freeze(manifest));
w.createPlayer(classById('warrior'));
w.loadZone(START_ZONE);
const seat: Seat = w.localSeat;
const openPages = new Set<string>();
const reads = (): MenuReads => ({
  account: acc, world: w, seat, pageOpen: id => openPages.has(id), ownedUnlock: ownedUnlockById(acc),
});
const stateOf = (id: string): string => menuFold(reads()).entries.find(e => e.def.id === id)?.state ?? 'hidden';
const viewOf = (id: string) => menuFold(reads()).entries.find(e => e.def.id === id);
const at = (x: number, y: number): void => { seat.actor.pos.x = x; seat.actor.pos.y = y; };
const seek = (c: { x: number; y: number }, ok: () => boolean): boolean => {
  for (let r = 0; r <= 140; r += 10) {
    for (let a = 0; a < 360; a += 30) {
      at(Math.round(c.x + r * Math.cos(a * Math.PI / 180)), Math.round(c.y + r * Math.sin(a * Math.PI / 180)));
      if (ok()) return true;
    }
  }
  return false;
};
{
  at(-5000, -5000);
  const fold = menuFold(reads());
  const heroPages = ['inventory', 'character', 'passives', 'map', 'journal'];
  check('B1 the hero\'s pages are open anywhere', heroPages.every(id => stateOf(id) === 'open'));
  check('B2 THE EXISTENCE LAW: owned station features stand; the sea\'s pages hide until a port is found',
    ['salvage', 'oracle', 'bestiary', 'bounties', 'caravan', 'mercs', 'vendor', 'font'].every(id => stateOf(id) !== 'hidden')
    && stateOf('harbor') === 'hidden' && stateOf('hold') === 'hidden');
  const stations = fold.entries.filter(e => e.def.group === 'town');
  check('B3 THE REACH LAW: away from everything every station page is sealed with a plain why',
    stations.length > 0 && stations.every(e => e.state === 'sealed' && e.sealedHint.length > 0),
    stations.map(e => `${e.def.id}:${e.state}`).join(','));
  check('B4 fold order = group order then entry order',
    fold.groups.map(g => g.group.id).join(',') === 'hero,town,system'
    && fold.groups.every(g => g.entries.every((e, i) => i === 0 || g.entries[i - 1].def.order <= e.def.order)));
  check('B5 the pause page is open anywhere', stateOf('pause') === 'open');
  check('B6 a spot at the bench exists', seek(w.townSeat('salvage'), () => w.nearSalvage(seat)));
  check('B7 at the bench: the bench page is open, the stone\'s sealed (the same near-read the dwell fires on)',
    stateOf('salvage') === 'open' && stateOf('oracle') === 'sealed' && w.nearSalvage(seat) && !w.nearOracle(seat));
  check('B8 a spot by the Tracker\'s fire exists', seek(w.townSeat('tracker'), () => w.nearTracker(seat)));
  check('B9 by the fire: the bestiary page is open and the bench sealed', stateOf('bestiary') === 'open' && stateOf('salvage') === 'sealed');
  acc.features.delete(FEATURE.TRACKER);
  check('B10 the feature gone, the page is HIDDEN even at the fire — genuinely unlocked or nothing', stateOf('bestiary') === 'hidden');
  acc.features.add(FEATURE.TRACKER);
  check('B11 the feature back, the page returns open', stateOf('bestiary') === 'open');
  w.ledger.first_port_found = 1;
  check('B12 a RUN-ledger stamp counts through the merged view: the sea\'s pages exist, sealed away from a board',
    stateOf('harbor') === 'sealed' && stateOf('hold') === 'sealed');
  delete w.ledger.first_port_found;
  acc.ledger.first_port_found = 1;
  check('B13 …and an ACCOUNT stamp does too', stateOf('harbor') === 'sealed');
  delete acc.ledger.first_port_found;
  check('B14 a spot under Brandt\'s roof exists', seek(w.townSeat('blacksmith'), () => w.nearSmith(seat)));
  const stocked = VENDORS.some(v => v.near(w, seat) && v.stock(w).length > 0);
  const vendor = viewOf('vendor');
  check('B15 at the counter: the vendor page reads the shelf — open with stock, else sealed on the empty-counter line',
    !!vendor && vendor.state === (stocked ? 'open' : 'sealed')
    && (stocked || vendor.sealedHint.includes('empty')));
  const mercs = viewOf('mercs');
  check('B16 the mercenaries page seals on THE PARLEY GATE\'s own words',
    !!mercs && mercs.state === 'sealed' && mercs.sealedHint.length > 0 && w.mercParley(seat).why !== null);
}

// --- C. ATTENTION ----------------------------------------------------------------
console.log('C. ATTENTION');
{
  at(-5000, -5000);
  seat.meta.passivePoints = 0;
  let fold = menuFold(reads());
  check('C1 no points, no pips, no lesson', fold.total.pips === 0 && !fold.total.lesson
    && fold.entries.every(e => e.attention.pips === 0 && !e.attention.lesson));
  seat.meta.passivePoints = 3;
  fold = menuFold(reads());
  const tree = fold.entries.find(e => e.def.id === 'passives')!;
  check('C2 three unspent passive points = the tree\'s pip count and the button\'s roll-up',
    tree.attention.pips === 3 && fold.total.pips === 3);
  seat.meta.passivePoints = 0;
  // THE LESSON: her gift handed over (the run ledger), a flask waiting in the bag.
  check('C3 before the gift no lesson stands', w.mireilleGiftLesson() === null);
  w.ledger.mireille_flasks_given = 1;
  const flask = w.grantSkillGemItem(seat, makeSkillGem(SKILLS.life_flask, 1, 'magic'));
  check('C4 the gift lands in the bag and the engine\'s lesson reads learn', !!flask && w.mireilleGiftLesson() === 'learn');
  fold = menuFold(reads());
  const bag = fold.entries.find(e => e.def.id === 'inventory')!;
  check('C5 the lesson lights the INVENTORY page and the roll-up while the bag is closed',
    bag.attention.lesson && fold.total.lesson && menuLessonTarget(fold)?.def.id === 'inventory');
  openPages.add('inventory');
  fold = menuFold(reads());
  check('C6 the bag open, the glow moves on (the page has been reached)',
    !fold.entries.find(e => e.def.id === 'inventory')!.attention.lesson && !fold.total.lesson && menuLessonTarget(fold) === null);
  openPages.delete('inventory');
  w.ledger.mireille_lesson_lived = 1;
  fold = menuFold(reads());
  check('C7 a LIVED lesson never lights again, flask in the bag or not', !fold.total.lesson);
  delete w.ledger.mireille_lesson_lived;
  // BANKED TREE POINTS fold over every known tree skill.
  let manual = 0;
  for (const inst of seat.meta.knownSkills.values()) if (inst.def.tree) manual += Math.max(0, bandPointsAt(inst.level) - treePointsSpent(inst));
  check('C8 banked ability points fold over every known tree skill', bankedTreePoints(reads()) === manual);
}

// --- D. SETTINGS -----------------------------------------------------------------
console.log('D. SETTINGS');
{
  check('D1 panelMenu is a keyboard AND a pad action with a label',
    ACTION_IDS.includes('panelMenu') && PAD_ACTION_IDS.includes('panelMenu') && ACTION_LABELS.panelMenu === 'Menu'
    && DEFAULT_KEYBINDS.panelMenu === 'tab' && DEFAULT_PAD_BINDS.panelMenu.startsWith('pad:'));
  const s = makeSettings();
  check('D2 menuBar options default from the dials', s.menuBar.anchor === MENU_CFG.anchorDefault && s.menuBar.dock === MENU_CFG.dockDefault);
  s.menuBar.anchor = 'right';
  s.menuBar.dock = true;
  const back = deserializeSettings(serializeSettings(s));
  check('D3 the options round-trip through the save', !!back && back.menuBar.anchor === 'right' && back.menuBar.dock === true);
  const saved = serializeSettings(s);
  saved.menuBar = { anchor: 'nowhere', dock: 'yes' as unknown as boolean };
  const healed = deserializeSettings(saved);
  check('D4 garbage falls back to the dials', !!healed && healed.menuBar.anchor === MENU_CFG.anchorDefault && healed.menuBar.dock === MENU_CFG.dockDefault);
  const older = serializeSettings(s);
  delete older.menuBar;
  const grand = deserializeSettings(older);
  check('D5 an older save without the block reads the defaults', !!grand && grand.menuBar.anchor === MENU_CFG.anchorDefault);
  // THE ESCAPE POLICY (ui/escapeConfig.ts, 2026-09-11): a registry the
  // Options row cycles and the cascade reads at the press — ids unique, the
  // default a real row, every `keep` id a registered page (the sweep names
  // hero pages the way the tray does), unknown ids fall back, and the
  // choice round-trips through the save like every option.
  check('D6 ESCAPE_MODES: unique ids, a real default, keep lists name registered pages, unknown ids fall back',
    new Set(ESCAPE_MODES.map(m => m.id)).size === ESCAPE_MODES.length
    && ESCAPE_MODES.some(m => m.id === ESCAPE_CFG.default)
    && ESCAPE_MODES.every(m => m.keep.every(id => MENU_ENTRIES.some(e => e.id === id)))
    && escapeModeOf('nope').id === ESCAPE_CFG.default);
  const e = makeSettings();
  check('D7 escapeCloses defaults from the dial', e.escapeCloses === ESCAPE_CFG.default);
  e.escapeCloses = 'step';
  const eBack = deserializeSettings(serializeSettings(e));
  const eBad = serializeSettings(e);
  eBad.escapeCloses = 'sideways' as unknown as typeof eBad.escapeCloses;
  const eOld = serializeSettings(e);
  delete eOld.escapeCloses;
  check('D8 escapeCloses round-trips; garbage and older saves read the default',
    eBack?.escapeCloses === 'step'
    && deserializeSettings(eBad)?.escapeCloses === ESCAPE_CFG.default
    && deserializeSettings(eOld)?.escapeCloses === ESCAPE_CFG.default);
  // THE ABILITY POINT PROMPT (2026-09-11, her law — show, don't tell): the
  // chooser popup is opt-in; a pre-dial save reads OFF; the choice round-trips.
  const t = makeSettings();
  const tOld = serializeSettings(t);
  delete tOld.treePrompt;
  t.treePrompt = true;
  check('D9 the Ability point prompt defaults OFF, an older save reads OFF, and ON round-trips',
    makeSettings().treePrompt === false && deserializeSettings(tOld)?.treePrompt === false
    && deserializeSettings(serializeSettings(t))?.treePrompt === true);
}

// --- E. THE CENSUS ---------------------------------------------------------------
console.log('E. THE CENSUS');
{
  const panels = src('src/ui/panels.ts');
  const main = src('src/main.ts');
  const renderer = src('src/render/renderer.ts');
  const world = src('src/engine/world.ts');
  const html = src('index.html');
  const roster = src('balance/proberoster.ts');
  const verbsBody = panels.slice(panels.indexOf('private menuVerbs(): Record<string, MenuVerb> {'));
  const missing = [...new Set(MENU_ENTRIES.map(e => e.verb))].filter(v => !new RegExp(`\\n      ${v}: \\{`).test(verbsBody.slice(0, verbsBody.indexOf('\n  }\n'))));
  check('E1 every entry\'s verb has a host row in ui/panels.ts menuVerbs', missing.length === 0, missing.join(','));
  check('E2 the bar is built with the host table and enrolled in the movable roots',
    panels.includes('this.menuBar = new MenuBar({') && panels.includes('this.vocationMenu, this.menuBar.root];'));
  check('E3 the tray blocks the hero\'s hands and folds under hideAll',
    panels.includes('|| this.menuBar.isTrayOpen()') && panels.includes('hideAll(): void {\n    this.menuBar.closeTray();'));
  // THE MENU STANDS (2026-09-11, her ask): the bar syncs whenever the game
  // runs — HUD veil or not (Mu keeps the Menu; its pages read sealed) — so
  // the main menu never depends on a remembered keybind.
  check('E4 main.ts binds the toggle behind the folio\'s Tab walk and syncs the bar per frame, veil or not',
    main.includes('pad.justPressed(pb.panelMenu)) && !ui.folioWalkArmed()) ui.toggleMenu();')
    && main.includes('ui.menuBarSync(dt, running);') && !main.includes('menuBarSync(dt, running && !world.scene?.hudVeil)'));
  check('E5 Esc folds the tray first', main.indexOf('if (ui.menuTrayClose()) return;') < main.indexOf('if (ui.folioCloseFront()) return;')
    && main.indexOf('if (ui.menuTrayClose()) return;') > 0);
  check('E6 the hero\'s passive-point nudge is retired (guests keep theirs) and the cluster rect is published',
    renderer.includes('if (m.passivePoints > 0 && !worldInfo) {') && renderer.includes('this.hudClusterRects.push({ seatId: seat.id,'));
  check('E7 the three station dwells read the near-reads the menu reads',
    world.includes('const engaged = this.nearHarborBoard();') && world.includes('const engaged = this.nearMusterHorn();')
    && world.includes('const parley = this.mercParley();'));
  check('E8 the stack rung sits above the folio and under the popups', Z_LADDER.menubar > Z_LADDER.folio && Z_LADDER.menubar < Z_LADDER.popup);
  check('E9 the roster carries this probe', roster.includes("probe: 'probe_menubar.ts'"));
  check('E10 index.html carries no menu root (the TS-built law)', !html.includes('id="menu-bar"'));
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
