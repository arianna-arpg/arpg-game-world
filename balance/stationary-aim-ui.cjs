// Run against a built client. An optional argument selects an isolated build.
const assert = require('node:assert/strict');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');

const scratch = makeTempDir('hollow-stationary-aim-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();

async function sampleAim() {
  await __game.hydrated();
  __game.hold(true);
  __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('magician');
  __game.ui.hideAll();
  window.__fakePads = [];
  const settings = __game.settings(), renderer = __game.renderer;
  settings.renderScale = 1;
  const world = __game.world(), player = world.player;
  world.actors = [player];
  __game.step(60);
  const canvas = document.querySelector('#game');
  const mouse = { clientX: Math.round(innerWidth * .42), clientY: Math.round(innerHeight * .33), button: 0, bubbles: true };
  const move = () => canvas.dispatchEvent(new MouseEvent('mousemove', mouse));
  const press = () => canvas.dispatchEvent(new MouseEvent('mousedown', mouse));
  const release = () => window.dispatchEvent(new MouseEvent('mouseup', mouse));
  const checks = {};
  function atMouse() {
    const p = renderer.toScreen(player.aimPos);
    return Math.hypot(p.x / renderer.pixelScale - mouse.clientX, p.y / renderer.pixelScale - mouse.clientY) < 1;
  }
  move();
  press();
  const seen = new Set(), rows = [];
  function sample(setting, frames = 65, frameMs = 16.7) {
    settings.renderScale = setting;
    let aimError = 0, flightError = 0, shots = 0;
    for (let frame = 0; frame < frames; frame++) {
      player.fillResources();
      __game.step(1, frameMs);
      const scale = renderer.pixelScale;
      const aim = renderer.toScreen(player.aimPos);
      aimError = Math.max(aimError, Math.hypot(aim.x / scale - mouse.clientX, aim.y / scale - mouse.clientY));
      for (const bolt of world.projectiles) {
        if (seen.has(bolt) || bolt.caster !== player || bolt.inst.def.id !== 'firebolt') continue;
        seen.add(bolt);
        const target = renderer.toWorld({ x: mouse.clientX * scale, y: mouse.clientY * scale });
        const angle = Math.atan2(target.y - player.pos.y, target.x - player.pos.x);
        const delta = bolt.dir - angle;
        flightError = Math.max(flightError, Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) * 180 / Math.PI);
        shots++;
      }
    }
    rows.push({ setting, scale: renderer.pixelScale, aimError, flightError, shots });
  }
  sample(1);
  sample(.7);
  mouse.clientX++; move();
  sample(.7);
  sample(1);
  // Slow frames exercise the same automatic transition that occurs during play.
  move(); __game.step(1); // Start this independent case with a fresh full-scale reading.
  sample('auto', 170, 40);
  release();
  settings.renderScale = .7;
  const pad = { axes: [0, 0, 1, 0], buttons: [] };
  window.__fakePads = [pad];
  __game.step(2);
  pad.axes[2] = 0;
  __game.step(1);
  if (!renderer.padAim) throw Error('controller must own the reticle');
  const padAim = { ...player.aimPos };
  mouse.clientX += 12; move(); __game.step(1);
  const handoffStart = { ...player.aimPos };
  settings.renderScale = 1; __game.step(1);
  const handoffError = Math.hypot(player.aimPos.x - padAim.x, player.aimPos.y - padAim.y);
  mouse.clientX += 300; move(); __game.step(1);
  checks.handoff = Math.hypot(handoffStart.x - padAim.x, handoffStart.y - padAim.y) < 1
    && handoffError < 1 && !renderer.padAim && atMouse();

  // Read the intent delivered to the real simulation, including short presses between frames.
  let intent;
  const apply = world.applyInputs.bind(world);
  world.applyInputs = (inputs, dt) => { intent = inputs.get(world.localSeat.id); return apply(inputs, dt); };
  mouse.clientX -= 150;
  press(); __game.step(1);
  checks.pressWithoutMove = atMouse() && intent.held[0];
  release(); __game.step(1);

  const slot = renderer.hudSlotRects.find(r => r.seatId === world.localSeat.id && r.slot > 1);
  if (!slot) throw Error('expected a visible hotbar slot');
  press();
  const fieldX = mouse.clientX, fieldY = mouse.clientY;
  mouse.clientX = Math.round(slot.x + slot.w / 2); mouse.clientY = Math.round(slot.y + slot.h / 2);
  move(); __game.step(1);
  checks.fieldPressStaysInField = intent.held[0] && !intent.held[slot.slot];
  release(); __game.step(1);
  press();
  mouse.clientX = fieldX; mouse.clientY = fieldY; move(); __game.step(1);
  checks.barPressStaysOnSlot = !intent.held[0] && intent.held[slot.slot];
  release(); __game.step(1);

  // An overlaid DOM element can receive the motion and stop it from bubbling.
  const overlay = document.createElement('div');
  document.body.append(overlay);
  overlay.addEventListener('mousemove', e => e.stopPropagation());
  mouse.clientY -= 32;
  overlay.dispatchEvent(new MouseEvent('mousemove', mouse)); overlay.remove(); __game.step(1);
  checks.movementOverOverlay = atMouse();
  move(); press(); __game.step(1);
  pad.axes[2] = settings.pad.deadzone / 2;
  world.shake = 6;
  const enemy = world.createMonster('zombie', 1, 'enemy');
  enemy.pos = { x: player.aimPos.x + 15, y: player.aimPos.y };
  world.actors.push(enemy);
  __game.step(3);
  checks.shakeAndNearbyEnemy = atMouse() && !renderer.padAim && intent.held[0];
  world.actors = [player];
  pad.axes[2] = 0;

  // Exercise the actual menu pointer. Catch releases both on a normal click and
  // when a panel closes during a controller drag over the game canvas.
  const pointer = __game.padPointer();
  let menuMoves = 0, menuPresses = 0, menuReleases = 0;
  canvas.addEventListener('mousemove', () => menuMoves++);
  canvas.addEventListener('mousedown', () => menuPresses++);
  canvas.addEventListener('mouseup', () => menuReleases++);
  for (const cancel of [false, true]) {
    __game.ui.toggleInventory();
    pad.axes[0] = -1; __game.step(8); pad.axes[0] = 0;
    const point = pointer.position();
    if (document.elementFromPoint(point.x, point.y) !== canvas) throw Error('menu ring must reach exposed game canvas');
    pad.axes[3] = 1; pad.buttons[0] = 1; __game.step(1);
    pad.axes[3] = 0;
    if (!cancel) { pad.buttons[0] = 0; __game.step(1); }
    __game.ui.toggleInventory(); pad.buttons[0] = 0; __game.step(2);
    checks[cancel ? 'menuCancelDuringMouseHold' : 'menuClickDuringMouseHold'] = atMouse() && !renderer.padAim && intent.held[0];
  }
  checks.menuEventsDelivered = menuMoves > 0 && menuPresses === 2 && menuReleases === 2;
  release(); __game.step(1);
  __game.ui.toggleInventory(); pad.buttons[0] = 1; __game.step(1);
  checks.menuPressCannotCast = !intent.held[0] && !intent.edge[0];
  pad.buttons[0] = 0; __game.step(1); __game.ui.toggleInventory(); __game.step(1);

  pad.axes[2] = 1; __game.step(2); pad.axes[2] = 0; __game.step(2);
  const beforeScroll = { ...player.aimPos };
  __game.ui.toggleInventory(); pad.axes[3] = 1; __game.step(3);
  pad.axes[3] = 0; __game.step(1); __game.ui.toggleInventory(); __game.step(2);
  checks.padMenuPreservesGameplayDirection = !!renderer.padAim
    && Math.hypot(player.aimPos.x - beforeScroll.x, player.aimPos.y - beforeScroll.y) < 1;
  window.__fakePads = []; __game.step(1);
  checks.unplugRestoresMouse = !renderer.padAim && atMouse();
  window.__fakePads = [pad];
  __game.ui.toggleInventory(); pad.axes[3] = 1; __game.step(3);
  __game.ui.toggleInventory(); __game.step(3);
  checks.heldMenuScroll = atMouse() && !renderer.padAim;
  pad.axes[3] = 0; __game.step(1); pad.axes[2] = 1; __game.step(2);
  checks.freshStickTakesAim = !!renderer.padAim && !atMouse();
  window.__fakePads = []; __game.step(1);

  // Move the hero and the follow camera while the mouse stays parked.
  world.zone.camera = 'hero';
  __game.step(2);
  const beforeWalk = { ...player.aimPos };
  const key = settings.keybinds.moveRight;
  window.dispatchEvent(new KeyboardEvent('keydown', { key })); __game.step(24);
  window.dispatchEvent(new KeyboardEvent('keyup', { key })); __game.step(2);
  checks.followCamera = atMouse() && Math.hypot(player.aimPos.x - beforeWalk.x, player.aimPos.y - beforeWalk.y) > 1;
  return { rows, checks, mouse };
}

