// Run after the adventure-region probe and a production build. Isolated, hidden.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports');
const fixtures = JSON.parse(fs.readFileSync(path.join(dir, 'adventure-fixtures.json'), 'utf8'));
// Only this explicit flag opens a visible window. The preview character and
// saves stay isolated from normal play, with invulnerability for exploration.
const preview = process.argv.find(a => a.startsWith('--play='))?.slice(7);
app.setPath('userData', path.join(dir, 'adventure-ui-profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = preview ? null : setTimeout(() => app.exit(1), 90000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'adventure-ui-saves-' + process.pid) });
  const win = new BrowserWindow({ show: !!preview, width: 1400, height: 1000,
    webPreferences: { offscreen: !preview, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const capture = async name => {
    win.webContents.invalidate();
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.writeFileSync(path.join(dir, name + '.png'), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadURL(server.url);
    if (preview) {
      const fixture = fixtures.find(f => f[0].complex.kind === preview);
      if (!fixture) throw Error('Unknown preview: ' + preview);
      await win.webContents.executeJavaScript(`(() => {
        Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
        __game.account().ledger.prologue_lived = 1;
        __game.devStartRun('warrior'); __game.ui.hideAll();
        const w = __game.world(); w.player.level = 10; w.player.invulnerable = true;
        const fixture = ${JSON.stringify(fixture)};
        for (const z of fixture) w.zoneMap[z.id] = z;
        w.loadZone(fixture[0].complex.root);
        document.title = 'Adventure exploration preview — invulnerable hero';
      })()`);
      win.on('closed', () => { server.server.close(); app.quit(); });
      return;
    }
    const setup = await win.webContents.executeJavaScript(`(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.hold(true); __game.ui.hideAll();
      const w = __game.world(); w.player.level = 10; w.player.invulnerable = true;
      const fixture = ${JSON.stringify(fixtures[0])};
      for (const z of fixture) w.zoneMap[z.id] = z;
      const root = fixture.find(z => z.id === z.complex.root);
      w.loadZone(root.id);
      const board = w.bountyBoardsHere().find(b => b.id === root.id);
      if (!board) throw Error('missing local board');
      Object.assign(w.player.pos, board.pos);
      w.armBountyBoard(root.id);
      __game.ui.showBounties(undefined, root.id); __game.step(2);
      return { board: root.id, offers: w.bountyOffers.filter(p => p.boardId === root.id).map(p => p.kind) };
    })()`);
    assert(setup.offers.includes('passage'));
    for (const [width, height] of [[1400,1000], [1000,720]]) {
      win.setContentSize(width, height);
      await new Promise(r => setTimeout(r, 250));
      const result = await win.webContents.executeJavaScript(`(() => {
        const p = document.getElementById('bounty-menu'), r = p.getBoundingClientRect();
        return { text: p.innerText, rect: [r.x,r.y,r.width,r.height], scroll: p.scrollWidth, client: p.clientWidth };
      })()`);
      assert(result.text.includes('Open: The buried parish'));
      assert(result.text.includes('Return to this board'));
      assert(result.rect[0] >= -1 && result.rect[0] + result.rect[2] <= width + 1);
      assert(result.scroll <= result.client + 1);
      await capture('adventure-board-' + width);
      fs.writeFileSync(path.join(dir, 'adventure-board-' + width + '.json'), JSON.stringify(result, null, 2));
    }
    win.setContentSize(1400, 1000);
    const walkthrough = await win.webContents.executeJavaScript(`(() => {
      const w = __game.world(), root = w.zone.id;
      const p = w.bountyOffers.find(p => p.boardId === root && p.kind === 'passage');
      document.querySelector('[data-bounty-accept="' + p.id + '"]').click();
      __game.step(2); __game.ui.hideAll();
      if (!w.bountyHands.some(h => h.id === p.id)) throw Error('accept click did not take commission');
      const go = target => {
        const paths = [[w.zone.id]], seen = new Set([w.zone.id]);
        let route;
        for (let i = 0; i < paths.length; i++) {
          const path = paths[i], id = path.at(-1);
          if (id === target) { route = path; break; }
          for (const e of w.zoneMap[id].exits) {
            if (seen.has(e.to) || w.zoneMap[e.to]?.complex?.root !== root) continue;
            const a = w.zoneMap[id].complex?.bountyPassage, b = w.zoneMap[e.to].complex?.bountyPassage;
            if ((a?.to === e.to && !a.opened) || (b?.to === id && !b.opened)) continue;
            seen.add(e.to); paths.push([...path, e.to]);
          }
        }
        if (!route) throw Error('no open route to ' + target);
        for (const id of route.slice(1)) {
          const e = w.exits.find(e => e.to === id);
          if (!e || w.isExitLocked(e)) throw Error('route disagrees with actual exit');
          Object.assign(w.player.pos, e.pos); w.travelThrough(e);
          if (w.zone.id !== id) throw Error('travel did not arrive');
        }
      };
      go(p.zoneId);
      const gate = w.zone.complex.bountyPassage, locale = JSON.stringify(w.zone.locale);
      const sealed = w.exits.find(e => e.to === gate.to);
      if (!w.isExitLocked(sealed)) throw Error('commission opened early');
      if (!w.digs.length) throw Error('market has no live caches');
      // Remove combat pressure in the QA course, then perform the real timed
      // interactions. Do not stamp completion or fixture charge ourselves.
      const clearPressure = () => {
        for (const a of [...w.actors]) if (!a.dead && a.team === 'enemy') w.kill(a, true);
      };
      const total = w.digs.length;
      for (const dig of w.digs) {
        if (!w.walk.reachable(w.player.pos, dig.pos)) throw Error('cache is unreachable');
        Object.assign(w.player.pos, { x: dig.pos.x + 24, y: dig.pos.y });
        for (let frame = 0; frame < 180 && dig.doodad.kind !== 'burial_mound_dug'; frame++) {
          clearPressure(); w.update(1 / 30);
        }
        if (dig.doodad.kind !== 'burial_mound_dug') throw Error('timed dig did not complete');
      }
      if (!w.objectiveDoneAt(p.zoneId) || !w.isExitLocked(sealed)) throw Error('completion/access separation failed');
      go(root);
      Object.assign(w.player.pos, w.bountyBoardsHere().find(b => b.id === root).pos);
      __game.ui.showBounties(undefined, root); __game.step(2);
      const collect = document.querySelector('[data-bounty-turnin="' + p.id + '"]');
      if (!collect) throw Error('ready hand missing from issuing board');
      collect.click(); __game.step(2); __game.ui.hideAll();
      if (!gate.opened || w.bountyHands.some(h => h.id === p.id)) throw Error('collect click did not open passage');
      go(gate.to); go(p.zoneId);
      if (JSON.stringify(w.zone.locale) !== locale) throw Error('passage rerolled terrain');
      window.__adventureWalkthrough = { board: root, task: p.zoneId, destination: gate.to, caches: total, collected: true };
      __game.step(2);
      return window.__adventureWalkthrough;
    })()`);
    assert(walkthrough.collected && walkthrough.caches >= 3);
    fs.writeFileSync(path.join(dir, 'adventure-walkthrough.json'), JSON.stringify(walkthrough, null, 2));
    await capture('adventure-open-passage');
    for (const [index, stage] of [[0, 'market'], [4, 'crypts'], [2, 'groves'], [3, 'pass']]) {
      await win.webContents.executeJavaScript(`(() => {
        __game.devStartRun('warrior'); __game.hold(true); __game.ui.hideAll();
        const w = __game.world(), fixture = ${JSON.stringify(fixtures[index])};
        w.player.level = 10; w.player.invulnerable = true;
        for (const z of fixture) w.zoneMap[z.id] = z;
        const zone = fixture.find(z => z.complex.stage === ${JSON.stringify(stage)});
        w.loadZone(zone.id);
        const d = zone.locale.districts.find(d => d.id !== zone.locale.entrance);
        if (d) Object.assign(w.player.pos, { x: d.at[0] * zone.size.w, y: d.at[1] * zone.size.h });
        __game.step(2);
      })()`);
      await new Promise(r => setTimeout(r, 300));
      await capture('adventure-' + stage);
    }
    assert.deepEqual(errors, []);
    console.log('PASS board at two resolutions, UI accept/collect, timed cache interactions, round-trip passage travel, four rendered terrain families, no browser errors');
  } finally { if (!preview) { clearTimeout(timer); win.destroy(); server.server.close(); app.quit(); } }
}).catch(e => { console.error(e); app.exit(1); });
