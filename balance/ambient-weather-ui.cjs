// Real production renderer, hidden client, isolated profile and saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'ambient-weather');
fs.mkdirSync(dir, { recursive: true });
app.disableHardwareAcceleration();
app.setPath('userData', path.join(dir, `profile-${process.pid}`));
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(dir, 'dist'), savesDir: path.join(dir, `saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 850,
    webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async (fn, ...args) => {
    const result = await win.webContents.executeJavaScript(`(async () => { try {
      return { ok: true, value: await (${fn})(${args.map(a => JSON.stringify(a) ?? 'undefined').join(',')}) };
    } catch (e) { return { ok: false, error: e.stack || String(e) }; } })()`);
    if (!result.ok) throw Error(result.error);
    return result.value;
  };
  const save = (name, png) => fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
  try {
    await win.loadURL(server.url); await run(() => __game.hydrated());
    await run(() => {
      __game.hold(true); __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('magician'); __game.ui.hideAll();
      const w = __game.world();
      w.zoneMap.qa_ambient = { id: 'qa_ambient', name: 'Desert Ambience Study', level: 1,
        size: { w: 6000, h: 4000 }, seed: 739,
        theme: { floor: '#42351f', grid: '#4c3d24', border: '#7a6438', obstacle: '#5c4a2c', obstacleEdge: '#8a6e40', accent: '#e8c060' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_ambient'); w.player.pos = { x: 1500, y: 1200 };
      w.actors = [w.player]; w.doodads = []; w.markDoodadsChanged(); w.time = 31.5;
      w.skyFront = () => null; w.zoneWind = () => null;
      window.ambientPaint = (rows, cam = { x: 600, y: 400 }, width = 1280, height = 850, zoom = 1.3, shake = [0, 0]) => {
        const r = __game.renderer, c = document.createElement('canvas'); c.width = width; c.height = height;
        const ctx = c.getContext('2d'), points = [], old = { ctx: r.ctx, canvas: r.canvas, cam: r.cam, baseZoom: r.baseZoom, fx: w.zone.theme.ambientFx };
        const move = ctx.moveTo, ellipse = ctx.ellipse;
        const record = (kind, x, y) => {
          const m = ctx.getTransform(), p = m.transformPoint({ x, y });
          points.push({ kind, x: p.x, y: p.y, color: ctx.strokeStyle, alpha: ctx.globalAlpha });
        };
        ctx.moveTo = function(x, y) { record('line', x, y); return move.call(this, x, y); };
        ctx.ellipse = function(x, y, ...args) { record('ellipse', x, y); return ellipse.call(this, x, y, ...args); };
        try {
          r.ctx = ctx; r.canvas = c; r.cam = cam; r.baseZoom = zoom / (r.couchStretch * r.pixelScale); w.zone.theme.ambientFx = rows;
          ctx.fillStyle = '#42351f'; ctx.fillRect(0, 0, width, height);
          r.drawAtmosphere(w, ...shake);
          if (!ctx.getTransform().isIdentity || ctx.globalAlpha !== 1) throw Error('Ambient leaked canvas state');
          return { points, png: c.toDataURL() };
        } finally { r.ctx = old.ctx; r.canvas = old.canvas; r.cam = old.cam; r.baseZoom = old.baseZoom; w.zone.theme.ambientFx = old.fx; }
      };
    });
    const result = await run(() => {
      const assert = (ok, message) => { if (!ok) throw Error(message); };
      const eq = (a, b) => Math.abs(a - b) < 0.0001;
      const field = { chance: 1, period: 20, lifetime: 20, count: 4 };
      const rows = [
        { kind: 'sandDrift', field: { count: 0 }, dustDevils: field },
        { kind: 'sandDrift', dustDevils: false },
        { kind: 'tumbleweeds', field },
        { kind: 'heatHaze', anchor: 'world', patches: [{ x: 1000, y: 700, radius: 100 }] },
      ];
      const report = [];
      for (const row of rows) {
        const a = ambientPaint([row]).points;
        assert(a.length, `${row.kind}: no painted geometry`);
        const b = ambientPaint([row], { x: 737, y: 317 }).points;
        const common = a.filter(p => b.some(q => q.kind === p.kind && eq(q.x, p.x - 137 * 1.3) && eq(q.y, p.y + 83 * 1.3)));
        assert(common.length >= Math.min(4, a.length), `${row.kind}: did not counter-scroll with terrain`);
        const resized = ambientPaint([row], undefined, 1600, 1000).points;
        assert(a.every(p => resized.some(q => eq(q.x, p.x) && eq(q.y, p.y))), `${row.kind}: resize reseated geometry`);
        const zoomed = ambientPaint([row], undefined, 2560, 1700, 2.6).points;
        assert(a.every(p => zoomed.some(q => eq(q.x, p.x * 2) && eq(q.y, p.y * 2))), `${row.kind}: incorrect zoom`);
        const shaken = ambientPaint([row], undefined, 1280, 850, 1.3, [3, -4]).points;
        assert(a.some(p => shaken.some(q => eq(q.x, p.x + 3 * 1.3) && eq(q.y, p.y - 4 * 1.3))), `${row.kind}: incorrect camera shake`);
        const w = __game.world(), before = JSON.stringify([w.time, w.player.pos, w.player.life, w.player.statuses, w.actors.length]);
        w.ambientCamShift = { x: 900, y: -700 };
        assert(JSON.stringify(ambientPaint([row]).points) === JSON.stringify(a), `${row.kind}: used distant-sky camera bank`);
        w.ambientCamShift = { x: 0, y: 0 };
        assert(JSON.stringify(ambientPaint([row]).points) === JSON.stringify(a), `${row.kind}: return changed placement`);
        assert(before === JSON.stringify([w.time, w.player.pos, w.player.life, w.player.statuses, w.actors.length]), 'Painting mutated gameplay');
        assert(ambientPaint([{ ...row, intensity: 0 }]).points.length === 0, `${row.kind}: zero intensity still paints`);
        report.push({ kind: row.kind, painted: a.length, shared: common.length });
      }
      const screen = { kind: 'heatHaze' };
      assert(JSON.stringify(ambientPaint([screen]).points) === JSON.stringify(ambientPaint([screen], { x: 900, y: 800 }).points), 'Screen heat moved with terrain');
      const heat = rows[3];
      assert(ambientPaint([screen, heat]).points.length === ambientPaint([screen]).points.length + ambientPaint([heat]).points.length, 'Heat modes failed to compose');
      assert(ambientPaint([{ ...heat, patches: [] }]).points.length === 0, 'Empty patches regenerated heat');
      const w = __game.world(), roof = w.roofedStructureAt;
      w.roofedStructureAt = () => ({});
      try { assert(ambientPaint([rows[2], heat]).points.length === 0, 'Ground ambience painted under a roof'); }
      finally { w.roofedStructureAt = roof; }
      return report;
    });
    const study = await run(() => ambientPaint([
      { kind: 'sandDrift', intensity: 2, dustDevils: { chance: 1, count: 4, period: 20, lifetime: 20 } },
      { kind: 'tumbleweeds', intensity: 1.5, field: { chance: 1, count: 3 } },
      { kind: 'heatHaze', anchor: 'world', intensity: 1.2, patches: [{ x: 1050, y: 750, radius: 150 }] },
    ]).png);
    save('effect-study', study);
    const desert = await run(() => {
      const w = __game.world(), r = __game.renderer;
      const id = w.devMintTileset('desert', 60, 1, { seed: 739 });
      if (!id) throw Error('Desert mint failed');
      w.loadZone(id); w.actors = [w.player]; w.time = 31.5; w.player.invulnerable = true;
      r.render(w);
      return { png: r.canvas.toDataURL(), fx: w.zone.theme.ambientFx, fatal: __game.crash().fatal };
    });
    assert.equal(desert.fatal, null); save('desert-game', desert.png);
    assert.ok(desert.fx.some(f => f.kind === 'sandDrift'));
    fs.writeFileSync(path.join(dir, 'results.json'), JSON.stringify({ result, authoredFx: desert.fx }, null, 2));
    console.log('PASS actual desert renderer: camera, resize, zoom, shake, return, view/world heat, composition, ground gate and gameplay isolation');
  } catch (e) { console.error(e.stack || String(e)); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
});
