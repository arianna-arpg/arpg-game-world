// Run with Electron. Build, profile and test saves are removed on exit.
const { app, BrowserWindow } = require('electron');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');

const scratch = makeTempDir('hollow-harvest-flow-');
const root = path.resolve(__dirname, '..');
const dist = path.join(scratch, 'dist');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();

async function exercise() {
  await __game.hydrated();
  __game.hold(true);
  Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('warrior');
  __game.ui.hideAll();
  const w = __game.world();
  // Use the real field generator and node data, with no random encounters.
  for (let attempt = 0; attempt < 24; attempt++) {
    const id = 'harvest_test_' + attempt;
    w.zoneMap[id] = { ...w.zone, id, biome: 'field', size: { w: 1600, h: 1200 },
      seed: 410 + attempt, level: 4, layout: [], special: true, sky: 'sheltered',
      objective: { kind: 'none' }, spoils: undefined, exits: [] };
    w.loadZone(id);
    if (w.harvestNodes.length) break;
  }
  const node = w.harvestNodes[0], hero = w.player;
  if (!node) throw Error('Fixture could not place a field node');
  w.actors = [hero];
  hero.pos = { x: node.pos.x + 38, y: node.pos.y };
  hero.tier = node.doodad.tier;
  const settings = __game.settings();
  settings.improvisedStrike = false;
  for (let i = 2; i <= 5; i++) hero.skills[i] = null;
  const frame = () => __game.step(1, 20);
  // Recent incoming damage, no key pressed and no movement for the entire wait.
  hero.recentHurt = 0;
  frame();
  if (!w.harvestView().nodes[0].blocked) throw Error('No blocked ring on a reachable node');
  const start = { ...hero.pos };
  let sawFill = false;
  for (let i = 0; i < 150 && !w.harvestSymbolsActive(hero); i++) {
    frame();
    sawFill ||= w.harvestView().nodes[0].armFrac > 0;
  }
  if (!sawFill || !w.harvestSymbolsActive(hero) || Math.hypot(hero.pos.x-start.x, hero.pos.y-start.y) > 1)
    throw Error('Standing still must lead from danger to dwell to prompt');
  const seq = w.harvestView().rites[0].steps.slice();
  for (let i = 0; i < seq.length; i++) {
    const key = settings.keybinds['skillSlot' + seq[i]];
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    frame();
    window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    frame();
    if (i + 1 < seq.length && w.harvestView().rites[0]?.done !== i + 1)
      throw Error('Prompt failed to accept the displayed empty-slot key ' + key);
  }
  if (w.harvestSymbolsActive(hero) || !node.spent || w.timeflow.worldScale() !== 1 || hero.casting || __game.crash().fatal)
    throw Error('Completion must release the hold and leave the player in control');
  return seq.length;
}

async function main() {
  await promisify(execFile)('node', [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', dist],
    { cwd: root, windowsHide: true, timeout: 300000 });
  await app.whenReady();
  const server = await startGameServer({ root: dist, savesDir: path.join(scratch, 'saves') });
  let win;
  try {
    win = new BrowserWindow({ show: false, width: 1200, height: 800,
      webPreferences: { offscreen: true, backgroundThrottling: false } });
    await win.loadURL(server.url);
    const result = await win.webContents.executeJavaScript('(' + exercise + ')().catch(e => ({error: e.stack}))');
    if (result.error) throw Error(result.error);
    console.log('PASS stationary post-combat dwell and all ' + result + ' empty-slot keyboard symbols in the browser client');
  } finally {
    win?.destroy();
    server.server.close();
  }
}
main().then(() => app.exit(0), error => { console.error(error); app.exit(1); });
