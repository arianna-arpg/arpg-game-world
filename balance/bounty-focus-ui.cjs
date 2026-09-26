// Production panel focus and departure, with isolated saves and a hidden window.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'bounty-focus-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 55000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'bounty-focus-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1400, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  const run = async source => {
    const result = await win.webContents.executeJavaScript(`(() => { try { return { value: ${source} }; } catch (e) { return { error: e.stack }; } })()`);
    if (result.error) throw new Error(result.error);
    return result.value;
  };
  try {
    await win.loadURL(server.url);
    await run(`(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(); w.account.features.add('bounty_board');
      w.loadZone('crossroads'); w.completedObjectives.add('crossroads'); w.loadZone('lastlight');
      // Freeze simulation, while exercising the real per-frame UI and dwell dispatcher.
      w.update = () => {};
      window.boardAt = w.bountyBoardsHere().find(b => b.id === 'lastlight');
      // Use a reachable approach cell, not the solid board prop's own cell.
      const candidates = [w.townSeat('bounty_board')];
      for (let radius = 16; radius <= 112; radius += 16) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8)
          candidates.push({ x: boardAt.pos.x + Math.cos(angle) * radius, y: boardAt.pos.y + Math.sin(angle) * radius });
      }
      w.player.tier = boardAt.tier;
      // The input pass still applies body collision even with world.update frozen.
      // A reachable point may overlap scenery and get pushed out of dwell range.
      window.boardApproach = candidates.map(p => w.findFreeSpot(p, w.player.radius, boardAt.tier)).find(p => {
        Object.assign(w.player.pos, p);
        return !w.pointInSolid(p.x, p.y, w.player.radius, boardAt.tier) && w.nearBountyBoard();
      });
      if (!boardApproach) throw new Error('board has no reachable approach');
      Object.assign(w.player.pos, boardApproach);
      w.armBountyBoard('lastlight'); __game.ui.folioSync();
    })()`);
    for (const [width, height] of [[1400, 1000], [1000, 720]]) {
      win.setContentSize(width, height);
      await new Promise(r => setTimeout(r, 100));
      for (const page of ['passives', 'skills', 'skilltree']) {
        const result = await run(`(() => {
          const ui = __game.ui, w = __game.world();
          const must = (ok, why) => { if (!ok) throw new Error(why); };
          ui.hideAll(); ui.folioSync();
          Object.assign(w.player.pos, boardApproach); w.player.tier = boardAt.tier;
          ui.toggleInventory(); ui.folioSync(); // settle the remembered drawer before the next user action
          let id = ${JSON.stringify(page)}, el;
          if (id === 'passives') { ui.inventoryPages.request('passives', w.localSeat.id, 'show'); el = document.getElementById('passive-tree'); }
          else if (id === 'skills') {
            if (!ui.skillsOpen) ui.toggleBuildPanel();
            ui.folioSync(); ui.folio.front('skills'); el = document.getElementById('skills-panel');
          } else {
            const skill = [...w.localSeat.meta.knownSkills.values()].find(s => s.def.tree);
            must(skill, 'starting class needs a skill tree');
            // This focus fixture must own the current skill-tree access gates.
            w.account.ledger.odyssey_stage_2 = 1;
            w.account.memorySecondary.add('skill:' + skill.def.id);
            must(!w.memorySecondaryRefusal(skill.def.id), 'fixture must awaken its selected skill');
            ui.openSkillTree(skill.def.id); id = 'skilltree:' + skill.def.id;
            el = ui.skillTreePanes.get(skill.def.id).el;
          }
          ui.folioSync();
          must(ui.folio.bookFor(id)?.front === id, 'fixture must start with ' + id + ' selected');
          const before = el.innerHTML, rect = el.getBoundingClientRect().toJSON();
          el.scrollTop = 40; const scroll = el.scrollTop;
          const focus = el.querySelector('button'); focus?.focus();
          w.bountyDwellSeatId = w.localSeat.id; w.bountyDwellBoardId = 'lastlight';
          w.bountyDwellRequested = true; __game.step(2);
          const book = ui.folio.bookFor('bounties');
          must(ui.bountiesOpen && book?.front === id, 'dwell must keep ' + id + ' active: ' + JSON.stringify({ width: innerWidth, open: ui.bountiesOpen, near: w.nearBountyBoard(), book, views: ui.folio.views(), escape: ui.escapeMenuOpen }));
          must(document.getElementById('bounty-menu').classList.contains('folio-shelved'), 'board must be shelved');
          must(el.innerHTML === before && el.scrollTop === scroll, 'dwell must preserve page content and scroll');
          must(!focus || document.activeElement === focus, 'dwell must preserve keyboard focus');
          const after = el.getBoundingClientRect();
          must(Math.abs(after.x - rect.x) < 1 && Math.abs(after.y - rect.y) < 1, 'dwell must preserve page position');
          const tab = document.querySelector('[data-folio-tab="bounties"]');
          must(tab?.getAttribute('aria-selected') === 'false', 'board must have an inactive tab');
          const strip = tab.parentElement.getBoundingClientRect();
          must(Math.abs(strip.x - after.x) < 2 && Math.abs(strip.width - after.width) < 2, 'tab strip must follow active panel');
          // Leaving with the board hidden removes only its tab and stops its refresh timer.
          w.player.pos.x = boardAt.pos.x + 1000; __game.step(2);
          must(!ui.bountiesOpen && ui.bountyTicker === null, 'hidden board must close on departure');
          must(ui.folio.bookFor(id)?.front === id && !ui.folio.bookFor('bounties'), 'page must survive departure');
          // A queued request at the old board is rejected before rendering.
          w.bountyDwellRequested = true; __game.step(2);
          must(!ui.bountiesOpen, 'stale dwell must not reopen a distant board');
          Object.assign(w.player.pos, boardApproach);
          ui.showBounties(undefined, 'lastlight'); ui.folioSync();
          document.querySelector('[data-folio-tab="bounties"]').click();
          must(ui.folio.bookFor(id)?.front === 'bounties', 'click must select board');
          w.player.pos.x += 1000; __game.step(2);
          must(!ui.bountiesOpen && ui.folio.bookFor(id)?.front === id, 'selected departure must restore page');
          // Explicit menu opening fronts even a board that is already hidden in the book.
          Object.assign(w.player.pos, boardApproach);
          ui.showBounties(undefined, 'lastlight'); ui.menuVerbs().bounties.open(); ui.folioSync();
          must(ui.folio.bookFor(id)?.front === 'bounties', 'menu choice must front board');
          ui.folio.front(id); ui.folioSync();
          return { page: id, book: ui.folio.bookFor(id), rect, strip: strip.toJSON() };
        })()`);
        fs.writeFileSync(path.join(dir, `bounty-focus-${page}-${width}.json`), JSON.stringify(result, null, 2));
        await new Promise(r => setTimeout(r, 200)); // allow offscreen compositor to paint after tab/viewport changes
        fs.writeFileSync(path.join(dir, `bounty-focus-${page}-${width}.png`), (await win.webContents.capturePage()).toPNG());
      }
    }
    await run(`(() => {
      const ui = __game.ui, w = __game.world();
      const must = (ok, why) => { if (!ok) throw new Error(why); };
      ui.hideAll(); ui.folioSync(); Object.assign(w.player.pos, boardApproach);
      ui.showBounties(undefined, 'lastlight'); ui.folioSync();
      must(ui.bountiesOpen && ui.folio.bookFor('bounties')?.front === 'bounties', 'board alone must display immediately');
      must(document.getElementById('bounty-menu').getBoundingClientRect().width > 0, 'solo board must be drawn');
      w.loadZone('crossroads'); __game.step(2);
      must(!ui.bountiesOpen && ui.bountyTicker === null, 'zone change must close the board');
      w.bountyDwellRequested = true; __game.step(2);
      must(!ui.bountiesOpen, 'old zone request must not reopen board');
    })()`);
    assert.deepEqual(errors, []);
    console.log('PASS bounty focus: Skills, Passives and skill trees at two sizes; quiet dwell, tab/menu selection, state preservation, hidden/selected departure, solo opening and zone changes');
  } finally { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });
