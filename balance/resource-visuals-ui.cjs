// Hidden production painter checks and portable, animated visual comparison.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
const dir = path.join(__dirname, 'reports', 'skill-visuals'); fs.mkdirSync(dir, { recursive: true });
app.setPath('userData', path.join(dir, 'resource-profile-' + process.pid)); app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const timeout = setTimeout(() => app.exit(1), 180000);
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, 'resource-saves-' + process.pid) });
  const win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const run = async fn => {
    const r = await win.webContents.executeJavaScript('(async()=>{try{return {value:await (' + fn.toString() + ')()}}catch(e){return {error:e.stack??String(e)}}})()');
    if (r.error) throw Error(r.error); return r.value;
  };
  const errors = [];
  win.webContents.on('console-message', e => { if (e.level === 'error') errors.push(e.message); });
  try {
    await win.loadURL(server.url); await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
    await run(() => {
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('necromancer'); __game.ui.hideAll(); __game.hold(true);
      window.resourceRows = [
        { id: 'old-life', title: 'Previous life siphon', note: 'Round bead · color carries the identity', mode: 'old', resource: 'life' },
        { id: 'blood', title: 'Life siphon', note: 'Tapered blood · two curling strands · actual traveling pickup', mode: 'home', resource: 'life' },
        { id: 'mana', title: 'Mana siphon', note: 'Split needle · angular wake', mode: 'home', resource: 'mana' },
        { id: 'shield', title: 'Shield return', note: 'Open plates · double chevrons', mode: 'home', resource: 'es' },
        { id: 'drain', title: 'Immediate life drain', note: 'Short accelerating traces after a confirmed heal', mode: 'flow', resource: 'life' },
        { id: 'mana-leech', title: 'Mana leech', note: 'Measured recovery · fine directional filaments', mode: 'flow', resource: 'mana' },
        { id: 'es-leech', title: 'Shield leech', note: 'Measured recovery · folding plates', mode: 'flow', resource: 'es' },
        { id: 'feast', title: 'Flesh consumption', note: 'Closing jaws at the meal · blood pulled inward', mode: 'feast', resource: 'life' },
        { id: 'pickups', title: 'Ground pickups', note: 'Life · mana · shield · Wakeflame, each with its own silhouette', mode: 'ground', resource: 'life' },
      ];
      window.paintResource = (ctx, row, phase, mono = false) => {
        const r = __game.renderer, old = r.ctx; r.ctx = ctx;
        const colors = { life: '#e77882', mana: '#91b9f3', es: '#9ce5e8', wakeflame: '#ffd98a' };
        const color = mono ? '#c5d1d8' : colors[row.resource];
        const player = { tier: 0, feedingCues: { gains: [], flows: [] } };
        const world = { player, actors: [player], zone: {}, orbs: [], spoilStoryAt: () => 0 };
        try {
          ctx.save(); ctx.translate(20, 20); ctx.scale(1.4, 1.4);
          if (row.mode === 'flow') {
            player.feedingCues.flows = [{ source: 1, from: { x: 24, y: 44 }, to: { x: 228, y: 44 }, fromTier: 0, toTier: 0,
              resource: row.resource, color, age: phase * .46, left: .46, strength: 1 }];
            r.drawResourceFlows(world);
          } else if (row.mode === 'feast') {
            r.drawFlash({ pos: { x: 24, y: 44 }, radius: 16, color, life: .65 * (1 - phase), maxLife: .65,
              feedingCue: { to: { x: 228, y: 44 }, fromTier: 0, toTier: 0, profile: 'flesh' } });
          } else if (row.mode === 'ground') {
            world.orbs = ['life', 'mana', 'es', 'wakeflame'].map((kind, i) => ({ kind, pos: { x: 34 + i * 65, y: 44 }, bob: phase * Math.PI * 2, life: 5, amount: 0 }));
            if (mono) {
              const realFill = ctx.fill, realStroke = ctx.stroke;
              ctx.fill = function (...args) { if (this.fillStyle !== '#171923') this.fillStyle = color; return realFill.apply(this, args); };
              ctx.stroke = function (...args) { if (this.strokeStyle !== '#171923') this.strokeStyle = color; return realStroke.apply(this, args); };
              try { r.drawResourceOrbs(world); } finally { ctx.fill = realFill; ctx.stroke = realStroke; }
            } else r.drawResourceOrbs(world);
          } else {
            const pos = { x: 28 + phase * 192, y: 44 };
            if (row.mode === 'old') {
              ctx.globalAlpha = .85; ctx.shadowColor = color; ctx.shadowBlur = 9; ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(pos.x, pos.y + Math.sin(phase * 6) * 2.5, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
              ctx.globalAlpha = .9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pos.x - 1.5, pos.y - 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
            } else {
              // Use the production pickup route; replace only paint when inspecting one color.
              world.orbs = [{ kind: row.resource, pos, bob: phase * 6, life: 5, amount: 0, flowTo: { x: 240, y: 44 } }];
              const realFill = ctx.fill, realStroke = ctx.stroke;
              if (mono) {
                ctx.fill = function (...args) { if (this.fillStyle !== '#171923') this.fillStyle = color; return realFill.apply(this, args); };
                ctx.stroke = function (...args) { if (this.strokeStyle !== '#171923') this.strokeStyle = color; return realStroke.apply(this, args); };
              }
              try { r.drawResourceOrbs(world); } finally { ctx.fill = realFill; ctx.stroke = realStroke; }
            }
          }
          ctx.restore();
        } finally { r.ctx = old; }
      };
    });
    const result = await run(() => {
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 150;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const draw = (row, phase, mono) => { ctx.clearRect(0, 0, 400, 150); paintResource(ctx, row, phase, mono); return canvas.toDataURL(); };
      const states = resourceRows.map(row => ({ id: row.id, first: draw(row, .2, true), second: draw(row, .6, true) }));
      if (states.some(s => s.first === s.second)) throw Error('Missing motion');
      if (new Set(states.filter(s => ['blood', 'mana', 'shield'].includes(s.id)).map(s => s.first)).size !== 3) throw Error('Shared tint lost resource identity');
      // Both endpoint stories and the rendering cap are enforced by the real renderer.
      const r = __game.renderer, player = { tier: 0, feedingCues: { gains: [], flows: [] } };
      const flow = { from: { x: 30, y: 50 }, to: { x: 220, y: 50 }, source: 1, fromTier: 1, toTier: 0, resource: 'life', color: '#ccc', age: .2, left: .4, strength: 1 };
      player.feedingCues.flows = [flow]; const world = { player, actors: [player], zone: { tiers: { exposure: 'covered' } } };
      const old = r.ctx; r.ctx = ctx; ctx.clearRect(0, 0, 400, 150);
      r.drawResourceFlows(world);
      if (ctx.getImageData(0, 0, 400, 150).data.some(x => x)) throw Error('Hidden source leaked');
      flow.fromTier = 0; flow.toTier = 1; r.drawResourceFlows(world);
      if (ctx.getImageData(0, 0, 400, 150).data.some(x => x)) throw Error('Hidden recipient leaked');
      flow.toTier = 0;
      const count = n => { let strokes = 0; const original = ctx.stroke; ctx.stroke = function (...a) { strokes++; return original.apply(this, a); };
        player.feedingCues.flows = Array.from({ length: n }, () => flow); try { r.drawResourceFlows(world); } finally { ctx.stroke = original; } return strokes; };
      if (count(32) !== count(100)) throw Error('Crowd drawing is unbounded');
      player.tier = 2; world.spoilStoryAt = () => 0;
      const orb = { kind: 'life', pos: { x: 100, y: 50 }, flowTo: { x: 220, y: 50 }, flowTier: 2, flowFromTier: 2, bob: .3, life: 5, amount: 9 };
      world.orbs = [orb]; ctx.clearRect(0, 0, 400, 150); r.drawResourceOrbs(world);
      if (!ctx.getImageData(0, 0, 400, 150).data.some(x => x)) throw Error('Upper-story flight disappeared');
      orb.flowFromTier = 1; ctx.clearRect(0, 0, 400, 150); r.drawResourceOrbs(world);
      if (ctx.getImageData(0, 0, 400, 150).data.some(x => x)) throw Error('Hidden pickup source leaked');
      player.tier = 0; delete orb.flowTo; ctx.clearRect(0, 0, 400, 150); r.drawResourceOrbs(world);
      if (!ctx.getImageData(0, 0, 400, 150).data.some(x => x)) throw Error('Dropped pickup retained a flight-only story');
      r.ctx = old;
      return { checks: 16, rows: resourceRows.map(row => {
        const sheets = [false, true].map(mono => { const c = document.createElement('canvas'); c.width = 400 * 24; c.height = 150; const cctx = c.getContext('2d');
          for (let i = 0; i < 24; i++) { cctx.save(); cctx.translate(i * 400, 0); paintResource(cctx, row, i / 24, mono); cctx.restore(); } return c.toDataURL(); });
        return { ...row, sheets };
      }) };
    });
    const html = fs.readFileSync(path.join(__dirname, 'resource-study.html'), 'utf8').replace('/*__DATA__*/[]', JSON.stringify(result.rows));
    fs.writeFileSync(path.join(dir, 'resource-study.html'), html);
    await run(() => {
      const w = __game.world(), p = w.player;
      w.zoneMap.qa_resources = { id: 'qa_resources', name: 'Proving Ground', level: 1, size: { w: 1600, h: 1200 }, seed: 9283,
        theme: { floor: '#303a37', grid: '#35433e', border: '#44544c', obstacle: '#444', obstacleEdge: '#555', accent: '#8cbba5' }, layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9000, y: 9000 } };
      w.loadZone('qa_resources'); p.pos = { x: 800, y: 600 }; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
      __game.hold(false); __game.step(90); w.update = () => {};
      const e = w.createMonster('skeleton_warrior', 1, 'enemy'); e.pos = { x: 1000, y: 600 }; e.brain = undefined; e.anchored = true;
      e.sheet.setSource('qa', [{ stat: 'life', kind: 'override', value: 10000 }]); e.fillResources(); w.actors.push(e); window.resourceVictim = e;
    });
    for (const id of ['siphon_blood', 'lifedrain', 'vampiric_presence']) {
      await win.webContents.executeJavaScript('window.resourceCast=' + JSON.stringify(id));
      const facts = await run(() => {
        const w = __game.world(), p = w.player, e = resourceVictim; const granted = __game.devGrantSkill(resourceCast, 1, 2);
        if (granted < 0 || !p.skills[2]) throw Error('Cannot seat ' + resourceCast + ': ' + JSON.stringify(p.skills.map(s => s?.def.id)));
        const skill = p.skills[2]; w.orbs = []; w.flashes = []; p.resourceFlows = []; p.restoreGains = []; p.activeAuras.clear();
        p.life = p.maxLife() * .4; p.fillMana?.(); p.casting = null; p.cooldowns.clear(); p.useLock = 0;
        if (resourceCast === 'vampiric_presence') { e.pos.x = p.pos.x + 90; w.executeSkill(p, skill, p.pos); w.updateAuras(.15); }
        else { e.pos.x = p.pos.x + 200; w.resolveHit(p, skill, e); }
        if (w.orbs.length) w.updateOrbs(.16);
        for (const f of p.resourceFlows) f.age = .2;
        __game.step(1);
        return { orbs: w.orbs.length, flows: p.resourceFlows.length, fatal: __game.crash().fatal };
      });
      assert.equal(facts.fatal, null); assert(facts.orbs || facts.flows, id + JSON.stringify(facts));
      await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'resource-live-' + id + '.png'), (await win.webContents.capturePage()).toPNG());
    }
    assert(await run(() => { __game.hold(true); const snap = __game.snapshot(); __game.applySnap(snap); __game.renderer.render(__game.world()); return !!__game.world().player.feedingCues?.flows?.length && !__game.crash().fatal; }));
    assert.deepEqual(errors, []);
    await win.loadFile(path.join(dir, 'resource-study.html'));
    await run(async () => { await Promise.all([...document.images].map(i => i.decode())); });
    await new Promise(r => setTimeout(r, 250));
    fs.writeFileSync(path.join(dir, 'resource-overview.png'), (await win.webContents.capturePage()).toPNG());
    const controls = await run(() => { document.querySelector('#mono').click(); document.querySelector('#pause').click(); document.querySelector('#names').click(); document.querySelector('#bright').click();
      return { mono: document.querySelector('#mono').textContent, pause: document.querySelector('#pause').textContent, hidden: document.body.classList.contains('hide-names'), bright: document.body.classList.contains('bright') }; });
    assert.deepEqual(controls, { mono: 'Resource colors', pause: 'Play', hidden: true, bright: true });
    await new Promise(r => setTimeout(r, 150)); fs.writeFileSync(path.join(dir, 'resource-shared-color.png'), (await win.webContents.capturePage()).toPNG());
    console.log(`PASS ${result.checks} motion/identity/visibility/budget checks, 3 live recovery routes + co-op, study controls`);
  } finally { clearTimeout(timeout); win.destroy(); server.server.close(); app.quit(); }
}).catch(e => { console.error(e); app.exit(1); });
