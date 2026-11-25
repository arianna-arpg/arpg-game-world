// Real flight and flash painters. Optional arguments: built game folder, preview PNG.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { makeTempDir } = require('../scripts/temp-dir.cjs');
const { startGameServer } = require('../launcher/server.cjs');
const { PROJECTILE_ENDINGS } = require('tsx/cjs/api').require('../src/data/projectileEndings.ts', __filename);
const { SKILLS } = require('tsx/cjs/api').require('../src/data/skills.ts', __filename);
const scratch = makeTempDir('hollow-flight-end-');
app.setPath('userData', path.join(scratch, 'profile'));
app.disableHardwareAcceleration();

async function renderSamples(lodge, explosiveIds) {
  await __game.hydrated();
  __game.hold(true); __game.account().ledger.prologue_lived = 1;
  __game.devStartRun('magician'); __game.ui.hideAll(); __game.step(2);
  const w = __game.world(), hero = w.player, renderer = __game.renderer;
  w.actors = [hero]; w.walk = null; w.doodads = []; w.markDoodadsChanged();
  const ids = ['snipe', 'firebolt', 'ice_spear', 'spark_bolt', 'venom_bolt', 'unmaking_bolt', 'goad'];
  const tile = document.createElement('canvas'); tile.width = 184; tile.height = 84;
  const ctx = tile.getContext('2d', { willReadFrequently: true });
  const sheet = document.createElement('canvas'); sheet.width = 1250; sheet.height = 308;
  const page = sheet.getContext('2d');
  page.fillStyle = '#171c20'; page.fillRect(0, 0, sheet.width, sheet.height);
  page.fillStyle = '#d8c7a5'; page.font = '16px Georgia';
  for (const [col, title] of ['In flight', 'Range spent', 'Settling', 'Last trace', 'Wall contact', 'Target impact'].entries()) {
    page.fillText(title, 148 + col * tile.width, 28);
  }
  const rows = [];
  const holdStart = lodge.dropFraction + lodge.quiverFraction, holdEnd = 1 - lodge.fadeFraction;
  const hold = (holdStart + holdEnd) / 2;
  function frame(pos, draw, zoom = 2.1) {
    ctx.clearRect(0, 0, tile.width, tile.height);
    ctx.save(); ctx.translate(tile.width / 2, tile.height / 2);
    ctx.scale(zoom, zoom); ctx.translate(-pos.x, -pos.y);
    const original = renderer.ctx;
    try { renderer.ctx = ctx; draw(); }
    finally { renderer.ctx = original; ctx.restore(); }
    const rgba = ctx.getImageData(0, 0, tile.width, tile.height).data;
    let ink = 0;
    for (let n = 3; n < rgba.length; n += 4) ink += rgba[n];
    return ink;
  }
  function copy(row, col) {
    if (row >= 3) return;
    const x = 134 + col * tile.width, y = 43 + row * 86;
    page.fillStyle = row % 2 ? '#252a2c' : '#22292b'; page.fillRect(x, y, tile.width - 2, tile.height);
    page.drawImage(tile, x, y);
  }
  for (const [row, id] of ids.entries()) {
    __game.devGrantSkill(id, 1, 2);
    w.actors = [hero]; w.projectiles = []; w.flashes = [];
    w.spawnProjectile(hero, hero.skills[2], { ...hero.pos }, -.15);
    const p = w.projectiles[0]; p.age = .2;
    if (row < 3) {
      page.font = '17px Georgia'; page.fillStyle = '#e9e0ce'; page.fillText(p.inst.def.name, 17, 89 + row * 86);
    }
    const live = frame(p.pos, () => renderer.drawProjectiles(w)); copy(row, 0);
    p.range = p.traveled; w.updateProjectiles(.016);
    const f = w.flashes.find(f => f.projectileEnd);
    if (!f) throw Error(id + ' missing real ending');
    const samples = f.projectileEnd.kind === 'lodge'
      ? [1 - lodge.dropFraction / 2, 1 - hold, lodge.fadeFraction / 2, 0] : [.93, .55, .16, 0];
    const stamps = samples.map((t, col) => {
      const ink = frame(f.pos, () => renderer.drawFlash({ ...f, life: f.maxLife * t }));
      if (col < 3) copy(row, col + 1);
      return ink;
    });
    const paint = surface => {
      frame(f.pos, () => renderer.drawFlash({ ...f, life: f.maxLife * .55, projectileEnd: { ...f.projectileEnd, surface } }));
      return tile.toDataURL();
    };
    const spent = paint('spent');
    const stable = spent === paint('spent'), wall = paint('wall');
    copy(row, 4);
    if (row < 3) {
      const enemy = w.createMonster('zombie', 1, 'enemy');
      enemy.pos = { x: hero.pos.x + 40, y: hero.pos.y }; enemy.tier = hero.tier;
      w.actors = [hero, enemy]; w.projectiles = []; w.flashes = [];
      w.spawnProjectile(hero, hero.skills[2], { ...hero.pos }, 0);
      const shot = w.projectiles[0]; shot.speed = 1000; shot.pierce = 0;
      w.updateProjectiles(.04);
      const impact = w.flashes.find(fx => fx.fx === ['flecks', 'flare', 'rime'][row]);
      if (!shot.hits.has(enemy.id) || !impact || w.flashes.some(fx => fx.projectileEnd)) throw Error(id + ' lost target feedback');
      if (!frame(impact.pos, () => renderer.drawFlash({ ...impact, life: impact.maxLife * .72 }))) throw Error(id + ' invisible impact');
      if (tile.toDataURL() === spent) throw Error(id + ' impact resembles expiry');
      copy(row, 5);
    }
    rows.push({ id, kind: f.projectileEnd.kind, live, stamps, stable, distinctWall: spent !== wall });
  }
  // Measure the opaque shaft in the real painter. The translucent floor shadow
  // should never count as a falling arrow or move an embedded point.
  function shaftPixels(f, elapsed) {
    frame(f.pos, () => renderer.drawFlash({ ...f, life: f.maxLife * (1 - elapsed) }));
    const rgba = ctx.getImageData(0, 0, tile.width, tile.height).data;
    let n = 0, ySum = 0, left = tile.width, right = -1;
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 210) continue;
      const pixel = (i - 3) / 4, x = pixel % tile.width;
      left = Math.min(left, x); right = Math.max(right, x);
      ySum += Math.floor(pixel / tile.width); n++;
    }
    if (!n) throw Error('Missing opaque shaft');
    return { y: ySum / n, left, right, image: tile.toDataURL() };
  }
  __game.devGrantSkill('snipe', 1, 2); w.actors = [hero];
  for (const skin of [undefined, 'feathered_arrow']) for (const sign of [-1, 1]) {
    function shoot(wall) {
      w.flashes = []; w.projectiles = [];
      w.doodads = wall ? [{ kind: 'rock', pos: { x: hero.pos.x + sign * 64, y: hero.pos.y },
        radius: 18, tier: hero.tier, hitbox: { kind: 'rect', hw: 10, hh: 18 } }] : [];
      w.markDoodadsChanged(); w.spawnProjectile(hero, hero.skills[2], { ...hero.pos }, sign === 1 ? 0 : Math.PI);
      const p = w.projectiles[0]; p.cosmeticProjectile = skin; p.speed = 1000;
      if (!wall) p.range = 1;
      w.updateProjectiles(.056);
      const f = w.flashes.find(f => f.projectileEnd);
      if (f?.projectileEnd.surface !== (wall ? 'wall' : 'spent')) throw Error('Incorrect shaft outcome');
      if (wall && Math.abs(f.pos.x - hero.pos.x - sign * 54) > .01) throw Error('Shaft missed wall face');
      return f;
    }
    const ground = shoot(false);
    const launch = shaftPixels(ground, 0), stuck = shaftPixels(ground, hold);
    if (stuck.y - launch.y < ground.radius * 2.1 * .6) throw Error('Spent shaft did not visibly drop');
    if (stuck.image !== shaftPixels(ground, (hold + holdEnd) / 2).image) throw Error('Shaft drifts after sticking in the ground');
    const wall = shoot(true);
    for (const t of [0, lodge.quiverFraction / 3, hold]) {
      const shaft = shaftPixels(wall, t);
      const tip = sign === 1 ? shaft.right + 1 : shaft.left;
      if (Math.abs(tip - tile.width / 2) > 2) throw Error('Visible shaft slipped at wall contact');
    }
  }
  // Isolate each emitted area effect from its smaller remnant. Check that the
  // real painter places ink near the damage perimeter, then fades out.
  w.doodads = []; w.markDoodadsChanged(); w.actors = [hero];
  for (const id of explosiveIds) {
    __game.devGrantSkill(id, 1, 2); w.flashes = []; w.projectiles = [];
    w.spawnProjectile(hero, hero.skills[2], { ...hero.pos }, 0);
    w.projectiles[0].range = 0; w.updateProjectiles(.016);
    const impactFx = hero.skills[2].def.delivery.explode.impactFx;
    const blast = w.flashes.find(f => impactFx ? f.fx === impactFx : f.fx?.startsWith('mechanic:burst_'));
    if (!blast) throw Error(id + ' missing area feedback');
    const zoom = 36 / blast.radius;
    frame(blast.pos, () => renderer.drawFlash({ ...blast, life: blast.maxLife * .7 }), zoom);
    const rgba = ctx.getImageData(0, 0, tile.width, tile.height).data;
    let reach = 0;
    for (let n = 3; n < rgba.length; n += 4) {
      if (rgba[n] < 4) continue;
      const px = (n - 3) / 4;
      reach = Math.max(reach, Math.hypot(px % tile.width - tile.width / 2, Math.floor(px / tile.width) - tile.height / 2));
    }
    if (reach < 32 || reach > 39) throw Error(id + ' blast does not mark its damage radius: ' + reach);
    if (frame(blast.pos, () => renderer.drawFlash({ ...blast, life: 0 }), zoom)) throw Error(id + ' blast did not fade');
  }
  return { rows, preview: sheet.toDataURL() };
}

