// Run after vite build --outDir balance/reports/pin-dist.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow } = require('electron');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'breakaway');
app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 120000);
  const server = await startGameServer({ root: path.join(__dirname, 'reports', 'pin-dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1200, height: 800, webPreferences: { backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    const test = async () => {
      await __game.hydrated();
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior'); __game.ui.hideAll(); __game.step(90); __game.hold(true);
      const w = __game.world(), p = w.player, settings = __game.settings();
      w.actors = [p];
      const labels = [];
      let promptCenter;
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(t, ...args) {
        if (String(t).startsWith('← ') || String(t).endsWith(' →')) {
          labels.push(t);
          const point = new DOMPoint(args[0], args[1]).matrixTransform(this.getTransform());
          const box = this.canvas.getBoundingClientRect();
          promptCenter = { x: box.x + point.x * box.width / this.canvas.width, y: box.y + point.y * box.height / this.canvas.height };
        }
        return original.call(this, t, ...args);
      };
      const step = () => { labels.length = 0; __game.step(1); return [...labels]; };
      const key = (type, key) => window.dispatchEvent(new KeyboardEvent(type, { key }));
      const pin = () => p.applyStatus('rooted', 0, 1, 'UI test');
      const state = () => p.statuses.find(s => s.id === 'rooted');
      try {
        Object.assign(settings.keybinds, { moveLeft: 'j', moveRight: 'k' });
        settings.invertMove = true;
        pin(); const start = { ...p.pos };
        key('keydown', 'j'); const keyboard = step(); __game.step(3);
        const stationary = p.pos.x === start.x && p.pos.y === start.y && state()?.breakaway === -1;
        const canvas = document.querySelector('#game'), crop = document.createElement('canvas');
        crop.width = 260; crop.height = 160;
        const painter = crop.getContext('2d');
        for (const layer of document.querySelectorAll('canvas')) {
          const box = layer.getBoundingClientRect();
          if (box.width && box.height && (layer === canvas || box.width === canvas.getBoundingClientRect().width)) {
            painter.drawImage(layer, box.x - promptCenter.x + 154, box.y - promptCenter.y + 110, box.width, box.height);
          }
        }
        const preview = crop.toDataURL();
        key('keyup', 'j'); key('keydown', 'k'); step(); key('keyup', 'k');
        key('keydown', 'j'); step(); key('keyup', 'j'); key('keydown', 'k'); const freed = step(); key('keyup', 'k');
        const released = !state();
        const pad = { index: 0, id: 'Fixture', mapping: 'standard', connected: true, axes: [0,0,0,0], buttons: Array(17).fill(0) };
        Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
        settings.pad.swapSticks = true;
        settings.padBinds.moveLeft = ''; settings.padBinds.moveRight = '';
        pin(); pad.axes[2] = -1; const southpaw = step();
        settings.padBinds.moveRight = 'pad:rb'; pad.axes[2] = 0; pad.buttons[5] = 1;
        const remapped = step(); const padProgress = state()?.breakaway;
        return { keyboard, stationary, released, freed, southpaw, remapped, padProgress, preview };
      } finally { CanvasRenderingContext2D.prototype.fillText = original; }
    };
    const result = await win.webContents.executeJavaScript('(' + test.toString() + ')()');
    assert.deepEqual(result.keyboard, ['← J', 'K →']);
    assert(result.stationary && result.released);
    assert.deepEqual(result.freed, []);
    assert.deepEqual(result.southpaw, ['← RS', 'RS →']);
    assert.deepEqual(result.remapped, ['← RS', 'RB →']);
    assert.equal(result.padProgress, 2);
    fs.writeFileSync(path.join(dir, 'pin-prompt.png'), Buffer.from(result.preview.split(',')[1], 'base64'));
    console.log('PASS visible keyboard rebind, inverted movement, release, southpaw and rebound pad button');
    clearTimeout(timer); app.exit(0);
  } catch (e) { console.error(e); app.exit(1); }
}).catch(e => { console.error(e); app.exit(1); });
