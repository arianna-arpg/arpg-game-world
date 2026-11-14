// Builds once into a self-cleaning temp folder, then exercises the real client.
// npx electron balance/ability-artwork-ui.cjs
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const scratch = makeTempDir('hollow-ability-artwork-'), repo = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'reports', 'ability-artwork');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
const report = { checks: [], errors: [], scratch };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  let win, server;
  const timer = setTimeout(() => { console.error('Ability artwork timed out'); app.exit(1); }, 240000);
  try {
    const entry = path.join(scratch, 'ability-qa.ts');
    const imports = {
      'data/skills': ['SKILLS'], 'data/supports': ['SUPPORTS'], 'engine/skills': ['makeSkillGem'],
      'render/skillIcons': ['drawSkillIcon', 'skillIconSvg', 'skillIconKey', 'supportIconFace', 'configureSkillArtwork'],
      'render/abilityArtwork': ['abilityArtworkUrl', 'abilityArtworkImage'],
      'render/abilityArtworkCatalog': ['ABILITY_ARTWORK_URLS'], 'render/vis/buffIcons': ['drawBuffIcon'],
    };
    fs.writeFileSync(entry, Object.entries(imports).map(([file, names]) =>
      `import {${names.join(',')}} from ${JSON.stringify(path.join(repo, 'src', file).replaceAll('\\', '/'))};`).join('\n')
      + '\nwindow.AbilityQA={' + Object.values(imports).flat().join(',') + '};');
    const { build } = await import('vite');
    const built = await build({ root: repo, base: './', logLevel: 'warn', build: {
      outDir: path.join(scratch, 'dist'), emptyOutDir: true,
      rollupOptions: { input: { main: path.join(repo, 'index.html'), abilityqa: entry } },
    } });
    const qaEntry = built.output.find(item => item.type === 'chunk' && item.name === 'abilityqa').fileName;
    server = await startGameServer({ root: scratch, savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { offscreen: true, backgroundThrottling: false } });
    win.webContents.on('console-message', event => { if (event.level === 'error') console.error('Renderer:', event.message); });
    const run = (fn, ...args) => win.webContents.executeJavaScript('(async()=>{try{return await (' + fn + ')(' + args.map(v => JSON.stringify(v)).join(',') + ')}catch(e){return {qaError:e.stack||String(e)}}})()')
      .then(value => { if (value?.qaError) throw Error(value.qaError); return value; });
    const prefix = server.url + 'dist/';
    await win.loadURL(prefix + 'index.html'); await run(() => __game.hydrated());
    await run(async url => { await import(url); return true; }, prefix + qaEntry);
    const capture = async name => { await wait(100); fs.writeFileSync(path.join(output, name + '.png'), (await win.webContents.capturePage()).toPNG()); };
    const selected = JSON.parse(fs.readFileSync(path.join(repo, 'site/assets/art/icons/manifest.json'))).entries.filter(e => ['skill', 'support'].includes(e.kind));
    const catalogue = await run(() => Object.entries(AbilityQA.ABILITY_ARTWORK_URLS));
    assert.equal(catalogue.length, selected.length);
    for (const e of selected) assert.ok(catalogue.find(([key, url]) => key === e.key && url.includes(e.id + '.' + e.imageSha256.slice(0, 12))), e.key);
    assert.ok(catalogue.every(([, url]) => url.startsWith(prefix)), 'all art resolves under the web subfolder');
    report.checks.push(`${selected.length} exact website selections packaged with relative/offline URLs`);
    await run(() => {
      Object.defineProperty(navigator, 'getGamepads', { value: () => [] });
      __game.account().ledger.prologue_lived = 1; __game.devStartRun('warrior'); __game.ui.hideAll();
      const w = __game.world(), q = AbilityQA;
      w.player.invulnerable = true; w.actors = [w.player]; w.update = () => {}; w.meta.items.length = 0;
      const ids = ['cleave', 'firebolt', 'frost_nova', 'shield_up', 'war_cry', 'chain_lightning', 'shadow_step', 'overload'];
      w.player.skills = ids.map(id => q.makeSkillGem(q.SKILLS[id], 1, 'common'));
      w.meta.knownSkills = new Map(w.player.skills.map(inst => [inst.def.id, inst]));
      for (const id of ids) w.grantSkillGemItem(w.localSeat, q.makeSkillGem(q.SKILLS[id], 3, 'rare'));
      for (const id of ['splitting', 'arcing', 'overload', 'spell_echo'])
        w.grantSupportGemItem(w.localSeat, { def: q.SUPPORTS[id], level: 2 });
      w.player.skills[1].sockets[0] = { def: q.SUPPORTS.splitting, level: 2 };
      __game.ui.toggleInventory(); __game.ui.folioSync(); __game.step(2);
    });
    await wait(700);
    const bag = await run(async () => {
      const images = [...document.querySelectorAll('#inventory .ability-icon>img')];
      const badges = [...document.querySelectorAll('#inventory .support-insignia')];
      await Promise.all([...images, ...badges].map(i => i.decode())); __game.step(2);
      return { count: images.length, ready: images.every(i => i.parentElement.hasAttribute('data-art-ready')),
        support: images.filter(i => i.closest('[data-ability-kind="support"]')).length,
        supportSizes: images.filter(i => i.closest('[data-ability-kind="support"]')).map(i => parseFloat(getComputedStyle(i).width)),
        badges: badges.length, badgeReady: badges.every(i => i.naturalWidth > 0 && i.src.startsWith(new URL('.', location.href).href)),
        supportRims: document.querySelectorAll('#inventory [data-ability-kind="support"] .ability-icon-rim').length,
        skillRims: document.querySelectorAll('#inventory [data-ability-kind="skill"] .ability-icon-rim').length,
        skillGlows: [...document.querySelectorAll('#inventory .ability-icon-glow')].every(el => getComputedStyle(el).backgroundImage !== 'none' && getComputedStyle(el).maskImage.includes('data:image/png')),
        requested: performance.getEntriesByType('resource').filter(r => /\.webp/.test(r.name)).length,
        fatal: __game.crash().fatal };
    });
    assert.equal(bag.count, 12); assert.equal(bag.support, 4); assert.ok(bag.ready); assert.equal(bag.fatal, null);
    assert.equal(bag.badges, 4); assert.ok(bag.badgeReady && bag.skillGlows); assert.equal(bag.skillRims, 0); assert.equal(bag.supportRims, 4);
    assert.ok(bag.supportSizes.every(size => Math.abs(size - 26) < .1), 'fuller support artwork keeps its 26px footprint');
    assert.ok(bag.requested < 35, 'visible faces only, no eager library downloads');
    await capture('inventory-hotbar');
    report.checks.push('real bag, support identities and hotbar load only displayed artwork');
    const readouts = await run(() => {
      const w = __game.world(), p = w.player, fire = p.skills[1], frost = p.skills[2], shield = p.skills[3];
      fire.def = { ...fire.def, useCharges: { max: 3, recharge: 10 } };
      Object.assign(p.skillChargeBank(fire), { count: 2, timer: 0 });
      p.cooldowns.set(frost.def.id, 3); p.cooldownTotals.set(frost.def.id, 6);
      // Isolate the renderer's affordability layer from unrelated live build gates.
      const usable = w.skillUsable, cost = p.skillCost;
      w.skillUsable = () => true;
      p.skillCost = inst => ({ mana: inst === shield ? p.mana + 1 : 0, life: 0 });
      const proto = CanvasRenderingContext2D.prototype, originals = {}, calls = [];
      for (const method of ['drawImage', 'fillRect', 'fillText']) {
        originals[method] = proto[method];
        proto[method] = function (...args) {
          if (this.canvas.id === 'game') calls.push({ method, args: method === 'drawImage' ? args.slice(1) : args,
            alpha: this.globalAlpha, fill: this.fillStyle });
          return originals[method].apply(this, args);
        };
      }
      try { __game.step(1); }
      finally { for (const method of Object.keys(originals)) proto[method] = originals[method]; w.skillUsable = usable; p.skillCost = cost; }
      const slots = __game.renderer.hudSlotRects.slice(0, 8), k = slots[0].w / 54;
      const at = (call, index, dx, dy) => Math.abs(call.args[0] - slots[index].x / k - dx) < .1
        && Math.abs(call.args[1] - slots[index].y / k - dy) < .1;
      const face = index => calls.findIndex(c => c.method === 'drawImage' && at(c, index, 4, 4) && c.args[2] === 46);
      const shade = calls.findIndex(c => c.method === 'fillRect' && at(c, 2, 4, 4) && c.args[2] === 46 && c.args[3] === 23);
      const pips = calls.filter(c => c.method === 'fillRect' && c.fill === '#ffe86a' && c.args[2] === 4 && c.args[3] === 4
        && (at(c, 1, 5, 5) || at(c, 1, 11, 5)));
      const labels = calls.filter(c => c.method === 'fillText').map(c => String(c.args[0]));
      return { cooldownAboveFace: face(2) >= 0 && shade > face(2), loadedPips: pips.length,
        dimAlpha: calls[face(3)]?.alpha, keyLabels: labels.includes('LMB') && labels.includes('RMB'),
        levelLabels: labels.includes('1'), slots: slots.length };
    });
    assert.ok(readouts.cooldownAboveFace && readouts.keyLabels && readouts.levelLabels, JSON.stringify(readouts));
    assert.equal(readouts.loadedPips, 2); assert.equal(readouts.dimAlpha, .3); assert.equal(readouts.slots, 8);
    await capture('hotbar-readouts');
    report.checks.push('native hotbar paints cooldown above artwork, two loaded pips, affordability dimming, key bindings and levels');
    const sockets = await run(async () => {
      document.querySelector('[data-buildflap]').click(); __game.ui.folioSync();
      const image = document.querySelector('#skills-panel .gem-chip .ability-icon>img');
      await image.decode(); return image.src;
    });
    assert.ok(sockets.includes('splitting.')); await capture('equipped-support');
    report.checks.push('socketed support and build rack use the same selected artwork');

    // Shared renderer: decode, semantic fallbacks, state override, alpha and expiry.
    const rendering = await run(async () => {
      const q = AbilityQA, canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const paint = face => { ctx.clearRect(0, 0, 64, 64); q.drawSkillIcon(ctx, face, 0, 0, 64); return canvas.toDataURL(); };
      const skill = q.SKILLS.overload, support = q.supportIconFace(q.SUPPORTS.overload);
      for (const face of [skill, support, q.SKILLS.war_cry]) {
        const url = q.abilityArtworkUrl(face.kind || 'skill', face.id);
        for (let n = 0; !q.abilityArtworkImage(url) && n < 100; n++) await new Promise(r => setTimeout(r, 20));
      }
      const a = paint(skill), b = paint(support);
      const full = paint(q.SKILLS.war_cry), data = ctx.getImageData(0, 0, 64, 64).data;
      const corner = data[3], center = data[(32 * 64 + 32) * 4 + 3];
      // This shoulder was heavily cropped by the previous circular opening.
      paint(support); const supportShoulder = ctx.getImageData(9, 12, 1, 1).data[3];
      ctx.clearRect(0, 0, 64, 64); ctx.globalAlpha = .25; q.drawSkillIcon(ctx, q.SKILLS.war_cry, 0, 0, 64);
      const alpha = ctx.getImageData(32, 32, 1, 1).data[3]; ctx.globalAlpha = 1;
      const future = { id: 'future_unpainted', name: 'Future Flame', color: '#ff8800', tags: ['fire'] };
      const unknown = { id: 'unknown_unpainted', name: 'Unknown', color: '#aabbcc', icon: 'unregistered' };
      const fallback = paint(future), generic = paint(unknown);
      const recall = q.skillIconSvg({ ...skill, icon: 'recall' }, 24);
      ctx.clearRect(0, 0, 64, 64);
      q.drawBuffIcon(ctx, { def: { id: 'test', type: 'buff', duration: 6, mods: [], sourceSkill: q.SKILLS.war_cry }, remaining: 2.5, stacks: 1 }, { x: 0, y: 0, w: 64, h: 64 });
      const pixels = ctx.getImageData(0, 0, 64, 64).data;
      const saturation = (start, end) => { let n = 0, total = 0; for (let y = start; y < end; y++) for (let x = 16; x < 48; x++) { const i = (y * 64 + x) * 4; total += Math.max(...pixels.slice(i, i + 3)) - Math.min(...pixels.slice(i, i + 3)); n++; } return total / n; };
      q.configureSkillArtwork(() => false);
      const classic = q.skillIconSvg(skill), classicCanvas = paint(skill);
      q.configureSkillArtwork(() => __game.settings().skillArtwork);
      return { distinct: a !== b, corner, center, alpha, supportShoulder, fallback: fallback !== generic && fallback !== full,
        semantic: q.skillIconKey(future), generic: q.skillIconKey(unknown), recall: !recall.includes('<img'),
        classic: classic.includes('data-skill-acronym') && classicCanvas !== a, grayTop: saturation(8, 26), colorBottom: saturation(38, 56) };
    });
    assert.ok(rendering.distinct && rendering.fallback && rendering.recall && rendering.classic);
    assert.equal(rendering.semantic, 'ember'); assert.equal(rendering.generic, 'arcane');
    assert.ok(rendering.corner < 4 && rendering.center > 250 && rendering.alpha >= 62 && rendering.alpha <= 65);
    assert.ok(rendering.supportShoulder > 200, 'refined support opening retains shoulder artwork');
    assert.ok(rendering.grayTop < 1 && rendering.colorBottom > 3);
    report.checks.push('kind collision, crisp center/transparent edges, affordability alpha, recall, semantic/generic fallbacks, classic preference and buff grayscale verified');

    const failed = await run(async () => {
      const q = AbilityQA, key = 'skill:qa_missing_art', url = new URL('missing-art.webp', location.href).href;
      q.ABILITY_ARTWORK_URLS[key] = url;
      const face = { id: 'qa_missing_art', name: 'Missing Painting', color: '#eea24a', tags: ['fire'] };
      const el = document.createElement('div'); el.id = 'ability-failure'; el.style = 'position:fixed;top:20px;left:20px;z-index:999999';
      el.innerHTML = q.skillIconSvg(face, 64); document.body.appendChild(el);
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; const ctx = canvas.getContext('2d');
      q.drawSkillIcon(ctx, face, 0, 0, 64); const before = canvas.toDataURL();
      await new Promise(resolve => setTimeout(resolve, 600));
      for (let i = 0; i < 20; i++) { ctx.clearRect(0, 0, 64, 64); q.drawSkillIcon(ctx, face, 0, 0, 64); }
      const result = { dom: !el.querySelector('img') && getComputedStyle(el.querySelector('.ability-icon-face')).visibility === 'visible',
        rerender: !q.skillIconSvg(face, 64).includes('<img'),
        canvas: before === canvas.toDataURL(), requests: performance.getEntriesByType('resource').filter(r => r.name === url).length };
      el.remove(); delete q.ABILITY_ARTWORK_URLS[key]; return result;
    });
    assert.ok(failed.dom && failed.canvas && failed.rerender); assert.ok(failed.requests <= 2, 'no broken-image retry storm, including refreshed DOM tiles');
    report.checks.push('failed painting retains native drawing in DOM and canvas without repeated requests');

    await run(() => {
      __game.ui.hideAll(); const q = AbilityQA;
      const gallery = document.createElement('section'); gallery.id = 'ability-gallery';
      gallery.style = 'position:fixed;inset:45px;background:#121520f5;z-index:999999;padding:28px;color:#e5dfd0;font:15px Georgia';
      gallery.innerHTML = '<h2>Memories · selected artwork</h2><p>Balanced Bloom skills · Fuller Split Identity supports · Paired wisps</p>'
        + ['cleave', 'firebolt', 'frost_nova', 'shield_up', 'overload'].map(id => `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:12px;width:200px;margin:18px 0">${q.skillIconSvg(q.SKILLS[id],96)}${q.SKILLS[id].name}<span>${[15,22,46].map(s => q.skillIconSvg(q.SKILLS[id],s)).join(' ')}</span></div>`).join('')
        + '<hr style="border:0;border-top:1px solid #504859">'
        + ['splitting', 'arcing', 'overload', 'spell_echo'].map(id => `<div style="display:inline-flex;flex-direction:column;align-items:center;gap:12px;width:200px;margin:18px 0">${q.skillIconSvg(q.supportIconFace(q.SUPPORTS[id]),96)}${q.SUPPORTS[id].name}<span>${[15,22,46].map(s => q.skillIconSvg(q.supportIconFace(q.SUPPORTS[id]),s)).join(' ')}</span></div>`).join('')
        + '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:12px;width:200px;margin:18px 0">'
        + q.skillIconSvg({id:'future_flame',name:'Future Flame',color:'#eeaa66',tags:['fire']},96) + 'Drawn fallback</div>';
      document.body.appendChild(gallery);
    });
    await wait(500); await capture('artwork-study');
    console.log('PASS ability artwork:', report.checks.join('; '));
  } catch (error) { report.errors.push(error.stack || String(error)); console.error(error); }
  finally {
    clearTimeout(timer); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    win?.destroy(); server?.server.close(); app.exit(report.errors.length ? 1 : 0);
  }
}).catch(error => { console.error(error); app.exit(1); });
