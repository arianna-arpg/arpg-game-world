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
    await move(first); await step(10);
    assert.equal(await visible(), false, 'passing over a slot stays quiet');
    await move(second); await step(12);
    assert.equal(await visible(), false, 'moving to the next skill starts its own dwell');
    await step(10);
    assert.equal(await visible(), true);
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
    await move(first); await step(22);
    assert.match(await js('testCard.innerText'), /Firebolt.*Lv 3/i);
    await js("__game.devGrantSkill('frostbolt', 6, 3)"); await step();
    assert.equal(await visible(), false, 'a replaced skill cannot keep its old card');
    await step(21);
    assert.match(await js('testCard.innerText'), /Frostbolt.*Lv 6/i);
    await js('__game.ui.toggleInventory()'); await step();
    assert.equal(await visible(), false, 'opening a panel dismisses the card');
    await js('__game.ui.toggleInventory()'); await step();
    await move(await center(5)); await step(22);
    assert.equal(await visible(), false, 'empty slots stay quiet');
    assert.equal(await js('__game.crash().fatal'), null);
    console.log('PASS hotbar dwell, live skill and effects, geometry, click and hold, rebinding and dismissal');
  } finally {
    clearTimeout(timeout);
    win?.destroy();
    server?.server.close();
  }
}).then(() => app.exit(0), error => { console.error(error); app.exit(1); });