app.whenReady().then(async () => {
  let server, win;
  const timeout = setTimeout(() => app.exit(1), 120000);
  try {
    server = await startGameServer({ root: path.resolve(process.argv[2] || 'dist'), savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 1200, height: 800, useContentSize: true, webPreferences: { backgroundThrottling: false } });
    await win.loadURL(server.url);
    const { rows, checks, mouse } = await win.webContents.executeJavaScript('(' + sampleAim.toString() + ')()');
    console.table(rows);
    console.table(checks);
    for (const row of rows) {
      if (typeof row.setting === 'number') assert.equal(row.scale, row.setting);
      assert.ok(row.shots > 0, 'held cast launches Firebolt at every scale');
      assert.ok(row.aimError < 1, 'aim stays within one screen pixel of the mouse');
      assert.ok(row.flightError < 1, 'new Firebolts stay within one degree of the cursor');
    }
    assert.ok(rows.at(-1).scale < 1, 'automatic resolution actually stepped down');
    for (const [name, passed] of Object.entries(checks)) assert.ok(passed, name);
    const oldWidth = await win.webContents.executeJavaScript('innerWidth');
    win.setContentSize(1043, 733);
    const point = await win.webContents.executeJavaScript(`(async () => {
      if (innerWidth === ${oldWidth}) await new Promise(resolve => window.addEventListener('resize', resolve, { once: true }));
      __game.settings().renderScale = .7;
      __game.step(3);
      const p = __game.renderer.toScreen(__game.world().player.aimPos);
      const canvas = document.querySelector('#game'), rect = canvas.getBoundingClientRect();
      return { x: rect.left + p.x * rect.width / canvas.width, y: rect.top + p.y * rect.height / canvas.height };
    })()`);
    assert.ok(Math.hypot(point.x - mouse.clientX, point.y - mouse.clientY) < 1, 'stationary mouse survives a window resize');
  } finally {
    clearTimeout(timeout);
    win?.destroy();
    server?.server.close();
  }
}).then(() => app.exit(0), e => { console.error(e); app.exit(1); });
