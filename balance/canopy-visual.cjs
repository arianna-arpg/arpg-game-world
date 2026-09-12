// Build first, then: npx electron balance/canopy-visual.cjs
// Real canopy painter, isolated saves, movement/opacity and cache-work checks.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'balance/reports/canopy-presence');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', path.join(out, 'profile'));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.join(root, 'dist'), savesDir: path.join(out, 'saves') });
  const win = new BrowserWindow({ show: false, width: 1400, height: 760, webPreferences: { offscreen: true, backgroundThrottling: false } });
  try {
    await win.loadURL(server.url);
    const result = await win.webContents.executeJavaScript(`(${function () {
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('warrior');
      const w = __game.world(), r = __game.renderer;
      const c = document.createElement('canvas'); c.width = 1400; c.height = 760;
      const ctx = c.getContext('2d');
      r.ctx = ctx; r.canvas = c; r.baseZoom = 1; r.pixelScale = 1; r.couchStretch = 1;
      r.cam = { x: 0, y: 0 }; r.frameDt = 1 / 60;
      w.doodads = [];
      for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) {
        w.doodads.push({ kind: 'forest_oak', pos: { x: 180 + x * 210, y: 210 + y * 180 }, radius: 130 });
      }
      w.markDoodadsChanged(); r.culledAll = w.doodads;
      let bakes = 0;
      const bake = r.canopySlices.bake;
      r.canopySlices.bake = function (...args) { bakes++; return bake.apply(this, args); };
      const frames = (n) => {
        for (let i = 0; i < n; i++) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
          ctx.fillStyle = '#343e2c'; ctx.fillRect(0, 0, c.width, c.height);
          for (const d of w.doodads) {
            ctx.fillStyle = '#f6c96a'; ctx.beginPath(); ctx.arc(d.pos.x, d.pos.y, 16, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#eee7d3'; ctx.beginPath(); ctx.arc(w.player.pos.x, w.player.pos.y, 12, 0, Math.PI * 2); ctx.fill();
          r.drawCanopies(w);
        }
      };
      const images = [], measures = [];
      for (const [name, x] of [['left', 180], ['right', 1230], ['returned', 180]]) {
        w.player.pos = { x, y: 390 };
        frames(1);
        const departure = name === 'right' ? r.canopyFade.get(w.doodads[6])
          : name === 'returned' ? r.canopyFade.get(w.doodads[11]) : null;
        frames(120);
        const before = bakes; frames(20);
        measures.push({ name, departure, left: r.canopyFade.get(w.doodads[6]), right: r.canopyFade.get(w.doodads[11]), idleBakes: bakes - before });
        ctx.fillStyle = '#ffffff'; ctx.font = '22px sans-serif';
        ctx.fillText('Local canopy presence: ' + name, 28, 42);
        ctx.font = '16px sans-serif'; ctx.fillText('Gold markers are under the connected canopy; the white marker is the player.', 28, 70);
        images.push({ name, png: c.toDataURL('image/png').split(',')[1] });
      }
      // Exercise moving presence against already-warm sealed slices.
      const beforeWalk = bakes;
      for (let i = 0; i < 240; i++) {
        w.player.pos.x = 180 + (1 - Math.cos(i / 239 * Math.PI * 2)) * 525;
        frames(1);
      }
      return { patches: w.veilIndex().patches.length, measures, images, walkingBakes: bakes - beforeWalk };
    }.toString()})()`);
    for (const im of result.images) fs.writeFileSync(path.join(out, `${im.name}.png`), Buffer.from(im.png, 'base64'));
    delete result.images;
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2));
    assert.equal(result.patches, 1);
    assert.equal(result.walkingBakes, 0, 'moving presence reuses sealed slices');
    for (const row of result.measures) {
      assert.ok(row.name === 'right' ? row.right < .3 && row.left > .95 : row.left < .3 && row.right > .95);
      assert.equal(row.idleBakes, 0, 'standing still does not churn canopy slices');
      if (row.departure !== null) assert.ok(row.departure > .26 && row.departure < .6, 'departed crowns close gradually');
    }
    console.log(JSON.stringify(result, null, 2));
    console.log('PASS browser canopy presence and stable idle cache');
    win.destroy(); server.server.close(); app.exit(0);
  } catch (e) { console.error(e); win.destroy(); server.server.close(); app.exit(1); }
});
