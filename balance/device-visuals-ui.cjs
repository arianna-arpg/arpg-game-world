// Build into balance/reports/construct-visuals/dist first. Never opens a window or writes real saves.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'device-visuals');
fs.mkdirSync(dir, { recursive: true }); app.disableHardwareAcceleration();
app.setPath('userData', path.join(dir, 'profile-' + process.pid));
app.whenReady().then(async () => {
  const timer = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.join(__dirname, 'reports', 'construct-visuals', 'dist'), savesDir: path.join(dir, 'saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1080, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = []; win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  const run = fn => win.webContents.executeJavaScript('(' + fn.toString() + ')()');
  try {
    await win.loadURL(server.url);
    await run(async () => {
      for (let i = 0; i < 100 && !window.__game; i++) await new Promise(resolve => setTimeout(resolve, 50));
      if (!window.__game) throw Error('game bridge did not boot');
      await __game.hydrated();
    });
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      const w = __game.world();
      w.zoneMap.qa_devices = { id: 'qa_devices', name: 'Ground Devices', level: 1, size: { w: 1800, h: 1400 }, seed: 8181,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' },
        layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_devices'); w.player.pos = { x: 900, y: 760 }; w.actors = [w.player]; w.doodads = []; w.markDoodadsChanged();
      w.time = 10; w.flashes = []; w.texts = [];
      window.devices = ['frost_trap', 'cinderwhirl_trap', 'aftershock_snare', 'fire_mine'].map(id => {
        __game.devGrantSkill(id, 1, 2); const s = w.player.skills[2];
        const a = w.spawnConstruct(w.player, s, s.def.delivery, w.player.pos);
        if (!a) throw Error('missing ' + id); return a;
      });
      for (const id of ['jaw_snare', 'war_banner_mast', 'soul_cistern', 'aegis_crystal']) {
        const a = w.createMonster(id, 1, 'enemy'); w.actors.push(a); devices.push(a);
      }
      devices.forEach((a, i) => {
        a.pos = { x: 650 + i % 4 * 150, y: 600 + Math.floor(i / 4) * 85 };
        a.facing = a.facingPrev = -Math.PI / 2; a.spawnedAt = -10; a.brain = undefined;
      });
      window.paintDevice = (ctx, a, scale, bodyOnly = false, mono = false) => {
        const r = __game.renderer, oldCtx = r.ctx, badge = a.presenceBadge, state = a.construct, color = a.color;
        try {
          r.ctx = ctx; a.presenceBadge = undefined; if (bodyOnly) a.construct = undefined;
          if (mono) a.color = '#bac4cd';
          ctx.save(); ctx.scale(scale, scale); ctx.translate(-a.pos.x, -a.pos.y); r.drawActor(a, w); ctx.restore();
        } finally { r.ctx = oldCtx; a.presenceBadge = badge; a.construct = state; a.color = color; }
      };
    });
    const facts = await run(() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d', { willReadFrequently: true });
      const pixels = (a, bodyOnly) => {
        ctx.clearRect(0, 0, 128, 128); ctx.save(); ctx.translate(64, 64); paintDevice(ctx, a, 1, bodyOnly, true); ctx.restore();
        return Array.from(ctx.getImageData(0, 0, 128, 128).data);
      };
      const masks = new Set();
      for (const a of devices) {
        const px = pixels(a, true);
        const mask = px.filter((_, i) => i % 4 === 3).map(v => v > 80 ? '1' : '0').join('');
        if (masks.has(mask)) throw Error('duplicate body: ' + a.name);
        masks.add(mask);
        if (px.filter((v, i) => i % 4 === 3 && v > 40).length < 40) throw Error('invisible: ' + a.name);
      }
      const states = [];
      for (const a of devices.filter(a => a.construct)) {
        const st = a.construct; st.armingDuration = 1; st.timer = 1;
        const arming = pixels(a, false); st.timer = 0; const armed = pixels(a, false);
        if (JSON.stringify(arming) === JSON.stringify(armed)) throw Error('no arming cue: ' + a.name);
        if (st.kind === 'mine') {
          st.detonationLeft = .13; const queued = pixels(a, false); delete st.detonationLeft;
          if (JSON.stringify(armed) === JSON.stringify(queued)) throw Error('no fuse cue');
        }
        states.push(a.name);
      }
      return { distinct: masks.size, states, fatal: __game.crash().fatal };
    });
    assert.equal(facts.distinct, 8); assert.equal(facts.fatal, null);
    for (const bright of [false, true]) {
      await win.webContents.executeJavaScript('window.deviceBright=' + bright);
      const png = await run(() => {
        const c = document.createElement('canvas'); c.width = 1200; c.height = 780; const ctx = c.getContext('2d');
        const fg = deviceBright ? '#233039' : '#e2e8e8';
        ctx.fillStyle = deviceBright ? '#d8d6cc' : '#121a20'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = fg; ctx.font = '26px sans-serif'; ctx.fillText('HOLLOW WAKE / DEVICES & FIELD OBJECTS', 28, 40);
        ctx.font = '15px sans-serif'; ctx.fillText('Shared parts, distinct payloads  /  enlarged body  /  native size  /  same-color native size', 28, 70);
        devices.forEach((a, i) => {
          const x = i % 4 * 300, y = 100 + Math.floor(i / 4) * 230;
          for (const [dx, scale, mono] of [[80, 3.5, false], [190, 1, false], [244, 1, true]]) {
            ctx.save(); ctx.translate(x + dx, y + 85); paintDevice(ctx, a, scale, true, mono); ctx.restore();
          }
          ctx.fillStyle = fg; ctx.font = '17px sans-serif'; ctx.fillText(a.name, x + 24, y + 162, 260);
        });
        ctx.fillStyle = fg; ctx.font = '18px sans-serif'; ctx.fillText('Real device states', 28, 586);
        const trap = devices[0], mine = devices[3];
        [[trap, 'Arming', 1, undefined], [trap, 'Armed', 0, undefined], [mine, 'Arming (opt-in)', 1, undefined],
          [mine, 'Ready', 0, undefined], [mine, 'Detonating', 0, .13]].forEach(([a, label, timer, fuse], i) => {
          a.construct.armingDuration = 1; a.construct.timer = timer; a.construct.detonationLeft = fuse;
          ctx.save(); ctx.translate(110 + i * 235, 657); paintDevice(ctx, a, 3, false); ctx.restore();
          ctx.fillStyle = fg; ctx.font = '15px sans-serif'; ctx.fillText(label, 50 + i * 235, 727);
        });
        return c.toDataURL('image/png').split(',')[1];
      });
      fs.writeFileSync(path.join(dir, bright ? 'devices-bright.png' : 'devices-dark.png'), Buffer.from(png, 'base64'));
    }
    const worldPng = await run(() => {
      const w = __game.world(); devices.forEach(a => { if (a.construct) { a.construct.timer = 0; a.construct.detonationLeft = undefined; } });
      w.flashes = []; w.texts = []; __game.renderer.render(w);
      return document.querySelector('#game').toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(dir, 'devices-world.png'), Buffer.from(worldPng, 'base64'));
    const peer = await run(() => { __game.applySnap(__game.snapshot()); __game.renderer.render(__game.world()); return __game.crash().fatal; });
    assert.equal(peer, null); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(dir, 'checks.json'), JSON.stringify(facts, null, 2));
    console.log('PASS 8 distinct native device bodies, real state pixels, dark/bright studies and peer frame');
  } catch (e) { console.error(e, errors); process.exitCode = 1; }
  finally { clearTimeout(timer); win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(e => { console.error(e); app.exit(1); });
