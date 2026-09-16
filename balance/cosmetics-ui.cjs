// Real renderer + Wardrobe checks using disposable saves and a hidden Electron window.
const { app, BrowserWindow } = require('electron');
const path = require('node:path'), fs = require('node:fs'), assert = require('node:assert/strict');
const { startGameServer } = require('../launcher/server.cjs');
app.disableHardwareAcceleration(); // stable captures in the hidden offscreen QA window
const dir = path.join(__dirname, 'reports');
app.setPath('userData', path.join(dir, `cosmetics-profile-${process.pid}`));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const server = await startGameServer({ root: path.resolve(__dirname, '../dist'), savesDir: path.join(dir, `cosmetics-saves-${process.pid}`) });
  const win = new BrowserWindow({ show: false, width: 1280, height: 960, webPreferences: { offscreen: true, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const js = source => win.webContents.executeJavaScript(source);
  const click = selector => js(`document.querySelector(${JSON.stringify(selector)}).click(); void 0`);
  const shot = async name => fs.writeFileSync(path.join(dir, name), (await win.webContents.capturePage()).toPNG());
  try {
    await win.loadURL(server.url); await wait(1200);
    await js('__game.account().ledger.account_deaths=1; __game.ui.showAccountScreen(); void 0');
    await click('#acct-wardrobe'); await wait(200);
    assert(await js("!!document.querySelector('.wardrobe canvas')"), 'Vault opens Wardrobe');
    assert.equal(await js("document.querySelectorAll('[data-wd-slot]').length"), 12);
    await click('[data-wd-id="moon_glass"]');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), undefined, 'preview does not equip');
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), 'moon_glass');
    for (const [slot, id] of [['playerEffect', 'waking_stars'], ['footprints', 'petal_steps'], ['avatar', 'star_sigil'], ['skillSkin', 'starlit_skills'], ['skillRecolor', 'rose_tint'], ['summonSkin', 'verdant_kin']]) {
      await click(`[data-wd-slot="${slot}"]`); await click(`[data-wd-id="${id}"]`); await click('[data-wd-equip]');
    }
    await click('[data-wd-slot="playerSkin"]'); await wait(150); await shot('cosmetics-wardrobe.png');
    const overflow = await js(`(() => { const w=document.querySelector('.wardrobe'); return {width:w.scrollWidth,client:w.clientWidth}; })()`);
    assert(overflow.width <= overflow.client + 1, 'Wardrobe has no horizontal overflow');
    await click('[data-wd-slot="footprints"]'); await click('[data-wd-id="star_steps"]');
    assert(await js("document.querySelector('[data-wd-buy]').disabled"), 'insufficient funds disables purchase');
    // Buying in the Reckoning keeps its original seal/back closure intact.
    await click('[data-wd-back]');
    await js('__game.account().credits=35; __game.ui.showAccountScreen(); void 0');
    await click('#acct-wardrobe'); await click('[data-wd-slot="footprints"]'); await click('[data-wd-id="star_steps"]');
    await click('[data-wd-buy]'); assert.equal(await js('__game.account().credits'), 0);
    await click('[data-wd-equip]'); await click('[data-wd-back]');
    assert(await js("document.querySelector('#acct-close').textContent.includes('Seal')"), 'Reckoning remains a seal visit after Wardrobe');
    await wait(200); await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.slots.footprints'), 'star_steps', 'equipped purchase survives disk reload');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerSkin'), 'moon_glass');
    await js("__game.account().ledger.prologue_lived=1; __game.ui.hideAll(); __game.devStartRun('warrior'); __game.ui.showWardrobe(); void 0"); await wait(150);
    assert(await js("__game.ui.escapeMenuOpen && !!document.querySelector('#escape-menu .wardrobe')"), 'pause surface opens Wardrobe');
    await click('[data-wd-slot="skillRecolor"]');
    const scoped = await js(`(() => { const s=document.querySelector('[data-wd-skill]'); if(s.options.length<2)return false; s.selectedIndex=1; s.dispatchEvent(new Event('change')); return true; })()`);
    assert(scoped, 'current skills are available for individual overrides');
    await click('[data-wd-id="moon_tint"]'); await click('[data-wd-equip]');
    assert(await js("Object.keys(__game.account().cosmetics.loadout.skills).length > 0"), 'individual skill choice saved');
    await click('[data-wd-inherit]'); assert.equal(await js('Object.keys(__game.account().cosmetics.loadout.skills).length'), 0);
    const scopedSkill = await js("document.querySelector('[data-wd-skill]').value");
    await click('[data-wd-id="prismatic_ink"]');
    await js("document.querySelector('[data-wd-color]').value='#39d6a2'; document.querySelector('[data-wd-color]').dispatchEvent(new Event('input')); void 0");
    assert.equal(await js('__game.account().cosmetics.applications?.length || 0'), 0, 'picker preview spends nothing');
    await click('[data-wd-bind]');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1);
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#39d6a2');
    await js("document.querySelector('[data-wd-hex]').value='#zzzzzz'; document.querySelector('[data-wd-hex]').dispatchEvent(new Event('input')); void 0");
    assert(await js("document.querySelector('[data-wd-equip]').disabled"), 'invalid hex cannot save');
    await js("document.querySelector('[data-wd-hex]').value='#F486CA'; document.querySelector('[data-wd-hex]').dispatchEvent(new Event('input')); void 0");
    await click('[data-wd-equip]');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1, 'color changes spend no additional ink');
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#f486ca');
    await wait(150); await shot('cosmetics-color-picker.png');
    await click('[data-wd-slot="playerSkin"]'); await click('[data-wd-id=""]'); await click('[data-wd-equip]');
    await click('[data-wd-slot="playerModel"]'); await click('[data-wd-id="model_necromancer"]'); await click('[data-wd-equip]');
    assert.equal(await js('__game.world().player.look'), 'class_warrior', 'cosmetic does not replace class body data');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerModel'), 'model_necromancer');
    await js("document.querySelector('[data-wd-search]').value='Wanderers of the Wake'; document.querySelector('[data-wd-search]').dispatchEvent(new Event('input')); void 0");
    assert.equal(await js("document.querySelectorAll('[data-wd-model]').length"), 8, 'eight exclusive model portraits');
    await click('[data-wd-id="model_veilweaver"]'); await click('[data-wd-equip]');
    await wait(200); await shot('cosmetics-models.png');
    // Export the original preview canvases as a contact sheet, with no image processing.
    const modelPortraits = await js("[...document.querySelectorAll('[data-wd-model]')].map(c=>({id:c.dataset.wdModel,png:c.toDataURL('image/png').split(',')[1]}))");
    for (const portrait of modelPortraits) fs.writeFileSync(path.join(dir, `cosmetics-${portrait.id}.png`), Buffer.from(portrait.png, 'base64'));
    for (const [slot, id] of [['portalSkin', 'portal_astral'], ['portalSkin', 'portal_runic'], ['portalSkin', 'portal_petals'], ['portalRecolor', 'portal_jade'],
      ['hotbarSkin', 'hotbar_moon'], ['hotbarSkin', 'hotbar_ember'], ['hotbarSkin', 'hotbar_rose'],
      ['wispSkin', 'wisp_guiding_lantern'], ['wispSkin', 'wisp_wandering_prism'], ['wispSkin', 'wisp_lunar_moth']]) {
      await click(`[data-wd-slot="${slot}"]`); await click(`[data-wd-id="${id}"]`); await click('[data-wd-equip]');
      assert.equal(await js(`__game.account().cosmetics.loadout.slots[${JSON.stringify(slot)}]`), id);
      await wait(160); await shot(`cosmetics-${id}.png`);
    }
    await js("__game.account().unlockedSkills.add('flame_arrow'); __game.account().unlockedSkills.add('fireball'); __game.ui.showWardrobe(); void 0");
    await click('[data-wd-slot="skillSkin"]');
    await js("document.querySelector('[data-wd-skill]').value='flame_arrow'; document.querySelector('[data-wd-skill]').dispatchEvent(new Event('change')); void 0");
    assert.equal(await js("!!document.querySelector('[data-wd-id=fireball_comet]')"), false, 'Fireball skin absent from Flame Arrow choices');
    await click('[data-wd-id="flame_fletching"]'); await click('[data-wd-equip]'); await wait(150); await shot('cosmetics-flame-arrow.png');
    await js("document.querySelector('[data-wd-skill]').value='fireball'; document.querySelector('[data-wd-skill]').dispatchEvent(new Event('change')); void 0");
    assert.equal(await js("!!document.querySelector('[data-wd-id=flame_fletching]')"), false, 'Flame Arrow skin absent from Fireball choices');
    await click('[data-wd-id="fireball_comet"]'); await click('[data-wd-equip]');
    await js('__game.ui.hideEscapeMenu(); __game.step(60); void 0');
    // Exercise the real projectile/HUD painters using the class's actual skill instance.
    await js("__game.devStartRun('pyromancer'); __game.step(2); void 0");
    const hotbarRects = await js('JSON.stringify(__game.renderer.hudSlotRects)');
    await js("__game.ui.showWardrobe(); void 0"); await click('[data-wd-slot="hotbarSkin"]'); await click('[data-wd-id=""]'); await click('[data-wd-equip]');
    await click('[data-wd-back]'); await js('__game.step(2); void 0');
    assert.equal(await js('JSON.stringify(__game.renderer.hudSlotRects)'), hotbarRects, 'hotbar skin preserves clickable bounds');
    await js('__game.ui.showWardrobe(); void 0'); await click('[data-wd-slot="hotbarSkin"]'); await click('[data-wd-id="hotbar_rose"]'); await click('[data-wd-equip]'); await click('[data-wd-back]');
    await js(`(() => { const w=__game.world(), p=w.player, inst=p.skills.find(s=>s?.def.id==='flame_arrow');
      w.spawnProjectile(p, inst, {x:p.pos.x+55,y:p.pos.y-20}, 0);
      w.townPortalClientViews=[{pos:{x:p.pos.x-75,y:p.pos.y},tier:0,label:'Travel to Lastlight',owner:w.localSeat.id,frac:0,cosmeticLoadout:__game.account().cosmetics.loadout}];
      __game.step(1); })()`);
    assert.equal(await js('__game.world().projectiles[0].cosmeticProjectile'), 'feathered_arrow');
    assert.equal(await js('__game.world().projectiles[0].shape'), 'circle', 'projectile skin leaves actual shape intact');
    // Read the game's actual Canvas pixels: offscreen compositor captures can lag
    // a just-hidden DOM menu, even after the game has rendered its next frame.
    const worldPng = await js("document.querySelector('#game').toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(dir, 'cosmetics-world.png'), Buffer.from(worldPng, 'base64'));
    await wait(300); await shot('cosmetics-game-hud.png');
    assert.equal(await js('__game.ui.escapeMenuOpen'), false, 'close releases blocking state');
    assert.equal(await js("[...document.querySelectorAll('.wardrobe')].filter(e=>e.offsetParent!==null).length"), 0, 'no Wardrobe remains over the game after close');
    assert.equal(await js('!!__game.crash().fatal'), false, 'real world frames do not trip crash handling');
    await js('__game.ui.showWardrobe(); void 0');
    win.setSize(760, 900); await wait(200); await shot('cosmetics-compact.png');
    assert(await js("document.querySelector('.wardrobe').scrollWidth <= document.querySelector('.wardrobe').clientWidth + 1"), 'compact Wardrobe fits');
    await click('[data-wd-slot="skillRecolor"]'); await click('[data-wd-id="prismatic_ink"]');
    assert(await js("document.querySelector('[data-wd-bind]').disabled"), 'ink requires an individual skill');
    await wait(200); await win.reload(); await wait(1200);
    assert.equal(await js('__game.account().cosmetics.loadout.slots.playerModel'), 'model_veilweaver', 'model survives disk reload');
    assert.equal(await js('__game.account().cosmetics.applications.length'), 1, 'spent unit survives disk reload');
    assert.equal(await js(`__game.account().cosmetics.loadout.customColors[${JSON.stringify(scopedSkill)}]`), '#f486ca', 'custom color survives disk reload');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.portalSkin'), 'portal_petals');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.wispSkin'), 'wisp_lunar_moth');
    assert.equal(await js('__game.account().cosmetics.loadout.slots.hotbarSkin'), 'hotbar_rose');
    // Enter the real between-lives flow, then use the collapsible menu's actual button.
    win.setSize(1280, 960);
    await js('__game.ui.hideAll(); __game.ui.onBeginRun(); __game.step(30); void 0');
    assert.equal(await js('__game.world().player.cosmeticKind'), 'wisp');
    assert.equal(await js('__game.world().player.look'), 'spirit');
    assert(await js("!document.querySelector('#menu-bar').classList.contains('hidden')"), 'menu stays visible in Mu');
    await js('__game.ui.toggleMenu(); void 0');
    assert(await js("!document.querySelector('[data-menu-entry=wardrobe]').classList.contains('sealed')"), 'Wardrobe is accessible despite Mu character seals');
    await click('[data-menu-entry="wardrobe"]'); assert(await js('__game.ui.escapeMenuOpen'), 'menu opens Wardrobe in Mu');
    await click('[data-wd-slot="playerSkin"]'); await click('[data-wd-id="moon_glass"]'); await click('[data-wd-equip]');
    await click('[data-wd-slot="wispSkin"]'); await wait(200); await shot('cosmetics-mu-wardrobe.png');
    await click('[data-wd-back]');
    // Let the actual scene fade finish on its real frame clock before inspecting Mu.
    // Large synthetic step batches can run ahead of Electron's next rAF timestamp.
    await wait(2600);
    assert(await js('__game.world().screenFade < 0.1 && !__game.world().timeflow.heldBy("menu")'), 'closing Wardrobe resumes Mu and its reveal');
    const muPng = await js("document.querySelector('#game').toDataURL('image/png').split(',')[1]");
    fs.writeFileSync(path.join(dir, 'cosmetics-mu-world.png'), Buffer.from(muPng, 'base64'));
    await js('__game.ui.showEscapeMenu(); void 0');
    assert.equal(await js("!!document.querySelector('#esc-wardrobe')"), false, 'pause main menu is uncluttered');
    await js(`(() => { __game.ui.hideEscapeMenu(); const w=__game.world(), locked=w.harvestPauseLocked, hold=w.timeflow.holdSurface; let holds=0;
      try { w.harvestPauseLocked=()=>true; w.timeflow.holdSurface=()=>{holds++}; __game.ui.showWardrobe();
        if(holds || !__game.ui.escapeMenuOpen)throw Error('Wardrobe must open without freezing a timed rite'); }
      finally {w.harvestPauseLocked=locked;w.timeflow.holdSurface=hold;__game.ui.hideEscapeMenu();} })()`);
    assert.equal(await js('!!__game.crash().fatal'), false);
    assert.deepEqual(errors, [], 'no renderer exceptions');
    console.log('COSMETICS UI OK: 12 categories, 8 models, 3 wisp silhouettes, portal animations/colors, exclusive projectile skins, hotbar bounds, Mu menu access, persistence and compact layout');
  } catch (error) { console.error(error, errors); await shot('cosmetics-failure.png'); process.exitCode = 1; }
  finally { win.destroy(); server.server.close(); app.exit(process.exitCode || 0); }
}).catch(error => { console.error(error); app.exit(1); });
