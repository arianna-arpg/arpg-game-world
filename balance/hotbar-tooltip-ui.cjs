// Exercise the actual mouse, HUD hit areas, and cast input against a built client.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');

const scratch = makeTempDir('hollow-hotbar-tooltip-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  let server, win;
  const timeout = setTimeout(() => app.exit(1), 120000);
  try {
    server = await startGameServer({ root: path.resolve(process.argv[2] || 'dist'), savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 960, height: 640, useContentSize: true,
      webPreferences: { offscreen: true, backgroundThrottling: false } });
    await win.loadURL(server.url);
    const page = win.webContents;
    const js = expr => page.executeJavaScript(expr);
    await js(`(async () => {
      await __game.hydrated(); __game.hold(true);
      __game.account().ledger.prologue_lived = 1;
      __game.devStartRun('magician'); __game.ui.hideAll();
      __game.devGrantSkill('firebolt', 3, 3);
      __game.devGrantSkill('frostbolt', 2, 4);
      __game.world().player.skills[5] = null;
      __game.settings().renderScale = 0.7;
      __game.step(3);
      const world = __game.world(), apply = world.applyInputs.bind(world);
      for (const flag of ['unlock_all_gems', 'vendor_gems', 'brandt_sell_supports']) world.account.features.add(flag);
      const splitting = world.supportDropPool(100).find(s => s.id === 'splitting');
      world.player.skills[4].sockets[0] = { def: splitting, level: 1 };
      window.testSupport = splitting;
      world.applyInputs = (inputs, dt) => { window.lastIntent = inputs.get(world.localSeat.id); return apply(inputs, dt); };
      window.testCard = document.getElementById('hotbar-tooltip');
    })()`);
    const center = slot => js(`(() => {
      const r = __game.renderer.hudSlotRects.find(r => r.seatId === __game.world().localSeat.id && r.slot === ${slot});
      return { x: Math.round(r.x + r.w/2), y: Math.round(r.y + r.h/2) };
    })()`);
    const visible = () => js("!testCard.classList.contains('hidden')");
    const send = async (event, delivered) => {
      await js(`window.delivered = new Promise(r => window.addEventListener('${delivered}', () => r(true), { once: true })); void 0`);
      page.sendInputEvent(event);
      await js('window.delivered');
    };
    const move = pos => send({ type: 'mouseMove', ...pos }, 'pointermove');
    const step = (n = 1) => js(`__game.step(${n}, 20)`);
    const first = await center(3), second = await center(4);
    await move(first); await step(39);
    assert.equal(await visible(), false, 'passing over a slot stays quiet');
    await move(second); await step(30);
    assert.equal(await visible(), false, 'moving to the next skill starts its own dwell');
    await move({ x: second.x + 4, y: second.y - 2 }); await step(20);
    assert.equal(await visible(), false, 'the hotbar stays quiet at 980 ms');
    await move({ x: second.x - 3, y: second.y + 5 }); await step();
    assert.equal(await visible(), true, 'movement within one icon preserves the full second of dwell');
    assert.match(await js('testCard.innerText'), /Frostbolt.*Lv 2/i);
    assert.ok(await js('testCard.innerText.includes(__game.world().player.skills[4].def.description)'));
    assert.match(await js('testCard.innerText'), /damage/i);
    assert.ok(await js('testCard.innerText.includes(testSupport.name) && !testCard.innerText.includes(testSupport.description)'));
    await js("__game.settings().tooltipDetail = 'full'"); await step(26);
    assert.ok(await js('testCard.innerText.includes(testSupport.description)'), 'full detail names the linked effect');
    assert.ok(await js(`(() => {
      const b = testCard.getBoundingClientRect();
      return b.x >= 0 && b.right <= innerWidth && b.y >= 0 && b.bottom < ${second.y} &&
        document.elementFromPoint(${second.x}, ${second.y}) === document.getElementById('game');
    })()`), 'the readable card clears the slot and stays inside the viewport');
    await send({ type: 'mouseDown', button: 'left', ...second, clickCount: 1 }, 'mousedown');
    await step();
    assert.equal(await visible(), false);
    assert.ok(await js('lastIntent.held[4] && !lastIntent.held[0] && lastIntent.edge[4]'), 'click still casts only the hovered skill');
    await step(24);
    assert.ok(await js('lastIntent.held[4] && !lastIntent.held[0]') && !await visible(), 'holding the slot keeps casting');
    await send({ type: 'mouseUp', button: 'left', ...second, clickCount: 1 }, 'mouseup');
    await step();
    assert.equal(await visible(), true, 'release in the same slot preserves its dwell');
    await move(first); await step(51);
    assert.match(await js('testCard.innerText'), /Firebolt.*Lv 3/i);
    await js("__game.devGrantSkill('frostbolt', 6, 3)"); await step();
    assert.equal(await visible(), false, 'a replaced skill cannot keep its old card');
    await step(50);
    assert.match(await js('testCard.innerText'), /Frostbolt.*Lv 6/i);
    await js('__game.ui.toggleInventory()'); await step();
    assert.equal(await visible(), false, 'opening a panel dismisses the card');
    await js('__game.ui.toggleInventory()'); await step();
    await move(await center(5)); await step(51);
    assert.equal(await visible(), false, 'empty slots stay quiet');
    // Resource cards use the same input path and the actual drawn circle.
    const orbCenter = id => js(`(() => {
      const r = __game.renderer.hudOrbRects.find(r => r.seatId === __game.world().localSeat.id && r.orb === '${id}');
      return { x: Math.round(r.x + r.w/2), y: Math.round(r.y + r.h/2) };
    })()`);
    await js(`(() => {
      window.hero = __game.world().player;
      hero.sheet.setSource('hover-test', Object.entries({ life: 200, mana: 100, poise: 50, insight: 40,
        energyShield: 30, endurance: 10, lifeRegen: 0, manaRegen: 0 }).map(([stat, value]) => ({ stat, kind: 'override', value })));
      hero.fillResources(); hero.es = 0; hero.poise = 35; hero.insight = 20; hero.ward = 8; hero.absorb = 4; hero.absorbTimer = 4;
      window.statValue = name => [...testCard.querySelectorAll('dt')].find(n => n.textContent === name).nextElementSibling;
    })()`);
    const life = await orbCenter('life'), mana = await orbCenter('mana');
    await move(life); await step(20);
    await move({ x: life.x + 5, y: life.y }); await step(30);
    assert.equal(await visible(), false);
    await step();
    assert.equal(await visible(), true);
    assert.equal(await js("statValue('Life').textContent"), '200 / 200');
    assert.ok(await js(`testCard.getBoundingClientRect().bottom < __game.renderer.hudOrbRects.find(r => r.orb === 'life').tooltipY`),
      'the card clears the orb caption and defensive rings');
    for (const name of ['Energy shield', 'Poise', 'Insight', 'Endurance', 'Absorb']) {
      assert.ok(await js(`!statValue('${name}').parentElement.hidden`), name);
    }
    await js("window.lifeNode = statValue('Life'); __game.world().applyEnvDamage(hero, { amount: 32, canKill: false })");
    await step();
    assert.equal(await js("statValue('Life').textContent"), '168 / 200');
    await js('hero.healBy(5)'); await step();
    assert.equal(await js("statValue('Life').textContent"), '173 / 200');
    assert.ok(await js("lifeNode === statValue('Life')"), 'damage and recovery update the existing row on the next frame');
    await move(mana); await step(25);
    await move({ x: mana.x, y: mana.y - 100 }); await step();
    await move(mana); await step(50);
    assert.equal(await visible(), false, 'leaving and returning to the same orb resets the timer');
    await step();
    assert.equal(await js("statValue('Mana').textContent"), '100 / 100');
    await js("hero.reservedMana = 25; hero.mana = 75"); await step();
    assert.equal(await js("statValue('Usable maximum').textContent"), '75');
    await send({ type: 'mouseDown', button: 'left', ...mana, clickCount: 1 }, 'mousedown');
    await step(35);
    assert.equal(await visible(), true, 'an orb remains readable while a skill is held');
    assert.ok(await js("hero.mana < 75 && statValue('Mana').textContent === Math.ceil(hero.mana) + ' / 100'"),
      'live mana follows a real cast');
    await send({ type: 'mouseUp', button: 'left', ...mana, clickCount: 1 }, 'mouseup');
    // Freeze combat so timed absorption and recharge cannot drift during pointer checks.
    await js(`__game.world().update = () => {}; __game.settings().poolBars = 'always';
      hero.es = 20; hero.absorb = 14; hero.absorbTimer = 120; hero.poise = 35; hero.poiseBroken = false`);
    await step();
    const guardPoint = id => js(`(() => {
      const renderer = __game.renderer;
      const rect = renderer.hudOrbRects.find(r => r.seatId === __game.world().localSeat.id && r.orb === 'life');
      const sector = rect.sectors.find(s => s.id === '${id}');
      const angle = (sector.from + sector.to) / 2, radius = rect.w / 2 + 7 * renderer.uiToCss;
      return { x: Math.round(rect.x + rect.w / 2 + radius * Math.cos(angle)),
        y: Math.round(rect.y + rect.h / 2 + radius * Math.sin(angle)) };
    })()`);
    const rows = () => js("[...testCard.querySelectorAll('dt')].map(row => row.textContent)");
    for (const [id, name] of [['es','Energy shield'], ['absorb','Absorb'], ['insight','Insight'], ['endurance','Endurance'], ['poise','Poise']]) {
      await move(await guardPoint(id)); await step(51);
      assert.equal(await visible(), true, id);
      assert.deepEqual(await rows(), [name], id + ' has its own card');
    }
    assert.equal(await js("statValue('Poise').textContent"), '35 / 50');
    await js('hero.poise = 0; hero.poiseBroken = true'); await step();
    assert.equal(await js("statValue('Poise').textContent"), 'Broken · 0 / 50');
    if (process.argv.includes('--capture-guard')) {
      const crop = await js(`(() => {
        const b = testCard.getBoundingClientRect(), r = __game.renderer.hudOrbRects.find(r => r.orb === 'life');
        const x = Math.max(0, Math.floor(Math.min(b.left, r.x - 18) - 15));
        const y = Math.max(0, Math.floor(b.top - 15));
        return { x, y, width: Math.min(innerWidth - x, Math.ceil(Math.max(b.right, r.x + r.w + 18) + 15 - x)),
          height: Math.min(innerHeight - y, Math.ceil(r.y + r.h + 20 - y)) };
      })()`);
      await new Promise(resolve => setTimeout(resolve, 90));
      const capture = await page.capturePage(crop);
      require('node:fs').writeFileSync(path.join(__dirname, 'reports', 'vital-guard-hover.png'), capture.toPNG());
    }
    await js('hero.poiseBroken = false; hero.poise = 62'); await step();
    assert.equal(await js("statValue('Poise').textContent"), 'Overcharged · 62 / 50');
    await js(`hero.sheet.setSource('hover-test', Object.entries({ life: 200, mana: 100, poise: 0, insight: 0,
      endurance: 0, energyShield: 30 }).map(([stat,value]) => ({ stat, kind: 'override', value })));
      hero.absorb = 0; hero.poise = 0`);
    await step(2);
    assert.equal(await visible(), false, 'a removed sector releases the stationary pointer');
    await step(51);
    assert.deepEqual(await rows(), ['Energy shield'], 'the expanded track receives the stationary pointer');
    assert.equal(await js("statValue('Energy shield').textContent"), '20 / 30');
    await move({ x: life.x, y: life.y + 53 }); await step(51);
    assert.equal(await visible(), false, 'the open bottom has no hover card');
    await move(life); await step(51);
    assert.equal(await js("statValue('Life').textContent"), '173 / 200');
    assert.equal(await js('__game.crash().fatal'), null);
    console.log('PASS one-second dwell, in-slot movement, re-entry, skill casting, live life/defenses, recovery, mana spending, individual guard hovers and stationary reflow');
  } finally {
    clearTimeout(timeout);
    win?.destroy();
    server?.server.close();
  }
}).then(() => app.exit(0), error => { console.error(error); app.exit(1); });