app.whenReady().then(async () => {
  let win, server;
  const timer = setTimeout(() => app.exit(1), 90000);
  try {
    server = await startGameServer({ root: path.resolve(process.argv[2] || 'dist'), savesDir: path.join(scratch, 'saves') });
    win = new BrowserWindow({ show: false, width: 1100, height: 760, webPreferences: { backgroundThrottling: false } });
    await win.loadURL(server.url);
    const explosiveIds = Object.values(SKILLS).filter(s => s.delivery.type === 'projectile' && s.delivery.explode).map(s => s.id);
    const { rows, preview } = await win.webContents.executeJavaScript('(' + renderSamples.toString() + ')(...' +
      JSON.stringify([PROJECTILE_ENDINGS.lodge, explosiveIds]) + ')');
    for (const { id, kind, live, stamps: [start, mid, late, gone], stable, distinctWall } of rows) {
      assert.ok(live && start && mid && late, id + ' visible throughout');
      assert.ok(late < mid && gone === 0, id + ' fades completely');
      assert.ok(stable && distinctWall, id + ' deterministic and surface-aware');
      console.log('PASS', id, kind, 'flight, contact, settle, fade and wall response');
    }
    assert.equal(new Set(rows.map(r => r.kind)).size, 7);
    console.log('PASS native and wardrobe shafts visibly drop, hold still and stay pinned at either wall face');
    console.log('PASS', explosiveIds.length, 'native splash painters reach their damage radius and fade');
    if (process.argv[3]) fs.writeFileSync(process.argv[3], Buffer.from(preview.split(',')[1], 'base64'));
  } finally {
    clearTimeout(timer); win?.destroy(); server?.server.close();
  }
}).then(() => app.exit(0), e => { console.error(e); app.exit(1); });
